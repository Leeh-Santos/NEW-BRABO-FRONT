import { formatEthAmount, formatTokenAmount } from "../../lib/formatters";

interface QuoteBreakdownProps {
  buybackWei?: bigint;
  swapOutputPica?: bigint;
  batchWei?: bigint;
  compensationPica?: bigint;
  bonusPercentage?: bigint;
  tierName?: string;
  bonusPica?: bigint;
  totalWithBonus?: bigint;
  isLoading: boolean;
}

export function QuoteBreakdown({
  buybackWei,
  swapOutputPica,
  batchWei,
  compensationPica,
  bonusPercentage,
  tierName,
  bonusPica,
  totalWithBonus,
  isLoading,
}: QuoteBreakdownProps) {
  return (
    <div className="breakdown-section" aria-busy={isLoading}>
      <div className="breakdown-row">
        <span className="breakdown-label">Buyback (20%)</span>
        <span className="breakdown-value">
          {formatEthAmount(buybackWei)} ETH → {formatTokenAmount(swapOutputPica)} BRB
        </span>
      </div>
      <div className="breakdown-row">
        <span className="breakdown-label">Batch allocation (80%)</span>
        <span className="breakdown-value">
          {formatEthAmount(batchWei)} ETH → {formatTokenAmount(compensationPica)} BRB
        </span>
      </div>
      <div className="breakdown-row">
        <span className="breakdown-label">
          NFT bonus {bonusPercentage !== undefined ? `(${bonusPercentage}% – ${tierName})` : ""}
        </span>
        <span className="breakdown-value">+{formatTokenAmount(bonusPica)} BRB</span>
      </div>
      <div className="breakdown-row breakdown-total">
        <span className="breakdown-label">Total BRB received</span>
        <span className="breakdown-value">{formatTokenAmount(totalWithBonus)} BRB</span>
      </div>
    </div>
  );
}
