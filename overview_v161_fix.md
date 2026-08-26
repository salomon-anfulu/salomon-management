# v161 修复概述：v160 致命语法错误（登录后全模块空白）

## 问题
用户登录后所有功能模块不显示、无法切换。浏览器 Console 报错：
```
Uncaught SyntaxError: Unexpected token ';' (at app.js?v=160:5918:2)
→ Store is not defined (change-password.js / index.html:311)
→ GET app_data 全部 406
```
整页空白是 `app.js` 解析失败导致 `Store` 全局对象未定义，连锁所有模块加载失败。

## 根因
v160 提交在修改 `_dataVersion` 时**误删了 `defaults` 子对象的闭合 `}`**：
```diff
-    _dataVersion: '2026-07-31-v159',  },
+    _dataVersion: '2026-07-31-v160',
```
删除行尾 `}` 后，`const Store = {` 的 `defaults` 子对象永不闭合——`_cache`、全部方法、直到 5918 行的 `}` 都被吞进这个未闭合的 `defaults` 对象里。
最终 5918 行的 `}` 只闭合了 `defaults`，`Store` 自身仍未闭合 → acorn 在 5918 报 `Unexpected token ';`，
整文件解析失败，`Store` 未定义，连锁全部模块崩溃。

验证：`git show` 父提交 v159 的 `app.js` 单独 `node --check` 通过，v160 (HEAD) 失败 → 确认 v160 引入。

## 修复内容
1. **app.js:5383** 补回 `}` 闭合 `defaults` 子对象（与 v159 结构对齐）：
   ```js
       _dataVersion: '2026-07-31-v161',
     },
   ```
2. **缓存版本 bump v160 → v161**（确保浏览器/SW 不再喂坏缓存）：
   - `index.html` `?v=` ×7、`login.html` `?v=` ×2
   - `sw.js` 缓存键 `sw/static/img-v161`
   - `version.json` `dataVersion` + `cacheBuster`
   - `app.js` `_dataVersion` + `DATA_VERSION`
3. **顺手修复 `version.json` 既有非法 JSON**（note 中游离双引号 `SQL" 解决` → `SQL，解决`；HEAD 版本本就是坏 JSON）。
4. 保留先前 3 处注释内特殊字符转义（非本次根因）。

## 验证
- `node --check js/app.js` ✅ 通过
- acorn tokenizer 花括号深度扫描：final depth = 0（平衡）✅
- `version.json` 合法 JSON ✅
- `js/*.js` 全部语法检查通过 ✅

## 部署
- commit `e420404` 已 push 到 `origin/main`（GitHub Pages 自动部署）。
- 用户**硬刷新**（Cmd+Shift+R）或关闭所有标签页重开即可加载 v161（因 `?v=` 变化，SW 自然拉新缓存；启动探针检测到 cacheBuster 变化会清缓存 reload）。

## 永久教训
改对象字面量/数据数组时务必保住闭合括号——`},` 误改成 `,` 看似只去逗号，实际连 `}` 一起删了，整文件崩。
每次大改数据数组后必跑 `node --check`。
