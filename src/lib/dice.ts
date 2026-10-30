import type { Address } from "viem";

/** Mirrors `BraboDice.Status` — the numeric order must match the Solidity enum. */
export const DiceStatus = {
  None: 0,
  AwaitingCreatorFlip: 1,
  Open: 2,
  AwaitingChallengerFlip: 3,
  Finished: 4,
  Refunded: 5,
} as const;

export type DiceStatus = (typeof DiceStatus)[keyof typeof DiceStatus];

export interface DiceGame {
  id: bigint;
  creator: Address;
  challenger: Address;
  winner: Address;
  amount: bigint;
  createdAt: number; // unix seconds
  acceptedAt: number;
  creatorSide: number; // 0 = heads, 1 = tails
  challengerSide: number;
  status: DiceStatus;
}

/** Both GAME_DURATION and VRF_TIMEOUT are 24h constants in the contract. */
export const GAME_DURATION_SECONDS = 24 * 60 * 60;
export const VRF_TIMEOUT_SECONDS = 24 * 60 * 60;

export const sideLabel = (side: number) => (side === 0 ? "Heads" : "Tails");

export function isSameAddress(a?: string, b?: string): boolean {
  return !!a && !!b && a.toLowerCase() === b.toLowerCase();
}

export function isOpenExpired(game: DiceGame, nowSeconds: number): boolean {
  return game.status === DiceStatus.Open && nowSeconds > game.createdAt + GAME_DURATION_SECONDS;
}

/** Client-side copy of the branch conditions in `BraboDice.refund`. */
export function isRefundable(game: DiceGame, nowSeconds: number): boolean {
  switch (game.status) {
    case DiceStatus.Open:
      return nowSeconds > game.createdAt + GAME_DURATION_SECONDS;
    case DiceStatus.AwaitingCreatorFlip:
      return nowSeconds > game.createdAt + VRF_TIMEOUT_SECONDS;
    case DiceStatus.AwaitingChallengerFlip:
      return nowSeconds > game.acceptedAt + VRF_TIMEOUT_SECONDS;
    default:
      return false;
  }
}

export function isPendingVrf(game: DiceGame): boolean {
  return (
    game.status === DiceStatus.AwaitingCreatorFlip ||
    game.status === DiceStatus.AwaitingChallengerFlip
  );
}

export function formatTimeLeft(seconds: number): string {
  if (seconds <= 0) return "Expired";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m.toString().padStart(2, "0")}m`;
  if (m > 0) return `${m}m`;
  return `${seconds}s`;
}

export function formatAgo(unixSeconds: number, nowSeconds: number): string {
  const diff = Math.max(0, nowSeconds - unixSeconds);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

/** What a game means from the connected wallet's point of view. */
export function describeStatus(game: DiceGame, viewer: string | undefined, nowSeconds: number) {
  switch (game.status) {
    case DiceStatus.AwaitingCreatorFlip:
      return { label: "Flipping…", tone: "pending" as const };
    case DiceStatus.Open:
      return isOpenExpired(game, nowSeconds)
        ? { label: "Expired", tone: "muted" as const }
        : { label: "Open", tone: "open" as const };
    case DiceStatus.AwaitingChallengerFlip:
      return { label: "Settling…", tone: "pending" as const };
    case DiceStatus.Finished:
      if (viewer && (isSameAddress(viewer, game.creator) || isSameAddress(viewer, game.challenger))) {
        return isSameAddress(viewer, game.winner)
          ? { label: "Won", tone: "win" as const }
          : { label: "Lost", tone: "loss" as const };
      }
      return { label: "Settled", tone: "muted" as const };
    case DiceStatus.Refunded:
      return { label: "Refunded", tone: "muted" as const };
    default:
      return { label: "—", tone: "muted" as const };
  }
}
