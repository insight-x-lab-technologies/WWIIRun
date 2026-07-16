# ADR-0011: pools limitados determinísticos e grade espacial canônica

Status: Accepted  
Data: 2026-07-15  
Decisores: proprietário do projeto, por delegação D-007/D-008, e agente técnico

## Contexto

F1-02 fornece uma aeronave e narrow phase composto puro, mas ainda não há coleções de entidades, reutilização previsível de memória ou filtro de pares. Projetar pools somente no Phaser criaria uma fonte de verdade visual; usar arrays dinâmicos, `Set` ou ordem incidental de objetos deixaria o resultado e o hash dependentes de alocação/iteração. A solução precisa preparar projéteis, inimigos e moedas sem antecipar arma, IA, drops, economia ou física do motor.

## Opções consideradas

- coleções dinâmicas e filtro quadrático: implementação curta, mas GC e custo crescem com o stress; a ordem e o overflow ficam implícitos;
- pools somente no adapter Phaser: reduz objetos gráficos, mas separa visual de estado e não reduz pares no core;
- árvore/quadtree com objetos mutáveis: pode reduzir pares em distribuições esparsas, mas traz ordenação, rebalanceamento e alocação mais complexos antes de haver workload medido;
- slots pré-alocados, capacidade fixa, ordem por slot e grade uniforme inteira reconstruída por tick: custo e overflow explícitos, sem fonte de entropia, e suficiente para os limites iniciais.

## Decisão

F1-03 introduz no `simulation` pools pré-alocados e de capacidade fixa para `projectile`, `enemy` e `coin`. Cada slot tem índice estável, estado inativo canônico e ID derivado exclusivamente de `(kind, slot)`. Ativação procura a partir de um cursor circular canônico; ao esgotar a capacidade retorna falha explícita e não descarta, cresce ou escolhe uma entidade arbitrariamente. Desativação restaura todos os campos ao sentinela canônico. Iteração, atualização, hash e emissão de candidatos percorrem slots ativos em ordem crescente.

O estado da run e sua serialização avançam para layout/hash v3. O hash inclui capacidades/versionamento, cursores e todos os campos que possam afetar uma transição futura; o corpus v1 e v2 é histórico e imutável. A mudança é interna enquanto F1 não estiver publicado, mas qualquer alteração posterior de layout/caps/ordem exige versão e goldens novos.

A broad phase é uma grade uniforme de células inteiras, tamanho e limites fixos. Ela é um scratchpad reconstruído in-place a cada tick, não entra no hash e nunca decide resultado por ordem de inserção: pares candidatos são normalizados e visitados em ordem lexical estável de IDs. Entidades cujo AABB cobre várias células são deduplicadas por par; fora dos limites ou acima do cap de células, a ativação/atualização falha fechada antes de publicar estado parcial. A narrow phase existente continua a única autoridade geométrica.

Os limites iniciais são técnicos de stress, não balanceamento: no máximo 256 projéteis, 64 inimigos, 128 moedas e 64 ocupações de célula por entidade. Os valores de hitbox, HP, dano, cadência, IA, coleta e drop continuam pertencendo aos itens posteriores. Placeholders geométricos de diagnóstico usam definitions/hitboxes explícitas e não requerem raster, licença ou identidade visual final.

## Consequências

- F1-04/F1-06 recebem API determinística para ativar/desativar entidades, mas precisam definir comportamento, dano, drops e apresentação próprios;
- o core mantém arrays e scratch buffers após warm-up; o adapter Phaser pode ter pools espelhados, mas só projeta snapshots e não altera slots;
- será necessário medir contagem de candidatos, deduplicação, caps e identidades reutilizadas; o microprobe não prova FPS físico nem substitui a matriz F0;
- save/replay publicado não existe; uma run v2 em memória não é compatível com v3 e é descartada no reload. Não há invalidação de save/score publicado;
- uma grade muito esparsa ou muito densa pode justificar ADR sucessora após profiling com a slice, nunca uma troca silenciosa de algoritmo.
