import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ImageResponse } from "next/og";

const logo = readFileSync(join(process.cwd(), "public/brand/logo-header.svg"));
const captionFont = readFileSync(join(process.cwd(), "src/app/fonts/ShalomSocial-Regular.woff"));
const logoSrc = `data:image/svg+xml;base64,${logo.toString("base64")}`;

export function GET() {
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", fontFamily: "Shalom Social", flexDirection: "column", justifyContent: "center", padding: "96px", background: "#F5F1E8", color: "#17384D", border: "24px solid #EDF2F5" }}>
      <img src={logoSrc} width={840} height={216} alt="샬롬의집" />
      <div style={{ width: 96, height: 8, margin: "36px 0", background: "#087E83" }} />
      <div style={{ fontSize: 34 }}>장애인거주시설</div><div style={{ marginTop: 12, fontSize: 28 }}>공식 홈페이지</div>
    </div>,
    { width: 1200, height: 630, fonts: [{ name: "Shalom Social", data: captionFont, weight: 400, style: "normal" }], headers: { "Cache-Control": "public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400" } },
  );
}
