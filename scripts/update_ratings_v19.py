import json, re

# Load linggong data
with open('data/weekly_attendance_clean.json') as f:
    lg_data = json.load(f)

# Staff ID → name mapping
staff_map = {
    1: '陈昕媛', 2: '田佳乐', 3: '迟骋', 4: '王靳毓', 5: '朱凯赟',
    6: '孔祥宇', 7: '邓奇缘', 8: '杨子豪', 9: '王雅澜', 10: '李若彤',
    11: '王龙宇', 12: '何秋烨', 13: '龚赟昊'
}

# Door counts from authoritative PT doc
door_counts = {
    '陈昕媛': 18, '田佳乐': 17, '迟骋': 16, '王靳毓': 16, '朱凯赟': 15,
    '孔祥宇': 18, '邓奇缘': 20, '杨子豪': 11, '王雅澜': 13,
    '李若彤': 17, '王龙宇': 13, '何秋烨': 17, '龚赟昊': 16
}

# Late counts from staffStats in app.js (from PT doc异常考勤数据)
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

absent_counts = {
    '陈昕媛': 0, '田佳乐': 0, '迟骋': 0, '王靳毓': 0, '朱凯赟': 0,
    '孔祥宇': 0, '邓奇缘': 0, '杨子豪': 0, '王雅澜': 0,
    '李若彤': 0, '王龙宇': 0, '何秋烨': 0, '龚赟昊': 0
}

# June performance data (from v18 june block)
june_perf = {
    '陈昕媛': {'sales': 31414, 'qty': 25, 'cats': '鞋履 83.5% / 服装 10.2% / 配件 6.3%'},
    '田佳乐': {'sales': 6348, 'qty': 11, 'cats': '鞋履 80.2% / 服装 12.6% / 配件 7.2%'},
    '迟骋': {'sales': 9482, 'qty': 15, 'cats': '鞋履 80.0% / 服装 11.6% / 其他 8.4%'},
    '王靳毓': {'sales': 10848, 'qty': 16, 'cats': '鞋履 59.8% / 服装 17.5% / 其他 12.9% / 配件 9.8%'},
    '朱凯赟': {'sales': 9660, 'qty': 15, 'cats': '鞋履 68.2% / 其他 25.8% / 服装 5.2% / 配件 0.8%'},
    '孔祥宇': {'sales': 16371, 'qty': 25, 'cats': '鞋履 62.2% / 服装 32.9% / 其他 4.9%'},
    '邓奇缘': {'sales': 10127, 'qty': 16, 'cats': '鞋履 91.1% / 服装 7.9% / 配件 1.1%'},
    '杨子豪': {'sales': 30010, 'qty': 25, 'cats': '鞋履 91.7% / 服装 8.0% / 配件 0.4%'},
    '王雅澜': {'sales': 19288, 'qty': 29, 'cats': '鞋履 76.6% / 服装 10.9% / 其他 8.8% / 配件 3.7%'},
    '李若彤': {'sales': 24016, 'qty': 22, 'cats': '鞋履 87.3% / 其他 4.6% / 服装 4.1% / 配件 4.0%'},
    '王龙宇': {'sales': 5450, 'qty': 9, 'cats': '鞋履 93.4% / 配件 6.6%'},
    '何秋烨': {'sales': 12170, 'qty': 19, 'cats': '鞋履 59.9% / 服装 27.9% / 配件 12.3%'},
    '龚赟昊': {'sales': 18472, 'qty': 28, 'cats': '鞋履 86.0% / 服装 14.0%'}
}

# Customer review counts
review_counts = {
    '陈昕媛': 1, '田佳乐': 0, '迟骋': 4, '王靳毓': 0, '朱凯赟': 2,
    '孔祥宇': 0, '邓奇缘': 0, '杨子豪': 0, '王雅澜': 0,
    '李若彤': 1, '王龙宇': 0, '何秋烨': 0, '龚赟昊': 0
}

