/* ======================================================
   UID BYPASS REGISTRY - CLIENT APPLICATION & TAB LOGIC
   ====================================================== */

// Domain Lock Security Guard
const ALLOWED_HOSTS = ['uidbbypass.netlify.app', 'localhost', '127.0.0.1'];
if (!ALLOWED_HOSTS.some(h => window.location.hostname.includes(h))) {
  document.body.innerHTML = `
    <div style="background:#050508;color:#ef4444;height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:sans-serif;text-align:center;padding:20px;">
      <h1 style="font-size:2.5rem;margin-bottom:10px;">🛡️ SECURITY VIOLATION</h1>
      <p style="color:#94a3b8;max-width:500px;font-size:1.1rem;line-height:1.6;">This application is strictly locked to <b>https://uidbbypass.netlify.app</b>.<br>Unauthorized execution on domain <i>${window.location.hostname}</i> has been blocked.</p>
    </div>
  `;
  throw new Error('Unauthorized Domain Execution Blocked');
}

const TOKEN = localStorage.getItem('uid_token');
let CURRENT_USER = JSON.parse(localStorage.getItem('uid_user') || '{}');

// Login protection — redirect if not authenticated
if (!TOKEN && !window.location.href.includes('login.html') && !window.location.href.includes('preview.html') && !window.location.href.includes('client.html')) {
  window.location.href = 'login.html';
}

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('userInfoTag')) {
    initDashboard();
  }
});

async function initDashboard() {
  await fetchUserData();
  renderUserInfo();
  loadWhitelists();
  renderAboutTab();

  if (CURRENT_USER.role === 'ADMIN' || CURRENT_USER.role === 'SELLER') {
    const navStaffTab = document.getElementById('navStaffTab');
    const navIpTab = document.getElementById('navIpTab');
    const navHistoryTab = document.getElementById('navHistoryTab');
    const staffLabel = document.getElementById('staffLabel');
    if (navStaffTab) navStaffTab.style.display = 'flex';
    if (navIpTab) navIpTab.style.display = 'flex';
    if (navHistoryTab) navHistoryTab.style.display = 'flex';
    if (staffLabel) staffLabel.style.display = 'block';
    loadManagedUsers();
    loadLoginHistory();
  }

  if (CURRENT_USER.role === 'SELLER') {
    const optSeller = document.getElementById('optSeller');
    if (optSeller) optSeller.style.display = 'none';
  }
}

async function fetchUserData() {
  if (!TOKEN) return;
  try {
    const res = await fetch(`${window.APP_CONFIG ? window.APP_CONFIG.BACKEND_URL : 'http://localhost:5000/api'}/auth/me`, {
      headers: { 'Authorization': `Bearer ${TOKEN}` }
    });
    const data = await res.json();
    if (data.success) {
      CURRENT_USER = data.user;
      localStorage.setItem('uid_user', JSON.stringify(CURRENT_USER));
    } else {
      logout();
    }
  } catch (err) {
    console.error(err);
  }
}

function renderUserInfo() {
  const uTag = document.getElementById('userInfoTag');
  if (uTag) uTag.textContent = `⚡ [${CURRENT_USER.role}] ${CURRENT_USER.username}`;
  
  const tabStatRole = document.getElementById('tabStatRole');
  if (tabStatRole) tabStatRole.textContent = CURRENT_USER.role;

  const tabStatCredits = document.getElementById('tabStatCredits');
  if (tabStatCredits) {
    tabStatCredits.textContent = CURRENT_USER.role === 'ADMIN' ? 'UNLIMITED' : CURRENT_USER.credits;
  }
}

function switchTab(tabId) {
  // Update sidebar active button
  const navItems = document.querySelectorAll('.sidebar .nav-item');
  navItems.forEach(item => item.classList.remove('active'));
  
  const selectedNavItem = Array.from(navItems).find(item => item.getAttribute('onclick') && item.getAttribute('onclick').includes(tabId));
  if (selectedNavItem) selectedNavItem.classList.add('active');

  // Switch tab pane
  const tabPanes = document.querySelectorAll('.tab-pane');
  tabPanes.forEach(pane => pane.classList.remove('active'));

  const activePane = document.getElementById(tabId);
  if (activePane) activePane.classList.add('active');
}

function selectPresetDays(days, btnElement) {
  document.getElementById('tabDaysInput').value = days;
  const buttons = document.querySelectorAll('.day-presets .btn-day');
  buttons.forEach(b => b.classList.remove('active'));
  btnElement.classList.add('active');
}

