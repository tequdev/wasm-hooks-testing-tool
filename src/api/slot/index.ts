import { makeParser } from '@transia/ripple-binary-codec/dist/binary'
import { decode, encode } from '@transia/xrpl'
import { isAmount } from '@transia/xrpl/dist/npm/models/transactions/common'
import { make_xfl } from 'xfl.js'
import {
  type Context,
  HOOK_RETURN_CODE,
  type SlotEntry,
} from '../../context/interface'
import { WRITE_MEMORY_OR_RETURN_AS_INT64 } from '../test_utils/macro'
import { fieldIdsMap } from '../test_utils/sfcodes'
import { SerializedTypeID } from '../test_utils/sti'

const {
  TOO_SMALL,
  INTERNAL_ERROR,
  DOESNT_EXIST,
  INVALID_ARGUMENT,
  OUT_OF_BOUNDS,
  TOO_BIG,
  NOT_AN_ARRAY,
  NOT_AN_OBJECT,
  NOT_AN_AMOUNT,
  INVALID_FIELD,
  NO_FREE_SLOTS,
} = HOOK_RETURN_CODE

// Interface definitions for Hook API
export interface SlotAPI {
  slot: (write_ptr: number, write_len: number, slot_no: number) => bigint
  slot_clear: (slot_no: number) => bigint
  slot_count: (slot_no: number) => bigint
  slot_set: (read_ptr: number, read_len: number, slot_into: number) => bigint
  slot_size: (slot_no: number) => bigint
  slot_subarray: (
    parent_slot: number,
    array_id: number,
    new_slot: number,
  ) => bigint
  slot_subfield: (
    parent_slot: number,
    field_id: number,
    new_slot: number,
  ) => bigint
  slot_type: (slot_no: number, flags: number) => bigint
  xpop_slot: (slot_no_tx: number, slot_no_meta: number) => bigint
  slot_float: (slot_no: number) => bigint
}

const max_slot = 255

const slotEntryToFinalBuffer = (slotEntry: SlotEntry): Buffer => {
  if (slotEntry.type >= SerializedTypeID.STI_TRANSACTION) {
    return Buffer.from(slotEntry.entry)
  }
  const buffer = slotEntry.entry
  const fieldId_length =
    1 + (buffer[0] & 0xf0 ? 0 : 1) + (buffer[0] & 0x0f ? 0 : 1)
  let finalBuffer = Buffer.from(buffer.slice(fieldId_length))
  if (
    slotEntry.type === SerializedTypeID.STI_ARRAY ||
    slotEntry.type === SerializedTypeID.STI_OBJECT
  ) {
    finalBuffer = finalBuffer.subarray(0, finalBuffer.length - 1)
  }
  return finalBuffer
}

// Implementation of Hook API functions
export function slot(
  write_ptr: number,
  write_len: number,
  slot_no: number,
  ctx: Context,
): bigint {
  if (write_ptr === 0) {
    if (write_len !== 0) {
      return INVALID_ARGUMENT
    }
  } else {
    if (!ctx.memory.isRangeValid(write_ptr, write_len)) {
      return OUT_OF_BOUNDS
    }
    if (write_len < 1) {
      return TOO_SMALL
    }
  }
  if (!ctx.slot.get(slot_no)) {
    return DOESNT_EXIST
  }

  const slotEntry = ctx.slot.get(slot_no)
  if (!slotEntry) {
    return DOESNT_EXIST
  }
  if (slotEntry.entry.length === 0) {
    return INTERNAL_ERROR
  }

  const finalBuffer = slotEntryToFinalBuffer(slotEntry)

  ctx.memory.set(500, finalBuffer)
  return WRITE_MEMORY_OR_RETURN_AS_INT64(
    write_ptr,
    write_len,
    500,
    finalBuffer.length,
    slotEntry.type === SerializedTypeID.STI_ACCOUNT,
    ctx,
  )
  // TODO: STI_Account
  // if (write_ptr === 0) {
  //   if (finalBuffer.length > 8) {
  //     return TOO_BIG
  //   }
  //   const view = new DataView(
  //     slotEntry.entry.buffer,
  //     slotEntry.entry.byteOffset,
  //     slotEntry.entry.byteLength,
  //   )
  //   console.log(slotEntry.entry)
  //   console.log(Buffer.from(view.buffer).toString('hex'))
  //   const value = view.getBigUint64(0)
  //   if ((1n << 63n) & value) {
  //     return TOO_BIG
  //   }
  //   return value
  // }
  // ctx.memory.set(write_ptr, finalBuffer)
  // return BigInt(finalBuffer.length)
}

