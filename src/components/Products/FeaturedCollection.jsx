// src/components/Products/FeaturedCollection.jsx
import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { ShoppingBag, Star, Heart, ArrowRight, ChevronLeft, ChevronRight, Maximize2 } from "lucide-react";
import { useCart } from "../../context/CartContext";
import { toast } from "sonner";
import productService from "../../services/productService";

const FeaturedCollection = () => {
    const [featuredProducts, setFeaturedProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currencySymbol, setCurrencySymbol] = useState("$");
    const [selectedColor, setSelectedColor] = useState({});
    const [displayImage, setDisplayImage] = useState({});
    const [favorites, setFavorites] = useState([]);
    const [user, setUser] = useState(null);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isTransitioning, setIsTransitioning] = useState(false);
    const [showFullImage, setShowFullImage] = useState(false);
    const [fullImageUrl, setFullImageUrl] = useState("");
    const [settings, setSettings] = useState({
        showProductRatings: true,
        showProductColors: true,
        showSaleBadge: true,
        showProductBrand: true
    });
    const { addToCart } = useCart();

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

    // Load settings
    useEffect(() => {
        const siteSettings = JSON.parse(localStorage.getItem('site_settings') || '{}');
        setSettings({
            showProductRatings: siteSettings.showProductRatings !== undefined ? siteSettings.showProductRatings : true,
            showProductColors: siteSettings.showProductColors !== undefined ? siteSettings.showProductColors : true,
            showSaleBadge: siteSettings.showSaleBadge !== undefined ? siteSettings.showSaleBadge : true,
            showProductBrand: siteSettings.showProductBrand !== undefined ? siteSettings.showProductBrand : true
        });
    }, []);

    // Load featured products
    useEffect(() => {
        loadFeaturedProducts();
        
        const handleProductsUpdate = () => {
            loadFeaturedProducts();
        };
        
        const siteSettings = JSON.parse(localStorage.getItem('site_settings') || '{}');
        const symbols = { USD: "$", EUR: "€", GBP: "£", LKR: "Rs" };
        setCurrencySymbol(symbols[siteSettings.currency] || "$");
        
        window.addEventListener('productsUpdated', handleProductsUpdate);
        window.addEventListener('storage', handleProductsUpdate);
        
        return () => {
            window.removeEventListener('productsUpdated', handleProductsUpdate);
            window.removeEventListener('storage', handleProductsUpdate);
        };
    }, []);

    const loadFeaturedProducts = () => {
        setLoading(true);
        const products = productService.getAllProducts();
        const featured = products.filter(p => p.isFeatured === true);
        setFeaturedProducts(featured);
        
        // Initialize color and image states for each product
        const colorState = {};
        const imageState = {};
        featured.forEach(product => {
            if (product.colors && product.colors.length > 0) {
                colorState[product.id] = product.colors[0];
                imageState[product.id] = product.colorImages?.[product.colors[0]] || product.image;
            } else {
                colorState[product.id] = null;
                imageState[product.id] = product.image;
            }
        });
        setSelectedColor(colorState);
        setDisplayImage(imageState);
        setCurrentIndex(0);
        setLoading(false);
    };

    const handleColorClick = (product, color, e) => {
        e.stopPropagation();
        setSelectedColor(prev => ({
            ...prev,
            [product.id]: color
        }));
        setDisplayImage(prev => ({
            ...prev,
            [product.id]: product.colorImages?.[color] || product.image
        }));
    };

    const handleAddToCart = (product, e) => {
        e.preventDefault();
        e.stopPropagation();
        
        const productColor = selectedColor[product.id] || product.colors?.[0] || "Default";
        const productImage = displayImage[product.id] || product.image;
        
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

    const openFullImage = (imageUrl, e) => {
        e.stopPropagation();
        setFullImageUrl(imageUrl);
        setShowFullImage(true);
    };

    const closeFullImage = () => {
        setShowFullImage(false);
        setFullImageUrl("");
    };

    // Navigation functions
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

    // Helper function to get valid image URL
    const getValidImageUrl = (image) => {
        if (!image) return '/images/no-image.svg';
        if (image.startsWith('data:') || image.startsWith('http')) return image;
        return '/images/no-image.svg';
    };

    // Helper function to safely get tags array
    const getTagsArray = (tags) => {
        if (!tags) return [];
        if (Array.isArray(tags)) return tags;
        if (typeof tags === 'string') {
            return tags.split(',').map(tag => tag.trim()).filter(tag => tag);
        }
        return [];
    };

    // SHOW LOADING
    if (loading) {
        return (
            <div className="py-16 bg-gray-50">
                <div className="container mx-auto px-4 text-center">
                    <div className="w-12 h-12 border-2 border-gray-200 border-t-black rounded-full animate-spin mx-auto"></div>
                </div>
            </div>
        );
    }

    // SHOW ALWAYS - Even with no products
    return (
        <div className="py-16 bg-gray-50">
            <div className="container mx-auto px-4">
                {/* Section Title */}
                <div className="text-center mb-10">
                    <h2 className="text-2xl sm:text-3xl font-light text-gray-800">Featured Collection</h2>
                    <p className="text-gray-400 text-sm mt-2">Our hand-picked selection just for you</p>
                    <div className="w-12 h-0.5 bg-gray-300 mx-auto mt-4"></div>
                </div>

                {featuredProducts.length === 0 ? (
                    // Placeholder when no featured products
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
                        {localStorage.getItem('admin') && (
                            <Link 
                                to="/admin/products" 
                                className="inline-flex items-center gap-2 mt-4 px-6 py-2.5 bg-black text-white rounded-full text-sm font-medium hover:bg-gray-800 transition-colors"
                            >
                                Go to Admin <ArrowRight size={16} />
                            </Link>
                        )}
                    </div>
                ) : (
                    // Featured Products Slider
                    <div className="relative max-w-6xl mx-auto">
                        {/* Navigation Arrows */}
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

                        {/* Slide Counter */}
                        {featuredProducts.length > 1 && (
                            <div className="absolute top-4 right-4 z-20 bg-black/70 backdrop-blur-sm text-white text-xs px-3 py-1.5 rounded-full">
                                {currentIndex + 1} / {featuredProducts.length}
                            </div>
                        )}

                        {/* Carousel Container */}
                        <div className="overflow-hidden rounded-2xl bg-white shadow-lg">
                            <div 
                                className="flex transition-transform duration-500 ease-in-out"
                                style={{ 
                                    transform: `translateX(-${currentIndex * 100}%)`,
                                }}
                            >
                                {featuredProducts.map((featuredProduct, index) => {
                                    const isFavorite = favorites.some(item => item.id === featuredProduct.id);
                                    const productRating = featuredProduct.rating || 0;
                                    const productReviews = featuredProduct.reviews || 0;
                                    const currentColor = selectedColor[featuredProduct.id] || featuredProduct.colors?.[0] || null;
                                    const currentImage = displayImage[featuredProduct.id] || featuredProduct.image;
                                    const tagsArray = getTagsArray(featuredProduct.tags);

                                    return (
                                        <div 
                                            key={featuredProduct.id}
                                            className="min-w-full cursor-pointer"
                                            onClick={() => handleProductClick(featuredProduct.id)}
                                        >
                                            <div className="bg-white rounded-2xl overflow-hidden">
                                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
                                                    {/* Image Section - Fixed Size with Full View */}
                                                    <div className="relative overflow-hidden bg-gray-100">
                                                        <div className="aspect-square w-full max-h-[500px]">
                                                            <img 
                                                                src={getValidImageUrl(currentImage)} 
                                                                alt={featuredProduct.name} 
                                                                className="w-full h-full object-contain transition-transform duration-700 hover:scale-105"
                                                                onError={(e) => {
                                                                    e.target.src = '/images/no-image.svg';
                                                                }}
                                                            />
                                                        </div>
                                                        
                                                        {/* Full Image View Button */}
                                                        <button
                                                            onClick={(e) => openFullImage(getValidImageUrl(currentImage), e)}
                                                            className="absolute bottom-4 left-4 p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-md hover:scale-110 transition-all duration-300 z-10"
                                                            title="View full image"
                                                        >
                                                            <Maximize2 size={18} className="text-gray-700" />
                                                        </button>
                                                        
                                                        {settings.showSaleBadge && featuredProduct.originalPrice && (
                                                            <div className="absolute top-4 left-4 bg-red-500 text-white px-3 py-1 rounded-lg text-xs font-bold z-10">
                                                                {Math.round(((featuredProduct.originalPrice - featuredProduct.price) / featuredProduct.originalPrice) * 100)}% OFF
                                                            </div>
                                                        )}
                                                        
                                                        <button
                                                            onClick={(e) => toggleFavorite(featuredProduct, e)}
                                                            className="absolute top-4 right-4 p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-md hover:scale-110 transition-all duration-300 z-10"
                                                        >
                                                            <Heart size={18} className={isFavorite ? "text-red-500 fill-current" : "text-gray-600"} />
                                                        </button>
                                                    </div>
                                                    
                                                    {/* Content Section - Full Product Details */}
                                                    <div className="p-4 sm:p-6 md:p-8 flex flex-col justify-between">
                                                        <div>
                                                            {settings.showProductBrand && featuredProduct.brand && (
                                                                <span className="inline-block text-xs text-gray-500 uppercase tracking-wider mb-2">
                                                                    {featuredProduct.brand}
                                                                </span>
                                                            )}
                                                            
                                                            <span className="inline-block px-3 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-full mb-3 w-fit">
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
                                                            
                                                            {/* Description */}
                                                            {featuredProduct.description && (
                                                                <p className="text-gray-600 text-sm mb-4 leading-relaxed line-clamp-3">
                                                                    {featuredProduct.description}
                                                                </p>
                                                            )}
                                                            
                                                            {/* Rating */}
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
                                                            
                                                            {/* Product Details - Material, Care Instructions, etc. */}
                                                            {(featuredProduct.material || featuredProduct.careInstructions || tagsArray.length > 0) && (
                                                                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
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
                                                                                <span key={idx} className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">
                                                                                    #{tag}
                                                                                </span>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                            
                                                            {/* Colors */}
                                                            {settings.showProductColors && featuredProduct.colors && featuredProduct.colors.length > 0 && (
                                                                <div className="mb-4">
                                                                    <p className="text-gray-500 text-sm mb-2">Available Colors:</p>
                                                                    <div className="flex gap-2 sm:gap-3 flex-wrap">
                                                                        {featuredProduct.colors.slice(0, 8).map((color, idx) => {
                                                                            const colorImage = featuredProduct.colorImages?.[color] || featuredProduct.image;
                                                                            const isSelected = currentColor === color;
                                                                            
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
                                                                                        className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg border-2 overflow-hidden cursor-pointer hover:scale-110 transition-all duration-200 ${
                                                                                            isSelected ? 'border-black ring-2 ring-gray-400' : 'border-gray-200'
                                                                                        }`}
                                                                                    >
                                                                                        <img 
                                                                                            src={getValidImageUrl(colorImage)} 
                                                                                            alt={color}
                                                                                            className="w-full h-full object-cover"
                                                                                            onError={(e) => {
                                                                                                e.target.src = '/images/no-image.svg';
                                                                                            }}
                                                                                        />
                                                                                    </div>
                                                                                    {isSelected && (
                                                                                        <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-black rounded-full"></div>
                                                                                    )}
                                                                                </div>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                        
                                                        {/* Action Buttons */}
                                                        <div className="flex flex-col sm:flex-row gap-3 mt-4">
                                                            <Link 
                                                                to={`/product/${featuredProduct.id}`}
                                                                className="flex-1 px-4 sm:px-6 py-2.5 sm:py-3 bg-black text-white rounded-full text-sm font-medium hover:bg-gray-800 transition-all duration-300 hover:scale-105 text-center"
                                                                onClick={(e) => e.stopPropagation()}
                                                            >
                                                                View Details
                                                            </Link>
                                                            <button
                                                                onClick={(e) => handleAddToCart(featuredProduct, e)}
                                                                className="flex-1 px-4 sm:px-6 py-2.5 sm:py-3 border border-gray-300 text-gray-700 rounded-full text-sm font-medium hover:bg-gray-50 hover:border-gray-400 transition-all duration-300 flex items-center justify-center gap-2"
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

                        {/* Dots Indicator */}
                        {featuredProducts.length > 1 && (
                            <div className="flex justify-center gap-2 mt-6">
                                {featuredProducts.map((_, index) => (
                                    <button
                                        key={index}
                                        onClick={() => goToSlide(index)}
                                        className={`transition-all duration-300 rounded-full ${
                                            index === currentIndex
                                                ? 'w-8 sm:w-10 h-2.5 bg-black'
                                                : 'w-2 h-2 sm:w-2.5 sm:h-2.5 bg-gray-300 hover:bg-gray-400'
                                        }`}
                                        aria-label={`Go to slide ${index + 1}`}
                                    />
                                ))}
                            </div>
                        )}

                        {/* Slide Number Indicator - Mobile friendly */}
                        {featuredProducts.length > 1 && (
                            <div className="text-center mt-3 text-xs text-gray-400">
                                Swipe or use arrows to navigate
                            </div>
                        )}
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
                        className="relative max-w-5xl w-full max-h-[90vh] bg-white rounded-2xl overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Close Button */}
                        <button
                            onClick={closeFullImage}
                            className="absolute top-4 right-4 z-10 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full transition-all duration-300"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>

                        {/* Full Image */}
                        <div className="flex items-center justify-center p-4 min-h-[300px] max-h-[90vh]">
                            <img 
                                src={fullImageUrl} 
                                alt="Product full view" 
                                className="max-w-full max-h-[85vh] object-contain"
                                onError={(e) => {
                                    e.target.src = '/images/no-image.svg';
                                }}
                            />
                        </div>

                        {/* Footer */}
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