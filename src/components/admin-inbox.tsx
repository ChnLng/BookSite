"use client";

import { useEffect, useMemo, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import { playTestingGroupUrl } from "@/lib/play-testing";

type InboxMessage = { id: string; pseudo: string | null; email: string | null; user_email: string | null; content: string; created_at: string | null };
const pageSize = 30;

export function AdminInbox({ testingOnly = false, onCountChange }: { testingOnly?: boolean; onCountChange: (count: number) => void }) {
  const [messages, setMessages] = useState<InboxMessage[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const abort = new AbortController();
    const load = async () => {
      setLoading(true); setError("");
      try {
        const supabase = getSupabaseBrowserClient();
        if (!supabase) throw new Error("unavailable");
        // AdminGuard and the existing administrator-only SELECT policy both
        // remain in force. No service key or public read policy is introduced.
        let request = supabase.from("admin_messages").select("id, pseudo, email, user_email, content, created_at", { count: "exact" });
        if (testingOnly) request = request.like("visitor_token", "play-testing:%");
        const result = await request.order("created_at", { ascending: false }).range(page * pageSize, (page + 1) * pageSize - 1).abortSignal(abort.signal);
        if (abort.signal.aborted) return;
        if (result.error) throw result.error;
        setMessages(result.data || []); setTotal(result.count || 0); onCountChange(result.count || 0);
      } catch {
        if (!abort.signal.aborted) { setMessages([]); setError("暂时无法读取收件箱。请确认管理员登录及 admin_messages 的读取权限，然后重试。"); }
      } finally { if (!abort.signal.aborted) setLoading(false); }
    };
    void load();
    return () => abort.abort();
  }, [testingOnly, page, revision, onCountChange]);

  const filtered = useMemo(() => messages.filter((message) => [message.pseudo, message.email, message.user_email, message.content].join(" ").toLowerCase().includes(query.trim().toLowerCase())), [messages, query]);
  const copyEmail = async (email: string) => {
    try { await navigator.clipboard.writeText(email); setNotice("邮箱已复制，请在 Google Groups 核实并处理。"); }
    catch { setNotice("无法自动复制，请选择页面上的邮箱手动复制。"); }
  };

  return <section className="admin-inbox" aria-label={testingOnly ? "Google Play 测试申请" : "联系留言收件箱"}>
    {testingOnly ? <div className="admin-help-card">
      <strong>Demandes de test à traiter sous 48 h</strong>
      <p>Vérifiez l’adresse Google Play → confirmez l’accès au groupe de test → envoyez un code personnel non utilisé pour chaque application demandée.</p>
      <p className="tiny muted">Ces demandes sont enregistrées ici et envoyées à l’adresse administrateur. Elles ne confirment ni l’adhésion au groupe ni l’envoi d’un code.</p>
      <a className="pill-button" href={playTestingGroupUrl} target="_blank" rel="noopener noreferrer">打开 Google Groups</a>
    </div> : <p className="muted">网站发给管理员的私信，包含测试申请。首页公开留言及商品评价请到“留言与评价”管理。</p>}
    <div className="admin-inbox-toolbar">
      <label className="input-group"><span className="tiny">筛选当前页 · 邮箱 / 昵称 / 内容</span><input className="input" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="输入关键词" /></label>
      <button className="pill-button" type="button" disabled={loading} onClick={() => setRevision((value) => value + 1)}>刷新收件箱</button>
    </div>
    {notice ? <p className="admin-action-status" role="status">{notice}</p> : null}
    {error ? <p className="admin-action-status" role="alert">{error}</p> : loading ? <p role="status" className="muted">正在读取…</p> : filtered.length === 0 ? <div className="admin-empty-state">{query ? "当前页没有符合关键词的记录。" : testingOnly ? "还没有测试申请。" : "还没有联系留言。"}</div> : <div className="admin-inbox-list">
      {filtered.map((message) => {
        const playEmail = message.content.match(/^Compte Google Play déclaré\s*:\s*(.+)$/m)?.[1]?.trim();
        const contactEmail = message.email || message.user_email || "";
        const date = message.created_at ? new Date(message.created_at) : null;
        return <details className="admin-inbox-item" key={message.id}>
          <summary><span><strong>{playEmail || message.pseudo || "联系留言"}</strong><small>{contactEmail}</small></span><time>{date && Number.isFinite(date.getTime()) ? date.toLocaleString("fr-FR") : "日期未知"}</time></summary>
          <div className="admin-inbox-body">
            <pre>{message.content}</pre>
            {playEmail ? <button className="pill-button" type="button" onClick={() => void copyEmail(playEmail)}>复制 Google Play 邮箱</button> : null}
            <p className="tiny muted">记录 ID：{message.id}</p>
          </div>
        </details>;
      })}
    </div>}
    <div className="admin-inbox-pagination">
      <button className="pill-button" type="button" disabled={loading || page === 0} onClick={() => setPage((value) => value - 1)}>上一页</button>
      <span className="tiny">{error ? "—" : `第 ${page + 1} 页 · 共 ${total} 条`}</span>
      <button className="pill-button" type="button" disabled={loading || (page + 1) * pageSize >= total} onClick={() => setPage((value) => value + 1)}>下一页</button>
    </div>
  </section>;
}
