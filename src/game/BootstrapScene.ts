import Phaser from "phaser";

export class BootstrapScene extends Phaser.Scene {
  public constructor() {
    super("bootstrap");
  }

  public create(): void {
    const { centerX, centerY } = this.cameras.main;

    this.add
      .text(centerX, centerY, "WWIIRun renderer ready", {
        color: "#f4f0e6",
        fontFamily: "system-ui, sans-serif",
        fontSize: "20px",
      })
      .setOrigin(0.5);
  }
}
