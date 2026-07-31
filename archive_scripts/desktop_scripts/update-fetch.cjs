/*
 * ÖZET:
 * Bu script, tüm projede yer alan standart fetch() fonksiyonlarını arayarak 
 * token destekli yerel apiFetch aracıyla değiştirir.
 */
const fs = require('fs');
const path = require('path');

function processDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            processDir(fullPath);
        } else if (fullPath.endsWith('.jsx')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            if (content.match(/\bfetch\(/)) {
                const srcDir = path.resolve('c:/Users/dedih/Desktop/stokerpsistemi/desktop-app/src');
                const fileDir = path.dirname(fullPath);
                let relPath = path.relative(fileDir, path.join(srcDir, 'utils', 'api'));
                relPath = relPath.replace(/\\/g, '/');
                if (!relPath.startsWith('.')) {
                    relPath = './' + relPath;
                }
                
                if (!content.includes('import { apiFetch }')) {
                    const importStatement = `import { apiFetch } from '${relPath}';\n`;
                    content = importStatement + content;
                }
                
                content = content.replace(/\bfetch\(/g, 'apiFetch(');
                
                fs.writeFileSync(fullPath, content, 'utf8');
                console.log('Updated: ' + fullPath);
            }
        }
    }
}

processDir('c:/Users/dedih/Desktop/stokerpsistemi/desktop-app/src');
