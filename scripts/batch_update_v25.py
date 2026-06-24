#!/usr/bin/env python3
"""v25: 批量更新 灵工打卡 + 门迎排班 + 店务支援 + 换班登记"""
import json, re, csv, io
from collections import defaultdict

# ========== 1. 灵工打卡 ==========
print("=" * 60)
print("1. 灵工打卡数据")
print("=" * 60)

with open('data/weekly_attendance_clean.json', encoding='utf-8') as f:
    raw = json.load(f)
records = raw['records']
print(f"API返回: {len(records)} 条")

# 转换格式
def fmt_lg(r):
    """转换为 app.js 格式"""
    return {
        "name": r['name'],
        "date": r['date'].replace('/', '-'),  # 2026/06/24 -> 2026-06-24
        "clockIn": r.get('clockInTime') or '',
        "clockOut": r.get('signOut') or r.get('clockOutTime') or '',
        "totalHours": str(r.get('totalHours', 0)),
        "status": r.get('status', '正常'),
    }

lg_records = [fmt_lg(r) for r in records]
print(f"格式化后: {len(lg_records)} 条")
# 最新日期
dates = sorted(set(r['date'] for r in lg_records))
print(f"日期范围: {dates[0]} ~ {dates[-1]}")

# 检查最新日期数据
for d in dates[-3:]:
    cnt = sum(1 for r in lg_records if r['date'] == d)
    print(f"  {d}: {cnt}条")

# 生成 JS 数组文本
lg_lines = []
for r in lg_records:
    lg_lines.append(
        f"        {{ name: '{r['name']}', date: '{r['date']}', "
        f"clockIn: '{r['clockIn']}', clockOut: '{r['clockOut']}', "
        f"totalHours: '{r['totalHours']}', status: '{r['status']}' }},"
    )
lg_block = '\n'.join(lg_lines)
with open('/tmp/v25_linggong.txt', 'w', encoding='utf-8') as f:
    f.write(lg_block)
print(f"灵工打卡文本已保存: {len(lg_lines)} 行")

# ========== 2. 门迎排班 ==========
print("\n" + "=" * 60)
print("2. 门迎排班数据")
print("=" * 60)

# PT文档门迎排班CSV (row 23-36, col 4-30)
door_csv = """,,,,,,,,,,,,,,,,,,,,,,,,,,
门迎时间段统计,2026/6/1,2026/6/2,2026/6/3,2026/6/4,2026/6/5,2026/6/6,2026/6/7,2026/6/8,2026/6/9,2026/6/10,2026/6/11,2026/6/12,2026/6/13,2026/6/14,2026/6/15,2026/6/16,2026/6/17,2026/6/18,2026/6/19,2026/6/20,2026/6/21,2026/6/22,2026/6/23,2026/6/24,2026/6/25,2026/6/26
10:00 - 11:00,陈昕媛,田佳乐,何秋烨,迟骋,,,龚赟昊,王龙宇,王靳毓,龚赟昊,孔祥宇,何秋烨,龚赟昊,朱凯赟,王龙宇,何秋烨,孔祥宇,田佳乐,邓奇缘,田佳乐,迟骋,王靳毓,陈昕媛,,,
11:00 - 12:00,邓奇缘,孔祥宇,朱凯赟,王雅澜,,王龙宇,王靳毓,,陈昕媛,王靳毓,李若彤,王龙宇,迟骋,迟骋,孔祥宇,邓奇缘,王靳毓,田佳乐,孔祥宇,朱凯赟,王雅澜,,田佳乐,,,
12:00 - 13:00,李若彤,王靳毓,邓奇缘,杨子豪,,,孔祥宇,李若彤,孔祥宇,朱凯赟,陈昕媛,王龙宇,朱凯赟,王龙宇,杨子豪,龚赟昊,杨子豪,迟骋,陈昕媛,陈昕媛,何秋烨,龚赟昊,何秋烨,,,
13:00 - 14:00,杨子豪,龚赟昊,王雅澜/何秋烨,王龙宇,,,朱凯赟,田佳乐,王雅澜,王雅澜,王靳毓,陈昕媛,邓奇缘,田佳乐,邓奇缘,陈昕媛,王龙宇,邓奇缘,王雅澜,迟骋,朱凯赟,迟骋,李若彤,,,
14:00 - 15:00,王靳毓,陈昕媛,田佳乐,田佳乐,,,邓奇缘,迟骋,邓奇缘,何秋烨,田佳乐,,陈昕媛,邓奇缘,李若彤,孔祥宇,田佳乐,李若彤,杨子豪,王靳毓,陈昕媛,何秋烨,朱凯赟,,,
15:00 - 16:00,陈昕媛,李若彤,何秋烨,迟骋,,何秋烨,,王龙宇,王靳毓,龚赟昊,孔祥宇,王雅澜,李若彤,李若彤,迟骋,何秋烨,孔祥宇,王雅澜,何秋烨,何秋烨,何秋烨,邓奇缘,杨子豪,,,
16:00 - 17:00,邓奇缘,,朱凯赟,王雅澜,,王龙宇,陈昕媛,,陈昕媛,王靳毓,李若彤,何秋烨,孔祥宇,龚赟昊,王龙宇,邓奇缘,王靳毓,朱凯赟,王靳毓,杨子豪,龚赟昊,何秋烨,陈昕媛,,,
17:00 - 18:00,杨子豪,孔祥宇,邓奇缘,王龙宇,,,,李若彤,孔祥宇,何秋烨,陈昕媛,邓奇缘,龚赟昊,孔祥宇,孔祥宇,陈昕媛,杨子豪,迟骋,龚赟昊,龚赟昊,杨子豪,迟骋,田佳乐,,,
18:00 - 19:00,王靳毓,王靳毓,王雅澜,田佳乐,,王雅澜,孔祥宇,田佳乐,王雅澜,王雅澜,王靳毓,陈昕媛,朱凯赟,迟骋,杨子豪,龚赟昊,王龙宇,田佳乐,李若彤,朱凯赟,朱凯赟,何秋烨,,,,
19:00 - 20:00,李若彤,龚赟昊,田佳乐,杨子豪,,迟骋,朱凯赟,迟骋,邓奇缘,朱凯赟,田佳乐,王雅澜,邓奇缘,李若彤,邓奇缘,孔祥宇,田佳乐,李若彤,何秋烨,迟骋,,邓奇缘,李若彤,,,
20:00 - 21:00,,李若彤,澜/天/佳乐,王龙宇/田佳乐,,何秋烨,陈昕媛,,,,田佳乐,邓奇缘,李若彤,,迟骋/李若彤,,,,,,龚赟昊,,,,,
21:00 - 21:30,,,,,,何秋烨,陈昕媛,,,,,,孔祥宇,龚赟昊,,,,朱凯赟,李若彤,何秋烨,,,,"""

