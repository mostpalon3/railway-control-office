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
    <html lang="en" suppressHydrationWarning>
      {/* Blocking script: apply dark class before first paint to prevent flash */}
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('rco_theme');if(t&&t.startsWith('dark'))document.documentElement.classList.add('dark');}catch(e){}})();`,
          }}
        />
        {/* iOS PWA splash / startup images — one per device resolution.
            iOS Safari fetches and caches these at "Add to Home Screen" time.
            The /api/splash route generates a white PNG with the logo centred. */}
        {/* iPhone 16 Pro Max / 15 Pro Max */}
        <link rel="apple-touch-startup-image" media="screen and (device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)"  href="/api/splash?w=1290&h=2796" />
        {/* iPhone 16 Pro / 15 Pro */}
        <link rel="apple-touch-startup-image" media="screen and (device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)"  href="/api/splash?w=1179&h=2556" />
        {/* iPhone 16 Plus / 15 Plus / 14 Plus */}
        <link rel="apple-touch-startup-image" media="screen and (device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)"  href="/api/splash?w=1284&h=2778" />
        {/* iPhone 16 / 15 / 14 / 13 / 12 */}
        <link rel="apple-touch-startup-image" media="screen and (device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)"  href="/api/splash?w=1170&h=2532" />
        {/* iPhone 13 mini / 12 mini */}
        <link rel="apple-touch-startup-image" media="screen and (device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)"  href="/api/splash?w=1125&h=2436" />
        {/* iPhone 11 Pro Max / XS Max */}
        <link rel="apple-touch-startup-image" media="screen and (device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)"  href="/api/splash?w=1242&h=2688" />
        {/* iPhone 11 / XR */}
        <link rel="apple-touch-startup-image" media="screen and (device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)"  href="/api/splash?w=828&h=1792" />
        {/* iPhone SE (3rd / 2nd gen) / 8 / 7 */}
        <link rel="apple-touch-startup-image" media="screen and (device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)"  href="/api/splash?w=750&h=1334" />
        {/* iPad Pro 12.9" (all gens) */}
        <link rel="apple-touch-startup-image" media="screen and (device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" href="/api/splash?w=2048&h=2732" />
        {/* iPad Pro 11" / Air 10.9" */}
        <link rel="apple-touch-startup-image" media="screen and (device-width: 834px)  and (device-height: 1194px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" href="/api/splash?w=1668&h=2388" />
        {/* iPad 10th gen / Air 5th gen */}
        <link rel="apple-touch-startup-image" media="screen and (device-width: 820px)  and (device-height: 1180px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" href="/api/splash?w=1640&h=2360" />
        {/* iPad mini 6 */}
        <link rel="apple-touch-startup-image" media="screen and (device-width: 744px)  and (device-height: 1133px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" href="/api/splash?w=1488&h=2266" />
      </head>
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
