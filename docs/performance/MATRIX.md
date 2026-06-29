# Matriz de performance

Workload: `tier-base-stress-v1`

Schema: `wwiirun.performance-report.v1`

O desktop Windows, o iPhone 17 e o Galaxy Tab S9 possuem três execuções físicas distintas no commit abaixo. O coletor usado nessas execuções gerou apenas 119 janelas e deixou os cinco segundos finais fora da avaliação; por isso os trios são evidência histórica, mas o avaliador corrigido os classifica `not-evaluated`. Os valores e failures originais permanecem preservados. Por decisão explícita do proprietário, o desktop Windows substitui o ThinkPad como papel obrigatório de F0. Emulação não conta como aparelho físico.

| Papel | Modelo físico disponível | Ambiente antes da coleta | Estado |
|---|---|---|---|
| `desktop-primary` | desktop customizado | Intel Core i5-9600KF, NVIDIA GeForce RTX 2060 SUPER, 16 GiB, Windows 11 Pro 25H2, Chrome 149 | Recoleta obrigatória para F0; trio histórico cobre 595/600 s |
| `iphone-primary` | iPhone 17 | Apple A19 (6 núcleos), Apple GPU (5 núcleos), 8 GiB, Safari; SO não informado no trio histórico | Recoleta obrigatória para F0; trio histórico cobre 595/600 s |
| `tablet-ios` | iPad 10ª geração | confirmar variante, RAM disponível, iPadOS e Safari | A medir antes de fechar F1 |
| `tablet-android` | Samsung Galaxy Tab S9 | Snapdragon 8 Gen 2, Adreno 740, 8 GiB, Chrome 149; SO não informado no trio histórico | Recoleta futura; trio histórico cobre 595/600 s |
| `desktop-integrated` | Lenovo ThinkPad T430u | coleta histórica incompleta; Linux Mint/Chrome 147, CPU/GPU não identificadas com precisão | Cobertura futura; substituído no exit de F0 por decisão do proprietário |

## Resultados

| Papel | Commit | Run 1 | Run 2 | Run 3 | Avaliação | Findings |
|---|---|---|---|---|---|---|
| `desktop-primary` | `1d75de79e7f5f340787a88e7d018a3a406bf59c0` | histórico / `fail` | histórico / `fail` | histórico / `fail` | `not-evaluated` | cobertura incompleta; frame p95 `16,80 ms` e quatro Long Tasks originalmente falharam nas três |
| `iphone-primary` | `1d75de79e7f5f340787a88e7d018a3a406bf59c0` | run 02: histórico / `fail` | run 03: histórico / `fail` | run 04: histórico / `fail` | `not-evaluated` | cobertura incompleta; frame p95 `17 ms` originalmente falhou nas três; Long Task/heap `unsupported` |
| `tablet-ios` | — | pendente | pendente | pendente | `not-evaluated` | coleta física pendente |
| `tablet-android` | `1d75de79e7f5f340787a88e7d018a3a406bf59c0` | run 02: histórico / `fail` | run 03: histórico / `fail` | run 04: histórico / `fail` | `not-evaluated` | cobertura incompleta; frame p95/Long Tasks e failures da run 03 permanecem históricos |
| `desktop-integrated` | `1d75de79e7f5f340787a88e7d018a3a406bf59c0` | uma run histórica / `fail` | duplicata | ausente | `not-evaluated` | ThinkPad não forma trio e não é usado para o exit de F0 |

O resumo só muda para `pass` ou `fail` quando os três JSONs válidos, distintos, comparáveis e com 120 janelas são avaliáveis. Valores históricos que falharam permanecem registrados; não são substituídos por expected novo.

## Intake físico de 2026-06-28 a 2026-06-29

Detalhes, hashes e classificação dos arquivos estão em [2026-06-28-intake.md](baselines/2026-06-28-intake.md).

- Desktop Windows: as runs 01–03 são distintas e ambientalmente comparáveis, mas cobrem somente 595/600 s e agora resultam em `not-evaluated`. Frame p95 `16,80 ms` e quatro Long Tasks falharam originalmente nas três.
- ThinkPad: a coleta histórica contém uma única execução válida e não participa do conjunto obrigatório após a substituição autorizada. A ausência de trio integrado permanece risco futuro.
- iPhone: runs 02–04 são distintas e ambientalmente comparáveis, mas cobrem somente 595/600 s e agora resultam em `not-evaluated`. Frame p95 `17 ms` falhou originalmente nas três. Long Task e heap são `unsupported`; profiler manual permanece `unavailable` por ausência de Mac.
- Galaxy Tab S9: runs 02–04 são distintas e ambientalmente comparáveis, mas cobrem somente 595/600 s e agora resultam em `not-evaluated`. Frame p95/Long Tasks e os failures adicionais da run 03 permanecem registrados como observações históricas.
- Todos os relatórios aceitos registram cinco ciclos e quatro transições. Energia, temperatura e SO ficaram `unknown`; isso reduz o detalhe ambiental, mas não foi representado como valor conhecido ou `pass`.
- Os valores que falharam permanecem intactos. Otimização ou revisão de threshold, se tecnicamente justificada, pertence a item corretivo separado.
