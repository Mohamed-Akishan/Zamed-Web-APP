// src/components/Admin/AdminLayout.jsx
import { Outlet, Link, useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect, useMemo, useRef } from "react";
import {
    FiPackage,
    FiUsers,
    FiShoppingBag,
    FiSettings,
    FiLogOut,
    FiMenu,
    FiX,
    FiBarChart2,
    FiBell,
    FiRefreshCw,
    FiGrid,
    FiStar,
    FiCreditCard,
    FiFileText,
    FiGift,
    FiMessageSquare,
    FiSearch,
    FiMoon,
    FiSun,
    FiUser,
    FiClipboard,
    FiCheck,
    FiCheckCircle,
    FiAlertTriangle,
    FiChevronRight,
    FiClock,
    FiMail,
    FiEye,
    FiTrash2,
    FiExternalLink,
    FiShield
} from "react-icons/fi";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

const API_URL = (() => {
    const envUrl = import.meta.env.VITE_API_URL?.trim();
    const fallbackUrl =
        window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1"
            ? "http://localhost:5000/api"
            : "https://zamed-backend-1.onrender.com/api";

    if (!envUrl) return fallbackUrl;

    const normalizedUrl = envUrl.replace(/\/+$|\s+$/g, "");
    return normalizedUrl.endsWith("/api") ? normalizedUrl : `${normalizedUrl}/api`;
})();

const LOCAL_NOTIFICATION_KEY = "admin_notifications";
const READ_NOTIFICATION_KEY = "admin_notification_read_ids";
const CUSTOMER_MESSAGE_KEY = "zamed_contact_messages";

const safeJSON = (value, fallback) => {
    try {
        return JSON.parse(value || JSON.stringify(fallback));
    } catch {
        return fallback;
    }
};

const parseNumber = (value) => {
    if (typeof value === "number") {
        return Number.isFinite(value) ? value : 0;
    }

    if (typeof value === "string") {
        const parsed = Number(value.replace(/[^0-9.-]/g, ""));
        return Number.isFinite(parsed) ? parsed : 0;
    }

    return 0;
};

const normalizeDate = (value) => {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
};

const formatNotificationDate = (value) => {
    const date = normalizeDate(value);

    if (!date) return "Just now";

    const diff = Date.now() - date.getTime();
    const minute = 60 * 1000;
    const hour = 60 * minute;
    const day = 24 * hour;

    if (diff < minute) return "Just now";
    if (diff < hour) return `${Math.floor(diff / minute)}m ago`;
    if (diff < day) return `${Math.floor(diff / hour)}h ago`;
    if (diff < day * 7) return `${Math.floor(diff / day)}d ago`;

    return date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    });
};

const getProductImage = (product = {}) => {
    const candidate =
        product.image ||
        product.thumbnail ||
        product.mainImage ||
        product.coverImage ||
        product.images?.[0] ||
        product.gallery?.[0] ||
        product.variants?.[0]?.image ||
        product.variants?.[0]?.images?.[0];

    if (typeof candidate === "string") return candidate;

    if (candidate && typeof candidate === "object") {
        return candidate.url || candidate.src || candidate.data || null;
    }

    return null;
};

const getProductStock = (product = {}) => {
    const directCandidates = [
        product.stock,
        product.quantity,
        product.inventory,
        product.stockQuantity,
        product.availableStock
    ];

    for (const value of directCandidates) {
        if (value !== undefined && value !== null && value !== "") {
            return parseNumber(value);
        }
    }

    if (Array.isArray(product.variants) && product.variants.length) {
        return product.variants.reduce(
            (sum, variant) =>
                sum +
                parseNumber(
                    variant.stock ??
                    variant.quantity ??
                    variant.inventory ??
                    variant.stockQuantity
                ),
            0
        );
    }

    return 0;
};

const getProductId = (product = {}, index = 0) =>
    product._id ||
    product.id ||
    product.productId ||
    product.slug ||
    `product-${index}`;

