# ADR-0001: stack e fronteiras arquiteturais

Status: Accepted  
Data: 2026-06-27

## Contexto

O jogo precisa de rendering 2D móvel eficiente, PWA, assets raster, UI rica e um núcleo determinístico testável por agentes. Um framework de engine não deve capturar regras ou impedir deploy estático.

## Opções consideradas

- Phaser + TypeScript/Vite: ecossistema maduro, WebGL/Canvas, bom fit 2D e gratuito;
- PixiJS + engine própria: controle maior, mas muito sistema básico a construir;
- Godot export web: tooling forte, porém integração PWA/DOM, bundle e automação textual menos diretos para este fluxo;
- engine inteira em Phaser: rápida no início, mas física/timing/scene state prejudicam determinismo e testes headless.

## Decisão

Usar TypeScript strict + Vite + Phaser 3. Phaser é adapter de apresentação. Regras, colisão competitiva, RNG, diretor e scoring ficam em módulo TypeScript puro. Menus usam DOM/CSS; gameplay usa Canvas. Supabase fica atrás de ports.

## Consequências

Há trabalho adicional para loop, colisões e adapters, mas replays, testes e portabilidade ficam controláveis. Qualquer import de Phaser/browser em `simulation` é violação arquitetural testável por lint/dependency rule.
