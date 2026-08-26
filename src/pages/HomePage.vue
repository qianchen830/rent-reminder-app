<script setup>
import { ref, computed, onMounted } from 'vue'
import { getStats, getBills, getContracts, payBill, getProperties } from '../store.js'

const emit = defineEmits(['change-tab'])

const stats = ref({totalPending: 0, totalOverdue: 0, pendingCount: 0, overdueCount: 0, upcomingCount: 0, activeCount: 0, dueThisWeek: 0, totalDeposit: 0})
const bills = ref([])
const contracts = ref([])
const properties = ref([])
const showPayModal = ref(false)
const selectedBill = ref(null)
const loading = ref(true)

onMounted(async () => {
  try {
    [stats.value, bills.value, contracts.value, properties.value] = await Promise.all([
      getStats(), getBills(), getContracts(), getProperties()
    ])
  } catch(e) {
    console.error(e)
  } finally {
    loading.value = false
  }
})

async function confirmPay() {
  if (!selectedBill.value) return
  try {
    await payBill(selectedBill.value.id)
    showPayModal.value = false
    selectedBill.value = null
    [stats.value, bills.value] = await Promise.all([getStats(), getBills()])
  } catch(e) {
    console.error(e)
  }
}

const sortedBills = computed(() => {
  return [...bills.value]
    .filter(b => b.status === 'pending')
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .slice(0, 5)
})

function openPay(bill) {
  selectedBill.value = bill
  showPayModal.value = true
}

function formatDate(d) {
  if (!d) return ''
  return d.slice(5).replace('-', '月') + '日'
}

function daysUntil(due) {
  if (!due) return 0
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const dueDate = new Date(due)
  return Math.round((dueDate - now) / 86400000)
}

function dueLabel(due) {
  const days = daysUntil(due)
  if (days < 0) return { text: `已逾期${Math.abs(days)}天`, cls: 'badge-danger' }
  if (days === 0) return { text: '今日到期', cls: 'badge-warning' }
  if (days <= 7) return { text: `${days}天后到期`, cls: 'badge-info' }
  return { text: formatDate(due), cls: 'badge-info' }
}

function formatAmount(n) {
  return n ? n.toLocaleString() : '0'
}

const activeContracts = computed(() => contracts.value.filter(c => c.status === 'active').length)
const hasOverdue = computed(() => stats.value.overdueCount > 0)
const hasUrgent = computed(() => sortedBills.value.some(b => daysUntil(b.dueDate) <= 3))
</script>

