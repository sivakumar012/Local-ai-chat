import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { auth } from "@/auth";
import SessionProviderWrapper from "@/app/components/SessionProviderWrapper";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Local AI Chat",
  description: "A local ChatGPT-like interface powered by LM Studio",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-gray-950 text-gray-100 antialiased`}>
        <SessionProviderWrapper session={session}>
          {children}
        </SessionProviderWrapper>
      </body>
    </html>
  );
}
