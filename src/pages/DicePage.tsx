import { useRef, useState } from "react";
import { useAccount } from "wagmi";
import { CreateGameCard } from "../components/dice/CreateGameCard";
import { DiceGameTable } from "../components/dice/DiceGameTable";
import { FlipStage } from "../components/dice/FlipStage";
import { StatCard } from "../components/ui/StatCard";
import { useDiceActions, type DiceAction } from "../hooks/useDiceActions";
import { useDiceGames } from "../hooks/useDiceGames";
import { useNow } from "../hooks/useNow";
import { DiceStatus, isOpenExpired, isRefundable, isSameAddress, type DiceGame } from "../lib/dice";
import { formatTokenAmount } from "../lib/formatters";

const BUSY_LABELS: Record<DiceAction, string> = {
  approve: "Approving $BRB...",
  throw: "Throwing...",
  accept: "Accepting...",
  refund: "Refunding...",
  withdraw: "Withdrawing...",
};

const STEPS = [
  { number: 1, title: "Throw a coin", description: "Lock a $BRB stake. Chainlink VRF flips your coin and your game opens in the lobby." },
  { number: 2, title: "Get challenged", description: "Anyone can match your stake. Their coin is flipped by VRF too — nobody picks a side." },
  { number: 3, title: "Same side? Creator wins", description: "Matching sides pay the creator, opposite sides pay the challenger. 2× the stake, no fee." },
  { number: 4, title: "Never stuck", description: "Unmatched after 24h, or VRF silent for 24h? Refund returns every stake to its owner." },
];

export function DicePage() {
  const { address, isConnected } = useAccount();
  const now = useNow();
  const { games, openIds, recentIds, nextGameId, pendingWithdrawal, isLoading, refetch } =
    useDiceGames();
  const { throwCoin, acceptChallenge, refund, withdraw, busy } = useDiceActions(refetch);
  const [activeGameId, setActiveGameId] = useState<bigint>();
  const stageRef = useRef<HTMLDivElement>(null);

  const focusGame = (id: bigint) => {
    setActiveGameId(id);
    stageRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const lobby = openIds
    .map((id) => games.get(id))
    .filter((g): g is DiceGame => !!g && g.status === DiceStatus.Open)
    .sort((a, b) => Number(isOpenExpired(a, now)) - Number(isOpenExpired(b, now)) || Number(b.id - a.id));
  const liveLobby = lobby.filter((g) => !isOpenExpired(g, now));
  const lockedInLobby = liveLobby.reduce((sum, g) => sum + g.amount, 0n);

  const recent = recentIds.map((id) => games.get(id)).filter((g): g is DiceGame => !!g);
  const mine = recent.filter(
    (g) => isSameAddress(address, g.creator) || isSameAddress(address, g.challenger),
  );
  const settled = recent.filter((g) => g.status === DiceStatus.Finished).slice(0, 10);

  const isBusy = busy !== null;
  const isBusyFor = (action: DiceAction, id: bigint) => busy?.action === action && busy.gameId === id;

  const refundButton = (game: DiceGame) => (
    <button
      type="button"
      className="btn-secondary dice-action"
      disabled={isBusy}
      onClick={() => refund(game.id)}
    >
      {isBusyFor("refund", game.id) ? "Refunding..." : "Refund"}
    </button>
  );

  return (
    <div className="page-content dice-page">
      <section className="hero-section">
        <div className="hero-copy">
          <span className="hero-eyebrow">
            <span className="dot" aria-hidden="true" />
            Chainlink VRF · Base
          </span>
          <h1 className="hero-title">
            Brabo <span className="accent">Dice</span>
          </h1>
          <p className="hero-subtitle">
            1v1 $BRB coin flip. Stake, flip, and let verifiable randomness decide who takes the pot.
          </p>
        </div>
      </section>

      <div className="stats-grid dice-stats">
        <StatCard
          label="Open Challenges"
          value={liveLobby.length.toString()}
          loading={isLoading}
        />
        <StatCard
          label="$BRB In The Lobby"
          value={formatTokenAmount(lockedInLobby)}
          loading={isLoading}
        />
        <StatCard
          label="Games Played"
          value={nextGameId !== undefined ? (nextGameId - 1n).toString() : "--"}
          loading={nextGameId === undefined}
        />
      </div>

      {pendingWithdrawal !== undefined && pendingWithdrawal > 0n && (
        <div className="dice-banner">
          <span>
            You have <strong>{formatTokenAmount(pendingWithdrawal)} $BRB</strong> in winnings
            waiting — the automatic payout couldn't be delivered.
          </span>
          <button type="button" className="cta-button" disabled={isBusy} onClick={() => withdraw()}>
            {busy?.action === "withdraw" ? "Withdrawing..." : "Withdraw"}
          </button>
        </div>
      )}

      <section className="dice-play">
        <CreateGameCard
          isBusy={isBusy}
          busyLabel={busy ? BUSY_LABELS[busy.action] : undefined}
          onThrow={async (amount) => {
            const id = await throwCoin(amount);
            if (id !== undefined) focusGame(id);
            return id;
          }}
        />
        <div ref={stageRef}>
          <FlipStage gameId={activeGameId} onClear={() => setActiveGameId(undefined)} />
        </div>
      </section>

      <section className="dice-section">
        <h3 className="section-title">Lobby</h3>
        <DiceGameTable
          variant="lobby"
          games={lobby}
          now={now}
          empty={
            isLoading ? "Loading lobby…" : "No open games right now. Throw the first coin above."
          }
          renderAction={(game) => {
            if (isOpenExpired(game, now)) return refundButton(game);
            if (isSameAddress(address, game.creator)) {
              return <span className="dice-you">Your game</span>;
            }
            return (
              <button
                type="button"
                className="fund-btn dice-action"
                disabled={!isConnected || isBusy}
                onClick={async () => {
                  const id = await acceptChallenge(game.id, game.amount);
                  if (id !== undefined) focusGame(id);
                }}
              >
                {busy?.gameId === game.id
                  ? BUSY_LABELS[busy.action]
                  : `Match ${formatTokenAmount(game.amount)}`}
              </button>
            );
          }}
        />
      </section>

      {isConnected && (
        <section className="dice-section">
          <h3 className="section-title">Your Games</h3>
          <DiceGameTable
            variant="history"
            games={mine}
            now={now}
            empty="You haven't played a recent game yet."
            onSelect={(game) => focusGame(game.id)}
            renderAction={(game) => (isRefundable(game, now) ? refundButton(game) : null)}
          />
        </section>
      )}

      <section className="dice-section">
        <h3 className="section-title">Recent Results</h3>
        <DiceGameTable
          variant="history"
          games={settled}
          now={now}
          empty={isLoading ? "Loading results…" : "No games settled yet."}
          onSelect={(game) => focusGame(game.id)}
        />
      </section>

      <section className="how-it-works">
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
      </section>
    </div>
  );
}
