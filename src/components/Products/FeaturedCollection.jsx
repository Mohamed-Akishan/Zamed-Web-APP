// src/components/Products/FeaturedCollection.jsx
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { ShoppingBag, Star, Heart } from "lucide-react";
import { useCart } from "../../context/CartContext";
import { toast } from "sonner";
import productService from "../../services/productService";

const FeaturedCollection = () => {
    const [featuredProducts, setFeaturedProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currencySymbol, setCurrencySymbol] = useState("$");
    const [selectedColor, setSelectedColor] = useState("");
    const [displayImage, setDisplayImage] = useState(null);
    const [favorites, setFavorites] = useState([]);
    const [user, setUser] = useState(null);
    const { addToCart } = useCart();
    const [settings, setSettings] = useState({
        featuredBackgroundColor: "#ffffff",
        buttonStyle: "solid",
        buttonColor: "#1f2937",
        buttonBorderRadius: "0.5rem",
        featuredTitle: "Featured Product",
        featuredSubtitle: "Our hand-picked selection just for you"
    });

    // Load user favorites
    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (userData) {
            const parsedUser = JSON.parse(userData);
            setUser(parsedUser);
            const userFavorites = JSON.parse(localStorage.getItem(`favorites_${parsedUser.email}`) || '[]');
            setFavorites(userFavorites);
        }
    }, []);

    // Load featured products and listen for updates
    useEffect(() => {
        loadFeaturedProducts();
        
        const handleProductsUpdate = () => {
            loadFeaturedProducts();
        };
        
        const handleReviewUpdate = () => {
            loadFeaturedProducts();
        };
        
        const siteSettings = JSON.parse(localStorage.getItem('site_settings') || '{}');
        setSettings(prev => ({ ...prev, ...siteSettings }));
        const symbols = { USD: "$", EUR: "€", GBP: "£", LKR: "Rs" };
        setCurrencySymbol(symbols[siteSettings.currency] || "$");
        
        window.addEventListener('productsUpdated', handleProductsUpdate);
        window.addEventListener('storage', handleProductsUpdate);
        window.addEventListener('settingsSaved', handleProductsUpdate);
        window.addEventListener('reviewAdded', handleReviewUpdate);
        
        return () => {
            window.removeEventListener('productsUpdated', handleProductsUpdate);
            window.removeEventListener('storage', handleProductsUpdate);
            window.removeEventListener('settingsSaved', handleProductsUpdate);
            window.removeEventListener('reviewAdded', handleReviewUpdate);
        };
    }, []);

    const loadFeaturedProducts = () => {
        setLoading(true);
        const products = productService.getAllProducts();
        const featured = products.filter(p => p.isFeatured === true);
        setFeaturedProducts(featured);
        if (featured.length > 0) {
            setDisplayImage(featured[0].image);
            if (featured[0].colors && featured[0].colors.length > 0) {
                setSelectedColor(featured[0].colors[0]);
            }
        }
        setLoading(false);
    };

    const getColorSwatch = (color) => {
        const colorMap = {
            'Black': '#1a1a1a', 'White': '#f5f5f5', 'Red': '#dc2626', 'Blue': '#3b82f6',
            'Green': '#22c55e', 'Gray': '#9ca3af', 'Grey': '#9ca3af', 'Brown': '#78350f',
            'Navy': '#1e3a8a', 'Pink': '#ec4899', 'Purple': '#a855f7', 'Yellow': '#eab308',
            'Orange': '#f97316', 'Gold': '#fbbf24', 'Silver': '#cbd5e1'
        };
        return colorMap[color] || '#cccccc';
    };

    const handleColorClick = (product, color) => {
        setSelectedColor(color);
        const colorImage = product.colorImages?.[color] || product.image;
        setDisplayImage(colorImage);
    };

    const handleAddToCart = (product, e) => {
        e.preventDefault();
        e.stopPropagation();
        
        addToCart({
            id: product.id,
            name: product.name,
            price: product.price,
            image: displayImage || product.image,
            category: product.category,
            size: product.sizes?.[0] || "One Size",
            color: selectedColor || product.colors?.[0] || "Default",
            quantity: 1
        });
        
        toast.success(`${product.name} added to cart!`);
    };

    const handleProductClick = (productId) => {
        window.location.href = `/product/${productId}`;
        setTimeout(() => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }, 100);
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

    const getButtonClass = () => {
        if (settings.buttonStyle === "outline") {
            return "px-6 py-3 rounded-lg font-semibold transition-all border-2 hover:scale-105";
        } else if (settings.buttonStyle === "gradient") {
            return "px-6 py-3 rounded-lg font-semibold transition-all bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:scale-105";
        }
        return "px-6 py-3 rounded-lg font-semibold transition-all text-white hover:scale-105";
    };

    const getButtonStyle = () => {
        const borderRadius = `${settings.buttonBorderRadius}rem`;
        if (settings.buttonStyle === "outline") {
            return { borderRadius };
        }
        return { backgroundColor: settings.buttonColor, borderRadius };
    };

    if (loading) {
        return (
            <div className="py-12 bg-white">
                <div className="container mx-auto px-4 text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                </div>
            </div>
        );
    }

    if (featuredProducts.length === 0) {
        return null;
    }

    const featuredProduct = featuredProducts[0];
    const isFavorite = favorites.some(item => item.id === featuredProduct.id);
    const productRating = featuredProduct.rating || 0;
    const productReviews = featuredProduct.reviews || 0;

    return (
        <div className="py-16 overflow-hidden" style={{ backgroundColor: settings.featuredBackgroundColor }}>
            <div className="container mx-auto px-4">
                <motion.div 
                    className="text-center mb-12"
                    initial={{ opacity: 0, y: -30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    viewport={{ once: true }}
                >
                    <h2 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                        {settings.featuredTitle}
                    </h2>
                    {settings.featuredSubtitle && (
                        <p className="text-gray-600 mt-2 max-w-2xl mx-auto">
                            {settings.featuredSubtitle}
                        </p>
                    )}
                </motion.div>
                
                <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5 }}
                    className="max-w-5xl mx-auto cursor-pointer"
                    onClick={() => handleProductClick(featuredProduct.id)}
                >
                    <div className="relative group overflow-hidden rounded-2xl shadow-xl bg-gradient-to-r from-gray-900 to-gray-800">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
                            {/* Image Section */}
                            <div className="relative overflow-hidden bg-gray-100 min-h-[500px]">
                                <img 
                                    src={displayImage || featuredProduct.image} 
                                    alt={featuredProduct.name} 
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                />
                                {featuredProduct.originalPrice && (
                                    <div className="absolute top-4 left-4 bg-red-500 text-white px-3 py-1 rounded-lg text-sm font-bold z-10">
                                        SALE
                                    </div>
                                )}
                                <button
                                    onClick={(e) => toggleFavorite(featuredProduct, e)}
                                    className="absolute top-4 right-4 p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-md hover:scale-110 transition-all duration-300 z-10"
                                >
                                    <Heart size={18} className={isFavorite ? "text-red-500 fill-current" : "text-gray-600"} />
                                </button>
                            </div>
                            
                            {/* Content Section */}
                            <div className="p-8 flex flex-col justify-center">
                                <span className="inline-block px-3 py-1 bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs font-bold rounded-full mb-4 w-fit">
                                    FEATURED
                                </span>
                                <h3 className="text-white text-2xl md:text-3xl font-bold mb-3">{featuredProduct.name}</h3>
                                <p className="text-gray-300 text-sm mb-4 leading-relaxed">
                                    {featuredProduct.description?.substring(0, 120)}...
                                </p>
                                
                                <div className="flex items-center gap-3 mb-4">
                                    <span className="text-white text-2xl font-bold">
                                        {currencySymbol}{featuredProduct.price}
                                    </span>
                                    {featuredProduct.originalPrice && (
                                        <span className="text-gray-400 text-lg line-through">
                                            {currencySymbol}{featuredProduct.originalPrice}
                                        </span>
                                    )}
                                </div>
                                
                                {/* Rating - Updated with dynamic values */}
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="flex items-center">
                                        {[1, 2, 3, 4, 5].map((star) => (
                                            <Star 
                                                key={star} 
                                                size={16} 
                                                className={`${
                                                    star <= Math.round(productRating) 
                                                        ? 'text-yellow-400 fill-current' 
                                                        : 'text-gray-500'
                                                }`}
                                            />
                                        ))}
                                    </div>
                                    <span className="text-sm text-gray-400">
                                        ({productReviews} {productReviews === 1 ? 'review' : 'reviews'})
                                    </span>
                                </div>
                                
                                {/* Color Swatches with Images */}
                                {featuredProduct.colors && featuredProduct.colors.length > 0 && (
                                    <div className="mb-6">
                                        <p className="text-gray-400 text-sm mb-2">Available Colors:</p>
                                        <div className="flex gap-3 flex-wrap">
                                            {featuredProduct.colors.map((color, idx) => {
                                                const colorImage = featuredProduct.colorImages?.[color] || featuredProduct.image;
                                                const isSelected = selectedColor === color;
                                                
                                                return (
                                                    <div
                                                        key={idx}
                                                        className="relative group/color"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleColorClick(featuredProduct, color);
                                                        }}
                                                    >
                                                        <div 
                                                            className={`w-12 h-12 rounded-lg border-2 overflow-hidden cursor-pointer hover:scale-110 transition-all duration-200 ${
                                                                isSelected ? 'border-white ring-2 ring-blue-400' : 'border-gray-500'
                                                            }`}
                                                        >
                                                            <img 
                                                                src={colorImage} 
                                                                alt={color}
                                                                className="w-full h-full object-cover"
                                                            />
                                                        </div>
                                                        <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover/color:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                                                            {color}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                        <p className="text-xs text-gray-400 mt-3">
                                            Selected: <span className="font-medium text-white">{selectedColor}</span>
                                        </p>
                                    </div>
                                )}
                                
                                <div className="flex gap-3">
                                    <Link 
                                        to={`/product/${featuredProduct.id}`}
                                        className={getButtonClass()} 
                                        style={getButtonStyle()}
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        View Details
                                    </Link>
                                    <button
                                        onClick={(e) => handleAddToCart(featuredProduct, e)}
                                        className="px-6 py-3 rounded-lg font-semibold transition-all bg-white text-gray-900 hover:bg-gray-100 hover:scale-105 flex items-center gap-2"
                                    >
                                        <ShoppingBag size={18} /> Add to Cart
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default FeaturedCollection;