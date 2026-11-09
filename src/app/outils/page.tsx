import type { Metadata } from "next";
import { CatalogueClient } from "@/components/catalogue-client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Applications Android pour apprendre le chinois",
  description: "Découvrez les applications Android Visd AR pour apprendre le chinois avec des outils ludiques, du pinyin et des explications en français.",
  alternates: { canonical: "/outils" },
};

export default function OutilsPage() {
  return <CatalogueClient initialBooks={[]} />;
}
