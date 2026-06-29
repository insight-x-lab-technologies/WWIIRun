import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig } from "vite";

const root = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  root,
  server: { host: "0.0.0.0", port: 8080, strictPort: true },
  build: {
    outDir: resolve(root, ".output"),
    emptyOutDir: true,
  },
});
