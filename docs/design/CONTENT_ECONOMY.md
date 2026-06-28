# Conteúdo, hangar, conquistas e economia

## Moedas

Separar no modelo:

- `runCoins`: coletadas durante a run;
- `walletCoins`: saldo persistente confirmado;
- `purchasedCoins`: origem contábil/auditável, se compras forem ativadas.

Conversão e bônus são versionados. Operações usam ledger/idempotency no backend quando online; nunca confiar em `walletCoins` enviado pelo cliente para compras de valor real. O jogo continua útil sem compra.

## Hangar: catálogo alvo de 20 aeronaves

Os nomes são provisórios e fictícios para evitar promessa histórica/uso indevido de marcas. O catálogo final terá fichas balanceadas.

| Tier | Arquétipos (4 por tier) | Diferenciação pretendida |
|---|---|---|
| I | Cadet, Swift, Bulwark, Scavenger | base, velocidade, vida, ímã curto |
| II | Sentinel, Gunner, Courier, Lucky Ace | escudo inicial, canhão, coleta, drop |
| III | Night Owl, Storm Rider, Frostwing, Treasurer | noite, vento, neve, moedas x2 |
| IV | Ironclad, Glass Cannon, Pathfinder, Mechanic | tanque, dano/fragilidade, gaps, reparo |
| V | Phantom, Magnetar, Golden Ace, Veteran | dash/evasão, ímã permanente, moedas x3, híbrida |

“Moedas x2/x3” exige cuidado: em desafios normalizados o perk é desligado ou todos usam o mesmo loadout. Cada aeronave define stats dentro de budget, perk explícito, custo, requisito, visual ID e hitbox competitiva. Skins não mudam hitbox.

## Upgrades

Três categorias possíveis, entregues gradualmente:

- dentro da run: temporários e parte do replay;
- hangar: desbloqueios/metaprogressão usados em Endless;
- cosméticos: sem regra e permitidos em todos os modos.

Evitar árvore persistente ilimitada que torne skill irrelevante. Moeda deve ter sinks claros, preços simulados e sem loot box paga.

## Conquistas e troféus

Definitions contêm ID, versão, texto i18n, condição, progresso, recompensa e visibilidade. Exemplos: primeira run, distância, destruições por arma, run sem dano, coleção, clima e nível máximo. Conquista local pode sincronizar; troféu competitivo só é emitido pelo servidor.

Troféus Daily Bronze/Prata/Ouro (3º/2º/1º) registram challenge ID, posição e data. Job de fechamento idempotente impede duplicação.

## Loja e expansões

Loja apresenta catálogo, preço/moeda, status e restauração. Para GitHub Pages, pagamento abre provedor externo; concessão exige webhook/código verificável no backend. Link de doação não concede entitlement automaticamente.

Ko-fi/Buy Me a Coffee são adequados para apoio, mas a viabilidade de venda/licenciamento automático precisa ser validada contra APIs, termos, impostos e políticas das lojas no momento de F6. Sem integração segura, lançar somente doação e conteúdo gratuito.

Expansões podem trocar período/tema (inclusive jurássico), aeronaves visuais, inimigos, obstáculos, backgrounds, UI, música e SFX, mas mapeiam os mesmos IDs/regras. Não podem anunciar “nova mecânica” no mesmo leaderboard.

## Balanceamento econômico

Antes de definir preços:

1. medir moeda/hora por percentis de habilidade;
2. definir tempo desejado por unlock e teto de grind;
3. simular 100+ horas e todas as compras;
4. testar ausência de dead ends e overflow;
5. publicar claramente o que é cosmético ou afeta apenas Endless.

Valores monetários não devem entrar no código até revisão legal/plataforma.
