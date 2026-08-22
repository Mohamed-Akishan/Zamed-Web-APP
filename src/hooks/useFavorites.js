// src/hooks/useFavorites.js
import { useCallback, useEffect, useMemo, useState } from "react";
import productService from "../services/productService";

const EVENTS = ["favoritesUpdated", "wishlistUpdated", "whitelistUpdated"];
const idOf = (value) => String(value?.id ?? value?._id ?? value ?? "").trim();
const emailOf = (value) => String(value ?? "").trim().toLowerCase();
const storageKey = (email) => `favorites_${emailOf(email)}`;

const parseArray = (value) => {
    try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
};

const currentUser = () => {
    try {
        return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
        return null;
    }
};

const allProducts = () => {
    try {
        const products = productService.getAllProducts();
        if (Array.isArray(products)) return products;
    } catch (error) {
        console.warn("Could not load products", error);
    }
    return parseArray(localStorage.getItem("shop_products"));
};

const hydrate = (items = []) => {
    const productsById = new Map(allProducts().map((item) => [idOf(item), item]));
    const seen = new Set();

    return items.map((item) => {
        const id = idOf(item);
        if (!id || seen.has(id)) return null;
        seen.add(id);
        const storedProduct = productsById.get(id);
        if (item && typeof item === "object") {
            return { ...(storedProduct || {}), ...item, id };
        }
        return storedProduct || null;
    }).filter(Boolean);
};

export const useFavorites = () => {
    const [favorites, setFavorites] = useState([]);
    const [user, setUser] = useState(() => currentUser());
    const [loading, setLoading] = useState(true);
    const [version, setVersion] = useState(0);

    const updateState = useCallback((items) => {
        const products = hydrate(items);
        setFavorites(products);
        setVersion((value) => value + 1);
        setLoading(false);
        return products;
    }, []);

    // Supports loadFavorites(), loadFavorites(true), and loadFavorites(email).
    const loadFavorites = useCallback((emailOrSilent, maybeSilent = false) => {
        const activeUser = currentUser();
        setUser(activeUser);
        const email = typeof emailOrSilent === "string"
            ? emailOrSilent
            : activeUser?.email;
        const silent = typeof emailOrSilent === "boolean"
            ? emailOrSilent
            : Boolean(maybeSilent);

        if (!activeUser || !email) {
            if (!silent) return updateState([]);
            setFavorites([]);
            setVersion((value) => value + 1);
            setLoading(false);
            return [];
        }

        const key = storageKey(email);
        let items = parseArray(localStorage.getItem(key));

        // Read old keys once so existing wishlists are not lost.
        if (!items.length) {
            const legacyKeys = [
                `wishlist_${emailOf(email)}`,
                `whitelist_${emailOf(email)}`,
                "favorites", "wishlist", "whitelist"
            ];
            for (const legacyKey of legacyKeys) {
                const candidate = parseArray(localStorage.getItem(legacyKey));
                if (candidate.length) {
                    items = candidate;
                    break;
                }
            }
            if (!items.length && Array.isArray(activeUser.favorites)) {
                items = activeUser.favorites;
            }
        }

        const products = updateState(items);
        localStorage.setItem(key, JSON.stringify(products));
        return products;
    }, [updateState]);

    // Supports saveFavorites(email, products) and saveFavorites(products, email).
    const saveFavorites = useCallback((first, second) => {
        const activeUser = currentUser();
        const email = typeof first === "string"
            ? first
            : (typeof second === "string" ? second : activeUser?.email);
        const items = Array.isArray(first) ? first : (Array.isArray(second) ? second : []);

        if (!activeUser || !email) {
            return { success: false, message: "Please login to use your wishlist" };
        }

        const products = updateState(items);
        localStorage.setItem(storageKey(email), JSON.stringify(products));
        const detail = {
            email: emailOf(email),
            favorites: products,
            favoriteIds: products.map(idOf)
        };
        EVENTS.forEach((name) => window.dispatchEvent(new CustomEvent(name, { detail })));
        return { success: true, favorites: products };
    }, [updateState]);

    const toggleFavorite = useCallback((product) => {
        const activeUser = currentUser();
        if (!activeUser?.email) {
            return { success: false, isFavorite: false, message: "Please login to use your wishlist" };
        }

        const productId = idOf(product);
        if (!productId) {
            return { success: false, isFavorite: false, message: "This product has no valid ID" };
        }

        // Read storage at click time to avoid stale state during rapid clicks.
        const current = hydrate(parseArray(localStorage.getItem(storageKey(activeUser.email))));
        const exists = current.some((item) => idOf(item) === productId);
        const next = exists
            ? current.filter((item) => idOf(item) !== productId)
            : [...current, { ...product, id: productId }];
        const result = saveFavorites(activeUser.email, next);
        return { ...result, isFavorite: !exists };
    }, [saveFavorites]);

    const favoriteIds = useMemo(() => favorites.map(idOf), [favorites]);
    const favoriteIdSet = useMemo(() => new Set(favoriteIds), [favoriteIds]);
    const isFavorited = useCallback(
        (productOrId) => favoriteIdSet.has(idOf(productOrId)),
        [favoriteIdSet]
    );
    const refreshFavorites = useCallback(
        (silent = true) => loadFavorites(silent),
        [loadFavorites]
    );

    useEffect(() => {
        loadFavorites(false);
        const sync = (event) => {
            const activeUser = currentUser();
            if (!event?.detail?.email || !activeUser?.email ||
                emailOf(event.detail.email) === emailOf(activeUser.email)) {
                loadFavorites(activeUser?.email, true);
            }
        };
        const syncStorage = (event) => {
            if (!event.key || /^(favorites|wishlist|whitelist)(_|$)/.test(event.key) || event.key === "user") {
                sync(event);
            }
        };

        EVENTS.forEach((name) => window.addEventListener(name, sync));
        window.addEventListener("storage", syncStorage);
        window.addEventListener("authChanged", sync);
        window.addEventListener("profileUpdated", sync);
        window.addEventListener("userUpdated", sync);
        return () => {
            EVENTS.forEach((name) => window.removeEventListener(name, sync));
            window.removeEventListener("storage", syncStorage);
            window.removeEventListener("authChanged", sync);
            window.removeEventListener("profileUpdated", sync);
            window.removeEventListener("userUpdated", sync);
        };
    }, [loadFavorites]);

    return {
        favorites, favoriteIds, user, loading, version,
        toggleFavorite, isFavorited, refreshFavorites,
        loadFavorites, saveFavorites
    };
};

export default useFavorites;