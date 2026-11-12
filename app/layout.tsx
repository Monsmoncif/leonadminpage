import type { Metadata } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import "./globals.css";
import ClientLayout from "@/components/layout/ClientLayout";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Leon Rent Car",
  description: "Car Rental Management Dashboard",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icon.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  manifest: "/manifest.json",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let session = null;
  try {
    session = await getServerSession(authOptions);
  } catch {
    session = null;
  }

  return (
    <html lang="en-GB" className="h-full" suppressHydrationWarning>
      <body className="min-h-screen font-sans antialiased bg-surface" suppressHydrationWarning>
        <Providers session={session}>
          <ClientLayout>{children}</ClientLayout>
        </Providers>
      </body>
    </html>
  );
}
