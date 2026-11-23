import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "SpatialGrid | Spatial & Pose Reasoning Benchmark",
  description: "A procedurally generated benchmark testing whether AI vision models understand space: position, orientation and physical stability.",
  openGraph: {
    title: "SpatialGrid",
    description: "A spatial & pose reasoning benchmark for physical AI.",
    images: [{ url: "/images/og.jpg", width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image", images: ["/images/og.jpg"] },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
