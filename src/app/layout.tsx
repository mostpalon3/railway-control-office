import type { Metadata } from "next";
import { DM_Sans, DM_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const dmMono = DM_Mono({
  variable: "--font-dm-mono",
  subsets: ["latin"],
  weight: ["300", "400", "500"],
});

export const metadata: Metadata = {
  title: "Railway Control Office",
  description: "Railway Control Office – session and train management system",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${dmSans.variable} ${dmMono.variable} antialiased`}
      >
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            classNames: {
              toast:
                "rounded-none border border-neutral-200 bg-white text-black shadow-none font-sans text-sm",
              error: "border-red-200 text-red-700",
              success: "border-neutral-200 text-black",
              description: "text-neutral-500",
              actionButton: "bg-black text-white rounded-none",
              cancelButton: "bg-neutral-100 text-neutral-700 rounded-none",
            },
          }}
        />
      </body>
    </html>
  );
}
