import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { ErrorBoundary } from "./components/ui/ErrorBoundary.tsx";

/* The boundary sits outside App so it also catches throws from the providers
 * themselves (wagmi, RainbowKit, the router) — those are exactly the ones that
 * would otherwise empty the root and leave a blank page with no explanation. */
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);

/* Tell the inline handler in index.html that React got far enough to run, so a
 * later error is reported as a runtime fault rather than a failed boot. */
window.__braboBooted = true;

/** Dismiss the inline boot splash from index.html once React has actually
 * painted. Two rAFs: the first runs after the commit, the second after the
 * browser has had a frame to paint it — fading any earlier swaps the brand
 * splash for a blank frame, which is exactly what the splash exists to avoid. */
const boot = document.getElementById("boot");
if (boot) {
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      boot.classList.add("boot-hide");
      // `transitionend` is not guaranteed: it never fires under a forced-motion
      // override, and a backgrounded tab can skip the frame entirely. The splash
      // is a full-screen z-index:9999 layer, so failing to remove it means a
      // permanently covered page — always tear it down on a timer as well.
      const drop = () => boot.remove();
      boot.addEventListener("transitionend", drop, { once: true });
      setTimeout(drop, 600);
    }),
  );
}
