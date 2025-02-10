# Wasm Hooks Testing Tool

## Usage

```ts
// prepare
const client = await TestClient.deploy('./test/index.wasm', {
  hookAccount: 'rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh',
  hookNamespace: '0000000000000000000000000000000000000000000000000000000000000000'
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
  Fee: '10',
})

// call hook
client.hook()

// check result
const result = client.getHookResult()
const states = client.getHookStates()
const emittedTxn = client.getEmittedTxn()
```

## Publish

```sh
pnpm build
pnpm publish
```
