<script setup>
const emit = defineEmits(['change-tab', 'logout', 'open-admin'])
import { ref, onMounted } from 'vue'
import { getStats, getBills, getContracts, getDeposits, getProperties, addDeposit, updateDeposit, deleteDeposit, payBill } from '../store.js'

const stats = ref({})
const bills = ref([])
const contracts = ref([])
const deposits = ref([])
const properties = ref([])
const showDepositModal = ref(false)
const showBillsModal = ref(false)
const toast = ref('')
const tab = ref('deposit')
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
    pendingBills.value = [...bills.value].sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    showToast('已标记为已付')
  } catch(e) {
    console.error(e)
    showToast('操作失败')
  }
}

const depositForm = ref({ contractId: '', amount: '', remark: '' })

function openDeposit() {
  depositForm.value = { contractId: '', amount: '', remark: '' }
  showDepositModal.value = true
}

async function saveDeposit() {
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
    showDepositModal.value = false
    deposits.value = await getDeposits()
    showToast('质保金已添加')
  } catch(e) {
    console.error(e)
    showToast('操作失败')
  }
}

async function releaseToRent(deposit) {
  if (!confirm(`将「${deposit.tenantName}」的质保金 ¥${deposit.amount.toLocaleString()} 转为一期租金？`)) return
  try {
    await updateDeposit(deposit.id, { status: 'converted' })
    deposits.value = await getDeposits()
    showToast('已转为租金')
  } catch(e) { console.error(e); showToast('操作失败') }
}

async function refundDeposit(deposit) {
  if (!confirm(`确认退还「${deposit.tenantName}」的质保金 ¥${deposit.amount.toLocaleString()}？`)) return
  try {
    await updateDeposit(deposit.id, { status: 'refunded' })
    deposits.value = await getDeposits()
    showToast('已标记为已退')
  } catch(e) { console.error(e); showToast('操作失败') }
}

async function delDeposit(deposit) {
  if (!confirm(`确认删除？`)) return
  try {
    await deleteDeposit(deposit.id)
    deposits.value = await getDeposits()
    showToast('已删除')
  } catch(e) { console.error(e); showToast('操作失败') }
}

function showToast(msg) {
  toast.value = msg
  setTimeout(() => { toast.value = '' }, 2000)
}
</script>

