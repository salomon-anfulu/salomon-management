#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Service Team 6月 vs 7月 表现复盘 — 数据整合脚本 (v2, 导出文件为单一权威源)
-------------------------------------------------------------------------
输入(单一): 命令行第一个参数 = 线上导出的 app_data JSON
            (结构: {_exportMeta, data:{staff, availability, doorSchedule, storeSupport,
                     customerReviews, linggongAttendance, performanceData, ratings, ...}})
输出: scripts/review_data.json  (每人员/每月/每维度指标, 含评分要素输入)
      stdout 逐人汇总表

维度覆盖:
  1 可排班 availability (total=可排班天数)
  2 考勤   linggongAttendance (工时 + 状态分布)
  3 门迎   doorSchedule (slot 次数 + 天数)
  4 店务   storeSupport (条数 + 类型分布)
  5 好评   customerReviews (条数 + 均分)
  6 业绩   performanceData (sales/qty/tickets/upt/avgPrice/workHours/hourlyOutput/salesShare)
  7 评分   ratings (5维 scores/avgScore; 7月多为"待评"占位 -> 同时给出评分要素输入 rating_inputs)
"""
import json
import sys
import os
from collections import defaultdict, Counter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "scripts", "review_data.json")
MONTHS = ["2026-06", "2026-07"]
PERF_MONTH_MAP = {"2026-06": "june", "2026-07": "july"}


def load(path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def month_of(date_str):
    if not date_str:
        return None
    for sep in ("-", "/"):
        parts = str(date_str).split(sep)
        if len(parts) >= 2:
            return f"{parts[0]}-{parts[1]}"
    return None


def to_float(v):
    try:
        return float(v) if v not in (None, "") else 0.0
    except (TypeError, ValueError):
        return 0.0


def main():
    if len(sys.argv) < 2:
        print("[error] 用法: python3 build_review_data.py <导出JSON路径>")
        sys.exit(1)
    if not os.path.exists(sys.argv[1]):
        print(f"[error] 文件不存在: {sys.argv[1]}")
        sys.exit(1)

    exp = load(sys.argv[1])
    meta = exp.get("_exportMeta", {})
    data = exp.get("data", exp)  # 容错: 直接给 data 也可
    print(f"[ok] 载入导出文件: {sys.argv[1]}")
    print(f"[ok] 导出版本: {meta.get('dataVersion')} | 时间: {meta.get('exportTime')}")

    # ---- 名单: 全部 Service Team (含离职, 用于去留复盘) ----
    staff = data.get("staff", [])
    st_roster = [s for s in staff if s.get("dept") == "Service Team"]
    st_names = [s["name"] for s in st_roster]
    id2name = {s["id"]: s["name"] for s in staff}
    name2id = {s["name"]: s["id"] for s in staff}
    print(f"[info] Service Team {len(st_names)} 人: {st_names}")

    result = {"source": "export", "exportMeta": meta,
              "months": MONTHS, "staff": [], "metrics": {}}
    for s in st_roster:
        result["staff"].append({
            "name": s["name"], "status": s.get("status"),
            "left": s.get("status") == "left",
            "serviceTeamStartDate": s.get("serviceTeamStartDate"),
        })

    # ---- 1 可排班 availability ----
    av_months = data.get("availability", {}).get("months", {})
    for name in st_names:
        m = result["metrics"].setdefault(name, {})
        m["availability"] = {}
        for mo in MONTHS:
            blk = av_months.get(mo, {})
            p = blk.get("data", {}).get(name, {}) if isinstance(blk, dict) else {}
            total = p.get("total") if isinstance(p, dict) else None
            m["availability"][mo] = {"total": total}

    # ---- 2 考勤 linggongAttendance ----
    la = data.get("linggongAttendance", {})
    la_recs = la.get("records", []) if isinstance(la, dict) else (la if isinstance(la, list) else [])
    att_by_name = defaultdict(list)
    for r in la_recs:
        if isinstance(r, dict) and r.get("name") in st_names:
            att_by_name[r["name"]].append(r)
    for name in st_names:
        m = result["metrics"].setdefault(name, {})
        m["attendance"] = {}
        for mo in MONTHS:
            recs = [r for r in att_by_name[name] if month_of(r.get("date")) == mo]
            sb = Counter(r.get("status", "未知") for r in recs)
            hours = sum(to_float(r.get("totalHours")) for r in recs)
            m["attendance"][mo] = {
                "records": len(recs), "hours": round(hours, 1),
                "status_breakdown": dict(sb),
                "anomaly": sb.get("打卡异常", 0) + sb.get("打卡进行中", 0),
                "absent": sb.get("缺勤", 0), "cancel": sb.get("取消", 0),
            }

    # ---- 3 门迎 doorSchedule ----
    ds = data.get("doorSchedule", [])
    ds_list = ds if isinstance(ds, list) else (ds.get("days", []) if isinstance(ds, dict) else [])
    for name in st_names:
        m = result["metrics"].setdefault(name, {})
        m["door"] = {}
        for mo in MONTHS:
            slots = days = 0
            seen = set()
            for day in ds_list:
                if not isinstance(day, dict) or month_of(day.get("date")) != mo:
                    continue
                for sl in day.get("slots", []):
                    if sl.get("staff") == name:
                        slots += 1
                        seen.add(day.get("date"))
            m["door"][mo] = {"slots": slots, "days": len(seen)}

    # ---- 4 店务 storeSupport ----
    ss = data.get("storeSupport", [])
    for name in st_names:
        m = result["metrics"].setdefault(name, {})
        m["storeSupport"] = {}
        for mo in MONTHS:
            recs = [r for r in ss if isinstance(r, dict)
                    and r.get("staff") == name and month_of(r.get("date")) == mo]
            m["storeSupport"][mo] = {
                "count": len(recs),
                "by_type": dict(Counter(r.get("type", "未分类") for r in recs)),
            }

    # ---- 5 好评 customerReviews ----
    cr = data.get("customerReviews", [])
    for name in st_names:
        m = result["metrics"].setdefault(name, {})
        m["reviews"] = {}
        for mo in MONTHS:
            recs = [r for r in cr if isinstance(r, dict)
                    and r.get("staffName") == name and r.get("month") == mo]
            rs = [r.get("rating") for r in recs if isinstance(r.get("rating"), (int, float))]
            m["reviews"][mo] = {
                "count": len(recs),
                "avg_rating": round(sum(rs) / len(rs), 2) if rs else 0,
            }

    # ---- 6 业绩 performanceData ----
    perf = data.get("performanceData", {})
    for name in st_names:
        m = result["metrics"].setdefault(name, {})
        m["performance"] = {}
        for mo in MONTHS:
            blk = perf.get(PERF_MONTH_MAP[mo], {})
            recs = blk.get("records", []) if isinstance(blk, dict) else []
            rec = next((r for r in recs if r.get("name") == name), None)
            m["performance"][mo] = (rec if rec else None)

    # ---- 7 评分 ratings + 评分要素输入 ----
    ratings = data.get("ratings", [])
    for name in st_names:
        m = result["metrics"].setdefault(name, {})
        m["ratings"] = {}
        m["rating_inputs"] = {}
        sid = name2id.get(name)
        for mo in MONTHS:
            rec = next((r for r in ratings if isinstance(r, dict)
                        and r.get("staffId") == sid and r.get("month") == mo), None)
            if rec:
                pending = (to_float(rec.get("avgScore")) == 0) or ("待评" in (rec.get("comment") or ""))
                m["ratings"][mo] = {
                    "pending": pending,
                    "scores": rec.get("scores", {}),
                    "avgScore": rec.get("avgScore"),
                    "hourlyRate": rec.get("hourlyRate"),
                    "comment": rec.get("comment"),
                }
            else:
                m["ratings"][mo] = None
            # 评分要素输入 (raw)
            av = m["availability"][mo]["total"]
            pf = m["performance"][mo] or {}
            dr = m["door"][mo]["slots"]
            stc = m["storeSupport"][mo]["count"]
            at = m["attendance"][mo]
            rv = m["reviews"][mo]["count"]
            m["rating_inputs"][mo] = {
                "avail_days": av,
                "sales": pf.get("sales"),
                "hourlyOutput": pf.get("hourlyOutput"),
                "upt": pf.get("upt"),
                "door_slots": dr,
                "store_count": stc,
                "attendance_status": at.get("status_breakdown", {}),
                "review_count": rv,
            }

    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
    print(f"[ok] 已写出整合数据 -> {OUT}")

    # ---- 控制台汇总 ----
    print("\n===== 逐人 6月→7月 汇总 (业绩=销售额¥ / 评分=综合均分 或 待评) =====")
    hdr = (f"{'姓名':<6}{'可排班':>10}{'工时(h)':>12}{'门迎':>8}{'店务':>8}"
           f"{'好评':>8}{'销售额¥':>12}{'时产':>8}{'评分':>10}")
    print(hdr)
    print("-" * len(hdr))
    for name in st_names:
        mt = result["metrics"][name]
        a = f"{mt['availability']['2026-06']['total']}→{mt['availability']['2026-07']['total']}"
        h = f"{mt['attendance']['2026-06']['hours']}→{mt['attendance']['2026-07']['hours']}"
        d = f"{mt['door']['2026-06']['slots']}→{mt['door']['2026-07']['slots']}"
        s = f"{mt['storeSupport']['2026-06']['count']}→{mt['storeSupport']['2026-07']['count']}"
        r = f"{mt['reviews']['2026-06']['count']}→{mt['reviews']['2026-07']['count']}"
        p6 = (mt['performance']['2026-06'] or {}).get('sales')
        p7 = (mt['performance']['2026-07'] or {}).get('sales')
        ps = f"{(p6 if p6 is not None else '—')}→{(p7 if p7 is not None else '—')}"
        ho6 = (mt['performance']['2026-06'] or {}).get('hourlyOutput')
        ho7 = (mt['performance']['2026-07'] or {}).get('hourlyOutput')
        ho = f"{(ho6 if ho6 is not None else '—')}→{(ho7 if ho7 is not None else '—')}"
        rt6 = mt['ratings']['2026-06']
        rt7 = mt['ratings']['2026-07']
        if rt6 and not rt6.get('pending'):
            rts = f"{rt6['avgScore']}→" + ("待评" if (rt7 and rt7.get('pending')) else (str(rt7['avgScore']) if rt7 else "—"))
        else:
            rts = "—→" + ("待评" if rt7 and rt7.get('pending') else "—")
        print(f"{name:<6}{a:>10}{h:>12}{d:>8}{s:>8}{r:>8}{ps:>12}{ho:>8}{rts:>10}")
    print("\n[说明] 7月评分在系统中均为'待评'占位, 汇总仅显示 6月真实综合分→7月待评。")


if __name__ == "__main__":
    main()
