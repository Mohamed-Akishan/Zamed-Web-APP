import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';
import { toast } from 'sonner';

const AuthContext = createContext();

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [token, setToken] = useState(localStorage.getItem('token'));

    useEffect(() => {
        if (token) {
            loadUser();
        } else {
            setLoading(false);
        }
    }, [token]);

    const loadUser = async () => {
        try {
            const response = await authAPI.getProfile();
            setUser(response.user);
        } catch (error) {
            console.error('Failed to load user:', error);
            localStorage.removeItem('token');
            setToken(null);
        } finally {
            setLoading(false);
        }
    };

    const login = async (email, password) => {
        try {
            const response = await authAPI.login(email, password);
            localStorage.setItem('token', response.token);
            localStorage.setItem('user', JSON.stringify(response));
            setToken(response.token);
            setUser(response);
            toast.success(`Welcome back, ${response.firstName}!`);
            return { success: true, data: response };
        } catch (error) {
            toast.error(error.message);
            return { success: false, error: error.message };
        }
    };

    const register = async (userData) => {
        try {
            const response = await authAPI.register(userData);
            localStorage.setItem('token', response.token);
            localStorage.setItem('user', JSON.stringify(response));
            setToken(response.token);
            setUser(response);
            toast.success('Registration successful!');
            return { success: true, data: response };
        } catch (error) {
            toast.error(error.message);
            return { success: false, error: error.message };
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setToken(null);
        setUser(null);
        toast.success('Logged out successfully');
    };

    const updateProfile = async (profileData) => {
        try {
            const response = await authAPI.updateProfile(profileData);
            setUser(prev => ({ ...prev, ...response }));
            localStorage.setItem('user', JSON.stringify({ ...user, ...response }));
            toast.success('Profile updated successfully');
            return { success: true, data: response };
        } catch (error) {
            toast.error(error.message);
            return { success: false, error: error.message };
        }
    };

    return (
        <AuthContext.Provider value={{
            user,
            loading,
            isAuthenticated: !!user,
            login,
            register,
            logout,
            updateProfile
        }}>
            {children}
        </AuthContext.Provider>
    );
};