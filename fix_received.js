const Database = require('better-sqlite3');
const db = new Database('/home/ubuntu/rent-reminder-app/rent_reminder.db');

// Show current state
const rows = db.prepare('SELECT status, COUNT(*) as cnt, SUM(amount) as total FROM rent_bills GROUP BY status').all();
console.log('Before fix:');
console.table(rows);

// Fix: update receivedAmount for paid bills that have receivedAmount=0
const result = db.prepare("UPDATE rent_bills SET receivedAmount=amount WHERE status='paid' AND receivedAmount=0").run();
console.log(`\nUpdated ${result.changes} paid bills to set receivedAmount=amount`);

// Show after
const after = db.prepare('SELECT status, COUNT(*) as cnt, SUM(amount) as total, SUM(receivedAmount) as received FROM rent_bills GROUP BY status').all();
console.log('\nAfter fix:');
console.table(after);

// Show totalReceived calculation
const totalReceived = db.prepare("SELECT SUM(CASE WHEN status='paid' THEN amount ELSE receivedAmount END) as tr FROM rent_bills WHERE status='paid' OR receivedAmount>0").get();
console.log('totalReceived:', totalReceived.tr);
