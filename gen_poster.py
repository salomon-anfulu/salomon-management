# -*- coding: utf-8 -*-
"""生成员工更新指引 v155 的单页高清图片（竖版海报，适配手机分享）。"""
from PIL import Image, ImageDraw, ImageFont

W = 2160
MARGIN = 100
CW = W - 2 * MARGIN  # content width
SCALE = 2

PINGFANG = "/System/Library/Fonts/PingFang.ttc"
STHEITI = "/System/Library/Fonts/STHeiti Medium.ttc"

# 颜色
BG = (247, 248, 250)
WHITE = (255, 255, 255)
DARK = (30, 41, 59)
SUB = (100, 116, 139)
EMER = (16, 185, 129)
EMER_D = (5, 150, 105)
AMBER_BG = (254, 243, 199)
AMBER_BD = (245, 158, 11)
AMBER_TX = (146, 94, 10)
CARD_BD = (226, 232, 240)
GREEN_DOT = (16, 185, 129)
RED_TX = (220, 38, 38)

_font_cache = {}

def F(size, bold=False):
    key = (size, bold)
    if key not in _font_cache:
        try:
            _font_cache[key] = ImageFont.truetype(STHEITI if bold else PINGFANG, size)
        except Exception:
            _font_cache[key] = ImageFont.truetype(PINGFANG, size)
    return _font_cache[key]

def lerp(c1, c2, t):
    return tuple(int(c1[i] + (c2[i] - c1[i]) * t) for i in range(3))

def wrap(text, font, max_w):
    """按 CJK 逐字、英文按词换行。"""
    units = []
    buf = ""
    for ch in text:
        if ch == " ":
            if buf:
                units.append(buf); buf = ""
            units.append(" ")
        elif ord(ch) > 0x2E80:  # CJK / 全角
            if buf:
                units.append(buf); buf = ""
            units.append(ch)
        else:
            buf += ch
    if buf:
        units.append(buf)
    lines = []
    cur = ""
    cur_w = 0
    for u in units:
        if u == " ":
            if cur:
                cur += " "
                cur_w = font.getlength(cur)
            continue
        u_w = font.getlength(u)
        if u_w > max_w:  # 超长单元（URL/英文单词）逐字断
            for ch in u:
                cw = font.getlength(ch)
                if cur and cur_w + cw > max_w:
                    lines.append(cur); cur = ch; cur_w = cw
                else:
                    cur += ch; cur_w += cw
            continue
        add_w = font.getlength(cur + u) if cur else u_w
        if cur and add_w > max_w:
            lines.append(cur); cur = u; cur_w = u_w
        else:
            cur = (cur + u) if cur else u
            cur_w = add_w
    if cur:
        lines.append(cur)
    return lines

