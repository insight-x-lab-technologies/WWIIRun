# F1-05 modular structure placeholder

Status: placeholder técnico, sem raster/runtime catalogável.

| Visual ID | Módulo | Pivot | Hitbox | Estado | Substituição |
|---|---|---|---|---|---|
| `structure.modular-block.v1` | `left` (índice 0) | pivot da estrutura + offset local inteiro | AABB explícita de gameplay | ativo, danificado, destruído/invisível | PNG/atlas preserva ID, offset, pivot e hitbox |
| `structure.modular-block.v1` | `core` (índice 1) | pivot da estrutura + offset local inteiro | AABB explícita de gameplay | ativo, danificado, destruído/invisível | PNG/atlas preserva ID, offset, pivot e hitbox |
| `structure.modular-block.v1` | `right` (índice 2) | pivot da estrutura + offset local inteiro | AABB explícita de gameplay | ativo, danificado, destruído/invisível | PNG/atlas preserva ID, offset, pivot e hitbox |

O renderer Phaser usa `Graphics` técnico pré-alocado por módulo e apenas espelha o snapshot. Não existe arquivo raster, atlas, áudio, licença, proveniência ou entrada no catálogo executável nesta etapa. Arte futura pode variar por HP, mas não pode alterar slot, módulo, offset, HP, dano, hitbox, ordem ou hash.
