import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "SOKIE POS",
  description: "Simple POS app for iPad/tablet",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0, viewport-fit=cover"
        />
      </head>

      <body>{children}</body>
    </html>
  );
}

