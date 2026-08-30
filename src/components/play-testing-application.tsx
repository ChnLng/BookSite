"use client";

import { type FormEvent, useState } from "react";
import { AuthModal } from "@/components/auth-modal";
import { TopNav } from "@/components/top-nav";
import { useAuth } from "@/components/auth-provider";
import { getPlayTestingApp, playTestingApps, playTestingGroupUrl, playTestingOptInUrl, playTestingStoreUrl } from "@/lib/play-testing";

export function PlayTestingApplication({ initialPackageName }: { initialPackageName?: string }) {
  const { user, session } = useAuth();
  const [selectedPackage, setSelectedPackage] = useState(getPlayTestingApp(initialPackageName)?.packageName || playTestingApps[0].packageName);
  const [playEmail, setPlayEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const app = getPlayTestingApp(selectedPackage)!;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!session?.access_token) { setAuthOpen(true); return; }
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/play-testing/request", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ packageName: app.packageName, playEmail: playEmail.trim(), consent }),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.message || "La demande n’a pas pu être enregistrée.");
      setSubmitted(true);
      setMessage(result.message);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Connexion interrompue. Réessayez dans un instant.");
    } finally { setBusy(false); }
  };

  return (
    <main className="page-shell play-testing-page">
      <TopNav className="topbar-luxury" showAdmin showLogout onLoginClick={() => setAuthOpen(true)} />
      <section className="panel glass play-testing-main">
        <span className="badge">En phase de test avant lancement</span>
        <h1>Testez nos applications gratuitement</h1>
        <p className="muted">Découvrez nos applications avant leur lancement officiel. L’accès est gratuit sur demande, dans la limite des places et des codes disponibles.</p>
        <form className="input-group" onSubmit={submit}>
          <label htmlFor="testing-app">Application</label>
          <select id="testing-app" className="input" value={selectedPackage} disabled={busy} onChange={(event) => { setSelectedPackage(event.target.value); setSubmitted(false); setMessage(""); }}>
            {playTestingApps.map((item) => <option key={item.packageName} value={item.packageName}>{item.title}</option>)}
          </select>
          <label htmlFor="play-email">Adresse e-mail utilisée dans Google Play</label>
          <input id="play-email" className="input" type="email" inputMode="email" autoComplete="email" required maxLength={254} placeholder="Votre compte Google Play" value={playEmail} onChange={(event) => setPlayEmail(event.target.value)} disabled={busy || submitted} />
          <p className="tiny muted">Vérifiez ce compte dans l’application Play Store de votre téléphone. Il peut être différent de votre compte Visd AR.</p>
          <label className="play-testing-consent"><input type="checkbox" required checked={consent} onChange={(event) => setConsent(event.target.checked)} disabled={busy || submitted} /><span className="tiny">Je confirme utiliser ce compte Google et j’autorise Visd AR à traiter cette adresse pour ma demande et mon accès au groupe de test. Elle ne sera pas publiée.</span></label>
          <button className="cta-button" type="submit" disabled={busy || submitted}>{submitted ? "Demande enregistrée" : busy ? "Enregistrement…" : user ? "Demander à tester gratuitement" : "Me connecter pour faire ma demande"}</button>
          {message ? <p className="tiny" role="status">{message}</p> : null}
        </form>
        <div className="play-testing-steps">
          <h2>Ensuite, utilisez le même compte Google à chaque étape</h2>
          <ol>
            <li><strong>Rejoignez le groupe Visd AR.</strong> Si une approbation est demandée, attendez sa confirmation.<br /><a className="pill-button" href={playTestingGroupUrl} target="_blank" rel="noopener noreferrer">Ouvrir le groupe de test</a></li>
            <li><strong>Inscrivez-vous au test de {app.title}.</strong> Ce lien est nécessaire sur téléphone comme sur ordinateur.<br /><a className="pill-button" href={playTestingOptInUrl(app)} target="_blank" rel="noopener noreferrer">Devenir testeur de cette application</a></li>
            <li><strong>Attendez votre confirmation et votre code personnel.</strong> Votre demande seule ne confirme pas l’adhésion au groupe. N’effectuez aucun achat pour participer.</li>
            <li><strong>Utilisez votre code dans Google Play, puis installez l’application.</strong> Il ne peut être utilisé qu’une fois. Si un paiement est encore demandé, ne le validez pas et contactez Visd AR.<br /><a className="pill-button" href={playTestingStoreUrl(app)} target="_blank" rel="noopener noreferrer">Ouvrir la fiche Google Play</a></li>
          </ol>
        </div>
      </section>
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </main>
  );
}
