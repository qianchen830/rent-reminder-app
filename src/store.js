const API = '/api'
let _token = localStorage.getItem('rent_token') || ''

export function setToken(t) { _token = t; if (t) localStorage.setItem('rent_token', t); else localStorage.removeItem('rent_token') }
export function getToken() { return _token }
export function getUser() { try { return JSON.parse(localStorage.getItem('rent_user') || 'null') } catch { return null } }
export function setUser(u) { if (u) localStorage.setItem('rent_user', JSON.stringify(u)); else localStorage.removeItem('rent_user') }
export function logout() { setToken(''); setUser(null) }

async function get(path) {
  const r = await fetch(API + path, { headers: { Authorization: 'Bearer ' + _token } })
  const d = await r.json()
  if (!d.success) throw new Error(d.error || 'API error')
  return d.data
}
async function post(path, body = {}) {
  const r = await fetch(API + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + _token },
    body: JSON.stringify(body)
  })
  const d = await r.json()
  if (!d.success) throw new Error(d.error || 'API error')
  return d.data
}
async function del(path) {
  const r = await fetch(API + path, { method: 'DELETE', headers: { Authorization: 'Bearer ' + _token } })
  const d = await r.json()
  if (!d.success) throw new Error(d.error || 'API error')
  return d.data
}
async function put(path, body = {}) {
  const r = await fetch(API + path, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + _token },
    body: JSON.stringify(body)
  })
  const d = await r.json()
  if (!d.success) throw new Error(d.error || 'API error')
  return d.data
}

// Auth
export async function login(username, password) {
  const data = await post('/auth/login', { username, password })
  setToken(data.token)
  setUser({ username: data.username, role: data.role })
  return data
}
export async function register(username, password) {
  return await post('/auth/register', { username, password })
}
export async function getMe() {
  return await get('/auth/me')
}

// User management (admin)
export async function getUsers() { return await get('/users') }
export async function addUser(username, password, role = 'user') { return await post('/users', { username, password, role }) }
export async function deleteUser(id) { return await del(`/users/${id}`) }
export async function updateUserPassword(id, password) { return await put(`/users/${id}/password`, { password }) }

// Properties
export async function getProperties() { return await get('/properties') }
export async function addProperty(data) { return await post('/properties', data) }
export async function updateProperty(id, data) { return await post(`/properties/${id}`, data) }
export async function deleteProperty(id) { return await del(`/properties/${id}`) }

// Contracts
export async function getContracts() { return await get('/contracts') }
export async function addContract(data) { return await post('/contracts', data) }
export async function updateContract(id, data) { return await post(`/contracts/${id}`, data) }
export async function deleteContract(id) { return await del(`/contracts/${id}`) }

// Bills
export async function getBills() { return await get('/bills') }
export async function addBill(data) { return await post('/bills', data) }
export async function payBill(id) { return await post(`/bills/${id}/pay`, {}) }

// Stats
export async function getStats() { return await get('/stats') }

// Deposits
export async function getDeposits() { return await get('/deposits') }
export async function addDeposit(data) { return await post('/deposits', data) }
export async function updateDeposit(id, data) { return await post(`/deposits/${id}`, data) }
export async function deleteDeposit(id) { return await del(`/deposits/${id}`) }

// Init sample
export async function initSample() { return await post('/init-sample') }

export function cycleText(cycle) {
  return cycle === 'monthly' ? '月付' : cycle === 'quarterly' ? '季付' : cycle === 'half_year' ? '半年付' : '年付'
}
