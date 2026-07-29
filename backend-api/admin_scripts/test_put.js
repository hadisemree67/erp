const http = require('http');

const data = JSON.stringify({
    ProductName: 'Test',
    Barcode: '["asf"]'
});

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/products/1', // assuming ID 1 exists, or it doesn't matter we just want the error
    method: 'PUT',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
};

const req = http.request(options, res => {
    let responseBody = '';
    res.on('data', chunk => responseBody += chunk);
    res.on('end', () => console.log('Response:', responseBody));
});

req.on('error', error => console.error('Error:', error));
req.write(data);
req.end();
