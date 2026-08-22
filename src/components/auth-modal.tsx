"use client";

import { FormEvent, useState } from "react";
import { LoaderCircle, Mail, ShieldCheck, X } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

type AuthModalProps = {
  open: boolean;
  onClose: () => void;
};

export function AuthModal({ open, onClose }: AuthModalProps) {
  const { signInWithPassword, signUpWithPassword } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<"google" | "github" | null>(null);

  if (!open) return null;

  const currentPageUrl = () => `${window.location.origin}${window.location.pathname}${window.location.search}`;

  const handleOAuth = async (provider: "google" | "github") => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setMessage("Configuration Supabase indisponible.");
      return;
    }
    setMessage("");
    setOauthLoading(provider);
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: currentPageUrl() },
    });
    if (error) {
      setMessage(error.message);
      setOauthLoading(null);
    }
  };

  const handlePasswordAuth = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (mode === "signup" && password !== confirmPassword) {
      setMessage("Les mots de passe ne correspondent pas.");
      return;
    }
    if (password.length < 6) {
      setMessage("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }
    setSubmitting(true);
    setMessage("");
    const result = mode === "signup"
      ? await signUpWithPassword(email.trim(), password)
      : await signInWithPassword(email.trim(), password);
    setSubmitting(false);
    if (result.error) {
      setMessage(result.error.message);
      return;
    }
    setPassword("");
    setConfirmPassword("");
    onClose();
  };

  const handlePasswordReset = async () => {
    const normalizedEmail = email.trim();
    if (!normalizedEmail) {
      setMessage("Indiquez votre e-mail, puis cliquez sur « Mot de passe oublié ? ».");
      return;
    }

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setMessage("Configuration Supabase indisponible.");
      return;
    }

    setSubmitting(true);
    setMessage("");
    const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
      redirectTo: `${window.location.origin}/reinitialiser-mot-de-passe`,
    });
    setSubmitting(false);
    setMessage(error
      ? error.message
      : "E-mail envoyé. Ouvrez le lien reçu pour choisir un nouveau mot de passe.");
  };

  return (
    <div className="overlay-backdrop" role="presentation" onClick={onClose}>
      <div className="overlay-card glass" role="dialog" aria-modal="true" aria-label="Connexion et inscription" onClick={(event) => event.stopPropagation()}>
        <button className="overlay-close" type="button" aria-label="Fermer" onClick={onClose}><X size={18} /></button>
        <div className="actions-row auth-actions" style={{ marginTop: 0 }}>
          <button className={mode === "signin" ? "cta-button" : "pill-button"} type="button" onClick={() => { setMode("signin"); setMessage(""); }}>Connexion</button>
          <button className={mode === "signup" ? "cta-button" : "pill-button"} type="button" onClick={() => { setMode("signup"); setMessage(""); }}>Inscription</button>
        </div>
        <h2 className="section-title" style={{ fontFamily: "var(--font-heading), serif" }}>Entrer dans l&apos;univers Visd AR</h2>
        <div className="auth-provider-grid">
          <button className="cta-button auth-provider" type="button" disabled={Boolean(oauthLoading)} onClick={() => void handleOAuth("google")}>
            {oauthLoading === "google" ? <LoaderCircle size={16} className="spin" /> : null} Continuer avec Google
          </button>
          <button className="cta-button secondary auth-provider" type="button" disabled={Boolean(oauthLoading)} onClick={() => void handleOAuth("github")}>
            {oauthLoading === "github" ? <LoaderCircle size={16} className="spin" /> : null} Continuer avec GitHub
          </button>
        </div>
        <form className="input-group auth-email-form" onSubmit={handlePasswordAuth}>
          <label className="tiny" htmlFor="global-email-auth">{mode === "signup" ? "Créer un compte par e-mail" : "Se connecter par e-mail"}</label>
          <div className="email-inline"><Mail size={18} /><input id="global-email-auth" className="input email-input" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Votre e-mail" required /></div>
          <div className="email-inline"><ShieldCheck size={18} /><input className="input email-input" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Votre mot de passe" required /></div>
          {mode === "signup" ? <div className="email-inline"><ShieldCheck size={18} /><input className="input email-input" type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Confirmer le mot de passe" required /></div> : null}
          <button className="cta-button" type="submit" disabled={submitting}>{submitting ? "Chargement..." : mode === "signup" ? "Créer mon compte" : "Se connecter"}</button>
          {mode === "signin" ? <button className="text-button tiny" type="button" onClick={() => void handlePasswordReset()} disabled={submitting}>Mot de passe oublié ?</button> : null}
        </form>
        {message ? <p className="tiny">{message}</p> : null}
      </div>
    </div>
  );
}
