// src/services/orderService.js
const DB_NAME = 'ZamedOrdersDB';
const DB_VERSION = 3;
const ORDERS_STORE = 'orders';
const RETURNS_STORE = 'return_requests';

// Initialize IndexedDB
const initDB = () => {
    return new Promise((resolve, reject) => {
        try {
            const request = indexedDB.open(DB_NAME, DB_VERSION);
            
            request.onerror = (event) => {
                console.error("❌ IndexedDB error:", event.target.error);
                if (event.target.error.name === 'VersionError') {
                    console.log("🔄 Version mismatch detected. Attempting to recreate database...");
                    indexedDB.deleteDatabase(DB_NAME).onsuccess = () => {
                        console.log("🗑️ Database deleted. Please refresh the page.");
                        reject(new Error("Database version mismatch. Please refresh the page."));
                    };
                } else {
                    reject(event.target.error);
                }
            };
            
            request.onsuccess = (event) => {
                console.log("✅ Order database connected (version " + DB_VERSION + ")");
                resolve(event.target.result);
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                const oldVersion = event.oldVersion;
                console.log(`🔄 Upgrading database from version ${oldVersion} to ${DB_VERSION}`);
                
                if (db.objectStoreNames.contains(ORDERS_STORE)) {
                    db.deleteObjectStore(ORDERS_STORE);
                    console.log("🗑️ Removed existing orders store");
                }
                if (db.objectStoreNames.contains(RETURNS_STORE)) {
                    db.deleteObjectStore(RETURNS_STORE);
                    console.log("🗑️ Removed existing returns store");
                }
                
                const store = db.createObjectStore(ORDERS_STORE, { keyPath: 'id' });
                store.createIndex('userEmail', 'userEmail', { unique: false });
                store.createIndex('date', 'date', { unique: false });
                store.createIndex('status', 'status', { unique: false });
                console.log("📦 Order store created in IndexedDB");
                
                const returnsStore = db.createObjectStore(RETURNS_STORE, { keyPath: 'id' });
                returnsStore.createIndex('orderId', 'orderId', { unique: false });
                returnsStore.createIndex('userEmail', 'userEmail', { unique: false });
                returnsStore.createIndex('status', 'status', { unique: false });
                returnsStore.createIndex('date', 'date', { unique: false });
                console.log("📦 Return requests store created in IndexedDB");
            };
        } catch (error) {
            reject(error);
        }
    });
};

// Helper function to handle IndexedDB transactions with retry
const executeTransaction = async (storeName, mode, callback, retries = 3) => {
    let lastError;
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const db = await initDB();
            return await new Promise((resolve, reject) => {
                const transaction = db.transaction([storeName], mode);
                
                transaction.onerror = (event) => {
                    console.error(`Transaction error (attempt ${attempt}):`, event.target.error);
                    reject(event.target.error);
                };
                
                transaction.oncomplete = () => {
                    console.log(`Transaction completed successfully (attempt ${attempt})`);
                };
                
                try {
                    const store = transaction.objectStore(storeName);
                    callback(store, resolve, reject);
                } catch (error) {
                    reject(error);
                }
            });
        } catch (error) {
            lastError = error;
            console.warn(`Transaction attempt ${attempt} failed:`, error);
            if (attempt < retries) {
                await new Promise(resolve => setTimeout(resolve, 100 * attempt));
            }
        }
    }
    throw lastError;
};

// ==================== ORDER FUNCTIONS ====================

const saveOrder = async (order) => {
    try {
        if (!order.id) {
            order.id = 'ORD-' + Date.now().toString().slice(-8) + Math.random().toString(36).substr(2, 4).toUpperCase();
        }
        
        try {
            await executeTransaction(ORDERS_STORE, 'readwrite', (store, resolve, reject) => {
                const request = store.put(order);
                request.onsuccess = () => {
                    console.log(`✅ Order ${order.id} saved to IndexedDB`);
                    resolve(order.id);
                };
                request.onerror = () => reject(request.error);
            });
        } catch (indexedDBError) {
            console.warn("IndexedDB save failed, using localStorage fallback:", indexedDBError);
        }
        
        try {
            const localOrders = JSON.parse(localStorage.getItem('admin_orders') || '[]');
            const existingIndex = localOrders.findIndex(o => o.id === order.id);
            if (existingIndex >= 0) {
                localOrders[existingIndex] = order;
            } else {
                localOrders.push(order);
            }
            localStorage.setItem('admin_orders', JSON.stringify(localOrders));
            
            if (order.userEmail || order.customerEmail) {
                const email = order.userEmail || order.customerEmail;
                const userOrders = JSON.parse(localStorage.getItem(`orders_${email}`) || '[]');
                const userIndex = userOrders.findIndex(o => o.id === order.id);
                if (userIndex >= 0) {
                    userOrders[userIndex] = order;
                } else {
                    userOrders.push(order);
                }
                localStorage.setItem(`orders_${email}`, JSON.stringify(userOrders));
            }
        } catch (backupError) {
            console.warn("Backup to localStorage failed:", backupError);
        }
        
        return order.id;
    } catch (error) {
        console.error("Error saving order:", error);
        return null;
    }
};

