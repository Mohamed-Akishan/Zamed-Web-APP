// src/pages/Admin/ReturnManagement.jsx
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
    FiShield,
    FiSearch,
    FiRefreshCw,
    FiEye,
    FiCheck,
    FiX,
    FiClock,
    FiCalendar,
    FiUser,
    FiPackage,
    FiDollarSign,
    FiMapPin,
    FiMail,
    FiPhone,
    FiInfo,
    FiCreditCard,
    FiHome,
    FiLoader,
    FiAlertCircle,
    FiFilter,
    FiChevronDown,
    FiChevronUp,
    FiDownload,
    FiPrinter
} from "react-icons/fi";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import orderService from "../../services/orderService";

// ============================================================
// IMPORT SHARED RATE LIMITER FROM AdminLayout
// ============================================================
import { sharedRateLimiter, debouncedFetch } from "../../components/Admin/AdminLayout";

const API_URL =
  import.meta.env.VITE_API_URL ||
  (window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5000/api'
    : window.location.hostname.endsWith('.vercel.app')
      ? 'https://zamed-backend-1.onrender.com/api'
      : 'https://zamed-backend-1.onrender.com/api');

const RETURNS_DB_NAME = "zamed_returns_db";
const RETURNS_DB_VERSION = 1;
const RETURNS_STORE = "returns";

// ============================================================
// IndexedDB Operations - Optimized with caching
// ============================================================
let dbCache = null;
let dbPromise = null;

const openReturnsDatabase = () => {
    if (dbCache) return Promise.resolve(dbCache);
    if (dbPromise) return dbPromise;

    dbPromise = new Promise((resolve, reject) => {
        if (typeof indexedDB === "undefined") {
            reject(new Error("IndexedDB is not available"));
            return;
        }

        const request = indexedDB.open(RETURNS_DB_NAME, RETURNS_DB_VERSION);

        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(RETURNS_STORE)) {
                db.createObjectStore(RETURNS_STORE, { keyPath: "id" });
            }
        };

        request.onsuccess = () => {
            dbCache = request.result;
            resolve(dbCache);
        };

        request.onerror = () => reject(request.error);
    });

    return dbPromise;
};

const getAllReturnRecords = async () => {
    try {
        const db = await openReturnsDatabase();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(RETURNS_STORE, "readonly");
            const request = tx.objectStore(RETURNS_STORE).getAll();
            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        console.warn("Unable to load returns from IndexedDB:", error);
        return [];
    }
};

const putReturnRecord = async (record) => {
    if (!record) return false;
    const id = record.id || record._id || `${record.orderId}-${record.productId}`;
    if (!id) return false;

    try {
        const db = await openReturnsDatabase();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(RETURNS_STORE, "readwrite");
            tx.objectStore(RETURNS_STORE).put({ ...record, id: String(id) });
            tx.oncomplete = () => resolve(true);
            tx.onerror = () => reject(tx.error);
        });
    } catch (error) {
        console.warn("Unable to save return to IndexedDB:", error);
        return false;
    }
};

const compactReturnForLocalStorage = (record = {}) => {
    const refundMethod = typeof record.refundMethod === "object" && record.refundMethod !== null
        ? { ...record.refundMethod }
        : record.refundMethod;

    return {
        ...record,
        productImage: typeof record.productImage === "string" && record.productImage.startsWith("data:") ? "" : record.productImage || "",
        refundMethod,
        trackingHistory: Array.isArray(record.trackingHistory) ? record.trackingHistory.slice(-20) : []
    };
};

