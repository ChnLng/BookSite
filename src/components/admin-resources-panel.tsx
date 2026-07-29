"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth-provider";

type CategoryOption = {
  id: string;
  titleFr: string;
  kind: string;
};

type ResourceVariantDraft = {
  id?: string;
  platform: string;
  labelFr: string;
  filePath: string;
  externalUrl: string;
  sortOrder: string;
};

type ResourceDraft = {
  id?: string;
  categoryId: string;
  slug: string;
  titleFr: string;
  summaryFr: string;
  coverImageUrl: string;
  qrImageUrl: string;
  externalUrl: string;
  priceEur: string;
  visible: boolean;
  sortOrder: string;
  downloads: ResourceVariantDraft[];
};

type ResourceRow = {
  id: string;
  category_id: string | null;
  slug: string | null;
  title_fr: string | null;
  summary_fr: string | null;
  cover_image_url: string | null;
  qr_image_url: string | null;
  external_url: string | null;
  price_eur: number | string | null;
  visible: boolean | null;
  sort_order: number | null;
};

type ResourceFileRow = {
  id: string;
  resource_id: string;
  platform: string | null;
  label_fr: string | null;
  file_path: string | null;
  external_url: string | null;
  sort_order: number | null;
};

const defaultVariant = (): ResourceVariantDraft => ({
  platform: "通用",
  labelFr: "",
  filePath: "",
  externalUrl: "",
  sortOrder: "10",
});

