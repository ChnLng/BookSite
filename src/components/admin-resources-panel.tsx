"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

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
  qrImageUrl: string;
  externalUrl: string;
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
  qr_image_url: string | null;
  external_url: string | null;
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
  qrImageUrl: "",
  externalUrl: "",
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
  const { session } = useAuth();
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [resources, setResources] = useState<ResourceRow[]>([]);
  const [filesByResource, setFilesByResource] = useState<Record<string, ResourceFileRow[]>>({});
  const [draft, setDraft] = useState<ResourceDraft>(defaultDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [busyKey, setBusyKey] = useState<string | null>(null);

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
    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      return;
    }

    const [categoriesResult, resourcesResult, filesResult] = await Promise.all([
      supabase
        .from("categories")
        .select("id, title_fr, kind")
        .in("kind", ["resource", "custom"])
        .order("homepage_sort_order", { ascending: true }),
      supabase
        .from("resource_items")
        .select("id, category_id, slug, title_fr, summary_fr, qr_image_url, external_url, visible, sort_order")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true }),
      supabase
        .from("resource_item_files")
        .select("id, resource_id, platform, label_fr, file_path, external_url, sort_order")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true }),
    ]);

    setCategories(
      ((categoriesResult.data || []) as Array<{ id: string; title_fr: string | null; kind: string | null }>).map((item) => ({
        id: item.id,
        titleFr: item.title_fr || "Categorie",
        kind: item.kind || "resource",
      })),
    );
    setResources((resourcesResult.data || []) as ResourceRow[]);
    setFilesByResource(
      ((filesResult.data || []) as ResourceFileRow[]).reduce<Record<string, ResourceFileRow[]>>((accumulator, file) => {
        accumulator[file.resource_id] ||= [];
        accumulator[file.resource_id].push(file);
        return accumulator;
      }, {}),
    );
  };

  useEffect(() => {
    void loadData();
  }, []);

  const resetDraft = () => {
    setDraft(defaultDraft);
    setEditingId(null);
  };

  const beginEdit = (resource: ResourceRow) => {
    const relatedFiles = filesByResource[resource.id] || [];
    setEditingId(resource.id);
    setDraft({
      id: resource.id,
      categoryId: resource.category_id || "",
      slug: resource.slug || "",
      titleFr: resource.title_fr || "",
      summaryFr: resource.summary_fr || "",
      qrImageUrl: resource.qr_image_url || "",
      externalUrl: resource.external_url || "",
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
    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      return;
    }

    const normalizedSlug = slugify(draft.slug || draft.titleFr);

    if (!normalizedSlug || !draft.titleFr.trim()) {
      setStatusMessage("Ajoutez au minimum un titre et un slug.");
      return;
    }

    setBusyKey("save-resource");

    try {
      const payload = {
        category_id: draft.categoryId || null,
        slug: normalizedSlug,
        title_fr: draft.titleFr.trim(),
        summary_fr: draft.summaryFr.trim() || null,
        qr_image_url: draft.qrImageUrl.trim() || null,
        external_url: draft.externalUrl.trim() || null,
        visible: draft.visible,
        sort_order: Number(draft.sortOrder || 0),
      };

      let resourceId = editingId || "";

      if (editingId) {
        const { error } = await supabase.from("resource_items").update(payload).eq("id", editingId);
        if (error) {
          setStatusMessage(error.message);
          return;
        }
      } else {
        const { data, error } = await supabase.from("resource_items").insert(payload).select("id").single();
        if (error || !data?.id) {
          setStatusMessage(error?.message || "Creation de ressource impossible.");
          return;
        }
        resourceId = data.id as string;
      }

      await supabase.from("resource_item_files").delete().eq("resource_id", resourceId);

      const rows = draft.downloads
        .filter((entry) => entry.labelFr.trim() && (entry.filePath.trim() || entry.externalUrl.trim()))
        .map((entry, index) => ({
          resource_id: resourceId,
          platform: entry.platform,
          label_fr: entry.labelFr.trim(),
          file_path: entry.filePath.trim() || null,
          external_url: entry.externalUrl.trim() || null,
          sort_order: Number(entry.sortOrder || index * 10),
        }));

      if (rows.length > 0) {
        const { error } = await supabase.from("resource_item_files").insert(rows);
        if (error) {
          setStatusMessage(error.message);
          return;
        }
      }

      setStatusMessage("Ressource ludique enregistree.");
      resetDraft();
      await loadData();
    } finally {
      setBusyKey(null);
    }
  };

  const deleteResource = async (resourceId: string) => {
    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      return;
    }

    setBusyKey(`delete-resource-${resourceId}`);

    try {
      await supabase.from("resource_item_files").delete().eq("resource_id", resourceId);
      const { error } = await supabase.from("resource_items").delete().eq("id", resourceId);

      if (error) {
        setStatusMessage(error.message);
        return;
      }

      setStatusMessage("Ressource supprimee.");
      if (editingId === resourceId) {
        resetDraft();
      }
      await loadData();
    } finally {
      setBusyKey(null);
    }
  };

  const uploadQrImage = async (file: File) => {
    const filename = `${slugify(draft.slug || draft.titleFr || `qr-${Date.now()}`)}-qr.${file.name.split(".").pop() || "png"}`;

    setBusyKey("upload-resource-qr");

    try {
      const assetPath = await uploadAsset("image", file, filename);
      setDraft((current) => ({ ...current, qrImageUrl: assetPath }));
      setStatusMessage("QR image telechargee.");
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Upload QR impossible.");
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
      setStatusMessage("Fichier multi-plateforme telecharge.");
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
        <button className="pill-button" type="button" onClick={resetDraft}>
          Nouvelle ressource
        </button>
      </div>

      {statusMessage ? <p className="tiny">{statusMessage}</p> : null}

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
          placeholder="Ordre"
          value={draft.sortOrder}
          onChange={(event) => setDraft({ ...draft, sortOrder: event.target.value })}
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
            const file = event.target.files?.[0];
            if (file) {
              void uploadQrImage(file);
            }
          }}
        />
        <span className="tiny">Uploader un QR code image</span>
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
                placeholder="URL du fichier ZIP"
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
                  const file = event.target.files?.[0];
                  if (file) {
                    void uploadVariantFile(index, file);
                  }
                }}
              />
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

      <div className="admin-dynamic-stack">
        {resources.map((resource) => (
          <div className="admin-inline-card" key={resource.id}>
            <div>
              <strong>{resource.title_fr}</strong>
              <p className="tiny">
                {(filesByResource[resource.id] || []).length} version(s) · {resource.visible ? "Visible" : "Masquee"}
              </p>
            </div>
            <div className="actions-row">
              <button className="pill-button" type="button" onClick={() => beginEdit(resource)}>
                Modifier
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
    </div>
  );
}
