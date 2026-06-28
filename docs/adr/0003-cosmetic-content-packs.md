# ADR-0003: expansões cosméticas orientadas a dados

Status: Accepted  
Data: 2026-06-27

## Contexto

O jogo começa geométrico e depois recebe imagens/áudio AAA e packs temáticos compráveis. Challenges devem continuar idênticos e assets grandes não podem degradar o core.

## Opções consideradas

- packs podem substituir qualquer JSON: flexível, inseguro e não determinístico;
- forks/builds por tema: duplicação e fragmentação;
- manifest cosmético com allowlist: limite claro e cache independente.

## Decisão

Gameplay definitions são core/versionadas. Packs só mapeiam visual/audio/localization IDs por manifest validado; não contêm código e não sobrescrevem hitbox/stats/spawn/score. Loader aplica pack atomicamente ou fallback core. Assets são lazy-loaded, budgetados e documentados.

## Consequências

Novos temas devem reutilizar semântica existente; conteúdo com mecânica nova exige nova content/ruleset, não “cosmético”. CI compara golden hashes entre packs e valida integridade/licença/budget.
