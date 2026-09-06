export type PlayTestingApp = {
  packageName: string;
  title: string;
  priceEur: number;
  resourceRefs: readonly string[];
};

// Keep the catalogue prices intact. Remove an app here when its public launch
// is ready; only these explicitly selected apps use the free testing flow.
export const playTestingApps: readonly PlayTestingApp[] = [
  { packageName: "com.visdar.calendrier", title: "Calendrier lunisolaire chinois", priceEur: 0.99, resourceRefs: ["d19bd070-c1ec-40fa-bb6f-e25dddcd0e92", "calendrier-lunisolaire-chinois-wannianli-android"] },
  { packageName: "com.visdar.dialectes", title: "Carte des dialectes en Chine", priceEur: 0.99, resourceRefs: ["1bc12d70-12cf-4f55-a541-b40c60007410", "carte-des-dialectes-en-chine-android"] },
  { packageName: "com.visdar.classificateur", title: "Classificateurs chinois", priceEur: 2.09, resourceRefs: ["bf964d2f-f0c4-4608-97d4-196469b53566", "classificateurs-chinois-liangci-android"] },
  { packageName: "com.visdar.cles", title: "Clés des sinogrammes", priceEur: 2.09, resourceRefs: ["4f9a733d-d886-4220-885a-481d35deaaf4", "cles-des-sinogrammes-android"] },
  { packageName: "com.visdar.temps", title: "Exprimer le temps en chinois", priceEur: 2.09, resourceRefs: ["8c237dca-1a31-4e4c-94d4-401d2edad04d", "exprimer-le-temps-android"] },
  { packageName: "com.visdar.heures", title: "Heures du monde en chinois", priceEur: 2.09, resourceRefs: ["1ff0db3f-cb45-4278-98ca-9e192294e81e", "heures-du-monde-android"] },
  { packageName: "com.visdar.expressions", title: "Locutions idiomatiques Chengyu", priceEur: 4.99, resourceRefs: ["3e86e9cd-e927-4265-b8ad-159bd998d64a", "expressions-idiomatiques-android"] },
  { packageName: "com.visdar.chiffres", title: "Nombres en chinois", priceEur: 2.09, resourceRefs: ["2d14fe16-d245-4c3e-a10d-c87233ef1100", "nombres-en-chinois-android"] },
  { packageName: "com.visdar.manuscrits", title: "Reconnaissance de sinogrammes", priceEur: 4.99, resourceRefs: ["45c5f379-faed-4987-91cb-515bd49475c2", "reconnaissance-de-sinogrammes-manuscrits-android"] },
  { packageName: "com.visdar.couleurs", title: "Roue chromatique en chinois", priceEur: 2.09, resourceRefs: ["a96d2feb-6bd6-4ce0-a61d-118d0e0c65ac", "roue-chromatique-se-pan-android-en-chinois"] },
  { packageName: "com.visdar.contextes", title: "Dictionnaire contextuel français-chinois", priceEur: 0.19, resourceRefs: ["3e85be85-5d94-43c5-a20c-215212acdf83", "dico-contextuel-du-chinois-android"] },
  { packageName: "com.visdar.famille", title: "Liens de parenté", priceEur: 2.09, resourceRefs: ["c50ce5e7-5693-4082-903f-fa8930fb28a4", "titres-de-parente-android"] },
];

export const playTestingGroupUrl = "https://groups.google.com/g/visdar";
export const playTestingGroupEmail = "Visdar@googlegroups.com";

export function getPlayTestingApp(resourceRef: string | undefined | null) {
  if (!resourceRef) return null;
  const ref = resourceRef.replace(/^resource-/, "");
  return playTestingApps.find((app) => app.packageName === ref || app.resourceRefs.includes(ref)) || null;
}

export function playTestingApplicationUrl(app: PlayTestingApp) {
  return `/tests-google-play?app=${encodeURIComponent(app.packageName)}`;
}

export function playTestingOptInUrl(app: PlayTestingApp) {
  return `https://play.google.com/apps/testing/${app.packageName}`;
}

export function playTestingStoreUrl(app: PlayTestingApp) {
  return `https://play.google.com/store/apps/details?id=${app.packageName}`;
}