// ============================================================
// Main Component
// ============================================================
const ReturnManagement = () => {
    // ============================================================
    // State - Optimized with useMemo where possible
    // ============================================================
    const [returnRequests, setReturnRequests] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [loading, setLoading] = useState(true);
    const [selectedReturn, setSelectedReturn] = useState(null);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [updating, setUpdating] = useState(null);
    const [darkMode, setDarkMode] = useState(false);
    const [currencySymbol, setCurrencySymbol] = useState("$");

    // Refund actions
    const [showRefundModal, setShowRefundModal] = useState(false);
    const [refundAmount, setRefundAmount] = useState(0);
    const [refundNote, setRefundNote] = useState("");
    const [refundMethod, setRefundMethod] = useState("bank_transfer");
    const [processingRefund, setProcessingRefund] = useState(false);

    // Refs for preventing multiple loads
    const isLoadingRef = useRef(false);
    const loadedRef = useRef(false);
    const isMountedRef = useRef(true);
    const loadTimeoutRef = useRef(null);

    const getToken = useCallback(() => 
        localStorage.getItem('adminToken') || localStorage.getItem('admin_token'), 
    []);

    // ============================================================
    // Memoized filtered results - Only recalculates when data changes
    // ============================================================
    const filteredRequests = useMemo(() => {
        let filtered = returnRequests;
        
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(r => 
                r.productName?.toLowerCase().includes(term) ||
                r.userEmail?.toLowerCase().includes(term) ||
                r.orderId?.toLowerCase().includes(term) ||
                r.id?.toString().includes(term)
            );
        }
        
        if (statusFilter !== "all") {
            filtered = filtered.filter(r => r.status === statusFilter);
        }
        
        return filtered;
    }, [returnRequests, searchTerm, statusFilter]);

    // ============================================================
    // Memoized stats - Only recalculates when data changes
    // ============================================================
    const stats = useMemo(() => {
        const returns = returnRequests;
        return {
            total: returns.length,
            pending: returns.filter(r => r.status === 'pending_pickup' || r.status === 'pending').length,
            pickupScheduled: returns.filter(r => r.status === 'pickup_scheduled').length,
            pickedUp: returns.filter(r => r.status === 'picked_up').length,
            verified: returns.filter(r => r.status === 'verified').length,
            refundProcessing: returns.filter(r => r.status === 'refund_processing').length,
            refunded: returns.filter(r => r.status === 'refunded').length,
            rejected: returns.filter(r => r.status === 'rejected').length,
            totalRefundAmount: returns
                .filter(r => r.status === 'refunded' || r.status === 'refund_processing')
                .reduce((sum, r) => sum + (r.refundAmount || 0), 0)
        };
    }, [returnRequests]);

    // ============================================================
    // Load currency symbol
    // ============================================================
    const loadCurrencySymbol = useCallback(() => {
        const siteSettings = JSON.parse(localStorage.getItem('site_settings') || '{}');
        const symbols = { USD: "$", EUR: "€", GBP: "£", LKR: "Rs" };
        setCurrencySymbol(symbols[siteSettings.currency] || "$");
    }, []);

    // ============================================================
    // Merge returns from different sources
    // ============================================================
    const mergeReturns = useCallback((localReturns, backendReturns) => {
        const map = new Map();
        localReturns.forEach(r => {
            const id = r.id || r._id;
            if (id) map.set(id, r);
        });
        backendReturns.forEach(r => {
            const id = r.id || r._id;
            if (id) {
                if (map.has(id)) {
                    map.set(id, { ...map.get(id), ...r });
                } else {
                    map.set(id, r);
                }
            }
        });
        return Array.from(map.values());
    }, []);

    // ============================================================
    // Load return requests - OPTIMIZED with caching
    // ============================================================
    const loadReturnRequests = useCallback(async (force = false) => {
        // Prevent multiple simultaneous loads
        if (isLoadingRef.current && !force) {
            console.log('⏳ Return load already in progress');
            return;
        }

        // If already loaded and not forcing refresh, use cache
        if (loadedRef.current && !force) {
            console.log('📦 Using cached returns data');
            return;
        }

        if (!isMountedRef.current) return;

        isLoadingRef.current = true;
        setLoading(true);

        try {
            // Try to get from localStorage FIRST (fastest)
            let localReturns = [];
            try {
                const parsed = JSON.parse(localStorage.getItem("return_requests") || "[]");
                localReturns = Array.isArray(parsed) ? parsed : [];
                if (localReturns.length > 0) {
                    // Sort by date
                    localReturns.sort((a, b) => 
                        new Date(b.updatedAt || b.date || b.createdAt || 0) - 
                        new Date(a.updatedAt || a.date || a.createdAt || 0)
                    );
                    setReturnRequests(localReturns);
                    // Don't set loading false yet - we'll update with API data if available
                }
            } catch {
                localReturns = [];
            }

            // Try to get from IndexedDB (faster than API)
            let indexedReturns = [];
            try {
                indexedReturns = await getAllReturnRecords();
                if (indexedReturns.length > 0) {
                    const merged = mergeReturns(localReturns, indexedReturns);
                    if (merged.length > localReturns.length) {
                        merged.sort((a, b) => 
                            new Date(b.updatedAt || b.date || b.createdAt || 0) - 
                            new Date(a.updatedAt || a.date || a.createdAt || 0)
                        );
                        setReturnRequests(merged);
                        localReturns = merged;
                    }
                }
            } catch (error) {
                console.warn("IndexedDB load failed:", error);
            }

            // Try to get from orderService (local data)
            try {
                const serviceReturns = await orderService.getAllReturnRequests();
                if (Array.isArray(serviceReturns) && serviceReturns.length > 0) {
                    const merged = mergeReturns(localReturns, serviceReturns);
                    if (merged.length > localReturns.length) {
                        merged.sort((a, b) => 
                            new Date(b.updatedAt || b.date || b.createdAt || 0) - 
                            new Date(a.updatedAt || a.date || a.createdAt || 0)
                        );
                        setReturnRequests(merged);
                        localReturns = merged;
                    }
                }
            } catch (serviceError) {
                console.warn("orderService returns unavailable:", serviceError);
            }

            // Try backend API LAST (slowest) - only if token exists
            const token = getToken();
            if (token && (force || !loadedRef.current)) {
                try {
                    console.log('🔄 Fetching returns from API...');
                    const data = await debouncedFetch(
                        `${API_URL}/returns/admin`,
                        { headers: { "Authorization": `Bearer ${token}` } },
                        60000 // Cache for 60 seconds
                    );

                    if (data && data.returns && Array.isArray(data.returns) && data.returns.length > 0) {
                        const backendReturns = data.returns;
                        const merged = mergeReturns(localReturns, backendReturns);
                        merged.sort((a, b) => 
                            new Date(b.updatedAt || b.date || b.createdAt || 0) - 
                            new Date(a.updatedAt || a.date || a.createdAt || 0)
                        );
                        setReturnRequests(merged);
                        localReturns = merged;

                        // Save to IndexedDB in background (don't await)
                        putAllReturnRecords(merged).catch(() => {});
                        
                        // Save compact cache
                        saveCompactReturnsToLocalStorage(merged);
                        console.log(`✅ Loaded ${merged.length} returns from API`);
                    }
                } catch (apiError) {
                    if (!apiError.message?.includes('Rate limit')) {
                        console.warn("Backend API error:", apiError.message);
                    }
                }
            }

            loadedRef.current = true;
            console.log(`✅ Loaded ${localReturns.length} return requests`);

        } catch (error) {
            console.error("Error loading return requests:", error);
            if (!error.message?.includes('Rate limit')) {
                toast.error("Failed to load return requests");
            }
        } finally {
            if (isMountedRef.current) {
                isLoadingRef.current = false;
                setLoading(false);
            }
        }
    }, [getToken, mergeReturns]);

    // ============================================================
    // Save returns to IndexedDB (background)
    // ============================================================
    const putAllReturnRecords = useCallback(async (records = []) => {
        const list = Array.isArray(records) ? records : [];
        for (const record of list) {
            try {
                await putReturnRecord(record);
            } catch (e) {
                // Ignore individual errors
            }
        }
    }, []);

    // ============================================================
    // Save compact returns to localStorage
    // ============================================================
    const saveCompactReturnsToLocalStorage = useCallback((records = []) => {
        try {
            const compact = records.map(compactReturnForLocalStorage);
            localStorage.setItem("return_requests", JSON.stringify(compact));
            return true;
        } catch (error) {
            if (error?.name === "QuotaExceededError") {
                try {
                    const tiny = records.map(record => ({
                        id: record.id || record._id,
                        orderId: record.orderId,
                        productId: record.productId,
                        productName: record.productName,
                        userEmail: record.userEmail,
                        refundAmount: record.refundAmount,
                        refundMethod: record.refundMethod,
                        status: record.status,
                        date: record.date,
                        updatedAt: record.updatedAt
                    }));
                    localStorage.setItem("return_requests", JSON.stringify(tiny));
                    return true;
                } catch (fallbackError) {
                    console.warn("Return local cache skipped because browser storage is full");
                }
            } else {
                console.warn("Unable to save return local cache:", error);
            }
            return false;
        }
    }, []);

    // ============================================================
    // Effects
    // ============================================================
    useEffect(() => {
        isMountedRef.current = true;

        const checkDarkMode = () => {
            const isDark = document.documentElement.classList.contains('dark');
            setDarkMode(isDark);
        };

        const refreshReturns = () => {
            loadedRef.current = false;
            loadReturnRequests(true);
        };

        const handleStorage = (event) => {
            if (!event.key || event.key === "return_requests" || String(event.key).startsWith("return_requests_")) {
                loadedRef.current = false;
                // Debounce storage events
                if (loadTimeoutRef.current) {
                    clearTimeout(loadTimeoutRef.current);
                }
                loadTimeoutRef.current = setTimeout(() => {
                    loadReturnRequests(true);
                }, 500);
            }
        };

        checkDarkMode();
        loadCurrencySymbol();
        
        // Initial load with delay to allow UI to render first
        const timer = setTimeout(() => {
            if (isMountedRef.current) {
                loadReturnRequests(true);
            }
        }, 300);

        window.addEventListener("returnsUpdated", refreshReturns);
        window.addEventListener("storage", handleStorage);

        return () => {
            isMountedRef.current = false;
            clearTimeout(timer);
            if (loadTimeoutRef.current) {
                clearTimeout(loadTimeoutRef.current);
            }
            window.removeEventListener("returnsUpdated", refreshReturns);
            window.removeEventListener("storage", handleStorage);
        };
    }, []);

    // ============================================================
    // Return status functions - memoized
    // ============================================================
    const getStatusLabel = useCallback((status) => {
        const labels = {
            'pending_pickup': 'Pending Pickup',
            'pickup_scheduled': 'Pickup Scheduled',
            'picked_up': 'Picked Up',
            'verified': 'Verified',
            'refund_processing': 'Refund Processing',
            'refunded': 'Refunded',
            'rejected': 'Rejected'
        };
        return labels[status] || status;
    }, []);

    const getStatusBadge = useCallback((status) => {
        const badges = {
            'pending_pickup': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
            'pickup_scheduled': 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
            'picked_up': 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400',
            'verified': 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
            'refund_processing': 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400',
            'refunded': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400',
            'rejected': 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
        };
        return badges[status] || 'bg-gray-100 text-gray-800';
    }, []);

    const getStatusIcon = useCallback((status) => {
        const icons = {
            'pending_pickup': <FiClock className="text-yellow-600" size={16} />,
            'pickup_scheduled': <FiCalendar className="text-blue-600" size={16} />,
            'picked_up': <FiPackage className="text-purple-600" size={16} />,
            'verified': <FiCheck className="text-green-600" size={16} />,
            'refund_processing': <FiLoader className="text-orange-600 animate-spin" size={16} />,
            'refunded': <FiDollarSign className="text-emerald-600" size={16} />,
            'rejected': <FiX className="text-red-600" size={16} />
        };
        return icons[status] || <FiClock className="text-gray-600" size={16} />;
    }, []);

    const formatPrice = useCallback((price) => {
        const numPrice = typeof price === 'number' && !isNaN(price) ? price : 0;
        return `${currencySymbol}${numPrice.toFixed(2)}`;
    }, [currencySymbol]);

    const formatDate = useCallback((dateString) => {
        if (!dateString) return 'N/A';
        try {
            return new Date(dateString).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch {
            return 'N/A';
        }
    }, []);

    // ============================================================
    // Update return status
    // ============================================================
    const updateReturnStatus = useCallback(async (returnId, newStatus, refundData = null) => {
        if (updating === returnId) {
            console.log('⏳ Already updating this return');
            return;
        }

        if (!isMountedRef.current) return;

        setUpdating(returnId);

        try {
            const now = new Date().toISOString();

            const updatedReturns = returnRequests.map(record => {
                const recordId = record.id || record._id;
                if (String(recordId) !== String(returnId)) return record;

                const updated = {
                    ...record,
                    id: String(recordId || returnId),
                    status: newStatus,
                    updatedAt: now
                };

                if (refundData) {
                    updated.refundAmount = Number(refundData.amount) || Number(record.refundAmount) || 0;
                    updated.adminRefundMethod = refundData.method;
                    updated.refundNote = refundData.note;
                    updated.refundDate = now;
                }

                if (newStatus === "refunded") {
                    updated.refundCompletedAt = now;
                }

                const history = Array.isArray(record.trackingHistory) ? [...record.trackingHistory] : [];
                history.push({
                    stage: newStatus,
                    timestamp: now,
                    message: getStatusMessage(newStatus, refundData)
                });
                updated.trackingHistory = history.slice(-20);

                return updated;
            });

            const updatedRecord = updatedReturns.find(record =>
                String(record.id || record._id) === String(returnId)
            );

            if (!updatedRecord) {
                throw new Error("Return request not found");
            }

            setReturnRequests(updatedReturns);

            // Save to IndexedDB in background
            putReturnRecord(updatedRecord).catch(() => {});
            saveCompactReturnsToLocalStorage(updatedReturns);

            // Try to update backend
            const token = getToken();
            if (token) {
                try {
                    await debouncedFetch(
                        `${API_URL}/returns/${returnId}/status`,
                        {
                            method: "PUT",
                            headers: {
                                "Content-Type": "application/json",
                                "Authorization": `Bearer ${token}`
                            },
                            body: JSON.stringify({ status: newStatus, refundData })
                        },
                        10000
                    );
                } catch (apiError) {
                    if (!apiError.message?.includes('Rate limit')) {
                        console.warn("Backend update failed; local store is updated:", apiError);
                    }
                }
            }

            setShowRefundModal(false);
            toast.success(`Return ${getStatusLabel(newStatus)} successfully`);

            window.dispatchEvent(new CustomEvent("returnsUpdated", {
                detail: { returnId: String(returnId), status: newStatus, returnRequest: updatedRecord }
            }));

        } catch (error) {
            console.error("Error updating return status:", error);
            toast.error(error?.message || "Failed to update return status");
        } finally {
            if (isMountedRef.current) {
                setUpdating(null);
            }
        }
    }, [returnRequests, getToken, getStatusLabel, saveCompactReturnsToLocalStorage]);

    const getStatusMessage = useCallback((status, refundData) => {
        const messages = {
            'pending_pickup': 'Return request submitted. Awaiting pickup.',
            'pickup_scheduled': 'Pickup scheduled with driver.',
            'picked_up': 'Item has been collected by driver.',
            'verified': 'Item verified at warehouse.',
            'refund_processing': `Refund processing started${refundData ? ` via ${refundData.method}` : ''}.`,
            'refunded': `Refund completed${refundData ? ` via ${refundData.method}` : ''}.`,
            'rejected': 'Return request rejected.'
        };
        return messages[status] || `Status updated to ${status}`;
    }, []);

    // ============================================================
    // View return details
    // ============================================================
    const viewReturnDetails = useCallback((returnRequest) => {
        setSelectedReturn(returnRequest);
        setShowDetailsModal(true);
    }, []);

    // ============================================================
    // Open refund modal
    // ============================================================
    const openRefundModal = useCallback((returnRequest) => {
        setSelectedReturn(returnRequest);
        setRefundAmount(returnRequest.refundAmount || 0);
        setRefundNote("");
        setRefundMethod("bank_transfer");
        setShowRefundModal(true);
    }, []);

    // ============================================================
    // Handle refund
    // ============================================================
    const handleRefund = useCallback(async () => {
        if (!selectedReturn) return;
        
        if (refundAmount <= 0) {
            toast.error("Please enter a valid refund amount");
            return;
        }

        setProcessingRefund(true);
        
        try {
            const refundData = {
                amount: refundAmount,
                method: refundMethod,
                note: refundNote || "Refund processed by admin",
                date: new Date().toISOString()
            };
            
            await updateReturnStatus(selectedReturn.id || selectedReturn._id, 'refunded', refundData);
        } catch (error) {
            console.error("Error processing refund:", error);
            toast.error("Failed to process refund");
        } finally {
            setProcessingRefund(false);
            setShowRefundModal(false);
        }
    }, [selectedReturn, refundAmount, refundMethod, refundNote, updateReturnStatus]);

    // ============================================================
    // Export returns
    // ============================================================
    const exportReturns = useCallback(() => {
        if (filteredRequests.length === 0) {
            toast.error("No returns to export");
            return;
        }

        const headers = ['Return ID', 'Order ID', 'Product', 'Customer', 'Email', 'Refund Amount', 'Status', 'Date'];
        const rows = filteredRequests.map(r => [
            r.id || r._id || 'N/A',
            r.orderId || 'N/A',
            r.productName || 'N/A',
            r.userName || 'N/A',
            r.userEmail || 'N/A',
            r.refundAmount || 0,
            getStatusLabel(r.status),
            formatDate(r.date || r.createdAt)
        ]);

        const csv = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `returns_${new Date().toISOString().slice(0,10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("Returns exported successfully");
    }, [filteredRequests, getStatusLabel, formatDate]);

    // ============================================================
    // Refresh handler
    // ============================================================
    const handleRefresh = useCallback(() => {
        loadedRef.current = false;
        loadReturnRequests(true);
    }, [loadReturnRequests]);

    // ============================================================
    // Loading state
    // ============================================================
    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    // ============================================================
    // Render
    // ============================================================
    return (
        <div style={{ fontFamily: "'Times New Roman', Times, serif" }}>
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold dark:text-white">Return Management</h1>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">Manage customer return requests and refunds</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={exportReturns}
                        className="bg-gray-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-gray-700 transition-colors"
                    >
                        <FiDownload size={16} /> Export
                    </button>
                    <button
                        onClick={handleRefresh}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-colors"
                    >
                        <FiRefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh
                    </button>
                </div>
            </div>

            {/* Stats Cards - memoized */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 mb-6">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-3 text-center">
                    <p className="text-xs text-gray-500">Total</p>
                    <p className="text-xl font-bold dark:text-white">{stats.total}</p>
                </div>
                <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg shadow p-3 text-center">
                    <p className="text-xs text-yellow-600">Pending</p>
                    <p className="text-xl font-bold text-yellow-700">{stats.pending}</p>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg shadow p-3 text-center">
                    <p className="text-xs text-blue-600">Scheduled</p>
                    <p className="text-xl font-bold text-blue-700">{stats.pickupScheduled}</p>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg shadow p-3 text-center">
                    <p className="text-xs text-purple-600">Picked Up</p>
                    <p className="text-xl font-bold text-purple-700">{stats.pickedUp}</p>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg shadow p-3 text-center">
                    <p className="text-xs text-green-600">Verified</p>
                    <p className="text-xl font-bold text-green-700">{stats.verified}</p>
                </div>
                <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg shadow p-3 text-center">
                    <p className="text-xs text-orange-600">Refunding</p>
                    <p className="text-xl font-bold text-orange-700">{stats.refundProcessing}</p>
                </div>
                <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg shadow p-3 text-center">
                    <p className="text-xs text-emerald-600">Refunded</p>
                    <p className="text-xl font-bold text-emerald-700">{stats.refunded}</p>
                </div>
                <div className="bg-gradient-to-r from-emerald-600 to-green-600 rounded-lg shadow p-3 text-white text-center">
                    <p className="text-xs opacity-90">Total Refunds</p>
                    <p className="text-xl font-bold">{formatPrice(stats.totalRefundAmount)}</p>
                </div>
            </div>

            {/* Search and Filters */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6">
                <div className="flex flex-wrap gap-4">
                    <div className="flex-1 relative">
                        <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by product, customer, order ID..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            style={{ fontFamily: "'Times New Roman', Times, serif" }}
                        />
                    </div>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                        style={{ fontFamily: "'Times New Roman', Times, serif" }}
                    >
                        <option value="all">All Status</option>
                        <option value="pending_pickup">Pending Pickup</option>
                        <option value="pickup_scheduled">Pickup Scheduled</option>
                        <option value="picked_up">Picked Up</option>
                        <option value="verified">Verified</option>
                        <option value="refund_processing">Refund Processing</option>
                        <option value="refunded">Refunded</option>
                        <option value="rejected">Rejected</option>
                    </select>
                </div>
            </div>

            {/* Returns Table */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                {filteredRequests.length === 0 ? (
                    <div className="text-center py-12">
                        <FiShield className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold dark:text-white">No return requests found</h3>
                        <p className="text-gray-500">Return requests will appear here when customers request returns</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 dark:bg-gray-700">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Return ID</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Product</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Customer</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Refund</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Status</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Date</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredRequests.map((returnReq) => (
                                    <tr key={returnReq.id || returnReq._id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                        <td className="px-4 py-3">
                                            <span className="font-mono text-sm font-semibold dark:text-white">
                                                #{String(returnReq.id || returnReq._id).slice(-8)}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                {returnReq.productImage && (
                                                    <img
                                                        src={returnReq.productImage}
                                                        alt={returnReq.productName}
                                                        className="w-10 h-10 object-cover rounded-lg"
                                                    />
                                                )}
                                                <span className="text-sm font-medium dark:text-white line-clamp-1">
                                                    {returnReq.productName}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div>
                                                <p className="text-sm font-medium dark:text-white">{returnReq.userName || 'Customer'}</p>
                                                <p className="text-xs text-gray-500">{returnReq.userEmail}</p>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <p className="text-sm font-semibold text-green-600">
                                                {formatPrice(returnReq.refundAmount)}
                                            </p>
                                            {returnReq.refundMethod && (
                                                <p className="text-xs text-gray-500">
                                                    {typeof returnReq.refundMethod === "object"
                                                        ? (returnReq.refundMethod.method || returnReq.refundMethod.type || "N/A")
                                                        : returnReq.refundMethod}
                                                </p>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                {getStatusIcon(returnReq.status)}
                                                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusBadge(returnReq.status)}`}>
                                                    {getStatusLabel(returnReq.status)}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                                            {formatDate(returnReq.date || returnReq.createdAt)}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => viewReturnDetails(returnReq)}
                                                    className="text-blue-600 hover:text-blue-800 p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                                                    title="View Details"
                                                >
                                                    <FiEye size={18} />
                                                </button>
                                                {returnReq.status === 'verified' && (
                                                    <button
                                                        onClick={() => openRefundModal(returnReq)}
                                                        className="text-emerald-600 hover:text-emerald-800 p-1.5 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors"
                                                        title="Process Refund"
                                                    >
                                                        <FiDollarSign size={18} />
                                                    </button>
                                                )}
                                                {returnReq.status === 'pending_pickup' && (
                                                    <button
                                                        onClick={() => updateReturnStatus(returnReq.id || returnReq._id, 'pickup_scheduled')}
                                                        disabled={updating === (returnReq.id || returnReq._id)}
                                                        className="text-blue-600 hover:text-blue-800 p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                                                        title="Schedule Pickup"
                                                    >
                                                        {updating === (returnReq.id || returnReq._id) ? 
                                                            <FiLoader className="animate-spin" size={18} /> : 
                                                            <FiCalendar size={18} />
                                                        }
                                                    </button>
                                                )}
                                                {returnReq.status === 'pickup_scheduled' && (
                                                    <button
                                                        onClick={() => updateReturnStatus(returnReq.id || returnReq._id, 'picked_up')}
                                                        disabled={updating === (returnReq.id || returnReq._id)}
                                                        className="text-purple-600 hover:text-purple-800 p-1.5 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors"
                                                        title="Mark as Picked Up"
                                                    >
                                                        {updating === (returnReq.id || returnReq._id) ? 
                                                            <FiLoader className="animate-spin" size={18} /> : 
                                                            <FiPackage size={18} />
                                                        }
                                                    </button>
                                                )}
                                                {returnReq.status === 'picked_up' && (
                                                    <button
                                                        onClick={() => updateReturnStatus(returnReq.id || returnReq._id, 'verified')}
                                                        disabled={updating === (returnReq.id || returnReq._id)}
                                                        className="text-green-600 hover:text-green-800 p-1.5 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
                                                        title="Verify Item"
                                                    >
                                                        {updating === (returnReq.id || returnReq._id) ? 
                                                            <FiLoader className="animate-spin" size={18} /> : 
                                                            <FiCheck size={18} />
                                                        }
                                                    </button>
                                                )}
                                                {returnReq.status === 'refund_processing' && (
                                                    <button
                                                        onClick={() => updateReturnStatus(returnReq.id || returnReq._id, 'refunded')}
                                                        disabled={updating === (returnReq.id || returnReq._id)}
                                                        className="text-emerald-600 hover:text-emerald-800 p-1.5 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors"
                                                        title="Complete Refund"
                                                    >
                                                        {updating === (returnReq.id || returnReq._id) ? 
                                                            <FiLoader className="animate-spin" size={18} /> : 
                                                            <FiDollarSign size={18} />
                                                        }
                                                    </button>
                                                )}
                                                {returnReq.status !== 'rejected' && returnReq.status !== 'refunded' && (
                                                    <button
                                                        onClick={() => {
                                                            if (window.confirm("Reject this return request?")) {
                                                                updateReturnStatus(returnReq.id || returnReq._id, 'rejected');
                                                            }
                                                        }}
                                                        disabled={updating === (returnReq.id || returnReq._id)}
                                                        className="text-red-600 hover:text-red-800 p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                                        title="Reject Return"
                                                    >
                                                        {updating === (returnReq.id || returnReq._id) ? 
                                                            <FiLoader className="animate-spin" size={18} /> : 
                                                            <FiX size={18} />
                                                        }
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Return Details Modal */}
            <AnimatePresence>
                {showDetailsModal && selectedReturn && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={() => setShowDetailsModal(false)}>
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            transition={{ duration: 0.2 }}
                            className="bg-white dark:bg-gray-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex justify-between items-center mb-4 sticky top-0 bg-white dark:bg-gray-800 pb-2 border-b dark:border-gray-700">
                                <h2 className="text-2xl font-bold dark:text-white">Return Details</h2>
                                <button onClick={() => setShowDetailsModal(false)} className="text-gray-500 hover:text-gray-700 text-2xl">
                                    <FiX size={24} />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-xs text-gray-500">Return ID</p>
                                        <p className="font-mono font-semibold dark:text-white">
                                            #{String(selectedReturn.id || selectedReturn._id).slice(-8)}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500">Order ID</p>
                                        <p className="font-mono font-semibold dark:text-white">
                                            {selectedReturn.orderId || 'N/A'}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500">Status</p>
                                        <div className="flex items-center gap-2">
                                            {getStatusIcon(selectedReturn.status)}
                                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusBadge(selectedReturn.status)}`}>
                                                {getStatusLabel(selectedReturn.status)}
                                            </span>
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500">Date</p>
                                        <p className="font-semibold dark:text-white">
                                            {formatDate(selectedReturn.date || selectedReturn.createdAt)}
                                        </p>
                                    </div>
                                </div>

                                <div className="border-t dark:border-gray-700 pt-4">
                                    <h3 className="font-semibold mb-2 dark:text-white">Product Information</h3>
                                    <div className="flex gap-4">
                                        {selectedReturn.productImage && (
                                            <img
                                                src={selectedReturn.productImage}
                                                alt={selectedReturn.productName}
                                                className="w-24 h-24 object-cover rounded-lg"
                                            />
                                        )}
                                        <div>
                                            <p className="font-medium dark:text-white">{selectedReturn.productName}</p>
                                            <p className="text-sm text-gray-500">Quantity: {selectedReturn.productQuantity || 1}</p>
                                            <p className="text-sm text-gray-500">Price: {formatPrice(selectedReturn.productPrice)}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="border-t dark:border-gray-700 pt-4">
                                    <h3 className="font-semibold mb-2 dark:text-white">Customer Information</h3>
                                    <p className="dark:text-white">{selectedReturn.userName || 'Customer'}</p>
                                    <p className="text-sm text-gray-500">{selectedReturn.userEmail}</p>
                                    {selectedReturn.pickupAddress && (
                                        <p className="text-sm text-gray-500 flex items-start gap-1 mt-1">
                                            <FiMapPin className="mt-0.5" size={14} />
                                            {selectedReturn.pickupAddress}
                                        </p>
                                    )}
                                </div>

                                <div className="border-t dark:border-gray-700 pt-4">
                                    <h3 className="font-semibold mb-2 dark:text-white">Return Details</h3>
                                    <p><span className="text-sm text-gray-500">Reason:</span> {selectedReturn.reason}</p>
                                    {selectedReturn.comment && (
                                        <p className="mt-1"><span className="text-sm text-gray-500">Comment:</span> {selectedReturn.comment}</p>
                                    )}
                                </div>

                                <div className="border-t dark:border-gray-700 pt-4">
                                    <h3 className="font-semibold mb-2 dark:text-white">Refund Details</h3>
                                    <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-xl">
                                        <div className="flex justify-between">
                                            <span>Refund Amount:</span>
                                            <span className="font-bold text-green-600">{formatPrice(selectedReturn.refundAmount)}</span>
                                        </div>
                                        {selectedReturn.refundMethod && (
                                            <div className="flex justify-between mt-1">
                                                <span>Method:</span>
                                                <span className="font-medium">
                                                    {typeof selectedReturn.refundMethod === "object"
                                                        ? (selectedReturn.refundMethod.method || selectedReturn.refundMethod.type || "N/A")
                                                        : selectedReturn.refundMethod}
                                                </span>
                                            </div>
                                        )}
                                        {selectedReturn.refundMethod?.bankName && (
                                            <div className="flex justify-between mt-1 text-sm text-gray-500">
                                                <span>Bank:</span>
                                                <span>{selectedReturn.refundMethod.bankName}</span>
                                            </div>
                                        )}
                                        {selectedReturn.refundMethod?.accountHolderName && (
                                            <div className="flex justify-between mt-1 text-sm text-gray-500">
                                                <span>Account Holder:</span>
                                                <span className="font-medium text-gray-900 dark:text-white">
                                                    {selectedReturn.refundMethod.accountHolderName}
                                                </span>
                                            </div>
                                        )}
                                        {selectedReturn.refundMethod?.bankBranch && (
                                            <div className="flex justify-between mt-1 text-sm text-gray-500">
                                                <span>Branch / Sort Code:</span>
                                                <span className="font-medium text-gray-900 dark:text-white">
                                                    {selectedReturn.refundMethod.bankBranch}
                                                </span>
                                            </div>
                                        )}
                                        {selectedReturn.refundMethod?.accountNumber && (
                                            <div className="flex justify-between mt-1 text-sm text-gray-500">
                                                <span>Account:</span>
                                                <span className="font-mono font-semibold text-gray-900 dark:text-white">
                                                    {selectedReturn.refundMethod.accountNumber}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="border-t dark:border-gray-700 pt-4 flex gap-3">
                                    {selectedReturn.status === 'verified' && (
                                        <button
                                            onClick={() => {
                                                setShowDetailsModal(false);
                                                openRefundModal(selectedReturn);
                                            }}
                                            className="flex-1 bg-emerald-600 text-white py-2 rounded-lg font-semibold hover:bg-emerald-700 transition-all"
                                        >
                                            Process Refund
                                        </button>
                                    )}
                                    <button
                                        onClick={() => setShowDetailsModal(false)}
                                        className="flex-1 bg-gray-500 text-white py-2 rounded-lg font-semibold hover:bg-gray-600 transition-all"
                                    >
                                        Close
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Refund Modal */}
            <AnimatePresence>
                {showRefundModal && selectedReturn && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={() => setShowRefundModal(false)}>
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            transition={{ duration: 0.2 }}
                            className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-2xl font-bold dark:text-white">Process Refund</h2>
                                <button onClick={() => setShowRefundModal(false)} className="text-gray-500 hover:text-gray-700">
                                    <FiX size={24} />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <p className="text-sm text-gray-500">Product</p>
                                    <p className="font-medium dark:text-white">{selectedReturn.productName}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Customer</p>
                                    <p className="font-medium dark:text-white">{selectedReturn.userName || 'Customer'}</p>
                                    <p className="text-sm text-gray-500">{selectedReturn.userEmail}</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1 dark:text-white">Refund Amount *</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">{currencySymbol}</span>
                                        <input
                                            type="number"
                                            value={refundAmount}
                                            onChange={(e) => setRefundAmount(parseFloat(e.target.value) || 0)}
                                            min="0"
                                            max={selectedReturn.refundAmount}
                                            step="0.01"
                                            className="w-full pl-8 pr-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                                            style={{ fontFamily: "'Times New Roman', Times, serif" }}
                                        />
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">Max refund: {formatPrice(selectedReturn.refundAmount)}</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1 dark:text-white">Refund Method</label>
                                    <select
                                        value={refundMethod}
                                        onChange={(e) => setRefundMethod(e.target.value)}
                                        className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                                        style={{ fontFamily: "'Times New Roman', Times, serif" }}
                                    >
                                        <option value="bank_transfer">Bank Transfer</option>
                                        <option value="shop_pickup">Shop Pickup</option>
                                        <option value="original_payment">Original Payment Method</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1 dark:text-white">Refund Note (Optional)</label>
                                    <textarea
                                        value={refundNote}
                                        onChange={(e) => setRefundNote(e.target.value)}
                                        rows="3"
                                        placeholder="Add a note about this refund..."
                                        className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 resize-none"
                                        style={{ fontFamily: "'Times New Roman', Times, serif" }}
                                    />
                                </div>
                                <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg">
                                    <p className="text-sm text-yellow-800 dark:text-yellow-200 flex items-start gap-2">
                                        <FiAlertCircle className="mt-0.5 flex-shrink-0" size={16} />
                                        This action will mark the return as refunded and notify the customer.
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-3 mt-6">
                                <button
                                    onClick={() => setShowRefundModal(false)}
                                    className="flex-1 bg-gray-500 text-white py-2 rounded-lg font-semibold hover:bg-gray-600 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleRefund}
                                    disabled={processingRefund || refundAmount <= 0}
                                    className="flex-1 bg-emerald-600 text-white py-2 rounded-lg font-semibold hover:bg-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {processingRefund ? (
                                        <>
                                            <FiLoader className="animate-spin" size={16} />
                                            Processing...
                                        </>
                                    ) : (
                                        <>
                                            <FiDollarSign size={16} />
                                            Process Refund
                                        </>
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ReturnManagement;