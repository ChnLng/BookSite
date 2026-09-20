"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, ArrowUpRight, BookOpen, Check, ChevronRight, Mail } from "lucide-react";
import type { CatalogueApp, CatalogueConfig, CatalogueKind } from "@/lib/android-catalogue";
import { CatalogueViewToggle } from "@/components/catalogue-view-toggle";
import { AndroidDemoVideo } from "@/components/android-demo-video";

const themes = ["jade", "sky", "ink", "prism", "rose", "jade", "sky", "ink", "prism", "rose", "jade", "sky"];
const publicPrices: Record<string, number> = {
  "com.visdar.calendrier": 0.99, "com.visdar.dialectes": 0.99,
  "com.visdar.classificateur": 2.09, "com.visdar.cles": 2.09,
  "com.visdar.contextes": 0.19, "com.visdar.expressions": 4.99,
  "com.visdar.temps": 2.09, "com.visdar.heures": 2.09,
  "com.visdar.chiffres": 2.09, "com.visdar.manuscrits": 4.99,
  "com.visdar.couleurs": 2.09, "com.visdar.famille": 2.09,
};
function AppArt({ app }: { app: CatalogueApp }) {
  const type = app.packageName.split(".").pop();
  return <div className={`collection-art art-${type}`} aria-label={`Illustration : ${app.title}`} role="img">
    <span className="art-caption">Visd AR · Android</span>
    {type === "couleurs" ? <div className="art-wheel"><span>色<small>sè</small></span></div> :
      type === "heures" ? <div className="art-clock"><span>时<small>shí</small></span></div> :
      type === "famille" ? <div className="art-family"><span>祖</span><i /><div><span>父</span><span>母</span></div><i /><span>我</span></div> :
      type === "calendrier" ? <div className="art-calendar"><span>子 丑 寅 卯 辰 巳 午 未 申 酉 戌 亥</span><strong>月</strong><small>Le temps se découvre</small></div> :
      type === "dialectes" ? <div className="art-map"><span>北</span><span>吴</span><span>粤</span><span>闽</span><i>34 régions</i></div> :
      type === "classificateur" ? <div className="art-measure"><span>一</span><i>本</i><b>书</b><small>un · classificateur · nom</small></div> :
      type === "contextes" ? <div className="art-context"><span>mot</span><i>词</i><b>contexte</b></div> :
      type === "expressions" ? <div className="art-chengyu"><span>画</span><span>龙</span><span>点</span><span>睛</span><small>chéngyǔ</small></div> :
      type === "temps" ? <div className="art-timeline"><span>昨</span><i>了</i><b>今</b><i>在</i><span>明</span><small>passé · présent · avenir</small></div> :
      type === "chiffres" ? <div className="art-numbers"><span>一</span><b>十</b><i>万</i><em>亿</em><small>1 · 10 · 10 000 · 100 000 000</small></div> :
      type === "manuscrits" ? <div className="art-handwriting"><span>永</span><i /><small>écrire · reconnaître · apprendre</small></div> :
      <div className="art-character"><span>汉</span></div>}
    <span className="art-signature">{app.chinese}<small>{app.pinyin}</small></span>
  </div>;
}

function formatCatalogueSubtitle(value: string) {
  const [before, after] = value.split("mesure word");
  if (after === undefined) return value;
  return <>{before}<em>mesure word</em>{after}</>;
}

