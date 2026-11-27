import type { Metadata } from "next";
import { HomeExperience } from "@/components/home-experience";
import { loadHomeExperience } from "@/lib/home-experience-server";

export const metadata: Metadata = {
  title: "Livres bilingues et outils pour apprendre le chinois",
  alternates: { canonical: "/" },
};

export const dynamic = "force-dynamic";

export default async function HomePage() {
  return <HomeExperience {...await loadHomeExperience()} />;
}
