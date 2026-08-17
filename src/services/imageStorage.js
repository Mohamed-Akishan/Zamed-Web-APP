// src/services/imageStorage.js

const DB_NAME = "ZamedImageStore";
const STORE_NAME = "images";
const DB_VERSION = 1;

// Open IndexedDB connection
const openDB = () => {
    return new Promise((resolve, reject) => {
        try {
            const request = indexedDB.open(DB_NAME, DB_VERSION);
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
                    store.createIndex("timestamp", "timestamp", { unique: false });
                    store.createIndex("type", "type", { unique: false });
                }
            };
            
            request.onsuccess = (event) => {
                resolve(event.target.result);
            };
            
            request.onerror = (event) => {
                reject(event.target.error);
            };
        } catch (error) {
            reject(error);
        }
    });
};

// ============================================================
// Save image to IndexedDB
// ============================================================
export const saveImageToDB = async (id, data, type = 'product') => {
    if (!id || !data) {
        console.warn('⚠️ saveImageToDB: missing id or data');
        return false;
    }
    
    try {
        const db = await openDB();
        
        return new Promise((resolve) => {
            try {
                const transaction = db.transaction([STORE_NAME], 'readwrite');
                const store = transaction.objectStore(STORE_NAME);
                
                const record = {
                    id: String(id),
                    data: data,
                    timestamp: Date.now(),
                    type: type,
                    persistent: true
                };
                
                const request = store.put(record);
                
                request.onsuccess = () => {
                    console.log(`✅ Image saved to IndexedDB: ${id}`);
                    resolve(true);
                };
                
                request.onerror = () => {
                    console.error(`❌ Error saving image ${id}:`, request.error);
                    resolve(false);
                };
                
                transaction.onerror = () => {
                    console.error(`❌ Transaction error for image ${id}:`, transaction.error);
                    resolve(false);
                };
            } catch (error) {
                console.error('❌ Error in saveImageToDB:', error);
                resolve(false);
            }
        });
    } catch (error) {
        console.error('❌ Error opening database in saveImageToDB:', error);
        return false;
    }
};

// ============================================================
// Get image from IndexedDB
// ============================================================
export const getImageFromDB = async (id) => {
    if (!id) {
        console.warn('⚠️ getImageFromDB: missing id');
        return null;
    }
    
    try {
        const db = await openDB();
        
        return new Promise((resolve) => {
            try {
                const transaction = db.transaction([STORE_NAME], 'readonly');
                const store = transaction.objectStore(STORE_NAME);
                const request = store.get(String(id));
                
                request.onsuccess = () => {
                    const result = request.result;
                    if (result && result.data) {
                        console.log(`✅ Image found in IndexedDB: ${id}`);
                        resolve(result.data);
                    } else {
                        console.warn(`⚠️ No image found for id: ${id}`);
                        resolve(null);
                    }
                };
                
                request.onerror = () => {
                    console.warn(`⚠️ Error fetching image ${id}:`, request.error);
                    resolve(null);
                };
                
                transaction.onerror = () => {
                    console.warn(`⚠️ Transaction error fetching image ${id}:`, transaction.error);
                    resolve(null);
                };
            } catch (error) {
                console.error('❌ Error in getImageFromDB:', error);
                resolve(null);
            }
        });
    } catch (error) {
        console.error('❌ Error opening database in getImageFromDB:', error);
        return null;
    }
};

// ============================================================
// Check if image exists in IndexedDB
// ============================================================
export const imageExistsInDB = async (id) => {
    if (!id) return false;
    
    try {
        const db = await openDB();
        
        return new Promise((resolve) => {
            try {
                const transaction = db.transaction([STORE_NAME], 'readonly');
                const store = transaction.objectStore(STORE_NAME);
                const request = store.get(String(id));
                
                request.onsuccess = () => {
                    resolve(!!request.result);
                };
                
                request.onerror = () => {
                    resolve(false);
                };
            } catch (error) {
                resolve(false);
            }
        });
    } catch (error) {
        return false;
    }
};

// ============================================================
// Get all images from IndexedDB
// ============================================================
export const getAllImagesFromDB = async () => {
    try {
        const db = await openDB();
        
        return new Promise((resolve) => {
            try {
                const transaction = db.transaction([STORE_NAME], 'readonly');
                const store = transaction.objectStore(STORE_NAME);
                const request = store.getAll();
                
                request.onsuccess = () => {
                    resolve(request.result || []);
                };
                
                request.onerror = () => {
                    console.warn('⚠️ Error getting all images:', request.error);
                    resolve([]);
                };
            } catch (error) {
                console.error('❌ Error in getAllImagesFromDB:', error);
                resolve([]);
            }
        });
    } catch (error) {
        console.error('❌ Error opening database in getAllImagesFromDB:', error);
        return [];
    }
};

// ============================================================
// Delete image from IndexedDB
// ============================================================
export const deleteImageFromDB = async (id) => {
    if (!id) return false;
    
    try {
        const db = await openDB();
        
        return new Promise((resolve) => {
            try {
                const transaction = db.transaction([STORE_NAME], 'readwrite');
                const store = transaction.objectStore(STORE_NAME);
                const request = store.delete(String(id));
                
                request.onsuccess = () => {
                    console.log(`🗑️ Image deleted from IndexedDB: ${id}`);
                    resolve(true);
                };
                
                request.onerror = () => {
                    console.error(`❌ Error deleting image ${id}:`, request.error);
                    resolve(false);
                };
            } catch (error) {
                console.error('❌ Error in deleteImageFromDB:', error);
                resolve(false);
            }
        });
    } catch (error) {
        console.error('❌ Error opening database in deleteImageFromDB:', error);
        return false;
    }
};

// ============================================================
// Clear all images from IndexedDB
// ============================================================
export const clearAllImagesFromDB = async () => {
    try {
        const db = await openDB();
        
        return new Promise((resolve) => {
            try {
                const transaction = db.transaction([STORE_NAME], 'readwrite');
                const store = transaction.objectStore(STORE_NAME);
                const request = store.clear();
                
                request.onsuccess = () => {
                    console.log('🗑️ All images cleared from IndexedDB');
                    resolve(true);
                };
                
                request.onerror = () => {
                    console.warn('⚠️ Error clearing images:', request.error);
                    resolve(false);
                };
            } catch (error) {
                console.error('❌ Error in clearAllImagesFromDB:', error);
                resolve(false);
            }
        });
    } catch (error) {
        console.error('❌ Error opening database in clearAllImagesFromDB:', error);
        return false;
    }
};