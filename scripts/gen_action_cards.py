#!/usr/bin/env python3
"""
Salomon 安福路 Service Team - 每日行动卡生成器
生成精美的 PNG 行动卡，涵盖导览/业绩/产品知识三维度
"""

import json
import math
from PIL import Image, ImageDraw, ImageFont, ImageFilter

# === 配置 ===
FONT_BOLD = "/System/Library/Fonts/PingFang.ttc"
FONT_MEDIUM = "/System/Library/Fonts/STHeiti Medium.ttc"
FONT_LIGHT = "/System/Library/Fonts/STHeiti Light.ttc"
FONT_UNICODE = "/Library/Fonts/Arial Unicode.ttf"

OUTPUT_DIR = "/Users/a86137/Desktop/兼职/安福路兼职管理系统/output/action_cards"

# Salomon 品牌色
COLOR_BG_DARK = (15, 23, 42)       # #0F172A 深蓝背景
COLOR_BG_CARD = (30, 41, 59)       # #1E293B 卡片底色
COLOR_ACCENT = (239, 68, 68)       # #EF4444 Salomon 红
COLOR_ACCENT_BLUE = (59, 130, 246) # #3B82F6 蓝
COLOR_ACCENT_GREEN = (34, 197, 94) # #22C55E 绿
COLOR_ACCENT_AMBER = (251, 191, 36) # #FBC02D 琥珀
COLOR_TEXT_WHITE = (248, 250, 252)  # #F8FAFC
COLOR_TEXT_GRAY = (148, 163, 184)   # #94A3B8
COLOR_TEXT_DIM = (100, 116, 139)    # #64748B
COLOR_CARD_BORDER = (51, 65, 85)    # #334155

# 卡片尺寸
CARD_W = 1080
CARD_H = 1350


def get_font(size, font_type="medium"):
    """获取字体"""
    paths = {
        "bold": FONT_BOLD,
        "medium": FONT_MEDIUM,
        "light": FONT_LIGHT,
        "unicode": FONT_UNICODE
    }
    try:
        return ImageFont.truetype(paths.get(font_type, FONT_MEDIUM), size)
    except Exception:
        return ImageFont.truetype(FONT_UNICODE, size)


def draw_rounded_rect(draw, xy, radius, fill=None, outline=None, width=1):
    """绘制圆角矩形"""
    draw.rounded_rectangle(xy, radius=radius, fill=fill, outline=outline, width=width)


def draw_glow_circle(draw, cx, cy, radius, color, alpha=30):
    """绘制发光圆环"""
    for i in range(radius, 0, -3):
        a = max(0, alpha - i)
        overlay_color = (*color[:3], a)
        # PIL doesn't support alpha in draw directly, use workaround
        draw.ellipse([cx-i, cy-i, cx+i, cy+i], outline=color, width=1)


