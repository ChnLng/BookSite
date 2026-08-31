"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, ArrowUpRight, BookOpen, Check, ChevronRight, Mail } from "lucide-react";
import type { CatalogueApp, CatalogueConfig, CatalogueKind } from "@/lib/android-catalogue";
import { CatalogueViewToggle } from "@/components/catalogue-view-toggle";

const themes = ["jade", "sky", "ink", "prism", "rose"];
function AppArt({ app }: { app: CatalogueApp }) {
  const type = app.packageName.split(".").pop();
  return <div className={`collection-art art-${type}`} aria-label={`Illustration : ${app.title}`} role="img">
    <span className="art-caption">Visd AR · Android</span>
    {type === "couleurs" ? <div className="art-wheel"><span>色<small>sè</small></span></div> :
      type === "heures" ? <div className="art-clock"><span>时<small>shí</small></span></div> :
      type === "famille" ? <div className="art-family"><span>祖</span><i /><div><span>父</span><span>母</span></div><i /><span>我</span></div> :
      type === "calendrier" ? <div className="art-calendar"><span>日 月 火 水 木 金 土</span><strong>月</strong><small>Le temps se découvre</small></div> :
      <div className="art-character"><span>汉</span></div>}
    <span className="art-signature">{app.chinese}<small>{app.pinyin}</small></span>
  </div>;
}

