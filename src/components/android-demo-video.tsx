"use client";

import { useEffect, useState } from "react";
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

  if (!video) return null;

  if (mode === "inline") {
    return (
      <figure className="android-demo-video-inline">
        <figcaption><Play size={14} aria-hidden="true" /> Démonstration de l’application</figcaption>
        <video controls autoPlay loop muted preload="metadata" playsInline aria-label={`Démonstration vidéo de ${title}`}>
          <source src={video.src} type="video/mp4" />
          Votre navigateur ne prend pas en charge la lecture vidéo.
        </video>
      </figure>
    );
  }

  return (
    <>
      <button className="android-demo-video-trigger" type="button" onClick={() => setOpen(true)}>
        <Play size={16} fill="currentColor" aria-hidden="true" />
        Voir la démonstration vidéo
      </button>
      {open ? createPortal(
        <div className="android-demo-video-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
          <section className="android-demo-video-dialog" role="dialog" aria-modal="true" aria-label={`Démonstration vidéo de ${title}`}>
            <div className="android-demo-video-dialog-header">
              <div>
                <span className="android-demo-video-kicker">Démonstration Android</span>
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
