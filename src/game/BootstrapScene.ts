import Phaser from "phaser";

export class BootstrapScene extends Phaser.Scene {
  public constructor() {
    super("bootstrap");
  }

  public create(): void {
    this.scene.start("gameplay");
  }
}
