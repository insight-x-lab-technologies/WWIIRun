# ADR-0002: simulação determinística versionada

Status: Accepted  
Data: 2026-06-27

## Contexto

Daily/Weekly exigem geração reproduzível e leaderboard defensável em browsers/hardware distintos. Delta variável, floats sensíveis, física da engine e aleatoriedade global não oferecem contrato suficiente.

## Opções consideradas

- gravar apenas seed com física Phaser: simples, insuficiente para replay estável;
- snapshots completos: grandes e ainda difíceis de validar;
- servidor autoritativo por tick: caro e incompatível com hobby/offline;
- core fixed-tick inteiro + inputs/replay: mais disciplina, custo operacional baixo.

## Decisão

Simulação a 60 ticks/s, matemática inteira escalada, PRNG 32-bit versionado com streams, ordem estável, colisão própria e input quantizado. Replays guardam config, inputs, checkpoints e versões. Render pode interpolar e rodar acima de 60 Hz.

## Consequências

Trigonometria/timers/conversões exigem utilitários próprios e testes golden. Mudança que altera hash cria ruleset nova. Phaser não decide colisão, dano, spawn ou score.
