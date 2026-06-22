#!/usr/bin/env python3
"""检查Excel中被归为'其他'品类的商品"""
import openpyxl
from collections import defaultdict

EXCEL_PATH = "/Users/a86137/Downloads/销售小票查询 (44).XLSX"

wb = openpyxl.load_workbook(EXCEL_PATH, read_only=True, data_only=True)
ws = wb.active

rows = list(ws.iter_rows(min_row=2, values_only=True))

COL_TYPE = 4       # 类型: 销售/全退货/换货
COL_CATEGORY = 24  # 品类

# 分类逻辑（同 parse_excel_44.py）
def classify_cat(category):
    cat_str = str(category or '').strip()
    if any(x in cat_str for x in ['鞋', '靴']):
        return '鞋履'
    elif any(x in cat_str for x in ['服', '衣', '裤', '裙', 'T恤', '卫衣', '外套']):
        return '服装'
    elif any(x in cat_str for x in ['配', '袜', '帽', '包', '围巾', '手套']):
        return '配件'
    else:
        return '其他'

# 收集所有被归为"其他"的商品
other_items = []
all_category_values = set()

for row in rows:
    if not row or len(row) <= COL_CATEGORY:
        continue
    row_type = str(row[COL_TYPE] or '').strip()
    category_raw = row[COL_CATEGORY]
    category_str = str(category_raw or '').strip()
    
    all_category_values.add(category_str)
    
    cat = classify_cat(category_str)
    if cat == '其他' and row_type == '销售':
        amount = row[5]  # 金额列
        other_items.append({
            'category_raw': category_str,
            'amount': amount,
            'type': row_type,
        })

# 统计所有品类原始值
print("=== Excel中所有品类原始值 ===")
for v in sorted(all_category_values):
    if v:
        count = sum(1 for r in rows if str(r[COL_CATEGORY] or '').strip() == v)
        print(f"  '{v}' → {classify_cat(v)} ({count}条)")

print(f"\n=== 被归为'其他'的销售记录: {len(other_items)}条 ===")
cat_counts = defaultdict(lambda: {'count': 0, 'amount': 0})
for item in other_items:
    c = item['category_raw']
    cat_counts[c]['count'] += 1
    try:
        cat_counts[c]['amount'] += float(item['amount'] or 0)
    except:
        pass

for c, info in sorted(cat_counts.items(), key=lambda x: -x[1]['count']):
    print(f"  '{c}': {info['count']}条, ¥{info['amount']:,.0f}")

# 也检查空品类
empty_count = sum(1 for r in rows if not str(r[COL_CATEGORY] or '').strip() and str(r[COL_TYPE] or '').strip() == '销售')
print(f"\n空品类的销售记录: {empty_count}条")

wb.close()
