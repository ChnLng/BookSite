import type { PartnerLink } from "@/lib/home-sections";

// Available immediately; the matching migration makes these editable in admin.
export const externalLinkDefaults: PartnerLink[] = [
  { id: "external-google-play", titleFr: "Applications Android", iconUrl: "", targetUrl: "https://play.google.com/store/apps/developer?id=Visd+AR", tooltipText: "Applications Android · Google Play", sortOrder: 20, visible: true },
  { id: "external-kindle", titleFr: "Albums illustrés sur Amazon Kindle", iconUrl: "", targetUrl: "https://www.amazon.fr/stores/Visd-AR/author/B0GX4QJQJW/allbooks", tooltipText: "Albums illustrés sur Amazon Kindle", sortOrder: 30, visible: true },
  { id: "external-tiktok", titleFr: "TikTok", iconUrl: "", targetUrl: "https://www.tiktok.com/@visd_ar", tooltipText: "TikTok · Visd AR", sortOrder: 40, visible: true },
  { id: "external-x", titleFr: "X", iconUrl: "", targetUrl: "https://x.com/visd_ar", tooltipText: "X · Visd AR", sortOrder: 50, visible: true },
  { id: "external-instagram", titleFr: "Instagram", iconUrl: "", targetUrl: "https://www.instagram.com/visd_ar", tooltipText: "Instagram · Visd AR", sortOrder: 60, visible: true },
  { id: "external-youtube", titleFr: "YouTube", iconUrl: "", targetUrl: "https://www.youtube.com/@VisdARfr", tooltipText: "YouTube · Visd AR", sortOrder: 70, visible: true },
  { id: "external-linkedin", titleFr: "LinkedIn", iconUrl: "", targetUrl: "https://www.linkedin.com/in/visd-ar", tooltipText: "LinkedIn · Visd AR", sortOrder: 80, visible: true },
  { id: "external-malt", titleFr: "Malt", iconUrl: "", targetUrl: "https://www.malt.fr/profile/visdar", tooltipText: "Malt · Visd AR", sortOrder: 90, visible: true },
  { id: "external-redbubble", titleFr: "RedBubble", iconUrl: "", targetUrl: "https://www.redbubble.com/fr/people/visdar", tooltipText: "RedBubble · Visd AR", sortOrder: 100, visible: true },
  { id: "external-spreadshirt", titleFr: "Spreadshirt", iconUrl: "", targetUrl: "https://visd-ar.myspreadshop.fr", tooltipText: "Spreadshirt · Visd AR", sortOrder: 110, visible: true },
];

export function withExternalLinkDefaults(databaseLinks: PartnerLink[]): PartnerLink[] {
  const existingUrls = new Set(databaseLinks.map((link) => link.targetUrl));
  return [...databaseLinks, ...externalLinkDefaults.filter((link) => !existingUrls.has(link.targetUrl))]
    .sort((a, b) => a.sortOrder - b.sortOrder);
}
