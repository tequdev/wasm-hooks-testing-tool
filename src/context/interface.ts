import type { SerializedTypeID } from '../api/test_utils/sti'

export const HOOK_RETURN_CODE = {
  SUCCESS: 0n,
  OUT_OF_BOUNDS: -1n,
  INTERNAL_ERROR: -2n,
  TOO_BIG: -3n,
  TOO_SMALL: -4n,
  DOESNT_EXIST: -5n,
  NO_FREE_SLOTS: -6n,
  INVALID_ARGUMENT: -7n,
  ALREADY_SET: -8n,
  PREREQUISITE_NOT_MET: -9n,
  FEE_TOO_LARGE: -10n,
  EMISSION_FAILURE: -11n,
  TOO_MANY_NONCES: -12n,
  TOO_MANY_EMITTED_TXN: -13n,
  NOT_IMPLEMENTED: -14n,
  INVALID_ACCOUNT: -15n,
  GUARD_VIOLATION: -16n,
  INVALID_FIELD: -17n,
  PARSE_ERROR: -18n,
  RC_ROLLBACK: -19n,
  RC_ACCEPT: -20n,
  NO_SUCH_KEYLET: -21n,
  NOT_AN_ARRAY: -22n,
  NOT_AN_OBJECT: -23n,
  INVALID_FLOAT: -10024n,
  DIVISION_BY_ZERO: -25n,
  MANTISSA_OVERSIZED: -26n,
  MANTISSA_UNDERSIZED: -27n,
  EXPONENT_OVERSIZED: -28n,
  EXPONENT_UNDERSIZED: -29n,
  XFL_OVERFLOW: -30n,
  NOT_IOU_AMOUNT: -31n,
  NOT_AN_AMOUNT: -32n,
  CANT_RETURN_NEGATIVE: -33n,
  NOT_AUTHORIZED: -34n,
  PREVIOUS_FAILURE_PREVENTS_RETRY: -35n,
  TOO_MANY_PARAMS: -36n,
  INVALID_TXN: -37n,
  RESERVE_INSUFFICIENT: -38n,
  COMPLEX_NOT_SUPPORTED: -39n,
  DOES_NOT_MATCH: -40n,
  INVALID_KEY: -41n,
  NOT_A_STRING: -42n,
  MEM_OVERLAP: -43n,
  TOO_MANY_STATE_MODIFICATIONS: -44n,
  TOO_MANY_NAMESPACES: -45n,
} as const

export enum ExitType {
  UNSET = 0,
  WASM_ERROR = 1,
  ROLLBACK = 2,
  ACCEPT = 3,
  JSVM_ERROR = 4,
  LEDGER_ERROR = 5,
}

export type HookResult = {
  exitType: ExitType
  exitCode: bigint
}

export type HookGrantedBy = Record<string, string[]> // accountid -> hookhash[]

export type HookState = Record<string, Record<string, Record<string, string>>>

export type HookParams = Record<string, string>

// export type HookParamOverrides = Record<
//   string,
//   Record<string, Record<string, string>>
// >

export type ExitReason = string

export type EmittedTxn = string

// Transaction related types
export interface HookParameter {
  name: Uint8Array
  value: Uint8Array
}

export interface EmitFailure {
  EmitBurden: number
  EmitGeneration: number
  TransactionHash: string
  TransactionType: string
}

// export interface Transaction {
//   TransactionType: string
//   EmitDetails?: EmitDetails
//   HookParameters?: HookParameter[]
// }

// Slot related types
export interface SlotEntry {
  type: SerializedTypeID
  entry: Uint8Array
}

export interface SlotMap {
  get: (slot_no: number) => SlotEntry | undefined
  set: (slot_no: number, value: SlotEntry) => boolean
  clear: (slot_no: number) => boolean
  free: () => number | undefined
}

export type Context = {
  memory: {
    isRangeValid: (ptr: number, len: number) => boolean
    get: (ptr: number, len: number) => Uint8Array
    set: (ptr: number, value: Uint8Array) => void
  }
  hookResult: HookResult
  burden: bigint | null
  generation: bigint
  otxnTxn: string
  hookAccount: string
  hookGrantedBy: HookGrantedBy
  hookHash: string
  hookNamespace: string
  hookState: HookState
  hookParams: HookParams
  exitReason: ExitReason
  emittedTxn: EmittedTxn[]
  // ledger_data
  ledgerData: Record<string, string> // index(32 byte)-> blob
  // Slot related fields
  slot: SlotMap
  // Hook context related fields
  hookSkips: Set<string>
  hookChainPosition: number
  executeAgainAsWeak: boolean
  isStrong: boolean
  // Transaction related fields
  emitFailure?: EmitFailure
  // Emit related fields
  expectedEtxnCount: number
  hasCallback: boolean
  nonceCounter: number
}
