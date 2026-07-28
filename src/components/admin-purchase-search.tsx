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
  const formatDate = (value: string | null) => value ? new Date(value).toLocaleString("fr-FR") : "—";

  return (
    <div className="section-block admin-purchase-section">
      <h2>🔎 用户购买记录 Recherche des achats</h2>
      <p className="muted">按用户名、邮箱、日期或商品名称搜索。历史记录不会随商品删除而消失。</p>
      <div className="actions-row">
        <input className="input" value={q} onChange={(event) => setQ(event.target.value)} placeholder="Nom, e-mail, date ou produit" />
        <button className="pill-button" type="button" onClick={() => void load()}>搜索 Rechercher</button>
      </div>
      {message ? <p className="admin-action-status">{message}</p> : null}
      <div className="admin-table-wrap admin-purchase-table-wrap">
        <table className="admin-data-table admin-purchase-table">
          <colgroup>
            <col className="purchase-col-product" />
            <col className="purchase-col-user" />
            <col className="purchase-col-status" />
            <col className="purchase-col-dates" />
            <col className="purchase-col-count" />
            <col className="purchase-col-payment" />
          </colgroup>
          <thead>
            <tr>
              <th>商品 Produit</th>
              <th>用户 Utilisateur</th>
              <th>状态 Statut</th>
              <th>购买 / 最后下载</th>
              <th>下载</th>
              <th>金额 / 操作</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td className="admin-table-empty" colSpan={6}>暂无购买记录 · Aucun achat enregistré.</td></tr>
            ) : rows.map((row) => (
              <tr key={row.id}>
                <td><span className="purchase-cell-clamp">{row.book_title || row.resource_title || "Produit"}</span></td>
                <td>
                  <span className="purchase-cell-line">{row.user_name || "—"}</span>
                  <span className="purchase-cell-line purchase-cell-muted">{row.user_email || "—"}</span>
                </td>
                <td>
                  <span className="purchase-cell-line">{row.payment_status || "—"}</span>
                  {row.refunded_at ? <span className="purchase-cell-line purchase-cell-muted">退款 {formatDate(row.refunded_at)}</span> : null}
                </td>
                <td>
                  <span className="purchase-cell-line">购买 {formatDate(row.paid_at)}</span>
                  <span className="purchase-cell-line purchase-cell-muted">下载 {formatDate(row.last_downloaded_at)}</span>
                </td>
                <td>{row.download_count || 0}</td>
                <td>
                  <span className="purchase-cell-line purchase-amount">{Number(row.amount_paid || 0).toFixed(2)} {row.currency || "EUR"}</span>
                  {row.payment_status === "paid" ? (
                    <button className="purchase-refund-button" type="button" onClick={() => void refund(row)}>退款 Rembourser</button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
