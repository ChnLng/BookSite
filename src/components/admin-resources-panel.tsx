"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { AdminProductDocumentsPanel } from "@/components/admin-product-documents-panel";
import { RichTextEditor } from "@/components/rich-text-editor";

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
  homepageSummaryFr: string;
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
  homepage_summary_fr?: string | null;
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
  homepageSummaryFr: "",
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
      homepageSummaryFr: resource.homepage_summary_fr || "",
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

  const resourceCount = useMemo(() => resources.length, [resources.length]);

  return (
    <div className="section-block">
      <div className="split-line">
        <div>
          <h3>资源 Outils & produits numériques</h3>
          <p className="tiny" style={{ marginTop: 6 }}>
            {resourceCount} produit(s) géré(s). Créez la fiche, puis ajoutez les fichiers privés payants.
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
      <div className="admin-resource-form-section">
        <div className="admin-form-section-heading"><strong>① 商品基本信息 · Informations du produit</strong><p className="tiny">这些内容展示在商品页。Slug 是网页地址代号，不会向用户展示。</p></div>
        <div className="input-group admin-form-grid">
          <label className="admin-field-label"><span>商品类目 · Catégorie</span><select className="input" value={draft.categoryId} onChange={(event) => setDraft({ ...draft, categoryId: event.target.value })}><option value="">选择类目 · Choisir une catégorie</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.titleFr} · {category.kind}</option>)}</select></label>
          <label className="admin-field-label"><span>网页地址代号 · Slug</span><input className="input" placeholder="calendrier-chinois-android" value={draft.slug} onChange={(event) => setDraft({ ...draft, slug: slugify(event.target.value) })} /><small>小写英文与连字符，例如 calendrier-chinois-android。</small></label>
          <div className="admin-field-label admin-field-full"><span>商品标题 · Titre affiché</span><RichTextEditor placeholder="例如：Calendrier lunisolaire chinois (Android)" value={draft.titleFr} onChange={(titleFr) => setDraft({ ...draft, titleFr })} rows={2} /></div>
          <label className="admin-field-label"><span>售价（欧元）· Prix EUR</span><input className="input" inputMode="decimal" placeholder="例如 1.68" value={draft.priceEur} onChange={(event) => setDraft({ ...draft, priceEur: event.target.value })} /><small>0 = 免费；付费商品请填写大于 0 的金额。</small></label>
          <label className="admin-field-label"><span>首页排序 · Ordre</span><input className="input" inputMode="numeric" placeholder="10" value={draft.sortOrder} onChange={(event) => setDraft({ ...draft, sortOrder: event.target.value })} /><small>数字小的排在前面：10、20、30。</small></label>
          <label className="admin-field-label admin-field-full"><span>公开外链（可选）· Lien externe public</span><input className="input" placeholder="仅用于公开网页；私有付费文件请留空" value={draft.externalUrl} onChange={(event) => setDraft({ ...draft, externalUrl: event.target.value })} /><small>⚠️ 不要填写 GitHub、Supabase 或付费文件链接；请在下方的私有文件区上传。</small></label>
          <label className="tiny admin-field-full"><input type="checkbox" checked={draft.visible} onChange={() => setDraft({ ...draft, visible: !draft.visible })} /> 商品可见 · Visible</label>
        </div>
      </div>

      <div className="admin-resource-form-section">
        <div className="admin-form-section-heading"><strong>② 商品介绍 · Description</strong><p className="tiny">详情介绍只出现在商品页；首页摘要只显示在主页跑马灯，会自动截短。</p></div>
        <div className="input-group admin-form-grid">
          <div className="admin-field-label admin-field-full"><span>详情介绍 · Résumé détaillé</span><RichTextEditor placeholder="完整介绍：功能、适用人群、安装/使用说明…" value={draft.summaryFr} onChange={(summaryFr) => setDraft({ ...draft, summaryFr })} /></div>
          <div className="admin-field-label admin-field-full"><span>首页短摘要 · Petit résumé pour le carrousel</span><RichTextEditor placeholder="用一两句话吸引用户，例如：适合初学者的…" value={draft.homepageSummaryFr} onChange={(homepageSummaryFr) => setDraft({ ...draft, homepageSummaryFr })} rows={2} /></div>
        </div>
      </div>

      <div className="admin-resource-form-section">
        <div className="admin-form-section-heading"><strong>③ 商品图片 · Visuels</strong><p className="tiny">封面与 QR 图片保存在 Supabase Storage，并自动绑定到这个商品；它们不是付款后才可见的私有文件。</p></div>
      <div className="admin-asset-upload-card">
        <strong>商品封面 · Image de couverture</strong>
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

      <div className="admin-asset-upload-card">
        <strong>二维码图片（可选）· Image QR</strong>
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
      </div>

      <div className="section-block admin-resource-form-section">
        <div className="split-line">
          <div><strong>④ 付费私有文件 · Documents numériques privés</strong><p className="tiny">上传路径：临时私有 Supabase Storage → 自动转存 GitHub 私有 Release → 用户付款后才得到受控下载链接。</p></div>
          <span className="tiny">类目决定允许格式</span>
        </div>
        {editingId ? (
          <AdminProductDocumentsPanel productKind="resource" productId={editingId} />
        ) : (
          <p className="tiny" style={{ marginTop: 10 }}>
            请先保存新商品，再进入“编辑已有”上传一个或多个私有文档。
          </p>
        )}
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
            Les données chargées depuis Supabase apparaissent ici avec les boutons Modifier / Supprimer.
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
