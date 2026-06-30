# shared

Reserva para tipos e utilitários genuinamente compartilhados. Código específico deve permanecer no módulo proprietário.

`validation/` contém somente primitivas puras compartilhadas por content e save: resultado estruturado, JSON Pointer, record/array JSON fechado, token canônico e path relativo normalizado. Não importa filesystem, plataforma, locale ou módulos de domínio.
