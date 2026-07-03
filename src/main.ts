import { bootstrapApplication } from "./app/bootstrapApplication";
import { mountPwaNotice } from "./app/pwaNotice";
import { registerPwa } from "./platform/pwa/registerPwa";
import "./styles.css";

document.documentElement.dataset.buildId = __WWIIRUN_BUILD_ID__;

const pwa = registerPwa();
// F1 must connect real run lifecycle to this explicit port.
pwa.setRunActive(false);
const pwaNotice = mountPwaNotice(document.body, pwa);
if (import.meta.env.MODE === "pwa-test") {
  window.__WWIIRUN_PWA_TEST__ = {
    setRunActive: (active: boolean) => pwa.setRunActive(active),
  };
}
const application = bootstrapApplication(document.querySelector("#game-root"));

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    pwaNotice.destroy();
    pwa.destroy();
    application.destroy();
  });
}
