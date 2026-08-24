// src/pages/Profile.jsx
import { useState, useEffect, useCallback } from "react";
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
    FiArrowLeft, FiArrowRight, FiEdit, FiMoreVertical, FiCopy, FiEye,
    FiDollarSign as FiDollar
} from "react-icons/fi";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { useCart } from "../context/CartContext";
import orderService from "../services/orderService";
import productService from "../services/productService";
import useFavorites from "../hooks/useFavorites";

const API_URL =
  import.meta.env.VITE_API_URL ||
  (window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5000/api'
    : window.location.hostname.endsWith('.vercel.app')
      ? 'https://zamed-backend-1.onrender.com/api'
      : 'https://zamed-backend-1.onrender.com/api');

const RETURNS_DB_NAME = "zamed_returns_db";
const RETURNS_DB_VERSION = 1;
const RETURNS_STORE = "returns";

const openReturnsDatabase = () =>
    new Promise((resolve, reject) => {
        if (typeof indexedDB === "undefined") {
            reject(new Error("IndexedDB is not available"));
            return;
        }

        const request = indexedDB.open(RETURNS_DB_NAME, RETURNS_DB_VERSION);

        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(RETURNS_STORE)) {
                db.createObjectStore(RETURNS_STORE, { keyPath: "id" });
            }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });

