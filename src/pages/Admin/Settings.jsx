// src/pages/Admin/Settings.jsx
import { useState, useEffect, useRef } from "react";
import { 
    FiSave, FiGlobe, FiMail, FiCreditCard, FiTruck, FiShield, 
    FiBell, FiUser, FiImage, FiUpload, FiX, FiEdit2, FiRefreshCw,
    FiPlus, FiTrash2, FiAlertCircle, FiPackage, FiStar, FiInfo,
    FiHeart, FiLayout, FiType, FiMonitor, FiShoppingCart, FiSettings as FiSettingsIcon,
    FiFileText, FiList, FiTruck as FiTruckIcon, FiMapPin, FiPhone,
    FiTwitter, FiFacebook, FiInstagram, FiYoutube, FiLinkedin, FiCheck,
    FiDollarSign, FiDroplet, FiAlignLeft, FiBold, FiItalic, FiUnderline
} from "react-icons/fi";
import { toast } from "sonner";
import ImageCropper from "../../components/Admin/ImageCropper";

const API_URL =
  import.meta.env.VITE_API_URL ||
  (window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5000/api'
    : window.location.hostname.endsWith('.vercel.app')
      ? 'https://zamed-backend-1.onrender.com/api'
      : 'https://zamed-backend-1.onrender.com/api');

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // must match backend Multer limit
const isRemoteImage = (value) =>
    typeof value === 'string' && /^https?:\/\//i.test(value);
const IMAGE_TYPES = [
    'logo',
    'footerLogo',
    'favicon',
    'loginBackground',
    'registerBackground',
    'authSideImage',
    'loginPromoImage',
    'registerPromoImage'
];

const IMAGE_ID_FIELDS = IMAGE_TYPES.reduce((acc, type) => {
    acc[type] = `${type}Id`;
    return acc;
}, {});

const isHeroStorageType = (type = '') =>
    type === 'slide' ||
    type === 'heroImage' ||
    String(type).startsWith('slide_');


const PLACEHOLDER_IMAGE = "data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'%3E%3Crect width='200' height='200' fill='%23f3f4f6'/%3E%3Ctext x='50%25' y='50%25' font-family='sans-serif' font-size='14' fill='%239ca3af' text-anchor='middle' dominant-baseline='middle'%3ENo Image%3C/text%3E%3C/svg%3E";

const FONT_OPTIONS = [
    { value: "Inter", label: "Inter (Modern Sans)", category: "Sans-serif" },
    { value: "Poppins", label: "Poppins (Elegant)", category: "Sans-serif" },
    { value: "Roboto", label: "Roboto (Clean)", category: "Sans-serif" },
    { value: "Montserrat", label: "Montserrat (Bold)", category: "Sans-serif" },
    { value: "Open Sans", label: "Open Sans (Readable)", category: "Sans-serif" },
    { value: "Lato", label: "Lato (Professional)", category: "Sans-serif" },
    { value: "Playfair Display", label: "Playfair Display (Elegant Serif)", category: "Serif" },
    { value: "Merriweather", label: "Merriweather (Classic Serif)", category: "Serif" },
    { value: "Nunito", label: "Nunito (Friendly)", category: "Sans-serif" },
    { value: "Raleway", label: "Raleway (Stylish)", category: "Sans-serif" }
];

