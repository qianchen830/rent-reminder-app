<script setup>
import { ref, onMounted } from 'vue'
import HomePage from './pages/HomePage.vue'
import PropertyPage from './pages/PropertyPage.vue'
import ContractPage from './pages/ContractPage.vue'
import ProfilePage from './pages/ProfilePage.vue'
import LoginPage from './pages/LoginPage.vue'
import AdminPage from './pages/AdminPage.vue'
import { getUser, logout } from './store.js'

const user = ref(getUser())
const currentTab = ref('home')
const showAdmin = ref(false)

function onLoginSuccess(data) {
  user.value = { username: data.username, role: data.role }
}

function onLogout() {
  logout()
  user.value = null
  showAdmin.value = false
  currentTab.value = 'home'
}

const tabs = [
  { key: 'home', label: '首页', icon: '🏠' },
  { key: 'property', label: '房源', icon: '🏢' },
  { key: 'contract', label: '合同', icon: '📋' },
  { key: 'profile', label: '我的', icon: '👤' },
]
</script>

<template>
  <!-- Not logged in -->
  <LoginPage v-if="!user" @login-success="onLoginSuccess" />

  <!-- Admin panel -->
  <AdminPage v-else-if="showAdmin" @back="showAdmin = false" :user="user" @logout="onLogout" />

  <!-- Main app -->
  <div v-else class="app-shell">
    <div class="page">
      <HomePage v-if="currentTab === 'home'" @change-tab="currentTab = 'contract'" />
      <PropertyPage v-if="currentTab === 'property'" />
      <ContractPage v-if="currentTab === 'contract'" />
      <ProfilePage v-if="currentTab === 'profile'" @logout="onLogout" @open-admin="showAdmin = true" />
    </div>
    <nav class="tab-bar">
      <div
        v-for="t in tabs"
        :key="t.key"
        class="tab-item"
        :class="{ active: currentTab === t.key }"
        @click="currentTab = t.key"
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
.page {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  padding-bottom: 72px;
}
</style>
