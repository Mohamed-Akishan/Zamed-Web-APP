// src/pages/Admin/Reviews.jsx
import { useState, useEffect } from "react";
import { 
    FiStar, FiTrash2, FiCheck, FiX, FiSearch, FiRefreshCw,
    FiMessageSquare, FiUser, FiCalendar, FiFilter, FiEye,
    FiThumbsUp, FiThumbsDown, FiMail, FiFlag, FiClock,
    FiAlertCircle, FiEdit2, FiSend
} from "react-icons/fi";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const Reviews = () => {
    const [reviews, setReviews] = useState([]);
    const [filteredReviews, setFilteredReviews] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [ratingFilter, setRatingFilter] = useState("all");
    const [selectedReview, setSelectedReview] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [darkMode, setDarkMode] = useState(false);
    const [replyText, setReplyText] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [stats, setStats] = useState({
        total: 0, pending: 0, approved: 0, rejected: 0,
        averageRating: 0, totalRatings: 0
    });

    const getToken = () =>
        localStorage.getItem('adminToken') ||
        localStorage.getItem('admin_token');

    const resolveImageValue = (value) => {
        if (!value) return null;

        if (typeof value === 'string') {
            const trimmed = value.trim();

            if (
                trimmed.startsWith('data:image') ||
                trimmed.startsWith('http://') ||
                trimmed.startsWith('https://') ||
                trimmed.startsWith('blob:') ||
                trimmed.startsWith('/')
            ) {
                return trimmed;
            }

            return null;
        }

        if (Array.isArray(value)) {
            for (const item of value) {
                const resolved = resolveImageValue(item);
                if (resolved) return resolved;
            }

            return null;
        }

        if (typeof value === 'object') {
            return (
                resolveImageValue(value.url) ||
                resolveImageValue(value.src) ||
                resolveImageValue(value.data) ||
                resolveImageValue(value.image) ||
                resolveImageValue(value.thumbnail) ||
                resolveImageValue(value.preview) ||
                null
            );
        }

        return null;
    };

    const getProductImage = (product = {}) => {
        return (
            resolveImageValue(product.image) ||
            resolveImageValue(product.thumbnail) ||
            resolveImageValue(product.mainImage) ||
            resolveImageValue(product.coverImage) ||
            resolveImageValue(product.featuredImage) ||
            resolveImageValue(product.images) ||
            resolveImageValue(product.gallery) ||
            resolveImageValue(product.media) ||
            resolveImageValue(product.variants?.[0]?.image) ||
            resolveImageValue(product.variants?.[0]?.images) ||
            null
        );
    };

    const getStoredProducts = () => {
        const keys = [
            'shop_products',
            'products',
            'admin_products',
            'all_products',
            'zamed_products',
            'product_data'
        ];

        const combined = [];

        keys.forEach((key) => {
            try {
                const raw = JSON.parse(localStorage.getItem(key) || 'null');

                if (Array.isArray(raw)) {
                    combined.push(...raw);
                } else if (Array.isArray(raw?.products)) {
                    combined.push(...raw.products);
                }
            } catch (error) {
                console.warn(`Unable to read ${key}:`, error);
            }
        });

        const seen = new Set();

        return combined.filter((product, index) => {
            const id = String(
                product?._id ||
                product?.id ||
                product?.productId ||
                product?.slug ||
                `${product?.name || product?.title || 'product'}-${index}`
            );

            if (seen.has(id)) return false;
            seen.add(id);
            return true;
        });
    };

    const findProductForReview = (review, products) => {
        const reviewProductId = String(
            review.productId ||
            review.product?._id ||
            review.product?.id ||
            review.product ||
            ''
        );

        const reviewProductName = String(
            review.productName ||
            review.product?.name ||
            review.product?.title ||
            ''
        ).trim().toLowerCase();

        return products.find((product) => {
            const productId = String(
                product?._id ||
                product?.id ||
                product?.productId ||
                product?.slug ||
                ''
            );

            const productName = String(
                product?.name ||
                product?.title ||
                product?.productName ||
                ''
            ).trim().toLowerCase();

            if (reviewProductId && productId && reviewProductId === productId) {
                return true;
            }

            return (
                reviewProductName &&
                productName &&
                reviewProductName === productName
            );
        });
    };

    const enrichReviewsWithProductImages = (reviewsList = []) => {
        const products = getStoredProducts();

        return reviewsList.map((review) => {
            const matchingProduct = findProductForReview(review, products);

            const resolvedImage =
                resolveImageValue(review.productImage) ||
                resolveImageValue(review.image) ||
                resolveImageValue(review.product?.image) ||
                resolveImageValue(review.product?.images) ||
                getProductImage(matchingProduct || {});

            return {
                ...review,
                productId:
                    review.productId ||
                    matchingProduct?._id ||
                    matchingProduct?.id ||
                    matchingProduct?.productId ||
                    null,
                productName:
                    review.productName ||
                    review.product?.name ||
                    matchingProduct?.name ||
                    matchingProduct?.title ||
                    'Product',
                productImage: resolvedImage || null
            };
        });
    };

    const ProductImage = ({
        src,
        alt,
        className = 'w-10 h-10'
    }) => {
        const [failed, setFailed] = useState(false);
        const resolvedSrc = resolveImageValue(src);

        if (!resolvedSrc || failed) {
            return (
                <div
                    className={`${className} flex shrink-0 items-center justify-center overflow-hidden rounded-xl border border-gray-200 bg-gradient-to-br from-gray-50 to-gray-100 dark:border-gray-600 dark:from-gray-700 dark:to-gray-800`}
                >
                    <FiStar className="text-gray-300 dark:text-gray-500" />
                </div>
            );
        }

        return (
            <img
                src={resolvedSrc}
                alt={alt || 'Product'}
                className={`${className} shrink-0 rounded-xl border border-gray-100 bg-white object-cover dark:border-gray-700`}
                loading="lazy"
                onError={() => setFailed(true)}
            />
        );
    };

    useEffect(() => {
        const checkDarkMode = () => {
            const isDark = document.documentElement.classList.contains('dark');
            setDarkMode(isDark);
        };
        checkDarkMode();
        loadReviews();
    }, []);

    useEffect(() => {
        filterReviews();
    }, [reviews, searchTerm, statusFilter, ratingFilter]);

    const loadReviews = async () => {
        setLoading(true);
        setError(null);
        
        // First load from localStorage
        loadLocalReviews();
        
        const token = getToken();
        if (!token) {
            setLoading(false);
            return;
        }
        
        try {
            const response = await fetch(`${API_URL}/reviews/admin/all`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.success && data.reviews && data.reviews.length > 0) {
                    const enrichedReviews =
                        enrichReviewsWithProductImages(data.reviews);

                    setReviews(enrichedReviews);
                    calculateStats(enrichedReviews);
                    setLoading(false);
                    return;
                }
            }
        } catch (error) {
            console.log("Backend not available, using local reviews");
        }
        setLoading(false);
    };
    
    const loadLocalReviews = () => {
        const products = getStoredProducts();
        let allReviews = [];

        products.forEach((product) => {
            if (Array.isArray(product.reviews)) {
                product.reviews.forEach((review) => {
                    allReviews.push({
                        ...review,
                        productId:
                            review.productId ||
                            product._id ||
                            product.id ||
                            product.productId,
                        productName:
                            review.productName ||
                            product.name ||
                            product.title ||
                            'Product',
                        productImage:
                            resolveImageValue(review.productImage) ||
                            getProductImage(product)
                    });
                });
            }
        });

        const storedReviews = JSON.parse(
            localStorage.getItem('product_reviews') || '[]'
        );

        if (Array.isArray(storedReviews)) {
            allReviews = [...allReviews, ...storedReviews];
        }

        allReviews = enrichReviewsWithProductImages(allReviews);

        // Remove duplicates while preserving reviews without an explicit id.
        const uniqueReviews = [];
        const ids = new Set();

        allReviews.forEach((review, index) => {
            const id = String(
                review.id ||
                review._id ||
                `${review.productId || review.productName}-${review.userEmail || review.userName || 'user'}-${review.date || index}`
            );

            if (ids.has(id)) return;

            ids.add(id);
            uniqueReviews.push({
                ...review,
                id: review.id || review._id || id
            });
        });

        uniqueReviews.sort((a, b) => {
            const aDate = new Date(a.date || a.createdAt || 0).getTime();
            const bDate = new Date(b.date || b.createdAt || 0).getTime();

            return bDate - aDate;
        });

        setReviews(uniqueReviews);
        calculateStats(uniqueReviews);
    };

    const calculateStats = (reviewsList) => {
        const pending = reviewsList.filter(r => r.status === 'pending').length;
        const approved = reviewsList.filter(r => r.status === 'approved').length;
        const rejected = reviewsList.filter(r => r.status === 'rejected').length;
        const totalRatings = approved;
        const averageRating = approved > 0 ? 
            reviewsList.filter(r => r.status === 'approved').reduce((sum, r) => sum + (r.rating || 0), 0) / approved : 0;
        
        setStats({
            total: reviewsList.length,
            pending, approved, rejected,
            averageRating: averageRating.toFixed(1),
            totalRatings
        });
    };

    const filterReviews = () => {
        let filtered = [...reviews];
        
        if (searchTerm) {
            filtered = filtered.filter(r => 
                r.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                r.comment?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                r.productName?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }
        
        if (statusFilter !== "all") {
            filtered = filtered.filter(r => r.status === statusFilter);
        }
        
        if (ratingFilter !== "all") {
            filtered = filtered.filter(r => r.rating === parseInt(ratingFilter));
        }
        
        setFilteredReviews(filtered);
    };

    const updateReviewStatus = async (reviewId, newStatus) => {
        const token = getToken();
        
        try {
            const response = await fetch(`${API_URL}/reviews/${reviewId}/status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ status: newStatus })
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    toast.success(`Review ${newStatus}`);
                    loadReviews();
                    return;
                }
            }
            throw new Error("API failed");
        } catch (error) {
            // Fallback to localStorage
            const updatedReviews = reviews.map(review =>
                review.id === reviewId ? { ...review, status: newStatus, moderatedAt: new Date().toISOString() } : review
            );
            setReviews(updatedReviews);
            calculateStats(updatedReviews);
            
            const products = JSON.parse(localStorage.getItem('shop_products') || '[]');
            const updatedProducts = products.map(product => {
                if (product.reviews && Array.isArray(product.reviews)) {
                    const updatedProductReviews = product.reviews.map(r =>
                        r.id === reviewId ? { ...r, status: newStatus } : r
                    );
                    return { ...product, reviews: updatedProductReviews };
                }
                return product;
            });
            localStorage.setItem('shop_products', JSON.stringify(updatedProducts));
            
            toast.success(`Review ${newStatus} (local)`);
        }
    };

    const deleteReview = async (reviewId) => {
        if (!window.confirm("Are you sure you want to delete this review?")) return;
        
        const token = getToken();
        
        try {
            const response = await fetch(`${API_URL}/reviews/${reviewId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    toast.success("Review deleted");
                    loadReviews();
                    return;
                }
            }
            throw new Error("API failed");
        } catch (error) {
            // Fallback
            const updatedReviews = reviews.filter(r => r.id !== reviewId);
            setReviews(updatedReviews);
            calculateStats(updatedReviews);
            
            const products = JSON.parse(localStorage.getItem('shop_products') || '[]');
            const updatedProducts = products.map(product => {
                if (product.reviews && Array.isArray(product.reviews)) {
                    return {
                        ...product,
                        reviews: product.reviews.filter(r => r.id !== reviewId)
                    };
                }
                return product;
            });
            localStorage.setItem('shop_products', JSON.stringify(updatedProducts));
            
            toast.success("Review deleted (local)");
        }
    };

    const addReply = async (reviewId) => {
        if (!replyText.trim()) {
            toast.error("Please enter a reply");
            return;
        }
        
        const token = getToken();
        
        try {
            const response = await fetch(`${API_URL}/reviews/${reviewId}/reply`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ reply: replyText })
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    toast.success("Reply added");
                    setShowModal(false);
                    setSelectedReview(null);
                    setReplyText("");
                    loadReviews();
                    return;
                }
            }
            throw new Error("API failed");
        } catch (error) {
            // Fallback
            const updatedReviews = reviews.map(review =>
                review.id === reviewId ? { ...review, reply: replyText, repliedAt: new Date().toISOString() } : review
            );
            setReviews(updatedReviews);
            calculateStats(updatedReviews);
            
            const products = JSON.parse(localStorage.getItem('shop_products') || '[]');
            const updatedProducts = products.map(product => {
                if (product.reviews && Array.isArray(product.reviews)) {
                    const updatedProductReviews = product.reviews.map(r =>
                        r.id === reviewId ? { ...r, reply: replyText } : r
                    );
                    return { ...product, reviews: updatedProductReviews };
                }
                return product;
            });
            localStorage.setItem('shop_products', JSON.stringify(updatedProducts));
            
            toast.success("Reply added (local)");
            setShowModal(false);
            setSelectedReview(null);
            setReplyText("");
        }
    };

    const viewReviewDetails = (review) => {
        const [enrichedReview] =
            enrichReviewsWithProductImages([review]);

        setSelectedReview(enrichedReview || review);
        setReplyText(review.reply || "");
        setShowModal(true);
    };

    const renderStars = (rating) => {
        return (
            <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((star) => (
                    <FiStar key={star} size={14} className={`${star <= rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} />
                ))}
            </div>
        );
    };

    const formatDate = (dateString) => dateString ? new Date(dateString).toLocaleDateString() : 'N/A';

    const getStatusBadge = (status) => {
        const badges = {
            pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
            approved: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
            rejected: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
        };
        return badges[status] || 'bg-gray-100 text-gray-800';
    };

    if (loading && reviews.length === 0) {
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
                    <h1 className="text-2xl font-bold dark:text-white">Review Management</h1>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">Manage customer reviews and ratings</p>
                </div>
                <button onClick={loadReviews} className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2">
                    <FiRefreshCw size={16} /> Refresh
                </button>
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
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                    <div className="flex justify-between">
                        <div><p className="text-gray-500 text-sm">Total Reviews</p><p className="text-2xl font-bold dark:text-white">{stats.total}</p></div>
                        <FiMessageSquare className="text-blue-500 text-3xl" />
                    </div>
                </div>
                <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg shadow p-4">
                    <div className="flex justify-between">
                        <div><p className="text-yellow-600 text-sm">Pending</p><p className="text-2xl font-bold text-yellow-700">{stats.pending}</p></div>
                        <FiClock className="text-yellow-500 text-3xl" />
                    </div>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg shadow p-4">
                    <div className="flex justify-between">
                        <div><p className="text-green-600 text-sm">Approved</p><p className="text-2xl font-bold text-green-700">{stats.approved}</p></div>
                        <FiCheck className="text-green-500 text-3xl" />
                    </div>
                </div>
                <div className="bg-red-50 dark:bg-red-900/20 rounded-lg shadow p-4">
                    <div className="flex justify-between">
                        <div><p className="text-red-600 text-sm">Rejected</p><p className="text-2xl font-bold text-red-700">{stats.rejected}</p></div>
                        <FiX className="text-red-500 text-3xl" />
                    </div>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg shadow p-4">
                    <div className="flex justify-between">
                        <div><p className="text-purple-600 text-sm">Avg Rating</p><p className="text-2xl font-bold text-purple-700">{stats.averageRating}</p></div>
                        <FiStar className="text-purple-500 text-3xl" />
                    </div>
                </div>
                <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg shadow p-4">
                    <div className="flex justify-between">
                        <div><p className="text-orange-600 text-sm">Total Ratings</p><p className="text-2xl font-bold text-orange-700">{stats.totalRatings}</p></div>
                        <FiThumbsUp className="text-orange-500 text-3xl" />
                    </div>
                </div>
            </div>

            {/* Search and Filters */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6">
                <div className="flex flex-wrap gap-4">
                    <div className="flex-1 relative">
                        <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <input type="text" placeholder="Search by customer name, product, or comment..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                    </div>
                    <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-4 py-2 border rounded-lg dark:bg-gray-700">
                        <option value="all">All Status</option>
                        <option value="pending">Pending</option>
                        <option value="approved">Approved</option>
                        <option value="rejected">Rejected</option>
                    </select>
                    <select value={ratingFilter} onChange={(e) => setRatingFilter(e.target.value)} className="px-4 py-2 border rounded-lg dark:bg-gray-700">
                        <option value="all">All Ratings</option>
                        <option value="5">5 Stars</option>
                        <option value="4">4 Stars</option>
                        <option value="3">3 Stars</option>
                        <option value="2">2 Stars</option>
                        <option value="1">1 Star</option>
                    </select>
                </div>
            </div>

            {/* Reviews Table */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                {filteredReviews.length === 0 ? (
                    <div className="text-center py-12">
                        <FiMessageSquare className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold dark:text-white">No reviews found</h3>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 dark:bg-gray-700">
                                <tr>
                                    <th className="px-4 py-3 text-left">Product</th>
                                    <th className="px-4 py-3 text-left">Customer</th>
                                    <th className="px-4 py-3 text-left">Rating</th>
                                    <th className="px-4 py-3 text-left">Comment</th>
                                    <th className="px-4 py-3 text-left">Date</th>
                                    <th className="px-4 py-3 text-left">Status</th>
                                    <th className="px-4 py-3 text-left">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredReviews.map((review) => (
                                    <tr key={review.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <ProductImage
                                                    src={review.productImage}
                                                    alt={review.productName}
                                                    className="h-12 w-12"
                                                />
                                                <span className="text-sm font-medium dark:text-white">{review.productName}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <p className="font-medium dark:text-white">{review.userName || 'Anonymous'}</p>
                                            {review.userEmail && <p className="text-xs text-gray-500">{review.userEmail}</p>}
                                        </td>
                                        <td className="px-4 py-3">{renderStars(review.rating)}</td>
                                        <td className="px-4 py-3 max-w-xs"><p className="text-sm dark:text-gray-300 line-clamp-2">{review.comment}</p></td>
                                        <td className="px-4 py-3 text-sm dark:text-gray-300">{formatDate(review.date)}</td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusBadge(review.status)}`}>
                                                {review.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex gap-2">
                                                <button onClick={() => viewReviewDetails(review)} className="text-blue-600 hover:text-blue-800" title="View Details"><FiEye size={16} /></button>
                                                {review.status === 'pending' && (
                                                    <>
                                                        <button onClick={() => updateReviewStatus(review.id, 'approved')} className="text-green-600 hover:text-green-800" title="Approve"><FiCheck size={16} /></button>
                                                        <button onClick={() => updateReviewStatus(review.id, 'rejected')} className="text-red-600 hover:text-red-800" title="Reject"><FiX size={16} /></button>
                                                    </>
                                                )}
                                                <button onClick={() => deleteReview(review.id)} className="text-red-600 hover:text-red-800" title="Delete"><FiTrash2 size={16} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Review Details Modal */}
            <AnimatePresence>
                {showModal && selectedReview && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={() => setShowModal(false)}>
                        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-white dark:bg-gray-800 rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-2xl font-bold dark:text-white">Review Details</h2>
                                <button onClick={() => setShowModal(false)} className="text-gray-500 text-2xl">&times;</button>
                            </div>
                            <div className="space-y-4">
                                <div className="flex items-center gap-4 pb-4 border-b dark:border-gray-700">
                                    <ProductImage
                                        src={selectedReview.productImage}
                                        alt={selectedReview.productName}
                                        className="h-20 w-20"
                                    />
                                    <div><h3 className="font-semibold dark:text-white">{selectedReview.productName}</h3><p className="text-sm text-gray-500">Product ID: {selectedReview.productId}</p></div>
                                </div>
                                <div><p className="text-sm text-gray-500">Customer</p><p className="font-medium dark:text-white">{selectedReview.userName || 'Anonymous'}</p>{selectedReview.userEmail && <p className="text-sm text-gray-500">{selectedReview.userEmail}</p>}</div>
                                <div><p className="text-sm text-gray-500">Rating</p>{renderStars(selectedReview.rating)}</div>
                                <div><p className="text-sm text-gray-500">Comment</p><p className="text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">{selectedReview.comment}</p></div>
                                <div><p className="text-sm text-gray-500">Date</p><p className="dark:text-gray-300">{formatDate(selectedReview.date)}</p></div>
                                <div><p className="text-sm text-gray-500">Status</p><span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${getStatusBadge(selectedReview.status)}`}>{selectedReview.status}</span></div>
                                <div className="border-t pt-4 dark:border-gray-700">
                                    <label className="block text-sm font-medium mb-2 dark:text-white">Admin Reply</label>
                                    <textarea rows="3" value={replyText} onChange={(e) => setReplyText(e.target.value)} placeholder="Write a reply to this review..." className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                                </div>
                                <div className="flex gap-3 pt-4">
                                    {selectedReview.status === 'pending' && (
                                        <>
                                            <button onClick={() => { updateReviewStatus(selectedReview.id, 'approved'); setShowModal(false); }} className="flex-1 bg-green-600 text-white py-2 rounded-lg">Approve & Reply</button>
                                            <button onClick={() => { updateReviewStatus(selectedReview.id, 'rejected'); setShowModal(false); }} className="flex-1 bg-red-600 text-white py-2 rounded-lg">Reject</button>
                                        </>
                                    )}
                                    <button onClick={() => addReply(selectedReview.id)} className="flex-1 bg-blue-600 text-white py-2 rounded-lg flex items-center justify-center gap-2"><FiSend size={16} /> Save Reply</button>
                                    <button onClick={() => setShowModal(false)} className="flex-1 bg-gray-500 text-white py-2 rounded-lg">Close</button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Reviews;