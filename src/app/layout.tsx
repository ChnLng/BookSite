import type { Metadata } from "next";
import Script from "next/script";
import { Cormorant_Garamond, Nunito } from "next/font/google";
import { AuthProvider } from "@/components/auth-provider";
import "./globals.css";

const googleTagManagerId = "GTM-N3S5X785";

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
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${googleTagManagerId}');`,
          }}
        />
        <script
          async
          crossOrigin="anonymous"
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6796254088003500"
        />
      </head>
      <body
        className={`${heading.variable} ${body.variable}`}
        style={{
          fontFamily: '"Visdar Chinese Kai", var(--font-body), sans-serif',
        }}
      >
        <noscript>
          <iframe
            src={`https://www.googletagmanager.com/ns.html?id=${googleTagManagerId}`}
            height="0"
            width="0"
            title="Google Tag Manager"
            style={{ display: "none", visibility: "hidden" }}
          />
        </noscript>
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
