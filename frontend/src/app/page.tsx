"use client";

import { useState, FormEvent, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Lock, ArrowRight, Loader2 } from "lucide-react";
import { apiFetch, setToken, verifyAuth } from "@/lib/api";
import toast, { Toaster } from "react-hot-toast";
import { useLocale, LocaleToggle } from "@/lib/i18n";

export default function LoginPage() {
  const router = useRouter();
  const { t } = useLocale();
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  // If already authenticated, redirect to dashboard
  useEffect(() => {
    const token = localStorage.getItem("pm_token");
    if (token) {
      verifyAuth().then((valid) => {
        if (valid) {
          router.replace("/dashboard");
        } else {
          setIsChecking(false);
        }
      });
    } else {
      setIsChecking(false);
    }
  }, [router]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;

    setIsLoading(true);
    try {
      const data = await apiFetch<{ token: string }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ password }),
      });
      setToken(data.token);
      router.push("/dashboard");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("toast.wrongPassword"));
      setPassword("");
    } finally {
      setIsLoading(false);
    }
  };

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-neutral-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-950 p-4">
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: "var(--bg-toast)",
            color: "var(--text-toast)",
          },
        }}
      />

      <div className="w-full max-w-sm">
        {/* Locale toggle */}
        <div className="flex justify-end mb-4">
          <LocaleToggle />
        </div>
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-600 text-white text-2xl font-bold mb-4">
            PM
          </div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
            Project Manager
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            {t("auth.localDashboard")}
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5"
              >
                {t("auth.password")}
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t("auth.enterPassword")}
                  className="w-full pl-10 pr-4 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
                  autoFocus
                  disabled={isLoading}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || !password.trim()}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-lg text-sm font-medium transition-colors"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  {t("auth.enter")}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
