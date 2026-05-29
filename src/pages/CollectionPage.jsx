import { useParams, Link, useNavigate } from "react-router-dom";
import { useState, useEffect, useCallback } from "react";
import { ShoppingBag, Star, Home, X, Filter, Heart, Search, MessageCircle, ChevronDown, ChevronUp, SlidersHorizontal } from "lucide-react";
import { useCart } from "../context/CartContext";
import { toast } from "sonner";
import productService from "../services/productService";
import { loadProductsImages } from "../utils/imageLoader";
import { motion, AnimatePresence } from "framer-motion";

const CollectionPage = () => {
    const { collection } = useParams();
    const navigate = useNavigate();
    const { addToCart } = useCart();
    const [allProducts, setAllProducts] = useState([]);
    const [filteredProducts, setFilteredProducts] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [selectedColor, setSelectedColor] = useState("");
    const [selectedSize, setSelectedSize] = useState("");
    const [quantity, setQuantity] = useState(1);
    const [currentMainImage, setCurrentMainImage] = useState("");
    const [loading, setLoading] = useState(true);
    const [currencySymbol, setCurrencySymbol] = useState("$");
    const [currencyCode, setCurrencyCode] = useState("USD");
    const [favorites, setFavorites] = useState([]);
    const [user, setUser] = useState(null);
    const [showFilter, setShowFilter] = useState(false);
    const [selectedPriceRange, setSelectedPriceRange] = useState("");
    const [availableBrands, setAvailableBrands] = useState([]);
    const [activeFilterCount, setActiveFilterCount] = useState(0);
    
    const [expandedSections, setExpandedSections] = useState({
        categories: true,
        brands: true,
        sizes: true,
        colors: true,
        price: true
    });
    
    const [filters, setFilters] = useState({
        priceRange: { min: 0, max: 100000 },
        selectedSizes: [],
        selectedColors: [],
        selectedCategories: [],
        selectedBrands: [],
        sortBy: "featured"
    });

    // Categories
    const menCategoriesList = [
        "T-Shirts", "Formal Shirts", "Casual Shirts", "Polo Shirts", "Henley Shirts",
        "Full Sleeve", "Half Sleeve", "Hoodies", "Sweatshirts", "Sweaters", "Cardigans",
        "Jackets", "Denim Jackets", "Leather Jackets", "Bomber Jackets", "Blazers",
        "Jeans", "Trousers", "Chinos", "Cargo Pants", "Joggers", "Track Pants", "Shorts",
        "Sports Wear", "Activewear", "Gym Wear", "Compression Wear",
        "Boxers", "Briefs", "Trunks", "Vests", "Undershirts",
        "Suits", "Sherwani", "Kurta", "Traditional Wear", "Party Wear"
    ];

    const womenCategoriesList = [
        "Dresses", "Maxi Dresses", "Mini Dresses", "Party Dresses", "Casual Dresses",
        "Tops", "Blouses", "Shirts", "T-Shirts", "Crop Tops", "Tunics",
        "Full Sleeve", "Half Sleeve", "Hoodies", "Sweatshirts", "Sweaters",
        "Jackets", "Denim Jackets", "Leather Jackets", "Blazers", "Cardigans",
        "Jeans", "Trousers", "Leggings", "Jeggings", "Shorts", "Skirts",
        "Sports Wear", "Activewear", "Gym Wear", "Yoga Pants", "Sports Bra",
        "Bras", "Push Up Bra", "Wireless Bra", "Padded Bra",
        "Panties", "Briefs", "Thongs", "Hipsters", "Bikinis",
        "Sarees", "Kurtis", "Salwar Kameez", "Lehenga", "Anarkali",
        "Hijabs", "Abayas", "Scarves", "Shawls", "Niqabs", "Jilbabs"
    ];

    const kidsCategoriesList = [
        "T-Shirts", "Shirts", "Full Sleeve", "Half Sleeve", "Hoodies", "Sweaters",
        "Jackets", "Jeans", "Trousers", "Shorts", "Leggings", "Dresses",
        "Rompers", "Onesies", "Track Suits", "School Uniform", "Party Wear"
    ];

    const getCategoriesByCollection = () => {
        const collectionType = collection?.toLowerCase() || 'all';
        if (collectionType === 'men') return menCategoriesList;
        if (collectionType === 'women') return womenCategoriesList;
        if (collectionType === 'kids') return kidsCategoriesList;
        return [...menCategoriesList, ...womenCategoriesList, ...kidsCategoriesList];
    };

    const collectionCategories = getCategoriesByCollection();
    const allSizesList = ["XS", "S", "M", "L", "XL", "XXL", "3XL", "4XL", "5XL", "28", "30", "32", "34", "36", "38", "40", "One Size"];
    const allColorsList = [
        "Black", "White", "Red", "Blue", "Green", "Yellow", "Purple", "Pink", 
        "Gray", "Brown", "Navy", "Orange", "Beige", "Nude", "Maroon", "Teal", 
        "Coral", "Lavender", "Mint", "Peach", "Gold", "Silver", "Charcoal", 
        "Indigo", "Turquoise", "Burgundy", "Khaki", "Cream", "Ivory", "Sky Blue"
    ];

    const getPriceRanges = () => {
        const isLKR = currencyCode === 'LKR';
        if (isLKR) {
            return [
                { label: "All Prices", min: 0, max: 10000000, value: "all" },
                { label: "Under Rs 5,000", min: 0, max: 5000, value: "under-5000" },
                { label: "Rs 5,000 - Rs 10,000", min: 5000, max: 10000, value: "5000-10000" },
                { label: "Rs 10,000 - Rs 25,000", min: 10000, max: 25000, value: "10000-25000" },
                { label: "Rs 25,000 - Rs 50,000", min: 25000, max: 50000, value: "25000-50000" },
                { label: "Rs 50,000 - Rs 100,000", min: 50000, max: 100000, value: "50000-100000" },
                { label: "Rs 100,000+", min: 100000, max: 10000000, value: "100000-plus" }
            ];
        }
        return [
            { label: "All Prices", min: 0, max: 100000, value: "all" },
            { label: "Under $50", min: 0, max: 50, value: "under-50" },
            { label: "$50 - $100", min: 50, max: 100, value: "50-100" },
            { label: "$100 - $200", min: 100, max: 200, value: "100-200" },
            { label: "$200 - $500", min: 200, max: 500, value: "200-500" },
            { label: "$500 - $1,000", min: 500, max: 1000, value: "500-1000" },
            { label: "$1,000 - $2,000", min: 1000, max: 2000, value: "1000-2000" },
            { label: "$2,000 - $5,000", min: 2000, max: 5000, value: "2000-5000" },
            { label: "$5,000 - $10,000", min: 5000, max: 10000, value: "5000-10000" },
            { label: "$10,000 - $25,000", min: 10000, max: 25000, value: "10000-25000" },
            { label: "$25,000 - $50,000", min: 25000, max: 50000, value: "25000-50000" },
            { label: "$50,000 - $100,000", min: 50000, max: 100000, value: "50000-100000" },
            { label: "$100,000+", min: 100000, max: 1000000, value: "100000-plus" }
        ];
    };

    const priceRanges = getPriceRanges();

    // Helper function to parse bullet points from text - each line becomes a bullet point
    const parseBulletPoints = (text) => {
        if (!text) return [];
        const lines = text.split('\n');
        const bullets = [];
        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed) {
                // Remove existing bullet symbols if present, then add fresh one
                let cleanText = trimmed.replace(/^[•\-*]\s*/, '');
                bullets.push(cleanText);
            }
        }
        return bullets;
    };

    // Get clean description (remove any ## headers if present)
    const getCleanDescription = (text) => {
        if (!text) return "";
        let clean = text;
        clean = clean.replace(/## Product Details[\s\S]*?(?=\n##|$)/gi, '');
        clean = clean.replace(/## Shipping Information[\s\S]*?(?=\n##|$)/gi, '');
        return clean.trim();
    };

    useEffect(() => {
        const loadSettings = () => {
            const settings = JSON.parse(localStorage.getItem('site_settings') || '{}');
            const symbols = { USD: "$", EUR: "€", GBP: "£", LKR: "Rs" };
            setCurrencySymbol(symbols[settings.currency] || "$");
            setCurrencyCode(settings.currency || "USD");
        };
        loadSettings();
        
        const userData = localStorage.getItem('user');
        if (userData) {
            const parsedUser = JSON.parse(userData);
            setUser(parsedUser);
            loadFavorites(parsedUser.email);
        }
    }, []);

    useEffect(() => {
        const allProductsFromService = productService.getAllProducts();
        const brands = [...new Set(allProductsFromService.map(p => p.brand).filter(b => b))];
        setAvailableBrands(brands.sort());
    }, []);

    const loadFavorites = (email) => {
        const favoriteIds = JSON.parse(localStorage.getItem(`favorites_${email}`) || '[]');
        const allProductsList = productService.getAllProducts();
        const favoriteProducts = allProductsList.filter(p => favoriteIds.includes(p.id));
        setFavorites(favoriteProducts);
    };

    useEffect(() => {
        const handleFavoritesUpdate = (event) => {
            if (event.detail && event.detail.email === user?.email) {
                setFavorites(event.detail.favorites);
            } else if (user) {
                loadFavorites(user.email);
            }
        };
        
        window.addEventListener('favoritesUpdated', handleFavoritesUpdate);
        window.addEventListener('storage', handleStorageChange);
        
        return () => {
            window.removeEventListener('favoritesUpdated', handleFavoritesUpdate);
            window.removeEventListener('storage', handleStorageChange);
        };
    }, [user]);

    const handleStorageChange = (e) => {
        if (e.key && e.key.startsWith('favorites_') && user) {
            loadFavorites(user.email);
        }
    };

    useEffect(() => {
        loadProducts();
        const unsubscribe = productService.subscribe(() => loadProducts());
        return () => unsubscribe();
    }, [collection]);

    useEffect(() => {
        applyFiltersAndSearch();
    }, [allProducts, filters, searchQuery]);

    useEffect(() => {
        let count = 0;
        if (selectedPriceRange !== "all") count++;
        count += filters.selectedBrands.length;
        count += filters.selectedCategories.length;
        count += filters.selectedSizes.length;
        count += filters.selectedColors.length;
        if (filters.sortBy !== "featured") count++;
        setActiveFilterCount(count);
    }, [filters, selectedPriceRange]);

    const loadProducts = async () => {
        setLoading(true);
        let products = productService.getAllProducts();
        products = await loadProductsImages(products);
        
        let filtered = [];
        if (collection && collection !== 'all') {
            const normalizedCollection = collection.toLowerCase();
            if (normalizedCollection === 'men' || normalizedCollection === 'women' || normalizedCollection === 'kids') {
                filtered = products.filter(p => {
                    const productGender = p.gender ? p.gender.toLowerCase() : '';
                    return productGender === normalizedCollection;
                });
            } else if (normalizedCollection === 'new-arrivals') {
                filtered = products.filter(p => p.isNewArrival === true);
            } else if (normalizedCollection === 'best-sellers') {
                filtered = products.filter(p => p.isFeatured === true);
            } else if (normalizedCollection === 'sale') {
                filtered = products.filter(p => p.originalPrice && p.originalPrice > p.price);
            } else {
                filtered = products;
            }
        } else {
            filtered = products;
        }
        setAllProducts(filtered);
        setLoading(false);
    };

    const updateFilterField = (field, value) => {
        setFilters(prev => ({ ...prev, [field]: value }));
    };

    const toggleArrayFilter = (arrayName, item) => {
        setFilters(prev => {
            const currentArray = prev[arrayName] || [];
            const newArray = currentArray.includes(item)
                ? currentArray.filter(i => i !== item)
                : [...currentArray, item];
            return { ...prev, [arrayName]: newArray };
        });
    };

    const toggleSection = (section) => {
        setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
    };

    const applyFiltersAndSearch = useCallback(() => {
        let filtered = [...allProducts];
        
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(p => 
                p.name.toLowerCase().includes(query) || 
                (p.brand && p.brand.toLowerCase().includes(query))
            );
        }
        
        const minPrice = filters.priceRange.min;
        const maxPrice = filters.priceRange.max;
        filtered = filtered.filter(p => p.price >= minPrice && p.price <= maxPrice);
        
        if (filters.selectedSizes.length > 0) {
            filtered = filtered.filter(p => 
                p.sizes && p.sizes.some(size => filters.selectedSizes.includes(size))
            );
        }
        
        if (filters.selectedColors.length > 0) {
            filtered = filtered.filter(p => 
                p.colors && p.colors.some(color => filters.selectedColors.includes(color))
            );
        }
        
        if (filters.selectedCategories.length > 0) {
            filtered = filtered.filter(p => {
                const productCategory = p.category?.toLowerCase() || '';
                return filters.selectedCategories.some(cat => 
                    productCategory === cat.toLowerCase() || 
                    productCategory.includes(cat.toLowerCase())
                );
            });
        }
        
        if (filters.selectedBrands.length > 0) {
            filtered = filtered.filter(p => p.brand && filters.selectedBrands.includes(p.brand));
        }
        
        if (filters.sortBy === "price-low-high") {
            filtered.sort((a, b) => a.price - b.price);
        } else if (filters.sortBy === "price-high-low") {
            filtered.sort((a, b) => b.price - a.price);
        } else if (filters.sortBy === "rating") {
            filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        } else if (filters.sortBy === "newest") {
            filtered.sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date));
        }
        
        setFilteredProducts(filtered);
    }, [allProducts, searchQuery, filters]);

    useEffect(() => {
        applyFiltersAndSearch();
    }, [applyFiltersAndSearch]);

    const handlePriceRangeSelect = (range) => {
        setSelectedPriceRange(range.value);
        setFilters(prev => ({
            ...prev,
            priceRange: { min: range.min, max: range.max }
        }));
    };

    const clearAllFilters = () => {
        const isLKR = currencyCode === 'LKR';
        setFilters({
            priceRange: { min: 0, max: isLKR ? 10000000 : 100000 },
            selectedSizes: [],
            selectedColors: [],
            selectedCategories: [],
            selectedBrands: [],
            sortBy: "featured"
        });
        setSelectedPriceRange("all");
        setSearchQuery("");
    };

    const toggleFavorite = (product, e) => {
        e.stopPropagation();
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
        const favoriteIds = updatedFavorites.map(p => p.id);
        localStorage.setItem(`favorites_${user.email}`, JSON.stringify(favoriteIds));
        
        window.dispatchEvent(new CustomEvent('favoritesUpdated', { 
            detail: { email: user.email, favorites: updatedFavorites } 
        }));
        window.dispatchEvent(new Event('storage'));
    };

    const handleAddToCart = (product, e) => {
        e.stopPropagation();
        addToCart({
            id: product.id, name: product.name, price: product.price, image: product.image,
            category: product.category, size: selectedSize || product.sizes?.[0] || "One Size",
            color: selectedColor || product.colors?.[0] || "Default", quantity: quantity
        });
        toast.success(`${product.name} added to cart!`);
        setSelectedProduct(null);
    };

    const goToProductReviews = (productId) => {
        navigate(`/product/${productId}#reviews`);
        setTimeout(() => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }, 100);
    };

    const getColorSwatch = (color) => {
        const colorMap = {
            'Black': '#1a1a1a', 'White': '#f5f5f5', 'Red': '#dc2626', 'Blue': '#3b82f6',
            'Green': '#22c55e', 'Gray': '#9ca3af', 'Brown': '#78350f', 'Navy': '#1e3a8a',
            'Pink': '#ec4899', 'Purple': '#a855f7', 'Yellow': '#eab308', 'Orange': '#f97316',
            'Beige': '#f5e6d3', 'Nude': '#fde68a', 'Maroon': '#800000', 'Teal': '#008080',
            'Coral': '#ff7f50', 'Lavender': '#e6e6fa', 'Mint': '#98ff98', 'Peach': '#ffdab9',
            'Gold': '#ffd700', 'Silver': '#c0c0c0', 'Charcoal': '#36454f', 'Indigo': '#4b0082',
            'Turquoise': '#40e0d0', 'Burgundy': '#800020', 'Khaki': '#f0e68c', 'Cream': '#fffdd0',
            'Ivory': '#fffff0', 'Sky Blue': '#87ceeb'
        };
        return colorMap[color] || '#cccccc';
    };

    const ProductCard = ({ product }) => {
        const isFavorite = favorites.some(item => item.id === product.id);
        const [currentColor, setCurrentColor] = useState(product.colors?.[0] || "");
        const [displayImage, setDisplayImage] = useState(product.image);
        const productRating = product.rating || 0;
        const productReviews = product.reviews || 0;
        
        const handleColorHover = (color) => {
            setCurrentColor(color);
            if (product.colorImages && product.colorImages[color]) {
                setDisplayImage(product.colorImages[color]);
            }
        };
        
        const handleColorLeave = () => {
            setCurrentColor(product.colors?.[0] || "");
            setDisplayImage(product.image);
        };
        
        const handleImageClick = (e) => {
            e.stopPropagation();
            navigate(`/product/${product.id}`);
            setTimeout(() => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }, 100);
        };
        
        const handleNameClick = (e) => {
            e.stopPropagation();
            navigate(`/product/${product.id}`);
            setTimeout(() => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }, 100);
        };
        
        return (
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ y: -5 }}
                className="bg-white rounded-xl shadow-md overflow-hidden group hover:shadow-xl transition-all flex flex-col h-full"
            >
                <div 
                    className="relative bg-white cursor-pointer overflow-hidden"
                    onClick={handleImageClick}
                >
                    <div className="w-full flex items-center justify-center" style={{ height: '280px', backgroundColor: '#ffffff' }}>
                        <img 
                            src={displayImage} 
                            alt={product.name} 
                            className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-105"
                            style={{ maxHeight: '280px', objectFit: 'contain' }}
                        />
                    </div>
                    
                    {product.originalPrice && (
                        <div className="absolute top-3 left-3 bg-red-500 text-white px-2 py-1 rounded-lg text-xs font-bold z-10">SALE</div>
                    )}
                    
                    <button onClick={(e) => toggleFavorite(product, e)} className="absolute top-3 right-3 p-2 bg-white rounded-full shadow-md hover:scale-110 transition-all z-10">
                        <Heart size={16} className={isFavorite ? "text-red-500 fill-current" : "text-gray-400"} />
                    </button>
                    
                    {product.colors && product.colors.length > 0 && (
                        <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-2 py-2 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300">
                            {product.colors.slice(0, 5).map((color, idx) => (
                                <div key={idx} className="relative" onMouseEnter={() => handleColorHover(color)} onMouseLeave={handleColorLeave}>
                                    <div className="w-6 h-6 rounded-full border-2 border-white cursor-pointer hover:scale-110 transition-transform shadow-md" style={{ backgroundColor: getColorSwatch(color) }} title={color} />
                                </div>
                            ))}
                            {product.colors.length > 5 && (
                                <div className="w-6 h-6 rounded-full bg-white/80 backdrop-blur flex items-center justify-center text-xs font-bold text-gray-800">
                                    +{product.colors.length - 5}
                                </div>
                            )}
                        </div>
                    )}
                </div>
                
                <div className="p-4 flex-grow flex flex-col">
                    <h3 className="font-semibold text-gray-800 mb-1 text-base line-clamp-1 cursor-pointer hover:text-blue-600 transition-colors" onClick={handleNameClick}>
                        {product.name}
                    </h3>
                    <p className="text-gray-500 text-xs mb-2">{product.brand || "Zamed Premium"}</p>
                    
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1">
                            <div className="flex items-center">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <Star key={star} size={12} className={`${star <= Math.round(productRating) ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} />
                                ))}
                            </div>
                            <button onClick={(e) => { e.stopPropagation(); goToProductReviews(product.id); }} className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1 transition-colors">
                                <MessageCircle size={10} /> ({productReviews} {productReviews === 1 ? 'review' : 'reviews'})
                            </button>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-2 mb-3">
                        <span className="text-xl font-bold text-gray-900">{currencySymbol}{product.price.toLocaleString()}</span>
                        {product.originalPrice && <span className="text-xs text-gray-400 line-through">{currencySymbol}{product.originalPrice.toLocaleString()}</span>}
                    </div>
                    
                    {currentColor && (
                        <div className="flex items-center gap-2 mb-3">
                            <div className="w-4 h-4 rounded-full border border-gray-300" style={{ backgroundColor: getColorSwatch(currentColor) }} />
                            <span className="text-xs text-gray-500">Color: {currentColor}</span>
                        </div>
                    )}
                    
                    <button onClick={(e) => { e.stopPropagation(); e.preventDefault(); setSelectedProduct(product); setSelectedColor(product.colors?.[0] || ""); setSelectedSize(product.sizes?.[0] || ""); setCurrentMainImage(product.image); setQuantity(1); }} className="w-full bg-gray-900 text-white py-2 rounded-lg font-semibold text-sm hover:bg-gray-800 transition-all flex items-center justify-center gap-2 mt-auto">
                        <ShoppingBag size={14} /> Quick Shop
                    </button>
                </div>
            </motion.div>
        );
    };

    const ProductModal = ({ product, onClose }) => {
        const [localColor, setLocalColor] = useState(product.colors?.[0] || "");
        const [localSize, setLocalSize] = useState(product.sizes?.[0] || "");
        const [localQuantity, setLocalQuantity] = useState(1);
        const [mainImage, setMainImage] = useState(product.image);
        const [activeInfoTab, setActiveInfoTab] = useState("description");
        
        // Get data from product
        const description = getCleanDescription(product.description || "");
        
        // Get product details - parse bullet points line by line
        const detailsText = product.details || "";
        const detailsBullets = parseBulletPoints(detailsText);
        
        // Get shipping information - parse bullet points line by line
        const shippingText = product.shipping || "";
        const shippingBullets = parseBulletPoints(shippingText);
        
        useEffect(() => {
            if (localColor && product.colorImages && product.colorImages[localColor]) {
                setMainImage(product.colorImages[localColor]);
            } else {
                setMainImage(product.image);
            }
        }, [localColor, product]);
        
        const handleColorSelect = (color) => {
            setLocalColor(color);
        };
        
        const handleAddToCartModal = () => {
            if (product.sizes?.length > 0 && !localSize) {
                toast.error("Please select a size");
                return;
            }
            addToCart({
                id: product.id, name: product.name, price: product.price, image: mainImage,
                category: product.category, size: localSize || product.sizes?.[0] || "One Size",
                color: localColor || product.colors?.[0] || "Default", quantity: localQuantity
            });
            toast.success(`${product.name} added to cart!`);
            onClose();
        };
        
        const handleViewReviews = () => {
            onClose();
            navigate(`/product/${product.id}#reviews`);
            setTimeout(() => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }, 100);
        };
        
        const handleViewDetails = () => {
            onClose();
            navigate(`/product/${product.id}`);
            setTimeout(() => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }, 100);
        };
        
        return (
            <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50 overflow-y-auto" onClick={onClose}>
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-white rounded-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                    <div className="relative">
                        <button onClick={onClose} className="absolute top-4 right-4 z-10 p-2 bg-white rounded-full shadow-md hover:scale-110 transition-all"><X size={20} /></button>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
                            {/* Left Column - Images */}
                            <div className="space-y-4">
                                <div className="bg-white rounded-2xl overflow-hidden flex items-center justify-center" style={{ height: '400px' }}>
                                    <img src={mainImage} alt={product.name} className="w-full h-full object-contain" />
                                </div>
                                
                                {product.colors?.length > 1 && (
                                    <div>
                                        <p className="text-sm font-medium text-gray-700 mb-3">Available Colors:</p>
                                        <div className="flex gap-3 flex-wrap">
                                            {product.colors.map((color, idx) => {
                                                const colorImage = product.colorImages?.[color] || product.image;
                                                const isSelected = localColor === color;
                                                return (
                                                    <div key={idx} className={`relative cursor-pointer transition-all duration-200 ${isSelected ? 'scale-105' : 'hover:scale-105'}`} onClick={() => handleColorSelect(color)}>
                                                        <div className={`w-16 h-16 rounded-lg border-2 overflow-hidden ${isSelected ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-300'}`}>
                                                            <img src={colorImage} alt={color} className="w-full h-full object-cover" />
                                                        </div>
                                                        <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">{color}</div>
                                                        {isSelected && <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full border-2 border-white"></div>}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                            
                            {/* Right Column - Product Info with 3 Tabs */}
                            <div className="space-y-4">
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-900">{product.name}</h2>
                                    <p className="text-gray-500 text-sm mt-1">{product.brand || "Zamed Premium"}</p>
                                </div>
                                
                                <div className="flex items-center gap-2">
                                    <div className="flex items-center">
                                        {[1, 2, 3, 4, 5].map((star) => (
                                            <Star key={star} size={16} className={`${star <= Math.round(product.rating || 0) ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} />
                                        ))}
                                    </div>
                                    <button onClick={handleViewReviews} className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1">
                                        <MessageCircle size={14} /> ({product.reviews || 0} reviews)
                                    </button>
                                </div>
                                
                                <div className="flex items-center gap-3">
                                    <span className="text-3xl font-bold text-blue-600">{currencySymbol}{product.price.toLocaleString()}</span>
                                    {product.originalPrice && <span className="text-lg text-gray-400 line-through">{currencySymbol}{product.originalPrice.toLocaleString()}</span>}
                                </div>
                                
                                {/* ========== 3 TABS: Description, Details, Shipping ========== */}
                                <div className="border-b border-gray-200">
                                    <div className="flex gap-4">
                                        <button
                                            onClick={() => setActiveInfoTab("description")}
                                            className={`pb-2 px-1 font-medium transition-colors ${activeInfoTab === "description" ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-500 hover:text-gray-700"}`}
                                        >
                                            Description
                                        </button>
                                        <button
                                            onClick={() => setActiveInfoTab("details")}
                                            className={`pb-2 px-1 font-medium transition-colors ${activeInfoTab === "details" ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-500 hover:text-gray-700"}`}
                                        >
                                            Details
                                        </button>
                                        <button
                                            onClick={() => setActiveInfoTab("shipping")}
                                            className={`pb-2 px-1 font-medium transition-colors ${activeInfoTab === "shipping" ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-500 hover:text-gray-700"}`}
                                        >
                                            Shipping
                                        </button>
                                    </div>
                                </div>
                                
                                <div className="min-h-[200px]">
                                    {/* DESCRIPTION TAB */}
                                    {activeInfoTab === "description" && (
                                        <div className="prose prose-sm max-w-none">
                                            {description ? (
                                                <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-line">{description}</p>
                                            ) : (
                                                <p className="text-gray-400 text-sm">No description available</p>
                                            )}
                                        </div>
                                    )}
                                    
                                    {/* DETAILS TAB - Bullet points line by line */}
                                    {activeInfoTab === "details" && (
                                        <div>
                                            {detailsBullets.length > 0 ? (
                                                <ul className="space-y-2">
                                                    {detailsBullets.map((point, i) => (
                                                        <li key={i} className="text-gray-600 text-sm flex items-start gap-2">
                                                            <span className="text-blue-500 mt-0.5">•</span>
                                                            <span className="flex-1 leading-relaxed">{point}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            ) : (
                                                <p className="text-gray-400 text-sm">No product details available</p>
                                            )}
                                        </div>
                                    )}
                                    
                                    {/* SHIPPING TAB - Bullet points line by line */}
                                    {activeInfoTab === "shipping" && (
                                        <div>
                                            {shippingBullets.length > 0 ? (
                                                <ul className="space-y-2">
                                                    {shippingBullets.map((point, i) => (
                                                        <li key={i} className="text-gray-600 text-sm flex items-start gap-2">
                                                            <span className="text-green-500 mt-0.5">•</span>
                                                            <span className="flex-1 leading-relaxed">{point}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            ) : (
                                                <p className="text-gray-400 text-sm">No shipping information available</p>
                                            )}
                                        </div>
                                    )}
                                </div>
                                
                                {localColor && (
                                    <div className="bg-gray-50 p-3 rounded-xl">
                                        <p className="text-sm text-gray-600">Selected Color:</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <div className="w-6 h-6 rounded-full" style={{ backgroundColor: getColorSwatch(localColor) }} />
                                            <span className="font-medium text-gray-900">{localColor}</span>
                                        </div>
                                    </div>
                                )}
                                
                                {product.sizes?.length > 0 && (
                                    <div>
                                        <h4 className="font-semibold text-gray-900 mb-2">Select Size</h4>
                                        <div className="flex flex-wrap gap-2">
                                            {product.sizes.map(size => (
                                                <button key={size} onClick={() => setLocalSize(size)} className={`px-4 py-2 rounded-lg border-2 transition-all ${localSize === size ? 'border-blue-600 bg-blue-50 text-blue-600' : 'border-gray-300 text-gray-700 hover:border-gray-400'}`}>
                                                    {size}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                
                                <div>
                                    <h4 className="font-semibold text-gray-900 mb-2">Quantity</h4>
                                    <div className="flex items-center gap-3">
                                        <button onClick={() => setLocalQuantity(Math.max(1, localQuantity - 1))} className="w-8 h-8 border rounded-lg hover:bg-gray-100">-</button>
                                        <span className="w-12 text-center font-semibold">{localQuantity}</span>
                                        <button onClick={() => setLocalQuantity(localQuantity + 1)} className="w-8 h-8 border rounded-lg hover:bg-gray-100">+</button>
                                        <span className="text-sm text-gray-500 ml-2">In Stock: {product.stock}+</span>
                                    </div>
                                </div>
                                
                                <div className="flex gap-3">
                                    <button onClick={handleAddToCartModal} className="flex-1 bg-gray-900 text-white py-3 rounded-xl font-semibold hover:bg-gray-800 transition-all flex items-center justify-center gap-2">
                                        <ShoppingBag size={18} /> Add to Cart
                                    </button>
                                    <button onClick={handleViewDetails} className="px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:border-blue-600 hover:text-blue-600 transition-all flex items-center gap-2">
                                        View Full Details
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>
        );
    };

    const CollapsibleFilterSection = ({ title, children, sectionKey, count }) => {
        const isExpanded = expandedSections[sectionKey];
        return (
            <div className="mb-4 border-b border-gray-100 pb-3">
                <button onClick={() => toggleSection(sectionKey)} className="w-full flex justify-between items-center py-2 font-semibold text-gray-800 hover:text-blue-600 transition-colors">
                    <span>{title}</span>
                    {count > 0 && <span className="text-xs bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full">{count}</span>}
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
                <AnimatePresence>
                    {isExpanded && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                            <div className="pt-3">{children}</div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        );
    };

    const FilterSectionComponent = ({ items, selectedItems, onToggle, maxVisible = 8 }) => {
        const [showAll, setShowAll] = useState(false);
        const visibleItems = showAll ? items : items.slice(0, maxVisible);
        const hasMore = items.length > maxVisible;
        if (items.length === 0) return null;
        return (
            <div className="mb-4">
                <div className="flex flex-wrap gap-2">
                    {visibleItems.map(item => (
                        <button key={item} onClick={() => onToggle(item)} className={`px-3 py-1.5 rounded-lg text-sm transition-all ${selectedItems.includes(item) ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                            {item}
                        </button>
                    ))}
                </div>
                {hasMore && (
                    <button onClick={() => setShowAll(!showAll)} className="text-xs text-blue-600 hover:text-blue-800 mt-2 flex items-center gap-1">
                        {showAll ? <>Show Less <ChevronUp size={12} /></> : <>Show All ({items.length}) <ChevronDown size={12} /></>}
                    </button>
                )}
            </div>
        );
    };

    const FilterSidebar = () => (
        <div className="bg-white rounded-xl shadow-lg flex flex-col h-full">
            <div className="flex justify-between items-center p-5 border-b">
                <div className="flex items-center gap-2"><SlidersHorizontal size={18} className="text-blue-600" /><h2 className="text-xl font-bold">Filters</h2>{activeFilterCount > 0 && <span className="bg-orange-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">{activeFilterCount}</span>}</div>
                <button onClick={() => setShowFilter(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><X size={20} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
                <CollapsibleFilterSection title="Sort By" sectionKey="sort" count={filters.sortBy !== "featured" ? 1 : 0}>
                    <select value={filters.sortBy} onChange={(e) => updateFilterField('sortBy', e.target.value)} className="w-full p-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50">
                        <option value="featured">Featured</option><option value="newest">Newest First</option><option value="price-low-high">Price: Low to High</option><option value="price-high-low">Price: High to Low</option><option value="rating">Highest Rated</option>
                    </select>
                </CollapsibleFilterSection>
                
                <CollapsibleFilterSection title="Price Range" sectionKey="price" count={selectedPriceRange !== "all" ? 1 : 0}>
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                        {priceRanges.map((range) => (
                            <button key={range.value} onClick={() => handlePriceRangeSelect(range)} className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${selectedPriceRange === range.value ? 'bg-blue-600 text-white' : 'bg-gray-50 text-gray-700 hover:bg-gray-100'}`}>
                                {range.label}
                            </button>
                        ))}
                    </div>
                </CollapsibleFilterSection>
                
                <CollapsibleFilterSection title="Categories" sectionKey="categories" count={filters.selectedCategories.length}>
                    {collectionCategories.length > 0 ? (
                        <FilterSectionComponent items={collectionCategories} selectedItems={filters.selectedCategories} onToggle={(item) => toggleArrayFilter('selectedCategories', item)} maxVisible={10} />
                    ) : (<p className="text-sm text-gray-500">No categories available</p>)}
                </CollapsibleFilterSection>
                
                <CollapsibleFilterSection title="Brands" sectionKey="brands" count={filters.selectedBrands.length}>
                    <FilterSectionComponent items={availableBrands} selectedItems={filters.selectedBrands} onToggle={(brand) => toggleArrayFilter('selectedBrands', brand)} maxVisible={8} />
                </CollapsibleFilterSection>
                
                <CollapsibleFilterSection title="Sizes" sectionKey="sizes" count={filters.selectedSizes.length}>
                    <FilterSectionComponent items={allSizesList} selectedItems={filters.selectedSizes} onToggle={(size) => toggleArrayFilter('selectedSizes', size)} maxVisible={8} />
                </CollapsibleFilterSection>
                
                <CollapsibleFilterSection title="Colors" sectionKey="colors" count={filters.selectedColors.length}>
                    <FilterSectionComponent items={allColorsList} selectedItems={filters.selectedColors} onToggle={(color) => toggleArrayFilter('selectedColors', color)} maxVisible={10} />
                </CollapsibleFilterSection>
            </div>
            <div className="p-5 border-t bg-gray-50">
                <button onClick={clearAllFilters} className="w-full mb-3 bg-gray-200 text-gray-700 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-300 transition-colors">Clear All Filters ({activeFilterCount})</button>
                <button onClick={() => setShowFilter(false)} className="w-full bg-blue-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">Apply Filters</button>
            </div>
        </div>
    );

    if (loading) {
        return (<div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div></div>);
    }

    const getTitle = () => {
        const titles = { 'men': "Men", 'women': "Women", 'kids': "Kids", 'all': "All Products", 'new-arrivals': "New Arrivals", 'best-sellers': "Best Sellers", 'sale': "Sale" };
        return titles[collection] || "Collection";
    };

    const getSubtitle = () => {
        if (collection === 'men') return "Complete men's fashion collection";
        if (collection === 'women') return "Complete women's fashion collection";
        if (collection === 'kids') return "Complete kids' fashion collection";
        return "Discover our premium collection";
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="bg-white border-b"><div className="container mx-auto px-4 py-3"><div className="flex items-center gap-2 text-sm"><Link to="/" className="text-gray-500 hover:text-gray-700 flex items-center gap-1"><Home size={14} /> Home</Link><span className="text-gray-400">/</span><span className="text-gray-900 font-medium">{getTitle()}</span></div></div></div>
            <div className="bg-gradient-to-r from-gray-900 to-gray-800 text-white py-8"><div className="container mx-auto px-4 text-center"><h1 className="text-2xl md:text-3xl font-bold mb-1">{getTitle()} Collection</h1><p className="text-gray-300 text-sm">{getSubtitle()}</p><p className="text-blue-400 text-xs mt-1">{filteredProducts.length} products</p></div></div>
            <div className="container mx-auto px-4 py-6">
                <div className="flex flex-col">
                    <div className="mb-4"><div className="flex gap-2"><div className="flex-1 relative"><Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" /><input type="text" placeholder="Search products..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />{searchQuery && (<button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"><X size={14} /></button>)}</div><button onClick={() => setShowFilter(true)} className="flex items-center gap-2 bg-gray-900 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"><Filter size={14} /> Filters{activeFilterCount > 0 && <span className="bg-orange-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center ml-1">{activeFilterCount}</span>}</button></div></div>
                    <div className="flex justify-between items-center mb-3"><div className="text-xs text-gray-500">{filteredProducts.length} products found</div><select value={filters.sortBy} onChange={(e) => updateFilterField('sortBy', e.target.value)} className="p-1.5 border rounded-lg text-xs bg-white w-36"><option value="featured">Featured</option><option value="newest">Newest First</option><option value="price-low-high">Price: Low to High</option><option value="price-high-low">Price: High to Low</option><option value="rating">Top Rated</option></select></div>
                    {filteredProducts.length === 0 ? (<div className="text-center py-12 bg-white rounded-lg"><ShoppingBag className="h-12 w-12 text-gray-400 mx-auto mb-3" /><h3 className="text-lg font-semibold text-gray-600">No products found</h3><button onClick={clearAllFilters} className="mt-4 bg-gray-900 text-white px-4 py-2 rounded-lg text-sm hover:bg-gray-700 transition-colors">Clear All Filters ({activeFilterCount})</button></div>) : (<div className="grid grid-cols-2 lg:grid-cols-3 gap-4">{filteredProducts.map((product, index) => (<ProductCard key={product.id || index} product={product} />))}</div>)}
                </div>
            </div>
            <AnimatePresence>{showFilter && (<><div className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={() => setShowFilter(false)} /><motion.div initial={{ x: "100%", opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: "100%", opacity: 0 }} transition={{ type: "spring", damping: 25 }} className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white z-50 shadow-2xl flex flex-col"><FilterSidebar /></motion.div></>)}</AnimatePresence>
            <AnimatePresence>{selectedProduct && (<ProductModal product={selectedProduct} onClose={() => { setSelectedProduct(null); setSelectedColor(""); setSelectedSize(""); setCurrentMainImage(""); setQuantity(1); }} />)}</AnimatePresence>
        </div>
    );
};

export default CollectionPage;