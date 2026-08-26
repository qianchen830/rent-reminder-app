<script setup>
const emit = defineEmits(['change-tab', 'logout', 'open-admin'])
import { ref, onMounted, computed } from 'vue'
import { getStats, getBills, getContracts, getDeposits, getProperties, payBill } from '../store.js'

const stats = ref({})
const bills = ref([])
const contracts = ref([])
const deposits = ref([])
const properties = ref([])
const showBillsModal = ref(false)
const toast = ref('')
const loading = ref(true)

onMounted(async () => {
  try {
    [stats.value, bills.value, contracts.value, deposits.value, properties.value] = await Promise.all([
      getStats(), getBills(), getContracts(), getDeposits(), getProperties()
    ])
  } catch(e) {
    console.error(e)
  } finally {
    loading.value = false
  }
})

async function refresh() {
  try {
    [stats.value, bills.value, contracts.value, deposits.value, properties.value] = await Promise.all([
      getStats(), getBills(), getContracts(), getDeposits(), getProperties()
    ])
  } catch(e) { console.error(e) }
}

const pendingBills = ref([])

function openBills() {
  pendingBills.value = [...bills.value].sort((a, b) => a.dueDate.localeCompare(b.dueDate))
  showBillsModal.value = true
}

async function payBillById(id) {
  try {
    await payBill(id)
    const [newBills, newStats] = await Promise.all([getBills(), getStats()])
    bills.value = newBills
    stats.value = newStats
    pendingBills.value = [...newBills].sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    showToast('已标记为已付')
  } catch(e) {
    console.error(e)
    showToast('操作失败')
  }
}



function showToast(msg) {
  toast.value = msg
  setTimeout(() => { toast.value = '' }, 2000)
}

const activeCount = computed(() => contracts.value.filter(c => c.status === 'active').length)
const pendingCount = computed(() => bills.value.filter(b => b.status === 'pending').length)
</script>

