"use client";

import { Sidebar } from "@/components/Sidebar";
import { PageHeader } from "@/components/PageHeader";
import { useAuth } from "@/lib/useAuth";
import { Loader2 } from "lucide-react";
import { Toaster } from "react-hot-toast";
import { FocusProvider } from "@/lib/focusMode";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-neutral-400" />
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: "var(--bg-toast)",
            color: "var(--text-toast)",
          },
        }}
      />
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <FocusProvider>
          <PageHeader />
          <main className="flex-1 overflow-auto bg-neutral-50 dark:bg-neutral-950 p-6">
            {children}
          </main>
        </FocusProvider>
      </div>
    </div>
  );
}
