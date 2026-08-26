#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Service Team 7月复盘 精简版 — 系统实际评分"""
from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.chart.data import CategoryChartData
from pptx.enum.chart import XL_CHART_TYPE, XL_LEGEND_POSITION, XL_LABEL_POSITION
import json, os

# ============ 调色板 (工作手册风格) ============
FOREST = RGBColor(0x0F, 0x33, 0x29)      # 深森绿 主色
FOREST2 = RGBColor(0x1B, 0x4D, 0x3A)
ORANGE = RGBColor(0xE8, 0x6A, 0x1C)      # 橙 强调
ORANGE2 = RGBColor(0xF5, 0x8A, 0x2A)
BEIGE = RGBColor(0xF5, 0xEC, 0xD9)       # 米色 底
RED = RGBColor(0xC0, 0x39, 0x2B)         # 警示红
GREEN = RGBColor(0x2E, 0x8B, 0x57)       # 达标绿
WHITE = RGBColor(0xFF, 0xFF, 0xFF)
MUTED = RGBColor(0x6B, 0x73, 0x66)
GRAY = RGBColor(0xE0, 0xDD, 0xD2)
INK = RGBColor(0x1A, 0x1A, 0x1A)
GOLD = RGBColor(0xD4, 0xA5, 0x17)

# 尺寸
SLIDE_W, SLIDE_H = Inches(13.333), Inches(7.5)  # 16:9
SW, SH = SLIDE_W, SLIDE_H

# 字体
ZH = "Microsoft YaHei"
EN = "Segoe UI"
NUM = "Segoe UI"

# ============ 数据 ============
# 6月评分（从 export）
JUN = {
    "陈昕媛": 4.90, "李若彤": 4.70, "朱凯赟": 4.60, "王雅澜": 4.60,
    "何秋烨": 4.60, "龚赟昊": 4.60, "孔祥宇": 4.80, "迟骋": 4.50,
    "杨子豪": 4.50, "王靳毓": 4.40, "邓奇缘": 4.30, "王龙宇": 4.20,
    "田佳乐": 4.00,
}

# 7月评分（从截图）
JUL = {
    "王雅澜": 4.2, "龚赟昊": 4.2, "孔祥宇": 4.1,
    "田佳乐": 3.6, "迟骋": 3.6, "王靳毓": 3.6, "王龙宇": 3.6,
    "玛依拉": 3.5, "杨子豪": 3.4,
}

EXCL_NEW = {"贾长乐", "玛依拉", "梁实秋", "唐蓉"}
EXCL_67 = EXCL_NEW | {"李若彤", "陈昕媛"}

# 7月 Top 3 (从截图)
TOP3 = [
    ("王雅澜", 4.2, "MVP", "¥60/h · 铁人担当", "工时5.0 · 行为4.7 · 业绩3.5 · 好评3.0",
     "出勤铁人 · 零迟到", "风雨无阻，随叫随到"),
    ("龚赟昊", 4.2, "亚军", "¥60/h · 铁人担当", "工时5.0 · 行为4.0 · 业绩5.0 · 好评2.0",
     "好产之王 · 出勤铁人 · 零迟到", "能卖能扛，店铺发动机"),
    ("孔祥宇", 4.1, "季军", "¥60/h · 铁人担当", "工时5.0 · 行为5.0 · 业绩2.5 · 好评3.0",
     "出勤铁人 · 门面MVP · 零迟到", "风雨无阻，随叫随到"),
]

# 7月 Bottom 3 (从截图，排除贾/玛/梁/唐) — 玛依拉 3.5 排除，3rd 在 3.6 三人并列中选最低
BOTTOM3 = [
    ("杨子豪", 3.4, "¥28/h · 铁人担当", "工时5.0 · 行为3.0 · 业绩1.0 · 好评3.0",
     "出勤铁人 · 零迟到", "业绩断崖式下滑，无其他短板"),
    ("王龙宇", 3.6, "¥60/h · 稳中向好", "工时4.0 · 行为3.0 · 业绩2.0 · 好评4.0",
     "零迟到", "工时支持与销售业绩双弱，但好评基础扎实"),
    ("田佳乐", 3.6, "¥60/h · 销售主力", "工时5.0 · 行为3.0 · 业绩4.0 · 好评3.0",
     "出勤铁人", "迟到/缺勤1次扣分（考勤3.0），销售能力尚可"),
]

