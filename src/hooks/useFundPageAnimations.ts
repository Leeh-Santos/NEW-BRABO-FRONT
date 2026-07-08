import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useEffect, useRef } from "react";
import Lenis from "lenis";
import Typed from "typed.js";

gsap.registerPlugin(ScrollTrigger);

/** Ports the "DESIGN SKILLS" inline <script> block from legacy-site/index.html (GSAP entrance +
 * scroll-reveal animations, Lenis smooth scroll, Vanta.NET background, Typed.js hero subtitle)
 * onto React-idiomatic hooks. Scope matches legacy exactly: Fund-page only. CountUp is handled
 * separately via react-countup directly in StatCard (see StatsGrid).
 *
 * Deliberately unscoped (no gsap.context `scope`): `.navbar`/`.page-nav` live in PageLayout,
 * outside this page's own DOM subtree, so a scoped selector would never find them. This is safe
 * because React Router only ever mounts one route at a time — no other page's `.stat-card` etc.
 * can be present in the DOM while this runs. */
export function useFundPageAnimations(subtitleText: string) {
  const vantaRef = useRef<HTMLDivElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);

  useGSAP(() => {
    gsap.set(".navbar", { autoAlpha: 0, y: -40 });
    gsap.set(".page-nav", { autoAlpha: 0, y: -20 });
    gsap.set(".stat-card", { autoAlpha: 0, y: 60 });
    gsap.set(".funding-card", { autoAlpha: 0, y: 80 });
    gsap.set(".step-card", { autoAlpha: 0, y: 50 });
    gsap.set(".tier-milestone", { autoAlpha: 0, scale: 0.7 });

      gsap.to([".navbar", ".page-nav"], {
        autoAlpha: 1,
        y: 0,
        duration: 0.7,
        ease: "power3.out",
        stagger: 0.1,
        delay: 0.1,
      });

      // Legacy animated a stack of decorative `.hero-section > div` blurbs after the title; this
      // page's simplified hero only has the title + subtitle, so just animate those two directly.
      const heroTl = gsap.timeline({ defaults: { ease: "power3.out" }, delay: 0.3 });
      heroTl
        .from(".hero-title", { y: 80, autoAlpha: 0, duration: 1 }, 0)
        .from(".hero-subtitle", { y: 30, autoAlpha: 0, duration: 0.7 }, 0.5);

      gsap.to(".stat-card", {
        scrollTrigger: { trigger: ".stats-grid", start: "top 85%", once: true },
        autoAlpha: 1,
        y: 0,
        duration: 0.6,
        stagger: 0.1,
        ease: "power2.out",
      });

      gsap.to(".funding-card", {
        scrollTrigger: { trigger: ".funding-card", start: "top 85%", once: true },
        autoAlpha: 1,
        y: 0,
        duration: 0.9,
        ease: "power3.out",
      });

      gsap.to(".step-card", {
        scrollTrigger: { trigger: ".how-it-works", start: "top 80%", once: true },
        autoAlpha: 1,
        y: 0,
        duration: 0.5,
        stagger: 0.15,
        ease: "power2.out",
      });

      gsap.to(".tier-milestone", {
        scrollTrigger: { trigger: ".tier-progression-section", start: "top 85%", once: true },
        autoAlpha: 1,
        scale: 1,
        duration: 0.5,
        stagger: 0.2,
        ease: "back.out(1.7)",
      });
  }, []);

  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t: number) => Math.min(1, 1.001 - 2 ** (-10 * t)),
    });

    const onTick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(onTick);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(onTick);
      lenis.destroy();
    };
  }, []);

  useEffect(() => {
    if (!vantaRef.current) return;
    let effect: { destroy: () => void } | undefined;
    let cancelled = false;

    Promise.all([import("vanta/dist/vanta.net.min"), import("three")]).then(
      ([vantaModule, THREE]) => {
        if (cancelled || !vantaRef.current) return;
        // See src/lib/countup.ts for why this defensive unwrap is needed — Vite's dev-time CJS
        // interop double-wraps this UMD package's default export.
        const maybeDoubleWrapped = vantaModule.default as unknown as {
          default?: typeof vantaModule.default;
        };
        const NET = maybeDoubleWrapped.default ?? vantaModule.default;
        effect = NET({
          el: vantaRef.current,
          THREE,
          mouseControls: true,
          touchControls: true,
          gyroControls: false,
          minHeight: 200,
          minWidth: 200,
          scale: 1.0,
          scaleMobile: 1.0,
          color: 0x3b82f6,
          backgroundColor: 0x0f172a,
          points: 8.0,
          maxDistance: 24.0,
          spacing: 20.0,
        });
      },
    );

    return () => {
      cancelled = true;
      effect?.destroy();
    };
  }, []);

  useEffect(() => {
    const el = subtitleRef.current;
    if (!el) return;

    // Read from the `subtitleText` param, not the live DOM: React StrictMode double-invokes this
    // effect in dev (mount → cleanup → mount again against the same DOM node), and reading
    // `el.textContent` would capture whatever the *first* pass already cleared it to.
    el.textContent = "";
    let typed: Typed | undefined;

    const timer = setTimeout(() => {
      typed = new Typed(el, {
        strings: [subtitleText],
        typeSpeed: 30,
        showCursor: true,
        cursorChar: "_",
        onComplete: (self) => {
          setTimeout(() => {
            if (self.cursor) self.cursor.style.display = "none";
          }, 1500);
        },
      });
    }, 900);

    return () => {
      clearTimeout(timer);
      typed?.destroy();
    };
  }, [subtitleText]);

  return { vantaRef, subtitleRef };
}
