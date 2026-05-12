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
          borderRadius: 38,
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Mint glow blob */}
        <div
          style={{
            position: "absolute",
            width: 110,
            height: 110,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(0,229,195,0.18) 0%, transparent 70%)",
            top: 28,
            left: 34,
          }}
        />
        {/* Large T */}
        <span
          style={{
            fontSize: 104,
            fontWeight: 900,
            color: "#ffffff",
            fontFamily: "sans-serif",
            lineHeight: 1,
            letterSpacing: -4,
            marginTop: -8,
          }}
        >
          T
        </span>
        {/* Mint accent bar */}
        <div
          style={{
            position: "absolute",
            bottom: 32,
            width: 52,
            height: 5,
            background: "#00e5c3",
            borderRadius: 3,
          }}
        />
      </div>
    ),
    { ...size }
  );
}