# 6+7月平均 (排除 贾/玛/梁/唐/李/陈)
def avg67():
    res = []
    for n in JUN:
        if n in EXCL_67: continue
        j7 = JUL.get(n)
        if j7 is None: continue
        res.append((n, (JUN[n] + j7) / 2, JUN[n], j7))
    return sorted(res, key=lambda x: x[1])

AVG67 = avg67()
# 6+7月最低3
LOW3_67 = AVG67[:3]

# ============ Helpers ============
def add_rect(s, x, y, w, h, fill=None, line=None):
    shp = s.shapes.add_shape(MSO_SHAPE.RECTANGLE, x, y, w, h)
    shp.shadow.inherit = False
    if fill is not None:
        shp.fill.solid(); shp.fill.fore_color.rgb = fill
    else:
        shp.fill.background()
    if line is None:
        shp.line.fill.background()
    else:
        shp.line.color.rgb = line; shp.line.width = Pt(0.75)
    shp.text_frame.margin_left = shp.text_frame.margin_right = 0
    shp.text_frame.margin_top = shp.text_frame.margin_bottom = 0
    return shp

def add_text(s, x, y, w, h, txt, size=12, bold=False, color=INK, align=PP_ALIGN.LEFT,
             anchor=MSO_ANCHOR.TOP, name=ZH, line_spacing=1.15):
    tb = s.shapes.add_textbox(x, y, w, h)
    tf = tb.text_frame
    tf.margin_left = tf.margin_right = Inches(0.05)
    tf.margin_top = tf.margin_bottom = Inches(0.02)
    tf.word_wrap = True
    tf.vertical_anchor = anchor
    lines = txt.split("\n") if isinstance(txt, str) else [str(txt)]
    for i, ln in enumerate(lines):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.alignment = align
        p.line_spacing = line_spacing
        r = p.add_run(); r.text = ln
        r.font.name = name; r.font.size = Pt(size); r.font.bold = bold
        r.font.color.rgb = color
    return tb

def add_runs(s, x, y, w, h, runs, align=PP_ALIGN.LEFT, anchor=MSO_ANCHOR.TOP, line_spacing=1.15):
    """runs: list of (text, size, bold, color, [name])"""
    tb = s.shapes.add_textbox(x, y, w, h)
    tf = tb.text_frame
    tf.margin_left = tf.margin_right = Inches(0.05)
    tf.margin_top = tf.margin_bottom = Inches(0.02)
    tf.word_wrap = True
    tf.vertical_anchor = anchor
    p = tf.paragraphs[0]; p.alignment = align; p.line_spacing = line_spacing
    for text, size, bold, color, *rest in runs:
        r = p.add_run(); r.text = text
        r.font.name = rest[0] if rest else ZH
        r.font.size = Pt(size); r.font.bold = bold
        r.font.color.rgb = color
    return tb

def title_bar(s, num, title, subtitle):
    """页眉 编号 + 标题 + 副标题"""
    # 左上 编号小方块
    add_rect(s, Inches(0.55), Inches(0.45), Inches(0.65), Inches(0.65), FOREST)
    add_text(s, Inches(0.55), Inches(0.45), Inches(0.65), Inches(0.65),
             num, size=22, bold=True, color=WHITE, align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE, name=NUM)
    # 标题
    add_text(s, Inches(1.35), Inches(0.4), Inches(8), Inches(0.45),
             title, size=22, bold=True, color=FOREST, name=ZH)
    # 副标题
    add_text(s, Inches(1.35), Inches(0.85), Inches(9), Inches(0.3),
             subtitle, size=10, color=MUTED, name=ZH)
    # 顶部分割线
    add_rect(s, Inches(0.55), Inches(1.25), Inches(12.2), Inches(0.02), FOREST)

def footer(s, page, total=6):
    add_rect(s, 0, Inches(7.18), SW, Inches(0.32), FOREST)
    add_text(s, Inches(0.55), Inches(7.18), Inches(10), Inches(0.32),
             "Service Team 月度复盘 · 6月 vs 7月 · 2026", size=9, color=WHITE,
             anchor=MSO_ANCHOR.MIDDLE)
    add_text(s, Inches(11.7), Inches(7.18), Inches(1.5), Inches(0.32),
             f"{page} / {total}", size=9, color=WHITE,
             align=PP_ALIGN.RIGHT, anchor=MSO_ANCHOR.MIDDLE, name=NUM)

