#!/usr/bin/env python3
"""Generate updated ratings block v20 with latest performance data from june_perf_44.json"""
import json

with open('data/june_perf_44.json', 'r', encoding='utf-8') as f:
    perf_data = json.load(f)

# Build name -> perf lookup
perf_map = {r['name']: r for r in perf_data['records']}

# Staff mapping
staff_map = {
    1: '陈昕媛', 2: '田佳乐', 3: '迟骋', 4: '王靳毓', 5: '朱凯赟',
    6: '孔祥宇', 7: '邓奇缘', 8: '杨子豪', 9: '王雅澜', 10: '李若彤',
    11: '王龙宇', 12: '何秋烨', 13: '龚赟昊'
}

# Door counts (from PT doc, v19)
door_counts = {
    '陈昕媛': 18, '田佳乐': 17, '迟骋': 16, '王靳毓': 16, '朱凯赟': 15,
    '孔祥宇': 18, '邓奇缘': 20, '杨子豪': 11, '王雅澜': 13,
    '李若彤': 17, '王龙宇': 13, '何秋烨': 17, '龚赟昊': 16
}

# Late counts (from staffStats)
late_counts = {
    '陈昕媛': 0, '田佳乐': 0, '迟骋': 1, '王靳毓': 1, '朱凯赟': 0,
    '孔祥宇': 0, '邓奇缘': 0, '杨子豪': 0, '王雅澜': 0,
    '李若彤': 1, '王龙宇': 0, '何秋烨': 0, '龚赟昊': 0
}

missed_counts = {
    '陈昕媛': 0, '田佳乐': 1, '迟骋': 0, '王靳毓': 0, '朱凯赟': 0,
    '孔祥宇': 0, '邓奇缘': 0, '杨子豪': 0, '王雅澜': 0,
    '李若彤': 0, '王龙宇': 0, '何秋烨': 0, '龚赟昊': 0
}

absent_counts = {n: 0 for n in staff_map.values()}

# Customer review counts
review_counts = {
    '陈昕媛': 1, '田佳乐': 0, '迟骋': 4, '王靳毓': 0, '朱凯赟': 2,
    '孔祥宇': 0, '邓奇缘': 0, '杨子豪': 0, '王雅澜': 0,
    '李若彤': 1, '王龙宇': 0, '何秋烨': 0, '龚赟昊': 0
}

# Generate ratings
ratings = []
for staff_id in range(1, 14):
    name = staff_map[staff_id]
    perf = perf_map.get(name, {'sales': 0, 'hourlyOutput': 0, 'workHours': 50, 'workDays': 7})
    hours = perf['workHours']
    days = perf['workDays']

    # Attendance score
    late = late_counts.get(name, 0)
    missed = missed_counts.get(name, 0)
    absent = absent_counts.get(name, 0)
    att_score = max(1, 5 - late - missed - absent * 2)

    # Behavior score (door count)
    door = door_counts.get(name, 0)
    if door >= 10: beh_score = 5
    elif door >= 7: beh_score = 4
    elif door >= 4: beh_score = 4
    elif door >= 2: beh_score = 3
    else: beh_score = 2

    # Performance score (时产)
    rate = perf['hourlyOutput']
    if rate >= 300: perf_score = 5
    elif rate >= 210: perf_score = 4
    elif rate >= 150: perf_score = 3
    elif rate >= 100: perf_score = 2
    else: perf_score = 1

    # Customer review
    cr_count = review_counts.get(name, 0)
    cr_score = 5 if cr_count > 0 else 4

    avail_score = 5
    avg = round((avail_score + perf_score + beh_score + att_score + cr_score) / 5, 1)
    hourly = 60 if avg >= 4.0 else 28

    # Build comment
    cats_str = perf.get('categories', '')
    if isinstance(cats_str, dict):
        cats_str = ' / '.join([f"{k} {v['pct']}%" for k, v in cats_str.items()])

    comment_parts = [f"6月{days}天出勤{int(hours)}h"]
    if late > 0: comment_parts.append(f"迟到{late}次")
    if door > 0: comment_parts.append(f"门迎{door}次")
    else: comment_parts.append("未排门迎")
    comment_parts.append(f"销售¥{perf['sales']:,}时产¥{rate}/h")
    comment_parts.append(f"品类({cats_str})")
    if cr_count > 0: comment_parts.append(f"大众点评好评{cr_count}条")
    comment = "，".join(comment_parts)

    ratings.append({
        'id': staff_id, 'staffId': staff_id,
        'scores': {
            'availability': avail_score, 'performance': perf_score,
            'behavior': beh_score, 'attendance': att_score,
            'customerReview': cr_score
        },
        'comment': comment, 'avgScore': avg, 'hourlyRate': hourly
    })

# Generate JS
lines = []
lines.append('    ratings: [')
for r in ratings:
    lines.append('    {')
    lines.append(f'      "id": {r["id"]},')
    lines.append(f'      "staffId": {r["staffId"]},')
    lines.append(f'      "month": "2026-06",')
    lines.append(f'      "scores": {{')
    lines.append(f'        "availability": {r["scores"]["availability"]},')
    lines.append(f'        "performance": {r["scores"]["performance"]},')
    lines.append(f'        "behavior": {r["scores"]["behavior"]},')
    lines.append(f'        "attendance": {r["scores"]["attendance"]},')
    lines.append(f'        "customerReview": {r["scores"]["customerReview"]}')
    lines.append(f'      }},')
    lines.append(f'      "comment": "{r["comment"]}",')
    lines.append(f'      "avgScore": {r["avgScore"]},')
    lines.append(f'      "hourlyRate": {r["hourlyRate"]}')
    lines.append('    },' if r['id'] < 13 else '    }')
lines.append('    ],')

js_block = '\n'.join(lines)
with open('data/ratings_block_v20.js', 'w', encoding='utf-8') as f:
    f.write(js_block)

print("=== Generated Ratings v20 ===")
for r in ratings:
    s = r['scores']
    name = staff_map[r['staffId']]
    print(f"  {name}: perf={s['performance']}, beh={s['behavior']}, att={s['attendance']}, cr={s['customerReview']}, avg={r['avgScore']}, ¥{r['hourlyRate']}/h")
print(f"\n✅ Written to data/ratings_block_v20.js")
