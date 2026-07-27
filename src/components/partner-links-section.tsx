"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { Link2 } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

type PartnerLink = {
  id: string;
  titleFr: string;
  iconUrl: string;
  targetUrl: string;
  sortOrder: number;
};

const fallbackLinks: PartnerLink[] = [
  {
    id: "visdar-home",
    titleFr: "Visd AR",
    iconUrl: "/images/logo.png",
    targetUrl: "https://visdar.fr",
    sortOrder: 10,
  },
];

const tooltipText = "Ce lien s'ouvrira dans une nouvelle fenetre vers un site tiers.";

export function PartnerLinksSection() {
  const [links, setLinks] = useState<PartnerLink[]>(fallbackLinks);

  useEffect(() => {
    let cancelled = false;

    const loadLinks = async () => {
      const supabase = getSupabaseBrowserClient();

      if (!supabase) {
        return;
      }

      const { data } = await supabase
        .from("partner_links")
        .select("id, title_fr, icon_url, target_url, sort_order")
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
          sortOrder: Number(item.sort_order || 0),
        })),
      );
    };

    void loadLinks();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="panel glass home-section-panel" id="liens-partenaires">
      <div className="coin-ludique-header">
        <div>
          <div className="badge">
            <Link2 size={16} />
            Liens partenaires
          </div>
          <h2 className="section-title" style={{ marginTop: 18 }}>
            Liens partenaires
          </h2>
        </div>
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
              {tooltipText}
            </span>
          </a>
        ))}
      </div>
    </section>
  );
}
