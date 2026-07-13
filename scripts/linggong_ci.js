/**
 * linggong_ci.js — CI 环境专用灵工考勤同步（纯 API 直连，无需浏览器）
 *
 * 流程：
 *   1. 从环境变量 LINGGONG_AUTH_STATE 读取 cookie（GitHub Secret）
 *   2. 解析 JWT token，检查过期时间
 *   3. 直接调用 API 分页拉取本月考勤数据
 *   4. 合并已有 weekly_attendance_clean.json
 *   5. 输出供 sync_linggong_to_app.js 使用
 *
 * 用法（CI 环境）：
 *   LINGGONG_AUTH_STATE='{...cookies json...}' node scripts/linggong_ci.js
 *
 * 退出码：
 *   0 = 成功
 *   10 = auth_state 无效或 token 过期（需要人工刷新）
 *   1 = 其他错误
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// ========== 配置 ==========
const API_HOST = 'api.linggongguanjia.com';
const PAGE_PATH = '/qtbArrangeWork/api/business/dimensionStatistic/pageByParam';
const SUMMARY_PATH = '/qtbArrangeWork/api/business/dimensionStatistic/summaryByTime';
const DATA_DIR = path.join(__dirname, '..', 'data');
const OUTPUT_FILE = path.join(DATA_DIR, 'weekly_attendance_clean.json');

function log(msg) { console.log(`[${new Date().toLocaleTimeString('zh-CN')}] ${msg}`); }

// ========== 1. 读取 & 验证 auth state ==========
function loadAuthState() {
  let authJson;

  // CI 环境：从环境变量读（兼容 base64 编码 + 纯 JSON 两种方式）
  if (process.env.LINGGONG_AUTH_STATE) {
    const raw = process.env.LINGGONG_AUTH_STATE.trim();
    let content = raw;

    // 自动检测：如果是 base64 编码（没有 { 开头）就解码
    if (!raw.startsWith('{') && !raw.startsWith('[')) {
      try {
        content = Buffer.from(raw, 'base64').toString('utf8');
        log('📖 检测到 base64 编码，已解码');
      } catch (e) {
        log('⚠️ base64 解码失败，按原文尝试');
      }
    } else {
      log('📖 检测到纯 JSON');
    }

    try {
      authJson = JSON.parse(content);
    } catch (e) {
      log(`❌ LINGGONG_AUTH_STATE 不是有效的 JSON: ${e.message}`);
      process.exit(10);
    }
  } else {
    // 本地环境：从文件读
    const authFile = path.join(DATA_DIR, 'auth_state.json');
    if (!fs.existsSync(authFile)) {
      log('❌ 找不到 auth_state.json，也找不到 LINGGONG_AUTH_STATE 环境变量');
      process.exit(10);
    }
    authJson = JSON.parse(fs.readFileSync(authFile, 'utf8'));
  }

  const cookies = authJson.cookies || authJson;
  const tokenCookie = Array.isArray(cookies)
    ? cookies.find(c => c.name === 'qtb-cloud-token')
    : null;

  if (!tokenCookie) {
    log('❌ 未找到 qtb-cloud-token cookie');
    process.exit(10);
  }

  const token = tokenCookie.value;

  // JWT 过期检查
  const parts = token.split('.');
  if (parts.length === 3) {
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    const expMs = (payload.exp || 0) * 1000;
    const remainingDays = (expMs - Date.now()) / 86400000;

    if (remainingDays <= 0) {
      log(`❌ Token 已过期 ${(-remainingDays).toFixed(1)} 天`);
      log('   请在本地运行「一键更新考勤.command」刷新 cookie 后 git push');
      process.exit(10);
    }

    log(`🔑 Token 有效，剩余 ${remainingDays.toFixed(1)} 天`);
    if (remainingDays < 5) {
      log(`⚠️ Token 将在 ${remainingDays.toFixed(0)} 天后过期，建议尽快刷新`);
    }
  }

  return { token, cookies };
}

// ========== 2. API 调用 ==========
function apiCall(pathname, body, token) {
  return new Promise((resolve, reject) => {
    const bodyStr = JSON.stringify(body);
    const options = {
      hostname: API_HOST,
      port: 443,
      path: pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(bodyStr),
        'authorization': token,
        'x-qtb-appkey': 'qtb-merchant-pc-Ny7MLo87',
        'x-ca-appkey': '1',
        'x-qtb-version': '1.1.6',
        'Origin': 'https://qtbcloud.linggongguanjia.com',
        'Referer': 'https://qtbcloud.linggongguanjia.com/',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'application/json, text/plain, */*',
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`JSON parse error: ${e.message}`));
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(30000, () => {
      req.destroy(new Error('Request timeout'));
    });

    req.write(bodyStr);
    req.end();
  });
}

