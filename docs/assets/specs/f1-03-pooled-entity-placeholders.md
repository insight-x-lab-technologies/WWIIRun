# Placeholders geométricos poolados F1-03

- IDs de gameplay: `projectile.placeholder.v1`, `enemy.placeholder.v1`, `coin.placeholder.v1`;
- finalidade: observabilidade técnica de slots/pools e broad phase; não são arte final, catálogo de inimigos ou economia;
- runtime: nenhum arquivo raster/atlas/áudio é criado. O adapter Phaser usa `Graphics` reaproveitado por slot;
- orientação: projétil aponta à direita; ameaça aérea aponta à esquerda; moeda é neutra;
- pivot: centro lógico de cada entidade; posições e offsets usam unidades inteiras de simulação;
- hitbox: definida exclusivamente em `simulation` como composição explícita AABB/círculo, não derivada dos pixels;
- substituição: sprite/atlas futuro deve preservar `visualId`/pivot e jamais sobrescrever hitbox, slot, velocidade, hash ou regra;
- licença e proveniência: não aplicáveis nesta etapa porque não existe asset runtime ou fonte artística;
- validação: overlay técnico deve manter alinhamento de pivot/hitbox durante resize, exibir slots ativos e reutilizar Graphics sem criação por tick.
