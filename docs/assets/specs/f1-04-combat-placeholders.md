# F1-04 combat placeholders

Status: placeholder técnico, sem raster/runtime catalogável.

| Visual ID | Entidade | Pivot | Hitbox | Direção | Substituição |
|---|---|---|---|---|---|
| `weapon.machine-gun.v1` | projétil | ponta do muzzle da aeronave | AABB 512×256 unidades (half extents) | direita | PNG/atlas conserva muzzle e hitbox canônica |
| `enemy.scout.v1` | inimigo aéreo | centro | AABB 1536×768 unidades (half extents) | esquerda | raster conserva ID, pivot e hitbox |
| `enemy.interceptor.v1` | inimigo aéreo | centro | AABB 1792×640 + círculo r384 | esquerda | raster conserva ID, pivot e hitbox |

Os desenhos Phaser são diagnósticos geométricos. Não há arquivo raster, licença, proveniência ou entrada no catálogo executável a declarar.
