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

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Font options
const FONT_OPTIONS = [
    { value: "Inter", label: "Inter (Modern Sans)", category: "Sans-serif", googleFont: "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" },
    { value: "Poppins", label: "Poppins (Elegant)", category: "Sans-serif", googleFont: "https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap" },
    { value: "Roboto", label: "Roboto (Clean)", category: "Sans-serif", googleFont: "https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap" },
    { value: "Montserrat", label: "Montserrat (Bold)", category: "Sans-serif", googleFont: "https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700&display=swap" },
    { value: "Open Sans", label: "Open Sans (Readable)", category: "Sans-serif", googleFont: "https://fonts.googleapis.com/css2?family=Open+Sans:wght@300;400;500;600;700&display=swap" },
    { value: "Lato", label: "Lato (Professional)", category: "Sans-serif", googleFont: "https://fonts.googleapis.com/css2?family=Lato:wght@300;400;700;900&display=swap" },
    { value: "Playfair Display", label: "Playfair Display (Elegant Serif)", category: "Serif", googleFont: "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&display=swap" },
    { value: "Merriweather", label: "Merriweather (Classic Serif)", category: "Serif", googleFont: "https://fonts.googleapis.com/css2?family=Merriweather:wght@300;400;700;900&display=swap" },
    { value: "Nunito", label: "Nunito (Friendly)", category: "Sans-serif", googleFont: "https://fonts.googleapis.com/css2?family=Nunito:wght@300;400;500;600;700&display=swap" },
    { value: "Raleway", label: "Raleway (Stylish)", category: "Sans-serif", googleFont: "https://fonts.googleapis.com/css2?family=Raleway:wght@300;400;500;600;700&display=swap" }
];

