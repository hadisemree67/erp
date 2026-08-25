const db = require('./db'); 
async function t() { 
  try { 
    const [r] = await db.query("SELECT * FROM coupons WHERE is_active = 1 AND (end_date IS NULL OR end_date >= CURDATE()) AND (target_audience = 'all' OR (target_audience = 'specific' AND JSON_CONTAINS(target_customer_ids, CAST(? AS JSON), '$')))", [1]); 
    console.log('OK', r.length); 
  } catch(e) { 
    console.error('HATA', e); 
  } 
  process.exit(0); 
} 
t();
