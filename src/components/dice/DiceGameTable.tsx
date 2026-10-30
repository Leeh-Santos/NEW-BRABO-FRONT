import type { ReactNode } from "react";
import { useAccount } from "wagmi";
import {
  DiceStatus,
  GAME_DURATION_SECONDS,
  describeStatus,
  formatAgo,
  formatTimeLeft,
  isSameAddress,
  sideLabel,
  type DiceGame,
} from "../../lib/dice";
import { formatTokenAmount, shortenAddress } from "../../lib/formatters";

interface DiceGameTableProps {
  games: DiceGame[];
  now: number;
  /** "lobby" shows the creator's side and time left; "history" shows the outcome. */
  variant: "lobby" | "history";
  empty: ReactNode;
  renderAction?: (game: DiceGame) => ReactNode;
  onSelect?: (game: DiceGame) => void;
}

function Player({ address, viewer }: { address: string; viewer?: string }) {
  return isSameAddress(address, viewer) ? <span className="dice-you">You</span> : <>{shortenAddress(address)}</>;
}

export function DiceGameTable({ games, now, variant, empty, renderAction, onSelect }: DiceGameTableProps) {
  const { address } = useAccount();

  if (games.length === 0) return <div className="dice-empty">{empty}</div>;

  return (
    <div className={`dice-table dice-table-${variant}`} role="table">
      <div className="dice-row dice-row-head" role="row">
        <span role="columnheader">Game</span>
        <span role="columnheader">{variant === "lobby" ? "Creator" : "Players"}</span>
        <span role="columnheader">Stake</span>
        <span role="columnheader">{variant === "lobby" ? "Landed" : "Result"}</span>
        <span role="columnheader">{variant === "lobby" ? "Expires" : "When"}</span>
        <span role="columnheader" className="sr-only">
          Action
        </span>
      </div>
      {games.map((game) => {
        const status = describeStatus(game, address, now);
        return (
          <div
            key={game.id.toString()}
            className={`dice-row${onSelect ? " is-clickable" : ""}`}
            role="row"
            onClick={onSelect ? () => onSelect(game) : undefined}
          >
            <span className="dice-cell-id" role="cell">
              #{game.id.toString()}
            </span>
            <span className="dice-cell-player" role="cell">
              <Player address={game.creator} viewer={address} />
              {variant === "history" && game.challenger !== "0x0000000000000000000000000000000000000000" && (
                <>
                  <span className="dice-vs">vs</span>
                  <Player address={game.challenger} viewer={address} />
                </>
              )}
            </span>
            <span className="dice-cell-stake" role="cell">
              {formatTokenAmount(game.amount)} <small>$BRB</small>
            </span>
            <span role="cell">
              {variant === "lobby" ? (
                <span className="dice-side">{sideLabel(game.creatorSide)}</span>
              ) : (
                <span className={`dice-status tone-${status.tone}`}>
                  {status.label}
                  {game.status === DiceStatus.Finished && (
                    <small>
                      {" "}
                      {sideLabel(game.creatorSide)[0]}·{sideLabel(game.challengerSide)[0]}
                    </small>
                  )}
                </span>
              )}
            </span>
            <span className="dice-cell-time" role="cell">
              {variant === "lobby"
                ? formatTimeLeft(game.createdAt + GAME_DURATION_SECONDS - now)
                : formatAgo(game.acceptedAt || game.createdAt, now)}
            </span>
            <span className="dice-cell-action" role="cell" onClick={(e) => e.stopPropagation()}>
              {renderAction?.(game)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
