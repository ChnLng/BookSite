"use client";

import { useEffect, useMemo, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import { type HomeCategory } from "@/lib/home-sections";
import { hasSupabaseConfig } from "@/lib/site-config";

type CategoryDraft = {
  id?: string;
  slug: string;
  titleFr: string;
  titleZh: string;
  kind: "book" | "resource" | "custom";
  homepageVisible: boolean;
  homepageSortOrder: string;
  homepagePinned: boolean;
  iconName: string;
  introFr: string;
  allowedFileTypes: string;
};

type RuleDraft = {
  id?: string;
  fieldKey: string;
  labelFr: string;
  fieldType: "text" | "textarea" | "url" | "file" | "image" | "number" | "boolean";
  required: boolean;
  showInCard: boolean;
  placeholderFr: string;
  acceptedFileTypes: string;
  sortOrder: string;
};

type EntryDraft = {
  titleFr: string;
  subtitleFr: string;
  summaryFr: string;
  coverImageUrl: string;
  externalUrl: string;
  fileUrl: string;
  visible: boolean;
  sortOrder: string;
  payload: Record<string, string>;
};

type CategoryEntryRow = {
  id: string;
  category_id: string;
  title_fr: string | null;
  subtitle_fr: string | null;
  summary_fr: string | null;
  cover_image_url: string | null;
  external_url: string | null;
  file_url: string | null;
  visible: boolean | null;
  sort_order: number | null;
  payload: Record<string, unknown> | null;
};

const defaultCategoryDraft: CategoryDraft = {
  slug: "",
  titleFr: "",
  titleZh: "",
  kind: "custom",
  homepageVisible: true,
  homepageSortOrder: "20",
  homepagePinned: false,
  iconName: "sparkles",
  introFr: "",
  allowedFileTypes: "",
};

const defaultRuleDraft = (overrides: Partial<RuleDraft> = {}): RuleDraft => ({
  fieldKey: "",
  labelFr: "",
  fieldType: "text",
  required: false,
  showInCard: true,
  placeholderFr: "",
  acceptedFileTypes: "",
  sortOrder: "10",
  ...overrides,
});

const initialRuleDrafts = (): RuleDraft[] => [
  defaultRuleDraft({ fieldKey: "nom", labelFr: "Nom", fieldType: "text", sortOrder: "10" }),
  defaultRuleDraft({ fieldKey: "image", labelFr: "Image", fieldType: "image", acceptedFileTypes: ".jpg, .jpeg, .png, .webp", sortOrder: "20" }),
  defaultRuleDraft({ fieldKey: "modele", labelFr: "Modèle 3D", fieldType: "file", acceptedFileTypes: ".fbx, .gltf, .glb", sortOrder: "30" }),
  defaultRuleDraft({ fieldKey: "document", labelFr: "Document", fieldType: "file", acceptedFileTypes: ".doc, .docx, .xls, .xlsx, .pdf", sortOrder: "40" }),
];

const defaultEntryDraft: EntryDraft = {
  titleFr: "",
  subtitleFr: "",
  summaryFr: "",
  coverImageUrl: "",
  externalUrl: "",
  fileUrl: "",
  visible: true,
  sortOrder: "10",
  payload: {},
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

export function AdminCategoryEnginePanel() {
  const [activeTab, setActiveTab] = useState<"new" | "existing">("new");
  const [categories, setCategories] = useState<HomeCategory[]>([]);
  const [rulesByCategory, setRulesByCategory] = useState<Record<string, RuleDraft[]>>({});
  const [entriesByCategory, setEntriesByCategory] = useState<Record<string, CategoryEntryRow[]>>({});
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [categoryDraft, setCategoryDraft] = useState<CategoryDraft>(defaultCategoryDraft);
  const [ruleDrafts, setRuleDrafts] = useState<RuleDraft[]>(initialRuleDrafts());
  const [entryDraft, setEntryDraft] = useState<EntryDraft>(defaultEntryDraft);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const loadData = async () => {
    const supabase = getSupabaseBrowserClient();

    if (!hasSupabaseConfig || !supabase) {
      setStatusMessage("Supabase non configure pour le moteur de categories.");
      return;
    }

    const [categoriesResult, rulesResult, entriesResult] = await Promise.all([
      supabase
        .from("categories")
        .select("id, slug, title_fr, title_zh, kind, homepage_visible, homepage_sort_order, homepage_pinned, icon_name, intro_fr, allowed_file_types")
        .order("homepage_pinned", { ascending: false })
        .order("homepage_sort_order", { ascending: true })
        .order("created_at", { ascending: true }),
      supabase
        .from("category_field_rules")
        .select("id, category_id, field_key, label_fr, field_type, required, show_in_card, placeholder_fr, accepted_file_types, sort_order")
        .order("sort_order", { ascending: true }),
      supabase
        .from("category_entries")
        .select("id, category_id, title_fr, subtitle_fr, summary_fr, cover_image_url, external_url, file_url, visible, sort_order, payload")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true }),
    ]);

    const nextCategories = ((categoriesResult.data || []) as Array<Record<string, unknown>>).map((row) => ({
      id: String(row.id),
      slug: String(row.slug || row.id),
      titleFr: String(row.title_fr || "Categorie"),
      titleZh: String(row.title_zh || ""),
      kind: row.kind === "book" || row.kind === "resource" ? row.kind : "custom",
      homepageVisible: Boolean(row.homepage_visible),
      homepageSortOrder: Number(row.homepage_sort_order || 0),
      homepagePinned: Boolean(row.homepage_pinned),
      iconName: String(row.icon_name || "sparkles"),
      introFr: String(row.intro_fr || ""),
      allowedFileTypes: Array.isArray(row.allowed_file_types) ? (row.allowed_file_types as string[]) : [],
    })) as HomeCategory[];

    const nextRulesByCategory = ((rulesResult.data || []) as Array<Record<string, unknown>>).reduce<Record<string, RuleDraft[]>>(
      (accumulator, row) => {
        const categoryId = String(row.category_id);
        accumulator[categoryId] ||= [];
        accumulator[categoryId].push({
          id: String(row.id),
          fieldKey: String(row.field_key || ""),
          labelFr: String(row.label_fr || ""),
          fieldType: (String(row.field_type || "text") as RuleDraft["fieldType"]),
          required: Boolean(row.required),
          showInCard: Boolean(row.show_in_card),
          placeholderFr: String(row.placeholder_fr || ""),
          acceptedFileTypes: Array.isArray(row.accepted_file_types) ? (row.accepted_file_types as string[]).join(", ") : "",
          sortOrder: String(row.sort_order || 0),
        });
        return accumulator;
      },
      {},
    );

    const nextEntriesByCategory = ((entriesResult.data || []) as CategoryEntryRow[]).reduce<Record<string, CategoryEntryRow[]>>(
      (accumulator, entry) => {
        accumulator[entry.category_id] ||= [];
        accumulator[entry.category_id].push(entry);
        return accumulator;
      },
      {},
    );

    setCategories(nextCategories);
    setRulesByCategory(nextRulesByCategory);
    setEntriesByCategory(nextEntriesByCategory);
    if (!selectedCategoryId && nextCategories.length > 0) {
      setSelectedCategoryId(nextCategories[0].id);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const selectedCategory = useMemo(
    () => categories.find((category) => category.id === selectedCategoryId) || null,
    [categories, selectedCategoryId],
  );

  const selectedRules = selectedCategory ? rulesByCategory[selectedCategory.id] || [] : [];
  const selectedEntries = selectedCategory ? entriesByCategory[selectedCategory.id] || [] : [];

  const syncCategoryDraft = (category: HomeCategory) => {
    setCategoryDraft({
      id: category.id,
      slug: category.slug,
      titleFr: category.titleFr,
      titleZh: category.titleZh,
      kind: category.kind,
      homepageVisible: category.homepageVisible,
      homepageSortOrder: String(category.homepageSortOrder),
      homepagePinned: category.homepagePinned,
      iconName: category.iconName,
      introFr: category.introFr,
      allowedFileTypes: category.allowedFileTypes.join(", "),
    });
    setRuleDrafts(rulesByCategory[category.id]?.length ? rulesByCategory[category.id] : initialRuleDrafts());
    setEntryDraft(defaultEntryDraft);
    setEditingEntryId(null);
  };

  useEffect(() => {
    if (selectedCategory) {
      syncCategoryDraft(selectedCategory);
    }
  }, [selectedCategory, rulesByCategory]);

  const saveCategory = async () => {
    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      return;
    }

    const normalizedSlug = slugify(categoryDraft.slug || categoryDraft.titleFr || categoryDraft.titleZh);
    if (!normalizedSlug || !categoryDraft.titleFr.trim()) {
      setStatusMessage("Renseignez au minimum le titre FR et le slug de la categorie.");
      return;
    }

    setBusyKey("save-category-engine");

    try {
      if (categoryDraft.homepagePinned) {
        let clearPinnedQuery = supabase.from("categories").update({ homepage_pinned: false });
        if (categoryDraft.id) clearPinnedQuery = clearPinnedQuery.neq("id", categoryDraft.id);
        const { error } = await clearPinnedQuery;
        if (error) {
          setStatusMessage(error.message);
          return;
        }
      }

      let categoryId = categoryDraft.id || "";
      const payload = {
        slug: normalizedSlug,
        title_fr: categoryDraft.titleFr.trim(),
        title_zh: categoryDraft.titleZh.trim() || null,
        kind: categoryDraft.kind,
        homepage_visible: categoryDraft.homepageVisible,
        homepage_sort_order: Number(categoryDraft.homepageSortOrder || 0),
        homepage_pinned: categoryDraft.homepagePinned,
        icon_name: categoryDraft.iconName.trim() || "sparkles",
        intro_fr: categoryDraft.introFr.trim() || null,
        allowed_file_types: categoryDraft.allowedFileTypes
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
      };

      if (categoryDraft.id) {
        const { error } = await supabase.from("categories").update(payload).eq("id", categoryDraft.id);
        if (error) {
          setStatusMessage(error.message);
          return;
        }
        categoryId = categoryDraft.id;
      } else {
        const { data, error } = await supabase.from("categories").insert(payload).select("id").single();
        if (error || !data?.id) {
          setStatusMessage(error?.message || "Creation de categorie impossible.");
          return;
        }
        categoryId = data.id as string;
        setSelectedCategoryId(categoryId);
      }

      await supabase.from("category_field_rules").delete().eq("category_id", categoryId);

      const validRules = ruleDrafts
        .filter((rule) => rule.fieldKey.trim() && rule.labelFr.trim())
        .map((rule, index) => ({
          category_id: categoryId,
          field_key: slugify(rule.fieldKey).replace(/-/g, "_"),
          label_fr: rule.labelFr.trim(),
          field_type: rule.fieldType,
          required: rule.required,
          show_in_card: rule.showInCard,
          placeholder_fr: rule.placeholderFr.trim() || null,
          accepted_file_types: rule.acceptedFileTypes.split(",").map((item) => item.trim().toLowerCase()).filter(Boolean),
          sort_order: Number(rule.sortOrder || index * 10),
        }));

      if (validRules.length > 0) {
        const { error } = await supabase.from("category_field_rules").insert(validRules);
        if (error) {
          setStatusMessage(error.message);
          return;
        }
      }

      setStatusMessage("Categorie et regles enregistrees.");
      await loadData();
    } finally {
      setBusyKey(null);
    }
  };

  const startNewCategory = () => {
    setSelectedCategoryId("");
    setCategoryDraft(defaultCategoryDraft);
    setRuleDrafts(initialRuleDrafts());
    setEntryDraft(defaultEntryDraft);
    setEditingEntryId(null);
  };

  const saveEntry = async () => {
    const supabase = getSupabaseBrowserClient();
    const categoryId = categoryDraft.id || selectedCategoryId;

    if (!supabase || !categoryId) {
      setStatusMessage("Choisissez d'abord une categorie.");
      return;
    }

    if (!entryDraft.titleFr.trim()) {
      setStatusMessage("Ajoutez au moins un titre pour le contenu.");
      return;
    }

    setBusyKey("save-entry");

    try {
      const payload = {
        category_id: categoryId,
        title_fr: entryDraft.titleFr.trim(),
        subtitle_fr: entryDraft.subtitleFr.trim() || null,
        summary_fr: entryDraft.summaryFr.trim() || null,
        cover_image_url: entryDraft.coverImageUrl.trim() || null,
        external_url: entryDraft.externalUrl.trim() || null,
        file_url: entryDraft.fileUrl.trim() || null,
        visible: entryDraft.visible,
        sort_order: Number(entryDraft.sortOrder || 0),
        payload: entryDraft.payload,
      };

      if (editingEntryId) {
        const { error } = await supabase.from("category_entries").update(payload).eq("id", editingEntryId);
        if (error) {
          setStatusMessage(error.message);
          return;
        }
      } else {
        const { error } = await supabase.from("category_entries").insert(payload);
        if (error) {
          setStatusMessage(error.message);
          return;
        }
      }

      setEntryDraft(defaultEntryDraft);
      setEditingEntryId(null);
      setStatusMessage("Contenu de categorie enregistre.");
      await loadData();
    } finally {
      setBusyKey(null);
    }
  };

  const editEntry = (entry: CategoryEntryRow) => {
    const nextPayload = Object.fromEntries(
      selectedRules.map((rule) => [rule.fieldKey, String(entry.payload?.[rule.fieldKey] || "")]),
    );

    setEditingEntryId(entry.id);
    setEntryDraft({
      titleFr: entry.title_fr || "",
      subtitleFr: entry.subtitle_fr || "",
      summaryFr: entry.summary_fr || "",
      coverImageUrl: entry.cover_image_url || "",
      externalUrl: entry.external_url || "",
      fileUrl: entry.file_url || "",
      visible: entry.visible !== false,
      sortOrder: String(entry.sort_order || 0),
      payload: nextPayload,
    });
  };

  const deleteEntry = async (entryId: string) => {
    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      return;
    }

    setBusyKey(`delete-entry-${entryId}`);

    try {
      const { error } = await supabase.from("category_entries").delete().eq("id", entryId);
      if (error) {
        setStatusMessage(error.message);
        return;
      }

      setStatusMessage("Contenu supprime.");
      await loadData();
    } finally {
      setBusyKey(null);
    }
  };

  const moveCategory = async (categoryId: string, direction: "up" | "down") => {
    const supabase = getSupabaseBrowserClient();
    const movable = categories.filter((category) => category.slug !== "liens");
    const index = movable.findIndex((category) => category.id === categoryId);
    const targetIndex = direction === "up" ? index - 1 : index + 1;

    if (!supabase || index < 0 || targetIndex < 0 || targetIndex >= movable.length) return;

    setBusyKey(`move-category-${categoryId}`);
    try {
      const current = movable[index];
      const target = movable[targetIndex];
      const currentOrder = current.homepageSortOrder;
      const targetOrder = target.homepageSortOrder;
      const [currentResult, targetResult] = await Promise.all([
        supabase.from("categories").update({ homepage_sort_order: targetOrder }).eq("id", current.id),
        supabase.from("categories").update({ homepage_sort_order: currentOrder }).eq("id", target.id),
      ]);
      const error = currentResult.error || targetResult.error;

      if (error) {
        setStatusMessage(error.message);
        return;
      }
      setStatusMessage(direction === "up" ? "Catégorie déplacée vers le haut." : "Catégorie déplacée vers le bas.");
      await loadData();
    } finally {
      setBusyKey(null);
    }
  };

  const togglePinnedCategory = async (category: HomeCategory) => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase || category.slug === "liens") return;

    setBusyKey(`pin-category-${category.id}`);
    try {
      if (!category.homepagePinned) {
        const { error: clearError } = await supabase.from("categories").update({ homepage_pinned: false }).neq("id", category.id);
        if (clearError) {
          setStatusMessage(clearError.message);
          return;
        }
      }

      const { error } = await supabase
        .from("categories")
        .update({ homepage_pinned: !category.homepagePinned })
        .eq("id", category.id);

      if (error) {
        setStatusMessage(error.message);
        return;
      }
      setStatusMessage(category.homepagePinned ? "Catégorie désépinglée." : "Catégorie épinglée en tête de l’accueil.");
      await loadData();
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <div className="section-block">
      <div className="split-line">
        <div>
          <h3>Gestion des catégories 类目管理</h3>
          <p className="tiny" style={{ marginTop: 6 }}>
            Creez des categories flexibles, definissez leurs champs et ajoutez ensuite des contenus relies.
          </p>
        </div>
      </div>

      {statusMessage ? <p className="tiny">{statusMessage}</p> : null}

      <div className="admin-category-tabs" role="tablist" aria-label="Gestion des catégories">
        <button
          className={activeTab === "new" ? "admin-category-tab active" : "admin-category-tab"}
          type="button"
          role="tab"
          aria-selected={activeTab === "new"}
          onClick={() => {
            setActiveTab("new");
            startNewCategory();
          }}
        >
          Ajouter une catégorie 新增类目
        </button>
        <button
          className={activeTab === "existing" ? "admin-category-tab active" : "admin-category-tab"}
          type="button"
          role="tab"
          aria-selected={activeTab === "existing"}
          onClick={() => {
            setActiveTab("existing");
            const firstCategory = categories[0];
            if (firstCategory) setSelectedCategoryId(firstCategory.id);
          }}
        >
          Catégories existantes 现有类目
        </button>
      </div>

      {activeTab === "existing" ? <div className="section-block">
        <label className="tiny" htmlFor="engine-category-select">
          Categories existantes
        </label>
        <select
          id="engine-category-select"
          className="input"
          value={selectedCategoryId}
          onChange={(event) => setSelectedCategoryId(event.target.value)}
        >
          <option value="">Choisir une categorie</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.titleFr} · {category.kind}
            </option>
          ))}
        </select>
        <div className="admin-category-order-list">
          {categories.map((category, index) => {
            const isLinks = category.slug === "liens";
            return (
              <div className={category.homepagePinned ? "admin-category-order-row pinned" : "admin-category-order-row"} key={category.id}>
                <button className="admin-category-name-button" type="button" onClick={() => setSelectedCategoryId(category.id)}>
                  {category.titleFr} <span className="tiny">({category.kind})</span>
                </button>
                {category.homepagePinned ? <span className="admin-pin-badge" title="Épinglée">📌</span> : null}
                <div className="actions-row">
                  <button className="pill-button" type="button" disabled={isLinks || index === 0 || busyKey !== null} onClick={() => void moveCategory(category.id, "up")}>↑ Monter</button>
                  <button className="pill-button" type="button" disabled={isLinks || index === categories.length - 1 || busyKey !== null} onClick={() => void moveCategory(category.id, "down")}>↓ Descendre</button>
                  <button className="pill-button" type="button" disabled={isLinks || busyKey !== null} onClick={() => void togglePinnedCategory(category)}>
                    {category.homepagePinned ? "Retirer 📌" : "Épingler 📌"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div> : null}

      <div className="input-group admin-form-grid">
        <input
          className="input"
          placeholder="Slug"
          value={categoryDraft.slug}
          onChange={(event) => setCategoryDraft({ ...categoryDraft, slug: slugify(event.target.value) })}
        />
        <input
          className="input"
          placeholder="Titre FR"
          value={categoryDraft.titleFr}
          onChange={(event) => setCategoryDraft({ ...categoryDraft, titleFr: event.target.value })}
        />
        <input
          className="input"
          placeholder="Titre ZH"
          value={categoryDraft.titleZh}
          onChange={(event) => setCategoryDraft({ ...categoryDraft, titleZh: event.target.value })}
        />
        <select
          className="input"
          value={categoryDraft.kind}
          onChange={(event) =>
            setCategoryDraft({
              ...categoryDraft,
              kind: event.target.value as CategoryDraft["kind"],
            })
          }
        >
          <option value="book">Livres</option>
          <option value="resource">Ressources</option>
          <option value="custom">Categorie libre</option>
        </select>
        <input
          className="input"
          placeholder="Ordre accueil"
          value={categoryDraft.homepageSortOrder}
          onChange={(event) => setCategoryDraft({ ...categoryDraft, homepageSortOrder: event.target.value })}
        />
        <label className="tiny">
          <input
            type="checkbox"
            checked={categoryDraft.homepagePinned}
            disabled={categoryDraft.slug === "liens"}
            onChange={() => setCategoryDraft({ ...categoryDraft, homepagePinned: !categoryDraft.homepagePinned })}
          />{" "}
          Épingler en haut de l&apos;accueil 📌
        </label>
        <input
          className="input"
          placeholder="Icone lucide (sparkles, gamepad, tools...)"
          value={categoryDraft.iconName}
          onChange={(event) => setCategoryDraft({ ...categoryDraft, iconName: event.target.value })}
        />
        <input
          className="input"
          placeholder="Formats autorises (.pdf, .zip...)"
          value={categoryDraft.allowedFileTypes}
          onChange={(event) => setCategoryDraft({ ...categoryDraft, allowedFileTypes: event.target.value })}
        />
        <label className="tiny">
          <input
            type="checkbox"
            checked={categoryDraft.homepageVisible}
            onChange={() =>
              setCategoryDraft({
                ...categoryDraft,
                homepageVisible: !categoryDraft.homepageVisible,
              })
            }
          />{" "}
          Afficher sur l&apos;accueil
        </label>
        <textarea
          className="textarea"
          placeholder="Introduction FR"
          value={categoryDraft.introFr}
          onChange={(event) => setCategoryDraft({ ...categoryDraft, introFr: event.target.value })}
        />
      </div>

      <div className="section-block">
        <div className="split-line">
          <strong>Regles de champs 自定义字段</strong>
          <button
            className="pill-button"
            type="button"
            onClick={() => setRuleDrafts((current) => [...current, defaultRuleDraft()])}
          >
            Ajouter un champ
          </button>
        </div>
        <div className="admin-dynamic-stack">
          {ruleDrafts.map((rule, index) => (
            <div className="admin-inline-card" key={`${rule.id || "new"}-${index}`}>
              <input
                className="input"
                placeholder="field_key"
                value={rule.fieldKey}
                onChange={(event) =>
                  setRuleDrafts((current) =>
                    current.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, fieldKey: event.target.value } : item,
                    ),
                  )
                }
              />
              <input
                className="input"
                placeholder="Label FR"
                value={rule.labelFr}
                onChange={(event) =>
                  setRuleDrafts((current) =>
                    current.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, labelFr: event.target.value } : item,
                    ),
                  )
                }
              />
              <select
                className="input"
                value={rule.fieldType}
                onChange={(event) =>
                  setRuleDrafts((current) =>
                    current.map((item, itemIndex) =>
                      itemIndex === index
                        ? { ...item, fieldType: event.target.value as RuleDraft["fieldType"] }
                        : item,
                    ),
                  )
                }
              >
                <option value="text">Texte</option>
                <option value="textarea">Texte long</option>
                <option value="url">Lien externe</option>
                <option value="file">Fichier</option>
                <option value="image">Image</option>
                <option value="number">Nombre</option>
                <option value="boolean">Oui / Non</option>
              </select>
              {(rule.fieldType === "file" || rule.fieldType === "image") ? (
                <input
                  className="input"
                  placeholder="Extensions autorisées: .jpg, .png, .pdf..."
                  value={rule.acceptedFileTypes}
                  onChange={(event) =>
                    setRuleDrafts((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, acceptedFileTypes: event.target.value } : item,
                      ),
                    )
                  }
                />
              ) : null}
              <input
                className="input"
                placeholder="Placeholder FR"
                value={rule.placeholderFr}
                onChange={(event) =>
                  setRuleDrafts((current) =>
                    current.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, placeholderFr: event.target.value } : item,
                    ),
                  )
                }
              />
              <input
                className="input"
                placeholder="Ordre"
                value={rule.sortOrder}
                onChange={(event) =>
                  setRuleDrafts((current) =>
                    current.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, sortOrder: event.target.value } : item,
                    ),
                  )
                }
              />
              <label className="tiny">
                <input
                  type="checkbox"
                  checked={rule.required}
                  onChange={() =>
                    setRuleDrafts((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, required: !item.required } : item,
                      ),
                    )
                  }
                />{" "}
                Obligatoire
              </label>
              <label className="tiny">
                <input
                  type="checkbox"
                  checked={rule.showInCard}
                  onChange={() =>
                    setRuleDrafts((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, showInCard: !item.showInCard } : item,
                      ),
                    )
                  }
                />{" "}
                Montrer en carte
              </label>
              <button
                className="pill-button"
                type="button"
                onClick={() =>
                  setRuleDrafts((current) => current.filter((_, itemIndex) => itemIndex !== index))
                }
              >
                Supprimer
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="actions-row">
        <button className="cta-button" type="button" disabled={busyKey === "save-category-engine"} onClick={() => void saveCategory()}>
          {busyKey === "save-category-engine" ? "Enregistrement..." : "Enregistrer la categorie"}
        </button>
      </div>

      {selectedCategory || categoryDraft.id ? (
        <div className="section-block">
          <div className="split-line">
            <div>
              <strong>Contenus dynamiques 条目内容</strong>
              <p className="tiny" style={{ marginTop: 6 }}>
                Ajoutez ici les cartes qui alimenteront la page d&apos;accueil pour cette categorie.
              </p>
            </div>
          </div>

          <div className="input-group admin-form-grid">
            <input
              className="input"
              placeholder="Titre"
              value={entryDraft.titleFr}
              onChange={(event) => setEntryDraft({ ...entryDraft, titleFr: event.target.value })}
            />
            <input
              className="input"
              placeholder="Sous-titre"
              value={entryDraft.subtitleFr}
              onChange={(event) => setEntryDraft({ ...entryDraft, subtitleFr: event.target.value })}
            />
            <input
              className="input"
              placeholder="Image /images/..."
              value={entryDraft.coverImageUrl}
              onChange={(event) => setEntryDraft({ ...entryDraft, coverImageUrl: event.target.value })}
            />
            <input
              className="input"
              placeholder="Lien externe"
              value={entryDraft.externalUrl}
              onChange={(event) => setEntryDraft({ ...entryDraft, externalUrl: event.target.value })}
            />
            <input
              className="input"
              placeholder="Fichier URL"
              value={entryDraft.fileUrl}
              onChange={(event) => setEntryDraft({ ...entryDraft, fileUrl: event.target.value })}
            />
            <input
              className="input"
              placeholder="Ordre"
              value={entryDraft.sortOrder}
              onChange={(event) => setEntryDraft({ ...entryDraft, sortOrder: event.target.value })}
            />
            <label className="tiny">
              <input
                type="checkbox"
                checked={entryDraft.visible}
                onChange={() => setEntryDraft({ ...entryDraft, visible: !entryDraft.visible })}
              />{" "}
              Visible
            </label>
            <textarea
              className="textarea"
              placeholder="Resume FR"
              value={entryDraft.summaryFr}
              onChange={(event) => setEntryDraft({ ...entryDraft, summaryFr: event.target.value })}
            />
          </div>

          {selectedRules.length > 0 ? (
            <div className="admin-dynamic-stack">
              {selectedRules.map((rule) => (
                <div className="input-group" key={rule.fieldKey}>
                  <label className="tiny">
                    {rule.labelFr}
                    {rule.acceptedFileTypes ? ` · ${rule.acceptedFileTypes}` : ""}
                  </label>
                  {rule.fieldType === "textarea" ? (
                    <textarea
                      className="textarea"
                      placeholder={rule.placeholderFr || rule.labelFr}
                      value={entryDraft.payload[rule.fieldKey] || ""}
                      onChange={(event) =>
                        setEntryDraft((current) => ({
                          ...current,
                          payload: { ...current.payload, [rule.fieldKey]: event.target.value },
                        }))
                      }
                    />
                  ) : (
                    <input
                      className="input"
                      placeholder={rule.placeholderFr || rule.labelFr}
                      value={entryDraft.payload[rule.fieldKey] || ""}
                      onChange={(event) =>
                        setEntryDraft((current) => ({
                          ...current,
                          payload: { ...current.payload, [rule.fieldKey]: event.target.value },
                        }))
                      }
                    />
                  )}
                </div>
              ))}
            </div>
          ) : null}

          <div className="actions-row">
            <button className="cta-button" type="button" disabled={busyKey === "save-entry"} onClick={() => void saveEntry()}>
              {busyKey === "save-entry" ? "Publication..." : editingEntryId ? "Mettre a jour le contenu" : "Ajouter le contenu"}
            </button>
            {editingEntryId ? (
              <button className="pill-button" type="button" onClick={() => { setEditingEntryId(null); setEntryDraft(defaultEntryDraft); }}>
                Annuler
              </button>
            ) : null}
          </div>

          <div className="admin-dynamic-stack">
            {selectedEntries.map((entry) => (
              <div className="admin-inline-card" key={entry.id}>
                <div>
                  <strong>{entry.title_fr}</strong>
                  <p className="tiny">{entry.summary_fr}</p>
                </div>
                <div className="actions-row">
                  <button className="pill-button" type="button" onClick={() => editEntry(entry)}>
                    Modifier
                  </button>
                  <button
                    className="pill-button"
                    type="button"
                    disabled={busyKey === `delete-entry-${entry.id}`}
                    onClick={() => void deleteEntry(entry.id)}
                  >
                    Supprimer
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
