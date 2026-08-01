// src/context/SiteContext.jsx
import React, { createContext, useState, useContext, useEffect, useRef } from 'react';

// IndexedDB helper
const ImageStorage = {
    dbName: 'ZamedImageStore',
    storeName: 'images',
    db: null,
    initialized: false,
    initPromise: null,

    async init() {
        if (this.initPromise) return this.initPromise;
        if (this.initialized && this.db) return this.db;

        this.initPromise = new Promise((resolve, reject) => {
            try {
                const request = indexedDB.open(this.dbName, 1);
                
                request.onupgradeneeded = (event) => {
                    const db = event.target.result;
                    if (!db.objectStoreNames.contains(this.storeName)) {
                        const store = db.createObjectStore(this.storeName, { keyPath: 'id' });
                        store.createIndex('type', 'type', { unique: false });
                        store.createIndex('timestamp', 'timestamp', { unique: false });
                    }
                    this.initialized = true;
                    this.db = db;
                };
                
                request.onsuccess = (event) => {
                    this.db = event.target.result;
                    this.initialized = true;
                    this.db.onclose = () => {
                        this.initialized = false;
                        this.db = null;
                        this.initPromise = null;
                    };
                    this.initPromise = null;
                    resolve(this.db);
                };
                
                request.onerror = (event) => {
                    console.warn('IndexedDB init failed:', event.target.error);
                    this.initialized = false;
                    this.db = null;
                    this.initPromise = null;
                    reject(event.target.error);
                };
            } catch (error) {
                this.initPromise = null;
                reject(error);
            }
        });

        return this.initPromise;
    },

    async ensureInitialized() {
        if (!this.initialized || !this.db) {
            await this.init();
        }
        return this.db;
    },

    async getImage(id) {
        if (!id) return null;
        try {
            const db = await this.ensureInitialized();
            if (!db) return null;
            
            return new Promise((resolve, reject) => {
                try {
                    const transaction = db.transaction([this.storeName], 'readonly');
                    const store = transaction.objectStore(this.storeName);
                    const request = store.get(id);
                    
                    request.onsuccess = () => resolve(request.result ? request.result.data : null);
                    request.onerror = () => reject(request.error);
                } catch (error) {
                    reject(error);
                }
            });
        } catch (error) {
            console.warn('Error getting image from IndexedDB:', error);
            return null;
        }
    },

    async getImagesByType(type) {
        try {
            const db = await this.ensureInitialized();
            if (!db) return [];
            
            return new Promise((resolve, reject) => {
                const transaction = db.transaction([this.storeName], 'readonly');
                const store = transaction.objectStore(this.storeName);
                const index = store.index('type');
                const request = index.getAll(type);
                
                request.onsuccess = () => resolve(request.result || []);
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.warn('Error getting images by type:', error);
            return [];
        }
    }
};

const SiteContext = createContext();

export const useSite = () => useContext(SiteContext);

export const SiteProvider = ({ children }) => {
    const [siteInfo, setSiteInfo] = useState({
        siteName: 'Zamed',
        logo: null,
        favicon: null,
        heroImage: null,
        currency: 'USD',
        currencySymbol: '$',
        slides: [],
        socialLinks: {},
        fontSettings: {}
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const isMountedRef = useRef(true);

    const loadSiteInfo = async () => {
        try {
            console.log('🔄 SiteContext: Loading site info...');
            
            // Load from localStorage
            const siteSettings = JSON.parse(localStorage.getItem('site_settings') || '{}');
            const siteInfoData = JSON.parse(localStorage.getItem('site_info') || '{}');
            const savedImages = JSON.parse(localStorage.getItem('site_images') || '{}');
            
            console.log('📦 siteInfoData:', siteInfoData);
            console.log('📦 savedImages:', savedImages);

            // Get currency
            const symbols = { USD: "$", EUR: "€", GBP: "£", LKR: "Rs" };
            const currency = siteSettings.currency || siteInfoData.currency || "USD";
            
            // Build site info object
            const newSiteInfo = {
                siteName: siteInfoData.siteName || siteSettings.siteName || "Zamed",
                logo: null,
                favicon: null,
                heroImage: null,
                heroTitle: siteInfoData.heroTitle || siteSettings.heroTitle || "Style That Defines You",
                heroSubtitle: siteInfoData.heroSubtitle || siteSettings.heroSubtitle || "Discover the latest trends",
                heroButtonText: siteInfoData.heroButtonText || siteSettings.heroButtonText || "Shop Now",
                footerText: siteInfoData.footerText || siteSettings.footerText || "© 2025, Zamed Premium Wear. All rights reserved.",
                slides: [],
                socialLinks: {
                    facebook: siteInfoData.socialLinks?.facebook || siteSettings.facebookUrl || "",
                    instagram: siteInfoData.socialLinks?.instagram || siteSettings.instagramUrl || "",
                    twitter: siteInfoData.socialLinks?.twitter || siteSettings.twitterUrl || "",
                    youtube: siteInfoData.socialLinks?.youtube || siteSettings.youtubeUrl || "",
                    linkedin: siteInfoData.socialLinks?.linkedin || siteSettings.linkedinUrl || ""
                },
                fontSettings: {
                    primaryFont: siteInfoData.fontSettings?.primaryFont || siteSettings.primaryFont || "Inter",
                    headingFont: siteInfoData.fontSettings?.headingFont || siteSettings.headingFont || "Poppins",
                    bodyFont: siteInfoData.fontSettings?.bodyFont || siteSettings.bodyFont || "Inter",
                    fontScale: siteInfoData.fontSettings?.fontScale || siteSettings.fontScale || "medium"
                },
                currency: currency,
                currencySymbol: symbols[currency] || "$"
            };

            // --- LOAD LOGO ---
            if (siteInfoData.logoId) {
                try {
                    const imageData = await ImageStorage.getImage(siteInfoData.logoId);
                    if (imageData) {
                        newSiteInfo.logo = imageData;
                        console.log('✅ Logo loaded from IndexedDB');
                    }
                } catch (e) {
                    console.warn('Could not load logo from IndexedDB:', e);
                }
            }
            if (!newSiteInfo.logo && savedImages.logo) {
                newSiteInfo.logo = savedImages.logo;
                console.log('✅ Logo loaded from savedImages');
            }
            if (!newSiteInfo.logo && siteInfoData.logo) {
                newSiteInfo.logo = siteInfoData.logo;
            }

            // --- LOAD FAVICON ---
            if (siteInfoData.faviconId) {
                try {
                    const imageData = await ImageStorage.getImage(siteInfoData.faviconId);
                    if (imageData) {
                        newSiteInfo.favicon = imageData;
                        console.log('✅ Favicon loaded from IndexedDB');
                    }
                } catch (e) {
                    console.warn('Could not load favicon from IndexedDB:', e);
                }
            }
            if (!newSiteInfo.favicon && savedImages.favicon) {
                newSiteInfo.favicon = savedImages.favicon;
                console.log('✅ Favicon loaded from savedImages');
            }
            if (!newSiteInfo.favicon && siteInfoData.favicon) {
                newSiteInfo.favicon = siteInfoData.favicon;
            }

            // Update favicon in browser
            if (newSiteInfo.favicon) {
                updateFavicon(newSiteInfo.favicon);
            }

            // --- LOAD HERO IMAGE ---
            if (siteInfoData.heroImageId) {
                try {
                    const imageData = await ImageStorage.getImage(siteInfoData.heroImageId);
                    if (imageData) {
                        newSiteInfo.heroImage = imageData;
                        console.log('✅ Hero image loaded from IndexedDB');
                    }
                } catch (e) {
                    console.warn('Could not load hero image from IndexedDB:', e);
                }
            }
            if (!newSiteInfo.heroImage && savedImages.heroImage) {
                newSiteInfo.heroImage = savedImages.heroImage;
                console.log('✅ Hero image loaded from savedImages');
            }
            if (!newSiteInfo.heroImage && siteInfoData.heroImage) {
                newSiteInfo.heroImage = siteInfoData.heroImage;
            }

            // --- LOAD SLIDES ---
            let slidesData = siteInfoData.slides || siteSettings.slides || [];
            
            // If slides have imageIds, load from IndexedDB
            if (slidesData.length > 0) {
                const slidesWithImages = await Promise.all(slidesData.map(async (slide, index) => {
                    let imageData = slide.image || null;
                    
                    // Try to load from IndexedDB
                    if (slide.imageId) {
                        try {
                            const indexedImage = await ImageStorage.getImage(slide.imageId);
                            if (indexedImage) {
                                imageData = indexedImage;
                                console.log(`✅ Slide ${index} loaded from IndexedDB`);
                            }
                        } catch (e) {
                            console.warn(`Could not load slide ${index} from IndexedDB:`, e);
                        }
                    }
                    
                    // If still no image, check savedImages
                    if (!imageData && savedImages?.slides) {
                        const savedSlide = savedImages.slides.find(s => s.id === slide.id);
                        if (savedSlide && savedSlide.image) {
                            imageData = savedSlide.image;
                        }
                    }
                    
                    return {
                        ...slide,
                        image: imageData
                    };
                }));
                
                newSiteInfo.slides = slidesWithImages;
                console.log('✅ Slides loaded with images');
            }

            if (isMountedRef.current) {
                setSiteInfo(newSiteInfo);
                setError(null);
                console.log('✅ SiteInfo loaded successfully');
            }
            
        } catch (err) {
            console.error("❌ Error loading site info:", err);
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
        
        try {
            let link = document.querySelector("link[rel*='icon']");
            if (!link) {
                link = document.createElement('link');
                link.rel = 'shortcut icon';
                document.head.appendChild(link);
            }
            link.type = 'image/x-icon';
            link.href = faviconUrl;
            
            let appleLink = document.querySelector("link[rel='apple-touch-icon']");
            if (!appleLink) {
                appleLink = document.createElement('link');
                appleLink.rel = 'apple-touch-icon';
                document.head.appendChild(appleLink);
            }
            appleLink.href = faviconUrl;
            
            console.log('✅ Favicon updated in browser');
        } catch (error) {
            console.error('Error updating favicon:', error);
        }
    };

    // Initial load
    useEffect(() => {
        isMountedRef.current = true;
        loadSiteInfo();

        // Listen for storage changes
        const handleStorageChange = (e) => {
            if (e.key === 'site_settings' || e.key === 'site_info' || e.key === 'site_images') {
                console.log('🔄 Storage changed, reloading site info');
                loadSiteInfo();
            }
        };

        // Listen for custom events
        const handleSettingsSaved = () => {
            console.log('🔄 Settings saved, reloading site info');
            loadSiteInfo();
        };

        const handleSiteInfoUpdated = () => {
            console.log('🔄 Site info updated, reloading');
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
        window.addEventListener('siteInfoUpdated', handleSiteInfoUpdated);
        window.addEventListener('currencyChanged', handleCurrencyChanged);

        // Cleanup
        return () => {
            isMountedRef.current = false;
            window.removeEventListener('storage', handleStorageChange);
            window.removeEventListener('settingsSaved', handleSettingsSaved);
            window.removeEventListener('siteInfoUpdated', handleSiteInfoUpdated);
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