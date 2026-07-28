"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";

type ProductReport = { id: string; name: string; sales: number; downloads: number; revenue: number; lastPurchasedAt: string | null; lastDownloadedAt: string | null; lastBuyer: string | null; lastDownloader: string | null; lastAmount: number | null; currency: string };
type SectionReport = { key: string; title: string; sales: number; downloads: number; revenue: number; products: ProductReport[] };

function dateTime(value: string | null) {
  return value ? new Date(value).toLocaleString("fr-FR") : "—";
}

export function AdminDownloadReport() {
  const { session } = useAuth();
  const [sections, setSections] = useState<SectionReport[]>([]);
  const [message, setMessage] = useState("Chargement...");

  useEffect(() => {
    if (!session?.access_token) return;
    void fetch("/api/admin/download-report", { headers: { Authorization: `Bearer ${session.access_token}` }, cache: "no-store" })
      .then(async (response) => ({ response, body: await response.json() as { ok?: boolean; message?: string; sections?: SectionReport[] } }))
      .then(({ response, body }) => {
        if (!response.ok || !body.ok) throw new Error(body.message || "Rapport indisponible.");
        setSections(body.sections || []);
        setMessage("");
      })
      .catch((error) => setMessage(error instanceof Error ? error.message : "Rapport indisponible."));
  }, [session?.access_token]);

  return (
    <div className="section-block">
      <h3>Produits, ventes et téléchargements 商品销售下载统计</h3>
      {message ? <p className="muted">{message}</p> : null}
      <div className="admin-report-table-wrap">
        <table className="admin-report-table">
          <thead><tr><th>类别 / 商品</th><th>销量</th><th>下载总数</th><th>最后购买</th><th>购买用户</th><th>最后下载</th><th>下载用户</th><th>支付金额</th></tr></thead>
          <tbody>
            {sections.map((section) => (
              <FragmentRows section={section} key={section.key} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FragmentRows({ section }: { section: SectionReport }) {
  return <>
    <tr className="admin-report-section-row"><th>{section.title}</th><th>{section.sales}</th><th>{section.downloads}</th><th colSpan={4}>类别总收入</th><th>{section.revenue.toFixed(2)} EUR</th></tr>
    {section.products.map((product) => <tr key={product.id}>
      <td>{product.name}</td><td>{product.sales}</td><td>{product.downloads}</td><td>{dateTime(product.lastPurchasedAt)}</td><td>{product.lastBuyer || "—"}</td><td>{dateTime(product.lastDownloadedAt)}</td><td>{product.lastDownloader || "—"}</td><td>{product.lastAmount == null ? "—" : `${product.lastAmount.toFixed(2)} ${product.currency}`}</td>
    </tr>)}
  </>;
}
