import { Component, type ErrorInfo, type ReactNode } from "react";

/** Catches render-time throws so one bad component can't blank the whole site.
 *
 * Without this, React 19 unmounts the entire tree when any component throws
 * during render — the root goes empty and the user sees a bare background with
 * no indication anything went wrong. That failure is invisible and unreportable.
 * Here it becomes a panel with the actual message, which is something a user can
 * screenshot and something we can act on. */

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
  info: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, info: null };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    this.setState({ info });
    // Keep the real stack in the console — the panel shows a readable summary,
    // but the console entry is what has source-mapped frames.
    console.error("[Brabo] render error", error, info.componentStack);
  }

  render() {
    const { error, info } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="crash" role="alert">
        <div className="crash-panel">
          <span className="crash-label">Interface error</span>
          <h1 className="crash-title">Something broke while rendering</h1>
          <p className="crash-copy">
            Your funds are untouched — this is a bug in the page, not in the contracts. Reloading
            usually clears it.
          </p>
          <pre className="crash-detail">
            {error.name}: {error.message}
            {info?.componentStack ? `\n${info.componentStack.trim().split("\n").slice(0, 6).join("\n")}` : ""}
          </pre>
          <div className="crash-actions">
            <button type="button" className="crash-btn" onClick={() => window.location.reload()}>
              Reload page
            </button>
            <button
              type="button"
              className="crash-btn is-ghost"
              onClick={() => {
                // A stale service worker or cached module graph is the usual
                // cause of a page that loads and then dies, so offer the reset
                // rather than making people find it in devtools.
                try {
                  localStorage.clear();
                  sessionStorage.clear();
                } catch {
                  /* storage can be blocked; the reload is still worth doing */
                }
                window.location.reload();
              }}
            >
              Clear cache &amp; reload
            </button>
          </div>
        </div>
      </div>
    );
  }
}
