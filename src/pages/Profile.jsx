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
    FiArrowLeft, FiArrowRight, FiEdit, FiMoreVertical, FiCopy, FiEye,
    FiDollarSign as FiDollar
} from "react-icons/fi";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { useCart } from "../context/CartContext";
import orderService from "../services/orderService";
import productService from "../services/productService";

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const RETURNS_DB_NAME = "zamed_returns_db";
const RETURNS_DB_VERSION = 1;
const RETURNS_STORE = "returns";

const openReturnsDatabase = () =>
    new Promise((resolve, reject) => {
        if (typeof indexedDB === "undefined") {
            reject(new Error("IndexedDB is not available"));
            return;
        }

        const request = indexedDB.open(
            RETURNS_DB_NAME,
            RETURNS_DB_VERSION
        );

        request.onupgradeneeded = () => {
            const db = request.result;

            if (!db.objectStoreNames.contains(RETURNS_STORE)) {
                db.createObjectStore(
                    RETURNS_STORE,
                    {
                        keyPath: "id"
                    }
                );
            }
        };

        request.onsuccess = () =>
            resolve(request.result);

        request.onerror = () =>
            reject(request.error);
    });

const getAllReturnRecords = async () => {
    try {
        const db =
            await openReturnsDatabase();

        return await new Promise(
            (resolve, reject) => {
                const tx =
                    db.transaction(
                        RETURNS_STORE,
                        "readonly"
                    );

                const request =
                    tx.objectStore(
                        RETURNS_STORE
                    ).getAll();

                request.onsuccess = () =>
                    resolve(
                        Array.isArray(
                            request.result
                        )
                            ? request.result
                            : []
                    );

                request.onerror = () =>
                    reject(request.error);
            }
        );
    } catch (error) {
        console.warn(
            "Unable to load returns from IndexedDB:",
            error
        );

        return [];
    }
};

const putReturnRecord = async (record) => {
    if (!record) return false;

    const id =
        record.id ||
        record._id ||
        `${record.orderId}-${record.productId}`;

    if (!id) return false;

    try {
        const db =
            await openReturnsDatabase();

        return await new Promise(
            (resolve, reject) => {
                const tx =
                    db.transaction(
                        RETURNS_STORE,
                        "readwrite"
                    );

                tx.objectStore(
                    RETURNS_STORE
                ).put({
                    ...record,
                    id: String(id)
                });

                tx.oncomplete = () =>
                    resolve(true);

                tx.onerror = () =>
                    reject(tx.error);

                tx.onabort = () =>
                    reject(tx.error);
            }
        );
    } catch (error) {
        console.warn(
            "Unable to save return to IndexedDB:",
            error
        );

        return false;
    }
};

const putAllReturnRecords = async (records = []) => {
    const list =
        Array.isArray(records)
            ? records
            : [];

    const results =
        await Promise.all(
            list.map(record =>
                putReturnRecord(record)
            )
        );

    return results.some(Boolean);
};

const compactReturnForLocalStorage = (record = {}) => {
    const refundMethod =
        typeof record.refundMethod === "object" &&
        record.refundMethod !== null
            ? {
                ...record.refundMethod
            }
            : record.refundMethod;

    return {
        ...record,

        // Base64 product images are the main source of localStorage quota errors.
        productImage:
            typeof record.productImage === "string" &&
            record.productImage.startsWith("data:")
                ? ""
                : record.productImage || "",

        refundMethod,

        // Keep useful history, but prevent uncontrolled growth.
        trackingHistory:
            Array.isArray(record.trackingHistory)
                ? record.trackingHistory.slice(-20)
                : []
    };
};

