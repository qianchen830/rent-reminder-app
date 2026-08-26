import { createApp } from 'vue'
import './style.css'
import App from './App.vue'

const app = createApp(App)

// JPush 初始化（等待 Cordova ready）
function initJPush() {
  if (window.JPush) {
    window.JPush.init()
    window.Jush = window.JPush

    // 获取 RegistrationID（设备唯一标识）
    window.JPush.getRegistrationID((rid) => {
      if (rid && rid !== '') {
        console.log('[JPush] RegistrationID:', rid)
        localStorage.setItem('jpush_rid', rid)
      }
    })

    // 设置标签/别名（可选，按用户分群）
    window.JPush.setAlias({ sequence: 1, alias: 'renter' })

    console.log('[JPush] Initialized successfully')
  }
}

// 监听设备就绪事件
document.addEventListener('deviceready', initJPush, false)

// 如果已经 ready，直接初始化
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  setTimeout(initJPush, 500)
}

app.mount('#app')
