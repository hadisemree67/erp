const mysql = require('mysql2/promise');
require('dotenv').config();

async function fixAddresses() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'e_ticaret_depo'
    });

    try {
        const [customers] = await pool.query("SELECT Id, Address FROM customers WHERE Address LIKE '[%'");
        let count = 0;
        for (const c of customers) {
            try {
                const arr = JSON.parse(c.Address);
                const webAddressesStr = JSON.stringify(arr);
                
                let formattedAddress = "";
                if (arr && arr.length > 0) {
                    formattedAddress = arr.map((a, index) => {
                        return `[ADRES ${index + 1}: ${(a.title || 'ADRES').toUpperCase()}]
Ad Soyad: ${a.name || ''}
Telefon: ${a.phone || ''}
İl/İlçe: ${a.city || ''} / ${a.district || ''}
Mahalle: ${a.neighborhood || ''}
Açık Adres: ${a.addressDetail || ''}
${a.isDefault ? '(Varsayılan Adres)' : ''}`.trim();
                    }).join('\n\n------------------------\n\n');
                }

                await pool.query(
                    'UPDATE customers SET Address = ?, WebAddresses = ? WHERE Id = ?',
                    [formattedAddress, webAddressesStr, c.Id]
                );
                count++;
            } catch (err) {
                console.error(err);
            }
        }
        console.log(`Successfully fixed ${count} existing customer addresses.`);
    } catch (error) {
        console.error('Error fixing addresses:', error.message);
    } finally {
        await pool.end();
    }
}

fixAddresses();
