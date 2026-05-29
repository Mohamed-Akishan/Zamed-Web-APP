const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Get token from localStorage
const getToken = () => localStorage.getItem('token');

// API request helper
const apiRequest = async (endpoint, options = {}) => {
    const token = getToken();
    const headers = {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...options.headers
    };
    
    const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers
    });
    
    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.message || 'Something went wrong');
    }
    return data;
};

// ============ AUTH APIs ============
export const authAPI = {
    register: (userData) => apiRequest('/auth/register', {
        method: 'POST',
        body: JSON.stringify(userData)
    }),
    login: (email, password) => apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
    }),
    getProfile: () => apiRequest('/auth/me'),
    updateProfile: (data) => apiRequest('/auth/profile', {
        method: 'PUT',
        body: JSON.stringify(data)
    })
};

// ============ PRODUCT APIs ============
export const productAPI = {
    getAll: (params = {}) => {
        const query = new URLSearchParams(params).toString();
        return apiRequest(`/products${query ? `?${query}` : ''}`);
    },
    getById: (id) => apiRequest(`/products/${id}`),
    getFeatured: () => apiRequest('/products/featured'),
    getNewArrivals: () => apiRequest('/products/new-arrivals'),
    getByGender: (gender) => apiRequest(`/products/gender/${gender}`),
    getByCategory: (category) => apiRequest(`/products/category/${category}`),
    search: (query) => apiRequest(`/products/search?q=${query}`),
    create: (productData) => apiRequest('/products', {
        method: 'POST',
        body: JSON.stringify(productData)
    }),
    update: (id, productData) => apiRequest(`/products/${id}`, {
        method: 'PUT',
        body: JSON.stringify(productData)
    }),
    delete: (id) => apiRequest(`/products/${id}`, {
        method: 'DELETE'
    })
};

// ============ ORDER APIs ============
export const orderAPI = {
    create: (orderData) => apiRequest('/orders', {
        method: 'POST',
        body: JSON.stringify(orderData)
    }),
    getMyOrders: () => apiRequest('/orders/my-orders'),
    getById: (id) => apiRequest(`/orders/${id}`),
    getAll: (params = {}) => {
        const query = new URLSearchParams(params).toString();
        return apiRequest(`/orders${query ? `?${query}` : ''}`);
    },
    cancel: (id, note) => apiRequest(`/orders/${id}/cancel`, {
        method: 'PUT',
        body: JSON.stringify({ note })
    }),
    updateStatus: (id, status, note) => apiRequest(`/orders/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status, note })
    })
};

// ============ USER APIs ============
export const userAPI = {
    getProfile: () => apiRequest('/users/profile'),
    getAll: () => apiRequest('/users'),
    getById: (id) => apiRequest(`/users/${id}`),
    updateRole: (id, role) => apiRequest(`/users/${id}/role`, {
        method: 'PUT',
        body: JSON.stringify({ role })
    }),
    addToFavorites: (productId) => apiRequest(`/users/favorites/${productId}`, {
        method: 'POST'
    }),
    removeFromFavorites: (productId) => apiRequest(`/users/favorites/${productId}`, {
        method: 'DELETE'
    }),
    addAddress: (address) => apiRequest('/users/addresses', {
        method: 'POST',
        body: JSON.stringify(address)
    }),
    deleteAddress: (addressId) => apiRequest(`/users/addresses/${addressId}`, {
        method: 'DELETE'
    }),
    setDefaultAddress: (addressId) => apiRequest(`/users/addresses/${addressId}/default`, {
        method: 'PUT'
    })
};

// ============ CATEGORY APIs ============
export const categoryAPI = {
    getAll: () => apiRequest('/categories'),
    getById: (id) => apiRequest(`/categories/${id}`),
    create: (categoryData) => apiRequest('/categories', {
        method: 'POST',
        body: JSON.stringify(categoryData)
    }),
    update: (id, categoryData) => apiRequest(`/categories/${id}`, {
        method: 'PUT',
        body: JSON.stringify(categoryData)
    }),
    delete: (id) => apiRequest(`/categories/${id}`, {
        method: 'DELETE'
    }),
    toggleStatus: (id) => apiRequest(`/categories/${id}/toggle`, {
        method: 'PATCH'
    })
};

// ============ REVIEW APIs ============
export const reviewAPI = {
    add: (productId, data) => apiRequest(`/reviews/${productId}`, {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    getProductReviews: (productId) => apiRequest(`/reviews/${productId}`),
    getMyReviews: () => apiRequest('/reviews/my/reviews'),
    getAllAdmin: () => apiRequest('/reviews/admin/all'),
    updateStatus: (reviewId, status) => apiRequest(`/reviews/${reviewId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status })
    }),
    delete: (reviewId) => apiRequest(`/reviews/${reviewId}`, {
        method: 'DELETE'
    })
};

// ============ RETURN APIs ============
export const returnAPI = {
    create: (returnData) => apiRequest('/returns', {
        method: 'POST',
        body: JSON.stringify(returnData)
    }),
    getMyReturns: () => apiRequest('/returns/my-returns'),
    getAll: () => apiRequest('/returns'),
    getById: (id) => apiRequest(`/returns/${id}`),
    updateStatus: (id, status, adminNote) => apiRequest(`/returns/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status, adminNote })
    })
};

// ============ DASHBOARD APIs ============
export const dashboardAPI = {
    getStats: () => apiRequest('/dashboard/stats'),
    getSalesChart: (days = 7) => apiRequest(`/dashboard/sales-chart?days=${days}`),
    getTopProducts: (limit = 10) => apiRequest(`/dashboard/top-products?limit=${limit}`)
};

// ============ UPLOAD APIs ============
export const uploadAPI = {
    uploadImage: async (imageData, filename) => {
        const token = getToken();
        const response = await fetch(`${API_URL}/upload/image`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ image: imageData, filename })
        });
        return response.json();
    },
    deleteImage: (filename) => apiRequest(`/upload/image/${filename}`, {
        method: 'DELETE'
    })
};

// ============ COUPON APIs ============
export const couponAPI = {
    getAll: () => apiRequest('/coupons'),
    getById: (id) => apiRequest(`/coupons/${id}`),
    create: (couponData) => apiRequest('/coupons', {
        method: 'POST',
        body: JSON.stringify(couponData)
    }),
    update: (id, couponData) => apiRequest(`/coupons/${id}`, {
        method: 'PUT',
        body: JSON.stringify(couponData)
    }),
    delete: (id) => apiRequest(`/coupons/${id}`, {
        method: 'DELETE'
    }),
    validate: (code) => apiRequest(`/coupons/validate/${code}`)
};

// ============ SETTINGS APIs ============
export const settingsAPI = {
    getSettings: () => apiRequest('/settings'),
    updateSettings: (settings) => apiRequest('/settings', {
        method: 'PUT',
        body: JSON.stringify(settings)
    }),
    getSiteInfo: () => apiRequest('/settings/site-info'),
    updateSiteInfo: (siteInfo) => apiRequest('/settings/site-info', {
        method: 'PUT',
        body: JSON.stringify(siteInfo)
    })
};

// Default export
export default {
    auth: authAPI,
    products: productAPI,
    orders: orderAPI,
    users: userAPI,
    categories: categoryAPI,
    reviews: reviewAPI,
    returns: returnAPI,
    dashboard: dashboardAPI,
    upload: uploadAPI,
    coupons: couponAPI,
    settings: settingsAPI
};