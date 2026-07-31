const db = require('./db');

async function fix() {
    try {
        await db.query('UPDATE employees SET phone="13099683823738" WHERE id=14');
        console.log('Fixed ahmet yilmaz phone to 13099683823738');
    } catch(e) { console.error(e); }
    process.exit();
}
fix();
