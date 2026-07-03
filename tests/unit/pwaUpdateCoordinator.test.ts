import { describe, expect, it, vi } from "vitest";

import {
  createPwaUpdateCoordinator,
  type PwaRegistrationCallbacks,
} from "../../src/platform/pwa/updateCoordinator";

function fixture() {
  let callbacks: PwaRegistrationCallbacks | undefined;
  const activate = vi.fn(() => Promise.resolve());
  const dispose = vi.fn();
  const coordinator = createPwaUpdateCoordinator((registeredCallbacks) => {
    callbacks = registeredCallbacks;
    return { activate, dispose };
  });
  return {
    coordinator,
    activate,
    dispose,
    callbacks: () => {
      if (callbacks === undefined) throw new Error("callbacks not registered");
      return callbacks;
    },
  };
}

describe("PWA update coordinator", () => {
  it("publishes registration and offline-ready states", () => {
    const { coordinator, callbacks } = fixture();
    const statuses: string[] = [];
    const unsubscribe = coordinator.subscribe((status) =>
      statuses.push(status),
    );

    callbacks().onOfflineReady();
    unsubscribe();
    callbacks().onNeedRefresh();

    expect(statuses).toEqual(["registering", "offline-ready"]);
    expect(coordinator.status).toBe("update-available");
  });

  it("activates an accepted update immediately outside a run", async () => {
    const { coordinator, callbacks, activate } = fixture();
    callbacks().onNeedRefresh();

    await coordinator.requestUpdate();

    expect(activate).toHaveBeenCalledOnce();
    expect(coordinator.status).toBe("activating-update");
  });

  it("defers activation during a run and requires a fresh action after it", async () => {
    const { coordinator, callbacks, activate } = fixture();
    callbacks().onNeedRefresh();
    coordinator.setRunActive(true);

    await coordinator.requestUpdate();
    expect(coordinator.status).toBe("update-deferred");
    expect(activate).not.toHaveBeenCalled();

    coordinator.setRunActive(false);
    expect(coordinator.status).toBe("update-available");
    expect(activate).not.toHaveBeenCalled();

    await coordinator.requestUpdate();
    expect(activate).toHaveBeenCalledOnce();
  });

  it("contains registration and activation errors", async () => {
    const registrationError = createPwaUpdateCoordinator(() => {
      throw new Error("registration secret path");
    });
    expect(registrationError.status).toBe("error");

    const activationError = createPwaUpdateCoordinator((callbacks) => {
      callbacks.onNeedRefresh();
      return {
        activate: vi.fn(() =>
          Promise.reject(new Error("activation secret path")),
        ),
      };
    });
    await expect(activationError.requestUpdate()).resolves.toBeUndefined();
    expect(activationError.status).toBe("error");
  });

  it("makes destroy idempotent and ignores late callbacks", () => {
    const { coordinator, callbacks, dispose } = fixture();
    const statuses: string[] = [];
    coordinator.subscribe((status) => statuses.push(status));

    coordinator.destroy();
    coordinator.destroy();
    callbacks().onOfflineReady();
    callbacks().onNeedRefresh();
    callbacks().onError(new Error("late"));

    expect(dispose).toHaveBeenCalledOnce();
    expect(statuses).toEqual(["registering"]);
    expect(coordinator.status).toBe("unsupported");
  });
});
