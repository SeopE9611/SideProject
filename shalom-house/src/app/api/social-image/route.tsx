import { ImageResponse } from "next/og";

export function GET() {
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "96px", background: "#f7f8f4", color: "#18352a", border: "24px solid #dce7df" }}>
      <div style={{ fontSize: 72, fontWeight: 700 }}>샬롬의 집</div>
      <div style={{ width: 96, height: 8, margin: "36px 0", background: "#356b55" }} />
      <div style={{ fontSize: 34 }}>장애인거주시설</div><div style={{ marginTop: 12, fontSize: 28 }}>공식 홈페이지</div>
    </div>,
    { width: 1200, height: 630, headers: { "Cache-Control": "public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400" } },
  );
}
