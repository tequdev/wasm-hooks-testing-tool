import { createHash } from 'node:crypto'
import { HOOK_RETURN_CODE } from '../../context/interface'
import type { APITestWrapper } from '../test_utils'
import { unserialize_keylet } from '../test_utils/keylet'

const {
  TOO_SMALL,
  INTERNAL_ERROR,
  DOESNT_EXIST,
  INVALID_ARGUMENT,
  DOES_NOT_MATCH,
  OUT_OF_BOUNDS,
  TOO_BIG,
} = HOOK_RETURN_CODE

export interface LedgerAPI {
  fee_base: () => bigint
  ledger_seq: () => bigint
  ledger_last_hash: (write_ptr: number, write_len: number) => bigint
  ledger_last_time: () => bigint
  ledger_nonce: (write_ptr: number, write_len: number) => bigint
  ledger_keylet: (
    write_ptr: number,
    write_len: number,
    lread_ptr: number,
    lread_len: number,
    hread_ptr: number,
    hread_len: number,
  ) => bigint
}

// Base fee for transactions
export const fee_base: APITestWrapper<LedgerAPI['fee_base']> = (ctx) => {
  return 10n // Default base fee
}

// Current ledger sequence number
export const ledger_seq: APITestWrapper<LedgerAPI['ledger_seq']> = (ctx) => {
  return 1n // Default sequence number for testing
}

// Last ledger hash
export const ledger_last_hash: APITestWrapper<LedgerAPI['ledger_last_hash']> = (
  write_ptr,
  write_len,
  ctx,
) => {
  if (!ctx.memory.isRangeValid(write_ptr, write_len)) {
    return OUT_OF_BOUNDS
  }
  if (write_len < 32) {
    return TOO_SMALL
  }

  try {
    // Generate a deterministic hash based on the current context
    const data = `${ctx.hookNamespace}${ctx.otxnTxn}${ctx.burden}${ctx.generation}`
    const hash = createHash('sha256').update(data).digest()

    ctx.memory.set(write_ptr, hash)
    return 32n
  } catch (e) {
    return INTERNAL_ERROR
  }
}

// Last ledger close time
export const ledger_last_time: APITestWrapper<LedgerAPI['ledger_last_time']> = (
  ctx,
) => {
  // 2023-10-30T12:21:00
  return BigInt(751983660)
}

// Generate a ledger nonce
export const ledger_nonce: APITestWrapper<LedgerAPI['ledger_nonce']> = (
  write_ptr,
  write_len,
  ctx,
) => {
  if (!ctx.memory.isRangeValid(write_ptr, write_len)) {
    return OUT_OF_BOUNDS
  }
  if (write_len < 32) {
    return TOO_SMALL
  }

  try {
    // Generate a deterministic nonce based on the current context and time
    const data = `${ctx.hookNamespace}${ctx.otxnTxn}${Date.now()}`
    const nonce = createHash('sha256').update(data).digest()

    ctx.memory.set(write_ptr, nonce)
    return 32n
  } catch (e) {
    return INTERNAL_ERROR
  }
}

// Get keylet from ledger
export const ledger_keylet: APITestWrapper<LedgerAPI['ledger_keylet']> = (
  write_ptr,
  write_len,
  lread_ptr,
  lread_len,
  hread_ptr,
  hread_len,
  ctx,
) => {
  if (!ctx.memory.isRangeValid(write_ptr, write_len)) {
    return OUT_OF_BOUNDS
  }
  if (!ctx.memory.isRangeValid(lread_ptr, lread_len)) {
    return OUT_OF_BOUNDS
  }
  if (!ctx.memory.isRangeValid(hread_ptr, hread_len)) {
    return OUT_OF_BOUNDS
  }
  if (hread_len < 34 || lread_len < 34 || write_len < 34) {
    return TOO_SMALL
  }
  if (hread_len > 34 || lread_len > 34 || write_len > 34) {
    return TOO_BIG
  }

  const lowKeylet = unserialize_keylet(ctx, lread_ptr, lread_len)
  if (!lowKeylet) return INVALID_ARGUMENT
  const highKeylet = unserialize_keylet(ctx, hread_ptr, hread_len)
  if (!highKeylet) return INVALID_ARGUMENT

  if (lowKeylet[0] !== highKeylet[0]) {
    return DOES_NOT_MATCH
  }

  throw new Error('ledger_keylet: not implemented')
  // try {
  //   // Read the low and high keylets
  //   const lowKeylet = ctx.memory.get(lread_ptr, lread_len)
  //   const highKeylet = ctx.memory.get(hread_ptr, hread_len)

  //   // Extract type from low keylet (first two bytes)
  //   const type = (lowKeylet[0] << 8) | lowKeylet[1]
  //   const highType = (highKeylet[0] << 8) | highKeylet[1]

  //   // Types must match
  //   if (type !== highType) {
  //     return DOES_NOT_MATCH
  //   }

  //   // Extract keys (remaining 32 bytes)
  //   const lowKey = lowKeylet.slice(2)
  //   const highKey = highKeylet.slice(2)

  //   // Compare keys
  //   for (let i = 0; i < 32; i++) {
  //     if (lowKey[i] > highKey[i]) {
  //       return DOESNT_EXIST
  //     }
  //   }

  //   // Generate a new key between low and high
  //   const newKey = new Uint8Array(32)
  //   let carry = 1
  //   for (let i = 31; i >= 0; i--) {
  //     const sum = lowKey[i] + carry
  //     newKey[i] = sum & 0xff
  //     carry = sum >> 8
  //   }

  //   // Create output keylet
  //   const output = new Uint8Array(34)
  //   output[0] = lowKeylet[0]
  //   output[1] = lowKeylet[1]
  //   output.set(newKey, 2)

  //   ctx.memory.set(write_ptr, output)
  //   return 34n
  // } catch (e) {
  //   return INTERNAL_ERROR
  // }
}
