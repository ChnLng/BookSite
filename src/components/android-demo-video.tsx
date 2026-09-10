"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Play, X } from "lucide-react";
import { getAndroidDemoVideo } from "@/lib/android-demo-videos";

type AndroidDemoVideoProps = {
  packageName: string;
  title: string;
  mode?: "modal" | "inline";
};

export function AndroidDemoVideo({ packageName, title, mode = "modal" }: AndroidDemoVideoProps) {
  const video = getAndroidDemoVideo(packageName);
  const [open, setOpen] = useState(false);
  const [inlinePlaying, setInlinePlaying] = useState(false);
  const [inlineMuted, setInlineMuted] = useState(true);
  const inlineVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!open || mode !== "modal") return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [mode, open]);

  useEffect(() => {
    if (mode !== "inline" || !inlineVideoRef.current) return;

    const element = inlineVideoRef.current;
    const startPlayback = () => {
      void element.play().catch(() => undefined);
    };
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) startPlayback();
    }, { threshold: 0.2 });

    observer.observe(element);
    element.addEventListener("loadeddata", startPlayback, { once: true });
    startPlayback();

    return () => {
      observer.disconnect();
      element.removeEventListener("loadeddata", startPlayback);
    };
  }, [mode, packageName]);

  if (!video) return null;

  if (mode === "inline") {
    const toggleInlinePlayback = () => {
      const element = inlineVideoRef.current;
      if (!element) return;
      if (element.paused) void element.play().catch(() => undefined);
      else element.pause();
    };
    const toggleInlineMuted = () => {
      const element = inlineVideoRef.current;
      if (!element) return;
      element.muted = !element.muted;
      setInlineMuted(element.muted);
    };

    return (
      <figure className="android-demo-video-inline">
        <figcaption><Play size={14} aria-hidden="true" /> Vidéo de démonstration</figcaption>
        <video ref={inlineVideoRef} autoPlay loop muted preload="auto" playsInline aria-label={`Vidéo de démonstration de ${title}`} onPlay={() => setInlinePlaying(true)} onPause={() => setInlinePlaying(false)}>
          <source src={video.src} type="video/mp4" />
          Votre navigateur ne prend pas en charge la lecture vidéo.
        </video>
        <div className="android-demo-video-controls" aria-label="Commandes de la vidéo">
          <button type="button" onClick={toggleInlinePlayback}>{inlinePlaying ? "Pause" : "Lire"}</button>
          <button type="button" onClick={toggleInlineMuted}>{inlineMuted ? "Activer le son" : "Couper le son"}</button>
        </div>
      </figure>
    );
  }

  return (
    <>
      <button className="android-demo-video-trigger" type="button" onClick={() => setOpen(true)}>
        <Play size={16} fill="currentColor" aria-hidden="true" />
        Voir la vidéo de démonstration
      </button>
      {open ? createPortal(
        <div className="android-demo-video-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
          <section className="android-demo-video-dialog" role="dialog" aria-modal="true" aria-label={`Vidéo de démonstration de ${title}`}>
            <div className="android-demo-video-dialog-header">
              <div>
                <span className="android-demo-video-kicker">Vidéo de démonstration Android</span>
                <h2>{title}</h2>
              </div>
              <button type="button" className="android-demo-video-close" onClick={() => setOpen(false)} aria-label="Fermer la vidéo"><X size={20} /></button>
            </div>
            <video controls autoPlay playsInline preload="metadata" className="android-demo-video-player">
              <source src={video.src} type="video/mp4" />
              Votre navigateur ne prend pas en charge la lecture vidéo.
            </video>
          </section>
        </div>,
        document.body,
      ) : null}
    </>
  );
}
