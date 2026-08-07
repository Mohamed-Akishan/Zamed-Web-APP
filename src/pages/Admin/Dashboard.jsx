// src/pages/Admin/Dashboard.jsx
import { useState, useEffect } from "react";
import {
    FiPackage, FiShoppingBag, FiUsers, FiDollarSign, FiTrendingUp,
    FiTruck, FiRefreshCw, FiEye, FiAlertCircle,
    FiShoppingCart, FiArrowUp, FiClock, FiCheckCircle,
    FiXCircle, FiLoader, FiBarChart2, FiCalendar
} from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import orderService from "../../services/orderService";
import productService from "../../services/productService";

// ============================================================
// FIX: Correct API URL for Vercel
// ============================================================
const API_URL = import.meta.env.VITE_API_URL || 
  (window.location.hostname.includes('vercel.app') 
    ? 'https://zamed-backend-1.onrender.com/api'
    : 'http://localhost:5000/api');

// Also try the health endpoint to test connectivity
const API_HEALTH_URL = import.meta.env.VITE_API_URL || 
  (window.location.hostname.includes('vercel.app') 
    ? 'https://zamed-backend-1.onrender.com/api/health'
    : 'http://localhost:5000/api/health');

const Dashboard = () => {
    const [stats, setStats] = useState({
        totalProducts: 0,
        totalOrders: 0,
        totalCustomers: 0,
        totalRevenue: 0,
        pendingOrders: 0,
        processingOrders: 0,
        shippedOrders: 0,
        deliveredOrders: 0,
        cancelledOrders: 0,
        lowStock: 0,
        outOfStock: 0,
        todayRevenue: 0,
        weeklyRevenue: 0,
        monthlyRevenue: 0,
        yearlyRevenue: 0,
        averageOrderValue: 0,
        revenueGrowth: 0
    });

    const [recentOrders, setRecentOrders] = useState([]);
    const [topProducts, setTopProducts] = useState([]);
    const [dailySales, setDailySales] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [currencySymbol, setCurrencySymbol] = useState("$");
    const [hoveredCard, setHoveredCard] = useState(null);
    const [apiHealthy, setApiHealthy] = useState(false);

    const CHART_MAX_BAR_HEIGHT = 180;

    useEffect(() => {
        loadCurrencySymbol();
        checkApiHealth();
        loadDashboardData();

        window.addEventListener('productsUpdated', loadDashboardData);
        window.addEventListener('orderStatusUpdated', loadDashboardData);
        window.addEventListener('currencyChanged', handleCurrencyChange);

        return () => {
            window.removeEventListener('productsUpdated', loadDashboardData);
            window.removeEventListener('orderStatusUpdated', loadDashboardData);
            window.removeEventListener('currencyChanged', handleCurrencyChange);
        };
    }, []);

    // Check if backend API is reachable
    const checkApiHealth = async () => {
        try {
            console.log('🔍 Checking API health at:', API_HEALTH_URL);
            const response = await fetch(API_HEALTH_URL, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });
            
            if (response.ok) {
                const data = await response.json();
                console.log('✅ API is healthy:', data);
                setApiHealthy(true);
            } else {
                console.warn('⚠️ API returned status:', response.status);
                setApiHealthy(false);
            }
        } catch (error) {
            console.warn('⚠️ API not reachable:', error.message);
            setApiHealthy(false);
        }
    };

    const loadCurrencySymbol = () => {
        try {
            const siteSettings = JSON.parse(localStorage.getItem('site_settings') || '{}');
            const symbols = { USD: "$", EUR: "€", GBP: "£", LKR: "Rs" };
            setCurrencySymbol(symbols[siteSettings.currency] || "$");
        } catch (e) {
            setCurrencySymbol("$");
        }
    };

    const handleCurrencyChange = (event) => {
        if (event.detail && event.detail.symbol) {
            setCurrencySymbol(event.detail.symbol);
        } else {
            loadCurrencySymbol();
        }
    };

    const loadDashboardData = async () => {
        setLoading(true);
        setError(null);

        try {
            // Show API status
            console.log(`🔗 API URL: ${API_URL}`);
            console.log(`🩺 API Healthy: ${apiHealthy}`);

            // Load orders - using orderService which uses localStorage
            let orders = [];
            try {
                orders = await orderService.getAllOrders();
                console.log(`📦 Loaded ${orders.length} orders from localStorage`);
            } catch (orderError) {
                console.warn('Error loading orders:', orderError);
                orders = [];
            }

            // Load products
            let products = [];
            try {
                products = productService.getAllProducts();
                console.log(`📦 Loaded ${products.length} products`);
            } catch (productError) {
                console.warn('Error loading products:', productError);
                products = [];
            }

            // Load customers
            let customers = [];
            try {
                customers = JSON.parse(localStorage.getItem('admin_customers') || '[]');
                const userData = localStorage.getItem('user');
                if (userData) {
                    try {
                        const user = JSON.parse(userData);
                        if (user && !customers.find(c => c.email === user.email)) {
                            customers.push(user);
                        }
                    } catch (e) {}
                }
            } catch (e) {
                console.warn('Error loading customers:', e);
                customers = [];
            }

            // Calculate stats from local data
            const deliveredOrdersList = orders.filter(o =>
                (o.status === 'delivered' || o.orderStatus === 'delivered')
            );
            const totalRevenue = deliveredOrdersList.reduce((sum, o) => sum + (o.total || 0), 0);

            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const todayRevenue = orders
                .filter(o => {
                    const orderDate = new Date(o.date || o.createdAt);
                    orderDate.setHours(0, 0, 0, 0);
                    return orderDate.getTime() === today.getTime() &&
                           (o.status !== 'cancelled' && o.orderStatus !== 'cancelled');
                })
                .reduce((sum, o) => sum + (o.total || 0), 0);

            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            weekAgo.setHours(0, 0, 0, 0);
            const weeklyRevenue = orders
                .filter(o => {
                    const orderDate = new Date(o.date || o.createdAt);
                    return orderDate >= weekAgo &&
                           (o.status !== 'cancelled' && o.orderStatus !== 'cancelled');
                })
                .reduce((sum, o) => sum + (o.total || 0), 0);

            const monthAgo = new Date();
            monthAgo.setDate(monthAgo.getDate() - 30);
            monthAgo.setHours(0, 0, 0, 0);
            const monthlyRevenue = orders
                .filter(o => {
                    const orderDate = new Date(o.date || o.createdAt);
                    return orderDate >= monthAgo &&
                           (o.status !== 'cancelled' && o.orderStatus !== 'cancelled');
                })
                .reduce((sum, o) => sum + (o.total || 0), 0);

            const yearAgo = new Date();
            yearAgo.setFullYear(yearAgo.getFullYear() - 1);
            yearAgo.setHours(0, 0, 0, 0);
            const yearlyRevenue = orders
                .filter(o => {
                    const orderDate = new Date(o.date || o.createdAt);
                    return orderDate >= yearAgo &&
                           (o.status !== 'cancelled' && o.orderStatus !== 'cancelled');
                })
                .reduce((sum, o) => sum + (o.total || 0), 0);

            const lastMonthStart = new Date();
            lastMonthStart.setMonth(lastMonthStart.getMonth() - 1);
            lastMonthStart.setDate(1);
            lastMonthStart.setHours(0, 0, 0, 0);

            const lastMonthEnd = new Date();
            lastMonthEnd.setDate(0);
            lastMonthEnd.setHours(23, 59, 59, 999);

            const lastMonthRevenue = orders
                .filter(o => {
                    const orderDate = new Date(o.date || o.createdAt);
                    return orderDate >= lastMonthStart && orderDate <= lastMonthEnd &&
                           (o.status !== 'cancelled' && o.orderStatus !== 'cancelled');
                })
                .reduce((sum, o) => sum + (o.total || 0), 0);

            const revenueGrowth = lastMonthRevenue > 0
                ? ((monthlyRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
                : 0;

            const recent = [...orders]
                .sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt))
                .slice(0, 5);

            // Calculate top products
            const productSales = new Map();
            orders.forEach(order => {
                if ((order.status === 'delivered' || order.orderStatus === 'delivered')) {
                    const items = order.itemsList || order.items || [];
                    items.forEach(item => {
                        const name = item.name || item.productName || 'Unknown Product';
                        if (!productSales.has(name)) {
                            productSales.set(name, {
                                name: name,
                                quantity: 0,
                                revenue: 0
                            });
                        }
                        const prod = productSales.get(name);
                        prod.quantity += item.quantity || 1;
                        prod.revenue += (item.price || 0) * (item.quantity || 1);
                    });
                }
            });

            const topProductsList = Array.from(productSales.values())
                .sort((a, b) => b.revenue - a.revenue)
                .slice(0, 5);

            // Calculate daily sales
            const last7Days = [];
            for (let i = 6; i >= 0; i--) {
                const date = new Date();
                date.setDate(date.getDate() - i);
                date.setHours(0, 0, 0, 0);
                const nextDay = new Date(date);
                nextDay.setDate(date.getDate() + 1);

                const dayRevenue = orders
                    .filter(o => {
                        const orderDate = new Date(o.date || o.createdAt);
                        return orderDate >= date && orderDate < nextDay &&
                               (o.status !== 'cancelled' && o.orderStatus !== 'cancelled');
                    })
                    .reduce((sum, o) => sum + (o.total || 0), 0);

                last7Days.push({
                    date: date.toLocaleDateString('en-US', { weekday: 'short' }),
                    revenue: dayRevenue
                });
            }
            setDailySales(last7Days);

            // Get low stock products
            let lowStockProducts = [];
            let outOfStockProducts = [];
            try {
                lowStockProducts = productService.getLowStockProducts ? productService.getLowStockProducts(10) : [];
                outOfStockProducts = productService.getOutOfStockProducts ? productService.getOutOfStockProducts() : [];
            } catch (e) {
                console.warn('Error getting stock info:', e);
            }

            setStats({
                totalProducts: products.length,
                totalOrders: orders.length,
                totalCustomers: customers.length,
                totalRevenue,
                pendingOrders: orders.filter(o => (o.status === 'pending' || o.orderStatus === 'pending')).length,
                processingOrders: orders.filter(o => (o.status === 'processing' || o.orderStatus === 'processing')).length,
                shippedOrders: orders.filter(o => (o.status === 'shipped' || o.orderStatus === 'shipped')).length,
                deliveredOrders: deliveredOrdersList.length,
                cancelledOrders: orders.filter(o => (o.status === 'cancelled' || o.orderStatus === 'cancelled')).length,
                lowStock: lowStockProducts.length,
                outOfStock: outOfStockProducts.length,
                todayRevenue,
                weeklyRevenue,
                monthlyRevenue,
                yearlyRevenue,
                averageOrderValue: deliveredOrdersList.length > 0 ? totalRevenue / deliveredOrdersList.length : 0,
                revenueGrowth
            });

            setRecentOrders(recent);
            setTopProducts(topProductsList);

        } catch (error) {
            console.error("Error loading dashboard data:", error);
            setError(error.message);
            toast.error(`Failed to load dashboard data: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const formatPrice = (price) => {
        if (price === 0 || price === undefined || price === null) {
            return `${currencySymbol}0.00`;
        }
        return `${currencySymbol}${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const getStatusColor = (status) => {
        const s = status?.toLowerCase() || '';
        if (s === 'delivered') return 'bg-emerald-100 text-emerald-700 border-emerald-200';
        if (s === 'pending') return 'bg-amber-100 text-amber-700 border-amber-200';
        if (s === 'processing') return 'bg-blue-100 text-blue-700 border-blue-200';
        if (s === 'shipped') return 'bg-purple-100 text-purple-700 border-purple-200';
        if (s === 'cancelled') return 'bg-red-100 text-red-700 border-red-200';
        return 'bg-gray-100 text-gray-700 border-gray-200';
    };

    const getStatusIcon = (status) => {
        const s = status?.toLowerCase() || '';
        if (s === 'delivered') return FiCheckCircle;
        if (s === 'pending') return FiClock;
        if (s === 'processing') return FiLoader;
        if (s === 'shipped') return FiTruck;
        if (s === 'cancelled') return FiXCircle;
        return FiAlertCircle;
    };

    const statCards = [
        { 
            title: "Total Revenue", 
            value: stats.totalRevenue,
            displayValue: formatPrice(stats.totalRevenue),
            icon: FiDollarSign, 
            color: "from-emerald-500 to-emerald-600",
            change: stats.revenueGrowth !== 0 ? `${stats.revenueGrowth.toFixed(1)}%` : null,
            changeColor: stats.revenueGrowth >= 0 ? 'text-emerald-600' : 'text-red-500'
        },
        { 
            title: "Total Orders", 
            value: stats.totalOrders,
            displayValue: stats.totalOrders,
            icon: FiShoppingBag, 
            color: "from-blue-500 to-blue-600",
            change: null 
        },
        { 
            title: "Total Customers", 
            value: stats.totalCustomers,
            displayValue: stats.totalCustomers,
            icon: FiUsers, 
            color: "from-purple-500 to-purple-600",
            change: null 
        },
        { 
            title: "Total Products", 
            value: stats.totalProducts,
            displayValue: stats.totalProducts,
            icon: FiPackage, 
            color: "from-orange-500 to-orange-600",
            change: null 
        },
        { 
            title: "Avg Order Value", 
            value: stats.averageOrderValue,
            displayValue: formatPrice(stats.averageOrderValue),
            icon: FiTrendingUp, 
            color: "from-indigo-500 to-indigo-600",
            change: null 
        },
        { 
            title: "Low Stock Alert", 
            value: stats.lowStock,
            displayValue: stats.lowStock,
            icon: FiAlertCircle, 
            color: "from-red-500 to-red-600",
            change: null 
        }
    ];

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent mx-auto"></div>
                    <p className="mt-4 text-gray-500">Loading dashboard...</p>
                </div>
            </div>
        );
    }

    const maxRevenueInWeek = Math.max(...dailySales.map(d => d.revenue), 1);

    return (
        <div className="pb-8 space-y-6">
            {/* API Status Banner */}
            {!apiHealthy && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-center gap-3">
                    <FiAlertCircle className="text-yellow-600 text-xl flex-shrink-0" />
                    <div>
                        <p className="text-yellow-800 font-medium">Backend API not reachable</p>
                        <p className="text-yellow-700 text-sm">Using local data only. Some features may be limited.</p>
                    </div>
                </div>
            )}

            <AnimatePresence>
                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                    >
                        <div className="flex items-center gap-3">
                            <FiAlertCircle className="text-amber-600 text-xl flex-shrink-0" />
                            <span className="text-amber-800">{error}</span>
                        </div>
                        <button 
                            onClick={loadDashboardData} 
                            className="px-4 py-2 bg-amber-100 hover:bg-amber-200 text-amber-800 rounded-lg text-sm font-medium transition-colors"
                        >
                            Retry
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Dashboard</h1>
                    <p className="text-gray-500 text-sm mt-1">
                        Real-time overview of your store
                    </p>
                </div>
                <button 
                    onClick={loadDashboardData} 
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-all duration-200 text-sm font-medium"
                >
                    <FiRefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    Refresh
                </button>
            </div>

            {/* Rest of the dashboard remains the same */}
            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                {statCards.map((card, index) => {
                    const Icon = card.icon;
                    const isHovered = hoveredCard === index;
                    const fullNumber = typeof card.value === 'number' ? card.value.toLocaleString(undefined, { 
                        minimumFractionDigits: 2, 
                        maximumFractionDigits: 2 
                    }) : card.value;

                    return (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="relative"
                            onMouseEnter={() => setHoveredCard(index)}
                            onMouseLeave={() => setHoveredCard(null)}
                        >
                            <motion.div
                                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                                className="bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 cursor-pointer"
                            >
                                <div className="p-5">
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                {card.title}
                                            </p>
                                            <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-2 truncate">
                                                {card.displayValue}
                                            </p>
                                            {card.change && (
                                                <p className={`text-xs font-medium mt-1 flex items-center gap-1 ${card.changeColor}`}>
                                                    <FiArrowUp size={12} />
                                                    {card.change} from last month
                                                </p>
                                            )}
                                        </div>
                                        <div className={`bg-gradient-to-br ${card.color} p-3 rounded-xl text-white flex-shrink-0 ml-3 shadow-lg`}>
                                            <Icon size={20} />
                                        </div>
                                    </div>
                                </div>
                            </motion.div>

                            <AnimatePresence>
                                {isHovered && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 5, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 5, scale: 0.95 }}
                                        transition={{ duration: 0.15 }}
                                        className="absolute z-50 bg-gray-900 text-white rounded-lg shadow-2xl px-4 py-2 top-full left-1/2 transform -translate-x-1/2 mt-2 whitespace-nowrap"
                                    >
                                        <div className="absolute -top-1.5 left-1/2 transform -translate-x-1/2 w-3 h-3 bg-gray-900 rotate-45"></div>
                                        
                                        <div className="relative">
                                            <p className="text-xs text-gray-400 mb-0.5">{card.title}</p>
                                            <p className="text-lg font-bold">
                                                {typeof card.value === 'number' && card.title.includes('Revenue') 
                                                    ? `${currencySymbol}${fullNumber}`
                                                    : fullNumber}
                                            </p>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    );
                })}
            </div>

            {/* Revenue Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: "Today's Revenue", value: stats.todayRevenue, icon: FiCalendar, color: "blue" },
                    { label: "This Week", value: stats.weeklyRevenue, icon: FiBarChart2, color: "purple" },
                    { label: "This Month", value: stats.monthlyRevenue, icon: FiTrendingUp, color: "emerald" },
                    { label: "This Year", value: stats.yearlyRevenue, icon: FiDollarSign, color: "orange" }
                ].map((item, idx) => (
                    <motion.div
                        key={idx}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.2 + idx * 0.05 }}
                        className={`bg-gradient-to-br from-${item.color}-500 to-${item.color}-600 rounded-2xl shadow-lg p-4 text-white hover:shadow-xl transition-shadow duration-300`}
                    >
                        <div className="flex items-center justify-between">
                            <item.icon size={20} className="opacity-80" />
                            <span className="text-xs font-medium opacity-80">{item.label}</span>
                        </div>
                        <p className="text-lg sm:text-xl font-bold mt-2 truncate">{formatPrice(item.value)}</p>
                    </motion.div>
                ))}
            </div>

            {/* Charts & Orders Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Sales Chart */}
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="lg:col-span-2 bg-white rounded-2xl shadow-sm p-6 border border-gray-100"
                >
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-semibold text-gray-900">Sales Overview</h2>
                        <span className="text-xs text-gray-500">Last 7 days</span>
                    </div>
                    <div className="relative" style={{ height: `${CHART_MAX_BAR_HEIGHT + 40}px` }}>
                        <div className="flex items-end gap-2 h-full">
                            {dailySales.map((day, idx) => {
                                const barHeight = (day.revenue / maxRevenueInWeek) * CHART_MAX_BAR_HEIGHT;
                                return (
                                    <div key={idx} className="flex-1 flex flex-col items-center justify-end h-full gap-2">
                                        <motion.div
                                            initial={{ height: 0 }}
                                            animate={{ height: Math.max(barHeight, 4) }}
                                            transition={{ delay: 0.4 + idx * 0.05, duration: 0.6, ease: "easeOut" }}
                                            className="w-full relative group"
                                            style={{ height: `${Math.max(barHeight, 4)}px`, minHeight: '4px' }}
                                        >
                                            <div className="absolute inset-0 bg-gradient-to-t from-blue-500 to-blue-400 rounded-lg group-hover:from-blue-600 group-hover:to-blue-500 transition-all duration-300 shadow-lg">
                                                <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                                    {formatPrice(day.revenue)}
                                                </div>
                                            </div>
                                        </motion.div>
                                        <span className="text-xs text-gray-500">{day.date}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </motion.div>

                {/* Order Stats */}
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.35 }}
                    className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100"
                >
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Status</h2>
                    <div className="space-y-3">
                        {[
                            { label: 'Pending', count: stats.pendingOrders, color: 'amber' },
                            { label: 'Processing', count: stats.processingOrders, color: 'blue' },
                            { label: 'Shipped', count: stats.shippedOrders, color: 'purple' },
                            { label: 'Delivered', count: stats.deliveredOrders, color: 'emerald' },
                            { label: 'Cancelled', count: stats.cancelledOrders, color: 'red' }
                        ].map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className={`w-2 h-2 rounded-full bg-${item.color}-500`}></div>
                                    <span className="text-sm text-gray-600">{item.label}</span>
                                </div>
                                <span className={`text-sm font-semibold text-${item.color}-600`}>{item.count}</span>
                            </div>
                        ))}
                    </div>
                </motion.div>
            </div>

            {/* Recent Orders & Top Products */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Orders */}
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100"
                >
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg font-semibold text-gray-900">Recent Orders</h2>
                        <button 
                            onClick={() => window.location.href = '/admin/orders'} 
                            className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 transition-colors"
                        >
                            View All <FiEye size={14} />
                        </button>
                    </div>
                    {recentOrders.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            <FiShoppingBag className="mx-auto text-3xl mb-2 opacity-30" />
                            <p className="text-sm">No orders yet</p>
                        </div>
                    ) : (
                        <div className="space-y-3 max-h-96 overflow-y-auto">
                            {recentOrders.map((order, idx) => {
                                const StatusIcon = getStatusIcon(order.status || order.orderStatus);
                                return (
                                    <motion.div
                                        key={order.id}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.1 * idx }}
                                        className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl border border-gray-100 hover:bg-gray-50 transition-all duration-200 gap-2"
                                    >
                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <p className="font-mono text-sm font-semibold text-gray-900 truncate">
                                                    {order.orderId || order.id}
                                                </p>
                                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(order.status || order.orderStatus)} flex items-center gap-1`}>
                                                    <StatusIcon size={12} />
                                                    {order.status || order.orderStatus || 'pending'}
                                                </span>
                                            </div>
                                            <p className="text-sm text-gray-500 truncate">
                                                {order.customerName || order.customerEmail || 'Guest'}
                                            </p>
                                            <p className="text-xs text-gray-400">
                                                {new Date(order.date || order.createdAt).toLocaleDateString('en-US', { 
                                                    month: 'short', 
                                                    day: 'numeric',
                                                    year: 'numeric'
                                                })}
                                            </p>
                                        </div>
                                        <div className="text-left sm:text-right flex-shrink-0">
                                            <p className="font-bold text-gray-900">{formatPrice(order.total)}</p>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    )}
                </motion.div>

                {/* Top Products */}
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.45 }}
                    className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100"
                >
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Top Selling Products</h2>
                    {topProducts.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            <FiPackage className="mx-auto text-3xl mb-2 opacity-30" />
                            <p className="text-sm">No sales data yet</p>
                        </div>
                    ) : (
                        <div className="space-y-3 max-h-96 overflow-y-auto">
                            {topProducts.map((product, idx) => (
                                <motion.div
                                    key={idx}
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.1 * idx }}
                                    className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl border border-gray-100 hover:bg-gray-50 transition-all duration-200 gap-2"
                                >
                                    <div className="flex items-center gap-3 min-w-0 flex-1">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${
                                            idx === 0 ? 'bg-amber-100 text-amber-700' :
                                            idx === 1 ? 'bg-gray-200 text-gray-700' :
                                            idx === 2 ? 'bg-orange-100 text-orange-700' :
                                            'bg-blue-50 text-blue-600'
                                        }`}>
                                            #{idx + 1}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="font-medium text-gray-900 truncate">{product.name}</p>
                                            <p className="text-sm text-gray-500">Sold: {product.quantity} units</p>
                                        </div>
                                    </div>
                                    <div className="text-left sm:text-right flex-shrink-0">
                                        <p className="font-semibold text-emerald-600">{formatPrice(product.revenue)}</p>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </motion.div>
            </div>

            {/* Quick Actions */}
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="grid grid-cols-2 sm:grid-cols-4 gap-4"
            >
                {[
                    { icon: FiPackage, label: 'Add Product', color: 'blue', href: '/admin/products' },
                    { icon: FiShoppingCart, label: 'View Orders', color: 'emerald', href: '/admin/orders' },
                    { icon: FiTrendingUp, label: 'Create Coupon', color: 'orange', href: '/admin/coupons' },
                    { icon: FiRefreshCw, label: 'Refresh', color: 'purple', action: loadDashboardData }
                ].map((item, idx) => (
                    <motion.button
                        key={idx}
                        whileHover={{ y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => item.action ? item.action() : window.location.href = item.href}
                        className="bg-white border border-gray-200 rounded-2xl p-4 text-center hover:shadow-lg transition-all duration-300"
                    >
                        <div className={`inline-flex p-3 rounded-xl bg-${item.color}-50 text-${item.color}-600`}>
                            <item.icon size={24} />
                        </div>
                        <p className="font-medium text-gray-700 text-sm mt-2">{item.label}</p>
                    </motion.button>
                ))}
            </motion.div>
        </div>
    );
};

export default Dashboard;