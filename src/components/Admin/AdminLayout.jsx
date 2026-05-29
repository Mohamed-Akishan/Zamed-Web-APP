// src/components/Admin/AdminLayout.jsx
import { Outlet, Link, useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { 
    FiPackage, FiUsers, FiShoppingBag, FiSettings, FiLogOut, 
    FiMenu, FiX, FiBarChart2, FiBell, FiTag, FiRefreshCw,
    FiGrid, FiStar, FiCreditCard, FiFileText, FiAlertCircle, FiTrendingUp,
    FiGift, FiMessageSquare, FiDollarSign, FiShield, FiHome, FiSearch,
    FiMoon, FiSun, FiUser, FiActivity, FiClipboard, FiTruck
} from "react-icons/fi";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const AdminLayout = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [adminName, setAdminName] = useState("Admin");
    const [adminRole, setAdminRole] = useState("Administrator");
    const [siteName, setSiteName] = useState("ZAMED");
    const [darkMode, setDarkMode] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [showSearch, setShowSearch] = useState(false);
    const [loading, setLoading] = useState(true);
    const [isMobile, setIsMobile] = useState(false);
    const [adminData, setAdminData] = useState(null);
    const location = useLocation();
    const navigate = useNavigate();
    
    const adminPanelName = "ZAMED Admin";
    const adminPanelSubtitle = "Management Dashboard";

    // Check if mobile
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
            if (window.innerWidth >= 768) {
                setIsMobileSidebarOpen(false);
                setIsSidebarOpen(true);
            } else {
                setIsSidebarOpen(false);
            }
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const menuItems = [
        { path: "/admin/dashboard", icon: FiBarChart2, label: "Dashboard", roles: ["super_admin", "admin", "editor", "viewer"] },
        { path: "/admin/products", icon: FiPackage, label: "Products", roles: ["super_admin", "admin", "editor"] },
        { path: "/admin/categories", icon: FiGrid, label: "Categories", roles: ["super_admin", "admin", "editor"] },
        { path: "/admin/orders", icon: FiShoppingBag, label: "Orders", roles: ["super_admin", "admin", "editor"] },
        { path: "/admin/customers", icon: FiUsers, label: "Customers", roles: ["super_admin", "admin"] },
        { path: "/admin/inventory", icon: FiClipboard, label: "Inventory", roles: ["super_admin", "admin", "editor"] },
        { path: "/admin/coupons", icon: FiGift, label: "Coupons", roles: ["super_admin", "admin"] },
        { path: "/admin/reviews", icon: FiStar, label: "Reviews", roles: ["super_admin", "admin", "editor"] },
        { path: "/admin/payments", icon: FiCreditCard, label: "Payments", roles: ["super_admin", "admin"] },
        { path: "/admin/reports", icon: FiFileText, label: "Reports", roles: ["super_admin", "admin"] },
        { path: "/admin/admins", icon: FiUsers, label: "Admin Users", roles: ["super_admin"] },
        { path: "/admin/settings", icon: FiSettings, label: "Settings", roles: ["super_admin", "admin"] },
    ];

    const getToken = () => localStorage.getItem('token');
    const currentAdmin = JSON.parse(localStorage.getItem('admin') || '{}');
    const filteredMenuItems = menuItems.filter(item => 
        item.roles.includes(currentAdmin.role || 'viewer')
    );

    useEffect(() => {
        setIsMobileSidebarOpen(false);
    }, [location.pathname]);

    useEffect(() => {
        const checkAuth = async () => {
            const adminData = localStorage.getItem('admin');
            const token = getToken();
            
            if (!adminData) {
                navigate('/admin/login');
                return;
            }
            
            if (token) {
                try {
                    const response = await fetch(`${API_URL}/auth/me`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (response.ok) {
                        const data = await response.json();
                        if (data.success) {
                            const admin = data.user;
                            setAdminName(`${admin.firstName} ${admin.lastName}`);
                            setAdminRole(admin.role === 'super_admin' ? 'Super Admin' : 
                                        admin.role === 'admin' ? 'Admin' : 
                                        admin.role === 'editor' ? 'Editor' : 'Viewer');
                            setAdminData(admin);
                        }
                    }
                } catch (error) {
                    const admin = JSON.parse(adminData);
                    setAdminName(admin.name || "Admin");
                    setAdminRole(admin.role === 'super_admin' ? 'Super Admin' : 
                                admin.role === 'admin' ? 'Admin' : 
                                admin.role === 'editor' ? 'Editor' : 'Viewer');
                }
            } else {
                const admin = JSON.parse(adminData);
                setAdminName(admin.name || "Admin");
                setAdminRole(admin.role === 'super_admin' ? 'Super Admin' : 
                            admin.role === 'admin' ? 'Admin' : 
                            admin.role === 'editor' ? 'Editor' : 'Viewer');
            }
            
            setLoading(false);
        };
        
        checkAuth();
        loadSiteName();
        loadNotifications();
        
        const savedTheme = localStorage.getItem('admin_dark_mode');
        if (savedTheme === 'true') {
            setDarkMode(true);
            document.documentElement.classList.add('dark');
        }
        
        const handleProductUpdate = () => {
            loadNotifications();
        };
        
        const handleSettingsUpdate = () => {
            loadSiteName();
        };
        
        window.addEventListener('productsUpdated', handleProductUpdate);
        window.addEventListener('storage', handleProductUpdate);
        window.addEventListener('settingsSaved', handleSettingsUpdate);
        window.addEventListener('adminSettingsSaved', handleSettingsUpdate);
        window.addEventListener('siteInfoUpdated', handleSettingsUpdate);
        
        return () => {
            window.removeEventListener('productsUpdated', handleProductUpdate);
            window.removeEventListener('storage', handleProductUpdate);
            window.removeEventListener('settingsSaved', handleSettingsUpdate);
            window.removeEventListener('adminSettingsSaved', handleSettingsUpdate);
            window.removeEventListener('siteInfoUpdated', handleSettingsUpdate);
        };
    }, [navigate]);

    const loadSiteName = () => {
        const siteInfo = JSON.parse(localStorage.getItem('site_info') || '{}');
        const siteSettings = JSON.parse(localStorage.getItem('site_settings') || '{}');
        const name = siteInfo.siteName || siteSettings.siteName || "ZAMED";
        setSiteName(name);
        document.title = `${name} - Admin Dashboard`;
    };

    const loadNotifications = async () => {
        try {
            const token = getToken();
            if (token) {
                const response = await fetch(`${API_URL}/notifications/admin`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (response.ok) {
                    const data = await response.json();
                    if (data.success) {
                        setNotifications(data.notifications || []);
                        return;
                    }
                }
            }
        } catch (error) {
            console.log("Using local notifications");
        }
        
        const storedNotifs = JSON.parse(localStorage.getItem('admin_notifications') || '[]');
        setNotifications(storedNotifs.slice(0, 10));
    };

    const markAsRead = async (notifId) => {
        try {
            const token = getToken();
            if (token) {
                const response = await fetch(`${API_URL}/notifications/${notifId}/read`, {
                    method: 'PUT',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (response.ok) {
                    setNotifications(notifications.map(n => 
                        n.id === notifId ? { ...n, read: true } : n
                    ));
                    return;
                }
            }
        } catch (error) {
            const updatedNotifs = notifications.map(n => 
                n.id === notifId ? { ...n, read: true } : n
            );
            setNotifications(updatedNotifs);
            localStorage.setItem('admin_notifications', JSON.stringify(updatedNotifs));
        }
    };

    const clearAllNotifications = async () => {
        try {
            const token = getToken();
            if (token) {
                const response = await fetch(`${API_URL}/notifications/clear`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (response.ok) {
                    setNotifications([]);
                    toast.success("All notifications cleared");
                    setShowNotifications(false);
                    return;
                }
            }
        } catch (error) {
            setNotifications([]);
            localStorage.setItem('admin_notifications', JSON.stringify([]));
            toast.success("All notifications cleared");
            setShowNotifications(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('admin');
        localStorage.removeItem('token');
        toast.success("Logged out successfully");
        navigate('/admin/login');
    };

    const forceRefresh = () => {
        loadNotifications();
        loadSiteName();
        window.dispatchEvent(new Event('storage'));
        window.dispatchEvent(new Event('siteInfoUpdated'));
        toast.success("Admin panel refreshed");
    };

    const toggleDarkMode = () => {
        setDarkMode(!darkMode);
        localStorage.setItem('admin_dark_mode', !darkMode);
        document.documentElement.classList.toggle('dark');
    };

    const toggleSidebar = () => {
        if (isMobile) {
            setIsMobileSidebarOpen(!isMobileSidebarOpen);
        } else {
            setIsSidebarOpen(!isSidebarOpen);
        }
    };

    const unreadCount = notifications.filter(n => !n.read).length;

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return "Good morning";
        if (hour < 18) return "Good afternoon";
        return "Good evening";
    };

    const getRoleBadgeColor = () => {
        const role = currentAdmin.role;
        if (role === 'super_admin') return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400";
        if (role === 'admin') return "bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400";
        if (role === 'editor') return "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400";
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    const SidebarContent = () => (
        <div className="h-full flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-800">
                <div>
                    <h1 className="text-lg sm:text-xl font-bold tracking-wide">{adminPanelName}</h1>
                    <p className="text-xs text-gray-400 mt-0.5">{adminPanelSubtitle}</p>
                </div>
                <button onClick={toggleSidebar} className="p-2 rounded-lg hover:bg-gray-800 transition-colors">
                    <FiX size={20} />
                </button>
            </div>
            
            <nav className="flex-1 overflow-y-auto mt-4">
                {filteredMenuItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.path;
                    return (
                        <Link 
                            key={item.path} 
                            to={item.path} 
                            className={`flex items-center px-4 py-3 transition-colors ${
                                isActive 
                                    ? 'bg-blue-600 text-white' 
                                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                            }`}
                        >
                            <Icon size={20} />
                            <span className="ml-3 text-sm">{item.label}</span>
                        </Link>
                    );
                })}
            </nav>
            
            <div className="border-t border-gray-800 pt-4 pb-4">
                <button 
                    onClick={toggleDarkMode}
                    className="w-full flex items-center px-4 py-3 text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
                >
                    {darkMode ? <FiSun size={20} /> : <FiMoon size={20} />}
                    <span className="ml-3 text-sm">{darkMode ? 'Light Mode' : 'Dark Mode'}</span>
                </button>
                
                <button 
                    onClick={handleLogout} 
                    className="w-full flex items-center px-4 py-3 text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
                >
                    <FiLogOut size={20} />
                    <span className="ml-3 text-sm">Logout</span>
                </button>
            </div>
        </div>
    );

    return (
        <div className={`min-h-screen ${darkMode ? 'dark bg-gray-900' : 'bg-gray-100'}`}>
            {/* Desktop Sidebar */}
            {!isMobile && (
                <div className={`fixed inset-y-0 left-0 z-50 bg-gray-900 dark:bg-gray-950 text-white transition-all duration-300 ${isSidebarOpen ? 'w-64' : 'w-20'}`}>
                    {isSidebarOpen ? (
                        <SidebarContent />
                    ) : (
                        <div className="flex flex-col items-center py-4">
                            <button onClick={toggleSidebar} className="p-2 rounded-lg hover:bg-gray-800 transition-colors mb-4">
                                <FiMenu size={20} />
                            </button>
                            {filteredMenuItems.map((item) => {
                                const Icon = item.icon;
                                const isActive = location.pathname === item.path;
                                return (
                                    <Link 
                                        key={item.path} 
                                        to={item.path} 
                                        className={`p-3 rounded-lg transition-colors my-1 ${
                                            isActive 
                                                ? 'bg-blue-600 text-white' 
                                                : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                                        }`}
                                        title={item.label}
                                    >
                                        <Icon size={20} />
                                    </Link>
                                );
                            })}
                            <button onClick={toggleDarkMode} className="p-3 rounded-lg text-gray-300 hover:bg-gray-800 hover:text-white transition-colors my-1">
                                {darkMode ? <FiSun size={20} /> : <FiMoon size={20} />}
                            </button>
                            <button onClick={handleLogout} className="p-3 rounded-lg text-gray-300 hover:bg-gray-800 hover:text-white transition-colors my-1">
                                <FiLogOut size={20} />
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Mobile Sidebar Overlay */}
            {isMobile && isMobileSidebarOpen && (
                <>
                    <div className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={() => setIsMobileSidebarOpen(false)}></div>
                    <div className="fixed inset-y-0 left-0 z-50 w-64 bg-gray-900 dark:bg-gray-950 text-white shadow-xl">
                        <SidebarContent />
                    </div>
                </>
            )}

            {/* Main Content */}
            <div className={`transition-all duration-300 ${!isMobile && isSidebarOpen ? 'ml-64' : !isMobile && !isSidebarOpen ? 'ml-20' : 'ml-0'}`}>
                {/* Top Bar */}
                <div className={`sticky top-0 z-30 ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
                    <div className="flex justify-between items-center px-3 sm:px-6 py-3 sm:py-4">
                        <div className="flex items-center gap-2 sm:gap-3">
                            {isMobile && (
                                <button onClick={toggleSidebar} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                                    <FiMenu size={20} />
                                </button>
                            )}
                            <div className="min-w-0">
                                <h2 className={`text-sm sm:text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-800'} truncate`}>
                                    {getGreeting()}, {adminName}! 
                                    <span className={`text-xs font-normal ml-1 sm:ml-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                        ({adminRole})
                                    </span>
                                </h2>
                                <p className={`text-xs hidden sm:block ${darkMode ? 'text-gray-400' : 'text-gray-500'} truncate`}>
                                    Welcome to {siteName} - Admin Dashboard
                                </p>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-2 sm:gap-4">
                            <button onClick={forceRefresh} className={`p-2 rounded-lg transition-colors ${darkMode ? 'text-gray-400 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'}`}>
                                <FiRefreshCw size={18} className="sm:w-5 sm:h-5" />
                            </button>
                            
                            <div className="relative">
                                <button onClick={() => setShowNotifications(!showNotifications)} className={`relative p-2 rounded-lg transition-colors ${darkMode ? 'text-gray-400 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'}`}>
                                    <FiBell size={18} className="sm:w-5 sm:h-5" />
                                    {unreadCount > 0 && <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>}
                                </button>
                                
                                <AnimatePresence>
                                    {showNotifications && (
                                        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className={`absolute right-0 mt-2 w-72 sm:w-80 rounded-lg shadow-xl border z-50 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                                            <div className={`p-3 border-b flex justify-between items-center ${darkMode ? 'border-gray-700' : ''}`}>
                                                <h3 className={`font-semibold text-sm ${darkMode ? 'text-white' : ''}`}>Notifications</h3>
                                                <button onClick={clearAllNotifications} className="text-xs text-blue-600">Clear All</button>
                                            </div>
                                            <div className="max-h-80 overflow-y-auto">
                                                {notifications.length === 0 ? (
                                                    <div className={`p-4 text-center text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>No notifications</div>
                                                ) : (
                                                    notifications.map((notif) => (
                                                        <div key={notif.id} className={`p-3 border-b cursor-pointer transition-colors ${!notif.read ? darkMode ? 'bg-blue-900/20' : 'bg-blue-50' : ''} ${darkMode ? 'border-gray-700 hover:bg-gray-700' : 'hover:bg-gray-50'}`} onClick={() => markAsRead(notif.id)}>
                                                            <div className="flex gap-2">
                                                                <span className="text-base">{notif.icon || "📢"}</span>
                                                                <div className="flex-1">
                                                                    <p className={`font-medium text-xs sm:text-sm ${darkMode ? 'text-white' : ''}`}>{notif.title}</p>
                                                                    <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{notif.message}</p>
                                                                    <p className={`text-xs mt-1 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>{notif.date}</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                            
                            <div className="relative">
                                <button onClick={() => setShowProfileMenu(!showProfileMenu)} className="flex items-center gap-2 focus:outline-none">
                                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm sm:text-lg">
                                        {adminName.charAt(0).toUpperCase()}
                                    </div>
                                </button>
                                
                                <AnimatePresence>
                                    {showProfileMenu && (
                                        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className={`absolute right-0 mt-2 w-56 rounded-lg shadow-xl border z-50 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                                            <div className={`p-3 border-b ${darkMode ? 'border-gray-700' : ''}`}>
                                                <p className={`font-semibold text-sm ${darkMode ? 'text-white' : ''}`}>{adminName}</p>
                                                <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{currentAdmin.email || 'admin@example.com'}</p>
                                                <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor()}`}>{adminRole}</span>
                                            </div>
                                            <div className="py-1">
                                                <button onClick={() => { setShowProfileMenu(false); navigate('/admin/settings'); }} className={`w-full text-left px-4 py-2 text-sm transition-colors ${darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'}`}>
                                                    <FiUser className="inline mr-2" size={14} /> Profile Settings
                                                </button>
                                                <button onClick={handleLogout} className={`w-full text-left px-4 py-2 text-sm text-red-600 transition-colors ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}>
                                                    <FiLogOut className="inline mr-2" size={14} /> Logout
                                                </button>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>
                    </div>
                    
                    <AnimatePresence>
                        {showSearch && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className={`px-3 sm:px-6 py-2 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                                <div className="relative">
                                    <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                                    <input type="text" placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className={`w-full pl-9 pr-3 py-1.5 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${darkMode ? 'bg-gray-700 text-white border-gray-600' : 'bg-white border-gray-300 border'}`} />
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <div className="p-3 sm:p-6">
                    <Outlet context={{ darkMode, searchQuery }} />
                </div>
            </div>
        </div>
    );
};

export default AdminLayout;