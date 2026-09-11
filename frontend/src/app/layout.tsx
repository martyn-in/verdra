import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Verdra — Detect Early. Predict Spread. Protect Yield.",
  description:
    "Verdra analyzes crop leaves using computer vision, estimates disease severity, evaluates environmental risk and provides actionable crop-care recommendations.",
  keywords: [
    "crop disease detection",
    "plant pathology AI",
    "precision agriculture",
    "smart farming",
    "Verdra",
    "crop health intelligence",
    "Grad-CAM explainable AI",
  ],
};

export const viewport: Viewport = {
  themeColor: "#12372A",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="light scroll-smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Manrope:wght@500;600;700;800&family=Outfit:wght@400;500;600;700;800;900&family=Plus+Jakarta+Sans:wght@500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
