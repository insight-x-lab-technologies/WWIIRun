import { registerSW } from "virtual:pwa-register";

import {
  createPwaUpdateCoordinator,
  createUnsupportedPwaUpdateCoordinator,
  type PwaUpdateCoordinator,
} from "./updateCoordinator";

export function registerPwa(): PwaUpdateCoordinator {
  if (!import.meta.env.PROD || !("serviceWorker" in navigator)) {
    return createUnsupportedPwaUpdateCoordinator();
  }

  return createPwaUpdateCoordinator((callbacks) => {
    const activate = registerSW({
      immediate: true,
      onRegisteredSW: () => callbacks.onRegistered(),
      onOfflineReady: () => callbacks.onOfflineReady(),
      onNeedRefresh: () => callbacks.onNeedRefresh(),
      onRegisterError: (error) => callbacks.onError(error),
    });
    return {
      activate: async () => {
        await activate(true);
      },
    };
  });
}
