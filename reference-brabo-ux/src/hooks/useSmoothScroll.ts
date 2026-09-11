import { useEffect } from "react";
import Lenis from "lenis";

/** App-wide inertial scrolling.
 *
 * Lives in PageLayout rather than the Fund page (where it used to be) so the
 * feel is identical on every route. Lenis drives the real document scroll, so
 * native `scroll` events still fire and GSAP's ScrollTrigger needs no bridging.
 *
 * Driven by its own rAF loop instead of `gsap.ticker`: that kept GSAP out of
 * the shell bundle, so routes that don't animate never pay for it. */
export function useSmoothScroll() {
  useEffect(() => {
    // Inertia is exactly the effect someone with vestibular sensitivity turns
    // this setting off to avoid — leave the native scroll alone.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const lenis = new Lenis({
      duration: 1.1,
      easing: (t: number) => Math.min(1, 1.001 - 2 ** (-10 * t)),
    });

    let frame = requestAnimationFrame(function raf(time: number) {
      lenis.raf(time);
      frame = requestAnimationFrame(raf);
    });

    return () => {
      cancelAnimationFrame(frame);
      lenis.destroy();
    };
  }, []);
}
