const https = require('https');
const fs = require('fs');

const urls = [
  'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cf/La_Roche-Posay_logo.svg/512px-La_Roche-Posay_logo.svg.png',
  'https://upload.wikimedia.org/wikipedia/commons/thumb/7/74/Bioderma_logo.svg/512px-Bioderma_logo.svg.png'
];

urls.forEach(url => {
  https.get(url, (res) => {
    console.log(url, res.statusCode);
  }).on('error', (e) => {
    console.error(e);
  });
});