class Poster:
    def __init__(self):
        self.img = Image.new("RGB", (W, 6000), BG)
        self.d = ImageDraw.Draw(self.img)
        self.y = 0

    def space(self, h):
        self.y += h

    def header(self):
        top = 0
        h = 380
        # 渐变
        for yy in range(top, top + h):
            t = (yy - top) / h
            col = lerp(EMER_D, EMER, t)
            self.d.line([(0, yy), (W, yy)], fill=col)
        # 标题
        self.d.text((MARGIN, 70), "安福路 Salomon 兼职管理系统", font=F(78, True), fill=WHITE)
        self.d.text((MARGIN, 175), "员工更新指引 · v155", font=F(50, True), fill=(236, 253, 245))
        # 标签胶囊
        tag = "退出登录  →  清缓存  →  重开登录   （约 3 分钟）"
        tf = F(40)
        tw = tf.getlength(tag)
        ty = 280
        self.d.rounded_rectangle([MARGIN, ty, MARGIN + tw + 48, ty + 70], radius=35, fill=(255, 255, 255))
        self.d.text((MARGIN + 24, ty + 14), tag, font=tf, fill=EMER_D)
        self.y = top + h + 50

    def section_title(self, num, text):
        self.space(30)
        # 编号圆
        r = 34
        cy = self.y + 30
        self.d.ellipse([MARGIN, cy - r, MARGIN + 2 * r, cy + r], fill=EMER)
        self.d.text((MARGIN + 22, cy - 26), str(num), font=F(46, True), fill=WHITE)
        self.d.text((MARGIN + 2 * r + 28, self.y + 8), text, font=F(58, True), fill=DARK)
        self.y += 100
        self.space(14)

    def card(self, lines, fill=WHITE, border=CARD_BD, pad=34, radius=28, font_size=40, color=DARK, bold=False, lh=1.45, top=None):
        # 先把每行处理成 (text, opts)；opts 可含 size/indent/color/bold
        items = []
        for item in lines:
            if isinstance(item, tuple):
                txt, opts = item
            else:
                txt, opts = item, {}
            items.append((txt, opts))
        # 预计算每行字体与换行
        rendered = []  # (font, color, indent, lines_of_text)
        for txt, opts in items:
            f = F(opts.get("font_size", font_size), opts.get("bold", bold))
            for ln in wrap(txt, f, CW - 2 * pad):
                rendered.append((f, opts.get("color", color), opts.get("indent", 0), ln))
        # 行高按每行各自字体
        def line_h(f):
            return int(f.size * (opts.get("lh", 1.45) if False else 1.45))
        h = pad * 2 + sum(line_h(f) + (lh - 1) * 4 for (f, *_) in rendered) + 10
        # 简化：统一用基础 lh
        h = pad * 2 + sum(int(f.size * 1.45) for (f, *_) in rendered) + 10
        y0 = top if top is not None else self.y
        # 阴影
        self.d.rounded_rectangle([MARGIN + 6, y0 + 10, MARGIN + CW + 6, y0 + h + 10], radius=radius, fill=(203, 213, 225))
        self.d.rounded_rectangle([MARGIN, y0, MARGIN + CW, y0 + h], radius=radius, fill=fill, outline=border, width=3)
        ty = y0 + pad
        for f, col, ind, ln in rendered:
            self.d.text((MARGIN + pad + ind, ty), ln, font=f, fill=col)
            ty += int(f.size * 1.45)
        self.y = y0 + h
        return y0, h

    def bullets(self, items, font_size=40, color=DARK, lh=1.5, dot=EMER, pad_left=58):
        f = F(font_size)
        lh_px = int(font_size * lh)
        for it in items:
            txt = it if isinstance(it, str) else it[0]
            sub = it[1] if isinstance(it, tuple) and len(it) > 1 else None
            # 圆点
            self.d.ellipse([MARGIN + 18, self.y + font_size * 0.42, MARGIN + 18 + 16, self.y + font_size * 0.42 + 16], fill=dot)
            for i, ln in enumerate(wrap(txt, f, CW - pad_left - 30)):
                self.d.text((MARGIN + pad_left, self.y), ln, font=f, fill=color)
                self.y += lh_px
            if sub:
                self.d.text((MARGIN + pad_left, self.y), sub, font=F(32), fill=SUB)
                self.y += int(32 * 1.4)
        self.space(6)

    def note(self, title, text):
        f = F(38)
        lh_px = int(38 * 1.5)
        wrapped = wrap(text, f, CW - 80)
        h = 76 + lh_px * len(wrapped) + 30
        y0 = self.y
        self.d.rounded_rectangle([MARGIN, y0, MARGIN + CW, y0 + h], radius=24, fill=AMBER_BG, outline=AMBER_BD, width=3)
        # 左侧色条
        self.d.rectangle([MARGIN, y0, MARGIN + 14, y0 + h], fill=AMBER_BD)
        self.d.text((MARGIN + 40, y0 + 26), title, font=F(42, True), fill=AMBER_TX)
        ty = y0 + 26 + int(42 * 1.3)
        for ln in wrapped:
            self.d.text((MARGIN + 40, ty), ln, font=f, fill=(120, 80, 10))
            ty += lh_px
        self.y = y0 + h + 24

    def label(self, text, color=EMER_D, size=44):
        self.space(16)
        self.d.text((MARGIN, self.y), text, font=F(size, True), fill=color)
        self.y += int(size * 1.5)

    def faq(self, items):
        fq = F(38, True)
        fa = F(36)
        lhq = int(38 * 1.5)
        lha = int(36 * 1.55)
        for q, a in items:
            # Q 块
            qw = fq.getlength("Q ")
            for ln in wrap(q, fq, CW - 60 - qw):
                self.d.text((MARGIN, self.y), "Q ", font=fq, fill=EMER_D)
                self.d.text((MARGIN + qw, self.y), ln, font=fq, fill=DARK)
                self.y += lhq
            # A 块
            aw = fa.getlength("A ")
            for ln in wrap(a, fa, CW - 60 - aw):
                self.d.text((MARGIN, self.y), "A ", font=fa, fill=SUB)
                self.d.text((MARGIN + aw, self.y), ln, font=fa, fill=(71, 85, 105))
                self.y += lha
            self.y += 22
        self.space(8)

    def footer(self, text):
        self.space(20)
        self.d.line([(MARGIN, self.y), (MARGIN + CW, self.y)], fill=CARD_BD, width=2)
        self.space(24)
        for ln in wrap(text, F(34), CW):
            self.d.text((MARGIN, self.y), ln, font=F(34), fill=SUB)
            self.y += int(34 * 1.4)
        self.space(20)

    def finalize(self, path):
        self.img = self.img.crop((0, 0, W, self.y + 40))
        self.img.save(path, "PNG")
        print("saved", path, self.img.size)

p = Poster()
p.header()

