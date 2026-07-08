import "@rainbow-me/rainbowkit/styles.css";
import { RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { WagmiProvider } from "wagmi";
import { PageLayout } from "./components/layout/PageLayout";
import { ToastProvider } from "./components/ui/ToastProvider";
import { wagmiConfig } from "./config/wagmi";
import { ContractsPage } from "./pages/ContractsPage";
import { EcosystemPage } from "./pages/EcosystemPage";
import { FundPage } from "./pages/FundPage";
import { LiquidityPage } from "./pages/LiquidityPage";
import { PortfolioPage } from "./pages/PortfolioPage";

const queryClient = new QueryClient();

function App() {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          <ToastProvider>
            <BrowserRouter>
              <PageLayout>
                <Routes>
                  <Route path="/" element={<FundPage />} />
                  <Route path="/portfolio" element={<PortfolioPage />} />
                  <Route path="/liquidity" element={<LiquidityPage />} />
                  <Route path="/ecosystem" element={<EcosystemPage />} />
                  <Route path="/contracts" element={<ContractsPage />} />
                </Routes>
              </PageLayout>
            </BrowserRouter>
          </ToastProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export default App;
