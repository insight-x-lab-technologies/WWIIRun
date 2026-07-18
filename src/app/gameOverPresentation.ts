import { formatGameOverSummary, type GameOverSummary } from "./gameOverSummary";

export type GameOverActions = Readonly<{ retry(): void; home(): void }>;
export type PresentationHandle = Readonly<{ destroy(): void }>;

export function mountGameOverPresentation(
  root: HTMLElement,
  summary: GameOverSummary,
  actions: GameOverActions,
): PresentationHandle {
  const document = root.ownerDocument;
  const overlay = document.createElement("section");
  overlay.className = "game-over-overlay";
  overlay.dataset.gameOver = "";
  overlay.dataset.mode = summary.mode;
  overlay.dataset.seed = summary.seed;
  overlay.dataset.distanceMeters = String(summary.distanceMeters);
  overlay.dataset.durationTicks = String(summary.durationTicks);
  overlay.dataset.runCoins = String(summary.runCoins);
  overlay.dataset.enemiesDestroyed = String(summary.enemiesDestroyed);
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-labelledby", "game-over-title");
  overlay.setAttribute("aria-describedby", "game-over-summary");

  const panel = document.createElement("div");
  panel.className = "game-over-panel";
  const title = document.createElement("h1");
  title.id = "game-over-title";
  title.tabIndex = -1;
  title.textContent = "Game over";
  const description = document.createElement("p");
  description.textContent = "Technical run summary";
  const details = document.createElement("dl");
  details.id = "game-over-summary";
  details.dataset.gameOverSummary = "";
  for (const line of formatGameOverSummary(summary)) {
    const item = document.createElement("div");
    item.textContent = line;
    details.append(item);
  }
  const actionRow = document.createElement("div");
  actionRow.className = "game-over-actions";
  const retry = createAction(
    document,
    "Retry",
    "game-over-retry",
    actions.retry,
  );
  const home = createAction(document, "Home", "game-over-home", actions.home);
  actionRow.append(retry, home);
  panel.append(title, description, details, actionRow);
  overlay.append(panel);
  root.append(overlay);
  retry.focus();

  return withFocusTrap(document, overlay);
}

export function mountTechnicalHome(
  root: HTMLElement,
  startPreview: () => void,
): PresentationHandle {
  const document = root.ownerDocument;
  const home = document.createElement("section");
  home.className = "technical-home";
  home.dataset.technicalHome = "";
  const panel = document.createElement("div");
  panel.className = "technical-home__panel";
  const title = document.createElement("h1");
  title.tabIndex = -1;
  title.textContent = "Technical home";
  const text = document.createElement("p");
  text.textContent =
    "The previous preview has ended. Start a new technical preview.";
  const start = createAction(
    document,
    "Start preview",
    "start-preview",
    startPreview,
  );
  panel.append(title, text, start);
  home.append(panel);
  root.append(home);
  start.focus();
  return { destroy: () => home.remove() };
}

function createAction(
  document: Document,
  label: string,
  dataName: string,
  action: () => void,
): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = label;
  button.dataset[dataName] = "";
  button.addEventListener("click", action);
  return button;
}

function withFocusTrap(
  document: Document,
  overlay: HTMLElement,
): PresentationHandle {
  const onKeyDown = (event: KeyboardEvent): void => {
    if (event.key === "Escape") {
      event.preventDefault();
      return;
    }
    if (event.key !== "Tab") return;
    const focusable = Array.from(
      overlay.querySelectorAll<HTMLButtonElement>("button:not([disabled])"),
    );
    const first = focusable[0];
    const last = focusable.at(-1);
    if (first === undefined || last === undefined) return;
    if (!overlay.contains(document.activeElement)) {
      event.preventDefault();
      first.focus();
    } else if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };
  document.addEventListener("keydown", onKeyDown);
  return {
    destroy(): void {
      document.removeEventListener("keydown", onKeyDown);
      overlay.remove();
    },
  };
}
