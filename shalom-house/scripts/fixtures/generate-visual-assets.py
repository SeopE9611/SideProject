"""Generate deterministic, non-personal local UI fixtures with bundled Python libraries."""

import json
import re
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "src/content/fixtures/assets"
OUT.mkdir(parents=True, exist_ok=True)
css = (ROOT / "src/app/globals.css").read_text(encoding="utf-8")


def token(name):
    return re.search(r"--color-" + name + r":\s*(#[0-9a-fA-F]+)", css).group(1)


font_path = Path("C:/Windows/Fonts/malgun.ttf")
pdfmetrics.registerFont(TTFont("FixtureKorean", str(font_path)))
manifest = {}
for name, width, height in [("landscape", 1440, 960), ("portrait", 900, 1350), ("square", 960, 960)]:
    picture = Image.new("RGB", (width, height), token("surface-subtle"))
    draw = ImageDraw.Draw(picture)
    font = ImageFont.truetype(str(font_path), 38)
    small = ImageFont.truetype(str(font_path), 25)
    draw.rectangle((24, 24, width - 25, height - 25), outline=token("primary"), width=8)
    draw.line((width // 2, 36, width // 2, height - 36), fill=token("border-strong"), width=2)
    draw.line((36, height // 2, width - 36, height // 2), fill=token("border-strong"), width=2)
    draw.ellipse((width // 2 - 110, height // 2 - 180, width // 2 + 110, height // 2 + 40), fill=token("primary"))
    draw.rectangle((width // 2 - 290, height // 2 + 65, width // 2 + 290, height // 2 + 215), fill=token("surface"))
    draw.text((width // 2, height // 2 + 88), "테스트 이미지", font=font, fill=token("foreground"), anchor="mt")
    draw.text((width // 2, height // 2 + 150), "실제 시설·활동 사진이 아닙니다", font=small, fill=token("foreground"), anchor="mt")
    for x, y, anchor, label in [(48, 45, "lt", "TOP LEFT"), (width - 48, 45, "rt", "TOP RIGHT"), (48, height - 50, "lb", "BOTTOM LEFT"), (width - 48, height - 50, "rb", "BOTTOM RIGHT")]:
        draw.text((x, y), label, font=small, fill=token("primary"), anchor=anchor)
    draw.text((width // 2, 105), f"{width} x {height} / {name.upper()}", font=small, fill=token("foreground"), anchor="mt")
    target = OUT / f"{name}.webp"
    picture.save(target, format="WEBP", lossless=True)
    manifest[name] = {"fileName": target.name, "width": width, "height": height, "byteSize": target.stat().st_size}

target = OUT / "ui-layout-sample.pdf"
pdf = canvas.Canvas(str(target), pagesize=A4, invariant=1)
pdf.setTitle("테스트용 PDF - 실제 운영자료 아님")
pdf.setAuthor("UI fixture")
page_width, page_height = A4
for page in (1, 2):
    pdf.setFillColor(colors.HexColor(token("primary")))
    pdf.rect(0, page_height - 28, page_width, 28, fill=1, stroke=0)
    pdf.setFillColor(colors.HexColor(token("foreground")))
    pdf.setFont("FixtureKorean", 11)
    pdf.drawString(48, page_height - 66, "UI TEST DOCUMENT / SAMPLE ONLY")
    pdf.setFont("FixtureKorean", 23)
    pdf.drawString(48, page_height - 112, "테스트용 PDF" if page == 1 else "두 번째 페이지 확인")
    pdf.setFont("FixtureKorean", 12)
    lines = [
        "이 문서는 파일 열기와 글자 표시를 확인하기 위해 만든 예시입니다.",
        "실제 시설 운영자료, 예산·결산 또는 후원금 보고서가 아닙니다.",
        "개인정보, 실제 금액, 계좌번호와 실제 활동 정보는 포함하지 않습니다.",
    ]
    for index, line in enumerate(lines):
        pdf.drawString(48, page_height - 154 - index * 24, line)
    pdf.setStrokeColor(colors.HexColor(token("border")))
    pdf.line(48, page_height - 234, page_width - 48, page_height - 234)
    pdf.setFont("FixtureKorean", 15)
    pdf.drawString(48, page_height - 272, "확인 항목")
    for index, line in enumerate([
        "01  한글 제목과 본문이 정상적으로 표시되는지 확인합니다.",
        "02  페이지를 넘기고 내용을 확대해 확인합니다.",
        "03  목록의 파일 크기와 실제 다운로드 파일을 비교합니다.",
        "04  이 예시를 실제 기관의 공개자료로 사용하지 않습니다.",
    ]):
        pdf.setFont("FixtureKorean", 12)
        pdf.drawString(48, page_height - 314 - index * 34, line)
    pdf.setFont("FixtureKorean", 10)
    pdf.drawString(48, 40, "테스트 전용 · 실제 기관 자료 아님")
    pdf.drawRightString(page_width - 48, 40, f"{page} / 2")
    pdf.showPage()
pdf.save()
manifest["pdf"] = {"fileName": target.name, "byteSize": target.stat().st_size}
(OUT / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
print(json.dumps(manifest, indent=2))
