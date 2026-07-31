const db = require('./db');
async function run() { 
    try { 
        const [rows] = await db.query("SELECT OrderStatus, PickerId FROM orders WHERE OrderNumber = 'SIP-852902'"); 
        console.log(rows); 
    } catch(e) { 
        console.error(e); 
    } 
    process.exit(0); 
} 
run();
