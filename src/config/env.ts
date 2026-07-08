const walletConnectProjectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID as
  | string
  | undefined;

const baseRpcUrl =
  (import.meta.env.VITE_BASE_RPC_URL as string | undefined) || "https://mainnet.base.org";

if (!walletConnectProjectId) {
  // Injected wallets (MetaMask, Coinbase extension, etc.) still work without this — only
  // WalletConnect/QR connections are affected. Get a free projectId at https://cloud.reown.com
  // and set VITE_WALLETCONNECT_PROJECT_ID in .env.local.
  console.warn(
    "[env] VITE_WALLETCONNECT_PROJECT_ID is not set — WalletConnect/QR wallet connections will not work until it is configured.",
  );
}

export const env = {
  walletConnectProjectId: walletConnectProjectId ?? "MISSING_WALLETCONNECT_PROJECT_ID",
  baseRpcUrl,
};
