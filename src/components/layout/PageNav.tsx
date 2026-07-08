import { NavLink } from "react-router-dom";

const TABS = [
  { to: "/", label: "Fund" },
  { to: "/portfolio", label: "Portfolio" },
  { to: "/liquidity", label: "Liquidity" },
  { to: "/ecosystem", label: "Ecosystem" },
  { to: "/contracts", label: "Contracts" },
];

export function PageNav() {
  return (
    <div className="page-nav">
      {TABS.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.to === "/"}
          className={({ isActive }) => `page-nav-tab${isActive ? " active" : ""}`}
        >
          {tab.label}
        </NavLink>
      ))}
    </div>
  );
}
