import { createGame } from "../game/createGame";
import { CombinedInput, KeyboardInput, PointerInput } from "../game/input";
import { GameplaySession, type RunLifecyclePort } from "./GameplaySession";

export interface ApplicationHandle {
  destroy(): void;
}

export function bootstrapApplication(
  root: Element | null,
  lifecycle: RunLifecyclePort,
): ApplicationHandle {
  if (!(root instanceof HTMLElement)) {
    throw new Error(
      "WWIIRun bootstrap failed: #game-root element was not found.",
    );
  }

  const keyboard = new KeyboardInput();
  const pointer = new PointerInput();
  const combined = new CombinedInput(keyboard, pointer);
  const session = new GameplaySession(combined, lifecycle);
  const search = new URLSearchParams(
    root.ownerDocument.defaultView?.location.search,
  );
  if (search.get("combat-diagnostics") === "1") {
    session.activateDiagnosticEnemy("enemy.scout.v1", 60_000, 69_120);
    session.activateDiagnosticStructure(90_000, 69_120);
  }
  if (search.get("loot-diagnostics") === "1")
    session.activateDiagnosticCoin(49_152, 69_120);
  const instructions = createInstructions(root, pointer);
  const game = createGame(root, { session, keyboard, pointer, combined });
  let destroyed = false;

  return {
    destroy(): void {
      if (destroyed) {
        return;
      }

      destroyed = true;
      const canvas = game.canvas;
      game.destroy(true);
      canvas.remove();
      instructions.remove();
    },
  };
}

function createInstructions(
  root: HTMLElement,
  pointer: PointerInput,
): HTMLElement {
  const instructions = root.ownerDocument.createElement("section");
  instructions.className = "gameplay-instructions";
  instructions.setAttribute("aria-label", "Gameplay controls and status");
  const controls = root.ownerDocument.createElement("p");
  controls.textContent =
    "Technical preview controls: Arrow keys or WASD move; Space, Shift and E act. Touch: move left, actions right.";
  const status = root.ownerDocument.createElement("p");
  status.dataset.gameplayStatus = "";
  status.textContent = "Starting gameplay";
  status.setAttribute("role", "status");
  status.setAttribute("aria-live", "off");
  const actions = root.ownerDocument.createElement("div");
  actions.className = "gameplay-actions";
  const actionSpecs = [
    ["Primary action", 1],
    ["Secondary action", 2],
    ["Special action", 4],
  ] as const;
  for (const [label, bit] of actionSpecs) {
    const button = root.ownerDocument.createElement("button");
    button.type = "button";
    button.textContent = label.slice(0, 1);
    button.setAttribute("aria-label", label);
    button.setAttribute("aria-pressed", "false");
    let capturedPointerId: number | undefined;
    const press = (event: PointerEvent): void => {
      event.preventDefault();
      if (!pointer.actionDown(event.pointerId, bit)) return;
      capturedPointerId = event.pointerId;
      try {
        button.setPointerCapture?.(event.pointerId);
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "NotFoundError"))
          throw error;
      }
      button.setAttribute("aria-pressed", "true");
    };
    const release = (event: PointerEvent): void => {
      if (capturedPointerId !== event.pointerId) return;
      pointer.pointerUp(event.pointerId);
      capturedPointerId = undefined;
      button.setAttribute("aria-pressed", "false");
    };
    button.addEventListener("pointerdown", press);
    button.addEventListener("pointerup", release);
    button.addEventListener("pointercancel", release);
    button.addEventListener("lostpointercapture", release);
    actions.append(button);
  }
  instructions.append(controls, status, actions);
  root.append(instructions);
  return instructions;
}