# 好处
p.section_title(1, "这次更新了什么好处")
p.bullets([
    ("多人实时同步：任何人的填报 / 修改，其他人的手机、电脑几秒内自动更新，无需手动点「同步」。", None),
    ("账号更安全：从全员共用一个口令，升级为每人独立密码，首次登录强制设置自己的密码。", None),
    ("状态更清晰：去掉旧版「仅本地」误报，连上云端即显示绿色「已同步」。", None),
])
p.note("⚠ 为什么必须清缓存？",
       "你的手机 / 浏览器里还存着旧版本页面文件。不清理，打开的仍是旧界面，看不到新功能。这一步让所有人的设备都加载到最新版（v155）。")

# 核心三步
p.section_title(2, "核心三步操作")
p.label("第 ① 步 · 退出登录")
p.card([
    "1. 打开系统（任意已登录的页面）。",
    "2. 点右上角你的名字 / 头像，找到「退出登录」并点击。",
    "3. 已停留在登录页可跳过这步。",
    (("提示：退出登录只断开云端账号，本机旧缓存还在，必须继续下一步。"), {"color": SUB, "font_size": 34}),
])

p.label("第 ② 步 · 清除网站数据（最关键）★")
p.card([
    ("📱 iPhone / iPad（Safari）", {"bold": True, "color": EMER_D}),
    "  1. 关闭本系统页面，回到手机桌面。",
    "  2. 打开「设置」→「Safari 浏览器」→「高级」→「网站数据」。",
    "  3. 搜索 salomon，左滑 salomon-anfulu.github.io → 删除。",
    ("📱 安卓（Chrome / Edge）", {"bold": True, "color": EMER_D}),
    "  方式A（推荐）：打开页面 → 点地址栏 🔒 →「网站设置」→「清除和重置」。",
    "  方式B：⋮ →「历史记录」→「清除浏览数据」→ 时间选「不限」，勾选",
    "  Cookie 和网站数据 + 缓存图片 → 清除。",
    ("💻 电脑", {"bold": True, "color": EMER_D}),
    "  Chrome/Edge：地址栏 🔒 →「网站设置」→ 清除数据。",
    "  Safari(Mac)：设置 → 隐私 → 管理网站数据 → 移除 salomon。",
])

p.label("第 ③ 步 · 重新打开并登录")
p.card([
    "重新在浏览器输入网址（别用旧标签页）：",
    ("https://salomon-anfulu.github.io/salomon-management/", {"color": EMER_D, "bold": True}),
    "页面自动跳到登录页，输入账号密码（见下节）。",
])

# 重新登录后
p.section_title(3, "重新登录后的操作")
p.label("1. 登录")
p.card([
    ("邮箱：拼音@salomon.temp（如 田佳乐 → tianjiale@salomon.temp）", {"color": DARK}),
    ("首次密码：Salomon2026!（字母 S 大写，含 ! ）", {"color": RED_TX, "bold": True}),
])
p.label("2. 首次登录强制修改密码（重要）")
p.card([
    "登录后自动弹出「首次登录须修改密码」窗口：",
    "• 当前密码：填 Salomon2026!。",
    "• 新密码：至少 8 位（建议字母 + 数字，好记）。",
    "• 确认新密码：再输一次。",
    ("修改成功后，以后用你自己的新密码登录；请务必记住。", {"color": SUB, "font_size": 34}),
])
p.label("3. 确认数据正常")
p.card([
    "顶部状态点应为绿色「已同步」。",
    "查看「我的填报 / 考勤记录」，历史数据都在（云端自动拉回）。",
    "之后正常填报即可，无需手动点「同步」。",
])
p.label("4. 日常使用")
p.card([
    "修改 / 填报自动同步给所有人。",
    "换手机、换浏览器用同一邮箱登录，数据自动出现。",
    "想改密码：点右上角「修改密码」。",
])

# FAQ
p.section_title(4, "常见问题 FAQ")
p.faq([
    ("忘记登录邮箱？", "规则是 拼音@salomon.temp，不确定的问组长或管理员核对名单。"),
    ("提示「邮箱或密码错误」？", "确认拼音全小写；首次密码 Salomon2026!（注意大小写）；已改过用新密码；忘记联系管理员。"),
    ("清缓存后历史填报还在吗？", "在的。数据存在云端，清的是本地旧缓存，登录后自动拉回。"),
    ("之前一直显示「仅本地」？", "那是旧版显示误报（基于已废弃的旧同步方案），现已修复，连云端即「已同步」。"),
    ("iOS 找不到「网站数据」？", "路径：设置 → Safari → 高级 → 网站数据（页面最底部）。"),
    ("不清理缓存直接用旧页面行不行？", "不行。旧缓存让你停留旧版本，看不到实时同步、也收不到强制改密提示，有安全隐患。"),
])

p.footer("本指引对应系统版本 v155 ｜ 操作中遇到问题，请截图联系管理员")

p.finalize("/Users/a86137/Desktop/兼职/安福路兼职管理系统/员工更新指引_v155.png")