function CreationAbout() {
  const sections = [
    {
      french: "En classe, le temps est compté. Pourtant, la curiosité des étudiants ne s’arrête pas à la fin d’une séance. Ces applications sont nées d’un souhait simple : proposer, en complément du cours, des contenus fiables, clairs et rapides à consulter, afin de transformer les notions abordées en classe en repères structurés et en connaissances plus complètes.",
      chinese: "课堂时间总是有限，但学生的好奇心不会在下课时停止。这些应用源于一个朴素的愿望：在课程之外，提供可信、清晰且便于快速查阅的补充内容，让课堂中涉及的知识点得到系统梳理和完整延展。",
    },
    {
      french: "Dans les applications d’apprentissage du chinois, les contenus conçus à partir de l’anglais occupent encore une place dominante. Ces outils font un autre choix : partir du français, langue de référence des apprenants francophones, et créer des passerelles directes entre le français et le chinois, dans les deux sens. Ils cherchent ainsi à répondre à un besoin encore peu couvert aujourd’hui.",
      chinese: "当下，不少汉语学习应用仍以英语为主要媒介。这里尝试从法语母语学习者的理解路径出发，建立法语与汉语之间双向、直接的连接，填补目前仍较少被充分覆盖的需要。",
    },
    {
      french: "Cette démarche est à la fois pédagogique et personnelle. J’espère que ces applications, conçues avec patience et exigence, trouveront leur place auprès de celles et ceux qui apprennent le chinois, et recevront leur confiance et leur reconnaissance.",
      chinese: "这既是一项教学实践，也是一份持续投入的尝试。希望这些经过耐心制作与反复打磨的应用，能够被更多汉语学习者喜爱、使用并认可。",
    },
    {
      frenchTitle: "Une démarche née de l’enseignement sur le terrain",
      chineseTitle: "源自一线教学的探索与实践",
      french: "Depuis 2018, j’enseigne le chinois dans des écoles d’ingénieurs, des écoles de commerce et des universités. Au contact des étudiants, j’ai profondément ressenti les limites du temps de classe ; j’ai également constaté que la plupart des applications d’auto-apprentissage s’appuient sur l’anglais et qu’il manque un système de correspondances directes pensé spécifiquement pour les apprenants dont le français est la langue maternelle.\n\nC’est à partir de ces observations issues de l’enseignement que j’ai développé cette série d’applications. Elles sont conçues tout spécialement pour les apprenants francophones et établissent un lien direct entre le français et le chinois. Elles n’ont pas vocation à remplacer le cours ; elles constituent un outil complémentaire structuré, permettant aux étudiants de consulter avec précision et de consolider, hors de la classe, les notions étudiées.\n\nIl s’agit à la fois d’une pratique pédagogique et d’un travail poursuivi avec constance. Les applications sont aujourd’hui disponibles sur Android. En tant que collègue dans le domaine de l’éducation, j’espère vivement recueillir les avis et suggestions des spécialistes et des enseignants expérimentés, afin de poursuivre leur amélioration.",
      chinese: "自 2018 年起，我一直在工程师学校、商学院及大学从事汉语一线教学。在与学生的接触中，我深感课堂时间的有限，也注意到市场上大多数自学应用均以英语为主要媒介，缺乏专门面向法语母语者的直接对应体系。\n\n正是基于一线的教学观察，我开发了这一系列应用。它们专为法语区学习者设计，建立法汉之间的直接桥梁。应用的定位并非替代课堂，而是作为系统性的补充工具，帮助学生在课外精准查阅、巩固课堂所学。\n\n这既是一项教学实践，也是一份持续投入的心血。目前应用已在 Android 平台上线。作为教育同行，我非常期待能听取专家及前辈的宝贵意见与建议，以帮助这一工具不断优化完善。",
    },
  ];
  return <div className="collection-about"><div className="collection-about-heading"><span className="collection-eyebrow">Une intention pédagogique · 教学初衷</span><h2>À propos<br/><em>de cette création.</em></h2><p>让课堂之外的学习，也有清晰、可靠而自在的延续。</p></div><div className="collection-about-sections">{sections.map((section, index) => <div className="collection-about-pair" key={index}><section lang="fr">{section.frenchTitle ? <h3>{section.frenchTitle}</h3> : null}{section.french.split("\n\n").map((paragraph, paragraphIndex) => <p key={paragraphIndex}>{paragraph}</p>)}</section><section lang="zh-CN">{section.chineseTitle ? <h3>{section.chineseTitle}</h3> : null}{section.chinese.split("\n\n").map((paragraph, paragraphIndex) => <p key={paragraphIndex}>{paragraph}</p>)}</section></div>)}</div></div>;
}

