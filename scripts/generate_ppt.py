#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Service Team 6月→7月 表现复盘 PPT 生成器
读取 scripts/review_data.json, 按工作手册风格(深森绿+橙+米色+警示红)生成 PPT。
维度: 可排班 / 考勤 / 门迎 / 店务 / 好评 / 业绩 / 5维评分 + 综合奖惩建议。
"""
import json
import os
from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE
from pptx.chart.data import CategoryChartData
from pptx.enum.chart import XL_CHART_TYPE, XL_LEGEND_POSITION
from pptx.enum.text import MSO_AUTO_SIZE

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "scripts", "review_data.json")
OUT = os.path.join(ROOT, "Service Team 7月复盘.pptx")

# ---------- 配色 (工作手册: 深森绿 + 橙 + 米色 + 警示红) ----------
FOREST   = RGBColor(0x1B, 0x3A, 0x2F)
FOREST2  = RGBColor(0x2E, 0x5E, 0x3A)
ORANGE   = RGBColor(0xE8, 0x74, 0x3B)
ORANGE_L = RGBColor(0xF2, 0x87, 0x2B)
BEIGE    = RGBColor(0xF4, 0xEE, 0xE2)
BEIGE2   = RGBColor(0xE9, 0xDF, 0xCB)
RED      = RGBColor(0xC0, 0x39, 0x2B)
INK      = RGBColor(0x2A, 0x2E, 0x2B)
WHITE    = RGBColor(0xFF, 0xFF, 0xFF)
MUTED    = RGBColor(0x6B, 0x72, 0x6A)
GOLD     = RGBColor(0xC9, 0x9A, 0x3B)

CN = "PingFang SC"
NUM = "Helvetica Neue"

prs = Presentation()
prs.slide_width = Inches(13.333)
prs.slide_height = Inches(7.5)
SW, SH = prs.slide_width, prs.slide_height
BLANK = prs.slide_layouts[6]


def load():
    with open(DATA, encoding="utf-8") as f:
        return json.load(f)


def _set_font(run, size, bold=False, color=INK, name=CN):
    run.font.size = Pt(size)
    run.font.bold = bold
    run.font.color.rgb = color
    run.font.name = name


def add_rect(slide, x, y, w, h, fill, line=None, shape=MSO_SHAPE.RECTANGLE):
    sp = slide.shapes.add_shape(shape, x, y, w, h)
    sp.fill.solid()
    sp.fill.fore_color.rgb = fill
    if line is None:
        sp.line.fill.background()
    else:
        sp.line.color.rgb = line
        sp.line.width = Pt(1)
    sp.shadow.inherit = False
    return sp


def add_text(slide, x, y, w, h, text, size=14, bold=False, color=INK,
             align=PP_ALIGN.LEFT, anchor=MSO_ANCHOR.TOP, name=CN, line_spacing=1.0):
    tb = slide.shapes.add_textbox(x, y, w, h)
    tf = tb.text_frame
    tf.word_wrap = True
    tf.vertical_anchor = anchor
    tf.auto_size = MSO_AUTO_SIZE.NONE
    p = tf.paragraphs[0]
    p.alignment = align
    p.line_spacing = line_spacing
    r = p.add_run()
    r.text = text
    _set_font(r, size, bold, color, name)
    return tb


def title_bar(slide, title, subtitle=None, idx=None):
    add_rect(slide, 0, 0, SW, Inches(1.15), FOREST)
    add_rect(slide, 0, Inches(1.15), SW, Pt(4), ORANGE)
    add_text(slide, Inches(0.55), Inches(0.18), Inches(11.5), Inches(0.55),
             title, size=26, bold=True, color=WHITE, anchor=MSO_ANCHOR.MIDDLE)
    if subtitle:
        add_text(slide, Inches(0.57), Inches(0.72), Inches(11.5), Inches(0.35),
                 subtitle, size=13, color=RGBColor(0xCF, 0xDD, 0xD3))
    if idx is not None:
        add_text(slide, Inches(12.4), Inches(0.18), Inches(0.7), Inches(0.55),
                 idx, size=20, bold=True, color=ORANGE_L, align=PP_ALIGN.RIGHT,
                 anchor=MSO_ANCHOR.MIDDLE)


def footer(slide, n):
    add_text(slide, Inches(0.55), Inches(7.05), Inches(8), Inches(0.35),
             "Salomon 安福路旗舰店 · Service Team 月度复盘", size=9, color=MUTED)
    add_text(slide, Inches(12.2), Inches(7.05), Inches(0.9), Inches(0.35),
             f"{n:02d}", size=10, bold=True, color=FOREST2, align=PP_ALIGN.RIGHT)


def d(v):
    """display value: None/'' -> —"""
    if v is None or v == "":
        return "—"
    if isinstance(v, float):
        return f"{v:.1f}"
    return str(v)


def set_cell(cell, text, size=11, bold=False, color=INK, fill=None,
             align=PP_ALIGN.LEFT, name=CN):
    cell.margin_left = Inches(0.06)
    cell.margin_right = Inches(0.06)
    cell.margin_top = Inches(0.02)
    cell.margin_bottom = Inches(0.02)
    cell.vertical_anchor = MSO_ANCHOR.MIDDLE
    if fill is not None:
        cell.fill.solid()
        cell.fill.fore_color.rgb = fill
    else:
        cell.fill.solid()
        cell.fill.fore_color.rgb = WHITE
    tf = cell.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.alignment = align
    p.text = ""
    r = p.add_run()
    r.text = text
    _set_font(r, size, bold, color, name)


def add_table(slide, x, y, w, headers, rows, col_w=None, row_h=Inches(0.34),
              header_fill=FOREST, fsize=11, name_col0_bold=True):
    nr = len(rows) + 1
    nc = len(headers)
    gtbl = slide.shapes.add_table(nr, nc, x, y, w, row_h * nr)
    tbl = gtbl.table
    # disable default style banding
    tbl.first_row = False
    tbl.horz_banding = False
    if col_w:
        for i, cw in enumerate(col_w):
            tbl.columns[i].width = cw
    # header
    for c, htxt in enumerate(headers):
        set_cell(tbl.cell(0, c), htxt, size=fsize, bold=True, color=WHITE,
                 fill=header_fill, align=PP_ALIGN.CENTER)
    # body
    for ri, row in enumerate(rows):
        base = BEIGE if ri % 2 == 0 else WHITE
        for c, val in enumerate(row):
            is_name = (c == 0)
            fill = base
            color = INK
            bold = name_col0_bold and is_name
            align = PP_ALIGN.LEFT if is_name else PP_ALIGN.CENTER
            # 待评/缺标记红色
            if isinstance(val, str) and ("待评" in val or val == "—" and c > 0):
                color = MUTED
            set_cell(tbl.cell(ri + 1, c), val, size=fsize, bold=bold,
                     color=color, fill=fill, align=align)
    return tbl


def kpi_card(slide, x, y, w, h, value, label, delta=None, dcolor=None):
    add_rect(slide, x, y, w, h, WHITE, line=BEIGE2, shape=MSO_SHAPE.ROUNDED_RECTANGLE)
    add_rect(slide, x, y, Pt(6), h, ORANGE, shape=MSO_SHAPE.ROUNDED_RECTANGLE)
    add_text(slide, x + Inches(0.18), y + Inches(0.12), w - Inches(0.25), Inches(0.55),
             value, size=24, bold=True, color=FOREST, name=NUM)
    add_text(slide, x + Inches(0.18), y + Inches(0.72), w - Inches(0.25), Inches(0.35),
             label, size=11, color=INK)
    if delta is not None:
        add_text(slide, x + Inches(0.18), y + Inches(1.05), w - Inches(0.25), Inches(0.3),
                 delta, size=10, bold=True, color=dcolor or MUTED)


def note_box(slide, x, y, w, text, color=FOREST2):
    add_rect(slide, x, y, w, Inches(0.7), BEIGE, line=BEIGE2,
             shape=MSO_SHAPE.ROUNDED_RECTANGLE)
    add_rect(slide, x, y, Pt(5), Inches(0.7), ORANGE, shape=MSO_SHAPE.ROUNDED_RECTANGLE)
    add_text(slide, x + Inches(0.16), y + Inches(0.06), w - Inches(0.25), Inches(0.6),
             text, size=10.5, color=color, anchor=MSO_ANCHOR.MIDDLE, line_spacing=1.05)


# ============================================================
def build():
    D = load()
    names = [s["name"] for s in D["staff"]]
    M = D["metrics"]
    meta = D.get("exportMeta", {})

    # ----- 汇总常量 -----
    def g(name, dim, mo, key, default=None):
        try:
            return M[name][dim][mo].get(key, default)
        except Exception:
            return default

    # ===== Slide 1 封面 =====
    s = prs.slides.add_slide(BLANK)
    add_rect(s, 0, 0, SW, SH, FOREST)
    add_rect(s, 0, Inches(5.5), SW, Pt(5), ORANGE)
    add_rect(s, Inches(0.9), Inches(1.5), Inches(1.4), Pt(6), ORANGE_L)
    add_text(s, Inches(0.9), Inches(1.7), Inches(11), Inches(1.4),
             "Service Team 月度表现复盘", size=46, bold=True, color=WHITE)
    add_text(s, Inches(0.92), Inches(3.15), Inches(11), Inches(0.7),
             "2026年 6月  →  7月  对比分析", size=24, color=ORANGE_L)
    add_text(s, Inches(0.92), Inches(3.95), Inches(11), Inches(0.6),
             "季度奖惩评估 · 去留决策依据", size=16, color=RGBColor(0xCF, 0xDD, 0xD3))
    add_text(s, Inches(0.92), Inches(5.8), Inches(11), Inches(0.5),
             f"数据来源：线上系统导出  ·  版本 {meta.get('dataVersion','')}  ·  导出时间 {meta.get('exportTime','')[:10]}",
             size=11, color=RGBColor(0x9F, 0xB3, 0xA8))
    add_text(s, Inches(0.92), Inches(6.2), Inches(11), Inches(0.5),
             "Salomon 安福路旗舰店 · 体验式零售团队", size=12, color=RGBColor(0x9F, 0xB3, 0xA8))

    # ===== Slide 2 总览 =====
    s = prs.slides.add_slide(BLANK)
    add_rect(s, 0, 0, SW, SH, BEIGE)
    title_bar(s, "总览 · 关键指标", "Service Team 6月 vs 7月 核心数据一览", "01")
    # totals
    jul_sales = sum((M[n]["performance"]["2026-07"] or {}).get("sales", 0) or 0 for n in names)
    jun_sales = sum((M[n]["performance"]["2026-06"] or {}).get("sales", 0) or 0 for n in names)
    jul_hours = sum(M[n]["attendance"]["2026-07"]["hours"] for n in names)
    jun_hours = sum(M[n]["attendance"]["2026-06"]["hours"] for n in names)
    jul_door = sum(M[n]["door"]["2026-07"]["slots"] for n in names)
    jun_door = sum(M[n]["door"]["2026-06"]["slots"] for n in names)
    jul_store = sum(M[n]["storeSupport"]["2026-07"]["count"] for n in names)
    jun_store = sum(M[n]["storeSupport"]["2026-06"]["count"] for n in names)
    jul_rev = sum(M[n]["reviews"]["2026-07"]["count"] for n in names)
    jun_rev = sum(M[n]["reviews"]["2026-06"]["count"] for n in names)

    def delta(j, u):
        if u == 0:
            return "—"
        pct = (j - u) / u * 100
        return f"{'+' if pct >= 0 else ''}{pct:.0f}%"

    cards = [
        ("17", "Service Team 人数", "含离职 1 人", FOREST),
        (f"¥{jul_sales:,.0f}", "7月总销售额", f"6月 {jun_sales:,.0f} ({delta(jul_sales,jun_sales)})", ORANGE),
        (f"{jul_hours:,.0f}h", "7月总考勤工时", f"6月 {jun_hours:,.0f}h ({delta(jul_hours,jun_hours)})", FOREST2),
        (f"{jul_door}", "7月门迎总次数", f"6月 {jun_door} ({delta(jul_door,jun_door)})", ORANGE),
        (f"{jul_store}", "7月店务总条数", f"6月 {jun_store} ({delta(jul_store,jun_store)})", FOREST2),
        (f"{jul_rev}", "7月顾客好评数", f"6月 {jun_rev} ({delta(jul_rev,jun_rev)})", ORANGE),
    ]
    cw = Inches(3.9)
    ch = Inches(1.55)
    gx, gy = Inches(0.55), Inches(1.5)
    for i, (v, lb, dl, col) in enumerate(cards):
        cx = gx + (i % 3) * (cw + Inches(0.22))
        cy = gy + (i // 3) * (ch + Inches(0.25))
        add_rect(s, cx, cy, cw, ch, WHITE, line=BEIGE2, shape=MSO_SHAPE.ROUNDED_RECTANGLE)
        add_rect(s, cx, cy, Pt(6), ch, col, shape=MSO_SHAPE.ROUNDED_RECTANGLE)
        add_text(s, cx + Inches(0.2), cy + Inches(0.16), cw - Inches(0.3), Inches(0.6),
                 v, size=26, bold=True, color=col, name=NUM)
        add_text(s, cx + Inches(0.2), cy + Inches(0.82), cw - Inches(0.3), Inches(0.35),
                 lb, size=13, bold=True, color=INK)
        add_text(s, cx + Inches(0.2), cy + Inches(1.15), cw - Inches(0.3), Inches(0.3),
                 dl, size=10.5, color=MUTED)
    note_box(s, Inches(0.55), Inches(5.55), Inches(12.2),
             "说明：7月总销售额含 16 人有销售记录；陈昕媛已于7月转正为全职，其兼职业绩自7月起不在统计内。"
             "6月「可排班」数据部分人员未填报，详见维度一。")
    footer(s, 2)

    # ===== Slide 3 可排班 =====
    s = prs.slides.add_slide(BLANK)
    add_rect(s, 0, 0, SW, SH, BEIGE)
    title_bar(s, "维度一 · 可排班（工时支持）", "每周可排班 ≥4天 为达标 · 6月 vs 7月", "02")
    rows = []
    for n in names:
        a6 = g(n, "availability", "2026-06", "total")
        a7 = g(n, "availability", "2026-07", "total")
        chg = "—" if a6 in (None, 0) or a7 is None else ("▲" if a7 > a6 else ("▼" if a7 < a6 else "—"))
        rows.append([n, d(a6), d(a7), chg])
    add_table(s, Inches(0.55), Inches(1.45), Inches(7.2),
              ["姓名", "6月可排班(天)", "7月可排班(天)", "变化"], rows,
              col_w=[Inches(2.2), Inches(1.9), Inches(1.9), Inches(1.2)], row_h=Inches(0.30))
    note_box(s, Inches(8.0), Inches(1.45), Inches(4.8),
             "⚠️ 6月可排班数据多名成员未完整填报（显示 — 或 0），不具可比性；7月数据较完整，以7月为评估基准。")
    note_box(s, Inches(8.0), Inches(2.35), Inches(4.8),
             "贾长乐 / 玛依拉 / 梁实秋 / 唐蓉 6月为 0，因当时未纳入排班填报，7月已正常提交。")
    footer(s, 3)

    # ===== Slide 4 考勤 =====
    s = prs.slides.add_slide(BLANK)
    add_rect(s, 0, 0, SW, SH, BEIGE)
    title_bar(s, "维度二 · 考勤", "灵工打卡工时与异常状态 · 6月 vs 7月", "03")
    rows = []
    for n in names:
        h6 = g(n, "attendance", "2026-06", "hours")
        h7 = g(n, "attendance", "2026-07", "hours")
        sb = g(n, "attendance", "2026-07", "status_breakdown", {})
        anom = g(n, "attendance", "2026-07", "anomaly", 0)
        ab = g(n, "attendance", "2026-07", "absent", 0)
        ca = g(n, "attendance", "2026-07", "cancel", 0)
        flag = []
        if ab: flag.append(f"缺勤{ab}")
        if anom: flag.append(f"异常{anom}")
        if ca: flag.append(f"取消{ca}")
        rows.append([n, d(h6), d(h7), (" / ".join(flag) if flag else "正常")])
    add_table(s, Inches(0.55), Inches(1.45), Inches(8.0),
              ["姓名", "6月工时(h)", "7月工时(h)", "7月异常状态"], rows,
              col_w=[Inches(2.0), Inches(1.7), Inches(1.7), Inches(2.6)], row_h=Inches(0.30))
    # 7月工时 bar chart
    chart_rows = [(n, g(n, "attendance", "2026-07", "hours")) for n in names]
    chart_rows = [(n, h) for n, h in chart_rows if h]
    chart_rows.sort(key=lambda x: x[1], reverse=True)
    cd = CategoryChartData()
    cd.categories = [n for n, _ in chart_rows]
    cd.add_series("7月工时(h)", [h for _, h in chart_rows])
    gf = s.shapes.add_chart(XL_CHART_TYPE.BAR_CLUSTERED, Inches(8.7), Inches(1.5),
                            Inches(4.1), Inches(5.0), cd)
    ch = gf.chart
    ch.has_legend = False
    ch.has_title = True
    ch.chart_title.text_frame.text = "7月考勤工时排名"
    plot = ch.plots[0]
    plot.has_data_labels = True
    plot.data_labels.font.size = Pt(8)
    ser = plot.series[0]
    ser.format.fill.solid()
    ser.format.fill.fore_color.rgb = FOREST2
    footer(s, 4)

    # ===== Slide 5 门迎 =====
    s = prs.slides.add_slide(BLANK)
    add_rect(s, 0, 0, SW, SH, BEIGE)
    title_bar(s, "维度三 · 门迎排班", "门店形象与导览支持 · 6月 vs 7月 次数", "04")
    rows = []
    for n in names:
        d6 = g(n, "door", "2026-06", "slots")
        d7 = g(n, "door", "2026-07", "slots")
        chg = "—" if (d6 in (None, 0)) else ("▲" if d7 > d6 else ("▼" if d7 < d6 else "—"))
        rows.append([n, d(d6), d(d7), chg])
    add_table(s, Inches(0.55), Inches(1.45), Inches(7.2),
              ["姓名", "6月门迎(次)", "7月门迎(次)", "变化"], rows,
              col_w=[Inches(2.2), Inches(1.7), Inches(1.7), Inches(1.6)], row_h=Inches(0.30))
    chart_rows = [(n, g(n, "door", "2026-07", "slots")) for n in names]
    chart_rows = [(n, v) for n, v in chart_rows if v]
    chart_rows.sort(key=lambda x: x[1], reverse=True)
    cd = CategoryChartData()
    cd.categories = [n for n, _ in chart_rows]
    cd.add_series("7月门迎次数", [v for _, v in chart_rows])
    gf = s.shapes.add_chart(XL_CHART_TYPE.COLUMN_CLUSTERED, Inches(8.0), Inches(1.5),
                            Inches(4.8), Inches(5.0), cd)
    ch = gf.chart
    ch.has_legend = False
    ch.has_title = True
    ch.chart_title.text_frame.text = "7月门迎次数排名"
    plot = ch.plots[0]
    plot.has_data_labels = True
    plot.data_labels.font.size = Pt(8)
    ser = plot.series[0]
    ser.format.fill.solid()
    ser.format.fill.fore_color.rgb = ORANGE
    footer(s, 5)

    # ===== Slide 6 店务支援 =====
    s = prs.slides.add_slide(BLANK)
    add_rect(s, 0, 0, SW, SH, BEIGE)
    title_bar(s, "维度四 · 店务支援", "门店运营支持（整理/陈列/收货等） · 6月 vs 7月", "05")
    rows = []
    for n in names:
        s6 = g(n, "storeSupport", "2026-06", "count")
        s7 = g(n, "storeSupport", "2026-07", "count")
        bt = g(n, "storeSupport", "2026-07", "by_type", {})
        top = max(bt.items(), key=lambda x: x[1])[0] if bt else "—"
        chg = "—" if (s6 in (None, 0)) else ("▲" if s7 > s6 else ("▼" if s7 < s6 else "—"))
        rows.append([n, d(s6), d(s7), top, chg])
    add_table(s, Inches(0.55), Inches(1.45), Inches(11.5),
              ["姓名", "6月(条)", "7月(条)", "7月主要类型", "变化"], rows,
              col_w=[Inches(2.0), Inches(1.5), Inches(1.5), Inches(4.8), Inches(1.7)],
              row_h=Inches(0.30))
    footer(s, 6)

    # ===== Slide 7 顾客好评 =====
    s = prs.slides.add_slide(BLANK)
    add_rect(s, 0, 0, SW, SH, BEIGE)
    title_bar(s, "维度五 · 顾客好评", "大众点评等渠道好评记录 · 6月 vs 7月", "06")
    rows = []
    for n in names:
        r6 = g(n, "reviews", "2026-06", "count")
        r7 = g(n, "reviews", "2026-07", "count")
        ar = g(n, "reviews", "2026-07", "avg_rating")
        chg = "—" if (r6 in (None, 0)) else ("▲" if (r7 or 0) > r6 else ("▼" if (r7 or 0) < r6 else "—"))
        rows.append([n, d(r6), d(r7), (f"{ar:.1f}" if ar else "—"), chg])
    add_table(s, Inches(0.55), Inches(1.45), Inches(8.0),
              ["姓名", "6月(条)", "7月(条)", "7月均分", "变化"], rows,
              col_w=[Inches(2.2), Inches(1.6), Inches(1.6), Inches(1.6), Inches(1.8)],
              row_h=Inches(0.30))
    note_box(s, Inches(8.7), Inches(1.45), Inches(4.1),
             "7月好评共 %d 条，均为 5 星。王龙宇(5)、迟骋(4)、杨子豪(3) 领先。"
             % jul_rev)
    note_box(s, Inches(8.7), Inches(2.35), Inches(4.1),
             "好评维度挂钩「你的回报」中的服务奖励，是导览质量的直接佐证。")
    footer(s, 7)

    # ===== Slide 8 业绩 (销售) =====
    s = prs.slides.add_slide(BLANK)
    add_rect(s, 0, 0, SW, SH, BEIGE)
    title_bar(s, "维度六 · 销售业绩", "销售额 / 时产 / UPT / 件数 · 6月 vs 7月", "07")
    rows = []
    for n in names:
        p6 = M[n]["performance"]["2026-06"] or {}
        p7 = M[n]["performance"]["2026-07"] or {}
        rows.append([
            n,
            d(p6.get("sales")), d(p7.get("sales")),
            d(p7.get("hourlyOutput")), d(p7.get("upt")),
            d(p7.get("qty")),
        ])
    add_table(s, Inches(0.55), Inches(1.3), Inches(11.6),
              ["姓名", "6月销售额¥", "7月销售额¥", "7月时产¥/h", "7月UPT", "7月件数"], rows,
              col_w=[Inches(2.0), Inches(2.2), Inches(2.2), Inches(2.0), Inches(1.6), Inches(1.6)],
              row_h=Inches(0.29))
    note_box(s, Inches(0.55), Inches(6.6), Inches(12.2),
             "7月 Service Team 17人 销售额合计 ¥%s。陈昕媛7月转正为全职，无兼职业绩记录；龚赟昊/何秋烨/王雅澜位列7月销售前三。"
             % f"{jul_sales:,}")
    footer(s, 8)

    # ===== Slide 9 5维评分 =====
    s = prs.slides.add_slide(BLANK)
    add_rect(s, 0, 0, SW, SH, BEIGE)
    title_bar(s, "维度七 · 5维评分", "工时支持 / 业绩 / 行为规范 / 考勤 / 好评", "08")
    note_box(s, Inches(0.55), Inches(1.25), Inches(12.2),
             "⚠️ 7月 5维评分在系统中均为「待评」占位（综合分=0），尚未录入。右表为 7月 评分要素原始输入，"
             "供最终评分参考；建议系统补录后更新本页。", color=RED)
    # June real scores (left)
    add_text(s, Inches(0.55), Inches(1.95), Inches(6), Inches(0.3),
             "6月 评分（已录入，13人）", size=12, bold=True, color=FOREST2)
    rows = []
    for n in names:
        rt = M[n]["ratings"]["2026-06"]
        if rt and not rt.get("pending"):
            sc = rt["scores"]
            rows.append([n, d(rt["avgScore"]),
                         d(sc.get("availability")), d(sc.get("performance")),
                         d(sc.get("behavior")), d(sc.get("attendance")),
                         d(sc.get("customerReview")), d(rt.get("hourlyRate"))])
        else:
            rows.append([n, "—", "—", "—", "—", "—", "—", "—"])
    add_table(s, Inches(0.55), Inches(2.3), Inches(5.3),
              ["姓名", "综合", "工时", "业绩", "行为", "考勤", "好评", "时薪"], rows,
              col_w=[Inches(1.4), Inches(0.7), Inches(0.7), Inches(0.7), Inches(0.7), Inches(0.7), Inches(0.7), Inches(0.5)],
              row_h=Inches(0.26), fsize=9)
    # July rating inputs (right)
    add_text(s, Inches(6.9), Inches(1.95), Inches(6), Inches(0.3),
             "7月 评分要素输入（待系统评分）", size=12, bold=True, color=MUTED)
    rows2 = []
    for n in names:
        ri = M[n]["rating_inputs"]["2026-07"]
        sb = ri["attendance_status"]
        att = "正常" if all(k == "打卡正常" for k in sb) else "/".join(
            f"{k}{v}" for k, v in sb.items() if k != "打卡正常")
        rows2.append([n, d(ri["avail_days"]), d(ri["sales"]), d(ri["hourlyOutput"]),
                      d(ri["door_slots"]), d(ri["store_count"]), d(ri["review_count"]), att])
    add_table(s, Inches(6.9), Inches(2.3), Inches(5.3),
              ["姓名", "排班", "销售", "时产", "门迎", "店务", "好评", "考勤"], rows2,
              col_w=[Inches(1.2), Inches(0.55), Inches(0.85), Inches(0.55), Inches(0.55), Inches(0.55), Inches(0.55), Inches(0.5)],
              row_h=Inches(0.26), fsize=9)
    footer(s, 9)

    # ===== Slide 10 综合奖惩建议 =====
    s = prs.slides.add_slide(BLANK)
    add_rect(s, 0, 0, SW, SH, BEIGE)
    title_bar(s, "综合评估 · 奖惩与去留建议", "基于可量化指标的归一化综合参考排序", "09")
    # composite
    import statistics
    def col_vals(keyfn):
        vs = [keyfn(n) for n in names]
        vs = [v for v in vs if v is not None and v != 0]
        return vs
    metrics_def = [
        ("sales", lambda n: (M[n]["performance"]["2026-07"] or {}).get("sales") or 0, 0.30),
        ("hours", lambda n: M[n]["attendance"]["2026-07"]["hours"], 0.15),
        ("door", lambda n: M[n]["door"]["2026-07"]["slots"], 0.15),
        ("store", lambda n: M[n]["storeSupport"]["2026-07"]["count"], 0.15),
        ("reviews", lambda n: M[n]["reviews"]["2026-07"]["count"], 0.10),
        ("june_score", lambda n: (M[n]["ratings"]["2026-06"] or {}).get("avgScore") or 0, 0.15),
    ]
    norm = {}
    for key, fn, w in metrics_def:
        raw = [fn(n) for n in names]
        mx, mn = max(raw), min(raw)
        rng = (mx - mn) or 1
        norm[key] = {n: (fn(n) - mn) / rng for n in names}
    comp = {}
    for n in names:
        comp[n] = sum(w * norm[key][n] for key, fn, w in metrics_def)
    ranked = sorted(names, key=lambda n: comp[n], reverse=True)
    # tier
    tier = {}
    for i, n in enumerate(ranked):
        if i < 5: tier[n] = ("优先奖励 / 留用", FOREST)
        elif i >= len(ranked) - 4: tier[n] = ("待改进 / 关注", RED)
        else: tier[n] = ("稳定贡献", GOLD)
    rows = []
    for i, n in enumerate(ranked):
        left = "离职" if M[n].get("left") else ("转正" if n == "陈昕媛" else "")
        rows.append([f"{i+1}", n, f"{comp[n]*100:.0f}",
                     tier[n][0] + (f" · {left}" if left else "")])
    add_table(s, Inches(0.55), Inches(1.45), Inches(7.6),
              ["排名", "姓名", "综合分", "建议"], rows,
              col_w=[Inches(1.0), Inches(2.0), Inches(1.4), Inches(3.2)], row_h=Inches(0.30))
    note_box(s, Inches(8.4), Inches(1.45), Inches(4.4),
             "综合分 = 销售30% + 工时15% + 门迎15% + 店务15% + 好评10% + 6月评分15%，"
             "各指标按全员极差归一化。此为决策参考，非系统定稿。")
    note_box(s, Inches(8.4), Inches(2.45), Inches(4.4),
             "李若彤已于 07-29 离职（已在排名中标注），不计入留用建议。陈昕媛7月转正，兼职指标不适用。")
    note_box(s, Inches(8.4), Inches(3.45), Inches(4.4),
             "⚠️ 建议待 7月 5维评分在系统录入后，用真实综合分替换本参考排序再做最终奖惩。")
    footer(s, 10)

    # ===== Slide 11 数据说明 =====
    s = prs.slides.add_slide(BLANK)
    add_rect(s, 0, 0, SW, SH, BEIGE)
    title_bar(s, "数据说明与附录", "口径、局限与待办", "10")
    notes = [
        "数据来源：线上系统「数据管理 → 立即导出」完整 app_data（版本 %s，导出 %s）。" % (
            meta.get("dataVersion", ""), meta.get("exportTime", "")[:10]),
        "覆盖范围：Service Team 共 17 人（含 1 名离职：李若彤，07-29）。",
        "6月「可排班」多名成员未完整填报，数值为 0 或缺失，不具对比性，以 7月为基准。",
        "7月 5维评分在系统中均为「待评」占位（综合分=0），尚未录入；本PPT以原始评分要素呈现，待系统补录后更新。",
        "陈昕媛于 7月转正为全职，其兼职业绩/门迎/店务自 7月起不再计入统计，故 7月相关指标显著下降属正常。",
        "贾长乐 / 玛依拉 / 梁实秋 / 唐蓉 6月无销售记录，7月才产生销售；其 6月评分亦缺失。",
        "考勤工时 = 灵工打卡工时；门迎/店务/好评来自系统对应模块；销售额来自收银小票备注匹配。",
        "待办：① 在系统完成 7月 5维评分录入 → 重新导出 → 更新本PPT评分页与综合排序；② 确认去留名单。",
    ]
    y = Inches(1.5)
    for i, t in enumerate(notes, 1):
        add_text(s, Inches(0.6), y, Inches(12.2), Inches(0.62),
                 f"{i}.  {t}", size=12, color=INK, line_spacing=1.05)
        y += Inches(0.66)
    footer(s, 11)

    prs.save(OUT)
    print(f"[ok] PPT 已生成 -> {OUT}")
    print(f"[info] 幻灯片数: {len(prs.slides._sldIdLst)}")


if __name__ == "__main__":
    build()