export function slot_clear(slot_no: number, ctx: Context): bigint {
  if (!ctx.slot.get(slot_no)) {
    return DOESNT_EXIST
  }

  ctx.slot.clear(slot_no)
  return 1n
}

export function slot_count(slot_no: number, ctx: Context): bigint {
  const slotEntry = ctx.slot.get(slot_no)
  if (!slotEntry) {
    return DOESNT_EXIST
  }
  if (slotEntry.entry.length === 0) {
    return INTERNAL_ERROR
  }
  if (slotEntry.type !== SerializedTypeID.STI_ARRAY) {
    return NOT_AN_ARRAY
  }
  const entryHex = Buffer.from(slotEntry.entry).toString('hex')

  const obj = decode(entryHex)
  return BigInt(Object.values<any>(obj)[0].length)
}

export function slot_set(
  read_ptr: number,
  read_len: number,
  slot_into: number,
  ctx: Context,
): bigint {
  if (!ctx.memory.isRangeValid(read_ptr, read_len)) {
    return OUT_OF_BOUNDS
  }
  if ((read_len !== 32 && read_len !== 34) || slot_into > max_slot) {
    return INVALID_ARGUMENT
  }

  if (slot_into === 0 && !ctx.slot.free()) {
    return NO_FREE_SLOTS
  }

  let slot_value: SlotEntry | undefined = undefined
  if (read_len === 34) {
    // keylet
    // const type = ctx.memory.get(read_ptr, 2)
    const index = ctx.memory.get(read_ptr + 2, read_len - 2)
    const blob =
      ctx.ledgerData[Buffer.from(index).toString('hex').toUpperCase()]
    if (!blob) {
      return DOESNT_EXIST
    }
    slot_value = {
      type: SerializedTypeID.STI_LEDGERENTRY,
      entry: Buffer.from(blob, 'hex'),
    }
  } else if (read_len === 32) {
    // txid
    throw new Error('slot_set: not implemented for txid')
  } else {
    return DOESNT_EXIST
  }

  if (!slot_value) {
    return DOESNT_EXIST
  }

  // Check if we can allocate a slot
  const finalSlot = slot_into === 0 ? ctx.slot.free() : slot_into
  if (!finalSlot) {
    return NO_FREE_SLOTS
  }

  ctx.slot.set(finalSlot, slot_value)
  return BigInt(finalSlot)
}

export function slot_size(slot_no: number, ctx: Context): bigint {
  const slot_value = ctx.slot.get(slot_no)
  if (!slot_value) {
    return DOESNT_EXIST
  }

  return BigInt(slot_value.entry.length)
}

export function slot_subarray(
  parent_slot: number,
  array_id: number,
  new_slot: number,
  ctx: Context,
): bigint {
  if (!ctx.slot.get(parent_slot)) {
    return DOESNT_EXIST
  }

  const parentEntry = ctx.slot.get(parent_slot)
  if (!parentEntry || parentEntry.type !== SerializedTypeID.STI_ARRAY) {
    return NOT_AN_ARRAY
  }

  const entryHex = Buffer.from(parentEntry.entry).toString('hex')

  const entryJson = decode(entryHex)
  const entryArray = Object.values<any>(entryJson)[0]

  if (array_id >= entryArray.length) {
    return DOESNT_EXIST
  }

  const finalSlot = new_slot === 0 ? ctx.slot.free() : new_slot
  if (!finalSlot) {
    return NO_FREE_SLOTS
  }
  const subarray = entryArray[array_id]

  const parser = makeParser(encode(subarray))
  const typeOrdinal = parser.readField().type.ordinal

  ctx.slot.set(finalSlot, {
    type: typeOrdinal,
    entry: Buffer.from(encode(subarray), 'hex'),
  })

  return BigInt(finalSlot)
}

