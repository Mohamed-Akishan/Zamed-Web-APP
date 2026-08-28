// src/components/Products/NewArrivals.jsx
import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Star, ShoppingBag, Heart, Sparkles, ArrowRight } from "lucide-react";
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

const NewArrivals = () => {
    const navigate = useNavigate();
    const [newArrivals, setNewArrivals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currencySymbol, setCurrencySymbol] = useState("$");
    const [selectedColor, setSelectedColor] = useState({});
    const [currentImages, setCurrentImages] = useState({});
    const [colorImages, setColorImages] = useState({});
    const [hoveredProduct, setHoveredProduct] = useState(null);
    const [isVisible, setIsVisible] = useState(false);
    const [hoverInterval, setHoverInterval] = useState({});
    const [hoverColorIndex, setHoverColorIndex] = useState({});
    const [settings, setSettings] = useState({
        productsPerRow: 4,
        showProductRatings: true,
        showProductColors: true,
        showProductSizes: true,
        showSaleBadge: true,
        showQuickAdd: true,
        showProductBrand: true
    });

    // ============================================================
    // Drag scroll state
    // ============================================================
    const [isDragging, setIsDragging] = useState(false);
    const [startX, setStartX] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);
    const [dragVelocity, setDragVelocity] = useState(0);
    const [isAutoPlaying, setIsAutoPlaying] = useState(true);
    const velocityRef = useRef(0);
    const lastMoveTimeRef = useRef(0);
    const lastMoveXRef = useRef(0);
    const animationFrameRef = useRef(null);

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

    const fallbackProductImage = getWorkingImage(0);
    const scrollContainerRef = useRef(null);
    const sectionRef = useRef(null);
    const { addToCart } = useCart();
    const isScrollingRef = useRef(false);

    const loadSettings = useCallback(() => {
        try {
            const siteSettings = JSON.parse(localStorage.getItem('site_settings') || '{}');
            const productsPerRow = parseInt(siteSettings.productsPerRow) || 4;
            setSettings(prev => ({
                ...prev,
                ...siteSettings,
                productsPerRow: productsPerRow,
                showProductRatings: siteSettings.showProductRatings !== undefined ? siteSettings.showProductRatings : true,
                showProductColors: siteSettings.showProductColors !== undefined ? siteSettings.showProductColors : true,
                showProductSizes: siteSettings.showProductSizes !== undefined ? siteSettings.showProductSizes : true,
                showSaleBadge: siteSettings.showSaleBadge !== undefined ? siteSettings.showSaleBadge : true,
                showQuickAdd: siteSettings.showQuickAdd !== undefined ? siteSettings.showQuickAdd : true,
                showProductBrand: siteSettings.showProductBrand !== undefined ? siteSettings.showProductBrand : true
            }));
        } catch (error) {
            console.error('Error loading settings:', error);
        }
    }, []);

    useEffect(() => {
        loadSettings();
        const symbols = { USD: "$", EUR: "€", GBP: "£", LKR: "Rs" };
        const siteSettings = JSON.parse(localStorage.getItem('site_settings') || '{}');
        setCurrencySymbol(symbols[siteSettings.currency] || "$");
        
        refreshFavorites(true);
    }, [loadSettings, refreshFavorites]);

    // Listen for favorites updates
    useEffect(() => {
        const handleFavoritesUpdate = () => {
            refreshFavorites(true);
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

    // ============================================================
    // Load new arrivals from MongoDB first, fallback to others
    // ============================================================
    const loadNewArrivals = useCallback(async () => {
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
                        console.log('✅ New arrivals loaded from MongoDB:', products.length);
                    }
                }
            } catch (apiError) {
                console.warn("MongoDB fetch failed for new arrivals:", apiError);
            }

            // ✅ FALLBACK: productService if API failed
            if (!apiSucceeded || products.length === 0) {
                try {
                    const serviceProducts = productService.getAllProducts() || [];
                    if (Array.isArray(serviceProducts) && serviceProducts.length > 0) {
                        products = serviceProducts;
                        console.log('✅ New arrivals loaded from productService:', products.length);
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
                                console.log('✅ New arrivals loaded from localStorage:', key);
                                break;
                            }
                        }
                    } catch (e) {
                        // Continue to next key
                    }
                }
            }

            // ✅ FIX: Filter new arrivals - if none, show some products anyway
            let uniqueProducts = [];
            const seenIds = new Set();
            
            // First try to get products with isNewArrival flag
            products.forEach(product => {
                const productId = String(product.id ?? product._id ?? "");
                if (productId && !seenIds.has(productId) && product.isNewArrival === true) {
                    seenIds.add(productId);
                    uniqueProducts.push({ ...product, id: productId });
                }
            });

            // If no new arrivals, show some products (first 6 after featured)
            if (uniqueProducts.length === 0) {
                console.log('ℹ️ No new arrivals found, showing some products');
                const featuredProducts = products.filter(p => p.isFeatured === true);
                const startIndex = featuredProducts.length > 0 ? featuredProducts.length : 0;
                const fallbackProducts = products.slice(startIndex, startIndex + 6);
                
                fallbackProducts.forEach(product => {
                    const productId = String(product.id ?? product._id ?? "");
                    if (productId && !seenIds.has(productId)) {
                        seenIds.add(productId);
                        uniqueProducts.push({ ...product, id: productId });
                    }
                });
            }

            if (uniqueProducts.length === 0) {
                console.log('ℹ️ No products available for new arrivals');
                setNewArrivals([]);
                setLoading(false);
                return;
            }
            
            const productsWithImages = [];
            const initialImages = {};
            const initialColorImages = {};
            const initialColors = {};
            
            for (const product of uniqueProducts) {
                const loadedProduct = await loadProductImages(product);
                productsWithImages.push({ ...loadedProduct, id: product.id });
                
                initialImages[product.id] = loadedProduct.image || fallbackProductImage;
                initialColorImages[product.id] = loadedProduct.colorImages || {};
                
                if (product.colors && product.colors.length > 0) {
                    initialColors[product.id] = product.colors[0];
                }
            }
            
            setNewArrivals(productsWithImages);
            setCurrentImages(initialImages);
            setColorImages(initialColorImages);
            setSelectedColor(initialColors);
            
        } catch (error) {
            console.error("Error loading new arrivals:", error);
            setNewArrivals([]);
        } finally {
            setLoading(false);
        }
    }, [fallbackProductImage]);

    useEffect(() => {
        loadNewArrivals();
        
        const handleProductsUpdate = () => loadNewArrivals();
        const handleReviewUpdate = () => loadNewArrivals();
        const handleSettingsUpdate = () => {
            loadSettings();
        };
        const handleStorageChange = (e) => {
            if (e.key === 'site_settings') {
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
    }, [loadNewArrivals, loadSettings]);

    // ============================================================
    // DRAG SCROLL - Mouse & Touch Support
    // ============================================================
    const getScrollContainer = () => scrollContainerRef.current;

    const handleDragStart = (e) => {
        const container = getScrollContainer();
        if (!container) return;

        // Stop auto-play while dragging
        setIsAutoPlaying(false);
        
        // Cancel any ongoing velocity animation
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
        }

        setIsDragging(true);
        const clientX = e.type === 'mousedown' ? e.clientX : e.touches[0].clientX;
        setStartX(clientX);
        setScrollLeft(container.scrollLeft);
        setDragVelocity(0);
        velocityRef.current = 0;
        lastMoveTimeRef.current = Date.now();
        lastMoveXRef.current = clientX;

        // Prevent text selection and default behaviors
        container.style.userSelect = 'none';
        container.style.pointerEvents = 'none';
        
        // Prevent page scroll on touch devices
        if (e.type === 'touchstart') {
            e.preventDefault();
        }
    };

    const handleDragMove = (e) => {
        if (!isDragging) return;

        const container = getScrollContainer();
        if (!container) return;

        const clientX = e.type === 'mousemove' ? e.clientX : e.touches[0].clientX;
        const deltaX = clientX - startX;
        const newScrollLeft = scrollLeft - deltaX;
        
        // Calculate velocity for momentum
        const now = Date.now();
        const timeDelta = now - lastMoveTimeRef.current;
        if (timeDelta > 0) {
            const moveDelta = clientX - lastMoveXRef.current;
            velocityRef.current = moveDelta / timeDelta;
            setDragVelocity(velocityRef.current);
        }
        lastMoveTimeRef.current = now;
        lastMoveXRef.current = clientX;

        container.scrollLeft = newScrollLeft;

        // Prevent page scroll on touch devices
        if (e.type === 'touchmove') {
            e.preventDefault();
        }
    };

    const handleDragEnd = (e) => {
        if (!isDragging) return;

        const container = getScrollContainer();
        if (!container) {
            setIsDragging(false);
            return;
        }

        setIsDragging(false);
        container.style.userSelect = '';
        container.style.pointerEvents = '';

        // Apply momentum if velocity is significant
        const velocity = velocityRef.current;
        if (Math.abs(velocity) > 0.2) {
            applyMomentum(velocity);
        } else {
            // Resume auto-play after a short delay
            setTimeout(() => {
                if (newArrivals.length > 3 && isVisible) {
                    setIsAutoPlaying(true);
                }
            }, 3000);
        }
    };

    const applyMomentum = (velocity) => {
        const container = getScrollContainer();
        if (!container) return;

        const momentum = velocity * 25; // Increased for more momentum
        const startScroll = container.scrollLeft;
        const maxScroll = container.scrollWidth - container.clientWidth;
        const target = Math.max(0, Math.min(maxScroll, startScroll + momentum));
        const duration = Math.max(300, Math.min(800, Math.abs(momentum) * 0.8));
        const startTime = performance.now();

        // Cancel any existing animation
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
        }

        const animateMomentum = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(1, elapsed / duration);
            
            // Ease out cubic
            const easeOut = 1 - Math.pow(1 - progress, 3);
            const currentScroll = startScroll + (target - startScroll) * easeOut;
            container.scrollLeft = currentScroll;

            if (progress < 1) {
                animationFrameRef.current = requestAnimationFrame(animateMomentum);
            } else {
                container.scrollLeft = target;
                animationFrameRef.current = null;
                
                // Resume auto-play after momentum ends
                setTimeout(() => {
                    if (newArrivals.length > 3 && isVisible && !isDragging) {
                        setIsAutoPlaying(true);
                    }
                }, 2000);
            }
        };

        animationFrameRef.current = requestAnimationFrame(animateMomentum);
    };

    // Mouse event handlers
    const onMouseDown = (e) => {
        // Only handle left click
        if (e.button !== 0) return;
        handleDragStart(e);
    };

    const onMouseMove = (e) => {
        handleDragMove(e);
    };

    const onMouseUp = (e) => {
        handleDragEnd(e);
    };

    const onMouseLeave = (e) => {
        if (isDragging) {
            handleDragEnd(e);
        }
    };

    // Touch event handlers
    const onTouchStart = (e) => {
        handleDragStart(e);
    };

    const onTouchMove = (e) => {
        handleDragMove(e);
    };

    const onTouchEnd = (e) => {
        handleDragEnd(e);
    };

    // Clean up animation frame
    useEffect(() => {
        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, []);

    // ============================================================
    // Hover cycling through color images
    // ============================================================
    const startHoverCycle = (productId) => {
        stopHoverCycle(productId);
        
        const product = newArrivals.find(p => p.id === productId);
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
                const newImage = colorImgMap[colorName] || currentImages[productId] || fallbackProductImage;
                
                setCurrentImages(prevImages => ({
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
        
        const product = newArrivals.find(p => p.id === productId);
        if (product) {
            const originalColor = selectedColor[productId] || product.colors?.[0];
            if (originalColor) {
                const colorImgMap = colorImages[productId] || {};
                const originalImage = colorImgMap[originalColor] || product.image || fallbackProductImage;
                setCurrentImages(prev => ({
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

    // ============================================================
    // SMOOTH & FAST SCROLLING - FIXED
    // ============================================================
    const scrollToLeft = () => {
        if (scrollContainerRef.current && !isScrollingRef.current) {
            isScrollingRef.current = true;
            const container = scrollContainerRef.current;
            const cardWidth = container.querySelector('.min-w-\\[260px\\]')?.offsetWidth || 280;
            const gap = 20; // gap-5 = 20px
            
            container.scrollBy({
                left: -(cardWidth + gap),
                behavior: 'smooth'
            });
            
            // Resume auto-play after manual scroll
            setIsAutoPlaying(false);
            setTimeout(() => {
                isScrollingRef.current = false;
                if (newArrivals.length > 3 && isVisible) {
                    setIsAutoPlaying(true);
                }
            }, 400);
        }
    };

    const scrollToRight = () => {
        if (scrollContainerRef.current && !isScrollingRef.current) {
            isScrollingRef.current = true;
            const container = scrollContainerRef.current;
            const cardWidth = container.querySelector('.min-w-\\[260px\\]')?.offsetWidth || 280;
            const gap = 20; // gap-5 = 20px
            
            container.scrollBy({
                left: cardWidth + gap,
                behavior: 'smooth'
            });
            
            // Resume auto-play after manual scroll
            setIsAutoPlaying(false);
            setTimeout(() => {
                isScrollingRef.current = false;
                if (newArrivals.length > 3 && isVisible) {
                    setIsAutoPlaying(true);
                }
            }, 400);
        }
    };

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'ArrowLeft') scrollToLeft();
            if (e.key === 'ArrowRight') scrollToRight();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Auto-play scroll - only when not dragging and auto-play is enabled
    useEffect(() => {
        if (newArrivals.length <= 3 || !isVisible || !isAutoPlaying || isDragging) return;
        
        const interval = setInterval(() => {
            if (!isScrollingRef.current && !isDragging) {
                const container = scrollContainerRef.current;
                if (container) {
                    const maxScroll = container.scrollWidth - container.clientWidth;
                    if (container.scrollLeft >= maxScroll - 10) {
                        container.scrollTo({ left: 0, behavior: 'smooth' });
                    } else {
                        scrollToRight();
                    }
                }
            }
        }, 5000);
        
        return () => clearInterval(interval);
    }, [newArrivals.length, isVisible, isAutoPlaying, isDragging]);

    const handleColorClick = (productId, color, e) => {
        e.stopPropagation();
        
        stopHoverCycle(productId);
        setHoveredProduct(null);
        
        setSelectedColor(prev => ({ ...prev, [productId]: color }));
        
        const colorImgMap = colorImages[productId] || {};
        const newImage = colorImgMap[color] || currentImages[productId] || fallbackProductImage;
        
        setCurrentImages(prev => ({
            ...prev,
            [productId]: newImage
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

    const getGridCols = () => {
        const perRow = parseInt(settings.productsPerRow) || 4;
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
            y: -6,
            scale: 1.01,
            boxShadow: "0 24px 55px rgba(49,38,24,0.13)",
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
        <section className="overflow-hidden bg-[#fdfcfb] py-16 md:py-24" ref={sectionRef}>
            <style>{`
                .hide-scrollbar::-webkit-scrollbar { display: none; }
                .hide-scrollbar { scrollbar-width: none; -ms-overflow-style: none; }
                .snap-scroll { scroll-snap-type: x mandatory; }
                .dragging * { cursor: grabbing !important; }
                .dragging .product-card { pointer-events: none; }
            `}</style>
            <div className="mx-auto max-w-[1500px] px-5 sm:px-8 lg:px-12">
                <div className="relative mb-12 text-center md:mb-16">
                    <Sparkles size={22} strokeWidth={1.4} className="mx-auto mb-3 text-[#ad7b2d]" />
                    <h2 className="font-serif text-4xl font-normal tracking-[0.14em] text-[#171717] md:text-6xl">
                        NEW ARRIVALS
                    </h2>
                    <p className="mt-3 text-sm font-light tracking-[0.08em] text-[#77736e] md:text-base">
                        Fresh styles, just landed
                    </p>
                </div>

                {/* Products Grid */}
                <div className="relative">
                    {/* Left Arrow - hidden on mobile */}
                    <button 
                        onClick={scrollToLeft} 
                        aria-label="Previous new arrivals"
                        className="absolute -left-3 top-[42%] z-20 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-[#c39a58] bg-white text-[#a9792e] shadow-lg transition hover:scale-110 hover:shadow-xl md:flex"
                    >
                        <ChevronLeft size={18} className="text-gray-700" />
                    </button>
                    
                    {/* Right Arrow - hidden on mobile */}
                    <button 
                        onClick={scrollToRight} 
                        aria-label="Next new arrivals"
                        className="absolute -right-3 top-[42%] z-20 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-[#c39a58] bg-white text-[#a9792e] shadow-lg transition hover:scale-110 hover:shadow-xl md:flex"
                    >
                        <ChevronRight size={18} className="text-gray-700" />
                    </button>

                    <motion.div 
                        ref={scrollContainerRef} 
                        className={`flex gap-4 sm:gap-5 lg:gap-6 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-4 hide-scrollbar ${isDragging ? 'dragging' : ''}`}
                        variants={containerVariants}
                        initial="hidden"
                        animate={isVisible ? "visible" : "hidden"}
                        key={`newarrivals-${version}`}
                        // Mouse events for drag
                        onMouseDown={onMouseDown}
                        onMouseMove={onMouseMove}
                        onMouseUp={onMouseUp}
                        onMouseLeave={onMouseLeave}
                        // Touch events for mobile
                        onTouchStart={onTouchStart}
                        onTouchMove={onTouchMove}
                        onTouchEnd={onTouchEnd}
                        // Cursor style
                        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
                    >
                        {newArrivals.map((product) => {
                            const currentImage = currentImages[product.id] || product.image || fallbackProductImage;
                            const currentColorName = selectedColor[product.id] || product.colors?.[0];
                            const isFavorite = isFavorited(product.id);
                            const productRating = product.rating || 0;
                            const productReviews = Array.isArray(product.reviews) ? product.reviews.length : Number(product.reviews || 0);
                            const isHovered = hoveredProduct === product.id;
                            const colorImageMap = colorImages[product.id] || {};
                            
                            return (
                                <motion.div 
                                    key={product.id} 
                                    variants={itemVariants}
                                    whileHover="hover"
                                    onHoverStart={() => handleMouseEnter(product.id)}
                                    onHoverEnd={() => handleMouseLeave(product.id)}
                                    className="product-card min-w-[230px] sm:min-w-[260px] lg:min-w-[300px] snap-start group cursor-pointer overflow-hidden rounded-2xl border border-[#eeeae4] bg-white shadow-[0_8px_28px_rgba(35,29,21,0.08)] transition-shadow hover:shadow-xl"
                                    onClick={() => handleProductClick(product.id)}
                                >
                                    {/* Product Image */}
                                    <div className="relative aspect-[3/4] overflow-hidden bg-[#faf8f5]">
                                        <img 
                                            src={currentImage} 
                                            alt={product.name} 
                                            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.035]"
                                            onError={(e) => {
                                                e.currentTarget.onerror = null;
                                                e.currentTarget.src = fallbackProductImage;
                                            }}
                                            draggable={false}
                                        />
                                        
                                        {/* Wishlist Heart Button */}
                                        <button
                                            type="button"
                                            aria-label={isFavorite ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`}
                                            onClick={(e) => handleToggleFavorite(product, e)}
                                            className="absolute right-3 top-3 z-10 flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full bg-white/95 shadow-md backdrop-blur transition hover:scale-110"
                                        >
                                            <Heart 
                                                size={17}
                                                strokeWidth={1.8}
                                                className={isFavorite ? "fill-current text-red-500" : "text-[#292929]"}
                                            />
                                        </button>

                                        {/* Quick Add Button - appears on hover (desktop only) */}
                                        <button
                                            type="button"
                                            onClick={(e) => handleAddToCart(product, e)}
                                            className="absolute bottom-3 sm:bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full border border-[#b98a43] bg-white px-4 sm:px-5 py-1.5 sm:py-2 text-xs font-semibold tracking-wide text-[#25221e] shadow-lg transition-all duration-300 md:translate-y-3 md:opacity-0 md:group-hover:translate-y-0 md:group-hover:opacity-100"
                                        >
                                            <ShoppingBag size={13} strokeWidth={1.7} />
                                            Quick Add
                                        </button>
                                    </div>
                                    
                                    {/* Product Info */}
                                    <div className="p-3 sm:p-4 lg:p-5">
                                        {settings.showProductBrand && product.brand && (
                                            <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#a9792e]">
                                                {product.brand}
                                            </p>
                                        )}
                                        <h3 className="truncate font-serif text-sm sm:text-base lg:text-lg font-medium text-[#24211e]">
                                            {product.name}
                                        </h3>
                                        
                                        {settings.showProductRatings && (
                                            <div className="mt-1.5 flex items-center gap-2">
                                                <div className="flex items-center gap-0.5">
                                                    {[1, 2, 3, 4, 5].map((star) => (
                                                        <Star 
                                                            key={star} 
                                                            size={11} 
                                                            className={`${
                                                                star <= Math.round(productRating)
                                                                    ? 'fill-current text-[#b1843d]'
                                                                    : 'text-[#dedbd6]'
                                                            }`}
                                                        />
                                                    ))}
                                                </div>
                                                {productReviews > 0 && (
                                                    <span className="text-[10px] text-gray-400">
                                                        ({productReviews})
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                        
                                        <div className="mt-2 flex items-center justify-between gap-3">
                                            <span className="text-base sm:text-lg font-semibold text-[#1f1d1a]">
                                                {currencySymbol}{Number(product.price || 0).toFixed(2)}
                                            </span>
                                            {settings.showSaleBadge && product.originalPrice && (
                                                <span className="text-[10px] text-[#a09c96] line-through">
                                                    {currencySymbol}{Number(product.originalPrice || 0).toFixed(2)}
                                                </span>
                                            )}
                                        </div>
                                        {settings.showProductColors && product.colors?.length > 0 && (
                                            <div className="mt-3 flex items-center gap-1.5 flex-wrap">
                                                {product.colors.slice(0, 4).map((color) => (
                                                    <button
                                                        type="button"
                                                        key={color}
                                                        aria-label={`Choose ${color}`}
                                                        onClick={(e) => handleColorClick(product.id, color, e)}
                                                        className={`h-5 w-5 sm:h-6 sm:w-6 rounded-full border-2 p-0.5 transition hover:scale-110 ${currentColorName === color ? 'border-[#b1843d]' : 'border-[#ddd8d0]'}`}
                                                    >
                                                        <span className="block h-full w-full rounded-full border border-black/5" style={{ backgroundColor: color.toLowerCase() }} />
                                                    </button>
                                                ))}
                                                {product.colors.length > 4 && <span className="text-[10px] text-[#817c75]">+{product.colors.length - 4}</span>}
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            );
                        })}
                    </motion.div>
                </div>

                {/* View All Button */}
                <div className="mt-12 text-center">
                    <button 
                        onClick={() => {
                            navigate('/collections/all');
                            setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 100);
                        }}
                        className="inline-flex items-center gap-3 rounded-full border border-[#b98a43] bg-white px-6 sm:px-8 py-2.5 sm:py-3 text-xs sm:text-sm font-medium text-[#76531f] shadow-sm transition hover:bg-[#b98a43] hover:text-white"
                    >
                        View All New Arrivals
                        <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                </div>
            </div>
        </section>
    );
};

export default NewArrivals;