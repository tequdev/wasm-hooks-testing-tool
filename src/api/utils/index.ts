import {
  decodeAccountID,
  encodeAccountID,
  verifyKeypairSignature,
} from '@transia/xrpl'
import {
  hashAccountRoot,
  hashSignerListId,
  hashTrustline,
} from '@transia/xrpl/dist/npm/utils/hashes'
import sha512Half from '@transia/xrpl/dist/npm/utils/hashes/sha512Half'
import { HOOK_RETURN_CODE } from '../../context/interface'
import type { APITestWrapper } from '../test_utils'
import { keylet_code } from '../test_utils/enum'
import { serialize_keylet, unserialize_keylet } from '../test_utils/keylet'
import { LedgerEntryType } from '../test_utils/keylet_type'

const {
  OUT_OF_BOUNDS,
  INVALID_ARGUMENT,
  TOO_SMALL,
  INTERNAL_ERROR,
  INVALID_KEY,
  INVALID_ACCOUNT,
  NO_SUCH_KEYLET,
  NOT_IMPLEMENTED,
} = HOOK_RETURN_CODE

export interface UtilsAPI {
  util_raddr: (
    write_ptr: number,
    write_len: number,
    read_ptr: number,
    read_len: number,
  ) => bigint
  util_accid: (
    write_ptr: number,
    write_len: number,
    read_ptr: number,
    read_len: number,
  ) => bigint
  util_verify: (
    dread_ptr: number,
    dread_len: number,
    sread_ptr: number,
    sread_len: number,
    kread_ptr: number,
    kread_len: number,
  ) => bigint
  util_sha512h: (
    write_ptr: number,
    write_len: number,
    read_ptr: number,
    read_len: number,
  ) => bigint
  util_keylet: (
    write_ptr: number,
    write_len: number,
    keylet_type: number,
    a: number,
    b: number,
    c: number,
    d: number,
    e: number,
    f: number,
  ) => bigint
}

export const util_raddr: APITestWrapper<UtilsAPI['util_raddr']> = (
  write_ptr,
  write_len,
  read_ptr,
  read_len,
  ctx,
) => {
  if (write_len < 20) {
    return TOO_SMALL
  }

  if (!ctx.memory.isRangeValid(read_ptr, read_len)) {
    return OUT_OF_BOUNDS
  }

  if (!ctx.memory.isRangeValid(write_ptr, write_len)) {
    return OUT_OF_BOUNDS
  }

  try {
    const accid = ctx.memory.get(read_ptr, read_len)
    const raddr = encodeAccountID(Buffer.from(accid))
    if (raddr.length > write_len) {
      return TOO_SMALL
    }
    const encoded = new TextEncoder().encode(raddr)
    ctx.memory.set(write_ptr, encoded)
    return BigInt(raddr.length)
  } catch (e) {
    return INTERNAL_ERROR
  }
}

export const util_accid: APITestWrapper<UtilsAPI['util_accid']> = (
  write_ptr,
  write_len,
  read_ptr,
  read_len,
  ctx,
) => {
  if (write_len < 20) {
    return TOO_SMALL
  }

  if (!ctx.memory.isRangeValid(read_ptr, read_len)) {
    return OUT_OF_BOUNDS
  }

  if (!ctx.memory.isRangeValid(write_ptr, write_len)) {
    return OUT_OF_BOUNDS
  }

  try {
    const raddr = ctx.memory.get(read_ptr, read_len)
    const accid = decodeAccountID(new TextDecoder().decode(raddr))
    ctx.memory.set(write_ptr, accid)
    return BigInt(accid.length)
  } catch (e) {
    console.error(e)
    return INTERNAL_ERROR
  }
}

export const util_verify: APITestWrapper<UtilsAPI['util_verify']> = (
  dread_ptr,
  dread_len,
  sread_ptr,
  sread_len,
  kread_ptr,
  kread_len,
  ctx,
) => {
  if (!ctx.memory.isRangeValid(dread_ptr, dread_len)) {
    return OUT_OF_BOUNDS
  }

  if (!ctx.memory.isRangeValid(sread_ptr, sread_len)) {
    return OUT_OF_BOUNDS
  }

  if (!ctx.memory.isRangeValid(kread_ptr, kread_len)) {
    return OUT_OF_BOUNDS
  }

  const data = ctx.memory.get(dread_ptr, dread_len)
  const signature = ctx.memory.get(sread_ptr, sread_len)
  const pubkey = ctx.memory.get(kread_ptr, kread_len)
  if (kread_len !== 33) {
    return INVALID_KEY
  }
  if (dread_len === 0) {
    return TOO_SMALL
  }
  if (sread_len < 30) {
    return TOO_SMALL
  }
  if (
    pubkey.length !== 33 ||
    (pubkey[0] !== 0xed && pubkey[0] !== 0x02 && pubkey[0] !== 0x03)
  ) {
    return INVALID_KEY
  }
  const verified = verifyKeypairSignature(
    Buffer.from(data).toString('hex'),
    Buffer.from(signature).toString('hex'),
    Buffer.from(pubkey).toString('hex'),
  )
  return verified ? 1n : 0n
}

