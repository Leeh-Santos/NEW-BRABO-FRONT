import { useConnectModal } from "@rainbow-me/rainbowkit";
import { Link } from "react-router-dom";
import { useAccount } from "wagmi";
import { ActivitySummary } from "../components/portfolio/ActivitySummary";
import { NftDisplay } from "../components/portfolio/NftDisplay";
import { PositionOverview } from "../components/portfolio/PositionOverview";
import { TierCards } from "../components/portfolio/TierCards";
import { TierProgressionBar } from "../components/portfolio/TierProgressionBar";
import { useUserData } from "../hooks/useUserData";

export function PortfolioPage() {
  const { isConnected } = useAccount();
  const { refetch } = useUserData();
  const { openConnectModal } = useConnectModal();

  if (!isConnected) {
    return (
      <div className="page-content connect-prompt">
        <h1>Portfolio</h1>
        <p>Connect your wallet to view your position, NFT tier, and funding activity.</p>
        <button type="button" className="fund-btn" onClick={openConnectModal}>
          Connect Wallet
        </button>
      </div>
    );
  }

  return (
    <div className="page-content">
      <div className="page-header-row">
        <h1>Portfolio</h1>
        <div className="quick-actions">
          <Link to="/" className="btn-secondary">
            Fund More ETH
          </Link>
          <button type="button" className="btn-secondary" onClick={() => refetch()}>
            Refresh
          </button>
        </div>
      </div>

      <PositionOverview />

      <section className="portfolio-section">
        <h3>Your NFT</h3>
        <NftDisplay />
      </section>

      <section className="portfolio-section">
        <h3>Tier Progression</h3>
        <TierProgressionBar />
        <TierCards />
      </section>

      <section className="portfolio-section">
        <h3>Activity Summary</h3>
        <ActivitySummary />
      </section>
    </div>
  );
}
