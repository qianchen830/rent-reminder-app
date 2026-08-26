<script setup>
import { ref, computed, onMounted } from 'vue'
import { getContracts, getDeposits, getBills, addDeposit, updateDeposit, deleteDeposit, convertDeposit, getStats } from '../store.js'

const contracts = ref([])
const deposits = ref([])
const bills = ref([])
const stats = ref({})
const loading = ref(true)
const showModal = ref(false)
const showRentModal = ref(false)
const toast = ref('')
const tab = ref('held')
const convertingDeposit = ref(null) // held | converted | refunded | all

onMounted(async () => {
  try {
    [contracts.value, deposits.value, bills.value, stats.value] = await Promise.all([
      getContracts(), getDeposits(), getBills(), getStats()
    ])
  } catch(e) { console.error(e) }
  finally { loading.value = false }
})

async function refresh() {
  try { [contracts.value, deposits.value] = await Promise.all([getContracts(), getDeposits()]) }
  catch(e) { console.error(e) }
}

const displayed = computed(() => {
  if (tab.value === 'all') return deposits.value
  return deposits.value.filter(d => d.status === tab.value)
})

const depositForm = ref({ contractId: '', amount: '', remark: '' })

function openAdd() {
  depositForm.value = { contractId: '', amount: '', remark: '' }
  showModal.value = true
}

async function save() {
  if (!depositForm.value.contractId) { showToast('请选择合同'); return }
  if (!depositForm.value.amount) { showToast('请输入金额'); return }
  const c = contracts.value.find(c => c.id === depositForm.value.contractId)
  try {
    await addDeposit({
      contractId: depositForm.value.contractId,
      propertyId: c.propertyId,
      propertyName: c.propertyName,
      tenantName: c.tenantName,
      amount: Number(depositForm.value.amount),
      remark: depositForm.value.remark,
    })
    showModal.value = false
    deposits.value = await getDeposits()
    showToast('质保金已添加')
  } catch(e) { console.error(e); showToast('操作失败') }
}

async function releaseToRent(d) {
  convertingDeposit.value = d
  showRentModal.value = true
}

const depositBills = computed(() => {
  if (!convertingDeposit.value) return []
  // Only show bills for this deposit's contract AND contract must be active
  const depositContract = contracts.value.find(c => c.id === convertingDeposit.value.contractId)
  if (!depositContract || depositContract.status !== 'active') return []
  return bills.value
    .filter(b => b.contractId === convertingDeposit.value.contractId && b.type === 'rent' && b.status === 'pending')
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
})

async function confirmConvert(bill) {
  if (!convertingDeposit.value) return
  try {
    await convertDeposit(convertingDeposit.value.id, bill.id)
    ;[deposits.value, bills.value, stats.value] = await Promise.all([getDeposits(), getBills(), getStats()])
    showRentModal.value = false
    convertingDeposit.value = null
    showToast('已转为租金，账单金额已抵扣')
  } catch(e) { console.error(e); showToast('操作失败')
  }
}

async function convertDirect() {
  if (!convertingDeposit.value) return
  try {
    await updateDeposit(convertingDeposit.value.id, { status: 'converted' })
    deposits.value = await getDeposits()
    showRentModal.value = false
    convertingDeposit.value = null
    showToast('已转为租金')
  } catch(e) { console.error(e); showToast('操作失败') }
}

async function refundDeposit(d) {
  if (!confirm(`确认退还「${d.tenantName}」的质保金 ¥${d.amount.toLocaleString()}？`)) return
  try {
    await updateDeposit(d.id, { status: 'refunded' })
    deposits.value = await getDeposits()
    showToast('已标记为已退')
  } catch(e) { console.error(e); showToast('操作失败') }
}

async function delDeposit(d) {
  if (!confirm(`确认删除？`)) return
  try {
    await deleteDeposit(d.id)
    deposits.value = await getDeposits()
    showToast('已删除')
  } catch(e) { console.error(e); showToast('操作失败') }
}

function showToast(msg) {
  toast.value = msg
  setTimeout(() => { toast.value = '' }, 2000)
}

function statusLabel(s) {
  return s === 'held' ? '持有中' : s === 'converted' ? '已转租金' : '已退还'
}
function statusBadge(s) {
  return s === 'held' ? 'badge-warning' : s === 'converted' ? 'badge-info' : 'badge-success'
}
</script>