def draw_progress_bar(draw, x, y, w, h, pct, color, bg_color=COLOR_CARD_BORDER):
    """绘制进度条"""
    # 背景
    draw_rounded_rect(draw, [x, y, x+w, y+h], radius=h//2, fill=bg_color)
    # 进度
    fill_w = max(h, int(w * pct / 100))
    draw_rounded_rect(draw, [x, y, x+fill_w, y+h], radius=h//2, fill=color)


def draw_ring_chart(img, cx, cy, outer_r, inner_r, segments, start_angle=-90):
    """绘制环形图表
    segments: [(pct, color), ...]
    """
    # 使用 ImageDraw 的 pieslice 和 ellipse 来创建环形
    draw = ImageDraw.Draw(img)
    
    # 背景环
    draw.ellipse([cx-outer_r, cy-outer_r, cx+outer_r, cy+outer_r], 
                 fill=(51, 65, 85, 100))
    
    current_angle = start_angle
    for pct, color in segments:
        if pct <= 0:
            continue
        arc_angle = 360 * pct / 100
        # 绘制扇形
        bbox = [cx-outer_r, cy-outer_r, cx+outer_r, cy+outer_r]
        draw.pieslice(bbox, current_angle, current_angle + arc_angle, fill=color)
        current_angle += arc_angle
    
    # 中心镂空
    draw.ellipse([cx-inner_r, cy-inner_r, cx+inner_r, cy+inner_r], 
                 fill=COLOR_BG_CARD)


def get_performance_color(hourly):
    """根据时产获取颜色"""
    if hourly >= 300:
        return COLOR_ACCENT_GREEN
    elif hourly >= 150:
        return COLOR_ACCENT_BLUE
    elif hourly >= 100:
        return COLOR_ACCENT_AMBER
    else:
        return COLOR_ACCENT


def get_efficiency_badge(eff):
    """效率变化标签"""
    if eff > 0.1:
        return f"↑ {eff:.0%}", COLOR_ACCENT_GREEN
    elif eff < -0.1:
        return f"↓ {abs(eff):.0%}", COLOR_ACCENT
    else:
        return f"— {abs(eff):.0%}", COLOR_TEXT_GRAY


def draw_category_bar(draw, x, y, w, h, shoe, cloth, acc):
    """绘制品类比例条"""
    total = shoe + cloth + acc
    if total == 0:
        total = 100
    
    colors = {
        'shoe': (59, 130, 246),    # 蓝
        'cloth': (168, 85, 247),   # 紫
        'acc': (251, 191, 36)      # 琥珀
    }
    
    gap = 2
    avail_w = w - gap * 2
    
    shoe_w = int(avail_w * shoe / 100)
    cloth_w = int(avail_w * cloth / 100)
    acc_w = avail_w - shoe_w - cloth_w
    
    cur_x = x
    if shoe_w > 0:
        draw_rounded_rect(draw, [cur_x, y, cur_x+shoe_w, y+h], radius=3, fill=colors['shoe'])
        cur_x += shoe_w + gap
    if cloth_w > 0:
        draw_rounded_rect(draw, [cur_x, y, cur_x+cloth_w, y+h], radius=3, fill=colors['cloth'])
        cur_x += cloth_w + gap
    if acc_w > 0:
        draw_rounded_rect(draw, [cur_x, y, cur_x+acc_w, y+h], radius=3, fill=colors['acc'])


def wrap_text(text, font, max_width, draw):
    """中文文本换行"""
    lines = []
    current_line = ""
    for char in text:
        test_line = current_line + char
        bbox = draw.textbbox((0, 0), test_line, font=font)
        if bbox[2] - bbox[0] > max_width and current_line:
            lines.append(current_line)
            current_line = char
        else:
            current_line = test_line
    if current_line:
        lines.append(current_line)
    return lines


def generate_card(data, output_path):
    """生成单人行动卡"""
    # 创建画布
    img = Image.new('RGBA', (CARD_W, CARD_H), COLOR_BG_DARK)
    draw = ImageDraw.Draw(img)
    
    # === 背景装饰 ===
    # 顶部渐变光晕
    overlay = Image.new('RGBA', (CARD_W, CARD_H), (0, 0, 0, 0))
    overlay_draw = ImageDraw.Draw(overlay)
    for r in range(300, 0, -5):
        alpha = int(15 * (1 - r / 300))
        overlay_draw.ellipse(
            [CARD_W//2 - r, -r//2, CARD_W//2 + r, r//2],
            fill=(*COLOR_ACCENT, alpha)
        )
    img = Image.alpha_composite(img, overlay)
    draw = ImageDraw.Draw(img)
    
    # === 头部区域 ===
    header_y = 50
    
    # Salomon 标识
    font_logo = get_font(16, "bold")
    font_date = get_font(14, "medium")
    
    draw.text((60, header_y), "SALOMON", fill=COLOR_ACCENT, font=font_logo)
    draw.text((60, header_y + 22), "安福路 L140 · Service Team", fill=COLOR_TEXT_GRAY, font=get_font(13, "medium"))
    draw.text((CARD_W - 220, header_y + 5), "2026.06.18 周四", fill=COLOR_TEXT_GRAY, font=font_date)
    draw.text((CARD_W - 220, header_y + 28), "每日行动卡 Daily Action", fill=COLOR_TEXT_DIM, font=get_font(12, "light"))
    
    # 分割线
    draw.line([(60, header_y + 55), (CARD_W - 60, header_y + 55)], fill=COLOR_CARD_BORDER, width=1)
    
    # === 姓名 + 关键指标区域 ===
    name_y = 130
    
    # 姓名
    font_name = get_font(42, "bold")
    font_name_en = get_font(16, "medium")
    draw.text((60, name_y), data['name'], fill=COLOR_TEXT_WHITE, font=font_name)
    
    # 英文拼音小标
    pinyin_map = {
        '孔祥宇': 'KONG Xiangyu', '王靳毓': 'WANG Jinyu', '杨子豪': 'YANG Zihao',
        '王龙宇': 'WANG Longyu', '田佳乐': 'TIAN Jiale', '陈昕媛': 'CHEN Xinyuan',
        '邓奇缘': 'DENG Qiyuan', '龚赟昊': 'GONG Yunhao'
    }
    draw.text((60, name_y + 55), pinyin_map.get(data['name'], ''), fill=COLOR_TEXT_DIM, font=font_name_en)
    
    # 时产指标 - 右侧大数字
    perf_color = get_performance_color(data['hourly'])
    font_big_num = get_font(48, "bold")
    font_label = get_font(13, "medium")
    
    metric_x = CARD_W - 280
    
    # 时产
    draw.text((metric_x, name_y - 5), f"¥{data['hourly']}", fill=perf_color, font=font_big_num)
    draw.text((metric_x, name_y + 48), "时产 /小时", fill=COLOR_TEXT_GRAY, font=font_label)
    
    # 效率变化
    eff_text, eff_color = get_efficiency_badge(data['eff'])
    font_eff = get_font(18, "bold")
    # 画一个胶囊背景
    eff_bbox = draw.textbbox((0, 0), eff_text, font=font_eff)
    eff_w = eff_bbox[2] - eff_bbox[0] + 20
    eff_y = name_y + 75
    draw_rounded_rect(draw, [metric_x, eff_y, metric_x + eff_w, eff_y + 28], radius=14, fill=(*eff_color, 40))
    draw_rounded_rect(draw, [metric_x, eff_y, metric_x + eff_w, eff_y + 28], radius=14, outline=eff_color, width=1)
    draw.text((metric_x + 10, eff_y + 3), eff_text, fill=eff_color, font=font_eff)
    
    # === 数据仪表盘区域 ===
    dash_y = 230
    dash_h = 110
    
    # 3个数据块
    block_w = (CARD_W - 120 - 40) // 3
    
    blocks = [
        ("6月销售额", f"¥{data['sales']:,}", COLOR_ACCENT_BLUE),
        ("门迎次数", f"{data['doorCount']}次", COLOR_ACCENT_AMBER),
        ("工时", f"{data['workHours']}h / {data['workDays']}天", COLOR_TEXT_WHITE),
    ]
    
    for i, (label, value, color) in enumerate(blocks):
        bx = 60 + i * (block_w + 20)
        # 卡片背景
        draw_rounded_rect(draw, [bx, dash_y, bx + block_w, dash_y + dash_h], radius=12,
                         fill=COLOR_BG_CARD, outline=COLOR_CARD_BORDER, width=1)
        
        draw.text((bx + 16, dash_y + 14), label, fill=COLOR_TEXT_GRAY, font=get_font(12, "medium"))
        draw.text((bx + 16, dash_y + 40), value, fill=color, font=get_font(24, "bold"))
    
    # === 品类结构环形图 ===
    cat_y = 370
    cat_h = 140
    
    # 区域标题
    draw.text((60, cat_y), "品类结构", fill=COLOR_TEXT_WHITE, font=get_font(16, "bold"))
    draw.text((60, cat_y + 22), "Product Category Mix", fill=COLOR_TEXT_DIM, font=get_font(11, "light"))
    
    # 环形图
    ring_cx = 130
    ring_cy = cat_y + 85
    ring_outer = 50
    ring_inner = 32
    
    shoe_pct = data['shoePct']
    cloth_pct = data['clothPct']
    acc_pct = data['accPct']
    
    segments = [
        (shoe_pct, (59, 130, 246)),
        (cloth_pct, (168, 85, 247)),
        (acc_pct, (251, 191, 36)),
    ]
    draw_ring_chart(img, ring_cx, ring_cy, ring_outer, ring_inner, segments)
    draw = ImageDraw.Draw(img)
    
    # 环中心数字
    center_text = f"{shoe_pct:.0f}%"
    draw.text((ring_cx - 22, ring_cy - 12), center_text, fill=COLOR_TEXT_WHITE, font=get_font(20, "bold"))
    draw.text((ring_cx - 18, ring_cy + 10), "鞋履", fill=COLOR_TEXT_GRAY, font=get_font(10, "medium"))
    
    # 右侧品类条 + 标签
    bar_x = 230
    bar_w = CARD_W - 60 - bar_x
    bar_y = cat_y + 45
    
    # 品类条
    draw_category_bar(draw, bar_x, bar_y, bar_w, 22, shoe_pct, cloth_pct, acc_pct)
    
    # 品类图例
    legend_y = bar_y + 38
    legends = [
        (f"鞋履 {shoe_pct:.0f}%", (59, 130, 246)),
        (f"服装 {cloth_pct:.0f}%", (168, 85, 247)),
        (f"配件 {acc_pct:.0f}%", (251, 191, 36)),
    ]
    leg_x = bar_x
    for text, color in legends:
        # 色块
        draw_rounded_rect(draw, [leg_x, legend_y, leg_x + 12, legend_y + 12], radius=3, fill=color)
        draw.text((leg_x + 18, legend_y - 2), text, fill=COLOR_TEXT_GRAY, font=get_font(13, "medium"))
        bbox = draw.textbbox((0, 0), text, font=get_font(13, "medium"))
        leg_x += bbox[2] - bbox[0] + 30
    
    # === 三个行动维度 ===
    action_y = 530
    action_h = 250
    
    actions_data = [
        {
            'icon': 'SHOP',
            'title': '导览 · 门迎',
            'subtitle': 'Customer Guide',
            'color': COLOR_ACCENT_AMBER,
            'items': data['actions']['door']
        },
        {
            'icon': 'CHF',
            'title': '业绩 · 销售',
            'subtitle': 'Sales Performance',
            'color': COLOR_ACCENT_GREEN,
            'items': data['actions']['sales']
        },
        {
            'icon': 'KBK',
            'title': '产品 · 知识',
            'subtitle': 'Product Knowledge',
            'color': COLOR_ACCENT_BLUE,
            'items': data['actions']['knowledge']
        }
    ]
    
    for i, act in enumerate(actions_data):
        ay = action_y + i * (action_h + 15) - i * 50  # 紧凑排列
        
        # 行动卡片背景
        card_top = ay
        card_bottom = ay + action_h - 50
        draw_rounded_rect(draw, [50, card_top, CARD_W - 50, card_bottom], radius=16,
                         fill=COLOR_BG_CARD, outline=COLOR_CARD_BORDER, width=1)
        
        # 左侧色条
        draw_rounded_rect(draw, [50, card_top, 56, card_bottom], radius=3, fill=act['color'])
        
        # 图标区域
        icon_x = 80
        icon_y = card_top + 18
        icon_size = 44
        
        # 图标背景圆
        draw.ellipse([icon_x, icon_y, icon_x + icon_size, icon_y + icon_size], 
                     fill=(*act['color'], 30))
        draw.ellipse([icon_x, icon_y, icon_x + icon_size, icon_y + icon_size],
                     outline=act['color'], width=2)
        # 图标文字
        font_icon = get_font(12, "bold")
        icon_bbox = draw.textbbox((0, 0), act['icon'], font=font_icon)
        icon_tx = icon_x + (icon_size - (icon_bbox[2] - icon_bbox[0])) // 2
        icon_ty = icon_y + (icon_size - (icon_bbox[3] - icon_bbox[1])) // 2
        draw.text((icon_tx, icon_ty), act['icon'], fill=act['color'], font=font_icon)
        
        # 标题
        draw.text((icon_x + icon_size + 16, icon_y + 2), act['title'], 
                  fill=COLOR_TEXT_WHITE, font=get_font(18, "bold"))
        draw.text((icon_x + icon_size + 16, icon_y + 26), act['subtitle'],
                  fill=COLOR_TEXT_DIM, font=get_font(11, "light"))
        
        # 行动项
        item_y = card_top + 75
        font_item = get_font(14, "medium")
        
        for item in act['items'][:3]:
            # 圆点
            draw.ellipse([90, item_y + 6, 96, item_y + 12], fill=act['color'])
            # 文字（自动换行）
            lines = wrap_text(item, font_item, CARD_W - 50 - 120 - 30, draw)
            for line in lines[:2]:  # 最多2行
                draw.text((108, item_y), line, fill=COLOR_TEXT_WHITE, font=font_item)
                item_y += 24
            item_y += 8
    
    # === 底部区域 ===
    footer_y = CARD_H - 60
    
    # 分割线
    draw.line([(60, footer_y - 10), (CARD_W - 60, footer_y - 10)], fill=COLOR_CARD_BORDER, width=1)
    
    # 底部信息
    draw.text((60, footer_y), "SALOMON 安福路 L140", fill=COLOR_TEXT_DIM, font=get_font(11, "medium"))
    draw.text((CARD_W - 280, footer_y), "Service Team Daily Action Card", fill=COLOR_TEXT_DIM, font=get_font(11, "light"))
    
    # 保存
    img = img.convert('RGB')
    img.save(output_path, 'PNG', quality=95, optimize=True)
    print(f"  ✓ {output_path}")


def generate_summary_card(all_data, output_path):
    """生成团队总览卡"""
    img = Image.new('RGBA', (CARD_W, CARD_H), COLOR_BG_DARK)
    draw = ImageDraw.Draw(img)
    
    # 顶部光晕
    overlay = Image.new('RGBA', (CARD_W, CARD_H), (0, 0, 0, 0))
    overlay_draw = ImageDraw.Draw(overlay)
    for r in range(400, 0, -5):
        alpha = int(12 * (1 - r / 400))
        overlay_draw.ellipse([CARD_W//2 - r, -100, CARD_W//2 + r, r//2], fill=(*COLOR_ACCENT_BLUE, alpha))
    img = Image.alpha_composite(img, overlay)
    draw = ImageDraw.Draw(img)
    
    # 标题
    draw.text((60, 60), "SALOMON", fill=COLOR_ACCENT, font=get_font(16, "bold"))
    draw.text((60, 85), "安福路 L140 · Service Team", fill=COLOR_TEXT_GRAY, font=get_font(13, "medium"))
    
    draw.text((60, 130), "今日团队行动总览", fill=COLOR_TEXT_WHITE, font=get_font(36, "bold"))
    draw.text((60, 180), "Team Action Overview · 2026.06.18 周四", fill=COLOR_TEXT_GRAY, font=get_font(14, "medium"))
    
    # 统计数字
    total_sales = sum(d['sales'] for d in all_data)
    avg_hourly = sum(d['hourly'] for d in all_data) / len(all_data)
    total_door = sum(d['doorCount'] for d in all_data)
    
    stats = [
        (f"{len(all_data)}", "今日出勤人数", COLOR_ACCENT_BLUE),
        (f"¥{total_sales:,}", "团队6月销售额", COLOR_ACCENT_GREEN),
        (f"¥{avg_hourly:.0f}", "平均时产/h", COLOR_ACCENT_AMBER),
        (f"{total_door}", "门迎总次数", COLOR_TEXT_WHITE),
    ]
    
    stat_y = 240
    block_w = (CARD_W - 120 - 60) // 4
    for i, (val, label, color) in enumerate(stats):
        bx = 60 + i * (block_w + 20)
        draw_rounded_rect(draw, [bx, stat_y, bx + block_w, stat_y + 90], radius=12,
                         fill=COLOR_BG_CARD, outline=COLOR_CARD_BORDER, width=1)
        draw.text((bx + 14, stat_y + 16), label, fill=COLOR_TEXT_GRAY, font=get_font(11, "medium"))
        draw.text((bx + 14, stat_y + 38), val, fill=color, font=get_font(22, "bold"))
    
    # 排行榜
    rank_y = 370
    draw.text((60, rank_y), "时产排行", fill=COLOR_TEXT_WHITE, font=get_font(20, "bold"))
    draw.text((60, rank_y + 28), "Hourly Output Ranking", fill=COLOR_TEXT_DIM, font=get_font(12, "light"))
    
    sorted_data = sorted(all_data, key=lambda x: x['hourly'], reverse=True)
    
    for i, d in enumerate(sorted_data):
        ry = rank_y + 65 + i * 70
        perf_color = get_performance_color(d['hourly'])
        
        # 排名
        rank_colors = [COLOR_ACCENT_AMBER, (192, 192, 192), (205, 127, 50)]
        rank_color = rank_colors[i] if i < 3 else COLOR_TEXT_DIM
        draw.text((60, ry), f"#{i+1}", fill=rank_color, font=get_font(22, "bold"))
        
        # 姓名
        draw.text((120, ry), d['name'], fill=COLOR_TEXT_WHITE, font=get_font(18, "bold"))
        
        # 进度条
        bar_x = 220
        bar_w = 500
        bar_h = 10
        bar_y = ry + 8
        max_hourly = max(d['hourly'] for d in sorted_data)
        pct = d['hourly'] / max_hourly * 100
        draw_progress_bar(draw, bar_x, bar_y, bar_w, bar_h, pct, perf_color)
        
        # 数值
        draw.text((bar_x + bar_w + 20, ry - 2), f"¥{d['hourly']}/h", fill=perf_color, font=get_font(18, "bold"))
        
        # 品类小标签
        cat_text = f"鞋{d['shoePct']:.0f}% 服{d['clothPct']:.0f}% 配{d['accPct']:.0f}%"
        draw.text((120, ry + 28), cat_text, fill=COLOR_TEXT_DIM, font=get_font(12, "medium"))
    
    # 今日重点 Action
    focus_y = 950
    draw.line([(60, focus_y - 20), (CARD_W - 60, focus_y - 20)], fill=COLOR_CARD_BORDER, width=1)
    draw.text((60, focus_y), "今日重点 Action Items", fill=COLOR_TEXT_WHITE, font=get_font(18, "bold"))
    
    actions = [
        ("门店", "全队配件占比偏低，午间组织10分钟配件推销话术快训", COLOR_ACCENT_AMBER),
        ("辅导", "时产<¥100/h的伙伴（田佳乐/王靳毓/王龙宇/邓奇缘）需一对一关注", COLOR_ACCENT),
        ("排班", "杨子豪时产¥329/h全队最高，建议增加排班拉高门店产出", COLOR_ACCENT_GREEN),
    ]
    
    for i, (tag, text, color) in enumerate(actions):
        ay = focus_y + 40 + i * 50
        # 标签胶囊
        tag_bbox = draw.textbbox((0, 0), tag, font=get_font(12, "bold"))
        tag_w = tag_bbox[2] - tag_bbox[0] + 20
        draw_rounded_rect(draw, [60, ay, 60 + tag_w, ay + 24], radius=12, fill=(*color, 40))
        draw.text((70, ay + 4), tag, fill=color, font=get_font(12, "bold"))
        # 描述
        lines = wrap_text(text, get_font(14, "medium"), CARD_W - 60 - tag_w - 110, draw)
        draw.text((60 + tag_w + 20, ay + 3), lines[0], fill=COLOR_TEXT_WHITE, font=get_font(14, "medium"))
    
    # 底部
    draw.line([(60, CARD_H - 50), (CARD_W - 60, CARD_H - 50)], fill=COLOR_CARD_BORDER, width=1)
    draw.text((60, CARD_H - 35), "SALOMON 安福路 L140", fill=COLOR_TEXT_DIM, font=get_font(11, "medium"))
    draw.text((CARD_W - 300, CARD_H - 35), "Team Daily Action Overview", fill=COLOR_TEXT_DIM, font=get_font(11, "light"))
    
    img = img.convert('RGB')
    img.save(output_path, 'PNG', quality=95, optimize=True)
    print(f"  ✓ {output_path}")


def main():
    with open('/tmp/today_actions.json', 'r', encoding='utf-8') as f:
        all_data = json.load(f)
    
    print(f"生成 {len(all_data)} 张个人行动卡 + 1 张团队总览卡...\n")
    
    # 个人卡
    for data in all_data:
        filename = f"action_card_{data['name']}.png"
        output_path = f"{OUTPUT_DIR}/{filename}"
        generate_card(data, output_path)
    
    # 团队总览卡
    generate_summary_card(all_data, f"{OUTPUT_DIR}/action_card_团队总览.png")
    
    print(f"\n完成！共生成 {len(all_data) + 1} 张行动卡")
    print(f"输出目录: {OUTPUT_DIR}/")


if __name__ == '__main__':
    main()
