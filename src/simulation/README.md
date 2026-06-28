# simulation

Núcleo TypeScript puro e determinístico. Não pode importar Phaser, DOM, browser APIs, relógio, rede, storage ou locale.

- [`random/`](random/README.md): seed de 128 bits, `xoshiro128ss-v1`, streams por `jump` e inteiros limitados sem viés.
- [`run/`](run/README.md): configuração/input canônicos, tick fixo/headless, estado v1 e hash `fnv1a64-v1` sob demanda.
