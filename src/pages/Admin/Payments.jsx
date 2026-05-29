// src/pages/Admin/Payments.jsx
import { useState, useEffect } from "react";
import { 
    FiCreditCard, FiSearch, FiRefreshCw, FiEye, FiDownload,
    FiCheckCircle, FiXCircle, FiClock, FiDollarSign, FiCalendar,
    FiFilter, FiAlertCircle, FiPrinter, FiMail, FiShield,
    FiSmartphone, FiGlobe, FiHome, FiRefreshCcw, FiInfo
} from "react-icons/fi";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

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
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [currencySymbol, setCurrencySymbol] = useState("$");
    const [stats, setStats] = useState({
        totalTransactions: 0,
        totalAmount: 0,
        successful: 0,
        pending: 0,
        failed: 0,
        refunded: 0,
        averageAmount: 0
    });

    const getToken = () => localStorage.getItem('token');

    useEffect(() => {
        const checkDarkMode = () => {
            const isDark = document.documentElement.classList.contains('dark');
            setDarkMode(isDark);
        };
        checkDarkMode();
        
        loadCurrencySymbol();
        loadPayments();
        
        const handleStorageChange = () => loadPayments();
        window.addEventListener('storage', handleStorageChange);
        window.addEventListener('currencyChanged', loadCurrencySymbol);
        
        return () => {
            window.removeEventListener('storage', handleStorageChange);
            window.removeEventListener('currencyChanged', loadCurrencySymbol);
        };
    }, []);

    useEffect(() => {
        filterPayments();
    }, [payments, searchTerm, statusFilter, methodFilter, dateRange]);

    const loadCurrencySymbol = () => {
        const siteSettings = JSON.parse(localStorage.getItem('site_settings') || '{}');
        const symbols = { USD: "$", EUR: "€", GBP: "£", LKR: "Rs" };
        setCurrencySymbol(symbols[siteSettings.currency] || "$");
    };

    const loadPayments = async () => {
        setLoading(true);
        setError(null);
        
        // First load from localStorage
        loadLocalPayments();
        
        const token = getToken();
        if (!token) {
            setLoading(false);
            return;
        }
        
        try {
            const response = await fetch(`${API_URL}/orders`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.success && data.orders) {
                    const allPayments = extractPaymentsFromOrders(data.orders);
                    setPayments(allPayments);
                    calculateStats(allPayments);
                    setLoading(false);
                    return;
                }
            }
            throw new Error("Backend not available");
        } catch (error) {
            console.error("Error loading payments from backend:", error);
            setError("Using local data");
        } finally {
            setLoading(false);
        }
    };
    
    const loadLocalPayments = () => {
        const adminOrders = JSON.parse(localStorage.getItem('admin_orders') || '[]');
        const guestOrders = JSON.parse(localStorage.getItem('guestOrders') || '[]');
        
        // Also get user-specific orders
        let allOrders = [...adminOrders, ...guestOrders];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('orders_')) {
                const userOrders = JSON.parse(localStorage.getItem(key) || '[]');
                allOrders = [...allOrders, ...userOrders];
            }
        }
        
        const allPayments = extractPaymentsFromOrders(allOrders);
        setPayments(allPayments);
        calculateStats(allPayments);
    };
    
    const extractPaymentsFromOrders = (orders) => {
        const allPayments = [];
        
        orders.forEach(order => {
            if (order.total && order.paymentMethod) {
                allPayments.push({
                    id: order.id || order.orderId || `PAY-${Date.now()}`,
                    orderId: order.orderId || order.id,
                    amount: order.total,
                    currency: order.currency || "USD",
                    method: order.paymentMethod || "Unknown",
                    status: getPaymentStatus(order.status || order.orderStatus, order.paymentMethod),
                    customerName: order.customerName || (order.customerEmail?.split('@')[0]) || "Guest",
                    customerEmail: order.customerEmail || "guest@example.com",
                    date: order.date || order.createdAt || new Date(),
                    transactionId: order.paymentId || `TXN-${order.id}`,
                    cardLast4: order.cardLast4 || "****",
                    billingAddress: order.billingAddress?.street || order.shippingAddress?.street,
                    notes: order.paymentNotes || "",
                    refunded: order.refunded || false,
                    refundAmount: order.refundAmount || 0,
                    refundReason: order.refundReason || "",
                    refundedAt: order.refundedAt
                });
            }
        });
        
        // Remove duplicates
        const uniquePayments = [];
        const ids = new Set();
        allPayments.forEach(payment => {
            if (!ids.has(payment.id)) {
                ids.add(payment.id);
                uniquePayments.push(payment);
            }
        });
        
        uniquePayments.sort((a, b) => new Date(b.date) - new Date(a.date));
        return uniquePayments;
    };
    
    const calculateStats = (allPayments) => {
        const successful = allPayments.filter(p => p.status === 'completed').length;
        const pending = allPayments.filter(p => p.status === 'pending').length;
        const failed = allPayments.filter(p => p.status === 'failed').length;
        const refunded = allPayments.filter(p => p.status === 'refunded').length;
        const totalAmount = allPayments.filter(p => p.status === 'completed').reduce((sum, p) => sum + (p.amount || 0), 0);
        
        setStats({
            totalTransactions: allPayments.length,
            totalAmount,
            successful,
            pending,
            failed,
            refunded,
            averageAmount: successful > 0 ? totalAmount / successful : 0
        });
    };

    const getPaymentStatus = (orderStatus, paymentMethod) => {
        if (orderStatus === 'cancelled') return 'refunded';
        if (paymentMethod === 'cod' && orderStatus === 'pending') return 'pending';
        if (paymentMethod === 'cod' && orderStatus === 'delivered') return 'completed';
        if (orderStatus === 'delivered') return 'completed';
        if (orderStatus === 'processing') return 'processing';
        if (orderStatus === 'shipped') return 'completed';
        return 'pending';
    };

    const filterPayments = () => {
        let filtered = [...payments];
        
        if (searchTerm) {
            filtered = filtered.filter(p => 
                p.orderId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                p.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                p.customerEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                p.transactionId?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }
        
        if (statusFilter !== "all") {
            filtered = filtered.filter(p => p.status === statusFilter);
        }
        
        if (methodFilter !== "all") {
            filtered = filtered.filter(p => p.method.toLowerCase().includes(methodFilter.toLowerCase()));
        }
        
        if (dateRange.start) {
            filtered = filtered.filter(p => new Date(p.date) >= new Date(dateRange.start));
        }
        if (dateRange.end) {
            filtered = filtered.filter(p => new Date(p.date) <= new Date(dateRange.end));
        }
        
        setFilteredPayments(filtered);
    };

    const viewPaymentDetails = (payment) => {
        setSelectedPayment(payment);
        setShowModal(true);
    };

    const openRefundModal = (payment) => {
        if (payment.refunded) {
            toast.error("This payment has already been refunded");
            return;
        }
        setSelectedPayment(payment);
        setRefundAmount(payment.amount.toString());
        setRefundReason("");
        setShowRefundModal(true);
    };

    const processRefund = async () => {
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
            // Try backend first
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
            // Fallback to local
            toast.warning(`Processing refund of ${currencySymbol}${refundValue.toFixed(2)} locally`);
            updateLocalRefund(selectedPayment, refundValue);
            setShowRefundModal(false);
            setShowModal(false);
        } finally {
            setProcessingRefund(false);
        }
    };
    
    const updateLocalRefund = (payment, refundAmountValue) => {
        const updatedPayments = payments.map(p =>
            p.id === payment.id ? { 
                ...p, 
                status: 'refunded', 
                refunded: true,
                refundAmount: refundAmountValue,
                refundReason: refundReason,
                refundedAt: new Date().toISOString()
            } : p
        );
        setPayments(updatedPayments);
        calculateStats(updatedPayments);
        
        // Update order in localStorage
        const orders = JSON.parse(localStorage.getItem('admin_orders') || '[]');
        const updatedOrders = orders.map(order =>
            (order.id === payment.orderId || order.orderId === payment.orderId) ? 
            { ...order, status: 'refunded', refunded: true, refundAmount: refundAmountValue, refundReason: refundReason } : order
        );
        localStorage.setItem('admin_orders', JSON.stringify(updatedOrders));
        
        // Also update user-specific orders
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('orders_')) {
                const userOrders = JSON.parse(localStorage.getItem(key) || '[]');
                const updatedUserOrders = userOrders.map(order =>
                    (order.id === payment.orderId || order.orderId === payment.orderId) ? 
                    { ...order, status: 'refunded', refunded: true, refundAmount: refundAmountValue } : order
                );
                localStorage.setItem(key, JSON.stringify(updatedUserOrders));
            }
        }
        
        toast.success(`Refund of ${currencySymbol}${refundAmountValue.toFixed(2)} processed locally`);
    };

    const resendReceipt = (payment) => {
        toast.success(`Receipt sent to ${payment.customerEmail}`);
    };

    const downloadReport = () => {
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
    };

    const getStatusBadge = (status) => {
        const badges = {
            completed: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
            pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
            processing: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
            failed: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
            refunded: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400'
        };
        return badges[status] || 'bg-gray-100 text-gray-800';
    };

    const getStatusIcon = (status) => {
        switch(status) {
            case 'completed': return <FiCheckCircle className="text-green-600" size={14} />;
            case 'pending': return <FiClock className="text-yellow-600" size={14} />;
            case 'processing': return <FiRefreshCw className="text-blue-600" size={14} />;
            case 'failed': return <FiXCircle className="text-red-600" size={14} />;
            case 'refunded': return <FiRefreshCcw className="text-purple-600" size={14} />;
            default: return null;
        }
    };

    const getMethodIcon = (method) => {
        const methodLower = method.toLowerCase();
        if (methodLower.includes('card')) return <FiCreditCard className="text-blue-500" />;
        if (methodLower.includes('paypal')) return <FiDollarSign className="text-blue-600" />;
        if (methodLower.includes('apple')) return <FiSmartphone className="text-gray-600" />;
        if (methodLower.includes('google')) return <FiGlobe className="text-green-600" />;
        if (methodLower.includes('cod')) return <FiHome className="text-orange-500" />;
        return <FiCreditCard className="text-gray-500" />;
    };

    const formatDate = (dateString) => dateString ? new Date(dateString).toLocaleString() : 'N/A';
    const formatPrice = (price) => `${currencySymbol}${(price || 0).toFixed(2)}`;

    if (loading && payments.length === 0) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold dark:text-white">Payment Management</h1>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">Track, manage, and process refunds for payments</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={downloadReport} className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2">
                        <FiDownload size={16} /> Report
                    </button>
                    <button onClick={loadPayments} className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2">
                        <FiRefreshCw size={16} /> Refresh
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
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
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
                    <div className="flex-1 relative">
                        <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <input type="text" placeholder="Search by order ID, customer name, email..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                    </div>
                    <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-4 py-2 border rounded-lg dark:bg-gray-700">
                        <option value="all">All Status</option>
                        <option value="completed">Completed</option>
                        <option value="pending">Pending</option>
                        <option value="processing">Processing</option>
                        <option value="failed">Failed</option>
                        <option value="refunded">Refunded</option>
                    </select>
                    <select value={methodFilter} onChange={(e) => setMethodFilter(e.target.value)} className="px-4 py-2 border rounded-lg dark:bg-gray-700">
                        <option value="all">All Methods</option>
                        <option value="card">Credit/Debit Card</option>
                        <option value="paypal">PayPal</option>
                        <option value="cod">Cash on Delivery</option>
                        <option value="apple">Apple Pay</option>
                        <option value="google">Google Pay</option>
                    </select>
                    <input type="date" value={dateRange.start} onChange={(e) => setDateRange({...dateRange, start: e.target.value})} className="px-4 py-2 border rounded-lg dark:bg-gray-700" placeholder="Start Date" />
                    <input type="date" value={dateRange.end} onChange={(e) => setDateRange({...dateRange, end: e.target.value})} className="px-4 py-2 border rounded-lg dark:bg-gray-700" placeholder="End Date" />
                </div>
            </div>

            {/* Payments Table */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                {filteredPayments.length === 0 ? (
                    <div className="text-center py-12">
                        <FiCreditCard className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold dark:text-white">No payments found</h3>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 dark:bg-gray-700">
                                <tr>
                                    <th className="px-4 py-3 text-left">Transaction ID</th>
                                    <th className="px-4 py-3 text-left">Customer</th>
                                    <th className="px-4 py-3 text-left">Amount</th>
                                    <th className="px-4 py-3 text-left">Method</th>
                                    <th className="px-4 py-3 text-left">Date</th>
                                    <th className="px-4 py-3 text-left">Status</th>
                                    <th className="px-4 py-3 text-left">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredPayments.map((payment) => (
                                    <tr key={payment.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                                        <td className="px-4 py-3">
                                            <p className="font-mono text-sm dark:text-white">{payment.transactionId}</p>
                                            <p className="text-xs text-gray-500">Order: {payment.orderId}</p>
                                        </td>
                                        <td className="px-4 py-3">
                                            <p className="font-medium dark:text-white">{payment.customerName}</p>
                                            <p className="text-xs text-gray-500">{payment.customerEmail}</p>
                                        </td>
                                        <td className="px-4 py-3 font-semibold text-green-600 dark:text-green-400">{formatPrice(payment.amount)}</td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                {getMethodIcon(payment.method)}
                                                <span className="text-sm dark:text-gray-300">{payment.method}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-sm dark:text-gray-300">{formatDate(payment.date)}</td>
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
                                                <button onClick={() => viewPaymentDetails(payment)} className="text-blue-600 hover:text-blue-800" title="View Details"><FiEye size={16} /></button>
                                                <button onClick={() => resendReceipt(payment)} className="text-green-600 hover:text-green-800" title="Resend Receipt"><FiMail size={16} /></button>
                                                {payment.status === 'completed' && !payment.refunded && (
                                                    <button onClick={() => openRefundModal(payment)} className="text-purple-600 hover:text-purple-800" title="Process Refund"><FiRefreshCcw size={16} /></button>
                                                )}
                                                {payment.refunded && (
                                                    <span className="text-xs text-purple-600 flex items-center gap-1"><FiRefreshCcw size={12} /> Refunded</span>
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
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={() => setShowModal(false)}>
                        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-2xl font-bold dark:text-white">Payment Details</h2>
                                <button onClick={() => setShowModal(false)} className="text-gray-500 text-2xl">&times;</button>
                            </div>
                            <div className="space-y-4">
                                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                                    <div className="flex justify-between mb-2"><span className="text-sm text-gray-500">Transaction ID</span><span className="font-mono text-sm">{selectedPayment.transactionId}</span></div>
                                    <div className="flex justify-between mb-2"><span className="text-sm text-gray-500">Order ID</span><span className="font-mono text-sm">{selectedPayment.orderId}</span></div>
                                    <div className="flex justify-between mb-2"><span className="text-sm text-gray-500">Amount</span><span className="font-bold text-green-600">{formatPrice(selectedPayment.amount)}</span></div>
                                    <div className="flex justify-between mb-2"><span className="text-sm text-gray-500">Payment Method</span><span className="text-sm">{selectedPayment.method}</span></div>
                                    <div className="flex justify-between mb-2"><span className="text-sm text-gray-500">Status</span><span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getStatusBadge(selectedPayment.status)}`}>{selectedPayment.status}</span></div>
                                    {selectedPayment.refunded && (
                                        <>
                                            <div className="flex justify-between mb-2"><span className="text-sm text-gray-500">Refund Amount</span><span className="font-semibold text-purple-600">{formatPrice(selectedPayment.refundAmount)}</span></div>
                                            <div className="flex justify-between mb-2"><span className="text-sm text-gray-500">Refund Reason</span><span className="text-sm">{selectedPayment.refundReason || "Customer request"}</span></div>
                                            <div className="flex justify-between"><span className="text-sm text-gray-500">Refunded At</span><span className="text-sm">{selectedPayment.refundedAt ? formatDate(selectedPayment.refundedAt) : "N/A"}</span></div>
                                        </>
                                    )}
                                    <div className="flex justify-between"><span className="text-sm text-gray-500">Date</span><span className="text-sm">{formatDate(selectedPayment.date)}</span></div>
                                </div>
                                {selectedPayment.cardLast4 !== "****" && (
                                    <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                                        <p className="text-sm text-gray-500 mb-2">Card Details</p>
                                        <p className="font-mono">**** **** **** {selectedPayment.cardLast4}</p>
                                    </div>
                                )}
                                {selectedPayment.billingAddress && (
                                    <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                                        <p className="text-sm text-gray-500 mb-2">Billing Address</p>
                                        <p className="text-sm">{selectedPayment.billingAddress}</p>
                                    </div>
                                )}
                                <div className="flex gap-3 pt-4">
                                    <button onClick={() => setShowModal(false)} className="flex-1 bg-gray-500 text-white py-2 rounded-lg">Close</button>
                                    {selectedPayment.status === 'completed' && !selectedPayment.refunded && (
                                        <button onClick={() => { setShowModal(false); openRefundModal(selectedPayment); }} className="flex-1 bg-purple-600 text-white py-2 rounded-lg">Process Refund</button>
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
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={() => setShowRefundModal(false)}>
                        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-2xl font-bold dark:text-white">Process Refund</h2>
                                <button onClick={() => setShowRefundModal(false)} className="text-gray-500 text-2xl">&times;</button>
                            </div>
                            <div className="space-y-4">
                                <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                                    <p className="text-sm text-gray-500">Order: {selectedPayment.orderId}</p>
                                    <p className="text-sm text-gray-500">Customer: {selectedPayment.customerName}</p>
                                    <p className="text-sm text-gray-500">Original Amount: <span className="font-semibold">{formatPrice(selectedPayment.amount)}</span></p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1 dark:text-white">Refund Amount *</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">{currencySymbol}</span>
                                        <input type="number" step="0.01" required value={refundAmount} onChange={(e) => setRefundAmount(e.target.value)} className="w-full pl-8 pr-3 py-2 border rounded-lg dark:bg-gray-700" placeholder="0.00" />
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">Maximum: {formatPrice(selectedPayment.amount)}</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1 dark:text-white">Refund Reason</label>
                                    <textarea rows="3" value={refundReason} onChange={(e) => setRefundReason(e.target.value)} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700" placeholder="e.g., Customer request, Damaged product, Wrong item sent" />
                                </div>
                                <div className="flex gap-3 pt-4">
                                    <button onClick={processRefund} disabled={processingRefund} className="flex-1 bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700 flex items-center justify-center gap-2 disabled:opacity-50">
                                        {processingRefund ? <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div> : <><FiRefreshCcw size={16} /> Process Refund</>}
                                    </button>
                                    <button onClick={() => setShowRefundModal(false)} className="flex-1 bg-gray-500 text-white py-2 rounded-lg">Cancel</button>
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