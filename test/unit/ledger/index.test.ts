import {
  fee_base,
  ledger_keylet,
  ledger_last_hash,
  ledger_last_time,
  ledger_nonce,
  ledger_seq,
} from '../../../src/api'
import { HOOK_RETURN_CODE } from '../../../src/context/interface'
import { BUF, defaultContext } from '../tools'

const { OUT_OF_BOUNDS, TOO_SMALL, TOO_BIG, DOESNT_EXIST } = HOOK_RETURN_CODE

describe('ledger', () => {
  const memory = new Uint8Array(1024 * 10)
  let ctx = defaultContext(memory)
  beforeEach(() => {
    memory.fill(0)
    ctx = defaultContext(memory)
  })
  it('fee_base', () => {
    expect(fee_base(ctx)).toBe(10n)
  })

  it('ledger_seq', () => {
    expect(ledger_seq(ctx)).toBeGreaterThan(0n)
  })

  describe('ledger_last_hash', () => {
    it('Test out of bounds check', () => {
      const buf = BUF.empty(100, 32)
      expect(ledger_last_hash(1000000, 32, ctx)).toBe(OUT_OF_BOUNDS)
      expect(ledger_last_hash(buf.ptr, 31, ctx)).toBe(TOO_SMALL)
      expect(ledger_last_hash(buf.ptr, 32, ctx)).toBe(32n)
    })
    it('return the hash', () => {
      const buf = BUF.empty(100, 32)
      expect(ledger_last_hash(...buf.sbuf(), ctx)).toBe(32n)
    })
  })

  it('ledger_last_time', () => {
    expect(ledger_last_time(ctx)).toBeGreaterThan(0n)
  })

  describe('ledger_nonce', () => {
    it('test out of bounds check', () => {
      const buf = BUF.empty(100, 32)
      expect(ledger_nonce(1000000, 32, ctx)).toBe(OUT_OF_BOUNDS)
      expect(ledger_nonce(buf.ptr, 31, ctx)).toBe(TOO_SMALL)
      expect(ledger_nonce(buf.ptr, 32, ctx)).toBe(32n)
      expect(ledger_nonce(buf.ptr + 32, 32, ctx)).toBe(32n)
    })
    it('return the two nonces as the return string', () => {
      const buf = BUF.empty(100, 32)
      expect(ledger_nonce(...buf.sbuf(), ctx)).toBe(32n)
    })
  })

  describe('ledger_keylet', () => {
    it('test out of bounds check', () => {
      expect(ledger_keylet(1000000, 34, 0, 34, 0, 34, ctx)).toBe(OUT_OF_BOUNDS)
      expect(ledger_keylet(0, 1000000, 0, 34, 0, 34, ctx)).toBe(OUT_OF_BOUNDS)
      expect(ledger_keylet(0, 34, 1000000, 34, 0, 34, ctx)).toBe(OUT_OF_BOUNDS)
      expect(ledger_keylet(0, 34, 0, 1000000, 0, 34, ctx)).toBe(OUT_OF_BOUNDS)
      expect(ledger_keylet(0, 34, 0, 34, 1000000, 34, ctx)).toBe(OUT_OF_BOUNDS)
      expect(ledger_keylet(0, 34, 0, 34, 0, 1000000, ctx)).toBe(OUT_OF_BOUNDS)
    })

    it('test size check', () => {
      expect(ledger_keylet(0, 33, 0, 34, 0, 34, ctx)).toBe(TOO_SMALL)
      expect(ledger_keylet(0, 34, 0, 33, 0, 34, ctx)).toBe(TOO_SMALL)
      expect(ledger_keylet(0, 34, 0, 34, 0, 33, ctx)).toBe(TOO_SMALL)
    })

    it('test too big', () => {
      expect(ledger_keylet(0, 35, 0, 34, 0, 34, ctx)).toBe(TOO_BIG)
      expect(ledger_keylet(0, 34, 0, 34, 0, 35, ctx)).toBe(TOO_BIG)
    })

    const trash = [
      1, 2, 1, 2, 3, 4, 5, 6, 7, 8, 9, 1, 2, 3, 4, 5, 6, 7, 8, 9, 1, 2, 3, 4, 5,
      6, 7, 8, 9, 1, 2, 3, 4, 5, 6, 7, 8, 9,
    ]

    const trash2 = [
      1, 2, 1, 2, 3, 4, 5, 6, 7, 8, 9, 1, 2, 3, 4, 5, 6, 7, 8, 9, 1, 2, 3, 4, 5,
      6, 7, 8, 9, 1, 2, 3, 4, 5, 6, 7, 8, 10,
    ]

    it.todo('doesnt exist', () => {
      const trashBuf = BUF.from(trash.slice(0, 34), 100)
      const trash2Buf = BUF.from(trash2.slice(0, 34), 200)
      trashBuf.set(memory)
      trash2Buf.set(memory)

      expect(
        ledger_keylet(0, 34, ...trashBuf.sbuf(), ...trash2Buf.sbuf(), ctx),
      ).toBe(DOESNT_EXIST)
      expect(
        ledger_keylet(0, 34, ...trash2Buf.sbuf(), ...trashBuf.sbuf(), ctx),
      ).toBe(DOESNT_EXIST)
    })
  })
})
