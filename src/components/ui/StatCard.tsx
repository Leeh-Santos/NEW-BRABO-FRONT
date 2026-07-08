import { CountUp } from "../../lib/countup";

interface StatCardProps {
  label: string;
  value: string;
  subValue?: string;
  /** Animates the displayed value on change (ported from legacy-site's CountUp.js integration,
   * but state-driven instead of a MutationObserver, and re-animates on every update instead of
   * only once — the legacy `data-counted` guard silently froze stats after their first render). */
  countUp?: { end: number; decimals?: number; prefix?: string; suffix?: string };
}

export function StatCard({ label, value, subValue, countUp }: StatCardProps) {
  return (
    <div className="stat-card">
      <div className="stat-label">{label}</div>
      <div className="stat-value">
        {countUp ? (
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
      {subValue && <div className="stat-subvalue">{subValue}</div>}
    </div>
  );
}
