import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/ui/Toast";
import { QueryProvider } from "@/components/QueryProvider";
import { ErrorBoundaryProvider } from "@/components/ErrorBoundaryProvider";
import { ServiceWorkerRegistration } from "@/components/ServiceWorkerRegistration";
import { GlobalSearch } from "@/components/GlobalSearch";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Finanzas JGM",
  description: "Gestión financiera personal con control de movimientos, deudas, ahorros y proyectos",
  manifest: "/manifest.json",
  themeColor: "#3ED6D8",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Finanzas JGM",
  },
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    viewportFit: "cover",
  },
  icons: {
    icon: "/icon-192.png",
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <QueryProvider>
          <ToastProvider>
            <ErrorBoundaryProvider>
              <ServiceWorkerRegistration />
              <GlobalSearch />
              {children}
            </ErrorBoundaryProvider>
          </ToastProvider>
        </QueryProvider>
      </body>
    </html>
  );
}

