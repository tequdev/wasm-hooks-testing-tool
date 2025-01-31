import { encode, encodeAccountID, xrpToDrops } from '@transia/xrpl'
import type { RippleState } from '@transia/xrpl/dist/npm/models/ledger'
import {
  hashAccountRoot,
  hashTrustline,
} from '@transia/xrpl/dist/npm/utils/hashes'
import {
  float_int,
  hook_account,
  otxn_field,
  otxn_slot,
  slot,
  slot_clear,
  slot_count,
  slot_float,
  slot_set,
  slot_size,
  slot_subarray,
  slot_subfield,
  slot_type,
  sto_subfield,
  sto_validate,
  util_keylet,
  xpop_slot,
} from '../../../src/api'
import { fieldNamesMaps } from '../../../src/api/test_utils/sfcodes'
import { HOOK_RETURN_CODE } from '../../../src/context/interface'
import { BUF, defaultContext } from '../tools'

const {
  OUT_OF_BOUNDS,
  INVALID_ARGUMENT,
  DOESNT_EXIST,
  TOO_BIG,
  NOT_AN_ARRAY,
  NO_FREE_SLOTS,
  INVALID_FIELD,
  NOT_AN_OBJECT,
  NOT_AN_AMOUNT,
} = HOOK_RETURN_CODE

