const fs = require('fs');
const path = require('path');
const routesDir = './routes';

const filePermissions = {
    'activities.js': 'view_activity_log',
    'boxes.js': 'box_manage',
    'campaigns.js': { GET: 'view_campaigns', POST: 'campaign_manage', PUT: 'campaign_manage', DELETE: 'campaign_manage' },
    'coupons.js': { GET: 'view_campaigns', POST: 'campaign_manage', PUT: 'campaign_manage', DELETE: 'campaign_manage' },
    'customers.js': { GET: 'view_crm', POST: 'crm_customer_add', PUT: 'crm_customer_add', DELETE: 'crm_customer_add' },
    'data_export.js': 'view_reports',
    'finance.js': { GET: 'view_finance', POST: 'finance_add_transaction', PUT: 'finance_add_transaction', DELETE: 'finance_add_transaction' },
    'mobile.js': { GET: 'view_wms', POST: 'wms_transfer', PUT: 'wms_transfer' },
    'picking_carts.js': 'wms_transfer',
    'production.js': { GET: 'view_production', POST: 'production_manage', PUT: 'production_manage', DELETE: 'production_manage' },
    'purchasing.js': { GET: 'view_procurement', POST: 'procurement_request', PUT: 'procurement_request', DELETE: 'procurement_request' },
    'reports.js': 'view_reports',
    'settings.js': 'staff_manage',
    'shippers.js': 'wms_transfer',
    'suppliers.js': 'supplier_manage',
    'users.js': 'staff_manage',
    'warehouses.js': 'wms_location',
    'whatsappEntries.js': 'crm_tickets'
};

Object.keys(filePermissions).forEach(file => {
    const filePath = path.join(routesDir, file);
    if (!fs.existsSync(filePath)) return;
    
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // Ensure rbac is imported
    if (!content.includes('checkPermission')) {
        if (content.includes("require('../middleware/rbac')")) {
            content = content.replace(/const\s+\{([^}]+)\}\s*=\s*require\('\.\.\/middleware\/rbac'\);/, (match, p1) => {
                return `const { ${p1.trim()}, checkPermission } = require('../middleware/rbac');`;
            });
        } else {
            content = content.replace(/const authMiddleware = require\('\.\.\/middleware\/auth'\);/, "const authMiddleware = require('../middleware/auth');\nconst { checkPermission } = require('../middleware/rbac');");
        }
    }

    const permMap = typeof filePermissions[file] === 'string' 
        ? { GET: filePermissions[file], POST: filePermissions[file], PUT: filePermissions[file], DELETE: filePermissions[file], PATCH: filePermissions[file] }
        : filePermissions[file];

    // Find and replace router methods
    const methods = ['get', 'post', 'put', 'delete', 'patch'];
    methods.forEach(method => {
        const requiredPerm = permMap[method.toUpperCase()];
        if (!requiredPerm) return;

        // Regex explanation:
        // Match `router.get('/path', authMiddleware, `
        // Do NOT match if it already has `checkPermission` or `checkRole` right after.
        const regex = new RegExp(`router\\.${method}\\(\\s*(['"\`][^'"\`]+['"\`])\\s*,\\s*authMiddleware\\s*,\\s*(?!checkRole|checkPermission)`, 'g');
        
        if (regex.test(content)) {
            content = content.replace(regex, `router.${method}($1, authMiddleware, checkPermission('${requiredPerm}'), `);
            modified = true;
        }
    });

    if (modified) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`[OK] Injected checkPermission into ${file}`);
    } else {
        console.log(`[SKIP] No un-protected authMiddleware routes found in ${file}`);
    }
});
