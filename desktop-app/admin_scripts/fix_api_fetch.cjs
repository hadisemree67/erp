const fs = require('fs');

const files = [
    'C:/Users/dedih/Desktop/stokerpsistemi/desktop-app/src/components/WMS/StockList.jsx',
    'C:/Users/dedih/Desktop/stokerpsistemi/desktop-app/src/components/WMS/InventoryList.jsx'
];

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    
    // Replace fetch with apiFetch for the specific URL
    content = content.replace(/await fetch\('http:\/\/localhost:3000\/api\/production\/requests'/g, "await apiFetch('http://localhost:3000/api/production/requests'");

    fs.writeFileSync(file, content);
});

console.log('Replaced fetch with apiFetch in Modals');
