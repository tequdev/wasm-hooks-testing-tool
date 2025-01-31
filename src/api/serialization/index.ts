import { type Context, HOOK_RETURN_CODE } from '../../context/interface'

const {
  TOO_SMALL,
  DOESNT_EXIST,
  OUT_OF_BOUNDS,
  TOO_BIG,
  PARSE_ERROR,
  MEM_OVERLAP,
} = HOOK_RETURN_CODE

// Interface definitions for Hook API
export interface SerializationAPI {
  sto_subfield: (
    write_ptr: number,
    write_len: number,
    field_id: number,
  ) => bigint
  sto_subarray: (
    write_ptr: number,
    write_len: number,
    array_id: number,
  ) => bigint
  sto_emplace: (
    write_ptr: number,
    write_len: number,
    sread_ptr: number,
    sread_len: number,
    fread_ptr: number,
    fread_len: number,
    field_id: number,
  ) => bigint
  sto_erase: (
    write_ptr: number,
    write_len: number,
    read_ptr: number,
    read_len: number,
    field_id: number,
  ) => bigint
  sto_validate: (write_ptr: number, write_len: number) => bigint
}

// Helper function to get object length including header bytes
function getObjectLength(
  data: Uint8Array,
  startOffset: number,
  maxLength: number,
): {
  length: number
  type: number
  field: number
  payloadStart: number
  payloadLength: number
} | null {
  if (startOffset >= maxLength - 1) return null

  const high = data[startOffset] >> 4
  const low = data[startOffset] & 0x0f
  let currentOffset = startOffset + 1

  let type: number
  let field: number

  if (high > 0 && low > 0) {
    // Common type and field
    type = high
    field = low
  } else if (high > 0) {
    // Common type, uncommon field
    if (currentOffset >= maxLength) return null
    type = high
    field = data[currentOffset++]
  } else if (low > 0) {
    // Common field, uncommon type
    if (currentOffset >= maxLength) return null
    field = low
    type = data[currentOffset++]
  } else {
    // Uncommon type and field
    if (currentOffset + 1 >= maxLength) return null
    type = data[currentOffset++]
    field = data[currentOffset++]
  }

  if (currentOffset >= maxLength) return null

  // Determine payload length based on type
  let payloadLength = -1
  const isVL = type === 8 || type === 7 || type === 18 || type === 19

  if (isVL) {
    const lengthValue = data[currentOffset++]
    if (currentOffset >= maxLength) return null

    if (lengthValue < 193) {
      payloadLength = lengthValue
    } else if (lengthValue > 192 && lengthValue < 241) {
      if (currentOffset >= maxLength) return null
      const adjustedLength = lengthValue - 193
      payloadLength = adjustedLength * 256 + data[currentOffset++] + 193
    } else {
      if (currentOffset + 1 >= maxLength) return null
      const b2 = data[currentOffset++]
      const adjustedLength = lengthValue - 241
      payloadLength =
        adjustedLength * 65536 + 12481 + b2 * 256 + data[currentOffset++]
    }
  } else if ((type >= 1 && type <= 5) || type === 16 || type === 17) {
    payloadLength =
      type === 1
        ? 2
        : type === 2
          ? 4
          : type === 3
            ? 8
            : type === 4
              ? 16
              : type === 5
                ? 32
                : type === 16
                  ? 1
                  : type === 17
                    ? 20
                    : -1
  } else if (type === 6) {
    payloadLength = data[currentOffset] >> 6 === 1 ? 8 : 48
  }

  if (payloadLength > -1) {
    const payloadStart = currentOffset - startOffset
    return {
      length: payloadLength + (currentOffset - startOffset),
      type,
      field,
      payloadStart,
      payloadLength,
    }
  }

  if (type === 15 || type === 14) {
    // Object or Array
    const payloadStart = currentOffset - startOffset
    const totalLength = currentOffset - startOffset

    for (let i = 0; i < 1024 && currentOffset < maxLength; i++) {
      const subObject = getObjectLength(data, currentOffset, maxLength)
      if (!subObject) return null

      currentOffset += subObject.length
      if (currentOffset >= maxLength) return null

      if (
        (data[currentOffset] === 0xe1 && type === 0x0e) ||
        (data[currentOffset] === 0xf1 && type === 0x0f)
      ) {
        return {
          length: currentOffset - startOffset + 1,
          type,
          field,
          payloadStart,
          payloadLength: currentOffset - startOffset - payloadStart,
        }
      }
    }
    return null
  }

  return null
}

export function sto_subfield(
  write_ptr: number,
  write_len: number,
  field_id: number,
  ctx: Context,
): bigint {
  if (!ctx.memory.isRangeValid(write_ptr, write_len)) {
    return OUT_OF_BOUNDS
  }
  if (write_len < 2) return TOO_SMALL

  const data = ctx.memory.get(write_ptr, write_len)
  let currentOffset = 0

  while (currentOffset < write_len) {
    const result = getObjectLength(data, currentOffset, write_len)
    if (!result) return PARSE_ERROR

    if ((result.type << 16) + result.field === field_id) {
      if (result.type === 0x0f) {
        // Return array fully formed
        return (BigInt(currentOffset) << 32n) + BigInt(result.length)
      }
      // Return pointers to payload for other objects
      return (
        (BigInt(currentOffset + result.payloadStart) << 32n) +
        BigInt(result.payloadLength)
      )
    }

    currentOffset += result.length
  }

  return DOESNT_EXIST
}

