import "@rainbow-me/rainbowkit/styles.css";
import { RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Suspense, lazy } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { WagmiProvider } from "wagmi";
import { PageLayout } from "./components/layout/PageLayout";
import { ToastProvider } from "./components/ui/ToastProvider";
import { wagmiConfig } from "./config/wagmi";
import { FundPage } from "./pages/FundPage";

/* FundPage is the landing route, so it stays in the entry bundle — lazy-loading
 * it would only add a round-trip before first paint. The other four are split
 * out: most visitors land on `/`, fund, and never open them. */
const PortfolioPage = lazy(() =>
  import("./pages/PortfolioPage").then((m) => ({ default: m.PortfolioPage })),
);
const LiquidityPage = lazy(() =>
  import("./pages/LiquidityPage").then((m) => ({ default: m.LiquidityPage })),
);
const EcosystemPage = lazy(() =>
  import("./pages/EcosystemPage").then((m) => ({ default: m.EcosystemPage })),
);
const ContractsPage = lazy(() =>
  import("./pages/ContractsPage").then((m) => ({ default: m.ContractsPage })),
);

const queryClient = new QueryClient();

/* RainbowKit's own modals. The trigger is ours (components/layout/WalletButton),
 * but the connect / account / chain dialogs are RainbowKit's DOM — these are the
 * knobs that reach them, topped up by the `--rk-*` overrides in index.css. */
const rainbowTheme = darkTheme({
  accentColor: "#38C0F8",
  accentColorForeground: "#041220",
  borderRadius: "small",
  overlayBlur: "small",
});

function RouteFallback() {
  return (
    <div className="route-fallback" role="status" aria-live="polite">
      <div className="spinner" />
      <span>Loading…</span>
    </div>
  );
}

function App() {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        {/* `locale` is pinned rather than left to RainbowKit's default, which
            reads navigator.language — that is why the modals were rendering in
            Portuguese on a pt-BR browser while the rest of the app was English. */}
        <RainbowKitProvider
          theme={rainbowTheme}
          locale="en-US"
          modalSize="compact"
          appInfo={{ appName: "Brabo Markets" }}
        >
          <ToastProvider>
            <BrowserRouter>
              <PageLayout>
                <Suspense fallback={<RouteFallback />}>
                  <Routes>
                    <Route path="/" element={<FundPage />} />
                    <Route path="/portfolio" element={<PortfolioPage />} />
                    <Route path="/liquidity" element={<LiquidityPage />} />
                    <Route path="/ecosystem" element={<EcosystemPage />} />
                    <Route path="/contracts" element={<ContractsPage />} />
                  </Routes>
                </Suspense>
              </PageLayout>
            </BrowserRouter>
          </ToastProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export default App;
