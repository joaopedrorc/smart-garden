import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Smart Garden Dashboard",
  description: "Monitoramento IoT de Agricultura Urbana",
};

// viewport-fit=cover libera as áreas seguras (notch e barra inferior) para o CSS env()
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className={`${inter.className} min-h-screen bg-background md:flex`}>
        <Sidebar />
        {/* min-w-0 deixa os gráficos encolherem; pb reserva espaço para as abas do celular */}
        <main className="min-w-0 flex-1 pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:pb-0">
          {children}
        </main>
      </body>
    </html>
  );
}
