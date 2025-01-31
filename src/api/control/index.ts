import { ExitType } from '../../context/interface'
import type { APITestWrapper } from '../test_utils'

export interface ControlAPI {
  accept: (read_ptr: number, read_len: number, error_code: bigint) => bigint
  rollback: (read_ptr: number, read_len: number, error_code: bigint) => bigint
  _g: (id: number, maxiter: number) => number
}

export const accept: APITestWrapper<ControlAPI['accept']> = (
  read_ptr,
  read_len,
  error_code,
  ctx,
) => {
  const decoder = new TextDecoder()
  const str = decoder.decode(ctx.memory.get(read_ptr, read_len))
  ctx.hookResult = {
    exitType: ExitType.ACCEPT,
    exitCode: error_code,
    exitReason: str,
  }
  return 1n
}

export const rollback: APITestWrapper<ControlAPI['rollback']> = (
  read_ptr,
  read_len,
  error_code,
  ctx,
) => {
  const decoder = new TextDecoder()
  const str = decoder.decode(ctx.memory.get(read_ptr, read_len))
  ctx.hookResult = {
    exitType: ExitType.ROLLBACK,
    exitCode: error_code,
    exitReason: str,
  }
  return 1n
}
