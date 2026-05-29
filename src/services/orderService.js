// src/services/orderService.js
const DB_NAME = 'ZamedOrdersDB';
const DB_VERSION = 2; // Increased version to add return_requests store
const ORDERS_STORE = 'orders';
const RETURNS_STORE = 'return_requests';

// Initialize IndexedDB
const initDB = () => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        
        request.onerror = () => reject(request.error);
        
        request.onsuccess = () => {
            console.log("✅ Order database connected");
            resolve(request.result);
        };
        
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            const oldVersion = event.oldVersion;
            
            // Create orders store if not exists
            if (!db.objectStoreNames.contains(ORDERS_STORE)) {
                const store = db.createObjectStore(ORDERS_STORE, { keyPath: 'id' });
                store.createIndex('userEmail', 'userEmail', { unique: false });
                store.createIndex('date', 'date', { unique: false });
                store.createIndex('status', 'status', { unique: false });
                console.log("📦 Order store created in IndexedDB");
            }
            
            // Create return_requests store (new in version 2)
            if (!db.objectStoreNames.contains(RETURNS_STORE)) {
                const returnsStore = db.createObjectStore(RETURNS_STORE, { keyPath: 'id' });
                returnsStore.createIndex('orderId', 'orderId', { unique: false });
                returnsStore.createIndex('userEmail', 'userEmail', { unique: false });
                returnsStore.createIndex('status', 'status', { unique: false });
                returnsStore.createIndex('date', 'date', { unique: false });
                console.log("📦 Return requests store created in IndexedDB");
            }
        };
    });
};

// ==================== ORDER FUNCTIONS ====================

// Save order to IndexedDB (UNLIMITED STORAGE!)
export const saveOrder = async (order) => {
    try {
        const db = await initDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([ORDERS_STORE], 'readwrite');
            const store = transaction.objectStore(ORDERS_STORE);
            const request = store.put(order);
            
            request.onsuccess = () => {
                console.log(`✅ Order ${order.id} saved to IndexedDB`);
                resolve(order.id);
            };
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        console.error("Error saving order:", error);
        return null;
    }
};

// Get user orders from IndexedDB
export const getUserOrders = async (userEmail) => {
    try {
        const db = await initDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([ORDERS_STORE], 'readonly');
            const store = transaction.objectStore(ORDERS_STORE);
            const index = store.index('userEmail');
            const request = index.getAll(userEmail);
            
            request.onsuccess = () => {
                const orders = request.result || [];
                orders.sort((a, b) => new Date(b.date) - new Date(a.date));
                resolve(orders);
            };
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        console.error("Error getting orders:", error);
        return [];
    }
};

// Get all orders for admin (from IndexedDB)
export const getAllOrders = async () => {
    try {
        const db = await initDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([ORDERS_STORE], 'readonly');
            const store = transaction.objectStore(ORDERS_STORE);
            const request = store.getAll();
            
            request.onsuccess = () => {
                const orders = request.result || [];
                orders.sort((a, b) => new Date(b.date) - new Date(a.date));
                console.log(`📦 Retrieved ${orders.length} orders from IndexedDB`);
                resolve(orders);
            };
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        console.error("Error getting all orders:", error);
        return [];
    }
};

// Get order by ID
export const getOrderById = async (orderId) => {
    try {
        const db = await initDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([ORDERS_STORE], 'readonly');
            const store = transaction.objectStore(ORDERS_STORE);
            const request = store.get(orderId);
            
            request.onsuccess = () => {
                resolve(request.result);
            };
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        console.error("Error getting order:", error);
        return null;
    }
};

// Update order status
export const updateOrderStatus = async (orderId, status) => {
    try {
        const db = await initDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([ORDERS_STORE], 'readwrite');
            const store = transaction.objectStore(ORDERS_STORE);
            const request = store.get(orderId);
            
            request.onsuccess = () => {
                const order = request.result;
                if (order) {
                    order.status = status;
                    order.updatedAt = new Date().toISOString();
                    const updateRequest = store.put(order);
                    updateRequest.onsuccess = () => {
                        console.log(`✅ Order ${orderId} status updated to ${status}`);
                        resolve(true);
                    };
                    updateRequest.onerror = () => reject(updateRequest.error);
                } else {
                    reject(new Error("Order not found"));
                }
            };
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        console.error("Error updating order status:", error);
        return false;
    }
};

