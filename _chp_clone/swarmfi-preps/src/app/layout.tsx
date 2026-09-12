import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: "SwarmFi Perps — AI Agent Swarm Trading Signals",
  description: "Real-time AI agent swarm trading signals for perpetual markets powered by dYdX. Bloomberg Terminal meets AI.",
  keywords: ["SwarmFi", "DeFi", "Trading", "dYdX", "Perpetuals", "AI Agents", "Swarm Intelligence"],
  authors: [{ name: "SwarmFi Team" }],
  icons: {
    icon: "/swarmfi-logo.png",
  },
  openGraph: {
    title: "SwarmFi Perps — AI Agent Swarm Trading Signals",
    description: "Real-time AI agent swarm trading signals for perpetual markets.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
