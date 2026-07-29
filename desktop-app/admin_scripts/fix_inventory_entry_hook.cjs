const fs = require('fs');
let code = fs.readFileSync('src/components/WMS/InventoryEntry.jsx', 'utf8');

const regex = /const p = editItem\.product \|\| editItem;\s*if \(p\.suppliers && p\.suppliers\.length > 0\) \{([\s\S]*?)setSuppliersData\(\[\]\);\s*\}/;

const match = regex.exec(code);
if (match) {
    const extracted = match[0];
    
    // Remove it from its current position
    code = code.replace(extracted, '');
    
    // Insert it into a useEffect
    const useEffectBlock = `
    useEffect(() => {
        if (editItem) {
            ${extracted}
        } else {
            setSuppliersData([]);
        }
    }, [editItem]);
    `;
    
    // Put the useEffect after the useState declarations
    const insertPoint = code.indexOf('const [error, setError] = useState(null);') + 'const [error, setError] = useState(null);'.length;
    
    code = code.substring(0, insertPoint) + '\n\n' + useEffectBlock + code.substring(insertPoint);
    
    fs.writeFileSync('src/components/WMS/InventoryEntry.jsx', code);
    console.log('Fixed setSuppliersData reference error!');
} else {
    console.log('Could not find the extracted block.');
}
