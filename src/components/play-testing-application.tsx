"use client";

import { type FormEvent, useEffect, useState } from "react";
import { AuthModal } from "@/components/auth-modal";
import { TopNav } from "@/components/top-nav";
import { useAuth } from "@/components/auth-provider";
import { getPlayTestingApp, playTestingApps, playTestingGroupUrl, playTestingOptInUrl, playTestingStoreUrl } from "@/lib/play-testing";
import type { PlayCodeStatus } from "@/lib/play-code-inventory";

const guideUrl = "/guides/installation-gratuite-google-play.pdf";
type State = { userId: string; packageName: string; data: PlayCodeStatus };

export function PlayTestingApplication({ initialPackageName }: { initialPackageName?: string }) {
  const { user, session } = useAuth();
  const [selectedPackage, setSelectedPackage] = useState(getPlayTestingApp(initialPackageName)?.packageName || playTestingApps[0].packageName);
  const [groupConfirmed, setGroupConfirmed] = useState(false);
  const [testConfirmed, setTestConfirmed] = useState(false);
  const [consent, setConsent] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState(false);
  const [retry, setRetry] = useState(0);
  const [saved, setSaved] = useState<State | null>(null);
  const app = getPlayTestingApp(selectedPackage)!;
  const current = saved?.userId === user?.id && saved?.packageName === selectedPackage ? saved.data : null;

  useEffect(() => {
    setSaved(null); setMessage(""); setCopied(false);
    setGroupConfirmed(false); setTestConfirmed(false); setConsent(false);
    if (!user?.id || !session?.access_token) { setChecking(false); return; }
    const controller = new AbortController();
    setChecking(true);
    fetch(`/api/play-testing/request?app=${encodeURIComponent(selectedPackage)}`, {
      headers: { Authorization: `Bearer ${session.access_token}` }, cache: "no-store", signal: controller.signal,
    }).then(async response => {
      const result = await response.json();
      if (controller.signal.aborted) return;
      if (response.ok && result.ok) setSaved({ userId: user.id, packageName: selectedPackage, data: result });
      setMessage(result.message || "Impossible de vérifier votre accès pour le moment.");
    }).catch(() => { if (!controller.signal.aborted) setMessage("Connexion interrompue. Réessayez sans consommer un nouveau code."); })
      .finally(() => { if (!controller.signal.aborted) setChecking(false); });
    return () => controller.abort();
  }, [selectedPackage, user?.id, session?.access_token, retry]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!session?.access_token || !user) { setAuthOpen(true); return; }
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/play-testing/request", {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ packageName: app.packageName, playEmail: user.email, consent, groupConfirmed, testConfirmed }),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.message || "Aucun code n’a pu être attribué.");
      setSaved({ userId: user.id, packageName: app.packageName, data: result });
      setMessage(result.message);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Connexion interrompue. Réessayez dans un instant."); }
    finally { setBusy(false); }
  };

  return (
    <main className="page-shell play-testing-page">
      <TopNav className="topbar-luxury" showAdmin showLogout onLoginClick={() => setAuthOpen(true)} />
      <section className="panel glass play-testing-main">
        <span className="badge">En phase de test avant lancement</span>
        <h1>Testez nos applications gratuitement</h1>
        <p className="muted">Rejoignez le test, obtenez votre code personnel puis installez l’application. Aucun paiement pour participer, dans la limite des codes disponibles et de leur validité.</p>
        <a className="pill-button" href={guideUrl} target="_blank" rel="noopener noreferrer">Guide illustré : de l’accès au test à l’installation (PDF)</a>
        <div className="input-group">
          <label htmlFor="testing-app">Application à tester</label>
          <select id="testing-app" className="input" value={selectedPackage} disabled={busy} onChange={event => setSelectedPackage(event.target.value)}>
            {playTestingApps.map(item => <option key={item.packageName} value={item.packageName}>{item.title}</option>)}
          </select>
        </div>
        <form onSubmit={submit} className="play-testing-flow">
          <section className="play-testing-step">
            <h2><span>1</span> Un seul compte Google pour tout le parcours</h2>
            {user ? <><label htmlFor="play-email">Compte connecté à Visd AR</label><input id="play-email" className="input" type="email" value={user.email || ""} readOnly />
              <p className="tiny muted">Pour la distribution automatique, cette adresse doit être confirmée et correspondre à votre compte Google Play. Si votre Play Store utilise une autre adresse, reconnectez-vous à Visd AR avec celle-ci. Votre adresse reste privée.</p></>
              : <><p className="muted">Connectez-vous ou créez un compte Visd AR avec l’adresse utilisée dans le Play Store de votre téléphone, puis confirmez-la par e-mail.</p><button className="pill-button" type="button" onClick={() => setAuthOpen(true)}>Me connecter</button></>}
          </section>
          <section className="play-testing-step">
            <h2><span>2</span> Rejoignez le groupe, puis confirmez le test</h2>
            <p className="tiny muted">Le groupe Visd AR est commun aux cinq applications. La participation au test se confirme séparément pour chaque application, sur téléphone comme sur ordinateur.</p>
            <div className="play-testing-links"><a className="pill-button" href={playTestingGroupUrl} target="_blank" rel="noopener noreferrer">A. Rejoindre le groupe Visd AR</a><a className="pill-button" href={playTestingOptInUrl(app)} target="_blank" rel="noopener noreferrer">B. Confirmer le test de {app.title}</a></div>
            {!current?.hasClaim && <><label className="play-testing-consent"><input type="checkbox" required checked={groupConfirmed} onChange={e => setGroupConfirmed(e.target.checked)} disabled={busy} /><span>Je suis membre du groupe Visd AR ; mon adhésion n’est plus en attente.</span></label>
              <label className="play-testing-consent"><input type="checkbox" required checked={testConfirmed} onChange={e => setTestConfirmed(e.target.checked)} disabled={busy} /><span>Google Play confirme ma participation au test de {app.title} avec ce même compte.</span></label></>}
            <p className="tiny muted">Ces confirmations sont vos déclarations. Le site ne peut pas vérifier automatiquement votre adhésion ni confirmer le test à votre place.</p>
          </section>
          <section className="play-testing-step">
            <h2><span>3</span> Votre code personnel</h2>
            {checking ? <p role="status">Vérification de votre accès…</p> : message && user ? <p role="status">{message}</p> : null}
            {current?.code ? <div className="play-code-card">
              <label htmlFor="personal-play-code">Code Google Play pour {app.title}</label>
              <input id="personal-play-code" className="input" value={current.code} readOnly spellCheck={false} autoComplete="off" onFocus={event => event.target.select()} />
              <button className="cta-button" type="button" onClick={async () => { try { await navigator.clipboard.writeText(current.code!); setCopied(true); } catch { setMessage("Sélectionnez le code dans le champ ci-dessus et copiez-le manuellement."); } }}>{copied ? "Code copié" : "Copier mon code"}</button>
              <p className="tiny muted">À utiliser avant le {new Date(current.validUntil!).toLocaleString("fr-FR")}. Ce code ne peut être échangé qu’une fois. Revenez ici pour le retrouver : il ne sera pas remplacé à chaque visite.</p>
            </div> : !current?.hasClaim ? <>
              <label className="play-testing-consent"><input type="checkbox" required checked={consent} onChange={e => setConsent(e.target.checked)} disabled={busy} /><span className="tiny">J’autorise Visd AR à associer mon compte à un code personnel pour cette application et à conserver cette attribution afin d’éviter les doublons.</span></label>
              {user ? <button className="cta-button" type="submit" disabled={busy || checking || current?.status !== "available"}>{busy ? "Attribution…" : "Obtenir mon code gratuit"}</button> : <button className="cta-button" type="button" onClick={() => setAuthOpen(true)}>Me connecter pour obtenir mon code</button>}
            </> : null}
            {user && !checking && !busy && !current?.code ? <button className="pill-button" type="button" onClick={() => setRetry(value => value + 1)}>Vérifier à nouveau</button> : null}
          </section>
          <section className="play-testing-step">
            <h2><span>4</span> Échangez le code, puis installez</h2>
            <p>Dans Google Play, ouvrez les modes de paiement, choisissez <strong>Utiliser un code / Redeem code</strong>, puis collez votre code. Vérifiez que Google confirme l’obtention gratuite avant de terminer.</p>
            <p className="play-testing-warning">Si un montant reste à payer, ne confirmez pas l’achat. N’ajoutez pas de carte bancaire pour ce test.</p>
            <div className="play-testing-links"><a className="pill-button" href={playTestingStoreUrl(app)} target="_blank" rel="noopener noreferrer">Ouvrir Google Play</a><a className="pill-button" href={guideUrl} target="_blank" rel="noopener noreferrer">Voir les captures et les étapes (PDF)</a></div>
          </section>
        </form>
      </section>
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </main>
  );
}
