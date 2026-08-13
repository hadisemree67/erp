const fs = require('fs');

let content = fs.readFileSync('routes/wms.js', 'utf8');

// inventory_view
content = content.replace(
    /router\.get\('\/stock-list', authMiddleware, async \(req, res\) => {/,
    "router.get('/stock-list', authMiddleware, checkRole(['Depo'], 'inventory_view'), async (req, res) => {"
);

// stock_entry
content = content.replace(
    /router\.post\('\/stock-entry', authMiddleware, checkRole\(\['Depo'\]\)/,
    "router.post('/stock-entry', authMiddleware, checkRole(['Depo'], 'stock_entry')"
);

fs.writeFileSync('routes/wms.js', content);
console.log('wms.js updated');
