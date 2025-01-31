import {
  makeParser,
  serializeObject,
} from '@transia/ripple-binary-codec/dist/binary'
import { type Transaction, decode, encode } from '@transia/xrpl'
import { hashTx } from '@transia/xrpl/dist/npm/utils/hashes'
import { HOOK_RETURN_CODE } from '../../context/interface'
import type { APITestWrapper } from '../test_utils'
import { WRITE_MEMORY_OR_RETURN_AS_INT64 } from '../test_utils/macro'
import { fieldIdsMap } from '../test_utils/sfcodes'
import { SerializedTypeID } from '../test_utils/sti'

const {
  TOO_SMALL,
  INTERNAL_ERROR,
  DOESNT_EXIST,
  INVALID_ARGUMENT,
  TOO_BIG,
  INVALID_FIELD,
  NO_FREE_SLOTS,
  OUT_OF_BOUNDS,
} = HOOK_RETURN_CODE

// Type for ripple-binary-codec serialization
interface SerializableObject {
  [key: string]:
    | string
    | number
    | boolean
    | SerializableObject
    | Array<SerializableObject>
}

export interface OtxnAPI {
  otxn_burden: () => bigint
  otxn_field: (write_ptr: number, write_len: number, field_id: number) => bigint
  otxn_generation: () => bigint
  otxn_id: (write_ptr: number, write_len: number, flags: number) => bigint
  otxn_type: () => bigint
  otxn_slot: (slot_no: number) => bigint
  otxn_param: (
    write_ptr: number,
    write_len: number,
    read_ptr: number,
    read_len: number,
  ) => bigint
  meta_slot: (slot_no: number) => bigint
}

export const otxn_burden: APITestWrapper<OtxnAPI['otxn_burden']> = (ctx) => {
  if (ctx.burden) {
    return ctx.burden
  }
  const decoded = decode(ctx.otxnTxn) as unknown
  const txn = decoded as Transaction
  const emitDetails = txn.EmitDetails
  if (!emitDetails) {
    return 1n
  }
  let burden = BigInt(emitDetails.EmitBurden)
  if (!burden) {
    return 1n
  }
  burden &= (1n << 63n) - 1n
  return burden
}

export const otxn_field: APITestWrapper<OtxnAPI['otxn_field']> = (
  write_ptr,
  write_len,
  field_id,
  ctx,
) => {
  if (write_ptr === 0) {
    if (write_len !== 0) {
      return INVALID_ARGUMENT
    }
  } else if (!ctx.memory.isRangeValid(write_ptr, write_len)) {
    return OUT_OF_BOUNDS
  }

  const field = fieldIdsMap[field_id]
  if (!field) {
    return INVALID_FIELD
  }

  const decoded = decode(ctx.otxnTxn) as unknown
  const txn = decoded as Record<string, unknown>
  if (!txn[field]) {
    return DOESNT_EXIST
  }

  try {
    const fieldJSON: SerializableObject = {
      [field]: txn[field] as
        | string
        | number
        | boolean
        | SerializableObject
        | Array<SerializableObject>,
    }
    const fieldBuffer = serializeObject(fieldJSON)

    const fieldId_length =
      1 + (fieldBuffer[0] & 0xf0 ? 0 : 1) + (fieldBuffer[0] & 0x0f ? 0 : 1)
    const finalBuffer = Buffer.from(fieldBuffer.slice(fieldId_length))

    const [ins, fieldValue] = makeParser(
      fieldBuffer.toString('hex'),
    ).readFieldAndValue()

    ctx.memory.set(500, finalBuffer)
    return WRITE_MEMORY_OR_RETURN_AS_INT64(
      write_ptr,
      write_len,
      500,
      finalBuffer.length,
      ins.type.ordinal === SerializedTypeID.STI_ACCOUNT,
      ctx,
    )
  } catch (e) {
    return INTERNAL_ERROR
  }
}

