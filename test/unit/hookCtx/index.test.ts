import { convertStringToHex, encode } from '@transia/xrpl'
import {
  hook_account,
  hook_again,
  hook_hash,
  hook_param,
  hook_param_set,
  hook_pos,
  hook_skip,
  otxn_field,
} from '../../../src/api'
import { fieldNamesMaps } from '../../../src/api/test_utils/sfcodes'
import { HOOK_RETURN_CODE } from '../../../src/context/interface'
import { BUF, defaultContext } from '../tools'

const { OUT_OF_BOUNDS, TOO_BIG, TOO_SMALL, DOESNT_EXIST, INVALID_ARGUMENT } =
  HOOK_RETURN_CODE

describe('hookCtx', () => {
  const memory = new Uint8Array(1024 * 10)
  let ctx = defaultContext(memory)
  beforeEach(() => {
    memory.fill(0)
    ctx = defaultContext(memory)
  })
  it('hook_account', () => {
    expect(hook_account(1000000, 20, ctx)).toBe(OUT_OF_BOUNDS)
    expect(hook_account(0, 1000000, ctx)).toBe(OUT_OF_BOUNDS)
    expect(hook_account(0, 19, ctx)).toBe(TOO_SMALL)
    expect(hook_account(0, 20, ctx)).toBe(20n)
  })

  it('hook_hash', () => {
    expect(hook_hash(1000000, 32, -1, ctx)).toBe(OUT_OF_BOUNDS)
    expect(hook_hash(0, 31, -1, ctx)).toBe(TOO_SMALL)
    expect(hook_hash(0, 32, -1, ctx)).toBe(32n)
  })

  describe('hook_param', () => {
    it('error', () => {
      expect(hook_param(0, 1000000, 0, 32, ctx)).toBe(OUT_OF_BOUNDS)
      expect(hook_param(1000000, 32, 0, 32, ctx)).toBe(OUT_OF_BOUNDS)
      expect(hook_param(0, 32, 1000000, 32, ctx)).toBe(OUT_OF_BOUNDS)
      expect(hook_param(0, 32, 0, 1000000, ctx)).toBe(OUT_OF_BOUNDS)
      expect(hook_param(0, 32, 0, 33, ctx)).toBe(TOO_BIG)
      expect(hook_param(0, 32, 0, 0, ctx)).toBe(TOO_SMALL)
      expect(hook_param(0, 32, 0, 32, ctx)).toBe(DOESNT_EXIST)
    })
    it('success', () => {
      for (let i = 0; i < 16; ++i) {
        ctx.hookParams[convertStringToHex(`param${i}`)] = convertStringToHex(
          `value${i}`,
        )
      }
      const buf = BUF.empty(100, 32)
      buf.set(memory)
      for (let i = 0; i < 16; ++i) {
        const s = 6 + (i < 10 ? 0 : 1)
        const nameBuf = BUF.from(`param${i}`, 10)
        nameBuf.set(memory)
        const v = hook_param(...buf.sbuf(), ...nameBuf.sbuf(), ctx)
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

  describe('hook_param_set', () => {
    it('error', () => {
      expect(hook_param_set(1000000, 32, 0, 32, 0, 32, ctx)).toBe(OUT_OF_BOUNDS)
      expect(hook_param_set(0, 1000000, 0, 32, 0, 32, ctx)).toBe(OUT_OF_BOUNDS)
      expect(hook_param_set(0, 32, 1000000, 32, 0, 32, ctx)).toBe(OUT_OF_BOUNDS)
      expect(hook_param_set(0, 32, 0, 1000000, 0, 32, ctx)).toBe(OUT_OF_BOUNDS)
      expect(hook_param_set(0, 32, 0, 32, 1000000, 32, ctx)).toBe(OUT_OF_BOUNDS)
      expect(hook_param_set(0, 32, 0, 32, 0, 1000000, ctx)).toBe(OUT_OF_BOUNDS)
      expect(hook_param_set(0, 32, 0, 0, 0, 32, ctx)).toBe(TOO_SMALL)
      expect(hook_param_set(0, 32, 0, 33, 0, 32, ctx)).toBe(TOO_BIG)
      expect(hook_param_set(0, 32, 0, 32, 0, 33, ctx)).toBe(INVALID_ARGUMENT)
      expect(hook_param_set(0, 32, 0, 32, 0, 31, ctx)).toBe(INVALID_ARGUMENT)
      expect(hook_param_set(0, 32, 0, 32, 0, 0, ctx)).toBe(INVALID_ARGUMENT)
      expect(hook_param_set(0, 257, 0, 32, 0, 32, ctx)).toBe(TOO_BIG)
    })
    it('success', () => {
      // uint8_t checker_hash[32];
      // ASSERT(hook_param(SBUF(checker_hash), "checker", 7) == 32);
      // for (int i = 0; GUARD(4), i < 4; ++i)
      // {
      //     ASSERT(hook_param_set(values[i], 6, names[i], 6, SBUF(checker_hash)) == 6);
      // }
      // // "delete" the checker entry" for when the checker runs
      // ASSERT(hook_param_set(0,0,"checker", 7, SBUF(checker_hash)) == 0);
      // // add a parameter that did not previously exist
      // ASSERT(hook_param_set("world", 5,"hello", 5, SBUF(checker_hash)) == 5);
      // // ensure this hook's parameters did not change
      // uint8_t buf[32];
      // for (int i = 0; GUARD(4), i < 4; ++i)
      // {
      //     ASSERT(hook_param(SBUF(buf), names[i], 6) == 6);
      //     ASSERT(buf[0] == 'v' && buf[1] == 'a' && buf[2] == 'l' &&
      //         buf[3] == 'u' && buf[4] == 'e' && buf[5] == '0');
      // }
    })
  })

  describe('hook_skip', () => {
    it('bounds checks', () => {
      expect(hook_skip(0, 1000000, 0, ctx)).toBe(OUT_OF_BOUNDS)
      expect(hook_skip(1000000, 32, 0, ctx)).toBe(OUT_OF_BOUNDS)
      expect(hook_skip(1000000, 100000, 0, ctx)).toBe(OUT_OF_BOUNDS)
      expect(hook_skip(0, 33, 0, ctx)).toBe(INVALID_ARGUMENT)
      expect(hook_skip(0, 1000000, 1, ctx)).toBe(OUT_OF_BOUNDS)
      expect(hook_skip(1000000, 32, 1, ctx)).toBe(OUT_OF_BOUNDS)
      expect(hook_skip(1000000, 100000, 1, ctx)).toBe(OUT_OF_BOUNDS)
      expect(hook_skip(0, 33, 1, ctx)).toBe(INVALID_ARGUMENT)
    })
    it('garbage check', () => {
      // expect(hook_skip(0, 32, 0, ctx)).toBe(DOESNT_EXIST)
      expect(hook_skip(0, 32, 1, ctx)).toBe(DOESNT_EXIST)
      expect(hook_skip(0, 32, 2, ctx)).toBe(INVALID_ARGUMENT)
    })
    it.todo('', () => {
      ctx.otxnTxn = encode({
        TransactionType: 'Payment',
        Account: 'r9cZA1mLK5R5Am25ArfXFmqgNwjZgnfk59',
        Destination: 'r9cZA1mLK5R5Am25ArfXFmqgNwjZgnfk59',
        Amount: '1000000000',
        InvoiceID: '1234567890',
      })
      // the hook to skip is passed in by invoice id
      const skip = BUF.empty(0, 32)
      expect(otxn_field(...skip.sbuf(), fieldNamesMaps.sfInvoiceID, ctx)).toBe(
        32n,
      )
      // get this hook's hash
      // uint8_t hash[32];
      // ASSERT(hook_hash(SBUF(hash), (uint32_t)hook_pos()) == 32);
      // to test if the "remove" function works in the api we will add this hook hash itself and then
      // remove it again. Therefore if the hook is placed at positions 0 and 3, the one at 3 should still
      // run
      // ASSERT(hook_skip(SBUF(hash), 1) == DOESNT_EXIST);
      // ASSERT(hook_skip(SBUF(hash), 0) == 1);
      // ASSERT(hook_skip(SBUF(hash), 1) == 1);
      // finally skip the hook hash indicated by invoice id
      // ASSERT(hook_skip(SBUF(skip), 0));
    })
  })

  it('hook_pos', () => {
    ctx.hookChainPosition = 1
    expect(hook_pos(ctx)).toBe(1n)
    ctx.hookChainPosition = 2
    expect(hook_pos(ctx)).toBe(2n)
  })

  it.todo('hook_again', () => {
    hook_again(ctx)
  })
})
