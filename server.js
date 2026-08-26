import express from 'express'
import cors from 'cors'
import Database from 'better-sqlite3'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import fs from 'fs'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = 3002
const JWT_SECRET = 'rent-reminder-secret-2026'
const JWT_EXPIRES = '7d'

app.use(cors())
app.use(express.json())

// Database
const dbPath = join(__dirname, 'rent_reminder.db')
const db = new Database(dbPath)

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS rent_users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'user',
    createdAt TEXT DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS rent_properties (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    address TEXT DEFAULT '',
    remark TEXT DEFAULT '',
    createdAt TEXT DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS rent_contracts (
    id TEXT PRIMARY KEY,
    propertyId TEXT NOT NULL,
    propertyName TEXT NOT NULL,
    tenantName TEXT NOT NULL,
    tenantPhone TEXT DEFAULT '',
    rentAmount REAL NOT NULL,
    depositAmount REAL DEFAULT 0,
    paymentCycle TEXT DEFAULT 'monthly',
    startDate TEXT NOT NULL,
    endDate TEXT NOT NULL,
    status TEXT DEFAULT 'active',
    createdAt TEXT DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS rent_bills (
    id TEXT PRIMARY KEY,
    contractId TEXT NOT NULL,
    propertyId TEXT NOT NULL,
    tenantName TEXT NOT NULL,
    propertyName TEXT NOT NULL,
    dueDate TEXT NOT NULL,
    amount REAL NOT NULL,
    type TEXT DEFAULT 'rent',
    status TEXT DEFAULT 'pending',
    paidAt TEXT DEFAULT '',
    createdAt TEXT DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS rent_deposits (
    id TEXT PRIMARY KEY,
    contractId TEXT NOT NULL,
    propertyId TEXT NOT NULL,
    propertyName TEXT NOT NULL,
    tenantName TEXT NOT NULL,
    amount REAL NOT NULL,
    status TEXT DEFAULT 'held',
    remark TEXT DEFAULT '',
    createdAt TEXT DEFAULT ''
  );
`)

// Seed default admin
const adminExists = db.prepare('SELECT id FROM rent_users WHERE role=?').get('admin')
if (!adminExists) {
  const hash = bcrypt.hashSync('admin123', 10)
  db.prepare('INSERT INTO rent_users (id, username, password, role, createdAt) VALUES (?, ?, ?, ?, ?)')
    .run('admin', 'admin', hash, 'admin', new Date().toISOString())
  console.log('[rent-reminder] Default admin created: admin / admin123')
}

// ── Helpers ──────────────────────────────────
function ok(res, data) { res.json({ success: true, data }) }
function fail(res, status, msg) { res.status(status).json({ success: false, error: msg }) }

// JWT middleware
function auth(req, res, next) {
  const header = req.headers.authorization
  if (!header || !header.startsWith('Bearer '))
    return fail(res, 401, 'Unauthorized')
  try {
    const token = header.slice(7)
    const payload = jwt.verify(token, JWT_SECRET)
    req.user = payload
    next()
  } catch {
    return fail(res, 401, 'Invalid token')
  }
}

function adminOnly(req, res, next) {
  if (req.user.role !== 'admin') return fail(res, 403, 'Admin only')
  next()
}

// ── Auth ──────────────────────────────────
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body
    if (!username || !password) return fail(res, 400, 'Missing credentials')
    const user = db.prepare('SELECT * FROM rent_users WHERE username=?').get(username)
    if (!user) return fail(res, 401, 'Invalid username or password')
    const valid = await bcrypt.compare(password, user.password)
    if (!valid) return fail(res, 401, 'Invalid username or password')
    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES })
    ok(res, { token, username: user.username, role: user.role })
  } catch (e) { fail(res, 500, e.message) }
})

app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password } = req.body
    if (!username || !password) return fail(res, 400, 'Missing credentials')
    if (username === 'admin') return fail(res, 400, 'Username not allowed')
    const existing = db.prepare('SELECT id FROM rent_users WHERE username=?').get(username)
    if (existing) return fail(res, 409, 'Username already exists')
    const hash = await bcrypt.hash(password, 10)
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
    const createdAt = new Date().toISOString()
    db.prepare('INSERT INTO rent_users (id, username, password, role, createdAt) VALUES (?, ?, ?, ?, ?)')
      .run(id, username, hash, 'user', createdAt)
    ok(res, { id, username, role: 'user' })
  } catch (e) { fail(res, 500, e.message) }
})

app.get('/api/auth/me', auth, (req, res) => {
  ok(res, { id: req.user.id, username: req.user.username, role: req.user.role })
})

// ── User Management (admin) ──────────────────────────────────
app.get('/api/users', auth, adminOnly, (req, res) => {
  try {
    const users = db.prepare('SELECT id, username, role, createdAt FROM rent_users ORDER BY createdAt DESC').all()
    ok(res, users)
  } catch (e) { fail(res, 500, e.message) }
})

app.post('/api/users', auth, adminOnly, async (req, res) => {
  try {
    const { username, password, role = 'user' } = req.body
    if (!username || !password) return fail(res, 400, 'Missing fields')
    const existing = db.prepare('SELECT id FROM rent_users WHERE username=?').get(username)
    if (existing) return fail(res, 409, 'Username exists')
    const hash = await bcrypt.hash(password, 10)
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
    const createdAt = new Date().toISOString()
    db.prepare('INSERT INTO rent_users (id, username, password, role, createdAt) VALUES (?, ?, ?, ?, ?)')
      .run(id, username, hash, role, createdAt)
    ok(res, { id, username, role })
  } catch (e) { fail(res, 500, e.message) }
})

app.delete('/api/users/:id', auth, adminOnly, (req, res) => {
  try {
    if (req.params.id === req.user.id) return fail(res, 400, 'Cannot delete yourself')
    db.prepare('DELETE FROM rent_users WHERE id=?').run(req.params.id)
    ok(res, { deleted: true })
  } catch (e) { fail(res, 500, e.message) }
})

app.put('/api/users/:id/password', auth, adminOnly, async (req, res) => {
  try {
    const { password } = req.body
    if (!password) return fail(res, 400, 'Password required')
    const hash = await bcrypt.hash(password, 10)
    db.prepare('UPDATE rent_users SET password=? WHERE id=?').run(hash, req.params.id)
    ok(res, { updated: true })
  } catch (e) { fail(res, 500, e.message) }
})

// ── Properties ──────────────────────────────────
app.get('/api/properties', auth, (req, res) => {
  try {
    ok(res, db.prepare('SELECT * FROM rent_properties ORDER BY createdAt DESC').all())
  } catch (e) { fail(res, 500, e.message) }
})

app.post('/api/properties', auth, (req, res) => {
  try {
    const { name, address = '', remark = '' } = req.body
    if (!name) return fail(res, 400, 'name required')
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
    const createdAt = new Date().toISOString()
    db.prepare('INSERT INTO rent_properties (id, name, address, remark, createdAt) VALUES (?, ?, ?, ?, ?)')
      .run(id, name, address, remark, createdAt)
    ok(res, { id, name, address, remark, createdAt })
  } catch (e) { fail(res, 500, e.message) }
})

app.post('/api/properties/:id', auth, (req, res) => {
  try {
    const { name, address, remark } = req.body
    db.prepare('UPDATE rent_properties SET name=?, address=?, remark=? WHERE id=?')
      .run(name, address || '', remark || '', req.params.id)
    ok(res, db.prepare('SELECT * FROM rent_properties WHERE id=?').get(req.params.id))
  } catch (e) { fail(res, 500, e.message) }
})

app.delete('/api/properties/:id', auth, (req, res) => {
  try {
    db.prepare('DELETE FROM rent_properties WHERE id=?').run(req.params.id)
    db.prepare('DELETE FROM rent_contracts WHERE propertyId=?').run(req.params.id)
    db.prepare('DELETE FROM rent_bills WHERE propertyId=?').run(req.params.id)
    db.prepare('DELETE FROM rent_deposits WHERE propertyId=?').run(req.params.id)
    ok(res, { deleted: true })
  } catch (e) { fail(res, 500, e.message) }
})

// ── Contracts ──────────────────────────────────
app.get('/api/contracts', auth, (req, res) => {
  try {
    ok(res, db.prepare('SELECT * FROM rent_contracts ORDER BY createdAt DESC').all())
  } catch (e) { fail(res, 500, e.message) }
})

app.post('/api/contracts', auth, (req, res) => {
  try {
    const { propertyId, propertyName, tenantName, tenantPhone = '', rentAmount, depositAmount = 0,
            paymentCycle = 'monthly', startDate, endDate } = req.body
    if (!propertyId || !tenantName || !rentAmount || !startDate || !endDate)
      return fail(res, 400, 'Missing required fields')
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
    const createdAt = new Date().toISOString()
    db.prepare(`INSERT INTO rent_contracts
      (id, propertyId, propertyName, tenantName, tenantPhone, rentAmount, depositAmount, paymentCycle, startDate, endDate, status, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)`)
      .run(id, propertyId, propertyName, tenantName, tenantPhone, rentAmount, depositAmount, paymentCycle, startDate, endDate, createdAt)
    generateBills(db, id, propertyId, propertyName, tenantName, rentAmount, depositAmount, paymentCycle, startDate, endDate)
    ok(res, db.prepare('SELECT * FROM rent_contracts WHERE id=?').get(id))
  } catch (e) { fail(res, 500, e.message) }
})

app.post('/api/contracts/:id', auth, (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM rent_contracts WHERE id=?').get(req.params.id)
    if (!existing) return fail(res, 404, 'Contract not found')
    const { propertyId, propertyName, tenantName, tenantPhone, rentAmount, depositAmount,
            paymentCycle, startDate, endDate, status } = req.body
    db.prepare(`UPDATE rent_contracts SET propertyId=?, propertyName=?, tenantName=?, tenantPhone=?,
      rentAmount=?, depositAmount=?, paymentCycle=?, startDate=?, endDate=?, status=? WHERE id=?`)
      .run(
        propertyId ?? existing.propertyId,
        propertyName ?? existing.propertyName,
        tenantName ?? existing.tenantName,
        tenantPhone ?? existing.tenantPhone,
        rentAmount ?? existing.rentAmount,
        depositAmount ?? existing.depositAmount,
        paymentCycle ?? existing.paymentCycle,
        startDate ?? existing.startDate,
        endDate ?? existing.endDate,
        status ?? existing.status,
        req.params.id
      )
    ok(res, db.prepare('SELECT * FROM rent_contracts WHERE id=?').get(req.params.id))
  } catch (e) { fail(res, 500, e.message) }
})

app.delete('/api/contracts/:id', auth, (req, res) => {
  try {
    db.prepare('DELETE FROM rent_contracts WHERE id=?').run(req.params.id)
    db.prepare('DELETE FROM rent_bills WHERE contractId=?').run(req.params.id)
    db.prepare('DELETE FROM rent_deposits WHERE contractId=?').run(req.params.id)
    ok(res, { deleted: true })
  } catch (e) { fail(res, 500, e.message) }
})

// ── Bills ──────────────────────────────────
app.get('/api/bills', auth, (req, res) => {
  try {
    ok(res, db.prepare('SELECT * FROM rent_bills ORDER BY dueDate DESC').all())
  } catch (e) { fail(res, 500, e.message) }
})

app.post('/api/bills', auth, (req, res) => {
  try {
    const { contractId, propertyId, tenantName, propertyName, dueDate, amount, type = 'rent', status = 'pending' } = req.body
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
    const createdAt = new Date().toISOString()
    db.prepare(`INSERT INTO rent_bills (id, contractId, propertyId, tenantName, propertyName, dueDate, amount, type, status, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(id, contractId, propertyId, tenantName, propertyName, dueDate, amount, type, status, createdAt)
    ok(res, db.prepare('SELECT * FROM rent_bills WHERE id=?').get(id))
  } catch (e) { fail(res, 500, e.message) }
})

app.post('/api/bills/:id/pay', auth, (req, res) => {
  try {
    const paidAt = new Date().toISOString()
    db.prepare("UPDATE rent_bills SET status='paid', paidAt=? WHERE id=?")
      .run(paidAt, req.params.id)
    ok(res, db.prepare('SELECT * FROM rent_bills WHERE id=?').get(req.params.id))
  } catch (e) { fail(res, 500, e.message) }
})

// ── Deposits ──────────────────────────────────
app.get('/api/deposits', auth, (req, res) => {
  try {
    ok(res, db.prepare('SELECT * FROM rent_deposits ORDER BY createdAt DESC').all())
  } catch (e) { fail(res, 500, e.message) }
})

app.post('/api/deposits', auth, (req, res) => {
  try {
    const { contractId, propertyId, propertyName, tenantName, amount, status = 'held', remark = '' } = req.body
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
    const createdAt = new Date().toISOString()
    db.prepare(`INSERT INTO rent_deposits (id, contractId, propertyId, propertyName, tenantName, amount, status, remark, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(id, contractId, propertyId, propertyName, tenantName, amount, status, remark, createdAt)
    ok(res, db.prepare('SELECT * FROM rent_deposits WHERE id=?').get(id))
  } catch (e) { fail(res, 500, e.message) }
})

app.post('/api/deposits/:id', auth, (req, res) => {
  try {
    const { status, remark } = req.body
    db.prepare('UPDATE rent_deposits SET status=?, remark=? WHERE id=?')
      .run(status || 'held', remark || '', req.params.id)
    ok(res, db.prepare('SELECT * FROM rent_deposits WHERE id=?').get(req.params.id))
  } catch (e) { fail(res, 500, e.message) }
})

app.delete('/api/deposits/:id', auth, (req, res) => {
  try {
    db.prepare('DELETE FROM rent_deposits WHERE id=?').run(req.params.id)
    ok(res, { deleted: true })
  } catch (e) { fail(res, 500, e.message) }
})

// ── Stats ──────────────────────────────────
app.get('/api/stats', auth, (req, res) => {
  try {
    const bills = db.prepare('SELECT * FROM rent_bills').all()
    const contracts = db.prepare("SELECT * FROM rent_contracts WHERE status='active'").all()
    const deposits = db.prepare("SELECT * FROM rent_deposits WHERE status='held'").all()
    const now = new Date()
    const today = now.toISOString().slice(0, 10)
    const pending = bills.filter(b => b.status === 'pending')
    const overdue = pending.filter(b => b.dueDate < today && b.type === 'rent')
    const upcoming = pending.filter(b => b.dueDate >= today && b.type === 'rent')
    const totalPending = pending.reduce((s, b) => s + b.amount, 0)
    const totalOverdue = overdue.reduce((s, b) => s + b.amount, 0)
    const totalDeposit = deposits.reduce((s, d) => s + d.amount, 0)
    const weekFromNow = new Date(now); weekFromNow.setDate(weekFromNow.getDate() + 7)
    const dueThisWeek = upcoming.filter(b => b.dueDate <= weekFromNow.toISOString().slice(0, 10)).length
    ok(res, { totalPending, totalOverdue, totalDeposit, pendingCount: pending.length,
      overdueCount: overdue.length, upcomingCount: upcoming.length, dueThisWeek, activeCount: contracts.length })
  } catch (e) { fail(res, 500, e.message) }
})

// ── Init sample data ──────────────────────────────────
app.post('/api/init-sample', auth, (req, res) => {
  try {
    const existing = db.prepare('SELECT count(*) as cnt FROM rent_properties').get()
    if (existing.cnt > 0) return ok(res, { msg: 'already initialized' })
    const p1id = Date.now().toString(36) + '1'
    const p2id = Date.now().toString(36) + '2'
    const now = new Date().toISOString()
    db.prepare('INSERT INTO rent_properties (id, name, address, remark, createdAt) VALUES (?, ?, ?, ?, ?)')
      .run(p1id, '示例房源-A', '重庆市渝中区', '', now)
    db.prepare('INSERT INTO rent_properties (id, name, address, remark, createdAt) VALUES (?, ?, ?, ?, ?)')
      .run(p2id, '示例房源-B', '重庆市江北区', '', now)
    const c1id = Date.now().toString(36) + 'c1'
    const c2id = Date.now().toString(36) + 'c2'
    db.prepare(`INSERT INTO rent_contracts (id, propertyId, propertyName, tenantName, tenantPhone, rentAmount, depositAmount, paymentCycle, startDate, endDate, status, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)`)
      .run(c1id, p1id, '示例房源-A', '李明', '13812345678', 3500, 7000, 'quarterly', '2025-01-01', '2025-12-31', now)
    db.prepare(`INSERT INTO rent_contracts (id, propertyId, propertyName, tenantName, tenantPhone, rentAmount, depositAmount, paymentCycle, startDate, endDate, status, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)`)
      .run(c2id, p2id, '示例房源-B', '王芳', '13987654321', 4200, 8400, 'monthly', '2025-03-01', '2026-02-28', now)
    generateBills(db, c1id, p1id, '示例房源-A', '李明', 3500, 7000, 'quarterly', '2025-01-01', '2025-12-31')
    generateBills(db, c2id, p2id, '示例房源-B', '王芳', 4200, 8400, 'monthly', '2025-03-01', '2026-02-28')
    ok(res, { msg: 'sample data created' })
  } catch (e) { fail(res, 500, e.message) }
})

// ── Bill generation helper ──────────────────────────────────
function generateBills(db, contractId, propertyId, propertyName, tenantName, rentAmount, depositAmount, paymentCycle, startDate, endDate) {
  const intervalMonths = paymentCycle === 'monthly' ? 1 : paymentCycle === 'quarterly' ? 3 : paymentCycle === 'half_year' ? 6 : 12
  const start = new Date(startDate)
  const end = new Date(endDate)
  let cur = new Date(start)
  while (cur <= end) {
    const dueStr = cur.toISOString().slice(0, 10)
    const exists = db.prepare('SELECT id FROM rent_bills WHERE contractId=? AND dueDate=? AND type=?').get(contractId, dueStr, 'rent')
    if (!exists) {
      const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
      const createdAt = new Date().toISOString()
      db.prepare(`INSERT INTO rent_bills (id, contractId, propertyId, tenantName, propertyName, dueDate, amount, type, status, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, 'rent', 'pending', ?)`)
        .run(id, contractId, propertyId, tenantName, propertyName, dueStr, rentAmount, createdAt)
    }
    cur.setMonth(cur.getMonth() + intervalMonths)
  }
  if (depositAmount > 0) {
    const exists = db.prepare('SELECT id FROM rent_bills WHERE contractId=? AND type=?').get(contractId, 'deposit')
    if (!exists) {
      const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
      const createdAt = new Date().toISOString()
      db.prepare(`INSERT INTO rent_bills (id, contractId, propertyId, tenantName, propertyName, dueDate, amount, type, status, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, 'deposit', 'pending', ?)`)
        .run(id, contractId, propertyId, tenantName, propertyName, startDate, depositAmount, createdAt)
    }
  }
}

// ── Health ──────────────────────────────────
app.get('/api/health', (req, res) => ok(res, { status: 'ok' }))

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[rent-reminder] Server running on http://0.0.0.0:${PORT}`)
})
