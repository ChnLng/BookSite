"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { getPlayTestingApp, playTestingApplicationUrl, playTestingOptInUrl, playTestingStoreUrl } from "@/lib/play-testing";

type AccountPlayCode = {
  packageName: string;
  code: string | null;
  status: "assigned" | "expired" | "paused" | "blocked";
  validUntil: string | null;
  assignedAt: string | null;
};

function statusText(code: AccountPlayCode) {
  switch (code.status) {
    case "expired": return "La période de validité est terminée. Le code est conservé comme historique, mais n’est plus affiché comme utilisable.";
    case "paused": return "La campagne est momentanément suspendue. Le code est conservé, mais n’est pas affiché comme utilisable.";
    case "blocked": return "Ce code a été retiré de la distribution. Contactez Visd AR si vous pensez qu’il s’agit d’une erreur.";
    default: return "Votre code personnel est prêt. Il reste lié à votre compte et ne sera pas attribué à une autre personne.";
  }
}

function isAccountPlayCode(value: unknown): value is AccountPlayCode {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<AccountPlayCode>;
  return typeof item.packageName === "string"
    && ["assigned", "expired", "paused", "blocked"].includes(item.status || "")
    && (typeof item.code === "string" || item.code === null || item.code === undefined);
}

export function AccountPlayTestingCodes() {
  const { user, session } = useAuth();
  const [codes, setCodes] = useState<AccountPlayCode[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState<Record<string, boolean>>({});

  const loadCodes = async () => {
    if (!user?.id || !session?.access_token) {
      setCodes([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/account/play-testing-codes", {
        headers: { Authorization: `Bearer ${session.access_token}` },
        cache: "no-store",
      });
      const result = await response.json().catch(() => null) as { ok?: boolean; codes?: unknown[]; message?: string } | null;
      if (!response.ok || !result?.ok) {
        setCodes([]);
        setMessage(result?.message || "Vos codes sont momentanément indisponibles. Réessayez plus tard.");
        return;
      }
      setCodes((result.codes || []).filter(isAccountPlayCode));
      setMessage("");
    } catch {
      setCodes([]);
      setMessage("Connexion interrompue. Réessayez plus tard.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadCodes();
    // The session token changing is the signal that a different account signed in.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, session?.access_token]);

  const copyCode = async (item: AccountPlayCode) => {
    if (!item.code) return;
    try {
      await navigator.clipboard.writeText(item.code);
      setCopied((current) => ({ ...current, [item.packageName]: true }));
    } catch {
      setMessage("Sélectionnez le code dans le champ, puis copiez-le manuellement.");
    }
  };

  if (!user) {
    return <div className="account-card"><p className="muted">Connectez-vous pour retrouver vos codes Google Play personnels.</p></div>;
  }

  return (
    <div className="account-card account-play-code-card">
      <div className="account-card-stat">
        <span>Codes Google Play personnels : <strong>{codes.length}</strong></span>
        <button className="pill-button" type="button" onClick={() => void loadCodes()} disabled={loading}>{loading ? "Actualisation…" : "Actualiser"}</button>
      </div>
      <p className="tiny muted">Chaque code est attribué une seule fois à votre compte pour une application. Revenez ici pour le retrouver sans en demander un nouveau.</p>
      {loading ? <p className="muted">Chargement de vos codes…</p> : null}
      {!loading && codes.length === 0 ? <p className="muted">Aucun code personnel pour le moment. Demandez gratuitement une application en phase de test.</p> : null}
      <div className="account-play-code-list">
        {codes.map((item) => {
          const app = getPlayTestingApp(item.packageName);
          if (!app) return null;
          return (
            <article key={item.packageName} className="account-play-code-row">
              <div>
                <strong>{app.title}</strong>
                <p className="tiny muted">{statusText(item)}</p>
              </div>
              {item.code ? <>
                <input className="input" value={item.code} readOnly spellCheck={false} autoComplete="off" onFocus={(event) => event.target.select()} aria-label={`Code Google Play pour ${app.title}`} />
                <div className="account-play-code-actions">
                  <button className="cta-button compact-submit" type="button" onClick={() => void copyCode(item)}>{copied[item.packageName] ? "Code copié" : "Copier le code"}</button>
                  <a className="pill-button" href={playTestingStoreUrl(app)} target="_blank" rel="noopener noreferrer">Google Play</a>
                  <a className="pill-button" href={playTestingOptInUrl(app)} target="_blank" rel="noopener noreferrer">Test</a>
                </div>
                {item.validUntil ? <p className="tiny muted">Valable jusqu’au {new Date(item.validUntil).toLocaleString("fr-FR")}.</p> : null}
              </> : <Link className="pill-button" href={playTestingApplicationUrl(app)}>Voir ma demande de test</Link>}
            </article>
          );
        })}
      </div>
      {message ? <p className="tiny" role="status" aria-live="polite">{message}</p> : null}
    </div>
  );
}
