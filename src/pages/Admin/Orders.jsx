// src/pages/Admin/Orders.jsx
import { useState, useEffect } from "react";
import { 
    FiEye, FiCheckCircle, FiXCircle, FiTruck, FiSearch, FiRefreshCw, 
    FiPackage, FiUser, FiCalendar, FiDollarSign, FiMessageSquare,
    FiShield, FiClock, FiCheck, FiX, FiFilter, FiMapPin, FiPhone,
    FiMail, FiInfo, FiEdit2, FiPrinter, FiDownload, FiMail as FiMailIcon,
    FiAlertCircle, FiLoader, FiArrowLeft, FiArrowRight, FiTruck as FiDeliveryTruck,
    FiCreditCard, FiHome
} from "react-icons/fi";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import orderService from "../../services/orderService";

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
    const [notifyingOrderId, setNotifyingOrderId] = useState(null);

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
        
        try {
            const allOrders = await orderService.getAllOrders();
            console.log(`📦 Loaded ${allOrders.length} orders from IndexedDB`);
            
            allOrders.sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt));
            
            const start = (currentPage - 1) * itemsPerPage;
            const paginatedOrders = allOrders.slice(start, start + itemsPerPage);
            
            setOrders(paginatedOrders);
            setFilteredOrders(paginatedOrders);
            setTotalPages(Math.ceil(allOrders.length / itemsPerPage));
            calculateStats(allOrders);
            
            const token = getToken();
            if (token) {
                try {
                    const response = await fetch(`${API_URL}/orders`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (response.ok) {
                        const data = await response.json();
                        if (data.success && data.orders && data.orders.length > 0) {
                            const backendOrders = formatOrders(data.orders);
                            const mergedOrders = mergeOrders(allOrders, backendOrders);
                            setOrders(mergedOrders.slice(start, start + itemsPerPage));
                            setFilteredOrders(mergedOrders.slice(start, start + itemsPerPage));
                            setTotalPages(Math.ceil(mergedOrders.length / itemsPerPage));
                            calculateStats(mergedOrders);
                        }
                    }
                } catch (error) {
                    console.log("Backend not available, using local data only");
                }
            }
        } catch (error) {
            console.error("Error loading orders:", error);
            setError(error.message);
            await loadLocalOrders();
        } finally {
            setLoading(false);
        }
    };
    
    const mergeOrders = (localOrders, backendOrders) => {
        const orderMap = new Map();
        
        localOrders.forEach(order => {
            const id = order.id || order.orderId;
            if (id) orderMap.set(id, order);
        });
        
        backendOrders.forEach(order => {
            const id = order.id || order.orderId;
            if (id) {
                if (orderMap.has(id)) {
                    const existing = orderMap.get(id);
                    orderMap.set(id, { ...existing, ...order });
                } else {
                    orderMap.set(id, order);
                }
            }
        });
        
        return Array.from(orderMap.values());
    };
    
    const loadLocalOrders = async () => {
        try {
            const allOrders = await orderService.getAllOrders();
            const sortedOrders = allOrders.sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt));
            const start = (currentPage - 1) * itemsPerPage;
            const paginatedOrders = sortedOrders.slice(start, start + itemsPerPage);
            
            setOrders(paginatedOrders);
            setFilteredOrders(paginatedOrders);
            setTotalPages(Math.ceil(sortedOrders.length / itemsPerPage));
            calculateStats(sortedOrders);
        } catch (error) {
            console.error("Error loading local orders:", error);
            setOrders([]);
            setFilteredOrders([]);
            setTotalPages(1);
            calculateStats([]);
        }
    };
    
    const formatOrders = (backendOrders) => {
        return backendOrders.map(order => ({
            id: order._id || order.orderId || order.id,
            orderId: order.orderId || order.id,
            customerName: order.customerName || order.shippingAddress?.name || 'Guest',
            customerEmail: order.customerEmail || order.userEmail || '',
            customerPhone: order.customerPhone || order.shippingAddress?.phone || '',
            date: order.createdAt || order.date || new Date().toISOString(),
            items: order.items || order.itemsList || [],
            itemsList: order.items || order.itemsList || [],
            itemsCount: order.itemsCount || order.items?.length || 0,
            subtotal: order.subtotal || 0,
            shippingFee: order.shippingFee || 0,
            taxAmount: order.taxAmount || 0,
            discount: order.discount || 0,
            total: order.total || 0,
            paymentMethod: order.paymentMethod || 'N/A',
            paymentStatus: order.paymentStatus || 'pending',
            status: order.status || order.orderStatus || 'pending',
            orderStatus: order.orderStatus || order.status || 'pending',
            shippingAddress: order.shippingAddress || order.address || '',
            billingAddress: order.billingAddress || '',
            notes: order.notes || '',
            trackingNumber: order.trackingNumber || '',
            trackingUrl: order.trackingUrl || '',
            statusHistory: order.statusHistory || [],
            createdAt: order.createdAt || order.date || new Date().toISOString(),
            updatedAt: order.updatedAt || new Date().toISOString()
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
        
        try {
            const updated = await orderService.updateOrderStatus(orderId, newStatus);
            
            if (updated) {
                const updatedOrders = orders.map(o => {
                    if ((o.id === orderId || o.orderId === orderId)) {
                        return { ...o, status: newStatus, orderStatus: newStatus };
                    }
                    return o;
                });
                setOrders(updatedOrders);
                calculateStats(updatedOrders);
                
                const updatedFiltered = filteredOrders.map(o => {
                    if ((o.id === orderId || o.orderId === orderId)) {
                        return { ...o, status: newStatus, orderStatus: newStatus };
                    }
                    return o;
                });
                setFilteredOrders(updatedFiltered);
                
                if (selectedOrder && (selectedOrder.id === orderId || selectedOrder.orderId === orderId)) {
                    setSelectedOrder({ ...selectedOrder, status: newStatus, orderStatus: newStatus });
                }
                
                toast.success(`Order ${orderId} status updated to ${newStatus}`);
                await notifyCustomer(orderId, newStatus);
            } else {
                throw new Error("Failed to update order status");
            }
        } catch (error) {
            console.error("Error updating order status:", error);
            toast.error(`Failed to update order status: ${error.message}`);
        } finally {
            setUpdatingStatus(null);
        }
    };

    const notifyCustomer = async (orderId, newStatus) => {
        try {
            const order = orders.find(o => o.id === orderId || o.orderId === orderId);
            if (!order) return;
            
            const notification = {
                id: Date.now(),
                orderId: orderId,
                title: `Order ${newStatus.charAt(0).toUpperCase() + newStatus.slice(1)}!`,
                message: `Your order #${orderId} has been ${newStatus}. ${newStatus === 'delivered' ? 'Thank you for shopping with us!' : newStatus === 'shipped' ? 'Your package is on the way!' : ''}`,
                type: 'order',
                read: false,
                date: new Date().toISOString()
            };
            
            const notifications = JSON.parse(localStorage.getItem(`notifications_${order.customerEmail}`) || '[]');
            notifications.unshift(notification);
            localStorage.setItem(`notifications_${order.customerEmail}`, JSON.stringify(notifications.slice(0, 50)));
            
            const token = getToken();
            if (token) {
                try {
                    await fetch(`${API_URL}/orders/${orderId}/notify`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({ 
                            status: newStatus,
                            customerEmail: order.customerEmail,
                            orderDetails: order
                        })
                    });
                } catch (emailError) {
                    console.log("Email notification failed, but local notification saved");
                }
            }
            
            toast.info(`Notification sent to customer ${order.customerEmail || 'Guest'}`);
        } catch (error) {
            console.error("Error sending notification:", error);
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

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        try {
            return new Date(dateString).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch {
            return 'N/A';
        }
    };
    
    const formatPrice = (price) => `${currencySymbol}${(price || 0).toFixed(2)}`;

    const getValidImageUrl = (image) => {
        if (!image) return 'https://via.placeholder.com/60x60?text=No+Image';
        if (image.startsWith('data:') || image.startsWith('http')) return image;
        return 'https://via.placeholder.com/60x60?text=No+Image';
    };

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
                <button onClick={loadOrders} className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-colors">
                    <FiRefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh
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
                            className="w-full pl-10 pr-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600" 
                        />
                    </div>
                    <select 
                        value={statusFilter} 
                        onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }} 
                        className="px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
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
                        className="px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600" 
                    />
                    <input 
                        type="date" 
                        value={dateRange.end} 
                        onChange={(e) => { setDateRange({...dateRange, end: e.target.value}); setCurrentPage(1); }} 
                        className="px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600" 
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
                                    <th className="px-4 py-3 text-left">Address</th>
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
                                    const items = order.itemsList || order.items || [];
                                    const customerName = order.customerName || order.shippingAddress?.name || 'Guest';
                                    const customerEmail = order.customerEmail || order.userEmail || '';
                                    const shippingAddress = order.shippingAddress || order.address || '';
                                    
                                    return (
                                        <tr key={order.id || order.orderId} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                            <td className="px-4 py-3 font-mono text-sm font-semibold dark:text-white">
                                                {order.orderId || order.id}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div>
                                                    <p className="font-medium dark:text-white">{customerName}</p>
                                                    <p className="text-xs text-gray-500">{customerEmail}</p>
                                                    {order.customerPhone && (
                                                        <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                                                            <FiPhone size={10} /> {order.customerPhone}
                                                        </p>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                {shippingAddress ? (
                                                    <div className="text-xs text-gray-600 dark:text-gray-400 max-w-xs">
                                                        <p className="line-clamp-2">{shippingAddress}</p>
                                                        <button 
                                                            onClick={() => setSelectedOrder(order)}
                                                            className="text-blue-600 hover:underline text-[10px] mt-1 flex items-center gap-1"
                                                        >
                                                            <FiMapPin size={10} /> View Full Address
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-gray-400">No address</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-sm dark:text-gray-300">{formatDate(order.date || order.createdAt)}</td>
                                            <td className="px-4 py-3 text-center">
                                                <div className="flex items-center justify-center gap-1">
                                                    <span className="inline-flex items-center justify-center w-8 h-8 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full text-sm font-semibold">
                                                        {items.length}
                                                    </span>
                                                    {items.length > 0 && (
                                                        <div className="flex -space-x-2">
                                                            {items.slice(0, 3).map((item, idx) => (
                                                                <img 
                                                                    key={idx}
                                                                    src={getValidImageUrl(item.image)} 
                                                                    alt={item.name}
                                                                    className="w-6 h-6 rounded-full border-2 border-white dark:border-gray-800 object-cover"
                                                                    onError={(e) => { e.target.src = 'https://via.placeholder.com/24x24?text=?'; }}
                                                                />
                                                            ))}
                                                            {items.length > 3 && (
                                                                <span className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-600 text-xs flex items-center justify-center border-2 border-white dark:border-gray-800">
                                                                    +{items.length - 3}
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 font-semibold text-green-600 dark:text-green-400">{formatPrice(order.total)}</td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    {getStatusIcon(orderStatus)}
                                                    <select 
                                                        value={orderStatus} 
                                                        onChange={(e) => updateOrderStatus(order.id || order.orderId, e.target.value)} 
                                                        disabled={updatingStatus === (order.id || order.orderId)} 
                                                        className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusBadge(orderStatus)} border-0 cursor-pointer dark:bg-gray-700 dark:text-white`}
                                                    >
                                                        <option value="pending">Pending</option>
                                                        <option value="processing">Processing</option>
                                                        <option value="shipped">Shipped</option>
                                                        <option value="delivered">Delivered</option>
                                                        <option value="cancelled">Cancelled</option>
                                                    </select>
                                                    {updatingStatus === (order.id || order.orderId) && (
                                                        <FiLoader className="animate-spin text-blue-500" size={14} />
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex gap-2 flex-wrap">
                                                    <button 
                                                        onClick={() => setSelectedOrder(order)} 
                                                        className="text-blue-600 hover:text-blue-800 p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors" 
                                                        title="View Details"
                                                    >
                                                        <FiEye size={18} />
                                                    </button>
                                                    <button 
                                                        onClick={async () => {
                                                            if (!order.customerEmail) {
                                                                toast.warning("No customer email to notify");
                                                                return;
                                                            }
                                                            setNotifyingOrderId(order.id || order.orderId);
                                                            await notifyCustomer(order.id || order.orderId, orderStatus);
                                                            setNotifyingOrderId(null);
                                                        }}
                                                        className="text-purple-600 hover:text-purple-800 p-1.5 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors" 
                                                        title="Notify Customer"
                                                        disabled={notifyingOrderId === (order.id || order.orderId)}
                                                    >
                                                        {notifyingOrderId === (order.id || order.orderId) ? 
                                                            <FiLoader className="animate-spin" size={18} /> : 
                                                            <FiMailIcon size={18} />
                                                        }
                                                    </button>
                                                    <button 
                                                        onClick={() => {
                                                            const printWindow = window.open('', '_blank');
                                                            printWindow.document.write(`...`); // Full print content
                                                            printWindow.document.close();
                                                            printWindow.print();
                                                        }} 
                                                        className="text-gray-600 hover:text-gray-800 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" 
                                                        title="Print Invoice"
                                                    >
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
                        <button 
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} 
                            disabled={currentPage === 1} 
                            className="px-4 py-2 border rounded-lg disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                            <FiArrowLeft size={16} /> Previous
                        </button>
                        <button 
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} 
                            disabled={currentPage === totalPages} 
                            className="px-4 py-2 border rounded-lg disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                            Next <FiArrowRight size={16} />
                        </button>
                    </div>
                </div>
            )}

            {/* Order Details Modal */}
            <AnimatePresence>
                {selectedOrder && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={() => setSelectedOrder(null)}>
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.9 }} 
                            animate={{ opacity: 1, scale: 1 }} 
                            exit={{ opacity: 0, scale: 0.9 }} 
                            className="bg-white dark:bg-gray-800 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6" 
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex justify-between items-center mb-4 sticky top-0 bg-white dark:bg-gray-800 pb-2 border-b dark:border-gray-700">
                                <h2 className="text-2xl font-bold dark:text-white">Order Details</h2>
                                <button onClick={() => setSelectedOrder(null)} className="text-gray-500 hover:text-gray-700 text-2xl p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                                    <FiX size={24} />
                                </button>
                            </div>
                            
                            <div className="space-y-4">
                                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-xl">
                                    <div className="grid grid-cols-2 gap-2 text-sm">
                                        <div><span className="font-medium">Order ID:</span> <span className="font-mono">{selectedOrder.orderId || selectedOrder.id}</span></div>
                                        <div><span className="font-medium">Status:</span> <span className={`px-2 py-0.5 rounded-full text-xs ${getStatusBadge(selectedOrder.status || selectedOrder.orderStatus)}`}>{selectedOrder.status || selectedOrder.orderStatus}</span></div>
                                        <div><span className="font-medium">Customer:</span> {selectedOrder.customerName || selectedOrder.customerEmail}</div>
                                        <div><span className="font-medium">Email:</span> {selectedOrder.customerEmail}</div>
                                        <div><span className="font-medium">Phone:</span> {selectedOrder.customerPhone || 'N/A'}</div>
                                        <div><span className="font-medium">Payment:</span> {selectedOrder.paymentMethod || 'N/A'}</div>
                                        <div><span className="font-medium">Date:</span> {formatDate(selectedOrder.date || selectedOrder.createdAt)}</div>
                                        <div><span className="font-medium">Total:</span> <span className="text-lg font-bold text-green-600">{formatPrice(selectedOrder.total)}</span></div>
                                    </div>
                                </div>

                                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl">
                                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                                        <FiMapPin className="text-blue-600" /> Shipping Address
                                    </h3>
                                    <div className="text-sm">
                                        <p className="font-medium">{selectedOrder.customerName || 'Guest'}</p>
                                        <p className="whitespace-pre-wrap">{selectedOrder.shippingAddress || selectedOrder.address || 'No address provided'}</p>
                                        {selectedOrder.customerPhone && <p className="mt-1 flex items-center gap-1"><FiPhone size={12} /> {selectedOrder.customerPhone}</p>}
                                    </div>
                                </div>

                                <div>
                                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                                        <FiPackage className="text-blue-600" /> Items ({selectedOrder.itemsList?.length || selectedOrder.items?.length || 0})
                                    </h3>
                                    <div className="space-y-2 max-h-60 overflow-y-auto">
                                        {(selectedOrder.itemsList || selectedOrder.items || []).map((item, idx) => (
                                            <div key={idx} className="flex items-center gap-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                                                <img 
                                                    src={getValidImageUrl(item.image)} 
                                                    alt={item.name} 
                                                    className="w-16 h-16 object-cover rounded-lg border border-gray-200 dark:border-gray-600"
                                                    onError={(e) => { e.target.src = 'https://via.placeholder.com/64x64?text=No+Image'; }}
                                                />
                                                <div className="flex-1">
                                                    <p className="font-medium dark:text-white">{item.name}</p>
                                                    <div className="flex flex-wrap gap-2 text-xs text-gray-500 dark:text-gray-400">
                                                        <span>Size: {item.size || 'N/A'}</span>
                                                        <span>Color: {item.color || 'N/A'}</span>
                                                        <span>Qty: {item.quantity}</span>
                                                        <span>Price: {formatPrice(item.price)}</span>
                                                    </div>
                                                </div>
                                                <div className="text-right font-semibold text-green-600">
                                                    {formatPrice((item.price || 0) * (item.quantity || 1))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="border-t dark:border-gray-700 pt-3">
                                    <div className="space-y-1 text-sm">
                                        <div className="flex justify-between"><span className="text-gray-500">Subtotal:</span> <span>{formatPrice(selectedOrder.subtotal || 0)}</span></div>
                                        <div className="flex justify-between"><span className="text-gray-500">Shipping:</span> <span>{selectedOrder.shippingFee === 0 ? 'Free' : formatPrice(selectedOrder.shippingFee || 0)}</span></div>
                                        <div className="flex justify-between"><span className="text-gray-500">Tax:</span> <span>{formatPrice(selectedOrder.taxAmount || 0)}</span></div>
                                        {selectedOrder.discount > 0 && (
                                            <div className="flex justify-between text-green-600"><span>Discount:</span> <span>-{formatPrice(selectedOrder.discount)}</span></div>
                                        )}
                                        <div className="border-t dark:border-gray-700 pt-2 mt-2">
                                            <div className="flex justify-between font-bold text-lg">
                                                <span>Total:</span>
                                                <span className="text-green-600">{formatPrice(selectedOrder.total)}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="border-t dark:border-gray-700 pt-4">
                                    <h3 className="font-semibold mb-2">Update Status</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {['pending', 'processing', 'shipped', 'delivered', 'cancelled'].map(status => (
                                            <button
                                                key={status}
                                                onClick={() => {
                                                    updateOrderStatus(selectedOrder.id || selectedOrder.orderId, status);
                                                    setSelectedOrder({ ...selectedOrder, status, orderStatus: status });
                                                }}
                                                disabled={updatingStatus === (selectedOrder.id || selectedOrder.orderId)}
                                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                                    (selectedOrder.status || selectedOrder.orderStatus) === status
                                                        ? `bg-${getStatusBadge(status).split(' ')[0].replace('bg-', '')} text-${getStatusBadge(status).split(' ')[1].replace('text-', '')} border-2 border-current`
                                                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                                }`}
                                            >
                                                {status.charAt(0).toUpperCase() + status.slice(1)}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex flex-wrap gap-3 pt-4 border-t dark:border-gray-700">
                                    <button onClick={() => setSelectedOrder(null)} className="flex-1 bg-gray-500 text-white py-2 rounded-lg font-semibold hover:bg-gray-600 transition-all">
                                        Close
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

export default Orders;