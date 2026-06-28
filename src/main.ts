import { bootstrapApplication } from "./app/bootstrapApplication";
import "./styles.css";

const application = bootstrapApplication(document.querySelector("#game-root"));

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    application.destroy();
  });
}
