/**
 * ============================================================================
 * BİLEŞEN ADI: FavoritesContext
 * GÖREV VE AKIŞ AÇIKLAMASI:
 *   Web uygulamasının (e-ticaret) alt bileşenidir. Ziyaretçilere kullanıcı dostu arayüz sunar.
 * ============================================================================
 */
import React, { createContext, useContext, useState, useEffect } from 'react';
import { toast } from 'react-toastify';

const FavoritesContext = createContext();

export const useFavorites = () => useContext(FavoritesContext);

export const FavoritesProvider = ({ children }) => {
    const [favorites, setFavorites] = useState(() => {
        const saved = localStorage.getItem('favorites');
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) {
                console.error("Favoriler parse hatası", e);
            }
        }
        return [];
    });

    useEffect(() => {
        localStorage.setItem('favorites', JSON.stringify(favorites));
    }, [favorites]);

    const addFavorite = (product) => {
        if (!favorites.find(item => item.Id === product.Id)) {
            setFavorites(prev => [...prev, product]);
            toast.success('Ürün favorilere eklendi!');
        }
    };

    const removeFavorite = (productId) => {
        setFavorites(prev => prev.filter(item => item.Id !== productId));
        toast.info('Ürün favorilerden çıkarıldı.');
    };

    const toggleFavorite = (product) => {
        if (favorites.find(item => item.Id === product.Id)) {
            removeFavorite(product.Id);
        } else {
            addFavorite(product);
        }
    };

    const clearFavorites = () => {
        setFavorites([]);
        toast.info('Tüm favoriler temizlendi.');
    };

    const isFavorite = (productId) => {
        return favorites.some(item => item.Id === productId);
    };

    return (
        <FavoritesContext.Provider value={{ favorites, addFavorite, removeFavorite, toggleFavorite, clearFavorites, isFavorite, favoritesCount: favorites.length }}>
            {children}
        </FavoritesContext.Provider>
    );
};


