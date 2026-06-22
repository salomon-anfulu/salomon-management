#!/usr/bin/env python3
"""Generate JS code for june performance data block (v18, from Excel 42)."""
import json

with open('/Users/a86137/Desktop/兼职/安福路兼职管理系统/data/june_perf_42.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# Generate june block JS
lines = []
lines.append(f"            june: {{")
lines.append(f"        month: '2026-06',")
lines.append(f"        totalSales: {data['totalSales']},")
lines.append(f"        avgUPT: {data['avgUPT']},")
lines.append(f"        avgHourlyOutput: {data['avgHourlyOutput']},")
lines.append(f"        note: 'data as of 6/22 (file 42), net of returns -¥2,196 (1 traced) + 2 untraced from April',")
lines.append(f"        records: [")

for r in data['records']:
    lines.append("  {")
    lines.append(f"    'name': \"{r['name']}\",")
    lines.append(f"    'sales': {r['sales']},")
    lines.append(f"    'qty': {r['qty']},")
    lines.append(f"    'tickets': {r['tickets']},")
    lines.append(f"    'avgPrice': {r['avgPrice']},")
    lines.append(f"    'workHours': {r['workHours']},")
    lines.append(f"    'workDays': {r['workDays']},")
    lines.append(f"    'hourlyOutput': {r['hourlyOutput']},")
    lines.append(f"    'efficiency': {r['efficiency']},")
    lines.append(f"    'salesShare': {r['salesShare']},")
    lines.append(f"    'categories': {{")
    cat_items = list(r['categories'].items())
    for i, (cat_name, cd) in enumerate(cat_items):
        lines.append(f"      '{cat_name}': {{")
        lines.append(f"        'sales': {cd['sales']},")
        lines.append(f"        'qty': {cd['qty']},")
        lines.append(f"        'pct': {cd['pct']}")
        lines.append(f"      }}" + ("," if i < len(cat_items) - 1 else ""))
    lines.append(f"    }}")
    lines.append(f"  }},")

lines.append(f"        ]")
lines.append(f"      }},")

js_block = '\n'.join(lines)

with open('/Users/a86137/Desktop/兼职/安福路兼职管理系统/data/june_block_v18.js', 'w', encoding='utf-8') as f:
    f.write(js_block)

print(f"Generated june block JS ({len(lines)} lines)")
print(f"Total sales: {data['totalSales']:,}")

# Also generate ratings update info
print("\n=== RATING UPDATES NEEDED ===")
for r in data['records']:
    ho = r['hourlyOutput']
    if ho >= 300:
        perf_score = 5
    elif ho >= 210:
        perf_score = 4
    elif ho >= 150:
        perf_score = 3
    elif ho >= 100:
        perf_score = 2
    else:
        perf_score = 1
    print(f"  {r['name']}: hourly={ho} -> performance={perf_score} (sales={r['sales']:,}, qty={r['qty']}, tickets={r['tickets']})")
