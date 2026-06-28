import { createGame } from "../game/createGame";

export interface ApplicationHandle {
  destroy(): void;
}

export function bootstrapApplication(root: Element | null): ApplicationHandle {
  if (!(root instanceof HTMLElement)) {
    throw new Error(
      "WWIIRun bootstrap failed: #game-root element was not found.",
    );
  }

  const game = createGame(root);
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
    },
  };
}