<template>
  <div>
    <!-- Header -->
    <div class="page-header">
      <div>
        <div class="page-title">收租提醒</div>
        <div class="header-sub">
          <span class="live-indicator">
            <span class="pulse-dot" :style="{ background: hasOverdue ? 'var(--danger)' : 'var(--success)' }"></span>
            {{ hasOverdue ? '⚠️ 有逾期账单' : '✓ 所有账单正常' }}
          </span>
        </div>
      </div>
      <div class="header-icon">🏠</div>
    </div>

    <!-- Skeleton loading -->
    <template v-if="loading">
      <div class="stat-grid">
        <div v-for="i in 3" :key="i" class="stat-card">
          <div class="skeleton" style="height:28px;width:70%;margin:0 auto 8px;border-radius:8px"></div>
          <div class="skeleton" style="height:12px;width:50%;margin:0 auto;border-radius:6px"></div>
        </div>
      </div>
    </template>

    <!-- Stats Grid -->
    <template v-else>
      <div class="stat-grid">
        <div class="stat-card cyan">
          <div class="stat-value">¥{{ formatAmount(stats.totalPending) }}</div>
          <div class="stat-label">待收总额</div>
          <div class="stat-trend trend-up">↑ 本月应收</div>
        </div>
        <div class="stat-card green">
          <div class="stat-value default">{{ stats.pendingCount }}</div>
          <div class="stat-label">待收笔数</div>
          <div class="stat-sub">共 {{ bills.length }} 条账单</div>
        </div>
        <div class="stat-card" :class="hasOverdue ? 'danger' : 'green'">
          <div class="stat-value">{{ stats.overdueCount }}</div>
          <div class="stat-label">逾期笔数</div>
          <div class="stat-trend" :class="hasOverdue ? 'trend-danger' : 'trend-success'">
            {{ hasOverdue ? '需跟进' : '✓ 无逾期' }}
          </div>
        </div>
      </div>

      <!-- Overview Bar -->
      <div class="overview-card">
        <div class="overview-item">
          <span class="overview-icon">📈</span>
          <div>
            <div class="overview-val">{{ activeContracts }}</div>
            <div class="overview-label">在租合同</div>
          </div>
        </div>
        <div class="overview-sep"></div>
        <div class="overview-item">
          <span class="overview-icon">🏢</span>
          <div>
            <div class="overview-val">{{ properties.length }}</div>
            <div class="overview-label">房源总数</div>
          </div>
        </div>
        <div class="overview-sep"></div>
        <div class="overview-item">
          <span class="overview-icon">💰</span>
          <div>
            <div class="overview-val" :style="{ color: stats.totalOverdue > 0 ? 'var(--danger)' : 'var(--success)' }">
              ¥{{ formatAmount(stats.totalOverdue) }}
            </div>
            <div class="overview-label">逾期金额</div>
          </div>
        </div>
      </div>
    </template>

    <!-- Urgent Alert Banner -->
    <template v-if="!loading && hasUrgent">
      <div class="urgent-banner" @click="emit('change-tab')">
        <div class="urgent-left">
          <span class="urgent-icon">🚨</span>
          <div>
            <div class="urgent-title">紧急提醒</div>
            <div class="urgent-sub">有 {{ sortedBills.filter(b => daysUntil(b.dueDate) <= 3).length }} 笔账单即将到期，请及时跟进</div>
          </div>
        </div>
        <span class="urgent-arrow">›</span>
      </div>
    </template>

    <!-- Bills section -->
    <div class="section-title">📅 待办账单</div>

    <template v-if="loading">
      <div v-for="i in 3" :key="i" class="bill-card skeleton-card">
        <div class="skeleton" style="height:16px;width:45%;margin-bottom:8px;border-radius:6px"></div>
        <div class="skeleton" style="height:12px;width:65%;border-radius:6px"></div>
      </div>
    </template>

    <template v-else-if="sortedBills.length === 0">
      <div class="empty">
        <div class="empty-icon">🎉</div>
        <div class="empty-text">太棒了！暂无待办账单</div>
        <div class="empty-sub">所有账单均已结清</div>
      </div>
    </template>

    <template v-else>
      <div
        v-for="(bill, idx) in sortedBills"
        :key="bill.id"
        class="bill-card"
        :class="{ 'bill-overdue': daysUntil(bill.dueDate) < 0, 'bill-urgent': daysUntil(bill.dueDate) >= 0 && daysUntil(bill.dueDate) <= 3 }"
        :style="{ animationDelay: idx * 60 + 'ms' }"
        @click="openPay(bill)"
      >
        <!-- Left: avatar + info -->
        <div class="bill-left">
          <div class="bill-avatar">{{ bill.tenantName[0] }}</div>
          <div class="bill-info">
            <div class="bill-top">
              <span class="bill-name">{{ bill.tenantName }}</span>
              <span class="bill-type-tag" :class="bill.type === 'deposit' ? 'tag-purple' : ''">
                {{ bill.type === 'deposit' ? '质保金' : '租金' }}
              </span>
            </div>
            <div class="bill-property">{{ bill.propertyName }}</div>
            <div class="bill-due" :class="dueLabel(bill.dueDate).cls.replace('badge-', 'due-')">
              <span class="bill-due-dot" :class="dueLabel(bill.dueDate).cls.replace('badge-', 'dot-')"></span>
              {{ dueLabel(bill.dueDate).text }}
            </div>
          </div>
        </div>
        <!-- Right: amount + action -->
        <div class="bill-right">
          <div class="bill-amount">¥{{ formatAmount(bill.amount) }}</div>
          <div class="bill-action">
            <span class="pay-btn">收款 ✓</span>
          </div>
        </div>
      </div>

      <!-- View all -->
      <button class="btn btn-secondary btn-view-all" @click="emit('change-tab')">
        <span>查看全部 {{ bills.filter(b => b.status === 'pending').length }} 条账单</span>
        <span class="arrow">→</span>
      </button>
    </template>

    <!-- Payment modal -->
    <div v-if="showPayModal" class="modal-overlay" @click.self="showPayModal=false">
      <div class="modal-sheet">
        <div class="modal-title">💰 确认收款</div>
        <div class="modal-subtitle">请确认以下账单已完成付款</div>

        <div v-if="selectedBill" class="pay-detail-card">
          <div class="pay-detail-row">
            <span class="pay-detail-label">租客</span>
            <span class="pay-detail-value">{{ selectedBill.tenantName }}</span>
          </div>
          <div class="pay-detail-row">
            <span class="pay-detail-label">房源</span>
            <span class="pay-detail-value text-muted">{{ selectedBill.propertyName }}</span>
          </div>
          <div class="pay-detail-row">
            <span class="pay-detail-label">类型</span>
            <span class="bill-type-tag" :class="selectedBill.type === 'deposit' ? 'tag-purple' : ''" style="font-size:11px">
              {{ selectedBill.type === 'deposit' ? '质保金' : '租金' }}
            </span>
          </div>
          <div class="pay-detail-row">
            <span class="pay-detail-label">到期日</span>
            <span class="pay-detail-value">{{ selectedBill.dueDate }}</span>
          </div>
          <div class="pay-detail-amount">
            <span class="pay-amount-label">收款金额</span>
            <span class="pay-amount-val">¥{{ formatAmount(selectedBill.amount) }}</span>
          </div>
        </div>

        <div class="modal-actions">
          <button class="btn btn-secondary" @click="showPayModal=false">取消</button>
          <button class="btn btn-primary" @click="confirmPay">
            <span>✓ 确认收款</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.header-sub {
  margin-top: 4px;
}
.live-indicator {
  font-size: 11px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 5px;
}
.header-icon {
  font-size: 32px;
  filter: drop-shadow(0 0 12px rgba(0,212,255,0.4));
}

