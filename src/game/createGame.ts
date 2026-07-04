import Phaser from "phaser";

import { BootstrapScene } from "./BootstrapScene";
import { GameplayScene, type GameplaySceneDependencies } from "./GameplayScene";

export function createGame(
  parent: HTMLElement,
  dependencies: Omit<GameplaySceneDependencies, "root">,
): Phaser.Game {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    backgroundColor: "#101820",
    scene: [
      BootstrapScene,
      new GameplayScene({ ...dependencies, root: parent }),
    ],
    scale: {
      mode: Phaser.Scale.NONE,
      width: 960,
      height: 540,
    },
    input: {
      keyboard: false,
      mouse: false,
      touch: false,
      gamepad: false,
    },
    audio: {
      noAudio: true,
    },
  });
}
