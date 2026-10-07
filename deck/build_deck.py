"""Builds deck/pressure-gauge-reader.pptx on the Databricks brand template (deck/assets/databricks_brand_template.pptx,
exported from "[BRAND TEMPLATE] Databricks Corporate Slide 2025"): DM Sans, dark teal + Databricks red, brand layouts.

Usage:  python deck/build_deck.py      (requires python-pptx)
Numbers shown as [TBD] still need to be filled in from the impact model; measured numbers come from evidence/.
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
    set_text(s, 1, "Robot inspection rounds, read by AI, checked by people")
    set_text(s, 2, "Refinery and terminal  |  October 2026")
    notes(s, "Northbay Energy is a fictional operator (one refinery, one terminal) built on synthetic metadata and publicly licensed gauge photos. "
             "Open with the business persona: operations leadership running robot inspection rounds.")


def slide_outcome_statement(prs):
    s = new_slide(prs, L_POWER_KICKER)
    set_text(s, 1, "THE OUTCOME")
    set_text(s, 0, "Every gauge read in minutes, not days")
    notes(s, "Lead with the outcome for the executive sponsor.")


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
            "Rounds produce thousands of photos a month",
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
                   "² Siemens, The True Cost of Downtime 2024.")
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


def slide_why_now(prs):
    s = new_slide(prs, L_3CARDS)
    set_text(s, 0, "Why now")
    set_text(s, 7, "The three pieces that were missing are now in place")
    for hdr, body, (ih, ib) in [
        ("Robots are already on site", [
            "Legged robots and drones run routine rounds in hazardous areas",
            "Inspection robots already capture images at scale: 120,000+ inspections analysed a month by one vendor alone³",
        ], (4, 1)),
        ("Vision models read dials", [
            "Foundation vision models read a dial with no labelled data or training",
            "They also say how sure they are, so people only check the uncertain ones",
        ], (5, 2)),
        ("Governed, at a known cost", [
            "One governed platform from photo to answer: Lakeflow, Unity Catalog, Lakebase, Genie",
            "Every model call logged and costed: ~$0.04 per reading at list price",
        ], (6, 3)),
    ]:
        set_text(s, ih, hdr)
        set_bullets(s, ib, body, size=15)
    source_line(s, "³ ANYbotics, anybotics.com (vendor-reported figure).   Cost per reading: build run, GPT-5.5 via Unity AI Gateway (evidence/07_gateway.md).")


def slide_outcome(prs):
    s = new_slide(prs, L_3CARDS)
    set_text(s, 0, "What changes for operations")
    set_text(s, 7, "Measured on the build round: 30 gauges, 2 sites")
    for hdr, body, (ih, ib) in [
        ("67% need no one", ["20 of 30 readings read and accepted by AI", "Reviewers check 10, not 30 — no manual transcription"], (4, 1)),
        ("< 3 minutes", ["One pipeline run read the whole round, each photo once", "Excursions surfaced the same shift"], (5, 2)),
        ("~$0.04 per reading", ["AI cost at list price, every call attributed", "100% of uncertain or unexpectedly high readings checked by a person"], (6, 3)),
    ]:
        set_text(s, ih, hdr)
        set_bullets(s, ib, body)
    notes(s, "Numbers from the build run (evidence/04_readings_summary.md, 01_pipeline_run.md, 07_gateway.md). "
             "Still to model with the customer: hours of manual rounds removed per site x loaded cost, and vendor cost per image avoided.")


def slide_personas(prs):
    s = new_slide(prs, L_2COL)
    set_text(s, 0, "Value for both sides of the business")
    set_text(s, 5, "Built for the executive sponsor and the domain owner")
    set_text(s, 3, "Executive sponsor — VP Operations / HSE")
    set_bullets(s, 1, [
        "Fewer people in hazardous areas for routine rounds: [TBD] exposure hours avoided per year",
        "Vendor dependency removed: ~$0.04 per reading on the platform vs. [TBD] per image today",
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
    c.box(3.2, 1.08, 1.25, 0.62, "Unity AI Gateway", "GPT-5.5 vision model", icon="access_connector")
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

    c.label(0.25, 4.05, 9.55, 0.4,
            "Each image is read once inside the streaming table · gold applies each gauge's operating limit · "
            "reviewer decisions flow back to Delta through Lakehouse Sync · Genie runs with the signed-in user's permissions",
            size=7, color=GREY)
    notes(s, "Walk left to right: land, read, refine, serve, review, ask. Point out the closed loop (dashed arrow) and the Unity Catalog band under everything.")


def slide_demo(prs):
    s = new_slide(prs, L_BASIC)
    set_text(s, 0, "Demo: one inspection round")
    set_text(s, 2, "Tell the problem · show the app and Genie · tell the value")
    drop(s, 1)
    c = Canvas(s, ox=0.85, oy=2.0, scale=1.17)
    steps = [
        ("1  Land", "30 gauge photos and the round's metadata arrive in the raw volume"),
        ("2  Read", "The pipeline reads every dial once: value, unit, confidence, image issues"),
        ("3  Triage", "67% need no one; the queue shows the readings that need a person"),
        ("4  Correct", "A reviewer fixes a misread needle (5.0 → 1.0 bar) with a reason"),
        ("5  Ask", "“Which locations have the most low-confidence readings?” — Genie answers with SQL"),
        ("6  Trust", "AI model & usage: cost per reading, confidence vs threshold, correction rate"),
    ]
    for i, (head, body) in enumerate(steps):
        x = 0.0 + i * 1.65
        c.box(x, 0.2, 1.48, 1.9, head, body, size=11)
        if i < len(steps) - 1:
            c.arrow(x + 1.48, 1.15, x + 1.65, 1.15)
    c.label(0.0, 2.45, 9.7, 0.4, "Everything shown runs on synthetic metadata and publicly licensed gauge photos", size=9, color=GREY, align=PP_ALIGN.LEFT)
    notes(s, "Keep the live demo under 8 minutes. Have the PI-3102 correction ready as the human-in-the-loop moment.")


def slide_trust(prs):
    s = new_slide(prs, L_3CARDS)
    set_text(s, 0, "Governed AI with a human in the loop")
    set_text(s, 7, "AI reads, people decide where it matters, the platform keeps the record")
    for hdr, items, (ih, ib) in [
        ("Human in the loop", ["Confidence below 70%, unreadable dials and unexpectedly high readings always go to a reviewer",
                               "Decisions are appended, never overwritten", "Human correction rate tracked as live accuracy"], (4, 1)),
        ("Unity Catalog", ["Analysts see the gold table only; the app reads images read-only",
                           "Lineage from raw image to the answer in Genie", "Genie runs with the user's own permissions"], (5, 2)),
        ("Unity AI Gateway", ["Every model call attributed: requester, tokens, status",
                              "Cost per reading shown in the app (~$0.04 at list price)",
                              "Model access governed by UC EXECUTE; swap models without pipeline changes"], (6, 3)),
    ]:
        set_text(s, ih, hdr)
        set_bullets(s, ib, items)


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


def slide_next(prs):
    s = new_slide(prs, L_CARD_RIGHT)
    set_text(s, 0, "Path to production")
    set_text(s, 3, "From one demo round to a site pilot")
    set_bullets(s, 1, [
        "Connect the robot fleet's image export to the raw volume (file-arrival trigger in place)",
        "Load real gauge tags and operating limits from the asset register",
        "Alert on unexpectedly high readings into the maintenance work-order system",
        "Extend the same pipeline to condition findings (rust, leaks) and per-gauge trends across rounds",
        "Promote with Declarative Automation Bundles (dev → prod) and named reviewer / analyst groups",
    ], size=16)
    set_bullets(s, 2, [
        "Pilot success criteria",
        "One site, [TBD] weeks",
        "Human correction rate below [TBD]%",
        "[TBD] hours of manual rounds removed",
        "Every reading traceable from photo to answer",
    ], size=16)


def slide_close(prs):
    s = new_slide(prs, L_POWER)
    set_text(s, 0, "Every gauge read, every decision governed")


def main():
    prs = Presentation(str(TEMPLATE))
    # Remove the template's sample slide(s); keep its masters and layouts.
    sldIdLst = prs.slides._sldIdLst
    for sldId in list(sldIdLst):
        prs.part.drop_rel(sldId.rId)
        sldIdLst.remove(sldId)
    for build in (slide_title, slide_outcome_statement, slide_problem, slide_heard, slide_why_now, slide_outcome, slide_personas, slide_architecture,
                  slide_demo, slide_trust, slide_decisions, slide_next, slide_close):
        build(prs)
    prs.save(OUT)
    print("wrote", OUT)


if __name__ == "__main__":
    main()