describe('slot', () => {
  const memory = new Uint8Array(1024 * 10)
  let ctx = defaultContext(memory)
  beforeEach(() => {
    memory.fill(0)
    ctx = defaultContext(memory)
  })
  describe('slot', () => {
    it('bounds tests', () => {
      expect(slot(1, 1000000, 0, ctx)).toBe(OUT_OF_BOUNDS)
      expect(slot(1000000, 1024, 0, ctx)).toBe(OUT_OF_BOUNDS)
      expect(slot(0, 1, 0, ctx)).toBe(INVALID_ARGUMENT)
      expect(slot(0, 0, 0, ctx)).toBe(DOESNT_EXIST)
    })
    it('test', () => {
      // grab the hook account
      const acc = BUF.empty(10, 20)
      expect(hook_account(...acc.sbuf(), ctx)).toBe(20n)
      acc.get(memory)

      // turn it into account root keylet
      const kl = BUF.empty(0, 34)
      const KL_ACC = 3
      expect(
        util_keylet(...kl.sbuf(), KL_ACC, ...acc.sbuf(), 0, 0, 0, 0, ctx),
      ).toBe(34n)
      kl.get(memory)

      // slot the account root into a new slot
      ctx.ledgerData[hashAccountRoot(encodeAccountID(acc.value))] = encode({
        LedgerEntryType: 'AccountRoot',
        Account: encodeAccountID(acc.value),
        Balance: xrpToDrops(100),
        Flags: 0,
        OwnerCount: 0,
        PreviousTxnID: '00'.repeat(32),
        PreviousTxnLgrSeq: 0,
        Sequence: 0,
        index: hashAccountRoot(encodeAccountID(acc.value)),
      })
      let slot_no: number | bigint = 0
      slot_no = slot_set(...kl.sbuf(), slot_no, ctx)
      expect(slot_no).toBeGreaterThan(BigInt(0))
      const size = slot_size(Number(slot_no), ctx)
      expect(size).toBeGreaterThan(BigInt(0))

      // // the slotted item is too large for return as int64
      expect(slot(0, 0, Number(slot_no), ctx)).toBe(TOO_BIG)

      // big buffer, large enough to hold the account_root
      const buf = BUF.empty(1024, 1024)
      // the slot call should return the bytes written which should exactly
      // match the size of the slotted object
      expect(slot(...buf.sbuf(), Number(slot_no), ctx)).toBe(size)

      // do a quick sanity check on the object using sto api
      expect(sto_validate(buf.ptr, Number(size), ctx)).toBe(1n)

      // grab a field
      expect(
        sto_subfield(buf.ptr, Number(size), fieldNamesMaps.sfBalance, ctx),
      ).toBeGreaterThan(0n)

      // subslot a subfield we can return as an int64_t
      expect(
        slot_subfield(Number(slot_no), fieldNamesMaps.sfBalance, 200, ctx),
      ).toBe(200n)

      // retrieve the slotted object as an int64_t
      expect(slot(0, 0, 200, ctx)).toBeGreaterThan(0n)
    })
  })

  describe('slot_clear', () => {
    it('test', () => {
      expect(otxn_slot(1, ctx)).toBe(1n)
      expect(slot_size(1, ctx)).toBeGreaterThan(0n)
      expect(slot_clear(1, ctx)).toBe(1n)
      expect(slot_size(1, ctx)).toBe(DOESNT_EXIST)
      expect(slot_clear(1, ctx)).toBe(DOESNT_EXIST)
      expect(slot_clear(10, ctx)).toBe(DOESNT_EXIST)
    })
  })

  describe('slot_count', () => {
    it('test', () => {
      expect(otxn_slot(1, ctx)).toBe(1n)
      expect(slot_size(1, ctx)).toBeGreaterThan(0n)
      expect(slot_count(1, ctx)).toBe(NOT_AN_ARRAY)
      expect(slot_count(0, ctx)).toBe(DOESNT_EXIST)
      expect(slot_subfield(1, fieldNamesMaps.sfMemos, 1, ctx)).toBe(1n)
      expect(slot_size(1, ctx)).toBeGreaterThan(0n)
      expect(slot_count(1, ctx)).toBe(1n)
    })
  })

  describe('slot_set', () => {
    it('error', () => {
      // bounds check
      expect(slot_set(1, 1000000, 0, ctx)).toBe(OUT_OF_BOUNDS)
      expect(slot_set(1000000, 1024, 0, ctx)).toBe(OUT_OF_BOUNDS)

      // read len is only allowed to be 32 (txn id) or 34 (keylet)
      const kl_zero = BUF.empty(0, 34)
      expect(slot_set(kl_zero.ptr, 31, 0, ctx)).toBe(INVALID_ARGUMENT)
      expect(slot_set(kl_zero.ptr, 33, 0, ctx)).toBe(INVALID_ARGUMENT)
      expect(slot_set(kl_zero.ptr, 35, 0, ctx)).toBe(INVALID_ARGUMENT)
      expect(slot_set(kl_zero.ptr, 34, 256, ctx)).toBe(INVALID_ARGUMENT)

      // request an invalid keylet
      expect(slot_set(...kl_zero.sbuf(), 0, ctx)).toBe(DOESNT_EXIST)

      kl_zero.value[0] = 1
      kl_zero.set(memory)
      expect(slot_set(...kl_zero.sbuf(), 0, ctx)).toBe(DOESNT_EXIST)
      expect(slot_size(1, ctx)).toBe(DOESNT_EXIST)
    })
  })

  describe('slot_size', () => {
    it('test', () => {
      const kl_sk = BUF.from(
        [
          0x00, 0x68, 0xb4, 0x97, 0x9a, 0x36, 0xcd, 0xc7, 0xf3, 0xd3, 0xd5,
          0xc3, 0x1a, 0x4e, 0xae, 0x2a, 0xc7, 0xd7, 0x20, 0x9d, 0xda, 0x87,
          0x75, 0x88, 0xb9, 0xaf, 0xc6, 0x67, 0x99, 0x69, 0x2a, 0xb0, 0xd6,
          0x6b,
        ],
        1,
        memory,
      )
      kl_sk.set(memory)

      ctx.ledgerData[
        kl_sk.value.slice(2, kl_sk.value.length).toString('hex').toUpperCase()
      ] = encode({
        LedgerEntryType: 'AccountRoot',
        Account: 'rrrrrrrrrrrrrrrrrrrrrhoLvTp',
        Balance: xrpToDrops(100),
        Flags: 0,
        OwnerCount: 0,
        PreviousTxnID: '00'.repeat(32),
        PreviousTxnLgrSeq: 0,
        Sequence: 0,
        index: hashAccountRoot('rrrrrrrrrrrrrrrrrrrrrhoLvTp'),
      })

      expect(slot_size(1, ctx)).toBe(DOESNT_EXIST)

      // request a valid keylet, twice
      expect(slot_set(...kl_sk.sbuf(), 1, ctx)).toBe(1n)
      expect(slot_set(...kl_sk.sbuf(), 255, ctx)).toBe(255n)
      // check the sizes are equal
      expect(slot_size(1, ctx)).toBe(slot_size(255, ctx))
      // check the sizes are > 0
      const s = slot_size(1, ctx)
      expect(s).toBeGreaterThan(0n)

      // pull the object out into a buffer, check the number of bytes written is correct
      const buf = BUF.empty(4096, 4096)
      expect(slot(...buf.sbuf(), 1, ctx)).toBe(s)

      // check the object is valid
      expect(sto_validate(buf.ptr, Number(s), ctx)).toBe(1n)
    })
  })

  describe('slot_subarray', () => {
    it('test', () => {
      const kl_sk = BUF.from(
        [
          0x00, 0x68, 0xb4, 0x97, 0x9a, 0x36, 0xcd, 0xc7, 0xf3, 0xd3, 0xd5,
          0xc3, 0x1a, 0x4e, 0xae, 0x2a, 0xc7, 0xd7, 0x20, 0x9d, 0xda, 0x87,
          0x75, 0x88, 0xb9, 0xaf, 0xc6, 0x67, 0x99, 0x69, 0x2a, 0xb0, 0xd6,
          0x6b,
        ],
        1,
        memory,
      )
      kl_sk.set(memory)

      ctx.ledgerData[
        kl_sk.value.slice(2, kl_sk.value.length).toString('hex').toUpperCase()
      ] = encode({
        LedgerEntryType: 'AccountRoot',
        Account: 'rrrrrrrrrrrrrrrrrrrrrhoLvTp',
        Balance: xrpToDrops(100),
        Flags: 0,
        OwnerCount: 0,
        PreviousTxnID: '00'.repeat(32),
        PreviousTxnLgrSeq: 0,
        Sequence: 0,
        index: hashAccountRoot('rrrrrrrrrrrrrrrrrrrrrhoLvTp'),
      })
      ctx.otxnTxn = encode({
        TransactionType: 'Payment',
        Account: 'rrrrrrrrrrrrrrrrrrrrrhoLvTp',
        Destination: 'rrrrrrrrrrrrrrrrrrrrrhoLvTp',
        Amount: '100000000',
        Memos: [
          { Memo: { MemoData: 'C001CAFE00' } },
          { Memo: { MemoData: 'C001CAFE01' } },
          { Memo: { MemoData: 'C001CAFE02' } },
          { Memo: { MemoData: 'C001CAFE03' } },
          { Memo: { MemoData: 'C001CAFE04' } },
          { Memo: { MemoData: 'C001CAFE05' } },
          { Memo: { MemoData: 'C001CAFE06' } },
          { Memo: { MemoData: 'C001CAFE07' } },
          { Memo: { MemoData: 'C001CAFE08' } },
        ],
      })

      expect(slot_subarray(1, 1, 1, ctx)).toBe(DOESNT_EXIST)

      // request a valid keylet that doesn't contain an array
      expect(slot_set(...kl_sk.sbuf(), 1, ctx)).toBe(1n)
      expect(slot_size(1, ctx)).toBeGreaterThan(0n)
      expect(slot_subarray(1, 1, 1, ctx)).toBe(NOT_AN_ARRAY)

      // now request an object that contains an array (this txn)
      expect(otxn_slot(2, ctx)).toBe(2n)
      // slot the array
      expect(slot_subfield(2, fieldNamesMaps.sfMemos, 3, ctx)).toBe(3n)
      // it should contain 9 entries
      expect(slot_count(3, ctx)).toBe(9n)
      // now index into the array
      expect(slot_subarray(3, 0, 0, ctx)).toBeGreaterThan(0n)
      // take element at index 5 and place it in slot 100
      expect(slot_subarray(3, 5, 100, ctx)).toBe(100n)
      // override it and replace with element 6
      expect(slot_subarray(3, 6, 100, ctx)).toBe(100n)
      // check the value is correct
      expect(slot_subfield(100, fieldNamesMaps.sfMemoData, 100, ctx)).toBe(100n)

      const buf = BUF.empty(16, 16)
      expect(slot(...buf.sbuf(), 100, ctx)).toBe(6n)

      const res = buf.get(memory)

      expect(res[0]).toBe(0x05)
      expect(res[1]).toBe(0xc0)
      expect(res[2]).toBe(0x01)
      expect(res[3]).toBe(0xca)
      expect(res[4]).toBe(0xfe)
      expect(res[5]).toBe(0x06)

      // override it and replace with element 0
      expect(slot_subarray(3, 0, 100, ctx)).toBe(100n)

      // check the value is correct
      expect(slot_subfield(100, fieldNamesMaps.sfMemoData, 100, ctx)).toBe(100n)

      expect(slot(...buf.sbuf(), 100, ctx)).toBe(6n)

      const res2 = buf.get(memory)
      expect(res2[0]).toBe(0x05)
      expect(res2[1]).toBe(0xc0)
      expect(res2[2]).toBe(0x01)
      expect(res2[3]).toBe(0xca)
      expect(res2[4]).toBe(0xfe)
      expect(res2[5]).toBe(0x00)

      // test slot exhaustion
      for (let i = 0; i < 250; ++i) {
        expect(slot_subarray(3, 0, 0, ctx)).toBeGreaterThan(0n)
      }

      expect(slot_subarray(3, 0, 0, ctx)).toBe(NO_FREE_SLOTS)
    })
  })

  describe('slot_subfield', () => {
    it('test', () => {
      const kl_sk = BUF.from(
        [
          0x00, 0x68, 0xb4, 0x97, 0x9a, 0x36, 0xcd, 0xc7, 0xf3, 0xd3, 0xd5,
          0xc3, 0x1a, 0x4e, 0xae, 0x2a, 0xc7, 0xd7, 0x20, 0x9d, 0xda, 0x87,
          0x75, 0x88, 0xb9, 0xaf, 0xc6, 0x67, 0x99, 0x69, 0x2a, 0xb0, 0xd6,
          0x6b,
        ],
        1,
        memory,
      )
      kl_sk.set(memory)
      ctx.ledgerData[
        kl_sk.value.slice(2, kl_sk.value.length).toString('hex').toUpperCase()
      ] = encode({
        Flags: 0,
        Hashes: [
          '02C63B876221859454CD00A816E84A245519C2B4D8EC3779B0792E13ACEB5EBC',
          '0B50C13744457A062AF8BCC248F16626607E7A432219A5FE35C3DC03D88FDDED',
          '978806E05606D531DD62F68CB99F659A3225C69F1BEBB37AF27C74E70A521C41',
          '5086DD2B44145B88EDF241B0ADD1FDB8F9C2FA2D63A99FACDC8C6D9B1391B5D3',
          '10EA902FF107D9A8B98B8F232761FB7914EE15FAD19C8440C2A6BF10E83838ED',
          '3A2235535AE5D18AA3B2C105F1F59F3D525615270F00CA52973821FFE5892254',
          'F288C5843D29F15C85EB31867AE5373BC47FAE850D22AEE7BFB3DC5A4FB764A0',
          'CFB626D57EB36C5F8F2C70157C0E406007941C11D7B26D43162A83777C780925',
          '21122ABF43EE4ECD2FD6984B6BAA52B7278C40F730839139A49D670362627D15',
        ],
        LastLedgerSequence: 11685539,
        LedgerEntryType: 'LedgerHashes',
        index:
          'B4979A36CDC7F3D3D5C31A4EAE2AC7D7209DDA877588B9AFC66799692AB0D66B',
      })
      expect(slot_subfield(1, 1, 1, ctx)).toBe(DOESNT_EXIST)

      expect(slot_set(...kl_sk.sbuf(), 1, ctx)).toBe(1n)

      expect(slot_size(1, ctx)).toBeGreaterThan(0n)

      expect(
        slot_subfield(1, fieldNamesMaps.sfLastLedgerSequence, 0, ctx),
      ).toBe(2n)

      expect(slot_size(2, ctx)).toBeGreaterThan(0n)
      expect(slot_size(1, ctx)).toBeGreaterThan(slot_size(2, ctx))

      expect(slot_subfield(1, fieldNamesMaps.sfHashes, 0, ctx)).toBe(3n)

      expect(slot_size(3, ctx)).toBeGreaterThan(0n)
      expect(slot_size(1, ctx)).toBeGreaterThan(slot_size(3, ctx))

      // request a field that is invalid
      expect(slot_subfield(1, 0xffffffff, 0, ctx)).toBe(INVALID_FIELD)

      // request a field that isn't present
      expect(slot_subfield(1, fieldNamesMaps.sfMemos, 0, ctx)).toBe(
        DOESNT_EXIST,
      )

      // request a subfield from something that's not an object
      expect(slot_subfield(3, fieldNamesMaps.sfMemoData, 0, ctx)).toBe(
        NOT_AN_OBJECT,
      )

      // overwrite an existing slot
      expect(
        slot_subfield(1, fieldNamesMaps.sfLastLedgerSequence, 3, ctx),
      ).toBe(3n)
      expect(slot_size(2, ctx)).toBe(slot_size(3, ctx))

      // test slot exhaustion
      for (let i = 0; i < 252; ++i) {
        expect(
          slot_subfield(1, fieldNamesMaps.sfLastLedgerSequence, 0, ctx),
        ).toBeGreaterThan(0n)
      }

      expect(
        slot_subfield(1, fieldNamesMaps.sfLastLedgerSequence, 0, ctx),
      ).toBe(NO_FREE_SLOTS)
    })
  })

  describe('slot_type', () => {
    it('test', () => {
      const kl_sk = BUF.from(
        [
          0x00, 0x68, 0xb4, 0x97, 0x9a, 0x36, 0xcd, 0xc7, 0xf3, 0xd3, 0xd5,
          0xc3, 0x1a, 0x4e, 0xae, 0x2a, 0xc7, 0xd7, 0x20, 0x9d, 0xda, 0x87,
          0x75, 0x88, 0xb9, 0xaf, 0xc6, 0x67, 0x99, 0x69, 0x2a, 0xb0, 0xd6,
          0x6b,
        ],
        1,
      )
      kl_sk.set(memory)
      ctx.otxnTxn = encode({
        TransactionType: 'Payment',
        Account: 'rGL6EbjBrCGYzK4vxsqdjYmNPyC6R8yWTk',
        Amount: '1000000',
        Destination: 'rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh',
        Fee: '1000000',
        Flags: 0,
      })
      ctx.ledgerData[
        kl_sk.value.slice(2, kl_sk.value.length).toString('hex').toUpperCase()
      ] = encode({
        Flags: 0,
        Hashes: [
          '02C63B876221859454CD00A816E84A245519C2B4D8EC3779B0792E13ACEB5EBC',
          '0B50C13744457A062AF8BCC248F16626607E7A432219A5FE35C3DC03D88FDDED',
          '978806E05606D531DD62F68CB99F659A3225C69F1BEBB37AF27C74E70A521C41',
          '5086DD2B44145B88EDF241B0ADD1FDB8F9C2FA2D63A99FACDC8C6D9B1391B5D3',
          '10EA902FF107D9A8B98B8F232761FB7914EE15FAD19C8440C2A6BF10E83838ED',
          '3A2235535AE5D18AA3B2C105F1F59F3D525615270F00CA52973821FFE5892254',
          'F288C5843D29F15C85EB31867AE5373BC47FAE850D22AEE7BFB3DC5A4FB764A0',
          'CFB626D57EB36C5F8F2C70157C0E406007941C11D7B26D43162A83777C780925',
          '21122ABF43EE4ECD2FD6984B6BAA52B7278C40F730839139A49D670362627D15',
        ],
        LastLedgerSequence: 11685539,
        LedgerEntryType: 'LedgerHashes',
        index:
          'B4979A36CDC7F3D3D5C31A4EAE2AC7D7209DDA877588B9AFC66799692AB0D66B',
      })

      expect(slot_type(1, 0, ctx)).toBe(DOESNT_EXIST)

      expect(slot_set(...kl_sk.sbuf(), 1, ctx)).toBe(1n)

      expect(slot_size(1, ctx)).toBeGreaterThan(0n)

      const sfLedgerEntryType = (10002 << 16) + 257
      expect(slot_type(1, 0, ctx)).toBe(BigInt(sfLedgerEntryType))

      expect(
        slot_subfield(1, fieldNamesMaps.sfLastLedgerSequence, 0, ctx),
      ).toBe(2n)

      expect(slot_size(2, ctx)).toBeGreaterThan(0n)

      expect(slot_size(1, ctx)).toBeGreaterThan(slot_size(2, ctx))

      expect(slot_type(2, 0, ctx)).toBe(
        BigInt(fieldNamesMaps.sfLastLedgerSequence),
      )

      expect(otxn_slot(3, ctx)).toBe(3n)

      const sfTransaction = (10001 << 16) + 257
      expect(slot_type(3, 0, ctx)).toBe(BigInt(sfTransaction))

      expect(slot_subfield(3, fieldNamesMaps.sfAmount, 4, ctx)).toBe(4n)

      // this will determine if the amount is native by returning 1 if it is
      expect(slot_type(4, 1, ctx)).toBe(1n)

      expect(slot_type(3, 1, ctx)).toBe(NOT_AN_AMOUNT)

      // there's a trustline between alice and bob
      // we can find alice and bob's addresses from otxn
      const addra = BUF.empty(20, 20)
      const addrb = BUF.empty(40, 20)
      expect(hook_account(...addra.sbuf(), ctx)).toBe(20n)
      expect(otxn_field(...addrb.sbuf(), fieldNamesMaps.sfAccount, ctx)).toBe(
        20n,
      )

      // build the keylet for the tl
      // uint8_t kl_tr[34];
      const kl_tr = BUF.empty(60, 34)
      const cur = BUF.from('USD', 100)
      cur.set(memory)
      const KEYLET_LINE = 9
      expect(
        util_keylet(
          ...kl_tr.sbuf(),
          KEYLET_LINE,
          ...addra.sbuf(),
          ...addrb.sbuf(),
          ...cur.sbuf(),
          ctx,
        ),
      ).toBe(34n)

      ctx.ledgerData[
        hashTrustline(
          encodeAccountID(Buffer.from(addra.get(memory))),
          encodeAccountID(Buffer.from(addrb.get(memory))),
          'USD',
        )
      ] = encode({
        LedgerEntryType: 'RippleState',
        Flags: 0,
        Balance: {
          currency: 'USD',
          issuer: 'rrrrrrrrrrrrrrrrrrrrrhoLvTp',
          value: '10000000000',
        },
        HighLimit: {
          currency: 'USD',
          issuer: 'rrrrrrrrrrrrrrrrrrrrrhoLvTp',
          value: '10000000000',
        },
        LowLimit: {
          currency: 'USD',
          issuer: 'rrrrrrrrrrrrrrrrrrrrrhoLvTp',
          value: '10000000000',
        },
        Owner: 'rrrrrrrrrrrrrrrrrrrrrhoLvTp',
        PreviousTxnID: '00'.repeat(32),
        PreviousTxnLgrSeq: 0,
        index: hashAccountRoot('rrrrrrrrrrrrrrrrrrrrrhoLvTp'),
      } as RippleState)

      // slot the ripplestate object
      expect(slot_set(...kl_tr.sbuf(), 5, ctx)).toBe(5n)

      // subfield into the high limit
      expect(slot_subfield(5, fieldNamesMaps.sfHighLimit, 6, ctx)).toBe(6n)

      // this is a non-native balance so we should get 0 back when testing the amount type
      expect(slot_type(6, 1, ctx)).toBe(0n)
    })
  })

  it.todo('xpop_slot', () => {
    xpop_slot(0, 0, ctx)
  })

  describe('slot_float', () => {
    it('test', () => {
      expect(otxn_slot(1, ctx)).toBe(1n)

      expect(slot_size(1, ctx)).toBeGreaterThan(0n)

      expect(slot_subfield(1, fieldNamesMaps.sfFee, 2, ctx)).toBe(2n)
      expect(slot_size(2, ctx)).toBeGreaterThan(0n)

      expect(slot_float(0, ctx)).toBe(DOESNT_EXIST)

      expect(slot_float(1, ctx)).toBe(NOT_AN_AMOUNT)

      const xfl = slot_float(2, ctx)
      expect(xfl).toBeGreaterThan(0n)

      expect(float_int(xfl, 6, 0, ctx)).toBe(1000000n)

      slot_float(0, ctx)
    })
  })
})
