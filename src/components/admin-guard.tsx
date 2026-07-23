"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user, loading, isAdmin } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/account");
      return;
    }

    if (!loading && !isAdmin) {
      router.replace("/account");
    }
  }, [loading, user, isAdmin, router]);

  if (loading) {
    return <div className="page-shell"><div className="panel glass">Chargement…</div></div>;
  }

  if (!user || !isAdmin) {
    return <div className="page-shell"><div className="panel glass">Redirection…</div></div>;
  }

  return <>{children}</>;
}
