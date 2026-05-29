// src/pages/Admin/Reports.jsx
import { useState, useEffect } from "react";
import { 
    FiBarChart2, FiTrendingUp, FiUsers, FiShoppingBag, FiDollarSign,
    FiDownload, FiRefreshCw, FiCalendar, FiFilter, FiPieChart,
    FiPackage, FiTruck, FiStar, FiPercent, FiClock, FiCheckCircle,
    FiAlertCircle, FiLoader, FiPrinter, FiMail
} from "react-icons/fi";
import { toast } from "sonner";
import { motion } from "framer-motion";

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const Reports = () => {
    const [reportType, setReportType] = useState("sales");
    const [dateRange, setDateRange] = useState({ 
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], 
        end: new Date().toISOString().split('T')[0] 
    });
    const [darkMode, setDarkMode] = useState(false);
    const [currencySymbol, setCurrencySymbol] = useState("$");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [salesData, setSalesData] = useState({ labels: [], values: [], orders: [] });
    const [topProducts, setTopProducts] = useState([]);
    const [categoryStats, setCategoryStats] = useState([]);
    const [customerStats, setCustomerStats] = useState({});
    const [orderStats, setOrderStats] = useState({
        total: 0, pending: 0, processing: 0, shipped: 0, delivered: 0, cancelled: 0, totalRevenue: 0
    });
    const [monthlySales, setMonthlySales] = useState([]);
    const [dailySales, setDailySales] = useState([]);

    const getToken = () => localStorage.getItem('token');

    useEffect(() => {
        const checkDarkMode = () => {
            const isDark = document.documentElement.classList.contains('dark');
            setDarkMode(isDark);
        };
        checkDarkMode();
        loadCurrencySymbol();
        loadAllReports();
    }, []);

    const loadCurrencySymbol = () => {
        const siteSettings = JSON.parse(localStorage.getItem('site_settings') || '{}');
        const symbols = { USD: "$", EUR: "€", GBP: "£", LKR: "Rs" };
        setCurrencySymbol(symbols[siteSettings.currency] || "$");
    };

    const loadAllReports = async () => {
        setLoading(true);
        setError(null);
        
        const token = getToken();
        if (!token) {
            loadLocalReports();
            setLoading(false);
            return;
        }
        
        try {
            // Fetch orders from backend
            const ordersResponse = await fetch(`${API_URL}/orders?limit=1000`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (ordersResponse.ok) {
                const ordersData = await ordersResponse.json();
                if (ordersData.success && ordersData.orders) {
                    processReportData(ordersData.orders);
                    setLoading(false);
                    return;
                }
            }
            throw new Error("Backend not available");
        } catch (error) {
            console.error("Error loading reports from backend:", error);
            setError("Using local data");
            loadLocalReports();
        } finally {
            setLoading(false);
        }
    };
    
    const loadLocalReports = () => {
        let allOrders = [];
        
        const adminOrders = JSON.parse(localStorage.getItem('admin_orders') || '[]');
        allOrders = [...allOrders, ...adminOrders];
        
        const guestOrders = JSON.parse(localStorage.getItem('guestOrders') || '[]');
        allOrders = [...allOrders, ...guestOrders];
        
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('orders_')) {
                const userOrders = JSON.parse(localStorage.getItem(key) || '[]');
                allOrders = [...allOrders, ...userOrders];
            }
        }
        
        const uniqueOrders = [];
        const ids = new Set();
        allOrders.forEach(order => {
            const orderId = order.id || order.orderId;
            if (orderId && !ids.has(orderId)) {
                ids.add(orderId);
                uniqueOrders.push(order);
            }
        });
        
        processReportData(uniqueOrders);
    };
    
    const processReportData = (orders) => {
        // Order Statistics
        const deliveredOrders = orders.filter(o => (o.status || o.orderStatus) === 'delivered');
        const orderStatsData = {
            total: orders.length,
            pending: orders.filter(o => (o.status || o.orderStatus) === 'pending').length,
            processing: orders.filter(o => (o.status || o.orderStatus) === 'processing').length,
            shipped: orders.filter(o => (o.status || o.orderStatus) === 'shipped').length,
            delivered: deliveredOrders.length,
            cancelled: orders.filter(o => (o.status || o.orderStatus) === 'cancelled').length,
            totalRevenue: deliveredOrders.reduce((sum, o) => sum + (o.total || 0), 0)
        };
        setOrderStats(orderStatsData);
        
        // Last 30 Days Sales
        const last30Days = [];
        const salesByDay = new Map();
        
        for (let i = 29; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            last30Days.push(dateStr);
            salesByDay.set(dateStr, { revenue: 0, orders: 0 });
        }
        
        orders.forEach(order => {
            const orderDate = new Date(order.date || order.createdAt).toISOString().split('T')[0];
            if (salesByDay.has(orderDate) && (order.status !== 'cancelled' && order.orderStatus !== 'cancelled')) {
                const existing = salesByDay.get(orderDate);
                salesByDay.set(orderDate, {
                    revenue: existing.revenue + (order.total || 0),
                    orders: existing.orders + 1
                });
            }
        });
        
        setSalesData({
            labels: last30Days.map(d => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
            values: last30Days.map(d => salesByDay.get(d)?.revenue || 0),
            orders: last30Days.map(d => salesByDay.get(d)?.orders || 0)
        });
        
        // Monthly Sales (Last 12 months)
        const last12Months = [];
        const salesByMonth = new Map();
        const today = new Date();
        
        for (let i = 11; i >= 0; i--) {
            const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
            const monthStr = date.toISOString().slice(0, 7);
            last12Months.push(monthStr);
            salesByMonth.set(monthStr, { revenue: 0, orders: 0 });
        }
        
        orders.forEach(order => {
            const orderDate = new Date(order.date || order.createdAt);
            const monthStr = orderDate.toISOString().slice(0, 7);
            if (salesByMonth.has(monthStr) && (order.status !== 'cancelled' && order.orderStatus !== 'cancelled')) {
                const existing = salesByMonth.get(monthStr);
                salesByMonth.set(monthStr, {
                    revenue: existing.revenue + (order.total || 0),
                    orders: existing.orders + 1
                });
            }
        });
        
        setMonthlySales(last12Months.map(m => ({
            month: new Date(m + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
            revenue: salesByMonth.get(m)?.revenue || 0,
            orders: salesByMonth.get(m)?.orders || 0
        })));
        
        // Today's Sales
        const todayStr = new Date().toISOString().split('T')[0];
        const todaySales = orders.filter(o => {
            const orderDate = new Date(o.date || o.createdAt).toISOString().split('T')[0];
            return orderDate === todayStr && o.status !== 'cancelled' && o.orderStatus !== 'cancelled';
        });
        
        setDailySales({
            today: {
                revenue: todaySales.reduce((sum, o) => sum + (o.total || 0), 0),
                orders: todaySales.length,
                items: todaySales.reduce((sum, o) => sum + (o.itemsList?.length || o.items?.length || 0), 0)
            }
        });
        
        // Top Products
        const productSales = new Map();
        orders.forEach(order => {
            if (order.status === 'cancelled' || order.orderStatus === 'cancelled') return;
            const items = order.itemsList || order.items || [];
            items.forEach(item => {
                if (!productSales.has(item.name)) {
                    productSales.set(item.name, {
                        name: item.name,
                        quantity: 0,
                        revenue: 0,
                        category: item.category || 'Uncategorized'
                    });
                }
                const prod = productSales.get(item.name);
                prod.quantity += item.quantity;
                prod.revenue += (item.price * item.quantity);
            });
        });
        
        const topProductsList = Array.from(productSales.values())
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 10);
        setTopProducts(topProductsList);
        
        // Category Statistics
        const categoryStatsMap = new Map();
        orders.forEach(order => {
            if (order.status === 'cancelled' || order.orderStatus === 'cancelled') return;
            const items = order.itemsList || order.items || [];
            items.forEach(item => {
                const catName = item.category || 'Uncategorized';
                if (!categoryStatsMap.has(catName)) {
                    categoryStatsMap.set(catName, { name: catName, quantity: 0, revenue: 0 });
                }
                const cat = categoryStatsMap.get(catName);
                cat.quantity += item.quantity;
                cat.revenue += (item.price * item.quantity);
            });
        });
        
        setCategoryStats(Array.from(categoryStatsMap.values()).sort((a, b) => b.revenue - a.revenue));
        
        // Customer Statistics
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
        
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        
        setCustomerStats({
            total: customers.length,
            newThisMonth: customers.filter(c => {
                const joinDate = new Date(c.joinDate || c.createdAt || c.dateJoined);
                return joinDate.getMonth() === currentMonth && joinDate.getFullYear() === currentYear;
            }).length,
            averageOrderValue: orderStatsData.delivered > 0 ? orderStatsData.totalRevenue / orderStatsData.delivered : 0,
            repeatCustomers: customers.filter(c => (c.totalOrders || 0) > 1).length,
            activeCustomers: customers.filter(c => {
                const lastLogin = new Date(c.lastLogin || c.updatedAt || Date.now());
                const thirtyDaysAgo = new Date();
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                return lastLogin >= thirtyDaysAgo;
            }).length
        });
    };

    const downloadReport = () => {
        let reportData = [];
        let filename = "";
        
        if (reportType === "sales") {
            filename = `sales_report_${new Date().toISOString().split('T')[0]}`;
            reportData = salesData.labels.map((date, i) => ({
                Date: date,
                Revenue: currencySymbol + salesData.values[i].toFixed(2),
                Orders: salesData.orders[i]
            }));
        } else if (reportType === "products") {
            filename = `top_products_report_${new Date().toISOString().split('T')[0]}`;
            reportData = topProducts.map((p, idx) => ({
                Rank: idx + 1,
                "Product Name": p.name,
                "Category": p.category,
                "Quantity Sold": p.quantity,
                Revenue: currencySymbol + p.revenue.toFixed(2)
            }));
        } else if (reportType === "categories") {
            filename = `categories_report_${new Date().toISOString().split('T')[0]}`;
            const totalRevenue = categoryStats.reduce((sum, c) => sum + c.revenue, 0);
            reportData = categoryStats.map(c => ({
                Category: c.name,
                "Quantity Sold": c.quantity,
                Revenue: currencySymbol + c.revenue.toFixed(2),
                "Percentage": totalRevenue > 0 ? ((c.revenue / totalRevenue) * 100).toFixed(1) + "%" : "0%"
            }));
        } else if (reportType === "orders") {
            filename = `orders_summary_${new Date().toISOString().split('T')[0]}`;
            reportData = [{
                "Total Orders": orderStats.total,
                "Pending": orderStats.pending,
                "Processing": orderStats.processing,
                "Shipped": orderStats.shipped,
                "Delivered": orderStats.delivered,
                "Cancelled": orderStats.cancelled,
                "Total Revenue": currencySymbol + orderStats.totalRevenue.toFixed(2),
                "Completion Rate": orderStats.total > 0 ? ((orderStats.delivered / orderStats.total) * 100).toFixed(1) + "%" : "0%"
            }];
        } else if (reportType === "customers") {
            filename = `customers_report_${new Date().toISOString().split('T')[0]}`;
            reportData = [{
                "Total Customers": customerStats.total || 0,
                "New This Month": customerStats.newThisMonth || 0,
                "Active Customers (30 days)": customerStats.activeCustomers || 0,
                "Repeat Customers": customerStats.repeatCustomers || 0,
                "Average Order Value": currencySymbol + (customerStats.averageOrderValue || 0).toFixed(2),
                "Repeat Purchase Rate": customerStats.total ? ((customerStats.repeatCustomers / customerStats.total) * 100).toFixed(1) + "%" : "0%"
            }];
        } else if (reportType === "monthly") {
            filename = `monthly_sales_${new Date().toISOString().split('T')[0]}`;
            reportData = monthlySales.map(m => ({
                Month: m.month,
                Orders: m.orders,
                Revenue: currencySymbol + m.revenue.toFixed(2)
            }));
        }
        
        if (reportData.length === 0 || (reportData.length === 1 && Object.keys(reportData[0]).length === 0)) {
            toast.error("No data to export");
            return;
        }
        
        const headers = Object.keys(reportData[0]);
        const csvRows = [headers.join(',')];
        
        for (const row of reportData) {
            const values = headers.map(header => {
                const value = row[header];
                if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
                    return `"${value.replace(/"/g, '""')}"`;
                }
                return value;
            });
            csvRows.push(values.join(','));
        }
        
        const csv = csvRows.join('\n');
        const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filename}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success(`Report "${filename}" downloaded!`);
    };

    const printReport = () => {
        const printWindow = window.open('', '_blank');
        let content = `
            <html>
            <head>
                <title>${reportType.toUpperCase()} Report</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 40px; }
                    h1 { color: #2563eb; }
                    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                    th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
                    th { background-color: #f3f4f6; }
                    .footer { margin-top: 40px; text-align: center; color: #6b7280; font-size: 12px; }
                </style>
            </head>
            <body>
                <h1>${reportType.toUpperCase()} Report</h1>
                <p>Generated: ${new Date().toLocaleString()}</p>
        `;
        
        if (reportType === "sales") {
            content += `<table><tr><th>Date</th><th>Revenue</th><th>Orders</th></tr>`;
            salesData.labels.forEach((date, i) => {
                content += `<tr><td>${date}</td><td>${currencySymbol}${salesData.values[i].toFixed(2)}</td><td>${salesData.orders[i]}</td></tr>`;
            });
            content += `</table>`;
        } else if (reportType === "products") {
            content += `<table><tr><th>Rank</th><th>Product</th><th>Category</th><th>Quantity</th><th>Revenue</th></tr>`;
            topProducts.forEach((p, idx) => {
                content += `<tr><td>${idx + 1}</td><td>${p.name}</td><td>${p.category}</td><td>${p.quantity}</td><td>${currencySymbol}${p.revenue.toFixed(2)}</td></tr>`;
            });
            content += `</table>`;
        } else if (reportType === "categories") {
            content += `<table><tr><th>Category</th><th>Quantity</th><th>Revenue</th><th>Percentage</th></tr>`;
            const totalRevenue = categoryStats.reduce((sum, c) => sum + c.revenue, 0);
            categoryStats.forEach(c => {
                const pct = totalRevenue > 0 ? ((c.revenue / totalRevenue) * 100).toFixed(1) : 0;
                content += `<tr><td>${c.name}</td><td>${c.quantity}</td><td>${currencySymbol}${c.revenue.toFixed(2)}</td><td>${pct}%</td></tr>`;
            });
            content += `</table>`;
        } else if (reportType === "orders") {
            content += `<table><tr><th>Metric</th><th>Value</th></tr>
                <tr><td>Total Orders</td><td>${orderStats.total}</td></tr>
                <tr><td>Pending</td><td>${orderStats.pending}</td></tr>
                <tr><td>Processing</td><td>${orderStats.processing}</td></tr>
                <tr><td>Shipped</td><td>${orderStats.shipped}</td></tr>
                <tr><td>Delivered</td><td>${orderStats.delivered}</td></tr>
                <tr><td>Cancelled</td><td>${orderStats.cancelled}</td></tr>
                <tr><td>Total Revenue</td><td>${currencySymbol}${orderStats.totalRevenue.toFixed(2)}</td></tr>
            </table>`;
        } else if (reportType === "customers") {
            content += `<table><tr><th>Metric</th><th>Value</th></tr>
                <tr><td>Total Customers</td><td>${customerStats.total || 0}</td></tr>
                <tr><td>New This Month</td><td>${customerStats.newThisMonth || 0}</td></tr>
                <tr><td>Active Customers (30 days)</td><td>${customerStats.activeCustomers || 0}</td></tr>
                <tr><td>Repeat Customers</td><td>${customerStats.repeatCustomers || 0}</td></tr>
                <tr><td>Average Order Value</td><td>${currencySymbol}${(customerStats.averageOrderValue || 0).toFixed(2)}</td></tr>
            </table>`;
        } else if (reportType === "monthly") {
            content += `<table><tr><th>Month</th><th>Orders</th><th>Revenue</th></tr>`;
            monthlySales.forEach(m => {
                content += `<tr><td>${m.month}</td><td>${m.orders}</td><td>${currencySymbol}${m.revenue.toFixed(2)}</td></tr>`;
            });
            content += `</table>`;
        }
        
        content += `<div class="footer">Generated by ZAMED Admin Panel</div></body></html>`;
        printWindow.document.write(content);
        printWindow.document.close();
        printWindow.print();
    };

    const formatPrice = (price) => `${currencySymbol}${(price || 0).toFixed(2)}`;

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    const reportTabs = [
        { id: "sales", label: "Daily Sales", icon: FiDollarSign },
        { id: "monthly", label: "Monthly Sales", icon: FiCalendar },
        { id: "products", label: "Top Products", icon: FiPackage },
        { id: "categories", label: "Categories", icon: FiPieChart },
        { id: "orders", label: "Order Status", icon: FiShoppingBag },
        { id: "customers", label: "Customers", icon: FiUsers }
    ];

    return (
        <div>
            <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
                <div>
                    <h1 className="text-2xl font-bold dark:text-white">Reports & Analytics</h1>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">View detailed reports and insights</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={printReport} className="bg-gray-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-gray-700 transition-colors">
                        <FiPrinter size={16} /> Print
                    </button>
                    <button onClick={downloadReport} className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-green-700 transition-colors">
                        <FiDownload size={16} /> Export CSV
                    </button>
                    <button onClick={loadAllReports} className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-colors">
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

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-3 text-center">
                    <p className="text-xs text-gray-500">Total Orders</p>
                    <p className="text-xl font-bold dark:text-white">{orderStats.total}</p>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg shadow p-3 text-center">
                    <p className="text-xs text-green-600">Total Revenue</p>
                    <p className="text-xl font-bold text-green-700">{formatPrice(orderStats.totalRevenue)}</p>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg shadow p-3 text-center">
                    <p className="text-xs text-blue-600">Avg Order Value</p>
                    <p className="text-xl font-bold text-blue-700">{formatPrice(orderStats.delivered > 0 ? orderStats.totalRevenue / orderStats.delivered : 0)}</p>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg shadow p-3 text-center">
                    <p className="text-xs text-purple-600">Delivered</p>
                    <p className="text-xl font-bold text-purple-700">{orderStats.delivered}</p>
                </div>
                <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg shadow p-3 text-center">
                    <p className="text-xs text-orange-600">Today's Revenue</p>
                    <p className="text-xl font-bold text-orange-700">{formatPrice(dailySales.today?.revenue || 0)}</p>
                </div>
                <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg shadow p-3 text-center">
                    <p className="text-xs text-yellow-600">Completion Rate</p>
                    <p className="text-xl font-bold text-yellow-700">{orderStats.total > 0 ? ((orderStats.delivered / orderStats.total) * 100).toFixed(1) : 0}%</p>
                </div>
            </div>

            {/* Report Type Tabs */}
            <div className="flex flex-wrap gap-2 mb-6 border-b dark:border-gray-700 overflow-x-auto pb-1">
                {reportTabs.map(tab => {
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setReportType(tab.id)}
                            className={`px-4 py-2 font-semibold rounded-t-lg flex items-center gap-2 transition-all whitespace-nowrap ${
                                reportType === tab.id 
                                    ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50 dark:bg-blue-900/20" 
                                    : "text-gray-600 dark:text-gray-400 hover:text-blue-600"
                            }`}
                        >
                            <Icon size={16} /> {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* Daily Sales Report */}
            {reportType === "sales" && (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
                    <h2 className="text-xl font-semibold mb-4 dark:text-white">Daily Sales (Last 30 Days)</h2>
                    {salesData.values.length === 0 || salesData.values.every(v => v === 0) ? (
                        <div className="text-center py-12 text-gray-500">No sales data available</div>
                    ) : (
                        <>
                            <div className="relative h-80 mb-8 overflow-x-auto">
                                <div className="min-w-[600px] h-full flex items-end gap-1">
                                    {salesData.values.map((sale, idx) => {
                                        const maxSale = Math.max(...salesData.values, 1);
                                        const height = (sale / maxSale) * 200;
                                        return (
                                            <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                                                <div className="relative w-full group">
                                                    <div 
                                                        className="w-full bg-blue-500 hover:bg-blue-600 transition-all duration-300 rounded-t-lg"
                                                        style={{ height: `${Math.max(height, 4)}px`, minHeight: '4px' }}
                                                    >
                                                        <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                                                            {formatPrice(sale)}
                                                        </div>
                                                    </div>
                                                </div>
                                                <span className="text-[10px] text-gray-500 truncate w-full text-center">{salesData.labels[idx]}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 text-center">
                                    <p className="text-sm text-gray-500">Total (30 days)</p>
                                    <p className="text-2xl font-bold text-blue-600">{formatPrice(salesData.values.reduce((a, b) => a + b, 0))}</p>
                                </div>
                                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 text-center">
                                    <p className="text-sm text-gray-500">Average Daily</p>
                                    <p className="text-2xl font-bold text-green-600">{formatPrice(salesData.values.reduce((a, b) => a + b, 0) / 30)}</p>
                                </div>
                                <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 text-center">
                                    <p className="text-sm text-gray-500">Total Orders</p>
                                    <p className="text-2xl font-bold text-purple-600">{salesData.orders.reduce((a, b) => a + b, 0)}</p>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* Monthly Sales Report */}
            {reportType === "monthly" && (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
                    <h2 className="text-xl font-semibold mb-4 dark:text-white">Monthly Sales (Last 12 Months)</h2>
                    {monthlySales.length === 0 || monthlySales.every(m => m.revenue === 0) ? (
                        <div className="text-center py-12 text-gray-500">No monthly sales data available</div>
                    ) : (
                        <>
                            <div className="relative h-80 mb-8 overflow-x-auto">
                                <div className="min-w-[600px] h-full flex items-end gap-1">
                                    {monthlySales.map((month, idx) => {
                                        const maxRevenue = Math.max(...monthlySales.map(m => m.revenue), 1);
                                        const height = (month.revenue / maxRevenue) * 200;
                                        return (
                                            <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                                                <div className="relative w-full group">
                                                    <div 
                                                        className="w-full bg-purple-500 hover:bg-purple-600 transition-all duration-300 rounded-t-lg"
                                                        style={{ height: `${Math.max(height, 4)}px`, minHeight: '4px' }}
                                                    >
                                                        <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                                                            {formatPrice(month.revenue)}
                                                        </div>
                                                    </div>
                                                </div>
                                                <span className="text-[10px] text-gray-500 truncate w-full text-center">{month.month}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 text-center">
                                    <p className="text-sm text-gray-500">Yearly Total</p>
                                    <p className="text-2xl font-bold text-purple-600">{formatPrice(monthlySales.reduce((a, b) => a + b.revenue, 0))}</p>
                                </div>
                                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 text-center">
                                    <p className="text-sm text-gray-500">Best Month</p>
                                    <p className="text-2xl font-bold text-blue-600">{formatPrice(Math.max(...monthlySales.map(m => m.revenue), 0))}</p>
                                </div>
                                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 text-center">
                                    <p className="text-sm text-gray-500">Monthly Average</p>
                                    <p className="text-2xl font-bold text-green-600">{formatPrice(monthlySales.reduce((a, b) => a + b.revenue, 0) / 12)}</p>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* Top Products Report */}
            {reportType === "products" && (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden">
                    <div className="p-4 border-b dark:border-gray-700">
                        <h2 className="text-xl font-semibold dark:text-white">Top Selling Products</h2>
                    </div>
                    {topProducts.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">No product sales data available</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 dark:bg-gray-700">
                                    <tr>
                                        <th className="px-4 py-3 text-left">#</th>
                                        <th className="px-4 py-3 text-left">Product</th>
                                        <th className="px-4 py-3 text-left">Category</th>
                                        <th className="px-4 py-3 text-left">Qty Sold</th>
                                        <th className="px-4 py-3 text-left">Revenue</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {topProducts.map((p, idx) => (
                                        <tr key={idx} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                                            <td className="px-4 py-3 font-bold text-blue-600">#{idx+1}</td>
                                            <td className="px-4 py-3 dark:text-white">{p.name}</td>
                                            <td className="px-4 py-3 text-gray-500">{p.category}</td>
                                            <td className="px-4 py-3">{p.quantity}</td>
                                            <td className="px-4 py-3 font-semibold text-green-600">{formatPrice(p.revenue)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* Categories Report */}
            {reportType === "categories" && (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
                    <h2 className="text-xl font-semibold mb-4 dark:text-white">Sales by Category</h2>
                    {categoryStats.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">No category data available</div>
                    ) : (
                        categoryStats.map((cat, idx) => {
                            const totalRevenue = categoryStats.reduce((sum, c) => sum + c.revenue, 0);
                            const pct = totalRevenue > 0 ? (cat.revenue / totalRevenue) * 100 : 0;
                            return (
                                <div key={idx} className="mb-4">
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="dark:text-white">{cat.name}</span>
                                        <span className="dark:text-gray-300">{formatPrice(cat.revenue)} ({pct.toFixed(1)}%)</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
                                        <div className="bg-blue-600 rounded-full h-2 transition-all duration-500" style={{ width: `${pct}%` }}></div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            )}

            {/* Orders Report */}
            {reportType === "orders" && (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
                    <h2 className="text-xl font-semibold mb-4 dark:text-white">Order Status Distribution</h2>
                    {[
                        { label: "Pending", count: orderStats.pending, color: "bg-yellow-500" },
                        { label: "Processing", count: orderStats.processing, color: "bg-blue-500" },
                        { label: "Shipped", count: orderStats.shipped, color: "bg-purple-500" },
                        { label: "Delivered", count: orderStats.delivered, color: "bg-green-500" },
                        { label: "Cancelled", count: orderStats.cancelled, color: "bg-red-500" }
                    ].map(s => {
                        const pct = orderStats.total > 0 ? (s.count / orderStats.total) * 100 : 0;
                        return (
                            <div key={s.label} className="mb-4">
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="dark:text-white">{s.label}</span>
                                    <span className="dark:text-gray-300">{s.count} ({pct.toFixed(1)}%)</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
                                    <div className={`${s.color} rounded-full h-2 transition-all duration-500`} style={{ width: `${pct}%` }}></div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Customers Report */}
            {reportType === "customers" && (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
                    <h2 className="text-xl font-semibold mb-4 dark:text-white">Customer Insights</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 text-center">
                            <p className="text-gray-500 dark:text-gray-400 text-sm">Total Customers</p>
                            <p className="text-2xl font-bold dark:text-white">{customerStats.total || 0}</p>
                        </div>
                        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 text-center">
                            <p className="text-blue-600 dark:text-blue-400 text-sm">New This Month</p>
                            <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{customerStats.newThisMonth || 0}</p>
                        </div>
                        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 text-center">
                            <p className="text-green-600 dark:text-green-400 text-sm">Avg Order Value</p>
                            <p className="text-2xl font-bold text-green-700 dark:text-green-300">{formatPrice(customerStats.averageOrderValue || 0)}</p>
                        </div>
                        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 text-center">
                            <p className="text-purple-600 dark:text-purple-400 text-sm">Repeat Customers</p>
                            <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">{customerStats.repeatCustomers || 0}</p>
                        </div>
                        <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4 text-center">
                            <p className="text-orange-600 dark:text-orange-400 text-sm">Active (30 days)</p>
                            <p className="text-2xl font-bold text-orange-700 dark:text-orange-300">{customerStats.activeCustomers || 0}</p>
                        </div>
                        <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-4 text-center">
                            <p className="text-indigo-600 dark:text-indigo-400 text-sm">Repeat Rate</p>
                            <p className="text-2xl font-bold text-indigo-700 dark:text-indigo-300">
                                {customerStats.total ? ((customerStats.repeatCustomers / customerStats.total) * 100).toFixed(1) : 0}%
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Reports;