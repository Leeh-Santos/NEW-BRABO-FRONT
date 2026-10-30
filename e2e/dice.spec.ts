import { expect, test, type Browser, type Page } from "@playwright/test";
import { parseUnits } from "viem";
import { PLAYERS, brbBalance, forkClient, fulfill, latestRequestId } from "../test/helpers/fork";
import { E2E_RPC_PORT } from "./global-setup";

const RPC = `http://127.0.0.1:${E2E_RPC_PORT}`;
const client = forkClient(RPC);

/** A minimal injected wallet: account requests answer with `account`, everything else (including
 * eth_sendTransaction, which anvil accepts unsigned for its dev accounts) is proxied to the fork.
 *
 * It announces itself over EIP-6963 rather than posing as `window.ethereum.isMetaMask`: RainbowKit
 * routes a detected MetaMask through the MetaMask SDK, which talks to the real extension and never
 * calls the injected provider. An EIP-6963 wallet is listed under "Installed" and used directly. */
function injectWallet({ account, rpc }: { account: string; rpc: string }) {
  const call = async (method: string, params: unknown[] = []) => {
    const res = await fetch(rpc, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: Date.now(), method, params }),
    });
    const json = await res.json();
    if (json.error) throw Object.assign(new Error(json.error.message), json.error);
    return json.result;
  };
  let authorized = false;
  const provider = {
    request: async ({ method, params }: { method: string; params?: unknown[] }) => {
      switch (method) {
        // Like a real wallet, expose the account only after the user has connected — otherwise
        // wagmi auto-connects on load and the test races the Connect button.
        case "eth_requestAccounts":
          authorized = true;
          return [account];
        case "eth_accounts":
          return authorized ? [account] : [];
        case "wallet_requestPermissions":
        case "wallet_getPermissions":
          return [{ parentCapability: "eth_accounts" }];
        case "wallet_switchEthereumChain":
          return null;
        default:
          return call(method, params);
      }
    },
    on: () => provider,
    removeListener: () => provider,
  };
  const info = {
    uuid: "6b1f6d1e-0e2b-4d6c-9f3e-b7a0e2e5d1c0",
    name: "E2E Wallet",
    icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1 1'%3E%3Crect width='1' height='1' fill='%2338c0f8'/%3E%3C/svg%3E",
    rdns: "dev.brabo.e2e",
  };
  const announce = () =>
    window.dispatchEvent(
      new CustomEvent("eip6963:announceProvider", { detail: Object.freeze({ info, provider }) }),
    );
  window.addEventListener("eip6963:requestProvider", announce);
  announce();
}

async function openAs(browser: Browser, account: string): Promise<Page> {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.addInitScript(injectWallet, { account, rpc: RPC });
  await page.goto("/dice");
  await page.locator(".wallet-connect").click();
  await page.getByRole("dialog").getByText("E2E Wallet", { exact: true }).click();
  await expect(page.locator(".wallet-account")).toBeVisible();
  return page;
}

test("create, flip, match and settle a game through the UI", async ({ browser }) => {
  const stake = parseUnits("1000", 18);
  const aliceStart = await brbBalance(client, PLAYERS.alice);
  const bobStart = await brbBalance(client, PLAYERS.bob);

  // ── Alice throws a coin: approve + throwCoin, both sent by the page ──
  const alice = await openAs(browser, PLAYERS.alice);
  await expect(alice.getByText(/Balance 50,000\.00/)).toBeVisible();
  await alice.getByLabel("Stake ($BRB)").fill("1000");
  await expect(alice.locator(".breakdown-total")).toContainText("2,000.00 $BRB");
  await alice.getByRole("button", { name: "Throw Coin" }).click();

  const stage = alice.locator(".flip-stage");
  await expect(stage.getByText("Coin in the air")).toBeVisible();
  await expect(stage.locator(".coin.is-spinning")).toHaveCount(1);

  // ── VRF answers for Alice: odd word → tails ──
  await fulfill(client, await latestRequestId(client, "CoinThrown"), 1n);
  await expect(stage.getByText("Landed Tails")).toBeVisible();
  const aliceLobby = alice.locator(".dice-section", { hasText: "Lobby" });
  await expect(aliceLobby.getByText("Your game", { exact: true })).toBeVisible();

  // ── Bob sees it in the lobby and matches it ──
  const bob = await openAs(browser, PLAYERS.bob);
  const match = bob.getByRole("button", { name: "Match 1,000.00" });
  await expect(match).toBeEnabled();
  await bob.locator(".dice-row", { hasText: "Tails" }).first().waitFor();
  await match.click();
  const bobStage = bob.locator(".flip-stage");
  await expect(bobStage.getByText("Challenger flipping")).toBeVisible();

  // ── VRF answers for Bob: even word → heads, different side → Bob wins ──
  await fulfill(client, await latestRequestId(client, "ChallengeAccepted"), 2n);
  await expect(bobStage.getByText("You won")).toBeVisible();
  await expect(bob.locator(".dice-section", { hasText: "Your Games" }).getByText("Won")).toBeVisible();

  // Alice's page follows along without a reload.
  await expect(stage.getByText("You lost")).toBeVisible();
  await expect(alice.locator(".dice-section", { hasText: "Recent Results" }).locator(".dice-row").nth(1)).toBeVisible();

  expect(await brbBalance(client, PLAYERS.alice)).toBe(aliceStart - stake);
  expect(await brbBalance(client, PLAYERS.bob)).toBe(bobStart + stake);

  await alice.screenshot({ path: "test-results/dice-alice-lost.png", fullPage: true });
  await bob.screenshot({ path: "test-results/dice-bob-won.png", fullPage: true });
});

test("an unaffordable stake is blocked before any transaction", async ({ browser }) => {
  const page = await openAs(browser, PLAYERS.alice);
  await page.getByLabel("Stake ($BRB)").fill("999999999");
  await expect(page.getByRole("button", { name: "Insufficient $BRB" })).toBeDisabled();
});
