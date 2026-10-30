// Integration tests: the frontend's BraboDice ABI, status model and error mapping, exercised
// against the real deployed contract on a local Base-mainnet fork (see test/helpers/fork.ts).
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { parseEventLogs, parseUnits, toEventSelector, toFunctionSelector, zeroAddress } from "viem";
import { BRABO_DICE_ABI, CONTRACT_ADDRESSES } from "../../src/config/contracts";
import {
  DiceStatus,
  GAME_DURATION_SECONDS,
  describeStatus,
  isRefundable,
  type DiceGame,
} from "../../src/lib/dice";
import { getFriendlyErrorMessage } from "../../src/lib/errors";
import {
  DICE,
  PLAYERS,
  VRF_ABI,
  approve,
  brbBalance,
  chainNow,
  diceTx,
  forkClient,
  fulfill,
  fundPlayer,
  getGame,
  requestIdFrom,
  startAnvil,
  type ForkClient,
} from "../helpers/fork";

const { alice, bob } = PLAYERS;
const STAKE = parseUnits("1000", 18);
const HEADS = 2n; // even word → side 0
const TAILS = 3n; // odd word → side 1

let client: ForkClient;
let stopAnvil: () => void;

beforeAll(async () => {
  const anvil = await startAnvil(8547);
  stopAnvil = anvil.stop;
  client = forkClient(anvil.url);
  await fundPlayer(client, alice, STAKE * 20n);
  await fundPlayer(client, bob, STAKE * 20n);
}, 60_000);

afterAll(() => stopAnvil?.());

const toGame = (id: bigint, g: Awaited<ReturnType<typeof getGame>>): DiceGame => ({
  id,
  creator: g.creator,
  challenger: g.challenger,
  winner: g.winner,
  amount: g.amount,
  createdAt: Number(g.createdAt),
  acceptedAt: Number(g.acceptedAt),
  creatorSide: g.creatorSide,
  challengerSide: g.challengerSide,
  status: g.status as DiceGame["status"],
});

/** Throw a coin as `creator` and let VRF land it on `word`. Returns the open game id. */
async function openGame(creator = alice, word = HEADS) {
  await approve(client, creator, STAKE);
  const { gameId, requestId } = requestIdFrom(await diceTx(client, creator, "throwCoin", [STAKE]));
  await fulfill(client, requestId, word);
  return gameId;
}

/** Simulate a call and return the message the UI would toast for its revert. */
async function revertMessage(
  account: `0x${string}`,
  functionName: "throwCoin" | "acceptChallenge" | "refund" | "withdraw",
  args: readonly bigint[] = [],
) {
  try {
    await client.simulateContract({ address: DICE, abi: BRABO_DICE_ABI, functionName, args, account } as never);
  } catch (error) {
    return getFriendlyErrorMessage(error);
  }
  throw new Error(`${functionName} did not revert`);
}

describe("deployed contract matches the frontend config", () => {
  it("escrows the same $BRB token the rest of the site uses", async () => {
    const brb = await client.readContract({ address: DICE, abi: VRF_ABI, functionName: "i_brb" });
    expect(brb).toBe(CONTRACT_ADDRESSES.PICA_TOKEN);
  });

  it("has every function and event in BRABO_DICE_ABI in its bytecode", async () => {
    const code = (await client.getCode({ address: DICE }))!.toLowerCase();
    for (const item of BRABO_DICE_ABI) {
      if (item.type === "function") {
        expect(code, item.name).toContain(toFunctionSelector(item).slice(2));
      } else if (item.type === "event") {
        expect(code, item.name).toContain(toEventSelector(item).slice(2));
      }
    }
  });

  it("reports a 24h game duration, matching lib/dice", async () => {
    const duration = await client.readContract({ address: DICE, abi: BRABO_DICE_ABI, functionName: "GAME_DURATION" });
    expect(Number(duration)).toBe(GAME_DURATION_SECONDS);
  });
});

describe("contract reverts map to friendly UI messages", () => {
  it("zero stake", async () => {
    expect(await revertMessage(alice, "throwCoin", [0n])).toBe("Enter a stake greater than zero");
  });

  it("accepting a game that does not exist", async () => {
    expect(await revertMessage(bob, "acceptChallenge", [999_999n])).toMatch(/no longer open/);
  });

  it("refunding a game that is not refundable", async () => {
    expect(await revertMessage(alice, "refund", [999_999n])).toBe("This game can't be refunded yet");
  });

  it("withdrawing with nothing pending", async () => {
    expect(await revertMessage(alice, "withdraw")).toBe("Nothing to withdraw");
  });

  it("challenging your own game", async () => {
    const gameId = await openGame(alice);
    await approve(client, alice, STAKE);
    expect(await revertMessage(alice, "acceptChallenge", [gameId])).toBe("You can't accept your own game");
  });
});