// Update delivery date
export const updateDeliveryDate = async (orderId, deliveryDate) => {
    try {
        const db = await initDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([ORDERS_STORE], 'readwrite');
            const store = transaction.objectStore(ORDERS_STORE);
            const request = store.get(orderId);
            
            request.onsuccess = () => {
                const order = request.result;
                if (order) {
                    order.deliveryDate = deliveryDate;
                    order.deliveryStatus = "scheduled";
                    const updateRequest = store.put(order);
                    updateRequest.onsuccess = () => {
                        console.log(`✅ Order ${orderId} delivery date updated to ${deliveryDate}`);
                        resolve(true);
                    };
                    updateRequest.onerror = () => reject(updateRequest.error);
                } else {
                    reject(new Error("Order not found"));
                }
            };
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        console.error("Error updating delivery date:", error);
        return false;
    }
};

// Delete order from IndexedDB
export const deleteOrder = async (orderId) => {
    try {
        const db = await initDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([ORDERS_STORE], 'readwrite');
            const store = transaction.objectStore(ORDERS_STORE);
            const request = store.delete(orderId);
            
            request.onsuccess = () => {
                console.log(`✅ Order ${orderId} deleted from IndexedDB`);
                resolve(true);
            };
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        console.error("Error deleting order:", error);
        return false;
    }
};

// Get orders by status
export const getOrdersByStatus = async (status) => {
    try {
        const db = await initDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([ORDERS_STORE], 'readonly');
            const store = transaction.objectStore(ORDERS_STORE);
            const index = store.index('status');
            const request = index.getAll(status);
            
            request.onsuccess = () => {
                const orders = request.result || [];
                orders.sort((a, b) => new Date(b.date) - new Date(a.date));
                resolve(orders);
            };
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        console.error("Error getting orders by status:", error);
        return [];
    }
};

// Get orders within date range
export const getOrdersByDateRange = async (startDate, endDate) => {
    try {
        const allOrders = await getAllOrders();
        return allOrders.filter(order => {
            const orderDate = new Date(order.date);
            return orderDate >= new Date(startDate) && orderDate <= new Date(endDate);
        });
    } catch (error) {
        console.error("Error getting orders by date range:", error);
        return [];
    }
};

// Get order statistics
export const getOrderStats = async () => {
    try {
        const allOrders = await getAllOrders();
        
        const stats = {
            total: allOrders.length,
            pending: allOrders.filter(o => o.status === 'pending').length,
            processing: allOrders.filter(o => o.status === 'processing').length,
            shipped: allOrders.filter(o => o.status === 'shipped').length,
            delivered: allOrders.filter(o => o.status === 'delivered').length,
            cancelled: allOrders.filter(o => o.status === 'cancelled').length,
            totalRevenue: allOrders.reduce((sum, o) => sum + (o.total || 0), 0),
            totalOrdersToday: allOrders.filter(o => {
                const today = new Date().toDateString();
                return new Date(o.date).toDateString() === today;
            }).length,
            pendingRefunds: 0
        };
        
        return stats;
    } catch (error) {
        console.error("Error getting order stats:", error);
        return {
            total: 0,
            pending: 0,
            processing: 0,
            shipped: 0,
            delivered: 0,
            cancelled: 0,
            totalRevenue: 0,
            totalOrdersToday: 0,
            pendingRefunds: 0
        };
    }
};

// Get monthly revenue
export const getMonthlyRevenue = async (year, month) => {
    try {
        const allOrders = await getAllOrders();
        return allOrders
            .filter(o => {
                const date = new Date(o.date);
                return date.getFullYear() === year && 
                       date.getMonth() === month && 
                       o.status !== 'cancelled';
            })
            .reduce((sum, o) => sum + (o.total || 0), 0);
    } catch (error) {
        console.error("Error getting monthly revenue:", error);
        return 0;
    }
};

