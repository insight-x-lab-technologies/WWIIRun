import type { PwaLifecycleStatus } from "../platform/pwa/updateCoordinator";
import type { PwaUpdateCoordinator } from "../platform/pwa/updateCoordinator";

export type PwaNoticeActionId = "dismiss" | "reload" | "update";

export type PwaNoticeModel = {
  readonly role: "region" | "status";
  readonly message: string;
  readonly actions: readonly {
    readonly id: PwaNoticeActionId;
    readonly label: string;
  }[];
};

export function getPwaNoticeModel(
  status: PwaLifecycleStatus,
): PwaNoticeModel | null {
  switch (status) {
    case "offline-ready":
      return {
        role: "status",
        message: "WWIIRun is ready to work offline.",
        actions: [{ id: "dismiss", label: "Dismiss" }],
      };
    case "update-available":
      return {
        role: "region",
        message: "A new version of WWIIRun is available.",
        actions: [
          { id: "update", label: "Update now" },
          { id: "dismiss", label: "Later" },
        ],
      };
    case "update-deferred":
      return {
        role: "status",
        message: "Update postponed until this run ends.",
        actions: [{ id: "dismiss", label: "Dismiss" }],
      };
    case "activating-update":
      return { role: "status", message: "Updating WWIIRun…", actions: [] };
    case "error":
      return {
        role: "region",
        message: "Offline support could not start.",
        actions: [{ id: "reload", label: "Reload" }],
      };
    case "unsupported":
    case "registering":
    case "online-only":
      return null;
  }
}

export interface PwaNoticeHandle {
  destroy(): void;
}

export function mountPwaNotice(
  host: HTMLElement,
  coordinator: PwaUpdateCoordinator,
): PwaNoticeHandle {
  const notice = host.ownerDocument.createElement("aside");
  notice.className = "pwa-notice";
  notice.hidden = true;
  host.append(notice);
  let dismissedStatus: PwaLifecycleStatus | undefined;

  const render = (status: PwaLifecycleStatus): void => {
    const model = getPwaNoticeModel(status);
    notice.replaceChildren();
    notice.hidden = model === null || dismissedStatus === status;
    if (notice.hidden || model === null) return;

    notice.setAttribute("role", model.role);
    notice.setAttribute("aria-live", "polite");
    notice.setAttribute("aria-label", "WWIIRun offline status");
    const message = host.ownerDocument.createElement("p");
    message.textContent = model.message;
    notice.append(message);

    if (model.actions.length === 0) return;
    const actions = host.ownerDocument.createElement("div");
    actions.className = "pwa-notice__actions";
    for (const action of model.actions) {
      const button = host.ownerDocument.createElement("button");
      button.type = "button";
      button.textContent = action.label;
      button.dataset.action = action.id;
      button.addEventListener("click", () => {
        if (action.id === "update") {
          void coordinator.requestUpdate();
          return;
        }
        if (action.id === "reload") {
          host.ownerDocument.defaultView?.location.reload();
          return;
        }
        dismissedStatus = status;
        notice.hidden = true;
      });
      actions.append(button);
    }
    notice.append(actions);
  };

  const unsubscribe = coordinator.subscribe((status) => {
    if (status !== dismissedStatus) dismissedStatus = undefined;
    render(status);
  });

  return {
    destroy(): void {
      unsubscribe();
      notice.remove();
    },
  };
}
