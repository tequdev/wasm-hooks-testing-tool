import type { Context } from '../../context/interface'

export type APITestWrapper<T> = T extends (...args: infer P) => infer R
  ? (...args: [...P, option: Context]) => R
  : never