const AdminLayout = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [notificationFilter, setNotificationFilter] = useState("all");
    const [adminName, setAdminName] = useState("Admin");
    const [adminRole, setAdminRole] = useState("Administrator");
    const [siteName, setSiteName] = useState("ZAMED");
    const [darkMode, setDarkMode] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [loading, setLoading] = useState(true);
    const [isMobile, setIsMobile] = useState(false);

    const location = useLocation();
    const navigate = useNavigate();
    const notificationRef = useRef(null);
    const profileRef = useRef(null);

    const adminPanelName = "ZAMED Admin";
    const adminPanelSubtitle = "Management Dashboard";

    const menuItems = [
        { path: "/admin/dashboard", icon: FiBarChart2, label: "Dashboard", roles: ["super_admin", "admin", "editor", "viewer"] },
        { path: "/admin/products", icon: FiPackage, label: "Products", roles: ["super_admin", "admin", "editor"] },
        { path: "/admin/categories", icon: FiGrid, label: "Categories", roles: ["super_admin", "admin", "editor"] },
        { path: "/admin/orders", icon: FiShoppingBag, label: "Orders", roles: ["super_admin", "admin", "editor"] },
        { path: "/admin/returns", icon: FiShield, label: "Returns", roles: ["super_admin", "admin"] },
        { path: "/admin/customers", icon: FiUsers, label: "Customers", roles: ["super_admin", "admin"] },
        { path: "/admin/inventory", icon: FiClipboard, label: "Inventory", roles: ["super_admin", "admin", "editor"] },
        { path: "/admin/coupons", icon: FiGift, label: "Coupons", roles: ["super_admin", "admin"] },
        { path: "/admin/reviews", icon: FiStar, label: "Reviews", roles: ["super_admin", "admin", "editor"] },
        { path: "/admin/payments", icon: FiCreditCard, label: "Payments", roles: ["super_admin", "admin"] },
        { path: "/admin/reports", icon: FiFileText, label: "Reports", roles: ["super_admin", "admin"] },
        { path: "/admin/admins", icon: FiUsers, label: "Admin Users", roles: ["super_admin"] },
        { path: "/admin/settings", icon: FiSettings, label: "Settings", roles: ["super_admin", "admin"] }
    ];

    const getToken = () =>
        localStorage.getItem("adminToken") ||
        localStorage.getItem("admin_token") ||
        localStorage.getItem("token");
    
    const currentAdmin = safeJSON(localStorage.getItem("admin"), {});

    const ADMIN_ROLES = ["super_admin", "admin", "editor", "viewer"];

    const isAdminAccount = (user = {}) =>
        ADMIN_ROLES.includes(String(user?.role || "").toLowerCase());

    const getStoredAdminIdentity = () => {
        // ============================================================
        // FIX: Check both 'admin' and 'user' localStorage keys
        // ============================================================
        let stored = safeJSON(localStorage.getItem("admin"), {});
        
        // If admin is empty, try to get from 'user'
        if (!stored || !stored.role) {
            const userData = safeJSON(localStorage.getItem("user"), {});
            if (userData && (userData.role === "admin" || userData.role === "super_admin")) {
                stored = userData;
                // Also save to admin for future use
                localStorage.setItem("admin", JSON.stringify(userData));
                console.log('✅ Copied admin data from user to admin localStorage');
            }
        }

        const name =
            stored.name ||
            `${stored.firstName || ""} ${stored.lastName || ""}`.trim() ||
            stored.username ||
            stored.email?.split("@")?.[0] ||
            "Admin";

        const role = String(stored.role || "viewer").toLowerCase();

        console.log('📋 Admin identity:', { email: stored.email, role, name });

        return {
            ...stored,
            name,
            role
        };
    };

    const filteredMenuItems = menuItems.filter((item) =>
        item.roles.includes(currentAdmin.role || "viewer")
    );

    useEffect(() => {
        const checkMobile = () => {
            const mobile = window.innerWidth < 768;
            setIsMobile(mobile);

            if (!mobile) {
                setIsMobileSidebarOpen(false);
                setIsSidebarOpen(true);
            } else {
                setIsSidebarOpen(false);
            }
        };

        checkMobile();
        window.addEventListener("resize", checkMobile);

        return () => window.removeEventListener("resize", checkMobile);
    }, []);

    useEffect(() => {
        setIsMobileSidebarOpen(false);
        setShowNotifications(false);
        setShowProfileMenu(false);
    }, [location.pathname]);

    useEffect(() => {
        const handleOutsideClick = (event) => {
            if (
                notificationRef.current &&
                !notificationRef.current.contains(event.target)
            ) {
                setShowNotifications(false);
            }

            if (
                profileRef.current &&
                !profileRef.current.contains(event.target)
            ) {
                setShowProfileMenu(false);
            }
        };

        document.addEventListener("mousedown", handleOutsideClick);

        return () =>
            document.removeEventListener("mousedown", handleOutsideClick);
    }, []);

    // ============================================================
    // FIX: Updated checkAuth function - checks both admin and user
    // ============================================================
    const checkAuth = () => {
        console.log('🔐 Checking admin authentication...');
        
        // ============================================================
        // FIX: Check both 'admin' and 'user' localStorage
        // ============================================================
        let storedAdminRaw = localStorage.getItem("admin");
        
        // If no admin, try to get from user
        if (!storedAdminRaw) {
            const userRaw = localStorage.getItem("user");
            if (userRaw) {
                try {
                    const user = JSON.parse(userRaw);
                    if (user.role === "admin" || user.role === "super_admin") {
                        localStorage.setItem("admin", userRaw);
                        const token = localStorage.getItem("token");
                        if (token) {
                            localStorage.setItem("adminToken", token);
                        }
                        storedAdminRaw = userRaw;
                        console.log('✅ Admin data copied from user localStorage');
                    }
                } catch (e) {
                    console.warn('Error parsing user data:', e);
                }
            }
        }
        
        // If still no admin, redirect to login
        if (!storedAdminRaw) {
            console.log('❌ No admin found in localStorage, redirecting to login');
            navigate("/login");
            return;
        }

        const storedAdmin = getStoredAdminIdentity();
        console.log('✅ Admin loaded:', { 
            email: storedAdmin.email, 
            role: storedAdmin.role,
            name: storedAdmin.name 
        });
        
        setAdminName(storedAdmin.name);
        setAdminRole(
            storedAdmin.role === "super_admin"
                ? "Super Admin"
                : storedAdmin.role === "admin"
                ? "Admin"
                : storedAdmin.role === "editor"
                ? "Editor"
                : "Viewer"
        );

        // ============================================================
        // Optional: Try to sync with backend, but don't block
        // ============================================================
        const token = getToken();
        if (token) {
            fetch(`${API_URL}/auth/me`, {
                headers: { Authorization: `Bearer ${token}` }
            })
            .then(response => response.ok ? response.json().catch(() => ({})) : null)
            .then(data => {
                if (data) {
                    const remoteUser = data.user || data.data?.user || data.data || null;
                    if (remoteUser && isAdminAccount(remoteUser)) {
                        const remoteName = remoteUser.name ||
                            `${remoteUser.firstName || ""} ${remoteUser.lastName || ""}`.trim() ||
                            remoteUser.username ||
                            remoteUser.email?.split("@")?.[0] ||
                            storedAdmin.name;

                        setAdminName(remoteName);
                        setAdminRole(
                            remoteUser.role === "super_admin"
                                ? "Super Admin"
                                : remoteUser.role === "admin"
                                ? "Admin"
                                : remoteUser.role === "editor"
                                ? "Editor"
                                : "Viewer"
                        );

                        const mergedAdmin = { ...storedAdmin, ...remoteUser, name: remoteName };
                        localStorage.setItem("admin", JSON.stringify(mergedAdmin));
                        console.log('✅ Admin synced from backend');
                    }
                }
            })
            .catch(() => {
                console.log('ℹ️ Backend sync unavailable, using local admin data');
            });
        }

        setLoading(false);
        console.log('✅ Admin authentication complete');
    };

    useEffect(() => {
        console.log('🔄 AdminLayout initializing...');
        
        // Check auth first
        checkAuth();
        
        // Load other data
        loadSiteName();
        loadNotifications();

        const savedTheme = localStorage.getItem("admin_dark_mode");
        if (savedTheme === "true") {
            setDarkMode(true);
            document.documentElement.classList.add("dark");
        }

        const notificationRefreshEvents = [
            "productsUpdated",
            "inventoryUpdated",
            "ordersUpdated",
            "customersUpdated",
            "customerRegistered",
            "authChanged",
            "contactMessageCreated",
            "footerMessageCreated",
            "adminNotificationCreated",
            "storage"
        ];

        const refreshNotifications = () => {
            loadNotifications();
        };

        notificationRefreshEvents.forEach((eventName) => {
            window.addEventListener(eventName, refreshNotifications);
        });

        const handleSettingsUpdate = () => loadSiteName();

        window.addEventListener("settingsSaved", handleSettingsUpdate);
        window.addEventListener("adminSettingsSaved", handleSettingsUpdate);
        window.addEventListener("siteInfoUpdated", handleSettingsUpdate);

        const interval = window.setInterval(loadNotifications, 15000);

        return () => {
            notificationRefreshEvents.forEach((eventName) => {
                window.removeEventListener(eventName, refreshNotifications);
            });

            window.removeEventListener("settingsSaved", handleSettingsUpdate);
            window.removeEventListener("adminSettingsSaved", handleSettingsUpdate);
            window.removeEventListener("siteInfoUpdated", handleSettingsUpdate);
            window.clearInterval(interval);
        };
    }, [navigate]);

    const loadSiteName = () => {
        const siteInfo = safeJSON(localStorage.getItem("site_info"), {});
        const siteSettings = safeJSON(
            localStorage.getItem("site_settings"),
            {}
        );

        const name =
            siteInfo.siteName ||
            siteSettings.siteName ||
            "ZAMED";

        setSiteName(name);
        document.title = `${name} - Admin Dashboard`;
    };

    // ... REST OF YOUR CODE (keep all the notification functions, etc.)
    // ... Make sure to keep all the existing functions like:
    // - getReadIds, persistReadIds
    // - getLocalProducts
    // - buildLowStockNotifications
    // - buildCustomerNotifications
    // - buildContactNotifications
    // - buildOrderNotifications
    // - normalizeStoredNotifications
    // - mergeNotifications
    // - loadNotifications
    // - markAsRead, markAllAsRead, clearAllNotifications
    // - openNotification
    // - handleLogout, forceRefresh, toggleDarkMode, toggleSidebar
    // - getRoleBadgeColor, getNotificationIcon
    // - SidebarContent component
    // - The return/JSX

    // ... (all your notification functions remain unchanged)

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gray-100 dark:bg-gray-900">
                <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-orange-500" />
            </div>
        );
    }

    // ... REST OF YOUR JSX (sidebar, header, main content)
};

export default AdminLayout;