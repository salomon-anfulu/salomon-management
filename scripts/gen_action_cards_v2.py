#!/usr/bin/env python3
"""
Salomon 安福路 Service Team - 昨日复盘 + 今日行动卡生成器
"""

import json
from PIL import Image, ImageDraw, ImageFont

# === 配置 ===
FONT_BOLD = "/System/Library/Fonts/PingFang.ttc"
FONT_MEDIUM = "/System/Library/Fonts/STHeiti Medium.ttc"
FONT_LIGHT = "/System/Library/Fonts/STHeiti Light.ttc"
FONT_UNICODE = "/Library/Fonts/Arial Unicode.ttf"
OUTPUT_DIR = "/Users/a86137/Desktop/兼职/安福路兼职管理系统/output/action_cards"

# 品牌色
DARK_BG = (15, 23, 42)
CARD_BG = (30, 41, 59)
RED = (239, 68, 68)
BLUE = (59, 130, 246)
GREEN = (34, 197, 94)
AMBER = (251, 191, 36)
WHITE = (248, 250, 252)
GRAY = (148, 163, 184)
DIM = (100, 116, 139)
BORDER = (51, 65, 85)

# 用 reviews 文件的数据
REVIEW = {
    "date": "2026.06.17 周三",
    "workers": ["孔祥宇", "王靳毓", "杨子豪", "王龙宇", "田佳乐"],
    "door_schedule": [
        ("10:00-11:00", "孔祥宇"), ("11:00-12:00", "王靳毓"),
        ("12:00-13:00", "杨子豪"), ("13:00-14:00", "王龙宇"),
        ("14:00-15:00", "田佳乐"), ("16:00-17:00", "王靳毓"),
        ("17:00-18:00", "杨子豪"), ("18:00-19:00", "王龙宇"),
        ("19:00-20:00", "田佳乐"),
    ],
    "attendance": [
        ("孔祥宇", "10:00-18:30", "8h", "正常"),
        ("杨子豪", "11:30-20:30", "8.5h", "正常"),
        ("王靳毓", "10:30-19:00", "8h", "正常"),
        ("王龙宇", "12:15-21:00", "8h", "正常"),
        ("田佳乐", "13:00-21:30", "8h", "正常"),
    ],
    "store_support": [("田佳乐", "陈列-翻场支援", "1h")],
    "stats": {
        "total_hours": 40.5,
        "door_slots": 9,
        "avg_work_hours": 8.1,
    }
}

CARD_W, CARD_H = 1080, 1350


def get_font(size, ft="medium"):
    d = {"bold": FONT_BOLD, "medium": FONT_MEDIUM, "light": FONT_LIGHT, "unicode": FONT_UNICODE}
    try:
        return ImageFont.truetype(d.get(ft, FONT_MEDIUM), size)
    except:
        return ImageFont.truetype(FONT_UNICODE, size)


def draw_rect(draw, xy, r, fill=None, outline=None, w=1):
    draw.rounded_rectangle(xy, radius=r, fill=fill, outline=outline, width=w)


