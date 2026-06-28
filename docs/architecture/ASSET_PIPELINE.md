# Pipeline de assets, formas e expansões

## Separação crítica

Cada entidade possui três contratos independentes:

1. `GameplayDefinition`: HP, dano, movimento, drops, hitboxes e tags;
2. `VisualDefinition`: atlas/frame, pivot, escala, animação, efeitos e camadas;
3. `AudioDefinition`: eventos e clips.

Um pack cosmético só fornece 2 e 3. A allowlist do loader impede chaves de gameplay. Assim uma imagem AAA substitui o placeholder sem mudar colisão, balanceamento ou seed.

## Formas complexas

- placeholder pode ser desenhado por `Graphics`, mas já usa a hitbox final;
- aeronaves/obstáculos usam círculos, cápsulas e polígonos convexos compostos;
- pontos ficam em coordenadas locais inteiras e são visualizados por debug overlay;
- estruturas grandes podem ter módulos destrutíveis e sprite por estado de dano;
- pixel-perfect collision é proibida: cara, instável e injusta.

## Formatos

- fonte de trabalho: PNG com transparência em resolução 2x, áudio WAV/FLAC e arquivos editáveis quando disponíveis;
- runtime: texture atlases WebP/PNG com fallback testado; JSON de frames; áudio OGG + AAC/MP3 conforme matriz;
- backgrounds em tiles/camadas, evitando texturas maiores que limites de GPU móveis;
- ícones PWA gerados a partir de master quadrado, incluindo maskable;
- nenhuma imagem base64 inline grande.

KTX2/Basis só deve entrar após medição: pode reduzir VRAM/download, mas adiciona pipeline e compatibilidade. Não é pré-requisito para F1.

## Orçamento inicial por cena

- atlases carregados sob demanda e descarregados por pack/cena;
- tamanho máximo de atlas: 2048×2048 como baseline conservadora; 4096 apenas em tier validado;
- evitar mais de 3–4 atlases ativos do gameplay sem profiling;
- backgrounds divididos/repetíveis; parallax usa reuso, não imagens infinitas;
- limite de download do core inicial definido em F0-06 e acompanhado no CI;
- partículas compartilham atlas e objetos são pooled.

## Manifest de expansão

```json
{
  "schemaVersion": 1,
  "packId": "cosmetic.jurassic.v1",
  "version": "1.0.0",
  "minAppVersion": "0.8.0",
  "assets": {},
  "visualOverrides": {},
  "audioOverrides": {},
  "localization": {},
  "integrity": {}
}
```

O loader valida schema, tamanho, MIME, IDs permitidos e hashes. Falha parcial não inicia run competitiva com estado ambíguo: usa pack core inteiro. Packs são selecionáveis na tela de expansões e armazenados separadamente do shell PWA.

## Geração por IA

Cada asset deve ter ficha baseada em `ASSET-SPEC-TEMPLATE.md`: finalidade, dimensões, proporção, câmera lateral, direção, pivot, área segura, transparência, estados/animações, paleta, iluminação, prompt positivo/negativo, continuidade histórica, hitbox de referência, atlas e licença/proveniência. A IA gera pixels; um humano valida legibilidade, consistência, direitos e alinhamento.

Não usar marcas, insígnias proibidas por plataforma/região ou cópia reconhecível de arte protegida. Símbolos históricos exigem decisão editorial e revisão de políticas das lojas.
