import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/auth-context";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v13-appRouter";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import Box from "@mui/material/Box";
import { theme } from "@/theme/theme";
import { BottomNav } from "@/components/bottom-nav/bottom-nav";
import PWAHandler from "@/components/pwa-handler";

const inter = Inter({ subsets: ["latin"] });

export const viewport: Viewport = {
  themeColor: "#d81832",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  title: "VaultedMind | Sécurisez votre bien-être mental",
  description: "VaultedMind est une plateforme de haute sécurité conçue pour suivre votre santé mentale, vos journaux quotidiens et vos réflexions personnelles avec une confidentialité et un chiffrement absolus.",
  openGraph: {
    title: "VaultedMind | Sécurisez votre bien-être mental",
    description: "Vos données de santé mentale, protégées dans un coffre-fort numérique moderne.",
    images: ["/assets/logo.png"],
  },
  icons: {
    icon: "/icon.png",
    apple: "/apple-icon.png",
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "VaultedMind",
    startupImage: "/assets/logo.png",
  },
};

import { Footer } from "@/components/footer/footer";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AppRouterCacheProvider>
          <ThemeProvider theme={theme}>
            <CssBaseline />
            <AuthProvider>
              <Box sx={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
                <Box component="main" sx={{ flexGrow: 1 }}>
                  {children}
                </Box>
                <PWAHandler />
                <Footer />
                <BottomNav />
              </Box>
            </AuthProvider>
          </ThemeProvider>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
