import { convertStringToHex, decodeAccountID } from '@transia/xrpl'
import {
  hook_account,
  state,
  state_foreign,
  state_foreign_set,
  state_set,
} from '../../../src/api'
import { HOOK_RETURN_CODE } from '../../../src/context/interface'
import { BUF, defaultContext } from '../tools'

const { OUT_OF_BOUNDS, INVALID_ARGUMENT, TOO_BIG, TOO_SMALL } = HOOK_RETURN_CODE

describe('state', () => {
  const memory = new Uint8Array(1024)
  let ctx = defaultContext(memory)
  beforeEach(() => {
    memory.fill(0)
    ctx = defaultContext(memory)
  })

  describe('state', () => {
    const key = BUF.from('key', 0)
    const key2 = BUF.from('key2', 100)
    const content = BUF.from('content', 200)
    const content2 = BUF.from('content2', 300)
    beforeEach(() => {
      key.set(memory)
      key2.set(memory)
      content.set(memory)
      content2.set(memory)
      expect(state_set(...content.sbuf(), ...key.sbuf(), ctx)).toBe(
        BigInt(content.len),
      )
      expect(state_set(...content2.sbuf(), ...key2.sbuf(), ctx)).toBe(
        BigInt(content2.len),
      )
    })
    it('Test out of bounds check', () => {
      expect(state(1000000, 32, 0, 32, ctx)).toBe(OUT_OF_BOUNDS)
      expect(state(0, 1000000, 0, 32, ctx)).toBe(OUT_OF_BOUNDS)
      expect(state(0, 32, 1000000, 32, ctx)).toBe(OUT_OF_BOUNDS)
      expect(state(0, 32, 0, 1000000, ctx)).toBe(TOO_BIG)
    })
    it('read state back', () => {
      const contentBuf = BUF.empty(400, content.len)
      const content2Buf = BUF.empty(500, content2.len)
      expect(state(...contentBuf.sbuf(), ...key.sbuf(), ctx)).toBe(
        BigInt(content.len),
      )
      expect(state(...content2Buf.sbuf(), ...key2.sbuf(), ctx)).toBe(
        BigInt(content2.len),
      )
      const buf1 = contentBuf.get(memory)
      const buf2 = content2Buf.get(memory)
      expect(buf1).toEqual(new Uint8Array(content.value))
      expect(buf2).toEqual(new Uint8Array(content2.value))
    })
    it.todo('read small state back as int64')
  })

  describe('state_set', () => {
    describe('first hook will set two state objects with different keys and data on alice', () => {
      const data2 = BUF.from(
        [
          0x23, 0x13, 0x96, 0x68, 0x78, 0xdc, 0xab, 0xc4, 0x40, 0x26, 0x07,
          0x2b, 0xa3, 0xd2, 0x0c, 0x69, 0x40, 0xdd, 0xcd, 0xe7, 0x38, 0x9b,
          0x0b, 0xa9, 0x6c, 0x3c, 0xb3, 0x87, 0x37, 0x02, 0x81, 0xe8, 0x2b,
          0xdd, 0x5d, 0xbb, 0x40, 0xd9, 0x66, 0x96, 0x6f, 0xc1, 0x6b, 0xe8,
          0xd4, 0x7c, 0x7b, 0x62, 0x14, 0x4c, 0xd1, 0x4b, 0xaa, 0x99, 0x36,
          0x75, 0xe9, 0x22, 0xad, 0x0f, 0x5f, 0x94, 0x1d, 0x86, 0xeb, 0xa8,
          0x13, 0x99, 0xf9, 0x98, 0xff, 0xca, 0x5b, 0x86, 0x2f, 0xdf, 0x67,
          0x8f, 0xe2, 0xe3, 0xc3, 0x37, 0xcc, 0x47, 0x0f, 0x33, 0x88, 0xb0,
          0x33, 0x3b, 0x02, 0x55, 0x67, 0x16, 0xa4, 0xfb, 0x8e, 0x85, 0x6f,
          0xd8, 0x84, 0x16, 0xa3, 0x54, 0x18, 0x34, 0x06, 0x0e, 0xf6, 0x65,
          0x34, 0x05, 0x26, 0x7e, 0x05, 0x74, 0xda, 0x09, 0xbf, 0x55, 0x8c,
          0x75, 0x92, 0xac, 0x33, 0xfb, 0x01, 0x8d,
        ],
        200,
      )
      it('bounds and buffer size checks', () => {
        expect(state_set(0, 0, 0, 0, ctx)).toBe(TOO_SMALL)
        expect(state_set(0, 0, 0, 33, ctx)).toBe(TOO_BIG)
        expect(state_set(0, 0, 0, 1000000, ctx)).toBe(TOO_BIG)
        expect(state_set(0, 0, 1000000, 1, ctx)).toBe(OUT_OF_BOUNDS)
        expect(state_set(0, 1000000, 0, 32, ctx)).toBe(OUT_OF_BOUNDS)
        expect(state_set(1000000, 0, 0, 32, ctx)).toBe(OUT_OF_BOUNDS)
        expect(state_set(0, 257, 0, 32, ctx)).toBe(TOO_BIG)
      })
      it('create state 1', () => {
        const key = BUF.from(new Uint8Array(32).fill(0), 0)
        const data = BUF.from(Uint8Array.from([0xca, 0xfe, 0xba, 0xbe]), 100)
        key.set(memory)
        data.set(memory)
        expect(state_set(...data.sbuf(), ...key.sbuf(), ctx)).toBe(BigInt(4))
      })
      it('create state 2', () => {
        const key = BUF.from(Uint8Array.from([1, 2, 3]), 0)
        key.set(memory)
        data2.set(memory)
        expect(state_set(...data2.sbuf(), ...key.sbuf(), ctx)).toBe(
          BigInt(data2.len),
        )
        const accHex = decodeAccountID(ctx.hookAccount).toString('hex')
        const nsHex = Buffer.from(ctx.hookNamespace, 'hex').toString('hex')
        const hexKey = Buffer.from(key.value).toString('hex').padStart(64, '0')
        expect(ctx.hookState[accHex][nsHex][hexKey]).toEqual(
          Buffer.from(data2.value).toString('hex'),
        )
      })
    })

    describe('update existing state and delete an existing state', () => {
      const key = BUF.from(Uint8Array.from([1, 2, 3]), 0)
      beforeEach(() => {
        const data = BUF.from(Uint8Array.from([0xca, 0xfe, 0xba, 0xbe]), 100)
        key.set(memory)
        data.set(memory)
        expect(state_set(...data.sbuf(), ...key.sbuf(), ctx)).toBe(
          BigInt(data.len),
        )
      })
      it('update existing state', () => {
        const data2 = BUF.from(
          Uint8Array.from([0xca, 0xfe, 0xba, 0xbe, 0xca, 0xfe, 0xba, 0xbe]),
          200,
        )
        data2.set(memory)
        expect(state_set(...data2.sbuf(), ...key.sbuf(), ctx)).toBe(
          BigInt(data2.len),
        )

        const accHex = decodeAccountID(ctx.hookAccount).toString('hex')
        const nsHex = Buffer.from(ctx.hookNamespace, 'hex').toString('hex')
        const hexKey = Buffer.from(key.value).toString('hex').padStart(64, '0')
        expect(ctx.hookState[accHex][nsHex][hexKey]).toEqual(
          Buffer.from(data2.value).toString('hex'),
        )
      })
      it('delete existing state', () => {
        expect(state_set(0, 0, 0, key.len, ctx)).toBe(BigInt(0))
        const accHex = decodeAccountID(ctx.hookAccount).toString('hex')
        const nsHex = Buffer.from(ctx.hookNamespace, 'hex').toString('hex')
        const hexKey = Buffer.from(key.value).toString('hex').padStart(64, '0')
        expect(ctx.hookState[accHex]).toBeUndefined()
      })
    })
    describe.todo('check reserve exhaustion', () => {})
    describe.todo('check state can be set on emit callback', () => {})
    describe.todo(
      'check namespacing provides for non-collision of same key',
      () => {},
    )
  })

  describe('state_foreign', () => {
    const key = BUF.from('key', 0)
    const content = BUF.from('content', 200)
    const ns = BUF.empty(400, 32)
    const acc = BUF.empty(100, 20)
    const key2 = BUF.from('key2', 50)
    const content2 = BUF.from('content2', 300)
    beforeEach(() => {
      key.set(memory)
      key2.set(memory)
      expect(state_set(...content.sbuf(), ...key.sbuf(), ctx)).toBe(
        BigInt(content.len),
      )
      ns.value[9] = 0xab

      hook_account(...acc.sbuf(), ctx)

      content.set(memory)
      content2.set(memory)
      ns.set(memory)
      expect(
        state_foreign_set(
          ...content2.sbuf(),
          ...key2.sbuf(),
          ...ns.sbuf(),
          ...acc.sbuf(),
          ctx,
        ),
      ).toBe(BigInt(content2.len))
      // exist on state
      const accHex = Buffer.from(acc.value).toString('hex')
      const nsHex = Buffer.from(ns.value).toString('hex')
      const key2Hex = Buffer.from(key2.value).toString('hex').padStart(64, '0')
      expect(ctx.hookState[accHex][nsHex][key2Hex]).toEqual(
        Buffer.from(content2.value).toString('hex'),
      )
    })
    it('Test out of bounds check', () => {
      expect(state_foreign(1111111, 32, 1, 32, 1, 32, 1, 20, ctx)).toBe(
        OUT_OF_BOUNDS,
      )
      expect(state_foreign(1, 1111111, 1, 32, 1, 32, 1, 20, ctx)).toBe(
        OUT_OF_BOUNDS,
      )
      expect(state_foreign(1, 32, 1111111, 32, 1, 32, 1, 20, ctx)).toBe(
        OUT_OF_BOUNDS,
      )
      expect(state_foreign(1, 32, 1, 1111111, 1, 32, 1, 20, ctx)).toBe(TOO_BIG)
      expect(state_foreign(1, 32, 1, 32, 1111111, 32, 1, 20, ctx)).toBe(
        OUT_OF_BOUNDS,
      )
      expect(state_foreign(1, 32, 1, 32, 1, 1111111, 1, 20, ctx)).toBe(
        INVALID_ARGUMENT,
      )
      expect(state_foreign(1, 32, 1, 32, 1, 32, 1111111, 20, ctx)).toBe(
        OUT_OF_BOUNDS,
      )
      expect(state_foreign(1, 32, 1, 32, 1, 32, 1, 1111111, ctx)).toBe(
        INVALID_ARGUMENT,
      )
    })
    it('')
  })

  describe('state_foreign_set', () => {
    it('bounds tests', () => {
      expect(state_foreign_set(1111111, 32, 1, 32, 1, 32, 1, 20, ctx)).toBe(
        OUT_OF_BOUNDS,
      )
      expect(state_foreign_set(1, 1111111, 1, 32, 1, 32, 1, 20, ctx)).toBe(
        OUT_OF_BOUNDS,
      )
      expect(state_foreign_set(1, 32, 1111111, 32, 1, 32, 1, 20, ctx)).toBe(
        OUT_OF_BOUNDS,
      )
      expect(state_foreign_set(1, 32, 1, 1111111, 1, 32, 1, 20, ctx)).toBe(
        TOO_BIG,
      )
      expect(state_foreign_set(1, 32, 1, 32, 1111111, 32, 1, 20, ctx)).toBe(
        OUT_OF_BOUNDS,
      )
      expect(state_foreign_set(1, 32, 1, 32, 1, 1111111, 1, 20, ctx)).toBe(
        INVALID_ARGUMENT,
      )
      expect(state_foreign_set(1, 32, 1, 32, 1, 32, 1111111, 20, ctx)).toBe(
        OUT_OF_BOUNDS,
      )
      expect(state_foreign_set(1, 32, 1, 32, 1, 32, 1, 1111111, ctx)).toBe(
        INVALID_ARGUMENT,
      )
    })
    it.todo('grant')
  })
})
