/**
 * ========================================
 * 安福路 Salomon 兼职管理系统 - Pages
 * Auth-aware: 兼职只能看自己的数据
 * ========================================
 */

// ===== Auth Helper (defined in index.html, safe fallback) =====
const _auth = typeof Auth !== 'undefined' ? Auth : { isAdmin: true, staffId: null, staffName: null, role: 'admin' };

function renderDashboard() {
  const staff = Store.get('staff');
  const activeStaff = staff.filter(s => s.status === 'active');
  const schedules = Store.get('schedules');
  const ratings = Store.get('ratings');
  const violations = Store.get('violations') || [];
  const attendance = Store.get('attendance');

  const serviceTeamStaff = staff.filter(s => s.dept === 'Service Team' && s.status === 'active').length;
  const warehouseStaff = staff.filter(s => s.dept === '仓库兼职' && s.status === 'active').length;
  const thisWeekSchedules = schedules.length;
  const pendingRatings = activeStaff.length - ratings.filter(r => r.month === '2026-06').length;
  const attendanceRate = attendance.length > 0
    ? Math.round(attendance.filter(a => a.status === 'normal').length / attendance.length * 100)
    : 100;

  const storeSupport = Store.get('storeSupport') || [];

  return `
    <div class="stats-grid animate-in">
      <div class="stat-card accent">
        <div class="stat-icon">👥</div>
        <div class="stat-value">${activeStaff.length}</div>
        <div class="stat-label">在职兼职</div>
        <div class="stat-trend up">门店 ${serviceTeamStaff} · 仓库 ${warehouseStaff}</div>
      </div>
      <div class="stat-card info">
        <div class="stat-icon">📅</div>
        <div class="stat-value">${thisWeekSchedules}</div>
        <div class="stat-label">6月排班</div>
        <div class="stat-trend up">已排班次</div>
      </div>
      <div class="stat-card warning">
        <div class="stat-icon">🔧</div>
        <div class="stat-value">${storeSupport.length}</div>
        <div class="stat-label">店务支援</div>
        <div class="stat-trend up">6月累计记录</div>
      </div>
      <div class="stat-card success">
        <div class="stat-icon">⭐</div>
        <div class="stat-value">${pendingRatings}</div>
        <div class="stat-label">待评分人数</div>
        <div class="stat-trend ${pendingRatings > 0 ? 'down' : 'up'}">${pendingRatings > 0 ? pendingRatings + ' 人待评分' : '全员已评分'}</div>
      </div>
    </div>

    <div class="grid-2" style="margin-bottom: 24px;">
      <!-- Quick Actions -->
      <div class="card animate-in">
        <div class="card-header">
          <h3>⚡ 快捷操作</h3>
        </div>
        <div class="card-body" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px;">
          <button class="btn btn-primary w-full" onclick="Router.navigate('schedule')">📅 新增排班</button>
          <button class="btn btn-outline w-full" onclick="Router.navigate('attendance')">✅ 考勤签到</button>
          <button class="btn btn-outline w-full" onclick="Router.navigate('ratings')">⭐ 表现评分</button>
          <button class="btn btn-outline w-full" onclick="Router.navigate('support')">🔧 店务支援</button>
        </div>
      </div>

      <!-- Dept Distribution -->
      <div class="card animate-in">
        <div class="card-header">
          <h3>📊 团队分布</h3>
        </div>
        <div class="card-body">
          <canvas id="deptChart" height="180"></canvas>
        </div>
      </div>
    </div>

    <!-- Recent Activity -->
    <div class="card animate-in">
      <div class="card-header">
        <h3>📋 近期动态</h3>
        <button class="btn btn-sm btn-secondary">查看全部</button>
      </div>
      <div class="card-body" style="padding: 0;">
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>类型</th>
                <th>详情</th>
                <th>日期</th>
                <th>状态</th>
              </tr>
            </thead>
            <tbody>
              ${storeSupport.slice(-5).reverse().map(s => `
                <tr>
                  <td><span class="badge badge-info">支援</span></td>
                  <td>${s.staff} - ${s.type}（${s.detail}）</td>
                  <td>${s.date.replace('2026-', '')}</td>
                  <td><span class="badge badge-active">${s.duration}</span></td>
                </tr>
              `).join('')}
              ${attendance.slice(-3).reverse().map(a => `
                <tr>
                  <td><span class="badge badge-info">考勤</span></td>
                  <td>${Store.getStaffName(a.staffId)} - ${SHIFT_LABELS[a.shift]} ${a.status === 'normal' ? '正常' : '迟到'}</td>
                  <td>${formatDate(a.date)}</td>
                  <td><span class="badge ${a.status === 'normal' ? 'badge-active' : 'badge-warning'}">${a.status === 'normal' ? '正常' : '异常'}</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

function initDashboardCharts() {
  const staff = Store.get('staff').filter(s => s.status === 'active');
  const serviceTeam = staff.filter(s => s.dept === 'Service Team').length;
  const warehouse = staff.filter(s => s.dept === '仓库兼职').length;

  const ctx = document.getElementById('deptChart');
  if (!ctx) return;

  new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Service Team', '仓库兼职'],
      datasets: [{
        data: [serviceTeam, warehouse],
        backgroundColor: ['#3b82f6', '#f59e0b'],
        borderWidth: 0,
        hoverOffset: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '65%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: { padding: 20, font: { size: 13, weight: '600' }, usePointStyle: true }
        }
      }
    }
  });
}

/**
 * ========================================
 * Staff Management Page
 * ========================================
 */
let staffFilter = 'all';

function renderStaff() {
  const staff = Store.get('staff');
  const filtered = staffFilter === 'all' ? staff :
    staffFilter === 'active' ? staff.filter(s => s.status === 'active') :
    staff.filter(s => s.status === 'inactive');

  return `
    <div class="flex justify-between items-center mb-6 animate-in">
      <div class="filters-bar" style="margin-bottom: 0;">
        <button class="filter-chip ${staffFilter === 'all' ? 'active' : ''}" onclick="staffFilter='all';Router.render()">全部 (${staff.length})</button>
        <button class="filter-chip ${staffFilter === 'active' ? 'active' : ''}" onclick="staffFilter='active';Router.render()">在职 (${staff.filter(s=>s.status==='active').length})</button>
        <button class="filter-chip ${staffFilter === 'inactive' ? 'active' : ''}" onclick="staffFilter='inactive';Router.render()">离职 (${staff.filter(s=>s.status==='inactive').length})</button>
      </div>
      <button class="btn btn-primary" onclick="openStaffModal()">+ 添加兼职</button>
    </div>

    <div class="card animate-in">
      <div class="card-body" style="padding: 0;">
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>姓名</th>
                <th>部门</th>
                <th>状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              ${filtered.map(s => `
                <tr>
                  <td>
                    <div class="user-info">
                      <div class="avatar" style="background: ${s.avatar_color}">${getInitials(s.name)}</div>
                      <div>
                        <div class="user-name">${s.name}</div>
                        <div class="user-dept">紧急: ${s.emergency}</div>
                      </div>
                    </div>
                  </td>
                  <td><span class="badge ${s.dept === '陈列' ? 'badge-info' : 'badge-accent'}">${s.dept} Team</span></td>
                  <td><span class="badge ${s.status === 'active' ? 'badge-active' : 'badge-inactive'}">${s.status === 'active' ? '在职' : '离职'}</span></td>
                  <td>
                    <div class="flex gap-8">
                      <button class="btn btn-sm btn-outline" onclick="openStaffModal(${s.id})">编辑</button>
                      <button class="btn btn-sm btn-secondary" onclick="toggleStaffStatus(${s.id})">${s.status === 'active' ? '离职' : '恢复'}</button>
                    </div>
                  </td>
                </tr>
              `).join('')}
              ${filtered.length === 0 ? `
                <tr><td colspan="4" class="text-center text-muted" style="padding: 40px;">暂无数据</td></tr>
              ` : ''}
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Staff Modal -->
    <div class="modal-overlay" id="staffModal">
      <div class="modal">
        <div class="modal-header">
          <h3 id="staffModalTitle">添加兼职人员</h3>
          <button class="modal-close" onclick="closeStaffModal()">×</button>
        </div>
        <div class="modal-body">
          <input type="hidden" id="staff_edit_id">
          <div class="form-group">
            <label class="form-label">姓名 *</label>
            <input class="form-input" id="staff_name" placeholder="请输入姓名">
          </div>
          <div class="grid-2">
            <div class="form-group">
              <label class="form-label">部门 *</label>
              <select class="form-select" id="staff_dept">
                <option value="陈列">陈列 Team</option>
                <option value="培训">培训 Team</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">紧急联系人</label>
              <input class="form-input" id="staff_emergency" placeholder="姓名 电话">
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="closeStaffModal()">取消</button>
          <button class="btn btn-primary" onclick="saveStaff()">保存</button>
        </div>
      </div>
    </div>
  `;
}

function openStaffModal(id) {
  const modal = document.getElementById('staffModal');
  const title = document.getElementById('staffModalTitle');
  modal.classList.add('active');

  if (id) {
    const s = Store.getStaff(id);
    if (!s) return;
    title.textContent = '编辑兼职人员';
    document.getElementById('staff_edit_id').value = s.id;
    document.getElementById('staff_name').value = s.name;
    document.getElementById('staff_dept').value = s.dept;
    document.getElementById('staff_emergency').value = s.emergency;
  } else {
    title.textContent = '添加兼职人员';
    document.getElementById('staff_edit_id').value = '';
    document.getElementById('staff_name').value = '';
    document.getElementById('staff_dept').value = '陈列';
    document.getElementById('staff_emergency').value = '';
  }
}

function closeStaffModal() {
  document.getElementById('staffModal').classList.remove('active');
}

function saveStaff() {
  const editId = document.getElementById('staff_edit_id').value;
  const name = document.getElementById('staff_name').value.trim();
  const dept = document.getElementById('staff_dept').value;
  const emergency = document.getElementById('staff_emergency').value.trim();

  if (!name) { showToast('请输入姓名', 'warning'); return; }

  const staff = Store.get('staff');
  const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#f43f5e', '#6366f1'];

  if (editId) {
    const idx = staff.findIndex(s => s.id === parseInt(editId));
    if (idx >= 0) {
      staff[idx] = { ...staff[idx], name, dept, emergency };
      showToast(`${name} 信息已更新`);
    }
  } else {
    staff.push({
      id: Store.nextId('staff'),
      name, dept,
      status: 'active',
      emergency: emergency || '未填写',
      avatar_color: colors[Math.floor(Math.random() * colors.length)]
    });
    showToast(`${name} 已添加到团队`);
  }

  Store.set('staff', staff);
  closeStaffModal();
  Router.render();
}

function toggleStaffStatus(id) {
  const staff = Store.get('staff');
  const idx = staff.findIndex(s => s.id === id);
  if (idx >= 0) {
    staff[idx].status = staff[idx].status === 'active' ? 'inactive' : 'active';
    Store.set('staff', staff);
    showToast(`${staff[idx].name} 已${staff[idx].status === 'active' ? '恢复在职' : '标记离职'}`);
    Router.render();
  }
}

/**
 * ========================================
 * Schedule Page
 * ========================================
 */
