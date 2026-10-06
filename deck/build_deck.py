"""Builds deck/pressure-gauge-reader.pptx (16:9) in the house style of the reference architecture slide:
DM Sans, white background, pale rounded containers, white rounded boxes with a thin blue outline and
blue component names, black arrows, product symbols from deck/assets/.

Usage:  python deck/build_deck.py      (requires python-pptx)
Numbers shown as [TBD] still need to be filled in from the impact model.
"""
import pathlib

from lxml import etree
from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_CONNECTOR, MSO_SHAPE
from pptx.enum.text import MSO_ANCHOR, PP_ALIGN
from pptx.oxml.ns import qn
from pptx.util import Emu, Inches, Pt

HERE = pathlib.Path(__file__).resolve().parent
ASSETS = HERE / "assets"
OUT = HERE / "pressure-gauge-reader.pptx"

FONT = "DM Sans"
BLUE = RGBColor(0x42, 0x85, 0xF4)
BLACK = RGBColor(0x00, 0x00, 0x00)
GREY = RGBColor(0x5F, 0x63, 0x68)
RED = RGBColor(0xFF, 0x36, 0x21)
PINK = "F4CCCC"


# ---------- helpers ----------
def _alpha(fill_fmt, hex_rgb, alpha_pct):
    """Solid fill with transparency (python-pptx has no alpha API)."""
    fill_fmt.solid()
    fill_fmt.fore_color.rgb = RGBColor.from_string(hex_rgb)
    clr = fill_fmt._xPr.find(qn("a:solidFill")).find(qn("a:srgbClr"))
    a = etree.SubElement(clr, qn("a:alpha"))
    a.set("val", str(int(alpha_pct * 1000)))


def _text(tf, runs, size=8, align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE):
    """runs: list of paragraphs; each paragraph is a list of (text, color, bold)."""
    tf.word_wrap = True
    tf.vertical_anchor = anchor
    for attr in ("margin_left", "margin_right", "margin_top", "margin_bottom"):
        setattr(tf, attr, Inches(0.04))
    for i, para in enumerate(runs):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.alignment = align
        for text, color, bold in para:
            r = p.add_run()
            r.text = text
            r.font.name = FONT
            r.font.size = Pt(size)
            r.font.bold = bold
            r.font.color.rgb = color


def container(slide, x, y, w, h):
    s = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(x), Inches(y), Inches(w), Inches(h))
    s.adjustments[0] = 0.12
    _alpha(s.fill, PINK, 25)
    s.line.fill.background()
    s.shadow.inherit = False
    return s


def box(slide, x, y, w, h, title, body=None, icon=None, size=8):
    s = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(x), Inches(y), Inches(w), Inches(h))
    s.adjustments[0] = 0.16
    _alpha(s.fill, "FFFFFF", 76)
    s.line.color.rgb = BLUE
    s.line.width = Emu(7150)
    s.shadow.inherit = False
    paras = [[(title, BLUE, False)]]
    if body:
        paras.append([(body, BLACK, False)])
    _text(s.text_frame, paras, size=size)
    if icon:
        badge(slide, x + w - 0.16, y - 0.13, icon)
    return s


def badge(slide, cx, cy, icon, d=0.3):
    """Product symbol in a small white circle, straddling a box corner."""
    c = slide.shapes.add_shape(MSO_SHAPE.OVAL, Inches(cx), Inches(cy), Inches(d), Inches(d))
    c.fill.solid()
    c.fill.fore_color.rgb = RGBColor(0xFF, 0xFF, 0xFF)
    c.line.color.rgb = BLUE
    c.line.width = Emu(7150)
    c.shadow.inherit = False
    pad = d * 0.18
    slide.shapes.add_picture(str(ASSETS / f"icon_{icon}.png"), Inches(cx + pad), Inches(cy + pad), Inches(d - 2 * pad), Inches(d - 2 * pad))


