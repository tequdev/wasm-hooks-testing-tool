import { createHash } from 'node:crypto'
import { type Transaction, decode, encode, validate } from '@transia/xrpl'
import { hashTx } from '@transia/xrpl/dist/npm/utils/hashes'
import { HOOK_RETURN_CODE } from '../../context/interface'
import { ledger_seq } from '../ledger'
import { otxn_generation } from '../otxn'
import type { APITestWrapper } from '../test_utils'

const {
  PREREQUISITE_NOT_MET,
  FEE_TOO_LARGE,
  TOO_SMALL,
  INTERNAL_ERROR,
  TOO_MANY_NONCES,
  TOO_BIG,
  TOO_MANY_EMITTED_TXN,
  ALREADY_SET,
  OUT_OF_BOUNDS,
  EMISSION_FAILURE,
} = HOOK_RETURN_CODE

export interface EtxnAPI {
  etxn_burden: () => bigint
  etxn_details: (write_ptr: number, write_len: number) => bigint
  etxn_fee_base: (write_ptr: number, write_len: number) => bigint
  etxn_nonce: (write_ptr: number, write_len: number) => bigint
  etxn_reserve: (count: number) => bigint
  etxn_generation: () => bigint
  emit: (
    write_ptr: number,
    write_len: number,
    read_ptr: number,
    read_len: number,
  ) => bigint
}

// Maximum number of emitted transactions
const MAX_EMIT = 255
// Maximum number of nonces
const MAX_NONCE = 255

export const etxn_burden: APITestWrapper<EtxnAPI['etxn_burden']> = (ctx) => {
  if (ctx.expectedEtxnCount <= -1) {
    return PREREQUISITE_NOT_MET
  }

  const lastBurden = ctx.burden || 1n
  const burden = lastBurden * BigInt(ctx.expectedEtxnCount)

  // Check for overflow
  if (burden < lastBurden) {
    return FEE_TOO_LARGE
  }

  return burden
}

export const etxn_details: APITestWrapper<EtxnAPI['etxn_details']> = (
  write_ptr,
  write_len,
  ctx,
) => {
  if (!ctx.memory.isRangeValid(write_ptr, write_len)) {
    return OUT_OF_BOUNDS
  }

  const expectedSize = ctx.hasCallback ? 138 : 116
  if (write_len < expectedSize) {
    return TOO_SMALL
  }

  if (ctx.expectedEtxnCount <= -1) {
    return PREREQUISITE_NOT_MET
  }

  try {
    const generation = etxn_generation(ctx)
    const burden = etxn_burden(ctx)
    if (typeof burden !== 'bigint' || burden < 0) {
      return burden // Return error code
    }

    // Create EmitDetails object
    const output = new Uint8Array(expectedSize)
    let offset = 0

    // sfEmitDetails
    output[offset++] = 0xed

    // sfEmitGeneration
    output[offset++] = 0x20
    output[offset++] = 0x2e
    output[offset++] = (Number(generation) >> 24) & 0xff
    output[offset++] = (Number(generation) >> 16) & 0xff
    output[offset++] = (Number(generation) >> 8) & 0xff
    output[offset++] = Number(generation) & 0xff

    // sfEmitBurden
    output[offset++] = 0x3d
    output[offset++] = (Number(burden) >> 56) & 0xff
    output[offset++] = (Number(burden) >> 48) & 0xff
    output[offset++] = (Number(burden) >> 40) & 0xff
    output[offset++] = (Number(burden) >> 32) & 0xff
    output[offset++] = (Number(burden) >> 24) & 0xff
    output[offset++] = (Number(burden) >> 16) & 0xff
    output[offset++] = (Number(burden) >> 8) & 0xff
    output[offset++] = Number(burden) & 0xff

    // sfEmitParentTxnID
    output[offset++] = 0x5b
    const txHash = createHash('sha256').update(ctx.otxnTxn).digest()
    output.set(txHash, offset)
    offset += 32

    // sfEmitNonce
    output[offset++] = 0x5c
    const nonce = createHash('sha256')
      .update(`${ctx.hookNamespace}${ctx.otxnTxn}${Date.now()}`)
      .digest()
    output.set(nonce, offset)
    offset += 32

    // sfEmitHookHash
    output[offset++] = 0x5d
    const hookHash = Buffer.from(ctx.hookNamespace, 'hex')
    output.set(hookHash, offset)
    offset += 32

    // sfEmitCallback (optional)
    if (ctx.hasCallback) {
      output[offset++] = 0x8a
      output[offset++] = 0x14
      const callbackAccount = Buffer.from(ctx.hookNamespace, 'hex')
      output.set(callbackAccount, offset)
      offset += 20
    }

    // End object
    output[offset++] = 0xe1

    ctx.memory.set(write_ptr, output)
    return BigInt(offset)
  } catch (e) {
    return INTERNAL_ERROR
  }
}

