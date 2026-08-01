// src/components/Products/ProductDetails.jsx
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useCart } from "../../context/CartContext";
import { toast } from "sonner";
import { FiMinus, FiPlus, FiCheck, FiTruck, FiShield, FiRefreshCw, FiChevronDown } from "react-icons/fi";
import { Heart, ShoppingBag, Image as ImageIcon, Star, MessageCircle, Truck, Shield, RotateCcw, Share2, Eye } from "lucide-react";
import productService from "../../services/productService";
import { loadProductImages, loadProductsImages } from "../../utils/imageLoader";
import ProductReviews from "./ProductReviews";

const ProductDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { addToCart } = useCart();
    const [product, setProduct] = useState(null);
    const [selectedSize, setSelectedSize] = useState("");
    const [selectedColor, setSelectedColor] = useState("");
    const [quantity, setQuantity] = useState(1);
    const [loading, setLoading] = useState(true);
    const [currencySymbol, setCurrencySymbol] = useState("$");
    const [activeTab, setActiveTab] = useState("description");
    const [favorites, setFavorites] = useState([]);
    const [user, setUser] = useState(null);
    const [currentImage, setCurrentImage] = useState("");
    const [relatedProducts, setRelatedProducts] = useState([]);
    const [totalReviews, setTotalReviews] = useState(0);
    const [averageRating, setAverageRating] = useState(0);
    const [settings, setSettings] = useState({
        showProductRatings: true,
        showProductColors: true,
        showProductSizes: true,
        showSaleBadge: true,
        showQuickAdd: true,
        showProductBrand: true,
        showDeliveryInfo: true,
        showSizeGuide: true,
        showShareButtons: true,
        showRelatedProducts: true,
        relatedProductsCount: 4,
        productDetailLayout: "grid",
        reviewSystemEnabled: true
    });

    // Load settings from localStorage
    const loadSettings = () => {
        const siteSettings = JSON.parse(localStorage.getItem('site_settings') || '{}');
        console.log('🔄 ProductDetails - Loading settings:', siteSettings);
        setSettings(prev => ({
            ...prev,
            ...siteSettings,
            showProductRatings: siteSettings.showProductRatings !== undefined ? siteSettings.showProductRatings : true,
            showProductColors: siteSettings.showProductColors !== undefined ? siteSettings.showProductColors : true,
            showProductSizes: siteSettings.showProductSizes !== undefined ? siteSettings.showProductSizes : true,
            showSaleBadge: siteSettings.showSaleBadge !== undefined ? siteSettings.showSaleBadge : true,
            showQuickAdd: siteSettings.showQuickAdd !== undefined ? siteSettings.showQuickAdd : true,
            showProductBrand: siteSettings.showProductBrand !== undefined ? siteSettings.showProductBrand : true,
            showDeliveryInfo: siteSettings.showDeliveryInfo !== undefined ? siteSettings.showDeliveryInfo : true,
            showSizeGuide: siteSettings.showSizeGuide !== undefined ? siteSettings.showSizeGuide : true,
            showShareButtons: siteSettings.showShareButtons !== undefined ? siteSettings.showShareButtons : true,
            showRelatedProducts: siteSettings.showRelatedProducts !== undefined ? siteSettings.showRelatedProducts : true,
            relatedProductsCount: siteSettings.relatedProductsCount || 4,
            reviewSystemEnabled: siteSettings.reviewSystemEnabled !== undefined ? siteSettings.reviewSystemEnabled : true,
            productDetailLayout: siteSettings.productDetailLayout || "grid"
        }));
    };

    useEffect(() => {
        loadSettings();

        const handleSettingsUpdate = () => {
            console.log('🔄 ProductDetails - Settings updated, reloading...');
            loadSettings();
        };

        window.addEventListener('settingsSaved', handleSettingsUpdate);
        window.addEventListener('siteInfoUpdated', handleSettingsUpdate);
        window.addEventListener('storage', (e) => {
            if (e.key === 'site_settings') {
                handleSettingsUpdate();
            }
        });

        return () => {
            window.removeEventListener('settingsSaved', handleSettingsUpdate);
            window.removeEventListener('siteInfoUpdated', handleSettingsUpdate);
            window.removeEventListener('storage', handleSettingsUpdate);
        };
    }, []);

    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        
        if (window.location.hash === '#reviews') {
            setTimeout(() => {
                const reviewSection = document.getElementById('reviews-section');
                if (reviewSection) {
                    reviewSection.scrollIntoView({ behavior: 'smooth' });
                }
            }, 500);
        }
        
        const symbols = { USD: "$", EUR: "€", GBP: "£", LKR: "Rs" };
        const siteSettings = JSON.parse(localStorage.getItem('site_settings') || '{}');
        setCurrencySymbol(symbols[siteSettings.currency] || "$");
        
        loadProduct();
        loadReviewStats();
        
        const userData = localStorage.getItem('user');
        if (userData) {
            setUser(JSON.parse(userData));
            const userFavorites = JSON.parse(localStorage.getItem(`favorites_${JSON.parse(userData).email}`) || '[]');
            setFavorites(userFavorites);
        }
    }, [id]);

    const loadReviewStats = () => {
        const allReviews = JSON.parse(localStorage.getItem('product_reviews') || '[]');
        const productReviews = allReviews.filter(r => r.productId === parseInt(id));
        if (productReviews.length > 0) {
            const total = productReviews.reduce((sum, r) => sum + r.rating, 0);
            const avg = total / productReviews.length;
            setAverageRating(avg);
            setTotalReviews(productReviews.length);
        } else {
            setAverageRating(0);
            setTotalReviews(0);
        }
    };

    const formatDetailsList = (text) => {
        if (!text) return [];
        return text.split('\n').filter(line => line.trim());
    };

    const loadProduct = async () => {
        setLoading(true);
        try {
            const allProducts = productService.getAllProducts();
            const loadedProducts = await loadProductsImages(allProducts);
            const foundProduct = loadedProducts.find(p => p.id === parseInt(id));
            
            if (foundProduct) {
                setProduct(foundProduct);
                setCurrentImage(foundProduct.image);
                
                if (settings.showProductSizes && foundProduct.sizes && foundProduct.sizes.length > 0) {
                    setSelectedSize(foundProduct.sizes[0]);
                }
                if (settings.showProductColors && foundProduct.colors && foundProduct.colors.length > 0) {
                    setSelectedColor(foundProduct.colors[0]);
                    if (foundProduct.colorImages && foundProduct.colorImages[foundProduct.colors[0]]) {
                        setCurrentImage(foundProduct.colorImages[foundProduct.colors[0]]);
                    }
                }
                
                const related = loadedProducts.filter(p => 
                    p.id !== foundProduct.id && 
                    (p.category === foundProduct.category || p.gender === foundProduct.gender)
                );
                
                const relatedCount = settings.showRelatedProducts ? (settings.relatedProductsCount || 4) : 0;
                setRelatedProducts(related.slice(0, relatedCount));
            } else {
                toast.error("Product not found");
                navigate('/');
            }
        } catch (error) {
            console.error("Error loading product:", error);
            toast.error("Failed to load product details");
            navigate('/');
        } finally {
            setLoading(false);
        }
    };

    const scrollToReviews = () => {
        const reviewSection = document.getElementById('reviews-section');
        if (reviewSection) {
            reviewSection.scrollIntoView({ behavior: 'smooth' });
            window.history.pushState(null, '', '#reviews');
        }
    };

    const handleColorClick = (color) => {
        setSelectedColor(color);
        if (product.colorImages && product.colorImages[color]) {
            setCurrentImage(product.colorImages[color]);
        } else {
            setCurrentImage(product.image);
        }
    };

    const handleAddToCart = () => {
        if (!product) return;
        
        if (settings.showProductSizes && product.sizes && product.sizes.length > 0 && !selectedSize) {
            toast.error("Please select a size");
            return;
        }
        if (settings.showProductColors && product.colors && product.colors.length > 0 && !selectedColor) {
            toast.error("Please select a color");
            return;
        }
        
        addToCart({
            id: product.id,
            name: product.name,
            price: product.price,
            image: currentImage,
            category: product.category,
            size: selectedSize || "One Size",
            color: selectedColor || product.colors?.[0] || "Default",
            quantity: quantity,
            brand: product.brand
        });
        
        toast.success(`${product.name} added to cart!`);
    };

    const toggleFavorite = () => {
        if (!user) {
            toast.error("Please login to add to favorites");
            navigate('/login');
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

    const handleRelatedProductClick = (productId) => {
        navigate(`/product/${productId}`);
        setTimeout(() => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }, 100);
    };

    const handleShareProduct = () => {
        if (navigator.share) {
            navigator.share({
                title: product.name,
                text: `Check out ${product.name} on Zamed!`,
                url: window.location.href,
            }).catch(() => {});
        } else {
            navigator.clipboard.writeText(window.location.href).then(() => {
                toast.success("Product link copied to clipboard!");
            }).catch(() => {
                toast.info(`Share: ${window.location.href}`);
            });
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

    // Helper to format shipping info
    const getShippingText = () => {
        if (!product) return "";
        if (product.shippingFee !== undefined || product.freeShippingThreshold !== undefined) {
            let text = "";
            if (product.shippingFee && product.shippingFee > 0) {
                text += `Shipping ${currencySymbol}${product.shippingFee}`;
            } else if (product.shippingFee === 0 || product.shippingFee === null) {
                text += "Free shipping";
            } else {
                text += "Free shipping";
            }
            if (product.freeShippingThreshold && product.freeShippingThreshold > 0) {
                text += ` on orders over ${currencySymbol}${product.freeShippingThreshold}`;
            }
            return text;
        }
        return "";
    };

    // Helper to format return policy
    const getReturnPolicyText = () => {
        if (!product) return "";
        return product.returnPolicy || "";
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading product...</p>
                </div>
            </div>
        );
    }

    if (!product) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="text-6xl mb-4">🛒</div>
                    <h2 className="text-2xl font-bold mb-4">Product Not Found</h2>
                    <p className="text-gray-600 mb-6">The product you're looking for doesn't exist.</p>
                    <button onClick={() => navigate('/')} className="bg-blue-600 text-white px-6 py-2 rounded-lg">
                        Back to Home
                    </button>
                </div>
            </div>
        );
    }

    // Get product details from product data
    const detailsText = product.details || "";
    const detailsList = formatDetailsList(detailsText);
    const shippingText = product.shipping || "";
    const shippingList = formatDetailsList(shippingText);
    const productDescription = product.description || "";
    
    // Get delivery info from product
    const deliveryText = getShippingText();
    const returnText = getReturnPolicyText();

    // Get product specifications from admin fields with safe handling
    const productSpecs = {
        material: product.material || "",
        careInstructions: product.careInstructions || "",
        tags: product.tags || ""
    };

    // Helper function to safely split tags
    const getTagsArray = (tags) => {
        if (!tags) return [];
        if (Array.isArray(tags)) return tags;
        if (typeof tags === 'string') {
            return tags.split(',').map(tag => tag.trim()).filter(tag => tag);
        }
        return [];
    };

    return (
        <div className="container mx-auto px-4 py-8 max-w-6xl">
            {/* Back Button */}
            <button 
                onClick={() => navigate(-1)} 
                className="mb-6 text-gray-600 hover:text-gray-900 transition-colors flex items-center gap-2 text-sm"
            >
                ← Back
            </button>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                {/* Product Images Section */}
                <div className="space-y-4">
                    <div className="relative overflow-hidden rounded-2xl bg-gray-100 flex items-center justify-center min-h-[500px]">
                        <img 
                            src={currentImage} 
                            alt={product.name} 
                            className="w-full h-auto max-h-[600px] object-contain"
                            onError={(e) => {
                                e.target.src = 'https://via.placeholder.com/600x600?text=No+Image';
                            }}
                        />
                        {settings.showSaleBadge && product.originalPrice && (
                            <div className="absolute top-4 left-4 bg-red-500 text-white px-3 py-1 rounded-lg text-sm font-bold z-10">
                                {Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}% OFF
                            </div>
                        )}
                        <button
                            onClick={toggleFavorite}
                            className={`absolute top-4 right-4 p-3 rounded-full bg-white shadow-md transition-all hover:scale-110 z-10 ${
                                favorites.some(item => item.id === product.id) 
                                    ? 'text-red-500 bg-red-50' 
                                    : 'text-gray-400 hover:text-red-500'
                            }`}
                        >
                            <Heart size={20} fill={favorites.some(item => item.id === product.id) ? "currentColor" : "none"} />
                        </button>
                    </div>
                    
                    {/* Color Thumbnail Gallery - Controlled by settings */}
                    {settings.showProductColors && product.colors && product.colors.length > 0 && (
                        <div>
                            <p className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                                <ImageIcon size={14} /> Available Colors ({product.colors.length})
                            </p>
                            <div className="flex gap-3 flex-wrap">
                                {product.colors.map((color, idx) => {
                                    const colorImage = product.colorImages?.[color] || product.image;
                                    const isSelected = selectedColor === color;
                                    
                                    return (
                                        <div
                                            key={idx}
                                            className="relative group/color cursor-pointer transition-all duration-200"
                                            onClick={() => handleColorClick(color)}
                                        >
                                            <div 
                                                className={`w-20 h-20 rounded-lg border-2 overflow-hidden transition-all duration-200 ${
                                                    isSelected ? 'border-blue-500 ring-2 ring-blue-200 scale-105' : 'border-gray-300 hover:border-gray-400'
                                                }`}
                                            >
                                                <img 
                                                    src={colorImage} 
                                                    alt={color}
                                                    className="w-full h-full object-cover"
                                                    onError={(e) => {
                                                        e.target.src = 'https://via.placeholder.com/80x80?text=No+Image';
                                                    }}
                                                />
                                            </div>
                                            <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover/color:opacity-100 transition-opacity whitespace-nowrap z-20">
                                                {color}
                                            </div>
                                            {isSelected && (
                                                <div className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 rounded-full border-2 border-white flex items-center justify-center">
                                                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                    </svg>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                            <p className="text-xs text-gray-500 mt-2">
                                Click on any color to see the product in that color
                            </p>
                        </div>
                    )}
                </div>
                
                {/* Product Info */}
                <div className="space-y-6">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">{product.name}</h1>
                        {settings.showProductBrand && (
                            <p className="text-gray-500">{product.brand || "Zamed Premium"}</p>
                        )}
                    </div>
                    
                    {/* Rating - Controlled by settings */}
                    {settings.showProductRatings && (
                        <div className="flex items-center justify-between flex-wrap gap-3">
                            <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <Star 
                                            key={star} 
                                            size={18} 
                                            className={`${
                                                star <= Math.round(averageRating || product.rating || 0) 
                                                    ? 'text-yellow-400 fill-current' 
                                                    : 'text-gray-300'
                                            }`}
                                        />
                                    ))}
                                </div>
                                <span className="text-sm text-gray-600 font-medium">
                                    {(averageRating || product.rating || 0).toFixed(1)} stars
                                </span>
                                <span className="text-sm text-gray-400">|</span>
                                <button 
                                    onClick={scrollToReviews}
                                    className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1 transition-colors"
                                >
                                    <MessageCircle size={14} />
                                    {totalReviews || product.reviews || 0} {totalReviews === 1 ? 'review' : 'reviews'}
                                    <FiChevronDown size={14} />
                                </button>
                            </div>
                        </div>
                    )}
                    
                    {/* Price */}
                    <div className="flex items-center gap-3">
                        <span className="text-3xl font-bold text-blue-600">
                            {currencySymbol}{product.price}
                        </span>
                        {settings.showSaleBadge && product.originalPrice && (
                            <span className="text-xl text-gray-400 line-through">
                                {currencySymbol}{product.originalPrice}
                            </span>
                        )}
                    </div>
                    
                    {/* Selected Color Display - Controlled by settings */}
                    {settings.showProductColors && selectedColor && (
                        <div className="bg-gray-50 p-3 rounded-xl">
                            <p className="text-sm text-gray-600">Selected Color:</p>
                            <div className="flex items-center gap-2 mt-1">
                                <div className="w-6 h-6 rounded-full" style={{ backgroundColor: getColorSwatch(selectedColor) }} />
                                <span className="font-medium text-gray-900">{selectedColor}</span>
                            </div>
                        </div>
                    )}
                    
                    {/* Size Selection - Controlled by settings */}
                    {settings.showProductSizes && product.sizes && product.sizes.length > 0 && (
                        <div>
                            <h4 className="font-semibold text-gray-900 mb-3">Select Size</h4>
                            <div className="flex flex-wrap gap-3">
                                {product.sizes.map(size => (
                                    <button
                                        key={size}
                                        onClick={() => setSelectedSize(size)}
                                        className={`px-4 py-2 rounded-lg border-2 font-medium transition-all ${
                                            selectedSize === size
                                                ? 'border-blue-600 bg-blue-50 text-blue-600'
                                                : 'border-gray-300 text-gray-700 hover:border-gray-400'
                                        }`}
                                    >
                                        {size}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                    
                    {/* Color Selection Backup - Controlled by settings */}
                    {settings.showProductColors && product.colors && product.colors.length > 0 && (
                        <div>
                            <h4 className="font-semibold text-gray-900 mb-3">Select Color</h4>
                            <div className="flex flex-wrap gap-3">
                                {product.colors.map(color => (
                                    <button
                                        key={color}
                                        onClick={() => handleColorClick(color)}
                                        className={`px-4 py-2 rounded-lg border-2 transition-all flex items-center gap-2 ${
                                            selectedColor === color
                                                ? 'border-blue-600 bg-blue-50'
                                                : 'border-gray-300 hover:border-gray-400'
                                        }`}
                                    >
                                        <div 
                                            className="w-5 h-5 rounded-full" 
                                            style={{ backgroundColor: getColorSwatch(color) }}
                                        />
                                        <span className="text-sm">{color}</span>
                                        {selectedColor === color && <FiCheck className="text-blue-600" size={14} />}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                    
                    {/* Size Guide - Controlled by settings */}
                    {settings.showSizeGuide && (
                        <div className="text-xs text-gray-500 mt-1">
                            <button className="text-blue-600 hover:underline">📏 Size Guide</button>
                        </div>
                    )}
                    
                    {/* Quantity */}
                    <div>
                        <h4 className="font-semibold text-gray-900 mb-3">Quantity</h4>
                        <div className="flex items-center gap-4">
                            <div className="flex items-center border rounded-lg">
                                <button 
                                    onClick={() => setQuantity(Math.max(1, quantity - 1))} 
                                    className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 transition-colors"
                                >
                                    <FiMinus />
                                </button>
                                <span className="w-12 text-center font-semibold">{quantity}</span>
                                <button 
                                    onClick={() => setQuantity(quantity + 1)} 
                                    className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 transition-colors"
                                >
                                    <FiPlus />
                                </button>
                            </div>
                            <span className="text-sm text-gray-500">In Stock: {product.stock || 50}+ items</span>
                        </div>
                    </div>
                    
                    {/* Add to Cart Button */}
                    <button 
                        onClick={handleAddToCart} 
                        className="w-full bg-gray-900 text-white py-4 rounded-xl font-semibold hover:bg-gray-800 transition-all transform hover:scale-[1.02] flex items-center justify-center gap-2"
                    >
                        <ShoppingBag size={20} /> Add to Cart - {currencySymbol}{(product.price * quantity).toFixed(2)}
                    </button>
                    
                    {/* Share Buttons - Controlled by settings */}
                    {settings.showShareButtons && (
                        <div className="flex items-center gap-3 pt-2">
                            <span className="text-sm text-gray-500">Share:</span>
                            <button 
                                onClick={handleShareProduct}
                                className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
                            >
                                <Share2 size={16} className="text-gray-600" />
                            </button>
                        </div>
                    )}
                    
                    {/* Tabs - Updated to include all product details */}
                    <div className="border-t pt-6">
                        <div className="flex gap-6 border-b overflow-x-auto">
                            {["description", "details", "specifications", "shipping"].map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`pb-3 font-medium transition-colors capitalize whitespace-nowrap ${
                                        activeTab === tab
                                            ? 'text-blue-600 border-b-2 border-blue-600'
                                            : 'text-gray-500 hover:text-gray-700'
                                    }`}
                                >
                                    {tab === "specifications" ? "Specifications" : tab}
                                </button>
                            ))}
                        </div>
                        <div className="pt-4">
                            {activeTab === "description" && (
                                <p className="text-gray-600 leading-relaxed">
                                    {productDescription || "No description available"}
                                </p>
                            )}
                            {activeTab === "details" && (
                                <ul className="space-y-2 text-gray-600">
                                    {detailsList.length > 0 ? (
                                        detailsList.map((item, index) => (
                                            <li key={index} className="flex items-start gap-2">
                                                <span className="text-blue-500 mt-1">•</span>
                                                <span>{item}</span>
                                            </li>
                                        ))
                                    ) : (
                                        <li className="text-gray-400">No product details available</li>
                                    )}
                                </ul>
                            )}
                            {activeTab === "specifications" && (
                                <div className="space-y-4">
                                    {/* Material */}
                                    {productSpecs.material && (
                                        <div className="border-b border-gray-100 pb-3">
                                            <h4 className="font-semibold text-gray-800 mb-1">Material</h4>
                                            <p className="text-gray-600">{productSpecs.material}</p>
                                        </div>
                                    )}
                                    
                                    {/* Care Instructions */}
                                    {productSpecs.careInstructions && (
                                        <div className="border-b border-gray-100 pb-3">
                                            <h4 className="font-semibold text-gray-800 mb-1">Care Instructions</h4>
                                            <p className="text-gray-600">{productSpecs.careInstructions}</p>
                                        </div>
                                    )}
                                    
                                    {/* Tags - Safely handle tags */}
                                    {productSpecs.tags && getTagsArray(productSpecs.tags).length > 0 && (
                                        <div className="border-b border-gray-100 pb-3">
                                            <h4 className="font-semibold text-gray-800 mb-1">Tags</h4>
                                            <div className="flex flex-wrap gap-2">
                                                {getTagsArray(productSpecs.tags).map((tag, index) => (
                                                    <span key={index} className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm">
                                                        {tag.trim()}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    
                                    {/* If no specifications exist */}
                                    {!productSpecs.material && !productSpecs.careInstructions && !productSpecs.tags && (
                                        <p className="text-gray-400">No specifications available</p>
                                    )}
                                </div>
                            )}
                            {activeTab === "shipping" && (
                                <div className="space-y-3">
                                    {/* Shipping Fee - From product */}
                                    <div className="flex items-center gap-3 text-sm text-gray-600">
                                        <Truck className="w-5 h-5 text-green-600" />
                                        <span>
                                            {deliveryText || "Free delivery on orders over $100"}
                                        </span>
                                    </div>
                                    
                                    {/* Return Policy - From product */}
                                    <div className="flex items-center gap-3 text-sm text-gray-600">
                                        <RotateCcw className="w-5 h-5 text-blue-600" />
                                        <span>
                                            {returnText || "30-day easy returns"}
                                        </span>
                                    </div>
                                    
                                    {/* Secure Payment */}
                                    <div className="flex items-center gap-3 text-sm text-gray-600">
                                        <Shield className="w-5 h-5 text-purple-600" />
                                        <span>Secure payment</span>
                                    </div>
                                    
                                    {/* Additional shipping info from product */}
                                    {shippingList.length > 0 && (
                                        <div className="pt-2 border-t border-gray-100 mt-2">
                                            <p className="text-sm font-medium text-gray-700 mb-2">Shipping Information:</p>
                                            <ul className="space-y-2">
                                                {shippingList.map((item, index) => (
                                                    <li key={index} className="text-gray-600 text-sm flex items-start gap-2">
                                                        <span className="text-green-500 mt-0.5">•</span>
                                                        <span className="flex-1 leading-relaxed">{item}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            
            {/* Related Products - Controlled by settings */}
            {settings.showRelatedProducts && relatedProducts.length > 0 && (
                <div className="mt-16">
                    <h2 className="text-2xl font-bold mb-6">You May Also Like</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
                        {relatedProducts.map(related => {
                            const firstColor = related.colors?.[0];
                            const displayImage = (firstColor && related.colorImages?.[firstColor]) ? related.colorImages[firstColor] : related.image;
                            
                            return (
                                <div 
                                    key={related.id}
                                    onClick={() => handleRelatedProductClick(related.id)}
                                    className="bg-white rounded-lg shadow-md overflow-hidden cursor-pointer hover:shadow-xl transition-all transform hover:-translate-y-1 group"
                                >
                                    <div className="relative overflow-hidden bg-gray-100 flex items-center justify-center min-h-[250px]">
                                        <img 
                                            src={displayImage} 
                                            alt={related.name} 
                                            className="w-full h-auto max-h-[280px] object-contain group-hover:scale-105 transition-transform duration-300"
                                            onError={(e) => {
                                                e.target.src = 'https://via.placeholder.com/280x280?text=No+Image';
                                            }}
                                        />
                                        {settings.showSaleBadge && related.originalPrice && (
                                            <div className="absolute top-2 left-2 bg-red-500 text-white px-2 py-1 rounded text-xs font-bold">
                                                SALE
                                            </div>
                                        )}
                                    </div>
                                    <div className="p-4">
                                        <h3 className="font-semibold text-gray-800 mb-1 line-clamp-1">{related.name}</h3>
                                        {settings.showProductBrand && (
                                            <p className="text-gray-500 text-xs mb-2">{related.brand || "Zamed"}</p>
                                        )}
                                        {settings.showProductRatings && (
                                            <div className="flex items-center gap-2 mb-2">
                                                <div className="flex items-center">
                                                    {[...Array(5)].map((_, i) => (
                                                        <Star key={i} size={12} className={`${i < (related.rating || 4) ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} />
                                                    ))}
                                                </div>
                                                <span className="text-xs text-gray-500">({related.reviews || 0})</span>
                                            </div>
                                        )}
                                        <div className="flex items-center gap-2 mb-3">
                                            <span className="text-lg font-bold text-blue-600">{currencySymbol}{related.price}</span>
                                            {settings.showSaleBadge && related.originalPrice && <span className="text-xs text-gray-400 line-through">{currencySymbol}{related.originalPrice}</span>}
                                        </div>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); handleRelatedProductClick(related.id); }} 
                                            className="w-full mt-3 bg-gray-900 text-white py-2 rounded-lg text-sm font-semibold hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
                                        >
                                            <ShoppingBag size={14} /> View Details
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
            
            {/* Product Reviews Section - Controlled by settings */}
            {settings.reviewSystemEnabled && (
                <div id="reviews-section" className="mt-16">
                    <ProductReviews productId={product.id} productName={product.name} />
                </div>
            )}
        </div>
    );
};

export default ProductDetails;