const Settings = () => {
    const [settings, setSettings] = useState({
        siteName: "Zamed Premium Wear",
        siteEmail: "support@zamed.com",
        sitePhone: "+94 77 061 6154",
        siteAddress: "Colombo, Sri Lanka",
        currency: "USD",
        shippingFee: 5.00,
        freeShippingThreshold: 100,
        taxRate: 10,
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
        heroImage: null,
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
        fontScale: "medium"
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

    const [imagePreviews, setImagePreviews] = useState({ logo: null, heroImage: null, footerLogo: null, favicon: null });
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
    
    const fileInputRefs = { 
        logo: useRef(null), 
        heroImage: useRef(null), 
        footerLogo: useRef(null), 
        favicon: useRef(null), 
        slide: {} 
    };

    const getToken = () => localStorage.getItem('token');

    useEffect(() => {
        const checkDarkMode = () => {
            const isDark = document.documentElement.classList.contains('dark');
            setDarkMode(isDark);
        };
        checkDarkMode();
        loadSettings();
    }, []);

    useEffect(() => {
        if (!loading) {
            saveToLocalStorage();
            applyFontsToDocument();
        }
    }, [settings, loading]);

    const applyFontsToDocument = () => {
        const selectedFonts = [settings.primaryFont, settings.headingFont, settings.bodyFont];
        const uniqueFonts = [...new Set(selectedFonts)];
        
        uniqueFonts.forEach(font => {
            const fontOption = FONT_OPTIONS.find(f => f.value === font);
            if (fontOption && fontOption.googleFont) {
                const linkId = `google-font-${font.replace(/\s/g, '-')}`;
                if (!document.getElementById(linkId)) {
                    const link = document.createElement('link');
                    link.id = linkId;
                    link.rel = 'stylesheet';
                    link.href = fontOption.googleFont;
                    document.head.appendChild(link);
                }
            }
        });
        
        document.documentElement.style.setProperty('--font-primary', settings.primaryFont);
        document.documentElement.style.setProperty('--font-heading', settings.headingFont);
        document.documentElement.style.setProperty('--font-body', settings.bodyFont);
        
        let fontSize = '1rem';
        switch(settings.fontScale) {
            case 'small': fontSize = '0.875rem'; break;
            case 'large': fontSize = '1.125rem'; break;
            case 'xlarge': fontSize = '1.25rem'; break;
            default: fontSize = '1rem';
        }
        document.documentElement.style.setProperty('--font-size-base', fontSize);
    };

    /**
     * Aggressively compress image to fit in localStorage
     */
    const compressImage = (base64String, maxWidth = 400, quality = 0.4) => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                try {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;
                    
                    // Resize aggressively
                    if (width > maxWidth) {
                        height = (height * maxWidth) / width;
                        width = maxWidth;
                    }
                    
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.imageSmoothingEnabled = true;
                    ctx.imageSmoothingQuality = 'high';
                    ctx.drawImage(img, 0, 0, width, height);
                    
                    // Use JPEG with low quality
                    const compressed = canvas.toDataURL('image/jpeg', quality);
                    resolve(compressed);
                } catch (error) {
                    reject(error);
                }
            };
            img.onerror = () => reject(new Error('Failed to load image for compression'));
            img.src = base64String;
        });
    };

    /**
     * Save settings to localStorage with size limits and fallback
     */
    const saveToLocalStorage = async () => {
        try {
            // Create a clean version without large images
            const siteInfoData = {
                siteName: settings.siteName,
                siteEmail: settings.siteEmail,
                sitePhone: settings.sitePhone,
                siteAddress: settings.siteAddress,
                currency: settings.currency,
                heroTitle: settings.heroTitle,
                heroSubtitle: settings.heroSubtitle,
                heroButtonText: settings.heroButtonText,
                footerText: settings.footerText,
                socialLinks: {
                    facebook: settings.facebookUrl,
                    instagram: settings.instagramUrl,
                    twitter: settings.twitterUrl,
                    youtube: settings.youtubeUrl,
                    linkedin: settings.linkedinUrl
                },
                fontSettings: {
                    primaryFont: settings.primaryFont,
                    headingFont: settings.headingFont,
                    bodyFont: settings.bodyFont,
                    fontScale: settings.fontScale
                }
            };

            // Store images separately with size limits
            const imagesData = {
                logo: await compressAndStoreImage(settings.logo, 'logo', 200, 0.5),
                favicon: await compressAndStoreImage(settings.favicon, 'favicon', 64, 0.4),
                heroImage: await compressAndStoreImage(settings.heroImage, 'hero', 600, 0.4),
                footerLogo: await compressAndStoreImage(settings.footerLogo, 'footerLogo', 200, 0.5),
                slides: await compressSlideImages(settings.slides)
            };

            // Store settings without images
            const settingsWithoutImages = { ...settings };
            delete settingsWithoutImages.logo;
            delete settingsWithoutImages.heroImage;
            delete settingsWithoutImages.footerLogo;
            delete settingsWithoutImages.favicon;
            delete settingsWithoutImages.slides;

            // Try to save, if fails, use IndexedDB as fallback
            try {
                localStorage.setItem('site_settings', JSON.stringify(settingsWithoutImages));
                localStorage.setItem('site_info', JSON.stringify(siteInfoData));
                localStorage.setItem('site_images', JSON.stringify(imagesData));
                
                // Dispatch events
                window.dispatchEvent(new Event('storage'));
                window.dispatchEvent(new CustomEvent('settingsSaved'));
                window.dispatchEvent(new CustomEvent('siteInfoUpdated', { detail: siteInfoData }));
                
                // Update favicon
                if (settings.favicon) {
                    updateFavicon(settings.favicon);
                }
                
                toast.success('Settings saved successfully!');
            } catch (storageError) {
                console.warn('localStorage quota exceeded, trying IndexedDB fallback...');
                await saveImagesToIndexedDB(imagesData);
                toast.success('Settings saved (large images stored in IndexedDB)');
            }
        } catch (error) {
            console.error('Error saving settings:', error);
            toast.error('Failed to save settings. Please try again with smaller images.');
        }
    };

    /**
     * Compress a single image with size limit
     */
    const compressAndStoreImage = async (imageData, type, maxWidth, quality) => {
        if (!imageData) return null;
        
        // If it's already small enough, return as-is
        if (imageData.length < 50000) { // 50KB
            return imageData;
        }
        
        try {
            return await compressImage(imageData, maxWidth, quality);
        } catch (error) {
            console.warn(`Failed to compress ${type}:`, error);
            return imageData; // Return original as fallback
        }
    };

    /**
     * Compress all slide images
     */
    const compressSlideImages = async (slides) => {
        const compressedSlides = [];
        for (const slide of slides) {
            let compressedImage = slide.image;
            if (slide.image && slide.image.length > 50000) {
                compressedImage = await compressImage(slide.image, 600, 0.4);
            }
            compressedSlides.push({
                ...slide,
                image: compressedImage
            });
        }
        return compressedSlides;
    };

    /**
     * Save images to IndexedDB as fallback
     */
    const saveImagesToIndexedDB = (imagesData) => {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('ZamedImageStore', 1);
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains('images')) {
                    db.createObjectStore('images');
                }
            };
            
            request.onsuccess = (event) => {
                const db = event.target.result;
                const transaction = db.transaction(['images'], 'readwrite');
                const store = transaction.objectStore('images');
                
                // Store each image with a key
                const keys = ['logo', 'favicon', 'heroImage', 'footerLogo', 'slides'];
                const values = [
                    imagesData.logo,
                    imagesData.favicon,
                    imagesData.heroImage,
                    imagesData.footerLogo,
                    JSON.stringify(imagesData.slides)
                ];
                
                keys.forEach((key, index) => {
                    if (values[index]) {
                        store.put(values[index], `site_image_${key}`);
                    }
                });
                
                transaction.oncomplete = () => {
                    resolve();
                };
                
                transaction.onerror = () => {
                    reject(transaction.error);
                };
            };
            
            request.onerror = () => {
                reject(request.error);
            };
        });
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

    const loadSettings = async () => {
        setLoading(true);
        setError(null);
        
        loadLocalSettings();
        
        const token = getToken();
        if (!token) {
            setLoading(false);
            return;
        }
        
        try {
            const response = await fetch(`${API_URL}/settings`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.success && data.settings) {
                    setSettings(prev => ({ ...prev, ...data.settings }));
                    setSiteNameInput(data.settings.siteName || prev.siteName);
                    setImagePreviews({
                        logo: data.settings.logo || null,
                        heroImage: data.settings.heroImage || null,
                        footerLogo: data.settings.footerLogo || null,
                        favicon: data.settings.favicon || null
                    });
                    
                    if (data.settings.slides) {
                        const slidesMap = {};
                        data.settings.slides.forEach((slide, idx) => {
                            if (slide.image) slidesMap[idx] = slide.image;
                        });
                        setSlideImages(slidesMap);
                    }
                    saveToLocalStorage();
                    applyFontsToDocument();
                }
            }
        } catch (error) {
            console.error("Error loading settings from backend:", error);
        } finally {
            setLoading(false);
        }
    };
    
    const loadLocalSettings = () => {
        const savedSettings = JSON.parse(localStorage.getItem('site_settings') || '{}');
        const savedSiteInfo = JSON.parse(localStorage.getItem('site_info') || '{}');
        const savedImages = JSON.parse(localStorage.getItem('site_images') || '{}');
        
        const mergedSettings = { ...settings, ...savedSettings, ...savedSiteInfo };
        setSettings(mergedSettings);
        setSiteNameInput(mergedSettings.siteName || settings.siteName);
        
        setImagePreviews({
            logo: savedImages.logo || mergedSettings.logo || null,
            heroImage: savedImages.heroImage || mergedSettings.heroImage || null,
            footerLogo: savedImages.footerLogo || mergedSettings.footerLogo || null,
            favicon: savedImages.favicon || mergedSettings.favicon || null
        });
        
        if (savedImages.slides || mergedSettings.slides) {
            const slidesData = savedImages.slides || mergedSettings.slides;
            if (Array.isArray(slidesData)) {
                const slidesMap = {};
                slidesData.forEach((slide, idx) => {
                    if (slide.image) slidesMap[idx] = slide.image;
                });
                setSlideImages(slidesMap);
            }
        }
        
        applyFontsToDocument();
    };

    const handleSiteNameChange = (e) => {
        const newName = e.target.value;
        setSiteNameInput(newName);
        setSettings(prev => ({ ...prev, siteName: newName }));
        toast.info(`Site name changed to "${newName}"`);
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setSettings(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
        
        if (name === 'currency') {
            const selectedCurrency = currencyOptions.find(c => c.code === value);
            toast.info(`Currency changed to ${selectedCurrency?.name || value}`);
            window.dispatchEvent(new CustomEvent('currencyChanged', { 
                detail: { currency: value, symbol: selectedCurrency?.symbol } 
            }));
        }
        
        if (name === 'primaryFont' || name === 'headingFont' || name === 'bodyFont') {
            applyFontsToDocument();
        }
    };

    const handleCurrencyChange = (currencyCode) => {
        setSettings(prev => ({ ...prev, currency: currencyCode }));
        const selectedCurrency = currencyOptions.find(c => c.code === currencyCode);
        toast.info(`Currency changed to ${selectedCurrency?.name} (${selectedCurrency?.symbol})`);
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
            id: Date.now(), 
            title: "New Slide", 
            subtitle: "Add your description here", 
            buttonText: "Shop Now", 
            buttonLink: "/collections/all", 
            image: null, 
            color: "from-blue-600",
            active: true,
            order: settings.slides.length + 1
        };
        setSettings(prev => ({ ...prev, slides: [...prev.slides, newSlide] }));
        toast.success("New slide added");
    };

    const removeSlide = (index) => {
        if (settings.slides.length <= 1) {
            toast.error("You need at least one slide");
            return;
        }
        const updatedSlides = settings.slides.filter((_, i) => i !== index);
        setSettings(prev => ({ ...prev, slides: updatedSlides }));
        const updatedSlideImages = { ...slideImages };
        delete updatedSlideImages[index];
        setSlideImages(updatedSlideImages);
        toast.success("Slide removed");
    };

    const toggleSlideActive = (index) => {
        const updatedSlides = [...settings.slides];
        updatedSlides[index] = { ...updatedSlides[index], active: !updatedSlides[index].active };
        setSettings(prev => ({ ...prev, slides: updatedSlides }));
        toast.success(`Slide ${updatedSlides[index].active ? 'activated' : 'deactivated'}`);
    };

    const handleSlideImageUpload = (index, file) => {
        if (file && file.size <= 5 * 1024 * 1024) {
            const reader = new FileReader();
            reader.onloadend = () => { 
                setCropImage(reader.result); 
                setCropType("slide"); 
                setCropSlideId(index); 
            };
            reader.readAsDataURL(file);
        } else {
            toast.error("Image must be less than 5MB");
        }
    };

    const handleSlideImageCropComplete = (croppedImage) => {
        const updatedSlides = [...settings.slides];
        updatedSlides[cropSlideId] = { ...updatedSlides[cropSlideId], image: croppedImage };
        setSettings(prev => ({ ...prev, slides: updatedSlides }));
        setSlideImages(prev => ({ ...prev, [cropSlideId]: croppedImage }));
        setCropImage(null);
        setCropType(null);
        setCropSlideId(null);
        
        saveToLocalStorage();
        toast.success("Slide image updated!");
    };

    const removeSlideImage = (index) => {
        const updatedSlides = [...settings.slides];
        updatedSlides[index] = { ...updatedSlides[index], image: null };
        setSettings(prev => ({ ...prev, slides: updatedSlides }));
        const updatedSlideImages = { ...slideImages };
        delete updatedSlideImages[index];
        setSlideImages(updatedSlideImages);
        saveToLocalStorage();
        toast.info("Slide image removed");
    };

    const handleImageUpload = (type, file) => {
        if (file && file.size <= 5 * 1024 * 1024) {
            const reader = new FileReader();
            reader.onloadend = () => { 
                setCropImage(reader.result); 
                setCropType(type); 
                setCropSlideId(null); 
            };
            reader.readAsDataURL(file);
        } else {
            toast.error("Image must be less than 5MB");
        }
    };

    const handleCropComplete = (croppedImage) => {
        if (cropType === "slide") {
            handleSlideImageCropComplete(croppedImage);
        } else {
            setImagePreviews(prev => ({ ...prev, [cropType]: croppedImage }));
            setSettings(prev => ({ ...prev, [cropType]: croppedImage }));
            setCropImage(null);
            setCropType(null);
            
            saveToLocalStorage();
            toast.success(`${cropType} image updated successfully!`);
        }
    };

    const removeImage = (type) => {
        setImagePreviews(prev => ({ ...prev, [type]: null }));
        setSettings(prev => ({ ...prev, [type]: null }));
        if (fileInputRefs[type]?.current) {
            fileInputRefs[type].current.value = '';
        }
        saveToLocalStorage();
        toast.info(`${type} image removed`);
    };

    const saveSettings = async () => {
        setIsSaving(true);
        const token = getToken();
        
        await saveToLocalStorage();
        
        try {
            const response = await fetch(`${API_URL}/settings`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(settings)
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    toast.success("Settings saved to server!");
                    setLastSaved(new Date());
                    applyFontsToDocument();
                    return;
                }
            }
            throw new Error("API failed");
        } catch (error) {
            console.error("Error saving settings to server:", error);
            toast.success("Settings saved locally!");
            setLastSaved(new Date());
            applyFontsToDocument();
        } finally {
            setIsSaving(false);
        }
    };

    const clearAllCache = () => {
        if (window.confirm("This will clear all website cache. Continue?")) {
            const essentialKeys = ['admin_users', 'admin_products', 'shop_products', 'admin_customers', 'admin_categories', 'admin_coupons'];
            const essentialData = {};
            essentialKeys.forEach(key => { 
                if (localStorage.getItem(key)) essentialData[key] = localStorage.getItem(key); 
            });
            localStorage.clear();
            Object.keys(essentialData).forEach(key => localStorage.setItem(key, essentialData[key]));
            saveToLocalStorage();
            toast.success("Cache cleared!");
            setTimeout(() => window.location.reload(), 1500);
        }
    };

    const forceRefreshWebsite = () => {
        saveSettings();
        toast.success("Website refresh triggered! Changes should appear now.");
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
                            className={`${type === 'favicon' ? 'w-16 h-16' : 'w-32 h-32'} object-contain rounded-lg border-2 border-gray-200 bg-gray-50 dark:bg-gray-700`} 
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
                        className={`${type === 'favicon' ? 'w-16 h-16' : 'w-32 h-32'} border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all`}
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
                    <p className="text-xs text-gray-400 mt-1">JPG, PNG, GIF (Max 5MB) | Auto-compressed</p>
                </div>
            </div>
        </div>
    );

    const tabs = [
        { id: "general", label: "General", icon: FiGlobe },
        { id: "hero", label: "Hero Slider", icon: FiImage },
        { id: "products", label: "Products", icon: FiPackage },
        { id: "design", label: "Design", icon: FiLayout },
        { id: "typography", label: "Typography", icon: FiType },
        { id: "seo", label: "SEO", icon: FiMonitor },
        { id: "advanced", label: "Advanced", icon: FiSettingsIcon }
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
                    <p className="text-gray-500 dark:text-gray-400 text-sm">Customize your website appearance and functionality</p>
                    {lastSaved && <p className="text-xs text-green-600 mt-1">Last saved: {lastSaved.toLocaleTimeString()}</p>}
                </div>
                <div className="flex gap-3">
                    <button onClick={clearAllCache} className="bg-red-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-red-700">
                        <FiAlertCircle /> Clear Cache
                    </button>
                    <button onClick={forceRefreshWebsite} className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-green-700">
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
                        <ImageUploadField label="Site Logo" type="logo" preview={imagePreviews.logo} recommended="Square image (200x200px)" />
                        <ImageUploadField label="Favicon" type="favicon" preview={imagePreviews.favicon} recommended="32x32px or 64x64px (ICO, PNG)" />
                        <div>
                            <label className="block text-sm font-medium mb-1 dark:text-white">Site Name</label>
                            <input 
                                type="text" 
                                value={siteNameInput} 
                                onChange={handleSiteNameChange}
                                onBlur={() => saveToLocalStorage()}
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
                    <div className="mb-6 border-b pb-4">
                        <h3 className="font-semibold mb-3">Hero Background Image (Fallback)</h3>
                        <ImageUploadField label="Hero Background Image" type="heroImage" preview={imagePreviews.heroImage} recommended="Wide image (1920x800px)" />
                    </div>
                    
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-semibold dark:text-white">Hero Slides</h3>
                            <button type="button" onClick={addNewSlide} className="bg-green-600 text-white px-3 py-1.5 rounded-lg flex items-center gap-2 text-sm">
                                <FiPlus size={14} /> Add Slide
                            </button>
                        </div>
                        <div className="space-y-4 max-h-[600px] overflow-y-auto">
                            {settings.slides.map((slide, index) => (
                                <div key={slide.id} className={`border rounded-lg p-4 ${slide.active === false ? 'opacity-50 bg-gray-50 dark:bg-gray-700' : 'bg-gray-50 dark:bg-gray-700'}`}>
                                    <div className="flex justify-between items-center mb-3">
                                        <h4 className="font-medium dark:text-white">Slide {index + 1}</h4>
                                        <div className="flex gap-2">
                                            <button onClick={() => toggleSlideActive(index)} className={`px-2 py-1 rounded-lg text-xs ${slide.active !== false ? 'bg-green-600 text-white' : 'bg-gray-500 text-white'}`}>
                                                {slide.active !== false ? 'Active' : 'Inactive'}
                                            </button>
                                            <button onClick={() => removeSlide(index)} className="text-red-500 hover:text-red-700">
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
                                                            className="w-24 h-24 object-cover rounded-lg border" 
                                                        />
                                                        <div className="absolute inset-0 bg-black bg-opacity-50 rounded-lg opacity-0 group-hover:opacity-100 flex items-center justify-center gap-1">
                                                            <button 
                                                                onClick={() => fileInputRefs.slide[index]?.click()} 
                                                                className="bg-blue-500 text-white rounded-full p-1"
                                                            >
                                                                <FiEdit2 size={10} />
                                                            </button>
                                                            <button 
                                                                onClick={() => removeSlideImage(index)} 
                                                                className="bg-red-500 text-white rounded-full p-1"
                                                            >
                                                                <FiX size={10} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div 
                                                        onClick={() => fileInputRefs.slide[index]?.click()} 
                                                        className="w-24 h-24 border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-blue-500"
                                                    >
                                                        <FiUpload size={20} className="text-gray-400" />
                                                        <span className="text-xs text-gray-400">Upload</span>
                                                    </div>
                                                )}
                                                <input 
                                                    type="file" 
                                                    ref={el => fileInputRefs.slide[index] = el} 
                                                    onChange={(e) => handleSlideImageUpload(index, e.target.files[0])} 
                                                    accept="image/*" 
                                                    className="hidden" 
                                                />
                                                <div className="flex-1">
                                                    <p className="text-xs text-gray-500">Recommended: 1920x1080px</p>
                                                    <p className="text-xs text-gray-400 mt-1">Upload an image for this slide</p>
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
                    </div>
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
                            <select name="productsPerRow" value={settings.productsPerRow} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700">
                                <option value={3}>3 per row</option>
                                <option value={4}>4 per row</option>
                                <option value={5}>5 per row</option>
                            </select>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <label className="flex items-center gap-2 dark:text-white">
                                <input type="checkbox" name="showProductRatings" checked={settings.showProductRatings} onChange={handleChange} className="w-4 h-4" />
                                <span>Show Product Ratings</span>
                            </label>
                            <label className="flex items-center gap-2 dark:text-white">
                                <input type="checkbox" name="showProductColors" checked={settings.showProductColors} onChange={handleChange} />
                                <span>Show Product Colors</span>
                            </label>
                            <label className="flex items-center gap-2 dark:text-white">
                                <input type="checkbox" name="showProductSizes" checked={settings.showProductSizes} onChange={handleChange} />
                                <span>Show Product Sizes</span>
                            </label>
                            <label className="flex items-center gap-2 dark:text-white">
                                <input type="checkbox" name="showSaleBadge" checked={settings.showSaleBadge} onChange={handleChange} />
                                <span>Show Sale Badge</span>
                            </label>
                            <label className="flex items-center gap-2 dark:text-white">
                                <input type="checkbox" name="showQuickAdd" checked={settings.showQuickAdd} onChange={handleChange} />
                                <span>Show Quick Add Button</span>
                            </label>
                            <label className="flex items-center gap-2 dark:text-white">
                                <input type="checkbox" name="showProductBrand" checked={settings.showProductBrand} onChange={handleChange} />
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

            {/* Advanced Settings */}
            {activeTab === "advanced" && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                    <h2 className="text-xl font-semibold mb-4 border-b pb-2 dark:border-gray-700 flex items-center">
                        <FiSettingsIcon className="mr-2 text-blue-600" /> Advanced Settings
                    </h2>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-1 dark:text-white">Shipping Fee</label>
                            <div className="relative">
                                <FiDollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                <input type="number" step="0.01" name="shippingFee" value={settings.shippingFee} onChange={handleChange} className="w-full pl-10 pr-3 py-2 border rounded-lg dark:bg-gray-700" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1 dark:text-white">Free Shipping Threshold</label>
                            <div className="relative">
                                <FiDollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                <input type="number" name="freeShippingThreshold" value={settings.freeShippingThreshold} onChange={handleChange} className="w-full pl-10 pr-3 py-2 border rounded-lg dark:bg-gray-700" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1 dark:text-white">Tax Rate (%)</label>
                            <input type="number" step="0.1" name="taxRate" value={settings.taxRate} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700" />
                        </div>
                        <div>
                            <label className="flex items-center gap-2 dark:text-white">
                                <input type="checkbox" name="enableGuestCheckout" checked={settings.enableGuestCheckout} onChange={handleChange} className="w-4 h-4" />
                                <span>Enable Guest Checkout</span>
                            </label>
                        </div>
                        <div>
                            <label className="flex items-center gap-2 dark:text-white">
                                <input type="checkbox" name="enableCoupons" checked={settings.enableCoupons} onChange={handleChange} />
                                <span>Enable Coupons</span>
                            </label>
                        </div>
                        <div>
                            <label className="flex items-center gap-2 dark:text-white">
                                <input type="checkbox" name="reviewSystemEnabled" checked={settings.reviewSystemEnabled} onChange={handleChange} />
                                <span>Enable Review System</span>
                            </label>
                        </div>
                    </div>
                </div>
            )}

            {/* Save Button */}
            <div className="mt-6 flex justify-end">
                <button 
                    onClick={saveSettings} 
                    disabled={isSaving} 
                    className="bg-blue-600 text-white px-8 py-3 rounded-lg flex items-center gap-2 hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                    <FiSave /> <span>{isSaving ? "Saving..." : "Save All Settings"}</span>
                </button>
            </div>

            {/* Image Cropper Modal */}
            {cropImage && (
                <ImageCropper 
                    image={cropImage} 
                    onCropComplete={handleCropComplete} 
                    onClose={() => { setCropImage(null); setCropType(null); setCropSlideId(null); }} 
                />
            )}
        </div>
    );
};

export default Settings;