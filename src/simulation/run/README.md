# run

Núcleo headless versionado da run. O módulo depende somente de `simulation/random` e não usa Phaser, DOM, relógio, timers, locale, rede ou storage.

## API

- `createRunState(config)`: valida e copia uma `RunConfig`, ordena os `modifierIds`, congela configuração/array e cria os quatro streams RNG independentes;
- `stepRun(state, input)`: valida e consome exatamente um `InputFrame`, copia o frame e incrementa `tick` por último;
- `advanceRun(state, inputs)`: valida o lote e a capacidade inteira antes de mutar, depois aplica a mesma transição em ordem;
- `hashRunState(state)`: calcula sob demanda o hash canônico `fnv1a64-v1`; não é chamado automaticamente por tick.

`TICKS_PER_SECOND` é 60 e `RUN_STATE_SCHEMA_VERSION` é 1. `moveX`/`moveY` são inteiros em `[-127, 127]`. `actions` aceita apenas os bits `0x0001` (`firePrimary`), `0x0002` (`fireSecondary`) e `0x0004` (`special`). Não há delta, accumulator, timestamp nem input de plataforma nesta fronteira.

Configuração inválida lança `TypeError`; input/overflow de tick lança `RangeError`. `advanceRun` é atômico para esses erros. O tick vazio de F0-05 não contém gameplay e não consome RNG.

## Layout `wwiirun.run-state.v1`

O hash percorre, em ordem explícita: tag; schema; modo/seed/versões/aeronave/loadout; quantidade e IDs canônicos de modificadores; tick; último input; quantidade de streams; e `spawn`, `loot`, `weather`, `patterns` com ID, algoritmo e quatro palavras.

Strings ASCII usam comprimento `uint32` + bytes; inteiros e palavras usam little-endian; eixos usam um byte em complemento de dois; ações usam `uint16`. A saída contém 16 dígitos hexadecimais minúsculos. O código não depende de `JSON.stringify`, `TextEncoder`, ordem de propriedades nem endianness da plataforma.

FNV-1a 64-bit detecta divergência acidental, mas não autentica cliente nem autoriza score. Replay persistido, restore, gameplay e validação no backend permanecem fora de F0-05. Alterar campo, ordem, encoding ou algoritmo exige nova versão e novos goldens; não atualize expected silenciosamente.
