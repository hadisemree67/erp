const fs = require('fs');

let content = fs.readFileSync('routes/products.js', 'utf8');

content = content.replace(
    /router\.get\('\/', authMiddleware, checkRole\(\['Depo', 'Üretim'\]\)/,
    "router.get('/', authMiddleware, checkRole(['Depo', 'Üretim'], 'view_products')"
);

content = content.replace(
    /router\.post\('\/', authMiddleware, checkRole\(\['Depo', 'Üretim'\]\)/,
    "router.post('/', authMiddleware, checkRole(['Depo', 'Üretim'], 'product_add')"
);

content = content.replace(
    /router\.put\('\/bulk-edit', authMiddleware, checkRole\(\['Depo', 'Üretim'\]\)/,
    "router.put('/bulk-edit', authMiddleware, checkRole(['Depo', 'Üretim'], 'product_edit')"
);

content = content.replace(
    /router\.put\('\/:id', authMiddleware, checkRole\(\['Depo', 'Üretim'\]\)/,
    "router.put('/:id', authMiddleware, checkRole(['Depo', 'Üretim'], 'product_edit')"
);

content = content.replace(
    /router\.delete\('\/bulk', authMiddleware, checkRole\(\['Depo', 'Üretim'\]\)/,
    "router.delete('/bulk', authMiddleware, checkRole(['Depo', 'Üretim'], 'product_delete')"
);

content = content.replace(
    /router\.delete\('\/:id', authMiddleware, checkRole\(\['Depo', 'Üretim'\]\)/,
    "router.delete('/:id', authMiddleware, checkRole(['Depo', 'Üretim'], 'product_delete')"
);

fs.writeFileSync('routes/products.js', content);
console.log('products.js updated');
