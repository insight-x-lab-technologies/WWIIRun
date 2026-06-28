# ADR-0005: estado headless e hash canônico da run

Status: Accepted
Data: 2026-06-28
Decisores: proprietário do projeto e agentes técnicos

## Contexto

O contrato determinístico exige que configuração, inputs quantizados e estado produzam os mesmos checkpoints em Node e browsers. O projeto ainda não fixa a fronteira entre o adapter de tempo/render e o tick, a forma canônica de `RunConfig`/`RunState` nem um hash independente da ordem incidental de propriedades JavaScript.

O hash desta etapa serve para detectar divergência e sustentar golden runs. Ele não autentica o cliente e não substitui reexecução de replay, assinatura de manifesto ou validação do backend.

## Opções consideradas

- `JSON.stringify` do estado mais hash: simples, mas deixa o contrato vulnerável a ordem de propriedades, campos acidentais e representações numéricas implícitas;
- SHA-256 via Web Crypto: resistente a colisão, porém assíncrono, dependente de API de plataforma e incompatível com a fronteira pura do núcleo;
- FNV-1a 32-bit com layout binário: pequeno e síncrono, mas 32 bits oferecem margem baixa para um corpus crescente de checkpoints;
- FNV-1a 64-bit versionado sobre bytes canônicos: implementação pequena, síncrona e portável com `BigInt`, com colisão acidental suficientemente improvável para diagnóstico, embora sem segurança criptográfica.

## Decisão

O núcleo avança exclusivamente por chamadas explícitas de um tick. Cada tick consome exatamente um `InputFrame`; delta de render, relógio, pausa e catch-up pertencem aos adapters e nunca entram em `simulation`. O executor headless apenas agrupa a mesma sequência de frames em lotes, sem alterar a semântica.

`RunConfig` canônico inclui modo, seed, `rulesetVersion`, `contentVersion`, aeronave, loadout e IDs de modificadores. `RunState` versão 1 inclui essa configuração imutável, quantidade de ticks concluídos, último input consumido e os quatro estados de RNG definidos pelo ADR-0004. Locale, timezone, áudio, qualidade visual, viewport, FPS e pack cosmético não pertencem a esses tipos.

`InputFrame` usa eixos inteiros em `[-127, 127]` e uma máscara unsigned de 16 bits com atribuições iniciais imutáveis: bit 0 para tiro primário, bit 1 para tiro secundário e bit 2 para ação especial. Bits ainda não definidos são rejeitados.

O hash `fnv1a64-v1` processa um layout binário explícito `wwiirun.run-state.v1`: strings ASCII com comprimento `uint32`, inteiros em little-endian, modificadores em ordem canônica e streams na ordem normativa `spawn`, `loot`, `weather`, `patterns`. A saída é uma string hexadecimal minúscula de 16 caracteres. O acumulador `BigInt` existe apenas durante o cálculo; o estado continua JSON-safe.

## Consequências

- render em qualquer refresh rate pode chamar os mesmos ticks sem contaminar a regra com delta variável;
- lotes headless diferentes para a mesma sequência de inputs produzem o mesmo estado e hash;
- campos novos de estado precisam entrar deliberadamente no layout canônico e nos goldens; mudança incompatível exige nova versão de layout/hash e, depois de publicação, nova `rulesetVersion`;
- FNV-1a 64-bit não protege contra cliente malicioso nem autoriza score; o backend futuro deve validar limites e reexecutar replay quando necessário;
- `BigInt` pode ser mais caro que aritmética de 32 bits, portanto o hash é calculado sob demanda/checkpoint, não obrigatoriamente a cada tick de produção; F0-06 mede o custo antes de definir frequência;
- a versão 1 ainda não possui entidades ou regras de gameplay. F1 deve estender estado, transição e layout de forma explícita, preservando goldens históricos quando uma ruleset já estiver publicada.
