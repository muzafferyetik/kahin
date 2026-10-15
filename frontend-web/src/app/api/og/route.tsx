import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const title = searchParams.get("title") || "Kahin | Gündem ve Spor Tahmin Borsası";
    const yesProb = Math.min(100, Math.max(0, parseFloat(searchParams.get("yes") || "50")));
    const noProb = Math.min(100, Math.max(0, parseFloat(searchParams.get("no") || `${100 - yesProb}`)));
    const category = searchParams.get("cat") || "GÜNDEM";
    const volume = searchParams.get("vol") || "1.000";

    return new ImageResponse(
      (
        <div
          style={{
            height: "100%",
            width: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            backgroundColor: "#09090b",
            padding: "48px 56px",
            fontFamily: "sans-serif",
            border: "8px solid #18181b",
          }}
        >
          {/* Top Bar: Brand + Category */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              width: "100%",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
              }}
            >
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "10px",
                  backgroundColor: "#10b981",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#ffffff",
                  fontSize: "24px",
                  fontWeight: 900,
                }}
              >
                K
              </div>
              <span
                style={{
                  color: "#ffffff",
                  fontSize: "28px",
                  fontWeight: 800,
                  letterSpacing: "-0.5px",
                }}
              >
                KAHİN
              </span>
            </div>

            <div
              style={{
                backgroundColor: "#27272a",
                color: "#a1a1aa",
                padding: "8px 18px",
                borderRadius: "9999px",
                fontSize: "18px",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "1px",
              }}
            >
              {category}
            </div>
          </div>

          {/* Center: Title */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              margin: "32px 0",
            }}
          >
            <h1
              style={{
                fontSize: title.length > 60 ? "42px" : "54px",
                fontWeight: 800,
                color: "#f4f4f5",
                lineHeight: 1.25,
                margin: 0,
              }}
            >
              {title}
            </h1>
          </div>

          {/* Probability Bar */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "16px",
              width: "100%",
            }}
          >
            {/* Probability Percentages */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-end",
              }}
            >
              <div style={{ display: "flex", alignItems: "baseline", gap: "10px" }}>
                <span style={{ fontSize: "24px", fontWeight: 700, color: "#10b981" }}>EVET</span>
                <span style={{ fontSize: "48px", fontWeight: 900, color: "#34d399" }}>
                  %{yesProb.toFixed(1)}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: "10px" }}>
                <span style={{ fontSize: "48px", fontWeight: 900, color: "#f87171" }}>
                  %{noProb.toFixed(1)}
                </span>
                <span style={{ fontSize: "24px", fontWeight: 700, color: "#ef4444" }}>HAYIR</span>
              </div>
            </div>

            {/* Split Bar */}
            <div
              style={{
                display: "flex",
                width: "100%",
                height: "24px",
                borderRadius: "12px",
                overflow: "hidden",
                backgroundColor: "#27272a",
              }}
            >
              <div
                style={{
                  width: `${yesProb}%`,
                  backgroundColor: "#10b981",
                  height: "100%",
                }}
              />
              <div
                style={{
                  width: `${noProb}%`,
                  backgroundColor: "#ef4444",
                  height: "100%",
                }}
              />
            </div>
          </div>

          {/* Footer */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              borderTop: "1px solid #27272a",
              paddingTop: "24px",
              marginTop: "24px",
            }}
          >
            <span style={{ color: "#71717a", fontSize: "20px", fontWeight: 500 }}>
              Hacim: <strong style={{ color: "#e4e4e7" }}>{volume} KP</strong>
            </span>
            <span style={{ color: "#10b981", fontSize: "20px", fontWeight: 600 }}>
              Ben Demiştim! — Canlı Borsa Oranları
            </span>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (e: any) {
    return new Response(`Failed to generate image: ${e.message}`, { status: 500 });
  }
}
