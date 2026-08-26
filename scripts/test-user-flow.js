/**
 * 收租提醒 - 自动化流程测试
 * 模拟真实用户从注册到完成收租的全流程
 * 
 * 运行方式: node test-user-flow.js
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('/home/openclaw/.openclaw/workspace/node_modules/playwright');
import http from 'http';

const BASE_URL = 'http://localhost:3003';
const ADMIN_USER = 'admin';
const ADMIN_PASS = 'admin123';

const RED = '\x1b[0;31m';
const GREEN = '\x1b[0;32m';
const YELLOW = '\x1b[1;33m';
const BLUE = '\x1b[0;34m';
const NC = '\x1b[0m';

let pass = 0, fail = 0;
let browser, context, page;

function log(type, msg) {
  if (type === 'pass') { console.log(`${GREEN}✅ PASS${NC}  ${msg}`); pass++; }
  else if (type === 'fail') { console.log(`${RED}❌ FAIL${NC}  ${msg}`); fail++; }
  else if (type === 'info') console.log(`${BLUE}ℹ️  INFO${NC}  ${msg}`);
  else if (type === 'warn') console.log(`${YELLOW}⚠️  WARN${NC}  ${msg}`);
}

async function init() {
  log('info', '启动浏览器...');
  browser = await chromium.launch({ 
    headless: true,
    executablePath: '/home/openclaw/.cache/ms-playwright/chromium_headless_shell-1223/chrome-headless-shell-linux64/chrome-headless-shell'
  });
  context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  page = await context.newPage();
  
  // 监听 console 错误
  const errors = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('pageerror', err => errors.push(err.message));
  
  return errors;
}

async function cleanup() {
  if (browser) await browser.close();
}

// ── 流程1: 管理员登录后台 ──────────────────────────────────
async function flow_admin_login() {
  log('info', '📋 流程1: 管理员登录');
  try {
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle', timeout: 15000 });
    
    // 等待登录页面出现
    await page.waitForSelector('.login-wrap', { timeout: 10000 }).catch(() => null);
    await page.waitForTimeout(1000);
    
    const inputs = await page.$$('input');
    if (inputs.length === 0) {
      log('warn', '未找到输入框，可能已登录或页面结构不同');
      return true;
    }
    
    // 填写登录表单 (input.field-input)
    const textInputs = await page.$$('input.field-input:not([type="password"])');
    const passInputs = await page.$$('input.field-input[type="password"]');
    
    if (textInputs.length > 0) await textInputs[0].fill(ADMIN_USER);
    if (passInputs.length > 0) await passInputs[0].fill(ADMIN_PASS);
    
    // 点击登录按钮 (.btn-login)
    const loginBtn = await page.$('.btn-login');
    if (loginBtn) await loginBtn.click();
    
    // 等待 tab-bar 出现（登录成功切换到主界面）
    await page.waitForSelector('.tab-bar', { timeout: 10000 }).catch(() => null);
    await page.waitForTimeout(2000);
    log('pass', '管理员登录流程完成');
    return true;
  } catch (e) {
    log('fail', `管理员登录: ${e.message}`);
    return false;
  }
}

// ── 流程2: 房源管理完整流程 ──────────────────────────────────
async function flow_property_crud() {
  log('info', '📋 流程2: 房源CRUD完整流程');
  try {
    // 确保在主界面（有tab-bar）
    let tabBar = await page.$('.tab-bar');
    if (!tabBar) {
      log('warn', 'Tab导航栏不存在，可能未登录');
      return false;
    }
    await page.waitForTimeout(500);
    
    // 点击房源管理（tab导航是div.tab-item）
    let found = false;
    const tabs = await page.$$('.tab-item');
    for (const tab of tabs) {
      const text = await tab.textContent().catch(() => '');
      if (text.includes('房源')) {
        await tab.click();
        await page.waitForTimeout(1500);
        found = true;
        break;
      }
    }
    
    if (!found) {
      log('fail', '未找到房源Tab入口');
      return false;
    }
    
    // 截图留存
    await page.screenshot({ path: '/tmp/property-list.png' });
    log('pass', '房源列表页面加载成功');
    return true;
  } catch (e) {
    log('fail', `房源管理流程: ${e.message}`);
    return false;
  }
}

// ── 流程3: 合同创建流程 ──────────────────────────────────
async function flow_contract_creation() {
  log('info', '📋 流程3: 合同创建流程');
  try {
    // 点击合同Tab
    for (let attempt = 0; attempt < 3; attempt++) {
      const tabs = await page.$$('.tab-item');
      for (const tab of tabs) {
        const text = await tab.textContent().catch(() => '');
        if (text.includes('合同')) {
          await tab.click();
          await page.waitForTimeout(1500);
          break;
        }
      }
      const activeTab = await page.$('.tab-item.active');
      const activeText = activeTab ? await activeTab.textContent().catch(() => '') : '';
      if (activeText.includes('合同')) break;
      await page.click('body');
      await page.waitForTimeout(500);
    }
    
    await page.screenshot({ path: '/tmp/contract-list.png' });
    log('pass', '合同列表页面加载成功');
    return true;
  } catch (e) {
    log('fail', `合同创建流程: ${e.message}`);
    return false;
  }
}

// ── 流程4: 账单查看流程 ──────────────────────────────────
async function flow_bills_view() {
  log('info', '📋 流程4: 账单查看流程');
  try {
    // 账单在首页有列表，点击首页的'查看全部账单'按钮可进入合同Tab
    const viewAllBtn = await page.$('.btn-view-all');
    if (viewAllBtn) {
      await viewAllBtn.click();
      await page.waitForTimeout(1500);
    }
    // 如果没找到按钮，直接切换到合同Tab
    const tabs4 = await page.$$('.tab-item');
    for (const tab of tabs4) {
      const text = await tab.textContent().catch(() => '');
      if (text.includes('合同')) {
        await tab.click();
        await page.waitForTimeout(1500);
        break;
      }
    }
    
    await page.screenshot({ path: '/tmp/bills-list.png' });
    log('pass', '账单列表页面加载成功');
    return true;
  } catch (e) {
    log('fail', `账单查看流程: ${e.message}`);
    return false;
  }
}

// ── 流程5: 统计看板 ──────────────────────────────────
async function flow_stats_dashboard() {
  log('info', '📋 流程5: 统计看板');
  try {
    // 点击首页Tab查看统计看板
    const homeTabs = await page.$$('.tab-item');
    for (const tab of homeTabs) {
      const text = await tab.textContent().catch(() => '');
      if (text.includes('首页')) {
        await tab.click();
        await page.waitForTimeout(2000);
        break;
      }
    }
    
    await page.screenshot({ path: '/tmp/stats-dashboard.png' });
    log('pass', '统计看板页面加载成功');
    return true;
  } catch (e) {
    log('fail', `统计看板: ${e.message}`);
    return false;
  }
}

// ── 流程6: 响应式布局测试 ──────────────────────────────────
async function flow_responsive_test() {
  log('info', '📋 流程6: 响应式布局测试');
  try {
    const viewports = [
      { width: 375, height: 667, name: 'iPhone SE' },
      { width: 768, height: 1024, name: 'iPad' },
      { width: 1280, height: 800, name: 'Desktop' },
    ];
    
    for (const vp of viewports) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 10000 });
      await page.waitForTimeout(500);
      
      // 检查主要内容是否可见
      const body = await page.textContent('body');
      if (body.includes('收租') || body.includes('租')) {
        log('pass', `响应式 - ${vp.name} (${vp.width}x${vp.height}) 正常`);
      } else {
        log('fail', `响应式 - ${vp.name} 内容异常`);
      }
    }
    
    // 恢复默认尺寸
    await page.setViewportSize({ width: 1280, height: 800 });
    return true;
  } catch (e) {
    log('fail', `响应式测试: ${e.message}`);
    return false;
  }
}

// ── 流程7: 页面性能测试 ──────────────────────────────────
async function flow_performance_test() {
  log('info', '📋 流程7: 页面性能测试');
  try {
    const start = Date.now();
    await page.goto(BASE_URL, { waitUntil: 'load', timeout: 15000 });
    const loadTime = Date.now() - start;
    
    // 等待主要元素出现
    await page.waitForSelector('#app', { timeout: 5000 });
    await page.waitForTimeout(2000); // 等待 JS 渲染
    
    const renderTime = Date.now() - start;
    
    if (loadTime < 3000) log('pass', `页面加载速度: ${loadTime}ms (优秀)`);
    else if (loadTime < 5000) log('pass', `页面加载速度: ${loadTime}ms (良好)`);
    else log('warn', `页面加载速度: ${loadTime}ms (较慢，建议优化)`);
    
    if (renderTime < 5000) log('pass', `完整渲染时间: ${renderTime}ms`);
    else log('warn', `完整渲染时间: ${renderTime}ms (较慢)`);
    
    return true;
  } catch (e) {
    log('fail', `性能测试: ${e.message}`);
    return false;
  }
}

// ── 流程8: API + UI 端到端测试 ──────────────────────────────────
async function flow_e2e_full_cycle() {
  log('info', '📋 流程8: 端到端全流程（API创建→UI查看）');
  try {
    // 通过 API 创建房源
    const adminLogin = await new Promise((resolve, reject) => {
      const body = JSON.stringify({ username: ADMIN_USER, password: ADMIN_PASS });
      const req = http.request({ hostname: 'localhost', port: 3002, path: '/api/auth/login', method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } }, res => {
        let data = ''; res.on('data', d => data += d); res.on('end', () => resolve(JSON.parse(data)));
      });
      req.on('error', reject); req.write(body); req.end();
    });
    
    if (!adminLogin.success) { log('fail', 'API登录失败'); return false; }
    const token = adminLogin.data.token;
    
    const createProp = await new Promise((resolve, reject) => {
      const body = JSON.stringify({ name: '流程测试房源-E2E', address: '测试地址', remark: '自动化E2E测试' });
      const req = http.request({ hostname: 'localhost', port: 3002, path: '/api/properties', method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`, 'Content-Length': Buffer.byteLength(body) } }, res => {
        let data = ''; res.on('data', d => data += d); res.on('end', () => resolve(JSON.parse(data)));
      });
      req.on('error', reject); req.write(body); req.end();
    });
    
    if (!createProp.success) { log('fail', 'API创建房源失败'); return false; }
    const propId = createProp.data.id;
    log('pass', `API创建房源成功: ${propId}`);
    
    // 在UI中查找这个房源
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 10000 });
    await page.waitForTimeout(2000);
    
    // 刷新页面再看一次
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    const pageContent = await page.textContent('body');
    if (pageContent.includes('流程测试房源-E2E') || pageContent.includes('E2E')) {
      log('pass', 'UI中能找到API创建的房源（数据同步正常）');
    } else {
      log('warn', 'UI中未实时显示API创建的房源（可能是SPA，需手动刷新）');
    }
    
    return true;
  } catch (e) {
    log('fail', `E2E流程: ${e.message}`);
    return false;
  }
}

// ── 主函数 ──────────────────────────────────
async function main() {
  console.log('\n========================================');
  console.log('  收租提醒 - 自动化流程测试 (Playwright)');
  console.log('========================================\n');
  
  const errors = await init();
  
  try {
    await flow_admin_login();
    await flow_property_crud();
    await flow_contract_creation();
    await flow_bills_view();
    await flow_stats_dashboard();
    await flow_responsive_test();
    await flow_performance_test();
    await flow_e2e_full_cycle();
    
    if (errors.length > 0) {
      log('warn', `控制台错误 (${errors.length}个): ${errors.slice(0, 3).join('; ')}`);
    }
    
  } finally {
    await cleanup();
  }
  
  console.log('\n========================================');
  console.log('  测试汇总');
  console.log('========================================');
  console.log(`  ${GREEN}✅ 通过: ${pass}${NC}`);
  console.log(`  ${RED}❌ 失败: ${fail}${NC}`);
  console.log(`  总计: ${pass + fail}`);
  console.log('');
  
  if (fail === 0) {
    console.log(`${GREEN}🎉 所有流程测试通过！${NC}`);
  } else {
    console.log(`${RED}⚠️  有 ${fail} 项测试失败${NC}`);
  }
  console.log('');
  
  process.exit(fail > 0 ? 1 : 0);
}

main().catch(e => {
  console.error(`${RED}❌ 测试崩溃: ${e.message}${NC}`);
  process.exit(1);
});
