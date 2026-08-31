"use client";
import { type FormEvent, useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { playTestingApps } from "@/lib/play-testing";
import { parsePlayCodesCsv } from "@/lib/play-code-inventory";

type Batch = { id: string; package_name: string; label: string; valid_from: string; valid_until: string; enabled: boolean; total: number; assigned: number; blocked: number; remaining: number };
type Claim = { package_name: string; email: string; assigned_at: string; blocked: boolean };

export function AdminPlayCodeInventory() {
  const { session } = useAuth();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState("");
  const [packageName, setPackageName] = useState(playTestingApps[0].packageName);
  const [label, setLabel] = useState("");
  const [validFrom, setValidFrom] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [csv, setCsv] = useState("");
  const [count, setCount] = useState(0);
  const [unusedConfirmed, setUnusedConfirmed] = useState(false);
  const [activeConfirmed, setActiveConfirmed] = useState<Record<string, boolean>>({});
  const [blockCsv, setBlockCsv] = useState("");
  const token = session?.access_token;
  const api = useCallback(async (body?: Record<string, unknown>) => {
    const response = await fetch("/api/play-testing/admin", { method: body ? "POST" : "GET", cache: "no-store", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, ...(body ? { body: JSON.stringify(body) } : {}) });
    const result = await response.json();
    if (!response.ok || !result.ok) throw new Error(result.message || "暂时无法读取库存。");
    return result;
  }, [token]);
  const refresh = useCallback(async () => {
    if (!token) return;
    try { const result = await api(); setBatches(result.batches || []); setClaims(result.claims || []); setReady(true); }
    catch (error) { setReady(false); setNotice(error instanceof Error ? error.message : "库存未配置。"); }
  }, [api, token]);
  useEffect(() => { void refresh(); }, [refresh]);
  const mutate = async (body: Record<string, unknown>, success: (result: { inserted: number; ignored: number; blocked: number }) => string) => {
    setBusy(true); setNotice("");
    try { const result = await api(body); setNotice(success(result)); await refresh(); return true; }
    catch (error) { setNotice(error instanceof Error ? error.message : "操作失败，未确认成功。"); return false; }
    finally { setBusy(false); }
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!Number.isFinite(Date.parse(validFrom)) || !Number.isFinite(Date.parse(validUntil)) || Date.parse(validUntil) <= Date.parse(validFrom)) { setNotice("请填写正确的活动开始和结束时间。"); return; }
    const ok = await mutate({ action: "import", packageName, label, validFrom: new Date(validFrom).toISOString(), validUntil: new Date(validUntil).toISOString(), csv, unusedConfirmed }, result => `已导入 ${result.inserted} 枚，忽略 ${result.ignored} 枚重复代码。新批次默认暂停，请核实 Google 活动后再启用。`);
    if (ok) { setCsv(""); setCount(0); setUnusedConfirmed(false); }
  };
  const appTitle = (pkg: string) => playTestingApps.find(app => app.packageName === pkg)?.title || pkg;
  return <section className="admin-inbox" aria-label="Google Play 兑换码库存">
    <div className="admin-help-card"><h3>Google Play 自动发码</h3><p>每个已验证的网站账号，每款 App 分配一枚。重复领取返回原码；不会回收已分配代码。网站账号邮箱须与 Google Play 使用的邮箱一致。</p><p className="tiny muted">入群与参加测试仍由用户在 Google 页面完成并声明。这里的“已分配”不代表已在 Google 兑换；已人工发出或已兑换的旧代码，请先排除或加入停用名单。</p></div>
    {notice && <p className="admin-action-status" role="status">{notice}</p>}
    {!ready && <p className="admin-help-card">数据库未就绪时不会分配代码。请在 Supabase 执行 <code>20260830_play_testing_codes.sql</code>，并确认当前用户在 profiles 中的 role 为 admin。不要把 CSV 放到 GitHub 或 public 文件夹。</p>}
    <button className="pill-button" disabled={busy} onClick={() => void refresh()}>刷新库存</button>
    <details className="admin-inbox-item"><summary>导入未使用的代码 CSV</summary><form className="admin-inbox-body input-group" onSubmit={submit}>
      <label>对应应用<select className="input" value={packageName} onChange={e => setPackageName(e.target.value)} disabled={busy}>{playTestingApps.map(app => <option key={app.packageName} value={app.packageName}>{app.title}</option>)}</select></label>
      <label>批次名称<input className="input" required maxLength={100} value={label} onChange={e => setLabel(e.target.value)} disabled={busy} /></label>
      <p className="tiny muted">以下日期必须与 Play Console 中的促销活动一致。按本机时区输入，发送时转换为 UTC；系统不猜测有效期。</p>
      <label>开始时间<input className="input" type="datetime-local" required value={validFrom} onChange={e => setValidFrom(e.target.value)} disabled={busy} /></label>
      <label>结束时间<input className="input" type="datetime-local" required value={validUntil} onChange={e => setValidUntil(e.target.value)} disabled={busy} /></label>
      <label>Google Play CSV<input type="file" accept=".csv,text/csv" disabled={busy} onChange={async e => { setCsv(""); setCount(0); const file = e.target.files?.[0]; if (!file) return; try { if (file.size > 750_000) throw new Error("CSV 文件过大。"); const text = await file.text(); const codes = parsePlayCodesCsv(text); setCsv(text); setCount(codes.length); } catch (error) { setNotice(error instanceof Error ? error.message : "无法读取 CSV。"); } }} /></label>
      <p className="tiny">已读取 {count} 枚不重复代码。为避免泄露，页面不显示完整库存。</p>
      <label className="play-testing-consent"><input type="checkbox" required checked={unusedConfirmed} onChange={e => setUnusedConfirmed(e.target.checked)} disabled={busy} />我确认这些代码尚未兑换、也未通过其他渠道发给用户。</label>
      <button className="cta-button" disabled={!ready || busy || !count}>导入为暂停批次</button>
    </form></details>
    <div className="admin-inbox-list">{batches.map(batch => <div className="admin-inbox-item admin-inbox-body" key={batch.id}>
      <h4>{appTitle(batch.package_name)} · {batch.label}</h4>
      <p>总数 {batch.total} · 已分配 {batch.assigned} · 未分配且未停用 {batch.remaining} · 停用 {batch.blocked}</p>
      <p className="tiny muted">{new Date(batch.valid_from).toLocaleString()} - {new Date(batch.valid_until).toLocaleString()} · {new Date(batch.valid_until).getTime() <= Date.now() ? "已到期" : batch.enabled ? "已启用（到开始时间才发放）" : "暂停"}</p>
      {!batch.enabled && <label className="play-testing-consent"><input type="checkbox" checked={!!activeConfirmed[batch.id]} onChange={e => setActiveConfirmed(value => ({ ...value, [batch.id]: e.target.checked }))} disabled={busy} />我已在 Google Play 确认该促销活动为 Active，日期正确。</label>}
      <button className="pill-button" disabled={busy || (!batch.enabled && (!activeConfirmed[batch.id] || new Date(batch.valid_until).getTime() <= Date.now()))} onClick={() => void mutate({ action: "batch", batchId: batch.id, enabled: !batch.enabled, googleActiveConfirmed: !!activeConfirmed[batch.id] }, () => batch.enabled ? "批次已暂停。" : "批次已启用；仅在有效期内自动发放。")}>{batch.enabled ? "暂停发放" : "启用发放"}</button>
    </div>)}</div>
    <details className="admin-inbox-item"><summary>停用已经手动发出、兑换或泄露的代码</summary><div className="admin-inbox-body input-group"><p className="tiny muted">每行一个代码。停用后不再发放，也不会回收到库存；这不会撤销用户已在 Google 获得的应用。</p><textarea className="input" rows={3} value={blockCsv} onChange={e => setBlockCsv(e.target.value)} autoComplete="off" spellCheck={false} disabled={busy} /><button className="pill-button" disabled={!ready || busy || !blockCsv.trim()} onClick={async () => { if (await mutate({ action: "block", csv: blockCsv }, result => `已停用 ${result.blocked} 枚代码。`)) setBlockCsv(""); }}>停用这些代码</button></div></details>
    <details className="admin-inbox-item"><summary>最近的分配记录（最多 100 条，不显示代码）</summary><div className="admin-inbox-body">{claims.length ? claims.map(claim => <p key={`${claim.package_name}:${claim.email}`}><strong>{appTitle(claim.package_name)}</strong> · {claim.email}<br /><span className="tiny muted">{new Date(claim.assigned_at).toLocaleString()} · {claim.blocked ? "代码已停用" : "已分配，Google 兑换状态未核实"}</span></p>) : <p>暂无分配记录。</p>}</div></details>
  </section>;
}