const saveCompactReturnsToLocalStorage = (
    records = []
) => {
    try {
        const compact =
            records.map(
                compactReturnForLocalStorage
            );

        localStorage.setItem(
            "return_requests",
            JSON.stringify(compact)
        );

        return true;
    } catch (error) {
        if (
            error?.name ===
            "QuotaExceededError"
        ) {
            try {
                // Last-resort tiny cache.
                const tiny =
                    records.map(record => ({
                        id:
                            record.id ||
                            record._id,
                        orderId:
                            record.orderId,
                        productId:
                            record.productId,
                        productName:
                            record.productName,
                        userEmail:
                            record.userEmail,
                        refundAmount:
                            record.refundAmount,
                        refundMethod:
                            record.refundMethod,
                        status:
                            record.status,
                        date:
                            record.date,
                        updatedAt:
                            record.updatedAt
                    }));

                localStorage.setItem(
                    "return_requests",
                    JSON.stringify(tiny)
                );

                return true;
            } catch (fallbackError) {
                console.warn(
                    "Return local cache skipped because browser storage is full:",
                    fallbackError
                );
            }
        } else {
            console.warn(
                "Unable to save return local cache:",
                error
            );
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

    // Return method states
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

    const getToken = () => localStorage.getItem('token');

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
                if (![404,405].includes(response.status)) return { ok:false, response, data };
            } catch {}
        }
        return { ok:false, response:lastResponse, data:{} };
    };


    // Helper to normalize order status from every order field used by the shop/admin.
    const normalizeOrderStatus = (value = "") => {
        const rawStatus =
            typeof value === "object" && value !== null
                ? (
                    value.deliveryStatus ||
                    value.status ||
                    value.orderStatus ||
                    value.fulfillmentStatus ||
                    value.shippingStatus ||
                    ""
                )
                : value;

        const normalized = String(rawStatus || "")
            .trim()
            .toLowerCase()
            .replace(/[\s-]+/g, "_");

        const aliases = {
            completed: "delivered",
            complete: "delivered",
            received: "delivered",
            fulfilled: "delivered",
            order_delivered: "delivered",
            order_completed: "delivered",
            delivery_completed: "delivered",
            delivered_successfully: "delivered",
            successfully_delivered: "delivered"
        };

        if (aliases[normalized]) return aliases[normalized];

        if (
            normalized.includes("delivered") ||
            normalized.includes("completed")
        ) {
            return "delivered";
        }

        return normalized;
    };

    // One source of truth for delivered orders.
    // Different parts of the project/admin have used different status fields,
    // so return/review eligibility must check all of them.
    const isOrderDelivered = (order = {}) => {
        if (!order || typeof order !== "object") return false;

        const statusCandidates = [
            order.deliveryStatus,
            order.status,
            order.orderStatus,
            order.fulfillmentStatus,
            order.shippingStatus,
            order.trackingStatus,
            order.delivery?.status,
            order.shipping?.status,
            order.fulfillment?.status,
            order.tracking?.status
        ];

        const hasDeliveredStatus = statusCandidates.some(
            value =>
                value &&
                normalizeOrderStatus(value) === "delivered"
        );

        if (hasDeliveredStatus) return true;

        // Some saved orders only keep a delivered/completed boolean.
        if (
            order.delivered === true ||
            order.isDelivered === true ||
            order.completed === true ||
            order.isCompleted === true
        ) {
            return true;
        }

        // A delivery timestamp is also strong evidence that delivery completed.
        if (
            order.deliveredAt ||
            order.deliveryDate ||
            order.deliveredDate ||
            order.actualDeliveryDate ||
            order.completedAt
        ) {
            return true;
        }

        // Support tracking history used by order/admin services.
        const histories = [
            order.trackingHistory,
            order.statusHistory,
            order.orderHistory,
            order.deliveryHistory,
            order.timeline
        ].filter(Array.isArray);

        const historyShowsDelivered = histories.some(history =>
            history.some(entry => {
                const stage =
                    entry?.stage ||
                    entry?.status ||
                    entry?.orderStatus ||
                    entry?.deliveryStatus ||
                    entry?.title ||
                    entry?.label ||
                    "";

                return normalizeOrderStatus(stage) === "delivered";
            })
        );

        if (historyShowsDelivered) return true;

        // If tracking steps exist and Delivered is marked completed, accept it.
        if (Array.isArray(order.trackingSteps)) {
            const deliveredStep =
                order.trackingSteps.find(step =>
                    normalizeOrderStatus(
                        step?.id ||
                        step?.status ||
                        step?.label ||
                        ""
                    ) === "delivered"
                );

            if (
                deliveredStep &&
                (
                    deliveredStep.completed === true ||
                    deliveredStep.isCompleted === true ||
                    deliveredStep.active === true
                )
            ) {
                return true;
            }
        }

        return false;
    };

    // Get order tracking steps
    const getOrderTrackingSteps = (order = {}) => {
        const status = isOrderDelivered(order)
            ? "delivered"
            : normalizeOrderStatus(
                order.deliveryStatus ||
                order.status ||
                order.orderStatus ||
                order.fulfillmentStatus ||
                order.shippingStatus ||
                order.trackingStatus ||
                order.delivery?.status ||
                order.shipping?.status ||
                "pending"
            );

        const steps = [
            {
                id: "pending",
                label: "Order Placed",
                description: "Your order has been received.",
                icon: FiCheckCircle
            },
            {
                id: "processing",
                label: "Processing",
                description: "Your items are being prepared.",
                icon: FiPackage
            },
            {
                id: "shipped",
                label: "Shipped",
                description: "Your order is on the way.",
                icon: FiTruck
            },
            {
                id: "out_for_delivery",
                label: "Out for Delivery",
                description: "Your parcel is with the delivery driver.",
                icon: FiDeliveryTruck
            },
            {
                id: "delivered",
                label: "Delivered",
                description: "Your order has been delivered.",
                icon: FiCheckCircle
            }
        ];

        const aliases = {
            scheduled: "pending",
            placed: "pending",
            confirmed: "processing",
            packed: "processing",
            dispatch: "shipped",
            dispatched: "shipped",
            in_transit: "shipped",
            out_for_delivery: "out_for_delivery",
            delivered: "delivered"
        };

        const normalized = aliases[status] || status;
        const currentIndex = Math.max(
            0,
            steps.findIndex(step => step.id === normalized)
        );

        return steps.map((step, index) => ({
            ...step,
            completed: index <= currentIndex,
            active: index === currentIndex
        }));
    };

    // Check if order can be reviewed
    const canReviewOrder = (order = {}) =>
        isOrderDelivered(order);

    // Check if order can be returned
    const canReturnOrder = (order = {}) =>
        isOrderDelivered(order);

    // Check if item already has a return request
    const hasReturnRequestForItem = (orderId, productId) =>
        returnRequests.some(request =>
            String(request.orderId) === String(orderId) &&
            String(request.productId) === String(productId) &&
            !["rejected", "refunded"].includes(
                String(request.status || "").toLowerCase()
            )
        );

    // Get existing review for an item
    const getExistingReview = (productId, orderId) => {
        try {
            const storedReviews = JSON.parse(
                localStorage.getItem("product_reviews") || "[]"
            );

            return storedReviews.find(review =>
                String(review.productId) === String(productId) &&
                String(review.orderId || "") === String(orderId || "") &&
                String(review.userEmail || "").toLowerCase() ===
                    String(user?.email || "").toLowerCase()
            );
        } catch {
            return null;
        }
    };

    // Navigate to product page with review section
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

        if (["coupon","offer","promotion"].includes(type)) { setActiveTab("coupons"); navigate("/profile?tab=coupons"); return; }
        if (["order","order_status","delivery","shipping"].includes(type)) { setActiveTab("orders"); navigate("/profile?tab=orders", {state:{focusOrderId:orderId}}); return; }
        if (["return","return_status","refund","refund_status"].includes(type)) { setActiveTab("returns"); navigate("/profile?tab=returns", {state:{focusReturnId:returnId}}); return; }
        if (["security","login","account","password"].includes(type)) { setActiveTab("security"); navigate("/profile?tab=security"); return; }
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
        if (["message","support","contact"].includes(type)) {
            navigate("/");
            setTimeout(() => (document.getElementById("contact-footer") || document.querySelector("footer"))?.scrollIntoView({behavior:"smooth",block:"start"}), 300);
            return;
        }
        if (target) { navigate(target, {state:{notification}}); return; }
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
        'refund_processing': { label: 'Refund Processing', icon: FiRefreshCw, color: 'text-orange-600', bg: 'bg-orange-50', progress: 83, description: 'Refund is being processed. This may take up to 7 business days.' },
        'refunded': { label: 'Refund Completed', icon: FiCreditCard, color: 'text-green-600', bg: 'bg-green-50', progress: 100, description: 'Refund has been sent to your chosen payment method.' },
        'rejected': { label: 'Return Rejected', icon: FiX, color: 'text-red-600', bg: 'bg-red-50', progress: 0, description: 'Return request was rejected.' }
    };

    // Load favorites from localStorage
    const loadFavorites = (email) => {
        if (!email) return;
        const favoriteIds = JSON.parse(localStorage.getItem(`favorites_${email}`) || '[]');
        const allProducts = productService.getAllProducts();
        const favoriteProducts = allProducts.filter(p => favoriteIds.includes(p.id));
        setFavorites(favoriteProducts);
    };

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

    // Notification read state is local-first, so backend failures never break the UI.
    const markNotificationAsRead = async (notifId) => {
        const id=String(notifId);
        setNotifications(current => {
            const updated=current.map(n=>getNotificationId(n)===id?{...n,id,read:true,readAt:n.readAt||new Date().toISOString()}:n);
            saveNotificationsLocally(updated); return updated;
        });
        try { const token=getToken(); if(token) await fetch(`${API_URL}/notifications/${encodeURIComponent(id)}/read`,{method:'PUT',headers:{Authorization:`Bearer ${token}`}}); } catch {}
    };

    const markNotificationAsUnread = async (notifId) => {
        const id=String(notifId);
        setNotifications(current => {
            const updated=current.map(n=>getNotificationId(n)===id?{...n,id,read:false,readAt:null}:n);
            saveNotificationsLocally(updated); return updated;
        });
        try { const token=getToken(); if(token) await fetch(`${API_URL}/notifications/${encodeURIComponent(id)}/unread`,{method:'PUT',headers:{Authorization:`Bearer ${token}`}}); } catch {}
    };

    const markAllNotificationsAsRead = async () => {
        setNotifications(current => { const updated=current.map(n=>({...n,id:getNotificationId(n),read:true,readAt:n.readAt||new Date().toISOString()})); saveNotificationsLocally(updated); return updated; });
        try { const token=getToken(); if(token) await fetch(`${API_URL}/notifications/read-all`,{method:'PUT',headers:{Authorization:`Bearer ${token}`}}); } catch {}
        toast.success("All notifications marked as read");
    };

    const clearReadNotifications = () => {
        setNotifications(current=>{ const updated=current.filter(n=>!n.read); saveNotificationsLocally(updated); return updated; });
        toast.success("Read notifications cleared");
    };

    const loadNotifications = async (email) => {
        if (!email) return;
        const local=safeParse(localStorage.getItem(`notifications_${email}`),[]);
        const localList=Array.isArray(local)?local.map(n=>({...n,id:getNotificationId(n)})):[];
        setNotifications(localList);
        try {
            const token=getToken(); if(!token) return;
            const response=await fetch(`${API_URL}/notifications/user`,{headers:{Authorization:`Bearer ${token}`}});
            if(!response.ok) return;
            const data=await response.json();
            const server=data.notifications||data.data?.notifications||data.data||[];
            if(!Array.isArray(server)) return;
            const localMap=new Map(localList.map(n=>[getNotificationId(n),n]));
            const mergedMap=new Map();
            server.forEach(item=>{ const id=getNotificationId(item), l=localMap.get(id); mergedMap.set(id,{...item,id,read:l?Boolean(l.read):Boolean(item.read),readAt:l?.readAt||item.readAt||null}); });
            localList.forEach(item=>{ const id=getNotificationId(item); if(!mergedMap.has(id)) mergedMap.set(id,item); });
            const merged=[...mergedMap.values()].sort((a,b)=>new Date(b.date||b.createdAt||0)-new Date(a.date||a.createdAt||0));
            setNotifications(merged); saveNotificationsLocally(merged,email);
        } catch {}
    };

    // Load addresses - with proper error handling
    const loadAddresses = async (email) => {
        if (!email) {
            setAddresses([]);
            return;
        }
        
        // ALWAYS load from localStorage first (fastest and always available)
        try {
            const savedAddresses = JSON.parse(localStorage.getItem(`addresses_${email}`) || '[]');
            setAddresses(savedAddresses);
            console.log('📦 Addresses loaded from localStorage:', savedAddresses.length);
        } catch (error) {
            console.warn('Error loading addresses from localStorage:', error);
            setAddresses([]);
        }
        
        // Then try backend (optional, only if available)
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
                        console.log('✅ Addresses synced from backend:', data.addresses.length);
                        return;
                    }
                }
            }
        } catch (error) {
            // Silently fail - localStorage data is already set
            console.log('ℹ️ Addresses API not available, using local data only');
        }
    };

    // Load user data (orders and returns)
    // Load user data (orders and returns)
    const loadUserData = async (email) => {
        if (!email) return;

        try {
            const userOrders =
                await orderService.getUserOrders(
                    email
                );

            const normalizedOrders =
                (Array.isArray(userOrders)
                    ? userOrders
                    : []
                ).map(order => ({
                    ...order,
                    id:
                        order.id ||
                        order._id ||
                        order.orderId,
                    status:
                        isOrderDelivered(order)
                            ? "delivered"
                            : (
                                order.status ||
                                order.orderStatus ||
                                order.deliveryStatus ||
                                order.fulfillmentStatus ||
                                order.shippingStatus ||
                                order.trackingStatus ||
                                "pending"
                            ),
                    orderStatus:
                        isOrderDelivered(order)
                            ? "delivered"
                            : (
                                order.orderStatus ||
                                order.status ||
                                order.deliveryStatus ||
                                order.fulfillmentStatus ||
                                order.shippingStatus ||
                                order.trackingStatus ||
                                "pending"
                            ),
                    deliveryStatus:
                        isOrderDelivered(order)
                            ? "delivered"
                            : (
                                order.deliveryStatus ||
                                order.status ||
                                order.orderStatus ||
                                order.fulfillmentStatus ||
                                order.shippingStatus ||
                                order.trackingStatus ||
                                "pending"
                            )
                }));

            const hiddenIds =
                JSON.parse(
                    localStorage.getItem(
                        `hidden_orders_${email}`
                    ) || "[]"
                );

            const hiddenSet =
                new Set(
                    Array.isArray(hiddenIds)
                        ? hiddenIds.map(String)
                        : []
                );

            setOrders(
                normalizedOrders.filter(
                    order =>
                        !hiddenSet.has(
                            String(
                                order.id ||
                                order._id ||
                                order.orderId
                            )
                        )
                )
            );

            let serviceReturns = [];

            try {
                serviceReturns =
                    await orderService.getUserReturnRequests(
                        email
                    );
            } catch (error) {
                console.warn(
                    "Unable to load returns from orderService:",
                    error
                );
            }

            let localReturns = [];

            try {
                const allLocal =
                    JSON.parse(
                        localStorage.getItem(
                            "return_requests"
                        ) || "[]"
                    );

                localReturns =
                    (
                        Array.isArray(allLocal)
                            ? allLocal
                            : []
                    ).filter(
                        request =>
                            String(
                                request.userEmail ||
                                ""
                            ).toLowerCase() ===
                            String(
                                email
                            ).toLowerCase()
                    );
            } catch {
                localReturns = [];
            }

            const indexedReturns =
                (
                    await getAllReturnRecords()
                ).filter(
                    request =>
                        String(
                            request.userEmail ||
                            ""
                        ).toLowerCase() ===
                        String(
                            email
                        ).toLowerCase()
                );

            const returnMap =
                new Map();

            [
                ...(Array.isArray(serviceReturns)
                    ? serviceReturns
                    : []),
                ...localReturns,
                ...indexedReturns
            ].forEach(request => {
                const key =
                    String(
                        request.id ||
                        request._id ||
                        `${request.orderId}-${request.productId}`
                    );

                returnMap.set(
                    key,
                    {
                        ...(returnMap.get(key) || {}),
                        ...request
                    }
                );
            });

            const mergedReturns =
                [...returnMap.values()].sort(
                    (a, b) =>
                        new Date(
                            b.updatedAt ||
                            b.date ||
                            b.createdAt ||
                            0
                        ) -
                        new Date(
                            a.updatedAt ||
                            a.date ||
                            a.createdAt ||
                            0
                        )
                );

            setReturnRequests(
                mergedReturns
            );

            await putAllReturnRecords(
                mergedReturns
            );

            saveCompactReturnsToLocalStorage(
                mergedReturns
            );
        } catch (error) {
            console.error(
                "Error loading user data:",
                error
            );

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

            const savedHiddenOrders =
                JSON.parse(
                    localStorage.getItem(
                        `hidden_orders_${email}`
                    ) || "[]"
                );

            setHiddenOrderIds(
                Array.isArray(
                    savedHiddenOrders
                )
                    ? savedHiddenOrders.map(
                        String
                    )
                    : []
            );

            setSecurityPrefs(prev => ({ ...prev, ...safeParse(localStorage.getItem(`security_prefs_${email}`), {}) }));
            setAccountPrefs(prev => ({ ...prev, ...safeParse(localStorage.getItem(`account_prefs_${email}`), {}) }));
            
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
                loadUserCoupons(email);
                loadNotifications(email);
                toast.success(`New coupon available: ${event.detail.couponCode}`);
            }
        };
        
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

        // Handle order status updates from admin
        const handleOrderStatusUpdated = (event) => {
            const orderId = event.detail?.orderId || event.detail?.id;
            const newStatus = event.detail?.status || event.detail?.orderStatus;
            
            if (orderId && newStatus) {
                setOrders(prev => prev.map(order => {
                    if (String(order.id) === String(orderId) || String(order.orderId) === String(orderId)) {
                        const normalizedNewStatus =
                            normalizeOrderStatus(
                                newStatus
                            );

                        const updatedOrder = {
                            ...order,
                            status:
                                normalizedNewStatus,
                            orderStatus:
                                normalizedNewStatus,
                            deliveryStatus:
                                normalizedNewStatus,
                            trackingStatus:
                                normalizedNewStatus,
                            delivered:
                                normalizedNewStatus ===
                                "delivered"
                                    ? true
                                    : order.delivered,
                            deliveredAt:
                                normalizedNewStatus ===
                                "delivered"
                                    ? (
                                        order.deliveredAt ||
                                        new Date().toISOString()
                                    )
                                    : order.deliveredAt,
                            updatedAt:
                                new Date().toISOString()
                        };
                        return updatedOrder;
                    }
                    return order;
                }));
                
                loadNotifications(email);
                
                const statusMessages = {
                    'pending': 'Your order is pending review.',
                    'processing': 'Your order is being processed!',
                    'shipped': 'Your order has been shipped! 🚚',
                    'delivered': 'Your order has been delivered! 📦',
                    'cancelled': 'Your order has been cancelled.'
                };
                
                const message = statusMessages[newStatus] || `Order status updated to ${newStatus}`;
                toast.info(message);
                
                if (newStatus === 'delivered') {
                    setTimeout(() => {
                        toast.info('You can now review your items! Click "Write a Review" in the Orders section.', {
                            duration: 5000,
                            action: {
                                label: 'Go to Orders',
                                onClick: () => {
                                    setActiveTab('orders');
                                    navigate("/profile?tab=orders");
                                }
                            }
                        });
                    }, 1000);
                }
            }
        };

        const handleOrdersUpdated = () => {
            loadUserData(email);
            loadNotifications(email);
        };

        const handleReturnsUpdated = (event) => {
            const updatedReturn =
                event?.detail?.returnRequest;

            if (
                updatedReturn &&
                String(
                    updatedReturn.userEmail ||
                    ""
                ).toLowerCase() ===
                String(email).toLowerCase()
            ) {
                setReturnRequests(prev => {
                    const filtered =
                        prev.filter(
                            request =>
                                String(
                                    request.id ||
                                    request._id
                                ) !==
                                String(
                                    updatedReturn.id ||
                                    updatedReturn._id
                                )
                        );

                    return [
                        updatedReturn,
                        ...filtered
                    ];
                });
            }

            loadUserData(email);
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
                loadUserCoupons(email);
            }
            if (
                e.key === 'orders' ||
                e.key === 'admin_orders' ||
                e.key === `orders_${email}`
            ) {
                loadUserData(email);
                loadNotifications(email);
            }

            if (
                e.key === 'return_requests' ||
                e.key === `return_requests_${email}`
            ) {
                loadUserData(email);
            }
        };
        

        const handleOrderRefunded = (event) => {
            const orderId =
                event?.detail?.orderId;

            if (!orderId) return;

            setOrders(current =>
                current.map(order => {
                    const id =
                        getOrderIdentifier(
                            order
                        );

                    if (
                        String(id) !==
                        String(orderId)
                    ) {
                        return order;
                    }

                    return {
                        ...order,
                        status:
                            "refunded",
                        orderStatus:
                            "refunded",
                        refundStatus:
                            "refunded",
                        refunded:
                            true,
                        refundedAt:
                            new Date().toISOString()
                    };
                })
            );
        };

        const handleCustomerNotificationUpdated = (event) => {
            if (
                event?.detail?.email &&
                String(
                    event.detail.email
                ).toLowerCase() !==
                String(email).toLowerCase()
            ) {
                return;
            }

            const notification =
                event?.detail?.notification;

            if (notification) {
                setNotifications(current => {
                    const updated = [
                        notification,
                        ...current.filter(
                            item =>
                                String(
                                    getNotificationId(
                                        item
                                    )
                                ) !==
                                String(
                                    getNotificationId(
                                        notification
                                    )
                                )
                        )
                    ];

                    saveNotificationsLocally(
                        updated,
                        email
                    );

                    return updated;
                });

                toast.info(
                    notification.title ||
                    "Return status updated"
                );
            } else {
                loadNotifications(email);
            }
        };

        window.addEventListener('favoritesUpdated', handleFavoritesUpdate);
        window.addEventListener('productsUpdated', handleProductUpdate);
        window.addEventListener('couponReceived', handleCouponReceived);
        window.addEventListener('couponDeleted', handleCouponDeleted);
        window.addEventListener('couponsUpdated', handleCouponsUpdated);
        window.addEventListener('ordersUpdated', handleOrdersUpdated);
        window.addEventListener('returnsUpdated', handleReturnsUpdated);
        window.addEventListener('orderRefunded', handleOrderRefunded);
        window.addEventListener('customerNotificationUpdated', handleCustomerNotificationUpdated);
        window.addEventListener('orderStatusUpdated', handleOrderStatusUpdated);
        window.addEventListener('orderStatusChanged', handleOrderStatusUpdated);
        window.addEventListener('storage', handleStorageChange);
        
        return () => {
            window.removeEventListener('favoritesUpdated', handleFavoritesUpdate);
            window.removeEventListener('productsUpdated', handleProductUpdate);
            window.removeEventListener('couponReceived', handleCouponReceived);
            window.removeEventListener('couponDeleted', handleCouponDeleted);
            window.removeEventListener('couponsUpdated', handleCouponsUpdated);
            window.removeEventListener('ordersUpdated', handleOrdersUpdated);
            window.removeEventListener('returnsUpdated', handleReturnsUpdated);
            window.removeEventListener('orderRefunded', handleOrderRefunded);
            window.removeEventListener('customerNotificationUpdated', handleCustomerNotificationUpdated);
            window.removeEventListener('orderStatusUpdated', handleOrderStatusUpdated);
            window.removeEventListener('orderStatusChanged', handleOrderStatusUpdated);
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
            if (activeTab === 'addresses') {
                loadAddresses(email);
            }
        }
    }, [activeTab, user]);

    // Keep the edit form in sync
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
                    window.dispatchEvent(
                        new CustomEvent("profileUpdated", {
                            detail: savedUser
                        })
                    );
                    toast.success("Your profile has been updated.");
                    setIsEditingProfile(false);
                    return;
                }
            }

            localStorage.setItem("user", JSON.stringify(normalizedUser));
            setUser(normalizedUser);
            setEditedUser(normalizedUser);
            window.dispatchEvent(
                new CustomEvent("profileUpdated", {
                    detail: normalizedUser
                })
            );
            toast.success("Your profile has been updated.");
            setIsEditingProfile(false);
        } catch (error) {
            console.error("Profile update failed:", error);
            localStorage.setItem("user", JSON.stringify(normalizedUser));
            setUser(normalizedUser);
            setEditedUser(normalizedUser);
            window.dispatchEvent(
                new CustomEvent("profileUpdated", {
                    detail: normalizedUser
                })
            );
            toast.success("Profile saved locally.");
            setIsEditingProfile(false);
        } finally {
            setIsSavingProfile(false);
        }
    };

    const persistSecurityPrefs = (next) => {
        setSecurityPrefs(next);
        if (user?.email) localStorage.setItem(`security_prefs_${user.email}`, JSON.stringify(next));
    };

    const persistAccountPrefs = (next) => {
        setAccountPrefs(next);
        if (user?.email) localStorage.setItem(`account_prefs_${user.email}`, JSON.stringify(next));
        window.dispatchEvent(new CustomEvent("customerPreferencesUpdated",{detail:{email:user?.email,preferences:next}}));
    };

    const handleChangePassword = async (e) => {
        e?.preventDefault();
        const {currentPassword,newPassword,confirmPassword}=passwordForm;
        if(!currentPassword||!newPassword||!confirmPassword){toast.error("Complete all password fields.");return;}
        if(newPassword.length<8||!/[A-Z]/.test(newPassword)||!/[a-z]/.test(newPassword)||!/[0-9]/.test(newPassword)){toast.error("Use at least 8 characters with uppercase, lowercase and a number.");return;}
        if(newPassword!==confirmPassword){toast.error("New passwords do not match.");return;}
        const token=getToken(); if(!token){toast.error("Please sign in again.");return;}
        setChangingPassword(true);
        try{
            const result=await tryApiEndpoints(["/auth/change-password","/users/change-password","/users/password"],{method:"PUT",headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`},body:JSON.stringify({currentPassword,oldPassword:currentPassword,newPassword,password:newPassword})});
            if(!result.ok) throw new Error(result.data?.message||result.data?.error||"Password change API is not available.");
            localStorage.setItem(`password_changed_at_${user.email}`,new Date().toISOString());
            setPasswordForm({currentPassword:"",newPassword:"",confirmPassword:""});
            toast.success("Password changed successfully.");
        }catch(err){toast.error(err.message||"Unable to change password.");}finally{setChangingPassword(false);}
    };

    const toggleTwoFactor = async () => {
        const token=getToken(); if(!token){toast.error("Please sign in again.");return;}
        setSecurityActionLoading(true);
        try{
            const enabled=!securityPrefs.twoFactorEnabled;
            const result=await tryApiEndpoints(["/auth/2fa/toggle","/users/2fa"],{method:"PUT",headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`},body:JSON.stringify({enabled})});
            if(!result.ok) throw new Error(result.data?.message||"2FA API is not configured yet.");
            persistSecurityPrefs({...securityPrefs,twoFactorEnabled:enabled}); toast.success(enabled?"2FA enabled.":"2FA disabled.");
        }catch(err){toast.error(err.message);}finally{setSecurityActionLoading(false);}
    };

    const logoutOtherSessions = async () => {
        const token=getToken(); if(!token){toast.error("Please sign in again.");return;}
        setSecurityActionLoading(true);
        try{ const result=await tryApiEndpoints(["/auth/logout-all","/auth/sessions/revoke-all"],{method:"POST",headers:{Authorization:`Bearer ${token}`}}); if(!result.ok) throw new Error(result.data?.message||"Session API is not available."); toast.success("Other sessions signed out."); }
        catch(err){toast.error(err.message);}finally{setSecurityActionLoading(false);}
    };

    const downloadAccountData = () => {
        const blob=new Blob([JSON.stringify({exportedAt:new Date().toISOString(),profile:user,orders,addresses,returns:returnRequests,preferences:accountPrefs},null,2)],{type:"application/json"});
        const url=URL.createObjectURL(blob), a=document.createElement("a"); a.href=url; a.download=`zamed-account-data-${new Date().toISOString().slice(0,10)}.json`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url); toast.success("Account data downloaded.");
    };

    const handleDeleteAccount = async () => {
        if(window.prompt('Type DELETE to permanently delete your account.')!=="DELETE") return;
        const token=getToken(); if(!token){toast.error("Please sign in again.");return;}
        setDeletingAccount(true);
        try{ const result=await tryApiEndpoints(["/users/account","/auth/account","/users/me"],{method:"DELETE",headers:{Authorization:`Bearer ${token}`}}); if(!result.ok) throw new Error(result.data?.message||result.data?.error||"Account deletion API is not available."); const email=user?.email; ["user","token","authToken"].forEach(k=>localStorage.removeItem(k)); if(email)[`notifications_${email}`,`favorites_${email}`,`user_coupons_${email}`,`addresses_${email}`,`security_prefs_${email}`,`account_prefs_${email}`].forEach(k=>localStorage.removeItem(k)); toast.success("Account deleted."); navigate("/register",{replace:true}); }
        catch(err){toast.error(err.message||"Unable to delete account.");}finally{setDeletingAccount(false);}
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
        
        // Try backend first
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

    const getHiddenOrdersKey = (email = user?.email) =>
        email
            ? `hidden_orders_${email}`
            : "";

    const persistHiddenOrders = (
        ids,
        email = user?.email
    ) => {
        const unique =
            [...new Set(
                ids.map(String)
            )];

        setHiddenOrderIds(unique);

        if (email) {
            localStorage.setItem(
                getHiddenOrdersKey(email),
                JSON.stringify(unique)
            );
        }
    };

    const deleteOrderFromHistory = async (order) => {
        const orderId =
            getOrderIdentifier(order);

        if (!orderId) {
            toast.error(
                "Unable to identify this order."
            );
            return;
        }

        if (
            !window.confirm(
                `Remove order #${orderId} from your order history?`
            )
        ) {
            return;
        }

        let serviceDeleted = false;

        try {
            if (
                typeof orderService.deleteOrder ===
                "function"
            ) {
                await orderService.deleteOrder(
                    orderId
                );

                serviceDeleted = true;
            }
        } catch (error) {
            console.warn(
                "Permanent order deletion is not available; hiding from customer history instead:",
                error
            );
        }

        persistHiddenOrders([
            ...hiddenOrderIds,
            String(orderId)
        ]);

        setOrders(current =>
            current.filter(
                item =>
                    String(
                        getOrderIdentifier(
                            item
                        )
                    ) !==
                    String(orderId)
            )
        );

        toast.success(
            serviceDeleted
                ? "Order deleted."
                : "Order removed from your order history."
        );
    };

    const clearOrderHistory = async () => {
        const visibleIds =
            orders
                .map(order =>
                    getOrderIdentifier(order)
                )
                .filter(Boolean)
                .map(String)
                .filter(
                    id =>
                        !hiddenOrderIds.includes(
                            id
                        )
                );

        if (
            visibleIds.length === 0
        ) {
            toast.info(
                "Your order history is already clear."
            );
            return;
        }

        if (
            !window.confirm(
                "Clear all orders from your order history? This will remove them from your Profile view."
            )
        ) {
            return;
        }

        persistHiddenOrders([
            ...hiddenOrderIds,
            ...visibleIds
        ]);

        setOrders([]);

        toast.success(
            "Order history cleared."
        );
    };

    const getReturnForOrder = (order) => {
        const orderId =
            String(
                getOrderIdentifier(
                    order
                )
            );

        return returnRequests
            .filter(
                request =>
                    String(
                        request.orderId
                    ) ===
                    orderId
            )
            .sort(
                (a, b) =>
                    new Date(
                        b.updatedAt ||
                        b.refundCompletedAt ||
                        b.date ||
                        0
                    ) -
                    new Date(
                        a.updatedAt ||
                        a.refundCompletedAt ||
                        a.date ||
                        0
                    )
            )[0] || null;
    };

    const getEffectiveOrderStatus = (order) => {
        const returnRequest =
            getReturnForOrder(order);

        if (
            returnRequest?.status ===
            "refunded"
        ) {
            return "refunded";
        }

        if (
            returnRequest?.status ===
            "refund_processing"
        ) {
            return "refund_processing";
        }

        if (
            [
                "picked_up",
                "verified",
                "pickup_scheduled",
                "pending_pickup"
            ].includes(
                returnRequest?.status
            )
        ) {
            return "return_in_progress";
        }

        return (
            order.refundStatus ||
            order.status ||
            order.orderStatus ||
            order.deliveryStatus ||
            "pending"
        );
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

    const getOrderIdentifier = (order = {}) =>
        order.id || order._id || order.orderId || "";

    const getItemIdentifier = (item = {}) =>
        item.id || item._id || item.productId || "";

    const getOrderItems = (order = {}) =>
        Array.isArray(order.itemsList)
            ? order.itemsList
            : Array.isArray(order.items)
                ? order.items
                : [];

    const getOrderPaymentMethod = (order = {}) =>
        String(
            order.paymentMethod ||
            order.payment?.method ||
            order.paymentType ||
            ""
        );

    const isCashOrder = (order = {}) => {
        const method = getOrderPaymentMethod(order).toLowerCase();

        return (
            method.includes("cash") ||
            method.includes("cod")
        );
    };

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
            toast.error(
                "Unable to identify this order item. Please refresh and try again."
            );
            return;
        }

        if (hasReturnRequestForItem(orderId, productId)) {
            toast.info(
                "A return request already exists for this item."
            );
            setActiveTab("returns");
            navigate("/profile?tab=returns");
            return;
        }

        if (!canReturnOrder(order)) {
            console.warn(
                "Return blocked because delivered state was not detected:",
                {
                    id:
                        order.id ||
                        order._id ||
                        order.orderId,
                    status:
                        order.status,
                    orderStatus:
                        order.orderStatus,
                    deliveryStatus:
                        order.deliveryStatus,
                    fulfillmentStatus:
                        order.fulfillmentStatus,
                    shippingStatus:
                        order.shippingStatus,
                    trackingStatus:
                        order.trackingStatus,
                    delivered:
                        order.delivered,
                    deliveredAt:
                        order.deliveredAt
                }
            );

            toast.error(
                "This order is not marked as delivered in the saved order data yet. Refresh your orders and try again."
            );
            return;
        }

        const cashOrder = isCashOrder(order);

        setSelectedItemForReturn({
            orderId,
            productId,
            productName: item.name || item.productName || "Product",
            productImage: item.image || "",
            order,
            paymentMethod:
                getOrderPaymentMethod(order) ||
                (cashOrder
                    ? "Cash on Delivery"
                    : "Online Payment"),
            isCashOrder: cashOrder
        });

        setReturnReason("");
        setReturnComment("");

        // COD customers can choose bank transfer or shop collection.
        // Online payments use the original payment method automatically.
        setReturnMethod(
            cashOrder
                ? "bank_transfer"
                : "original_payment"
        );

        setBankName("");
        setAccountNumber("");
        setAccountHolderName("");
        setBankBranch("");
        setShopPickupDate("");
        setShopPickupTime("");
    };

    const persistReturnForAdmin = async (
        returnRequest
    ) => {
        const indexedSaved =
            await putReturnRecord(
                returnRequest
            );

        let current = [];

        try {
            const existing =
                JSON.parse(
                    localStorage.getItem(
                        "return_requests"
                    ) || "[]"
                );

            current =
                Array.isArray(existing)
                    ? existing
                    : [];
        } catch {
            current = [];
        }

        const filtered =
            current.filter(
                request =>
                    String(
                        request.id ||
                        request._id
                    ) !==
                    String(
                        returnRequest.id
                    )
            );

        const updated = [
            returnRequest,
            ...filtered
        ];

        const localSaved =
            saveCompactReturnsToLocalStorage(
                updated
            );

        return (
            indexedSaved ||
            localSaved
        );
    };

    const submitReturnRequest = async () => {
        if (!selectedItemForReturn) {
            toast.error(
                "Please select a product to return."
            );
            return;
        }

        if (!returnReason) {
            toast.error(
                "Please select a reason for return."
            );
            return;
        }

        if (
            returnMethod === "bank_transfer" &&
            (
                !bankName.trim() ||
                !accountNumber.trim() ||
                !accountHolderName.trim()
            )
        ) {
            toast.error(
                "Please fill in the account holder, bank name and account number."
            );
            return;
        }

        if (
            returnMethod === "shop_pickup" &&
            (
                !shopPickupDate ||
                !shopPickupTime
            )
        ) {
            toast.error(
                "Please choose your shop collection date and time."
            );
            return;
        }

        setIsSubmittingReturn(true);

        try {
            const order = orders.find(currentOrder => {
                const currentId =
                    getOrderIdentifier(currentOrder);

                return (
                    String(currentId) ===
                    String(
                        selectedItemForReturn.orderId
                    )
                );
            });

            if (!order) {
                throw new Error(
                    "The original order could not be found."
                );
            }

            const product = getOrderItems(order).find(
                currentItem =>
                    String(
                        getItemIdentifier(
                            currentItem
                        )
                    ) ===
                    String(
                        selectedItemForReturn.productId
                    )
            );

            if (!product) {
                throw new Error(
                    "The selected product could not be found in this order."
                );
            }

            if (!canReturnOrder(order)) {
                throw new Error(
                    "This order has not been delivered yet."
                );
            }

            if (
                hasReturnRequestForItem(
                    selectedItemForReturn.orderId,
                    selectedItemForReturn.productId
                )
            ) {
                throw new Error(
                    "A return request already exists for this product."
                );
            }

            const siteSettings = JSON.parse(
                localStorage.getItem(
                    "site_settings"
                ) || "{}"
            );

            const taxRate =
                Number.parseFloat(
                    product.taxRate ??
                    siteSettings.taxRate
                ) || 0;

            const productPrice =
                Number.parseFloat(
                    product.price
                ) || 0;

            const productQuantity =
                Number.parseInt(
                    product.quantity,
                    10
                ) || 1;

            const subtotal =
                productPrice *
                productQuantity;

            const taxAmount =
                subtotal *
                (taxRate / 100);

            // Refund the returned product + its recorded tax.
            // Shipping is not added here unless you later explicitly support
            // refundable per-item shipping.
            const refundAmount =
                subtotal +
                taxAmount;

            let refundMethodDetails;

            if (
                returnMethod ===
                "bank_transfer"
            ) {
                refundMethodDetails = {
                    method: "Bank Transfer",
                    type: "bank_transfer",
                    bankName: bankName.trim(),
                    accountNumber:
                        accountNumber.trim(),
                    accountHolderName:
                        accountHolderName.trim(),
                    bankBranch:
                        bankBranch.trim() ||
                        "N/A",
                    processingTime:
                        "Up to 7 days"
                };
            } else if (
                returnMethod ===
                "shop_pickup"
            ) {
                refundMethodDetails = {
                    method:
                        "Collect Refund From Shop",
                    type:
                        "shop_pickup",
                    pickupDate:
                        shopPickupDate,
                    pickupTime:
                        shopPickupTime,
                    processingTime:
                        "After return approval"
                };
            } else {
                refundMethodDetails = {
                    method:
                        "Original Payment Method",
                    type:
                        "original_payment",
                    originalPaymentMethod:
                        getOrderPaymentMethod(
                            order
                        ) ||
                        "Online Payment",
                    processingTime:
                        "Up to 7 days"
                };
            }

            const now =
                new Date().toISOString();

            const expectedRefundDate =
                new Date();

            expectedRefundDate.setDate(
                expectedRefundDate.getDate() +
                7
            );

            const returnRequest = {
                id: `RET-${Date.now()}`,
                orderId:
                    selectedItemForReturn.orderId,
                productId:
                    selectedItemForReturn.productId,
                productName:
                    selectedItemForReturn.productName,
                productImage:
                    product.image ||
                    selectedItemForReturn.productImage ||
                    "",
                productPrice,
                productQuantity,
                subtotal,
                taxAmount,
                taxRate,
                refundAmount,
                reason:
                    returnReason,
                comment:
                    returnComment.trim(),
                status:
                    "pending_pickup",
                date:
                    now,
                createdAt:
                    now,
                updatedAt:
                    now,
                userEmail:
                    user.email,
                userName:
                    [
                        user.firstName,
                        user.lastName
                    ]
                        .filter(Boolean)
                        .join(" ") ||
                    user.name ||
                    "Customer",
                customerPhone:
                    user.phone ||
                    user.phoneNumber ||
                    "",
                pickupAddress:
                    user.address ||
                    order.shippingAddress ||
                    "",
                originalPaymentMethod:
                    getOrderPaymentMethod(order) ||
                    "N/A",
                refundMethod:
                    refundMethodDetails,
                refundProcessingDays:
                    7,
                refundExpectedBy:
                    expectedRefundDate.toISOString(),
                trackingHistory: [
                    {
                        stage:
                            "pending_pickup",
                        timestamp:
                            now,
                        message:
                            "Return request submitted and waiting for admin review."
                    }
                ]
            };

            let serviceSaved = false;

            try {
                serviceSaved =
                    Boolean(
                        await orderService.saveReturnRequest(
                            returnRequest
                        )
                    );
            } catch (serviceError) {
                console.warn(
                    "orderService return save failed; using shared local fallback:",
                    serviceError
                );
            }

            const localSaved =
                await persistReturnForAdmin(
                    returnRequest
                );

            if (
                !serviceSaved &&
                !localSaved
            ) {
                throw new Error(
                    "The return request could not be saved."
                );
            }

            setReturnRequests(prev => {
                const withoutDuplicate =
                    prev.filter(
                        request =>
                            String(
                                request.id ||
                                request._id
                            ) !==
                            String(
                                returnRequest.id
                            )
                    );

                return [
                    returnRequest,
                    ...withoutDuplicate
                ];
            });

            window.dispatchEvent(
                new CustomEvent(
                    "returnsUpdated",
                    {
                        detail: {
                            email:
                                user.email,
                            returnRequest
                        }
                    }
                )
            );

            window.dispatchEvent(
                new Event("storage")
            );

            toast.success(
                `Return request submitted successfully. Refund: ${currencySymbol}${refundAmount.toFixed(
                    2
                )}. Processing may take up to 7 days after approval.`
            );

            resetReturnForm();
            setActiveTab("returns");

            navigate(
                "/profile?tab=returns"
            );
        } catch (error) {
            console.error(
                "Error submitting return:",
                error
            );

            toast.error(
                error?.message ||
                "Failed to submit return request. Please try again."
            );
        } finally {
            setIsSubmittingReturn(false);
        }
    };

    const getOrderStatusBadge = (status) => {
        const normalized =
            String(status || "")
                .toLowerCase()
                .replace(/\s+/g, "_");

        const badges = {
            pending: "bg-yellow-100 text-yellow-800",
            processing: "bg-blue-100 text-blue-800",
            shipped: "bg-purple-100 text-purple-800",
            delivered: "bg-green-100 text-green-800",
            cancelled: "bg-red-100 text-red-800",
            return_in_progress:
                "bg-orange-100 text-orange-800",
            refund_processing:
                "bg-amber-100 text-amber-800",
            refunded:
                "bg-emerald-100 text-emerald-800"
        };

        return (
            badges[normalized] ||
            "bg-gray-100 text-gray-800"
        );
    };

    const getOrderStatusLabel = (status) => {
        const normalized =
            String(status || "")
                .toLowerCase()
                .replace(/\s+/g, "_");

        const labels = {
            pending:
                "Pending",
            processing:
                "Processing",
            shipped:
                "Shipped",
            delivered:
                "Delivered",
            cancelled:
                "Cancelled",
            return_in_progress:
                "Return In Progress",
            refund_processing:
                "Refund Processing",
            refunded:
                "Refunded"
        };

        return (
            labels[normalized] ||
            String(status || "Pending")
        );
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

    const stats = {
        totalSpent: orders.reduce((sum, o) => sum + (o.total || 0), 0),
        totalOrders: orders.length,
        deliveredOrders: orders.filter(o => (o.status || o.orderStatus) === 'delivered').length,
        pendingReturns: returnRequests.filter(r => r.status !== 'refunded' && r.status !== 'rejected').length,
        memberSince: user?.dateJoined || new Date().toLocaleDateString(),
        savedItems: favorites.length
    };

    // Sidebar navigation with responsive design
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

    // Site menu options
    const siteMenuItems = [
        { label: "Home", path: "/", icon: FiHome },
        { label: "Shop", path: "/collections/all", icon: FiShoppingBag },
        { label: "Men", path: "/collections/men", icon: FiUser },
        { label: "Women", path: "/collections/women", icon: FiUser },
        { label: "Kids", path: "/collections/kids", icon: FiUser },
        { label: "About", path: "/about", icon: FiInfo },
        { label: "Contact", path: "/contact", icon: FiMail }
    ];

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50" style={{ fontFamily: "'Times New Roman', Times, serif" }}>
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600" style={{ fontFamily: "'Times New Roman', Times, serif" }}>Loading your profile...</p>
                </div>
            </div>
        );
    }

    if (!user) return null;

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
        <div className={`min-h-screen ${darkMode ? 'dark bg-gray-900 text-white' : 'bg-[#fbfaf8] text-gray-950'}`} style={{ fontFamily: "'Times New Roman', Times, serif" }}>
            <div className="mx-auto max-w-[1440px] px-4 py-8 sm:px-8">
                <div className="flex flex-col gap-8 lg:flex-row">
                    {/* Desktop Sidebar */}
                    <aside className="hidden w-72 shrink-0 lg:block">
                        <div className="sticky top-36 overflow-hidden rounded-md border border-[#e8e1d6] bg-white shadow-[0_8px_30px_rgba(28,24,18,0.05)] dark:border-gray-700 dark:bg-gray-800">
                            <div className="border-b border-[#ece5db] px-6 py-5 text-sm font-semibold tracking-wide text-[#a86f25]" style={{ fontFamily: "'Times New Roman', Times, serif" }}>MY ACCOUNT</div>
                            <nav className="p-3">
                                {sidebarNav.map((item) => {
                                    const Icon = item.icon;
                                    return (
                                        <button
                                            key={item.id}
                                            onClick={() => setActiveTab(item.id)}
                                            className={`mb-1 flex w-full items-center justify-between rounded-md px-4 py-3 text-left transition-all ${activeTab === item.id ? 'bg-[#f5ecdd] text-[#a86f25]' : 'text-gray-700 hover:bg-[#faf7f2] dark:text-gray-200 dark:hover:bg-gray-700'}`}
                                            style={{ fontFamily: "'Times New Roman', Times, serif" }}
                                        >
                                            <span className="flex items-center gap-3">
                                                <Icon size={19} className={activeTab === item.id ? 'text-[#b98237]' : 'text-gray-500'} />
                                                <span className="text-sm font-medium" style={{ fontFamily: "'Times New Roman', Times, serif" }}>{item.label}</span>
                                            </span>
                                            {item.badge > 0 && <span className="rounded-full bg-[#efe1ca] px-2 py-0.5 text-[11px] font-semibold text-[#9a641f]" style={{ fontFamily: "'Times New Roman', Times, serif" }}>{item.badge}</span>}
                                        </button>
                                    );
                                })}
                                
                                {/* Site Menu Section */}
                                <div className="mt-4 pt-4 border-t border-[#ece5db]">
                                    <p className="px-4 py-2 text-xs font-semibold tracking-wide text-[#a86f25]">SITE MENU</p>
                                    {siteMenuItems.map((item) => {
                                        const Icon = item.icon;
                                        return (
                                            <Link
                                                key={item.path}
                                                to={item.path}
                                                className="flex items-center gap-3 rounded-md px-4 py-3 text-left text-sm font-medium text-gray-700 hover:bg-[#faf7f2] dark:text-gray-200 dark:hover:bg-gray-700 transition-all"
                                                style={{ fontFamily: "'Times New Roman', Times, serif" }}
                                            >
                                                <Icon size={19} className="text-gray-500" />
                                                <span>{item.label}</span>
                                            </Link>
                                        );
                                    })}
                                </div>
                                
                                <div className="my-3 border-t border-[#ece5db]" />
                                <button onClick={handleLogout} className="flex w-full items-center gap-3 rounded-md px-4 py-3 text-sm font-medium text-gray-700 hover:bg-red-50 hover:text-red-600 dark:text-gray-200" style={{ fontFamily: "'Times New Roman', Times, serif" }}>
                                    <FiLogOut size={19} /> Logout
                                </button>
                            </nav>
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
                                    <h2 className="text-xl font-bold" style={{ fontFamily: "'Times New Roman', Times, serif" }}>Menu</h2>
                                    <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                                        <FiX size={24} />
                                    </button>
                                </div>
                                <nav className="p-4">
                                    <div className="mb-4">
                                        <p className="text-xs font-semibold tracking-wide text-[#a86f25] mb-2">MY ACCOUNT</p>
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
                                                    style={{ fontFamily: "'Times New Roman', Times, serif" }}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <Icon size={20} />
                                                        <span className="font-medium" style={{ fontFamily: "'Times New Roman', Times, serif" }}>{item.label}</span>
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
                                    
                                    <div className="border-t dark:border-gray-700 pt-4">
                                        <p className="text-xs font-semibold tracking-wide text-[#a86f25] mb-2">SITE MENU</p>
                                        {siteMenuItems.map((item) => {
                                            const Icon = item.icon;
                                            return (
                                                <Link
                                                    key={item.path}
                                                    to={item.path}
                                                    onClick={() => setIsMobileMenuOpen(false)}
                                                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
                                                    style={{ fontFamily: "'Times New Roman', Times, serif" }}
                                                >
                                                    <Icon size={20} className="text-gray-500" />
                                                    <span>{item.label}</span>
                                                </Link>
                                            );
                                        })}
                                    </div>
                                    
                                    <div className="border-t dark:border-gray-700 my-4 pt-4">
                                        <button
                                            onClick={handleLogout}
                                            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-600 mt-2"
                                            style={{ fontFamily: "'Times New Roman', Times, serif" }}
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
                    <div className="flex-1 min-w-0">
                        {/* Overview Tab */}
                        {activeTab === "overview" && (
                            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                                    <div>
                                        <h1 className="font-serif text-2xl sm:text-3xl lg:text-4xl text-gray-950 dark:text-white" style={{ fontFamily: "'Times New Roman', Times, serif" }}>My Profile</h1>
                                        <p className="mt-1 text-xs sm:text-sm text-gray-500" style={{ fontFamily: "'Times New Roman', Times, serif" }}>Manage your personal information and account details</p>
                                    </div>
                                    <button onClick={() => setIsEditingProfile(true)} className="inline-flex items-center justify-center gap-2 bg-black px-4 sm:px-6 py-2 sm:py-3 text-xs font-semibold tracking-wide text-white hover:bg-[#b98237] rounded-xl" style={{ fontFamily: "'Times New Roman', Times, serif" }}>
                                        <FiEdit2 size={16} /> EDIT PROFILE
                                    </button>
                                </div>

                                <section className="rounded-md border border-[#e8e1d6] bg-white p-4 sm:p-6 shadow-[0_6px_24px_rgba(28,24,18,0.04)] dark:border-gray-700 dark:bg-gray-800">
                                    <div className="grid gap-6 xl:grid-cols-[1.35fr_1fr] xl:items-center">
                                        <div className="flex flex-col items-center gap-4 sm:flex-row sm:gap-5">
                                            <div className="relative shrink-0">
                                                {user.profileImage || user.avatar ? (
                                                    <img src={user.profileImage || user.avatar} alt={`${user.firstName} ${user.lastName}`} className="h-24 w-24 sm:h-28 sm:w-28 lg:h-32 lg:w-32 rounded-full object-cover" />
                                                ) : (
                                                    <div className="flex h-24 w-24 sm:h-28 sm:w-28 lg:h-32 lg:w-32 items-center justify-center rounded-full bg-[#171717] font-serif text-3xl sm:text-4xl text-white" style={{ fontFamily: "'Times New Roman', Times, serif" }}>
                                                        {user.firstName?.charAt(0)}{user.lastName?.charAt(0)}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="text-center sm:text-left">
                                                <h2 className="font-serif text-2xl sm:text-3xl text-gray-950 dark:text-white" style={{ fontFamily: "'Times New Roman', Times, serif" }}>{user.firstName} {user.lastName}</h2>
                                                <p className="mt-3 sm:mt-4 flex items-center justify-center sm:justify-start gap-2 text-xs sm:text-sm text-gray-600 dark:text-gray-300" style={{ fontFamily: "'Times New Roman', Times, serif" }}><FiMail className="text-[#b98237]" /> {user.email}</p>
                                                <p className="mt-1 sm:mt-2 flex items-center justify-center sm:justify-start gap-2 text-xs sm:text-sm text-gray-600 dark:text-gray-300" style={{ fontFamily: "'Times New Roman', Times, serif" }}><FiPhone className="text-[#b98237]" /> {user.phone || user.phoneNumber || 'Add phone number'}</p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-3 divide-x divide-[#e8e1d6] border-t border-[#e8e1d6] pt-6 xl:border-l xl:border-t-0 xl:pl-7 xl:pt-0">
                                            <button onClick={() => setActiveTab('orders')} className="px-2 sm:px-3 text-center">
                                                <FiShoppingBag className="mx-auto text-xl sm:text-2xl text-[#b98237]" />
                                                <p className="mt-2 font-serif text-2xl sm:text-3xl" style={{ fontFamily: "'Times New Roman', Times, serif" }}>{stats.totalOrders}</p>
                                                <p className="text-[10px] sm:text-xs text-gray-500" style={{ fontFamily: "'Times New Roman', Times, serif" }}>Orders</p>
                                            </button>
                                            <button onClick={() => setActiveTab('wishlist')} className="px-2 sm:px-3 text-center">
                                                <FiHeart className="mx-auto text-xl sm:text-2xl text-[#b98237]" />
                                                <p className="mt-2 font-serif text-2xl sm:text-3xl" style={{ fontFamily: "'Times New Roman', Times, serif" }}>{stats.savedItems}</p>
                                                <p className="text-[10px] sm:text-xs text-gray-500" style={{ fontFamily: "'Times New Roman', Times, serif" }}>Wishlist</p>
                                            </button>
                                            <div className="px-2 sm:px-3 text-center">
                                                <FiStar className="mx-auto text-xl sm:text-2xl text-[#b98237]" />
                                                <p className="mt-2 font-serif text-2xl sm:text-3xl" style={{ fontFamily: "'Times New Roman', Times, serif" }}>{user.reviewCount || user.reviews?.length || 0}</p>
                                                <p className="text-[10px] sm:text-xs text-gray-500" style={{ fontFamily: "'Times New Roman', Times, serif" }}>Reviews</p>
                                            </div>
                                        </div>
                                    </div>
                                </section>

                                <section className="rounded-md border border-[#e8e1d6] bg-white p-4 sm:p-6 shadow-[0_6px_24px_rgba(28,24,18,0.04)] dark:border-gray-700 dark:bg-gray-800">
                                    <div className="mb-4 sm:mb-5 flex items-center justify-between">
                                        <h2 className="font-serif text-xl sm:text-2xl" style={{ fontFamily: "'Times New Roman', Times, serif" }}>Personal Information</h2>
                                        <button onClick={() => setIsEditingProfile(true)} className="text-xs font-semibold text-[#a86f25] hover:underline" style={{ fontFamily: "'Times New Roman', Times, serif" }}>EDIT</button>
                                    </div>
                                    <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2 md:grid-cols-3">
                                        {[
                                            ['Full Name', `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Not provided'],
                                            ['Phone Number', user.phone || user.phoneNumber || 'Not provided'],
                                            ['Gender', user.gender || 'Not provided'],
                                            ['Email Address', user.email],
                                            ['Date of Birth', user.dateOfBirth ? formatDate(user.dateOfBirth) : 'Not provided'],
                                            ['Member Since', stats.memberSince ? formatDate(stats.memberSince) : 'Not available']
                                        ].map(([label, value]) => (
                                            <div key={label} className="border-b border-[#eee8df] pb-3">
                                                <p className="text-xs font-medium text-gray-500" style={{ fontFamily: "'Times New Roman', Times, serif" }}>{label}</p>
                                                <p className="mt-1 sm:mt-2 text-sm text-gray-900 dark:text-gray-100 break-words" style={{ fontFamily: "'Times New Roman', Times, serif" }}>{value}</p>
                                            </div>
                                        ))}
                                    </div>
                                </section>

                                <section className="rounded-md border border-[#e8e1d6] bg-white p-4 sm:p-6 shadow-[0_6px_24px_rgba(28,24,18,0.04)] dark:border-gray-700 dark:bg-gray-800">
                                    <div className="mb-4 sm:mb-5 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <h2 className="font-serif text-xl sm:text-2xl" style={{ fontFamily: "'Times New Roman', Times, serif" }}>Default Address</h2>
                                            <span className="rounded-full bg-[#f5ecdd] px-2 sm:px-3 py-1 text-[10px] sm:text-[11px] text-[#a86f25]" style={{ fontFamily: "'Times New Roman', Times, serif" }}>Default</span>
                                        </div>
                                        <button onClick={() => setActiveTab('addresses')} className="inline-flex items-center gap-1 sm:gap-2 border border-[#ddd3c4] px-3 sm:px-4 py-1.5 sm:py-2 text-xs font-semibold hover:border-[#b98237] hover:text-[#a86f25] rounded-lg" style={{ fontFamily: "'Times New Roman', Times, serif" }}><FiEdit2 size={14} /> EDIT</button>
                                    </div>
                                    {addresses.find(address => address.isDefault) || addresses[0] ? (() => {
                                        const address = addresses.find(address => address.isDefault) || addresses[0];
                                        return <div className="flex gap-3 sm:gap-4">
                                            <div className="flex h-12 w-12 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-md bg-[#fbf6ee] text-[#b98237]"><FiMapPin size={20} /></div>
                                            <div className="text-xs sm:text-sm leading-5 sm:leading-6 text-gray-700 dark:text-gray-300">
                                                <p className="font-semibold text-gray-950 dark:text-white" style={{ fontFamily: "'Times New Roman', Times, serif" }}>{address.label || 'Home'}</p>
                                                <p style={{ fontFamily: "'Times New Roman', Times, serif" }}>{address.street}</p>
                                                <p style={{ fontFamily: "'Times New Roman', Times, serif" }}>{[address.city, address.state, address.zipCode].filter(Boolean).join(', ')}</p>
                                                <p style={{ fontFamily: "'Times New Roman', Times, serif" }}>{address.country}</p>
                                                {address.phone && <p style={{ fontFamily: "'Times New Roman', Times, serif" }}>{address.phone}</p>}
                                            </div>
                                        </div>;
                                    })() : (
                                        <div className="flex flex-col items-start gap-3 text-sm text-gray-500">
                                            <p style={{ fontFamily: "'Times New Roman', Times, serif" }}>No address has been added yet.</p>
                                            <button onClick={() => setActiveTab('addresses')} className="bg-black px-4 sm:px-5 py-2 sm:py-2.5 text-xs font-semibold text-white hover:bg-[#b98237] rounded-lg" style={{ fontFamily: "'Times New Roman', Times, serif" }}>ADD ADDRESS</button>
                                        </div>
                                    )}
                                </section>

                                <section className="rounded-md border border-[#e8e1d6] bg-white p-4 sm:p-6 shadow-[0_6px_24px_rgba(28,24,18,0.04)] dark:border-gray-700 dark:bg-gray-800">
                                    <div className="flex items-center justify-between">
                                        <h2 className="font-serif text-xl sm:text-2xl" style={{ fontFamily: "'Times New Roman', Times, serif" }}>Recent Orders</h2>
                                        <button onClick={() => setActiveTab('orders')} className="inline-flex items-center gap-1 sm:gap-2 border border-[#ddd3c4] px-3 sm:px-4 py-1.5 sm:py-2 text-xs font-semibold hover:border-[#b98237] hover:text-[#a86f25] rounded-lg" style={{ fontFamily: "'Times New Roman', Times, serif" }}>VIEW ALL ORDERS <FiArrowRight size={14} /></button>
                                    </div>
                                    <div className="mt-4 divide-y divide-[#eee8df]">
                                        {orders.slice(0, 3).map(order => (
                                            <div key={order.id} className="flex flex-col justify-between gap-3 py-4 sm:flex-row sm:items-center">
                                                <div><p className="text-xs sm:text-sm font-semibold" style={{ fontFamily: "'Times New Roman', Times, serif" }}>Order #{order.id}</p><p className="mt-1 text-xs text-gray-500" style={{ fontFamily: "'Times New Roman', Times, serif" }}>{formatDate(order.date)}</p></div>
                                                <div className="flex items-center gap-3 sm:gap-4"><span className={`rounded-full px-2 sm:px-3 py-1 text-[10px] sm:text-[11px] font-semibold ${getOrderStatusBadge(getEffectiveOrderStatus(order))}`} style={{ fontFamily: "'Times New Roman', Times, serif" }}>{getOrderStatusLabel(getEffectiveOrderStatus(order)).toUpperCase()}</span><strong className="text-sm sm:text-base" style={{ fontFamily: "'Times New Roman', Times, serif" }}>{formatPrice(order.total)}</strong></div>
                                            </div>
                                        ))}
                                        {orders.length === 0 && <div className="py-8 text-center text-sm text-gray-500" style={{ fontFamily: "'Times New Roman', Times, serif" }}>No orders yet. <Link to="/collections/all" className="font-semibold text-[#a86f25]" style={{ fontFamily: "'Times New Roman', Times, serif" }}>Start shopping</Link></div>}
                                    </div>
                                </section>
                            </motion.div>
                        )}

                        {/* Orders Tab */}
                        {activeTab === "orders" && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-4 sm:p-6"
                                style={{ fontFamily: "'Times New Roman', Times, serif" }}
                            >
                                <h2 className="text-xl sm:text-2xl font-bold mb-6 flex items-center gap-2" style={{ fontFamily: "'Times New Roman', Times, serif" }}>
                                    <FiShoppingBag className="text-blue-600" /> My Orders ({orders.length})
                                </h2>
                                
                                <div className="flex flex-wrap gap-3 sm:gap-4 mb-6 pb-4 border-b dark:border-gray-700">
                                    <div className="flex-1 min-w-[180px] sm:min-w-[200px]">
                                        <div className="relative">
                                            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                            <input
                                                type="text"
                                                placeholder="Search orders..."
                                                value={searchOrder}
                                                onChange={(e) => setSearchOrder(e.target.value)}
                                                className="w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 text-sm"
                                                style={{ fontFamily: "'Times New Roman', Times, serif" }}
                                            />
                                        </div>
                                    </div>
                                    <select
                                        value={orderFilter}
                                        onChange={(e) => setOrderFilter(e.target.value)}
                                        className="px-3 sm:px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 text-sm"
                                        style={{ fontFamily: "'Times New Roman', Times, serif" }}
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
                                        className="px-3 sm:px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 text-sm"
                                        style={{ fontFamily: "'Times New Roman', Times, serif" }}
                                    >
                                        <option value="newest">Newest First</option>
                                        <option value="oldest">Oldest First</option>
                                        <option value="highest">Highest Amount</option>
                                    </select>
                                </div>

                                {filteredOrders.length === 0 ? (
                                    <div className="text-center py-12 sm:py-16">
                                        <FiShoppingBag className="w-16 h-16 sm:w-20 sm:h-20 text-gray-300 mx-auto mb-4" />
                                        <p className="text-gray-500 text-base sm:text-lg" style={{ fontFamily: "'Times New Roman', Times, serif" }}>No orders found</p>
                                        <Link to="/collections/all" className="inline-block mt-4 bg-blue-600 text-white px-6 py-2 rounded-xl hover:bg-blue-700 transition-all text-sm" style={{ fontFamily: "'Times New Roman', Times, serif" }}>
                                            Start Shopping →
                                        </Link>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {filteredOrders.map((order) => {
                                            const orderStatus =
                                                getEffectiveOrderStatus(
                                                    order
                                                );

                                            const isRefunded =
                                                orderStatus ===
                                                "refunded";

                                            const isReturnInProgress =
                                                orderStatus ===
                                                    "return_in_progress" ||
                                                orderStatus ===
                                                    "refund_processing";

                                            const isDelivered =
                                                !isRefunded &&
                                                !isReturnInProgress &&
                                                isOrderDelivered(
                                                    order
                                                );

                                            const isCancelled =
                                                normalizeOrderStatus(
                                                    orderStatus
                                                ) === "cancelled";
                                            
                                            return (
                                                <div key={order.id} className="border-2 border-gray-100 dark:border-gray-700 rounded-xl p-4 sm:p-5 hover:shadow-lg transition-all">
                                                    <div className="flex flex-wrap justify-between items-start mb-4">
                                                        <div>
                                                            <p className="font-bold text-base sm:text-lg" style={{ fontFamily: "'Times New Roman', Times, serif" }}>Order #{order.id}</p>
                                                            <p className="text-xs sm:text-sm text-gray-500 flex items-center gap-1 mt-1" style={{ fontFamily: "'Times New Roman', Times, serif" }}>
                                                                <FiCalendar size={12} /> {formatDate(order.date)}
                                                            </p>
                                                        </div>
                                                        <div className="text-right">
                                                            <span className={`px-2 sm:px-3 py-1 rounded-full text-[10px] sm:text-xs font-semibold ${getOrderStatusBadge(orderStatus)}`} style={{ fontFamily: "'Times New Roman', Times, serif" }}>
                                                                {orderStatus?.toUpperCase()}
                                                            </span>
                                                            <p className="text-lg sm:text-xl font-bold text-blue-600 mt-1" style={{ fontFamily: "'Times New Roman', Times, serif" }}>{formatPrice(order.total)}</p>
                                                        </div>
                                                    </div>
                                                    
                                                    <div className="space-y-2">
                                                        {getOrderItems(order).slice(0, 2).map((item, idx) => (
                                                            <div key={idx} className="flex items-center gap-2 sm:gap-3 p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                                                <img src={item.image} alt={item.name} className="w-10 h-10 sm:w-12 sm:h-12 object-cover rounded-lg" />
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="font-medium text-sm sm:text-base truncate" style={{ fontFamily: "'Times New Roman', Times, serif" }}>{item.name}</p>
                                                                    <p className="text-[10px] sm:text-xs text-gray-500" style={{ fontFamily: "'Times New Roman', Times, serif" }}>Qty: {item.quantity} | {formatPrice(item.price)}</p>
                                                                </div>
                                                            </div>
                                                        ))}
                                                        {order.itemsList?.length > 2 && (
                                                            <p className="text-[10px] sm:text-xs text-gray-500 text-center" style={{ fontFamily: "'Times New Roman', Times, serif" }}>+{order.itemsList.length - 2} more items</p>
                                                        )}
                                                    </div>
                                                    
                                                    <div className="pt-4 border-t mt-4">
                                                        <div className="flex flex-wrap gap-2">
                                                            {!isDelivered && !isCancelled && (
                                                                <button
                                                                    onClick={() => setTrackingOrder(order)}
                                                                    className="inline-flex items-center gap-2 rounded-xl bg-black px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold text-white transition hover:bg-[#b98237]"
                                                                    style={{ fontFamily: "'Times New Roman', Times, serif" }}
                                                                >
                                                                    <FiTruck />
                                                                    Track Order
                                                                </button>
                                                            )}

                                                            {isDelivered && (
                                                                <button
                                                                    onClick={() => setTrackingOrder(order)}
                                                                    className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold text-white transition hover:bg-green-700"
                                                                    style={{ fontFamily: "'Times New Roman', Times, serif" }}
                                                                >
                                                                    <FiCheckCircle />
                                                                    Delivery Complete
                                                                </button>
                                                            )}

                                                            <Link
                                                                to={`/product/${order.itemsList?.[0]?.id}`}
                                                                className="inline-flex items-center gap-2 rounded-xl border border-gray-300 px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold text-gray-700 transition hover:border-black hover:text-black dark:text-gray-200"
                                                                style={{ fontFamily: "'Times New Roman', Times, serif" }}
                                                                onClick={() => window.scrollTo(0, 0)}
                                                            >
                                                                <FiEye />
                                                                View Details
                                                            </Link>

                                                            {isDelivered && !isRefunded && !isReturnInProgress && (
                                                                <button
                                                                    onClick={() => navigateToProductReview(order.itemsList?.[0]?.id, order.itemsList?.[0]?.name, order.id)}
                                                                    className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold text-white transition hover:bg-amber-700"
                                                                    style={{ fontFamily: "'Times New Roman', Times, serif" }}
                                                                >
                                                                    <FiStar />
                                                                    Write a Review
                                                                </button>
                                                            )}

                                                            <button
                                                                type="button"
                                                                onClick={() => deleteOrderFromHistory(order)}
                                                                className="inline-flex items-center gap-2 rounded-xl border border-gray-300 px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold text-gray-600 transition hover:border-red-300 hover:bg-red-50 hover:text-red-600 dark:border-gray-600 dark:text-gray-300"
                                                                style={{ fontFamily: "'Times New Roman', Times, serif" }}
                                                            >
                                                                <FiTrash2 />
                                                                Delete
                                                            </button>

                                                            {!isCancelled && !isDelivered && !isRefunded && !isReturnInProgress && (
                                                                <button
                                                                    onClick={() => cancelOrder(order.id)}
                                                                    disabled={cancellingOrderId === order.id}
                                                                    className="inline-flex items-center gap-2 rounded-xl border border-red-300 px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                                                                    style={{ fontFamily: "'Times New Roman', Times, serif" }}
                                                                >
                                                                    <FiX />
                                                                    {cancellingOrderId === order.id
                                                                        ? "Cancelling..."
                                                                        : "Cancel Order"}
                                                                </button>
                                                            )}
                                                        </div>

                                                        {isRefunded && (
                                                            <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 sm:p-4 dark:border-emerald-900/30 dark:bg-emerald-900/10">
                                                                <div className="flex items-start gap-3">
                                                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white">
                                                                        <FiCreditCard />
                                                                    </div>

                                                                    <div>
                                                                        <p className="text-sm font-bold text-emerald-800 dark:text-emerald-300">
                                                                            Order Refunded
                                                                        </p>

                                                                        <p className="mt-1 text-xs leading-5 text-emerald-700 dark:text-emerald-400">
                                                                            The return has been completed and the refund has been processed. Open Returns & Refunds for the complete refund timeline.
                                                                        </p>

                                                                        <button
                                                                            type="button"
                                                                            onClick={() => {
                                                                                setActiveTab("returns");
                                                                                navigate("/profile?tab=returns");
                                                                            }}
                                                                            className="mt-3 rounded-lg bg-emerald-700 px-3 py-2 text-xs font-bold text-white"
                                                                        >
                                                                            View Refund Details
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {isReturnInProgress && (
                                                            <div className="mt-4 rounded-2xl border border-orange-200 bg-orange-50 p-3 sm:p-4 dark:border-orange-900/30 dark:bg-orange-900/10">
                                                                <div className="flex items-start gap-3">
                                                                    <FiRefreshCw className="mt-0.5 shrink-0 text-orange-600" />

                                                                    <div>
                                                                        <p className="text-sm font-bold text-orange-800 dark:text-orange-300">
                                                                            {orderStatus === "refund_processing"
                                                                                ? "Refund Processing"
                                                                                : "Return In Progress"}
                                                                        </p>

                                                                        <p className="mt-1 text-xs leading-5 text-orange-700 dark:text-orange-400">
                                                                            This order has an active return. Open Returns & Refunds to see pickup, verification and refund updates.
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {isDelivered && (
                                                            <div className="mt-4 rounded-2xl bg-green-50 p-3 sm:p-4 dark:bg-green-900/10">
                                                                <div className="mb-3 flex items-center gap-3">
                                                                    <div className="flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-full bg-green-600 text-white">
                                                                        <FiCheckCircle />
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-xs sm:text-sm font-bold text-green-800 dark:text-green-300" style={{ fontFamily: "'Times New Roman', Times, serif" }}>
                                                                            Order Delivered!
                                                                        </p>
                                                                        <p className="text-[10px] sm:text-xs text-green-700 dark:text-green-400" style={{ fontFamily: "'Times New Roman', Times, serif" }}>
                                                                            You can now request a return for eligible items.
                                                                        </p>
                                                                    </div>
                                                                </div>

                                                                <div className="space-y-3">
                                                                    {getOrderItems(order).map((item, itemIndex) => {
                                                                        const alreadyReturned =
                                                                            hasReturnRequestForItem(
                                                                                getOrderIdentifier(order),
                                                                                getItemIdentifier(item)
                                                                            );

                                                                        return (
                                                                            <div
                                                                                key={`${getOrderIdentifier(order)}-${getItemIdentifier(item)}-${itemIndex}`}
                                                                                className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between dark:border-gray-600 dark:bg-gray-800"
                                                                            >
                                                                                <div className="flex min-w-0 items-center gap-3">
                                                                                    {item.image ? (
                                                                                        <img
                                                                                            src={item.image}
                                                                                            alt={item.name}
                                                                                            className="h-12 w-12 sm:h-14 sm:w-14 shrink-0 rounded-lg object-cover"
                                                                                        />
                                                                                    ) : (
                                                                                        <div className="flex h-12 w-12 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-700">
                                                                                            <FiPackage className="text-gray-400" />
                                                                                        </div>
                                                                                    )}

                                                                                    <div className="min-w-0">
                                                                                        <p className="truncate text-xs sm:text-sm font-semibold" style={{ fontFamily: "'Times New Roman', Times, serif" }}>
                                                                                            {item.name}
                                                                                        </p>
                                                                                        <p className="mt-1 text-[10px] sm:text-xs text-gray-500" style={{ fontFamily: "'Times New Roman', Times, serif" }}>
                                                                                            Qty {item.quantity || 1}
                                                                                            {item.size ? ` · ${item.size}` : ""}
                                                                                            {item.color ? ` · ${item.color}` : ""}
                                                                                        </p>
                                                                                    </div>
                                                                                </div>

                                                                                <div className="flex flex-wrap gap-2">
                                                                                    <button
                                                                                        onClick={() =>
                                                                                            openReturnForItem(
                                                                                                order,
                                                                                                item
                                                                                            )
                                                                                        }
                                                                                        disabled={alreadyReturned}
                                                                                        className="inline-flex items-center gap-1.5 rounded-lg border border-orange-300 px-2 sm:px-3 py-1.5 sm:py-2 text-[10px] sm:text-xs font-bold text-orange-700 transition hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-50"
                                                                                        style={{ fontFamily: "'Times New Roman', Times, serif" }}
                                                                                    >
                                                                                        <FiCornerDownLeft />
                                                                                        {alreadyReturned
                                                                                            ? "Return Requested"
                                                                                            : "Return Item"}
                                                                                    </button>
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {/* Returns Tab */}
                        {activeTab === "returns" && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-4 sm:p-6"
                                style={{ fontFamily: "'Times New Roman', Times, serif" }}
                            >
                                <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                                    <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2" style={{ fontFamily: "'Times New Roman', Times, serif" }}>
                                        <FiShield className="text-orange-600" /> Returns & Refunds ({returnRequests.length})
                                    </h2>
                                    <span className="text-[10px] sm:text-xs text-gray-500" style={{ fontFamily: "'Times New Roman', Times, serif" }}>
                                        Refunds take up to 7 business days
                                    </span>
                                </div>
                                
                                {returnRequests.length === 0 ? (
                                    <div className="text-center py-12 sm:py-16">
                                        <FiShield className="w-16 h-16 sm:w-20 sm:h-20 text-gray-300 mx-auto mb-4" />
                                        <p className="text-gray-500 text-base sm:text-lg" style={{ fontFamily: "'Times New Roman', Times, serif" }}>No return requests yet</p>
                                        <p className="text-xs sm:text-sm text-gray-400 mt-2" style={{ fontFamily: "'Times New Roman', Times, serif" }}>When you request a return, it will appear here with full tracking</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4 sm:space-y-6">
                                        {returnRequests.map((returnReq) => (
                                            <div 
                                                key={returnReq.id} 
                                                className="border-2 rounded-xl p-4 sm:p-5 cursor-pointer hover:shadow-lg transition-all"
                                                onClick={() => setSelectedReturnRequest(returnReq)}
                                            >
                                                <div className="flex flex-wrap justify-between items-start gap-3 mb-4">
                                                    <div className="flex gap-3 min-w-0">
                                                        {returnReq.productImage && (
                                                            <img src={returnReq.productImage} alt={returnReq.productName} className="w-14 h-14 sm:w-16 sm:h-16 object-cover rounded-lg shrink-0" />
                                                        )}
                                                        <div className="min-w-0">
                                                            <p className="font-medium text-sm sm:text-base truncate" style={{ fontFamily: "'Times New Roman', Times, serif" }}>{returnReq.productName}</p>
                                                            <p className="text-[10px] sm:text-xs text-gray-500" style={{ fontFamily: "'Times New Roman', Times, serif" }}>Return ID: #{returnReq.id}</p>
                                                            {returnReq.refundMethod && (
                                                                <p className="text-[10px] sm:text-xs text-green-600 mt-1" style={{ fontFamily: "'Times New Roman', Times, serif" }}>
                                                                    Refund: {returnReq.refundMethod.method}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="text-right shrink-0">
                                                        <div className="flex items-center gap-1 justify-end">
                                                            {getReturnStatusIcon(returnReq.status)}
                                                            <span className={`px-2 py-1 rounded-full text-[10px] sm:text-xs font-semibold ${getReturnStatusBadge(returnReq.status)}`} style={{ fontFamily: "'Times New Roman', Times, serif" }}>
                                                                {getReturnStatusText(returnReq.status)}
                                                            </span>
                                                        </div>
                                                        <p className="text-base sm:text-lg font-bold text-green-600 mt-1" style={{ fontFamily: "'Times New Roman', Times, serif" }}>{formatPrice(returnReq.refundAmount)}</p>
                                                        {returnReq.status === 'refund_processing' && (
                                                            <p className="text-[10px] sm:text-xs text-orange-600 mt-1" style={{ fontFamily: "'Times New Roman', Times, serif" }}>
                                                                ⏳ Processing (7 business days)
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                                
                                                <div className="mt-4">
                                                    <div className="flex justify-between text-[10px] sm:text-xs text-gray-500 mb-1" style={{ fontFamily: "'Times New Roman', Times, serif" }}>
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
                                                
                                                <div className="mt-3 text-[10px] sm:text-xs text-gray-500 flex items-center gap-2" style={{ fontFamily: "'Times New Roman', Times, serif" }}>
                                                    <FiInfo size={12} />
                                                    <span>Click to view full tracking history and refund details</span>
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
                                className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-4 sm:p-6"
                                style={{ fontFamily: "'Times New Roman', Times, serif" }}
                            >
                                <div className="flex justify-between items-center mb-6">
                                    <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2" style={{ fontFamily: "'Times New Roman', Times, serif" }}>
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
                                    <div className="text-center py-12 sm:py-16">
                                        <FiHeart className="w-16 h-16 sm:w-20 sm:h-20 text-gray-300 mx-auto mb-4" />
                                        <p className="text-gray-500 text-base sm:text-lg" style={{ fontFamily: "'Times New Roman', Times, serif" }}>Your wishlist is empty</p>
                                        <Link to="/collections/all" className="inline-block mt-4 bg-blue-600 text-white px-6 py-2 rounded-xl hover:bg-blue-700 transition-all" style={{ fontFamily: "'Times New Roman', Times, serif" }}>
                                            Explore Products →
                                        </Link>
                                    </div>
                                ) : wishlistView === "grid" ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                                        {favorites.map((product) => (
                                            <div key={product.id} className="border-2 border-gray-100 dark:border-gray-700 rounded-2xl p-4 hover:shadow-xl transition-all group">
                                                <div className="relative">
                                                    <img 
                                                        src={product.image || '/images/no-image.svg'} 
                                                        alt={product.name} 
                                                        className="w-full h-48 object-cover rounded-xl mb-3 group-hover:scale-105 transition-transform duration-300"
                                                        onError={(e) => { e.target.src = '/images/no-image.svg'; }}
                                                    />
                                                    <button onClick={() => removeFromFavorites(product.id)} className="absolute top-2 right-2 bg-white rounded-full p-2 shadow-md hover:scale-110 transition-transform">
                                                        <FiTrash2 size={16} className="text-red-500" />
                                                    </button>
                                                </div>
                                                <h3 className="font-semibold text-gray-800 dark:text-white text-sm sm:text-base" style={{ fontFamily: "'Times New Roman', Times, serif" }}>{product.name}</h3>
                                                <p className="text-gray-500 text-xs sm:text-sm mt-1" style={{ fontFamily: "'Times New Roman', Times, serif" }}>{product.brand || "Zamed"}</p>
                                                <p className="text-blue-600 font-bold text-base sm:text-xl mt-2" style={{ fontFamily: "'Times New Roman', Times, serif" }}>{formatPrice(product.price)}</p>
                                                <div className="flex gap-3 mt-4">
                                                    <button onClick={() => addToCartFromFavorites(product)} className="flex-1 bg-gray-900 text-white py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-medium hover:bg-gray-800 transition-all" style={{ fontFamily: "'Times New Roman', Times, serif" }}>
                                                        Add to Cart
                                                    </button>
                                                    <Link 
                                                        to={`/product/${product.id}`} 
                                                        className="px-3 sm:px-5 py-2 sm:py-2.5 border-2 border-gray-300 text-gray-700 rounded-xl text-xs sm:text-sm font-medium hover:border-blue-600 hover:text-blue-600 transition-all"
                                                        style={{ fontFamily: "'Times New Roman', Times, serif" }}
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
                                                    src={product.image || '/images/no-image.svg'} 
                                                    alt={product.name} 
                                                    className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-lg"
                                                    onError={(e) => { e.target.src = '/images/no-image.svg'; }}
                                                />
                                                <div className="flex-1">
                                                    <h3 className="font-semibold text-sm sm:text-base" style={{ fontFamily: "'Times New Roman', Times, serif" }}>{product.name}</h3>
                                                    <p className="text-xs sm:text-sm text-gray-500" style={{ fontFamily: "'Times New Roman', Times, serif" }}>{product.brand || "Zamed"}</p>
                                                    <p className="text-blue-600 font-bold text-sm sm:text-base" style={{ fontFamily: "'Times New Roman', Times, serif" }}>{formatPrice(product.price)}</p>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button onClick={() => addToCartFromFavorites(product)} className="px-3 sm:px-4 py-1.5 sm:py-2 bg-gray-900 text-white rounded-lg text-xs sm:text-sm hover:bg-gray-800" style={{ fontFamily: "'Times New Roman', Times, serif" }}>
                                                        Add to Cart
                                                    </button>
                                                    <Link 
                                                        to={`/product/${product.id}`}
                                                        onClick={() => window.scrollTo(0, 0)}
                                                        className="px-3 sm:px-4 py-1.5 sm:py-2 border border-gray-300 text-gray-700 rounded-lg text-xs sm:text-sm hover:border-blue-600 hover:text-blue-600 transition-all"
                                                        style={{ fontFamily: "'Times New Roman', Times, serif" }}
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
                                className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-4 sm:p-6"
                                style={{ fontFamily: "'Times New Roman', Times, serif" }}
                            >
                                <div className="flex items-center justify-between mb-6">
                                    <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2" style={{ fontFamily: "'Times New Roman', Times, serif" }}>
                                        <FiTag className="text-green-600" /> My Coupons ({userCoupons.length})
                                    </h2>
                                    {userCoupons.length > 0 && (
                                        <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400" style={{ fontFamily: "'Times New Roman', Times, serif" }}>
                                            {userCoupons.filter(c => !c.used && (!c.endDate || new Date(c.endDate) > new Date())).length} active
                                        </span>
                                    )}
                                </div>
                                {userCoupons.length === 0 ? (
                                    <div className="text-center py-12 sm:py-16">
                                        <FiTag className="w-16 h-16 sm:w-20 sm:h-20 text-gray-300 mx-auto mb-4" />
                                        <p className="text-gray-500 text-base sm:text-lg" style={{ fontFamily: "'Times New Roman', Times, serif" }}>No coupons available</p>
                                        <p className="text-xs sm:text-sm text-gray-400 mt-2" style={{ fontFamily: "'Times New Roman', Times, serif" }}>Coupons will appear here when you receive special offers</p>
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
                                                                    <p className="text-[10px] font-semibold tracking-[0.2em] text-[#e6bd70]" style={{ fontFamily: "'Times New Roman', Times, serif" }}>
                                                                        {isActive ? "ACTIVE OFFER" : isExpired ? "EXPIRED" : "USED"}
                                                                    </p>
                                                                    <h3 className="mt-2 font-serif text-xl sm:text-2xl lg:text-3xl" style={{ fontFamily: "'Times New Roman', Times, serif" }}>{getDiscountLabel(coupon)}</h3>
                                                                    <p className="mt-1 text-sm text-white/65 line-clamp-1" style={{ fontFamily: "'Times New Roman', Times, serif" }}>{coupon.title || coupon.description}</p>
                                                                </div>
                                                                <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase ${
                                                                    isActive ? "bg-emerald-400/20 text-emerald-300" :
                                                                    isExpired ? "bg-red-400/20 text-red-300" :
                                                                    "bg-white/10 text-white/60"
                                                                }`} style={{ fontFamily: "'Times New Roman', Times, serif" }}>
                                                                    {isActive ? "Active" : isExpired ? "Expired" : "Used"}
                                                                </span>
                                                            </div>
                                                            <div className="mt-4 flex items-center justify-between rounded-xl border border-white/15 bg-black/20 px-4 py-2.5">
                                                                <span className="font-mono text-sm sm:text-base font-bold tracking-[0.12em]" style={{ fontFamily: "'Times New Roman', Times, serif" }}>{coupon.code}</span>
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
                                                        <p className="text-sm leading-6 text-gray-500 dark:text-gray-400 line-clamp-2" style={{ fontFamily: "'Times New Roman', Times, serif" }}>
                                                            {coupon.description || "Premium discount for ZAMED customers."}
                                                        </p>
                                                        <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                                                            <div className="rounded-xl bg-[#faf7f1] p-2.5 dark:bg-gray-700/50">
                                                                <span className="text-gray-400" style={{ fontFamily: "'Times New Roman', Times, serif" }}>Minimum order</span>
                                                                <p className="mt-0.5 font-semibold text-gray-900 dark:text-white" style={{ fontFamily: "'Times New Roman', Times, serif" }}>
                                                                    {coupon.minPurchase > 0 ? `${currencySymbol}${coupon.minPurchase}` : "No minimum"}
                                                                </p>
                                                            </div>
                                                            <div className="rounded-xl bg-[#faf7f1] p-2.5 dark:bg-gray-700/50">
                                                                <span className="text-gray-400" style={{ fontFamily: "'Times New Roman', Times, serif" }}>Valid until</span>
                                                                <p className="mt-0.5 font-semibold text-gray-900 dark:text-white" style={{ fontFamily: "'Times New Roman', Times, serif" }}>
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
                                                                className="flex-1 rounded-xl bg-[#171511] px-4 py-2.5 text-xs sm:text-sm font-semibold text-white transition hover:bg-[#b47a29] flex items-center justify-center gap-2"
                                                                style={{ fontFamily: "'Times New Roman', Times, serif" }}
                                                            >
                                                                <FiCopy size={14} /> Copy Code
                                                            </button>
                                                            {isActive && (
                                                                <Link
                                                                    to="/collections/all"
                                                                    className="flex-1 rounded-xl border border-[#ded4c5] px-4 py-2.5 text-xs sm:text-sm font-semibold text-gray-700 transition hover:border-[#b47a29] hover:text-[#a36d23] flex items-center justify-center gap-2 dark:border-gray-600 dark:text-gray-300"
                                                                    style={{ fontFamily: "'Times New Roman', Times, serif" }}
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

                        {/* Notifications Tab */}
                        {activeTab === "notifications" && (
                            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl border border-gray-200 bg-white p-4 shadow-xl sm:p-6 dark:border-gray-700 dark:bg-gray-800" style={{ fontFamily: "'Times New Roman', Times, serif" }}>
                                <div className="flex flex-col gap-4 border-b pb-5 sm:flex-row sm:items-end sm:justify-between dark:border-gray-700">
                                    <div><h2 className="text-2xl font-bold">Notifications</h2><p className="mt-1 text-sm text-gray-500">Open any notification to view the related order, return, offer, product, security page or support section.</p></div>
                                    <div className="flex flex-wrap gap-2">{[["all",`All (${notifications.length})`],["unread",`Unread (${notifications.filter(n=>!n.read).length})`],["read",`Read (${notifications.filter(n=>n.read).length})`]].map(([v,l])=><button key={v} onClick={()=>setNotificationFilter(v)} className={`rounded-full px-4 py-2 text-xs font-bold ${notificationFilter===v?"bg-black text-white":"bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300"}`}>{l}</button>)}</div>
                                </div>
                                <div className="mt-4 flex justify-end gap-2">{notifications.some(n=>!n.read)&&<button onClick={markAllNotificationsAsRead} className="rounded-xl bg-black px-4 py-2 text-xs font-bold text-white">Mark all as read</button>}{notifications.some(n=>n.read)&&<button onClick={clearReadNotifications} className="rounded-xl border px-4 py-2 text-xs font-bold text-red-600">Clear read</button>}</div>
                                <div className="mt-5 space-y-3">{filteredNotifications.length===0?<div className="py-14 text-center text-gray-500"><FiBell className="mx-auto mb-3 h-12 w-12 text-gray-300" />No {notificationFilter==="all"?"":notificationFilter} notifications</div>:filteredNotifications.map(notif=><div key={getNotificationId(notif)} className={`rounded-2xl border p-4 ${notif.read?"bg-gray-50 dark:bg-gray-700/30":"border-amber-300 bg-amber-50/70 dark:bg-amber-900/10"}`}><div className="flex flex-col gap-3 sm:flex-row sm:items-center"><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><p className="font-bold">{notif.title}</p>{!notif.read&&<span className="rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-white">UNREAD</span>}</div><p className="mt-1 text-sm text-gray-500">{notif.message}</p><p className="mt-2 text-xs text-gray-400">{formatDateTime(notif.date||notif.createdAt||new Date())}</p></div><div className="flex gap-2"><button onClick={()=>viewNotificationDetails(notif)} className="rounded-xl bg-black px-4 py-2.5 text-xs font-bold text-white">View details</button><button onClick={()=>notif.read?markNotificationAsUnread(getNotificationId(notif)):markNotificationAsRead(getNotificationId(notif))} className="rounded-xl border px-3 py-2.5 text-xs font-bold">{notif.read?"Mark unread":"Mark read"}</button></div></div></div>)}</div>
                            </motion.div>
                        )}

                        {/* Addresses Tab */}
                        {activeTab === "addresses" && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-4 sm:p-6"
                                style={{ fontFamily: "'Times New Roman', Times, serif" }}
                            >
                                <div className="flex justify-between items-center mb-6">
                                    <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2" style={{ fontFamily: "'Times New Roman', Times, serif" }}>
                                        <FiMapPin className="text-green-600" /> My Addresses
                                    </h2>
                                    <button onClick={() => setShowAddAddress(true)} className="px-3 sm:px-4 py-1.5 sm:py-2 bg-blue-600 text-white rounded-lg text-xs sm:text-sm font-medium hover:bg-blue-700 transition-all flex items-center gap-2" style={{ fontFamily: "'Times New Roman', Times, serif" }}>
                                        <FiPlus size={14} /> Add New
                                    </button>
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {addresses.map((address) => (
                                        <div key={address.id} className={`border-2 rounded-xl p-4 ${address.isDefault ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700'}`}>
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="flex items-center gap-2">
                                                    {address.isDefault && (
                                                        <span className="px-2 py-0.5 bg-blue-600 text-white text-[10px] rounded-full" style={{ fontFamily: "'Times New Roman', Times, serif" }}>Default</span>
                                                    )}
                                                </div>
                                                <div className="flex gap-2">
                                                    {!address.isDefault && (
                                                        <button onClick={() => setDefaultAddress(address.id)} className="text-[10px] sm:text-xs text-blue-600 hover:underline" style={{ fontFamily: "'Times New Roman', Times, serif" }}>
                                                            Set Default
                                                        </button>
                                                    )}
                                                    <button onClick={() => deleteAddress(address.id)} className="text-red-500 hover:text-red-700">
                                                        <FiTrash2 size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                            <p className="font-medium text-sm sm:text-base" style={{ fontFamily: "'Times New Roman', Times, serif" }}>{address.street}</p>
                                            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400" style={{ fontFamily: "'Times New Roman', Times, serif" }}>{address.city}, {address.state}</p>
                                            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400" style={{ fontFamily: "'Times New Roman', Times, serif" }}>{address.zipCode}, {address.country}</p>
                                            {address.phone && <p className="text-xs sm:text-sm text-gray-500 mt-1" style={{ fontFamily: "'Times New Roman', Times, serif" }}>📞 {address.phone}</p>}
                                        </div>
                                    ))}
                                </div>
                                
                                {addresses.length === 0 && (
                                    <div className="text-center py-12">
                                        <FiMapPin className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                                        <p className="text-gray-500" style={{ fontFamily: "'Times New Roman', Times, serif" }}>No addresses saved yet</p>
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {/* Security Tab */}
                        {activeTab === "security" && (
                            <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} className="rounded-3xl border border-gray-200 bg-white p-4 shadow-xl sm:p-6 dark:border-gray-700 dark:bg-gray-800" style={{fontFamily:"'Times New Roman', Times, serif"}}>
                                <h2 className="text-2xl font-bold flex items-center gap-2"><FiLock /> Security</h2>
                                <p className="mt-1 text-sm text-gray-500">Manage password, two-factor authentication, alerts and sessions.</p>
                                <form onSubmit={handleChangePassword} className="mt-6 rounded-2xl border p-4 dark:border-gray-700"><div className="flex justify-between"><h3 className="font-bold">Change Password</h3><button type="button" onClick={()=>setShowPasswords(v=>!v)}><FiEye /></button></div><div className="mt-4 grid gap-3 lg:grid-cols-3">{[["currentPassword","Current password"],["newPassword","New password"],["confirmPassword","Confirm new password"]].map(([k,p])=><input key={k} type={showPasswords?"text":"password"} value={passwordForm[k]} onChange={e=>setPasswordForm(x=>({...x,[k]:e.target.value}))} placeholder={p} className="rounded-xl border px-4 py-3 text-sm dark:border-gray-600 dark:bg-gray-700" />)}</div><button disabled={changingPassword} className="mt-4 rounded-xl bg-black px-5 py-3 text-sm font-bold text-white">{changingPassword?"Updating...":"Update Password"}</button></form>
                                <div className="mt-5 grid gap-4 md:grid-cols-2"><div className="rounded-2xl border p-4 dark:border-gray-700"><h3 className="font-bold">Two-Factor Authentication</h3><p className="mt-1 text-sm text-gray-500">Status: {securityPrefs.twoFactorEnabled?"Enabled":"Disabled"}</p><button onClick={toggleTwoFactor} disabled={securityActionLoading} className="mt-4 rounded-xl border px-4 py-2.5 text-sm font-bold">{securityPrefs.twoFactorEnabled?"Disable 2FA":"Enable 2FA"}</button></div><div className="rounded-2xl border p-4 dark:border-gray-700"><h3 className="font-bold">Security Alerts</h3>{[["loginAlerts","Login alerts"],["securityEmails","Security emails"]].map(([k,l])=><label key={k} className="mt-3 flex justify-between"><span>{l}</span><input type="checkbox" checked={securityPrefs[k]} onChange={e=>persistSecurityPrefs({...securityPrefs,[k]:e.target.checked})} /></label>)}</div></div>
                                <div className="mt-5 rounded-2xl border p-4 dark:border-gray-700"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h3 className="font-bold">Current Session</h3><p className="text-sm text-gray-500">Browser • Active now</p></div><button onClick={logoutOtherSessions} disabled={securityActionLoading} className="rounded-xl border border-red-200 px-4 py-2.5 text-sm font-bold text-red-600">Sign out other sessions</button></div></div>
                            </motion.div>
                        )}

                        {/* Settings Tab */}
                        {activeTab === "settings" && (
                            <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} className="space-y-5" style={{fontFamily:"'Times New Roman', Times, serif"}}>
                                <section className="rounded-3xl border border-gray-200 bg-white p-4 shadow-xl sm:p-6 dark:border-gray-700 dark:bg-gray-800"><h2 className="text-2xl font-bold flex items-center gap-2"><FiSettings /> Settings</h2><p className="mt-1 text-sm text-gray-500">Manage communication and shopping preferences.</p><div className="mt-5">{[["emailNotifications","Email Notifications"],["smsAlerts","SMS Alerts"],["orderUpdates","Order Updates"],["promotionalOffers","Offers & Promotions"],["wishlistAlerts","Wishlist Alerts"]].map(([k,l])=><label key={k} className="flex items-center justify-between border-b py-4 last:border-0 dark:border-gray-700"><span className="font-bold">{l}</span><input type="checkbox" checked={accountPrefs[k]} onChange={e=>persistAccountPrefs({...accountPrefs,[k]:e.target.checked})} /></label>)}</div></section>
                                <section className="grid gap-4 md:grid-cols-2"><div className="rounded-3xl border bg-white p-5 dark:border-gray-700 dark:bg-gray-800"><FiDownload className="text-2xl"/><h3 className="mt-3 font-bold">Download My Data</h3><button onClick={downloadAccountData} className="mt-4 rounded-xl border px-4 py-2.5 text-sm font-bold">Download Data</button></div><div className="rounded-3xl border bg-white p-5 dark:border-gray-700 dark:bg-gray-800"><FiMoon className="text-2xl"/><h3 className="mt-3 font-bold">Appearance</h3><button onClick={()=>{const next=!darkMode;setDarkMode(next);localStorage.setItem("theme",next?"dark":"light");document.documentElement.classList.toggle("dark",next);}} className="mt-4 rounded-xl bg-black px-4 py-2.5 text-sm font-bold text-white">{darkMode?"Light Mode":"Dark Mode"}</button></div></section>
                                <section className="rounded-3xl border border-red-200 bg-red-50 p-5 dark:bg-red-900/10"><h3 className="font-bold text-red-700">Delete Account</h3><p className="mt-1 text-sm text-red-600">Type DELETE to confirm permanent deletion.</p><button onClick={handleDeleteAccount} disabled={deletingAccount} className="mt-4 rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white">{deletingAccount?"Deleting...":"Delete Account"}</button></section>
                            </motion.div>
                        )}
                    </div>
                </div>

                {/* RETURN ITEM MODAL */}
                <AnimatePresence>
                    {selectedItemForReturn && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-3 sm:p-4 backdrop-blur-sm"
                            onMouseDown={(event) => {
                                if (
                                    event.target ===
                                    event.currentTarget
                                ) {
                                    resetReturnForm();
                                }
                            }}
                        >
                            <motion.div
                                initial={{
                                    opacity: 0,
                                    y: 24,
                                    scale: 0.97
                                }}
                                animate={{
                                    opacity: 1,
                                    y: 0,
                                    scale: 1
                                }}
                                exit={{
                                    opacity: 0,
                                    y: 15,
                                    scale: 0.98
                                }}
                                className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-4 shadow-2xl sm:p-6 dark:bg-gray-800"
                                style={{
                                    fontFamily:
                                        "'Times New Roman', Times, serif"
                                }}
                            >
                                <div className="flex items-start justify-between gap-4 border-b border-gray-100 pb-4 dark:border-gray-700">
                                    <div className="min-w-0">
                                        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-orange-600">
                                            Returns & Refunds
                                        </p>

                                        <h2 className="mt-1 text-xl font-bold sm:text-2xl">
                                            Return Item
                                        </h2>

                                        <p className="mt-1 truncate text-sm text-gray-500">
                                            {
                                                selectedItemForReturn.productName
                                            }
                                        </p>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={
                                            resetReturnForm
                                        }
                                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300"
                                        aria-label="Close return form"
                                    >
                                        <FiX />
                                    </button>
                                </div>

                                <div className="mt-5 flex items-center gap-3 rounded-2xl border border-gray-100 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-700/40">
                                    {selectedItemForReturn.productImage ? (
                                        <img
                                            src={
                                                selectedItemForReturn.productImage
                                            }
                                            alt={
                                                selectedItemForReturn.productName
                                            }
                                            className="h-16 w-16 shrink-0 rounded-xl object-cover"
                                        />
                                    ) : (
                                        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-white dark:bg-gray-700">
                                            <FiPackage className="text-gray-400" />
                                        </div>
                                    )}

                                    <div className="min-w-0">
                                        <p className="truncate font-bold">
                                            {
                                                selectedItemForReturn.productName
                                            }
                                        </p>

                                        <p className="mt-1 text-xs text-gray-500">
                                            Order #
                                            {
                                                selectedItemForReturn.orderId
                                            }
                                        </p>

                                        <p className="mt-1 text-xs text-gray-500">
                                            Paid by:{" "}
                                            <strong>
                                                {
                                                    selectedItemForReturn.paymentMethod
                                                }
                                            </strong>
                                        </p>
                                    </div>
                                </div>

                                <div className="mt-5 space-y-5">
                                    <div>
                                        <label className="mb-2 block text-sm font-bold">
                                            Reason for return
                                        </label>

                                        <select
                                            value={
                                                returnReason
                                            }
                                            onChange={event =>
                                                setReturnReason(
                                                    event.target.value
                                                )
                                            }
                                            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-orange-500 dark:border-gray-600 dark:bg-gray-700"
                                        >
                                            <option value="">
                                                Select a reason
                                            </option>

                                            {returnReasons.map(
                                                reason => (
                                                    <option
                                                        key={
                                                            reason
                                                        }
                                                        value={
                                                            reason
                                                        }
                                                    >
                                                        {
                                                            reason
                                                        }
                                                    </option>
                                                )
                                            )}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="mb-2 block text-sm font-bold">
                                            Additional details
                                        </label>

                                        <textarea
                                            rows={3}
                                            value={
                                                returnComment
                                            }
                                            onChange={event =>
                                                setReturnComment(
                                                    event.target.value
                                                )
                                            }
                                            placeholder="Tell us more about the return..."
                                            className="w-full resize-none rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-orange-500 dark:border-gray-600 dark:bg-gray-700"
                                        />
                                    </div>

                                    <div className="rounded-2xl border border-gray-200 p-4 dark:border-gray-600">
                                        <div className="mb-3 flex items-center gap-2">
                                            <FiDollarSign className="text-green-600" />
                                            <h3 className="font-bold">
                                                Refund method
                                            </h3>
                                        </div>

                                        {selectedItemForReturn.isCashOrder ? (
                                            <div className="space-y-3">
                                                <p className="text-sm leading-6 text-gray-500">
                                                    This order was paid by cash. Choose how you want to receive your approved refund.
                                                </p>

                                                <label
                                                    className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition ${
                                                        returnMethod ===
                                                        "bank_transfer"
                                                            ? "border-black bg-gray-50 dark:border-white dark:bg-gray-700"
                                                            : "border-gray-200 dark:border-gray-600"
                                                    }`}
                                                >
                                                    <input
                                                        type="radio"
                                                        name="returnMethod"
                                                        value="bank_transfer"
                                                        checked={
                                                            returnMethod ===
                                                            "bank_transfer"
                                                        }
                                                        onChange={event =>
                                                            setReturnMethod(
                                                                event.target.value
                                                            )
                                                        }
                                                        className="mt-1 accent-black"
                                                    />

                                                    <div>
                                                        <p className="font-bold">
                                                            Bank transfer
                                                        </p>
                                                        <p className="mt-1 text-xs leading-5 text-gray-500">
                                                            Send the refund directly to your bank account. Processing can take up to 7 days after approval.
                                                        </p>
                                                    </div>
                                                </label>

                                                <label
                                                    className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition ${
                                                        returnMethod ===
                                                        "shop_pickup"
                                                            ? "border-black bg-gray-50 dark:border-white dark:bg-gray-700"
                                                            : "border-gray-200 dark:border-gray-600"
                                                    }`}
                                                >
                                                    <input
                                                        type="radio"
                                                        name="returnMethod"
                                                        value="shop_pickup"
                                                        checked={
                                                            returnMethod ===
                                                            "shop_pickup"
                                                        }
                                                        onChange={event =>
                                                            setReturnMethod(
                                                                event.target.value
                                                            )
                                                        }
                                                        className="mt-1 accent-black"
                                                    />

                                                    <div>
                                                        <p className="font-bold">
                                                            Collect refund from shop
                                                        </p>
                                                        <p className="mt-1 text-xs leading-5 text-gray-500">
                                                            Choose a date and time to collect the approved refund from the Zamed shop.
                                                        </p>
                                                    </div>
                                                </label>
                                            </div>
                                        ) : (
                                            <div className="rounded-xl bg-green-50 p-4 text-sm text-green-900 dark:bg-green-900/20 dark:text-green-300">
                                                <div className="flex items-center gap-2 font-bold">
                                                    <FiCreditCard />
                                                    Original payment method
                                                </div>

                                                <p className="mt-1 text-xs leading-5">
                                                    Your refund will be returned to the payment method used for this order. Processing can take up to 7 days after approval.
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    {returnMethod ===
                                        "bank_transfer" &&
                                        selectedItemForReturn.isCashOrder && (
                                        <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-4 dark:border-blue-900/40 dark:bg-blue-900/10">
                                            <h3 className="font-bold">
                                                Bank details
                                            </h3>

                                            <div className="mt-3 grid gap-3 sm:grid-cols-2">
                                                <input
                                                    type="text"
                                                    value={
                                                        accountHolderName
                                                    }
                                                    onChange={event =>
                                                        setAccountHolderName(
                                                            event.target.value
                                                        )
                                                    }
                                                    placeholder="Account holder name"
                                                    className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 dark:border-gray-600 dark:bg-gray-700"
                                                />

                                                <input
                                                    type="text"
                                                    value={
                                                        bankName
                                                    }
                                                    onChange={event =>
                                                        setBankName(
                                                            event.target.value
                                                        )
                                                    }
                                                    placeholder="Bank name"
                                                    className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 dark:border-gray-600 dark:bg-gray-700"
                                                />

                                                <input
                                                    type="text"
                                                    inputMode="numeric"
                                                    value={
                                                        accountNumber
                                                    }
                                                    onChange={event =>
                                                        setAccountNumber(
                                                            event.target.value.replace(
                                                                /[^0-9]/g,
                                                                ""
                                                            )
                                                        )
                                                    }
                                                    placeholder="Account number"
                                                    className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 dark:border-gray-600 dark:bg-gray-700"
                                                />

                                                <input
                                                    type="text"
                                                    value={
                                                        bankBranch
                                                    }
                                                    onChange={event =>
                                                        setBankBranch(
                                                            event.target.value
                                                        )
                                                    }
                                                    placeholder="Sort code / branch"
                                                    className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 dark:border-gray-600 dark:bg-gray-700"
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {returnMethod ===
                                        "shop_pickup" &&
                                        selectedItemForReturn.isCashOrder && (
                                        <div className="rounded-2xl border border-orange-200 bg-orange-50/50 p-4 dark:border-orange-900/40 dark:bg-orange-900/10">
                                            <h3 className="font-bold">
                                                Shop collection
                                            </h3>

                                            <div className="mt-3 grid gap-3 sm:grid-cols-2">
                                                <div>
                                                    <label className="mb-1 block text-xs font-bold">
                                                        Collection date
                                                    </label>

                                                    <input
                                                        type="date"
                                                        min={
                                                            new Date()
                                                                .toISOString()
                                                                .split(
                                                                    "T"
                                                                )[0]
                                                        }
                                                        value={
                                                            shopPickupDate
                                                        }
                                                        onChange={event =>
                                                            setShopPickupDate(
                                                                event.target.value
                                                            )
                                                        }
                                                        className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm dark:border-gray-600 dark:bg-gray-700"
                                                    />
                                                </div>

                                                <div>
                                                    <label className="mb-1 block text-xs font-bold">
                                                        Collection time
                                                    </label>

                                                    <input
                                                        type="time"
                                                        value={
                                                            shopPickupTime
                                                        }
                                                        onChange={event =>
                                                            setShopPickupTime(
                                                                event.target.value
                                                            )
                                                        }
                                                        className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm dark:border-gray-600 dark:bg-gray-700"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex items-start gap-3 rounded-2xl bg-orange-50 p-4 text-sm text-orange-900 dark:bg-orange-900/20 dark:text-orange-200">
                                        <FiClock className="mt-0.5 shrink-0 text-orange-600" />
                                        <div>
                                            <p className="font-bold">
                                                Refund processing
                                            </p>
                                            <p className="mt-1 text-xs leading-5">
                                                After the returned product is received and approved, bank/original-payment refunds can take up to 7 days.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row">
                                    <button
                                        type="button"
                                        onClick={
                                            resetReturnForm
                                        }
                                        className="flex-1 rounded-xl border border-gray-200 py-3 text-sm font-bold dark:border-gray-600"
                                    >
                                        Cancel
                                    </button>

                                    <button
                                        type="button"
                                        onClick={
                                            submitReturnRequest
                                        }
                                        disabled={
                                            isSubmittingReturn
                                        }
                                        className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-black py-3 text-sm font-bold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        {isSubmittingReturn ? (
                                            <>
                                                <FiLoader className="animate-spin" />
                                                Submitting...
                                            </>
                                        ) : (
                                            <>
                                                <FiCornerDownLeft />
                                                Submit Return
                                            </>
                                        )}
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