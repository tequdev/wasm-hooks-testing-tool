import { convertStringToHex } from '@transia/xrpl'
import { TestClient } from '../src/testClient'

it('test', async () => {
  const client = await TestClient.deploy('./test/index.wasm', {
    hookAccount: 'rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh',
    hookNamespace: '00'.repeat(32),
  })
  client.setHookState(convertStringToHex('key'), convertStringToHex('value'))
  client.setHookParam([
    {
      HookParameter: {
        HookParameterName: convertStringToHex('NAME'),
        HookParameterValue: convertStringToHex('VALUE'),
      },
    },
  ])
  client.setTransaction({
    TransactionType: 'Payment',
    Account: 'rGL6EbjBrCGYzK4vxsqdjYmNPyC6R8yWTk',
    Amount: '1000000',
    Destination: 'rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh',
    Fee: '1000000',
    Flags: 0,
  })
  expect(client.hook()).not.toBeUndefined()
  const result = client.getHookResult()
  const states = client.getHookStates()
  const emittedTxn = client.getEmittedTxn()
})
