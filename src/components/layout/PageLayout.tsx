import type { ReactNode } from "react";
import { Navbar } from "./Navbar";
import { PageNav } from "./PageNav";

export function PageLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Navbar />
      <PageNav />
      <main className="main-container">{children}</main>
    </>
  );
}
