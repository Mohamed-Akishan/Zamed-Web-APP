// frontend/src/utils/api.js

// Get the correct API URL based on environment
export const getApiUrl = () => {
    // For Vercel deployment
    if (window.location.hostname.includes('vercel.app')) {
        return 'https://zamed-backend-1.onrender.com/api';
    }
    // For local development
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return 'http://localhost:5000/api';
    }
    // Fallback to environment variable
    return import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
};

export const API_URL = getApiUrl();

// Helper function for API calls with error handling
export const apiFetch = async (endpoint, options = {}) => {
    const url = `${API_URL}${endpoint}`;
    console.log(`📡 API Call: ${options.method || 'GET'} ${url}`);
    
    try {
        const response = await fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...(options.headers || {}),
            },
        });
        
        const data = await response.json().catch(() => ({}));
        
        if (!response.ok) {
            throw new Error(data.message || data.error || `API Error: ${response.status}`);
        }
        
        return data;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
};

export default API_URL;