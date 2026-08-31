"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { catalogueKinds, type CatalogueApp, type CatalogueConfig, type CatalogueKind } from "@/lib/android-catalogue";

export function AdminAndroidCatalogues() {
  const { session } = useAuth();
  const [kind, setKind] = useState<CatalogueKind>("android");
  const [config,setConfig]=useState<CatalogueConfig|null>(null);
  const [revision,setRevision]=useState(0), [refresh,setRefresh]=useState(0);
  const [setup,setSetup]=useState(false),[busy,setBusy]=useState(false),[dirty,setDirty]=useState(false);
  const [message,setMessage]=useState("");
  useEffect(()=>{
    const controller=new AbortController(); setConfig(null);setMessage("");setDirty(false);
    if(!session?.access_token)return;
    fetch(`/api/admin/android-catalogues?edition=${kind}`,{headers:{Authorization:`Bearer ${session.access_token}`},signal:controller.signal,cache:"no-store"})
      .then(async response=>{const data=await response.json();if(controller.signal.aborted)return;if(!response.ok||!data.config)throw new Error(data.message||"Chargement impossible.");setConfig(data.config);setRevision(data.revision);setSetup(!!data.setupNeeded);setMessage(data.message||"");})
      .catch(error=>{if(!controller.signal.aborted)setMessage(error.message||"Chargement impossible.");});
    return()=>controller.abort();
  },[kind,session?.access_token,refresh]);
  const patch=(next:Partial<CatalogueConfig>)=>{setConfig(current=>current?{...current,...next}:current);setDirty(true);};
  const field=(label:string,value:string,onChange:(value:string)=>void,multiline=false)=> <label className="admin-catalogue-field"><span>{label}</span>{multiline?<textarea value={value} rows={4} onChange={event=>onChange(event.target.value)}/>:<input value={value} onChange={event=>onChange(event.target.value)}/>}</label>;
  const save=async()=>{
    if(!config||!session?.access_token||setup)return;setBusy(true);setMessage("");
    try{const response=await fetch(`/api/admin/android-catalogues?edition=${kind}`,{method:"PUT",headers:{Authorization:`Bearer ${session.access_token}`,"Content-Type":"application/json"},body:JSON.stringify({config,revision})});const data=await response.json();if(!response.ok)throw new Error(data.message||"Enregistrement impossible.");setRevision(data.revision);setDirty(false);setMessage("已保存。链接中的目录会读取新版本。");}catch(error){setMessage(error instanceof Error?error.message:"Enregistrement impossible.");}finally{setBusy(false);}
  };
  const changeApp=(index:number,update:Partial<CatalogueApp>)=>{if(config)patch({apps:config.apps.map((app,i)=>i===index?{...app,...update}:app)});};
  const moveApp=(index:number,delta:number)=>{if(!config)return;const apps=[...config.apps];const target=index+delta;if(target<0||target>=apps.length)return;[apps[index],apps[target]]=[apps[target],apps[index]];patch({apps});};
  return <div className="admin-catalogue-editor"><p>两份独立的法语翻页目录，不显示在首页、导航或 sitemap，并要求搜索引擎不收录。持有链接的人仍可转发；这不是密码保护。</p>
    <div className="admin-catalogue-toolbar"><select value={kind} disabled={busy} onChange={event=>{if(!dirty||window.confirm("有未保存的修改，仍要切换目录吗？"))setKind(event.target.value as CatalogueKind);}}>{catalogueKinds.map(value=><option key={value} value={value}>{value==="android"?"个人版 · Découverte":"机构版 · B2B"}</option>)}</select><a href={`/collections/${kind}`} target="_blank" rel="noopener noreferrer" className="button">打开目录 ↗</a><button className="button" onClick={()=>navigator.clipboard.writeText(`${window.location.origin}/collections/${kind}`).then(()=>setMessage("目录链接已复制。")).catch(()=>setMessage("复制失败，可从“打开目录”取得链接。"))}>复制链接</button><button className="button" disabled={busy} onClick={()=>{if(!dirty||window.confirm("重新载入会丢弃未保存修改，继续吗？"))setRefresh(v=>v+1);}}>重新载入</button></div>
    <p role="status" className={setup?"admin-catalogue-warning":""}>{message}</p>
    {config?<fieldset disabled={busy} className="admin-catalogue-fields"><label><input type="checkbox" checked={config.enabled} onChange={e=>patch({enabled:e.target.checked})}/> 启用此目录（关闭后链接显示 404）</label>
      <details open><summary>封面与开场文字</summary>{field("封面标题",config.title,title=>patch({title}))}{field("简介",config.introduction,introduction=>patch({introduction}),true)}</details>
      <details><summary>应用内容、显示与排序（{config.apps.length}）</summary>{config.apps.map((app,index)=><section className="admin-catalogue-app" key={app.packageName}><div className="admin-catalogue-toolbar"><strong>{index+1}. {app.title}</strong><button type="button" disabled={index===0} onClick={()=>moveApp(index,-1)}>↑</button><button type="button" disabled={index===config.apps.length-1} onClick={()=>moveApp(index,1)}>↓</button><label><input type="checkbox" checked={app.visible} onChange={e=>changeApp(index,{visible:e.target.checked})}/> 显示</label></div>{([['title','法语名称'],['chinese','中文名称'],['pinyin','拼音'],['subtitle','一句话介绍'],['description','应用介绍'],['audience','适合人群']] as const).map(([key,label])=><div key={key}>{field(label,app[key],value=>changeApp(index,{[key]:value}),key==='description')}</div>)}{field("特点（每行一条）",app.features.join("\n"),value=>changeApp(index,{features:value.split("\n")}),true)}<small>Google Play 链接与已知应用包名绑定，避免误导至其他应用。</small><p><a href={`https://play.google.com/store/apps/details?id=${app.packageName}`} target="_blank" rel="noopener noreferrer">{app.packageName} ↗</a></p></section>)}</details>
      {kind==="android"?<details open><summary>最后一页：免费试用</summary><label><input type="checkbox" checked={config.testEnabled} onChange={e=>patch({testEnabled:e.target.checked})}/> 显示 Phase de test 页</label>{field("标题",config.testTitle,testTitle=>patch({testTitle}))}{field("说明",config.testText,testText=>patch({testText}),true)}</details>:<>
        <details open><summary>批量授权价格</summary><label><input type="checkbox" checked={config.pricingDraft} onChange={e=>patch({pricingDraft:e.target.checked})}/> 保留“报价草案”提示（价格与合同确认后再取消）</label>{config.tiers.map((tier,index)=><div className="admin-catalogue-toolbar" key={index}><label>从 <input type="number" min={1} value={tier.minimum} onChange={e=>patch({tiers:config.tiers.map((t,i)=>i===index?{...t,minimum:Number(e.target.value)}:t)})}/> 份起</label><label>按原价 <input type="number" min={1} max={100} value={tier.percent} onChange={e=>patch({tiers:config.tiers.map((t,i)=>i===index?{...t,percent:Number(e.target.value)}:t)})}/> %</label></div>)}{field("授权范围与计价规则",config.licenceTerms,licenceTerms=>patch({licenceTerms}),true)}</details>
        <details><summary>定制开发套餐</summary>{config.packages.map((pack,index)=><section key={index} className="admin-catalogue-app">{field("套餐名称",pack.name,name=>patch({packages:config.packages.map((p,i)=>i===index?{...p,name}:p)}))}<label>价格 € HT <input type="number" min={1} value={pack.price} onChange={e=>patch({packages:config.packages.map((p,i)=>i===index?{...p,price:Number(e.target.value)}:p)})}/></label>{field("包含的工作范围",pack.scope,scope=>patch({packages:config.packages.map((p,i)=>i===index?{...p,scope}:p)}),true)}</section>)}</details>
        {([['delivery','交付时间与校内试用'],['publishing','发布方式与不包含项目'],['terms','付款、退款与责任限制']] as const).map(([key,label])=><details key={key}><summary>{label}</summary>{config[key].map((paragraph,index)=><div key={index}>{field(`段落 ${index+1}`,paragraph,value=>patch({[key]:config[key].map((text,i)=>i===index?value:text)}),true)}</div>)}</details>)}
      </>}
      <div className="admin-catalogue-toolbar"><button className="button primary" onClick={save} disabled={setup||!dirty||busy}>{busy?"保存中…":"保存目录"}</button><span>{dirty?"有未保存修改":"已同步"} · 版本 {revision}</span></div>
    </fieldset>:<p>正在读取目录…</p>}
  </div>;
}