export const etxn_fee_base: APITestWrapper<EtxnAPI['etxn_fee_base']> = (
  read_ptr,
  read_len,
  ctx,
) => {
  if (ctx.expectedEtxnCount <= -1) {
    return PREREQUISITE_NOT_MET
  }

  try {
    const txnData = ctx.memory.get(read_ptr, read_len)
    // Calculate fee based on transaction size
    const baseFee = BigInt(txnData.length * 10) // Simple fee calculation for testing
    return baseFee
  } catch (e) {
    return INTERNAL_ERROR
  }
}

export const etxn_nonce: APITestWrapper<EtxnAPI['etxn_nonce']> = (
  write_ptr,
  write_len,
  ctx,
) => {
  if (!ctx.memory.isRangeValid(write_ptr, write_len)) {
    return OUT_OF_BOUNDS
  }
  if (write_len < 32) {
    return TOO_SMALL
  }
  if (ctx.nonceCounter > MAX_NONCE) {
    return TOO_MANY_NONCES
  }

  // Generate deterministic nonce
  const nonceData = `${ctx.hookNamespace}${ctx.otxnTxn}${ctx.nonceCounter}`
  const nonce = createHash('sha256').update(nonceData).digest()

  ctx.memory.set(write_ptr, nonce)
  ctx.nonceCounter = (ctx.nonceCounter || 0) + 1
  return 32n
}

export const etxn_reserve: APITestWrapper<EtxnAPI['etxn_reserve']> = (
  count,
  ctx,
) => {
  if (ctx.expectedEtxnCount > -1) {
    return ALREADY_SET
  }

  if (count < 1) {
    return TOO_SMALL
  }

  if (count > MAX_EMIT) {
    return TOO_BIG
  }

  ctx.expectedEtxnCount = count
  return BigInt(count)
}

export const etxn_generation: APITestWrapper<EtxnAPI['etxn_generation']> = (
  ctx,
) => {
  return otxn_generation(ctx) + 1n
}

const isPseudoTx = (txn: Transaction) => {
  const pseudoTxTypes = [
    'EnableAmendment',
    'SetFee',
    'UNLModify',
    'EmitFailure',
    'UNLReport',
  ]
  return pseudoTxTypes.includes(txn.TransactionType)
}