# Compute per-person attendance from linggong data (June, Service Team only)
person_stats = {}
for r in lg_data['records']:
    name = r['name']
    if name not in staff_map.values():
        continue
    date = r['date']
    if not date.startswith('2026/06'):
        continue
    if r['status'] in ('取消', '未开始考勤'):
        continue
    if name not in person_stats:
        person_stats[name] = {'days': 0, 'hours': 0, 'late': 0, 'missed': 0}
    person_stats[name]['days'] += 1
    person_stats[name]['hours'] += float(r.get('totalHours', 0) or 0)
    if r['status'] == '迟到':
        person_stats[name]['late'] += 1
    if r['status'] == '缺卡':
        person_stats[name]['missed'] += 1

print("=== Per Person Stats ===")
for name in sorted(person_stats.keys(), key=lambda n: -person_stats[n]['hours']):
    s = person_stats[name]
    print(f"  {name}: {s['days']}天, {s['hours']:.1f}h, 迟到{s['late']}, 缺卡{s['missed']}")

# Generate ratings
ratings = []
for staff_id in range(1, 14):
    name = staff_map[staff_id]
    s = person_stats.get(name, {'days': 0, 'hours': 0, 'late': 0, 'missed': 0})

    # Attendance score: base 5, 迟到-1, 缺卡-1, 旷工-2 (min 1)
    # Use staffStats values for late/missed (authoritative from PT doc)
    late = late_counts.get(name, 0)
    missed = missed_counts.get(name, 0)
    absent = absent_counts.get(name, 0)
    att_score = max(1, 5 - late - missed - absent * 2)

    # Behavior score: based on door count (≥10=5, ≥7=4, ≥4=4, ≥2=3)
    door = door_counts.get(name, 0)
    if door >= 10:
        beh_score = 5
    elif door >= 7:
        beh_score = 4
    elif door >= 4:
        beh_score = 4
    elif door >= 2:
        beh_score = 3
    else:
        beh_score = 2

    # Performance score: 时产 (≥300=5, ≥210=4, ≥150=3, ≥100=2, <100=1)
    hours = s['hours'] if s['hours'] > 0 else 1
    perf_data = june_perf.get(name, {'sales': 0})
    sales = perf_data['sales']
    rate = sales / hours
    if rate >= 300:
        perf_score = 5
    elif rate >= 210:
        perf_score = 4
    elif rate >= 150:
        perf_score = 3
    elif rate >= 100:
        perf_score = 2
    else:
        perf_score = 1

    # Customer review: 有好评=5, 无=4
    cr_count = review_counts.get(name, 0)
    cr_score = 5 if cr_count > 0 else 4

    # Availability: kept at 5 (frontend dynamically overrides)
    avail_score = 5

    # avgScore
    avg = round((avail_score + perf_score + beh_score + att_score + cr_score) / 5, 1)

    # Hourly rate
    hourly = 60 if avg >= 4.0 else 28

    # Build comment
    cats_str = perf_data.get('cats', '')
    comment_parts = [f"6月{s['days']}天出勤{int(s['hours'])}h"]
    if late > 0:
        comment_parts.append(f"迟到{late}次")
    if door > 0:
        comment_parts.append(f"门迎{door}次")
    else:
        comment_parts.append("未排门迎")
    comment_parts.append(f"销售¥{sales:,}时产¥{int(rate)}/h")
    comment_parts.append(f"品类({cats_str})")
    if cr_count > 0:
        comment_parts.append(f"大众点评好评{cr_count}条")
    comment = "，".join(comment_parts)

    ratings.append({
        'id': staff_id,
        'staffId': staff_id,
        'scores': {
            'availability': avail_score,
            'performance': perf_score,
            'behavior': beh_score,
            'attendance': att_score,
            'customerReview': cr_score
        },
        'comment': comment,
        'avgScore': avg,
        'hourlyRate': hourly
    })

# Generate JS block
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
    if r['id'] < 13:
        lines.append('    },')
    else:
        lines.append('    }')
lines.append('    ],')

js_block = '\n'.join(lines)

# Save
with open('data/ratings_block_v19.js', 'w') as f:
    f.write(js_block)

print("\n=== Generated Ratings ===")
for r in ratings:
    print(f"  {staff_map[r['staffId']]}: perf={r['scores']['performance']}, beh={r['scores']['behavior']}, att={r['scores']['attendance']}, cr={r['scores']['customerReview']}, avg={r['avgScore']}, ¥{r['hourlyRate']}/h")
print(f"\n✅ Written to data/ratings_block_v19.js")