async function handleTabAddUid(e) {
  e.preventDefault();
  const uid = document.getElementById('tabUidInput').value.trim();
  const days = document.getElementById('tabDaysInput').value;

  try {
    const res = await fetch(`${window.APP_CONFIG.BACKEND_URL}/whitelist/add`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TOKEN}`
      },
      body: JSON.stringify({ uid, days })
    });
    const data = await res.json();

    if (data.success) {
      alert(`✅ ${data.message}`);
      document.getElementById('tabUidInput').value = '';
      await fetchUserData();
      renderUserInfo();
      loadWhitelists();
      switchTab('tabRecords');
    } else {
      alert(`❌ ${data.message || 'Operation failed'}`);
    }
  } catch (err) {
    console.error(err);
    alert('API connection error.');
  }
}

async function handleTabRemoveUid(e) {
  e.preventDefault();
  const uid = document.getElementById('tabRemoveUidInput').value.trim();
  
  if (!confirm(`Are you sure you want to revoke whitelist access for UID ${uid}?`)) return;

  try {
    const res = await fetch(`${window.APP_CONFIG.BACKEND_URL}/whitelist/remove`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TOKEN}`
      },
      body: JSON.stringify({ uid })
    });
    const data = await res.json();

    if (data.success) {
      const cleanMsg = (data.message || '').replace(/and GTC API!?/gi, '').replace(/& Pushed to GTC API!?/gi, '').trim();
      showToast(`🗑️ ${cleanMsg}`, 'ok');
      document.getElementById('tabRemoveUidInput').value = '';
      loadWhitelists();
      switchTab('tabRecords');
    } else {
      showToast(`❌ ${data.message}`, 'err');
    }
  } catch (err) {
    console.error(err);
    alert('API error removing UID.');
  }
}

async function loadWhitelists() {
  const tbodyLogs = document.getElementById('whitelistTableBody');
  const tbodyMyUid = document.getElementById('myUidTableBody');

  const emptyStyle = 'text-align:center;color:#64748b;padding:28px;font-size:0.85rem;';
  if (tbodyLogs) tbodyLogs.innerHTML = `<tr><td colspan="6" style="${emptyStyle}">Loading registry...</td></tr>`;
  if (tbodyMyUid) tbodyMyUid.innerHTML = `<tr><td colspan="6" style="${emptyStyle}">Loading your UIDs...</td></tr>`;

  try {
    const res = await fetch(`${window.APP_CONFIG ? window.APP_CONFIG.BACKEND_URL : 'http://localhost:5000/api'}/whitelist/list`, {
      headers: { 'Authorization': `Bearer ${TOKEN}` }
    });
    const data = await res.json();

    if (data.success && data.whitelists) {
      // 1. All Whitelists Logs
      if (tbodyLogs) {
        if (data.whitelists.length === 0) {
          tbodyLogs.innerHTML = `<tr><td colspan="6" style="${emptyStyle}">No UIDs whitelisted yet.</td></tr>`;
        } else {
          tbodyLogs.innerHTML = data.whitelists.map(item => `
            <tr>
              <td><span class="uid-code">${item.account_id}</span></td>
              <td>${item.for_days} Days</td>
              <td>${item.adder_admin}</td>
              <td style="color:#64748b;font-size:0.82rem;">${item.added_time}</td>
              <td style="color:#10b981;font-size:0.82rem;">${item.expiry_date}</td>
              <td>
                ${(CURRENT_USER.role === 'ADMIN' || item.adder_admin === CURRENT_USER.username)
                  ? `<button onclick="handleRemoveUid('${item.account_id}')" class="btn-sm-danger">Remove</button>`
                  : `<span style="font-size:0.72rem;color:#475569;font-weight:600;">PROTECTED</span>`}
              </td>
            </tr>
          `).join('');
        }
      }

      // 2. My UID List
      const myWhitelists = CURRENT_USER.role === 'ADMIN'
        ? data.whitelists
        : data.whitelists.filter(item => item.adder_admin === CURRENT_USER.username);

      const tabStatWhitelists = document.getElementById('tabStatWhitelists');
      if (tabStatWhitelists) tabStatWhitelists.textContent = myWhitelists.length;

      if (tbodyMyUid) {
        if (myWhitelists.length === 0) {
          tbodyMyUid.innerHTML = `<tr><td colspan="6" style="${emptyStyle}">You haven't whitelisted any UIDs yet.</td></tr>`;
        } else {
          tbodyMyUid.innerHTML = myWhitelists.map(item => `
            <tr>
              <td><span class="uid-code">${item.account_id}</span></td>
              <td>${item.for_days} Days</td>
              <td>${item.adder_admin}</td>
              <td style="color:#64748b;font-size:0.82rem;">${item.added_time}</td>
              <td style="color:#10b981;font-size:0.82rem;">${item.expiry_date}</td>
              <td><button onclick="handleRemoveUid('${item.account_id}')" class="btn-sm-danger">Remove</button></td>
            </tr>
          `).join('');
        }
      }
    }
  } catch (err) {
    console.error(err);
    const errStyle = 'text-align:center;color:#f87171;padding:20px;font-size:0.85rem;';
    if (tbodyLogs) tbodyLogs.innerHTML = `<tr><td colspan="6" style="${errStyle}">Failed to load whitelist registry.</td></tr>`;
    if (tbodyMyUid) tbodyMyUid.innerHTML = `<tr><td colspan="6" style="${errStyle}">Failed to load your UIDs.</td></tr>`;
  }
}

