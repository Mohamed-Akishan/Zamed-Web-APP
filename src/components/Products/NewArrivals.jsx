// src/components/Products/NewArrivals.jsx
import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Star, ShoppingBag, Heart, Sparkles, ArrowRight } from "lucide-react";
import { useCart } from "../../context/CartContext";
import { toast } from "sonner";
import productService from "../../services/productService";
import { getWorkingImage } from "../../utils/imageUtils";
import { loadProductImages } from "../../utils/imageLoader";
import useFavorites from "../../hooks/useFavorites";

const API_URL = (
    import.meta.env.VITE_API_URL ||
    (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
        ? "http://localhost:5000/api"
        : "https://zamed-backend-1.onrender.com/api")
).replace(/\/$/, "");

const NewArrivals = () => {
    const navigate = useNavigate();
    const [newArrivals, setNewArrivals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currencySymbol, setCurrencySymbol] = useState("$");
    const [selectedColor, setSelectedColor] = useState({});
    const [currentImages, setCurrentImages] = useState({});
    const [colorImages, setColorImages] = useState({});
    const [hoveredProduct, setHoveredProduct] = useState(null);
    const [isVisible, setIsVisible] = useState(false);
    const [hoverInterval, setHoverInterval] = useState({});
    const [hoverColorIndex, setHoverColorIndex] = useState({});
    const [settings, setSettings] = useState({
        productsPerRow: 4,
        showProductRatings: true,
        showProductColors: true,
        showProductSizes: true,
        showSaleBadge: true,
        showQuickAdd: true,
        showProductBrand: true
    });

    // ============================================================
    // Use centralized favorites hook
    // ============================================================
    const { 
        favoriteIds,
        version,
        toggleFavorite, 
        isFavorited, 
        refreshFavorites 
    } = useFavorites();

    const fallbackProductImage = getWorkingImage(0);
    const scrollContainerRef = useRef(null);
    const sectionRef = useRef(null);
    const { addToCart } = useCart();

    const loadSettings = useCallback(() => {
        try {
            const siteSettings = JSON.parse(localStorage.getItem('site_settings') || '{}');
            const productsPerRow = parseInt(siteSettings.productsPerRow) || 4;
            setSettings(prev => ({
                ...prev,
                ...siteSettings,
                productsPerRow: productsPerRow,
                showProductRatings: siteSettings.showProductRatings !== undefined ? siteSettings.showProductRatings : true,
                showProductColors: siteSettings.showProductColors !== undefined ? siteSettings.showProductColors : true,
                showProductSizes: siteSettings.showProductSizes !== undefined ? siteSettings.showProductSizes : true,
                showSaleBadge: siteSettings.showSaleBadge !== undefined ? siteSettings.showSaleBadge : true,
                showQuickAdd: siteSettings.showQuickAdd !== undefined ? siteSettings.showQuickAdd : true,
                showProductBrand: siteSettings.showProductBrand !== undefined ? siteSettings.showProductBrand : true
            }));
        } catch (error) {
            console.error('Error loading settings:', error);
        }
    }, []);

    useEffect(() => {
        loadSettings();
        const symbols = { USD: "$", EUR: "€", GBP: "£", LKR: "Rs" };
        const siteSettings = JSON.parse(localStorage.getItem('site_settings') || '{}');
        setCurrencySymbol(symbols[siteSettings.currency] || "$");
        
        refreshFavorites(true);
    }, [loadSettings, refreshFavorites]);

    // Listen for favorites updates
    useEffect(() => {
        const handleFavoritesUpdate = () => {
            refreshFavorites(true);
        };

        window.addEventListener('favoritesUpdated', handleFavoritesUpdate);
        window.addEventListener('wishlistUpdated', handleFavoritesUpdate);
        window.addEventListener('whitelistUpdated', handleFavoritesUpdate);
        window.addEventListener('storage', handleFavoritesUpdate);

        return () => {
            window.removeEventListener('favoritesUpdated', handleFavoritesUpdate);
            window.removeEventListener('wishlistUpdated', handleFavoritesUpdate);
            window.removeEventListener('whitelistUpdated', handleFavoritesUpdate);
            window.removeEventListener('storage', handleFavoritesUpdate);
        };
    }, [refreshFavorites]);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                }
            },
            { threshold: 0.1, triggerOnce: true }
        );
        if (sectionRef.current) {
            observer.observe(sectionRef.current);
        }
        return () => {
            if (sectionRef.current) {
                observer.unobserve(sectionRef.current);
            }
        };
    }, []);

    // ============================================================
    // FIX: Load new arrivals from MongoDB first
    // ============================================================
    const loadNewArrivals = useCallback(async () => {
        setLoading(true);
        try {
            let products = [];
            let apiSucceeded = false;

            // ✅ PRIMARY: Fetch from MongoDB
            try {
                const response = await fetch(`${API_URL}/products`, {
                    headers: { Accept: "application/json" }
                });
                if (response.ok) {
                    const result = await response.json();
                    const raw = Array.isArray(result)
                        ? result
                        : result.products ?? result.data?.products ?? result.data ?? [];
                    if (Array.isArray(raw) && raw.length > 0) {
                        products = raw;
                        apiSucceeded = true;
                        console.log('✅ New arrivals loaded from MongoDB:', products.length);
                    }
                }
            } catch (apiError) {
                console.warn("MongoDB fetch failed for new arrivals:", apiError);
            }

            // ✅ FALLBACK: productService if API failed
            if (!apiSucceeded || products.length === 0) {
                try {
                    const serviceProducts = productService.getAllProducts() || [];
                    if (Array.isArray(serviceProducts) && serviceProducts.length > 0) {
                        products = serviceProducts;
                        console.log('✅ New arrivals loaded from productService:', products.length);
                    }
                } catch (serviceError) {
                    console.warn("Product service fallback failed:", serviceError);
                }
            }

            // ✅ SECONDARY FALLBACK: localStorage
            if (!apiSucceeded && products.length === 0) {
                const possibleKeys = ['shop_products', 'products', 'admin_products', 'product_data'];
                for (const key of possibleKeys) {
                    try {
                        const stored = localStorage.getItem(key);
                        if (stored) {
                            const parsed = JSON.parse(stored);
                            if (Array.isArray(parsed) && parsed.length > 0) {
                                products = parsed;
                                console.log('✅ New arrivals loaded from localStorage:', key);
                                break;
                            }
                        }
                    } catch (e) {
                        // Continue to next key
                    }
                }
            }

            // Filter new arrivals
            const uniqueProducts = [];
            const seenIds = new Set();
            products.forEach(product => {
                const productId = String(product.id ?? product._id ?? "");
                if (productId && !seenIds.has(productId) && product.isNewArrival === true) {
                    seenIds.add(productId);
                    uniqueProducts.push({ ...product, id: productId });
                }
            });

            if (uniqueProducts.length === 0) {
                console.log('ℹ️ No new arrivals found');
                setNewArrivals([]);
                setLoading(false);
                return;
            }
            
            const productsWithImages = [];
            const initialImages = {};
            const initialColorImages = {};
            const initialColors = {};
            
            for (const product of uniqueProducts) {
                const loadedProduct = await loadProductImages(product);
                productsWithImages.push({ ...loadedProduct, id: product.id });
                
                initialImages[product.id] = loadedProduct.image || fallbackProductImage;
                initialColorImages[product.id] = loadedProduct.colorImages || {};
                
                if (product.colors && product.colors.length > 0) {
                    initialColors[product.id] = product.colors[0];
                }
            }
            
            setNewArrivals(productsWithImages);
            setCurrentImages(initialImages);
            setColorImages(initialColorImages);
            setSelectedColor(initialColors);
            
        } catch (error) {
            console.error("Error loading new arrivals:", error);
            setNewArrivals([]);
        } finally {
            setLoading(false);
        }
    }, [fallbackProductImage]);

    useEffect(() => {
        loadNewArrivals();
        
        const handleProductsUpdate = () => loadNewArrivals();
        const handleReviewUpdate = () => loadNewArrivals();
        const handleSettingsUpdate = () => {
            loadSettings();
        };
        const handleStorageChange = (e) => {
            if (e.key === 'site_settings') {
                loadSettings();
            }
        };
        
        window.addEventListener('productsUpdated', handleProductsUpdate);
        window.addEventListener('storage', handleStorageChange);
        window.addEventListener('reviewAdded', handleReviewUpdate);
        window.addEventListener('settingsSaved', handleSettingsUpdate);
        window.addEventListener('siteInfoUpdated', handleSettingsUpdate);
        
        return () => {
            window.removeEventListener('productsUpdated', handleProductsUpdate);
            window.removeEventListener('storage', handleStorageChange);
            window.removeEventListener('reviewAdded', handleReviewUpdate);
            window.removeEventListener('settingsSaved', handleSettingsUpdate);
            window.removeEventListener('siteInfoUpdated', handleSettingsUpdate);
        };
    }, [loadNewArrivals, loadSettings]);

    // ... (rest of the component - keep the existing hover, scroll, and render logic)

    // The startHoverCycle, stopHoverCycle, handleMouseEnter, handleMouseLeave,
    // scrollToLeft, scrollToRight, handleColorClick, handleProductClick,
    // handleAddToCart, handleToggleFavorite, getGridCols functions remain the same

    if (loading) {
        return (
            <section className="py-20 bg-white" ref={sectionRef}>
                <div className="container mx-auto px-4 text-center">
                    <div className="inline-block">
                        <div className="w-12 h-12 border-2 border-gray-200 border-t-black rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-gray-400 text-sm">Loading new arrivals...</p>
                    </div>
                </div>
            </section>
        );
    }

    if (newArrivals.length === 0) {
        return null;
    }

    // ... (render the JSX - keep the existing JSX)
};

export default NewArrivals;