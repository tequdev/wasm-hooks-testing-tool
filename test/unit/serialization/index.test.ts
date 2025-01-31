import {
  sto_emplace,
  sto_erase,
  sto_subarray,
  sto_subfield,
  sto_validate,
} from '../../../src/api'
import { HOOK_RETURN_CODE } from '../../../src/context/interface'
import { BUF, defaultContext } from '../tools'

const { OUT_OF_BOUNDS, TOO_SMALL, DOESNT_EXIST, TOO_BIG, MEM_OVERLAP } =
  HOOK_RETURN_CODE

describe('serialization', () => {
  const memory = new Uint8Array(1024 * 100)
  let ctx = defaultContext(memory)
  beforeEach(() => {
    memory.fill(0)
    ctx = defaultContext(memory)
  })
  describe('sto_subfield', () => {
    const sto = [
      0x11, 0x00, 0x53, 0x22, 0x00, 0x00, 0x00, 0x00, 0x25, 0x01, 0x52, 0x70,
      0x1a, 0x20, 0x23, 0x00, 0x00, 0x00, 0x02, 0x20, 0x26, 0x00, 0x00, 0x00,
      0x00, 0x34, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x55, 0x09,
      0xa9, 0xc8, 0x6b, 0xf2, 0x06, 0x95, 0x73, 0x5a, 0xb0, 0x36, 0x20, 0xeb,
      0x1c, 0x32, 0x60, 0x66, 0x35, 0xac, 0x3d, 0xa0, 0xb7, 0x02, 0x82, 0xf3,
      0x7c, 0x67, 0x4f, 0xc8, 0x89, 0xef, 0xe7,
    ]

    it('Test out of bounds check', () => {
      expect(sto_subfield(1000000, 32, 1, ctx)).toBe(OUT_OF_BOUNDS)
      expect(sto_subfield(0, 1000000, 1, ctx)).toBe(OUT_OF_BOUNDS)
    })
    it('Test size check', () => {
      expect(sto_subfield(0, 1, 1, ctx)).toBe(TOO_SMALL)
    })
    it('Test subfield 0x11, should be position 0 length 3, payload pos 1, len 2', () => {
      const stoBuf = BUF.from(sto, 100)
      stoBuf.set(memory)
      expect(sto_subfield(...stoBuf.sbuf(), 0x10001, ctx)).toBe(
        (1n << 32n) + 2n,
      )
    })
    it('Test subfield 0x22, should be position 3 length 5, payload pos 4, len 4', () => {
      const stoBuf = BUF.from(sto, 100)
      stoBuf.set(memory)
      expect(sto_subfield(...stoBuf.sbuf(), 0x20002, ctx)).toBe(
        (4n << 32n) + 4n,
      )
    })
    it('Test subfield 0x34, should be at position 25, length = 9, payload pos 26, len 8', () => {
      const stoBuf = BUF.from(sto, 100)
      stoBuf.set(memory)
      expect(sto_subfield(...stoBuf.sbuf(), 0x30004, ctx)).toBe(
        (26n << 32n) + 8n,
      )
    })
    it('Test final subfield, position 34, length 33, payload pos 35, len 32', () => {
      const stoBuf = BUF.from(sto, 100)
      stoBuf.set(memory)
      expect(sto_subfield(...stoBuf.sbuf(), 0x50005, ctx)).toBe(
        (35n << 32n) + 32n,
      )
    })
    it('Test not found', () => {
      const stoBuf = BUF.from(sto, 100)
      stoBuf.set(memory)
      expect(sto_subfield(...stoBuf.sbuf(), 0x90009, ctx)).toBe(DOESNT_EXIST)
    })
  })

  describe('sto_subarray', () => {
    const sto = [
      0xf4, 0xeb, 0x13, 0x00, 0x01, 0x81, 0x14, 0x20, 0x42, 0x88, 0xd2, 0xe4,
      0x7f, 0x8e, 0xf6, 0xc9, 0x9b, 0xcc, 0x45, 0x79, 0x66, 0x32, 0x0d, 0x12,
      0x40, 0x97, 0x11, 0xe1, 0xeb, 0x13, 0x00, 0x01, 0x81, 0x14, 0x3e, 0x9d,
      0x4a, 0x2b, 0x8a, 0xa0, 0x78, 0x0f, 0x68, 0x2d, 0x13, 0x6f, 0x7a, 0x56,
      0xd6, 0x72, 0x4e, 0xf5, 0x37, 0x54, 0xe1, 0xf1,
    ]
    it('Test out of bounds check', () => {
      expect(sto_subarray(1000000, 32, 1, ctx)).toBe(OUT_OF_BOUNDS)
      expect(sto_subarray(0, 1000000, 1, ctx)).toBe(OUT_OF_BOUNDS)
    })
    it('Test size check', () => {
      expect(sto_subarray(0, 1, 1, ctx)).toBe(TOO_SMALL)
    })
    it('Test index 0, should be position 1 length 27', () => {
      const stoBuf = BUF.from(sto, 100)
      stoBuf.set(memory)
      expect(sto_subarray(...stoBuf.sbuf(), 0, ctx)).toBe((1n << 32n) + 27n)
    })
    it('Test index 1, should be position 28 length 27', () => {
      const stoBuf = BUF.from(sto, 100)
      stoBuf.set(memory)
      expect(sto_subarray(...stoBuf.sbuf(), 1, ctx)).toBe((28n << 32n) + 27n)
    })
    it("Test index2, doesn't exist", () => {
      const stoBuf = BUF.from(sto, 100)
      stoBuf.set(memory)
      expect(sto_subarray(...stoBuf.sbuf(), 2, ctx)).toBe(DOESNT_EXIST)
    })
  })

  describe('sto_emplace', () => {
    const sto = [
      0x11, 0x00, 0x61, 0x22, 0x00, 0x00, 0x00, 0x00, 0x24, 0x04, 0x1f, 0x94,
      0xd9, 0x25, 0x04, 0x5e, 0x84, 0xb7, 0x2d, 0x00, 0x00, 0x00, 0x00, 0x55,
      0x13, 0x40, 0xb3, 0x25, 0x86, 0x31, 0x96, 0xb5, 0x6f, 0x41, 0xf5, 0x89,
      0xeb, 0x7d, 0x2f, 0xd9, 0x4c, 0x0d, 0x7d, 0xb8, 0x0e, 0x4b, 0x2c, 0x67,
      0xa7, 0x78, 0x2a, 0xd6, 0xc2, 0xb0, 0x77, 0x50, 0x62, 0x40, 0x00, 0x00,
      0x00, 0x00, 0xa4, 0x79, 0x94, 0x81, 0x14, 0x37, 0xdf, 0x44, 0x07, 0xe7,
      0xaa, 0x07, 0xf1, 0xd5, 0xc9, 0x91, 0xf2, 0xd3, 0x6f, 0x9e, 0xb8, 0xc7,
      0x34, 0xaf, 0x6c,
    ]

    const ins = [
      0x56, 0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x11,
      0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x11,
      0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x11,
    ]

    const ans = [
      0x11, 0x00, 0x61, 0x22, 0x00, 0x00, 0x00, 0x00, 0x24, 0x04, 0x1f, 0x94,
      0xd9, 0x25, 0x04, 0x5e, 0x84, 0xb7, 0x2d, 0x00, 0x00, 0x00, 0x00, 0x55,
      0x13, 0x40, 0xb3, 0x25, 0x86, 0x31, 0x96, 0xb5, 0x6f, 0x41, 0xf5, 0x89,
      0xeb, 0x7d, 0x2f, 0xd9, 0x4c, 0x0d, 0x7d, 0xb8, 0x0e, 0x4b, 0x2c, 0x67,
      0xa7, 0x78, 0x2a, 0xd6, 0xc2, 0xb0, 0x77, 0x50, 0x56, 0x11, 0x11, 0x11,
      0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x11,
      0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x11,
      0x11, 0x11, 0x11, 0x11, 0x11, 0x62, 0x40, 0x00, 0x00, 0x00, 0x00, 0xa4,
      0x79, 0x94, 0x81, 0x14, 0x37, 0xdf, 0x44, 0x07, 0xe7, 0xaa, 0x07, 0xf1,
      0xd5, 0xc9, 0x91, 0xf2, 0xd3, 0x6f, 0x9e, 0xb8, 0xc7, 0x34, 0xaf, 0x6c,
    ]

    const ans2 = [
      0x11, 0x00, 0x61, 0x22, 0x00, 0x00, 0x00, 0x00, 0x24, 0x04, 0x1f, 0x94,
      0xd9, 0x25, 0x04, 0x5e, 0x84, 0xb7, 0x2d, 0x00, 0x00, 0x00, 0x00, 0x54,
      0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x11,
      0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x11,
      0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x55, 0x13, 0x40, 0xb3,
      0x25, 0x86, 0x31, 0x96, 0xb5, 0x6f, 0x41, 0xf5, 0x89, 0xeb, 0x7d, 0x2f,
      0xd9, 0x4c, 0x0d, 0x7d, 0xb8, 0x0e, 0x4b, 0x2c, 0x67, 0xa7, 0x78, 0x2a,
      0xd6, 0xc2, 0xb0, 0x77, 0x50, 0x62, 0x40, 0x00, 0x00, 0x00, 0x00, 0xa4,
      0x79, 0x94, 0x81, 0x14, 0x37, 0xdf, 0x44, 0x07, 0xe7, 0xaa, 0x07, 0xf1,
      0xd5, 0xc9, 0x91, 0xf2, 0xd3, 0x6f, 0x9e, 0xb8, 0xc7, 0x34, 0xaf, 0x6c,
    ]
    it('Test out of bounds check', () => {
      expect(sto_emplace(1000000, 32, 0, 32, 32, 32, 1, ctx)).toBe(
        OUT_OF_BOUNDS,
      )
      expect(sto_emplace(0, 1000000, 0, 32, 32, 32, 1, ctx)).toBe(OUT_OF_BOUNDS)
      expect(sto_emplace(0, 32, 1000000, 32, 32, 32, 1, ctx)).toBe(
        OUT_OF_BOUNDS,
      )
      expect(sto_emplace(0, 32, 64, 1000000, 32, 32, 1, ctx)).toBe(
        OUT_OF_BOUNDS,
      )
      expect(sto_emplace(0, 32, 64, 32, 1000000, 32, 1, ctx)).toBe(
        OUT_OF_BOUNDS,
      )
      expect(sto_emplace(0, 32, 64, 32, 0, 1000000, 1, ctx)).toBe(OUT_OF_BOUNDS)
    })
    it('Test size check', () => {
      // write buffer too small
      expect(sto_emplace(0, 1, 0, 2, 0, 2, 1, ctx)).toBe(TOO_SMALL)
      // src buffer too small
      expect(sto_emplace(0, 3, 0, 1, 0, 2, 1, ctx)).toBe(TOO_SMALL)
      // field buffer too small
      expect(sto_emplace(0, 3, 0, 2, 0, 1, 1, ctx)).toBe(TOO_SMALL)
      // field buffer too big
      expect(sto_emplace(6000, 32000, 0, 5, 5, 6000, 1, ctx)).toBe(TOO_BIG)
      // src buffer too big
      expect(sto_emplace(0, 32000, 32000, 17000, 49000, 4000, 1, ctx)).toBe(
        TOO_BIG,
      )
    })
    it('Test overlapping memory', () => {
      const buf = BUF.empty(100, 1024)
      expect(
        sto_emplace(buf.ptr, buf.len, buf.ptr + 1, 512, 0, 32, 1, ctx),
      ).toBe(MEM_OVERLAP)
      expect(
        sto_emplace(buf.ptr + 1, buf.len, buf.ptr, 512, 0, 32, 1, ctx),
      ).toBe(MEM_OVERLAP)
      expect(sto_emplace(0, 700, buf.ptr, 512, buf.ptr + 1, 32, 1, ctx)).toBe(
        MEM_OVERLAP,
      )
    })
    it('', () => {
      const buf = BUF.empty(100, 1024)
      const stoBuf = BUF.from(sto, 2000)
      stoBuf.set(memory)
      const insBuf = BUF.from(ins, 3000)
      insBuf.set(memory)
      expect(
        sto_emplace(
          ...buf.sbuf(),
          ...stoBuf.sbuf(),
          ...insBuf.sbuf(),
          0x50006,
          ctx,
        ),
      ).toBe(BigInt(stoBuf.len + insBuf.len))

      // flip it to 54 and check it is installed before
      insBuf.value[0] = 0x54
      insBuf.set(memory)
      expect(
        sto_emplace(
          ...buf.sbuf(),
          ...stoBuf.sbuf(),
          ...insBuf.sbuf(),
          0x50004,
          ctx,
        ),
      ).toBe(BigInt(stoBuf.len + insBuf.len))

      for (let i = 0; i < ans2.length; ++i) {
        expect(ans2[i]).toBe(buf.get(memory)[i])
      }
    })
    it('test front insertion', () => {
      const buf = BUF.empty(100, 1024)
      const stoBuf = BUF.from([0x22, 0x00, 0x00, 0x00, 0x00], 2000)
      const insBuf = BUF.from([0x11, 0x11, 0x11], 3000)
      stoBuf.set(memory)
      insBuf.set(memory)

      expect(
        sto_emplace(
          ...buf.sbuf(),
          ...stoBuf.sbuf(),
          ...insBuf.sbuf(),
          0x10001,
          ctx,
        ),
      ).toBe(BigInt(stoBuf.len + insBuf.len))
      const ans = [0x11, 0x11, 0x11, 0x22, 0x00, 0x00, 0x00, 0x00]
      for (let i = 0; i < ans.length; ++i)
        expect(ans[i]).toBe(buf.get(memory)[i])
    })
    it('test back insertion', () => {
      const buf = BUF.empty(100, 1024)
      const sto = BUF.from([0x22, 0x00, 0x00, 0x00, 0x00], 2000)
      const ins = BUF.from(
        [0x31, 0x11, 0x11, 0x11, 0x11, 0x12, 0x22, 0x22, 0x22],
        3000,
      )
      sto.set(memory)
      ins.set(memory)
      expect(
        sto_emplace(...buf.sbuf(), ...sto.sbuf(), ...ins.sbuf(), 0x30001, ctx),
      ).toBe(BigInt(sto.len + ins.len))

      const ans = [
        0x22, 0x00, 0x00, 0x00, 0x00, 0x31, 0x11, 0x11, 0x11, 0x11, 0x12, 0x22,
        0x22, 0x22,
      ]
      for (let i = 0; i < ans.length; ++i)
        expect(ans[i]).toBe(buf.get(memory)[i])
    })
    it('test replacement', () => {
      const buf = BUF.empty(100, 1024)
      const rep = BUF.from([0x22, 0x10, 0x20, 0x30, 0x40], 2000)
      const stoBuf = BUF.from(sto, 3000)
      stoBuf.set(memory)
      rep.set(memory)
      expect(
        sto_emplace(
          ...buf.sbuf(),
          ...stoBuf.sbuf(),
          ...rep.sbuf(),
          0x20002,
          ctx,
        ),
      ).toBe(BigInt(stoBuf.len))

      // check start
      expect(buf.get(memory)[0]).toBe(stoBuf.get(memory)[0])
      expect(buf.get(memory)[1]).toBe(stoBuf.get(memory)[1])
      expect(buf.get(memory)[2]).toBe(stoBuf.get(memory)[2])

      // check replaced part
      for (let i = 3; i < rep.len + 3; ++i)
        expect(buf.get(memory)[i]).toBe(rep.get(memory)[i - 3])

      // check end
      for (let i = rep.len + 3; i < stoBuf.len; ++i)
        expect(stoBuf.get(memory)[i]).toBe(buf.get(memory)[i])
    })
  })

  describe('sto_erase', () => {
    const sto = [
      0x11, 0x00, 0x61, 0x22, 0x00, 0x00, 0x00, 0x00, 0x24, 0x04, 0x1f, 0x94,
      0xd9, 0x25, 0x04, 0x5e, 0x84, 0xb7, 0x2d, 0x00, 0x00, 0x00, 0x00, 0x55,
      0x13, 0x40, 0xb3, 0x25, 0x86, 0x31, 0x96, 0xb5, 0x6f, 0x41, 0xf5, 0x89,
      0xeb, 0x7d, 0x2f, 0xd9, 0x4c, 0x0d, 0x7d, 0xb8, 0x0e, 0x4b, 0x2c, 0x67,
      0xa7, 0x78, 0x2a, 0xd6, 0xc2, 0xb0, 0x77, 0x50, 0x62, 0x40, 0x00, 0x00,
      0x00, 0x00, 0xa4, 0x79, 0x94, 0x81, 0x14, 0x37, 0xdf, 0x44, 0x07, 0xe7,
      0xaa, 0x07, 0xf1, 0xd5, 0xc9, 0x91, 0xf2, 0xd3, 0x6f, 0x9e, 0xb8, 0xc7,
      0x34, 0xaf, 0x6c,
    ]
    it('test out of bounds check', () => {
      expect(sto_erase(1000000, 32, 0, 32, 1, ctx)).toBe(OUT_OF_BOUNDS)
      expect(sto_erase(0, 1000000, 0, 32, 1, ctx)).toBe(OUT_OF_BOUNDS)
      expect(sto_erase(0, 32, 1000000, 32, 1, ctx)).toBe(OUT_OF_BOUNDS)
      expect(sto_erase(0, 32, 64, 1000000, 1, ctx)).toBe(OUT_OF_BOUNDS)
    })
    it('test size check', () => {
      // write buffer too small
      expect(sto_erase(0, 1, 0, 2, 1, ctx)).toBe(TOO_SMALL)
      expect(sto_erase(0, 32000, 0, 17000, 1, ctx)).toBe(TOO_BIG)
    })
    it('Test overlapping memory', () => {
      const buf = BUF.empty(100, 1024)
      buf.set(memory)
      expect(sto_erase(buf.ptr, buf.len, buf.ptr + 1, 512, 1, ctx)).toBe(
        MEM_OVERLAP,
      )
      expect(sto_erase(buf.ptr + 1, buf.len, buf.ptr, 512, 1, ctx)).toBe(
        MEM_OVERLAP,
      )
    })
    it('erase field 22', () => {
      const buf = BUF.empty(100, 1024)
      const stoBuf = BUF.from(sto, 3000)
      stoBuf.set(memory)
      expect(sto_erase(...buf.sbuf(), ...stoBuf.sbuf(), 0x20002, ctx)).toBe(
        BigInt(stoBuf.len - 5),
      )
      for (let i = 3; i < stoBuf.len - 5; ++i)
        expect(stoBuf.get(memory)[i + 5]).toBe(buf.get(memory)[i])
    })
    it('test front erasure', () => {
      const buf = BUF.empty(100, 1024)
      const stoBuf = BUF.from(sto, 3000)
      stoBuf.set(memory)
      expect(sto_erase(...buf.sbuf(), ...stoBuf.sbuf(), 0x10001, ctx)).toBe(
        BigInt(stoBuf.len - 3),
      )
      for (let i = 3; i < stoBuf.len - 3; ++i)
        expect(stoBuf.get(memory)[i]).toBe(buf.get(memory)[i - 3])
    })
    it('test back erasure', () => {
      const buf = BUF.empty(100, 1024)
      const stoBuf = BUF.from(sto, 3000)
      stoBuf.set(memory)
      expect(sto_erase(...buf.sbuf(), ...stoBuf.sbuf(), 0x80001, ctx)).toBe(
        BigInt(stoBuf.len - 22),
      )
      for (let i = 0; i < stoBuf.len - 22; ++i)
        expect(stoBuf.get(memory)[i]).toBe(buf.get(memory)[i])
    })
    it('test not found', () => {
      const buf = BUF.empty(100, 1024)
      const stoBuf = BUF.from(sto, 3000)
      stoBuf.set(memory)
      expect(sto_erase(...buf.sbuf(), ...stoBuf.sbuf(), 0x80002, ctx)).toBe(
        DOESNT_EXIST,
      )
      for (let i = 0; i < stoBuf.len; ++i)
        expect(stoBuf.get(memory)[i]).toBe(buf.get(memory)[i])
    })
    it('test total erasure', () => {
      const buf = BUF.empty(100, 1024)
      const rep = BUF.from([0x22, 0x10, 0x20, 0x30, 0x40], 3000)
      rep.set(memory)
      expect(sto_erase(...buf.sbuf(), ...rep.sbuf(), 0x20002, ctx)).toBe(
        BigInt(0),
      )
    })
  })

  describe('sto_validate', () => {
    const sto = [
      0x11, 0x00, 0x61, 0x22, 0x00, 0x00, 0x00, 0x00, 0x24, 0x04, 0x1f, 0x94,
      0xd9, 0x25, 0x04, 0x5e, 0x84, 0xb7, 0x2d, 0x00, 0x00, 0x00, 0x00, 0x55,
      0x13, 0x40, 0xb3, 0x25, 0x86, 0x31, 0x96, 0xb5, 0x6f, 0x41, 0xf5, 0x89,
      0xeb, 0x7d, 0x2f, 0xd9, 0x4c, 0x0d, 0x7d, 0xb8, 0x0e, 0x4b, 0x2c, 0x67,
      0xa7, 0x78, 0x2a, 0xd6, 0xc2, 0xb0, 0x77, 0x50, 0x62, 0x40, 0x00, 0x00,
      0x00, 0x00, 0xa4, 0x79, 0x94, 0x81, 0x14, 0x37, 0xdf, 0x44, 0x07, 0xe7,
      0xaa, 0x07, 0xf1, 0xd5, 0xc9, 0x91, 0xf2, 0xd3, 0x6f, 0x9e, 0xb8, 0xc7,
      0x34, 0xaf, 0x6c,
    ]
    it('test out of bounds check', () => {
      expect(sto_validate(1000000, 32, ctx)).toBe(OUT_OF_BOUNDS)
      expect(sto_validate(0, 1000000, ctx)).toBe(OUT_OF_BOUNDS)
    })
    it('Test size check', () => {
      expect(sto_validate(0, 1, ctx)).toBe(TOO_SMALL)
    })
    it('Test validation', () => {
      const stoBuf = BUF.from(sto, 3000)
      stoBuf.set(memory)
      expect(sto_validate(...stoBuf.sbuf(), ctx)).toBe(1n)
    })
    it('Invalidate', () => {
      const stoBuf = BUF.from(sto, 3000)
      stoBuf.value[0] = 0x22
      stoBuf.set(memory)
      expect(sto_validate(...stoBuf.sbuf(), ctx)).toBe(0n)
    })
    it('Invalidate somewhere else', () => {
      const stoBuf = BUF.from(sto, 3000)
      stoBuf.value[3] = 0x40
      stoBuf.set(memory)
      expect(sto_validate(...stoBuf.sbuf(), ctx)).toBe(0n)
    })
    it('test small validation', () => {
      const stoBuf = BUF.from([0x22, 0x00, 0x00, 0x00, 0x00], 3000)
      stoBuf.set(memory)
      expect(sto_validate(...stoBuf.sbuf(), ctx)).toBe(1n)
    })
  })
})