def draw_pbar(draw, x, y, w, h, pct, color):
    draw_rect(draw, [x, y, x+w, y+h], h//2, fill=BORDER)
    fw = max(h, int(w * pct / 100))
    draw_rect(draw, [x, y, x+fw, y+h], h//2, fill=color)


def add_bg_glow(img, color=RED):
    overlay = Image.new('RGBA', (CARD_W, CARD_H), (0, 0, 0, 0))
    for r in range(300, 0, -5):
        a = int(12 * (1 - r / 300))
        ImageDraw.Draw(overlay).ellipse([CARD_W//2 - r, -r//2, CARD_W//2 + r, r//2], fill=(*color, a))
    return Image.alpha_composite(img, overlay)


def wrap(text, font, max_w, draw):
    lines = []
    cur = ""
    for ch in text:
        test = cur + ch
        w = draw.textbbox((0, 0), test, font=font)[2]
        if w > max_w and cur:
            lines.append(cur); cur = ch
        else:
            cur = test
    if cur: lines.append(cur)
    return lines


# ============ YESTERDAY REVIEW CARD ============
def generate_review_card():
    img = Image.new('RGBA', (CARD_W, CARD_H), DARK_BG)
    img = add_bg_glow(img, BLUE)
    draw = ImageDraw.Draw(img)

    # Header
    y = 60
    draw.text((60, y), "SALOMON", fill=RED, font=get_font(16, "bold"))
    draw.text((60, y+22), "安福路 L140 · Service Team", fill=GRAY, font=get_font(13, "medium"))
    draw.text((CARD_W-280, y+5), REVIEW['date'], fill=GRAY, font=get_font(14, "medium"))
    draw.text((CARD_W-280, y+28), "昨日复盘 Review", fill=DIM, font=get_font(12, "light"))
    draw.line([(60, y+55), (CARD_W-60, y+55)], fill=BORDER, width=1)

    # 出勤概览
    y = 140
    draw.text((60, y), "出勤概览", fill=WHITE, font=get_font(22, "bold"))
    draw.text((60, y+30), "Attendance Summary", fill=DIM, font=get_font(12, "light"))

    # 人数卡片
    stat_blocks = [
        (f"{len(REVIEW['workers'])}人", "出勤人数", GREEN),
        (f"{REVIEW['stats']['total_hours']}h", "总工时", BLUE),
        (f"{REVIEW['stats']['avg_work_hours']}h", "平均工时", AMBER),
        (f"{REVIEW['stats']['door_slots']}个", "门迎时段", WHITE),
    ]
    bw = (CARD_W - 120 - 60) // 4
    sy = y + 55
    for i, (val, label, color) in enumerate(stat_blocks):
        bx = 60 + i * (bw + 20)
        draw_rect(draw, [bx, sy, bx+bw, sy+85], 12, fill=CARD_BG, outline=BORDER)
        draw.text((bx+16, sy+14), label, fill=GRAY, font=get_font(11, "medium"))
        draw.text((bx+16, sy+36), val, fill=color, font=get_font(22, "bold"))

    # 考勤表
    att_y = sy + 120
    draw.text((60, att_y), "考勤记录", fill=WHITE, font=get_font(18, "bold"))
    draw.text((60, att_y+26), "Clock-in Records", fill=DIM, font=get_font(11, "light"))

    # 表头
    header_y = att_y + 55
    cols = [(60, 80, "姓名"), (160, 180, "打卡时段"), (360, 100, "工时"), (470, 80, "状态")]
    draw_rect(draw, [60, header_y, CARD_W-60, header_y+36], 8, fill=CARD_BG)
    cx = 60
    for x, w, label in cols:
        draw.text((x+12, header_y+8), label, fill=GRAY, font=get_font(12, "bold"))
    
    for i, (name, time_range, hours, status) in enumerate(REVIEW['attendance']):
        row_y = header_y + 44 + i * 48
        row_bg = CARD_BG if i % 2 == 0 else DARK_BG
        draw_rect(draw, [60, row_y, CARD_W-60, row_y+42], 6, fill=row_bg)
        stat_color = GREEN if status == "正常" else RED
        draw.text((72, row_y+8), name, fill=WHITE, font=get_font(15, "bold"))
        draw.text((172, row_y+8), time_range, fill=GRAY, font=get_font(14, "medium"))
        draw.text((372, row_y+8), hours, fill=BLUE, font=get_font(14, "bold"))
        draw.text((482, row_y+8), status, fill=stat_color, font=get_font(14, "bold"))

    # 门迎排班
    door_y = header_y + 44 + len(REVIEW['attendance']) * 48 + 30
    draw.text((60, door_y), "门迎排班", fill=WHITE, font=get_font(18, "bold"))
    draw.text((60, door_y+26), "Door Greeting Schedule", fill=DIM, font=get_font(11, "light"))

    # 时间轴
    tl_y = door_y + 60
    tl_h = 36
    tl_x = 120
    tl_w = CARD_W - 120 - 120
    
    # 时间轴基线
    draw.line([(tl_x, tl_y+tl_h//2), (tl_x+tl_w, tl_y+tl_h//2)], fill=BORDER, width=3)
    
    # 标记每个时段
    time_slots = ["10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00"]
    slot_staff = {}
    for t, s in REVIEW['door_schedule']:
        hour = t.split(":")[0]
        slot_staff[hour] = s

    staff_colors = {s: color for s, color in zip(
        ['孔祥宇','王靳毓','杨子豪','王龙宇','田佳乐'],
        [(59,130,246), (168,85,247), (34,197,94), (251,191,36), (239,68,68)]
    )}

    for i, ts in enumerate(time_slots):
        px = tl_x + int(tl_w * i / (len(time_slots)-1))
        is_staffed = ts in slot_staff
        
        if is_staffed:
            draw.ellipse([px-8, tl_y+tl_h//2-8, px+8, tl_y+tl_h//2+8], fill=staff_colors[slot_staff[ts]])
            draw.text((px-15, tl_y+tl_h//2+14), slot_staff[ts], fill=WHITE, font=get_font(9, "bold"))
        else:
            draw.ellipse([px-5, tl_y+tl_h//2-5, px+5, tl_y+tl_h//2+5], fill=DIM)
        
        draw.text((px-12, tl_y+tl_h-2), f"{ts}:00", fill=GRAY, font=get_font(9, "light"))

    # 店务支援
    sup_y = tl_y + tl_h + 60
    draw.text((60, sup_y), "店务支援", fill=WHITE, font=get_font(18, "bold"))
    draw.text((60, sup_y+26), "Store Support", fill=DIM, font=get_font(11, "light"))
    
    if REVIEW['store_support']:
        for i, (staff, stype, dur) in enumerate(REVIEW['store_support']):
            draw_rect(draw, [80, sup_y+45, CARD_W-80, sup_y+45+40], 10, fill=CARD_BG)
            draw.text((100, sup_y+51), f"{staff} | {stype}", fill=WHITE, font=get_font(14, "bold"))
            draw.text((700, sup_y+51), dur, fill=BLUE, font=get_font(14, "bold"))
    else:
        draw.text((80, sup_y+50), "昨日无店务支援记录", fill=DIM, font=get_font(13, "medium"))

    # 小结
    summary_y = CARD_H - 250
    draw.line([(60, summary_y), (CARD_W-60, summary_y)], fill=BORDER, width=1)
    draw.text((60, summary_y+10), "昨日小结", fill=WHITE, font=get_font(18, "bold"))
    
    summary_items = [
        ("✅", "5人全勤，考勤全部正常，无迟到/缺卡/旷工", GREEN),
        ("✅", "门迎9个时段100%覆盖，王靳毓/杨子豪/王龙宇/田佳乐各2次", GREEN),
        ("✅", "田佳乐额外完成1小时陈列翻场支援", GREEN),
        ("📌", "今日建议延续昨日排班结构，关注王龙宇(时产¥93/h)/田佳乐(时产¥57/h)业绩提升", AMBER),
    ]
    for i, (icon, text, color) in enumerate(summary_items):
        sy2 = summary_y + 40 + i * 34
        draw.text((60, sy2), icon, fill=color, font=get_font(14, "bold"))
        draw.text((90, sy2+1), text, fill=GRAY, font=get_font(14, "medium"))

    # Footer
    draw.line([(60, CARD_H-50), (CARD_W-60, CARD_H-50)], fill=BORDER, width=1)
    draw.text((60, CARD_H-35), "SALOMON 安福路 L140", fill=DIM, font=get_font(11, "medium"))
    draw.text((CARD_W-250, CARD_H-35), "Yesterday Review Card", fill=DIM, font=get_font(11, "light"))

    path = f"{OUTPUT_DIR}/昨日复盘_0617.png"
    img.convert('RGB').save(path, 'PNG', quality=95, optimize=True)
    print(f"  ✓ {path}")


def get_perf_color(hourly):
    if hourly >= 300: return GREEN
    if hourly >= 150: return BLUE
    if hourly >= 100: return AMBER
    return RED


# ============ INDIVIDUAL ACTION CARD ============
def generate_action_card(data):
    img = Image.new('RGBA', (CARD_W, CARD_H), DARK_BG)
    img = add_bg_glow(img)
    draw = ImageDraw.Draw(img)

    y = 60
    draw.text((60, y), "SALOMON", fill=RED, font=get_font(16, "bold"))
    draw.text((60, y+22), "安福路 L140 · Service Team", fill=GRAY, font=get_font(13, "medium"))
    draw.text((CARD_W-240, y+5), "2026.06.18 周四", fill=GRAY, font=get_font(14, "medium"))
    draw.text((CARD_W-240, y+28), "每日行动卡 Action", fill=DIM, font=get_font(12, "light"))
    draw.line([(60, y+55), (CARD_W-60, y+55)], fill=BORDER, width=1)

    # Name section
    name_y = 130
    pinyin = {'孔祥宇':'KONG Xiangyu','王靳毓':'WANG Jinyu','杨子豪':'YANG Zihao',
              '王龙宇':'WANG Longyu','田佳乐':'TIAN Jiale','陈昕媛':'CHEN Xinyuan',
              '邓奇缘':'DENG Qiyuan','龚赟昊':'GONG Yunhao'}
    draw.text((60, name_y), data['name'], fill=WHITE, font=get_font(38, "bold"))
    draw.text((60, name_y+50), pinyin.get(data['name'],''), fill=DIM, font=get_font(15, "medium"))

    # Big hourly output number
    pcolor = get_perf_color(data['hourly'])
    mx = CARD_W - 280
    draw.text((mx, name_y-5), f"¥{data['hourly']}", fill=pcolor, font=get_font(48, "bold"))
    draw.text((mx, name_y+48), "时产/小时", fill=GRAY, font=get_font(13, "medium"))

    # Efficiency badge
    eff = data['eff']
    if eff > 0.1:
        eff_txt, ecolor = f"↑ {eff:.0%}", GREEN
    elif eff < -0.1:
        eff_txt, ecolor = f"↓ {abs(eff):.0%}", RED
    else:
        eff_txt, ecolor = f"— {abs(eff):.0%}", GRAY
    ef = get_font(18, "bold")
    ew = draw.textbbox((0,0), eff_txt, font=ef)[2] + 20
    ey = name_y + 75
    draw_rect(draw, [mx, ey, mx+ew, ey+28], 14, fill=(*ecolor, 30))
    draw_rect(draw, [mx, ey, mx+ew, ey+28], 14, outline=ecolor)
    draw.text((mx+10, ey+3), eff_txt, fill=ecolor, font=ef)

    # 3 metric blocks
    dy = 230
    bw = (CARD_W - 120 - 40) // 3
    blocks = [
        ("6月销售额", f"¥{data['sales']:,}", BLUE),
        ("门迎次数", f"{data['doorCount']}次", AMBER),
        ("工时", f"{data['workHours']}h/{data['workDays']}天", WHITE),
    ]
    for i, (label, val, color) in enumerate(blocks):
        bx = 60 + i*(bw+20)
        draw_rect(draw, [bx, dy, bx+bw, dy+100], 12, fill=CARD_BG, outline=BORDER)
        draw.text((bx+16, dy+14), label, fill=GRAY, font=get_font(12, "medium"))
        draw.text((bx+16, dy+42), val, fill=color, font=get_font(22, "bold"))

    # Category breakdown
    cat_y = 360
    draw.text((60, cat_y), "品类结构", fill=WHITE, font=get_font(16, "bold"))
    
    # Category bar
    bx = 60
    bar_w = CARD_W - 120
    bar_y = cat_y + 40
    shoe, cloth, acc = data['shoePct'], data['clothPct'], data['accPct']
    
    cats = [(shoe, (59,130,246), f"鞋履 {shoe:.0f}%"), 
            (cloth, (168,85,247), f"服装 {cloth:.0f}%"), 
            (acc, (251,191,36), f"配件 {acc:.0f}%")]
    
    cx_pos = bx
    gap = 4
    for pct, color, label in cats:
        if pct <= 0: continue
        seg_w = int((bar_w - gap * 2) * pct / 100)
        draw_rect(draw, [cx_pos, bar_y, cx_pos+seg_w, bar_y+20], 4, fill=color)
        cx_pos += seg_w + gap
    
    # Legend
    lx = 60
    ly = bar_y + 38
    for pct, color, label in cats:
        draw_rect(draw, [lx, ly, lx+10, ly+10], 3, fill=color)
        draw.text((lx+16, ly-2), label, fill=GRAY, font=get_font(12, "medium"))
        lx += draw.textbbox((0,0), label+"  ", font=get_font(12, "medium"))[2] + 20

    # === 3 Action Dimensions ===
    action_y = 480
    actions = [
        ("📋 导览 · 门迎", "Customer Guide", AMBER, data['actions']['door']),
        ("💰 业绩 · 销售", "Sales Performance", GREEN, data['actions']['sales']),
        ("📚 产品 · 知识", "Product Knowledge", BLUE, data['actions']['knowledge']),
    ]

    for i, (title, sub, color, items) in enumerate(actions):
        ay = action_y + i * 230
        draw_rect(draw, [50, ay, CARD_W-50, ay+210], 16, fill=CARD_BG, outline=BORDER)
        # Left accent bar
        draw_rect(draw, [50, ay, 56, ay+210], 4, fill=color)
        
        draw.text((80, ay+16), title, fill=WHITE, font=get_font(17, "bold"))
        draw.text((80, ay+42), sub, fill=DIM, font=get_font(11, "light"))
        
        item_y = ay + 70
        for item in items[:3]:
            lines = wrap(item, get_font(13, "medium"), CARD_W - 170, draw)
            for line in lines[:2]:
                draw.ellipse([88, item_y+6, 94, item_y+12], fill=color)
                draw.text((106, item_y), line, fill=WHITE, font=get_font(13, "medium"))
                item_y += 24
            item_y += 6

    # Footer
    draw.line([(60, CARD_H-50), (CARD_W-60, CARD_H-50)], fill=BORDER, width=1)
    draw.text((60, CARD_H-35), "SALOMON 安福路 L140", fill=DIM, font=get_font(11, "medium"))
    draw.text((CARD_W-300, CARD_H-35), "Service Team Daily Action Card", fill=DIM, font=get_font(11, "light"))

    path = f"{OUTPUT_DIR}/今日行动卡_{data['name']}.png"
    img.convert('RGB').save(path, 'PNG', quality=95, optimize=True)
    print(f"  ✓ {path}")


# ============ TEAM OVERVIEW CARD ============
def generate_summary_card(all_data):
    img = Image.new('RGBA', (CARD_W, CARD_H), DARK_BG)
    img = add_bg_glow(img, BLUE)
    draw = ImageDraw.Draw(img)

    y = 60
    draw.text((60, y), "SALOMON", fill=RED, font=get_font(16, "bold"))
    draw.text((60, y+22), "安福路 L140 · Service Team", fill=GRAY, font=get_font(13, "medium"))
    draw.text((60, 135), "今日行动总览", fill=WHITE, font=get_font(36, "bold"))
    draw.text((60, 185), "Team Action Overview · 2026.06.18 周四", fill=GRAY, font=get_font(14, "medium"))

    # Stats
    total_sales = sum(d['sales'] for d in all_data)
    avg_hourly = sum(d['hourly'] for d in all_data) / len(all_data)
    total_door = sum(d['doorCount'] for d in all_data)

    stats = [
        (str(len(all_data)), "今日预估出勤", BLUE),
        (f"¥{total_sales:,}", "团队6月销售额", GREEN),
        (f"¥{avg_hourly:.0f}", "平均时产/h", AMBER),
        (str(total_door), "门迎总次数", WHITE),
    ]
    sy = 230
    bw = (CARD_W - 120 - 60) // 4
    for i, (val, label, color) in enumerate(stats):
        bx = 60 + i*(bw+20)
        draw_rect(draw, [bx, sy, bx+bw, sy+90], 12, fill=CARD_BG, outline=BORDER)
        draw.text((bx+14, sy+16), label, fill=GRAY, font=get_font(11, "medium"))
        draw.text((bx+14, sy+38), val, fill=color, font=get_font(22, "bold"))

    # Ranking
    ry = 360
    draw.text((60, ry), "时产排行", fill=WHITE, font=get_font(20, "bold"))
    draw.text((60, ry+28), "Hourly Output Ranking", fill=DIM, font=get_font(12, "light"))

    sorted_data = sorted(all_data, key=lambda x: x['hourly'], reverse=True)
    max_h = max(d['hourly'] for d in sorted_data)

    for i, d in enumerate(sorted_data):
        rr = ry + 65 + i * 62
        pc = get_perf_color(d['hourly'])
        rank_c = [AMBER, GRAY, (205,127,50)][i] if i < 3 else DIM
        draw.text((60, rr), f"#{i+1}", fill=rank_c, font=get_font(22, "bold"))
        draw.text((120, rr), d['name'], fill=WHITE, font=get_font(17, "bold"))
        
        # Bar
        draw_pbar(draw, 220, rr+8, 480, 10, d['hourly']/max_h*100, pc)
        draw.text((710, rr-2), f"¥{d['hourly']}/h", fill=pc, font=get_font(16, "bold"))
        
        cat_txt = f"鞋{d['shoePct']:.0f}% 服{d['clothPct']:.0f}% 配{d['accPct']:.0f}%"
        draw.text((120, rr+30), cat_txt, fill=DIM, font=get_font(11, "medium"))

    # Key actions
    ky = 920
    draw.line([(60, ky-20), (CARD_W-60, ky-20)], fill=BORDER, width=1)
    draw.text((60, ky), "今日重点 Action", fill=WHITE, font=get_font(18, "bold"))

    items = [
        ("门迎", "全队配件占比偏低，午间10分钟配件推销快训", AMBER),
        ("辅导", "时产<¥100/h: 王靳毓/田佳乐/王龙宇/邓奇缘 一对一关注", RED),
        ("排班", "杨子豪时产¥329/h全队最高，建议增加排班时段", GREEN),
    ]
    for i, (tag, text, color) in enumerate(items):
        iy = ky + 35 + i * 45
        tw = draw.textbbox((0,0), tag, font=get_font(12, "bold"))[2] + 18
        draw_rect(draw, [60, iy, 60+tw, iy+24], 12, fill=(*color, 30))
        draw.text((69, iy+4), tag, fill=color, font=get_font(12, "bold"))
        draw.text((60+tw+14, iy+3), text, fill=WHITE, font=get_font(14, "medium"))

    # Footer
    draw.line([(60, CARD_H-50), (CARD_W-60, CARD_H-50)], fill=BORDER, width=1)
    draw.text((60, CARD_H-35), "SALOMON 安福路 L140", fill=DIM, font=get_font(11, "medium"))
    draw.text((CARD_W-300, CARD_H-35), "Team Daily Action Overview", fill=DIM, font=get_font(11, "light"))

    path = f"{OUTPUT_DIR}/今日行动卡_团队总览.png"
    img.convert('RGB').save(path, 'PNG', quality=95, optimize=True)
    print(f"  ✓ {path}")


def main():
    with open('/tmp/today_actions.json', 'r', encoding='utf-8') as f:
        all_data = json.load(f)

    print(f"共 {len(all_data)} 人\n")

    # 1. 昨日复盘卡
    print("生成昨日复盘卡...")
    generate_review_card()

    # 2. 个人行动卡
    print(f"\n生成 {len(all_data)} 张个人行动卡...")
    for d in all_data:
        generate_action_card(d)

    # 3. 团队总览卡
    print("\n生成团队总览卡...")
    generate_summary_card(all_data)

    print(f"\n完成！共 {2 + len(all_data)} 张卡")
    print(f"输出目录: {OUTPUT_DIR}/")


if __name__ == '__main__':
    main()
