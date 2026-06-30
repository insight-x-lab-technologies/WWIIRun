# content

Contém definições e manifests de dados validados, sem lógica executável.

## Contratos F0-08

- `schema/` expõe decoders TypeScript puros e fechados para `ContentManifestV1` e `AssetCatalogV1`;
- o registro associa cada discriminante versionado a um decoder e ao impacto imutável `gameplay` ou `cosmetic`;
- `data/core/manifest.json` lista todos os JSONs da raiz core; o catálogo inicial é deliberadamente vazio;
- `npm run content:validate` aplica os decoders e depois confere confinamento de paths, arquivos regulares, referências, tamanho e SHA-256.

Para adicionar um schema, crie um discriminante/versionamento novo, tipo, decoder e vetores válidos/inválidos; registre o impacto em código e só então referencie o documento no manifest. Um schema de gameplay entra no item que cria a definição e deve avaliar impacto em `contentVersion`/`rulesetVersion`. Não aceite payload genérico ou impacto escolhido pelo JSON.

Issues usam JSON Pointer (`""` é a raiz) e são estáveis para tooling. `unknown-schema`, `invalid-path`, `missing-reference` e `integrity-mismatch` falham fechados. Metadados de licença/proveniência registram declarações; não constituem auditoria jurídica nem comprovam dimensões de mídia.
