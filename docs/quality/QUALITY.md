# Estratégia de qualidade e performance

## Pirâmide de testes

- unitários: RNG, matemática inteira, armas, dano, drops, diretor, economia, comparadores, migrações;
- propriedades: invariantes de colisão, saldo, spawns transitáveis e serialização;
- determinismo: golden replays/hashes e cross-browser;
- integração: scenes/adapters/storage/Supabase fake/content loader;
- E2E: onboarding, run, game over, hangar, settings, offline/update e viewports;
- contratos: schemas de content packs, i18n e APIs;
- segurança: RLS e Edge Functions quando backend existir;
- visual: screenshots apenas para UI estável, sem substituir asserts funcionais.

## Gates por mudança

`format/lint → typecheck → unit → determinism → build`. PRs de UI acrescentam E2E/viewports; core acrescenta golden/property; assets acrescentam schema/budget/licença; backend acrescenta RLS/contract.

Cobertura numérica é sinal, não objetivo: alvo inicial 90% de branches em `simulation`, 80% em casos de uso e cobertura focada em risco no restante. Nenhum arquivo crítico fica isento por conveniência.

## Meta de performance

Alvo de render sustentado: 60 FPS ou refresh superior, com simulação fixa a 60 Hz. “Dispositivo minimamente atual” deve virar uma matriz concreta em F0-06; até lá:

- mobile mid-range Android com 4 GB e browser atual;
- iPhone com Safari suportado;
- tablet Android/iPad;
- desktop integrado.

Budget em stress scene no tier base:

| Métrica | Alvo |
|---|---:|
| frame p95 | ≤ 16,67 ms |
| simulation tick p95 | ≤ 4 ms |
| long tasks durante gameplay | zero acima de 50 ms |
| quedas sustentadas | nenhuma janela de 5 s abaixo de 55 FPS |
| entidades/projéteis | caps definidos e testados por tier |
| memória/VRAM | baseline medida por aparelho, sem crescimento por run |

Não é tecnicamente honesto garantir 60 FPS em qualquer hardware. O gate é a matriz publicada, stress scene reproduzível e quality scaling que reduz partículas, pós-processamento e densidade visual — nunca regras do challenge.

## Profiling

Overlay de diagnóstico: FPS, frame/tick p50/p95, entidades ativas, pools, draw calls aproximadas, memória quando API permitir e seed. Capturar 10 minutos de stress + troca de cenas + 3 runs para vazamento. Usar Performance panel e métricas automatizadas, não otimização por intuição.

## Budgets de conteúdo

CI valida dimensões, atlas, bytes, canais alpha, nomes, referências órfãs e licença. Budget exato de bundle/core é definido após protótipo medido; aumentos exigem justificativa. Assets AAA entram progressivamente e são avaliados em aparelhos reais antes de substituir placeholders.

## Matriz responsiva mínima

320×568, 360×800, 390×844, 412×915, celular landscape baixo, 768×1024, 820×1180, 1024×768, 1366×768, 1920×1080. Incluir DPR alto, notch/safe area simulada, touch e teclado. Testar rotação no meio da run.

## Release checklist resumido

- requisitos/spec e notas de versão;
- gates automatizados verdes;
- replay golden da ruleset;
- save atual e migração da versão anterior;
- offline/install/update;
- performance e viewports;
- conteúdo/i18n/licenças;
- RLS/secrets/privacy quando social;
- rollback conhecido e versão fixada.
