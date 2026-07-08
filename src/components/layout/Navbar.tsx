import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Link } from "react-router-dom";

export function Navbar() {
  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand">
        <span className="navbar-logo">BRB</span>
        <span className="navbar-title">Brabo Markets</span>
      </Link>
      <ConnectButton showBalance={false} />
    </nav>
  );
}
