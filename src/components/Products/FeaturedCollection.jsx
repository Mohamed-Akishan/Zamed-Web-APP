// src/components/Products/FeaturedCollection.jsx
import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect, useCallback, useRef } from "react";
import { ShoppingBag, Star, Heart, ArrowRight, ChevronLeft, ChevronRight, Maximize2 } from "lucide-react";
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

const FeaturedCollection = () => {
    const navigate = useNavigate();
    const [featuredProducts, setFeaturedProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currencySymbol, setCurrencySymbol] = useState("$");
    const [selectedColor, setSelectedColor] = useState({});
    const [displayImage, setDisplayImage] = useState({});
    const [colorImages, setColorImages] = useState({});
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isTransitioning, setIsTransitioning] = useState(false);
    const [showFullImage, setShowFullImage] = useState(false);
    const [fullImageUrl, setFullImageUrl] = useState("");
    const [hoveredProduct, setHoveredProduct] = useState(null);
    const [hoverInterval, setHoverInterval] = useState({});
    const [hoverColorIndex, setHoverColorIndex] = useState({});
    const [settings, setSettings] = useState({
        showProductRatings: true,
        showProductColors: true,
        showSaleBadge: true,
        showProductBrand: true
    });
    const { addToCart } = useCart();
    const fallbackProductImage = getWorkingImage(0);

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

    const favoritesKey = useRef(0);
    
    useEffect(() => {
        favoritesKey.current += 1;
    }, [version]);

    const loadSettings = useCallback(() => {
        const siteSettings = JSON.parse(localStorage.getItem('site_settings') || '{}');
        setSettings({
            showProductRatings: siteSettings.showProductRatings !== undefined ? siteSettings.showProductRatings : true,
            showProductColors: siteSettings.showProductColors !== undefined ? siteSettings.showProductColors : true,
            showSaleBadge: siteSettings.showSaleBadge !== undefined ? siteSettings.showSaleBadge : true,
            showProductBrand: siteSettings.showProductBrand !== undefined ? siteSettings.showProductBrand : true
        });
    }, []);

    // ============================================================
    // FIX: Load featured products from MongoDB first
    // ============================================================
    const loadFeaturedProducts = useCallback(async () => {
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
                        console.log('✅ Featured products loaded from MongoDB:', products.length);
                    }
                }
            } catch (apiError) {
                console.warn("MongoDB fetch failed for featured products:", apiError);
            }

            // ✅ FALLBACK: productService if API failed
            if (!apiSucceeded || products.length === 0) {
                try {
                    const serviceProducts = productService.getAllProducts() || [];
                    if (Array.isArray(serviceProducts) && serviceProducts.length > 0) {
                        products = serviceProducts;
                        console.log('✅ Featured products loaded from productService:', products.length);
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
                                console.log('✅ Featured products loaded from localStorage:', key);
                                break;
                            }
                        }
                    } catch (e) {
                        // Continue to next key
                    }
                }
            }

            // Filter featured products
            const featured = products.filter(p => p.isFeatured === true);
            
            if (featured.length === 0) {
                console.log('ℹ️ No featured products found');
                setFeaturedProducts([]);
                setLoading(false);
                return;
            }
            
            const productsWithImages = [];
            const imageState = {};
            const colorImageState = {};
            const colorState = {};
            
            for (const product of featured) {
                const loadedProduct = await loadProductImages(product);
                productsWithImages.push(loadedProduct);
                
                imageState[product.id] = loadedProduct.image || fallbackProductImage;
                colorImageState[product.id] = loadedProduct.colorImages || {};
                
                if (product.colors && product.colors.length > 0) {
                    colorState[product.id] = product.colors[0];
                } else {
                    colorState[product.id] = null;
                }
            }
            
            setFeaturedProducts(productsWithImages);
            setDisplayImage(imageState);
            setColorImages(colorImageState);
            setSelectedColor(colorState);
            setCurrentIndex(0);
            
        } catch (error) {
            console.error('Error loading featured products:', error);
            setFeaturedProducts([]);
        } finally {
            setLoading(false);
        }
    }, [fallbackProductImage]);

    useEffect(() => {
        loadSettings();
        loadFeaturedProducts();
        
        const handleProductsUpdate = () => {
            loadFeaturedProducts();
        };
        
        const siteSettings = JSON.parse(localStorage.getItem('site_settings') || '{}');
        const symbols = { USD: "$", EUR: "€", GBP: "£", LKR: "Rs" };
        setCurrencySymbol(symbols[siteSettings.currency] || "$");
        
        window.addEventListener('productsUpdated', handleProductsUpdate);
        window.addEventListener('storage', handleProductsUpdate);
        
        refreshFavorites(true);
        
        return () => {
            window.removeEventListener('productsUpdated', handleProductsUpdate);
            window.removeEventListener('storage', handleProductsUpdate);
        };
    }, [loadFeaturedProducts, loadSettings, refreshFavorites]);

    // Listen for favorites updates
    useEffect(() => {
        const handleFavoritesUpdate = () => {
            refreshFavorites(true);
            favoritesKey.current += 1;
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

    // ============================================================
    // Hover cycling through color images
    // ============================================================
    const startHoverCycle = (productId) => {
        stopHoverCycle(productId);
        
        const product = featuredProducts.find(p => p.id === productId);
        if (!product || !product.colors || product.colors.length <= 1) return;
        
        const colorList = product.colors;
        const currentIndex = hoverColorIndex[productId] || 0;
        const nextIndex = (currentIndex + 1) % colorList.length;
        
        const interval = setInterval(() => {
            setHoverColorIndex(prev => {
                const currentIdx = prev[productId] || 0;
                const nextIdx = (currentIdx + 1) % colorList.length;
                
                const colorName = colorList[nextIdx];
                const colorImgMap = colorImages[productId] || {};
                const newImage = colorImgMap[colorName] || displayImage[productId] || fallbackProductImage;
                
                setDisplayImage(prevImages => ({
                    ...prevImages,
                    [productId]: newImage
                }));
                
                setSelectedColor(prevColors => ({
                    ...prevColors,
                    [productId]: colorName
                }));
                
                return { ...prev, [productId]: nextIdx };
            });
        }, 1150);
        
        setHoverInterval(prev => ({ ...prev, [productId]: interval }));
    };

    const stopHoverCycle = (productId) => {
        if (hoverInterval && hoverInterval[productId]) {
            clearInterval(hoverInterval[productId]);
            setHoverInterval(prev => {
                const newState = { ...prev };
                delete newState[productId];
                return newState;
            });
        }
    };

    const handleMouseEnter = (productId) => {
        setHoveredProduct(productId);
        setHoverColorIndex(prev => ({ ...prev, [productId]: 0 }));
        startHoverCycle(productId);
    };

    const handleMouseLeave = (productId) => {
        setHoveredProduct(null);
        stopHoverCycle(productId);
        
        const product = featuredProducts.find(p => p.id === productId);
        if (product) {
            const originalColor = selectedColor[productId] || product.colors?.[0];
            if (originalColor) {
                const colorImgMap = colorImages[productId] || {};
                const originalImage = colorImgMap[originalColor] || product.image || fallbackProductImage;
                setDisplayImage(prev => ({
                    ...prev,
                    [productId]: originalImage
                }));
                setSelectedColor(prev => ({
                    ...prev,
                    [productId]: originalColor
                }));
            }
        }
    };

    const handleColorClick = (product, color, e) => {
        e.stopPropagation();
        
        stopHoverCycle(product.id);
        setHoveredProduct(null);
        
        setSelectedColor(prev => ({
            ...prev,
            [product.id]: color
        }));
        
        const colorImgMap = colorImages[product.id] || {};
        const newImage = colorImgMap[color] || displayImage[product.id] || fallbackProductImage;
        
        setDisplayImage(prev => ({
            ...prev,
            [product.id]: newImage
        }));
    };

    const handleAddToCart = (product, e) => {
        e.preventDefault();
        e.stopPropagation();
        
        const productColor = selectedColor[product.id] || product.colors?.[0] || "Default";
        const productImage = displayImage[product.id] || product.image || fallbackProductImage;
        
        addToCart({
            id: product.id,
            name: product.name,
            price: product.price,
            image: productImage,
            category: product.category,
            size: product.sizes?.[0] || "One Size",
            color: productColor,
            quantity: 1
        });
        
        toast.success(`${product.name} added to cart!`);
    };

    const handleProductClick = (productId) => {
        navigate(`/product/${productId}`);
        setTimeout(() => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }, 100);
    };

    const handleToggleFavorite = (product, e) => {
        e.preventDefault();
        e.stopPropagation();
        const result = toggleFavorite(product);
        if (!result.success) {
            toast.error(result.message);
            navigate('/login');
        } else {
            toast.success(result.isFavorite ? `${product.name} added to favorites` : `${product.name} removed from favorites`);
        }
    };

    const openFullImage = (imageUrl, e) => {
        e.stopPropagation();
        setFullImageUrl(imageUrl);
        setShowFullImage(true);
    };

    const closeFullImage = () => {
        setShowFullImage(false);
        setFullImageUrl("");
    };

    const goToPrevious = () => {
        if (isTransitioning || featuredProducts.length === 0) return;
        setIsTransitioning(true);
        setCurrentIndex(prev => (prev === 0 ? featuredProducts.length - 1 : prev - 1));
        setTimeout(() => setIsTransitioning(false), 500);
    };

    const goToNext = () => {
        if (isTransitioning || featuredProducts.length === 0) return;
        setIsTransitioning(true);
        setCurrentIndex(prev => (prev === featuredProducts.length - 1 ? 0 : prev + 1));
        setTimeout(() => setIsTransitioning(false), 500);
    };

    const goToSlide = (index) => {
        if (isTransitioning || index === currentIndex) return;
        setIsTransitioning(true);
        setCurrentIndex(index);
        setTimeout(() => setIsTransitioning(false), 500);
    };

    // Auto-play
    useEffect(() => {
        if (featuredProducts.length <= 1) return;
        const interval = setInterval(() => {
            if (!isTransitioning) {
                goToNext();
            }
        }, 5000);
        return () => clearInterval(interval);
    }, [featuredProducts.length, isTransitioning]);

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'ArrowLeft') goToPrevious();
            if (e.key === 'ArrowRight') goToNext();
            if (e.key === 'Escape') closeFullImage();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [featuredProducts.length]);

    const getValidImageUrl = (image) => {
        if (!image) return fallbackProductImage;
        if (image.startsWith('data:') || image.startsWith('http')) return image;
        if (image.startsWith('db://')) {
            return fallbackProductImage;
        }
        return fallbackProductImage;
    };

    const getTagsArray = (tags) => {
        if (!tags) return [];
        if (Array.isArray(tags)) return tags;
        if (typeof tags === 'string') {
            return tags.split(',').map(tag => tag.trim()).filter(tag => tag);
        }
        return [];
    };

    if (loading) {
        return (
            <div className="py-16 bg-gray-50">
                <div className="container mx-auto px-4 text-center">
                    <div className="w-12 h-12 border-2 border-gray-200 border-t-black rounded-full animate-spin mx-auto"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="py-16 bg-gradient-to-b from-gray-100 to-gray-50">
            <div className="container mx-auto px-4">
                <div className="text-center mb-10">
                    <h2 className="text-2xl sm:text-3xl font-light text-gray-800">Featured Collection</h2>
                    <p className="text-gray-400 text-sm mt-2">Our hand-picked selection just for you</p>
                    <div className="w-12 h-0.5 bg-gray-300 mx-auto mt-4"></div>
                </div>

                {featuredProducts.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-2xl shadow-sm border border-gray-100">
                        <div className="flex justify-center mb-4">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                                <ShoppingBag size={28} className="text-gray-400" />
                            </div>
                        </div>
                        <h3 className="text-lg font-medium text-gray-700 mb-2">No Featured Products</h3>
                        <p className="text-gray-400 text-sm max-w-md mx-auto">
                            Mark products as featured in the admin panel to display them here.
                        </p>
                    </div>
                ) : (
                    <div className="relative max-w-6xl mx-auto">
                        {/* ... rest of the JSX remains the same ... */}
                        {/* (keep the existing JSX for the slider) */}
                    </div>
                )}
            </div>

            {/* Full Image Modal */}
            {showFullImage && (
                <div 
                    className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
                    onClick={closeFullImage}
                >
                    <div 
                        className="relative max-w-5xl w-full max-h-[90vh] bg-white rounded-2xl overflow-hidden shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            onClick={closeFullImage}
                            className="absolute top-4 right-4 z-10 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full transition-all duration-300"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>

                        <div className="flex items-center justify-center p-4 min-h-[300px] max-h-[90vh] bg-white">
                            <img 
                                src={fullImageUrl} 
                                alt="Product full view" 
                                className="max-w-full max-h-[85vh] object-contain"
                                onError={(e) => {
                                    e.target.src = fallbackProductImage;
                                }}
                            />
                        </div>

                        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/70 to-transparent text-white text-center">
                            <p className="text-sm">Click anywhere outside or press ESC to close</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FeaturedCollection;