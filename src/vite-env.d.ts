/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

declare const __WWIIRUN_BUILD_ID__: string;

interface Window {
  __WWIIRUN_PWA_TEST__: {
    setRunActive(active: boolean): void;
  };
}
