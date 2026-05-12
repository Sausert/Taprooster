import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export function GET(req: NextRequest) {
  const px = Number(req.nextUrl.searchParams.get("size") || "192");

  const radius = Math.round(px * 0.21);
  const glowSize = Math.round(px * 0.61);
  const glowTop = Math.round(px * 0.16);
  const glowLeft = Math.round(px * 0.19);
  const fontSize = Math.round(px * 0.58);
  const barWidth = Math.round(px * 0.29);
  const barHeight = Math.round(px * 0.028);
  const barBottom = Math.round(px * 0.18);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0f0d1a",
          borderRadius: radius,
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Mint glow */}
        <div
          style={{
            position: "absolute",
            width: glowSize,
            height: glowSize,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(0,229,195,0.18) 0%, transparent 70%)",
            top: glowTop,
            left: glowLeft,
          }}
        />
        {/* Large T */}
        <span
          style={{
            fontSize,
            fontWeight: 900,
            color: "#ffffff",
            fontFamily: "sans-serif",
            lineHeight: 1,
            letterSpacing: -2,
            marginTop: -Math.round(px * 0.045),
          }}
        >
          T
        </span>
        {/* Mint accent bar */}
        <div
          style={{
            position: "absolute",
            bottom: barBottom,
            width: barWidth,
            height: barHeight,
            background: "#00e5c3",
            borderRadius: 3,
          }}
        />
      </div>
    ),
    { width: px, height: px }
  );
}
