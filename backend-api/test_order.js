const db = require('./db');
async function run() {
  const [rows] = await db.query("SELECT * FROM orders WHERE OrderStatus = 'Hazırlanıyor' ORDER BY Id DESC LIMIT 1");
  console.log("ORDER:", rows[0]);
  process.exit();
}
run();