def medal_badge(s, x, y, w, h, rank):
    """Top 3 奖牌徽章"""
    colors = {"MVP": GOLD, "亚军": RGBColor(0xC0, 0xC0, 0xC0), "季军": RGBColor(0xCD, 0x7F, 0x32)}
    c = colors.get(rank, ORANGE)
    add_rect(s, x, y, w, h, c)
    add_text(s, x, y, w, h, rank, size=14, bold=True, color=WHITE,
             align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE, name=ZH)

# ============ Build PPT ============
prs = Presentation()
prs.slide_width = SLIDE_W
prs.slide_height = SLIDE_H
BLANK = prs.slide_layouts[6]

# ---------- Slide 1 封面 ----------
s = prs.slides.add_slide(BLANK)
add_rect(s, 0, 0, SW, SH, BEIGE)
# 顶部色带
add_rect(s, 0, 0, SW, Inches(0.5), FOREST)
add_text(s, Inches(0.6), 0, Inches(12), Inches(0.5),
         "SALOMON 安福路 · Service Team", size=12, bold=True, color=WHITE,
         anchor=MSO_ANCHOR.MIDDLE, name=EN)
# 主标
add_text(s, Inches(0.6), Inches(2.0), Inches(12.2), Inches(1.2),
         "Service Team 月度复盘", size=44, bold=True, color=FOREST, name=ZH)
add_text(s, Inches(0.6), Inches(3.1), Inches(12.2), Inches(0.7),
         "6月  →  7月", size=28, bold=False, color=ORANGE, name=EN)
# 副标
add_text(s, Inches(0.6), Inches(4.1), Inches(12.2), Inches(0.5),
         "季度奖惩 · 去留依据", size=18, color=FOREST2, name=ZH)
# 底部条
add_rect(s, 0, Inches(6.5), SW, Inches(1.0), FOREST)
add_text(s, Inches(0.6), Inches(6.5), Inches(12.2), Inches(1.0),
         "数据口径：6月=系统评分  |  7月=截图实时评分  |  工时仅计 Service Team 17 人",
         size=12, color=WHITE, anchor=MSO_ANCHOR.MIDDLE, name=ZH)

# ---------- Slide 2 总览 KPI ----------
s = prs.slides.add_slide(BLANK)
add_rect(s, 0, 0, SW, SH, WHITE)
title_bar(s, "01", "总览 · 6月 vs 7月", "Service Team 17 人（含 1 人 7/29 离职、1 人 7月起转正）")

# 4 个 KPI 卡片
def kpi(x, y, w, h, big, label, sub, color=ORANGE):
    add_rect(s, x, y, w, h, BEIGE)
    add_rect(s, x, y, Inches(0.12), h, color)  # 左侧色条
    add_text(s, x + Inches(0.3), y + Inches(0.25), w - Inches(0.4), Inches(0.9),
             big, size=38, bold=True, color=color, name=NUM)
    add_text(s, x + Inches(0.3), y + Inches(1.1), w - Inches(0.4), Inches(0.35),
             label, size=12, bold=True, color=FOREST, name=ZH)
    add_text(s, x + Inches(0.3), y + Inches(1.4), w - Inches(0.4), Inches(0.4),
             sub, size=10, color=MUTED, name=ZH)

# KPI 1: 7月销售额
kpi(Inches(0.55), Inches(1.55), Inches(2.95), Inches(1.85),
    "¥189,182", "7月总销售额", "Service Team 17 人合计")
# KPI 2: 7月工时（仅 ST）
kpi(Inches(3.65), Inches(1.55), Inches(2.95), Inches(1.85),
    "2,440 h", "7月总工时", "仅 Service Team 17 人")
# KPI 3: 7月门迎
kpi(Inches(6.75), Inches(1.55), Inches(2.95), Inches(1.85),
    "277 次", "7月门迎排班", "29 天 × 平均 9.6 次/天")
# KPI 4: 7月好评
kpi(Inches(9.85), Inches(1.55), Inches(2.95), Inches(1.85),
    "29 条", "7月顾客好评", "环比 +190%（6月 10 条）", color=GREEN)