def label(slide, x, y, w, h, text, size=7, color=BLACK, align=PP_ALIGN.CENTER, italic=False):
    tb = slide.shapes.add_textbox(Inches(x), Inches(y), Inches(w), Inches(h))
    _text(tb.text_frame, [[(text, color, False)]], size=size, align=align)
    if italic:
        for p in tb.text_frame.paragraphs:
            for r in p.runs:
                r.font.italic = True
    return tb


def arrow(slide, x1, y1, x2, y2, both=False, dashed=False):
    c = slide.shapes.add_connector(MSO_CONNECTOR.STRAIGHT, Inches(x1), Inches(y1), Inches(x2), Inches(y2))
    c.line.color.rgb = BLACK
    c.line.width = Pt(1)
    ln = c.line._get_or_add_ln()
    if dashed:
        d = etree.SubElement(ln, qn("a:prstDash"))
        d.set("val", "dash")
    for tag, on in (("a:headEnd", both), ("a:tailEnd", True)):
        e = etree.SubElement(ln, qn(tag))
        e.set("type", "triangle" if on else "none")
        e.set("w", "sm")
        e.set("len", "sm")
    return c


def title(slide, text, size=28):
    tb = slide.shapes.add_textbox(Inches(0.55), Inches(0.25), Inches(9.0), Inches(0.75))
    _text(tb.text_frame, [[(text, BLACK, False)]], size=size, align=PP_ALIGN.LEFT, anchor=MSO_ANCHOR.TOP)


def bullets(slide, x, y, w, h, items, size=12):
    tb = slide.shapes.add_textbox(Inches(x), Inches(y), Inches(w), Inches(h))
    tf = tb.text_frame
    tf.word_wrap = True
    for i, it in enumerate(items):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        pPr = p._p.get_or_add_pPr()
        pPr.set("marL", str(Inches(0.25)))
        pPr.set("indent", str(-Inches(0.2)))
        bu = etree.SubElement(pPr, qn("a:buChar"))
        bu.set("char", "•")
        r = p.add_run()
        r.text = it
        r.font.name = FONT
        r.font.size = Pt(size)
        r.font.color.rgb = BLACK
        p.space_after = Pt(3)
    return tb


def notes(slide, text):
    slide.notes_slide.notes_text_frame.text = text


def logo(slide, x, y, size=0.38):
    # The source image is 16:9 with the mark centred; crop to the mark.
    pic = slide.shapes.add_picture(str(ASSETS / "databricks_logo.png"), Inches(x), Inches(y), Inches(size * 16 / 9), Inches(size))
    pic.crop_left = pic.crop_right = 0.22
    pic.width = Inches(size * 16 / 9 * 0.56)
    return pic


# ---------- slides ----------
def slide_title(prs):
    s = prs.slides.add_slide(prs.slide_layouts[6])
    tb = s.shapes.add_textbox(Inches(0.7), Inches(1.6), Inches(8.6), Inches(1.2))
    _text(tb.text_frame, [[("Pressure Gauge Reader", BLACK, False)]], size=40, align=PP_ALIGN.LEFT, anchor=MSO_ANCHOR.TOP)
    tb = s.shapes.add_textbox(Inches(0.7), Inches(2.55), Inches(8.6), Inches(0.9))
    _text(tb.text_frame, [[("From robot inspection photos to trusted, governed gauge readings in minutes — with a human in the loop", GREY, False)]],
          size=16, align=PP_ALIGN.LEFT, anchor=MSO_ANCHOR.TOP)
    tb = s.shapes.add_textbox(Inches(0.7), Inches(4.4), Inches(6), Inches(0.5))
    _text(tb.text_frame, [[("Refinery operator rounds · Databricks Data Intelligence Platform", GREY, False)]], size=11, align=PP_ALIGN.LEFT)
    logo(s, 8.6, 4.3, 0.6)
    notes(s, "Open with the customer and the business persona: operations leadership at a refinery running robot inspection rounds.")


