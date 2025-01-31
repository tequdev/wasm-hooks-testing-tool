import {
  type Transaction,
  convertStringToHex,
  decode,
  encode,
} from '@transia/xrpl'
import {
  hook_account,
  meta_slot,
  otxn_burden,
  otxn_field,
  otxn_generation,
  otxn_id,
  otxn_param,
  otxn_slot,
  otxn_type,
  slot,
  slot_subfield,
} from '../../../src/api'
import { fieldNamesMaps } from '../../../src/api/test_utils/sfcodes'
import { HOOK_RETURN_CODE } from '../../../src/context/interface'
import { BUF, defaultContext } from '../tools'

const {
  OUT_OF_BOUNDS,
  INVALID_ARGUMENT,
  TOO_BIG,
  TOO_SMALL,
  INVALID_FIELD,
  DOESNT_EXIST,
} = HOOK_RETURN_CODE

describe('otxn', () => {
  const memory = new Uint8Array(1024 * 10)
  let ctx = defaultContext(memory)
  beforeEach(() => {
    memory.fill(0)
    ctx = defaultContext(memory)
  })
  describe('otxn_burden', () => {
    it('should return a positive number', () => {
      expect(otxn_burden(ctx)).toBeGreaterThan(0n)
    })
    it.todo('burden on emitted txn')
  })

  describe('otxn_field', () => {
    it('bounds check', () => {
      expect(otxn_field(1, 1000000, fieldNamesMaps.sfAccount, ctx)).toBe(
        OUT_OF_BOUNDS,
      )
      expect(otxn_field(1000000, 20, fieldNamesMaps.sfAccount, ctx)).toBe(
        OUT_OF_BOUNDS,
      )
    })
    it('sanity check', () => {
      expect(otxn_field(0, 1, fieldNamesMaps.sfAccount, ctx)).toBe(
        INVALID_ARGUMENT,
      )
    })
    it('size check', () => {
      expect(otxn_field(0, 0, fieldNamesMaps.sfAccount, ctx)).toBe(TOO_BIG)

      const acc = BUF.empty(100, 20)
      expect(otxn_field(acc.ptr, 19, fieldNamesMaps.sfAccount, ctx)).toBe(
        TOO_SMALL,
      )
    })
    it('success', () => {
      const acc = BUF.empty(100, 20)
      expect(otxn_field(acc.ptr, 20, fieldNamesMaps.sfAccount, ctx)).toBe(20n)

      expect(otxn_field(acc.ptr, 20, 1, ctx)).toBe(INVALID_FIELD)
      const acc2 = BUF.empty(100, 20)
      expect(hook_account(acc2.ptr, 20, ctx)).toBe(20n)

      for (let i = 0; i < 20; ++i) {
        expect(acc.get(memory)[i]).toBe(acc2.get(memory)[i])
      }
    })
  })

  describe('otxn_generation', () => {
    it('hook()', () => {
      expect(otxn_generation(ctx)).toBe(0n)
    })
    it.todo('cbak()')
  })

  describe('otxn_id', () => {
    it('bounds check', () => {
      expect(otxn_id(1, 1000000, 0, ctx)).toBe(OUT_OF_BOUNDS)
      expect(otxn_id(1000000, 1024, 0, ctx)).toBe(OUT_OF_BOUNDS)
    })
    it('size check', () => {
      expect(otxn_id(1, 0, 0, ctx)).toBe(TOO_SMALL)
      expect(otxn_id(0, 31, 0, ctx)).toBe(TOO_SMALL)
    })
    it('success', () => {
      const id = BUF.empty(32, 32)
      expect(otxn_id(id.ptr, 32, 0, ctx)).toBe(32n)
    })
    it.todo('slot the otxn then generate a canonical hash over it', () => {
      // ASSERT(otxn_slot(1) == 1);
      // uint8_t buf[1024];
      // int64_t size = slot(buf + 4, sizeof(buf) - 4, 1);
      // ASSERT(size > 0);
      // buf[0] = 'T';
      // buf[1] = 'X';
      // buf[2] = 'N';
      // buf[3] = 0;
      // uint8_t hash[32];
      // ASSERT(util_sha512h(SBUF(hash), buf, size+4) == 32);
      // for (int i = 0; GUARD(32), i < 32; ++i)
      //     ASSERT(hash[i] == id[i]);
    })
  })

  it('otxn_type', () => {
    expect(otxn_slot(1, ctx)).toBe(1n)
    expect(slot_subfield(1, fieldNamesMaps.sfTransactionType, 2, ctx)).toBe(2n)

    const tt = slot(0, 0, 2, ctx)
    expect(otxn_type(ctx)).toBe(tt)
  })

  describe('otxn_slot', () => {
    it('', () => {
      expect(otxn_slot(256, ctx)).toBe(INVALID_ARGUMENT)
      expect(otxn_slot(1, ctx)).toBe(1n)

      const id = BUF.empty(32, 32)
      expect(otxn_id(id.ptr, 32, 0, ctx)).toBe(32n)
    })
    it.todo('slot the otxn then generate a canonical hash over it', () => {
      // ASSERT(otxn_slot(1) == 1);
      // uint8_t buf[1024];
      // int64_t size = slot(buf + 4, sizeof(buf) - 4, 1);
      // ASSERT(size > 0);
      // buf[0] = 'T';
      // buf[1] = 'X';
      // buf[2] = 'N';
      // buf[3] = 0;
      // uint8_t hash[32];
      // ASSERT(util_sha512h(SBUF(hash), buf, size+4) == 32);
      // for (int i = 0; GUARD(32), i < 32; ++i)
      //     ASSERT(hash[i] == id[i]);
    })
  })

  describe('otxn_param', () => {
    it('bounds check', () => {
      expect(otxn_param(0, 1000000, 0, 32, ctx)).toBe(OUT_OF_BOUNDS)
      expect(otxn_param(1000000, 32, 0, 32, ctx)).toBe(OUT_OF_BOUNDS)
      expect(otxn_param(0, 32, 1000000, 32, ctx)).toBe(OUT_OF_BOUNDS)
      expect(otxn_param(0, 32, 0, 1000000, ctx)).toBe(OUT_OF_BOUNDS)
      expect(otxn_param(0, 32, 0, 33, ctx)).toBe(TOO_BIG)
      expect(otxn_param(0, 32, 0, 0, ctx)).toBe(TOO_SMALL)
      expect(otxn_param(0, 32, 0, 32, ctx)).toBe(DOESNT_EXIST)
    })
    it('success', () => {
      const txn = decode(ctx.otxnTxn) as unknown as Transaction
      if (!txn.HookParameters) {
        txn.HookParameters = []
      }
      for (let i = 0; i < 16; ++i) {
        txn.HookParameters.push({
          HookParameter: {
            HookParameterName: convertStringToHex(`param${i}`),
            HookParameterValue: convertStringToHex(`value${i}`),
          },
        })
        ctx.otxnTxn = encode(txn)
      }
      const buf = BUF.empty(100, 32)
      buf.set(memory)
      for (let i = 0; i < 16; ++i) {
        const s = 6 + (i < 10 ? 0 : 1)
        const nameBuf = BUF.from(`param${i}`, 10)
        nameBuf.set(memory)
        const v = otxn_param(...buf.sbuf(), ...nameBuf.sbuf(), ctx)
        expect(v).toBe(BigInt(s))

        expect(buf.get(memory)[0]).toBe('v'.charCodeAt(0))
        expect(buf.get(memory)[1]).toBe('a'.charCodeAt(0))
        expect(buf.get(memory)[2]).toBe('l'.charCodeAt(0))
        expect(buf.get(memory)[3]).toBe('u'.charCodeAt(0))
        expect(buf.get(memory)[4]).toBe('e'.charCodeAt(0))

        const value = `value${i}`
        expect(buf.get(memory)[s - 1]).toBe(value.charCodeAt(s - 1))
        expect(buf.get(memory)[s - 2]).toBe(value.charCodeAt(s - 2))
      }
    })
  })

  it.todo('meta_slot', () => {
    meta_slot(0, ctx)
  })
})
