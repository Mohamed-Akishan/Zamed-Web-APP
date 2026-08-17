// src/hooks/useFavorites.js
import { useState, useEffect, useCallback, useRef } from 'react';
import productService from '../services/productService';

const STORAGE_KEYS = {
    FAVORITES: 'favorites',
    WISHLIST: 'wishlist',
    WHITELIST: 'whitelist'
};

/**
 * Centralized favorites hook - used by all components
 * Ensures favorites are synced across the entire app without blinking
 */
export const useFavorites = () => {
    const [favorites, setFavorites] = useState([]);
    const [favoriteIds, setFavoriteIds] = useState([]);
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const isInitialLoad = useRef(true);
    const updateTimeout = useRef(null);

    // Get current user
    const getUser = useCallback(() => {
        try {
            const userData = localStorage.getItem('user');
            if (userData) {
                return JSON.parse(userData);
            }
            return null;
        } catch {
            return null;
        }
    }, []);

    // ============================================================
    // Load favorites from ALL possible storage locations
    // ============================================================
    const loadFavorites = useCallback((silent = false) => {
        const currentUser = getUser();
        setUser(currentUser);

        if (!currentUser) {
            if (!silent) {
                setFavorites([]);
                setFavoriteIds([]);
                setLoading(false);
            }
            return [];
        }

        const email = currentUser.email;
        let ids = [];

        // Try all possible keys
        const possibleKeys = [
            `favorites_${email}`,
            `wishlist_${email}`,
            `whitelist_${email}`,
            STORAGE_KEYS.FAVORITES,
            STORAGE_KEYS.WISHLIST,
            STORAGE_KEYS.WHITELIST
        ];

        for (const key of possibleKeys) {
            try {
                const data = localStorage.getItem(key);
                if (data) {
                    const parsed = JSON.parse(data);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        ids = parsed;
                        break;
                    }
                }
            } catch (e) {
                // Continue to next key
            }
        }

        // Also check user object
        if (ids.length === 0 && currentUser.favorites) {
            ids = Array.isArray(currentUser.favorites) ? currentUser.favorites : [];
        }

        // Load full products
        let allProducts = [];
        try {
            allProducts = productService.getAllProducts() || [];
        } catch (e) {
            try {
                const stored = localStorage.getItem('shop_products');
                if (stored) {
                    allProducts = JSON.parse(stored);
                }
            } catch (e2) { }
        }

        const favoriteProducts = allProducts.filter(product =>
            ids.some(id => String(id) === String(product.id))
        );

        // Update state - this triggers re-renders
        setFavoriteIds(ids);
        setFavorites(favoriteProducts);

        if (!silent && isInitialLoad.current) {
            setLoading(false);
            isInitialLoad.current = false;
        }
        
        return favoriteProducts;
    }, [getUser]);

    // ============================================================
    // Save favorites to ALL storage locations
    // ============================================================
    const saveFavorites = useCallback((email, favoriteProducts) => {
        if (!email) return;

        const ids = favoriteProducts.map(p => p.id);

        // Save to all possible keys
        const keys = [
            `favorites_${email}`,
            `wishlist_${email}`,
            `whitelist_${email}`,
            STORAGE_KEYS.FAVORITES,
            STORAGE_KEYS.WISHLIST,
            STORAGE_KEYS.WHITELIST
        ];

        for (const key of keys) {
            try {
                localStorage.setItem(key, JSON.stringify(ids));
            } catch (e) {
                // Silent fail
            }
        }

        // Update user object
        try {
            const userData = localStorage.getItem('user');
            if (userData) {
                const parsedUser = JSON.parse(userData);
                parsedUser.favorites = ids;
                localStorage.setItem('user', JSON.stringify(parsedUser));
            }
        } catch (e) {
            // Silent fail
        }

        // Update local state immediately
        setFavoriteIds(ids);
        setFavorites(favoriteProducts);

        // Dispatch events for all components
        const eventDetail = { email, favorites: favoriteProducts, favoriteIds: ids };
        window.dispatchEvent(new CustomEvent('favoritesUpdated', { detail: eventDetail }));
        window.dispatchEvent(new CustomEvent('wishlistUpdated', { detail: eventDetail }));
        window.dispatchEvent(new CustomEvent('whitelistUpdated', { detail: eventDetail }));
        window.dispatchEvent(new Event('storage'));
    }, []);

    // ============================================================
    // Toggle favorite for a product - IMMEDIATE UI update
    // ============================================================
    const toggleFavorite = useCallback((product) => {
        const currentUser = getUser();
        if (!currentUser) {
            return { success: false, message: 'Please login to add favorites' };
        }

        // Check current favorite status using favoriteIds for speed
        const isFavorite = favoriteIds.some(id => String(id) === String(product.id));
        let updatedFavorites;
        let updatedIds;

        if (isFavorite) {
            updatedFavorites = favorites.filter(item => String(item.id) !== String(product.id));
            updatedIds = updatedFavorites.map(p => p.id);
        } else {
            updatedFavorites = [...favorites, product];
            updatedIds = updatedFavorites.map(p => p.id);
        }

        // IMMEDIATELY update state - triggers re-render
        setFavoriteIds(updatedIds);
        setFavorites(updatedFavorites);
        
        // Save to storage
        saveFavorites(currentUser.email, updatedFavorites);

        return {
            success: true,
            isFavorite: !isFavorite,
            favorites: updatedFavorites
        };
    }, [favorites, favoriteIds, getUser, saveFavorites]);

    // ============================================================
    // Check if a product is favorited - uses state for reactivity
    // ============================================================
    const isFavorited = useCallback((productId) => {
        return favoriteIds.some(id => String(id) === String(productId));
    }, [favoriteIds]);

    // ============================================================
    // Force refresh favorites - silent by default
    // ============================================================
    const refreshFavorites = useCallback((silent = true) => {
        return loadFavorites(silent);
    }, [loadFavorites]);

    // ============================================================
    // Set up event listeners for cross-component sync
    // ============================================================
    useEffect(() => {
        // Load favorites initially
        loadFavorites(false);

        // Listen for favorites updates from other components
        const handleFavoritesUpdate = (event) => {
            const detail = event?.detail;
            
            // If the event has full product objects, use them
            if (detail?.favorites && detail?.email) {
                const eventFavorites = detail.favorites;
                const eventEmail = detail.email;
                const currentUser = getUser();
                
                if (currentUser && String(eventEmail).toLowerCase() === String(currentUser.email).toLowerCase()) {
                    if (Array.isArray(eventFavorites)) {
                        if (eventFavorites.length > 0 && typeof eventFavorites[0] === 'object' && eventFavorites[0].id) {
                            // It's full products - update directly
                            const ids = eventFavorites.map(p => p.id);
                            setFavoriteIds(ids);
                            setFavorites(eventFavorites);
                            return;
                        }
                    }
                }
            }
            
            // If event has favoriteIds, use them
            if (detail?.favoriteIds && detail?.email) {
                const eventIds = detail.favoriteIds;
                const eventEmail = detail.email;
                const currentUser = getUser();
                
                if (currentUser && String(eventEmail).toLowerCase() === String(currentUser.email).toLowerCase()) {
                    setFavoriteIds(eventIds);
                    // Reload full products
                    loadFavorites(true);
                    return;
                }
            }
            
            // Fallback: reload silently
            loadFavorites(true);
        };

        // Listen for storage changes - silent reload
        const handleStorage = (event) => {
            if (event.key && (
                event.key.startsWith('favorites_') ||
                event.key.startsWith('wishlist_') ||
                event.key.startsWith('whitelist_') ||
                event.key === STORAGE_KEYS.FAVORITES ||
                event.key === STORAGE_KEYS.WISHLIST ||
                event.key === STORAGE_KEYS.WHITELIST ||
                event.key === 'user'
            )) {
                // Debounce storage events
                if (updateTimeout.current) {
                    clearTimeout(updateTimeout.current);
                }
                updateTimeout.current = setTimeout(() => {
                    loadFavorites(true);
                    updateTimeout.current = null;
                }, 100);
            }
        };

        // Listen for auth changes
        const handleAuthChange = () => {
            loadFavorites(true);
        };

        window.addEventListener('favoritesUpdated', handleFavoritesUpdate);
        window.addEventListener('wishlistUpdated', handleFavoritesUpdate);
        window.addEventListener('whitelistUpdated', handleFavoritesUpdate);
        window.addEventListener('storage', handleStorage);
        window.addEventListener('authChanged', handleAuthChange);
        window.addEventListener('profileUpdated', handleAuthChange);
        window.addEventListener('userUpdated', handleAuthChange);

        return () => {
            window.removeEventListener('favoritesUpdated', handleFavoritesUpdate);
            window.removeEventListener('wishlistUpdated', handleFavoritesUpdate);
            window.removeEventListener('whitelistUpdated', handleFavoritesUpdate);
            window.removeEventListener('storage', handleStorage);
            window.removeEventListener('authChanged', handleAuthChange);
            window.removeEventListener('profileUpdated', handleAuthChange);
            window.removeEventListener('userUpdated', handleAuthChange);
            if (updateTimeout.current) {
                clearTimeout(updateTimeout.current);
            }
        };
    }, [loadFavorites, getUser]);

    return {
        favorites,
        favoriteIds,
        user,
        loading,
        toggleFavorite,
        isFavorited,
        refreshFavorites,
        loadFavorites,
        saveFavorites
    };
};

export default useFavorites;