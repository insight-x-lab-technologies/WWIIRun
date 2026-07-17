# ADR-0014: loot determinístico, coleta e estatísticas da run v6

Status: Accepted
Data: 2026-07-17
Decisores: proprietário do projeto, por delegação D-007/D-008, e agente técnico

## Contexto

F1-04 já destrói inimigos, F1-03 já reserva um pool de 128 moedas e a broad phase já reconhece pares jogador-moeda, mas nenhum desses elementos ainda tem regra de drop, coleta ou resultado observável. Colocar essas decisões na cena Phaser, usar aleatoriedade externa ou confundir a moeda transitória com a carteira persistida quebraria o núcleo headless e anteciparia economia/F4.

## Opções consideradas

- deixar todos os drops para um diretor futuro: mantém o pool ocioso e não satisfaz GAME-03;
- criar moedas na camada Phaser: torna render e timing do browser autoridades e não permite corpus/replay;
- usar `Math.random()` ou a stream `spawn`: introduz entropia proibida ou acopla loot à futura geração de encontros;
- consumir a stream PRNG `loot`, usar slots canônicos existentes e manter contadores inteiros no estado da run.

## Decisão

F1-06 usará exclusivamente a stream `loot` já versionada. Cada destruição efetiva de inimigo consome exatamente um `nextUint32`; um valor menor que `0x80000000` tenta gerar uma única `coin.placeholder.v1` de valor técnico `1` na posição pré-limpeza do inimigo, com velocidade inteira declarada. Esgotamento do pool não desfaz o draw nem a destruição; registra somente que a moeda não foi gerada. Nenhuma estrutura gera loot neste item.

O estado passa a `wwiirun.run-state.v6` e contém `runStats` pré-alocado/canônico: `runCoins`, `coinsSpawned`, `coinsCollected` e `enemiesDestroyed`. Contadores são inteiros não negativos, saturam em `uint32`, entram no hash e não são carteira, score, save, placar ou evento de backend. Coleta resolve os contatos jogador-moeda em ordem de código crescente: moeda ainda ativa é limpa uma vez e incrementa `runCoins`/`coinsCollected` pelo seu valor. O pool, cursor, sentinelas, scratch e Graphics continuam separados do resultado canônico conforme os ADRs anteriores.

## Consequências

- F1 satisfaz a primeira cadeia observável de morte → loot → coleta sem decidir preços, taxa final, magnetismo, power-ups, score ou persistência;
- corpus v1–v5 permanece histórico e v6 ganha vetores independentes; não há migração enquanto a run só existe em memória;
- o threshold e valor são parâmetros técnicos versionados, não balanceamento final; qualquer mudança futura de distribuição/conteúdo publicada exige nova versão/corpus e, se afetar economia ou regra pública, decisão apropriada;
- validação exige consumo isolado de `loot`, ordem de contatos, exaustão, hash/corpus Node+Chromium e reuso do pool/scratch sem alegar FPS físico.
