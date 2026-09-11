This project (Brabo Staking) is a separate product within the Brabo
ecosystem — its own pages, its own features (staking, not funding/
liquidity), its own contracts. It is NOT a clone of Brabo Markets and
should not be forced into Brabo Markets' page structure.

You're restyling this project's frontend to match the visual design
system and shell pattern of Brabo Markets, a sister product whose
finished React app is included here as a reference under
`reference-brabo-ux/`. This is a VISUAL/UX restyle, not a new architecture
migration — the app is already on Vite + React + TypeScript + wagmi v2 +
viem v2 + RainbowKit v2. Only the presentation layer changes.

**What actually carries over:** the dark theme, typography, spacing/color
tokens, card treatment, the navbar/page-nav shell pattern, and the
animation style (scroll-triggered entrance, smooth scroll, counters).
**What does NOT carry over:** Brabo Markets' specific pages (Fund,
Portfolio, Liquidity, Ecosystem, Contracts), its copy, its stat set, or
any assumption that this project has the same number or kind of pages.
Brabo Staking's own pages are whatever this project's routes already are
— apply the design system to those, don't invent Markets-shaped pages
here.

## What's in `reference-brabo-ux/`

- `screenshots/` — rendered screenshots of all 5 Brabo Markets pages, each
  at desktop (1440px) and mobile (390px) width, with entrance/scroll
  animations already settled. **Look at these first** — they're the
  highest-signal reference for what "done" looks like. File names:
  `{fund,portfolio,liquidity,ecosystem,contracts}-{desktop,mobile}.png`.
- `src/styles/` — `tokens.css` (colors, spacing, typography scale),
  `fonts.css` (uses `@fontsource-variable/archivo` and
  `@fontsource-variable/jetbrains-mono` npm packages — install these, don't
  look for local font files), `background.css`.
- `src/components/layout/` — `Navbar.tsx`, `PageNav.tsx`, `PageLayout.tsx`,
  `Ticker.tsx`, `WalletButton.tsx` — the shared shell (top nav, page tabs,
  scrolling stats ticker, wallet connect button) visible in every
  screenshot.
- `src/components/ui/` — shared building blocks (`StatCard.tsx`,
  `MarketField.tsx`, `ToastProvider.tsx`, `ErrorBoundary.tsx`).
- `src/components/{fund,portfolio,liquidity,contracts}/` and
  `src/pages/*.tsx` — full markup/layout per page, matching the
  screenshots.
- `src/hooks/useFundPageAnimations.ts`, `useSmoothScroll.ts` — the
  animation wiring (GSAP + ScrollTrigger entrance animations, Lenis smooth
  scroll) that produces the settled state you see in the screenshots.
- `src/assets/` — brand/tier icon assets (bull logo, bronze/silver/gold
  tier icons), for the visual language, not necessarily to be reused
  as-is if this project has its own branding.

## Goal

Make this project's own pages feel like they belong to the same product
family as the Brabo Markets screenshots: same visual language (dark theme,
typography, spacing, card treatment, color accents), same shell/nav
pattern, same animation behavior (scroll-triggered entrance, smooth
scroll, stat counters) — applied to this project's actual page content,
not Brabo Markets' pages.

## What to change vs. keep

- **Change:** CSS/design tokens, component markup/structure/className
  wiring, layout, animation code, shared UI components (stat cards,
  buttons, nav).
- **Keep untouched:** this project's own data-fetching hooks, contract
  addresses/ABIs, on-chain read/write logic, routing, and business logic
  (tokenomics, tier math, whatever is specific to this protocol). Only the
  presentation layer wraps around that existing logic — don't change what
  data means or how it's fetched, only how it's displayed.

## Process

1. Look at every screenshot in `reference-brabo-ux/screenshots/` before
   touching code, to internalize the design system: how cards look, how
   stats are laid out, how the nav/shell behaves, how sections enter on
   scroll. Do NOT assume this project's pages correspond to Brabo Markets'
   pages — list out this project's actual routes/pages separately and plan
   to apply the design system (card style, spacing, nav shell, animation
   pattern) to each one on its own terms.
2. Port `src/styles/tokens.css` and `fonts.css` first — get the base
   design system (colors, type, spacing) in place before touching
   components, since everything else depends on it.
3. Rebuild the shared shell (navbar, page nav, ticker if applicable) using
   `reference-brabo-ux/src/components/layout/` as the structural reference,
   adapted to this project's own nav items/branding.
4. Go page by page through THIS project's own routes, applying the design
   system (card style, typography, spacing, color, section rhythm) to each
   page's existing content, using whichever Brabo screenshot has the
   closest-shaped section as a style reference (e.g. a stats row looks to
   Fund's `StatsGrid`, a wallet-gated empty state looks to Portfolio's
   disconnected state) — not as a page-identity match. Keep this project's
   existing hooks/data wired into the new markup.
5. Port the animation hooks (GSAP entrance, smooth scroll) the same way
   `useFundPageAnimations.ts` does it, and decide scope (which of this
   project's pages get entrance/scroll animation) based on what makes
   sense for this project's own pages — don't default to copying Brabo's
   Fund-page-only scope without thinking about it.
6. After each page, run the dev server, screenshot it the same way (full
   page, desktop + mobile, after scrolling through so ScrollTrigger
   animations fire — a plain full-page screenshot without an actual scroll
   pass will miss scroll-triggered content), and compare against the
   closest-matching Brabo screenshot for visual-language consistency (type,
   color, spacing, card treatment) — not for page-layout sameness. Don't
   declare a page done from reading the code alone.

## Gotchas hit during the original Brabo build (same stack, may recur)

- wagmi v3 exists but RainbowKit 2.2.11's peer dep is `wagmi: ^2.9.0` —
  `npm install wagmi` grabs v3 by default; pin to a 2.x version explicitly.
- Vite/Rolldown's CJS→ESM interop double-wraps some UMD packages' default
  exports (hit with `vanta` and `react-countup`) — `import X from "pkg"`
  can resolve to `{ default: ActualThing }` instead of `ActualThing`. Fix
  with `mod.default ?? mod`.
- React StrictMode double-invokes effects in dev — don't read "original"
  state from live DOM inside an effect (e.g. a typewriter effect reading
  `el.textContent`); pass such values in as params instead.
- `useGSAP({ scope })` only matches descendants of the scope element — if
  an animation targets layout-level elements (navbar, etc.) from a
  page-level component, run it unscoped and rely on the router unmounting
  inactive routes to avoid cross-page bleed.
- **Full-page screenshots for verification:** taking a full-page screenshot
  without first scrolling through the page will show empty
  scroll-triggered sections (Playwright/most tools resize the viewport
  rather than actually scrolling, so IntersectionObserver-based triggers
  never fire). Scroll to the bottom in steps, wait, then screenshot.

## Constraints

- Don't touch this project's contract calls, addresses, or data logic.
- If a screenshot and this project's actual content disagree (e.g. copy,
  labels, number of stat cards), keep this project's content — match
  Brabo's visual treatment, not its literal text/data.
