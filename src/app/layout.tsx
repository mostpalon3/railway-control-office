import type { Metadata, Viewport } from "next";
import { DM_Sans, DM_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/lib/ThemeContext";
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
  manifest: "/assets/site.webmanifest",
  icons: {
    icon: [
      { url: "/assets/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/assets/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/assets/favicon.ico" },
    ],
    apple: { url: "/assets/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
  },
  // iOS "Add to Home Screen" support
  appleWebApp: {
    capable: true,
    title: "RCO",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#000000",
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
        <ThemeProvider>
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
        </ThemeProvider>
      </body>
    </html>
  );
}