reader = csv.reader(io.StringIO(door_csv))
rows = list(reader)

# row 0: 空, row 1: 日期行, row 2-13: 时间段
date_row = rows[1]
dates_raw = [c.strip() for c in date_row[1:27]]  # col 1-26 = 6/1~6/26
# 转换日期 2026/6/1 -> 2026-06-01
dates_fmt = []
for d in dates_raw:
    if not d:
        dates_fmt.append('')
        continue
    parts = d.split('/')
    dates_fmt.append(f"{parts[0]}-{int(parts[1]):02d}-{int(parts[2]):02d}")

# 时间段行
time_rows = rows[2:14]  # 12个时间段

# 解析每天的门迎排班
door_schedule = {}
for col_idx, date in enumerate(dates_fmt):
    if not date:
        continue
    slots = []
    for row in time_rows:
        time_str = row[0].strip()  # "10:00 - 11:00"
        if col_idx + 1 < len(row):
            staff_raw = row[col_idx + 1].strip()
            if staff_raw:
                # 可能有多人: "王雅澜/何秋烨" 或 "迟骋/李若彤"
                # 也可能有缩写: "澜/天/佳乐"
                # 拆分
                for s in re.split(r'[/]', staff_raw):
                    s = s.strip()
                    if not s:
                        continue
                    # 映射缩写
                    name_map = {
                        '澜': '王雅澜', '天': '田佳乐', '佳乐': '田佳乐',
                        '宇': '王龙宇', '毓': '王靳毓',
                    }
                    name = name_map.get(s, s)
                    slots.append({"time": time_str, "staff": name})
    if slots:
        door_schedule[date] = slots

# 当前 app.js 中已有的门迎日期
existing_dates = ['2026-06-01','2026-06-02','2026-06-03','2026-06-04',
                  '2026-06-06','2026-06-07','2026-06-08','2026-06-09',
                  '2026-06-10','2026-06-11','2026-06-12','2026-06-13',
                  '2026-06-14','2026-06-15','2026-06-16','2026-06-17',
                  '2026-06-18','2026-06-19','2026-06-20','2026-06-21','2026-06-22']

