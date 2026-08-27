const mysql = require('mysql2/promise');

async function run() {
  const c = await mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',
    password: '74565404Hey.',
    database: 'e_ticaret_depo'
  });

  const [products] = await c.query("SELECT Id, Category, web_categories FROM products");

  for (const p of products) {
    let changed = false;
    let newCategory = p.Category;
    let newWebCat = p.web_categories;

    if (newCategory) {
      newCategory = newCategory.replace(/Cilt Bak.m./g, 'Cilt Bakımı')
                               .replace(/Sa.l.k \/ Takviye/g, 'Sağlık / Takviye')
                               .replace(/Ki.isel Bak.m/g, 'Kişisel Bakım')
                               .replace(/\uFFFD/g, ''); // just in case
    }
    
    if (newWebCat) {
      if (typeof newWebCat === 'string') {
        newWebCat = newWebCat.replace(/Cilt Bak.m./g, 'Cilt Bakımı')
                             .replace(/Sa.l.k \/ Takviye/g, 'Sağlık / Takviye')
                             .replace(/Ki.isel Bak.m/g, 'Kişisel Bakım');
      } else if (Array.isArray(newWebCat)) {
        newWebCat = newWebCat.map(x => 
            x.replace(/Cilt Bak.m./g, 'Cilt Bakımı')
             .replace(/Sa.l.k \/ Takviye/g, 'Sağlık / Takviye')
             .replace(/Ki.isel Bak.m/g, 'Kişisel Bakım')
        );
        newWebCat = JSON.stringify(newWebCat);
      }
    }

    if (newCategory !== p.Category || (newWebCat !== p.web_categories && newWebCat !== JSON.stringify(p.web_categories))) {
      console.log(`Fixing product ${p.Id}: ${p.Category} -> ${newCategory}, ${p.web_categories} -> ${newWebCat}`);
      // Only do string replacement for safety, wait, if web_categories was an array, we stringified it. 
      // the DB requires a string or JSON for web_categories.
      const wcVal = typeof newWebCat === 'object' ? JSON.stringify(newWebCat) : newWebCat;
      await c.query('UPDATE products SET Category = ?, web_categories = ? WHERE Id = ?', [newCategory, wcVal, p.Id]);
    }
  }

  console.log('Fixed all.');
  await c.end();
}

run().catch(console.error);
