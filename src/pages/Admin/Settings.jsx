// src/pages/Admin/Settings.jsx
import { useState, useEffect, useRef } from "react";
import { 
    FiSave, FiGlobe, FiMail, FiCreditCard, FiTruck, FiShield, 
    FiBell, FiUser, FiImage, FiUpload, FiX, FiEdit2, FiRefreshCw,
    FiPlus, FiTrash2, FiAlertCircle, FiPackage, FiStar, FiInfo,
    FiHeart, FiLayout, FiType, FiMonitor, FiShoppingCart, FiSettings as FiSettingsIcon,
    FiFileText, FiList, FiTruck as FiTruckIcon, FiMapPin, FiPhone,
    FiTwitter, FiFacebook, FiInstagram, FiYoutube, FiLinkedin, FiCheck,
    FiDollarSign, FiDroplet, FiAlignLeft, FiBold, FiItalic, FiUnderline,
    FiUsers
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

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
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
    'registerPromoImage',
    'genderMenBackground',
    'genderWomenBackground',
    'genderKidsBackground'
];

const IMAGE_ID_FIELDS = IMAGE_TYPES.reduce((acc, type) => {
    acc[type] = `${type}Id`;
    return acc;
}, {});

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

const getToken = () =>
    localStorage.getItem('token') || localStorage.getItem('authToken') || '';

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
        logoId: null,
        footerLogo: null,
        footerLogoId: null,
        favicon: null,
        faviconId: null,
        loginBackground: null,
        loginBackgroundId: null,
        registerBackground: null,
        registerBackgroundId: null,
        authSideImage: null,
        authSideImageId: null,
        loginPromoImage: null,
        loginPromoImageId: null,
        registerPromoImage: null,
        registerPromoImageId: null,
        // Gender Collection Backgrounds
        genderMenBackground: null,
        genderMenBackgroundId: null,
        genderWomenBackground: null,
        genderWomenBackgroundId: null,
        genderKidsBackground: null,
        genderKidsBackgroundId: null,
        genderMenOverlayOpacity: 40,
        genderWomenOverlayOpacity: 40,
        genderKidsOverlayOpacity: 40,
        genderMenTextColor: "#ffffff",
        genderWomenTextColor: "#ffffff",
        genderKidsTextColor: "#ffffff",
        genderMenAccentColor: "#B9853F",
        genderWomenAccentColor: "#C57887",
        genderKidsAccentColor: "#93A562",
        slides: [
            { id: 1, title: "Zamed Premium Collection", subtitle: "Discover the latest fashion trends", buttonText: "Shop Now", buttonLink: "/collections/all", image: null, imageId: null, color: "from-blue-600", active: true, order: 1 },
            { id: 2, title: "Men's Premium Collection", subtitle: "Elevate your style with our new arrivals", buttonText: "Explore Men", buttonLink: "/collections/men", image: null, imageId: null, color: "from-gray-800", active: true, order: 2 },
            { id: 3, title: "Women's Elegant Collection", subtitle: "Timeless pieces for every occasion", buttonText: "Explore Women", buttonLink: "/collections/women", image: null, imageId: null, color: "from-pink-600", active: true, order: 3 }
        ],
        slideImageIds: {},
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
        showFacebookLogin: true
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
        registerPromoImage: null,
        genderMenBackground: null,
        genderWomenBackground: null,
        genderKidsBackground: null
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
    
    const logoInputRef = useRef(null);
    const footerLogoInputRef = useRef(null);
    const faviconInputRef = useRef(null);
    const loginBackgroundInputRef = useRef(null);
    const registerBackgroundInputRef = useRef(null);
    const authSideImageInputRef = useRef(null);
    const loginPromoImageInputRef = useRef(null);
    const registerPromoImageInputRef = useRef(null);
    const genderMenInputRef = useRef(null);
    const genderWomenInputRef = useRef(null);
    const genderKidsInputRef = useRef(null);
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
        genderMenBackground: genderMenInputRef,
        genderWomenBackground: genderWomenInputRef,
        genderKidsBackground: genderKidsInputRef,
        slide: slideInputRefs.current
    };

    useEffect(() => {
        const checkDarkMode = () => {
            const isDark = document.documentElement.classList.contains('dark');
            setDarkMode(isDark);
        };
        checkDarkMode();
        loadSettings();
    }, []);

    // ============================================================
    // COMPRESS IMAGE HELPER
    // ============================================================
    const compressImage = (base64String, maxWidth = 4096, quality = 0.94, preferredMimeType = null) => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                try {
                    const sourceWidth = img.naturalWidth || img.width;
                    const sourceHeight = img.naturalHeight || img.height;
                    const width = Math.min(sourceWidth, maxWidth);
                    const ratio = width / sourceWidth;
                    const height = Math.max(1, Math.round(sourceHeight * ratio));
                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d', { alpha: preferredMimeType === 'image/png' });
                    if (!ctx) { reject(new Error('Canvas is unavailable.')); return; }
                    ctx.imageSmoothingEnabled = true;
                    ctx.imageSmoothingQuality = 'high';
                    const sourceIsTransparent = base64String.startsWith('data:image/png') || base64String.startsWith('data:image/webp');
                    const mimeType = preferredMimeType || (sourceIsTransparent ? 'image/png' : 'image/jpeg');
                    if (mimeType === 'image/jpeg') {
                        ctx.fillStyle = '#ffffff';
                        ctx.fillRect(0, 0, width, height);
                    }
                    ctx.drawImage(img, 0, 0, sourceWidth, sourceHeight, 0, 0, width, height);
                    resolve(canvas.toDataURL(mimeType, quality));
                } catch (error) { reject(error); }
            };
            img.onerror = () => reject(new Error('Failed to load image for processing.'));
            img.src = base64String;
        });
    };

    const getCompressionSettings = (type) => {
        if (type === 'favicon') return { maxWidth: 512, quality: 1, mimeType: 'image/png' };
        if (type === 'logo' || type === 'footerLogo') return { maxWidth: 2048, quality: 1, mimeType: 'image/png' };
        if (['loginBackground', 'registerBackground', 'authSideImage', 'loginPromoImage', 'registerPromoImage'].includes(type)) {
            return { maxWidth: 7680, quality: 0.97, mimeType: 'image/jpeg' };
        }
        if (String(type).startsWith('slide_')) {
            return { maxWidth: 7680, quality: 0.97, mimeType: 'image/jpeg' };
        }
        if (['genderMenBackground', 'genderWomenBackground', 'genderKidsBackground'].includes(type)) {
            return { maxWidth: 7680, quality: 0.97, mimeType: 'image/jpeg' };
        }
        return { maxWidth: 4096, quality: 0.95, mimeType: null };
    };

    // ============================================================
    // UPLOAD TO CLOUDINARY
    // ============================================================
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
                imageUrl: result.imageUrl,
                publicId: result.publicId || result.filename || null
            };
        } catch (error) {
            console.error('Upload error:', error);
            throw error;
        }
    };

    // ============================================================
    // DELETE FROM CLOUDINARY
    // ============================================================
    const deleteImage = async (publicId) => {
        if (!publicId) return true;
        try {
            const token = getToken();
            if (!token) throw new Error('Please sign in again before deleting this image.');

            const response = await fetch(`${API_URL}/uploads/image`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ publicId })
            });
            const result = await response.json().catch(() => ({}));
            if (!response.ok || !result.success) {
                throw new Error(result.message || 'Unable to delete Cloudinary image.');
            }
            return true;
        } catch (error) {
            console.error('Delete error:', error);
            return false;
        }
    };

    // ============================================================
    // UPDATE FAVICON IN BROWSER
    // ============================================================
    const updateFaviconInBrowser = (faviconUrl) => {
        if (!faviconUrl) return;
        try {
            let link = document.querySelector("link[rel*='icon']");
            if (!link) {
                link = document.createElement('link');
                link.rel = 'shortcut icon';
                document.head.appendChild(link);
            }
            link.type = faviconUrl.startsWith('data:image/png') ? 'image/png' : 'image/x-icon';
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

    // ============================================================
    // SAVE TO LOCAL STORAGE (Cloudinary URLs)
    // ============================================================
    const saveToLocalStorage = async (sourceSettings = settings) => {
        const current = sourceSettings;

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
            authSettings: {
                authEyebrow: current.authEyebrow,
                loginTitle: current.loginTitle,
                loginSubtitle: current.loginSubtitle,
                registerTitle: current.registerTitle,
                registerSubtitle: current.registerSubtitle,
                loginBackground: current.loginBackground,
                registerBackground: current.registerBackground,
                authSideImage: current.authSideImage,
                loginPromoImage: current.loginPromoImage,
                registerPromoImage: current.registerPromoImage,
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
                showAuthBenefits: current.showAuthBenefits,
                showGoogleLogin: current.showGoogleLogin,
                showFacebookLogin: current.showFacebookLogin
            },
            // Cloudinary URLs
            logo: current.logo,
            logoId: current.logoId,
            footerLogo: current.footerLogo,
            footerLogoId: current.footerLogoId,
            favicon: current.favicon,
            faviconId: current.faviconId,
            loginBackground: current.loginBackground,
            loginBackgroundId: current.loginBackgroundId,
            registerBackground: current.registerBackground,
            registerBackgroundId: current.registerBackgroundId,
            authSideImage: current.authSideImage,
            authSideImageId: current.authSideImageId,
            loginPromoImage: current.loginPromoImage,
            loginPromoImageId: current.loginPromoImageId,
            registerPromoImage: current.registerPromoImage,
            registerPromoImageId: current.registerPromoImageId,
            // Gender Collection Backgrounds
            genderMenBackground: current.genderMenBackground,
            genderMenBackgroundId: current.genderMenBackgroundId,
            genderWomenBackground: current.genderWomenBackground,
            genderWomenBackgroundId: current.genderWomenBackgroundId,
            genderKidsBackground: current.genderKidsBackground,
            genderKidsBackgroundId: current.genderKidsBackgroundId,
            genderMenOverlayOpacity: current.genderMenOverlayOpacity,
            genderWomenOverlayOpacity: current.genderWomenOverlayOpacity,
            genderKidsOverlayOpacity: current.genderKidsOverlayOpacity,
            genderMenTextColor: current.genderMenTextColor,
            genderWomenTextColor: current.genderWomenTextColor,
            genderKidsTextColor: current.genderKidsTextColor,
            genderMenAccentColor: current.genderMenAccentColor,
            genderWomenAccentColor: current.genderWomenAccentColor,
            genderKidsAccentColor: current.genderKidsAccentColor,
            // Slides with Cloudinary URLs
            slides: (current.slides || []).map((slide) => ({
                ...slide,
                image: slide.image || null,
                imageId: slide.imageId || current.slideImageIds?.[slide.id] || null
            }))
        };

        // Save to localStorage
        localStorage.setItem('site_info', JSON.stringify(siteInfoData));
        localStorage.setItem('site_settings', JSON.stringify(current));
        
        // Also save images separately
        const imageManifest = {
            logo: current.logo,
            logoId: current.logoId,
            footerLogo: current.footerLogo,
            footerLogoId: current.footerLogoId,
            favicon: current.favicon,
            faviconId: current.faviconId,
            loginBackground: current.loginBackground,
            loginBackgroundId: current.loginBackgroundId,
            registerBackground: current.registerBackground,
            registerBackgroundId: current.registerBackgroundId,
            authSideImage: current.authSideImage,
            authSideImageId: current.authSideImageId,
            loginPromoImage: current.loginPromoImage,
            loginPromoImageId: current.loginPromoImageId,
            registerPromoImage: current.registerPromoImage,
            registerPromoImageId: current.registerPromoImageId,
            genderMenBackground: current.genderMenBackground,
            genderMenBackgroundId: current.genderMenBackgroundId,
            genderWomenBackground: current.genderWomenBackground,
            genderWomenBackgroundId: current.genderWomenBackgroundId,
            genderKidsBackground: current.genderKidsBackground,
            genderKidsBackgroundId: current.genderKidsBackgroundId,
            slides: (current.slides || []).map((slide) => ({
                id: slide.id,
                image: slide.image || null,
                imageId: slide.imageId || current.slideImageIds?.[slide.id] || null,
                title: slide.title,
                subtitle: slide.subtitle,
                buttonText: slide.buttonText,
                buttonLink: slide.buttonLink,
                color: slide.color,
                active: slide.active,
                order: slide.order
            }))
        };
        localStorage.setItem('site_images', JSON.stringify(imageManifest));

        // Update favicon
        if (current.favicon) {
            updateFaviconInBrowser(current.favicon);
        }

        // Dispatch events
        window.dispatchEvent(new Event('storage'));
        window.dispatchEvent(new CustomEvent('settingsSaved', { detail: current }));
        window.dispatchEvent(new CustomEvent('siteInfoUpdated', { detail: siteInfoData }));
        window.dispatchEvent(new CustomEvent('siteImagesUpdated', { detail: imageManifest }));
        window.dispatchEvent(new CustomEvent('heroSlidesUpdated', { detail: { slides: siteInfoData.slides } }));
        
        if (current.logo) {
            window.dispatchEvent(new CustomEvent('logoUpdated', { 
                detail: { logo: current.logo, logoId: current.logoId } 
            }));
        }
        if (current.favicon) {
            window.dispatchEvent(new CustomEvent('faviconUpdated', { 
                detail: { favicon: current.favicon, faviconId: current.faviconId } 
            }));
        }

        console.log('✅ Settings saved with Cloudinary URLs');
        return true;
    };

    // ============================================================
    // LOAD SETTINGS
    // ============================================================
    const loadSettings = async () => {
        setLoading(true);
        setError(null);

        try {
            const savedSiteInfo = JSON.parse(localStorage.getItem('site_info') || '{}');
            const savedSettings = JSON.parse(localStorage.getItem('site_settings') || '{}');
            const savedImages = JSON.parse(localStorage.getItem('site_images') || '{}');

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

            // Merge all settings
            const mergedSettings = {
                ...settings,
                ...savedSettings,
                ...savedSiteInfo,
                ...(savedSiteInfo.authSettings || {}),
                ...backendSettings,
                ...(backendSettings.authSettings || {}),
                // Cloudinary URLs
                logo: savedSiteInfo.logo || savedImages.logo || savedSettings.logo || null,
                logoId: savedSiteInfo.logoId || savedImages.logoId || savedSettings.logoId || null,
                footerLogo: savedSiteInfo.footerLogo || savedImages.footerLogo || savedSettings.footerLogo || null,
                footerLogoId: savedSiteInfo.footerLogoId || savedImages.footerLogoId || savedSettings.footerLogoId || null,
                favicon: savedSiteInfo.favicon || savedImages.favicon || savedSettings.favicon || null,
                faviconId: savedSiteInfo.faviconId || savedImages.faviconId || savedSettings.faviconId || null,
                loginBackground: savedSiteInfo.loginBackground || savedImages.loginBackground || null,
                loginBackgroundId: savedSiteInfo.loginBackgroundId || savedImages.loginBackgroundId || null,
                registerBackground: savedSiteInfo.registerBackground || savedImages.registerBackground || null,
                registerBackgroundId: savedSiteInfo.registerBackgroundId || savedImages.registerBackgroundId || null,
                authSideImage: savedSiteInfo.authSideImage || savedImages.authSideImage || null,
                authSideImageId: savedSiteInfo.authSideImageId || savedImages.authSideImageId || null,
                loginPromoImage: savedSiteInfo.loginPromoImage || savedImages.loginPromoImage || null,
                loginPromoImageId: savedSiteInfo.loginPromoImageId || savedImages.loginPromoImageId || null,
                registerPromoImage: savedSiteInfo.registerPromoImage || savedImages.registerPromoImage || null,
                registerPromoImageId: savedSiteInfo.registerPromoImageId || savedImages.registerPromoImageId || null,
                genderMenBackground: savedSiteInfo.genderMenBackground || savedImages.genderMenBackground || null,
                genderMenBackgroundId: savedSiteInfo.genderMenBackgroundId || savedImages.genderMenBackgroundId || null,
                genderWomenBackground: savedSiteInfo.genderWomenBackground || savedImages.genderWomenBackground || null,
                genderWomenBackgroundId: savedSiteInfo.genderWomenBackgroundId || savedImages.genderWomenBackgroundId || null,
                genderKidsBackground: savedSiteInfo.genderKidsBackground || savedImages.genderKidsBackground || null,
                genderKidsBackgroundId: savedSiteInfo.genderKidsBackgroundId || savedImages.genderKidsBackgroundId || null,
                genderMenOverlayOpacity: savedSiteInfo.genderMenOverlayOpacity || 40,
                genderWomenOverlayOpacity: savedSiteInfo.genderWomenOverlayOpacity || 40,
                genderKidsOverlayOpacity: savedSiteInfo.genderKidsOverlayOpacity || 40,
                genderMenTextColor: savedSiteInfo.genderMenTextColor || "#ffffff",
                genderWomenTextColor: savedSiteInfo.genderWomenTextColor || "#ffffff",
                genderKidsTextColor: savedSiteInfo.genderKidsTextColor || "#ffffff",
                genderMenAccentColor: savedSiteInfo.genderMenAccentColor || "#B9853F",
                genderWomenAccentColor: savedSiteInfo.genderWomenAccentColor || "#C57887",
                genderKidsAccentColor: savedSiteInfo.genderKidsAccentColor || "#93A562",
                slides: savedSiteInfo.slides || savedImages.slides || savedSettings.slides || []
            };

            // Set image previews
            setImagePreviews({
                logo: mergedSettings.logo || null,
                footerLogo: mergedSettings.footerLogo || null,
                favicon: mergedSettings.favicon || null,
                loginBackground: mergedSettings.loginBackground || null,
                registerBackground: mergedSettings.registerBackground || null,
                authSideImage: mergedSettings.authSideImage || null,
                loginPromoImage: mergedSettings.loginPromoImage || null,
                registerPromoImage: mergedSettings.registerPromoImage || null,
                genderMenBackground: mergedSettings.genderMenBackground || null,
                genderWomenBackground: mergedSettings.genderWomenBackground || null,
                genderKidsBackground: mergedSettings.genderKidsBackground || null
            });

            // Set slide images
            const slideImagesMap = {};
            if (mergedSettings.slides) {
                mergedSettings.slides.forEach((slide, index) => {
                    if (slide.image) {
                        slideImagesMap[index] = slide.image;
                    }
                });
            }
            setSlideImages(slideImagesMap);

            setSettings(mergedSettings);
            setSiteNameInput(mergedSettings.siteName || settings.siteName);

            // Update favicon
            if (mergedSettings.favicon) {
                updateFaviconInBrowser(mergedSettings.favicon);
            }

            console.log('✅ Settings loaded with Cloudinary URLs');
        } catch (error) {
            console.error("Error loading settings:", error);
            setError("Failed to load settings. Using default settings.");
        } finally {
            setLoading(false);
        }
    };

    // ============================================================
    // HANDLE IMAGE UPLOAD
    // ============================================================
    const handleImageUpload = (type, file) => {
        if (!file) return;
        if (!file.type?.startsWith('image/')) {
            toast.error('Please select a valid image file.');
            return;
        }
        if (file.size > MAX_UPLOAD_BYTES) {
            toast.error('Image must be less than 5MB.');
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            setCropImage(reader.result);
            setCropType(type);
            setCropSlideId(null);
        };
        reader.onerror = () => toast.error("Unable to read this image.");
        reader.readAsDataURL(file);
    };

    // ============================================================
    // HANDLE CROP COMPLETE - Upload to Cloudinary
    // ============================================================
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

            const imageUrl = result.imageUrl;
            const publicId = result.publicId;
            const idField = `${selectedType}Id`;
            const previousId = settings[idField];

            // Delete old image from Cloudinary
            if (previousId) {
                await deleteImage(previousId);
            }

            const nextSettings = {
                ...settings,
                [selectedType]: imageUrl,
                [idField]: publicId
            };

            setSettings(nextSettings);
            setImagePreviews((current) => ({
                ...current,
                [selectedType]: imageUrl
            }));
            await saveToLocalStorage(nextSettings);

            if (selectedType === 'favicon') {
                updateFaviconInBrowser(imageUrl);
            }

            toast.success(`${selectedType.replace(/([A-Z])/g, ' $1').trim()} updated.`, { id: toastId });
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

    // ============================================================
    // HANDLE SLIDE IMAGE CROP COMPLETE
    // ============================================================
    const handleSlideImageCropComplete = async (croppedImage) => {
        if (cropSlideId === null || !settings.slides?.[cropSlideId]) {
            toast.error("The selected hero slide is no longer available.");
            return;
        }

        setUploading(true);
        const toastId = toast.loading("Processing hero image...");

        try {
            const slide = settings.slides[cropSlideId];
            const result = await uploadImage(croppedImage, `slide_${slide.id}`);

            const imageUrl = result.imageUrl;
            const publicId = result.publicId;

            // Delete old slide image
            const oldImageId = slide.imageId || settings.slideImageIds?.[slide.id];
            if (oldImageId) {
                await deleteImage(oldImageId);
            }

            const updatedSlides = settings.slides.map((s, index) =>
                index === cropSlideId
                    ? { ...s, image: imageUrl, imageId: publicId }
                    : s
            );

            const updatedImageIds = { ...(settings.slideImageIds || {}) };
            if (publicId) {
                updatedImageIds[slide.id] = publicId;
            } else {
                delete updatedImageIds[slide.id];
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

            toast.success("Hero image uploaded.", { id: toastId });
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

    // ============================================================
    // REMOVE IMAGE
    // ============================================================
    const removeImage = async (type) => {
        const idField = `${type}Id`;
        const imageId = settings[idField];

        if (imageId) {
            await deleteImage(imageId);
        }

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
        toast.info(`${type.replace(/([A-Z])/g, ' $1').trim()} removed`);
    };

    // ============================================================
    // REMOVE SLIDE IMAGE
    // ============================================================
    const removeSlideImage = async (index) => {
        const slide = settings.slides[index];
        if (!slide) return;

        const imageId = slide.imageId || settings.slideImageIds?.[slide.id];

        if (imageId) {
            await deleteImage(imageId);
        }

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
        toast.info("Hero image removed");
    };

    // ============================================================
    // HANDLE SLIDE IMAGE UPLOAD
    // ============================================================
    const handleSlideImageUpload = (index, file) => {
        if (!file) return;
        if (!file.type?.startsWith('image/')) {
            toast.error('Please select a valid image file.');
            return;
        }
        if (file.size > MAX_UPLOAD_BYTES) {
            toast.error('Image must be less than 5MB.');
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            setCropImage(reader.result);
            setCropType("slide");
            setCropSlideId(index);
        };
        reader.onerror = () => toast.error("Unable to read this image.");
        reader.readAsDataURL(file);
    };

    // ============================================================
    // ADD NEW SLIDE
    // ============================================================
    const addNewSlide = () => {
        const newSlide = {
            id: Date.now() + Math.random(),
            title: "New Slide",
            subtitle: "Add your description here",
            buttonText: "Shop Now",
            buttonLink: "/collections/all",
            image: null,
            imageId: null,
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

    // ============================================================
    // REMOVE SLIDE
    // ============================================================
    const removeSlide = async (index) => {
        if (settings.slides.length <= 1) {
            toast.error("You need at least one slide");
            return;
        }

        const slide = settings.slides[index];
        const imageId = slide.imageId || settings.slideImageIds?.[slide.id];

        if (imageId) {
            await deleteImage(imageId);
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

    // ============================================================
    // TOGGLE SLIDE ACTIVE
    // ============================================================
    const toggleSlideActive = (index) => {
        const updatedSlides = [...settings.slides];
        updatedSlides[index] = { ...updatedSlides[index], active: !updatedSlides[index].active };
        setSettings(prev => ({ ...prev, slides: updatedSlides }));
        toast.success(`✅ Slide ${updatedSlides[index].active ? 'activated' : 'deactivated'}`);
    };

    // ============================================================
    // HANDLE CHANGE
    // ============================================================
    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        const numericFields = new Set(['authOverlayOpacity', 'productsPerRow', 'itemsPerPage', 'animationDuration', 'genderMenOverlayOpacity', 'genderWomenOverlayOpacity', 'genderKidsOverlayOpacity']);
        const newValue = type === 'checkbox'
            ? checked
            : numericFields.has(name)
                ? Number(value)
                : value;
        setSettings(prev => ({ ...prev, [name]: newValue }));
    };

    // ============================================================
    // HANDLE COLOR CHANGE
    // ============================================================
    const handleColorChange = (e) => {
        const { name, value } = e.target;
        setSettings(prev => ({ ...prev, [name]: value }));
    };

    // ============================================================
    // HANDLE CURRENCY CHANGE
    // ============================================================
    const handleCurrencyChange = (currencyCode) => {
        setSettings(prev => ({ ...prev, currency: currencyCode }));
        const selectedCurrency = currencyOptions.find(c => c.code === currencyCode);
        window.dispatchEvent(new CustomEvent('currencyChanged', {
            detail: { currency: currencyCode, symbol: selectedCurrency?.symbol }
        }));
    };

    // ============================================================
    // HANDLE SLIDE CHANGE
    // ============================================================
    const handleSlideChange = (index, field, value) => {
        const updatedSlides = [...settings.slides];
        updatedSlides[index] = { ...updatedSlides[index], [field]: value };
        setSettings(prev => ({ ...prev, slides: updatedSlides }));
    };

    // ============================================================
    // SAVE SETTINGS
    // ============================================================
    const saveSettings = async () => {
        setIsSaving(true);
        try {
            await saveToLocalStorage();

            const token = getToken();
            if (token) {
                try {
                    const backendData = { ...settings };
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
                    toast.warning("Settings saved locally only. Server unavailable.");
                }
            } else {
                throw new Error('Your admin session has expired. Please sign in again.');
            }

            setLastSaved(new Date());
        } catch (error) {
            console.error("Error saving settings:", error);
            toast.error(error.message || "Failed to save settings. Please try again.");
        } finally {
            setIsSaving(false);
        }
    };

    // ============================================================
    // IMAGE UPLOAD FIELD COMPONENT
    // ============================================================
    const ImageUploadField = ({ label, type, preview, recommended, className = "" }) => (
        <div className={`mb-4 ${className}`}>
            <label className="block text-sm font-medium mb-2 dark:text-white">{label}</label>
            <div className="flex items-start space-x-4">
                {preview ? (
                    <div className="relative group">
                        <img
                            src={preview}
                            alt={label}
                            className={`${type === 'favicon' ? 'w-16 h-16' : ['loginBackground', 'registerBackground', 'authSideImage', 'loginPromoImage', 'registerPromoImage', 'genderMenBackground', 'genderWomenBackground', 'genderKidsBackground'].includes(type) ? 'w-52 h-32' : 'w-32 h-32'} object-cover rounded-lg border-2 border-gray-200 bg-gray-50 dark:bg-gray-700`}
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
                        className={`${type === 'favicon' ? 'w-16 h-16' : ['loginBackground', 'registerBackground', 'authSideImage', 'loginPromoImage', 'registerPromoImage', 'genderMenBackground', 'genderWomenBackground', 'genderKidsBackground'].includes(type) ? 'w-52 h-32' : 'w-32 h-32'} border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all`}
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
                    <p className="text-xs text-green-600 mt-1">✓ Securely stored in Cloudinary</p>
                </div>
            </div>
        </div>
    );

    // ============================================================
    // RENDER
    // ============================================================
    const tabs = [
        { id: "general", label: "General", icon: FiGlobe },
        { id: "hero", label: "Hero Slider", icon: FiImage },
        { id: "authentication", label: "Login & Register", icon: FiUser },
        { id: "gender_collections", label: "Gender Collections", icon: FiUsers },
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
                    <p className="text-gray-500 dark:text-gray-400 text-sm">Cloudinary storage for logo, favicon, hero, and authentication artwork</p>
                    {lastSaved && <p className="text-xs text-green-600 mt-1">Last saved: {lastSaved.toLocaleTimeString()}</p>}
                    {!backendAvailable && (
                        <p className="text-xs text-yellow-600 mt-1">⚠️ Working in offline mode (backend unavailable)</p>
                    )}
                </div>
                <div className="flex gap-3 flex-wrap">
                    <button onClick={() => {
                        ['site_settings', 'site_info', 'site_images'].forEach(key => localStorage.removeItem(key));
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
                                onChange={(e) => {
                                    const newName = e.target.value;
                                    setSiteNameInput(newName);
                                    setSettings(prev => ({ ...prev, siteName: newName }));
                                }}
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
                                                        <p className="text-xs text-green-600 mt-1">✓ Securely stored in Cloudinary</p>
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

            {/* Gender Collections Settings */}
            {activeTab === "gender_collections" && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                    <h2 className="text-xl font-semibold mb-4 border-b pb-2 dark:border-gray-700 flex items-center">
                        <FiUsers className="mr-2 text-blue-600" /> Gender Collection Backgrounds
                    </h2>
                    <p className="text-sm text-gray-500 mb-6 dark:text-gray-400">
                        Upload 3D-style background images for each gender collection card. These will be displayed with parallax effects.
                    </p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Men Collection */}
                        <div className="border rounded-lg p-4 dark:border-gray-700">
                            <h3 className="font-semibold text-lg mb-3 dark:text-white flex items-center gap-2">
                                <span className="text-[#B9853F]">●</span> Men's Collection
                            </h3>
                            <ImageUploadField 
                                label="Background Image" 
                                type="genderMenBackground" 
                                preview={imagePreviews.genderMenBackground} 
                                recommended="1920×1080 or higher, dramatic fashion photography"
                                className="mb-3"
                            />
                            <div className="space-y-2">
                                <div>
                                    <label className="block text-sm font-medium mb-1 dark:text-white">Overlay Opacity</label>
                                    <input
                                        type="range"
                                        name="genderMenOverlayOpacity"
                                        min="0"
                                        max="80"
                                        value={settings.genderMenOverlayOpacity}
                                        onChange={handleChange}
                                        className="w-full"
                                    />
                                    <span className="text-xs text-gray-500">{settings.genderMenOverlayOpacity}%</span>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1 dark:text-white">Text Color</label>
                                    <input
                                        type="color"
                                        name="genderMenTextColor"
                                        value={settings.genderMenTextColor}
                                        onChange={handleColorChange}
                                        className="w-full h-10 rounded-lg cursor-pointer"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1 dark:text-white">Accent Color</label>
                                    <input
                                        type="color"
                                        name="genderMenAccentColor"
                                        value={settings.genderMenAccentColor}
                                        onChange={handleColorChange}
                                        className="w-full h-10 rounded-lg cursor-pointer"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Women Collection */}
                        <div className="border rounded-lg p-4 dark:border-gray-700">
                            <h3 className="font-semibold text-lg mb-3 dark:text-white flex items-center gap-2">
                                <span className="text-[#C57887]">●</span> Women's Collection
                            </h3>
                            <ImageUploadField 
                                label="Background Image" 
                                type="genderWomenBackground" 
                                preview={imagePreviews.genderWomenBackground} 
                                recommended="1920×1080 or higher, elegant fashion photography"
                                className="mb-3"
                            />
                            <div className="space-y-2">
                                <div>
                                    <label className="block text-sm font-medium mb-1 dark:text-white">Overlay Opacity</label>
                                    <input
                                        type="range"
                                        name="genderWomenOverlayOpacity"
                                        min="0"
                                        max="80"
                                        value={settings.genderWomenOverlayOpacity}
                                        onChange={handleChange}
                                        className="w-full"
                                    />
                                    <span className="text-xs text-gray-500">{settings.genderWomenOverlayOpacity}%</span>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1 dark:text-white">Text Color</label>
                                    <input
                                        type="color"
                                        name="genderWomenTextColor"
                                        value={settings.genderWomenTextColor}
                                        onChange={handleColorChange}
                                        className="w-full h-10 rounded-lg cursor-pointer"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1 dark:text-white">Accent Color</label>
                                    <input
                                        type="color"
                                        name="genderWomenAccentColor"
                                        value={settings.genderWomenAccentColor}
                                        onChange={handleColorChange}
                                        className="w-full h-10 rounded-lg cursor-pointer"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Kids Collection */}
                        <div className="border rounded-lg p-4 dark:border-gray-700">
                            <h3 className="font-semibold text-lg mb-3 dark:text-white flex items-center gap-2">
                                <span className="text-[#93A562]">●</span> Kids' Collection
                            </h3>
                            <ImageUploadField 
                                label="Background Image" 
                                type="genderKidsBackground" 
                                preview={imagePreviews.genderKidsBackground} 
                                recommended="1920×1080 or higher, playful family photography"
                                className="mb-3"
                            />
                            <div className="space-y-2">
                                <div>
                                    <label className="block text-sm font-medium mb-1 dark:text-white">Overlay Opacity</label>
                                    <input
                                        type="range"
                                        name="genderKidsOverlayOpacity"
                                        min="0"
                                        max="80"
                                        value={settings.genderKidsOverlayOpacity}
                                        onChange={handleChange}
                                        className="w-full"
                                    />
                                    <span className="text-xs text-gray-500">{settings.genderKidsOverlayOpacity}%</span>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1 dark:text-white">Text Color</label>
                                    <input
                                        type="color"
                                        name="genderKidsTextColor"
                                        value={settings.genderKidsTextColor}
                                        onChange={handleColorChange}
                                        className="w-full h-10 rounded-lg cursor-pointer"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1 dark:text-white">Accent Color</label>
                                    <input
                                        type="color"
                                        name="genderKidsAccentColor"
                                        value={settings.genderKidsAccentColor}
                                        onChange={handleColorChange}
                                        className="w-full h-10 rounded-lg cursor-pointer"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <h4 className="font-semibold text-sm text-blue-700 dark:text-blue-300 flex items-center gap-2">
                            <FiInfo size={16} /> How it works
                        </h4>
                        <ul className="text-xs text-blue-600 dark:text-blue-400 mt-2 space-y-1">
                            <li>• Upload high-quality images for each gender collection card</li>
                            <li>• The images will appear as 3D-style backgrounds with parallax effects</li>
                            <li>• Adjust overlay opacity to control text readability</li>
                            <li>• Customize text and accent colors to match your brand</li>
                            <li>• Save settings and refresh the homepage to see changes</li>
                        </ul>
                    </div>
                </div>
            )}

            {/* Products Settings */}
            {activeTab === "products" && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                    <h2 className="text-xl font-semibold mb-4 border-b pb-2 dark:border-gray-700 flex items-center">
                        <FiPackage className="mr-2 text-blue-600" /> Product Display Settings
                    </h2>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-1 dark:text-white">Products Per Row</label>
                            <select name="productsPerRow" value={settings.productsPerRow} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                                <option value="2">2 per row</option>
                                <option value="3">3 per row</option>
                                <option value="4">4 per row</option>
                                <option value="5">5 per row</option>
                            </select>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <label className="flex items-center gap-2 dark:text-white">
                                <input type="checkbox" name="showProductRatings" checked={settings.showProductRatings} onChange={handleChange} className="w-4 h-4" />
                                <span>Show Product Ratings</span>
                            </label>
                            <label className="flex items-center gap-2 dark:text-white">
                                <input type="checkbox" name="showProductColors" checked={settings.showProductColors} onChange={handleChange} className="w-4 h-4" />
                                <span>Show Product Colors</span>
                            </label>
                            <label className="flex items-center gap-2 dark:text-white">
                                <input type="checkbox" name="showProductSizes" checked={settings.showProductSizes} onChange={handleChange} className="w-4 h-4" />
                                <span>Show Product Sizes</span>
                            </label>
                            <label className="flex items-center gap-2 dark:text-white">
                                <input type="checkbox" name="showSaleBadge" checked={settings.showSaleBadge} onChange={handleChange} className="w-4 h-4" />
                                <span>Show Sale Badge</span>
                            </label>
                            <label className="flex items-center gap-2 dark:text-white">
                                <input type="checkbox" name="showQuickAdd" checked={settings.showQuickAdd} onChange={handleChange} className="w-4 h-4" />
                                <span>Show Quick Add Button</span>
                            </label>
                            <label className="flex items-center gap-2 dark:text-white">
                                <input type="checkbox" name="showProductBrand" checked={settings.showProductBrand} onChange={handleChange} className="w-4 h-4" />
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
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1 dark:text-white">Meta Description</label>
                            <textarea name="metaDescription" value={settings.metaDescription} onChange={handleChange} rows="3" className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700" />
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

            {/* Authentication Tab */}
            {activeTab === "authentication" && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                    <h2 className="text-xl font-semibold mb-4 border-b pb-2 dark:border-gray-700 flex items-center">
                        <FiUser className="mr-2 text-blue-600" /> Login & Register Settings
                    </h2>
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <ImageUploadField
                                label="Login Background"
                                type="loginBackground"
                                preview={imagePreviews.loginBackground}
                                recommended="1920x1080 recommended"
                            />
                            <ImageUploadField
                                label="Register Background"
                                type="registerBackground"
                                preview={imagePreviews.registerBackground}
                                recommended="1920x1080 recommended"
                            />
                        </div>
                        <ImageUploadField
                            label="Auth Side Image"
                            type="authSideImage"
                            preview={imagePreviews.authSideImage}
                            recommended="Square or portrait image"
                        />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <ImageUploadField
                                label="Login Promo Image"
                                type="loginPromoImage"
                                preview={imagePreviews.loginPromoImage}
                                recommended="Product or promotional image"
                            />
                            <ImageUploadField
                                label="Register Promo Image"
                                type="registerPromoImage"
                                preview={imagePreviews.registerPromoImage}
                                recommended="Product or promotional image"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1 dark:text-white">Login Title</label>
                            <input type="text" name="loginTitle" value={settings.loginTitle} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1 dark:text-white">Login Subtitle</label>
                            <input type="text" name="loginSubtitle" value={settings.loginSubtitle} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1 dark:text-white">Register Title</label>
                            <input type="text" name="registerTitle" value={settings.registerTitle} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1 dark:text-white">Register Subtitle</label>
                            <input type="text" name="registerSubtitle" value={settings.registerSubtitle} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700" />
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
                            : cropType === 'slide' || 
                              cropType === 'genderMenBackground' || 
                              cropType === 'genderWomenBackground' || 
                              cropType === 'genderKidsBackground'
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