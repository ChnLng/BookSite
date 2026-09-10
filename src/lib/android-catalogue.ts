export type CatalogueKind = "android" | "android-professionnels";
export type CatalogueApp = {
  packageName: string; title: string; chinese: string; pinyin: string;
  subtitle: string; description: string; features: string[]; audience: string; visible: boolean;
};
export type CatalogueConfig = {
  enabled: boolean; title: string; introduction: string; apps: CatalogueApp[];
  testEnabled: boolean; testTitle: string; testText: string;
  pricingDraft: boolean; tiers: { minimum: number; percent: number }[];
  packages: { name: string; price: number; scope: string }[];
  licenceTerms: string; delivery: string[]; publishing: string[]; terms: string[];
};
export const catalogueKinds: CatalogueKind[] = ["android", "android-professionnels"];
export function isCatalogueKind(value: unknown): value is CatalogueKind { return catalogueKinds.includes(value as CatalogueKind); }
const normalizeCatalogueCopy = (value: string) => {
  const edits: [string, string][] = [
    ["Chaque application peut soutenir un cours", "Chaque application peut servir à un cours"],
    ["Douze outils Android conçus pour des apprenants francophones : chinois, pinyin et explications en français.", "Douze applications Android conçues pour maîtriser la langue chinoise, avec pinyin et explications en français."],
    ["Douze outils Android conçus pour maîtriser la langue chinoise avec pinyin et explications en français.", "Douze applications Android conçues pour maîtriser la langue chinoise, avec pinyin et explications en français."],
    ["Choisir le mot de mesure juste", "Choisir le classificateur (mesure word) juste"],
    ["Comprendre les caractères", "Comprendre les sinogrammes"],
    ["leur situation d’emploi", "leur contexte"],
    ["les quatre caractères", "les quatre sinogrammes"],
    ["l’histoire et l’emploi.", "l’histoire et l’emploi du mot."],
    ["Décomposition caractère par caractère", "Décomposition sinogramme par sinogramme"],
    ["situer une action sans conjugaison", "situer une action"],
    ["monnaies et indicatifs à", "monnaies et indicatifs téléphoniques à"],
    ["Vocabulaire trilingue chinois–pinyin–français", "Vocabulaire sinogramme–pinyin–français"],
    ["Dessiner un caractère", "Dessiner un sinogramme"],
    ["Titres de parenté", "Termes de parenté"],
    ["jusqu’à 6 écrans et", "jusqu’à 6 écrans dans l’application et"],
    ["et 12 écrans,", "et 12 écrans dans l’application,"],
  ];
  return edits.reduce((current, [from, to]) => current.split(from).join(to), value);
};
export const androidApps: CatalogueApp[] = [
  { packageName: "com.visdar.calendrier", title: "Calendrier lunisolaire chinois", chinese: "万年历", pinyin: "Wànniánlì", subtitle: "Lire les repères du temps dans les deux calendriers.", description: "Un outil de découverte du calendrier traditionnel chinois qui met en regard les cycles solaire et lunaire, les tiges célestes, les branches terrestres, les cinq éléments et le zodiaque.", features: ["Conversion entre calendrier grégorien et calendrier lunisolaire", "Dates exprimées en sinogrammes, pinyin et français", "Repères culturels : Ganzhi, Wuxing et zodiaque"], audience: "Civilisation chinoise, projets culturels et apprenants curieux.", visible: true },
  { packageName: "com.visdar.dialectes", title: "Carte des dialectes en Chine", chinese: "中国方言地图", pinyin: "Zhōngguó fāngyán dìtú", subtitle: "Explorer la diversité linguistique de la Chine.", description: "Une carte interactive pour découvrir les dialectes et langues régionales des 34 régions chinoises, avec des repères pensés pour les francophones.", features: ["Carte des dialectes et langues régionales", "Régions, cantonais, hakka, min et langues minoritaires", "Lecture en chinois standard, pinyin et annotations françaises"], audience: "Cours de civilisation, géographie, sociolinguistique et culture chinoise.", visible: true },
  { packageName: "com.visdar.classificateur", title: "Classificateurs chinois", chinese: "量词", pinyin: "Liàngcí", subtitle: "Choisir le classificateur (mesure word) juste dans une phrase.", description: "Une ressource structurée pour comprendre les classificateurs nominaux et verbaux et voir leur place dans la phrase chinoise.", features: ["19 catégories de classificateurs", "Plus de 143 exemples avec pinyin et traduction française", "Formules grammaticales visuelles et exemple aléatoire"], audience: "Apprenants A1–B1 et cours de grammaire chinoise.", visible: true },
  { packageName: "com.visdar.cles", title: "Clés des sinogrammes", chinese: "汉字部首", pinyin: "Hànzì bùshǒu", subtitle: "Comprendre les sinogrammes à partir de leur structure.", description: "Un outil pour explorer les clés des sinogrammes, leur sens, leur prononciation et leur rôle dans la composition des sinogrammes.", features: ["201 clés classées par nombre de traits", "Fiches avec sens, prononciation et composition", "Exercices interactifs et favoris"], audience: "Débutants, cours d’écriture et initiation aux sinogrammes.", visible: true },
  { packageName: "com.visdar.contextes", title: "Dico contextuel du chinois", chinese: "语境词典", pinyin: "Yǔjìng cídiǎn", subtitle: "Choisir le mot chinois qui correspond vraiment au contexte.", description: "Un dictionnaire français–chinois qui distingue les traductions proches par leur contexte afin d’aider l’apprenant à exprimer une nuance exacte.", features: ["Traductions expliquées par contexte", "Pinyin avec tons et mises en situation en français", "Mot recommandé chaque jour, consultation hors ligne"], audience: "Apprenants A2+ qui veulent gagner en précision lexicale.", visible: true },
  { packageName: "com.visdar.expressions", title: "Expressions idiomatiques", chinese: "成语", pinyin: "Chéngyǔ", subtitle: "Comprendre les quatre sinogrammes, l’histoire et l’emploi du mot.", description: "Une collection de fiches sur les chengyu pour dépasser la traduction mot à mot et relier l’expression à son histoire, sa métaphore et son usage.", features: ["Décomposition sinogramme par sinogramme", "Contexte culturel et historique", "Fiches par niveau et thème, expression du jour"], audience: "Apprenants B1+, civilisation et enrichissement du vocabulaire.", visible: true },
  { packageName: "com.visdar.temps", title: "Exprimer le temps en chinois", chinese: "表述时间", pinyin: "Biǎoshù shíjiān", subtitle: "Clarifier l’aspect, la durée et la fréquence.", description: "Une application de grammaire consacrée aux marqueurs temporels chinois et aux adverbes qui permettent de situer une action.", features: ["Différences entre 了, 过, 着 et 在", "32 adverbes classés par situation et nuance", "75 exercices : phrases à recomposer, vrai/faux et mot juste"], audience: "Apprenants A2–B2 et cours de grammaire structurée.", visible: true },
  { packageName: "com.visdar.heures", title: "Heures du monde", chinese: "全球时间", pinyin: "Quánqiú shíjiān", subtitle: "Relier le chinois, la géographie et les échanges internationaux.", description: "Un outil de repérage mondial qui associe heures, décalages horaires, pays, capitales, monnaies et indicatifs téléphoniques à du vocabulaire chinois, pinyin et français.", features: ["Recherche par pays, capitale, indicatif ou monnaie", "Calcul du décalage horaire et repères par continent", "Vocabulaire sinogramme–pinyin–français"], audience: "Cours de langue appliquée, commerce international et projets interdisciplinaires.", visible: true },
  { packageName: "com.visdar.chiffres", title: "Nombres en chinois", chinese: "数字", pinyin: "Shùzì", subtitle: "Passer du prix quotidien aux grands nombres et aux mathématiques.", description: "Une application pour lire, prononcer et manipuler les nombres chinois, des usages courants aux expressions mathématiques plus avancées.", features: ["Atelier des grands nombres avec 万 et 亿", "Entiers, décimaux, fractions, pourcentages et opérations", "Pinyin et traduction française, jusqu’aux notions académiques"], audience: "Apprenants A1+ et cours liant chinois, mathématiques et usages concrets.", visible: true },
  { packageName: "com.visdar.manuscrits", title: "Reconnaissance de sinogrammes manuscrits", chinese: "汉字手写识别", pinyin: "Hànzì shǒuxiě shíbié", subtitle: "Dessiner un sinogramme, le retrouver et comprendre son tracé.", description: "Un outil de recherche et de révision : l’apprenant dessine un sinogramme, obtient des propositions, puis consulte les lectures, définitions et tracés.", features: ["Reconnaissance manuscrite hors ligne", "Ordre des traits étape par étape", "Pinyin, définitions françaises et exemples d’emploi"], audience: "Tous niveaux, autonomie entre les cours et apprentissage de l’écriture.", visible: true },
  { packageName: "com.visdar.couleurs", title: "Roue chromatique en chinois", chinese: "色盘", pinyin: "Sè pán", subtitle: "Mémoriser les couleurs par une activité visuelle.", description: "Un jeu d’association qui fait découvrir le vocabulaire des couleurs, des teintes essentielles aux palettes professionnelles et traditionnelles chinoises.", features: ["Trois roues : essentiel, professionnel et couleurs traditionnelles", "Association par glisser-déposer", "Pinyin complet et interface chinois–français"], audience: "Débutants, ateliers ludiques, arts visuels et activités de révision.", visible: true },
  { packageName: "com.visdar.famille", title: "Termes de parenté", chinese: "亲属称呼", pinyin: "Qīnshǔ chēnghu", subtitle: "Comprendre la précision des liens familiaux en chinois.", description: "Une exploration guidée des termes de parenté chinois, qui distinguent les côtés paternel et maternel ainsi que les générations et les liens par alliance.", features: ["Arbre généalogique interactif", "Filtre par côté paternel, maternel ou lignée directe", "Quiz à quatre choix, pinyin et explications de mémoire"], audience: "Débutants, civilisation chinoise et vocabulaire de la vie quotidienne.", visible: true },
];
const consumerAppPackages = new Set(["com.visdar.calendrier", "com.visdar.heures", "com.visdar.manuscrits", "com.visdar.couleurs", "com.visdar.famille"]);
export function defaultCatalogue(kind: CatalogueKind): CatalogueConfig {
  return {
    enabled: true,
    title: kind === "android" ? "Le chinois, au creux de la main." : "Douze applications pour apprendre et transmettre le chinois.",
    introduction: kind === "android" ? "Cinq applications Android pour explorer, comprendre et apprendre à son rythme. Une collection imaginée par Visd AR, entre langues, culture et plaisir de découvrir." : "Douze applications Android conçues pour maîtriser la langue chinoise, avec pinyin et explications en français. Chaque application peut servir à un cours, une activité autonome ou un projet culturel.",
    apps: structuredClone(kind === "android" ? androidApps.filter(app => consumerAppPackages.has(app.packageName)) : androidApps), testEnabled: true,
    testTitle: "Découvrez nos applications en avant-première.",
    testText: "Nos applications sont en phase de test avant lancement. Vous pouvez demander à les essayer gratuitement, dans la limite des codes disponibles et de leur période de validité. L’accès nécessite de rejoindre le groupe et de s’inscrire au test de chaque application avec le même compte Google.",
    pricingDraft: true,
    tiers: [{ minimum: 1, percent: 100 }, { minimum: 12, percent: 80 }, { minimum: 30, percent: 70 }, { minimum: 60, percent: 60 }, { minimum: 120, percent: 50 }],
    packages: [
      { name: "Adaptation pédagogique", price: 1800, scope: "Adaptation d’une application existante : identité de l’établissement, deux langues, contenus fournis et un parcours pédagogique. Une série de retours consolidés. Pas de nouvelle fonction majeure ni de cession du socle existant." },
      { name: "Création Essentielle", price: 3900, scope: "Une application Android originale, un module pédagogique (quiz, cartes ou exercice interactif), jusqu’à 6 écrans dans l’application et deux langues. Deux séries de retours. Contenus fournis, fonctionnement local sans serveur." },
      { name: "Création Collection", price: 5900, scope: "Une application Android originale, jusqu’à 3 modules pédagogiques et 12 écrans dans l’application, deux langues et progression enregistrée sur l’appareil. Deux séries de retours. Contenus fournis, fonctionnement local sans serveur." },
    ],
    licenceTerms: "Une licence correspond à un utilisateur nommé pour une application, sans partage de compte ni revente. Le palier s’applique à toutes les licences de la même application commandées ensemble par un établissement. La base est le prix unitaire public converti hors taxes, confirmé dans le devis ; remises non cumulables. Droit d’usage de la version livrée sans abonnement, sans garantie de compatibilité perpétuelle. L’installation et le mode de distribution sont validés avant facturation ; aucune livraison payante ne repose sur les codes promotionnels gratuits Google Play.",
    delivery: [
      "Objectif : deux mois à compter du devis signé, de l’acompte et de la réception des contenus, accès et validations nécessaires. Le calendrier contractuel est confirmé après cadrage.",
      "Semaines 1–2 : périmètre, maquette et validation. Semaines 3–4 : développement et remise d’une version à essayer. Semaines 5–6 : utilisation en situation réelle. Semaines 7–8 : corrections, recette, version finale et soumission à Google Play.",
      "L’établissement mobilise au moins 12 membres disposant d’un compte Google et d’un appareil Android compatible, inscrits sans interruption pendant 14 jours et utilisant réellement l’application. Un référent rassemble les retours ; l’établissement organise les autorisations nécessaires, notamment pour les mineurs.",
      "Les deux mois portent sur la prestation et la soumission. La date de mise en ligne dépend de Google : délais d’examen, accès à la production ou demandes complémentaires peuvent prolonger le calendrier. Tout retard de contenus, de validation ou de participation décale les jalons d’autant, après information écrite.",
    ],
    publishing: [
      "Coédition : publication depuis le compte développeur Visd AR, avec le nom et le logo de l’établissement selon accord. Visd AR reste l’éditeur sur Google Play ; la présentation de la marque, la durée de distribution et les éventuels revenus sont fixés au devis.",
      "Publication par le commanditaire : remise du fichier Android App Bundle, des éléments de fiche et d’un guide de publication. Le client fournit et administre son compte Google Play, sa vérification et ses frais de plateforme. Les sources spécifiques sont incluses dans les offres Création ; les bibliothèques et composants antérieurs conservent leurs licences.",
      "Une des deux modalités de publication et 30 jours de correction des anomalies reproductibles relevant du périmètre accepté sont inclus. Hébergement, API, intelligence artificielle, comptes élèves, paiement, iOS, maintenance ultérieure et nouvelles fonctionnalités sont exclus, sauf devis complémentaire.",
    ],
    terms: [
      "Commande professionnelle uniquement, sur devis accepté précisant périmètre, livrables, critères de recette, droits d’utilisation, calendrier et régime de TVA. Paiement proposé : 30 % au démarrage, 40 % à la remise de la version intermédiaire, 30 % à la recette finale. Les observations de recette sont transmises par écrit sous 7 jours ouvrés ; le silence seul ne vaut pas acceptation.",
      "En cas de retard imputable à Visd AR, notification écrite et délai de remédiation de 15 jours calendaires. Si le manquement persiste, résiliation de la partie non exécutée et remboursement des sommes correspondant aux prestations non livrées ou inutilisables, sous 14 jours. Les livrables acceptés et utilisables de manière autonome restent dus ; si aucun livrable n’est utilisable, remboursement des sommes versées pour le projet.",
      "Aucune indemnité forfaitaire supplémentaire n’est promise. Sous réserve des règles impératives, les dommages indirects sont exclus et la responsabilité contractuelle pour dommages directs est plafonnée au montant total du contrat concerné. Ces limites ne s’appliquent notamment ni au dol, ni à la faute lourde, ni aux dommages corporels, et ne peuvent vider une obligation essentielle de sa substance.",
      "Aucune garantie de résultat scolaire, de revenus, de nombre de téléchargements ou d’acceptation par Google. Le client garantit les droits sur les contenus et marques fournis. Les responsabilités relatives aux données personnelles, à la sécurité et aux droits de propriété intellectuelle sont précisées au contrat. Ces indications ne remplacent pas les conditions contractuelles à faire vérifier avant signature.",
    ],
  };
}

