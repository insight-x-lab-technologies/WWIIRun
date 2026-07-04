# SPEC-F0-01: documentação base, requisitos, ADRs, templates e memória

Status: Done
Owner: proprietário do projeto
Requisitos: `AGENT-01`
Dependências: nenhuma; remedia retrospectivamente `F0-PHASE-LIFECYCLE-01` da auditoria de fase F0

## Problema e resultado

F0-01 foi marcado `Done` antes de existir uma spec própria e antes de uma revisão independente. A documentação fundacional está presente e vem sendo usada pelos itens F0-02 a F0-08, mas o estado atual não permite verificar, por um contrato rastreável, se ela cobre visão, requisitos, decisões, templates, memória e operação autônoma sem depender da conversa que a originou.

O resultado deste item é uma base documental navegável e coerente que permita a uma sessão nova localizar o contexto mínimo, selecionar um único item elegível, distinguir requisito de decisão e estado corrente, produzir uma spec/ADR/handoff pelos templates e entregar o trabalho para revisão independente. Como a implementação material já existe, a execução desta spec é uma verificação retrospectiva e uma correção de lifecycle; ela não autoriza reescrever a história, ampliar produto nem alterar runtime.

## Escopo

- Incluído:
  - instruções universais em `AGENTS.md` e fluxo SDD em `docs/operations/AGENTIC_DEVELOPMENT.md`;
  - índice e hierarquia documental em `docs/README.md`;
  - visão, requisitos rastreáveis e decisões humanas abertas em `docs/product/`;
  - arquitetura, design e qualidade fundacionais apontados pelo índice;
  - roadmap com IDs, dependências, estados e exit criteria;
  - ADRs fundacionais `ADR-0001` a `ADR-0003`, seus estados e resumo em memória;
  - templates de spec, ADR, asset e handoff;
  - memória dividida entre projeto estável, estado corrente, decisões e glossário;
  - rastreabilidade de `AGENT-01` até esta spec e evidência documental verificável;
  - inventário do baseline histórico e da unidade documental usada para fechar a lacuna de lifecycle;
  - correções documentais estritamente necessárias para satisfazer os critérios abaixo, se a verificação encontrar inconsistências.
- Fora de escopo:
  - qualquer alteração em `src/`, `tests/`, `assets/`, dependências, lockfile, configurações de build/teste, workflows, scripts ou artefatos de runtime;
  - revalidar ou modificar comportamento, golden outputs, baselines de performance, thresholds, assets ou evidências de F0-02 a F0-08;
  - atribuir retrospectivamente a F0-01 runtime que entrou no mesmo commit histórico da documentação;
  - mudar arquitetura, regras determinísticas, schemas, cache PWA ou decisões aceitas por ADRs posteriores;
  - criar requisitos de gameplay, resolver decisões humanas abertas ou promover requisitos futuros a `Done`;
  - fechar a fase F0; isso pertence a uma nova execução de `$audit-roadmap-phase F0` depois da revisão independente deste item.

## Regras e contratos

### Corpus e fontes de verdade

- `docs/README.md` deve servir como índice canônico e apontar para produto, arquitetura, design, qualidade, roadmap, specs, memória e todos os templates obrigatórios.
- `docs/product/REQUIREMENTS.md` deve manter IDs únicos, texto verificável, fase/item de roadmap e um estado do vocabulário declarado. `AGENT-01` deve apontar para esta spec como sua evidência de F0 sem perder o estado `Done` já sustentado pelo uso efetivo do processo.
- `docs/roadmap/ROADMAP.md` é a fonte de estado e dependências dos itens. Durante a remediação, F0-01 deve seguir `Specified → In progress → In review`; somente uma revisão independente pode restaurar `Done`.
- `docs/adr/0001-stack-and-boundaries.md`, `0002-deterministic-simulation.md` e `0003-cosmetic-content-packs.md` são as decisões fundacionais de F0-01. ADRs 0004–0009 permanecem evidência de itens posteriores e só precisam continuar corretamente indexados; seu conteúdo não pertence a esta remediação.
- `docs/memory/PROJECT.md` contém contexto estável; `CURRENT_STATE.md`, situação operacional e próximo passo; `DECISIONS.md`, resumo e links para decisões duráveis; `GLOSSARY.md`, vocabulário compartilhado. Informação durável não deve existir somente em `CURRENT_STATE.md`.
- O baseline histórico é verificável no commit `95f9b5e`, que adicionou o corpus documental junto com trabalho de outros itens. Esse commit prova anterioridade/existência, mas não é uma unidade isolada de F0-01 e não deve ser descrito como tal.

