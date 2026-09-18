<script setup>
import { ref, computed, onMounted } from 'vue'
import { getBills, getContracts, getDeposits, getProperties } from '../store.js'

const bills = ref([])
const contracts = ref([])
const deposits = ref([])
const properties = ref([])
const loading = ref(true)
const selectedYear = ref(new Date().getFullYear().toString())

onMounted(async () => {
  try {
    const [b, c, d, p] = await Promise.all([getBills(), getContracts(), getDeposits(), getProperties()])
    bills.value = b
    contracts.value = c
    deposits.value = d
    properties.value = p
  } catch(e) { console.error(e) }
  finally { loading.value = false }
})

const yearOptions = [
  { value: new Date().getFullYear().toString(), label: new Date().getFullYear() + '年' },
  { value: (new Date().getFullYear() - 1).toString(), label: (new Date().getFullYear() - 1) + '年' },
]

// ── 当年已付账单（租金）─────────────────
const yearPaidBills = computed(() => {
  const y = selectedYear.value
  return bills.value.filter(b =>
    b.type === 'rent' &&
    (b.status === 'paid' || (b.receivedAmount || 0) > 0) &&
    (b.paidAt || b.dueDate).slice(0, 4) === y
  )
})

// ── 当年待付账单（租金）─────────────────
const yearPendingBills = computed(() => {
  const y = selectedYear.value
  return bills.value.filter(b =>
    b.dueDate.slice(0, 4) === y &&
    b.type === 'rent' &&
    b.status === 'pending'
  )
})

// ── 收款概览 ────────────────────────────
const receivable = computed(() => yearPendingBills.value.reduce((s, b) => s + b.amount, 0))
const received = computed(() => yearPaidBills.value.reduce((s, b) => s + (b.receivedAmount || 0), 0))
const today = new Date().toISOString().slice(0, 10)
const overdue = computed(() => yearPendingBills.value.filter(b => b.dueDate < today).reduce((s, b) => s + b.amount, 0))
const collectionRate = computed(() => {
  const total = receivable.value + received.value
  return total > 0 ? Math.round(received.value / total * 100) : 0
})
const totalBills = computed(() => yearPaidBills.value.length + yearPendingBills.value.length)
const paidBills = computed(() => yearPaidBills.value.length)

// ── 出租率 ──────────────────────────────
const activeContracts = computed(() => contracts.value.filter(c => c.status === 'active'))
const rentedPropertyIds = computed(() => new Set(activeContracts.value.map(c => c.propertyId)))
const rentedRate = computed(() => {
  const total = Math.max(properties.value.length, rentedPropertyIds.value.size, 1)
  return Math.round(rentedPropertyIds.value.size / total * 100)
})

// ── 月度趋势 ────────────────────────────
const monthlyData = computed(() => {
  const y = selectedYear.value
  const result = []
  for (let i = 1; i <= 12; i++) {
    const m = i.toString().padStart(2, '0')
    const mBills = bills.value.filter(b => b.dueDate.slice(0, 7) === y + '-' + m && b.type === 'rent')
    const mPaid = mBills.filter(b => b.status === 'paid' && b.paidAt && b.paidAt.slice(0, 7) === y + '-' + m)
    const mPending = mBills.filter(b => b.status === 'pending')
    result.push({
      label: m + '月',
      received: mPaid.reduce((s, b) => s + (b.receivedAmount || 0), 0),
      pending: mPending.length,
      overdue: mPending.filter(b => b.dueDate < today).length,
    })
  }
  return result
})

// ── 质保金概览 ──────────────────────────
const depositHeld = computed(() => deposits.value.filter(d => d.status === 'held').reduce((s, d) => s + d.amount, 0))

// ── 各房源收益明细 ──────────────────────
const propertyIncome = computed(() => {
  const map = {}
  const y = selectedYear.value
  for (const b of bills.value) {
    if (b.type !== 'rent' || b.status !== 'paid') continue
    if (b.dueDate.slice(0, 4) !== y) continue
    if (!map[b.propertyId]) map[b.propertyId] = { name: b.propertyName, received: 0 }
    map[b.propertyId].received += b.receivedAmount || 0
  }
  return map
})
</script>

