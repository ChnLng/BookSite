import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Guide des applications Android | Visd AR",
  robots: { index: false, follow: false },
};

export default function GuideTesterPage() {
  redirect("/guideProduction");
}