### Conteúdo mínimo e consistência

- As instruções devem definir ordem de leitura, lifecycle, fronteiras arquiteturais, definição de pronto, encerramento da sessão, autonomia e ações reservadas ao proprietário.
- O fluxo SDD deve distinguir roadmap, spec, ADR, implementação, evidência, memória, revisão independente e auditoria de fase.
- A visão e os requisitos não podem apresentar como decididas matérias ainda abertas em `OPEN_DECISIONS.md`, especialmente licença, identidade visual final, privacidade/termos, pagamentos e migrações destrutivas.
- Cada ADR fundacional deve declarar status, contexto, opções, decisão e consequências; `DECISIONS.md` deve resumir sem contradizer o ADR.
- Os quatro templates devem conter campos suficientes para seus usos: contrato/testes/revisão em spec; contexto/opções/consequências em ADR; licença/proveniência e contrato visual em asset; estado/validações/pendências/próximo passo em handoff.
- Links Markdown relativos no corpus em escopo devem resolver para arquivos existentes. Referências intencionalmente literais dentro de exemplos ou templates não contam como links navegáveis.
- Nenhum documento pode alegar comando, revisão ou medição como executado sem resultado registrado. Evidência histórica deve manter origem, data/commit quando disponível e limitações.

### Invariantes da remediação

- A unidade de F0-01 após `4440b7a` pode alterar somente esta spec e arquivos de documentação/lifecycle necessários para índice, requisito, roadmap e memória. Alterações preexistentes de outras sessões devem ser identificadas e preservadas, não absorvidas silenciosamente na unidade.
- Nenhum arquivo de runtime, teste executável, asset, workflow, configuração, dependência, golden ou baseline pode mudar para fechar F0-01.
- A revisão deve avaliar o corpus atual e o histórico sem restaurar versões antigas sobre correções posteriores.
- Uma inconsistência documental encontrada deve falhar fechada: registrar finding e retornar `Changes requested`; não reinterpretar silenciosamente o critério para produzir aprovação.
- Não há ADR novo: esta spec formaliza e verifica decisões já registradas, sem introduzir escolha estrutural.

### Aplicabilidade não funcional

- Determinismo: não aplicável à implementação; a documentação deve preservar os contratos existentes e não alterar simulation ou goldens.
- Performance e UI responsiva: não aplicáveis; baselines, budgets, viewports e resultados existentes permanecem inalterados.
- Assets e i18n: não aplicáveis; nenhum asset, licença, catálogo, texto de produto ou locale é criado/modificado.
- Save e migração: não aplicáveis; nenhum schema, dado persistido ou ruleset é alterado.
- Segurança e privacidade: aplicável somente como limite documental; nenhuma credencial/dado pessoal é criado e matérias de privacidade continuam reservadas ao proprietário.
- Offline/distribuição: não aplicáveis; PWA, workflow Pages e evidência publicada permanecem sob F0-07.

## Critérios de aceitação