export const util_sha512h: APITestWrapper<UtilsAPI['util_sha512h']> = (
  write_ptr,
  write_len,
  read_ptr,
  read_len,
  ctx,
) => {
  if (write_len < 32) {
    return TOO_SMALL
  }
  if (!ctx.memory.isRangeValid(read_ptr, read_len)) {
    return OUT_OF_BOUNDS
  }
  if (!ctx.memory.isRangeValid(read_ptr, read_len)) {
    return OUT_OF_BOUNDS
  }

  try {
    const data = ctx.memory.get(read_ptr, read_len)
    const hash = new Uint8Array(
      sha512Half(Buffer.from(data).toString('hex'))
        .match(/.{1,2}/g)!
        .map((v) => Number.parseInt(v, 16)),
    )
    ctx.memory.set(write_ptr, hash)
    return BigInt(hash.length)
  } catch (e) {
    return INTERNAL_ERROR
  }
}

const hashQuality = (keylet: { type: number; key: number[] }, q: bigint) => {
  if (keylet.type !== LedgerEntryType.ltDIR_NODE) {
    throw new Error('keylet type is not ltDIR_NODE')
  }
  const x = keylet.key
  // flip last 8byte
  const flippedLast8 = x.slice(-8).reverse()

  return Buffer.from([...x.slice(0, -8), ...flippedLast8]).toString('hex')
}

const hashEmittedTxn = (id: string) => {
  return sha512Half(`0045${id}`)
}

const hashHookDefinition = (id: string) => {
  return sha512Half(`0044${id}`)
}

const hashHook = (accountAddress: string) => {
  return sha512Half(`0048${decodeAccountID(accountAddress).toString('hex')}`)
}

const hashOwnerDir = (accountAddress: string) => {
  return sha512Half(`004F${decodeAccountID(accountAddress).toString('hex')}`)
}

const hashCheck = (accountAddress: string, seq: number | string) => {
  const seqHex =
    typeof seq === 'number' ? seq.toString(16).padStart(8, '0') : seq
  return sha512Half(
    `0043${decodeAccountID(accountAddress).toString('hex')}${seqHex}`,
  )
}

const hashEscrow = (accountAddress: string, seq: number | string) => {
  const seqHex =
    typeof seq === 'number' ? seq.toString(16).padStart(8, '0') : seq
  return sha512Half(
    `0075${decodeAccountID(accountAddress).toString('hex')}${seqHex}`,
  )
}
const hashNftOffer = (accountAddress: string, seq: number | string) => {
  const seqHex =
    typeof seq === 'number' ? seq.toString(16).padStart(8, '0') : seq
  return sha512Half(
    `0051${decodeAccountID(accountAddress).toString('hex')}${seqHex}`,
  )
}
const hashOffer = (accountAddress: string, seq: number | string) => {
  const seqHex =
    typeof seq === 'number' ? seq.toString(16).padStart(8, '0') : seq
  return sha512Half(
    `006f${decodeAccountID(accountAddress).toString('hex')}${seqHex}`,
  )
}

const hashPage = (key: string, index: bigint) => {
  if (index === 0n) {
    return key
  }
  const indexHex = index.toString(16).padStart(16, '0')
  return sha512Half(`0064${key}${indexHex}`)
}

const hashAmendments = () => {
  return sha512Half('0066')
}

const hashFees = () => {
  return sha512Half('0065')
}

const hashNegativeUnl = () => {
  return sha512Half('004E')
}

const hashEmittedDir = () => {
  return sha512Half('0046')
}

const hashHookState = (
  accountAddress: string,
  key: string,
  namespace: string,
) => {
  return sha512Half(
    `0076${decodeAccountID(accountAddress).toString('hex')}${key}${namespace}`,
  )
}

