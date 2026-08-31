"use client";
import { useEffect, useState } from "react";

// The standalone catalogues honour the site's existing phone view preference.
export function CatalogueViewToggle() {
  const [desktop,setDesktop]=useState(false);
  useEffect(()=>{
    setDesktop(document.documentElement.dataset.preferredView==="desktop");
    const resize=()=>{
      if(document.documentElement.dataset.preferredView==="desktop"&&innerWidth<768)
        document.documentElement.style.setProperty("--desktop-preview-scale",String(Math.min(1,innerWidth/1180)));
      else document.documentElement.style.removeProperty("--desktop-preview-scale");
    };
    resize();window.addEventListener("resize",resize);return()=>window.removeEventListener("resize",resize);
  },[]);
  const toggle=()=>{
    const next=!desktop,root=document.documentElement;setDesktop(next);
    if(next){root.dataset.preferredView="desktop";root.style.setProperty("--desktop-preview-scale",String(Math.min(1,innerWidth/1180)));}
    else {delete root.dataset.preferredView;root.style.removeProperty("--desktop-preview-scale");}
    try{if(next)localStorage.setItem("visdar-preferred-view","desktop");else localStorage.removeItem("visdar-preferred-view");}catch{}
    window.dispatchEvent(new Event("visdar:view-mode-changed"));
  };
  return <div className="topbar-utility"><button className="topbar-utility-button" type="button" onClick={toggle}>{desktop?"Version mobile":"Version ordinateur"}</button></div>;
}
