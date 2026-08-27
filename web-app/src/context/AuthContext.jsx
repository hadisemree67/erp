/**
 * ============================================================================
 * BİLEŞEN ADI: AuthContext
 * GÖREV VE AKIŞ AÇIKLAMASI:
 *   Web uygulamasının (e-ticaret) alt bileşenidir. Ziyaretçilere kullanıcı dostu arayüz sunar.
 * ============================================================================
 */
import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const useAuth = () => {
    return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const verifySession = async () => {
            const token = localStorage.getItem('customerToken');
            const savedUser = localStorage.getItem('customerUser');

            if (token && savedUser) {
                try {
                    const response = await fetch(import.meta.env.VITE_API_URL + '/api/customers/auth/verify', {
                        method: 'GET',
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    });

                    if (!response.ok) {
                        // Eğer token geçersizse, çalınmışsa veya eski oturumsa anında çıkış yap!
                        localStorage.removeItem('customerToken');
                        localStorage.removeItem('customerUser');
                        setCurrentUser(null);
                        alert("Giriş Başarısız. Oturumunuz başka bir cihazdan açıldığı için veya geçersiz olduğu için sonlandırıldı.");
                    } else {
                        // Token sağlamsa kullanıcı bilgilerini state'e al
                        setCurrentUser(JSON.parse(savedUser));
                    }
                } catch (error) {
                    console.error("Session verify error:", error);
                    setCurrentUser(JSON.parse(savedUser)); // Sunucu kapalıysa normal davran
                }
            }
            setLoading(false);
        };

        verifySession();
    }, []);

    const login = (user, token) => {
        setCurrentUser(user);
        localStorage.setItem('customerUser', JSON.stringify(user));
        if (token) {
            localStorage.setItem('customerToken', token);
        }
    };

    const logout = () => {
        localStorage.removeItem('customerToken');
        localStorage.removeItem('customerUser');
        setCurrentUser(null);
    };

    const value = {
        currentUser,
        login,
        logout,
        loading
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};


