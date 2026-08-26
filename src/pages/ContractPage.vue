<script setup>
import { ref, computed, onMounted } from 'vue'
import {
  getContracts, getProperties, getBills, addContract, updateContract,
  deleteContract, payBill, unpayBill, endContract, cycleText
} from '../store.js'

const contracts = ref([])
const properties = ref([])
const bills = ref([])
const showModal = ref(false)
const showDetail = ref(false)
const showBillList = ref(false)
const editing = ref(null)
const selectedContract = ref(null)
const tab = ref('active')
const toast = ref('')
const loading = ref(true)

onMounted(async () => {
  try {
    [contracts.value, properties.value, bills.value] = await Promise.all([
      getContracts(), getProperties(), getBills()
    ])
  } catch(e) {
    console.error(e)
  } finally {
    loading.value = false
  }
})

async function refresh() {
  try {
    [contracts.value, properties.value, bills.value] = await Promise.all([
      getContracts(), getProperties(), getBills()
    ])
  } catch(e) { console.error(e) }
}

const displayed = computed(() => contracts.value.filter(c => c.status === tab.value))

const contractBills = computed(() => {
  if (!selectedContract.value) return []
  return bills.value.filter(b => b.contractId === selectedContract.value.id)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
})

function formDefaults() {
  return {
    propertyId: '',
    propertyName: '',
    tenantName: '',
    tenantPhone: '',
    rentAmount: '',
    depositAmount: '',
    paymentCycle: 'monthly',
    startDate: '',
    endDate: '',
  }
}

const form = ref(formDefaults())

function openAdd() {
  editing.value = null
  form.value = formDefaults()
  showModal.value = true
}

function openEdit(c) {
  editing.value = c
  form.value = {
    propertyId: c.propertyId,
    propertyName: c.propertyName,
    tenantName: c.tenantName,
    tenantPhone: c.tenantPhone || '',
    rentAmount: c.rentAmount,
    depositAmount: c.depositAmount,
    paymentCycle: c.paymentCycle,
    startDate: c.startDate,
    endDate: c.endDate,
  }
  showModal.value = true
}

function onPropertyChange(e) {
  const p = properties.value.find(p => p.id === e.target.value)
  if (p) form.value.propertyName = p.name
}

async function save() {
  const f = form.value
  if (!f.propertyId) { showToast('请选择房源'); return }
  if (!f.tenantName.trim()) { showToast('请输入租客姓名'); return }
  if (!f.rentAmount || f.rentAmount <= 0) { showToast('请输入有效租金'); return }
  if (!f.startDate || !f.endDate) { showToast('请选择租期'); return }
  if (new Date(f.endDate) <= new Date(f.startDate)) { showToast('结束日期必须晚于开始日期'); return }

  const data = { ...f, rentAmount: Number(f.rentAmount), depositAmount: Number(f.depositAmount) || 0 }
  try {
    if (editing.value) {
      await updateContract(editing.value.id, data)
      showToast('已更新')
    } else {
      await addContract(data)
      showToast('已添加')
    }
    showModal.value = false
    await refresh()
  } catch(e) {
    console.error(e)
    showToast('操作失败')
  }
}

async function del(c) {
  if (!confirm(`确认删除「${c.tenantName}」的合同？\n关联账单也将一并删除。`)) return
  try {
    await deleteContract(c.id)
    await refresh()
    showToast('已删除')
  } catch(e) {
    console.error(e)
    showToast('删除失败')
  }
}

async function terminate(c) {
  if (!confirm(`确认对「${c.tenantName}」执行退房？\n该合同下所有待付账单将自动取消。`)) return
  try {
    await endContract(c.id)
    await refresh()
    showToast('已退房')
  } catch(e) {
    console.error(e)
    showToast('操作失败')
  }
}

function viewDetail(c) {
  selectedContract.value = c
  showDetail.value = true
}

function viewBills(c) {
  selectedContract.value = c
  showBillList.value = true
}

async function pay(billId) {
  try {
    await payBill(billId)
    bills.value = await getBills()
    showToast('已标记为已付')
  } catch(e) {
    console.error(e)
    showToast('操作失败')
  }
}

async function unpay(billId) {
  try {
    await unpayBill(billId)
    bills.value = await getBills()
    showToast('已撤销')
  } catch(e) {
    console.error(e)
    showToast('操作失败')
  }
}

function formatAmount(n) {
  return n ? n.toLocaleString() : '0'
}

function formatDate(d) {
  return d ? d.replace(/-/g, '/') : ''
}

function showToast(msg) {
  toast.value = msg
  setTimeout(() => { toast.value = '' }, 2000)
}

