# Desenvolvimento SDD com agentes

## Modelo

SDD neste projeto significa **Specification-Driven Development**: a conversa não é a fonte de verdade; uma spec pequena, versionada e testável é. O agente lê memória, implementa um slice, valida e deixa o repositório pronto para outra sessão.

```text
Roadmap item → Feature spec → decisão/ADR (se necessário) → implementação
      ↑                                                    ↓
 memória/estado ← evidências + testes + docs ← revisão/gates
```

## Hierarquia documental

- `AGENTS.md`: regras operacionais sempre carregadas;
- `memory/PROJECT.md`: contexto estável e restrições;
- `memory/CURRENT_STATE.md`: onde continuar;
- `product/`: por quê/o quê;
- `architecture/` e ADRs: como e limites;
- `roadmap/`: ordem, dependências e estado;
- `specs/`: contrato temporário/permanente de cada incremento;
- código/testes: comportamento executável.

Evite um “documento memória” gigante. Atualize contexto estável só quando necessário e mantenha o estado corrente curto.

## Ciclo de uma sessão autônoma

1. Ler a ordem em `AGENTS.md` e verificar working tree.
2. Selecionar um único item `Ready` sem dependência aberta.
3. Criar/revisar spec: requisitos, interfaces, critérios e testes.
4. Inspecionar apenas arquivos relacionados e registrar suposições.
5. Implementar verticalmente em passos pequenos.
6. Rodar testes focados a cada passo e gates proporcionais ao risco.
7. Comparar resultado com todos os critérios, não apenas “build passa”.
8. Atualizar requirement status, roadmap, decisões e `CURRENT_STATE`.
9. Entregar resumo: arquivos, evidências, riscos e próximo passo exato.

## Modelo recomendado de sessões

A unidade de trabalho é um item pequeno do roadmap, não uma fase inteira. O Codex não deve receber “implemente a fase” nem encadear todo o roadmap sem checkpoints humanos.

- item simples e de baixo risco: uma sessão pode criar a spec, implementar, testar e atualizar a memória;
- item ambíguo ou estrutural: sessão A produz somente a spec/ADR; o proprietário aprova; sessão B implementa;
- item crítico (determinismo, save/migração, segurança/backend, pagamentos): acrescentar sessão C independente de revisão antes de considerar pronto;
- fim de fase: sessão de auditoria verifica exit criteria e requisitos, sem adicionar feature.

Não é necessário manter personagens permanentes “arquiteto” e “coder”. O papel vem do prompt e da autorização da sessão. Uma nova sessão lê o estado versionado no repositório; não depende da memória de conversa anterior.

Subagentes são auxiliares internos de uma sessão principal. Quando disponíveis e explicitamente autorizados, podem pesquisar ou revisar subtarefas independentes em paralelo e devolvem resultados ao agente principal. Eles não substituem checkpoints, não preservam memória por conta própria e podem aumentar o consumo total de tokens. Não usar subagentes para editar os mesmos contratos/arquivos simultaneamente.

Para este projeto, prefira informar o ID exato. “Faça a próxima atividade do roadmap” é aceitável apenas para trabalho rotineiro depois que o processo estiver estável; no início, pode selecionar escopo maior ou diferente do esperado.

## Granularidade

Uma sessão ideal conclui uma spec que cabe em revisão: por exemplo, “PRNG com vetores e streams”, não “implementar determinismo”; “HUD de distância/seed”, não “fazer toda UI”. Se a spec toca mais de duas fronteiras estruturais, divida em slices integráveis.

## Uso de Codex

- peça primeiro inspeção/diagnóstico quando não quiser alterações;
- para implementação, cite o ID do roadmap e peça execução até os gates;
- forneça decisões novas por escrito e peça que sejam registradas;
- use sessões separadas para feature, revisão crítica e correção de achados;
- paralelismo só em subtarefas realmente independentes; nunca dois agentes editando os mesmos contratos/arquivos;
- não aceite afirmação de teste sem saída/evidência reproduzível.

Prompt recomendado:

> Implemente `F1-03` seguindo `AGENTS.md`. Leia a memória e a spec correspondente, preserve mudanças existentes, execute os gates aplicáveis e atualize roadmap/memória. Não amplie o escopo; registre bloqueios concretos.

## Skills, instructions e tools

- `AGENTS.md` deve conter regras universais do repositório, não tutorial longo.
- Crie uma skill somente para workflow recorrente que exija passos/recursos especializados (ex.: lifecycle SDD, criar entity pack, auditar determinismo ou preparar release).
- Skill não substitui spec nem incorpora secrets. Deve indicar gatilho, inputs, sequência, validação e saída.
- Prefira scripts versionados (`npm run verify`, gerador de asset manifest, replay harness) para passos mecânicos; agentes chamam scripts em vez de reinventar comandos.
- Dê às ferramentas privilégio mínimo. Deploy, banco produtivo, pagamento e publicação exigem autorização humana.

Skills repo-local disponíveis:

1. [`specify-roadmap-item`](../../.agents/skills/specify-roadmap-item/SKILL.md): cria uma spec sem código;
2. [`implement-roadmap-item`](../../.agents/skills/implement-roadmap-item/SKILL.md): implementa uma spec aprovada e envia para revisão;
3. [`review-roadmap-item`](../../.agents/skills/review-roadmap-item/SKILL.md): executa revisão independente e decide o verdict;
4. [`audit-determinism`](../../.agents/skills/audit-determinism/SKILL.md): verifica simulação, RNG, replays e isolamento cosmético;
5. [`audit-roadmap-phase`](../../.agents/skills/audit-roadmap-phase/SKILL.md): verifica exit criteria agregados antes de fechar uma fase.

Use invocação explícita (`$nome-da-skill`) neste projeto. Itere as skills após uso real. Skills futuras como `add-game-entity` e `prepare-pwa-release` só devem nascer quando seus workflows concretos existirem.

## Revisões humanas obrigatórias

Balanceamento/economia monetária, direção de arte, licença, privacidade/termos, schema destrutivo, política de nomes, mudança de ruleset publicada, ativação de pagamentos, deploy de produção e concessão manual de entitlement/troféu.

## Controle de deriva

Ao descobrir trabalho novo, não embutir silenciosamente. Registre no roadmap/risco; só bloqueia a spec atual se for necessário para seu critério. Cada requisito deve apontar para fase/spec/teste. ADR substituído permanece no histórico com link ao sucessor.