const hashHookStateDir = (accountAddress: string, namespace: string) => {
  return sha512Half(
    `004A${decodeAccountID(accountAddress).toString('hex')}${namespace}`,
  )
}

const hashSkip = (b?: number) => {
  if (b === undefined) {
    return sha512Half('0073')
  }
  return sha512Half(`0073${b.toString(16).padStart(8, '0')}`)
}

const hashDepositPreauth = (aid: string, bid: string) => {
  return sha512Half(
    `0070${decodeAccountID(aid).toString('hex')}${decodeAccountID(bid).toString('hex')}`,
  )
}

const hashPayChan = (
  accountAddress: string,
  dstAddress: string,
  seq: number | string,
) => {
  const seqHex =
    typeof seq === 'number' ? seq.toString(16).padStart(8, '0') : seq
  return sha512Half(
    `0078${decodeAccountID(accountAddress).toString('hex')}${decodeAccountID(dstAddress).toString('hex')}${seqHex}`,
  )
}

const validate_currency_char = (char: string): boolean => {
  if (char.length !== 1)
    throw new Error('validate_currency_char: char length is not 1')
  const c = (c: string) => c.charCodeAt(0)
  if (c('a') <= c(char) && c(char) <= c('z')) return true
  if (c('A') <= c(char) && c(char) <= c('Z')) return true
  if (c('0') <= c(char) && c(char) <= c('9')) return true
  const symbols = [
    '?',
    '@',
    '#',
    '$',
    '%',
    '^',
    '&',
    '*',
    '<',
    '>',
    '(',
    ')',
    '{',
    '}',
    '[',
    ']',
    '|',
  ]
  if (symbols.includes(char)) return true
  return false
}

