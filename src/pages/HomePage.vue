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
      getStats(),
      getBills(),
      getContracts(),
      getProperties()
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
    // Refresh data
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
  if (days <= 7) return { text: `${days}天后`, cls: 'badge-info' }
  return { text: formatDate(due), cls: 'badge-info' }
}

function formatAmount(n) {
  return n ? n.toLocaleString() : '0'
}
</script>

<template>
  <div>
    <div class="page-header">
      <div>
        <div class="page-title">收租提醒</div>
        <div style="font-size:12px;color:var(--text-muted);margin-top:2px">实时掌控您的租金收入</div>
      </div>
      <div style="font-size:28px">🏠</div>
    </div>

    <!-- 统计卡片 -->
    <div class="stat-grid">
      <div class="stat-card cyan">
        <div class="stat-value">¥{{ formatAmount(stats.totalPending) }}</div>
        <div class="stat-label">待收总额</div>
      </div>
      <div class="stat-card green">
        <div class="stat-value" style="color:var(--text)">{{ stats.pendingCount }}</div>
        <div class="stat-label">待收笔数</div>
      </div>
      <div class="stat-card danger">
        <div class="stat-value">{{ stats.overdueCount }}</div>
        <div class="stat-label">逾期笔数</div>
      </div>
    </div>

    <!-- 快捷统计 -->
    <div class="card" style="margin-bottom:14px">
      <div style="display:flex;justify-content:space-between">
        <div style="text-align:center;flex:1">
          <div style="font-size:18px;font-weight:700;color:var(--success)">{{ contracts.filter(c=>c.status==='active').length }}</div>
          <div style="font-size:11px;color:var(--text-muted)">在租合同</div>
        </div>
        <div style="width:1px;background:var(--border)"></div>
        <div style="text-align:center;flex:1">
          <div style="font-size:18px;font-weight:700;color:var(--text)">{{ properties.length }}</div>
          <div style="font-size:11px;color:var(--text-muted)">房源总数</div>
        </div>
        <div style="width:1px;background:var(--border)"></div>
        <div style="text-align:center;flex:1">
          <div style="font-size:18px;font-weight:700;color:var(--accent)">¥{{ formatAmount(stats.totalOverdue) }}</div>
          <div style="font-size:11px;color:var(--text-muted)">逾期金额</div>
        </div>
      </div>
    </div>

    <!-- 待办账单 -->
    <div class="section-title">📅 待办账单</div>

    <div v-if="loading" class="empty">
      <div class="empty-icon">⏳</div>
      <div class="empty-text">加载中...</div>
    </div>

    <div v-else-if="sortedBills.length === 0" class="empty">
      <div class="empty-icon">🎉</div>
      <div class="empty-text">暂无待办账单</div>
    </div>

    <div
      v-for="bill in sortedBills"
      :key="bill.id"
      class="card"
      style="display:flex;align-items:center;gap:12px;cursor:pointer"
      @click="openPay(bill)"
    >
      <div style="flex:1">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
          <span style="font-size:14px;font-weight:600">{{ bill.tenantName }}</span>
          <span class="tag">{{ bill.type === 'deposit' ? '质保金' : '租金' }}</span>
        </div>
        <div style="font-size:12px;color:var(--text-muted)">{{ bill.propertyName }}</div>
      </div>
      <div style="text-align:right">
        <div style="font-size:17px;font-weight:700;color:var(--accent)">¥{{ formatAmount(bill.amount) }}</div>
        <span class="badge" :class="dueLabel(bill.dueDate).cls">{{ dueLabel(bill.dueDate).text }}</span>
      </div>
    </div>

    <div v-if="sortedBills.length > 0" style="margin-top:4px">
      <button class="btn btn-secondary btn-sm" @click="emit('change-tab')">查看全部账单 →</button>
    </div>

    <!-- 付款确认弹窗 -->
    <div v-if="showPayModal" class="modal-overlay" @click.self="showPayModal=false">
      <div class="modal-sheet">
        <div class="modal-title">💰 确认收款</div>
        <div v-if="selectedBill" class="card">
          <div style="display:flex;justify-content:space-between;margin-bottom:10px">
            <span style="color:var(--text-muted);font-size:13px">租客</span>
            <span style="font-weight:600">{{ selectedBill.tenantName }}</span>
          </div>
          <div style="display:flex;justify-content:space-between;margin-bottom:10px">
            <span style="color:var(--text-muted);font-size:13px">房源</span>
            <span style="font-size:13px">{{ selectedBill.propertyName }}</span>
          </div>
          <div style="display:flex;justify-content:space-between;margin-bottom:10px">
            <span style="color:var(--text-muted);font-size:13px">类型</span>
            <span class="tag">{{ selectedBill.type === 'deposit' ? '质保金' : '租金' }}</span>
          </div>
          <div style="display:flex;justify-content:space-between;margin-bottom:10px">
            <span style="color:var(--text-muted);font-size:13px">到期日</span>
            <span style="font-size:13px">{{ selectedBill.dueDate }}</span>
          </div>
          <div style="display:flex;justify-content:space-between">
            <span style="color:var(--text-muted);font-size:13px">金额</span>
            <span style="font-size:22px;font-weight:700;color:var(--accent)">¥{{ formatAmount(selectedBill.amount) }}</span>
          </div>
        </div>
        <div class="modal-actions">
          <button class="btn btn-secondary" @click="showPayModal=false">取消</button>
          <button class="btn btn-primary" @click="confirmPay">确认收款 ✓</button>
        </div>
      </div>
    </div>
  </div>
</template>
