// src/services/imageStorage.js
const DB_NAME = 'ZamedImagesDB';
const DB_VERSION = 2;
const STORE_NAME = 'product_images';

// Initialize IndexedDB
export const initDB = () => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        
        request.onerror = () => reject(request.error);
        
        request.onsuccess = () => {
            const db = request.result;
            console.log("✅ IndexedDB initialized for images");
            resolve(db);
        };
        
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
                store.createIndex('timestamp', 'timestamp', { unique: false });
                console.log("📦 Image store created in IndexedDB");
            }
        };
    });
};

// Save image to IndexedDB
export const saveImageToDB = async (imageId, imageData) => {
    try {
        const db = await initDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.put({ id: imageId, data: imageData, timestamp: Date.now() });
            
            request.onsuccess = () => {
                console.log(`✅ Image saved to IndexedDB: ${imageId}`);
                resolve(`db://${imageId}`);
            };
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        console.error("Error saving to IndexedDB:", error);
        return null;
    }
};

// Get image from IndexedDB
export const getImageFromDB = async (imageId) => {
    try {
        const db = await initDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_NAME], 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.get(imageId);
            
            request.onsuccess = () => {
                resolve(request.result?.data);
            };
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        console.error("Error getting from IndexedDB:", error);
        return null;
    }
};

// Delete image from IndexedDB
export const deleteImageFromDB = async (imageId) => {
    try {
        const db = await initDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.delete(imageId);
            
            request.onsuccess = () => resolve(true);
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        console.error("Error deleting from IndexedDB:", error);
        return false;
    }
};

// Get all images (for cleanup) - FIXED
export const getAllImageIds = async () => {
    try {
        const db = await initDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_NAME], 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.getAllKeys();
            
            request.onsuccess = () => {
                resolve(request.result || []);
            };
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        console.error("Error getting image IDs:", error);
        return [];
    }
};

// Get all images with metadata
export const getAllImages = async () => {
    try {
        const db = await initDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_NAME], 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.getAll();
            
            request.onsuccess = () => {
                resolve(request.result || []);
            };
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        console.error("Error getting all images:", error);
        return [];
    }
};

// Clean up old unused images - FIXED
export const cleanupOldImages = async () => {
    try {
        const productIds = new Set();
        
        // Get all product image IDs from localStorage
        const products = JSON.parse(localStorage.getItem('shop_products') || '[]');
        products.forEach(product => {
            if (product.image && product.image.startsWith('db://')) {
                productIds.add(product.image.replace('db://', ''));
            }
            if (product.colorImages) {
                Object.values(product.colorImages).forEach(img => {
                    if (img && img.startsWith('db://')) {
                        productIds.add(img.replace('db://', ''));
                    }
                });
            }
        });
        
        // Get all images from IndexedDB
        const allImages = await getAllImages();
        
        // Find images older than 7 days not used
        const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
        
        // Delete unused images
        let deletedCount = 0;
        for (const image of allImages) {
            const isUsed = productIds.has(image.id);
            const isOld = image.timestamp < sevenDaysAgo;
            
            // Delete if not used OR (old AND not used)
            if (!isUsed || (isOld && !isUsed)) {
                await deleteImageFromDB(image.id);
                deletedCount++;
            }
        }
        
        if (deletedCount > 0) {
            console.log(`🗑️ Cleaned up ${deletedCount} unused/old images`);
        }
        
        return deletedCount;
    } catch (error) {
        console.error("Error cleaning up images:", error);
        return 0;
    }
};

// Get storage info
export const getImageStorageInfo = async () => {
    try {
        const allImages = await getAllImages();
        const totalSize = allImages.reduce((sum, img) => sum + (img.data?.length || 0), 0);
        const sizeInMB = (totalSize / (1024 * 1024)).toFixed(2);
        
        return {
            count: allImages.length,
            totalSize: sizeInMB,
            averageSize: allImages.length > 0 ? (totalSize / allImages.length / 1024).toFixed(2) : 0
        };
    } catch (error) {
        console.error("Error getting storage info:", error);
        return { count: 0, totalSize: 0, averageSize: 0 };
    }
};

export default {
    initDB,
    saveImageToDB,
    getImageFromDB,
    deleteImageFromDB,
    getAllImageIds,
    getAllImages,
    cleanupOldImages,
    getImageStorageInfo
};