import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
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
          borderRadius: 40,
          border: "6px solid #00e5c3",
          boxShadow: "0 0 40px rgba(0,229,195,0.25)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Subtle glow backdrop */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "radial-gradient(circle at 50% 45%, rgba(0,229,195,0.12) 0%, transparent 65%)",
          }}
        />
        <span style={{ fontSize: 96, lineHeight: 1 }}>🍺</span>
      </div>
    ),
    { ...size }
  );
}