async function loadManagedUsers() {
  const tbodyUser = document.getElementById('userTableBody');
  const tbodyIp = document.getElementById('ipLogTableBody');

  const emptyStyle = 'text-align:center;color:#64748b;padding:28px;font-size:0.85rem;';
  if (tbodyUser) tbodyUser.innerHTML = `<tr><td colspan="5" style="${emptyStyle}">Loading staff...</td></tr>`;
  if (tbodyIp) tbodyIp.innerHTML = `<tr><td colspan="5" style="${emptyStyle}">Loading IP logs...</td></tr>`;

  try {
    const res = await fetch(`${window.APP_CONFIG ? window.APP_CONFIG.BACKEND_URL : 'http://localhost:5000/api'}/users`, {
      headers: { 'Authorization': `Bearer ${TOKEN}` }
    });
    const data = await res.json();

    if (data.success && data.users) {
      if (data.users.length === 0) {
        if (tbodyUser) tbodyUser.innerHTML = `<tr><td colspan="5" style="${emptyStyle}">No staff accounts created yet.</td></tr>`;
        if (tbodyIp) tbodyIp.innerHTML = `<tr><td colspan="5" style="${emptyStyle}">No IP logs available.</td></tr>`;
        return;
      }

      // 1. Staff Table (with Delete button)
      if (tbodyUser) {
        tbodyUser.innerHTML = data.users.map(u => `
          <tr>
            <td style="font-weight:600;">${u.username} <span style="font-size:0.72rem;color:#475569;">(${u.id})</span></td>
            <td><span class="role-pill role-${u.role}">${u.role}</span></td>
            <td style="font-family:'JetBrains Mono',monospace;color:#06b6d4;font-weight:700;">${u.credits}</td>
            <td style="color:#64748b;">${u.created_by}</td>
            <td style="color:#64748b;font-size:0.82rem;">${new Date(u.created_at).toLocaleDateString()}</td>
            <td>
              ${u.role !== 'ADMIN' ? `<button onclick="handleDeleteUser('${u.id}', '${u.username}')" class="btn-sm-danger">🗑️ Delete</button>` : '<span style="color:#475569;font-size:0.72rem;">PROTECTED</span>'}
            </td>
          </tr>
        `).join('');
      }

      // 2. IP Logs Table
      if (tbodyIp) {
        tbodyIp.innerHTML = data.users.map(u => `
          <tr>
            <td style="font-weight:600;">${u.username} <span style="font-size:0.72rem;color:#475569;">(${u.id})</span></td>
            <td><span class="role-pill role-${u.role}">${u.role}</span></td>
            <td><span class="ip-code">🌐 ${u.last_login_ip || 'Never logged in'}</span></td>
            <td style="color:#64748b;">${u.created_by}</td>
            <td style="color:#64748b;font-size:0.82rem;">${new Date(u.created_at).toLocaleDateString()}</td>
          </tr>
        `).join('');
      }
    }
  } catch (err) {
    console.error(err);
    const errStyle = 'text-align:center;color:#f87171;padding:20px;font-size:0.85rem;';
    if (tbodyUser) tbodyUser.innerHTML = `<tr><td colspan="5" style="${errStyle}">Failed to load staff.</td></tr>`;
    if (tbodyIp) tbodyIp.innerHTML = `<tr><td colspan="5" style="${errStyle}">Failed to load IP logs.</td></tr>`;
  }
}

