import coinLogo from "../../assets/brand/brabo-coin-256.webp";
import { sideLabel } from "../../lib/dice";

interface CoinProps {
  /** 0 = heads, 1 = tails. Undefined while nothing has been flipped yet. */
  side?: number;
  spinning?: boolean;
  label: string;
}

/** A two-faced $BRB coin: the official Brabo bull on heads, the ticker on tails. While a VRF
 * answer is pending it spins on its Y axis; once a side is known it settles on that face. */
export function Coin({ side, spinning, label }: CoinProps) {
  const state = spinning ? "is-spinning" : side === 1 ? "is-tails" : side === 0 ? "is-heads" : "is-idle";

  return (
    <figure className="coin-slot">
      <div className={`coin ${state}`} aria-hidden="true">
        <div className="coin-face coin-heads">
          <img src={coinLogo} alt="" width={256} height={256} decoding="async" />
        </div>
        <div className="coin-face coin-tails">
          <span>BRB</span>
        </div>
      </div>
      <figcaption>
        <span className="coin-label">{label}</span>
        <span className="coin-result">
          {spinning ? "Flipping…" : side !== undefined ? sideLabel(side) : "—"}
        </span>
      </figcaption>
    </figure>
  );
}
