const fs = require('fs');
const path = require('path');

const targetDirs = [
    { path: 'web-app/src', envVar: 'import.meta.env.VITE_API_URL' },
    { path: 'desktop-app/src', envVar: 'import.meta.env.VITE_API_URL' },
    { path: 'mobile-app/src', envVar: 'process.env.EXPO_PUBLIC_API_URL' },
    { path: 'mobile-app/App.js', envVar: 'process.env.EXPO_PUBLIC_API_URL' } 
];

function processFile(filePath, envVar) {
    if (!fs.existsSync(filePath)) return;
    
    const stats = fs.statSync(filePath);
    if (stats.isDirectory()) {
        const files = fs.readdirSync(filePath);
        for (const file of files) {
            processFile(path.join(filePath, file), envVar);
        }
    } else if (stats.isFile() && /\.(js|jsx|ts|tsx)$/.test(filePath)) {
        let content = fs.readFileSync(filePath, 'utf8');
        let originalContent = content;

        // Exact match with trailing slash
        content = content.replace(/'http:\/\/localhost:3000\//g, `${envVar} + '/`);
        content = content.replace(/"http:\/\/localhost:3000\//g, `${envVar} + "/`);
        
        // Exact match without trailing slash
        content = content.replace(/'http:\/\/localhost:3000'/g, `${envVar}`);
        content = content.replace(/"http:\/\/localhost:3000"/g, `${envVar}`);
        
        // Template literal matches
        content = content.replace(/`http:\/\/localhost:3000\//g, '`${' + envVar + '}/');
        content = content.replace(/`http:\/\/localhost:3000/g, '`${' + envVar + '}');

        // Also fix 127.0.0.1 just in case
        content = content.replace(/'http:\/\/127\.0\.0\.1:3000\//g, `${envVar} + '/`);
        content = content.replace(/"http:\/\/127\.0\.0\.1:3000\//g, `${envVar} + "/`);
        content = content.replace(/'http:\/\/127\.0\.0\.1:3000'/g, `${envVar}`);
        content = content.replace(/"http:\/\/127\.0\.0\.1:3000"/g, `${envVar}`);
        content = content.replace(/`http:\/\/127\.0\.0\.1:3000\//g, '`${' + envVar + '}/');
        content = content.replace(/`http:\/\/127\.0\.0\.1:3000/g, '`${' + envVar + '}');

        if (content !== originalContent) {
            fs.writeFileSync(filePath, content, 'utf8');
            console.log(`Updated: ${filePath}`);
        }
    }
}

for (const target of targetDirs) {
    const fullPath = path.join(__dirname, target.path);
    console.log(`Processing ${fullPath}...`);
    processFile(fullPath, target.envVar);
}

console.log("Done.");
