import {
  add,
  compare,
  div,
  exponent,
  invert,
  is_negative,
  log,
  make_xfl,
  mantissa,
  mulratio,
  multiply,
  negate,
  one,
  root,
} from 'xfl.js'
import { type Context, HOOK_RETURN_CODE } from '../../context/interface'

const {
  INVALID_FLOAT,
  MANTISSA_OVERSIZED,
  MANTISSA_UNDERSIZED,
  EXPONENT_OVERSIZED,
  EXPONENT_UNDERSIZED,
  XFL_OVERFLOW,
  INVALID_ARGUMENT,
  DIVISION_BY_ZERO,
  COMPLEX_NOT_SUPPORTED,
  TOO_BIG,
  TOO_SMALL,
  CANT_RETURN_NEGATIVE,
} = HOOK_RETURN_CODE

const MIN_MANTISSA = 1000000000000000n
const MAX_MANTISSA = 9999999999999999n
const MIN_EXPONENT = -96
const MAX_EXPONENT = 80

// Helper functions for float operations
function getMantissa(float1: bigint): bigint {
  if (float1 < 0n) return INVALID_FLOAT
  if (float1 === 0n) return 0n
  return mantissa(float1)
}

function getExponent(float1: bigint): number {
  if (float1 < 0n) return Number(INVALID_FLOAT)
  if (float1 === 0n) return 0
  return exponent(float1)
}

function checkNegative(float1: bigint): boolean {
  return is_negative(float1)
}

function invertSign(float1: bigint): bigint {
  return multiply(float1, negate(one))
}

function setSign(float1: bigint, setNegative: boolean): bigint {
  const neg = checkNegative(float1)
  if ((neg && setNegative) || (!neg && !setNegative)) return float1
  return invertSign(float1)
}

function setMantissa(float1: bigint, mantissa: bigint): bigint {
  if (mantissa > MAX_MANTISSA) return MANTISSA_OVERSIZED
  if (mantissa < MIN_MANTISSA) return MANTISSA_UNDERSIZED
  const result = float1 - getMantissa(float1) + mantissa
  return result
}

function setExponent(float1: bigint, exponent: number): bigint {
  if (exponent > MAX_EXPONENT) return EXPONENT_OVERSIZED
  if (exponent < MIN_EXPONENT) return EXPONENT_UNDERSIZED

  const exp = BigInt(exponent + 97)
  const shifted = exp << 54n
  const result = (float1 & ~(0xffn << 54n)) + shifted
  return result
}

function makeFloat(mantissa: bigint, exponent: number, neg: boolean): bigint {
  if (mantissa === 0n) return 0n
  if (mantissa > MAX_MANTISSA) return MANTISSA_OVERSIZED
  if (mantissa < MIN_MANTISSA) return MANTISSA_UNDERSIZED
  if (exponent > MAX_EXPONENT) return EXPONENT_OVERSIZED
  if (exponent < MIN_EXPONENT) return EXPONENT_UNDERSIZED

  let out = 0n
  out = setMantissa(out, mantissa)
  out = setExponent(out, exponent)
  out = setSign(out, neg)
  return out
}

// Interface definitions for Hook API
export interface FloatAPI {
  float_set: (exp: number, mantissa: bigint) => bigint
  float_compare: (float1: bigint, float2: bigint, mode: number) => bigint
  float_negate: (float1: bigint) => bigint
  float_mantissa: (float1: bigint) => bigint
  float_sign: (float1: bigint) => bigint
  float_one: () => bigint
  float_sum: (float1: bigint, float2: bigint) => bigint
  float_multiply: (float1: bigint, float2: bigint) => bigint
  float_mulratio: (
    float1: bigint,
    round_up: number,
    numerator: number,
    denominator: number,
  ) => bigint
  float_divide: (float1: bigint, float2: bigint) => bigint
  float_invert: (float1: bigint) => bigint
  float_int: (
    float1: bigint,
    decimal_places: number,
    absolute: number,
  ) => bigint
  float_sto: (
    write_ptr: number,
    write_len: number,
    cread_ptr: number,
    cread_len: number,
    iread_ptr: number,
    iread_len: number,
    float1: bigint,
    field_code: number,
  ) => bigint
  float_sto_set: (read_ptr: number, read_len: number) => bigint
  float_log: (float1: bigint) => bigint
  float_root: (float1: bigint, n: number) => bigint
}

