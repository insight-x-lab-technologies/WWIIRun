# ADR-0009: cache PWA, atualização segura e preview Pages

Status: Accepted
Data: 2026-07-01

## Contexto

F0-07 precisa tornar o shell Vite instalável/offline, funcionar no project subpath `/WWIIRun/` e produzir um preview GitHub Pages. O risco principal não é apenas gerar um service worker: uma atualização automática pode recarregar ou misturar assets durante uma run, paths absolutos podem quebrar no Pages e caching amplo pode guardar respostas remotas futuras sem contrato.

O projeto já escolheu Vite 8, TypeScript, fronteira `platform`, CI GitHub Actions e um cliente offline-first. O scaffold ainda não tem rotas, save ou integração de run no composition root.

## Opções consideradas

### Service worker próprio sem dependência

Reduz dependências e dá controle total, mas exige implementar e manter descoberta de assets hashados, revisões, cleanup, fallback e atualização. O custo de testes e o risco de cache incorreto são altos para F0.

### Workbox build usado diretamente

Oferece primitives maduras e mais controle que um plugin, mas exige script/build paralelo e sincronização manual de base, manifest, bundle Vite e tipos do registrador.

### `vite-plugin-pwa` com `generateSW`

Integra manifest/precache ao grafo Vite, usa Workbox para revisões/cleanup e fornece registro por prompt. Tem dependência de build adicional e menor controle que `injectManifest`, mas cobre o shell estático sem worker customizado. A versão 1.3 adiciona suporte declarado a Vite 8; a versão exata e o lockfile continuam sujeitos a auditoria na implementação.

## Decisão

Usar `vite-plugin-pwa@1.3.0`, com peer de Vite 8 confirmado na implementação, estratégia `generateSW` e registro por prompt.

- Precache somente do app shell/core local emitido; nenhum runtime caching de API/cross-origin em F0.
- Uma fonte validada define o public base. Local usa `/`; Pages usa `/WWIIRun/`. Manifest, worker, scope, ícones e fallback derivam dela.
- Atualização nunca usa auto-update. Um coordinator em `platform` recebe atividade da run por port explícito. Worker em espera só ativa após ação do usuário e fronteira sem run; callback de update não importa `simulation`.
- F0 integra provider inicialmente inativo porque não há run de produto, mas testes provam a condição ativa e F1 deve ligar seu lifecycle ao port.
- Preview Pages usa workflow separado e manual, artifact `dist`, actions oficiais fixadas e permissões mínimas. Publicar/habilitar/executar continua ação externa autorizada, não efeito da implementação local.
- Ícones são placeholders técnicos catalogados sob `CC0-1.0`, não identidade final.

## Consequências

O build ganha dependências transitivas de Workbox e precisa de audit/lockfile/budget. O teste PWA precisa usar build de produção e origin isolado, porque dev/HMR não registra worker. Um E2E A/B passa a ser gate para evitar regressões críticas de ativação.

`generateSW` é suficiente enquanto o cache for apenas precache. Cache de packs, filas offline ou lógica de fetch específica exigirá nova decisão e possivelmente migração para `injectManifest`; não deve ser adicionado silenciosamente.

O Pages fornece hospedagem HTTPS e artifact deploy, mas há limites de configuração de headers. A evidência remota deve inspecionar MIME/Cache-Control; comportamento inseguro mantém o item aberto em vez de ser normalizado por documentação.

O manifest `id`, base e scope se tornam contratos persistentes de instalação. Mudá-los pode duplicar instalação/storage e exige migração explícita.
