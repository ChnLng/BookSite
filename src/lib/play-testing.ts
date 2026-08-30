export type PlayTestingApp = {
  packageName: string;
  title: string;
  resourceRefs: readonly string[];
};

// Keep the catalogue prices intact. Remove an app here when its public launch
// is ready; only these explicitly selected apps use the free testing flow.
export const playTestingApps: readonly PlayTestingApp[] = [
  { packageName: "com.visdar.calendrier", title: "Calendrier chinois", resourceRefs: ["d19bd070-c1ec-40fa-bb6f-e25dddcd0e92", "calendrier-lunisolaire-chinois-wannianli-android"] },
  { packageName: "com.visdar.heures", title: "Heures du monde", resourceRefs: [] },
  { packageName: "com.visdar.manuscrits", title: "Reconnaissance manuscrite", resourceRefs: ["45c5f379-faed-4987-91cb-515bd49475c2", "reconnaissance-de-sinogrammes-manuscrits-android"] },
  { packageName: "com.visdar.couleurs", title: "Roue chromatique", resourceRefs: ["a96d2feb-6bd6-4ce0-a61d-118d0e0c65ac", "roue-chromatique-se-pan-android-en-chinois"] },
  { packageName: "com.visdar.famille", title: "Liens de parenté", resourceRefs: [] },
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
