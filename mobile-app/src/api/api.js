import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Use 192.168.10.144 for physical device on same WiFi or ngrok URL
const API_URL = 'http://192.168.10.144:3000/api';

const api = axios.create({
    baseURL: API_URL,
});

// Interceptor to add token/user info if needed
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
