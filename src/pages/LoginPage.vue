<script setup>
import { ref, reactive } from 'vue'
import { login } from '../store.js'

const emit = defineEmits(['login-success'])
const form = reactive({ username: '', password: '' })
const loading = ref(false)
const error = ref('')

async function submit() {
  error.value = ''
  if (!form.username || !form.password) { error.value = '请输入用户名和密码'; return }
  loading.value = true
  try {
    const data = await login(form.username, form.password)
    emit('login-success', data)
  } catch (e) {
    error.value = e.message || '登录失败，请检查用户名和密码'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login-wrap">
    <!-- Ambient glow -->
    <div class="glow glow-1"></div>
    <div class="glow glow-2"></div>

    <div class="login-card">
      <!-- Logo -->
      <div class="brand">
        <div class="brand-icon">🏠</div>
        <div class="brand-name">收租提醒</div>
        <div class="brand-tag">智能资产管理</div>
      </div>

      <!-- Divider -->
      <div class="divider"></div>

      <!-- Form -->
      <div class="form">
        <div class="field">
          <div class="field-label">用户名</div>
          <input
            v-model="form.username"
            class="field-input"
            placeholder="请输入用户名"
            autocomplete="username"
            @keyup.enter="submit"
          />
        </div>

        <div class="field">
          <div class="field-label">密码</div>
          <input
            v-model="form.password"
            type="password"
            class="field-input"
            placeholder="请输入密码"
            autocomplete="current-password"
            @keyup.enter="submit"
          />
        </div>

        <div v-if="error" class="error">{{ error }}</div>

        <button class="btn-login" :disabled="loading" @click="submit">
          <span v-if="loading" class="spinner"></span>
          <span v-else>登 录</span>
        </button>

        <div class="hint">admin / admin123</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-wrap {
  min-height: 100vh;
  background: #080c14;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
}

.glow {
  position: absolute;
  border-radius: 50%;
  pointer-events: none;
}
.glow-1 {
  width: 500px; height: 500px;
  background: radial-gradient(circle, rgba(0,212,255,0.08) 0%, transparent 70%);
  top: -150px; right: -100px;
}
.glow-2 {
  width: 400px; height: 400px;
  background: radial-gradient(circle, rgba(124,77,255,0.07) 0%, transparent 70%);
  bottom: -100px; left: -80px;
}

.login-card {
  position: relative;
  z-index: 10;
  width: 360px;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 16px;
  padding: 40px 32px;
  backdrop-filter: blur(20px);
}

.brand {
  text-align: center;
  margin-bottom: 28px;
}
.brand-icon {
  font-size: 36px;
  margin-bottom: 10px;
}
.brand-name {
  font-size: 20px;
  font-weight: 700;
  color: #fff;
  letter-spacing: 1px;
}
.brand-tag {
  font-size: 12px;
  color: rgba(0,212,255,0.5);
  margin-top: 4px;
  letter-spacing: 3px;
  text-transform: uppercase;
}

.divider {
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(0,212,255,0.2), transparent);
  margin-bottom: 28px;
}

.form { display: flex; flex-direction: column; gap: 16px; }

.field {}
.field-label {
  font-size: 12px;
  color: rgba(255,255,255,0.4);
  margin-bottom: 8px;
  font-weight: 500;
  letter-spacing: 0.5px;
}
.field-input {
  width: 100%;
  padding: 12px 14px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 8px;
  color: #fff;
  font-size: 14px;
  font-family: inherit;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.field-input::placeholder { color: rgba(255,255,255,0.2); }
.field-input:focus {
  border-color: rgba(0,212,255,0.5);
  box-shadow: 0 0 0 3px rgba(0,212,255,0.08);
}

.error {
  color: #ff6b6b;
  font-size: 12px;
  padding: 8px 12px;
  background: rgba(255,107,107,0.08);
  border: 1px solid rgba(255,107,107,0.2);
  border-radius: 6px;
}

.btn-login {
  width: 100%;
  padding: 13px;
  background: #00d4ff;
  border: none;
  border-radius: 8px;
  color: #000;
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 3px;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.2s;
  margin-top: 4px;
}
.btn-login:hover:not(:disabled) { background: #00bce8; }
.btn-login:disabled { opacity: 0.5; cursor: not-allowed; }

.spinner {
  display: inline-block;
  width: 16px; height: 16px;
  border: 2px solid rgba(0,0,0,0.3);
  border-top-color: #000;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.hint {
  text-align: center;
  font-size: 11px;
  color: rgba(255,255,255,0.2);
  margin-top: 2px;
}
</style>
