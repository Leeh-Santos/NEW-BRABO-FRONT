# Brabo Markets

DeFi frontend for Brabo Markets ($BRB) on Base — React + TypeScript + Vite, using viem, wagmi, and RainbowKit for wallet/contract interaction.

## Setup

```bash
npm install
cp .env.example .env.local   # fill in VITE_WALLETCONNECT_PROJECT_ID (see below)
npm run dev
```

`VITE_WALLETCONNECT_PROJECT_ID` is required for WalletConnect/QR wallet connections in RainbowKit — get a free one at [cloud.reown.com](https://cloud.reown.com). Injected wallets (MetaMask, Coinbase extension, etc.) work without it.

## Scripts

- `npm run dev` — dev server
- `npm run build` — typecheck + production build (`dist/`)
- `npm run preview` — serve the production build locally
- `npm run lint` — oxlint

## Structure

- `src/pages/` — one component per route (Fund, Portfolio, Liquidity, Ecosystem, Contracts)
- `src/components/` — `layout/` (navbar, page nav), `ui/` (shared), plus one folder per page for page-specific components
- `src/hooks/` — contract reads/writes, price feeds, animations
- `src/config/` — wagmi config, contract addresses/ABIs, env
- `src/lib/` — pure formatting/math helpers
- `contracts/` — reference-only Solidity source for the already-deployed FundMe/NftBrabo contracts
- `legacy-site/` — the original vanilla HTML/CSS/JS site this app replaces, kept as a fallback reference
