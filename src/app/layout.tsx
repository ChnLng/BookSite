import type { Metadata } from "next";
import Script from "next/script";
import { Cormorant_Garamond, Nunito } from "next/font/google";
import { AuthProvider } from "@/components/auth-provider";
import "./globals.css";

const heading = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-heading",
});

const body = Nunito({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
});

export const metadata: Metadata = {
  title: "Hub bilingue 🇨🇳 Chinois - Français 🇫🇷",
  description: "Venez dans un univers tout doux de livres bilingues franco-chinois 🌸",
  openGraph: {
    title: "Hub bilingue 🇨🇳 Chinois - Français 🇫🇷",
    description: "Venez dans un univers tout doux de livres bilingues franco-chinois 🌸",
  },
  icons: {
    icon: "/images/logo.png",
    shortcut: "/images/logo.png",
    apple: "/images/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body
        className={`${heading.variable} ${body.variable}`}
        style={{
          fontFamily: "var(--font-body), sans-serif",
        }}
      >
        <Script
          id="visdar-preferred-view-bootstrap"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var root=document.documentElement;var desktopPreference=window.localStorage.getItem("visdar-preferred-view")==="desktop";if(desktopPreference){root.dataset.preferredView="desktop";}else{delete root.dataset.preferredView;}}catch(e){}})();`,
          }}
        />
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
