// src/context/SiteContext.jsx
import React, { createContext, useState, useContext, useEffect, useRef } from 'react';

const SiteContext = createContext();

export const useSite = () => useContext(SiteContext);

export const SiteProvider = ({ children }) => {
    const [siteInfo, setSiteInfo] = useState({
        siteName: 'Zamed',
        logo: null,
        favicon: null,
        currency: 'USD',
        currencySymbol: '$'
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const pollingIntervalRef = useRef(null);
    const isMountedRef = useRef(true);

    const loadSiteInfo = () => {
        try {
            // Load from localStorage only (no API polling)
            const siteSettings = JSON.parse(localStorage.getItem('site_settings') || '{}');
            const siteInfoData = JSON.parse(localStorage.getItem('site_info') || '{}');
            
            const symbols = { USD: "$", EUR: "€", GBP: "£", LKR: "Rs" };
            const currency = siteSettings.currency || siteInfoData.currency || "USD";
            
            const newSiteInfo = {
                siteName: siteInfoData.siteName || siteSettings.siteName || "Zamed",
                logo: siteInfoData.logo || siteSettings.logo || null,
                favicon: siteInfoData.favicon || siteSettings.favicon || null,
                heroImage: siteInfoData.heroImage || siteSettings.heroImage || null,
                heroTitle: siteInfoData.heroTitle || siteSettings.heroTitle || "Style That Defines You",
                heroSubtitle: siteInfoData.heroSubtitle || siteSettings.heroSubtitle || "Discover the latest trends",
                slides: siteInfoData.slides || siteSettings.slides || [],
                socialLinks: siteInfoData.socialLinks || {
                    facebook: "", instagram: "", twitter: "", youtube: "", linkedin: ""
                },
                currency: currency,
                currencySymbol: symbols[currency] || "$"
            };
            
            if (isMountedRef.current) {
                setSiteInfo(newSiteInfo);
                setError(null);
            }
            
            // Update favicon if exists
            if (newSiteInfo.favicon && isMountedRef.current) {
                updateFavicon(newSiteInfo.favicon);
            }
            
        } catch (err) {
            console.error("Error loading site info:", err);
            if (isMountedRef.current) {
                setError(err.message);
            }
        } finally {
            if (isMountedRef.current) {
                setLoading(false);
            }
        }
    };

    const updateFavicon = (faviconUrl) => {
        if (!faviconUrl) return;
        
        let link = document.querySelector("link[rel*='icon']");
        if (!link) {
            link = document.createElement('link');
            link.rel = 'shortcut icon';
            document.head.appendChild(link);
        }
        link.href = faviconUrl;
    };

    // Listen for storage events (cross-tab synchronization)
    useEffect(() => {
        isMountedRef.current = true;
        
        // Initial load
        loadSiteInfo();
        
        // Listen for storage changes from other tabs
        const handleStorageChange = (e) => {
            if (e.key === 'site_settings' || e.key === 'site_info') {
                console.log("Storage changed, reloading site info");
                loadSiteInfo();
            }
        };
        
        // Listen for custom events from admin panel
        const handleSettingsSaved = () => {
            console.log("Settings saved, reloading site info");
            loadSiteInfo();
        };
        
        const handleCurrencyChanged = (event) => {
            if (event.detail) {
                setSiteInfo(prev => ({
                    ...prev,
                    currency: event.detail.currency,
                    currencySymbol: event.detail.symbol
                }));
            } else {
                loadSiteInfo();
            }
        };
        
        window.addEventListener('storage', handleStorageChange);
        window.addEventListener('settingsSaved', handleSettingsSaved);
        window.addEventListener('siteInfoUpdated', handleSettingsSaved);
        window.addEventListener('currencyChanged', handleCurrencyChanged);
        
        // Cleanup
        return () => {
            isMountedRef.current = false;
            if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
            }
            window.removeEventListener('storage', handleStorageChange);
            window.removeEventListener('settingsSaved', handleSettingsSaved);
            window.removeEventListener('siteInfoUpdated', handleSettingsSaved);
            window.removeEventListener('currencyChanged', handleCurrencyChanged);
        };
    }, []);

    const value = {
        siteInfo,
        loading,
        error,
        refreshSiteInfo: loadSiteInfo
    };

    return (
        <SiteContext.Provider value={value}>
            {children}
        </SiteContext.Provider>
    );
};

export default SiteContext;