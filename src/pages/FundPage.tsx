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
            Lazy + async: it is decorative and must never delay the headline. */}
        <img
          src={bullPortrait}
          className="hero-bull"
          alt=""
          aria-hidden="true"
          loading="lazy"
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
