"use client";

import { Facebook, Linkedin, Mail, MessageCircle, Send } from "lucide-react";

const socialLinks = [
  { label: "Telegram", href: "https://t.me/share/url", icon: Send, platform: "telegram" },
  { label: "WhatsApp", href: "https://wa.me/", icon: MessageCircle, platform: "whatsapp" },
  { label: "LinkedIn", href: "https://www.linkedin.com/sharing/share-offsite/", icon: Linkedin, platform: "linkedin" },
  { label: "Facebook", href: "https://www.facebook.com/sharer/sharer.php", icon: Facebook, platform: "facebook" },
  { label: "Email", href: "mailto:", icon: Mail, platform: "email" },
] as const;

const shareTexts = [
  "J'ai trouve un superbe site de livres illustres bilingues chinois-francais, je vous le partage.",
  "Je viens de decouvrir un joli site d'albums bilingues chinois-francais, partageons-le avec tout le monde.",
  "Belle decouverte du jour : un site de livres bilingues chinois-francais a partager autour de soi.",
];

type SharePlatform = (typeof socialLinks)[number]["platform"];

export function SiteShareStrip() {
  const handleShare = (platform: SharePlatform, href: string) => {
    if (typeof window === "undefined") {
      return;
    }

    const randomText = shareTexts[Math.floor(Math.random() * shareTexts.length)];
    const shareUrl = window.location.origin;
    const encodedUrl = encodeURIComponent(shareUrl);
    const encodedText = encodeURIComponent(randomText);

    const sharePayload =
      platform === "facebook"
        ? `${href}?u=${encodedUrl}&quote=${encodedText}`
        : platform === "linkedin"
          ? `${href}?url=${encodedUrl}`
          : platform === "telegram"
            ? `${href}?url=${encodedUrl}&text=${encodedText}`
            : platform === "whatsapp"
              ? `${href}?text=${encodeURIComponent(`${randomText} ${shareUrl}`)}`
              : `mailto:?subject=${encodeURIComponent("Decouverte Visd AR")}&body=${encodeURIComponent(`${randomText}\n\n${shareUrl}`)}`;

    if (platform === "email") {
      window.location.href = sharePayload;
      return;
    }

    window.open(sharePayload, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="share-strip">
      <span className="share-strip-label">Partagez cette decouverte</span>
      <div className="share-strip-actions">
        {socialLinks.map(({ label, href, icon: Icon, platform }) => (
          <button
            key={label}
            className="share-icon-button"
            type="button"
            aria-label={`Partager sur ${label}`}
            title={`Partager sur ${label}`}
            onClick={() => void handleShare(platform, href)}
          >
            <Icon size={16} />
          </button>
        ))}
      </div>
    </div>
  );
}