export function validateCatalogue(value: unknown): CatalogueConfig {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Configuration invalide.");
  const v = value as Record<string, unknown>;
  const str = (x: unknown, max = 1800) => { if (typeof x !== "string" || !x.trim() || x.length > max) throw new Error("Texte manquant ou trop long."); return normalizeCatalogueCopy(x.trim()); };
  const bool = (x: unknown) => { if (typeof x !== "boolean") throw new Error("Option invalide."); return x; };
  const list = (x: unknown, min: number, max: number) => { if (!Array.isArray(x) || x.length < min || x.length > max) throw new Error("Nombre d’éléments invalide."); return x; };
  const apps = list(v.apps, 1, 12).map((a): CatalogueApp => {
    if (!a || !androidApps.some(app => app.packageName === a.packageName)) throw new Error("Application inconnue.");
    return { packageName: a.packageName, title: str(a.title, 100), chinese: str(a.chinese, 50), pinyin: str(a.pinyin, 80), subtitle: str(a.subtitle, 140), description: str(a.description, 700), features: list(a.features, 1, 4).map(x => str(x, 160)), audience: str(a.audience, 180), visible: bool(a.visible) };
  });
  if (new Set(apps.map(a => a.packageName)).size !== apps.length || !apps.some(a => a.visible)) throw new Error("Au moins une application visible, sans doublon, est requise.");
  const tiers = list(v.tiers, 1, 8).map(t => {
    if (!t || !Number.isInteger(t.minimum) || t.minimum < 1 || t.minimum > 100000 || !Number.isInteger(t.percent) || t.percent < 1 || t.percent > 100) throw new Error("Palier invalide.");
    return { minimum: t.minimum as number, percent: t.percent as number };
  });
  if (tiers[0].minimum !== 1 || tiers.some((t, i) => i > 0 && (t.minimum <= tiers[i-1].minimum || t.percent > tiers[i-1].percent))) throw new Error("Les seuils doivent augmenter à partir de 1 et les pourcentages diminuer.");
  const packages = list(v.packages, 1, 4).map(p => {
    if (!p || !Number.isInteger(p.price) || p.price < 1 || p.price > 1000000) throw new Error("Prix invalide.");
    return { name: str(p.name, 80), price: p.price as number, scope: str(p.scope, 700) };
  });
  return { enabled: bool(v.enabled), title: str(v.title, 140), introduction: str(v.introduction, 600), apps, testEnabled: bool(v.testEnabled), testTitle: str(v.testTitle, 140), testText: str(v.testText, 900), pricingDraft: bool(v.pricingDraft), tiers, packages, licenceTerms: str(v.licenceTerms), delivery: list(v.delivery, 1, 5).map(x => str(x)), publishing: list(v.publishing, 1, 4).map(x => str(x)), terms: list(v.terms, 1, 5).map(x => str(x)) };
}
