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
      frenchTitle: "Pourquoi ces applications ?",
      chineseTitle: "让课堂知识得到系统延伸",
      french: [
        "En classe, le temps est précieux et ne permet pas toujours d’explorer toute la richesse d’une notion. Pourtant, les questions des étudiants et leur envie d’apprendre se poursuivent bien au-delà du cours.",
        "Ces applications ont été conçues pour leur permettre d’aller plus loin, à leur rythme. Faciles et rapides à consulter, elles les aident à revoir les notions abordées en classe, à établir des liens entre elles et à construire progressivement des connaissances plus solides et mieux structurées.",
      ],
      chinese: [
        "课堂时间十分宝贵，许多知识难以在有限的课时内充分展开，而学生的思考与求知欲并不会随着下课而停止。",
        "这些应用旨在帮助学生按照自己的节奏进一步探索。它们清晰、便捷、易于查阅，既能帮助学生复习课堂所学，也能引导他们建立知识之间的联系，逐步形成更加扎实、系统的语言知识体系。",
      ],
    },
    {
      frenchTitle: "Une approche pensée pour les francophones",
      chineseTitle: "从法语出发，搭建直接的语言桥梁",
      french: [
        "De nombreux outils d’apprentissage du chinois utilisent aujourd’hui l’anglais comme langue intermédiaire. Cela peut constituer un obstacle supplémentaire pour les apprenants francophones.",
        "Ces applications proposent donc une approche différente : partir directement du français pour expliquer le chinois avec précision et clarté. Cette démarche facilite la compréhension, limite les détours par une troisième langue et répond plus naturellement aux habitudes linguistiques du public francophone.",
      ],
      chinese: [
        "目前，许多汉语学习工具仍以英语作为中介语言，这可能给法语区学习者增加额外的理解障碍。",
        "因此，这些应用选择从法语出发，以清晰、准确的方式解释汉语，建立法汉之间直接的语言联系。这不仅减少了第三种语言带来的转换过程，也更加贴合法语区学习者的语言习惯和实际需求。",
      ],
    },
    {
      frenchTitle: "Un complément au cours, au service de l’autonomie",
      chineseTitle: "辅助课堂，支持自主学习",
      french: [
        "Ces applications n’ont pas vocation à remplacer le cours ou le travail de l’enseignant. Elles constituent un support complémentaire que les étudiants peuvent consulter lorsqu’ils souhaitent vérifier une notion, approfondir un point ou organiser leurs révisions.",
        "Chaque contenu est sélectionné, vérifié et présenté avec soin afin de proposer une ressource à la fois accessible et rigoureuse. L’objectif est simple : aider les étudiants à gagner en autonomie tout en conservant des repères fiables dans leur apprentissage.",
      ],
      chinese: [
        "这些应用并非为了替代课堂或教师的教学，而是作为补充资源，帮助学生在需要时查证知识、深入理解某个要点或系统整理复习内容。",
        "每一项内容都经过认真筛选、核查与编排，力求兼顾易用性与严谨性。其目标很简单：在为学生提供可靠学习依据的同时，帮助他们逐步提升自主学习能力。",
      ],
    },
    {
      frenchTitle: "Un projet né de l’expérience pédagogique",
      chineseTitle: "源于一线教学的长期积累",
      french: [
        "J’enseigne le chinois depuis 2018 dans des écoles d’ingénieurs, des écoles de commerce et des universités. Ces outils sont nés de mon expérience en classe, de mes échanges avec les étudiants et de l’observation de leurs besoins réels.",
        "D’abord développées sous forme de ressources en ligne en 2025, ces solutions sont aujourd’hui disponibles sous forme d’applications Android, afin d’accompagner les étudiants de manière plus simple et plus régulière dans leur apprentissage.",
      ],
      chinese: [
        "自2018年起，我一直在工程师院校、商学院和大学从事汉语教学。这些工具源于真实的课堂实践，也来自我与学生的长期交流，以及对他们实际学习需求的持续观察。",
        "项目于2025年首先以在线资源的形式推出，如今已发展为Android应用，以更便捷、更持续的方式陪伴学生学习。",
      ],
    },
    {
      frenchTitle: "Découvrir les applications et envisager un partenariat",
      chineseTitle: "欢迎试用与院校合作",
      french: [
        "Les équipes pédagogiques peuvent bénéficier d’une présentation ainsi que d’un accès d’essai gratuit aux applications.",
        "Pour les établissements qui souhaiteraient ensuite les proposer à leurs étudiants, plusieurs formes de collaboration peuvent être envisagées : acquisition de licences institutionnelles, déploiement au sein d’une formation, adaptation aux programmes enseignés ou création de contenus pédagogiques sur mesure.",
        "Je serais heureuse d’échanger avec les établissements intéressés afin d’identifier la formule la mieux adaptée à leurs objectifs et aux besoins de leurs étudiants.",
      ],
      chinese: [
        "教学团队可申请应用介绍及免费试用，以便实际了解其内容与使用方式。",
        "对于希望进一步向学生提供这些应用的院校，可以探讨多种合作形式，包括院校授权采购、在具体课程或培养项目中部署、根据教学大纲调整内容，以及定制开发教学资源。",
        "期待与有合作意向的院校进一步交流，共同确定最符合教学目标和学生需求的合作方案。",
      ],
    },
  ];
  return <div className="collection-about"><div className="collection-about-sections">{sections.map((section) => <div className="collection-about-pair" key={section.frenchTitle}><section lang="fr"><h3>{section.frenchTitle}</h3>{section.french.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</section><section lang="zh-CN"><h3>{section.chineseTitle}</h3>{section.chinese.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</section></div>)}</div></div>;
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
  pages.push({ id: "sommaire", title: "Sommaire", content: <div className="collection-toc"><span className="collection-eyebrow">{mobileGuide ? "Les douze applications · 十二款应用" : "Votre parcours"}</span><h2>{apps.length === 5 ? "Cinq" : apps.length} portes d’entrée.<br/><em>Une même curiosité.</em></h2>{!mobileGuide ? <p>Choisissez une application ou laissez-vous guider, page après page.</p> : null}<nav aria-label="Sommaire du catalogue">{apps.map((app, index) => jump(index + firstAppPage, <><span className="toc-number">{String(index + 1).padStart(2, "0")}</span><span><strong>{app.title}</strong><small>{app.subtitle}</small></span><ChevronRight size={20}/></>, "toc-entry"))}{mobileGuide ? jump(firstAppPage + apps.length, <>Pourquoi ces applications ? <ArrowRight size={18}/></>, "toc-extra toc-why") : business ? <>{jump(apps.length + 2, <>Licences pour les établissements <ArrowRight size={18}/></>, "toc-extra")}{jump(apps.length + 3, <>Personnalisation & création <ArrowRight size={18}/></>, "toc-extra")}{jump(apps.length + 4, <>Utilisation en établissement <ArrowRight size={18}/></>, "toc-extra")}</> : config.testEnabled ? jump(apps.length + 2, <>Phase de test · Demander un essai gratuit <ArrowRight size={18}/></>, "toc-extra") : null}</nav></div> });
  apps.forEach((app, index) => {
    const publicPrice = publicPrices[app.packageName];
    const explanation = <><p className="collection-tagline">{formatCatalogueSubtitle(app.subtitle)}</p><p>{app.description}</p><ul className="collection-features">{app.features.map(feature => <li key={feature}><Check size={16}/>{feature}</li>)}</ul><p className="collection-audience">{app.audience}</p>{business && publicPrice !== undefined ? <p className="collection-app-price">Prix public Google Play <strong>{publicPrice.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })} TTC</strong></p> : null}{!business && !mobileGuide && external(`https://play.google.com/store/apps/details?id=${app.packageName}`, "Découvrir sur Google Play", true)}{!mobileGuide && <small className="collection-fine">Application Android. Tarif public indicatif ; le tarif institutionnel et les modalités d’accès sont précisés dans le devis.</small>}</>;
    pages.push({ id: app.packageName.split(".").pop()!, title: app.title, theme: themes[index % themes.length], content: mobileGuide ? <div className="collection-mobile-app"><header><span className="collection-eyebrow">La collection · {String(index + 1).padStart(2, "0")}</span><h2>{app.title}</h2></header><AndroidDemoVideo packageName={app.packageName} title={app.title} mode="inline" /><div className="collection-app-copy">{explanation}</div></div> : <div className={`collection-app-spread${business ? " has-demo-video" : ""}`}><AppArt app={app}/><div className="collection-app-copy"><span className="collection-eyebrow">La collection · {String(index + 1).padStart(2, "0")}</span><h2>{app.title}</h2>{explanation}</div>{business ? <AndroidDemoVideo packageName={app.packageName} title={app.title} mode="inline" /> : null}</div> });
  });
  if (mobileGuide) {
    pages.push({ id: "a-propos", title: "Pourquoi ces applications ?", content: <CreationAbout /> });
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
    {!mobileGuide ? <CatalogueViewToggle /> : null}
    <header className="collection-header"><a href={mobileGuide ? "/collections/android-mobile" : business ? "/collections/android-professionnels" : "/collections/android"} className="collection-brand"><img src="/images/logo.png" width="42" height="42" alt=""/><span>Visd AR<small>Applications Android</small></span></a><span className="collection-edition">{mobileGuide ? "Guide mobile" : business ? "Catalogue professionnel" : "Catalogue découverte"}</span><a className="collection-index-link" href="#sommaire" onClick={event => { event.preventDefault(); go(mobileGuide ? 0 : 1); }}><BookOpen size={18}/>Sommaire</a></header>
    <nav className="collection-controls" aria-label="Navigation entre les pages"><button onClick={() => go(page-1)} disabled={page===0} aria-label="Page précédente"><ArrowLeft size={19}/><span>Précédente</span></button><span aria-live="polite" aria-atomic="true">{page+1} / {pages.length}<small>{pages[page]?.title}</small></span><button onClick={() => go(page+1)} disabled={page===pages.length-1} aria-label="Page suivante"><span>Suivante</span><ArrowRight size={19}/></button></nav>
    <div className={`collection-stage ${direction}`} ref={stage} tabIndex={0} aria-label="Catalogue à feuilleter" onKeyDown={event => { if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return; if (event.key === "ArrowRight" || event.key === "ArrowLeft") { event.preventDefault(); go(page + (event.key === "ArrowRight" ? 1 : -1)); } }} onTouchStart={event => { if ((event.target as HTMLElement).closest("a,button,input,textarea")) { touch.current=null; return; } const t=event.touches[0]; touch.current={x:t.clientX,y:t.clientY}; }} onTouchEnd={event => { if(!touch.current) return; const t=event.changedTouches[0],dx=t.clientX-touch.current.x,dy=t.clientY-touch.current.y; touch.current=null; if(Math.abs(dx)>70 && Math.abs(dx)>Math.abs(dy)*1.7) go(page+(dx<0?1:-1)); }}>
      {pages.map((entry, index) => <article key={entry.id} id={entry.id} className={`collection-page ${entry.theme || ""}${page === index ? " is-current" : ""}`} aria-label={`${index+1}. ${entry.title}`}><div className="collection-page-body">{entry.content}</div><div className="collection-page-footer">{business ? null : <span>Visd AR · Collection Android</span>}<span>{String(index+1).padStart(2,"0")}</span></div></article>)}
    </div>
    <p className="collection-reading-hint">Feuilletez avec les flèches, le clavier ou un glissement horizontal sur téléphone.</p>
    <footer className="collection-site-footer"><span>Catalogue accessible par lien · Non référencé dans la navigation du site.</span><a href="mailto:visdar@outlook.fr"><Mail size={13}/>Contacter Visd AR</a></footer>
  </main>;
}
