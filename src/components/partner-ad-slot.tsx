import { ArrowUpRight, Handshake } from "lucide-react";
import { siteConfig } from "@/lib/site-config";

function getPartnerUrl() {
  try {
    const url = new URL(process.env.NEXT_PUBLIC_PARTNER_AD_URL || "");
    return url.protocol === "https:" && !url.username && !url.password ? url.href : null;
  } catch {
    return null;
  }
}

export function PartnerAdSlot() {
  const partnerUrl = getPartnerUrl();

  return (
    <aside className="panel glass ad-slot-panel partner-ad-panel" aria-labelledby="partner-ad-title">
      <div className="section-heading">
        <span className="section-heading-icon" aria-hidden="true"><Handshake size={17} /></span>
        <h2 className="section-heading-text" id="partner-ad-title">Ads</h2>
      </div>
      <div className="partner-ad-content">
        <strong>{partnerUrl ? process.env.NEXT_PUBLIC_PARTNER_AD_TITLE || "À découvrir" : "Votre marque ici"}</strong>
        <p className="tiny muted">
          {partnerUrl
            ? process.env.NEXT_PUBLIC_PARTNER_AD_DESCRIPTION || "Une sélection partenaire pour nos lecteurs."
            : "Livres, langues et découvertes : faites connaître votre univers à nos lecteurs."}
        </p>
        <a
          className="partner-ad-link"
          href={partnerUrl || `mailto:${siteConfig.adminInbox}?subject=Partenariat%20Visd%20AR`}
          target={partnerUrl ? "_blank" : undefined}
          rel={partnerUrl ? "sponsored noopener noreferrer" : undefined}
        >
          {partnerUrl ? "Découvrir" : "Proposer un partenariat"}<ArrowUpRight size={14} aria-hidden="true" />
        </a>
        {partnerUrl ? <span className="partner-ad-disclosure">Lien rémunéré : un achat peut nous rapporter une commission.</span> : null}
      </div>
    </aside>
  );
}
