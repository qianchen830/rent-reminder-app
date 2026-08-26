<script setup>
import { ref, onMounted } from 'vue'
import { getUsers, addUser, deleteUser, updateUserPassword } from '../store.js'

const emit = defineEmits(['back', 'logout'])

const users = ref([])
const loading = ref(true)
const showAdd = ref(false)
const showPw = ref(false)
const selectedUser = ref(null)
const addForm = ref({ username: '', password: '', role: 'user' })
const pwForm = ref({ password: '' })
const error = ref('')
const success = ref('')

onMounted(async () => {
  try {
    users.value = await getUsers()
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
})

function msg(text, type = 'err') {
  if (type === 'ok') { success.value = text; error.value = ''; setTimeout(() => success.value = '', 3000) }
  else { error.value = text; success.value = '' }
}

async function onAdd() {
  if (!addForm.value.username || !addForm.value.password) return msg('请填写完整')
  try {
    await addUser(addForm.value.username, addForm.value.password, addForm.value.role)
    users.value = await getUsers()
    showAdd.value = false
    addForm.value = { username: '', password: '', role: 'user' }
    msg('用户添加成功', 'ok')
  } catch (e) { msg(e.message) }
}

async function onDel(user) {
  if (!confirm(`确认删除用户「${user.username}」？`)) return
  try {
    await deleteUser(user.id)
    users.value = await getUsers()
    msg('已删除', 'ok')
  } catch (e) { msg(e.message) }
}

async function onPwSubmit() {
  if (!pwForm.value.password) return
  try {
    await updateUserPassword(selectedUser.value.id, pwForm.value.password)
    showPw.value = false
    pwForm.value = { password: '' }
    selectedUser.value = null
    msg('密码已修改', 'ok')
  } catch (e) { msg(e.message) }
}
</script>

<template>
  <div class="admin-wrap">
    <!-- Header -->
    <div class="admin-header">
      <div class="admin-header-left">
        <button class="back-btn" @click="emit('back')">←</button>
        <div>
          <div class="admin-title">👑 系统管理</div>
          <div class="admin-sub">用户管理与权限控制</div>
        </div>
      </div>
      <button class="btn btn-ghost btn-sm" style="width:auto;padding:7px 14px" @click="emit('logout')">🚪 退出</button>
    </div>

    <!-- Glowing divider -->
    <div class="glow-divider"></div>

    <!-- Stats row -->
    <div class="admin-stats-row">
      <div class="admin-stat-chip">
        <div class="stat-chip-icon">👥</div>
        <div class="stat-chip-val">{{ users.length }}</div>
        <div class="stat-chip-label">总用户</div>
      </div>
      <div class="admin-stat-chip cyan">
        <div class="stat-chip-icon">🔐</div>
        <div class="stat-chip-val">{{ users.filter(u => u.role === 'admin').length }}</div>
        <div class="stat-chip-label">管理员</div>
      </div>
      <div class="admin-stat-chip purple">
        <div class="stat-chip-icon">👤</div>
        <div class="stat-chip-val">{{ users.filter(u => u.role === 'user').length }}</div>
        <div class="stat-chip-label">普通用户</div>
      </div>
    </div>

    <!-- Alerts -->
    <transition name="alert-slide">
      <div v-if="success" class="alert alert-success">
        <span>✅</span> {{ success }}
      </div>
    </transition>
    <transition name="alert-slide">
      <div v-if="error" class="alert alert-danger">
        <span>⚠️</span> {{ error }}
      </div>
    </transition>

    <!-- Section title -->
    <div class="section-title" style="padding:0 0 12px">● 用户列表</div>

    <!-- Loading -->
    <div v-if="loading" class="admin-loading">
      <div v-for="i in 3" :key="i" class="user-skeleton">
        <div class="skeleton" style="height:42px;width:42px;border-radius:50%;flex-shrink:0"></div>
        <div style="flex:1">
          <div class="skeleton" style="height:14px;width:40%;margin-bottom:8px;border-radius:6px"></div>
          <div class="skeleton" style="height:11px;width:60%;border-radius:6px"></div>
        </div>
      </div>
    </div>

    <!-- User list -->
    <div v-else class="user-list">
      <div
        v-for="(u, idx) in users"
        :key="u.id"
        class="user-card"
        :style="{ animationDelay: idx * 50 + 'ms' }"
      >
        <!-- Avatar -->
        <div class="user-avatar-wrap">
          <div class="user-avatar" :class="u.role === 'admin' ? 'avatar-admin' : 'avatar-user'">
            {{ u.username[0].toUpperCase() }}
          </div>
          <div class="user-online-dot"></div>
        </div>

        <!-- Info -->
        <div class="user-info">
          <div class="user-name-row">
            <span class="user-name">{{ u.username }}</span>
            <span class="role-badge" :class="u.role">
              {{ u.role === 'admin' ? '管理员' : '用户' }}
            </span>
          </div>
          <div class="user-date">
            <span>📅</span> {{ u.createdAt.slice(0, 10) }}
          </div>
        </div>

        <!-- Actions -->
        <div class="user-actions">
          <button class="icon-btn" @click="selectedUser = u; showPw = true" title="修改密码">
            <span>🔑</span>
          </button>
          <button class="icon-btn icon-btn-danger" @click="onDel(u)" title="删除用户">
            <span>🗑️</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Add user CTA -->
    <button class="add-user-btn" @click="showAdd = true">
      <span class="add-user-icon">＋</span>
      <span>添加用户</span>
    </button>

    <!-- Add user modal -->
    <div v-if="showAdd" class="modal-overlay" @click.self="showAdd = false">
      <div class="modal-sheet">
        <div class="modal-title">＋ 添加用户</div>

        <div class="input-group">
          <label>用户名</label>
          <input v-model="addForm.username" class="input" placeholder="输入用户名" />
        </div>
        <div class="input-group">
          <label>密码</label>
          <input v-model="addForm.password" type="password" class="input" placeholder="输入密码" />
        </div>
        <div class="input-group">
          <label>角色</label>
          <select v-model="addForm.role" class="input">
            <option value="user">普通用户</option>
            <option value="admin">管理员</option>
          </select>
        </div>

        <div class="modal-actions">
          <button class="btn btn-secondary" @click="showAdd = false">取消</button>
          <button class="btn btn-primary" @click="onAdd">确认添加</button>
        </div>
      </div>
    </div>

    <!-- Change password modal -->
    <div v-if="showPw" class="modal-overlay" @click.self="showPw = false">
      <div class="modal-sheet">
        <div class="modal-title">🔑 修改密码</div>
        <div class="modal-subtitle">用户：{{ selectedUser?.username }}</div>

        <div class="input-group">
          <label>新密码</label>
          <input v-model="pwForm.password" type="password" class="input" placeholder="输入新密码" />
        </div>

        <div class="modal-actions">
          <button class="btn btn-secondary" @click="showPw = false">取消</button>
          <button class="btn btn-primary" @click="onPwSubmit">确认修改</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.admin-wrap {
  min-height: 100vh;
  background: var(--bg-void);
  color: var(--text-primary);
  font-family: var(--font-sans);
}

.admin-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 16px 14px;
}
.admin-header-left { display: flex; align-items: center; gap: 14px; }
.back-btn {
  font-size: 24px;
  cursor: pointer;
  opacity: 0.6;
  background: none;
  border: none;
  color: var(--text-primary);
  padding: 4px;
  transition: opacity 0.2s;
}
.back-btn:hover { opacity: 1; }
.admin-title { font-size: 20px; font-weight: 800; margin-bottom: 3px; }
.admin-sub { font-size: 11px; color: var(--accent); font-weight: 600; }

