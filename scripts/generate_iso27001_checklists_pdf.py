from pathlib import Path
import re

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "ISO27001_CHECKLISTS_FR.md"
OUTPUT = ROOT / "ISO27001_CHECKLISTS_FR.pdf"


def register_font() -> str:
    candidates = [
        Path("C:/Windows/Fonts/arial.ttf"),
        Path("C:/Windows/Fonts/calibri.ttf"),
        Path("C:/Windows/Fonts/tahoma.ttf"),
    ]
    for candidate in candidates:
        if candidate.exists():
            pdfmetrics.registerFont(TTFont("AppFont", str(candidate)))
            return "AppFont"
    return "Helvetica"


def escape(text: str) -> str:
    return (
        text.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
    )


def build_styles(font_name: str):
    styles = getSampleStyleSheet()
    return {
        "title": ParagraphStyle(
            "Title",
            parent=styles["Title"],
            fontName=font_name,
            fontSize=20,
            leading=25,
            alignment=TA_CENTER,
            textColor=colors.HexColor("#17324D"),
            spaceAfter=16,
        ),
        "h1": ParagraphStyle(
            "Heading1",
            parent=styles["Heading1"],
            fontName=font_name,
            fontSize=15,
            leading=19,
            textColor=colors.HexColor("#17324D"),
            spaceBefore=12,
            spaceAfter=8,
        ),
        "h2": ParagraphStyle(
            "Heading2",
            parent=styles["Heading2"],
            fontName=font_name,
            fontSize=12,
            leading=16,
            textColor=colors.HexColor("#2C4E72"),
            spaceBefore=8,
            spaceAfter=4,
        ),
        "body": ParagraphStyle(
            "Body",
            parent=styles["BodyText"],
            fontName=font_name,
            fontSize=10,
            leading=14,
            spaceAfter=5,
        ),
        "bullet": ParagraphStyle(
            "Bullet",
            parent=styles["BodyText"],
            fontName=font_name,
            fontSize=10,
            leading=14,
            leftIndent=14,
            firstLineIndent=-10,
            bulletIndent=0,
            spaceAfter=2,
        ),
    }


def normalize_markdown(text: str) -> str:
    text = text.replace("\r\n", "\n")
    text = text.replace("’", "'")
    return text


def render_markdown_to_story(markdown_text: str, styles):
    story = []
    lines = normalize_markdown(markdown_text).split("\n")

    for line in lines:
        stripped = line.strip()

        if not stripped:
            story.append(Spacer(1, 0.15 * cm))
            continue

        if stripped == "---":
            story.append(Spacer(1, 0.25 * cm))
            continue

        if stripped.startswith("# "):
            story.append(Paragraph(escape(stripped[2:].strip()), styles["title"]))
            continue

        if stripped.startswith("## "):
            story.append(Paragraph(escape(stripped[3:].strip()), styles["h1"]))
            continue

        if stripped.startswith("### "):
            story.append(Paragraph(escape(stripped[4:].strip()), styles["h2"]))
            continue

        checkbox_match = re.match(r"^- \[( |x|X)\] (.+)$", stripped)
        if checkbox_match:
            checked, content = checkbox_match.groups()
            box = "☑" if checked.lower() == "x" else "☐"
            story.append(
                Paragraph(
                    f"{box} {escape(content.strip())}",
                    styles["bullet"],
                )
            )
            continue

        bullet_match = re.match(r"^- (.+)$", stripped)
        if bullet_match:
            content = bullet_match.group(1)
            story.append(
                Paragraph(
                    f"• {escape(content.strip())}",
                    styles["bullet"],
                )
            )
            continue

        numbered_match = re.match(r"^\d+\. (.+)$", stripped)
        if numbered_match:
            story.append(Paragraph(escape(stripped), styles["body"]))
            continue

        story.append(Paragraph(escape(stripped), styles["body"]))

    return story


def add_page_number(canvas, doc):
    canvas.saveState()
    canvas.setFont("Helvetica", 9)
    canvas.setFillColor(colors.HexColor("#555555"))
    canvas.drawRightString(19.2 * cm, 1.2 * cm, f"Page {doc.page}")
    canvas.restoreState()


def main():
    font_name = register_font()
    styles = build_styles(font_name)
    source_text = SOURCE.read_text(encoding="utf-8")

    doc = SimpleDocTemplate(
        str(OUTPUT),
        pagesize=A4,
        leftMargin=1.8 * cm,
        rightMargin=1.8 * cm,
        topMargin=1.7 * cm,
        bottomMargin=1.8 * cm,
        title="Check-lists Completes d'Implementation ISO 27001",
        author="Codex",
    )

    story = render_markdown_to_story(source_text, styles)
    doc.build(story, onFirstPage=add_page_number, onLaterPages=add_page_number)
    print(f"Generated {OUTPUT}")


if __name__ == "__main__":
    main()
