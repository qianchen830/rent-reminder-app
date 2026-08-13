// 收租提醒 - 数据存储层 (localStorage)

const KEYS = {
  PROPERTIES: 'rent_properties',
  CONTRACTS: 'rent_contracts',
  BILLS: 'rent_bills',
  DEPOSITS: 'rent_deposits',
}

function load(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || '[]')
  } catch {
    return []
  }
}

function save(key, data) {
  localStorage.setItem(key, JSON.stringify(data))
}

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
}

// ── 房源 ──────────────────────────────────────
export function getProperties() {
  return load(KEYS.PROPERTIES)
}

export function addProperty(data) {
  const list = getProperties()
  const item = { id: genId(), ...data, createdAt: new Date().toISOString() }
  list.push(item)
  save(KEYS.PROPERTIES, list)
  return item
}

export function updateProperty(id, data) {
  const list = getProperties()
  const idx = list.findIndex(p => p.id === id)
  if (idx >= 0) { list[idx] = { ...list[idx], ...data }; save(KEYS.PROPERTIES, list) }
}

export function deleteProperty(id) {
  save(KEYS.PROPERTIES, getProperties().filter(p => p.id !== id))
  // 级联删除关联合同和账单
  save(KEYS.CONTRACTS, getContracts().filter(c => c.propertyId !== id))
  save(KEYS.BILLS, getBills().filter(b => b.propertyId !== id))
  save(KEYS.DEPOSITS, getDeposits().filter(d => d.propertyId !== id))
}

// ── 合同 ──────────────────────────────────────
export function getContracts() {
  return load(KEYS.CONTRACTS)
}

export function addContract(data) {
  const list = getContracts()
  const item = {
    id: genId(),
    status: 'active',
    createdAt: new Date().toISOString(),
    ...data,
  }
  list.push(item)
  save(KEYS.CONTRACTS, list)
  // 生成首期账单
  generateBillsForContract(item)
  return item
}

export function updateContract(id, data) {
  const list = getContracts()
  const idx = list.findIndex(c => c.id === id)
  if (idx >= 0) {
    list[idx] = { ...list[idx], ...data }
    save(KEYS.CONTRACTS, list)
  }
}

export function deleteContract(id) {
  save(KEYS.CONTRACTS, getContracts().filter(c => c.id !== id))
  save(KEYS.BILLS, getBills().filter(b => b.contractId !== id))
  save(KEYS.DEPOSITS, getDeposits().filter(d => d.contractId !== id))
}

// ── 账单 ──────────────────────────────────────
export function getBills() {
  return load(KEYS.BILLS)
}

export function addBill(data) {
  const list = getBills()
  const item = { id: genId(), status: 'pending', createdAt: new Date().toISOString(), ...data }
  list.push(item)
  save(KEYS.BILLS, list)
  return item
}

export function payBill(id) {
  const list = getBills()
  const idx = list.findIndex(b => b.id === id)
  if (idx >= 0) {
    list[idx].status = 'paid'
    list[idx].paidAt = new Date().toISOString()
    save(KEYS.BILLS, list)
  }
}

export function deleteBill(id) {
  save(KEYS.BILLS, getBills().filter(b => b.id !== id))
}

// ── 质保金 ──────────────────────────────────────
export function getDeposits() {
  return load(KEYS.DEPOSITS)
}

export function addDeposit(data) {
  const list = getDeposits()
  const item = { id: genId(), status: 'held', createdAt: new Date().toISOString(), ...data }
  list.push(item)
  save(KEYS.DEPOSITS, list)
  return item
}

export function updateDeposit(id, data) {
  const list = getDeposits()
  const idx = list.findIndex(d => d.id === id)
  if (idx >= 0) { list[idx] = { ...list[idx], ...data }; save(KEYS.DEPOSITS, list) }
}

export function deleteDeposit(id) {
  save(KEYS.DEPOSITS, getDeposits().filter(d => d.id !== id))
}

