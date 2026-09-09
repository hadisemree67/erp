const { createClient } = require('redis');

// Redis istemcisi oluştur
const redisClient = createClient({
    url: process.env.REDIS_URL || 'redis://127.0.0.1:6379',
    socket: {
        reconnectStrategy: (retries) => {
            if (retries > 3) {
                console.log('Redis bağlantısı kurulamadı. Redis olmadan devam ediliyor.');
                return false; // Yeniden bağlanmayı durdur
            }
            return Math.min(retries * 500, 3000);
        }
    }
});

redisClient.on('error', (err) => {
    // Sadece ilk hatada logla, sürekli spam yapmasın
    if (!redisClient._errorLogged) {
        console.warn('Redis Client Error (Uygulama Redis olmadan çalışmaya devam edecek):', err.message);
        redisClient._errorLogged = true;
    }
});
redisClient.on('connect', () => {
    redisClient._errorLogged = false;
    console.log('Redis sunucusuna başarıyla bağlanıldı!');
});

// Uygulama başlatılırken bağlan
(async () => {
    try {
        await redisClient.connect();
    } catch (err) {
        console.warn('Redis bağlantı hatası (Servis Redis olmadan devam edecek):', err.message);
    }
})();

module.exports = redisClient;
