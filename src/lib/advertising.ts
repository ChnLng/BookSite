export const advertisingConsentKey = "visdar-adsterra-consent-v1";
export const advertisingConsentEvent = "visdar-adsterra-consent-change";
export const advertisingConsentLifetime = 180 * 24 * 60 * 60 * 1000;
export type AdvertisingChoice = "accepted" | "rejected";

export function readAdvertisingChoice(raw: string | null, now = Date.now()): AdvertisingChoice | null {
  try {
    const value = JSON.parse(raw || "null");
    return value?.version === 1 && (value.choice === "accepted" || value.choice === "rejected") &&
      Number.isFinite(value.savedAt) && value.savedAt <= now && now - value.savedAt < advertisingConsentLifetime
      ? value.choice : null;
  } catch { return null; }
}

export function isAdvertisingHost(hostname: string) {
  return hostname === "www.visdar.fr" || hostname === "visdar.fr";
}

// Public publisher configuration supplied by the site owner; never an API key.
export const adsterraUnitId = "30994241";
export const adsterraContainerId = "container-0cb5354fc99d2b62ae8e5ef57f726c6c";
export const adsterraScriptUrl = "https://pl31094740.profitableratecpmnetwork.com/0cb5354fc99d2b62ae8e5ef57f726c6c/invoke.js";
export const adsterraFrameChannel = "visdar-native-ad-30994241";

// No allow-same-origin: advertising cannot read authentication storage,
// website forms or private product downloads in the parent document.
export const adsterraFrameDocument = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="referrer" content="strict-origin"><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;padding:0;background:transparent;color:#49336e;font:14px/1.5 system-ui,sans-serif;overflow-wrap:anywhere}*{box-sizing:border-box}img{max-width:100%}a{color:inherit}#${adsterraContainerId}{width:100%}</style></head><body>
<div id="${adsterraContainerId}"></div>
<script>
const adContainer=document.getElementById('${adsterraContainerId}');
const report=(status)=>parent.postMessage({channel:'${adsterraFrameChannel}',status,height:Math.ceil(adContainer.getBoundingClientRect().height)+16},'*');
new ResizeObserver(()=>report('resize')).observe(adContainer);
setTimeout(()=>{if(!adContainer.children.length)report('empty');},15000);
<\/script>
<script async="async" data-cfasync="false" src="${adsterraScriptUrl}" onerror="report('error')"><\/script>
</body></html>`;
