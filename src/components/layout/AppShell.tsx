import type { ReactNode } from "react";
import { TopBar } from "./TopBar";
import { BottomNav } from "./BottomNav";
import { Sidebar } from "./Sidebar";
import { Footer } from "./Footer";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import { SupportChat } from "@/components/support/SupportChat";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <TopBar />
      <div className="mx-auto flex w-full max-w-7xl flex-1">
        <Sidebar />
        <main className="min-w-0 flex-1 pb-24 md:pb-12">{children}</main>
      </div>
      <Footer />
      <BottomNav />
      <InstallPrompt />
      <SupportChat />
    </div>
  );
}
