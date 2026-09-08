import { Link } from "react-router-dom";
import { WalletButton } from "./WalletButton";
import bullMark from "../../assets/brand/brabo-bull-64.png";

export function Navbar() {
  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand" aria-label="Brabo Markets — home">
        {/* Explicit width/height + eager/high priority: this is the first brand
            element on screen and must not reflow the header when it lands. */}
        <img
          src={bullMark}
          className="navbar-logo"
          width={38}
          height={38}
          alt=""
          loading="eager"
          fetchPriority="high"
          decoding="async"
        />
        <span className="navbar-wordmark">
          <span className="navbar-title">Brabo Markets</span>
          <span className="navbar-tagline">$BRB · Base</span>
        </span>
      </Link>
      <WalletButton />
    </nav>
  );
}
