import { convertStringToHex, encode } from '@transia/xrpl'
import type { Context } from '../../../src/context/interface'
import { SlotMap } from '../../../src/testContext'
import { ExitType } from './../../../src/context/interface'

const isHex = (value: string) => {
  return /^[0-9a-fA-F]+$/.test(value)
}

export class BUF {
  constructor(
    public value: Buffer,
    public ptr: number,
    public len: number,
  ) {}

  get(memory: Uint8Array) {
    return memory.slice(this.ptr, this.ptr + this.len)
  }

  set(memory: Uint8Array) {
    memory.set(this.value, this.ptr)
  }

  sbuf(): [number, number] {
    return [this.ptr, this.len]
  }

  static from(
    value: string | number[] | Uint8Array | Buffer,
    ptr: number,
    memory?: Uint8Array,
  ): BUF {
    if (value instanceof Buffer) {
      if (memory) memory.set(value, ptr)
      return new BUF(value, ptr, value.length)
    }
    if (value instanceof Uint8Array) {
      const v = Buffer.from(value)
      if (memory) memory.set(v, ptr)
      return new BUF(v, ptr, v.length)
    }
    if (Array.isArray(value)) {
      const v = Buffer.from(value)
      if (memory) memory.set(v, ptr)
      return new BUF(v, ptr, v.length)
    }
    if (isHex(value)) {
      const v = Buffer.from(value, 'hex')
      if (memory) memory.set(v, ptr)
      return new BUF(v, ptr, v.length)
    }
    const v = Buffer.from(value, 'utf-8')
    if (memory) memory.set(v, ptr)
    return new BUF(v, ptr, v.length)
  }

  static empty(ptr: number, len: number): BUF {
    return new BUF(Buffer.alloc(len), ptr, len)
  }
}

export const defaultContext = (memory: Uint8Array): Context => {
  return {
    memory: {
      isRangeValid: (ptr, len) => {
        return ptr + len <= memory.byteLength
      },
      get: (ptr, len) => memory.slice(ptr, ptr + len),
      set: (ptr, value) => {
        memory.set(value, ptr)
      },
    },
    hookResult: {
      exitType: ExitType.UNSET,
      exitCode: 0n,
      hookHash: '',
    },
    burden: null,
    generation: 0n,
    otxnTxn: encode({
      TransactionType: 'Invoke',
      Account: 'rrrrrrrrrrrrrrrrrrrrrhoLvTp',
      Fee: '1000000',
      Memos: [
        {
          Memo: {
            MemoData: convertStringToHex('hello'),
          },
        },
      ],
    }),
    hookAccount: 'rrrrrrrrrrrrrrrrrrrrrhoLvTp',
    hookHash: '',
    ledgerData: {},
    hookGrantedBy: {},
    hookNamespace: '00'.repeat(32),
    hookState: {},
    hookParams: {},
    exitReason: 'success',
    emittedTxn: [],
    slot: new SlotMap(),
    hookSkips: new Set(),
    hookChainPosition: 0,
    executeAgainAsWeak: false,
    isStrong: false,
    expectedEtxnCount: -1,
    hasCallback: false,
    nonceCounter: 0,
    emitFailure: undefined,
  } as Context
}
