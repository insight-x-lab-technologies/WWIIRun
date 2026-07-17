/**
 * Independent v4 reference corpus for the run state introduced by F1-04.
 * Historical v1/v2/v3 fixtures intentionally remain in their original files.
 */
export const runV4GoldenVectors = {
  config: {
    mode: "weekly",
    seed: "8000000000000001ffffffff7fffffff",
    rulesetVersion: "rules.f1-02.v2",
    contentVersion: "content.base.v1",
    aircraftId: "aircraft.placeholder.v1",
    loadoutId: "loadout.challenge.v1",
    modifierIds: ["weather.snow.v1", "difficulty.hard.v1"],
  },
  canonicalModifierIds: ["difficulty.hard.v1", "weather.snow.v1"],
  inputs: [
    { moveX: -127, moveY: 127, actions: 1 },
    { moveX: 64, moveY: -64, actions: 2 },
    { moveX: 0, moveY: 0, actions: 4 },
    { moveX: 127, moveY: -127, actions: 7 },
    { moveX: -1, moveY: 1, actions: 3 },
    { moveX: 1, moveY: -1, actions: 5 },
    { moveX: 42, moveY: -42, actions: 6 },
    { moveX: 0, moveY: 0, actions: 0 },
  ],
  checkpoints: [
    { tick: 0, hash: "7872620e85f718a5" },
    { tick: 1, hash: "f5669c004c76448c" },
    { tick: 3, hash: "ec3b3be55012d628" },
    { tick: 8, hash: "b142516a99acbc04" },
  ],
  finalRng: {
    spawn: ["80000000", "00000001", "ffffffff", "7fffffff"],
    loot: ["0659ea41", "78ac8eb2", "e5c9d1a3", "5389fc89"],
    weather: ["381f0728", "5267f0ff", "f1d144a2", "e5e39d64"],
    patterns: ["414616c7", "73f210de", "f7913e3d", "ac894116"],
  },
} as const;
