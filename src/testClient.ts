import fs from 'node:fs'
import {
  type Transaction,
  decode,
  decodeAccountID,
  encode,
  validate,
} from '@transia/xrpl'
import type { HookParameter } from '@transia/xrpl/dist/npm/models/common'
import sha512Half from '@transia/xrpl/dist/npm/utils/hashes/sha512Half'
import wabt from 'wabt'
import {
  type Context,
  ExitType,
  type HookParams,
  type SlotEntry,
} from './context/interface'
import { createHookAAPIStub } from './context/stub'

const validateHexString = (str: string) => {
  if (/^[0-9a-fA-F]+$/.test(str)) return true
  throw new Error('Invalid hex string')
}

const convertToMemoryExportedWasm = async (wasmBuffer: Buffer) => {
  const wabtModule = await wabt()
  const wasmModule = wabtModule.readWasm(Uint8Array.from(wasmBuffer), {
    readDebugNames: true,
  })
  const wat = wasmModule.toText({ foldExprs: false, inlineExport: false })
  let watModified = wat

  if (!wat.includes('(export "memory" (memory')) {
    // add memory export
    watModified = wat.replace(
      '(memory (;0;) 2)',
      '(memory (;0;) 2)\n  (export "memory" (memory 0))',
    )
  }
  const wasmModified = wabtModule.parseWat('index.wat', watModified)
  const { buffer: resultBuffer } = wasmModified.toBinary({
    canonicalize_lebs: true,
  })
  return Buffer.from(resultBuffer)
}

export class SlotMap {
  slot_obj: Record<number, SlotEntry | undefined>
  constructor() {
    // generate 1~255 slots
    this.slot_obj = {}
    for (let i = 1; i < 256; i++) {
      this.slot_obj[i] = undefined
    }
  }
  get(slot_no: number): SlotEntry | undefined {
    return this.slot_obj[slot_no]
  }
  set(slot_no: number, value: SlotEntry): boolean {
    if (slot_no < 0 || slot_no >= 256) {
      return false
    }
    this.slot_obj[slot_no] = value
    return true
  }
  clear(slot_no: number): boolean {
    if (slot_no < 0 || slot_no >= 256) {
      return false
    }
    this.slot_obj[slot_no] = undefined
    return true
  }
  free(): number | undefined {
    for (let i = 1; i < 256; i++) {
      if (this.slot_obj[i] === undefined) {
        return i
      }
    }
    return undefined
  }
}

export class TestClient {
  private instance: WebAssembly.Instance | null = null
  private module: WebAssembly.Module | null = null
  private imports: WebAssembly.Imports | null = null

  private ctx: Context = {
    memory: {
      isRangeValid: (ptr, len) => {
        const mem = this.instance?.exports.memory as WebAssembly.Memory
        if (!mem) throw new Error('memory not found')
        return ptr + len <= mem.buffer.byteLength
      },
      get: (prt, len) => {
        const mem = this.instance?.exports.memory as WebAssembly.Memory
        if (!mem) throw new Error('memory not found')
        return new Uint8Array(mem.buffer.slice(prt, prt + len))
      },
      set: (prt, value) => {
        // TODO? buf len
        const mem = this.instance?.exports.memory as WebAssembly.Memory
        if (!mem) throw new Error('memory not found')
        const buf = new Uint8Array(mem.buffer)
        for (let i = 0; i < value.length; i++) {
          buf[prt + i] = value[i]
        }
      },
    },
    hookAccount: '',
    hookGrantedBy: {},
    hookHash: '',
    ledgerData: {},
    hookResult: {
      exitType: ExitType.UNSET,
      exitCode: 0n,
      exitReason: '',
    },
    burden: 0n,
    generation: 0n,
    otxnTxn: '',
    hookNamespace: '',
    hookState: {},
    hookParams: {},
    emittedTxn: [],
    slot: new SlotMap(),

    // Hook context related fields
    // hookParamOverrides: {},
    hookSkips: new Set<string>(),
    hookChainPosition: 0,
    executeAgainAsWeak: false,
    isStrong: false,

    // Emit related fields
    expectedEtxnCount: -1,
    hasCallback: false,
    nonceCounter: 0,
  }

  constructor(
    instance: WebAssembly.Instance | null,
    module: WebAssembly.Module | null,
    imports: WebAssembly.Imports | null,
  ) {
    this.instance = instance
    this.module = module
    this.imports = imports
  }

