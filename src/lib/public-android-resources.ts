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

// These three Play listings are still in closed testing. Their pages are
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
    id: "trace-des-sinogrammes-android",
    slug: "trace-des-sinogrammes-android",
    packageName: "com.visdar.stroke",
    titleFr: "Tracé des sinogrammes 汉字笔顺 (Android)",
    summaryFr: "Découvrez le tracé des sinogrammes et leur projection holographique, pour observer l’écriture chinoise autrement.",
    coverImageUrl: "/images/android/visdar-app-icon.webp",
    galleryImages: ["/images/android/stroke-1.webp", "/images/android/stroke-2.webp", "/images/android/stroke-3.webp"],
    externalUrl: "https://play.google.com/store/apps/details?id=com.visdar.stroke",
    priceEur: 2.19,
    sortOrder: 14,
    createdAt: "2026-10-30T00:00:00.000Z",
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
