#!/usr/bin/env python3
"""v25: 精确替换灵工打卡数据 - 更新6/23实际打卡 + 新增6/24"""
import json, re

with open('js/app.js', encoding='utf-8') as f:
    content = f.read()

with open('data/weekly_attendance_clean.json', encoding='utf-8') as f:
    raw = json.load(f)
records = raw['records']

# 只保留 6/23 和 6/24 的数据 (这是新增/变更的)
new_records = []
for r in records:
    if r['date'] in ('2026/06/23', '2026/06/24'):
        new_records.append(r)

print(f"需要写入的新记录: {len(new_records)} 条")
for r in new_records:
    print(f"  {r['date']} {r['name']}: {r.get('signIn','')} -> {r.get('signOut','')} ({r.get('totalHours',0)}h)")

# 生成 JS 格式的记录行
def make_js_line(r):
    date = r['date'].replace('/', '-')
    sign_in = r.get('signIn', '') or ''
    sign_out = r.get('signOut', '') or ''
    hours = r.get('totalHours', 0)
    status = r.get('status', '正常')
    return f'        {{ "name": "{r["name"]}", "date": "{date}", "signIn": "{sign_in}", "signOut": "{sign_out}", "status": "{status}", "totalHours": "{hours}" }},'

# 策略：找到 6/23 的 8条预排记录并删除，然后在 records 数组末尾追加 6/23(8条) + 6/24(8条)
# 先找到 6/23 第一条记录的位置
pattern_623_start = re.compile(r'\n        \{ "name": "[^"]*", "date": "2026-06-23"[^}]*\},')
matches_623 = list(pattern_623_start.finditer(content))
print(f"\n找到 6/23 记录: {len(matches_623)} 条")

if matches_623:
    # 删除所有 6/23 的记录
    # 从第一条 6/23 记录的起始位置开始
    first_623 = matches_623[0].start()
    last_623 = matches_623[-1].end()

    # 取出这段文本，删除它
    before = content[:first_623]
    after = content[last_623:]

    # 现在在 records 数组结束位置追加 6/23 + 6/24
    # 找 records 数组的结束 ]
    # after 中应该有 `\n      ],` 这样的结束标记
    end_pattern = re.compile(r'\n      \],')
    end_match = end_pattern.search(after)
    if not end_match:
        print("ERROR: 找不到 records 数组结束标记")
        exit(1)

    insert_pos = end_match.start()
    insert_before = after[:insert_pos]
    insert_after = after[insert_pos:]

    # 生成新记录文本
    new_lines = []
    for r in new_records:
        new_lines.append(make_js_line(r))
    new_text = '\n'.join(new_lines)

    # 组装
    content = before + insert_before + '\n' + new_text + insert_after

    with open('js/app.js', 'w', encoding='utf-8') as f:
        f.write(content)

    print(f"\n✅ 已删除旧 6/23 记录 ({len(matches_623)}条)，追加 {len(new_records)} 条新记录")

    # 验证
    with open('js/app.js', encoding='utf-8') as f:
        verify = f.read()
    from collections import Counter
    dates = re.findall(r'"date":\s*"(\d{4}-\d{2}-\d{2})"', verify[verify.find('linggongAttendance'):verify.find('linggongAttendance')+50000])
    cnt = Counter(dates)
    print(f"\n验证 - 最新几天:")
    for d in sorted(cnt)[-5:]:
        print(f"  {d}: {cnt[d]}条")
    print(f"总计: {len(dates)}条")
else:
    print("未找到 6/23 记录，直接追加")
