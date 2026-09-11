import { useState } from "react";
import { useAccount } from "wagmi";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { useFundQuote } from "../../hooks/useFundQuote";
import { useFundTransaction } from "../../hooks/useFundTransaction";
import { useUserData } from "../../hooks/useUserData";
import { calculateBonusTokens } from "../../lib/quote";
import { QuoteBreakdown } from "./QuoteBreakdown";

export function FundingCard() {
  const [ethAmount, setEthAmount] = useState("");
  const debouncedAmount = useDebouncedValue(ethAmount, 500);
  const { isConnected } = useAccount();

  const { data: quote, isFetching: isQuoteLoading } = useFundQuote(debouncedAmount);
  const { bonusPercentage, tierName, refetch: refetchUserData } = useUserData();

  const { fund, isBusy } = useFundTransaction(() => {
    setEthAmount("");
    refetchUserData();
  });

  const bonusPica =
    quote && bonusPercentage !== undefined
      ? calculateBonusTokens(quote.totalPica, bonusPercentage)
      : 0n;
  const totalWithBonus = quote ? quote.totalPica + bonusPica : undefined;

  const isValidAmount = parseFloat(ethAmount) > 0;
  const canSubmit = isConnected && isValidAmount && !isBusy;

  return (
    <div className="funding-card">
      <label htmlFor="ethInput" className="input-label">
        ETH Amount
      </label>
      <input
        id="ethInput"
        type="number"
        min="0"
        step="0.001"
        placeholder="0.0"
        value={ethAmount}
        onChange={(e) => setEthAmount(e.target.value)}
        className="eth-input"
      />

      {isValidAmount && (
        <QuoteBreakdown
          buybackWei={quote?.buybackWei}
          swapOutputPica={quote?.swapOutputPica}
          batchWei={quote?.batchWei}
          compensationPica={quote?.compensationPica}
          bonusPercentage={bonusPercentage}
          tierName={tierName}
          bonusPica={bonusPica}
          totalWithBonus={totalWithBonus}
          isLoading={isQuoteLoading}
        />
      )}

      <button
        type="button"
        className="fund-btn"
        disabled={!canSubmit}
        onClick={() => fund(ethAmount)}
      >
        {!isConnected
          ? "Connect Wallet First"
          : isBusy
            ? "Processing..."
            : isValidAmount
              ? "Fund Now"
              : "Enter Amount"}
      </button>
    </div>
  );
}
