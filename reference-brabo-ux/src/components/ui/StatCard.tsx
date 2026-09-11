import { CountUp } from "../../lib/countup";

interface StatCardProps {
  label: string;
  value: string;
  subValue?: string;
  /** Renders a shimmer in place of the value. A stat that shows "--" while its
   * contract read is in flight reads as broken data rather than as pending. */
  loading?: boolean;
  /** Optional leading artwork (an NFT tier medallion). Decorative — the value
   * beside it already names the tier. */
  icon?: string;
  /** Animates the displayed value on change (ported from legacy-site's CountUp.js integration,
   * but state-driven instead of a MutationObserver, and re-animates on every update instead of
   * only once — the legacy `data-counted` guard silently froze stats after their first render). */
  countUp?: { end: number; decimals?: number; prefix?: string; suffix?: string };
}

export function StatCard({ label, value, subValue, loading, icon, countUp }: StatCardProps) {
  return (
    <div className="stat-card">
      <div className="stat-label">{label}</div>
      <div className="stat-value">
        {icon && !loading && (
          <img src={icon} className="stat-icon" alt="" width={28} height={28} loading="lazy" />
        )}
        {loading ? (
          <span className="skeleton" aria-label={`${label} loading`} />
        ) : countUp ? (
          <CountUp
            end={countUp.end}
            decimals={countUp.decimals ?? 2}
            duration={2.5}
            separator=","
            prefix={countUp.prefix}
            suffix={countUp.suffix}
            useEasing
            preserveValue
          />
        ) : (
          value
        )}
      </div>
      {subValue && !loading && <div className="stat-subvalue">{subValue}</div>}
    </div>
  );
}
