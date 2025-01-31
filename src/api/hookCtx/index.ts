import { decodeAccountID } from '@transia/xrpl'
import { HOOK_RETURN_CODE } from '../../context/interface'
import type { APITestWrapper } from '../test_utils'

const {
  OUT_OF_BOUNDS,
  INVALID_ARGUMENT,
  TOO_BIG,
  TOO_SMALL,
  INTERNAL_ERROR,
  DOESNT_EXIST,
  ALREADY_SET,
  PREREQUISITE_NOT_MET,
} = HOOK_RETURN_CODE

export interface HookCtxAPI {
  hook_account: (write_ptr: number, write_len: number) => bigint
  hook_hash: (write_ptr: number, write_len: number, hook_no: number) => bigint
  hook_param: (
    write_ptr: number,
    write_len: number,
    read_ptr: number,
    read_len: number,
  ) => bigint
  hook_param_set: (
    read_ptr: number,
    read_len: number,
    kread_ptr: number,
    kread_len: number,
    hread_ptr: number,
    hread_len: number,
  ) => bigint
  hook_skip: (read_ptr: number, read_len: number, flags: number) => bigint
  hook_pos: () => bigint
  hook_again: () => bigint
}

export const hook_account: APITestWrapper<HookCtxAPI['hook_account']> = (
  write_ptr,
  write_len,
  ctx,
) => {
  if (!ctx.memory.isRangeValid(write_ptr, write_len)) {
    return OUT_OF_BOUNDS
  }

  if (write_len < 20) {
    return TOO_SMALL
  }

  // Convert account ID to bytes
  try {
    const accountBytes = decodeAccountID(ctx.hookAccount)
    if (accountBytes.length !== 20) {
      return INTERNAL_ERROR
    }

    ctx.memory.set(write_ptr, accountBytes)
    return 20n
  } catch (e) {
    return INTERNAL_ERROR
  }
}

export const hook_hash: APITestWrapper<HookCtxAPI['hook_hash']> = (
  write_ptr,
  write_len,
  hook_no,
  ctx,
) => {
  if (write_len < 32) {
    return TOO_SMALL
  }

  if (!ctx.memory.isRangeValid(write_ptr, write_len)) {
    return OUT_OF_BOUNDS
  }

  if (hook_no === -1) {
    // Return current hook hash
    try {
      const hookHashBytes = Buffer.from(ctx.hookNamespace, 'hex')
      if (hookHashBytes.length !== 32) {
        return INTERNAL_ERROR
      }
      ctx.memory.set(write_ptr, hookHashBytes)
      return 32n
    } catch (e) {
      return INTERNAL_ERROR
    }
  }

  // TODO: Implement hook lookup by number when needed
  return DOESNT_EXIST
}

export const hook_param: APITestWrapper<HookCtxAPI['hook_param']> = (
  write_ptr,
  write_len,
  read_ptr,
  read_len,
  ctx,
) => {
  if (!ctx.memory.isRangeValid(read_ptr, read_len)) {
    return OUT_OF_BOUNDS
  }
  if (!ctx.memory.isRangeValid(write_ptr, write_len)) {
    return OUT_OF_BOUNDS
  }

  if (read_len < 1) {
    return TOO_SMALL
  }

  if (read_len > 32) {
    return TOO_BIG
  }

  const paramName = ctx.memory.get(read_ptr, read_len)
  const paramNameStr = Buffer.from(paramName).toString('hex').toUpperCase()

  // Check for regular parameters
  const paramValue = ctx.hookParams[paramNameStr]
  if (!paramValue) {
    return DOESNT_EXIST
  }

  try {
    const paramValueBytes = Buffer.from(paramValue, 'hex')
    if (paramValueBytes.length > write_len) {
      return TOO_SMALL
    }

    ctx.memory.set(write_ptr, paramValueBytes)
    return BigInt(paramValueBytes.length)
  } catch (e) {
    return INTERNAL_ERROR
  }
}

export const hook_param_set: APITestWrapper<HookCtxAPI['hook_param_set']> = (
  read_ptr,
  read_len,
  kread_ptr,
  kread_len,
  hread_ptr,
  hread_len,
  ctx,
) => {
  if (!ctx.memory.isRangeValid(read_ptr, read_len)) {
    return OUT_OF_BOUNDS
  }
  if (!ctx.memory.isRangeValid(kread_ptr, kread_len)) {
    return OUT_OF_BOUNDS
  }
  if (!ctx.memory.isRangeValid(hread_ptr, hread_len)) {
    return OUT_OF_BOUNDS
  }

  if (kread_len < 1) {
    return TOO_SMALL
  }

  if (kread_len > 32) {
    return TOO_BIG
  }

  if (hread_len !== 32) {
    return INVALID_ARGUMENT
  }

  if (read_len > 256) {
    return TOO_BIG
  }
  throw new Error('Not implemented')
}

export const hook_skip: APITestWrapper<HookCtxAPI['hook_skip']> = (
  read_ptr,
  read_len,
  flags,
  ctx,
) => {
  if (!ctx.memory.isRangeValid(read_ptr, read_len)) {
    return OUT_OF_BOUNDS
  }

  if (read_len !== 32) {
    return INVALID_ARGUMENT
  }

  if (flags !== 0 && flags !== 1) {
    return INVALID_ARGUMENT
  }

  try {
    const hookHash = ctx.memory.get(read_ptr, read_len)
    const hookHashStr = Buffer.from(hookHash).toString('hex')

    if (flags === 1) {
      // Delete flag
      if (!ctx.hookSkips.has(hookHashStr)) {
        return DOESNT_EXIST
      }
      ctx.hookSkips.delete(hookHashStr)
      return 1n
    }

    throw new Error('Not implemented')

    // Add to skips
    // if (ctx.hookSkips.has(hookHashStr)) {
    //   return 1n
    // }

    // ctx.hookSkips.add(hookHashStr)
    // return 1n
  } catch (e) {
    return INTERNAL_ERROR
  }
}

export const hook_pos: APITestWrapper<HookCtxAPI['hook_pos']> = (ctx) => {
  return BigInt(ctx.hookChainPosition || 0)
}

export const hook_again: APITestWrapper<HookCtxAPI['hook_again']> = (ctx) => {
  if (ctx.executeAgainAsWeak) {
    return ALREADY_SET
  }

  if (!ctx.isStrong) {
    return PREREQUISITE_NOT_MET
  }

  ctx.executeAgainAsWeak = true
  throw new Error('Not implemented')
}
