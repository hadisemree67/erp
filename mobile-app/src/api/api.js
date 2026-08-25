/**
 * ============================================================================
 * BİLEŞEN ADI: api
 * GÖREV VE AKIŞ AÇIKLAMASI:
 *   Mobil ERP/Müşteri uygulamasının alt bileşenidir. React Native üzerinde çalışır.
 * ============================================================================
 */
/**
 * @file api.js
 * @description Axios HTTP istemcisi (client) yapılandırması.
 * Uygulamanın backend (sunucu) ile olan tüm haberleşmesi bu dosya üzerinden yönetilir.
 */
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Use 192.168.10.165 for physical device on same WiFi or ngrok URL
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://172.20.10.3:3000/api';

/**
 * Axios Instance Oluşturma
 * Temel URL adresi belirlenir. Çevresel değişkenden alınır veya varsayılan (localhost) kullanılır.
 */
const api = axios.create({
    baseURL: API_URL,
});

/**
 * Request (İstek) Interceptor
 * API'ye gönderilen her istekten önce araya girer ve gerekli başlık (header) bilgilerini,
 * özellikle de kimlik doğrulama token'ını ve kullanıcı ID'sini ekler.
 */
api.interceptors.request.use(
    async (config) => {
        const userStr = await AsyncStorage.getItem('user');
        const token = await AsyncStorage.getItem('token');

        if (userStr) {
            const user = JSON.parse(userStr);
            // Example of passing user ID in headers if backend needs it (our backend checks req.headers['x-user-id'] sometimes)
            config.headers['x-user-id'] = user.id;
        }

        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }

        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

/**
 * Response (Cevap) Interceptor
 * API'den dönen cevapları dinler. 
 * Özellikle yetkisiz erişim (401) durumlarında kullanıcıyı çıkış yapmaya zorlamak için kullanılır.
 */
api.interceptors.response.use(
    (response) => {
        return response;
    },
    async (error) => {
        if (error.response && error.response.status === 401) {
            await AsyncStorage.removeItem('user');
            await AsyncStorage.removeItem('token');
            // Kullanıcıyı uyarıp yeniden başlatmasını isteyebiliriz veya AuthContext bunu yönetir.
            console.warn('Oturum süresi doldu veya geçersiz. Lütfen uygulamayı yeniden başlatın veya giriş yapın.');
        }
        return Promise.reject(error);
    }
);

export default api;