# 6月 vs 7月 评分分布对比
add_text(s, Inches(0.55), Inches(3.6), Inches(12.2), Inches(0.4),
         "评分分布对比（系统已录入的实际评分）", size=13, bold=True, color=FOREST2, name=ZH)

# 简表：6月 + 7月 分数段人数
dist_data = [
    ("≥ 4.5  优秀", 4, 3, FOREST, GREEN),
    ("4.0–4.49  良好", 6, 0, FOREST2, None),
    ("3.6–3.99  达标", 2, 5, ORANGE, ORANGE),
    ("< 3.6  待改进", 0, 2, None, RED),
]
# 表头
add_rect(s, Inches(0.55), Inches(4.1), Inches(2.8), Inches(0.4), FOREST)
add_rect(s, Inches(3.35), Inches(4.1), Inches(1.2), Inches(0.4), FOREST)
add_rect(s, Inches(4.55), Inches(4.1), Inches(1.2), Inches(0.4), FOREST)
add_rect(s, Inches(5.75), Inches(4.1), Inches(1.2), Inches(0.4), FOREST)
add_text(s, Inches(0.6), Inches(4.1), Inches(2.7), Inches(0.4), "分数段", size=11, bold=True, color=WHITE, anchor=MSO_ANCHOR.MIDDLE, name=ZH)
add_text(s, Inches(3.35), Inches(4.1), Inches(1.2), Inches(0.4), "6月人数", size=11, bold=True, color=WHITE, align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE, name=ZH)
add_text(s, Inches(4.55), Inches(4.1), Inches(1.2), Inches(0.4), "7月人数", size=11, bold=True, color=WHITE, align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE, name=ZH)
add_text(s, Inches(5.75), Inches(4.1), Inches(1.2), Inches(0.4), "变化", size=11, bold=True, color=WHITE, align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE, name=ZH)

# 简单条形可视化（用 5 个 0.2 宽小方块表示 5 人满）
for i, (label, n6, n7, _, c7) in enumerate(dist_data):
    y = Inches(4.5 + i * 0.45)
    bg = WHITE if i % 2 == 0 else BEIGE
    add_rect(s, Inches(0.55), y, Inches(6.4), Inches(0.42), bg)
    add_text(s, Inches(0.65), y, Inches(2.7), Inches(0.42), label, size=11, color=INK, anchor=MSO_ANCHOR.MIDDLE, name=ZH)
    add_text(s, Inches(3.35), y, Inches(1.2), Inches(0.42), f"{n6}", size=12, bold=True, color=INK, align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE, name=NUM)
    add_text(s, Inches(4.55), y, Inches(1.2), Inches(0.42), f"{n7}", size=12, bold=True, color=(c7 or INK), align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE, name=NUM)
    delta = n7 - n6
    arrow = "↑" if delta > 0 else ("↓" if delta < 0 else "—")
    add_text(s, Inches(5.75), y, Inches(1.2), Inches(0.42), f"{arrow} {abs(delta):+d}", size=11, bold=True,
             color=(GREEN if delta > 0 else (RED if delta < 0 else MUTED)), align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE, name=NUM)

# 右侧：核心观察
add_rect(s, Inches(7.3), Inches(4.1), Inches(5.5), Inches(2.95), BEIGE)
add_rect(s, Inches(7.3), Inches(4.1), Inches(5.5), Inches(0.42), FOREST)
add_text(s, Inches(7.4), Inches(4.1), Inches(5.4), Inches(0.42),
         "关键观察", size=12, bold=True, color=WHITE, anchor=MSO_ANCHOR.MIDDLE, name=ZH)
obs = [
    ("• 7月高分段（≥4.5）从 4 → 3，整体水平略有回落"),
    ("• 7月 5人集中在 3.6 达标线，构成中坚层"),
    ("• 7月出现 2 人低于 3.6（杨子豪 3.4、王龙宇 3.6），6月全员 ≥4.0"),
    ("• 工时支持单项全员普遍 4.0+，出勤稳定"),
    ("• 销售业绩两极分化加剧：Top 3 中 2 人 ≥4.0"),
]
for i, t in enumerate(obs):
    add_text(s, Inches(7.45), Inches(4.6 + i * 0.42), Inches(5.3), Inches(0.4),
             t, size=10.5, color=INK, name=ZH)

footer(s, 2)

