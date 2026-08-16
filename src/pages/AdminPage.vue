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
  <div class="admin-bg">
    <!-- Header -->
    <div class="admin-header">
      <div class="header-left">
        <span class="back-btn" @click="emit('back')">←</span>
        <div>
          <div class="header-title">👑 系统管理</div>
          <div class="header-sub">用户管理 · 权限控制</div>
        </div>
      </div>
      <div class="header-right">
        <button class="btn-ghost btn-sm" @click="emit('logout')">退出登录</button>
      </div>
    </div>

    <!-- Glowing divider -->
    <div class="glow-divider"></div>

    <!-- Stats bar -->
    <div class="stats-bar">
      <div class="stat-chip">
        <span class="chip-icon">👥</span>
        <span class="chip-val">{{ users.length }}</span>
        <span class="chip-label">总用户</span>
      </div>
      <div class="stat-chip">
        <span class="chip-icon">🔐</span>
        <span class="chip-val">{{ users.filter(u => u.role === 'admin').length }}</span>
        <span class="chip-label">管理员</span>
      </div>
      <div class="stat-chip">
        <span class="chip-icon">👤</span>
        <span class="chip-val">{{ users.filter(u => u.role === 'user').length }}</span>
        <span class="chip-label">普通用户</span>
      </div>
    </div>

    <!-- Alert -->
    <div v-if="success" class="alert alert-success">
      <span>✅</span> {{ success }}
    </div>
    <div v-if="error" class="alert alert-danger">
      <span>⚠️</span> {{ error }}
    </div>

    <!-- User list -->
    <div class="section-title">● 用户列表</div>

    <div v-if="loading" class="loading">加载中...</div>

    <div v-else class="user-list">
      <div v-for="u in users" :key="u.id" class="user-card">
        <div class="user-info">
          <div class="user-avatar">{{ u.username[0].toUpperCase() }}</div>
          <div>
            <div class="user-name">{{ u.username }}</div>
            <div class="user-meta">
              <span class="role-badge" :class="u.role">{{ u.role === 'admin' ? '管理员' : '用户' }}</span>
              <span class="user-date">{{ u.createdAt.slice(0, 10) }}</span>
            </div>
          </div>
        </div>
        <div class="user-actions">
          <button class="btn-icon" @click="selectedUser = u; showPw = true" title="改密码">🔑</button>
          <button class="btn-icon btn-icon-danger" @click="onDel(u)" title="删除">🗑️</button>
        </div>
      </div>
    </div>

    <!-- Add user button -->
    <button class="cyber-btn-full" @click="showAdd = true">
      <span>＋</span> 添加用户
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
          <button class="btn-secondary" @click="showAdd = false">取消</button>
          <button class="btn-primary" @click="onAdd">确认添加</button>
        </div>
      </div>
    </div>

    <!-- Change password modal -->
    <div v-if="showPw" class="modal-overlay" @click.self="showPw = false">
      <div class="modal-sheet">
        <div class="modal-title">🔑 修改密码</div>
        <div class="modal-sub">用户：{{ selectedUser?.username }}</div>
        <div class="input-group">
          <label>新密码</label>
          <input v-model="pwForm.password" type="password" class="input" placeholder="输入新密码" />
        </div>
        <div class="modal-actions">
          <button class="btn-secondary" @click="showPw = false">取消</button>
          <button class="btn-primary" @click="onPwSubmit">确认修改</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.admin-bg {
  min-height: 100vh;
  background: #05080f;
  color: #fff;
  font-family: 'Inter', -apple-system, sans-serif;
}

.admin-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 16px 12px;
}
.header-left { display: flex; align-items: center; gap: 12px; }
.back-btn { font-size: 24px; cursor: pointer; opacity: 0.7; }
.back-btn:hover { opacity: 1; }
.header-title { font-size: 18px; font-weight: 700; }
.header-sub { font-size: 11px; color: rgba(0,212,255,0.6); margin-top: 2px; }
.btn-ghost {
  background: transparent;
  border: 1px solid rgba(0,212,255,0.3);
  color: rgba(0,212,255,0.8);
  padding: 6px 14px;
  border-radius: 8px;
  font-size: 12px;
  cursor: pointer;
  font-family: inherit;
}

.glow-divider {
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(0,212,255,0.4), rgba(124,77,255,0.4), transparent);
  margin: 0 16px 16px;
}

.stats-bar {
  display: flex;
  gap: 10px;
  padding: 0 16px 16px;
}
.stat-chip {
  flex: 1;
  background: rgba(0,212,255,0.04);
  border: 1px solid rgba(0,212,255,0.15);
  border-radius: 10px;
  padding: 12px 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}
