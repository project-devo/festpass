import type { Metadata } from "next";
import { Suspense } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import { SessionProvider } from "@/components/session";
import { TopBar } from "@/components/top-bar";
import { PageState } from "@/components/ui";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FestPass",
  description: "Book college fest passes and check in with a QR code",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <SessionProvider>
          <Suspense fallback={null}>
            <TopBar />
          </Suspense>
          <Suspense fallback={<PageState loading />}>{children}</Suspense>
        </SessionProvider>
      </body>
    </html>
  );
}