// ── 账单生成 ──────────────────────────────────────
export function generateBillsForContract(contract) {
  const start = new Date(contract.startDate)
  const end = new Date(contract.endDate)
  const cycle = contract.paymentCycle || 'monthly'
  const intervalMonths = cycle === 'monthly' ? 1 : cycle === 'quarterly' ? 3 : cycle === 'half_year' ? 6 : 12

  const existing = getBills().filter(b => b.contractId === contract.id)
  const generated = []

  let cur = new Date(start)
  // 跳过已过期的
  while (cur <= end) {
    const dueStr = cur.toISOString().slice(0, 10)
    const already = existing.find(b => b.dueDate === dueStr && b.type === 'rent')
    if (!already) {
      generated.push({
        id: genId(),
        contractId: contract.id,
        propertyId: contract.propertyId,
        tenantName: contract.tenantName,
        propertyName: contract.propertyName,
        dueDate: dueStr,
        amount: contract.rentAmount,
        type: 'rent',
        status: 'pending',
        createdAt: new Date().toISOString(),
      })
    }
    cur.setMonth(cur.getMonth() + intervalMonths)
  }

  // 质保金账单
  if (contract.depositAmount > 0 && !existing.find(b => b.type === 'deposit')) {
    generated.push({
      id: genId(),
      contractId: contract.id,
      propertyId: contract.propertyId,
      tenantName: contract.tenantName,
      propertyName: contract.propertyName,
      dueDate: contract.startDate,
      amount: contract.depositAmount,
      type: 'deposit',
      status: 'pending',
      createdAt: new Date().toISOString(),
    })
  }

  if (generated.length > 0) {
    save(KEYS.BILLS, [...getBills(), ...generated])
  }
  return generated
}

// ── 统计数据 ──────────────────────────────────────
export function getStats() {
  const bills = getBills()
  const contracts = getContracts()
  const now = new Date()
  const today = now.toISOString().slice(0, 10)

  const pending = bills.filter(b => b.status === 'pending')
  const overdue = pending.filter(b => b.dueDate < today && b.type === 'rent')
  const upcoming = pending.filter(b => b.dueDate >= today && b.type === 'rent')

  const totalPending = pending.reduce((s, b) => s + b.amount, 0)
  const totalOverdue = overdue.reduce((s, b) => s + b.amount, 0)

  const activeContracts = contracts.filter(c => c.status === 'active')

  return {
    totalPending,
    totalOverdue,
    pendingCount: pending.length,
    overdueCount: overdue.length,
    upcomingCount: upcoming.length,
    activeCount: activeContracts.length,
  }
}

// ── 付租周期文字 ──────────────────────────────────────
export function cycleText(cycle) {
  const map = { monthly: '月付', quarterly: '季付', half_year: '半年付', yearly: '年付' }
  return map[cycle] || cycle
}

// ── 初始化示例数据 ──────────────────────────────────────
export function initSampleData() {
  if (getContracts().length > 0) return

  // 添加示例房源
  const p1 = addProperty({ name: '星海花园 A栋301', address: '星海花园A栋301室', remark: '' })
  const p2 = addProperty({ name: '龙湖时代 5-2-1803', address: '龙湖时代小区5栋2单元1803', remark: '' })

  // 示例合同
  const c1 = addContract({
    propertyId: p1.id,
    propertyName: p1.name,
    tenantName: '李明',
    tenantPhone: '13812345678',
    rentAmount: 3500,
    depositAmount: 7000,
    paymentCycle: 'quarterly',
    startDate: '2025-01-01',
    endDate: '2025-12-31',
  })

  const c2 = addContract({
    propertyId: p2.id,
    propertyName: p2.name,
    tenantName: '王芳',
    tenantPhone: '13987654321',
    rentAmount: 4200,
    depositAmount: 8400,
    paymentCycle: 'monthly',
    startDate: '2025-03-01',
    endDate: '2026-02-28',
  })

  // 标记一些账单为已付
  const bills = getBills()
  if (bills.length > 0) {
    payBill(bills[0].id)
  }
}
