const db = require('./db');
const bcrypt = require('bcrypt');

async function revertPassword() {
    try {
        const contact = 'dedihan3467@gmail.com';
        const rawPassword = '74565404Hey.';
        
        // Revert to standard bcrypt of the plain text password
        const hashedPassword = await bcrypt.hash(rawPassword, 10);
        console.log("Reverted BCrypt hash for DB:", hashedPassword);
        
        await db.query('UPDATE customers SET Password = ? WHERE Email = ?', [hashedPassword, contact]);
        
        console.log("Database reverted successfully for", contact);
        process.exit(0);
    } catch (e) {
        console.error("Error:", e);
        process.exit(1);
    }
}
revertPassword();
