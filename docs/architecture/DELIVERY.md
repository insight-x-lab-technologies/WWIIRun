# PWA, deploy e portabilidade

## PWA

- manifest com nome, ícones, maskable, orientação `any`, cores e shortcuts úteis;
- service worker precacheia app shell/core e usa cache versionado para packs;
- atualização é anunciada, mas ativada antes/depois da run, nunca no meio;
- primeira instalação exige rede; runs posteriores usam core offline;
- storage persistente é solicitado quando apropriado, com tratamento de recusa/evicção;
- áudio só começa após gesto do usuário e respeita visibilidade/lifecycle.

## GitHub Pages

Vite usa base configurável (`/WWIIRun/` no projeto Pages). Rotas devem funcionar em hospedagem estática: hash router ou fallback compatível. CI faz typecheck/test/build, publica apenas artefato e evita secrets. Supabase deve permitir apenas origins explícitas de produção/preview aplicáveis.

## itch.io

Gerar ZIP HTML5 autocontido, usar caminhos relativos e testar iframe, fullscreen, storage e política de áudio. Service worker pode ter comportamento diferente no iframe; o build itch deve funcionar mesmo sem instalação PWA.

## Futuras lojas

- Android/Samsung/Huawei: avaliar Capacitor como wrapper após PWA estável; billing é adapter por loja;
- Microsoft Store: PWABuilder ou empacotamento compatível;
- contratos `PlatformServices`, `PaymentsPort`, `SharePort` e `StoragePort` evitam lógica de loja no core;
- requisitos de assinatura, políticas, SDKs e contas de publicação não fazem parte do lançamento gratuito inicial.

## Ambientes

`local`, `preview` e `production`, cada um com config pública separada. Nenhuma flag de build pode alterar regras de desafio sem alterar `rulesetVersion`. Source maps de produção e logging devem evitar dados pessoais/replay completo.

## Gates de release

Build reproduzível, testes verdes, budget de bundle/assets, Lighthouse/PWA sanity, offline smoke, instalação, atualização entre versões, matriz de viewport, áudio após gesto, save/migração, execução de replay golden e verificação de headers/MIME/cache.
