// src/pages/Admin/Coupons.jsx
import { useState, useEffect } from "react";
import { 
    FiPlus, FiEdit2, FiTrash2, FiX, FiTag, FiPercent, 
    FiDollarSign, FiCalendar, FiRefreshCw, FiCopy,
    FiCheckCircle, FiAlertCircle, FiUsers, FiShoppingBag,
    FiMail, FiSend, FiUserPlus, FiSearch, FiClock, FiFilter
} from "react-icons/fi";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const Coupons = () => {
    const [coupons, setCoupons] = useState([]);
    const [filteredCoupons, setFilteredCoupons] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [showModal, setShowModal] = useState(false);
    const [showEmailModal, setShowEmailModal] = useState(false);
    const [selectedCoupon, setSelectedCoupon] = useState(null);
    const [emailSubject, setEmailSubject] = useState("");
    const [emailMessage, setEmailMessage] = useState("");
    const [sendingEmail, setSendingEmail] = useState(false);
    const [editingCoupon, setEditingCoupon] = useState(null);
    const [darkMode, setDarkMode] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [formData, setFormData] = useState({
        code: "",
        description: "",
        discountType: "percentage",
        discountValue: 10,
        minPurchase: 0,
        maxDiscount: null,
        startDate: "",
        endDate: "",
        usageLimit: null,
        usedCount: 0,
        status: "active",
        applicableProducts: "all",
        applicableCategories: []
    });

    const getToken = () => localStorage.getItem('token');

    useEffect(() => {
        const checkDarkMode = () => {
            const isDark = document.documentElement.classList.contains('dark');
            setDarkMode(isDark);
        };
        checkDarkMode();
        loadCoupons();
    }, []);

    useEffect(() => {
        filterCoupons();
    }, [coupons, searchTerm]);

    const loadCoupons = async () => {
        setLoading(true);
        setError(null);
        
        // First load from localStorage
        loadLocalCoupons();
        
        const token = getToken();
        if (!token) {
            setLoading(false);
            return;
        }
        
        try {
            const response = await fetch(`${API_URL}/coupons`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.success && data.coupons) {
                    setCoupons(data.coupons);
                    localStorage.setItem('admin_coupons', JSON.stringify(data.coupons));
                    setLoading(false);
                    return;
                }
            }
        } catch (error) {
            console.log("Backend not available, using local coupons");
        }
        setLoading(false);
    };
    
    const loadLocalCoupons = () => {
        const stored = JSON.parse(localStorage.getItem('admin_coupons') || '[]');
        if (stored.length === 0) {
            const defaultCoupons = [
                { id: 1, code: "WELCOME10", description: "Welcome discount for new customers", discountType: "percentage", discountValue: 10, minPurchase: 50, maxDiscount: 50, startDate: new Date().toISOString().split('T')[0], endDate: new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0], usageLimit: 100, usedCount: 0, status: "active", applicableProducts: "all", createdAt: new Date().toISOString() },
                { id: 2, code: "SAVE20", description: "Save $20 on orders over $100", discountType: "fixed", discountValue: 20, minPurchase: 100, maxDiscount: null, startDate: new Date().toISOString().split('T')[0], endDate: new Date(Date.now() + 15*24*60*60*1000).toISOString().split('T')[0], usageLimit: 50, usedCount: 0, status: "active", applicableProducts: "all", createdAt: new Date().toISOString() }
            ];
            setCoupons(defaultCoupons);
        } else {
            setCoupons(stored);
        }
    };

    const filterCoupons = () => {
        let filtered = [...coupons];
        if (searchTerm) {
            filtered = filtered.filter(c => 
                c.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (c.description && c.description.toLowerCase().includes(searchTerm.toLowerCase()))
            );
        }
        setFilteredCoupons(filtered);
    };

    const generateCouponCode = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        for (let i = 0; i < 8; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        setFormData({ ...formData, code });
    };

    const copyToClipboard = (code) => {
        navigator.clipboard.writeText(code);
        toast.success(`Coupon code ${code} copied!`);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!formData.code || !formData.discountValue || !formData.startDate) {
            toast.error("Please fill all required fields");
            return;
        }
        
        const token = getToken();
        setLoading(true);
        
        const couponData = {
            code: formData.code.toUpperCase(),
            description: formData.description,
            discountType: formData.discountType,
            discountValue: parseFloat(formData.discountValue),
            minPurchase: parseFloat(formData.minPurchase) || 0,
            maxDiscount: formData.maxDiscount ? parseFloat(formData.maxDiscount) : null,
            startDate: formData.startDate,
            endDate: formData.endDate || null,
            usageLimit: formData.usageLimit ? parseInt(formData.usageLimit) : null,
            status: formData.status,
            applicableProducts: formData.applicableProducts
        };
        
        try {
            let response;
            if (editingCoupon) {
                response = await fetch(`${API_URL}/coupons/${editingCoupon.id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(couponData)
                });
            } else {
                response = await fetch(`${API_URL}/coupons`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(couponData)
                });
            }
            
            const data = await response.json();
            
            if (data.success) {
                toast.success(editingCoupon ? "Coupon updated!" : "Coupon created!");
                handleCloseModal();
                loadCoupons();
                setLoading(false);
                return;
            }
            throw new Error(data.message);
        } catch (error) {
            console.error("Error saving coupon:", error);
            
            // Fallback to localStorage
            const couponDataWithId = {
                id: editingCoupon ? editingCoupon.id : Date.now(),
                ...couponData,
                usedCount: editingCoupon ? editingCoupon.usedCount : 0,
                createdAt: editingCoupon ? editingCoupon.createdAt : new Date().toISOString()
            };
            
            let updatedCoupons;
            if (editingCoupon) {
                updatedCoupons = coupons.map(c => c.id === editingCoupon.id ? couponDataWithId : c);
            } else {
                updatedCoupons = [...coupons, couponDataWithId];
            }
            
            localStorage.setItem('admin_coupons', JSON.stringify(updatedCoupons));
            setCoupons(updatedCoupons);
            handleCloseModal();
            toast.success(editingCoupon ? "Coupon updated (local)!" : "Coupon created (local)!");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (coupon) => {
        if (!window.confirm(`Delete coupon "${coupon.code}"?`)) return;
        
        const token = getToken();
        
        try {
            const response = await fetch(`${API_URL}/coupons/${coupon.id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            const data = await response.json();
            
            if (data.success) {
                toast.success("Coupon deleted!");
                loadCoupons();
                return;
            }
            throw new Error(data.message);
        } catch (error) {
            const updatedCoupons = coupons.filter(c => c.id !== coupon.id);
            localStorage.setItem('admin_coupons', JSON.stringify(updatedCoupons));
            setCoupons(updatedCoupons);
            toast.success("Coupon deleted (local)!");
        }
    };

    const handleEdit = (coupon) => {
        setEditingCoupon(coupon);
        setFormData({
            code: coupon.code,
            description: coupon.description || "",
            discountType: coupon.discountType,
            discountValue: coupon.discountValue,
            minPurchase: coupon.minPurchase,
            maxDiscount: coupon.maxDiscount,
            startDate: coupon.startDate?.split('T')[0] || "",
            endDate: coupon.endDate?.split('T')[0] || "",
            usageLimit: coupon.usageLimit,
            usedCount: coupon.usedCount,
            status: coupon.status,
            applicableProducts: coupon.applicableProducts || "all"
        });
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setEditingCoupon(null);
        setFormData({
            code: "", description: "", discountType: "percentage", discountValue: 10,
            minPurchase: 0, maxDiscount: null, startDate: "", endDate: "",
            usageLimit: null, usedCount: 0, status: "active", applicableProducts: "all"
        });
    };

    const toggleCouponStatus = async (coupon) => {
        const newStatus = coupon.status === 'active' ? 'inactive' : 'active';
        const token = getToken();
        
        try {
            const response = await fetch(`${API_URL}/coupons/${coupon.id}/status`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ status: newStatus })
            });
            
            const data = await response.json();
            
            if (data.success) {
                toast.success(`Coupon ${newStatus}`);
                loadCoupons();
                return;
            }
            throw new Error(data.message);
        } catch (error) {
            const updatedCoupons = coupons.map(c => 
                c.id === coupon.id ? { ...c, status: newStatus } : c
            );
            setCoupons(updatedCoupons);
            localStorage.setItem('admin_coupons', JSON.stringify(updatedCoupons));
            toast.success(`Coupon ${newStatus} (local)`);
        }
    };

    const openEmailModal = (coupon) => {
        setSelectedCoupon(coupon);
        setEmailSubject(`Special Offer: ${coupon.code} - ${getDiscountDisplay(coupon)}`);
        setEmailMessage(`Dear Customer,\n\nUse coupon code ${coupon.code} to get ${getDiscountDisplay(coupon)} on your next purchase!\n\n${coupon.description || ''}\n\nValid until: ${coupon.endDate ? new Date(coupon.endDate).toLocaleDateString() : 'No expiry'}\n\nShop now at our store!\n\nThank you,\nZAMED Team`);
        setShowEmailModal(true);
    };

    const sendCouponToCustomers = async () => {
        if (!selectedCoupon) return;
        
        setSendingEmail(true);
        const token = getToken();
        
        let customers = [];
        try {
            const response = await fetch(`${API_URL}/users?role=user`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (data.success) {
                customers = data.users || [];
            }
        } catch (error) {
            customers = JSON.parse(localStorage.getItem('admin_customers') || '[]');
        }
        
        if (customers.length === 0) {
            toast.error("No customers found to send emails to");
            setSendingEmail(false);
            return;
        }
        
        toast.loading(`Sending to ${customers.length} customers...`, { id: "sending" });
        
        try {
            const response = await fetch(`${API_URL}/coupons/send-to-customers`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    couponId: selectedCoupon.id,
                    couponCode: selectedCoupon.code,
                    subject: emailSubject,
                    message: emailMessage,
                    customerEmails: customers.map(c => c.email)
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                toast.success(`Coupon sent to ${data.sentCount || customers.length} customers!`, { id: "sending" });
            } else {
                throw new Error(data.message);
            }
        } catch (error) {
            console.error("Error sending emails:", error);
            toast.success(`Email template ready! Would send to ${customers.length} customers.`, { id: "sending" });
            const emailContent = `To: Customers\nSubject: ${emailSubject}\n\n${emailMessage}`;
            navigator.clipboard.writeText(emailContent);
            toast.info("Email content copied to clipboard");
        } finally {
            setSendingEmail(false);
            setShowEmailModal(false);
        }
    };

    const getDiscountDisplay = (coupon) => {
        if (coupon.discountType === 'percentage') {
            return `${coupon.discountValue}% OFF`;
        }
        return `$${coupon.discountValue} OFF`;
    };

    const isCouponExpired = (coupon) => {
        if (!coupon.endDate) return false;
        return new Date(coupon.endDate) < new Date();
    };

    const getStatusBadge = (coupon) => {
        if (coupon.status === 'inactive') return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
        if (isCouponExpired(coupon)) return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
        if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
    };

    const getStatusText = (coupon) => {
        if (coupon.status === 'inactive') return 'Inactive';
        if (isCouponExpired(coupon)) return 'Expired';
        if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) return 'Used Up';
        return 'Active';
    };

    const activeCoupons = coupons.filter(c => c.status === 'active' && !isCouponExpired(c) && (!c.usageLimit || c.usedCount < c.usageLimit)).length;
    const expiredCoupons = coupons.filter(c => isCouponExpired(c)).length;
    const totalUsage = coupons.reduce((sum, c) => sum + (c.usedCount || 0), 0);

    if (loading && coupons.length === 0) {
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
                    <h1 className="text-2xl font-bold dark:text-white">Coupon Management</h1>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">Create, manage, and send discount coupons</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={loadCoupons} className="bg-gray-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"><FiRefreshCw size={16} /> Refresh</button>
                    <button onClick={() => setShowModal(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"><FiPlus size={16} /> Add Coupon</button>
                </div>
            </div>

            {error && (<div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3"><div className="flex items-center gap-2 text-yellow-700"><FiAlertCircle size={18} /><span className="text-sm">{error} - Using local backup</span></div></div>)}

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4"><div className="flex justify-between"><div><p className="text-gray-500 text-sm">Total Coupons</p><p className="text-2xl font-bold dark:text-white">{coupons.length}</p></div><FiTag className="text-blue-500 text-3xl" /></div></div>
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg shadow p-4"><div className="flex justify-between"><div><p className="text-green-600 text-sm">Active Coupons</p><p className="text-2xl font-bold text-green-700">{activeCoupons}</p></div><FiCheckCircle className="text-green-500 text-3xl" /></div></div>
                <div className="bg-red-50 dark:bg-red-900/20 rounded-lg shadow p-4"><div className="flex justify-between"><div><p className="text-red-600 text-sm">Expired</p><p className="text-2xl font-bold text-red-700">{expiredCoupons}</p></div><FiAlertCircle className="text-red-500 text-3xl" /></div></div>
                <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg shadow p-4"><div className="flex justify-between"><div><p className="text-purple-600 text-sm">Total Usage</p><p className="text-2xl font-bold text-purple-700">{totalUsage}</p></div><FiShoppingBag className="text-purple-500 text-3xl" /></div></div>
            </div>

            {/* Search Bar */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6"><div className="relative"><FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" /><input type="text" placeholder="Search coupons by code or description..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white" /></div></div>

            {/* Coupons List */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                {filteredCoupons.length === 0 ? (
                    <div className="text-center py-12"><FiTag className="w-16 h-16 text-gray-400 mx-auto mb-4" /><h3 className="text-lg font-semibold dark:text-white">No coupons found</h3><p className="text-gray-500">Click "Add Coupon" to create your first coupon</p></div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 dark:bg-gray-700"><tr><th className="px-4 py-3 text-left">Code</th><th className="px-4 py-3 text-left">Discount</th><th className="px-4 py-3 text-left">Min Purchase</th><th className="px-4 py-3 text-left">Valid Until</th><th className="px-4 py-3 text-left">Usage</th><th className="px-4 py-3 text-left">Status</th><th className="px-4 py-3 text-left">Actions</th></tr></thead>
                            <tbody>
                                {filteredCoupons.map((coupon) => (
                                    <tr key={coupon.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                                        <td className="px-4 py-3"><div className="flex items-center gap-2"><span className="font-mono font-bold text-blue-600">{coupon.code}</span><button onClick={() => copyToClipboard(coupon.code)} className="text-gray-400 hover:text-gray-600"><FiCopy size={14} /></button></div>{coupon.description && <p className="text-xs text-gray-500">{coupon.description}</p>}</td>
                                        <td className="px-4 py-3"><span className="font-semibold">{getDiscountDisplay(coupon)}</span>{coupon.maxDiscount && <p className="text-xs text-gray-500">Max ${coupon.maxDiscount}</p>}</td>
                                        <td className="px-4 py-3">{coupon.minPurchase > 0 ? `$${coupon.minPurchase}` : 'No minimum'}</td>
                                        <td className="px-4 py-3">{coupon.endDate ? new Date(coupon.endDate).toLocaleDateString() : 'No expiry'}{coupon.endDate && new Date(coupon.endDate) < new Date() && <span className="text-xs text-red-500 block">Expired</span>}</td>
                                        <td className="px-4 py-3">{coupon.usageLimit ? `${coupon.usedCount}/${coupon.usageLimit}` : `${coupon.usedCount} used`}</td>
                                        <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusBadge(coupon)}`}>{getStatusText(coupon)}</span></td>
                                        <td className="px-4 py-3"><div className="flex gap-2"><button onClick={() => openEmailModal(coupon)} className="text-purple-600 hover:text-purple-800" title="Send to Customers"><FiMail size={16} /></button><button onClick={() => toggleCouponStatus(coupon)} className="text-gray-500 hover:text-gray-700">{coupon.status === 'active' ? 'Deactivate' : 'Activate'}</button><button onClick={() => handleEdit(coupon)} className="text-blue-600 hover:text-blue-800">Edit</button><button onClick={() => handleDelete(coupon)} className="text-red-600 hover:text-red-800">Delete</button></div></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Add/Edit Coupon Modal */}
            <AnimatePresence>{showModal && (<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto" onClick={handleCloseModal}><motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}><div className="flex justify-between items-center mb-4"><h2 className="text-2xl font-bold dark:text-white">{editingCoupon ? "Edit Coupon" : "Create New Coupon"}</h2><button onClick={handleCloseModal} className="text-gray-500 text-2xl">&times;</button></div>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div><label className="block text-sm font-medium mb-1 dark:text-white">Coupon Code *</label><div className="flex gap-2"><input type="text" required value={formData.code} onChange={(e) => setFormData({...formData, code: e.target.value.toUpperCase()})} className="flex-1 px-3 py-2 border rounded-lg dark:bg-gray-700 uppercase" placeholder="SAVE20" /><button type="button" onClick={generateCouponCode} className="px-3 py-2 bg-gray-200 dark:bg-gray-600 rounded-lg">Generate</button></div></div>
                <div><label className="block text-sm font-medium mb-1 dark:text-white">Description</label><input type="text" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700" placeholder="e.g., Welcome discount for new customers" /></div>
                <div className="grid grid-cols-2 gap-3"><div><label className="block text-sm font-medium mb-1 dark:text-white">Discount Type *</label><select value={formData.discountType} onChange={(e) => setFormData({...formData, discountType: e.target.value})} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700"><option value="percentage">Percentage (%)</option><option value="fixed">Fixed Amount ($)</option></select></div><div><label className="block text-sm font-medium mb-1 dark:text-white">Discount Value *</label><input type="number" step="0.01" required value={formData.discountValue} onChange={(e) => setFormData({...formData, discountValue: e.target.value})} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700" /></div></div>
                <div className="grid grid-cols-2 gap-3"><div><label className="block text-sm font-medium mb-1 dark:text-white">Min Purchase</label><input type="number" step="0.01" value={formData.minPurchase} onChange={(e) => setFormData({...formData, minPurchase: e.target.value})} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700" placeholder="0" /></div><div><label className="block text-sm font-medium mb-1 dark:text-white">Max Discount</label><input type="number" step="0.01" value={formData.maxDiscount || ''} onChange={(e) => setFormData({...formData, maxDiscount: e.target.value || null})} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700" placeholder="No limit" /></div></div>
                <div className="grid grid-cols-2 gap-3"><div><label className="block text-sm font-medium mb-1 dark:text-white">Start Date *</label><input type="date" required value={formData.startDate} onChange={(e) => setFormData({...formData, startDate: e.target.value})} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700" /></div><div><label className="block text-sm font-medium mb-1 dark:text-white">End Date</label><input type="date" value={formData.endDate || ''} onChange={(e) => setFormData({...formData, endDate: e.target.value || null})} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700" /></div></div>
                <div className="grid grid-cols-2 gap-3"><div><label className="block text-sm font-medium mb-1 dark:text-white">Usage Limit</label><input type="number" value={formData.usageLimit || ''} onChange={(e) => setFormData({...formData, usageLimit: e.target.value || null})} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700" placeholder="Unlimited" /></div><div><label className="block text-sm font-medium mb-1 dark:text-white">Status</label><select value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700"><option value="active">Active</option><option value="inactive">Inactive</option></select></div></div>
                {editingCoupon && (<div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg"><p className="text-sm text-gray-600 dark:text-gray-400">Used {editingCoupon.usedCount} times</p></div>)}
                <div className="flex gap-3 pt-4"><button type="submit" disabled={loading} className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50">{loading ? "Saving..." : (editingCoupon ? "Update Coupon" : "Create Coupon")}</button><button type="button" onClick={handleCloseModal} className="flex-1 bg-gray-500 text-white py-2 rounded-lg hover:bg-gray-600">Cancel</button></div>
            </form></motion.div></div>)}</AnimatePresence>

            {/* Email to Customers Modal */}
            <AnimatePresence>{showEmailModal && selectedCoupon && (<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={() => setShowEmailModal(false)}><motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-white dark:bg-gray-800 rounded-lg max-w-lg w-full p-6" onClick={(e) => e.stopPropagation()}><div className="flex justify-between items-center mb-4"><h2 className="text-2xl font-bold dark:text-white">Send Coupon to Customers</h2><button onClick={() => setShowEmailModal(false)} className="text-gray-500 text-2xl">&times;</button></div>
            <div className="space-y-4"><div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg"><p className="text-sm text-gray-600 dark:text-gray-400">Coupon: <span className="font-bold text-blue-600">{selectedCoupon.code}</span></p><p className="text-sm text-gray-600 dark:text-gray-400">Discount: {getDiscountDisplay(selectedCoupon)}</p></div>
            <div><label className="block text-sm font-medium mb-1 dark:text-white">Email Subject</label><input type="text" value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700" /></div>
            <div><label className="block text-sm font-medium mb-1 dark:text-white">Email Message</label><textarea rows="6" value={emailMessage} onChange={(e) => setEmailMessage(e.target.value)} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700" /></div>
            <div className="flex gap-3 pt-4"><button onClick={sendCouponToCustomers} disabled={sendingEmail} className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2 disabled:opacity-50">{sendingEmail ? <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div> : <><FiSend size={16} /> Send to All Customers</>}</button><button onClick={() => setShowEmailModal(false)} className="flex-1 bg-gray-500 text-white py-2 rounded-lg hover:bg-gray-600">Cancel</button></div></div></motion.div></div>)}</AnimatePresence>
        </div>
    );
};

export default Coupons;