// Get daily revenue for chart
export const getDailyRevenue = async (days = 7) => {
    try {
        const allOrders = await getAllOrders();
        const result = [];
        
        for (let i = days - 1; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            
            const dailyTotal = allOrders
                .filter(o => {
                    const orderDate = new Date(o.date).toISOString().split('T')[0];
                    return orderDate === dateStr && o.status !== 'cancelled';
                })
                .reduce((sum, o) => sum + (o.total || 0), 0);
            
            result.push({
                date: dateStr,
                amount: dailyTotal,
                count: allOrders.filter(o => {
                    const orderDate = new Date(o.date).toISOString().split('T')[0];
                    return orderDate === dateStr && o.status !== 'cancelled';
                }).length
            });
        }
        
        return result;
    } catch (error) {
        console.error("Error getting daily revenue:", error);
        return [];
    }
};

// ==================== RETURN REQUEST FUNCTIONS ====================

// Save return request to IndexedDB
export const saveReturnRequest = async (returnRequest) => {
    try {
        const db = await initDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([RETURNS_STORE], 'readwrite');
            const store = transaction.objectStore(RETURNS_STORE);
            const request = store.put(returnRequest);
            
            request.onsuccess = () => {
                console.log(`✅ Return request ${returnRequest.id} saved to IndexedDB`);
                resolve(returnRequest.id);
            };
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        console.error("Error saving return request:", error);
        return null;
    }
};

// Get return requests for a specific order
export const getReturnRequestsByOrder = async (orderId) => {
    try {
        const db = await initDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([RETURNS_STORE], 'readonly');
            const store = transaction.objectStore(RETURNS_STORE);
            const index = store.index('orderId');
            const request = index.getAll(orderId);
            
            request.onsuccess = () => {
                const returns = request.result || [];
                returns.sort((a, b) => new Date(b.date) - new Date(a.date));
                resolve(returns);
            };
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        console.error("Error getting returns by order:", error);
        return [];
    }
};

// Get return requests for a user
export const getUserReturnRequests = async (userEmail) => {
    try {
        const db = await initDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([RETURNS_STORE], 'readonly');
            const store = transaction.objectStore(RETURNS_STORE);
            const index = store.index('userEmail');
            const request = index.getAll(userEmail);
            
            request.onsuccess = () => {
                const returns = request.result || [];
                returns.sort((a, b) => new Date(b.date) - new Date(a.date));
                resolve(returns);
            };
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        console.error("Error getting user returns:", error);
        return [];
    }
};

// Get all return requests for admin
export const getAllReturnRequests = async () => {
    try {
        const db = await initDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([RETURNS_STORE], 'readonly');
            const store = transaction.objectStore(RETURNS_STORE);
            const request = store.getAll();
            
            request.onsuccess = () => {
                const returns = request.result || [];
                returns.sort((a, b) => new Date(b.date) - new Date(a.date));
                console.log(`📦 Retrieved ${returns.length} return requests from IndexedDB`);
                resolve(returns);
            };
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        console.error("Error getting all returns:", error);
        return [];
    }
};

// Get return requests by status
export const getReturnRequestsByStatus = async (status) => {
    try {
        const db = await initDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([RETURNS_STORE], 'readonly');
            const store = transaction.objectStore(RETURNS_STORE);
            const index = store.index('status');
            const request = index.getAll(status);
            
            request.onsuccess = () => {
                const returns = request.result || [];
                returns.sort((a, b) => new Date(b.date) - new Date(a.date));
                resolve(returns);
            };
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        console.error("Error getting returns by status:", error);
        return [];
    }
};

