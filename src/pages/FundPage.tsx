import { FundingCard } from "../components/fund/FundingCard";
import { HowItWorks } from "../components/fund/HowItWorks";
import { StatsGrid } from "../components/fund/StatsGrid";
import { TierProgressionTrack } from "../components/fund/TierProgressionTrack";
import { useFundPageAnimations } from "../hooks/useFundPageAnimations";
import bullPortrait from "../assets/brand/brabo-bull-512.png";

const HERO_SUBTITLE = "Fund with ETH, receive $BRB instantly, and unlock NFT tier bonuses.";

export function FundPage() {
  const { subtitleRef } = useFundPageAnimations(HERO_SUBTITLE);

  return (
    <div className="page-content fund-page">
      <section className="hero-section">
        {/* The mascot watching, cropped by the viewport rather than framed.
            Not lazy: this sits in the first viewport, and `loading="lazy"` on
            above-the-fold content defers the request until after layout, which
            pushed it out to a ~5.8s largest-contentful-paint. `fetchPriority`
            low + async decode keeps it from competing with the headline
            instead — it yields, rather than starting late. */}
        <img
          src={bullPortrait}
          className="hero-bull"
          alt=""
          aria-hidden="true"
          fetchPriority="low"
          decoding="async"
        />
        <div className="hero-copy">
          <span className="hero-eyebrow">
            <span className="dot" aria-hidden="true" />
            Live on Base
          </span>
          <h1 className="hero-title">
            Fund the <span className="accent">bull</span> run
          </h1>
          {/* aria-hidden + a static sibling: the typewriter mutates this node one
              character at a time, which a screen reader would announce as a
              stream of fragments. */}
          <p ref={subtitleRef} className="hero-subtitle" aria-hidden="true">
            {HERO_SUBTITLE}
          </p>
          <p className="sr-only">{HERO_SUBTITLE}</p>
        </div>
      </section>

      <StatsGrid />
      <FundingCard />
      <TierProgressionTrack />
      <HowItWorks />
    </div>
  );
}
