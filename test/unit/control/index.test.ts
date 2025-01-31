import { accept, rollback } from '../../../src/api'

describe.todo('control', () => {
  it('accept', () => {
    accept(0, 0, 0n, {} as any)
  })

  it('rollback', () => {
    rollback(0, 0, 0n, {} as any)
  })

  it.todo('_g', () => {
    // _g(0, 0)
  })
})
