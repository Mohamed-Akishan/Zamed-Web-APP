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
    FiFilter, FiSearch, FiPlus, FiMinus, FiTrash2, FiTag
} from "react-icons/fi";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { useCart } from "../context/CartContext";
import { 
    getUserOrders, 
    updateOrderStatus, 
    saveReturnRequest, 
    getUserReturnRequests,
    updateReturnStatus
} from "../services/orderService";
import productService from "../services/productService";

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const Profile = () => {
    const [user, setUser] = useState(null);
    const [orders, setOrders] = useState([]);
    const [favorites, setFavorites] = useState([]);
    const [activeTab, setActiveTab] = useState("overview");
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [editedUser, setEditedUser] = useState({});
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

    // Load user coupons from backend and localStorage
    const loadUserCoupons = async (email) => {
        if (!email) return;
        
        // First try backend
        try {
            const token = getToken();
            if (token) {
                const response = await fetch(`${API_URL}/coupons/user`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (response.ok) {
                    const data = await response.json();
                    if (data.success && data.coupons) {
                        setUserCoupons(data.coupons);
                        localStorage.setItem(`user_coupons_${email}`, JSON.stringify(data.coupons));
                        return;
                    }
                }
            }
        } catch (error) {
            console.log("Backend not available for coupons");
        }
        
        // Fallback to localStorage
        const coupons = JSON.parse(localStorage.getItem(`user_coupons_${email}`) || '[]');
        setUserCoupons(coupons);
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
            const userOrders = await getUserOrders(email);
            setOrders(userOrders);
            
            const userReturns = await getUserReturnRequests(email);
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
        };
        
        window.addEventListener('favoritesUpdated', handleFavoritesUpdate);
        window.addEventListener('productsUpdated', handleProductUpdate);
        window.addEventListener('couponReceived', handleCouponReceived);
        window.addEventListener('storage', handleStorageChange);
        
        return () => {
            window.removeEventListener('favoritesUpdated', handleFavoritesUpdate);
            window.removeEventListener('productsUpdated', handleProductUpdate);
            window.removeEventListener('couponReceived', handleCouponReceived);
            window.removeEventListener('storage', handleStorageChange);
        };
    }, [user]);

    // Refresh data when tab changes to orders or returns
    useEffect(() => {
        if (user && (activeTab === 'orders' || activeTab === 'returns')) {
            loadUserData(user.email);
        }
        if (user && activeTab === 'coupons') {
            loadUserCoupons(user.email);
        }
        if (user && activeTab === 'notifications') {
            loadNotifications(user.email);
        }
    }, [activeTab, user]);

    const handleLogout = () => {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        toast.success("Logged out successfully");
        navigate('/login');
    };

    const updateProfile = async () => {
        const updatedUser = { ...user, ...editedUser };
        
        // Try to update on backend
        try {
            const token = getToken();
            if (token) {
                const response = await fetch(`${API_URL}/users/profile`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(updatedUser)
                });
                if (response.ok) {
                    const data = await response.json();
                    if (data.success) {
                        localStorage.setItem('user', JSON.stringify(data.user));
                        setUser(data.user);
                        toast.success("Profile updated successfully!");
                        setIsEditingProfile(false);
                        return;
                    }
                }
            }
        } catch (error) {
            console.log("Backend not available, saving locally");
        }
        
        // Fallback to localStorage
        localStorage.setItem('user', JSON.stringify(updatedUser));
        setUser(updatedUser);
        setIsEditingProfile(false);
        toast.success("Profile updated successfully (local)!");
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
        
        // Try to save on backend
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
        
        // Fallback to localStorage
        setAddresses(updatedAddresses);
        localStorage.setItem(`addresses_${user.email}`, JSON.stringify(updatedAddresses));
        setShowAddAddress(false);
        setNewAddress({ street: "", city: "", state: "", zipCode: "", country: "", isDefault: false });
        toast.success("Address added successfully (local)");
    };

    const deleteAddress = async (addressId) => {
        const updatedAddresses = addresses.filter(addr => addr.id !== addressId);
        
        // Try to delete on backend
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
        
        // Fallback to localStorage
        setAddresses(updatedAddresses);
        localStorage.setItem(`addresses_${user.email}`, JSON.stringify(updatedAddresses));
        toast.success("Address removed (local)");
    };

    const setDefaultAddress = async (addressId) => {
        const updatedAddresses = addresses.map(addr => ({
            ...addr,
            isDefault: addr.id === addressId
        }));
        
        // Try to update on backend
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
        
        // Fallback to localStorage
        setAddresses(updatedAddresses);
        localStorage.setItem(`addresses_${user.email}`, JSON.stringify(updatedAddresses));
        toast.success("Default address updated (local)");
    };

    const removeFromFavorites = (productId) => {
        const updatedFavorites = favorites.filter(item => item.id !== productId);
        setFavorites(updatedFavorites);
        
        // Save only IDs
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
                await updateOrderStatus(orderId, "cancelled");
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
            
            const saved = await saveReturnRequest(returnRequest);
            
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
        { id: "overview", label: "Overview", icon: FiGrid, color: "text-blue-500", badge: 0 },
        { id: "orders", label: "My Orders", icon: FiShoppingBag, color: "text-purple-500", badge: orders.length },
        { id: "wishlist", label: "Wishlist", icon: FiHeart, color: "text-red-500", badge: favorites.length },
        { id: "coupons", label: "My Coupons", icon: FiTag, color: "text-green-500", badge: userCoupons.length },
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

    return (
        <div className={`min-h-screen ${darkMode ? 'dark bg-gray-900' : 'bg-gray-50'}`}>
            <div className="container mx-auto px-4 py-8 max-w-7xl">
                <Link to="/" className="inline-flex items-center text-gray-600 hover:text-blue-600 mb-6 transition-colors group">
                    <FiHome className="mr-2 group-hover:-translate-x-1 transition-transform" /> Back to Home
                </Link>

                <div className="flex flex-col lg:flex-row gap-8">
                    {/* Sidebar - Desktop */}
                    <div className="hidden lg:block w-80">
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden sticky top-24">
                            <div className="p-6 text-center border-b dark:border-gray-700 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-700 dark:to-gray-800">
                                <div className="relative inline-block">
                                    <div className="w-28 h-28 mx-auto bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center text-white text-4xl font-bold shadow-lg">
                                        {user.firstName?.charAt(0)}{user.lastName?.charAt(0)}
                                    </div>
                                    <button 
                                        onClick={() => setIsEditingProfile(true)}
                                        className="absolute -bottom-2 -right-2 bg-white dark:bg-gray-700 rounded-full p-2 shadow-md hover:scale-110 transition-transform"
                                    >
                                        <FiEdit2 size={14} className="text-blue-600" />
                                    </button>
                                </div>
                                <h2 className="mt-3 text-xl font-bold text-gray-900 dark:text-white">{user.firstName} {user.lastName}</h2>
                                <p className="text-sm text-gray-500 dark:text-gray-400">{user.email}</p>
                                <div className="mt-3 flex justify-center gap-2">
                                    <span className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 text-xs rounded-full">Verified</span>
                                    <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-xs rounded-full">Member since {new Date(stats.memberSince).getFullYear()}</span>
                                </div>
                            </div>

                            <nav className="p-4">
                                {sidebarNav.map((item) => {
                                    const Icon = item.icon;
                                    return (
                                        <button
                                            key={item.id}
                                            onClick={() => setActiveTab(item.id)}
                                            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl mb-1 transition-all ${
                                                activeTab === item.id 
                                                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600' 
                                                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                            }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <Icon size={20} className={activeTab === item.id ? 'text-blue-600' : item.color} />
                                                <span className="font-medium">{item.label}</span>
                                            </div>
                                            {item.badge > 0 && (
                                                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                                                    activeTab === item.id ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
                                                }`}>
                                                    {item.badge}
                                                </span>
                                            )}
                                        </button>
                                    );
                                })}
                                
                                <div className="border-t dark:border-gray-700 my-4 pt-4">
                                    <button
                                        onClick={() => {
                                            setDarkMode(!darkMode);
                                            localStorage.setItem('theme', !darkMode ? 'dark' : 'light');
                                            document.documentElement.classList.toggle('dark');
                                        }}
                                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
                                    >
                                        {darkMode ? <FiSun size={20} className="text-yellow-500" /> : <FiMoon size={20} className="text-gray-500" />}
                                        <span className="font-medium">{darkMode ? 'Light Mode' : 'Dark Mode'}</span>
                                    </button>
                                    
                                    <button
                                        onClick={handleLogout}
                                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all mt-2"
                                    >
                                        <FiLogOut size={20} />
                                        <span className="font-medium">Logout</span>
                                    </button>
                                </div>
                            </nav>
                        </div>
                    </div>

                    {/* Mobile Menu Button */}
                    <div className="lg:hidden fixed bottom-4 right-4 z-50">
                        <button
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            className="bg-blue-600 text-white p-4 rounded-full shadow-lg hover:bg-blue-700 transition-all"
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
                                            onClick={() => {
                                                setDarkMode(!darkMode);
                                                localStorage.setItem('theme', !darkMode ? 'dark' : 'light');
                                                document.documentElement.classList.toggle('dark');
                                            }}
                                            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-700 dark:text-gray-300"
                                        >
                                            {darkMode ? <FiSun size={20} /> : <FiMoon size={20} />}
                                            <span>{darkMode ? 'Light Mode' : 'Dark Mode'}</span>
                                        </button>
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
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="space-y-6"
                            >
                                <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-white">
                                    <h1 className="text-3xl font-bold mb-2">Welcome back, {user.firstName}!</h1>
                                    <p className="text-blue-100">Your fashion journey continues. Check out your latest updates below.</p>
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-md hover:shadow-lg transition-shadow">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-gray-500 text-sm">Total Spent</p>
                                                <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatPrice(stats.totalSpent)}</p>
                                            </div>
                                            <FiDollarSign className="text-green-500 text-3xl" />
                                        </div>
                                    </div>
                                    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-md hover:shadow-lg transition-shadow">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-gray-500 text-sm">Orders</p>
                                                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalOrders}</p>
                                            </div>
                                            <FiShoppingBag className="text-blue-500 text-3xl" />
                                        </div>
                                    </div>
                                    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-md hover:shadow-lg transition-shadow">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-gray-500 text-sm">Wishlist</p>
                                                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.savedItems}</p>
                                            </div>
                                            <FiHeart className="text-red-500 text-3xl" />
                                        </div>
                                    </div>
                                    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-md hover:shadow-lg transition-shadow">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-gray-500 text-sm">Returns</p>
                                                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.pendingReturns}</p>
                                            </div>
                                            <FiShield className="text-orange-500 text-3xl" />
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-6">
                                    <div className="flex justify-between items-center mb-4">
                                        <h2 className="text-xl font-bold">Recent Orders</h2>
                                        <button onClick={() => setActiveTab("orders")} className="text-blue-600 text-sm hover:underline">View All →</button>
                                    </div>
                                    {orders.slice(0, 3).map((order) => (
                                        <div key={order.id} className="border-b dark:border-gray-700 last:border-0 py-4">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <p className="font-mono text-sm text-gray-600 dark:text-gray-400">#{order.id}</p>
                                                    <p className="text-sm text-gray-500">{formatDate(order.date)}</p>
                                                </div>
                                                <div className="text-right">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getOrderStatusBadge(order.status)}`}>
                                                        {order.status?.toUpperCase()}
                                                    </span>
                                                    <p className="font-bold mt-1">{formatPrice(order.total)}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {orders.length === 0 && (
                                        <div className="text-center py-8">
                                            <p className="text-gray-500">No orders yet</p>
                                            <Link to="/collections/all" className="inline-block mt-2 text-blue-600">Start Shopping →</Link>
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <Link to="/collections/all" className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-md hover:shadow-lg transition-all text-center group">
                                        <FiShoppingBag className="text-2xl mx-auto mb-2 text-blue-600 group-hover:scale-110 transition-transform" />
                                        <p className="font-medium">Shop Now</p>
                                    </Link>
                                    <Link to="/collections/new-arrivals" className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-md hover:shadow-lg transition-all text-center group">
                                        <FiTrendingUp className="text-2xl mx-auto mb-2 text-purple-600 group-hover:scale-110 transition-transform" />
                                        <p className="font-medium">New Arrivals</p>
                                    </Link>
                                </div>
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

                        {/* Coupons Tab */}
                        {activeTab === "coupons" && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6"
                            >
                                <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                                    <FiTag className="text-green-600" /> My Coupons ({userCoupons.length})
                                </h2>
                                
                                {userCoupons.length === 0 ? (
                                    <div className="text-center py-16">
                                        <FiTag className="w-20 h-20 text-gray-300 mx-auto mb-4" />
                                        <p className="text-gray-500 text-lg">No coupons available</p>
                                        <p className="text-sm text-gray-400 mt-2">Coupons will appear here when you receive special offers</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {userCoupons.map((coupon) => (
                                            <div key={coupon.id} className="border-2 border-green-200 rounded-xl p-4 bg-gradient-to-r from-green-50 to-white dark:from-gray-800 dark:to-gray-700">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <p className="font-mono text-xl font-bold text-green-700 dark:text-green-400">{coupon.code}</p>
                                                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{coupon.description}</p>
                                                        <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">Valid until: {new Date(coupon.endDate).toLocaleDateString()}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                                                            {coupon.discountType === 'percentage' ? `${coupon.discountValue}% OFF` : `${currencySymbol}${coupon.discountValue} OFF`}
                                                        </p>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400">Min purchase: ${coupon.minPurchase}</p>
                                                    </div>
                                                </div>
                                                <button 
                                                    onClick={() => {
                                                        navigator.clipboard.writeText(coupon.code);
                                                        toast.success(`Coupon code ${coupon.code} copied!`);
                                                    }}
                                                    className="mt-3 w-full bg-green-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-all"
                                                >
                                                    Copy Code
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {/* Notifications Tab */}
                        {activeTab === "notifications" && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6"
                            >
                                <div className="flex justify-between items-center mb-6">
                                    <h2 className="text-2xl font-bold flex items-center gap-2">
                                        <FiBell className="text-yellow-600" /> Notifications ({notifications.filter(n => !n.read).length} unread)
                                    </h2>
                                    {notifications.filter(n => !n.read).length > 0 && (
                                        <button 
                                            onClick={markAllNotificationsAsRead}
                                            className="text-sm text-blue-600 hover:text-blue-800"
                                        >
                                            Mark all as read
                                        </button>
                                    )}
                                </div>
                                
                                {notifications.length === 0 ? (
                                    <div className="text-center py-16">
                                        <FiBell className="w-20 h-20 text-gray-300 mx-auto mb-4" />
                                        <p className="text-gray-500 text-lg">No notifications yet</p>
                                        <p className="text-sm text-gray-400 mt-2">Order updates and coupon offers will appear here</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {notifications.map((notif) => (
                                            <div 
                                                key={notif.id} 
                                                className={`p-4 rounded-xl border transition-all cursor-pointer ${!notif.read ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' : 'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-700'}`}
                                                onClick={() => markNotificationAsRead(notif.id)}
                                            >
                                                <div className="flex gap-3">
                                                    <div className="text-2xl">
                                                        {notif.type === 'order' ? '📦' : notif.type === 'coupon' ? '🏷️' : notif.type === 'product' ? '🆕' : '📢'}
                                                    </div>
                                                    <div className="flex-1">
                                                        <p className="font-semibold text-gray-900 dark:text-white">{notif.title}</p>
                                                        <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">{notif.message}</p>
                                                        <p className="text-gray-400 dark:text-gray-500 text-xs mt-2">{formatDateTime(notif.date)}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
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

                {/* Edit Profile Modal */}
                {isEditingProfile && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={() => setIsEditingProfile(false)}>
                        <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-2xl font-bold">Edit Profile</h2>
                                <button onClick={() => setIsEditingProfile(false)} className="text-gray-500 hover:text-gray-700">
                                    <FiX size={24} />
                                </button>
                            </div>
                            <div className="space-y-4">
                                <input type="text" value={editedUser.firstName || ''} onChange={(e) => setEditedUser({...editedUser, firstName: e.target.value})} className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700" placeholder="First Name" />
                                <input type="text" value={editedUser.lastName || ''} onChange={(e) => setEditedUser({...editedUser, lastName: e.target.value})} className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700" placeholder="Last Name" />
                                <input type="tel" value={editedUser.phone || ''} onChange={(e) => setEditedUser({...editedUser, phone: e.target.value})} className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700" placeholder="Phone Number" />
                                <textarea value={editedUser.address || ''} onChange={(e) => setEditedUser({...editedUser, address: e.target.value})} className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700" placeholder="Address" rows="2" />
                                <div className="flex gap-3 pt-4">
                                    <button onClick={updateProfile} className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 transition-all">
                                        Save Changes
                                    </button>
                                    <button onClick={() => setIsEditingProfile(false)} className="flex-1 bg-gray-500 text-white py-2 rounded-lg font-semibold hover:bg-gray-600 transition-all">
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

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