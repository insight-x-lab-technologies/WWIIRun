# ADR-0006: evidência de performance e budgets versionados

Status: Accepted
Data: 2026-06-28
Decisores: proprietário do projeto e agentes técnicos

## Contexto

O produto tem meta de 60 FPS, mas o scaffold atual é vazio e apenas registra tamanho de build. Tempos de runner virtualizado, emulação de viewport e médias de FPS não demonstram estabilidade em hardware real. Ao mesmo tempo, incorporar diagnóstico no entrypoint contaminaria o bundle que se pretende medir, e thresholds temporais em CI seriam sensíveis à carga da infraestrutura.

A decisão precisa separar três responsabilidades: regressão estrutural automatizada, medição temporal em aparelhos físicos e controle de bytes do artefato de produção.

## Opções consideradas

- medir apenas o shell vazio existente: custo baixo, mas workload irrelevante e incapaz de revelar pressão de render, lifecycle ou vazamento;
- embutir overlay/stress mode no app por rota ou query parameter: facilita acesso, porém adiciona código diagnóstico ao grafo/bundle de produção e aumenta o risco de ativação acidental;
- usar benchmark headless/Node: útil para funções puras, mas não mede `requestAnimationFrame`, Phaser, GPU, browser ou lifecycle;
- harness Vite separado com workload versionado, smoke sem thresholds em CI e protocolo real: exige infraestrutura específica, mas mantém o produto limpo e torna ambiente, workload e resultado auditáveis.

## Decisão

F0-06 usará um harness Vite separado, mantido em `tests/performance`, que não participa do entrypoint nem do output de produção. O workload sintético recebe versão imutável e produz relatório JSON agregado, local e sem telemetria. Browsers/runners automatizados validam schema, contagens, lifecycle, exportação e invalidação; não aplicam gates de FPS ou milissegundos.

Performance temporal é avaliada por três repetições de dez minutos, após warm-up, em cada aparelho físico publicado. Frame p95, tick p95, long tasks, janelas sustentadas e memória/capability são preservados por repetição. Emulação não substitui aparelho real e falha permanece evidência.

Bytes são controlados separadamente por config versionada e checker determinístico executado sobre `dist/`: gzip para HTML/CSS/JS, bytes raw para formatos já comprimidos, distinção entre grafo inicial e payload core. Aumentos exigem justificativa e medição; assets remotos não contornam o budget.

## Consequências

- o bundle medido não inclui o próprio diagnóstico;
- CI detecta quebra de contratos e bytes sem resultados flakey dependentes do runner;
- afirmações de 60 FPS ficam limitadas a workload, commit, browser e matriz publicados;
- cada mudança incompatível de workload/relatório cria versão nova, preservando comparabilidade histórica;
- a coleta real custa tempo e exige acesso humano aos aparelhos, mas não exige compra, device farm ou serviço pago;
- o workload F0 é sintético e não define caps de gameplay; F1/F2 devem acrescentar cenários representativos sem reescrever o baseline;
- APIs de long task, heap e renderer variam por browser; ausência é capability `unsupported` e exige evidência manual quando a métrica for relevante;
- os aparelhos disponíveis ficam registrados na matriz de F0-06; versões de SO/browser e resultados são preenchidos apenas durante a execução, sem matriz fictícia.
