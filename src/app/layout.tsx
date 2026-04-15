import { Inter, DM_Serif_Display } from "next/font/google";
import Script from "next/script";
import SupportChatWrapper from "@/components/SupportChatWrapper";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const dmSerif = DM_Serif_Display({ weight: "400", subsets: ["latin"], variable: "--font-serif" });

export const metadata: Metadata = {
  title: "Employee Zero | Digital Office",
  description: "Your AI-powered digital office.",
};

const GA_ID = "G-YXZZQL4654";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <head>
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
          strategy="afterInteractive"
        />
        <Script id="gtag-init" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_ID}');
          `}
        </Script>
      </head>
      <body className={`${inter.variable} ${dmSerif.variable} h-full bg-background text-foreground antialiased font-sans`}>
        {children}
        <SupportChatWrapper />
      </body>
    </html>
  );
}
