import type { Metadata } from "next";
import { headers } from "next/headers";
import { HomePageClient } from "@/components/home-page-client";

export const metadata: Metadata = {
  title: "Livres bilingues et outils pour apprendre le chinois",
  alternates: { canonical: "/" },
};

function isMobileUserAgent(userAgent: string) {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(userAgent);
}

export default async function HomePage() {
  const headerStore = await headers();
  const userAgent = headerStore.get("user-agent") || "";

  return <HomePageClient initialMobile={isMobileUserAgent(userAgent)} />;
}
