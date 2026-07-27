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

type AppliedPromoState = {
  code: string;
  discountPercent: number;
  discountedPrice: number;
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
  const [promoCode, setPromoCode] = useState("");
  const [promoBusy, setPromoBusy] = useState(false);
  const [promoMessage, setPromoMessage] = useState("");
  const [promoMessageKind, setPromoMessageKind] = useState<"idle" | "success" | "error">("idle");
  const [appliedPromo, setAppliedPromo] = useState<AppliedPromoState | null>(null);
  const [shareUnlockPending, setShareUnlockPending] = useState(false);
  const [shareUnlockBusy, setShareUnlockBusy] = useState(false);

  const resourceId = Array.isArray(params?.id) ? params.id[0] : params?.id || "";
  const purchaseSucceeded = searchParams.get("success") === "1";
  const purchaseCanceled = searchParams.get("cancel") === "1";
  const finalPrice = appliedPromo?.discountedPrice ?? resource?.priceEur ?? 0;
  const zeroPriceUnlockMessage =
    "Ce contenu est gratuit ! Veuillez partager notre site via les boutons de partage en haut de la page pour deverrouiller le lien de telechargement.";

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

  const priceLabel = useMemo(() => `${finalPrice.toFixed(2)} EUR`, [finalPrice]);

  useEffect(() => {
    if (!shareUnlockPending || finalPrice > 0) {
      return;
    }

    const handleShared = async () => {
      if (!resource || !session?.access_token || shareUnlockBusy) {
        return;
      }

      setShareUnlockBusy(true);

      try {
        const response = await authorizedFetch(`/api/resources/${resource.slug || resource.id}/claim`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            finalPrice,
            promoCode: appliedPromo?.code || "",
          }),
        });
        const result = (await response.json().catch(() => null)) as { ok?: boolean; message?: string } | null;

        if (!response.ok || !result?.ok) {
          setActionMessage(result?.message || "Impossible de deverrouiller cette ressource.");
          return;
        }

        setShareUnlockPending(false);
        setActionMessage(result.message || "La ressource est maintenant debloquee.");
        await refreshAccess();
      } finally {
        setShareUnlockBusy(false);
      }
    };

    window.addEventListener("visdar:site-shared", handleShared);

    return () => {
      window.removeEventListener("visdar:site-shared", handleShared);
    };
  }, [authorizedFetch, finalPrice, refreshAccess, resource, session?.access_token, shareUnlockBusy, shareUnlockPending]);

  const handleApplyPromo = async () => {
    if (!resource) {
      return;
    }

    setPromoBusy(true);
    setPromoMessage("");
    setPromoMessageKind("idle");

    try {
      const response = await fetch("/api/promo-codes/validate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code: promoCode,
          priceEur: resource.priceEur,
        }),
      });

      const result = (await response.json().catch(() => null)) as
        | {
            ok?: boolean;
            message?: string;
            promo?: AppliedPromoState;
          }
        | null;

      if (!response.ok || !result?.ok || !result.promo) {
        setAppliedPromo(null);
        setPromoMessageKind("error");
        setPromoMessage(result?.message || "Code promo invalide.");
        return;
      }

      setAppliedPromo(result.promo);
      setPromoCode(result.promo.code);
      setPromoMessageKind("success");
      setPromoMessage(`Code ${result.promo.code} applique. Nouveau prix: ${result.promo.discountedPrice.toFixed(2)} EUR.`);
    } finally {
      setPromoBusy(false);
    }
  };

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
      if (finalPrice <= 0) {
        setShareUnlockPending(true);
        setActionMessage(zeroPriceUnlockMessage);
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
          finalPrice,
          promoCode: appliedPromo?.code || "",
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
            <div className="promo-price-tag-wrap">
              {appliedPromo ? <span className="promo-original-price">{resource.priceEur.toFixed(2)} EUR</span> : null}
              <span className="resource-price-tag">{priceLabel}</span>
            </div>
            <span className="tiny">
              {finalPrice <= 0 ? "Acces gratuit apres partage" : "Paiement securise puis telechargement"}
            </span>
          </div>

          <p className="section-caption" style={{ marginTop: 18 }}>{resource.summaryFr}</p>

          <div className="detail-promo-cta">
            <div className="detail-promo-compact">
              <div className="detail-promo-meta">
                <span className="tiny">Optionnel</span>
                {appliedPromo ? <strong className="tiny">-{appliedPromo.discountPercent}%</strong> : null}
              </div>
              <div className="detail-promo-inline">
                <input
                  className="input detail-promo-input"
                  value={promoCode}
                  onChange={(event) => setPromoCode(event.target.value.toUpperCase())}
                  placeholder="Code promo"
                />
                <button className="pill-button detail-promo-apply" type="button" disabled={promoBusy} onClick={() => void handleApplyPromo()}>
                  {promoBusy ? "Verification..." : "Appliquer"}
                </button>
              </div>
            </div>

            <div className="detail-buy-group">
              <button
                className="cta-button detail-buy-button"
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
                <a className="cta-button secondary detail-secondary-button" href={resource.externalUrl} target="_blank" rel="noreferrer">
                  <ExternalLink size={16} />
                  Voir aussi le lien externe
                </a>
              ) : null}
            </div>
          </div>

          {promoMessage ? (
            <p className={promoMessageKind === "success" ? "tiny promo-message success" : "tiny promo-message error"}>
              {promoMessage}
            </p>
          ) : null}

          {actionMessage ? <p className="tiny">{actionMessage}</p> : null}
          {accessLoading ? <p className="tiny">Verification de vos droits...</p> : null}

          {finalPrice <= 0 && !accessState.hasAccess ? (
            <div className="share-unlock-box">
              <strong>Partage pour deverrouiller</strong>
              <p className="tiny">{zeroPriceUnlockMessage}</p>
              {shareUnlockPending ? (
                <p className="tiny">
                  Cliquez maintenant sur l'un des boutons de partage en haut de la page. Les telechargements se deverrouilleront aussitot.
                </p>
              ) : null}
            </div>
          ) : null}

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
