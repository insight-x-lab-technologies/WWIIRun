export type PwaLifecycleStatus =
  | "unsupported"
  | "registering"
  | "online-only"
  | "offline-ready"
  | "update-available"
  | "update-deferred"
  | "activating-update"
  | "error";

export type PwaRegistrationCallbacks = {
  readonly onRegistered: () => void;
  readonly onOfflineReady: () => void;
  readonly onNeedRefresh: () => void;
  readonly onError: (error: unknown) => void;
};

export type PwaRegistrationHandle = {
  readonly activate: () => Promise<void>;
  readonly dispose?: () => void;
};

export type PwaRegistrar = (
  callbacks: PwaRegistrationCallbacks,
) => PwaRegistrationHandle;

export interface PwaUpdateCoordinator {
  readonly status: PwaLifecycleStatus;
  setRunActive(active: boolean): void;
  requestUpdate(): Promise<void>;
  subscribe(listener: (status: PwaLifecycleStatus) => void): () => void;
  destroy(): void;
}

export function createPwaUpdateCoordinator(
  registrar: PwaRegistrar,
): PwaUpdateCoordinator {
  let status: PwaLifecycleStatus = "registering";
  let runActive = false;
  let destroyed = false;
  let registration: PwaRegistrationHandle | undefined;
  const listeners = new Set<(status: PwaLifecycleStatus) => void>();

  const setStatus = (next: PwaLifecycleStatus): void => {
    if (destroyed || status === next) return;
    status = next;
    for (const listener of listeners) listener(status);
  };

  const callbacks: PwaRegistrationCallbacks = {
    onRegistered: () => setStatus("online-only"),
    onOfflineReady: () => setStatus("offline-ready"),
    onNeedRefresh: () => setStatus("update-available"),
    onError: () => setStatus("error"),
  };

  try {
    registration = registrar(callbacks);
  } catch {
    setStatus("error");
  }

  return {
    get status(): PwaLifecycleStatus {
      return status;
    },
    setRunActive(active: boolean): void {
      if (destroyed) return;
      runActive = active;
      if (!active && status === "update-deferred") {
        setStatus("update-available");
      }
    },
    async requestUpdate(): Promise<void> {
      if (
        destroyed ||
        (status !== "update-available" && status !== "update-deferred")
      ) {
        return;
      }
      if (runActive) {
        setStatus("update-deferred");
        return;
      }
      if (registration === undefined) {
        setStatus("error");
        return;
      }
      setStatus("activating-update");
      try {
        await registration.activate();
      } catch {
        setStatus("error");
      }
    },
    subscribe(listener: (status: PwaLifecycleStatus) => void): () => void {
      if (destroyed) return () => undefined;
      listeners.add(listener);
      listener(status);
      return () => listeners.delete(listener);
    },
    destroy(): void {
      if (destroyed) return;
      destroyed = true;
      registration?.dispose?.();
      listeners.clear();
      status = "unsupported";
    },
  };
}

export function createUnsupportedPwaUpdateCoordinator(): PwaUpdateCoordinator {
  return {
    status: "unsupported",
    setRunActive: () => undefined,
    requestUpdate: () => Promise.resolve(),
    subscribe(listener: (status: PwaLifecycleStatus) => void): () => void {
      listener("unsupported");
      return () => undefined;
    },
    destroy: () => undefined,
  };
}
