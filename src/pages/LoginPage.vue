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
    <!-- Ambient animated background orbs -->
    <div class="orb orb-1"></div>
    <div class="orb orb-2"></div>
    <div class="orb orb-3"></div>
    <div class="grid-overlay"></div>

    <!-- Top branding -->
    <div class="login-top">
      <div class="brand-icon-wrap">
        <span class="brand-icon">🏠</span>
        <div class="brand-glow"></div>
      </div>
      <div class="brand-name">收租提醒</div>
      <div class="brand-tag">PRO · 智能资产管理平台</div>
    </div>

    <!-- Login card -->
    <div class="login-card">
      <!-- Card header -->
      <div class="login-card-header">
        <div class="login-card-title">欢迎回来</div>
        <div class="login-card-sub">登录以继续管理您的资产</div>
      </div>

      <!-- Animated gradient divider -->
      <div class="login-divider">
        <div class="login-divider-line"></div>
        <div class="login-divider-dot"></div>
        <div class="login-divider-line"></div>
      </div>

      <!-- Form -->
      <div class="login-form">
        <div class="field">
          <label class="field-label">用户名</label>
          <div class="field-wrap">
            <span class="field-icon">👤</span>
            <input
              v-model="form.username"
              class="field-input"
              placeholder="输入用户名"
              autocomplete="username"
              @keyup.enter="submit"
            />
          </div>
        </div>

        <div class="field">
          <label class="field-label">密码</label>
          <div class="field-wrap">
            <span class="field-icon">🔒</span>
            <input
              v-model="form.password"
              type="password"
              class="field-input"
              placeholder="输入密码"
              autocomplete="current-password"
              @keyup.enter="submit"
            />
          </div>
        </div>

        <div v-if="error" class="login-error">
          <span>⚠️</span> {{ error }}
        </div>

        <button class="btn-login" :disabled="loading" @click="submit">
          <span v-if="loading" class="spinner"></span>
          <span v-else>
            <span class="login-btn-text">登 录</span>
            <span class="login-btn-arrow">→</span>
          </span>
        </button>


      </div>
    </div>

    <!-- Footer -->
    <div class="login-footer">
      <div class="login-footer-text">
        <span class="pulse-dot" style="background: var(--success)"></span>
        系统运行正常 · v2.0 PRO
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-wrap {
  min-height: 100vh;
  background: var(--bg-void);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
  padding: 24px 16px;
}

/* Animated background orbs */
.orb {
  position: absolute;
  border-radius: 50%;
  pointer-events: none;
  filter: blur(80px);
  animation: orbFloat 12s ease-in-out infinite;
}
.orb-1 {
  width: 400px; height: 400px;
  background: radial-gradient(circle, rgba(0,212,255,0.12) 0%, transparent 70%);
  top: -100px; right: -80px;
  animation-delay: 0s;
}
.orb-2 {
  width: 350px; height: 350px;
  background: radial-gradient(circle, rgba(124,77,255,0.10) 0%, transparent 70%);
  bottom: -80px; left: -60px;
  animation-delay: -4s;
}
.orb-3 {
  width: 250px; height: 250px;
  background: radial-gradient(circle, rgba(0,230,118,0.06) 0%, transparent 70%);
  top: 40%; left: 10%;
  animation-delay: -8s;
}

@keyframes orbFloat {
  0%, 100% { transform: translate(0, 0) scale(1); }
  33% { transform: translate(20px, -20px) scale(1.05); }
  66% { transform: translate(-15px, 15px) scale(0.95); }
}

/* Grid overlay */
.grid-overlay {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px);
  background-size: 40px 40px;
  pointer-events: none;
}

/* Top branding */
.login-top {
  text-align: center;
  margin-bottom: 32px;
  position: relative;
  z-index: 2;
}

.brand-icon-wrap {
  display: inline-block;
  position: relative;
  margin-bottom: 12px;
}

.brand-icon {
  font-size: 48px;
  display: block;
  position: relative;
  z-index: 1;
  filter: drop-shadow(0 0 20px rgba(0,212,255,0.5));
}

.brand-glow {
  position: absolute;
  inset: -10px;
  background: radial-gradient(circle, rgba(0,212,255,0.2) 0%, transparent 70%);
  border-radius: 50%;
  z-index: 0;
  animation: glowPulse 3s ease-in-out infinite;
}

@keyframes glowPulse {
  0%, 100% { opacity: 0.6; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.15); }
}

