import { FundingCard } from "../components/fund/FundingCard";
import { HowItWorks } from "../components/fund/HowItWorks";
import { StatsGrid } from "../components/fund/StatsGrid";
import { TierProgressionTrack } from "../components/fund/TierProgressionTrack";
import { useFundPageAnimations } from "../hooks/useFundPageAnimations";
import "../styles/background.css";

const HERO_SUBTITLE = "Fund with ETH, receive $BRB instantly, and unlock NFT tier bonuses.";

export function FundPage() {
  const { vantaRef, subtitleRef } = useFundPageAnimations(HERO_SUBTITLE);

  return (
    <div className="page-content fund-page">
      <div ref={vantaRef} className="bg-image-wrapper" />

      <section className="hero-section">
        <h1 className="hero-title">Fund Brabo Markets</h1>
        <p ref={subtitleRef} className="hero-subtitle">
          {HERO_SUBTITLE}
        </p>
      </section>

      <StatsGrid />
      <FundingCard />
      <TierProgressionTrack />
      <HowItWorks />
    </div>
  );
}
