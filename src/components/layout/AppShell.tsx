import type { ReactNode } from "react";
import { TopBar } from "./TopBar";
import { BottomNav } from "./BottomNav";
import { Sidebar } from "./Sidebar";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <TopBar />
      <div className="mx-auto flex w-full max-w-7xl flex-1">
        <Sidebar />
        <main className="flex-1 pb-24 md:pb-12">{children}</main>
      </div>
      <BottomNav />
      <InstallPrompt />
    </div>
  );
}