.glow-divider {
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(0,212,255,0.4), rgba(124,77,255,0.4), transparent);
  margin: 0 16px 16px;
}

/* Stats row */
.admin-stats-row {
  display: flex;
  gap: 10px;
  padding: 0 16px 20px;
}
.admin-stat-chip {
  flex: 1;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 14px 8px;
  text-align: center;
  transition: all 0.2s;
  box-shadow: var(--shadow-card);
}
.admin-stat-chip:hover { border-color: var(--border-accent); transform: translateY(-1px); }
.stat-chip-icon { font-size: 18px; margin-bottom: 6px; }
.stat-chip-val { font-size: 24px; font-weight: 800; color: var(--text-primary); letter-spacing: -0.5px; }
.stat-chip-label { font-size: 10px; color: var(--text-muted); font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 3px; }
.admin-stat-chip.cyan .stat-chip-val { color: var(--accent); }
.admin-stat-chip.purple .stat-chip-val { color: var(--accent-2); }

/* Alerts */
.alert {
  margin: 0 16px 12px;
  padding: 12px 16px;
  border-radius: var(--radius-md);
  font-size: 13px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 10px;
  border: 1px solid;
}
.alert-success { background: var(--success-dim); border-color: rgba(0,230,118,0.2); color: var(--success); }
.alert-danger { background: var(--danger-dim); border-color: rgba(255,69,96,0.2); color: var(--danger); }
.alert-slide-enter-active, .alert-slide-leave-active { transition: all 0.3s var(--ease-out); }
.alert-slide-enter-from, .alert-slide-leave-to { opacity: 0; transform: translateY(-8px); }