export const emit: APITestWrapper<EtxnAPI['emit']> = (
  write_ptr,
  write_len,
  read_ptr,
  read_len,
  ctx,
) => {
  if (
    !ctx.memory.isRangeValid(write_ptr, write_len) ||
    !ctx.memory.isRangeValid(read_ptr, read_len)
  ) {
    return OUT_OF_BOUNDS
  }

  if (write_len < 32) {
    return TOO_SMALL
  }

  if (ctx.expectedEtxnCount < 0) {
    return PREREQUISITE_NOT_MET
  }

  if (ctx.emittedTxn.length >= ctx.expectedEtxnCount) {
    return TOO_MANY_EMITTED_TXN
  }

  let txn: Transaction
  try {
    const blob = ctx.memory.get(read_ptr, read_len)
    txn = decode(Buffer.from(blob).toString('hex')) as unknown as Transaction
  } catch (e: any) {
    console.warn('HookEmit', e.message)
    return EMISSION_FAILURE
  }

  if (isPseudoTx(txn)) {
    console.warn('HookEmit', 'Attempted to emit pseudo txn.')
    return EMISSION_FAILURE
  }
  // check the emitted txn is valid
  /* Emitted TXN rules
   * 0. Account must match the hook account
   * 1. Sequence: 0
   * 2. PubSigningKey: 000000000000000
   * 3. sfEmitDetails present and valid
   * 4. No sfTxnSignature
   * 5. LastLedgerSeq > current ledger, > firstledgerseq & LastLedgerSeq < seq
   * + 5
   * 6. FirstLedgerSeq > current ledger
   * 7. Fee must be correctly high
   * 8. The generation cannot be higher than 10
   */

  // rule 0: account must match the hook account
  if (!txn.Account || txn.Account !== ctx.hookAccount) {
    console.warn('HookEmit', 'sfAccount does not match hook account')
    return EMISSION_FAILURE
  }
  // rule 2: sfSigningPubKey must be present and 00...00
  if (!txn.SigningPubKey) {
    console.warn('HookEmit', 'sfSigningPubKey missing')
    return EMISSION_FAILURE
  }
  const pk = Buffer.from(txn.SigningPubKey, 'hex')
  if (pk.length !== 33 && pk.length !== 0) {
    console.warn(
      'HookEmit',
      'sfSigningPubKey present but wrong size expecting 33 bytes',
    )
    return EMISSION_FAILURE
  }
  for (let i = 0; i < pk.length; ++i) {
    if (pk[i] !== 0) {
      console.warn('HookEmit', 'sfSigningPubKey present but non-zero.')
      return EMISSION_FAILURE
    }
  }
  // rule 2.a: no signers
  if (txn.Signers) {
    console.warn('HookEmit', 'sfSigners not allowed in emitted txns')
    return EMISSION_FAILURE
  }
  // rule 2.b: ticketseq cannot be used
  if (txn.TicketSequence) {
    console.warn('HookEmit', 'sfTicketSequence not allowed in emitted txns.')
    return EMISSION_FAILURE
  }
  // rule 2.c sfAccountTxnID not allowed
  if (txn.AccountTxnID) {
    console.warn('HookEmit', 'sfAccountTxnID not allowed in emitted txns."')
    return EMISSION_FAILURE
  }
  // rule 3: sfEmitDetails must be present and valid
  if (!txn.EmitDetails) {
    console.warn('HookEmit', 'sfEmitDetails missing')
    return EMISSION_FAILURE
  }
  const emitDetails = txn.EmitDetails
  if (
    !emitDetails.EmitGeneration ||
    !emitDetails.EmitBurden ||
    !emitDetails.EmitParentTxnID ||
    !(emitDetails as any).EmitNonce ||
    !emitDetails.EmitHookHash
  ) {
    console.warn('HookEmit', 'sfEmitDetails malformed.')
    return EMISSION_FAILURE
  }
  // rule 8: emit generation cannot exceed 10
  if (emitDetails.EmitGeneration >= 10) {
    console.warn('HookEmit', 'sfEmitGeneration was 10 or more.')
    return EMISSION_FAILURE
  }
  const gen = emitDetails.EmitGeneration
  const bur = emitDetails.EmitBurden
  const pTxnID = emitDetails.EmitParentTxnID
  const nonce = (emitDetails as any).EmitNonce

  let callback: string
  if ((emitDetails as any).EmitCallback) {
    callback = (emitDetails as any).EmitCallback
  }
  const hash = emitDetails.EmitHookHash

  const gen_proper = etxn_generation(ctx)
  if (gen !== Number(gen_proper)) {
    console.warn(
      'HookEmit',
      `sfEmitGeneration provided in EmitDetails not correct (${gen}) should be ${gen_proper}`,
    )
    return EMISSION_FAILURE
  }
  const bur_proper = etxn_burden(ctx)
  if (bur !== Number(bur_proper)) {
    console.warn(
      'HookEmit',
      `sfEmitBurden provided in EmitDetails was not correct (${bur}) should be ${bur_proper}`,
    )
    return EMISSION_FAILURE
  }
  if (pTxnID !== hashTx(ctx.otxnTxn)) {
    console.warn(
      'HookEmit',
      'sfEmitParentTxnID provided in EmitDetails was not correct',
    )
    return EMISSION_FAILURE
  }
  // TODO:
  // if (hookCtx.nonce_used.find(nonce) == hookCtx.nonce_used.end()) {
  //   ;(((JLOG(j.trace()) << 'HookEmit[') << HC_ACC()) <<
  //     ']: sfEmitNonce provided in EmitDetails ') <<
  //     'was not generated by nonce api'
  //   return EMISSION_FAILURE
  // }

  if (hash !== ctx.hookHash) {
    console.warn(
      'HookEmit',
      'sfEmitHookHash must be the hash of the emitting hook',
    )
    return EMISSION_FAILURE
  }

  // rule 4: sfTxnSignature must be absent
  if (txn.TxnSignature) {
    console.warn('HookEmit', 'sfTxnSignature is present but should not be')
    return EMISSION_FAILURE
  }

  // rule 5: LastLedgerSeq must be present and after current ledger
  if (!txn.LastLedgerSequence) {
    console.warn('HookEmit', 'sfLastLedgerSequence missing')
    return EMISSION_FAILURE
  }

  const tx_lls = txn.LastLedgerSequence
  const ledgerSeq = Number(ledger_seq(ctx))
  if (tx_lls < ledgerSeq + 1) {
    console.warn(
      'HookEmit',
      'sfLastLedgerSequence invalid (less than next ledger)',
    )
    return EMISSION_FAILURE
  }

  if (tx_lls > ledgerSeq + 5) {
    console.warn(
      'HookEmit',
      'sfLastLedgerSequence cannot be greater than current seq + 5',
    )
    return EMISSION_FAILURE
  }
  // rule 6
  if (!txn.FirstLedgerSequence || txn.FirstLedgerSequence > tx_lls) {
    console.warn(
      'HookEmit',
      'sfFirstLedgerSequence must be present and <= LastLedgerSequence',
    )
    return EMISSION_FAILURE
  }

  // rule 7 check the emitted txn pays the appropriate fee
  const minFee = etxn_fee_base(read_ptr, read_len, ctx)
  if (minFee < 0n) {
    console.warn('HookEmit', 'Fee could not be calculated')
    return EMISSION_FAILURE
  }
  if (Number(txn.Fee) < Number(minFee)) {
    console.warn(
      'HookEmit',
      'Fee on emitted txn is less than the minimum required fee',
    )
    return EMISSION_FAILURE
  }

  try {
    encode(txn)
  } catch (e: any) {
    console.warn('HookEmit', e.message)
    return EMISSION_FAILURE
  }

  try {
    validate(txn as unknown as Record<string, unknown>)
  } catch (e: any) {
    console.warn('HookEmit', e.message)
    return EMISSION_FAILURE
  }
  const resultBlob = encode(txn)

  const txid = Buffer.from(hashTx(resultBlob), 'hex')
  if (txid.length > write_len) {
    return TOO_SMALL
  }
  if (!ctx.memory.isRangeValid(write_ptr, write_len)) {
    return OUT_OF_BOUNDS
  }

  ctx.memory.set(write_ptr, txid)
  ctx.emittedTxn.push(resultBlob)
  return BigInt(txid.length)
}