export function AndroidCatalogueBook({ config, kind }: { config: CatalogueConfig; kind: CatalogueKind }) {
  const business = kind === "android-professionnels";
  const apps = config.apps.filter(a => a.visible);
  const pageIds = ["couverture", "sommaire", ...apps.map(a => a.packageName.split(".").pop()!), ...(business ? ["licences", "creation", "realisation", "engagements"] : config.testEnabled ? ["avant-premiere"] : [])];
  const [page, setPage] = useState(0);
  const [ready, setReady] = useState(false);
  const [direction, setDirection] = useState("forward");
  const touch = useRef<{ x: number; y: number } | null>(null);
  const stage = useRef<HTMLDivElement>(null);
  const pages: { id: string; title: string; content: ReactNode; theme?: string }[] = [];
  const external = (url: string, label: string, primary = false) => <a className={`collection-button${primary ? " primary" : ""}`} href={url} target="_blank" rel="noopener noreferrer">{label}<ArrowUpRight size={16} /></a>;
  const go = (next: number) => {
    const index = Math.max(0, Math.min(pages.length - 1, next));
    setDirection(index < page ? "backward" : "forward"); setPage(index);
    window.history.replaceState(null, "", `#${pages[index].id}`);
    stage.current?.scrollIntoView({ block: "start", behavior: "instant" });
    stage.current?.focus({ preventScroll: true });
  };
  const jump = (index: number, children: ReactNode, className = "") => <a key={index} className={className} href={`#${pageIds[index]}`} onClick={event => { event.preventDefault(); go(index); }}>{children}</a>;
  pages.push({ id: "couverture", title: "Couverture", content: <div className="collection-cover">
    <div className="cover-copy"><span className="collection-eyebrow">Applications Android · {business ? "Établissements & professionnels" : "La collection"}</span><h1>{config.title}</h1><p className="collection-lead">{config.introduction}</p>{jump(1, <>Ouvrir le catalogue <ArrowRight size={19} /></>, "collection-button primary")}<span className="cover-languages">中文 <i /> Pinyin <i /> Français</span></div>
    <div className="cover-composition" aria-hidden="true"><div className="cover-orbit"/><span className="cover-glyph glyph-one">学<small>apprendre</small></span><span className="cover-glyph glyph-two">色<small>explorer</small></span><span className="cover-glyph glyph-three">知<small>comprendre</small></span><span className="cover-seal">Visd AR<br/><small>Des mots aux découvertes.</small></span></div>
  </div> });
  pages.push({ id: "sommaire", title: "Sommaire", content: <div className="collection-toc"><span className="collection-eyebrow">Votre parcours</span><h2>{apps.length === 5 ? "Cinq" : apps.length} portes d’entrée.<br/><em>Une même curiosité.</em></h2><p>Choisissez une application ou laissez-vous guider, page après page.</p><nav aria-label="Sommaire du catalogue">{apps.map((app, index) => jump(index + 2, <><span className="toc-number">0{index + 1}</span><span><strong>{app.title}</strong><small>{app.subtitle}</small></span><ChevronRight size={20}/></>, "toc-entry"))}{business ? <>{jump(apps.length + 2, <>Licences pour les établissements <ArrowRight size={18}/></>, "toc-extra")}{jump(apps.length + 3, <>Créations pédagogiques & tarifs <ArrowRight size={18}/></>, "toc-extra")}{jump(apps.length + 4, <>Calendrier & publication <ArrowRight size={18}/></>, "toc-extra")}{jump(apps.length + 5, <>Engagements & conditions <ArrowRight size={18}/></>, "toc-extra")}</> : config.testEnabled ? jump(apps.length + 2, <>Phase de test · Demander un essai gratuit <ArrowRight size={18}/></>, "toc-extra") : null}</nav></div> });
  apps.forEach((app, index) => pages.push({ id: app.packageName.split(".").pop()!, title: app.title, theme: themes[index % themes.length], content: <div className="collection-app-spread"><AppArt app={app}/><div className="collection-app-copy"><span className="collection-eyebrow">La collection · 0{index + 1}</span><h2>{app.title}</h2><p className="collection-tagline">{app.subtitle}</p><p>{app.description}</p><ul className="collection-features">{app.features.map(feature => <li key={feature}><Check size={16}/>{feature}</li>)}</ul><p className="collection-audience">{app.audience}</p>{external(`https://play.google.com/store/apps/details?id=${app.packageName}`, "Découvrir sur Google Play", true)}<small className="collection-fine">Disponibilité selon le compte, l’appareil et le pays. Visuel d’ambiance : l’interface de l’application peut différer.</small></div></div> }));
  if (business) {
    pages.push({ id: "licences", title: "Licences", content: <div className="collection-editorial"><span className="collection-eyebrow">Pour apprendre ensemble</span><h2>Une collection.<br/><em>À l’échelle de votre établissement.</em></h2><p className="collection-lead">Des tarifs dégressifs par application et par commande.</p><div className="collection-price-table"><table><thead><tr><th>Nombre de licences</th><th>Part du prix unitaire</th><th>Remise</th></tr></thead><tbody>{config.tiers.map((tier, i) => <tr key={tier.minimum}><td>{config.tiers[i+1] ? `${tier.minimum}–${config.tiers[i+1].minimum-1}` : `${tier.minimum} et plus`}</td><td><strong>{tier.percent} %</strong></td><td>{100-tier.percent} %</td></tr>)}</tbody></table></div><p>{config.licenceTerms}</p><p className="collection-note">Barème {config.pricingDraft ? "proposé, à confirmer par devis" : "indicatif, applicable selon devis"}. Prix de référence hors taxes précisé avant commande. TVA selon le régime applicable. Aucun paiement n’est demandé dans ce catalogue.</p>{external("mailto:visdar@outlook.fr?subject=Licences%20Android%20pour%20mon%20%C3%A9tablissement", "Demander un devis", true)}</div> });
    pages.push({ id: "creation", title: "Création & tarifs", content: <div className="collection-editorial"><span className="collection-eyebrow">Votre projet pédagogique</span><h2>Une application<br/><em>à votre image.</em></h2><p>Trois périmètres définis. Des prix en euros hors taxes, confirmés après validation du cahier des charges.</p><div className="collection-packages">{config.packages.map(pack => <section key={pack.name}><h3>{pack.name}</h3><p className="collection-package-price">{pack.price.toLocaleString("fr-FR")} € <small>HT</small></p><p>{pack.scope}</p></section>)}</div><p className="collection-note">{config.pricingDraft ? "Proposition tarifaire" : "Grille indicative"} · Aucun abonnement inclus. Toute demande hors périmètre fait l’objet d’un accord écrit et d’un devis complémentaire avant exécution.</p>{external("mailto:visdar@outlook.fr?subject=Projet%20d%E2%80%99application%20p%C3%A9dagogique", "Parlons de votre projet", true)}</div> });
    pages.push({ id: "realisation", title: "Calendrier & publication", content: <div className="collection-editorial collection-delivery"><span className="collection-eyebrow">Du projet à l’application</span><h2>Un calendrier clair.<br/><em>Deux modes de publication.</em></h2><div className="collection-columns"><section><h3>Deux mois, un travail partagé</h3>{config.delivery.map((text, i) => <p key={i}>{text}</p>)}</section><section><h3>Visd AR ou votre compte</h3>{config.publishing.map((text, i) => <p key={i}>{text}</p>)}<a className="collection-source" href="https://support.google.com/googleplay/android-developer/answer/14151465?hl=fr" target="_blank" rel="noopener noreferrer">Exigences de Google pour les nouveaux comptes personnels ↗</a></section></div></div> });
    pages.push({ id: "engagements", title: "Engagements & contact", content: <div className="collection-editorial collection-terms"><span className="collection-eyebrow">Travailler en confiance</span><h2>Des engagements<br/><em>à la mesure du projet.</em></h2><div className="collection-columns">{config.terms.map((text, i) => <section key={i}><span className="collection-term-number">0{i+1}</span><p>{text}</p></section>)}</div><div className="collection-contact"><span><strong>Votre prochain outil commence par une conversation.</strong><small>Visd AR · visdar@outlook.fr</small></span>{external("mailto:visdar@outlook.fr?subject=Catalogue%20professionnel%20Visd%20AR", "Nous écrire", true)}</div><p className="collection-fine">Cadre B2B proposé, à adapter au devis et à faire vérifier juridiquement avant signature. Ce catalogue ne constitue pas à lui seul un contrat.</p></div> });
  } else if (config.testEnabled) pages.push({ id: "avant-premiere", title: "Phase de test", content: <div className="collection-editorial collection-test"><span className="collection-eyebrow">Phase de test avant lancement</span><h2>{config.testTitle}</h2><p className="collection-lead">{config.testText}</p><div className="collection-test-steps"><section><span>01</span><h3>Préparez votre compte</h3><p>Utilisez le même compte Google pour le groupe, l’inscription au test et Google Play.</p></section><section><span>02</span><h3>Demandez votre accès</h3><p>Suivez les étapes du formulaire. Un code personnel peut être attribué selon les disponibilités.</p></section><section><span>03</span><h3>Installez sans payer</h3><p>Utilisez votre code dans Google Play. Ne validez jamais un achat si un montant reste dû.</p></section></div><div className="collection-actions">{external("https://www.visdar.fr/tests-google-play", "Demander un essai gratuit", true)}{external("/guides/installation-gratuite-google-play.pdf", "Guide d’installation illustré")}</div><p className="collection-fine">Aucun achat requis pour participer. Code à usage unique, sous réserve d’éligibilité et de validité. L’inscription au groupe ne remplace pas l’inscription au test de l’application.</p></div> });

  useEffect(() => {
    const sync = () => { const id = window.location.hash.slice(1); const next = pages.findIndex(p => p.id === id); if (next >= 0) setPage(next); };
    sync(); setReady(true); window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
    // Page ids are stable for a mounted edition.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return <main className={`collection-shell${ready ? " collection-ready" : ""}`}>
    <CatalogueViewToggle />
    <header className="collection-header"><a href="/" className="collection-brand"><img src="/images/logo.png" width="42" height="42" alt=""/><span>Visd AR<small>Applications Android</small></span></a><span className="collection-edition">{business ? "Catalogue professionnel" : "Catalogue découverte"}</span><a className="collection-index-link" href="#sommaire" onClick={event => { event.preventDefault(); go(1); }}><BookOpen size={18}/>Sommaire</a></header>
    {business && config.pricingDraft ? <p className="collection-draft">Édition de travail · Proposition de tarifs et de conditions, à confirmer par devis.</p> : null}
    <div className={`collection-stage ${direction}`} ref={stage} tabIndex={0} aria-label="Catalogue à feuilleter" onKeyDown={event => { if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return; if (event.key === "ArrowRight" || event.key === "ArrowLeft") { event.preventDefault(); go(page + (event.key === "ArrowRight" ? 1 : -1)); } }} onTouchStart={event => { if ((event.target as HTMLElement).closest("a,button,input,textarea")) { touch.current=null; return; } const t=event.touches[0]; touch.current={x:t.clientX,y:t.clientY}; }} onTouchEnd={event => { if(!touch.current) return; const t=event.changedTouches[0],dx=t.clientX-touch.current.x,dy=t.clientY-touch.current.y; touch.current=null; if(Math.abs(dx)>70 && Math.abs(dx)>Math.abs(dy)*1.7) go(page+(dx<0?1:-1)); }}>
      {pages.map((entry, index) => <article key={entry.id} id={entry.id} className={`collection-page ${entry.theme || ""}${page === index ? " is-current" : ""}`} aria-label={`${index+1}. ${entry.title}`}><div className="collection-page-body">{entry.content}</div><div className="collection-page-footer"><span>Visd AR · {business ? "Collection professionnelle" : "Collection Android"}</span><span>{String(index+1).padStart(2,"0")}</span></div></article>)}
    </div>
    <nav className="collection-controls" aria-label="Navigation entre les pages"><button onClick={() => go(page-1)} disabled={page===0} aria-label="Page précédente"><ArrowLeft size={19}/><span>Précédente</span></button><span aria-live="polite" aria-atomic="true">{page+1} / {pages.length}<small>{pages[page]?.title}</small></span><button onClick={() => go(page+1)} disabled={page===pages.length-1} aria-label="Page suivante"><span>Suivante</span><ArrowRight size={19}/></button></nav>
    <p className="collection-reading-hint">Feuilletez avec les flèches, le clavier ou un glissement horizontal sur téléphone.</p>
    <footer className="collection-site-footer"><span>Catalogue accessible par lien · Non référencé dans la navigation du site.</span><a href="mailto:visdar@outlook.fr"><Mail size={13}/>Contacter Visd AR</a></footer>
  </main>;
}
