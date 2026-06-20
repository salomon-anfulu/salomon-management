/**
 * 灵工打卡 API 直连同步脚本（无需浏览器）
 * 
 * 用法:
 *   node scripts/sync_linggong_api.js                     # 同步本月数据
 *   node scripts/sync_linggong_api.js --range=today       # 只拉今天
 *   node scripts/sync_linggong_api.js --range=week        # 拉最近7天
 *   node scripts/sync_linggong_api.js --token-refresh      # Token过期时重新登录获取
 * 
 * 认证: 使用 data/auth_state.json 中保存的 qtb-cloud-token (JWT, 30天有效期)
 * API:  api.linggongguanjia.com/qtbArrangeWork/api/business/dimensionStatistic/
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const { URL } = require('url');

// ========== 配置 ==========
const API_BASE = 'api.linggongguanjia.com';
const PAGE_BY_PARAM_PATH = '/qtbArrangeWork/api/business/dimensionStatistic/pageByParam';
const SUMMARY_PATH = '/qtbArrangeWork/api/business/dimensionStatistic/summaryByTime';
const DATA_DIR = path.join(__dirname, '..', 'data');
const AUTH_FILE = path.join(DATA_DIR, 'auth_state.json');
const OUTPUT_FILE = path.join(DATA_DIR, 'weekly_attendance_clean.json');

// 参数解析
const args = process.argv.slice(2).reduce((acc, arg) => {
  const [key, ...vals] = arg.split('=');
  acc[key.replace(/^--/, '')] = vals.join('=') || true;
  return acc;
}, {});

const RANGE = args.range || 'month';

// ========== 工具函数 ==========
function log(msg) {
  console.log(`[${new Date().toLocaleTimeString()}] ${msg}`);
}

function getRangeTimestamps(range) {
  const now = new Date();
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  
  let startTime;
  switch (range) {
    case 'today':
      startTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      break;
    case 'week':
      startTime = new Date(now.getTime() - 6 * 86400000);
      startTime.setHours(0, 0, 0, 0);
      break;
    case 'month':
    default:
      startTime = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
  }
  
  return {
    startTime: startTime.getTime(),
    endTime: endOfToday.getTime(),
    startDate: startTime.toISOString().split('T')[0],
    endDate: endOfToday.toISOString().split('T')[0],
  };
}

// ========== Token 管理 ==========
function loadToken() {
  if (!fs.existsSync(AUTH_FILE)) {
    log('❌ 未找到 auth_state.json，请先运行 fetch_linggong.js 登录获取');
    return null;
  }
  
  const auth = JSON.parse(fs.readFileSync(AUTH_FILE, 'utf8'));
  const tokenCookie = auth.cookies.find(c => c.name === 'qtb-cloud-token');
  
  if (!tokenCookie) {
    log('❌ auth_state.json 中未找到 qtb-cloud-token');
    return null;
  }
  
  const token = tokenCookie.value;
  
  // 检查 JWT 过期时间
  const parts = token.split('.');
  if (parts.length === 3) {
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    const expDate = new Date(payload.exp * 1000);
    const remaining = (payload.exp * 1000 - Date.now()) / 86400000;
    
    if (remaining <= 0) {
      log(`❌ Token 已过期（过期时间: ${expDate.toLocaleDateString()}）`);
      log('   请运行: node scripts/fetch_linggong.js --phone=手机号 --password=密码 重新登录');
      return null;
    }
    
    log(`🔑 Token 有效，剩余 ${remaining.toFixed(1)} 天（过期: ${expDate.toLocaleDateString()}）`);
  }
  
  return token;
}

// ========== API 调用 ==========
function apiCall(pathname, body) {
  return new Promise((resolve, reject) => {
    const token = loadToken();
    if (!token) {
      reject(new Error('No valid token'));
      return;
    }
    
    const bodyStr = JSON.stringify(body);
    const options = {
      hostname: API_BASE,
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
        'x-qtb-referer': 'current-query:',
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
    req.setTimeout(15000, () => {
      req.destroy(new Error('Request timeout'));
    });
    
    req.write(bodyStr);
    req.end();
  });
}

// ========== 数据转换 ==========
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
  log('🚀 灵工打卡 API 直连同步');
  log(`📡 范围: ${RANGE}`);
  
  const { startTime, endTime, startDate, endDate } = getRangeTimestamps(RANGE);
  log(`📅 时间范围: ${startDate} ~ ${endDate}`);
  log(`   时间戳: ${startTime} ~ ${endTime}`);
  
  // 1. 拉取分页数据
  const allResults = [];
  let pageNum = 1;
  const pageSize = 200;
  let total = 0;
  
  log('\n📡 开始拉取 pageByParam...');
  
  while (true) {
    const body = {
      pageNum,
      pageSize,
      onlyDepartment: false,
      startTime,
      endTime,
      departmentId: '',
      appKey: 1,
      serverAppId: 2,
    };
    
    log(`   第 ${pageNum} 页 (pageSize=${pageSize})...`);
    
    try {
      const result = await apiCall(PAGE_BY_PARAM_PATH, body);
      
      if (result.code !== 4000 && result.code !== 200) {
        log(`❌ API返回错误: code=${result.code}, message=${result.message || ''}`);
        break;
      }
      
      const data = result.data || {};
      const results = data.results || [];
      total = data.total || total;
      
      if (results.length === 0) {
        log(`   第 ${pageNum} 页无数据，停止`);
        break;
      }
      
      allResults.push(...results);
      log(`   ✅ 获取 ${results.length} 条 (累计 ${allResults.length}/${total})`);
      
      if (allResults.length >= total || results.length < pageSize) {
        break;
      }
      
      pageNum++;
    } catch (e) {
      log(`❌ 请求失败: ${e.message}`);
      break;
    }
  }
  
  log(`\n📊 共获取 ${allResults.length} 条原始记录 (total: ${total})`);
  
  // 2. 拉取汇总
  let summary = null;
  try {
    log('\n📡 拉取 summaryByTime...');
    const summaryResult = await apiCall(SUMMARY_PATH, {
      onlyDepartment: false,
      startTime,
      endTime,
      departmentId: '',
      appKey: 1,
      serverAppId: 2,
    });
    
    if (summaryResult.data) {
      summary = summaryResult.data;
      log(`   ✅ 汇总: 排班${summary.arrangedNumber}人次 / 出勤${summary.attendanceTimeNumber}人次 / 总工时${summary.totalTime}h`);
      log(`   迟到${summary.lateNumber} / 早退${summary.leaveNumber} / 缺卡${summary.missCardNumber} / 旷工${summary.absenteeismNumber}`);
    }
  } catch (e) {
    log(`   ⚠️ 汇总获取失败: ${e.message}`);
  }
  
  // 3. 转换数据
  const newRecords = allResults.map(transformRecord);
  
  // 去重
  const seenKeys = new Set();
  const uniqueRecords = newRecords.filter(r => {
    const key = `${r.name}_${r.date}_${r.scheduleTime}`;
    if (seenKeys.has(key)) return false;
    seenKeys.add(key);
    return true;
  });
  
  uniqueRecords.sort((a, b) => a.date.localeCompare(b.date) || a.name.localeCompare(b.name));
  
  log(`\n📊 转换后: ${uniqueRecords.length} 条（去重 ${newRecords.length - uniqueRecords.length} 条）`);
  
  // 4. 合并已有数据
  let mergedRecords = uniqueRecords;
  
  if (RANGE !== 'month') {
    // 非"全月"模式时合并已有数据
    let existingRecords = [];
    if (fs.existsSync(OUTPUT_FILE)) {
      try {
        const existing = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf8'));
        existingRecords = existing.records || [];
        log(`📦 合并已有数据 ${existingRecords.length} 条`);
      } catch (e) {}
    }
    
    const recordMap = new Map();
    [...existingRecords, ...uniqueRecords].forEach(r => {
      const key = `${r.name}_${r.date}_${r.scheduleTime}`;
      recordMap.set(key, r);  // 新数据覆盖旧数据
    });
    mergedRecords = Array.from(recordMap.values());
    mergedRecords.sort((a, b) => a.date.localeCompare(b.date) || a.name.localeCompare(b.name));
  }
  
  // 5. 保存
  const output = {
    fetchedAt: new Date().toISOString(),
    totalCount: mergedRecords.length,
    dateRange: `${startDate} ~ ${endDate}`,
    summary,
    records: mergedRecords,
  };
  
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));
  log(`\n💾 已保存到: ${OUTPUT_FILE}`);
  log(`   本次获取: ${uniqueRecords.length} 条`);
  log(`   合并后总计: ${mergedRecords.length} 条`);
  
  // 6. 打印摘要
  log('\n📋 按日期统计:');
  const dateGroups = {};
  mergedRecords.forEach(r => {
    if (!dateGroups[r.date]) dateGroups[r.date] = [];
    dateGroups[r.date].push(r);
  });
  
  Object.keys(dateGroups).sort().slice(-7).forEach(date => {
    const records = dateGroups[date];
    const late = records.filter(r => r.lateMin > 0).length;
    const totalH = records.reduce((s, r) => s + r.totalHours, 0);
    const active = records.filter(r => r.totalHours > 0 || r.signIn).length;
    log(`  ${date}: ${active}/${records.length}人出勤, ${totalH.toFixed(1)}h${late > 0 ? `, ${late}人迟到` : ''}`);
  });
  
  // 7. 检查今天的实时打卡
  const todayStr = new Date().toLocaleDateString('zh-CN').replace(/\//g, m => m === '/' ? '/' : '/');
  const todayRecords = mergedRecords.filter(r => r.date === `${new Date().getFullYear()}/${String(new Date().getMonth() + 1).padStart(2, '0')}/${String(new Date().getDate()).padStart(2, '0')}`);
  const checkedIn = todayRecords.filter(r => r.signIn);
  
  if (todayRecords.length > 0) {
    log(`\n⏰ 今日实时打卡 (${checkedIn.length}/${todayRecords.length}人已打卡):`);
    checkedIn.forEach(r => {
      log(`  ✅ ${r.name} | 上班: ${r.signIn} | 下班: ${r.signOut || '未下班'}`);
    });
    const pending = todayRecords.filter(r => !r.signIn);
    if (pending.length > 0) {
      log(`  ⏳ 待打卡: ${pending.map(r => r.name).join(', ')}`);
    }
  }
  
  log('\n✅ 同步完成！');
  
  return { count: mergedRecords.length, newCount: uniqueRecords.length };
}

// ========== 运行 ==========
main().then(({ count, newCount }) => {
  process.exit(0);
}).catch(err => {
  console.error(`❌ 致命错误: ${err.message}`);
  process.exit(1);
});