def slide_outcome(prs):
    s = prs.slides.add_slide(prs.slide_layouts[6])
    title(s, "Every gauge read in minutes, not days")
    tiles = [
        ("[TBD] hrs / week", "of manual gauge transcription removed per site"),
        ("< 5 min", "from robot photo to a trusted reading in the app"),
        ("100%", "of excursions and low-confidence readings checked by a human"),
    ]
    for i, (big, small) in enumerate(tiles):
        x = 0.55 + i * 3.05
        b = s.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(x), Inches(1.35), Inches(2.85), Inches(1.6))
        b.adjustments[0] = 0.1
        _alpha(b.fill, PINK, 25)
        b.line.fill.background()
        b.shadow.inherit = False
        _text(b.text_frame, [[(big, BLUE, False)], [(small, BLACK, False)]], size=13)
        b.text_frame.paragraphs[0].runs[0].font.size = Pt(26)
    bullets(s, 0.55, 3.25, 8.9, 2.0, [
        "Inspection robots already photograph hundreds of analog gauges per round — but readings are still transcribed by hand or by a third-party vendor, outside the data platform",
        "A vision model now reads every image as it lands, with a confidence score; only uncertain or out-of-limit readings go to a reviewer",
        "Readings, corrections and excursions are governed in one place and can be queried in plain English",
    ], size=12)
    notes(s, "Lead with the outcome for the executive sponsor. Replace [TBD] with the impact model: rounds/day x gauges x minutes x loaded cost.")


def slide_personas(prs):
    s = prs.slides.add_slide(prs.slide_layouts[6])
    title(s, "Value for both sides of the business")
    cols = [
        ("Executive sponsor — VP Operations / HSE", [
            "Fewer people in hazardous areas for routine rounds: [TBD] exposure hours avoided per year",
            "Vendor dependency removed: [TBD] cost per image today vs. pay-per-token on the platform",
            "Excursions surfaced the same shift, not at the next manual round",
        ]),
        ("Domain owner — Reliability / Maintenance lead", [
            "One review queue, sorted by risk: low confidence, unreadable, above limit",
            "Every correction audited (who, when, why) and fed back to the lakehouse",
            "Ask questions in plain English: “Are any pressures unusually high?”",
        ]),
    ]
    for i, (head, items) in enumerate(cols):
        x = 0.55 + i * 4.55
        c = container(s, x, 1.25, 4.35, 2.75)
        tb = s.shapes.add_textbox(Inches(x + 0.2), Inches(1.4), Inches(4.0), Inches(0.5))
        _text(tb.text_frame, [[(head, BLUE, False)]], size=14, align=PP_ALIGN.LEFT)
        bullets(s, x + 0.2, 1.95, 3.95, 3.0, items, size=12)
    notes(s, "Frame value for both personas the AI roleplay will play: the business stakeholder and the technical/domain stakeholder.")