<template>
  <div>
    <!-- Header -->
    <div class="page-header">
      <div>
        <div class="page-title">🔐 质保金</div>
        <div class="text-muted text-xs mt-1">共 {{ deposits.length }} 笔记录</div>
      </div>
      <button class="btn btn-primary btn-sm" style="width:auto;padding:9px 18px" @click="openAdd">
        <span>＋</span> 添加
      </button>
    </div>

    <!-- Tab filter -->
    <div class="tab-filter">
      <button class="tab-filter-btn" :class="{ active: tab === 'held' }" @click="tab = 'held'">
        <span class="tab-filter-dot" style="background:var(--warning)"></span>
        持有中
        <span class="tab-filter-count">{{ deposits.filter(d => d.status === 'held').length }}</span>
      </button>
      <button class="tab-filter-btn" :class="{ active: tab === 'converted' }" @click="tab = 'converted'">
        <span class="tab-filter-dot" style="background:var(--accent)"></span>
        已转租金
        <span class="tab-filter-count">{{ deposits.filter(d => d.status === 'converted').length }}</span>
      </button>
      <button class="tab-filter-btn" :class="{ active: tab === 'refunded' }" @click="tab = 'refunded'">
        <span class="tab-filter-dot" style="background:var(--success)"></span>
        已退还
        <span class="tab-filter-count">{{ deposits.filter(d => d.status === 'refunded').length }}</span>
      </button>
    </div>

    <!-- Loading -->
    <template v-if="loading">
      <div v-for="i in 3" :key="i" class="deposit-card">
        <div class="skeleton" style="height:16px;width:40%;margin-bottom:10px;border-radius:6px"></div>
        <div class="skeleton" style="height:13px;width:60%;border-radius:6px"></div>
      </div>
    </template>

    <!-- Empty -->
    <div v-else-if="displayed.length === 0" class="empty">
      <div class="empty-icon">🔐</div>
      <div class="empty-text">
        {{ tab === 'held' ? '暂无持有中的质保金' : tab === 'converted' ? '暂无已转租金记录' : tab === 'refunded' ? '暂无已退还记录' : '暂无质保金记录' }}
      </div>
    </div>

    <!-- Deposit list -->
    <div
      v-for="(d, idx) in displayed"
      :key="d.id"
      class="deposit-card"
      :style="{ animationDelay: idx * 50 + 'ms' }"
    >
      <div class="deposit-top">
        <div class="deposit-avatar">{{ d.tenantName[0] }}</div>
        <div class="deposit-info">
          <div class="deposit-name-row">
            <span class="deposit-name">{{ d.tenantName }}</span>
            <span class="badge" :class="statusBadge(d.status)">{{ statusLabel(d.status) }}</span>
          </div>
          <div class="deposit-meta">🏢 {{ d.propertyName }}</div>
          <div v-if="d.remark" class="deposit-remark">{{ d.remark }}</div>
        </div>
        <div class="deposit-amount">¥{{ d.amount.toLocaleString() }}</div>
      </div>

      <div class="deposit-actions" v-if="d.status === 'held'">
        <button class="action-btn action-success" @click="releaseToRent(d)">
          <span>💵</span> 转租金
        </button>
        <button class="action-btn action-secondary" @click="refundDeposit(d)">
          <span>↩️</span> 退还
        </button>
        <button class="action-btn action-danger" @click="delDeposit(d)">
          <span>🗑️</span> 删除
        </button>
      </div>
      <div class="deposit-actions" v-else>
        <button class="action-btn action-danger" @click="delDeposit(d)">
          <span>🗑️</span> 删除记录
        </button>
      </div>
    </div>

    <!-- Add modal -->
    <div v-if="showModal" class="modal-overlay" @click.self="showModal=false">
      <div class="modal-sheet">
        <div class="modal-title">🔐 添加质保金</div>

        <div class="input-group">
          <label>选择合同 *</label>
          <select class="input" v-model="depositForm.contractId">
            <option value="">-- 请选择合同 --</option>
            <option v-for="c in contracts.filter(x=>x.status==='active')" :key="c.id" :value="c.id">
              {{ c.tenantName }} · {{ c.propertyName }}
            </option>
          </select>
        </div>
        <div class="input-group">
          <label>金额 *</label>
          <input v-model="depositForm.amount" class="input" type="number" placeholder="输入质保金金额" />
        </div>
        <div class="input-group">
          <label>备注</label>
          <input v-model="depositForm.remark" class="input" placeholder="可选备注" />
        </div>

        <div class="modal-actions">
          <button class="btn btn-secondary" @click="showModal=false">取消</button>
          <button class="btn btn-primary" @click="save">添加</button>
        </div>
      </div>
    </div>

    <!-- Convert to rent modal -->
    <div v-if="showRentModal && convertingDeposit" class="modal-overlay" @click.self="showRentModal=false; convertingDeposit=null">
      <div class="modal-sheet">
        <div class="modal-title">💵 质保金转租金</div>
        <div class="modal-subtitle">选择用质保金抵扣哪期租金</div>

        <div class="convert-deposit-info">
          <div class="convert-row">
            <span class="convert-label">租客</span>
            <span class="convert-value">{{ convertingDeposit.tenantName }}</span>
          </div>
          <div class="convert-row">
            <span class="convert-label">房源</span>
            <span class="convert-value text-muted">{{ convertingDeposit.propertyName }}</span>
          </div>
          <div class="convert-amount">
            <span class="convert-amount-label">质保金金额</span>
            <span class="convert-amount-val">¥{{ convertingDeposit.amount.toLocaleString() }}</span>
          </div>
        </div>

        <div v-if="depositBills.length > 0" class="convert-bill-list">
          <div class="convert-bill-hint">选择要抵扣的账单：</div>
          <div
            v-for="bill in depositBills"
            :key="bill.id"
            class="convert-bill-item"
            @click="confirmConvert(bill)"
          >
            <div class="convert-bill-left">
              <div class="convert-bill-name">{{ bill.tenantName }}</div>
              <div class="convert-bill-date">{{ bill.dueDate.slice(0,7).replace('-','年') }}月租金</div>
            </div>
            <div class="convert-bill-right">
              <div class="convert-bill-amount">¥{{ bill.amount.toLocaleString() }}</div>
              <div class="convert-bill-tag">点击抵扣</div>
            </div>
          </div>
        </div>

        <div v-else class="convert-no-bills">
          当前无待付租金账单，直接转为租金收入
        </div>

        <div class="modal-actions">
          <button class="btn btn-secondary" @click="showRentModal=false; convertingDeposit=null">取消</button>
          <button class="btn btn-primary" @click="convertDirect">直接转为租金</button>
        </div>
      </div>
    </div>

    <div v-if="toast" class="toast">{{ toast }}</div>
  </div>
