import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../api/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadUser();
    }, []);

    const loadUser = async () => {
        try {
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
