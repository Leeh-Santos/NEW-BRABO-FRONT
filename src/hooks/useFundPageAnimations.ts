import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useEffect, useRef } from "react";
import Typed from "typed.js";

gsap.registerPlugin(ScrollTrigger);

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Fund-page entrance + scroll-reveal choreography.
 *
 * Two things that used to live here have moved out:
 *  - Lenis smooth scroll → `useSmoothScroll`, mounted app-wide in PageLayout.
 *  - The Vanta.NET / three.js background → pure CSS in `styles/background.css`.
 *    It was ~600 KB of JS and a permanent WebGL loop for a decorative backdrop.
 *
 * Deliberately unscoped (no gsap.context `scope`): `.navbar`/`.page-nav` live in
 * PageLayout, outside this page's own DOM subtree, so a scoped selector would
 * never find them. This is safe because React Router only ever mounts one route
 * at a time — no other page's `.stat-card` etc. can be present while this runs. */
export function useFundPageAnimations(subtitleText: string) {
  const subtitleRef = useRef<HTMLParagraphElement>(null);

  useGSAP(() => {
    // Every tween below starts from `autoAlpha: 0`. Under reduced motion we
    // must not set that hidden state at all — skipping only the `.to()` calls
    // would leave the whole page invisible.
    if (prefersReducedMotion()) return;

    gsap.set(".navbar", { autoAlpha: 0, y: -20 });
    gsap.set(".page-nav", { autoAlpha: 0, y: -12 });
    // Stat/step/tier cells sit in shared-edge grids where the 1px gap *is* the
    // divider — translating a cell drags it off its rule and exposes the line
    // underneath. Those fade only; the choreography lives in the stagger.
    gsap.set(".stat-card", { autoAlpha: 0 });
    gsap.set(".step-card", { autoAlpha: 0 });
    gsap.set(".tier-milestone", { autoAlpha: 0 });
    gsap.set(".funding-card", { autoAlpha: 0, y: 24 });

    gsap.to([".navbar", ".page-nav"], {
      autoAlpha: 1,
      y: 0,
      duration: 0.5,
      ease: "power3.out",
      stagger: 0.06,
      delay: 0.05,
    });

    const heroTl = gsap.timeline({ defaults: { ease: "power3.out" }, delay: 0.15 });
    heroTl
      .from(".hero-eyebrow", { y: 12, autoAlpha: 0, duration: 0.45 }, 0)
      .from(".hero-title", { y: 24, autoAlpha: 0, duration: 0.7 }, 0.05)
      .from(".hero-subtitle", { y: 12, autoAlpha: 0, duration: 0.5 }, 0.25);

    gsap.to(".stat-card", {
      scrollTrigger: { trigger: ".stats-grid", start: "top 88%", once: true },
      autoAlpha: 1,
      duration: 0.45,
      stagger: 0.05,
      ease: "power2.out",
    });

    gsap.to(".funding-card", {
      scrollTrigger: { trigger: ".funding-card", start: "top 88%", once: true },
      autoAlpha: 1,
      y: 0,
      duration: 0.6,
      ease: "power3.out",
    });

    gsap.to(".step-card", {
      scrollTrigger: { trigger: ".how-it-works", start: "top 85%", once: true },
      autoAlpha: 1,
      duration: 0.45,
      stagger: 0.07,
      ease: "power2.out",
    });

    gsap.to(".tier-milestone", {
      scrollTrigger: { trigger: ".tier-progression-section", start: "top 88%", once: true },
      autoAlpha: 1,
      duration: 0.45,
      stagger: 0.07,
      ease: "power2.out",
    });
  }, []);

  useEffect(() => {
    const el = subtitleRef.current;
    if (!el) return;

    if (prefersReducedMotion()) {
      el.textContent = subtitleText;
      return;
    }

    // Read from the `subtitleText` param, not the live DOM: React StrictMode
    // double-invokes this effect in dev (mount → cleanup → mount again against
    // the same DOM node), and reading `el.textContent` would capture whatever
    // the *first* pass already cleared it to.
    el.textContent = "";
    let typed: Typed | undefined;

    const timer = setTimeout(() => {
      typed = new Typed(el, {
        strings: [subtitleText],
        typeSpeed: 26,
        showCursor: true,
        cursorChar: "_",
        onComplete: (self) => {
          setTimeout(() => {
            if (self.cursor) self.cursor.style.display = "none";
          }, 1500);
        },
      });
    }, 800);

    return () => {
      clearTimeout(timer);
      typed?.destroy();
    };
  }, [subtitleText]);

  return { subtitleRef };
}
