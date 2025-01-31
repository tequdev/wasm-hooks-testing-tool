import {
  type HookAPI,
  accept,
  rollback,
  trace,
  trace_float,
  trace_num,
} from '../api'
import {
  emit,
  etxn_burden,
  etxn_details,
  etxn_fee_base,
  etxn_generation,
  etxn_nonce,
  etxn_reserve,
} from '../api/etxn'
import {
  float_compare,
  float_divide,
  float_int,
  float_invert,
  float_log,
  float_mantissa,
  float_mulratio,
  float_multiply,
  float_negate,
  float_one,
  float_root,
  float_set,
  float_sign,
  float_sto,
  float_sto_set,
  float_sum,
} from '../api/float'
import {
  hook_account,
  hook_again,
  hook_hash,
  hook_param,
  hook_param_set,
  hook_pos,
  hook_skip,
} from '../api/hookCtx'
import {
  fee_base,
  ledger_keylet,
  ledger_last_hash,
  ledger_last_time,
  ledger_nonce,
  ledger_seq,
} from '../api/ledger'
import {
  meta_slot,
  otxn_burden,
  otxn_field,
  otxn_generation,
  otxn_id,
  otxn_param,
  otxn_slot,
  otxn_type,
} from '../api/otxn'
import {
  sto_emplace,
  sto_erase,
  sto_subarray,
  sto_subfield,
  sto_validate,
} from '../api/serialization'
import {
  slot,
  slot_clear,
  slot_count,
  slot_float,
  slot_set,
  slot_size,
  slot_subarray,
  slot_subfield,
  slot_type,
  xpop_slot,
} from '../api/slot'
import {
  state,
  state_foreign,
  state_foreign_set,
  state_set,
} from '../api/state'
import {
  util_accid,
  util_keylet,
  util_raddr,
  util_sha512h,
  util_verify,
} from '../api/utils'
import type { Context } from './interface'

