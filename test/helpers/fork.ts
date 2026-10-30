// Local Base-mainnet fork for exercising the real deployed BraboDice contract.
//
// Chainlink VRF never answers on a fork, so tests play the coordinator themselves: impersonate
// `s_vrfCoordinator()` and call `rawFulfillRandomWords` with a chosen word. The contract reduces the
// word with `% 2`, so an even word lands heads (0) and an odd word lands tails (1).
import { spawn, type ChildProcess } from "node:child_process";
import {
  createTestClient,
  http,
  parseAbi,
  parseEventLogs,
  publicActions,
  walletActions,
  type Address,
  type Hash,
} from "viem";
import { base } from "viem/chains";
import { BRABO_DICE_ABI, CONTRACT_ADDRESSES, ERC20_ABI } from "../../src/config/contracts";

export const DICE = CONTRACT_ADDRESSES.BRABO_DICE;
export const BRB = CONTRACT_ADDRESSES.PICA_TOKEN;
/** FundMe holds millions of $BRB, which makes it a convenient whale to impersonate. */
export const BRB_WHALE = CONTRACT_ADDRESSES.FUNDME;

/** Anvil's default dev accounts — unlocked, so eth_sendTransaction works without signing. */
export const PLAYERS = {
  alice: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
  bob: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
} as const;

const FORK_URL = process.env.BASE_FORK_URL ?? "https://mainnet.base.org";

export const VRF_ABI = parseAbi([
  "function s_vrfCoordinator() view returns (address)",
  "function rawFulfillRandomWords(uint256 requestId, uint256[] randomWords)",
  "function i_brb() view returns (address)",
]);

export async function startAnvil(port: number): Promise<{ url: string; stop: () => void }> {
  const url = `http://127.0.0.1:${port}`;
  const proc: ChildProcess = spawn(
    "anvil",
    ["--fork-url", FORK_URL, "--port", String(port), "--silent", "--no-rate-limit"],
    { stdio: "ignore" },
  );
  const stop = () => proc.kill("SIGTERM");

  for (let i = 0; i < 120; i++) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_chainId", params: [] }),
      });
      if (res.ok) return { url, stop };
    } catch {
      // not listening yet
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  stop();
  throw new Error(`anvil did not start on ${url}`);
}

export function forkClient(url: string) {
  return createTestClient({ chain: base, mode: "anvil", transport: http(url) })
    .extend(publicActions)
    .extend(walletActions);
}

export type ForkClient = ReturnType<typeof forkClient>;

async function sendAs(client: ForkClient, from: Address, tx: Parameters<ForkClient["writeContract"]>[0]) {
  await client.impersonateAccount({ address: from });
  const hash = await client.writeContract({ ...tx, account: from } as never);
  const receipt = await client.waitForTransactionReceipt({ hash });
  await client.stopImpersonatingAccount({ address: from });
  if (receipt.status !== "success") throw new Error(`tx ${hash} reverted`);
  return receipt;
}

/** Give `player` ETH for gas and `amount` $BRB from the whale. */
export async function fundPlayer(client: ForkClient, player: Address, amount: bigint) {
  await client.setBalance({ address: player, value: 10n ** 20n });
  await client.setBalance({ address: BRB_WHALE, value: 10n ** 20n });
  await sendAs(client, BRB_WHALE, {
    address: BRB,
    abi: parseAbi(["function transfer(address,uint256) returns (bool)"]),
    functionName: "transfer",
    args: [player, amount],
  } as never);
}

export async function brbBalance(client: ForkClient, owner: Address) {
  return client.readContract({ address: BRB, abi: ERC20_ABI, functionName: "balanceOf", args: [owner] });
}

export async function approve(client: ForkClient, player: Address, amount: bigint) {
  return sendAs(client, player, {
    address: BRB,
    abi: ERC20_ABI,
    functionName: "approve",
    args: [DICE, amount],
  } as never);
}

export async function diceTx(
  client: ForkClient,
  player: Address,
  functionName: "throwCoin" | "acceptChallenge" | "refund" | "withdraw",
  args: readonly bigint[] = [],
) {
  return sendAs(client, player, { address: DICE, abi: BRABO_DICE_ABI, functionName, args } as never);
}

/** The VRF request id carried by a throwCoin / acceptChallenge receipt. */
export function requestIdFrom(receipt: { logs: Parameters<typeof parseEventLogs>[0]["logs"] }) {
  const [event] = parseEventLogs({
    abi: BRABO_DICE_ABI,
    logs: receipt.logs,
    eventName: ["CoinThrown", "ChallengeAccepted"],
  });
  if (!event) throw new Error("no CoinThrown/ChallengeAccepted event in receipt");
  return { gameId: event.args.gameId, requestId: event.args.requestId };
}

/** Most recent request id for `eventName` — used by the E2E test, which doesn't see receipts.
 *
 * Walks back through the newest blocks' receipts instead of calling eth_getLogs over a range: a
 * range reaching below the fork point is forwarded to the public upstream RPC, which rate-limits. */
export async function latestRequestId(client: ForkClient, eventName: "CoinThrown" | "ChallengeAccepted") {
  const latest = await client.getBlockNumber();
  for (let n = latest; n > latest - 10n; n--) {
    const block = await client.getBlock({ blockNumber: n });
    for (const hash of [...block.transactions].reverse()) {
      const receipt = await client.getTransactionReceipt({ hash });
      const [event] = parseEventLogs({ abi: BRABO_DICE_ABI, logs: receipt.logs, eventName });
      if (event) return (event.args as { requestId: bigint }).requestId;
    }
  }
  throw new Error(`no ${eventName} event in the last 10 blocks`);
}

/** Play the Chainlink coordinator: deliver `word` for `requestId`. Even → heads, odd → tails. */
export async function fulfill(client: ForkClient, requestId: bigint, word: bigint) {
  const coordinator = await client.readContract({ address: DICE, abi: VRF_ABI, functionName: "s_vrfCoordinator" });
  await client.setBalance({ address: coordinator, value: 10n ** 20n });
  return sendAs(client, coordinator, {
    address: DICE,
    abi: VRF_ABI,
    functionName: "rawFulfillRandomWords",
    args: [requestId, [word]],
  } as never);
}

export async function getGame(client: ForkClient, gameId: bigint) {
  return client.readContract({ address: DICE, abi: BRABO_DICE_ABI, functionName: "getGame", args: [gameId] });
}

export async function chainNow(client: ForkClient) {
  return Number((await client.getBlock()).timestamp);
}

export type { Hash };
