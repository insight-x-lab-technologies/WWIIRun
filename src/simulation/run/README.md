# run

Núcleo headless determinístico da run. Ele depende apenas de módulos `simulation`: não usa Phaser, DOM, relógio, timers, locale, rede ou storage.

## API e tick

- `createRunState(config)` valida/copia a configuração e inicializa aeronave, pools, scratch broad phase e streams RNG;
- `stepRun(state, input)` copia/valida input, atualiza aeronave e cooldown, tenta a arma primária, executa comportamento/movimento, coleta e resolve contatos canônicos, então incrementa o tick;
- `advanceRun(state, inputs)` valida o lote inteiro antes de mutar e aplica a mesma transição em ordem;
- `hashRunState(state)` calcula sob demanda `fnv1a64-v1`; nunca roda automaticamente por tick.

`TICKS_PER_SECOND` é 60. `moveX`/`moveY` são inteiros em `[-127, 127]`; actions aceita somente `firePrimary` (`0x0001`), `fireSecondary` (`0x0002`) e `special` (`0x0004`). Configuração inválida lança `TypeError`; input/overflow lançam `RangeError`; `advanceRun` é atômico para esses erros.

## Layout `wwiirun.run-state.v4`

O hash codifica explicitamente tag, schema, configuração, tick, cooldown primário, input, jogador, quatro streams RNG e pools/cursors em ordem fixa. Slots de projétil incluem dano; slots de inimigo incluem HP atual/máximo, comportamento e dano de contato. Slots inativos usam sentinelas zero/empty. Strings ASCII usam comprimento `uint32` + bytes; inteiros são little-endian; eixos usam um byte em complemento de dois e actions usam `uint16`.

`firePrimary` usa `weapon.machine-gun.v1`: tentativa de spawn em pool pré-alocado, dano 1, velocidade 2048 e cooldown de 6 ticks. Esgotamento não muda cursor ou cooldown. Inimigos são ativados explicitamente por definition; não há diretor, RNG de encontro ou timers de parede.

Os corpus v1, v2 e v3 são históricos e imutáveis. O corpus v4 tem checkpoints próprios; alterar campos, ordem, encoding ou algoritmo exige nova versão e novos vetores, nunca edição silenciosa de corpus anterior. FNV-1a detecta divergência acidental, mas não autentica cliente nem autoriza score.