/* Stat trend */
.stat-trend {
  font-size: 10px;
  font-weight: 700;
  margin-top: 4px;
  letter-spacing: 0.3px;
}
.stat-trend.trend-up { color: var(--accent); }
.stat-trend.trend-success { color: var(--success); }
.stat-trend.trend-danger { color: var(--danger); }
.stat-sub { font-size: 10px; color: var(--text-muted); margin-top: 4px; }

/* Overview bar */
.overview-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 14px 16px;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 0;
  box-shadow: var(--shadow-card);
}
.overview-item {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 10px;
  justify-content: center;
}
.overview-icon { font-size: 20px; }
.overview-val { font-size: 18px; font-weight: 800; color: var(--text-primary); line-height: 1; }
.overview-label { font-size: 10px; color: var(--text-muted); font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 1px; }
.overview-sep {
  width: 1px;
  height: 32px;
  background: var(--border);
  flex-shrink: 0;
}

/* Urgent banner */
.urgent-banner {
  background: linear-gradient(135deg, rgba(255,69,96,0.12), rgba(245,158,11,0.08));
  border: 1px solid rgba(255,69,96,0.25);
  border-radius: var(--radius-lg);
  padding: 14px 16px;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  transition: all 0.2s;
}
.urgent-banner:hover {
  background: linear-gradient(135deg, rgba(255,69,96,0.18), rgba(245,158,11,0.12));
  border-color: rgba(255,69,96,0.4);
  transform: translateY(-1px);
}
.urgent-left { display: flex; align-items: center; gap: 12px; }
.urgent-icon { font-size: 22px; }
.urgent-title { font-size: 14px; font-weight: 700; color: var(--danger); margin-bottom: 2px; }
.urgent-sub { font-size: 11px; color: var(--text-muted); }
.urgent-arrow { font-size: 22px; color: var(--danger); font-weight: 300; }

