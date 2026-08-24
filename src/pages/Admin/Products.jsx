// src/pages/Admin/Products.jsx
import { useState, useEffect, useRef } from "react";
import { 
    FiPlus, FiEdit2, FiTrash2, FiSearch, FiX, FiUpload, FiPackage, 
    FiSave, FiStar, FiZap, FiCrop, FiImage, FiFilter, FiGrid, FiList,
    FiChevronLeft, FiChevronRight, FiDownload, FiCopy, FiEye,
    FiAlertCircle, FiCheckCircle, FiClock, FiTag, FiDollarSign,
    FiList as FiListIcon, FiHash, FiRefreshCw, FiTruck, FiShield,
    FiPercent, FiPlusCircle
} from "react-icons/fi";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import productService from "../../services/productService";
import ImageCropper from "../../components/Admin/ImageCropper";

const API_URL = (
    import.meta.env.VITE_API_URL ||
    (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
        ? "http://localhost:5000/api"
        : "https://zamed-backend-1.onrender.com/api")
).replace(/\/$/, "");

const getAuthToken = () =>
    localStorage.getItem("token") || localStorage.getItem("authToken") || "";

const unwrapProducts = result => {
    const value = Array.isArray(result)
        ? result
        : result?.products ?? result?.data?.products ?? result?.data ?? [];
    return Array.isArray(value) ? value : [];
};

