#!/usr/bin/env python3
"""统计6/20-6/22门迎排班各人次数"""

# 6/20新增的slots（之前只有1条迟骋13:00-14:00，现在补全到11条）
# 但实际上之前app.js中6/20只有1条，所以新增10条
# 注意：PT文档的异常考勤表doorCount已经是到6/20的完整统计（包含这11条）
# 所以6/20的补全不需要改doorCount

# 6/21新增
june21 = {
    '迟骋': 2,   # 10:00-11:00, 17:00-18:00
    '王雅澜': 1,  # 11:00-12:00
    '何秋烨': 2,  # 12:00-13:00, 15:00-16:00
    '朱凯赟': 2,  # 13:00-14:00, 18:00-19:00
    '陈昕媛': 1,  # 14:00-15:00
    '龚赟昊': 2,  # 16:00-17:00, 20:00-21:00
    '杨子豪': 1,  # 17:00-18:00... 等等，17:00-18:00是杨子豪
}

# 重新数6/21
june21_slots = [
    ('10:00-11:00', '迟骋'),
    ('11:00-12:00', '王雅澜'),
    ('12:00-13:00', '何秋烨'),
    ('13:00-14:00', '朱凯赟'),
    ('14:00-15:00', '陈昕媛'),
    ('15:00-16:00', '何秋烨'),
    ('16:00-17:00', '龚赟昊'),
    ('17:00-18:00', '杨子豪'),
    ('18:00-19:00', '朱凯赟'),
    ('20:00-21:00', '龚赟昊'),
]

# 6/22
june22_slots = [
    ('10:00-11:00', '王靳毓'),
    ('12:00-13:00', '龚赟昊'),
    ('13:00-14:00', '迟骋'),
    ('15:00-16:00', '邓奇缘'),
    ('17:00-18:00', '迟骋'),
    ('19:00-20:00', '邓奇缘'),
]

from collections import Counter

count_21 = Counter(s[1] for s in june21_slots)
count_22 = Counter(s[1] for s in june22_slots)

total_new = Counter()
total_new.update(count_21)
total_new.update(count_22)

print("=== 6/21门迎次数 ===")
for name, cnt in sorted(count_21.items(), key=lambda x: -x[1]):
    print(f"  {name}: +{cnt}")

print("\n=== 6/22门迎次数 ===")
for name, cnt in sorted(count_22.items(), key=lambda x: -x[1]):
    print(f"  {name}: +{cnt}")

print("\n=== 6/21+6/22合计增量 ===")
for name, cnt in sorted(total_new.items(), key=lambda x: -x[1]):
    print(f"  {name}: +{cnt}")

# 当前doorCount (来自app.js)
current = {
    '陈昕媛': 18, '田佳乐': 17, '迟骋': 16, '王靳毓': 16,
    '朱凯赟': 15, '孔祥宇': 18, '邓奇缘': 20, '杨子豪': 11,
    '王雅澜': 13, '李若彤': 17, '王龙宇': 13, '何秋烨': 17, '龚赟昊': 16
}

print("\n=== 更新后doorCount ===")
updated = {}
for name, old_cnt in current.items():
    new_cnt = old_cnt + total_new.get(name, 0)
    updated[name] = new_cnt
    if total_new.get(name, 0) > 0:
        print(f"  {name}: {old_cnt} -> {new_cnt} (+{total_new[name]})")
    else:
        print(f"  {name}: {old_cnt} (不变)")

# 生成JS
print("\n=== JS staffStats更新 ===")
for name, cnt in updated.items():
    # 读当前的完整数据
    pass
