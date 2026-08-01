// src/components/Products/ProductGrid.jsx
import { useCart } from "../../context/CartContext";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Star, ShoppingBag, Heart, MessageCircle } from "lucide-react";
import { useState, useEffect } from "react";
import productService from "../../services/productService";
import { loadProductsImages } from "../../utils/imageLoader";

const ProductGrid = ({ products, title }) => {
    const { addToCart } = useCart();
    const navigate = useNavigate();
    const [currencySymbol, setCurrencySymbol] = useState("$");
    const [favorites, setFavorites] = useState([]);
    const [user, setUser] = useState(null);
    const [selectedColor, setSelectedColor] = useState({});
    const [currentImages, setCurrentImages] = useState({});
    const [liveProducts, setLiveProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [settings, setSettings] = useState({
        productsPerRow: 4,
        showProductRatings: true,
        showProductColors: true,
        showProductSizes: true,
        showSaleBadge: true,
        showQuickAdd: true,
        showProductBrand: true
    });

    // Load settings from localStorage
    const loadSettings = () => {
        const siteSettings = JSON.parse(localStorage.getItem('site_settings') || '{}');
        console.log('🔄 ProductGrid - Loading settings:', siteSettings);
        setSettings(prev => ({ ...prev, ...siteSettings }));
    };

    useEffect(() => {
        loadSettings();
        const symbols = { USD: "$", EUR: "€", GBP: "£", LKR: "Rs" };
        const siteSettings = JSON.parse(localStorage.getItem('site_settings') || '{}');
        setCurrencySymbol(symbols[siteSettings.currency] || "$");
        
        const userData = localStorage.getItem('user');
        if (userData) {
            const parsedUser = JSON.parse(userData);
            setUser(parsedUser);
            const userFavorites = JSON.parse(localStorage.getItem(`favorites_${parsedUser.email}`) || '[]');
            setFavorites(userFavorites);
        }
    }, []);

    // Load products with images
    const loadProductsWithImages = async () => {
        setLoading(true);
        try {
            let updatedProducts = products;
            
            if (products && products.length > 0) {
                updatedProducts = await loadProductsImages(products);
            } else {
                const allProducts = productService.getAllProducts();
                updatedProducts = await loadProductsImages(allProducts);
            }
            
            setLiveProducts(updatedProducts);
            
            const initialImages = {};
            const initialColors = {};
            updatedProducts.forEach(product => {
                initialImages[product.id] = product.image;
                if (product.colors && product.colors.length > 0) {
                    initialColors[product.id] = product.colors[0];
                }
            });
            setCurrentImages(initialImages);
            setSelectedColor(initialColors);
        } catch (error) {
            console.error("Error loading products with images:", error);
            setLiveProducts(products || []);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadProductsWithImages();
    }, [products]);

    // Listen for review and product updates
    useEffect(() => {
        const handleReviewUpdate = async () => {
            try {
                const updatedProducts = productService.getAllProducts();
                const loadedProducts = await loadProductsImages(updatedProducts);
                setLiveProducts(loadedProducts);
                
                const initialImages = {};
                const initialColors = {};
                loadedProducts.forEach(product => {
                    initialImages[product.id] = product.image;
                    if (product.colors && product.colors.length > 0) {
                        initialColors[product.id] = product.colors[0];
                    }
                });
                setCurrentImages(initialImages);
                setSelectedColor(initialColors);
            } catch (error) {
                console.error("Error updating products:", error);
            }
        };
        
        // Listen for settings changes and reload settings
        const handleSettingsUpdate = () => {
            console.log('🔄 ProductGrid - Settings updated, reloading...');
            loadSettings();
            // Force re-render
            setLoading(prev => {
                setTimeout(() => setLoading(false), 100);
                return true;
            });
        };
        
        // Also listen for storage changes to catch settings updates
        const handleStorageChange = (e) => {
            if (e.key === 'site_settings') {
                console.log('🔄 ProductGrid - Storage changed, reloading settings...');
                loadSettings();
            }
        };
        
        window.addEventListener('reviewAdded', handleReviewUpdate);
        window.addEventListener('productsUpdated', handleReviewUpdate);
        window.addEventListener('storage', handleStorageChange);
        window.addEventListener('settingsSaved', handleSettingsUpdate);
        window.addEventListener('siteInfoUpdated', handleSettingsUpdate);
        
        return () => {
            window.removeEventListener('reviewAdded', handleReviewUpdate);
            window.removeEventListener('productsUpdated', handleReviewUpdate);
            window.removeEventListener('storage', handleStorageChange);
            window.removeEventListener('settingsSaved', handleSettingsUpdate);
            window.removeEventListener('siteInfoUpdated', handleSettingsUpdate);
        };
    }, []);

    const getColorSwatch = (color) => {
        const colorMap = {
            'Black': '#1a1a1a', 'White': '#f5f5f5', 'Red': '#dc2626', 'Blue': '#3b82f6',
            'Green': '#22c55e', 'Gray': '#9ca3af', 'Grey': '#9ca3af', 'Brown': '#78350f',
            'Navy': '#1e3a8a', 'Pink': '#ec4899', 'Purple': '#a855f7', 'Yellow': '#eab308',
            'Orange': '#f97316', 'Gold': '#fbbf24', 'Silver': '#cbd5e1', 'Nude': '#fde68a',
            'Beige': '#f5e6d3'
        };
        return colorMap[color] || '#cccccc';
    };

    const handleColorClick = (productId, color, colorImage, productImage, e) => {
        e.stopPropagation();
        setSelectedColor(prev => ({ ...prev, [productId]: color }));
        setCurrentImages(prev => ({
            ...prev,
            [productId]: colorImage || productImage
        }));
    };

    const handleProductClick = (productId) => {
        navigate(`/product/${productId}`);
        setTimeout(() => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }, 100);
    };

    const goToProductReviews = (productId, e) => {
        e.stopPropagation();
        navigate(`/product/${productId}#reviews`);
        setTimeout(() => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }, 100);
    };

    const handleAddToCart = (product, e) => {
        e.stopPropagation();
        
        const currentColorName = selectedColor[product.id] || product.colors?.[0] || "Default";
        
        addToCart({
            id: product.id,
            name: product.name,
            price: product.price,
            image: currentImages[product.id] || product.image,
            category: product.category,
            size: product.sizes?.[0] || "One Size",
            color: currentColorName,
            quantity: 1
        });
        
        toast.success(`${product.name} added to cart!`);
    };

    const toggleFavorite = (product, e) => {
        e.stopPropagation();
        
        if (!user) {
            toast.error("Please login to add to favorites");
            return;
        }
        
        const isInFavorites = favorites.some(item => item.id === product.id);
        let updatedFavorites;
        
        if (isInFavorites) {
            updatedFavorites = favorites.filter(item => item.id !== product.id);
            toast.info(`${product.name} removed from favorites`);
        } else {
            updatedFavorites = [...favorites, product];
            toast.success(`${product.name} added to favorites`);
        }
        
        setFavorites(updatedFavorites);
        localStorage.setItem(`favorites_${user.email}`, JSON.stringify(updatedFavorites));
    };

    if (loading) {
        return (
            <div className="py-12 bg-white">
                <div className="container mx-auto px-4">
                    <div className="flex justify-center items-center min-h-[400px]">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                    </div>
                </div>
            </div>
        );
    }

    if (!liveProducts || liveProducts.length === 0) {
        return null;
    }

    // Determine grid columns based on settings - FIXED
    const getGridCols = () => {
        const perRow = parseInt(settings.productsPerRow) || 4;
        console.log('📊 ProductGrid - Products per row:', perRow);
        
        if (perRow === 3) {
            return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3";
        } else if (perRow === 5) {
            return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5";
        } else if (perRow === 2) {
            return "grid-cols-1 sm:grid-cols-2";
        } else {
            // Default to 4 per row
            return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";
        }
    };

    return (
        <div className="py-12 bg-white">
            <div className="container mx-auto px-4">
                {title && (
                    <div className="text-center mb-12">
                        <motion.h2 
                            className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"
                            initial={{ opacity: 0, y: -30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6 }}
                            viewport={{ once: true }}
                        >
                            {title}
                        </motion.h2>
                    </div>
                )}
                
                <div className={`grid ${getGridCols()} gap-6`}>
                    {liveProducts.map((product, index) => {
                        const isFavorite = favorites.some(item => item.id === product.id);
                        const currentImage = currentImages[product.id] || product.image;
                        const currentColorName = selectedColor[product.id] || product.colors?.[0];
                        const productRating = product.rating || 0;
                        const productReviews = product.reviews || 0;
                        
                        return (
                            <motion.div 
                                key={product.id}
                                initial={{ opacity: 0, y: 50 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: index * 0.1, duration: 0.5 }}
                                className="bg-white rounded-xl shadow-md overflow-hidden group hover:shadow-xl transition-all duration-300 flex flex-col h-full border border-gray-100"
                            >
                                {/* Fixed size image container */}
                                <div 
                                    className="relative bg-white cursor-pointer overflow-hidden flex items-center justify-center"
                                    style={{ height: '280px' }}
                                    onClick={() => handleProductClick(product.id)}
                                >
                                    <img 
                                        src={currentImage} 
                                        alt={product.name}
                                        className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-105"
                                    />
                                    
                                    {/* Sale Badge - Controlled by settings */}
                                    {settings.showSaleBadge && product.originalPrice && (
                                        <div className="absolute top-3 left-3 bg-red-500 text-white px-2 py-1 rounded-lg text-xs font-bold z-10">
                                            SALE
                                        </div>
                                    )}
                                    
                                    <button
                                        onClick={(e) => toggleFavorite(product, e)}
                                        className="absolute top-3 right-3 p-2 bg-white rounded-full shadow-md hover:scale-110 transition-all duration-300 z-10"
                                    >
                                        <Heart size={16} className={isFavorite ? "text-red-500 fill-current" : "text-gray-400"} />
                                    </button>
                                </div>
                                
                                <div className="p-4 flex-grow flex flex-col">
                                    <h3 
                                        className="font-semibold text-lg mb-1 line-clamp-1 hover:text-blue-600 transition-colors cursor-pointer" 
                                        onClick={() => handleProductClick(product.id)}
                                    >
                                        {product.name}
                                    </h3>
                                    
                                    {/* Product Brand - Controlled by settings */}
                                    {settings.showProductBrand && (
                                        <p className="text-gray-500 text-sm mb-2">{product.brand || "Zamed Premium"}</p>
                                    )}
                                    
                                    {/* Star Rating - Controlled by settings */}
                                    {settings.showProductRatings && (
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-1">
                                                <div className="flex items-center">
                                                    {[1, 2, 3, 4, 5].map((star) => (
                                                        <Star 
                                                            key={star} 
                                                            size={14} 
                                                            className={`${
                                                                star <= Math.round(productRating) 
                                                                    ? 'text-yellow-400 fill-current' 
                                                                    : 'text-gray-300'
                                                            }`}
                                                        />
                                                    ))}
                                                </div>
                                                <button 
                                                    onClick={(e) => goToProductReviews(product.id, e)}
                                                    className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1 transition-colors"
                                                >
                                                    <MessageCircle size={10} />
                                                    ({productReviews} {productReviews === 1 ? 'review' : 'reviews'})
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                    
                                    <div className="flex items-center gap-2 mb-3">
                                        <span className="text-2xl font-bold text-gray-900">
                                            {currencySymbol}{product.price}
                                        </span>
                                        {settings.showSaleBadge && product.originalPrice && (
                                            <span className="text-sm text-gray-400 line-through">
                                                {currencySymbol}{product.originalPrice}
                                            </span>
                                        )}
                                    </div>
                                    
                                    {/* Color Swatches - Controlled by settings */}
                                    {settings.showProductColors && product.colors && product.colors.length > 0 && (
                                        <div className="mb-3">
                                            <div className="flex gap-2 flex-wrap">
                                                {product.colors.slice(0, 4).map((color, idx) => {
                                                    const colorImage = product.colorImages?.[color] || product.image;
                                                    const isSelected = currentColorName === color;
                                                    
                                                    return (
                                                        <div
                                                            key={idx}
                                                            className="relative group/color"
                                                            onClick={(e) => handleColorClick(product.id, color, colorImage, product.image, e)}
                                                        >
                                                            <div 
                                                                className={`w-10 h-10 rounded-lg border-2 overflow-hidden cursor-pointer hover:scale-110 transition-all duration-200 ${
                                                                    isSelected ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-300'
                                                                }`}
                                                            >
                                                                <img 
                                                                    src={colorImage} 
                                                                    alt={color}
                                                                    className="w-full h-full object-cover"
                                                                />
                                                            </div>
                                                            <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover/color:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-20">
                                                                {color}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                                {product.colors.length > 4 && (
                                                    <div className="w-10 h-10 rounded-lg border-2 border-gray-300 bg-gray-100 flex items-center justify-center text-xs text-gray-500">
                                                        +{product.colors.length - 4}
                                                    </div>
                                                )}
                                            </div>
                                            <p className="text-xs text-gray-500 mt-2">
                                                Selected: <span className="font-medium text-blue-600">{currentColorName}</span>
                                            </p>
                                        </div>
                                    )}
                                    
                                    {/* Quick Add Button - Controlled by settings */}
                                    {settings.showQuickAdd && (
                                        <button 
                                            onClick={(e) => handleAddToCart(product, e)}
                                            className="w-full bg-gray-900 text-white py-2.5 rounded-lg font-semibold hover:bg-gray-800 transition-all flex items-center justify-center gap-2 mt-auto"
                                        >
                                            <ShoppingBag size={16} /> Add to Cart
                                        </button>
                                    )}
                                    
                                    {/* Fallback View Details button if Quick Add is disabled */}
                                    {!settings.showQuickAdd && (
                                        <button 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleProductClick(product.id);
                                            }}
                                            className="w-full bg-gray-900 text-white py-2.5 rounded-lg font-semibold hover:bg-gray-800 transition-all flex items-center justify-center gap-2 mt-auto"
                                        >
                                            <ShoppingBag size={16} /> View Details
                                        </button>
                                    )}
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default ProductGrid;