// Implementation of Hook API functions
export function float_set(exp: number, mantissa: bigint, ctx: Context): bigint {
  if (mantissa === 0n) return 0n

  const isNeg = mantissa < 0n
  const absMantissa = isNeg ? -mantissa : mantissa
  let normalizedMantissa = absMantissa
  let normalizedExp = exp

  while (normalizedMantissa >= 10n) {
    normalizedMantissa /= 10n
    normalizedExp++
  }
  while (normalizedMantissa < 1n) {
    normalizedMantissa *= 10n
    normalizedExp--
  }

  while (normalizedMantissa < MIN_MANTISSA) {
    normalizedMantissa *= 10n
    normalizedExp--
  }

  if (normalizedExp < MIN_EXPONENT) return INVALID_FLOAT
  if (normalizedExp > MAX_EXPONENT) return INVALID_FLOAT
  if (normalizedMantissa > MAX_MANTISSA) return MANTISSA_OVERSIZED

  return make_xfl(normalizedExp, mantissa)
}

export function float_compare(
  float1: bigint,
  float2: bigint,
  mode: number,
  ctx: Context,
): bigint {
  if (float1 < 0n || float2 < 0n) return INVALID_FLOAT

  const equalFlag = (mode & 1) !== 0
  const lessFlag = (mode & 2) !== 0
  const greaterFlag = (mode & 4) !== 0

  if ((equalFlag && lessFlag && greaterFlag) || mode === 0) {
    return INVALID_ARGUMENT
  }

  if (mode & ~0b111) {
    return INVALID_ARGUMENT
  }

  if (float1 === 0n && float2 === 0n) {
    return equalFlag ? 1n : 0n
  }

  const compared = compare(float1, float2)

  if (equalFlag && compared === 0) {
    return 1n
  }
  if (lessFlag && compared < 0) {
    return 1n
  }
  if (greaterFlag && compared > 0) {
    return 1n
  }
  return 0n
}

export function float_negate(float1: bigint, ctx: Context): bigint {
  if (float1 === 0n) return 0n
  if (float1 < 0n) return INVALID_FLOAT
  return invertSign(float1)
}

export function float_mantissa(float1: bigint, ctx: Context): bigint {
  if (float1 < 0n) return INVALID_FLOAT
  if (float1 === 0n) return 0n
  return getMantissa(float1)
}

export function float_sign(float1: bigint, ctx: Context): bigint {
  if (float1 < 0n) return INVALID_FLOAT
  if (float1 === 0n) return 0n
  return checkNegative(float1) ? 1n : 0n
}

export function float_one(_ctx: Context): bigint {
  return makeFloat(MIN_MANTISSA, -15, false)
}

export function float_sum(
  float1: bigint,
  float2: bigint,
  ctx: Context,
): bigint {
  if (float1 < 0n || float2 < 0n) return INVALID_FLOAT

  return BigInt(add(float1, float2))
}

export function float_multiply(
  float1: bigint,
  float2: bigint,
  ctx: Context,
): bigint {
  if (float1 < 0n || float2 < 0n) return INVALID_FLOAT
  if (float1 === 0n || float2 === 0n) return 0n
  try {
    return multiply(float1, float2)
  } catch (e) {
    return XFL_OVERFLOW
  }
}

export function float_mulratio(
  float1: bigint,
  round_up: number,
  numerator: number,
  denominator: number,
  ctx: Context,
): bigint {
  if (float1 < 0n) return INVALID_FLOAT
  if (float1 === 0n) return 0n
  if (denominator === 0) return DIVISION_BY_ZERO

  // TODO: use xfl.js
  const man = getMantissa(float1)
  const exp = getExponent(float1)
  const neg = checkNegative(float1)

  let resultMan = man * BigInt(numerator)
  if (round_up !== 0) {
    resultMan = (resultMan + BigInt(denominator) - 1n) / BigInt(denominator)
  } else {
    resultMan = resultMan / BigInt(denominator)
  }

  let resultExp = exp
  while (resultMan > MAX_MANTISSA) {
    resultMan /= 10n
    resultExp++
  }
  while (resultMan < MIN_MANTISSA && resultMan !== 0n) {
    resultMan *= 10n
    resultExp--
  }

  if (resultExp < MIN_EXPONENT) return 0n
  if (resultExp > MAX_EXPONENT) return XFL_OVERFLOW

  return makeFloat(resultMan, resultExp, neg)
}

export function float_divide(
  float1: bigint,
  float2: bigint,
  ctx: Context,
): bigint {
  if (float1 < 0n || float2 < 0n) return INVALID_FLOAT
  if (float2 === 0n) return DIVISION_BY_ZERO
  if (float1 === 0n) return 0n

  try {
    return div(float1, float2)
  } catch (e) {
    return XFL_OVERFLOW
  }
}

