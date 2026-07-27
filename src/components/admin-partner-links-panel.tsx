"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

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
  const { session } = useAuth();
  const [links, setLinks] = useState<PartnerLinkRow[]>([]);
  const [draft, setDraft] = useState<PartnerDraft>(defaultDraft);
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
    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      return;
    }

    const { data } = await supabase
      .from("partner_links")
      .select("id, title_fr, icon_url, target_url, sort_order, visible")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    setLinks((data || []) as PartnerLinkRow[]);
  };

  useEffect(() => {
    void loadData();
  }, []);

  const resetDraft = () => {
    setDraft(defaultDraft);
    setEditingId(null);
  };

  const saveLink = async () => {
    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      return;
    }

    if (!draft.titleFr.trim() || !draft.targetUrl.trim() || !draft.iconUrl.trim()) {
      setStatusMessage("Remplissez le titre, l'icone et l'URL cible.");
      return;
    }

    setBusyKey("save-partner");

    try {
      const payload = {
        title_fr: draft.titleFr.trim(),
        icon_url: draft.iconUrl.trim(),
        target_url: draft.targetUrl.trim(),
        sort_order: Number(draft.sortOrder || 0),
        visible: draft.visible,
      };

      if (editingId) {
        const { error } = await supabase.from("partner_links").update(payload).eq("id", editingId);
        if (error) {
          setStatusMessage(error.message);
          return;
        }
      } else {
        const { error } = await supabase.from("partner_links").insert(payload);
        if (error) {
          setStatusMessage(error.message);
          return;
        }
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
    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      return;
    }

    setBusyKey(`delete-link-${linkId}`);

    try {
      const { error } = await supabase.from("partner_links").delete().eq("id", linkId);
      if (error) {
        setStatusMessage(error.message);
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
    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      return;
    }

    const currentIndex = links.findIndex((link) => link.id === linkId);
    const targetIndex = direction === "left" ? currentIndex - 1 : currentIndex + 1;

    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= links.length) {
      return;
    }

    const currentLink = links[currentIndex];
    const targetLink = links[targetIndex];
    setBusyKey(`move-link-${linkId}-${direction}`);

    try {
      const [{ error: currentError }, { error: targetError }] = await Promise.all([
        supabase.from("partner_links").update({ sort_order: targetLink.sort_order || 0 }).eq("id", currentLink.id),
        supabase.from("partner_links").update({ sort_order: currentLink.sort_order || 0 }).eq("id", targetLink.id),
      ]);

      if (currentError || targetError) {
        setStatusMessage(currentError?.message || targetError?.message || "Tri impossible.");
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
        <button className="pill-button" type="button" onClick={resetDraft}>
          Nouveau lien
        </button>
      </div>

      {statusMessage ? <p className="tiny">{statusMessage}</p> : null}

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

      <div className="admin-dynamic-stack">
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
    </div>
  );
}
