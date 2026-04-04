import "./globals.css";

export const metadata = {
  title: "Cafe POS",
  description: "Simple cafe order app",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
