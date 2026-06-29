# Matriz de performance

Workload: `tier-base-stress-v1`

Schema: `wwiirun.performance-report.v1`

O desktop Windows, o iPhone 17 e o Galaxy Tab S9 possuem três execuções físicas distintas no commit abaixo. O coletor usado nessas execuções gerou 119 janelas/595 s; ADR-0007 aceita essa cobertura para F0 sem presumir resultado para os cinco segundos ausentes. Os três trios são avaliáveis como `fail`, com valores e failures preservados. Por decisão explícita do proprietário, o desktop Windows substitui o ThinkPad como papel obrigatório de F0. Emulação não conta como aparelho físico.

| Papel | Modelo físico disponível | Ambiente antes da coleta | Estado |
|---|---|---|---|
| `desktop-primary` | desktop customizado | Intel Core i5-9600KF, NVIDIA GeForce RTX 2060 SUPER, 16 GiB, Windows 11 Pro 25H2, Chrome 149 | Trio válido com findings; 595/600 s aceitos para F0 |
| `iphone-primary` | iPhone 17 | Apple A19 (6 núcleos), Apple GPU (5 núcleos), 8 GiB, Safari; SO não informado no trio | Trio válido com finding; 595/600 s aceitos para F0 |
| `tablet-ios` | iPad 10ª geração | confirmar variante, RAM disponível, iPadOS e Safari | A medir antes de fechar F1 |
| `tablet-android` | Samsung Galaxy Tab S9 | Snapdragon 8 Gen 2, Adreno 740, 8 GiB, Chrome 149; SO não informado no trio | Trio válido com findings; 595/600 s aceitos para F0 |
| `desktop-integrated` | Lenovo ThinkPad T430u | coleta histórica incompleta; Linux Mint/Chrome 147, CPU/GPU não identificadas com precisão | Cobertura futura; substituído no exit de F0 por decisão do proprietário |

## Resultados

| Papel | Commit | Run 1 | Run 2 | Run 3 | Avaliação | Findings |
|---|---|---|---|---|---|---|
| `desktop-primary` | `1d75de79e7f5f340787a88e7d018a3a406bf59c0` | válido / `fail` | válido / `fail` | válido / `fail` | `fail` | 595 s aceitos; frame p95 `16,80 ms` e quatro Long Tasks falharam nas três |
| `iphone-primary` | `1d75de79e7f5f340787a88e7d018a3a406bf59c0` | run 02: válido / `fail` | run 03: válido / `fail` | run 04: válido / `fail` | `fail` | 595 s aceitos; frame p95 `17 ms` falhou nas três; Long Task/heap `unsupported` |
| `tablet-ios` | — | pendente | pendente | pendente | `not-evaluated` | coleta física pendente |
| `tablet-android` | `1d75de79e7f5f340787a88e7d018a3a406bf59c0` | run 02: válido / `fail` | run 03: válido / `fail` | run 04: válido / `fail` | `fail` | 595 s aceitos; frame p95/Long Tasks e failures adicionais da run 03 preservados |
| `desktop-integrated` | `1d75de79e7f5f340787a88e7d018a3a406bf59c0` | uma run histórica / `fail` | duplicata | ausente | `not-evaluated` | ThinkPad não forma trio e não é usado para o exit de F0 |

O resumo só muda para `pass` ou `fail` quando os três JSONs são válidos, distintos, comparáveis e têm cobertura aceita. Para os baselines F0, ADR-0007 aceita 119 janelas; relatórios futuros exigem 120. Valores que falharam permanecem registrados e não são substituídos por expected novo.

## Intake físico de 2026-06-28 a 2026-06-29

Detalhes, hashes e classificação dos arquivos estão em [2026-06-28-intake.md](baselines/2026-06-28-intake.md).

- Desktop Windows: as runs 01–03 são válidas, distintas e ambientalmente comparáveis. Com a exceção de 595 s do ADR-0007, o trio resulta em `fail` por frame p95 `16,80 ms` e quatro Long Tasks nas três.
- ThinkPad: a coleta histórica contém uma única execução válida e não participa do conjunto obrigatório após a substituição autorizada. A ausência de trio integrado permanece risco futuro.
- iPhone: runs 02–04 são válidas, distintas e ambientalmente comparáveis. Com a exceção de 595 s, o trio resulta em `fail` por frame p95 `17 ms`; Long Task e heap são `unsupported`, e profiler manual permanece `unavailable` por ausência de Mac.
- Galaxy Tab S9: runs 02–04 são válidas, distintas e ambientalmente comparáveis. Com a exceção de 595 s, o trio resulta em `fail` por frame p95/Long Tasks; run 03 também falha FPS mínimo/heap.
- Todos os relatórios aceitos registram cinco ciclos e quatro transições. Energia, temperatura e SO ficaram `unknown`; isso reduz o detalhe ambiental, mas não foi representado como valor conhecido ou `pass`.
- Os valores que falharam permanecem intactos. Otimização ou revisão de threshold, se tecnicamente justificada, pertence a item corretivo separado.
