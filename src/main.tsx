import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

/** Dismiss the inline boot splash from index.html once React has actually
 * painted. Two rAFs: the first runs after the commit, the second after the
 * browser has had a frame to paint it — fading any earlier swaps the brand
 * splash for a blank frame, which is exactly what the splash exists to avoid. */
const boot = document.getElementById("boot");
if (boot) {
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      boot.classList.add("boot-hide");
      boot.addEventListener("transitionend", () => boot.remove(), { once: true });
    }),
  );
}