async function handleRemoveUid(uid) {
  if (!confirm(`Are you sure you want to remove UID ${uid} from Whitelist?`)) return;

  try {
    const res = await fetch(`${window.APP_CONFIG.BACKEND_URL}/whitelist/remove`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TOKEN}`
      },
      body: JSON.stringify({ uid })
    });
    const data = await res.json();

    if (data.success) {
      const cleanMsg = (data.message || '').replace(/and GTC API!?/gi, '').replace(/& Pushed to GTC API!?/gi, '').trim();
      showToast(`🗑️ ${cleanMsg}`, 'ok');
      loadWhitelists();
    } else {
      showToast(`❌ ${data.message}`, 'err');
    }
  } catch (err) {
    console.error(err);
    alert('API request error');
  }
}

async function handleCreateUser(e) {
  e.preventDefault();
  const username = document.getElementById('newUsername').value.trim();
  const password = document.getElementById('newPassword').value.trim();
  const role = document.getElementById('newRole').value;
  const initialCredits = document.getElementById('newCredits').value;

  try {
    const res = await fetch(`${window.APP_CONFIG.BACKEND_URL}/users/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TOKEN}`
      },
      body: JSON.stringify({ username, password, role, initialCredits })
    });
    const data = await res.json();

    if (data.success) {
      alert(`👤 ${data.message}`);
      closeModal('createUserModal');
      loadManagedUsers();
    } else {
      alert(`❌ ${data.message}`);
    }
  } catch (err) {
    console.error(err);
    alert('API error creating user.');
  }
}

async function handleManageCredits(e) {
  e.preventDefault();
  const userId = document.getElementById('creditUserId').value.trim();
  const action = document.getElementById('creditAction').value;
  const amount = document.getElementById('creditAmount').value;

  try {
    const res = await fetch(`${window.APP_CONFIG.BACKEND_URL}/users/credits`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TOKEN}`
      },
      body: JSON.stringify({ userId, action, amount })
    });
    const data = await res.json();

    if (data.success) {
      alert(`💰 ${data.message}`);
      closeModal('creditModal');
      loadManagedUsers();
    } else {
      alert(`❌ ${data.message}`);
    }
  } catch (err) {
    console.error(err);
    alert('API error updating credits.');
  }
}

function openModal(id) {
  document.getElementById(id).style.display = 'flex';
}

function closeModal(id) {
  document.getElementById(id).style.display = 'none';
}

function logout() {
  localStorage.removeItem('uid_token');
  localStorage.removeItem('uid_user');
  window.location.href = 'login.html';
}

async function handleDeleteUser(userId, username) {
  if (!confirm(`⚠️ Are you sure you want to DELETE account "${username}"?\n\nThis action cannot be undone.`)) return;

  try {
    const BASE = window.APP_CONFIG ? window.APP_CONFIG.BACKEND_URL : 'http://localhost:5000/api';
    const res = await fetch(`${BASE}/users/${userId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${TOKEN}` }
    });
    const data = await res.json();

    if (data.success) {
      showToast(`✅ ${data.message}`, 'ok');
      loadManagedUsers();
    } else {
      showToast(`❌ ${data.message}`, 'err');
    }
  } catch (err) {
    console.error(err);
    showToast('⚠ API error deleting user.', 'err');
  }
}

