# PWA local e preview manual

## Build e teste local

O build padrão usa base `/` e build ID `local`:

```bash
npm run build
npm run preview -- --host 127.0.0.1 --port 4173
```

O build equivalente ao GitHub Pages exige entradas explícitas e falha para base/build ID inválidos:

```bash
WWIIRUN_BASE_PATH=/WWIIRun/ WWIIRUN_BUILD_ID=local-pages npm run build
npm run preview -- --host 127.0.0.1 --port 4173
```

Abra `http://127.0.0.1:4173/WWIIRun/`. `npm run test:pwa` constrói artefatos A/B isolados e valida manifest, scope, precache, primeira visita offline, reload offline e atualização entre versões. Ele não publica nada.

## Instalação, offline e atualização

A primeira visita exige rede. Depois que o aviso “ready to work offline” aparecer, o shell/core pode recarregar offline. O projeto não cria prompt de instalação próprio: use a opção de instalação oferecida pelo Chromium quando o browser considerar o manifest elegível.

Uma versão nova mostra `Update now`/`Later`. `Update now` só envia `skipWaiting` quando o port de atividade informa que não há run ativa. Durante uma run, a solicitação fica adiada e volta a ser oferecida quando `setRunActive(false)` marcar a fronteira segura. F1 deve conectar o lifecycle real da run a esse port; o scaffold o inicia como inativo.

## Limpeza e recuperação

Em desenvolvimento, feche abas do origin e use DevTools → Application → Service Workers → Unregister, depois Application → Storage → Clear site data. Isso remove apenas dados do origin local escolhido. Não limpe storage de outro origin nem use esse procedimento como migração de usuários publicados.

Se o registro/ativação falhar, o renderer online continua funcionando e o aviso oferece reload. Remover `sw.js` de um ambiente já publicado não desativa clientes existentes: um rollback publicado precisa manter por um ciclo um worker de desativação que remova apenas caches WWIIRun e faça unregister.

## Preview GitHub Pages

`.github/workflows/pages-preview.yml` possui somente `workflow_dispatch`, faz gates/build com `/WWIIRun/`, envia apenas `dist` e usa o deploy oficial. Antes da primeira execução, o proprietário deve habilitar Pages com source “GitHub Actions”. Habilitar Pages, executar o workflow e publicar exigem autorização separada.

Após uma execução autorizada, registrar SHA, run/job, URL e conferir HTTPS, MIME do manifest, scope do worker e `Cache-Control` de `index.html`, `manifest.webmanifest` e `sw.js`. Esses arquivos não-hash não podem ser tratados como immutable.

## Limites atuais

- somente Chromium automatizado é evidência de instalação/offline em F0;
- Safari/iOS, Android real, standalone físico e Lighthouse completo ficam para F7;
- o precache cobre somente shell/core local; APIs, Supabase e packs remotos não são cacheados;
- não há save, persist storage, sync, push, background sync ou prompt customizado;
- manifest e avisos usam inglês técnico provisório e serão migrados para i18n;
- `PWA-01`, `DIST-01`, `COST-01` e `UI-04` permanecem requisitos amplos `Planned`.
