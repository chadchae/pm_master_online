"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { verifyAuth, clearToken } from "./api";

// Hook to check auth on mount, redirects to login if invalid
export function useAuth(): { isLoading: boolean; logout: () => void } {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("pm_token");
    if (!token) {
      router.replace("/");
      return;
    }

    verifyAuth().then((valid) => {
      if (!valid) {
        clearToken();
        router.replace("/");
      } else {
        setIsLoading(false);
      }
    });
  }, [router]);

  const logout = () => {
    clearToken();
    router.replace("/");
  };

  return { isLoading, logout };
}