// Update return request status
export const updateReturnStatus = async (returnId, status, adminNote = null, refundAmount = null) => {
    try {
        const db = await initDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([RETURNS_STORE], 'readwrite');
            const store = transaction.objectStore(RETURNS_STORE);
            const request = store.get(returnId);
            
            request.onsuccess = () => {
                const returnReq = request.result;
                if (returnReq) {
                    returnReq.status = status;
                    returnReq.processedAt = new Date().toISOString();
                    if (adminNote) returnReq.adminNote = adminNote;
                    if (refundAmount !== null) returnReq.refundAmount = refundAmount;
                    
                    // Add to tracking history
                    if (!returnReq.trackingHistory) returnReq.trackingHistory = [];
                    returnReq.trackingHistory.push({
                        stage: status,
                        timestamp: new Date().toISOString(),
                        message: adminNote || `Status updated to ${status}`
                    });
                    
                    const updateRequest = store.put(returnReq);
                    updateRequest.onsuccess = () => {
                        console.log(`✅ Return request ${returnId} status updated to ${status}`);
                        resolve(true);
                    };
                    updateRequest.onerror = () => reject(updateRequest.error);
                } else {
                    reject(new Error("Return request not found"));
                }
            };
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        console.error("Error updating return status:", error);
        return false;
    }
};

// Delete return request
export const deleteReturnRequest = async (returnId) => {
    try {
        const db = await initDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([RETURNS_STORE], 'readwrite');
            const store = transaction.objectStore(RETURNS_STORE);
            const request = store.delete(returnId);
            
            request.onsuccess = () => {
                console.log(`✅ Return request ${returnId} deleted from IndexedDB`);
                resolve(true);
            };
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        console.error("Error deleting return request:", error);
        return false;
    }
};

// Get return statistics (UPDATED for all statuses)
export const getReturnStats = async () => {
    try {
        const allReturns = await getAllReturnRequests();
        
        const stats = {
            total: allReturns.length,
            pending_pickup: allReturns.filter(r => r.status === 'pending_pickup').length,
            pickup_scheduled: allReturns.filter(r => r.status === 'pickup_scheduled').length,
            picked_up: allReturns.filter(r => r.status === 'picked_up').length,
            verified: allReturns.filter(r => r.status === 'verified').length,
            refund_processing: allReturns.filter(r => r.status === 'refund_processing').length,
            refunded: allReturns.filter(r => r.status === 'refunded').length,
            rejected: allReturns.filter(r => r.status === 'rejected').length,
            totalRefundAmount: allReturns
                .filter(r => r.status === 'refunded')
                .reduce((sum, r) => sum + (r.refundAmount || 0), 0),
            pendingRefundAmount: allReturns
                .filter(r => r.status === 'verified' || r.status === 'refund_processing')
                .reduce((sum, r) => sum + (r.refundAmount || 0), 0)
        };
        
        return stats;
    } catch (error) {
        console.error("Error getting return stats:", error);
        return {
            total: 0,
            pending_pickup: 0,
            pickup_scheduled: 0,
            picked_up: 0,
            verified: 0,
            refund_processing: 0,
            refunded: 0,
            rejected: 0,
            totalRefundAmount: 0,
            pendingRefundAmount: 0
        };
    }
};

// Get return request by ID
export const getReturnRequestById = async (returnId) => {
    try {
        const db = await initDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([RETURNS_STORE], 'readonly');
            const store = transaction.objectStore(RETURNS_STORE);
            const request = store.get(returnId);
            
            request.onsuccess = () => {
                resolve(request.result);
            };
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        console.error("Error getting return request:", error);
        return null;
    }
};

// Get returns by date range
export const getReturnRequestsByDateRange = async (startDate, endDate) => {
    try {
        const allReturns = await getAllReturnRequests();
        return allReturns.filter(returnReq => {
            const returnDate = new Date(returnReq.date);
            return returnDate >= new Date(startDate) && returnDate <= new Date(endDate);
        });
    } catch (error) {
        console.error("Error getting returns by date range:", error);
        return [];
    }
};

// ==================== MIGRATION FUNCTIONS ====================

