"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

export function AuthEmailConfirmation() {
  const tokenRef = useRef("");
  const [type, setType] = useState<"email" | "recovery" | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.slice(1));
    const incomingType = params.get("type");
    const token = params.get("token_hash") || "";
    if (token && (incomingType === "email" || incomingType === "recovery")) {
      tokenRef.current = token;
      setType(incomingType);
    } else if (!tokenRef.current) {
      setError("Ce lien est incomplet. Ouvrez le lien du dernier e-mail Visd AR reçu.");
    }
    // Keep the one-time secret out of URLs, referrers and subsequent navigation.
    window.history.replaceState({}, "", "/auth/confirmer");
  }, []);

  const confirm = async () => {
    if (busy || !type || !tokenRef.current) return;
    const supabase = getSupabaseBrowserClient();
    if (!supabase) { setError("Le service est momentanément indisponible."); return; }
    setBusy(true); setError("");
    try {
      // Deliberately wait for a user click so email link scanners do not consume
      // the token merely by loading the confirmation page.
      const { error: verifyError } = await supabase.auth.verifyOtp({ token_hash: tokenRef.current, type });
      if (verifyError) { setError("Ce lien a expiré ou a déjà été utilisé. Demandez un nouvel e-mail depuis la connexion."); return; }
      tokenRef.current = "";
      window.location.replace(type === "recovery" ? "/reinitialiser-mot-de-passe" : "/account");
    } catch { setError("La connexion a été interrompue. Réessayez dans un instant."); }
    finally { setBusy(false); }
  };

  return <main className="page-shell auth-confirm-page"><section className="panel glass auth-confirm-card">
    <BrandLogo /><span className="badge">Visd AR · www.visdar.fr</span>
    <h1>{type === "recovery" ? "Choisir un nouveau mot de passe" : "Confirmer votre accès"}</h1>
    <p className="muted">Vous êtes sur le site officiel Visd AR. Cliquez ci-dessous pour continuer votre demande en toute sécurité.</p>
    {error ? <p className="auth-message error" role="alert">{error}</p> : null}
    <button className="cta-button" type="button" disabled={busy || !type} onClick={() => void confirm()}>{busy ? "Vérification…" : type === "recovery" ? "Continuer la réinitialisation" : "Confirmer et me connecter"}</button>
    <p className="tiny muted">Si vous n’êtes pas à l’origine de cette demande, fermez cette page sans confirmer.</p>
    <Link className="pill-button" href="/">Retour au site Visd AR</Link>
  </section></main>;
}
