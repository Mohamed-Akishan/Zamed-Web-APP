// src/components/Admin/AdminLayout.jsx
import { Outlet, Link, useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
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
    FiCheckCircle,
    FiAlertTriangle,
    FiChevronRight,
    FiClock,
    FiShield,
    FiDollarSign,
    FiExternalLink,
    FiTrash2
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

// ============================================================
// SHARED Rate Limiter - Single instance across all components
// ============================================================
class RateLimiter {
    constructor(limit = 3, windowMs = 30000) {
        this.limit = limit;
        this.windowMs = windowMs;
        this.requests = [];
        this.cooldown = false;
        this.cooldownTimeout = null;
        this.pendingQueue = [];
        this.isProcessing = false;
    }

    canMakeRequest() {
        const now = Date.now();
        this.requests = this.requests.filter(time => now - time < this.windowMs);

        if (this.cooldown) {
            return false;
        }

        if (this.requests.length >= this.limit) {
            this.cooldown = true;
            const waitTime = this.windowMs;
            console.log(`⏳ Rate limit reached. Cooling down for ${waitTime}ms`);
            
            if (this.cooldownTimeout) {
                clearTimeout(this.cooldownTimeout);
            }
            
            this.cooldownTimeout = setTimeout(() => {
                this.cooldown = false;
                this.requests = [];
                this.processQueue();
                console.log('✅ Rate limiter: cooldown complete');
            }, waitTime);
            
            return false;
        }

        this.requests.push(now);
        return true;
    }

    async waitForSlot() {
        return new Promise((resolve) => {
            if (this.canMakeRequest()) {
                resolve();
            } else {
                this.pendingQueue.push(resolve);
                if (!this.isProcessing) {
                    this.processQueue();
                }
            }
        });
    }

    processQueue() {
        if (this.isProcessing || this.pendingQueue.length === 0) return;
        this.isProcessing = true;

        const processNext = () => {
            if (this.pendingQueue.length === 0 || this.cooldown) {
                this.isProcessing = false;
                return;
            }

            if (this.canMakeRequest()) {
                const resolve = this.pendingQueue.shift();
                resolve();
                setTimeout(processNext, 500);
            } else {
                setTimeout(processNext, 1000);
            }
        };

        processNext();
    }
}

// SHARED instance - used by both AdminLayout and ReturnManagement
export const sharedRateLimiter = new RateLimiter(3, 30000);

// ============================================================
// SHARED Debounced fetch with queue
// ============================================================
export const debouncedFetch = (() => {
    const pending = new Map();
    const cache = new Map();

    return async (url, options = {}, cacheDuration = 30000) => {
        const cacheKey = `${url}_${JSON.stringify(options)}`;
        
        if (cache.has(cacheKey)) {
            const cached = cache.get(cacheKey);
            if (Date.now() - cached.timestamp < cacheDuration) {
                console.log(`📦 Using cached response for: ${url}`);
                return cached.data;
            }
            cache.delete(cacheKey);
        }

        if (pending.has(cacheKey)) {
            console.log(`⏳ Request already pending for: ${url}`);
            return pending.get(cacheKey);
        }

        await sharedRateLimiter.waitForSlot();

        const promise = fetch(url, options)
            .then(response => {
                if (!response.ok) {
                    if (response.status === 429) {
                        console.warn('⚠️ 429 received, entering cooldown');
                        sharedRateLimiter.cooldown = true;
                        setTimeout(() => {
                            sharedRateLimiter.cooldown = false;
                            sharedRateLimiter.requests = [];
                            sharedRateLimiter.processQueue();
                        }, 30000);
                        throw new Error('Rate limit exceeded. Please try again later.');
                    }
                    throw new Error(`API Error: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                cache.set(cacheKey, {
                    data,
                    timestamp: Date.now()
                });
                return data;
            })
            .finally(() => {
                pending.delete(cacheKey);
            });

        pending.set(cacheKey, promise);
        return promise;
    };
})();

// ============================================================
// AdminLayout Component
// ============================================================
const AdminLayout = () => {
    // ============================================================
    // ALL HOOKS - MUST BE CALLED IN SAME ORDER EVERY RENDER
    // ============================================================
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
    const [loading, setLoading] = useState(true);
    const [isMobile, setIsMobile] = useState(false);
    const [notificationLoading, setNotificationLoading] = useState(false);

    const location = useLocation();
    const navigate = useNavigate();
    const notificationRef = useRef(null);
    const profileRef = useRef(null);
    const notificationIntervalRef = useRef(null);
    const isMountedRef = useRef(true);
    const initialLoadDone = useRef(false);

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

    const getToken = useCallback(() =>
        localStorage.getItem("adminToken") ||
        localStorage.getItem("admin_token") ||
        localStorage.getItem("token"), []
    );

    const currentAdmin = useMemo(() => safeJSON(localStorage.getItem("admin"), {}), []);

    const ADMIN_ROLES = ["super_admin", "admin", "editor", "viewer"];

    const isAdminAccount = useCallback((user = {}) =>
        ADMIN_ROLES.includes(String(user?.role || "").toLowerCase()), []
    );

    const getStoredAdminIdentity = useCallback(() => {
        let stored = safeJSON(localStorage.getItem("admin"), {});
        
        if (!stored || !stored.role) {
            const userData = safeJSON(localStorage.getItem("user"), {});
            if (userData && (userData.role === "admin" || userData.role === "super_admin")) {
                stored = userData;
                localStorage.setItem("admin", JSON.stringify(userData));
            }
        }

        const name =
            stored.name ||
            `${stored.firstName || ""} ${stored.lastName || ""}`.trim() ||
            stored.username ||
            stored.email?.split("@")?.[0] ||
            "Admin";

        const role = String(stored.role || "viewer").toLowerCase();

        return { ...stored, name, role };
    }, []);

    const filteredMenuItems = useMemo(() =>
        menuItems.filter((item) =>
            item.roles.includes(currentAdmin.role || "viewer")
        ), [currentAdmin.role]
    );

    // ============================================================
    // Mobile detection
    // ============================================================
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

    // ============================================================
    // Close menus on navigation
    // ============================================================
    useEffect(() => {
        setIsMobileSidebarOpen(false);
        setShowNotifications(false);
        setShowProfileMenu(false);
    }, [location.pathname]);

    // ============================================================
    // Click outside handlers
    // ============================================================
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
    // Load return/refund notifications
    // ============================================================
    const loadReturnAndRefundNotifications = useCallback(() => {
        const notifications = [];
        
        try {
            const returnRequests = safeJSON(localStorage.getItem('return_requests'), []);
            
            if (Array.isArray(returnRequests)) {
                returnRequests.forEach((returnReq) => {
                    if (!returnReq) return;
                    
                    const status = returnReq.status || 'pending_pickup';
                    const statusLabels = {
                        'pending_pickup': 'Pending Pickup',
                        'pickup_scheduled': 'Pickup Scheduled',
                        'picked_up': 'Picked Up',
                        'verified': 'Verified',
                        'refund_processing': 'Refund Processing',
                        'refunded': 'Refunded',
                        'rejected': 'Rejected'
                    };
                    
                    const showStatuses = ['pending_pickup', 'pickup_scheduled', 'verified', 'refund_processing', 'refunded'];
                    
                    if (!showStatuses.includes(status)) return;
                    
                    const isRefundStatus = status === 'refund_processing' || status === 'refunded';
                    
                    notifications.push({
                        id: `return-${returnReq.id || returnReq._id || Date.now()}`,
                        type: isRefundStatus ? 'refund' : 'return',
                        priority: 'normal',
                        title: isRefundStatus ? 'Refund Update' : 'Return Request',
                        message: isRefundStatus 
                            ? `Refund ${status === 'refunded' ? 'completed' : 'processing'} for ${returnReq.productName || 'item'}`
                            : `${statusLabels[status] || status}: ${returnReq.productName || 'Return request'}`,
                        image: returnReq.productImage || null,
                        createdAt: returnReq.updatedAt || returnReq.date || new Date().toISOString(),
                        route: '/admin/returns',
                        routeState: {
                            returnId: returnReq.id || returnReq._id,
                            highlightReturn: returnReq.id || returnReq._id
                        },
                        read: false,
                        meta: {
                            returnId: returnReq.id || returnReq._id,
                            orderId: returnReq.orderId,
                            productName: returnReq.productName,
                            status: status,
                            refundAmount: returnReq.refundAmount
                        }
                    });
                });
            }
        } catch (error) {
            // Silent fail
        }
        
        return notifications;
    }, []);

    // ============================================================
    // getReadIds
    // ============================================================
    const getReadIds = useCallback(() => {
        const ids = safeJSON(
            localStorage.getItem(READ_NOTIFICATION_KEY),
            []
        );
        return new Set(Array.isArray(ids) ? ids.map(String) : []);
    }, []);

    const persistReadIds = useCallback((ids) => {
        localStorage.setItem(
            READ_NOTIFICATION_KEY,
            JSON.stringify(Array.from(ids))
        );
    }, []);

    // ============================================================
    // Build product notifications
    // ============================================================
    const buildProductNotifications = useCallback(() => {
        const products = (() => {
            const candidateKeys = [
                "products",
                "admin_products",
                "all_products",
                "zamed_products",
                "product_data"
            ];

            for (const key of candidateKeys) {
                const value = safeJSON(localStorage.getItem(key), null);
                if (Array.isArray(value) && value.length) {
                    return value;
                }
                if (Array.isArray(value?.products) && value.products.length) {
                    return value.products;
                }
            }
            return [];
        })();

        const threshold = parseNumber(
            safeJSON(localStorage.getItem("site_settings"), {})?.lowStockThreshold
        ) || 5;

        return products
            .map((product, index) => {
                const stock = getProductStock(product);
                if (stock > threshold) return null;

                const id = getProductId(product, index);
                const name = product.name || product.title || product.productName || "Product";

                return {
                    id: `low-stock-${id}-${stock}`,
                    type: "stock",
                    priority: stock <= 0 ? "critical" : "high",
                    title: stock <= 0 ? "Product out of stock" : "Low stock warning",
                    message: stock <= 0
                        ? `${name} is now out of stock.`
                        : `${name} has only ${stock} item${stock === 1 ? "" : "s"} left.`,
                    image: getProductImage(product),
                    createdAt: product.updatedAt || product.updated_at || product.createdAt || new Date().toISOString(),
                    route: "/admin/products",
                    routeState: { productId: id, highlightProduct: id },
                    read: false,
                    meta: { stock, productId: id, productName: name }
                };
            })
            .filter(Boolean);
    }, []);

    // ============================================================
    // Build order notifications
    // ============================================================
    const buildOrderNotifications = useCallback(() => {
        const globalOrderKeys = ["orders", "admin_orders", "all_orders", "customer_orders"];
        let orders = [];

        for (const key of globalOrderKeys) {
            const data = safeJSON(localStorage.getItem(key), []);
            if (Array.isArray(data) && data.length) {
                orders = [...orders, ...data];
            }
        }

        if (!orders.length) {
            for (let index = 0; index < localStorage.length; index += 1) {
                const key = localStorage.key(index);
                if (!key?.startsWith("orders_")) continue;
                const data = safeJSON(localStorage.getItem(key), []);
                if (Array.isArray(data)) {
                    orders = [...orders, ...data];
                }
            }
        }

        const seen = new Set();

        return orders
            .map((order, index) => {
                const orderId = order.orderNumber || order.orderId || order._id || order.id || index;
                if (seen.has(String(orderId))) return null;
                seen.add(String(orderId));

                const customerName = order.customerName || order.customer?.name || order.email || order.customerEmail || "Customer";
                const productImage = order.items?.[0]?.image || order.items?.[0]?.product?.image || order.products?.[0]?.image || null;
                const total = parseNumber(order.total) || parseNumber(order.grandTotal) || parseNumber(order.totalAmount);
                const status = order.status || order.orderStatus || 'pending';

                if (!['pending', 'processing', 'paid'].includes(status)) return null;

                return {
                    id: `order-${orderId}`,
                    type: "order",
                    priority: "normal",
                    title: "New order",
                    message: `${customerName} placed order #${orderId}${total ? ` worth ${total.toFixed(2)}` : ""}.`,
                    image: productImage,
                    createdAt: order.createdAt || order.orderDate || order.date || order.placedAt || new Date().toISOString(),
                    route: "/admin/orders",
                    routeState: { orderId, highlightOrder: orderId },
                    read: false,
                    meta: { orderId }
                };
            })
            .filter(Boolean);
    }, []);

    // ============================================================
    // Build customer notifications
    // ============================================================
    const buildCustomerNotifications = useCallback(() => {
        const customers = safeJSON(localStorage.getItem("admin_customers"), []);
        if (!Array.isArray(customers)) return [];

        const now = Date.now();
        const recentThreshold = 7 * 24 * 60 * 60 * 1000;

        return customers
            .filter((customer, index) => {
                const joinedAt = customer.createdAt || customer.created_at || customer.registeredAt || 
                                customer.joinedAt || customer.joinDate || customer.dateJoined || null;
                if (!joinedAt) return false;
                const date = normalizeDate(joinedAt);
                return date && (now - date.getTime()) < recentThreshold;
            })
            .map((customer, index) => {
                const id = customer._id || customer.id || customer.email || index;
                const name = customer.name || customer.fullName || 
                    `${customer.firstName || ""} ${customer.lastName || ""}`.trim() || 
                    customer.email || "New customer";
                const joinedAt = customer.createdAt || customer.created_at || customer.registeredAt || 
                               customer.joinedAt || customer.joinDate || customer.dateJoined || new Date().toISOString();

                return {
                    id: `customer-${id}-${joinedAt}`,
                    type: "customer",
                    priority: "normal",
                    title: "New customer registered",
                    message: `${name} created a customer account${customer.email ? ` (${customer.email})` : ""}.`,
                    image: customer.profileImage || customer.avatar || customer.image || null,
                    createdAt: joinedAt,
                    route: "/admin/customers",
                    routeState: { customerEmail: customer.email, highlightCustomer: customer.email },
                    read: false,
                    meta: { email: customer.email, customerName: name }
                };
            })
            .slice(0, 20);
    }, []);

    // ============================================================
    // Build contact notifications
    // ============================================================
    const buildContactNotifications = useCallback(() => {
        const messages = safeJSON(localStorage.getItem(CUSTOMER_MESSAGE_KEY), []);
        if (!Array.isArray(messages)) return [];

        return messages
            .filter(msg => !msg.read)
            .slice(0, 20)
            .map((message, index) => ({
                id: `contact-${message.id || message._id || index}-${message.createdAt || ""}`,
                type: "message",
                priority: "normal",
                title: "New customer enquiry",
                message: `${message.name || "Customer"}: ${String(message.message || "Sent a new message").slice(0, 120)}`,
                image: message.image || message.avatar || null,
                createdAt: message.createdAt || message.date || new Date().toISOString(),
                route: "/admin/customers",
                routeState: { openCustomerMessage: message.id || message._id || index, customerEmail: message.email },
                read: Boolean(message.read),
                meta: { sender: message.name, email: message.email, fullMessage: message.message }
            }));
    }, []);

    // ============================================================
    // Main notification loader
    // ============================================================
    const loadAllNotifications = useCallback(async (force = false) => {
        if (notificationLoading && !force) return;
        if (!isMountedRef.current) return;
        
        setNotificationLoading(true);

        try {
            const readIds = getReadIds();

            const stored = safeJSON(localStorage.getItem(LOCAL_NOTIFICATION_KEY), []);
            const storedNotifications = Array.isArray(stored) ? stored : [];

            const productNotifs = buildProductNotifications();
            const orderNotifs = buildOrderNotifications();
            const customerNotifs = buildCustomerNotifications();
            const contactNotifs = buildContactNotifications();
            const returnNotifs = loadReturnAndRefundNotifications();

            const mergedMap = new Map();

            storedNotifications.forEach(notif => {
                if (notif?.id) {
                    mergedMap.set(String(notif.id), { ...notif });
                }
            });

            const allGenerated = [...productNotifs, ...orderNotifs, ...customerNotifs, ...contactNotifs, ...returnNotifs];
            allGenerated.forEach(notif => {
                if (notif?.id) {
                    const id = String(notif.id);
                    const existing = mergedMap.get(id);
                    mergedMap.set(id, existing ? { ...existing, ...notif } : notif);
                }
            });

            const token = getToken();
            if (token && (force || initialLoadDone.current)) {
                try {
                    const response = await debouncedFetch(
                        `${API_URL}/notifications/admin`,
                        { headers: { Authorization: `Bearer ${token}` } },
                        60000
                    );

                    if (response && isMountedRef.current) {
                        const items = response.notifications || response.data?.notifications || response.data || [];
                        if (Array.isArray(items)) {
                            items.forEach(item => {
                                const notif = {
                                    id: String(item.id || item._id),
                                    type: item.type || 'activity',
                                    priority: item.priority || 'normal',
                                    title: item.title || 'Notification',
                                    message: item.message || '',
                                    image: item.image || item.productImage || null,
                                    createdAt: item.createdAt || item.date || new Date().toISOString(),
                                    route: item.route || item.link || '/admin/dashboard',
                                    routeState: item.routeState || item.state || {},
                                    read: Boolean(item.read),
                                    meta: item.meta || {}
                                };
                                if (notif?.id) {
                                    const id = String(notif.id);
                                    const existing = mergedMap.get(id);
                                    mergedMap.set(id, existing ? { ...existing, ...notif } : notif);
                                }
                            });
                        }
                    }
                } catch (apiError) {
                    if (!apiError.message?.includes('Rate limit')) {
                        console.warn('API notification fetch failed:', apiError.message);
                    }
                }
            }

            if (!isMountedRef.current) return;

            const merged = Array.from(mergedMap.values())
                .map(notification => ({
                    ...notification,
                    read: Boolean(notification.read) || readIds.has(String(notification.id))
                }))
                .sort((a, b) => {
                    const aTime = normalizeDate(a.createdAt)?.getTime() || 0;
                    const bTime = normalizeDate(b.createdAt)?.getTime() || 0;
                    return bTime - aTime;
                });

            setNotifications(merged);

            try {
                localStorage.setItem(
                    LOCAL_NOTIFICATION_KEY,
                    JSON.stringify(
                        merged.slice(0, 200).map(n => ({
                            ...n,
                            image: typeof n.image === 'string' && n.image.length < 500000 ? n.image : null
                        }))
                    )
                );
            } catch (cacheError) {
                // Silent fail
            }

        } catch (error) {
            // Silent fail
        } finally {
            if (isMountedRef.current) {
                setNotificationLoading(false);
                initialLoadDone.current = true;
            }
        }
    }, [
        getReadIds, 
        buildProductNotifications, 
        buildOrderNotifications, 
        buildCustomerNotifications, 
        buildContactNotifications,
        loadReturnAndRefundNotifications,
        getToken,
        notificationLoading
    ]);

    // ============================================================
    // Mark as read
    // ============================================================
    const markAsRead = useCallback(async (notifId) => {
        const id = String(notifId);
        const readIds = getReadIds();
        readIds.add(id);
        persistReadIds(readIds);

        setNotifications((current) =>
            current.map((notification) =>
                String(notification.id) === id
                    ? { ...notification, read: true }
                    : notification
            )
        );

        try {
            const token = getToken();
            if (token && !id.startsWith("low-stock-") && !id.startsWith("customer-") &&
                !id.startsWith("contact-") && !id.startsWith("order-") && !id.startsWith("return-") && !id.startsWith("refund-")) {
                await fetch(
                    `${API_URL}/notifications/${encodeURIComponent(id)}/read`,
                    {
                        method: "PUT",
                        headers: { Authorization: `Bearer ${token}` }
                    }
                );
            }
        } catch {
            // Local read state already saved
        }
    }, [getReadIds, persistReadIds, getToken]);

    // ============================================================
    // Mark all as read
    // ============================================================
    const markAllAsRead = useCallback(async () => {
        const readIds = getReadIds();
        notifications.forEach((notification) => {
            readIds.add(String(notification.id));
        });
        persistReadIds(readIds);

        setNotifications((current) =>
            current.map((notification) => ({
                ...notification,
                read: true
            }))
        );

        try {
            const token = getToken();
            if (token) {
                await fetch(`${API_URL}/notifications/read-all`, {
                    method: "PUT",
                    headers: { Authorization: `Bearer ${token}` }
                });
            }
        } catch {
            // Local read state is enough
        }

        toast.success("All notifications marked as read");
    }, [getReadIds, persistReadIds, notifications, getToken]);

    // ============================================================
    // Clear all notifications
    // ============================================================
    const clearAllNotifications = useCallback(async () => {
        if (!window.confirm("Clear the notification history?")) {
            return;
        }

        const readIds = getReadIds();
        notifications.forEach((notification) => {
            readIds.add(String(notification.id));
        });
        persistReadIds(readIds);
        localStorage.setItem(LOCAL_NOTIFICATION_KEY, JSON.stringify([]));
        setNotifications([]);

        try {
            const token = getToken();
            if (token) {
                await fetch(`${API_URL}/notifications/clear`, {
                    method: "DELETE",
                    headers: { Authorization: `Bearer ${token}` }
                });
            }
        } catch {
            // Local clear is already applied
        }

        toast.success("Notification history cleared");
    }, [getReadIds, persistReadIds, notifications, getToken]);

    // ============================================================
    // Open notification
    // ============================================================
    const openNotification = useCallback(async (notification) => {
        await markAsRead(notification.id);
        setShowNotifications(false);

        if (notification.route) {
            navigate(notification.route, {
                state: {
                    ...(notification.routeState || {}),
                    notification: {
                        id: notification.id,
                        type: notification.type,
                        meta: notification.meta
                    }
                }
            });
        }
    }, [markAsRead, navigate]);

    // ============================================================
    // Auth check
    // ============================================================
    const checkAuth = useCallback(() => {
        let storedAdminRaw = localStorage.getItem("admin");
        
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
                    }
                } catch (e) {
                    // Silent fail
                }
            }
        }
        
        if (!storedAdminRaw) {
            navigate("/login");
            return;
        }

        const storedAdmin = getStoredAdminIdentity();
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

        setLoading(false);
    }, [getStoredAdminIdentity, navigate]);

    // ============================================================
    // Load site name
    // ============================================================
    const loadSiteName = useCallback(() => {
        const siteInfo = safeJSON(localStorage.getItem("site_info"), {});
        const siteSettings = safeJSON(localStorage.getItem("site_settings"), {});
        const name = siteInfo.siteName || siteSettings.siteName || "ZAMED";
        setSiteName(name);
        document.title = `${name} - Admin Dashboard`;
    }, []);

    // ============================================================
    // Toggle dark mode
    // ============================================================
    const toggleDarkMode = useCallback(() => {
        const next = !darkMode;
        setDarkMode(next);
        localStorage.setItem("admin_dark_mode", String(next));
        document.documentElement.classList.toggle("dark", next);
    }, [darkMode]);

    // ============================================================
    // Toggle sidebar
    // ============================================================
    const toggleSidebar = useCallback(() => {
        if (isMobile) {
            setIsMobileSidebarOpen((current) => !current);
        } else {
            setIsSidebarOpen((current) => !current);
        }
    }, [isMobile]);

    // ============================================================
    // Force refresh
    // ============================================================
    const forceRefresh = useCallback(() => {
        loadAllNotifications(true);
        loadSiteName();
        toast.success("Admin panel refreshed");
    }, [loadAllNotifications, loadSiteName]);

    // ============================================================
    // Logout
    // ============================================================
    const handleLogout = useCallback(() => {
        localStorage.removeItem("admin");
        localStorage.removeItem("adminToken");
        localStorage.removeItem("admin_token");
        toast.success("Admin logged out successfully");
        navigate("/login");
    }, [navigate]);

    // ============================================================
    // Get notification icon
    // ============================================================
    const getNotificationIcon = useCallback((notification) => {
        if (notification.type === "stock") {
            return <FiAlertTriangle className="text-orange-500" />;
        }
        if (notification.type === "customer") {
            return <FiUsers className="text-blue-500" />;
        }
        if (notification.type === "message") {
            return <FiMessageSquare className="text-violet-500" />;
        }
        if (notification.type === "order") {
            return <FiShoppingBag className="text-emerald-500" />;
        }
        if (notification.type === "return") {
            return <FiShield className="text-yellow-500" />;
        }
        if (notification.type === "refund") {
            return <FiDollarSign className="text-green-500" />;
        }
        return <FiBell className="text-gray-500" />;
    }, []);

    // ============================================================
    // Get role badge color
    // ============================================================
    const getRoleBadgeColor = useCallback(() => {
        const role = getStoredAdminIdentity().role;
        if (role === "super_admin") {
            return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400";
        }
        if (role === "admin") {
            return "bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400";
        }
        if (role === "editor") {
            return "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400";
        }
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
    }, [getStoredAdminIdentity]);

    // ============================================================
    // Filtered notifications - MOVED BEFORE CONDITIONAL RETURN
    // ============================================================
    const filteredNotifications = useMemo(() => {
        if (notificationFilter === "all") return notifications;
        if (notificationFilter === "unread") return notifications.filter(n => !n.read);
        return notifications.filter(n => n.type === notificationFilter);
    }, [notifications, notificationFilter]);

    // ============================================================
    // Unread count - MOVED BEFORE CONDITIONAL RETURN
    // ============================================================
    const unreadCount = useMemo(() => 
        notifications.filter(n => !n.read).length,
        [notifications]
    );

    // ============================================================
    // Sidebar Content - MOVED BEFORE CONDITIONAL RETURN
    // ============================================================
    const SidebarContent = useCallback(() => (
        <div className="flex h-full flex-col">
            <div className="flex items-center justify-between border-b border-white/[0.07] p-4">
                <div>
                    <h1 className="text-lg font-black tracking-wide sm:text-xl">
                        {adminPanelName}
                    </h1>
                    <p className="mt-0.5 text-xs text-gray-500">
                        {adminPanelSubtitle}
                    </p>
                </div>
                <button
                    onClick={toggleSidebar}
                    className="rounded-xl p-2 text-gray-400 transition hover:bg-white/10 hover:text-white"
                >
                    <FiX size={20} />
                </button>
            </div>

            <nav className="flex-1 overflow-y-auto px-3 py-5">
                <div className="space-y-1">
                    {filteredMenuItems.map((item) => {
                        const Icon = item.icon;
                        const isActive =
                            location.pathname === item.path ||
                            location.pathname.startsWith(`${item.path}/`);

                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={`flex items-center rounded-xl px-3.5 py-3 text-sm font-medium transition ${
                                    isActive
                                        ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-950/20"
                                        : "text-gray-400 hover:bg-white/[0.06] hover:text-white"
                                }`}
                            >
                                <Icon size={19} />
                                <span className="ml-3">{item.label}</span>
                            </Link>
                        );
                    })}
                </div>
            </nav>

            <div className="border-t border-white/[0.07] p-3">
                <button
                    onClick={() => window.open("/", "_blank", "noopener,noreferrer")}
                    className="mb-2 flex w-full items-center rounded-xl px-3.5 py-3 text-sm font-medium text-gray-400 transition hover:bg-white/[0.06] hover:text-white"
                >
                    <FiExternalLink size={19} />
                    <span className="ml-3">View Store</span>
                </button>

                <button
                    onClick={toggleDarkMode}
                    className="flex w-full items-center rounded-xl px-3.5 py-3 text-sm font-medium text-gray-400 transition hover:bg-white/[0.06] hover:text-white"
                >
                    {darkMode ? <FiSun size={19} /> : <FiMoon size={19} />}
                    <span className="ml-3">{darkMode ? "Light Mode" : "Dark Mode"}</span>
                </button>

                <button
                    onClick={handleLogout}
                    className="flex w-full items-center rounded-xl px-3.5 py-3 text-sm font-medium text-red-400 transition hover:bg-red-500/10"
                >
                    <FiLogOut size={19} />
                    <span className="ml-3">Logout</span>
                </button>
            </div>
        </div>
    ), [filteredMenuItems, location.pathname, toggleSidebar, toggleDarkMode, darkMode, handleLogout]);

    // ============================================================
    // Main initialization effect
    // ============================================================
    useEffect(() => {
        isMountedRef.current = true;
        
        checkAuth();
        loadSiteName();
        
        setTimeout(() => {
            if (isMountedRef.current) {
                loadAllNotifications(true);
            }
        }, 1000);

        const savedTheme = localStorage.getItem("admin_dark_mode");
        if (savedTheme === "true") {
            setDarkMode(true);
            document.documentElement.classList.add("dark");
        }

        const refreshEvents = [
            "productsUpdated",
            "inventoryUpdated",
            "ordersUpdated",
            "customersUpdated",
            "customerRegistered",
            "returnsUpdated",
            "orderRefunded",
            "storage"
        ];

        const refreshNotifications = () => {
            if (isMountedRef.current) {
                loadAllNotifications(true);
            }
        };

        refreshEvents.forEach((eventName) => {
            window.addEventListener(eventName, refreshNotifications);
        });

        notificationIntervalRef.current = window.setInterval(() => {
            if (isMountedRef.current) {
                loadAllNotifications(false);
            }
        }, 60000);

        return () => {
            isMountedRef.current = false;
            
            refreshEvents.forEach((eventName) => {
                window.removeEventListener(eventName, refreshNotifications);
            });
            
            if (notificationIntervalRef.current) {
                window.clearInterval(notificationIntervalRef.current);
                notificationIntervalRef.current = null;
            }
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ============================================================
    // LOADING STATE - AFTER ALL HOOKS
    // ============================================================
    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gray-100 dark:bg-gray-900">
                <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-orange-500" />
            </div>
        );
    }

    // ============================================================
    // Main render
    // ============================================================
    return (
        <div className={`min-h-screen ${darkMode ? "dark bg-gray-950" : "bg-[#f7f8fb]"}`}>
            {/* DESKTOP SIDEBAR */}
            {!isMobile && (
                <aside
                    className={`fixed inset-y-0 left-0 z-50 bg-[#07111f] text-white shadow-xl transition-all duration-300 ${
                        isSidebarOpen ? "w-64" : "w-20"
                    }`}
                >
                    {isSidebarOpen ? (
                        <SidebarContent />
                    ) : (
                        <div className="flex h-full flex-col items-center py-4">
                            <button
                                onClick={toggleSidebar}
                                className="mb-5 rounded-xl p-3 text-gray-400 transition hover:bg-white/10 hover:text-white"
                            >
                                <FiMenu size={20} />
                            </button>

                            <div className="flex-1 space-y-2">
                                {filteredMenuItems.map((item) => {
                                    const Icon = item.icon;
                                    const isActive =
                                        location.pathname === item.path ||
                                        location.pathname.startsWith(`${item.path}/`);

                                    return (
                                        <Link
                                            key={item.path}
                                            to={item.path}
                                            title={item.label}
                                            className={`flex h-11 w-11 items-center justify-center rounded-xl transition ${
                                                isActive
                                                    ? "bg-orange-500 text-white shadow-lg shadow-orange-950/30"
                                                    : "text-gray-400 hover:bg-white/10 hover:text-white"
                                            }`}
                                        >
                                            <Icon size={20} />
                                        </Link>
                                    );
                                })}
                            </div>

                            <button
                                onClick={toggleDarkMode}
                                className="mb-2 flex h-11 w-11 items-center justify-center rounded-xl text-gray-400 hover:bg-white/10 hover:text-white"
                            >
                                {darkMode ? <FiSun size={20} /> : <FiMoon size={20} />}
                            </button>

                            <button
                                onClick={handleLogout}
                                className="flex h-11 w-11 items-center justify-center rounded-xl text-red-400 hover:bg-red-500/10"
                            >
                                <FiLogOut size={20} />
                            </button>
                        </div>
                    )}
                </aside>
            )}

            {/* MOBILE SIDEBAR */}
            <AnimatePresence>
                {isMobile && isMobileSidebarOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
                            onClick={() => setIsMobileSidebarOpen(false)}
                        />
                        <motion.aside
                            initial={{ x: -280 }}
                            animate={{ x: 0 }}
                            exit={{ x: -280 }}
                            transition={{ type: "spring", damping: 25, stiffness: 250 }}
                            className="fixed inset-y-0 left-0 z-50 w-72 bg-[#07111f] text-white shadow-2xl"
                        >
                            <SidebarContent />
                        </motion.aside>
                    </>
                )}
            </AnimatePresence>

            {/* MAIN */}
            <div
                className={`transition-all duration-300 ${
                    !isMobile && isSidebarOpen
                        ? "ml-64"
                        : !isMobile
                        ? "ml-20"
                        : "ml-0"
                }`}
            >
                {/* TOPBAR */}
                <header
                    className={`sticky top-0 z-30 border-b backdrop-blur-xl ${
                        darkMode
                            ? "border-gray-800 bg-gray-900/90"
                            : "border-gray-200/80 bg-white/90"
                    }`}
                >
                    <div className="flex min-h-[72px] items-center justify-between gap-3 px-3 sm:px-6">
                        <div className="flex min-w-0 items-center gap-3">
                            <button
                                onClick={toggleSidebar}
                                className={`rounded-xl p-2.5 transition ${
                                    darkMode
                                        ? "text-gray-300 hover:bg-gray-800"
                                        : "text-gray-600 hover:bg-gray-100"
                                }`}
                            >
                                <FiMenu size={20} />
                            </button>

                            <div className="min-w-0">
                                <h2
                                    className={`truncate text-sm font-bold sm:text-lg ${
                                        darkMode ? "text-white" : "text-gray-900"
                                    }`}
                                >
                                    {adminName}
                                </h2>
                                <p
                                    className={`hidden truncate text-xs sm:block ${
                                        darkMode ? "text-gray-500" : "text-gray-400"
                                    }`}
                                >
                                    {siteName} · {adminRole}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-1.5 sm:gap-2">
                            <button
                                onClick={forceRefresh}
                                className={`rounded-xl p-2.5 transition ${
                                    darkMode
                                        ? "text-gray-400 hover:bg-gray-800"
                                        : "text-gray-500 hover:bg-gray-100"
                                }`}
                                title="Refresh activity"
                            >
                                <FiRefreshCw size={19} />
                            </button>

                            {/* NOTIFICATION CENTER */}
                            <div className="relative" ref={notificationRef}>
                                <button
                                    onClick={() => {
                                        setShowNotifications((current) => !current);
                                        setShowProfileMenu(false);
                                        if (!showNotifications) {
                                            loadAllNotifications(true);
                                        }
                                    }}
                                    className={`relative rounded-xl p-2.5 transition ${
                                        darkMode
                                            ? "text-gray-400 hover:bg-gray-800"
                                            : "text-gray-500 hover:bg-gray-100"
                                    }`}
                                    aria-label="Notifications"
                                >
                                    <FiBell size={20} />
                                    {unreadCount > 0 && (
                                        <motion.span
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            className="absolute -right-0.5 -top-0.5 flex min-h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-black text-white ring-2 ring-white dark:ring-gray-900"
                                        >
                                            {unreadCount > 99 ? "99+" : unreadCount}
                                        </motion.span>
                                    )}
                                </button>

                                <AnimatePresence>
                                    {showNotifications && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -8, scale: 0.97 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: -8, scale: 0.97 }}
                                            transition={{ duration: 0.18 }}
                                            className={`absolute right-[-54px] mt-3 w-[min(94vw,430px)] overflow-hidden rounded-3xl border shadow-[0_25px_80px_rgba(0,0,0,.22)] sm:right-0 ${
                                                darkMode
                                                    ? "border-gray-700 bg-gray-900"
                                                    : "border-gray-200 bg-white"
                                            }`}
                                        >
                                            {/* Header */}
                                            <div
                                                className={`border-b p-5 ${
                                                    darkMode ? "border-gray-800" : "border-gray-100"
                                                }`}
                                            >
                                                <div className="flex items-start justify-between gap-4">
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <h3
                                                                className={`text-lg font-black ${
                                                                    darkMode ? "text-white" : "text-gray-900"
                                                                }`}
                                                            >
                                                                Notifications
                                                            </h3>
                                                            {unreadCount > 0 && (
                                                                <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-black text-red-600 dark:bg-red-500/10 dark:text-red-400">
                                                                    {unreadCount} new
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p
                                                            className={`mt-1 text-xs ${
                                                                darkMode ? "text-gray-500" : "text-gray-400"
                                                            }`}
                                                        >
                                                            Store activity, stock alerts, returns and refunds
                                                        </p>
                                                    </div>
                                                    <button
                                                        onClick={() => setShowNotifications(false)}
                                                        className={`rounded-xl p-2 ${
                                                            darkMode
                                                                ? "text-gray-500 hover:bg-gray-800"
                                                                : "text-gray-400 hover:bg-gray-100"
                                                        }`}
                                                    >
                                                        <FiX />
                                                    </button>
                                                </div>

                                                <div className="mt-4 flex items-center justify-between gap-2">
                                                    <div className="flex min-w-0 gap-1 overflow-x-auto">
                                                        {[
                                                            ["all", "All"],
                                                            ["unread", "Unread"],
                                                            ["stock", "Stock"],
                                                            ["customer", "Customers"],
                                                            ["message", "Messages"],
                                                            ["order", "Orders"],
                                                            ["return", "Returns"],
                                                            ["refund", "Refunds"]
                                                        ].map(([value, label]) => (
                                                            <button
                                                                key={value}
                                                                onClick={() => setNotificationFilter(value)}
                                                                className={`whitespace-nowrap rounded-full px-3 py-1.5 text-[11px] font-bold transition ${
                                                                    notificationFilter === value
                                                                        ? "bg-orange-500 text-white"
                                                                        : darkMode
                                                                        ? "bg-gray-800 text-gray-400 hover:text-white"
                                                                        : "bg-gray-100 text-gray-500 hover:text-gray-800"
                                                                }`}
                                                            >
                                                                {label}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Action bar */}
                                            <div
                                                className={`flex items-center justify-between border-b px-5 py-3 ${
                                                    darkMode
                                                        ? "border-gray-800 bg-gray-950/30"
                                                        : "border-gray-100 bg-gray-50/70"
                                                }`}
                                            >
                                                <button
                                                    onClick={markAllAsRead}
                                                    disabled={unreadCount === 0}
                                                    className="flex items-center gap-1.5 text-xs font-bold text-blue-600 disabled:cursor-not-allowed disabled:opacity-40 dark:text-blue-400"
                                                >
                                                    <FiCheckCircle />
                                                    Mark all as read
                                                </button>
                                                <button
                                                    onClick={clearAllNotifications}
                                                    className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 transition hover:text-red-500"
                                                >
                                                    <FiTrash2 size={14} />
                                                    Clear history
                                                </button>
                                            </div>

                                            {/* List */}
                                            <div className="max-h-[520px] overflow-y-auto">
                                                {notificationLoading && filteredNotifications.length === 0 ? (
                                                    <div className="px-6 py-14 text-center">
                                                        <div
                                                            className={`mx-auto flex h-14 w-14 items-center justify-center rounded-2xl ${
                                                                darkMode ? "bg-gray-800" : "bg-gray-100"
                                                            }`}
                                                        >
                                                            <FiRefreshCw className="animate-spin text-gray-400" size={24} />
                                                        </div>
                                                        <p className={`mt-4 font-bold ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                                                            Loading notifications...
                                                        </p>
                                                    </div>
                                                ) : filteredNotifications.length === 0 ? (
                                                    <div className="px-6 py-14 text-center">
                                                        <div
                                                            className={`mx-auto flex h-14 w-14 items-center justify-center rounded-2xl ${
                                                                darkMode ? "bg-gray-800 text-gray-500" : "bg-gray-100 text-gray-400"
                                                            }`}
                                                        >
                                                            <FiBell size={24} />
                                                        </div>
                                                        <p className={`mt-4 font-bold ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                                                            No notifications
                                                        </p>
                                                        <p className={`mt-1 text-xs ${darkMode ? "text-gray-600" : "text-gray-400"}`}>
                                                            New store activity will appear here.
                                                        </p>
                                                    </div>
                                                ) : (
                                                    filteredNotifications.map((notification) => (
                                                        <button
                                                            type="button"
                                                            key={notification.id}
                                                            onClick={() => openNotification(notification)}
                                                            className={`group relative flex w-full gap-3 border-b px-4 py-4 text-left transition last:border-0 ${
                                                                darkMode
                                                                    ? "border-gray-800 hover:bg-gray-800/70"
                                                                    : "border-gray-100 hover:bg-gray-50"
                                                            } ${
                                                                !notification.read
                                                                    ? darkMode
                                                                        ? "bg-orange-500/[0.04]"
                                                                        : "bg-orange-50/40"
                                                                    : ""
                                                            }`}
                                                        >
                                                            {!notification.read && (
                                                                <span className="absolute left-1.5 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-orange-500" />
                                                            )}

                                                            {/* Image / Icon */}
                                                            <div className="ml-1 shrink-0">
                                                                {notification.image ? (
                                                                    <div className="relative">
                                                                        <img
                                                                            src={notification.image}
                                                                            alt=""
                                                                            className="h-12 w-12 rounded-xl border border-gray-100 bg-white object-cover dark:border-gray-700"
                                                                            onError={(event) => {
                                                                                event.currentTarget.style.display = "none";
                                                                            }}
                                                                        />
                                                                        <span
                                                                            className={`absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border-2 text-[10px] ${
                                                                                darkMode
                                                                                    ? "border-gray-900 bg-gray-800"
                                                                                    : "border-white bg-white"
                                                                            }`}
                                                                        >
                                                                            {getNotificationIcon(notification)}
                                                                        </span>
                                                                    </div>
                                                                ) : (
                                                                    <div
                                                                        className={`flex h-12 w-12 items-center justify-center rounded-xl ${
                                                                            notification.type === "stock"
                                                                                ? "bg-orange-50 dark:bg-orange-500/10"
                                                                                : notification.type === "customer"
                                                                                ? "bg-blue-50 dark:bg-blue-500/10"
                                                                                : notification.type === "message"
                                                                                ? "bg-violet-50 dark:bg-violet-500/10"
                                                                                : notification.type === "order"
                                                                                ? "bg-emerald-50 dark:bg-emerald-500/10"
                                                                                : notification.type === "return"
                                                                                ? "bg-yellow-50 dark:bg-yellow-500/10"
                                                                                : notification.type === "refund"
                                                                                ? "bg-green-50 dark:bg-green-500/10"
                                                                                : "bg-gray-100 dark:bg-gray-800"
                                                                        }`}
                                                                    >
                                                                        {getNotificationIcon(notification)}
                                                                    </div>
                                                                )}
                                                            </div>

                                                            <div className="min-w-0 flex-1">
                                                                <div className="flex items-start justify-between gap-2">
                                                                    <p
                                                                        className={`text-sm ${
                                                                            !notification.read ? "font-black" : "font-semibold"
                                                                        } ${
                                                                            darkMode ? "text-gray-100" : "text-gray-900"
                                                                        }`}
                                                                    >
                                                                        {notification.title}
                                                                    </p>
                                                                    <FiChevronRight
                                                                        className={`mt-1 shrink-0 transition group-hover:translate-x-0.5 ${
                                                                            darkMode ? "text-gray-600" : "text-gray-300"
                                                                        }`}
                                                                    />
                                                                </div>

                                                                <p
                                                                    className={`mt-1 line-clamp-2 text-xs leading-5 ${
                                                                        darkMode ? "text-gray-400" : "text-gray-500"
                                                                    }`}
                                                                >
                                                                    {notification.message}
                                                                </p>

                                                                <div className="mt-2 flex items-center gap-2 flex-wrap">
                                                                    <span
                                                                        className={`flex items-center gap-1 text-[10px] ${
                                                                            darkMode ? "text-gray-600" : "text-gray-400"
                                                                        }`}
                                                                    >
                                                                        <FiClock />
                                                                        {formatNotificationDate(notification.createdAt)}
                                                                    </span>

                                                                    <span
                                                                        className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${
                                                                            notification.type === "stock"
                                                                                ? "bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400"
                                                                                : notification.type === "customer"
                                                                                ? "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400"
                                                                                : notification.type === "message"
                                                                                ? "bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400"
                                                                                : notification.type === "order"
                                                                                ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
                                                                                : notification.type === "return"
                                                                                ? "bg-yellow-50 text-yellow-600 dark:bg-yellow-500/10 dark:text-yellow-400"
                                                                                : notification.type === "refund"
                                                                                ? "bg-green-50 text-green-600 dark:bg-green-500/10 dark:text-green-400"
                                                                                : "bg-gray-100 text-gray-500 dark:bg-gray-800"
                                                                        }`}
                                                                    >
                                                                        {notification.type}
                                                                    </span>

                                                                    {notification.meta?.status && (
                                                                        <span className="text-[9px] text-gray-400">
                                                                            • {notification.meta.status.replace('_', ' ')}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </button>
                                                    ))
                                                )}
                                            </div>

                                            <div
                                                className={`border-t p-3 text-center ${
                                                    darkMode ? "border-gray-800" : "border-gray-100"
                                                }`}
                                            >
                                                <button
                                                    onClick={() => {
                                                        setShowNotifications(false);
                                                        navigate("/admin/returns");
                                                    }}
                                                    className="text-xs font-bold text-orange-500 hover:text-orange-600"
                                                >
                                                    View all returns & refunds
                                                </button>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            {/* PROFILE */}
                            <div className="relative" ref={profileRef}>
                                <button
                                    onClick={() => {
                                        setShowProfileMenu((current) => !current);
                                        setShowNotifications(false);
                                    }}
                                    className="flex items-center gap-2 rounded-xl p-1.5 transition hover:bg-gray-100 dark:hover:bg-gray-800"
                                >
                                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 text-sm font-black text-white">
                                        {adminName.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="hidden text-left lg:block">
                                        <p
                                            className={`max-w-[130px] truncate text-xs font-bold ${
                                                darkMode ? "text-white" : "text-gray-800"
                                            }`}
                                        >
                                            {adminName}
                                        </p>
                                        <p className="text-[10px] text-gray-400">{adminRole}</p>
                                    </div>
                                </button>

                                <AnimatePresence>
                                    {showProfileMenu && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -8, scale: 0.97 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: -8, scale: 0.97 }}
                                            className={`absolute right-0 mt-3 w-64 overflow-hidden rounded-2xl border shadow-xl ${
                                                darkMode
                                                    ? "border-gray-700 bg-gray-900"
                                                    : "border-gray-200 bg-white"
                                            }`}
                                        >
                                            <div
                                                className={`border-b p-4 ${
                                                    darkMode ? "border-gray-800" : "border-gray-100"
                                                }`}
                                            >
                                                <p className={`font-bold ${darkMode ? "text-white" : "text-gray-900"}`}>
                                                    {adminName}
                                                </p>
                                                <p className="mt-1 truncate text-xs text-gray-400">
                                                    {getStoredAdminIdentity().email || "admin@example.com"}
                                                </p>
                                                <span
                                                    className={`mt-2 inline-block rounded-full px-2 py-1 text-[10px] font-bold ${getRoleBadgeColor()}`}
                                                >
                                                    {adminRole}
                                                </span>
                                            </div>
                                            <div className="p-2">
                                                <button
                                                    onClick={() => {
                                                        setShowProfileMenu(false);
                                                        navigate("/admin/settings");
                                                    }}
                                                    className={`flex w-full items-center rounded-xl px-3 py-2.5 text-left text-sm ${
                                                        darkMode
                                                            ? "text-gray-300 hover:bg-gray-800"
                                                            : "text-gray-700 hover:bg-gray-100"
                                                    }`}
                                                >
                                                    <FiUser className="mr-2" />
                                                    Profile Settings
                                                </button>
                                                <button
                                                    onClick={handleLogout}
                                                    className={`flex w-full items-center rounded-xl px-3 py-2.5 text-left text-sm text-red-500 ${
                                                        darkMode
                                                            ? "hover:bg-gray-800"
                                                            : "hover:bg-red-50"
                                                    }`}
                                                >
                                                    <FiLogOut className="mr-2" />
                                                    Logout
                                                </button>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>
                    </div>
                </header>

                <main className="p-3 sm:p-6">
                    <Outlet
                        context={{
                            darkMode,
                            notifications,
                            unreadCount,
                            refreshNotifications: loadAllNotifications
                        }}
                    />
                </main>
            </div>
        </div>
    );
};

export default AdminLayout;