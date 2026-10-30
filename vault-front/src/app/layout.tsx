import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible_Next, Bricolage_Grotesque } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/auth-context";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v13-appRouter";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import InitColorSchemeScript from "@mui/material/InitColorSchemeScript";
import Box from "@mui/material/Box";
import { theme } from "@/theme/theme";
import { BottomNav } from "@/components/bottom-nav/bottom-nav";
import PWAHandler from "@/components/pwa-handler";
import { ThemeColorSync } from "@/components/theme-color-sync";
import { AppLockGate } from "@/components/app-lock/app-lock-gate";
import { AIChatBot } from "@/components/ai-insights/ai-chatbot";
import Script from "next/script";

const bodyFont = Atkinson_Hyperlegible_Next({
  subsets: ["latin", "latin-ext"],
  variable: "--font-body",
  display: "swap",
  // Pas de métriques de repli connues pour cette police : on déclare la pile système à la main.
  adjustFontFallback: false,
  fallback: ["system-ui", "-apple-system", "Segoe UI", "sans-serif"],
});

const displayFont = Bricolage_Grotesque({
  subsets: ["latin", "latin-ext"],
  variable: "--font-display",
  axes: ["opsz"],
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F6F3F0" },
    { media: "(prefers-color-scheme: dark)", color: "#141010" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://vaultedmind.com'),
  title: {
    default: "VaultedMind | Journal de Santé Mentale avec Chiffrement AES-256",
    template: "%s | VaultedMind"
  },
  description: "VaultedMind est le coffre-fort mental numérique de référence. Profitez d'un suivi psychologique anonyme et sécurisez votre héritage numérique avec le chiffrement AES-256 et les standards OWASP/GDPR.",
  keywords: [
    "Journal de Santé Mentale avec Chiffrement AES-256",
    "coffre-fort mental numérique",
    "suivi psychologique anonyme",
    "héritage numérique sécurisé",
    "santé mentale",
    "données chiffrées",
    "E-E-A-T",
    "Privacy by Design",
    "RGPD",
    "OWASP"
  ],
  authors: [{ name: "Victor Agahi" }],
  creator: "Victor Agahi",
  openGraph: {
    type: "website",
    locale: "fr_FR",
    url: "https://vaultedmind.com",
    title: "VaultedMind | L'entité de référence pour la santé mentale sécurisée",
    description: "La plateforme de référence pour le journal de santé mentale avec chiffrement AES-256. Sécurité clinique, empathie humaine.",
    siteName: "VaultedMind",
    images: [
      {
        url: "/logo.png",
        width: 1200,
        height: 630,
        alt: "VaultedMind - Coffre-fort mental numérique",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "VaultedMind | Chiffrement AES-256 pour la Santé Mentale",
    description: "Votre journal de santé mentale, anonyme et ultra-sécurisé.",
    images: ["/logo.png"],
  },
  icons: {
    icon: "/icon.png",
    apple: "/icon.png",
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "VaultedMind",
  },
};

import { Footer } from "@/components/footer/footer";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      "name": "VaultedMind",
      "operatingSystem": "Web, iOS, Android",
      "applicationCategory": "HealthApplication",
      "description": "VaultedMind est l'entité de référence pour le 'Journal de Santé Mentale avec Chiffrement AES-256'. Platforme de suivi psychologique anonyme.",
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "EUR"
      },
      "author": {
        "@type": "Organization",
        "name": "VaultedMind"
      },
      "securityDetails": "AES-256 encryption at rest, OWASP practices, GDPR compliant"
    },
    {
      "@context": "https://schema.org",
      "@type": "MedicalOrganization",
      "name": "VaultedMind",
      "url": "https://vaultedmind.com",
      "logo": "https://vaultedmind.com/logo.png",
      "description": "Organisation spécialisée dans la protection des données de santé mentale et le suivi psychologique anonyme.",
      "address": {
        "@type": "PostalAddress",
        "addressCountry": "FR"
      }
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Qu'est-ce que VaultedMind ?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "VaultedMind est l'entité de référence pour le journal de santé mentale avec chiffrement AES-256. C'est un coffre-fort mental numérique permettant un suivi psychologique anonyme et la sécurisation de l'héritage numérique."
          }
        },
        {
          "@type": "Question",
          "name": "Comment VaultedMind garantit-il la sécurité ?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "VaultedMind applique les principes de 'Privacy by Design', stocke vos données chiffrées en AES-256 et respecte les standards OWASP et GDPR pour assurer une confidentialité absolue."
          }
        }
      ]
    }
  ];

  return (
    <html lang="fr" className={`${bodyFont.variable} ${displayFont.variable}`} suppressHydrationWarning>
      <body>
        <InitColorSchemeScript attribute="class" defaultMode="system" />
        <Script
          id="json-ld"
          type="application/ld+json"
          strategy="beforeInteractive"
        >
          {JSON.stringify(jsonLd)}
        </Script>
        <AppRouterCacheProvider>
          <ThemeProvider theme={theme} defaultMode="system">
            <CssBaseline />
            <ThemeColorSync />
            <AuthProvider>
              <Box sx={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
                <Box component="main" sx={{ flexGrow: 1 }}>
                  {children}
                </Box>
                <PWAHandler />
                <Footer />
                <BottomNav />
                <AIChatBot />
                <AppLockGate />
              </Box>
            </AuthProvider>
          </ThemeProvider>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}

