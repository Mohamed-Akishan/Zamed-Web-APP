// src/components/Products/NewArrivals.jsx
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Star, ShoppingBag, Heart } from "lucide-react";
import { useCart } from "../../context/CartContext";
import { toast } from "sonner";
import productService from "../../services/productService";
import { loadProductsImages } from "../../utils/imageLoader";

const NewArrivals = () => {
    const [newArrivals, setNewArrivals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currencySymbol, setCurrencySymbol] = useState("$");
    const [selectedColor, setSelectedColor] = useState({});
    const [currentImages, setCurrentImages] = useState({});
    const [favorites, setFavorites] = useState([]);
    const [user, setUser] = useState(null);
    const scrollContainerRef = useRef(null);
    const navigate = useNavigate();
    const { addToCart } = useCart();

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

    // Load new arrivals
    useEffect(() => {
        loadNewArrivals();
        
        const handleProductsUpdate = () => {
            loadNewArrivals();
        };
        
        const handleReviewUpdate = () => {
            loadNewArrivals();
        };
        
        window.addEventListener('productsUpdated', handleProductsUpdate);
        window.addEventListener('storage', handleProductsUpdate);
        window.addEventListener('reviewAdded', handleReviewUpdate);
        
        const siteSettings = JSON.parse(localStorage.getItem('site_settings') || '{}');
        const symbols = { USD: "$", EUR: "€", GBP: "£", LKR: "Rs" };
        setCurrencySymbol(symbols[siteSettings.currency] || "$");
        
        return () => {
            window.removeEventListener('productsUpdated', handleProductsUpdate);
            window.removeEventListener('storage', handleProductsUpdate);
            window.removeEventListener('reviewAdded', handleReviewUpdate);
        };
    }, []);

    const loadNewArrivals = async () => {
        setLoading(true);
        try {
            const products = productService.getAllProducts();
            
            // Load images from IndexedDB
            const loadedProducts = await loadProductsImages(products);
            
            // Filter unique products by id to avoid duplicates
            const uniqueProducts = [];
            const seenIds = new Set();
            
            loadedProducts.forEach(product => {
                if (!seenIds.has(product.id) && product.isNewArrival === true) {
                    seenIds.add(product.id);
                    uniqueProducts.push(product);
                }
            });
            
            setNewArrivals(uniqueProducts);
            
            // Initialize current images and selected colors
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
            scrollContainerRef.current.scrollBy({ left: -300, behavior: 'smooth' });
        }
    };

    const scrollToRight = () => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollBy({ left: 300, behavior: 'smooth' });
        }
    };

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
            <section className="py-16 bg-white">
                <div className="container mx-auto px-4 text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                </div>
            </section>
        );
    }

    if (newArrivals.length === 0) {
        return null;
    }

    return (
        <section className="py-16 bg-gray-50">
            <div className="container mx-auto px-4">
                <div className="text-center mb-12">
                    <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">New Arrivals</h2>
                    <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                        Discover the latest styles straight off the runway
                    </p>
                </div>

                <div className="relative">
                    {newArrivals.length > 3 && (
                        <>
                            <button 
                                onClick={scrollToLeft} 
                                className="absolute left-0 top-1/2 transform -translate-y-1/2 z-10 bg-white shadow-lg rounded-full p-3 hover:scale-110 transition-all -ml-4 hidden md:block"
                            >
                                <ChevronLeft size={20} />
                            </button>
                            <button 
                                onClick={scrollToRight} 
                                className="absolute right-0 top-1/2 transform -translate-y-1/2 z-10 bg-white shadow-lg rounded-full p-3 hover:scale-110 transition-all -mr-4 hidden md:block"
                            >
                                <ChevronRight size={20} />
                            </button>
                        </>
                    )}

                    <div 
                        ref={scrollContainerRef} 
                        className="flex overflow-x-auto space-x-6 pb-6 scrollbar-hide scroll-smooth"
                        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                    >
                        {newArrivals.map((product) => {
                            const currentImage = currentImages[product.id] || product.image;
                            const currentColorName = selectedColor[product.id] || product.colors?.[0];
                            const isFavorite = favorites.some(item => item.id === product.id);
                            const productRating = product.rating || 0;
                            const productReviews = product.reviews || 0;
                            
                            return (
                                <div 
                                    key={product.id} 
                                    className="w-[280px] flex-shrink-0 bg-white rounded-xl shadow-lg overflow-hidden cursor-pointer transform hover:-translate-y-2 transition-all duration-300 group"
                                    onClick={() => handleProductClick(product.id)}
                                >
                                    {/* Fixed size image container */}
                                    <div className="relative bg-white overflow-hidden flex items-center justify-center" style={{ height: '280px' }}>
                                        <img 
                                            src={currentImage} 
                                            alt={product.name} 
                                            className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-105"
                                        />
                                        {product.originalPrice && (
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
                                    
                                    <div className="p-4">
                                        <h3 className="font-semibold text-lg mb-1 line-clamp-1 hover:text-blue-600">
                                            {product.name}
                                        </h3>
                                        <p className="text-gray-500 text-sm mb-2">{product.brand || "Zamed Premium"}</p>
                                        
                                        {/* Star Rating */}
                                        <div className="flex items-center gap-1 mb-2">
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
                                            <span className="text-xs text-gray-500">
                                                ({productReviews} {productReviews === 1 ? 'review' : 'reviews'})
                                            </span>
                                        </div>
                                        
                                        <div className="flex items-center gap-2 mb-3">
                                            <span className="text-xl font-bold text-gray-900">{currencySymbol}{product.price}</span>
                                            {product.originalPrice && (
                                                <span className="text-sm text-gray-400 line-through">{currencySymbol}{product.originalPrice}</span>
                                            )}
                                        </div>
                                        
                                        {/* Color Swatches */}
                                        {product.colors && product.colors.length > 0 && (
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
                                                </div>
                                                <p className="text-xs text-gray-500 mt-2">
                                                    Selected: <span className="font-medium text-blue-600">{currentColorName}</span>
                                                </p>
                                            </div>
                                        )}
                                        
                                        <button 
                                            onClick={(e) => handleAddToCart(product, e)}
                                            className="w-full bg-gray-900 text-white py-2 rounded-lg font-semibold hover:bg-gray-800 transition-all flex items-center justify-center gap-2"
                                        >
                                            <ShoppingBag size={16} /> Add to Cart
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="text-center mt-12">
                    <button 
                        onClick={() => {
                            navigate('/collections/all');
                            setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 100);
                        }}
                        className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-8 py-3 rounded-xl font-semibold hover:from-blue-600 hover:to-purple-700 transition-all transform hover:scale-105 shadow-lg flex items-center gap-2 mx-auto"
                    >
                        <ShoppingBag size={18} /> View All Products
                    </button>
                </div>
            </div>
        </section>
    );
};

export default NewArrivals;