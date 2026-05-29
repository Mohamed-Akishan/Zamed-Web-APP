// src/pages/Admin/Customers.jsx
import { useState, useEffect } from "react";
import { 
    FiMail, FiPhone, FiCalendar, FiSearch, FiUsers, FiDollarSign, 
    FiShoppingBag, FiEye, FiEdit2, FiTrash2, FiX, FiCheck, FiClock,
    FiMapPin, FiStar, FiAward, FiTrendingUp, FiDownload, FiRefreshCw,
    FiMessageSquare, FiMail as FiMailIcon, FiAlertCircle
} from "react-icons/fi";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

const Customers = () => {
    const [customers, setCustomers] = useState([]);
    const [filteredCustomers, setFilteredCustomers] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [statusFilter, setStatusFilter] = useState("all");
    const [sortBy, setSortBy] = useState("newest");
    const [darkMode, setDarkMode] = useState(false);
    const [currencySymbol, setCurrencySymbol] = useState("$");
    const [stats, setStats] = useState({
        total: 0, active: 0, inactive: 0, blocked: 0,
        totalSpent: 0, totalOrders: 0, averageOrderValue: 0,
        newThisMonth: 0
    });
    const [editFormData, setEditFormData] = useState({
        name: "", email: "", phone: "", address: "", status: "active"
    });

    useEffect(() => {
        const checkDarkMode = () => {
            const isDark = document.documentElement.classList.contains('dark');
            setDarkMode(isDark);
        };
        checkDarkMode();
        
        const siteSettings = JSON.parse(localStorage.getItem('site_settings') || '{}');
        const symbols = { USD: "$", EUR: "€", GBP: "£", LKR: "Rs" };
        setCurrencySymbol(symbols[siteSettings.currency] || "$");
        
        loadAllCustomers();
        
        const handleStorageChange = () => loadAllCustomers();
        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, []);

    useEffect(() => {
        filterAndSortCustomers();
    }, [customers, searchTerm, statusFilter, sortBy]);

    const loadAllCustomers = () => {
        const allCustomers = [];
        
        // Get from user localStorage
        const userData = localStorage.getItem('user');
        if (userData) {
            try {
                const user = JSON.parse(userData);
                if (user && user.email) {
                    const userOrders = JSON.parse(localStorage.getItem(`orders_${user.email}`) || '[]');
                    allCustomers.push({
                        id: user.id || Date.now(),
                        name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email.split('@')[0],
                        email: user.email,
                        phone: user.phone || "Not provided",
                        address: user.address || "Not provided",
                        city: user.city || "",
                        joinDate: user.registeredAt ? user.registeredAt.split('T')[0] : new Date().toISOString().split('T')[0],
                        totalOrders: userOrders.length,
                        totalSpent: userOrders.reduce((sum, o) => sum + (o.total || 0), 0),
                        status: "active",
                        lastActive: new Date().toLocaleDateString(),
                        orders: userOrders
                    });
                }
            } catch (e) {}
        }
        
        // Scan for order histories
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('orders_')) {
                const email = key.replace('orders_', '');
                if (!allCustomers.some(c => c.email === email)) {
                    const userOrders = JSON.parse(localStorage.getItem(key) || '[]');
                    allCustomers.push({
                        id: Date.now() + Math.random(),
                        name: email.split('@')[0],
                        email: email,
                        phone: "Not provided",
                        address: "Not provided",
                        joinDate: userOrders[0]?.date?.split('T')[0] || new Date().toISOString().split('T')[0],
                        totalOrders: userOrders.length,
                        totalSpent: userOrders.reduce((sum, o) => sum + (o.total || 0), 0),
                        status: "active",
                        lastActive: new Date().toLocaleDateString(),
                        orders: userOrders
                    });
                }
            }
        }
        
        // Load saved customer data
        const savedCustomers = JSON.parse(localStorage.getItem('admin_customers') || '[]');
        savedCustomers.forEach(saved => {
            const existing = allCustomers.find(c => c.email === saved.email);
            if (existing) {
                existing.status = saved.status || existing.status;
                existing.phone = saved.phone || existing.phone;
                existing.address = saved.address || existing.address;
            } else {
                allCustomers.push(saved);
            }
        });
        
        // Calculate stats
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        const newThisMonth = allCustomers.filter(c => {
            const joinDate = new Date(c.joinDate);
            return joinDate.getMonth() === currentMonth && joinDate.getFullYear() === currentYear;
        }).length;
        
        const totalSpent = allCustomers.reduce((sum, c) => sum + (c.totalSpent || 0), 0);
        const totalOrders = allCustomers.reduce((sum, c) => sum + (c.totalOrders || 0), 0);
        
        setStats({
            total: allCustomers.length,
            active: allCustomers.filter(c => c.status === 'active').length,
            inactive: allCustomers.filter(c => c.status === 'inactive').length,
            blocked: allCustomers.filter(c => c.status === 'blocked').length,
            totalSpent,
            totalOrders,
            averageOrderValue: totalOrders > 0 ? totalSpent / totalOrders : 0,
            newThisMonth
        });
        
        setCustomers(allCustomers);
        localStorage.setItem('admin_customers', JSON.stringify(allCustomers));
    };

    const filterAndSortCustomers = () => {
        let filtered = [...customers];
        
        if (searchTerm) {
            filtered = filtered.filter(c => 
                c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (c.phone && c.phone.includes(searchTerm))
            );
        }
        
        if (statusFilter !== "all") {
            filtered = filtered.filter(c => c.status === statusFilter);
        }
        
        if (sortBy === "newest") filtered.sort((a, b) => new Date(b.joinDate) - new Date(a.joinDate));
        else if (sortBy === "oldest") filtered.sort((a, b) => new Date(a.joinDate) - new Date(b.joinDate));
        else if (sortBy === "spent-high") filtered.sort((a, b) => (b.totalSpent || 0) - (a.totalSpent || 0));
        else if (sortBy === "orders-high") filtered.sort((a, b) => (b.totalOrders || 0) - (a.totalOrders || 0));
        
        setFilteredCustomers(filtered);
    };

    const updateCustomerStatus = (email, newStatus) => {
        const updatedCustomers = customers.map(customer =>
            customer.email === email ? { ...customer, status: newStatus } : customer
        );
        setCustomers(updatedCustomers);
        localStorage.setItem('admin_customers', JSON.stringify(updatedCustomers));
        toast.success(`Customer status updated to ${newStatus}`);
        loadAllCustomers();
    };

    const updateCustomerInfo = () => {
        const updatedCustomers = customers.map(customer =>
            customer.email === editFormData.email ? { ...customer, ...editFormData } : customer
        );
        setCustomers(updatedCustomers);
        localStorage.setItem('admin_customers', JSON.stringify(updatedCustomers));
        toast.success("Customer information updated");
        setShowEditModal(false);
        setEditingCustomer(null);
        loadAllCustomers();
    };

    const deleteCustomer = (email, name) => {
        if (window.confirm(`Are you sure you want to delete ${name}? This action cannot be undone.`)) {
            const updatedCustomers = customers.filter(c => c.email !== email);
            setCustomers(updatedCustomers);
            localStorage.setItem('admin_customers', JSON.stringify(updatedCustomers));
            toast.success(`Customer ${name} removed`);
            loadAllCustomers();
        }
    };

    const sendEmailToCustomer = (customer) => {
        toast.success(`Email sent to ${customer.email}`);
    };

    const viewCustomerDetails = (customer) => {
        setSelectedCustomer(customer);
        setShowDetailsModal(true);
    };

    const openEditModal = (customer) => {
        setEditingCustomer(customer);
        setEditFormData({
            name: customer.name,
            email: customer.email,
            phone: customer.phone || "",
            address: customer.address || "",
            status: customer.status || "active"
        });
        setShowEditModal(true);
    };

    const exportCustomers = () => {
        const exportData = filteredCustomers.map(c => ({
            Name: c.name, Email: c.email, Phone: c.phone, Address: c.address,
            "Join Date": c.joinDate, "Total Orders": c.totalOrders || 0,
            "Total Spent": c.totalSpent || 0, Status: c.status || "active"
        }));
        const csv = [Object.keys(exportData[0] || {}).join(','), ...exportData.map(row => Object.values(row).join(','))].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `customers_export_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("Customers exported!");
    };

    const formatPrice = (price) => `${currencySymbol}${(price || 0).toFixed(2)}`;

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold dark:text-white">Customer Management</h1>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">Manage your customer base and their information</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={exportCustomers} className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"><FiDownload size={16} /> Export</button>
                    <button onClick={loadAllCustomers} className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"><FiRefreshCw size={16} /> Refresh</button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-3 text-center"><p className="text-xs text-gray-500">Total</p><p className="text-xl font-bold dark:text-white">{stats.total}</p></div>
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg shadow p-3 text-center"><p className="text-xs text-green-600">Active</p><p className="text-xl font-bold text-green-700">{stats.active}</p></div>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg shadow p-3 text-center"><p className="text-xs text-gray-500">Inactive</p><p className="text-xl font-bold">{stats.inactive}</p></div>
                <div className="bg-red-50 dark:bg-red-900/20 rounded-lg shadow p-3 text-center"><p className="text-xs text-red-600">Blocked</p><p className="text-xl font-bold text-red-700">{stats.blocked}</p></div>
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg shadow p-3 text-center"><p className="text-xs text-blue-600">Orders</p><p className="text-xl font-bold text-blue-700">{stats.totalOrders}</p></div>
                <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg shadow p-3 text-center"><p className="text-xs text-purple-600">Total Spent</p><p className="text-xl font-bold text-purple-700">{formatPrice(stats.totalSpent)}</p></div>
                <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg shadow p-3 text-center"><p className="text-xs text-orange-600">New This Month</p><p className="text-xl font-bold text-orange-700">{stats.newThisMonth}</p></div>
            </div>

            {/* Search and Filters */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6">
                <div className="flex flex-wrap gap-4">
                    <div className="flex-1 relative"><FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" /><input type="text" placeholder="Search by name, email, or phone..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600" /></div>
                    <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"><option value="all">All Status</option><option value="active">Active</option><option value="inactive">Inactive</option><option value="blocked">Blocked</option></select>
                    <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"><option value="newest">Newest First</option><option value="oldest">Oldest First</option><option value="spent-high">Highest Spent</option><option value="orders-high">Most Orders</option></select>
                </div>
            </div>

            {/* Customers Table */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                {filteredCustomers.length === 0 ? (
                    <div className="text-center py-12"><FiUsers className="w-16 h-16 text-gray-400 mx-auto mb-4" /><h3 className="text-lg font-semibold">No customers found</h3></div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 dark:bg-gray-700">
                                <tr><th className="px-4 py-3 text-left">Customer</th><th className="px-4 py-3 text-left">Contact</th><th className="px-4 py-3 text-left">Joined</th><th className="px-4 py-3 text-left">Orders</th><th className="px-4 py-3 text-left">Total Spent</th><th className="px-4 py-3 text-left">Status</th><th className="px-4 py-3 text-left">Actions</th></tr>
                            </thead>
                            <tbody>
                                {filteredCustomers.map((customer) => (
                                    <tr key={customer.email} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                                        <td className="px-4 py-3"><div><p className="font-medium dark:text-white">{customer.name}</p><p className="text-sm text-gray-500">{customer.email}</p></div></td>
                                        <td className="px-4 py-3"><div className="flex flex-col gap-1"><span className="text-sm flex items-center"><FiPhone className="mr-2 text-gray-400" size={12} />{customer.phone}</span>{customer.address !== "Not provided" && <span className="text-xs text-gray-500 flex items-center"><FiMapPin className="mr-1" size={10} />{customer.address?.substring(0, 30)}</span>}</div></td>
                                        <td className="px-4 py-3"><div className="flex items-center"><FiCalendar className="mr-2 text-gray-400" size={14} /><span className="text-sm">{customer.joinDate}</span></div></td>
                                        <td className="px-4 py-3 text-center font-semibold">{customer.totalOrders || 0}</td>
                                        <td className="px-4 py-3 font-semibold text-green-600">{formatPrice(customer.totalSpent || 0)}</td>
                                        <td className="px-4 py-3"><select value={customer.status || "active"} onChange={(e) => updateCustomerStatus(customer.email, e.target.value)} className={`px-2 py-1 rounded-full text-xs font-semibold ${customer.status === 'active' ? 'bg-green-100 text-green-800' : customer.status === 'inactive' ? 'bg-gray-100 text-gray-800' : 'bg-red-100 text-red-800'}`}><option value="active">Active</option><option value="inactive">Inactive</option><option value="blocked">Blocked</option></select></td>
                                        <td className="px-4 py-3"><div className="flex gap-2"><button onClick={() => viewCustomerDetails(customer)} className="text-blue-600 hover:text-blue-800" title="View Details"><FiEye size={16} /></button><button onClick={() => openEditModal(customer)} className="text-green-600 hover:text-green-800" title="Edit"><FiEdit2 size={16} /></button><button onClick={() => sendEmailToCustomer(customer)} className="text-purple-600 hover:text-purple-800" title="Send Email"><FiMailIcon size={16} /></button><button onClick={() => deleteCustomer(customer.email, customer.name)} className="text-red-600 hover:text-red-800" title="Delete"><FiTrash2 size={16} /></button></div></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Customer Details Modal */}
            <AnimatePresence>
                {showDetailsModal && selectedCustomer && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={() => setShowDetailsModal(false)}>
                        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
                            <div className="flex justify-between items-center mb-4"><h2 className="text-2xl font-bold">Customer Details</h2><button onClick={() => setShowDetailsModal(false)} className="text-gray-500 text-2xl">&times;</button></div>
                            <div className="space-y-4">
                                <div className="flex items-center gap-4 pb-4 border-b"><div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">{selectedCustomer.name.charAt(0)}</div><div><h3 className="text-xl font-semibold">{selectedCustomer.name}</h3><p className="text-gray-500">{selectedCustomer.email}</p><span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs ${selectedCustomer.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{selectedCustomer.status}</span></div></div>
                                <div className="grid grid-cols-2 gap-4"><div><p className="text-sm text-gray-500">Phone</p><p className="font-medium">{selectedCustomer.phone}</p></div><div><p className="text-sm text-gray-500">Joined Date</p><p className="font-medium">{selectedCustomer.joinDate}</p></div><div><p className="text-sm text-gray-500">Last Active</p><p className="font-medium">{selectedCustomer.lastActive}</p></div><div><p className="text-sm text-gray-500">Total Orders</p><p className="font-medium text-blue-600">{selectedCustomer.totalOrders}</p></div><div><p className="text-sm text-gray-500">Total Spent</p><p className="font-medium text-green-600">{formatPrice(selectedCustomer.totalSpent)}</p></div><div><p className="text-sm text-gray-500">Average Order Value</p><p className="font-medium">{selectedCustomer.totalOrders > 0 ? formatPrice(selectedCustomer.totalSpent / selectedCustomer.totalOrders) : formatPrice(0)}</p></div></div>
                                <div className="border-t pt-4"><p className="text-sm text-gray-500">Address</p><p className="font-medium">{selectedCustomer.address}</p>{selectedCustomer.city && <p className="text-sm text-gray-600">{selectedCustomer.city}</p>}</div>
                                {selectedCustomer.orders && selectedCustomer.orders.length > 0 && (<div className="border-t pt-4"><h3 className="font-semibold mb-3">Recent Orders</h3><div className="space-y-2 max-h-48 overflow-y-auto">{selectedCustomer.orders.slice(0, 5).map(order => (<div key={order.id} className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-700 rounded"><div><p className="font-mono text-sm">{order.id}</p><p className="text-xs text-gray-500">{new Date(order.date).toLocaleDateString()}</p></div><div><span className={`px-2 py-0.5 rounded-full text-xs ${order.status === 'delivered' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>{order.status}</span><p className="font-semibold mt-1">{formatPrice(order.total)}</p></div></div>))}</div></div>)}
                            </div>
                            <div className="flex gap-3 mt-6"><button onClick={() => { setShowDetailsModal(false); openEditModal(selectedCustomer); }} className="flex-1 bg-blue-600 text-white py-2 rounded-lg">Edit Customer</button><button onClick={() => setShowDetailsModal(false)} className="flex-1 bg-gray-500 text-white py-2 rounded-lg">Close</button></div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Edit Customer Modal */}
            <AnimatePresence>
                {showEditModal && editingCustomer && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={() => setShowEditModal(false)}>
                        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
                            <h2 className="text-2xl font-bold mb-4">Edit Customer</h2>
                            <div className="space-y-4"><div><label className="block text-sm font-medium mb-1">Name</label><input type="text" value={editFormData.name} onChange={(e) => setEditFormData({...editFormData, name: e.target.value})} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700" /></div><div><label className="block text-sm font-medium mb-1">Email</label><input type="email" value={editFormData.email} onChange={(e) => setEditFormData({...editFormData, email: e.target.value})} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700" disabled /></div><div><label className="block text-sm font-medium mb-1">Phone</label><input type="tel" value={editFormData.phone} onChange={(e) => setEditFormData({...editFormData, phone: e.target.value})} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700" /></div><div><label className="block text-sm font-medium mb-1">Address</label><textarea value={editFormData.address} onChange={(e) => setEditFormData({...editFormData, address: e.target.value})} rows="2" className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700" /></div><div><label className="block text-sm font-medium mb-1">Status</label><select value={editFormData.status} onChange={(e) => setEditFormData({...editFormData, status: e.target.value})} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700"><option value="active">Active</option><option value="inactive">Inactive</option><option value="blocked">Blocked</option></select></div></div>
                            <div className="flex gap-3 mt-6"><button onClick={updateCustomerInfo} className="flex-1 bg-blue-600 text-white py-2 rounded-lg">Save Changes</button><button onClick={() => setShowEditModal(false)} className="flex-1 bg-gray-500 text-white py-2 rounded-lg">Cancel</button></div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Customers;