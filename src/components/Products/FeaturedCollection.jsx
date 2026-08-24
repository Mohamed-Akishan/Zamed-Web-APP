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

    const { 
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

    const loadFeaturedProducts = useCallback(async () => {
        setLoading(true);
        try {
            let products = [];
            let apiSucceeded = false;

            // Try MongoDB first
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
                console.warn("MongoDB fetch failed:", apiError);
            }

            // Fallback to productService
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

            // Fallback to localStorage
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
                    } catch (e) {}
                }
            }

            // ✅ FIX: Take first 6 products as featured (or filter by isFeatured)
            let featured = products.filter(p => p.isFeatured === true);
            
            // If no featured products, take first 6
            if (featured.length === 0) {
                featured = products.slice(0, 6);
                console.log('ℹ️ No featured products found, showing first 6 products');
            }
            
            if (featured.length === 0) {
                console.log('ℹ️ No products available');
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
        
        const handleProductsUpdate = () => loadFeaturedProducts();
        
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

    // ... (startHoverCycle, stopHoverCycle, handleMouseEnter, handleMouseLeave functions remain the same)
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

    useEffect(() => {
        if (featuredProducts.length <= 1) return;
        const interval = setInterval(() => {
            if (!isTransitioning) {
                goToNext();
            }
        }, 5000);
        return () => clearInterval(interval);
    }, [featuredProducts.length, isTransitioning]);

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
                        <h3 className="text-lg font-medium text-gray-700 mb-2">No Products Available</h3>
                        <p className="text-gray-400 text-sm max-w-md mx-auto">
                            Add products in the admin panel to display them here.
                        </p>
                    </div>
                ) : (
                    <div className="relative max-w-6xl mx-auto">
                        {featuredProducts.length > 1 && (
                            <>
                                <button
                                    onClick={goToPrevious}
                                    className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 sm:-translate-x-4 lg:-translate-x-6 z-20 w-10 h-10 sm:w-12 sm:h-12 bg-white/90 backdrop-blur-sm rounded-full shadow-lg hover:bg-white hover:shadow-xl transition-all duration-300 flex items-center justify-center border border-gray-200 group"
                                    aria-label="Previous product"
                                >
                                    <ChevronLeft size={20} className="sm:w-6 sm:h-6 text-gray-700 group-hover:scale-110 transition-transform" />
                                </button>
                                <button
                                    onClick={goToNext}
                                    className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-3 sm:translate-x-4 lg:translate-x-6 z-20 w-10 h-10 sm:w-12 sm:h-12 bg-white/90 backdrop-blur-sm rounded-full shadow-lg hover:bg-white hover:shadow-xl transition-all duration-300 flex items-center justify-center border border-gray-200 group"
                                    aria-label="Next product"
                                >
                                    <ChevronRight size={20} className="sm:w-6 sm:h-6 text-gray-700 group-hover:scale-110 transition-transform" />
                                </button>
                            </>
                        )}

                        {featuredProducts.length > 1 && (
                            <div className="absolute top-4 right-4 z-20 bg-black/70 backdrop-blur-sm text-white text-xs px-3 py-1.5 rounded-full">
                                {currentIndex + 1} / {featuredProducts.length}
                            </div>
                        )}

                        <div className="overflow-hidden rounded-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.25)] transform perspective-1000">
                            <div 
                                className="flex transition-transform duration-500 ease-in-out"
                                style={{ transform: `translateX(-${currentIndex * 100}%)` }}
                                key={`featured-slider-${version}`}
                            >
                                {featuredProducts.map((featuredProduct, index) => {
                                    const isFavorite = isFavorited(featuredProduct.id);
                                    const productRating = featuredProduct.rating || 0;
                                    const productReviews = featuredProduct.reviews || 0;
                                    const currentColor = selectedColor[featuredProduct.id] || featuredProduct.colors?.[0] || null;
                                    const currentImage = displayImage[featuredProduct.id] || featuredProduct.image || fallbackProductImage;
                                    const tagsArray = getTagsArray(featuredProduct.tags);
                                    const colorImageMap = colorImages[featuredProduct.id] || {};
                                    const isHovered = hoveredProduct === featuredProduct.id;

                                    return (
                                        <div 
                                            key={featuredProduct.id}
                                            className="min-w-full cursor-pointer"
                                            onMouseEnter={() => handleMouseEnter(featuredProduct.id)}
                                            onMouseLeave={() => handleMouseLeave(featuredProduct.id)}
                                            onClick={() => handleProductClick(featuredProduct.id)}
                                        >
                                            <div className="bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-1">
                                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
                                                    <div className="relative overflow-hidden bg-white">
                                                        <div className="aspect-square w-full max-h-[500px] p-4 flex items-center justify-center">
                                                            <img 
                                                                src={getValidImageUrl(currentImage)} 
                                                                alt={featuredProduct.name} 
                                                                className="w-full h-full object-contain transition-transform duration-700 hover:scale-105"
                                                                onError={(e) => {
                                                                    e.target.src = fallbackProductImage;
                                                                }}
                                                            />
                                                        </div>
                                                        
                                                        <button
                                                            onClick={(e) => openFullImage(getValidImageUrl(currentImage), e)}
                                                            className="absolute bottom-4 left-4 p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-md hover:scale-110 transition-all duration-300 z-10"
                                                            title="View full image"
                                                        >
                                                            <Maximize2 size={18} className="text-gray-700" />
                                                        </button>
                                                        
                                                        {settings.showSaleBadge && featuredProduct.originalPrice && (
                                                            <div className="absolute top-4 left-4 bg-red-500 text-white px-3 py-1 rounded-lg text-xs font-bold z-10 shadow-lg">
                                                                {Math.round(((featuredProduct.originalPrice - featuredProduct.price) / featuredProduct.originalPrice) * 100)}% OFF
                                                            </div>
                                                        )}
                                                        
                                                        <button
                                                            type="button"
                                                            aria-label={isFavorite ? `Remove ${featuredProduct.name} from wishlist` : `Add ${featuredProduct.name} to wishlist`}
                                                            onClick={(e) => handleToggleFavorite(featuredProduct, e)}
                                                            className="absolute top-4 right-4 p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-md hover:scale-110 transition-all duration-300 z-10"
                                                        >
                                                            <Heart size={18} className={isFavorite ? "text-red-500 fill-current" : "text-gray-600"} />
                                                        </button>

                                                        {settings.showProductColors && featuredProduct.colors && featuredProduct.colors.length > 1 && (
                                                            <div className="absolute bottom-16 left-1/2 -translate-x-1/2 flex gap-1.5 bg-white/80 backdrop-blur-sm px-2 py-1 rounded-full shadow-sm">
                                                                {featuredProduct.colors.slice(0, 6).map((color, idx) => {
                                                                    const isActive = currentColor === color;
                                                                    const colorHex = 
                                                                        color === "White" ? "#f5f5f5" :
                                                                        color === "Black" ? "#1a1a1a" :
                                                                        color === "Red" ? "#dc2626" :
                                                                        color === "Blue" ? "#3b82f6" :
                                                                        color === "Green" ? "#22c55e" :
                                                                        color === "Yellow" ? "#eab308" :
                                                                        color === "Purple" ? "#a855f7" :
                                                                        color === "Pink" ? "#ec4899" :
                                                                        color === "Gray" ? "#9ca3af" :
                                                                        color === "Navy" ? "#1e3a8a" :
                                                                        color === "Orange" ? "#f97316" :
                                                                        color === "Brown" ? "#78350f" :
                                                                        color === "Teal" ? "#008080" :
                                                                        color === "Maroon" ? "#800000" :
                                                                        "#cccccc";
                                                                    
                                                                    return (
                                                                        <span
                                                                            key={idx}
                                                                            className={`w-3 h-3 rounded-full border ${isActive ? 'border-black ring-1 ring-black' : 'border-gray-300'}`}
                                                                            style={{ backgroundColor: colorHex }}
                                                                            title={color}
                                                                        />
                                                                    );
                                                                })}
                                                                {featuredProduct.colors.length > 6 && (
                                                                    <span className="text-[8px] font-bold text-gray-500 px-1">+{featuredProduct.colors.length - 6}</span>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                    
                                                    <div className="p-6 sm:p-8 md:p-10 flex flex-col justify-between bg-gray-50/80">
                                                        <div>
                                                            {settings.showProductBrand && featuredProduct.brand && (
                                                                <span className="inline-block text-xs text-gray-500 uppercase tracking-wider mb-2">
                                                                    {featuredProduct.brand}
                                                                </span>
                                                            )}
                                                            
                                                            <span className="inline-block px-3 py-1 bg-gray-200 text-gray-600 text-xs font-medium rounded-full mb-3 w-fit">
                                                                FEATURED
                                                            </span>
                                                            
                                                            <h3 className="text-gray-900 text-xl sm:text-2xl md:text-3xl font-semibold mb-2 line-clamp-2">
                                                                {featuredProduct.name}
                                                            </h3>
                                                            
                                                            <div className="flex items-center flex-wrap gap-2 mb-3">
                                                                <span className="text-gray-900 text-xl sm:text-2xl font-bold">
                                                                    {currencySymbol}{featuredProduct.price}
                                                                </span>
                                                                {settings.showSaleBadge && featuredProduct.originalPrice && (
                                                                    <span className="text-gray-400 text-base sm:text-lg line-through">
                                                                        {currencySymbol}{featuredProduct.originalPrice}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            
                                                            {featuredProduct.description && (
                                                                <p className="text-gray-600 text-sm mb-4 leading-relaxed line-clamp-3">
                                                                    {featuredProduct.description}
                                                                </p>
                                                            )}
                                                            
                                                            {settings.showProductRatings && (
                                                                <div className="flex items-center gap-2 mb-4">
                                                                    <div className="flex items-center">
                                                                        {[1, 2, 3, 4, 5].map((star) => (
                                                                            <Star 
                                                                                key={star} 
                                                                                size={16} 
                                                                                className={`${
                                                                                    star <= Math.round(productRating) 
                                                                                        ? 'text-yellow-400 fill-current' 
                                                                                        : 'text-gray-300'
                                                                                }`}
                                                                            />
                                                                        ))}
                                                                    </div>
                                                                    <span className="text-sm text-gray-500">
                                                                        ({productReviews} {productReviews === 1 ? 'review' : 'reviews'})
                                                                    </span>
                                                                </div>
                                                            )}
                                                            
                                                            {(featuredProduct.material || featuredProduct.careInstructions || tagsArray.length > 0) && (
                                                                <div className="mb-4 p-3 bg-white rounded-lg shadow-sm">
                                                                    {featuredProduct.material && (
                                                                        <div className="flex flex-wrap items-center gap-2 text-sm">
                                                                            <span className="font-medium text-gray-700">Material:</span>
                                                                            <span className="text-gray-600">{featuredProduct.material}</span>
                                                                        </div>
                                                                    )}
                                                                    {featuredProduct.careInstructions && (
                                                                        <div className="flex flex-wrap items-center gap-2 text-sm mt-1">
                                                                            <span className="font-medium text-gray-700">Care:</span>
                                                                            <span className="text-gray-600">{featuredProduct.careInstructions}</span>
                                                                        </div>
                                                                    )}
                                                                    {tagsArray.length > 0 && (
                                                                        <div className="flex flex-wrap gap-1 mt-2">
                                                                            {tagsArray.map((tag, idx) => (
                                                                                <span key={idx} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                                                                                    #{tag}
                                                                                </span>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                            
                                                            {settings.showProductColors && featuredProduct.colors && featuredProduct.colors.length > 0 && (
                                                                <div className="mb-4">
                                                                    <p className="text-gray-500 text-sm mb-2">Available Colors:</p>
                                                                    <div className="flex gap-2 sm:gap-3 flex-wrap">
                                                                        {featuredProduct.colors.slice(0, 8).map((color, idx) => {
                                                                            const colorImage = colorImageMap[color] || fallbackProductImage;
                                                                            const isSelected = currentColor === color;
                                                                            const colorHex = 
                                                                                color === "White" ? "#f5f5f5" :
                                                                                color === "Black" ? "#1a1a1a" :
                                                                                color === "Red" ? "#dc2626" :
                                                                                color === "Blue" ? "#3b82f6" :
                                                                                color === "Green" ? "#22c55e" :
                                                                                color === "Yellow" ? "#eab308" :
                                                                                color === "Purple" ? "#a855f7" :
                                                                                color === "Pink" ? "#ec4899" :
                                                                                color === "Gray" ? "#9ca3af" :
                                                                                color === "Navy" ? "#1e3a8a" :
                                                                                color === "Orange" ? "#f97316" :
                                                                                color === "Brown" ? "#78350f" :
                                                                                color === "Teal" ? "#008080" :
                                                                                color === "Maroon" ? "#800000" :
                                                                                "#cccccc";
                                                                            
                                                                            return (
                                                                                <div
                                                                                    key={idx}
                                                                                    className="relative"
                                                                                    onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        handleColorClick(featuredProduct, color, e);
                                                                                    }}
                                                                                >
                                                                                    <div 
                                                                                        className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg border-2 overflow-hidden cursor-pointer hover:scale-110 transition-all duration-200 shadow-sm ${isSelected ? 'border-black ring-2 ring-black ring-offset-2' : 'border-gray-200 hover:border-gray-400'}`}
                                                                                        style={{ backgroundColor: colorHex }}
                                                                                    >
                                                                                        {colorImage && colorImage !== fallbackProductImage && (
                                                                                            <img 
                                                                                                src={getValidImageUrl(colorImage)} 
                                                                                                alt={color}
                                                                                                className="w-full h-full object-cover"
                                                                                                onError={(e) => { e.target.src = fallbackProductImage; }}
                                                                                            />
                                                                                        )}
                                                                                    </div>
                                                                                    {isSelected && (
                                                                                        <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-black rounded-full"></div>
                                                                                    )}
                                                                                    <p className="text-[10px] text-center text-gray-500 mt-1">{color}</p>
                                                                                </div>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                        
                                                        <div className="flex flex-col sm:flex-row gap-3 mt-4">
                                                            <Link 
                                                                to={`/product/${featuredProduct.id}`}
                                                                className="flex-1 px-4 sm:px-6 py-2.5 sm:py-3 bg-black text-white rounded-full text-sm font-medium hover:bg-gray-800 transition-all duration-300 hover:scale-105 text-center shadow-md hover:shadow-lg"
                                                                onClick={(e) => e.stopPropagation()}
                                                            >
                                                                View Details
                                                            </Link>
                                                            <button
                                                                onClick={(e) => handleAddToCart(featuredProduct, e)}
                                                                className="flex-1 px-4 sm:px-6 py-2.5 sm:py-3 border-2 border-gray-300 text-gray-700 rounded-full text-sm font-medium hover:bg-gray-100 hover:border-gray-500 transition-all duration-300 flex items-center justify-center gap-2 hover:scale-105"
                                                            >
                                                                <ShoppingBag size={16} /> Add to Cart
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {featuredProducts.length > 1 && (
                            <div className="flex justify-center gap-2 mt-6">
                                {featuredProducts.map((_, index) => (
                                    <button
                                        key={index}
                                        onClick={() => goToSlide(index)}
                                        className={`transition-all duration-300 rounded-full ${
                                            index === currentIndex
                                                ? 'w-8 sm:w-10 h-2.5 bg-black shadow-md'
                                                : 'w-2 h-2 sm:w-2.5 sm:h-2.5 bg-gray-300 hover:bg-gray-400'
                                        }`}
                                        aria-label={`Go to slide ${index + 1}`}
                                    />
                                ))}
                            </div>
                        )}

                        {featuredProducts.length > 1 && (
                            <div className="text-center mt-3 text-xs text-gray-400">
                                Swipe or use arrows to navigate
                            </div>
                        )}
                    </div>
                )}
            </div>

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