import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "next-themes";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ChainSight AI | On-Chain Anomaly Detection",
  description:
    "AI-powered on-chain anomaly detection for the Mantle Network. Smart money tracking, MEV detection, and real-time alerts.",
  keywords: [
    "ChainSight AI",
    "Mantle Network",
    "Blockchain",
    "Anomaly Detection",
    "MEV",
    "Smart Money",
    "DeFi",
    "AI",
  ],
  authors: [{ name: "ChainSight AI Team" }],
  icons: {
    icon: "/logo.svg",
  },
  openGraph: {
    title: "ChainSight AI | On-Chain Anomaly Detection",
    description:
      "AI-powered on-chain anomaly detection for the Mantle Network. Smart money tracking, MEV detection, and real-time alerts.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
