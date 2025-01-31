import { decodeAccountID, encodeAccountID } from '@transia/xrpl'
import { type Context, HOOK_RETURN_CODE } from '../../context/interface'

const {
  TOO_SMALL,
  DOESNT_EXIST,
  OUT_OF_BOUNDS,
  TOO_BIG,
  INVALID_ARGUMENT,
  NOT_AUTHORIZED,
} = HOOK_RETURN_CODE

// Interface definitions for state management
interface StateNamespace {
  [key: string]: string
}

interface StateAccount {
  [key: string]: StateNamespace
}

interface HookStateMap {
  [key: string]: StateAccount
}

// Interface definitions for Hook API
export interface StateAPI {
  state: (
    write_ptr: number,
    write_len: number,
    kread_ptr: number,
    kread_len: number,
  ) => bigint
  state_set: (
    write_ptr: number,
    write_len: number,
    kread_ptr: number,
    kread_len: number,
  ) => bigint
  state_foreign: (
    write_ptr: number,
    write_len: number,
    kread_ptr: number,
    kread_len: number,
    nread_ptr: number,
    nread_len: number,
    aread_ptr: number,
    aread_len: number,
  ) => bigint
  state_foreign_set: (
    write_ptr: number,
    write_len: number,
    kread_ptr: number,
    kread_len: number,
    nread_ptr: number,
    nread_len: number,
    aread_ptr: number,
    aread_len: number,
  ) => bigint
}

// Helper function to create a state key from a string
function makeStateKey(source: Uint8Array): string | null {
  if (source.length > 32 || source.length < 1) return null

  const keyBuffer = new Uint8Array(32)
  keyBuffer.fill(0)
  keyBuffer.set(source, 32 - source.length)
  return Buffer.from(keyBuffer).toString('hex')
}

// Implementation of Hook API functions
// Retrieve state data for the current hook
export function state(
  write_ptr: number,
  write_len: number,
  kread_ptr: number,
  kread_len: number,
  ctx: Context,
): bigint {
  return state_foreign(
    write_ptr,
    write_len,
    kread_ptr,
    kread_len,
    0,
    0,
    0,
    0,
    ctx,
  )
}

// Set state data for the current hook
export function state_set(
  write_ptr: number,
  write_len: number,
  kread_ptr: number,
  kread_len: number,
  ctx: Context,
): bigint {
  return state_foreign_set(
    write_ptr,
    write_len,
    kread_ptr,
    kread_len,
    0,
    0,
    0,
    0,
    ctx,
  )
}

// Retrieve state data for a foreign hook
export function state_foreign(
  write_ptr: number,
  write_len: number,
  kread_ptr: number,
  kread_len: number,
  nread_ptr: number,
  nread_len: number,
  aread_ptr: number,
  aread_len: number,
  ctx: Context,
): bigint {
  // Validate input parameters
  let is_foreign = false

  if (aread_ptr === 0) {
    if (aread_len !== 0) return INVALID_ARGUMENT
  } else {
    is_foreign = true
    if (aread_len !== 20) return INVALID_ARGUMENT
  }

  if (kread_len > 32) {
    return TOO_BIG
  }

  if (kread_len < 1) {
    return TOO_SMALL
  }

  if (nread_len !== 0 && nread_len !== 32) {
    return INVALID_ARGUMENT
  }

  if (aread_len !== 0 && aread_len !== 20) {
    return INVALID_ARGUMENT
  }

  if (!ctx.memory.isRangeValid(kread_ptr, kread_len)) {
    return OUT_OF_BOUNDS
  }
  if (!ctx.memory.isRangeValid(nread_ptr, nread_len)) {
    return OUT_OF_BOUNDS
  }
  if (!ctx.memory.isRangeValid(aread_ptr, aread_len)) {
    return OUT_OF_BOUNDS
  }
  if (!ctx.memory.isRangeValid(write_ptr, write_len)) {
    return OUT_OF_BOUNDS
  }

  // Check if namespace is provided correctly
  if (
    nread_ptr === 0 &&
    nread_len === 0 &&
    !(aread_ptr === 0 && aread_len === 0)
  ) {
    return INVALID_ARGUMENT
  }

  // Read key data
  const keyData = ctx.memory.get(kread_ptr, kread_len)
  const stateKey = makeStateKey(keyData)
  if (!stateKey) {
    return INVALID_ARGUMENT
  }

  // Get namespace and account
  const namespace =
    nread_len === 32
      ? Buffer.from(ctx.memory.get(nread_ptr, nread_len)).toString('hex')
      : Buffer.from(ctx.hookNamespace, 'hex').toString('hex')

  const account =
    aread_len === 20
      ? Buffer.from(ctx.memory.get(aread_ptr, aread_len)).toString('hex')
      : decodeAccountID(ctx.hookAccount).toString('hex')

  // Look up state in the context
  const hookState = ctx.hookState as unknown as HookStateMap
  const accountStates = hookState[account] || {}
  const namespaceStates = accountStates[namespace] || {}
  const stateValue = namespaceStates[stateKey]

  if (!stateValue) {
    return DOESNT_EXIST
  }

  // Write state value to memory
  if (write_ptr !== 0) {
    const stateData = Buffer.from(stateValue, 'hex')
    if (write_len < stateData.length) {
      return TOO_SMALL
    }
    ctx.memory.set(write_ptr, stateData)
  }

  return BigInt(Buffer.from(stateValue, 'hex').length)
}