export const util_keylet: APITestWrapper<UtilsAPI['util_keylet']> = (
  write_ptr,
  write_len,
  keylet_type,
  a,
  b,
  c,
  d,
  e,
  f,
  ctx,
) => {
  if (!ctx.memory.isRangeValid(write_ptr, write_len)) {
    return OUT_OF_BOUNDS
  }
  if (write_len < 34) {
    return TOO_SMALL
  }
  if (keylet_type === 0) {
    return INVALID_ARGUMENT
  }
  const last = keylet_code.LAST_KLTYPE_V1
  if (keylet_type > last) {
    return INVALID_ARGUMENT
  }
  try {
    switch (keylet_type) {
      case keylet_code.QUALITY: {
        if (a === 0 || b === 0) return INVALID_ARGUMENT
        if (e !== 0 || f !== 0) return INVALID_ARGUMENT
        const read_ptr = a
        const read_len = b
        if (!ctx.memory.isRangeValid(read_ptr, read_len)) {
          return OUT_OF_BOUNDS
        }
        if (read_len !== 34) {
          return INVALID_ARGUMENT
        }
        const id = ctx.memory.get(read_ptr, read_len)
        if (id[0] !== 0x00 || id[1] !== 0x64) {
          return INVALID_ARGUMENT
        }
        const _kl = unserialize_keylet(ctx, read_ptr, read_len)
        if (!_kl) {
          return NO_SUCH_KEYLET
        }
        const [ktype, ...kl] = _kl

        const arg = (BigInt(c) << BigInt(32)) + BigInt(d)

        return serialize_keylet(
          LedgerEntryType.ltDIR_NODE,
          hashQuality({ type: ktype, key: kl }, arg),
          ctx,
          write_ptr,
          write_len,
        )
      }
      case keylet_code.HOOK_DEFINITION:
      case keylet_code.CHILD:
      case keylet_code.EMITTED_TXN:
      case keylet_code.UNCHECKED: {
        if (a === 0 || b === 0) {
          return INVALID_ARGUMENT
        }
        if (c !== 0 || d !== 0 || e !== 0 || f !== 0) {
          return INVALID_ARGUMENT
        }
        const read_prt = a
        const read_len = b
        if (!ctx.memory.isRangeValid(read_prt, read_len)) {
          return OUT_OF_BOUNDS
        }
        if (read_len !== 32) {
          return INVALID_ARGUMENT
        }
        const id = ctx.memory.get(read_prt, read_len)
        const idHex = Buffer.from(id).toString('hex')
        const keyletHex: [number, string] =
          keylet_type === keylet_code.CHILD
            ? [LedgerEntryType.ltCHILD, idHex]
            : keylet_type === keylet_code.EMITTED_TXN
              ? [LedgerEntryType.ltEMITTED_TXN, hashEmittedTxn(idHex)]
              : keylet_type === keylet_code.HOOK_DEFINITION
                ? [LedgerEntryType.ltHOOK_DEFINITION, hashHookDefinition(idHex)]
                : [LedgerEntryType.ltANY, idHex]

        return serialize_keylet(
          keyletHex[0],
          keyletHex[1],
          ctx,
          write_ptr,
          write_len,
        )
      }
      case keylet_code.OWNER_DIR:
      case keylet_code.SIGNERS:
      case keylet_code.ACCOUNT:
      case keylet_code.HOOK: {
        if (a === 0 || b === 0) {
          return INVALID_ARGUMENT
        }
        if (c !== 0 || d !== 0 || e !== 0 || f !== 0) {
          return INVALID_ARGUMENT
        }
        if (!ctx.memory.isRangeValid(a, b)) {
          return OUT_OF_BOUNDS
        }
        if (b !== 20) {
          return INVALID_ACCOUNT
        }
        const accountId = ctx.memory.get(a, b)
        const accountAddress = encodeAccountID(Buffer.from(accountId))
        const keyletHex: [number, string] =
          keylet_type === keylet_code.HOOK
            ? [LedgerEntryType.ltHOOK, hashHook(accountAddress)]
            : keylet_type === keylet_code.SIGNERS
              ? [
                  LedgerEntryType.ltSIGNER_LIST,
                  hashSignerListId(accountAddress),
                ]
              : keylet_type === keylet_code.OWNER_DIR
                ? [LedgerEntryType.ltDIR_NODE, hashOwnerDir(accountAddress)]
                : [
                    LedgerEntryType.ltACCOUNT_ROOT,
                    hashAccountRoot(accountAddress),
                  ]
        return serialize_keylet(
          keyletHex[0],
          keyletHex[1],
          ctx,
          write_ptr,
          write_len,
        )
      }
      case keylet_code.OFFER:
      case keylet_code.CHECK:
      case keylet_code.ESCROW:
      case keylet_code.NFT_OFFER: {
        if (a === 0 || b === 0) return INVALID_ARGUMENT
        if (e !== 0 || f !== 0) return INVALID_ARGUMENT
        const read_prt = a
        const read_len = b
        if (!ctx.memory.isRangeValid(read_prt, read_len)) {
          return OUT_OF_BOUNDS
        }
        if (read_len !== 20) {
          return INVALID_ARGUMENT
        }
        let seq: string | number
        if (d === 0) {
          seq = c
        } else if (d !== 32) {
          return INVALID_ARGUMENT
        } else {
          if (!ctx.memory.isRangeValid(c, 32)) {
            return OUT_OF_BOUNDS
          }
          const seq_buf = ctx.memory.get(c, d)
          seq = Buffer.from(seq_buf).toString('hex')
        }
        const accountId = ctx.memory.get(read_prt, read_len)
        const accountAddress = encodeAccountID(Buffer.from(accountId))
        const keyletHex: [number, string] =
          keylet_type === keylet_code.CHECK
            ? [LedgerEntryType.ltCHECK, hashCheck(accountAddress, seq)]
            : keylet_type === keylet_code.ESCROW
              ? [LedgerEntryType.ltESCROW, hashEscrow(accountAddress, seq)]
              : keylet_type === keylet_code.NFT_OFFER
                ? [
                    LedgerEntryType.ltNFTOKEN_OFFER,
                    hashNftOffer(accountAddress, seq),
                  ]
                : [LedgerEntryType.ltOFFER, hashOffer(accountAddress, seq)]

        return serialize_keylet(
          keyletHex[0],
          keyletHex[1],
          ctx,
          write_ptr,
          write_len,
        )
      }
      case keylet_code.PAGE: {
        if (a === 0 || b === 0) {
          return INVALID_ARGUMENT
        }
        if (e !== 0 || f !== 0) {
          return INVALID_ARGUMENT
        }
        const kread_ptr = a
        const kread_len = b
        if (!ctx.memory.isRangeValid(kread_ptr, kread_len)) {
          return OUT_OF_BOUNDS
        }
        if (b !== 32) {
          return INVALID_ARGUMENT
        }
        const key = ctx.memory.get(kread_ptr, kread_len)
        const keyHex = Buffer.from(key).toString('hex')
        const index = (BigInt(c) << BigInt(32)) + BigInt(d)
        const kl = hashPage(keyHex, index)
        return serialize_keylet(
          LedgerEntryType.ltDIR_NODE,
          kl,
          ctx,
          write_ptr,
          write_len,
        )
      }
      case keylet_code.HOOK_STATE: {
        if (a === 0 || b === 0 || c === 0 || d === 0 || e === 0 || f === 0) {
          return INVALID_ARGUMENT
        }
        const aread_ptr = a
        const aread_len = b
        const kread_ptr = c
        const kread_len = d
        const nread_ptr = e
        const nread_len = f
        if (
          !ctx.memory.isRangeValid(aread_ptr, aread_len) ||
          !ctx.memory.isRangeValid(kread_ptr, kread_len) ||
          !ctx.memory.isRangeValid(nread_ptr, nread_len)
        ) {
          return OUT_OF_BOUNDS
        }
        if (aread_len !== 20 || kread_len !== 32 || nread_len !== 32) {
          return INVALID_ARGUMENT
        }
        const accountId = ctx.memory.get(aread_ptr, aread_len)
        const accountAddress = encodeAccountID(Buffer.from(accountId))
        const key = ctx.memory.get(kread_ptr, kread_len)
        const keyHex = Buffer.from(key).toString('hex')
        const namespace = ctx.memory.get(nread_ptr, nread_len)
        const namespaceHex = Buffer.from(namespace).toString('hex')
        const kl = hashHookState(accountAddress, keyHex, namespaceHex)
        return serialize_keylet(
          LedgerEntryType.ltHOOK_STATE,
          kl,
          ctx,
          write_ptr,
          write_len,
        )
      }
      case keylet_code.HOOK_STATE_DIR: {
        if (a === 0 || b === 0 || c === 0 || d === 0) {
          return INVALID_ARGUMENT
        }
        if (e !== 0 || f !== 0) {
          return INVALID_ARGUMENT
        }
        const aread_ptr = a
        const aread_len = b
        const nread_ptr = c
        const nread_len = d
        if (
          !ctx.memory.isRangeValid(aread_ptr, aread_len) ||
          !ctx.memory.isRangeValid(nread_ptr, nread_len)
        ) {
          return OUT_OF_BOUNDS
        }
        if (aread_len !== 20 || nread_len !== 32) {
          return INVALID_ARGUMENT
        }
        const accountId = ctx.memory.get(aread_ptr, aread_len)
        const accountAddress = encodeAccountID(Buffer.from(accountId))
        const namespace = ctx.memory.get(nread_ptr, nread_len)
        const namespaceHex = Buffer.from(namespace).toString('hex')
        const kl = hashHookStateDir(accountAddress, namespaceHex)
        return serialize_keylet(
          LedgerEntryType.ltDIR_NODE,
          kl,
          ctx,
          write_ptr,
          write_len,
        )
      }
      case keylet_code.SKIP: {
        if (c !== 0 || d !== 0 || e !== 0 || f !== 0 || b > 1) {
          return INVALID_ARGUMENT
        }
        const kl = b === 0 ? hashSkip() : hashSkip(b)
        return serialize_keylet(
          LedgerEntryType.ltLEDGER_HASHES,
          kl,
          ctx,
          write_ptr,
          write_len,
        )
      }
      case keylet_code.AMENDMENTS:
      case keylet_code.FEES:
      case keylet_code.NEGATIVE_UNL:
      case keylet_code.EMITTED_DIR: {
        if (a !== 0 || b !== 0 || c !== 0 || d !== 0 || e !== 0 || f !== 0) {
          return INVALID_ARGUMENT
        }
        const keyletHex: [number, string] =
          keylet_type === keylet_code.AMENDMENTS
            ? [LedgerEntryType.ltAMENDMENTS, hashAmendments()]
            : keylet_type === keylet_code.FEES
              ? [LedgerEntryType.ltFEE_SETTINGS, hashFees()]
              : keylet_type === keylet_code.NEGATIVE_UNL
                ? [LedgerEntryType.ltNEGATIVE_UNL, hashNegativeUnl()]
                : [LedgerEntryType.ltDIR_NODE, hashEmittedDir()]
        return serialize_keylet(
          keyletHex[0],
          keyletHex[1],
          ctx,
          write_ptr,
          write_len,
        )
      }
      case keylet_code.LINE: {
        if (a === 0 || b === 0 || c === 0) {
          return INVALID_ARGUMENT
        }
        if (d === 0 || e === 0 || f === 0) {
          return INVALID_ARGUMENT
        }
        const hi_ptr = a
        const hi_len = b
        const lo_ptr = c
        const lo_len = d
        const cu_ptr = e
        const cu_len = f
        if (
          !ctx.memory.isRangeValid(hi_ptr, hi_len) ||
          !ctx.memory.isRangeValid(lo_ptr, lo_len) ||
          !ctx.memory.isRangeValid(cu_ptr, cu_len)
        ) {
          return OUT_OF_BOUNDS
        }
        if (hi_len !== 20 || lo_len !== 20) {
          return INVALID_ARGUMENT
        }
        let currency: Buffer
        if (cu_len === 20) {
          currency = Buffer.from(ctx.memory.get(cu_ptr, cu_len))
        } else if (cu_len === 3) {
          const currency_char = ctx.memory.get(cu_ptr, cu_len)
          const char1 = String.fromCharCode(currency_char[0])
          const char2 = String.fromCharCode(currency_char[1])
          const char3 = String.fromCharCode(currency_char[2])
          if (
            !validate_currency_char(char1) ||
            !validate_currency_char(char2) ||
            !validate_currency_char(char3)
          ) {
            return INVALID_ARGUMENT
          }
          currency = Buffer.alloc(20)
          currency[12] = char1.charCodeAt(0)
          currency[13] = char2.charCodeAt(0)
          currency[14] = char3.charCodeAt(0)
        } else {
          return INVALID_ARGUMENT
        }
        const hi = ctx.memory.get(hi_ptr, hi_len)
        const lo = ctx.memory.get(lo_ptr, lo_len)
        const hash = hashTrustline(
          encodeAccountID(Buffer.from(hi)),
          encodeAccountID(Buffer.from(lo)),
          currency.toString('hex'),
        )
        return serialize_keylet(
          LedgerEntryType.ltRIPPLE_STATE,
          hash,
          ctx,
          write_ptr,
          write_len,
        )
      }
      case keylet_code.DEPOSIT_PREAUTH: {
        if (a === 0 || b === 0 || c === 0 || d === 0) {
          return INVALID_ARGUMENT
        }
        if (e !== 0 || f !== 0) {
          return INVALID_ARGUMENT
        }
        const aread_ptr = a
        const aread_len = b
        const bread_ptr = c
        const bread_len = d
        if (
          !ctx.memory.isRangeValid(aread_ptr, aread_len) ||
          !ctx.memory.isRangeValid(bread_ptr, bread_len)
        ) {
          return OUT_OF_BOUNDS
        }
        if (aread_len !== 20 || bread_len !== 20) {
          return INVALID_ARGUMENT
        }
        const aid = ctx.memory.get(aread_ptr, aread_len)
        const bid = ctx.memory.get(bread_ptr, bread_len)
        const hash = hashDepositPreauth(
          encodeAccountID(Buffer.from(aid)),
          encodeAccountID(Buffer.from(bid)),
        )
        return serialize_keylet(
          LedgerEntryType.ltDEPOSIT_PREAUTH,
          hash,
          ctx,
          write_ptr,
          write_len,
        )
      }
      case keylet_code.PAYCHAN: {
        if (a === 0 || b === 0 || c === 0 || d === 0 || e === 0) {
          return INVALID_ARGUMENT
        }
        const aread_ptr = a
        const aread_len = b
        const bread_ptr = c
        const bread_len = d
        if (
          !ctx.memory.isRangeValid(aread_ptr, aread_len) ||
          !ctx.memory.isRangeValid(bread_ptr, bread_len)
        ) {
          return OUT_OF_BOUNDS
        }
        if (aread_len !== 20 || bread_len !== 20) {
          return INVALID_ARGUMENT
        }
        const aid = ctx.memory.get(aread_ptr, aread_len)
        const bid = ctx.memory.get(bread_ptr, bread_len)

        let seq: number | string
        if (f === 0) {
          seq = e
        } else if (f !== 32) {
          return INVALID_ARGUMENT
        } else {
          if (!ctx.memory.isRangeValid(e, 32)) {
            return OUT_OF_BOUNDS
          }
          const seq_buf = ctx.memory.get(e, f)
          seq = Buffer.from(seq_buf).toString('hex')
        }
        const hash = hashPayChan(
          encodeAccountID(Buffer.from(aid)),
          encodeAccountID(Buffer.from(bid)),
          seq,
        )
        return serialize_keylet(
          LedgerEntryType.ltPAYCHAN,
          hash,
          ctx,
          write_ptr,
          write_len,
        )
      }
    }
  } catch (e) {
    console.error(e)
    return INTERNAL_ERROR
  }
  return NO_SUCH_KEYLET
}