</template>

<style scoped>
/* Tab filter */
.tab-filter {
  display: flex;
  gap: 8px;
  margin-bottom: 18px;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  flex-wrap: nowrap;
  min-width: 0;
}
.tab-filter-btn {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 8px 14px;
  border-radius: var(--radius-full);
  border: 1px solid var(--border);
  background: var(--bg-card);
  color: var(--text-muted);
  font-size: 13px;
  font-weight: 700;
  font-family: var(--font-sans);
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
  flex-shrink: 0;
}
.tab-filter-btn:hover { border-color: var(--border-accent); color: var(--text-primary); }
.tab-filter-btn.active {
  background: var(--accent-dim);
  border-color: var(--border-accent);
  color: var(--accent);
}
.tab-filter-dot {
  width: 7px; height: 7px;
  border-radius: 50%;
}
.tab-filter-count {
  background: rgba(255,255,255,0.08);
  padding: 1px 7px;
  border-radius: var(--radius-full);
  font-size: 11px;
}

/* Deposit card */
@keyframes slideInUp {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
.deposit-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 18px;
  margin-bottom: 12px;
  transition: all 0.2s;
  box-shadow: var(--shadow-card);
  animation: slideInUp 0.3s var(--ease-out) both;
}
.deposit-card:hover { border-color: var(--border-accent); }

.deposit-top {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 14px;
}
.deposit-avatar {
  width: 44px; height: 44px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--warning), #ff6b35);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 17px;
  font-weight: 800;
  color: #1a0a00;
  flex-shrink: 0;
  box-shadow: 0 2px 12px rgba(245,158,11,0.3);
}
.deposit-info { flex: 1; min-width: 0; }
.deposit-name-row { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
.deposit-name { font-size: 16px; font-weight: 800; }
.deposit-meta { font-size: 12px; color: var(--text-muted); }
.deposit-remark {
  font-size: 11px;
  color: var(--text-faint);
  margin-top: 4px;
  font-style: italic;
}
.deposit-amount {
  font-size: 22px;
  font-weight: 800;
  color: var(--warning);
  letter-spacing: -0.5px;
  flex-shrink: 0;
}

/* Actions */
.deposit-actions { display: flex; gap: 8px; }
.action-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 8px 4px;
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

/* Convert to rent modal */
.modal-subtitle { font-size: 13px; color: var(--text-muted); margin-top: 4px; }
.convert-deposit-info {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  overflow: hidden;
  margin-bottom: 16px;
}
.convert-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 11px 16px;
  border-bottom: 1px solid var(--border-subtle);
  font-size: 13px;
}
.convert-row:last-child { border-bottom: none; }
.convert-label { color: var(--text-muted); font-weight: 600; }
.convert-value { font-weight: 700; }
.convert-amount {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 16px;
  background: rgba(245,158,11,0.05);
}
.convert-amount-label { font-size: 13px; font-weight: 700; color: var(--text-secondary); }
.convert-amount-val { font-size: 22px; font-weight: 800; color: var(--warning); letter-spacing: -0.5px; }
.convert-bill-hint { font-size: 12px; color: var(--text-muted); margin-bottom: 10px; font-weight: 600; }
.convert-bill-list { margin-bottom: 16px; }
.convert-bill-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 13px 14px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  margin-bottom: 8px;
  cursor: pointer;
  transition: all 0.15s;
}
.convert-bill-item:hover {
  border-color: var(--accent);
  background: var(--accent-dim);
}
.convert-bill-left { flex: 1; }
.convert-bill-name { font-size: 14px; font-weight: 700; margin-bottom: 3px; }
.convert-bill-date { font-size: 12px; color: var(--text-muted); }
.convert-bill-right { text-align: right; flex-shrink: 0; margin-left: 12px; }
.convert-bill-amount { font-size: 16px; font-weight: 800; color: var(--accent); margin-bottom: 3px; }
.convert-bill-tag { font-size: 10px; font-weight: 700; color: var(--accent); }
.convert-no-bills {
  font-size: 13px;
  color: var(--text-muted);
  text-align: center;
  padding: 16px;
  background: rgba(255,255,255,0.03);
  border-radius: var(--radius-md);
  margin-bottom: 16px;
}
</style>
