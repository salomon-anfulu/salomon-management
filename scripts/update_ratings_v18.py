#!/usr/bin/env python3
"""Generate updated ratings block for v18 based on Excel(42) performance data."""
import json

with open('/Users/a86137/Desktop/兼职/安福路兼职管理系统/data/june_perf_42.json', 'r', encoding='utf-8') as f:
    perf = json.load(f)

# staffId -> name mapping
STAFF = {
    1: '陈昕媛', 2: '田佳乐', 3: '迟骋', 4: '王靳毓', 5: '朱凯赟',
    6: '孔祥宇', 7: '邓奇缘', 8: '杨子豪', 9: '王雅澜', 10: '李若彤',
    11: '王龙宇', 12: '何秋烨', 13: '龚赟昊',
}

# Build perf lookup by name
perf_by_name = {r['name']: r for r in perf['records']}

# Door count from current data (from v17 staffStats)
DOOR_COUNT = {
    '陈昕媛': 17, '田佳乐': 18, '迟骋': 0, '王靳毓': 16, '朱凯赟': 18,
    '孔祥宇': 18, '邓奇缘': 18, '杨子豪': 11, '王雅澜': 13, '李若彤': 17,
    '王龙宇': 0, '何秋烨': 17, '龚赟昊': 13,
}

# Attendance issues from linggong
ATTENDANCE_NOTES = {
    '迟骋': '迟到1次，',
    '李若彤': '迟到1次，',
}

# Customer review counts
REVIEW_COUNTS = {
    '陈昕媛': 1, '迟骋': 4, '朱凯赟': 2, '李若彤': 1, '何秋烨': 0,
}

# Existing scores (availability, behavior, attendance, customerReview) - keep these
# Only update performance
EXISTING = {
    1: {'avail': 5, 'behav': 5, 'att': 5, 'cr': 5},   # 陈昕媛
    2: {'avail': 5, 'behav': 5, 'att': 5, 'cr': 4},   # 田佳乐
    3: {'avail': 5, 'behav': 5, 'att': 4, 'cr': 5},   # 迟骋
    4: {'avail': 5, 'behav': 5, 'att': 4, 'cr': 4},   # 王靳毓
    5: {'avail': 5, 'behav': 5, 'att': 5, 'cr': 5},   # 朱凯赟
    6: {'avail': 5, 'behav': 5, 'att': 5, 'cr': 4},   # 孔祥宇
    7: {'avail': 5, 'behav': 5, 'att': 5, 'cr': 4},   # 邓奇缘
    8: {'avail': 5, 'behav': 5, 'att': 5, 'cr': 4},   # 杨子豪
    9: {'avail': 5, 'behav': 5, 'att': 5, 'cr': 4},   # 王雅澜
    10: {'avail': 5, 'behav': 5, 'att': 4, 'cr': 5},  # 李若彤
    11: {'avail': 5, 'behav': 5, 'att': 5, 'cr': 4},  # 王龙宇
    12: {'avail': 5, 'behav': 5, 'att': 5, 'cr': 4},  # 何秋烨
    13: {'avail': 5, 'behav': 5, 'att': 5, 'cr': 4},  # 龚赟昊
}

def perf_score(ho):
    if ho >= 300: return 5
    elif ho >= 210: return 4
    elif ho >= 150: return 3
    elif ho >= 100: return 2
    else: return 1

def build_comment(name, p, door_count):
    cats_str = ' / '.join(f"{k} {v['pct']}%" for k, v in p['categories'].items())
    att_note = ATTENDANCE_NOTES.get(name, '')
    door_str = f"门迎{door_count}次，" if door_count > 0 else "未排门迎，"
    review_str = f"，大众点评好评{REVIEW_COUNTS.get(name, 0)}条" if REVIEW_COUNTS.get(name, 0) > 0 else ""
    return f"6月{p['workDays']}天出勤{p['workHours']:.0f}h，{att_note}{door_str}销售¥{p['sales']:,}时产¥{p['hourlyOutput']}/h，品类({cats_str}){review_str}"

# Generate ratings array
lines = ['    ratings: [']
for sid in range(1, 14):
    name = STAFF[sid]
    p = perf_by_name[name]
    e = EXISTING[sid]
    ps = perf_score(p['hourlyOutput'])
    avg = round((e['avail'] + ps + e['behav'] + e['att'] + e['cr']) / 5, 1)
    hr = 60 if avg >= 4.0 else 28
    comment = build_comment(name, p, DOOR_COUNT.get(name, 0))
    
    lines.append('    {')
    lines.append(f'      "id": {sid},')
    lines.append(f'      "staffId": {sid},')
    lines.append(f'      "month": "2026-06",')
    lines.append(f'      "scores": {{')
    lines.append(f'        "availability": {e["avail"]},')
    lines.append(f'        "performance": {ps},')
    lines.append(f'        "behavior": {e["behav"]},')
    lines.append(f'        "attendance": {e["att"]},')
    lines.append(f'        "customerReview": {e["cr"]}')
    lines.append(f'      }},')
    lines.append(f'      "comment": "{comment}",')
    lines.append(f'      "avgScore": {avg},')
    lines.append(f'      "hourlyRate": {hr}')
    lines.append(f'    }}{"," if sid < 13 else ""}')
lines.append('    ],')

js_block = '\n'.join(lines)

with open('/Users/a86137/Desktop/兼职/安福路兼职管理系统/data/ratings_v18.js', 'w', encoding='utf-8') as f:
    f.write(js_block)

print("Generated ratings block")
print(f"\n{'Name':<8} {'Perf':>4} {'Avg':>4} {'Rate':>5} {'Hourly':>7} {'Sales':>8}")
for sid in range(1, 14):
    name = STAFF[sid]
    p = perf_by_name[name]
    e = EXISTING[sid]
    ps = perf_score(p['hourlyOutput'])
    avg = round((e['avail'] + ps + e['behav'] + e['att'] + e['cr']) / 5, 1)
    hr = 60 if avg >= 4.0 else 28
    print(f"{name:<8} {ps:>4} {avg:>4} {'¥'+str(hr):>5} ¥{p['hourlyOutput']:>6} ¥{p['sales']:>7,}")
