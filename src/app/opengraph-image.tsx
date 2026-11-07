import { ImageResponse } from "next/og";

export const alt = "EarthGuard Pakistan — explore environmental change";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "72px 86px",
          background:
            "radial-gradient(circle at 76% 48%, #153b43 0%, #0B1220 48%, #080E19 100%)",
          color: "#E6EDF7",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div style={{ width: 650, display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 18,
              marginBottom: 48,
              color: "#22D3A6",
              fontSize: 25,
              fontWeight: 700,
              letterSpacing: 1,
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "3px solid #22D3A6",
                borderRadius: "50%",
                fontSize: 34,
              }}
            >
              ↗
            </div>
            EARTHGUARD PAKISTAN
          </div>
          <div
            style={{
              fontSize: 58,
              fontWeight: 700,
              lineHeight: 1.12,
              marginBottom: 22,
            }}
          >
            Explore environmental change
          </div>
          <div style={{ color: "#A4B2C9", fontSize: 25, lineHeight: 1.4 }}>
            See where values change, by how much, and what the trend means.
          </div>
        </div>
        <div
          style={{
            width: 315,
            height: 315,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: "2px solid #22D3A655",
            borderRadius: "50%",
            background: "#22D3A610",
          }}
        >
          <div
            style={{
              width: 245,
              height: 245,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "3px solid #22D3A6",
              borderRadius: "50%",
              color: "#22D3A6",
              fontSize: 156,
              fontWeight: 500,
            }}
          >
            ↗
          </div>
        </div>
      </div>
    ),
    size,
  );
}
