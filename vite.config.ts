import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

import { createPwaBuildConfig } from "./src/platform/pwa/config";

export default defineConfig(() => {
  const pwa = createPwaBuildConfig({
    basePath: process.env.WWIIRUN_BASE_PATH,
    buildId: process.env.WWIIRUN_BUILD_ID,
  });

  return {
    base: pwa.basePath,
    define: {
      __WWIIRUN_BUILD_ID__: JSON.stringify(pwa.buildId),
    },
    build: {
      outDir: "dist",
      emptyOutDir: true,
      manifest: true,
    },
    plugins: [
      VitePWA({
        base: pwa.basePath,
        scope: pwa.basePath,
        filename: "sw.js",
        registerType: "prompt",
        injectRegister: null,
        includeManifestIcons: false,
        manifest: {
          name: "WWIIRun",
          short_name: "WWIIRun",
          description: "WWIIRun technical offline shell",
          id: pwa.manifest.id,
          start_url: pwa.manifest.start_url,
          scope: pwa.manifest.scope,
          display: "standalone",
          orientation: "any",
          lang: "en",
          prefer_related_applications: false,
          theme_color: "#101820",
          background_color: "#101820",
          icons: [...pwa.manifest.icons],
        },
        workbox: {
          cacheId: "wwiirun-shell",
          globPatterns: ["**/*.{html,js,css,png}"],
          navigateFallback: "index.html",
          cleanupOutdatedCaches: true,
          clientsClaim: false,
          skipWaiting: false,
        },
        devOptions: { enabled: false },
      }),
    ],
  };
});
