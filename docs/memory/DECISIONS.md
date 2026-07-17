# Resumo de decisões

| ID | Estado | Decisão |
|---|---|---|
| ADR-0001 | Aceita | Phaser 3 renderiza; TypeScript puro executa regras; Vite empacota. |
| ADR-0002 | Aceita | Simulação competitiva em ticks fixos, inteiros, PRNG próprio e replay por inputs. |
| ADR-0003 | Aceita | Expansões são manifests cosméticos e não podem sobrescrever dados de gameplay. |
| ADR-0004 | Aceita | `xoshiro128**` 1.1 versionado, seed hexadecimal de 128 bits e streams separados por saltos `2^64`. |
| ADR-0005 | Aceita | Run headless avança por ticks/inputs explícitos e usa layout binário canônico com hash `fnv1a64-v1`. |
| ADR-0006 | Aceita | Performance usa harness isolado, smoke estrutural sem threshold temporal em CI, medição física e budgets versionados do build. |
| ADR-0007 | Aceita | Baselines físicos F0 podem ser avaliados com 119 janelas consecutivas/595 s; o coletor futuro mantém 120 janelas/600 s. |
| ADR-0008 | Aceita | Conteúdo/save usam decoders TypeScript puros, estritos e versionados; o build reutiliza os decoders e acrescenta verificações de filesystem/integridade. |
| ADR-0009 | Aceita | PWA usa precache Workbox gerado pelo Vite, atualização manual adiada durante runs, base única validada e preview Pages manual. |
| ADR-0010 | Aceita | Estado v2 inclui aeronave inteira; colisões puras usam união de AABBs/círculos axis-aligned e hash canônico versionado. |
| ADR-0011 | Aceita | Pools canônicos de slots limitados, cursores circulares e grade uniforme scratch reduzem pares sem afetar ordem, determinismo ou hash fora do estado de gameplay. |
| ADR-0012 | Aceita | Combate F1-04 é dirigido por input em ticks inteiros; estado v4 serializa cooldown, dano/HP/comportamento e resolve contatos canonicamente sem RNG/diretor. |
| D-004 | Aceita | “Indiano” significa Hindi (`hi`) e espanhol significa `es-ES`; há 9 locales confirmados e o décimo segue aberto. |
| D-005 | Aceita | O jogo funciona offline; recursos sociais sincronizam quando há rede. |
| D-006 | Aceita | Leaderboard central trata o cliente como não confiável e valida submissões. |
| D-007 | Aceita | Decisões técnicas internas e reversíveis seguem a recomendação do agente sem confirmação; matérias humanas reservadas e ações externas continuam exigindo autorização. |
| D-008 | Aceita | `$next-roadmap-item` pode aprovar specs técnicas completas e orquestrar até duas correções; decisões humanas reservadas continuam exigindo confirmação. |

Detalhes e consequências duráveis pertencem aos ADRs. Decisões propostas precisam de validação humana antes de congelar conteúdo ou contrato externo.