/* Section title */
.section-title {
  font-size: 11px;
  font-weight: 700;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 1.2px;
}

/* Loading skeletons */
.admin-loading { padding: 0 16px; }
.user-skeleton {
  display: flex;
  align-items: center;
  gap: 12px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 14px;
  margin-bottom: 10px;
}

/* User cards */
.user-list { padding: 0 16px; }

@keyframes slideInUp {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.user-card {
  display: flex;
  align-items: center;
  gap: 12px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 14px 16px;
  margin-bottom: 10px;
  transition: all 0.2s;
  box-shadow: var(--shadow-card);
  animation: slideInUp 0.3s var(--ease-out) both;
}
.user-card:hover { border-color: var(--border-accent); background: var(--bg-card-hover); }

.user-avatar-wrap {
  position: relative;
  flex-shrink: 0;
}
.user-avatar {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: 800;
  color: #020714;
}
.avatar-admin { background: linear-gradient(135deg, var(--accent-2), var(--accent)); box-shadow: 0 2px 12px rgba(124,77,255,0.35); }
.avatar-user { background: linear-gradient(135deg, var(--accent), rgba(0,212,255,0.6)); box-shadow: 0 2px 12px rgba(0,212,255,0.25); }
.user-online-dot {
  position: absolute;
  bottom: 1px; right: 1px;
  width: 10px; height: 10px;
  border-radius: 50%;
  background: var(--success);
  border: 2px solid var(--bg-card);
  box-shadow: 0 0 6px var(--success);
}

.user-info { flex: 1; min-width: 0; }
.user-name-row { display: flex; align-items: center; gap: 8px; margin-bottom: 5px; }
.user-name { font-size: 15px; font-weight: 800; }
.user-date { font-size: 11px; color: var(--text-muted); display: flex; align-items: center; gap: 4px; }

.role-badge {
  font-size: 10px;
  padding: 2px 9px;
  border-radius: var(--radius-full);
  font-weight: 700;
}
.role-badge.admin { background: rgba(124,77,255,0.15); color: var(--accent-2); border: 1px solid rgba(124,77,255,0.2); }
.role-badge.user { background: var(--accent-dim); color: var(--accent); border: 1px solid rgba(0,212,255,0.15); }

.user-actions { display: flex; gap: 8px; flex-shrink: 0; }
.icon-btn {
  width: 36px; height: 36px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: transparent;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.15s;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
}
.icon-btn:hover { background: var(--accent-dim); border-color: var(--border-accent); color: var(--accent); }
.icon-btn-danger:hover { background: var(--danger-dim); border-color: rgba(255,69,96,0.3); color: var(--danger); }

/* Add user button */
.add-user-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: calc(100% - 32px);
  margin: 20px 16px;
  padding: 14px;
  background: linear-gradient(135deg, rgba(0,212,255,0.1), rgba(124,77,255,0.1));
  border: 1px solid rgba(0,212,255,0.25);
  border-radius: var(--radius-lg);
  color: var(--accent);
  font-size: 14px;
  font-weight: 700;
  font-family: var(--font-sans);
  cursor: pointer;
  transition: all 0.2s var(--ease-out);
}
.add-user-btn:hover {
  background: linear-gradient(135deg, rgba(0,212,255,0.18), rgba(124,77,255,0.18));
  border-color: rgba(0,212,255,0.5);
  box-shadow: 0 0 20px rgba(0,212,255,0.15);
  transform: translateY(-1px);
}
.add-user-icon { font-size: 18px; }

