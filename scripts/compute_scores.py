#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Service Team 月度「表现评分」(0-5 量表) — 固定基准归一化版。
每个维度按"优秀基准"封顶，达到/超过即 5.0；0 为未达成。权重参照系统 5维。
"""
import json, os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
D = json.load(open(os.path.join(ROOT, "scripts", "review_data.json"), encoding="utf-8"))
names = [s["name"] for s in D["staff"]]
M = D["metrics"]
STATUS = {s["name"]: ("离职" if s.get("left") else ("转正" if s.get("status") == "full_time" else "在职")) for s in D["staff"]}
NEW = {"贾长乐", "玛依拉", "梁实秋", "唐蓉"}

# (key, weight, ceiling, getter)
COMP = [
    ("sales",   0.25, 20000, lambda n, mo: (M[n]["performance"][mo] or {}).get("sales") or 0),
    ("avail",   0.20, 28,    lambda n, mo: (M[n]["availability"][mo] or {}).get("total") or 0),
    ("attend",  0.15, 220,   lambda n, mo: M[n]["attendance"][mo]["hours"]),
    ("door",    0.15, 28,    lambda n, mo: M[n]["door"][mo]["slots"]),
    ("store",   0.15, 25,    lambda n, mo: M[n]["storeSupport"][mo]["count"]),
    ("review",  0.10, 4,     lambda n, mo: M[n]["reviews"][mo]["count"]),
]

def clip(v):
    return max(0.0, min(1.0, v))

def comp_score(n, mo):
    s = 0.0
    for key, w, ceil, fn in COMP:
        raw = fn(n, mo)
        s += w * clip(raw / ceil) * 5
    return s

def composite_all(mo):
    return {n: comp_score(n, mo) for n in names}

july = composite_all("2026-07")
june = composite_all("2026-06")
combined = {n: (june[n] + july[n]) / 2 for n in names}

def comp_breakdown(n, mo):
    return {key: round(clip(fn(n, mo) / ceil) * 5, 2) for key, w, ceil, fn in COMP}

print("权重: 业绩25% 工时支持20% 考勤15% 门迎15% 店务15% 好评10%  | 固定基准封顶(优秀线)")
print("基准: 销售¥20k / 排班28天 / 工时220h / 门迎28次 / 店务25条 / 好评4条\n")

def show(title, dct, rev=True):
    print(f"=== {title} ===")
    for n, v in sorted(dct.items(), key=lambda x: x[1], reverse=rev):
        print(f"  {n:<5} {v:4.2f}  [{STATUS[n]}]")

show("7月 表现评分", july)
show("6月 表现评分", june)
show("6+7月 综合评分", combined)

print("\n=== 7月 Top3 ===")
for i, (n, v) in enumerate(sorted(july.items(), key=lambda x: x[1], reverse=True)[:3], 1):
    bd = comp_breakdown(n, "2026-07")
    best = max(bd, key=bd.get); worst = min(bd, key=bd.get)
    print(f"  #{i} {n} {v:.2f}  强={best}({bd[best]}) 弱={worst}({bd[worst]})  raw: 销售{M[n]['performance']['2026-07'].get('sales') if M[n]['performance']['2026-07'] else 0} 排班{(M[n]['availability']['2026-07'] or {}).get('total')} 门迎{M[n]['door']['2026-07']['slots']} 店务{M[n]['storeSupport']['2026-07']['count']} 好评{M[n]['reviews']['2026-07']['count']}")

# 不达标: 在职常规成员(排除转正/离职/新入职), 综合<3.0 或 考勤异常
REG = [n for n in names if STATUS[n] == "在职" and n not in NEW]
print(f"\n=== 7月 待改进/不达标 (在职常规, 排除新入职4人; 综合<3.0 或 考勤异常) ===")
fails = []
for n in REG:
    at = M[n]["attendance"]["2026-07"]
    anom = at["anomaly"] + at["absent"] + at["cancel"]
    reason = []
    if july[n] < 3.0:
        reason.append(f"综合{july[n]:.2f}<3.0")
    if anom > 0:
        reason.append(f"考勤异常{anom}次")
    if reason:
        fails.append((n, reason))
for n, r in sorted(fails, key=lambda x: july[x[0]]):
    bd = comp_breakdown(n, "2026-07")
    weak = sorted(bd, key=bd.get)[:2]
    print(f"  {n:<5} 综合{july[n]:.2f}  原因={r}  短板={weak}({', '.join(f'{k}:{bd[k]}' for k in weak)})")

print("\n=== 特殊状态人员 (不计入不达标判定, 仅说明) ===")
for n in names:
    if n in NEW or STATUS[n] in ("转正", "离职"):
        at = M[n]["attendance"]["2026-07"]; anom = at["anomaly"]+at["absent"]+at["cancel"]
        print(f"  {n:<5} [{STATUS[n]}] 综合{july[n]:.2f} 排班{(M[n]['availability']['2026-07'] or {}).get('total')} 销售{(M[n]['performance']['2026-07'] or {}).get('sales') or 0} 异常{anom}")

# 6+7 最低3 (排除贾/玛/梁/唐)
pool = [n for n in names if n not in NEW]
low3 = sorted(pool, key=lambda n: combined[n])[:3]
print(f"\n=== 6+7月 最低3 (已排除 {','.join(NEW)}) ===")
for i, n in enumerate(low3, 1):
    print(f"  #{i} {n:<5} 综合{combined[n]:.2f} 6月{june[n]:.2f} 7月{july[n]:.2f} [{STATUS[n]}]")

st_jul = sum(M[n]["attendance"]["2026-07"]["hours"] for n in names)
print(f"\nST-only 7月总工时 = {st_jul:.0f}h (17人)")
