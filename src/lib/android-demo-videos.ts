export type AndroidDemoVideo = {
  packageName: string;
  src: string;
};

// The package names are the stable identifiers used by Google Play and by the
// catalogue configuration. Keeping the mapping here means a renamed French
// title cannot point a demonstration at the wrong application.
export const androidDemoVideos: AndroidDemoVideo[] = [
  { packageName: "com.visdar.temps", src: "/videos/android/temps.mp4" },
  { packageName: "com.visdar.expressions", src: "/videos/android/idiome.mp4" },
  { packageName: "com.visdar.calendrier", src: "/videos/android/calendrier.mp4" },
  { packageName: "com.visdar.manuscrits", src: "/videos/android/reconnaissance.mp4" },
  { packageName: "com.visdar.chiffres", src: "/videos/android/nombre.mp4" },
  { packageName: "com.visdar.dialectes", src: "/videos/android/dialecte.mp4" },
  { packageName: "com.visdar.contextes", src: "/videos/android/contexte.mp4" },
  { packageName: "com.visdar.heures", src: "/videos/android/heure.mp4" },
  { packageName: "com.visdar.famille", src: "/videos/android/parente.mp4" },
  { packageName: "com.visdar.cles", src: "/videos/android/cle.mp4" },
  { packageName: "com.visdar.couleurs", src: "/videos/android/couleur.mp4" },
  { packageName: "com.visdar.classificateur", src: "/videos/android/classificateur.mp4" },
];

export function getAndroidDemoVideo(packageName: string | null | undefined) {
  if (!packageName) return null;
  return androidDemoVideos.find((video) => video.packageName === packageName) || null;
}
