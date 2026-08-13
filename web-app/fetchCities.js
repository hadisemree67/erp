const fs = require('fs');
const https = require('https');

const url = 'https://raw.githubusercontent.com/ncodes/turkiye-il-ilce/master/il-ilce.json';
const dest = './src/data/turkeyCities.json';

https.get(url, (res) => {
    let body = '';

    res.on('data', (chunk) => {
        body += chunk;
    });

    res.on('end', () => {
        try {
            const data = JSON.parse(body);
            const formatted = {};
            // The JSON is an array of objects: { "il_adi": "ADANA", "ilceler": [{ "ilce_adi": "ALADAĞ", ...}] }
            // Let's format it to { "Adana": ["Aladağ", ...] } with proper title casing
            
            const toTitleCase = (str) => {
                return str.replace(
                    /\w\S*/g,
                    function(txt) {
                        return txt.charAt(0).toLocaleUpperCase('tr-TR') + txt.substr(1).toLocaleLowerCase('tr-TR');
                    }
                );
            };

            data.forEach(city => {
                const cityName = toTitleCase(city.il_adi);
                const districts = city.ilceler.map(d => toTitleCase(d.ilce_adi));
                formatted[cityName] = districts;
            });

            fs.writeFileSync(dest, JSON.stringify(formatted, null, 2), 'utf8');
            console.log('Cities saved successfully!');
        } catch (error) {
            console.error(error.message);
        }
    });
}).on('error', (error) => {
    console.error(error.message);
});
