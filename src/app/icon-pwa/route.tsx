import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export function GET(req: NextRequest) {
  const px = Number(req.nextUrl.searchParams.get("size") || "192");
  const radius = Math.round(px * 0.222);
  const fontSize = Math.round(px * 0.533);
  const border = Math.max(6, Math.round(px * 0.062));

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
          border: `${border}px solid #00e5c3`,
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Glow backdrop */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "radial-gradient(circle at 50% 45%, rgba(0,229,195,0.12) 0%, transparent 65%)",
          }}
        />
        <span style={{ fontSize, lineHeight: 1 }}>🍺</span>
      </div>
    ),
    { width: px, height: px }
  );
}
