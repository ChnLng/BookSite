"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Gamepad2 } from "lucide-react";
import { loadDisplayResources, type DisplayResource } from "@/lib/resources-service";

export function CoinLudiqueSection() {
  const [resources, setResources] = useState<DisplayResource[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadResources = async () => {
      const nextResources = await loadDisplayResources();

      if (cancelled) {
        return;
      }

      setResources(nextResources);
      setLoading(false);
    };

    void loadResources();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="panel glass home-section-panel" id="coin-ludique-outils">
      <div className="coin-ludique-header">
        <div>
          <div className="badge">
            <Gamepad2 size={16} />
            Coin ludique & Outils
          </div>
          <h2 className="section-title" style={{ marginTop: 18 }}>
            Coin ludique & Outils
          </h2>
          <p className="section-caption">
            Des mini-jeux et outils numeriques presents comme les livres: visuels doux, cartes claires, prix lisible et acces direct a leur fiche detail.
          </p>
        </div>
      </div>

      <div className="marquee-shell resource-marquee-shell">
        <div className="marquee-inner resource-marquee-inner">
          {[0, 1].map((trackIndex) => (
            <div
              key={`resource-track-${trackIndex}`}
              className="marquee-track resource-marquee-track"
              aria-hidden={trackIndex === 1}
            >
              {resources.map((resource, index) => (
                <Link
                  className="carousel-card carousel-card-link resource-carousel-card"
                  href={`/outils/${resource.slug || resource.id}`}
                  key={`${resource.id}-${trackIndex}-${index}`}
                  tabIndex={trackIndex === 1 ? -1 : 0}
                >
                  <div className="carousel-image resource-carousel-image">
                    <Image
                      src={resource.coverImageUrl}
                      alt={resource.titleFr}
                      fill
                      sizes="260px"
                      className="carousel-cover-image"
                    />
                  </div>
                  <div className="carousel-caption resource-carousel-caption">
                    <strong>{resource.titleFr}</strong>
                    <span>{resource.priceEur.toFixed(2)} EUR</span>
                  </div>
                </Link>
              ))}
            </div>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="tiny" style={{ marginTop: 14 }}>
          Chargement des jeux et outils...
        </p>
      ) : null}
    </section>
  );
}
