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
export const androidApps: CatalogueApp[] = [
  { packageName: "com.visdar.calendrier", title: "Calendrier lunisolaire chinois", chinese: "万年历", pinyin: "Wànniánlì", subtitle: "Une autre façon de regarder le temps.", description: "Faites dialoguer le calendrier solaire et le calendrier lunaire chinois. Un repère visuel pour découvrir les dates et se familiariser avec la manière chinoise de nommer le temps.", features: ["Lecture du calendrier chinois", "Repères en sinogrammes et en pinyin", "Une présentation visuelle à explorer au quotidien"], audience: "Pour les curieux de culture chinoise et les apprenants.", visible: true },
  { packageName: "com.visdar.heures", title: "Heures du monde", chinese: "全球时间", pinyin: "Quánqiú shíjiān", subtitle: "Le monde, à la même heure.", description: "Touchez un pays pour découvrir son heure et retrouver des repères utiles : capitale, monnaie et indicatifs téléphoniques. Le chinois, le pinyin et le français accompagnent ce petit voyage autour du monde.", features: ["Heures et fuseaux horaires", "Pays, capitales, monnaies et indicatifs téléphoniques", "Vocabulaire chinois accompagné de pinyin et de français"], audience: "Pour relier langues, géographie et vie quotidienne.", visible: true },
  { packageName: "com.visdar.manuscrits", title: "Reconnaissance de sinogrammes manuscrits", chinese: "汉字手写识别", pinyin: "Hànzì shǒuxiě shíbié", subtitle: "Dessinez. Retrouvez. Comprenez.", description: "Un caractère aperçu dans un livre ou sur un menu ? Dessinez-le et explorez les propositions. Les lectures, les définitions françaises et les animations de tracé prolongent la découverte.", features: ["Reconnaissance à partir de la forme dessinée", "Animation de l’ordre des traits", "Lectures, exemples et définitions françaises"], audience: "Pour chercher un caractère et enrichir son vocabulaire.", visible: true },
  { packageName: "com.visdar.couleurs", title: "Roue chromatique en chinois", chinese: "色盘", pinyin: "Sè pán", subtitle: "Apprendre le chinois, en couleurs.", description: "Associez les mots chinois aux couleurs sur une roue interactive. Passez des teintes essentielles aux palettes professionnelles et traditionnelles chinoises, avec le pinyin pour guider la lecture.", features: ["Trois univers de couleurs à explorer", "Association des mots et des teintes par glisser-déposer", "Nombre de questions réglable et résultat de la séance"], audience: "Pour une pause ludique, créative et pédagogique.", visible: true },
  { packageName: "com.visdar.famille", title: "La famille en chinois", chinese: "亲属关系", pinyin: "Qīnshǔ guānxì", subtitle: "Chaque lien de famille a son mot.", description: "Explorez les liens de parenté en chinois et en français grâce à un arbre familial. Le pinyin accompagne les caractères ; des quiz à quatre choix aident à réviser les termes rencontrés.", features: ["Arbre familial chinois–français", "Pinyin caractère par caractère", "Quiz de parenté à quatre propositions"], audience: "Pour comprendre les liens familiaux et les nommer avec précision.", visible: true },
];
export function defaultCatalogue(kind: CatalogueKind): CatalogueConfig {
  return {
    enabled: true,
    title: kind === "android" ? "Le chinois, au creux de la main." : "Des outils vivants pour transmettre.",
    introduction: kind === "android" ? "Cinq applications Android pour explorer, comprendre et apprendre à son rythme. Une collection imaginée par Visd AR, entre langues, culture et plaisir de découvrir." : "Applications Android, licences pour les établissements et créations pédagogiques sur mesure. Le savoir prend une forme claire, sensible et interactive.",
    apps: structuredClone(androidApps), testEnabled: true,
    testTitle: "Découvrez nos applications en avant-première.",
    testText: "Nos applications sont en phase de test avant lancement. Vous pouvez demander à les essayer gratuitement, dans la limite des codes disponibles et de leur période de validité. L’accès nécessite de rejoindre le groupe et de s’inscrire au test de chaque application avec le même compte Google.",
    pricingDraft: true,
    tiers: [{ minimum: 1, percent: 100 }, { minimum: 12, percent: 80 }, { minimum: 30, percent: 70 }, { minimum: 60, percent: 60 }, { minimum: 120, percent: 50 }],
    packages: [
      { name: "Adaptation pédagogique", price: 1800, scope: "Adaptation d’une application existante : identité de l’établissement, deux langues, contenus fournis et un parcours pédagogique. Une série de retours consolidés. Pas de nouvelle fonction majeure ni de cession du socle existant." },
      { name: "Création Essentielle", price: 3900, scope: "Une application Android originale, un module pédagogique (quiz, cartes ou exercice interactif), jusqu’à 6 écrans et deux langues. Deux séries de retours. Contenus fournis, fonctionnement local sans serveur." },
      { name: "Création Collection", price: 5900, scope: "Une application Android originale, jusqu’à 3 modules pédagogiques et 12 écrans, deux langues et progression enregistrée sur l’appareil. Deux séries de retours. Contenus fournis, fonctionnement local sans serveur." },
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
  const str = (x: unknown, max = 1800) => { if (typeof x !== "string" || !x.trim() || x.length > max) throw new Error("Texte manquant ou trop long."); return x.trim(); };
  const bool = (x: unknown) => { if (typeof x !== "boolean") throw new Error("Option invalide."); return x; };
  const list = (x: unknown, min: number, max: number) => { if (!Array.isArray(x) || x.length < min || x.length > max) throw new Error("Nombre d’éléments invalide."); return x; };
  const apps = list(v.apps, 1, 5).map((a): CatalogueApp => {
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
