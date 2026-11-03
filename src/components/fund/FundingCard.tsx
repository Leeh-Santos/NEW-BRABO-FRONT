import { useState } from "react";
import { formatEther, parseEther } from "viem";
import { useAccount, useBalance } from "wagmi";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { useEthPrice } from "../../hooks/useEthPrice";
import { useFundMinimum } from "../../hooks/useFundMinimum";
import { useFundQuote } from "../../hooks/useFundQuote";
import { useFundTransaction } from "../../hooks/useFundTransaction";
import { useUserData } from "../../hooks/useUserData";
import { formatUsd } from "../../lib/formatters";
import { calculateBonusTokens, roundUpEth } from "../../lib/quote";
import { QuoteBreakdown } from "./QuoteBreakdown";

export function FundingCard() {
  const [ethAmount, setEthAmount] = useState("");
  const debouncedAmount = useDebouncedValue(ethAmount, 500);
  const { address, isConnected } = useAccount();
  const { data: balance } = useBalance({ address });

  const { data: quote, isFetching: isQuoteLoading } = useFundQuote(debouncedAmount);
  const { bonusPercentage, tierName, refetch: refetchUserData } = useUserData();
  const { data: ethPriceUsd } = useEthPrice();
  const { minimumWei, minimumUsd } = useFundMinimum();
  const minimumEth = minimumWei !== undefined ? roundUpEth(minimumWei) : undefined;

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
  // fund() reverts below MINIMUM_USD, so block it here instead of letting the wallet fail.
  const isBelowMinimum =
    isValidAmount && minimumWei !== undefined && toWei(ethAmount) < minimumWei;
  const canSubmit = isConnected && isValidAmount && !isBelowMinimum && !isBusy;

  const usdValue =
    isValidAmount && ethPriceUsd !== undefined
      ? parseFloat(ethAmount) * ethPriceUsd
      : undefined;

  const handleMaxClick = () => {
    if (!balance) return;
    setEthAmount(formatEther(balance.value));
  };

  return (
    <div className="funding-card">
      <label htmlFor="ethInput" className="input-label">
        ETH Amount
      </label>
      <div className="eth-input-row">
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
        <button
          type="button"
          className="max-btn"
          disabled={!isConnected || !balance}
          onClick={handleMaxClick}
        >
          Max
        </button>
      </div>
      {usdValue !== undefined && <div className="eth-input-usd">≈ {formatUsd(usdValue)}</div>}
      {minimumEth !== undefined && minimumUsd !== undefined && (
        <div className={`eth-input-min${isBelowMinimum ? " is-below" : ""}`}>
          Minimum{" "}
          <button type="button" className="eth-input-min-btn" onClick={() => setEthAmount(minimumEth)}>
            {minimumEth} ETH
          </button>{" "}
          (≈ {formatUsd(minimumUsd)})
        </div>
      )}

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
            : isBelowMinimum && minimumUsd !== undefined
              ? `Below ${formatUsd(minimumUsd)} Minimum`
              : isValidAmount
              ? "Fund Now"
              : "Enter Amount"}
      </button>
    </div>
  );
}

function toWei(ethAmount: string): bigint {
  try {
    return parseEther(ethAmount);
  } catch {
    return 0n;
  }
}
