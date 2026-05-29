// src/components/Products/ProductReviews.jsx
import { useState, useEffect } from "react";
import { Star, User, Calendar, CheckCircle, Edit2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { getUserOrders } from "../../services/orderService";
import { getProductReviews, saveReview, deleteReview, updateProductRatingInStorage } from "../../services/reviewService";

const ProductReviews = ({ productId, productName }) => {
    const [reviews, setReviews] = useState([]);
    const [averageRating, setAverageRating] = useState(0);
    const [totalReviews, setTotalReviews] = useState(0);
    const [ratingDistribution, setRatingDistribution] = useState({ 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 });
    const [user, setUser] = useState(null);
    const [userHasPurchased, setUserHasPurchased] = useState(false);
    const [userReview, setUserReview] = useState(null);
    const [showReviewForm, setShowReviewForm] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [checkingPurchase, setCheckingPurchase] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [newReview, setNewReview] = useState({
        rating: 5,
        title: "",
        comment: ""
    });
    const [hoverRating, setHoverRating] = useState(0);

    useEffect(() => {
        loadReviews();
        checkUserStatus();
        
        const handleOrderUpdate = () => {
            checkUserStatus();
        };
        
        window.addEventListener('orderDelivered', handleOrderUpdate);
        window.addEventListener('orderStatusUpdated', handleOrderUpdate);
        window.addEventListener('storage', handleOrderUpdate);
        
        return () => {
            window.removeEventListener('orderDelivered', handleOrderUpdate);
            window.removeEventListener('orderStatusUpdated', handleOrderUpdate);
            window.removeEventListener('storage', handleOrderUpdate);
        };
    }, [productId]);

    useEffect(() => {
        if (window.location.hash === '#reviews') {
            setTimeout(() => {
                const reviewSection = document.getElementById('reviews-section');
                if (reviewSection) {
                    reviewSection.scrollIntoView({ behavior: 'smooth' });
                    if (user && userHasPurchased && !userReview) {
                        setShowReviewForm(true);
                        toast.info("You can now review this product!", {
                            duration: 3000,
                            icon: "✍️"
                        });
                    }
                }
            }, 800);
        }
    }, [user, userHasPurchased, userReview]);

    const loadReviews = async () => {
        setLoading(true);
        try {
            // Load reviews from IndexedDB (no storage limits!)
            const productReviews = await getProductReviews(productId);
            setReviews(productReviews);
            
            if (productReviews.length > 0) {
                const total = productReviews.reduce((sum, r) => sum + r.rating, 0);
                const avg = total / productReviews.length;
                setAverageRating(avg);
                setTotalReviews(productReviews.length);
                
                const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
                productReviews.forEach(r => {
                    distribution[r.rating] = (distribution[r.rating] || 0) + 1;
                });
                setRatingDistribution(distribution);
            } else {
                setAverageRating(0);
                setTotalReviews(0);
                setRatingDistribution({ 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 });
            }
        } catch (error) {
            console.error("Error loading reviews:", error);
        } finally {
            setLoading(false);
        }
    };

    const checkUserStatus = async () => {
        setCheckingPurchase(true);
        const userData = localStorage.getItem('user');
        
        if (!userData) {
            setUser(null);
            setUserHasPurchased(false);
            setUserReview(null);
            setCheckingPurchase(false);
            return;
        }
        
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        
        let hasPurchased = false;
        
        try {
            const indexedDBOrders = await getUserOrders(parsedUser.email);
            hasPurchased = indexedDBOrders.some(order => 
                order.itemsList && 
                order.itemsList.some(item => item.id === parseInt(productId) || item.id === productId)
            );
            
            if (!hasPurchased) {
                const localOrders = JSON.parse(localStorage.getItem(`orders_${parsedUser.email}`) || '[]');
                hasPurchased = localOrders.some(order => 
                    order.itemsList && 
                    order.itemsList.some(item => item.id === parseInt(productId) || item.id === productId)
                );
            }
        } catch (error) {
            console.error("Error checking orders:", error);
            const localOrders = JSON.parse(localStorage.getItem(`orders_${parsedUser.email}`) || '[]');
            hasPurchased = localOrders.some(order => 
                order.itemsList && 
                order.itemsList.some(item => item.id === parseInt(productId) || item.id === productId)
            );
        }
        
        setUserHasPurchased(hasPurchased);
        
        // Check if user already reviewed (from current reviews state)
        const existingUserReview = reviews.find(r => r.userEmail === parsedUser.email);
        setUserReview(existingUserReview || null);
        setCheckingPurchase(false);
    };

    const updateUIImmediately = (review) => {
        let updatedReviews;
        if (isEditing) {
            updatedReviews = reviews.map(r => r.id === review.id ? review : r);
        } else {
            updatedReviews = [review, ...reviews];
        }
        
        setReviews(updatedReviews);
        setUserReview(review);
        
        const total = updatedReviews.reduce((sum, r) => sum + r.rating, 0);
        const avg = total / updatedReviews.length;
        setAverageRating(avg);
        setTotalReviews(updatedReviews.length);
        
        const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
        updatedReviews.forEach(r => {
            distribution[r.rating] = (distribution[r.rating] || 0) + 1;
        });
        setRatingDistribution(distribution);
    };

    const handleSubmitReview = async (e) => {
        e.preventDefault();
        
        if (!user) {
            toast.error("Please login to submit a review");
            return;
        }
        
        if (!userHasPurchased) {
            toast.error("You can only review products you have purchased");
            return;
        }
        
        if (userReview && !isEditing) {
            toast.error("You have already reviewed this product");
            return;
        }
        
        if (!newReview.title || !newReview.comment) {
            toast.error("Please fill in all fields");
            return;
        }
        
        setIsSubmitting(true);
        toast.loading(isEditing ? "Updating your review..." : "Submitting your review...", { id: "review-submit" });
        
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const review = {
            id: userReview ? userReview.id : Date.now(),
            productId: parseInt(productId),
            productName: productName,
            userEmail: user.email,
            userName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email.split('@')[0],
            rating: newReview.rating,
            title: newReview.title,
            comment: newReview.comment,
            date: userReview ? userReview.date : new Date().toISOString(),
            verified: true,
            updatedAt: isEditing ? new Date().toISOString() : null
        };
        
        try {
            // Save to IndexedDB (unlimited storage!)
            await saveReview(review);
            
            // Update product rating in localStorage (lightweight update)
            await updateProductRatingInStorage(productId);
            
            // Update UI immediately
            updateUIImmediately(review);
            
            toast.dismiss("review-submit");
            toast.success(isEditing ? "✨ Review updated successfully!" : "✨ Review submitted successfully!", {
                duration: 4000,
                icon: "🎉",
                action: {
                    label: "View in Profile",
                    onClick: () => {
                        window.location.href = '/profile#reviews';
                    }
                }
            });
            
            setNewReview({ rating: 5, title: "", comment: "" });
            setShowReviewForm(false);
            setIsEditing(false);
            
            window.dispatchEvent(new CustomEvent('reviewAdded', { 
                detail: { productId, review } 
            }));
            window.dispatchEvent(new CustomEvent('productsUpdated'));
            
        } catch (error) {
            console.error("Error submitting review:", error);
            toast.dismiss("review-submit");
            
            if (error.name === 'QuotaExceededError') {
                toast.error("Storage issue detected, but your review was saved. Please refresh the page.");
                // Still update UI even if localStorage fails
                updateUIImmediately(review);
            } else {
                toast.error("Failed to submit review. Please try again.");
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEditReview = () => {
        if (userReview) {
            setNewReview({
                rating: userReview.rating,
                title: userReview.title,
                comment: userReview.comment
            });
            setIsEditing(true);
            setShowReviewForm(true);
            window.scrollTo({ top: document.getElementById('reviews-section').offsetTop - 100, behavior: 'smooth' });
        }
    };

    const handleDeleteReview = async () => {
        if (!userReview) return;
        
        if (window.confirm("Are you sure you want to delete your review? This action cannot be undone.")) {
            toast.loading("Deleting your review...", { id: "review-delete" });
            
            try {
                // Delete from IndexedDB
                await deleteReview(userReview.id);
                
                // Update product rating
                await updateProductRatingInStorage(productId);
                
                // Update UI immediately
                const updatedReviews = reviews.filter(r => r.id !== userReview.id);
                setReviews(updatedReviews);
                setUserReview(null);
                
                if (updatedReviews.length > 0) {
                    const total = updatedReviews.reduce((sum, r) => sum + r.rating, 0);
                    const avg = total / updatedReviews.length;
                    setAverageRating(avg);
                    setTotalReviews(updatedReviews.length);
                    
                    const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
                    updatedReviews.forEach(r => {
                        distribution[r.rating] = (distribution[r.rating] || 0) + 1;
                    });
                    setRatingDistribution(distribution);
                } else {
                    setAverageRating(0);
                    setTotalReviews(0);
                    setRatingDistribution({ 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 });
                }
                
                toast.dismiss("review-delete");
                toast.success("Your review has been deleted successfully!");
                
                setShowReviewForm(false);
                setIsEditing(false);
                setNewReview({ rating: 5, title: "", comment: "" });
                
                window.dispatchEvent(new CustomEvent('reviewDeleted', { 
                    detail: { productId } 
                }));
                window.dispatchEvent(new CustomEvent('productsUpdated'));
                
            } catch (error) {
                console.error("Error deleting review:", error);
                toast.dismiss("review-delete");
                toast.error("Failed to delete review. Please try again.");
            }
        }
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    };

    const StarRating = ({ rating, size = 16, interactive = false, onRatingChange, onHover }) => {
        const [localHover, setLocalHover] = useState(0);
        const displayRating = interactive ? (localHover || rating) : rating;
        
        return (
            <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                    <button
                        key={star}
                        type="button"
                        onClick={() => interactive && onRatingChange?.(star)}
                        onMouseEnter={() => {
                            if (interactive) {
                                setLocalHover(star);
                                onHover?.(star);
                            }
                        }}
                        onMouseLeave={() => {
                            if (interactive) {
                                setLocalHover(0);
                                onHover?.(0);
                            }
                        }}
                        className={interactive ? "cursor-pointer" : "cursor-default"}
                        disabled={!interactive}
                    >
                        <Star
                            size={size}
                            className={`${
                                star <= displayRating
                                    ? 'text-yellow-400 fill-current'
                                    : 'text-gray-300'
                            } ${interactive ? 'hover:scale-110 transition-transform' : ''}`}
                        />
                    </button>
                ))}
            </div>
        );
    };

    if (loading || checkingPurchase) {
        return (
            <div className="mt-8 border-t pt-8">
                <h3 className="text-xl font-bold mb-4">Customer Reviews</h3>
                <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="mt-8 border-t pt-8" id="reviews-section">
            <h3 className="text-xl font-bold mb-4">Customer Reviews</h3>
            
            {/* Review Summary */}
            <div className="bg-gray-50 rounded-xl p-6 mb-6">
                <div className="flex flex-col md:flex-row gap-6 items-center">
                    <div className="text-center">
                        <div className="text-4xl font-bold text-gray-900">
                            {averageRating > 0 ? averageRating.toFixed(1) : '0.0'}
                        </div>
                        <div className="flex justify-center mt-2">
                            <StarRating rating={Math.round(averageRating)} size={20} />
                        </div>
                        <div className="text-sm text-gray-500 mt-1">
                            Based on {totalReviews} {totalReviews === 1 ? 'review' : 'reviews'}
                        </div>
                    </div>
                    
                    <div className="flex-1 space-y-2">
                        {[5, 4, 3, 2, 1].map(rating => (
                            <div key={rating} className="flex items-center gap-2">
                                <div className="w-12 text-sm">{rating} stars</div>
                                <div className="flex-1 bg-gray-200 rounded-full h-2">
                                    <div 
                                        className="bg-yellow-400 rounded-full h-2 transition-all"
                                        style={{ width: `${totalReviews > 0 ? (ratingDistribution[rating] / totalReviews) * 100 : 0}%` }}
                                    />
                                </div>
                                <div className="w-12 text-sm text-gray-500">{ratingDistribution[rating]}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            
            {/* User's Own Review Section */}
            {userReview && (
                <div className="mb-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
                    <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                                {userReview.userName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <div className="font-semibold text-gray-900">{userReview.userName}</div>
                                <div className="text-xs text-gray-500">Your Review</div>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={handleEditReview}
                                className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                                title="Edit Review"
                            >
                                <Edit2 size={16} />
                            </button>
                            <button
                                onClick={handleDeleteReview}
                                className="p-1.5 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                                title="Delete Review"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    </div>
                    <div className="flex justify-between items-center mt-2">
                        <StarRating rating={userReview.rating} size={16} />
                        <span className="text-xs text-gray-500">{formatDate(userReview.date)}</span>
                    </div>
                    <h4 className="font-semibold text-gray-800 mt-2">{userReview.title}</h4>
                    <p className="text-gray-600 text-sm mt-1">{userReview.comment}</p>
                    {userReview.updatedAt && (
                        <p className="text-xs text-gray-400 mt-2">Edited: {formatDate(userReview.updatedAt)}</p>
                    )}
                    <div className="mt-2 text-xs text-green-600 flex items-center gap-1">
                        <CheckCircle size={12} /> Verified Purchase
                    </div>
                </div>
            )}
            
            {/* Other Reviews */}
            {reviews.filter(r => !userReview || r.id !== userReview.id).length > 0 ? (
                <div className="space-y-4 mb-8">
                    <h4 className="font-semibold text-lg">Other Reviews</h4>
                    {reviews.filter(r => !userReview || r.id !== userReview.id).map((review) => (
                        <div key={review.id} className="border rounded-xl p-4 hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start mb-2">
                                <div className="flex items-center gap-2">
                                    <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                                        {review.userName.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <div className="font-semibold text-gray-900">{review.userName}</div>
                                        <div className="flex items-center gap-2 text-xs text-gray-500">
                                            <Calendar size={12} />
                                            {formatDate(review.date)}
                                            {review.verified && (
                                                <span className="flex items-center gap-1 text-green-600">
                                                    <CheckCircle size={12} /> Verified Purchase
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <StarRating rating={review.rating} size={16} />
                            </div>
                            <h4 className="font-semibold text-gray-800 mt-2">{review.title}</h4>
                            <p className="text-gray-600 mt-1 text-sm">{review.comment}</p>
                        </div>
                    ))}
                </div>
            ) : reviews.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-lg mb-8">
                    <User size={48} className="mx-auto text-gray-400 mb-3" />
                    <p className="text-gray-500">No reviews yet</p>
                    {user && !userReview && userHasPurchased && (
                        <p className="text-sm text-gray-400 mt-2">Be the first to review this product!</p>
                    )}
                </div>
            ) : null}
            
            {/* Write Review Section */}
            <div className="border-t pt-6 mt-4">
                <h4 className="font-semibold text-lg mb-4">Share Your Experience</h4>
                
                {!user && (
                    <div className="p-4 bg-gray-50 rounded-lg text-center">
                        <p className="text-gray-600">
                            <button onClick={() => window.location.href = '/login'} className="text-blue-600 hover:underline font-semibold">
                                Login
                            </button> to write a review
                        </p>
                    </div>
                )}
                
                {user && userReview && !showReviewForm && (
                    <div className="p-4 bg-green-50 rounded-lg text-center">
                        <p className="text-green-600 flex items-center justify-center gap-2">
                            <CheckCircle size={18} />
                            ✓ You have already reviewed this product. You can edit or delete your review above.
                        </p>
                    </div>
                )}
                
                {user && !userReview && !userHasPurchased && (
                    <div className="p-4 bg-yellow-50 rounded-lg text-center">
                        <p className="text-yellow-700">
                            📦 You can only review products you have purchased. Once you order and receive this product, you can share your experience.
                        </p>
                    </div>
                )}
                
                {user && !userReview && userHasPurchased && (
                    <>
                        {!showReviewForm ? (
                            <button
                                onClick={() => setShowReviewForm(true)}
                                className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-all transform hover:scale-105 w-full md:w-auto flex items-center justify-center gap-2"
                            >
                                <Star size={18} /> Write a Review
                            </button>
                        ) : (
                            <div className="bg-white border rounded-xl p-6 shadow-lg">
                                <div className="flex justify-between items-center mb-4">
                                    <h4 className="text-lg font-semibold flex items-center gap-2">
                                        <Star className="text-yellow-500" size={20} />
                                        {isEditing ? "Edit Your Review" : "Write Your Review"}
                                    </h4>
                                    <button
                                        onClick={() => {
                                            setShowReviewForm(false);
                                            setIsEditing(false);
                                            setNewReview({ rating: 5, title: "", comment: "" });
                                        }}
                                        className="text-gray-400 hover:text-gray-600 transition-colors"
                                    >
                                        ✕
                                    </button>
                                </div>
                                
                                <form onSubmit={handleSubmitReview} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-2">Your Rating *</label>
                                        <StarRating 
                                            rating={newReview.rating} 
                                            size={28} 
                                            interactive={true}
                                            onRatingChange={(rating) => setNewReview({...newReview, rating})}
                                            onHover={(rating) => setHoverRating(rating)}
                                        />
                                    </div>
                                    
                                    <div>
                                        <label className="block text-sm font-medium mb-2">Review Title *</label>
                                        <input
                                            type="text"
                                            placeholder="Summarize your experience"
                                            value={newReview.title}
                                            onChange={(e) => setNewReview({...newReview, title: e.target.value})}
                                            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            required
                                        />
                                    </div>
                                    
                                    <div>
                                        <label className="block text-sm font-medium mb-2">Your Review *</label>
                                        <textarea
                                            rows="4"
                                            placeholder="Share your thoughts about this product"
                                            value={newReview.comment}
                                            onChange={(e) => setNewReview({...newReview, comment: e.target.value})}
                                            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            required
                                        />
                                    </div>
                                    
                                    <div className="flex gap-3 pt-2">
                                        <button
                                            type="submit"
                                            disabled={isSubmitting}
                                            className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-all disabled:opacity-50 flex items-center gap-2"
                                        >
                                            {isSubmitting ? (
                                                <>
                                                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                                                    {isEditing ? "Updating..." : "Submitting..."}
                                                </>
                                            ) : (
                                                <>
                                                    <CheckCircle size={16} />
                                                    {isEditing ? "Update Review" : "Submit Review"}
                                                </>
                                            )}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setShowReviewForm(false);
                                                setIsEditing(false);
                                                setNewReview({ rating: 5, title: "", comment: "" });
                                            }}
                                            className="bg-gray-300 text-gray-700 px-6 py-2 rounded-lg font-semibold hover:bg-gray-400 transition-all"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </form>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default ProductReviews;