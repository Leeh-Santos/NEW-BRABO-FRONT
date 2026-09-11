import { useEffect, useRef } from "react";

const PITCH = 26; // px between candle centres
const BODY = 9; // candle body width
const SPEED = 15; // px per second, leftward
const MAX_DPR = 1.5; // beyond this the fidelity is invisible and the fill cost is not

interface Candle {
  open: number;
  close: number;
  high: number;
  low: number;
}

/** Rolling series state. Kept module-free (created per mount) so React's
 * StrictMode double-invoke can't leave two walks fighting over one series. */
interface Walk {
  i: number;
  vol: number;
  price: number;
}

/** Advances the series by one candle.
 *
 * Two details separate this from noise. Price mean-reverts toward a slowly
 * rolling trend line rather than a fixed midpoint, which produces long swings
 * that use the whole band instead of a flat strip. And volatility itself drifts,
 * so the tape has quiet stretches and bursts — the way real price action reads. */
function step(w: Walk): Candle {
  w.i += 1;
  w.vol = Math.min(0.34, Math.max(0.1, w.vol + (Math.random() - 0.5) * 0.06));

  const trend = 0.5 + 0.26 * Math.sin(w.i / 41) + 0.11 * Math.sin(w.i / 13.7);
  const open = w.price;
  const close = Math.min(
    0.97,
    Math.max(0.03, open + (trend - open) * 0.16 + (Math.random() - 0.5) * w.vol),
  );
  w.price = close;

  const wick = Math.random() * 0.075;
  return {
    open,
    close,
    high: Math.min(1, Math.max(open, close) + wick),
    low: Math.max(0, Math.min(open, close) - wick),
  };
}

/** The live background: a procedural candlestick field.
 *
 * This is the page's atmosphere, and it is market imagery rather than the
 * particles-and-aurora every dark crypto site ships. It sits low in the
 * viewport and fades out upward, so it reads as a chart the interface stands on.
 *
 * Cost is deliberately tiny: one canvas, ~80 fills per frame, capped at 1.5×
 * DPR. It never touches React state, never reflows, never triggers a repaint of
 * anything else, and it stops entirely when the tab is hidden or the visitor
 * has asked for reduced motion. */
export function MarketField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d", { alpha: true });
    if (!canvas || !ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const walk: Walk = { i: 0, vol: 0.2, price: 0.5 };
    let candles: Candle[] = [];
    let offset = 0;
    let width = 0;
    let height = 0;
    let frame = 0;
    let last = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);

      // Clamp to the viewport. This layer is `position: fixed; inset: 0`, so it
      // can never legitimately be larger — and the clamp is what makes the
      // pathological case impossible rather than merely unlikely. Writing
      // `canvas.width` sets the element's *intrinsic* size; if the CSS size is
      // ever missing, layout falls back to that intrinsic size, the
      // ResizeObserver below fires again, and the canvas grows by `dpr` on every
      // pass until the browser refuses to allocate it and paints a broken image
      // across the page. Bounding the read breaks that cycle at the source.
      // The element is one pitch wider than the viewport (see background.css):
      // that overhang is what the drift slides in from, so the right edge never
      // shows a gap while the canvas is translated.
      const w = Math.min(canvas.clientWidth, window.innerWidth + PITCH);
      const h = Math.min(canvas.clientHeight, window.innerHeight);
      if (w === width && h === height) return; // nothing to do, and no realloc

      width = w;
      height = h;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Two extra columns so candles enter and leave off-screen, never popping.
      const needed = Math.ceil(width / PITCH) + 2;
      while (candles.length < needed) candles.push(step(walk));
      candles = candles.slice(-needed);
    };

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      // Baseline sits low: the field is a floor the page stands on, and the
      // upper viewport (where the copy lives) stays clear.
      const base = height * 0.88;
      const amp = Math.min(height * 0.56, 470);

      const y = (v: number) => base - v * amp;

      for (let i = 0; i < candles.length; i++) {
        const c = candles[i];
        // Candles sit at fixed positions. The drift is the element's transform,
        // not a per-frame offset baked into the geometry.
        const x = i * PITCH;
        if (x < -PITCH || x > width + PITCH) continue;

        const up = c.close >= c.open;
        // Very low alpha: this is texture, not a chart anyone reads. Candles
        // nearer the right edge sit slightly brighter, so the eye reads a
        // direction of travel without any element becoming legible.
        const a = 0.06 + (x / Math.max(width, 1)) * 0.07;
        ctx.fillStyle = up ? `rgba(52, 211, 153, ${a})` : `rgba(251, 113, 133, ${a})`;

        ctx.fillRect(x + BODY / 2 - 0.5, y(c.high), 1, y(c.low) - y(c.high));
        const top = y(Math.max(c.open, c.close));
        ctx.fillRect(x, top, BODY, Math.max(1, y(Math.min(c.open, c.close)) - top));
      }
    };

    /* The drift is a compositor transform, and the pixels are only redrawn when
     * a candle actually leaves.
     *
     * The field travels at SPEED px/s, so at 60fps a frame moves it a quarter of
     * a pixel. Repainting a full-viewport canvas to move it that far — sixty
     * times a second, forever — was by a distance the most expensive thing on
     * the page. Translating the element instead costs no raster at all, and the
     * geometry only changes when the offset passes one PITCH: every
     * PITCH / SPEED ≈ 1.7s. That takes the redraw rate from 60/s to well under
     * 1/s while looking exactly the same, because after a shift-by-one-candle
     * with the offset wrapped the drawn content is identical. */
    const tick = (now: number) => {
      const dt = last ? Math.min((now - last) / 1000, 0.05) : 0;
      last = now;
      offset += SPEED * dt;

      let shifted = false;
      while (offset >= PITCH) {
        offset -= PITCH;
        candles.push(step(walk));
        candles.shift();
        shifted = true;
      }
      if (shifted) draw();

      canvas.style.transform = `translate3d(${-offset}px, 0, 0)`;
      frame = requestAnimationFrame(tick);
    };

    const start = () => {
      if (frame || reduced.matches || document.hidden) return;
      last = 0;
      frame = requestAnimationFrame(tick);
    };
    const stop = () => {
      cancelAnimationFrame(frame);
      frame = 0;
    };

    // rAF is already throttled in a background tab, but stopping outright means
    // a backgrounded tab burns nothing at all.
    const onVisibility = () => (document.hidden ? stop() : start());
    const onMotionChange = () => {
      stop();
      draw();
      start();
    };

    resize();
    draw();
    start();

    const observer = new ResizeObserver(() => {
      resize();
      draw();
    });
    observer.observe(canvas);
    document.addEventListener("visibilitychange", onVisibility);
    reduced.addEventListener("change", onMotionChange);

    return () => {
      stop();
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      reduced.removeEventListener("change", onMotionChange);
    };
  }, []);

  return <canvas ref={canvasRef} className="market-field" aria-hidden="true" />;
}
