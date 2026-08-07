// src/components/Products/NewArrivals.jsx
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Star, ShoppingBag, Heart, Sparkles, ArrowRight, Eye } from "lucide-react";
import { useCart } from "../../context/CartContext";
import { toast } from "sonner";
import productService from "../../services/productService";
import { loadProductsImages } from "../../utils/imageLoader";
import { getWorkingImage } from "../../utils/imageUtils";

const NewArrivals = () => {
    const [newArrivals, setNewArrivals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currencySymbol, setCurrencySymbol] = useState("$");
    const [selectedColor, setSelectedColor] = useState({});
    const [currentImages, setCurrentImages] = useState({});
    const [favorites, setFavorites] = useState([]);
    const [user, setUser] = useState(null);
    const [hoveredProduct, setHoveredProduct] = useState(null);
    const [isVisible, setIsVisible] = useState(false);
    const [settings, setSettings] = useState({
        productsPerRow: 4,
        showProductRatings: true,
        showProductColors: true,
        showProductSizes: true,
        showSaleBadge: true,
        showQuickAdd: true,
        showProductBrand: true
    });

    const fallbackProductImage = getWorkingImage(0);
    const scrollContainerRef = useRef(null);
    const sectionRef = useRef(null);
    const navigate = useNavigate();
    const { addToCart } = useCart();

    // Load settings from localStorage
    const loadSettings = () => {
        const siteSettings = JSON.parse(localStorage.getItem('site_settings') || '{}');
        console.log('🔄 NewArrivals - Loading settings:', siteSettings);
        setSettings(prev => ({ ...prev, ...siteSettings }));
    };

    useEffect(() => {
        loadSettings();
        const symbols = { USD: "$", EUR: "€", GBP: "£", LKR: "Rs" };
        const siteSettings = JSON.parse(localStorage.getItem('site_settings') || '{}');
        setCurrencySymbol(symbols[siteSettings.currency] || "$");
    }, []);

    // Intersection Observer for scroll animation
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

    // Load user and favorites
    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (userData) {
            const parsedUser = JSON.parse(userData);
            setUser(parsedUser);
            const userFavorites = JSON.parse(localStorage.getItem(`favorites_${parsedUser.email}`) || '[]');
            setFavorites(userFavorites);
        }
    }, []);

    // Load new arrivals and listen for updates
    useEffect(() => {
        loadNewArrivals();
        
        const handleProductsUpdate = () => {
            loadNewArrivals();
        };
        
        const handleReviewUpdate = () => {
            loadNewArrivals();
        };
        
        // Listen for settings changes
        const handleSettingsUpdate = () => {
            console.log('🔄 NewArrivals - Settings updated, reloading...');
            loadSettings();
        };
        
        const handleStorageChange = (e) => {
            if (e.key === 'site_settings') {
                console.log('🔄 NewArrivals - Storage changed, reloading settings...');
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
    }, []);

    const loadNewArrivals = async () => {
        setLoading(true);
        try {
            const products = productService.getAllProducts();
            const loadedProducts = await loadProductsImages(products);
            
            const uniqueProducts = [];
            const seenIds = new Set();
            
            loadedProducts.forEach(product => {
                if (!seenIds.has(product.id) && product.isNewArrival === true) {
                    seenIds.add(product.id);
                    uniqueProducts.push(product);
                }
            });
            
            setNewArrivals(uniqueProducts);
            
            const initialImages = {};
            const initialColors = {};
            uniqueProducts.forEach(product => {
                initialImages[product.id] = product.image;
                if (product.colors && product.colors.length > 0) {
                    initialColors[product.id] = product.colors[0];
                }
            });
            setCurrentImages(initialImages);
            setSelectedColor(initialColors);
        } catch (error) {
            console.error("Error loading new arrivals:", error);
        } finally {
            setLoading(false);
        }
    };

    const scrollToLeft = () => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollBy({ left: -320, behavior: 'smooth' });
        }
    };

    const scrollToRight = () => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollBy({ left: 320, behavior: 'smooth' });
        }
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

    // Determine grid columns based on settings
    const getGridCols = () => {
        const perRow = parseInt(settings.productsPerRow) || 4;
        console.log('📊 NewArrivals - Products per row:', perRow);
        
        if (perRow === 3) {
            return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3";
        } else if (perRow === 5) {
            return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5";
        } else if (perRow === 2) {
            return "grid-cols-1 sm:grid-cols-2";
        } else {
            return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";
        }
    };

    // Animation variants
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1,
                delayChildren: 0.2,
            }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 50, scale: 0.95 },
        visible: {
            opacity: 1,
            y: 0,
            scale: 1,
            transition: {
                duration: 0.6,
                ease: [0.16, 1, 0.3, 1],
            }
        },
        hover: {
            y: -10,
            scale: 1.03,
            boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
            transition: {
                duration: 0.3,
                ease: "easeOut"
            }
        }
    };

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

    return (
        <section className="py-20 bg-gradient-to-b from-white via-gray-50/30 to-white" ref={sectionRef}>
            <div className="container mx-auto px-4">
                {/* Header */}
                <motion.div 
                    className="text-center mb-14"
                    initial={{ opacity: 0, y: -30 }}
                    animate={isVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: -30 }}
                    transition={{ duration: 0.7 }}
                >
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={isVisible ? { scale: 1 } : { scale: 0 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                        className="inline-flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full text-white text-sm font-medium mb-5"
                    >
                        <Sparkles size={16} />
                        <span>Just Dropped</span>
                    </motion.div>
                    
                    <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-3">
                        New Arrivals
                    </h2>
                    <div className="w-20 h-1 bg-gradient-to-r from-blue-600 to-purple-600 mx-auto mb-4 rounded-full" />
                    <p className="text-gray-500 text-base max-w-2xl mx-auto">
                        Fresh styles, just landed. Be the first to shop the latest collection.
                    </p>
                </motion.div>

                {/* Products Grid */}
                <div className="relative">
                    {/* Scroll Buttons */}
                    {newArrivals.length > 3 && (
                        <>
                            <motion.button 
                                onClick={scrollToLeft} 
                                className="absolute -left-4 top-1/2 transform -translate-y-1/2 z-20 bg-white shadow-2xl rounded-full p-4 hover:scale-110 transition-all hidden lg:flex items-center justify-center border border-gray-200"
                                whileHover={{ scale: 1.1, backgroundColor: "#f8fafc" }}
                                whileTap={{ scale: 0.95 }}
                                initial={{ opacity: 0 }}
                                animate={isVisible ? { opacity: 1 } : { opacity: 0 }}
                                transition={{ delay: 0.5 }}
                            >
                                <ChevronLeft size={24} className="text-gray-700" />
                            </motion.button>
                            <motion.button 
                                onClick={scrollToRight} 
                                className="absolute -right-4 top-1/2 transform -translate-y-1/2 z-20 bg-white shadow-2xl rounded-full p-4 hover:scale-110 transition-all hidden lg:flex items-center justify-center border border-gray-200"
                                whileHover={{ scale: 1.1, backgroundColor: "#f8fafc" }}
                                whileTap={{ scale: 0.95 }}
                                initial={{ opacity: 0 }}
                                animate={isVisible ? { opacity: 1 } : { opacity: 0 }}
                                transition={{ delay: 0.5 }}
                            >
                                <ChevronRight size={24} className="text-gray-700" />
                            </motion.button>
                        </>
                    )}

                    {/* Products Grid */}
                    <motion.div 
                        ref={scrollContainerRef} 
                        className={`grid ${getGridCols()} gap-6`}
                        variants={containerVariants}
                        initial="hidden"
                        animate={isVisible ? "visible" : "hidden"}
                    >
                        {newArrivals.map((product, index) => {
                            const currentImage = currentImages[product.id] || product.image;
                            const currentColorName = selectedColor[product.id] || product.colors?.[0];
                            const isFavorite = favorites.some(item => item.id === product.id);
                            const productRating = product.rating || 0;
                            const productReviews = product.reviews || 0;
                            const isHovered = hoveredProduct === product.id;
                            
                            return (
                                <motion.div 
                                    key={product.id} 
                                    variants={itemVariants}
                                    whileHover="hover"
                                    onHoverStart={() => setHoveredProduct(product.id)}
                                    onHoverEnd={() => setHoveredProduct(null)}
                                    className="group bg-white rounded-2xl shadow-lg hover:shadow-3xl transition-all duration-500 overflow-hidden cursor-pointer border border-gray-100"
                                    onClick={() => handleProductClick(product.id)}
                                >
                                    {/* Image Container */}
                                    <div className="relative overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100 h-[320px]">
                                        <motion.img 
                                            src={currentImage || fallbackProductImage} 
                                            alt={product.name} 
                                            className="w-full h-full object-cover"
                                            initial={{ scale: 1 }}
                                            animate={{ scale: isHovered ? 1.08 : 1 }}
                                            transition={{ duration: 0.5 }}
                                            onError={(e) => {
                                                e.currentTarget.onerror = null;
                                                e.currentTarget.src = fallbackProductImage;
                                            }}
                                        />
                                        
                                        {/* Sale Badge - Controlled by settings */}
                                        {settings.showSaleBadge && product.originalPrice && (
                                            <motion.div 
                                                className="absolute top-4 left-4 bg-gradient-to-r from-red-500 to-pink-500 text-white px-4 py-1.5 rounded-lg text-sm font-bold z-10 shadow-lg"
                                                initial={{ x: -60, opacity: 0 }}
                                                animate={isVisible ? { x: 0, opacity: 1 } : { x: -60, opacity: 0 }}
                                                transition={{ duration: 0.5, delay: 0.3 + (index * 0.05) }}
                                            >
                                                SALE
                                            </motion.div>
                                        )}
                                        
                                        {/* Favorite Button */}
                                        <motion.button
                                            onClick={(e) => toggleFavorite(product, e)}
                                            className="absolute top-4 right-4 p-2.5 bg-white/95 backdrop-blur-sm rounded-full shadow-lg z-10"
                                            whileHover={{ scale: 1.2 }}
                                            whileTap={{ scale: 0.9 }}
                                            initial={{ opacity: 0, scale: 0 }}
                                            animate={isVisible ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0 }}
                                            transition={{ duration: 0.3, delay: 0.4 + (index * 0.05) }}
                                        >
                                            <Heart size={20} className={isFavorite ? "text-red-500 fill-current" : "text-gray-500"} />
                                        </motion.button>

                                        {/* Quick Add Button - Controlled by settings */}
                                        {settings.showQuickAdd && (
                                            <motion.button
                                                onClick={(e) => handleAddToCart(product, e)}
                                                className="absolute bottom-6 left-1/2 transform -translate-x-1/2 px-8 py-3 bg-white text-gray-800 rounded-full text-sm font-semibold shadow-2xl hover:bg-gray-50 transition-all duration-300 flex items-center gap-2"
                                                initial={{ opacity: 0, y: 30 }}
                                                animate={{ 
                                                    opacity: isHovered ? 1 : 0,
                                                    y: isHovered ? 0 : 30
                                                }}
                                                transition={{ duration: 0.3 }}
                                                whileHover={{ scale: 1.05 }}
                                                whileTap={{ scale: 0.95 }}
                                            >
                                                <ShoppingBag size={18} /> Quick Add
                                            </motion.button>
                                        )}

                                        {/* Hover overlay */}
                                        <motion.div
                                            className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-all duration-500"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: isHovered ? 1 : 0 }}
                                        />
                                    </div>
                                    
                                    {/* Product Info */}
                                    <div className="p-5">
                                        <h3 className="font-semibold text-gray-800 text-base mb-1 line-clamp-1 group-hover:text-blue-600 transition-colors">
                                            {product.name}
                                        </h3>
                                        
                                        {/* Product Brand - Controlled by settings */}
                                        {settings.showProductBrand && (
                                            <p className="text-gray-400 text-xs mb-2">{product.brand || "Zamed"}</p>
                                        )}
                                        
                                        {/* Rating - Controlled by settings */}
                                        {settings.showProductRatings && (
                                            <div className="flex items-center gap-1 mb-2">
                                                <div className="flex items-center gap-0.5">
                                                    {[1, 2, 3, 4, 5].map((star) => (
                                                        <Star 
                                                            key={star} 
                                                            size={15} 
                                                            className={`${
                                                                star <= Math.round(productRating) 
                                                                    ? 'text-yellow-400 fill-current' 
                                                                    : 'text-gray-200'
                                                            }`}
                                                        />
                                                    ))}
                                                </div>
                                                <span className="text-xs text-gray-400 ml-1">
                                                    ({productReviews})
                                                </span>
                                            </div>
                                        )}
                                        
                                        {/* Price */}
                                        <div className="flex items-center gap-2 mb-4">
                                            <span className="text-xl font-bold text-gray-900">
                                                {currencySymbol}{product.price}
                                            </span>
                                            {settings.showSaleBadge && product.originalPrice && (
                                                <span className="text-sm text-gray-400 line-through">
                                                    {currencySymbol}{product.originalPrice}
                                                </span>
                                            )}
                                            {settings.showSaleBadge && product.originalPrice && (
                                                <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                                                    Save {Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}%
                                                </span>
                                            )}
                                        </div>
                                        
                                        {/* Color Swatches - Controlled by settings */}
                                        {settings.showProductColors && product.colors && product.colors.length > 0 && (
                                            <div className="flex gap-2 flex-wrap">
                                                {product.colors.slice(0, 6).map((color, idx) => {
                                                    const colorImage = product.colorImages?.[color] || product.image;
                                                    const isSelected = currentColorName === color;
                                                    
                                                    return (
                                                        <motion.div
                                                            key={idx}
                                                            className="relative"
                                                            onClick={(e) => handleColorClick(product.id, color, colorImage, product.image, e)}
                                                            whileHover={{ scale: 1.15 }}
                                                            whileTap={{ scale: 0.9 }}
                                                        >
                                                            <div 
                                                                className={`w-9 h-9 rounded-xl border-2 overflow-hidden cursor-pointer transition-all duration-200 ${
                                                                    isSelected ? 'border-blue-500 ring-2 ring-blue-200 ring-offset-1' : 'border-gray-200 hover:border-gray-400'
                                                                }`}
                                                            >
                                                                <img 
                                                                    src={colorImage} 
                                                                    alt={color}
                                                                    className="w-full h-full object-cover"
                                                                />
                                                            </div>
                                                            {isSelected && (
                                                                <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-blue-500 rounded-full border-2 border-white" />
                                                            )}
                                                        </motion.div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            );
                        })}
                    </motion.div>
                </div>

                {/* View All Button */}
                <motion.div 
                    className="text-center mt-14"
                    initial={{ opacity: 0, y: 30 }}
                    animate={isVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
                    transition={{ duration: 0.6, delay: 0.5 }}
                >
                    <motion.button 
                        onClick={() => {
                            navigate('/collections/all');
                            setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 100);
                        }}
                        className="group inline-flex items-center gap-3 px-10 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-2xl font-semibold hover:from-blue-700 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-2xl"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.97 }}
                    >
                        <span className="text-lg">View All Products</span>
                        <ArrowRight size={22} className="group-hover:translate-x-2 transition-transform" />
                    </motion.button>
                </motion.div>
            </div>
        </section>
    );
};

export default NewArrivals;