// Set state data for a foreign hook
export function state_foreign_set(
  read_ptr: number,
  read_len: number,
  kread_ptr: number,
  kread_len: number,
  nread_ptr: number,
  nread_len: number,
  aread_ptr: number,
  aread_len: number,
  ctx: Context,
): bigint {
  // Validate input parameters

  if (read_ptr === 0 && read_len === 0) {
  } else if (!ctx.memory.isRangeValid(read_ptr, read_len)) {
    return OUT_OF_BOUNDS
  }
  if (kread_len > 32) {
    return TOO_BIG
  }

  if (kread_len < 1) {
    return TOO_SMALL
  }

  if (nread_len !== 0 && nread_len !== 32) {
    return INVALID_ARGUMENT
  }

  if (aread_len !== 0 && aread_len !== 20) {
    return INVALID_ARGUMENT
  }

  // Check if namespace is provided correctly
  if (
    nread_ptr === 0 &&
    nread_len === 0 &&
    !(aread_ptr === 0 && aread_len === 0)
  ) {
    return INVALID_ARGUMENT
  }

  if (!ctx.memory.isRangeValid(nread_ptr, nread_len)) {
    return OUT_OF_BOUNDS
  }
  if (!ctx.memory.isRangeValid(kread_ptr, kread_len)) {
    return OUT_OF_BOUNDS
  }
  if (!ctx.memory.isRangeValid(aread_ptr, aread_len)) {
    return OUT_OF_BOUNDS
  }

  // Read key data
  if (read_len > 256) {
    return TOO_BIG
  }
  const keyData = ctx.memory.get(kread_ptr, kread_len)
  const stateKey = makeStateKey(keyData)
  if (!stateKey) {
    return INVALID_ARGUMENT
  }

  // Get namespace and account
  const namespace =
    nread_len === 32
      ? Buffer.from(ctx.memory.get(nread_ptr, nread_len)).toString('hex')
      : Buffer.from(ctx.hookNamespace, 'hex').toString('hex')

  const account =
    aread_len === 20
      ? Buffer.from(ctx.memory.get(aread_ptr, aread_len)).toString('hex')
      : decodeAccountID(ctx.hookAccount).toString('hex')

  if (
    aread_len === 0 ||
    encodeAccountID(Buffer.from(account, 'hex')) === ctx.hookAccount
  ) {
  } else {
    const granted = ctx.hookGrantedBy[account].find((h) => h === ctx.hookHash)
    if (!granted) {
      return NOT_AUTHORIZED
    }
  }

  // Read state value if provided
  let stateValue: string | undefined
  if (read_len > 0) {
    const stateData = ctx.memory.get(read_ptr, read_len)
    stateValue = Buffer.from(stateData).toString('hex')
  }

  // Initialize state structure if needed
  const hookState = ctx.hookState as unknown as HookStateMap

  if (!hookState[account]) {
    hookState[account] = {}
  }
  if (!hookState[account][namespace]) {
    hookState[account][namespace] = {}
  }

  if (stateValue === undefined) {
    // Delete operation
    delete hookState[account][namespace][stateKey]
    return BigInt(0)
  } else {
    // Set operation
    hookState[account][namespace][stateKey] = stateValue
    return BigInt(stateValue.length / 2)
  }
}
