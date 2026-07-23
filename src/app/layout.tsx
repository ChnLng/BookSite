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
  title: "Visd AR | Livres bilingues chinois-francais",
  description:
    "Boutique poetique pour les livres electroniques Visd AR, avec donation, espace client et administration bilingue.",
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
          src="https://www.paypal.com/sdk/js?client-id=BAAQOWw6DVBBenlHrUo5xWPqO1hOT3ukzJi5t1TWfXKaqjuAfo6E4VOzai2aXku4al_2GmAFDcowjxqLNw&components=hosted-buttons&disable-funding=venmo&currency=EUR"
          strategy="afterInteractive"
        />
        <Script
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6796254088003500"
          strategy="afterInteractive"
          crossOrigin="anonymous"
        />
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