<template>
  <div>
    <!-- Header -->
    <div class="page-header">
      <div>
        <div class="page-title">📊 经营看板</div>
        <div class="text-muted text-xs mt-1">{{ selectedYear }}年数据</div>
      </div>
      <div class="header-icon">📈</div>
    </div>

    <!-- 年份筛选 -->
    <div class="filter-bar">
      <select class="filter-select" v-model="selectedYear">
        <option v-for="y in yearOptions" :key="y.value" :value="y.value">{{ y.label }}</option>
      </select>
    </div>

    <!-- Loading -->
    <template v-if="loading">
      <div class="board-card">
        <div class="skeleton" style="height:60px;margin-bottom:12px;border-radius:12px"></div>
        <div class="skeleton" style="height:40px;border-radius:12px"></div>
      </div>
    </template>

    <template v-else>
      <!-- 收款概览 -->
      <div class="board-card">
        <div class="board-card-title">💰 租金收款概览</div>
        <div class="stat-row">
          <div class="stat-cell">
            <div class="stat-num" style="color:var(--accent)">¥{{ receivable.toLocaleString() }}</div>
            <div class="stat-lbl">应收金额</div>
          </div>
          <div class="stat-sep"></div>
          <div class="stat-cell">
            <div class="stat-num" style="color:var(--success)">¥{{ received.toLocaleString() }}</div>
            <div class="stat-lbl">已收金额</div>
          </div>
          <div class="stat-sep"></div>
          <div class="stat-cell">
            <div class="stat-num" style="color:var(--danger)">¥{{ overdue.toLocaleString() }}</div>
            <div class="stat-lbl">逾期金额</div>
          </div>
        </div>
        <div class="progress-bar">
          <div class="progress-fill success" :style="{width: collectionRate + '%'}"></div>
        </div>
        <div class="progress-text">
          <span>收款率 {{ collectionRate }}%</span>
          <span>{{ paidBills }}/{{ totalBills }}笔</span>
        </div>
      </div>

      <!-- 房源出租率 -->
      <div class="board-card">
        <div class="board-card-title">🏠 房源出租率</div>
        <div class="rent-rate-row">
          <div class="rent-rate-big">{{ rentedRate }}%</div>
          <div class="rent-rate-sub">
            <span class="rent-badge">{{ rentedPropertyIds.size }}套出租中</span>
            <span class="rent-total">/ {{ properties.length }}套房源</span>
          </div>
        </div>
        <div class="progress-bar">
          <div class="progress-fill accent" :style="{width: rentedRate + '%'}"></div>
        </div>
        <div class="contract-summary">共 {{ activeContracts.length }} 份进行中合同</div>
      </div>

      <!-- 月度趋势 -->
      <div class="board-card">
        <div class="board-card-title">📅 月度趋势</div>
        <div class="monthly-grid">
          <div v-for="m in monthlyData" :key="m.label" class="monthly-item"
            :class="{'monthly-has-overdue': m.overdue > 0}">
            <div class="monthly-label">{{ m.label }}</div>
            <div class="monthly-rcv">¥{{ (m.received / 1000).toFixed(0) }}k</div>
            <div class="monthly-dot" :class="m.pending > 0 ? 'dot-warn' : m.received > 0 ? 'dot-ok' : 'dot-empty'"></div>
          </div>
        </div>
        <div class="monthly-legend">
          <span class="leg-item"><span class="dot-ok">●</span> 已收</span>
          <span class="leg-item"><span class="dot-warn">●</span> 有待付</span>
          <span class="leg-item"><span class="dot-empty">●</span> 无数据</span>
        </div>
      </div>

      <!-- 质保金概览 -->
      <div class="board-card">
        <div class="board-card-title">🔐 质保金概览</div>
        <div class="deposit-single">
          <div class="dep-num" style="color:var(--warning)">¥{{ depositHeld.toLocaleString() }}</div>
          <div class="dep-lbl">持有中</div>
        </div>
      </div>

      <!-- 各房源收益明细 -->
      <div class="board-card">
        <div class="board-card-title">🏢 各房源收益明细（当年已收租金）</div>
        <div v-if="Object.keys(propertyIncome).length === 0" class="empty-mini">暂无数据</div>
        <div v-else class="prop-list">
          <div v-for="(info, pid) in propertyIncome" :key="pid" class="prop-row">
            <div class="prop-left">
              <div class="prop-name">{{ info.name }}</div>
              <div class="prop-meta">当年已收租金</div>
            </div>
            <div class="prop-right">
              <div class="prop-rent">¥{{ info.received.toLocaleString() }}</div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.filter-bar { display: flex; gap: 8px; margin-bottom: 16px; }
