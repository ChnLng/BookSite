import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Lecture privée",
  robots: { index: false, follow: false, nocache: true },
};

export default function PrivateReaderLayout({ children }: { children: React.ReactNode }) {
  return children;
}
