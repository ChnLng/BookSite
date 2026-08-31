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
  playTestingStoreUrl,
  type PlayTestingApp,
} from "@/lib/play-testing";
import { playCodeMessage, type PlayCodeStatus } from "@/lib/play-code-inventory";

const guideUrl = "/guides/installation-gratuite-google-play.pdf";

type SavedStatuses = {
  userId: string;
  values: Record<string, PlayCodeStatus>;
};

type RequestResult = {
  app: PlayTestingApp;
  result: PlayCodeStatus & { ok?: boolean; message?: string };
  ok: boolean;
};

function isRequestable(status?: PlayCodeStatus) {
  return status?.status === "available" && !status.hasClaim;
}

export function PlayTestingMultiApplication({ initialPackageName }: { initialPackageName?: string }) {
  const { user, session } = useAuth();
  const initialApp = getPlayTestingApp(initialPackageName) || playTestingApps[0];
  const [selectedPackages, setSelectedPackages] = useState<string[]>([initialApp.packageName]);
  const [groupConfirmed, setGroupConfirmed] = useState(false);
  const [testConfirmed, setTestConfirmed] = useState<Record<string, boolean>>({});
  const [consent, setConsent] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState("");
  const [copiedPackages, setCopiedPackages] = useState<Record<string, boolean>>({});
  const [retry, setRetry] = useState(0);
  const [saved, setSaved] = useState<SavedStatuses | null>(null);

  const selectedApps = useMemo(
    () => playTestingApps.filter((app) => selectedPackages.includes(app.packageName)),
    [selectedPackages],
  );
  const selectedKey = selectedApps.map((app) => app.packageName).join("|");
  const statuses = saved && saved.userId === user?.id ? saved.values : {};
  const requestableApps = selectedApps.filter((app) => isRequestable(statuses[app.packageName]));
  const confirmationsComplete = groupConfirmed && consent && requestableApps.every((app) => testConfirmed[app.packageName]);

  useEffect(() => {
    setSaved(null);
    setMessage("");
    setCopiedPackages({});
    setGroupConfirmed(false);
    setTestConfirmed({});
    setConsent(false);
  }, [user?.id, session?.access_token]);

  useEffect(() => {
    if (!user?.id || !session?.access_token || !selectedApps.length) {
      setChecking(false);
      return;
    }

    const controller = new AbortController();
    setChecking(true);
    void Promise.all(selectedApps.map(async (app) => {
      const response = await fetch(`/api/play-testing/request?app=${encodeURIComponent(app.packageName)}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
        cache: "no-store",
        signal: controller.signal,
      });
      const result = await response.json().catch(() => null) as (PlayCodeStatus & { ok?: boolean; message?: string }) | null;
      return { app, result, ok: response.ok && result?.ok === true };
    })).then((results) => {
      if (controller.signal.aborted) return;
      const values: Record<string, PlayCodeStatus> = {};
      const failures = results.filter((entry) => !entry.ok);
      results.forEach((entry) => {
        if (entry.ok && entry.result) values[entry.app.packageName] = entry.result;
      });
      setSaved((current) => ({
        userId: user.id,
        values: current?.userId === user.id ? { ...current.values, ...values } : values,
      }));
      if (failures.length) {
        setMessage(failures[0].result?.message || "Impossible de vérifier toutes les applications sélectionnées. Réessayez sans demander un nouveau code.");
      }
    }).catch(() => {
      if (!controller.signal.aborted) setMessage("Connexion interrompue. Réessayez sans demander un nouveau code.");
    }).finally(() => {
      if (!controller.signal.aborted) setChecking(false);
    });

    return () => controller.abort();
  }, [selectedKey, user?.id, session?.access_token, retry]);

  const toggleApp = (packageName: string) => {
    if (busy) return;
    setMessage("");
    setSelectedPackages((current) => {
      const next = current.includes(packageName)
        ? current.filter((item) => item !== packageName)
        : [...current, packageName];
      return playTestingApps.filter((app) => next.includes(app.packageName)).map((app) => app.packageName);
    });
  };

  const selectAll = () => {
    if (!busy) setSelectedPackages(playTestingApps.map((app) => app.packageName));
  };

  const clearAll = () => {
    if (!busy) setSelectedPackages([]);
  };

  const copyCode = async (app: PlayTestingApp, code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedPackages((current) => ({ ...current, [app.packageName]: true }));
    } catch {
      setMessage(`Sélectionnez le code de ${app.title} dans le champ et copiez-le manuellement.`);
    }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!session?.access_token || !user) {
      setAuthOpen(true);
      return;
    }
    if (!requestableApps.length || !confirmationsComplete) return;

    setBusy(true);
    setMessage("");
    try {
      const results: RequestResult[] = await Promise.all(requestableApps.map(async (app) => {
        const response = await fetch("/api/play-testing/request", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({
            packageName: app.packageName,
            playEmail: user.email,
            consent: true,
            groupConfirmed: true,
            testConfirmed: true,
          }),
        });
        const result = await response.json().catch(() => null) as (PlayCodeStatus & { ok?: boolean; message?: string }) | null;
        return {
          app,
          result: result || { status: "unavailable", hasClaim: false, message: "Aucun code n’a pu être attribué." },
          ok: response.ok && result?.ok === true,
        };
      }));
      const values = Object.fromEntries(results.filter((entry) => entry.ok).map((entry) => [entry.app.packageName, entry.result]));
      setSaved((current) => ({
        userId: user.id,
        values: current?.userId === user.id ? { ...current.values, ...values } : values,
      }));
      const failures = results.filter((entry) => !entry.ok);
      if (failures.length) {
        const successText = Object.keys(values).length ? " Les autres codes sont affichés ci-dessous." : "";
        setMessage(`${failures[0].app.title} : ${failures[0].result.message || "aucun code n’a pu être attribué."}${successText}`);
      } else {
        setMessage("Vos codes personnels sont prêts. Ils restent enregistrés dans Ma page et ne sont pas remplacés lors d’une nouvelle visite.");
      }
    } catch {
      setMessage("Connexion interrompue. Réessayez dans un instant : un éventuel code déjà attribué restera le même.");
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
        <p className="muted">Choisissez une ou plusieurs applications. Chaque code est personnel, attribué une seule fois pour une application, puis conservé dans votre espace Ma page.</p>
        <a className="pill-button" href={guideUrl} target="_blank" rel="noopener noreferrer">Guide illustré : de l’accès au test à l’installation (PDF)</a>

        <form onSubmit={submit} className="play-testing-flow">
          <section className="play-testing-step">
            <h2><span>1</span> Rejoignez d’abord le groupe Visd AR</h2>
            <p className="tiny muted">C’est indispensable : Google Play n’affiche les pages de test qu’aux membres du groupe. Attendez la confirmation du groupe avant de continuer.</p>
            <div className="play-testing-links">
              <a className="pill-button" href={playTestingGroupUrl} target="_blank" rel="noopener noreferrer">Rejoindre le groupe Visd AR</a>
            </div>
            {user ? <label className="play-testing-consent">
              <input type="checkbox" checked={groupConfirmed} onChange={(event) => setGroupConfirmed(event.target.checked)} disabled={busy} />
              <span>Le groupe a confirmé mon adhésion avec le même compte Google que mon Play Store.</span>
            </label> : <p className="tiny muted">Après avoir rejoint le groupe, connectez-vous à Visd AR avec ce même compte Google pour confirmer cette étape.</p>}
          </section>

          <section className="play-testing-step">
            <div className="play-testing-step-heading">
              <h2><span>2</span> Choisissez les applications à tester</h2>
              <p className="play-testing-selection-count">{selectedApps.length} sélectionnée{selectedApps.length > 1 ? "s" : ""}</p>
            </div>
            <p className="tiny muted">Vous pouvez demander un code pour plusieurs applications en une seule fois. Les pages de test sont déverrouillées après l’étape 1.</p>
            <div className="play-testing-selection-actions">
              <button className="pill-button" type="button" onClick={selectAll} disabled={busy || selectedApps.length === playTestingApps.length}>Tout sélectionner</button>
              <button className="pill-button" type="button" onClick={clearAll} disabled={busy || selectedApps.length === 0}>Tout désélectionner</button>
            </div>
            <div className="play-testing-app-list">
              {playTestingApps.map((app) => {
                const selected = selectedPackages.includes(app.packageName);
                const status = statuses[app.packageName];
                return (
                  <article key={app.packageName} className={`play-testing-app-choice${selected ? " is-selected" : ""}`}>
                    <label>
                      <input type="checkbox" checked={selected} disabled={busy} onChange={() => toggleApp(app.packageName)} />
                      <span><strong>{app.title}</strong><small>{status ? playCodeMessage(status) : "Sélectionnez cette application pour préparer sa demande."}</small></span>
                    </label>
                    {groupConfirmed ? <a href={playTestingOptInUrl(app)} target="_blank" rel="noopener noreferrer">Page de test</a> : <span className="play-testing-app-link-hint">Après l’étape 1</span>}
                  </article>
                );
              })}
            </div>
          </section>

          <section className="play-testing-step">
            <h2><span>3</span> Utilisez le même compte, puis confirmez chaque test</h2>
            {user ? <>
              <label htmlFor="play-email">Compte connecté à Visd AR</label>
              <input id="play-email" className="input" type="email" value={user.email || ""} readOnly />
              <p className="tiny muted">Cette adresse confirmée doit être celle de votre Play Store. Elle reste privée et évite qu’un même accès reçoive plusieurs codes.</p>
            </> : <>
              <p className="muted">Connectez-vous ou créez un compte Visd AR avec l’adresse utilisée dans le Play Store de votre téléphone, puis confirmez-la par e-mail.</p>
              <button className="pill-button" type="button" onClick={() => setAuthOpen(true)}>Me connecter</button>
            </>}
            {groupConfirmed && requestableApps.length ? <>
              <label className="play-testing-consent">
                <span className="tiny">Ouvrez chaque page de test ci-dessous, inscrivez-vous avec le même compte Google, puis cochez la confirmation correspondante.</span>
              </label><div className="play-testing-test-list">
                {requestableApps.map((app) => (
                  <label key={app.packageName} className="play-testing-test-row">
                    <input type="checkbox" required checked={Boolean(testConfirmed[app.packageName])} onChange={(event) => setTestConfirmed((current) => ({ ...current, [app.packageName]: event.target.checked }))} disabled={busy} />
                    <span><strong>{app.title}</strong><small>Google Play confirme ma participation au test avec ce même compte.</small></span>
                    <a href={playTestingOptInUrl(app)} target="_blank" rel="noopener noreferrer" onClick={(event) => event.stopPropagation()}>Confirmer le test</a>
                  </label>
                ))}
              </div>
              <label className="play-testing-consent">
                <input type="checkbox" required checked={consent} onChange={(event) => setConsent(event.target.checked)} disabled={busy} />
                <span className="tiny">J’autorise Visd AR à associer mon compte à un code personnel pour les applications choisies et à conserver ces attributions afin d’éviter les doublons.</span>
              </label>
            </> : !groupConfirmed ? <p className="tiny muted">Terminez l’étape 1 pour ouvrir et confirmer les pages de test.</p> : selectedApps.length && user && !checking ? <p className="tiny muted">Aucune nouvelle demande n’est nécessaire pour cette sélection. Les codes déjà attribués apparaissent dans l’étape suivante.</p> : null}
            <p className="tiny muted">Ces confirmations sont vos déclarations. Le site ne peut pas vérifier automatiquement votre adhésion ni confirmer les tests à votre place.</p>
          </section>

          <section className="play-testing-step">
            <h2><span>4</span> Vos codes personnels</h2>
            {checking ? <p role="status">Vérification de vos codes…</p> : null}
            {message ? <p role="status" aria-live="polite">{message}</p> : null}
            <div className="play-code-grid">
              {selectedApps.map((app) => {
                const status = statuses[app.packageName];
                if (!status?.code) return null;
                return (
                  <div className="play-code-card" key={app.packageName}>
                    <strong>{app.title}</strong>
                    <label htmlFor={`personal-play-code-${app.packageName}`}>Code Google Play personnel</label>
                    <input id={`personal-play-code-${app.packageName}`} className="input" value={status.code} readOnly spellCheck={false} autoComplete="off" onFocus={(event) => event.target.select()} />
                    <div className="play-code-card-actions">
                      <button className="cta-button" type="button" onClick={() => void copyCode(app, status.code!)}>{copiedPackages[app.packageName] ? "Code copié" : "Copier le code"}</button>
                      <a className="pill-button" href={playTestingStoreUrl(app)} target="_blank" rel="noopener noreferrer">Ouvrir Google Play</a>
                      <a className="pill-button" href={playTestingOptInUrl(app)} target="_blank" rel="noopener noreferrer">Page de test</a>
                    </div>
                    <p className="tiny muted">À utiliser avant le {status.validUntil ? new Date(status.validUntil).toLocaleString("fr-FR") : "la date indiquée par Google Play"}. Ce code reste disponible dans Ma page ; il n’est pas remplacé lors d’une nouvelle visite.</p>
                  </div>
                );
              })}
            </div>
            {user && selectedApps.length > 0 && !checking && requestableApps.length > 0 ? (
              <button className="cta-button" type="submit" disabled={busy || !confirmationsComplete}>{busy ? "Attribution des codes…" : `Obtenir ${requestableApps.length > 1 ? "mes codes gratuits" : "mon code gratuit"}`}</button>
            ) : null}
            {user && !checking ? <button className="pill-button" type="button" onClick={() => setRetry((value) => value + 1)} disabled={busy}>Vérifier à nouveau</button> : null}
            {!user ? <button className="cta-button" type="button" onClick={() => setAuthOpen(true)}>Me connecter pour obtenir mes codes</button> : null}
            {selectedApps.length === 0 ? <p className="play-testing-warning">Choisissez au moins une application avant de demander un code.</p> : null}
          </section>

          <section className="play-testing-step">
            <h2><span>5</span> Échangez puis installez</h2>
            <p>Dans Google Play, ouvrez les modes de paiement, choisissez <strong>Utiliser un code / Redeem code</strong>, puis collez le code de l’application concernée. Vérifiez que Google confirme l’obtention gratuite avant de terminer.</p>
            <p className="play-testing-warning">Si un montant reste à payer, ne confirmez pas l’achat. N’ajoutez pas de carte bancaire pour ce test.</p>
            <div className="play-testing-links"><a className="pill-button" href={guideUrl} target="_blank" rel="noopener noreferrer">Voir les captures et les étapes (PDF)</a></div>
          </section>
        </form>
      </section>
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </main>
  );
}
