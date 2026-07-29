"use client";

import { useEffect, useMemo, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

type SectionRow = { id: string; section_key: string; title: string; section_type: string; sort_order: number; visible: boolean };
type ItemRow = {
  id?: string;
  section_id: string;
  admin_label: string;
  source_key: string;
  content_type: string;
  module_type: string | null;
  display_position: string;
  show_on_user_page: boolean;
  sort_order: number;
  settings: {
    onsite_purchase_label?: string;
    external_purchase_label?: string;
  } | null;
};

const positionOptions = ["left-1", "left-2", "left-3", "right-top-1", "right-top-2", "right-top-3", "right-middle-1", "right-middle-2", "right-bottom-1"];
const defaultNewItems = (): ItemRow[] => [
  { section_id: "", admin_label: "商品标题", source_key: "title", content_type: "string", module_type: null, display_position: "right-top-1", show_on_user_page: true, sort_order: 10, settings: null },
  { section_id: "", admin_label: "封面／主图", source_key: "cover_image", content_type: "image", module_type: null, display_position: "left-1", show_on_user_page: true, sort_order: 20, settings: null },
  { section_id: "", admin_label: "可下载文件", source_key: "download", content_type: "file", module_type: null, display_position: "right-middle-1", show_on_user_page: true, sort_order: 30, settings: null },
  { section_id: "", admin_label: "站外链接", source_key: "external_url", content_type: "file", module_type: null, display_position: "right-bottom-1", show_on_user_page: true, sort_order: 40, settings: null },
];

function slugify(value: string) {
  return value.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export function AdminContentSectionsPanel() {
  const [activeTab, setActiveTab] = useState<"new" | "edit">("edit");
  const [sections, setSections] = useState<SectionRow[]>([]);
  const [items, setItems] = useState<ItemRow[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newType, setNewType] = useState("catalog");
  const [newItems, setNewItems] = useState<ItemRow[]>(defaultNewItems());

  const loadData = async () => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    const [sectionResult, itemResult] = await Promise.all([
      supabase.from("content_sections").select("id, section_key, title, section_type, sort_order, visible").order("sort_order"),
      supabase.from("content_section_items").select("id, section_id, admin_label, source_key, content_type, module_type, display_position, show_on_user_page, sort_order, settings").order("sort_order"),
    ]);
    if (sectionResult.error) {
      setMessage(`请先运行 content section SQL：${sectionResult.error.message}`);
      return;
    }
    const nextSections = ((sectionResult.data || []) as SectionRow[]).sort((left, right) => {
      if (left.section_key === "liens-partenaires") return 1;
      if (right.section_key === "liens-partenaires") return -1;
      return left.sort_order - right.sort_order;
    });
    setSections(nextSections);
    setItems((itemResult.data || []) as ItemRow[]);
    setSelectedId((current) => current || nextSections[0]?.id || "");
  };

  useEffect(() => { void loadData(); }, []);

  const selected = sections.find((section) => section.id === selectedId) || null;
  const selectedItems = useMemo(
    () => items.filter((item) => item.section_id === selectedId).sort((a, b) => a.sort_order - b.sort_order),
    [items, selectedId],
  );

  const updateSection = (patch: Partial<SectionRow>) => {
    setSections((current) => current.map((section) => section.id === selectedId ? { ...section, ...patch } : section));
  };

  const updateItem = (index: number, patch: Partial<ItemRow>) => {
    setItems((current) => {
      const target = selectedItems[index];
      return current.map((item) => item === target ? { ...item, ...patch } : item);
    });
  };

  const moveSection = async (direction: "up" | "down") => {
    const supabase = getSupabaseBrowserClient();
    const movableSections = sections.filter((section) => section.section_key !== "liens-partenaires");
    const index = movableSections.findIndex((section) => section.id === selectedId);
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (!supabase || selected?.section_key === "liens-partenaires" || index < 0 || targetIndex < 0 || targetIndex >= movableSections.length) return;
    const current = movableSections[index];
    const target = movableSections[targetIndex];
    await Promise.all([
      supabase.from("content_sections").update({ sort_order: target.sort_order }).eq("id", current.id),
      supabase.from("content_sections").update({ sort_order: current.sort_order }).eq("id", target.id),
    ]);
    await loadData();
  };

  const createSection = async () => {
    const supabase = getSupabaseBrowserClient();
    const sectionKey = slugify(newTitle);
    if (!supabase || !sectionKey) { setMessage("请填写新类目名称。"); return; }
    setBusy(true);
    const movableOrders = sections.filter((section) => section.section_key !== "liens-partenaires").map((section) => section.sort_order);
    const nextOrder = movableOrders.length > 0 ? Math.max(...movableOrders) + 10 : 10;
    const { data, error } = await supabase.from("content_sections").insert({ section_key: sectionKey, title: newTitle.trim(), section_type: newType, sort_order: nextOrder, visible: true }).select("id").single();
    if (error || !data?.id) { setMessage(error?.message || "创建失败"); setBusy(false); return; }
    const { error: itemError } = await supabase.from("content_section_items").insert(newItems.filter((item) => item.admin_label.trim()).map((item, index) => ({
      section_id: data.id,
      admin_label: item.admin_label.trim(),
      source_key: item.source_key || `item_${index + 1}`,
      content_type: item.content_type,
      module_type: item.content_type === "module" ? item.module_type : null,
      display_position: item.display_position,
      show_on_user_page: item.show_on_user_page,
      sort_order: (index + 1) * 10,
      settings: item.content_type === "module" ? item.settings : null,
    })));
    if (itemError) { setMessage(itemError.message); setBusy(false); return; }
    setNewTitle(""); setNewType("catalog"); setNewItems(defaultNewItems()); setSelectedId(data.id); setActiveTab("edit"); setBusy(false);
    setMessage("新类目已创建。"); await loadData();
  };

  const moveItem = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= selectedItems.length) return;
    const reordered = [...selectedItems];
    [reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]];
    setItems((current) => [
      ...current.filter((item) => item.section_id !== selectedId),
      ...reordered.map((item, itemIndex) => ({ ...item, sort_order: (itemIndex + 1) * 10 })),
    ]);
  };

  const deleteSection = async () => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase || !selected || ["albums", "coin-ludique", "liens-partenaires"].includes(selected.section_key)) return;
    if (!window.confirm(`确定删除类目“${selected.title}”以及它的页面项目吗？`)) return;
    setBusy(true);
    const { error } = await supabase.from("content_sections").delete().eq("id", selected.id);
    if (error) setMessage(error.message);
    else { setMessage("类目已删除。"); setSelectedId(""); await loadData(); }
    setBusy(false);
  };

  const save = async () => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase || !selected) return;
    setBusy(true);
    const { error: sectionError } = await supabase.from("content_sections").update({
      title: selected.title,
      section_type: selected.section_type,
      visible: selected.visible,
    }).eq("id", selected.id);
    if (sectionError) { setMessage(sectionError.message); setBusy(false); return; }

    await supabase.from("content_section_items").delete().eq("section_id", selected.id);
    if (selectedItems.length > 0) {
      const { error } = await supabase.from("content_section_items").insert(selectedItems.map((item, index) => ({
        section_id: selected.id,
        admin_label: item.admin_label,
        source_key: item.source_key || `item_${index + 1}`,
        content_type: item.content_type,
        module_type: item.content_type === "module" ? item.module_type : null,
        display_position: item.display_position,
        show_on_user_page: item.show_on_user_page,
        sort_order: (index + 1) * 10,
        settings: item.content_type === "module" ? item.settings : null,
      })));
      if (error) { setMessage(error.message); setBusy(false); return; }
    }
    setMessage("类目及页面项目已更新。");
    setBusy(false);
    await loadData();
  };

  return (
    <div className="section-block">
      <h2>类目管理 Gestion des catégories</h2>
      {message ? <p className="tiny">{message}</p> : null}
      <div className="admin-category-tabs">
        <button className={activeTab === "new" ? "admin-category-tab active" : "admin-category-tab"} type="button" onClick={() => setActiveTab("new")}>添加新的类目</button>
        <button className={activeTab === "edit" ? "admin-category-tab active" : "admin-category-tab"} type="button" onClick={() => setActiveTab("edit")}>编辑现有类目</button>
      </div>

      {activeTab === "new" ? <div className="section-block">
        <div className="input-group admin-form-grid">
          <input className="input" value={newTitle} onChange={(event) => setNewTitle(event.target.value)} placeholder="新类目名称" />
          <select className="input" value={newType} onChange={(event) => setNewType(event.target.value)}>
            <option value="catalog">商品目录 Catalog</option><option value="links">链接 Liens</option><option value="custom">自定义 Custom</option>
          </select>
        </div>
        <div className="split-line"><strong>商品详情页初始项目</strong><button className="pill-button" type="button" onClick={() => setNewItems((current) => [...current, { section_id: "", admin_label: "新项目", source_key: `custom_${Date.now()}`, content_type: "string", module_type: null, display_position: "right-middle-1", show_on_user_page: true, sort_order: current.length * 10 + 10, settings: null }])}>添加项目</button></div>
        <div className="admin-dynamic-stack">
          {newItems.map((item, index) => <div className="admin-inline-card admin-layout-item-row" key={`${item.source_key}-${index}`}>
            <input className="input" value={item.admin_label} onChange={(event) => setNewItems((current) => current.map((entry, itemIndex) => itemIndex === index ? { ...entry, admin_label: event.target.value, source_key: slugify(event.target.value) || entry.source_key } : entry))} placeholder="管理员填写指示" />
            <select className="input" value={item.content_type} onChange={(event) => setNewItems((current) => current.map((entry, itemIndex) => itemIndex === index ? { ...entry, content_type: event.target.value, module_type: event.target.value === "module" ? "reviews" : null } : entry))}>
              <option value="string">字符串</option><option value="text">长文本</option><option value="number">数值／价格</option><option value="image">图片</option><option value="file">文件／链接</option><option value="module">Module</option>
            </select>
            {item.content_type === "module" ? <select className="input" value={item.module_type || "reviews"} onChange={(event) => setNewItems((current) => current.map((entry, itemIndex) => itemIndex === index ? { ...entry, module_type: event.target.value } : entry))}><option value="reviews">用户评价</option><option value="commerce">定价、Code promo 与付款</option></select> : <input className="input" value={item.source_key} onChange={(event) => setNewItems((current) => current.map((entry, itemIndex) => itemIndex === index ? { ...entry, source_key: event.target.value } : entry))} />}
            <select className="input" value={item.display_position} onChange={(event) => setNewItems((current) => current.map((entry, itemIndex) => itemIndex === index ? { ...entry, display_position: event.target.value } : entry))}>{positionOptions.map((position) => <option value={position} key={position}>{position}</option>)}</select>
            <label className="tiny"><input type="checkbox" checked={item.show_on_user_page} onChange={() => setNewItems((current) => current.map((entry, itemIndex) => itemIndex === index ? { ...entry, show_on_user_page: !entry.show_on_user_page } : entry))} /> 用户页显示</label>
            <button className="pill-button" type="button" onClick={() => setNewItems((current) => current.filter((_, itemIndex) => itemIndex !== index))}>删除</button>
            {item.content_type === "module" && item.module_type === "commerce" ? <div className="admin-commerce-label-fields">
              <input className="input" value={item.settings?.onsite_purchase_label || ""} onChange={(event) => setNewItems((current) => current.map((entry, itemIndex) => itemIndex === index ? { ...entry, settings: { ...entry.settings, onsite_purchase_label: event.target.value } } : entry))} placeholder="本站购买按钮文字（例如 Acheter le livre numérique）" />
              <input className="input" value={item.settings?.external_purchase_label || ""} onChange={(event) => setNewItems((current) => current.map((entry, itemIndex) => itemIndex === index ? { ...entry, settings: { ...entry.settings, external_purchase_label: event.target.value } } : entry))} placeholder="站外购买按钮文字（例如 Amazon broché）" />
            </div> : null}
          </div>)}
        </div>
        <button className="cta-button" type="button" disabled={busy} onClick={() => void createSection()}>{busy ? "创建中..." : "创建新类目"}</button>
      </div> : <>
      <div className="admin-section-order-list">
        {sections.map((section) => (
          <button className={selectedId === section.id ? "admin-section-order-button active" : "admin-section-order-button"} type="button" key={section.id} onClick={() => setSelectedId(section.id)}>
            {section.title}
          </button>
        ))}
      </div>

      {selected ? <>
        <div className="input-group admin-form-grid">
          <input className="input" value={selected.title} onChange={(event) => updateSection({ title: event.target.value })} placeholder="类目名称" />
          <select className="input" value={selected.section_type} onChange={(event) => updateSection({ section_type: event.target.value })}>
            <option value="catalog">商品目录 Catalog</option>
            <option value="links">链接 Liens</option>
            <option value="custom">自定义 Custom</option>
          </select>
          <label className="tiny"><input type="checkbox" checked={selected.visible} onChange={() => updateSection({ visible: !selected.visible })} /> 显示在用户页</label>
          <div className="actions-row">
            <button className="pill-button" type="button" disabled={selected.section_key === "liens-partenaires"} onClick={() => void moveSection("up")}>↑ 上移</button>
            <button className="pill-button" type="button" disabled={selected.section_key === "liens-partenaires"} onClick={() => void moveSection("down")}>↓ 下移</button>
            <button className="pill-button" type="button" disabled={["albums", "coin-ludique", "liens-partenaires"].includes(selected.section_key) || busy} onClick={() => void deleteSection()}>删除类目</button>
          </div>
        </div>

        <div className="split-line">
          <strong>类目页面项目 Éléments</strong>
          <button className="pill-button" type="button" onClick={() => setItems((current) => [...current, {
            section_id: selected.id, admin_label: "新项目", source_key: `custom_${Date.now()}`, content_type: "string", module_type: null,
            display_position: "right-middle-1", show_on_user_page: true, sort_order: selectedItems.length * 10 + 10, settings: null,
          }])}>添加项目</button>
        </div>

        <div className="admin-dynamic-stack">
          {selectedItems.map((item, index) => (
            <div className="admin-inline-card admin-layout-item-row" key={item.id || item.source_key}>
              <input className="input" value={item.admin_label} onChange={(event) => updateItem(index, { admin_label: event.target.value })} placeholder="管理员填写指示" />
              <select className="input" value={item.content_type} onChange={(event) => updateItem(index, { content_type: event.target.value, module_type: event.target.value === "module" ? "reviews" : null })}>
                <option value="string">字符串</option><option value="text">长文本</option><option value="number">数值／价格</option>
                <option value="image">图片</option><option value="file">文件／下载链接</option><option value="module">Module</option>
              </select>
              {item.content_type === "module" ? <select className="input" value={item.module_type || "reviews"} onChange={(event) => updateItem(index, { module_type: event.target.value })}>
                <option value="reviews">用户评价</option><option value="commerce">定价、Code promo 与付款</option>
              </select> : <input className="input" value={item.source_key} onChange={(event) => updateItem(index, { source_key: event.target.value })} placeholder="数据项目" />}
              <select className="input" value={item.display_position} onChange={(event) => updateItem(index, { display_position: event.target.value })}>
                {positionOptions.map((position) => <option value={position} key={position}>{position}</option>)}
              </select>
              <label className="tiny"><input type="checkbox" checked={item.show_on_user_page} onChange={() => updateItem(index, { show_on_user_page: !item.show_on_user_page })} /> 用户页显示</label>
              <div className="actions-row">
                <button className="pill-button" type="button" disabled={index === 0} onClick={() => moveItem(index, "up")}>↑</button>
                <button className="pill-button" type="button" disabled={index === selectedItems.length - 1} onClick={() => moveItem(index, "down")}>↓</button>
                <button className="pill-button" type="button" onClick={() => setItems((current) => current.filter((entry) => entry !== item))}>删除</button>
              </div>
              {item.content_type === "module" && item.module_type === "commerce" ? <div className="admin-commerce-label-fields">
                <input className="input" value={item.settings?.onsite_purchase_label || ""} onChange={(event) => updateItem(index, { settings: { ...item.settings, onsite_purchase_label: event.target.value } })} placeholder="本站购买按钮文字（例如 Acheter le livre numérique）" />
                <input className="input" value={item.settings?.external_purchase_label || ""} onChange={(event) => updateItem(index, { settings: { ...item.settings, external_purchase_label: event.target.value } })} placeholder="站外购买按钮文字（例如 Amazon broché）" />
              </div> : null}
            </div>
          ))}
        </div>
        <button className="cta-button" type="button" disabled={busy} onClick={() => void save()}>{busy ? "保存中..." : "保存更新"}</button>
      </> : null}
      </>}
    </div>
  );
}
