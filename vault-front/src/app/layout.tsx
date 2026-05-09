import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/auth-context";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v13-appRouter";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import Box from "@mui/material/Box";
import { theme } from "@/theme/theme";
import { BottomNav } from "@/components/organisms/bottom-nav/bottom-nav";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "VaultedMind | Secure Your Mental Well-being",
  description: "VaultedMind is a high-security platform designed to track your mental health, daily logs, and personal insights with absolute privacy and encryption.",
  openGraph: {
    title: "VaultedMind | Secure Your Mental Well-being",
    description: "Your mental health data, protected in a modern digital vault.",
    images: ["/assets/logo.png"],
  },
  icons: {
    icon: "/icon.png",
    apple: "/apple-icon.png",
  },
};

import { Footer } from "@/components/organisms/footer/footer";

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
