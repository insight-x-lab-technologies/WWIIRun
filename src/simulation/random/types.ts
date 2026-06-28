export type Seed128 = string & { readonly __seed128: unique symbol };

export type RngAlgorithm = "xoshiro128ss-v1";

export type RngStreamId = "spawn" | "loot" | "weather" | "patterns";

export type SeedParseErrorCode =
  "invalid-length" | "invalid-character" | "zero-seed";

export type SeedParseResult =
  | { readonly ok: true; readonly value: Seed128 }
  | { readonly ok: false; readonly code: SeedParseErrorCode };

export type RngState = {
  readonly algorithm: RngAlgorithm;
  s0: number;
  s1: number;
  s2: number;
  s3: number;
};