const getAllReturnRecords = async () => {
    try {
        const db = await openReturnsDatabase();
        return await new Promise((resolve, reject) => {
            const tx = db.transaction(RETURNS_STORE, "readonly");
            const request = tx.objectStore(RETURNS_STORE).getAll();
            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        console.warn("Unable to load returns from IndexedDB:", error);
        return [];
    }
};

const putReturnRecord = async (record) => {
    if (!record) return false;
    const id = record.id || record._id || `${record.orderId}-${record.productId}`;
    if (!id) return false;

    try {
        const db = await openReturnsDatabase();
        return await new Promise((resolve, reject) => {
            const tx = db.transaction(RETURNS_STORE, "readwrite");
            tx.objectStore(RETURNS_STORE).put({ ...record, id: String(id) });
            tx.oncomplete = () => resolve(true);
            tx.onerror = () => reject(tx.error);
        });
    } catch (error) {
        console.warn("Unable to save return to IndexedDB:", error);
        return false;
    }
};

const putAllReturnRecords = async (records = []) => {
    const list = Array.isArray(records) ? records : [];
    const results = await Promise.all(list.map(record => putReturnRecord(record)));
    return results.some(Boolean);
};

const compactReturnForLocalStorage = (record = {}) => {
    const refundMethod = typeof record.refundMethod === "object" && record.refundMethod !== null
        ? { ...record.refundMethod }
        : record.refundMethod;

    return {
        ...record,
        productImage: typeof record.productImage === "string" && record.productImage.startsWith("data:") ? "" : record.productImage || "",
        refundMethod,
        trackingHistory: Array.isArray(record.trackingHistory) ? record.trackingHistory.slice(-20) : []
    };
};

const saveCompactReturnsToLocalStorage = (records = []) => {
    try {
        const compact = records.map(compactReturnForLocalStorage);
        localStorage.setItem("return_requests", JSON.stringify(compact));
        return true;
    } catch (error) {
        if (error?.name === "QuotaExceededError") {
            try {
                const tiny = records.map(record => ({
                    id: record.id || record._id,
                    orderId: record.orderId,
                    productId: record.productId,
                    productName: record.productName,
                    userEmail: record.userEmail,
                    refundAmount: record.refundAmount,
                    refundMethod: record.refundMethod,
                    status: record.status,
                    date: record.date,
                    updatedAt: record.updatedAt
                }));
                localStorage.setItem("return_requests", JSON.stringify(tiny));
                return true;
            } catch (fallbackError) {
                console.warn("Return local cache skipped because browser storage is full:", fallbackError);
            }
        } else {
            console.warn("Unable to save return local cache:", error);
        }
        return false;
    }
};

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

// ============================================================
// MAIN PROFILE COMPONENT
// ============================================================
const Profile = () => {
    const [user, setUser] = useState(null);
    const [orders, setOrders] = useState([]);
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
    const [trackingOrder, setTrackingOrder] = useState(null);
    const [notificationFilter, setNotificationFilter] = useState("all");
    const [securityPrefs, setSecurityPrefs] = useState({ twoFactorEnabled: false, loginAlerts: true, securityEmails: true });
    const [accountPrefs, setAccountPrefs] = useState({ emailNotifications: true, smsAlerts: false, orderUpdates: true, promotionalOffers: true, wishlistAlerts: true });
    const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
    const [showPasswords, setShowPasswords] = useState(false);
    const [changingPassword, setChangingPassword] = useState(false);
    const [securityActionLoading, setSecurityActionLoading] = useState(false);
    const [deletingAccount, setDeletingAccount] = useState(false);
    const [hiddenOrderIds, setHiddenOrderIds] = useState([]);
    const [returnMethod, setReturnMethod] = useState("bank_transfer");
    const [bankName, setBankName] = useState("");
    const [accountNumber, setAccountNumber] = useState("");
    const [accountHolderName, setAccountHolderName] = useState("");
    const [bankBranch, setBankBranch] = useState("");
    const [shopPickupDate, setShopPickupDate] = useState("");
    const [shopPickupTime, setShopPickupTime] = useState("");

    const navigate = useNavigate();
    const location = useLocation();
    const { addToCart } = useCart();

    // ============================================================
    // Use centralized favorites hook
    // ============================================================
    const { 
        favorites, 
        favoriteIds, 
        toggleFavorite, 
        isFavorited, 
        refreshFavorites, 
        loadFavorites, 
        saveFavorites 
    } = useFavorites();

    const getToken = () => localStorage.getItem('token');

    // ============================================================
    // Helper Functions
    // ============================================================
    const safeParse = (value, fallback) => {
        try { return JSON.parse(value) ?? fallback; } catch { return fallback; }
    };

    const getNotificationId = (n = {}) => String(
        n.id || n._id || n.notificationId || `${n.type || "notification"}-${n.date || n.createdAt || Date.now()}`
    );

    const saveNotificationsLocally = (items, email = user?.email) => {
        if (!email) return;
        try { localStorage.setItem(`notifications_${email}`, JSON.stringify(items)); }
        catch (e) { console.warn("Unable to save notifications locally", e); }
    };

    const tryApiEndpoints = async (endpoints, options) => {
        let lastResponse = null;
        for (const endpoint of endpoints) {
            try {
                const response = await fetch(`${API_URL}${endpoint}`, options);
                lastResponse = response;
                const data = await response.json().catch(() => ({}));
                if (response.ok) return { ok: true, response, data };
                if (![404, 405].includes(response.status)) return { ok: false, response, data };
            } catch { }
        }
        return { ok: false, response: lastResponse, data: {} };
    };

    const normalizeOrderStatus = (value = "") => {
        const rawStatus = typeof value === "object" && value !== null
            ? (value.deliveryStatus || value.status || value.orderStatus || value.fulfillmentStatus || value.shippingStatus || "")
            : value;

        const normalized = String(rawStatus || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
        const aliases = {
            completed: "delivered", complete: "delivered", received: "delivered",
            fulfilled: "delivered", order_delivered: "delivered", order_completed: "delivered",
            delivery_completed: "delivered", delivered_successfully: "delivered", successfully_delivered: "delivered"
        };
        if (aliases[normalized]) return aliases[normalized];
        if (normalized.includes("delivered") || normalized.includes("completed")) return "delivered";
        return normalized;
    };

    const isOrderDelivered = (order = {}) => {
        if (!order || typeof order !== "object") return false;
        const statusCandidates = [
            order.deliveryStatus, order.status, order.orderStatus, order.fulfillmentStatus,
            order.shippingStatus, order.trackingStatus, order.delivery?.status,
            order.shipping?.status, order.fulfillment?.status, order.tracking?.status
        ];
        const hasDeliveredStatus = statusCandidates.some(value => value && normalizeOrderStatus(value) === "delivered");
        if (hasDeliveredStatus) return true;
        if (order.delivered === true || order.isDelivered === true || order.completed === true || order.isCompleted === true) return true;
        if (order.deliveredAt || order.deliveryDate || order.deliveredDate || order.actualDeliveryDate || order.completedAt) return true;
        return false;
    };

    const getOrderTrackingSteps = (order = {}) => {
        const status = isOrderDelivered(order) ? "delivered" : normalizeOrderStatus(
            order.deliveryStatus || order.status || order.orderStatus || order.fulfillmentStatus ||
            order.shippingStatus || order.trackingStatus || order.delivery?.status || order.shipping?.status || "pending"
        );
        const steps = [
            { id: "pending", label: "Order Placed", description: "Your order has been received.", icon: FiCheckCircle },
            { id: "processing", label: "Processing", description: "Your items are being prepared.", icon: FiPackage },
            { id: "shipped", label: "Shipped", description: "Your order is on the way.", icon: FiTruck },
            { id: "out_for_delivery", label: "Out for Delivery", description: "Your parcel is with the delivery driver.", icon: FiDeliveryTruck },
            { id: "delivered", label: "Delivered", description: "Your order has been delivered.", icon: FiCheckCircle }
        ];
        const aliases = { scheduled: "pending", placed: "pending", confirmed: "processing", packed: "processing", dispatch: "shipped", dispatched: "shipped", in_transit: "shipped", out_for_delivery: "out_for_delivery", delivered: "delivered" };
        const normalized = aliases[status] || status;
        const currentIndex = Math.max(0, steps.findIndex(step => step.id === normalized));
        return steps.map((step, index) => ({ ...step, completed: index <= currentIndex, active: index === currentIndex }));
    };

    const canReviewOrder = (order = {}) => isOrderDelivered(order);
    const canReturnOrder = (order = {}) => isOrderDelivered(order);

    const hasReturnRequestForItem = (orderId, productId) =>
        returnRequests.some(request =>
            String(request.orderId) === String(orderId) &&
            String(request.productId) === String(productId) &&
            !["rejected", "refunded"].includes(String(request.status || "").toLowerCase())
        );

    const getExistingReview = (productId, orderId) => {
        try {
            const storedReviews = JSON.parse(localStorage.getItem("product_reviews") || "[]");
            return storedReviews.find(review =>
                String(review.productId) === String(productId) &&
                String(review.orderId || "") === String(orderId || "") &&
                String(review.userEmail || "").toLowerCase() === String(user?.email || "").toLowerCase()
            );
        } catch { return null; }
    };

    const navigateToProductReview = (productId, productName, orderId) => {
        sessionStorage.setItem('focus_review_section', 'true');
        sessionStorage.setItem('auto_open_review_form', 'true');
        sessionStorage.setItem('review_product_id', String(productId));
        sessionStorage.setItem('review_order_id', String(orderId));
        if (productName) sessionStorage.setItem('review_product_name', String(productName));
        if (user?.email) sessionStorage.setItem('review_user_email', user.email);
        navigate(`/product/${productId}`);
    };

    const getOrderForNotification = (notification) => {
        const orderId = notification?.orderId || notification?.referenceId || notification?.entityId;
        return orders.find((order) =>
            String(order?.id) === String(orderId) ||
            String(order?._id) === String(orderId) ||
            String(order?.orderId) === String(orderId)
        );
    };

    const getNotificationImage = (notification) => {
        if (notification?.image || notification?.productImage || notification?.orderImage) {
            return notification.image || notification.productImage || notification.orderImage;
        }
        if (notification?.type === "order" || notification?.type === "order_status") {
            const order = getOrderForNotification(notification);
            return order?.itemsList?.[0]?.image || order?.items?.[0]?.image || "";
        }
        return "";
    };

    const viewNotificationDetails = async (notification) => {
        if (!notification) return;
        await markNotificationAsRead(getNotificationId(notification));

        const type = String(notification.type || notification.category || "").toLowerCase();
        const orderId = notification.orderId || notification.referenceId || notification.entityId || notification.meta?.orderId;
        const productId = notification.productId || notification.meta?.productId;
        const returnId = notification.returnId || notification.returnRequestId || notification.meta?.returnId;
        const target = notification.link || notification.url || notification.path || notification.route;

        if (["coupon", "offer", "promotion"].includes(type)) { setActiveTab("coupons"); navigate("/profile?tab=coupons"); return; }
        if (["order", "order_status", "delivery", "shipping"].includes(type)) { setActiveTab("orders"); navigate("/profile?tab=orders", { state: { focusOrderId: orderId } }); return; }
        if (["return", "return_status", "refund", "refund_status"].includes(type)) { setActiveTab("returns"); navigate("/profile?tab=returns", { state: { focusReturnId: returnId } }); return; }
        if (["security", "login", "account", "password"].includes(type)) { setActiveTab("security"); navigate("/profile?tab=security"); return; }
        if (type === "address") { setActiveTab("addresses"); navigate("/profile?tab=addresses"); return; }
        if (type === "wishlist") { setActiveTab("wishlist"); navigate("/profile?tab=wishlist"); return; }
        if (type === "product" || type === "review") {
            if (productId) {
                if (type === "review") navigateToProductReview(productId, notification.productName, orderId);
                else navigate(`/product/${productId}`);
                return;
            }
            navigate("/collections/all"); return;
        }
        if (["message", "support", "contact"].includes(type)) {
            navigate("/");
            setTimeout(() => (document.getElementById("contact-footer") || document.querySelector("footer"))?.scrollIntoView({ behavior: "smooth", block: "start" }), 300);
            return;
        }
        if (target) { navigate(target, { state: { notification } }); return; }
        navigate("/");
    };

    const returnReasons = [
        "Wrong item received", "Defective or damaged product", "Size doesn't fit",
        "Product not as described", "Changed my mind", "Better price available", "Other"
    ];

    const returnStages = {
        'pending_pickup': { label: 'Awaiting Pickup', icon: FiClock, color: 'text-yellow-600', bg: 'bg-yellow-50', progress: 16, description: 'Return request submitted. Waiting for driver to schedule pickup.' },
        'pickup_scheduled': { label: 'Pickup Scheduled', icon: FiCalendar, color: 'text-blue-600', bg: 'bg-blue-50', progress: 33, description: 'Driver has been scheduled to collect your item.' },
        'picked_up': { label: 'Item Collected', icon: FiPickupPackage, color: 'text-purple-600', bg: 'bg-purple-50', progress: 50, description: 'Driver has collected your item. Item is on the way to warehouse.' },
        'verified': { label: 'Item Verified', icon: FiCheckCircle, color: 'text-green-600', bg: 'bg-green-50', progress: 66, description: 'Item has been verified at warehouse.' },
        'refund_processing': { label: 'Refund Processing', icon: FiRefreshCw, color: 'text-orange-600', bg: 'bg-orange-50', progress: 83, description: 'Refund is being processed. This may take up to 7 business days.' },
        'refunded': { label: 'Refund Completed', icon: FiCreditCard, color: 'text-green-600', bg: 'bg-green-50', progress: 100, description: 'Refund has been sent to your chosen payment method.' },
        'rejected': { label: 'Return Rejected', icon: FiX, color: 'text-red-600', bg: 'bg-red-50', progress: 0, description: 'Return request was rejected.' }
    };

    // ============================================================
    // Remove from favorites - using centralized hook
    // ============================================================
    const removeFromFavorites = useCallback((productId) => {
        const product = favorites.find(p => String(p.id) === String(productId));
        if (product) {
            const result = toggleFavorite(product);
            if (result.success) {
                toast.success("Removed from favorites");
            }
        } else {
            refreshFavorites(true);
            toast.success("Wishlist updated");
        }
    }, [favorites, toggleFavorite, refreshFavorites]);

    // ============================================================
    // Add to cart from favorites
    // ============================================================
    const addToCartFromFavorites = useCallback((product) => {
        if (!product) {
            toast.error("Product not found");
            return;
        }

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
    }, [addToCart]);

    // Load user coupons
    const loadUserCoupons = async (email) => {
        if (!email) {
            setUserCoupons([]);
            return;
        }

        try {
            const adminCoupons = JSON.parse(localStorage.getItem('admin_coupons') || '[]');
            const shopCoupons = JSON.parse(localStorage.getItem('shop_coupons') || '[]');

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

            const syncedCoupons = assignedCoupons.flatMap((assigned) => {
                const latest = (assigned?.id != null && activeById.get(String(assigned.id))) ||
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
                    const indexedImage = coupon.hasBackgroundImage ? await getCouponImageAsset(imageKey) : "";
                    return { ...coupon, backgroundImage: indexedImage || coupon.backgroundImage || "" };
                })
            );

            setUserCoupons(hydratedCoupons);
        } catch (error) {
            console.error('Error synchronising user coupons:', error);
            setUserCoupons([]);
        }
    };

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
        } else if (notification.type === 'order' || notification.type === 'order_status') {
            const orderId = notification.orderId || notification.referenceId || notification.entityId;
            if (orderId) {
                setActiveTab('orders');
                navigate("/profile?tab=orders", { state: { focusOrderId: orderId } });
            }
        }
    };

    const markNotificationAsRead = async (notifId) => {
        const id = String(notifId);
        setNotifications(current => {
            const updated = current.map(n => getNotificationId(n) === id ? { ...n, id, read: true, readAt: n.readAt || new Date().toISOString() } : n);
            saveNotificationsLocally(updated); return updated;
        });
        try { const token = getToken(); if (token) await fetch(`${API_URL}/notifications/${encodeURIComponent(id)}/read`, { method: 'PUT', headers: { Authorization: `Bearer ${token}` } }); } catch { }
    };

    const markNotificationAsUnread = async (notifId) => {
        const id = String(notifId);
        setNotifications(current => {
            const updated = current.map(n => getNotificationId(n) === id ? { ...n, id, read: false, readAt: null } : n);
            saveNotificationsLocally(updated); return updated;
        });
        try { const token = getToken(); if (token) await fetch(`${API_URL}/notifications/${encodeURIComponent(id)}/unread`, { method: 'PUT', headers: { Authorization: `Bearer ${token}` } }); } catch { }
    };

    const markAllNotificationsAsRead = async () => {
        setNotifications(current => { const updated = current.map(n => ({ ...n, id: getNotificationId(n), read: true, readAt: n.readAt || new Date().toISOString() })); saveNotificationsLocally(updated); return updated; });
        try { const token = getToken(); if (token) await fetch(`${API_URL}/notifications/read-all`, { method: 'PUT', headers: { Authorization: `Bearer ${token}` } }); } catch { }
        toast.success("All notifications marked as read");
    };

    const clearReadNotifications = () => {
        setNotifications(current => { const updated = current.filter(n => !n.read); saveNotificationsLocally(updated); return updated; });
        toast.success("Read notifications cleared");
    };

    const loadNotifications = async (email) => {
        if (!email) return;
        const local = safeParse(localStorage.getItem(`notifications_${email}`), []);
        const localList = Array.isArray(local) ? local.map(n => ({ ...n, id: getNotificationId(n) })) : [];
        setNotifications(localList);
        try {
            const token = getToken(); if (!token) return;
            const response = await fetch(`${API_URL}/notifications/user`, { headers: { Authorization: `Bearer ${token}` } });
            if (!response.ok) return;
            const data = await response.json();
            const server = data.notifications || data.data?.notifications || data.data || [];
            if (!Array.isArray(server)) return;
            const localMap = new Map(localList.map(n => [getNotificationId(n), n]));
            const mergedMap = new Map();
            server.forEach(item => { const id = getNotificationId(item), l = localMap.get(id); mergedMap.set(id, { ...item, id, read: l ? Boolean(l.read) : Boolean(item.read), readAt: l?.readAt || item.readAt || null }); });
            localList.forEach(item => { const id = getNotificationId(item); if (!mergedMap.has(id)) mergedMap.set(id, item); });
            const merged = [...mergedMap.values()].sort((a, b) => new Date(b.date || b.createdAt || 0) - new Date(a.date || a.createdAt || 0));
            setNotifications(merged); saveNotificationsLocally(merged, email);
        } catch { }
    };

    const loadAddresses = async (email) => {
        if (!email) {
            setAddresses([]);
            return;
        }

        try {
            const savedAddresses = JSON.parse(localStorage.getItem(`addresses_${email}`) || '[]');
            setAddresses(savedAddresses);
        } catch (error) {
            console.warn('Error loading addresses from localStorage:', error);
            setAddresses([]);
        }

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
            // Silently fail - use local data
        }
    };

    // Load user data (orders and returns)
    const loadUserData = async (email) => {
        if (!email) return;

        try {
            const userOrders = await orderService.getUserOrders(email);
            const normalizedOrders = (Array.isArray(userOrders) ? userOrders : []).map(order => ({
                ...order,
                id: order.id || order._id || order.orderId,
                status: isOrderDelivered(order) ? "delivered" : (order.status || order.orderStatus || order.deliveryStatus || order.fulfillmentStatus || order.shippingStatus || order.trackingStatus || "pending"),
                orderStatus: isOrderDelivered(order) ? "delivered" : (order.orderStatus || order.status || order.deliveryStatus || order.fulfillmentStatus || order.shippingStatus || order.trackingStatus || "pending"),
                deliveryStatus: isOrderDelivered(order) ? "delivered" : (order.deliveryStatus || order.status || order.orderStatus || order.fulfillmentStatus || order.shippingStatus || order.trackingStatus || "pending")
            }));

            const hiddenIds = JSON.parse(localStorage.getItem(`hidden_orders_${email}`) || "[]");
            const hiddenSet = new Set(Array.isArray(hiddenIds) ? hiddenIds.map(String) : []);
            setOrders(normalizedOrders.filter(order => !hiddenSet.has(String(order.id || order._id || order.orderId))));

            let serviceReturns = [];
            try {
                serviceReturns = await orderService.getUserReturnRequests(email);
            } catch (error) {
                console.warn("Unable to load returns from orderService:", error);
            }

            let localReturns = [];
            try {
                const allLocal = JSON.parse(localStorage.getItem("return_requests") || "[]");
                localReturns = (Array.isArray(allLocal) ? allLocal : []).filter(request =>
                    String(request.userEmail || "").toLowerCase() === String(email).toLowerCase()
                );
            } catch { localReturns = []; }

            const indexedReturns = (await getAllReturnRecords()).filter(request =>
                String(request.userEmail || "").toLowerCase() === String(email).toLowerCase()
            );

            const returnMap = new Map();
            [...(Array.isArray(serviceReturns) ? serviceReturns : []), ...localReturns, ...indexedReturns].forEach(request => {
                const key = String(request.id || request._id || `${request.orderId}-${request.productId}`);
                returnMap.set(key, { ...(returnMap.get(key) || {}), ...request });
            });

            const mergedReturns = [...returnMap.values()].sort((a, b) =>
                new Date(b.updatedAt || b.date || b.createdAt || 0) - new Date(a.updatedAt || a.date || a.createdAt || 0)
            );
            setReturnRequests(mergedReturns);
            await putAllReturnRecords(mergedReturns);
            saveCompactReturnsToLocalStorage(mergedReturns);
        } catch (error) {
            console.error("Error loading user data:", error);
            setOrders([]);
            setReturnRequests([]);
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

    // ============================================================
    // Main Effects
    // ============================================================
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
            loadFavorites(email);
            refreshUserData(email);

            const siteSettings = JSON.parse(localStorage.getItem('site_settings') || '{}');
            const symbols = { USD: "$", EUR: "€", GBP: "£", LKR: "Rs" };
            setCurrencySymbol(symbols[siteSettings.currency] || "$");
            setCurrencyCode(siteSettings.currency || "USD");

            const savedTheme = localStorage.getItem('theme');
            if (savedTheme === 'dark') setDarkMode(true);

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

    // ============================================================
    // Listen for favorites updates from other components
    // ============================================================
    useEffect(() => {
        if (!user) return;

        const email = user.email;

        const handleFavoritesUpdate = (event) => {
            if (event?.detail?.email && event?.detail?.favorites) {
                const eventEmail = event.detail.email;
                const eventFavorites = event.detail.favorites;

                if (String(eventEmail).toLowerCase() === String(email).toLowerCase()) {
                    if (Array.isArray(eventFavorites)) {
                        loadFavorites(email);
                    }
                    return;
                }
            }
            loadFavorites(email);
        };

        const handleStorage = (event) => {
            if (event.key && (
                event.key.startsWith('favorites_') ||
                event.key.startsWith('wishlist_') ||
                event.key.startsWith('whitelist_') ||
                event.key === 'favorites' ||
                event.key === 'wishlist' ||
                event.key === 'whitelist' ||
                event.key === 'user'
            )) {
                loadFavorites(email);
            }
        };

        const handleAuthChange = () => {
            loadFavorites(email);
        };

        const handleProfileUpdated = (event) => {
            if (event?.detail?.email === email || event?.detail?.email) {
                loadFavorites(email);
            }
        };

        window.addEventListener('favoritesUpdated', handleFavoritesUpdate);
        window.addEventListener('wishlistUpdated', handleFavoritesUpdate);
        window.addEventListener('whitelistUpdated', handleFavoritesUpdate);
        window.addEventListener('storage', handleStorage);
        window.addEventListener('authChanged', handleAuthChange);
        window.addEventListener('profileUpdated', handleProfileUpdated);
        window.addEventListener('userUpdated', handleAuthChange);

        return () => {
            window.removeEventListener('favoritesUpdated', handleFavoritesUpdate);
            window.removeEventListener('wishlistUpdated', handleFavoritesUpdate);
            window.removeEventListener('whitelistUpdated', handleFavoritesUpdate);
            window.removeEventListener('storage', handleStorage);
            window.removeEventListener('authChanged', handleAuthChange);
            window.removeEventListener('profileUpdated', handleProfileUpdated);
            window.removeEventListener('userUpdated', handleAuthChange);
        };
    }, [user, loadFavorites]);

    // ============================================================
    // Refresh data when tab changes
    // ============================================================
    useEffect(() => {
        if (!user) return;
        const email = user.email;

        if (activeTab === 'wishlist') {
            loadFavorites(email);
        }
        if (activeTab === 'orders' || activeTab === 'returns') {
            loadUserData(email);
        }
        if (activeTab === 'coupons') {
            loadUserCoupons(email);
        }
        if (activeTab === 'notifications') {
            loadNotifications(email);
        }
        if (activeTab === 'addresses') {
            loadAddresses(email);
        }
    }, [activeTab, user, loadFavorites]);

    // ============================================================
    // Profile Edit Functions
    // ============================================================
    const setProfileField = (field, value) => {
        setEditedUser(prev => ({ ...prev, [field]: value }));
        if (profileErrors[field]) {
            setProfileErrors(prev => ({ ...prev, [field]: "" }));
        }
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
            address: [editedUser.street, editedUser.city, editedUser.county, editedUser.postcode, editedUser.country].filter(Boolean).join(", ")
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
                    window.dispatchEvent(new CustomEvent("profileUpdated", { detail: savedUser }));
                    toast.success("Your profile has been updated.");
                    setIsEditingProfile(false);
                    return;
                }
            }

            localStorage.setItem("user", JSON.stringify(normalizedUser));
            setUser(normalizedUser);
            setEditedUser(normalizedUser);
            window.dispatchEvent(new CustomEvent("profileUpdated", { detail: normalizedUser }));
            toast.success("Your profile has been updated.");
            setIsEditingProfile(false);
        } catch (error) {
            console.error("Profile update failed:", error);
            localStorage.setItem("user", JSON.stringify(normalizedUser));
            setUser(normalizedUser);
            setEditedUser(normalizedUser);
            window.dispatchEvent(new CustomEvent("profileUpdated", { detail: normalizedUser }));
            toast.success("Profile saved locally.");
            setIsEditingProfile(false);
        } finally {
            setIsSavingProfile(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        toast.success("Logged out successfully");
        navigate('/login');
    };

    const persistSecurityPrefs = (next) => {
        setSecurityPrefs(next);
        if (user?.email) localStorage.setItem(`security_prefs_${user.email}`, JSON.stringify(next));
    };

    const persistAccountPrefs = (next) => {
        setAccountPrefs(next);
        if (user?.email) localStorage.setItem(`account_prefs_${user.email}`, JSON.stringify(next));
        window.dispatchEvent(new CustomEvent("customerPreferencesUpdated", { detail: { email: user?.email, preferences: next } }));
    };

    const handleChangePassword = async (e) => {
        e?.preventDefault();
        const { currentPassword, newPassword, confirmPassword } = passwordForm;
        if (!currentPassword || !newPassword || !confirmPassword) { toast.error("Complete all password fields."); return; }
        if (newPassword.length < 8 || !/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) { toast.error("Use at least 8 characters with uppercase, lowercase and a number."); return; }
        if (newPassword !== confirmPassword) { toast.error("New passwords do not match."); return; }
        const token = getToken(); if (!token) { toast.error("Please sign in again."); return; }
        setChangingPassword(true);
        try {
            const result = await tryApiEndpoints(["/auth/change-password", "/users/change-password", "/users/password"], {
                method: "PUT",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({ currentPassword, oldPassword: currentPassword, newPassword, password: newPassword })
            });
            if (!result.ok) throw new Error(result.data?.message || result.data?.error || "Password change API is not available.");
            localStorage.setItem(`password_changed_at_${user.email}`, new Date().toISOString());
            setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
            toast.success("Password changed successfully.");
        } catch (err) { toast.error(err.message || "Unable to change password."); } finally { setChangingPassword(false); }
    };

    const toggleTwoFactor = async () => {
        const token = getToken(); if (!token) { toast.error("Please sign in again."); return; }
        setSecurityActionLoading(true);
        try {
            const enabled = !securityPrefs.twoFactorEnabled;
            const result = await tryApiEndpoints(["/auth/2fa/toggle", "/users/2fa"], {
                method: "PUT",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({ enabled })
            });
            if (!result.ok) throw new Error(result.data?.message || "2FA API is not configured yet.");
            persistSecurityPrefs({ ...securityPrefs, twoFactorEnabled: enabled });
            toast.success(enabled ? "2FA enabled." : "2FA disabled.");
        } catch (err) { toast.error(err.message); } finally { setSecurityActionLoading(false); }
    };

    const logoutOtherSessions = async () => {
        const token = getToken(); if (!token) { toast.error("Please sign in again."); return; }
        setSecurityActionLoading(true);
        try {
            const result = await tryApiEndpoints(["/auth/logout-all", "/auth/sessions/revoke-all"], { method: "POST", headers: { Authorization: `Bearer ${token}` } });
            if (!result.ok) throw new Error(result.data?.message || "Session API is not available.");
            toast.success("Other sessions signed out.");
        } catch (err) { toast.error(err.message); } finally { setSecurityActionLoading(false); }
    };

    const downloadAccountData = () => {
        const blob = new Blob([JSON.stringify({
            exportedAt: new Date().toISOString(),
            profile: user,
            orders,
            addresses,
            returns: returnRequests,
            preferences: accountPrefs
        }, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob), a = document.createElement("a");
        a.href = url;
        a.download = `zamed-account-data-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        toast.success("Account data downloaded.");
    };

    const handleDeleteAccount = async () => {
        if (window.prompt('Type DELETE to permanently delete your account.') !== "DELETE") return;
        const token = getToken(); if (!token) { toast.error("Please sign in again."); return; }
        setDeletingAccount(true);
        try {
            const result = await tryApiEndpoints(["/users/account", "/auth/account", "/users/me"], {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!result.ok) throw new Error(result.data?.message || result.data?.error || "Account deletion API is not available.");
            const email = user?.email;
            ["user", "token", "authToken"].forEach(k => localStorage.removeItem(k));
            if (email) [`notifications_${email}`, `favorites_${email}`, `user_coupons_${email}`, `addresses_${email}`, `security_prefs_${email}`, `account_prefs_${email}`].forEach(k => localStorage.removeItem(k));
            toast.success("Account deleted.");
            navigate("/register", { replace: true });
        } catch (err) { toast.error(err.message || "Unable to delete account."); } finally { setDeletingAccount(false); }
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

    // ============================================================
    // Order Functions
    // ============================================================
    const getHiddenOrdersKey = (email = user?.email) => email ? `hidden_orders_${email}` : "";

    const persistHiddenOrders = (ids, email = user?.email) => {
        const unique = [...new Set(ids.map(String))];
        setHiddenOrderIds(unique);
        if (email) {
            localStorage.setItem(getHiddenOrdersKey(email), JSON.stringify(unique));
        }
    };

    const getOrderIdentifier = (order = {}) => order.id || order._id || order.orderId || "";

    const getItemIdentifier = (item = {}) => item.id || item._id || item.productId || "";

    const getOrderItems = (order = {}) => Array.isArray(order.itemsList) ? order.itemsList : Array.isArray(order.items) ? order.items : [];

    const getOrderPaymentMethod = (order = {}) => String(order.paymentMethod || order.payment?.method || order.paymentType || "");

    const isCashOrder = (order = {}) => {
        const method = getOrderPaymentMethod(order).toLowerCase();
        return method.includes("cash") || method.includes("cod");
    };

    const deleteOrderFromHistory = async (order) => {
        const orderId = getOrderIdentifier(order);
        if (!orderId) { toast.error("Unable to identify this order."); return; }
        if (!window.confirm(`Remove order #${orderId} from your order history?`)) return;

        let serviceDeleted = false;
        try {
            if (typeof orderService.deleteOrder === "function") {
                await orderService.deleteOrder(orderId);
                serviceDeleted = true;
            }
        } catch (error) {
            console.warn("Permanent order deletion is not available; hiding from customer history instead:", error);
        }

        persistHiddenOrders([...hiddenOrderIds, String(orderId)]);
        setOrders(current => current.filter(item => String(getOrderIdentifier(item)) !== String(orderId)));
        toast.success(serviceDeleted ? "Order deleted." : "Order removed from your order history.");
    };

    const clearOrderHistory = async () => {
        const visibleIds = orders.map(order => getOrderIdentifier(order)).filter(Boolean).map(String).filter(id => !hiddenOrderIds.includes(id));
        if (visibleIds.length === 0) { toast.info("Your order history is already clear."); return; }
        if (!window.confirm("Clear all orders from your order history? This will remove them from your Profile view.")) return;
        persistHiddenOrders([...hiddenOrderIds, ...visibleIds]);
        setOrders([]);
        toast.success("Order history cleared.");
    };

    const getReturnForOrder = (order) => {
        const orderId = String(getOrderIdentifier(order));
        return returnRequests.filter(request => String(request.orderId) === orderId)
            .sort((a, b) => new Date(b.updatedAt || b.refundCompletedAt || b.date || 0) - new Date(a.updatedAt || a.refundCompletedAt || a.date || 0))[0] || null;
    };

    const getEffectiveOrderStatus = (order) => {
        const returnRequest = getReturnForOrder(order);
        if (returnRequest?.status === "refunded") return "refunded";
        if (returnRequest?.status === "refund_processing") return "refund_processing";
        if (["picked_up", "verified", "pickup_scheduled", "pending_pickup"].includes(returnRequest?.status)) return "return_in_progress";
        return order.refundStatus || order.status || order.orderStatus || order.deliveryStatus || "pending";
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

    // ============================================================
    // Return Functions
    // ============================================================
    const resetReturnForm = () => {
        setSelectedItemForReturn(null);
        setReturnReason("");
        setReturnComment("");
        setReturnMethod("bank_transfer");
        setBankName("");
        setAccountNumber("");
        setAccountHolderName("");
        setBankBranch("");
        setShopPickupDate("");
        setShopPickupTime("");
    };

    const openReturnForItem = (order, item) => {
        const orderId = getOrderIdentifier(order);
        const productId = getItemIdentifier(item);

        if (!orderId || !productId) {
            toast.error("Unable to identify this order item. Please refresh and try again.");
            return;
        }

        if (hasReturnRequestForItem(orderId, productId)) {
            toast.info("A return request already exists for this item.");
            setActiveTab("returns");
            navigate("/profile?tab=returns");
            return;
        }

        if (!canReturnOrder(order)) {
            toast.error("This order is not marked as delivered in the saved order data yet. Refresh your orders and try again.");
            return;
        }

        const cashOrder = isCashOrder(order);

        setSelectedItemForReturn({
            orderId,
            productId,
            productName: item.name || item.productName || "Product",
            productImage: item.image || "",
            order,
            paymentMethod: getOrderPaymentMethod(order) || (cashOrder ? "Cash on Delivery" : "Online Payment"),
            isCashOrder: cashOrder
        });

        setReturnReason("");
        setReturnComment("");
        setReturnMethod(cashOrder ? "bank_transfer" : "original_payment");
        setBankName("");
        setAccountNumber("");
        setAccountHolderName("");
        setBankBranch("");
        setShopPickupDate("");
        setShopPickupTime("");
    };

    const submitReturnRequest = async () => {
        if (!selectedItemForReturn) { toast.error("Please select a product to return."); return; }
        if (!returnReason) { toast.error("Please select a reason for return."); return; }
        if (returnMethod === "bank_transfer" && (!bankName.trim() || !accountNumber.trim() || !accountHolderName.trim())) {
            toast.error("Please fill in the account holder, bank name and account number.");
            return;
        }
        if (returnMethod === "shop_pickup" && (!shopPickupDate || !shopPickupTime)) {
            toast.error("Please choose your shop collection date and time.");
            return;
        }

        setIsSubmittingReturn(true);

        try {
            const order = orders.find(currentOrder => String(getOrderIdentifier(currentOrder)) === String(selectedItemForReturn.orderId));
            if (!order) throw new Error("The original order could not be found.");

            const product = getOrderItems(order).find(currentItem => String(getItemIdentifier(currentItem)) === String(selectedItemForReturn.productId));
            if (!product) throw new Error("The selected product could not be found in this order.");

            if (!canReturnOrder(order)) throw new Error("This order has not been delivered yet.");
            if (hasReturnRequestForItem(selectedItemForReturn.orderId, selectedItemForReturn.productId)) {
                throw new Error("A return request already exists for this product.");
            }

            const siteSettings = JSON.parse(localStorage.getItem("site_settings") || "{}");
            const taxRate = Number.parseFloat(product.taxRate ?? siteSettings.taxRate) || 0;
            const productPrice = Number.parseFloat(product.price) || 0;
            const productQuantity = Number.parseInt(product.quantity, 10) || 1;
            const subtotal = productPrice * productQuantity;
            const taxAmount = subtotal * (taxRate / 100);
            const refundAmount = subtotal + taxAmount;

            let refundMethodDetails;
            if (returnMethod === "bank_transfer") {
                refundMethodDetails = {
                    method: "Bank Transfer",
                    type: "bank_transfer",
                    bankName: bankName.trim(),
                    accountNumber: accountNumber.trim(),
                    accountHolderName: accountHolderName.trim(),
                    bankBranch: bankBranch.trim() || "N/A",
                    processingTime: "Up to 7 days"
                };
            } else if (returnMethod === "shop_pickup") {
                refundMethodDetails = {
                    method: "Collect Refund From Shop",
                    type: "shop_pickup",
                    pickupDate: shopPickupDate,
                    pickupTime: shopPickupTime,
                    processingTime: "After return approval"
                };
            } else {
                refundMethodDetails = {
                    method: "Original Payment Method",
                    type: "original_payment",
                    originalPaymentMethod: getOrderPaymentMethod(order) || "Online Payment",
                    processingTime: "Up to 7 days"
                };
            }

            const now = new Date().toISOString();
            const expectedRefundDate = new Date();
            expectedRefundDate.setDate(expectedRefundDate.getDate() + 7);

            const returnRequest = {
                id: `RET-${Date.now()}`,
                orderId: selectedItemForReturn.orderId,
                productId: selectedItemForReturn.productId,
                productName: selectedItemForReturn.productName,
                productImage: product.image || selectedItemForReturn.productImage || "",
                productPrice,
                productQuantity,
                subtotal,
                taxAmount,
                taxRate,
                refundAmount,
                reason: returnReason,
                comment: returnComment.trim(),
                status: "pending_pickup",
                date: now,
                createdAt: now,
                updatedAt: now,
                userEmail: user.email,
                userName: [user.firstName, user.lastName].filter(Boolean).join(" ") || user.name || "Customer",
                customerPhone: user.phone || user.phoneNumber || "",
                pickupAddress: user.address || order.shippingAddress || "",
                originalPaymentMethod: getOrderPaymentMethod(order) || "N/A",
                refundMethod: refundMethodDetails,
                refundProcessingDays: 7,
                refundExpectedBy: expectedRefundDate.toISOString(),
                trackingHistory: [{ stage: "pending_pickup", timestamp: now, message: "Return request submitted and waiting for admin review." }]
            };

            let serviceSaved = false;
            try {
                serviceSaved = Boolean(await orderService.saveReturnRequest(returnRequest));
            } catch (serviceError) {
                console.warn("orderService return save failed; using shared local fallback:", serviceError);
            }

            const localSaved = await putReturnRecord(returnRequest) && saveCompactReturnsToLocalStorage([...returnRequests, returnRequest]);

            if (!serviceSaved && !localSaved) throw new Error("The return request could not be saved.");

            setReturnRequests(prev => {
                const withoutDuplicate = prev.filter(request => String(request.id || request._id) !== String(returnRequest.id));
                return [returnRequest, ...withoutDuplicate];
            });

            window.dispatchEvent(new CustomEvent("returnsUpdated", { detail: { email: user.email, returnRequest } }));
            window.dispatchEvent(new Event("storage"));

            toast.success(`Return request submitted successfully. Refund: ${currencySymbol}${refundAmount.toFixed(2)}. Processing may take up to 7 days after approval.`);

            resetReturnForm();
            setActiveTab("returns");
            navigate("/profile?tab=returns");
        } catch (error) {
            console.error("Error submitting return:", error);
            toast.error(error?.message || "Failed to submit return request. Please try again.");
        } finally {
            setIsSubmittingReturn(false);
        }
    };

    // ============================================================
    // Tracking Modal Component
    // ============================================================
    const TrackingModal = ({ order, onClose }) => {
        if (!order) return null;
        
        const steps = getOrderTrackingSteps(order);
        const isDelivered = isOrderDelivered(order);
        
        return (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
                <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-800">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-bold dark:text-white">Order Tracking</h2>
                        <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                            <FiX size={24} />
                        </button>
                    </div>
                    
                    <div className="mb-6">
                        <p className="text-sm text-gray-500 dark:text-gray-400">Order #{order.id}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Placed on {formatDate(order.date)}</p>
                    </div>
                    
                    <div className="relative">
                        {steps.map((step, index) => {
                            const Icon = step.icon;
                            return (
                                <div key={step.id} className="relative flex gap-4 pb-8 last:pb-0">
                                    {index < steps.length - 1 && (
                                        <div className={`absolute left-5 top-10 w-0.5 h-12 ${step.completed ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`} />
                                    )}
                                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${step.completed ? 'bg-green-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-400'}`}>
                                        <Icon size={18} />
                                    </div>
                                    <div className="flex-1">
                                        <p className={`font-semibold ${step.completed ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500'}`}>{step.label}</p>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">{step.description}</p>
                                        {step.active && !isDelivered && (
                                            <span className="inline-block mt-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">Current</span>
                                        )}
                                        {step.completed && step.id === 'delivered' && (
                                            <span className="inline-block mt-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">Delivered</span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    
                    {isDelivered && (
                        <div className="mt-6 p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800">
                            <p className="text-sm text-green-700 dark:text-green-300">✅ Your order has been delivered successfully!</p>
                        </div>
                    )}
                    
                    <button onClick={onClose} className="mt-6 w-full bg-black text-white py-3 rounded-xl font-semibold hover:bg-gray-800 transition">
                        Close
                    </button>
                </div>
            </div>
        );
    };

    // ============================================================
    // Edit Profile Modal Component
    // ============================================================
    const EditProfileModal = () => {
        if (!isEditingProfile) return null;
        
        return (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) setIsEditingProfile(false); }}>
                <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-800">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-bold dark:text-white">Edit Profile</h2>
                        <button onClick={() => setIsEditingProfile(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                            <FiX size={24} />
                        </button>
                    </div>
                    
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-1 dark:text-white">First Name *</label>
                                <input
                                    type="text"
                                    value={editedUser.firstName || ''}
                                    onChange={(e) => setProfileField('firstName', e.target.value)}
                                    className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                />
                                {profileErrors.firstName && <p className="text-xs text-red-500 mt-1">{profileErrors.firstName}</p>}
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1 dark:text-white">Last Name *</label>
                                <input
                                    type="text"
                                    value={editedUser.lastName || ''}
                                    onChange={(e) => setProfileField('lastName', e.target.value)}
                                    className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                />
                                {profileErrors.lastName && <p className="text-xs text-red-500 mt-1">{profileErrors.lastName}</p>}
                            </div>
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium mb-1 dark:text-white">Email *</label>
                            <input
                                type="email"
                                value={editedUser.email || ''}
                                onChange={(e) => setProfileField('email', e.target.value)}
                                className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            />
                            {profileErrors.email && <p className="text-xs text-red-500 mt-1">{profileErrors.email}</p>}
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium mb-1 dark:text-white">Phone</label>
                            <input
                                type="tel"
                                value={editedUser.phone || ''}
                                onChange={(e) => setProfileField('phone', e.target.value)}
                                className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            />
                            {profileErrors.phone && <p className="text-xs text-red-500 mt-1">{profileErrors.phone}</p>}
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium mb-1 dark:text-white">Street</label>
                            <input
                                type="text"
                                value={editedUser.street || ''}
                                onChange={(e) => setProfileField('street', e.target.value)}
                                className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            />
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-1 dark:text-white">City</label>
                                <input
                                    type="text"
                                    value={editedUser.city || ''}
                                    onChange={(e) => setProfileField('city', e.target.value)}
                                    className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1 dark:text-white">State/County</label>
                                <input
                                    type="text"
                                    value={editedUser.county || ''}
                                    onChange={(e) => setProfileField('county', e.target.value)}
                                    className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                />
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-1 dark:text-white">Postcode</label>
                                <input
                                    type="text"
                                    value={editedUser.postcode || ''}
                                    onChange={(e) => setProfileField('postcode', e.target.value)}
                                    className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                />
                                {profileErrors.postcode && <p className="text-xs text-red-500 mt-1">{profileErrors.postcode}</p>}
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1 dark:text-white">Country</label>
                                <input
                                    type="text"
                                    value={editedUser.country || ''}
                                    onChange={(e) => setProfileField('country', e.target.value)}
                                    className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                />
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex flex-col-reverse sm:flex-row gap-3 mt-6">
                        <button onClick={() => setIsEditingProfile(false)} className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700">
                            Cancel
                        </button>
                        <button onClick={updateProfile} disabled={isSavingProfile} className="flex-1 px-4 py-3 bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 flex items-center justify-center gap-2">
                            {isSavingProfile ? <><FiLoader className="animate-spin" /> Saving...</> : <><FiSave /> Save Changes</>}
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    // ============================================================
    // UI Helper Functions
    // ============================================================
    const getOrderStatusBadge = (status) => {
        const normalized = String(status || "").toLowerCase().replace(/\s+/g, "_");
        const badges = {
            pending: "bg-yellow-100 text-yellow-800",
            processing: "bg-blue-100 text-blue-800",
            shipped: "bg-purple-100 text-purple-800",
            delivered: "bg-green-100 text-green-800",
            cancelled: "bg-red-100 text-red-800",
            return_in_progress: "bg-orange-100 text-orange-800",
            refund_processing: "bg-amber-100 text-amber-800",
            refunded: "bg-emerald-100 text-emerald-800"
        };
        return badges[normalized] || "bg-gray-100 text-gray-800";
    };

    const getOrderStatusLabel = (status) => {
        const normalized = String(status || "").toLowerCase().replace(/\s+/g, "_");
        const labels = {
            pending: "Pending",
            processing: "Processing",
            shipped: "Shipped",
            delivered: "Delivered",
            cancelled: "Cancelled",
            return_in_progress: "Return In Progress",
            refund_processing: "Refund Processing",
            refunded: "Refunded"
        };
        return labels[normalized] || String(status || "Pending");
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

    const formatDate = (dateString) => dateString ? new Date(dateString).toLocaleDateString() : 'N/A';
    const formatDateTime = (dateString) => dateString ? new Date(dateString).toLocaleString() : 'N/A';

    // ============================================================
    // Filter Orders
    // ============================================================
    const filteredOrders = orders.filter(order => {
        if (orderFilter !== "all" && (order.status || order.orderStatus) !== orderFilter) return false;
        if (searchOrder && !order.id?.toLowerCase().includes(searchOrder.toLowerCase())) return false;
        return true;
    }).sort((a, b) => {
        if (orderSort === "newest") return new Date(b.date) - new Date(a.date);
        if (orderSort === "oldest") return new Date(a.date) - new Date(b.date);
        if (orderSort === "highest") return (b.total || 0) - (a.total || 0);
        return 0;
    });

    const filteredNotifications = notificationFilter === "unread"
        ? notifications.filter(n => !n.read)
        : notificationFilter === "read"
            ? notifications.filter(n => n.read)
            : notifications;

    // ============================================================
    // Stats
    // ============================================================
    const stats = {
        totalSpent: orders.reduce((sum, o) => sum + (o.total || 0), 0),
        totalOrders: orders.length,
        deliveredOrders: orders.filter(o => (o.status || o.orderStatus) === 'delivered').length,
        pendingReturns: returnRequests.filter(r => r.status !== 'refunded' && r.status !== 'rejected').length,
        memberSince: user?.dateJoined || new Date().toLocaleDateString(),
        savedItems: favorites.length
    };

    // ============================================================
    // Sidebar Navigation
    // ============================================================
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

    const siteMenuItems = [
        { label: "Home", path: "/", icon: FiHome },
        { label: "Shop", path: "/collections/all", icon: FiShoppingBag },
        { label: "Men", path: "/collections/men", icon: FiUser },
        { label: "Women", path: "/collections/women", icon: FiUser },
        { label: "Kids", path: "/collections/kids", icon: FiUser },
        { label: "About", path: "/about", icon: FiInfo },
        { label: "Contact", path: "/contact", icon: FiMail }
    ];

    // ============================================================
    // Coupon UI Helpers
    // ============================================================
    const cardAccent = (type) => {
        if (type === "free_shipping") return "from-emerald-950 to-emerald-700";
        if (type === "fixed") return "from-[#7a4b14] to-[#d3a24f]";
        if (type === "buy_x_get_y") return "from-slate-950 to-slate-700";
        return "from-[#17130e] to-[#3a2a14]";
    };

    const getDiscountLabel = (coupon) => {
        if (coupon.discountType === "free_shipping") return "FREE SHIPPING";
        if (coupon.discountType === "buy_x_get_y") return "BUY 2 GET 1";
        if (coupon.discountType === "percentage") return `${coupon.discountValue}% OFF`;
        return `${currencySymbol}${coupon.discountValue} OFF`;
    };

    const getCouponBackgroundStyle = (coupon) => {
        if (!coupon?.backgroundImage) return undefined;
        const isValidImage = typeof coupon.backgroundImage === 'string' &&
            (coupon.backgroundImage.startsWith('data:') || coupon.backgroundImage.startsWith('http'));
        if (!isValidImage) return undefined;
        const overlay = Math.min(90, Math.max(0, Number(coupon.backgroundOverlay) || 55)) / 100;
        return {
            backgroundImage: `linear-gradient(rgba(10, 8, 5, ${overlay}), rgba(10, 8, 5, ${overlay})), url("${coupon.backgroundImage}")`,
            backgroundSize: "cover",
            backgroundPosition: coupon.imagePosition || "center",
            color: coupon.couponTextColor || "#ffffff",
        };
    };

    // ============================================================
    // Loading State
    // ============================================================
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

    // ============================================================
    // Main Render
    // ============================================================
    return (
        <div className={`min-h-screen ${darkMode ? 'dark bg-gray-900 text-white' : 'bg-[#fbfaf8] text-gray-950'}`}>
            <div className="mx-auto max-w-[1440px] px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
                <div className="flex flex-col gap-4 md:gap-6 lg:gap-8 lg:flex-row">
                    
                    {/* Desktop Sidebar */}
                    <aside className="hidden w-64 xl:w-72 shrink-0 lg:block">
                        <div className="sticky top-24 overflow-hidden rounded-xl border border-[#e8e1d6] bg-white shadow-[0_8px_30px_rgba(28,24,18,0.05)] dark:border-gray-700 dark:bg-gray-800">
                            <div className="border-b border-[#ece5db] px-4 sm:px-5 py-4 text-xs font-semibold tracking-wide text-[#a86f25] dark:border-gray-700 dark:text-amber-400">
                                MY ACCOUNT
                            </div>
                            <nav className="p-2 sm:p-3">
                                {sidebarNav.map((item) => {
                                    const Icon = item.icon;
                                    return (
                                        <button
                                            key={item.id}
                                            onClick={() => setActiveTab(item.id)}
                                            className={`mb-0.5 flex w-full items-center justify-between rounded-lg px-3 sm:px-4 py-2.5 sm:py-3 text-left transition-all text-sm ${
                                                activeTab === item.id 
                                                    ? 'bg-[#f5ecdd] text-[#a86f25] dark:bg-amber-900/20 dark:text-amber-400' 
                                                    : 'text-gray-700 hover:bg-[#faf7f2] dark:text-gray-200 dark:hover:bg-gray-700'
                                            }`}
                                        >
                                            <span className="flex items-center gap-2.5 sm:gap-3">
                                                <Icon size={18} className={activeTab === item.id ? 'text-[#b98237]' : 'text-gray-500'} />
                                                <span className="font-medium">{item.label}</span>
                                            </span>
                                            {item.badge > 0 && (
                                                <span className="rounded-full bg-[#efe1ca] px-2 py-0.5 text-[10px] font-semibold text-[#9a641f] dark:bg-amber-900/30 dark:text-amber-300">
                                                    {item.badge}
                                                </span>
                                            )}
                                        </button>
                                    );
                                })}

                                <div className="mt-3 pt-3 border-t border-[#ece5db] dark:border-gray-700">
                                    <p className="px-3 py-1.5 text-[10px] font-semibold tracking-wide text-[#a86f25] dark:text-amber-400">SITE MENU</p>
                                    {siteMenuItems.map((item) => {
                                        const Icon = item.icon;
                                        return (
                                            <Link
                                                key={item.path}
                                                to={item.path}
                                                className="flex items-center gap-2.5 sm:gap-3 rounded-lg px-3 sm:px-4 py-2.5 sm:py-3 text-left text-sm font-medium text-gray-700 hover:bg-[#faf7f2] dark:text-gray-200 dark:hover:bg-gray-700 transition-all"
                                            >
                                                <Icon size={18} className="text-gray-500" />
                                                <span>{item.label}</span>
                                            </Link>
                                        );
                                    })}
                                </div>

                                <div className="my-2 border-t border-[#ece5db] dark:border-gray-700" />
                                <button 
                                    onClick={handleLogout} 
                                    className="flex w-full items-center gap-2.5 sm:gap-3 rounded-lg px-3 sm:px-4 py-2.5 sm:py-3 text-sm font-medium text-gray-700 hover:bg-red-50 hover:text-red-600 dark:text-gray-200 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                                >
                                    <FiLogOut size={18} /> Logout
                                </button>
                            </nav>
                        </div>
                    </aside>

                    {/* Mobile Menu Button */}
                    <div className="lg:hidden fixed bottom-4 right-4 z-50">
                        <button
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            className="bg-black text-white p-3.5 rounded-full shadow-lg hover:bg-[#b98237] transition-all"
                            aria-label="Toggle menu"
                        >
                            <FiMenu size={22} />
                        </button>
                    </div>

                    {/* Mobile Sidebar */}
                    <AnimatePresence>
                        {isMobileMenuOpen && (
                            <>
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                />
                                <motion.div
                                    initial={{ x: '100%' }}
                                    animate={{ x: 0 }}
                                    exit={{ x: '100%' }}
                                    transition={{ type: 'spring', damping: 25 }}
                                    className="fixed inset-y-0 right-0 w-[85vw] max-w-sm bg-white dark:bg-gray-800 shadow-2xl z-50 lg:hidden overflow-y-auto"
                                >
                                    <div className="p-4 sm:p-5 border-b dark:border-gray-700 flex justify-between items-center">
                                        <h2 className="text-lg font-bold dark:text-white">Menu</h2>
                                        <button 
                                            onClick={() => setIsMobileMenuOpen(false)} 
                                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                                        >
                                            <FiX size={22} />
                                        </button>
                                    </div>
                                    <nav className="p-3 sm:p-4">
                                        <div className="mb-3">
                                            <p className="text-xs font-semibold tracking-wide text-[#a86f25] dark:text-amber-400 mb-2">MY ACCOUNT</p>
                                            {sidebarNav.map((item) => {
                                                const Icon = item.icon;
                                                return (
                                                    <button
                                                        key={item.id}
                                                        onClick={() => {
                                                            setActiveTab(item.id);
                                                            setIsMobileMenuOpen(false);
                                                        }}
                                                        className={`w-full flex items-center justify-between px-3 py-3 rounded-xl mb-1 transition-all text-sm ${
                                                            activeTab === item.id 
                                                                ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' 
                                                                : 'text-gray-700 dark:text-gray-300'
                                                        }`}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <Icon size={19} />
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
                                        </div>

                                        <div className="border-t dark:border-gray-700 pt-3">
                                            <p className="text-xs font-semibold tracking-wide text-[#a86f25] dark:text-amber-400 mb-2">SITE MENU</p>
                                            {siteMenuItems.map((item) => {
                                                const Icon = item.icon;
                                                return (
                                                    <Link
                                                        key={item.path}
                                                        to={item.path}
                                                        onClick={() => setIsMobileMenuOpen(false)}
                                                        className="flex items-center gap-3 px-3 py-3 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all text-sm"
                                                    >
                                                        <Icon size={19} className="text-gray-500" />
                                                        <span>{item.label}</span>
                                                    </Link>
                                                );
                                            })}
                                        </div>

                                        <div className="border-t dark:border-gray-700 my-3 pt-3">
                                            <button
                                                onClick={handleLogout}
                                                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all text-sm"
                                            >
                                                <FiLogOut size={19} />
                                                <span>Logout</span>
                                            </button>
                                        </div>
                                    </nav>
                                </motion.div>
                            </>
                        )}
                    </AnimatePresence>

                    {/* ============================================================
                        MAIN CONTENT
                    ============================================================ */}
                    <div className="flex-1 min-w-0">
                        
                        {/* OVERVIEW TAB */}
                        {activeTab === "overview" && (
                            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                                
                                <div className="flex flex-col sm:flex-row justify-between gap-3 sm:items-center">
                                    <div>
                                        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-950 dark:text-white">My Profile</h1>
                                        <p className="mt-0.5 text-xs sm:text-sm text-gray-500 dark:text-gray-400">Manage your personal information and account details</p>
                                    </div>
                                    <button 
                                        onClick={() => setIsEditingProfile(true)} 
                                        className="inline-flex items-center justify-center gap-2 bg-black px-4 py-2.5 text-xs font-semibold tracking-wide text-white hover:bg-[#b98237] rounded-xl transition-all w-full sm:w-auto"
                                    >
                                        <FiEdit2 size={15} /> EDIT PROFILE
                                    </button>
                                </div>

                                {/* Profile Card */}
                                <section className="rounded-xl border border-[#e8e1d6] bg-white p-4 sm:p-6 shadow-[0_6px_24px_rgba(28,24,18,0.04)] dark:border-gray-700 dark:bg-gray-800">
                                    <div className="flex flex-col md:flex-row gap-6 md:items-center">
                                        <div className="flex flex-col items-center sm:flex-row sm:gap-5">
                                            <div className="relative shrink-0">
                                                {user.profileImage || user.avatar ? (
                                                    <img 
                                                        src={user.profileImage || user.avatar} 
                                                        alt={`${user.firstName} ${user.lastName}`} 
                                                        className="h-20 w-20 sm:h-24 sm:w-24 md:h-28 md:w-28 rounded-full object-cover" 
                                                    />
                                                ) : (
                                                    <div className="flex h-20 w-20 sm:h-24 sm:w-24 md:h-28 md:w-28 items-center justify-center rounded-full bg-[#171717] text-2xl sm:text-3xl text-white">
                                                        {user.firstName?.charAt(0)}{user.lastName?.charAt(0)}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="text-center sm:text-left">
                                                <h2 className="text-xl sm:text-2xl font-bold text-gray-950 dark:text-white">{user.firstName} {user.lastName}</h2>
                                                <p className="mt-1 flex items-center justify-center sm:justify-start gap-2 text-xs sm:text-sm text-gray-600 dark:text-gray-300">
                                                    <FiMail className="text-[#b98237]" /> {user.email}
                                                </p>
                                                <p className="mt-0.5 flex items-center justify-center sm:justify-start gap-2 text-xs sm:text-sm text-gray-600 dark:text-gray-300">
                                                    <FiPhone className="text-[#b98237]" /> {user.phone || user.phoneNumber || 'Add phone number'}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-3 divide-x divide-[#e8e1d6] border-t border-[#e8e1d6] pt-4 md:border-l md:border-t-0 md:pl-6 md:pt-0 dark:divide-gray-700 dark:border-gray-700">
                                            <button onClick={() => setActiveTab('orders')} className="px-2 text-center">
                                                <FiShoppingBag className="mx-auto text-xl text-[#b98237]" />
                                                <p className="mt-1 font-bold text-lg sm:text-xl">{stats.totalOrders}</p>
                                                <p className="text-[10px] text-gray-500">Orders</p>
                                            </button>
                                            <button onClick={() => setActiveTab('wishlist')} className="px-2 text-center">
                                                <FiHeart className="mx-auto text-xl text-[#b98237]" />
                                                <p className="mt-1 font-bold text-lg sm:text-xl">{stats.savedItems}</p>
                                                <p className="text-[10px] text-gray-500">Wishlist</p>
                                            </button>
                                            <div className="px-2 text-center">
                                                <FiStar className="mx-auto text-xl text-[#b98237]" />
                                                <p className="mt-1 font-bold text-lg sm:text-xl">{user.reviewCount || user.reviews?.length || 0}</p>
                                                <p className="text-[10px] text-gray-500">Reviews</p>
                                            </div>
                                        </div>
                                    </div>
                                </section>

                                {/* Personal Information */}
                                <section className="rounded-xl border border-[#e8e1d6] bg-white p-4 sm:p-6 shadow-[0_6px_24px_rgba(28,24,18,0.04)] dark:border-gray-700 dark:bg-gray-800">
                                    <div className="flex items-center justify-between mb-4">
                                        <h2 className="text-lg sm:text-xl font-bold">Personal Information</h2>
                                        <button onClick={() => setIsEditingProfile(true)} className="text-xs font-semibold text-[#a86f25] hover:underline">EDIT</button>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {[
                                            ['Full Name', `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Not provided'],
                                            ['Phone Number', user.phone || user.phoneNumber || 'Not provided'],
                                            ['Gender', user.gender || 'Not provided'],
                                            ['Email Address', user.email],
                                            ['Date of Birth', user.dateOfBirth ? formatDate(user.dateOfBirth) : 'Not provided'],
                                            ['Member Since', stats.memberSince ? formatDate(stats.memberSince) : 'Not available']
                                        ].map(([label, value]) => (
                                            <div key={label} className="border-b border-[#eee8df] pb-2 dark:border-gray-700">
                                                <p className="text-xs font-medium text-gray-500">{label}</p>
                                                <p className="mt-0.5 text-sm text-gray-900 dark:text-gray-100 break-words">{value}</p>
                                            </div>
                                        ))}
                                    </div>
                                </section>

                                {/* Default Address */}
                                <section className="rounded-xl border border-[#e8e1d6] bg-white p-4 sm:p-6 shadow-[0_6px_24px_rgba(28,24,18,0.04)] dark:border-gray-700 dark:bg-gray-800">
                                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                                        <div className="flex items-center gap-2">
                                            <h2 className="text-lg sm:text-xl font-bold">Default Address</h2>
                                            <span className="rounded-full bg-[#f5ecdd] px-2 py-0.5 text-[10px] text-[#a86f25]">Default</span>
                                        </div>
                                        <button onClick={() => setActiveTab('addresses')} className="inline-flex items-center gap-1 border border-[#ddd3c4] px-3 py-1.5 text-xs font-semibold hover:border-[#b98237] hover:text-[#a86f25] rounded-lg">
                                            <FiEdit2 size={13} /> EDIT
                                        </button>
                                    </div>
                                    {addresses.find(address => address.isDefault) || addresses[0] ? (() => {
                                        const address = addresses.find(address => address.isDefault) || addresses[0];
                                        return (
                                            <div className="flex gap-3">
                                                <div className="flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-md bg-[#fbf6ee] text-[#b98237]">
                                                    <FiMapPin size={18} />
                                                </div>
                                                <div className="text-xs sm:text-sm leading-5 text-gray-700 dark:text-gray-300">
                                                    <p className="font-semibold text-gray-950 dark:text-white">{address.label || 'Home'}</p>
                                                    <p>{address.street}</p>
                                                    <p>{[address.city, address.state, address.zipCode].filter(Boolean).join(', ')}</p>
                                                    <p>{address.country}</p>
                                                    {address.phone && <p>{address.phone}</p>}
                                                </div>
                                            </div>
                                        );
                                    })() : (
                                        <div className="flex flex-col items-start gap-3 text-sm text-gray-500">
                                            <p>No address has been added yet.</p>
                                            <button onClick={() => setActiveTab('addresses')} className="bg-black px-4 py-2 text-xs font-semibold text-white hover:bg-[#b98237] rounded-lg">
                                                ADD ADDRESS
                                            </button>
                                        </div>
                                    )}
                                </section>

                                {/* Recent Orders */}
                                <section className="rounded-xl border border-[#e8e1d6] bg-white p-4 sm:p-6 shadow-[0_6px_24px_rgba(28,24,18,0.04)] dark:border-gray-700 dark:bg-gray-800">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <h2 className="text-lg sm:text-xl font-bold">Recent Orders</h2>
                                        <button onClick={() => setActiveTab('orders')} className="inline-flex items-center gap-1 border border-[#ddd3c4] px-3 py-1.5 text-xs font-semibold hover:border-[#b98237] hover:text-[#a86f25] rounded-lg">
                                            VIEW ALL <FiArrowRight size={13} />
                                        </button>
                                    </div>
                                    <div className="mt-3 divide-y divide-[#eee8df] dark:divide-gray-700">
                                        {orders.slice(0, 3).map(order => (
                                            <div key={order.id} className="flex flex-col sm:flex-row justify-between gap-2 py-3 sm:items-center">
                                                <div>
                                                    <p className="text-xs sm:text-sm font-semibold">Order #{order.id}</p>
                                                    <p className="text-xs text-gray-500">{formatDate(order.date)}</p>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${getOrderStatusBadge(getEffectiveOrderStatus(order))}`}>
                                                        {getOrderStatusLabel(getEffectiveOrderStatus(order)).toUpperCase()}
                                                    </span>
                                                    <strong className="text-sm">{formatPrice(order.total)}</strong>
                                                </div>
                                            </div>
                                        ))}
                                        {orders.length === 0 && (
                                            <div className="py-6 text-center text-sm text-gray-500">
                                                No orders yet. <Link to="/collections/all" className="font-semibold text-[#a86f25]">Start shopping</Link>
                                            </div>
                                        )}
                                    </div>
                                </section>
                            </motion.div>
                        )}

                        {/* ORDERS TAB */}
                        {activeTab === "orders" && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-3 sm:p-4 md:p-6"
                            >
                                <h2 className="text-lg sm:text-xl md:text-2xl font-bold mb-4 flex items-center gap-2">
                                    <FiShoppingBag className="text-blue-600" /> My Orders ({orders.length})
                                </h2>

                                <div className="flex flex-wrap gap-2 mb-4 pb-3 border-b dark:border-gray-700">
                                    <div className="flex-1 min-w-[150px] sm:min-w-[180px]">
                                        <div className="relative">
                                            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                            <input
                                                type="text"
                                                placeholder="Search orders..."
                                                value={searchOrder}
                                                onChange={(e) => setSearchOrder(e.target.value)}
                                                className="w-full pl-8 pr-3 py-2 text-sm border rounded-lg dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-blue-500"
                                            />
                                        </div>
                                    </div>
                                    <select
                                        value={orderFilter}
                                        onChange={(e) => setOrderFilter(e.target.value)}
                                        className="px-3 py-2 text-sm border rounded-lg dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 flex-1 sm:flex-none"
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
                                        className="px-3 py-2 text-sm border rounded-lg dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 flex-1 sm:flex-none"
                                    >
                                        <option value="newest">Newest</option>
                                        <option value="oldest">Oldest</option>
                                        <option value="highest">Highest</option>
                                    </select>
                                </div>

                                {filteredOrders.length === 0 ? (
                                    <div className="text-center py-10 sm:py-12">
                                        <FiShoppingBag className="w-14 h-14 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-3" />
                                        <p className="text-gray-500 text-sm sm:text-base">No orders found</p>
                                        <Link to="/collections/all" className="inline-block mt-3 bg-blue-600 text-white px-5 py-2 rounded-xl hover:bg-blue-700 transition-all text-sm">
                                            Start Shopping →
                                        </Link>
                                    </div>
                                ) : (
                                    <div className="space-y-3 sm:space-y-4">
                                        {filteredOrders.map((order) => {
                                            const orderStatus = getEffectiveOrderStatus(order);
                                            const isDelivered = isOrderDelivered(order);
                                            const isCancelled = normalizeOrderStatus(orderStatus) === "cancelled";

                                            return (
                                                <div key={order.id} className="border-2 border-gray-100 dark:border-gray-700 rounded-xl p-3 sm:p-4 hover:shadow-lg transition-all">
                                                    <div className="flex flex-wrap justify-between items-start gap-2 mb-3">
                                                        <div>
                                                            <p className="font-bold text-sm sm:text-base">Order #{order.id}</p>
                                                            <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                                                                <FiCalendar size={12} /> {formatDate(order.date)}
                                                            </p>
                                                        </div>
                                                        <div className="text-right">
                                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${getOrderStatusBadge(orderStatus)}`}>
                                                                {orderStatus?.toUpperCase()}
                                                            </span>
                                                            <p className="text-base sm:text-lg font-bold text-blue-600 mt-0.5">{formatPrice(order.total)}</p>
                                                        </div>
                                                    </div>

                                                    <div className="space-y-1.5">
                                                        {getOrderItems(order).slice(0, 2).map((item, idx) => (
                                                            <div key={idx} className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                                                <img 
                                                                    src={item.image} 
                                                                    alt={item.name} 
                                                                    className="w-10 h-10 sm:w-12 sm:h-12 object-cover rounded-lg" 
                                                                    onError={(e) => { e.target.src = '/images/no-image.svg'; }}
                                                                />
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="font-medium text-sm truncate">{item.name}</p>
                                                                    <p className="text-[10px] text-gray-500">Qty: {item.quantity} | {formatPrice(item.price)}</p>
                                                                </div>
                                                            </div>
                                                        ))}
                                                        {order.itemsList?.length > 2 && (
                                                            <p className="text-[10px] text-gray-500 text-center">+{order.itemsList.length - 2} more items</p>
                                                        )}
                                                    </div>

                                                    <div className="pt-3 border-t mt-3">
                                                        <div className="flex flex-wrap gap-2">
                                                            <button
                                                                onClick={() => setTrackingOrder(order)}
                                                                className="inline-flex items-center gap-1.5 rounded-xl bg-black px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#b98237]"
                                                            >
                                                                <FiTruck size={13} /> Track Order
                                                            </button>

                                                            {isDelivered && (
                                                                <button
                                                                    onClick={() => setTrackingOrder(order)}
                                                                    className="inline-flex items-center gap-1.5 rounded-xl bg-green-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-green-700"
                                                                >
                                                                    <FiCheckCircle size={13} /> Delivery Complete
                                                                </button>
                                                            )}

                                                            <Link
                                                                to={`/product/${order.itemsList?.[0]?.id}`}
                                                                className="inline-flex items-center gap-1.5 rounded-xl border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:border-black hover:text-black dark:text-gray-200"
                                                                onClick={() => window.scrollTo(0, 0)}
                                                            >
                                                                <FiEye size={13} /> View
                                                            </Link>

                                                            {isDelivered && (
                                                                <button
                                                                    onClick={() => navigateToProductReview(order.itemsList?.[0]?.id, order.itemsList?.[0]?.name, order.id)}
                                                                    className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-amber-700"
                                                                >
                                                                    <FiStar size={13} /> Review
                                                                </button>
                                                            )}

                                                            <button
                                                                type="button"
                                                                onClick={() => deleteOrderFromHistory(order)}
                                                                className="inline-flex items-center gap-1.5 rounded-xl border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-600 transition hover:border-red-300 hover:bg-red-50 hover:text-red-600 dark:border-gray-600 dark:text-gray-300"
                                                            >
                                                                <FiTrash2 size={13} /> Delete
                                                            </button>

                                                            {!isCancelled && !isDelivered && (
                                                                <button
                                                                    onClick={() => cancelOrder(order.id)}
                                                                    disabled={cancellingOrderId === order.id}
                                                                    className="inline-flex items-center gap-1.5 rounded-xl border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                                                                >
                                                                    <FiX size={13} /> {cancellingOrderId === order.id ? "Cancelling..." : "Cancel"}
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {isDelivered && (
                                                        <div className="mt-3 rounded-xl bg-green-50 p-3 dark:bg-green-900/10">
                                                            <div className="flex items-center gap-2 mb-2">
                                                                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-green-600 text-white">
                                                                    <FiCheckCircle size={14} />
                                                                </div>
                                                                <div>
                                                                    <p className="text-xs font-bold text-green-800 dark:text-green-300">Order Delivered!</p>
                                                                    <p className="text-[10px] text-green-700 dark:text-green-400">You can now request a return for eligible items.</p>
                                                                </div>
                                                            </div>
                                                            <div className="space-y-2">
                                                                {getOrderItems(order).map((item, itemIndex) => {
                                                                    const alreadyReturned = hasReturnRequestForItem(getOrderIdentifier(order), getItemIdentifier(item));
                                                                    return (
                                                                        <div key={`${getOrderIdentifier(order)}-${getItemIdentifier(item)}-${itemIndex}`} className="flex flex-col gap-2 rounded-lg border border-gray-200 bg-white p-2 sm:flex-row sm:items-center sm:justify-between dark:border-gray-600 dark:bg-gray-800">
                                                                            <div className="flex min-w-0 items-center gap-2">
                                                                                {item.image ? (
                                                                                    <img src={item.image} alt={item.name} className="h-10 w-10 shrink-0 rounded-lg object-cover" />
                                                                                ) : (
                                                                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-700">
                                                                                        <FiPackage className="text-gray-400" />
                                                                                    </div>
                                                                                )}
                                                                                <div className="min-w-0">
                                                                                    <p className="truncate text-xs font-semibold">{item.name}</p>
                                                                                    <p className="text-[10px] text-gray-500">Qty {item.quantity || 1}{item.size ? ` · ${item.size}` : ""}{item.color ? ` · ${item.color}` : ""}</p>
                                                                                </div>
                                                                            </div>
                                                                            <button
                                                                                onClick={() => openReturnForItem(order, item)}
                                                                                disabled={alreadyReturned}
                                                                                className="inline-flex items-center gap-1.5 rounded-lg border border-orange-300 px-2 py-1 text-[10px] font-bold text-orange-700 transition hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-50"
                                                                            >
                                                                                <FiCornerDownLeft /> {alreadyReturned ? "Return Requested" : "Return Item"}
                                                                            </button>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {/* WISHLIST TAB */}
                        {activeTab === "wishlist" && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-3 sm:p-4 md:p-6"
                            >
                                <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
                                    <h2 className="text-lg sm:text-xl md:text-2xl font-bold flex items-center gap-2">
                                        <FiHeart className="text-red-500" /> My Wishlist ({favorites.length})
                                    </h2>
                                    <div className="flex gap-1.5">
                                        <button 
                                            onClick={() => { if (user?.email) { refreshFavorites(true); toast.success("Wishlist refreshed"); } }} 
                                            className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-all"
                                        >
                                            <FiRefreshCw size={15} />
                                        </button>
                                        <button onClick={() => setWishlistView("grid")} className={`p-2 rounded-lg ${wishlistView === "grid" ? "bg-blue-100 text-blue-600" : "bg-gray-100"}`}>
                                            <FiGrid size={17} />
                                        </button>
                                        <button onClick={() => setWishlistView("list")} className={`p-2 rounded-lg ${wishlistView === "list" ? "bg-blue-100 text-blue-600" : "bg-gray-100"}`}>
                                            <FiList size={17} />
                                        </button>
                                    </div>
                                </div>

                                {favorites.length === 0 ? (
                                    <div className="text-center py-10 sm:py-12">
                                        <FiHeart className="w-14 h-14 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-3" />
                                        <p className="text-gray-500 text-sm sm:text-base">Your wishlist is empty</p>
                                        <p className="text-xs text-gray-400 mt-1">Products you add to favorites will appear here</p>
                                        <Link to="/collections/all" className="inline-block mt-3 bg-blue-600 text-white px-5 py-2 rounded-xl hover:bg-blue-700 transition-all text-sm">
                                            Explore Products →
                                        </Link>
                                    </div>
                                ) : wishlistView === "grid" ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                                        {favorites.map((product) => (
                                            <div key={product.id} className="border-2 border-gray-100 dark:border-gray-700 rounded-xl p-3 hover:shadow-xl transition-all group">
                                                <div className="relative">
                                                    <img
                                                        src={product.image || '/images/no-image.svg'}
                                                        alt={product.name}
                                                        className="w-full h-40 sm:h-48 object-cover rounded-lg mb-2 group-hover:scale-105 transition-transform duration-300"
                                                        onError={(e) => { e.target.src = '/images/no-image.svg'; }}
                                                    />
                                                    <button 
                                                        onClick={() => removeFromFavorites(product.id)} 
                                                        className="absolute top-2 right-2 bg-white rounded-full p-1.5 shadow-md hover:scale-110 transition-transform"
                                                    >
                                                        <FiTrash2 size={14} className="text-red-500" />
                                                    </button>
                                                </div>
                                                <h3 className="font-semibold text-gray-800 dark:text-white text-sm">{product.name}</h3>
                                                <p className="text-gray-500 text-xs mt-0.5">{product.brand || "Zamed"}</p>
                                                <p className="text-blue-600 font-bold text-base mt-1">{formatPrice(product.price)}</p>
                                                <div className="flex gap-2 mt-2">
                                                    <button 
                                                        onClick={() => {
                                                            const fullProduct = favorites.find(p => String(p.id) === String(product.id));
                                                            if (fullProduct) addToCartFromFavorites(fullProduct);
                                                            else toast.error("Product not found");
                                                        }} 
                                                        className="flex-1 bg-gray-900 text-white py-1.5 rounded-lg text-xs font-medium hover:bg-gray-800 transition-all"
                                                    >
                                                        Add to Cart
                                                    </button>
                                                    <Link
                                                        to={`/product/${product.id}`}
                                                        className="px-3 py-1.5 border-2 border-gray-300 text-gray-700 rounded-lg text-xs font-medium hover:border-blue-600 hover:text-blue-600 transition-all"
                                                        onClick={() => window.scrollTo(0, 0)}
                                                    >
                                                        View
                                                    </Link>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {favorites.map((product) => (
                                            <div key={product.id} className="flex flex-wrap items-center gap-3 p-3 border rounded-xl hover:shadow-md transition-all">
                                                <img
                                                    src={product.image || '/images/no-image.svg'}
                                                    alt={product.name}
                                                    className="w-14 h-14 sm:w-16 sm:h-16 object-cover rounded-lg"
                                                    onError={(e) => { e.target.src = '/images/no-image.svg'; }}
                                                />
                                                <div className="flex-1 min-w-[120px]">
                                                    <h3 className="font-semibold text-sm">{product.name}</h3>
                                                    <p className="text-xs text-gray-500">{product.brand || "Zamed"}</p>
                                                    <p className="text-blue-600 font-bold text-sm">{formatPrice(product.price)}</p>
                                                </div>
                                                <div className="flex flex-wrap gap-1.5">
                                                    <button 
                                                        onClick={() => {
                                                            const fullProduct = favorites.find(p => String(p.id) === String(product.id));
                                                            if (fullProduct) addToCartFromFavorites(fullProduct);
                                                        }} 
                                                        className="px-3 py-1 bg-gray-900 text-white rounded-lg text-xs hover:bg-gray-800"
                                                    >
                                                        Add to Cart
                                                    </button>
                                                    <Link
                                                        to={`/product/${product.id}`}
                                                        onClick={() => window.scrollTo(0, 0)}
                                                        className="px-3 py-1 border border-gray-300 text-gray-700 rounded-lg text-xs hover:border-blue-600 hover:text-blue-600 transition-all"
                                                    >
                                                        View
                                                    </Link>
                                                    <button 
                                                        onClick={() => removeFromFavorites(product.id)} 
                                                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"
                                                    >
                                                        <FiTrash2 size={15} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {/* COUPONS TAB */}
                        {activeTab === "coupons" && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-3 sm:p-4 md:p-6"
                            >
                                <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                                    <h2 className="text-lg sm:text-xl md:text-2xl font-bold flex items-center gap-2">
                                        <FiTag className="text-green-600" /> My Coupons ({userCoupons.length})
                                    </h2>
                                    {userCoupons.length > 0 && (
                                        <span className="text-xs text-gray-500">
                                            {userCoupons.filter(c => !c.used && (!c.endDate || new Date(c.endDate) > new Date())).length} active
                                        </span>
                                    )}
                                </div>
                                {userCoupons.length === 0 ? (
                                    <div className="text-center py-10 sm:py-12">
                                        <FiTag className="w-14 h-14 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-3" />
                                        <p className="text-gray-500 text-sm sm:text-base">No coupons available</p>
                                        <p className="text-xs text-gray-400 mt-1">Coupons will appear here when you receive special offers</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                                        {userCoupons.map((coupon) => {
                                            const isExpired = coupon.endDate && new Date(coupon.endDate) < new Date();
                                            const isUsed = coupon.used === true;
                                            const isActive = !isExpired && !isUsed;

                                            return (
                                                <motion.div
                                                    key={coupon.id || coupon.code}
                                                    initial={{ opacity: 0, scale: 0.95 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    whileHover={{ y: -3 }}
                                                    className="overflow-hidden rounded-xl border border-[#e6dccb] bg-white shadow-[0_8px_25px_rgba(40,28,10,0.06)] transition-all hover:shadow-lg dark:border-gray-700 dark:bg-gray-800"
                                                >
                                                    <div
                                                        className={`relative overflow-hidden bg-gradient-to-br ${cardAccent(coupon.discountType)} p-4 text-white`}
                                                        style={getCouponBackgroundStyle(coupon)}
                                                    >
                                                        <div className="relative z-[1]">
                                                            <div className="flex items-start justify-between gap-2">
                                                                <div>
                                                                    <p className="text-[9px] font-semibold tracking-[0.2em] text-[#e6bd70]">
                                                                        {isActive ? "ACTIVE OFFER" : isExpired ? "EXPIRED" : "USED"}
                                                                    </p>
                                                                    <h3 className="mt-1 font-serif text-lg sm:text-xl">{getDiscountLabel(coupon)}</h3>
                                                                    <p className="mt-0.5 text-sm text-white/65 line-clamp-1">{coupon.title || coupon.description}</p>
                                                                </div>
                                                                <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${isActive ? "bg-emerald-400/20 text-emerald-300" : isExpired ? "bg-red-400/20 text-red-300" : "bg-white/10 text-white/60"}`}>
                                                                    {isActive ? "Active" : isExpired ? "Expired" : "Used"}
                                                                </span>
                                                            </div>
                                                            <div className="mt-3 flex items-center justify-between rounded-lg border border-white/15 bg-black/20 px-3 py-1.5">
                                                                <span className="font-mono text-xs font-bold tracking-[0.12em]">{coupon.code}</span>
                                                                <button
                                                                    onClick={() => {
                                                                        navigator.clipboard.writeText(coupon.code);
                                                                        toast.success(`Coupon code ${coupon.code} copied!`);
                                                                    }}
                                                                    className="rounded-lg p-1 text-[#e8bf75] transition hover:bg-white/10"
                                                                >
                                                                    <FiCopy size={14} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="p-3 sm:p-4">
                                                        <p className="text-sm text-gray-500 line-clamp-2">{coupon.description || "Premium discount for ZAMED customers."}</p>
                                                        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                                                            <div className="rounded-lg bg-[#faf7f1] p-2 dark:bg-gray-700/50">
                                                                <span className="text-gray-400">Minimum order</span>
                                                                <p className="mt-0.5 font-semibold text-gray-900 dark:text-white">
                                                                    {coupon.minPurchase > 0 ? `${currencySymbol}${coupon.minPurchase}` : "No minimum"}
                                                                </p>
                                                            </div>
                                                            <div className="rounded-lg bg-[#faf7f1] p-2 dark:bg-gray-700/50">
                                                                <span className="text-gray-400">Valid until</span>
                                                                <p className="mt-0.5 font-semibold text-gray-900 dark:text-white">
                                                                    {coupon.endDate ? new Date(coupon.endDate).toLocaleDateString() : "No expiry"}
                                                                </p>
                                                            </div>
                                                        </div>

                                                        <div className="mt-3 flex flex-wrap gap-2">
                                                            <button
                                                                onClick={() => {
                                                                    navigator.clipboard.writeText(coupon.code);
                                                                    toast.success(`Coupon code ${coupon.code} copied!`);
                                                                }}
                                                                className="flex-1 rounded-lg bg-[#171511] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#b47a29] flex items-center justify-center gap-1.5"
                                                            >
                                                                <FiCopy size={13} /> Copy Code
                                                            </button>
                                                            {isActive && (
                                                                <Link
                                                                    to="/collections/all"
                                                                    className="flex-1 rounded-lg border border-[#ded4c5] px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:border-[#b47a29] hover:text-[#a36d23] flex items-center justify-center gap-1.5 dark:border-gray-600 dark:text-gray-300"
                                                                >
                                                                    Shop <FiArrowRight size={13} />
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

                        {/* RETURNS TAB */}
                        {activeTab === "returns" && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-3 sm:p-4 md:p-6"
                            >
                                <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                                    <h2 className="text-lg sm:text-xl md:text-2xl font-bold flex items-center gap-2">
                                        <FiShield className="text-orange-600" /> Returns & Refunds ({returnRequests.length})
                                    </h2>
                                    <span className="text-[10px] text-gray-500">Refunds take up to 7 business days</span>
                                </div>

                                {returnRequests.length === 0 ? (
                                    <div className="text-center py-10 sm:py-12">
                                        <FiShield className="w-14 h-14 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-3" />
                                        <p className="text-gray-500 text-sm sm:text-base">No return requests yet</p>
                                        <p className="text-xs text-gray-400 mt-1">When you request a return, it will appear here with full tracking</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3 sm:space-y-4">
                                        {returnRequests.map((returnReq) => (
                                            <div
                                                key={returnReq.id}
                                                className="border-2 rounded-xl p-3 sm:p-4 cursor-pointer hover:shadow-lg transition-all"
                                                onClick={() => setSelectedReturnRequest(returnReq)}
                                            >
                                                <div className="flex flex-wrap justify-between items-start gap-2 mb-3">
                                                    <div className="flex gap-3 min-w-0">
                                                        {returnReq.productImage && (
                                                            <img src={returnReq.productImage} alt={returnReq.productName} className="w-12 h-12 sm:w-14 sm:h-14 object-cover rounded-lg shrink-0" />
                                                        )}
                                                        <div className="min-w-0">
                                                            <p className="font-medium text-sm truncate">{returnReq.productName}</p>
                                                            <p className="text-[10px] text-gray-500">Return ID: #{returnReq.id}</p>
                                                            {returnReq.refundMethod && (
                                                                <p className="text-[10px] text-green-600 mt-0.5">Refund: {returnReq.refundMethod.method}</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="text-right shrink-0">
                                                        <div className="flex items-center gap-1 justify-end">
                                                            {getReturnStatusIcon(returnReq.status)}
                                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${getReturnStatusBadge(returnReq.status)}`}>
                                                                {getReturnStatusText(returnReq.status)}
                                                            </span>
                                                        </div>
                                                        <p className="text-base font-bold text-green-600 mt-0.5">{formatPrice(returnReq.refundAmount)}</p>
                                                        {returnReq.status === 'refund_processing' && (
                                                            <p className="text-[10px] text-orange-600 mt-0.5">⏳ Processing (7 days)</p>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="mt-2">
                                                    <div className="flex justify-between text-[10px] text-gray-500 mb-0.5">
                                                        <span>Requested</span>
                                                        <span>Pickup</span>
                                                        <span>Collected</span>
                                                        <span>Verified</span>
                                                        <span>Refunded</span>
                                                    </div>
                                                    <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-gradient-to-r from-yellow-500 via-blue-500 to-green-500 rounded-full transition-all duration-500"
                                                            style={{ width: `${returnStages[returnReq.status]?.progress || 0}%` }}
                                                        />
                                                    </div>
                                                </div>

                                                <div className="mt-2 text-[10px] text-gray-500 flex items-center gap-1.5">
                                                    <FiInfo size={12} />
                                                    <span>Click to view full tracking history and refund details</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {/* NOTIFICATIONS TAB */}
                        {activeTab === "notifications" && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="rounded-xl border border-gray-200 bg-white p-3 shadow-xl sm:p-4 md:p-6 dark:border-gray-700 dark:bg-gray-800"
                            >
                                <div className="flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-end sm:justify-between dark:border-gray-700">
                                    <div>
                                        <h2 className="text-lg sm:text-xl font-bold">Notifications</h2>
                                        <p className="mt-0.5 text-xs text-gray-500">Open any notification to view related content</p>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5">
                                        {[["all", `All (${notifications.length})`], ["unread", `Unread (${notifications.filter(n => !n.read).length})`], ["read", `Read (${notifications.filter(n => n.read).length})`]].map(([v, l]) => (
                                            <button key={v} onClick={() => setNotificationFilter(v)} className={`rounded-full px-3 py-1 text-[10px] font-bold ${notificationFilter === v ? "bg-black text-white" : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300"}`}>{l}</button>
                                        ))}
                                    </div>
                                </div>
                                <div className="mt-3 flex justify-end gap-1.5 flex-wrap">
                                    {notifications.some(n => !n.read) && <button onClick={markAllNotificationsAsRead} className="rounded-lg bg-black px-3 py-1 text-[10px] font-bold text-white">Mark all as read</button>}
                                    {notifications.some(n => n.read) && <button onClick={clearReadNotifications} className="rounded-lg border px-3 py-1 text-[10px] font-bold text-red-600">Clear read</button>}
                                </div>
                                <div className="mt-3 space-y-2">
                                    {filteredNotifications.length === 0 ? (
                                        <div className="py-10 text-center text-gray-500">
                                            <FiBell className="mx-auto mb-2 h-10 w-10 text-gray-300" />
                                            No {notificationFilter === "all" ? "" : notificationFilter} notifications
                                        </div>
                                    ) : (
                                        filteredNotifications.map(notif => (
                                            <div key={getNotificationId(notif)} className={`rounded-xl border p-3 ${notif.read ? "bg-gray-50 dark:bg-gray-700/30" : "border-amber-300 bg-amber-50/70 dark:bg-amber-900/10"}`}>
                                                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex flex-wrap items-center gap-1.5">
                                                            <p className="font-bold text-sm">{notif.title}</p>
                                                            {!notif.read && <span className="rounded-full bg-amber-500 px-1.5 py-0.5 text-[9px] font-bold text-white">UNREAD</span>}
                                                        </div>
                                                        <p className="mt-0.5 text-xs text-gray-500">{notif.message}</p>
                                                        <p className="mt-0.5 text-[10px] text-gray-400">{formatDateTime(notif.date || notif.createdAt || new Date())}</p>
                                                    </div>
                                                    <div className="flex gap-1.5">
                                                        <button onClick={() => viewNotificationDetails(notif)} className="rounded-lg bg-black px-3 py-1 text-[10px] font-bold text-white">View</button>
                                                        <button onClick={() => notif.read ? markNotificationAsUnread(getNotificationId(notif)) : markNotificationAsRead(getNotificationId(notif))} className="rounded-lg border px-3 py-1 text-[10px] font-bold">{notif.read ? "Unread" : "Read"}</button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </motion.div>
                        )}

                        {/* ADDRESSES TAB */}
                        {activeTab === "addresses" && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-3 sm:p-4 md:p-6"
                            >
                                <div className="flex flex-wrap justify-between items-center gap-2 mb-4">
                                    <h2 className="text-lg sm:text-xl md:text-2xl font-bold flex items-center gap-2">
                                        <FiMapPin className="text-green-600" /> My Addresses
                                    </h2>
                                    <button onClick={() => setShowAddAddress(true)} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 transition-all flex items-center gap-1.5">
                                        <FiPlus size={13} /> Add New
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                                    {addresses.map((address) => (
                                        <div key={address.id} className={`border-2 rounded-xl p-3 ${address.isDefault ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700'}`}>
                                            <div className="flex flex-wrap justify-between items-start gap-1 mb-1.5">
                                                <div className="flex items-center gap-1.5">
                                                    {address.isDefault && (
                                                        <span className="px-1.5 py-0.5 bg-blue-600 text-white text-[9px] rounded-full">Default</span>
                                                    )}
                                                </div>
                                                <div className="flex gap-1.5">
                                                    {!address.isDefault && (
                                                        <button onClick={() => setDefaultAddress(address.id)} className="text-[10px] text-blue-600 hover:underline">Set Default</button>
                                                    )}
                                                    <button onClick={() => deleteAddress(address.id)} className="text-red-500 hover:text-red-700">
                                                        <FiTrash2 size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                            <p className="font-medium text-sm">{address.street}</p>
                                            <p className="text-xs text-gray-600">{address.city}, {address.state}</p>
                                            <p className="text-xs text-gray-600">{address.zipCode}, {address.country}</p>
                                            {address.phone && <p className="text-xs text-gray-500 mt-0.5">📞 {address.phone}</p>}
                                        </div>
                                    ))}
                                </div>

                                {addresses.length === 0 && (
                                    <div className="text-center py-10">
                                        <FiMapPin className="w-14 h-14 text-gray-300 mx-auto mb-2" />
                                        <p className="text-gray-500">No addresses saved yet</p>
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {/* SECURITY TAB */}
                        {activeTab === "security" && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="rounded-xl border border-gray-200 bg-white p-3 shadow-xl sm:p-4 md:p-6 dark:border-gray-700 dark:bg-gray-800"
                            >
                                <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2"><FiLock /> Security</h2>
                                <p className="mt-0.5 text-xs text-gray-500">Manage password, two-factor authentication, alerts and sessions.</p>

                                <form onSubmit={handleChangePassword} className="mt-4 rounded-xl border p-3 dark:border-gray-700">
                                    <div className="flex flex-wrap justify-between items-center gap-1">
                                        <h3 className="font-bold text-sm">Change Password</h3>
                                        <button type="button" onClick={() => setShowPasswords(v => !v)}><FiEye size={16} /></button>
                                    </div>
                                    <div className="mt-3 grid gap-2 sm:grid-cols-3">
                                        {[["currentPassword", "Current"], ["newPassword", "New"], ["confirmPassword", "Confirm"]].map(([k, p]) => (
                                            <input key={k} type={showPasswords ? "text" : "password"} value={passwordForm[k]} onChange={e => setPasswordForm(x => ({ ...x, [k]: e.target.value }))} placeholder={p} className="rounded-lg border px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700" />
                                        ))}
                                    </div>
                                    <button disabled={changingPassword} className="mt-3 rounded-lg bg-black px-4 py-2 text-xs font-bold text-white">{changingPassword ? "Updating..." : "Update Password"}</button>
                                </form>

                                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                    <div className="rounded-xl border p-3 dark:border-gray-700">
                                        <h3 className="font-bold text-sm">Two-Factor Auth</h3>
                                        <p className="text-xs text-gray-500">Status: {securityPrefs.twoFactorEnabled ? "Enabled" : "Disabled"}</p>
                                        <button onClick={toggleTwoFactor} disabled={securityActionLoading} className="mt-2 rounded-lg border px-3 py-1 text-xs font-bold">{securityPrefs.twoFactorEnabled ? "Disable" : "Enable"}</button>
                                    </div>
                                    <div className="rounded-xl border p-3 dark:border-gray-700">
                                        <h3 className="font-bold text-sm">Security Alerts</h3>
                                        {[["loginAlerts", "Login alerts"], ["securityEmails", "Security emails"]].map(([k, l]) => (
                                            <label key={k} className="mt-2 flex justify-between text-xs">
                                                <span>{l}</span>
                                                <input type="checkbox" checked={securityPrefs[k]} onChange={e => persistSecurityPrefs({ ...securityPrefs, [k]: e.target.checked })} />
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                <div className="mt-4 rounded-xl border p-3 dark:border-gray-700">
                                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                        <div>
                                            <h3 className="font-bold text-sm">Current Session</h3>
                                            <p className="text-xs text-gray-500">Browser • Active now</p>
                                        </div>
                                        <button onClick={logoutOtherSessions} disabled={securityActionLoading} className="rounded-lg border border-red-200 px-3 py-1 text-xs font-bold text-red-600">Sign out other sessions</button>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* SETTINGS TAB */}
                        {activeTab === "settings" && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="space-y-4"
                            >
                                <section className="rounded-xl border border-gray-200 bg-white p-3 shadow-xl sm:p-4 md:p-6 dark:border-gray-700 dark:bg-gray-800">
                                    <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2"><FiSettings /> Settings</h2>
                                    <p className="text-xs text-gray-500">Manage communication and shopping preferences.</p>
                                    <div className="mt-3">
                                        {[["emailNotifications", "Email Notifications"], ["smsAlerts", "SMS Alerts"], ["orderUpdates", "Order Updates"], ["promotionalOffers", "Offers & Promotions"], ["wishlistAlerts", "Wishlist Alerts"]].map(([k, l]) => (
                                            <label key={k} className="flex items-center justify-between border-b py-3 last:border-0 dark:border-gray-700">
                                                <span className="font-bold text-sm">{l}</span>
                                                <input type="checkbox" checked={accountPrefs[k]} onChange={e => persistAccountPrefs({ ...accountPrefs, [k]: e.target.checked })} />
                                            </label>
                                        ))}
                                    </div>
                                </section>

                                <section className="grid gap-3 sm:grid-cols-2">
                                    <div className="rounded-xl border bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                                        <FiDownload className="text-xl" />
                                        <h3 className="mt-2 font-bold text-sm">Download My Data</h3>
                                        <button onClick={downloadAccountData} className="mt-2 rounded-lg border px-3 py-1 text-xs font-bold">Download</button>
                                    </div>
                                    <div className="rounded-xl border bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                                        <FiMoon className="text-xl" />
                                        <h3 className="mt-2 font-bold text-sm">Appearance</h3>
                                        <button onClick={() => { const next = !darkMode; setDarkMode(next); localStorage.setItem("theme", next ? "dark" : "light"); document.documentElement.classList.toggle("dark", next); }} className="mt-2 rounded-lg bg-black px-3 py-1 text-xs font-bold text-white">
                                            {darkMode ? "Light Mode" : "Dark Mode"}
                                        </button>
                                    </div>
                                </section>

                                <section className="rounded-xl border border-red-200 bg-red-50 p-4 dark:bg-red-900/10">
                                    <h3 className="font-bold text-red-700 text-sm">Delete Account</h3>
                                    <p className="text-xs text-red-600">Type DELETE to confirm permanent deletion.</p>
                                    <button onClick={handleDeleteAccount} disabled={deletingAccount} className="mt-2 rounded-lg bg-red-600 px-4 py-1.5 text-xs font-bold text-white">
                                        {deletingAccount ? "Deleting..." : "Delete Account"}
                                    </button>
                                </section>
                            </motion.div>
                        )}
                    </div>
                </div>

                {/* ============================================================
                    TRACKING MODAL
                ============================================================ */}
                {trackingOrder && (
                    <TrackingModal 
                        order={trackingOrder} 
                        onClose={() => setTrackingOrder(null)} 
                    />
                )}

                {/* ============================================================
                    EDIT PROFILE MODAL
                ============================================================ */}
                <EditProfileModal />

                {/* ============================================================
                    RETURN ITEM MODAL
                ============================================================ */}
                <AnimatePresence>
                    {selectedItemForReturn && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm"
                            onMouseDown={(event) => {
                                if (event.target === event.currentTarget) {
                                    resetReturnForm();
                                }
                            }}
                        >
                            <motion.div
                                initial={{ opacity: 0, y: 24, scale: 0.97 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 15, scale: 0.98 }}
                                className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-4 shadow-2xl dark:bg-gray-800"
                            >
                                {/* Return modal content - same as before */}
                                <div className="flex items-start justify-between gap-3 border-b border-gray-100 pb-3 dark:border-gray-700">
                                    <div className="min-w-0">
                                        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-orange-600">Returns & Refunds</p>
                                        <h2 className="mt-0.5 text-lg font-bold sm:text-xl">Return Item</h2>
                                        <p className="mt-0.5 truncate text-xs text-gray-500">{selectedItemForReturn.productName}</p>
                                    </div>
                                    <button type="button" onClick={resetReturnForm} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300">
                                        <FiX size={18} />
                                    </button>
                                </div>

                                <div className="mt-4 flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-700/40">
                                    {selectedItemForReturn.productImage ? (
                                        <img src={selectedItemForReturn.productImage} alt={selectedItemForReturn.productName} className="h-14 w-14 shrink-0 rounded-lg object-cover" />
                                    ) : (
                                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-white dark:bg-gray-700"><FiPackage className="text-gray-400" /></div>
                                    )}
                                    <div className="min-w-0">
                                        <p className="truncate font-bold text-sm">{selectedItemForReturn.productName}</p>
                                        <p className="text-[10px] text-gray-500">Order #{selectedItemForReturn.orderId}</p>
                                        <p className="text-[10px] text-gray-500">Paid by: <strong>{selectedItemForReturn.paymentMethod}</strong></p>
                                    </div>
                                </div>

                                <div className="mt-4 space-y-4">
                                    <div>
                                        <label className="mb-1.5 block text-xs font-bold">Reason for return</label>
                                        <select value={returnReason} onChange={event => setReturnReason(event.target.value)} className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-orange-500 dark:border-gray-600 dark:bg-gray-700">
                                            <option value="">Select a reason</option>
                                            {returnReasons.map(reason => <option key={reason} value={reason}>{reason}</option>)}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="mb-1.5 block text-xs font-bold">Additional details</label>
                                        <textarea rows={2} value={returnComment} onChange={event => setReturnComment(event.target.value)} placeholder="Tell us more..." className="w-full resize-none rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-orange-500 dark:border-gray-600 dark:bg-gray-700" />
                                    </div>

                                    <div className="rounded-xl border border-gray-200 p-3 dark:border-gray-600">
                                        <div className="mb-2 flex items-center gap-1.5"><FiDollarSign className="text-green-600" /><h3 className="font-bold text-sm">Refund method</h3></div>
                                        {selectedItemForReturn.isCashOrder ? (
                                            <div className="space-y-2">
                                                <p className="text-xs text-gray-500">This order was paid by cash. Choose how you want to receive your approved refund.</p>
                                                <label className={`flex cursor-pointer items-start gap-2 rounded-lg border p-3 transition ${returnMethod === "bank_transfer" ? "border-black bg-gray-50 dark:border-white dark:bg-gray-700" : "border-gray-200 dark:border-gray-600"}`}>
                                                    <input type="radio" name="returnMethod" value="bank_transfer" checked={returnMethod === "bank_transfer"} onChange={event => setReturnMethod(event.target.value)} className="mt-1 accent-black" />
                                                    <div><p className="font-bold text-sm">Bank transfer</p><p className="mt-0.5 text-xs text-gray-500">Send refund to bank account. Takes up to 7 days.</p></div>
                                                </label>
                                                <label className={`flex cursor-pointer items-start gap-2 rounded-lg border p-3 transition ${returnMethod === "shop_pickup" ? "border-black bg-gray-50 dark:border-white dark:bg-gray-700" : "border-gray-200 dark:border-gray-600"}`}>
                                                    <input type="radio" name="returnMethod" value="shop_pickup" checked={returnMethod === "shop_pickup"} onChange={event => setReturnMethod(event.target.value)} className="mt-1 accent-black" />
                                                    <div><p className="font-bold text-sm">Collect from shop</p><p className="mt-0.5 text-xs text-gray-500">Choose date/time to collect approved refund.</p></div>
                                                </label>
                                            </div>
                                        ) : (
                                            <div className="rounded-lg bg-green-50 p-3 text-sm text-green-900 dark:bg-green-900/20 dark:text-green-300">
                                                <div className="flex items-center gap-1.5 font-bold"><FiCreditCard /> Original payment method</div>
                                                <p className="mt-0.5 text-xs">Refund will be returned to the payment method used. Takes up to 7 days.</p>
                                            </div>
                                        )}
                                    </div>

                                    {returnMethod === "bank_transfer" && selectedItemForReturn.isCashOrder && (
                                        <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3 dark:border-blue-900/40 dark:bg-blue-900/10">
                                            <h3 className="font-bold text-sm">Bank details</h3>
                                            <div className="mt-2 grid gap-2 sm:grid-cols-2">
                                                <input type="text" value={accountHolderName} onChange={event => setAccountHolderName(event.target.value)} placeholder="Account holder" className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-gray-600 dark:bg-gray-700" />
                                                <input type="text" value={bankName} onChange={event => setBankName(event.target.value)} placeholder="Bank name" className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-gray-600 dark:bg-gray-700" />
                                                <input type="text" inputMode="numeric" value={accountNumber} onChange={event => setAccountNumber(event.target.value.replace(/[^0-9]/g, ""))} placeholder="Account number" className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-gray-600 dark:bg-gray-700" />
                                                <input type="text" value={bankBranch} onChange={event => setBankBranch(event.target.value)} placeholder="Branch" className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-gray-600 dark:bg-gray-700" />
                                            </div>
                                        </div>
                                    )}

                                    {returnMethod === "shop_pickup" && selectedItemForReturn.isCashOrder && (
                                        <div className="rounded-xl border border-orange-200 bg-orange-50/50 p-3 dark:border-orange-900/40 dark:bg-orange-900/10">
                                            <h3 className="font-bold text-sm">Shop collection</h3>
                                            <div className="mt-2 grid gap-2 sm:grid-cols-2">
                                                <div><label className="mb-0.5 block text-[10px] font-bold">Collection date</label><input type="date" min={new Date().toISOString().split("T")[0]} value={shopPickupDate} onChange={event => setShopPickupDate(event.target.value)} className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700" /></div>
                                                <div><label className="mb-0.5 block text-[10px] font-bold">Collection time</label><input type="time" value={shopPickupTime} onChange={event => setShopPickupTime(event.target.value)} className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700" /></div>
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex items-start gap-2 rounded-xl bg-orange-50 p-3 text-sm text-orange-900 dark:bg-orange-900/20 dark:text-orange-200">
                                        <FiClock className="mt-0.5 shrink-0 text-orange-600" />
                                        <div><p className="font-bold text-sm">Refund processing</p><p className="mt-0.5 text-xs">After approval, refunds can take up to 7 days.</p></div>
                                    </div>
                                </div>

                                <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row">
                                    <button type="button" onClick={resetReturnForm} className="flex-1 rounded-lg border border-gray-200 py-2.5 text-xs font-bold dark:border-gray-600">Cancel</button>
                                    <button type="button" onClick={submitReturnRequest} disabled={isSubmittingReturn} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-black py-2.5 text-xs font-bold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50">
                                        {isSubmittingReturn ? <><FiLoader className="animate-spin" /> Submitting...</> : <><FiCornerDownLeft /> Submit Return</>}
                                    </button>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default Profile;