// src/components/Layout/Header.jsx
import { Link, useNavigate } from "react-router-dom";
import { useSite } from "../../context/SiteContext";
import SearchBar from "../Common/SearchBar";
import { useState, useEffect } from "react";
import { 
    FiMenu, 
    FiX, 
    FiSearch, 
    FiShoppingBag, 
    FiHeart, 
    FiUser,
    FiLogIn,
    FiUserPlus,
    FiChevronDown,
    FiPhone,
    FiMail
} from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import { useCart } from "../../context/CartContext";
import useFavorites from "../../hooks/useFavorites";

const Header = () => {
    const { siteInfo } = useSite();
    const navigate = useNavigate();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [user, setUser] = useState(null);
    const [scrolled, setScrolled] = useState(false);
    const [logoImage, setLogoImage] = useState(null);
    
    const { cartItems } = useCart();
    const { favorites } = useFavorites();
    
    const siteName = siteInfo?.siteName || "Zamed";
    const sitePhone = siteInfo?.sitePhone || "+94 77 061 6154";
    const siteEmail = siteInfo?.siteEmail || "support@zamed.com";

    // ============================================================
    // FIX: Load logo directly from localStorage (Cloudinary URL)
    // ============================================================
    const loadLogo = () => {
        try {
            // 1. Try site_info first
            const siteInfoData = JSON.parse(localStorage.getItem('site_info') || '{}');
            
            // 2. Try site_images
            const siteImages = JSON.parse(localStorage.getItem('site_images') || '{}');
            
            // 3. Try site_settings
            const siteSettings = JSON.parse(localStorage.getItem('site_settings') || '{}');
            
            // Get logo from any source - prioritize Cloudinary URL
            const logo = siteInfoData.logo || 
                        siteImages.logo || 
                        siteSettings.logo || 
                        siteInfo?.logo || 
                        null;
            
            if (logo && typeof logo === 'string' && logo.startsWith('http')) {
                console.log('✅ Logo loaded from localStorage:', logo.substring(0, 50) + '...');
                setLogoImage(logo);
            } else if (logo && typeof logo === 'string' && logo.startsWith('data:')) {
                console.log('✅ Logo loaded as data URL');
                setLogoImage(logo);
            } else {
                console.log('ℹ️ No logo found, using text fallback');
                setLogoImage(null);
            }
        } catch (error) {
            console.warn('Error loading logo:', error);
            setLogoImage(null);
        }
    };

    // Get user from localStorage
    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (userData) {
            try {
                setUser(JSON.parse(userData));
            } catch (e) {
                setUser(null);
            }
        }
        
        const handleAuthChange = () => {
            const updatedUser = localStorage.getItem('user');
            if (updatedUser) {
                try {
                    setUser(JSON.parse(updatedUser));
                } catch (e) {
                    setUser(null);
                }
            } else {
                setUser(null);
            }
        };
        
        // Load logo on mount and when settings change
        loadLogo();
        
        window.addEventListener('authChanged', handleAuthChange);
        window.addEventListener('userUpdated', handleAuthChange);
        window.addEventListener('profileUpdated', handleAuthChange);
        window.addEventListener('logoUpdated', loadLogo);
        window.addEventListener('siteInfoUpdated', loadLogo);
        window.addEventListener('settingsSaved', loadLogo);
        window.addEventListener('storage', loadLogo);
        
        return () => {
            window.removeEventListener('authChanged', handleAuthChange);
            window.removeEventListener('userUpdated', handleAuthChange);
            window.removeEventListener('profileUpdated', handleAuthChange);
            window.removeEventListener('logoUpdated', loadLogo);
            window.removeEventListener('siteInfoUpdated', loadLogo);
            window.removeEventListener('settingsSaved', loadLogo);
            window.removeEventListener('storage', loadLogo);
        };
    }, []);

    // Handle scroll effect
    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 50);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const handleSearch = (query) => {
        if (query && query.trim()) {
            navigate(`/search?q=${encodeURIComponent(query.trim())}`);
            setIsSearchOpen(false);
            setSearchQuery("");
        }
    };

    const toggleMobileMenu = () => {
        setIsMobileMenuOpen(!isMobileMenuOpen);
        if (isSearchOpen) setIsSearchOpen(false);
    };

    const toggleSearch = () => {
        setIsSearchOpen(!isSearchOpen);
        if (isMobileMenuOpen) setIsMobileMenuOpen(false);
    };

    const cartCount = cartItems?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0;
    const favoritesCount = favorites?.length || 0;

    const navItems = [
        { name: "New In", path: "/collections/new-arrivals" },
        { name: "Men", path: "/collections/men" },
        { name: "Women", path: "/collections/women" },
        { name: "Kids", path: "/collections/kids" },
        { name: "Collections", path: "/collections/all" },
    ];

    const handleNavClick = (path) => {
        navigate(path);
        setIsMobileMenuOpen(false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleLogout = () => {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        setUser(null);
        setIsMobileMenuOpen(false);
        window.dispatchEvent(new Event('authChanged'));
        navigate('/');
    };

    return (
        <>
            {/* Main Header */}
            <header 
                className={`sticky top-0 z-50 bg-white transition-all duration-300 ${
                    scrolled ? 'shadow-lg' : 'shadow-sm'
                }`}
            >
                <div className="container mx-auto px-3 sm:px-4">
                    <div className="flex items-center justify-between h-14 sm:h-16 md:h-20">
                        {/* Mobile Menu Button */}
                        <button
                            onClick={toggleMobileMenu}
                            className="lg:hidden p-2 -ml-2 text-gray-700 hover:text-black transition-colors rounded-lg hover:bg-gray-100"
                            aria-label="Toggle menu"
                        >
                            {isMobileMenuOpen ? <FiX size={22} /> : <FiMenu size={22} />}
                        </button>

                        {/* Logo */}
                        <Link 
                            to="/" 
                            className="flex items-center space-x-2 sm:space-x-3 flex-shrink-0"
                            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                        >
                            {logoImage ? (
                                <img 
                                    src={logoImage} 
                                    alt={siteName} 
                                    className="h-8 sm:h-10 md:h-12 w-auto object-contain"
                                    loading="eager"
                                    onError={(e) => {
                                        console.warn('Logo image failed to load on mobile');
                                        e.target.style.display = 'none';
                                        // Show text fallback
                                        const parent = e.target.parentElement;
                                        if (parent) {
                                            const textSpan = document.createElement('span');
                                            textSpan.className = 'text-xl sm:text-2xl md:text-3xl font-bold text-gray-800 tracking-tight';
                                            textSpan.textContent = siteName;
                                            parent.appendChild(textSpan);
                                        }
                                    }}
                                />
                            ) : (
                                <span className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800 tracking-tight">
                                    {siteName}
                                </span>
                            )}
                            <span className="hidden sm:inline text-[10px] sm:text-xs font-light text-gray-400 tracking-widest uppercase border-l border-gray-200 pl-2 sm:pl-3">
                                Premium
                            </span>
                        </Link>

                        {/* Desktop Navigation */}
                        <nav className="hidden lg:flex items-center space-x-1 xl:space-x-2">
                            {navItems.map((item) => (
                                <button
                                    key={item.name}
                                    onClick={() => handleNavClick(item.path)}
                                    className="px-3 xl:px-4 py-2 text-sm font-medium text-gray-700 hover:text-black transition-colors rounded-lg hover:bg-gray-50 relative group"
                                >
                                    {item.name}
                                    <span className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-0 h-0.5 bg-black transition-all duration-300 group-hover:w-1/2" />
                                </button>
                            ))}
                        </nav>

                        {/* Right Section */}
                        <div className="flex items-center space-x-1 sm:space-x-2 md:space-x-3">
                            {/* Search Button (Mobile) */}
                            <button
                                onClick={toggleSearch}
                                className="lg:hidden p-2 text-gray-700 hover:text-black transition-colors rounded-lg hover:bg-gray-100"
                                aria-label="Search"
                            >
                                <FiSearch size={20} />
                            </button>

                            {/* Search Bar (Desktop) */}
                            <div className="hidden lg:block">
                                <SearchBar 
                                    onSearch={handleSearch}
                                    placeholder="Search products..."
                                />
                            </div>

                            {/* Favorites */}
                            <Link
                                to="/profile?tab=wishlist"
                                className="relative p-2 text-gray-700 hover:text-black transition-colors rounded-lg hover:bg-gray-100"
                                aria-label="Wishlist"
                            >
                                <FiHeart size={20} className="sm:w-5 sm:h-5" />
                                {favoritesCount > 0 && (
                                    <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                                        {favoritesCount > 9 ? '9+' : favoritesCount}
                                    </span>
                                )}
                            </Link>

                            {/* Cart */}
                            <Link
                                to="/cart"
                                className="relative p-2 text-gray-700 hover:text-black transition-colors rounded-lg hover:bg-gray-100"
                                aria-label="Cart"
                            >
                                <FiShoppingBag size={20} className="sm:w-5 sm:h-5" />
                                {cartCount > 0 && (
                                    <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-black text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                                        {cartCount > 9 ? '9+' : cartCount}
                                    </span>
                                )}
                            </Link>

                            {/* User Menu (Desktop) */}
                            <div className="hidden md:block">
                                {user ? (
                                    <Link
                                        to="/profile"
                                        className="p-2 text-gray-700 hover:text-black transition-colors rounded-lg hover:bg-gray-100 flex items-center gap-1"
                                    >
                                        <FiUser size={20} className="sm:w-5 sm:h-5" />
                                        <span className="text-xs font-medium hidden xl:inline">
                                            {user.firstName || 'Account'}
                                        </span>
                                    </Link>
                                ) : (
                                    <Link
                                        to="/login"
                                        className="p-2 text-gray-700 hover:text-black transition-colors rounded-lg hover:bg-gray-100"
                                    >
                                        <FiLogIn size={20} className="sm:w-5 sm:h-5" />
                                    </Link>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Mobile Search Overlay */}
                <AnimatePresence>
                    {isSearchOpen && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2 }}
                            className="lg:hidden border-t border-gray-100 bg-white"
                        >
                            <div className="container mx-auto px-4 py-3">
                                <SearchBar 
                                    mobile={true} 
                                    onClose={() => setIsSearchOpen(false)}
                                    onSearch={handleSearch}
                                    placeholder="Search products..."
                                />
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </header>

            {/* Mobile Menu Overlay */}
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-40 bg-black/50 lg:hidden"
                        onClick={toggleMobileMenu}
                    />
                )}
            </AnimatePresence>

            {/* Mobile Menu */}
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <motion.div
                        initial={{ x: '-100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '-100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed top-0 left-0 z-50 w-80 max-w-[85vw] h-full bg-white shadow-2xl lg:hidden overflow-y-auto"
                    >
                        {/* Mobile Menu Header */}
                        <div className="flex items-center justify-between p-4 border-b border-gray-100">
                            <Link 
                                to="/" 
                                className="flex items-center space-x-2"
                                onClick={toggleMobileMenu}
                            >
                                {logoImage ? (
                                    <img 
                                        src={logoImage} 
                                        alt={siteName} 
                                        className="h-8 w-auto object-contain"
                                        onError={(e) => {
                                            e.target.style.display = 'none';
                                        }}
                                    />
                                ) : (
                                    <span className="text-xl font-bold text-gray-800">{siteName}</span>
                                )}
                            </Link>
                            <button
                                onClick={toggleMobileMenu}
                                className="p-2 text-gray-700 hover:text-black transition-colors rounded-lg hover:bg-gray-100"
                            >
                                <FiX size={22} />
                            </button>
                        </div>

                        {/* Mobile User Info */}
                        {user && (
                            <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
                                <p className="text-sm font-medium text-gray-800">
                                    Hello, {user.firstName || 'User'}!
                                </p>
                                <p className="text-xs text-gray-500">{user.email}</p>
                            </div>
                        )}

                        {/* Mobile Navigation */}
                        <nav className="p-4 space-y-1">
                            {navItems.map((item) => (
                                <button
                                    key={item.name}
                                    onClick={() => handleNavClick(item.path)}
                                    className="w-full flex items-center justify-between px-4 py-3 text-gray-700 hover:text-black hover:bg-gray-50 rounded-xl transition-all"
                                >
                                    <span className="font-medium">{item.name}</span>
                                    <FiChevronDown size={16} className="text-gray-400 rotate-[-90deg]" />
                                </button>
                            ))}

                            <div className="border-t border-gray-100 my-4" />

                            <Link
                                to="/profile"
                                onClick={toggleMobileMenu}
                                className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:text-black hover:bg-gray-50 rounded-xl transition-all"
                            >
                                <FiUser size={18} />
                                <span>My Profile</span>
                            </Link>

                            <Link
                                to="/profile?tab=wishlist"
                                onClick={toggleMobileMenu}
                                className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:text-black hover:bg-gray-50 rounded-xl transition-all"
                            >
                                <FiHeart size={18} />
                                <span>Wishlist</span>
                                {favoritesCount > 0 && (
                                    <span className="ml-auto bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                                        {favoritesCount}
                                    </span>
                                )}
                            </Link>

                            <Link
                                to="/cart"
                                onClick={toggleMobileMenu}
                                className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:text-black hover:bg-gray-50 rounded-xl transition-all"
                            >
                                <FiShoppingBag size={18} />
                                <span>Cart</span>
                                {cartCount > 0 && (
                                    <span className="ml-auto bg-black text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                                        {cartCount}
                                    </span>
                                )}
                            </Link>

                            <div className="border-t border-gray-100 my-4" />

                            {user ? (
                                <button
                                    onClick={handleLogout}
                                    className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-xl transition-all"
                                >
                                    <FiLogIn size={18} />
                                    <span>Logout</span>
                                </button>
                            ) : (
                                <>
                                    <Link
                                        to="/login"
                                        onClick={toggleMobileMenu}
                                        className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:text-black hover:bg-gray-50 rounded-xl transition-all"
                                    >
                                        <FiLogIn size={18} />
                                        <span>Login</span>
                                    </Link>
                                    <Link
                                        to="/register"
                                        onClick={toggleMobileMenu}
                                        className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:text-black hover:bg-gray-50 rounded-xl transition-all"
                                    >
                                        <FiUserPlus size={18} />
                                        <span>Register</span>
                                    </Link>
                                </>
                            )}

                            <div className="border-t border-gray-100 my-4" />

                            <div className="px-4 py-3">
                                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Contact</p>
                                <a href={`tel:${sitePhone.replace(/\s/g, '')}`} className="flex items-center gap-2 text-sm text-gray-600 hover:text-black py-1">
                                    <FiPhone size={14} /> {sitePhone}
                                </a>
                                <a href={`mailto:${siteEmail}`} className="flex items-center gap-2 text-sm text-gray-600 hover:text-black py-1">
                                    <FiMail size={14} /> {siteEmail}
                                </a>
                            </div>
                        </nav>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};

export default Header;