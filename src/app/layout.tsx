import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Semak Mesej: see the tactics in a suspicious message",
  description:
    "Paste or screenshot a suspicious WhatsApp, SMS or RCS message and see which scam tactics it uses, tied to the exact words.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full bg-stone-50">{children}</body>
    </html>
  );
}
