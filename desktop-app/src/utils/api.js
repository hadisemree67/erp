/**
 * ============================================================================
 * BİLEŞEN ADI: api
 * GÖREV VE AKIŞ AÇIKLAMASI:
 *   Masaüstü ERP uygulamasının alt bileşenidir. İlgili veri işlemlerini ve UI gösterimini sağlar.
 * ============================================================================
 */

/*
 * ÖZET:
 * Bu dosya (api.js), Proje genelinde kullanılan API istekleri (fetch) ve tarih/sayı formatlama gibi yardımcı fonksiyonları barındırır.
 */

export const apiFetch = async (url, options = {}) => {
    const envApiUrl = import.meta.env.VITE_API_URL;
    if (envApiUrl) {
        url = url.replace('http://localhost:3000', envApiUrl).replace('http://127.0.0.1:3000', envApiUrl);
    } else if (typeof window !== 'undefined' && window.location && window.location.hostname && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
        url = url.replace('http://localhost:3000', window.location.origin).replace('http://127.0.0.1:3000', window.location.origin);
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

