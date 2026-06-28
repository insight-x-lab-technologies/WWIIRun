# Determinismo dos desafios

## Contrato

Para `seed + rulesetVersion + contentVersion + RunConfig + sequência de InputFrame`, o núcleo deve produzir a mesma sequência de hashes/checkpoints e o mesmo `RunResult` em browsers suportados.

Determinismo não significa que dois jogadores terão a mesma tela após inputs diferentes. Significa que todo acaso e toda evolução derivam das mesmas entradas explícitas.

## Regras obrigatórias

- passo fixo de 60 ticks/s; nunca usar delta variável nas regras;
- posições, velocidades, dano e timers representados por inteiros em unidades escaladas;
- PRNG próprio, versionado e testado com vetores conhecidos, usando operações inteiras de 32 bits;
- streams separados derivados da seed (`spawn`, `loot`, `weather`, `patterns`) para reduzir acoplamento entre features;
- iteração em ordem estável por ID; não depender de ordem incidental de objetos/sets;
- trigonometria gameplay usa lookup table/versionada ou vetores pré-calculados;
- inputs analógicos quantizados antes de entrar no núcleo;
- pausa, perda de foco, FPS real, locale, timezone e cosmético não avançam/mudam regra;
- sem `Math.random`, relógio, rede, Web Crypto ou física Phaser no núcleo.

## Seeds periódicas

O servidor publica um `ChallengeManifest` assinado/logicamente autorizado contendo:

```ts
type ChallengeManifest = {
  id: string;                 // daily:2026-06-27 ou weekly:2026-W26
  mode: 'daily' | 'weekly';
  periodStartUtc: string;
  periodEndUtc: string;
  seedHex: string;            // 128 bits em formato canônico
  rulesetVersion: string;
  contentVersion: string;
  allowedLoadout: string;
};
```

Derivação de fallback local: hash criptográfico de `namespace + challengeKey + seasonSecretVersion`, publicado pelo backend. Não embutir segredo mestre no cliente. O manifesto pode ser armazenado offline após obtido. A semana usa ISO-8601 e UTC; o diário vira exatamente à meia-noite UTC.

## Justiça de loadout

Perks permanentes e moedas compráveis criariam pay-to-win. Daily/Weekly devem usar aeronave/loadout normalizado definido no manifesto, ou leaderboards separados por classe. A recomendação é loadout normalizado no ranking principal.

## Replay e validação

Registrar somente config, build/version, input frames compactados, checkpoints de hash e resultado. O backend rejeita versão não aceita, manifesto divergente, duração impossível, campos fora de limite e hash/replay inválido. A validação forte pode reexecutar o replay numa Edge Function/serviço compatível; até isso existir, placares devem ser marcados como não verificados e sujeitos a rate limit/análise.

## Testes

- golden vectors do PRNG;
- mesma run repetida N vezes produz hashes idênticos;
- execução em diferentes chunkings de render produz mesmo resultado;
- serializar/restaurar em checkpoint não muda resultado;
- trocar locale, áudio, qualidade e pack mantém hashes;
- seeds-limite, milhares de entidades e overflow são cobertos;
- corpus de replays roda em Chromium, Firefox e WebKit no CI quando viável.

Mudança intencional de golden hash requer ADR/nota de migração e nova `rulesetVersion`, nunca simples atualização silenciosa do snapshot.
