import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "next-themes";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap", // font-display:swap — prevents render blocking
  preload: true,
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap", // font-display:swap — prevents render blocking
  preload: false, // mono font is non-critical, don't preload
});

export const viewport: Viewport = {
  themeColor: "#0B2A5B",
  width: "device-width",
  initialScale: 1,
  // maximumScale removed — allows accessibility zoom & fixes PageSpeed Best Practices warning
};

export const metadata: Metadata = {
  title: "Benim İçin Yap - Güvenli Görev Devri",
  description:
    "Şifreli Uçtan Uca İletişim & Ödeme Güvence Altyapısı ile güvenli görev devri platformu. Escrow sistemli ödeme güvencesi.",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "48x48" },
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/favicon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/icons/icon.svg", type: "image/svg+xml" },
    ],
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Benim İçin Yap",
  },
  openGraph: {
    title: "Benim İçin Yap - Güvenli Görev Devri",
    description: "Şifreli Uçtan Uca İletişim & Ödeme Güvence Altyapısı",
    url: "https://benimicinyap-rho.vercel.app",
    siteName: "Benim İçin Yap",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Benim İçin Yap - Güvenli Görev Devri",
      },
    ],
    locale: "tr_TR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Benim İçin Yap - Güvenli Görev Devri",
    description: "Şifreli Uçtan Uca İletişim & Ödeme Güvence Altyapısı",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" sizes="48x48" />
        <link rel="icon" href="/icons/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
        {/* DNS prefetch for faster external connections */}
        <link rel="dns-prefetch" href="https://unpkg.com" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased font-sans`}
      >
        {/* Skip to main content — fixes "no landmark" accessibility warning */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded-lg"
        >
          Ana içeriğe geç
        </a>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
        >
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}