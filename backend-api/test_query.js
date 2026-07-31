const db = require('./db');

async function test() {
    try {
        const query = `
            SELECT 
                wpe.*, 
                e.full_name as sender_name 
            FROM whatsapp_pending_entries wpe
            LEFT JOIN employees e 
                ON RIGHT(REGEXP_REPLACE(e.phone, '[^0-9]', ''), 10) COLLATE utf8mb4_unicode_ci = RIGHT(REGEXP_REPLACE(wpe.phone_number, '[^0-9]', ''), 10) COLLATE utf8mb4_unicode_ci
                AND e.phone IS NOT NULL AND e.phone != ''
            ORDER BY wpe.created_at DESC
        `;
        const [rows] = await db.query(query);
        console.log("ROWS:", rows);
    } catch (e) {
        console.error("ERROR:", e);
    } finally {
        process.exit();
    }
}

test();
