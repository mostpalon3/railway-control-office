/**
 * GET /api/splash?w=1170&h=2532
 *
 * Generates an iOS PWA launch/splash screen PNG on the fly:
 * white background with the RCO logo centred.
 *
 * Referenced via <link rel="apple-touch-startup-image"> with device media queries.
 * iOS Safari fetches and caches this once at "Add to Home Screen" time.
 */
import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { readFileSync } from "fs";
import path from "path";

export const runtime = "nodejs";

export function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const w = Math.min(3000, Math.max(200, parseInt(searchParams.get("w") ?? "1170", 10)));
  const h = Math.min(3000, Math.max(200, parseInt(searchParams.get("h") ?? "2532", 10)));

  // Read the local PNG and embed as a data URI so ImageResponse can use it
  const logoPath = path.join(process.cwd(), "public/assets/android-chrome-512x512.png");
  const logoData = readFileSync(logoPath);
  const logoSrc = `data:image/png;base64,${logoData.toString("base64")}`;

  // Logo is displayed at ~22% of the shorter dimension, min 120 px, max 300 px
  const size = Math.max(120, Math.min(300, Math.round(Math.min(w, h) * 0.22)));

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          background: "#ffffff",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logoSrc} width={size} height={size} alt="RCO" />
      </div>
    ),
    { width: w, height: h }
  );
}
