import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { CheckInProvider } from "@/hooks/useCheckIn";
import { Toaster } from "@/components/ui/toaster";
import { TimeProvider } from "@/contexts/TimeContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "beacons",
  description: "Available Campus Classrooms",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        suppressHydrationWarning
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>
          <CheckInProvider>
            <TimeProvider>{children}</TimeProvider>
          </CheckInProvider>
        </AuthProvider>
        <Toaster />
      </body>
    </html>
  );
}
