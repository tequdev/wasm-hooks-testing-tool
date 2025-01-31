import { type Context, HOOK_RETURN_CODE } from '../../context/interface'

const { INTERNAL_ERROR, TOO_SMALL, TOO_BIG } = HOOK_RETURN_CODE

// // many datatypes can be encoded into an int64_t
// inline int64_t
// data_as_int64(void const* ptr_raw, uint32_t len)
// {
//     if (len > 8)
//         return hook_api::hook_return_code::TOO_BIG;

//     uint8_t const* ptr = reinterpret_cast<uint8_t const*>(ptr_raw);
//     uint64_t output = 0;
//     for (int i = 0, j = (len - 1) * 8; i < len; ++i, j -= 8)
//         output += (((uint64_t)ptr[i]) << j);
//     if ((1ULL << 63U) & output)
//         return hook_api::hook_return_code::TOO_BIG;
//     return (int64_t)output;
// }

export function data_as_int64(
  data_ptr: number,
  data_len: number,
  ctx: Context,
): bigint {
  if (data_len > 8) {
    return TOO_BIG
  }
  const data = ctx.memory.get(data_ptr, data_len)
  let output = 0n
  for (let i = 0, j = (data_len - 1) * 8; i < data_len; ++i, j -= 8) {
    output += BigInt(data[i]) << BigInt(j)
  }
  if ((1n << 63n) & output) {
    return TOO_BIG
  }
  return output
}

export const WRITE_MEMORY_OR_RETURN_AS_INT64 = (
  write_ptr_in: number,
  write_len_in: number,
  data_ptr_in: number,
  data_len_in: number,
  is_account_in: boolean,
  ctx: Context,
) => {
  let data_ptr = data_ptr_in
  let data_len = data_len_in
  if (is_account_in) {
    data_len--
    data_ptr++
  }
  if (data_len < 0 || data_len > data_len_in || data_ptr < data_ptr_in) {
    return INTERNAL_ERROR
  }
  if (data_len === 0) {
    return 0n
  }
  if (write_ptr_in === 0) {
    return data_as_int64(data_ptr, data_len, ctx)
  }
  if (data_len > write_len_in) {
    return TOO_SMALL
  }
  const data = ctx.memory.get(data_ptr, data_len)
  ctx.memory.set(write_ptr_in, data)
  return BigInt(data.length)
}
