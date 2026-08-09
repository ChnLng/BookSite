import type { Metadata } from "next";
import Script from "next/script";
import { Cormorant_Garamond, Nunito } from "next/font/google";
import { AuthProvider } from "@/components/auth-provider";
import { StructuredData } from "@/components/structured-data";
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
  metadataBase: new URL("https://www.visdar.fr"),
  title: {
    default: "Visd AR — livres et outils pour apprendre le chinois en français",
    template: "%s | Visd AR",
  },
  description: "Livres bilingues chinois-français, ebooks avec sinogrammes, pinyin et traduction, jeux et outils numériques pour apprendre le chinois en douceur.",
  applicationName: "Visd AR",
  authors: [{ name: "Visd AR", url: "https://www.visdar.fr" }],
  creator: "Visd AR",
  publisher: "Visd AR",
  keywords: ["apprendre le chinois", "livre chinois débutant", "ebook chinois français", "pinyin traduction française", "jeu éducatif chinois"],
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 } },
  openGraph: {
    type: "website",
    locale: "fr_FR",
    siteName: "Visd AR",
    title: "Visd AR — apprendre le chinois par les histoires",
    description: "Ebooks bilingues, sinogrammes, pinyin, traduction française et outils ludiques pour les apprenants francophones.",
    images: [{ url: "/images/logo.png", width: 200, height: 200, alt: "Visd AR" }],
  },
  twitter: { card: "summary_large_image", title: "Visd AR — apprendre le chinois par les histoires", description: "Livres bilingues chinois-français et outils numériques pour débutants.", images: ["/images/logo.png"] },
  icons: {
    icon: [
      { url: "/images/logo.png", type: "image/png", sizes: "200x200" },
    ],
    shortcut: "/images/logo.png",
    apple: [
      { url: "/images/apple-touch-icon.png", type: "image/png", sizes: "180x180" },
    ],
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
        <StructuredData data={{
          "@context": "https://schema.org",
          "@type": "Organization",
          "@id": "https://www.visdar.fr/#organization",
          name: "Visd AR",
          url: "https://www.visdar.fr",
          logo: "https://www.visdar.fr/images/logo.png",
          description: "Livres bilingues chinois-français et ressources numériques pour apprendre le chinois en français.",
          email: "visdar@outlook.fr",
          areaServed: "FR",
          knowsLanguage: ["fr", "zh"],
        }} />
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
