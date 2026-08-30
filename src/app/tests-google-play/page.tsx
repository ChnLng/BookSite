import type { Metadata } from "next";
import { PlayTestingApplication } from "@/components/play-testing-application";

export const metadata: Metadata = {
  title: "Tester gratuitement nos applications Android",
  description: "Demandez un accès gratuit aux tests fermés Google Play de Visd AR.",
};

export default async function PlayTestingPage({ searchParams }: { searchParams: Promise<{ app?: string }> }) {
  const { app } = await searchParams;
  return <PlayTestingApplication initialPackageName={app} />;
}