export const createHookAAPIStub = (ctx: Context): HookAPI => {
  return {
    trace: (...args) => {
      return trace(...args, ctx)
    },
    trace_num: (...args) => {
      return trace_num(...args, ctx)
    },
    trace_float: (...args) => {
      return trace_float(...args, ctx)
    },
    accept: (...args) => {
      return accept(...args, ctx)
    },
    rollback: (...args) => {
      return rollback(...args, ctx)
    },
    _g: (id, maxiter) => {
      return 1
    },
    // Hook Context API
    hook_account: (...args) => {
      return hook_account(...args, ctx)
    },
    hook_hash: (...args) => {
      return hook_hash(...args, ctx)
    },
    hook_param: (...args) => {
      return hook_param(...args, ctx)
    },
    hook_param_set: (...args) => {
      return hook_param_set(...args, ctx)
    },
    hook_skip: (...args) => {
      return hook_skip(...args, ctx)
    },
    hook_pos: () => {
      return hook_pos(ctx)
    },
    hook_again: () => {
      return hook_again(ctx)
    },
    // OTXN API
    otxn_burden: () => {
      return otxn_burden(ctx)
    },
    otxn_field: (...args) => {
      return otxn_field(...args, ctx)
    },
    otxn_generation: () => {
      return otxn_generation(ctx)
    },
    otxn_id: (...args) => {
      return otxn_id(...args, ctx)
    },
    otxn_type: () => {
      return otxn_type(ctx)
    },
    otxn_slot: (...args) => {
      return otxn_slot(...args, ctx)
    },
    otxn_param: (...args) => {
      return otxn_param(...args, ctx)
    },
    meta_slot: (...args) => {
      return meta_slot(...args, ctx)
    },
    // State API
    state: (...args) => {
      return state(...args, ctx)
    },
    state_set: (...args) => {
      return state_set(...args, ctx)
    },
    state_foreign: (...args) => {
      return state_foreign(...args, ctx)
    },
    state_foreign_set: (...args) => {
      return state_foreign_set(...args, ctx)
    },
    // ETXN API
    etxn_burden: () => {
      return etxn_burden(ctx)
    },
    etxn_details: (...args) => {
      return etxn_details(...args, ctx)
    },
    etxn_fee_base: (...args) => {
      return etxn_fee_base(...args, ctx)
    },
    etxn_nonce: (...args) => {
      return etxn_nonce(...args, ctx)
    },
    etxn_reserve: (...args) => {
      return etxn_reserve(...args, ctx)
    },
    etxn_generation: () => {
      return etxn_generation(ctx)
    },
    emit: (...args) => {
      return emit(...args, ctx)
    },
    // Float API
    float_set: (...args) => {
      return float_set(...args, ctx)
    },
    float_multiply: (...args) => {
      return float_multiply(...args, ctx)
    },
    float_mulratio: (...args) => {
      return float_mulratio(...args, ctx)
    },
    float_negate: (...args) => {
      return float_negate(...args, ctx)
    },
    float_compare: (...args) => {
      return float_compare(...args, ctx)
    },
    float_sum: (...args) => {
      return float_sum(...args, ctx)
    },
    float_sto: (...args) => {
      return float_sto(...args, ctx)
    },
    float_sto_set: (...args) => {
      return float_sto_set(...args, ctx)
    },
    float_invert: (...args) => {
      return float_invert(...args, ctx)
    },
    float_divide: (...args) => {
      return float_divide(...args, ctx)
    },
    float_one: () => {
      return float_one(ctx)
    },
    float_mantissa: (...args) => {
      return float_mantissa(...args, ctx)
    },
    float_sign: (...args) => {
      return float_sign(...args, ctx)
    },
    float_int: (...args) => {
      return float_int(...args, ctx)
    },
    float_log: (...args) => {
      return float_log(...args, ctx)
    },
    float_root: (...args) => {
      return float_root(...args, ctx)
    },
    // Ledger API
    fee_base: () => {
      return fee_base(ctx)
    },
    ledger_seq: () => {
      return ledger_seq(ctx)
    },
    ledger_last_hash: (...args) => {
      return ledger_last_hash(...args, ctx)
    },
    ledger_last_time: () => {
      return ledger_last_time(ctx)
    },
    ledger_nonce: (...args) => {
      return ledger_nonce(...args, ctx)
    },
    ledger_keylet: (...args) => {
      return ledger_keylet(...args, ctx)
    },
    // Serialization API
    sto_subfield: (...args) => {
      return sto_subfield(...args, ctx)
    },
    sto_subarray: (...args) => {
      return sto_subarray(...args, ctx)
    },
    sto_emplace: (...args) => {
      return sto_emplace(...args, ctx)
    },
    sto_erase: (...args) => {
      return sto_erase(...args, ctx)
    },
    sto_validate: (...args) => {
      return sto_validate(...args, ctx)
    },
    // Slot API
    slot: (...args) => {
      return slot(...args, ctx)
    },
    slot_clear: (...args) => {
      return slot_clear(...args, ctx)
    },
    slot_count: (...args) => {
      return slot_count(...args, ctx)
    },
    slot_set: (...args) => {
      return slot_set(...args, ctx)
    },
    slot_size: (...args) => {
      return slot_size(...args, ctx)
    },
    slot_subarray: (...args) => {
      return slot_subarray(...args, ctx)
    },
    slot_subfield: (...args) => {
      return slot_subfield(...args, ctx)
    },
    slot_type: (...args) => {
      return slot_type(...args, ctx)
    },
    xpop_slot: (...args) => {
      return xpop_slot(...args, ctx)
    },
    slot_float: (...args) => {
      return slot_float(...args, ctx)
    },
    // Util API
    util_accid: (...args) => {
      return util_accid(...args, ctx)
    },
    util_keylet: (...args) => {
      return util_keylet(...args, ctx)
    },
    util_raddr: (...args) => {
      return util_raddr(...args, ctx)
    },
    util_sha512h: (...args) => {
      return util_sha512h(...args, ctx)
    },
    util_verify: (...args) => {
      return util_verify(...args, ctx)
    },
  }
}
