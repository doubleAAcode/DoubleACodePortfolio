import type { ReactNode } from "react";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { IntroScreen } from "./IntroScreen";

export function StoreLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <IntroScreen />
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
