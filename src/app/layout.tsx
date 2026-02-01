import type { Metadata, Viewport } from "next";
import { Inter, Roboto_Mono } from "next/font/google";
import dynamic from "next/dynamic";
import { Toaster } from "@/components/ui/sonner";
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
  title: "FlujoGlobal | Gestión de Flujo de Caja",
  description: "Aplicación para la gestión unificada de flujo de caja empresarial y personal. Control diario, proyecciones y análisis financiero.",
  keywords: ["flujo de caja", "finanzas", "contabilidad", "gestión financiera", "P&L"],
  authors: [{ name: "FlujoGlobal" }],
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#1a1a2e",
};

const AuthProvider = dynamic(
  () => import("@/providers/AuthProvider").then((mod) => mod.AuthProvider),
  { ssr: false }
);

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
        <AuthProvider>
          {children}
          <Toaster richColors position="top-right" />
        </AuthProvider>
      </body>
    </html>
  );
}
