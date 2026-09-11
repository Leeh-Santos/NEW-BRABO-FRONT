import { ConnectButton } from "@rainbow-me/rainbowkit";

/** The wallet control, rebuilt on the design system.
 *
 * RainbowKit's stock <ConnectButton> ships its own visual language — its own
 * radii, fill, type and spacing — and it is styled with vanilla-extract, so its
 * class names are content-hashed (`iekbcc0 ju367v78 …`) and change between
 * builds; there is nothing stable to override from our CSS.
 * `ConnectButton.Custom` is the supported escape hatch: RainbowKit keeps the
 * connection state and the modals, we own every pixel of the trigger.
 *
 * The modals themselves are still RainbowKit's DOM; those are themed through
 * `darkTheme(...)` and the `--rk-*` variables in index.css. */
export function WalletButton() {
  return (
    <ConnectButton.Custom>
      {({ account, chain, mounted, openAccountModal, openChainModal, openConnectModal }) => {
        // Until mounted, wallet state is unknowable (it lives in the browser),
        // so render an inert placeholder of the same size rather than flashing
        // "Connect Wallet" at someone who is already connected.
        const ready = mounted;
        const connected = ready && account && chain;

        return (
          <div
            className="wallet"
            aria-hidden={!ready || undefined}
            style={ready ? undefined : { opacity: 0, pointerEvents: "none", userSelect: "none" }}
          >
            {(() => {
              if (!connected) {
                return (
                  <button type="button" className="wallet-connect" onClick={openConnectModal}>
                    Connect Wallet
                  </button>
                );
              }

              if (chain.unsupported) {
                return (
                  <button
                    type="button"
                    className="wallet-connect is-wrong"
                    onClick={openChainModal}
                  >
                    Wrong network
                  </button>
                );
              }

              return (
                <>
                  <button
                    type="button"
                    className="wallet-chip wallet-chain"
                    onClick={openChainModal}
                    title={`Connected to ${chain.name ?? "network"} — switch network`}
                  >
                    {chain.hasIcon && chain.iconUrl && (
                      <img
                        src={chain.iconUrl}
                        alt=""
                        width={18}
                        height={18}
                        className="wallet-chain-icon"
                        style={{ background: chain.iconBackground }}
                      />
                    )}
                    <span className="wallet-chain-name">{chain.name}</span>
                  </button>

                  <button
                    type="button"
                    className="wallet-chip wallet-account"
                    onClick={openAccountModal}
                  >
                    <span className="wallet-dot" aria-hidden="true" />
                    <span className="wallet-name">{account.displayName}</span>
                    {account.hasPendingTransactions && (
                      <span className="wallet-pending" title="Transaction pending">
                        <span className="wallet-spinner" aria-hidden="true" />
                      </span>
                    )}
                  </button>
                </>
              );
            })()}
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
}