const defaultDraft: ResourceDraft = {
  categoryId: "",
  slug: "",
  titleFr: "",
  summaryFr: "",
  coverImageUrl: "",
  qrImageUrl: "",
  externalUrl: "",
  priceEur: "0",
  visible: true,
  sortOrder: "10",
  downloads: [defaultVariant()],
};

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function AdminResourcesPanel() {
  const { session, loading: authLoading } = useAuth();
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [resources, setResources] = useState<ResourceRow[]>([]);
  const [filesByResource, setFilesByResource] = useState<Record<string, ResourceFileRow[]>>({});
  const [draft, setDraft] = useState<ResourceDraft>(defaultDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"create" | "edit">("create");
  const [lastDeleted, setLastDeleted] = useState<{ id: string; title: string; wasVisible: boolean } | null>(null);
  const [selectedCoverFile, setSelectedCoverFile] = useState<File | null>(null);
  const [selectedQrFile, setSelectedQrFile] = useState<File | null>(null);
  const [selectedVariantFiles, setSelectedVariantFiles] = useState<Record<number, File | null>>({});

  const authorizedFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    if (!session?.access_token) {
      throw new Error("Connexion admin requise.");
    }

    const headers = new Headers(init?.headers);
    headers.set("Authorization", `Bearer ${session.access_token}`);

    return fetch(input, {
      ...init,
      headers,
    });
  };

  const uploadAsset = async (kind: "image" | "resource-download", file: File, filename: string) => {
    const body = new FormData();
    body.append("kind", kind);
    body.append("filename", filename);
    body.append("file", file);

    const response = await authorizedFetch("/api/admin/assets", {
      method: "POST",
      body,
    });

    const result = (await response.json()) as { ok?: boolean; message?: string; assetPath?: string };

    if (!response.ok || !result.assetPath) {
      throw new Error(result.message || "Upload impossible.");
    }

    return result.assetPath;
  };

  const loadData = async () => {
    if (authLoading) {
      return;
    }

    if (!session?.access_token) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const response = await authorizedFetch("/api/admin/resources", { cache: "no-store" });
      const result = (await response.json()) as {
        ok?: boolean;
        message?: string;
        warnings?: string[];
        categories?: CategoryOption[];
        resources?: ResourceRow[];
        files?: Array<ResourceFileRow & { file_url?: string | null }>;
      };

      if (!response.ok || !result.ok) {
        setStatusMessage(result.message || "Chargement des outils impossible.");
        setCategories([]);
        setResources([]);
        setFilesByResource({});
        return;
      }

      const nextCategories = result.categories || [];
      const nextResources = result.resources || [];
      const nextFilesByResource = (result.files || []).reduce<Record<string, ResourceFileRow[]>>((accumulator, file) => {
        accumulator[file.resource_id] ||= [];
        accumulator[file.resource_id].push({
          ...file,
          file_path: file.file_path || file.file_url || null,
        });
        return accumulator;
      }, {});

      setCategories(nextCategories);
      setResources(nextResources);
      setFilesByResource(nextFilesByResource);
      setStatusMessage(result.warnings?.length ? result.warnings.join(" | ") : "");
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Chargement des outils impossible.");
      setCategories([]);
      setResources([]);
      setFilesByResource({});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [authLoading, session?.access_token]);

  const resetDraft = () => {
    setDraft(defaultDraft);
    setEditingId(null);
    setSelectedCoverFile(null);
    setSelectedQrFile(null);
    setSelectedVariantFiles({});
  };

  const startNewResource = () => {
    resetDraft();
    setActiveTab("create");
  };

  const beginEdit = (resource: ResourceRow) => {
    const relatedFiles = filesByResource[resource.id] || [];
    setEditingId(resource.id);
    setActiveTab("edit");
    setDraft({
      id: resource.id,
      categoryId: resource.category_id || "",
      slug: resource.slug || "",
      titleFr: resource.title_fr || "",
      summaryFr: resource.summary_fr || "",
      coverImageUrl: resource.cover_image_url || "",
      qrImageUrl: resource.qr_image_url || "",
      externalUrl: resource.external_url || "",
      priceEur: String(resource.price_eur ?? 0),
      visible: resource.visible !== false,
      sortOrder: String(resource.sort_order || 0),
      downloads:
        relatedFiles.length > 0
          ? relatedFiles.map((file) => ({
              id: file.id,
              platform: file.platform || "通用",
              labelFr: file.label_fr || "",
              filePath: file.file_path || "",
              externalUrl: file.external_url || "",
              sortOrder: String(file.sort_order || 0),
            }))
          : [defaultVariant()],
    });
  };

  const saveResource = async () => {
    const normalizedSlug = slugify(draft.slug || draft.titleFr);

    if (!normalizedSlug || !draft.titleFr.trim()) {
      setStatusMessage("Ajoutez au minimum un titre et un slug.");
      return;
    }

    setBusyKey("save-resource");

    try {
      const response = await authorizedFetch("/api/admin/resources", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          payload: {
            ...draft,
            id: editingId || undefined,
            slug: normalizedSlug,
          },
        }),
      });
      const result = (await response.json()) as { ok?: boolean; message?: string };

      if (!response.ok || !result.ok) {
        setStatusMessage(result.message || "Creation de ressource impossible.");
        return;
      }

      setStatusMessage("Ressource ludique enregistree.");
      resetDraft();
      await loadData();
    } finally {
      setBusyKey(null);
    }
  };

  const deleteResource = async (resourceId: string) => {
    const resource = resources.find((entry) => entry.id === resourceId);
    if (!resource) return;
    setBusyKey(`delete-resource-${resourceId}`);

    try {
      const response = await authorizedFetch("/api/admin/resources", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id: resourceId }),
      });
      const result = (await response.json()) as { ok?: boolean; message?: string };

      if (!response.ok || !result.ok) {
        setStatusMessage(result.message || "Suppression impossible.");
        return;
      }

      setStatusMessage("Ressource supprimee.");
      setLastDeleted({ id: resource.id, title: resource.title_fr || "Outil", wasVisible: resource.visible !== false });
      if (editingId === resourceId) {
        resetDraft();
      }
      await loadData();
    } finally {
      setBusyKey(null);
    }
  };

  const patchResource = async (payload: Record<string, unknown>, successMessage: string) => {
    const response = await authorizedFetch("/api/admin/resources", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = (await response.json()) as { ok?: boolean; message?: string };
    if (!response.ok || !result.ok) throw new Error(result.message || "Operation impossible.");
    setStatusMessage(successMessage);
    await loadData();
  };

  const toggleResourceVisibility = async (resource: ResourceRow) => {
    setBusyKey(`visibility-resource-${resource.id}`);
    try {
      await patchResource({ action: "visibility", id: resource.id, visible: resource.visible === false }, resource.visible === false ? "Outil publie." : "Outil masque.");
    } catch (error) { setStatusMessage(error instanceof Error ? error.message : "Operation impossible."); }
    finally { setBusyKey(null); }
  };

  const moveResource = async (resourceId: string, direction: "up" | "down") => {
    const currentIndex = resources.findIndex((entry) => entry.id === resourceId);
    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= resources.length) return;
    const current = resources[currentIndex];
    const target = resources[targetIndex];
    setBusyKey(`move-resource-${resourceId}`);
    try {
      await patchResource({ action: "move", id: current.id, targetId: target.id, currentSortOrder: current.sort_order ?? currentIndex, targetSortOrder: target.sort_order ?? targetIndex }, "Ordre des outils mis a jour.");
    } catch (error) { setStatusMessage(error instanceof Error ? error.message : "Tri impossible."); }
    finally { setBusyKey(null); }
  };

  const restoreResource = async () => {
    if (!lastDeleted) return;
    setBusyKey(`restore-resource-${lastDeleted.id}`);
    try {
      await patchResource({ action: "restore", id: lastDeleted.id, visible: lastDeleted.wasVisible }, `Outil restaure : ${lastDeleted.title}`);
      setLastDeleted(null);
    } catch (error) { setStatusMessage(error instanceof Error ? error.message : "Restauration impossible."); }
    finally { setBusyKey(null); }
  };

  const uploadQrImage = async (file: File) => {
    const filename = `${slugify(draft.slug || draft.titleFr || `qr-${Date.now()}`)}-qr.${file.name.split(".").pop() || "png"}`;

    setBusyKey("upload-resource-qr");

    try {
      const assetPath = await uploadAsset("image", file, filename);
      setDraft((current) => ({ ...current, qrImageUrl: assetPath }));
      setSelectedQrFile(null);
      setStatusMessage("QR 已上传到 Supabase；点击下方保存商品后在用户端生效。");
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Upload QR impossible.");
    } finally {
      setBusyKey(null);
    }
  };

  const uploadCoverImage = async (file: File) => {
    const filename = `${slugify(draft.slug || draft.titleFr || `cover-${Date.now()}`)}-cover.${file.name.split(".").pop() || "png"}`;

    setBusyKey("upload-resource-cover");

    try {
      const assetPath = await uploadAsset("image", file, filename);
      setDraft((current) => ({ ...current, coverImageUrl: assetPath }));
      setSelectedCoverFile(null);
      setStatusMessage("封面已上传到 Supabase；点击下方保存商品后在用户端生效。");
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Upload image impossible.");
    } finally {
      setBusyKey(null);
    }
  };

  const uploadVariantFile = async (index: number, file: File) => {
    const extension = file.name.split(".").pop()?.toLowerCase() || "zip";
    const filename = `${slugify(draft.slug || draft.titleFr || `resource-${Date.now()}`)}-${index + 1}.${extension}`;

    setBusyKey(`upload-resource-file-${index}`);

    try {
      const assetPath = await uploadAsset("resource-download", file, filename);
      setDraft((current) => ({
        ...current,
        downloads: current.downloads.map((entry, entryIndex) =>
          entryIndex === index ? { ...entry, filePath: assetPath } : entry,
        ),
      }));
      setSelectedVariantFiles((current) => ({ ...current, [index]: null }));
      setStatusMessage("付费文件已上传到统一的 GitHub Release。保存商品后生效。");
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Upload impossible.");
    } finally {
      setBusyKey(null);
    }
  };

  const resourceCount = useMemo(() => resources.length, [resources.length]);

  return (
    <div className="section-block">
      <div className="split-line">
        <div>
          <h3>Coin ludique & Outils</h3>
          <p className="tiny" style={{ marginTop: 6 }}>
            {resourceCount} ressource(s) geree(s), avec versions telechargeables illimitees.
          </p>
        </div>
      </div>

      <div className="admin-category-tabs" role="tablist" aria-label="Gestion des outils">
        <button
          className={`admin-category-tab ${activeTab === "create" ? "active" : ""}`}
          type="button"
          role="tab"
          aria-selected={activeTab === "create"}
          onClick={startNewResource}
        >
          添加新的 Ajouter un nouvel outil
        </button>
        <button
          className={`admin-category-tab ${activeTab === "edit" ? "active" : ""}`}
          type="button"
          role="tab"
          aria-selected={activeTab === "edit"}
          onClick={() => { resetDraft(); setActiveTab("edit"); }}
        >
          编辑已有 Modifier les outils
        </button>
      </div>

      {statusMessage ? <p className="tiny">{statusMessage}</p> : null}
      {loading ? <p className="muted">Chargement des ressources...</p> : null}

      {activeTab === "create" || editingId ? <>
      <div className="input-group admin-form-grid">
        <select
          className="input"
          value={draft.categoryId}
          onChange={(event) => setDraft({ ...draft, categoryId: event.target.value })}
        >
          <option value="">Categorie de rattachement</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.titleFr} · {category.kind}
            </option>
          ))}
        </select>
        <input
          className="input"
          placeholder="Slug"
          value={draft.slug}
          onChange={(event) => setDraft({ ...draft, slug: slugify(event.target.value) })}
        />
        <input
          className="input"
          placeholder="Titre convivial"
          value={draft.titleFr}
          onChange={(event) => setDraft({ ...draft, titleFr: event.target.value })}
        />
        <input
          className="input"
          placeholder="Prix EUR"
          value={draft.priceEur}
          onChange={(event) => setDraft({ ...draft, priceEur: event.target.value })}
        />
        <input
          className="input"
          placeholder="Ordre"
          value={draft.sortOrder}
          onChange={(event) => setDraft({ ...draft, sortOrder: event.target.value })}
        />
        <input
          className="input"
          placeholder="Image carree /images/..."
          value={draft.coverImageUrl}
          onChange={(event) => setDraft({ ...draft, coverImageUrl: event.target.value })}
        />
        <input
          className="input"
          placeholder="Image QR /images/..."
          value={draft.qrImageUrl}
          onChange={(event) => setDraft({ ...draft, qrImageUrl: event.target.value })}
        />
        <input
          className="input"
          placeholder="Lien externe de telechargement"
          value={draft.externalUrl}
          onChange={(event) => setDraft({ ...draft, externalUrl: event.target.value })}
        />
        <label className="tiny">
          <input
            type="checkbox"
            checked={draft.visible}
            onChange={() => setDraft({ ...draft, visible: !draft.visible })}
          />{" "}
          Visible
        </label>
        <textarea
          className="textarea"
          placeholder="Resume chaleureux"
          value={draft.summaryFr}
          onChange={(event) => setDraft({ ...draft, summaryFr: event.target.value })}
        />
      </div>

      <div className="actions-row">
        <input
          className="input"
          type="file"
          accept="image/*"
          onChange={(event) => {
            const file = event.target.files?.[0] || null;
            setSelectedCoverFile(file);
            setStatusMessage(file ? `已选择封面：${file.name}，请点击上传封面。` : "");
          }}
        />
        <button
          className="pill-button"
          type="button"
          disabled={!selectedCoverFile || busyKey === "upload-resource-cover"}
          onClick={() => selectedCoverFile ? void uploadCoverImage(selectedCoverFile) : undefined}
        >
          {busyKey === "upload-resource-cover" ? "上传中..." : "上传封面并绑定"}
        </button>
      </div>

      <div className="actions-row">
        <input
          className="input"
          type="file"
          accept="image/*"
          onChange={(event) => {
            const file = event.target.files?.[0] || null;
            setSelectedQrFile(file);
            setStatusMessage(file ? `已选择 QR：${file.name}，请点击上传 QR。` : "");
          }}
        />
        <button
          className="pill-button"
          type="button"
          disabled={!selectedQrFile || busyKey === "upload-resource-qr"}
          onClick={() => selectedQrFile ? void uploadQrImage(selectedQrFile) : undefined}
        >
          {busyKey === "upload-resource-qr" ? "上传中..." : "上传 QR 并绑定"}
        </button>
      </div>

      <div className="section-block">
        <div className="split-line">
          <strong>Versions telechargeables 多系统上传槽位</strong>
          <button
            className="pill-button"
            type="button"
            onClick={() =>
              setDraft((current) => ({
                ...current,
                downloads: [...current.downloads, defaultVariant()],
              }))
            }
          >
            Ajouter un slot
          </button>
        </div>

        <div className="admin-dynamic-stack">
          {draft.downloads.map((entry, index) => (
            <div className="admin-inline-card" key={`${entry.id || "new"}-${index}`}>
              <select
                className="input"
                value={entry.platform}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    downloads: current.downloads.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, platform: event.target.value } : item,
                    ),
                  }))
                }
              >
                <option value="通用">通用</option>
                <option value="Mac">Mac</option>
                <option value="Windows">Windows</option>
                <option value="Linux">Linux</option>
                <option value="手机">手机</option>
              </select>
              <input
                className="input"
                placeholder="Label FR"
                value={entry.labelFr}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    downloads: current.downloads.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, labelFr: event.target.value } : item,
                    ),
                  }))
                }
              />
              <input
                className="input"
                placeholder="GitHub Release 付费文件地址"
                value={entry.filePath}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    downloads: current.downloads.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, filePath: event.target.value } : item,
                    ),
                  }))
                }
              />
              <input
                className="input"
                placeholder="Lien externe de cette version"
                value={entry.externalUrl}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    downloads: current.downloads.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, externalUrl: event.target.value } : item,
                    ),
                  }))
                }
              />
              <input
                className="input"
                placeholder="Ordre"
                value={entry.sortOrder}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    downloads: current.downloads.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, sortOrder: event.target.value } : item,
                    ),
                  }))
                }
              />
              <input
                className="input"
                type="file"
                accept=".zip,.7z,.rar,application/zip,application/x-zip-compressed,application/octet-stream"
                onChange={(event) => {
                  const file = event.target.files?.[0] || null;
                  setSelectedVariantFiles((current) => ({ ...current, [index]: file }));
                  setStatusMessage(file ? `已选择付费文件：${file.name}，请点击上传文件。` : "");
                }}
              />
              <button
                className="pill-button"
                type="button"
                disabled={!selectedVariantFiles[index] || busyKey === `upload-resource-file-${index}`}
                onClick={() => selectedVariantFiles[index] ? void uploadVariantFile(index, selectedVariantFiles[index] as File) : undefined}
              >
                {busyKey === `upload-resource-file-${index}` ? "上传中..." : "上传并绑定文件"}
              </button>
              <button
                className="pill-button"
                type="button"
                onClick={() =>
                  setDraft((current) => ({
                    ...current,
                    downloads: current.downloads.filter((_, itemIndex) => itemIndex !== index),
                  }))
                }
              >
                Supprimer
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="actions-row">
        <button className="cta-button" type="button" disabled={busyKey === "save-resource"} onClick={() => void saveResource()}>
          {busyKey === "save-resource" ? "Enregistrement..." : editingId ? "Mettre a jour la ressource" : "Ajouter la ressource"}
        </button>
      </div>

      </> : null}

      {activeTab === "edit" ? <>
      {lastDeleted ? (
        <div className="admin-restore-notice">
          <span>刚刚删除：{lastDeleted.title}</span>
          <button className="cta-button" type="button" onClick={() => void restoreResource()}>Restaurer 恢复</button>
        </div>
      ) : null}
      <div className="split-line" style={{ marginTop: 18 }}>
        <div>
          <h4 style={{ margin: 0 }}>Liste des outils existants</h4>
          <p className="tiny" style={{ marginTop: 6 }}>
            Les donnees chargees depuis Supabase apparaissent ici avec les boutons Modifier / Supprimer.
          </p>
        </div>
      </div>

      <div className="admin-dynamic-stack">
        {!loading && resources.length === 0 ? <p className="muted">Aucune ressource chargee pour le moment.</p> : null}
        {resources.map((resource) => (
          <div className="admin-inline-card" key={resource.id}>
            <div>
              <strong>{resource.title_fr}</strong>
              <p className="tiny">
                {(filesByResource[resource.id] || []).length} version(s) · {Number(resource.price_eur ?? 0).toFixed(2)} EUR · {resource.visible ? "Visible" : "Masquee"}
              </p>
            </div>
            <div className="actions-row">
              <button className="pill-button" type="button" disabled={resources.findIndex((entry) => entry.id === resource.id) === 0} onClick={() => void moveResource(resource.id, "up")}>↑</button>
              <button className="pill-button" type="button" disabled={resources.findIndex((entry) => entry.id === resource.id) === resources.length - 1} onClick={() => void moveResource(resource.id, "down")}>↓</button>
              <button className="pill-button" type="button" onClick={() => beginEdit(resource)}>
                Modifier
              </button>
              <button className="pill-button" type="button" onClick={() => void toggleResourceVisibility(resource)}>
                {resource.visible === false ? "Publier" : "Masquer"}
              </button>
              <button
                className="pill-button"
                type="button"
                disabled={busyKey === `delete-resource-${resource.id}`}
                onClick={() => void deleteResource(resource.id)}
              >
                Supprimer
              </button>
            </div>
          </div>
        ))}
      </div>
      </> : null}
    </div>
  );
}
