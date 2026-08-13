<script setup>
import { ref, onMounted } from 'vue'
import { getProperties, addProperty, updateProperty, deleteProperty, getContracts } from '../store.js'

const properties = ref([])
const showModal = ref(false)
const editing = ref(null)
const form = ref({ name: '', address: '', remark: '' })
const toast = ref('')

onMounted(() => refresh())

function refresh() {
  properties.value = getProperties()
}

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

function save() {
  if (!form.value.name.trim()) { showToast('请输入房源名称'); return }
  if (editing.value) {
    updateProperty(editing.value.id, form.value)
  } else {
    addProperty(form.value)
  }
  showModal.value = false
  refresh()
  showToast(editing.value ? '已更新' : '已添加')
}

function del(p) {
  if (!confirm(`确认删除「${p.name}」？\n关联合同和账单将一并删除。`)) return
  deleteProperty(p.id)
  refresh()
  showToast('已删除')
}

function getContractCount(propertyId) {
  return getContracts().filter(c => c.propertyId === propertyId).length
}

function showToast(msg) {
  toast.value = msg
  setTimeout(() => { toast.value = '' }, 2000)
}
</script>

<template>
  <div>
    <div class="page-header">
      <div class="page-title">🏢 房源管理</div>
      <button class="btn btn-primary btn-sm" style="width:auto;padding:8px 16px" @click="openAdd">+ 添加</button>
    </div>

    <div v-if="properties.length === 0" class="empty">
      <div class="empty-icon">🏢</div>
      <div class="empty-text">还没有房源，点击上方添加</div>
    </div>

    <div
      v-for="p in properties"
      :key="p.id"
      class="card"
      style="cursor:pointer"
      @click="openEdit(p)"
    >
      <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:8px">
        <div>
          <div style="font-size:16px;font-weight:600;margin-bottom:3px">{{ p.name }}</div>
          <div style="font-size:12px;color:var(--text-dim)">{{ p.address || '未填写地址' }}</div>
        </div>
        <div style="display:flex;gap:6px;align-items:center" @click.stop>
          <span class="badge badge-info">{{ getContractCount(p.id) }} 合同</span>
          <button class="btn btn-danger btn-sm" style="width:auto;padding:4px 10px;font-size:12px" @click="del(p)">删</button>
        </div>
      </div>
      <div v-if="p.remark" style="font-size:12px;color:var(--text-muted);margin-top:4px">备注：{{ p.remark }}</div>
    </div>

    <!-- 添加/编辑弹窗 -->
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
          <input v-model="form.remark" class="input" placeholder="可选" />
        </div>
        <div class="modal-actions">
          <button class="btn btn-secondary" @click="showModal=false">取消</button>
          <button class="btn btn-primary" @click="save">{{ editing ? '保存' : '添加' }}</button>
        </div>
      </div>
    </div>

    <div v-if="toast" class="toast">{{ toast }}</div>
  </div>
</template>
