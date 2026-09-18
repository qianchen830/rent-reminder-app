<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-sheet">
      <div class="modal-title">💰 确认收款</div>
      <div class="modal-subtitle">请确认以下账单已完成付款</div>

      <div v-if="bill" class="pay-detail-card">
        <!-- 租客房东信息 -->
        <div class="pay-info-grid">
          <div class="pay-info-item">
            <span class="pay-info-icon">👤</span>
            <div class="pay-info-text">
              <span class="pay-info-label">租客</span>
              <span class="pay-info-value">{{ bill.tenantName }}</span>
            </div>
          </div>
          <div class="pay-info-item">
            <span class="pay-info-icon">🏠</span>
            <div class="pay-info-text">
              <span class="pay-info-label">房源</span>
              <span class="pay-info-value">{{ bill.propertyName }}</span>
            </div>
          </div>
        </div>

        <!-- 账单标签 -->
        <div class="pay-tags">
          <span class="bill-type-tag" :class="bill.type === 'deposit' ? 'tag-purple' : 'tag-blue'">
            {{ bill.type === 'deposit' ? '🔒 质保金' : '🏷️ 租金' }}
          </span>
          <span class="pay-date-tag">📅 {{ bill.dueDate }} 到期</span>
        </div>

        <!-- 金额区 -->
        <div class="pay-amounts-row">
          <div class="pay-amount-block">
            <span class="pay-amount-name">账单金额</span>
            <span class="pay-amount-num">¥{{ (bill.amount || 0).toLocaleString() }}</span>
          </div>
          <div class="pay-amount-divider"></div>
          <div class="pay-amount-block">
            <span class="pay-amount-name">未收金额</span>
            <span class="pay-amount-num warn">¥{{ Math.max(0, (bill.amount || 0) - (bill.receivedAmount || 0)).toLocaleString() }}</span>
          </div>
        </div>

        <!-- 输入区 -->
        <div class="pay-inputs-row">
          <div class="pay-input-group">
            <span class="pay-input-label">实收金额</span>
            <input v-model="localReceived" class="input pay-input" type="number" />
          </div>
          <div class="pay-input-group">
            <span class="pay-input-label">收款日期</span>
            <input v-model="localPaidDate" class="input pay-input" type="date" />
          </div>
        </div>
      </div>

      <div class="modal-actions">
        <button class="btn btn-secondary" @click="$emit('close')">取消</button>
        <button class="btn btn-primary" @click="confirm">✓ 确认收款</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({ bill: { type: Object, default: null } })
const emit = defineEmits(['close', 'confirm'])

const localReceived = ref(0)
const localPaidDate = ref('')

watch(() => props.bill, (b) => {
  if (b) {
    localReceived.value = Math.max(0, (b.amount || 0) - (b.receivedAmount || 0))
    localPaidDate.value = b.paidDate || b.dueDate
  }
}, { immediate: true })

function confirm() {
  emit('confirm', { receivedAmount: localReceived.value, paidDate: localPaidDate.value })
}
</script>

<style scoped>
.pay-info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-bottom: 14px;
}
.pay-info-item {
  display: flex;
  align-items: center;
  gap: 10px;
  background: rgba(255,255,255,0.04);
  border-radius: 10px;
  padding: 10px 12px;
  border: 1px solid rgba(255,255,255,0.06);
}
.pay-info-icon {
  font-size: 20px;
  line-height: 1;
}
.pay-info-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.pay-info-label {
  font-size: 10px;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.pay-info-value {
  font-size: 13px;
  font-weight: 700;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.pay-tags {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 14px;
  flex-wrap: wrap;
}
.bill-type-tag {
  font-size: 12px;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 20px;
  background: rgba(0,212,255,0.12);
  color: #00d4ff;
  border: 1px solid rgba(0,212,255,0.2);
}
.tag-purple {
  background: rgba(124,77,255,0.12);
  color: #a78bfa;
  border-color: rgba(124,77,255,0.2);
}
.tag-blue {
  background: rgba(0,212,255,0.12);
  color: #00d4ff;
  border-color: rgba(0,212,255,0.2);
}
.pay-date-tag {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-muted);
}
.pay-amounts-row {
  display: flex;
  align-items: stretch;
  background: rgba(255,255,255,0.04);
  border-radius: 12px;
  margin-bottom: 14px;
  overflow: hidden;
  border: 1px solid rgba(255,255,255,0.06);
}
.pay-amount-block {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px 8px;
  gap: 4px;
}
.pay-amount-divider {
  width: 1px;
  background: rgba(255,255,255,0.08);
}
.pay-amount-name {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.pay-amount-num {
  font-size: 18px;
  font-weight: 800;
  color: var(--text-primary);
}
.pay-amount-num.warn {
  color: var(--warning);
}
.pay-inputs-row {
  display: flex;
  gap: 12px;
}
.pay-input-group {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.pay-input-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-muted);
}
.pay-input {
  width: 100%;
  box-sizing: border-box;
  font-size: 15px;
  font-weight: 700;
  text-align: center;
  padding: 10px 8px;
}
</style>
