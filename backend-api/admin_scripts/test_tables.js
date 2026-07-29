const db=require('./db'); async function get(){ const [rows] = await db.query('SHOW TABLES'); console.log(rows); process.exit(0); } get();
