// src/pages/Admin/Inventory.jsx
import { useState, useEffect } from "react";
import { 
    FiPackage, FiSearch, FiRefreshCw, FiAlertCircle, FiCheckCircle,
    FiTrendingUp, FiTrendingDown, FiEdit2, FiPlus, FiMinus,
    FiFilter, FiDownload, FiUpload, FiBell, FiClock
} from "react-icons/fi";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

const Inventory = () => {
    const [products, setProducts] = useState([]);
    const [filteredProducts, setFilteredProducts] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [stockFilter, setStockFilter] = useState("all");
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [showAdjustModal, setShowAdjustModal] = useState(false);
    const [adjustQuantity, setAdjustQuantity] = useState(0);
    const [adjustReason, setAdjustReason] = useState("");
    const [darkMode, setDarkMode] = useState(false);
    const [stats, setStats] = useState({
        totalProducts: 0,
        totalStock: 0,
        lowStock: 0,
        outOfStock: 0,
        topStock: 0,
        valueAtCost: 0
    });

    useEffect(() => {
        const checkDarkMode = () => {
            const isDark = document.documentElement.classList.contains('dark');
            setDarkMode(isDark);
        };
        checkDarkMode();
        loadInventory();
        
        const handleStorageChange = () => loadInventory();
        window.addEventListener('storage', handleStorageChange);
        window.addEventListener('productsUpdated', handleStorageChange);
        return () => {
            window.removeEventListener('storage', handleStorageChange);
            window.removeEventListener('productsUpdated', handleStorageChange);
        };
    }, []);

    useEffect(() => {
        filterInventory();
    }, [products, searchTerm, stockFilter]);

    const loadInventory = () => {
        const allProducts = JSON.parse(localStorage.getItem('shop_products') || '[]');
        setProducts(allProducts);
        
        const totalStock = allProducts.reduce((sum, p) => sum + (p.stock || 0), 0);
        const lowStock = allProducts.filter(p => p.stock > 0 && p.stock < 10).length;
        const outOfStock = allProducts.filter(p => p.stock === 0).length;
        const topStock = allProducts.length > 0 ? Math.max(...allProducts.map(p => p.stock || 0)) : 0;
        const valueAtCost = allProducts.reduce((sum, p) => sum + ((p.price || 0) * (p.stock || 0)), 0);
        
        setStats({
            totalProducts: allProducts.length,
            totalStock: totalStock,
            lowStock: lowStock,
            outOfStock: outOfStock,
            topStock: topStock,
            valueAtCost: valueAtCost
        });
    };

    const filterInventory = () => {
        let filtered = [...products];
        
        if (searchTerm) {
            filtered = filtered.filter(p => 
                p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                p.brand?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }
        
        if (stockFilter === "low") {
            filtered = filtered.filter(p => p.stock > 0 && p.stock < 10);
        } else if (stockFilter === "out") {
            filtered = filtered.filter(p => p.stock === 0);
        } else if (stockFilter === "high") {
            filtered = filtered.filter(p => p.stock >= 50);
        }
        
        setFilteredProducts(filtered);
    };

    const adjustStock = (product) => {
        setSelectedProduct(product);
        setAdjustQuantity(0);
        setAdjustReason("");
        setShowAdjustModal(true);
    };

    const saveStockAdjustment = () => {
        if (!selectedProduct) return;
        
        const newStock = Math.max(0, (selectedProduct.stock || 0) + adjustQuantity);
        const updatedProducts = products.map(p =>
            p.id === selectedProduct.id ? { ...p, stock: newStock } : p
        );
        
        setProducts(updatedProducts);
        localStorage.setItem('shop_products', JSON.stringify(updatedProducts));
        localStorage.setItem('admin_products', JSON.stringify(updatedProducts));
        
        // Log the adjustment
        const adjustments = JSON.parse(localStorage.getItem('inventory_adjustments') || '[]');
        adjustments.unshift({
            id: Date.now(),
            productId: selectedProduct.id,
            productName: selectedProduct.name,
            oldStock: selectedProduct.stock,
            newStock: newStock,
            change: adjustQuantity,
            reason: adjustReason || "Manual adjustment",
            date: new Date().toISOString(),
            type: adjustQuantity > 0 ? "increase" : "decrease"
        });
        localStorage.setItem('inventory_adjustments', JSON.stringify(adjustments.slice(0, 100)));
        
        toast.success(`${selectedProduct.name}: Stock updated from ${selectedProduct.stock} to ${newStock}`);
        
        setShowAdjustModal(false);
        setSelectedProduct(null);
        loadInventory();
        
        // Dispatch event for real-time update
        window.dispatchEvent(new Event('productsUpdated'));
    };

    const bulkUpdateStock = () => {
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.csv';
        fileInput.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) {
                toast.error("No file selected");
                return;
            }
            
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const csv = event.target.result;
                    const lines = csv.split('\n');
                    const headers = lines[0].split(',');
                    const skuIndex = headers.findIndex(h => h.toLowerCase().includes('sku') || h.toLowerCase().includes('id'));
                    const stockIndex = headers.findIndex(h => h.toLowerCase().includes('stock'));
                    
                    if (skuIndex === -1 || stockIndex === -1) {
                        toast.error("CSV must contain SKU/ID and Stock columns");
                        return;
                    }
                    
                    const updates = [];
                    for (let i = 1; i < lines.length; i++) {
                        const values = lines[i].split(',');
                        if (values.length > Math.max(skuIndex, stockIndex)) {
                            const sku = values[skuIndex].trim();
                            const newStock = parseInt(values[stockIndex]);
                            if (sku && !isNaN(newStock)) {
                                updates.push({ sku: sku, stock: newStock });
                            }
                        }
                    }
                    
                    let updatedCount = 0;
                    const updatedProducts = products.map(product => {
                        const update = updates.find(u => u.sku === product.id || u.sku === product.sku);
                        if (update) {
                            updatedCount++;
                            return { ...product, stock: update.stock };
                        }
                        return product;
                    });
                    
                    setProducts(updatedProducts);
                    localStorage.setItem('shop_products', JSON.stringify(updatedProducts));
                    localStorage.setItem('admin_products', JSON.stringify(updatedProducts));
                    toast.success(`Updated ${updatedCount} products`);
                    loadInventory();
                } catch (error) {
                    console.error("Error parsing CSV:", error);
                    toast.error("Failed to parse CSV file");
                }
            };
            reader.onerror = () => {
                toast.error("Failed to read file");
            };
            reader.readAsText(file);
        };
        fileInput.click();
    };

    const exportInventory = () => {
        if (filteredProducts.length === 0) {
            toast.error("No products to export");
            return;
        }
        
        const exportData = filteredProducts.map(p => ({
            ID: p.id,
            Name: p.name,
            Brand: p.brand || "",
            Price: p.price || 0,
            Stock: p.stock || 0,
            "Stock Value": (p.price || 0) * (p.stock || 0),
            Status: p.stock === 0 ? "Out of Stock" : p.stock < 10 ? "Low Stock" : "In Stock"
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
        a.download = `inventory_export_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("Inventory exported!");
    };

    const getStockStatus = (stock) => {
        if (stock === 0) return { label: "Out of Stock", color: "bg-red-100 text-red-800", icon: FiAlertCircle };
        if (stock < 10) return { label: "Low Stock", color: "bg-yellow-100 text-yellow-800", icon: FiAlertCircle };
        if (stock < 30) return { label: "Medium Stock", color: "bg-blue-100 text-blue-800", icon: FiClock };
        return { label: "In Stock", color: "bg-green-100 text-green-800", icon: FiCheckCircle };
    };

    const formatPrice = (price) => {
        const numPrice = typeof price === 'number' ? price : parseFloat(price) || 0;
        const siteSettings = JSON.parse(localStorage.getItem('site_settings') || '{}');
        const symbols = { USD: "$", EUR: "€", GBP: "£", LKR: "Rs" };
        const symbol = symbols[siteSettings.currency] || "$";
        return `${symbol}${numPrice.toFixed(2)}`;
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold dark:text-white">Inventory Management</h1>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">Track and manage product stock levels</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={bulkUpdateStock} className="bg-purple-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"><FiUpload size={16} /> Bulk Update</button>
                    <button onClick={exportInventory} className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"><FiDownload size={16} /> Export</button>
                    <button onClick={loadInventory} className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"><FiRefreshCw size={16} /> Refresh</button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                    <div className="flex justify-between">
                        <div>
                            <p className="text-gray-500 text-sm">Total Products</p>
                            <p className="text-2xl font-bold dark:text-white">{stats.totalProducts}</p>
                        </div>
                        <FiPackage className="text-blue-500 text-3xl" />
                    </div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                    <div className="flex justify-between">
                        <div>
                            <p className="text-gray-500 text-sm">Total Stock</p>
                            <p className="text-2xl font-bold dark:text-white">{stats.totalStock}</p>
                        </div>
                        <FiPackage className="text-green-500 text-3xl" />
                    </div>
                </div>
                <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg shadow p-4">
                    <div className="flex justify-between">
                        <div>
                            <p className="text-yellow-600 text-sm">Low Stock</p>
                            <p className="text-2xl font-bold text-yellow-700">{stats.lowStock}</p>
                        </div>
                        <FiAlertCircle className="text-yellow-500 text-3xl" />
                    </div>
                </div>
                <div className="bg-red-50 dark:bg-red-900/20 rounded-lg shadow p-4">
                    <div className="flex justify-between">
                        <div>
                            <p className="text-red-600 text-sm">Out of Stock</p>
                            <p className="text-2xl font-bold text-red-700">{stats.outOfStock}</p>
                        </div>
                        <FiAlertCircle className="text-red-500 text-3xl" />
                    </div>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg shadow p-4">
                    <div className="flex justify-between">
                        <div>
                            <p className="text-purple-600 text-sm">Inventory Value</p>
                            <p className="text-2xl font-bold text-purple-700">{formatPrice(stats.valueAtCost)}</p>
                        </div>
                        <FiTrendingUp className="text-purple-500 text-3xl" />
                    </div>
                </div>
            </div>

            {/* Search and Filters */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6">
                <div className="flex flex-wrap gap-4">
                    <div className="flex-1 relative">
                        <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <input 
                            type="text" 
                            placeholder="Search products..." 
                            value={searchTerm} 
                            onChange={(e) => setSearchTerm(e.target.value)} 
                            className="w-full pl-10 pr-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white" 
                        />
                    </div>
                    <select 
                        value={stockFilter} 
                        onChange={(e) => setStockFilter(e.target.value)} 
                        className="px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    >
                        <option value="all">All Stock</option>
                        <option value="low">Low Stock (&lt;10)</option>
                        <option value="out">Out of Stock</option>
                        <option value="high">High Stock (≥50)</option>
                    </select>
                </div>
            </div>

            {/* Inventory Table */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                {filteredProducts.length === 0 ? (
                    <div className="text-center py-12">
                        <FiPackage className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold dark:text-white">No products found</h3>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 dark:bg-gray-700">
                                <tr>
                                    <th className="px-4 py-3 text-left text-sm font-semibold dark:text-white">Product</th>
                                    <th className="px-4 py-3 text-left text-sm font-semibold dark:text-white">SKU</th>
                                    <th className="px-4 py-3 text-left text-sm font-semibold dark:text-white">Price</th>
                                    <th className="px-4 py-3 text-left text-sm font-semibold dark:text-white">Current Stock</th>
                                    <th className="px-4 py-3 text-left text-sm font-semibold dark:text-white">Status</th>
                                    <th className="px-4 py-3 text-left text-sm font-semibold dark:text-white">Stock Value</th>
                                    <th className="px-4 py-3 text-left text-sm font-semibold dark:text-white">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredProducts.map((product) => {
                                    const status = getStockStatus(product.stock);
                                    const StatusIcon = status.icon;
                                    return (
                                        <tr key={product.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-3">
                                                    <img 
                                                        src={product.image && product.image.startsWith('data:') ? product.image : 'https://via.placeholder.com/40'} 
                                                        alt={product.name} 
                                                        className="w-10 h-10 object-cover rounded" 
                                                    />
                                                    <div>
                                                        <p className="font-medium dark:text-white">{product.name}</p>
                                                        <p className="text-xs text-gray-500">{product.brand}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 font-mono text-sm dark:text-gray-300">{product.id || product.sku || 'N/A'}</td>
                                            <td className="px-4 py-3 dark:text-gray-300">{formatPrice(product.price)}</td>
                                            <td className="px-4 py-3">
                                                <span className={`text-lg font-bold ${
                                                    product.stock === 0 ? 'text-red-600' : 
                                                    product.stock < 10 ? 'text-yellow-600' : 
                                                    'text-green-600'
                                                }`}>
                                                    {product.stock}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${status.color}`}>
                                                    <StatusIcon size={12} />{status.label}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 dark:text-gray-300">{formatPrice((product.price || 0) * (product.stock || 0))}</td>
                                            <td className="px-4 py-3">
                                                <div className="flex gap-2">
                                                    <button 
                                                        onClick={() => adjustStock(product)} 
                                                        className="p-1 text-green-600 hover:text-green-800" 
                                                        title="Add Stock"
                                                    >
                                                        <FiPlus size={16} />
                                                    </button>
                                                    <button 
                                                        onClick={() => adjustStock(product)} 
                                                        className="p-1 text-red-600 hover:text-red-800" 
                                                        title="Remove Stock"
                                                    >
                                                        <FiMinus size={16} />
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

            {/* Stock Adjustment Modal */}
            <AnimatePresence>
                {showAdjustModal && selectedProduct && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={() => setShowAdjustModal(false)}>
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.9 }} 
                            animate={{ opacity: 1, scale: 1 }} 
                            exit={{ opacity: 0, scale: 0.9 }} 
                            className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6" 
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-2xl font-bold dark:text-white">Adjust Stock</h2>
                                <button onClick={() => setShowAdjustModal(false)} className="text-gray-500 text-2xl">&times;</button>
                            </div>
                            <div className="space-y-4">
                                <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                                    <p className="text-sm text-gray-500">Product</p>
                                    <p className="font-semibold dark:text-white">{selectedProduct.name}</p>
                                    <p className="text-sm">Current Stock: <span className="font-bold text-blue-600">{selectedProduct.stock}</span></p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1 dark:text-white">Adjustment Quantity</label>
                                    <div className="flex items-center gap-2">
                                        <button 
                                            onClick={() => setAdjustQuantity(prev => prev - 1)} 
                                            className="w-8 h-8 border rounded-lg dark:border-gray-600 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
                                        >
                                            -
                                        </button>
                                        <input 
                                            type="number" 
                                            value={adjustQuantity} 
                                            onChange={(e) => setAdjustQuantity(parseInt(e.target.value) || 0)} 
                                            className="flex-1 text-center px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white" 
                                        />
                                        <button 
                                            onClick={() => setAdjustQuantity(prev => prev + 1)} 
                                            className="w-8 h-8 border rounded-lg dark:border-gray-600 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
                                        >
                                            +
                                        </button>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">Positive = Add stock, Negative = Remove stock</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1 dark:text-white">Reason (Optional)</label>
                                    <input 
                                        type="text" 
                                        value={adjustReason} 
                                        onChange={(e) => setAdjustReason(e.target.value)} 
                                        placeholder="e.g., Restock, Damaged, Return" 
                                        className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white" 
                                    />
                                </div>
                                <div className={`p-3 rounded-lg ${
                                    adjustQuantity > 0 ? 'bg-green-50 dark:bg-green-900/20' : 
                                    adjustQuantity < 0 ? 'bg-red-50 dark:bg-red-900/20' : 
                                    'bg-gray-50 dark:bg-gray-700'
                                }`}>
                                    <p className="text-sm">New Stock: <span className="font-bold text-blue-600">{selectedProduct.stock + adjustQuantity}</span></p>
                                    <p className="text-xs text-gray-500 mt-1">Change: {adjustQuantity > 0 ? '+' : ''}{adjustQuantity} units</p>
                                </div>
                                <div className="flex gap-3 pt-4">
                                    <button onClick={saveStockAdjustment} className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors">
                                        Apply Adjustment
                                    </button>
                                    <button onClick={() => setShowAdjustModal(false)} className="flex-1 bg-gray-500 text-white py-2 rounded-lg hover:bg-gray-600 transition-colors">
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

export default Inventory;