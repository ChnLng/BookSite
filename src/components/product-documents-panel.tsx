"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, Eye } from "lucide-react";
import {
  canViewMimeType,
  type PublicProductDocument,
  type ProductKind,
} from "@/lib/product-documents";

type Props = {
  productKind: ProductKind;
  productId: string;
  hasAccess: boolean;
  accessToken?: string | null;
};

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "";
  const units = ["o", "Ko", "Mo", "Go"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(unit === 0 ? 0 : 1)} ${units[unit]}`;
}

export function ProductDocumentsPanel({ productKind, productId, hasAccess, accessToken }: Props) {
  const [documents, setDocuments] = useState<PublicProductDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/products/${productKind}/${encodeURIComponent(productId)}/documents`, { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json().catch(() => null) as { ok?: boolean; documents?: PublicProductDocument[]; message?: string } | null;
        if (!response.ok || !result?.ok) throw new Error(result?.message || "Chargement des documents impossible.");
        if (!cancelled) setDocuments(result.documents || []);
      })
      .catch((error) => {
        if (!cancelled) setMessage(error instanceof Error ? error.message : "Chargement impossible.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [productId, productKind]);

  const openDocument = useCallback(async (document: PublicProductDocument, mode: "download" | "view") => {
    if (!hasAccess || !accessToken) {
      setMessage("Connectez-vous puis validez le paiement pour accéder à ce document.");
      return;
    }
    const previewWindow = mode === "view" ? window.open("about:blank", "_blank") : null;
    if (previewWindow) previewWindow.opener = null;
    setBusyId(`${document.id}-${mode}`);
    setMessage("");
    try {
      const response = await fetch(
        `/api/products/${productKind}/${encodeURIComponent(productId)}/documents/${encodeURIComponent(document.id)}/grant`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ mode }),
        },
      );
      const result = await response.json().catch(() => null) as { ok?: boolean; url?: string; message?: string } | null;
      if (!response.ok || !result?.ok || !result.url) throw new Error(result?.message || "Ouverture impossible.");
      if (mode === "view" && previewWindow) {
        previewWindow.location.replace(result.url);
      } else {
        previewWindow?.close();
        const link = window.document.createElement("a");
        link.href = result.url;
        link.rel = "noopener";
        window.document.body.appendChild(link);
        link.click();
        link.remove();
      }
    } catch (error) {
      previewWindow?.close();
      setMessage(error instanceof Error ? error.message : "Ouverture impossible.");
    } finally {
      setBusyId("");
    }
  }, [accessToken, hasAccess, productId, productKind]);

  return (
    <div className="resource-download-panel" id="documents-numeriques">
      <div className="split-line">
        <strong>Documents numériques</strong>
        <span>{documents.length}</span>
      </div>

      {loading ? <p className="tiny" style={{ marginTop: 12 }}>Chargement des documents...</p> : null}
      {!loading && documents.length === 0 ? (
        <p className="tiny" style={{ marginTop: 12 }}>Aucun document n&apos;est publié pour ce produit.</p>
      ) : null}

      <div className="coin-ludique-downloads" style={{ marginTop: 14 }}>
        {documents.map((document) => {
          const viewable = document.deliveryMode !== "download" && canViewMimeType(document.mimeType, document.fileExtension);
          const downloadable = document.deliveryMode !== "view";
          const fileSize = formatBytes(document.sizeBytes);
          return (
            <div className="admin-inline-card" key={document.id}>
              <div>
                <strong>{document.labelFr || document.fileName}</strong>
                {document.labelZh ? <p className="tiny" lang="zh-Hans">{document.labelZh}</p> : null}
                <p className="tiny">{document.fileExtension.toUpperCase().replace(".", "")}{fileSize ? ` · ${fileSize}` : ""}</p>
              </div>
              <div className="actions-row">
                {viewable ? (
                  <button
                    className={hasAccess ? "pill-button" : "pill-button disabled"}
                    type="button"
                    disabled={!hasAccess || busyId === `${document.id}-view`}
                    onClick={() => void openDocument(document, "view")}
                  >
                    <Eye size={15} /> {busyId === `${document.id}-view` ? "Ouverture..." : "Consulter"}
                  </button>
                ) : null}
                {downloadable ? (
                  <button
                    className={hasAccess ? "pill-button" : "pill-button disabled"}
                    type="button"
                    disabled={!hasAccess || busyId === `${document.id}-download`}
                    onClick={() => void openDocument(document, "download")}
                  >
                    <Download size={15} /> {busyId === `${document.id}-download` ? "Préparation..." : "Télécharger"}
                  </button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      {!hasAccess && documents.length > 0 ? (
        <p className="tiny" style={{ marginTop: 12 }}>Connectez-vous puis validez le paiement pour débloquer ces fichiers.</p>
      ) : null}
      {message ? <p className="tiny" style={{ marginTop: 12 }}>{message}</p> : null}
    </div>
  );
}
