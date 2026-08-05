/*
Sipariş tamamlama API uç noktasını (`/api/mobile/orders/complete/...`) çağırarak siparişlerin hatasız kapanıp kapanmadığını test eder.
 */

const db = require('./db');
async function run() {
    try {
        const res = await fetch('http://localhost:3000/api/mobile/orders/complete/45', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: 19 })
        });
        const data = await res.json();
        console.log("SUNUCU CEVABI:", data);
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}
run();
