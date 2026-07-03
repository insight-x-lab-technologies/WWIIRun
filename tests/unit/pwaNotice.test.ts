import { describe, expect, it } from "vitest";

import { getPwaNoticeModel } from "../../src/app/pwaNotice";

describe("PWA notice view model", () => {
  it("keeps passive lifecycle states out of the interface", () => {
    expect(getPwaNoticeModel("unsupported")).toBeNull();
    expect(getPwaNoticeModel("registering")).toBeNull();
    expect(getPwaNoticeModel("online-only")).toBeNull();
    expect(getPwaNoticeModel("activating-update")).toEqual({
      role: "status",
      message: "Updating WWIIRun…",
      actions: [],
    });
  });

  it("announces completed offline setup without an action", () => {
    expect(getPwaNoticeModel("offline-ready")).toEqual({
      role: "status",
      message: "WWIIRun is ready to work offline.",
      actions: [{ id: "dismiss", label: "Dismiss" }],
    });
  });

  it("offers explicit update actions and explains run deferral", () => {
    expect(getPwaNoticeModel("update-available")).toEqual({
      role: "region",
      message: "A new version of WWIIRun is available.",
      actions: [
        { id: "update", label: "Update now" },
        { id: "dismiss", label: "Later" },
      ],
    });
    expect(getPwaNoticeModel("update-deferred")).toEqual({
      role: "status",
      message: "Update postponed until this run ends.",
      actions: [{ id: "dismiss", label: "Dismiss" }],
    });
  });

  it("offers a sanitized recovery action for PWA errors", () => {
    expect(getPwaNoticeModel("error")).toEqual({
      role: "region",
      message: "Offline support could not start.",
      actions: [{ id: "reload", label: "Reload" }],
    });
  });
});
