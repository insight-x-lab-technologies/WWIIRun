# ADR-0007: exceção de cobertura para baselines físicos F0

Status: Accepted
Data: 2026-06-29
Decisores: proprietário do projeto e agentes técnicos

## Contexto

Os nove relatórios físicos de F0-06 foram coletados por uma versão do agregador que ancorava as janelas no primeiro callback. Cada JSON preserva 119 janelas consecutivas de cinco segundos, de `0–5.000 ms` até `590.000–595.000 ms`, embora declare uma coleta de 600 segundos. Os timestamps brutos não foram persistidos, portanto a janela `595.000–600.000 ms` não pode ser reconstruída sem inventar dados ou repetir as seis medições obrigatórias.

O coletor foi corrigido para ancorar as janelas nos limites explícitos da coleta e produzir 120 janelas. O proprietário decidiu que a evidência existente de 595 segundos é suficiente para encerrar a fundação F0 e que não haverá nova coleta para completar os cinco segundos ausentes.

## Opções consideradas

- repetir três runs no desktop e três no iPhone: produziria cobertura integral, mas exige nova operação física que o proprietário decidiu não executar;
- sintetizar a janela final usando contagens agregadas: preservaria a aparência de 600 segundos, mas não seria evidência medida e foi rejeitado;
- manter os relatórios como `not-evaluated`: preservaria o contrato estrito, mas bloquearia F0 apesar da decisão explícita de aceitar a limitação;
- aceitar 595 segundos como exceção versionada, preservar os JSONs e manter o coletor futuro em 600 segundos: mantém rastreabilidade sem fabricar dados.

## Decisão

Para relatórios `wwiirun.performance-report.v1` com workload `tier-base-stress-v1`, commit medido `1d75de79e7f5f340787a88e7d018a3a406bf59c0` e duração declarada de 600.000 ms, 119 janelas consecutivas de cinco segundos iniciadas em zero, totalizando 595.000 ms, são cobertura suficiente para avaliação do baseline F0.

O avaliador aplica os thresholds somente às janelas efetivamente registradas. Ele não cria, interpola nem presume resultado para `595.000–600.000 ms`. Relatórios com lacunas internas, menos de 595.000 ms, ambiente divergente, duplicação ou invalidação continuam `not-evaluated`.

O coletor corrigido permanece configurado para 600.000 ms e 120 janelas. A exceção é restrita ao commit histórico acima, não reduz a duração de futuras coletas nem autoriza alegar que os baselines históricos cobrem os cinco segundos ausentes.

## Consequências

- os trios históricos de desktop, iPhone e Galaxy Tab S9 voltam a ser avaliáveis e preservam seus resultados `fail` originais;
- F0-06 pode avançar sem novas coletas físicas;
- a matriz e a spec devem declarar explicitamente a cobertura de 595/600 segundos e limitar qualquer conclusão às 119 janelas observadas;
- os findings de frame p95, Long Tasks, FPS e heap permanecem; a exceção não converte falha de performance em `pass`;
- os nove JSONs e hashes permanecem inalterados;
- relatórios futuros produzidos pelo coletor corrigido continuam sujeitos a 120 janelas, permitindo remover esta exceção em uma versão posterior do schema/workload.
