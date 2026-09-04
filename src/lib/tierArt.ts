import bronzeSvg from "../assets/tiers/bronze.svg";
import goldSvg from "../assets/tiers/gold.svg";
import silverSvg from "../assets/tiers/silver.svg";

/** The three NFT medallions, in one place.
 *
 * Keyed by name rather than by index on purpose: the codebase carries two
 * different tier numberings — the NFT contract's (0 = Bronze, see
 * `NFT_TIER_NAMES`) and the funding-progression one in `lib/tiers.ts`
 * (0 = "No Tier", 1 = Bronze). A shared index-based lookup would sooner or
 * later be read with the wrong base and render a silver badge on a bronze card.
 *
 * Imported as URLs, not inlined: all three SVGs declare gradients under the
 * same ids (`a`, `b`, `c`), so inlining more than one into a page would make
 * later definitions win and every medallion would come out the same colour. */
export const TIER_ART = {
  bronze: bronzeSvg,
  silver: silverSvg,
  gold: goldSvg,
} as const;

/** Looks up a medallion by tier name, case-insensitively. Returns undefined for
 * "No Tier" / "Max Tier" / anything unrecognised, so callers can fall back. */
export function tierArt(name: string | undefined): string | undefined {
  if (!name) return undefined;
  return TIER_ART[name.toLowerCase() as keyof typeof TIER_ART];
}

/** Indexed by the NFT contract's tier (0 = Bronze), matching `NFT_TIER_NAMES`. */
export const NFT_TIER_ART = [bronzeSvg, silverSvg, goldSvg] as const;
