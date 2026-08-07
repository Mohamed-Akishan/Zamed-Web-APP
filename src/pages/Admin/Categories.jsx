// src/pages/Admin/Categories.jsx
import { useState, useEffect } from "react";
import { 
    FiPlus, FiEdit2, FiTrash2, FiX, FiTag, FiGrid, FiList,
    FiSearch, FiFolder, FiEye, FiEyeOff, FiRefreshCw, FiDownload,
    FiInfo, FiPackage, FiArrowUp, FiArrowDown, FiAlertCircle
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

const Categories = () => {
    const [categories, setCategories] = useState([]);
    const [filteredCategories, setFilteredCategories] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [showModal, setShowModal] = useState(false);
    const [editingCategory, setEditingCategory] = useState(null);
    const [viewMode, setViewMode] = useState("grid");
    const [darkMode, setDarkMode] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [showProductsModal, setShowProductsModal] = useState(false);
    const [productsInCategory, setProductsInCategory] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [formData, setFormData] = useState({
        name: "",
        slug: "",
        description: "",
        parentCategory: "",
        status: "active",
        metaTitle: "",
        metaDescription: "",
        order: 0
    });

    const getToken = () => localStorage.getItem('token');

    useEffect(() => {
        const checkDarkMode = () => {
            const isDark = document.documentElement.classList.contains('dark');
            setDarkMode(isDark);
        };
        checkDarkMode();
        loadCategories();
    }, []);

    useEffect(() => {
        filterCategories();
    }, [categories, searchTerm]);

    const loadCategories = async () => {
        setLoading(true);
        setError(null);
        
        // First load from localStorage
        loadLocalCategories();
        
        const token = getToken();
        if (!token) {
            setLoading(false);
            return;
        }
        
        try {
            const response = await fetch(`${API_URL}/categories`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.success && data.categories) {
                    setCategories(data.categories);
                    localStorage.setItem('admin_categories', JSON.stringify(data.categories));
                    setLoading(false);
                    return;
                }
            }
        } catch (error) {
            console.log("Backend not available, using local categories");
        }
        setLoading(false);
    };
    
    const loadLocalCategories = () => {
        const stored = JSON.parse(localStorage.getItem('admin_categories') || '[]');
        const products = JSON.parse(localStorage.getItem('shop_products') || '[]');
        
        if (stored.length === 0) {
            const defaultCategories = [
                { id: 1, name: "Top Wear", slug: "top-wear", description: "Shirts, t-shirts, blouses, sweaters", productCount: 0, status: "active", order: 1, parentCategory: "", metaTitle: "Top Wear Collection", metaDescription: "Shop the latest top wear" },
                { id: 2, name: "Bottom Wear", slug: "bottom-wear", description: "Jeans, pants, shorts, skirts", productCount: 0, status: "active", order: 2, parentCategory: "", metaTitle: "Bottom Wear Collection", metaDescription: "Shop the latest bottom wear" },
                { id: 3, name: "Footwear", slug: "footwear", description: "Shoes, sneakers, boots, sandals", productCount: 0, status: "active", order: 3, parentCategory: "", metaTitle: "Footwear Collection", metaDescription: "Shop the latest footwear" },
                { id: 4, name: "Accessories", slug: "accessories", description: "Bags, watches, belts, jewelry", productCount: 0, status: "active", order: 4, parentCategory: "", metaTitle: "Accessories Collection", metaDescription: "Shop the latest accessories" },
                { id: 5, name: "Men's", slug: "men", description: "Men's fashion collection", productCount: 0, status: "active", order: 5, parentCategory: "", metaTitle: "Men's Collection", metaDescription: "Shop men's fashion" },
                { id: 6, name: "Women's", slug: "women", description: "Women's fashion collection", productCount: 0, status: "active", order: 6, parentCategory: "", metaTitle: "Women's Collection", metaDescription: "Shop women's fashion" },
                { id: 7, name: "Kids", slug: "kids", description: "Kids fashion collection", productCount: 0, status: "active", order: 7, parentCategory: "", metaTitle: "Kids Collection", metaDescription: "Shop kids fashion" }
            ];
            
            // Calculate product counts
            const categoriesWithCounts = defaultCategories.map(cat => ({
                ...cat,
                productCount: products.filter(p => p.category === cat.name || p.category === cat.slug).length
            }));
            
            setCategories(categoriesWithCounts);
            localStorage.setItem('admin_categories', JSON.stringify(categoriesWithCounts));
        } else {
            // Update product counts for existing categories
            const categoriesWithCounts = stored.map(cat => ({
                ...cat,
                productCount: products.filter(p => p.category === cat.name || p.category === cat.slug).length
            }));
            setCategories(categoriesWithCounts);
        }
    };

    const filterCategories = () => {
        let filtered = [...categories];
        if (searchTerm) {
            filtered = filtered.filter(c => 
                c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (c.description && c.description.toLowerCase().includes(searchTerm.toLowerCase()))
            );
        }
        filtered.sort((a, b) => (a.order || 0) - (b.order || 0));
        setFilteredCategories(filtered);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!formData.name || !formData.slug) {
            toast.error("Please fill all required fields");
            return;
        }
        
        // Check for duplicate slug in current categories
        const existingCategory = categories.find(c => c.slug === formData.slug && c.id !== editingCategory?.id);
        if (existingCategory) {
            toast.error("Category with this slug already exists");
            return;
        }
        
        const token = getToken();
        setLoading(true);
        
        const categoryData = {
            name: formData.name,
            slug: formData.slug.toLowerCase().replace(/ /g, '-'),
            description: formData.description,
            parentCategory: formData.parentCategory || null,
            status: formData.status,
            metaTitle: formData.metaTitle || formData.name,
            metaDescription: formData.metaDescription || formData.description,
            order: parseInt(formData.order) || 0
        };
        
        try {
            let response;
            if (editingCategory) {
                response = await fetch(`${API_URL}/categories/${editingCategory.id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(categoryData)
                });
            } else {
                response = await fetch(`${API_URL}/categories`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(categoryData)
                });
            }
            
            const data = await response.json();
            
            if (data.success) {
                toast.success(editingCategory ? "Category updated!" : "Category created!");
                handleCloseModal();
                loadCategories();
                setLoading(false);
                return;
            }
            throw new Error(data.message);
        } catch (error) {
            console.error("Error saving category:", error);
            
            // Fallback to localStorage
            const categoryDataWithId = {
                id: editingCategory ? editingCategory.id : Date.now(),
                ...categoryData,
                productCount: editingCategory ? editingCategory.productCount : 0,
                createdAt: editingCategory ? editingCategory.createdAt : new Date().toISOString()
            };
            
            let updatedCategories;
            if (editingCategory) {
                updatedCategories = categories.map(c => c.id === editingCategory.id ? categoryDataWithId : c);
            } else {
                updatedCategories = [...categories, categoryDataWithId];
            }
            
            localStorage.setItem('admin_categories', JSON.stringify(updatedCategories));
            setCategories(updatedCategories);
            handleCloseModal();
            toast.success(editingCategory ? "Category updated (local)!" : "Category added (local)!");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (category) => {
        if (category.productCount > 0) {
            toast.error(`Cannot delete "${category.name}" because it has ${category.productCount} products. Please reassign those products first.`);
            return;
        }
        
        if (!window.confirm(`⚠️ Delete "${category.name}"? This cannot be undone.`)) return;
        
        const token = getToken();
        
        try {
            const response = await fetch(`${API_URL}/categories/${category.id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            const data = await response.json();
            
            if (data.success) {
                toast.success(`"${category.name}" deleted!`);
                loadCategories();
                return;
            }
            throw new Error(data.message);
        } catch (error) {
            // Fallback
            const updatedCategories = categories.filter(c => c.id !== category.id);
            localStorage.setItem('admin_categories', JSON.stringify(updatedCategories));
            setCategories(updatedCategories);
            toast.success(`"${category.name}" deleted (local)!`);
        }
    };

    const handleEdit = (category) => {
        setEditingCategory(category);
        setFormData({
            name: category.name,
            slug: category.slug,
            description: category.description || "",
            parentCategory: category.parentCategory || "",
            status: category.status || "active",
            metaTitle: category.metaTitle || category.name,
            metaDescription: category.metaDescription || category.description || "",
            order: category.order || 0
        });
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setEditingCategory(null);
        setFormData({
            name: "", slug: "", description: "", parentCategory: "",
            status: "active", metaTitle: "", metaDescription: "", order: 0
        });
    };

    const toggleCategoryStatus = async (category) => {
        const newStatus = category.status === 'active' ? 'inactive' : 'active';
        const token = getToken();
        
        try {
            const response = await fetch(`${API_URL}/categories/${category.id}/status`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ status: newStatus })
            });
            
            const data = await response.json();
            
            if (data.success) {
                toast.success(`${category.name} is now ${newStatus}`);
                loadCategories();
                return;
            }
            throw new Error(data.message);
        } catch (error) {
            // Fallback
            const updatedCategories = categories.map(c => 
                c.id === category.id ? { ...c, status: newStatus } : c
            );
            setCategories(updatedCategories);
            localStorage.setItem('admin_categories', JSON.stringify(updatedCategories));
            toast.success(`${category.name} is now ${newStatus} (local)`);
        }
    };

    const viewProductsInCategory = (category) => {
        setSelectedCategory(category);
        const products = JSON.parse(localStorage.getItem('shop_products') || '[]');
        const filtered = products.filter(p => p.category === category.name || p.category === category.slug);
        setProductsInCategory(filtered);
        setShowProductsModal(true);
    };

    const generateSlug = (name) => {
        return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    };

    const exportCategories = () => {
        if (filteredCategories.length === 0) {
            toast.error("No categories to export");
            return;
        }
        
        const exportData = filteredCategories.map(c => ({
            Name: c.name,
            Slug: c.slug,
            Description: c.description || "",
            Status: c.status,
            "Product Count": c.productCount,
            "Parent Category": c.parentCategory || "None",
            Order: c.order
        }));
        
        const headers = Object.keys(exportData[0]);
        const csvRows = [headers.join(',')];
        
        for (const row of exportData) {
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
        a.download = `categories_export_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("Categories exported!");
    };

    const moveCategory = (category, direction) => {
        const currentIndex = categories.findIndex(c => c.id === category.id);
        const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
        
        if (newIndex < 0 || newIndex >= categories.length) return;
        
        const newCategories = [...categories];
        [newCategories[currentIndex], newCategories[newIndex]] = [newCategories[newIndex], newCategories[currentIndex]];
        
        const updatedWithOrder = newCategories.map((item, idx) => ({ ...item, order: idx + 1 }));
        setCategories(updatedWithOrder);
        localStorage.setItem('admin_categories', JSON.stringify(updatedWithOrder));
        toast.success(`Category moved ${direction}`);
    };

    const activeCategories = categories.filter(c => c.status === 'active').length;
    const inactiveCategories = categories.filter(c => c.status === 'inactive').length;
    const totalProducts = categories.reduce((sum, c) => sum + (c.productCount || 0), 0);

    if (loading && categories.length === 0) {
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
                    <h1 className="text-2xl font-bold dark:text-white">Category Management</h1>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">Manage product categories for your store</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={exportCategories} className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2">
                        <FiDownload size={16} /> Export
                    </button>
                    <button onClick={loadCategories} className="bg-gray-600 text-white px-4 py-2 rounded-lg flex items-center gap-2">
                        <FiRefreshCw size={16} /> Refresh
                    </button>
                    <button onClick={() => setShowModal(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2">
                        <FiPlus size={16} /> Add Category
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
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                    <div className="flex justify-between items-center">
                        <div><p className="text-gray-500 text-sm">Total Categories</p><p className="text-2xl font-bold dark:text-white">{categories.length}</p></div>
                        <FiFolder className="text-blue-500 text-3xl" />
                    </div>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg shadow p-4">
                    <div className="flex justify-between items-center">
                        <div><p className="text-green-600 text-sm">Active</p><p className="text-2xl font-bold text-green-700">{activeCategories}</p></div>
                        <FiEye className="text-green-500 text-3xl" />
                    </div>
                </div>
                <div className="bg-red-50 dark:bg-red-900/20 rounded-lg shadow p-4">
                    <div className="flex justify-between items-center">
                        <div><p className="text-red-600 text-sm">Inactive</p><p className="text-2xl font-bold text-red-700">{inactiveCategories}</p></div>
                        <FiEyeOff className="text-red-500 text-3xl" />
                    </div>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg shadow p-4">
                    <div className="flex justify-between items-center">
                        <div><p className="text-purple-600 text-sm">Total Products</p><p className="text-2xl font-bold text-purple-700">{totalProducts}</p></div>
                        <FiPackage className="text-purple-500 text-3xl" />
                    </div>
                </div>
            </div>

            {/* Search Bar */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6">
                <div className="relative">
                    <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input type="text" placeholder="Search categories..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                </div>
            </div>

            {/* View Toggle */}
            <div className="flex justify-end gap-2 mb-4">
                <button onClick={() => setViewMode("grid")} className={`p-2 rounded-lg ${viewMode === "grid" ? "bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400" : "hover:bg-gray-100 dark:hover:bg-gray-700"}`}>
                    <FiGrid size={18} />
                </button>
                <button onClick={() => setViewMode("list")} className={`p-2 rounded-lg ${viewMode === "list" ? "bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400" : "hover:bg-gray-100 dark:hover:bg-gray-700"}`}>
                    <FiList size={18} />
                </button>
            </div>

            {/* Categories Display */}
            {filteredCategories.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
                    <FiFolder className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold dark:text-white">No categories found</h3>
                    <button onClick={() => setShowModal(true)} className="mt-4 text-blue-600 hover:text-blue-700">+ Add your first category</button>
                </div>
            ) : viewMode === "grid" ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filteredCategories.map((category, index) => (
                        <motion.div
                            key={category.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className={`bg-white dark:bg-gray-800 border rounded-lg p-4 hover:shadow-lg transition-all ${category.status === 'inactive' ? 'opacity-60' : ''}`}
                        >
                            <div className="flex justify-between items-start">
                                <div className="flex-1">
                                    <h3 className="font-semibold text-lg dark:text-white">{category.name}</h3>
                                    <p className="text-xs text-gray-500">Slug: {category.slug}</p>
                                    {category.description && <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 line-clamp-2">{category.description}</p>}
                                    <div className="flex items-center gap-2 mt-3">
                                        <span className="text-xs bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-400 px-2 py-1 rounded-full">
                                            {category.productCount || 0} products
                                        </span>
                                        <span className={`text-xs px-2 py-1 rounded-full ${category.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400'}`}>
                                            {category.status}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <button onClick={() => moveCategory(category, 'up')} className="p-1 text-gray-500 hover:text-gray-700" title="Move Up"><FiArrowUp size={14} /></button>
                                    <button onClick={() => moveCategory(category, 'down')} className="p-1 text-gray-500 hover:text-gray-700" title="Move Down"><FiArrowDown size={14} /></button>
                                    <button onClick={() => toggleCategoryStatus(category)} className={`p-1 ${category.status === 'active' ? 'text-green-600' : 'text-gray-400'}`}>
                                        {category.status === 'active' ? <FiEye size={16} /> : <FiEyeOff size={16} />}
                                    </button>
                                    <button onClick={() => handleEdit(category)} className="text-blue-600 hover:text-blue-800 p-1"><FiEdit2 size={16} /></button>
                                    <button onClick={() => viewProductsInCategory(category)} className="text-purple-600 hover:text-purple-800 p-1"><FiPackage size={16} /></button>
                                    <button onClick={() => handleDelete(category)} className="text-red-600 hover:text-red-800 p-1"><FiTrash2 size={16} /></button>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            ) : (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 dark:bg-gray-700">
                                <tr>
                                    <th className="px-4 py-3 text-left">Name</th>
                                    <th className="px-4 py-3 text-left">Slug</th>
                                    <th className="px-4 py-3 text-center">Products</th>
                                    <th className="px-4 py-3 text-left">Status</th>
                                    <th className="px-4 py-3 text-left">Order</th>
                                    <th className="px-4 py-3 text-left">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredCategories.map((category) => (
                                    <tr key={category.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                                        <td className="px-4 py-3 font-medium dark:text-white">{category.name}</td>
                                        <td className="px-4 py-3 text-sm text-gray-500">{category.slug}</td>
                                        <td className="px-4 py-3 text-center">{category.productCount || 0}</td>
                                        <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs ${category.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>{category.status}</span></td>
                                        <td className="px-4 py-3 text-sm">{category.order || 0}</td>
                                        <td className="px-4 py-3"><div className="flex gap-2"><button onClick={() => handleEdit(category)} className="text-blue-600"><FiEdit2 size={16} /></button><button onClick={() => viewProductsInCategory(category)} className="text-purple-600"><FiPackage size={16} /></button><button onClick={() => handleDelete(category)} className="text-red-600"><FiTrash2 size={16} /></button></div></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Add/Edit Category Modal */}
            <AnimatePresence>
                {showModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto" onClick={handleCloseModal}>
                        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-2xl font-bold dark:text-white">{editingCategory ? "Edit Category" : "Add New Category"}</h2>
                                <button onClick={handleCloseModal} className="text-gray-500 p-1"><FiX size={24} /></button>
                            </div>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div><label className="block text-sm font-medium mb-1 dark:text-white">Category Name *</label><input type="text" required value={formData.name} onChange={(e) => { setFormData({...formData, name: e.target.value}); if (!editingCategory) setFormData(prev => ({...prev, slug: generateSlug(e.target.value)})); }} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700" placeholder="e.g., Summer Collection" /></div>
                                <div><label className="block text-sm font-medium mb-1 dark:text-white">Slug *</label><input type="text" required value={formData.slug} onChange={(e) => setFormData({...formData, slug: e.target.value.toLowerCase().replace(/ /g, '-')})} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700" placeholder="summer-collection" /><p className="text-xs text-gray-500 mt-1">URL-friendly name (lowercase, hyphens instead of spaces)</p></div>
                                <div><label className="block text-sm font-medium mb-1 dark:text-white">Parent Category</label><select value={formData.parentCategory} onChange={(e) => setFormData({...formData, parentCategory: e.target.value})} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700"><option value="">None (Top Level)</option>{categories.filter(c => c.id !== editingCategory?.id).map(c => (<option key={c.id} value={c.name}>{c.name}</option>))}</select></div>
                                <div><label className="block text-sm font-medium mb-1 dark:text-white">Display Order</label><input type="number" value={formData.order} onChange={(e) => setFormData({...formData, order: parseInt(e.target.value) || 0})} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700" /></div>
                                <div><label className="block text-sm font-medium mb-1 dark:text-white">Status</label><select value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700"><option value="active">Active</option><option value="inactive">Inactive</option></select></div>
                                <div><label className="block text-sm font-medium mb-1 dark:text-white">Description</label><textarea rows="3" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700" placeholder="Brief description of this category" /></div>
                                <div><label className="block text-sm font-medium mb-1 dark:text-white">Meta Title (SEO)</label><input type="text" value={formData.metaTitle} onChange={(e) => setFormData({...formData, metaTitle: e.target.value})} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700" /></div>
                                <div><label className="block text-sm font-medium mb-1 dark:text-white">Meta Description (SEO)</label><textarea rows="2" value={formData.metaDescription} onChange={(e) => setFormData({...formData, metaDescription: e.target.value})} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700" /></div>
                                <div className="flex gap-3 pt-4">
                                    <button type="submit" disabled={loading} className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50">{loading ? "Saving..." : (editingCategory ? "Update Category" : "Add Category")}</button>
                                    <button type="button" onClick={handleCloseModal} className="flex-1 bg-gray-500 text-white py-2 rounded-lg hover:bg-gray-600">Cancel</button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Products in Category Modal */}
            <AnimatePresence>
                {showProductsModal && selectedCategory && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={() => setShowProductsModal(false)}>
                        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-white dark:bg-gray-800 rounded-lg max-w-3xl w-full max-h-[80vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
                            <div className="flex justify-between items-center mb-4"><h2 className="text-2xl font-bold dark:text-white">Products in {selectedCategory.name}</h2><button onClick={() => setShowProductsModal(false)} className="text-gray-500 text-2xl">&times;</button></div>
                            {productsInCategory.length === 0 ? (<div className="text-center py-8"><FiPackage className="w-16 h-16 text-gray-400 mx-auto mb-4" /><p className="text-gray-500">No products found in this category</p></div>) : (
                                <div className="space-y-2">{productsInCategory.map(product => (<div key={product.id} className="flex items-center justify-between p-3 border rounded-lg dark:border-gray-700"><div className="flex items-center gap-3"><img src={product.image?.startsWith('data:') ? product.image : 'https://via.placeholder.com/40'} alt={product.name} className="w-12 h-12 object-cover rounded" /><div><p className="font-medium dark:text-white">{product.name}</p><p className="text-sm text-gray-500">{product.brand}</p></div></div><div className="text-right"><p className="font-semibold text-blue-600">${product.price}</p><p className="text-xs text-gray-500">Stock: {product.stock}</p></div></div>))}</div>
                            )}
                            <button onClick={() => setShowProductsModal(false)} className="w-full mt-6 bg-gray-600 text-white py-2 rounded-lg hover:bg-gray-700">Close</button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Categories;