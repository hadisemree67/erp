const fs = require('fs');
const path = require('path');
const routesDir = './routes';
const files = fs.readdirSync(routesDir).filter(f => f.endsWith('.js'));

files.forEach(file => {
    const filePath = path.join(routesDir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    
    let modified = false;

    // Replace checkRole(['Role', 'Role'], 'permission_key') with checkPermission('permission_key')
    const regex = /checkRole\(\s*\[[^\]]+\]\s*,\s*['"]([^'"]+)['"]\s*\)/g;
    if (regex.test(content)) {
        content = content.replace(regex, "checkPermission('$1')");
        modified = true;
    }

    // Replace checkRole('Role', 'permission_key') with checkPermission('permission_key')
    const regex2 = /checkRole\(\s*['"][^'"]+['"]\s*,\s*['"]([^'"]+)['"]\s*\)/g;
    if (regex2.test(content)) {
        content = content.replace(regex2, "checkPermission('$1')");
        modified = true;
    }

    if (modified) {
        if (!content.includes('checkPermission')) {
            content = content.replace(/const \{ checkRole \} = require\('\.\.\/middleware\/rbac'\);/, "const { checkRole, checkPermission } = require('../middleware/rbac');");
            if (!content.includes('checkPermission')) {
                // if it still doesn't include it, it might be importing checkRole differently
                content = content.replace(/const authMiddleware = require\('\.\.\/middleware\/auth'\);/, "const authMiddleware = require('../middleware/auth');\nconst { checkPermission } = require('../middleware/rbac');");
            }
        }
        
        fs.writeFileSync(filePath, content, 'utf8');
        console.log('Modified: ' + file);
    }
});
