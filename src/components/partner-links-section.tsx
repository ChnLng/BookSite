"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { Link2 } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

export type PartnerLinkItem = {
  id: string;
  titleFr: string;
  iconUrl: string;
  targetUrl: string;
  tooltipText: string;
  sortOrder: number;
};

const fallbackLinks: PartnerLinkItem[] = [
  {
    id: "visdar-home",
    titleFr: "Visd AR",
    iconUrl: "/images/logo.png",
    targetUrl: "https://visdar.fr",
    tooltipText: "Visd AR",
    sortOrder: 10,
  },
];

type PartnerLinksSectionProps = {
  links?: PartnerLinkItem[];
  sectionId?: string;
  title?: string;
};

export function PartnerLinksSection({
  links: providedLinks,
  sectionId = "liens-partenaires",
  title = "Liens partenaires",
}: PartnerLinksSectionProps) {
  const [links, setLinks] = useState<PartnerLinkItem[]>(providedLinks ?? fallbackLinks);

  useEffect(() => {
    if (providedLinks !== undefined) {
      setLinks(providedLinks);
      return;
    }

    let cancelled = false;

    const loadLinks = async () => {
      const supabase = getSupabaseBrowserClient();

      if (!supabase) {
        return;
      }

      const { data } = await supabase
        .from("partner_links")
        .select("id, title_fr, icon_url, target_url, tooltip_text, sort_order")
        .eq("visible", true)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });

      if (cancelled || !data || data.length === 0) {
        return;
      }

      setLinks(
        data.map((item) => ({
          id: item.id as string,
          titleFr: (item.title_fr as string | null) || "Partenaire",
          iconUrl: (item.icon_url as string | null) || "/images/logo.png",
          targetUrl: (item.target_url as string | null) || "https://visdar.fr",
          tooltipText: (item.tooltip_text as string | null) || (item.title_fr as string | null) || "Partenaire",
          sortOrder: Number(item.sort_order || 0),
        })),
      );
    };

    void loadLinks();

    return () => {
      cancelled = true;
    };
  }, [providedLinks]);

  return (
    <section className="panel glass home-section-panel" id={sectionId}>
      <div className="section-heading">
        <span className="section-heading-icon" aria-hidden="true">
          <Link2 size={17} />
        </span>
        <h2 className="section-heading-text">{title}</h2>
      </div>

      <div className="partner-links-grid">
        {links.map((link) => (
          <a
            key={link.id}
            className="partner-link-button"
            href={link.targetUrl}
            target="_blank"
            rel="noreferrer"
            aria-label={link.titleFr}
          >
            <Image
              src={link.iconUrl}
              alt={link.titleFr}
              width={56}
              height={56}
              className="partner-link-icon"
            />
            <span className="partner-link-tooltip" role="tooltip">
              {link.tooltipText || link.titleFr}
            </span>
          </a>
        ))}
      </div>
    </section>
  );
}