.filter-select {
  flex: 1; padding: 8px 12px; border-radius: var(--radius-md);
  border: 1px solid var(--border); background: var(--bg-card);
  color: var(--text-primary); font-size: 13px; font-weight: 600;
  font-family: var(--font-sans); cursor: pointer;
}
.filter-select:focus { outline: none; border-color: var(--border-accent); }

.board-card {
  background: var(--bg-card); border: 1px solid var(--border);
  border-radius: var(--radius-lg); padding: 18px; margin-bottom: 14px;
  box-shadow: var(--shadow-card);
}
.board-card-title {
  font-size: 13px; font-weight: 700; color: var(--text-muted);
  margin-bottom: 14px; display: flex; align-items: center; gap: 6px;
}

.stat-row { display: flex; align-items: center; gap: 0; margin-bottom: 14px; }
.stat-cell { flex: 1; text-align: center; }
.stat-num { font-size: 20px; font-weight: 800; letter-spacing: -0.5px; line-height: 1; }
.stat-lbl { font-size: 11px; color: var(--text-muted); font-weight: 600; margin-top: 4px; }
.stat-sep { width: 1px; height: 36px; background: var(--border); flex-shrink: 0; }

.progress-bar { height: 6px; background: var(--border); border-radius: var(--radius-full); overflow: hidden; }
.progress-fill { height: 100%; border-radius: var(--radius-full); transition: width 0.4s var(--ease-out); }
.progress-fill.success { background: var(--success); }
.progress-fill.accent { background: var(--accent); }
.progress-text {
  display: flex; justify-content: space-between; font-size: 11px;
  color: var(--text-muted); font-weight: 600; margin-top: 6px;
}

.rent-rate-row { display: flex; align-items: baseline; gap: 10px; margin-bottom: 10px; }
.rent-rate-big { font-size: 36px; font-weight: 800; color: var(--accent); letter-spacing: -1px; }
.rent-rate-sub { font-size: 12px; color: var(--text-muted); }
.rent-badge { background: var(--accent-dim); color: var(--accent); padding: 2px 8px; border-radius: var(--radius-full); font-weight: 700; }
.rent-total { margin-left: 4px; }
.contract-summary { font-size: 11px; color: var(--text-muted); margin-top: 8px; font-weight: 600; }

.monthly-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; margin-bottom: 10px; }
.monthly-item {
  background: var(--bg-elevated); border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm); padding: 8px 6px; text-align: center;
  transition: all 0.15s;
}
.monthly-item.monthly-has-overdue { border-color: rgba(255,69,96,0.3); }
.monthly-label { font-size: 10px; color: var(--text-muted); font-weight: 600; margin-bottom: 2px; }
.monthly-rcv { font-size: 11px; font-weight: 800; color: var(--text-primary); }
.monthly-dot { width: 6px; height: 6px; border-radius: 50%; margin: 4px auto 0; }
.dot-ok { background: var(--success); }
.dot-warn { background: var(--warning); }
.dot-empty { background: var(--border); }
.monthly-legend { display: flex; gap: 12px; font-size: 10px; color: var(--text-faint); font-weight: 600; }
.leg-item { display: flex; align-items: center; gap: 4px; }

.deposit-single { display: flex; align-items: center; gap: 12px; }
.dep-num { font-size: 28px; font-weight: 800; color: var(--warning); letter-spacing: -0.5px; }
.dep-lbl { font-size: 13px; color: var(--text-muted); font-weight: 600; }

.prop-list { }
.prop-row {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 0; border-bottom: 1px solid var(--border-subtle);
}
.prop-row:last-child { border-bottom: none; }
.prop-left { flex: 1; min-width: 0; }
.prop-name { font-size: 13px; font-weight: 700; color: var(--text-primary); margin-bottom: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.prop-meta { font-size: 11px; color: var(--text-muted); }
.prop-right { text-align: right; flex-shrink: 0; margin-left: 12px; }
.prop-rent { font-size: 16px; font-weight: 800; color: var(--success); }
.empty-mini { text-align: center; font-size: 12px; color: var(--text-faint); padding: 20px 0; }

.skeleton {
  background: var(--skeleton-bg, rgba(255,255,255,0.06));
  border-radius: 8px;
}
</style>
