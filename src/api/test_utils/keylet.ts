import { type Context, HOOK_RETURN_CODE } from '../../context/interface'

const { TOO_SMALL } = HOOK_RETURN_CODE

export const serialize_keylet = (
  klType: number,
  klHex: string,
  ctx: Context,
  write_prt: number,
  write_len: number,
) => {
  if (write_len < 34) {
    return TOO_SMALL
  }
  ctx.memory.set(write_prt + 0, Uint8Array.from([(klType >> 8) & 0xff]))
  ctx.memory.set(write_prt + 1, Uint8Array.from([(klType >> 0) & 0xff]))
  ctx.memory.set(write_prt + 2, Uint8Array.from(Buffer.from(klHex, 'hex')))
  return BigInt(34)
}

export const unserialize_keylet = (
  ctx: Context,
  write_prt: number,
  write_len: number,
) => {
  if (write_len !== 34) return undefined
  const v = ctx.memory.get(write_prt, write_len)
  const ktype = (v[0] << 8) + v[1]
  return [ktype, ...v.slice(2)]
}
