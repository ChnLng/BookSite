import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AndroidCatalogueBook } from "@/components/android-catalogue-book";
import { isCatalogueKind } from "@/lib/android-catalogue";
import { loadAndroidCatalogue } from "@/lib/android-catalogue-server";
import "@/app/android-catalogue.css";

export const dynamic = "force-dynamic";
export async function generateMetadata({ params }: { params: Promise<{ edition: string }> }): Promise<Metadata> {
  const { edition } = await params;
  const title = edition === "android-professionnels" ? "Applications Android — Catalogue professionnel" : "Applications Android — La collection";
  const description = "Feuilletez la collection d’applications Android Visd AR : chinois, pinyin et français.";
  return { title, description, openGraph: { title, description, images: ["/images/logo.png"] }, twitter: { title, description, images: ["/images/logo.png"] }, robots: { index: false, follow: false, googleBot: { index: false, follow: false, noimageindex: true } }, referrer: "no-referrer" };
}
export default async function CataloguePage({ params }: { params: Promise<{ edition: string }> }) {
  const { edition } = await params;
  if (!isCatalogueKind(edition)) notFound();
  const result = await loadAndroidCatalogue(edition);
  if (result.disabled) notFound();
  if (!result.config) return <main className="collection-shell"><h1>Le catalogue est momentanément indisponible.</h1><p>Veuillez réessayer dans quelques instants.</p><a href="mailto:visdar@outlook.fr">Contacter Visd AR</a></main>;
  return <AndroidCatalogueBook config={result.config} kind={edition}/>;
}