def slide_architecture(prs):
    s = prs.slides.add_slide(prs.slide_layouts[6])
    title(s, "Architecture: one governed data journey")

    # Source: inspection site
    container(s, 0.25, 1.0, 1.45, 2.9)
    box(s, 0.4, 1.35, 1.15, 0.62, "Gauge images", "(JPG, per round)")
    box(s, 0.4, 2.35, 1.15, 0.62, "Gauge metadata", "(CSV: tag, site, limits)")
    badge(s, 0.4, 3.3, "internet_of_things", d=0.42)
    label(s, 0.85, 3.3, 0.8, 0.42, "Robot inspection rounds", size=7, align=PP_ALIGN.LEFT)

    # Databricks platform
    container(s, 1.9, 0.95, 6.7, 3.0)
    box(s, 2.05, 1.45, 0.95, 1.5, "Lakeflow\nAuto Loader", "Incremental, exactly-once ingest from the UC Volume", icon="data_pipelines")
    box(s, 3.2, 1.08, 1.25, 0.62, "Unity AI Gateway", "GPT-5.5 vision model", icon="access_connector")
    box(s, 3.2, 2.1, 1.25, 0.85, "Bronze", "ai_query: reading, unit, scale, confidence", icon="unstructured_bronze")
    box(s, 4.65, 2.1, 1.1, 0.85, "Silver", "Parsed readings + quality checks", icon="semi_structured_silver")
    box(s, 5.95, 2.1, 1.1, 0.85, "Gold", "Readings + limits + review status", icon="delta_table")
    box(s, 5.95, 1.08, 1.1, 0.62, "Genie Agent", "Ask in plain English", icon="ai")
    box(s, 7.3, 2.1, 1.15, 0.85, "Lakebase", "Serving copy + review decisions", icon="data_warehouse")
    box(s, 7.3, 1.08, 1.15, 0.62, "Databricks App", "Review queue (React)", icon="apps_services")

    # Unity Catalog band
    band = s.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(2.05), Inches(3.15), Inches(5.6), Inches(0.5))
    band.adjustments[0] = 0.3
    _alpha(band.fill, "FFFFFF", 76)
    band.line.color.rgb = BLUE
    band.line.width = Emu(7150)
    band.shadow.inherit = False
    _text(band.text_frame, [[("Unity Catalog  ", BLUE, False), ("explicit grants · lineage · raw volume · governed model access · audit", BLACK, False)]], size=8)
    badge(s, 2.12, 3.25, "unity_catalog", d=0.3)
    logo(s, 7.85, 3.25, 0.5)

    # Reviewer (outside the platform)
    box(s, 8.75, 1.08, 1.05, 0.62, "Reviewer", "confirm · override · unreadable", icon="human")

    # Arrows
    arrow(s, 1.55, 1.66, 2.05, 1.9)            # images -> autoloader
    arrow(s, 1.55, 2.66, 2.05, 2.5)            # metadata -> autoloader
    label(s, 1.5, 2.05, 0.6, 0.35, "UC Volume", size=6)
    arrow(s, 3.0, 2.52, 3.2, 2.52)             # autoloader -> bronze
    arrow(s, 3.82, 1.7, 3.82, 2.1)             # gateway -> bronze
    arrow(s, 4.45, 2.52, 4.65, 2.52)           # bronze -> silver
    arrow(s, 5.75, 2.52, 5.95, 2.52)           # silver -> gold
    arrow(s, 6.5, 2.1, 6.5, 1.7)               # gold -> genie
    arrow(s, 7.05, 1.39, 7.3, 1.39)            # genie -> app (embedded)
    arrow(s, 7.05, 2.35, 7.3, 2.35)            # gold -> lakebase (synced table)
    arrow(s, 7.3, 2.75, 7.05, 2.75, dashed=True)  # lakebase -> gold (Lakehouse Sync)
    label(s, 6.78, 2.86, 0.8, 0.22, "Lakehouse Sync (CDC)", size=5.5, italic=True)
    arrow(s, 7.87, 1.7, 7.87, 2.1, both=True)  # app <-> lakebase
    arrow(s, 8.45, 1.39, 8.75, 1.39, both=True)  # app <-> reviewer

    bullets(s, 0.55, 4.05, 9.0, 1.5, [
        "Auto Loader reads each new image once; the vision model is called inside the streaming table via Unity AI Gateway (usage, cost and access governed)",
        "Gold applies each gauge's operating limit and flags readings that need a human: low confidence, unreadable, or above limit",
        "Reviewers work in a React app on Lakebase; decisions flow back to Delta through Lakehouse Sync and into gold",
        "Genie answers plain-English questions over the governed gold table, on behalf of the signed-in user",
    ], size=10.5)
    notes(s, "Walk left to right: land, read, refine, serve, review, ask. Point out the closed loop (dashed arrow) and the Unity Catalog band under everything.")


