#!/usr/bin/env node
/**
 * Supabase Admin API 批量创建用户脚本
 *
 * 为什么需要这个脚本：
 *   Supabase SQL Editor 的 postgres 角色无权 INSERT auth.users
 *   （owner 是 supabase_auth_admin，且 SET ROLE 被禁止）
 *   官方唯一途径是 Admin API + service_role 密钥
 *
 * 用法：
 *   1. 把 service_role 密钥保存到 supabase/service_role.key（单行，无空格无引号）
 *   2. node supabase/create_users.mjs
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ---------- 配置 ----------
const SUPABASE_URL = 'https://oiisdkprulysjbgeiyzh.supabase.co';
const KEY_FILE = join(__dirname, 'service_role.key');
const DEFAULT_PASSWORD = 'Salomon2026!';

// 23 个账号（22 兼职 + 1 管理员）
const USERS = [
  { email: 'tianjiale@salomon.temp',    name: '田佳乐',   staffId: 1,  role: 'parttime' },
  { email: 'chicheng@salomon.temp',      name: '迟骋',     staffId: 2,  role: 'parttime' },
  { email: 'wangjinyu@salomon.temp',     name: '王靳毓',   staffId: 3,  role: 'parttime' },
  { email: 'zhukaiyun@salomon.temp',     name: '朱凯赟',   staffId: 4,  role: 'parttime' },
  { email: 'kongxiangyu@salomon.temp',   name: '孔祥宇',   staffId: 5,  role: 'parttime' },
  { email: 'dengqiyuan@salomon.temp',    name: '邓奇缘',   staffId: 6,  role: 'parttime' },
  { email: 'yangzihao@salomon.temp',     name: '杨子豪',   staffId: 7,  role: 'parttime' },
  { email: 'wangyalan@salomon.temp',     name: '王雅澜',   staffId: 8,  role: 'parttime' },
  { email: 'liruotong@salomon.temp',     name: '李若彤',   staffId: 9,  role: 'parttime' },
  { email: 'wanglongyu@salomon.temp',    name: '王龙宇',   staffId: 10, role: 'parttime' },
  { email: 'heqiuye@salomon.temp',       name: '何秋烨',   staffId: 11, role: 'parttime' },
  { email: 'gongyunhao@salomon.temp',    name: '龚赟昊',   staffId: 12, role: 'parttime' },
  { email: 'tangrong@salomon.temp',      name: '唐蓉',     staffId: 13, role: 'parttime' },
  { email: 'lijianhua@salomon.temp',     name: '李健华',   staffId: 14, role: 'parttime' },
  { email: 'wujiaying@salomon.temp',     name: '吴嘉莹',   staffId: 15, role: 'parttime' },
  { email: 'yanjiazheng@salomon.temp',   name: '严佳铮',   staffId: 16, role: 'parttime' },
  { email: 'zubaidai@salomon.temp',      name: '祖白代',   staffId: 17, role: 'parttime' },
  { email: 'chenguangquan@salomon.temp', name: '陈广权',   staffId: 18, role: 'parttime' },
  { email: 'hesijia@salomon.temp',       name: '何思嘉',   staffId: 23, role: 'parttime' },
  { email: 'jiachangle@salomon.temp',    name: '贾长乐',   staffId: 19, role: 'parttime' },
  { email: 'mayila@salomon.temp',        name: '玛依拉',   staffId: 20, role: 'parttime' },
  { email: 'liangshiqiu@salomon.temp',   name: '梁实秋',   staffId: 21, role: 'parttime' },
  { email: 'admin@salomon.temp',         name: '管理员',   staffId: 99, role: 'admin' },
];

// ---------- 读取密钥 ----------
let SERVICE_ROLE_KEY;
try {
  SERVICE_ROLE_KEY = readFileSync(KEY_FILE, 'utf8').trim();
} catch {
  console.error(`[ERROR] 找不到密钥文件: ${KEY_FILE}`);
  console.error('');
  console.error('请按以下步骤获取 service_role 密钥：');
  console.error('  1. 打开 Supabase Dashboard');
  console.error('  2. 左下角齿轮图标 → Project Settings');
  console.error('  3. 左侧菜单 → API');
  console.error('  4. 找到 "Project API keys" 区域');
  console.error('  5. 复制 "service_role" 那一行的值（点 Reveal 显示完整密钥）');
  console.error(`  6. 保存到文件: ${KEY_FILE}`);
  process.exit(1);
}

if (SERVICE_ROLE_KEY.length < 100) {
  console.error('[ERROR] 密钥太短，可能复制不完整。请重新复制 service_role 的完整值。');
  process.exit(1);
}

console.log(`[INFO] 密钥已加载 (${SERVICE_ROLE_KEY.slice(0, 20)}...${SERVICE_ROLE_KEY.slice(-8)})`);
console.log(`[INFO] 即将创建 ${USERS.length} 个用户...\n`);

// ---------- 创建单个用户 ----------
async function createUser(u) {
  const url = `${SUPABASE_URL}/auth/v1/admin/users`;
  const body = {
    email: u.email,
    password: DEFAULT_PASSWORD,
    email_confirm: true,  // 跳过邮箱验证
    app_metadata: { provider: 'email', providers: ['email'] },
    user_metadata: { name: u.name, staff_id: u.staffId, role: u.role },
  };

  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const data = await resp.json();

  if (!resp.ok) {
    // 用户已存在不算错误
    if (data.code === 'user_already_exists' || (data.msg || '').includes('already')) {
      return { ...u, status: 'exists', id: null };
    }
    // 详细输出 status code + 完整响应，便于诊断
    console.log(`\n    [DEBUG] status=${resp.status}`);
    console.log(`    [DEBUG] body=${JSON.stringify(data).slice(0, 300)}`);
    return { ...u, status: 'error', error: `${resp.status}: ${data.msg || data.message || data.error || JSON.stringify(data)}` };
  }

  return { ...u, status: 'created', id: data.id };
}

// ---------- 回填 staff.auth_id（用 service_role 绕过 RLS）----------
async function linkStaffAuthId(results) {
  console.log('\n[INFO] 回填 staff.auth_id...');
  let ok = 0, fail = 0;

  for (const r of results) {
    if (r.status !== 'created' || !r.id) continue;

    // 查找 staff id（管理员用 name 匹配）
    const matchCol = r.staffId === 99 ? 'name' : 'id';
    const matchVal = r.staffId === 99 ? '管理员' : r.staffId;

    const url = `${SUPABASE_URL}/rest/v1/staff?${matchCol}=eq.${encodeURIComponent(matchVal)}&select=id`;
    const selectResp = await fetch(url, {
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      },
    });
    const rows = await selectResp.json();

    if (!rows || rows.length === 0) {
      console.log(`  [WARN] staff 表找不到 ${matchCol}=${matchVal} (${r.name})，跳过回填`);
      fail++;
      continue;
    }

    const staffPk = rows[0].id;

    const updResp = await fetch(`${SUPABASE_URL}/rest/v1/staff?id=eq.${staffPk}`, {
      method: 'PATCH',
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({ auth_id: r.id }),
    });

    if (updResp.ok) {
      console.log(`  [OK] ${r.name} → auth_id=${r.id.slice(0, 8)}...`);
      ok++;
    } else {
      const errBody = await updResp.text();
      console.log(`  [FAIL] ${r.name}: ${updResp.status} ${errBody.slice(0, 100)}`);
      fail++;
    }
  }

  console.log(`\n[INFO] 回填完成: ${ok} 成功, ${fail} 失败`);
}

// ---------- 主流程 ----------
(async () => {
  const results = [];

  for (const u of USERS) {
    process.stdout.write(`  创建 ${u.email.padEnd(32)} ... `);
    try {
      const r = await createUser(u);
      results.push(r);
      if (r.status === 'created')      console.log(`✅ 创建成功 (id: ${r.id.slice(0, 8)}...)`);
      else if (r.status === 'exists')  console.log(`⏭️  已存在，跳过`);
      else                              console.log(`❌ 失败: ${r.error}`);
    } catch (e) {
      results.push({ ...u, status: 'error', error: e.message });
      console.log(`❌ 异常: ${e.message}`);
    }
  }

  const created = results.filter(r => r.status === 'created').length;
  const exists  = results.filter(r => r.status === 'exists').length;
  const failed  = results.filter(r => r.status === 'error').length;

  console.log(`\n========== 汇总 ==========`);
  console.log(`新建: ${created} | 已存在: ${exists} | 失败: ${failed} | 总计: ${results.length}`);

  if (created > 0) {
    await linkStaffAuthId(results);
  }

  console.log('\n[DONE] 全部完成。');
  console.log('下一步：用 admin@salomon.temp / Salomon2026! 登录测试。');
})();
