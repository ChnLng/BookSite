export type InfoLink = {
  id: string;
  label: string;
  title: string;
  body: string;
  href?: string;
  ctaLabel?: string;
};

export const infoLinks: InfoLink[] = [
  {
    id: "guide-lecture",
    label: "Guide de lecture",
    title: "Du manuel aux vraies histoires ✨",
    body: "Un petit pont tout doux vers la lecture chinoise : les sinogrammes entraînent l’œil, le pinyin guide la prononciation et la traduction française éclaire le sens. Avec nos ebooks bilingues chinois-français, les débutants avancent page après page, sans passer leur temps dans le dictionnaire. Prêt à laisser le mandarin raconter ses premières histoires ?",
    href: "/blog/lecture-chinois-pinyin-traduction",
    ctaLabel: "Lire le guide complet",
  },
  {
    id: "livraison",
    label: "Livraison digitale",
    title: "Accès instantané et sécurisé",
    body: "Dès la confirmation de votre paiement, votre livre numérique est accessible immédiatement depuis votre espace client via un lien de téléchargement sécurisé et temporaire, conformément aux pratiques de protection des contenus numériques.",
  },
  {
    id: "remboursement",
    label: "Remboursements et litiges",
    title: "Garantie et droit de rétractation",
    body: "Conformément à l'article L221-28 du Code de la consommation, le droit de rétractation ne s'exécute pas pour les contenus numériques fournis sur un support immatériel. En cas de litige ou de rétrofacturation, l'accès au téléchargement est suspendu afin de préserver les droits d'auteur.",
  },
  {
    id: "usage",
    label: "Usage personnel",
    title: "Usage strictement personnel",
    body: "Nos ebooks sont destinés à un usage personnel et privé. Toute reproduction, partage, revente ou diffusion publique, même partielle, est interdite par le Code de la propriété intellectuelle.",
  },
  {
    id: "confidentialite",
    label: "Confidentialité",
    title: "Protection des données",
    body: "Vos informations servent à gérer votre compte, vos commandes, vos messages et vos demandes de test. Les prestataires techniques et de paiement peuvent traiter les données nécessaires à ces services. Les publicités Adsterra sont désactivées tant que vous ne les avez pas acceptées dans le bloc Ads. Vous pouvez refuser ou retirer cet accord dans ce même bloc ; le site reste accessible. Le choix publicitaire est conservé pendant 180 jours dans votre navigateur. Cette option ne règle pas les autres services du site.",
  },
];
