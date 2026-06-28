export const randomGoldenVectors = {
  parser: [
    {
      input: "0123456789ABCDEFFEDCBA9876543210",
      canonical: "0123456789abcdeffedcba9876543210",
      words: ["01234567", "89abcdef", "fedcba98", "76543210"],
    },
    {
      input: "8000000000000001FFFFFFFF7FFFFFFF",
      canonical: "8000000000000001ffffffff7fffffff",
      words: ["80000000", "00000001", "ffffffff", "7fffffff"],
    },
  ],
  sequences: [
    {
      initialState: ["01234567", "89abcdef", "fedcba98", "76543210"],
      calls: 10,
      outputs: [
        "99998498",
        "6666695f",
        "cce4f862",
        "c6698edf",
        "95259c18",
        "d659c6f7",
        "e0450a43",
        "ddef3452",
        "6b08f9ec",
        "7a91fd86",
      ],
      finalState: ["bc34fe4f", "601f3ab4", "3aca2f5d", "3ba323df"],
    },
    {
      initialState: ["80000000", "00000001", "ffffffff", "7fffffff"],
      calls: 10,
      outputs: [
        "00001680",
        "ffffd537",
        "ffd2edf7",
        "fe981af7",
        "ca2cebc0",
        "67ffa840",
        "8075d71d",
        "85a617a9",
        "17a11e22",
        "e767a0f7",
      ],
      finalState: ["204dd137", "51b3f847", "7e16a4fa", "be13bb8d"],
    },
  ],
  streams: [
    {
      seed: "0123456789abcdeffedcba9876543210",
      states: {
        spawn: ["01234567", "89abcdef", "fedcba98", "76543210"],
        loot: ["6f0f5abd", "040bd3df", "eb8223e2", "591ba81e"],
        weather: ["b7f5448f", "24b8fffc", "35a27caa", "46a2ed6d"],
        patterns: ["0443e407", "ac6ba17c", "ef28acdc", "1fbfc1b0"],
      },
    },
    {
      seed: "8000000000000001ffffffff7fffffff",
      states: {
        spawn: ["80000000", "00000001", "ffffffff", "7fffffff"],
        loot: ["0659ea41", "78ac8eb2", "e5c9d1a3", "5389fc89"],
        weather: ["381f0728", "5267f0ff", "f1d144a2", "e5e39d64"],
        patterns: ["414616c7", "73f210de", "f7913e3d", "ac894116"],
      },
    },
  ],
  bounded: [
    {
      initialState: ["01234567", "89abcdef", "fedcba98", "76543210"],
      upperExclusive: 1,
      output: "00000000",
      drawsConsumed: 1,
      finalState: ["fedcba98", "76543210", "a86421ff", "ffffffff"],
    },
    {
      initialState: ["01234567", "89abcdef", "fedcba98", "76543210"],
      upperExclusive: 0x1_0000_0000,
      output: "99998498",
      drawsConsumed: 1,
      finalState: ["fedcba98", "76543210", "a86421ff", "ffffffff"],
    },
    {
      initialState: ["80000000", "00000001", "ffffffff", "7fffffff"],
      upperExclusive: 0x80000001,
      output: "7fffd536",
      drawsConsumed: 2,
      finalState: ["7ffff3ff", "fffffdff", "7ffffe01", "00600c00"],
    },
  ],
} as const;
