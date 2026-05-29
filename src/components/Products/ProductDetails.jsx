// src/components/Products/ProductDetails.jsx
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useCart } from "../../context/CartContext";
import { toast } from "sonner";
import { FiMinus, FiPlus, FiCheck, FiTruck, FiShield, FiRefreshCw, FiChevronDown } from "react-icons/fi";
import { Heart, ShoppingBag, Image as ImageIcon, Star, MessageCircle } from "lucide-react";
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
    
    // Settings for product details page content
    const [productSettings, setProductSettings] = useState({
        deliveryInfoText: "Free delivery on orders over $100",
        returnPolicyText: "30-day easy returns",
        securePaymentText: "Secure payment",
        descriptionTabContent: "Premium quality product with excellent craftsmanship. Made with high-grade materials for durability and comfort. Perfect for everyday wear.",
        detailsTabContent: "• Material: Premium Quality Fabric\n• Care Instructions: Machine wash cold\n• Fit: Regular fit\n• Origin: Imported\n• Style: Modern and trendy",
        shippingTabContent: "• Free shipping on orders over $100\n• Estimated delivery: 3-5 business days\n• Easy returns within 30 days\n• Track your order in real-time\n• 24/7 customer support"
    });

    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        
        // Check if URL hash is #reviews
        if (window.location.hash === '#reviews') {
            setTimeout(() => {
                const reviewSection = document.getElementById('reviews-section');
                if (reviewSection) {
                    reviewSection.scrollIntoView({ behavior: 'smooth' });
                }
            }, 500);
        }
        
        // Load settings from localStorage
        const siteSettings = JSON.parse(localStorage.getItem('site_settings') || '{}');
        const symbols = { USD: "$", EUR: "€", GBP: "£", LKR: "Rs" };
        setCurrencySymbol(symbols[siteSettings.currency] || "$");
        
        // Load product details page settings
        setProductSettings(prev => ({
            ...prev,
            deliveryInfoText: siteSettings.deliveryInfoText || prev.deliveryInfoText,
            returnPolicyText: siteSettings.returnPolicyText || prev.returnPolicyText,
            securePaymentText: siteSettings.securePaymentText || prev.securePaymentText,
            descriptionTabContent: siteSettings.descriptionTabContent || prev.descriptionTabContent,
            detailsTabContent: siteSettings.detailsTabContent || prev.detailsTabContent,
            shippingTabContent: siteSettings.shippingTabContent || prev.shippingTabContent
        }));
        
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
            
            // Load images for all products first
            const loadedProducts = await loadProductsImages(allProducts);
            const foundProduct = loadedProducts.find(p => p.id === parseInt(id));
            
            if (foundProduct) {
                setProduct(foundProduct);
                setCurrentImage(foundProduct.image);
                
                if (foundProduct.sizes && foundProduct.sizes.length > 0) {
                    setSelectedSize(foundProduct.sizes[0]);
                }
                if (foundProduct.colors && foundProduct.colors.length > 0) {
                    setSelectedColor(foundProduct.colors[0]);
                    if (foundProduct.colorImages && foundProduct.colorImages[foundProduct.colors[0]]) {
                        setCurrentImage(foundProduct.colorImages[foundProduct.colors[0]]);
                    }
                }
                
                const related = loadedProducts.filter(p => 
                    p.id !== foundProduct.id && 
                    (p.category === foundProduct.category || p.gender === foundProduct.gender)
                ).slice(0, 4);
                setRelatedProducts(related);
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
        
        if (!selectedSize && product.sizes && product.sizes.length > 0) {
            toast.error("Please select a size");
            return;
        }
        if (!selectedColor && product.colors && product.colors.length > 0) {
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

    const detailsList = formatDetailsList(productSettings.detailsTabContent);
    const shippingList = formatDetailsList(productSettings.shippingTabContent);

    return (
        <div className="container mx-auto px-4 py-8 max-w-6xl">
            {/* Back Button */}
            <button 
                onClick={() => navigate(-1)} 
                className="mb-6 text-gray-600 hover:text-gray-900 transition-colors flex items-center gap-2"
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
                        />
                        {product.originalPrice && (
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
                    
                    {/* Color Thumbnail Gallery */}
                    {product.colors && product.colors.length > 0 && (
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
                        <p className="text-gray-500">{product.brand || "Zamed Premium"}</p>
                    </div>
                    
                    {/* Rating with Clickable View Reviews Button */}
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
                    
                    {/* Price */}
                    <div className="flex items-center gap-3">
                        <span className="text-3xl font-bold text-blue-600">
                            {currencySymbol}{product.price}
                        </span>
                        {product.originalPrice && (
                            <span className="text-xl text-gray-400 line-through">
                                {currencySymbol}{product.originalPrice}
                            </span>
                        )}
                    </div>
                    
                    {/* Selected Color Display */}
                    {selectedColor && (
                        <div className="bg-gray-50 p-3 rounded-xl">
                            <p className="text-sm text-gray-600">Selected Color:</p>
                            <div className="flex items-center gap-2 mt-1">
                                <div className="w-6 h-6 rounded-full" style={{ backgroundColor: getColorSwatch(selectedColor) }} />
                                <span className="font-medium text-gray-900">{selectedColor}</span>
                            </div>
                        </div>
                    )}
                    
                    {/* Size Selection */}
                    {product.sizes && product.sizes.length > 0 && (
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
                    
                    {/* Color Selection Backup */}
                    {product.colors && product.colors.length > 0 && (
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
                    
                    {/* Delivery Info */}
                    <div className="border-t pt-6 space-y-3">
                        <div className="flex items-center gap-3 text-sm text-gray-600">
                            <FiTruck className="text-green-600" />
                            <span>{productSettings.deliveryInfoText}</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-gray-600">
                            <FiRefreshCw className="text-blue-600" />
                            <span>{productSettings.returnPolicyText}</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-gray-600">
                            <FiShield className="text-purple-600" />
                            <span>{productSettings.securePaymentText}</span>
                        </div>
                    </div>
                    
                    {/* Tabs */}
                    <div className="border-t pt-6">
                        <div className="flex gap-6 border-b">
                            {["description", "details", "shipping"].map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`pb-3 font-medium transition-colors capitalize ${
                                        activeTab === tab
                                            ? 'text-blue-600 border-b-2 border-blue-600'
                                            : 'text-gray-500 hover:text-gray-700'
                                    }`}
                                >
                                    {tab}
                                </button>
                            ))}
                        </div>
                        <div className="pt-4">
                            {activeTab === "description" && (
                                <p className="text-gray-600 leading-relaxed">
                                    {product.description || productSettings.descriptionTabContent}
                                </p>
                            )}
                            {activeTab === "details" && (
                                <ul className="space-y-2 text-gray-600">
                                    {detailsList.map((item, index) => (
                                        <li key={index}>{item}</li>
                                    ))}
                                </ul>
                            )}
                            {activeTab === "shipping" && (
                                <div className="space-y-2 text-gray-600">
                                    {shippingList.map((item, index) => (
                                        <p key={index}>{item}</p>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            
            {/* Related Products */}
            {relatedProducts.length > 0 && (
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
                                        />
                                        {related.originalPrice && (
                                            <div className="absolute top-2 left-2 bg-red-500 text-white px-2 py-1 rounded text-xs font-bold">
                                                SALE
                                            </div>
                                        )}
                                    </div>
                                    <div className="p-4">
                                        <h3 className="font-semibold text-gray-800 mb-1 line-clamp-1">{related.name}</h3>
                                        <p className="text-gray-500 text-xs mb-2">{related.brand || "Zamed"}</p>
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="flex items-center">
                                                {[...Array(5)].map((_, i) => (
                                                    <Star key={i} size={12} className={`${i < (related.rating || 4) ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} />
                                                ))}
                                            </div>
                                            <span className="text-xs text-gray-500">({related.reviews || 0})</span>
                                        </div>
                                        <div className="flex items-center gap-2 mb-3">
                                            <span className="text-lg font-bold text-blue-600">{currencySymbol}{related.price}</span>
                                            {related.originalPrice && <span className="text-xs text-gray-400 line-through">{currencySymbol}{related.originalPrice}</span>}
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
            
            {/* Product Reviews Section */}
            <div id="reviews-section" className="mt-16">
                <ProductReviews productId={product.id} productName={product.name} />
            </div>
        </div>
    );
};

export default ProductDetails;