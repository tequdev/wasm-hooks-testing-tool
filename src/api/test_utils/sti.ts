export enum SerializedTypeID {
  // special types
  STI_UNKNOWN = -2,
  STI_NOTPRESENT = 0,

  // // types (common)
  STI_UINT16 = 1,
  STI_UINT32 = 2,
  STI_UINT64 = 3,
  STI_UINT128 = 4,
  STI_UINT256 = 5,
  STI_AMOUNT = 6,
  STI_VL = 7,
  STI_ACCOUNT = 8,
  // 9-13 are reserved
  STI_OBJECT = 14,
  STI_ARRAY = 15,

  // types (uncommon)
  STI_UINT8 = 16,
  STI_UINT160 = 17,
  STI_PATHSET = 18,
  STI_VECTOR256 = 19,
  STI_UINT96 = 20,
  STI_UINT192 = 21,
  STI_UINT384 = 22,
  STI_UINT512 = 23,

  // high level types
  // cannot be serialized inside other types
  STI_TRANSACTION = 10001,
  STI_LEDGERENTRY = 10002,
  STI_VALIDATION = 10003,
  STI_METADATA = 10004,
}
