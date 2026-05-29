// src/services/reviewService.js
const DB_NAME = 'ZamedReviewsDB';
const DB_VERSION = 1;
const STORE_NAME = 'product_reviews';
const USER_REVIEWS_STORE = 'user_reviews';

// Initialize IndexedDB
const initDB = () => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        
        request.onerror = () => reject(request.error);
        
        request.onsuccess = () => {
            console.log("✅ Review database connected");
            resolve(request.result);
        };
        
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            
            // Store for product reviews
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                const reviewStore = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
                reviewStore.createIndex('productId', 'productId', { unique: false });
                reviewStore.createIndex('userEmail', 'userEmail', { unique: false });
                reviewStore.createIndex('date', 'date', { unique: false });
                console.log("📦 Product reviews store created in IndexedDB");
            }
            
            // Store for user reviews
            if (!db.objectStoreNames.contains(USER_REVIEWS_STORE)) {
                const userReviewStore = db.createObjectStore(USER_REVIEWS_STORE, { keyPath: 'id' });
                userReviewStore.createIndex('userEmail', 'userEmail', { unique: false });
                userReviewStore.createIndex('productId', 'productId', { unique: false });
                console.log("📦 User reviews store created in IndexedDB");
            }
        };
    });
};

// Save review to IndexedDB
export const saveReview = async (review) => {
    try {
        const db = await initDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_NAME, USER_REVIEWS_STORE], 'readwrite');
            
            // Save to product reviews
            const reviewStore = transaction.objectStore(STORE_NAME);
            const reviewRequest = reviewStore.put(review);
            
            // Save to user reviews
            const userReviewStore = transaction.objectStore(USER_REVIEWS_STORE);
            const userReviewRequest = userReviewStore.put(review);
            
            let completed = 0;
            const checkComplete = () => {
                completed++;
                if (completed === 2) {
                    console.log(`✅ Review ${review.id} saved to IndexedDB`);
                    resolve(review.id);
                }
            };
            
            reviewRequest.onsuccess = checkComplete;
            userReviewRequest.onsuccess = checkComplete;
            
            reviewRequest.onerror = () => reject(reviewRequest.error);
            userReviewRequest.onerror = () => reject(userReviewRequest.error);
        });
    } catch (error) {
        console.error("Error saving review:", error);
        return null;
    }
};

// Get reviews for a product
export const getProductReviews = async (productId) => {
    try {
        const db = await initDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_NAME], 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const index = store.index('productId');
            const request = index.getAll(parseInt(productId));
            
            request.onsuccess = () => {
                const reviews = request.result || [];
                reviews.sort((a, b) => new Date(b.date) - new Date(a.date));
                resolve(reviews);
            };
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        console.error("Error getting product reviews:", error);
        return [];
    }
};

// Get user's reviews
export const getUserReviews = async (userEmail) => {
    try {
        const db = await initDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([USER_REVIEWS_STORE], 'readonly');
            const store = transaction.objectStore(USER_REVIEWS_STORE);
            const index = store.index('userEmail');
            const request = index.getAll(userEmail);
            
            request.onsuccess = () => {
                const reviews = request.result || [];
                reviews.sort((a, b) => new Date(b.date) - new Date(a.date));
                resolve(reviews);
            };
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        console.error("Error getting user reviews:", error);
        return [];
    }
};

// Delete review
export const deleteReview = async (reviewId) => {
    try {
        const db = await initDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_NAME, USER_REVIEWS_STORE], 'readwrite');
            
            const reviewStore = transaction.objectStore(STORE_NAME);
            const userReviewStore = transaction.objectStore(USER_REVIEWS_STORE);
            
            let completed = 0;
            const checkComplete = () => {
                completed++;
                if (completed === 2) {
                    console.log(`✅ Review ${reviewId} deleted from IndexedDB`);
                    resolve(true);
                }
            };
            
            reviewStore.delete(reviewId).onsuccess = checkComplete;
            userReviewStore.delete(reviewId).onsuccess = checkComplete;
            
            reviewStore.delete(reviewId).onerror = () => reject(reviewStore.delete(reviewId).error);
            userReviewStore.delete(reviewId).onerror = () => reject(userReviewStore.delete(reviewId).error);
        });
    } catch (error) {
        console.error("Error deleting review:", error);
        return false;
    }
};

// Update product rating in product service (lightweight - only update necessary fields)
export const updateProductRatingInStorage = async (productId) => {
    try {
        const reviews = await getProductReviews(productId);
        
        if (reviews.length > 0) {
            const totalRating = reviews.reduce((sum, r) => sum + r.rating, 0);
            const averageRating = totalRating / reviews.length;
            
            // Update in shop_products (still need localStorage for product display)
            try {
                const products = JSON.parse(localStorage.getItem('shop_products') || '[]');
                const productIndex = products.findIndex(p => p.id === parseInt(productId));
                if (productIndex !== -1) {
                    products[productIndex].rating = averageRating;
                    products[productIndex].reviews = reviews.length;
                    localStorage.setItem('shop_products', JSON.stringify(products));
                    localStorage.setItem('admin_products', JSON.stringify(products));
                }
            } catch (localStorageError) {
                console.warn("Could not update product rating in localStorage:", localStorageError);
                // Don't throw error - reviews are still saved in IndexedDB
            }
        }
        
        return true;
    } catch (error) {
        console.error("Error updating product rating:", error);
        return false;
    }
};

// Sync reviews from localStorage to IndexedDB (migration)
export const syncReviewsToIndexedDB = async () => {
    try {
        const localReviews = JSON.parse(localStorage.getItem('product_reviews') || '[]');
        let syncedCount = 0;
        
        for (const review of localReviews) {
            const existingReviews = await getProductReviews(review.productId);
            const exists = existingReviews.some(r => r.id === review.id);
            if (!exists) {
                await saveReview(review);
                syncedCount++;
            }
        }
        
        console.log(`✅ Synced ${syncedCount} reviews to IndexedDB`);
        return syncedCount;
    } catch (error) {
        console.error("Error syncing reviews:", error);
        return 0;
    }
};