# ---------- Slide 3 7月 Top 3 ----------
s = prs.slides.add_slide(BLANK)
add_rect(s, 0, 0, SW, SH, BEIGE)
title_bar(s, "02", "7月 Top 3 · 重点奖励", "综合分 ≥ 4.1 / 5.0，全部获 ¥60/h 顶档时薪")

# 3 张卡片
card_w = Inches(4.05); card_h = Inches(4.7)
card_y = Inches(1.55)
positions = [Inches(0.55), Inches(4.65), Inches(8.75)]
for (name, score, rank, salary_tag, score_breakdown, tags, comment), x in zip(TOP3, positions):
    # 卡片
    add_rect(s, x, card_y, card_w, card_h, WHITE)
    # 顶部色带（按名次配色）
    bar_color = GOLD if rank == "MVP" else (RGBColor(0xC0, 0xC0, 0xC0) if rank == "亚军" else RGBColor(0xCD, 0x7F, 0x32))
    add_rect(s, x, card_y, card_w, Inches(0.55), bar_color)
    # 名次徽章
    medal_badge(s, x + Inches(0.25), card_y + Inches(0.1), Inches(0.85), Inches(0.35), rank)
    # 姓名
    add_text(s, x + Inches(1.25), card_y + Inches(0.1), card_w - Inches(1.4), Inches(0.4),
             name, size=18, bold=True, color=WHITE, anchor=MSO_ANCHOR.MIDDLE, name=ZH)
    # 综合分
    add_text(s, x + Inches(0.3), card_y + Inches(0.75), card_w - Inches(0.6), Inches(0.9),
             f"{score:.1f}", size=44, bold=True, color=bar_color, align=PP_ALIGN.CENTER, name=NUM)
    add_text(s, x + Inches(0.3), card_y + Inches(1.65), card_w - Inches(0.6), Inches(0.3),
             f"/ 5.0   ·   {salary_tag}", size=10, color=MUTED, align=PP_ALIGN.CENTER, name=ZH)
    # 5 维细分
    add_rect(s, x + Inches(0.3), card_y + Inches(2.05), card_w - Inches(0.6), Inches(0.02), GRAY)
    add_text(s, x + Inches(0.3), card_y + Inches(2.15), card_w - Inches(0.6), Inches(0.3),
             "5维评分", size=10, bold=True, color=FOREST, name=ZH)
    add_text(s, x + Inches(0.3), card_y + Inches(2.45), card_w - Inches(0.6), Inches(0.9),
             score_breakdown, size=10, color=INK, name=ZH, line_spacing=1.4)
    # 标签
    add_text(s, x + Inches(0.3), card_y + Inches(3.35), card_w - Inches(0.6), Inches(0.3),
             "🏅 " + tags, size=10, color=ORANGE, name=ZH)
    # 评语
    add_rect(s, x + Inches(0.3), card_y + Inches(3.7), card_w - Inches(0.6), Inches(0.85), BEIGE)
    add_text(s, x + Inches(0.45), card_y + Inches(3.7), card_w - Inches(0.9), Inches(0.85),
             f"\u201C{comment}\u201D", size=10.5, color=FOREST,
             anchor=MSO_ANCHOR.MIDDLE, name=ZH)

# 底部综合建议
add_rect(s, Inches(0.55), Inches(6.4), Inches(12.2), Inches(0.65), FOREST)
add_runs(s, Inches(0.7), Inches(6.4), Inches(12), Inches(0.65),
         [("建议：", 12, True, GOLD, ZH),
          ("三人季度奖金一档（MVP +20% / 亚军 +10% / 季军 +5%）；保留 Service Team 资格；",
           12, False, WHITE, ZH),
          ("王雅澜+龚赟昊可考虑晋升后备管理岗。", 12, True, ORANGE2, ZH)],
         anchor=MSO_ANCHOR.MIDDLE)
footer(s, 3)

# ---------- Slide 4 7月 不达标 ----------
s = prs.slides.add_slide(BLANK)
add_rect(s, 0, 0, SW, SH, WHITE)
title_bar(s, "03", "7月 不达标人员（已排除 4 名新入职）", "排除范围：贾长乐 / 玛依拉 / 梁实秋 / 唐蓉（7月新入职，无可比口径）")

