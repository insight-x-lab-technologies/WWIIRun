# Instruções para agentes

Este arquivo é obrigatório para qualquer sessão autônoma no WWIIRun.

## Ordem de leitura

1. RTK.md
2. `docs/memory/PROJECT.md`
3. `docs/memory/CURRENT_STATE.md`
4. `docs/memory/DECISIONS.md`
5. especificação do item em execução
6. documentos arquiteturais apontados pela especificação

Não carregue toda a documentação por padrão. Use `docs/README.md` para localizar apenas o contexto necessário.

## Fluxo SDD

- Não implemente feature sem uma spec com objetivo, fora de escopo, critérios de aceitação e testes.
- Respeite o lifecycle: `Ready → Specified → In progress → In review → Done`, com retorno por `Changes requested`.
- Somente uma revisão independente pode mover um item de `In review` para `Done`.
- Se a mudança altera uma decisão estrutural, crie um ADR antes do código.
- Faça mudanças pequenas, rastreáveis a um ID do roadmap e sem ampliar o escopo silenciosamente.
- Preserve separação entre `simulation` (puro e determinístico), `game` (Phaser), `app` (UI), `content` e `services`.
- Dependências do núcleo apontam para dentro. O núcleo nunca importa Phaser, DOM, relógio, rede, storage ou locale.
- Não use `Math.random()`, `Date.now()` ou timers de parede no núcleo de simulação.
- Novos objetos de gameplay exigem definição de conteúdo, hitbox explícita, testes e documentação de asset.
- Cosméticos não podem modificar regras ou geometria competitiva.
- Não altere arquivos fora do escopo nem sobrescreva mudanças do usuário.

## Definição de pronto

Uma tarefa só está pronta quando:

- critérios da spec foram atendidos;
- testes relevantes foram criados e estão verdes;
- lint, typecheck e build passam;
- determinismo foi verificado quando aplicável;
- orçamento de performance foi medido quando aplicável;
- documentação, matriz de requisitos e memória foram atualizadas;
- não há segredo, asset sem licença ou dependência paga obrigatória.

## Encerramento da sessão

Atualize `docs/memory/CURRENT_STATE.md` com: realizado, validações, pendências, riscos e próximo passo exato. Registre decisões duráveis em ADR/`DECISIONS.md`, não em texto solto. Use o template `docs/templates/SESSION-HANDOFF-TEMPLATE.md` quando a passagem for extensa.

## Skills do lifecycle

- `$next-roadmap-item`: orquestrar exatamente um item elegível por especificação, implementação, revisão independente e no máximo duas correções, em contextos separados com configurações de modelo por papel quando suportadas. Pode aprovar automaticamente specs técnicas completas; matérias humanas reservadas bloqueiam o fluxo.
- `$specify-roadmap-item`: produzir a spec sem implementar.
- `$implement-roadmap-item`: implementar uma spec aprovada e enviar para revisão.
- `$review-roadmap-item`: revisar independentemente e aprovar ou solicitar mudanças.
- `$audit-determinism`: auditar o contrato determinístico sem alterar golden outputs.
- `$audit-roadmap-phase`: validar exit criteria antes de avançar uma fase.

## Ferramentas e autonomia

- Prefira `rg`/`rg --files` para inspeção.
- Use testes focados durante a implementação e o gate completo antes da entrega.
- Para decisões técnicas internas, reversíveis e sem impacto nas matérias reservadas abaixo, o agente deve escolher a alternativa que considera tecnicamente melhor, registrar o racional na spec/ADR quando durável e prosseguir sem pedir confirmação. O proprietário delegou essas escolhas às recomendações dos agentes.
- Não faça deploy, publique pacote, compre serviço, altere backend de produção nem envie mudanças ao GitHub sem autorização explícita.
- Peça decisão humana para economia monetária, política de privacidade, termos, licenças, identidade visual final e mudanças que invalidem saves ou placares.

## Commits

Todos os commits produzidos por agentes devem usar autor e committer `Codex <codex@openai.com>`.

Formato sugerido: `tipo(roadmap-id): resumo`, por exemplo `feat(F1-03): add seeded spawn scheduler`. Um commit deve representar uma unidade coerente e testada.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

When the user types `/graphify`, use the installed graphify skill or instructions before doing anything else.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- Dirty graphify-out/ files are expected after hooks or incremental updates; dirty graph files are not a reason to skip graphify. Only skip graphify if the task is about stale or incorrect graph output, or the user explicitly says not to use it.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
