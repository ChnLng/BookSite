// A Play-only product can be published without a Supabase download entitlement.
// Keep this record until it is entered in the admin catalogue; loaders dedupe by slug.
export const chineseForTwoResource = {
  id: "chinois-en-binome-android",
  slug: "chinois-en-binome-android",
  titleFr: "Chinois en binôme — 7 jeux à deux (Android)",
  summaryFr: "Sept jeux de chinois à deux, face à face sur un même écran : associez pinyin et sinogrammes, improvisez des dialogues, repérez l’intrus, lancez les dés et relevez des défis de vocabulaire ensemble.",
  coverImageUrl: "/images/android/chinois-en-binome-icon.png",
  galleryImages: [
    "/images/android/chinois-en-binome-1.jpg",
    "/images/android/chinois-en-binome-2.jpg",
    "/images/android/chinois-en-binome-3.jpg",
  ],
  externalUrl: "https://play.google.com/store/apps/details?id=com.visdar.binome",
  sortOrder: 12,
  createdAt: "2026-10-30T00:00:00.000Z",
} as const;

// Public Google Play apps awaiting catalogue records. Database entries take
// precedence when present; these records keep product pages and links usable.
export const newlyPublishedAndroidResources = [
  {
    id: "exprimer-le-temps-android",
    slug: "exprimer-le-temps-android",
    titleFr: "Exprimer le temps en chinois 表述时间 (Android)",
    summaryFr: "Comprenez l’aspect, la durée et la fréquence en chinois avec 32 adverbes et 75 exercices de grammaire.",
    coverImageUrl: "/images/android/visdar-app-icon.webp",
    galleryImages: [],
    externalUrl: "https://play.google.com/store/apps/details?id=com.visdar.temps",
    sortOrder: 16,
    createdAt: "2026-11-23T00:00:00.000Z",
  },
  {
    id: "expressions-idiomatiques-android",
    slug: "expressions-idiomatiques-android",
    titleFr: "Expressions idiomatiques chinoises 成语 (Android)",
    summaryFr: "Découvrez les chengyu à travers leur sens, leur histoire et leur emploi, sinogramme par sinogramme.",
    coverImageUrl: "/images/android/visdar-app-icon.webp",
    galleryImages: [],
    externalUrl: "https://play.google.com/store/apps/details?id=com.visdar.expressions",
    sortOrder: 17,
    createdAt: "2026-11-23T00:00:00.000Z",
  },
  {
    id: "dico-contextuel-du-chinois-android",
    slug: "dico-contextuel-du-chinois-android",
    titleFr: "Dico contextuel du chinois 语境词典 (Android)",
    summaryFr: "Choisissez la traduction chinoise adaptée au contexte grâce aux explications en français, au pinyin et aux mises en situation.",
    coverImageUrl: "/images/android/visdar-app-icon.webp",
    galleryImages: [],
    externalUrl: "https://play.google.com/store/apps/details?id=com.visdar.contextes",
    sortOrder: 18,
    createdAt: "2026-11-23T00:00:00.000Z",
  },
  {
    id: "titres-de-parente-android",
    slug: "titres-de-parente-android",
    titleFr: "Termes de parenté chinois 亲属称呼 (Android)",
    summaryFr: "Explorez les liens familiaux en chinois avec un arbre interactif, des filtres, le pinyin et un quiz.",
    coverImageUrl: "/images/android/visdar-app-icon.webp",
    galleryImages: [],
    externalUrl: "https://play.google.com/store/apps/details?id=com.visdar.famille",
    sortOrder: 19,
    createdAt: "2026-11-23T00:00:00.000Z",
  },
  {
    id: "trace-des-sinogrammes-android",
    slug: "trace-des-sinogrammes-android",
    titleFr: "Tracé des sinogrammes 汉字笔顺 (Android)",
    summaryFr: "Découvrez l’ordre des traits et le tracé des sinogrammes, avec une projection holographique pour observer l’écriture chinoise autrement.",
    coverImageUrl: "/images/android/visdar-app-icon.webp",
    galleryImages: ["/images/android/stroke-1.webp", "/images/android/stroke-2.webp", "/images/android/stroke-3.webp"],
    externalUrl: "https://play.google.com/store/apps/details?id=com.visdar.stroke",
    sortOrder: 14,
    createdAt: "2026-11-23T00:00:00.000Z",
  },
] as const;

// These Play listings are still in closed testing. Their pages are
// shareable, while Google Play controls who may install them.
export const previewAndroidResources = [
  {
    id: "verbes-chinois-en-mime-android",
    slug: "verbes-chinois-en-mime-android",
    packageName: "com.visdar.verbes",
    titleFr: "Verbes chinois en mime (Android)",
    summaryFr: "Des poupées numériques miment les verbes chinois. Découvrez les gestes avec le pinyin, l’audio et la réalité augmentée.",
    coverImageUrl: "/images/android/visdar-app-icon.webp",
    galleryImages: ["/images/android/verbes-1.webp", "/images/android/verbes-2.webp"],
    externalUrl: "https://play.google.com/store/apps/details?id=com.visdar.verbes",
    priceEur: 4.29,
    sortOrder: 13,
    createdAt: "2026-11-06T00:00:00.000Z",
  },
  {
    id: "hub-bilingue-chinois-francais-android",
    slug: "hub-bilingue-chinois-francais-android",
    packageName: "com.visdar.hub",
    titleFr: "Hub bilingue chinois-français (Android)",
    summaryFr: "Un centre bilingue chinois-français réunissant douze modules, le pinyin et un espace de traduction. Essai de 14 jours, puis achats intégrés selon les modules choisis.",
    coverImageUrl: "/images/android/visdar-app-icon.webp",
    galleryImages: ["/images/android/hub-1.webp", "/images/android/hub-2.webp"],
    externalUrl: "https://play.google.com/store/apps/details?id=com.visdar.hub",
    priceEur: null,
    pricingNote: "Essai de 14 jours · modules en achat intégré",
    sortOrder: 15,
    createdAt: "2026-10-17T00:00:00.000Z",
  },
] as const;

export function getPreviewAndroidApp(ref: string | null | undefined) {
  return previewAndroidResources.find((app) => ref === app.id || ref === app.slug || ref === app.packageName) || null;
}