// ========== 3. 时间范围 ==========
function getMonthRange() {
  const now = new Date();
  const startTime = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const endTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).getTime();
  return { startTime, endTime };
}

// ========== 4. 数据转换 ==========
function transformRecord(r) {
  return {
    name: r.workerName,
    date: r.effectiveDay,
    scheduleTime: r.arrangedTimeDetail || '',
    restTime: r.restTimeDetail || '',
    clockInTime: r.attendanceDetail || '',
    status: r.attendanceTimeStatusRemark || '',
    totalHours: parseFloat(r.totalTime) || 0,
    scheduleHours: r.arrangeTime || 0,
    lateMin: r.onWorkLateTime || 0,
    leaveMin: r.offWorkLeaveTime || 0,
    overtime: parseFloat(r.overtime) || 0,
    department: r.departmentName || '',
    project: r.flexibleProjectName || '',
    phone: r.workerMobile || '',
    signIn: r.attendanceDetailMap?.onWorkAttendance || '',
    signOut: r.attendanceDetailMap?.offWorkAttendance || '',
  };
}

// ========== 主流程 ==========
async function main() {
  log('🚀 灵工考勤 CI 同步（纯 API 模式）');

  const { token } = loadAuthState();
  const { startTime, endTime } = getMonthRange();
  const startDate = new Date(startTime).toISOString().split('T')[0];
  const endDate = new Date(endTime).toISOString().split('T')[0];
  log(`📅 本月范围: ${startDate} ~ ${endDate}`);

  // 1. 分页拉取
  const allResults = [];
  let pageNum = 1;
  const pageSize = 200;
  let total = 0;

  while (true) {
    const body = {
      pageNum, pageSize,
      onlyDepartment: false,
      startTime, endTime,
      departmentId: '',
      appKey: 1,
      serverAppId: 2,
    };

    let result;
    try {
      result = await apiCall(PAGE_PATH, body, token);
    } catch (e) {
      log(`❌ 请求失败（第${pageNum}页）: ${e.message}`);
      break;
    }

    if (result.code !== 4000 && result.code !== 200) {
      log(`❌ API 返回错误: code=${result.code}, msg=${result.message || ''}`);
      if (result.code === 4001 || result.code === 4003 || result.code === 401) {
        log('   Token 被拒绝，可能已失效');
        process.exit(10);
      }
      break;
    }

    const data = result.data || {};
    const results = data.results || [];
    total = data.total || total;

    if (results.length === 0) break;

    allResults.push(...results);
    log(`   📄 第${pageNum}页: ${results.length}条 (累计 ${allResults.length}/${total})`);

    if (allResults.length >= total || results.length < pageSize) break;
    pageNum++;
  }

  log(`\n📊 共获取 ${allResults.length} 条原始记录`);

  if (allResults.length === 0) {
    log('⚠️ 无数据，可能是月初或非排班日');
    process.exit(0);
  }

  // 2. 去重 + 转换
  const seen = new Set();
  const records = [];
  allResults.forEach(r => {
    const k = `${r.workerName}_${r.effectiveDay}_${r.arrangedTimeDetail}`;
    if (!seen.has(k)) {
      seen.add(k);
      records.push(transformRecord(r));
    }
  });

  // 3. 日期格式归一化（2026/07/07 → 2026-07-07）
  records.forEach(r => {
    if (r.date && r.date.includes('/')) {
      const [y, m, d] = r.date.split('/');
      r.date = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
  });
  records.sort((a, b) => a.date.localeCompare(b.date) || a.name.localeCompare(b.name));

  // 4. 合并已有数据
  let existing = [];
  if (fs.existsSync(OUTPUT_FILE)) {
    try {
      existing = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf8')).records || [];
      log(`📦 已有 ${existing.length} 条`);
    } catch (e) {}
  }

  // 先按 name+date+scheduleTime 去重（保留最新）
  const dedupMap = new Map();
  [...existing, ...records].forEach(r => {
    dedupMap.set(`${r.name}_${r.date}_${r.scheduleTime}`, r);
  });

  // === 合并同一天同一个人的多条班次为一条 ===
  // 规则：
  //   1. 丢弃 signIn/signOut 都为空 且 status 非"打卡正常"的记录（未开始/排班但没打卡）
  //   2. 丢弃 "打卡进行中" 快照（signOut 为空但有 "打卡正常" 的完整记录）
  //   3. 对同一人同一天的多个有效班次：取最早的 signIn、最晚的 signOut、工时累加
  //   4. status 取最严重的一条（正常 < 异常 < 缺勤）
  const dayGroups = new Map();
  for (const r of dedupMap.values()) {
    const key = `${r.name}_${r.date}`;
    if (!dayGroups.has(key)) dayGroups.set(key, []);
    dayGroups.get(key).push(r);
  }

  const unique = [];
  for (const [key, recs] of dayGroups) {
    if (recs.length === 1) {
      // 只有一条，过滤掉无效记录
      const r = recs[0];
      const isEmpty = (!r.signIn || r.signIn === '') && (!r.signOut || r.signOut === '');
      if (isEmpty && r.status !== '打卡正常') continue; // 跳过未开始打卡
      unique.push(r);
    } else {
      // 多条班次需要合并
      // 先过滤掉无效记录
      const valid = recs.filter(r => {
        const isEmpty = (!r.signIn || r.signIn === '') && (!r.signOut || r.signOut === '');
        if (isEmpty && r.status !== '打卡正常') return false;
        // "打卡进行中" 但有完整记录 -> 丢弃进行中
        if (r.status === '打卡进行中' && (!r.signOut || r.signOut === '')) {
          const hasComplete = recs.some(x => x.status === '打卡正常' && x.signOut);
          if (hasComplete) return false;
        }
        return true;
      });

      if (valid.length === 0) continue;
      if (valid.length === 1) { unique.push(valid[0]); continue; }

      // 合并多条有效班次
      valid.sort((a, b) => (a.signIn || '99:99').localeCompare(b.signIn || '99:99'));
      const merged = { ...valid[0] }; // 基础信息取第一条

      // 找最早 signIn 和最晚 signOut
      const signIns = valid.map(r => r.signIn).filter(s => s && s !== '');
      const signOuts = valid.map(r => r.signOut).filter(s => s && s !== '');
      merged.signIn = signIns.length > 0 ? signIns.sort()[0] : '';
      merged.signOut = signOuts.length > 0 ? signOuts.sort().reverse()[0] : '';

      // 工时累加
      merged.totalHours = valid.reduce((s, r) => s + (parseFloat(r.totalHours) || 0), 0);

      // 排班时间拼接
      const schedules = valid.map(r => r.scheduleTime).filter(s => s && s !== '');
      merged.scheduleTime = [...new Set(schedules)].join(' / ');

      // status 取最严重的
      const statusPriority = { '打卡正常': 0, '打卡进行中': 1, '打卡异常': 2, '缺勤': 3, '取消': 3 };
      merged.status = valid.reduce((worst, r) =>
        (statusPriority[r.status] || 99) > (statusPriority[worst] || 99) ? r.status : worst
      , '打卡正常');

      // 迟到/早退取最大
      merged.lateMin = Math.max(0, ...valid.map(r => r.lateMin || 0));
      merged.leaveMin = Math.max(0, ...valid.map(r => r.leaveMin || 0));

      unique.push(merged);
    }
  }
  unique.sort((a, b) => a.date.localeCompare(b.date) || a.name.localeCompare(b.name));

  // 5. 汇总
  let summary = null;
  try {
    const sResult = await apiCall(SUMMARY_PATH, {
      onlyDepartment: false, startTime, endTime,
      departmentId: '', appKey: 1, serverAppId: 2,
    }, token);
    if (sResult.data) summary = sResult.data;
  } catch (e) {}

  // 6. 保存
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify({
    fetchedAt: new Date().toISOString(),
    totalCount: unique.length,
    dateRange: `${startDate} ~ ${endDate}`,
    summary,
    records: unique,
  }, null, 2));

  log(`\n💾 保存 ${unique.length} 条 (本次 +${records.length} 新)`);
  log(`📅 日期: ${unique[0]?.date} ~ ${unique[unique.length - 1]?.date}`);

  // 7. 打印摘要（最后7天）
  const dateGroups = {};
  unique.forEach(r => {
    (dateGroups[r.date] = dateGroups[r.date] || []).push(r);
  });
  log('\n📋 最近7天考勤:');
  Object.keys(dateGroups).sort().slice(-7).forEach(date => {
    const recs = dateGroups[date];
    const active = recs.filter(r => r.signIn || r.totalHours > 0).length;
    const totalH = recs.reduce((s, r) => s + (r.totalHours || 0), 0);
    const late = recs.filter(r => r.lateMin > 0).length;
    log(`  ${date}: ${active}/${recs.length}人出勤, ${totalH.toFixed(1)}h${late > 0 ? `, ${late}人迟到` : ''}`);
  });

  log('\n✅ 同步完成！');
}

main().catch(err => {
  console.error(`❌ 致命错误: ${err.message}`);
  process.exit(1);
});