// Sync local storage orders to IndexedDB (for migration)
export const syncLocalOrdersToIndexedDB = async () => {
    try {
        const localOrders = JSON.parse(localStorage.getItem('admin_orders') || '[]');
        let syncedCount = 0;
        
        for (const order of localOrders) {
            const existingOrder = await getOrderById(order.id);
            if (!existingOrder) {
                await saveOrder(order);
                syncedCount++;
            }
        }
        
        // Also sync user-specific orders
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('orders_')) {
                const userOrders = JSON.parse(localStorage.getItem(key) || '[]');
                for (const order of userOrders) {
                    const existingOrder = await getOrderById(order.id);
                    if (!existingOrder) {
                        await saveOrder(order);
                        syncedCount++;
                    }
                }
            }
        }
        
        console.log(`✅ Synced ${syncedCount} orders to IndexedDB`);
        return syncedCount;
    } catch (error) {
        console.error("Error syncing orders:", error);
        return 0;
    }
};

// Sync return requests from localStorage to IndexedDB
export const syncLocalReturnsToIndexedDB = async () => {
    try {
        const localReturns = JSON.parse(localStorage.getItem('return_requests') || '[]');
        let syncedCount = 0;
        
        for (const returnReq of localReturns) {
            const existingReturn = await getReturnRequestById(returnReq.id);
            if (!existingReturn) {
                await saveReturnRequest(returnReq);
                syncedCount++;
            }
        }
        
        console.log(`✅ Synced ${syncedCount} return requests to IndexedDB`);
        
        // Optionally clear localStorage after sync
        if (syncedCount > 0) {
            // Don't auto-clear, just log
            console.log(`💡 ${syncedCount} returns synced to IndexedDB. localStorage can be cleared manually if needed.`);
        }
        
        return syncedCount;
    } catch (error) {
        console.error("Error syncing returns:", error);
        return 0;
    }
};

// Clear all orders from IndexedDB (use with caution)
export const clearAllOrders = async () => {
    if (window.confirm("⚠️ WARNING: This will delete ALL orders from IndexedDB. Continue?")) {
        try {
            const db = await initDB();
            return new Promise((resolve, reject) => {
                const transaction = db.transaction([ORDERS_STORE], 'readwrite');
                const store = transaction.objectStore(ORDERS_STORE);
                const request = store.clear();
                
                request.onsuccess = () => {
                    console.log("✅ All orders cleared from IndexedDB");
                    resolve(true);
                };
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.error("Error clearing orders:", error);
            return false;
        }
    }
    return false;
};

// Clear all return requests from IndexedDB
export const clearAllReturnRequests = async () => {
    if (window.confirm("⚠️ WARNING: This will delete ALL return requests from IndexedDB. Continue?")) {
        try {
            const db = await initDB();
            return new Promise((resolve, reject) => {
                const transaction = db.transaction([RETURNS_STORE], 'readwrite');
                const store = transaction.objectStore(RETURNS_STORE);
                const request = store.clear();
                
                request.onsuccess = () => {
                    console.log("✅ All return requests cleared from IndexedDB");
                    resolve(true);
                };
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.error("Error clearing return requests:", error);
            return false;
        }
    }
    return false;
};

// Export all functions
export default {
    // Order functions
    saveOrder,
    getUserOrders,
    getAllOrders,
    getOrderById,
    updateOrderStatus,
    updateDeliveryDate,
    deleteOrder,
    getOrdersByStatus,
    getOrdersByDateRange,
    getOrderStats,
    getMonthlyRevenue,
    getDailyRevenue,
    
    // Return request functions
    saveReturnRequest,
    getReturnRequestsByOrder,
    getUserReturnRequests,
    getAllReturnRequests,
    getReturnRequestsByStatus,
    getReturnRequestsByDateRange,
    updateReturnStatus,
    deleteReturnRequest,
    getReturnStats,
    getReturnRequestById,
    
    // Migration functions
    syncLocalOrdersToIndexedDB,
    syncLocalReturnsToIndexedDB,
    clearAllOrders,
    clearAllReturnRequests
};