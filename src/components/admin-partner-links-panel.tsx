"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";

type PartnerLinkRow = {
  id: string;
  title_fr: string | null;
  icon_url: string | null;
  target_url: string | null;
  sort_order: number | null;
  visible: boolean | null;
};

type PartnerDraft = {
  id?: string;
  titleFr: string;
  iconUrl: string;
  targetUrl: string;
  sortOrder: string;
  visible: boolean;
};

const defaultDraft: PartnerDraft = {
  titleFr: "",
  iconUrl: "",
  targetUrl: "",
  sortOrder: "10",
  visible: true,
};

export function AdminPartnerLinksPanel() {
  const { session, loading: authLoading } = useAuth();
  const [links, setLinks] = useState<PartnerLinkRow[]>([]);
  const [draft, setDraft] = useState<PartnerDraft>(defaultDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"create" | "edit">("create");

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

  const uploadIcon = async (file: File) => {
    const body = new FormData();
    body.append("kind", "image");
    body.append("filename", `partner-${Date.now()}.${file.name.split(".").pop() || "png"}`);
    body.append("file", file);

    const response = await authorizedFetch("/api/admin/assets", {
      method: "POST",
      body,
    });
    const result = (await response.json()) as { ok?: boolean; message?: string; assetPath?: string };

    if (!response.ok || !result.assetPath) {
      throw new Error(result.message || "Upload de l'icone impossible.");
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
      const response = await authorizedFetch("/api/admin/partner-links", { cache: "no-store" });
      const result = (await response.json()) as { ok?: boolean; message?: string; links?: PartnerLinkRow[] };

      if (!response.ok || !result.ok) {
        setStatusMessage(result.message || "Chargement des liens impossible.");
        setLinks([]);
        return;
      }

      setLinks(result.links || []);
      setStatusMessage("");
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Chargement des liens impossible.");
      setLinks([]);
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
  };

  const startNewLink = () => {
    resetDraft();
    setActiveTab("create");
  };

  const saveLink = async () => {
    if (!draft.titleFr.trim() || !draft.targetUrl.trim() || !draft.iconUrl.trim()) {
      setStatusMessage("Remplissez le titre, l'icone et l'URL cible.");
      return;
    }

    setBusyKey("save-partner");

    try {
      const response = await authorizedFetch("/api/admin/partner-links", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          payload: {
            ...draft,
            id: editingId || undefined,
          },
        }),
      });
      const result = (await response.json()) as { ok?: boolean; message?: string };

      if (!response.ok || !result.ok) {
        setStatusMessage(result.message || "Enregistrement impossible.");
        return;
      }

      setStatusMessage("Lien partenaire enregistre.");
      resetDraft();
      await loadData();
    } finally {
      setBusyKey(null);
    }
  };

  const editLink = (link: PartnerLinkRow) => {
    setEditingId(link.id);
    setActiveTab("edit");
    setDraft({
      id: link.id,
      titleFr: link.title_fr || "",
      iconUrl: link.icon_url || "",
      targetUrl: link.target_url || "",
      sortOrder: String(link.sort_order || 0),
      visible: link.visible !== false,
    });
  };

  const deleteLink = async (linkId: string) => {
    setBusyKey(`delete-link-${linkId}`);

    try {
      const response = await authorizedFetch("/api/admin/partner-links", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id: linkId }),
      });
      const result = (await response.json()) as { ok?: boolean; message?: string };

      if (!response.ok || !result.ok) {
        setStatusMessage(result.message || "Suppression impossible.");
        return;
      }

      setStatusMessage("Lien partenaire supprime.");
      if (editingId === linkId) {
        resetDraft();
      }
      await loadData();
    } finally {
      setBusyKey(null);
    }
  };

  const moveLink = async (linkId: string, direction: "left" | "right") => {
    const currentIndex = links.findIndex((link) => link.id === linkId);
    const targetIndex = direction === "left" ? currentIndex - 1 : currentIndex + 1;

    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= links.length) {
      return;
    }

    const currentLink = links[currentIndex];
    const targetLink = links[targetIndex];
    setBusyKey(`move-link-${linkId}-${direction}`);

    try {
      const response = await authorizedFetch("/api/admin/partner-links", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          currentId: currentLink.id,
          targetId: targetLink.id,
          currentSortOrder: currentLink.sort_order || 0,
          targetSortOrder: targetLink.sort_order || 0,
        }),
      });
      const result = (await response.json()) as { ok?: boolean; message?: string };

      if (!response.ok || !result.ok) {
        setStatusMessage(result.message || "Tri impossible.");
        return;
      }

      setStatusMessage("Ordre des liens mis a jour.");
      await loadData();
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <div className="section-block">
      <div className="split-line">
        <div>
          <h3>Liens partenaires 友情链接</h3>
          <p className="tiny" style={{ marginTop: 6 }}>
            Icônes only, ouverture en nouvel onglet, tri gauche / droite depuis l&apos;admin.
          </p>
        </div>
      </div>

      <div className="admin-category-tabs" role="tablist" aria-label="Gestion des liens partenaires">
        <button
          className={`admin-category-tab ${activeTab === "create" ? "active" : ""}`}
          type="button"
          role="tab"
          aria-selected={activeTab === "create"}
          onClick={startNewLink}
        >
          添加新的 Ajouter un nouveau lien
        </button>
        <button
          className={`admin-category-tab ${activeTab === "edit" ? "active" : ""}`}
          type="button"
          role="tab"
          aria-selected={activeTab === "edit"}
          onClick={() => { resetDraft(); setActiveTab("edit"); }}
        >
          编辑已有 Modifier les liens
        </button>
      </div>

      {statusMessage ? <p className="tiny">{statusMessage}</p> : null}
      {loading ? <p className="muted">Chargement des liens...</p> : null}

      {activeTab === "create" || editingId ? <>
      <div className="input-group admin-form-grid">
        <input
          className="input"
          placeholder="Nom du partenaire"
          value={draft.titleFr}
          onChange={(event) => setDraft({ ...draft, titleFr: event.target.value })}
        />
        <input
          className="input"
          placeholder="Icone /images/..."
          value={draft.iconUrl}
          onChange={(event) => setDraft({ ...draft, iconUrl: event.target.value })}
        />
        <input
          className="input"
          placeholder="URL cible"
          value={draft.targetUrl}
          onChange={(event) => setDraft({ ...draft, targetUrl: event.target.value })}
        />
        <input
          className="input"
          placeholder="Ordre"
          value={draft.sortOrder}
          onChange={(event) => setDraft({ ...draft, sortOrder: event.target.value })}
        />
        <label className="tiny">
          <input
            type="checkbox"
            checked={draft.visible}
            onChange={() => setDraft({ ...draft, visible: !draft.visible })}
          />{" "}
          Visible
        </label>
      </div>

      <div className="actions-row">
        <input
          className="input"
          type="file"
          accept="image/*"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) {
              void (async () => {
                try {
                  setBusyKey("upload-partner-icon");
                  const assetPath = await uploadIcon(file);
                  setDraft((current) => ({ ...current, iconUrl: assetPath }));
                  setStatusMessage("Icone telechargee.");
                } catch (error) {
                  setStatusMessage(error instanceof Error ? error.message : "Upload impossible.");
                } finally {
                  setBusyKey(null);
                }
              })();
            }
          }}
        />
        <button className="cta-button" type="button" disabled={busyKey === "save-partner"} onClick={() => void saveLink()}>
          {busyKey === "save-partner" ? "Enregistrement..." : editingId ? "Mettre a jour le lien" : "Ajouter le lien"}
        </button>
      </div>

      </> : null}

      {activeTab === "edit" ? <>
      <div className="split-line" style={{ marginTop: 18 }}>
        <div>
          <h4 style={{ margin: 0 }}>Liste des liens existants</h4>
          <p className="tiny" style={{ marginTop: 6 }}>
            Les liens deja presents dans la base sont rendus ci-dessous avec Modifier / Supprimer.
          </p>
        </div>
      </div>

      <div className="admin-dynamic-stack">
        {!loading && links.length === 0 ? <p className="muted">Aucun lien partenaire charge.</p> : null}
        {links.map((link) => (
          <div className="admin-inline-card" key={link.id}>
            <div>
              <strong>{link.title_fr}</strong>
              <p className="tiny">{link.target_url}</p>
            </div>
            <div className="actions-row">
              <button className="pill-button" type="button" onClick={() => void moveLink(link.id, "left")}>
                ←
              </button>
              <button className="pill-button" type="button" onClick={() => void moveLink(link.id, "right")}>
                →
              </button>
              <button className="pill-button" type="button" onClick={() => editLink(link)}>
                Modifier
              </button>
              <button
                className="pill-button"
                type="button"
                disabled={busyKey === `delete-link-${link.id}`}
                onClick={() => void deleteLink(link.id)}
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
