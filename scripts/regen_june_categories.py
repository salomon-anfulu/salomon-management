#!/usr/bin/env python3
"""重新计算6月品类占比 - 修正分类逻辑后重新生成categories数据"""
import openpyxl
import json
import re
from collections import defaultdict

XLSX_PATH = "/Users/a86137/Downloads/销售小票查询 (44).XLSX"

NAME_MAP = {
    'lrt': '李若彤', 'kxy': '孔祥宇', 'cxy': '陈昕媛', 'wjy': '王靳毓', 'tjl': '田佳乐',
    'cc': '迟骋', 'dqy': '邓奇缘', 'yzh': '杨子豪', 'wyl': '王雅澜',
    'hqy': '何秋烨', 'zky': '朱凯赟', 'wly': '王龙宇', 'gyh': '龚赟昊',
}

def match_name(remark):
    if not remark:
        return None
    remark_lower = str(remark).lower().strip()
    for abbr, name in NAME_MAP.items():
        if abbr in remark_lower:
            return name
    return None

def classify_category(category):
    """修正后的分类逻辑"""
    cat_str = str(category or '').strip()
    # 过滤表头残留
    if cat_str == '产品类别' or not cat_str:
        return '配件'  # 不确定就归配件，但实际不会遇到
    
    if any(x in cat_str for x in ['鞋', '靴']):
        return '鞋履'
    elif any(x in cat_str for x in ['服', '衣', '裤', '裙', 'T恤', '卫衣', '外套', '衫', '茄克', '背心', '风衣', '夹克']):
        return '服装'
    elif any(x in cat_str for x in ['配', '袜', '帽', '包', '围巾', '手套', '袋']):
        return '配件'
    else:
        return '配件'  # 兜底改为配件而非其他

def main():
    wb = openpyxl.load_workbook(XLSX_PATH, data_only=True)
    ws = wb.active

    COL_TYPE = 0
    COL_TICKET = 2
    COL_QTY = 9
    COL_AMOUNT = 13
    COL_REMARK = 19
    COL_CATEGORY = 24

    all_rows = []
    for row in ws.iter_rows(min_row=3, values_only=True):
        row_type = str(row[COL_TYPE] or '').strip()
        if not row_type or row_type == '合计':
            continue
        if not row[COL_TICKET]:
            continue
        category_raw = str(row[COL_CATEGORY] or '').strip()
        # 跳过表头残留
        if category_raw == '产品类别':
            continue
        amount = row[COL_AMOUNT] or 0
        qty = row[COL_QTY] or 0
        remark = str(row[COL_REMARK] or '').strip()
        ticket = str(row[COL_TICKET] or '').strip()
        all_rows.append({
            'type': row_type, 'ticket': ticket, 'amount': amount,
            'qty': qty, 'remark': remark, 'category': category_raw,
        })

    # Build ticket -> name mapping
    ticket_to_name = {}
    for r in all_rows:
        if r['type'] == '销售':
            name = match_name(r['remark'])
            if name:
                ticket_to_name[r['ticket']] = name

    data = defaultdict(lambda: {
        'sales': 0, 'qty': 0, 'tickets': set(),
        'categories': defaultdict(lambda: {'sales': 0, 'qty': 0})
    })

    untraced = []

    for r in all_rows:
        name = None
        amount = r['amount']
        qty = r['qty']
        ticket = r['ticket']
        remark = r['remark']
        category = r['category']
        row_type = r['type']

        if row_type == '销售':
            name = match_name(remark)
        elif row_type in ('全退货', '换货'):
            m = re.search(r'小票号:([^,)]+)', remark)
            if m:
                orig_ticket = m.group(1).strip()
                name = ticket_to_name.get(orig_ticket)
                if not name:
                    for t, n in ticket_to_name.items():
                        if orig_ticket in t or t in orig_ticket:
                            name = n
                            break
            if not name:
                name = match_name(remark)
            if not name:
                untraced.append(r)
                continue

        if not name:
            continue

        cat = classify_category(category)

        data[name]['sales'] += amount
        data[name]['qty'] += qty
        if row_type == '销售':
            data[name]['tickets'].add(ticket)
        data[name]['categories'][cat]['sales'] += amount
        data[name]['categories'][cat]['qty'] += qty

    # 生成每人categories字符串
    print("=== 修正后的品类占比 ===\n")
    results = {}
    for name, d in sorted(data.items(), key=lambda x: -x[1]['sales']):
        sales = round(d['sales'])
        cats_str_parts = []
        for cat_name, cd in sorted(d['categories'].items(), key=lambda x: -x[1]['sales']):
            cat_sales = round(cd['sales'])
            pct = round(cat_sales / sales * 100, 1) if sales > 0 else 0
            if cat_sales != 0:
                cats_str_parts.append(f"{cat_name} {pct}%")
        
        cats_str = ' / '.join(cats_str_parts)
        results[name] = cats_str
        
        # 详细输出
        detail_parts = []
        for cat_name, cd in sorted(d['categories'].items(), key=lambda x: -x[1]['sales']):
            cat_sales = round(cd['sales'])
            pct = round(cat_sales / sales * 100, 1) if sales > 0 else 0
            detail_parts.append(f"  {cat_name}: ¥{cat_sales:,} / {cd['qty']}件 ({pct}%)")
        
        print(f"{name} (¥{sales:,}):")
        print('\n'.join(detail_parts))
        print(f"  → categories: '{cats_str}'\n")

    # 保存JSON
    with open('/Users/a86137/Desktop/兼职/安福路兼职管理系统/data/june_categories_fixed.json', 'w', encoding='utf-8') as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    print("Saved to data/june_categories_fixed.json")

    # 对比新旧
    print("\n=== 对比（有变化的） ===")
    old_cats = {
        '李若彤': '鞋履 87.3% / 其他 4.6% / 服装 4.1% / 配件 4.0%',
        '王雅澜': '鞋履 76.6% / 服装 10.9% / 其他 8.8% / 配件 3.7%',
        '孔祥宇': '鞋履 62.2% / 服装 32.9% / 其他 4.9%',
        '王靳毓': '鞋履 69.0% / 服装 13.5% / 其他 10.0% / 配件 7.6%',
        '朱凯赟': '鞋履 68.2% / 其他 25.8% / 服装 5.2% / 配件 0.8%',
        '迟骋': '鞋履 80.0% / 服装 11.6% / 其他 8.4%',
    }
    for name, old in old_cats.items():
        new = results.get(name, '')
        if old != new:
            print(f"\n{name}:")
            print(f"  旧: {old}")
            print(f"  新: {new}")

if __name__ == '__main__':
    main()
