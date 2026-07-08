const STEPS = [
  { number: 1, title: "Connect Wallet", description: "Connect your Web3 wallet to get started" },
  {
    number: 2,
    title: "Fund with ETH",
    description: "20% goes to Liquidity Pool buyback, 80% to liquidity",
  },
  {
    number: 3,
    title: "Receive $BRB",
    description: "Get $BRB tokens instantly with bonus rewards",
  },
  {
    number: 4,
    title: "Earn NFT Tiers",
    description: "Unlock Bronze, Silver, and Gold tier bonuses",
  },
];

export function HowItWorks() {
  return (
    <div className="how-it-works">
      <h3 className="section-title">How It Works</h3>
      <div className="steps-grid">
        {STEPS.map((step) => (
          <div key={step.number} className="step-card">
            <div className="step-number">{step.number}</div>
            <h4 className="step-title">{step.title}</h4>
            <p className="step-description">{step.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