.chip-icon { font-size: 18px; }
.chip-val { font-size: 22px; font-weight: 700; color: #00d4ff; }
.chip-label { font-size: 10px; color: rgba(255,255,255,0.4); }

.alert {
  margin: 0 16px 12px;
  padding: 10px 14px;
  border-radius: 8px;
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.alert-success { background: rgba(0,230,118,0.1); border: 1px solid rgba(0,230,118,0.3); color: #00e676; }
.alert-danger { background: rgba(255,68,68,0.1); border: 1px solid rgba(255,68,68,0.3); color: #ff4444; }

.section-title {
  font-size: 11px;
  font-weight: 600;
  color: rgba(0,212,255,0.6);
  text-transform: uppercase;
  letter-spacing: 1px;
  padding: 0 16px 10px;
}

.loading { text-align: center; padding: 40px; color: rgba(255,255,255,0.4); }

.user-list { display: flex; flex-direction: column; gap: 10px; padding: 0 16px; }
.user-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(0,212,255,0.1);
  border-radius: 12px;
  padding: 14px;
  transition: all 0.2s;
}
.user-card:hover { border-color: rgba(0,212,255,0.3); background: rgba(0,212,255,0.04); }
.user-info { display: flex; align-items: center; gap: 12px; }
.user-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, #00d4ff, #7c4dff);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: 700;
  color: #000;
}
.user-name { font-size: 15px; font-weight: 600; }
.user-meta { display: flex; align-items: center; gap: 8px; margin-top: 3px; }
.role-badge {
  font-size: 10px;
  padding: 2px 8px;
  border-radius: 20px;
  font-weight: 600;
}
.role-badge.admin { background: rgba(124,77,255,0.2); color: #a78bfa; }
.role-badge.user { background: rgba(0,212,255,0.15); color: #00d4ff; }
.user-date { font-size: 11px; color: rgba(255,255,255,0.3); }
.user-actions { display: flex; gap: 8px; }
.btn-icon {
  width: 34px;
  height: 34px;
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 8px;
  background: transparent;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-icon:hover { background: rgba(0,212,255,0.1); border-color: rgba(0,212,255,0.4); }
.btn-icon-danger:hover { background: rgba(255,68,68,0.1); border-color: rgba(255,68,68,0.4); }

.cyber-btn-full {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: calc(100% - 32px);
  margin: 20px 16px;
  padding: 14px;
  background: linear-gradient(135deg, rgba(0,212,255,0.15), rgba(124,77,255,0.15));
  border: 1px solid rgba(0,212,255,0.3);
  border-radius: 12px;
  color: #00d4ff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.2s;
}
.cyber-btn-full:hover {
  background: linear-gradient(135deg, rgba(0,212,255,0.25), rgba(124,77,255,0.25));
  box-shadow: 0 0 20px rgba(0,212,255,0.2);
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.7);
  display: flex;
  align-items: flex-end;
  z-index: 1000;
  justify-content: center;
}
.modal-sheet {
  background: #0d1120;
  border-radius: 20px 20px 0 0;
  width: 100%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
  padding: 24px 20px;
  animation: slideUp 0.25s ease;
  border-top: 1px solid rgba(0,212,255,0.3);
}
@keyframes slideUp {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}
.modal-title { font-size: 18px; font-weight: 700; margin-bottom: 6px; }
.modal-sub { font-size: 13px; color: rgba(0,212,255,0.6); margin-bottom: 20px; }
.modal-actions { display: flex; gap: 10px; margin-top: 20px; }
.modal-actions .btn { flex: 1; }

.input-group { margin-bottom: 14px; }
.input-group label { display: block; font-size: 12px; color: rgba(255,255,255,0.5); margin-bottom: 6px; font-weight: 500; }
.input {
  width: 100%;
  padding: 12px 14px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(0,212,255,0.15);
  border-radius: 8px;
  color: #fff;
  font-size: 14px;
  outline: none;
  font-family: inherit;
  transition: border-color 0.2s;
}
.input:focus { border-color: rgba(0,212,255,0.6); }
select.input {
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%239ca3af' viewBox='0 0 16 16'%3E%3Cpath d='M8 11L3 6h10z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 14px center;
  padding-right: 36px;
}

.btn-primary {
  padding: 12px;
  background: linear-gradient(135deg, #00d4ff, #7c4dff);
  border: none;
  border-radius: 8px;
  color: #000;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.2s;
}
.btn-secondary {
  padding: 12px;
  background: transparent;
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 8px;
  color: rgba(255,255,255,0.7);
  font-size: 14px;
  cursor: pointer;
  font-family: inherit;
}
.btn-sm { font-size: 12px; padding: 6px 14px; }
</style>
