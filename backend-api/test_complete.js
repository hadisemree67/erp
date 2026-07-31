const db = require('./db');
async function run() {
  try {
      const res = await fetch('http://localhost:3000/api/mobile/orders/complete/45', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: 19 })
      });
      const data = await res.json();
      console.log("RESPONSE:", data);
  } catch (e) {
      console.error(e);
  } finally {
      process.exit();
  }
}
run();
