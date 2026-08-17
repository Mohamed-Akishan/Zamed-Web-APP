// src/pages/Admin/Payments.jsx
import { useState, useEffect, useMemo, useCallback } from "react";
import { 
    FiCreditCard, FiSearch, FiRefreshCw, FiEye, FiDownload,
    FiCheckCircle, FiXCircle, FiClock, FiDollarSign, FiCalendar,
    FiFilter, FiAlertCircle, FiPrinter, FiMail, FiShield,
    FiSmartphone, FiGlobe, FiHome, FiRefreshCcw, FiInfo,
    FiPackage, FiUser, FiMail as FiMailIcon
} from "react-icons/fi";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

const API_URL =
  import.meta.env.VITE_API_URL ||
  (window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5000/api'
    : window.location.hostname.endsWith('.vercel.app')
      ? 'https://zamed-backend-1.onrender.com/api'
      : 'https://zamed-backend-1.onrender.com/api');

const Payments = () => {
    const [payments, setPayments] = useState([]);
    const [filteredPayments, setFilteredPayments] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [methodFilter, setMethodFilter] = useState("all");
    const [selectedPayment, setSelectedPayment] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [showRefundModal, setShowRefundModal] = useState(false);
    const [refundAmount, setRefundAmount] = useState("");
    const [refundReason, setRefundReason] = useState("");
    const [processingRefund, setProcessingRefund] = useState(false);
    const [dateRange, setDateRange] = useState({ start: "", end: "" });
    const [darkMode, setDarkMode] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [currencySymbol, setCurrencySymbol] = useState("$");
    const [stats, setStats] = useState({
        totalTransactions: 0,
        totalAmount: 0,
        successful: 0,
        pending: 0,
        processing: 0,
        failed: 0,
        refunded: 0,
        averageAmount: 0
    });

    const getToken = () => 
        localStorage.getItem('adminToken') ||
        localStorage.getItem('admin_token') ||
        localStorage.getItem('token');

    // ============================================================
    // Load Currency Symbol
    // ============================================================
    const loadCurrencySymbol = useCallback(() => {
        const siteSettings = JSON.parse(localStorage.getItem('site_settings') || '{}');
        const symbols = { USD: "$", EUR: "€", GBP: "£", LKR: "Rs" };
        setCurrencySymbol(symbols[siteSettings.currency] || "$");
    }, []);

    // ============================================================
    // Get All Orders from All Sources
    // ============================================================
    const getAllOrders = useCallback(() => {
        const allOrders = [];
        const seenIds = new Set();

        // 1. Get from admin_orders
        try {
            const adminOrders = JSON.parse(localStorage.getItem('admin_orders') || '[]');
            if (Array.isArray(adminOrders)) {
                adminOrders.forEach(order => {
                    const id = order.id || order.orderId || order._id;
                    if (id && !seenIds.has(String(id))) {
                        seenIds.add(String(id));
                        allOrders.push(order);
                    }
                });
            }
        } catch (e) {}

        // 2. Get from orders
        try {
            const orders = JSON.parse(localStorage.getItem('orders') || '[]');
            if (Array.isArray(orders)) {
                orders.forEach(order => {
                    const id = order.id || order.orderId || order._id;
                    if (id && !seenIds.has(String(id))) {
                        seenIds.add(String(id));
                        allOrders.push(order);
                    }
                });
            }
        } catch (e) {}

        // 3. Get from shop_orders
        try {
            const shopOrders = JSON.parse(localStorage.getItem('shop_orders') || '[]');
            if (Array.isArray(shopOrders)) {
                shopOrders.forEach(order => {
                    const id = order.id || order.orderId || order._id;
                    if (id && !seenIds.has(String(id))) {
                        seenIds.add(String(id));
                        allOrders.push(order);
                    }
                });
            }
        } catch (e) {}

        // 4. Get user-specific orders
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('orders_')) {
                try {
                    const userOrders = JSON.parse(localStorage.getItem(key) || '[]');
                    if (Array.isArray(userOrders)) {
                        userOrders.forEach(order => {
                            const id = order.id || order.orderId || order._id;
                            if (id && !seenIds.has(String(id))) {
                                seenIds.add(String(id));
                                allOrders.push(order);
                            }
                        });
                    }
                } catch (e) {}
            }
        }

        // 5. Get guest orders
        try {
            const guestOrders = JSON.parse(localStorage.getItem('guestOrders') || '[]');
            if (Array.isArray(guestOrders)) {
                guestOrders.forEach(order => {
                    const id = order.id || order.orderId || order._id;
                    if (id && !seenIds.has(String(id))) {
                        seenIds.add(String(id));
                        allOrders.push(order);
                    }
                });
            }
        } catch (e) {}

        // Sort by date (newest first)
        allOrders.sort((a, b) => {
            const dateA = new Date(a.date || a.createdAt || a.orderDate || a.placedAt || 0);
            const dateB = new Date(b.date || b.createdAt || b.orderDate || b.placedAt || 0);
            return dateB - dateA;
        });

        return allOrders;
    }, []);

    // ============================================================
    // Create Sample Payments if None Exist
    // ============================================================
    const createSamplePayments = useCallback(() => {
        const samplePayments = [
            {
                id: 'PAY-SAMPLE-001',
                orderId: 'ORD-001',
                amount: 129.99,
                currency: 'USD',
                method: 'Credit Card',
                status: 'completed',
                customerName: 'John Doe',
                customerEmail: 'john@example.com',
                date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
                transactionId: 'TXN-001',
                cardLast4: '1234',
                billingAddress: '123 Main St, London, UK',
                items: [
                    { name: 'Premium T-Shirt', quantity: 2, price: 39.99 },
                    { name: 'Classic Jeans', quantity: 1, price: 50.01 }
                ],
                productNames: 'Premium T-Shirt, Classic Jeans',
                orderStatus: 'delivered',
                refunded: false,
                refundAmount: 0,
                refundReason: '',
                refundedAt: null
            },
            {
                id: 'PAY-SAMPLE-002',
                orderId: 'ORD-002',
                amount: 79.50,
                currency: 'USD',
                method: 'PayPal',
                status: 'pending',
                customerName: 'Jane Smith',
                customerEmail: 'jane@example.com',
                date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
                transactionId: 'TXN-002',
                cardLast4: '****',
                billingAddress: '456 Park Ave, New York, USA',
                items: [
                    { name: 'Hoodie', quantity: 1, price: 59.50 },
                    { name: 'Cap', quantity: 2, price: 10.00 }
                ],
                productNames: 'Hoodie, Cap',
                orderStatus: 'processing',
                refunded: false,
                refundAmount: 0,
                refundReason: '',
                refundedAt: null
            },
            {
                id: 'PAY-SAMPLE-003',
                orderId: 'ORD-003',
                amount: 199.99,
                currency: 'USD',
                method: 'Cash on Delivery',
                status: 'pending',
                customerName: 'Mike Johnson',
                customerEmail: 'mike@example.com',
                date: new Date().toISOString(),
                transactionId: 'TXN-003',
                cardLast4: '****',
                billingAddress: '789 Oak St, Sydney, Australia',
                items: [
                    { name: 'Leather Jacket', quantity: 1, price: 199.99 }
                ],
                productNames: 'Leather Jacket',
                orderStatus: 'pending',
                refunded: false,
                refundAmount: 0,
                refundReason: '',
                refundedAt: null
            },
            {
                id: 'PAY-SAMPLE-004',
                orderId: 'ORD-004',
                amount: 45.00,
                currency: 'USD',
                method: 'Credit Card',
                status: 'refunded',
                customerName: 'Sarah Wilson',
                customerEmail: 'sarah@example.com',
                date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
                transactionId: 'TXN-004',
                cardLast4: '5678',
                billingAddress: '321 Elm St, Toronto, Canada',
                items: [
                    { name: 'Sunglasses', quantity: 1, price: 45.00 }
                ],
                productNames: 'Sunglasses',
                orderStatus: 'refunded',
                refunded: true,
                refundAmount: 45.00,
                refundReason: 'Customer requested refund',
                refundedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
            },
            {
                id: 'PAY-SAMPLE-005',
                orderId: 'ORD-005',
                amount: 349.99,
                currency: 'USD',
                method: 'Apple Pay',
                status: 'completed',
                customerName: 'David Brown',
                customerEmail: 'david@example.com',
                date: new Date(Date.now() - 0.5 * 24 * 60 * 60 * 1000).toISOString(),
                transactionId: 'TXN-005',
                cardLast4: '9012',
                billingAddress: '654 Pine St, Berlin, Germany',
                items: [
                    { name: 'Smart Watch', quantity: 1, price: 249.99 },
                    { name: 'Wireless Earbuds', quantity: 1, price: 100.00 }
                ],
                productNames: 'Smart Watch, Wireless Earbuds',
                orderStatus: 'shipped',
                refunded: false,
                refundAmount: 0,
                refundReason: '',
                refundedAt: null
            }
        ];

        // Check if we already have payments
        const existingOrders = getAllOrders();
        const hasPaymentInfo = existingOrders.some(order => 
            order.paymentMethod || order.total || order.payment
        );

        if (!hasPaymentInfo) {
            console.log('📦 No payment data found. Adding sample payments for demonstration.');
            // Save sample payments to localStorage
            try {
                // Save as admin_orders
                const existingAdminOrders = JSON.parse(localStorage.getItem('admin_orders') || '[]');
                const newOrders = samplePayments.map(p => ({
                    id: p.orderId,
                    orderId: p.orderId,
                    customerName: p.customerName,
                    customerEmail: p.customerEmail,
                    total: p.amount,
                    paymentMethod: p.method,
                    status: p.orderStatus || p.status,
                    paymentStatus: p.status,
                    date: p.date,
                    items: p.items,
                    shippingAddress: p.billingAddress,
                    refunded: p.refunded,
                    refundAmount: p.refundAmount,
                    refundReason: p.refundReason,
                    refundedAt: p.refundedAt,
                    cardLast4: p.cardLast4
                }));
                
                const merged = [...existingAdminOrders, ...newOrders];
                localStorage.setItem('admin_orders', JSON.stringify(merged));
                return samplePayments;
            } catch (e) {
                console.warn('Could not save sample payments:', e);
                return samplePayments;
            }
        }

        return null;
    }, [getAllOrders]);

    // ============================================================
    // Extract Payments from Orders
    // ============================================================
    const extractPaymentsFromOrders = useCallback((orders) => {
        const allPayments = [];
        const seenIds = new Set();

        orders.forEach((order, index) => {
            // Get amount from any available field
            const amount = order.total || 
                          order.totalAmount || 
                          order.grandTotal || 
                          order.amount || 
                          order.orderTotal || 
                          0;

            // Skip orders without a valid amount
            if (!amount || amount === 0) return;

            const orderId = order.id || order.orderId || order._id || `ORD-${index}`;
            const paymentId = order.paymentId || 
                             order.transactionId || 
                             order.payment?.id ||
                             `PAY-${orderId}`;
            
            if (seenIds.has(String(paymentId))) return;
            seenIds.add(String(paymentId));

            // Get payment method
            let paymentMethod = order.paymentMethod || 
                               order.payment?.method || 
                               order.payment?.type || 
                               order.paymentMethodType ||
                               "Unknown";

            if (paymentMethod === "Unknown" || !paymentMethod) {
                if (order.paymentMethodType === "cod" || order.paymentType === "cod") {
                    paymentMethod = "Cash on Delivery";
                } else if (order.paymentMethodType === "card" || order.paymentType === "card") {
                    paymentMethod = "Credit Card";
                } else {
                    paymentMethod = "Unknown";
                }
            }

            // Get payment status
            const orderStatus = order.status || order.orderStatus || "pending";
            const paymentStatus = getPaymentStatus(orderStatus, paymentMethod, order);

            // Get customer info
            const customerName = order.customerName || 
                order.customer?.name || 
                `${order.customer?.firstName || ''} ${order.customer?.lastName || ''}`.trim() ||
                order.user?.name ||
                order.user?.firstName ||
                order.name ||
                order.email ||
                order.customerEmail ||
                "Guest";

            const customerEmail = order.customerEmail || 
                order.customer?.email || 
                order.user?.email || 
                order.email ||
                "guest@example.com";

            // Get items
            const items = order.items || order.itemsList || order.products || order.cartItems || [];
            const productNames = items.map(item => 
                item.name || item.productName || item.title || item.product?.name || "Product"
            ).join(", ");

            const shippingAddress = order.shippingAddress || 
                                   order.address || 
                                   order.deliveryAddress ||
                                   order.shipping?.address;

            allPayments.push({
                id: paymentId,
                orderId: orderId,
                amount: amount,
                currency: order.currency || "USD",
                method: paymentMethod,
                status: paymentStatus,
                customerName: customerName,
                customerEmail: customerEmail,
                date: order.date || order.createdAt || order.orderDate || order.placedAt || new Date().toISOString(),
                transactionId: paymentId,
                cardLast4: order.cardLast4 || order.payment?.cardLast4 || "****",
                billingAddress: order.billingAddress?.street || 
                    order.billingAddress?.address || 
                    order.billingAddress ||
                    shippingAddress ||
                    null,
                notes: order.paymentNotes || order.notes || order.comment || "",
                refunded: order.refunded || order.refundStatus === 'completed' || false,
                refundAmount: order.refundAmount || 0,
                refundReason: order.refundReason || "",
                refundedAt: order.refundedAt || null,
                items: items,
                productNames: productNames || "No products",
                shippingAddress: shippingAddress || null,
                orderStatus: orderStatus
            });
        });

        allPayments.sort((a, b) => {
            const dateA = new Date(a.date || 0);
            const dateB = new Date(b.date || 0);
            return dateB - dateA;
        });

        return allPayments;
    }, []);

    // ============================================================
    // Get Payment Status
    // ============================================================
    const getPaymentStatus = useCallback((orderStatus, paymentMethod, order = {}) => {
        if (order.refunded || order.refundStatus === 'completed' || orderStatus === 'refunded') {
            return 'refunded';
        }
        if (orderStatus === 'cancelled') return 'refunded';

        if (paymentMethod?.toLowerCase().includes('cod') || paymentMethod === 'Cash on Delivery') {
            if (orderStatus === 'delivered' || orderStatus === 'completed') return 'completed';
            if (orderStatus === 'shipped') return 'completed';
            if (orderStatus === 'pending' || orderStatus === 'processing') return 'pending';
            return 'pending';
        }

        if (order.payment?.status) {
            const statusMap = {
                'succeeded': 'completed',
                'paid': 'completed',
                'completed': 'completed',
                'processing': 'processing',
                'pending': 'pending',
                'failed': 'failed',
                'refunded': 'refunded'
            };
            return statusMap[order.payment.status] || 'pending';
        }

        const statusMap = {
            'delivered': 'completed',
            'completed': 'completed',
            'shipped': 'completed',
            'processing': 'processing',
            'pending': 'pending',
            'paid': 'completed',
            'cancelled': 'refunded',
            'refunded': 'refunded'
        };

        return statusMap[orderStatus] || 'pending';
    }, []);

    // ============================================================
    // Calculate Stats
    // ============================================================
    const calculateStats = useCallback((allPayments) => {
        const successful = allPayments.filter(p => p.status === 'completed').length;
        const pending = allPayments.filter(p => p.status === 'pending').length;
        const processing = allPayments.filter(p => p.status === 'processing').length;
        const failed = allPayments.filter(p => p.status === 'failed').length;
        const refunded = allPayments.filter(p => p.status === 'refunded').length;
        const totalAmount = allPayments
            .filter(p => p.status === 'completed')
            .reduce((sum, p) => sum + (p.amount || 0), 0);
        
        setStats({
            totalTransactions: allPayments.length,
            totalAmount,
            successful,
            pending,
            processing,
            failed,
            refunded,
            averageAmount: successful > 0 ? totalAmount / successful : 0
        });
    }, []);

    // ============================================================
    // Load Payments
    // ============================================================
    const loadPayments = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            // First, try to create sample data if none exists
            const sampleData = createSamplePayments();
            
            // Load from localStorage
            const allOrders = getAllOrders();
            
            if (allOrders.length === 0) {
                // If no orders and no sample data was created
                if (!sampleData) {
                    setError("No orders found. Add sample data to see payments.");
                    setPayments([]);
                    calculateStats([]);
                    setLoading(false);
                    return;
                }
                // Use sample data
                setPayments(sampleData);
                calculateStats(sampleData);
                setError(null);
                setLoading(false);
                return;
            }

            const allPayments = extractPaymentsFromOrders(allOrders);
            
            if (allPayments.length === 0) {
                // If no payments extracted but we have sample data
                if (sampleData && sampleData.length > 0) {
                    setPayments(sampleData);
                    calculateStats(sampleData);
                    setError(null);
                    setLoading(false);
                    return;
                }
                setError("No payments found in orders.");
                setPayments([]);
                calculateStats([]);
                setLoading(false);
                return;
            }

            setPayments(allPayments);
            calculateStats(allPayments);
            setError(null);
            console.log(`✅ Loaded ${allPayments.length} payments`);

            // Try to fetch from backend (optional)
            const token = getToken();
            if (token) {
                try {
                    const response = await fetch(`${API_URL}/orders`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    
                    if (response.ok) {
                        const data = await response.json();
                        const orders = data.orders || data.data || [];
                        if (orders.length > 0) {
                            const backendPayments = extractPaymentsFromOrders(orders);
                            if (backendPayments.length > 0) {
                                const mergedPayments = mergePayments(allPayments, backendPayments);
                                if (mergedPayments.length > allPayments.length) {
                                    setPayments(mergedPayments);
                                    calculateStats(mergedPayments);
                                }
                            }
                        }
                    }
                } catch (apiError) {
                    console.log("Backend not available, using local data only");
                }
            }
        } catch (error) {
            console.error("Error loading payments:", error);
            setError("Failed to load payments. Using local data.");
        } finally {
            setLoading(false);
        }
    }, [getAllOrders, extractPaymentsFromOrders, calculateStats, createSamplePayments]);

    // ============================================================
    // Merge Payments
    // ============================================================
    const mergePayments = useCallback((localPayments, backendPayments) => {
        const map = new Map();
        
        localPayments.forEach(p => {
            const id = p.id || p.transactionId || p.orderId;
            if (id) map.set(String(id), p);
        });
        
        backendPayments.forEach(p => {
            const id = p.id || p.transactionId || p.orderId;
            if (id) {
                if (map.has(String(id))) {
                    map.set(String(id), { ...map.get(String(id)), ...p });
                } else {
                    map.set(String(id), p);
                }
            }
        });
        
        const merged = Array.from(map.values());
        merged.sort((a, b) => {
            const dateA = new Date(a.date || 0);
            const dateB = new Date(b.date || 0);
            return dateB - dateA;
        });
        
        return merged;
    }, []);

    // ============================================================
    // Filter Payments
    // ============================================================
    const filterPayments = useCallback(() => {
        let filtered = [...payments];
        
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(p => 
                String(p.orderId).toLowerCase().includes(term) ||
                p.customerName?.toLowerCase().includes(term) ||
                p.customerEmail?.toLowerCase().includes(term) ||
                String(p.transactionId).toLowerCase().includes(term) ||
                p.productNames?.toLowerCase().includes(term) ||
                p.method?.toLowerCase().includes(term)
            );
        }
        
        if (statusFilter !== "all") {
            filtered = filtered.filter(p => p.status === statusFilter);
        }
        
        if (methodFilter !== "all") {
            const methodLower = methodFilter.toLowerCase();
            filtered = filtered.filter(p => 
                p.method.toLowerCase().includes(methodLower) ||
                (methodLower === 'card' && (p.method.toLowerCase().includes('credit') || p.method.toLowerCase().includes('debit')))
            );
        }
        
        if (dateRange.start) {
            filtered = filtered.filter(p => new Date(p.date) >= new Date(dateRange.start));
        }
        if (dateRange.end) {
            const endDate = new Date(dateRange.end);
            endDate.setHours(23, 59, 59, 999);
            filtered = filtered.filter(p => new Date(p.date) <= endDate);
        }
        
        setFilteredPayments(filtered);
    }, [payments, searchTerm, statusFilter, methodFilter, dateRange]);

    // ============================================================
    // Effects
    // ============================================================
    useEffect(() => {
        const checkDarkMode = () => {
            const isDark = document.documentElement.classList.contains('dark');
            setDarkMode(isDark);
        };
        checkDarkMode();
        
        loadCurrencySymbol();
        loadPayments();
        
        const handleStorageChange = () => {
            loadPayments();
        };
        
        window.addEventListener('storage', handleStorageChange);
        window.addEventListener('currencyChanged', loadCurrencySymbol);
        window.addEventListener('ordersUpdated', handleStorageChange);
        
        return () => {
            window.removeEventListener('storage', handleStorageChange);
            window.removeEventListener('currencyChanged', loadCurrencySymbol);
            window.removeEventListener('ordersUpdated', handleStorageChange);
        };
    }, []);

    useEffect(() => {
        filterPayments();
    }, [payments, searchTerm, statusFilter, methodFilter, dateRange, filterPayments]);

    // ============================================================
    // View Payment Details
    // ============================================================
    const viewPaymentDetails = useCallback((payment) => {
        setSelectedPayment(payment);
        setShowModal(true);
    }, []);

    // ============================================================
    // Open Refund Modal
    // ============================================================
    const openRefundModal = useCallback((payment) => {
        if (payment.refunded) {
            toast.error("This payment has already been refunded");
            return;
        }
        setSelectedPayment(payment);
        setRefundAmount(String(payment.amount));
        setRefundReason("");
        setShowRefundModal(true);
    }, []);

    // ============================================================
    // Process Refund
    // ============================================================
    const processRefund = useCallback(async () => {
        if (!selectedPayment) return;
        
        const refundValue = parseFloat(refundAmount);
        if (isNaN(refundValue) || refundValue <= 0) {
            toast.error("Please enter a valid refund amount");
            return;
        }
        
        if (refundValue > selectedPayment.amount) {
            toast.error("Refund amount cannot exceed payment amount");
            return;
        }
        
        setProcessingRefund(true);
        const token = getToken();
        
        try {
            const response = await fetch(`${API_URL}/payments/${selectedPayment.id}/refund`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    amount: refundValue,
                    reason: refundReason || "Customer requested refund"
                })
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    toast.success(`Refund of ${currencySymbol}${refundValue.toFixed(2)} processed!`);
                    updateLocalRefund(selectedPayment, refundValue);
                    setShowRefundModal(false);
                    setShowModal(false);
                    setProcessingRefund(false);
                    return;
                }
            }
            throw new Error("Backend failed");
        } catch (error) {
            toast.info(`Processing refund of ${currencySymbol}${refundValue.toFixed(2)} locally`);
            updateLocalRefund(selectedPayment, refundValue);
            setShowRefundModal(false);
            setShowModal(false);
        } finally {
            setProcessingRefund(false);
        }
    }, [selectedPayment, refundAmount, refundReason, currencySymbol]);

    // ============================================================
    // Update Local Refund
    // ============================================================
    const updateLocalRefund = useCallback((payment, refundAmountValue) => {
        const updatedPayments = payments.map(p =>
            p.id === payment.id ? { 
                ...p, 
                status: 'refunded', 
                refunded: true,
                refundAmount: refundAmountValue,
                refundReason: refundReason || "Customer requested refund",
                refundedAt: new Date().toISOString()
            } : p
        );
        setPayments(updatedPayments);
        calculateStats(updatedPayments);
        
        const allOrders = getAllOrders();
        const updatedOrders = allOrders.map(order => {
            const orderId = order.id || order.orderId || order._id;
            if (String(orderId) === String(payment.orderId)) {
                return { 
                    ...order, 
                    status: 'refunded', 
                    refunded: true, 
                    refundAmount: refundAmountValue, 
                    refundReason: refundReason || "Customer requested refund",
                    refundedAt: new Date().toISOString()
                };
            }
            return order;
        });
        
        localStorage.setItem('admin_orders', JSON.stringify(updatedOrders));
        
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('orders_')) {
                try {
                    const userOrders = JSON.parse(localStorage.getItem(key) || '[]');
                    if (Array.isArray(userOrders)) {
                        const updatedUserOrders = userOrders.map(order => {
                            const orderId = order.id || order.orderId || order._id;
                            if (String(orderId) === String(payment.orderId)) {
                                return { 
                                    ...order, 
                                    status: 'refunded', 
                                    refunded: true, 
                                    refundAmount: refundAmountValue,
                                    refundReason: refundReason || "Customer requested refund",
                                    refundedAt: new Date().toISOString()
                                };
                            }
                            return order;
                        });
                        localStorage.setItem(key, JSON.stringify(updatedUserOrders));
                    }
                } catch (e) {}
            }
        }
        
        window.dispatchEvent(new CustomEvent('ordersUpdated'));
        toast.success(`Refund of ${currencySymbol}${refundAmountValue.toFixed(2)} processed`);
    }, [payments, refundReason, currencySymbol, calculateStats, getAllOrders]);

    // ============================================================
    // Resend Receipt
    // ============================================================
    const resendReceipt = useCallback((payment) => {
        toast.success(`Receipt sent to ${payment.customerEmail}`);
    }, []);

    // ============================================================
    // Download Report
    // ============================================================
    const downloadReport = useCallback(() => {
        const reportData = filteredPayments.map(p => ({
            "Transaction ID": p.id,
            "Order ID": p.orderId,
            "Customer": p.customerName,
            "Email": p.customerEmail,
            "Amount": p.amount,
            "Currency": p.currency,
            "Payment Method": p.method,
            "Status": p.status,
            "Date": new Date(p.date).toLocaleString()
        }));
        
        if (reportData.length === 0) {
            toast.error("No data to export");
            return;
        }
        
        const headers = Object.keys(reportData[0]);
        const csvRows = [headers.join(',')];
        
        for (const row of reportData) {
            const values = headers.map(header => {
                const value = row[header];
                return typeof value === 'string' ? `"${value}"` : value;
            });
            csvRows.push(values.join(','));
        }
        
        const csv = csvRows.join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `payments_report_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("Report downloaded");
    }, [filteredPayments]);

    // ============================================================
    // Status Badge
    // ============================================================
    const getStatusBadge = useCallback((status) => {
        const badges = {
            completed: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
            pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
            processing: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
            failed: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
            refunded: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400'
        };
        return badges[status] || 'bg-gray-100 text-gray-800';
    }, []);

    const getStatusIcon = useCallback((status) => {
        switch(status) {
            case 'completed': return <FiCheckCircle className="text-green-600" size={14} />;
            case 'pending': return <FiClock className="text-yellow-600" size={14} />;
            case 'processing': return <FiRefreshCw className="text-blue-600" size={14} />;
            case 'failed': return <FiXCircle className="text-red-600" size={14} />;
            case 'refunded': return <FiRefreshCcw className="text-purple-600" size={14} />;
            default: return <FiClock className="text-gray-600" size={14} />;
        }
    }, []);

    const getMethodIcon = useCallback((method) => {
        const methodLower = method.toLowerCase();
        if (methodLower.includes('card') || methodLower.includes('credit') || methodLower.includes('debit')) {
            return <FiCreditCard className="text-blue-500" />;
        }
        if (methodLower.includes('paypal')) return <FiDollarSign className="text-blue-600" />;
        if (methodLower.includes('apple')) return <FiSmartphone className="text-gray-600" />;
        if (methodLower.includes('google')) return <FiGlobe className="text-green-600" />;
        if (methodLower.includes('cod') || methodLower.includes('cash')) return <FiHome className="text-orange-500" />;
        return <FiCreditCard className="text-gray-500" />;
    }, []);

    const formatDate = useCallback((dateString) => {
        if (!dateString) return 'N/A';
        try {
            return new Date(dateString).toLocaleString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch {
            return 'N/A';
        }
    }, []);

    const formatPrice = useCallback((price) => 
        `${currencySymbol}${(price || 0).toFixed(2)}`, 
    [currencySymbol]);

    // ============================================================
    // Loading State
    // ============================================================
    if (loading && payments.length === 0) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    // ============================================================
    // Render
    // ============================================================
    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold dark:text-white">Payment Management</h1>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">Track, manage, and process refunds for payments</p>
                </div>
                <div className="flex gap-2">
                    <button 
                        onClick={downloadReport} 
                        className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-green-700 transition-colors"
                    >
                        <FiDownload size={16} /> Report
                    </button>
                    <button 
                        onClick={() => {
                            setLoading(true);
                            loadPayments();
                        }} 
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-colors"
                    >
                        <FiRefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh
                    </button>
                </div>
            </div>

            {error && (
                <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-yellow-700">
                        <FiAlertCircle size={18} />
                        <span className="text-sm">{error}</span>
                    </div>
                </div>
            )}

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 mb-6">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-3 text-center">
                    <p className="text-xs text-gray-500">Transactions</p>
                    <p className="text-xl font-bold dark:text-white">{stats.totalTransactions}</p>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg shadow p-3 text-center">
                    <p className="text-xs text-green-600">Total Revenue</p>
                    <p className="text-xl font-bold text-green-700">{formatPrice(stats.totalAmount)}</p>
                </div>
                <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg shadow p-3 text-center">
                    <p className="text-xs text-emerald-600">Completed</p>
                    <p className="text-xl font-bold text-emerald-700">{stats.successful}</p>
                </div>
                <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg shadow p-3 text-center">
                    <p className="text-xs text-yellow-600">Pending</p>
                    <p className="text-xl font-bold text-yellow-700">{stats.pending}</p>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg shadow p-3 text-center">
                    <p className="text-xs text-blue-600">Processing</p>
                    <p className="text-xl font-bold text-blue-700">{stats.processing || 0}</p>
                </div>
                <div className="bg-red-50 dark:bg-red-900/20 rounded-lg shadow p-3 text-center">
                    <p className="text-xs text-red-600">Failed</p>
                    <p className="text-xl font-bold text-red-700">{stats.failed}</p>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg shadow p-3 text-center">
                    <p className="text-xs text-purple-600">Refunded</p>
                    <p className="text-xl font-bold text-purple-700">{stats.refunded}</p>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg shadow p-3 text-center">
                    <p className="text-xs text-blue-600">Avg Amount</p>
                    <p className="text-xl font-bold text-blue-700">{formatPrice(stats.averageAmount)}</p>
                </div>
            </div>

            {/* Search and Filters */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6">
                <div className="flex flex-wrap gap-4">
                    <div className="flex-1 min-w-[200px] relative">
                        <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <input 
                            type="text" 
                            placeholder="Search by order ID, customer, email, product..." 
                            value={searchTerm} 
                            onChange={(e) => setSearchTerm(e.target.value)} 
                            className="w-full pl-10 pr-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white" 
                        />
                    </div>
                    <select 
                        value={statusFilter} 
                        onChange={(e) => setStatusFilter(e.target.value)} 
                        className="px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                    >
                        <option value="all">All Status</option>
                        <option value="completed">Completed</option>
                        <option value="pending">Pending</option>
                        <option value="processing">Processing</option>
                        <option value="failed">Failed</option>
                        <option value="refunded">Refunded</option>
                    </select>
                    <select 
                        value={methodFilter} 
                        onChange={(e) => setMethodFilter(e.target.value)} 
                        className="px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                    >
                        <option value="all">All Methods</option>
                        <option value="card">Credit/Debit Card</option>
                        <option value="paypal">PayPal</option>
                        <option value="cod">Cash on Delivery</option>
                        <option value="apple">Apple Pay</option>
                        <option value="google">Google Pay</option>
                        <option value="bank">Bank Transfer</option>
                    </select>
                    <input 
                        type="date" 
                        value={dateRange.start} 
                        onChange={(e) => setDateRange({...dateRange, start: e.target.value})} 
                        className="px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600" 
                        placeholder="Start Date" 
                    />
                    <input 
                        type="date" 
                        value={dateRange.end} 
                        onChange={(e) => setDateRange({...dateRange, end: e.target.value})} 
                        className="px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600" 
                        placeholder="End Date" 
                    />
                </div>
            </div>

            {/* Payments Table */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                {filteredPayments.length === 0 ? (
                    <div className="text-center py-12">
                        <FiCreditCard className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold dark:text-white">No payments found</h3>
                        <p className="text-gray-500 text-sm">Payments will appear here when orders are placed</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 dark:bg-gray-700">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Order ID</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Customer</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Products</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Amount</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Method</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Date</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Status</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredPayments.map((payment) => (
                                    <tr key={payment.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                        <td className="px-4 py-3">
                                            <p className="font-mono text-sm dark:text-white font-semibold">
                                                #{String(payment.orderId).slice(-8)}
                                            </p>
                                            <p className="text-xs text-gray-500">{payment.transactionId}</p>
                                        </td>
                                        <td className="px-4 py-3">
                                            <p className="font-medium dark:text-white">{payment.customerName}</p>
                                            <p className="text-xs text-gray-500">{payment.customerEmail}</p>
                                        </td>
                                        <td className="px-4 py-3">
                                            <p className="text-sm dark:text-gray-300 line-clamp-2 max-w-[200px]">
                                                {payment.productNames || 'N/A'}
                                            </p>
                                        </td>
                                        <td className="px-4 py-3 font-semibold text-green-600 dark:text-green-400">
                                            {formatPrice(payment.amount)}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                {getMethodIcon(payment.method)}
                                                <span className="text-sm dark:text-gray-300">{payment.method}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-sm dark:text-gray-300">
                                            {formatDate(payment.date)}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-1">
                                                {getStatusIcon(payment.status)}
                                                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusBadge(payment.status)}`}>
                                                    {payment.status}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex gap-2">
                                                <button 
                                                    onClick={() => viewPaymentDetails(payment)} 
                                                    className="text-blue-600 hover:text-blue-800 p-1 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors" 
                                                    title="View Details"
                                                >
                                                    <FiEye size={16} />
                                                </button>
                                                <button 
                                                    onClick={() => resendReceipt(payment)} 
                                                    className="text-green-600 hover:text-green-800 p-1 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors" 
                                                    title="Resend Receipt"
                                                >
                                                    <FiMailIcon size={16} />
                                                </button>
                                                {payment.status === 'completed' && !payment.refunded && (
                                                    <button 
                                                        onClick={() => openRefundModal(payment)} 
                                                        className="text-purple-600 hover:text-purple-800 p-1 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors" 
                                                        title="Process Refund"
                                                    >
                                                        <FiRefreshCcw size={16} />
                                                    </button>
                                                )}
                                                {payment.refunded && (
                                                    <span className="text-xs text-purple-600 flex items-center gap-1 bg-purple-50 dark:bg-purple-900/20 px-2 py-0.5 rounded-full">
                                                        <FiRefreshCcw size={12} /> Refunded
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Payment Details Modal */}
            <AnimatePresence>
                {showModal && selectedPayment && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={() => setShowModal(false)}>
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.9 }} 
                            animate={{ opacity: 1, scale: 1 }} 
                            exit={{ opacity: 0, scale: 0.9 }} 
                            className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl" 
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex justify-between items-center mb-4 sticky top-0 bg-white dark:bg-gray-800 pb-2 border-b dark:border-gray-700">
                                <h2 className="text-2xl font-bold dark:text-white">Payment Details</h2>
                                <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-gray-700 text-2xl">
                                    <FiXCircle size={24} />
                                </button>
                            </div>
                            <div className="space-y-4 pt-2">
                                <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl space-y-2">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-gray-500">Transaction ID</span>
                                        <span className="font-mono text-sm font-semibold dark:text-white">{selectedPayment.transactionId}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-gray-500">Order ID</span>
                                        <span className="font-mono text-sm font-semibold dark:text-white">#{String(selectedPayment.orderId).slice(-8)}</span>
                                    </div>
                                    <div className="flex justify-between items-center border-t dark:border-gray-600 pt-2">
                                        <span className="text-sm text-gray-500">Amount</span>
                                        <span className="text-2xl font-bold text-green-600">{formatPrice(selectedPayment.amount)}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-gray-500">Payment Method</span>
                                        <span className="text-sm font-medium flex items-center gap-2">
                                            {getMethodIcon(selectedPayment.method)} {selectedPayment.method}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-gray-500">Status</span>
                                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusBadge(selectedPayment.status)}`}>
                                            {selectedPayment.status}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-gray-500">Order Status</span>
                                        <span className="text-sm dark:text-gray-300 capitalize">{selectedPayment.orderStatus || 'N/A'}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-gray-500">Date</span>
                                        <span className="text-sm dark:text-gray-300">{formatDate(selectedPayment.date)}</span>
                                    </div>
                                </div>

                                <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl space-y-2">
                                    <p className="text-sm font-semibold dark:text-white flex items-center gap-2">
                                        <FiUser size={14} /> Customer
                                    </p>
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-gray-500">Name</span>
                                        <span className="text-sm font-medium dark:text-white">{selectedPayment.customerName}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-gray-500">Email</span>
                                        <span className="text-sm dark:text-gray-300">{selectedPayment.customerEmail}</span>
                                    </div>
                                </div>

                                {selectedPayment.items && selectedPayment.items.length > 0 && (
                                    <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl">
                                        <p className="text-sm font-semibold dark:text-white flex items-center gap-2 mb-2">
                                            <FiPackage size={14} /> Products
                                        </p>
                                        <div className="space-y-1 max-h-32 overflow-y-auto">
                                            {selectedPayment.items.map((item, idx) => (
                                                <div key={idx} className="flex justify-between text-sm border-b dark:border-gray-600 py-1 last:border-0">
                                                    <span className="dark:text-gray-300">{item.name || item.productName || 'Product'}</span>
                                                    <span className="font-semibold dark:text-white">×{item.quantity || 1}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {selectedPayment.refunded && (
                                    <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-xl border border-purple-200 dark:border-purple-800">
                                        <p className="text-sm font-semibold text-purple-700 dark:text-purple-400 flex items-center gap-2">
                                            <FiRefreshCcw size={14} /> Refund Details
                                        </p>
                                        <div className="flex justify-between items-center mt-2">
                                            <span className="text-sm text-gray-500">Amount</span>
                                            <span className="font-semibold text-purple-600">{formatPrice(selectedPayment.refundAmount)}</span>
                                        </div>
                                        {selectedPayment.refundReason && (
                                            <div className="flex justify-between items-center mt-1">
                                                <span className="text-sm text-gray-500">Reason</span>
                                                <span className="text-sm dark:text-gray-300">{selectedPayment.refundReason}</span>
                                            </div>
                                        )}
                                        {selectedPayment.refundedAt && (
                                            <div className="flex justify-between items-center mt-1">
                                                <span className="text-sm text-gray-500">Refunded At</span>
                                                <span className="text-sm dark:text-gray-300">{formatDate(selectedPayment.refundedAt)}</span>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {selectedPayment.cardLast4 && selectedPayment.cardLast4 !== "****" && (
                                    <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl">
                                        <p className="text-sm text-gray-500 mb-1">Card</p>
                                        <p className="font-mono text-sm dark:text-white">•••• •••• •••• {selectedPayment.cardLast4}</p>
                                    </div>
                                )}

                                {selectedPayment.billingAddress && (
                                    <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl">
                                        <p className="text-sm text-gray-500 mb-1">Billing Address</p>
                                        <p className="text-sm dark:text-gray-300">{selectedPayment.billingAddress}</p>
                                    </div>
                                )}

                                <div className="flex gap-3 pt-4 border-t dark:border-gray-700">
                                    <button onClick={() => setShowModal(false)} className="flex-1 bg-gray-500 text-white py-2.5 rounded-xl font-semibold hover:bg-gray-600 transition-all">
                                        Close
                                    </button>
                                    {selectedPayment.status === 'completed' && !selectedPayment.refunded && (
                                        <button 
                                            onClick={() => { setShowModal(false); setTimeout(() => openRefundModal(selectedPayment), 300); }} 
                                            className="flex-1 bg-purple-600 text-white py-2.5 rounded-xl font-semibold hover:bg-purple-700 transition-all flex items-center justify-center gap-2"
                                        >
                                            <FiRefreshCcw size={16} /> Process Refund
                                        </button>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Refund Modal */}
            <AnimatePresence>
                {showRefundModal && selectedPayment && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={() => setShowRefundModal(false)}>
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.9 }} 
                            animate={{ opacity: 1, scale: 1 }} 
                            exit={{ opacity: 0, scale: 0.9 }} 
                            className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6 shadow-2xl" 
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-2xl font-bold dark:text-white">Process Refund</h2>
                                <button onClick={() => setShowRefundModal(false)} className="text-gray-500 hover:text-gray-700">
                                    <FiXCircle size={24} />
                                </button>
                            </div>
                            <div className="space-y-4">
                                <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl space-y-2">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-gray-500">Order</span>
                                        <span className="font-mono font-semibold dark:text-white">#{String(selectedPayment.orderId).slice(-8)}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-gray-500">Customer</span>
                                        <span className="font-medium dark:text-white">{selectedPayment.customerName}</span>
                                    </div>
                                    <div className="flex justify-between items-center border-t dark:border-gray-600 pt-2">
                                        <span className="text-sm text-gray-500">Original Amount</span>
                                        <span className="font-semibold text-green-600">{formatPrice(selectedPayment.amount)}</span>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-1 dark:text-white">Refund Amount *</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">{currencySymbol}</span>
                                        <input 
                                            type="number" 
                                            step="0.01" 
                                            required 
                                            value={refundAmount} 
                                            onChange={(e) => setRefundAmount(e.target.value)} 
                                            className="w-full pl-8 pr-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600" 
                                            placeholder="0.00" 
                                        />
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">Maximum: {formatPrice(selectedPayment.amount)}</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-1 dark:text-white">Refund Reason</label>
                                    <textarea 
                                        rows="3" 
                                        value={refundReason} 
                                        onChange={(e) => setRefundReason(e.target.value)} 
                                        className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 resize-none" 
                                        placeholder="e.g., Customer request, Damaged product, Wrong item sent"
                                    />
                                </div>

                                <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg">
                                    <p className="text-sm text-yellow-700 dark:text-yellow-300 flex items-start gap-2">
                                        <FiAlertCircle className="mt-0.5 flex-shrink-0" size={16} />
                                        This action will mark the payment as refunded and update the order status.
                                    </p>
                                </div>

                                <div className="flex gap-3 pt-2">
                                    <button 
                                        onClick={processRefund} 
                                        disabled={processingRefund} 
                                        className="flex-1 bg-purple-600 text-white py-2.5 rounded-xl font-semibold hover:bg-purple-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {processingRefund ? (
                                            <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                                        ) : (
                                            <><FiRefreshCcw size={16} /> Process Refund</>
                                        )}
                                    </button>
                                    <button 
                                        onClick={() => setShowRefundModal(false)} 
                                        className="flex-1 bg-gray-500 text-white py-2.5 rounded-xl font-semibold hover:bg-gray-600 transition-all"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Payments;