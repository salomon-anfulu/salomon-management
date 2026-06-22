#!/usr/bin/env python3
"""Generate JS code block for june performance data from june_perf_44.json"""
import json

with open('data/june_perf_44.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

lines = []
lines.append("      june: {")
lines.append(f"        totalSales: {data['totalSales']},")
lines.append(f"        avgUPT: {data['avgUPT']},")
lines.append(f"        avgHourlyOutput: {data['avgHourlyOutput']},")
lines.append("        records: [")

for i, r in enumerate(data['records']):
    cats_str = ' / '.join([f"{k} {v['pct']}%" for k, v in r['categories'].items()])
    lines.append("          {")
    lines.append(f"            name: '{r['name']}',")
    lines.append(f"            sales: {r['sales']},")
    lines.append(f"            qty: {r['qty']},")
    lines.append(f"            tickets: {r['tickets']},")
    lines.append(f"            avgPrice: {r['avgPrice']},")
    lines.append(f"            workHours: {r['workHours']},")
    lines.append(f"            workDays: {r['workDays']},")
    lines.append(f"            hourlyOutput: {r['hourlyOutput']},")
    lines.append(f"            efficiency: {r['efficiency']},")
    lines.append(f"            salesShare: {r['salesShare']},")
    lines.append(f"            categories: '{cats_str}'")
    if i < len(data['records']) - 1:
        lines.append("          },")
    else:
        lines.append("          }")
lines.append("        ]")
lines.append("      },")

js_block = '\n'.join(lines)

with open('data/june_block_v20.js', 'w', encoding='utf-8') as f:
    f.write(js_block)

print(js_block[:500])
print(f"\n... total {len(js_block)} chars")
print(f"Saved to data/june_block_v20.js")
