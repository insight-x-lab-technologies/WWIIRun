# Memória estável do projeto

## Missão

Entregar um bullet hell/roguelike side-scroller gratuito e instalável, com fantasia de aviação da Segunda Guerra Mundial, partidas rápidas, progressão persistente e desafios competitivos determinísticos.

## Restrições permanentes

- hobby: lançamento não depende de software, framework ou plano pago;
- web/PWA primeiro, GitHub Pages primeiro e itch.io depois;
- 60 FPS como alvo mínimo em dispositivos atuais de referência;
- desktop, tablet e celular, portrait e landscape;
- desafios usam seed fixa por período e versão de regras;
- expansões são cosméticas e não alteram gameplay;
- geometria inicial deve ser substituível por arte raster sem mudar entidades/hitboxes;
- TypeScript + Phaser, com simulação pura desacoplada;
- desenvolvimento SDD, testes automatizados e memória explícita para agentes.

## Decisões de produto em aberto

- nome comercial definitivo e licença do código;
- identidade visual e grau de fidelidade histórica;
- fornecedores de pagamentos/redemption para expansões e moedas;
- política de privacidade, termos, idade mínima e moderação de nomes;
- conjunto final de 20 aeronaves, balanceamento e preços;
- aparelhos exatos da matriz de performance;
- o décimo locale; foram confirmados 9 idiomas distintos: `en`, `es-ES`, `pt-BR`, `fr`, `it`, `de`, `ja`, `zh-CN` e `hi`.

## Convenções

- IDs estáveis em inglês (`enemy.fighter.light.v1`); texto exibido vem de i18n.
- unidades de simulação são inteiros; tempo é contado em ticks de 1/60 s.
- conteúdo competitivo tem `rulesetVersion` e `contentVersion`.
- saves têm schema versionado e migrações.
- `Endless` pode ser aleatório; diário/semanal jamais depende de entropia externa após a criação da seed.

## Fonte de verdade

Requisitos detalhados: `docs/product/REQUIREMENTS.md`. Decisões técnicas: `docs/adr/`. Próximo trabalho: `docs/memory/CURRENT_STATE.md` e `docs/roadmap/ROADMAP.md`.