# 顶部说明条
add_rect(s, Inches(0.55), Inches(1.5), Inches(12.2), Inches(0.6), BEIGE)
add_runs(s, Inches(0.7), Inches(1.5), Inches(12), Inches(0.6),
         [("口径：", 11, True, FOREST, ZH),
          ("系统 7月 评分 < 3.6 或 =3.6 但有明确短板。3.6 一档共 5 人并列（田佳乐/迟骋/王靳毓/王龙宇/玛依拉），",
           10.5, False, INK, ZH),
          ("排除玛依拉后取 王龙宇 + 任意一 3.6 并列，", 10.5, True, ORANGE, ZH),
          ("此处按系统排名顺位展示杨子豪 3.4 / 王龙宇 3.6 / 田佳乐 3.6。", 10.5, False, INK, ZH)],
         anchor=MSO_ANCHOR.MIDDLE)

# 3 张分析卡
card_w = Inches(4.05); card_h = Inches(4.3)
card_y = Inches(2.3)
positions = [Inches(0.55), Inches(4.65), Inches(8.75)]
for i, ((name, score, salary_tag, score_breakdown, tags, analysis), x) in enumerate(zip(BOTTOM3, positions)):
    # 卡片
    add_rect(s, x, card_y, card_w, card_h, BEIGE)
    add_rect(s, x, card_y, Inches(0.15), card_h, RED)  # 警示红侧条
    # 排名 #N
    add_text(s, x + Inches(0.3), card_y + Inches(0.2), Inches(1.5), Inches(0.4),
             f"# {10+i}", size=20, bold=True, color=RED, name=NUM)
    # 姓名
    add_text(s, x + Inches(0.3), card_y + Inches(0.65), card_w - Inches(0.6), Inches(0.5),
             name, size=22, bold=True, color=FOREST, name=ZH)
    # 分数 + 时薪
    add_runs(s, x + Inches(0.3), card_y + Inches(1.15), card_w - Inches(0.6), Inches(0.5),
             [(f"{score:.1f}", 28, True, RED, NUM),
              (" / 5.0", 14, False, MUTED, NUM),
              (f"   {salary_tag}", 11, False, FOREST, ZH)])
    # 5维细分
    add_rect(s, x + Inches(0.3), card_y + Inches(1.7), card_w - Inches(0.6), Inches(0.02), GRAY)
    add_text(s, x + Inches(0.3), card_y + Inches(1.78), card_w - Inches(0.6), Inches(0.3),
             "5维评分", size=10, bold=True, color=FOREST, name=ZH)
    add_text(s, x + Inches(0.3), card_y + Inches(2.05), card_w - Inches(0.6), Inches(0.7),
             score_breakdown, size=9.5, color=INK, name=ZH, line_spacing=1.35)
    # 标签
    add_text(s, x + Inches(0.3), card_y + Inches(2.75), card_w - Inches(0.6), Inches(0.3),
             "🏷 " + tags, size=9.5, color=ORANGE, name=ZH)
    # 分析
    add_text(s, x + Inches(0.3), card_y + Inches(3.1), card_w - Inches(0.6), Inches(0.3),
             "关键短板", size=10, bold=True, color=RED, name=ZH)
    add_text(s, x + Inches(0.3), card_y + Inches(3.4), card_w - Inches(0.6), Inches(0.85),
             analysis, size=10, color=INK, name=ZH, line_spacing=1.4)

# 底部建议
add_rect(s, Inches(0.55), Inches(6.4), Inches(12.2), Inches(0.65), RED)
add_runs(s, Inches(0.7), Inches(6.4), Inches(12), Inches(0.65),
         [("建议：", 12, True, GOLD, ZH),
          ("杨子豪 时薪降至 ¥28/h（销售业绩 1.0 严重不达标），下月达标可恢复；",
           11.5, False, WHITE, ZH),
          ("王龙宇 需增加店务/门迎排班释放销售短板；田佳乐 考勤扣分需关注。", 11.5, True, ORANGE2, ZH)],
         anchor=MSO_ANCHOR.MIDDLE)
footer(s, 4)

# ---------- Slide 5 6+7月 持续低分 ----------
s = prs.slides.add_slide(BLANK)
add_rect(s, 0, 0, SW, SH, BEIGE)
title_bar(s, "04", "6+7月 持续低分（两月均值）", "排除范围：贾长乐 / 玛依拉 / 梁实秋 / 唐蓉 / 李若彤（离职）/ 陈昕媛（转正）")