<template>
  <div>
    <div class="page-header">
      <div class="page-title">👤 我的</div>
    </div>

    <!-- 汇总卡片 -->
    <div class="card" style="margin-bottom:14px">
      <div style="font-size:16px;font-weight:700;margin-bottom:12px">📊 数据总览</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:10px;padding:12px;text-align:center">
          <div style="font-size:22px;font-weight:700;color:var(--accent)">{{ stats.activeCount || 0 }}</div>
          <div style="font-size:11px;color:var(--text-muted);margin-top:2px">在租合同</div>
        </div>
        <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:10px;padding:12px;text-align:center">
          <div style="font-size:22px;font-weight:700;color:var(--text)">{{ properties.length }}</div>
          <div style="font-size:11px;color:var(--text-muted);margin-top:2px">房源数</div>
        </div>
        <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:10px;padding:12px;text-align:center">
          <div style="font-size:22px;font-weight:700;color:var(--warning)">¥{{ (stats.totalPending || 0).toLocaleString() }}</div>
          <div style="font-size:11px;color:var(--text-muted);margin-top:2px">待收总额</div>
        </div>
        <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:10px;padding:12px;text-align:center">
          <div style="font-size:22px;font-weight:700;color:var(--danger)">{{ stats.overdueCount || 0 }}</div>
          <div style="font-size:11px;color:var(--text-muted);margin-top:2px">逾期笔数</div>
        </div>
      </div>
    </div>

    <!-- 质保金管理 -->
    <div class="card" style="margin-bottom:14px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
        <div style="font-size:16px;font-weight:700">🔐 质保金管理</div>
        <button class="btn btn-primary btn-sm" style="width:auto;padding:6px 14px" @click="openDeposit">+ 添加</button>
      </div>

      <div v-if="loading" class="empty" style="padding:20px">
        <div style="font-size:13px">加载中...</div>
      </div>
      <div v-else-if="deposits.length === 0" class="empty" style="padding:20px">
        <div style="font-size:13px">暂无质保金记录</div>
      </div>

      <div
        v-for="d in deposits"
        :key="d.id"
        style="background:var(--bg-card);border:1px solid var(--border);border-radius:10px;padding:12px;margin-bottom:8px"
      >
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
          <div>
            <span style="font-weight:600;font-size:14px">{{ d.tenantName }}</span>
            <span style="font-size:11px;color:var(--text-muted);margin-left:6px">{{ d.propertyName }}</span>
          </div>
          <div style="font-size:18px;font-weight:700;color:var(--accent)">¥{{ d.amount.toLocaleString() }}</div>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center">
          <span class="badge" :class="{
            'badge-warning': d.status === 'held',
            'badge-info': d.status === 'converted',
            'badge-success': d.status === 'refunded'
          }">
            {{ d.status === 'held' ? '持有中' : d.status === 'converted' ? '已转租金' : '已退还' }}
          </span>
          <div style="display:flex;gap:6px" v-if="d.status === 'held'">
            <button class="btn btn-sm" style="width:auto;padding:4px 10px;background:rgba(16,185,129,0.15);color:var(--success);font-size:12px" @click="releaseToRent(d)">转租金</button>
            <button class="btn btn-sm" style="width:auto;padding:4px 10px;background:rgba(239,68,68,0.15);color:var(--danger);font-size:12px" @click="refundDeposit(d)">退还</button>
          </div>
          <button v-else class="btn btn-danger btn-sm" style="width:auto;padding:4px 10px;font-size:12px" @click="delDeposit(d)">删除</button>
        </div>
      </div>
    </div>

    <!-- 全部账单入口 -->
    <div class="card" style="margin-bottom:14px;cursor:pointer" @click="openBills">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div>
          <div style="font-size:16px;font-weight:700;margin-bottom:4px">💰 全部账单</div>
          <div style="font-size:12px;color:var(--text-muted)">共 {{ bills.length }} 条记录</div>
        </div>
        <div style="font-size:20px">→</div>
      </div>
    </div>

    <!-- 版本信息 -->
    <div style="text-align:center;padding:16px;color:var(--text-muted);font-size:11px">
      <div class="admin-btn" @click="emit('open-admin')">⚙️ 系统管理</div>
      收租提醒 v2.0 · SQLite数据库
    </div>

    <!-- 添加质保金弹窗 -->
    <div v-if="showDepositModal" class="modal-overlay" @click.self="showDepositModal=false">
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
          <button class="btn btn-secondary" @click="showDepositModal=false">取消</button>
          <button class="btn btn-primary" @click="saveDeposit">添加</button>
        </div>
      </div>
    </div>

    <!-- 全部账单弹窗 -->
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
          class="card"
          style="display:flex;align-items:center;gap:10px"
        >
          <div style="flex:1">
            <div style="display:flex;align-items:center;gap:5px;margin-bottom:3px">
              <span style="font-size:14px;font-weight:600">{{ bill.tenantName }}</span>
              <span class="tag" style="font-size:10px">{{ bill.type==='deposit'?'质保金':'租金' }}</span>
            </div>
            <div style="font-size:12px;color:var(--text-muted)">到期：{{ bill.dueDate }} · {{ bill.propertyName }}</div>
          </div>
          <div style="text-align:right">
            <div style="font-size:16px;font-weight:700;color:var(--accent)">¥{{ bill.amount.toLocaleString() }}</div>
            <span
              class="badge"
              :class="bill.status==='paid'?'badge-success':'badge-warning'"
              style="cursor:pointer"
              @click="bill.status!=='paid' && payBillById(bill.id)"
            >{{ bill.status === 'paid' ? '已付 ✓' : '待付 ⟶' }}</span>
          </div>
        </div>

        <div style="margin-top:16px">
          <button class="btn btn-secondary" @click="showBillsModal=false">关闭</button>
        </div>
      </div>
    </div>

    <div v-if="toast" class="toast">{{ toast }}</div>
  </div>
</template>
