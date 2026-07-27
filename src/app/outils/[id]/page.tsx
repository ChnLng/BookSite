"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Download, ExternalLink, QrCode } from "lucide-react";
import { TopNav } from "@/components/top-nav";
import { useAuth } from "@/components/auth-provider";
import { loadDisplayResources, resolveDisplayResourceById, type DisplayResource } from "@/lib/resources-service";

type AccessState = {
  hasAccess: boolean;
  requiresLogin: boolean;
  isAdmin?: boolean;
};

export default function ResourceDetailPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const { user, session } = useAuth();
  const [resource, setResource] = useState<DisplayResource | null>(null);
  const [relatedResources, setRelatedResources] = useState<DisplayResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [accessState, setAccessState] = useState<AccessState>({
    hasAccess: false,
    requiresLogin: true,
  });
  const [accessLoading, setAccessLoading] = useState(true);
  const [actionBusy, setActionBusy] = useState(false);
  const [actionMessage, setActionMessage] = useState("");

  const resourceId = Array.isArray(params?.id) ? params.id[0] : params?.id || "";
  const purchaseSucceeded = searchParams.get("success") === "1";
  const purchaseCanceled = searchParams.get("cancel") === "1";

  const authorizedFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    if (!session?.access_token) {
      throw new Error("Connexion requise.");
    }

    const headers = new Headers(init?.headers);
    headers.set("Authorization", `Bearer ${session.access_token}`);

    return fetch(input, {
      ...init,
      headers,
    });
  };

  useEffect(() => {
    if (!resourceId) {
      setLoading(false);
      setResource(null);
      setRelatedResources([]);
      return;
    }

    let cancelled = false;

    const loadPage = async () => {
      setLoading(true);
      const [resolvedResource, allResources] = await Promise.all([
        resolveDisplayResourceById(resourceId),
        loadDisplayResources(),
      ]);

      if (cancelled) {
        return;
      }

      setResource(resolvedResource);
      setRelatedResources(
        allResources.filter((item) => item.id !== resolvedResource?.id).slice(0, 3),
      );
      setLoading(false);
    };

    void loadPage();

    return () => {
      cancelled = true;
    };
  }, [resourceId]);

  const refreshAccess = async () => {
    if (!resourceId || !session?.access_token) {
      setAccessState({
        hasAccess: false,
        requiresLogin: true,
      });
      setAccessLoading(false);
      return;
    }

    setAccessLoading(true);
    const response = await authorizedFetch(`/api/resources/${resourceId}/access`, {
      cache: "no-store",
    });
    const result = (await response.json().catch(() => null)) as
      | { ok?: boolean; hasAccess?: boolean; requiresLogin?: boolean; isAdmin?: boolean }
      | null;

    setAccessState({
      hasAccess: Boolean(result?.hasAccess),
      requiresLogin: Boolean(result?.requiresLogin),
      isAdmin: Boolean(result?.isAdmin),
    });
    setAccessLoading(false);
  };

  useEffect(() => {
    void refreshAccess();
  }, [resourceId, session?.access_token]);

  useEffect(() => {
    if (purchaseSucceeded) {
      setActionMessage("Paiement confirme. Vos telechargements sont maintenant debloques.");
      void refreshAccess();
    } else if (purchaseCanceled) {
      setActionMessage("Paiement annule. Vous pouvez reprendre quand vous voulez.");
    }
  }, [purchaseCanceled, purchaseSucceeded]);

  const priceLabel = useMemo(() => `${(resource?.priceEur || 0).toFixed(2)} EUR`, [resource?.priceEur]);

  const handleCheckout = async () => {
    if (!resource) {
      return;
    }

    if (!user || !session?.access_token) {
      setActionMessage("Connectez-vous d'abord pour debloquer cette ressource.");
      return;
    }

    setActionBusy(true);
    setActionMessage("");

    try {
      if (resource.priceEur <= 0) {
        const response = await authorizedFetch(`/api/resources/${resource.slug || resource.id}/claim`, {
          method: "POST",
        });
        const result = (await response.json().catch(() => null)) as { ok?: boolean; message?: string } | null;

        if (!response.ok || !result?.ok) {
          setActionMessage(result?.message || "Impossible d'activer ce telechargement gratuit.");
          return;
        }

        setActionMessage(result.message || "La ressource est debloquee.");
        await refreshAccess();
        return;
      }

      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          kind: "resource",
          id: resource.slug || resource.id,
          userId: user.id,
          userEmail: user.email || "",
        }),
      });

      const result = (await response.json().catch(() => null)) as { ok?: boolean; message?: string; url?: string } | null;

      if (!response.ok || !result?.ok || !result.url) {
        setActionMessage(result?.message || "Impossible d'ouvrir le paiement.");
        return;
      }

      window.location.href = result.url;
    } finally {
      setActionBusy(false);
    }
  };

  const handleDownload = async (fileId: string) => {
    if (!resource || !session?.access_token) {
      setActionMessage("Connectez-vous pour telecharger.");
      return;
    }

    setActionBusy(true);
    setActionMessage("");

    try {
      const response = await authorizedFetch(`/api/resources/${resource.slug || resource.id}/download?file=${encodeURIComponent(fileId)}`);
      const result = (await response.json().catch(() => null)) as { ok?: boolean; message?: string; url?: string } | null;

      if (!response.ok || !result?.ok || !result.url) {
        setActionMessage(result?.message || "Impossible de preparer le telechargement.");
        return;
      }

      window.open(result.url, "_blank", "noopener,noreferrer");
    } finally {
      setActionBusy(false);
    }
  };

  if (loading) {
    return (
      <main className="page-shell">
        <TopNav title="Visd AR" subtitle="Hub bilingue 🇨🇳 Chinois - Français 🇫🇷" />
        <section className="panel glass" style={{ marginTop: 22 }}>
          <p className="muted">Chargement de la fiche ressource...</p>
        </section>
      </main>
    );
  }

  if (!resource) {
    return (
      <main className="page-shell">
        <TopNav title="Visd AR" subtitle="Hub bilingue 🇨🇳 Chinois - Français 🇫🇷" />
        <section className="panel glass" style={{ marginTop: 22 }}>
          <h1 className="section-title">Ressource introuvable</h1>
          <p className="section-caption">Cette fiche n'est plus disponible.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="page-shell">
      <TopNav title="Visd AR" subtitle="Hub bilingue 🇨🇳 Chinois - Français 🇫🇷" />

      <section className="book-detail-layout resource-detail-layout" style={{ marginTop: 22 }}>
        <aside className="resource-detail-sidebar">
          <article className="panel glass resource-cover-panel">
            <div className="resource-detail-cover">
              <Image
                src={resource.coverImageUrl}
                alt={resource.titleFr}
                fill
                sizes="(max-width: 767px) 100vw, 380px"
                className="resource-detail-cover-image"
              />
            </div>

            <div className="resource-qr-box">
              {resource.qrImageUrl ? (
                <Image
                  src={resource.qrImageUrl}
                  alt={`${resource.titleFr} QR`}
                  width={120}
                  height={120}
                  className="home-resource-qr-image"
                />
              ) : (
                <div className="coin-ludique-qr-placeholder">
                  <QrCode size={28} />
                  <span className="tiny">QR a venir</span>
                </div>
              )}
            </div>
          </article>
        </aside>

        <section className="panel glass resource-detail-main">
          <span className="badge">Coin ludique & Outils</span>
          <h1 className="book-detail-title" style={{ marginTop: 18 }}>{resource.titleFr}</h1>
          <div className="resource-meta-row">
            <span className="resource-price-tag">{priceLabel}</span>
            <span className="tiny">
              {resource.priceEur <= 0 ? "Acces gratuit apres validation" : "Paiement securise puis telechargement"}
            </span>
          </div>

          <p className="section-caption" style={{ marginTop: 18 }}>{resource.summaryFr}</p>

          <div className="actions-row resource-detail-actions">
            <button
              className="cta-button"
              type="button"
              disabled={actionBusy || accessState.hasAccess}
              onClick={() => void handleCheckout()}
            >
              {accessState.hasAccess
                ? "Acces deja debloque"
                : actionBusy
                  ? "Ouverture..."
                  : resource.priceEur <= 0
                    ? "Obtenir gratuitement"
                    : "Acheter cet outil"}
            </button>
            {resource.externalUrl ? (
              <a className="cta-button secondary" href={resource.externalUrl} target="_blank" rel="noreferrer">
                <ExternalLink size={16} />
                Voir aussi le lien externe
              </a>
            ) : null}
          </div>

          {actionMessage ? <p className="tiny" style={{ marginTop: 14 }}>{actionMessage}</p> : null}
          {accessLoading ? <p className="tiny" style={{ marginTop: 6 }}>Verification de vos droits...</p> : null}

          <div className="resource-download-panel">
            <div className="split-line">
              <strong>Telechargements disponibles</strong>
              <span>{resource.downloads.length}</span>
            </div>

            <div className="coin-ludique-downloads" style={{ marginTop: 14 }}>
              {resource.downloads.map((download) => (
                <button
                  key={download.id}
                  className={accessState.hasAccess ? "coin-ludique-download-button" : "coin-ludique-download-button disabled"}
                  type="button"
                  disabled={!accessState.hasAccess || actionBusy}
                  onClick={() => void handleDownload(download.id)}
                >
                  <span className="coin-ludique-platform">{download.platform}</span>
                  <span>{download.labelFr}</span>
                  <Download size={15} />
                </button>
              ))}
            </div>

            {!accessState.hasAccess ? (
              <p className="tiny" style={{ marginTop: 12 }}>
                Connectez-vous puis validez le paiement pour debloquer ces fichiers.
              </p>
            ) : null}
          </div>

          {relatedResources.length > 0 ? (
            <div className="resource-related-strip">
              <div className="split-line">
                <strong>Autres outils a decouvrir</strong>
                <span>{relatedResources.length}</span>
              </div>
              <div className="resource-related-grid">
                {relatedResources.map((item) => (
                  <Link className="resource-related-card" key={item.id} href={`/outils/${item.slug || item.id}`}>
                    <div className="resource-related-image">
                      <Image
                        src={item.coverImageUrl}
                        alt={item.titleFr}
                        fill
                        sizes="180px"
                        className="carousel-cover-image"
                      />
                    </div>
                    <strong>{item.titleFr}</strong>
                    <span>{item.priceEur.toFixed(2)} EUR</span>
                  </Link>
                ))}
              </div>
            </div>
          ) : null}
        </section>
      </section>
    </main>
  );
}
