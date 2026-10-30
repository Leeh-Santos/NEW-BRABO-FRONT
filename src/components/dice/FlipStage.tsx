import { useAccount } from "wagmi";
import { useDiceGame } from "../../hooks/useDiceGames";
import { DiceStatus, isSameAddress, sideLabel } from "../../lib/dice";
import { formatTokenAmount, shortenAddress } from "../../lib/formatters";
import { Coin } from "./Coin";

interface FlipStageProps {
  /** The game the viewer just created or accepted. Undefined shows the idle table. */
  gameId?: bigint;
  onClear: () => void;
}

/** The table: two coins, creator vs challenger, following one game through its VRF flips. */
export function FlipStage({ gameId, onClear }: FlipStageProps) {
  const { address } = useAccount();
  const { data: game } = useDiceGame(gameId, true);

  if (gameId === undefined || !game) {
    return (
      <div className="flip-stage">
        <div className="flip-stage-head">
          <span className="stage-label">The table</span>
        </div>
        <div className="coin-pair">
          <Coin label="Creator" />
          <span className="coin-vs">vs</span>
          <Coin label="Challenger" />
        </div>
        <p className="flip-stage-copy">
          Two coins, one pot. The challenger wins if their coin lands on the{" "}
          <strong>other</strong> side — same side, the creator takes it all.
        </p>
      </div>
    );
  }

  const status = game.status as DiceStatus;
  const isCreator = isSameAddress(address, game.creator);
  const creatorKnown = status >= DiceStatus.Open && status !== DiceStatus.Refunded;
  const challengerKnown = status === DiceStatus.Finished;
  const pot = game.amount * 2n;
  const won = challengerKnown && isSameAddress(address, game.winner);

  let headline: string;
  let copy: string;
  let tone = "";
  switch (status) {
    case DiceStatus.AwaitingCreatorFlip:
      headline = "Coin in the air";
      copy = "Chainlink VRF is drawing the creator's side. This usually takes a few blocks.";
      break;
    case DiceStatus.Open:
      headline = `Landed ${sideLabel(game.creatorSide)}`;
      copy = isCreator
        ? `Your game is in the lobby. If a challenger also lands ${sideLabel(game.creatorSide)}, you take the ${formatTokenAmount(pot)} $BRB pot.`
        : "Waiting for a challenger.";
      break;
    case DiceStatus.AwaitingChallengerFlip:
      headline = "Challenger flipping";
      copy = `The creator landed ${sideLabel(game.creatorSide)}. Land ${sideLabel(1 - game.creatorSide)} to win.`;
      break;
    case DiceStatus.Finished:
      headline = won ? "You won" : address && (isCreator || isSameAddress(address, game.challenger)) ? "You lost" : "Settled";
      tone = won ? "is-win" : "is-loss";
      copy = `${shortenAddress(game.winner)} took ${formatTokenAmount(pot)} $BRB.`;
      break;
    case DiceStatus.Refunded:
      headline = "Refunded";
      copy = "Every stake in this game was returned.";
      break;
    default:
      headline = "Unknown game";
      copy = "";
  }

  return (
    <div className={`flip-stage ${tone}`}>
      <div className="flip-stage-head">
        <span className="stage-label">Game #{gameId.toString()}</span>
        <button type="button" className="copy-btn" onClick={onClear}>
          Close
        </button>
      </div>
      <div className="coin-pair">
        <Coin
          label={isCreator ? "You" : "Creator"}
          side={creatorKnown ? game.creatorSide : undefined}
          spinning={status === DiceStatus.AwaitingCreatorFlip}
        />
        <span className="coin-vs">vs</span>
        <Coin
          label={!isCreator && isSameAddress(address, game.challenger) ? "You" : "Challenger"}
          side={challengerKnown ? game.challengerSide : undefined}
          spinning={status === DiceStatus.AwaitingChallengerFlip}
        />
      </div>
      <div className="flip-stage-result" aria-live="polite">
        <h3>{headline}</h3>
        <p className="flip-stage-copy">{copy}</p>
      </div>
    </div>
  );
}
