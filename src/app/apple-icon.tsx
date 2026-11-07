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
          borderRadius: 38,
          background: "#0B1220",
          position: "relative",
        }}
      >
        <div
          style={{
            width: 108,
            height: 108,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: "5px solid #22D3A6",
            borderRadius: "50%",
            color: "#22D3A6",
            fontSize: 74,
            fontWeight: 700,
          }}
        >
          ↗
        </div>
      </div>
    ),
    size,
  );
}