# 顶部说明
add_rect(s, Inches(0.55), Inches(1.5), Inches(12.2), Inches(0.6), BEIGE)
add_runs(s, Inches(0.7), Inches(1.5), Inches(12), Inches(0.6),
         [("口径：", 11, True, FOREST, ZH),
          ("取 6月(系统) + 7月(截图) 综合分算术平均，按升序展示。",
           10.5, False, INK, ZH),
          ("陈昕媛 6月第一(4.90)但 7月起转正，不参与排名；李若彤 7/29 离职，6月数据(4.70)已无对照意义。",
           10.5, True, ORANGE, ZH)],
         anchor=MSO_ANCHOR.MIDDLE)

# 大表
table_x = Inches(0.55); table_y = Inches(2.25)
col_w = [Inches(2.0), Inches(2.0), Inches(2.0), Inches(2.0), Inches(4.2)]
headers = ["姓名", "6月", "7月", "两月均值", "关键判断"]
# 表头
add_rect(s, table_x, table_y, Inches(12.2), Inches(0.5), FOREST)
cx = table_x
for i, (h, w) in enumerate(zip(headers, col_w)):
    align = PP_ALIGN.CENTER if i > 0 else PP_ALIGN.LEFT
    add_text(s, cx + Inches(0.1), table_y, w - Inches(0.2), Inches(0.5),
             h, size=12, bold=True, color=WHITE, align=align, anchor=MSO_ANCHOR.MIDDLE, name=ZH)
    cx += w

# 顶部 3 行：低分 3 人（高亮）
LOW3_NAMES = {x[0] for x in LOW3_67}
low3_lookup = {x[0]: x for x in LOW3_67}

# 全员 11 人（排除 6 人后）
ALL_ELIG = [(n, JUN[n], JUL.get(n)) for n in JUN if n not in EXCL_67 and n in JUL]
ALL_ELIG.sort(key=lambda x: (x[1] + (x[2] or 0)) / 2)
row_h = Inches(0.36)
for i, (n, j6, j7) in enumerate(ALL_ELIG):
    y = table_y + Inches(0.5) + i * row_h
    avg = (j6 + j7) / 2
    is_low = n in LOW3_NAMES
    bg = RED if is_low else (WHITE if i % 2 == 0 else BEIGE)
    add_rect(s, table_x, y, Inches(12.2), row_h, bg)
    # 姓名
    name_color = WHITE if is_low else INK
    add_text(s, table_x + Inches(0.1), y, col_w[0] - Inches(0.2), row_h,
             ("⚠ " if is_low else "") + n, size=11, bold=is_low, color=name_color,
             anchor=MSO_ANCHOR.MIDDLE, name=ZH)
    # 6月
    add_text(s, table_x + col_w[0], y, col_w[1], row_h,
             f"{j6:.2f}", size=11, color=name_color,
             align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE, name=NUM)
    # 7月
    j7_color = WHITE if is_low else INK
    add_text(s, table_x + col_w[0] + col_w[1], y, col_w[2], row_h,
             f"{j7:.2f}", size=11, color=j7_color,
             align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE, name=NUM)
    # 均值
    add_text(s, table_x + col_w[0] + col_w[1] + col_w[2], y, col_w[3], row_h,
             f"{avg:.2f}", size=12, bold=True, color=name_color,
             align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE, name=NUM)
    # 关键判断
    note = ""
    if n == "田佳乐":
        note = "6月4.00→7月3.60 下滑；考勤扣分明显"
    elif n == "王龙宇":
        note = "6月4.20→7月3.60 持续走低；销售/工时双弱"
    elif n == "杨子豪":
        note = "6月4.50→7月3.40 大幅下滑；销售断崖"
    elif n == "迟骋":
        note = "6月4.50→7月3.60；销售 1.5 是主要拉分项"
    elif n == "王靳毓":
        note = "6月4.40→7月3.60；好评 2.5 偏低"
    else:
        note = "两月稳定达标"
    add_text(s, table_x + col_w[0] + col_w[1] + col_w[2] + col_w[3] + Inches(0.1), y,
             col_w[4] - Inches(0.2), row_h,
             note, size=10, color=name_color,
             anchor=MSO_ANCHOR.MIDDLE, name=ZH)

