# Performance F0-06

F0-06 separa três evidências: bytes do build de produção, smoke estrutural automatizado e medição temporal em hardware físico. O smoke de CI não aprova FPS, milissegundos ou memória de um aparelho.

## Comandos

```bash
npm run build
npm run performance:budget
npm run performance:harness
CI=1 npm run test:e2e
```

`npm run build` gera `dist/.vite/manifest.json` e executa automaticamente o checker de `performance-budgets.json`. O checker mede apenas `dist/`; `tests/performance/` usa configuração e entrypoint próprios e seu output temporário `.output/` é ignorado.

O comando `performance:harness` escuta por padrão em todas as interfaces na porta `8080`. Para abrir em outro aparelho da mesma rede local:

```bash
npm run performance:harness
```

Use `http://<IPv4-do-servidor>:8080/` ou o endereço LAN exibido pelo Vite. A porta é estrita: se `8080` estiver ocupada, o comando falha em vez de escolher outra silenciosamente. O harness não envia relatório, não usa telemetria e não solicita recursos externos. O operador exporta o JSON manualmente.

## Protocolo físico

1. Fixar um commit e executar `npm ci`, `npm run build` e os gates antes da coleta.
2. Usar navegador estável, zoom 100%, DevTools fechado, foreground, orientação fixa, sem throttling artificial e sem outra carga deliberada. Registrar bateria/tomada e temperatura.
3. Em celular/tablet, testar rotação antes da janela medida e reiniciar o harness; resize durante a coleta invalida a repetição.
4. Preencher commit, papel/modelo, CPU/GPU/RAM conhecidos, SO/browser e condições. Não preencher dado desconhecido por estimativa.
5. Executar `Start`. O harness descarta 30 s, coleta 600 s e recria completamente o Phaser quatro vezes, produzindo cinco ciclos.
6. Exportar o relatório. Repetição `invalid` deve ser refeita; sua evidência não pode ser renomeada como pass.
7. Produzir três repetições válidas com o mesmo commit, workload, browser, viewport e orientação. Renomear os arquivos como `<papel>-run-01.json` a `run-03.json`.
8. Guardar relatórios aprovados em `docs/performance/baselines/<AAAA-MM-DD>/` e atualizar [MATRIX.md](MATRIX.md) com valores e findings.

Um aparelho passa somente se as três repetições válidas passam individualmente: frame p95 ≤ 16,67 ms, tick p95 ≤ 4 ms, nenhuma Long Task > 50 ms quando observável e nenhuma janela de cinco segundos abaixo de 55 FPS. Heap mensurável não pode crescer em todos os ciclos e o final pode superar o inicial em no máximo `max(10%, 16 MiB)`. Capability ausente é `unsupported`, nunca zero.

## Limitações

- `tier-base-stress-v1` é sintético: três `TileSprite`, 1.200 imagens reutilizadas e uma chamada neutra de `stepRun` por tick diagnóstico; não prova performance de gameplay futuro.
- Chromium automatizado pode invalidar o relatório curto por lacunas do runner; o E2E valida schema, contagens, lifecycle, teardown, exportação e invalidação sem converter tempo virtualizado em gate.
- Long Task, heap e renderer dependem da API do browser. VRAM permanece `unsupported`; quando heap/Long Task não existirem, registrar inspeção manual do profiler na matriz.
- Aumentos de budget exigem medição, justificativa e revisão. Uma falha gera finding; não autoriza reduzir workload ou afrouxar threshold no mesmo diff.