# 需要新增/更新的日期
new_dates = [d for d in sorted(door_schedule.keys()) if d not in existing_dates]
print(f"PT文档门迎日期: {sorted(door_schedule.keys())}")
print(f"已有日期: {existing_dates[-5:]}...")
print(f"新增日期: {new_dates}")

for d in new_dates:
    print(f"  {d}: {len(door_schedule[d])} slots")
    for s in door_schedule[d]:
        print(f"    {s['time']} -> {s['staff']}")

# 生成新增门迎的 JS 文本
if new_dates:
    door_lines = []
    for d in new_dates:
        slots_js = ', '.join(
            f"{{ time: '{s['time']}', staff: '{s['staff']}' }}" for s in door_schedule[d]
        )
        door_lines.append(f"      {{ date: '{d}', slots: [ {slots_js} ] }}")
    door_block = ',\n'.join(door_lines)
    with open('/tmp/v25_door.txt', 'w', encoding='utf-8') as f:
        f.write(door_block)
    print(f"门迎新增文本已保存")

# ========== 3. 门迎统计 (异常考勤表区域) ==========
print("\n" + "=" * 60)
print("3. 门迎统计 (doorCount)")
print("=" * 60)

# 从CSV中提取 异常考勤数据记录表
abnormal_csv_rows = rows_abnormal if (rows_abnormal := [r for r in rows if r and r[0] == '']) else []

# 直接从之前获取的数据中提取
# 异常考勤表在 row 38+ 的区域
# 格式: 员工姓名, 门迎统计, 换班统计, 被换班统计, 缺卡统计, 迟到统计, 旷工统计, 大众点评
# 已知数据 (从API返回中提取):
door_stats_raw = """陈昕媛,20,0,0,,,,,
田佳乐,19,1,0,1,,,,,
迟骋,16,1,0,,,,,,
王靳毓,16,1,2,,1,,,,,
朱凯赟,16,0,0,,,,,,
孔祥宇,18,1,0,,,,,,
邓奇缘,20,0,1,,,,,,
杨子豪,12,2,0,,,,,,
王雅澜,13,1,2,,,,,,
李若彤,19,1,1,,1,1,,,
王龙宇,13,0,1,1,,,,,,
何秋烨,21,1,1,,,,,,
龚赟昊,16,0,1,,,,,,"""

print("PT文档最新门迎统计:")
for line in door_stats_raw.strip().split('\n'):
    parts = line.split(',')
    print(f"  {parts[0]}: 门迎={parts[1]}, 换班={parts[2]}, 被换班={parts[3]}, 缺卡={parts[4]}, 迟到={parts[5]}, 旷工={parts[6]}, 点评={parts[7] if len(parts)>7 else ''}")

# ========== 4. 店务支援 ==========
print("\n" + "=" * 60)
print("4. 店务支援")
print("=" * 60)

# 从CSV中提取店务支援记录 (id 1-77)
support_records = []
# 从之前的数据手动提取 id 76, 77 (新增)
new_support = [
    {"id": 76, "staff": "田佳乐", "date": "2026-06-23", "type": "陈列-新品熨烫", "duration": "", "detail": ""},
]
print("新增店务记录:")
for r in new_support:
    print(f"  id={r['id']}: {r['staff']} {r['date']} {r['type']}")

# ========== 5. 换班登记 ==========
print("\n" + "=" * 60)
print("5. 换班登记")
print("=" * 60)

# 从CSV提取换班记录 (id 1-10)
# id 6 和 id 8 是新增的
new_shifts = [
    {"id": 6, "applicant": "王雅澜", "applyDate": "6月17日", "applicantShift": "6/22 12:15-21:00",
     "target": "何秋烨", "targetShift": "6/24 12:15-21:00"},
    {"id": 7, "applicant": "何秋烨", "applyDate": "6月18日", "applicantShift": "6/28 11:30-20:30",
     "target": "邓奇缘", "targetShift": "6/20 13:00-21:30"},
    {"id": 8, "applicant": "迟骋", "applyDate": "6月19日", "applicantShift": "6/23 12:15-21:00",
     "target": "李若彤", "targetShift": "6/22 12:15-21:00"},
    {"id": 9, "applicant": "田佳乐", "applyDate": "6月20日", "applicantShift": "6/21 13:00-21:30",
     "target": "龚赟昊", "targetShift": "6/25 13:00-21:30"},
]
print("新增换班记录:")
for s in new_shifts:
    print(f"  id={s['id']}: {s['applicant']}({s['applicantShift']}) <-> {s['target']}({s['targetShift']})")

print("\n" + "=" * 60)
print("✅ 数据解析完成，等待写入 app.js")
print("=" * 60)