/* Modal reuse from global style.css */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(4, 5, 13, 0.75);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  display: flex;
  align-items: flex-end;
  z-index: 1000;
  justify-content: center;
}
.modal-sheet {
  background: var(--bg-deep);
  border-radius: var(--radius-2xl) var(--radius-2xl) 0 0;
  width: 100%;
  max-width: 500px;
  max-height: 92vh;
  overflow-y: auto;
  padding: 28px 20px calc(20px + env(safe-area-inset-bottom, 0));
  border: 1px solid var(--border);
  border-bottom: none;
  box-shadow: 0 -8px 40px rgba(0,0,0,0.6);
  animation: slideUpSheet 0.25s var(--ease-out);
}
@keyframes slideUpSheet {
  from { transform: translateY(100%); opacity: 0.8; }
  to { transform: translateY(0); opacity: 1; }
}
.modal-title { font-size: 20px; font-weight: 800; margin-bottom: 6px; text-align: center; }
.modal-subtitle { font-size: 13px; color: var(--text-muted); text-align: center; margin-bottom: 22px; }
.modal-actions { display: flex; gap: 10px; margin-top: 22px; }
.modal-actions .btn { flex: 1; }
.input-group { margin-bottom: 16px; }
.input-group label { display: block; font-size: 12px; color: var(--text-muted); margin-bottom: 8px; font-weight: 600; letter-spacing: 0.4px; text-transform: uppercase; }
.input {
  width: 100%;
  padding: 13px 16px;
  background: rgba(255,255,255,0.04);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  color: var(--text-primary);
  font-size: 14px;
  font-family: var(--font-sans);
  outline: none;
  transition: all 0.15s;
}
.input:focus { border-color: var(--accent); background: rgba(0,212,255,0.04); box-shadow: 0 0 0 3px rgba(0,212,255,0.1); }
select.input {
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='%2300d4ff' viewBox='0 0 16 16'%3E%3Cpath d='M4.5 6l3.5 4 3.5-4H4.5z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 14px center;
  padding-right: 40px;
  cursor: pointer;
}
.btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; padding: 12px 20px; border-radius: var(--radius-md); border: none; font-family: var(--font-sans); font-size: 14px; font-weight: 700; cursor: pointer; transition: all 0.15s; width: 100%; }
.btn-primary { background: linear-gradient(135deg, var(--accent), var(--accent-2)); color: #020714; }
.btn-primary:hover { transform: translateY(-1px); box-shadow: 0 4px 16px rgba(0,212,255,0.3); }
.btn-secondary { background: var(--bg-card); color: var(--text-secondary); border: 1px solid var(--border); }
.btn-secondary:hover { background: rgba(255,255,255,0.07); }
.btn-sm { padding: 8px 14px; font-size: 12px; }
</style>
