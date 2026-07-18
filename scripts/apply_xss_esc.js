#!/usr/bin/env node
/**
 * v115 P0-1: XSS 转义层批量应用脚本
 * 将 pages.js 中所有用户输入字段的模板插值包裹 _esc()
 *
 * 安全策略：
 * - 只包裹指定字段（白名单），不动其他插值
 * - 跳过已有 _esc( 的行（防重复包裹）
 * - 跳过 .test() / .match() 等正则上下文（不输出 HTML）
 */

const fs = require('fs');
const filePath = 'js/pages.js';
let code = fs.readFileSync(filePath, 'utf8');
const lines = code.split('\n');

// 用户可控字段 → 匹配模式（变量名前缀 + 字段名）
// 格式: [字段名, [变量前缀列表]]
const FIELD_MAP = {
  // 自由文本输入（最高危）
  snippet:   ['rv', 'r', 'review'],
  comment:   ['r', 'myRating'],
  keywords:  ['review', 'data', 'r'],
  note:      ['status'],

  // 姓名/标识（管理员可编辑）
  name:      ['s', 'r', 'p', 'w', 'stats', 'me', 'staff', 'staff\\[idx\\]'],

  // 详情/描述
  detail:    ['s', 'rec'],
  desc:      ['a', 'd', 'role', 'dim'],

  // 支援记录
  staff:     ['s', 'slot'],
  staffName: ['r'],
  type:      ['s', 'rec'],
};

// 衍生值函数/索引（需要包裹返回值）
const DERIVED_PATTERNS = [
  /(\$\{)(getInitials\([^)]+\.name\))(\})/g,
  /(\$\{)([a-zA-Z_]+\.name\[0\])\}/g,
  /(\$\{)([a-zA-Z_]+\.name\.slice\([^)]+\))\}/g,
];

let changeCount = 0;
const changedLines = [];

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  let modified = line;

  // 跳过：不含 ${ 的行、已有 _esc 的行、正则匹配行
  if (!modified.includes('${') || modified.includes('_esc(') || modified.includes('.test(') || modified.includes('.match(')) {
    continue;
  }

  // 1. 处理衍生值：getInitials(x.name), x.name[0], x.name.slice(-2)
  for (const pattern of DERIVED_PATTERNS) {
    const newMod = modified.replace(pattern, (match, p1, p2, p3) => {
      changeCount++;
      changedLines.push(`  L${i+1}: ${match.trim().substring(0, 80)}`);
      return `${p1}_esc(${p2})${p3 || '}'}`;
    });
    modified = newMod;
  }

  // 2. 处理属性上下文：value="${x.field}" 和 title="${x.field}"
  // 匹配 ="...${var.field}..." 在属性值中
  const attrPattern = /="(?:[^"]*\$\{)?([a-zA-Z_][a-zA-Z0-9_[\]]*(?:\.\w+)*)\}[^"]*"/g;

  // 3. 处理文本上下文：${var.field} 或 ${var.field || 'default'}
  for (const [field, prefixes] of Object.entries(FIELD_MAP)) {
    for (const prefix of prefixes) {
      // 匹配 ${prefix.field} 或 ${prefix.field || 'xxx'} 或 ${prefix.field?.xxx}
      // 不匹配已有 _esc( 的
      const cleanPrefix = prefix.replace(/\\/g, '');

      // Pattern: ${var.field} possibly with || default or ?. chaining
      const re = new RegExp(
        `\\$\\{(${cleanPrefix}\\.${field})(\\s*\\|\\|[^}]*)?\\}`,
        'g'
      );

      modified = modified.replace(re, (match, expr, suffix) => {
        // Check if already inside _esc( by looking backwards
        const before = modified.substring(0, modified.indexOf(match));
        if (before.lastIndexOf('_esc(') > before.lastIndexOf(')') && before.lastIndexOf('_esc(') !== -1) {
          return match; // already escaped
        }
        changeCount++;
        changedLines.push(`  L${i+1}: ${match.trim().substring(0, 80)}`);
        if (suffix) {
          return `\${_esc(${expr}${suffix})}`;
        }
        return `\${_esc(${expr})}`;
      });
    }
  }

  lines[i] = modified;
}

// Write back
fs.writeFileSync(filePath, lines.join('\n'));
console.log(`✓ 完成：共修改 ${changeCount} 处插值`);
console.log(`修改的行：`);
changedLines.forEach(l => console.log(l));