def slide_demo(prs):
    s = prs.slides.add_slide(prs.slide_layouts[6])
    title(s, "Demo: one inspection round")
    steps = [
        ("1  Land", "30 gauge photos and the round's metadata arrive in the raw volume"),
        ("2  Read", "Pipeline reads every dial once: value, unit, confidence, image issues"),
        ("3  Triage", "Review queue: 9 readings need a human, 4 above limit, 1 unreadable"),
        ("4  Correct", "Reviewer fixes a misread needle (5.0 → 1.0 bar) with a reason"),
        ("5  Ask", "“Which readings have needed human intervention?” — Genie answers with SQL"),
    ]
    for i, (head, body) in enumerate(steps):
        x = 0.4 + i * 1.88
        box(s, x, 1.4, 1.72, 1.75, head, body, size=11)
        if i < len(steps) - 1:
            arrow(s, x + 1.72, 2.27, x + 1.88, 2.27)
    bullets(s, 0.55, 3.5, 9.0, 1.6, [
        "Tell: the problem and the outcome  ·  Show: the app and Genie  ·  Tell: what it means for the business",
        "Everything shown runs on synthetic metadata and publicly licensed gauge photos",
    ], size=12)
    notes(s, "Keep the live demo under 8 minutes. Have the PI-3102 correction ready as the human-in-the-loop moment.")


def slide_trust(prs):
    s = prs.slides.add_slide(prs.slide_layouts[6])
    title(s, "Trust: governed AI with a human in the loop")
    cols = [
        ("Human in the loop", ["Confidence below 70%, unreadable dials and excursions always go to a reviewer",
                               "Every decision is appended (never overwritten) and audited", "Human correction rate tracked as live accuracy"]),
        ("Unity Catalog", ["Analysts see the gold table only; the app reads images read-only",
                           "Lineage from raw image to the answer in Genie", "Genie runs with the user's own permissions"]),
        ("Unity AI Gateway", ["Every model call attributed: requester, tokens, latency, status",
                              "Model access governed by UC EXECUTE", "Swap or fall back models without pipeline changes"]),
    ]
    for i, (head, items) in enumerate(cols):
        x = 0.4 + i * 3.1
        container(s, x, 1.2, 2.95, 2.75)
        tb = s.shapes.add_textbox(Inches(x + 0.15), Inches(1.35), Inches(2.7), Inches(0.45))
        _text(tb.text_frame, [[(head, BLUE, False)]], size=14, align=PP_ALIGN.LEFT)
        bullets(s, x + 0.1, 1.85, 2.75, 3.1, items, size=11)


def slide_decisions(prs):
    s = prs.slides.add_slide(prs.slide_layouts[6])
    title(s, "Decisions and trade-offs")
    bullets(s, 0.55, 1.2, 9.0, 4.0, [
        "Foundation vision model via ai_query, not a custom CNN: no labelled data or training; confidence-based review covers the gaps",
        "Model called inside the streaming table: each image read and billed once; reviewed readings never change on refresh",
        "Lakebase for the review step: low-latency transactional writes; synced table stays read-only, decisions return via Lakehouse Sync",
        "Snapshot sync for serving: gold is a materialized view; at ~120 images/day a snapshot takes seconds",
        "“Unusually high” = above the gauge's operating limit (default 75% of full scale), so Genie never invents thresholds",
        "GPT-5.5 chosen after testing 15 vision models: best accuracy among batch-capable models, with a confidence score that separates right from wrong",
    ], size=12)


def slide_next(prs):
    s = prs.slides.add_slide(prs.slide_layouts[6])
    title(s, "Path to production")
    bullets(s, 0.55, 1.2, 9.0, 4.0, [
        "Connect the robot fleet platform's image export to the raw volume (file-arrival trigger already in place)",
        "Load real gauge tags and operating limits from the asset register",
        "Pilot one site for [TBD] weeks; target human correction rate below [TBD]%",
        "Alerting on excursions into the maintenance work-order system",
        "Promote with Declarative Automation Bundles (dev → prod), named reviewer / analyst groups",
    ], size=13)


def main():
    prs = Presentation()
    prs.slide_width, prs.slide_height = Emu(9144000), Emu(5143500)
    for build in (slide_title, slide_outcome, slide_personas, slide_architecture, slide_demo, slide_trust, slide_decisions, slide_next):
        build(prs)
    prs.save(OUT)
    print("wrote", OUT)


if __name__ == "__main__":
    main()