  static async deploy(
    wasmPath: string,
    {
      hookAccount,
      hookNamespace,
      hookParam = [],
    }: {
      hookAccount: string
      hookNamespace: string
      hookParam?: HookParameter[]
    },
  ): Promise<TestClient> {
    const wasmBuffer = await convertToMemoryExportedWasm(
      fs.readFileSync(wasmPath),
    )

    const context = new TestClient(null, null, null)
    const imports: WebAssembly.Imports = {
      env: {
        ...createHookAAPIStub(context.ctx),
      },
    }
    const instanceSource = await WebAssembly.instantiate(wasmBuffer, imports)
    context.instance = instanceSource.instance
    context.module = instanceSource.module
    context.imports = imports
    context.ctx.hookHash = sha512Half(wasmBuffer.toString('hex'))
    context.setHookAccount(hookAccount)
    context.setHookNamespace(hookNamespace)
    context.setHookParam(hookParam)
    return context
  }

  public setTransaction(transaction: Transaction | string) {
    try {
      validate(transaction as unknown as Record<string, unknown>)
    } catch (e: any) {
      throw new Error(`setTransaction: ${e.message}`)
    }
    if (typeof transaction === 'string') {
      this.ctx.otxnTxn = transaction
    } else {
      this.ctx.otxnTxn = encode(transaction)
    }
  }

  public setHookAccount(raddress: string) {
    // validation
    try {
      decodeAccountID(raddress)
    } catch (e) {
      throw new Error('setHookAccount: Invalid account address')
    }
    this.ctx.hookAccount = raddress
  }

  public setHookNamespace(namespace: string) {
    if (namespace.length !== 64) {
      throw new Error('setHookNamespace: Invalid namespace length')
    }
    validateHexString(namespace)
    this.ctx.hookNamespace = namespace.toUpperCase()
  }

  public setHookParam(param: HookParameter[]) {
    const params: HookParams = {}
    for (const p of param) {
      const { HookParameterName, HookParameterValue } = p.HookParameter
      validateHexString(HookParameterName)
      validateHexString(HookParameterValue)
      params[HookParameterName.toUpperCase()] = HookParameterValue.toUpperCase()
    }
    this.ctx.hookParams = params
  }

  public setHookState(
    hexKey: string,
    hexvalue: string,
    hexNamespace?: string,
    raddress?: string,
  ) {
    const accountId = decodeAccountID(
      raddress ? raddress : this.ctx.hookAccount,
    )
      .toString('hex')
      .toUpperCase()
    const namespaceId = (
      hexNamespace ? hexNamespace : this.ctx.hookNamespace
    ).toUpperCase()

    validateHexString(namespaceId)
    validateHexString(hexKey)
    validateHexString(hexvalue)
    if (!this.ctx.hookState[accountId]) this.ctx.hookState[accountId] = {}
    if (!this.ctx.hookState[accountId][namespaceId])
      this.ctx.hookState[accountId][namespaceId] = {}
    this.ctx.hookState[accountId][namespaceId][hexKey] = hexvalue
  }

  public getHookStates() {
    return this.ctx.hookState
  }

  public getHookResult() {
    return this.ctx.hookResult
  }

  public getEmittedTxn<T extends boolean = true>(
    as_json?: T,
  ): T extends false ? string[] : Transaction[] {
    if (as_json === false) return this.ctx.emittedTxn as any
    return this.ctx.emittedTxn.map(
      (txn) => decode(txn) as unknown as Transaction,
    ) as any
  }

  public hook() {
    const hookFn = this.instance?.exports.hook as CallableFunction
    if (!hookFn) {
      throw new Error('Hook function not found')
    }
    hookFn()
    const { exitType, exitCode } = this.ctx.hookResult
    const reason = this.ctx.hookResult.exitReason
    if (exitType === ExitType.ACCEPT) {
      console.log('accept', reason)
    } else if (exitType === ExitType.ROLLBACK) {
      console.log('rollback', reason)
    }
    return exitCode
  }

  public cbak() {
    const cbakFn = this.instance?.exports.cbak as CallableFunction
    if (!cbakFn) {
      throw new Error('Callback function not found')
    }
    cbakFn()
    const { exitType, exitCode } = this.ctx.hookResult
    const reason = this.ctx.hookResult.exitReason
    if (exitType === ExitType.ACCEPT) {
      console.log('accept', reason)
    } else if (exitType === ExitType.ROLLBACK) {
      console.log('rollback', reason)
    }
    return exitCode
  }
}