<template>
  <div>
    <!-- Header -->
    <div class="page-header">
      <div>
        <div class="page-title">👤 我的</div>
        <div class="text-muted text-xs mt-1">资产总览与数据管理</div>
      </div>
    </div>

    <!-- Profile hero card -->
    <div class="profile-hero">
      <div class="hero-left">
        <div class="hero-avatar">🏠</div>
        <div class="hero-info">
          <div class="hero-title">资产管理员</div>
          <div class="hero-sub">收租提醒 PRO</div>
        </div>
      </div>
      <div class="hero-badge">
        <span class="live-indicator">
          <span class="pulse-dot"></span>
          在线
        </span>
      </div>
    </div>

    <!-- Stats grid -->
    <div class="profile-stats-grid">
      <div class="profile-stat-card">
        <div class="profile-stat-icon">📈</div>
        <div class="profile-stat-val">{{ activeCount }}</div>
        <div class="profile-stat-label">在租合同</div>
      </div>
      <div class="profile-stat-card">
        <div class="profile-stat-icon">🏢</div>
        <div class="profile-stat-val">{{ properties.length }}</div>
        <div class="profile-stat-label">房源数</div>
      </div>
      <div class="profile-stat-card warning">
        <div class="profile-stat-icon">💰</div>
        <div class="profile-stat-val" style="color:var(--warning)">¥{{ (stats.totalPending || 0).toLocaleString() }}</div>
        <div class="profile-stat-label">待收总额</div>
      </div>
      <div class="profile-stat-card danger">
        <div class="profile-stat-icon">⚠️</div>
        <div class="profile-stat-val" style="color:var(--danger)">{{ stats.overdueCount || 0 }}</div>
        <div class="profile-stat-label">逾期笔数</div>
      </div>
    </div>

    <!-- Bills entry -->
    <div class="section-title" style="margin-top:24px">💰 全部账单</div>

    <div class="bills-entry-card" @click="openBills">
      <div class="bills-entry-left">
        <span class="bills-entry-icon">📋</span>
        <div>
          <div class="bills-entry-title">查看所有账单</div>
          <div class="bills-entry-sub">共 {{ bills.length }} 条记录 · {{ pendingCount }} 条待付</div>
        </div>
      </div>
      <span class="bills-entry-arrow">→</span>
    </div>

    <!-- System entry -->
    <div class="system-card">
      <div class="system-row" @click="emit('open-admin')">
        <span class="system-icon">⚙️</span>
        <span class="system-label">系统管理</span>
        <span class="system-arrow">→</span>
      </div>
      <div class="system-divider"></div>
      <div class="system-info">
        <span>收租提醒</span>
        <span class="text-muted">v2.0 PRO</span>
        <span class="text-muted">·</span>
        <span class="text-muted">SQLite</span>
      </div>
    </div>

    <!-- Logout button -->
    <button class="btn btn-danger" style="margin-top:8px" @click="emit('logout')">
      <span>🚪</span> 退出登录
    </button>

    <!-- Bills modal -->
    <div v-if="showBillsModal" class="modal-overlay" @click.self="showBillsModal=false">
      <div class="modal-sheet" style="max-height:90vh;overflow-y:auto">
        <div class="modal-title">💰 全部账单</div>

        <div v-if="pendingBills.length === 0" class="empty">
          <div class="empty-icon">📭</div>
          <div class="empty-text">暂无账单</div>
        </div>

        <div
          v-for="bill in pendingBills"
          :key="bill.id"
          class="bills-modal-item"
        >
          <div class="bills-modal-left">
            <div class="bills-modal-name-row">
              <span class="bills-modal-name">{{ bill.tenantName }}</span>
              <span class="tag" :class="bill.type === 'deposit' ? 'tag-purple' : ''">
                {{ bill.type === 'deposit' ? '质保金' : '租金' }}
              </span>
            </div>
            <div class="bills-modal-meta">{{ bill.dueDate }} · {{ bill.propertyName }}</div>
          </div>
          <div class="bills-modal-right">
            <div class="bills-modal-amount">¥{{ bill.amount.toLocaleString() }}</div>
            <span
              class="badge"
              :class="bill.status==='paid' ? 'badge-success' : 'badge-warning'"
              style="cursor:pointer"
              @click="bill.status!=='paid' && payBillById(bill.id)"
            >{{ bill.status === 'paid' ? '已付 ✓' : '待付 ⟶' }}</span>
          </div>
        </div>

        <button class="btn btn-secondary" style="margin-top:16px" @click="showBillsModal=false">关闭</button>
      </div>
    </div>

    <div v-if="toast" class="toast">{{ toast }}</div>
  </div>
</template>

<style scoped>
/* Profile hero */
.profile-hero {
  background: linear-gradient(135deg, rgba(0,212,255,0.08), rgba(124,77,255,0.06));
  border: 1px solid rgba(0,212,255,0.15);
  border-radius: var(--radius-xl);
  padding: 20px;
  margin-bottom: 18px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.hero-left { display: flex; align-items: center; gap: 14px; }
.hero-avatar {
  width: 52px; height: 52px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--accent), var(--accent-2));
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  box-shadow: 0 4px 16px rgba(0,212,255,0.3);
}
.hero-title { font-size: 18px; font-weight: 800; margin-bottom: 3px; }
.hero-sub { font-size: 12px; color: var(--text-muted); font-weight: 500; }

/* Profile stats */
.profile-stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
  margin-bottom: 24px;
}
.profile-stat-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 16px;
  text-align: center;
  transition: all 0.2s;
  box-shadow: var(--shadow-card);
}
.profile-stat-card:hover { border-color: var(--border-accent); transform: translateY(-1px); }
.profile-stat-icon { font-size: 22px; margin-bottom: 8px; }
.profile-stat-val { font-size: 24px; font-weight: 800; color: var(--accent); letter-spacing: -0.5px; }
.profile-stat-label { font-size: 10px; color: var(--text-muted); font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 4px; }
.profile-stat-card.warning .profile-stat-val { color: var(--warning); }
.profile-stat-card.danger .profile-stat-val { color: var(--danger); }

