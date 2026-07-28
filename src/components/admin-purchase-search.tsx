"use client";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";

type Purchase = { id: string; user_name: string; user_email: string; book_title: string | null; resource_title: string | null; amount_paid: number | null; currency: string | null; payment_status: string; paid_at: string | null; refunded_at: string | null; last_downloaded_at: string | null; download_count: number | null };

export function AdminPurchaseSearch() {
  const { session } = useAuth();
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<Purchase[]>([]);
  const [message, setMessage] = useState("");
  const load = useCallback(async () => {
    if (!session?.access_token) return;
    const response = await fetch(`/api/admin/purchases?q=${encodeURIComponent(q)}`, { headers: { Authorization: `Bearer ${session.access_token}` }, cache: "no-store" });
    const data = await response.json();
    if (response.ok) setRows(data.purchases || []); else setMessage(data.message || "Chargement impossible.");
  }, [q, session?.access_token]);
  useEffect(() => { void load(); const timer = window.setInterval(() => void load(), 5000); return () => window.clearInterval(timer); }, [load]);
  const refund = async (row: Purchase) => {
    if (!window.confirm(`Confirmer le remboursement de ${row.book_title || row.resource_title || "ce produit"} ?`)) return;
    const reason = window.prompt("Motif du remboursement (optionnel)") || "";
    const response = await fetch(`/api/admin/purchases/${row.id}/refund`, { method: "POST", headers: { Authorization: `Bearer ${session?.access_token}`, "Content-Type": "application/json" }, body: JSON.stringify({ reason }) });
    const data = await response.json(); setMessage(data.ok ? "Remboursement confirme par le prestataire." : data.message); if (data.ok) void load();
  };
  return <div className="section-block"><h2>🔎 用户购买记录 Recherche des achats</h2><p className="muted">按用户名、邮箱、日期或商品名称搜索。历史记录不会随商品删除而消失。</p><div className="actions-row"><input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nom, e-mail, date ou produit"/><button className="pill-button" type="button" onClick={() => void load()}>搜索 Rechercher</button></div>{message ? <p className="admin-action-status">{message}</p> : null}<div className="purchase-admin-list">{rows.map((row) => <article className="account-card" key={row.id}><div className="split-line"><strong>{row.book_title || row.resource_title || "Produit"}</strong><span>{Number(row.amount_paid || 0).toFixed(2)} {row.currency || "EUR"}</span></div><p className="tiny">{row.user_name || "—"} · {row.user_email || "—"}</p><p className="tiny">状态 Statut: {row.payment_status} · 到账日期: {row.paid_at ? new Date(row.paid_at).toLocaleString("fr-FR") : "—"}</p><p className="tiny">最后下载: {row.last_downloaded_at ? new Date(row.last_downloaded_at).toLocaleString("fr-FR") : "—"} · 下载 {row.download_count || 0}</p>{row.refunded_at ? <p className="tiny">退款日期: {new Date(row.refunded_at).toLocaleString("fr-FR")}</p> : null}{row.payment_status === "paid" ? <button className="pill-button" type="button" onClick={() => void refund(row)}>退款 Rembourser</button> : null}</article>)}</div></div>;
}
