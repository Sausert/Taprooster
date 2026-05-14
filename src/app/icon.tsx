import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
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
          borderRadius: 7,
          border: "4px solid #00e5c3",
        }}
      >
        <span style={{ fontSize: 18, lineHeight: 1 }}>🍺</span>
      </div>
    ),
    { ...size }
  );
}
