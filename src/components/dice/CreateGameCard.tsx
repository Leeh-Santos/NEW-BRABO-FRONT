import { useState } from "react";
import { formatUnits, parseUnits } from "viem";
import { useAccount } from "wagmi";
import { useBrbBalance } from "../../hooks/useBrbBalance";
import { formatTokenAmount } from "../../lib/formatters";

const PRESETS = ["1000", "10000", "100000"];

interface CreateGameCardProps {
  isBusy: boolean;
  busyLabel?: string;
  onThrow: (amount: bigint) => Promise<unknown>;
}

function parseStake(value: string): bigint | undefined {
  try {
    const parsed = parseUnits(value, 18);
    return parsed > 0n ? parsed : undefined;
  } catch {
    return undefined;
  }
}

export function CreateGameCard({ isBusy, busyLabel, onThrow }: CreateGameCardProps) {
  const [amount, setAmount] = useState("");
  const { isConnected } = useAccount();
  const { data: balance, refetch: refetchBalance } = useBrbBalance();

  const stake = parseStake(amount);
  const insufficient = stake !== undefined && balance !== undefined && stake > balance;
  const canSubmit = isConnected && stake !== undefined && !insufficient && !isBusy;

  const handleThrow = async () => {
    if (stake === undefined) return;
    const gameId = await onThrow(stake);
    if (gameId !== undefined) setAmount("");
    refetchBalance();
  };

  return (
    <div className="funding-card dice-create-card">
      <div className="dice-card-head">
        <label htmlFor="diceStake" className="input-label">
          Stake ($BRB)
        </label>
        {isConnected && (
          <span className="input-label">Balance {formatTokenAmount(balance)}</span>
        )}
      </div>
      <div className="eth-input-row">
        <input
          id="diceStake"
          type="number"
          min="0"
          step="1"
          inputMode="decimal"
          placeholder="0"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="eth-input"
        />
        <button
          type="button"
          className="max-btn"
          disabled={!isConnected || !balance}
          onClick={() => balance && setAmount(formatUnits(balance, 18))}
        >
          Max
        </button>
      </div>
      <div className="dice-presets">
        {PRESETS.map((preset) => (
          <button
            key={preset}
            type="button"
            className="copy-btn"
            onClick={() => setAmount(preset)}
          >
            {Number(preset).toLocaleString("en-US")}
          </button>
        ))}
      </div>

      <div className="breakdown-section">
        <div className="breakdown-row">
          <span className="breakdown-label">Your stake</span>
          <span className="breakdown-value">{stake ? formatTokenAmount(stake) : "0.00"} $BRB</span>
        </div>
        <div className="breakdown-row">
          <span className="breakdown-label">Challenger matches</span>
          <span className="breakdown-value">{stake ? formatTokenAmount(stake) : "0.00"} $BRB</span>
        </div>
        <div className="breakdown-row breakdown-total">
          <span className="breakdown-label">Winner takes</span>
          <span className="breakdown-value">{stake ? formatTokenAmount(stake * 2n) : "0.00"} $BRB</span>
        </div>
      </div>

      <button type="button" className="fund-btn" disabled={!canSubmit} onClick={handleThrow}>
        {!isConnected
          ? "Connect Wallet First"
          : isBusy
            ? (busyLabel ?? "Processing...")
            : insufficient
              ? "Insufficient $BRB"
              : stake !== undefined
                ? "Throw Coin"
                : "Enter Stake"}
      </button>
      <p className="dice-fineprint">
        Your stake is locked until a challenger accepts. Unmatched after 24h? Reclaim it from the
        lobby.
      </p>
    </div>
  );
}
