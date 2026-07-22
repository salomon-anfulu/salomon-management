/* ============================================================
 * Salomon 兼职管理系统 - 历史数据迁移脚本
 * 文件: supabase/migration.js
 * 用法: 在浏览器控制台粘贴执行（或作为书签脚本）
 * 前提: 已完成 Supabase 注册 + 建表 + 在 index.html 中引入 supabase-client.js
 * ============================================================
 *
 * 操作步骤：
 * 1. 打开已部署的网页版（如 https://salomon-anfulu.github.io/salomon-management/）
 * 2. 按 F12 打开控制台
 * 3. 把本文件内容复制粘贴到控制台，回车
 * 4. 脚本会自动读取 localStorage 的数据并写入 Supabase
 * 5. 查看日志输出，确认每个模块迁移成功
 */

(async function runMigration() {
  console.log('=== Salomon 历史数据迁移开始 ===');

  // 等待 Supabase 客户端初始化
  if (window.SbClient && window.SbClient.initPromise) {
    await window.SbClient.initPromise;
  }

  if (!window.SbClient || !window.SbClient.isOnline()) {
    console.error('Supabase 未连接。请检查：');
    console.error('1. 是否已在 js/supabase-client.js 中填写 SUPABASE_CONFIG');
    console.error('2. 是否已在 index.html 中引入 supabase-client.js');
    console.error('3. 网络是否通畅');
    return;
  }

  const Sb = window.SbClient;
  const raw = localStorage.getItem('salomon_parttime_mgmt');
  if (!raw) {
    console.error('localStorage 中没有找到 salomon_parttime_mgmt 数据');
    return;
  }
  const data = JSON.parse(raw);

  // 统计对象
  const stats = {
    staff: 0,
    availability: 0,
    door_schedule: 0,
    schedules: 0,
    shift_changes: 0,
    store_support: 0,
    customer_reviews: 0,
    performance_data: 0,
    ratings: 0,
    attendance: 0,
    errors: []
  };

  function _safe(fn) {
    return async function() {
      try { return await fn.apply(this, arguments); }
      catch (e) { stats.errors.push(String(e)); console.error(e); }
    };
  }

  // 辅助：名字 → staff_id 映射（先迁移 staff 表）
  let nameToId = {};

  // ============================================================
  // 1. 迁移 staff 表
  // ============================================================
  console.log('1. 迁移 staff...');
  const staffList = (data.staff || []).filter(s => s && !s._deleted && s.status !== 'deleted');
  for (const s of staffList) {
    const res = await Sb.upsertStaff(s);
    if (res.error) {
      stats.errors.push('staff: ' + s.name + ' - ' + res.error.message);
    } else {
      stats.staff++;
      nameToId[s.name] = s.id;
    }
  }
  console.log('   staff 迁移完成:', stats.staff, '条');

  // 建 staff 映射后，读取数据库里的 staff（补充刚自动生成的 id）
  const { data: dbStaff, error: dbStaffErr } = await Sb.getStaffList();
  if (!dbStaffErr && dbStaff) {
    nameToId = {};
    dbStaff.forEach(s => { nameToId[s.name] = s.id; });
  }

  // 用于处理 "姓名+部门" 可能重复的情况
  function _idFor(name, dept) {
    if (nameToId[name]) return nameToId[name];
    // 尝试名字+部门匹配
    const match = dbStaff.find(s => s.name === name && s.dept === (dept || 'Service Team'));
    return match ? match.id : null;
  }

  // ============================================================
  // 2. 迁移 availability（可上班时间）
  // ============================================================
  console.log('2. 迁移 availability...');
  const availability = data.availability || {};
  const months = availability.months || {};
  for (const [month, monthInfo] of Object.entries(months)) {
    if (!monthInfo || !monthInfo.data) continue;
    for (const [name, person] of Object.entries(monthInfo.data)) {
      const staffId = _idFor(name, person.dept || 'Service Team');
      if (!staffId) {
        stats.errors.push('availability: 未找到 staff_id for ' + name);
        continue;
      }
      // 新版逐日结构
      if (person.dates && typeof person.dates === 'object') {
        for (const [dateKey, day] of Object.entries(person.dates)) {
          const res = await Sb.saveAvailabilityDay(
            staffId, name, month, dateKey,
            Boolean(day.available), day.note || '', person.dept || 'Service Team'
          );
          if (res.error) {
            stats.errors.push('availability: ' + name + '/' + dateKey + ' - ' + res.error.message);
          } else {
            stats.availability++;
          }
        }
      }
      // 旧版 unavailable 数组（反推：不在 unavailable 里 = 可上班）
      else if (Array.isArray(person.unavailable)) {
        // 需要知道当月有哪些日期。我们按月字符串 'YYYY-MM' 获取该月天数
        const [y, m] = month.split('-').map(Number);
        const daysInMonth = new Date(y, m, 0).getDate();
        for (let d = 1; d <= daysInMonth; d++) {
          const dateKey = m + '/' + d;
          const available = !person.unavailable.includes(dateKey);
          const res = await Sb.saveAvailabilityDay(
            staffId, name, month, dateKey,
            available, person.note || '', person.dept || 'Service Team'
          );
          if (res.error) {
            stats.errors.push('availability: ' + name + '/' + dateKey + ' - ' + res.error.message);
          } else {
            stats.availability++;
          }
        }
      }
    }
  }
  console.log('   availability 迁移完成:', stats.availability, '条');

  // ============================================================
  // 3. 迁移 door_schedule（门迎排班）
  // ============================================================
  console.log('3. 迁移 door_schedule...');
  const doorSchedule = data.doorSchedule || [];
  for (const day of doorSchedule) {
    if (!day || !day.date || !Array.isArray(day.slots)) continue;
    for (const slot of day.slots) {
      const staffId = _idFor(slot.staff, 'Service Team');
      const res = await Sb.upsertDoorSlot(day.date, slot.time, slot.staff, staffId, 'normal');
      if (res.error) {
        stats.errors.push('door_schedule: ' + day.date + ' - ' + res.error.message);
      } else {
        stats.door_schedule++;
      }
    }
  }
  console.log('   door_schedule 迁移完成:', stats.door_schedule, '条');

  // ============================================================
  // 4. 迁移 schedules（排班记录）
  // ============================================================
  console.log('4. 迁移 schedules...');
  const schedules = data.schedules || [];
  for (const s of schedules) {
    const res = await Sb.upsertSchedule(s.staffId, null, s.date, s.shift, s.dept || 'Service Team');
    if (res.error) {
      stats.errors.push('schedules: ' + s.id + ' - ' + res.error.message);
    } else {
      stats.schedules++;
    }
  }
  console.log('   schedules 迁移完成:', stats.schedules, '条');

  // ============================================================
  // 5. 迁移 shift_changes（换班记录）
  // ============================================================
  console.log('5. 迁移 shift_changes...');
  const shiftChanges = data.shiftChanges || [];
  for (const sc of shiftChanges) {
    const res = await Sb.insertShiftChange({
      applicant: sc.applicant,
      applicant_id: _idFor(sc.applicant, 'Service Team'),
      applicantShift: sc.applicantShift,
      target: sc.target,
      target_id: _idFor(sc.target, 'Service Team'),
      targetShift: sc.targetShift,
      applyDate: sc.applyDate,
      status: 'approved'
    });
    if (res.error) {
      stats.errors.push('shift_changes: ' + sc.id + ' - ' + res.error.message);
    } else {
      stats.shift_changes++;
    }
  }
  console.log('   shift_changes 迁移完成:', stats.shift_changes, '条');

  // ============================================================
  // 6. 迁移 store_support（店务支援）
  // ============================================================
  console.log('6. 迁移 store_support...');
  const storeSupport = data.storeSupport || [];
  for (const sp of storeSupport) {
    const res = await Sb.insertStoreSupport({
      staff: sp.staff,
      staff_id: _idFor(sp.staff, 'Service Team'),
      date: sp.date,
      type: sp.type,
      duration: sp.duration,
      detail: sp.detail
    });
    if (res.error) {
      stats.errors.push('store_support: ' + sp.id + ' - ' + res.error.message);
    } else {
      stats.store_support++;
    }
  }
  console.log('   store_support 迁移完成:', stats.store_support, '条');

  // ============================================================
  // 7. 迁移 customer_reviews（顾客好评）
  // ============================================================
  console.log('7. 迁移 customer_reviews...');
  const reviews = data.customerReviews || [];
  for (const r of reviews) {
    const res = await Sb.upsertCustomerReview({
      id: r.id,
      staffName: r.staffName,
      staff_id: _idFor(r.staffName, 'Service Team'),
      month: r.month,
      rating: r.rating,
      reviewDate: r.reviewDate,
      snippet: r.snippet,
      keywords: r.keywords || [],
      source: r.source
    });
    if (res.error) {
      stats.errors.push('customer_reviews: ' + r.id + ' - ' + res.error.message);
    } else {
      stats.customer_reviews++;
    }
  }
  console.log('   customer_reviews 迁移完成:', stats.customer_reviews, '条');

  // ============================================================
  // 8. 迁移 performance_data（业绩数据）
  // ============================================================
  console.log('8. 迁移 performance_data...');
  const perfData = data.performanceData || {};
  for (const [key, monthInfo] of Object.entries(perfData)) {
    if (!monthInfo || !Array.isArray(monthInfo.records)) continue;
    const monthMap = {
      april: '2026-04',
      may: '2026-05',
      june: '2026-06',
      july: '2026-07',
      august: '2026-08'
    };
    const month = monthMap[key] || ('2026-' + key);
    for (const rec of monthInfo.records) {
      rec.totalSales = monthInfo.totalSales;
      const res = await Sb.upsertPerformanceRecord(month, rec);
      if (res.error) {
        stats.errors.push('performance_data: ' + rec.name + ' - ' + res.error.message);
      } else {
        stats.performance_data++;
      }
    }
  }
  console.log('   performance_data 迁移完成:', stats.performance_data, '条');

  // ============================================================
  // 9. 迁移 ratings（评分）
  // ============================================================
  console.log('9. 迁移 ratings...');
  const ratings = data.ratings || [];
  for (const r of ratings) {
    const staffName = r.staffName || (Store && Store.getStaffName ? Store.getStaffName(r.staffId) : '');
    const res = await Sb.upsertRating({
      id: r.id,
      staffId: r.staffId,
      staff_name: staffName || r.staff_name || '',
      month: r.month,
      scores: r.scores,
      avgScore: r.avgScore,
      hourlyRate: r.hourlyRate,
      comment: r.comment
    });
    if (res.error) {
      stats.errors.push('ratings: ' + r.id + ' - ' + res.error.message);
    } else {
      stats.ratings++;
    }
  }
  console.log('   ratings 迁移完成:', stats.ratings, '条');

  // ============================================================
  // 10. 迁移 attendance（考勤）
  // ============================================================
  console.log('10. 迁移 attendance...');
  const linggong = data.linggongAttendance || {};
  const records = linggong.records || [];
  for (const rec of records) {
    const staffId = _idFor(rec.name, 'Service Team');
    const res = await Sb.upsertAttendance({
      name: rec.name,
      staff_id: staffId,
      date: rec.date,
      signIn: rec.signIn,
      signOut: rec.signOut,
      status: rec.status,
      totalHours: rec.totalHours,
      calcHours: rec.calcHours || null,
      source: 'linggong'
    });
    if (res.error) {
      stats.errors.push('attendance: ' + rec.name + '/' + rec.date + ' - ' + res.error.message);
    } else {
      stats.attendance++;
    }
  }
  console.log('   attendance 迁移完成:', stats.attendance, '条');

  // ============================================================
  // 11. 更新同步元数据
  // ============================================================
  if (typeof Sb._client === 'function' && Sb._client()) {
    const client = Sb._client();
    await client.from('sync_meta').upsert({
      key: 'last_migration',
      value: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }, { onConflict: 'key' });
  }

  // ============================================================
  // 报告
  // ============================================================
  console.log('');
  console.log('=== 迁移完成统计 ===');
  console.table(stats);
  console.log('总错误数:', stats.errors.length);
  if (stats.errors.length > 0) {
    console.log('错误详情:');
    stats.errors.forEach((e, i) => console.log(i + 1 + '.', e));
  }
  console.log('');
  console.log('下一步：验证数据后，在 app.js 中启用 Supabase 读写。');
})();
