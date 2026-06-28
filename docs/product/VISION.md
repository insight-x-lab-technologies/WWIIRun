# Visão e escopo

## Proposta

O jogador pilota aeronaves de inspiração histórica em um mundo 2D lateral procedural, desvia de padrões de projéteis e clima, destrói inimigos e estruturas, coleta moedas/power-ups e constrói uma coleção de aeronaves. A experiência combina runs de habilidade com progressão persistente e desafios justos, reproduzíveis e comparáveis.

## Pilares

1. **Controle legível e responsivo:** resposta imediata, hitboxes claras e padrões aprendíveis.
2. **Runs variadas:** ondas, inimigos, obstáculos, armas, clima e recompensas combinados por diretor de dificuldade.
3. **Competição justa:** mesmo período + versão = mesma seed, conteúdo, eventos e clima.
4. **Progressão sem bloquear diversão:** hangar, conquistas e cosméticos; compras não definem placar competitivo.
5. **Web de alta qualidade:** rápido, offline, adaptável e instalável.

## Modos

- `Endless`: dificuldade reinicia em cada run e cresce com distância/nível; seed pode ser aleatória ou informada.
- `Daily`: seed UTC diária fixa e leaderboard do período.
- `Weekly`: seed ISO semanal fixa e leaderboard do período.

## Escopo funcional

Inclui gameplay, três armas equipáveis, destruição de inimigos/estruturas, moedas, power-ups, parallax, clima, hangar com 20 aeronaves, loja, expansões cosméticas, perfis locais/centrais, conquistas/troféus, leaderboards, áudio, i18n, compartilhamento, PWA e deploys descritos nos requisitos.

## Fora do primeiro lançamento

Multiplayer em tempo real, PvP síncrono, servidor autoritativo frame a frame, editor público de níveis, blockchain/NFT, console nativo e assets AAA finais. Portas para lojas vêm depois da PWA estável.

## Métricas de sucesso técnico

- frame p95 abaixo de 16,67 ms na matriz de referência; sem pausas perceptíveis por GC;
- replay determinístico com o mesmo hash final em engines suportadas;
- sem scroll/zoom acidental durante gameplay e controles alcançáveis em todas as orientações;
- primeira run possível offline após instalação;
- nenhuma regressão de regra causada por troca de expansão.

## Premissas a validar

- “indiano” significa Hindi (`hi`);
- “indiano” significa Hindi (`hi`) e espanhol significa `es-ES`; isso deixa 9 idiomas distintos confirmados e o décimo ainda precisa ser escolhido;
- aeronaves e eventos usam inspiração histórica, mas balanceamento privilegia diversão;
- moedas compradas não conferem vantagem nos leaderboards de desafio; se puderem comprar aeronaves com perks, desafios usarão loadout normalizado ou categoria separada.
