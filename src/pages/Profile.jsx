// src/pages/Profile.jsx
import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { 
    FiUser, FiShoppingBag, FiHeart, FiLogOut, FiHome, FiCalendar, 
    FiPackage, FiEdit2, FiSave, FiPhone, FiMapPin, FiTruck, 
    FiCheckCircle, FiClock, FiX, FiCornerDownLeft, FiShield, 
    FiLoader, FiInfo, FiDollarSign, FiAlertCircle, FiCheck, 
    FiTruck as FiDeliveryTruck, FiPackage as FiPickupPackage, 
    FiCreditCard, FiRefreshCw, FiSettings, FiLock, FiBell, 
    FiMail, FiGlobe, FiMoon, FiSun, FiMenu, FiGrid, FiList,
    FiStar, FiTrendingUp, FiAward, FiGift, FiHelpCircle,
    FiMessageSquare, FiShare2, FiDownload, FiPrinter,
    FiFilter, FiSearch, FiPlus, FiMinus, FiTrash2, FiTag,
    FiArrowLeft, FiArrowRight, FiEdit, FiMoreVertical, FiCamera,
    FiCopy
} from "react-icons/fi";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { useCart } from "../context/CartContext";
import orderService from "../services/orderService";
import productService from "../services/productService";

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const COUPON_IMAGE_DB = "zamed_coupon_assets";
const COUPON_IMAGE_STORE = "coupon_images";

const openCouponImageDatabase = () =>
    new Promise((resolve, reject) => {
        const request = indexedDB.open(COUPON_IMAGE_DB, 1);
        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(COUPON_IMAGE_STORE)) {
                db.createObjectStore(COUPON_IMAGE_STORE);
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });

const getCouponImageAsset = async (key) => {
    if (!key || typeof indexedDB === "undefined") return "";
    try {
        const db = await openCouponImageDatabase();
        return await new Promise((resolve, reject) => {
            const tx = db.transaction(COUPON_IMAGE_STORE, "readonly");
            const req = tx.objectStore(COUPON_IMAGE_STORE).get(String(key));
            req.onsuccess = () => resolve(req.result || "");
            req.onerror = () => reject(req.error);
        });
    } catch (error) {
        console.warn("Unable to load coupon artwork", error);
        return "";
    }
};

