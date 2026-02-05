import type { Metadata, Viewport } from "next";
import { Inter, Roboto_Mono } from "next/font/google";
import { ClientWrapper } from "@/components/ClientWrapper";
import { HistoryProvider } from "@/providers/HistoryProvider";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const robotoMono = Roboto_Mono({
  variable: "--font-roboto-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Radar Financiero | Plataforma",
  description: "Aplicación para la gestión unificada de flujo de caja empresarial y personal. Control diario, proyecciones y análisis financiero.",
  keywords: ["flujo de caja", "finanzas", "contabilidad", "gestión financiera", "P&L"],
  authors: [{ name: "Radar Financiero" }],
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#1a1a2e",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${robotoMono.variable} font-sans antialiased min-h-screen bg-[#f8f9fa]`}
        suppressHydrationWarning
      >
        <ClientWrapper>
          <HistoryProvider>
            {children}
          </HistoryProvider>
        </ClientWrapper>
      </body>
    </html>
  );
}
