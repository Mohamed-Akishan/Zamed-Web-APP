// src/pages/Admin/Dashboard.jsx
import { useState, useEffect } from "react";
import { 
    FiPackage, FiShoppingBag, FiUsers, FiDollarSign, FiTrendingUp, 
    FiTruck, FiRefreshCw, FiEye, FiAlertCircle, FiBarChart2,
    FiClock, FiCheckCircle, FiXCircle, FiShoppingCart, FiCalendar,
    FiArrowUp, FiArrowDown, FiMenu
} from "react-icons/fi";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { getAllOrders, getOrderStats } from "../../services/orderService";
import productService from "../../services/productService";

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
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    useEffect(() => {
        loadCurrencySymbol();
        loadDashboardData();
        
        window.addEventListener('productsUpdated', loadDashboardData);
        window.addEventListener('orderStatusUpdated', loadDashboardData);
        window.addEventListener('currencyChanged', handleCurrencyChange);
        window.addEventListener('resize', handleResize);
        
        return () => {
            window.removeEventListener('productsUpdated', loadDashboardData);
            window.removeEventListener('orderStatusUpdated', loadDashboardData);
            window.removeEventListener('currencyChanged', handleCurrencyChange);
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    const handleResize = () => {
        if (window.innerWidth > 768) {
            setIsMobileMenuOpen(false);
        }
    };

    const loadCurrencySymbol = () => {
        const siteSettings = JSON.parse(localStorage.getItem('site_settings') || '{}');
        const symbols = { USD: "$", EUR: "€", GBP: "£", LKR: "Rs" };
        setCurrencySymbol(symbols[siteSettings.currency] || "$");
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
            // Get orders from IndexedDB
            const orders = await getAllOrders();
            console.log(`📦 Loaded ${orders.length} orders from IndexedDB`);
            
            // Get products
            const products = productService.getAllProducts();
            
            // Get customers
            let customers = JSON.parse(localStorage.getItem('admin_customers') || '[]');
            const userData = localStorage.getItem('user');
            if (userData) {
                try {
                    const user = JSON.parse(userData);
                    if (user && !customers.find(c => c.email === user.email)) {
                        customers.push(user);
                    }
                } catch (e) {}
            }
            
            // Calculate revenue from delivered orders only
            const deliveredOrdersList = orders.filter(o => 
                (o.status === 'delivered' || o.orderStatus === 'delivered')
            );
            const totalRevenue = deliveredOrdersList.reduce((sum, o) => sum + (o.total || 0), 0);
            
            // Calculate today's revenue
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
            
            // Calculate weekly revenue (last 7 days)
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
            
            // Calculate monthly revenue (last 30 days)
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
            
            // Calculate yearly revenue
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
            
            // Calculate growth percentage
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
            
            // Get recent orders (last 5)
            const recent = [...orders]
                .sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt))
                .slice(0, 5);
            
            // Calculate top products
            const productSales = new Map();
            orders.forEach(order => {
                if ((order.status === 'delivered' || order.orderStatus === 'delivered')) {
                    const items = order.itemsList || order.items || [];
                    items.forEach(item => {
                        if (!productSales.has(item.name)) {
                            productSales.set(item.name, {
                                name: item.name,
                                quantity: 0,
                                revenue: 0
                            });
                        }
                        const prod = productSales.get(item.name);
                        prod.quantity += item.quantity;
                        prod.revenue += (item.price * item.quantity);
                    });
                }
            });
            
            const topProductsList = Array.from(productSales.values())
                .sort((a, b) => b.revenue - a.revenue)
                .slice(0, 5);
            
            // Calculate daily sales for chart (last 7 days)
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
                lowStock: productService.getLowStockProducts(10).length,
                outOfStock: productService.getOutOfStockProducts().length,
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

    const formatPrice = (price) => `${currencySymbol}${(price || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const statCards = [
        { title: "Total Revenue", value: formatPrice(stats.totalRevenue), icon: FiDollarSign, color: "bg-green-500", change: `+${stats.revenueGrowth.toFixed(1)}%` },
        { title: "Total Orders", value: stats.totalOrders, icon: FiShoppingBag, color: "bg-blue-500", change: null },
        { title: "Total Customers", value: stats.totalCustomers, icon: FiUsers, color: "bg-purple-500", change: null },
        { title: "Total Products", value: stats.totalProducts, icon: FiPackage, color: "bg-orange-500", change: null },
        { title: "Avg Order Value", value: formatPrice(stats.averageOrderValue), icon: FiTrendingUp, color: "bg-indigo-500", change: null },
        { title: "Low Stock Alert", value: stats.lowStock, icon: FiTruck, color: "bg-red-500", change: null }
    ];

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="pb-8">
            {/* Mobile Menu Button */}
            <div className="md:hidden fixed bottom-4 right-4 z-50">
                <button 
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    className="bg-blue-600 text-white p-3 rounded-full shadow-lg"
                >
                    <FiMenu size={24} />
                </button>
            </div>

            {error && (
                <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <FiAlertCircle className="text-yellow-600 flex-shrink-0" />
                        <span className="text-sm text-yellow-700">{error}</span>
                    </div>
                    <button onClick={loadDashboardData} className="text-sm text-yellow-700 hover:underline">Retry</button>
                </div>
            )}

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold dark:text-white">Dashboard Overview</h1>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Welcome back! Here's what's happening today.</p>
                </div>
                <button onClick={loadDashboardData} className="p-2 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors self-end sm:self-auto">
                    <FiRefreshCw size={18} />
                </button>
            </div>

            {/* Stats Cards - Responsive Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4 mb-6">
                {statCards.map((card, index) => {
                    const Icon = card.icon;
                    return (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-3 sm:p-4 hover:shadow-lg transition-shadow"
                        >
                            <div className="flex justify-between items-start">
                                <div className="flex-1 min-w-0">
                                    <p className="text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wide truncate">{card.title}</p>
                                    <p className="text-lg sm:text-2xl font-bold mt-1 dark:text-white truncate">{card.value}</p>
                                    {card.change && (
                                        <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                                            <FiArrowUp size={10} /> {card.change} from last month
                                        </p>
                                    )}
                                </div>
                                <div className={`${card.color} p-2 sm:p-3 rounded-full text-white flex-shrink-0 ml-2`}>
                                    <Icon size={16} className="sm:w-5 sm:h-5" />
                                </div>
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            {/* Revenue Summary - Responsive */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl shadow-md p-3 sm:p-4 text-white">
                    <p className="text-xs opacity-90">Today's Revenue</p>
                    <p className="text-xl sm:text-2xl font-bold mt-1">{formatPrice(stats.todayRevenue)}</p>
                </div>
                <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl shadow-md p-3 sm:p-4 text-white">
                    <p className="text-xs opacity-90">This Week</p>
                    <p className="text-xl sm:text-2xl font-bold mt-1">{formatPrice(stats.weeklyRevenue)}</p>
                </div>
                <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl shadow-md p-3 sm:p-4 text-white">
                    <p className="text-xs opacity-90">This Month</p>
                    <p className="text-xl sm:text-2xl font-bold mt-1">{formatPrice(stats.monthlyRevenue)}</p>
                </div>
                <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl shadow-md p-3 sm:p-4 text-white">
                    <p className="text-xs opacity-90">This Year</p>
                    <p className="text-xl sm:text-2xl font-bold mt-1">{formatPrice(stats.yearlyRevenue)}</p>
                </div>
            </div>

            {/* Sales Chart - Responsive */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-3 sm:p-4 mb-6 overflow-x-auto">
                <h2 className="text-base sm:text-lg font-semibold mb-3 dark:text-white">Sales Overview (Last 7 Days)</h2>
                <div className="min-w-[300px]">
                    <div className="flex items-end gap-1 sm:gap-2 h-48 sm:h-56">
                        {dailySales.map((day, idx) => {
                            const maxRevenue = Math.max(...dailySales.map(d => d.revenue), 1);
                            const height = (day.revenue / maxRevenue) * 100;
                            return (
                                <div key={idx} className="flex-1 flex flex-col items-center gap-1 sm:gap-2">
                                    <div className="relative w-full group">
                                        <div 
                                            className="w-full bg-blue-500 hover:bg-blue-600 transition-all duration-300 rounded-t-lg"
                                            style={{ height: `${Math.max(height, 4)}px`, minHeight: '4px' }}
                                        >
                                            <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                                                {formatPrice(day.revenue)}
                                            </div>
                                        </div>
                                    </div>
                                    <span className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 truncate w-full text-center">{day.date}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Recent Orders & Top Products - Responsive */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                {/* Recent Orders */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-3 sm:p-4">
                    <div className="flex justify-between items-center mb-3 flex-wrap gap-2">
                        <h2 className="text-base sm:text-lg font-semibold dark:text-white">Recent Orders</h2>
                        <button onClick={() => window.location.href = '/admin/orders'} className="text-xs sm:text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1">
                            View All <FiEye size={14} />
                        </button>
                    </div>
                    {recentOrders.length === 0 ? (
                        <div className="text-center py-6 text-gray-500 text-sm">No orders yet</div>
                    ) : (
                        <div className="space-y-2 max-h-96 overflow-y-auto">
                            {recentOrders.map((order) => (
                                <div key={order.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-2 sm:p-3 border rounded-lg dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors gap-2">
                                    <div className="min-w-0">
                                        <p className="font-mono text-xs sm:text-sm font-semibold dark:text-white truncate">{order.orderId || order.id}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{order.customerName || order.customerEmail}</p>
                                        <p className="text-xs text-gray-400">{new Date(order.date || order.createdAt).toLocaleDateString()}</p>
                                    </div>
                                    <div className="text-right flex-shrink-0">
                                        <p className="font-bold text-blue-600 text-sm sm:text-base">{formatPrice(order.total)}</p>
                                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium ${
                                            (order.status === 'delivered' || order.orderStatus === 'delivered') ? 'bg-green-100 text-green-800' :
                                            (order.status === 'pending' || order.orderStatus === 'pending') ? 'bg-yellow-100 text-yellow-800' :
                                            (order.status === 'processing' || order.orderStatus === 'processing') ? 'bg-blue-100 text-blue-800' :
                                            (order.status === 'shipped' || order.orderStatus === 'shipped') ? 'bg-purple-100 text-purple-800' : 'bg-red-100 text-red-800'
                                        }`}>
                                            {order.status || order.orderStatus || 'pending'}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Top Products */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-3 sm:p-4">
                    <div className="flex justify-between items-center mb-3">
                        <h2 className="text-base sm:text-lg font-semibold dark:text-white">Top Selling Products</h2>
                    </div>
                    {topProducts.length === 0 ? (
                        <div className="text-center py-6 text-gray-500 text-sm">No sales data yet</div>
                    ) : (
                        <div className="space-y-2 max-h-96 overflow-y-auto">
                            {topProducts.map((product, idx) => (
                                <div key={idx} className="flex items-center justify-between p-2 sm:p-3 border rounded-lg dark:border-gray-700 gap-2">
                                    <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                                        <div className="w-6 h-6 sm:w-8 sm:h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center text-blue-600 font-bold text-xs sm:text-sm flex-shrink-0">#{idx + 1}</div>
                                        <div className="min-w-0">
                                            <p className="font-medium dark:text-white text-sm sm:text-base truncate">{product.name}</p>
                                            <p className="text-xs text-gray-500">Sold: {product.quantity} units</p>
                                        </div>
                                    </div>
                                    <div className="text-right flex-shrink-0">
                                        <p className="font-semibold text-green-600 text-sm sm:text-base">{formatPrice(product.revenue)}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Quick Actions - Responsive */}
            <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
                <button onClick={() => window.location.href = '/admin/products'} className="bg-white dark:bg-gray-800 border rounded-lg p-2 sm:p-3 text-center hover:shadow-lg transition-all group">
                    <FiPackage className="mx-auto text-blue-600 text-lg sm:text-2xl mb-1 sm:mb-2 group-hover:scale-110 transition-transform" />
                    <p className="font-medium dark:text-white text-xs sm:text-sm">Add Product</p>
                </button>
                <button onClick={() => window.location.href = '/admin/orders'} className="bg-white dark:bg-gray-800 border rounded-lg p-2 sm:p-3 text-center hover:shadow-lg transition-all group">
                    <FiShoppingCart className="mx-auto text-green-600 text-lg sm:text-2xl mb-1 sm:mb-2 group-hover:scale-110 transition-transform" />
                    <p className="font-medium dark:text-white text-xs sm:text-sm">View Orders</p>
                </button>
                <button onClick={() => window.location.href = '/admin/coupons'} className="bg-white dark:bg-gray-800 border rounded-lg p-2 sm:p-3 text-center hover:shadow-lg transition-all group">
                    <FiTrendingUp className="mx-auto text-orange-600 text-lg sm:text-2xl mb-1 sm:mb-2 group-hover:scale-110 transition-transform" />
                    <p className="font-medium dark:text-white text-xs sm:text-sm">Create Coupon</p>
                </button>
                <button onClick={loadDashboardData} className="bg-white dark:bg-gray-800 border rounded-lg p-2 sm:p-3 text-center hover:shadow-lg transition-all group">
                    <FiRefreshCw className="mx-auto text-purple-600 text-lg sm:text-2xl mb-1 sm:mb-2 group-hover:scale-110 transition-transform" />
                    <p className="font-medium dark:text-white text-xs sm:text-sm">Refresh</p>
                </button>
            </div>
        </div>
    );
};

export default Dashboard;