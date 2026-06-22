#!/usr/bin/env python3
"""解析腾讯文档门迎排班CSV，生成6/20-6/22的doorSchedule更新"""
import csv
import io

# 从腾讯文档获取的门迎排班CSV数据
csv_data = """门迎时间段统计,2026/6/1,2026/6/2,2026/6/3,2026/6/4,2026/6/5,2026/6/6,2026/6/7,2026/6/8,2026/6/9,2026/6/10,2026/6/11,2026/6/12,2026/6/13,2026/6/14,2026/6/15,2026/6/16,2026/6/17,2026/6/18,2026/6/19,2026/6/20,2026/6/21,2026/6/22,2026/6/23,2026/6/24,2026/6/25,2026/6/26,2026/6/27,2026/6/28,2026/6/29,2026/6/30
10:00 - 11:00,陈昕媛,田佳乐,何秋烨,迟骋,,,龚赟昊,王龙宇,王靳毓,龚赟昊,孔祥宇,何秋烨,龚赟昊,朱凯赟,王龙宇,何秋烨,孔祥宇,田佳乐,邓奇缘,田佳乐,迟骋,王靳毓,,,,,,,,
11:00 - 12:00,邓奇缘,孔祥宇,朱凯赟,王雅澜,,王龙宇,王靳毓,,陈昕媛,王靳毓,李若彤,王龙宇,迟骋,迟骋,孔祥宇,邓奇缘,王靳毓,田佳乐,孔祥宇,朱凯赟,王雅澜,,,,,,,,
12:00 - 13:00,李若彤,王靳毓,邓奇缘,杨子豪,,,孔祥宇,李若彤,孔祥宇,朱凯赟,陈昕媛,王龙宇,朱凯赟,王龙宇,杨子豪,龚赟昊,杨子豪,迟骋,陈昕媛,陈昕媛,何秋烨,龚赟昊,,,,,,,,
13:00 - 14:00,杨子豪,龚赟昊,王雅澜/何秋烨,王龙宇,,,朱凯赟,田佳乐,王雅澜,王雅澜,王靳毓,陈昕媛,邓奇缘,田佳乐,邓奇缘,陈昕媛,王龙宇,邓奇缘,王雅澜,迟骋,朱凯赟,迟骋,,,,,,,,
14:00 - 15:00,王靳毓,陈昕媛,田佳乐,田佳乐,,,邓奇缘,迟骋,邓奇缘,何秋烨,田佳乐,,陈昕媛,邓奇缘,李若彤,孔祥宇,田佳乐,李若彤,杨子豪,王靳毓,陈昕媛,,,,,,,,
15:00 - 16:00,陈昕媛,李若彤,何秋烨,迟骋,,何秋烨,,王龙宇,王靳毓,龚赟昊,孔祥宇,王雅澜,李若彤,李若彤,迟骋,何秋烨,孔祥宇,王雅澜,何秋烨,何秋烨,何秋烨,邓奇缘,,,,,,,,
16:00 - 17:00,邓奇缘,,朱凯赟,王雅澜,,王龙宇,陈昕媛,,陈昕媛,王靳毓,李若彤,何秋烨,孔祥宇,龚赟昊,王龙宇,邓奇缘,王靳毓,朱凯赟,王靳毓,杨子豪,龚赟昊,,,,,,,,,
17:00 - 18:00,杨子豪,孔祥宇,邓奇缘,王龙宇,,,,李若彤,孔祥宇,何秋烨,陈昕媛,邓奇缘,龚赟昊,孔祥宇,孔祥宇,陈昕媛,杨子豪,迟骋,龚赟昊,龚赟昊,杨子豪,迟骋,,,,,,,,
18:00 - 19:00,王靳毓,王靳毓,王雅澜,田佳乐,,王雅澜,孔祥宇,田佳乐,王雅澜,王雅澜,王靳毓,陈昕媛,朱凯赟,迟骋,杨子豪,龚赟昊,王龙宇,田佳乐,李若彤,朱凯赟,朱凯赟,,,,,,,,
19:00 - 20:00,李若彤,龚赟昊,田佳乐,杨子豪,,迟骋,朱凯赟,迟骋,邓奇缘,朱凯赟,田佳乐,王雅澜,邓奇缘,李若彤,邓奇缘,孔祥宇,田佳乐,李若彤,何秋烨,迟骋,,邓奇缘,,,,,,,,
20:00 - 21:00,,李若彤,澜/天/佳乐,王龙宇/田佳乐,,何秋烨,陈昕媛,,,,田佳乐,邓奇缘,李若彤,,迟骋/李若彤,,,,,,龚赟昊,,,,,,,,
21:00 - 21:30,,,,,,何秋烨,陈昕媛,,,,,,孔祥宇,龚赟昊,,,,朱凯赟,李若彤,何秋烨,,,,,,,,,,,"""

reader = csv.reader(io.StringIO(csv_data))
rows = list(reader)

# 第一行是标题行，包含日期
header = rows[0]
dates = header[1:]  # col 1 onwards are dates

# 解析门迎排班
# key: date (2026/6/X), value: list of {time, staff}
schedule = {}

for row in rows[1:]:
    if not row or not row[0].strip():
        continue
    time_raw = row[0].strip()
    # Convert "10:00 - 11:00" to "10:00-11:00"
    time_str = time_raw.replace(' ', '')

    for i, staff_raw in enumerate(row[1:]):
        staff = staff_raw.strip()
        if not staff or staff == '\n' or staff == '""':
            continue
        # 处理多人情况，如 "王雅澜/何秋烨"
        if '/' in staff:
            staffs = [s.strip() for s in staff.split('/')]
            for s in staffs:
                if s:
                    date_str = dates[i]
                    schedule.setdefault(date_str, []).append((time_str, s))
        else:
            date_str = dates[i]
            schedule.setdefault(date_str, []).append((time_str, staff))

# 排序每个日期的slots按时间
for date_str in schedule:
    schedule[date_str].sort(key=lambda x: x[0])

# 生成6/20, 6/21, 6/22的数据
target_dates = ['2026/6/20', '2026/6/21', '2026/6/22']
for td in target_dates:
    print(f"\n=== {td} ===")
    if td in schedule:
        for time_str, staff in schedule[td]:
            print(f"  {time_str} -> {staff}")
    else:
        print("  (无数据)")

# 生成JS代码
print("\n\n=== JS CODE ===")
for td in target_dates:
    date_code = td.replace('/', '-')
    # 补零
    parts = date_code.split('-')
    date_code = f"{parts[0]}-{parts[1].zfill(2)}-{parts[2].zfill(2)}"

    if td in schedule:
        slots_js = []
        for time_str, staff in schedule[td]:
            slots_js.append(f"        {{ time: '{time_str}', staff: '{staff}' }}")
        print(f"      {{ date: '{date_code}', slots: [")
        print(',\n'.join(slots_js))
        print(f"      ]}},")
