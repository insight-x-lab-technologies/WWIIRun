# Baselines versionados

Crie uma pasta por data (`AAAA-MM-DD`) somente após a coleta física. Cada aparelho obrigatório precisa de três JSONs válidos no mesmo commit e workload, acompanhados pela atualização de `../MATRIX.md`.

Os trios aprovados pela exceção do ADR-0007 estão separados do intake histórico:

- `2026-06-28/`: iPhone 17 e Galaxy Tab S9;
- `2026-06-29/`: desktop Windows com Intel Core i5-9600KF e NVIDIA GeForce RTX 2060 SUPER.

Esses nove relatórios contêm 119 janelas e cobrem somente 595/600 segundos. Permanecem imutáveis e são avaliáveis para F0 conforme ADR-0007, sem presumir resultado para os cinco segundos ausentes. Novos relatórios continuam precisando de 120 janelas antes de promoção.

Não versionar amostras brutas, relatórios inválidos como baseline aprovado ou resultados de emulação tratados como hardware real.

Arquivos recebidos diretamente nesta pasta permanecem intake não aprovado até serem auditados. Duplicatas e relatórios inválidos são preservados como evidência do intake, mas não contam como repetições nem são movidos para uma pasta datada de baseline. A classificação, os hashes e os findings dos conjuntos históricos estão em [`2026-06-28-intake.md`](2026-06-28-intake.md).
