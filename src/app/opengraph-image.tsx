import { ImageResponse } from "next/og";

export const dynamic = "force-static";

export const alt = "OpenLab - The Open Science Classroom";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "linear-gradient(135deg, #0b1b33 0%, #1d44b8 60%, #2456e0 100%)",
          color: "white",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <div
            style={{
              width: 88,
              height: 88,
              borderRadius: 20,
              background: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 52,
            }}
          >
            🧪
          </div>
          <div style={{ fontSize: 64, fontWeight: 700, letterSpacing: -1 }}>OpenLab</div>
        </div>
        <div style={{ marginTop: 40, fontSize: 40, opacity: 0.92 }}>
          The Open Science Classroom
        </div>
        <div style={{ marginTop: 16, fontSize: 26, opacity: 0.65 }}>
          Virtual labs · Quizzes · Learning pathways — free for everyone
        </div>
      </div>
    ),
    { ...size }
  );
}
