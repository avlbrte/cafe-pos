import "./globals.css";

export const metadata = {
  title: "Cafe POS",
  description: "Simple cafe order app",
};

<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
