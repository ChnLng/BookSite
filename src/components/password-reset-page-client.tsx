"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PasswordSettingsCard } from "@/components/password-settings-card";
import { TopNav } from "@/components/top-nav";
import { useAuth } from "@/components/auth-provider";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

export function PasswordResetPageClient() {
  const { loading, user } = useAuth();
  const [exchangeError, setExchangeError] = useState("");

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("code");
    if (!code) return;

    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    void supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
      if (error) setExchangeError("Ce lien de réinitialisation est expiré ou invalide. Demandez-en un nouveau.");
      window.history.replaceState({}, "", "/reinitialiser-mot-de-passe");
    });
  }, []);

  return (
    <main className="page-shell luxury-shell w-full max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
      <TopNav title="Visd AR" subtitle="Hub bilingue chinois-français" />
      <section className="panel glass section-block" style={{ marginTop: 24 }}>
        <p className="eyebrow">Sécurité du compte</p>
        <h1 className="section-title">Choisissez votre nouveau mot de passe</h1>
        {loading ? <p className="muted">Vérification sécurisée du lien…</p> : null}
        {exchangeError ? <p className="tiny password-settings-message error">{exchangeError}</p> : null}
        {!loading && user ? <PasswordSettingsCard userEmail={user.email} onSuccess={() => { window.location.href = "/"; }} /> : null}
        {!loading && !user && !exchangeError ? <p className="muted">Ouvrez le lien le plus récent reçu par e-mail. Il permet de choisir un nouveau mot de passe une seule fois.</p> : null}
        <Link className="pill-button" href="/">Retour à l&apos;accueil</Link>
      </section>
    </main>
  );
}
