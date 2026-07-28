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
};

const positionOptions = ["left-1", "left-2", "left-3", "right-top-1", "right-top-2", "right-top-3", "right-middle-1", "right-middle-2", "right-bottom-1"];

export function AdminContentSectionsPanel() {
  const [sections, setSections] = useState<SectionRow[]>([]);
  const [items, setItems] = useState<ItemRow[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const loadData = async () => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    const [sectionResult, itemResult] = await Promise.all([
      supabase.from("content_sections").select("id, section_key, title, section_type, sort_order, visible").order("sort_order"),
      supabase.from("content_section_items").select("id, section_id, admin_label, source_key, content_type, module_type, display_position, show_on_user_page, sort_order").order("sort_order"),
    ]);
    if (sectionResult.error) {
      setMessage(`请先运行 content section SQL：${sectionResult.error.message}`);
      return;
    }
    const nextSections = (sectionResult.data || []) as SectionRow[];
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
    const index = sections.findIndex((section) => section.id === selectedId);
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (!supabase || index < 0 || targetIndex < 0 || targetIndex >= sections.length) return;
    const current = sections[index];
    const target = sections[targetIndex];
    await Promise.all([
      supabase.from("content_sections").update({ sort_order: target.sort_order }).eq("id", current.id),
      supabase.from("content_sections").update({ sort_order: current.sort_order }).eq("id", target.id),
    ]);
    await loadData();
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
      })));
      if (error) { setMessage(error.message); setBusy(false); return; }
    }
    setMessage("类目及页面项目已更新。");
    setBusy(false);
    await loadData();
  };

  return (
    <div className="section-block">
      <h2>现有类目 Catégories existantes</h2>
      {message ? <p className="tiny">{message}</p> : null}
      <div className="admin-category-tabs">
        {sections.map((section) => (
          <button className={selectedId === section.id ? "admin-category-tab active" : "admin-category-tab"} type="button" key={section.id} onClick={() => setSelectedId(section.id)}>
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
            <button className="pill-button" type="button" onClick={() => void moveSection("up")}>↑ 上移</button>
            <button className="pill-button" type="button" onClick={() => void moveSection("down")}>↓ 下移</button>
          </div>
        </div>

        <div className="split-line">
          <strong>类目页面项目 Éléments</strong>
          <button className="pill-button" type="button" onClick={() => setItems((current) => [...current, {
            section_id: selected.id, admin_label: "新项目", source_key: `custom_${Date.now()}`, content_type: "string", module_type: null,
            display_position: "right-middle-1", show_on_user_page: true, sort_order: selectedItems.length * 10 + 10,
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
              <button className="pill-button" type="button" onClick={() => setItems((current) => current.filter((entry) => entry !== item))}>删除</button>
            </div>
          ))}
        </div>
        <button className="cta-button" type="button" disabled={busy} onClick={() => void save()}>{busy ? "保存中..." : "保存更新"}</button>
      </> : null}
    </div>
  );
}