async function loadLoginHistory() {
  const tbody = document.getElementById('loginHistoryBody');
  if (!tbody) return;

  const emptyStyle = 'text-align:center;color:#64748b;padding:28px;font-size:0.85rem;';
  tbody.innerHTML = `<tr><td colspan="5" style="${emptyStyle}">Loading login history...</td></tr>`;

  try {
    const BASE = window.APP_CONFIG ? window.APP_CONFIG.BACKEND_URL : 'http://localhost:5000/api';
    const res = await fetch(`${BASE}/login-history`, {
      headers: { 'Authorization': `Bearer ${TOKEN}` }
    });
    const data = await res.json();

    if (data.success && data.history) {
      if (data.history.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="${emptyStyle}">No login history recorded yet.</td></tr>`;
        return;
      }

      tbody.innerHTML = data.history.map((h, i) => {
        const dt = new Date(h.login_time);
        const dateStr = dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
        const timeStr = dt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        return `
          <tr>
            <td style="color:#475569;font-size:0.78rem;font-family:'JetBrains Mono',monospace;">${i + 1}</td>
            <td style="font-weight:600;">${h.username}</td>
            <td><span class="role-pill role-${h.role}">${h.role}</span></td>
            <td><span class="ip-code">🌐 ${h.ip}</span></td>
            <td>
              <span style="color:#f1f5f9;font-size:0.85rem;">${dateStr}</span>
              <span style="color:#64748b;font-size:0.78rem;margin-left:8px;font-family:'JetBrains Mono',monospace;">${timeStr}</span>
            </td>
          </tr>
        `;
      }).join('');
    }
  } catch (err) {
    console.error(err);
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:#f87171;padding:20px;">Failed to load login history.</td></tr>`;
  }
}

function renderAboutTab() {
  const u = CURRENT_USER;
  if (!u || !u.username) return;

  // Hero card
  const avatar = document.getElementById('aboutAvatar');
  if (avatar) avatar.textContent = u.username.charAt(0).toUpperCase();

  const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };

  setEl('aboutUsername', u.username);
  setEl('aboutUserId', 'ID: ' + (u.id || '---'));
  setEl('aboutCredits', u.role === 'ADMIN' ? '∞' : (u.credits ?? '---'));
  setEl('aboutCredits2', u.role === 'ADMIN' ? 'UNLIMITED' : (u.credits ?? '---'));
  setEl('aboutLastIp', u.last_login_ip || 'Localhost');

  const roleBadge = document.getElementById('aboutRoleBadge');
  if (roleBadge) {
    roleBadge.textContent = u.role || '---';
    const roleColors = { ADMIN: '#a855f7', SELLER: '#06b6d4', RESELLER: '#10b981' };
    roleBadge.style.color = roleColors[u.role] || '#a855f7';
  }

  // Details
  setEl('aboutDetailUser', u.username);
  setEl('aboutDetailRole', u.role);
  setEl('aboutDetailId', u.id || '---');
  setEl('aboutDetailCredits', u.role === 'ADMIN' ? 'UNLIMITED' : (u.credits ?? '---'));
  setEl('aboutDetailIp', u.last_login_ip || 'Not recorded yet');
  // UID count filled by loadWhitelists later

  // Permissions grid
  const permGrid = document.getElementById('aboutPermsGrid');
  if (permGrid) {
    const PERMS = {
      ADMIN: [
        [true,  '⚡ Whitelist Any UID'],
        [true,  '🗑️ Remove Any UID'],
        [true,  '👥 Create Sellers'],
        [true,  '👤 Create Resellers'],
        [true,  '💳 Set Unlimited Credits'],
        [true,  '🌐 View All IP Logs'],
        [true,  '🕐 View Full Login History'],
        [true,  '📋 View All UID Lists'],
        [true,  '🗑️ Delete Any Account'],
      ],
      SELLER: [
        [true,  '⚡ Whitelist UIDs'],
        [true,  '🗑️ Remove Own UIDs'],
        [false, '👥 Create Sellers'],
        [true,  '👤 Create Resellers'],
        [true,  '💳 Set Reseller Credits'],
        [true,  '🌐 View Reseller IPs'],
        [true,  '🕐 View Reseller Logins'],
        [false, '📋 View All UIDs'],
        [true,  '🗑️ Delete Own Resellers'],
      ],
      RESELLER: [
        [true,  '⚡ Whitelist UIDs'],
        [true,  '🗑️ Remove Own UIDs'],
        [false, '👥 Create Sellers'],
        [false, '👤 Create Resellers'],
        [false, '💳 Manage Credits'],
        [false, '🌐 View IP Logs'],
        [false, '🕐 View Login History'],
        [true,  '📋 View Own UIDs'],
        [false, '🗑️ Delete Accounts'],
      ]
    };

    const perms = PERMS[u.role] || PERMS.RESELLER;
    permGrid.innerHTML = perms.map(([has, label]) => `
      <div class="perm-item ${has ? 'perm-yes' : 'perm-no'}">
        <div class="perm-dot"></div>
        <span>${label}</span>
      </div>
    `).join('');
  }
}

function showToast(msg, type = 'ok') {
  const t = document.getElementById('toastMsg');
  if (!t) return;
  t.textContent = msg;
  t.className = type === 'ok' ? 'toast-ok' : 'toast-err';
  t.style.display = 'block';
  setTimeout(() => { t.style.display = 'none'; }, 3500);
}
