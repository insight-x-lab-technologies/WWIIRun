# Matriz de performance

Workload: `tier-base-stress-v1`  
Schema: `wwiirun.performance-report.v1`

Nenhum papel possui baseline temporal aprovado ainda. Versões, hardware exato e resultados são preenchidos durante a coleta; emulação não conta como aparelho físico.

| Papel | Modelo físico disponível | Ambiente antes da coleta | Estado |
|---|---|---|---|
| `desktop-primary` | Lenovo ThinkPad T430u | confirmar CPU, GPU integrada, RAM, versão do Windows e browser | A medir; obrigatório para F0 |
| `iphone-primary` | iPhone 17 | confirmar variante, iOS e Safari | A medir; obrigatório para F0 |
| `tablet-ios` | iPad 10ª geração | confirmar variante, RAM disponível, iPadOS e Safari | A medir antes de fechar F1 |
| `tablet-android` | Samsung Galaxy Tab S9 | confirmar variante, RAM, Android e Chrome | A medir antes de fechar F1 |
| `desktop-discrete` | desktop Intel Core i5-9600KF | confirmar RAM, Windows/browser e GPU; “GeForce RTX 2600 SUPER” foi o modelo informado e precisa ser corrigido ou confirmado | Adicional; não substitui desktop integrado |

## Resultados

| Papel | Commit | Run 1 | Run 2 | Run 3 | Avaliação | Findings |
|---|---|---|---|---|---|---|
| `desktop-primary` | — | pendente | pendente | pendente | `not-evaluated` | coleta física pendente |
| `iphone-primary` | — | pendente | pendente | pendente | `not-evaluated` | coleta física pendente |
| `tablet-ios` | — | pendente | pendente | pendente | `not-evaluated` | coleta física pendente |
| `tablet-android` | — | pendente | pendente | pendente | `not-evaluated` | coleta física pendente |
| `desktop-discrete` | — | pendente | pendente | pendente | `not-evaluated` | confirmar modelo da GPU |

O resumo só muda para `pass` quando existem três JSONs válidos e comparáveis. Valores que falham permanecem registrados e geram item corretivo; não são substituídos por expected novo.