- [x] Given uma sessão sem contexto de conversa, when ela segue `AGENTS.md`, `docs/README.md` e a memória, then localiza a ordem de leitura, a fonte de verdade de requisitos/decisões, o item corrente e o próximo prompt exato sem carregar toda a documentação.
- [x] Given o corpus em escopo, when os links Markdown locais são enumerados e resolvidos, then nenhum link navegável aponta para arquivo inexistente e o índice cobre produto, arquitetura, design, qualidade, roadmap, specs, memória e os quatro templates.
- [x] Given `docs/product/REQUIREMENTS.md`, when IDs, estados e mapeamentos são inspecionados, then os IDs são únicos, usam somente estados declarados, referenciam fases/itens existentes e `AGENT-01` está `Done` com link para F0-01 e evidência de uso/revisão.
- [x] Given `docs/roadmap/ROADMAP.md`, when F0-01 é verificado antes da revisão independente, then ele não está `Done`, não possui dependência e segue o lifecycle definido sem alterar os estados aprovados de F0-02 a F0-08.
- [x] Given ADR-0001 a ADR-0003 e `docs/memory/DECISIONS.md`, when status, contexto, opções, decisão e consequências são comparados, then os ADRs estão completos, indexados e resumidos sem contradição; ADR-0004 a ADR-0009 permanecem atribuídos aos itens posteriores.
- [x] Given os templates de spec, ADR, asset e handoff, when comparados aos usos descritos pelo processo SDD, then cada um contém os campos mínimos definidos nesta spec e não incorpora segredo nem decisão específica de produto.
- [x] Given os quatro documentos de memória, when responsabilidades e atualidade são inspecionadas, then contexto estável, estado corrente, decisões e glossário estão separados, `CURRENT_STATE.md` registra realizado/validações/pendências/riscos e aponta para a próxima ação de F0-01.
- [x] Given visão, requisitos e decisões abertas, when matérias reservadas são comparadas, then licença, identidade visual, privacidade/termos, pagamentos, regras publicadas e migração destrutiva não aparecem como resolvidas sem decisão humana registrada.
- [x] Given o histórico Git e a unidade de remediação, when arquivos e commits são inspecionados, then `95f9b5e` é tratado apenas como baseline histórico misto e a mudança de F0-01 é documental, rastreável e separável das alterações preexistentes de F0-07/auditorias.
- [x] Given o diff da unidade F0-01, when caminhos e conteúdo são auditados, then nenhum runtime, teste executável, asset, dependência, lockfile, workflow, configuração, golden, baseline ou evidência histórica foi alterado/apagado.
- [x] Given a spec aprovada e a verificação documental concluída, when uma sessão independente executa `$review-roadmap-item F0-01`, then ela consegue reproduzir todas as verificações apenas com o repositório e registrar verdict/findings no histórico desta spec.

## Plano de teste

- unitário: não aplicável; F0-01 não introduz código nem teste executável.
- determinismo: confirmar por inventário/diff que `src/simulation`, `tests/determinism` e goldens não fazem parte da unidade; não regenerar nem reexecutar corpus como evidência deste item.
- integração/E2E: não aplicável; navegador, PWA e runtime pertencem a outros itens. A evidência existente não deve ser apagada ou reclassificada.
- documental/manual:
  - enumerar os arquivos do corpus e conferir navegação a partir de `docs/README.md`;
  - resolver links Markdown locais por inspeção/script temporário não versionado, distinguindo URLs externas e exemplos literais;
  - verificar unicidade dos IDs, vocabulário de status e referências de roadmap em `REQUIREMENTS.md`;
  - comparar ADR-0001 a ADR-0003 com o template e `DECISIONS.md`;
  - comparar os quatro templates com os campos mínimos desta spec;
  - inspecionar separação/atualidade dos quatro documentos de memória;
  - auditar `git show --stat 95f9b5e`, o diff da unidade de remediação e `git diff --check`;
  - registrar comandos e resultados reais somente durante implementação/revisão.
- gate proporcional: como a unidade é somente Markdown/lifecycle, não requer `npm ci`, build, coverage, E2E, performance ou rede. Se qualquer arquivo executável/configuração entrar no diff, o escopo foi violado e a revisão deve falhar em vez de ampliar os gates.

## Migração e rollback

Não há migração de save, schema, asset, ruleset, placar, PWA ou dado externo. A remediação é aditiva: cria o contrato ausente e corrige apenas rastreabilidade/lifecycle.

O rollback seguro da unidade futura de F0-01 remove/reverte a spec e suas atualizações de índice, requisito, roadmap e memória, sem apagar nem restaurar o corpus documental histórico e sem tocar nas unidades aprovadas F0-02 a F0-08. Antes da revisão, rollback volta a expor `F0-PHASE-LIFECYCLE-01`; portanto não autoriza fechar F0. Alterações preexistentes no worktree não pertencentes a F0-01 devem permanecer intactas.

## Evidências de conclusão

Verificação retrospectiva executada em 2026-07-04, exclusivamente sobre documentação e lifecycle:

- unidade atribuível a F0-01: `docs/specs/SPEC-F0-01-documentation-foundation.md`, `docs/specs/README.md`, `docs/product/REQUIREMENTS.md`, `docs/roadmap/ROADMAP.md` e `docs/memory/CURRENT_STATE.md`; `AGENTS.md`, `RTK.md`, a spec F0-07 e os relatórios de auditoria já estavam alterados/não rastreados na inspeção inicial e permanecem fora desta unidade;
- auditor temporário Node, não versionado, enumerou 60 arquivos Markdown (`AGENTS.md` + `docs/**/*.md`), resolveu 68 links locais navegáveis e encontrou zero destino ausente; URLs externas, âncoras vazias e conteúdo em fences foram excluídos conforme o contrato;
- auditor temporário de requisitos encontrou 38 IDs, zero duplicata, zero status fora de `Planned | In progress | Done | Deferred` e zero referência F0–F8/F0-01–F0-08 inexistente; `AGENT-01` permaneceu `Done` e aponta para esta spec;
- auditor estrutural confirmou todas as categorias do índice, ADR-0001 a ADR-0003 em `Accepted` com contexto/opções/decisão/consequências e os quatro templates com seus campos mínimos; inspeção comparativa de `DECISIONS.md` confirmou os resumos sem contradição e preservou ADR-0004 a ADR-0009 como decisões de itens posteriores;
- inspeção dos quatro documentos de memória confirmou separação entre contexto estável, estado corrente, decisões e glossário. `CURRENT_STATE.md` usa as seções `Concluído`, `Próximo passo exato`, `Bloqueios` e `Validações, pendências e riscos da sessão`, cobrindo o handoff exigido;
- comparação de `VISION.md`, `REQUIREMENTS.md`, `OPEN_DECISIONS.md`, `PROJECT.md` e `AGENTS.md` manteve licença, identidade visual final, privacidade/termos, pagamentos, regras publicadas e migração destrutiva como matérias humanas abertas/reservadas;
- `git show --stat --oneline --summary 95f9b5e` confirmou 76 arquivos/5.410 inserções, misturando o corpus documental com skills, workflow, configuração, dependências, runtime e testes; o commit é apenas baseline histórico, não unidade isolada de F0-01;
- `git diff --name-only 4440b7a` e a inspeção inicial de `git status --short --branch` separaram alterações preexistentes. O scan focado de `src`, `tests`, `assets`, manifestos, lockfile, configs, workflows e scripts retornou vazio; nenhum runtime, teste executável, asset, dependência, golden, baseline ou evidência foi alterado;
- `git diff --check` passou. Por proporcionalidade explícita da spec, `npm ci`, lint, typecheck, unit, determinismo, build, E2E, performance e rede não foram executados nem alegados como evidência de F0-01.

Limitações: os auditores Node foram comandos efêmeros e não integram a árvore; a revisão independente deve repeti-los a partir dos comandos/resultados descritos neste registro. A unidade ainda não foi commitada e permanece sobre um worktree com mudanças documentais preexistentes claramente inventariadas.

## Histórico de revisão

- 2026-07-04 — spec retrospectiva criada para remediar `F0-PHASE-LIFECYCLE-01`; nenhuma decisão humana permanece aberta, nenhum ADR novo é proposto e nenhum runtime/teste/asset/evidência é alterado. Status `Awaiting approval`; critérios ainda não executados nem marcados.
- 2026-07-04 — proprietário aprovou a spec e autorizou exclusivamente a verificação documental retrospectiva, sem alteração de runtime; status movido para `In progress` antes da execução das evidências.
- 2026-07-04 — verificação documental retrospectiva concluída: 11/11 critérios atendidos, evidências e limitações registradas, nenhum gate de runtime executado e item movido para `In review`; aguarda `$review-roadmap-item F0-01` independente.
- 2026-07-04 — revisão independente aprovada sem findings `Critical`, `High`, `Medium` ou `Low`. O revisor reproduziu 60 arquivos Markdown/68 links locais sem destinos ausentes, 38 requisitos sem duplicatas/status/referências inválidas, a estrutura dos ADRs/templates/memória, o baseline misto `95f9b5e` (76 arquivos/5.410 inserções), a separação por hunks das mudanças preexistentes de F0-07 e a ausência de caminhos de runtime/teste/asset/dependência/configuração/workflow/golden/baseline na unidade. `git diff --check` passou; gates npm/runtime permaneceram corretamente não aplicáveis. Os 11 critérios passaram e o item foi movido para `Done`.