.brand-name {
  font-size: 28px;
  font-weight: 800;
  color: #fff;
  letter-spacing: 2px;
  margin-bottom: 6px;
  background: linear-gradient(135deg, #ffffff 0%, rgba(0,212,255,0.9) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.brand-tag {
  font-size: 11px;
  color: rgba(0,212,255,0.5);
  letter-spacing: 4px;
  text-transform: uppercase;
  font-weight: 600;
}

/* Login card */
.login-card {
  position: relative;
  z-index: 10;
  width: 100%;
  max-width: 380px;
  background: rgba(11, 13, 36, 0.9);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: var(--radius-2xl);
  padding: 32px 28px;
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  box-shadow:
    0 24px 60px rgba(0,0,0,0.7),
    0 0 0 1px rgba(255,255,255,0.04) inset,
    0 1px 0 rgba(255,255,255,0.08) inset;
}

.login-card-header {
  text-align: center;
  margin-bottom: 24px;
}

.login-card-title {
  font-size: 24px;
  font-weight: 800;
  color: var(--text-primary);
  margin-bottom: 6px;
  letter-spacing: -0.3px;
}

.login-card-sub {
  font-size: 13px;
  color: var(--text-muted);
  font-weight: 500;
}

/* Animated divider */
.login-divider {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 28px;
}
.login-divider-line {
  flex: 1;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(0,212,255,0.3), transparent);
}
.login-divider-dot {
  width: 6px; height: 6px;
  border-radius: 50%;
  background: var(--accent);
  box-shadow: 0 0 10px var(--accent);
  animation: dotPulse 2s ease-in-out infinite;
}
@keyframes dotPulse {
  0%, 100% { opacity: 1; box-shadow: 0 0 8px var(--accent); }
  50% { opacity: 0.5; box-shadow: 0 0 4px var(--accent); }
}

/* Form */
.login-form {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.field {}
.field-label {
  display: block;
  font-size: 11px;
  font-weight: 700;
  color: var(--text-muted);
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.field-wrap {
  position: relative;
}

.field-icon {
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 15px;
  pointer-events: none;
  opacity: 0.6;
}

.field-input {
  width: 100%;
  padding: 14px 16px 14px 42px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: var(--radius-md);
  color: var(--text-primary);
  font-size: 14px;
  font-family: var(--font-sans);
  outline: none;
  transition: all 0.2s var(--ease-out);
}
.field-input::placeholder { color: var(--text-faint); }
.field-input:focus {
  border-color: rgba(0,212,255,0.5);
  background: rgba(0,212,255,0.04);
  box-shadow: 0 0 0 3px rgba(0,212,255,0.08), 0 0 20px rgba(0,212,255,0.1);
}

.login-error {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 11px 14px;
  background: var(--danger-dim);
  border: 1px solid rgba(255,69,96,0.2);
  border-radius: var(--radius-md);
  font-size: 13px;
  font-weight: 600;
  color: var(--danger);
}

.btn-login {
  width: 100%;
  padding: 15px;
  background: linear-gradient(135deg, var(--accent) 0%, var(--accent-2) 100%);
  border: none;
  border-radius: var(--radius-md);
  color: #020714;
  font-size: 15px;
  font-weight: 800;
  font-family: var(--font-sans);
  cursor: pointer;
  transition: all 0.25s var(--ease-out);
  box-shadow: 0 4px 20px rgba(0,212,255,0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  letter-spacing: 2px;
  margin-top: 4px;
  position: relative;
  overflow: hidden;
}

.btn-login::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(255,255,255,0.2) 0%, transparent 50%);
  opacity: 0;
  transition: opacity 0.2s;
}

.btn-login:hover:not(:disabled)::before { opacity: 1; }

.btn-login:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 30px rgba(0,212,255,0.5);
}

.btn-login:active:not(:disabled) {
  transform: translateY(0);
  box-shadow: 0 2px 12px rgba(0,212,255,0.3);
}

.btn-login:disabled { opacity: 0.6; cursor: not-allowed; }

.login-btn-text { letter-spacing: 4px; }
.login-btn-arrow { font-size: 16px; transition: transform 0.2s; }
.btn-login:hover .login-btn-arrow { transform: translateX(3px); }

.spinner {
  display: inline-block;
  width: 18px; height: 18px;
  border: 2.5px solid rgba(0,0,0,0.2);
  border-top-color: #020714;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.login-hint {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 12px;
  color: var(--text-faint);
  margin-top: 2px;
}
.hint-label { color: var(--text-muted); font-weight: 600; }
.hint-divider { color: var(--text-faint); }
.hint-value { font-size: 11px; }

/* Footer */
.login-footer {
  position: relative;
  z-index: 2;
  margin-top: 32px;
}
.login-footer-text {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  color: var(--text-faint);
  font-weight: 500;
  letter-spacing: 0.3px;
}
</style>