export function float_invert(float1: bigint, ctx: Context): bigint {
  if (float1 < 0n) return INVALID_FLOAT
  if (float1 === 0n) return DIVISION_BY_ZERO

  return invert(float1)
}

export function float_int(
  float1: bigint,
  decimal_places: number,
  absolute: number,
  ctx: Context,
): bigint {
  if (float1 < 0n) return INVALID_FLOAT
  if (float1 === 0n) return 0n

  const man = getMantissa(float1)
  const exp = getExponent(float1)
  const neg = checkNegative(float1)

  if (decimal_places > 15) {
    return INVALID_ARGUMENT
  }

  if (neg && absolute === 0) return CANT_RETURN_NEGATIVE

  const shift = -(exp + decimal_places)
  if (shift > 15) return 0n
  if (shift < 0) return TOO_BIG

  return shift > 0 ? man / 10n ** BigInt(shift) : man
}

export function float_log(float1: bigint, ctx: Context): bigint {
  if (float1 < 0n) return INVALID_FLOAT
  if (float1 === 0n) return INVALID_ARGUMENT
  if (checkNegative(float1)) return COMPLEX_NOT_SUPPORTED

  return log(float1)
}

export function float_root(float1: bigint, n: number, ctx: Context): bigint {
  if (float1 < 0n) return INVALID_FLOAT
  if (float1 === 0n) return 0n
  if (n < 2) return INVALID_ARGUMENT
  if (checkNegative(float1)) return COMPLEX_NOT_SUPPORTED

  return root(float1, n)
}

export function float_sto(
  write_ptr: number,
  write_len: number,
  cread_ptr: number,
  cread_len: number,
  iread_ptr: number,
  iread_len: number,
  float1: bigint,
  field_code: number,
  ctx: Context,
): bigint {
  // Validate float value
  if (float1 < 0n) return INVALID_FLOAT

  // Check if currency and issuer are provided correctly
  if (cread_len !== 0 && cread_len !== 20 && cread_len !== 3) {
    return INVALID_ARGUMENT
  }

  if (iread_len !== 0 && iread_len !== 20) {
    return INVALID_ARGUMENT
  }

  if ((cread_len === 0) !== (iread_len === 0)) {
    return INVALID_ARGUMENT
  }

  // Calculate required buffer size
  const isXRP = cread_len === 0
  const isShort = BigInt(field_code) === BigInt(0xffffffff)
  let bytesNeeded = 8 // Base size for the value

  if (!isXRP && !isShort) {
    bytesNeeded += 40 // Additional space for currency and issuer

    const fieldBigInt = BigInt(field_code) & 0xffffn
    const typeBigInt = (BigInt(field_code) >> 16n) & 0xffffn
    const field = Number(fieldBigInt)
    const type = Number(typeBigInt)

    if (field >= 16 && type >= 16) {
      bytesNeeded += 3
    } else if (field >= 16 || type >= 16) {
      bytesNeeded += 2
    } else {
      bytesNeeded += 1
    }
  }

  if (write_len < bytesNeeded) {
    return TOO_SMALL
  }

  // Write to memory
  const memory = new Uint8Array(bytesNeeded)
  let offset = 0

  // Write field header if needed
  if (!isXRP && !isShort) {
    const fieldBigInt = BigInt(field_code) & 0xffffn
    const typeBigInt = (BigInt(field_code) >> 16n) & 0xffffn
    const field = Number(fieldBigInt)
    const type = Number(typeBigInt)

    if (field >= 16 && type >= 16) {
      memory[offset++] = 0
      memory[offset++] = type
      memory[offset++] = field
    } else if (field >= 16) {
      memory[offset++] = type << 4
      memory[offset++] = field
    } else if (type >= 16) {
      memory[offset++] = field
      memory[offset++] = type
    } else {
      memory[offset++] = (type << 4) | field
    }
  }

  // Write float value
  const man = getMantissa(float1)
  const exp = getExponent(float1)
  const neg = checkNegative(float1)

  if (isXRP) {
    // XRP amount format
    const shift = -exp
    if (shift > 15) return 0n
    if (shift < 0) return TOO_BIG

    const normalizedMan = shift > 0 ? man / 10n ** BigInt(shift) : man

    memory[offset] = neg ? 0 : 0x40
    memory[offset] |= Number((normalizedMan >> 56n) & 0x3fn)
    memory[offset + 1] = Number((normalizedMan >> 48n) & 0xffn)
    memory[offset + 2] = Number((normalizedMan >> 40n) & 0xffn)
    memory[offset + 3] = Number((normalizedMan >> 32n) & 0xffn)
    memory[offset + 4] = Number((normalizedMan >> 24n) & 0xffn)
    memory[offset + 5] = Number((normalizedMan >> 16n) & 0xffn)
    memory[offset + 6] = Number((normalizedMan >> 8n) & 0xffn)
    memory[offset + 7] = Number(normalizedMan & 0xffn)
  } else {
    // IOU amount format
    if (man === 0n) {
      memory[offset] = 0x80
      memory[offset + 1] = 0
      memory[offset + 2] = 0
      memory[offset + 3] = 0
      memory[offset + 4] = 0
      memory[offset + 5] = 0
      memory[offset + 6] = 0
      memory[offset + 7] = 0
    } else {
      const normalizedExp = exp + 97
      memory[offset] = neg ? 0x80 : 0xc0
      memory[offset] |= Number(normalizedExp >> 2)
      memory[offset + 1] = Number((normalizedExp & 0x03) << 6)
      memory[offset + 1] |= Number((man >> 48n) & 0x3fn)
      memory[offset + 2] = Number((man >> 40n) & 0xffn)
      memory[offset + 3] = Number((man >> 32n) & 0xffn)
      memory[offset + 4] = Number((man >> 24n) & 0xffn)
      memory[offset + 5] = Number((man >> 16n) & 0xffn)
      memory[offset + 6] = Number((man >> 8n) & 0xffn)
      memory[offset + 7] = Number(man & 0xffn)
    }
    offset += 8

    // Write currency and issuer if needed
    if (!isShort) {
      // Copy currency data
      const currencyData = ctx.memory.get(cread_ptr, cread_len)
      if (cread_len === 3) {
        // Convert 3-byte currency code to 20-byte format
        memory.fill(0, offset, offset + 12)
        memory.set(currencyData, offset + 12)
        memory.fill(0, offset + 15, offset + 20)
      } else {
        memory.set(currencyData, offset)
      }
      offset += 20

      // Copy issuer data
      const issuerData = ctx.memory.get(iread_ptr, iread_len)
      memory.set(issuerData, offset)
    }
  }

  // Write result to hook memory
  ctx.memory.set(write_ptr, memory)
  return BigInt(bytesNeeded)
}

