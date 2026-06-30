# ADR-0008: contratos executáveis de conteúdo e save

Status: Accepted
Data: 2026-06-30
Decisores: proprietário do projeto e agentes técnicos

## Contexto

O projeto precisa validar conteúdo estático antes do bundle, rejeitar dados corrompidos antes de entrarem na aplicação e preparar saves versionados sem antecipar o modelo de perfis/economia de F4. Os mesmos contratos precisam funcionar em Node durante o build e, quando aplicável, no browser offline. A solução não pode permitir que manifests cosméticos injetem regra de gameplay nem criar duas fontes de verdade entre tipos TypeScript e validação runtime.

F0-08 ocorre antes de existirem definições concretas de aeronaves, armas, perfis ou carteira. Portanto, a fundação deve ser extensível, mas não pode aceitar payloads arbitrários nem congelar decisões de produto futuras.

## Opções consideradas

- JSON Schema como fonte de verdade, com geração de tipos e validator: formato interoperável, porém adiciona codegen, sincronização de artefatos e dependências antes de existir consumidor externo;
- biblioteca schema-first com inferência TypeScript: ergonomia alta, mas adiciona dependência/runtime ao bundle e acopla contratos persistidos a uma API de biblioteca;
- decoders TypeScript puros, estritos e tipados, compartilhados entre build/browser: mais código explícito, mas sem dependência, sem codegen e com controle total de canonicalização e erros.

## Decisão

Adotar decoders TypeScript puros como contratos executáveis de F0-08. Cada schema possui discriminante/versionamento literal, tipo de saída, decoder de `unknown` e testes de paridade. Decoders copiam dados aceitos, rejeitam propriedades desconhecidas e retornam resultado estruturado; não lançam por entrada inválida, não mutam o valor recebido e não dependem de Phaser, DOM, storage, rede, locale ou relógio.

Primitivas genéricas de validação ficam em `src/shared/validation`. Contratos de conteúdo ficam em `src/content/schema`; o envelope/migrações de save ficam em `src/services/save`. A ferramenta Node em `scripts/validateContent.ts` usa os mesmos decoders de conteúdo e acrescenta apenas verificações de filesystem, referências e integridade.

O registro de schemas de conteúdo atribui em código, e não em JSON controlado por dados, o impacto `gameplay` ou `cosmetic`. Schemas desconhecidos falham fechados. Conteúdo cosmético não pode declarar stats, hitbox, spawn, score ou qualquer chave de regra. Novos tipos de gameplay entram somente com decoder concreto e versão explícita no item que introduzir a mecânica.

F0-08 cria um save v1 estrito e fundacional, sem dados de perfil/economia e sem gravá-lo em storage. Versões futuras adicionam schema e migração incremental; não alteram silenciosamente o significado de v1. Entrada corrompida ou versão futura permanece intacta para recuperação pelo adapter de F4.

JSON Schema ou outra representação interoperável pode ser adicionada por ADR sucessor quando packs externos, tooling ou backend justificarem o custo. Ela deverá ser derivada ou testada contra os mesmos vetores, não virar uma segunda semântica divergente.

## Consequências

- o build e o browser compartilham semântica sem dependência paga ou pacote novo;
- contratos e mensagens exigem mais implementação/testes manuais que uma biblioteca schema-first;
- tipos TypeScript não são prova de validade; somente valores retornados pelos decoders são confiáveis;
- schemas são fechados e versionados, tornando extensão incompatível explícita;
- a separação de impacto impede que o próprio manifest se autodeclare cosmético;
- F4 ainda deve implementar IndexedDB, backup/export, limites e migrações reais; F6 ainda deve implementar download, cache, allowlist e fallback atômico de packs.
