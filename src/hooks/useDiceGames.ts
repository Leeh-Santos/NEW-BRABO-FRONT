import { useMemo } from "react";
import { useAccount, useReadContract, useReadContracts } from "wagmi";
import { BRABO_DICE_ABI, CONTRACT_ADDRESSES } from "../config/contracts";
import type { DiceGame, DiceStatus } from "../lib/dice";

const diceContract = {
  address: CONTRACT_ADDRESSES.BRABO_DICE,
  abi: BRABO_DICE_ABI,
} as const;

/** How many of the most recent game ids are loaded for history / "your games". The lobby is
 * loaded separately from `getOpenGames`, so an old open game is never missed by this window. */
const RECENT_WINDOW = 40;

/** VRF answers arrive asynchronously a few blocks after a flip is requested, and nothing in the
 * UI can be notified of that directly — so the dice reads poll. */
const POLL_MS = 6_000;

/** Lobby, recent games and the viewer's deferred payout, in two multicall round-trips. */
export function useDiceGames() {
  const { address } = useAccount();

  const { data: index, refetch: refetchIndex, isLoading: isIndexLoading } = useReadContracts({
    contracts: [
      { ...diceContract, functionName: "s_nextGameId" },
      { ...diceContract, functionName: "getOpenGames" },
    ],
    query: { refetchInterval: POLL_MS },
  });

  const nextGameId = index?.[0]?.result as bigint | undefined;
  const openIds = useMemo(() => (index?.[1]?.result as readonly bigint[] | undefined) ?? [], [index]);

  const ids = useMemo(() => {
    const set = new Set<bigint>(openIds);
    if (nextGameId !== undefined) {
      for (let id = nextGameId - 1n; id >= 1n && id >= nextGameId - BigInt(RECENT_WINDOW); id--) {
        set.add(id);
      }
    }
    return [...set].sort((a, b) => (a > b ? -1 : 1));
  }, [openIds, nextGameId]);

  const {
    data: gameResults,
    refetch: refetchGames,
    isLoading: isGamesLoading,
  } = useReadContracts({
    contracts: ids.map((id) => ({ ...diceContract, functionName: "getGame", args: [id] }) as const),
    query: { enabled: ids.length > 0, refetchInterval: POLL_MS },
  });

  const { data: pendingWithdrawal, refetch: refetchPending } = useReadContract({
    ...diceContract,
    functionName: "s_pendingWithdrawals",
    args: address ? [address] : undefined,
    query: { enabled: !!address, refetchInterval: POLL_MS * 2 },
  });

  const games = useMemo(() => {
    const byId = new Map<bigint, DiceGame>();
    gameResults?.forEach((res, i) => {
      if (res.status !== "success" || !res.result) return;
      const g = res.result;
      byId.set(ids[i], {
        id: ids[i],
        creator: g.creator,
        challenger: g.challenger,
        winner: g.winner,
        amount: g.amount,
        createdAt: Number(g.createdAt),
        acceptedAt: Number(g.acceptedAt),
        creatorSide: g.creatorSide,
        challengerSide: g.challengerSide,
        status: g.status as DiceStatus,
      });
    });
    return byId;
  }, [gameResults, ids]);

  const refetch = () => {
    refetchIndex();
    refetchGames();
    refetchPending();
  };

  return {
    games,
    openIds,
    recentIds: ids,
    nextGameId,
    pendingWithdrawal,
    isLoading: isIndexLoading || (ids.length > 0 && isGamesLoading),
    refetch,
  };
}

/** Single-game read, polled faster — used by the flip stage while a VRF answer is outstanding. */
export function useDiceGame(gameId: bigint | undefined, poll: boolean) {
  return useReadContract({
    ...diceContract,
    functionName: "getGame",
    args: gameId !== undefined ? [gameId] : undefined,
    query: { enabled: gameId !== undefined, refetchInterval: poll ? 3_000 : false },
  });
}