export function float_sto_set(
  read_ptr: number,
  read_len: number,
  ctx: Context,
): bigint {
  if (read_len < 8) return TOO_SMALL

  const data = ctx.memory.get(read_ptr, read_len)
  let offset = 0

  // Skip field header if present
  if (read_len > 8) {
    const firstByte = data[0]
    const hi = firstByte >> 4
    const lo = firstByte & 0x0f

    if (hi === 0 && lo === 0) {
      if (read_len < 11) return TOO_SMALL
      offset += 3
    } else if (hi === 0 || lo === 0) {
      if (read_len < 10) return TOO_SMALL
      offset += 2
    } else {
      offset += 1
    }
  }

  const isXRP = (data[offset] & 0x80) === 0
  const isNeg = (data[offset] & 0x40) === 0

  if (isXRP) {
    // Parse XRP amount
    let mantissa = 0n
    mantissa |= BigInt(data[offset] & 0x3f) << 56n
    mantissa |= BigInt(data[offset + 1]) << 48n
    mantissa |= BigInt(data[offset + 2]) << 40n
    mantissa |= BigInt(data[offset + 3]) << 32n
    mantissa |= BigInt(data[offset + 4]) << 24n
    mantissa |= BigInt(data[offset + 5]) << 16n
    mantissa |= BigInt(data[offset + 6]) << 8n
    mantissa |= BigInt(data[offset + 7])

    if (mantissa === 0n) return 0n
    return makeFloat(mantissa, 0, isNeg)
  }

  // Parse IOU amount
  if (data[offset] === 0x80) return 0n

  const exponentPart1 = (data[offset] & 0x3f) << 2
  const exponentPart2 = (data[offset + 1] & 0xc0) >> 6
  let exponent = exponentPart1 | exponentPart2
  exponent -= 97

  let mantissa = 0n
  mantissa |= BigInt(data[offset + 1] & 0x3f) << 48n
  mantissa |= BigInt(data[offset + 2]) << 40n
  mantissa |= BigInt(data[offset + 3]) << 32n
  mantissa |= BigInt(data[offset + 4]) << 24n
  mantissa |= BigInt(data[offset + 5]) << 16n
  mantissa |= BigInt(data[offset + 6]) << 8n
  mantissa |= BigInt(data[offset + 7])

  if (mantissa === 0n) return 0n
  return makeFloat(mantissa, exponent, isNeg)
}
