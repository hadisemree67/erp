/**
 * @file AuthContext.js
 * @description Kullanıcı oturum yönetimini (Authentication) sağlayan React Context dosyası.
 * Uygulama genelinde kullanıcı durumunu, giriş (login) ve çıkış (logout) işlemlerini barındırır.
 */
import React, { createContext, useState, useEffect } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../api/api';

const APP_VERSION = '1.0.0'; // Mevcut mobil uygulama sürümü

export const AuthContext = createContext();

/**
 * AuthProvider Bileşeni
 * Tüm uygulamayı sarmalayarak `user` verisine heryerden ulaşılabilmesini sağlar.
 */
export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadUser();
    }, []);

    /**
     * Uygulama açıldığında cihaz hafızasında (AsyncStorage) 
     * kayıtlı bir kullanıcı olup olmadığını kontrol eder.
     */
    const loadUser = async () => {
        try {
            // Önce versiyon kontrolü yap
            try {
                const versionRes = await api.get('/mobile-version');
                if (versionRes.data.success && versionRes.data.forceUpdate) {
                    if (versionRes.data.minVersion !== APP_VERSION) {
                        Alert.alert(
                            "Zorunlu Güncelleme",
                            "Uygulamanın eski bir sürümünü kullanıyorsunuz. Lütfen sistem yöneticisinden uygulamanın güncel sürümünü isteyin.",
                            [{ text: "Tamam", onPress: () => {} }],
                            { cancelable: false }
                        );
                        setIsLoading(false);
                        return; // Versiyon eskiyse uygulamayı açma
                    }
                }
            } catch (vErr) {
                console.log("Versiyon kontrolü yapılamadı (Sunucuya ulaşılamıyor olabilir).");
            }

            const userStr = await AsyncStorage.getItem('user');
            if (userStr) {
                setUser(JSON.parse(userStr));
            }
        } catch (e) {
            console.error('Failed to load user', e);
        } finally {
            setIsLoading(false);
        }
    };

    /**
     * Kullanıcı adı ve şifre ile sisteme giriş yapar.
     * Başarılı olursa kullanıcı verilerini ve token'ı hafızaya kaydeder.
     * @param {string} username - Kullanıcı adı
     * @param {string} password - Şifre
     */
    const login = async (username, password) => {
        try {
            const res = await api.post('/login', { username, password, role: 'employee' });
            if (res.data.success) {
                const loggedInUser = res.data.user;
                setUser(loggedInUser);
                await AsyncStorage.setItem('user', JSON.stringify(loggedInUser));
                if (res.data.token) {
                    await AsyncStorage.setItem('token', res.data.token);
                }
                return { success: true };
            }
            return { success: false, message: res.data.message };
        } catch (error) {
            console.error('Login Error:', error);
            return { 
                success: false, 
                message: error.response?.data?.message || 'Giriş yapılamadı. Bağlantıyı kontrol edin.' 
            };
        }
    };

    /**
     * Kullanıcının oturumunu kapatır ve cihaz hafızasındaki bilgileri temizler.
     */
    const logout = async () => {
        try {
            await AsyncStorage.removeItem('user');
            await AsyncStorage.removeItem('token');
            setUser(null);
        } catch (e) {
            console.error('Logout error', e);
        }
    };

    return (
        <AuthContext.Provider value={{ user, isLoading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};
