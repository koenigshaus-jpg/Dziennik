import type { Metadata, Viewport } from "next";
import { Inter, Fraunces } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AgentSheetProvider } from "@/components/agent/AgentSheetProvider";
import { GalleryDialogProvider } from "@/components/media/GalleryDialogProvider";

const inter = Inter({
  subsets: ["latin", "latin-ext"],
  variable: "--font-sans",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin", "latin-ext"],
  variable: "--font-display",
  display: "swap",
  weight: ["600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "Dziennik",
  description: "Osobisty dziennik — codzienne wpisy, zdjęcia, audio.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Dziennik",
  },
};

export const viewport: Viewport = {
  themeColor: "#fdfdfb",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="pl"
      className={`${inter.variable} ${fraunces.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <ThemeProvider>
          <AgentSheetProvider>
            <GalleryDialogProvider>
              {children}
              <Toaster position="top-center" richColors />
            </GalleryDialogProvider>
          </AgentSheetProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
