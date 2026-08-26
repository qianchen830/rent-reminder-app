<script setup>
import { ref, onMounted } from 'vue'
import { getProperties, addProperty, updateProperty, deleteProperty, getContracts } from '../store.js'

const properties = ref([])
const contracts = ref([])
const showModal = ref(false)
const editing = ref(null)
const form = ref({ name: '', address: '', remark: '' })
const toast = ref('')
const loading = ref(true)

onMounted(async () => {
  try {
    [properties.value, contracts.value] = await Promise.all([getProperties(), getContracts()])
  } catch(e) {
    console.error(e)
  } finally {
    loading.value = false
  }
})

function openAdd() {
  editing.value = null
  form.value = { name: '', address: '', remark: '' }
  showModal.value = true
}

function openEdit(p) {
  editing.value = p
  form.value = { name: p.name, address: p.address || '', remark: p.remark || '' }
  showModal.value = true
}

async function save() {
  if (!form.value.name.trim()) { showToast('请输入房源名称'); return }
  try {
    if (editing.value) {
      await updateProperty(editing.value.id, form.value)
    } else {
      await addProperty(form.value)
    }
    showModal.value = false
    properties.value = await getProperties()
    showToast(editing.value ? '已更新' : '已添加')
  } catch(e) {
    console.error(e)
    showToast('操作失败')
  }
}

async function del(p) {
  if (!confirm(`确认删除「${p.name}」？\n关联合同和账单将一并删除。`)) return
  try {
    await deleteProperty(p.id)
    properties.value = await getProperties()
    contracts.value = await getContracts()
    showToast('已删除')
  } catch(e) {
    console.error(e)
    showToast('删除失败')
  }
}

function getContractCount(propertyId) {
  return contracts.value.filter(c => c.propertyId === propertyId).length
}

function showToast(msg) {
  toast.value = msg
  setTimeout(() => { toast.value = '' }, 2000)
}
</script>

<template>
  <div>
    <!-- Header -->
    <div class="page-header">
      <div>
        <div class="page-title">🏢 房源管理</div>
        <div class="text-muted text-xs mt-1">共 {{ properties.length }} 处房源</div>
      </div>
      <button class="btn btn-primary btn-sm" style="width:auto;padding:9px 18px" @click="openAdd">
        <span>＋</span> 添加房源
      </button>
    </div>

    <!-- Loading -->
    <template v-if="loading">
      <div v-for="i in 3" :key="i" class="property-skeleton">
        <div class="skeleton" style="height:18px;width:55%;margin-bottom:10px;border-radius:6px"></div>
        <div class="skeleton" style="height:12px;width:80%;border-radius:6px"></div>
      </div>
    </template>

    <!-- Empty -->
    <div v-else-if="properties.length === 0" class="empty">
      <div class="empty-icon">🏢</div>
      <div class="empty-text">还没有房源</div>
      <div class="empty-sub">点击上方「添加房源」开始管理</div>
    </div>

    <!-- Property cards -->
    <div
      v-for="(p, idx) in properties"
      :key="p.id"
      class="property-card"
      :style="{ animationDelay: idx * 60 + 'ms' }"
    >
      <!-- Card top -->
      <div class="property-top" @click="openEdit(p)">
        <div class="property-icon-wrap">
          <span class="property-icon">🏠</span>
        </div>
        <div class="property-info">
          <div class="property-name">{{ p.name }}</div>
          <div class="property-address" v-if="p.address">
            <span class="address-icon">📍</span> {{ p.address }}
          </div>
          <div class="property-address text-muted" v-else>
            <span class="address-icon">📍</span> 未填写地址
          </div>
          <div class="property-remark" v-if="p.remark">{{ p.remark }}</div>
        </div>
        <div class="property-right">
          <div class="contract-count-badge">
            <span class="count-num">{{ getContractCount(p.id) }}</span>
            <span class="count-label">合同</span>
          </div>
        </div>
      </div>

      <!-- Card bottom: actions -->
      <div class="property-actions">
        <button class="action-btn action-secondary" @click.stop="openEdit(p)">
          <span>✏️</span> 编辑
        </button>
        <button class="action-btn action-danger" @click.stop="del(p)">
          <span>🗑️</span> 删除
        </button>
      </div>
    </div>

    <!-- Add/Edit modal -->
    <div v-if="showModal" class="modal-overlay" @click.self="showModal=false">
      <div class="modal-sheet">
        <div class="modal-title">{{ editing ? '✏️ 编辑房源' : '➕ 添加房源' }}</div>

        <div class="input-group">
          <label>房源名称 *</label>
          <input v-model="form.name" class="input" placeholder="如：星海花园A栋301" />
        </div>
        <div class="input-group">
          <label>详细地址</label>
          <input v-model="form.address" class="input" placeholder="如：XX市XX区XX路XX号" />
        </div>
        <div class="input-group">
          <label>备注</label>
          <input v-model="form.remark" class="input" placeholder="可选，如：朝南采光好" />
        </div>

        <div class="modal-actions">
          <button class="btn btn-secondary" @click="showModal=false">取消</button>
          <button class="btn btn-primary" @click="save">{{ editing ? '保存修改' : '添加房源' }}</button>
        </div>
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

.property-skeleton {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 18px;
  margin-bottom: 12px;
}

.property-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 0;
  margin-bottom: 12px;
  overflow: hidden;
  transition: all 0.2s var(--ease-out);
  box-shadow: var(--shadow-card);
  animation: slideInUp 0.3s var(--ease-out) both;
}
.property-card:hover {
  border-color: var(--border-accent);
  box-shadow: var(--shadow-card-hover);
  transform: translateY(-1px);
}

.property-top {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 18px;
  cursor: pointer;
}

.property-icon-wrap {
  width: 46px;
  height: 46px;
  border-radius: var(--radius-md);
  background: linear-gradient(135deg, rgba(0,212,255,0.12), rgba(124,77,255,0.12));
  border: 1px solid rgba(0,212,255,0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.property-icon { font-size: 24px; }

.property-info { flex: 1; min-width: 0; }
.property-name {
  font-size: 16px;
  font-weight: 800;
  color: var(--text-primary);
  margin-bottom: 5px;
}
.property-address {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--text-muted);
  font-weight: 500;
}
.address-icon { font-size: 11px; }
.property-remark {
  font-size: 11px;
  color: var(--text-faint);
  margin-top: 4px;
  font-style: italic;
}

.property-right { flex-shrink: 0; }
.contract-count-badge {
  background: var(--accent-dim);
  border: 1px solid rgba(0,212,255,0.15);
  border-radius: var(--radius-md);
  padding: 8px 12px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}
.count-num { font-size: 20px; font-weight: 800; color: var(--accent); line-height: 1; }
.count-label { font-size: 10px; color: var(--text-muted); font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }

.property-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  padding: 12px 18px;
  border-top: 1px solid var(--border-subtle);
  background: rgba(255,255,255,0.015);
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 9px 4px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  background: transparent;
  font-size: 12px;
  font-weight: 700;
  font-family: var(--font-sans);
  cursor: pointer;
  transition: all 0.15s var(--ease-out);
  color: var(--text-secondary);
}
.action-secondary:hover { background: rgba(255,255,255,0.06); border-color: var(--border-accent); color: var(--text-primary); }
.action-danger:hover { background: var(--danger-dim); border-color: rgba(255,69,96,0.3); color: var(--danger); }
</style>
