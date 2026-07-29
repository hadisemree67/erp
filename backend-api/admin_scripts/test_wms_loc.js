const db=require('./db'); async function check(){ const [rows] = await db.query('DESCRIBE wms_locations'); console.log(rows); process.exit(0); } check();
