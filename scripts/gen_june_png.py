#!/usr/bin/env python3
"""Generate June performance review PNG (excluding 玛依拉 and 唐蓉)"""
import json
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
import numpy as np

# Load data
with open('/Users/a86137/Desktop/兼职/安福路兼职管理系统/scripts/june_scores_data.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# Filter valid entries
people = [p for p in data if 'avg' in p]
print(f"Total people: {len(people)}")

# Color scheme
BG_DARK = '#0f172a'
CARD_BG = '#1e293b'
ACCENT = '#3b82f6'
GOLD = '#f59e0b'
GREEN = '#10b981'
RED = '#ef4444'
PURPLE = '#8b5cf6'
TEXT_LIGHT = '#f1f5f9'
TEXT_DIM = '#94a3b8'
BORDER = '#334155'

# Score colors
def score_color(score):
    if score >= 4.0:
        return GREEN
    elif score >= 3.6:
        return GOLD
    elif score >= 2.5:
        return '#fb923c'
    else:
        return RED

dims = ['availability', 'performance', 'behavior', 'attendance', 'customerReview']
dim_labels = ['工时支持', '销售业绩', '行为规范', '考勤纪律', '顾客好评']
dim_colors = ['#3b82f6', '#f59e0b', '#8b5cf6', '#10b981', '#ec4899']

# Create figure
n = len(people)
# Layout: 4 columns
cols = 4
rows = (n + cols - 1) // cols  # ceil

fig_w = 20
fig_h = max(14, rows * 6.5 + 3)
fig = plt.figure(figsize=(fig_w, fig_h), facecolor=BG_DARK)

# Title
fig.text(0.5, 0.965, 'SALOMON 安福路旗舰店', fontsize=28, fontweight='bold',
         color=TEXT_LIGHT, ha='center', va='top',
         family=['Arial Unicode MS', 'PingFang SC', 'Microsoft YaHei', 'SimHei', 'sans-serif'])
fig.text(0.5, 0.935, '2026年6月 兼职团队表现评分报告', fontsize=20,
         color=GOLD, ha='center', va='top',
         family=['Arial Unicode MS', 'PingFang SC', 'Microsoft YaHei', 'SimHei', 'sans-serif'])
fig.text(0.5, 0.912, f'共 {n} 人  |  评分维度：工时支持 / 销售业绩 / 行为规范 / 考勤纪律 / 顾客好评  |  门槛线：综合 ≥3.6 → ¥60/h',
         fontsize=11, color=TEXT_DIM, ha='center', va='top',
         family=['Arial Unicode MS', 'PingFang SC', 'Microsoft YaHei', 'SimHei', 'sans-serif'])

# Create card axes
card_w = 0.22
card_h = 0.25
gap_x = (1 - cols * card_w) / (cols + 1)
gap_y = 0.015
top_margin = 0.88

for idx, person in enumerate(people):
    col = idx % cols
    row = idx // cols

    x = gap_x + col * (card_w + gap_x)
    y = top_margin - card_h - row * (card_h + gap_y)

    # Card background
    ax_card = fig.add_axes([x, y, card_w, card_h])
    ax_card.set_xlim(0, 10)
    ax_card.set_ylim(0, 10)
    ax_card.set_facecolor(CARD_BG)
    ax_card.spines['top'].set_color(BORDER)
    ax_card.spines['bottom'].set_color(BORDER)
    ax_card.spines['left'].set_color(BORDER)
    ax_card.spines['right'].set_color(BORDER)
    ax_card.set_xticks([])
    ax_card.set_yticks([])

    # Name + avg score header
    avg = person['avg']
    avg_color = score_color(avg)

    # Tier badge
    rating = person.get('rating', {})
    tier = rating.get('tier', '')
    tier_colors = {'tier-s': '#fbbf24', 'tier-a': '#60a5fa', 'tier-b': '#34d399', 'tier-c': '#94a3b8'}
    tier_bg = tier_colors.get(tier, BORDER)

    # Name
    ax_card.text(0.5, 9.3, person['name'], fontsize=16, fontweight='bold',
                 color=TEXT_LIGHT, va='center',
                 family=['Arial Unicode MS', 'PingFang SC', 'Microsoft YaHei', 'SimHei', 'sans-serif'])

    # Rating title
    title_text = f"{rating.get('title', '')}"
    ax_card.text(0.5, 8.3, title_text, fontsize=10,
                 color=tier_bg, va='center',
                 family=['Arial Unicode MS', 'PingFang SC', 'Microsoft YaHei', 'SimHei', 'sans-serif'])

    # Avg score - big number
    ax_card.text(9.5, 9.0, f'{avg:.1f}', fontsize=32, fontweight='bold',
                 color=avg_color, ha='right', va='center',
                 family=['Arial', 'sans-serif'])
    ax_card.text(9.5, 7.8, '综合均分', fontsize=8,
                 color=TEXT_DIM, ha='right', va='center',
                 family=['Arial Unicode MS', 'PingFang SC', 'Microsoft YaHei', 'SimHei', 'sans-serif'])

    # Separator line
    ax_card.plot([0.3, 9.7], [7.6, 7.6], color=BORDER, linewidth=0.8)

    # Dimension bars
    scores = [person[d] for d in dims]
    bar_y_start = 6.8
    bar_h = 0.7
    bar_gap = 0.25
    bar_max_w = 6.5

    for i, (label, score, dcolor) in enumerate(zip(dim_labels, scores, dim_colors)):
        by = bar_y_start - i * (bar_h + bar_gap)

        # Color dot indicator
        ax_card.plot(0.5, by + bar_h/2, 'o', markersize=5, color=dcolor)

        # Label
        ax_card.text(1.0, by + bar_h/2, label, fontsize=8.5,
                     color=TEXT_LIGHT, va='center',
                     family=['Arial Unicode MS', 'PingFang SC', 'Microsoft YaHei', 'SimHei', 'sans-serif'])

        # Score number
        ax_card.text(7.5, by + bar_h/2, f'{score:.1f}', fontsize=10, fontweight='bold',
                     color=score_color(score), va='center', ha='right',
                     family=['Arial', 'sans-serif'])

        # Bar background
        bar_bg = mpatches.FancyBboxPatch(
            (2.8, by), bar_max_w, bar_h * 0.6,
            boxstyle="round,pad=0.02",
            facecolor='#334155', edgecolor='none'
        )
        ax_card.add_patch(bar_bg)

        # Bar fill
        fill_w = bar_max_w * (score / 5.0)
        if fill_w > 0.01:
            bar_fill = mpatches.FancyBboxPatch(
                (2.8, by), fill_w, bar_h * 0.6,
                boxstyle="round,pad=0.02",
                facecolor=score_color(score), edgecolor='none'
            )
            ax_card.add_patch(bar_fill)

    # Bottom: hourly rate badge
    rate = '¥60/h' if avg >= 3.6 else '¥28/h'
    rate_color = GREEN if avg >= 3.6 else '#94a3b8'
    ax_card.text(5, 0.8, rate, fontsize=13, fontweight='bold',
                 color=rate_color, ha='center', va='center',
                 family=['Arial', 'sans-serif'])

    # Key stats
    perf = person.get('raw', {}).get('performance', {})
    beh = person.get('raw', {}).get('behavior', {})
    att = person.get('raw', {}).get('attendance', {})

    stats_parts = []
    if 'sales' in perf:
        stats_parts.append(f"¥{perf['sales']:,.0f}")
    if 'hourly' in perf:
        stats_parts.append(f"{perf['hourly']:.0f}/h")
    if 'upt' in perf:
        stats_parts.append(f"UPT {perf['upt']:.2f}")

    if stats_parts:
        ax_card.text(5, 2.0, '  |  '.join(stats_parts), fontsize=7.5,
                     color=TEXT_DIM, ha='center', va='center',
                     family=['Arial Unicode MS', 'PingFang SC', 'Microsoft YaHei', 'SimHei', 'sans-serif'])

# Footer
fig.text(0.5, 0.025, '注：玛依拉、唐蓉 7月正式加入 Service Team，不计入6月评分报告  |  生成时间：2026-07-17',
         fontsize=9, color=TEXT_DIM, ha='center', va='bottom',
         family=['Arial Unicode MS', 'PingFang SC', 'Microsoft YaHei', 'SimHei', 'sans-serif'])

# Save
out_path = '/Users/a86137/Desktop/兼职/安福路兼职管理系统/6月表现评分报告.png'
fig.savefig(out_path, dpi=150, facecolor=BG_DARK, bbox_inches='tight', pad_inches=0.3)
plt.close()

print(f'\n[OK] Saved to {out_path}')
