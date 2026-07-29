/**
 * ============================================================================
 * DOSYA ADI: api.js
 * MODÜL / KATMAN: Önyüz Yardımcısı (Utility) - Merkezi HTTP İstek Yöneticisi
 * 
 * GÖREV VE AKIŞ AÇIKLAMASI:
 *   Uygulama genelinde arkayüz (backend) API uç noktalarına yapılan tüm HTTP (GET, POST, PUT, DELETE) isteklerini standart hale getiren, yetkilendirme token'larını (JWT) başlığa ekleyen ve hata yakalamayı merkezi olarak yöneten yardımcı modüldür.
 * 
 * KULLANILAN TEKNOLOJİLER VE KÜTÜPHANELER:
 *   - Fetch API Wrapper, Asenkron İletişim, Hata Yakalama (Error Interception)
 * 
 * MİMARİ VE ENTEGRASYON NOTLARI:
 *   - Tüm önyüz bileşenleri ve servisleri tarafından arkayüzle konuşmak için ortaklaşa kullanılan temel iletişim köprüsüdür.
 * ============================================================================
 */

export const apiFetch = async (url, options = {}) => {
    if (typeof window !== 'undefined' && window.location && window.location.hostname && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
        url = url.replace('localhost:3000', `${window.location.hostname}:3000`).replace('127.0.0.1:3000', `${window.location.hostname}:3000`);
    }
    const token = localStorage.getItem('token');
    
    // Varsayılan headers ayarı
    const headers = {
        ...options.headers,
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    // Eğer body FormData değilse ve Content-Type belirtilmemişse JSON olarak ayarla
    if (!(options.body instanceof FormData) && !headers['Content-Type'] && !(options.method === 'GET' || options.method === 'HEAD' || !options.method)) {
        headers['Content-Type'] = 'application/json';
    }

    const config = {
        ...options,
        headers
    };

    try {
        const response = await fetch(url, config);
        
        // Eğer token süresi dolmuş veya geçersizse (login isteği hariç)
        if (response.status === 401 && !url.includes('/api/login')) {
            // Oturumu kapatıp login sayfasına yönlendir (Uygulama genelinde window.location.reload() pratik bir çözümdür)
            localStorage.removeItem('token');
            window.location.reload(); 
            throw new Error('Yetkisiz erişim, lütfen tekrar giriş yapın.');
        }

        return response;
    } catch (error) {
        console.error('API İsteği Hatası:', error);
        throw error;
    }
};