// IndexedDB helper
const ImageStorage = {
    dbName: 'ZamedImageStore',
    storeName: 'images',
    db: null,
    initialized: false,
    initPromise: null,

    createStore(db) {
        if (!db.objectStoreNames.contains(this.storeName)) {
            const store = db.createObjectStore(this.storeName, { keyPath: 'id' });
            store.createIndex('type', 'type', { unique: false });
            store.createIndex('timestamp', 'timestamp', { unique: false });
        }
    },

    async openCurrent() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName);

            request.onupgradeneeded = () => {
                this.createStore(request.result);
            };

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
            request.onblocked = () => {
                console.warn('IndexedDB is blocked by another tab. Close other ZAMED tabs and retry.');
            };
        });
    },

    async openUpgrade(version) {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, version);

            request.onupgradeneeded = () => {
                this.createStore(request.result);
            };

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
            request.onblocked = () => {
                console.warn('IndexedDB upgrade blocked by another tab.');
            };
        });
    },

    async init() {
        if (this.initialized && this.db) return this.db;
        if (this.initPromise) return this.initPromise;

        this.initPromise = (async () => {
            try {
                if (typeof indexedDB === 'undefined') {
                    throw new Error('IndexedDB is not supported in this browser.');
                }

                // Open the CURRENT database version. Never force v1/v2/v3.
                let db = await this.openCurrent();

                // Never delete an existing object store.
                // If the store is missing, upgrade current version + 1.
                if (!db.objectStoreNames.contains(this.storeName)) {
                    const nextVersion = db.version + 1;
                    db.close();
                    db = await this.openUpgrade(nextVersion);
                }

                if (!db.objectStoreNames.contains(this.storeName)) {
                    throw new Error(`Object store "${this.storeName}" is unavailable.`);
                }

                this.db = db;
                this.initialized = true;

                this.db.onversionchange = () => {
                    this.db?.close();
                    this.db = null;
                    this.initialized = false;
                    this.initPromise = null;
                };

                return this.db;
            } catch (error) {
                this.db = null;
                this.initialized = false;
                throw error;
            } finally {
                this.initPromise = null;
            }
        })();

        return this.initPromise;
    },

    async ensureInitialized() {
        try {
            if (!this.initialized || !this.db) {
                await this.init();
            }
            return this.db;
        } catch (error) {
            console.error('IndexedDB init failed:', error);
            return null;
        }
    },

    async saveImage(id, type, data, metadata = {}) {
        try {
            const db = await this.ensureInitialized();
            if (!db) return false;

            return await new Promise((resolve, reject) => {
                const transaction = db.transaction(this.storeName, 'readwrite');
                const store = transaction.objectStore(this.storeName);

                const request = store.put({
                    id: String(id),
                    type,
                    data,
                    timestamp: Date.now(),
                    ...metadata
                });

                request.onsuccess = () => resolve(true);
                request.onerror = () => reject(request.error);
                transaction.onerror = () => reject(transaction.error);
            });
        } catch (error) {
            console.error(`Failed to save ${type} image:`, error);
            return false;
        }
    },

    async getImage(id) {
        if (!id) return null;

        try {
            const db = await this.ensureInitialized();
            if (!db) return null;

            return await new Promise((resolve) => {
                const transaction = db.transaction(this.storeName, 'readonly');
                const request = transaction.objectStore(this.storeName).get(String(id));

                request.onsuccess = () => resolve(request.result?.data || null);
                request.onerror = () => resolve(null);
            });
        } catch (error) {
            console.warn('Failed to read image:', error);
            return null;
        }
    },

    async getRecord(id) {
        if (!id) return null;

        try {
            const db = await this.ensureInitialized();
            if (!db) return null;

            return await new Promise((resolve) => {
                const transaction = db.transaction(this.storeName, 'readonly');
                const request = transaction.objectStore(this.storeName).get(String(id));

                request.onsuccess = () => resolve(request.result || null);
                request.onerror = () => resolve(null);
            });
        } catch {
            return null;
        }
    },

    async deleteImage(id) {
        if (!id) return true;

        try {
            const db = await this.ensureInitialized();
            if (!db) return false;

            return await new Promise((resolve) => {
                const transaction = db.transaction(this.storeName, 'readwrite');
                const request = transaction.objectStore(this.storeName).delete(String(id));

                request.onsuccess = () => resolve(true);
                request.onerror = () => resolve(false);
            });
        } catch {
            return false;
        }
    },

    async getAllImages() {
        try {
            const db = await this.ensureInitialized();
            if (!db) return [];

            return await new Promise((resolve) => {
                const transaction = db.transaction(this.storeName, 'readonly');
                const request = transaction.objectStore(this.storeName).getAll();

                request.onsuccess = () => resolve(request.result || []);
                request.onerror = () => resolve([]);
            });
        } catch {
            return [];
        }
    }
};
const Settings = () => {
    const [settings, setSettings] = useState({
        siteName: "Zamed Premium Wear",
        siteEmail: "support@zamed.com",
        sitePhone: "+94 77 061 6154",
        siteAddress: "Colombo, Sri Lanka",
        currency: "USD",
        maintenanceMode: false,
        emailNotifications: true,
        orderNotifications: true,
        heroTitle: "Style That Defines You",
        heroSubtitle: "Discover the latest trends in fashion. Premium quality at affordable prices.",
        heroButtonText: "Shop Now",
        footerText: "© 2025, Zamed Premium Wear. All rights reserved.",
        facebookUrl: "https://facebook.com/zamed",
        instagramUrl: "https://instagram.com/zamed",
        twitterUrl: "https://twitter.com/zamed",
        youtubeUrl: "",
        linkedinUrl: "",
        logo: null,
        footerLogo: null,
        favicon: null,
        slides: [
            { id: 1, title: "Zamed Premium Collection", subtitle: "Discover the latest fashion trends", buttonText: "Shop Now", buttonLink: "/collections/all", image: null, color: "from-blue-600", active: true, order: 1 },
            { id: 2, title: "Men's Premium Collection", subtitle: "Elevate your style with our new arrivals", buttonText: "Explore Men", buttonLink: "/collections/men", image: null, color: "from-gray-800", active: true, order: 2 },
            { id: 3, title: "Women's Elegant Collection", subtitle: "Timeless pieces for every occasion", buttonText: "Explore Women", buttonLink: "/collections/women", image: null, color: "from-pink-600", active: true, order: 3 }
        ],
        productsPerRow: 4,
        showProductRatings: true,
        showProductColors: true,
        showProductSizes: true,
        showSaleBadge: true,
        showQuickAdd: true,
        showProductBrand: true,
        cardStyle: "rounded",
        imageHoverEffect: "scale",
        buttonStyle: "solid",
        buttonColor: "#1f2937",
        buttonHoverColor: "#374151",
        buttonTextColor: "#ffffff",
        buttonBorderRadius: "0.5rem",
        featuredTitle: "Featured Product",
        featuredSubtitle: "Our hand-picked selection just for you",
        featuredButtonText: "Shop Now",
        featuredButtonLink: "/collections/all",
        featuredBackgroundColor: "#ffffff",
        featuredProductStyle: "large",
        showRelatedProducts: true,
        relatedProductsCount: 4,
        showDeliveryInfo: true,
        showSizeGuide: true,
        showShareButtons: true,
        productDetailLayout: "grid",
        reviewSystemEnabled: true,
        deliveryInfoText: "Free delivery on orders over $100",
        returnPolicyText: "30-day easy returns",
        securePaymentText: "Secure payment",
        descriptionTabContent: "Premium quality product with excellent craftsmanship.",
        detailsTabContent: "• Material: Premium Quality Fabric\n• Care Instructions: Machine wash cold\n• Fit: Regular fit\n• Origin: Imported",
        shippingTabContent: "• Free shipping on orders over $100\n• Estimated delivery: 3-5 business days\n• Easy returns within 30 days",
        showCollectionBanner: true,
        showCollectionFilters: true,
        collectionSortEnabled: true,
        itemsPerPage: 12,
        enableAnimations: true,
        animationDuration: 0.5,
        hoverEffectEnabled: true,
        enableGuestCheckout: true,
        showOrderNotes: true,
        minimumOrderAmount: 0,
        enableCoupons: true,
        metaTitle: "Zamed Premium Wear - Premium Fashion Clothing",
        metaDescription: "Discover premium fashion for men, women, and kids. Shop the latest trends with free shipping available.",
        metaKeywords: "fashion, clothing, premium wear",
        enableSitemap: true,
        smtpHost: "", smtpPort: "", smtpUser: "", smtpPass: "", fromEmail: "", fromName: "",
        primaryFont: "Inter",
        headingFont: "Poppins",
        bodyFont: "Inter",
        fontScale: "medium",
        authEyebrow: "ZAMED PREMIUM",
        loginTitle: "Welcome Back",
        loginSubtitle: "Sign in to continue your premium shopping journey.",
        registerTitle: "Create Your Account",
        registerSubtitle: "Join ZAMED PREMIUM and unlock a better shopping experience.",
        authPrimaryColor: "#ff650f",
        authSecondaryColor: "#071b3f",
        authTextColor: "#ffffff",
        authUseSiteTypography: true,
        authHeadingFont: "Poppins",
        authBodyFont: "Inter",
        authTitleColor: "#081b3c",
        authSubtitleColor: "#64748b",
        authLabelColor: "#322b25",
        authInputTextColor: "#111827",
        authPlaceholderColor: "#94a3b8",
        authLinkColor: "#ff650f",
        authButtonTextColor: "#ffffff",
        authMutedTextColor: "#64748b",
        authOverlayOpacity: 62,
        authImagePosition: "center",
        showAuthBenefits: true,
        showGoogleLogin: true,
        showFacebookLogin: true,
        loginBackground: null,
        registerBackground: null,
        authSideImage: null,
        loginPromoImage: null,
        registerPromoImage: null,
        logoId: null,
        footerLogoId: null,
        faviconId: null,
        loginBackgroundId: null,
        registerBackgroundId: null,
        authSideImageId: null,
        loginPromoImageId: null,
        registerPromoImageId: null,
        slideImageIds: {}
    });

    const currencyOptions = [
        { code: "USD", symbol: "$", name: "US Dollar" },
        { code: "EUR", symbol: "€", name: "Euro" },
        { code: "GBP", symbol: "£", name: "British Pound" },
        { code: "LKR", symbol: "Rs", name: "Sri Lankan Rupee" }
    ];

    const fontScaleOptions = [
        { value: "small", label: "Small", scale: "0.875rem" },
        { value: "medium", label: "Medium", scale: "1rem" },
        { value: "large", label: "Large", scale: "1.125rem" },
        { value: "xlarge", label: "Extra Large", scale: "1.25rem" }
    ];

    const [imagePreviews, setImagePreviews] = useState({ 
        logo: null, 
        footerLogo: null, 
        favicon: null,
        loginBackground: null,
        registerBackground: null,
        authSideImage: null,
        loginPromoImage: null,
        registerPromoImage: null
    });
    const [slideImages, setSlideImages] = useState({});
    const [cropImage, setCropImage] = useState(null);
    const [cropType, setCropType] = useState(null);
    const [cropSlideId, setCropSlideId] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [lastSaved, setLastSaved] = useState(null);
    const [activeTab, setActiveTab] = useState("general");
    const [darkMode, setDarkMode] = useState(false);
    const [siteNameInput, setSiteNameInput] = useState("Zamed Premium Wear");
    const [uploading, setUploading] = useState(false);
    const [backendAvailable, setBackendAvailable] = useState(true);
    const [storageUsed, setStorageUsed] = useState(0);
    
    const logoInputRef = useRef(null);
    const footerLogoInputRef = useRef(null);
    const faviconInputRef = useRef(null);
    const loginBackgroundInputRef = useRef(null);
    const registerBackgroundInputRef = useRef(null);
    const authSideImageInputRef = useRef(null);
    const loginPromoImageInputRef = useRef(null);
    const registerPromoImageInputRef = useRef(null);
    const slideInputRefs = useRef({});

    const fileInputRefs = {
        logo: logoInputRef,
        footerLogo: footerLogoInputRef,
        favicon: faviconInputRef,
        loginBackground: loginBackgroundInputRef,
        registerBackground: registerBackgroundInputRef,
        authSideImage: authSideImageInputRef,
        loginPromoImage: loginPromoImageInputRef,
        registerPromoImage: registerPromoImageInputRef,
        slide: slideInputRefs.current
    };

    const getToken = () =>
        localStorage.getItem('token') || localStorage.getItem('authToken') || '';

    useEffect(() => {
        const checkDarkMode = () => {
            const isDark = document.documentElement.classList.contains('dark');
            setDarkMode(isDark);
        };
        checkDarkMode();
        
        ImageStorage.init().catch(console.warn);
        loadSettings();
    }, []);

    const checkStorageUsage = async () => {
        try {
            const images = await ImageStorage.getAllImages();
            let totalSize = 0;
            if (images && Array.isArray(images)) {
                images.forEach(img => {
                    if (img && img.data) {
                        totalSize += new Blob([img.data]).size;
                    }
                });
            }
            setStorageUsed(Math.round(totalSize / (1024 * 1024)));
        } catch (e) {
            setStorageUsed(0);
        }
    };

    const compressImage = (
        base64String,
        maxWidth = 4096,
        quality = 0.94,
        preferredMimeType = null
    ) => {
        return new Promise((resolve, reject) => {
            const img = new Image();

            img.onload = () => {
                try {
                    const sourceWidth = img.naturalWidth || img.width;
                    const sourceHeight = img.naturalHeight || img.height;

                    // Never upscale smaller files.
                    const width = Math.min(sourceWidth, maxWidth);
                    const ratio = width / sourceWidth;
                    const height = Math.max(1, Math.round(sourceHeight * ratio));

                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;

                    const ctx = canvas.getContext('2d', {
                        alpha: preferredMimeType === 'image/png'
                    });

                    if (!ctx) {
                        reject(new Error('Canvas is unavailable.'));
                        return;
                    }

                    ctx.imageSmoothingEnabled = true;
                    ctx.imageSmoothingQuality = 'high';

                    // Preserve transparent logos / favicons as PNG.
                    const sourceIsTransparent =
                        base64String.startsWith('data:image/png') ||
                        base64String.startsWith('data:image/webp');

                    const mimeType =
                        preferredMimeType ||
                        (sourceIsTransparent ? 'image/png' : 'image/jpeg');

                    if (mimeType === 'image/jpeg') {
                        ctx.fillStyle = '#ffffff';
                        ctx.fillRect(0, 0, width, height);
                    }

                    ctx.drawImage(
                        img,
                        0,
                        0,
                        sourceWidth,
                        sourceHeight,
                        0,
                        0,
                        width,
                        height
                    );

                    resolve(canvas.toDataURL(mimeType, quality));
                } catch (error) {
                    reject(error);
                }
            };

            img.onerror = () => reject(
                new Error('Failed to load image for processing.')
            );

            img.src = base64String;
        });
    };

    const getCompressionSettings = (type) => {
        if (type === 'favicon') {
            return {
                maxWidth: 512,
                quality: 1,
                mimeType: 'image/png'
            };
        }

        if (type === 'logo' || type === 'footerLogo') {
            return {
                maxWidth: 2048,
                quality: 1,
                mimeType: 'image/png'
            };
        }

        if (
            [
                'loginBackground',
                'registerBackground',
                'authSideImage',
                'loginPromoImage',
                'registerPromoImage'
            ].includes(type)
        ) {
            return {
                maxWidth: 7680,
                quality: 0.97,
                mimeType: 'image/jpeg'
            };
        }

        if (isHeroStorageType(type)) {
            return {
                maxWidth: 7680,
                quality: 0.97,
                mimeType: 'image/jpeg'
            };
        }

        return {
            maxWidth: 4096,
            quality: 0.95,
            mimeType: null
        };
    };

    const storeImageInIndexedDB = async (imageData, type) => {
        try {
            await ImageStorage.ensureInitialized();
            const id = `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const success = await ImageStorage.saveImage(id, type, imageData);
            if (success) {
                await checkStorageUsage();
                return id;
            }
            return null;
        } catch (error) {
            console.warn('Failed to store image in IndexedDB:', error);
            return null;
        }
    };

    const getImageFromIndexedDB = async (id) => {
        if (!id) return null;
        return await ImageStorage.getImage(id);
    };

    const deleteImageFromIndexedDB = async (id) => {
        if (!id) return;

        // New Cloudinary assets use a public ID such as zamed/products/abc123.
        if (String(id).includes('/')) {
            const token = getToken();
            if (!token) throw new Error('Please sign in again before deleting this image.');

            const response = await fetch(`${API_URL}/uploads/image`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ publicId: id })
            });
            const result = await response.json().catch(() => ({}));
            if (!response.ok || !result.success) {
                throw new Error(result.message || 'Unable to delete Cloudinary image.');
            }
            return;
        }

        // Legacy images created before Cloudinary are still removed locally.
        await ImageStorage.deleteImage(id);
        await checkStorageUsage();
    };

    const uploadImage = async (imageData, type) => {
        const { maxWidth, quality, mimeType } = getCompressionSettings(type);

        try {
            const compressed = await compressImage(imageData, maxWidth, quality, mimeType);

            const token = getToken();
            if (!token) {
                throw new Error('Your admin session has expired. Please sign in again.');
            }

            const blobResponse = await fetch(compressed);
            const blob = await blobResponse.blob();
            const extension = blob.type === 'image/png'
                ? 'png'
                : blob.type === 'image/webp'
                    ? 'webp'
                    : 'jpg';
            const file = new File(
                [blob],
                `${String(type).replace(/[^a-z0-9_-]/gi, '-')}.${extension}`,
                { type: blob.type || 'image/jpeg' }
            );
            const body = new FormData();
            body.append('image', file);

            const response = await fetch(`${API_URL}/uploads/image`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                body
            });
            const result = await response.json().catch(() => ({}));
            if (!response.ok || !result.success || !result.imageUrl) {
                throw new Error(result.message || 'Cloudinary image upload failed.');
            }

            return {
                type: 'cloudinary',
                id: result.publicId || result.filename || null,
                publicId: result.publicId || result.filename || null,
                data: result.imageUrl,
                imageUrl: result.imageUrl
            };
        } catch (error) {
            console.error('Upload error:', error);
            throw error;
        }
    };


    // Create a small compatibility preview for UI components that still read
    // site_images.logo / footerLogo / favicon from localStorage.
    // Full-resolution originals remain in IndexedDB.
    const createPublicAssetPreview = async (
        imageData,
        type
    ) => {
        if (!imageData) return null;
        if (isRemoteImage(imageData)) return imageData;

        const config = {
            logo: { maxWidth: 512, quality: 0.9 },
            footerLogo: { maxWidth: 512, quality: 0.9 },
            favicon: { maxWidth: 128, quality: 0.95 }
        }[type];

        if (!config) return null;

        return new Promise((resolve) => {
            const img = new Image();

            img.onload = () => {
                try {
                    const scale = Math.min(
                        1,
                        config.maxWidth / img.naturalWidth
                    );

                    const width = Math.max(
                        1,
                        Math.round(img.naturalWidth * scale)
                    );
                    const height = Math.max(
                        1,
                        Math.round(img.naturalHeight * scale)
                    );

                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;

                    const ctx = canvas.getContext('2d');
                    ctx.imageSmoothingEnabled = true;
                    ctx.imageSmoothingQuality = 'high';
                    ctx.drawImage(img, 0, 0, width, height);

                    // PNG preserves transparent logos and favicons.
                    resolve(
                        canvas.toDataURL(
                            'image/png',
                            config.quality
                        )
                    );
                } catch (error) {
                    console.warn(
                        `Unable to create ${type} preview:`,
                        error
                    );
                    resolve(null);
                }
            };

            img.onerror = () => resolve(null);
            img.src = imageData;
        });
    };

    const updateFaviconInBrowser = (faviconUrl) => {
        if (!faviconUrl) return;
        
        try {
            let link = document.querySelector("link[rel*='icon']");
            if (!link) {
                link = document.createElement('link');
                link.rel = 'shortcut icon';
                document.head.appendChild(link);
            }
            link.type = faviconUrl.startsWith('data:image/png')
                ? 'image/png'
                : 'image/x-icon';
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

    // UPDATED: Save to localStorage with proper slide image handling
    const saveToLocalStorage = async (sourceSettings = settings) => {
        const current = sourceSettings;

        // localStorage stores lightweight Cloudinary URLs, public IDs and text.
        const imageKeys = IMAGE_TYPES;

        const lightweightSettings = { ...current };

        imageKeys.forEach((key) => {
            if (!isRemoteImage(current[key])) delete lightweightSettings[key];
        });

        const lightweightSlides = (current.slides || []).map((slide, index) => {
            const imageId =
                slide.imageId ||
                current.slideImageIds?.[slide.id] ||
                null;

            // Never place slide.image Base64 data in localStorage.
            const {
                image,
                ...slideWithoutImage
            } = slide;

            return {
                ...slideWithoutImage,
                image: isRemoteImage(image) ? image : null,
                imageId,
                order: slide.order ?? index + 1
            };
        });

        lightweightSettings.slides = lightweightSlides;

        // Make sure no accidental nested Base64 fields survive.
        lightweightSettings.slideImageIds = {
            ...(current.slideImageIds || {})
        };

        const authSettings = {
            authEyebrow: current.authEyebrow,
            loginTitle: current.loginTitle,
            loginSubtitle: current.loginSubtitle,
            registerTitle: current.registerTitle,
            registerSubtitle: current.registerSubtitle,
            loginPromoTitle: current.loginPromoTitle,
            loginPromoText: current.loginPromoText,
            registerPromoTitle: current.registerPromoTitle,
            registerPromoText: current.registerPromoText,
            loginButtonText: current.loginButtonText,
            registerButtonText: current.registerButtonText,
            forgotPasswordText: current.forgotPasswordText,
            rememberMeText: current.rememberMeText,
            authPrimaryColor: current.authPrimaryColor,
            authSecondaryColor: current.authSecondaryColor,
            authTextColor: current.authTextColor,
            authUseSiteTypography: current.authUseSiteTypography,
            authHeadingFont: current.authHeadingFont,
            authBodyFont: current.authBodyFont,
            authTitleColor: current.authTitleColor,
            authSubtitleColor: current.authSubtitleColor,
            authLabelColor: current.authLabelColor,
            authInputTextColor: current.authInputTextColor,
            authPlaceholderColor: current.authPlaceholderColor,
            authLinkColor: current.authLinkColor,
            authButtonTextColor: current.authButtonTextColor,
            authMutedTextColor: current.authMutedTextColor,
            authOverlayOpacity: current.authOverlayOpacity,
            authImagePosition: current.authImagePosition,
            authBorderRadius: current.authBorderRadius,
            authBackgroundBlur: current.authBackgroundBlur,
            authAnimationStyle: current.authAnimationStyle,
            authPanelStyle: current.authPanelStyle,
            showAuthBenefits: current.showAuthBenefits,
            showGoogleLogin: current.showGoogleLogin,
            showFacebookLogin: current.showFacebookLogin,
            showRememberMe: current.showRememberMe,
            showForgotPassword: current.showForgotPassword,
            showPasswordStrength: current.showPasswordStrength,
            showNewsletterOptIn: current.showNewsletterOptIn,
            showTermsAgreement: current.showTermsAgreement,
            showAuthTrustBadges: current.showAuthTrustBadges,

            // Cloudinary URLs and public IDs
            loginBackground: isRemoteImage(current.loginBackground) ? current.loginBackground : null,
            registerBackground: isRemoteImage(current.registerBackground) ? current.registerBackground : null,
            authSideImage: isRemoteImage(current.authSideImage) ? current.authSideImage : null,
            loginPromoImage: isRemoteImage(current.loginPromoImage) ? current.loginPromoImage : null,
            registerPromoImage: isRemoteImage(current.registerPromoImage) ? current.registerPromoImage : null,
            loginBackgroundId: current.loginBackgroundId || null,
            registerBackgroundId: current.registerBackgroundId || null,
            authSideImageId: current.authSideImageId || null,
            loginPromoImageId: current.loginPromoImageId || null,
            registerPromoImageId: current.registerPromoImageId || null
        };


        // Small compatibility copies for Header/SiteContext.
        // These are intentionally tiny; large hero/auth assets stay ID-only.
        const [
            publicLogo,
            publicFooterLogo,
            publicFavicon
        ] = await Promise.all([
            createPublicAssetPreview(current.logo, 'logo'),
            createPublicAssetPreview(current.footerLogo, 'footerLogo'),
            createPublicAssetPreview(current.favicon, 'favicon')
        ]);

        const siteInfoData = {
            siteName: current.siteName,
            siteEmail: current.siteEmail,
            sitePhone: current.sitePhone,
            siteAddress: current.siteAddress,
            currency: current.currency,
            heroTitle: current.heroTitle,
            heroSubtitle: current.heroSubtitle,
            heroButtonText: current.heroButtonText,
            footerText: current.footerText,
            socialLinks: {
                facebook: current.facebookUrl,
                instagram: current.instagramUrl,
                twitter: current.twitterUrl,
                youtube: current.youtubeUrl,
                linkedin: current.linkedinUrl
            },
            fontSettings: {
                primaryFont: current.primaryFont,
                headingFont: current.headingFont,
                bodyFont: current.bodyFont,
                fontScale: current.fontScale
            },
            authSettings,

            // Public Cloudinary URLs + public IDs.
            logo: publicLogo || null,
            logoId: current.logoId || null,
            footerLogo: publicFooterLogo || null,
            footerLogoId: current.footerLogoId || null,
            favicon: publicFavicon || null,
            faviconId: current.faviconId || null,
            loginBackgroundId: current.loginBackgroundId || null,
            registerBackgroundId: current.registerBackgroundId || null,
            authSideImageId: current.authSideImageId || null,
            loginPromoImageId: current.loginPromoImageId || null,
            registerPromoImageId: current.registerPromoImageId || null,
            loginBackground: isRemoteImage(current.loginBackground) ? current.loginBackground : null,
            registerBackground: isRemoteImage(current.registerBackground) ? current.registerBackground : null,
            authSideImage: isRemoteImage(current.authSideImage) ? current.authSideImage : null,
            loginPromoImage: isRemoteImage(current.loginPromoImage) ? current.loginPromoImage : null,
            registerPromoImage: isRemoteImage(current.registerPromoImage) ? current.registerPromoImage : null,

            slides: lightweightSlides
        };

        const imageManifest = {
            // Small public UI previews for existing Header/SiteContext code.
            // Full-resolution files are delivered through Cloudinary.
            logo: publicLogo || null,
            logoId: current.logoId || null,
            footerLogo: publicFooterLogo || null,
            footerLogoId: current.footerLogoId || null,
            favicon: publicFavicon || null,
            faviconId: current.faviconId || null,
            loginBackgroundId: current.loginBackgroundId || null,
            registerBackgroundId: current.registerBackgroundId || null,
            authSideImageId: current.authSideImageId || null,
            loginPromoImageId: current.loginPromoImageId || null,
            registerPromoImageId: current.registerPromoImageId || null,
            loginBackground: isRemoteImage(current.loginBackground) ? current.loginBackground : null,
            registerBackground: isRemoteImage(current.registerBackground) ? current.registerBackground : null,
            authSideImage: isRemoteImage(current.authSideImage) ? current.authSideImage : null,
            loginPromoImage: isRemoteImage(current.loginPromoImage) ? current.loginPromoImage : null,
            registerPromoImage: isRemoteImage(current.registerPromoImage) ? current.registerPromoImage : null,

            slides: lightweightSlides.map((slide) => ({
                id: slide.id,
                imageId: slide.imageId || null,
                image: isRemoteImage(slide.image) ? slide.image : null,
                title: slide.title,
                subtitle: slide.subtitle,
                buttonText: slide.buttonText,
                buttonLink: slide.buttonLink,
                color: slide.color,
                active: slide.active,
                order: slide.order,
                imagePosition: slide.imagePosition || null
            }))
        };

        try {
            // Remove legacy Base64 caches before saving.
            // This immediately frees several MB left by the previous implementation.
            localStorage.removeItem('slide_images_cache');
            localStorage.removeItem('site_favicon');

            Object.keys(localStorage).forEach((key) => {
                if (
                    key.endsWith('_fallback') ||
                    key.startsWith('slide_') && key.endsWith('_fallback')
                ) {
                    localStorage.removeItem(key);
                }
            });

            const writeLightweightSettings = () => {
                localStorage.setItem(
                    'site_settings',
                    JSON.stringify(lightweightSettings)
                );
                localStorage.setItem(
                    'site_info',
                    JSON.stringify(siteInfoData)
                );
                localStorage.setItem(
                    'site_images',
                    JSON.stringify(imageManifest)
                );
            };

            try {
                writeLightweightSettings();
            } catch (error) {
                if (
                    error?.name === 'QuotaExceededError' ||
                    error?.code === 22
                ) {
                    // Existing versions of these keys may still contain several
                    // megabytes of Base64. Remove them once, then write the new
                    // lightweight format.
                    localStorage.removeItem('site_settings');
                    localStorage.removeItem('site_info');
                    localStorage.removeItem('site_images');

                    writeLightweightSettings();
                } else {
                    throw error;
                }
            }

            console.log(
                '✅ Lightweight settings saved. Images use Cloudinary URLs.'
            );
        } catch (error) {
            console.error('Error saving lightweight settings:', error);

            if (
                error?.name === 'QuotaExceededError' ||
                error?.code === 22
            ) {
                toast.error(
                    'Browser local storage is full. Large image data has been removed, but another localStorage item is using too much space.'
                );
            } else {
                toast.error('Failed to save settings.');
            }

            return false;
        }

        // Keep the browser favicon working from the in-memory/IndexedDB preview.
        if (publicFavicon) {
            updateFaviconInBrowser(publicFavicon);
        } else if (current.favicon) {
            updateFaviconInBrowser(current.favicon);
        } else if (current.faviconId) {
            const faviconData = await getImageFromIndexedDB(current.faviconId);
            if (faviconData) {
                updateFaviconInBrowser(faviconData);
            }
        }

        window.dispatchEvent(new Event('storage'));
        window.dispatchEvent(
            new CustomEvent('settingsSaved', {
                detail: lightweightSettings
            })
        );
        window.dispatchEvent(
            new CustomEvent('siteInfoUpdated', {
                detail: siteInfoData
            })
        );
        window.dispatchEvent(
            new CustomEvent('siteImagesUpdated', {
                detail: imageManifest
            })
        );
        window.dispatchEvent(
            new CustomEvent('logoUpdated', {
                detail: {
                    logo: publicLogo || null,
                    logoId: current.logoId || null
                }
            })
        );
        window.dispatchEvent(
            new CustomEvent('faviconUpdated', {
                detail: {
                    favicon: publicFavicon || null,
                    faviconId: current.faviconId || null
                }
            })
        );
        window.dispatchEvent(
            new CustomEvent('authSettingsUpdated', {
                detail: authSettings
            })
        );
        window.dispatchEvent(
            new CustomEvent('heroSlidesUpdated', {
                detail: {
                    slides: lightweightSlides
                }
            })
        );

        return true;
    };

    // UPDATED: Load settings with slide images
    const loadSettings = async () => {
        setLoading(true);
        setError(null);

        try {
            await ImageStorage.init();

            const savedSettings = JSON.parse(
                localStorage.getItem('site_settings') || '{}'
            );
            const savedSiteInfo = JSON.parse(
                localStorage.getItem('site_info') || '{}'
            );
            const savedImages = JSON.parse(
                localStorage.getItem('site_images') || '{}'
            );

            let backendSettings = {};
            try {
                const response = await fetch(`${API_URL}/settings`);
                if (response.ok) {
                    const result = await response.json();
                    backendSettings = result.settings || result.data || result || {};
                    setBackendAvailable(true);
                }
            } catch (backendError) {
                console.warn('Backend settings load failed:', backendError.message);
                setBackendAvailable(false);
            }

            const mergedSettings = {
                ...settings,
                ...savedSettings,
                ...savedSiteInfo,
                ...(savedSiteInfo.authSettings || {}),
                ...backendSettings,
                ...(backendSettings.authSettings || {})
            };

            const previews = {};
            const slideImagesMap = {};

            const loadImage = async (id, legacyFallback = null) => {
                if (id) {
                    const data = await ImageStorage.getImage(id);
                    if (data) return data;
                }

                // Compatibility only for old data created before this fix.
                // It is never re-saved to localStorage.
                return legacyFallback || null;
            };

            const imageTypes = IMAGE_TYPES;

            for (const type of imageTypes) {
                const idField = `${type}Id`;

                const imageId =
                    mergedSettings[idField] ||
                    savedSiteInfo[idField] ||
                    savedSiteInfo.authSettings?.[idField] ||
                    savedImages[idField] ||
                    null;

                if (imageId) {
                    mergedSettings[idField] = imageId;
                }

                const legacyFallback =
                    savedImages[type] ||
                    savedSiteInfo.authSettings?.[type] ||
                    null;

                const image = isRemoteImage(mergedSettings[type])
                    ? mergedSettings[type]
                    : await loadImage(imageId, legacyFallback);

                if (image) {
                    previews[type] = image;
                    mergedSettings[type] = image;
                }
            }

            if (previews.favicon) {
                updateFaviconInBrowser(previews.favicon);
            }

            const slidesMetadata =
                backendSettings.slides ||
                savedSiteInfo.slides ||
                savedImages.slides ||
                savedSettings.slides ||
                mergedSettings.slides ||
                [];

            const hydratedSlides = [];

            for (let index = 0; index < slidesMetadata.length; index++) {
                const slide = slidesMetadata[index];

                const imageId =
                    slide.imageId ||
                    mergedSettings.slideImageIds?.[slide.id] ||
                    savedImages.slides?.find(
                        (item) =>
                            String(item.id) === String(slide.id)
                    )?.imageId ||
                    null;

                let imageData = isRemoteImage(slide.image) ? slide.image : null;

                if (!imageData && imageId) {
                    imageData = await ImageStorage.getImage(imageId);
                }

                // Legacy fallback for old saved data only.
                if (!imageData && slide.image) {
                    imageData = slide.image;
                }

                hydratedSlides.push({
                    ...slide,
                    imageId,
                    image: imageData || null
                });

                if (imageData) {
                    slideImagesMap[index] = imageData;
                }
            }

            if (hydratedSlides.length > 0) {
                mergedSettings.slides = hydratedSlides;
            }

            setSettings(mergedSettings);
            setSiteNameInput(
                mergedSettings.siteName ||
                settings.siteName
            );
            setImagePreviews(previews);
            setSlideImages(slideImagesMap);

            // Delete previous Base64 caches once data has been hydrated.
            localStorage.removeItem('slide_images_cache');
            localStorage.removeItem('site_favicon');

            Object.keys(localStorage).forEach((key) => {
                if (key.endsWith('_fallback')) {
                    localStorage.removeItem(key);
                }
            });

            await checkStorageUsage();

            console.log(
                '✅ Settings loaded. New image assets use Cloudinary.'
            );
        } catch (error) {
            console.error("Error loading settings:", error);
            setError(
                "Failed to load settings. Using default settings."
            );
        } finally {
            setLoading(false);
        }
    };

    const handleSiteNameChange = (e) => {
        const newName = e.target.value;
        setSiteNameInput(newName);
        setSettings(prev => ({ ...prev, siteName: newName }));
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        const numericFields = new Set(['authOverlayOpacity', 'productsPerRow', 'itemsPerPage', 'animationDuration']);
        const newValue = type === 'checkbox'
            ? checked
            : numericFields.has(name)
                ? Number(value)
                : value;
        
        setSettings(prev => ({ 
            ...prev, 
            [name]: newValue 
        }));
    };

    const handleCurrencyChange = (currencyCode) => {
        setSettings(prev => ({ ...prev, currency: currencyCode }));
        const selectedCurrency = currencyOptions.find(c => c.code === currencyCode);
        window.dispatchEvent(new CustomEvent('currencyChanged', { 
            detail: { currency: currencyCode, symbol: selectedCurrency?.symbol } 
        }));
    };

    const handleSlideChange = (index, field, value) => {
        const updatedSlides = [...settings.slides];
        updatedSlides[index] = { ...updatedSlides[index], [field]: value };
        setSettings(prev => ({ ...prev, slides: updatedSlides }));
    };

    const addNewSlide = () => {
        const newSlide = { 
            id: Date.now() + Math.random(), 
            title: "New Slide", 
            subtitle: "Add your description here", 
            buttonText: "Shop Now", 
            buttonLink: "/collections/all", 
            image: null, 
            color: "from-blue-600",
            active: true,
            order: settings.slides.length + 1
        };
        setSettings(prev => ({ 
            ...prev, 
            slides: [...prev.slides, newSlide],
            slideImageIds: { ...prev.slideImageIds }
        }));
        toast.success("✅ New slide added! Upload an image and save.");
    };

    const removeSlide = async (index) => {
        if (settings.slides.length <= 1) {
            toast.error("You need at least one slide");
            return;
        }
        
        const slide = settings.slides[index];
        if (slide.imageId || settings.slideImageIds?.[slide.id]) {
            const imageId = slide.imageId || settings.slideImageIds[slide.id];
            await deleteImageFromIndexedDB(imageId);
        }
        
        const updatedSlides = settings.slides.filter((_, i) => i !== index);
        const updatedImageIds = { ...(settings.slideImageIds || {}) };
        delete updatedImageIds[slide.id];

        const nextSettings = {
            ...settings,
            slides: updatedSlides,
            slideImageIds: updatedImageIds
        };

        setSettings(nextSettings);
        await saveToLocalStorage(nextSettings);
        const updatedSlideImages = { ...slideImages };
        delete updatedSlideImages[index];
        setSlideImages(updatedSlideImages);
        toast.success("✅ Slide removed successfully");
    };

    const toggleSlideActive = (index) => {
        const updatedSlides = [...settings.slides];
        updatedSlides[index] = { ...updatedSlides[index], active: !updatedSlides[index].active };
        setSettings(prev => ({ ...prev, slides: updatedSlides }));
        toast.success(`✅ Slide ${updatedSlides[index].active ? 'activated' : 'deactivated'}`);
    };

    const validateImageFile = (file) => {
        if (!file) return false;

        if (!file.type?.startsWith('image/')) {
            toast.error('Please select a valid image file.');
            return false;
        }

        if (file.size > MAX_UPLOAD_BYTES) {
            toast.error('Image must be less than 5MB.');
            return false;
        }

        return true;
    };

    const handleSlideImageUpload = (index, file) => {
        if (!validateImageFile(file)) return;

        const reader = new FileReader();

        reader.onloadend = () => {
            setCropImage(reader.result);
            setCropType("slide");
            setCropSlideId(index);
        };

        reader.onerror = () => toast.error("Unable to read this image.");
        reader.readAsDataURL(file);
    };

    const handleSlideImageCropComplete = async (croppedImage) => {
        if (cropSlideId === null || !settings.slides?.[cropSlideId]) {
            toast.error("The selected hero slide is no longer available.");
            return;
        }

        setUploading(true);
        const toastId = toast.loading("Processing hero image...");

        try {
            const result = await uploadImage(
                croppedImage,
                `slide_${settings.slides[cropSlideId].id}`
            );

            const imageUrl = result.data || croppedImage;
            const imageId = result.publicId || result.id || null;

            const previousSlide = settings.slides[cropSlideId];
            const oldImageId = previousSlide.imageId || settings.slideImageIds?.[previousSlide.id];

            const updatedSlides = settings.slides.map((slide, index) =>
                index === cropSlideId
                    ? { ...slide, image: imageUrl, imageId }
                    : slide
            );

            const updatedImageIds = { ...(settings.slideImageIds || {}) };

            if (imageId) {
                updatedImageIds[previousSlide.id] = imageId;
            } else {
                delete updatedImageIds[previousSlide.id];
            }

            const nextSettings = {
                ...settings,
                slides: updatedSlides,
                slideImageIds: updatedImageIds
            };

            setSettings(nextSettings);
            setSlideImages((current) => ({
                ...current,
                [cropSlideId]: imageUrl
            }));
            await saveToLocalStorage(nextSettings);

            if (oldImageId && oldImageId !== imageId) {
                await deleteImageFromIndexedDB(oldImageId);
            }

            toast.success("Hero image uploaded and published.", { id: toastId });
        } catch (error) {
            console.error('Hero image upload error:', error);
            toast.error(error.message || "Failed to upload hero image", { id: toastId });
        } finally {
            setUploading(false);
            setCropImage(null);
            setCropType(null);
            setCropSlideId(null);
        }
    };

    const removeSlideImage = async (index) => {
        const slide = settings.slides[index];
        if (!slide) return;

        const imageId = slide.imageId || settings.slideImageIds?.[slide.id];

        const updatedSlides = settings.slides.map((item, itemIndex) =>
            itemIndex === index
                ? { ...item, image: null, imageId: null }
                : item
        );

        const updatedImageIds = { ...(settings.slideImageIds || {}) };
        delete updatedImageIds[slide.id];

        const nextSettings = {
            ...settings,
            slides: updatedSlides,
            slideImageIds: updatedImageIds
        };

        setSettings(nextSettings);
        setSlideImages((current) => {
            const next = { ...current };
            delete next[index];
            return next;
        });
        await saveToLocalStorage(nextSettings);

        if (imageId) await deleteImageFromIndexedDB(imageId);
        toast.info("Hero image removed");
    };

    const handleImageUpload = (type, file) => {
        if (!validateImageFile(file)) return;

        const reader = new FileReader();

        reader.onloadend = () => {
            setCropImage(reader.result);
            setCropType(type);
            setCropSlideId(null);
        };

        reader.onerror = () => toast.error("Unable to read this image.");
        reader.readAsDataURL(file);
    };

    const handleCropComplete = async (croppedImage) => {
        if (cropType === "slide") {
            await handleSlideImageCropComplete(croppedImage);
            return;
        }

        const selectedType = cropType;
        if (!selectedType) return;

        setUploading(true);
        const toastId = toast.loading("Processing image...");

        try {
            const result = await uploadImage(croppedImage, selectedType);

            const imageUrl = result.data || croppedImage;
            const imageId = result.publicId || result.id || null;
            const idField = `${selectedType}Id`;
            const previousId = settings[idField];

            const nextSettings = {
                ...settings,
                [selectedType]: imageUrl,
                [idField]: imageId
            };

            setSettings(nextSettings);
            setImagePreviews((current) => ({
                ...current,
                [selectedType]: imageUrl
            }));
            await saveToLocalStorage(nextSettings);

            window.dispatchEvent(
                new CustomEvent('siteAssetUpdated', {
                    detail: {
                        type: selectedType,
                        id: imageId
                    }
                })
            );

            if (selectedType === 'logo') {
                window.dispatchEvent(
                    new CustomEvent('logoUpdated', {
                        detail: { logoId: imageId }
                    })
                );
            }

            if (selectedType === 'favicon') {
                window.dispatchEvent(
                    new CustomEvent('faviconUpdated', {
                        detail: { faviconId: imageId }
                    })
                );
            }

            if (previousId && previousId !== imageId) {
                await deleteImageFromIndexedDB(previousId);
            }

            if (selectedType === 'favicon') {
                updateFaviconInBrowser(imageUrl);
            }

            toast.success(
                `${selectedType.replace(/([A-Z])/g, ' $1').trim()} updated.`,
                { id: toastId }
            );
        } catch (error) {
            console.error('Upload error:', error);
            toast.error(error.message || "Failed to upload image", { id: toastId });
        } finally {
            setUploading(false);
            setCropImage(null);
            setCropType(null);
            setCropSlideId(null);
        }
    };

    const removeImage = async (type) => {
        const idField = `${type}Id`;
        const imageId = settings[idField];

        const nextSettings = {
            ...settings,
            [type]: null,
            [idField]: null
        };

        setImagePreviews((current) => ({
            ...current,
            [type]: null
        }));
        setSettings(nextSettings);

        if (fileInputRefs[type]?.current) {
            fileInputRefs[type].current.value = '';
        }

        await saveToLocalStorage(nextSettings);
        if (imageId) await deleteImageFromIndexedDB(imageId);
        toast.info(`${type.replace(/([A-Z])/g, ' $1').trim()} removed`);
    };

    const saveSettings = async () => {
        setIsSaving(true);
        
        try {
            await saveToLocalStorage();
            
            const token = getToken();
            if (token) {
                try {
                    const backendData = { ...settings };

                    const imageKeys = IMAGE_TYPES;

                    imageKeys.forEach((key) => {
                        // Send Cloudinary URLs, but never send legacy Base64 data.
                        if (!isRemoteImage(backendData[key])) delete backendData[key];
                    });

                    backendData.slides = (settings.slides || []).map(
                        ({ image, ...slide }) => ({
                            ...slide,
                            image: isRemoteImage(image) ? image : null,
                            imageId:
                                slide.imageId ||
                                settings.slideImageIds?.[slide.id] ||
                                null
                        })
                    );
                    
                    const response = await fetch(`${API_URL}/settings`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify(backendData)
                    });
                    
                    if (!response.ok) {
                        const result = await response.json().catch(() => ({}));
                        throw new Error(result.message || 'Server rejected the settings update.');
                    }

                    const data = await response.json();
                    if (!data.success) {
                        throw new Error(data.message || 'Settings were not saved.');
                    }

                    toast.success("Settings saved to server!");
                    setBackendAvailable(true);
                } catch (backendError) {
                    console.warn('Backend save failed:', backendError.message);
                    setBackendAvailable(false);
                    throw backendError;
                }
            } else {
                throw new Error('Your admin session has expired. Please sign in again.');
            }
            
            setLastSaved(new Date());
            await checkStorageUsage();
        } catch (error) {
            console.error("Error saving settings:", error);
            toast.error(error.message || "Failed to save settings. Please try again.");
        } finally {
            setIsSaving(false);
        }
    };

    const ImageUploadField = ({ label, type, preview, recommended }) => (
        <div className="mb-4">
            <label className="block text-sm font-medium mb-2 dark:text-white">{label}</label>
            <div className="flex items-start space-x-4">
                {preview ? (
                    <div className="relative group">
                        <img 
                            src={preview} 
                            alt={label} 
                            className={`${type === 'favicon' ? 'w-16 h-16' : ['loginBackground', 'registerBackground', 'authSideImage', 'loginPromoImage', 'registerPromoImage'].includes(type) ? 'w-52 h-32' : 'w-32 h-32'} object-cover rounded-lg border-2 border-gray-200 bg-gray-50 dark:bg-gray-700`} 
                            onError={(e) => {
                                console.warn('Image failed to load, using placeholder');
                                e.target.src = PLACEHOLDER_IMAGE;
                            }}
                        />
                        <div className="absolute inset-0 bg-black bg-opacity-50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-2">
                            <button 
                                onClick={() => { setCropImage(preview); setCropType(type); }} 
                                className="bg-blue-500 text-white rounded-full p-1.5 hover:bg-blue-600" 
                                title="Edit"
                            >
                                <FiEdit2 size={12} />
                            </button>
                            <button 
                                onClick={() => removeImage(type)} 
                                className="bg-red-500 text-white rounded-full p-1.5 hover:bg-red-600" 
                                title="Remove"
                            >
                                <FiX size={12} />
                            </button>
                        </div>
                    </div>
                ) : (
                    <div 
                        onClick={() => fileInputRefs[type]?.current?.click()} 
                        className={`${type === 'favicon' ? 'w-16 h-16' : ['loginBackground', 'registerBackground', 'authSideImage', 'loginPromoImage', 'registerPromoImage'].includes(type) ? 'w-52 h-32' : 'w-32 h-32'} border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all`}
                    >
                        <FiUpload className="w-8 h-8 text-gray-400" />
                        <span className="text-xs text-gray-500 mt-1">Upload</span>
                    </div>
                )}
                <input 
                    type="file" 
                    ref={fileInputRefs[type]} 
                    onChange={(e) => handleImageUpload(type, e.target.files[0])} 
                    accept="image/*" 
                    className="hidden" 
                />
                <div className="flex-1">
                    <p className="text-xs text-gray-500">{recommended}</p>
                    <p className="text-xs text-gray-400 mt-1">JPG, PNG, WEBP (Max 5MB source file)</p>
                    {storageUsed > 0 && (
                        <p className="text-xs text-blue-600 mt-1">💾 ~{storageUsed}MB used in storage</p>
                    )}
                    <p className="text-xs text-green-600 mt-1">✓ Securely stored in Cloudinary and available on every device</p>
                </div>
            </div>
        </div>
    );

    const tabs = [
        { id: "general", label: "General", icon: FiGlobe },
        { id: "hero", label: "Hero Slider", icon: FiImage },
        { id: "authentication", label: "Login & Register", icon: FiUser },
        { id: "products", label: "Products", icon: FiPackage },
        { id: "design", label: "Design", icon: FiLayout },
        { id: "typography", label: "Typography", icon: FiType },
        { id: "seo", label: "SEO", icon: FiMonitor }
    ];

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
                <div>
                    <h1 className="text-2xl font-bold dark:text-white">Site Settings</h1>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">Cloudinary storage for logo, favicon, hero, authentication artwork and promotional assets</p>
                    {lastSaved && <p className="text-xs text-green-600 mt-1">Last saved: {lastSaved.toLocaleTimeString()}</p>}
                    {!backendAvailable && (
                        <p className="text-xs text-yellow-600 mt-1">⚠️ Working in offline mode (backend unavailable)</p>
                    )}
                    {storageUsed > 0 && (
                        <p className="text-xs text-blue-600 mt-1">💾 Images: ~{storageUsed}MB used</p>
                    )}
                </div>
                <div className="flex gap-3 flex-wrap">
                    <button onClick={() => {
                        ['site_settings','site_info','site_images','slide_images_cache','site_favicon'].forEach(key => localStorage.removeItem(key));
                        Object.keys(localStorage).forEach(key => {
                            if (key.endsWith('_fallback')) localStorage.removeItem(key);
                        });
                        window.location.reload();
                    }} className="bg-red-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-red-700">
                        <FiAlertCircle /> Clear Cache
                    </button>
                    <button onClick={saveSettings} className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-green-700">
                        <FiRefreshCw /> Force Refresh
                    </button>
                </div>
            </div>

            {error && (
                <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-yellow-700">
                        <FiAlertCircle size={18} />
                        <span className="text-sm">{error}</span>
                    </div>
                </div>
            )}

            {/* Tab Navigation */}
            <div className="flex flex-wrap gap-2 mb-6 border-b dark:border-gray-700 overflow-x-auto pb-1">
                {tabs.map(tab => {
                    const Icon = tab.icon;
                    return (
                        <button 
                            key={tab.id} 
                            onClick={() => setActiveTab(tab.id)} 
                            className={`px-4 py-2 rounded-t-lg font-medium transition-colors flex items-center gap-2 whitespace-nowrap ${
                                activeTab === tab.id 
                                    ? "bg-white dark:bg-gray-800 text-blue-600 border-b-2 border-blue-600" 
                                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700"
                            }`}
                        >
                            <Icon size={16} /> {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* General Settings */}
            {activeTab === "general" && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                    <h2 className="text-xl font-semibold mb-4 border-b pb-2 dark:border-gray-700 flex items-center">
                        <FiGlobe className="mr-2 text-blue-600" /> General Settings
                    </h2>
                    <div className="space-y-4">
                        <ImageUploadField label="Site Logo" type="logo" preview={imagePreviews.logo} recommended="Transparent PNG recommended. Up to 2048px retained." />
                        <ImageUploadField label="Favicon" type="favicon" preview={imagePreviews.favicon} recommended="Square PNG recommended. Up to 512px retained for sharp browser icons." />
                        <div>
                            <label className="block text-sm font-medium mb-1 dark:text-white">Site Name</label>
                            <input 
                                type="text" 
                                value={siteNameInput} 
                                onChange={handleSiteNameChange}
                                onBlur={() => saveToLocalStorage().catch(err => console.error(err))}
                                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white" 
                                placeholder="Enter your site name"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1 dark:text-white">Currency</label>
                            <div className="flex flex-wrap gap-3">
                                {currencyOptions.map(currency => (
                                    <button 
                                        key={currency.code} 
                                        type="button" 
                                        onClick={() => handleCurrencyChange(currency.code)} 
                                        className={`px-4 py-2 rounded-lg border-2 transition-all ${
                                            settings.currency === currency.code 
                                                ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-600 font-semibold' 
                                                : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
                                        }`}
                                    >
                                        {currency.code} ({currency.symbol})
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1 dark:text-white">Site Email</label>
                            <div className="relative">
                                <FiMail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                <input type="email" name="siteEmail" value={settings.siteEmail} onChange={handleChange} className="w-full pl-10 pr-3 py-2 border rounded-lg dark:bg-gray-700" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1 dark:text-white">Site Phone</label>
                            <div className="relative">
                                <FiPhone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                <input type="text" name="sitePhone" value={settings.sitePhone} onChange={handleChange} className="w-full pl-10 pr-3 py-2 border rounded-lg dark:bg-gray-700" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1 dark:text-white">Site Address</label>
                            <div className="relative">
                                <FiMapPin className="absolute left-3 top-3 text-gray-400" />
                                <textarea name="siteAddress" value={settings.siteAddress} onChange={handleChange} rows="2" className="w-full pl-10 pr-3 py-2 border rounded-lg dark:bg-gray-700" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1 dark:text-white">Footer Text</label>
                            <input type="text" name="footerText" value={settings.footerText} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="font-semibold dark:text-white">Social Media Links</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div className="relative">
                                    <FiFacebook className="absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-600" />
                                    <input type="url" name="facebookUrl" value={settings.facebookUrl} onChange={handleChange} placeholder="Facebook URL" className="w-full pl-10 pr-3 py-2 border rounded-lg dark:bg-gray-700" />
                                </div>
                                <div className="relative">
                                    <FiInstagram className="absolute left-3 top-1/2 transform -translate-y-1/2 text-pink-600" />
                                    <input type="url" name="instagramUrl" value={settings.instagramUrl} onChange={handleChange} placeholder="Instagram URL" className="w-full pl-10 pr-3 py-2 border rounded-lg dark:bg-gray-700" />
                                </div>
                                <div className="relative">
                                    <FiTwitter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-400" />
                                    <input type="url" name="twitterUrl" value={settings.twitterUrl} onChange={handleChange} placeholder="Twitter URL" className="w-full pl-10 pr-3 py-2 border rounded-lg dark:bg-gray-700" />
                                </div>
                                <div className="relative">
                                    <FiYoutube className="absolute left-3 top-1/2 transform -translate-y-1/2 text-red-600" />
                                    <input type="url" name="youtubeUrl" value={settings.youtubeUrl} onChange={handleChange} placeholder="YouTube URL" className="w-full pl-10 pr-3 py-2 border rounded-lg dark:bg-gray-700" />
                                </div>
                            </div>
                        </div>
                        <div>
                            <label className="flex items-center gap-2">
                                <input type="checkbox" name="maintenanceMode" checked={settings.maintenanceMode} onChange={handleChange} className="w-4 h-4" />
                                <span className="text-sm font-medium dark:text-white">Maintenance Mode</span>
                            </label>
                        </div>
                    </div>
                </div>
            )}

            {/* Hero Slider Settings */}
            {activeTab === "hero" && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                    <h2 className="text-xl font-semibold mb-4 border-b pb-2 dark:border-gray-700 flex items-center">
                        <FiImage className="mr-2 text-blue-600" /> Hero Slider Settings
                    </h2>
                    
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-semibold dark:text-white">Hero Slides</h3>
                            <button type="button" onClick={addNewSlide} className="bg-green-600 text-white px-3 py-1.5 rounded-lg flex items-center gap-2 text-sm hover:bg-green-700 transition-colors">
                                <FiPlus size={14} /> Add Slide
                            </button>
                        </div>
                        
                        {settings.slides.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                                <p>No slides yet. Click "Add Slide" to create one.</p>
                            </div>
                        ) : (
                            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                                {settings.slides.map((slide, index) => (
                                    <div key={slide.id} className={`border rounded-lg p-4 ${slide.active === false ? 'opacity-60 bg-gray-50 dark:bg-gray-700/50' : 'bg-gray-50 dark:bg-gray-700'}`}>
                                        <div className="flex justify-between items-center mb-3">
                                            <h4 className="font-medium dark:text-white">Slide {index + 1}</h4>
                                            <div className="flex gap-2">
                                                <button 
                                                    onClick={() => toggleSlideActive(index)} 
                                                    className={`px-2 py-1 rounded-lg text-xs ${slide.active !== false ? 'bg-green-600 text-white' : 'bg-gray-500 text-white'}`}
                                                >
                                                    {slide.active !== false ? 'Active' : 'Inactive'}
                                                </button>
                                                <button 
                                                    onClick={() => removeSlide(index)} 
                                                    className="text-red-500 hover:text-red-700 p-1"
                                                    title="Remove slide"
                                                >
                                                    <FiTrash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                        
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium mb-2 dark:text-white">Slide Image</label>
                                                <div className="flex items-start gap-3">
                                                    {slideImages[index] || slide.image ? (
                                                        <div className="relative group">
                                                            <img 
                                                                src={slideImages[index] || slide.image} 
                                                                alt={`Slide ${index + 1}`} 
                                                                className="w-24 h-24 object-cover rounded-lg border-2 border-blue-400" 
                                                                onError={(e) => {
                                                                    e.target.src = PLACEHOLDER_IMAGE;
                                                                }}
                                                            />
                                                            <div className="absolute inset-0 bg-black bg-opacity-50 rounded-lg opacity-0 group-hover:opacity-100 flex items-center justify-center gap-1">
                                                                <button 
                                                                    onClick={() => slideInputRefs.current[index]?.click()} 
                                                                    className="bg-blue-500 text-white rounded-full p-1 hover:bg-blue-600"
                                                                    title="Change image"
                                                                >
                                                                    <FiEdit2 size={10} />
                                                                </button>
                                                                <button 
                                                                    onClick={() => removeSlideImage(index)} 
                                                                    className="bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                                                                    title="Remove image"
                                                                >
                                                                    <FiX size={10} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div 
                                                            onClick={() => slideInputRefs.current[index]?.click()} 
                                                            className="w-24 h-24 border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all"
                                                        >
                                                            <FiUpload size={20} className="text-gray-400" />
                                                            <span className="text-xs text-gray-400">Upload</span>
                                                        </div>
                                                    )}
                                                    <input 
                                                        type="file" 
                                                        ref={(el) => { slideInputRefs.current[index] = el; }} 
                                                        onChange={(e) => handleSlideImageUpload(index, e.target.files[0])} 
                                                        accept="image/*" 
                                                        className="hidden" 
                                                    />
                                                    <div className="flex-1">
                                                        <p className="text-xs text-gray-500">Recommended: 3840×2160 or 7680×4320 (8K)</p>
                                                        <p className="text-xs text-gray-400 mt-1">Upload an image for this slide</p>
                                                        <p className="text-xs text-green-600 mt-1">✓ High-quality IndexedDB storage</p>
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            <div>
                                                <label className="block text-sm font-medium mb-2 dark:text-white">Background Color</label>
                                                <select 
                                                    value={slide.color} 
                                                    onChange={(e) => handleSlideChange(index, 'color', e.target.value)} 
                                                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-600 dark:text-white"
                                                >
                                                    <option value="from-blue-600">Blue</option>
                                                    <option value="from-purple-600">Purple</option>
                                                    <option value="from-pink-600">Pink</option>
                                                    <option value="from-red-600">Red</option>
                                                    <option value="from-green-600">Green</option>
                                                    <option value="from-gray-800">Gray</option>
                                                    <option value="from-orange-500">Orange</option>
                                                    <option value="from-teal-500">Teal</option>
                                                </select>
                                            </div>
                                            
                                            <div>
                                                <label className="block text-sm font-medium mb-2 dark:text-white">Title</label>
                                                <input 
                                                    type="text" 
                                                    value={slide.title} 
                                                    onChange={(e) => handleSlideChange(index, 'title', e.target.value)} 
                                                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-600 dark:text-white" 
                                                    placeholder="Slide Title"
                                                />
                                            </div>
                                            
                                            <div>
                                                <label className="block text-sm font-medium mb-2 dark:text-white">Subtitle</label>
                                                <input 
                                                    type="text" 
                                                    value={slide.subtitle} 
                                                    onChange={(e) => handleSlideChange(index, 'subtitle', e.target.value)} 
                                                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-600 dark:text-white" 
                                                    placeholder="Slide Subtitle"
                                                />
                                            </div>
                                            
                                            <div>
                                                <label className="block text-sm font-medium mb-2 dark:text-white">Button Text</label>
                                                <input 
                                                    type="text" 
                                                    value={slide.buttonText} 
                                                    onChange={(e) => handleSlideChange(index, 'buttonText', e.target.value)} 
                                                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-600 dark:text-white" 
                                                    placeholder="Shop Now"
                                                />
                                            </div>
                                            
                                            <div>
                                                <label className="block text-sm font-medium mb-2 dark:text-white">Button Link</label>
                                                <input 
                                                    type="text" 
                                                    value={slide.buttonLink} 
                                                    onChange={(e) => handleSlideChange(index, 'buttonLink', e.target.value)} 
                                                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-600 dark:text-white" 
                                                    placeholder="/collections/all"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Authentication Page Settings */}
            {activeTab === "authentication" && (
                <div className="space-y-6">
                    <section className="relative overflow-hidden rounded-[28px] border border-[#203b68] bg-gradient-to-br from-[#07182f] via-[#0a2858] to-[#123d7a] p-6 text-white shadow-[0_28px_75px_rgba(7,24,47,.24)] sm:p-8">
                        <div className="pointer-events-none absolute -right-24 -top-28 h-72 w-72 rounded-full bg-orange-500/25 blur-3xl" />
                        <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
                            <div>
                                <p className="text-xs font-bold tracking-[.24em] text-orange-300">ZAMED AUTH EXPERIENCE</p>
                                <h2 className="mt-3 text-3xl font-black sm:text-4xl">Login & Register Design</h2>
                                <p className="mt-3 max-w-2xl text-sm leading-6 text-white/65">
                                    Control both authentication pages, their messaging, colours and responsive background artwork from one place.
                                </p>
                            </div>
                            <div className="rounded-2xl border border-white/15 bg-white/10 px-5 py-4 text-sm backdrop-blur-xl">
                                <p className="font-semibold">Live connection</p>
                                <p className="mt-1 text-white/60">Changes publish through authSettingsUpdated.</p>
                            </div>
                        </div>
                    </section>

                    <section className="grid gap-6 xl:grid-cols-[1.15fr_.85fr]">
                        <div className="rounded-[24px] border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                            <div className="mb-6">
                                <h3 className="text-xl font-bold dark:text-white">Authentication artwork</h3>
                                <p className="mt-1 text-sm text-gray-500">Images are compressed and saved safely in IndexedDB.</p>
                            </div>

                            <div className="grid gap-6 md:grid-cols-2">
                                <ImageUploadField
                                    label="Login background"
                                    type="loginBackground"
                                    preview={imagePreviews.loginBackground}
                                    recommended="Landscape image, 1920×1200 recommended"
                                />
                                <ImageUploadField
                                    label="Register background"
                                    type="registerBackground"
                                    preview={imagePreviews.registerBackground}
                                    recommended="Landscape image, 1920×1200 recommended"
                                />
                            </div>

                            <ImageUploadField
                                label="Shared promotional image"
                                type="authSideImage"
                                preview={imagePreviews.authSideImage}
                                recommended="Product, shopping bag or mobile-app artwork; transparent PNG is ideal"
                            />

                            <div className="mt-6 grid gap-6 md:grid-cols-2">
                                <ImageUploadField
                                    label="Login promotional image"
                                    type="loginPromoImage"
                                    preview={imagePreviews.loginPromoImage}
                                    recommended="8K supported. Use a product/lifestyle image with clean composition."
                                />
                                <ImageUploadField
                                    label="Register promotional image"
                                    type="registerPromoImage"
                                    preview={imagePreviews.registerPromoImage}
                                    recommended="8K supported. Use a fashion campaign or shopping image."
                                />
                            </div>
                        </div>

                        <div className="rounded-[24px] border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                            <h3 className="text-xl font-bold dark:text-white">Design controls</h3>
                            <div className="mt-5 space-y-4">
                                <div>
                                    <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-500">Eyebrow text</label>
                                    <input name="authEyebrow" value={settings.authEyebrow} onChange={handleChange} className="w-full rounded-xl border px-4 py-3 dark:border-gray-600 dark:bg-gray-700" />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <label className="rounded-xl border p-3 dark:border-gray-600">
                                        <span className="mb-2 block text-xs font-semibold text-gray-500">Primary colour</span>
                                        <input type="color" name="authPrimaryColor" value={settings.authPrimaryColor} onChange={handleChange} className="h-10 w-full cursor-pointer rounded-lg" />
                                    </label>
                                    <label className="rounded-xl border p-3 dark:border-gray-600">
                                        <span className="mb-2 block text-xs font-semibold text-gray-500">Secondary colour</span>
                                        <input type="color" name="authSecondaryColor" value={settings.authSecondaryColor} onChange={handleChange} className="h-10 w-full cursor-pointer rounded-lg" />
                                    </label>
                                </div>

                                <div className="rounded-2xl border border-gray-200 p-4 dark:border-gray-600">
                                    <div className="flex items-center justify-between gap-4">
                                        <div>
                                            <p className="text-sm font-bold dark:text-white">Use website typography</p>
                                            <p className="mt-1 text-xs text-gray-500">
                                                When enabled, Login & Register automatically follow the same Heading and Body fonts used across your website/profile pages.
                                            </p>
                                        </div>
                                        <input
                                            type="checkbox"
                                            name="authUseSiteTypography"
                                            checked={Boolean(settings.authUseSiteTypography)}
                                            onChange={handleChange}
                                            className="h-5 w-5 accent-orange-500"
                                        />
                                    </div>
                                </div>

                                {!settings.authUseSiteTypography && (
                                    <div className="grid gap-3 md:grid-cols-2">
                                        <div>
                                            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-500">Auth heading font</label>
                                            <select
                                                name="authHeadingFont"
                                                value={settings.authHeadingFont || settings.headingFont}
                                                onChange={handleChange}
                                                className="w-full rounded-xl border px-4 py-3 dark:border-gray-600 dark:bg-gray-700"
                                            >
                                                {FONT_OPTIONS.map(font => (
                                                    <option key={`auth-heading-${font.value}`} value={font.value}>
                                                        {font.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-500">Auth body font</label>
                                            <select
                                                name="authBodyFont"
                                                value={settings.authBodyFont || settings.bodyFont}
                                                onChange={handleChange}
                                                className="w-full rounded-xl border px-4 py-3 dark:border-gray-600 dark:bg-gray-700"
                                            >
                                                {FONT_OPTIONS.map(font => (
                                                    <option key={`auth-body-${font.value}`} value={font.value}>
                                                        {font.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <p className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-500">Authentication text colours</p>
                                    <div className="grid gap-3 sm:grid-cols-2">
                                        {[
                                            ['authTitleColor', 'Title'],
                                            ['authSubtitleColor', 'Subtitle'],
                                            ['authLabelColor', 'Labels'],
                                            ['authInputTextColor', 'Input text'],
                                            ['authPlaceholderColor', 'Placeholder'],
                                            ['authLinkColor', 'Links'],
                                            ['authButtonTextColor', 'Button text'],
                                            ['authMutedTextColor', 'Muted / helper text']
                                        ].map(([name, label]) => (
                                            <label key={name} className="flex items-center justify-between gap-3 rounded-xl border p-3 dark:border-gray-600">
                                                <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">{label}</span>
                                                <input
                                                    type="color"
                                                    name={name}
                                                    value={settings[name] || '#000000'}
                                                    onChange={handleChange}
                                                    className="h-9 w-14 cursor-pointer rounded-lg border-0 bg-transparent"
                                                />
                                            </label>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <div className="mb-2 flex justify-between text-xs font-semibold text-gray-500">
                                        <span>Image overlay</span>
                                        <span>{settings.authOverlayOpacity}%</span>
                                    </div>
                                    <input type="range" min="0" max="90" name="authOverlayOpacity" value={settings.authOverlayOpacity} onChange={handleChange} className="w-full accent-orange-500" />
                                </div>
                                <div>
                                    <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-500">Image position</label>
                                    <select name="authImagePosition" value={settings.authImagePosition} onChange={handleChange} className="w-full rounded-xl border px-4 py-3 dark:border-gray-600 dark:bg-gray-700">
                                        <option value="center">Centre</option>
                                        <option value="top">Top</option>
                                        <option value="bottom">Bottom</option>
                                        <option value="left">Left</option>
                                        <option value="right">Right</option>
                                    </select>
                                </div>
                                {[
                                    ['showAuthBenefits', 'Show shopping benefits'],
                                    ['showGoogleLogin', 'Show Google sign-in'],
                                    ['showFacebookLogin', 'Show Facebook sign-in']
                                ].map(([name, label]) => (
                                    <label key={name} className="flex items-center justify-between rounded-xl border p-3 dark:border-gray-600">
                                        <span className="text-sm font-medium dark:text-white">{label}</span>
                                        <input type="checkbox" name={name} checked={Boolean(settings[name])} onChange={handleChange} className="h-4 w-4 accent-orange-500" />
                                    </label>
                                ))}
                            </div>
                        </div>
                    </section>

                    <section className="grid gap-6 lg:grid-cols-2">
                        {[
                            {
                                title: "Login page content",
                                fields: [
                                    ['loginTitle', 'Main title'],
                                    ['loginSubtitle', 'Subtitle']
                                ]
                            },
                            {
                                title: "Register page content",
                                fields: [
                                    ['registerTitle', 'Main title'],
                                    ['registerSubtitle', 'Subtitle']
                                ]
                            }
                        ].map((group) => (
                            <div key={group.title} className="rounded-[24px] border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                                <h3 className="text-lg font-bold dark:text-white">{group.title}</h3>
                                <div className="mt-5 space-y-4">
                                    {group.fields.map(([name, label]) => (
                                        <div key={name}>
                                            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-500">{label}</label>
                                            {name.endsWith('Subtitle') ? (
                                                <textarea name={name} value={settings[name]} onChange={handleChange} rows="3" className="w-full rounded-xl border px-4 py-3 dark:border-gray-600 dark:bg-gray-700" />
                                            ) : (
                                                <input name={name} value={settings[name]} onChange={handleChange} className="w-full rounded-xl border px-4 py-3 dark:border-gray-600 dark:bg-gray-700" />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </section>

                    <section className="overflow-hidden rounded-[28px] border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800 sm:p-6">
                        <div className="mb-4 flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-bold dark:text-white">Live visual preview</h3>
                                <p className="text-sm text-gray-500">Preview of the customer-facing authentication design.</p>
                            </div>
                        </div>
                        <div className="grid overflow-hidden rounded-[24px] border border-white/20 bg-[#07182f] shadow-2xl lg:grid-cols-2">
                            <div
                                className="relative min-h-[400px] bg-cover p-8 text-white"
                                style={{
                                    backgroundImage: imagePreviews.loginBackground
                                        ? `linear-gradient(rgba(4,15,36,${Number(settings.authOverlayOpacity || 0) / 100}),rgba(4,15,36,${Number(settings.authOverlayOpacity || 0) / 100})),url("${imagePreviews.loginBackground}")`
                                        : `linear-gradient(135deg,${settings.authSecondaryColor},#123d7a)`,
                                    backgroundPosition: settings.authImagePosition
                                }}
                            >
                                <p className="text-xs font-bold tracking-[.24em]" style={{ color: settings.authPrimaryColor }}>{settings.authEyebrow}</p>
                                <h4
                                    className="mt-20 max-w-sm text-5xl font-black"
                                    style={{
                                        color: settings.authTitleColor,
                                        fontFamily: settings.authUseSiteTypography ? settings.headingFont : settings.authHeadingFont
                                    }}
                                >
                                    {settings.loginTitle}
                                </h4>
                                <p
                                    className="mt-4 max-w-sm text-sm leading-6"
                                    style={{
                                        color: settings.authSubtitleColor,
                                        fontFamily: settings.authUseSiteTypography ? settings.bodyFont : settings.authBodyFont
                                    }}
                                >
                                    {settings.loginSubtitle}
                                </p>
                                {imagePreviews.authSideImage && <img src={imagePreviews.authSideImage} alt="" className="absolute bottom-5 right-5 h-36 w-36 object-contain drop-shadow-2xl" />}
                            </div>
                            <div className="bg-[#fbfcff] p-8">
                                <p className="text-xs font-bold tracking-[.2em]" style={{ color: settings.authPrimaryColor }}>MEMBER ACCESS</p>
                                <h4
                                    className="mt-2 text-3xl font-black"
                                    style={{
                                        color: settings.authTitleColor,
                                        fontFamily: settings.authUseSiteTypography ? settings.headingFont : settings.authHeadingFont
                                    }}
                                >
                                    Sign in
                                </h4>
                                <div className="mt-7 space-y-3">
                                    <div className="h-12 rounded-xl border bg-white" />
                                    <div className="h-12 rounded-xl border bg-white" />
                                    <div className="h-12 rounded-xl" style={{ background: settings.authPrimaryColor }} />
                                </div>
                            </div>
                        </div>
                    </section>
                </div>
            )}

            {/* Products Display Settings */}
            {activeTab === "products" && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                    <h2 className="text-xl font-semibold mb-4 border-b pb-2 dark:border-gray-700 flex items-center">
                        <FiPackage className="mr-2 text-blue-600" /> Product Display Settings
                    </h2>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-1 dark:text-white">Products Per Row</label>
                            <select 
                                name="productsPerRow" 
                                value={settings.productsPerRow} 
                                onChange={handleChange} 
                                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            >
                                <option value="2">2 per row</option>
                                <option value="3">3 per row</option>
                                <option value="4">4 per row</option>
                                <option value="5">5 per row</option>
                            </select>
                            <p className="text-xs text-gray-500 mt-1">Select how many products to display per row</p>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2">
                            <label className="flex items-center gap-2 dark:text-white">
                                <input 
                                    type="checkbox" 
                                    name="showProductRatings" 
                                    checked={settings.showProductRatings} 
                                    onChange={handleChange} 
                                    className="w-4 h-4" 
                                />
                                <span>Show Product Ratings</span>
                            </label>
                            <label className="flex items-center gap-2 dark:text-white">
                                <input 
                                    type="checkbox" 
                                    name="showProductColors" 
                                    checked={settings.showProductColors} 
                                    onChange={handleChange} 
                                    className="w-4 h-4" 
                                />
                                <span>Show Product Colors</span>
                            </label>
                            <label className="flex items-center gap-2 dark:text-white">
                                <input 
                                    type="checkbox" 
                                    name="showProductSizes" 
                                    checked={settings.showProductSizes} 
                                    onChange={handleChange} 
                                    className="w-4 h-4" 
                                />
                                <span>Show Product Sizes</span>
                            </label>
                            <label className="flex items-center gap-2 dark:text-white">
                                <input 
                                    type="checkbox" 
                                    name="showSaleBadge" 
                                    checked={settings.showSaleBadge} 
                                    onChange={handleChange} 
                                    className="w-4 h-4" 
                                />
                                <span>Show Sale Badge</span>
                            </label>
                            <label className="flex items-center gap-2 dark:text-white">
                                <input 
                                    type="checkbox" 
                                    name="showQuickAdd" 
                                    checked={settings.showQuickAdd} 
                                    onChange={handleChange} 
                                    className="w-4 h-4" 
                                />
                                <span>Show Quick Add Button</span>
                            </label>
                            <label className="flex items-center gap-2 dark:text-white">
                                <input 
                                    type="checkbox" 
                                    name="showProductBrand" 
                                    checked={settings.showProductBrand} 
                                    onChange={handleChange} 
                                    className="w-4 h-4" 
                                />
                                <span>Show Product Brand</span>
                            </label>
                        </div>
                    </div>
                </div>
            )}

            {/* Design Settings */}
            {activeTab === "design" && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                    <h2 className="text-xl font-semibold mb-4 border-b pb-2 dark:border-gray-700 flex items-center">
                        <FiLayout className="mr-2 text-blue-600" /> Design Settings
                    </h2>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-1 dark:text-white">Card Style</label>
                            <select name="cardStyle" value={settings.cardStyle} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700">
                                <option value="rounded">Rounded</option>
                                <option value="square">Square</option>
                                <option value="soft">Soft Rounded</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1 dark:text-white">Image Hover Effect</label>
                            <select name="imageHoverEffect" value={settings.imageHoverEffect} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700">
                                <option value="scale">Scale</option>
                                <option value="zoom">Zoom</option>
                                <option value="none">None</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1 dark:text-white">Button Style</label>
                            <select name="buttonStyle" value={settings.buttonStyle} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700">
                                <option value="solid">Solid</option>
                                <option value="outline">Outline</option>
                                <option value="ghost">Ghost</option>
                            </select>
                        </div>
                        <div>
                            <label className="flex items-center gap-2 dark:text-white">
                                <input type="checkbox" name="enableAnimations" checked={settings.enableAnimations} onChange={handleChange} className="w-4 h-4" />
                                <span>Enable Animations</span>
                            </label>
                        </div>
                    </div>
                </div>
            )}

            {/* Typography Settings */}
            {activeTab === "typography" && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                    <h2 className="text-xl font-semibold mb-4 border-b pb-2 dark:border-gray-700 flex items-center">
                        <FiType className="mr-2 text-blue-600" /> Typography Settings
                    </h2>
                    <div className="space-y-6">
                        <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                            <h3 className="font-semibold mb-3 dark:text-white">Font Preview</h3>
                            <div style={{ fontFamily: settings.primaryFont }}>
                                <p className="text-2xl font-bold">Primary Font Sample</p>
                                <p className="text-lg">The quick brown fox jumps over the lazy dog.</p>
                            </div>
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium mb-2 dark:text-white">Primary Font (Global)</label>
                            <select name="primaryFont" value={settings.primaryFont} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700">
                                {FONT_OPTIONS.map(font => (
                                    <option key={font.value} value={font.value} style={{ fontFamily: font.value }}>
                                        {font.label} - {font.category}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2 dark:text-white">Heading Font</label>
                            <select name="headingFont" value={settings.headingFont} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700">
                                {FONT_OPTIONS.map(font => (
                                    <option key={font.value} value={font.value} style={{ fontFamily: font.value }}>
                                        {font.label} - {font.category}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2 dark:text-white">Body Font</label>
                            <select name="bodyFont" value={settings.bodyFont} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700">
                                {FONT_OPTIONS.map(font => (
                                    <option key={font.value} value={font.value} style={{ fontFamily: font.value }}>
                                        {font.label} - {font.category}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2 dark:text-white">Font Size Scale</label>
                            <select name="fontScale" value={settings.fontScale} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700">
                                {fontScaleOptions.map(option => (
                                    <option key={option.value} value={option.value}>
                                        {option.label} ({option.scale})
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>
            )}

            {/* SEO Settings */}
            {activeTab === "seo" && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                    <h2 className="text-xl font-semibold mb-4 border-b pb-2 dark:border-gray-700 flex items-center">
                        <FiMonitor className="mr-2 text-blue-600" /> SEO Settings
                    </h2>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-1 dark:text-white">Meta Title</label>
                            <input type="text" name="metaTitle" value={settings.metaTitle} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700" />
                            <p className="text-xs text-gray-500 mt-1">Recommended length: 50-60 characters</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1 dark:text-white">Meta Description</label>
                            <textarea name="metaDescription" value={settings.metaDescription} onChange={handleChange} rows="3" className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700" />
                            <p className="text-xs text-gray-500 mt-1">Recommended length: 150-160 characters</p>
                        </div>
                        <div>
                            <label className="flex items-center gap-2 dark:text-white">
                                <input type="checkbox" name="enableSitemap" checked={settings.enableSitemap} onChange={handleChange} className="w-4 h-4" />
                                <span>Enable Sitemap</span>
                            </label>
                        </div>
                    </div>
                </div>
            )}

            {/* Save Button */}
            <div className="mt-6 flex justify-end">
                <button 
                    onClick={saveSettings} 
                    disabled={isSaving || uploading} 
                    className="bg-blue-600 text-white px-8 py-3 rounded-lg flex items-center gap-2 hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                    {uploading ? (
                        <>
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                            <span>Uploading...</span>
                        </>
                    ) : isSaving ? (
                        <>
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                            <span>Saving...</span>
                        </>
                    ) : (
                        <>
                            <FiSave /> <span>Save All Settings</span>
                        </>
                    )}
                </button>
            </div>

            {/* Image Cropper Modal */}
            {cropImage && (
                <ImageCropper 
                    image={cropImage}
                    cropType={cropType}
                    aspectRatio={
                        cropType === 'favicon' ||
                        cropType === 'logo' ||
                        cropType === 'footerLogo'
                            ? 1
                            : cropType === 'slide'
                                ? 16 / 9
                                : null
                    }
                    onCropComplete={handleCropComplete} 
                    onClose={() => { 
                        setCropImage(null); 
                        setCropType(null); 
                        setCropSlideId(null); 
                    }} 
                />
            )}
        </div>
    );
};

export default Settings;