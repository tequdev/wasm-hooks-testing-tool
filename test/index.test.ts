import { convertStringToHex } from '@transia/xrpl'
import { TestContext } from '../src/testContext'

it('test', async () => {
  const ctx = await TestContext.deploy('./test/index.wasm')
  ctx.setHookAccount('rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh')
  ctx.setHookParam([
    {
      HookParameter: {
        HookParameterName: convertStringToHex('NAME'),
        HookParameterValue: convertStringToHex('VALUE'),
      },
    },
  ])
  ctx.setTransaction({
    TransactionType: 'Payment',
    Account: 'rGL6EbjBrCGYzK4vxsqdjYmNPyC6R8yWTk',
    Amount: '1000000',
    Destination: 'rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh',
    Fee: '1000000',
    Flags: 0,
  })
  expect(ctx.hook()).not.toBeUndefined()
})
