export type HomeProduct = {
  id: string;
  title: string;
  href: string;
  image: string;
  price: number | null;
  kind: "tool" | "book";
  contain?: boolean;
  pages?: string[];
};

export type HomeExternalLink = {
  id: string;
  title: string;
  href: string;
  label: string;
  icon?: string;
};

export const homeLinkFallbacks: HomeExternalLink[] = [
  ["Jeux d’apprentissage du chinois", "https://cnplay.edgeone.app", "/home/assets/partner-1.webp"],
  ["Visd AR sur itch.io", "https://visdar.itch.io", "/home/assets/partner-2.webp"],
  ["Applications Android", "https://play.google.com/store/apps/developer?id=Visd+AR"],
  ["Albums illustrés sur Amazon Kindle", "https://www.amazon.fr/stores/Visd-AR/author/B0GX4QJQJW/allbooks"],
  ["TikTok", "https://www.tiktok.com/@visd_ar"],
  ["X", "https://x.com/visd_ar"],
  ["Instagram", "https://www.instagram.com/visd_ar"],
  ["YouTube", "https://www.youtube.com/@VisdARfr"],
  ["LinkedIn", "https://www.linkedin.com/in/visd-ar"],
  ["Malt", "https://www.malt.fr/profile/visdar"],
  ["RedBubble", "https://www.redbubble.com/fr/people/visdar"],
  ["Spreadshirt", "https://visd-ar.myspreadshop.fr"],
].map(([title, href, icon]) => ({ id: href, title, href, label: title, icon }));

export function homeImage(path: string | null | undefined) {
  if (path && (/^\/(?!\/)/.test(path) || /^https:\/\//i.test(path))) return path;
  return "/images/logo.png";
}
