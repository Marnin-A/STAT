import type { ReactNode } from "react";
import { TopAppBar } from "./TopAppBar";
import { BottomNavBar } from "./BottomNavBar";
import { OfflineBanner } from "./OfflineBanner";
import { DemoPanel } from "../../demo/DemoPanel";
import { useDemo } from "../../demo/DemoProvider";
export function AppLayout({ children }: { children: ReactNode }) {
  const demo = useDemo();
  return (
    <div className="app">
      <a className="skip" href="#main">
        Skip to content
      </a>
      <div className="preview-label">
        {import.meta.env.VITE_API_URL
          ? "Development service · Not for real emergencies"
          : "Synthetic demo · No emergency services connected"}
      </div>
      <TopAppBar />
      <OfflineBanner />
      <main id="main" className="app-main">
        <DemoPanel />
        <div key={demo?.scope ?? "application"}>{children}</div>
      </main>
      <BottomNavBar />
    </div>
  );
}
