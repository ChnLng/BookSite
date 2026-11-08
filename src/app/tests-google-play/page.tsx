import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Tester gratuitement nos applications Android",
  description: "Testez gratuitement les applications Android de Visd AR avant leur lancement officiel sur Google Play.",
};

export default async function PlayTestingPage({ searchParams }: { searchParams: Promise<{ app?: string }> }) {
  await searchParams;
  redirect("/catalogue");
}
