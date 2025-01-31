import { otxn_burden, otxn_generation } from '../../../src/api'
import {
  emit,
  etxn_burden,
  etxn_details,
  etxn_fee_base,
  etxn_generation,
  etxn_nonce,
  etxn_reserve,
} from '../../../src/api/etxn'
import { HOOK_RETURN_CODE } from '../../../src/context/interface'
import { BUF, defaultContext } from '../tools'

const {
  PREREQUISITE_NOT_MET,
  OUT_OF_BOUNDS,
  TOO_SMALL,
  TOO_MANY_NONCES,
  TOO_BIG,
  ALREADY_SET,
} = HOOK_RETURN_CODE

describe('etxn', () => {
  const memory = new Uint8Array(1024 * 10)
  let ctx = defaultContext(memory)
  beforeEach(() => {
    memory.fill(0)
    ctx = defaultContext(memory)
  })
  it('etxn_burden', () => {
    expect(etxn_burden(ctx)).toBe(PREREQUISITE_NOT_MET)
    expect(etxn_reserve(2, ctx)).toBe(2n)
    expect(otxn_burden(ctx)).toBeGreaterThan(0n)
    expect(etxn_burden(ctx)).toBe(otxn_burden(ctx) * 2n)
  })

  it('etxn_details', () => {
    etxn_details(0, 0, ctx)
  })

  describe('etxn_fee_base', () => {
    it('Test out of bounds check', () => {
      const det = BUF.empty(100, 116)
      expect(etxn_details(1000000, 116, ctx)).toBe(OUT_OF_BOUNDS)
      expect(etxn_details(0, 1000000, ctx)).toBe(OUT_OF_BOUNDS)
      expect(etxn_details(det.ptr, 115, ctx)).toBe(TOO_SMALL)
      expect(etxn_details(det.ptr, 116, ctx)).toBe(PREREQUISITE_NOT_MET)
    })
    it('success', () => {
      const det = BUF.empty(100, 116)
      det.set(memory)
      etxn_reserve(1, ctx)
      expect(etxn_details(det.ptr, 116, ctx)).toBe(116n)
    })
  })

  describe('etxn_nonce', () => {
    it('Test out of bounds check', () => {
      expect(etxn_nonce(1000000, 116, ctx)).toBe(OUT_OF_BOUNDS)
      expect(etxn_nonce(0, 1000000, ctx)).toBe(OUT_OF_BOUNDS)
      const nonce = BUF.empty(100, 64)
      expect(etxn_nonce(nonce.ptr, 31, ctx)).toBe(TOO_SMALL)
    })
    it('success', () => {
      const nonce = BUF.empty(100, 64)
      const n1 = BUF.empty(100, 32)
      const n2 = BUF.empty(132, 32)

      for (let i = 0; i < 256; ++i) {
        expect(etxn_nonce(nonce.ptr + (i % 2) * 32, 32, ctx)).toBe(32n)
        expect(
          !(
            n1.get(memory)[0] === n2.get(memory)[0] &&
            n1.get(memory)[1] === n2.get(memory)[1]
          ),
        ).toBe(true)
      }

      expect(etxn_nonce(nonce.ptr, 116, ctx)).toBe(TOO_MANY_NONCES)
    })
  })

  it('etxn_reserve', () => {
    expect(etxn_reserve(0, ctx)).toBe(TOO_SMALL)
    expect(etxn_reserve(256, ctx)).toBe(TOO_BIG)
    expect(etxn_reserve(255, ctx)).toBe(255n)
    expect(etxn_reserve(255, ctx)).toBe(ALREADY_SET)
    expect(etxn_reserve(1, ctx)).toBe(ALREADY_SET)
  })

  it('etxn_generation', () => {
    expect(etxn_generation(ctx)).toBe(otxn_generation(ctx) + 1n)
  })

  describe('emit', () => {
    it('bounds checks', () => {
      expect(emit(1000000, 32, 0, 32, ctx)).toBe(OUT_OF_BOUNDS)
      expect(emit(0, 1000000, 0, 32, ctx)).toBe(OUT_OF_BOUNDS)
      expect(emit(0, 32, 1000000, 32, ctx)).toBe(OUT_OF_BOUNDS)
      expect(emit(0, 32, 0, 1000000, ctx)).toBe(OUT_OF_BOUNDS)
    })
  })
})
