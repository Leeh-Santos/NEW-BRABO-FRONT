import { ContractAddressCard } from "../components/contracts/ContractAddressCard";
import { CONTRACT_ADDRESSES } from "../config/contracts";

export function ContractsPage() {
  return (
    <div className="page-content">
      <section className="hero-section">
        <h1 className="hero-title">Deployed Contracts</h1>
        <p className="hero-subtitle">
          Verified and transparent — all contracts are open source on BaseScan
        </p>
      </section>

      <section className="contracts-intro">
        <span className="transparency-badge">🛡️ 100% Verified & Audited</span>
        <h2>Full Transparency</h2>
        <p>
          All Brabo Markets smart contracts are verified on BaseScan and fully open source. You
          can view the source code, verify the contract logic, and interact directly with the
          contracts. Our commitment to transparency ensures you can trust the protocol.
        </p>
      </section>

      <div className="contracts-grid">
        <ContractAddressCard
          icon="🏦"
          name="Brabo Fund Contract"
          description="Main funding contract. Handles ETH deposits, BRB token distribution, buyback mechanism, and liquidity provision."
          address={CONTRACT_ADDRESSES.FUNDME}
          explorerUrl={`https://basescan.org/address/${CONTRACT_ADDRESSES.FUNDME}`}
        />
        <ContractAddressCard
          icon="🎖️"
          name="Brabo Funder NFT"
          description="ERC-721 NFT contract. Mints tier-based NFTs (Bronze, Silver, Gold) that provide bonus rewards based on funding amount."
          address={CONTRACT_ADDRESSES.NFT}
          explorerUrl={`https://basescan.org/address/${CONTRACT_ADDRESSES.NFT}`}
        />
        <ContractAddressCard
          icon="🪙"
          name="$BRB Token"
          description="ERC-20 token contract. The native Brabo Markets token distributed to funders through the buyback mechanism."
          address={CONTRACT_ADDRESSES.PICA_TOKEN}
          explorerUrl={`https://basescan.org/token/${CONTRACT_ADDRESSES.PICA_TOKEN}`}
        />
      </div>

      <section className="security-notice">
        <h3>Security & Trust</h3>
        <p>
          All contracts have been deployed on Base Network and are fully verified on BaseScan. The
          code is open source and auditable by anyone. Always verify contract addresses before
          interacting.
        </p>
        <ul className="security-tips">
          <li>✓ Verified on BaseScan</li>
          <li>✓ Open source code</li>
          <li>✓ Immutable on Base</li>
        </ul>
      </section>
    </div>
  );
}
