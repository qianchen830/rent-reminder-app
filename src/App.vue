<script setup>
import { ref, onMounted } from 'vue'
import HomePage from './pages/HomePage.vue'
import PropertyPage from './pages/PropertyPage.vue'
import ContractPage from './pages/ContractPage.vue'
import ProfilePage from './pages/ProfilePage.vue'
import { initSampleData } from './store.js'

const tab = ref('home')

onMounted(() => {
  initSampleData()
})

const tabs = [
  { key: 'home', label: '首页', icon: '🏠' },
  { key: 'property', label: '房源', icon: '🏢' },
  { key: 'contract', label: '合同', icon: '📋' },
  { key: 'profile', label: '我的', icon: '👤' },
]
</script>

<template>
  <div class="app-shell">
    <div class="page">
      <HomePage v-if="tab === 'home'" @change-tab="tab = 'contract'" />
      <PropertyPage v-if="tab === 'property'" />
      <ContractPage v-if="tab === 'contract'" />
      <ProfilePage v-if="tab === 'profile'" />
    </div>
    <nav class="tab-bar">
      <div
        v-for="t in tabs"
        :key="t.key"
        class="tab-item"
        :class="{ active: tab === t.key }"
        @click="tab = t.key"
      >
        <span class="tab-icon">{{ t.icon }}</span>
        <span>{{ t.label }}</span>
      </div>
    </nav>
  </div>
</template>

<style scoped>
.app-shell {
  height: 100%;
  display: flex;
  flex-direction: column;
}
</style>
