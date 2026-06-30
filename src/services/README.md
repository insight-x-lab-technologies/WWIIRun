# services

Contém ports e adapters de serviços externos. Integrações de plataforma permanecem substituíveis.

## Save F0-08

`save/` define o envelope estrito `SaveDocumentV1`, atualmente composto somente por `schemaVersion: 1`. `decodeSaveDocument` valida a versão corrente; `migrateSaveDocument` identifica a versão e executa a cadeia incremental explícita. Nenhuma função grava storage, altera o raw input ou faz downgrade de versão futura.

Uma versão nova deve preservar o decoder da versão anterior, adicionar tipo/fixture/decoder próprios e uma migração `vN → vN+1` testada. Migração destrutiva exige decisão humana e ADR antes do código. Backup, IndexedDB e recuperação pertencem ao adapter futuro de F4-03.
