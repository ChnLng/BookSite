"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Megaphone } from "lucide-react";
import {
  advertisingConsentEvent, advertisingConsentKey, adsterraFrameChannel,
  adsterraFrameDocument, adsterraUnitId, isAdvertisingHost, readAdvertisingChoice,
  type AdvertisingChoice,
} from "@/lib/advertising";

export function PartnerAdSlot() {
  const titleId = useId();
  const slotRef = useRef<HTMLElement>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [choice, setChoice] = useState<AdvertisingChoice | null>(null);
  const [editing, setEditing] = useState(false);
  const [productionHost, setProductionHost] = useState(false);
  const [visible, setVisible] = useState(false);
  const [seen, setSeen] = useState(false);
  const [frameHeight, setFrameHeight] = useState(280);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    const readChoice = () => {
      try { setChoice(readAdvertisingChoice(window.localStorage.getItem(advertisingConsentKey))); }
      catch { setChoice(null); }
    };
    readChoice();
    setProductionHost(process.env.NODE_ENV === "production" && isAdvertisingHost(window.location.hostname));
    const onStorage = (event: StorageEvent) => { if (event.key === advertisingConsentKey || event.key === null) readChoice(); };
    window.addEventListener("storage", onStorage);
    window.addEventListener(advertisingConsentEvent, readChoice);
    return () => { window.removeEventListener("storage", onStorage); window.removeEventListener(advertisingConsentEvent, readChoice); };
  }, []);

  useEffect(() => {
    const slot = slotRef.current;
    if (!slot) return;
    // CSS-hidden mobile sidebars must never create an ad impression.
    const resize = new ResizeObserver(() => setVisible(slot.getBoundingClientRect().width > 0));
    resize.observe(slot);
    const intersection = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) setSeen(true);
    });
    intersection.observe(slot);
    return () => { resize.disconnect(); intersection.disconnect(); };
  }, []);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.source !== frameRef.current?.contentWindow || event.origin !== "null" || event.data?.channel !== adsterraFrameChannel) return;
      if (event.data.status === "error" || event.data.status === "empty") { setUnavailable(true); return; }
      const height = event.data.height;
      if (typeof height === "number" && Number.isFinite(height) && height > 40) setFrameHeight(Math.min(720, Math.max(160, height)));
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  const choose = (next: AdvertisingChoice) => {
    try {
      window.localStorage.setItem(advertisingConsentKey, JSON.stringify({ version: 1, choice: next, savedAt: Date.now() }));
      window.dispatchEvent(new Event(advertisingConsentEvent));
    } catch { /* A blocked preference store must not prevent refusal. */ }
    setChoice(next); setEditing(false); setUnavailable(false);
  };
  const showChoices = choice === null || editing;
  const canLoad = choice === "accepted" && productionHost && visible && seen && !unavailable;

  return <aside ref={slotRef} className="panel glass ad-slot-panel partner-ad-panel" aria-labelledby={titleId} data-ad-unit={adsterraUnitId}>
    <div className="section-heading">
      <span className="section-heading-icon" aria-hidden="true"><Megaphone size={17} /></span>
      <h2 className="section-heading-text" id={titleId}>Ads</h2>
    </div>
    <div className="native-ad-content">
      <span className="partner-ad-disclosure">Publicité · Adsterra</span>
      {showChoices ? <>
        <strong>Votre choix publicitaire</strong>
        <p className="tiny muted">Autorisez-vous Adsterra à utiliser des cookies et votre activité pour personnaliser les annonces et mesurer leur audience ? Le site reste accessible si vous refusez.</p>
        <div className="native-ad-choices">
          <button className="pill-button" type="button" onClick={() => choose("accepted")}>Accepter</button>
          <button className="pill-button" type="button" onClick={() => choose("rejected")}>Refuser</button>
        </div>
      </> : choice === "rejected" ? <>
        <p className="tiny muted">Publicité désactivée selon votre choix.</p>
        <button className="pill-button" type="button" onClick={() => setEditing(true)}>Modifier mon choix</button>
      </> : <>
        {!productionHost ? <p className="tiny muted">Aperçu local : aucune publicité externe n’est chargée.</p> : unavailable ? <p className="tiny muted">Aucune annonce à afficher pour le moment.</p> : null}
        {canLoad ? <iframe ref={frameRef} className="native-ad-frame" title="Publicité Adsterra" srcDoc={adsterraFrameDocument} height={frameHeight} sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox" referrerPolicy="strict-origin" /> : null}
        <button className="pill-button native-ad-withdraw" type="button" onClick={() => choose("rejected")}>Retirer mon accord</button>
      </>}
      <details className="native-ad-privacy">
        <summary>Confidentialité publicitaire</summary>
        <p>Adsterra (AD MARKET LIMITED et ADMEDIA LLC FZ) et ses prestataires peuvent traiter votre adresse IP, des identifiants et des informations de navigation pour ces publicités. Votre choix est mémorisé dans ce navigateur pendant 180 jours. Vous pouvez le modifier ici à tout moment, sans perdre l’accès au site.</p>
        <a href="https://adsterra.com/privacy-policy-managed/" target="_blank" rel="noopener noreferrer">Politique de confidentialité Adsterra</a>
      </details>
    </div>
  </aside>;
}
