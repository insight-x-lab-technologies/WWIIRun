# Catálogo e contratos de assets

Este é o registro mestre inicial. Cada linha vira uma ficha individual pelo template antes da geração final.

O contrato executável fundacional está em `src/content/schema/` e o catálogo core versionado em `src/content/data/core/asset-catalog.json`. O catálogo permanece vazio até uma ficha e seus arquivos reais existirem; `npm run content:validate` exige spec, evidência de licença, proveniência, tamanho e SHA-256, mas a validação de pixels/dimensões/codec continua reservada a F6-04.

## Convenções globais

- gameplay aponta para `visualId`, nunca caminho de arquivo;
- orientação lateral padrão: jogador aponta à direita, ameaças aéreas à esquerda;
- origin/pivot e anchors usam coordenadas normalizadas e são registrados no manifest;
- hitbox vem da entity definition, exibida como overlay sobre o asset;
- master 2x e runtime sizes são definidos após escala lógica do protótipo;
- nome: `<pack>/<category>/<stable-id>/<state>`; sem espaços/locale;
- toda entrada registra licença, autor/ferramenta, data, fonte/prompt e hash.

## Inventário obrigatório

| Grupo | Variações/estados mínimos | Observações de geração |
|---|---|---|
| 20 aeronaves | idle, dano, crítico, destruição; muzzle/engine anchors | silhuetas distintas, escala consistente |
| 3 armas/projéteis | projétil, impacto, muzzle flash, cooldown icon | alta legibilidade em fundos variados |
| inimigos aéreos | 5+ famílias e estados de dano/destruição | direção oposta e identificação por forma |
| inimigos terrestres | AA, veículos, módulos | base/arma podem animar separadas |
| estruturas/obstáculos | prédio, hangar, ponte, balão, rocha/terreno | partes destrutíveis e tiles/seams |
| pickups | moedas e 5+ power-ups | ícone/forma não depende só de cor |
| backgrounds | céu, nuvem, horizonte, terreno, foreground por período/clima | camadas tileable, sem landmarks repetitivos óbvios |
| clima/VFX | chuva, neve, vento, relâmpago, explosão, fumaça | partículas pequenas em atlas, reduced-flash variant |
| UI | HUD, botões, painéis, badges, troféus, loja/hangar | 9-slice onde aplicável, texto separado |
| avatar | catálogo inicial seguro | sem upload no MVP |
| PWA/store | icon master, maskable, splash/social card | respeitar safe zone por plataforma |
| áudio | menu/gameplay music, UI click, armas, impactos, pickups, clima | loops limpos, loudness consistente, licença clara |

## Background parallax

Ordem sugerida: sky gradient (fixo), far clouds (0,05x), distant terrain (0,15x), mid terrain/clouds (0,35x), gameplay plane (1x), foreground wisps/debris (1,2x). Velocidades visuais não entram na simulação. Cada layer declara repeat axis, overscan, blend, period/time variants e budget.

## Ficha de aceitação

Antes de promover `source` para `runtime`: validar alpha/halo, atlas bleeding, pivot, anchors, hitbox debug, tamanho mínimo, contraste em manhã/tarde/noite/clima, compressão, memória aproximada, licença e fallback geométrico. Trocar pack core por pack teste deve manter o hash da golden run.

## Assets individuais

Criar em `docs/assets/specs/<visual-id>.md`. Não gerar os centenas de arquivos antecipadamente: a ficha é criada junto da entity definition para evitar documentação fictícia e drift.
