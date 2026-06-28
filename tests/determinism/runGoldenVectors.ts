export const runGoldenVectors = {
  config: {
    mode: "weekly",
    seed: "8000000000000001ffffffff7fffffff",
    rulesetVersion: "rules.f0-05.v1",
    contentVersion: "content.base.v1",
    aircraftId: "aircraft.p51d.v1",
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
    { tick: 0, hash: "0c8d1a30d7b17210" },
    { tick: 1, hash: "0de18a8817e3a594" },
    { tick: 3, hash: "6c361b31acf23fb3" },
    { tick: 8, hash: "8915f7da45a2a608" },
  ],
  finalRng: {
    spawn: ["80000000", "00000001", "ffffffff", "7fffffff"],
    loot: ["0659ea41", "78ac8eb2", "e5c9d1a3", "5389fc89"],
    weather: ["381f0728", "5267f0ff", "f1d144a2", "e5e39d64"],
    patterns: ["414616c7", "73f210de", "f7913e3d", "ac894116"],
  },
} as const;
