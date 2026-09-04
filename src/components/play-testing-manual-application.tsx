"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
import { AuthModal } from "@/components/auth-modal";
import { TopNav } from "@/components/top-nav";
import { useAuth } from "@/components/auth-provider";
import {
  getPlayTestingApp,
  playTestingApps,
  playTestingGroupUrl,
  playTestingOptInUrl,
} from "@/lib/play-testing";

const guideUrl = "/guideTester";
const adminEmail = "visdar@outlook.fr";

export function PlayTestingManualApplication({ initialPackageName }: { initialPackageName?: string }) {
  const { user, session } = useAuth();
  const initialApp = getPlayTestingApp(initialPackageName) || playTestingApps[0];
  const [selectedPackages, setSelectedPackages] = useState<string[]>([initialApp.packageName]);
  const [playEmail, setPlayEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [manualEmailCopyNeeded, setManualEmailCopyNeeded] = useState(false);

  const selectedApps = useMemo(
    () => playTestingApps.filter((app) => selectedPackages.includes(app.packageName)),
    [selectedPackages],
  );
  const manualEmailHref = useMemo(() => {
    const subject = "Demande gratuite de test Google Play — Visd AR";
    const body = [
      "Bonjour Visd AR,",
      "",
      "Je confirme ma demande gratuite de test Google Play.",
      `Compte Google Play : ${playEmail.trim()}`,
      "Applications demandées :",
      ...selectedApps.map((app) => `- ${app.title}`),
      "",
      "Je ne réaliserai aucun achat pour ce test.",
    ].join("\n");
    return `mailto:${adminEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }, [playEmail, selectedApps]);

  useEffect(() => {
    setPlayEmail(user?.email || "");
    setSubmitted(false);
    setManualEmailCopyNeeded(false);
    setMessage("");
  }, [user?.id, user?.email]);

  const toggleApp = (packageName: string) => {
    if (busy || submitted) return;
    setMessage("");
    setSelectedPackages((current) => {
      const next = current.includes(packageName)
        ? current.filter((item) => item !== packageName)
        : [...current, packageName];
      return playTestingApps.filter((app) => next.includes(app.packageName)).map((app) => app.packageName);
    });
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!user || !session?.access_token) {
      setAuthOpen(true);
      return;
    }
    if (!selectedApps.length || !playEmail.trim() || !consent) return;

    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/play-testing/manual-request", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          packageNames: selectedApps.map((app) => app.packageName),
          playEmail: playEmail.trim(),
          consent: true,
        }),
      });
      const result = await response.json().catch(() => null) as { ok?: boolean; message?: string; emailDelivery?: string | null } | null;
      if (!response.ok || !result?.ok) {
        setMessage(result?.message || "Impossible d’envoyer votre demande pour le moment. Réessayez plus tard ou contactez Visd AR.");
        return;
      }
      setSubmitted(true);
      setManualEmailCopyNeeded(!result.emailDelivery);
      setMessage(result.message || "Votre demande gratuite a bien été envoyée à Visd AR.");
    } catch {
      setMessage("Connexion interrompue. Réessayez dans un instant ou contactez Visd AR.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="page-shell play-testing-page">
      <TopNav className="topbar-luxury" showAdmin showLogout onLoginClick={() => setAuthOpen(true)} />
      <section className="panel glass play-testing-main">
        <span className="badge">En phase de test avant lancement</span>
        <h1>Testez nos applications gratuitement</h1>
        <p className="muted">Choisissez une ou plusieurs applications. La demande est gratuite : les testeurs ne doivent effectuer aucun achat.</p>
        <a className="pill-button" href={guideUrl} target="_blank" rel="noopener noreferrer">Guide Tester spécial invité (PDF)</a>

        <form onSubmit={submit} className="play-testing-flow">
          <section className="play-testing-step">
            <h2><span>1</span> Rejoignez le groupe Visd AR</h2>
            <p className="tiny muted">Google Play réserve les pages de test aux membres du groupe. Rejoignez-le avec le compte Google utilisé dans le Play Store, puis attendez l’acceptation si elle est demandée.</p>
            <div className="play-testing-links">
              <a className="pill-button" href={playTestingGroupUrl} target="_blank" rel="noopener noreferrer">Rejoindre le groupe Visd AR</a>
            </div>
          </section>

          <section className="play-testing-step">
            <div className="play-testing-step-heading">
              <h2><span>2</span> Choisissez les applications à tester</h2>
              <p className="play-testing-selection-count">{selectedApps.length} sélectionnée{selectedApps.length > 1 ? "s" : ""}</p>
            </div>
            <p className="tiny muted">Vous pouvez demander plusieurs applications dans un seul envoi. La page de test de Google Play s’affichera après votre adhésion au groupe.</p>
            <div className="play-testing-selection-actions">
              <button className="pill-button" type="button" onClick={() => setSelectedPackages(playTestingApps.map((app) => app.packageName))} disabled={busy || submitted || selectedApps.length === playTestingApps.length}>Tout sélectionner</button>
              <button className="pill-button" type="button" onClick={() => setSelectedPackages([])} disabled={busy || submitted || selectedApps.length === 0}>Tout désélectionner</button>
            </div>
            <div className="play-testing-app-list">
              {playTestingApps.map((app) => {
                const selected = selectedPackages.includes(app.packageName);
                return <article key={app.packageName} className={`play-testing-app-choice${selected ? " is-selected" : ""}`}>
                  <label>
                    <input type="checkbox" checked={selected} disabled={busy || submitted} onChange={() => toggleApp(app.packageName)} />
                    <span><strong>{app.title}</strong></span>
                  </label>
                </article>;
              })}
            </div>
          </section>

          <section className="play-testing-step">
            <h2><span>3</span> Indiquez votre compte Google Play</h2>
            {user ? <>
              <label htmlFor="play-email">Adresse e-mail utilisée dans le Play Store</label>
              <input id="play-email" className="input" type="email" value={playEmail} onChange={(event) => setPlayEmail(event.target.value)} required disabled={busy || submitted} autoComplete="email" />
              <p className="tiny muted">Cette adresse peut être différente de votre adresse de connexion à Visd AR. Saisissez le compte Google actif dans le Play Store de votre téléphone : il permet à Visd AR de traiter votre accès, sans être publié.</p>
              <fieldset className="play-testing-required-consent">
                <legend>Autorisation requise avant l’envoi</legend>
                <label>
                  <input type="checkbox" required checked={consent} onChange={(event) => setConsent(event.target.checked)} disabled={busy || submitted} />
                  <span><strong>J’autorise Visd AR à traiter mon adresse Google Play et ma sélection.</strong><small>Uniquement pour cette demande de test gratuite. Sans cette autorisation, la demande ne peut pas être envoyée.</small></span>
                </label>
              </fieldset>
            </> : <>
              <p className="muted">Connectez-vous d’abord à Visd AR pour envoyer votre demande et recevoir son suivi.</p>
              <button className="pill-button" type="button" onClick={() => setAuthOpen(true)}>Me connecter</button>
            </>}
          </section>

          <section className="play-testing-step">
            <h2><span>4</span> Envoyez votre demande gratuite</h2>
            <p>Visd AR traite votre demande manuellement. Après l’envoi, l’accès au test et les codes personnels seront préparés sous <strong>48 heures maximum</strong>.</p>
            <p className="play-testing-warning"><strong>Gratuit pour les testeurs :</strong> ne confirmez aucun achat, même si Google Play affiche momentanément un prix. N’ajoutez pas de carte bancaire pour ce test.</p>
            {message ? <p role="status" aria-live="polite">{message}</p> : null}
            {submitted ? <>
              <p className="tiny muted">Votre demande est enregistrée. Sans réponse après 48 heures, ou pour toute question, contactez <a href={`mailto:${adminEmail}`}>{adminEmail}</a>.</p>
              {manualEmailCopyNeeded ? <div className="play-testing-email-backup"><strong>Copie e-mail recommandée</strong><p>Votre demande est bien dans le suivi Visd AR, mais le serveur ne peut pas encore confirmer l’envoi de sa notification e-mail.</p><a className="pill-button" href={manualEmailHref}>Envoyer une copie à {adminEmail}</a></div> : null}
            </> : user ? <button className="cta-button" type="submit" disabled={busy || !selectedApps.length || !playEmail.trim() || !consent}>{busy ? "Envoi de la demande…" : "Envoyer ma demande gratuite"}</button> : <button className="cta-button" type="button" onClick={() => setAuthOpen(true)}>Me connecter pour envoyer la demande</button>}
            {!selectedApps.length ? <p className="play-testing-warning">Choisissez au moins une application avant d’envoyer votre demande.</p> : null}
            <p className="tiny muted">Vous n’avez rien reçu après 48 heures ou vous avez une question ? <a href={`mailto:${adminEmail}`}>{adminEmail}</a></p>
          </section>

          <section className="play-testing-step">
            <h2><span>5</span> Installez sans payer</h2>
            <p>Dans Google Play, cliquez sur le prix, choisissez le téléphone à installer, puis acceptez les conditions si Google les affiche. Dans les modes de paiement, sélectionnez <strong>Test card, always approves</strong>, cliquez sur <strong>Buy</strong> et terminez une éventuelle double authentification. Cette carte virtuelle de test ne débite aucun montant et ne demande ni carte bancaire réelle ni code à utiliser.</p>
            <p className="play-testing-warning">Si Google Play affiche encore un montant à payer, ne confirmez pas l’achat. Contactez <a href={`mailto:${adminEmail}`}>{adminEmail}</a>.</p>
            <div className="play-testing-links"><a className="pill-button" href={guideUrl} target="_blank" rel="noopener noreferrer">Voir le guide Tester spécial invité (PDF)</a></div>
          </section>
        </form>
      </section>
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </main>
  );
}