export const otxn_generation: APITestWrapper<OtxnAPI['otxn_generation']> = (
  ctx,
) => {
  if (ctx.generation) {
    return ctx.generation
  }
  const decoded = decode(ctx.otxnTxn) as unknown
  const txn = decoded as Transaction
  const emitDetails = txn.EmitDetails
  if (!emitDetails) {
    return 0n
  }
  if (!emitDetails.EmitGeneration) {
    return 0n
  }
  const generation = BigInt(emitDetails.EmitGeneration)
  ctx.generation = generation

  return generation
}

export const otxn_id: APITestWrapper<OtxnAPI['otxn_id']> = (
  write_ptr,
  write_len,
  flags,
  ctx,
) => {
  let txID: Buffer
  if (flags !== 0 && ctx.emitFailure) {
    txID = Buffer.from(ctx.emitFailure.TransactionHash, 'hex')
  } else {
    txID = Buffer.from(hashTx(ctx.otxnTxn), 'hex')
  }
  if (write_len < txID.length) {
    return TOO_SMALL
  }
  if (!ctx.memory.isRangeValid(write_ptr, write_len)) {
    return OUT_OF_BOUNDS
  }

  ctx.memory.set(write_ptr, txID)
  return BigInt(txID.length)
}

export const otxn_type: APITestWrapper<OtxnAPI['otxn_type']> = (ctx) => {
  if (ctx.emitFailure) {
    return BigInt(ctx.emitFailure.TransactionType)
  }
  const decoded = decode(ctx.otxnTxn) as unknown as Transaction
  const encoded = Buffer.from(
    encode({
      TransactionType: decoded.TransactionType,
    } as any),
    'hex',
  ).slice(1)
  const type = encoded.readUInt16BE(0)
  return BigInt(type)
}

const max_slot = 255

export const otxn_slot: APITestWrapper<OtxnAPI['otxn_slot']> = (
  slot_into,
  ctx,
) => {
  if (slot_into > max_slot) {
    return INVALID_ARGUMENT
  }
  if (slot_into === 0 && !ctx.slot.free()) {
    return NO_FREE_SLOTS
  }
  let finalSlot = slot_into
  if (slot_into === 0) {
    finalSlot = ctx.slot.free()!
  }

  // TODO: ctx.emitFailure
  if (ctx.otxnTxn.length === 0) {
    throw new Error('otxnTxn should be set')
  }
  if (ctx.emitFailure) {
    // TODO
    // ctx.slot.set(finalSlot, {
    //   type: [0,0],
    //   entry: ctx.emitFailure,
    // })
  } else {
    ctx.slot.set(finalSlot, {
      type: SerializedTypeID.STI_TRANSACTION,
      entry: Uint8Array.from(Buffer.from(ctx.otxnTxn, 'hex')),
    })
  }

  return BigInt(finalSlot)
}

export const otxn_param: APITestWrapper<OtxnAPI['otxn_param']> = (
  write_ptr,
  write_len,
  read_ptr,
  read_len,
  ctx,
) => {
  if (
    !ctx.memory.isRangeValid(read_ptr, read_len) ||
    !ctx.memory.isRangeValid(write_ptr, write_len)
  ) {
    return OUT_OF_BOUNDS
  }

  if (read_len < 1) {
    return TOO_SMALL
  }
  if (read_len > 32) {
    return TOO_BIG
  }

  const txn = decode(ctx.otxnTxn) as unknown as Transaction
  if (!txn.HookParameters) {
    return DOESNT_EXIST
  }

  const paramName = ctx.memory.get(read_ptr, read_len)
  for (const param of txn.HookParameters) {
    const paramNameBuf = Buffer.from(
      param.HookParameter.HookParameterName,
      'hex',
    )
    const paramValueBuf = Buffer.from(
      param.HookParameter.HookParameterValue,
      'hex',
    )
    if (paramNameBuf.equals(paramName)) {
      if (!param.HookParameter.HookParameterValue) {
        return DOESNT_EXIST
      }

      if (write_len < paramValueBuf.length) {
        return TOO_SMALL
      }

      ctx.memory.set(write_ptr, paramValueBuf)
      return BigInt(paramValueBuf.length)
    }
  }

  return DOESNT_EXIST
}

export const meta_slot: APITestWrapper<OtxnAPI['meta_slot']> = (
  slot_into,
  ctx,
) => {
  // Metadata handling would go here
  throw new Error('Not implemented')
}
