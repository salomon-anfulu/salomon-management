#!/usr/bin/env python3
"""Generate updated ratings block for app.js based on new june performance data."""
import json

with open('/Users/a86137/Desktop/兼职/安福路兼职管理系统/data/june_perf_40.json', 'r', encoding='utf-8') as f:
    perf = json.load(f)

# Map name -> perf data
perf_map = {r['name']: r for r in perf['records']}

# Staff ID -> Name mapping
STAFF_MAP = {
    1: '陈昕媛', 2: '田佳乐', 3: '迟骋', 4: '王靳毓', 5: '朱凯赟',
    6: '孔祥宇', 7: '邓奇缘', 8: '杨子豪', 9: '王雅澜', 10: '李若彤',
    11: '王龙宇', 12: '何秋烨', 13: '龚赟昊',
}

# Read current ratings to preserve non-performance fields
import re

with open('/Users/a86137/Desktop/兼职/安福路兼职管理系统/js/app.js', 'r', encoding='utf-8') as f:
    code = f.read()

# Extract current ratings block
ratings_start = code.find('ratings: [')
ratings_end = code.find('\n    ],', ratings_start) + len('\n    ],')
ratings_block = code[ratings_start:ratings_end]

# Current rating data (from reading app.js earlier)
# Format: { staffId: { availability, behavior, attendance, customerReview, door_count, late, ... } }
CURRENT = {
    1:  {'avail': 5, 'beh': 5, 'att': 5, 'cr': 5, 'door': 17, 'late': 0, 'days': 11, 'hours': 90},  # 陈昕媛
    2:  {'avail': 5, 'beh': 5, 'att': 4, 'cr': 4, 'door': 18, 'late': 0, 'days': 10, 'hours': 70},  # 田佳乐
    3:  {'avail': 5, 'beh': 5, 'att': 4, 'cr': 5, 'door': 0, 'late': 1, 'days': 9, 'hours': 62},     # 迟骋
    4:  {'avail': 5, 'beh': 5, 'att': 4, 'cr': 4, 'door': 14, 'late': 1, 'days': 7, 'hours': 58},    # 王靳毓
    5:  {'avail': 5, 'beh': 5, 'att': 5, 'cr': 5, 'door': 11, 'late': 0, 'days': 8, 'hours': 58},    # 朱凯赟
    6:  {'avail': 5, 'beh': 5, 'att': 5, 'cr': 4, 'door': 18, 'late': 0, 'days': 11, 'hours': 78},   # 孔祥宇
    7:  {'avail': 5, 'beh': 5, 'att': 5, 'cr': 4, 'door': 18, 'late': 0, 'days': 10, 'hours': 83},   # 邓奇缘
    8:  {'avail': 5, 'beh': 4, 'att': 5, 'cr': 4, 'door': 10, 'late': 0, 'days': 7, 'hours': 61},    # 杨子豪
    9:  {'avail': 5, 'beh': 5, 'att': 5, 'cr': 4, 'door': 14, 'late': 0, 'days': 9, 'hours': 61},    # 王雅澜
    10: {'avail': 5, 'beh': 5, 'att': 4, 'cr': 4, 'door': 18, 'late': 1, 'days': 10, 'hours': 82},   # 李若彤
    11: {'avail': 5, 'beh': 5, 'att': 5, 'cr': 4, 'door': 14, 'late': 0, 'days': 8, 'hours': 58},    # 王龙宇
    12: {'avail': 5, 'beh': 5, 'att': 5, 'cr': 4, 'door': 14, 'late': 0, 'days': 8, 'hours': 50},    # 何秋烨
    13: {'avail': 5, 'beh': 5, 'att': 5, 'cr': 4, 'door': 12, 'late': 0, 'days': 7, 'hours': 54},    # 龚赟昊
}

def perf_score(ho):
    if ho >= 300: return 5
    if ho >= 210: return 4
    if ho >= 150: return 3
    if ho >= 100: return 2
    return 1

# Build new ratings block
lines = ['ratings: [']

for sid in range(1, 14):
    name = STAFF_MAP[sid]
    c = CURRENT[sid]
    p = perf_map.get(name, {})
    
    sales = p.get('sales', 0)
    qty = p.get('qty', 0)
    tickets = p.get('tickets', 0)
    ho = p.get('hourlyOutput', 0)
    hours = p.get('workHours', c['hours'])
    days = p.get('workDays', c['days'])
    cats = p.get('categories', {})
    
    ps = perf_score(ho)
    
    # Build category string
    cat_parts = []
    for cn in ['鞋履', '服装', '配件', '其他']:
        if cn in cats and cats[cn]['sales'] > 0:
            cat_parts.append(f"{cn}{cats[cn]['pct']}%")
    cat_str = ' / '.join(cat_parts) if cat_parts else ''
    
    # Build comment
    comment_parts = [f"6月{days}天出勤{hours:.0f}h"]
    if c['late'] > 0:
        comment_parts.append(f"迟到{c['late']}次")
    if c['door'] > 0:
        comment_parts.append(f"门迎{c['door']}次")
    else:
        comment_parts.append("未排门迎")
    comment_parts.append(f"销售¥{sales:,}时产¥{ho}/h")
    if cat_str:
        comment_parts.append(f"品类({cat_str})")
    if c['cr'] == 5:
        # Count reviews
        review_counts = {1:1, 3:3, 5:2}  # 陈昕媛:1, 迟骋:3, 朱凯赟:2
        rc = review_counts.get(sid, 0)
        if rc > 0:
            comment_parts.append(f"大众点评好评{rc}条")
    
    comment = '，'.join(comment_parts)
    
    # Calculate avg and hourly rate
    avg = round((c['avail'] + ps + c['beh'] + c['att'] + c['cr']) / 5, 1)
    hourly_rate = 60 if avg >= 4.0 else 28
    
    lines.append('    {')
    lines.append(f'      "id": {sid},')
    lines.append(f'      "staffId": {sid},')
    lines.append(f'      "month": "2026-06",')
    lines.append(f'      "scores": {{')
    lines.append(f'        "availability": {c["avail"]},')
    lines.append(f'        "performance": {ps},')
    lines.append(f'        "behavior": {c["beh"]},')
    lines.append(f'        "attendance": {c["att"]},')
    lines.append(f'        "customerReview": {c["cr"]}')
    lines.append(f'      }},')
    lines.append(f'      "comment": "{comment}",')
    lines.append(f'      "avgScore": {avg},')
    lines.append(f'      "hourlyRate": {hourly_rate}')
    lines.append(f'    }},')

# Fix trailing comma on last entry
lines[-1] = lines[-1].rstrip(',')

lines.append('    ],')

new_ratings = '\n'.join(lines)

print("=== NEW RATINGS ===")
for sid in range(1, 14):
    name = STAFF_MAP[sid]
    c = CURRENT[sid]
    p = perf_map.get(name, {})
    ho = p.get('hourlyOutput', 0)
    ps = perf_score(ho)
    avg = round((c['avail'] + ps + c['beh'] + c['att'] + c['cr']) / 5, 1)
    hr = 60 if avg >= 4.0 else 28
    print(f"  {name:>6} (id:{sid:>2}): perf={ps} (时产¥{ho}) avg={avg} rate=¥{hr}")

# Write to file
with open('/Users/a86137/Desktop/兼职/安福路兼职管理系统/data/ratings_block_v15.js', 'w', encoding='utf-8') as f:
    f.write(new_ratings)
print(f"\nSaved ratings block to data/ratings_block_v15.js")