/* Bill cards */
@keyframes slideInUp {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}

.bill-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 16px;
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  transition: all 0.2s var(--ease-out);
  box-shadow: var(--shadow-card);
  animation: slideInUp 0.35s var(--ease-out) both;
}

.bill-card:hover {
  background: var(--bg-card-hover);
  border-color: var(--border-accent);
  transform: translateY(-1px);
  box-shadow: var(--shadow-card-hover);
}

.bill-card:active { transform: translateY(0); }

.bill-card.bill-overdue {
  border-color: rgba(255,69,96,0.2);
  background: rgba(255,69,96,0.03);
}
.bill-card.bill-overdue:hover {
  background: rgba(255,69,96,0.07);
  border-color: rgba(255,69,96,0.4);
}

.bill-card.bill-urgent {
  border-color: rgba(245,158,11,0.2);
  background: rgba(245,158,11,0.03);
}
.bill-card.bill-urgent:hover {
  background: rgba(245,158,11,0.07);
  border-color: rgba(245,158,11,0.4);
}

.bill-left { display: flex; align-items: center; gap: 12px; flex: 1; min-width: 0; }

.bill-avatar {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--accent), var(--accent-2));
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: 800;
  color: #020714;
  flex-shrink: 0;
  box-shadow: 0 2px 12px rgba(0,212,255,0.3);
}

.bill-info { flex: 1; min-width: 0; }
.bill-top { display: flex; align-items: center; gap: 6px; margin-bottom: 2px; }
.bill-name { font-size: 15px; font-weight: 700; color: var(--text-primary); }
.bill-property { font-size: 12px; color: var(--text-muted); margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.bill-due {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  font-weight: 700;
}
.bill-due-dot {
  width: 5px; height: 5px;
  border-radius: 50%;
  flex-shrink: 0;
}
.due-danger { color: var(--danger); }
.due-danger.dot-danger { background: var(--danger); }
.due-warning { color: var(--warning); }
.due-warning.dot-warning { background: var(--warning); }
.due-info { color: var(--accent); }
.due-info.dot-info { background: var(--accent); }

.bill-right { text-align: right; flex-shrink: 0; margin-left: 12px; }
.bill-amount { font-size: 18px; font-weight: 800; color: var(--accent); letter-spacing: -0.3px; }
.bill-action { margin-top: 4px; }
.pay-btn {
  font-size: 11px;
  font-weight: 700;
  color: var(--accent);
  background: var(--accent-dim);
  padding: 3px 10px;
  border-radius: var(--radius-full);
  border: 1px solid rgba(0,212,255,0.15);
}

.bill-type-tag {
  font-size: 10px;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: var(--radius-xs);
  background: var(--accent-dim);
  color: var(--accent);
  border: 1px solid rgba(0,212,255,0.12);
}

/* View all */
.btn-view-all {
  margin-top: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
}
.arrow { transition: transform 0.2s; }
.btn-view-all:hover .arrow { transform: translateX(4px); }

/* Skeleton cards */
.skeleton-card {
  animation: none;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 16px;
  margin-bottom: 10px;
}

/* Pay detail */
.pay-detail-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  overflow: hidden;
}
.pay-detail-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 13px 18px;
  border-bottom: 1px solid var(--border-subtle);
}
.pay-detail-row:last-child { border-bottom: none; }
.pay-detail-label { font-size: 12px; color: var(--text-muted); font-weight: 600; }
.pay-detail-value { font-size: 13px; font-weight: 700; color: var(--text-primary); }
.pay-detail-amount {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 18px;
  background: rgba(0,212,255,0.04);
}
.pay-amount-label { font-size: 13px; font-weight: 700; color: var(--text-secondary); }
.pay-amount-val { font-size: 26px; font-weight: 800; color: var(--accent); letter-spacing: -0.5px; }

.empty-sub { font-size: 12px; color: var(--text-faint); margin-top: 4px; }
</style>