const getUserOrders = async (userEmail) => {
    try {
        return await executeTransaction(ORDERS_STORE, 'readonly', (store, resolve, reject) => {
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
        console.warn("IndexedDB getUserOrders failed, using localStorage:", error);
        try {
            const userOrders = JSON.parse(localStorage.getItem(`orders_${userEmail}`) || '[]');
            userOrders.sort((a, b) => new Date(b.date) - new Date(a.date));
            return userOrders;
        } catch {
            return [];
        }
    }
};

const getAllOrders = async () => {
    try {
        return await executeTransaction(ORDERS_STORE, 'readonly', (store, resolve, reject) => {
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
        console.warn("IndexedDB getAllOrders failed, using localStorage:", error);
        try {
            const allOrders = [];
            const adminOrders = JSON.parse(localStorage.getItem('admin_orders') || '[]');
            allOrders.push(...adminOrders);
            
            const guestOrders = JSON.parse(localStorage.getItem('guestOrders') || '[]');
            allOrders.push(...guestOrders);
            
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith('orders_')) {
                    const userOrders = JSON.parse(localStorage.getItem(key) || '[]');
                    allOrders.push(...userOrders);
                }
            }
            
            const uniqueOrders = [];
            const ids = new Set();
            allOrders.forEach(order => {
                if (order.id && !ids.has(order.id)) {
                    ids.add(order.id);
                    uniqueOrders.push(order);
                }
            });
            
            uniqueOrders.sort((a, b) => new Date(b.date) - new Date(a.date));
            console.log(`📦 Retrieved ${uniqueOrders.length} orders from localStorage`);
            return uniqueOrders;
        } catch (fallbackError) {
            console.error("Fallback to localStorage failed:", fallbackError);
            return [];
        }
    }
};

const getOrderById = async (orderId) => {
    try {
        return await executeTransaction(ORDERS_STORE, 'readonly', (store, resolve, reject) => {
            const request = store.get(orderId);
            request.onsuccess = () => {
                resolve(request.result);
            };
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        console.warn("IndexedDB getOrderById failed, using localStorage:", error);
        try {
            const allOrders = JSON.parse(localStorage.getItem('admin_orders') || '[]');
            return allOrders.find(o => o.id === orderId) || null;
        } catch {
            return null;
        }
    }
};

const updateOrderStatus = async (orderId, status) => {
    try {
        let result = null;
        
        try {
            result = await executeTransaction(ORDERS_STORE, 'readwrite', (store, resolve, reject) => {
                const request = store.get(orderId);
                request.onsuccess = () => {
                    const order = request.result;
                    if (order) {
                        order.status = status;
                        order.orderStatus = status;
                        order.updatedAt = new Date().toISOString();
                        
                        if (!order.statusHistory) order.statusHistory = [];
                        order.statusHistory.push({
                            status: status,
                            timestamp: new Date().toISOString(),
                            note: `Status updated to ${status}`
                        });
                        
                        const updateRequest = store.put(order);
                        updateRequest.onsuccess = () => {
                            console.log(`✅ Order ${orderId} status updated to ${status}`);
                            resolve(order);
                        };
                        updateRequest.onerror = () => reject(updateRequest.error);
                    } else {
                        reject(new Error("Order not found"));
                    }
                };
                request.onerror = () => reject(request.error);
            });
        } catch (indexedDBError) {
            console.warn("IndexedDB update failed, using localStorage:", indexedDBError);
            const allOrders = JSON.parse(localStorage.getItem('admin_orders') || '[]');
            const index = allOrders.findIndex(o => o.id === orderId);
            if (index >= 0) {
                allOrders[index].status = status;
                allOrders[index].orderStatus = status;
                allOrders[index].updatedAt = new Date().toISOString();
                if (!allOrders[index].statusHistory) allOrders[index].statusHistory = [];
                allOrders[index].statusHistory.push({
                    status: status,
                    timestamp: new Date().toISOString(),
                    note: `Status updated to ${status}`
                });
                localStorage.setItem('admin_orders', JSON.stringify(allOrders));
                result = allOrders[index];
            }
        }
        
        if (result) {
            try {
                const localOrders = JSON.parse(localStorage.getItem('admin_orders') || '[]');
                const index = localOrders.findIndex(o => o.id === orderId);
                if (index >= 0) {
                    localOrders[index] = result;
                    localStorage.setItem('admin_orders', JSON.stringify(localOrders));
                }
                
                if (result.userEmail || result.customerEmail) {
                    const email = result.userEmail || result.customerEmail;
                    const userOrders = JSON.parse(localStorage.getItem(`orders_${email}`) || '[]');
                    const userIndex = userOrders.findIndex(o => o.id === orderId);
                    if (userIndex >= 0) {
                        userOrders[userIndex] = result;
                        localStorage.setItem(`orders_${email}`, JSON.stringify(userOrders));
                    }
                }
            } catch (backupError) {
                console.warn("Backup update failed:", backupError);
            }
            return true;
        }
        
        return false;
    } catch (error) {
        console.error("Error updating order status:", error);
        return false;
    }
};

const updateDeliveryDate = async (orderId, deliveryDate) => {
    try {
        const result = await executeTransaction(ORDERS_STORE, 'readwrite', (store, resolve, reject) => {
            const request = store.get(orderId);
            request.onsuccess = () => {
                const order = request.result;
                if (order) {
                    order.deliveryDate = deliveryDate;
                    order.deliveryStatus = "scheduled";
                    order.updatedAt = new Date().toISOString();
                    const updateRequest = store.put(order);
                    updateRequest.onsuccess = () => {
                        console.log(`✅ Order ${orderId} delivery date updated to ${deliveryDate}`);
                        resolve(order);
                    };
                    updateRequest.onerror = () => reject(updateRequest.error);
                } else {
                    reject(new Error("Order not found"));
                }
            };
            request.onerror = () => reject(request.error);
        });
        
        try {
            const localOrders = JSON.parse(localStorage.getItem('admin_orders') || '[]');
            const index = localOrders.findIndex(o => o.id === orderId);
            if (index >= 0) {
                localOrders[index] = result;
                localStorage.setItem('admin_orders', JSON.stringify(localOrders));
            }
        } catch (backupError) {
            console.warn("Backup update failed:", backupError);
        }
        
        return true;
    } catch (error) {
        console.error("Error updating delivery date:", error);
        return false;
    }
};

const deleteOrder = async (orderId) => {
    try {
        await executeTransaction(ORDERS_STORE, 'readwrite', (store, resolve, reject) => {
            const request = store.delete(orderId);
            request.onsuccess = () => {
                console.log(`✅ Order ${orderId} deleted from IndexedDB`);
                resolve(true);
            };
            request.onerror = () => reject(request.error);
        });
        
        try {
            const localOrders = JSON.parse(localStorage.getItem('admin_orders') || '[]');
            const filtered = localOrders.filter(o => o.id !== orderId);
            localStorage.setItem('admin_orders', JSON.stringify(filtered));
        } catch (backupError) {
            console.warn("Backup delete failed:", backupError);
        }
        
        return true;
    } catch (error) {
        console.error("Error deleting order:", error);
        return false;
    }
};

const getOrdersByStatus = async (status) => {
    try {
        return await executeTransaction(ORDERS_STORE, 'readonly', (store, resolve, reject) => {
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

const getOrdersByDateRange = async (startDate, endDate) => {
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

const getOrderStats = async () => {
    try {
        const allOrders = await getAllOrders();
        
        const stats = {
            total: allOrders.length,
            pending: allOrders.filter(o => (o.status || o.orderStatus) === 'pending').length,
            processing: allOrders.filter(o => (o.status || o.orderStatus) === 'processing').length,
            shipped: allOrders.filter(o => (o.status || o.orderStatus) === 'shipped').length,
            delivered: allOrders.filter(o => (o.status || o.orderStatus) === 'delivered').length,
            cancelled: allOrders.filter(o => (o.status || o.orderStatus) === 'cancelled').length,
            totalRevenue: allOrders
                .filter(o => (o.status || o.orderStatus) === 'delivered')
                .reduce((sum, o) => sum + (o.total || 0), 0),
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

const getMonthlyRevenue = async (year, month) => {
    try {
        const allOrders = await getAllOrders();
        return allOrders
            .filter(o => {
                const date = new Date(o.date);
                return date.getFullYear() === year && 
                       date.getMonth() === month && 
                       (o.status || o.orderStatus) !== 'cancelled';
            })
            .reduce((sum, o) => sum + (o.total || 0), 0);
    } catch (error) {
        console.error("Error getting monthly revenue:", error);
        return 0;
    }
};

const getDailyRevenue = async (days = 7) => {
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
                    return orderDate === dateStr && (o.status || o.orderStatus) !== 'cancelled';
                })
                .reduce((sum, o) => sum + (o.total || 0), 0);
            
            result.push({
                date: dateStr,
                amount: dailyTotal,
                count: allOrders.filter(o => {
                    const orderDate = new Date(o.date).toISOString().split('T')[0];
                    return orderDate === dateStr && (o.status || o.orderStatus) !== 'cancelled';
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

const saveReturnRequest = async (returnRequest) => {
    try {
        if (!returnRequest.id) {
            returnRequest.id = 'RET-' + Date.now().toString().slice(-8) + Math.random().toString(36).substr(2, 4).toUpperCase();
        }
        
        try {
            await executeTransaction(RETURNS_STORE, 'readwrite', (store, resolve, reject) => {
                const request = store.put(returnRequest);
                request.onsuccess = () => {
                    console.log(`✅ Return request ${returnRequest.id} saved to IndexedDB`);
                    resolve(returnRequest.id);
                };
                request.onerror = () => reject(request.error);
            });
        } catch (indexedDBError) {
            console.warn("IndexedDB saveReturnRequest failed, using localStorage:", indexedDBError);
        }
        
        try {
            const localReturns = JSON.parse(localStorage.getItem('return_requests') || '[]');
            const existingIndex = localReturns.findIndex(r => r.id === returnRequest.id);
            if (existingIndex >= 0) {
                localReturns[existingIndex] = returnRequest;
            } else {
                localReturns.push(returnRequest);
            }
            localStorage.setItem('return_requests', JSON.stringify(localReturns));
            
            if (returnRequest.userEmail) {
                const userReturns = JSON.parse(localStorage.getItem(`returns_${returnRequest.userEmail}`) || '[]');
                const userIndex = userReturns.findIndex(r => r.id === returnRequest.id);
                if (userIndex >= 0) {
                    userReturns[userIndex] = returnRequest;
                } else {
                    userReturns.push(returnRequest);
                }
                localStorage.setItem(`returns_${returnRequest.userEmail}`, JSON.stringify(userReturns));
            }
        } catch (backupError) {
            console.warn("Backup to localStorage failed:", backupError);
        }
        
        return returnRequest.id;
    } catch (error) {
        console.error("Error saving return request:", error);
        return null;
    }
};

const getReturnRequestsByOrder = async (orderId) => {
    try {
        return await executeTransaction(RETURNS_STORE, 'readonly', (store, resolve, reject) => {
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

const getUserReturnRequests = async (userEmail) => {
    try {
        return await executeTransaction(RETURNS_STORE, 'readonly', (store, resolve, reject) => {
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
        console.warn("IndexedDB getUserReturnRequests failed, using localStorage:", error);
        try {
            const userReturns = JSON.parse(localStorage.getItem(`returns_${userEmail}`) || '[]');
            userReturns.sort((a, b) => new Date(b.date) - new Date(a.date));
            return userReturns;
        } catch {
            return [];
        }
    }
};

const getAllReturnRequests = async () => {
    try {
        return await executeTransaction(RETURNS_STORE, 'readonly', (store, resolve, reject) => {
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
        try {
            const localReturns = JSON.parse(localStorage.getItem('return_requests') || '[]');
            localReturns.sort((a, b) => new Date(b.date) - new Date(a.date));
            return localReturns;
        } catch {
            return [];
        }
    }
};

const getReturnRequestsByStatus = async (status) => {
    try {
        return await executeTransaction(RETURNS_STORE, 'readonly', (store, resolve, reject) => {
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

const updateReturnStatus = async (returnId, status, adminNote = null, refundAmount = null) => {
    try {
        const result = await executeTransaction(RETURNS_STORE, 'readwrite', (store, resolve, reject) => {
            const request = store.get(returnId);
            request.onsuccess = () => {
                const returnReq = request.result;
                if (returnReq) {
                    returnReq.status = status;
                    returnReq.processedAt = new Date().toISOString();
                    if (adminNote) returnReq.adminNote = adminNote;
                    if (refundAmount !== null) returnReq.refundAmount = refundAmount;
                    
                    if (!returnReq.trackingHistory) returnReq.trackingHistory = [];
                    returnReq.trackingHistory.push({
                        stage: status,
                        timestamp: new Date().toISOString(),
                        message: adminNote || `Status updated to ${status}`
                    });
                    
                    const updateRequest = store.put(returnReq);
                    updateRequest.onsuccess = () => {
                        console.log(`✅ Return request ${returnId} status updated to ${status}`);
                        resolve(returnReq);
                    };
                    updateRequest.onerror = () => reject(updateRequest.error);
                } else {
                    reject(new Error("Return request not found"));
                }
            };
            request.onerror = () => reject(request.error);
        });
        
        try {
            const localReturns = JSON.parse(localStorage.getItem('return_requests') || '[]');
            const index = localReturns.findIndex(r => r.id === returnId);
            if (index >= 0) {
                localReturns[index] = result;
                localStorage.setItem('return_requests', JSON.stringify(localReturns));
            }
            
            if (result.userEmail) {
                const userReturns = JSON.parse(localStorage.getItem(`returns_${result.userEmail}`) || '[]');
                const userIndex = userReturns.findIndex(r => r.id === returnId);
                if (userIndex >= 0) {
                    userReturns[userIndex] = result;
                    localStorage.setItem(`returns_${result.userEmail}`, JSON.stringify(userReturns));
                }
            }
        } catch (backupError) {
            console.warn("Backup update failed:", backupError);
        }
        
        return true;
    } catch (error) {
        console.error("Error updating return status:", error);
        return false;
    }
};

const deleteReturnRequest = async (returnId) => {
    try {
        await executeTransaction(RETURNS_STORE, 'readwrite', (store, resolve, reject) => {
            const request = store.delete(returnId);
            request.onsuccess = () => {
                console.log(`✅ Return request ${returnId} deleted from IndexedDB`);
                resolve(true);
            };
            request.onerror = () => reject(request.error);
        });
        
        try {
            const localReturns = JSON.parse(localStorage.getItem('return_requests') || '[]');
            const filtered = localReturns.filter(r => r.id !== returnId);
            localStorage.setItem('return_requests', JSON.stringify(filtered));
        } catch (backupError) {
            console.warn("Backup delete failed:", backupError);
        }
        
        return true;
    } catch (error) {
        console.error("Error deleting return request:", error);
        return false;
    }
};

const getReturnStats = async () => {
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

const getReturnRequestById = async (returnId) => {
    try {
        return await executeTransaction(RETURNS_STORE, 'readonly', (store, resolve, reject) => {
            const request = store.get(returnId);
            request.onsuccess = () => {
                resolve(request.result);
            };
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        console.error("Error getting return request:", error);
        try {
            const localReturns = JSON.parse(localStorage.getItem('return_requests') || '[]');
            return localReturns.find(r => r.id === returnId) || null;
        } catch {
            return null;
        }
    }
};

const getReturnRequestsByDateRange = async (startDate, endDate) => {
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

const syncLocalOrdersToIndexedDB = async () => {
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

const syncLocalReturnsToIndexedDB = async () => {
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
        return syncedCount;
    } catch (error) {
        console.error("Error syncing returns:", error);
        return 0;
    }
};

const clearAllOrders = async () => {
    if (window.confirm("⚠️ WARNING: This will delete ALL orders from IndexedDB. Continue?")) {
        try {
            await executeTransaction(ORDERS_STORE, 'readwrite', (store, resolve, reject) => {
                const request = store.clear();
                request.onsuccess = () => {
                    console.log("✅ All orders cleared from IndexedDB");
                    resolve(true);
                };
                request.onerror = () => reject(request.error);
            });
            
            localStorage.setItem('admin_orders', JSON.stringify([]));
            return true;
        } catch (error) {
            console.error("Error clearing orders:", error);
            return false;
        }
    }
    return false;
};

const clearAllReturnRequests = async () => {
    if (window.confirm("⚠️ WARNING: This will delete ALL return requests from IndexedDB. Continue?")) {
        try {
            await executeTransaction(RETURNS_STORE, 'readwrite', (store, resolve, reject) => {
                const request = store.clear();
                request.onsuccess = () => {
                    console.log("✅ All return requests cleared from IndexedDB");
                    resolve(true);
                };
                request.onerror = () => reject(request.error);
            });
            
            localStorage.setItem('return_requests', JSON.stringify([]));
            return true;
        } catch (error) {
            console.error("Error clearing return requests:", error);
            return false;
        }
    }
    return false;
};

// ==================== EXPORTS ====================

// Default export
export default {
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
    syncLocalOrdersToIndexedDB,
    syncLocalReturnsToIndexedDB,
    clearAllOrders,
    clearAllReturnRequests
};

// Named exports for backward compatibility
export {
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
    syncLocalOrdersToIndexedDB,
    syncLocalReturnsToIndexedDB,
    clearAllOrders,
    clearAllReturnRequests
};