# 底部建议
add_rect(s, Inches(0.55), Inches(6.4), Inches(12.2), Inches(0.65), RED)
add_runs(s, Inches(0.7), Inches(6.4), Inches(12), Inches(0.65),
         [("建议：", 12, True, GOLD, ZH),
          ("田佳乐/王龙宇/杨子豪 三人下月重点观察；", 11.5, False, WHITE, ZH),
          ("其中杨子豪 两月连降 1.10 分（最严重），建议 1 对 1 沟通是否适合 Service Team。", 11.5, True, ORANGE2, ZH)],
         anchor=MSO_ANCHOR.MIDDLE)
footer(s, 5)

# ---------- Slide 6 数据说明 ----------
s = prs.slides.add_slide(BLANK)
add_rect(s, 0, 0, SW, SH, WHITE)
title_bar(s, "05", "数据说明 & 后续动作", "本次复盘的口径边界与下一步建议")

# 左：数据说明
add_rect(s, Inches(0.55), Inches(1.55), Inches(6.0), Inches(5.4), BEIGE)
add_rect(s, Inches(0.55), Inches(1.55), Inches(6.0), Inches(0.5), FOREST)
add_text(s, Inches(0.7), Inches(1.55), Inches(5.7), Inches(0.5),
         "数据来源 & 口径", size=13, bold=True, color=WHITE, anchor=MSO_ANCHOR.MIDDLE, name=ZH)
notes = [
    "• 6月评分：取自线上系统 8/3 导出（13人，含综合分+5维）",
    "• 7月评分：取自系统实时截图（9人，其余8人系统未录入）",
    "• 工时：仅 Service Team 17 人 = 2,440h（不含仓库/管理）",
    "• 销售额：¥189,182（17人7月合计；xlsx 仅6/1-6/10 不做6/7环比）",
    "• 排除口径：",
    "    — 7月新入职 4 人（贾/玛/梁/唐）：无可比6月数据",
    "    — 6+7月再排除 李若彤（7/29 离职）+ 陈昕媛（7月起转正）",
    "• 系统 7月 5维评分是依据实测数据的真实结果",
    "• 6+7月均值 = (6月综合分 + 7月综合分) / 2",
]
for i, t in enumerate(notes):
    add_text(s, Inches(0.7), Inches(2.2 + i * 0.42), Inches(5.7), Inches(0.4),
             t, size=10.5, color=INK, name=ZH, line_spacing=1.2)

# 右：后续动作
add_rect(s, Inches(6.75), Inches(1.55), Inches(6.05), Inches(5.4), BEIGE)
add_rect(s, Inches(6.75), Inches(1.55), Inches(6.05), Inches(0.5), ORANGE)
add_text(s, Inches(6.9), Inches(1.55), Inches(5.7), Inches(0.5),
         "建议后续动作", size=13, bold=True, color=WHITE, anchor=MSO_ANCHOR.MIDDLE, name=ZH)
actions = [
    ("① 奖金定档", "Top 3 季度奖 +20% / +10% / +5%；杨子豪 7月时薪 ¥60→¥28"),
    ("② 人员去留", "陈昕媛（转正）保留；李若彤（离职）走正式流程；")
    ,
    ("③ 重点观察", "田佳乐/王龙宇/杨子豪 下月持续监控；杨子豪 1对1沟通"),
    ("④ 排班优化", "王龙宇增加店务/门迎释放；Top 3 维持现有出勤铁人状态"),
    ("⑤ 系统完善", "补录剩余 8 人 7月评分（朱凯赟/邓奇缘/何秋烨等）以做全量排名"),
    ("⑥ 复盘节奏", "建议季度末再做一次完整 5维评分，避免仅靠 7月 单一截图"),
]
for i, (head, body) in enumerate(actions):
    y = Inches(2.25 + i * 0.78)
    add_text(s, Inches(6.9), y, Inches(5.7), Inches(0.3),
             head, size=11, bold=True, color=FOREST, name=ZH)
    add_text(s, Inches(6.9), y + Inches(0.3), Inches(5.7), Inches(0.45),
             body, size=10, color=INK, name=ZH, line_spacing=1.3)

footer(s, 6)

# ============ Save ============
out = "Service Team 7月复盘.pptx"
prs.save(out)
print(f"saved: {out}  slides={len(prs.slides._sldIdLst)}  size={os.path.getsize(out)/1024:.1f}KB")
