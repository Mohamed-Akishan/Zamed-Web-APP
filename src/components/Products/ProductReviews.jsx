// src/components/Products/ProductReviews.jsx
import { useState, useEffect } from "react";
import { Star, StarHalf, MessageCircle, ThumbsUp, Flag, User, Calendar, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import orderService from "../../services/orderService";

const ProductReviews = ({ productId, productName }) => {
    const [reviews, setReviews] = useState([]);
    const [userReview, setUserReview] = useState("");
    const [userRating, setUserRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [user, setUser] = useState(null);
    const [hasPurchased, setHasPurchased] = useState(false);
    const [currencySymbol, setCurrencySymbol] = useState("$");
    const [filter, setFilter] = useState("all"); // all, 5, 4, 3, 2, 1
    const [sort, setSort] = useState("newest"); // newest, oldest, highest, lowest
    const [showReportModal, setShowReportModal] = useState(false);
    const [selectedReviewId, setSelectedReviewId] = useState(null);
    const [reportReason, setReportReason] = useState("");
    const [imageUploads, setImageUploads] = useState([]);
    const [reviewImages, setReviewImages] = useState([]);

    // Load user data
    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (userData) {
            try {
                const parsedUser = JSON.parse(userData);
                setUser(parsedUser);
                checkIfUserPurchased(parsedUser.email);
            } catch (error) {
                console.error("Error parsing user data:", error);
            }
        }
        
        const siteSettings = JSON.parse(localStorage.getItem('site_settings') || '{}');
        const symbols = { USD: "$", EUR: "€", GBP: "£", LKR: "Rs" };
        setCurrencySymbol(symbols[siteSettings.currency] || "$");
        
        loadReviews();
    }, [productId]);

    const checkIfUserPurchased = async (email) => {
        if (!email) return;
        try {
            // Use orderService to get user orders
            const userOrders = await orderService.getUserOrders(email);
            const purchased = userOrders.some(order => {
                const items = order.itemsList || order.items || [];
                return items.some(item => item.id === productId);
            });
            setHasPurchased(purchased);
        } catch (error) {
            console.error("Error checking purchase history:", error);
            // Fallback to localStorage
            try {
                const userOrders = JSON.parse(localStorage.getItem(`orders_${email}`) || '[]');
                const purchased = userOrders.some(order => {
                    const items = order.itemsList || order.items || [];
                    return items.some(item => item.id === productId);
                });
                setHasPurchased(purchased);
            } catch (fallbackError) {
                console.error("Fallback check failed:", fallbackError);
            }
        }
    };

    const loadReviews = () => {
        try {
            const allReviews = JSON.parse(localStorage.getItem('product_reviews') || '[]');
            const productReviews = allReviews.filter(r => r.productId === productId);
            setReviews(productReviews);
        } catch (error) {
            console.error("Error loading reviews:", error);
            setReviews([]);
        } finally {
            setLoading(false);
        }
    };

    const getAverageRating = () => {
        if (reviews.length === 0) return 0;
        const total = reviews.reduce((sum, r) => sum + r.rating, 0);
        return total / reviews.length;
    };

    const getRatingDistribution = () => {
        const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
        reviews.forEach(r => {
            if (distribution[r.rating] !== undefined) {
                distribution[r.rating]++;
            }
        });
        return distribution;
    };

    const getFilteredReviews = () => {
        let filtered = [...reviews];
        
        if (filter !== "all") {
            const ratingNum = parseInt(filter);
            filtered = filtered.filter(r => r.rating === ratingNum);
        }
        
        switch(sort) {
            case "newest":
                filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
                break;
            case "oldest":
                filtered.sort((a, b) => new Date(a.date) - new Date(b.date));
                break;
            case "highest":
                filtered.sort((a, b) => b.rating - a.rating);
                break;
            case "lowest":
                filtered.sort((a, b) => a.rating - b.rating);
                break;
            default:
                filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
        }
        
        return filtered;
    };

    const handleSubmitReview = async () => {
        if (!user) {
            toast.error("Please login to leave a review");
            return;
        }
        
        if (userRating === 0) {
            toast.error("Please select a rating");
            return;
        }
        
        if (!userReview.trim()) {
            toast.error("Please write a review");
            return;
        }
        
        setSubmitting(true);
        
        try {
            const newReview = {
                id: Date.now(),
                productId: productId,
                productName: productName,
                userId: user.email,
                userName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
                rating: userRating,
                comment: userReview.trim(),
                images: reviewImages,
                date: new Date().toISOString(),
                helpful: 0,
                reported: false,
                verifiedPurchase: hasPurchased
            };
            
            // Save to localStorage
            const allReviews = JSON.parse(localStorage.getItem('product_reviews') || '[]');
            allReviews.unshift(newReview);
            localStorage.setItem('product_reviews', JSON.stringify(allReviews));
            
            // Update state
            setReviews([newReview, ...reviews]);
            setUserReview("");
            setUserRating(0);
            setReviewImages([]);
            
            toast.success("Thank you for your review!");
            
            // Dispatch event for other components
            window.dispatchEvent(new CustomEvent('reviewAdded', { 
                detail: { productId, review: newReview } 
            }));
            
        } catch (error) {
            console.error("Error submitting review:", error);
            toast.error("Failed to submit review. Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    const handleHelpful = (reviewId) => {
        const updatedReviews = reviews.map(r => {
            if (r.id === reviewId) {
                const updated = { ...r, helpful: (r.helpful || 0) + 1 };
                // Update localStorage
                const allReviews = JSON.parse(localStorage.getItem('product_reviews') || '[]');
                const index = allReviews.findIndex(ar => ar.id === reviewId);
                if (index >= 0) {
                    allReviews[index] = updated;
                    localStorage.setItem('product_reviews', JSON.stringify(allReviews));
                }
                return updated;
            }
            return r;
        });
        setReviews(updatedReviews);
        toast.success("Thanks for your feedback!");
    };

    const handleReport = (reviewId) => {
        setSelectedReviewId(reviewId);
        setShowReportModal(true);
    };

    const submitReport = () => {
        if (!reportReason.trim()) {
            toast.error("Please provide a reason for reporting");
            return;
        }
        
        const updatedReviews = reviews.map(r => {
            if (r.id === selectedReviewId) {
                const updated = { ...r, reported: true, reportReason: reportReason };
                const allReviews = JSON.parse(localStorage.getItem('product_reviews') || '[]');
                const index = allReviews.findIndex(ar => ar.id === selectedReviewId);
                if (index >= 0) {
                    allReviews[index] = updated;
                    localStorage.setItem('product_reviews', JSON.stringify(allReviews));
                }
                return updated;
            }
            return r;
        });
        setReviews(updatedReviews);
        setShowReportModal(false);
        setReportReason("");
        toast.success("Thank you for reporting. We'll review this content.");
    };

    const handleImageUpload = (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;
        
        const newImages = [];
        files.forEach(file => {
            if (file.size > 5 * 1024 * 1024) {
                toast.error(`${file.name} is too large. Max 5MB.`);
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                newImages.push(reader.result);
                if (newImages.length === files.length) {
                    setReviewImages(prev => [...prev, ...newImages]);
                }
            };
            reader.readAsDataURL(file);
        });
    };

    const removeImage = (index) => {
        setReviewImages(prev => prev.filter((_, i) => i !== index));
    };

    const filteredReviews = getFilteredReviews();
    const averageRating = getAverageRating();
    const distribution = getRatingDistribution();
    const totalReviews = reviews.length;

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="border-t pt-8">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <MessageCircle className="text-blue-600" /> 
                Customer Reviews ({totalReviews})
            </h2>

            {/* Review Summary */}
            {totalReviews > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 bg-gray-50 dark:bg-gray-800/50 rounded-xl p-6">
                    <div className="text-center md:text-left">
                        <div className="text-4xl font-bold text-gray-900 dark:text-white">
                            {averageRating.toFixed(1)}
                        </div>
                        <div className="flex items-center justify-center md:justify-start gap-1 mt-1">
                            {[1, 2, 3, 4, 5].map(star => (
                                <Star 
                                    key={star} 
                                    size={20} 
                                    className={`${star <= Math.round(averageRating) ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} 
                                />
                            ))}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            {totalReviews} {totalReviews === 1 ? 'review' : 'reviews'}
                        </div>
                    </div>

                    <div className="col-span-2">
                        {[5, 4, 3, 2, 1].map(rating => {
                            const count = distribution[rating] || 0;
                            const percentage = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
                            return (
                                <div key={rating} className="flex items-center gap-2 text-sm">
                                    <span className="w-12 text-gray-600 dark:text-gray-400">{rating} ★</span>
                                    <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                        <div 
                                            className="h-full bg-yellow-400 rounded-full transition-all duration-500"
                                            style={{ width: `${percentage}%` }}
                                        />
                                    </div>
                                    <span className="w-12 text-gray-500 dark:text-gray-400 text-xs">{count}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Write Review - Only show if user has purchased or is logged in */}
            {user && (
                <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-6 mb-8">
                    <h3 className="font-semibold text-lg mb-4">
                        {hasPurchased ? "Write a Review" : "Share Your Thoughts"}
                        {hasPurchased && (
                            <span className="ml-2 text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-2 py-0.5 rounded-full">
                                Verified Purchase
                            </span>
                        )}
                    </h3>
                    
                    <div className="space-y-4">
                        {/* Rating Stars */}
                        <div>
                            <label className="block text-sm font-medium mb-2">Your Rating *</label>
                            <div className="flex gap-1">
                                {[1, 2, 3, 4, 5].map(star => (
                                    <button
                                        key={star}
                                        onMouseEnter={() => setHoverRating(star)}
                                        onMouseLeave={() => setHoverRating(0)}
                                        onClick={() => setUserRating(star)}
                                        className="p-1 transition-transform hover:scale-110"
                                    >
                                        <Star 
                                            size={28} 
                                            className={`${star <= (hoverRating || userRating) ? 'text-yellow-400 fill-current' : 'text-gray-300'} transition-colors`} 
                                        />
                                    </button>
                                ))}
                            </div>
                            {userRating > 0 && (
                                <span className="text-sm text-gray-500 ml-2">
                                    {userRating === 5 ? 'Excellent!' : 
                                     userRating === 4 ? 'Good!' : 
                                     userRating === 3 ? 'Average' : 
                                     userRating === 2 ? 'Below Average' : 'Poor'}
                                </span>
                            )}
                        </div>

                        {/* Review Text */}
                        <div>
                            <label className="block text-sm font-medium mb-2">Your Review *</label>
                            <textarea
                                value={userReview}
                                onChange={(e) => setUserReview(e.target.value)}
                                rows="4"
                                className="w-full px-4 py-3 border rounded-lg dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="Share your experience with this product..."
                            />
                        </div>

                        {/* Image Upload */}
                        <div>
                            <label className="block text-sm font-medium mb-2">Upload Photos (Optional)</label>
                            <div className="flex flex-wrap gap-3">
                                {reviewImages.map((img, idx) => (
                                    <div key={idx} className="relative w-20 h-20 rounded-lg overflow-hidden border">
                                        <img src={img} alt={`Review ${idx + 1}`} className="w-full h-full object-cover" />
                                        <button
                                            onClick={() => removeImage(idx)}
                                            className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600 transition-colors"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    </div>
                                ))}
                                <label className="w-20 h-20 border-2 border-dashed rounded-lg flex items-center justify-center cursor-pointer hover:border-blue-500 transition-colors">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        multiple
                                        onChange={handleImageUpload}
                                        className="hidden"
                                    />
                                    <div className="text-center">
                                        <ImageIcon size={20} className="mx-auto text-gray-400" />
                                        <span className="text-xs text-gray-400">Add</span>
                                    </div>
                                </label>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">Max 5MB per image</p>
                        </div>

                        <button
                            onClick={handleSubmitReview}
                            disabled={submitting || userRating === 0 || !userReview.trim()}
                            className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {submitting ? 'Submitting...' : 'Submit Review'}
                        </button>
                    </div>
                </div>
            )}

            {/* Filter and Sort */}
            {totalReviews > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={() => setFilter("all")}
                            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                                filter === "all" 
                                    ? 'bg-blue-600 text-white' 
                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                            }`}
                        >
                            All
                        </button>
                        {[5, 4, 3, 2, 1].map(rating => (
                            <button
                                key={rating}
                                onClick={() => setFilter(String(rating))}
                                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                                    filter === String(rating) 
                                        ? 'bg-blue-600 text-white' 
                                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                }`}
                            >
                                {rating} ★
                            </button>
                        ))}
                    </div>
                    
                    <select
                        value={sort}
                        onChange={(e) => setSort(e.target.value)}
                        className="px-3 py-1 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600"
                    >
                        <option value="newest">Newest First</option>
                        <option value="oldest">Oldest First</option>
                        <option value="highest">Highest Rating</option>
                        <option value="lowest">Lowest Rating</option>
                    </select>
                </div>
            )}

            {/* Reviews List */}
            {filteredReviews.length === 0 ? (
                <div className="text-center py-12">
                    <MessageCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No reviews yet</p>
                    {!user && (
                        <p className="text-sm text-gray-400 mt-2">
                            <button 
                                onClick={() => window.location.href = '/login'} 
                                className="text-blue-600 hover:underline"
                            >
                                Login
                            </button> to be the first to review this product
                        </p>
                    )}
                </div>
            ) : (
                <div className="space-y-6">
                    {filteredReviews.map((review) => (
                        <motion.div
                            key={review.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="border dark:border-gray-700 rounded-xl p-5 hover:shadow-md transition-shadow"
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                                        <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full text-white font-semibold text-sm">
                                            {review.userName?.charAt(0) || 'U'}
                                        </div>
                                        <div>
                                            <p className="font-medium">{review.userName || 'Anonymous'}</p>
                                            <div className="flex items-center gap-2">
                                                <div className="flex items-center gap-0.5">
                                                    {[1, 2, 3, 4, 5].map(star => (
                                                        <Star 
                                                            key={star} 
                                                            size={16} 
                                                            className={`${star <= review.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} 
                                                        />
                                                    ))}
                                                </div>
                                                {review.verifiedPurchase && (
                                                    <span className="text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-2 py-0.5 rounded-full">
                                                        Verified
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <p className="text-gray-700 dark:text-gray-300 mt-2 leading-relaxed">
                                        {review.comment}
                                    </p>
                                    
                                    {review.images && review.images.length > 0 && (
                                        <div className="flex gap-2 mt-3 flex-wrap">
                                            {review.images.map((img, idx) => (
                                                <img 
                                                    key={idx}
                                                    src={img} 
                                                    alt={`Review ${idx + 1}`} 
                                                    className="w-20 h-20 object-cover rounded-lg border hover:opacity-80 transition-opacity cursor-pointer"
                                                    onClick={() => window.open(img, '_blank')}
                                                />
                                            ))}
                                        </div>
                                    )}
                                    
                                    <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-gray-500">
                                        <span className="flex items-center gap-1">
                                            <Calendar size={14} />
                                            {new Date(review.date).toLocaleDateString()}
                                        </span>
                                        
                                        {!review.reported && (
                                            <>
                                                <button 
                                                    onClick={() => handleHelpful(review.id)}
                                                    className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                                                >
                                                    <ThumbsUp size={14} />
                                                    Helpful ({review.helpful || 0})
                                                </button>
                                                <button 
                                                    onClick={() => handleReport(review.id)}
                                                    className="flex items-center gap-1 hover:text-red-600 transition-colors"
                                                >
                                                    <Flag size={14} />
                                                    Report
                                                </button>
                                            </>
                                        )}
                                        
                                        {review.reported && (
                                            <span className="text-xs text-gray-400">Reported for review</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* Report Modal */}
            <AnimatePresence>
                {showReportModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={() => setShowReportModal(false)}>
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <h3 className="text-xl font-bold mb-4">Report Review</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                                Please explain why you're reporting this review.
                            </p>
                            <textarea
                                value={reportReason}
                                onChange={(e) => setReportReason(e.target.value)}
                                rows="4"
                                className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-blue-500"
                                placeholder="Enter your reason..."
                            />
                            <div className="flex gap-3 mt-4">
                                <button
                                    onClick={submitReport}
                                    className="flex-1 bg-red-600 text-white py-2 rounded-lg font-semibold hover:bg-red-700 transition-all"
                                >
                                    Submit Report
                                </button>
                                <button
                                    onClick={() => setShowReportModal(false)}
                                    className="flex-1 bg-gray-500 text-white py-2 rounded-lg font-semibold hover:bg-gray-600 transition-all"
                                >
                                    Cancel
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ProductReviews;