describe("full game lifecycle", () => {
  it("creator flip → lobby → challenger flip → creator wins on the same side", async () => {
    const aliceStart = await brbBalance(client, alice);
    const bobStart = await brbBalance(client, bob);

    await approve(client, alice, STAKE);
    const { gameId, requestId } = requestIdFrom(await diceTx(client, alice, "throwCoin", [STAKE]));

    let game = toGame(gameId, await getGame(client, gameId));
    expect(game.status).toBe(DiceStatus.AwaitingCreatorFlip);
    expect(describeStatus(game, alice, await chainNow(client)).label).toBe("Flipping…");

    await fulfill(client, requestId, HEADS);
    game = toGame(gameId, await getGame(client, gameId));
    expect(game.status).toBe(DiceStatus.Open);
    expect(game.creatorSide).toBe(0);
    const lobby = await client.readContract({ address: DICE, abi: BRABO_DICE_ABI, functionName: "getOpenGames" });
    expect(lobby).toContain(gameId);

    await approve(client, bob, STAKE);
    const accept = requestIdFrom(await diceTx(client, bob, "acceptChallenge", [gameId]));
    game = toGame(gameId, await getGame(client, gameId));
    expect(game.status).toBe(DiceStatus.AwaitingChallengerFlip);
    expect(game.challenger).toBe(bob);
    expect(
      await client.readContract({ address: DICE, abi: BRABO_DICE_ABI, functionName: "getOpenGames" }),
    ).not.toContain(gameId);

    const receipt = await fulfill(client, accept.requestId, HEADS);
    const [finished] = parseEventLogs({ abi: BRABO_DICE_ABI, logs: receipt.logs, eventName: "GameFinished" });
    expect(finished.args).toMatchObject({ gameId, winner: alice, payout: STAKE * 2n });

    game = toGame(gameId, await getGame(client, gameId));
    const now = await chainNow(client);
    expect(game.status).toBe(DiceStatus.Finished);
    expect(game.winner).toBe(alice);
    expect(describeStatus(game, alice, now).label).toBe("Won");
    expect(describeStatus(game, bob, now).label).toBe("Lost");

    expect(await brbBalance(client, alice)).toBe(aliceStart + STAKE);
    expect(await brbBalance(client, bob)).toBe(bobStart - STAKE);
  });

  it("challenger wins when the sides differ", async () => {
    const gameId = await openGame(alice, HEADS);
    const bobStart = await brbBalance(client, bob);

    await approve(client, bob, STAKE);
    const { requestId } = requestIdFrom(await diceTx(client, bob, "acceptChallenge", [gameId]));
    await fulfill(client, requestId, TAILS);

    const game = toGame(gameId, await getGame(client, gameId));
    expect(game.challengerSide).toBe(1);
    expect(game.winner).toBe(bob);
    expect(await brbBalance(client, bob)).toBe(bobStart + STAKE);
  });
});

describe("refunds", () => {
  it("an unmatched game becomes refundable after 24h, and the UI agrees with the contract", async () => {
    const gameId = await openGame(alice);
    const before = await brbBalance(client, alice);

    let game = toGame(gameId, await getGame(client, gameId));
    expect(isRefundable(game, await chainNow(client))).toBe(false);
    expect(await revertMessage(bob, "refund", [gameId])).toBe("This game can't be refunded yet");

    await client.increaseTime({ seconds: GAME_DURATION_SECONDS + 1 });
    await client.mine({ blocks: 1 });
    expect(isRefundable(game, await chainNow(client))).toBe(true);
    expect(describeStatus(game, alice, await chainNow(client)).label).toBe("Expired");
    expect(await revertMessage(bob, "acceptChallenge", [gameId])).toBe("That game has expired");

    // Anyone may trigger it; the stake still goes back to the creator.
    await diceTx(client, bob, "refund", [gameId]);
    game = toGame(gameId, await getGame(client, gameId));
    expect(game.status).toBe(DiceStatus.Refunded);
    expect(await brbBalance(client, alice)).toBe(before + STAKE);
  });

  it("a flip VRF never answers is refundable after the timeout", async () => {
    const before = await brbBalance(client, alice);
    await approve(client, alice, STAKE);
    const { gameId } = requestIdFrom(await diceTx(client, alice, "throwCoin", [STAKE]));

    await client.increaseTime({ seconds: GAME_DURATION_SECONDS + 1 });
    await client.mine({ blocks: 1 });
    const game = toGame(gameId, await getGame(client, gameId));
    expect(isRefundable(game, await chainNow(client))).toBe(true);

    await diceTx(client, alice, "refund", [gameId]);
    expect(await brbBalance(client, alice)).toBe(before);
    expect((await getGame(client, gameId)).challenger).toBe(zeroAddress);
  });
});
