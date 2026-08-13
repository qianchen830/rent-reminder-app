# 收租提醒 APK

一款运行在安卓手机上的收租管理工具，数据全部存储在本地，无需联网，无需注册，开箱即用。

## 功能特性

- 🏠 **首页仪表盘**：待收总额、到期笔数、逾期数，一目了然
- 🏢 **房源管理**：增删改查，支持多套房源
- 📋 **合同管理**：支持月付/季付/半年付/年付，自动生成账单
- 💰 **账单管理**：一键标记已付款，支持按合同查看
- 🔐 **质保金管理**：查看状态，可转租金或退还
- 📤 **数据导出**：可导出 JSON 备份
- 🌙 **深色主题**：琥珀金配色，护眼省电

## 技术栈

- **前端框架**：Vue 3 + Vite
- **移动端框架**：Capacitor
- **数据存储**：localStorage（完全离线，无需后端）
- **构建方式**：GitHub Actions 在线构建 APK

## 如何获取 APK

### 方式一：GitHub Actions 自动构建（推荐）

1. **Fork 本仓库**到你的 GitHub 账号
2. 在你的仓库中点击 **Actions** → **Build Android APK** → **Run workflow**
3. 构建完成后在 Artifacts 中下载 `rent-reminder-debug.apk`
4. 将 APK 传到手机安装即可

### 方式二：本地构建（需要 Android Studio）

**环境要求：**
- Node.js 18+
- Android Studio（包含 Android SDK）
- JDK 17

**构建步骤：**

```bash
# 1. 克隆项目
git clone https://github.com/YOUR_USERNAME/rent-reminder-app.git
cd rent-reminder-app

# 2. 安装依赖
npm install

# 3. 安装 Capacitor
npm install @capacitor/core @capacitor/cli @capacitor/android

# 4. 初始化（仅首次）
npx cap init "收租提醒" "com.rent.reminder" --web-dir=dist

# 5. 添加 Android 平台
npx cap add android

# 6. 构建 Web 应用
npm run build

# 7. 同步到 Android
npx cap sync android

# 8. 用 Android Studio 打开
# Android Studio 菜单 → Open → 选择项目中的 android 文件夹
# 然后点击 Build → Build Bundle(s) / APK(s) → Build APK(s)
# APK 输出位置：android/app/build/outputs/apk/debug/app-debug.apk
```

## 项目结构

```
rent-reminder-app/
├── src/
│   ├── main.js           # 入口
│   ├── App.vue           # 根组件 + 底部导航
│   ├── style.css         # 全局样式（深色主题）
│   ├── store.js         # 数据存储层
│   └── pages/
│       ├── HomePage.vue      # 首页仪表盘
│       ├── PropertyPage.vue  # 房源管理
│       ├── ContractPage.vue  # 合同管理
│       └── ProfilePage.vue   # 我的（质保金/数据管理）
├── android/              # Android 原生项目（Capacitor 生成）
├── capacitor.config.json # Capacitor 配置
└── .github/workflows/
    └── android.yml       # GitHub Actions 构建配置
```

## 数据说明

所有数据存储在手机浏览器的 localStorage 中：
- 更换手机或清除浏览器数据会导致数据丢失
- 建议定期使用「我的 → 导出数据」进行备份
- 导入功能：将导出的 JSON 文件内容复制到浏览器控制台执行即可

## 隐私说明

本 APP：
- ❌ 不收集任何个人信息
- ❌ 不需要网络权限
- ❌ 不需要任何账号注册
- ✅ 所有数据仅存储在您自己的设备上

## UI 预览配色

| 元素 | 颜色 |
|------|------|
| 背景 | #0a0e1a |
| 卡片 | #111827 |
| 强调色 | #f59e0b（琥珀金） |
| 成功 | #10b981 |
| 危险/逾期 | #ef4444 |
| 文字主色 | #f3f4f6 |
| 文字次要 | #9ca3af |