function renderSchedule() {
  const staff = Store.get('staff').filter(s => s.status === 'active');
  const serviceTeam = staff.filter(s => s.dept === 'Service Team');
  const availability = Store.get('availability');
  const month = availability.month || '2026-06';
  const availData = availability.data || {};

  // === 计算月份每周的日期范围 ===
  const [year, mon] = month.split('-').map(Number);
  const totalDays = new Date(year, mon, 0).getDate();

  // 按自然周拆分（周一至周日）
  const weeks = [];
  let currentWeekStart = new Date(year, mon - 1, 1);
  // 调整到本周一
  const dayOfWeek = currentWeekStart.getDay() || 7;
  currentWeekStart = new Date(year, mon - 1, 1 - (dayOfWeek - 1));

  while (true) {
    const weekEnd = new Date(currentWeekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    // 该周与本月是否有交集
    const overlapStart = new Date(Math.max(currentWeekStart.getTime(), new Date(year, mon - 1, 1).getTime()));
    const overlapEnd = new Date(Math.min(weekEnd.getTime(), new Date(year, mon - 1, totalDays).getTime()));
    if (overlapStart > overlapEnd) break;

    const daysInRange = [];
    for (let d = 1; d <= totalDays; d++) {
      const date = new Date(year, mon - 1, d);
      if (date >= currentWeekStart && date <= weekEnd) {
        daysInRange.push(d);
      }
    }
    if (daysInRange.length > 0) {
      weeks.push({
        label: `${formatDate(`${year}-${String(mon).padStart(2, '0')}-${String(daysInRange[0]).padStart(2, '0')}`)} - ${formatDate(`${year}-${String(mon).padStart(2, '0')}-${String(daysInRange[daysInRange.length - 1]).padStart(2, '0')}`)}`,
        days: daysInRange,
        startDay: daysInRange[0],
        endDay: daysInRange[daysInRange.length - 1],
        daysCount: daysInRange.length,
      });
    }
    currentWeekStart.setDate(currentWeekStart.getDate() + 7);
  }

  // === 为每个 Service Team 成员计算每周供班情况 ===
  const staffWeeklyData = serviceTeam.map(s => {
    const personAvail = availData[s.name];
    const unavailableSet = new Set();
    if (personAvail && personAvail.unavailable) {
      personAvail.unavailable.forEach(d => {
        const dayNum = parseInt(d.split('/')[1]);
        unavailableSet.add(dayNum);
      });
    }
    const monthlyTotal = personAvail ? personAvail.total : 0;

    // 构建实际可供班日期集合：从非unavailable天中按日期顺序取前total个
    // 未填写的天数默认视为不能供班
    const candidates = [];
    for (let d = 1; d <= totalDays; d++) {
      if (!unavailableSet.has(d)) candidates.push(d);
    }
    const availableSet = new Set(candidates.slice(0, monthlyTotal));

    const weekResults = weeks.map(w => {
      const availableDays = w.days.filter(d => availableSet.has(d));
      const weekendDays = w.days.filter(d => {
        const date = new Date(year, mon - 1, d);
        const dow = date.getDay();
        return dow === 0 || dow === 6; // 周六=6, 周日=0
      });
      const availableWeekendDays = weekendDays.filter(d => availableSet.has(d));
      const weekDaysInMonth = w.days.length; // 该周在本月的天数
      const meetMinDays = weekDaysInMonth >= 5 ? availableDays.length >= 4 : availableDays.length >= Math.min(4, weekDaysInMonth);
      const meetWeekend = weekendDays.length > 0 ? availableWeekendDays.length >= 1 : true;

      return {
        weekLabel: w.label,
        availableCount: availableDays.length,
        totalDays: w.days.length,
        weekendAvailable: availableWeekendDays.length,
        weekendTotal: weekendDays.length,
        meetMinDays,
        meetWeekend,
        allPass: meetMinDays && meetWeekend,
      };
    });

    const passWeeks = weekResults.filter(w => w.allPass).length;
    const failWeeks = weekResults.length - passWeeks;

    return {
      name: s.name,
      avatarColor: s.avatar_color,
      monthlyTotal,
      monthlyDays: totalDays,
      unavailableCount: unavailableSet.size,
      unwrittenCount: Math.max(0, totalDays - unavailableSet.size - monthlyTotal),
      unwrittenDates: candidates.slice(monthlyTotal).map(d => `${mon}/${d}`),
      weekResults,
      passWeeks,
      failWeeks,
      overallPass: failWeeks === 0 && monthlyTotal >= 20,
    };
  });

  // === 供班总数汇总 ===
  const totalAvailDays = staffWeeklyData.reduce((sum, s) => sum + s.monthlyTotal, 0);
  const avgAvailDays = (totalAvailDays / staffWeeklyData.length).toFixed(1);
  const fullPassCount = staffWeeklyData.filter(s => s.overallPass).length;
  const weekendFailCount = staffWeeklyData.reduce((sum, s) => sum + s.weekResults.filter(w => !w.meetWeekend).length, 0);
  const weekdayFailCount = staffWeeklyData.reduce((sum, s) => sum + s.weekResults.filter(w => !w.meetMinDays).length, 0);

  return `
    <!-- 顶部统计卡片 -->
    <div class="stats-grid animate-in" style="margin-bottom: 24px;">
      <div class="stat-card accent">
        <div class="stat-icon">👥</div>
        <div class="stat-value">${serviceTeam.length}</div>
        <div class="stat-label">Service Team 人数</div>
        <div class="stat-trend">供班分析对象</div>
      </div>
      <div class="stat-card info">
        <div class="stat-icon">📅</div>
        <div class="stat-value">${totalAvailDays}</div>
        <div class="stat-label">6月总可供天次</div>
        <div class="stat-trend">人均 ${avgAvailDays} 天</div>
      </div>
      <div class="stat-card success">
        <div class="stat-icon">✅</div>
        <div class="stat-value">${fullPassCount}</div>
        <div class="stat-label">全面达标人数</div>
        <div class="stat-trend">${serviceTeam.length > 0 ? Math.round(fullPassCount / serviceTeam.length * 100) : 0}% 达标率</div>
      </div>
      <div class="stat-card warning">
        <div class="stat-icon">⚠️</div>
        <div class="stat-value">${weekdayFailCount + weekendFailCount}</div>
        <div class="stat-label">未达标周次</div>
        <div class="stat-trend">周供班不足 ${weekdayFailCount} · 周末不足 ${weekendFailCount}</div>
      </div>
    </div>

    <!-- 达标标准说明 -->
    <div class="card animate-in" style="margin-bottom: 20px;">
      <div class="card-body" style="padding: 16px 20px;">
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 10px;">
          <span style="font-size: 16px;">📋</span>
          <span style="font-weight: 700; font-size: 14px;">供班达标标准</span>
        </div>
        <div style="display: flex; gap: 24px; flex-wrap: wrap; font-size: 13px; color: var(--text-secondary);">
          <div style="display: flex; align-items: center; gap: 6px;">
            <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: #10b981;"></span>
            <span>每周可供班 <strong style="color: var(--text-primary);">≥ 4 天</strong></span>
          </div>
          <div style="display: flex; align-items: center; gap: 6px;">
            <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: #3b82f6;"></span>
            <span>周末至少提供 <strong style="color: var(--text-primary);">1 天</strong>（周六/周日）</span>
          </div>
          <div style="display: flex; align-items: center; gap: 6px;">
            <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: #f59e0b;"></span>
            <span>月可供天数 <strong style="color: var(--text-primary);">≥ 20 天</strong> 为全面达标</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 每周供班达标分析表 -->
    <div class="card animate-in" style="margin-bottom: 24px;">
      <div class="card-header">
        <h3>📊 Service Team 每周供班达标分析</h3>
        <span style="font-size: 12px; color: var(--text-secondary);">${year}年${mon}月</span>
      </div>
      <div class="card-body" style="padding: 0;">
        <div class="table-container">
          <table class="data-table" style="font-size: 13px;">
            <thead>
              <tr>
                <th style="position: sticky; left: 0; z-index: 2; background: var(--surface); min-width: 90px;">姓名</th>
                ${weeks.map((w, i) => `
                  <th style="text-align: center; min-width: 110px; white-space: nowrap;">
                    第${i + 1}周<br>
                    <span style="font-weight: 400; font-size: 11px; color: var(--text-secondary);">${w.startDay}-${w.endDay}日</span>
                  </th>
                `).join('')}
                <th style="text-align: center;">月总供班</th>
                <th style="text-align: center;">达标周数</th>
                <th style="text-align: center;">综合</th>
              </tr>
            </thead>
            <tbody>
              ${staffWeeklyData.map(s => `
                <tr>
                  <td style="position: sticky; left: 0; z-index: 1; background: var(--surface);">
                    <div style="display: flex; align-items: center; gap: 8px;">
                      <div class="avatar" style="background: ${s.avatarColor}; width: 28px; height: 28px; font-size: 11px;">${getInitials(s.name)}</div>
                      <span style="font-weight: 600;">${s.name}</span>
                    </div>
                  </td>
                  ${s.weekResults.map(w => {
                    let bgColor = '';
                    let icon = '';
                    let detail = `<div style="font-size: 11px; color: var(--text-secondary); margin-top: 2px;">可供 ${w.availableCount}/${w.totalDays} 天</div>`;

                    if (w.allPass) {
                      bgColor = 'rgba(16, 185, 129, 0.08)';
                      icon = '<span style="color: #10b981; font-size: 14px;">✅</span>';
                    } else if (!w.meetMinDays && !w.meetWeekend) {
                      bgColor = 'rgba(239, 68, 68, 0.08)';
                      icon = '<span style="color: #ef4444; font-size: 14px;">❌</span>';
                      detail += `<div style="font-size: 10px; color: #ef4444;">天数不足 · 周末无供班</div>`;
                    } else if (!w.meetMinDays) {
                      bgColor = 'rgba(245, 158, 11, 0.08)';
                      icon = '<span style="color: #f59e0b; font-size: 14px;">⚠️</span>';
                      detail += `<div style="font-size: 10px; color: #f59e0b;">天数不足${4 - w.availableCount}天</div>`;
                    } else {
                      bgColor = 'rgba(59, 130, 246, 0.08)';
                      icon = '<span style="color: #3b82f6; font-size: 14px;">🔵</span>';
                      detail += `<div style="font-size: 10px; color: #3b82f6;">周末无供班</div>`;
                    }

                    return `<td style="text-align: center; background: ${bgColor}; padding: 8px 6px;">
                      <div>${icon} <strong>${w.availableCount}</strong>天</div>
                      ${detail}
                      <div style="font-size: 10px; color: var(--text-secondary); margin-top: 2px;">周末${w.weekendAvailable}/${w.weekendTotal}</div>
                    </td>`;
                  }).join('')}
                  <td style="text-align: center;">
                    <div style="font-weight: 700; font-size: 16px; color: ${s.monthlyTotal >= 20 ? '#10b981' : s.monthlyTotal >= 15 ? '#f59e0b' : '#ef4444'};">${s.monthlyTotal}</div>
                    <div style="font-size: 11px; color: var(--text-secondary);">/ ${s.monthlyDays} 天</div>
                  </td>
                  <td style="text-align: center;">
                    <div style="font-weight: 700;">${s.passWeeks}<span style="color: var(--text-secondary); font-weight: 400;">/${s.weekResults.length}</span></div>
                    <div style="width: 60px; height: 4px; background: var(--border-light); border-radius: 2px; margin: 4px auto 0;">
                      <div style="width: ${s.passWeeks / s.weekResults.length * 100}%; height: 100%; background: ${s.passWeeks === s.weekResults.length ? '#10b981' : '#f59e0b'}; border-radius: 2px;"></div>
                    </div>
                  </td>
                  <td style="text-align: center;">
                    ${s.overallPass
                      ? '<span style="display: inline-block; padding: 3px 10px; border-radius: 12px; font-size: 12px; font-weight: 600; background: rgba(16,185,129,0.12); color: #10b981;">达标</span>'
                      : '<span style="display: inline-block; padding: 3px 10px; border-radius: 12px; font-size: 12px; font-weight: 600; background: rgba(239,68,68,0.1); color: #ef4444;">待改进</span>'
                    }
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- 供班总数排行 + 周末供班分析 -->
    <div class="grid-2 animate-in">
      <div class="card">
        <div class="card-header"><h3>📈 供班总数排行</h3></div>
        <div class="card-body">
          ${staffWeeklyData.sort((a, b) => b.monthlyTotal - a.monthlyTotal).map((s, i) => `
            <div class="flex justify-between items-center" style="padding: 10px 0; border-bottom: 1px solid var(--border-light);">
              <div class="flex items-center gap-12">
                <span style="width: 20px; text-align: center; font-weight: 700; font-size: 13px; color: ${i < 3 ? 'var(--primary)' : 'var(--text-secondary)'};">${i + 1}</span>
                <div class="avatar" style="background: ${s.avatarColor}; width: 32px; height: 32px; font-size: 12px;">${getInitials(s.name)}</div>
                <span class="font-semibold text-sm">${s.name}</span>
              </div>
              <div class="flex items-center gap-8">
                <span style="font-weight: 700; font-size: 15px; color: ${s.monthlyTotal >= 24 ? '#10b981' : s.monthlyTotal >= 18 ? 'var(--text-primary)' : '#ef4444'};">${s.monthlyTotal}</span>
                <span style="font-size: 12px; color: var(--text-secondary);">天</span>
                <div style="width: 80px; height: 6px; background: var(--border-light); border-radius: 3px; overflow: hidden;">
                  <div style="width: ${Math.round(s.monthlyTotal / totalDays * 100)}%; height: 100%; background: ${s.monthlyTotal >= 24 ? '#10b981' : s.monthlyTotal >= 18 ? '#3b82f6' : '#f59e0b'}; border-radius: 3px; transition: width 0.3s;"></div>
                </div>
              </div>
            </div>
          `).join('')}
          <div style="margin-top: 12px; padding-top: 12px; border-top: 2px solid var(--border-light); display: flex; justify-content: space-between; font-size: 13px;">
            <span style="color: var(--text-secondary);">Service Team 总计</span>
            <span style="font-weight: 700;">${totalAvailDays} 天次 · 人均 ${avgAvailDays} 天</span>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-header"><h3>🗓️ 周末供班达标统计</h3></div>
        <div class="card-body">
          <div style="margin-bottom: 16px;">
            ${weeks.map((w, wi) => {
              const weekPassCount = staffWeeklyData.filter(s => s.weekResults[wi] && s.weekResults[wi].meetWeekend).length;
              const weekTotalCount = staffWeeklyData.length;
              const weekFailList = staffWeeklyData.filter(s => s.weekResults[wi] && !s.weekResults[wi].meetWeekend).map(s => s.name);
              const pct = weekTotalCount > 0 ? Math.round(weekPassCount / weekTotalCount * 100) : 0;
              return `
                <div style="margin-bottom: 12px;">
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                    <span style="font-size: 13px; font-weight: 600;">第${wi + 1}周 (${w.startDay}-${w.endDay}日)</span>
                    <span style="font-size: 12px; color: ${pct >= 80 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444'}; font-weight: 600;">${weekPassCount}/${weekTotalCount} 人达标 (${pct}%)</span>
                  </div>
                  <div style="height: 8px; background: var(--border-light); border-radius: 4px; overflow: hidden;">
                    <div style="width: ${pct}%; height: 100%; background: ${pct >= 80 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444'}; border-radius: 4px; transition: width 0.3s;"></div>
                  </div>
                  ${weekFailList.length > 0 ? `<div style="font-size: 11px; color: var(--text-secondary); margin-top: 4px;">未提供周末: ${weekFailList.join('、')}</div>` : ''}
                </div>
              `;
            }).join('')}
          </div>
        </div>
      </div>
    </div>

    <!-- 不可供日期明细 -->
    <div class="card animate-in" style="margin-top: 24px;">
      <div class="card-header">
        <h3>📝 不可供日期明细</h3>
        <span style="font-size: 12px; color: var(--text-secondary);">${year}年${mon}月</span>
      </div>
      <div class="card-body" style="padding: 0;">
        <div class="table-container">
          <table class="data-table" style="font-size: 13px;">
            <thead>
              <tr>
                <th>姓名</th>
                <th>明确不可供</th>
                <th>未填写/暂不可供</th>
                <th>不可供日期明细</th>
                <th>备注</th>
              </tr>
            </thead>
            <tbody>
              ${staffWeeklyData.map(s => {
                const personAvail = availData[s.name];
                const unavailableList = personAvail && personAvail.unavailable ? personAvail.unavailable : [];
                const note = personAvail && personAvail.note ? personAvail.note : '-';
                const unwrittenList = s.unwrittenDates || [];
                const hasAnyUnavailable = unavailableList.length > 0 || unwrittenList.length > 0;
                return `
                  <tr>
                    <td>
                      <div style="display: flex; align-items: center; gap: 8px;">
                        <div class="avatar" style="background: ${s.avatarColor}; width: 28px; height: 28px; font-size: 11px;">${getInitials(s.name)}</div>
                        <span style="font-weight: 600;">${s.name}</span>
                      </div>
                    </td>
                    <td>
                      <span style="display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 12px; font-weight: 600; background: ${unavailableList.length === 0 ? 'rgba(16,185,129,0.1)' : unavailableList.length <= 5 ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)'}; color: ${unavailableList.length === 0 ? '#10b981' : unavailableList.length <= 5 ? '#f59e0b' : '#ef4444'};">
                        ${unavailableList.length} 天
                      </span>
                    </td>
                    <td>
                      <span style="display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 12px; font-weight: 600; background: ${unwrittenList.length === 0 ? 'rgba(16,185,129,0.1)' : 'rgba(156,163,175,0.1)'}; color: ${unwrittenList.length === 0 ? '#10b981' : '#9ca3af'};">
                        ${unwrittenList.length} 天
                      </span>
                    </td>
                    <td style="max-width: 400px;">
                      ${hasAnyUnavailable
                        ? `
                          ${unavailableList.map(d => `<span style="display: inline-block; padding: 1px 6px; margin: 2px; border-radius: 4px; font-size: 11px; background: rgba(239,68,68,0.06); color: #ef4444;">${d}</span>`).join('')}
                          ${unwrittenList.map(d => `<span style="display: inline-block; padding: 1px 6px; margin: 2px; border-radius: 4px; font-size: 11px; background: rgba(156,163,175,0.08); color: #9ca3af;">${d}</span>`).join('')}
                        `
                        : '<span style="color: #10b981; font-size: 12px;">全月可供 ✅</span>'
                      }
                    </td>
                    <td style="color: var(--text-secondary); font-size: 12px;">${note}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

/**
 * ========================================
 * Attendance Page
 * ========================================
 */
function renderAttendance() {
  const staff = Store.get('staff').filter(s => s.status === 'active');
  const linggongData = Store.get('linggongAttendance') || { lastSync: null, records: [] };
  let lgRecords = linggongData.records || [];

  // 灵工打卡统计
  const lgNormal = lgRecords.filter(r => r.status === '考勤正常').length;
  const lgAbnormal = lgRecords.filter(r => r.status === '考勤异常').length;
  const lgOngoing = lgRecords.filter(r => r.status === '考勤中').length;
  const lgTotalHours = lgRecords.reduce((sum, r) => sum + (parseFloat(r.totalHours) || 0), 0);
  const lgTotalLate = lgRecords.filter(r => r.lateMin > 0).length;

  // 名字到头像颜色的映射
  const staffMap = {};
  staff.forEach(s => { staffMap[s.name] = s; });
  // 简称映射
  staffMap['祖白代'] = staff.find(s => s.name === '祖白代') || null;

  // === 考勤数据分析 ===
  const dateStats = {};
  const personStats = {};
  const uniqueDates = new Set();

  lgRecords.forEach(r => {
    const d = r.date;
    uniqueDates.add(d);
    if (!dateStats[d]) {
      dateStats[d] = { count: 0, totalHours: 0, normal: 0, abnormal: 0, ongoing: 0 };
    }
    dateStats[d].count++;
    dateStats[d].totalHours += parseFloat(r.totalHours) || 0;
    if (r.status === '考勤正常') dateStats[d].normal++;
    else if (r.status === '考勤异常') dateStats[d].abnormal++;
    else if (r.status === '考勤中') dateStats[d].ongoing++;

    if (!personStats[r.name]) {
      personStats[r.name] = { name: r.name, count: 0, totalHours: 0, lateCount: 0, lateMinTotal: 0 };
    }
    personStats[r.name].count++;
    personStats[r.name].totalHours += parseFloat(r.totalHours) || 0;
    if (r.lateMin > 0) {
      personStats[r.name].lateCount++;
      personStats[r.name].lateMinTotal += parseFloat(r.lateMin) || 0;
    }
  });

  const sortedDates = Array.from(uniqueDates).sort();
  const sortedPersonStats = Object.values(personStats).sort((a, b) => b.totalHours - a.totalHours);

  return `
    <div class="flex justify-between items-center mb-4 animate-in">
      <h3 style="font-size: 18px; font-weight: 700;">📋 考勤记录</h3>
      <div style="display: flex; gap: 8px;">
        <button class="btn btn-secondary" onclick="syncLinggongData()">🔄 同步灵工打卡</button>
      </div>
    </div>

    <!-- 灵工打卡数据区域 -->
    ${lgRecords.length > 0 ? `
    <div class="card animate-in" style="margin-bottom: 24px; border: 2px solid var(--primary); border-radius: var(--radius-lg);">
      <div style="background: linear-gradient(135deg, var(--primary) 0%, #2d2d5a 100%); padding: 16px 20px; border-radius: var(--radius-lg) var(--radius-lg) 0 0; color: #fff;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div>
            <h3 style="font-size: 16px; font-weight: 700;">🤖 灵工打卡 · 实时考勤</h3>
            <p style="font-size: 12px; opacity: 0.7; margin-top: 4px;">上次同步: ${linggongData.lastSync ? new Date(linggongData.lastSync).toLocaleString('zh-CN') : '未同步'}</p>
          </div>
          <div style="display: flex; gap: 16px;">
            <div style="text-align: center;">
              <div style="font-size: 20px; font-weight: 800;">${lgRecords.length}</div>
              <div style="font-size: 11px; opacity: 0.7;">排班人次</div>
            </div>
            <div style="text-align: center;">
              <div style="font-size: 20px; font-weight: 800;">${lgTotalHours.toFixed(1)}</div>
              <div style="font-size: 11px; opacity: 0.7;">总工时</div>
            </div>
          </div>
        </div>
      </div>
      <div class="card-body" style="padding: 0;">
        <!-- 每日考勤统计卡片 -->
        <div style="padding: 16px 16px 8px; border-bottom: 1px solid var(--border-light);">
          <h4 style="font-size: 14px; font-weight: 700; margin-bottom: 12px;">📅 每日考勤统计</h4>
          <div style="display: flex; gap: 12px; overflow-x: auto; padding-bottom: 8px;">
            ${sortedDates.map(d => {
              const s = dateStats[d];
              const dateLabel = d.replace(/^2026\//, '');
              return `
                <div style="min-width: 150px; background: var(--bg-secondary); border-radius: var(--radius); padding: 12px; border: 1px solid var(--border-light); flex-shrink: 0;">
                  <div style="font-weight: 700; font-size: 14px; margin-bottom: 8px;">${dateLabel}</div>
                  <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 4px;">
                    <span style="color: var(--text-secondary);">出勤</span>
                    <span style="font-weight: 600;">${s.count}人</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 4px;">
                    <span style="color: var(--text-secondary);">工时</span>
                    <span style="font-weight: 600;">${s.totalHours.toFixed(1)}h</span>
                  </div>
                  <div style="display: flex; gap: 4px; margin-top: 8px; flex-wrap: wrap;">
                    <span style="font-size: 11px; padding: 2px 6px; border-radius: 4px; background: rgba(16,185,129,0.1); color: #10b981;">正常${s.normal}</span>
                    <span style="font-size: 11px; padding: 2px 6px; border-radius: 4px; background: rgba(239,68,68,0.1); color: #ef4444;">异常${s.abnormal}</span>
                    ${s.ongoing > 0 ? `<span style="font-size: 11px; padding: 2px 6px; border-radius: 4px; background: rgba(59,130,246,0.1); color: #3b82f6;">考勤中${s.ongoing}</span>` : ''}
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- 日期筛选器 + 统计条 -->
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 16px; background: var(--bg-secondary); border-bottom: 1px solid var(--border-light); flex-wrap: wrap; gap: 8px;">
          <div style="display: flex; gap: 10px; align-items: center;">
            <span style="font-size: 13px; font-weight: 600;">日期筛选:</span>
            <select class="form-select" style="min-width: 120px; font-size: 13px; padding: 5px 8px;" onchange="filterAttendanceByDate(this.value)">
              <option value="all">全部日期</option>
              ${sortedDates.map(d => `<option value="${d}">${d.replace(/^2026\//, '')}</option>`).join('')}
            </select>
            <span id="attendanceFilterHint" style="font-size: 12px; color: var(--text-secondary);">显示全部记录</span>
          </div>
          <div style="display: flex; gap: 12px; align-items: center;">
            <span style="display: inline-flex; align-items: center; gap: 4px; font-size: 12px;">
              <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #10b981;"></span>
              正常 ${lgNormal}人
            </span>
            <span style="display: inline-flex; align-items: center; gap: 4px; font-size: 12px;">
              <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #ef4444;"></span>
              异常 ${lgAbnormal}人
            </span>
            <span style="display: inline-flex; align-items: center; gap: 4px; font-size: 12px;">
              <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #3b82f6;"></span>
              考勤中 ${lgOngoing}人
            </span>
            ${lgTotalLate > 0 ? `<span style="display: inline-flex; align-items: center; gap: 4px; font-size: 12px; color: #ef4444; font-weight: 600;">⚠️ 迟到 ${lgTotalLate}人</span>` : ''}
          </div>
        </div>
        <div class="table-container">
          <table class="data-table" style="font-size: 13px;">
            <thead>
              <tr>
                <th>姓名</th>
                <th>日期</th>
                <th>排班时间</th>
                <th>休息</th>
                <th>签到</th>
                <th>签退</th>
                <th>工时</th>
                <th>状态</th>
                <th>异常</th>
              </tr>
            </thead>
            <tbody>
              ${lgRecords.slice().reverse().map(r => {
                const s = staffMap[r.name];
                const avatarColor = s ? s.avatar_color : '#6366f1';
                const initials = s ? getInitials(s.name) : r.name.slice(-2);
                const dateStr = r.date.replace(/\//g, '-').replace(/^2026-/, '');

                let statusBg, statusText, statusIcon;
                if (r.status === '考勤正常') {
                  statusBg = 'rgba(16,185,129,0.1)'; statusText = '#10b981'; statusIcon = '✅';
                } else if (r.status === '考勤异常') {
                  statusBg = 'rgba(239,68,68,0.1)'; statusText = '#ef4444'; statusIcon = '❌';
                } else {
                  statusBg = 'rgba(59,130,246,0.1)'; statusText = '#3b82f6'; statusIcon = '🕐';
                }

                const exceptionParts = [];
                if (r.lateMin > 0) exceptionParts.push(`迟到${r.lateMin}min`);
                if (r.leaveMin > 0) exceptionParts.push(`早退${r.leaveMin}min`);

                return `
                  <tr class="attendance-row" data-date="${r.date}" style="${r.status === '考勤异常' ? 'background: rgba(239,68,68,0.03);' : ''}">
                    <td>
                      <div style="display: flex; align-items: center; gap: 8px;">
                        <div class="avatar" style="background: ${avatarColor}; width: 28px; height: 28px; font-size: 11px;">${initials}</div>
                        <span style="font-weight: 600;">${r.name}</span>
                      </div>
                    </td>
                    <td>${dateStr}</td>
                    <td style="font-size: 12px;">${r.scheduleTime}</td>
                    <td style="font-size: 12px; color: var(--text-secondary);">${r.restTime || '-'}</td>
                    <td style="font-weight: 500; color: ${r.lateMin > 0 ? '#ef4444' : 'var(--text-primary)'};">${r.clockIn || '-'}</td>
                    <td style="font-weight: 500;">${r.clockOut || '<span style="color: var(--text-muted);">—</span>'}</td>
                    <td>
                      <span style="font-weight: 700; color: ${r.totalHours >= 8 ? '#10b981' : r.totalHours > 0 ? 'var(--text-primary)' : 'var(--text-muted)'};">
                        ${r.totalHours > 0 ? r.totalHours + 'h' : '-'}
                      </span>
                    </td>
                    <td>
                      <span style="display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 12px; font-weight: 600; background: ${statusBg}; color: ${statusText};">
                        ${statusIcon} ${r.status}
                      </span>
                    </td>
                    <td>
                      ${exceptionParts.length > 0
                        ? exceptionParts.map(p => `<span style="display: inline-block; padding: 1px 6px; margin: 1px; border-radius: 4px; font-size: 11px; background: rgba(239,68,68,0.08); color: #ef4444;">${p}</span>`).join('')
                        : '<span style="color: var(--text-muted);">-</span>'
                      }
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
    ` : `
    <div class="card animate-in" style="margin-bottom: 24px;">
      <div class="card-body" style="text-align: center; padding: 32px;">
        <div style="font-size: 40px; margin-bottom: 12px;">🤖</div>
        <h4 style="font-weight: 600; margin-bottom: 8px;">灵工打卡数据未同步</h4>
        <p style="font-size: 13px; color: var(--text-secondary); margin-bottom: 16px;">点击"同步灵工打卡"从灵工打卡后台拉取最新考勤数据</p>
        <button class="btn btn-primary" onclick="syncLinggongData()">🔄 立即同步</button>
      </div>
    </div>
    `}

    <!-- 个人累计工时排行 -->
    ${lgRecords.length > 0 ? `
    <div class="card animate-in" style="margin-bottom: 24px;">
      <div class="card-header">
        <h3>⏱️ 个人累计工时排行</h3>
        <span style="font-size: 12px; color: var(--text-secondary);">${sortedDates.length > 0 ? sortedDates[0].replace(/^2026\//, '') + ' ~ ' + sortedDates[sortedDates.length-1].replace(/^2026\//, '') : ''} · 共 ${sortedDates.length} 天</span>
      </div>
      <div class="card-body">
        ${sortedPersonStats.map((p, i) => {
          const s = staffMap[p.name];
          const avatarColor = s ? s.avatar_color : '#6366f1';
          const initials = s ? getInitials(s.name) : p.name.slice(-2);
          const avgHours = p.count > 0 ? (p.totalHours / p.count).toFixed(1) : '0.0';
          return `
            <div class="flex justify-between items-center" style="padding: 10px 0; border-bottom: 1px solid var(--border-light);">
              <div class="flex items-center gap-12">
                <span style="width: 20px; text-align: center; font-weight: 700; font-size: 13px; color: ${i < 3 ? 'var(--primary)' : 'var(--text-secondary)'}">${i + 1}</span>
                <div class="avatar" style="background: ${avatarColor}; width: 32px; height: 32px; font-size: 12px;">${initials}</div>
                <div>
                  <span class="font-semibold text-sm">${p.name}</span>
                  <div style="font-size: 11px; color: var(--text-secondary);">出勤 ${p.count} 天 · 平均 ${avgHours}h/天</div>
                </div>
              </div>
              <div class="flex items-center gap-12">
                <div style="text-align: right;">
                  <div style="font-weight: 700; font-size: 15px; color: ${p.totalHours >= 40 ? '#10b981' : p.totalHours >= 20 ? 'var(--text-primary)' : '#f59e0b'}">${p.totalHours.toFixed(1)}h</div>
                  <div style="font-size: 11px; color: var(--text-secondary);">总工时</div>
                </div>
                ${p.lateCount > 0 ? `<span style="font-size: 11px; color: #ef4444; font-weight: 600;">⚠️ 迟到 ${p.lateCount} 次</span>` : '<span style="font-size: 11px; color: #10b981;">✅ 无迟到</span>'}
              </div>
            </div>
          `;
        }).join('')}
        <div style="margin-top: 12px; padding-top: 12px; border-top: 2px solid var(--border-light); display: flex; justify-content: space-between; font-size: 13px;">
          <span style="color: var(--text-secondary);">累计统计</span>
          <span style="font-weight: 700;">${lgRecords.length} 人次 · ${lgTotalHours.toFixed(1)} 总工时 · ${sortedPersonStats.length} 人参与</span>
        </div>
      </div>
    </div>
    ` : ''}
  `;
}

function syncLinggongData() {
  // 创建隐藏的文件选择器，让用户选择 fetch_linggong.js 生成的 JSON 文件
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = function(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(event) {
      try {
        const data = JSON.parse(event.target.result);
        if (!data.records || !Array.isArray(data.records)) {
          showToast('JSON 格式不正确，请选择 weekly_attendance_clean.json', 'warning');
          return;
        }

        // 标准化数据格式
        const normalizedRecords = data.records.map(r => ({
          name: r.name || '',
          date: r.date || '',
          scheduleTime: r.scheduleTime || '',
          restTime: r.restTime || '',
          clockIn: r.clockIn || '',
          clockOut: r.clockOut || '',
          status: r.status || '未知',
          totalHours: parseFloat(r.totalHours) || 0,
          lateMin: parseInt(r.lateMin) || 0,
          leaveMin: parseInt(r.leaveMin) || 0,
          overtime: parseFloat(r.overtime) || 0,
          department: r.department || '',
          project: r.project || '',
        }));

        Store.set('linggongAttendance', {
          lastSync: new Date().toISOString(),
          records: normalizedRecords,
        });

        showToast(`✅ 灵工打卡数据已同步！共 ${normalizedRecords.length} 条记录`, 'success');
        Router.render();
      } catch (err) {
        console.error(err);
        showToast('解析 JSON 失败，请检查文件格式', 'warning');
      }
    };
    reader.readAsText(file);
  };
  input.click();
}

function filterAttendanceByDate(selectedDate) {
  const rows = document.querySelectorAll('.attendance-row');
  let visibleCount = 0;
  rows.forEach(row => {
    if (selectedDate === 'all' || row.dataset.date === selectedDate) {
      row.style.display = '';
      visibleCount++;
    } else {
      row.style.display = 'none';
    }
  });
  const hint = document.getElementById('attendanceFilterHint');
  if (hint) {
    hint.textContent = selectedDate === 'all' ? '显示全部记录' : `显示 ${selectedDate.replace(/^2026\//, '')} 的记录`;
  }
}

/**
 * ========================================
 * Ratings Page - Fun Edition
 * ========================================
 */

// 个性化称号生成器
function getRatingTitle(scores, avgScore, staffName) {
  const s = scores;
  const allHigh = Object.values(s).every(v => v >= 4);
  const perfHigh = (s.performance || 0) >= 4;
  const availHigh = (s.availability || 0) >= 5;
  const behHigh = (s.behavior || 0) >= 5;
  const attPerfect = (s.attendance || 0) >= 5;
  const reviewHigh = (s.customerReview || 0) >= 5;
  const perfLow = (s.performance || 0) <= 1;
  const attLow = (s.attendance || 0) <= 2;

  // S 级称号（综合 ≥4.6）
  if (avgScore >= 4.8) return { title: '传奇店王', emoji: '👑', tier: 'tier-s', motto: '"这个店的顶梁柱，没有之一"' };
  if (allHigh && perfHigh) return { title: '全能战士', emoji: '⚡', tier: 'tier-s', motto: '"攻守兼备，六边形战士"' };

  // A 级称号（综合 4.2-4.5）
  if (perfHigh && availHigh) return { title: '销售主力', emoji: '🔥', tier: 'tier-a', motto: '"能卖能扛，店铺发动机"' };
  if (behHigh && attPerfect && reviewHigh) return { title: '服务之星', emoji: '🌟', tier: 'tier-a', motto: '"顾客心中的白月光"' };
  if (attPerfect && availHigh) return { title: '铁人担当', emoji: '💪', tier: 'tier-a', motto: '"风雨无阻，随叫随到"' };
  if (reviewHigh) return { title: '好评收割机', emoji: '✨', tier: 'tier-a', motto: '"大众点评的宠儿"' };
  if (perfHigh) return { title: '业绩猎手', emoji: '🎯', tier: 'tier-a', motto: '"成交转化率拉满"' };

  // B 级称号（综合 4.0-4.1）
  if (avgScore >= 4.0) return { title: '稳中向好', emoji: '📈', tier: 'tier-b', motto: '"基础扎实，潜力可期"' };

  // C 级称号（综合 3.5-3.9）
  if (perfLow && attPerfect) return { title: '勤勉新人', emoji: '🌱', tier: 'tier-c', motto: '"态度满分，业绩待开发"' };
  if (attLow) return { title: '考勤修补匠', emoji: '🔧', tier: 'tier-c', motto: '"先搞定打卡，再谈其他"' };
  if (perfLow) return { title: '蓄力选手', emoji: '🔋', tier: 'tier-c', motto: '"还没发力，别急着下定论"' };

  return { title: '潜力股', emoji: '💎', tier: 'tier-c', motto: '"一切才刚刚开始"' };
}

// 成就徽章生成器
function getAchievements(scores, comment) {
  const badges = [];
  const s = scores;

  if ((s.performance || 0) >= 5) badges.push({ icon: '🏆', label: '时产之王', desc: '销售业绩5分' });
  if ((s.availability || 0) >= 5) badges.push({ icon: '🛡️', label: '出勤铁人', desc: '工时支持满分' });
  if ((s.behavior || 0) >= 5) badges.push({ icon: '🎪', label: '门迎MVP', desc: '行为规范满分' });
  if ((s.attendance || 0) >= 5) badges.push({ icon: '⏰', label: '零迟到', desc: '考勤纪律满分' });
  if ((s.customerReview || 0) >= 5) badges.push({ icon: '💕', label: '好评达人', desc: '顾客好评满分' });

  // 从 comment 提取特殊成就
  if (comment) {
    if (/大众点评好评[1-9]/.test(comment) && !badges.find(b => b.label === '好评达人')) {
      const m = comment.match(/大众点评好评(\d+)条/);
      if (m && parseInt(m[1]) >= 2) badges.push({ icon: '📝', label: `${m[1]}条好评`, desc: '大众点评认可' });
    }
    if (/退货/.test(comment)) badges.push({ icon: '↩️', label: '退货刺客', desc: '遭遇退货扣减' });
    if (/旷工/.test(comment)) badges.push({ icon: '⚠️', label: '旷工记录', desc: '本月有旷工' });
  }

  // 全能徽章
  const allFive = Object.values(s).every(v => v >= 5);
  if (allFive) badges.unshift({ icon: '🎖️', label: '全维满分', desc: '五项全满分' });

  return badges.slice(0, 4); // 最多显示4个
}

// 等级计算（将分数映射为1-99级）
function getRatingLevel(avgScore) {
  return Math.round(avgScore * 20); // 5.0=100, 4.0=80, 3.0=60
}

// 维度图标
const DIMENSION_META = {
  availability: { icon: '🛡️', color: '#3b82f6' },
  performance: { icon: '🎯', color: '#f59e0b' },
  behavior: { icon: '🎪', color: '#8b5cf6' },
  attendance: { icon: '⏰', color: '#10b981' },
  customerReview: { icon: '💕', color: '#ec4899' },
};

/**
 * 工时支持评分（倒扣制 + 换班调整）
 * 规则：基础5分，每周可供排班≥4天且周末至少1天→该周达标
 *      不满足条件的周 → 每周扣1分（最低1分）
 *      换班：申请换班>1次 → 超出每1次-0.5分；被换班顶班 → 每次+0.5分（上限+1）
 */
function calcAvailabilityScore(staffName) {
  const availability = Store.get('availability');
  const shiftChanges = Store.get('shiftChanges') || [];
  const availData = (availability && availability.data && availability.data[staffName]) || { total: 0, unavailable: [] };

  // Parse unavailable days → Set of day-of-month numbers
  const unavailableDays = new Set(
    (availData.unavailable || []).map(d => parseInt(String(d).split('/')[1]))
  );

  // June 2026 weeks (Mon-Sun, June 1 = Monday)
  const weeks = [
    { name: 'W1', label: '6/1-6/7',   days: [1,2,3,4,5,6,7],     weekends: [6,7] },
    { name: 'W2', label: '6/8-6/14',  days: [8,9,10,11,12,13,14], weekends: [13,14] },
    { name: 'W3', label: '6/15-6/21', days: [15,16,17,18,19,20,21], weekends: [20,21] },
    { name: 'W4', label: '6/22-6/28', days: [22,23,24,25,26,27,28], weekends: [27,28] },
  ];

  const weekResults = weeks.map(w => {
    const availDays = w.days.filter(d => !unavailableDays.has(d)).length;
    const weekendAvail = w.weekends.some(d => !unavailableDays.has(d));
    const passed = availDays >= 4 && weekendAvail;
    return { ...w, availDays, weekendAvail, passed };
  });

  const passedCount = weekResults.filter(w => w.passed).length;
  const failedCount = weeks.length - passedCount; // 未达标周数

  // 倒扣制：基础5分，每有一周未达标扣1分
  const BASE_SCORE = 5;
  const weekDeduction = failedCount * 1; // -1 per unmet week
  const weekScore = Math.max(1, BASE_SCORE - weekDeduction);

  // Shift change stats
  const applicantCount = shiftChanges.filter(sc => sc.applicant === staffName).length;
  const targetCount = shiftChanges.filter(sc => sc.target === staffName).length;

  // Adjustments
  const penalty = Math.max(0, applicantCount - 1) * 0.5; // -0.5 per shift beyond 1
  const bonus = Math.min(targetCount * 0.5, 1.0);  // +0.5 per cover, cap +1

  let finalScore = Math.max(1, Math.min(5, weekScore - penalty + bonus));

  return {
    score: parseFloat(finalScore.toFixed(1)),  // 保留1位小数，直观展示带小数的得分
    baseScore: BASE_SCORE,
    weekDeduction,  // 未达标扣分
    weekScore,      // 周达标后得分
    penalty,
    bonus,
    finalScore,
    applicantCount,
    targetCount,
    weekResults,
    passedCount,
    failedCount,
  };
}

/**
 * 销售业绩评分（时产 + UPT 双维度各50%，月销售额达标加成）
 *
 * 时产维度（hourly）：
 *   ≥300 → 5 | ≥210 → 4 | ≥150 → 3 | ≥100 → 2 | <100 → 1
 * UPT维度（连带率 = 件数 ÷ 交易笔数）：
 *   ≥1.5 → 5 | ≥1.3 → 4 | ≥1.1 → 3 | ≥0.9 → 2 | <0.9 → 1
 * 月销售额目标加成：
 *   ≥20000 → +0.5 bonus（封顶5分）；未达标不扣分
 * 最终 = (时产分 + UPT分) / 2 + 达标加成，保留1位小数，上限5
 */
function calcPerformanceScore(staffName) {
  const perfData = Store.get('performanceData') || {};
  const june = perfData.june || {};
  const records = june.records || [];
  const record = records.find(r => r.name === staffName);

  const SALES_TARGET = 20000; // 月销售额目标 2万

  // Fallback：找不到数据则返回静态评分
  if (!record) {
    return { score: 3, hourlyScore: 0, uptScore: 0, hourly: 0, upt: 0, sales: 0, targetMet: false, fallback: true };
  }

  const hourly = record.hourlyOutput || 0;
  const qty = record.qty || 0;
  const tickets = record.tickets || 1;
  const upt = tickets > 0 ? qty / tickets : 0;
  const sales = record.sales || 0;

  // 时产评分
  let hourlyScore;
  if (hourly >= 300) hourlyScore = 5;
  else if (hourly >= 210) hourlyScore = 4;
  else if (hourly >= 150) hourlyScore = 3;
  else if (hourly >= 100) hourlyScore = 2;
  else hourlyScore = 1;

  // UPT评分
  let uptScore;
  if (upt >= 1.5) uptScore = 5;
  else if (upt >= 1.3) uptScore = 4;
  else if (upt >= 1.1) uptScore = 3;
  else if (upt >= 0.9) uptScore = 2;
  else uptScore = 1;

  // 双维度各50%
  const rawAvg = (hourlyScore + uptScore) / 2;

  // 月销售额达标加成
  const targetMet = sales >= SALES_TARGET;
  const targetBonus = targetMet ? 0.5 : 0;

  // 最终分 = 双维度均值 + 达标加成，封顶5
  let finalScore = Math.max(1, Math.min(5, parseFloat((rawAvg + targetBonus).toFixed(1))));

  return {
    score: finalScore,
    hourlyScore,
    uptScore,
    hourly,
    upt: parseFloat(upt.toFixed(2)),
    sales,
    qty,
    tickets,
    targetMet,
    targetBonus,
    salesTarget: SALES_TARGET,
  };
}

/**
 * 顾客好评评分（基于大众点评好评数量，线性递增）
 *
 * 0条 → 1分（基础分）
 * 1条 → 2分（基础1 + 第1条+1）
 * n条(n≥2) → 2 + 0.5×(n-1)，封顶5分
 *
 * 示例：1条=2, 2条=2.5, 3条=3, 4条=3.5, 5条=4, 6条=4.5, 7条=5
 */
function calcCustomerReviewScore(staffName) {
  const reviews = Store.get('customerReviews') || [];
  const myReviews = reviews.filter(r => r.staffName === staffName);
  const count = myReviews.length;

  let score;
  if (count === 0) score = 1;
  else if (count === 1) score = 2;
  else score = Math.min(5, 2 + 0.5 * (count - 1));

  return { score: parseFloat(score.toFixed(1)), count, reviews: myReviews };
}

function renderRatings() {
  const ratings = Store.get('ratings');
  const staff = Store.get('staff').filter(s => s.status === 'active');

  // 按综合评分排序（高到低）- 工时支持 + 销售业绩 + 顾客好评 动态计算
  const enrichedRatings = ratings.map(r => {
    const s = Store.getStaff(r.staffId);
    const staffName = s ? s.name : '';
    const availCalc = calcAvailabilityScore(staffName);
    const perfCalc = calcPerformanceScore(staffName);
    const reviewCalc = calcCustomerReviewScore(staffName);
    const dynamicScores = { ...r.scores, availability: availCalc.score, performance: perfCalc.score, customerReview: reviewCalc.score };
    const dynamicAvg = Object.values(dynamicScores).reduce((a, b) => a + b, 0) / Object.values(dynamicScores).length;
    return { ...r, _dynamicAvg: dynamicAvg, _availCalc: availCalc, _perfCalc: perfCalc, _reviewCalc: reviewCalc };
  });
  const sortedRatings = [...enrichedRatings].sort((a, b) => b._dynamicAvg - a._dynamicAvg);

  return `
    <div class="animate-in" style="margin-bottom: 24px;">
      <div style="background: linear-gradient(135deg, #1a1a2e 0%, #2d2d4a 50%, #1e3a5f 100%); border-radius: var(--radius-lg); padding: 24px; color: #fff; position: relative; overflow: hidden;">
        <div style="position: absolute; top: -20px; right: -20px; font-size: 80px; opacity: 0.05; transform: rotate(-15deg);">🏆</div>
        <h2 style="font-size: 20px; font-weight: 800; display: flex; align-items: center; gap: 8px;">
          ⭐ 表现评分
          <span style="font-size: 11px; padding: 3px 8px; background: rgba(255,255,255,0.1); border-radius: 20px; font-weight: 600;">FUN EDITION</span>
        </h2>
        <p style="font-size: 13px; opacity: 0.7; margin-top: 4px;">2026年6月 · Service Team 全员评估 · 综合评分 ≥ 4.0 可享 ¥60/h 时薪</p>
        <div style="display: flex; gap: 12px; margin-top: 10px; flex-wrap: wrap;">
          <span style="font-size: 11px; opacity: 0.6;">🛡️ 工时支持 <span style="opacity: 0.5; font-size: 10px;">(基础5分·每周不达标-1)</span></span>
          <span style="font-size: 11px; opacity: 0.6;">🎯 销售业绩 <span style="opacity: 0.5; font-size: 10px;">(时产+UPT各50% · 月销2万+0.5)</span></span>
          <span style="font-size: 11px; opacity: 0.6;">🎪 行为规范</span>
          <span style="font-size: 11px; opacity: 0.6;">⏰ 考勤纪律</span>
          <span style="font-size: 11px; opacity: 0.6;">💕 顾客好评 <span style="opacity: 0.5; font-size: 10px;">(基础1+每条好评递增)</span></span>
        </div>
      </div>
    </div>

    <!-- 评分概览 -->
    <div class="stats-grid animate-in" style="grid-template-columns: repeat(4, 1fr);">
      <div class="stat-card success">
        <div class="stat-value">${enrichedRatings.filter(r => r._dynamicAvg >= 4.0).length} <span style="font-size: 14px; opacity: 0.5;">/${enrichedRatings.length}</span></div>
        <div class="stat-label">🎖️ ¥60/h 达标</div>
      </div>
      <div class="stat-card danger">
        <div class="stat-value">${enrichedRatings.filter(r => r._dynamicAvg < 4.0).length}</div>
        <div class="stat-label">💪 待提升选手</div>
      </div>
      <div class="stat-card accent">
        <div class="stat-value">${(enrichedRatings.reduce((s, r) => s + r._dynamicAvg, 0) / enrichedRatings.length).toFixed(1)}</div>
        <div class="stat-label">⭐ 团队均分</div>
      </div>
      <div class="stat-card info">
        <div class="stat-value">¥${enrichedRatings.filter(r => r._dynamicAvg >= 4.0).length * 60 + enrichedRatings.filter(r => r._dynamicAvg < 4.0).length * 28}</div>
        <div class="stat-label">💰 时薪支出/h</div>
      </div>
    </div>

    <!-- TOP3 荣誉墙 -->
    ${(() => {
      const top3 = sortedRatings.slice(0, 3);
      if (top3.length === 0) return '';
      const podiumStyles = [
        { medal: '🥇', bg: 'linear-gradient(135deg, #fbbf2433, #f59e0b22)', border: '#f59e0b', label: 'MVP', height: '64px' },
        { medal: '🥈', bg: 'linear-gradient(135deg, #94a3b833, #64748b22)', border: '#94a3b8', label: '亚军', height: '52px' },
        { medal: '🥉', bg: 'linear-gradient(135deg, #f9731633, #fb923c22)', border: '#f97316', label: '季军', height: '44px' },
      ];
      return `
        <div class="animate-in" style="display: flex; gap: 12px; margin-top: 20px; align-items: flex-end;">
          ${top3.map((r, i) => {
            const s = Store.getStaff(r.staffId);
            const ti = getRatingTitle(r.scores, r._dynamicAvg, s ? s.name : '');
            const ps = podiumStyles[i];
            return `
              <div style="flex: 1; background: ${ps.bg}; border: 1px solid ${ps.border}44; border-radius: var(--radius-lg); padding: 16px; text-align: center; position: relative; overflow: hidden;">
                <div style="position: absolute; top: 0; left: 0; right: 0; height: ${ps.height}; background: linear-gradient(180deg, ${ps.border}11, transparent); border-radius: var(--radius-lg) var(--radius-lg) 0 0;"></div>
                <div style="font-size: 28px; margin-bottom: 4px; position: relative;">${ps.medal}</div>
                <div style="font-size: 10px; font-weight: 700; color: ${ps.border}; letter-spacing: 1px; margin-bottom: 8px; position: relative;">${ps.label}</div>
                ${s ? `<div class="avatar" style="background: ${s.avatar_color}; width: 36px; height: 36px; font-size: 13px; margin: 0 auto 6px; position: relative;">${getInitials(s.name)}</div>` : ''}
                <div style="font-weight: 700; font-size: 14px; position: relative;">${s ? s.name : '未知'}</div>
                <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px; position: relative;">${ti.emoji} ${ti.title}</div>
                <div style="font-size: 22px; font-weight: 800; color: ${ps.border}; margin-top: 4px; position: relative;">${r._dynamicAvg.toFixed(1)}</div>
              </div>
            `;
          }).join('')}
        </div>
      `;
    })()}

    <!-- 评分卡片列表 -->
    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(390px, 1fr)); gap: 16px; margin-top: 20px;">
      ${sortedRatings.map((r, idx) => {
        const s = Store.getStaff(r.staffId);
        const staffName = s ? s.name : '';

        // === 使用 enrichedRatings 里的动态工时支持数据 ===
        const availCalc = r._availCalc;
        const availScore = availCalc.score;
        const dynamicAvg = r._dynamicAvg;
        const dynamicHourlyRate = dynamicAvg >= 4.0 ? 60 : 28;
        const isTop = dynamicAvg >= 4.0;
        const borderColor = dynamicAvg >= 4.5 ? '#10b981' : dynamicAvg >= 4.0 ? '#3b82f6' : dynamicAvg >= 3.5 ? '#f59e0b' : '#ef4444';
        const medalIcon = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '';

        const dynamicScores = { ...r.scores, availability: availScore, performance: r._perfCalc.score, customerReview: r._reviewCalc.score };
        const reviewScore = r._reviewCalc.score;
        const reviewCalc = r._reviewCalc;
        const titleInfo = getRatingTitle(dynamicScores, dynamicAvg, staffName);
        const achievements = getAchievements(dynamicScores, r.comment);
        const level = getRatingLevel(dynamicAvg);
        const ringColor = dynamicAvg >= 4.5 ? '#10b981' : dynamicAvg >= 4.0 ? '#3b82f6' : dynamicAvg >= 3.5 ? '#f59e0b' : '#ef4444';
        const ringCircumference = 2 * Math.PI * 22;
        const ringDash = (level / 100) * ringCircumference;
        const perfCalc = r._perfCalc;
        const dimensions = [
          { key: 'availability', label: '工时支持', val: availScore },
          { key: 'performance', label: '销售业绩', val: perfCalc.score },
          { key: 'behavior', label: '行为规范', val: r.scores.behavior },
          { key: 'attendance', label: '考勤纪律', val: r.scores.attendance },
          { key: 'customerReview', label: '顾客好评', val: reviewScore },
        ];
        return `
          <div class="card animate-in" style="border-left: 4px solid ${borderColor}; overflow: visible; position: relative; transition: transform 0.3s cubic-bezier(0.16,1,0.3,1), box-shadow 0.3s;" onmouseenter="this.style.transform='translateY(-4px)';this.style.boxShadow='0 12px 32px rgba(0,0,0,0.12)';" onmouseleave="this.style.transform='';this.style.boxShadow='';">
            <div style="padding: 20px;">
              <!-- 头部：排名 + 头像 + 等级环 -->
              <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 14px;">
                <div style="display: flex; align-items: center; gap: 10px;">
                  ${medalIcon ? `<span style="font-size: 22px; animation: floatEmoji 2s ease-in-out infinite;">${medalIcon}</span>` : `<span class="rating-vs-label" style="width: 24px; text-align: center;">#${idx + 1}</span>`}
                  ${s ? `<div class="avatar" style="background: ${s.avatar_color}; width: 42px; height: 42px; font-size: 14px;">${getInitials(s.name)}</div>` : ''}
                  <div>
                    <div style="font-weight: 700; font-size: 16px; display: flex; align-items: center; gap: 6px;">
                      ${s ? s.name : '未知'}
                      ${r.scores.customerReview >= 5 && /大众点评好评/.test(r.comment) ? '<span style="font-size: 13px;" title="大众点评好评认证">✓</span>' : ''}
                    </div>
                    <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">${r.month}</div>
                  </div>
                </div>
                <div class="rating-level-ring">
                  <svg width="52" height="52">
                    <circle cx="26" cy="26" r="22" fill="none" stroke="var(--bg-tertiary)" stroke-width="3"/>
                    <circle cx="26" cy="26" r="22" fill="none" stroke="${ringColor}" stroke-width="3"
                      stroke-dasharray="${ringCircumference}" stroke-dashoffset="${ringCircumference - ringDash}"
                      stroke-linecap="round" style="transition: stroke-dashoffset 1s ease-out;"/>
                  </svg>
                  <div class="level-num" style="color: ${ringColor};">${level}</div>
                </div>
              </div>

              <!-- 称号 Badge -->
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px; flex-wrap: wrap;">
                <span class="rating-title-badge ${titleInfo.tier}">
                  <span style="font-size: 13px;">${titleInfo.emoji}</span>
                  ${titleInfo.title}
                </span>
                <span style="font-size: 11px; font-weight: 700; color: ${dynamicAvg >= 4.0 ? 'var(--success)' : 'var(--danger)'}; padding: 3px 8px; background: ${dynamicAvg >= 4.0 ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)'}; border-radius: 20px;">
                  ${dynamicHourlyRate === 60 ? '¥60/h' : '¥28/h'}
                </span>
                <span style="font-size: 20px; font-weight: 800; color: ${ringColor}; margin-left: auto;">
                  ${dynamicAvg.toFixed(1)}
                  <span style="font-size: 12px; color: var(--text-muted); font-weight: 400;">/5.0</span>
                </span>
              </div>

              <!-- 五维度评分条（带图标） -->
              <div style="display: flex; flex-direction: column; gap: 7px; margin-bottom: 10px;">
                ${dimensions.map(d => {
                  const meta = DIMENSION_META[d.key] || {};
                  const dimColor = d.val >= 4 ? '#10b981' : d.val >= 3 ? '#f59e0b' : '#ef4444';
                  const isExpandable = d.key === 'availability' || d.key === 'performance' || d.key === 'customerReview';
                  const detailClass = d.key === 'availability' ? 'avail-detail' : d.key === 'customerReview' ? 'review-detail' : 'perf-detail';
                  return `
                  <div style="display: flex; align-items: center; gap: 8px;${isExpandable ? ' cursor: pointer;' : ''}"${isExpandable ? ` onclick="this.parentElement.parentElement.querySelector('.${detailClass}').classList.toggle('${detailClass}-open')"` : ''}>
                    <div class="rating-dimension-icon" style="background: ${(meta.color || '#94a3b8')}22; font-size: 11px;">${meta.icon || '•'}</div>
                    <span style="font-size: 12px; color: var(--text-secondary); width: 52px; flex-shrink: 0;">${d.label}${isExpandable ? ' <span style="font-size:9px;opacity:0.5;">▾</span>' : ''}</span>
                    <div style="flex: 1; height: 7px; background: var(--bg-secondary); border-radius: 4px; overflow: hidden;">
                      <div style="height: 100%; width: ${d.val * 20}%; background: linear-gradient(90deg, ${dimColor}, ${dimColor}dd); border-radius: 4px; transition: width 0.5s cubic-bezier(0.16,1,0.3,1);"></div>
                    </div>
                    <span style="font-size: 12px; font-weight: 700; color: ${dimColor}; min-width: 28px; text-align: right;">${isExpandable ? d.val.toFixed(1) : d.val}</span>
                  </div>
                  `;
                }).join('')}
              </div>

              <!-- 工时支持详情（可展开） -->
              <div class="avail-detail" style="max-height: 0; overflow: hidden; transition: max-height 0.3s ease; margin-bottom: 0;">
                <div style="padding: 10px; background: var(--bg-secondary); border-radius: var(--radius-md); margin-bottom: 10px;">
                  <div style="font-size: 11px; font-weight: 700; color: var(--text-muted); margin-bottom: 8px;">📅 每周供班达标分析</div>
                  <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px;">
                    ${availCalc.weekResults.map(w => `
                      <div style="text-align: center; padding: 6px 4px; border-radius: 6px; background: ${w.passed ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.08)'}; border: 1px solid ${w.passed ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.15)'};">
                        <div style="font-size: 10px; font-weight: 700; color: var(--text-muted);">${w.name}</div>
                        <div style="font-size: 9px; color: var(--text-muted); margin-bottom: 3px;">${w.label}</div>
                        <div style="font-size: 16px; margin-bottom: 2px;">${w.passed ? '✅' : '❌'}</div>
                        <div style="font-size: 10px; font-weight: 600; color: ${w.passed ? '#10b981' : '#ef4444'};">${w.availDays}天</div>
                        <div style="font-size: 9px; color: var(--text-muted);">${w.weekendAvail ? '🔑 周末✓' : '🚫 周末✗'}</div>
                      </div>
                    `).join('')}
                  </div>
                  <div style="margin-top: 8px; display: flex; justify-content: space-between; font-size: 11px;">
                    <span style="color: var(--text-muted);">基础分 <b>5</b>${availCalc.weekDeduction ? ` → 未达标${availCalc.failedCount}周 <b style="color:#ef4444;">-${availCalc.weekDeduction}</b>` : ' ✅ 全周达标'} = <b style="color: ${availCalc.weekScore >= 4 ? '#10b981' : '#f59e0b'};">${availCalc.weekScore}</b></span>
                    ${availCalc.penalty ? `<span style="color: #ef4444;">换班-${availCalc.penalty}</span>` : ''}
                    ${availCalc.bonus ? `<span style="color: #10b981;">顶班+${availCalc.bonus.toFixed(1)}</span>` : ''}
                    ${(availCalc.applicantCount || availCalc.targetCount) ? `<span style="color: var(--text-muted); font-size: 10px;">换${availCalc.applicantCount}次/顶${availCalc.targetCount}次</span>` : ''}
                  </div>
                </div>
              </div>

              <!-- 销售业绩详情（可展开） -->
              <div class="perf-detail" style="max-height: 0; overflow: hidden; transition: max-height 0.3s ease; margin-bottom: 0;">
                <div style="padding: 10px; background: var(--bg-secondary); border-radius: var(--radius-md); margin-bottom: 10px;">
                  <div style="font-size: 11px; font-weight: 700; color: var(--text-muted); margin-bottom: 8px;">🎯 时产 + UPT 各50% · 月销2万达标加0.5</div>
                  <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px;">
                    <!-- 时产 -->
                    <div style="padding: 8px; border-radius: 6px; background: ${perfCalc.hourly >= 210 ? 'rgba(16,185,129,0.08)' : 'rgba(245,158,11,0.08)'}; border: 1px solid ${perfCalc.hourly >= 210 ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)'};">
                      <div style="font-size: 10px; color: var(--text-muted); margin-bottom: 4px;">💰 时产</div>
                      <div style="font-size: 16px; font-weight: 800; color: ${perfCalc.hourly >= 210 ? '#10b981' : '#f59e0b'};">¥${perfCalc.hourly}<span style="font-size: 11px; font-weight: 400; opacity: 0.6;">/h</span></div>
                      <div style="font-size: 10px; color: var(--text-muted); margin-top: 2px;">得分 <b style="color: ${perfCalc.hourlyScore >= 4 ? '#10b981' : perfCalc.hourlyScore >= 3 ? '#f59e0b' : '#ef4444'};">${perfCalc.hourlyScore}</b>/5 ${perfCalc.hourly >= 210 ? '✓' : '✗'}</div>
                    </div>
                    <!-- UPT -->
                    <div style="padding: 8px; border-radius: 6px; background: ${perfCalc.upt >= 1.25 ? 'rgba(16,185,129,0.08)' : 'rgba(245,158,11,0.08)'}; border: 1px solid ${perfCalc.upt >= 1.25 ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)'};">
                      <div style="font-size: 10px; color: var(--text-muted); margin-bottom: 4px;">📦 UPT</div>
                      <div style="font-size: 16px; font-weight: 800; color: ${perfCalc.upt >= 1.25 ? '#10b981' : '#f59e0b'};">${perfCalc.upt}</div>
                      <div style="font-size: 10px; color: var(--text-muted); margin-top: 2px;">得分 <b style="color: ${perfCalc.uptScore >= 4 ? '#10b981' : perfCalc.uptScore >= 3 ? '#f59e0b' : '#ef4444'};">${perfCalc.uptScore}</b>/5 · ${perfCalc.qty}件/${perfCalc.tickets}单</div>
                    </div>
                    <!-- 月销售额达标 -->
                    <div style="padding: 8px; border-radius: 6px; background: ${perfCalc.targetMet ? 'rgba(16,185,129,0.08)' : 'rgba(100,116,139,0.06)'}; border: 1px solid ${perfCalc.targetMet ? 'rgba(16,185,129,0.15)' : 'rgba(100,116,139,0.1)'};">
                      <div style="font-size: 10px; color: var(--text-muted); margin-bottom: 4px;">🏆 月销目标</div>
                      <div style="font-size: 16px; font-weight: 800; color: ${perfCalc.targetMet ? '#10b981' : 'var(--text-muted)'};">¥${(perfCalc.sales / 10000).toFixed(1)}<span style="font-size: 11px; font-weight: 400; opacity: 0.6;">万</span></div>
                      <div style="font-size: 10px; color: var(--text-muted); margin-top: 2px;">${perfCalc.targetMet ? '<b style="color:#10b981;">+0.5</b> ✓达标' : '未达标(不扣分)'}</div>
                    </div>
                  </div>
                  <div style="margin-top: 8px; display: flex; justify-content: space-between; font-size: 11px;">
                    <span style="color: var(--text-muted);">(时产 <b>${perfCalc.hourlyScore}</b> + UPT <b>${perfCalc.uptScore}</b>) ÷ 2 = <b>${((perfCalc.hourlyScore + perfCalc.uptScore) / 2).toFixed(1)}</b>${perfCalc.targetBonus ? ` <span style="color:#10b981;">+ ${perfCalc.targetBonus}</span>` : ''} = <b style="color: ${perfCalc.score >= 4 ? '#10b981' : '#f59e0b'};">${perfCalc.score.toFixed(1)}</b></span>
                    <span style="color: var(--text-muted); font-size: 10px;">目标 ¥${perfCalc.salesTarget.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <!-- 顾客好评详情（可展开） -->
              <div class="review-detail" style="max-height: 0; overflow: hidden; transition: max-height 0.3s ease; margin-bottom: 0;">
                <div style="padding: 10px; background: var(--bg-secondary); border-radius: var(--radius-md); margin-bottom: 10px;">
                  <div style="font-size: 11px; font-weight: 700; color: var(--text-muted); margin-bottom: 8px;">💕 大众点评好评（基础1 + 第1条+1 + 之后每条+0.5）</div>
                  ${reviewCalc.count > 0 ? `
                    <div style="display: flex; flex-direction: column; gap: 6px;">
                      ${reviewCalc.reviews.map(rv => `
                        <div style="padding: 6px 8px; border-radius: 6px; background: rgba(16,185,129,0.06); border: 1px solid rgba(16,185,129,0.12); font-size: 11px;">
                          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px;">
                            <span style="font-weight: 600; color: var(--text-secondary);">${'⭐'.repeat(rv.rating)}</span>
                            <span style="font-size: 10px; color: var(--text-muted);">${rv.reviewDate} · ${(rv.source||'').replace('大众点评（','').replace('）','')}</span>
                          </div>
                          <div style="color: var(--text-muted); line-height: 1.5; font-size: 10px;">${(rv.snippet||'').slice(0,60)}${(rv.snippet||'').length > 60 ? '…' : ''}</div>
                        </div>
                      `).join('')}
                    </div>
                  ` : `<div style="text-align: center; padding: 12px; color: var(--text-muted); font-size: 12px;">暂无大众点评好评记录</div>`}
                  <div style="margin-top: 8px; display: flex; justify-content: space-between; font-size: 11px;">
                    <span style="color: var(--text-muted);">基础 <b>1</b>${reviewCalc.count >= 1 ? ` + 首条 <b>+1</b>` : ''}${reviewCalc.count >= 2 ? ` + ${reviewCalc.count - 1}条 <b>+${(0.5*(reviewCalc.count-1)).toFixed(1)}</b>` : ''} = <b style="color: ${reviewCalc.score >= 4 ? '#10b981' : reviewCalc.score >= 3 ? '#f59e0b' : '#ef4444'};">${reviewCalc.score.toFixed(1)}</b></span>
                    <span style="color: var(--text-muted); font-size: 10px;">${reviewCalc.count}条好评</span>
                  </div>
                </div>
              </div>

              <!-- 成就徽章 -->
              ${achievements.length > 0 ? `
                <div style="display: flex; gap: 5px; flex-wrap: wrap; margin-bottom: 12px;">
                  ${achievements.map((a, i) => `
                    <span class="rating-achievement" style="animation-delay: ${i * 0.08}s;" title="${a.desc}">
                      ${a.icon} ${a.label}
                    </span>
                  `).join('')}
                </div>
              ` : ''}

              <!-- 座右铭 -->
              <div class="rating-motto" style="border-left-color: ${borderColor}; margin-bottom: 10px;">
                ${titleInfo.motto}
              </div>

              <!-- 评语 -->
              <div style="padding: 10px 12px; background: var(--bg-secondary); border-radius: var(--radius-md); font-size: 12px; color: var(--text-secondary); line-height: 1.6;">
                📊 ${r.comment}
              </div>
            </div>
          </div>
        `;
      }).join('')}
    </div>

    <!-- 新增评分按钮 -->
    <div style="text-align: center; margin-top: 24px;">
      <button class="btn btn-primary" onclick="openRatingModal()">+ 新增评分</button>
    </div>

    <!-- Rating Modal -->
    <div class="modal-overlay" id="ratingModal">
      <div class="modal" style="max-width: 600px;">
        <div class="modal-header">
          <h3>新增表现评分</h3>
          <button class="modal-close" onclick="document.getElementById('ratingModal').classList.remove('active')">×</button>
        </div>
        <div class="modal-body">
          <div class="grid-2">
            <div class="form-group">
              <label class="form-label">选择人员 *</label>
              <select class="form-select" id="rate_staff">
                ${staff.map(s => `<option value="${s.id}">${s.name} (${s.dept})</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">评分月份</label>
              <input class="form-input" id="rate_month" type="month" value="${new Date().toISOString().slice(0, 7)}">
            </div>
          </div>
          <div style="margin-bottom: 16px;">
            ${RATING_DIMENSIONS.map(d => `
              <div style="padding: 10px 0; border-bottom: 1px solid var(--border-light);">
                <div class="flex justify-between items-center">
                  <div>
                    <span class="text-sm font-semibold">${d.label}</span>
                    <span class="text-xs text-muted" style="margin-left: 6px;">${d.desc || ''}</span>
                  </div>
                  <div class="rating-stars" id="rate_${d.key}">
                    ${[1,2,3,4,5].map(n => `<span class="star" data-value="${n}" onclick="setRating('${d.key}', ${n})">★</span>`).join('')}
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
          <div class="form-group">
            <label class="form-label">评语备注</label>
            <textarea class="form-textarea" id="rate_comment" placeholder="请输入评语..."></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="document.getElementById('ratingModal').classList.remove('active')">取消</button>
          <button class="btn btn-primary" onclick="saveRating()">提交评分</button>
        </div>
      </div>
    </div>
  `;
}

const currentRatings = { availability: 0, performance: 0, behavior: 0, attendance: 0 };

function setRating(dim, value) {
  currentRatings[dim] = value;
  const container = document.getElementById(`rate_${dim}`);
  if (!container) return;
  container.querySelectorAll('.star').forEach(star => {
    const v = parseInt(star.dataset.value);
    star.classList.toggle('active', v <= value);
  });
}

function openRatingModal() {
  Object.keys(currentRatings).forEach(k => currentRatings[k] = 0);
  document.querySelectorAll('.rating-stars .star').forEach(s => s.classList.remove('active'));
  document.getElementById('ratingModal').classList.add('active');
}

function saveRating() {
  const staffId = parseInt(document.getElementById('rate_staff').value);
  const month = document.getElementById('rate_month').value;
  const comment = document.getElementById('rate_comment').value.trim();

  const scores = { ...currentRatings };
  const hasScore = Object.values(scores).some(v => v > 0);
  if (!hasScore) { showToast('请至少评一个维度', 'warning'); return; }

  // Fill 0s with 3 (default)
  Object.keys(scores).forEach(k => { if (!scores[k]) scores[k] = 3; });
  const avgScore = Object.values(scores).reduce((a, b) => a + b, 0) / 5;
  const hourlyRate = avgScore >= 4 ? HOURLY_RATE_PASS : HOURLY_RATE_FAIL;

  const ratings = Store.get('ratings');
  ratings.push({
    id: Store.nextId('ratings'),
    staffId, month, scores, comment: comment || '综合表现良好', avgScore, hourlyRate
  });
  Store.set('ratings', ratings);

  document.getElementById('ratingModal').classList.remove('active');
  showToast(`${Store.getStaffName(staffId)} ${month} 评分已提交，综合 ${avgScore.toFixed(1)} 分 → ¥${hourlyRate}/h`);
  Router.render();
}

/**
 * ========================================
 * Reports Page
 * ========================================
 */
function renderReports() {
  const staff = Store.get('staff');
  const activeStaff = staff.filter(s => s.status === 'active');
  const ratings = Store.get('ratings');
  const attendance = Store.get('attendance');

  // Calculate stats per person
  const staffStats = activeStaff.map(s => {
    const r = ratings.filter(r => r.staffId === s.id);
    const a = attendance.filter(a => a.staffId === s.id);
    const avgRating = r.length > 0 ? (r.reduce((sum, x) => sum + x.avgScore, 0) / r.length).toFixed(1) : '-';
    const attRate = a.length > 0 ? Math.round(a.filter(x => x.status === 'normal').length / a.length * 100) : '-';
    return { ...s, avgRating, attRate, ratingCount: r.length };
  }).sort((a, b) => (b.avgRating || 0) - (a.avgRating || 0));

  return `
    <div class="flex justify-between items-center mb-6 animate-in">
      <h3 style="font-size: 16px; font-weight: 700;">综合数据报表</h3>
      <div class="flex gap-8">
        <button class="btn btn-sm btn-outline" onclick="exportReport()">📥 导出报告</button>
        <button class="btn btn-sm btn-secondary" onclick="Store.reset(); Router.render(); showToast('数据已重置');">🔄 重置数据</button>
      </div>
    </div>

    <div class="grid-2 mb-6 animate-in">
      <div class="card">
        <div class="card-header"><h3>📊 评分排行</h3></div>
        <div class="card-body" style="padding: 12px 16px;">
          ${(() => {
            const staffAll = Store.get('staff').filter(s => s.status === 'active' && s.dept === 'Service Team');
            const ratingsAll = Store.get('ratings');
            const ranked = staffAll.map(s => {
              const r = ratingsAll.filter(r => r.staffId === s.id);
              return { name: s.name, avatar_color: s.avatar_color, score: r.length > 0 ? +(r.reduce((sum, x) => sum + x.avgScore, 0) / r.length).toFixed(1) : 0 };
            }).sort((a, b) => b.score - a.score);
            const medals = ['🥇', '🥈', '🥉'];
            return ranked.map((d, i) => `
              <div style="display:flex;align-items:center;gap:10px;padding:7px ${i < 3 ? '8' : '12'}px;border-radius:8px;margin-bottom:2px;background:${i < 3 ? 'rgba(16,185,129,0.06)' : 'transparent'};">
                ${i < 3 ? `<span style="font-size:18px;width:24px;text-align:center;">${medals[i]}</span>` : `<span style="font-size:13px;color:#94a3b8;width:24px;text-align:center;font-weight:600;">${i+1}</span>`}
                <div style="width:28px;height:28px;border-radius:50%;background:${d.avatar_color || '#6366f1'};display:flex;align-items:center;justify-content:center;color:#fff;font-size:12px;font-weight:700;flex-shrink:0;">${d.name[0]}</div>
                <span style="flex:1;font-size:13px;font-weight:500;color:#334155;white-space:nowrap;">${d.name}</span>
                <span style="font-size:14px;font-weight:700;color:${d.score >= 4.5 ? '#059669' : d.score >= 4.0 ? '#2563eb' : d.score >= 3.5 ? '#4f46e5' : '#d97706'};">${d.score.toFixed(1)}</span>
                <div style="display:flex;gap:1px;">${Array.from({length:5}, (_, s) => `<span style="color:${s < Math.round(d.score) ? '#f59e0b' : '#e2e8f0'};font-size:10px;">★</span>`).join('')}</div>
              </div>
            `).join('');
          })()}
        </div>
      </div>
      <div class="card">
        <div class="card-header"><h3>📈 门迎/支援统计</h3></div>
        <div class="card-body">
          <canvas id="supportStatChart" height="250"></canvas>
        </div>
      </div>
    </div>

    <div class="card animate-in">
      <div class="card-header">
        <h3>📋 人员综合档案</h3>
      </div>
      <div class="card-body" style="padding: 0;">
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>排名</th>
                <th>姓名</th>
                <th>部门</th>
                <th>综合评分</th>
                <th>出勤率</th>
                <th>评分次数</th>
              </tr>
            </thead>
            <tbody>
              ${staffStats.map((s, i) => `
                <tr>
                  <td>
                    <span style="display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 50%; font-size: 13px; font-weight: 700;
                      ${i === 0 ? 'background: #fef3c7; color: #d97706;' : i === 1 ? 'background: #e5e7eb; color: #6b7280;' : i === 2 ? 'background: #fde8d8; color: #c2410c;' : 'color: var(--text-muted);'}
                    ">${i + 1}</span>
                  </td>
                  <td>
                    <div class="flex items-center gap-8">
                      <div class="avatar" style="background: ${s.avatar_color}; width: 32px; height: 32px; font-size: 12px;">${getInitials(s.name)}</div>
                      <span class="font-semibold">${s.name}</span>
                    </div>
                  </td>
                  <td><span class="badge ${s.dept === '陈列' ? 'badge-info' : 'badge-accent'}">${s.dept}</span></td>
                  <td><span class="font-bold" style="color: ${s.avgRating >= 4 ? 'var(--success)' : s.avgRating >= 3 ? 'var(--info)' : 'var(--warning)'}; font-size: 16px;">${s.avgRating}</span></td>
                  <td><span class="font-semibold">${s.attRate !== '-' ? s.attRate + '%' : '-'}</span></td>
                  <td>${s.ratingCount} 次</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

function initReportCharts() {
  // Rating Rank is now rendered as HTML (no canvas needed)

  // Support Stat Chart (门迎/支援统计)
  const supportCtx = document.getElementById('supportStatChart');
  if (supportCtx) {
    const storeSupport = Store.get('storeSupport') || [];
    const supportCounts = {};
    storeSupport.forEach(s => {
      supportCounts[s.staff] = (supportCounts[s.staff] || 0) + 1;
    });
    const sortedNames = Object.keys(supportCounts).sort((a, b) => supportCounts[b] - supportCounts[a]);

    new Chart(supportCtx, {
      type: 'bar',
      data: {
        labels: sortedNames,
        datasets: [{
          label: '支援次数',
          data: sortedNames.map(n => supportCounts[n]),
          backgroundColor: '#3b82f6',
          borderRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y',
        plugins: { legend: { display: false } },
        scales: { x: { grid: { color: '#f1f5f9' }, beginAtZero: true }, y: { grid: { display: false } } }
      }
    });
  }
}

function exportReport() {
  const staff = Store.get('staff').filter(s => s.status === 'active');
  const ratings = Store.get('ratings');
  const attendance = Store.get('attendance');

  let csv = '姓名,部门,综合评分,时薪,出勤率\n';
  staff.forEach(s => {
    const r = ratings.filter(r => r.staffId === s.id);
    const a = attendance.filter(a => a.staffId === s.id);
    const avg = r.length > 0 ? (r.reduce((sum, x) => sum + x.avgScore, 0) / r.length).toFixed(1) : '-';
    const attRate = a.length > 0 ? Math.round(a.filter(x => x.status === 'normal').length / a.length * 100) + '%' : '-';
    const rate = r.length > 0 ? (r[r.length-1].avgScore >= 4 ? '60元/h' : '28元/h') : '-';
    csv += `${s.name},${s.dept},${avg},${rate},${attRate}\n`;
  });

  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `安福路兼职管理报告_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('报告已导出');
}

/**
 * ========================================
 * Handbook Page - Service Team 工作手册
 * ========================================
 */
let handbookTab = 'roles';

function renderHandbook() {
  return `
    <div class="animate-in" style="margin-bottom: 24px;">
      <div style="background: linear-gradient(135deg, #1a1a2e 0%, #2d2d4a 100%); border-radius: var(--radius-lg); padding: 32px; color: #fff; margin-bottom: 24px;">
        <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 12px;">
          <span style="font-size: 40px;">🏔️</span>
          <div>
            <h2 style="font-size: 22px; font-weight: 800; margin-bottom: 4px;">Service Team 工作手册</h2>
            <p style="font-size: 14px; opacity: 0.7;">让每一位兼职伙伴，都成为品牌的门面担当 ✨</p>
          </div>
        </div>
        <p style="font-size: 13px; opacity: 0.5;">Salomon 安福路旗舰店 · Born in the Mountains</p>
      </div>
    </div>

    <!-- Tabs -->
    <div class="tabs animate-in">
      <button class="tab ${handbookTab === 'identity' ? 'active' : ''}" onclick="handbookTab='identity';Router.render()">🧑 你是谁</button>
      <button class="tab ${handbookTab === 'roles' ? 'active' : ''}" onclick="handbookTab='roles';Router.render()">🎯 三大职责</button>
      <button class="tab ${handbookTab === 'kpi' ? 'active' : ''}" onclick="handbookTab='kpi';Router.render()">📊 考核标准</button>
      <button class="tab ${handbookTab === 'reward' ? 'active' : ''}" onclick="handbookTab='reward';Router.render()">💰 薪资回报</button>
      <button class="tab ${handbookTab === 'checklist' ? 'active' : ''}" onclick="handbookTab='checklist';Router.render()">✅ 每日自检</button>
    </div>

    ${handbookTab === 'identity' ? renderHandbookIdentity() : ''}
    ${handbookTab === 'roles' ? renderHandbookRoles() : ''}
    ${handbookTab === 'kpi' ? renderHandbookKPI() : ''}
    ${handbookTab === 'reward' ? renderHandbookReward() : ''}
    ${handbookTab === 'checklist' ? renderHandbookChecklist() : ''}
  `;
}

function renderHandbookIdentity() {
  return `
    <div class="card animate-in">
      <div class="card-header">
        <h3>🧑 你是谁？你不是普通兼职</h3>
        <span class="badge badge-accent">Salomon 品牌形象大使</span>
      </div>
      <div class="card-body">
        <div style="text-align: center; padding: 20px 0; margin-bottom: 24px;">
          <div style="font-size: 18px; font-weight: 700; color: var(--accent); margin-bottom: 8px;">从「帮忙看店」到「创造价值」</div>
          <div style="font-size: 14px; color: var(--text-secondary);">主动服务 · 专业输出 · 业绩导向</div>
        </div>

        <div class="grid-3">
          <div class="card" style="border-left: 4px solid var(--info);">
            <div class="card-body" style="text-align: center;">
              <div style="font-size: 36px; margin-bottom: 12px;">🔗</div>
              <h4 style="font-size: 15px; font-weight: 700; margin-bottom: 8px;">品牌连接者</h4>
              <p style="font-size: 13px; color: var(--text-secondary); line-height: 1.8;">连接品牌与顾客<br>传递户外探索精神</p>
            </div>
          </div>
          <div class="card" style="border-left: 4px solid var(--success);">
            <div class="card-body" style="text-align: center;">
              <div style="font-size: 36px; margin-bottom: 12px;">🎯</div>
              <h4 style="font-size: 15px; font-weight: 700; margin-bottom: 8px;">专业顾问</h4>
              <p style="font-size: 13px; color: var(--text-secondary); line-height: 1.8;">用产品知识帮助顾客<br>找到最适合的装备</p>
            </div>
          </div>
          <div class="card" style="border-left: 4px solid var(--warning);">
            <div class="card-body" style="text-align: center;">
              <div style="font-size: 36px; margin-bottom: 12px;">✨</div>
              <h4 style="font-size: 15px; font-weight: 700; margin-bottom: 8px;">体验创造者</h4>
              <p style="font-size: 13px; color: var(--text-secondary); line-height: 1.8;">让每次服务<br>都成为美好记忆</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderHandbookRoles() {
  return `
    <div class="animate-in">
      <div style="text-align: center; margin-bottom: 24px;">
        <p style="font-size: 15px; color: var(--text-secondary);">三者协同 = <strong>文化传递</strong> × <strong>业绩创造</strong> × <strong>体验守护</strong> → 不可替代的专业价值</p>
      </div>

      ${CORE_ROLES.map(role => `
        <div class="card" style="margin-bottom: 20px;">
          <div class="card-header">
            <div class="flex items-center gap-12">
              <span style="font-size: 28px;">${role.icon}</span>
              <div>
                <h3 style="font-size: 16px; font-weight: 700;">${role.label}</h3>
                <p style="font-size: 13px; color: var(--text-secondary);">${role.desc}</p>
              </div>
            </div>
          </div>
          <div class="card-body">
            <div class="grid-2" style="gap: 12px;">
              ${role.tasks.map((task, i) => `
                <div style="display: flex; align-items: flex-start; gap: 12px; padding: 12px; background: var(--border-light); border-radius: var(--radius-md);">
                  <span style="flex-shrink: 0; width: 24px; height: 24px; background: var(--accent); color: #fff; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700;">${i + 1}</span>
                  <span style="font-size: 14px; line-height: 1.6;">${task}</span>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      `).join('')}

      <div class="card" style="border-left: 4px solid var(--accent);">
        <div class="card-body" style="display: flex; align-items: center; gap: 16px;">
          <span style="font-size: 28px;">💡</span>
          <p style="font-size: 14px; font-weight: 600;">记住：三者缺一不可！ 导览给灵魂 · 销售创价值 · 营运保体验</p>
        </div>
      </div>
    </div>
  `;
}

function renderHandbookKPI() {
  return `
    <div class="animate-in">
      <div style="text-align: center; margin-bottom: 24px;">
        <p style="font-size: 15px; color: var(--text-secondary);">每季度综合评估一次，各项标准有明确的量化指标</p>
      </div>

      <div class="grid-2" style="gap: 16px; margin-bottom: 24px;">
        ${RATING_DIMENSIONS.map((dim, i) => `
          <div class="card">
            <div class="card-body">
              <div class="flex items-center gap-12" style="margin-bottom: 12px;">
                <span style="display: flex; align-items: center; justify-content: center; width: 40px; height: 40px; border-radius: var(--radius-md); background: ${['var(--accent-light)', 'var(--success-light)', 'var(--info-light)', 'var(--warning-light)', 'var(--danger-light)'][i]}; font-size: 20px; font-weight: 800; color: ${['var(--accent)', 'var(--success)', 'var(--info)', 'var(--warning)', 'var(--danger)'][i]};">${String(i + 1).padStart(2, '0')}</span>
                <div>
                  <h4 style="font-size: 15px; font-weight: 700;">${dim.label}</h4>
                  <p style="font-size: 12px; color: var(--text-muted);">${['基础门槛', '核心指标', '素质要求', '基本底线', '专业加分'][i]}</p>
                </div>
              </div>
              <p style="font-size: 13px; color: var(--text-secondary); line-height: 1.8; padding-left: 52px;">${dim.desc}</p>
            </div>
          </div>
        `).join('')}
      </div>

      <!-- KPI Details -->
      <div class="card">
        <div class="card-header"><h3>📊 关键量化指标</h3></div>
        <div class="card-body">
          <div class="table-container">
            <table class="data-table">
              <thead>
                <tr>
                  <th>指标</th>
                  <th>达标线</th>
                  <th>类型</th>
                  <th>说明</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td class="font-semibold">小时销售额</td>
                  <td><span class="badge badge-danger">> 210 元</span></td>
                  <td>扣分项</td>
                  <td class="text-sm text-secondary">低于 210 元/小时将影响评级</td>
                </tr>
                <tr>
                  <td class="font-semibold">个人 UPT</td>
                  <td><span class="badge badge-danger">> 1.25</span></td>
                  <td>扣分项</td>
                  <td class="text-sm text-secondary">主动推荐关联产品（速干T恤、徒步袜等）提升 UPT</td>
                </tr>
                <tr>
                  <td class="font-semibold">大众点评好评</td>
                  <td><span class="badge badge-active">越多越好</span></td>
                  <td>加分项 ✨</td>
                  <td class="text-sm text-secondary">被点名表扬可获额外加分</td>
                </tr>
                <tr>
                  <td class="font-semibold">每周排班天数</td>
                  <td><span class="badge badge-warning">≥ 4天可排 / ≥ 3天实际</span></td>
                  <td>门槛指标</td>
                  <td class="text-sm text-secondary">愿意临时补位、灵活支持</td>
                </tr>
                <tr>
                  <td class="font-semibold">月度产品知识测评</td>
                  <td><span class="badge badge-info">理论 + 实战</span></td>
                  <td>加分项</td>
                  <td class="text-sm text-secondary">核心科技掌握 + 场景搭配能力</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div class="card mt-6" style="border-left: 4px solid var(--success);">
        <div class="card-body" style="display: flex; align-items: center; gap: 16px;">
          <span style="font-size: 28px;">🎯</span>
          <div>
            <p style="font-size: 14px; font-weight: 600;">你的终极目标</p>
            <p style="font-size: 13px; color: var(--text-secondary); margin-top: 4px;">成为顾客信赖的「户外装备顾问」· 用专业知识驱动销售业绩增长 · 成为团队中不可替代的专业力量</p>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderHandbookReward() {
  return `
    <div class="animate-in">
      <div style="text-align: center; margin-bottom: 24px;">
        <p style="font-size: 15px; color: var(--text-secondary);">考核结果直接挂钩薪资和机会，公平透明</p>
      </div>

      <div class="grid-2" style="gap: 24px; margin-bottom: 24px;">
        <!-- 达标 -->
        <div class="card" style="border: 2px solid var(--success); position: relative; overflow: visible;">
          <div style="position: absolute; top: -14px; left: 50%; transform: translateX(-50%); background: var(--success); color: #fff; padding: 4px 20px; border-radius: var(--radius-full); font-size: 13px; font-weight: 700;">✅ 达成标准</div>
          <div class="card-body" style="padding-top: 28px; text-align: center;">
            <div style="font-size: 48px; font-weight: 900; color: var(--success); margin-bottom: 4px;">¥60<span style="font-size: 18px; font-weight: 400;">/小时</span></div>
            <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 20px;">时薪</p>
            <div style="text-align: left;">
              <div style="padding: 10px 0; border-bottom: 1px solid var(--border-light); display: flex; align-items: center; gap: 10px;">
                <span style="color: var(--success);">✅</span>
                <span style="font-size: 14px;">更多排班机会 & 优先选班</span>
              </div>
              <div style="padding: 10px 0; border-bottom: 1px solid var(--border-light); display: flex; align-items: center; gap: 10px;">
                <span style="color: var(--success);">✅</span>
                <span style="font-size: 14px;">每季度工服领用</span>
              </div>
              <div style="padding: 10px 0; border-bottom: 1px solid var(--border-light); display: flex; align-items: center; gap: 10px;">
                <span style="color: var(--success);">✅</span>
                <span style="font-size: 14px;">品牌户外体验活动</span>
              </div>
              <div style="padding: 10px 0; display: flex; align-items: center; gap: 10px;">
                <span style="color: var(--success);">✅</span>
                <span style="font-size: 14px;">晋升 & 更多合作机会</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 未达标 -->
        <div class="card" style="border: 2px solid var(--danger); position: relative; overflow: visible;">
          <div style="position: absolute; top: -14px; left: 50%; transform: translateX(-50%); background: var(--danger); color: #fff; padding: 4px 20px; border-radius: var(--radius-full); font-size: 13px; font-weight: 700;">⚠️ 未达标</div>
          <div class="card-body" style="padding-top: 28px; text-align: center;">
            <div style="font-size: 48px; font-weight: 900; color: var(--danger); margin-bottom: 4px;">¥28<span style="font-size: 18px; font-weight: 400;">/小时</span></div>
            <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 20px;">时薪</p>
            <div style="text-align: left;">
              <div style="padding: 10px 0; border-bottom: 1px solid var(--border-light); display: flex; align-items: center; gap: 10px;">
                <span style="color: var(--danger);">⚠️</span>
                <span style="font-size: 14px;">时薪降至 28 元/小时</span>
              </div>
              <div style="padding: 10px 0; border-bottom: 1px solid var(--border-light); display: flex; align-items: center; gap: 10px;">
                <span style="color: var(--danger);">⚠️</span>
                <span style="font-size: 14px;">回归仓库兼职岗位</span>
              </div>
              <div style="padding: 10px 0; display: flex; align-items: center; gap: 10px;">
                <span style="color: var(--danger);">⚠️</span>
                <span style="font-size: 14px;">需要重新学习并考核</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="card" style="border-left: 4px solid var(--info);">
        <div class="card-body" style="display: flex; align-items: center; gap: 16px;">
          <span style="font-size: 28px;">📈</span>
          <p style="font-size: 14px; font-weight: 600;">每季度综合评估，结果决定下一季度时薪和排班 —— 你的努力，数字看得见！</p>
        </div>
      </div>
    </div>
  `;
}

function renderHandbookChecklist() {
  return `
    <div class="animate-in">
      <div style="text-align: center; margin-bottom: 24px;">
        <p style="font-size: 15px; color: var(--text-secondary);">每天上班前 / 下班后问自己这 8 个问题</p>
      </div>

      ${DAILY_CHECKLIST.map(cat => `
        <div class="card" style="margin-bottom: 16px;">
          <div class="card-header" style="padding: 14px 24px;">
            <h3 style="font-size: 14px;">${cat.category}</h3>
          </div>
          <div class="card-body" style="padding: 12px 24px;">
            ${cat.items.map(item => `
              <div style="display: flex; align-items: center; gap: 12px; padding: 10px 0; border-bottom: 1px solid var(--border-light);">
                <div style="flex-shrink: 0; width: 20px; height: 20px; border: 2px solid var(--border); border-radius: 4px;"></div>
                <span style="font-size: 14px; color: var(--text-primary);">${item}</span>
              </div>
            `).join('')}
          </div>
        </div>
      `).join('')}

      <div class="card" style="border-left: 4px solid var(--accent); margin-top: 24px;">
        <div class="card-body" style="display: flex; align-items: center; gap: 16px;">
          <span style="font-size: 28px;">💪</span>
          <p style="font-size: 14px; font-weight: 600;">每天进步一点点，一个季度后你会感谢现在的自己！</p>
        </div>
      </div>
    </div>
  `;
}

/**
 * ========================================
 * Performance Page - 业绩数据
 * ========================================
 */
let perfMonth = 'june';
let perfSort = 'sales';
let perfSortDir = 'desc';

function renderPerformance() {
  const perfData = Store.get('performanceData') || {};
  const currentData = perfData[perfMonth];
  if (!currentData) return '<div class="card animate-in"><div class="card-body"><p>暂无数据</p></div></div>';

  let records = [...currentData.records].sort((a, b) => {
    const valA = a[perfSort] || 0;
    const valB = b[perfSort] || 0;
    return perfSortDir === 'desc' ? valB - valA : valA - valB;
  });

  const isMay = perfMonth === 'may';
  const isJune = perfMonth === 'june';
  const monthLabel = isJune ? '6月' : isMay ? '5月' : '4月';
  const monthDate = isJune ? '2026年6月（截至6/17）' : isMay ? '2026年5月' : '2026年4月';

  return `
    <div class="animate-in" style="margin-bottom: 24px;">
      <div style="background: linear-gradient(135deg, #1a1a2e 0%, #2d2d4a 100%); border-radius: var(--radius-lg); padding: 24px; color: #fff;">
        <h2 style="font-size: 20px; font-weight: 800;">💰 兼职业绩数据</h2>
        <p style="font-size: 13px; opacity: 0.7;">数据来源：${isJune ? '收银系统（备注栏缩写）' : '安福路兼职数据表'} · ${monthDate}</p>
      </div>
    </div>

    <!-- Summary Stats -->
    <div class="stats-grid animate-in" style="grid-template-columns: repeat(${isJune ? '5' : '4'}, 1fr);">
      <div class="stat-card accent">
        <div class="stat-value">¥${(currentData.totalSales / 10000).toFixed(1)}万</div>
        <div class="stat-label">${monthLabel}总业绩</div>
      </div>
      <div class="stat-card info">
        <div class="stat-value">${records.length}</div>
        <div class="stat-label">在册兼职</div>
      </div>
      <div class="stat-card success">
        <div class="stat-value">${isMay || isJune ? (currentData.avgUPT || '-').toFixed(2) : '-'}</div>
        <div class="stat-label">平均 UPT</div>
      </div>
      <div class="stat-card warning">
        <div class="stat-value">¥${(currentData.avgHourlyOutput || 0).toFixed(0)}</div>
        <div class="stat-label">平均时产</div>
      </div>
      ${isJune ? `
      <div class="stat-card" style="border-left-color: #8b5cf6;">
        <div class="stat-value">${currentData.records ? currentData.records.reduce((s, r) => s + (r.tickets || 0), 0) : 0}单</div>
        <div class="stat-label">总客单数</div>
      </div>` : ''}
    </div>

    <!-- Month Tabs -->
    <div class="tabs animate-in" style="margin-top: 20px;">
      <button class="tab ${perfMonth === 'june' ? 'active' : ''}" onclick="perfMonth='june';Router.render()">📅 6月数据</button>
      <button class="tab ${perfMonth === 'may' ? 'active' : ''}" onclick="perfMonth='may';Router.render()">📅 5月数据</button>
      <button class="tab ${perfMonth === 'april' ? 'active' : ''}" onclick="perfMonth='april';Router.render()">📅 4月数据</button>
    </div>

    <!-- Performance Table -->
    <div class="card animate-in">
      <div class="card-header">
        <h3>🏆 ${monthLabel}兼职业绩排行</h3>
        <div style="display: flex; gap: 8px;">
          <select onchange="perfSort=this.value;Router.render()" style="padding: 4px 12px; border-radius: var(--radius-md); border: 1px solid var(--border); font-size: 13px;">
            <option value="sales" ${perfSort === 'sales' ? 'selected' : ''}>按销售额</option>
            <option value="hourlyOutput" ${perfSort === 'hourlyOutput' ? 'selected' : ''}>按时产</option>
            ${isMay ? `<option value="upt" ${perfSort === 'upt' ? 'selected' : ''}>按 UPT</option>` : ''}
            ${isJune ? `<option value="tickets" ${perfSort === 'tickets' ? 'selected' : ''}>按客单数</option>` : ''}
            ${isJune ? `<option value="avgPrice" ${perfSort === 'avgPrice' ? 'selected' : ''}>按件均价</option>` : ''}
            <option value="salesShare" ${perfSort === 'salesShare' ? 'selected' : ''}>按占比</option>
            ${isMay || isJune ? `<option value="efficiency" ${perfSort === 'efficiency' ? 'selected' : ''}>按效率值</option>` : ''}
          </select>
          <button class="btn btn-sm btn-outline" onclick="perfSortDir=perfSortDir==='desc'?'asc':'desc';Router.render()">
            ${perfSortDir === 'desc' ? '↓ 降序' : '↑ 升序'}
          </button>
        </div>
      </div>
      <div class="card-body" style="padding: 0;">
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>排名</th>
                <th>姓名</th>
                <th>销售额</th>
                ${isJune ? '<th>件数</th><th>客单</th><th>UPT</th><th>件均价</th>' : ''}
                ${isMay ? '<th>UPT</th>' : !isJune ? '<th>3月业绩</th>' : ''}
                <th>业绩占比</th>
                <th>${isJune ? '出勤天数' : '出勤工时'}</th>
                ${isJune ? '<th>出勤工时</th>' : ''}
                <th>时产(元/h)</th>
                ${isMay || isJune ? '<th>效率值</th>' : '<th>占比变化</th>'}
              </tr>
            </thead>
            <tbody>
              ${records.map((r, i) => {
                const rank = i + 1;
                const rankIcon = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank;
                const hourlyPass = r.hourlyOutput >= KPI.hourlySalesTarget;
                return `
                  <tr>
                    <td style="font-weight: 700; font-size: 16px;">${rankIcon}</td>
                    <td><span style="font-weight: 600;">${r.name}</span></td>
                    <td><span style="font-weight: 700; color: var(--accent);">¥${isJune ? r.sales.toLocaleString() : (r.sales / 10000).toFixed(2) + '万'}</span></td>
                    ${isJune ? `
                      <td>${r.qty || 0}</td>
                      <td>${r.tickets || 0}</td>
                      <td><span class="badge ${((r.qty || 0) / Math.max(r.tickets || 1, 1) >= KPI.uptTarget ? 'badge-active' : 'badge-danger')}">${((r.qty || 0) / Math.max(r.tickets || 1, 1)).toFixed(2)}</span></td>
                      <td>¥${(r.avgPrice || 0).toLocaleString()}</td>
                    ` : ''}
                    ${isMay 
                      ? `<td><span class="badge ${(r.upt || 0) >= KPI.uptTarget ? 'badge-active' : 'badge-danger'}">${r.upt}</span></td>`
                      : !isJune ? `<td class="text-sm">¥${((r.prevMonthSales || 0) / 10000).toFixed(2)}万</td>` : ''
                    }
                    <td>${(r.salesShare * 100).toFixed(1)}%</td>
                    <td>${isJune ? (r.workDays || 0) + '天' : r.workHours + 'h'}</td>
                    ${isJune ? `<td>${r.workHours}h</td>` : ''}
                    <td>
                      <span style="font-weight: 600; color: ${hourlyPass ? 'var(--success)' : 'var(--danger)'};">
                        ¥${r.hourlyOutput.toFixed(0)}
                      </span>
                      ${!hourlyPass ? '<span style="font-size: 11px; color: var(--danger);"> ⚠️</span>' : ''}
                    </td>
                    ${isMay || isJune
                      ? `<td><span style="color: ${r.efficiency >= 0 ? 'var(--success)' : 'var(--danger)'}; font-weight: 600;">${r.efficiency >= 0 ? '+' : ''}${(r.efficiency * 100).toFixed(1)}%</span></td>`
                      : `<td><span style="color: ${(r.shareGrowth || 0) > 0 ? 'var(--success)' : 'var(--danger)'}; font-weight: 500;">${(r.shareGrowth || 0) > 0 ? '↑' : '↓'} ${Math.abs((r.shareGrowth || 0) * 100).toFixed(1)}%</span></td>`
                    }
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- KPI Check -->
    <div class="card animate-in" style="margin-top: 20px;">
      <div class="card-header">
        <h3>🎯 KPI 达标检查</h3>
        <span class="text-sm text-secondary">小时销售额 > ¥${KPI.hourlySalesTarget}${isMay || isJune ? ' · UPT > ' + KPI.uptTarget : ''}</span>
      </div>
      <div class="card-body">
        <div class="grid-3" style="gap: 16px;">
          ${records.map(r => {
            const hourlyPass = r.hourlyOutput >= KPI.hourlySalesTarget;
            const uptPass = isMay ? (r.upt || 0) >= KPI.uptTarget : isJune ? ((r.qty || 0) / Math.max(r.tickets || 1, 1)) >= KPI.uptTarget : true;
            const allPass = hourlyPass && uptPass;
            return `
              <div style="display: flex; align-items: center; gap: 12px; padding: 12px; background: var(--bg-secondary); border-radius: var(--radius-md); border-left: 3px solid ${allPass ? 'var(--success)' : 'var(--danger)'};">
                <div style="flex-shrink: 0; width: 36px; height: 36px; border-radius: 50%; background: ${allPass ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)'}; display: flex; align-items: center; justify-content: center; font-size: 16px;">
                  ${allPass ? '✅' : '⚠️'}
                </div>
                <div style="flex: 1; min-width: 0;">
                  <div style="font-weight: 600; font-size: 14px;">${r.name}</div>
                  <div style="font-size: 12px; color: var(--text-secondary);">
                    时产 ¥${r.hourlyOutput.toFixed(0)} ${hourlyPass ? '✓' : '✗'}
                    ${isMay ? `· UPT ${r.upt} ${(r.upt || 0) >= KPI.uptTarget ? '✓' : '✗'}` : ''}
                    ${isJune ? `· UPT ${((r.qty || 0) / Math.max(r.tickets || 1, 1)).toFixed(2)} ${uptPass ? '✓' : '✗'}` : ''}
                  </div>
                </div>
                <span class="badge ${allPass ? 'badge-active' : 'badge-danger'}">${allPass ? '达标' : '未达标'}</span>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    </div>

    ${isJune && records.some(r => r.categories) ? `
    <!-- Category Breakdown - 品类占比分析 -->
    <div class="card animate-in" style="margin-top: 20px;">
      <div class="card-header">
        <h3>📊 品类销售占比分析</h3>
        <span class="text-sm text-secondary">各品类的销售占比 · 鞋履 / 服装 / 配件</span>
      </div>
      <div class="card-body">
        ${(() => {
          const CAT_CONFIG = {
            '鞋履': { color: '#3b82f6', icon: '👟' },
            '服装': { color: '#8b5cf6', icon: '👕' },
            '配件': { color: '#f59e0b', icon: '🧢' },
            '其他': { color: '#94a3b8', icon: '📦' },
          };
          const catRecords = records.filter(r => r.categories);
          return catRecords.map(r => {
            // Parse categories: support both string format and object format
            let cats = r.categories;
            if (typeof cats === 'string') {
              const parsed = {};
              cats.split('/').forEach(part => {
                const m = part.trim().match(/^(.+?)\s+([\d.]+)%/);
                if (m) parsed[m[1]] = { pct: parseFloat(m[2]), sales: 0, qty: 0 };
              });
              cats = parsed;
            }
            const catNames = Object.keys(cats).filter(cn => cats[cn] && typeof cats[cn].pct === 'number');
            // 从总销售额和占比反算各品类金额和数量
            catNames.forEach(cn => {
              const c = cats[cn];
              if (c && c.pct > 0) {
                if (c.sales == null || c.sales === 0) c.sales = Math.round(r.sales * c.pct / 100);
                if (c.qty == null || c.qty === 0) {
                  const estimatedQty = Math.round(r.qty * c.pct / 100);
                  c.qty = estimatedQty;
                }
              }
            });
            return `
              <div style="margin-bottom: 14px;">
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
                  <span style="font-weight: 600; font-size: 14px; min-width: 60px;">${r.name}</span>
                  <span style="font-size: 12px; color: var(--text-secondary);">¥${r.sales.toLocaleString()} · ${r.qty}件</span>
                </div>
                <div style="display: flex; height: 28px; border-radius: 6px; overflow: hidden; background: var(--bg-secondary);">
                  ${catNames.map(cn => {
                    const c = cats[cn];
                    if (!c || typeof c.pct !== 'number') return '';
                    const cfg = CAT_CONFIG[cn] || { color: '#94a3b8', icon: '📦' };
                    return c.pct > 0 ? `<div title="${cn}: ¥${Number(c.sales).toLocaleString()} · ${c.qty}件 (${c.pct}%)" style="width: ${c.pct}%; background: ${cfg.color}; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 11px; font-weight: 600; min-width: 0; overflow: hidden; white-space: nowrap;">${c.pct >= 10 ? cfg.icon + ' ' + c.pct + '%' : ''}</div>` : '';
                  }).join('')}
                </div>
                <div style="display: flex; flex-wrap: wrap; gap: 12px; margin-top: 6px; padding: 6px 8px; background: var(--bg-secondary); border-radius: 6px;">
                  ${catNames.map(cn => {
                    const c = cats[cn];
                    if (!c || typeof c.pct !== 'number') return '';
                    const cfg = CAT_CONFIG[cn] || { color: '#94a3b8', icon: '📦' };
                    return `<span style="font-size: 12px; display: flex; align-items: center; gap: 4px;"><span style="font-size: 14px;">${cfg.icon}</span><span style="color: ${cfg.color}; font-weight: 600;">${cn}</span> <span style="color: var(--text-primary); font-weight: 600;">¥${Number(c.sales).toLocaleString()}</span> <span style="color: var(--text-secondary);">· ${c.qty}件</span> <span style="color: var(--text-secondary);">(${c.pct}%)</span></span>`;
                  }).join('')}
                </div>
              </div>
            `;
          }).join('');
        })()}
      </div>
    </div>
    ` : ''}
  `;
}

/**
 * ========================================
 * Door Schedule Page - 门迎排班
 * ========================================
 */
let doorScheduleDate = '';

function renderDoorSchedule() {
  const doorData = Store.get('doorSchedule') || [];
  const staff = Store.get('staff').filter(s => s.status === 'active' && s.dept === 'Service Team');
  if (!doorScheduleDate && doorData.length > 0) {
    doorScheduleDate = doorData[0].date;
  }

  const selectedDay = doorData.find(d => d.date === doorScheduleDate) || { slots: [] };

  // === 计算每人门迎总时长 ===
  const staffDoorStats = {};
  staff.forEach(s => { staffDoorStats[s.name] = { slots: 0, hours: 0, avatarColor: s.avatar_color }; });

  doorData.forEach(day => {
    day.slots.forEach(slot => {
      if (!slot.staff || !slot.staff.trim()) return;
      // 解析时长
      const parts = slot.time.split('-');
      const startH = parseInt(parts[0].split(':')[0]);
      const startM = parseInt(parts[0].split(':')[1]) || 0;
      const endH = parseInt(parts[1].split(':')[0]);
      const endM = parseInt(parts[1].split(':')[1]) || 0;
      const duration = (endH + endM / 60) - (startH + startM / 60);
      if (duration <= 0) return;

      // 多人值班（含 / 分隔符）不计入工时
      const isMultiPerson = slot.staff.includes('/');
      if (isMultiPerson) return;

      let name = slot.staff.trim();
      if (!staffDoorStats[name]) {
        const match = staff.find(s => s.name === name);
        staffDoorStats[name] = { slots: 0, hours: 0, avatarColor: match ? match.avatar_color : '#6366f1' };
      }
      staffDoorStats[name].slots++;
      staffDoorStats[name].hours += duration;
    });
  });

  // 排序：时长降序
  const sortedStats = Object.entries(staffDoorStats)
    .filter(([_, v]) => v.slots > 0)
    .sort((a, b) => b[1].hours - a[1].hours);

  const totalDoorSlots = sortedStats.reduce((sum, [_, v]) => sum + v.slots, 0);
  const totalDoorHours = sortedStats.reduce((sum, [_, v]) => sum + v.hours, 0);
  const avgDoorHours = sortedStats.length > 0 ? (totalDoorHours / sortedStats.length).toFixed(1) : 0;
  const maxDoorHours = sortedStats.length > 0 ? sortedStats[0][1].hours : 0;

  // 计算选中日期的门迎人次和时长（多人值班不计入）
  let selectedDayStaff = 0;
  let selectedDayHours = 0;
  selectedDay.slots.forEach(slot => {
    if (!slot.staff || !slot.staff.trim()) return;
    if (slot.staff.includes('/')) return; // 多人值班不计入
    const parts = slot.time.split('-');
    const startH = parseInt(parts[0].split(':')[0]);
    const startM = parseInt(parts[0].split(':')[1]) || 0;
    const endH = parseInt(parts[1].split(':')[0]);
    const endM = parseInt(parts[1].split(':')[1]) || 0;
    const duration = (endH + endM / 60) - (startH + startM / 60);
    if (duration <= 0) return;
    selectedDayStaff++;
    selectedDayHours += duration;
  });

  return `
    <div class="animate-in" style="margin-bottom: 24px;">
      <div style="background: linear-gradient(135deg, #1a1a2e 0%, #2d2d4a 100%); border-radius: var(--radius-lg); padding: 24px; color: #fff;">
        <h2 style="font-size: 20px; font-weight: 800;">🚪 门迎排班表</h2>
        <p style="font-size: 13px; opacity: 0.7;">6月1日 - 6月10日 · 每日时间段排班详情</p>
      </div>
    </div>

    <!-- 顶部统计卡片 -->
    <div class="stats-grid animate-in" style="grid-template-columns: repeat(4, 1fr); margin-bottom: 20px;">
      <div class="stat-card accent">
        <div class="stat-icon">⏱️</div>
        <div class="stat-value">${totalDoorHours.toFixed(1)}h</div>
        <div class="stat-label">门迎总时长</div>
        <div class="stat-trend">共 ${totalDoorSlots} 个班次</div>
      </div>
      <div class="stat-card info">
        <div class="stat-icon">👥</div>
        <div class="stat-value">${sortedStats.length}</div>
        <div class="stat-label">参与人数</div>
        <div class="stat-trend">人均 ${avgDoorHours} 小时</div>
      </div>
      <div class="stat-card success">
        <div class="stat-icon">🏆</div>
        <div class="stat-value">${sortedStats.length > 0 ? sortedStats[0][0] : '-'}</div>
        <div class="stat-label">门迎时长最高</div>
        <div class="stat-trend">${maxDoorHours.toFixed(1)} 小时</div>
      </div>
      <div class="stat-card warning">
        <div class="stat-icon">📅</div>
        <div class="stat-value">${selectedDayStaff}</div>
        <div class="stat-label">当日门迎人次</div>
        <div class="stat-trend">${selectedDayHours.toFixed(1)} 小时</div>
      </div>
    </div>

    <!-- Date Selector -->
    <div class="card animate-in" style="margin-bottom: 20px;">
      <div class="card-body" style="display: flex; gap: 8px; flex-wrap: wrap;">
        ${doorData.map(d => {
          const isSelected = d.date === doorScheduleDate;
          const slotCount = d.slots.filter(s => s.staff && s.staff.trim()).length;
          return `<button onclick="doorScheduleDate='${d.date}';Router.render()" 
            style="padding: 8px 16px; border-radius: var(--radius-md); border: 1px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}; 
            background: ${isSelected ? 'var(--accent)' : 'var(--bg-secondary)'}; color: ${isSelected ? '#fff' : 'var(--text-primary)'}; 
            cursor: pointer; font-size: 13px; font-weight: ${isSelected ? '700' : '400'}; transition: all 0.2s;">
            ${d.date.replace('2026-06-', '6/')} <span style="font-size: 11px; opacity: 0.7;">(${slotCount}班次)</span>
          </button>`;
        }).join('')}
      </div>
    </div>

    <div class="grid-2 animate-in">
      <!-- Time Slots -->
      <div class="card">
        <div class="card-header">
          <h3>📋 ${doorScheduleDate.replace('2026-06-', '6月')}日 门迎时间表</h3>
        </div>
        <div class="card-body" style="padding: 0;">
          <div class="table-container">
            <table class="data-table">
              <thead>
                <tr>
                  <th style="width: 140px;">时间段</th>
                  <th>值班人员</th>
                  <th style="width: 80px;">时长</th>
                </tr>
              </thead>
              <tbody>
                ${selectedDay.slots.length > 0 ? selectedDay.slots.map(slot => {
                  const hasStaff = slot.staff && slot.staff.trim();
                  const parts = slot.time.split('-');
                  const dur = (parseInt(parts[1].split(':')[0]) + (parseInt(parts[1].split(':')[1])||0)/60) - (parseInt(parts[0].split(':')[0]) + (parseInt(parts[0].split(':')[1])||0)/60);
                  return `
                    <tr>
                      <td><span style="font-weight: 600;">${slot.time}</span></td>
                      <td>
                        ${hasStaff ? `<span style="font-size: 14px; font-weight: 500;">${slot.staff}</span>` : '<span style="color: var(--text-muted);">— 未安排</span>'}
                      </td>
                      <td>
                        ${hasStaff && dur > 0
                          ? `<span style="font-size: 12px; color: var(--text-secondary);">${dur === 1 ? '1小时' : dur.toFixed(1) + '小时'}</span>`
                          : (hasStaff ? '<span style="font-size: 12px; color: var(--text-muted);">—</span>' : '<span class="badge" style="background: var(--border-light); color: var(--text-muted);">空缺</span>')
                        }
                      </td>
                    </tr>
                  `;
                }).join('') : `
                  <tr><td colspan="3" style="text-align: center; padding: 40px; color: var(--text-muted);">暂无排班数据</td></tr>
                `}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- 门迎总时长排行 -->
      <div class="card">
        <div class="card-header">
          <h3>⏱️ 门迎总时长排行</h3>
          <span style="font-size: 12px; color: var(--text-secondary);">6月1日 - 6月10日 累计</span>
        </div>
        <div class="card-body">
          ${sortedStats.length > 0 ? sortedStats.map(([name, data], i) => `
            <div class="flex justify-between items-center" style="padding: 10px 0; border-bottom: 1px solid var(--border-light);">
              <div class="flex items-center gap-12">
                <span style="width: 20px; text-align: center; font-weight: 700; font-size: 13px; color: ${i < 3 ? 'var(--primary)' : 'var(--text-secondary)'};">${i < 3 ? ['🥇','🥈','🥉'][i] : (i+1)}</span>
                <div class="avatar" style="background: ${data.avatarColor}; width: 32px; height: 32px; font-size: 12px;">${name.length > 2 ? name.slice(-2) : name}</div>
                <span class="font-semibold text-sm">${name}</span>
              </div>
              <div class="flex items-center gap-8">
                <div style="text-align: right;">
                  <div style="font-weight: 700; font-size: 15px; color: ${data.hours >= 6 ? 'var(--primary)' : data.hours >= 4 ? 'var(--text-primary)' : 'var(--text-secondary)'};">${data.hours.toFixed(1)}<span style="font-size: 12px; font-weight: 400;">h</span></div>
                  <div style="font-size: 11px; color: var(--text-secondary);">${data.slots} 次班</div>
                </div>
                <div style="width: 60px; height: 6px; background: var(--border-light); border-radius: 3px; overflow: hidden;">
                  <div style="width: ${maxDoorHours > 0 ? Math.round(data.hours / maxDoorHours * 100) : 0}%; height: 100%; background: ${data.hours >= 6 ? '#10b981' : data.hours >= 4 ? '#3b82f6' : '#f59e0b'}; border-radius: 3px; transition: width 0.3s;"></div>
                </div>
              </div>
            </div>
          `).join('') : '<div style="text-align: center; padding: 40px; color: var(--text-muted);">暂无门迎数据</div>'}
          <div style="margin-top: 12px; padding-top: 12px; border-top: 2px solid var(--border-light); display: flex; justify-content: space-between; font-size: 13px;">
            <span style="color: var(--text-secondary);">合计</span>
            <div>
              <span style="font-weight: 700;">${totalDoorHours.toFixed(1)} 小时</span>
              <span style="color: var(--text-secondary); margin-left: 8px;">${totalDoorSlots} 班次</span>
              <span style="color: var(--text-secondary); margin-left: 8px;">人均 ${avgDoorHours}h</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * ========================================
 * Store Support Page - 店务支援
 * ========================================
 */
let supportFilter = 'stats';

function renderSupport() {
  const supportData = Store.get('storeSupport') || [];
  const shiftChanges = Store.get('shiftChanges') || [];
  const staffStats = Store.get('staffStats') || {};

  const filteredData = supportFilter === 'all' ? supportData :
    supportData.filter(s => s.type.includes(supportFilter));

  // Aggregate support stats by staff
  const staffSupportCount = {};
  supportData.forEach(s => {
    staffSupportCount[s.staff] = (staffSupportCount[s.staff] || 0) + 1;
  });

  const supportTypes = [...new Set(supportData.map(s => s.type.split('-')[0]))];

  return `
    <div class="animate-in" style="margin-bottom: 24px;">
      <div style="background: linear-gradient(135deg, #1a1a2e 0%, #2d2d4a 100%); border-radius: var(--radius-lg); padding: 24px; color: #fff;">
        <h2 style="font-size: 20px; font-weight: 800;">🔧 店务支援 & 表现追踪</h2>
        <p style="font-size: 13px; opacity: 0.7;">基于PT供班表的真实工作记录 · 6月数据</p>
      </div>
    </div>

    <!-- Stats Cards -->
    <div class="stats-grid animate-in" style="grid-template-columns: repeat(4, 1fr);">
      <div class="stat-card accent">
        <div class="stat-value">${supportData.length}</div>
        <div class="stat-label">支援总次数</div>
      </div>
      <div class="stat-card info">
        <div class="stat-value">${Object.keys(staffSupportCount).length}</div>
        <div class="stat-label">参与人数</div>
      </div>
      <div class="stat-card success">
        <div class="stat-value">${shiftChanges.length}</div>
        <div class="stat-label">换班记录</div>
      </div>
      <div class="stat-card warning">
        <div class="stat-value">${Object.values(staffStats).filter(s => s.missedPunch > 0 || s.lateCount > 0).length}</div>
        <div class="stat-label">异常人员</div>
      </div>
    </div>

    <!-- Tabs -->
    <div class="tabs animate-in" style="margin-top: 20px;">
      <button class="tab ${supportFilter === 'all' ? 'active' : ''}" onclick="supportFilter='all';Router.render()">全部支援</button>
      <button class="tab ${supportFilter === '货品' ? 'active' : ''}" onclick="supportFilter='货品';Router.render()">📦 货品</button>
      <button class="tab ${supportFilter === '陈列' ? 'active' : ''}" onclick="supportFilter='陈列';Router.render()">🎨 陈列</button>
      <button class="tab ${supportFilter === 'stats' ? 'active' : ''}" onclick="supportFilter='stats';Router.render()">📊 综合统计</button>
      <button class="tab ${supportFilter === 'shifts' ? 'active' : ''}" onclick="supportFilter='shifts';Router.render()">🔄 换班记录</button>
    </div>

    ${supportFilter === 'stats' ? renderStaffStatsTable(staffStats, staffSupportCount) : ''}
    ${supportFilter === 'shifts' ? renderShiftChanges(shiftChanges) : ''}
    ${supportFilter !== 'stats' && supportFilter !== 'shifts' ? renderSupportTable(filteredData) : ''}
  `;
}

function renderSupportTable(data) {
  return `
    <div class="card animate-in">
      <div class="card-body" style="padding: 0;">
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>日期</th>
                <th>姓名</th>
                <th>支援类型</th>
                <th>时长</th>
                <th>详细内容</th>
              </tr>
            </thead>
            <tbody>
              ${data.slice().reverse().map(s => `
                <tr>
                  <td>${s.date.replace('2026-', '')}</td>
                  <td><span style="font-weight: 600;">${s.staff}</span></td>
                  <td><span class="badge ${s.type.includes('货品') ? 'badge-info' : s.type.includes('陈列') ? 'badge-active' : 'badge-warning'}">${s.type}</span></td>
                  <td>${s.duration}</td>
                  <td class="text-sm text-secondary">${s.detail}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

function renderStaffStatsTable(staffStats, staffSupportCount) {
  // 按门迎次数降序排列
  const sortedStats = Object.entries(staffStats).sort((a, b) => b[1].doorCount - a[1].doorCount);

  // 汇总数据
  const totals = {
    doorCount: 0, shiftChange: 0, shiftedCount: 0,
    missedPunch: 0, lateCount: 0, absentCount: 0,
  };
  sortedStats.forEach(([_, s]) => {
    totals.doorCount += s.doorCount;
    totals.shiftChange += s.shiftChange;
    totals.shiftedCount += s.shiftedCount;
    totals.missedPunch += s.missedPunch;
    totals.lateCount += s.lateCount;
    totals.absentCount += s.absentCount;
  });

  return `
    <div class="animate-in" style="margin-top: 4px;">
      <!-- 汇总统计卡片 -->
      <div class="stats-grid animate-in" style="grid-template-columns: repeat(6, 1fr); margin-bottom: 20px;">
        <div class="stat-card accent">
          <div class="stat-value">${totals.doorCount}</div>
          <div class="stat-label">门迎总人次</div>
        </div>
        <div class="stat-card info">
          <div class="stat-value">${totals.shiftChange + totals.shiftedCount}</div>
          <div class="stat-label">换班/被换</div>
        </div>
        <div class="stat-card danger">
          <div class="stat-value">${totals.missedPunch}</div>
          <div class="stat-label">缺卡</div>
        </div>
        <div class="stat-card warning">
          <div class="stat-value">${totals.lateCount}</div>
          <div class="stat-label">迟到</div>
        </div>
        <div class="stat-card danger">
          <div class="stat-value">${totals.absentCount}</div>
          <div class="stat-label">旷工</div>
        </div>
        <div class="stat-card success">
          <div class="stat-value">${totals.doorCount > 0 ? (totals.doorCount / sortedStats.length).toFixed(1) : 0}</div>
          <div class="stat-label">人均门迎</div>
        </div>
      </div>

      <!-- 详细表格 -->
      <div class="card">
        <div class="card-header">
          <h3>📊 Service Team 综合表现统计（6月）</h3>
          <span class="text-sm text-secondary">数据来源：PT供班表 · 实时更新</span>
        </div>
        <div class="card-body" style="padding: 0;">
          <div class="table-container">
            <table class="data-table">
              <thead>
                <tr>
                  <th>排名</th>
                  <th>姓名</th>
                  <th>🚪 门迎</th>
                  <th>🔄 换班</th>
                  <th>↩️ 被换班</th>
                  <th>❌ 缺卡</th>
                  <th>⏰ 迟到</th>
                  <th>🚫 旷工</th>
                  <th>🔧 支援</th>
                  <th>📝 点评</th>
                </tr>
              </thead>
              <tbody>
                ${sortedStats.map(([name, stats], idx) => {
                  const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1;
                  const hasIssue = stats.missedPunch > 0 || stats.lateCount > 0 || stats.absentCount > 0;
                  return `
                    <tr style="${hasIssue ? 'background: rgba(239,68,68,0.04);' : ''}">
                      <td style="font-weight: 700; font-size: 16px;">${medal}</td>
                      <td><span style="font-weight: 600;">${name}</span></td>
                      <td>
                        <div style="display: flex; align-items: center; gap: 6px;">
                          <span style="font-weight: 700; color: var(--accent); font-size: 16px;">${stats.doorCount}</span>
                          <div style="flex: 1; max-width: 60px; height: 4px; background: var(--bg-secondary); border-radius: 2px;">
                            <div style="width: ${Math.round(stats.doorCount / 8 * 100)}%; height: 100%; background: var(--accent); border-radius: 2px;"></div>
                          </div>
                        </div>
                      </td>
                      <td>${stats.shiftChange > 0 ? `<span class="badge badge-warning">${stats.shiftChange}</span>` : '<span style="color: var(--text-muted);">0</span>'}</td>
                      <td>${stats.shiftedCount > 0 ? `<span class="badge badge-info">${stats.shiftedCount}</span>` : '<span style="color: var(--text-muted);">0</span>'}</td>
                      <td>${stats.missedPunch > 0 ? `<span class="badge badge-danger">${stats.missedPunch}</span>` : '<span style="color: var(--text-muted);">0</span>'}</td>
                      <td>${stats.lateCount > 0 ? `<span class="badge badge-danger">${stats.lateCount}</span>` : '<span style="color: var(--text-muted);">0</span>'}</td>
                      <td>${stats.absentCount > 0 ? `<span class="badge badge-danger">${stats.absentCount}</span>` : '<span style="color: var(--text-muted);">0</span>'}</td>
                      <td><span style="font-weight: 600; color: var(--success);">${staffSupportCount[name] || 0}</span></td>
                      <td>${stats.dianping ? `<span style="color: var(--success);">✓</span>` : '<span style="color: var(--text-muted);">-</span>'}</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
              <tfoot>
                <tr style="background: var(--bg-secondary); font-weight: 700;">
                  <td></td>
                  <td>合计</td>
                  <td style="color: var(--accent);">${totals.doorCount}</td>
                  <td>${totals.shiftChange}</td>
                  <td>${totals.shiftedCount}</td>
                  <td>${totals.missedPunch > 0 ? `<span style="color: var(--danger);">${totals.missedPunch}</span>` : '0'}</td>
                  <td>${totals.lateCount > 0 ? `<span style="color: var(--danger);">${totals.lateCount}</span>` : '0'}</td>
                  <td>${totals.absentCount > 0 ? `<span style="color: var(--danger);">${totals.absentCount}</span>` : '0'}</td>
                  <td>${Object.values(staffSupportCount).reduce((a, b) => a + b, 0)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderShiftChanges(changes) {
  return `
    <div class="card animate-in">
      <div class="card-header">
        <h3>🔄 换班登记表</h3>
      </div>
      <div class="card-body" style="padding: 0;">
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>申请人</th>
                <th>申请日期</th>
                <th>申请班次</th>
                <th>被换班人</th>
                <th>被换班次</th>
              </tr>
            </thead>
            <tbody>
              ${changes.map(c => `
                <tr>
                  <td>${c.id}</td>
                  <td><span style="font-weight: 600;">${c.applicant}</span></td>
                  <td>${c.applyDate}</td>
                  <td class="text-sm">${c.applicantShift}</td>
                  <td><span style="font-weight: 600;">${c.target}</span></td>
                  <td class="text-sm">${c.targetShift}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

/**
 * ========================================
 * Personal Dashboard - 兼职个人概览
 * ========================================
 */
function renderPersonalDashboard() {
  const me = Store.get('staff').find(s => s.id === _auth.staffId);
  if (!me) return '<div class="card animate-in"><div class="card-body"><p>未找到你的信息</p></div></div>';

  const ratings = Store.get('ratings').filter(r => r.staffId === _auth.staffId);
  const myRating = ratings.length > 0 ? ratings[ratings.length - 1] : null;
  // 动态计算综合分（工时支持+销售业绩+顾客好评）
  const availCalc = me ? calcAvailabilityScore(me.name) : { score: 0 };
  const perfCalc = me ? calcPerformanceScore(me.name) : { score: 0 };
  const reviewCalc = me ? calcCustomerReviewScore(me.name) : { score: 0 };
  const dynamicAvg = myRating ? (() => {
    const ds = { ...myRating.scores, availability: availCalc.score, performance: perfCalc.score, customerReview: reviewCalc.score };
    return Object.values(ds).reduce((a, b) => a + b, 0) / Object.values(ds).length;
  })() : 0;
  const perfData = Store.get('performanceData') || {};
  const junePerf = perfData.june?.records?.find(r => r.name === _auth.staffName);
  const lgData = Store.get('linggongAttendance') || {};
  const myAttendance = (lgData.records || []).filter(r => r.staffName === _auth.staffName);
  const normalDays = myAttendance.filter(r => r.status === '考勤正常').length;
  const totalHours = myAttendance.reduce((s, r) => s + (r.totalHours || 0), 0);
  const lateTimes = myAttendance.filter(r => r.lateMin > 0).length;
  const hourlyRate = dynamicAvg >= 4.0 ? 60 : 28;

  return `
    <div class="animate-in" style="margin-bottom: 24px;">
      <div style="background: linear-gradient(135deg, ${me.avatar_color || '#1a1a2e'} 0%, ${me.avatar_color || '#2d2d4a'}cc 100%); border-radius: var(--radius-lg); padding: 28px; color: #fff; position: relative; overflow: hidden;">
        <div style="position: absolute; top: -20px; right: -20px; width: 120px; height: 120px; border-radius: 50%; background: rgba(255,255,255,0.08);"></div>
        <div style="position: absolute; bottom: -30px; right: 40px; width: 80px; height: 80px; border-radius: 50%; background: rgba(255,255,255,0.05);"></div>
        <div style="display: flex; align-items: center; gap: 16px; position: relative;">
          <div style="width: 56px; height: 56px; border-radius: 50%; background: rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: 700; border: 2px solid rgba(255,255,255,0.3);">${me.name[0]}</div>
          <div>
            <h2 style="font-size: 22px; font-weight: 800; margin-bottom: 2px;">${me.name}</h2>
            <p style="font-size: 13px; opacity: 0.7;">${me.dept} · ${myRating ? myRating.month + ' 评估' : '暂无评分'}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- 个人数据卡片 -->
    <div class="stats-grid animate-in" style="grid-template-columns: repeat(2, 1fr);">
      <div class="stat-card accent">
        <div class="stat-icon">⭐</div>
        <div class="stat-value">${dynamicAvg > 0 ? dynamicAvg.toFixed(1) : '-'}</div>
        <div class="stat-label">综合评分</div>
        <div class="stat-trend ${dynamicAvg >= 4.0 ? 'up' : 'down'}">${dynamicAvg > 0 ? (dynamicAvg >= 4.0 ? '✓ 达标' : '待提升') : '尚未评分'}</div>
      </div>
      <div class="stat-card info">
        <div class="stat-icon">💰</div>
        <div class="stat-value">¥${hourlyRate}</div>
        <div class="stat-label">时薪（元/h）</div>
        <div class="stat-trend up">${dynamicAvg >= 4.0 ? '高时薪' : '基础时薪'}</div>
      </div>
      <div class="stat-card success">
        <div class="stat-icon">✅</div>
        <div class="stat-value">${normalDays}</div>
        <div class="stat-label">出勤天数</div>
        <div class="stat-trend up">累计 ${totalHours.toFixed(1)}h</div>
      </div>
      <div class="stat-card ${junePerf ? (junePerf.hourlyOutput >= 210 ? 'success' : 'warning') : ''}">
        <div class="stat-icon">📊</div>
        <div class="stat-value">${junePerf ? '¥' + junePerf.sales.toLocaleString() : '-'}</div>
        <div class="stat-label">6月销售额</div>
        <div class="stat-trend ${junePerf ? (junePerf.hourlyOutput >= 210 ? 'up' : 'down') : ''}">${junePerf ? '时产 ¥' + junePerf.hourlyOutput.toFixed(0) + '/h' : '暂无数据'}</div>
      </div>
    </div>

    ${myRating ? `
    <!-- 评分详情 -->
    <div class="card animate-in" style="margin-top: 20px;">
      <div class="card-header">
        <h3>⭐ 评分详情 · ${myRating.month}</h3>
        <span class="badge ${dynamicAvg >= 4.0 ? 'badge-active' : 'badge-danger'}">综合 ${dynamicAvg.toFixed(1)}</span>
      </div>
      <div class="card-body">
        <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; margin-bottom: 16px;">
          ${(() => {
            const dynamicScores = { ...myRating.scores, availability: availCalc.score, performance: perfCalc.score, customerReview: reviewCalc.score };
            const labels = { availability: '工时支持', performance: '销售业绩', behavior: '行为规范', attendance: '考勤纪律', customerReview: '顾客好评' };
            return Object.entries(dynamicScores).filter(([key]) => key !== 'knowledge').map(([key, val]) => {
              return `
                <div style="text-align: center;">
                  <div style="font-size: 20px; font-weight: 800; color: ${val >= 4 ? '#10b981' : val >= 3 ? '#f59e0b' : '#ef4444'};">${key === 'availability' || key === 'performance' || key === 'customerReview' ? val.toFixed(1) : val}</div>
                  <div style="font-size: 11px; color: var(--text-secondary); margin-top: 2px;">${labels[key] || key}</div>
                </div>
              `;
            }).join('');
          })()}
        </div>
        <div style="background: rgba(0,0,0,0.02); border-radius: 8px; padding: 12px 14px; font-size: 13px; color: var(--text-secondary); line-height: 1.7;">
          ${myRating.comment || '暂无评语'}
        </div>
      </div>
    </div>
    ` : ''}

    ${myAttendance.length > 0 ? `
    <!-- 考勤记录 -->
    <div class="card animate-in" style="margin-top: 20px;">
      <div class="card-header">
        <h3>✅ 我的考勤</h3>
        <span style="font-size: 12px; color: var(--text-secondary);">${lateTimes > 0 ? `⚠️ 迟到 ${lateTimes} 次` : '无迟到记录'}</span>
      </div>
      <div class="card-body" style="padding: 0;">
        <div class="table-container">
          <table class="data-table" style="font-size: 13px;">
            <thead>
              <tr>
                <th>日期</th>
                <th>排班时间</th>
                <th>签到</th>
                <th>签退</th>
                <th>工时</th>
                <th>状态</th>
              </tr>
            </thead>
            <tbody>
              ${myAttendance.map(r => `
                <tr>
                  <td>${r.scheduleDate || '-'}</td>
                  <td>${r.scheduleTime || '-'}</td>
                  <td>${r.clockIn || '-'}</td>
                  <td>${r.clockOut || '-'}</td>
                  <td>${r.totalHours ? r.totalHours.toFixed(1) + 'h' : '-'}</td>
                  <td><span class="badge ${r.status === '考勤正常' ? 'badge-active' : r.status === '考勤中' ? 'badge-danger' : 'badge-danger'}">${r.status === '考勤正常' ? '✓' : r.status === '考勤中' ? '🕐' : '❌'} ${r.status}</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
    ` : ''}

    ${junePerf ? `
    <!-- 业绩数据 -->
    <div class="card animate-in" style="margin-top: 20px;">
      <div class="card-header"><h3>💰 6月业绩</h3></div>
      <div class="card-body">
        <div class="stats-grid" style="grid-template-columns: repeat(3, 1fr);">
          <div style="text-align: center; padding: 12px;">
            <div style="font-size: 18px; font-weight: 800; color: var(--text-primary);">¥${junePerf.sales.toLocaleString()}</div>
            <div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;">销售额</div>
          </div>
          <div style="text-align: center; padding: 12px;">
            <div style="font-size: 18px; font-weight: 800; color: ${junePerf.hourlyOutput >= 210 ? '#10b981' : '#f59e0b'};">¥${junePerf.hourlyOutput.toFixed(0)}/h</div>
            <div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;">时产 ${junePerf.hourlyOutput >= 210 ? '✓达标' : '✗未达标'}</div>
          </div>
          <div style="text-align: center; padding: 12px;">
            <div style="font-size: 18px; font-weight: 800; color: var(--text-primary);">${junePerf.qty || '-'}件 / ${junePerf.tickets || '-'}单</div>
            <div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;">件数 / 客单数</div>
          </div>
        </div>
      </div>
    </div>
    ` : ''}
  `;
}

// ===== 顾客好评 =====
let reviewsMonthFilter = '2026-06';
let reviewsStaffFilter = 'all';
let reviewEditingId = null;

function renderCustomerReviews() {
  const reviews = Store.get('customerReviews') || [];
  const staff = Store.get('staff');

  // 月份列表
  const months = [...new Set(reviews.map(r => r.month))].sort().reverse();
  if (months.length === 0) months.push('2026-06');
  if (!months.includes(reviewsMonthFilter)) reviewsMonthFilter = months[0];

  // 筛选
  let filtered = reviews.filter(r => r.month === reviewsMonthFilter);
  if (reviewsStaffFilter !== 'all') {
    filtered = filtered.filter(r => r.staffName === reviewsStaffFilter);
  }

  // 按员工统计
  const staffStats = {};
  filtered.forEach(r => {
    if (!staffStats[r.staffName]) staffStats[r.staffName] = { count: 0, keywords: [], snippets: [] };
    staffStats[r.staffName].count++;
    if (r.keywords) staffStats[r.staffName].keywords.push(...r.keywords);
    if (r.snippet) staffStats[r.staffName].snippets.push(r.snippet);
  });
  const ranked = Object.entries(staffStats).sort((a, b) => b[1].count - a[1].count);

  // 关键词统计
  const allKeywords = {};
  filtered.forEach(r => {
    (r.keywords || []).forEach(kw => {
      allKeywords[kw] = (allKeywords[kw] || 0) + 1;
    });
  });
  const topKeywords = Object.entries(allKeywords).sort((a, b) => b[1] - a[1]).slice(0, 12);

  const totalCount = filtered.length;
  const reviewedStaff = Object.keys(staffStats).length;

  return `
    <div class="animate-in" style="margin-bottom: 24px;">
      <div style="background: linear-gradient(135deg, #1a1a2e 0%, #2d2d4a 100%); border-radius: var(--radius-lg); padding: 24px; color: #fff;">
        <h2 style="font-size: 20px; font-weight: 800;">💬 顾客好评记录</h2>
        <p style="font-size: 13px; opacity: 0.7;">大众点评5星好评 · 按月统计 · 突出表扬词段</p>
      </div>
    </div>

    <!-- Stats -->
    <div class="stats-grid animate-in" style="grid-template-columns: repeat(4, 1fr);">
      <div class="stat-card accent">
        <div class="stat-value">${totalCount}</div>
        <div class="stat-label">${reviewsMonthFilter.replace('2026-', '')}月好评数</div>
      </div>
      <div class="stat-card success">
        <div class="stat-value">${reviewedStaff}</div>
        <div class="stat-label">被表扬人数</div>
      </div>
      <div class="stat-card info">
        <div class="stat-value">${ranked.length > 0 ? ranked[0][1].count : 0}</div>
        <div class="stat-label">好评最多${ranked.length > 0 ? '（' + ranked[0][0] + '）' : ''}</div>
      </div>
      <div class="stat-card warning">
        <div class="stat-value">${topKeywords.length}</div>
        <div class="stat-label">表扬关键词</div>
      </div>
    </div>

    <!-- Filters -->
    <div class="tabs animate-in" style="margin-top: 20px;">
      ${months.map(m => `<button class="tab ${reviewsMonthFilter === m ? 'active' : ''}" onclick="reviewsMonthFilter='${m}';reviewsStaffFilter='all';Router.render()">${m.replace('2026-', '')}月</button>`).join('')}
      <button class="tab" onclick="openReviewForm()" style="margin-left: auto; background: var(--accent); color: #fff;">+ 添加好评</button>
    </div>

    ${ranked.length === 0 ? `
      <div class="card animate-in" style="text-align: center; padding: 60px 20px;">
        <div style="font-size: 48px; margin-bottom: 16px;">🌟</div>
        <h3 style="font-size: 18px; font-weight: 700; margin-bottom: 8px;">暂无好评记录</h3>
        <p style="font-size: 14px; color: var(--text-secondary);">点击右上角「添加好评」开始记录顾客的5星好评</p>
      </div>
    ` : `
      <!-- 员工好评排行 -->
      <div class="animate-in" style="margin-top: 20px;">
        <h3 style="font-size: 16px; font-weight: 700; margin-bottom: 16px;">🏅 员工好评排行</h3>
        <div class="stats-grid" style="grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));">
          ${ranked.map(([name, data], i) => {
            const s = staff.find(st => st.name === name);
            const color = s ? s.avatar_color : '#6b7280';
            return `
              <div class="card" style="padding: 20px; position: relative; overflow: hidden;">
                ${i === 0 ? '<div style="position: absolute; top: 0; right: 0; background: linear-gradient(135deg, #f59e0b, #f97316); color: #fff; font-size: 11px; font-weight: 700; padding: 4px 12px; border-radius: 0 0 0 8px;">👑 TOP 1</div>' : ''}
                <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
                  <div style="width: 44px; height: 44px; border-radius: 50%; background: ${color}; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 16px; font-weight: 700;">${name[0]}</div>
                  <div>
                    <div style="font-weight: 700; font-size: 15px;">${name}</div>
                    <div style="font-size: 12px; color: var(--text-secondary);">${'⭐'.repeat(Math.min(data.count, 5))} ${data.count}条好评</div>
                  </div>
                </div>
                ${data.keywords.length > 0 ? `
                  <div style="display: flex; flex-wrap: wrap; gap: 6px;">
                    ${[...new Set(data.keywords)].slice(0, 5).map(kw => `<span style="background: rgba(245, 158, 11, 0.1); color: #f59e0b; font-size: 11px; padding: 3px 8px; border-radius: 6px; font-weight: 500;">${kw}</span>`).join('')}
                  </div>
                ` : ''}
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <!-- 关键词云 -->
      ${topKeywords.length > 0 ? `
        <div class="card animate-in" style="margin-top: 20px; padding: 24px;">
          <h3 style="font-size: 15px; font-weight: 700; margin-bottom: 16px;">🏷️ 表扬关键词</h3>
          <div style="display: flex; flex-wrap: wrap; gap: 10px;">
            ${topKeywords.map(([kw, count]) => {
              const size = Math.min(12 + count * 3, 20);
              const opacity = Math.min(0.5 + count * 0.15, 1);
              return `<span style="font-size: ${size}px; font-weight: ${count >= 3 ? 700 : 500}; color: rgba(245, 158, 11, ${opacity}); padding: 4px 10px; background: rgba(245, 158, 11, 0.08); border-radius: 8px;">${kw}${count > 1 ? '<span style="font-size: 11px; opacity: 0.6;"> x${count}</span>' : ''}</span>`;
            }).join('')}
          </div>
        </div>
      ` : ''}

      <!-- 好评详情列表 -->
      <div class="animate-in" style="margin-top: 20px;">
        <h3 style="font-size: 16px; font-weight: 700; margin-bottom: 16px;">📝 好评详情 (${filtered.length})</h3>
        <div style="display: flex; flex-direction: column; gap: 12px;">
          ${filtered.slice().reverse().map(r => {
            const s = staff.find(st => st.name === r.staffName);
            const color = s ? s.avatar_color : '#6b7280';
            return `
              <div class="card" style="padding: 20px;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 12px;">
                  <div style="display: flex; align-items: center; gap: 10px; flex-shrink: 0;">
                    <div style="width: 36px; height: 36px; border-radius: 50%; background: ${color}; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 14px; font-weight: 700;">${r.staffName[0]}</div>
                    <div>
                      <div style="font-weight: 700; font-size: 14px;">${r.staffName}</div>
                      <div style="font-size: 11px; color: var(--text-secondary);">${r.reviewDate || ''} · ${r.source || '大众点评'}</div>
                    </div>
                  </div>
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="font-size: 14px;">${'⭐'.repeat(r.rating || 5)}</span>
                    <button onclick="openReviewForm(${r.id})" style="background: none; border: none; cursor: pointer; font-size: 14px; opacity: 0.5; padding: 4px;">✏️</button>
                    <button onclick="deleteReview(${r.id})" style="background: none; border: none; cursor: pointer; font-size: 14px; opacity: 0.5; padding: 4px;">🗑️</button>
                  </div>
                </div>
                ${r.snippet ? `<div style="margin-top: 12px; padding: 12px 16px; background: var(--bg-secondary); border-radius: 8px; font-size: 13px; line-height: 1.7; color: var(--text-primary); border-left: 3px solid ${color};">"${r.snippet}"</div>` : ''}
                ${r.keywords && r.keywords.length > 0 ? `
                  <div style="display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px;">
                    ${r.keywords.map(kw => `<span style="background: rgba(245, 158, 11, 0.1); color: #f59e0b; font-size: 11px; padding: 3px 8px; border-radius: 6px;">${kw}</span>`).join('')}
                  </div>
                ` : ''}
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `}
  `;
}

function openReviewForm(id) {
  reviewEditingId = id || null;
  const review = id ? (Store.get('customerReviews') || []).find(r => r.id === id) : null;
  const staff = Store.get('staff');
  const staffNames = staff.map(s => s.name);

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 9999; display: flex; align-items: center; justify-content: center; padding: 20px;';
  overlay.id = 'reviewFormOverlay';

  overlay.innerHTML = `
    <div style="background: var(--bg-card, #fff); border-radius: 16px; padding: 28px; max-width: 520px; width: 100%; max-height: 90vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.3);">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
        <h3 style="font-size: 18px; font-weight: 800;">${id ? '编辑好评' : '添加好评'}</h3>
        <button onclick="closeReviewForm()" style="background: none; border: none; font-size: 22px; cursor: pointer; opacity: 0.5;">&times;</button>
      </div>

      <div style="display: flex; flex-direction: column; gap: 16px;">
        <div>
          <label style="font-size: 13px; font-weight: 600; display: block; margin-bottom: 6px;">员工姓名 *</label>
          <select id="reviewStaffName" style="width: 100%; padding: 10px 12px; border: 1px solid var(--border-color, #e5e7eb); border-radius: 8px; font-size: 14px; background: var(--bg-input, #fff); color: var(--text-primary);">
            ${staffNames.map(n => `<option value="${n}" ${review && review.staffName === n ? 'selected' : ''}>${n}</option>`).join('')}
          </select>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
          <div>
            <label style="font-size: 13px; font-weight: 600; display: block; margin-bottom: 6px;">月份 *</label>
            <select id="reviewMonth" style="width: 100%; padding: 10px 12px; border: 1px solid var(--border-color, #e5e7eb); border-radius: 8px; font-size: 14px; background: var(--bg-input, #fff); color: var(--text-primary);">
              <option value="2026-06" ${(!review || review.month === '2026-06') ? 'selected' : ''}>6月</option>
              <option value="2026-05" ${review && review.month === '2026-05' ? 'selected' : ''}>5月</option>
              <option value="2026-04" ${review && review.month === '2026-04' ? 'selected' : ''}>4月</option>
            </select>
          </div>
          <div>
            <label style="font-size: 13px; font-weight: 600; display: block; margin-bottom: 6px;">点评日期</label>
            <input id="reviewDate" type="date" value="${review ? review.reviewDate : ''}" style="width: 100%; padding: 10px 12px; border: 1px solid var(--border-color, #e5e7eb); border-radius: 8px; font-size: 14px; background: var(--bg-input, #fff); color: var(--text-primary);" />
          </div>
        </div>

        <div>
          <label style="font-size: 13px; font-weight: 600; display: block; margin-bottom: 6px;">评分</label>
          <select id="reviewRating" style="width: 100%; padding: 10px 12px; border: 1px solid var(--border-color, #e5e7eb); border-radius: 8px; font-size: 14px; background: var(--bg-input, #fff); color: var(--text-primary);">
            <option value="5" ${(!review || review.rating === 5) ? 'selected' : ''}>5星好评</option>
            <option value="4" ${review && review.rating === 4 ? 'selected' : ''}>4星</option>
          </select>
        </div>

        <div>
          <label style="font-size: 13px; font-weight: 600; display: block; margin-bottom: 6px;">表扬词段（原文摘录）</label>
          <textarea id="reviewSnippet" rows="4" placeholder="例：店员小姐姐超耐心，帮我试了好几双鞋，最后推荐了最适合我的那双..." style="width: 100%; padding: 10px 12px; border: 1px solid var(--border-color, #e5e7eb); border-radius: 8px; font-size: 13px; line-height: 1.6; background: var(--bg-input, #fff); color: var(--text-primary); resize: vertical;">${review ? review.snippet || '' : ''}</textarea>
        </div>

        <div>
          <label style="font-size: 13px; font-weight: 600; display: block; margin-bottom: 6px;">关键词标签（逗号分隔）</label>
          <input id="reviewKeywords" type="text" placeholder="耐心, 专业, 热情, 贴心" value="${review && review.keywords ? review.keywords.join(', ') : ''}" style="width: 100%; padding: 10px 12px; border: 1px solid var(--border-color, #e5e7eb); border-radius: 8px; font-size: 13px; background: var(--bg-input, #fff); color: var(--text-primary);" />
          <div style="font-size: 11px; color: var(--text-secondary); margin-top: 4px;">常用：耐心 / 专业 / 热情 / 贴心 / 试穿推荐 / 搭配建议 / 主动 / 细心</div>
        </div>

        <div>
          <label style="font-size: 13px; font-weight: 600; display: block; margin-bottom: 6px;">来源</label>
          <input id="reviewSource" type="text" placeholder="大众点评" value="${review ? review.source || '大众点评' : '大众点评'}" style="width: 100%; padding: 10px 12px; border: 1px solid var(--border-color, #e5e7eb); border-radius: 8px; font-size: 13px; background: var(--bg-input, #fff); color: var(--text-primary);" />
        </div>

        <div style="display: flex; gap: 12px; margin-top: 8px;">
          <button onclick="closeReviewForm()" style="flex: 1; padding: 12px; border: 1px solid var(--border-color, #e5e7eb); border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; background: transparent; color: var(--text-primary);">取消</button>
          <button onclick="saveReviewForm()" style="flex: 1; padding: 12px; border: none; border-radius: 8px; font-size: 14px; font-weight: 700; cursor: pointer; background: var(--accent, #3b82f6); color: #fff;">保存</button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeReviewForm();
  });
}

function closeReviewForm() {
  const overlay = document.getElementById('reviewFormOverlay');
  if (overlay) overlay.remove();
  reviewEditingId = null;
}

function saveReviewForm() {
  const staffName = document.getElementById('reviewStaffName').value;
  const month = document.getElementById('reviewMonth').value;
  const reviewDate = document.getElementById('reviewDate').value;
  const rating = parseInt(document.getElementById('reviewRating').value);
  const snippet = document.getElementById('reviewSnippet').value.trim();
  const keywordsRaw = document.getElementById('reviewKeywords').value.trim();
  const source = document.getElementById('reviewSource').value.trim() || '大众点评';

  if (!staffName || !month) {
    alert('请填写员工姓名和月份');
    return;
  }

  const keywords = keywordsRaw ? keywordsRaw.split(/[,，、]/).map(k => k.trim()).filter(k => k) : [];

  const reviews = Store.get('customerReviews') || [];

  if (reviewEditingId) {
    const idx = reviews.findIndex(r => r.id === reviewEditingId);
    if (idx >= 0) {
      reviews[idx] = { ...reviews[idx], staffName, month, reviewDate, rating, snippet, keywords, source };
    }
  } else {
    const newId = reviews.length > 0 ? Math.max(...reviews.map(r => r.id)) + 1 : 1;
    reviews.push({ id: newId, staffName, month, reviewDate, rating, snippet, keywords, source });
  }

  Store.set('customerReviews', reviews);
  closeReviewForm();
  Router.render();
}

function deleteReview(id) {
  if (!confirm('确定删除这条好评记录吗？')) return;
  const reviews = Store.get('customerReviews') || [];
  Store.set('customerReviews', reviews.filter(r => r.id !== id));
  Router.render();
}
