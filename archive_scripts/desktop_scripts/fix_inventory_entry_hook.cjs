/*
 * ÖZET:
 * Bu script, InventoryEntry.jsx dosyasındaki tedarikçi ayar mantığını (supplier logic) 
 * bir useEffect bloğu içine taşıyarak render sorunlarını (infinite loop) çözer.
 */
const fs = require('fs');
let code = fs.readFileSync('src/components/WMS/InventoryEntry.jsx', 'utf8');

const regex = /const p = editItem\.product \|\| editItem;\s*if \(p\.suppliers && p\.suppliers\.length > 0\) \{([\s\S]*?)setSuppliersData\(\[\]\);\s*\}/;

const match = regex.exec(code);
if (match) {
    const extracted = match[0];
    
    // Mevcut konumundan kaldır
    code = code.replace(extracted, '');
    
    // useEffect bloğunun içine yerleştir
    const useEffectBlock = `
    useEffect(() => {
        if (editItem) {
            ${extracted}
        } else {
            setSuppliersData([]);
        }
    }, [editItem]);
    `;
    
    // useEffect bloğunu useState tanımlamalarından sonra koy
    const insertPoint = code.indexOf('const [error, setError] = useState(null);') + 'const [error, setError] = useState(null);'.length;
    
    code = code.substring(0, insertPoint) + '\n\n' + useEffectBlock + code.substring(insertPoint);
    
    fs.writeFileSync('src/components/WMS/InventoryEntry.jsx', code);
    console.log('Fixed setSuppliersData reference error!');
} else {
    console.log('Could not find the extracted block.');
}