const Profile = () => {
    const [user, setUser] = useState(null);
    const [orders, setOrders] = useState([]);
    const [favorites, setFavorites] = useState([]);
    const [activeTab, setActiveTab] = useState("overview");
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [editedUser, setEditedUser] = useState({});
    const [profileErrors, setProfileErrors] = useState({});
    const [isSavingProfile, setIsSavingProfile] = useState(false);
    const [currencySymbol, setCurrencySymbol] = useState("$");
    const [currencyCode, setCurrencyCode] = useState("USD");
    const [loading, setLoading] = useState(true);
    const [returnRequests, setReturnRequests] = useState([]);
    const [selectedItemForReturn, setSelectedItemForReturn] = useState(null);
    const [selectedReturnRequest, setSelectedReturnRequest] = useState(null);
    const [returnReason, setReturnReason] = useState("");
    const [returnComment, setReturnComment] = useState("");
    const [isSubmittingReturn, setIsSubmittingReturn] = useState(false);
    const [cancellingOrderId, setCancellingOrderId] = useState(null);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [darkMode, setDarkMode] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [selectedOfferNotification, setSelectedOfferNotification] = useState(null);
    const [addresses, setAddresses] = useState([]);
    const [showAddAddress, setShowAddAddress] = useState(false);
    const [newAddress, setNewAddress] = useState({ street: "", city: "", state: "", zipCode: "", country: "", isDefault: false });
    const [orderFilter, setOrderFilter] = useState("all");
    const [orderSort, setOrderSort] = useState("newest");
    const [searchOrder, setSearchOrder] = useState("");
    const [wishlistView, setWishlistView] = useState("grid");
    const [userCoupons, setUserCoupons] = useState([]);
    const [token, setToken] = useState(null);

    const navigate = useNavigate();
    const location = useLocation();
    const { addToCart } = useCart();

    const getToken = () => localStorage.getItem('token');


    const getOrderForNotification = (notification) => {
        const orderId = notification?.orderId || notification?.referenceId || notification?.entityId;
        return orders.find((order) =>
            String(order?.id) === String(orderId) ||
            String(order?._id) === String(orderId)
        );
    };

    const getNotificationImage = (notification) => {
        if (notification?.image || notification?.productImage || notification?.orderImage) {
            return notification.image || notification.productImage || notification.orderImage;
        }
        if (notification?.type === "order") {
            const order = getOrderForNotification(notification);
            return order?.itemsList?.[0]?.image || order?.items?.[0]?.image || "";
        }
        return "";
    };

    const viewNotificationDetails = async (notification) => {
        await markNotificationAsRead(notification.id);

        if (notification.type === "coupon") {
            setActiveTab("coupons");
            navigate("/profile?tab=coupons", { replace: false });
            return;
        }

        if (notification.type === "order") {
            const orderId = notification.orderId || notification.referenceId || notification.entityId;
            if (orderId) sessionStorage.setItem("profile_focus_order", String(orderId));
            setActiveTab("orders");
            navigate("/profile?tab=orders", { state: { focusOrderId: orderId } });
            return;
        }

        if (notification.type === "product" && notification.productId) {
            navigate(`/product/${notification.productId}`);
            return;
        }

        if (notification.link || notification.url || notification.path) {
            navigate(notification.link || notification.url || notification.path);
            return;
        }

        navigate("/");
    };

    const returnReasons = [
        "Wrong item received",
        "Defective or damaged product",
        "Size doesn't fit",
        "Product not as described",
        "Changed my mind",
        "Better price available",
        "Other"
    ];

    const returnStages = {
        'pending_pickup': { label: 'Awaiting Pickup', icon: FiClock, color: 'text-yellow-600', bg: 'bg-yellow-50', progress: 16, description: 'Return request submitted. Waiting for driver to schedule pickup.' },
        'pickup_scheduled': { label: 'Pickup Scheduled', icon: FiCalendar, color: 'text-blue-600', bg: 'bg-blue-50', progress: 33, description: 'Driver has been scheduled to collect your item.' },
        'picked_up': { label: 'Item Collected', icon: FiPickupPackage, color: 'text-purple-600', bg: 'bg-purple-50', progress: 50, description: 'Driver has collected your item. Item is on the way to warehouse.' },
        'verified': { label: 'Item Verified', icon: FiCheckCircle, color: 'text-green-600', bg: 'bg-green-50', progress: 66, description: 'Item has been verified at warehouse.' },
        'refund_processing': { label: 'Refund Processing', icon: FiRefreshCw, color: 'text-orange-600', bg: 'bg-orange-50', progress: 83, description: 'Refund is being processed.' },
        'refunded': { label: 'Refund Completed', icon: FiCreditCard, color: 'text-green-600', bg: 'bg-green-50', progress: 100, description: 'Refund has been sent to your payment method.' },
        'rejected': { label: 'Return Rejected', icon: FiX, color: 'text-red-600', bg: 'bg-red-50', progress: 0, description: 'Return request was rejected.' }
    };

    // Load favorites from localStorage - store IDs only
    const loadFavorites = (email) => {
        if (!email) return;
        const favoriteIds = JSON.parse(localStorage.getItem(`favorites_${email}`) || '[]');
        
        // Get full product details from productService
        const allProducts = productService.getAllProducts();
        const favoriteProducts = allProducts.filter(p => favoriteIds.includes(p.id));
        setFavorites(favoriteProducts);
    };

    // Load user coupons and remove coupons deleted from Admin
    const loadUserCoupons = async (email) => {
        if (!email) {
            setUserCoupons([]);
            return;
        }

        try {
            const adminCoupons = JSON.parse(localStorage.getItem('admin_coupons') || '[]');
            const shopCoupons = JSON.parse(localStorage.getItem('shop_coupons') || '[]');

            // De-duplicate the latest Admin source by ID/code.
            const adminMap = new Map();
            [...shopCoupons, ...adminCoupons].forEach((coupon) => {
                const key = String(coupon?.id || coupon?.code || '').toUpperCase();
                if (key) adminMap.set(key, coupon);
            });
            const latestAdminCoupons = [...adminMap.values()];

            const activeById = new Map();
            const activeByCode = new Map();
            latestAdminCoupons.forEach((coupon) => {
                if (!coupon || coupon.deleted === true || coupon.status === 'inactive') return;
                if (coupon.id != null) activeById.set(String(coupon.id), coupon);
                if (coupon.code) activeByCode.set(String(coupon.code).toUpperCase(), coupon);
            });

            const userKey = `user_coupons_${email}`;
            const assignedCoupons = JSON.parse(localStorage.getItem(userKey) || '[]');

            // A customer coupon is valid only while its Admin source still exists.
            const syncedCoupons = assignedCoupons.flatMap((assigned) => {
                const latest =
                    (assigned?.id != null && activeById.get(String(assigned.id))) ||
                    activeByCode.get(String(assigned?.code || '').toUpperCase());

                if (!latest) return [];

                return [{
                    ...assigned,
                    ...latest,
                    assignedTo: assigned.assignedTo || email,
                    assignedAt: assigned.assignedAt,
                    claimed: assigned.claimed,
                    used: assigned.used,
                    usedAt: assigned.usedAt,
                    userUsedCount: assigned.userUsedCount,
                    orderId: assigned.orderId,
                    source: 'admin-synced'
                }];
            });

            const unique = new Map();
            syncedCoupons.forEach((coupon) => {
                const key = String(coupon.id || coupon.code).toUpperCase();
                unique.set(key, coupon);
            });
            const finalCoupons = [...unique.values()].sort((a, b) =>
                new Date(b.assignedAt || b.createdAt || 0) - new Date(a.assignedAt || a.createdAt || 0)
            );

            localStorage.setItem(userKey, JSON.stringify(finalCoupons));

            // Remove notifications belonging to coupons that no longer exist.
            const notificationKey = `notifications_${email}`;
            const storedNotifications = JSON.parse(localStorage.getItem(notificationKey) || '[]');
            const cleanedNotifications = storedNotifications.filter((notification) => {
                if (notification.type !== 'coupon') return true;
                const byId = notification.couponId != null && activeById.has(String(notification.couponId));
                const byCode = notification.couponCode && activeByCode.has(String(notification.couponCode).toUpperCase());
                return byId || byCode;
            });
            if (cleanedNotifications.length !== storedNotifications.length) {
                localStorage.setItem(notificationKey, JSON.stringify(cleanedNotifications));
                setNotifications(cleanedNotifications);
            }

            const hydratedCoupons = await Promise.all(
                finalCoupons.map(async (coupon) => {
                    const imageKey = coupon.imageStorageKey || coupon.id || coupon.code;
                    const indexedImage = coupon.hasBackgroundImage
                        ? await getCouponImageAsset(imageKey)
                        : "";
                    return {
                        ...coupon,
                        backgroundImage: indexedImage || coupon.backgroundImage || ""
                    };
                })
            );

            setUserCoupons(hydratedCoupons);
        } catch (error) {
            console.error('Error synchronising user coupons:', error);
            setUserCoupons([]);
        }
    };

    // Helper function to check if coupon is expired
    const isExpired = (coupon) => {
        if (!coupon?.endDate) return false;
        return new Date(coupon.endDate) < new Date();
    };

    const getOfferForNotification = (notification) => {
        if (!notification || notification.type !== 'coupon') return null;
        const code = String(notification.couponCode || '').toUpperCase();
        const id = notification.couponId != null ? String(notification.couponId) : null;
        return userCoupons.find((coupon) =>
            (id && String(coupon.id) === id) ||
            (code && String(coupon.code || '').toUpperCase() === code)
        ) || null;
    };

    const openNotification = async (notification) => {
        await markNotificationAsRead(notification.id);
        if (notification.type === 'coupon') {
            const coupon = getOfferForNotification(notification);
            if (!coupon) {
                toast.info('This offer is no longer available.');
                if (user?.email) loadUserCoupons(user.email);
                return;
            }
            setSelectedOfferNotification({ notification, coupon });
        }
    };

    // Mark notification as read
    const markNotificationAsRead = async (notifId) => {
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
            // Fallback to localStorage
            const updatedNotifs = notifications.map(n => 
                n.id === notifId ? { ...n, read: true } : n
            );
            setNotifications(updatedNotifs);
            if (user?.email) {
                localStorage.setItem(`notifications_${user.email}`, JSON.stringify(updatedNotifs));
            }
        }
    };

    const markAllNotificationsAsRead = async () => {
        try {
            const token = getToken();
            if (token) {
                const response = await fetch(`${API_URL}/notifications/read-all`, {
                    method: 'PUT',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (response.ok) {
                    setNotifications(notifications.map(n => ({ ...n, read: true })));
                    return;
                }
            }
        } catch (error) {
            const updatedNotifs = notifications.map(n => ({ ...n, read: true }));
            setNotifications(updatedNotifs);
            if (user?.email) {
                localStorage.setItem(`notifications_${user.email}`, JSON.stringify(updatedNotifs));
            }
        }
    };

    // Load notifications
    const loadNotifications = async (email) => {
        if (!email) return;
        
        // First try backend
        try {
            const token = getToken();
            if (token) {
                const response = await fetch(`${API_URL}/notifications/user`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (response.ok) {
                    const data = await response.json();
                    if (data.success && data.notifications) {
                        setNotifications(data.notifications);
                        localStorage.setItem(`notifications_${email}`, JSON.stringify(data.notifications));
                        return;
                    }
                }
            }
        } catch (error) {
            console.log("Backend not available for notifications");
        }
        
        // Fallback to localStorage
        const storedNotifs = JSON.parse(localStorage.getItem(`notifications_${email}`) || '[]');
        setNotifications(storedNotifs);
    };

    // Load addresses
    const loadAddresses = async (email) => {
        if (!email) return;
        
        // First try backend
        try {
            const token = getToken();
            if (token) {
                const response = await fetch(`${API_URL}/users/addresses`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (response.ok) {
                    const data = await response.json();
                    if (data.success && data.addresses) {
                        setAddresses(data.addresses);
                        localStorage.setItem(`addresses_${email}`, JSON.stringify(data.addresses));
                        return;
                    }
                }
            }
        } catch (error) {
            console.log("Backend not available for addresses");
        }
        
        // Fallback to localStorage
        const savedAddresses = JSON.parse(localStorage.getItem(`addresses_${email}`) || '[]');
        setAddresses(savedAddresses);
    };

    // Load user data (orders and returns)
    const loadUserData = async (email) => {
        if (!email) return;
        try {
            const userOrders = await orderService.getUserOrders(email);
            setOrders(userOrders);
            
            const userReturns = await orderService.getUserReturnRequests(email);
            setReturnRequests(userReturns);
        } catch (error) {
            console.error("Error loading user data:", error);
        }
    };

    // Refresh all user data
    const refreshUserData = async (email) => {
        if (!email) return;
        await Promise.all([
            loadFavorites(email),
            loadUserCoupons(email),
            loadNotifications(email),
            loadAddresses(email),
            loadUserData(email)
        ]);
    };

    useEffect(() => {
        const userData = localStorage.getItem('user');
        const authToken = getToken();
        setToken(authToken);
        
        if (!userData) {
            navigate('/login');
            return;
        }
        
        try {
            const parsedUser = JSON.parse(userData);
            setUser(parsedUser);
            setEditedUser(parsedUser);
            
            const email = parsedUser.email;
            
            // Load all data
            refreshUserData(email);
            
            const siteSettings = JSON.parse(localStorage.getItem('site_settings') || '{}');
            const symbols = { USD: "$", EUR: "€", GBP: "£", LKR: "Rs" };
            setCurrencySymbol(symbols[siteSettings.currency] || "$");
            setCurrencyCode(siteSettings.currency || "USD");
            
            const savedTheme = localStorage.getItem('theme');
            if (savedTheme === 'dark') setDarkMode(true);
            
            // Check for tab parameter in URL
            const params = new URLSearchParams(location.search);
            const tabParam = params.get('tab');
            if (tabParam && ['overview', 'orders', 'wishlist', 'coupons', 'notifications', 'returns', 'addresses', 'security', 'settings'].includes(tabParam)) {
                setActiveTab(tabParam);
            } else if (location.state?.activeTab) {
                setActiveTab(location.state.activeTab);
            }
            
        } catch (error) {
            console.error("Error parsing user data:", error);
            navigate('/login');
        } finally {
            setLoading(false);
        }
    }, [navigate, location]);

    // Set up event listeners for real-time updates
    useEffect(() => {
        if (!user) return;
        
        const email = user.email;
        
        const handleFavoritesUpdate = (event) => {
            if (event.detail && event.detail.email === email) {
                setFavorites(event.detail.favorites);
            } else {
                loadFavorites(email);
            }
        };
        
        const handleProductUpdate = () => {
            // Add notification about new product
            const newNotification = {
                id: Date.now(),
                title: "New Products Available!",
                message: "Check out our latest collection with new arrivals!",
                type: "product",
                icon: "🆕",
                date: new Date().toISOString(),
                read: false
            };
            
            const existingNotifs = JSON.parse(localStorage.getItem(`notifications_${email}`) || '[]');
            existingNotifs.unshift(newNotification);
            localStorage.setItem(`notifications_${email}`, JSON.stringify(existingNotifs.slice(0, 50)));
            loadNotifications(email);
            toast.info("New products have been added to the store!");
        };
        
        const handleCouponReceived = (event) => {
            if (event.detail && event.detail.email === email) {
                loadUserCoupons(email);
                loadNotifications(email);
                toast.success(`New coupon received: ${event.detail.couponCode}`);
            } else if (event.detail && event.detail.allUsers) {
                // Coupon sent to all users
                loadUserCoupons(email);
                loadNotifications(email);
                toast.success(`New coupon available: ${event.detail.couponCode}`);
            }
        };
        
        // Remove a deleted coupon and its related notifications immediately.
        const handleCouponDeleted = (event) => {
            const deletedId = event.detail?.couponId != null ? String(event.detail.couponId) : null;
            const deletedCode = String(event.detail?.couponCode || '').toUpperCase();

            setUserCoupons((current) => {
                const updated = current.filter((coupon) =>
                    !(deletedId && String(coupon.id) === deletedId) &&
                    !(deletedCode && String(coupon.code || '').toUpperCase() === deletedCode)
                );
                localStorage.setItem(`user_coupons_${email}`, JSON.stringify(updated));
                return updated;
            });

            setNotifications((current) => {
                const updated = current.filter((notification) =>
                    !(notification.type === 'coupon' && (
                        (deletedId && String(notification.couponId) === deletedId) ||
                        (deletedCode && String(notification.couponCode || '').toUpperCase() === deletedCode)
                    ))
                );
                localStorage.setItem(`notifications_${email}`, JSON.stringify(updated));
                return updated;
            });

            setSelectedOfferNotification((current) => {
                if (!current) return current;
                const sameId = deletedId && String(current.coupon?.id) === deletedId;
                const sameCode = deletedCode && String(current.coupon?.code || '').toUpperCase() === deletedCode;
                return sameId || sameCode ? null : current;
            });
        };

        const handleCouponsUpdated = () => {
            loadUserCoupons(email);
            loadNotifications(email);
        };

        const handleStorageChange = (e) => {
            if (e.key === `favorites_${email}`) {
                loadFavorites(email);
            }
            if (e.key === `notifications_${email}`) {
                loadNotifications(email);
            }
            if (e.key === `user_coupons_${email}`) {
                loadUserCoupons(email);
            }
            if (e.key === 'admin_coupons' || e.key === 'shop_coupons') {
                // Admin coupons changed, reload user coupons
                loadUserCoupons(email);
            }
        };
        
        window.addEventListener('favoritesUpdated', handleFavoritesUpdate);
        window.addEventListener('productsUpdated', handleProductUpdate);
        window.addEventListener('couponReceived', handleCouponReceived);
        window.addEventListener('couponDeleted', handleCouponDeleted);
        window.addEventListener('couponsUpdated', handleCouponsUpdated);
        window.addEventListener('storage', handleStorageChange);
        
        return () => {
            window.removeEventListener('favoritesUpdated', handleFavoritesUpdate);
            window.removeEventListener('productsUpdated', handleProductUpdate);
            window.removeEventListener('couponReceived', handleCouponReceived);
            window.removeEventListener('couponDeleted', handleCouponDeleted);
            window.removeEventListener('couponsUpdated', handleCouponsUpdated);
            window.removeEventListener('storage', handleStorageChange);
        };
    }, [user]);

    // Refresh data when tab changes
    useEffect(() => {
        if (user) {
            const email = user.email;
            if (activeTab === 'orders' || activeTab === 'returns') {
                loadUserData(email);
            }
            if (activeTab === 'coupons') {
                loadUserCoupons(email);
            }
            if (activeTab === 'notifications') {
                loadNotifications(email);
            }
        }
    }, [activeTab, user]);

    // Keep the edit form in sync and reset validation whenever it opens
    useEffect(() => {
        if (isEditingProfile && user) {
            setEditedUser({
                ...user,
                phone: user.phone || user.phoneNumber || "",
                dateOfBirth: user.dateOfBirth || "",
                gender: user.gender || "",
                title: user.title || "",
                preferredName: user.preferredName || "",
                bio: user.bio || "",
                occupation: user.occupation || "",
                company: user.company || "",
                street: user.street || "",
                city: user.city || "",
                county: user.county || user.state || "",
                postcode: user.postcode || user.zipCode || "",
                country: user.country || "United Kingdom",
                preferredSize: user.preferredSize || "",
                preferredFit: user.preferredFit || "",
                favouriteCategory: user.favouriteCategory || "",
                newsletter: user.newsletter ?? true,
                smsUpdates: user.smsUpdates ?? false,
                profileImage: user.profileImage || user.avatar || ""
            });
            setProfileErrors({});
        }
    }, [isEditingProfile, user]);

    const setProfileField = (field, value) => {
        setEditedUser(prev => ({ ...prev, [field]: value }));
        if (profileErrors[field]) {
            setProfileErrors(prev => ({ ...prev, [field]: "" }));
        }
    };

    const handleProfileImageChange = (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith("image/")) {
            toast.error("Please choose a valid image file.");
            return;
        }

        if (file.size > 3 * 1024 * 1024) {
            toast.error("Profile image must be smaller than 3MB.");
            return;
        }

        const reader = new FileReader();
        reader.onload = () => setProfileField("profileImage", reader.result);
        reader.onerror = () => toast.error("Unable to read the selected image.");
        reader.readAsDataURL(file);
    };

    const validateProfile = () => {
        const errors = {};
        if (!editedUser.firstName?.trim()) errors.firstName = "First name is required.";
        if (!editedUser.lastName?.trim()) errors.lastName = "Last name is required.";
        if (!editedUser.email?.trim()) {
            errors.email = "Email address is required.";
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editedUser.email)) {
            errors.email = "Enter a valid email address.";
        }
        if (editedUser.phone && !/^[+\d][\d\s()-]{7,19}$/.test(editedUser.phone.trim())) {
            errors.phone = "Enter a valid phone number.";
        }
        if (editedUser.postcode && editedUser.postcode.trim().length < 3) {
            errors.postcode = "Enter a valid postcode.";
        }

        setProfileErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleLogout = () => {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        toast.success("Logged out successfully");
        navigate('/login');
    };

    const updateProfile = async () => {
        if (!validateProfile()) {
            toast.error("Please correct the highlighted fields.");
            return;
        }

        setIsSavingProfile(true);

        const normalizedUser = {
            ...user,
            ...editedUser,
            firstName: editedUser.firstName?.trim(),
            lastName: editedUser.lastName?.trim(),
            email: editedUser.email?.trim(),
            phone: editedUser.phone?.trim(),
            phoneNumber: editedUser.phone?.trim(),
            profileImage: editedUser.profileImage || "",
            avatar: editedUser.profileImage || user.avatar || "",
            address: [
                editedUser.street,
                editedUser.city,
                editedUser.county,
                editedUser.postcode,
                editedUser.country
            ].filter(Boolean).join(", ")
        };

        try {
            const token = getToken();
            if (token) {
                const response = await fetch(`${API_URL}/users/profile`, {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`
                    },
                    body: JSON.stringify(normalizedUser)
                });

                if (response.ok) {
                    const data = await response.json();
                    const savedUser = data.user || normalizedUser;
                    localStorage.setItem("user", JSON.stringify(savedUser));
                    setUser(savedUser);
                    setEditedUser(savedUser);
                    toast.success("Your profile has been updated.");
                    setIsEditingProfile(false);
                    return;
                }
            }

            localStorage.setItem("user", JSON.stringify(normalizedUser));
            setUser(normalizedUser);
            setEditedUser(normalizedUser);
            toast.success("Your profile has been updated.");
            setIsEditingProfile(false);
        } catch (error) {
            console.error("Profile update failed:", error);
            localStorage.setItem("user", JSON.stringify(normalizedUser));
            setUser(normalizedUser);
            setEditedUser(normalizedUser);
            toast.success("Profile saved locally.");
            setIsEditingProfile(false);
        } finally {
            setIsSavingProfile(false);
        }
    };

    const addNewAddress = async () => {
        if (!newAddress.street || !newAddress.city) {
            toast.error("Please fill in street and city");
            return;
        }
        
        const address = {
            id: Date.now(),
            ...newAddress,
            isDefault: addresses.length === 0 ? true : newAddress.isDefault
        };
        
        let updatedAddresses = [...addresses];
        if (address.isDefault) {
            updatedAddresses = updatedAddresses.map(addr => ({ ...addr, isDefault: false }));
        }
        updatedAddresses.push(address);
        
        try {
            const token = getToken();
            if (token) {
                const response = await fetch(`${API_URL}/users/addresses`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(address)
                });
                if (response.ok) {
                    const data = await response.json();
                    if (data.success) {
                        setAddresses(data.addresses);
                        localStorage.setItem(`addresses_${user.email}`, JSON.stringify(data.addresses));
                        setShowAddAddress(false);
                        setNewAddress({ street: "", city: "", state: "", zipCode: "", country: "", isDefault: false });
                        toast.success("Address added successfully");
                        return;
                    }
                }
            }
        } catch (error) {
            console.log("Backend not available, saving locally");
        }
        
        setAddresses(updatedAddresses);
        localStorage.setItem(`addresses_${user.email}`, JSON.stringify(updatedAddresses));
        setShowAddAddress(false);
        setNewAddress({ street: "", city: "", state: "", zipCode: "", country: "", isDefault: false });
        toast.success("Address added successfully (local)");
    };

    const deleteAddress = async (addressId) => {
        const updatedAddresses = addresses.filter(addr => addr.id !== addressId);
        
        try {
            const token = getToken();
            if (token) {
                const response = await fetch(`${API_URL}/users/addresses/${addressId}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (response.ok) {
                    const data = await response.json();
                    if (data.success) {
                        setAddresses(data.addresses);
                        localStorage.setItem(`addresses_${user.email}`, JSON.stringify(data.addresses));
                        toast.success("Address removed");
                        return;
                    }
                }
            }
        } catch (error) {
            console.log("Backend not available, deleting locally");
        }
        
        setAddresses(updatedAddresses);
        localStorage.setItem(`addresses_${user.email}`, JSON.stringify(updatedAddresses));
        toast.success("Address removed (local)");
    };

    const setDefaultAddress = async (addressId) => {
        const updatedAddresses = addresses.map(addr => ({
            ...addr,
            isDefault: addr.id === addressId
        }));
        
        try {
            const token = getToken();
            if (token) {
                const response = await fetch(`${API_URL}/users/addresses/${addressId}/default`, {
                    method: 'PUT',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (response.ok) {
                    const data = await response.json();
                    if (data.success) {
                        setAddresses(data.addresses);
                        localStorage.setItem(`addresses_${user.email}`, JSON.stringify(data.addresses));
                        toast.success("Default address updated");
                        return;
                    }
                }
            }
        } catch (error) {
            console.log("Backend not available, updating locally");
        }
        
        setAddresses(updatedAddresses);
        localStorage.setItem(`addresses_${user.email}`, JSON.stringify(updatedAddresses));
        toast.success("Default address updated (local)");
    };

    const removeFromFavorites = (productId) => {
        const updatedFavorites = favorites.filter(item => item.id !== productId);
        setFavorites(updatedFavorites);
        
        const favoriteIds = updatedFavorites.map(p => p.id);
        localStorage.setItem(`favorites_${user.email}`, JSON.stringify(favoriteIds));
        
        window.dispatchEvent(new CustomEvent('favoritesUpdated', { 
            detail: { email: user.email, favorites: updatedFavorites } 
        }));
        window.dispatchEvent(new Event('storage'));
        
        toast.success("Removed from favorites");
    };

    const addToCartFromFavorites = (product) => {
        addToCart({
            id: product.id,
            name: product.name,
            price: product.price,
            image: product.image,
            category: product.category,
            quantity: 1,
            size: product.sizes?.[0] || "One Size",
            color: product.colors?.[0] || "Default"
        });
        toast.success(`${product.name} added to cart!`);
    };

    const cancelOrder = async (orderId) => {
        if (window.confirm("Are you sure you want to cancel this order?")) {
            setCancellingOrderId(orderId);
            try {
                await orderService.updateOrderStatus(orderId, "cancelled");
                const updatedOrders = orders.map(order =>
                    order.id === orderId ? { ...order, status: "cancelled" } : order
                );
                setOrders(updatedOrders);
                toast.success("Order cancelled successfully!");
                loadUserData(user.email);
            } catch (error) {
                console.error("Error cancelling order:", error);
                toast.error("Failed to cancel order. Please try again.");
            } finally {
                setCancellingOrderId(null);
            }
        }
    };

    const submitReturnRequest = async () => {
        if (!returnReason) {
            toast.error("Please select a reason for return");
            return;
        }
        
        setIsSubmittingReturn(true);
        
        try {
            const order = orders.find(o => o.id === selectedItemForReturn.orderId);
            const product = order?.itemsList?.find(p => p.id === selectedItemForReturn.productId);
            
            if (!product) {
                toast.error("Product not found in order");
                setIsSubmittingReturn(false);
                return;
            }
            
            const siteSettings = JSON.parse(localStorage.getItem('site_settings') || '{}');
            const taxRate = parseFloat(siteSettings.taxRate) || 10;
            
            const productPrice = parseFloat(product.price) || 0;
            const productQuantity = parseInt(product.quantity) || 1;
            const subtotal = productPrice * productQuantity;
            const taxAmount = subtotal * (taxRate / 100);
            const refundAmount = subtotal + taxAmount;
            
            const returnRequest = {
                id: Date.now(),
                orderId: selectedItemForReturn.orderId,
                productId: selectedItemForReturn.productId,
                productName: selectedItemForReturn.productName,
                productImage: product.image || '',
                productPrice: productPrice,
                productQuantity: productQuantity,
                subtotal: subtotal,
                taxAmount: taxAmount,
                taxRate: taxRate,
                refundAmount: refundAmount,
                reason: returnReason,
                comment: returnComment,
                status: "pending_pickup",
                date: new Date().toISOString(),
                userEmail: user.email,
                pickupAddress: user.address || order.shippingAddress,
                trackingHistory: [{
                    stage: "pending_pickup",
                    timestamp: new Date().toISOString(),
                    message: "Return request submitted. Awaiting driver assignment."
                }]
            };
            
            const saved = await orderService.saveReturnRequest(returnRequest);
            
            if (saved) {
                setReturnRequests(prev => [returnRequest, ...prev]);
                toast.success(`Return request submitted! Refund: ${currencySymbol}${refundAmount.toFixed(2)}`);
                setSelectedItemForReturn(null);
                setReturnReason("");
                setReturnComment("");
            } else {
                throw new Error("Failed to save return request");
            }
        } catch (error) {
            console.error("Error submitting return:", error);
            toast.error("Failed to submit return request. Please try again.");
        } finally {
            setIsSubmittingReturn(false);
        }
    };

    const getOrderStatusBadge = (status) => {
        const badges = {
            'pending': 'bg-yellow-100 text-yellow-800',
            'processing': 'bg-blue-100 text-blue-800',
            'shipped': 'bg-purple-100 text-purple-800',
            'delivered': 'bg-green-100 text-green-800',
            'cancelled': 'bg-red-100 text-red-800'
        };
        return badges[status] || 'bg-gray-100 text-gray-800';
    };

    const getReturnStatusBadge = (status) => {
        const stage = returnStages[status];
        return stage?.bg + ' text-gray-800' || 'bg-gray-100 text-gray-800';
    };

    const getReturnStatusIcon = (status) => {
        const stage = returnStages[status];
        if (stage) {
            const Icon = stage.icon;
            return <Icon size={14} className={stage.color} />;
        }
        return <FiClock className="text-yellow-600" size={14} />;
    };

    const getReturnStatusText = (status) => {
        const stage = returnStages[status];
        return stage?.label || status.replace('_', ' ').toUpperCase();
    };

    const formatPrice = (price) => {
        const numPrice = typeof price === 'number' && !isNaN(price) ? price : 0;
        return `${currencySymbol}${numPrice.toFixed(2)}`;
    };

    const formatDate = (dateString) => new Date(dateString).toLocaleDateString();
    const formatDateTime = (dateString) => new Date(dateString).toLocaleString();

    const filteredOrders = orders.filter(order => {
        if (orderFilter !== "all" && order.status !== orderFilter) return false;
        if (searchOrder && !order.id?.toLowerCase().includes(searchOrder.toLowerCase())) return false;
        return true;
    }).sort((a, b) => {
        if (orderSort === "newest") return new Date(b.date) - new Date(a.date);
        if (orderSort === "oldest") return new Date(a.date) - new Date(b.date);
        if (orderSort === "highest") return (b.total || 0) - (a.total || 0);
        return 0;
    });

    const stats = {
        totalSpent: orders.reduce((sum, o) => sum + (o.total || 0), 0),
        totalOrders: orders.length,
        deliveredOrders: orders.filter(o => o.status === 'delivered').length,
        pendingReturns: returnRequests.filter(r => r.status !== 'refunded' && r.status !== 'rejected').length,
        memberSince: user?.dateJoined || new Date().toLocaleDateString(),
        savedItems: favorites.length
    };

    // Sidebar navigation with dynamic badges
    const sidebarNav = [
        { id: "overview", label: "My Profile", icon: FiUser, color: "text-blue-500", badge: 0 },
        { id: "orders", label: "Orders", icon: FiShoppingBag, color: "text-purple-500", badge: orders.length },
        { id: "wishlist", label: "Wishlist", icon: FiHeart, color: "text-red-500", badge: favorites.length },
        { id: "coupons", label: "Coupons", icon: FiTag, color: "text-green-500", badge: userCoupons.length },
        { id: "notifications", label: "Notifications", icon: FiBell, color: "text-yellow-500", badge: notifications.filter(n => !n.read).length },
        { id: "returns", label: "Returns", icon: FiShield, color: "text-orange-500", badge: returnRequests.filter(r => r.status !== 'refunded').length },
        { id: "addresses", label: "Addresses", icon: FiMapPin, color: "text-green-500", badge: addresses.length },
        { id: "security", label: "Security", icon: FiLock, color: "text-gray-500", badge: 0 },
        { id: "settings", label: "Settings", icon: FiSettings, color: "text-gray-500", badge: 0 }
    ];

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading your profile...</p>
                </div>
            </div>
        );
    }

    if (!user) return null;

    // Helper function for coupon card accent colors
    const cardAccent = (type) => {
        if (type === "free_shipping") return "from-emerald-950 to-emerald-700";
        if (type === "fixed") return "from-[#7a4b14] to-[#d3a24f]";
        if (type === "buy_x_get_y") return "from-slate-950 to-slate-700";
        return "from-[#17130e] to-[#3a2a14]";
    };

    // Helper function for discount label
    const getDiscountLabel = (coupon) => {
        if (coupon.discountType === "free_shipping") return "FREE SHIPPING";
        if (coupon.discountType === "buy_x_get_y") return "BUY 2 GET 1";
        if (coupon.discountType === "percentage") return `${coupon.discountValue}% OFF`;
        return `${currencySymbol}${coupon.discountValue} OFF`;
    };

    // Helper function for coupon background style
    const getCouponBackgroundStyle = (coupon) => {
        if (!coupon?.backgroundImage) return undefined;
        const isValidImage = typeof coupon.backgroundImage === 'string' && 
                           (coupon.backgroundImage.startsWith('data:') || 
                            coupon.backgroundImage.startsWith('http'));
        if (!isValidImage) return undefined;
        
        const overlay = Math.min(90, Math.max(0, Number(coupon.backgroundOverlay) || 55)) / 100;
        return {
            backgroundImage: `linear-gradient(rgba(10, 8, 5, ${overlay}), rgba(10, 8, 5, ${overlay})), url("${coupon.backgroundImage}")`,
            backgroundSize: "cover",
            backgroundPosition: coupon.imagePosition || "center",
            color: coupon.couponTextColor || "#ffffff",
        };
    };

    return (
        <div className={`min-h-screen ${darkMode ? 'dark bg-gray-900 text-white' : 'bg-[#fbfaf8] text-gray-950'}`}>
            <div className="mx-auto max-w-[1440px] px-4 py-8 sm:px-8">
                <div className="flex flex-col gap-8 lg:flex-row">
                    {/* Luxury account sidebar */}
                    <aside className="hidden w-72 shrink-0 lg:block">
                        <div className="sticky top-36 overflow-hidden rounded-md border border-[#e8e1d6] bg-white shadow-[0_8px_30px_rgba(28,24,18,0.05)] dark:border-gray-700 dark:bg-gray-800">
                            <div className="border-b border-[#ece5db] px-6 py-5 text-sm font-semibold tracking-wide text-[#a86f25]">MY ACCOUNT</div>
                            <nav className="p-3">
                                {sidebarNav.map((item) => {
                                    const Icon = item.icon;
                                    return (
                                        <button
                                            key={item.id}
                                            onClick={() => setActiveTab(item.id)}
                                            className={`mb-1 flex w-full items-center justify-between rounded-md px-4 py-3 text-left transition-all ${activeTab === item.id ? 'bg-[#f5ecdd] text-[#a86f25]' : 'text-gray-700 hover:bg-[#faf7f2] dark:text-gray-200 dark:hover:bg-gray-700'}`}
                                        >
                                            <span className="flex items-center gap-3">
                                                <Icon size={19} className={activeTab === item.id ? 'text-[#b98237]' : 'text-gray-500'} />
                                                <span className="text-sm font-medium">{item.label}</span>
                                            </span>
                                            {item.badge > 0 && <span className="rounded-full bg-[#efe1ca] px-2 py-0.5 text-[11px] font-semibold text-[#9a641f]">{item.badge}</span>}
                                        </button>
                                    );
                                })}
                                <div className="my-3 border-t border-[#ece5db]" />
                                <button onClick={handleLogout} className="flex w-full items-center gap-3 rounded-md px-4 py-3 text-sm font-medium text-gray-700 hover:bg-red-50 hover:text-red-600 dark:text-gray-200">
                                    <FiLogOut size={19} /> Logout
                                </button>
                            </nav>

                            <div className="m-5 rounded-md border border-[#eadfce] bg-gradient-to-b from-[#fffdf9] to-[#f8f1e6] p-5 text-center dark:from-gray-800 dark:to-gray-700">
                                <FiAward className="mx-auto mb-3 text-3xl text-[#b98237]" />
                                <h3 className="font-semibold text-gray-950 dark:text-white">Join Zamed Premium Club</h3>
                                <p className="mt-2 text-xs leading-5 text-gray-500 dark:text-gray-300">Unlock exclusive rewards, early access and special member offers.</p>
                                <button className="mt-4 w-full bg-black py-2.5 text-xs font-semibold tracking-wide text-white hover:bg-[#b98237]">JOIN NOW</button>
                            </div>
                        </div>
                    </aside>

                    {/* Mobile Menu Button */}
                    <div className="lg:hidden fixed bottom-4 right-4 z-50">
                        <button
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            className="bg-black text-white p-4 rounded-full shadow-lg hover:bg-[#b98237] transition-all"
                        >
                            <FiMenu size={24} />
                        </button>
                    </div>

                    {/* Mobile Sidebar */}
                    <AnimatePresence>
                        {isMobileMenuOpen && (
                            <motion.div
                                initial={{ x: '100%' }}
                                animate={{ x: 0 }}
                                exit={{ x: '100%' }}
                                className="fixed inset-y-0 right-0 w-80 bg-white dark:bg-gray-800 shadow-2xl z-50 lg:hidden overflow-y-auto"
                            >
                                <div className="p-6 border-b dark:border-gray-700 flex justify-between items-center">
                                    <h2 className="text-xl font-bold">Menu</h2>
                                    <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                                        <FiX size={24} />
                                    </button>
                                </div>
                                <nav className="p-4">
                                    {sidebarNav.map((item) => {
                                        const Icon = item.icon;
                                        return (
                                            <button
                                                key={item.id}
                                                onClick={() => {
                                                    setActiveTab(item.id);
                                                    setIsMobileMenuOpen(false);
                                                }}
                                                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl mb-1 transition-all ${
                                                    activeTab === item.id ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600' : 'text-gray-700 dark:text-gray-300'
                                                }`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <Icon size={20} />
                                                    <span className="font-medium">{item.label}</span>
                                                </div>
                                                {item.badge > 0 && (
                                                    <span className="px-2 py-0.5 bg-gray-200 dark:bg-gray-600 rounded-full text-xs">
                                                        {item.badge}
                                                    </span>
                                                )}
                                            </button>
                                        );
                                    })}
                                    <div className="border-t dark:border-gray-700 my-4 pt-4">
                                        <button
                                            onClick={handleLogout}
                                            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-600 mt-2"
                                        >
                                            <FiLogOut size={20} />
                                            <span>Logout</span>
                                        </button>
                                    </div>
                                </nav>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Main Content */}
                    <div className="flex-1">
                        {/* Overview Tab */}
                        {activeTab === "overview" && (
                            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                                    <div>
                                        <h1 className="font-serif text-4xl text-gray-950 dark:text-white">My Profile</h1>
                                        <p className="mt-1 text-sm text-gray-500">Manage your personal information and account details</p>
                                    </div>
                                    <button onClick={() => setIsEditingProfile(true)} className="inline-flex items-center justify-center gap-2 bg-black px-6 py-3 text-xs font-semibold tracking-wide text-white hover:bg-[#b98237]">
                                        <FiEdit2 size={16} /> EDIT PROFILE
                                    </button>
                                </div>

                                <section className="rounded-md border border-[#e8e1d6] bg-white p-6 shadow-[0_6px_24px_rgba(28,24,18,0.04)] dark:border-gray-700 dark:bg-gray-800">
                                    <div className="grid gap-7 xl:grid-cols-[1.35fr_1fr] xl:items-center">
                                        <div className="flex flex-col items-center gap-5 sm:flex-row">
                                            <div className="relative shrink-0">
                                                {user.profileImage || user.avatar ? (
                                                    <img src={user.profileImage || user.avatar} alt={`${user.firstName} ${user.lastName}`} className="h-32 w-32 rounded-full object-cover" />
                                                ) : (
                                                    <div className="flex h-32 w-32 items-center justify-center rounded-full bg-[#171717] font-serif text-4xl text-white">
                                                        {user.firstName?.charAt(0)}{user.lastName?.charAt(0)}
                                                    </div>
                                                )}
                                                <button onClick={() => setIsEditingProfile(true)} className="absolute bottom-1 right-1 rounded-full border border-[#ddd3c4] bg-white p-2 shadow"><FiEdit2 size={14} /></button>
                                            </div>
                                            <div className="text-center sm:text-left">
                                                <h2 className="font-serif text-3xl text-gray-950 dark:text-white">{user.firstName} {user.lastName}</h2>
                                                <span className="mt-2 inline-block rounded bg-[#f5ecdd] px-3 py-1 text-[11px] font-semibold tracking-wide text-[#a86f25]">ZAMED PREMIUM MEMBER</span>
                                                <p className="mt-4 flex items-center justify-center gap-2 text-sm text-gray-600 sm:justify-start dark:text-gray-300"><FiMail className="text-[#b98237]" /> {user.email}</p>
                                                <p className="mt-2 flex items-center justify-center gap-2 text-sm text-gray-600 sm:justify-start dark:text-gray-300"><FiPhone className="text-[#b98237]" /> {user.phone || user.phoneNumber || 'Add phone number'}</p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-3 divide-x divide-[#e8e1d6] border-t border-[#e8e1d6] pt-6 xl:border-l xl:border-t-0 xl:pl-7 xl:pt-0">
                                            <button onClick={() => setActiveTab('orders')} className="px-3 text-center">
                                                <FiShoppingBag className="mx-auto text-2xl text-[#b98237]" />
                                                <p className="mt-2 font-serif text-3xl">{stats.totalOrders}</p>
                                                <p className="text-xs text-gray-500">Orders</p>
                                            </button>
                                            <button onClick={() => setActiveTab('wishlist')} className="px-3 text-center">
                                                <FiHeart className="mx-auto text-2xl text-[#b98237]" />
                                                <p className="mt-2 font-serif text-3xl">{stats.savedItems}</p>
                                                <p className="text-xs text-gray-500">Wishlist</p>
                                            </button>
                                            <div className="px-3 text-center">
                                                <FiStar className="mx-auto text-2xl text-[#b98237]" />
                                                <p className="mt-2 font-serif text-3xl">{user.reviewCount || user.reviews?.length || 0}</p>
                                                <p className="text-xs text-gray-500">Reviews</p>
                                            </div>
                                        </div>
                                    </div>
                                </section>

                                <section className="rounded-md border border-[#e8e1d6] bg-white p-6 shadow-[0_6px_24px_rgba(28,24,18,0.04)] dark:border-gray-700 dark:bg-gray-800">
                                    <div className="mb-5 flex items-center justify-between">
                                        <h2 className="font-serif text-2xl">Personal Information</h2>
                                        <button onClick={() => setIsEditingProfile(true)} className="text-xs font-semibold text-[#a86f25] hover:underline">EDIT</button>
                                    </div>
                                    <div className="grid gap-x-8 gap-y-5 md:grid-cols-3">
                                        {[
                                            ['Full Name', `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Not provided'],
                                            ['Phone Number', user.phone || user.phoneNumber || 'Not provided'],
                                            ['Gender', user.gender || 'Not provided'],
                                            ['Email Address', user.email],
                                            ['Date of Birth', user.dateOfBirth ? formatDate(user.dateOfBirth) : 'Not provided'],
                                            ['Member Since', stats.memberSince ? formatDate(stats.memberSince) : 'Not available']
                                        ].map(([label, value]) => (
                                            <div key={label} className="border-b border-[#eee8df] pb-4">
                                                <p className="text-xs font-medium text-gray-500">{label}</p>
                                                <p className="mt-2 text-sm text-gray-900 dark:text-gray-100">{value}</p>
                                            </div>
                                        ))}
                                    </div>
                                </section>

                                <section className="rounded-md border border-[#e8e1d6] bg-white p-6 shadow-[0_6px_24px_rgba(28,24,18,0.04)] dark:border-gray-700 dark:bg-gray-800">
                                    <div className="mb-5 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <h2 className="font-serif text-2xl">Default Address</h2>
                                            <span className="rounded-full bg-[#f5ecdd] px-3 py-1 text-[11px] text-[#a86f25]">Default</span>
                                        </div>
                                        <button onClick={() => setActiveTab('addresses')} className="inline-flex items-center gap-2 border border-[#ddd3c4] px-4 py-2 text-xs font-semibold hover:border-[#b98237] hover:text-[#a86f25]"><FiEdit2 /> EDIT</button>
                                    </div>
                                    {addresses.find(address => address.isDefault) || addresses[0] ? (() => {
                                        const address = addresses.find(address => address.isDefault) || addresses[0];
                                        return <div className="flex gap-4">
                                            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md bg-[#fbf6ee] text-[#b98237]"><FiMapPin size={24} /></div>
                                            <div className="text-sm leading-6 text-gray-700 dark:text-gray-300">
                                                <p className="font-semibold text-gray-950 dark:text-white">{address.label || 'Home'}</p>
                                                <p>{address.street}</p>
                                                <p>{[address.city, address.state, address.zipCode].filter(Boolean).join(', ')}</p>
                                                <p>{address.country}</p>
                                                {address.phone && <p>{address.phone}</p>}
                                            </div>
                                        </div>;
                                    })() : (
                                        <div className="flex flex-col items-start gap-3 text-sm text-gray-500">
                                            <p>No address has been added yet.</p>
                                            <button onClick={() => setActiveTab('addresses')} className="bg-black px-5 py-2.5 text-xs font-semibold text-white hover:bg-[#b98237]">ADD ADDRESS</button>
                                        </div>
                                    )}
                                </section>

                                <section className="rounded-md border border-[#e8e1d6] bg-white p-6 shadow-[0_6px_24px_rgba(28,24,18,0.04)] dark:border-gray-700 dark:bg-gray-800">
                                    <div className="flex items-center justify-between">
                                        <h2 className="font-serif text-2xl">Recent Orders</h2>
                                        <button onClick={() => setActiveTab('orders')} className="inline-flex items-center gap-2 border border-[#ddd3c4] px-4 py-2 text-xs font-semibold hover:border-[#b98237] hover:text-[#a86f25]">VIEW ALL ORDERS <FiArrowRight /></button>
                                    </div>
                                    <div className="mt-4 divide-y divide-[#eee8df]">
                                        {orders.slice(0, 3).map(order => (
                                            <div key={order.id} className="flex flex-col justify-between gap-3 py-4 sm:flex-row sm:items-center">
                                                <div><p className="text-sm font-semibold">Order #{order.id}</p><p className="mt-1 text-xs text-gray-500">{formatDate(order.date)}</p></div>
                                                <div className="flex items-center gap-4"><span className={`rounded-full px-3 py-1 text-[11px] font-semibold ${getOrderStatusBadge(order.status)}`}>{order.status?.toUpperCase()}</span><strong>{formatPrice(order.total)}</strong></div>
                                            </div>
                                        ))}
                                        {orders.length === 0 && <div className="py-8 text-center text-sm text-gray-500">No orders yet. <Link to="/collections/all" className="font-semibold text-[#a86f25]">Start shopping</Link></div>}
                                    </div>
                                </section>
                            </motion.div>
                        )}

                        {/* Orders Tab */}
                        {activeTab === "orders" && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6"
                            >
                                <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                                    <FiShoppingBag className="text-blue-600" /> My Orders ({orders.length})
                                </h2>
                                
                                <div className="flex flex-wrap gap-4 mb-6 pb-4 border-b dark:border-gray-700">
                                    <div className="flex-1 min-w-[200px]">
                                        <div className="relative">
                                            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                            <input
                                                type="text"
                                                placeholder="Search orders..."
                                                value={searchOrder}
                                                onChange={(e) => setSearchOrder(e.target.value)}
                                                className="w-full pl-10 pr-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-blue-500"
                                            />
                                        </div>
                                    </div>
                                    <select
                                        value={orderFilter}
                                        onChange={(e) => setOrderFilter(e.target.value)}
                                        className="px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="all">All Orders</option>
                                        <option value="pending">Pending</option>
                                        <option value="processing">Processing</option>
                                        <option value="shipped">Shipped</option>
                                        <option value="delivered">Delivered</option>
                                        <option value="cancelled">Cancelled</option>
                                    </select>
                                    <select
                                        value={orderSort}
                                        onChange={(e) => setOrderSort(e.target.value)}
                                        className="px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="newest">Newest First</option>
                                        <option value="oldest">Oldest First</option>
                                        <option value="highest">Highest Amount</option>
                                    </select>
                                </div>

                                {filteredOrders.length === 0 ? (
                                    <div className="text-center py-16">
                                        <FiShoppingBag className="w-20 h-20 text-gray-300 mx-auto mb-4" />
                                        <p className="text-gray-500 text-lg">No orders found</p>
                                        <Link to="/collections/all" className="inline-block mt-4 bg-blue-600 text-white px-6 py-2 rounded-xl hover:bg-blue-700 transition-all">
                                            Start Shopping →
                                        </Link>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {filteredOrders.map((order) => (
                                            <div key={order.id} className="border-2 border-gray-100 dark:border-gray-700 rounded-xl p-5 hover:shadow-lg transition-all">
                                                <div className="flex flex-wrap justify-between items-start mb-4">
                                                    <div>
                                                        <p className="font-bold text-lg">Order #{order.id}</p>
                                                        <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                                                            <FiCalendar size={12} /> {formatDate(order.date)}
                                                        </p>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getOrderStatusBadge(order.status)}`}>
                                                            {order.status?.toUpperCase()}
                                                        </span>
                                                        <p className="text-xl font-bold text-blue-600 mt-1">{formatPrice(order.total)}</p>
                                                    </div>
                                                </div>
                                                
                                                <div className="space-y-2">
                                                    {order.itemsList?.slice(0, 2).map((item, idx) => (
                                                        <div key={idx} className="flex items-center gap-3 p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                                            <img src={item.image} alt={item.name} className="w-12 h-12 object-cover rounded-lg" />
                                                            <div className="flex-1">
                                                                <p className="font-medium">{item.name}</p>
                                                                <p className="text-xs text-gray-500">Qty: {item.quantity} | {formatPrice(item.price)}</p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                    {order.itemsList?.length > 2 && (
                                                        <p className="text-xs text-gray-500 text-center">+{order.itemsList.length - 2} more items</p>
                                                    )}
                                                </div>
                                                
                                                <div className="flex flex-wrap gap-3 pt-4 border-t mt-3">
                                                    <Link to={`/product/${order.itemsList?.[0]?.id}`} className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-all">
                                                        View Details
                                                    </Link>
                                                    {order.status !== 'cancelled' && order.status !== 'delivered' && (
                                                        <button onClick={() => cancelOrder(order.id)} disabled={cancellingOrderId === order.id} className="px-4 py-2 border border-red-600 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 transition-all">
                                                            Cancel Order
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {/* Wishlist Tab */}
                        {activeTab === "wishlist" && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6"
                            >
                                <div className="flex justify-between items-center mb-6">
                                    <h2 className="text-2xl font-bold flex items-center gap-2">
                                        <FiHeart className="text-red-500" /> My Wishlist ({favorites.length})
                                    </h2>
                                    <div className="flex gap-2">
                                        <button onClick={() => setWishlistView("grid")} className={`p-2 rounded-lg ${wishlistView === "grid" ? "bg-blue-100 text-blue-600" : "bg-gray-100"}`}>
                                            <FiGrid size={18} />
                                        </button>
                                        <button onClick={() => setWishlistView("list")} className={`p-2 rounded-lg ${wishlistView === "list" ? "bg-blue-100 text-blue-600" : "bg-gray-100"}`}>
                                            <FiList size={18} />
                                        </button>
                                    </div>
                                </div>
                                
                                {favorites.length === 0 ? (
                                    <div className="text-center py-16">
                                        <FiHeart className="w-20 h-20 text-gray-300 mx-auto mb-4" />
                                        <p className="text-gray-500 text-lg">Your wishlist is empty</p>
                                        <p className="text-sm text-gray-400 mt-2">Click the heart icon on any product to add it to your wishlist</p>
                                        <Link to="/collections/all" className="inline-block mt-4 bg-blue-600 text-white px-6 py-2 rounded-xl hover:bg-blue-700 transition-all">
                                            Explore Products →
                                        </Link>
                                    </div>
                                ) : wishlistView === "grid" ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {favorites.map((product) => (
                                            <div key={product.id} className="border-2 border-gray-100 dark:border-gray-700 rounded-2xl p-4 hover:shadow-xl transition-all group">
                                                <div className="relative">
                                                    <img 
                                                        src={product.image && (product.image.startsWith('data:') || product.image.startsWith('http')) ? product.image : 'https://via.placeholder.com/300x300?text=No+Image'} 
                                                        alt={product.name} 
                                                        className="w-full h-48 object-cover rounded-xl mb-3 group-hover:scale-105 transition-transform duration-300"
                                                        onError={(e) => { e.target.src = 'https://via.placeholder.com/300x300?text=No+Image'; }}
                                                    />
                                                    <button onClick={() => removeFromFavorites(product.id)} className="absolute top-2 right-2 bg-white rounded-full p-2 shadow-md hover:scale-110 transition-transform">
                                                        <FiTrash2 size={16} className="text-red-500" />
                                                    </button>
                                                </div>
                                                <h3 className="font-semibold text-gray-800 dark:text-white text-lg">{product.name}</h3>
                                                <p className="text-gray-500 text-sm mt-1">{product.brand || "Zamed"}</p>
                                                <p className="text-blue-600 font-bold text-xl mt-2">{formatPrice(product.price)}</p>
                                                <div className="flex gap-3 mt-4">
                                                    <button onClick={() => addToCartFromFavorites(product)} className="flex-1 bg-gray-900 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-gray-800 transition-all">
                                                        Add to Cart
                                                    </button>
                                                    <Link 
                                                        to={`/product/${product.id}`} 
                                                        className="px-5 py-2.5 border-2 border-gray-300 text-gray-700 rounded-xl text-sm font-medium hover:border-blue-600 hover:text-blue-600 transition-all"
                                                        onClick={() => window.scrollTo(0, 0)}
                                                    >
                                                        View
                                                    </Link>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {favorites.map((product) => (
                                            <div key={product.id} className="flex items-center gap-4 p-4 border rounded-xl hover:shadow-md transition-all">
                                                <img 
                                                    src={product.image && (product.image.startsWith('data:') || product.image.startsWith('http')) ? product.image : 'https://via.placeholder.com/80x80?text=No+Image'} 
                                                    alt={product.name} 
                                                    className="w-20 h-20 object-cover rounded-lg"
                                                    onError={(e) => { e.target.src = 'https://via.placeholder.com/80x80?text=No+Image'; }}
                                                />
                                                <div className="flex-1">
                                                    <h3 className="font-semibold">{product.name}</h3>
                                                    <p className="text-sm text-gray-500">{product.brand || "Zamed"}</p>
                                                    <p className="text-blue-600 font-bold">{formatPrice(product.price)}</p>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button onClick={() => addToCartFromFavorites(product)} className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm hover:bg-gray-800">
                                                        Add to Cart
                                                    </button>
                                                    <Link 
                                                        to={`/product/${product.id}`}
                                                        onClick={() => window.scrollTo(0, 0)}
                                                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:border-blue-600 hover:text-blue-600 transition-all"
                                                    >
                                                        View
                                                    </Link>
                                                    <button onClick={() => removeFromFavorites(product.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                                                        <FiTrash2 size={18} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {/* Coupons Tab - With deletion sync */}
                        {activeTab === "coupons" && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6"
                            >
                                <div className="flex items-center justify-between mb-6">
                                    <h2 className="text-2xl font-bold flex items-center gap-2">
                                        <FiTag className="text-green-600" /> My Coupons ({userCoupons.length})
                                    </h2>
                                    {userCoupons.length > 0 && (
                                        <span className="text-sm text-gray-500 dark:text-gray-400">
                                            {userCoupons.filter(c => !c.used && (!c.endDate || new Date(c.endDate) > new Date())).length} active
                                        </span>
                                    )}
                                </div>

                                {userCoupons.length === 0 ? (
                                    <div className="text-center py-16">
                                        <FiTag className="w-20 h-20 text-gray-300 mx-auto mb-4" />
                                        <p className="text-gray-500 text-lg">No coupons available</p>
                                        <p className="text-sm text-gray-400 mt-2">Coupons will appear here when you receive special offers</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {userCoupons.map((coupon) => {
                                            const isExpired = coupon.endDate && new Date(coupon.endDate) < new Date();
                                            const isUsed = coupon.used === true;
                                            const isActive = !isExpired && !isUsed;

                                            return (
                                                <motion.div
                                                    key={coupon.id || coupon.code}
                                                    initial={{ opacity: 0, scale: 0.95 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    whileHover={{ y: -4 }}
                                                    className="overflow-hidden rounded-2xl border border-[#e6dccb] bg-white shadow-[0_8px_25px_rgba(40,28,10,0.06)] transition-all hover:shadow-lg dark:border-gray-700 dark:bg-gray-800"
                                                >
                                                    <div
                                                        className={`relative overflow-hidden bg-gradient-to-br ${cardAccent(coupon.discountType)} p-5 text-white`}
                                                        style={getCouponBackgroundStyle(coupon)}
                                                    >
                                                        {coupon.backgroundImage && getCouponBackgroundStyle(coupon) && (
                                                            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-black/20" />
                                                        )}
                                                        <div className="relative z-[1]">
                                                            <div className="flex items-start justify-between gap-4">
                                                                <div>
                                                                    <p className="text-[10px] font-semibold tracking-[0.2em] text-[#e6bd70]">
                                                                        {isActive ? "ACTIVE OFFER" : isExpired ? "EXPIRED" : "USED"}
                                                                    </p>
                                                                    <h3 className="mt-2 font-serif text-2xl sm:text-3xl">{getDiscountLabel(coupon)}</h3>
                                                                    <p className="mt-1 text-sm text-white/65 line-clamp-1">{coupon.title || coupon.description}</p>
                                                                </div>
                                                                <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase ${
                                                                    isActive ? "bg-emerald-400/20 text-emerald-300" :
                                                                    isExpired ? "bg-red-400/20 text-red-300" :
                                                                    "bg-white/10 text-white/60"
                                                                }`}>
                                                                    {isActive ? "Active" : isExpired ? "Expired" : "Used"}
                                                                </span>
                                                            </div>
                                                            <div className="mt-4 flex items-center justify-between rounded-xl border border-white/15 bg-black/20 px-4 py-2.5">
                                                                <span className="font-mono text-base font-bold tracking-[0.12em] sm:text-lg">{coupon.code}</span>
                                                                <button
                                                                    onClick={() => {
                                                                        navigator.clipboard.writeText(coupon.code);
                                                                        toast.success(`Coupon code ${coupon.code} copied!`);
                                                                    }}
                                                                    className="rounded-lg p-1.5 text-[#e8bf75] transition hover:bg-white/10"
                                                                >
                                                                    <FiCopy size={16} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="p-5">
                                                        <p className="text-sm leading-6 text-gray-500 dark:text-gray-400 line-clamp-2">
                                                            {coupon.description || "Premium discount for ZAMED customers."}
                                                        </p>
                                                        <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                                                            <div className="rounded-xl bg-[#faf7f1] p-2.5 dark:bg-gray-700/50">
                                                                <span className="text-gray-400">Minimum order</span>
                                                                <p className="mt-0.5 font-semibold text-gray-900 dark:text-white">
                                                                    {coupon.minPurchase > 0 ? `${currencySymbol}${coupon.minPurchase}` : "No minimum"}
                                                                </p>
                                                            </div>
                                                            <div className="rounded-xl bg-[#faf7f1] p-2.5 dark:bg-gray-700/50">
                                                                <span className="text-gray-400">Valid until</span>
                                                                <p className="mt-0.5 font-semibold text-gray-900 dark:text-white">
                                                                    {coupon.endDate ? new Date(coupon.endDate).toLocaleDateString() : "No expiry"}
                                                                </p>
                                                            </div>
                                                        </div>

                                                        <div className="mt-4 flex flex-wrap gap-2">
                                                            <button
                                                                onClick={() => {
                                                                    navigator.clipboard.writeText(coupon.code);
                                                                    toast.success(`Coupon code ${coupon.code} copied!`);
                                                                }}
                                                                className="flex-1 rounded-xl bg-[#171511] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#b47a29] flex items-center justify-center gap-2"
                                                            >
                                                                <FiCopy size={14} /> Copy Code
                                                            </button>
                                                            {isActive && (
                                                                <Link
                                                                    to="/collections/all"
                                                                    className="flex-1 rounded-xl border border-[#ded4c5] px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:border-[#b47a29] hover:text-[#a36d23] flex items-center justify-center gap-2 dark:border-gray-600 dark:text-gray-300"
                                                                >
                                                                    Shop Now <FiArrowRight size={14} />
                                                                </Link>
                                                            )}
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            );
                                        })}
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {/* Notifications Tab - liquid glass centre */}
                        {activeTab === "notifications" && (
                            <motion.div
                                initial={{ opacity: 0, y: 30, scale: 0.985 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                className="relative overflow-hidden rounded-[34px] border border-white/60 bg-white/55 p-1 shadow-[0_30px_100px_rgba(30,22,12,.14)] backdrop-blur-3xl dark:border-white/10 dark:bg-gray-900/55"
                            >
                                <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-amber-300/25 blur-3xl" />
                                <div className="pointer-events-none absolute -bottom-24 -right-20 h-80 w-80 rounded-full bg-blue-300/20 blur-3xl" />

                                <div className="relative rounded-[30px] border border-white/50 bg-gradient-to-br from-white/75 via-white/45 to-white/20 p-5 backdrop-blur-2xl sm:p-8 dark:border-white/10 dark:from-gray-800/80 dark:via-gray-900/65 dark:to-gray-900/35">
                                    <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                                        <div>
                                            <p className="text-[11px] font-bold tracking-[.28em] text-[#b47a29]">LIQUID ACTIVITY CENTRE</p>
                                            <h2 className="mt-2 font-serif text-4xl">Notifications</h2>
                                            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Orders, offers and store updates in one place.</p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="rounded-full border border-white/70 bg-white/50 px-4 py-2 text-xs shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/5">
                                                {notifications.filter(n => !n.read).length} unread
                                            </span>
                                            {notifications.some(n => !n.read) && (
                                                <button onClick={markAllNotificationsAsRead} className="rounded-full bg-black px-4 py-2 text-xs font-semibold text-white transition hover:-translate-y-0.5 hover:bg-[#b47a29]">
                                                    Mark all read
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {notifications.length === 0 ? (
                                        <div className="py-20 text-center">
                                            <motion.div
                                                animate={{ y: [0, -8, 0], rotate: [-3, 3, -3] }}
                                                transition={{ duration: 3.5, repeat: Infinity }}
                                                className="mx-auto flex h-24 w-24 items-center justify-center rounded-[30px] border border-white/70 bg-white/50 text-4xl text-[#b47a29] shadow-xl backdrop-blur-2xl dark:border-white/10 dark:bg-white/5"
                                            >
                                                <FiBell />
                                            </motion.div>
                                            <p className="mt-6 font-serif text-2xl">You are all caught up</p>
                                        </div>
                                    ) : (
                                        <motion.div layout className="grid gap-4">
                                            <AnimatePresence mode="popLayout">
                                                {notifications.map((notif, index) => {
                                                    const image = getNotificationImage(notif);
                                                    const isOrder = notif.type === "order";
                                                    const isCoupon = notif.type === "coupon";
                                                    return (
                                                        <motion.article
                                                            layout
                                                            key={notif.id}
                                                            initial={{ opacity: 0, y: 22, filter: "blur(8px)" }}
                                                            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                                                            exit={{ opacity: 0, x: -30, scale: .96 }}
                                                            transition={{ delay: Math.min(index * .04, .3), type: "spring", stiffness: 240, damping: 24 }}
                                                            whileHover={{ y: -5, scale: 1.006 }}
                                                            className={`group relative overflow-hidden rounded-[26px] border p-3 shadow-[0_14px_45px_rgba(30,22,12,.08)] backdrop-blur-2xl sm:p-4 ${!notif.read ? "border-amber-300/70 bg-amber-50/65 dark:bg-amber-950/20" : "border-white/75 bg-white/55 dark:border-white/10 dark:bg-white/5"}`}
                                                        >
                                                            <div className="absolute inset-0 bg-gradient-to-br from-white/35 via-transparent to-white/5" />
                                                            {!notif.read && (
                                                                <motion.span
                                                                    animate={{ scale: [1, 1.8, 1], opacity: [1, .15, 1] }}
                                                                    transition={{ duration: 2.2, repeat: Infinity }}
                                                                    className="absolute right-5 top-5 h-2.5 w-2.5 rounded-full bg-amber-500"
                                                                />
                                                            )}

                                                            <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center">
                                                                <div className="h-24 w-full shrink-0 overflow-hidden rounded-[20px] border border-white/60 bg-white/40 shadow-inner sm:h-24 sm:w-24 dark:border-white/10 dark:bg-white/5">
                                                                    {image ? (
                                                                        <img src={image} alt={notif.title || "Notification"} className="h-full w-full object-cover transition duration-500 group-hover:scale-110" />
                                                                    ) : (
                                                                        <div className={`flex h-full w-full items-center justify-center text-3xl ${isOrder ? "text-blue-600" : isCoupon ? "text-amber-600" : "text-gray-500"}`}>
                                                                            {isOrder ? <FiPackage /> : isCoupon ? <FiGift /> : <FiBell />}
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                <div className="min-w-0 flex-1">
                                                                    <div className="flex flex-wrap items-center gap-2">
                                                                        <h3 className="font-semibold text-gray-950 dark:text-white">{notif.title}</h3>
                                                                        <span className="rounded-full border border-white/70 bg-white/55 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-gray-600 backdrop-blur-xl dark:border-white/10 dark:bg-white/5 dark:text-gray-300">
                                                                            {isOrder ? "Order" : isCoupon ? "Offer" : notif.type || "Update"}
                                                                        </span>
                                                                    </div>
                                                                    <p className="mt-1 line-clamp-2 text-sm leading-6 text-gray-500 dark:text-gray-400">{notif.message}</p>
                                                                    <p className="mt-2 text-xs text-gray-400">{formatDateTime(notif.date)}</p>
                                                                </div>

                                                                <button
                                                                    onClick={() => viewNotificationDetails(notif)}
                                                                    className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl border border-white/80 bg-white/65 px-4 py-3 text-xs font-bold text-gray-900 shadow-sm backdrop-blur-xl transition hover:-translate-y-1 hover:bg-black hover:text-white dark:border-white/10 dark:bg-white/10 dark:text-white"
                                                                >
                                                                    View details <FiArrowRight className="transition group-hover:translate-x-1" />
                                                                </button>
                                                            </div>
                                                        </motion.article>
                                                    );
                                                })}
                                            </AnimatePresence>
                                        </motion.div>
                                    )}
                                </div>
                            </motion.div>
                        )}

                        {/* Returns Tab */}
                        {activeTab === "returns" && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6"
                            >
                                <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                                    <FiShield className="text-orange-600" /> Returns & Refunds
                                </h2>
                                
                                {returnRequests.length === 0 ? (
                                    <div className="text-center py-16">
                                        <FiShield className="w-20 h-20 text-gray-300 mx-auto mb-4" />
                                        <p className="text-gray-500 text-lg">No return requests yet</p>
                                        <p className="text-sm text-gray-400 mt-2">When you request a return, it will appear here with full tracking</p>
                                    </div>
                                ) : (
                                    <div className="space-y-6">
                                        {returnRequests.map((returnReq) => (
                                            <div 
                                                key={returnReq.id} 
                                                className="border-2 rounded-xl p-5 cursor-pointer hover:shadow-lg transition-all"
                                                onClick={() => setSelectedReturnRequest(returnReq)}
                                            >
                                                <div className="flex flex-wrap justify-between items-start mb-4">
                                                    <div className="flex gap-3">
                                                        {returnReq.productImage && (
                                                            <img src={returnReq.productImage} alt={returnReq.productName} className="w-16 h-16 object-cover rounded-lg" />
                                                        )}
                                                        <div>
                                                            <p className="font-medium">{returnReq.productName}</p>
                                                            <p className="text-xs text-gray-500">Return ID: #{returnReq.id}</p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="flex items-center gap-1">
                                                            {getReturnStatusIcon(returnReq.status)}
                                                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getReturnStatusBadge(returnReq.status)}`}>
                                                                {getReturnStatusText(returnReq.status)}
                                                            </span>
                                                        </div>
                                                        <p className="text-lg font-bold text-green-600 mt-2">{formatPrice(returnReq.refundAmount)}</p>
                                                    </div>
                                                </div>
                                                
                                                <div className="mt-4">
                                                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                                                        <span>Requested</span>
                                                        <span>Pickup</span>
                                                        <span>Collected</span>
                                                        <span>Verified</span>
                                                        <span>Refunded</span>
                                                    </div>
                                                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                                        <div 
                                                            className="h-full bg-gradient-to-r from-yellow-500 via-blue-500 to-green-500 rounded-full transition-all duration-500"
                                                            style={{ width: `${returnStages[returnReq.status]?.progress || 0}%` }}
                                                        ></div>
                                                    </div>
                                                </div>
                                                
                                                <div className="mt-3 text-xs text-gray-500 flex items-center gap-2">
                                                    <FiInfo size={12} />
                                                    <span>Click to view full tracking history and refund details</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {/* Addresses Tab */}
                        {activeTab === "addresses" && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6"
                            >
                                <div className="flex justify-between items-center mb-6">
                                    <h2 className="text-2xl font-bold flex items-center gap-2">
                                        <FiMapPin className="text-green-600" /> My Addresses
                                    </h2>
                                    <button onClick={() => setShowAddAddress(true)} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-all flex items-center gap-2">
                                        <FiPlus size={16} /> Add New Address
                                    </button>
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {addresses.map((address) => (
                                        <div key={address.id} className={`border-2 rounded-xl p-4 ${address.isDefault ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700'}`}>
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="flex items-center gap-2">
                                                    {address.isDefault && (
                                                        <span className="px-2 py-0.5 bg-blue-600 text-white text-xs rounded-full">Default</span>
                                                    )}
                                                </div>
                                                <div className="flex gap-2">
                                                    {!address.isDefault && (
                                                        <button onClick={() => setDefaultAddress(address.id)} className="text-xs text-blue-600 hover:underline">
                                                            Set Default
                                                        </button>
                                                    )}
                                                    <button onClick={() => deleteAddress(address.id)} className="text-red-500 hover:text-red-700">
                                                        <FiTrash2 size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                            <p className="font-medium">{address.street}</p>
                                            <p className="text-sm text-gray-600 dark:text-gray-400">{address.city}, {address.state}</p>
                                            <p className="text-sm text-gray-600 dark:text-gray-400">{address.zipCode}, {address.country}</p>
                                            {address.phone && <p className="text-sm text-gray-500 mt-1">📞 {address.phone}</p>}
                                        </div>
                                    ))}
                                </div>
                                
                                {addresses.length === 0 && (
                                    <div className="text-center py-12">
                                        <FiMapPin className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                                        <p className="text-gray-500">No addresses saved yet</p>
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {/* Security Tab */}
                        {activeTab === "security" && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6"
                            >
                                <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                                    <FiLock className="text-gray-600" /> Security Settings
                                </h2>
                                
                                <div className="space-y-6">
                                    <div className="border-b pb-4">
                                        <h3 className="font-semibold mb-2">Password</h3>
                                        <p className="text-sm text-gray-500 mb-3">Last changed: {new Date().toLocaleDateString()}</p>
                                        <button className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition-all">
                                            Change Password
                                        </button>
                                    </div>
                                    
                                    <div className="border-b pb-4">
                                        <h3 className="font-semibold mb-2">Two-Factor Authentication</h3>
                                        <p className="text-sm text-gray-500 mb-3">Add an extra layer of security to your account</p>
                                        <button className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 transition-all">
                                            Enable 2FA
                                        </button>
                                    </div>
                                    
                                    <div>
                                        <h3 className="font-semibold mb-2">Active Sessions</h3>
                                        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                                            <div className="flex justify-between items-center">
                                                <div>
                                                    <p className="font-medium">Current Session</p>
                                                    <p className="text-xs text-gray-500">Browser • {new Date().toLocaleString()}</p>
                                                </div>
                                                <span className="text-xs text-green-600">Active now</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* Settings Tab */}
                        {activeTab === "settings" && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6"
                            >
                                <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                                    <FiSettings className="text-gray-600" /> Preferences
                                </h2>
                                
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center py-3 border-b">
                                        <div>
                                            <p className="font-medium">Email Notifications</p>
                                            <p className="text-sm text-gray-500">Receive order updates and promotions</p>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input type="checkbox" className="sr-only peer" defaultChecked />
                                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                        </label>
                                    </div>
                                    
                                    <div className="flex justify-between items-center py-3 border-b">
                                        <div>
                                            <p className="font-medium">SMS Alerts</p>
                                            <p className="text-sm text-gray-500">Get delivery updates via SMS</p>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input type="checkbox" className="sr-only peer" />
                                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                        </label>
                                    </div>
                                    
                                    <div className="flex justify-between items-center py-3 border-b">
                                        <div>
                                            <p className="font-medium">Language</p>
                                            <p className="text-sm text-gray-500">Choose your preferred language</p>
                                        </div>
                                        <select className="px-3 py-1 border rounded-lg">
                                            <option>English</option>
                                            <option>Spanish</option>
                                            <option>French</option>
                                        </select>
                                    </div>
                                    
                                    <div className="flex justify-between items-center py-3">
                                        <div>
                                            <p className="font-medium">Currency</p>
                                            <p className="text-sm text-gray-500">{currencyCode} - {currencySymbol}</p>
                                        </div>
                                        <select className="px-3 py-1 border rounded-lg" value={currencyCode}>
                                            <option>USD</option>
                                            <option>EUR</option>
                                            <option>GBP</option>
                                            <option>LKR</option>
                                        </select>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </div>
                </div>

                {/* Premium Edit Profile Modal - Keep the same */}
                <AnimatePresence>
                    {isEditingProfile && (
                        <motion.div
                            className="fixed inset-0 z-[70] flex items-end justify-center bg-black/65 p-0 backdrop-blur-md sm:items-center sm:p-5"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onMouseDown={(event) => {
                                if (event.target === event.currentTarget && !isSavingProfile) {
                                    setIsEditingProfile(false);
                                }
                            }}
                        >
                            <motion.div
                                role="dialog"
                                aria-modal="true"
                                aria-labelledby="edit-profile-title"
                                initial={{ opacity: 0, y: 70, scale: 0.97 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 70, scale: 0.97 }}
                                transition={{ type: "spring", stiffness: 280, damping: 28 }}
                                className="relative flex max-h-[96vh] w-full max-w-5xl flex-col overflow-hidden rounded-t-[28px] border border-white/10 bg-[#fbfaf8] shadow-[0_30px_100px_rgba(0,0,0,.45)] sm:max-h-[92vh] sm:rounded-[28px] dark:bg-gray-900"
                            >
                                {/* Header */}
                                <div className="relative overflow-hidden bg-[#111111] px-5 py-5 text-white sm:px-8 sm:py-7">
                                    <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-[#c8954f]/20 blur-3xl" />
                                    <div className="relative flex items-start justify-between gap-5">
                                        <div>
                                            <p className="mb-2 text-[10px] font-semibold tracking-[0.3em] text-[#d8ad70]">
                                                ZAMED PREMIUM ACCOUNT
                                            </p>
                                            <h2 id="edit-profile-title" className="font-serif text-3xl sm:text-4xl">
                                                Edit Your Profile
                                            </h2>
                                            <p className="mt-2 max-w-xl text-sm leading-6 text-white/60">
                                                Keep your personal details and style preferences updated for a more personalised shopping experience.
                                            </p>
                                        </div>
                                        <motion.button
                                            whileHover={{ rotate: 90, scale: 1.05 }}
                                            whileTap={{ scale: 0.92 }}
                                            type="button"
                                            disabled={isSavingProfile}
                                            onClick={() => setIsEditingProfile(false)}
                                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white transition hover:bg-white/10 disabled:opacity-50"
                                            aria-label="Close edit profile"
                                        >
                                            <FiX size={20} />
                                        </motion.button>
                                    </div>
                                </div>

                                <div className="overflow-y-auto">
                                    <div className="grid lg:grid-cols-[280px_1fr]">
                                        {/* Profile preview panel */}
                                        <aside className="border-b border-[#e8e1d6] bg-gradient-to-b from-[#f5ecdd] to-[#fbfaf8] p-6 lg:border-b-0 lg:border-r dark:border-gray-700 dark:from-gray-800 dark:to-gray-900">
                                            <div className="sticky top-0 text-center">
                                                <div className="relative mx-auto h-36 w-36">
                                                    <motion.div
                                                        whileHover={{ scale: 1.025 }}
                                                        className="h-full w-full overflow-hidden rounded-full border-[5px] border-white bg-[#171717] shadow-[0_18px_45px_rgba(35,25,10,.18)] dark:border-gray-700"
                                                    >
                                                        {editedUser.profileImage ? (
                                                            <img
                                                                src={editedUser.profileImage}
                                                                alt="Profile preview"
                                                                className="h-full w-full object-cover"
                                                            />
                                                        ) : (
                                                            <div className="flex h-full w-full items-center justify-center font-serif text-5xl text-white">
                                                                {editedUser.firstName?.charAt(0) || "Z"}
                                                                {editedUser.lastName?.charAt(0) || "P"}
                                                            </div>
                                                        )}
                                                    </motion.div>

                                                    <label className="absolute bottom-1 right-1 flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border-4 border-[#f5ecdd] bg-black text-white shadow-lg transition hover:bg-[#b98237] dark:border-gray-800">
                                                        <FiCamera size={17} />
                                                        <input
                                                            type="file"
                                                            accept="image/png,image/jpeg,image/webp"
                                                            onChange={handleProfileImageChange}
                                                            className="hidden"
                                                        />
                                                    </label>
                                                </div>

                                                <h3 className="mt-5 font-serif text-2xl text-gray-950 dark:text-white">
                                                    {editedUser.preferredName || editedUser.firstName || "Your"}{" "}
                                                    {editedUser.lastName || "Name"}
                                                </h3>
                                                <p className="mt-1 break-all text-xs text-gray-500">{editedUser.email}</p>
                                                <span className="mt-3 inline-flex rounded-full bg-[#ead8bb] px-3 py-1 text-[10px] font-bold tracking-[0.16em] text-[#8b5a1f]">
                                                    PREMIUM MEMBER
                                                </span>

                                                <div className="mt-6 rounded-2xl border border-[#e6d8c4] bg-white/75 p-4 text-left dark:border-gray-700 dark:bg-gray-800/80">
                                                    <div className="flex items-center justify-between text-xs">
                                                        <span className="font-medium text-gray-600 dark:text-gray-300">Profile completion</span>
                                                        <span className="font-bold text-[#a86f25]">
                                                            {Math.round(
                                                                [
                                                                    editedUser.firstName,
                                                                    editedUser.lastName,
                                                                    editedUser.email,
                                                                    editedUser.phone,
                                                                    editedUser.dateOfBirth,
                                                                    editedUser.gender,
                                                                    editedUser.street,
                                                                    editedUser.city,
                                                                    editedUser.postcode,
                                                                    editedUser.preferredSize
                                                                ].filter(Boolean).length * 10
                                                            )}%
                                                        </span>
                                                    </div>
                                                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#e9e1d5] dark:bg-gray-700">
                                                        <motion.div
                                                            initial={{ width: 0 }}
                                                            animate={{
                                                                width: `${Math.round(
                                                                    [
                                                                        editedUser.firstName,
                                                                        editedUser.lastName,
                                                                        editedUser.email,
                                                                        editedUser.phone,
                                                                        editedUser.dateOfBirth,
                                                                        editedUser.gender,
                                                                        editedUser.street,
                                                                        editedUser.city,
                                                                        editedUser.postcode,
                                                                        editedUser.preferredSize
                                                                    ].filter(Boolean).length * 10
                                                                )}%`
                                                            }}
                                                            transition={{ duration: 0.55, ease: "easeOut" }}
                                                            className="h-full rounded-full bg-gradient-to-r from-[#9b6829] to-[#d8ad70]"
                                                        />
                                                    </div>
                                                    <p className="mt-3 text-[11px] leading-5 text-gray-500">
                                                        Complete your profile to improve sizing suggestions, delivery checkout and personalised recommendations.
                                                    </p>
                                                </div>

                                                {editedUser.profileImage && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setProfileField("profileImage", "")}
                                                        className="mt-4 text-xs font-semibold text-red-500 transition hover:text-red-600"
                                                    >
                                                        Remove profile photo
                                                    </button>
                                                )}
                                            </div>
                                        </aside>

                                        {/* Editable form */}
                                        <div className="space-y-8 p-5 sm:p-8">
                                            {/* Personal details */}
                                            <section>
                                                <div className="mb-5 flex items-center gap-3">
                                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f5ecdd] text-[#a86f25]">
                                                        <FiUser size={18} />
                                                    </div>
                                                    <div>
                                                        <h3 className="font-serif text-xl text-gray-950 dark:text-white">Personal details</h3>
                                                        <p className="text-xs text-gray-500">Basic information shown on your account.</p>
                                                    </div>
                                                </div>

                                                <div className="grid gap-4 sm:grid-cols-2">
                                                    <label className="block">
                                                        <span className="mb-2 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                                                            Title
                                                        </span>
                                                        <select
                                                            value={editedUser.title || ""}
                                                            onChange={(e) => setProfileField("title", e.target.value)}
                                                            className="w-full rounded-xl border border-[#ded6ca] bg-white px-4 py-3 text-sm outline-none transition focus:border-[#b98237] focus:ring-4 focus:ring-[#b98237]/10 dark:border-gray-700 dark:bg-gray-800"
                                                        >
                                                            <option value="">Select title</option>
                                                            <option value="Mr">Mr</option>
                                                            <option value="Mrs">Mrs</option>
                                                            <option value="Ms">Ms</option>
                                                            <option value="Miss">Miss</option>
                                                            <option value="Dr">Dr</option>
                                                        </select>
                                                    </label>

                                                    <label className="block">
                                                        <span className="mb-2 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                                                            Preferred name
                                                        </span>
                                                        <input
                                                            type="text"
                                                            value={editedUser.preferredName || ""}
                                                            onChange={(e) => setProfileField("preferredName", e.target.value)}
                                                            placeholder="How should we address you?"
                                                            className="w-full rounded-xl border border-[#ded6ca] bg-white px-4 py-3 text-sm outline-none transition placeholder:text-gray-400 focus:border-[#b98237] focus:ring-4 focus:ring-[#b98237]/10 dark:border-gray-700 dark:bg-gray-800"
                                                        />
                                                    </label>

                                                    <label className="block">
                                                        <span className="mb-2 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                                                            First name <span className="text-red-500">*</span>
                                                        </span>
                                                        <input
                                                            type="text"
                                                            value={editedUser.firstName || ""}
                                                            onChange={(e) => setProfileField("firstName", e.target.value)}
                                                            placeholder="First name"
                                                            className={`w-full rounded-xl border bg-white px-4 py-3 text-sm outline-none transition focus:ring-4 dark:bg-gray-800 ${
                                                                profileErrors.firstName
                                                                    ? "border-red-400 focus:border-red-500 focus:ring-red-500/10"
                                                                    : "border-[#ded6ca] focus:border-[#b98237] focus:ring-[#b98237]/10 dark:border-gray-700"
                                                            }`}
                                                        />
                                                        {profileErrors.firstName && <span className="mt-1.5 block text-xs text-red-500">{profileErrors.firstName}</span>}
                                                    </label>

                                                    <label className="block">
                                                        <span className="mb-2 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                                                            Last name <span className="text-red-500">*</span>
                                                        </span>
                                                        <input
                                                            type="text"
                                                            value={editedUser.lastName || ""}
                                                            onChange={(e) => setProfileField("lastName", e.target.value)}
                                                            placeholder="Last name"
                                                            className={`w-full rounded-xl border bg-white px-4 py-3 text-sm outline-none transition focus:ring-4 dark:bg-gray-800 ${
                                                                profileErrors.lastName
                                                                    ? "border-red-400 focus:border-red-500 focus:ring-red-500/10"
                                                                    : "border-[#ded6ca] focus:border-[#b98237] focus:ring-[#b98237]/10 dark:border-gray-700"
                                                            }`}
                                                        />
                                                        {profileErrors.lastName && <span className="mt-1.5 block text-xs text-red-500">{profileErrors.lastName}</span>}
                                                    </label>

                                                    <label className="block">
                                                        <span className="mb-2 block text-xs font-semibold text-gray-700 dark:text-gray-300">Date of birth</span>
                                                        <input
                                                            type="date"
                                                            value={editedUser.dateOfBirth ? String(editedUser.dateOfBirth).slice(0, 10) : ""}
                                                            onChange={(e) => setProfileField("dateOfBirth", e.target.value)}
                                                            max={new Date().toISOString().split("T")[0]}
                                                            className="w-full rounded-xl border border-[#ded6ca] bg-white px-4 py-3 text-sm outline-none transition focus:border-[#b98237] focus:ring-4 focus:ring-[#b98237]/10 dark:border-gray-700 dark:bg-gray-800"
                                                        />
                                                    </label>

                                                    <label className="block">
                                                        <span className="mb-2 block text-xs font-semibold text-gray-700 dark:text-gray-300">Gender</span>
                                                        <select
                                                            value={editedUser.gender || ""}
                                                            onChange={(e) => setProfileField("gender", e.target.value)}
                                                            className="w-full rounded-xl border border-[#ded6ca] bg-white px-4 py-3 text-sm outline-none transition focus:border-[#b98237] focus:ring-4 focus:ring-[#b98237]/10 dark:border-gray-700 dark:bg-gray-800"
                                                        >
                                                            <option value="">Prefer not to say</option>
                                                            <option value="Male">Male</option>
                                                            <option value="Female">Female</option>
                                                            <option value="Non-binary">Non-binary</option>
                                                            <option value="Other">Other</option>
                                                        </select>
                                                    </label>
                                                </div>
                                            </section>

                                            <div className="h-px bg-[#e9e2d8] dark:bg-gray-700" />

                                            {/* Contact details */}
                                            <section>
                                                <div className="mb-5 flex items-center gap-3">
                                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f5ecdd] text-[#a86f25]">
                                                        <FiMail size={18} />
                                                    </div>
                                                    <div>
                                                        <h3 className="font-serif text-xl text-gray-950 dark:text-white">Contact details</h3>
                                                        <p className="text-xs text-gray-500">Used for order confirmations and delivery updates.</p>
                                                    </div>
                                                </div>

                                                <div className="grid gap-4 sm:grid-cols-2">
                                                    <label className="block">
                                                        <span className="mb-2 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                                                            Email address <span className="text-red-500">*</span>
                                                        </span>
                                                        <div className="relative">
                                                            <FiMail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                                            <input
                                                                type="email"
                                                                value={editedUser.email || ""}
                                                                onChange={(e) => setProfileField("email", e.target.value)}
                                                                placeholder="name@example.com"
                                                                className={`w-full rounded-xl border bg-white py-3 pl-11 pr-4 text-sm outline-none transition focus:ring-4 dark:bg-gray-800 ${
                                                                    profileErrors.email
                                                                        ? "border-red-400 focus:border-red-500 focus:ring-red-500/10"
                                                                        : "border-[#ded6ca] focus:border-[#b98237] focus:ring-[#b98237]/10 dark:border-gray-700"
                                                                }`}
                                                            />
                                                        </div>
                                                        {profileErrors.email && <span className="mt-1.5 block text-xs text-red-500">{profileErrors.email}</span>}
                                                    </label>

                                                    <label className="block">
                                                        <span className="mb-2 block text-xs font-semibold text-gray-700 dark:text-gray-300">Phone number</span>
                                                        <div className="relative">
                                                            <FiPhone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                                            <input
                                                                type="tel"
                                                                value={editedUser.phone || ""}
                                                                onChange={(e) => setProfileField("phone", e.target.value)}
                                                                placeholder="+44 7700 900000"
                                                                className={`w-full rounded-xl border bg-white py-3 pl-11 pr-4 text-sm outline-none transition focus:ring-4 dark:bg-gray-800 ${
                                                                    profileErrors.phone
                                                                        ? "border-red-400 focus:border-red-500 focus:ring-red-500/10"
                                                                        : "border-[#ded6ca] focus:border-[#b98237] focus:ring-[#b98237]/10 dark:border-gray-700"
                                                                }`}
                                                            />
                                                        </div>
                                                        {profileErrors.phone && <span className="mt-1.5 block text-xs text-red-500">{profileErrors.phone}</span>}
                                                    </label>

                                                    <label className="block sm:col-span-2">
                                                        <span className="mb-2 block text-xs font-semibold text-gray-700 dark:text-gray-300">About you</span>
                                                        <textarea
                                                            rows="3"
                                                            maxLength="240"
                                                            value={editedUser.bio || ""}
                                                            onChange={(e) => setProfileField("bio", e.target.value)}
                                                            placeholder="Tell us a little about your style and preferences..."
                                                            className="w-full resize-none rounded-xl border border-[#ded6ca] bg-white px-4 py-3 text-sm outline-none transition placeholder:text-gray-400 focus:border-[#b98237] focus:ring-4 focus:ring-[#b98237]/10 dark:border-gray-700 dark:bg-gray-800"
                                                        />
                                                        <span className="mt-1 block text-right text-[10px] text-gray-400">{(editedUser.bio || "").length}/240</span>
                                                    </label>
                                                </div>
                                            </section>

                                            <div className="h-px bg-[#e9e2d8] dark:bg-gray-700" />

                                            {/* Address */}
                                            <section>
                                                <div className="mb-5 flex items-center gap-3">
                                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f5ecdd] text-[#a86f25]">
                                                        <FiMapPin size={18} />
                                                    </div>
                                                    <div>
                                                        <h3 className="font-serif text-xl text-gray-950 dark:text-white">Primary address</h3>
                                                        <p className="text-xs text-gray-500">This information can pre-fill your checkout details.</p>
                                                    </div>
                                                </div>

                                                <div className="grid gap-4 sm:grid-cols-2">
                                                    <label className="block sm:col-span-2">
                                                        <span className="mb-2 block text-xs font-semibold text-gray-700 dark:text-gray-300">Street address</span>
                                                        <input
                                                            type="text"
                                                            value={editedUser.street || ""}
                                                            onChange={(e) => setProfileField("street", e.target.value)}
                                                            placeholder="House number and street"
                                                            className="w-full rounded-xl border border-[#ded6ca] bg-white px-4 py-3 text-sm outline-none transition focus:border-[#b98237] focus:ring-4 focus:ring-[#b98237]/10 dark:border-gray-700 dark:bg-gray-800"
                                                        />
                                                    </label>

                                                    <label className="block">
                                                        <span className="mb-2 block text-xs font-semibold text-gray-700 dark:text-gray-300">Town / City</span>
                                                        <input
                                                            type="text"
                                                            value={editedUser.city || ""}
                                                            onChange={(e) => setProfileField("city", e.target.value)}
                                                            placeholder="London"
                                                            className="w-full rounded-xl border border-[#ded6ca] bg-white px-4 py-3 text-sm outline-none transition focus:border-[#b98237] focus:ring-4 focus:ring-[#b98237]/10 dark:border-gray-700 dark:bg-gray-800"
                                                        />
                                                    </label>

                                                    <label className="block">
                                                        <span className="mb-2 block text-xs font-semibold text-gray-700 dark:text-gray-300">County / Region</span>
                                                        <input
                                                            type="text"
                                                            value={editedUser.county || ""}
                                                            onChange={(e) => setProfileField("county", e.target.value)}
                                                            placeholder="Greater London"
                                                            className="w-full rounded-xl border border-[#ded6ca] bg-white px-4 py-3 text-sm outline-none transition focus:border-[#b98237] focus:ring-4 focus:ring-[#b98237]/10 dark:border-gray-700 dark:bg-gray-800"
                                                        />
                                                    </label>

                                                    <label className="block">
                                                        <span className="mb-2 block text-xs font-semibold text-gray-700 dark:text-gray-300">Postcode</span>
                                                        <input
                                                            type="text"
                                                            value={editedUser.postcode || ""}
                                                            onChange={(e) => setProfileField("postcode", e.target.value.toUpperCase())}
                                                            placeholder="HA1 2AB"
                                                            className={`w-full rounded-xl border bg-white px-4 py-3 text-sm uppercase outline-none transition focus:ring-4 dark:bg-gray-800 ${
                                                                profileErrors.postcode
                                                                    ? "border-red-400 focus:border-red-500 focus:ring-red-500/10"
                                                                    : "border-[#ded6ca] focus:border-[#b98237] focus:ring-[#b98237]/10 dark:border-gray-700"
                                                            }`}
                                                        />
                                                        {profileErrors.postcode && <span className="mt-1.5 block text-xs text-red-500">{profileErrors.postcode}</span>}
                                                    </label>

                                                    <label className="block">
                                                        <span className="mb-2 block text-xs font-semibold text-gray-700 dark:text-gray-300">Country</span>
                                                        <select
                                                            value={editedUser.country || ""}
                                                            onChange={(e) => setProfileField("country", e.target.value)}
                                                            className="w-full rounded-xl border border-[#ded6ca] bg-white px-4 py-3 text-sm outline-none transition focus:border-[#b98237] focus:ring-4 focus:ring-[#b98237]/10 dark:border-gray-700 dark:bg-gray-800"
                                                        >
                                                            <option value="">Select country</option>
                                                            <option value="United Kingdom">United Kingdom</option>
                                                            <option value="Sri Lanka">Sri Lanka</option>
                                                            <option value="United States">United States</option>
                                                            <option value="Canada">Canada</option>
                                                            <option value="Australia">Australia</option>
                                                            <option value="India">India</option>
                                                            <option value="Other">Other</option>
                                                        </select>
                                                    </label>
                                                </div>
                                            </section>

                                            <div className="h-px bg-[#e9e2d8] dark:bg-gray-700" />

                                            {/* Style preferences */}
                                            <section>
                                                <div className="mb-5 flex items-center gap-3">
                                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f5ecdd] text-[#a86f25]">
                                                        <FiAward size={18} />
                                                    </div>
                                                    <div>
                                                        <h3 className="font-serif text-xl text-gray-950 dark:text-white">Style preferences</h3>
                                                        <p className="text-xs text-gray-500">Helps ZAMED recommend better products and sizes.</p>
                                                    </div>
                                                </div>

                                                <div className="grid gap-4 sm:grid-cols-3">
                                                    <label className="block">
                                                        <span className="mb-2 block text-xs font-semibold text-gray-700 dark:text-gray-300">Preferred size</span>
                                                        <select
                                                            value={editedUser.preferredSize || ""}
                                                            onChange={(e) => setProfileField("preferredSize", e.target.value)}
                                                            className="w-full rounded-xl border border-[#ded6ca] bg-white px-4 py-3 text-sm outline-none transition focus:border-[#b98237] focus:ring-4 focus:ring-[#b98237]/10 dark:border-gray-700 dark:bg-gray-800"
                                                        >
                                                            <option value="">Select size</option>
                                                            {["XS", "S", "M", "L", "XL", "XXL", "3XL"].map(size => <option key={size} value={size}>{size}</option>)}
                                                        </select>
                                                    </label>

                                                    <label className="block">
                                                        <span className="mb-2 block text-xs font-semibold text-gray-700 dark:text-gray-300">Preferred fit</span>
                                                        <select
                                                            value={editedUser.preferredFit || ""}
                                                            onChange={(e) => setProfileField("preferredFit", e.target.value)}
                                                            className="w-full rounded-xl border border-[#ded6ca] bg-white px-4 py-3 text-sm outline-none transition focus:border-[#b98237] focus:ring-4 focus:ring-[#b98237]/10 dark:border-gray-700 dark:bg-gray-800"
                                                        >
                                                            <option value="">Select fit</option>
                                                            <option value="Slim">Slim</option>
                                                            <option value="Regular">Regular</option>
                                                            <option value="Relaxed">Relaxed</option>
                                                            <option value="Oversized">Oversized</option>
                                                        </select>
                                                    </label>

                                                    <label className="block">
                                                        <span className="mb-2 block text-xs font-semibold text-gray-700 dark:text-gray-300">Favourite category</span>
                                                        <select
                                                            value={editedUser.favouriteCategory || ""}
                                                            onChange={(e) => setProfileField("favouriteCategory", e.target.value)}
                                                            className="w-full rounded-xl border border-[#ded6ca] bg-white px-4 py-3 text-sm outline-none transition focus:border-[#b98237] focus:ring-4 focus:ring-[#b98237]/10 dark:border-gray-700 dark:bg-gray-800"
                                                        >
                                                            <option value="">Select category</option>
                                                            <option value="Shirts">Shirts</option>
                                                            <option value="T-Shirts">T-Shirts</option>
                                                            <option value="Trousers">Trousers</option>
                                                            <option value="Jackets">Jackets</option>
                                                            <option value="Hoodies">Hoodies</option>
                                                            <option value="Accessories">Accessories</option>
                                                        </select>
                                                    </label>
                                                </div>

                                                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                                                    <label className="flex cursor-pointer items-center justify-between rounded-xl border border-[#e1d9ce] bg-white p-4 transition hover:border-[#b98237] dark:border-gray-700 dark:bg-gray-800">
                                                        <div>
                                                            <p className="text-sm font-semibold">Email recommendations</p>
                                                            <p className="mt-1 text-xs text-gray-500">New arrivals, offers and style edits.</p>
                                                        </div>
                                                        <input
                                                            type="checkbox"
                                                            checked={Boolean(editedUser.newsletter)}
                                                            onChange={(e) => setProfileField("newsletter", e.target.checked)}
                                                            className="h-5 w-5 accent-[#a86f25]"
                                                        />
                                                    </label>

                                                    <label className="flex cursor-pointer items-center justify-between rounded-xl border border-[#e1d9ce] bg-white p-4 transition hover:border-[#b98237] dark:border-gray-700 dark:bg-gray-800">
                                                        <div>
                                                            <p className="text-sm font-semibold">SMS delivery updates</p>
                                                            <p className="mt-1 text-xs text-gray-500">Important order and shipping alerts.</p>
                                                        </div>
                                                        <input
                                                            type="checkbox"
                                                            checked={Boolean(editedUser.smsUpdates)}
                                                            onChange={(e) => setProfileField("smsUpdates", e.target.checked)}
                                                            className="h-5 w-5 accent-[#a86f25]"
                                                        />
                                                    </label>
                                                </div>
                                            </section>
                                        </div>
                                    </div>
                                </div>

                                {/* Sticky footer */}
                                <div className="flex flex-col-reverse gap-3 border-t border-[#e5ddd1] bg-white/95 px-5 py-4 backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:px-8 dark:border-gray-700 dark:bg-gray-900/95">
                                    <p className="text-center text-[11px] text-gray-500 sm:text-left">
                                        Your information is securely stored and used according to our privacy policy.
                                    </p>
                                    <div className="flex gap-3">
                                        <button
                                            type="button"
                                            disabled={isSavingProfile}
                                            onClick={() => setIsEditingProfile(false)}
                                            className="flex-1 rounded-xl border border-[#dcd3c6] px-6 py-3 text-xs font-bold tracking-wide text-gray-700 transition hover:border-black hover:text-black disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none dark:text-gray-200"
                                        >
                                            CANCEL
                                        </button>
                                        <motion.button
                                            type="button"
                                            whileHover={{ y: -1 }}
                                            whileTap={{ scale: 0.98 }}
                                            disabled={isSavingProfile}
                                            onClick={updateProfile}
                                            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-black px-7 py-3 text-xs font-bold tracking-wide text-white shadow-lg transition hover:bg-[#a86f25] disabled:cursor-not-allowed disabled:opacity-60 sm:flex-none"
                                        >
                                            {isSavingProfile ? (
                                                <>
                                                    <FiLoader className="animate-spin" size={16} />
                                                    SAVING...
                                                </>
                                            ) : (
                                                <>
                                                    <FiSave size={16} />
                                                    SAVE CHANGES
                                                </>
                                            )}
                                        </motion.button>
                                    </div>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Add Address Modal */}
                {showAddAddress && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={() => setShowAddAddress(false)}>
                        <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-2xl font-bold">Add New Address</h2>
                                <button onClick={() => setShowAddAddress(false)} className="text-gray-500 hover:text-gray-700">
                                    <FiX size={24} />
                                </button>
                            </div>
                            <div className="space-y-4">
                                <input type="text" value={newAddress.street} onChange={(e) => setNewAddress({...newAddress, street: e.target.value})} className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700" placeholder="Street Address *" />
                                <input type="text" value={newAddress.city} onChange={(e) => setNewAddress({...newAddress, city: e.target.value})} className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700" placeholder="City *" />
                                <input type="text" value={newAddress.state} onChange={(e) => setNewAddress({...newAddress, state: e.target.value})} className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700" placeholder="State/Province" />
                                <input type="text" value={newAddress.zipCode} onChange={(e) => setNewAddress({...newAddress, zipCode: e.target.value})} className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700" placeholder="ZIP/Postal Code" />
                                <input type="text" value={newAddress.country} onChange={(e) => setNewAddress({...newAddress, country: e.target.value})} className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700" placeholder="Country" />
                                <label className="flex items-center gap-2">
                                    <input type="checkbox" checked={newAddress.isDefault} onChange={(e) => setNewAddress({...newAddress, isDefault: e.target.checked})} />
                                    <span className="text-sm">Set as default address</span>
                                </label>
                                <div className="flex gap-3 pt-4">
                                    <button onClick={addNewAddress} className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 transition-all">
                                        Add Address
                                    </button>
                                    <button onClick={() => setShowAddAddress(false)} className="flex-1 bg-gray-500 text-white py-2 rounded-lg font-semibold hover:bg-gray-600 transition-all">
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Return Details Modal */}
                {/* Full coupon offer details modal */}
                <AnimatePresence>
                    {selectedOfferNotification && (() => {
                        const coupon = selectedOfferNotification.coupon;
                        const expired = coupon.endDate && new Date(`${coupon.endDate}T23:59:59`) < new Date();
                        const used = coupon.used === true || Number(coupon.userUsedCount || 0) >= Number(coupon.perUserLimit || 1);
                        const available = !expired && !used && coupon.status !== 'inactive';
                        return (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="fixed inset-0 z-[80] flex items-end justify-center bg-black/70 p-0 backdrop-blur-md sm:items-center sm:p-5"
                                onMouseDown={(event) => event.target === event.currentTarget && setSelectedOfferNotification(null)}
                            >
                                <motion.div
                                    initial={{ opacity: 0, y: 80, scale: .96, rotateX: 8 }}
                                    animate={{ opacity: 1, y: 0, scale: 1, rotateX: 0 }}
                                    exit={{ opacity: 0, y: 60, scale: .97 }}
                                    transition={{ type: 'spring', stiffness: 260, damping: 27 }}
                                    className="max-h-[94vh] w-full max-w-3xl overflow-y-auto rounded-t-[30px] bg-[#f8f4ec] shadow-2xl sm:rounded-[30px]"
                                >
                                    <div className="relative min-h-[310px] overflow-hidden bg-gradient-to-br from-[#17130e] to-[#4a3216] p-7 text-white sm:p-9" style={getCouponBackgroundStyle(coupon)}>
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-black/10" />
                                        <motion.div animate={{ rotate: 360 }} transition={{ duration: 35, repeat: Infinity, ease: 'linear' }} className="absolute -right-24 -top-24 h-64 w-64 rounded-full border border-white/10" />
                                        <div className="relative z-10 flex min-h-[250px] flex-col justify-between">
                                            <div className="flex items-start justify-between gap-4">
                                                <div>
                                                    <p className="text-xs font-bold tracking-[0.26em] text-[#e4bb72]">EXCLUSIVE ZAMED OFFER</p>
                                                    <h3 className="mt-4 font-serif text-4xl sm:text-6xl">{getDiscountLabel(coupon)}</h3>
                                                    <p className="mt-3 max-w-xl text-base text-white/75">{coupon.title || 'Premium member offer'}</p>
                                                </div>
                                                <button onClick={() => setSelectedOfferNotification(null)} className="rounded-full border border-white/20 bg-black/20 p-3 text-white transition hover:rotate-90 hover:border-[#e0b665]"><FiX /></button>
                                            </div>
                                            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                                                <div className="rounded-2xl border border-white/20 bg-black/30 px-5 py-4 backdrop-blur-md">
                                                    <p className="text-[10px] tracking-[.2em] text-white/55">COUPON CODE</p>
                                                    <p className="mt-1 font-mono text-2xl font-bold tracking-[.14em]">{coupon.code}</p>
                                                </div>
                                                <span className={`w-fit rounded-full px-4 py-2 text-xs font-bold uppercase ${available ? 'bg-emerald-400/20 text-emerald-200' : 'bg-red-400/20 text-red-200'}`}>{available ? 'Available now' : expired ? 'Expired' : used ? 'Already used' : 'Unavailable'}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-6 sm:p-8">
                                        <p className="text-sm leading-7 text-gray-600">{coupon.description || selectedOfferNotification.notification.message}</p>
                                        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                                            <div className="rounded-2xl border border-[#e5d9c7] bg-white p-4"><p className="text-xs text-gray-400">Minimum order</p><p className="mt-2 font-semibold">{Number(coupon.minPurchase) > 0 ? formatPrice(Number(coupon.minPurchase)) : 'No minimum'}</p></div>
                                            <div className="rounded-2xl border border-[#e5d9c7] bg-white p-4"><p className="text-xs text-gray-400">Starts</p><p className="mt-2 font-semibold">{coupon.startDate ? formatDate(coupon.startDate) : 'Available now'}</p></div>
                                            <div className="rounded-2xl border border-[#e5d9c7] bg-white p-4"><p className="text-xs text-gray-400">Expires</p><p className="mt-2 font-semibold">{coupon.endDate ? formatDate(coupon.endDate) : 'No expiry'}</p></div>
                                            <div className="rounded-2xl border border-[#e5d9c7] bg-white p-4"><p className="text-xs text-gray-400">Customer limit</p><p className="mt-2 font-semibold">{coupon.perUserLimit || 1} use</p></div>
                                        </div>

                                        <div className="mt-5 rounded-2xl border border-[#e5d9c7] bg-white p-5">
                                            <h4 className="font-serif text-xl">Offer conditions</h4>
                                            <div className="mt-4 grid gap-3 text-sm text-gray-600 sm:grid-cols-2">
                                                <p className="flex items-center gap-2"><FiCheckCircle className="text-emerald-600" /> {coupon.applicableProducts === 'all' ? 'Valid on all eligible products' : 'Selected products only'}</p>
                                                <p className="flex items-center gap-2"><FiUser className="text-[#b47a29]" /> {coupon.memberOnly ? 'Premium members only' : 'All assigned customers'}</p>
                                                <p className="flex items-center gap-2"><FiShoppingBag className="text-[#b47a29]" /> {coupon.firstOrderOnly ? 'First order only' : 'Existing customers eligible'}</p>
                                                <p className="flex items-center gap-2"><FiTag className="text-[#b47a29]" /> Cannot be combined unless stated</p>
                                            </div>
                                        </div>

                                        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                                            <button onClick={() => { navigator.clipboard.writeText(coupon.code); toast.success(`${coupon.code} copied`); }} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-[#d7c8b2] bg-white px-6 py-3.5 text-sm font-semibold transition hover:border-[#b47a29] hover:text-[#a56d22]"><FiCopy /> Copy code</button>
                                            <button disabled={!available} onClick={() => { localStorage.setItem('selected_checkout_coupon', coupon.code); setSelectedOfferNotification(null); navigate('/checkout', { state: { couponCode: coupon.code } }); }} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#17130e] px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-[#b47a29] disabled:cursor-not-allowed disabled:opacity-45">Use at checkout <FiArrowRight /></button>
                                        </div>
                                    </div>
                                </motion.div>
                            </motion.div>
                        );
                    })()}
                </AnimatePresence>

                {selectedReturnRequest && (
                    <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto" onClick={() => setSelectedReturnRequest(null)}>
                        <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                            <div className="flex justify-between items-center mb-4 sticky top-0 bg-white dark:bg-gray-800 pb-2">
                                <h2 className="text-2xl font-bold">Return Tracking Details</h2>
                                <button onClick={() => setSelectedReturnRequest(null)} className="text-gray-500 text-2xl">&times;</button>
                            </div>
                            
                            <div className="space-y-5">
                                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-xl">
                                    <h3 className="font-semibold mb-3">Return Information</h3>
                                    <div className="flex gap-3 mb-3">
                                        {selectedReturnRequest.productImage && (
                                            <img src={selectedReturnRequest.productImage} alt={selectedReturnRequest.productName} className="w-20 h-20 object-cover rounded-lg" />
                                        )}
                                        <div>
                                            <p className="font-medium">{selectedReturnRequest.productName}</p>
                                            <p className="text-sm text-gray-500">Quantity: {selectedReturnRequest.productQuantity}</p>
                                            <p className="text-xs text-gray-400">Return ID: #{selectedReturnRequest.id}</p>
                                        </div>
                                    </div>
                                    <p className="text-sm"><span className="font-medium">Reason:</span> {selectedReturnRequest.reason}</p>
                                    {selectedReturnRequest.comment && <p className="text-sm mt-1"><span className="font-medium">Comment:</span> {selectedReturnRequest.comment}</p>}
                                </div>
                                
                                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-xl">
                                    <h3 className="font-semibold mb-3">Refund Details</h3>
                                    <div className="space-y-2">
                                        <div className="flex justify-between"><span>Product Price:</span><span>{formatPrice(selectedReturnRequest.productPrice)}</span></div>
                                        <div className="flex justify-between"><span>Quantity:</span><span>x{selectedReturnRequest.productQuantity}</span></div>
                                        <div className="flex justify-between pl-4"><span>Subtotal:</span><span>{formatPrice(selectedReturnRequest.subtotal)}</span></div>
                                        <div className="flex justify-between"><span>Tax ({selectedReturnRequest.taxRate}%):</span><span>{formatPrice(selectedReturnRequest.taxAmount)}</span></div>
                                        <div className="border-t pt-2 flex justify-between font-bold"><span>Total Refund:</span><span className="text-green-600">{formatPrice(selectedReturnRequest.refundAmount)}</span></div>
                                    </div>
                                </div>
                                
                                {selectedReturnRequest.trackingHistory && selectedReturnRequest.trackingHistory.length > 0 && (
                                    <div className="border rounded-xl p-4">
                                        <h3 className="font-semibold mb-3 flex items-center gap-2"><FiClock size={16} /> Tracking History</h3>
                                        <div className="space-y-3 max-h-48 overflow-y-auto">
                                            {selectedReturnRequest.trackingHistory.map((event, idx) => (
                                                <div key={idx} className="flex gap-3 text-sm">
                                                    <div className="flex-shrink-0">{getReturnStatusIcon(event.stage)}</div>
                                                    <div><p className="text-gray-700 dark:text-gray-300">{event.message}</p><p className="text-xs text-gray-400">{new Date(event.timestamp).toLocaleString()}</p></div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                
                                {selectedReturnRequest.adminNote && (
                                    <div className="bg-gray-50 p-3 rounded-lg">
                                        <p className="text-xs text-gray-500">Admin Note</p>
                                        <p className="text-sm">{selectedReturnRequest.adminNote}</p>
                                    </div>
                                )}
                            </div>
                            
                            <button onClick={() => setSelectedReturnRequest(null)} className="w-full mt-6 bg-gray-900 text-white py-2.5 rounded-xl font-semibold hover:bg-gray-800 transition-all">Close</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Profile;