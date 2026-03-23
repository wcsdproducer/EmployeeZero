import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Employee Zero | Digital Office",
  description: "Your AI-powered digital office.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full bg-background text-foreground antialiased font-sans">
        {children}
      </body>
    </html>
  );
}
