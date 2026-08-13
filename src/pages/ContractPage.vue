<script setup>
import { ref, computed, onMounted } from 'vue'
import {
  getContracts, getProperties, getBills, addContract, updateContract,
  deleteContract, payBill, cycleText, generateBillsForContract
} from '../store.js'

const contracts = ref([])
const properties = ref([])
const bills = ref([])
const showModal = ref(false)
const showDetail = ref(false)
const showBillList = ref(false)
const editing = ref(null)
const selectedContract = ref(null)
const tab = ref('active') // active | ended
const toast = ref('')

onMounted(() => refresh())

function refresh() {
  contracts.value = getContracts()
  properties.value = getProperties()
  bills.value = getBills()
}

const displayed = computed(() => {
  return contracts.value.filter(c => c.status === tab.value)
})

const contractBills = computed(() => {
  if (!selectedContract.value) return []
  return bills.value
    .filter(b => b.contractId === selectedContract.value.id)
    .sort((a, b) => b.dueDate.localeCompare(a.dueDate))
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

function save() {
  const f = form.value
  if (!f.propertyId) { showToast('请选择房源'); return }
  if (!f.tenantName.trim()) { showToast('请输入租客姓名'); return }
  if (!f.rentAmount || f.rentAmount <= 0) { showToast('请输入有效租金'); return }
  if (!f.startDate || !f.endDate) { showToast('请选择租期'); return }
  if (new Date(f.endDate) <= new Date(f.startDate)) { showToast('结束日期必须晚于开始日期'); return }

  const data = { ...f, rentAmount: Number(f.rentAmount), depositAmount: Number(f.depositAmount) || 0 }

  if (editing.value) {
    updateContract(editing.value.id, data)
    showToast('已更新')
  } else {
    const c = addContract(data)
    showToast('已添加')
  }
  showModal.value = false
  refresh()
}

function del(c) {
  if (!confirm(`确认删除「${c.tenantName}」的合同？\n关联账单也将一并删除。`)) return
  deleteContract(c.id)
  refresh()
  showToast('已删除')
}

function viewDetail(c) {
  selectedContract.value = c
  showDetail.value = true
}

function viewBills(c) {
  selectedContract.value = c
  showBillList.value = true
}

function pay(billId) {
  payBill(billId)
  refresh()
  showToast('已标记为已付')
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
    <div class="page-header">
      <div class="page-title">📋 合同管理</div>
      <button class="btn btn-primary btn-sm" style="width:auto;padding:8px 16px" @click="openAdd">+ 新签合同</button>
    </div>

    <!-- Tab -->
    <div style="display:flex;gap:8px;margin-bottom:16px">
      <button
        class="btn btn-sm"
        :class="tab==='active'?'btn-primary':'btn-secondary'"
        style="width:auto;flex:none"
        @click="tab='active'"
      >进行中</button>
      <button
        class="btn btn-sm"
        :class="tab==='ended'?'btn-primary':'btn-secondary'"
        style="width:auto;flex:none"
        @click="tab='ended'"
      >已结束</button>
    </div>

    <div v-if="displayed.length === 0" class="empty">
      <div class="empty-icon">📋</div>
      <div class="empty-text">{{ tab === 'active' ? '暂无进行中合同' : '暂无已结束合同' }}</div>
    </div>

    <div
      v-for="c in displayed"
      :key="c.id"
      class="card"
    >
      <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:8px">
        <div style="flex:1">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:3px">
            <span style="font-size:16px;font-weight:600">{{ c.tenantName }}</span>
            <span class="badge" :class="statusBadge(c).cls">{{ statusBadge(c).text }}</span>
          </div>
          <div style="font-size:12px;color:var(--text-dim)">{{ c.propertyName }}</div>
          <div style="font-size:12px;color:var(--text-muted);margin-top:2px">{{ c.tenantPhone }}</div>
        </div>
        <div style="text-align:right">
          <div style="font-size:20px;font-weight:700;color:var(--accent)">¥{{ formatAmount(c.rentAmount) }}</div>
          <div style="font-size:11px;color:var(--text-muted)">/{{ cycleText(c.paymentCycle) }}</div>
        </div>
      </div>

      <div style="display:flex;gap:6px;margin-top:10px;padding-top:10px;border-top:1px solid var(--border)">
        <button class="btn btn-secondary btn-sm" style="flex:1" @click="viewBills(c)">账单</button>
        <button class="btn btn-secondary btn-sm" style="flex:1" @click="viewDetail(c)">详情</button>
        <button class="btn btn-secondary btn-sm" style="flex:1" @click="openEdit(c)">编辑</button>
        <button class="btn btn-danger btn-sm" style="flex:1" @click="del(c)">删除</button>
      </div>
    </div>

    <!-- 添加/编辑合同 -->
    <div v-if="showModal" class="modal-overlay" @click.self="showModal=false">
      <div class="modal-sheet" style="max-height:95vh;overflow-y:auto">
        <div class="modal-title">{{ editing ? '✏️ 编辑合同' : '📝 新签合同' }}</div>

        <div class="input-group">
          <label>选择房源 *</label>
          <select class="input" :value="form.propertyId" @change="onPropertyChange">
            <option value="">-- 请选择房源 --</option>
            <option v-for="p in properties" :key="p.id" :value="p.id">{{ p.name }}</option>
          </select>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
          <div class="input-group">
            <label>租客姓名 *</label>
            <input v-model="form.tenantName" class="input" placeholder="姓名" />
          </div>
          <div class="input-group">
            <label>联系电话</label>
            <input v-model="form.tenantPhone" class="input" placeholder="手机号" />
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
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

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
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
          <button class="btn btn-primary" @click="save">{{ editing ? '保存' : '创建合同' }}</button>
        </div>
      </div>
    </div>

    <!-- 合同详情 -->
    <div v-if="showDetail && selectedContract" class="modal-overlay" @click.self="showDetail=false">
      <div class="modal-sheet">
        <div class="modal-title">📋 合同详情</div>
        <div class="card">
          <div style="display:flex;justify-content:space-between;margin-bottom:8px">
            <span style="color:var(--text-dim);font-size:13px">租客</span>
            <span style="font-weight:600">{{ selectedContract.tenantName }}</span>
          </div>
          <div style="display:flex;justify-content:space-between;margin-bottom:8px">
            <span style="color:var(--text-dim);font-size:13px">房源</span>
            <span style="font-size:13px">{{ selectedContract.propertyName }}</span>
          </div>
          <div style="display:flex;justify-content:space-between;margin-bottom:8px">
            <span style="color:var(--text-dim);font-size:13px">联系电话</span>
            <span style="font-size:13px">{{ selectedContract.tenantPhone || '-' }}</span>
          </div>
          <div style="display:flex;justify-content:space-between;margin-bottom:8px">
            <span style="color:var(--text-dim);font-size:13px">月租金</span>
            <span style="font-weight:700;color:var(--accent)">¥{{ formatAmount(selectedContract.rentAmount) }}</span>
          </div>
          <div style="display:flex;justify-content:space-between;margin-bottom:8px">
            <span style="color:var(--text-dim);font-size:13px">质保金</span>
            <span style="font-size:13px">¥{{ formatAmount(selectedContract.depositAmount) }}</span>
          </div>
          <div style="display:flex;justify-content:space-between;margin-bottom:8px">
            <span style="color:var(--text-dim);font-size:13px">付款方式</span>
            <span class="tag">{{ cycleText(selectedContract.paymentCycle) }}</span>
          </div>
          <div style="display:flex;justify-content:space-between;margin-bottom:8px">
            <span style="color:var(--text-dim);font-size:13px">租期</span>
            <span style="font-size:13px">{{ formatDate(selectedContract.startDate)}} ~ {{ formatDate(selectedContract.endDate) }}</span>
          </div>
          <div style="display:flex;justify-content:space-between">
            <span style="color:var(--text-dim);font-size:13px">状态</span>
            <span class="badge" :class="statusBadge(selectedContract).cls">{{ statusBadge(selectedContract).text }}</span>
          </div>
        </div>
        <div style="margin-top:16px">
          <button class="btn btn-secondary" @click="showDetail=false">关闭</button>
        </div>
      </div>
    </div>

    <!-- 账单列表 -->
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
          class="card"
          style="display:flex;align-items:center;gap:10px"
        >
          <div style="flex:1">
            <div style="display:flex;align-items:center;gap:5px;margin-bottom:3px">
              <span style="font-size:14px;font-weight:600">{{ bill.tenantName }}</span>
              <span class="tag" style="font-size:10px">{{ bill.type==='deposit'?'质保金':'租金' }}</span>
            </div>
            <div style="font-size:12px;color:var(--text-dim)">到期：{{ bill.dueDate }}</div>
          </div>
          <div style="text-align:right">
            <div style="font-size:16px;font-weight:700;color:var(--accent)">¥{{ formatAmount(bill.amount) }}</div>
            <span
              class="badge"
              :class="bill.status==='paid'?'badge-success':'badge-warning'"
              style="cursor:pointer"
              @click="bill.status!=='paid' && pay(bill.id)"
            >{{ bill.status === 'paid' ? '已付' : '待付 ⟶' }}</span>
          </div>
        </div>

        <div style="margin-top:16px">
          <button class="btn btn-secondary" @click="showBillList=false">关闭</button>
        </div>
      </div>
    </div>

    <div v-if="toast" class="toast">{{ toast }}</div>
  </div>
</template>