export function sto_subarray(
  write_ptr: number,
  write_len: number,
  array_id: number,
  ctx: Context,
): bigint {
  if (!ctx.memory.isRangeValid(write_ptr, write_len)) {
    return OUT_OF_BOUNDS
  }
  if (write_len < 2) return TOO_SMALL

  const data = ctx.memory.get(write_ptr, write_len)
  let currentOffset = 0
  let remainingLength = write_len

  // Skip array header if present
  if ((data[0] & 0xf0) === 0xf0) {
    currentOffset++
    remainingLength--
  }

  if (currentOffset >= remainingLength) return PARSE_ERROR

  for (let i = 0; i < 1024 && currentOffset < remainingLength; i++) {
    const result = getObjectLength(data, currentOffset, remainingLength)
    if (!result) return PARSE_ERROR

    if (i === array_id) {
      return (BigInt(currentOffset) << 32n) + BigInt(result.length)
    }

    currentOffset += result.length
  }

  return DOESNT_EXIST
}

const overlapping_memory = (ctx: Context, regions: number[]) => {
  for (let i = 0; i < regions.length - 2; i += 2) {
    const a = regions[i + 0]
    const b = regions[i + 1]

    for (let j = i + 2; j < regions.length; j += 2) {
      const c = regions[j + 0]
      const d = regions[j + 1]

      // only valid ways not to overlap are
      //
      // |===|  |===|
      // a   b  c   d
      //
      //      or
      // |===|  |===|
      // c   d  a   b

      if (d <= a || b <= c) {
        // no collision
        continue
      }
      return true
    }
  }
  return false
}

export function sto_emplace(
  write_ptr: number,
  write_len: number,
  sread_ptr: number,
  sread_len: number,
  fread_ptr: number,
  fread_len: number,
  field_id: number,
  ctx: Context,
): bigint {
  if (!ctx.memory.isRangeValid(write_ptr, write_len)) {
    return OUT_OF_BOUNDS
  }
  if (!ctx.memory.isRangeValid(sread_ptr, sread_len)) {
    return OUT_OF_BOUNDS
  }
  if (!ctx.memory.isRangeValid(fread_ptr, fread_len)) {
    return OUT_OF_BOUNDS
  }
  if (write_len < sread_len + fread_len) return TOO_SMALL
  if (sread_len > 1024 * 16) return TOO_BIG
  if (sread_len < 2) return TOO_SMALL

  const sourceData = ctx.memory.get(sread_ptr, sread_len)
  let currentOffset = 0
  let insertStart = sread_len
  let insertEnd = sread_len

  if (fread_len === 0 && fread_ptr === 0) {
    const regions = [
      write_ptr,
      write_ptr + write_len,
      sread_ptr,
      sread_ptr + sread_len,
    ]
    if (overlapping_memory(ctx, regions)) {
      return MEM_OVERLAP
    }
  } else {
    if (fread_len > 4096) {
      return TOO_BIG
    }
    if (fread_len < 2) {
      return TOO_SMALL
    }
    const regions = [
      write_ptr,
      write_ptr + write_len,
      sread_ptr,
      sread_ptr + sread_len,
    ]
    if (overlapping_memory(ctx, regions)) {
      return MEM_OVERLAP
    }
  }

  // __sto_emplace

  // Find insertion point
  while (currentOffset < sread_len) {
    const result = getObjectLength(sourceData, currentOffset, sread_len)
    if (!result) return PARSE_ERROR

    if ((result.type << 16) + result.field === field_id) {
      insertStart = currentOffset
      insertEnd = currentOffset + result.length
      break
    } else if ((result.type << 16) + result.field > field_id) {
      insertStart = currentOffset
      insertEnd = currentOffset
      break
    }

    currentOffset += result.length
  }

  // Create output buffer
  const output = new Uint8Array(write_len)
  let bytesWritten = 0

  // Write first part
  if (insertStart > 0) {
    output.set(sourceData.subarray(0, insertStart), 0)
    bytesWritten += insertStart
  }

  // Write new field if provided
  if (fread_len > 0) {
    const fieldData = ctx.memory.get(fread_ptr, fread_len)
    output.set(fieldData, bytesWritten)
    bytesWritten += fread_len
  }

  // Write second part
  if (insertEnd < sread_len) {
    output.set(sourceData.subarray(insertEnd), bytesWritten)
    bytesWritten += sread_len - insertEnd
  }

  ctx.memory.set(write_ptr, output.subarray(0, bytesWritten))
  return BigInt(bytesWritten)
}

export function sto_erase(
  write_ptr: number,
  write_len: number,
  read_ptr: number,
  read_len: number,
  field_id: number,
  ctx: Context,
): bigint {
  const ret = sto_emplace(
    write_ptr,
    write_len,
    read_ptr,
    read_len,
    0,
    0,
    field_id,
    ctx,
  )
  if (ret > 0 && ret === BigInt(read_len)) {
    return DOESNT_EXIST
  }
  return ret
}

export function sto_validate(
  write_ptr: number,
  write_len: number,
  ctx: Context,
): bigint {
  if (!ctx.memory.isRangeValid(write_ptr, write_len)) {
    return OUT_OF_BOUNDS
  }
  if (write_len < 2) {
    return TOO_SMALL
  }

  const data = ctx.memory.get(write_ptr, write_len)
  let currentOffset = 0

  while (currentOffset < write_len) {
    const result = getObjectLength(data, currentOffset, write_len)
    if (!result) return 0n
    currentOffset += result.length
  }

  return currentOffset === write_len ? 1n : 0n
}
