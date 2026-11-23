import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "SpatialGrid | Perception benchmark for physical AI",
  description: "A benchmark factory that tests whether vision models can judge depth, pose and stability, the perception a robot relies on. Every answer is computed, not labelled.",
  openGraph: {
    title: "SpatialGrid",
    description: "Before a robot reaches, it has to see. A perception benchmark for physical AI.",
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
