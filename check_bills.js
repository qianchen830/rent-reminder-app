const db = require('better-sqlite3')('/home/ubuntu/rent-reminder-app/rent_reminder.db')
const cs = db.prepare('SELECT * FROM rent_contracts WHERE status="active"').all()
cs.forEach(c => {
  const im = c.paymentCycle === 'monthly' ? 1 : c.paymentCycle === 'quarterly' ? 3 : c.paymentCycle === 'half_year' ? 6 : 12
  let cur = new Date(c.startDate)
  const end = new Date(c.endDate)
  const miss = []
  while (cur <= end) {
    const ds = cur.toISOString().slice(0, 10)
    if (!db.prepare('SELECT id FROM rent_bills WHERE contractId=? AND dueDate=? AND type="rent"').get(c.id, ds)) miss.push(ds)
    cur.setMonth(cur.getMonth() + im)
    if (cur > end) break
  }
  console.log(c.paymentCycle, c.startDate, c.endDate, '| missing:', miss.join(',') || 'none')
})
