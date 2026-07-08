import { Link } from "react-router-dom";

const DISTRIBUTION = [
  {
    icon: "🔺",
    amount: "50,000 $BRB",
    percentage: "0.5%",
    label: "Initial LP Liquidity",
    description: "Bootstrapped the initial pool to enable trading",
  },
  {
    icon: "📦",
    amount: "8,000,000 $BRB",
    percentage: "80%",
    label: "Smart Contract Reserve",
    description: "Buyback compensation & liquidity addition from funding transactions",
  },
  {
    icon: "⏱️",
    amount: "1,000,000 $BRB",
    percentage: "10%",
    label: "Staking Reserve",
    description: "Reserved for future staking rewards program",
  },
];

const COMING_SOON = [
  {
    icon: "⏱️",
    badge: "Coming Soon",
    title: "BRB Staking",
    description:
      "Stake your $BRB tokens to earn passive rewards. Lock your tokens for flexible periods and earn competitive APY while supporting the ecosystem's growth.",
    features: ["Flexible lock periods", "Competitive APY rewards", "Auto-compounding options"],
  },
  {
    icon: "🎮",
    badge: "Coming Soon",
    title: "BRB Gaming",
    description:
      "Play-to-earn gaming experiences powered by $BRB. Engage in skill-based games, tournaments, and challenges to win $BRB rewards and exclusive NFTs.",
    features: ["Play-to-earn mechanics", "Tournament competitions", "Exclusive NFT rewards"],
  },
  {
    icon: "🎲",
    badge: "Coming Soon",
    title: "BRB Betting",
    description:
      "Decentralized prediction markets and betting platform. Use $BRB to participate in sports betting, event predictions, and community-driven wagers.",
    features: ["Decentralized predictions", "Sports & events betting", "Community wagers"],
  },
  {
    icon: "✨",
    badge: "In Development",
    title: "And Much More...",
    description:
      "The Brabo ecosystem is constantly evolving. We're developing additional DeFi products, NFT utilities, governance features, and innovative integrations to maximize $BRB value.",
    features: ["NFT marketplace", "DAO governance", "Cross-chain bridges"],
  },
];

export function EcosystemPage() {
  return (
    <div className="page-content">
      <section className="hero-section">
        <h1 className="hero-title">BRABO ($BRB) Ecosystem</h1>
        <p className="hero-subtitle">
          BRABO ($BRB), pioneering the evolution of fair launch tokenomics with low liquidity
          projects, using a brand new 20/80 model
        </p>
      </section>

      <section className="ecosystem-intro">
        <h2>The Death of Low Liquidity. The Birth of Sustainable DeFi.</h2>
        <p>
          <strong>Most of new and low sponsored Web3 projects fail the same way:</strong> shallow
          liquidity, trapped holders, collapsed trust. Brabo flips the script with inverted 20/80
          tokenomics that solves what kills 99% of launches, for initial low liquidity Web3
          project tokens.
        </p>
        <p>
          <strong>20% Buyback.</strong> Instant buy pressure from the Uniswap pool. Your $BRB
          delivered immediately.
          <br />
          <strong>80% Liquidity Building.</strong> Systematically deepens the pool. Every
          transaction strengthens the foundation.
        </p>
        <p>
          <strong>This isn't just fair launch. This is the evolution Web3 desperately needs.</strong>
        </p>

        <h3>Token Distribution: Built for Transparency</h3>
        <div className="distribution-grid">
          {DISTRIBUTION.map((item) => (
            <div key={item.label} className="distribution-item">
              <span className="distribution-icon">{item.icon}</span>
              <div className="distribution-amount">
                {item.amount} <span className="distribution-percentage">({item.percentage})</span>
              </div>
              <div className="distribution-label">{item.label}</div>
              <div className="distribution-description">{item.description}</div>
            </div>
          ))}
        </div>
        <p className="distribution-note">
          <strong>Total Supply: 10,000,000 $BRB</strong> — No team allocation, no presale, no
          hidden wallets. Pure community-driven model. Just 5% allocated for me in case I want to
          add more liquidity to project or buy me a BWM.
        </p>
      </section>

      <section className="ecosystem-coming-soon">
        <h3>Coming Soon</h3>
        <div className="ecosystem-grid">
          {COMING_SOON.map((card) => (
            <div key={card.title} className="ecosystem-card">
              <div className="ecosystem-card-header">
                <span className="ecosystem-icon">{card.icon}</span>
                <span className="coming-soon-badge">{card.badge}</span>
              </div>
              <h4>{card.title}</h4>
              <p>{card.description}</p>
              <ul className="ecosystem-features">
                {card.features.map((feature) => (
                  <li key={feature}>✓ {feature}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="ecosystem-cta">
        <h3>Be Part of the Evolution</h3>
        <p>
          Fund with ETH now to secure your position in the Brabo ecosystem. Early $BRB holders
          will receive exclusive benefits and early access to all upcoming features.
        </p>
        <Link to="/" className="cta-button">
          Start Funding Now →
        </Link>
      </section>
    </div>
  );
}
