"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Upload } from "tus-js-client";
import { useAuth } from "@/components/auth-provider";
import {
  canViewMimeType,
  extensionFromFilename,
  type DocumentDeliveryMode,
  type ProductDocumentRecord,
  type ProductKind,
} from "@/lib/product-documents";
import { addVisdArAuthorWatermark, isPdfUpload } from "@/lib/pdf-author-watermark";
import { addVisdArImageWatermark, isWatermarkableImageUpload } from "@/lib/image-author-watermark";
import { signedStorageTusEndpoint } from "@/lib/supabase-storage-upload";

type CategoryRules = {
  allowedFileTypes: string[];
  allowedDeliveryModes: Array<"download" | "view">;
};

type Props = {
  productKind: ProductKind;
  productId: string;
};

const defaultRules: CategoryRules = {
  allowedFileTypes: [],
  allowedDeliveryModes: ["download"],
};

function formatBytes(value: number | string) {
  const bytes = Number(value || 0);
  if (!Number.isFinite(bytes) || bytes <= 0) return "taille inconnue";
  const units = ["o", "Ko", "Mo", "Go"];
  let normalized = bytes;
  let index = 0;
  while (normalized >= 1024 && index < units.length - 1) {
    normalized /= 1024;
    index += 1;
  }
  return `${normalized.toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

function modeLabel(mode: DocumentDeliveryMode) {
  if (mode === "view") return "Lecture en ligne";
  if (mode === "both") return "Lecture + téléchargement";
  return "Téléchargement";
}

function directStorageSignedTusEndpoint() {
  const configuredUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return signedStorageTusEndpoint(configuredUrl || "");
}

function supabasePublishableKey() {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!key) throw new Error("Clé publique Supabase manquante.");
  return key;
}

export function AdminProductDocumentsPanel({ productKind, productId }: Props) {
  const { session } = useAuth();
  const [documents, setDocuments] = useState<ProductDocumentRecord[]>([]);
  const [rules, setRules] = useState<CategoryRules>(defaultRules);
  const [newFile, setNewFile] = useState<File | null>(null);
  const [newLabelFr, setNewLabelFr] = useState("");
  const [newLabelZh, setNewLabelZh] = useState("");
  const [newMode, setNewMode] = useState<DocumentDeliveryMode>("download");
  const [watermarkPdf, setWatermarkPdf] = useState(true);
  const [watermarkImage, setWatermarkImage] = useState(true);
  const [replacementFiles, setReplacementFiles] = useState<Record<string, File | null>>({});
  const [busyKey, setBusyKey] = useState("");
  const [message, setMessage] = useState("");

  const authorizedFetch = useCallback(async (input: RequestInfo | URL, init?: RequestInit) => {
    if (!session?.access_token) throw new Error("Session admin expirée.");
    const headers = new Headers(init?.headers);
    headers.set("Authorization", `Bearer ${session.access_token}`);
    return fetch(input, { ...init, headers });
  }, [session?.access_token]);

  const loadDocuments = useCallback(async () => {
    if (!session?.access_token || !productId) return;
    const params = new URLSearchParams({ productKind, productId });
    const response = await authorizedFetch(`/api/admin/product-documents?${params.toString()}`, { cache: "no-store" });
    const result = (await response.json().catch(() => null)) as {
      ok?: boolean;
      message?: string;
      documents?: ProductDocumentRecord[];
      rules?: CategoryRules;
    } | null;
    if (!response.ok || !result?.ok) throw new Error(result?.message || "Chargement des documents impossible.");
    setDocuments(result.documents || []);
    setRules(result.rules || defaultRules);
    const allowedModes = result.rules?.allowedDeliveryModes || ["download"];
    setNewMode(allowedModes.includes("download") ? "download" : "view");
  }, [authorizedFetch, productId, productKind, session?.access_token]);

  useEffect(() => {
    void loadDocuments().catch((error) => setMessage(error instanceof Error ? error.message : "Chargement impossible."));
  }, [loadDocuments]);

  const accept = useMemo(() => rules.allowedFileTypes.join(","), [rules.allowedFileTypes]);

  const uploadDocument = async (file: File, input: {
    documentId?: string;
    labelFr: string;
    labelZh: string;
    deliveryMode: DocumentDeliveryMode;
    visible: boolean;
    sortOrder: number;
  }) => {
    if (!session?.access_token) throw new Error("Session admin expirée.");

    let uploadFile = file;
    if (watermarkPdf && isPdfUpload(file)) {
      setMessage("Ajout de la signature discrète Auteur : Visd AR au PDF...");
      uploadFile = await addVisdArAuthorWatermark(file);
    } else if (watermarkImage && isWatermarkableImageUpload(file)) {
      setMessage("Ajout de la signature discrète Auteur : Visd AR à l'image...");
      uploadFile = await addVisdArImageWatermark(file);
    }

    setMessage("1/3 Préparation de l'envoi privé...");
    const prepareResponse = await authorizedFetch("/api/admin/product-uploads/prepare", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productKind,
        productId,
        fileName: file.name,
        fileSize: uploadFile.size,
        mimeType: uploadFile.type || "application/octet-stream",
        deliveryMode: input.deliveryMode,
      }),
    });
    const prepared = (await prepareResponse.json().catch(() => null)) as {
      ok?: boolean;
      message?: string;
      bucket?: string;
      stagedPath?: string;
      token?: string;
    } | null;
    if (!prepareResponse.ok || !prepared?.ok || !prepared.bucket || !prepared.stagedPath || !prepared.token) {
      throw new Error(prepared?.message || "Préparation impossible.");
    }

    setMessage(`2/3 Envoi direct et reprenable (${formatBytes(uploadFile.size)})... Ne fermez pas cette page.`);
    await new Promise<void>((resolve, reject) => {
      const upload = new Upload(uploadFile, {
        endpoint: directStorageSignedTusEndpoint(),
        chunkSize: 6 * 1024 * 1024,
        retryDelays: [0, 3000, 5000, 10000, 20000],
        uploadDataDuringCreation: true,
        removeFingerprintOnSuccess: true,
        headers: {
          apikey: supabasePublishableKey(),
          "x-signature": prepared.token as string,
        },
        metadata: {
          bucketName: prepared.bucket as string,
          objectName: prepared.stagedPath as string,
          contentType: uploadFile.type || "application/octet-stream",
          cacheControl: "no-cache",
        },
        onProgress: (uploadedBytes, totalBytes) => {
          const progress = totalBytes > 0 ? Math.round((uploadedBytes / totalBytes) * 100) : 0;
          setMessage(`2/3 Envoi direct et reprenable : ${progress}% (${formatBytes(uploadFile.size)}). Ne fermez pas cette page.`);
        },
        onError: (error) => reject(new Error(error.message || "Upload temporaire impossible.")),
        onSuccess: () => resolve(),
      });
      void upload.findPreviousUploads()
        .then((previousUploads) => {
          if (previousUploads.length > 0) upload.resumeFromPreviousUpload(previousUploads[0]);
          upload.start();
        })
        .catch(reject);
    });

    setMessage("3/3 Transfert vers la GitHub Release privée et enregistrement...");
    const finalizeResponse = await authorizedFetch("/api/admin/product-uploads/finalize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productKind,
        productId,
        documentId: input.documentId,
        stagedPath: prepared.stagedPath,
        fileName: file.name,
        fileSize: uploadFile.size,
        mimeType: uploadFile.type || "application/octet-stream",
        labelFr: input.labelFr || file.name,
        labelZh: input.labelZh,
        deliveryMode: input.deliveryMode,
        visible: input.visible,
        sortOrder: input.sortOrder,
      }),
    });
    const finalized = (await finalizeResponse.json().catch(() => null)) as {
      ok?: boolean;
      message?: string;
      cleanupWarning?: string;
    } | null;
    if (!finalizeResponse.ok || !finalized?.ok) throw new Error(finalized?.message || "Finalisation impossible.");
    setMessage(finalized.cleanupWarning
      ? `Document enregistré. Attention : ${finalized.cleanupWarning}`
      : "Document privé enregistré et immédiatement prêt après paiement.");
    await loadDocuments();
  };

  const addDocument = async () => {
    if (!newFile) return;
    setBusyKey("add");
    try {
      await uploadDocument(newFile, {
        labelFr: newLabelFr || newFile.name,
        labelZh: newLabelZh,
        deliveryMode: newMode,
        visible: true,
        sortOrder: (documents.length + 1) * 10,
      });
      setNewFile(null);
      setNewLabelFr("");
      setNewLabelZh("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Upload impossible.");
    } finally {
      setBusyKey("");
    }
  };

  const saveDocument = async (document: ProductDocumentRecord) => {
    setBusyKey(`save-${document.id}`);
    try {
      const response = await authorizedFetch("/api/admin/product-documents", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: document.id,
          labelFr: document.label_fr,
          labelZh: document.label_zh,
          deliveryMode: document.delivery_mode,
          visible: document.visible,
          sortOrder: document.sort_order,
        }),
      });
      const result = (await response.json().catch(() => null)) as { ok?: boolean; message?: string } | null;
      if (!response.ok || !result?.ok) throw new Error(result?.message || "Mise à jour impossible.");
      setMessage("Document mis à jour.");
      await loadDocuments();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Mise à jour impossible.");
    } finally {
      setBusyKey("");
    }
  };

  const replaceDocument = async (document: ProductDocumentRecord) => {
    const file = replacementFiles[document.id];
    if (!file) return;
    setBusyKey(`replace-${document.id}`);
    try {
      await uploadDocument(file, {
        documentId: document.id,
        labelFr: document.label_fr,
        labelZh: document.label_zh || "",
        deliveryMode: document.delivery_mode,
        visible: document.visible,
        sortOrder: document.sort_order,
      });
      setReplacementFiles((current) => ({ ...current, [document.id]: null }));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Remplacement impossible.");
    } finally {
      setBusyKey("");
    }
  };

  const deleteDocument = async (document: ProductDocumentRecord) => {
    if (!window.confirm(`Supprimer définitivement le fichier « ${document.file_name} » de la GitHub Release privée ?`)) return;
    setBusyKey(`delete-${document.id}`);
    try {
      const response = await authorizedFetch("/api/admin/product-documents", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: document.id }),
      });
      const result = (await response.json().catch(() => null)) as { ok?: boolean; message?: string; cleanupWarning?: string } | null;
      if (!response.ok || !result?.ok) throw new Error(result?.message || "Suppression impossible.");
      setMessage(result.cleanupWarning ? `Document masqué. ${result.cleanupWarning}` : "Document et fichier privé supprimés.");
      await loadDocuments();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Suppression impossible.");
    } finally {
      setBusyKey("");
    }
  };

  const updateLocal = (id: string, patch: Partial<ProductDocumentRecord>) => {
    setDocuments((current) => current.map((document) => document.id === id ? { ...document, ...patch } : document));
  };

  const deliveryOptions = (document?: ProductDocumentRecord, file?: File | null) => {
    const canDownload = rules.allowedDeliveryModes.includes("download");
    const browserViewable = document
      ? canViewMimeType(document.mime_type, document.file_extension)
      : file
        ? canViewMimeType(file.type || "application/octet-stream", extensionFromFilename(file.name))
        : true;
    const canView = rules.allowedDeliveryModes.includes("view") && browserViewable;
    return <>
      {canDownload ? <option value="download">Téléchargement</option> : null}
      {canView ? <option value="view">Lecture en ligne</option> : null}
      {canDownload && canView ? <option value="both">Lecture + téléchargement</option> : null}
    </>;
  };

  const selectedFileIsPdf = Boolean(newFile && isPdfUpload(newFile));
  const selectedFileIsWatermarkableImage = Boolean(newFile && isWatermarkableImageUpload(newFile));

  return (
    <div className="section-block admin-product-documents" style={{ marginTop: 14 }}>
      <div className="split-line">
        <div>
          <strong>文档 Documents numériques privés</strong>
          <p className="tiny" style={{ marginTop: 6 }}>
            Formats autorisés par la catégorie : {rules.allowedFileTypes.join(", ") || "aucun format configuré"}
          </p>
          <div className="admin-storage-route">
            <span>① 临时私有存储 · Supabase Storage : <code>admin-upload-staging/pending/…</code></span>
            <span>② 最终付费文件库 · GitHub Release privée : <code>référence masquée</code></span>
            <span>③ 权限记录 · Base de données : <code>product_documents</code> · 下载仅在付款后生成</span>
          </div>
        </div>
        <span className="tiny">{documents.length} fichier(s)</span>
      </div>
      {message ? <p className="tiny">{message}</p> : null}

      <div className="admin-inline-card" style={{ marginTop: 12 }}>
        <strong>Ajouter un document</strong>
        <input className="input" placeholder="Nom affiché FR" value={newLabelFr} onChange={(event) => setNewLabelFr(event.target.value)} />
        <input className="input" placeholder="显示名称 ZH（可选）" value={newLabelZh} onChange={(event) => setNewLabelZh(event.target.value)} />
        <select className="input" value={newMode} onChange={(event) => setNewMode(event.target.value as DocumentDeliveryMode)}>
          {deliveryOptions(undefined, newFile)}
        </select>
        <input
          className="input"
          type="file"
          accept={accept || undefined}
          onChange={(event) => {
            const file = event.target.files?.[0] || null;
            setNewFile(file);
            if (file && !newLabelFr) setNewLabelFr(file.name);
            if (
              file
              && newMode !== "download"
              && !canViewMimeType(file.type || "application/octet-stream", extensionFromFilename(file.name))
            ) {
              setNewMode("download");
            }
          }}
        />
        {newFile ? <p className="tiny">已选择 · Fichier sélectionné : <strong>{newFile.name}</strong> · {isPdfUpload(newFile) ? "PDF" : isWatermarkableImageUpload(newFile) ? "Image" : "Application / archive / autre fichier"}</p> : null}
        {selectedFileIsPdf ? <label className="admin-pdf-watermark-option">
          <input
            type="checkbox"
            checked={watermarkPdf}
            onChange={(event) => setWatermarkPdf(event.target.checked)}
          />
          <span>
            <strong>PDF：添加左右竖排作者署名</strong>
            <small>Auteur : 猫咪 Logo Visd AR（字面朝两侧外边，浅蓝紫灰、低透明度）</small>
          </span>
        </label> : null}
        {selectedFileIsWatermarkableImage ? <label className="admin-pdf-watermark-option">
          <input type="checkbox" checked={watermarkImage} onChange={(event) => setWatermarkImage(event.target.checked)} />
          <span><strong>图片：添加左右竖排作者署名</strong><small>PNG / JPG / WebP：Auteur · Visd AR（浅蓝紫灰、低透明度）。APK、IPA、ZIP 等应用或压缩文件不会显示或使用水印。</small></span>
        </label> : null}
        {newFile && !selectedFileIsPdf && !selectedFileIsWatermarkableImage ? <p className="tiny admin-file-no-watermark">此文件不适用水印 · Pas de filigrane : les APK, IPA, AAB, ZIP et autres fichiers techniques sont livrés intacts.</p> : null}
        <button className="cta-button" type="button" disabled={!newFile || busyKey === "add"} onClick={() => void addDocument()}>
          {busyKey === "add" ? "Upload en cours..." : "上传到私有 GitHub并绑定"}
        </button>
      </div>

      <div className="admin-dynamic-stack" style={{ marginTop: 12 }}>
        {documents.map((document) => (
          <div className="admin-inline-card" key={document.id}>
            <div>
              <strong>{document.file_name}</strong>
              <p className="tiny">{formatBytes(document.size_bytes)} · v{document.version} · {modeLabel(document.delivery_mode)} · {document.visible ? "Visible" : "Masqué"}</p>
            </div>
            <input className="input" value={document.label_fr} onChange={(event) => updateLocal(document.id, { label_fr: event.target.value })} />
            <input className="input" placeholder="显示名称 ZH" value={document.label_zh || ""} onChange={(event) => updateLocal(document.id, { label_zh: event.target.value })} />
            <select className="input" value={document.delivery_mode} onChange={(event) => updateLocal(document.id, { delivery_mode: event.target.value as DocumentDeliveryMode })}>
              {deliveryOptions(document)}
            </select>
            <input className="input" type="number" value={document.sort_order} onChange={(event) => updateLocal(document.id, { sort_order: Number(event.target.value || 0) })} />
            <label className="tiny">
              <input type="checkbox" checked={document.visible} onChange={() => updateLocal(document.id, { visible: !document.visible })} /> 文档可见 Visible
            </label>
            <div className="actions-row">
              <button className="pill-button" type="button" disabled={busyKey === `save-${document.id}`} onClick={() => void saveDocument(document)}>保存名称/隐藏/模式</button>
            </div>
            <div className="actions-row">
              <input
                className="input"
                type="file"
                accept={accept || undefined}
                onChange={(event) => setReplacementFiles((current) => ({ ...current, [document.id]: event.target.files?.[0] || null }))}
              />
              <button className="pill-button" type="button" disabled={!replacementFiles[document.id] || busyKey === `replace-${document.id}`} onClick={() => void replaceDocument(document)}>
                安全替换新版本
              </button>
              <button className="pill-button" type="button" disabled={busyKey === `delete-${document.id}`} onClick={() => void deleteDocument(document)}>
                永久删除文档
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
