import type { Metadata } from "next";
import { PlayTestingMultiApplication } from "@/components/play-testing-multi-application";

export const metadata: Metadata = {
  title: "Tester gratuitement nos applications Android",
  description: "Testez gratuitement les applications Android de Visd AR avant leur lancement officiel sur Google Play.",
};

export default async function PlayTestingPage({ searchParams }: { searchParams: Promise<{ app?: string }> }) {
  const { app } = await searchParams;
  return <PlayTestingMultiApplication initialPackageName={app} />;
}
