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
  const instructions = createInstructions(root, keyboard);
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
  keyboard: KeyboardInput,
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
    ["Primary action", "Space"],
    ["Secondary action", "ShiftLeft"],
    ["Special action", "KeyE"],
  ] as const;
  for (const [label, code] of actionSpecs) {
    const button = root.ownerDocument.createElement("button");
    button.type = "button";
    button.textContent = label.slice(0, 1);
    button.setAttribute("aria-label", label);
    button.setAttribute("aria-pressed", "false");
    const press = (event: PointerEvent): void => {
      event.preventDefault();
      keyboard.keyDown(code);
      button.setAttribute("aria-pressed", "true");
    };
    const release = (): void => {
      keyboard.keyUp(code);
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