const saveProductToBackend = async (product, productId = null) => {
    const token = getAuthToken();
    if (!token) throw new Error("Your admin session has expired. Please sign in again.");

    // MongoDB owns these fields. Never send a browser-generated ID as _id.
    const payload = { ...product };
    delete payload._id;
    delete payload.id;
    delete payload.__v;

    // The Product schema stores review documents, not a numeric review count.
    payload.reviews = Array.isArray(product.reviews) ? product.reviews : [];

    const response = await fetch(
        productId
            ? `${API_URL}/products/${encodeURIComponent(productId)}`
            : `${API_URL}/products`,
        {
            method: productId ? "PUT" : "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        }
    );
    const result = await response.json().catch(() => ({}));
    if (!response.ok || result.success === false) {
        throw new Error(result.message || "The product could not be saved to MongoDB.");
    }
    return result.product ?? result.data?.product ?? result.data ?? result;
};

const dataUrlToFile = async (dataUrl, filename = "product-image.jpg") => {
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    const extension = blob.type === "image/png"
        ? "png"
        : blob.type === "image/webp"
            ? "webp"
            : "jpg";
    return new File([blob], filename.replace(/\.[^.]+$/, `.${extension}`), {
        type: blob.type || "image/jpeg"
    });
};

const uploadImageToCloudinary = async (image, filename = "product-image.jpg") => {
    if (!image || typeof image !== "string") {
        return { imageUrl: image || null, publicId: null };
    }

    // Existing Cloudinary/remote images do not need to be uploaded again.
    if (/^https?:\/\//i.test(image)) {
        return { imageUrl: image, publicId: null };
    }

    if (!image.startsWith("data:image/")) {
        throw new Error("The selected image format is not supported");
    }

    const token = getAuthToken();
    if (!token) {
        throw new Error("Your admin session has expired. Please sign in again.");
    }

    const file = await dataUrlToFile(image, filename);
    const body = new FormData();
    body.append("image", file);

    const response = await fetch(`${API_URL}/uploads/image`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${token}`
        },
        body
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.success || !result.imageUrl) {
        throw new Error(result.message || "Cloudinary image upload failed");
    }

    return {
        imageUrl: result.imageUrl,
        publicId: result.publicId || result.filename || null
    };
};

const Products = () => {
    const [products, setProducts] = useState([]);
    const [filteredProducts, setFilteredProducts] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [showModal, setShowModal] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [selectedImage, setSelectedImage] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [colorImages, setColorImages] = useState({});
    const [cropImage, setCropImage] = useState(null);
    const [cropType, setCropType] = useState(null);
    const [croppingColor, setCroppingColor] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [currencySymbol, setCurrencySymbol] = useState("$");
    const [selectedGenderCategory, setSelectedGenderCategory] = useState("men");
    const [viewMode, setViewMode] = useState("grid");
    const [selectedCategory, setSelectedCategory] = useState("all");
    const [selectedGender, setSelectedGender] = useState("all");
    const [selectedStatus, setSelectedStatus] = useState("all");
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(12);
    const [darkMode, setDarkMode] = useState(false);
    const [loading, setLoading] = useState(true);
    const [imageError, setImageError] = useState({});
    const [customBrandInput, setCustomBrandInput] = useState("");
    const [showCustomBrandInput, setShowCustomBrandInput] = useState(false);
    
    // ============================================================
    // FIX: Add ref to prevent double submission
    // ============================================================
    const isSubmittingRef = useRef(false);
    const fileInputRef = useRef(null);
    const colorImageInputRef = useRef({});
    const [newBrand, setNewBrand] = useState("");
    const [showNewBrandInput, setShowNewBrandInput] = useState(false);
    
    const [formData, setFormData] = useState({
        name: "", price: "", originalPrice: "", category: "", gender: "",
        sizes: [], colors: [], stock: 0, description: "", brand: "",
        rating: 4.5, reviews: 0, isFeatured: false, isNewArrival: false,
        tags: [], weight: "", material: "", careInstructions: "",
        details: "", shipping: "", shippingFee: 0, freeShippingThreshold: 0,
        taxRate: 0, isTaxFree: false, deliveryDays: "3-5", returnPolicy: "30-day easy returns"
    });

    // ============================================================
    // FIX: Expanded Color Palette - More Colors
    // ============================================================
    const allColors = [
        // Basic Colors
        { name: "Black", hex: "#1a1a1a" },
        { name: "White", hex: "#f5f5f5" },
        { name: "Red", hex: "#dc2626" },
        { name: "Blue", hex: "#3b82f6" },
        { name: "Green", hex: "#22c55e" },
        { name: "Yellow", hex: "#eab308" },
        { name: "Orange", hex: "#f97316" },
        { name: "Purple", hex: "#a855f7" },
        { name: "Pink", hex: "#ec4899" },
        { name: "Brown", hex: "#78350f" },
        { name: "Gray", hex: "#9ca3af" },
        { name: "Navy", hex: "#1e3a8a" },
        
        // Extended Colors
        { name: "Teal", hex: "#008080" },
        { name: "Maroon", hex: "#800000" },
        { name: "Olive", hex: "#808000" },
        { name: "Coral", hex: "#ff7f50" },
        { name: "Lavender", hex: "#e6e6fa" },
        { name: "Mint", hex: "#98ff98" },
        { name: "Khaki", hex: "#c3b091" },
        { name: "Beige", hex: "#f5e6d3" },
        { name: "Turquoise", hex: "#40e0d0" },
        { name: "Magenta", hex: "#ff00ff" },
        { name: "Cyan", hex: "#00ffff" },
        { name: "Gold", hex: "#ffd700" },
        { name: "Silver", hex: "#c0c0c0" },
        { name: "Bronze", hex: "#cd7f32" },
        { name: "Charcoal", hex: "#36454f" },
        { name: "Ivory", hex: "#fffff0" },
        { name: "Cream", hex: "#fffdd0" },
        { name: "Mauve", hex: "#e0b0ff" },
        { name: "Terracotta", hex: "#e2725b" },
        { name: "Mustard", hex: "#e1ad01" },
        { name: "Sage", hex: "#9eae8d" },
        { name: "Dusty Rose", hex: "#dca3a3" },
        { name: "Slate", hex: "#708090" },
        { name: "Burgundy", hex: "#800020" },
        { name: "Forest Green", hex: "#228b22" },
        { name: "Sky Blue", hex: "#87ceeb" },
        { name: "Royal Blue", hex: "#4169e1" },
        { name: "Crimson", hex: "#dc143c" },
        { name: "Salmon", hex: "#fa8072" },
        { name: "Tan", hex: "#d2b48c" },
        { name: "Peach", hex: "#ffdab9" }
    ];

    // ============================================================
    // FIX: Expanded Brands with ability to add custom brands
    // ============================================================
    const defaultBrands = [
        "Zamed Premium",
        "UrbanStyle", 
        "PremiumWear",
        "FashionCo",
        "Elite Collection",
        "StreetWear",
        "LuxuryLine",
        "EcoFashion",
        "ModernFit",
        "ClassicWear",
        "DesignerHub",
        "TrendSetter",
        "UrbanEdge",
        "PureCotton",
        "EthnicWear",
        "ActiveGear",
        "VintageVibes",
        "Minimalist",
        "BoldFashion",
        "ArtisanCraft"
    ];
    const [brands, setBrands] = useState(defaultBrands);

    // Compress image helper
    const compressImage = (base64String, maxWidth = 1200, quality = 0.85) => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                try {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;
                    
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
                    
                    const compressed = canvas.toDataURL('image/jpeg', quality);
                    resolve(compressed);
                } catch (error) {
                    reject(error);
                }
            };
            img.onerror = () => reject(new Error('Failed to load image'));
            img.src = base64String;
        });
    };

    // Load currency symbol and settings
    useEffect(() => {
        const loadCurrency = () => {
            const siteSettings = JSON.parse(localStorage.getItem('site_settings') || '{}');
            const symbols = { USD: "$", EUR: "€", GBP: "£", LKR: "Rs" };
            setCurrencySymbol(symbols[siteSettings.currency] || "$");
        };
        loadCurrency();
        
        window.addEventListener('currencyChanged', loadCurrency);
        window.addEventListener('settingsSaved', loadCurrency);
        
        return () => {
            window.removeEventListener('currencyChanged', loadCurrency);
            window.removeEventListener('settingsSaved', loadCurrency);
        };
    }, []);

    // Categories
    const menCategories = [
        "T-Shirts", "Formal Shirts", "Casual Shirts", "Polo Shirts", "Henley Shirts",
        "Hoodies", "Sweatshirts", "Jackets", "Jeans", "Trousers", "Chinos", 
        "Shorts", "Sports Wear", "Activewear", "Suits", "Blazers"
    ];

    const womenCategories = [
        "Dresses", "Tops", "Blouses", "Shirts", "Hoodies", "Sweaters", "Jackets",
        "Jeans", "Trousers", "Leggings", "Skirts", "Sports Wear", "Activewear",
        "Sarees", "Kurtis", "Lehenga", "Hijabs", "Abayas"
    ];

    const kidsCategories = [
        "T-Shirts", "Shirts", "Hoodies", "Jackets", "Jeans", "Trousers",
        "Shorts", "Dresses", "Rompers", "Track Suits", "School Uniform"
    ];

    const getAllCategories = () => {
        if (selectedGenderCategory === "men") return menCategories;
        if (selectedGenderCategory === "women") return womenCategories;
        if (selectedGenderCategory === "kids") return kidsCategories;
        return [...menCategories, ...womenCategories, ...kidsCategories];
    };

    const genders = [
        { value: "men", label: "Men's Collection" },
        { value: "women", label: "Women's Collection" },
        { value: "kids", label: "Kids Collection" }
    ];
    
    const allSizes = ["XS", "S", "M", "L", "XL", "XXL", "3XL", "4XL", "5XL", "One Size"];

    // ============================================================
    // FIX: Get color swatch with expanded color map
    // ============================================================
    const getColorSwatch = (colorName) => {
        const colorMap = {
            'Black': '#1a1a1a', 'White': '#f5f5f5', 'Red': '#dc2626', 'Blue': '#3b82f6',
            'Green': '#22c55e', 'Gray': '#9ca3af', 'Brown': '#78350f', 'Navy': '#1e3a8a',
            'Pink': '#ec4899', 'Purple': '#a855f7', 'Yellow': '#eab308', 'Orange': '#f97316',
            'Beige': '#f5e6d3', 'Maroon': '#800000', 'Teal': '#008080', 'Khaki': '#c3b091',
            'Coral': '#ff7f50', 'Lavender': '#e6e6fa', 'Mint': '#98ff98', 'Olive': '#808000',
            'Turquoise': '#40e0d0', 'Magenta': '#ff00ff', 'Cyan': '#00ffff', 'Gold': '#ffd700',
            'Silver': '#c0c0c0', 'Bronze': '#cd7f32', 'Charcoal': '#36454f', 'Ivory': '#fffff0',
            'Cream': '#fffdd0', 'Mauve': '#e0b0ff', 'Terracotta': '#e2725b', 'Mustard': '#e1ad01',
            'Sage': '#9eae8d', 'Dusty Rose': '#dca3a3', 'Slate': '#708090', 'Burgundy': '#800020',
            'Forest Green': '#228b22', 'Sky Blue': '#87ceeb', 'Royal Blue': '#4169e1',
            'Crimson': '#dc143c', 'Salmon': '#fa8072', 'Tan': '#d2b48c', 'Peach': '#ffdab9'
        };
        return colorMap[colorName] || '#cccccc';
    };

    const getColorNameFromHex = (hex) => {
        const colorMap = {
            '#1a1a1a': 'Black', '#f5f5f5': 'White', '#dc2626': 'Red', '#3b82f6': 'Blue',
            '#22c55e': 'Green', '#9ca3af': 'Gray', '#78350f': 'Brown', '#1e3a8a': 'Navy',
            '#ec4899': 'Pink', '#a855f7': 'Purple', '#eab308': 'Yellow', '#f97316': 'Orange',
            '#f5e6d3': 'Beige', '#800000': 'Maroon', '#008080': 'Teal', '#c3b091': 'Khaki',
            '#ff7f50': 'Coral', '#e6e6fa': 'Lavender', '#98ff98': 'Mint', '#808000': 'Olive',
            '#40e0d0': 'Turquoise', '#ff00ff': 'Magenta', '#00ffff': 'Cyan', '#ffd700': 'Gold',
            '#c0c0c0': 'Silver', '#cd7f32': 'Bronze', '#36454f': 'Charcoal', '#fffff0': 'Ivory',
            '#fffdd0': 'Cream', '#e0b0ff': 'Mauve', '#e2725b': 'Terracotta', '#e1ad01': 'Mustard',
            '#9eae8d': 'Sage', '#dca3a3': 'Dusty Rose', '#708090': 'Slate', '#800020': 'Burgundy',
            '#228b22': 'Forest Green', '#87ceeb': 'Sky Blue', '#4169e1': 'Royal Blue',
            '#dc143c': 'Crimson', '#fa8072': 'Salmon', '#d2b48c': 'Tan', '#ffdab9': 'Peach'
        };
        return colorMap[hex] || hex;
    };

    // ============================================================
    // FIX: Add new brand
    // ============================================================
    const addNewBrand = () => {
        const trimmed = newBrand.trim();
        if (!trimmed) {
            toast.error("Please enter a brand name");
            return;
        }
        if (brands.includes(trimmed)) {
            toast.warning("Brand already exists");
            return;
        }
        const updatedBrands = [...brands, trimmed];
        setBrands(updatedBrands);
        setFormData({ ...formData, brand: trimmed });
        setNewBrand("");
        setShowNewBrandInput(false);
        toast.success(`Brand "${trimmed}" added!`);
    };

    const getSiteProductDefaults = () => {
        try {
            const siteSettings = JSON.parse(
                localStorage.getItem("site_settings") || "{}"
            );
            return {
                shippingFee: siteSettings.shippingFee ?? 5,
                freeShippingThreshold: siteSettings.freeShippingThreshold ?? 100,
                taxRate: siteSettings.taxRate ?? 10
            };
        } catch {
            return { shippingFee: 5, freeShippingThreshold: 100, taxRate: 10 };
        }
    };

    const getFreshStoredProducts = () => {
        const byId = new Map();

        const addProducts = (list = []) => {
            if (!Array.isArray(list)) return;
            list.forEach((product) => {
                if (!product?.id) return;
                const key = String(product.id);
                const existing = byId.get(key);
                if (!existing) {
                    byId.set(key, product);
                    return;
                }
                const existingTime = new Date(existing.updatedAt || existing.createdAt || 0).getTime();
                const productTime = new Date(product.updatedAt || product.createdAt || 0).getTime();
                if (productTime >= existingTime) {
                    byId.set(key, { ...existing, ...product });
                }
            });
        };

        try {
            addProducts(productService.getAllProducts() || []);
        } catch (error) {
            console.warn("Unable to read productService products:", error);
        }

        ["shop_products", "admin_products", "products"].forEach((key) => {
            try {
                addProducts(JSON.parse(localStorage.getItem(key) || "[]"));
            } catch (error) {
                console.warn(`Unable to read ${key}:`, error);
            }
        });

        return [...byId.values()];
    };

    const normaliseArrayField = (value) => {
        if (Array.isArray(value)) return value;
        if (typeof value === "string") {
            return value.split(",").map(item => item.trim()).filter(Boolean);
        }
        return [];
    };

    const useLatestProductValues = (product = {}) => {
        const defaults = getSiteProductDefaults();
        return {
            name: product.name ?? "",
            price: product.price ?? "",
            originalPrice: product.originalPrice ?? "",
            category: product.category ?? "",
            gender: product.gender ?? "",
            sizes: normaliseArrayField(product.sizes),
            colors: normaliseArrayField(product.colors),
            stock: product.stock ?? 0,
            description: product.description ?? "",
            brand: product.brand ?? "",
            rating: product.rating ?? 4.5,
            reviews: Array.isArray(product.reviews) ? product.reviews.length : product.reviews ?? 0,
            isFeatured: Boolean(product.isFeatured),
            isNewArrival: Boolean(product.isNewArrival),
            tags: normaliseArrayField(product.tags),
            weight: product.weight ?? "",
            material: product.material ?? "",
            careInstructions: product.careInstructions ?? product.care ?? "",
            details: product.details ?? product.productDetails ?? "",
            shipping: product.shipping ?? product.shippingInformation ?? "",
            shippingFee: product.shippingFee ?? defaults.shippingFee,
            freeShippingThreshold: product.freeShippingThreshold ?? defaults.freeShippingThreshold,
            taxRate: product.taxRate ?? defaults.taxRate,
            isTaxFree: Boolean(product.isTaxFree),
            deliveryDays: product.deliveryDays ?? "3-5",
            returnPolicy: product.returnPolicy ?? "30-day easy returns"
        };
    };

    useEffect(() => {
        const checkDarkMode = () => {
            const isDark = document.documentElement.classList.contains('dark');
            setDarkMode(isDark);
        };
        checkDarkMode();
        
        loadProducts();
        const unsubscribe = productService.subscribe(() => loadProducts());
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        filterProducts();
    }, [products, searchTerm, selectedCategory, selectedGender, selectedStatus]);

    const loadProducts = async ({ showToast = false } = {}) => {
        setLoading(true);
        try {
            let latestProducts = [];
            let apiSucceeded = false;

            try {
                const response = await fetch(`${API_URL}/products`, {
                    headers: { Accept: "application/json" }
                });
                const result = await response.json().catch(() => ({}));
                if (!response.ok) {
                    throw new Error(result.message || "Unable to load products from MongoDB");
                }
                apiSucceeded = true;
                latestProducts = unwrapProducts(result).map(product => ({
                    ...product,
                    id: String(product.id ?? product._id ?? "")
                }));

                // MongoDB is authoritative, even when its list is empty.
                // Clear stale local copies that could resurrect deleted products.
                ["shop_products", "admin_products", "products", "product_data"]
                    .forEach(key => localStorage.removeItem(key));
            } catch (apiError) {
                console.warn("MongoDB product load failed; using browser fallback:", apiError);
                if (!apiSucceeded) latestProducts = getFreshStoredProducts();
            }

            setProducts(latestProducts);
            if (showToast) {
                toast.success(`Products refreshed · ${latestProducts.length} loaded`);
            }
            return latestProducts;
        } catch (error) {
            console.error("Error loading products:", error);
            if (showToast) {
                toast.error("Unable to refresh products");
            }
            return [];
        } finally {
            setLoading(false);
        }
    };

    const handleRefreshProducts = async () => {
        setImageError({});
        const latest = await loadProducts({ showToast: true });
        window.dispatchEvent(new CustomEvent("productsRefreshed", { detail: { count: latest.length } }));
    };

    const filterProducts = () => {
        let filtered = [...products];
        if (searchTerm) {
            filtered = filtered.filter(p => 
                p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                p.brand?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }
        if (selectedCategory !== "all") {
            filtered = filtered.filter(p => p.category === selectedCategory);
        }
        if (selectedGender !== "all") {
            filtered = filtered.filter(p => p.gender === selectedGender);
        }
        if (selectedStatus !== "all") {
            if (selectedStatus === "featured") filtered = filtered.filter(p => p.isFeatured);
            else if (selectedStatus === "new") filtered = filtered.filter(p => p.isNewArrival);
            else if (selectedStatus === "lowStock") filtered = filtered.filter(p => p.stock > 0 && p.stock < 10);
            else if (selectedStatus === "outOfStock") filtered = filtered.filter(p => p.stock === 0);
            else if (selectedStatus === "taxFree") filtered = filtered.filter(p => p.isTaxFree);
        }
        setFilteredProducts(filtered);
        setCurrentPage(1);
    };

    const handleImageSelect = async (e, type = "main", colorName = null) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
        if (!allowedTypes.includes(file.type)) {
            toast.error("Please upload JPG, PNG or WebP.");
            e.target.value = "";
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            toast.error("Product image must be smaller than 5MB.");
            e.target.value = "";
            return;
        }

        const toastId = toast.loading("Loading image...");
        const reader = new FileReader();
        reader.onload = () => {
            setCropImage(reader.result);
            setCropType(type);
            setCroppingColor(colorName);
            toast.success("Image loaded. Crop when ready.", { id: toastId });
        };
        reader.onerror = () => {
            toast.error("Unable to read this image.", { id: toastId });
        };
        reader.readAsDataURL(file);
        e.target.value = "";
    };

    const handleCropComplete = (croppedImage) => {
        if (cropType === 'main') {
            setImagePreview(croppedImage);
            setSelectedImage(croppedImage);
            toast.success("Main image saved!");
        } else if (cropType === 'color' && croppingColor) {
            setColorImages(prev => ({ ...prev, [croppingColor]: croppedImage }));
            toast.success(`Image for ${croppingColor} saved!`);
        }
        setCropImage(null);
        setCropType(null);
        setCroppingColor(null);
    };

    const handleImageError = (productId, colorName = null) => {
        const key = colorName ? `${productId}_${colorName}` : productId;
        setImageError(prev => ({ ...prev, [key]: true }));
    };

    // ============================================================
    // handleSubmit - prevents double submission
    // ============================================================
    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (isSubmittingRef.current) {
            console.log('⚠️ Submission already in progress, skipping...');
            return;
        }
        
        if (isSubmitting) {
            console.log('⚠️ Already submitting, skipping...');
            return;
        }
        
        if (!formData.name || !formData.price || !formData.category || !formData.gender) {
            toast.error("Please fill all required fields");
            return;
        }
        
        isSubmittingRef.current = true;
        setIsSubmitting(true);
        
        try {
            let finalImage = selectedImage || (editingProduct ? editingProduct.image : null);
            if (finalImage && finalImage.startsWith('data:image') && finalImage.length > 500000) {
                try {
                    finalImage = await compressImage(finalImage, 1200, 0.85);
                } catch (e) {
                    console.warn('Image compression failed:', e);
                }
            }

            let mainImagePublicId = editingProduct?.imagePublicId || null;
            if (finalImage?.startsWith?.("data:image/")) {
                const mainUpload = await uploadImageToCloudinary(
                    finalImage,
                    `${formData.name.trim() || "product"}-main.jpg`
                );
                finalImage = mainUpload.imageUrl;
                mainImagePublicId = mainUpload.publicId;
            }
            
            const colorImagesObj = {};
            const colorImagePublicIds = { ...(editingProduct?.colorImagePublicIds || {}) };
            if (formData.colors && formData.colors.length > 0) {
                for (const color of formData.colors) {
                    if (colorImages[color]) {
                        if (colorImages[color].startsWith?.("data:image/")) {
                            const colorUpload = await uploadImageToCloudinary(
                                colorImages[color],
                                `${formData.name.trim() || "product"}-${color}.jpg`
                            );
                            colorImagesObj[color] = colorUpload.imageUrl;
                            colorImagePublicIds[color] = colorUpload.publicId;
                        } else {
                            colorImagesObj[color] = colorImages[color];
                        }
                    }
                }
            }
            
            const productData = {
                ...(editingProduct || {}),
                ...(editingProduct
                    ? { id: String(editingProduct.id ?? editingProduct._id ?? "") }
                    : {}),
                name: formData.name.trim(),
                price: parseFloat(formData.price),
                originalPrice: formData.originalPrice ? parseFloat(formData.originalPrice) : null,
                category: formData.category,
                gender: formData.gender,
                sizes: formData.sizes || [],
                colors: formData.colors || [],
                stock: Number(formData.stock) || 0,
                description: formData.description || "",
                brand: formData.brand || "Zamed Premium",
                image: finalImage,
                imagePublicId: mainImagePublicId,
                colorImages: colorImagesObj,
                colorImagePublicIds,
                rating: formData.rating || 0,
                reviews: Array.isArray(editingProduct?.reviews)
                    ? editingProduct.reviews
                    : [],
                isFeatured: formData.isFeatured || false,
                isNewArrival: formData.isNewArrival || false,
                inStock: Number(formData.stock) > 0,
                tags: formData.tags || [],
                weight: formData.weight || "",
                material: formData.material || "",
                careInstructions: formData.careInstructions || "",
                details: formData.details || "",
                shipping: formData.shipping || "",
                shippingFee: parseFloat(formData.shippingFee) || 0,
                freeShippingThreshold: parseFloat(formData.freeShippingThreshold) || 0,
                taxRate: formData.isTaxFree ? 0 : parseFloat(formData.taxRate) || 0,
                isTaxFree: formData.isTaxFree || false,
                deliveryDays: formData.deliveryDays || "3-5",
                returnPolicy: formData.returnPolicy || "30-day easy returns",
                createdAt: editingProduct ? editingProduct.createdAt : new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            
            if (editingProduct) {
                const backendId = editingProduct._id || editingProduct.id;
                await saveProductToBackend(productData, backendId);
                toast.success(`Product "${formData.name}" updated successfully!`);
            } else {
                await saveProductToBackend(productData);
                toast.success(`Product "${formData.name}" added successfully!`);
            }
            
            handleCloseModal();
            
            setTimeout(() => {
                loadProducts();
            }, 300);
            
            window.dispatchEvent(new CustomEvent('productsUpdated'));
            window.dispatchEvent(new Event('storage'));
            
        } catch (error) {
            console.error("Error saving product:", error);
            toast.error("Failed to save product: " + error.message);
        } finally {
            setIsSubmitting(false);
            isSubmittingRef.current = false;
        }
    };

    const handleDelete = async (product) => {
        if (window.confirm(`Delete "${product.name}"?`)) {
            try {
                const token = getAuthToken();
                if (!token) throw new Error("Please sign in again.");
                const productId = product._id || product.id;
                const response = await fetch(
                    `${API_URL}/products/${encodeURIComponent(productId)}`,
                    { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }
                );
                const result = await response.json().catch(() => ({}));
                if (!response.ok || result.success === false) {
                    throw new Error(result.message || "Unable to delete product");
                }
                toast.success(`"${product.name}" deleted!`);
                await loadProducts();
            } catch (error) {
                toast.error(error.message || "Unable to delete product");
            }
        }
    };

    const handleEdit = (product) => {
        const latestProduct = getFreshStoredProducts().find(
            item => String(item.id) === String(product.id)
        ) || product;

        setEditingProduct(latestProduct);
        setSelectedGenderCategory(latestProduct.gender || "men");
        const hydratedForm = useLatestProductValues(latestProduct);
        setFormData(hydratedForm);
        const mainImage = latestProduct.image || latestProduct.mainImage || latestProduct.thumbnail || null;
        setImagePreview(mainImage);
        setSelectedImage(mainImage);
        setColorImages({ ...(latestProduct.colorImages || {}) });
        setImageError({});
        setShowNewBrandInput(false);
        setNewBrand("");
        setShowModal(true);
    };

    const handleOpenAddProduct = () => {
        const defaults = getSiteProductDefaults();
        setEditingProduct(null);
        setSelectedGenderCategory("men");
        setSelectedImage(null);
        setImagePreview(null);
        setColorImages({});
        setImageError({});
        setShowNewBrandInput(false);
        setNewBrand("");
        setFormData({
            name: "", price: "", originalPrice: "", category: "", gender: "",
            sizes: [], colors: [], stock: 0, description: "", brand: "",
            rating: 4.5, reviews: 0, isFeatured: false, isNewArrival: false,
            tags: [], weight: "", material: "", careInstructions: "",
            details: "", shipping: "", shippingFee: defaults.shippingFee,
            freeShippingThreshold: defaults.freeShippingThreshold,
            taxRate: defaults.taxRate, isTaxFree: false,
            deliveryDays: "3-5", returnPolicy: "30-day easy returns"
        });
        setShowModal(true);
    };

    const handleDuplicate = async (product) => {
        const newProduct = {
            ...product,
            _id: undefined,
            id: Date.now().toString(),
            name: `${product.name} (Copy)`,
            createdAt: new Date().toISOString()
        };
        try {
            await saveProductToBackend(newProduct);
            toast.success(`"${product.name}" duplicated!`);
            await loadProducts();
        } catch (error) {
            toast.error(error.message || "Unable to duplicate product");
        }
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setEditingProduct(null);
        setSelectedImage(null);
        setImagePreview(null);
        setColorImages({});
        setSelectedGenderCategory("men");
        setImageError({});
        setFormData({
            name: "", price: "", originalPrice: "", category: "", gender: "",
            sizes: [], colors: [], stock: 0, description: "", brand: "",
            rating: 4.5, reviews: 0, isFeatured: false, isNewArrival: false,
            tags: [], weight: "", material: "", careInstructions: "",
            details: "", shipping: "", shippingFee: 5.00, freeShippingThreshold: 100,
            taxRate: 10, isTaxFree: false, deliveryDays: "3-5", returnPolicy: "30-day easy returns"
        });
        setIsSubmitting(false);
        isSubmittingRef.current = false;
    };

    const toggleSize = (size) => setFormData(prev => ({
        ...prev, sizes: prev.sizes.includes(size) ? prev.sizes.filter(s => s !== size) : [...prev.sizes, size]
    }));

    const toggleColor = (color) => {
        setFormData(prev => {
            const newColors = prev.colors.includes(color) ? prev.colors.filter(c => c !== color) : [...prev.colors, color];
            if (prev.colors.includes(color)) {
                setColorImages(prevImages => { const newImages = { ...prevImages }; delete newImages[color]; return newImages; });
            }
            return { ...prev, colors: newColors };
        });
    };

    const toggleFeatured = async (product) => {
        try {
            await saveProductToBackend(
                { ...product, isFeatured: !product.isFeatured },
                product._id || product.id
            );
            toast.success(`${product.name} ${!product.isFeatured ? 'featured' : 'unfeatured'}`);
            await loadProducts();
        } catch (error) {
            toast.error(error.message || "Unable to update featured status");
        }
    };

    const toggleNewArrival = async (product) => {
        try {
            await saveProductToBackend(
                { ...product, isNewArrival: !product.isNewArrival },
                product._id || product.id
            );
            toast.success(`${product.name} ${!product.isNewArrival ? 'new arrival' : 'removed'}`);
            await loadProducts();
        } catch (error) {
            toast.error(error.message || "Unable to update new-arrival status");
        }
    };

    const handleGenderChange = (gender) => {
        setSelectedGenderCategory(gender);
        setFormData({ ...formData, gender: gender, category: "" });
    };

    const exportProducts = () => {
        if (filteredProducts.length === 0) {
            toast.error("No products to export");
            return;
        }
        const exportData = filteredProducts.map(p => ({
            ID: p.id, Name: p.name, Price: p.price, Category: p.category,
            Gender: p.gender, Brand: p.brand, Stock: p.stock, Featured: p.isFeatured,
            "New Arrival": p.isNewArrival, "Shipping Fee": p.shippingFee || 5.00,
            "Free Shipping Threshold": p.freeShippingThreshold || 100,
            "Tax Rate": p.taxRate || 10,
            "Tax Free": p.isTaxFree ? "Yes" : "No",
            "Delivery Days": p.deliveryDays || "3-5",
            "Return Policy": p.returnPolicy || "30-day easy returns",
            Created: p.createdAt
        }));
        const headers = Object.keys(exportData[0]);
        const csvRows = [headers.join(',')];
        for (const row of exportData) {
            const values = headers.map(header => {
                const value = row[header];
                return typeof value === 'string' ? `"${value}"` : value;
            });
            csvRows.push(values.join(','));
        }
        const csv = csvRows.join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `products_export_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("Products exported!");
    };

    const formatPrice = (price) => `${currencySymbol}${(price || 0).toFixed(2)}`;

    const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
    const paginatedProducts = filteredProducts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
    const uniqueCategories = [...new Set(products.map(p => p.category).filter(Boolean))];

    const getProductImage = (product, colorName = null) => {
        if (colorName && product.colorImages && product.colorImages[colorName]) {
            return product.colorImages[colorName];
        }
        return product.image;
    };

    if (loading && products.length === 0) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div>
            {/* Header */}
            <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold dark:text-white">Product Management</h1>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                        Manage your product catalog | {filteredProducts.length} products
                    </p>
                </div>
                <div className="flex gap-3">
                    <button onClick={exportProducts} className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-green-700">
                        <FiDownload size={16} /> Export
                    </button>
                    <button onClick={handleRefreshProducts} className="bg-gray-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-gray-700">
                        <FiRefreshCw size={16} /> Refresh
                    </button>
                    <button onClick={handleOpenAddProduct} className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700">
                        <FiPlus size={16} /> Add Product
                    </button>
                </div>
            </div>

            {/* Filters Bar */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 mb-6">
                <div className="flex flex-wrap gap-4">
                    <div className="flex-1 min-w-[200px] relative">
                        <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search products..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        />
                    </div>
                    <select
                        value={selectedGender}
                        onChange={(e) => setSelectedGender(e.target.value)}
                        className="px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    >
                        <option value="all">All Genders</option>
                        <option value="men">Men</option>
                        <option value="women">Women</option>
                        <option value="kids">Kids</option>
                    </select>
                    <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white min-w-[150px]"
                    >
                        <option value="all">All Categories</option>
                        {uniqueCategories.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                        ))}
                    </select>
                    <select
                        value={selectedStatus}
                        onChange={(e) => setSelectedStatus(e.target.value)}
                        className="px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    >
                        <option value="all">All Status</option>
                        <option value="featured">Featured</option>
                        <option value="new">New Arrivals</option>
                        <option value="lowStock">Low Stock</option>
                        <option value="outOfStock">Out of Stock</option>
                        <option value="taxFree">Tax Free</option>
                    </select>
                    <div className="flex gap-2">
                        <button onClick={() => setViewMode("grid")} className={`p-2 rounded-lg ${viewMode === "grid" ? "bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400" : "hover:bg-gray-100 dark:hover:bg-gray-700"}`}>
                            <FiGrid size={18} />
                        </button>
                        <button onClick={() => setViewMode("list")} className={`p-2 rounded-lg ${viewMode === "list" ? "bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400" : "hover:bg-gray-100 dark:hover:bg-gray-700"}`}>
                            <FiList size={18} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Products Display */}
            {filteredProducts.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-12 text-center">
                    <FiPackage className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold dark:text-white">No products found</h3>
                    <button onClick={handleOpenAddProduct} className="mt-4 text-blue-600 hover:text-blue-700">+ Add your first product</button>
                </div>
            ) : viewMode === "grid" ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {paginatedProducts.map((product) => {
                        const imageKey = product.id;
                        const hasError = imageError[imageKey];
                        
                        return (
                            <motion.div
                                key={product.id}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                whileHover={{ y: -5 }}
                                className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden group"
                            >
                                <div className="relative">
                                    {!hasError && product.image ? (
                                        <img 
                                            src={product.image} 
                                            alt={product.name} 
                                            className="w-full h-48 object-cover"
                                            onError={() => handleImageError(product.id)}
                                        />
                                    ) : (
                                        <div className="w-full h-48 bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                                            <FiPackage className="w-12 h-12 text-gray-400" />
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                        <button onClick={() => handleEdit(product)} className="p-2 bg-white rounded-full hover:bg-gray-100">
                                            <FiEdit2 size={16} />
                                        </button>
                                        <button onClick={() => handleDuplicate(product)} className="p-2 bg-white rounded-full hover:bg-gray-100">
                                            <FiCopy size={16} />
                                        </button>
                                        <button onClick={() => handleDelete(product)} className="p-2 bg-white rounded-full hover:bg-red-100 text-red-500">
                                            <FiTrash2 size={16} />
                                        </button>
                                    </div>
                                    {product.isFeatured && (
                                        <span className="absolute top-2 left-2 bg-yellow-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                                            <FiStar size={10} /> Featured
                                        </span>
                                    )}
                                    {product.isNewArrival && (
                                        <span className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                                            <FiZap size={10} /> New
                                        </span>
                                    )}
                                    {product.isTaxFree && (
                                        <span className="absolute bottom-2 right-2 bg-purple-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                                            <FiPercent size={10} /> Tax Free
                                        </span>
                                    )}
                                </div>
                                <div className="p-4">
                                    <h3 className="font-semibold dark:text-white line-clamp-1">{product.name}</h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">{product.brand}</p>
                                    <div className="flex justify-between items-center mt-2">
                                        <div>
                                            <span className="text-lg font-bold text-blue-600">{formatPrice(product.price)}</span>
                                            {product.originalPrice && (
                                                <span className="text-xs text-gray-400 line-through ml-1">{formatPrice(product.originalPrice)}</span>
                                            )}
                                            {product.isTaxFree && (
                                                <span className="text-xs text-purple-600 ml-1">(Tax Free)</span>
                                            )}
                                        </div>
                                        <span className={`text-xs px-2 py-1 rounded-full ${
                                            product.stock > 10 ? 'bg-green-100 text-green-800' :
                                            product.stock > 0 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                                        }`}>
                                            {product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}
                                        </span>
                                    </div>
                                    <div className="flex gap-2 mt-3">
                                        <button onClick={() => toggleFeatured(product)} className={`flex-1 py-1 rounded-lg text-xs font-medium ${
                                            product.isFeatured ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'
                                        }`}>
                                            <FiStar className="inline mr-1" size={12} /> {product.isFeatured ? 'Featured' : 'Set Featured'}
                                        </button>
                                        <button onClick={() => toggleNewArrival(product)} className={`flex-1 py-1 rounded-lg text-xs font-medium ${
                                            product.isNewArrival ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                                        }`}>
                                            <FiZap className="inline mr-1" size={12} /> {product.isNewArrival ? 'New' : 'Set New'}
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            ) : (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 dark:bg-gray-700">
                                <tr>
                                    <th className="px-4 py-3 text-left">Product</th>
                                    <th className="px-4 py-3 text-left">Price</th>
                                    <th className="px-4 py-3 text-left">Stock</th>
                                    <th className="px-4 py-3 text-left">Category</th>
                                    <th className="px-4 py-3 text-left">Status</th>
                                    <th className="px-4 py-3 text-left">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedProducts.map((product) => (
                                    <tr key={product.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                {product.image ? (
                                                    <img 
                                                        src={product.image} 
                                                        alt={product.name} 
                                                        className="w-10 h-10 object-cover rounded"
                                                        onError={(e) => { e.target.src = '/images/no-image.svg'; }}
                                                    />
                                                ) : (
                                                    <div className="w-10 h-10 bg-gray-200 rounded flex items-center justify-center">
                                                        <FiPackage className="w-5 h-5 text-gray-400" />
                                                    </div>
                                                )}
                                                <div>
                                                    <p className="font-medium dark:text-white">{product.name}</p>
                                                    <p className="text-xs text-gray-500">{product.brand}</p>
                                                    {product.isTaxFree && (
                                                        <span className="text-[10px] text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded">Tax Free</span>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 font-semibold">{formatPrice(product.price)}</td>
                                        <td className="px-4 py-3"><span className={`inline-block px-2 py-1 rounded-full text-xs ${product.stock > 10 ? 'bg-green-100 text-green-800' : product.stock > 0 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>{product.stock}</span></td>
                                        <td className="px-4 py-3 text-sm">{product.category}</td>
                                        <td className="px-4 py-3"><div className="flex gap-1 flex-wrap">{product.isFeatured && <span className="inline-block w-2 h-2 bg-yellow-500 rounded-full" title="Featured" />}{product.isNewArrival && <span className="inline-block w-2 h-2 bg-green-500 rounded-full" title="New Arrival" />}{product.isTaxFree && <span className="inline-block w-2 h-2 bg-purple-500 rounded-full" title="Tax Free" />}</div></td>
                                        <td className="px-4 py-3"><div className="flex gap-2"><button onClick={() => handleEdit(product)} className="text-blue-600"><FiEdit2 size={16} /></button><button onClick={() => handleDuplicate(product)} className="text-green-600"><FiCopy size={16} /></button><button onClick={() => handleDelete(product)} className="text-red-600"><FiTrash2 size={16} /></button></div></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex justify-center gap-2 mt-6">
                    <button onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1} className="px-3 py-1 border rounded-lg disabled:opacity-50">Prev</button>
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum;
                        if (totalPages <= 5) pageNum = i + 1;
                        else if (currentPage <= 3) pageNum = i + 1;
                        else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                        else pageNum = currentPage - 2 + i;
                        return (<button key={pageNum} onClick={() => setCurrentPage(pageNum)} className={`px-3 py-1 border rounded-lg ${currentPage === pageNum ? 'bg-blue-600 text-white' : 'hover:bg-gray-100'}`}>{pageNum}</button>);
                    })}
                    <button onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages} className="px-3 py-1 border rounded-lg disabled:opacity-50">Next</button>
                </div>
            )}

            {/* Add/Edit Product Modal */}
            <AnimatePresence>
                {showModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
                        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                            <div className="sticky top-0 bg-white dark:bg-gray-800 p-4 border-b flex justify-between items-center">
                                <h2 className="text-2xl font-bold dark:text-white">{editingProduct ? "Edit Product" : "Add New Product"}</h2>
                                <button onClick={handleCloseModal} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"><FiX size={24} /></button>
                            </div>
                            
                            <form onSubmit={handleSubmit} className="p-6 space-y-4">
                                {/* Featured & New Arrival Toggles */}
                                <div className="grid grid-cols-3 gap-4 bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                                    <label className="flex items-center justify-between p-3 bg-white dark:bg-gray-600 rounded-lg border cursor-pointer">
                                        <span className="font-medium flex items-center gap-2"><FiStar className="text-yellow-500" /> Featured</span>
                                        <input type="checkbox" checked={formData.isFeatured} onChange={(e) => setFormData({...formData, isFeatured: e.target.checked})} className="w-5 h-5" />
                                    </label>
                                    <label className="flex items-center justify-between p-3 bg-white dark:bg-gray-600 rounded-lg border cursor-pointer">
                                        <span className="font-medium flex items-center gap-2"><FiZap className="text-green-500" /> New Arrival</span>
                                        <input type="checkbox" checked={formData.isNewArrival} onChange={(e) => setFormData({...formData, isNewArrival: e.target.checked})} className="w-5 h-5" />
                                    </label>
                                    <label className="flex items-center justify-between p-3 bg-white dark:bg-gray-600 rounded-lg border cursor-pointer">
                                        <span className="font-medium flex items-center gap-2"><FiPercent className="text-purple-500" /> Tax Free</span>
                                        <input type="checkbox" checked={formData.isTaxFree} onChange={(e) => setFormData({...formData, isTaxFree: e.target.checked})} className="w-5 h-5" />
                                    </label>
                                </div>

                                {/* Main Image */}
                                <div>
                                    <label className="block text-sm font-medium mb-1 dark:text-white">Main Product Image</label>
                                    <div className="flex items-start gap-4">
                                        <div className="relative group">
                                            {imagePreview ? (
                                                <div className="relative"><img src={imagePreview} alt="Preview" className="w-32 h-32 object-cover rounded-lg border-2" /><div className="absolute inset-0 bg-black bg-opacity-50 rounded-lg opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2"><button type="button" onClick={() => fileInputRef.current?.click()} className="bg-blue-500 text-white rounded-full p-1.5"><FiUpload size={12} /></button><button type="button" onClick={() => { setCropImage(imagePreview); setCropType('main'); }} className="bg-purple-500 text-white rounded-full p-1.5"><FiCrop size={12} /></button></div></div>
                                            ) : (<div onClick={() => fileInputRef.current?.click()} className="w-32 h-32 border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-blue-500"><FiUpload className="w-8 h-8 text-gray-400" /><span className="text-xs text-gray-500 mt-1">Upload</span></div>)}
                                        </div>
                                        <input type="file" ref={fileInputRef} onChange={(e) => handleImageSelect(e, 'main')} accept="image/*" className="hidden" />
                                        <div className="flex-1"><p className="text-xs text-gray-500">Recommended: 400x500px (Max 5MB)</p><p className="text-xs text-green-600">Images are securely stored in Cloudinary</p></div>
                                    </div>
                                </div>

                                {/* Product Name */}
                                <div><label className="block text-sm font-medium mb-1 dark:text-white">Product Name *</label><input type="text" required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700" /></div>

                                {/* Price Fields */}
                                <div className="grid grid-cols-2 gap-4"><div><label className="block text-sm font-medium mb-1 dark:text-white">Price ({currencySymbol}) *</label><input type="number" step="0.01" required value={formData.price} onChange={(e) => setFormData({...formData, price: e.target.value})} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700" /></div><div><label className="block text-sm font-medium mb-1 dark:text-white">Original Price ({currencySymbol})</label><input type="number" step="0.01" value={formData.originalPrice} onChange={(e) => setFormData({...formData, originalPrice: e.target.value})} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700" /></div></div>

                                {/* Gender Selection */}
                                <div><label className="block text-sm font-medium mb-1 text-red-600 dark:text-red-400">Collection / Gender *</label><div className="grid grid-cols-3 gap-2">{genders.map(g => (<button key={g.value} type="button" onClick={() => handleGenderChange(g.value)} className={`px-4 py-2 rounded-lg font-medium transition-all ${selectedGenderCategory === g.value ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-white'}`}>{g.label}</button>))}</div></div>

                                {/* Category */}
                                <div><label className="block text-sm font-medium mb-1 dark:text-white">Category *</label><select required value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700"><option value="">Select Category</option>{getAllCategories().map(cat => <option key={cat} value={cat}>{cat}</option>)}</select></div>

                                {/* Brand - FIXED with Add New Brand option */}
                                <div>
                                    <label className="block text-sm font-medium mb-1 dark:text-white">Brand</label>
                                    <div className="flex gap-2">
                                        <select 
                                            value={formData.brand} 
                                            onChange={(e) => {
                                                if (e.target.value === "__ADD_NEW__") {
                                                    setShowNewBrandInput(true);
                                                    setFormData({...formData, brand: ""});
                                                } else {
                                                    setFormData({...formData, brand: e.target.value});
                                                }
                                            }} 
                                            className="flex-1 px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                        >
                                            <option value="">Select Brand</option>
                                            {brands.map(b => <option key={b} value={b}>{b}</option>)}
                                            <option value="__ADD_NEW__" className="text-blue-600 font-bold">+ Add New Brand</option>
                                        </select>
                                        {showNewBrandInput && (
                                            <div className="flex gap-2 flex-1">
                                                <input 
                                                    type="text" 
                                                    value={newBrand} 
                                                    onChange={(e) => setNewBrand(e.target.value)} 
                                                    placeholder="Enter new brand name..." 
                                                    className="flex-1 px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                                    autoFocus
                                                />
                                                <button 
                                                    type="button" 
                                                    onClick={addNewBrand} 
                                                    className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-1"
                                                >
                                                    <FiPlusCircle size={16} /> Add
                                                </button>
                                                <button 
                                                    type="button" 
                                                    onClick={() => {
                                                        setShowNewBrandInput(false);
                                                        setNewBrand("");
                                                    }} 
                                                    className="px-3 py-2 bg-gray-400 text-white rounded-lg hover:bg-gray-500"
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    {!showNewBrandInput && formData.brand && (
                                        <p className="text-xs text-gray-400 mt-1">Selected: <span className="font-medium text-blue-600">{formData.brand}</span></p>
                                    )}
                                </div>

                                {/* Stock */}
                                <div><label className="block text-sm font-medium mb-1 dark:text-white">Stock *</label><input type="number" required value={formData.stock} onChange={(e) => setFormData({...formData, stock: e.target.value})} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700" /></div>

                                {/* Sizes */}
                                <div><label className="block text-sm font-medium mb-1 dark:text-white">Available Sizes</label><div className="flex flex-wrap gap-2 p-3 border rounded-lg bg-gray-50 dark:bg-gray-700">{allSizes.map(size => (<button key={size} type="button" onClick={() => toggleSize(size)} className={`px-3 py-1.5 rounded-lg text-sm transition-all ${formData.sizes.includes(size) ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-600 border hover:bg-gray-100'}`}>{size}</button>))}</div></div>

                                {/* Colors - FIXED with expanded colors */}
                                <div>
                                    <label className="block text-sm font-medium mb-1 dark:text-white">Colors & Images</label>
                                    <div className="flex flex-wrap gap-3 p-3 border rounded-lg bg-gray-50 dark:bg-gray-700 max-h-60 overflow-y-auto">
                                        {allColors.map((color) => (
                                            <div key={color.name} className="flex flex-col items-center gap-1">
                                                <button 
                                                    type="button" 
                                                    onClick={() => toggleColor(color.name)} 
                                                    className={`px-3 py-1.5 rounded-lg text-sm flex items-center gap-2 transition-all ${
                                                        formData.colors.includes(color.name) 
                                                            ? 'bg-blue-600 text-white' 
                                                            : 'bg-white dark:bg-gray-600 border hover:bg-gray-100'
                                                    }`}
                                                >
                                                    <div className="w-4 h-4 rounded-full border border-gray-300" style={{ backgroundColor: color.hex }} />
                                                    {color.name}
                                                </button>
                                                {formData.colors.includes(color.name) && (
                                                    <div className="flex flex-col items-center">
                                                        {colorImages[color.name] ? (
                                                            <div className="relative group">
                                                                <img 
                                                                    src={colorImages[color.name]} 
                                                                    alt={color.name} 
                                                                    className="w-12 h-12 object-cover rounded-lg border-2 border-blue-400" 
                                                                />
                                                                <button 
                                                                    type="button" 
                                                                    onClick={() => { setCropImage(colorImages[color.name]); setCropType('color'); setCroppingColor(color.name); }} 
                                                                    className="absolute -top-1 -right-1 bg-purple-500 text-white rounded-full p-0.5 hover:bg-purple-600"
                                                                >
                                                                    <FiCrop size={10} />
                                                                </button>
                                                                <button 
                                                                    type="button" 
                                                                    onClick={() => {
                                                                        setColorImages(prev => {
                                                                            const newImages = { ...prev };
                                                                            delete newImages[color.name];
                                                                            return newImages;
                                                                        });
                                                                    }} 
                                                                    className="absolute -bottom-1 -right-1 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600"
                                                                >
                                                                    <FiX size={10} />
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <button 
                                                                type="button" 
                                                                onClick={() => colorImageInputRef.current[color.name]?.click()} 
                                                                className="w-12 h-12 border-2 border-dashed rounded-lg flex items-center justify-center hover:border-blue-500 transition-colors"
                                                            >
                                                                <FiImage size={16} className="text-gray-400" />
                                                            </button>
                                                        )}
                                                        <input 
                                                            type="file" 
                                                            ref={el => colorImageInputRef.current[color.name] = el} 
                                                            onChange={(e) => handleImageSelect(e, 'color', color.name)} 
                                                            accept="image/*" 
                                                            className="hidden" 
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Description */}
                                <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-700"><label className="block text-md font-semibold mb-2 dark:text-white">📝 Description</label><textarea id="field-description" rows="4" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700" placeholder="Enter product description" /></div>

                                {/* Details */}
                                <div className="border rounded-lg p-4 bg-blue-50 dark:bg-blue-900/20"><label className="text-md font-semibold mb-2 dark:text-white">📋 Product Details</label><textarea id="field-details" rows="5" value={formData.details} onChange={(e) => setFormData({...formData, details: e.target.value})} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 font-mono text-sm" placeholder="• Material: Premium quality fabric&#10;• Fit: Regular fit" /></div>

                                {/* Material & Care */}
                                <div className="grid grid-cols-2 gap-4"><div><label className="block text-sm font-medium mb-1 dark:text-white">Material</label><input type="text" value={formData.material} onChange={(e) => setFormData({...formData, material: e.target.value})} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700" placeholder="e.g., 100% Cotton" /></div><div><label className="block text-sm font-medium mb-1 dark:text-white">Care Instructions</label><input type="text" value={formData.careInstructions} onChange={(e) => setFormData({...formData, careInstructions: e.target.value})} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700" placeholder="Machine wash cold" /></div></div>

                                {/* Tags */}
                                <div><label className="block text-sm font-medium mb-1 dark:text-white">Tags (comma separated)</label><input type="text" value={formData.tags} onChange={(e) => setFormData({...formData, tags: e.target.value.split(',').map(t => t.trim())})} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700" placeholder="summer, casual, premium" /></div>

                                {/* Shipping & Payment Section */}
                                <div className="border-t pt-4 mt-4">
                                    <h3 className="text-lg font-semibold dark:text-white flex items-center gap-2 mb-4">
                                        <FiTruck className="text-blue-600" /> Shipping & Payment Details
                                    </h3>
                                    
                                    <div className="mb-4 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                                        <label className="flex items-center justify-between cursor-pointer">
                                            <div>
                                                <span className="font-medium flex items-center gap-2 text-purple-700 dark:text-purple-400">
                                                    <FiPercent size={18} /> Tax Free Product
                                                </span>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                    Enable this to make the product tax-free. Tax rate will be set to 0%.
                                                </p>
                                            </div>
                                            <input 
                                                type="checkbox" 
                                                checked={formData.isTaxFree} 
                                                onChange={(e) => {
                                                    const isChecked = e.target.checked;
                                                    setFormData({
                                                        ...formData, 
                                                        isTaxFree: isChecked,
                                                        taxRate: isChecked ? 0 : formData.taxRate || 10
                                                    });
                                                }} 
                                                className="w-6 h-6 text-purple-600 rounded focus:ring-purple-500" 
                                            />
                                        </label>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium mb-1 dark:text-white">Shipping Fee ({currencySymbol})</label>
                                            <input type="number" step="0.01" value={formData.shippingFee} onChange={(e) => setFormData({...formData, shippingFee: e.target.value})} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700" placeholder="5.00" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1 dark:text-white">Free Shipping Threshold ({currencySymbol})</label>
                                            <input type="number" step="0.01" value={formData.freeShippingThreshold} onChange={(e) => setFormData({...formData, freeShippingThreshold: e.target.value})} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700" placeholder="100" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1 dark:text-white">
                                                Tax Rate (%) 
                                                {formData.isTaxFree && (
                                                    <span className="text-purple-600 ml-1">(Tax Free)</span>
                                                )}
                                            </label>
                                            <input 
                                                type="number" 
                                                step="0.1" 
                                                value={formData.taxRate} 
                                                onChange={(e) => setFormData({...formData, taxRate: e.target.value})} 
                                                className={`w-full px-3 py-2 border rounded-lg dark:bg-gray-700 ${formData.isTaxFree ? 'bg-gray-100 dark:bg-gray-600 cursor-not-allowed opacity-60' : ''}`}
                                                placeholder="10"
                                                disabled={formData.isTaxFree}
                                            />
                                            {formData.isTaxFree && (
                                                <p className="text-xs text-purple-600 mt-1">Tax rate is 0% because this product is tax free</p>
                                            )}
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1 dark:text-white">Delivery Days</label>
                                            <input type="text" value={formData.deliveryDays} onChange={(e) => setFormData({...formData, deliveryDays: e.target.value})} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700" placeholder="3-5" />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="block text-sm font-medium mb-1 dark:text-white">Return Policy</label>
                                            <input type="text" value={formData.returnPolicy} onChange={(e) => setFormData({...formData, returnPolicy: e.target.value})} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700" placeholder="30-day easy returns" />
                                        </div>
                                    </div>
                                </div>

                                {/* Buttons */}
                                <div className="flex gap-3 pt-4 sticky bottom-0 bg-white dark:bg-gray-800 border-t pt-4 -mb-6 mt-4">
                                    <button 
                                        type="submit" 
                                        disabled={isSubmitting || isSubmittingRef.current} 
                                        className="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <FiSave size={18} /> 
                                        {isSubmitting || isSubmittingRef.current ? "Saving..." : (editingProduct ? "Update Product" : "Add Product")}
                                    </button>
                                    <button type="button" onClick={handleCloseModal} className="flex-1 bg-gray-500 text-white py-3 rounded-lg hover:bg-gray-600">Cancel</button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Image Cropper Modal */}
            {cropImage && (
                <ImageCropper
                    image={cropImage}
                    cropType={cropType === "color" ? "productColor" : "product"}
                    onCropComplete={handleCropComplete}
                    onClose={() => {
                        setCropImage(null);
                        setCropType(null);
                        setCroppingColor(null);
                    }}
                />
            )}
        </div>
    );
};

export default Products;
