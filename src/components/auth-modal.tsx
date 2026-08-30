"use client";

import { type FormEvent, useEffect, useRef, useState } from "react";
import { Eye, EyeOff, LoaderCircle, X } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import { authErrorMessage } from "@/lib/auth-messages";

type AuthModalProps = { open: boolean; onClose: () => void };

export function AuthModal({ open, onClose }: AuthModalProps) {
  const { signInWithPassword, signUpWithPassword } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup" | "reset">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [messageKind, setMessageKind] = useState<"error" | "success">("error");
  const [submitting, setSubmitting] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<"google" | "github" | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const busy = submitting || Boolean(oauthLoading);

  useEffect(() => {
    if (!open) return;
    setMode("signin");
    setMessage("");
    setPassword("");
    setConfirmPassword("");
    setShowPassword(false);
    const previous = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") { closeRef.current(); return; }
      if (event.key !== "Tab") return;
      const nodes = [...(dialogRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), a[href], select:not(:disabled)') || [])];
      const first = nodes[0], last = nodes[nodes.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = previousOverflow; document.removeEventListener("keydown", onKey); previous?.focus(); };
  }, [open]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => setCooldown((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  if (!open) return null;
  const switchMode = (next: typeof mode) => { setMode(next); setMessage(""); setPassword(""); setConfirmPassword(""); };
  const fail = (error: { message?: string; code?: string }) => { setMessageKind("error"); setMessage(authErrorMessage(error)); };

  const handleOAuth = async (provider: "google" | "github") => {
    if (busy) return;
    const supabase = getSupabaseBrowserClient();
    if (!supabase) { fail({}); return; }
    setMessage(""); setOauthLoading(provider);
    try {
      const { error } = await supabase.auth.signInWithOAuth({ provider, options: {
        redirectTo: `${window.location.origin}${window.location.pathname}${window.location.search}`,
        ...(provider === "google" ? { queryParams: { prompt: "select_account" } } : {}),
      } });
      if (error) { fail(error); setOauthLoading(null); }
    } catch { fail({ message: "network" }); setOauthLoading(null); }
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy || (mode === "reset" && cooldown > 0)) return;
    if (mode === "signup" && password !== confirmPassword) { setMessageKind("error"); setMessage("Les deux mots de passe ne correspondent pas."); return; }
    setSubmitting(true); setMessage("");
    try {
      if (mode === "reset") {
        const supabase = getSupabaseBrowserClient();
        if (!supabase) { fail({}); return; }
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/reinitialiser-mot-de-passe` });
        if (error) { fail(error); return; }
        setMessageKind("success");
        setMessage("Si un compte correspond à cette adresse, vous recevrez un e-mail Visd AR pour choisir un nouveau mot de passe. Vérifiez aussi les courriers indésirables et utilisez le message le plus récent.");
        setCooldown(60);
        return;
      }
      if (mode === "signup") {
        const result = await signUpWithPassword(email.trim(), password);
        if (result.error) { fail(result.error); return; }
        if (result.confirmationRequired) {
          setMessageKind("success");
          setMessage("Votre demande d’inscription a été reçue. Consultez votre e-mail pour confirmer votre compte Visd AR, puis revenez vous connecter.");
          setPassword(""); setConfirmPassword("");
          return;
        }
      } else {
        const result = await signInWithPassword(email.trim(), password);
        if (result.error) { fail(result.error); return; }
      }
      setPassword(""); setConfirmPassword(""); onClose();
    } catch { fail({ message: "network" }); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="overlay-backdrop" role="presentation" onClick={onClose}>
      <div ref={dialogRef} tabIndex={-1} className="overlay-card glass auth-dialog" role="dialog" aria-modal="true" aria-labelledby="auth-title" onClick={(event) => event.stopPropagation()}>
        <button className="overlay-close" type="button" aria-label="Fermer" onClick={onClose}><X size={18} /></button>
        <span className="badge">Visd AR · Votre espace</span>
        <h2 id="auth-title">{mode === "reset" ? "Retrouver votre compte" : mode === "signup" ? "Créer votre compte" : "Heureux de vous retrouver"}</h2>
        <p className="tiny muted">{mode === "reset" ? "Nous vous enverrons un lien sécurisé pour choisir un nouveau mot de passe." : "Accédez à vos achats et demandez à tester nos applications."}</p>
        {mode !== "reset" ? <>
          <div className="auth-provider-grid">
            <button className="cta-button auth-provider" type="button" disabled={busy} onClick={() => void handleOAuth("google")}>{oauthLoading === "google" ? <LoaderCircle size={16} className="spin" /> : null} Continuer avec Google</button>
            <button className="pill-button auth-provider" type="button" disabled={busy} onClick={() => void handleOAuth("github")}>{oauthLoading === "github" ? <LoaderCircle size={16} className="spin" /> : null} GitHub</button>
          </div>
          <p className="auth-divider tiny muted">ou avec votre adresse e-mail</p>
        </> : null}
        <form className="input-group auth-email-form" onSubmit={submit}>
          <label className="tiny" htmlFor="global-email-auth">Adresse e-mail</label>
          <input id="global-email-auth" name="email" className="input" type="email" inputMode="email" autoComplete="username" autoCapitalize="none" spellCheck={false} value={email} onChange={(event) => setEmail(event.target.value)} required disabled={busy} />
          {mode !== "reset" ? <>
            <label className="tiny" htmlFor="global-password-auth">Mot de passe</label>
            <div className="auth-password-field"><input id="global-password-auth" name="password" className="input" type={showPassword ? "text" : "password"} autoComplete={mode === "signup" ? "new-password" : "current-password"} minLength={mode === "signup" ? 8 : undefined} value={password} onChange={(event) => setPassword(event.target.value)} required disabled={busy} /><button type="button" className="auth-reveal" aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"} aria-pressed={showPassword} onClick={() => setShowPassword((value) => !value)}>{showPassword ? <EyeOff size={19} /> : <Eye size={19} />}</button></div>
            {mode === "signup" ? <><p className="tiny muted">Au moins 8 caractères. Une phrase longue est plus facile à retenir.</p><label className="tiny" htmlFor="global-password-confirm">Confirmer le mot de passe</label><input id="global-password-confirm" name="password-confirm" className="input" type={showPassword ? "text" : "password"} autoComplete="new-password" minLength={8} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required disabled={busy} /></> : null}
          </> : null}
          {message ? <p className={`auth-message ${messageKind}`} role={messageKind === "error" ? "alert" : "status"}>{message}</p> : null}
          <button className="cta-button" type="submit" disabled={busy || (mode === "reset" && cooldown > 0)}>{submitting ? "Un instant…" : mode === "reset" ? cooldown > 0 ? `Nouvel envoi dans ${cooldown} s` : "Recevoir le lien Visd AR" : mode === "signup" ? "Créer mon compte" : "Me connecter"}</button>
        </form>
        <div className="auth-bottom-links">
          {mode === "signin" ? <><button className="text-button" type="button" disabled={busy} onClick={() => switchMode("reset")}>Mot de passe oublié ?</button><button className="text-button" type="button" disabled={busy} onClick={() => switchMode("signup")}>Créer un compte</button></> : <button className="text-button" type="button" disabled={busy} onClick={() => switchMode("signin")}>Retour à la connexion</button>}
        </div>
      </div>
    </div>
  );
}
