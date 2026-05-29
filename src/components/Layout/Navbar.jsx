import { Link, useLocation, useNavigate } from "react-router-dom";
import { User, ShoppingBag, Menu, X } from "lucide-react";
import SearchBar from "../Common/SearchBar";
import CartDrawer from "../Cart/CartDrawer";
import { useState, useEffect } from "react";
import { useCart } from "../../context/CartContext";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

const Navbar = () => {
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [navDrawerOpen, setNavDrawerOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();
    const { getCartItemsCount } = useCart();
    
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [userName, setUserName] = useState("");
    const [siteName, setSiteName] = useState("Zamed");
    const [siteLogo, setSiteLogo] = useState(null);
    const [currencySymbol, setCurrencySymbol] = useState("$");

    const scrollToTop = () => {
        window.scrollTo({
            top: 0,
            left: 0,
            behavior: 'smooth'
        });
    };

    const handleLogoClick = () => {
        scrollToTop();
        if (location.pathname !== '/') {
            navigate('/');
        }
    };

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 20);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        scrollToTop();
    }, [location.pathname]);

    const loadData = () => {
        const siteInfo = JSON.parse(localStorage.getItem('site_info') || '{}');
        const settings = JSON.parse(localStorage.getItem('site_settings') || '{}');
        const merged = { ...siteInfo, ...settings };
        
        if (merged.siteName) setSiteName(merged.siteName);
        if (merged.logo) setSiteLogo(merged.logo);
        else if (merged.footerLogo) setSiteLogo(merged.footerLogo);
        
        const symbols = { USD: "$", EUR: "€", GBP: "£", LKR: "Rs" };
        setCurrencySymbol(symbols[merged.currency] || "$");
        
        const user = localStorage.getItem('user');
        if (user) {
            const userData = JSON.parse(user);
            setIsLoggedIn(true);
            setUserName(userData.firstName || userData.email?.split('@')[0] || "User");
        } else {
            setIsLoggedIn(false);
        }
    };

    useEffect(() => {
        loadData();
        
        const handleUpdate = () => {
            loadData();
        };
        
        window.addEventListener('storage', handleUpdate);
        window.addEventListener('siteInfoUpdated', handleUpdate);
        window.addEventListener('settingsSaved', handleUpdate);
        window.addEventListener('adminSettingsSaved', handleUpdate);
        
        return () => {
            window.removeEventListener('storage', handleUpdate);
            window.removeEventListener('siteInfoUpdated', handleUpdate);
            window.removeEventListener('settingsSaved', handleUpdate);
            window.removeEventListener('adminSettingsSaved', handleUpdate);
        };
    }, []);

    const toggleNavDrawer = () => setNavDrawerOpen(!navDrawerOpen);
    const toggleCartDrawer = () => setDrawerOpen(!drawerOpen);

    const isActiveLink = (path) => {
        if (path === "/") return location.pathname === "/";
        return location.pathname === path || location.pathname.startsWith(path);
    };

    const mainCategories = [
        { name: "Home", path: "/" },
        { name: "Shop", path: "/collections/all" },
        { name: "Men", path: "/collections/men" },
        { name: "Women", path: "/collections/women" },
        { name: "Kids", path: "/collections/kids" }
    ];

    const renderLogo = () => {
        if (siteLogo) {
            return (
                <div className="flex items-center gap-3 cursor-pointer group" onClick={handleLogoClick}>
                    <img 
                        src={siteLogo} 
                        alt={siteName} 
                        className="h-12 w-auto object-contain transition-transform duration-300 group-hover:scale-105" 
                    />
                    <div className="hidden sm:block">
                        <span className="text-lg font-bold text-gray-800 tracking-tight">{siteName}</span>
                        <div className="h-0.5 w-full bg-gradient-to-r from-orange-400 to-red-500"></div>
                    </div>
                </div>
            );
        }
        return (
            <div className="flex items-center gap-2 cursor-pointer group" onClick={handleLogoClick}>
                <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg transition-transform duration-300 group-hover:scale-105">
                    <span className="text-white font-bold text-xl">{siteName.charAt(0).toUpperCase()}</span>
                </div>
                <div>
                    <span className="text-xl font-bold text-gray-800 tracking-tight">{siteName}</span>
                    <div className="h-0.5 w-full bg-gradient-to-r from-orange-400 to-red-500"></div>
                </div>
            </div>
        );
    };

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return "Good morning";
        if (hour < 18) return "Good afternoon";
        return "Good evening";
    };

    return (
        <>
            <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
                scrolled 
                    ? 'bg-white/95 backdrop-blur-xl shadow-lg py-3' 
                    : 'bg-white shadow-md py-4'
            }`}>
                <div className="container mx-auto px-4 lg:px-6">
                    <div className="flex items-center justify-between">
                        <div className="flex-shrink-0">
                            {renderLogo()}
                        </div>

                        <div className="hidden lg:flex items-center justify-center space-x-6">
                            {mainCategories.map((category) => (
                                <Link 
                                    key={category.path} 
                                    to={category.path}
                                    onClick={scrollToTop}
                                    className={`relative px-3 py-2 text-sm font-medium tracking-wide transition-all duration-300 ${
                                        isActiveLink(category.path) 
                                            ? 'text-orange-500' 
                                            : 'text-gray-600 hover:text-orange-500'
                                    }`}
                                >
                                    {category.name}
                                    {isActiveLink(category.path) && (
                                        <motion.div 
                                            layoutId="activeIndicator"
                                            className="absolute -bottom-0.5 left-0 right-0 h-0.5 bg-gradient-to-r from-orange-400 via-red-500 to-pink-500 rounded-full"
                                        />
                                    )}
                                </Link>
                            ))}
                        </div>

                        <div className="flex items-center space-x-3 flex-shrink-0">
                            {/* Search Bar */}
                            <div className="hidden md:block">
                                <SearchBar />
                            </div>

                            {/* User/Login Button */}
                            <Link 
                                to={isLoggedIn ? "/profile" : "/login"} 
                                onClick={scrollToTop}
                                className="p-2 rounded-xl bg-gray-100 hover:bg-gradient-to-r hover:from-orange-500/10 hover:to-red-500/10 transition-all group"
                            >
                                <User className="h-5 w-5 text-gray-600 group-hover:text-orange-500 transition-colors" />
                            </Link>

                            {/* Cart Button */}
                            <button 
                                onClick={toggleCartDrawer} 
                                className="relative p-2 rounded-xl bg-gray-100 hover:bg-gradient-to-r hover:from-orange-500/10 hover:to-red-500/10 transition-all group"
                            >
                                <ShoppingBag className="h-5 w-5 text-gray-600 group-hover:text-orange-500 transition-colors" />
                                {getCartItemsCount() > 0 && (
                                    <motion.span 
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        className="absolute -top-1 -right-1 bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold"
                                    >
                                        {getCartItemsCount()}
                                    </motion.span>
                                )}
                            </button>

                            {/* Mobile Menu Button */}
                            <button 
                                onClick={toggleNavDrawer} 
                                className="lg:hidden p-2 rounded-xl bg-gray-100 hover:bg-gray-200 transition-all"
                            >
                                <Menu className="h-5 w-5 text-gray-600" />
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            <div className="h-16" />

            <CartDrawer drawerOpen={drawerOpen} toggleCartDrawer={toggleCartDrawer} />

            <AnimatePresence>
                {navDrawerOpen && (
                    <>
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" 
                            onClick={toggleNavDrawer} 
                        />
                        <motion.div 
                            className="fixed top-0 left-0 w-4/5 max-w-sm h-full bg-white z-50 shadow-2xl overflow-y-auto"
                            initial={{ x: "-100%" }} 
                            animate={{ x: 0 }} 
                            exit={{ x: "-100%" }} 
                            transition={{ type: "spring", damping: 25 }}
                        >
                            <div className="flex justify-between items-center p-5 border-b border-gray-200">
                                <div onClick={() => { 
                                    toggleNavDrawer(); 
                                    handleLogoClick(); 
                                }} className="cursor-pointer">
                                    {siteLogo ? (
                                        <div className="flex items-center gap-3">
                                            <img src={siteLogo} alt={siteName} className="h-10 w-auto object-contain" />
                                            <span className="text-lg font-bold text-gray-800">{siteName}</span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2">
                                            <div className="w-9 h-9 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center">
                                                <span className="text-white font-bold text-lg">{siteName.charAt(0).toUpperCase()}</span>
                                            </div>
                                            <span className="text-xl font-bold text-gray-800">{siteName}</span>
                                        </div>
                                    )}
                                </div>
                                <button 
                                    onClick={toggleNavDrawer} 
                                    className="p-2 hover:bg-gray-100 rounded-xl transition-all"
                                >
                                    <X className="h-6 w-6 text-gray-500" />
                                </button>
                            </div>

                            <div className="flex flex-col p-5 space-y-2">
                                {mainCategories.map((category) => (
                                    <Link 
                                        key={category.path} 
                                        to={category.path} 
                                        onClick={() => {
                                            toggleNavDrawer();
                                            scrollToTop();
                                        }}
                                        className={`block py-3 px-4 rounded-xl transition-all ${
                                            isActiveLink(category.path) 
                                                ? 'bg-gradient-to-r from-orange-500/20 to-red-500/20 text-orange-500 font-semibold' 
                                                : 'text-gray-700 hover:bg-gray-100'
                                        }`}
                                    >
                                        {category.name}
                                    </Link>
                                ))}
                                
                                <div className="h-px bg-gray-200 my-3"></div>
                                
                                {isLoggedIn ? (
                                    <>
                                        <div className="px-4 py-3 bg-gradient-to-r from-orange-500/10 to-red-500/10 rounded-xl mb-3">
                                            <p className="text-xs text-gray-500">{getGreeting()},</p>
                                            <p className="text-lg font-semibold text-orange-500">{userName}</p>
                                        </div>
                                        <Link 
                                            to="/profile" 
                                            className="block py-3 px-4 text-gray-700 hover:bg-gray-100 rounded-xl transition-all" 
                                            onClick={() => {
                                                toggleNavDrawer();
                                                scrollToTop();
                                            }}
                                        >
                                            My Profile
                                        </Link>
                                        <Link 
                                            to="/profile?tab=orders" 
                                            className="block py-3 px-4 text-gray-700 hover:bg-gray-100 rounded-xl transition-all" 
                                            onClick={() => {
                                                toggleNavDrawer();
                                                scrollToTop();
                                            }}
                                        >
                                            My Orders
                                        </Link>
                                        <Link 
                                            to="/profile?tab=wishlist" 
                                            className="block py-3 px-4 text-gray-700 hover:bg-gray-100 rounded-xl transition-all" 
                                            onClick={() => {
                                                toggleNavDrawer();
                                                scrollToTop();
                                            }}
                                        >
                                            My Wishlist
                                        </Link>
                                        <button 
                                            onClick={() => { 
                                                localStorage.removeItem('user'); 
                                                setIsLoggedIn(false); 
                                                toggleNavDrawer(); 
                                                scrollToTop();
                                                navigate('/');
                                                toast.success("Logged out successfully");
                                            }} 
                                            className="block w-full text-left py-3 px-4 text-red-500 hover:bg-red-50 rounded-xl transition-all mt-2"
                                        >
                                            Logout
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <Link 
                                            to="/login" 
                                            className="block py-3 px-4 text-center bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl font-semibold hover:from-orange-600 hover:to-red-600 transition-all" 
                                            onClick={() => {
                                                toggleNavDrawer();
                                                scrollToTop();
                                            }}
                                        >
                                            Login
                                        </Link>
                                        <Link 
                                            to="/register" 
                                            className="block py-3 px-4 text-center border border-gray-300 text-gray-700 rounded-xl hover:border-orange-500 hover:text-orange-500 transition-all" 
                                            onClick={() => {
                                                toggleNavDrawer();
                                                scrollToTop();
                                            }}
                                        >
                                            Register
                                        </Link>
                                    </>
                                )}
                                
                                <div className="mt-4 pt-4 border-t border-gray-200">
                                    <p className="text-xs text-gray-500 mb-2">Search Products</p>
                                    <SearchBar mobile={true} />
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
};

export default Navbar;