/* Deposit hero */
.deposit-hero-card {
  background: linear-gradient(135deg, rgba(245,158,11,0.06), rgba(255,69,96,0.04));
  border: 1px solid rgba(245,158,11,0.15);
  border-radius: var(--radius-lg);
  padding: 16px;
  margin-bottom: 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.deposit-left { display: flex; align-items: center; gap: 14px; }
.deposit-icon-wrap {
  width: 50px; height: 50px;
  border-radius: var(--radius-md);
  background: rgba(245,158,11,0.1);
  border: 1px solid rgba(245,158,11,0.15);
  display: flex;
  align-items: center;
  justify-content: center;
}
.deposit-count { font-size: 26px; font-weight: 800; color: var(--warning); letter-spacing: -0.5px; }
.deposit-label { font-size: 11px; color: var(--text-muted); font-weight: 600; }

@keyframes slideInUp {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Deposit cards */
.deposit-skeleton {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 16px;
  margin-bottom: 10px;
}

.deposit-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 16px;
  margin-bottom: 10px;
  transition: all 0.2s;
  box-shadow: var(--shadow-card);
  animation: slideInUp 0.3s var(--ease-out) both;
}
.deposit-card:hover { border-color: var(--border-accent); }

.deposit-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 12px;
}
.deposit-info { flex: 1; }
.deposit-name-row { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
.deposit-name { font-size: 15px; font-weight: 800; }
.deposit-meta { font-size: 12px; color: var(--text-muted); }
.deposit-amount { font-size: 22px; font-weight: 800; color: var(--warning); letter-spacing: -0.5px; }

.deposit-actions { display: flex; gap: 8px; }

/* Bills entry */
.bills-entry-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  transition: all 0.2s;
  margin-bottom: 14px;
}
.bills-entry-card:hover { border-color: var(--border-accent); transform: translateY(-1px); }
.bills-entry-left { display: flex; align-items: center; gap: 12px; }
.bills-entry-icon { font-size: 24px; }
.bills-entry-title { font-size: 15px; font-weight: 700; margin-bottom: 3px; }
.bills-entry-sub { font-size: 12px; color: var(--text-muted); }
.bills-entry-arrow { font-size: 20px; color: var(--text-muted); }

/* System card */
.system-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  overflow: hidden;
  margin-bottom: 14px;
}
.system-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  cursor: pointer;
  transition: background 0.15s;
}
.system-row:hover { background: rgba(255,255,255,0.03); }
.system-icon { font-size: 18px; }
.system-label { flex: 1; font-size: 14px; font-weight: 700; }
.system-arrow { font-size: 18px; color: var(--text-muted); }
.system-divider { height: 1px; background: var(--border); margin: 0; }
.system-info {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  font-size: 12px;
  color: var(--text-faint);
  font-weight: 500;
}

/* Action buttons */
.action-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 8px 6px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  background: transparent;
  font-size: 12px;
  font-weight: 700;
  font-family: var(--font-sans);
  cursor: pointer;
  transition: all 0.15s;
  color: var(--text-secondary);
}
.action-success:hover { background: var(--success-dim); border-color: rgba(0,230,118,0.3); color: var(--success); }
.action-secondary:hover { background: rgba(255,255,255,0.06); border-color: var(--border-accent); color: var(--text-primary); }
.action-danger:hover { background: var(--danger-dim); border-color: rgba(255,69,96,0.3); color: var(--danger); }

/* Bills modal items */
.bills-modal-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 16px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  margin-bottom: 8px;
  transition: all 0.15s;
}
.bills-modal-item:hover { border-color: var(--border-accent); }
.bills-modal-left { flex: 1; }
.bills-modal-name-row { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
.bills-modal-name { font-size: 14px; font-weight: 700; }
.bills-modal-meta { font-size: 12px; color: var(--text-muted); }
.bills-modal-right { text-align: right; flex-shrink: 0; margin-left: 12px; }
.bills-modal-amount { font-size: 16px; font-weight: 800; color: var(--accent); margin-bottom: 4px; }
</style>
