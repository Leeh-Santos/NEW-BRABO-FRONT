import { parseUnits } from "viem";
import { PLAYERS, forkClient, fundPlayer, startAnvil } from "../test/helpers/fork";

export const E2E_RPC_PORT = 8548;

/** Fork Base, give both test wallets $BRB, and return the teardown. */
export default async function globalSetup() {
  const anvil = await startAnvil(E2E_RPC_PORT);
  const client = forkClient(anvil.url);
  await fundPlayer(client, PLAYERS.alice, parseUnits("50000", 18));
  await fundPlayer(client, PLAYERS.bob, parseUnits("50000", 18));
  return () => anvil.stop();
}