const subfield = (
  parentEntry: SlotEntry,
  field_id: number,
): SlotEntry | undefined => {
  const parent = parentEntry.entry
  const type = parentEntry.type

  const parentJson = decode(Buffer.from(parent).toString('hex'))
  const fieldName = fieldIdsMap[field_id]

  if (
    type !== SerializedTypeID.STI_OBJECT &&
    type < SerializedTypeID.STI_TRANSACTION
  ) {
    throw new Error('not an object')
  }

  const targetJson =
    type === SerializedTypeID.STI_OBJECT
      ? Object.values<any>(parentJson)[0]
      : parentJson
  const subfieldJson = targetJson[fieldName]
  if (subfieldJson === undefined) {
    return undefined
  }

  const subfieldBuffer = Buffer.from(
    encode({ [fieldName]: subfieldJson } as any),
    'hex',
  )
  const subParser = makeParser(subfieldBuffer.toString('hex'))
  const subIns = subParser.readField()

  return {
    type: subIns.type.ordinal,
    entry: subfieldBuffer,
  }
}

export function slot_subfield(
  parent_slot: number,
  field_id: number,
  new_slot: number,
  ctx: Context,
): bigint {
  if (!ctx.slot.get(parent_slot)) {
    return DOESNT_EXIST
  }

  const parentEntry = ctx.slot.get(parent_slot)
  if (!parentEntry) {
    return DOESNT_EXIST
  }
  if (new_slot === 0 && !ctx.slot.free()) {
    return NO_FREE_SLOTS
  }
  if (new_slot > max_slot) {
    return INVALID_ARGUMENT
  }
  const finalSlot = new_slot === 0 ? ctx.slot.free() : new_slot
  if (!finalSlot) {
    return NO_FREE_SLOTS
  }
  if (!fieldIdsMap[field_id]) {
    return INVALID_FIELD
  }
  if (parentEntry.entry.length === 0) {
    return INTERNAL_ERROR
  }

  try {
    const subfieldEntry = subfield(parentEntry, field_id)
    if (!subfieldEntry) {
      return DOESNT_EXIST
    }
    ctx.slot.set(finalSlot, subfieldEntry)
    return BigInt(finalSlot)
  } catch (e) {
    return NOT_AN_OBJECT
  }
}

export function slot_type(
  slot_no: number,
  flags: number,
  ctx: Context,
): bigint {
  if (!ctx.slot.get(slot_no)) {
    return DOESNT_EXIST
  }

  const slotEntry = ctx.slot.get(slot_no)
  if (!slotEntry?.entry) {
    return INTERNAL_ERROR
  }

  const parser = makeParser(Buffer.from(slotEntry.entry).toString('hex'))
  if (flags === 0) {
    if (slotEntry.type === SerializedTypeID.STI_TRANSACTION) {
      return BigInt((10001 << 16) + 257)
    }
    if (slotEntry.type === SerializedTypeID.STI_LEDGERENTRY) {
      return BigInt((10002 << 16) + 257)
    }
    const [ins] = parser.readFieldAndValue()
    return BigInt(ins.ordinal)
  }

  if (flags === 1) {
    // Check if amount is native
    if (slotEntry.type !== SerializedTypeID.STI_AMOUNT) {
      return NOT_AN_AMOUNT
    }
    const amountJson = decode(
      Buffer.from(slotEntry.entry as any, 'hex').toString('hex'),
    )
    const amountValue = Object.values(amountJson)[0]
    return typeof amountValue === 'string' ? 1n : 0n
  }

  // Return field code
  if (typeof slotEntry.entry === 'object' && slotEntry.entry !== null) {
    const slotObj = slotEntry.entry
    if ('fieldCode' in slotObj && typeof slotObj.fieldCode === 'number') {
      return BigInt(slotObj.fieldCode)
    }
  }

  return INVALID_FIELD
}

export function xpop_slot(
  slot_no_tx: number,
  slot_no_meta: number,
  ctx: Context,
): bigint {
  // This is a placeholder implementation
  // Actual implementation would depend on the transaction and metadata handling
  throw new Error('xpop_slot: not implemented')
}

export function slot_float(slot_no: number, ctx: Context): bigint {
  const slotEntry = ctx.slot.get(slot_no)
  if (!slotEntry) {
    return DOESNT_EXIST
  }

  if (slotEntry.type !== SerializedTypeID.STI_AMOUNT) {
    return NOT_AN_AMOUNT
  }

  const amountJson = decode(Buffer.from(slotEntry.entry).toString('hex'))
  const value = Object.values(amountJson)[0]

  if (!isAmount(value)) {
    return NOT_AN_AMOUNT
  }

  if (typeof value === 'string') {
    // native
    return make_xfl(-6, value)
  } else {
    throw new Error('slot_float: not implemented for IOU')
  }
}
