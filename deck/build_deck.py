"""Builds deck/pressure-gauge-reader.pptx on the Databricks brand template (deck/assets/databricks_brand_template.pptx,
exported from "[BRAND TEMPLATE] Databricks Corporate Slide 2025"): DM Sans, dark teal + Databricks red, brand layouts.

Usage:  python deck/build_deck.py      (requires python-pptx)
Value numbers come from an illustrative value model (assumptions on the slide and in the speaker notes); unit cost per photo comes from evidence/.
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
TEMPLATE = ASSETS / "databricks_brand_template.pptx"
OUT = HERE / "pressure-gauge-reader.pptx"

FONT = "DM Sans"
NAVY = RGBColor(0x1B, 0x30, 0x37)      # brand dark teal (text, arrows)
TEAL = RGBColor(0x61, 0x87, 0x93)      # muted teal (box outlines)
RED = RGBColor(0xFF, 0x36, 0x21)       # Databricks red (component names, accents)
GREY = RGBColor(0x5F, 0x6B, 0x70)

# Brand layouts (master 1 of the template)
L_TITLE, L_BASIC, L_2COL, L_3CARDS, L_CARD_RIGHT, L_CARD_LARGE, L_POWER_KICKER, L_POWER = 7, 1, 2, 4, 5, 6, 9, 10


# ---------- template helpers ----------
def new_slide(prs, layout_idx):
    return prs.slides.add_slide(prs.slide_masters[1].slide_layouts[layout_idx])


def ph(slide, idx):
    for p in slide.placeholders:
        if p.placeholder_format.idx == idx:
            return p
    raise KeyError(idx)


def set_text(slide, idx, text):
    ph(slide, idx).text_frame.text = text


def set_bullets(slide, idx, items, size=None):
    tf = ph(slide, idx).text_frame
    tf.text = items[0]
    for it in items[1:]:
        tf.add_paragraph().text = it
    if size:
        for p in tf.paragraphs:
            for r in p.runs:
                r.font.size = Pt(size)


def drop(slide, idx):
    el = ph(slide, idx)._element
    el.getparent().remove(el)


def notes(slide, text):
    slide.notes_slide.notes_text_frame.text = text


def source_line(slide, text, top=6.78):
    """Small source / footnote line above the slide footer."""
    tb = slide.shapes.add_textbox(Inches(0.83), Inches(top), Inches(11.66), Inches(0.3))
    _text(tb.text_frame, [[(text, GREY, False)]], 9, align=PP_ALIGN.LEFT, anchor=MSO_ANCHOR.TOP)


# ---------- drawing helpers (architecture / flow diagrams) ----------
def _alpha(fill_fmt, hex_rgb, alpha_pct):
    fill_fmt.solid()
    fill_fmt.fore_color.rgb = RGBColor.from_string(hex_rgb)
    clr = fill_fmt._xPr.find(qn("a:solidFill")).find(qn("a:srgbClr"))
    etree.SubElement(clr, qn("a:alpha")).set("val", str(int(alpha_pct * 1000)))


def _text(tf, paras, size, align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE):
    tf.word_wrap = True
    tf.vertical_anchor = anchor
    for attr in ("margin_left", "margin_right", "margin_top", "margin_bottom"):
        setattr(tf, attr, Inches(0.05))
    for i, para in enumerate(paras):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.alignment = align
        for text, color, bold in para:
            r = p.add_run()
            r.text = text
            r.font.name = FONT
            r.font.size = Pt(size)
            r.font.bold = bold
            r.font.color.rgb = color


class Canvas:
    """Draws in design units (a 10 x 5.625 grid) mapped onto a region of the 13.33 x 7.5 slide."""

    def __init__(self, slide, ox, oy, scale):
        self.s, self.ox, self.oy, self.k = slide, ox, oy, scale

    def X(self, v):
        return Inches(self.ox + v * self.k)

    def Y(self, v):
        return Inches(self.oy + v * self.k)

    def L(self, v):
        return Inches(v * self.k)

    def pt(self, v):
        return v * self.k

    def container(self, x, y, w, h, hex_fill, alpha):
        c = self.s.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, self.X(x), self.Y(y), self.L(w), self.L(h))
        c.adjustments[0] = 0.08
        _alpha(c.fill, hex_fill, alpha)
        c.line.fill.background()
        c.shadow.inherit = False
        return c

    def box(self, x, y, w, h, title, body=None, icon=None, size=8):
        b = self.s.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, self.X(x), self.Y(y), self.L(w), self.L(h))
        b.adjustments[0] = 0.14
        b.fill.solid()
        b.fill.fore_color.rgb = RGBColor(0xFF, 0xFF, 0xFF)
        b.line.color.rgb = TEAL
        b.line.width = Pt(0.75)
        b.shadow.inherit = False
        paras = [[(title, RED, True)]]
        if body:
            paras.append([(body, NAVY, False)])
        _text(b.text_frame, paras, self.pt(size))
        if icon:
            self.badge(x + w - 0.16, y - 0.13, icon)
        return b

    def badge(self, x, y, icon, d=0.3):
        c = self.s.shapes.add_shape(MSO_SHAPE.OVAL, self.X(x), self.Y(y), self.L(d), self.L(d))
        c.fill.solid()
        c.fill.fore_color.rgb = RGBColor(0xFF, 0xFF, 0xFF)
        c.line.color.rgb = TEAL
        c.line.width = Pt(0.75)
        c.shadow.inherit = False
        pad = d * 0.18
        self.s.shapes.add_picture(str(ASSETS / f"icon_{icon}.png"), self.X(x + pad), self.Y(y + pad), self.L(d - 2 * pad), self.L(d - 2 * pad))

    def label(self, x, y, w, h, text, size=7, color=NAVY, italic=False, align=PP_ALIGN.CENTER):
        tb = self.s.shapes.add_textbox(self.X(x), self.Y(y), self.L(w), self.L(h))
        _text(tb.text_frame, [[(text, color, False)]], self.pt(size), align=align)
        for p in tb.text_frame.paragraphs:
            for r in p.runs:
                r.font.italic = italic
        return tb

    def arrow(self, x1, y1, x2, y2, both=False, dashed=False):
        c = self.s.shapes.add_connector(MSO_CONNECTOR.STRAIGHT, self.X(x1), self.Y(y1), self.X(x2), self.Y(y2))
        c.line.color.rgb = NAVY
        c.line.width = Pt(1.25)
        ln = c.line._get_or_add_ln()
        if dashed:
            etree.SubElement(ln, qn("a:prstDash")).set("val", "dash")
        for tag, on in (("a:headEnd", both), ("a:tailEnd", True)):
            e = etree.SubElement(ln, qn(tag))
            e.set("type", "triangle" if on else "none")
            e.set("w", "med")
            e.set("len", "med")


# ---------- slides ----------
def slide_title(prs):
    s = new_slide(prs, L_TITLE)
    set_text(s, 0, "Northbay Energy Gauge Reader")
    set_text(s, 1, "AI visual inspection for robot rounds")
    set_text(s, 2, "Starting with every pressure gauge  |  October 2026")
    notes(s, "Northbay Energy is a fictional operator (one refinery, one terminal) built on synthetic metadata and publicly licensed gauge photos. "
             "Open with the business persona: operations leadership running robot inspection rounds.")


def slide_problem(prs):
    s = new_slide(prs, L_3CARDS)
    set_text(s, 0, "Why Northbay needs this")
    set_text(s, 7, "Robots photograph every gauge — trusted readings are the bottleneck")
    for hdr, body, (ih, ib) in [
        ("Analog gauges are here to stay", [
            "The vast majority of plant gauges are still analog¹",
            "Swapping each for a transmitter means hot work, cabling and hazardous-area certification",
            "So the reading still has to come from a person, or a photo",
        ], (4, 1)),
        ("A photo is not a reading", [
            "Robots already capture photos at scale: 120,000+ inspections a month for one vendor alone³",
            "Glare, dirt, rain and steep angles defeat simple vision models¹",
            "Third-party readings still get re-checked by hand, outside the data platform",
        ], (5, 2)),
        ("Late readings cost money", [
            "An out-of-range pressure found at the next manual round is a missed early warning",
            "Unplanned downtime costs the world's 500 largest companies ~$1.4tn a year, 11% of revenue²",
        ], (6, 3)),
    ]:
        set_text(s, ih, hdr)
        set_bullets(s, ib, body, size=15)
    source_line(s, "¹ Reitsma et al., “Under pressure: learning-based analog gauge reading in the wild”, ETH Zurich, ICRA 2024.   "
                   "² Siemens, The True Cost of Downtime 2024.   ³ ANYbotics, anybotics.com (vendor-reported).")
    notes(s, "Business context first. Analog gauges persist because brownfield retrofits are expensive and slow; robots solve the walking, not the reading. "
             "The ICRA paper lists reflections, dirt, mounting angles and the variety of dial designs as why gauge reading is hard for computer vision. "
             "Siemens: an average large plant still loses 27 hours a month to unplanned downtime.")


def slide_heard(prs):
    s = new_slide(prs, L_BASIC)
    set_text(s, 0, "What we hear from energy operators")
    set_text(s, 2, "Patterns from robot inspection programmes, and our answer to each")
    body = ph(s, 1)
    left, top, width = body.left, body.top, body.width
    drop(s, 1)
    rows = [
        ("“Accuracy comes first — a wrong reading is worse than a late one.”",
         "Every reading carries a confidence score; low-confidence, unreadable and unexpectedly high readings always go to a person"),
        ("“We pay a vendor per image, and still check its readings by hand.”",
         "Readings run inside the platform at a known cost per reading (~$0.04), with every correction audited"),
        ("“Photos are taken in fog, rain and glare, on dirty dials.”",
         "The model reports image issues (glare, blur, angle, dirt) so reviewers see why a reading was flagged"),
        ("“We want to own the capability, not rent a black box.”",
         "A governed foundation model in Unity Catalog: no training data, swap models through Unity AI Gateway"),
        ("“Next: spot rust and leaks, and trends across rounds.”",
         "The same pipeline extends to condition findings and per-gauge trends, feeding maintenance work orders"),
    ]
    tbl = s.shapes.add_table(len(rows) + 1, 2, left, top - Inches(0.25), width, Inches(4.4)).table
    tbl.columns[0].width = int(width * 0.46)
    tbl.columns[1].width = width - tbl.columns[0].width
    for c, h in enumerate(("What operators tell us", "How Northbay's Gauge Reader answers it")):
        cell = tbl.cell(0, c)
        cell.fill.solid()
        cell.fill.fore_color.rgb = NAVY
        _text(cell.text_frame, [[(h, RGBColor(0xFF, 0xFF, 0xFF), True)]], 14, align=PP_ALIGN.LEFT)
    for r, (heard, answer) in enumerate(rows, start=1):
        for c, (txt, color, italic) in enumerate(((heard, NAVY, True), (answer, NAVY, False))):
            cell = tbl.cell(r, c)
            cell.fill.solid()
            cell.fill.fore_color.rgb = RGBColor(0xF4, 0xF6, 0xF7) if r % 2 else RGBColor(0xFF, 0xFF, 0xFF)
            _text(cell.text_frame, [[(txt, color, False)]], 13, align=PP_ALIGN.LEFT)
            for p in cell.text_frame.paragraphs:
                for run in p.runs:
                    run.font.italic = italic
    notes(s, "Generalised from robot gauge-reading programmes at energy operators (no customer names). "
             "Use this slide to show discovery skills: each answer maps to something visible in the demo.")


def _pillar(slide, x, y, w, h, title, bullets, accent=RED):
    """A value-proposition card: accent bar, title and short bullets."""
    card = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(x), Inches(y), Inches(w), Inches(h))
    card.fill.solid()
    card.fill.fore_color.rgb = RGBColor(0xFF, 0xFF, 0xFF)
    card.line.color.rgb = RGBColor(0xDC, 0xE0, 0xE2)
    card.line.width = Pt(0.75)
    card.shadow.inherit = False
    bar = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(x), Inches(y), Inches(w), Inches(0.07))
    bar.fill.solid()
    bar.fill.fore_color.rgb = accent
    bar.line.fill.background()
    bar.shadow.inherit = False
    tb = slide.shapes.add_textbox(Inches(x + 0.18), Inches(y + 0.22), Inches(w - 0.36), Inches(h - 0.35))
    tf = tb.text_frame
    tf.word_wrap = True
    tf.vertical_anchor = MSO_ANCHOR.TOP
    p = tf.paragraphs[0]
    r = p.add_run()
    r.text = title
    r.font.name, r.font.size, r.font.bold, r.font.color.rgb = FONT, Pt(17), True, NAVY
    p.space_after = Pt(8)
    for b in bullets:
        p = tf.add_paragraph()
        p.space_after = Pt(6)
        r = p.add_run()
        r.text = "•  " + b
        r.font.name, r.font.size, r.font.color.rgb = FONT, Pt(13.5), NAVY


def slide_value_prop(prs):
    s = new_slide(prs, L_BASIC)
    set_text(s, 0, "One platform for visual inspection")
    set_text(s, 2, "Gauge readings are the first use case — not the last")
    drop(s, 1)
    pillars = [
        ("Beyond gauges", [
            "The same photos also show leaks, corrosion and rust, breakages, missing guards and valve positions",
            "A new inspection type is a new prompt and output fields, not a new project",
            "Same review queue, same governance, same Genie",
        ]),
        ("Open, not a black box", [
            "Foundation vision models instead of hand-built computer vision that needs tuning per dial, angle and light",
            "No third-party vendor or per-image fee; prompts, data and results stay in your lakehouse",
            "Swap models through Unity AI Gateway",
        ]),
        ("Specialise when it pays", [
            "The model is an example: start with a foundation model, no training needed",
            "Every reviewer correction becomes a labelled example",
            "Fine-tune specialist models (gauge reading, rust detection) and evaluate them before switching",
        ]),
        ("Any cloud, any robot", [
            "Runs on Databricks on AWS, Azure and Google Cloud, deployed as one bundle¹",
            "Works with photos from any robot, drone or handheld camera",
            "No lock-in to a robot or vision vendor",
        ]),
    ]
    w, gap, x0 = 2.83, 0.12, 0.83
    for i, (title, bullets) in enumerate(pillars):
        _pillar(s, x0 + i * (w + gap), 2.1, w, 4.45, title, bullets, accent=RED if i % 2 == 0 else TEAL)
    source_line(s, "¹ Lakebase is in Beta on Google Cloud; where Lakehouse Sync (Lakebase → Delta) is not yet available, a scheduled MERGE "
                   "returns review decisions to Delta (DECISIONS D4).")
    notes(s, "The value proposition: one governed platform turns inspection photos into data. Gauges are the worked example in this build. "
             "Condition findings (leaks, rust, damage) reuse the same pipeline with a new prompt and output schema. "
             "The reviewer loop produces labelled data, so fine-tuning a specialist model is an option once volumes justify it.")


def slide_compare(prs):
    s = new_slide(prs, L_BASIC)
    set_text(s, 0, "Beyond classic vision and vendors")
    set_text(s, 2, "Foundation models on an open platform change the economics")
    body = ph(s, 1)
    left, top, width = body.left, body.top, body.width
    drop(s, 1)
    header = ("", "Bespoke computer vision", "Third-party vendor", "Foundation models on Databricks")
    rows = [
        ("New inspection type", "New detection, segmentation and OCR models to build", "Wait for the vendor's roadmap", "New prompt and output fields; test it the same day"),
        ("Labelled data to start", "Labelled images for every gauge type and defect", "None, but it's the vendor's model", "None — reviewer corrections build a labelled set as you go"),
        ("Hand-tuning", "Per dial design, angle, glare and lighting", "Opaque; results still re-checked by hand", "Confidence score routes uncertain readings to a person"),
        ("Cost model", "GPU training plus a team to maintain it", "Fee per image", "Pay per token: ~$0.04 per gauge reading²"),
        ("Data and governance", "A separate stack to secure", "Results arrive outside your platform", "Unity Catalog: grants, lineage, audit"),
        ("Improves over time", "Only when someone retrains it", "On the vendor's terms", "Swap or fine-tune models through Unity AI Gateway"),
    ]
    tbl = s.shapes.add_table(len(rows) + 1, 4, left, top - Inches(0.3), width, Inches(4.5)).table
    widths = [0.19, 0.25, 0.23, 0.33]
    for i, f in enumerate(widths):
        tbl.columns[i].width = int(width * f)
    for c, h in enumerate(header):
        cell = tbl.cell(0, c)
        cell.fill.solid()
        cell.fill.fore_color.rgb = RED if c == 3 else NAVY
        _text(cell.text_frame, [[(h, RGBColor(0xFF, 0xFF, 0xFF), True)]], 13, align=PP_ALIGN.LEFT)
    for r, row in enumerate(rows, start=1):
        for c, txt in enumerate(row):
            cell = tbl.cell(r, c)
            cell.fill.solid()
            cell.fill.fore_color.rgb = (RGBColor(0xFF, 0xF1, 0xEE) if c == 3
                                        else RGBColor(0xF4, 0xF6, 0xF7) if r % 2 else RGBColor(0xFF, 0xFF, 0xFF))
            _text(cell.text_frame, [[(txt, NAVY, c in (0, 3))]], 12, align=PP_ALIGN.LEFT)
    source_line(s, "² Build run: GPT-5.5 via Unity AI Gateway at list price (evidence/07_gateway.md). Bespoke pipeline steps as described in "
                   "Reitsma et al., ETH Zurich, ICRA 2024.")
    notes(s, "Bespoke gauge-reading pipelines chain several models: detect the gauge, segment the needle, find the scale notches, fit an ellipse, "
             "OCR the scale markings (ETH Zurich, ICRA 2024). Each new dial type or defect adds work. A foundation model reads the dial in one call, "
             "and the platform adds the review loop, governance and cost control.")


def slide_outcome(prs):
    s = new_slide(prs, L_3CARDS)
    set_text(s, 0, "Where the value comes from")
    set_text(s, 7, "Illustrative site: 500 gauges, photographed twice a day")
    for hdr, body, (ih, ib) in [
        ("~4,900 hours a year", [
            "365,000 readings a year, each transcribed or re-checked by hand: ~6,100 hours at 1 minute each¹",
            "With AI, people check only the uncertain ones (target: 1 in 5)",
            "About 3 people's time, freed for maintenance",
        ], (4, 1)),
        ("~$15k a year AI cost", [
            "365,000 photos × ~$0.04 per photo at list price²",
            "vs. ~$180k a year at a $0.50 per-image vendor fee¹",
            "No model to train, host or maintain",
        ], (5, 2)),
        ("Earlier warnings", [
            "Excursions flagged the same shift, not at the next manual round",
            "Unplanned downtime costs a large plant ~$0.8M an hour³",
            "Avoiding a single hour is worth ~50× the annual AI cost",
        ], (6, 3)),
    ]:
        set_text(s, ih, hdr)
        set_bullets(s, ib, body, size=15)
    source_line(s, "¹ Assumptions to replace with Northbay's numbers: 1 min per reading, $0.50 per image vendor fee.   "
                   "² Measured tokens per photo × GPT-5.5 list price.   ³ Siemens, The True Cost of Downtime 2024.")
    notes(s, "Lead with the value for the executive sponsor. This is a value model, not a test result: replace the assumptions with Northbay's "
             "gauge count, rounds per day, minutes per reading and current vendor fee. "
             "Hours: 500 gauges x 2 rounds x 365 days = 365,000 readings; at 1 minute each = ~6,100 hours; reviewing 1 in 5 = ~1,200 hours; "
             "~4,900 hours saved (~2.9 FTE at 1,700 hours). AI cost: 365,000 x $0.042 = ~$15k. Vendor: 365,000 x $0.50 = ~$180k. "
             "Downtime: $253M / 326 hours = ~$776k an hour, ~50x the annual AI cost. "
             "Gauge readings are the first use case; the same photos also give leak, corrosion and damage findings at no extra capture cost.")


def slide_personas(prs):
    s = new_slide(prs, L_2COL)
    set_text(s, 0, "Value for both sides of the business")
    set_text(s, 5, "Built for the executive sponsor and the domain owner")
    set_text(s, 3, "Executive sponsor — VP Operations / HSE")
    set_bullets(s, 1, [
        "Robot rounds keep ~2,200 operator hours a year out of process areas (2 rounds a day × ~3 hours)",
        "Vendor dependency removed: ~$15k a year on the platform vs. ~$180k in per-image fees",
        "Unexpectedly high pressures surfaced the same shift, not at the next manual round",
    ], size=16)
    set_text(s, 4, "Domain owner — Reliability / Maintenance lead")
    set_bullets(s, 2, [
        "One review queue, sorted by risk: low confidence, unreadable, unexpectedly high",
        "Every correction audited (who, when, why) and fed back to the lakehouse",
        "Ask in plain English: “Are any pressure readings unexpectedly high?”",
    ], size=16)
    notes(s, "Frame value for both personas the AI roleplay will play: the business stakeholder and the technical/domain stakeholder.")


def slide_architecture(prs):
    s = new_slide(prs, L_CARD_LARGE)
    set_text(s, 0, "Architecture")
    set_text(s, 2, "One governed journey: robot photo → trusted reading → answer")
    drop(s, 1)
    c = Canvas(s, ox=0.85, oy=1.08, scale=1.2)   # design grid y 0.95..4.0 lands inside the brand card

    # Source: inspection site
    c.container(0.25, 1.0, 1.45, 2.9, "EEF1F2", 100)
    c.box(0.4, 1.35, 1.15, 0.62, "Gauge images", "JPG, per round")
    c.box(0.4, 2.35, 1.15, 0.62, "Gauge metadata", "CSV: tag, site, limits")
    c.badge(0.4, 3.3, "internet_of_things", d=0.42)
    c.label(0.85, 3.3, 0.8, 0.42, "Robot inspection rounds", size=7, align=PP_ALIGN.LEFT)

    # Databricks platform
    c.container(1.9, 0.95, 6.7, 3.0, "FFE4DF", 45)
    c.box(2.05, 1.45, 0.95, 1.5, "Lakeflow Auto Loader", "Incremental, exactly-once ingest from the UC Volume", icon="data_pipelines")
    c.box(3.2, 1.08, 1.25, 0.62, "Unity AI Gateway", "GPT-5.5 or any fine-tuned model", icon="access_connector")
    c.box(3.2, 2.1, 1.25, 0.85, "Bronze", "ai_query: reading, unit, scale, confidence", icon="unstructured_bronze")
    c.box(4.65, 2.1, 1.1, 0.85, "Silver", "Parsed readings + quality checks", icon="semi_structured_silver")
    c.box(5.95, 2.1, 1.1, 0.85, "Gold", "Readings + limits + review status", icon="delta_table")
    c.box(5.95, 1.08, 1.1, 0.62, "Genie Agent", "Ask in plain English", icon="ai")
    c.box(7.3, 2.1, 1.15, 0.85, "Lakebase", "Serving copy + review decisions", icon="data_warehouse")
    c.box(7.3, 1.08, 1.15, 0.62, "Databricks App", "Review queue (React)", icon="apps_services")

    band = s.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, c.X(2.05), c.Y(3.15), c.L(6.4), c.L(0.5))
    band.adjustments[0] = 0.3
    band.fill.solid()
    band.fill.fore_color.rgb = RGBColor(0xFF, 0xFF, 0xFF)
    band.line.color.rgb = TEAL
    band.line.width = Pt(0.75)
    band.shadow.inherit = False
    _text(band.text_frame, [[("Unity Catalog   ", RED, True), ("explicit grants · lineage · raw volume · governed model access · audit", NAVY, False)]], c.pt(8))
    c.badge(2.12, 3.25, "unity_catalog", d=0.3)

    # Reviewer (outside the platform)
    c.box(8.75, 1.08, 1.05, 0.62, "Reviewer", "confirm · override · unreadable", icon="human")

    c.arrow(1.55, 1.66, 2.05, 1.9)
    c.arrow(1.55, 2.66, 2.05, 2.5)
    c.label(1.5, 2.05, 0.6, 0.35, "UC Volume", size=6)
    c.arrow(3.0, 2.52, 3.2, 2.52)
    c.arrow(3.82, 1.7, 3.82, 2.1)
    c.arrow(4.45, 2.52, 4.65, 2.52)
    c.arrow(5.75, 2.52, 5.95, 2.52)
    c.arrow(6.5, 2.1, 6.5, 1.7)
    c.arrow(7.05, 1.39, 7.3, 1.39)
    c.arrow(7.05, 2.35, 7.3, 2.35)
    c.arrow(7.3, 2.75, 7.05, 2.75, dashed=True)
    c.label(6.78, 2.86, 0.8, 0.22, "Lakehouse Sync (CDC)", size=5.5, italic=True)
    c.arrow(7.87, 1.7, 7.87, 2.1, both=True)
    c.arrow(8.45, 1.39, 8.75, 1.39, both=True)

    for i, (head, body) in enumerate([
        ("Human in the loop  ", "confidence < 70%, unreadable or unexpectedly high → a reviewer; decisions appended, never overwritten"),
        ("Unity Catalog  ", "analysts see gold only; the app reads photos read-only; Genie runs as the signed-in user"),
        ("Unity AI Gateway  ", "every model call attributed and costed (~$0.04 per reading); swap models without pipeline changes"),
    ]):
        tb = s.shapes.add_textbox(c.X(0.25 + i * 3.2), c.Y(4.0), c.L(3.1), c.L(0.55))
        _text(tb.text_frame, [[(head, RED, True), (body, NAVY, False)]], c.pt(7.5), align=PP_ALIGN.LEFT, anchor=MSO_ANCHOR.TOP)
    notes(s, "Walk left to right: land, read, refine, serve, review, ask. Point out the closed loop (dashed arrow) and the Unity Catalog band under everything. "
             "Governed AI: low-confidence, unreadable and unexpectedly high readings always go to a reviewer; decisions are appended, never overwritten; "
             "the human correction rate is the live accuracy check. Analysts see the gold table only, Genie runs with the user's own permissions, "
             "and every model call is attributed in Unity AI Gateway.\n\n"
             "DEMO (8-10 min): 1 Land: 30 photos + metadata in the raw volume. 2 Read: the pipeline reads each dial once. "
             "3 Triage: the queue shows only the readings that need a person. 4 Correct: fix PI-3102 (5.0 → 1.0 bar) with a reason. "
             "5 Ask: Genie, 'Which locations have the most low-confidence readings?'. 6 Trust: How it works + AI model & usage pages.")


def slide_decisions(prs):
    s = new_slide(prs, L_BASIC)
    set_text(s, 0, "Decisions and trade-offs")
    set_text(s, 2, "Why this approach and not another")
    set_bullets(s, 1, [
        "Foundation vision model via ai_query, not a custom CNN: no labelled data or training; confidence-based review covers the gaps",
        "Model called inside the streaming table: each image read and billed once; reviewed readings never change on refresh",
        "Lakebase for the review step: low-latency transactional writes; decisions return to Delta via Lakehouse Sync",
        "Snapshot sync for serving: gold is a materialized view; at ~120 images/day a snapshot takes seconds",
        "“Unexpectedly high” = above the gauge's operating limit (default 75% of full scale), so Genie never invents thresholds",
        "GPT-5.5 chosen after testing 15 vision models: best accuracy among batch-capable models, with a confidence score that separates right from wrong",
    ], size=17)


def slide_roadmap_pilot(prs):
    s = new_slide(prs, L_CARD_RIGHT)
    set_text(s, 0, "Roadmap and pilot")
    set_text(s, 3, "Each phase reuses the pipeline, review app, governance and Genie")
    set_bullets(s, 1, [
        "1 · Gauge readings: pilot at one site; unexpectedly high readings raise maintenance work orders",
        "2 · Condition findings: leaks, rust and breakages from the same photos, in the same review queue",
        "3 · Specialist models: fine-tune on reviewer-labelled photos; evaluate before switching",
        "Pilot set-up: connect the robots' image export, load gauge tags and limits from the asset register, promote dev → prod with bundles",
    ], size=15)
    set_bullets(s, 2, [
        "Pilot success criteria",
        "One site, 8 weeks, ~500 gauges",
        "At most 1 in 5 readings sent to review",
        "≥ 95% of auto-accepted readings within ±2% of full scale (weekly spot check)",
        "~4,900 hours a year of reading and re-checking removed (run rate)",
        "Every reading traceable from photo to answer",
    ], size=16)
    notes(s, "Phase 2 needs no new infrastructure: add condition fields to the model's output schema and a findings view in gold. "
             "Phase 3 uses the reviewer corrections from phases 1 and 2 as training and evaluation data.")


def slide_close(prs):
    s = new_slide(prs, L_POWER)
    set_text(s, 0, "Every photo read, every finding governed")


def main():
    prs = Presentation(str(TEMPLATE))
    # Remove the template's sample slide(s); keep its masters and layouts.
    sldIdLst = prs.slides._sldIdLst
    for sldId in list(sldIdLst):
        prs.part.drop_rel(sldId.rId)
        sldIdLst.remove(sldId)
    for build in (slide_title, slide_outcome, slide_personas, slide_problem, slide_heard, slide_value_prop, slide_compare,
                  slide_architecture, slide_decisions, slide_roadmap_pilot, slide_close):
        build(prs)
    prs.save(OUT)
    print("wrote", OUT)


if __name__ == "__main__":
    main()
