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
