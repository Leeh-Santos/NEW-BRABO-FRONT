import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { http } from "viem";
import { base } from "wagmi/chains";
import { env } from "./env";

export const wagmiConfig = getDefaultConfig({
  appName: "Brabo Markets",
  projectId: env.walletConnectProjectId,
  chains: [base],
  transports: {
    [base.id]: http(env.baseRpcUrl),
  },
  ssr: false,
});
