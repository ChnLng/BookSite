"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";

type ProductReport = { kind: string; ref: string; name: string; active: boolean; sales: number; downloads: number; revenue: number; lastPurchasedAt: string | null; lastDownloadedAt: string | null; lastBuyer: string | null; lastDownloader: string | null; lastAmount: number | null; currency: string };
type SectionReport = { key: string; title: string; sales: number; downloads: number; revenue: number; products: ProductReport[] };

function dateTime(value: string | null) {
  return value ? new Date(value).toLocaleString("fr-FR") : "—";
}

export function AdminDownloadReport() {
  const { session } = useAuth();
  const [sections, setSections] = useState<SectionReport[]>([]);
  const [message, setMessage] = useState("Chargement...");

  const loadReport = async () => {
    if (!session?.access_token) return;
    const response = await fetch("/api/admin/download-report", { headers: { Authorization: `Bearer ${session.access_token}` }, cache: "no-store" });
    const body = await response.json() as { ok?: boolean; message?: string; sections?: SectionReport[] };
    if (!response.ok || !body.ok) throw new Error(body.message || "Rapport indisponible.");
    setSections(body.sections || []);
    setMessage("");
  };

  useEffect(() => {
    if (!session?.access_token) return;
    void loadReport().catch((error) => setMessage(error instanceof Error ? error.message : "Rapport indisponible."));
    const timer = window.setInterval(() => void loadReport().catch(() => undefined), 5000);
    return () => window.clearInterval(timer);
  }, [session?.access_token]);

  const deleteHistory = async (product: ProductReport) => {
    if (!session?.access_token || !window.confirm(`永久删除 ${product.name} 的统计目录和过往购买/下载记录？`)) return;
    const response = await fetch("/api/admin/download-report", {
      method: "DELETE",
      headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ kind: product.kind, ref: product.ref }),
    });
    const body = await response.json() as { ok?: boolean; message?: string };
    if (!response.ok || !body.ok) { setMessage(body.message || "Suppression impossible."); return; }
    await loadReport();
  };

  return (
    <div className="section-block">
      <h3>Produits, ventes et téléchargements 商品销售下载统计</h3>
      {message ? <p className="muted">{message}</p> : null}
      <div className="admin-report-table-wrap">
        <table className="admin-report-table">
          <thead><tr><th>类别 / 商品</th><th>销量</th><th>下载总数</th><th>最后购买</th><th>购买用户</th><th>最后下载</th><th>下载用户</th><th>支付金额</th></tr></thead>
          <tbody>
            {sections.map((section) => (
              <FragmentRows section={section} onDelete={deleteHistory} key={section.key} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FragmentRows({ section, onDelete }: { section: SectionReport; onDelete: (product: ProductReport) => Promise<void> }) {
  return <>
    <tr className="admin-report-section-row"><th>{section.title}</th><th>{section.sales}</th><th>{section.downloads}</th><th colSpan={4}>类别总收入</th><th>{section.revenue.toFixed(2)} EUR</th></tr>
    {section.products.map((product) => <tr key={`${product.kind}-${product.ref}`}>
      <td><strong>{product.name}</strong>{!product.active ? <><span className="tiny"> · 已从商品页删除</span><button className="report-delete-button" type="button" onClick={() => void onDelete(product)}>删除统计历史</button></> : null}</td><td>{product.sales}</td><td>{product.downloads}</td><td>{dateTime(product.lastPurchasedAt)}</td><td>{product.lastBuyer || "—"}</td><td>{dateTime(product.lastDownloadedAt)}</td><td>{product.lastDownloader || "—"}</td><td>{product.lastAmount == null ? "—" : `${product.lastAmount.toFixed(2)} ${product.currency}`}</td>
    </tr>)}
  </>;
}
