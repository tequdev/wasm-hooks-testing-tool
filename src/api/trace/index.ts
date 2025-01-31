import { HOOK_RETURN_CODE } from '../../context/interface'
import type { APITestWrapper } from '../test_utils'

const { OUT_OF_BOUNDS } = HOOK_RETURN_CODE

export interface TraceAPI {
  trace: (
    mread_ptr: number,
    mread_len: number,
    dread_ptr: number,
    dread_len: number,
    as_hex: number,
  ) => bigint
  trace_num: (read_ptr: number, read_len: number, num: bigint) => bigint
  trace_float: (mread_ptr: number, mread_len: number, float1: bigint) => bigint
}

export const trace: APITestWrapper<TraceAPI['trace']> = (
  mread_ptr,
  mread_len,
  dread_ptr,
  dread_len,
  as_hex,
  ctx,
) => {
  if (!ctx.memory.isRangeValid(mread_ptr, mread_len)) {
    return OUT_OF_BOUNDS
  }
  if (!ctx.memory.isRangeValid(dread_ptr, dread_len)) {
    return OUT_OF_BOUNDS
  }
  const message = ctx.memory.get(mread_ptr, mread_len)
  const decodedMsg = new TextDecoder().decode(message)
  const data = ctx.memory.get(dread_ptr, dread_len)
  const hexData = Buffer.from(data).toString('hex').toUpperCase()
  const decodedData = new TextDecoder().decode(data)
  console.log('HookTrace: ', decodedMsg, as_hex ? hexData : decodedData)
  return 0n
}

export const trace_num: APITestWrapper<TraceAPI['trace_num']> = (
  read_ptr,
  read_len,
  num,
  ctx,
) => {
  if (!ctx.memory.isRangeValid(read_ptr, read_len)) {
    return OUT_OF_BOUNDS
  }
  const message = ctx.memory.get(read_ptr, read_len)
  const decodedMsg = new TextDecoder().decode(message)
  console.log('HookTrace: ', decodedMsg, num)
  return 0n
}

export const trace_float: APITestWrapper<TraceAPI['trace_float']> = (
  mread_ptr,
  mread_len,
  float1,
  ctx,
) => {
  if (!ctx.memory.isRangeValid(mread_ptr, mread_len)) {
    return OUT_OF_BOUNDS
  }
  const message = ctx.memory.get(mread_ptr, mread_len)
  const decodedMsg = new TextDecoder().decode(message)
  // TODO: to XFL
  console.log('HookTrace: ', decodedMsg, float1)
  return 0n
}
