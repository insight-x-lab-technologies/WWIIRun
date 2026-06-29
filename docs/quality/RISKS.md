# Registro de riscos

| Risco | Prob. | Impacto | Mitigação/Gate |
|---|---|---|---|
| Phaser/float/ordem quebra replay | Alta | Crítico | Core inteiro determinístico, inteiros, goldens cross-browser. |
| Conteúdo procedural cria situação impossível | Alta | Alto | Templates, clearance validator, reaction-time budget e seed corpus. |
| Bullet hell + arte AAA estoura GPU/VRAM | Alta | Crítico | Atlases, pooling, caps, culling, tiers e matriz real. |
| Workload sintético excede frame p95/Long Tasks na matriz F0 | Alta | Alto | Preservar baselines/failures, perfilar em item corretivo e não afrouxar threshold ou workload. |
| Evidência física F0 cobre apenas 595 de 600 segundos | Alta | Médio | ADR-0007 aceita explicitamente a limitação sem presumir a janela ausente; manter coletor futuro em 120 janelas e restringir claims às 119 observadas. |
| Matriz F0 não cobre desktop com GPU integrada | Média | Médio | Desktop Windows dedicado cobre o exit autorizado; medir perfil integrado antes de alegações amplas de suporte. |
| Aspect ratio dá vantagem competitiva | Média | Alto | Viewport lógico/câmera limitada e mesmos bounds de spawn. |
| Perks/moedas criam pay-to-win | Alta | Alto | Challenge loadout normalizado e categorias explícitas. |
| Cliente falsifica placar/moedas | Alta | Alto | RLS, Edge Function, replay/checkpoints, ledger, rate limit. |
| Plano gratuito Supabase pausa/limita | Média | Médio | Offline-first, fila, degradação clara e exportabilidade. |
| PWA perde save por eviction | Média | Alto | persist storage, export/backup e sync opcional. |
| Service worker mistura versões | Média | Crítico | ativar entre runs, manifests versionados e compatibilidade. |
| IA gera arte inconsistente/sem direitos | Alta | Alto | fichas, provenance/licença e revisão humana. |
| Símbolos históricos violam políticas | Média | Alto | direção editorial e revisão por loja/região. |
| Escopo de 20 naves/10 idiomas atrasa core | Alta | Alto | vertical slice antes de volume, conteúdo faseado. |
| Pagamentos externos sem validação segura | Alta | Alto | webhook/redemption backend; lançar doação/free packs se ausente. |
| Múltiplos perfis conflitam com auth | Média | Médio | decidir modelo antes do schema F5. |
| Áudio não inicia ou pesa demais | Média | Médio | gesto, codecs/fallback, streaming/load por cena e budgets. |
| Agente expande escopo ou perde contexto | Alta | Alto | spec curta, AGENTS, memória, ADR, gates e handoff obrigatório. |

Revisar este registro ao fechar cada fase e promover risco novo antes de implementar mitigação estrutural.