export function AndroidCatalogueBook({ config, kind, presentation = "standard" }: { config: CatalogueConfig; kind: CatalogueKind; presentation?: "standard" | "mobile" }) {
  const mobileGuide = presentation === "mobile";
  const business = kind === "android-professionnels";
  const apps = config.apps.filter(a => a.visible);
  const firstAppPage = mobileGuide ? 1 : 2;
  const pageIds = [...(mobileGuide ? [] : ["couverture"]), "sommaire", ...apps.map(a => a.packageName.split(".").pop()!), ...(mobileGuide ? ["a-propos"] : business ? ["licences", "creation", "engagements"] : config.testEnabled ? ["avant-premiere"] : [])];
  const [page, setPage] = useState(0);
  const [ready, setReady] = useState(false);
  const [direction, setDirection] = useState("forward");
  const touch = useRef<{ x: number; y: number } | null>(null);
  const shell = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const pages: { id: string; title: string; content: ReactNode; theme?: string }[] = [];
  const external = (url: string, label: string, primary = false, title?: string) => <a className={`collection-button${primary ? " primary" : ""}`} href={url} target="_blank" rel="noopener noreferrer" title={title}>{label}<ArrowUpRight size={16} /></a>;
  const go = (next: number) => {
    const index = Math.max(0, Math.min(pages.length - 1, next));
    setDirection(index < page ? "backward" : "forward"); setPage(index);
    shell.current?.scrollIntoView({ block: "start", behavior: "instant" });
    stage.current?.focus({ preventScroll: true });
  };
  const jump = (index: number, children: ReactNode, className = "") => <a key={index} className={className} href={`#${pageIds[index]}`} onClick={event => { event.preventDefault(); go(index); }}>{children}</a>;
  if (!mobileGuide) pages.push({ id: "couverture", title: "Couverture", content: <div className="collection-cover">
    <div className="cover-copy"><span className="collection-eyebrow">Applications Android · {business ? "Établissements & professionnels" : "La collection"}</span><h1>{config.title}</h1><p className="collection-lead">{config.introduction}</p>{jump(1, <>Ouvrir le catalogue <ArrowRight size={19} /></>, "collection-button primary")}<span className="cover-languages">汉字 <i /> Pinyin <i /> Français</span></div>
    <div className="cover-composition" aria-hidden="true"><div className="cover-orbit"/><span className="cover-glyph glyph-one">学<small>apprendre</small></span><span className="cover-glyph glyph-two">寻<small>explorer</small></span><span className="cover-glyph glyph-three">知<small>comprendre</small></span><span className="cover-seal">Visd AR<br/><small>Des mots aux découvertes.</small></span></div>
  </div> });
  pages.push({ id: "sommaire", title: "Sommaire", content: <div className="collection-toc"><span className="collection-eyebrow">{mobileGuide ? "Les douze applications · 十二款应用" : "Votre parcours"}</span><h2>{apps.length === 5 ? "Cinq" : apps.length} portes d’entrée.<br/><em>Une même curiosité.</em></h2>{!mobileGuide ? <p>Choisissez une application ou laissez-vous guider, page après page.</p> : null}<nav aria-label="Sommaire du catalogue">{apps.map((app, index) => jump(index + firstAppPage, <><span className="toc-number">{String(index + 1).padStart(2, "0")}</span><span><strong>{app.title}</strong><small>{app.subtitle}</small></span><ChevronRight size={20}/></>, "toc-entry"))}{mobileGuide ? jump(firstAppPage + apps.length, <>À propos de cette création <ArrowRight size={18}/></>, "toc-extra") : business ? <>{jump(apps.length + 2, <>Licences pour les établissements <ArrowRight size={18}/></>, "toc-extra")}{jump(apps.length + 3, <>Personnalisation & création <ArrowRight size={18}/></>, "toc-extra")}{jump(apps.length + 4, <>Utilisation en établissement <ArrowRight size={18}/></>, "toc-extra")}</> : config.testEnabled ? jump(apps.length + 2, <>Phase de test · Demander un essai gratuit <ArrowRight size={18}/></>, "toc-extra") : null}</nav></div> });
  apps.forEach((app, index) => {
    const publicPrice = publicPrices[app.packageName];
    const explanation = <><p className="collection-tagline">{formatCatalogueSubtitle(app.subtitle)}</p><p>{app.description}</p><ul className="collection-features">{app.features.map(feature => <li key={feature}><Check size={16}/>{feature}</li>)}</ul><p className="collection-audience">{app.audience}</p>{business && publicPrice !== undefined ? <p className="collection-app-price">Prix public Google Play <strong>{publicPrice.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })} TTC</strong></p> : null}{!business && !mobileGuide && external(`https://play.google.com/store/apps/details?id=${app.packageName}`, "Découvrir sur Google Play", true)}{!mobileGuide && <small className="collection-fine">Application Android. Tarif public indicatif ; le tarif institutionnel et les modalités d’accès sont précisés dans le devis.</small>}</>;
    pages.push({ id: app.packageName.split(".").pop()!, title: app.title, theme: themes[index % themes.length], content: mobileGuide ? <div className="collection-mobile-app"><header><span className="collection-eyebrow">La collection · {String(index + 1).padStart(2, "0")}</span><h2>{app.title}</h2></header><AndroidDemoVideo packageName={app.packageName} title={app.title} mode="inline" /><div className="collection-app-copy">{explanation}</div></div> : <div className={`collection-app-spread${business ? " has-demo-video" : ""}`}><AppArt app={app}/><div className="collection-app-copy"><span className="collection-eyebrow">La collection · {String(index + 1).padStart(2, "0")}</span><h2>{app.title}</h2>{explanation}</div>{business ? <AndroidDemoVideo packageName={app.packageName} title={app.title} mode="inline" /> : null}</div> });
  });
  if (mobileGuide) {
    pages.push({ id: "a-propos", title: "À propos de cette création", content: <CreationAbout /> });
  } else if (business) {
    pages.push({ id: "licences", title: "Licences", content: <div className="collection-editorial"><span className="collection-eyebrow">Pour apprendre ensemble</span><h2>Une collection.<br/><em>À l’échelle de votre établissement.</em></h2><p className="collection-lead">Les prix publics de chaque application sont indiqués dans ce catalogue. Pour une même application et une même commande, une remise est appliquée dès 12 licences.</p><div className="collection-price-table"><table><thead><tr><th>Nombre de licences</th><th>Part du prix public</th><th>Remise</th></tr></thead><tbody>{config.tiers.map((tier, i) => <tr key={tier.minimum}><td>{config.tiers[i+1] ? `${tier.minimum}–${config.tiers[i+1].minimum-1}` : `${tier.minimum} et plus`}</td><td><strong>{tier.percent} %</strong></td><td>{100-tier.percent} %</td></tr>)}</tbody></table></div><p>{config.licenceTerms}</p><p className="collection-note">Le prix de référence est le prix public Google Play affiché pour l’application choisie. La remise est calculée pour une même application, dans une même commande. Le devis précise le prix final, le régime de TVA applicable, les utilisateurs concernés et les modalités d’accès.</p>{external("mailto:visdar@outlook.fr?subject=Licences%20Android%20pour%20mon%20%C3%A9tablissement", "Demander un devis", true)}</div> });
    pages.push({ id: "creation", title: "Personnalisation & création", content: <div className="collection-editorial"><span className="collection-eyebrow">Votre projet pédagogique</span><h2>Une application<br/><em>à votre image.</em></h2><p>Des périmètres adaptés aux besoins d’un établissement, d’un organisme de formation ou d’un partenaire. Les prix sont exprimés en euros hors taxes et confirmés après cadrage.</p><div className="collection-packages">{config.packages.map(pack => <section key={pack.name}><h3>{pack.name}</h3><p className="collection-package-price">à partir de<br/>{pack.price.toLocaleString("fr-FR")} € <small>HT</small></p><p>{pack.scope}</p></section>)}</div><p className="collection-note">Un devis définit le contenu, les livrables, les validations et les droits d’utilisation avant le démarrage. Les demandes impliquant serveur, comptes utilisateurs, paiement, IA ou iOS font l’objet d’un périmètre complémentaire.</p>{external("mailto:visdar@outlook.fr?subject=Projet%20d%E2%80%99application%20p%C3%A9dagogique", "Parlons de votre projet", true)}</div> });
    pages.push({ id: "engagements", title: "Utilisation en établissement", content: <div className="collection-editorial collection-terms"><span className="collection-eyebrow">Pour apprendre ensemble</span><h2>Composer un parcours<br/><em>adapté à votre public.</em></h2><p className="collection-lead">Sélectionnez une ou plusieurs applications selon le niveau, l’objectif pédagogique et l’effectif concerné.</p><div className="collection-columns"><section><h3>Trois usages possibles</h3><p><strong>En complément de cours</strong><br/>Pour réviser un point précis, préparer une séquence ou prolonger une notion après le cours.</p><p><strong>En autonomie guidée</strong><br/>Pour proposer un travail ciblé à un groupe, avec un objectif et un retour défini par l’enseignant.</p><p><strong>Dans un projet culturel</strong><br/>Pour ancrer une activité de civilisation, de géographie, d’arts visuels ou d’échanges internationaux.</p></section><section><h3>Un échange avant devis</h3><p>Indiquez le public concerné, l’objectif, les applications retenues et l’effectif. Visd AR prépare alors une proposition précisant le périmètre d’utilisation, les modalités d’accès et le montant hors taxes.</p><p>Une personne référente côté établissement permet d’assurer la cohérence pédagogique et le suivi de la mise en œuvre.</p></section></div><div className="collection-contact"><span><strong>Parlons de votre besoin pédagogique.</strong><small>Visd AR · visdar@outlook.fr</small></span>{external("mailto:visdar@outlook.fr?subject=Utilisation%20des%20applications%20Visd%20AR%20dans%20mon%20%C3%A9tablissement", "Demander une proposition", true)}</div></div> });
  } else if (config.testEnabled) pages.push({ id: "avant-premiere", title: "Phase de test", content: <div className="collection-editorial collection-test"><span className="collection-eyebrow">Phase de test avant lancement</span><h2>{config.testTitle}</h2><p className="collection-lead">{config.testText}</p><div className="collection-test-steps"><section><span>01</span><h3>Préparez votre compte</h3><p>Utilisez le même compte Google pour le groupe, l’inscription au test et Google Play.</p></section><section><span>02</span><h3>Demandez votre accès</h3><p>Suivez les étapes du formulaire. Un code personnel peut être attribué selon les disponibilités.</p></section><section><span>03</span><h3>Installez sans payer</h3><p>Utilisez votre code dans Google Play. Ne validez jamais un achat si un montant reste dû.</p></section></div><div className="collection-actions">{external("https://www.visdar.fr/tests-google-play", "Demander un essai gratuit", true)}{external("/guides/installation-gratuite-google-play.pdf", "Guide d’installation illustré")}</div><p className="collection-fine">Aucun achat requis pour participer. Code à usage unique, sous réserve d’éligibilité et de validité. L’inscription au groupe ne remplace pas l’inscription au test de l’application.</p></div> });

  useLayoutEffect(() => {
    // Always open on the cover. A stale fragment or restored scroll position must not hide the header.
    if (window.location.hash) window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    setReady(true);
  }, []);
  return <main ref={shell} className={`collection-shell${ready ? " collection-ready" : ""}`}>
    <CatalogueViewToggle />
    <header className="collection-header"><a href={mobileGuide ? "/collections/android-mobile" : business ? "/collections/android-professionnels" : "/collections/android"} className="collection-brand"><img src="/images/logo.png" width="42" height="42" alt=""/><span>Visd AR<small>Applications Android</small></span></a><span className="collection-edition">{mobileGuide ? "Guide mobile" : business ? "Catalogue professionnel" : "Catalogue découverte"}</span><a className="collection-index-link" href="#sommaire" onClick={event => { event.preventDefault(); go(mobileGuide ? 0 : 1); }}><BookOpen size={18}/>Sommaire</a></header>
    <nav className="collection-controls" aria-label="Navigation entre les pages"><button onClick={() => go(page-1)} disabled={page===0} aria-label="Page précédente"><ArrowLeft size={19}/><span>Précédente</span></button><span aria-live="polite" aria-atomic="true">{page+1} / {pages.length}<small>{pages[page]?.title}</small></span><button onClick={() => go(page+1)} disabled={page===pages.length-1} aria-label="Page suivante"><span>Suivante</span><ArrowRight size={19}/></button></nav>
    <div className={`collection-stage ${direction}`} ref={stage} tabIndex={0} aria-label="Catalogue à feuilleter" onKeyDown={event => { if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return; if (event.key === "ArrowRight" || event.key === "ArrowLeft") { event.preventDefault(); go(page + (event.key === "ArrowRight" ? 1 : -1)); } }} onTouchStart={event => { if ((event.target as HTMLElement).closest("a,button,input,textarea")) { touch.current=null; return; } const t=event.touches[0]; touch.current={x:t.clientX,y:t.clientY}; }} onTouchEnd={event => { if(!touch.current) return; const t=event.changedTouches[0],dx=t.clientX-touch.current.x,dy=t.clientY-touch.current.y; touch.current=null; if(Math.abs(dx)>70 && Math.abs(dx)>Math.abs(dy)*1.7) go(page+(dx<0?1:-1)); }}>
      {pages.map((entry, index) => <article key={entry.id} id={entry.id} className={`collection-page ${entry.theme || ""}${page === index ? " is-current" : ""}`} aria-label={`${index+1}. ${entry.title}`}><div className="collection-page-body">{entry.content}</div><div className="collection-page-footer">{business ? null : <span>Visd AR · Collection Android</span>}<span>{String(index+1).padStart(2,"0")}</span></div></article>)}
    </div>
    <p className="collection-reading-hint">Feuilletez avec les flèches, le clavier ou un glissement horizontal sur téléphone.</p>
    <footer className="collection-site-footer"><span>Catalogue accessible par lien · Non référencé dans la navigation du site.</span><a href="mailto:visdar@outlook.fr"><Mail size={13}/>Contacter Visd AR</a></footer>
  </main>;
}
