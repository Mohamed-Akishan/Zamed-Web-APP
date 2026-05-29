// src/pages/Admin/Orders.jsx
import { useState, useEffect } from "react";
import { 
    FiEye, FiCheckCircle, FiXCircle, FiTruck, FiSearch, FiRefreshCw, 
    FiPackage, FiUser, FiCalendar, FiDollarSign, FiMessageSquare,
    FiShield, FiClock, FiCheck, FiX, FiFilter, FiMapPin, FiPhone,
    FiMail, FiInfo, FiEdit2, FiPrinter, FiDownload, FiMail as FiMailIcon,
    FiAlertCircle, FiLoader, FiArrowLeft, FiArrowRight, FiTruck as FiDeliveryTruck,
    FiCreditCard
} from "react-icons/fi";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const Orders = () => {
    const [orders, setOrders] = useState([]);
    const [filteredOrders, setFilteredOrders] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [statusFilter, setStatusFilter] = useState("all");
    const [loading, setLoading] = useState(false);
    const [updatingStatus, setUpdatingStatus] = useState(null);
    const [error, setError] = useState(null);
    const [currencySymbol, setCurrencySymbol] = useState("$");
    const [dateRange, setDateRange] = useState({ start: "", end: "" });
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [itemsPerPage] = useState(20);
    const [darkMode, setDarkMode] = useState(false);
    const [orderStats, setOrderStats] = useState({
        total: 0, pending: 0, processing: 0, shipped: 0, delivered: 0, cancelled: 0, totalRevenue: 0
    });
    const [showTrackingModal, setShowTrackingModal] = useState(false);
    const [trackingNumber, setTrackingNumber] = useState("");
    const [trackingOrder, setTrackingOrder] = useState(null);

    const getToken = () => localStorage.getItem('token');

    useEffect(() => {
        const checkDarkMode = () => {
            const isDark = document.documentElement.classList.contains('dark');
            setDarkMode(isDark);
        };
        checkDarkMode();
        
        loadCurrencySymbol();
        loadOrders();
    }, [currentPage, statusFilter, dateRange]);

    useEffect(() => {
        filterOrders();
    }, [orders, searchTerm]);

    const loadCurrencySymbol = () => {
        const siteSettings = JSON.parse(localStorage.getItem('site_settings') || '{}');
        const symbols = { USD: "$", EUR: "€", GBP: "£", LKR: "Rs" };
        setCurrencySymbol(symbols[siteSettings.currency] || "$");
    };

    const loadOrders = async () => {
        setLoading(true);
        setError(null);
        
        // First, sync orders from IndexedDB to state
        await syncOrdersFromIndexedDB();
        
        const token = getToken();
        if (!token) {
            setError("Please login again");
            setLoading(false);
            return;
        }
        
        try {
            const params = new URLSearchParams();
            params.append('page', currentPage);
            params.append('limit', itemsPerPage);
            if (statusFilter !== "all") params.append('status', statusFilter);
            if (dateRange.start) params.append('startDate', dateRange.start);
            if (dateRange.end) params.append('endDate', dateRange.end);
            
            const response = await fetch(`${API_URL}/orders?${params.toString()}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.success && data.orders && data.orders.length > 0) {
                    const formattedOrders = formatOrders(data.orders);
                    setOrders(formattedOrders);
                    setTotalPages(data.totalPages || 1);
                    calculateStats(formattedOrders);
                    setLoading(false);
                    return;
                }
            }
            
            // If no orders from backend or error, use localStorage orders
            await loadLocalOrders();
            
        } catch (error) {
            console.error("Error loading orders:", error);
            await loadLocalOrders();
        } finally {
            setLoading(false);
        }
    };
    
    const syncOrdersFromIndexedDB = async () => {
        try {
            // Get orders from IndexedDB
            const db = await new Promise((resolve, reject) => {
                const request = indexedDB.open('ZamedOrdersDB', 2);
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
            
            const ordersFromDB = await new Promise((resolve, reject) => {
                const transaction = db.transaction(['orders'], 'readonly');
                const store = transaction.objectStore('orders');
                const request = store.getAll();
                request.onsuccess = () => resolve(request.result || []);
                request.onerror = () => reject(request.error);
            });
            
            if (ordersFromDB.length > 0) {
                console.log(`Synced ${ordersFromDB.length} orders from IndexedDB`);
                // Also save to localStorage for backup
                localStorage.setItem('admin_orders', JSON.stringify(ordersFromDB));
            }
        } catch (error) {
            console.log("IndexedDB not available, using localStorage only");
        }
    };
    
    const loadLocalOrders = async () => {
        // Get orders from all possible localStorage sources
        let allOrders = [];
        
        // Admin orders
        const adminOrders = JSON.parse(localStorage.getItem('admin_orders') || '[]');
        allOrders = [...allOrders, ...adminOrders];
        
        // Guest orders
        const guestOrders = JSON.parse(localStorage.getItem('guestOrders') || '[]');
        allOrders = [...allOrders, ...guestOrders];
        
        // User-specific orders
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('orders_')) {
                const userOrders = JSON.parse(localStorage.getItem(key) || '[]');
                allOrders = [...allOrders, ...userOrders];
            }
        }
        
        // Also try to get from IndexedDB via global variable
        if (window.indexedDBOrders) {
            allOrders = [...allOrders, ...window.indexedDBOrders];
        }
        
        // Remove duplicates by id
        const uniqueOrders = [];
        const ids = new Set();
        allOrders.forEach(order => {
            const orderId = order.id || order.orderId;
            if (orderId && !ids.has(orderId)) {
                ids.add(orderId);
                uniqueOrders.push(order);
            }
        });
        
        // Sort by date (newest first)
        uniqueOrders.sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt));
        
        // Apply pagination
        const start = (currentPage - 1) * itemsPerPage;
        const paginatedOrders = uniqueOrders.slice(start, start + itemsPerPage);
        
        setOrders(paginatedOrders);
        setFilteredOrders(paginatedOrders);
        setTotalPages(Math.ceil(uniqueOrders.length / itemsPerPage));
        calculateStats(uniqueOrders);
    };
    
    const formatOrders = (backendOrders) => {
        return backendOrders.map(order => ({
            id: order._id || order.orderId,
            orderId: order.orderId,
            customerName: order.customerName,
            customerEmail: order.customerEmail,
            customerPhone: order.customerPhone,
            date: order.createdAt,
            items: order.items || [],
            itemsList: order.items || [],
            itemsCount: order.itemsCount || order.items?.length || 0,
            subtotal: order.subtotal,
            shippingFee: order.shippingFee,
            taxAmount: order.taxAmount,
            discount: order.discount,
            total: order.total,
            paymentMethod: order.paymentMethod,
            paymentStatus: order.paymentStatus,
            status: order.orderStatus,
            orderStatus: order.orderStatus,
            shippingAddress: order.shippingAddress,
            billingAddress: order.billingAddress,
            notes: order.notes,
            trackingNumber: order.trackingNumber,
            trackingUrl: order.trackingUrl,
            statusHistory: order.statusHistory || [],
            createdAt: order.createdAt,
            updatedAt: order.updatedAt
        }));
    };
    
    const calculateStats = (ordersList) => {
        const stats = {
            total: ordersList.length,
            pending: ordersList.filter(o => (o.status || o.orderStatus) === 'pending').length,
            processing: ordersList.filter(o => (o.status || o.orderStatus) === 'processing').length,
            shipped: ordersList.filter(o => (o.status || o.orderStatus) === 'shipped').length,
            delivered: ordersList.filter(o => (o.status || o.orderStatus) === 'delivered').length,
            cancelled: ordersList.filter(o => (o.status || o.orderStatus) === 'cancelled').length,
            totalRevenue: ordersList.filter(o => (o.status || o.orderStatus) === 'delivered').reduce((sum, o) => sum + (o.total || 0), 0)
        };
        setOrderStats(stats);
    };

    const filterOrders = () => {
        let filtered = [...orders];
        if (searchTerm) {
            filtered = filtered.filter(o => 
                (o.orderId || o.id)?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                o.customerEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                o.customerName?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }
        setFilteredOrders(filtered);
    };

    const updateOrderStatus = async (orderId, newStatus) => {
        setUpdatingStatus(orderId);
        const token = getToken();
        
        try {
            // Try backend first
            const response = await fetch(`${API_URL}/orders/${orderId}/status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ status: newStatus, note: `Status updated to ${newStatus} by admin` })
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    toast.success(`Order status updated to ${newStatus}`);
                    loadOrders();
                    return;
                }
            }
            throw new Error("Backend failed");
        } catch (error) {
            // Fallback to localStorage
            const updatedOrders = orders.map(o => {
                if ((o.id === orderId || o.orderId === orderId)) {
                    return { ...o, status: newStatus, orderStatus: newStatus };
                }
                return o;
            });
            setOrders(updatedOrders);
            calculateStats(updatedOrders);
            
            // Update localStorage
            const allOrders = JSON.parse(localStorage.getItem('admin_orders') || '[]');
            const updatedAllOrders = allOrders.map(o => {
                if ((o.id === orderId || o.orderId === orderId)) {
                    return { ...o, status: newStatus, orderStatus: newStatus };
                }
                return o;
            });
            localStorage.setItem('admin_orders', JSON.stringify(updatedAllOrders));
            
            toast.success(`Order status updated to ${newStatus} (local)`);
            if (selectedOrder && (selectedOrder.id === orderId || selectedOrder.orderId === orderId)) {
                setSelectedOrder({ ...selectedOrder, status: newStatus, orderStatus: newStatus });
            }
        } finally {
            setUpdatingStatus(null);
        }
    };

    const getStatusBadge = (status) => {
        const badges = {
            pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
            processing: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
            shipped: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400',
            delivered: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
            cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
        };
        return badges[status] || 'bg-gray-100 text-gray-800';
    };

    const getStatusIcon = (status) => {
        switch(status) {
            case 'pending': return <FiClock className="text-yellow-600" size={14} />;
            case 'processing': return <FiLoader className="text-blue-600" size={14} />;
            case 'shipped': return <FiTruck className="text-purple-600" size={14} />;
            case 'delivered': return <FiCheckCircle className="text-green-600" size={14} />;
            case 'cancelled': return <FiXCircle className="text-red-600" size={14} />;
            default: return null;
        }
    };

    const formatDate = (dateString) => dateString ? new Date(dateString).toLocaleDateString() : 'N/A';
    const formatPrice = (price) => `${currencySymbol}${(price || 0).toFixed(2)}`;

    if (loading && orders.length === 0) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold dark:text-white">Order Management</h1>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">Manage customer orders and track status</p>
                </div>
                <button onClick={loadOrders} className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2">
                    <FiRefreshCw size={16} /> Refresh
                </button>
            </div>

            {error && (
                <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-yellow-700">
                        <FiAlertCircle size={18} />
                        <span className="text-sm">{error} - Using local data</span>
                    </div>
                </div>
            )}

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-3 text-center">
                    <p className="text-xs text-gray-500">Total Orders</p>
                    <p className="text-xl font-bold dark:text-white">{orderStats.total}</p>
                </div>
                <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg shadow p-3 text-center">
                    <p className="text-xs text-yellow-600">Pending</p>
                    <p className="text-xl font-bold text-yellow-700">{orderStats.pending}</p>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg shadow p-3 text-center">
                    <p className="text-xs text-blue-600">Processing</p>
                    <p className="text-xl font-bold text-blue-700">{orderStats.processing}</p>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg shadow p-3 text-center">
                    <p className="text-xs text-purple-600">Shipped</p>
                    <p className="text-xl font-bold text-purple-700">{orderStats.shipped}</p>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg shadow p-3 text-center">
                    <p className="text-xs text-green-600">Delivered</p>
                    <p className="text-xl font-bold text-green-700">{orderStats.delivered}</p>
                </div>
                <div className="bg-red-50 dark:bg-red-900/20 rounded-lg shadow p-3 text-center">
                    <p className="text-xs text-red-600">Cancelled</p>
                    <p className="text-xl font-bold text-red-700">{orderStats.cancelled}</p>
                </div>
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg shadow p-3 text-white text-center">
                    <p className="text-xs opacity-90">Total Revenue</p>
                    <p className="text-xl font-bold">{formatPrice(orderStats.totalRevenue)}</p>
                </div>
            </div>

            {/* Search and Filters */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6">
                <div className="flex flex-wrap gap-4">
                    <div className="flex-1 relative">
                        <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <input 
                            type="text" 
                            placeholder="Search by Order ID, Customer Name, or Email..." 
                            value={searchTerm} 
                            onChange={(e) => setSearchTerm(e.target.value)} 
                            className="w-full pl-10 pr-4 py-2 border rounded-lg dark:bg-gray-700" 
                        />
                    </div>
                    <select 
                        value={statusFilter} 
                        onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }} 
                        className="px-4 py-2 border rounded-lg dark:bg-gray-700"
                    >
                        <option value="all">All Status</option>
                        <option value="pending">Pending</option>
                        <option value="processing">Processing</option>
                        <option value="shipped">Shipped</option>
                        <option value="delivered">Delivered</option>
                        <option value="cancelled">Cancelled</option>
                    </select>
                    <input 
                        type="date" 
                        value={dateRange.start} 
                        onChange={(e) => { setDateRange({...dateRange, start: e.target.value}); setCurrentPage(1); }} 
                        className="px-4 py-2 border rounded-lg dark:bg-gray-700" 
                    />
                    <input 
                        type="date" 
                        value={dateRange.end} 
                        onChange={(e) => { setDateRange({...dateRange, end: e.target.value}); setCurrentPage(1); }} 
                        className="px-4 py-2 border rounded-lg dark:bg-gray-700" 
                    />
                </div>
            </div>

            {/* Orders Table */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                {filteredOrders.length === 0 ? (
                    <div className="text-center py-12">
                        <FiPackage className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold dark:text-white">No orders found</h3>
                        <p className="text-gray-500">Orders will appear here when customers place orders</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 dark:bg-gray-700">
                                <tr>
                                    <th className="px-4 py-3 text-left">Order ID</th>
                                    <th className="px-4 py-3 text-left">Customer</th>
                                    <th className="px-4 py-3 text-left">Date</th>
                                    <th className="px-4 py-3 text-center">Items</th>
                                    <th className="px-4 py-3 text-left">Total</th>
                                    <th className="px-4 py-3 text-left">Status</th>
                                    <th className="px-4 py-3 text-left">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredOrders.map((order) => {
                                    const orderStatus = order.status || order.orderStatus || 'pending';
                                    return (
                                        <tr key={order.id || order.orderId} className="border-b dark:border-gray-700 hover:bg-gray-50">
                                            <td className="px-4 py-3 font-mono text-sm">{order.orderId || order.id}</td>
                                            <td className="px-4 py-3">
                                                <div>
                                                    <p className="font-medium dark:text-white">{order.customerName || 'Guest'}</p>
                                                    <p className="text-xs text-gray-500">{order.customerEmail}</p>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-sm">{formatDate(order.date || order.createdAt)}</td>
                                            <td className="px-4 py-3 text-center">
                                                <span className="inline-flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-600 rounded-full text-sm font-semibold">
                                                    {order.itemsList?.length || order.items?.length || 0}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 font-semibold text-green-600">{formatPrice(order.total)}</td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    {getStatusIcon(orderStatus)}
                                                    <select 
                                                        value={orderStatus} 
                                                        onChange={(e) => updateOrderStatus(order.id || order.orderId, e.target.value)} 
                                                        disabled={updatingStatus === (order.id || order.orderId)} 
                                                        className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusBadge(orderStatus)} border-0 cursor-pointer`}
                                                    >
                                                        <option value="pending">Pending</option>
                                                        <option value="processing">Processing</option>
                                                        <option value="shipped">Shipped</option>
                                                        <option value="delivered">Delivered</option>
                                                        <option value="cancelled">Cancelled</option>
                                                    </select>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex gap-2">
                                                    <button onClick={() => setSelectedOrder(order)} className="text-blue-600 hover:text-blue-800 p-1" title="View Details">
                                                        <FiEye size={18} />
                                                    </button>
                                                    <button onClick={() => {
                                                        const printWindow = window.open('', '_blank');
                                                        printWindow.document.write(`
                                                            <html><head><title>Invoice ${order.orderId || order.id}</title>
                                                            <style>body{font-family:Arial;padding:40px} table{width:100%;border-collapse:collapse} th,td{border:1px solid #ddd;padding:10px} th{background:#f5f5f5}</style>
                                                            </head><body><h1>INVOICE</h1><p>Order: ${order.orderId || order.id}</p>
                                                            <p>Customer: ${order.customerName || order.customerEmail}</p>
                                                            <p>Date: ${new Date(order.date || order.createdAt).toLocaleDateString()}</p>
                                                            <table><tr><th>Product</th><th>Qty</th><th>Price</th><th>Total</th></tr>
                                                            ${(order.itemsList || order.items || []).map(item => `<tr><td>${item.name}</td><td>${item.quantity}</td><td>${formatPrice(item.price)}</td><td>${formatPrice(item.price * item.quantity)}</td></tr>`).join('')}
                                                            </table><h3>Total: ${formatPrice(order.total)}</h3></body></html>
                                                        `);
                                                        printWindow.print();
                                                    }} className="text-gray-600 hover:text-gray-800 p-1" title="Print Invoice">
                                                        <FiPrinter size={18} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex justify-between items-center mt-6">
                    <p className="text-sm text-gray-500">Page {currentPage} of {totalPages}</p>
                    <div className="flex gap-2">
                        <button onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1} className="px-3 py-1 border rounded-lg disabled:opacity-50">Previous</button>
                        <button onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages} className="px-3 py-1 border rounded-lg disabled:opacity-50">Next</button>
                    </div>
                </div>
            )}

            {/* Order Details Modal */}
            <AnimatePresence>
                {selectedOrder && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={() => setSelectedOrder(null)}>
                        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-2xl font-bold dark:text-white">Order Details</h2>
                                <button onClick={() => setSelectedOrder(null)} className="text-gray-500 text-2xl">&times;</button>
                            </div>
                            <div className="space-y-4">
                                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                                    <p><strong>Order ID:</strong> {selectedOrder.orderId || selectedOrder.id}</p>
                                    <p><strong>Customer:</strong> {selectedOrder.customerName || selectedOrder.customerEmail}</p>
                                    <p><strong>Date:</strong> {formatDate(selectedOrder.date || selectedOrder.createdAt)}</p>
                                    <p><strong>Payment Method:</strong> {selectedOrder.paymentMethod || 'N/A'}</p>
                                    <p><strong>Status:</strong> <span className={`px-2 py-1 rounded-full text-xs ${getStatusBadge(selectedOrder.status || selectedOrder.orderStatus)}`}>{selectedOrder.status || selectedOrder.orderStatus}</span></p>
                                    <p><strong>Total:</strong> {formatPrice(selectedOrder.total)}</p>
                                </div>
                                <div><h3 className="font-semibold mb-2">Items</h3>
                                    {(selectedOrder.itemsList || selectedOrder.items || []).map((item, idx) => (
                                        <div key={idx} className="flex justify-between p-2 border-b"><span>{item.name} x {item.quantity}</span><span>{formatPrice(item.price * item.quantity)}</span></div>
                                    ))}
                                </div>
                                <div className="flex gap-3 pt-4">
                                    <button onClick={() => setSelectedOrder(null)} className="flex-1 bg-gray-500 text-white py-2 rounded-lg">Close</button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Orders;