function statusBadge(c) {
  if (c.status === 'active') {
    const end = new Date(c.endDate)
    const now = new Date()
    const daysLeft = Math.round((end - now) / 86400000)
    if (daysLeft < 0) return { text: '已逾期', cls: 'badge-danger' }
    if (daysLeft <= 30) return { text: `剩${daysLeft}天`, cls: 'badge-warning' }
    return { text: '进行中', cls: 'badge-success' }
  }
  return { text: '已结束', cls: 'badge-info' }
}
</script>

<template>
  <div>
    <!-- Header -->
    <div class="page-header">
      <div>
        <div class="page-title">📋 合同管理</div>
        <div class="text-muted text-xs mt-1">共 {{ contracts.length }} 份合同</div>
      </div>
      <button class="btn btn-primary btn-sm" style="width:auto;padding:9px 18px" @click="openAdd">
        <span>＋</span> 新签合同
      </button>
    </div>

    <!-- Tab filter -->
    <div class="tab-filter">
      <button
        class="tab-filter-btn"
        :class="{ active: tab === 'active' }"
        @click="tab = 'active'"
      >
        <span class="tab-filter-dot success"></span>
        进行中
        <span class="tab-filter-count">{{ contracts.filter(c => c.status === 'active').length }}</span>
      </button>
      <button
        class="tab-filter-btn"
        :class="{ active: tab === 'ended' }"
        @click="tab = 'ended'"
      >
        <span class="tab-filter-dot info"></span>
        已结束
        <span class="tab-filter-count">{{ contracts.filter(c => c.status === 'ended').length }}</span>
      </button>
    </div>

    <!-- Loading -->
    <template v-if="loading">
      <div v-for="i in 3" :key="i" class="contract-card contract-skeleton">
        <div class="skeleton" style="height:18px;width:40%;margin-bottom:10px;border-radius:6px"></div>
        <div class="skeleton" style="height:13px;width:65%;border-radius:6px"></div>
      </div>
    </template>

    <!-- Empty -->
    <div v-else-if="displayed.length === 0" class="empty">
      <div class="empty-icon">{{ tab === 'active' ? '📋' : '📁' }}</div>
      <div class="empty-text">{{ tab === 'active' ? '暂无进行中合同' : '暂无已结束合同' }}</div>
    </div>

    <!-- Contract list -->
    <div
      v-for="(c, idx) in displayed"
      :key="c.id"
      class="contract-card"
      :style="{ animationDelay: idx * 50 + 'ms' }"
    >
      <!-- Top row: tenant info + amount -->
      <div class="contract-top">
        <div class="contract-avatar">{{ c.tenantName[0] }}</div>
        <div class="contract-info">
          <div class="contract-name-row">
            <span class="contract-name">{{ c.tenantName }}</span>
            <span class="badge" :class="statusBadge(c).cls">{{ statusBadge(c).text }}</span>
          </div>
          <div class="contract-meta">
            <span>🏢 {{ c.propertyName }}</span>
            <span v-if="c.tenantPhone">📞 {{ c.tenantPhone }}</span>
          </div>
        </div>
        <div class="contract-amount">
          <div class="contract-rent">¥{{ formatAmount(c.rentAmount) }}</div>
          <div class="contract-cycle">/{{ cycleText(c.paymentCycle) }}</div>
        </div>
      </div>

      <!-- Period info -->
      <div class="contract-period">
        <span class="period-icon">📅</span>
        <span class="period-text">{{ formatDate(c.startDate) }} — {{ formatDate(c.endDate) }}</span>
        <span class="period-tag" :class="statusBadge(c).cls.replace('badge-', 'ptag-')">
          {{ cycleText(c.paymentCycle) }}
        </span>
      </div>

      <!-- Action buttons -->
      <div class="contract-actions">
        <button class="action-btn action-info" @click="viewBills(c)">
          <span>📋</span> 账单
        </button>
        <button class="action-btn action-secondary" @click="viewDetail(c)">
          <span>👁️</span> 详情
        </button>
        <button class="action-btn action-secondary" @click="openEdit(c)">
          <span>✏️</span> 编辑
        </button>
        <button class="action-btn action-danger" @click="del(c)">
          <span>🗑️</span> 删除
        </button>
        <button v-if="c.status === 'active'" class="action-btn action-warning" @click="terminate(c)">
          <span>🚪</span> 退房
        </button>
      </div>
    </div>

    <!-- Add/Edit modal -->
    <div v-if="showModal" class="modal-overlay" @click.self="showModal=false">
      <div class="modal-sheet">
        <div class="modal-title">{{ editing ? '✏️ 编辑合同' : '📝 新签合同' }}</div>

        <div class="input-group">
          <label>选择房源 *</label>
          <select class="input" :value="form.propertyId" @change="onPropertyChange">
            <option value="">-- 请选择房源 --</option>
            <option v-for="p in properties" :key="p.id" :value="p.id">{{ p.name }}</option>
          </select>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div class="input-group">
            <label>租客姓名 *</label>
            <input v-model="form.tenantName" class="input" placeholder="姓名" />
          </div>
          <div class="input-group">
            <label>联系电话</label>
            <input v-model="form.tenantPhone" class="input" placeholder="手机号" />
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div class="input-group">
            <label>月租金 *</label>
            <input v-model="form.rentAmount" class="input" type="number" placeholder="0" />
          </div>
          <div class="input-group">
            <label>质保金</label>
            <input v-model="form.depositAmount" class="input" type="number" placeholder="0" />
          </div>
        </div>

        <div class="input-group">
          <label>付款方式</label>
          <select v-model="form.paymentCycle" class="input">
            <option value="monthly">月付</option>
            <option value="quarterly">季付</option>
            <option value="half_year">半年付</option>
            <option value="yearly">年付</option>
          </select>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div class="input-group">
            <label>开始日期 *</label>
            <input v-model="form.startDate" class="input" type="date" />
          </div>
          <div class="input-group">
            <label>结束日期 *</label>
            <input v-model="form.endDate" class="input" type="date" />
          </div>
        </div>

        <div class="modal-actions">
          <button class="btn btn-secondary" @click="showModal=false">取消</button>
          <button class="btn btn-primary" @click="save">{{ editing ? '保存修改' : '创建合同' }}</button>
        </div>
      </div>
    </div>

    <!-- Detail modal -->
    <div v-if="showDetail && selectedContract" class="modal-overlay" @click.self="showDetail=false">
      <div class="modal-sheet">
        <div class="modal-title">📋 合同详情</div>

        <div class="detail-card">
          <div class="detail-avatar-row">
            <div class="detail-avatar">{{ selectedContract.tenantName[0] }}</div>
            <div>
              <div class="detail-name">{{ selectedContract.tenantName }}</div>
              <span class="badge" :class="statusBadge(selectedContract).cls">{{ statusBadge(selectedContract).text }}</span>
            </div>
          </div>

          <div class="detail-rows">
            <div class="detail-row">
              <span class="detail-label">房源</span>
              <span class="detail-val">{{ selectedContract.propertyName }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">联系电话</span>
              <span class="detail-val text-muted">{{ selectedContract.tenantPhone || '—' }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">月租金</span>
              <span class="detail-val accent">¥{{ formatAmount(selectedContract.rentAmount) }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">质保金</span>
              <span class="detail-val">¥{{ formatAmount(selectedContract.depositAmount) }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">付款方式</span>
              <span class="tag">{{ cycleText(selectedContract.paymentCycle) }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">租期</span>
              <span class="detail-val">{{ formatDate(selectedContract.startDate) }} ~ {{ formatDate(selectedContract.endDate) }}</span>
            </div>
          </div>
        </div>

        <button class="btn btn-secondary" style="margin-top:16px" @click="showDetail=false">关闭</button>
      </div>
    </div>

    <!-- Bill list modal -->
    <div v-if="showBillList && selectedContract" class="modal-overlay" @click.self="showBillList=false">
      <div class="modal-sheet" style="max-height:90vh;overflow-y:auto">
        <div class="modal-title">💰 {{ selectedContract.tenantName }}的账单</div>

        <div v-if="contractBills.length === 0" class="empty">
          <div class="empty-icon">📭</div>
          <div class="empty-text">暂无账单</div>
        </div>

        <div
          v-for="bill in contractBills"
          :key="bill.id"
          class="bill-item"
        >
          <div class="bill-item-left">
            <div class="bill-item-type">
              <span class="tag" :class="bill.type === 'deposit' ? 'tag-purple' : ''">
                {{ bill.type === 'deposit' ? '质保金' : '租金' }}
              </span>
            </div>
            <div class="bill-item-date">到期：{{ bill.dueDate }}</div>
          </div>
          <div class="bill-item-right">
            <div class="bill-item-amount">¥{{ formatAmount(bill.amount) }}</div>
            <div style="display:flex;gap:4px;align-items:center">
              <span
                v-if="bill.status!=='paid'"
                class="badge badge-warning"
                style="cursor:pointer"
                @click="pay(bill.id)"
              >待付 ⟶</span>
              <span
                v-else
                class="badge badge-success"
                style="cursor:pointer"
                @click="unpay(bill.id)"
                title="点击撤销"
              >已付 ✓</span>
            </div>
          </div>
        </div>

        <button class="btn btn-secondary" style="margin-top:16px" @click="showBillList=false">关闭</button>
      </div>
    </div>

    <div v-if="toast" class="toast">{{ toast }}</div>
  </div>
</template>

<style scoped>
@keyframes slideInUp {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Tab filter */
.tab-filter {
  display: flex;
  gap: 8px;
  margin-bottom: 18px;
}
.tab-filter-btn {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 8px 16px;
  border-radius: var(--radius-full);
  border: 1px solid var(--border);
  background: var(--bg-card);
  color: var(--text-muted);
  font-size: 13px;
  font-weight: 700;
  font-family: var(--font-sans);
  cursor: pointer;
  transition: all 0.2s var(--ease-out);
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
.tab-filter-dot.success { background: var(--success); }
.tab-filter-dot.info { background: var(--accent); }
.tab-filter-count {
  background: rgba(255,255,255,0.08);
  padding: 1px 7px;
  border-radius: var(--radius-full);
  font-size: 11px;
}

/* Contract card */
.contract-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 18px;
  margin-bottom: 12px;
  transition: all 0.2s var(--ease-out);
  box-shadow: var(--shadow-card);
  animation: slideInUp 0.3s var(--ease-out) both;
}
.contract-card:hover {
  border-color: var(--border-accent);
  box-shadow: var(--shadow-card-hover);
  transform: translateY(-1px);
}

.contract-skeleton { animation: none; }

.contract-top {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 14px;
}

.contract-avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--accent), var(--accent-2));
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 17px;
  font-weight: 800;
  color: #020714;
  flex-shrink: 0;
  box-shadow: 0 2px 12px rgba(0,212,255,0.25);
}

.contract-info { flex: 1; min-width: 0; }
.contract-name-row { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
.contract-name { font-size: 16px; font-weight: 800; }
.contract-meta {
  display: flex;
  gap: 10px;
  font-size: 12px;
  color: var(--text-muted);
  flex-wrap: wrap;
}

.contract-amount { text-align: right; flex-shrink: 0; }
.contract-rent {
  font-size: 22px;
  font-weight: 800;
  color: var(--accent);
  letter-spacing: -0.5px;
}
.contract-cycle { font-size: 11px; color: var(--text-muted); font-weight: 600; }

/* Period row */
.contract-period {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: rgba(255,255,255,0.025);
  border-radius: var(--radius-sm);
  margin-bottom: 12px;
  font-size: 12px;
  color: var(--text-muted);
}
.period-icon { font-size: 13px; }
.period-text { flex: 1; font-weight: 600; color: var(--text-secondary); }
.period-tag {
  font-size: 10px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: var(--radius-full);
}
.ptag-success { background: var(--success-dim); color: var(--success); }
.ptag-warning { background: var(--warning-dim); color: var(--warning); }
.ptag-danger { background: var(--danger-dim); color: var(--danger); }
.ptag-info { background: var(--accent-dim); color: var(--accent); }

/* Action buttons */
.contract-actions {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 8px 4px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  background: transparent;
  font-size: 11px;
  font-weight: 700;
  font-family: var(--font-sans);
  cursor: pointer;
  transition: all 0.15s var(--ease-out);
  color: var(--text-secondary);
}
.action-btn:hover { transform: translateY(-1px); }
.action-secondary:hover { background: rgba(255,255,255,0.06); border-color: var(--border-accent); color: var(--text-primary); }
.action-info:hover { background: var(--accent-dim); border-color: var(--border-accent); color: var(--accent); }
.action-danger:hover { background: var(--danger-dim); border-color: rgba(255,69,96,0.3); color: var(--danger); }
.action-warning:hover { background: var(--warning-dim); border-color: rgba(245,158,11,0.3); color: var(--warning); }

/* Detail card */
.detail-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  overflow: hidden;
}
.detail-avatar-row {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 20px;
  border-bottom: 1px solid var(--border);
  background: rgba(0,212,255,0.03);
}
.detail-avatar {
  width: 52px; height: 52px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--accent), var(--accent-2));
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  font-weight: 800;
  color: #020714;
  box-shadow: 0 4px 16px rgba(0,212,255,0.3);
}
.detail-name { font-size: 18px; font-weight: 800; margin-bottom: 6px; }
.detail-rows { padding: 4px 0; }
.detail-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  border-bottom: 1px solid var(--border-subtle);
  font-size: 13px;
}
.detail-row:last-child { border-bottom: none; }
.detail-label { color: var(--text-muted); font-weight: 600; font-size: 12px; }
.detail-val { font-weight: 700; color: var(--text-primary); }
.detail-val.accent { color: var(--accent); font-size: 16px; }

/* Bill item */
.bill-item {
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
.bill-item:hover { border-color: var(--border-accent); }
.bill-item-left { display: flex; flex-direction: column; gap: 4px; }
.bill-item-date { font-size: 12px; color: var(--text-muted); }
.bill-item-right { text-align: right; }
.bill-item-amount { font-size: 17px; font-weight: 800; color: var(--accent); margin-bottom: 4px; }
</style>
