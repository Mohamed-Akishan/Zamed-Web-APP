// src/services/productService.js
import { SEED_PRODUCTS } from '../data/seedProducts';
import { fixProductImages } from '../utils/imageUtils';
import { saveImageToDB, getImageFromDB, imageExistsInDB } from './imageStorage';

const NO_IMAGE = '/images/no-image.svg';
const STORAGE_KEYS = ['shop_products', 'admin_products'];

// ============================================================
// FIX: Removed forceWorkingImages - no longer replaces images with Unsplash
// ============================================================
const normalizeProductImage = (image) => {
    if (!image || typeof image !== 'string') return NO_IMAGE;

    const trimmed = image.trim();
    if (!trimmed) return NO_IMAGE;

    // Accept data URLs, http URLs, and db:// references
    if (
        trimmed.startsWith('data:image/') ||
        trimmed.startsWith('blob:') ||
        trimmed.startsWith('/') ||
        trimmed.startsWith('db://') ||
        /^https?:\/\//i.test(trimmed)
    ) {
        return trimmed;
    }

    return NO_IMAGE;
};

const normalizeProductRecord = (product = {}) => {
    const safeProduct = { ...product };

    safeProduct.id = safeProduct.id ?? Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    safeProduct.name = safeProduct.name || 'Unnamed Product';
    safeProduct.gender = String(safeProduct.gender || 'men').toLowerCase();
    safeProduct.category = safeProduct.category || 'General';
    safeProduct.sizes = Array.isArray(safeProduct.sizes) ? safeProduct.sizes : [];
    safeProduct.colors = Array.isArray(safeProduct.colors) ? safeProduct.colors : [];
    safeProduct.stock = Number(safeProduct.stock) || 0;
    safeProduct.price = Number(safeProduct.price) || 0;
    safeProduct.originalPrice =
        safeProduct.originalPrice == null
            ? safeProduct.price
            : Number(safeProduct.originalPrice) || safeProduct.price;
    safeProduct.isFeatured = Boolean(safeProduct.isFeatured);
    safeProduct.isNewArrival = Boolean(safeProduct.isNewArrival);
    safeProduct.inStock = safeProduct.inStock !== false;
    safeProduct.brand = safeProduct.brand || 'Zamed Premium';
    safeProduct.rating = Number(safeProduct.rating) || 4.5;
    safeProduct.image = normalizeProductImage(safeProduct.image);
    safeProduct.tags = Array.isArray(safeProduct.tags) ? safeProduct.tags : [];
    
    // Preserve color images
    if (safeProduct.colorImages && typeof safeProduct.colorImages === 'object') {
        const preservedColorImages = {};
        for (const [color, img] of Object.entries(safeProduct.colorImages)) {
            preservedColorImages[color] = normalizeProductImage(img);
        }
        safeProduct.colorImages = preservedColorImages;
    }

    return safeProduct;
};

const safeReadStorage = (key) => {
    try {
        if (typeof window === 'undefined' || !window.localStorage) return null;
        const value = window.localStorage.getItem(key);
        return value ? JSON.parse(value) : null;
    } catch (error) {
        console.warn(`Unable to read localStorage key: ${key}`, error);
        return null;
    }
};

const safeSetStorage = (key, value) => {
    try {
        if (typeof window === 'undefined' || !window.localStorage) return false;
        window.localStorage.setItem(key, JSON.stringify(value));
        return true;
    } catch (error) {
        console.warn(`Unable to write localStorage key: ${key}`, error);
        return false;
    }
};

const getStoredProducts = () => {
    // Try shop_products first (primary source)
    const shop = safeReadStorage('shop_products');
    if (Array.isArray(shop) && shop.length > 0) {
        return shop.map(normalizeProductRecord);
    }
    
    // Try products as fallback
    const products = safeReadStorage('products');
    if (Array.isArray(products) && products.length > 0) {
        return products.map(normalizeProductRecord);
    }
    
    // Try admin_products as last resort
    const admin = safeReadStorage('admin_products');
    if (Array.isArray(admin) && admin.length > 0) {
        return admin.map(normalizeProductRecord);
    }
    
    return null;
};

// ============================================================
// Save product images to IndexedDB
// ============================================================
const saveProductImagesToDB = async (product) => {
    if (!product || !product.id) return product;
    
    try {
        // Save main image
        if (product.image && typeof product.image === 'string' && product.image.startsWith('data:image')) {
            const imageId = `product_${product.id}_main`;
            const saved = await saveImageToDB(imageId, product.image, 'product');
            if (saved) {
                product.image = `db://${imageId}`;
                console.log(`✅ Main image saved to IndexedDB: ${imageId}`);
            }
        }
        
        // Save color images - PRESERVE existing ones
        if (product.colorImages && typeof product.colorImages === 'object') {
            const updatedColorImages = {};
            for (const [color, imageData] of Object.entries(product.colorImages)) {
                // If it's already a db:// reference, keep it
                if (typeof imageData === 'string' && imageData.startsWith('db://')) {
                    updatedColorImages[color] = imageData;
                    continue;
                }
                
                // If it's a new data URL, save it
                if (imageData && typeof imageData === 'string' && imageData.startsWith('data:image')) {
                    const imageId = `product_${product.id}_color_${color}`;
                    const saved = await saveImageToDB(imageId, imageData, 'product_color');
                    if (saved) {
                        updatedColorImages[color] = `db://${imageId}`;
                        console.log(`✅ Color image saved to IndexedDB: ${imageId}`);
                    } else {
                        updatedColorImages[color] = imageData;
                    }
                } else {
                    updatedColorImages[color] = imageData;
                }
            }
            product.colorImages = updatedColorImages;
        }
    } catch (error) {
        console.error('❌ Error saving product images to IndexedDB:', error);
    }
    
    return product;
};

// ============================================================
// Load product images from IndexedDB - NOW USED BY imageLoader
// ============================================================
export const loadProductImagesFromDB = async (product) => {
    if (!product || !product.id) return product;
    
    const updatedProduct = { ...product };
    
    try {
        // Load main image
        if (product.image && typeof product.image === 'string' && product.image.startsWith('db://')) {
            const imageId = product.image.replace('db://', '');
            const imageData = await getImageFromDB(imageId);
            if (imageData) {
                updatedProduct.image = imageData;
                console.log(`✅ Main image loaded from IndexedDB: ${imageId}`);
            } else {
                console.warn(`⚠️ No image found for: ${imageId}`);
                updatedProduct.image = NO_IMAGE;
            }
        }
        
        // Load color images
        if (product.colorImages && typeof product.colorImages === 'object') {
            const updatedColorImages = {};
            for (const [color, imgRef] of Object.entries(product.colorImages)) {
                if (typeof imgRef === 'string' && imgRef.startsWith('db://')) {
                    const imageId = imgRef.replace('db://', '');
                    const imageData = await getImageFromDB(imageId);
                    if (imageData) {
                        updatedColorImages[color] = imageData;
                        console.log(`✅ Color image loaded from IndexedDB: ${imageId}`);
                    } else {
                        updatedColorImages[color] = NO_IMAGE;
                    }
                } else {
                    updatedColorImages[color] = imgRef;
                }
            }
            updatedProduct.colorImages = updatedColorImages;
        }
    } catch (error) {
        console.error('❌ Error loading product images from IndexedDB:', error);
    }
    
    return updatedProduct;
};

const productService = {
    products: [],
    listeners: [],

    saveProducts() {
        this.products = this.products.map((product) => normalizeProductRecord(product));
        
        const saved = safeSetStorage('shop_products', this.products);
        safeSetStorage('products', this.products);
        safeSetStorage('admin_products', this.products);

        if (saved) {
            console.log(`💾 Saved ${this.products.length} products to localStorage`);
            this.notifyListeners();

            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('productsUpdated'));
                window.dispatchEvent(new Event('storage'));
            }
        } else {
            console.error('❌ Failed to save products to localStorage');
        }

        return this.products;
    },

    init() {
        console.log('=== PRODUCT SERVICE INITIALIZED ===');

        const storedProducts = getStoredProducts();

        if (storedProducts && storedProducts.length > 0) {
            // FIX: Removed forceWorkingImages - preserve real images
            this.products = storedProducts;
            console.log(`✅ Loaded ${this.products.length} products from storage`);
        } else {
            console.log('📦 No products found. Starting with empty catalog.');
            this.products = [];
        }

        this.logAllProducts();
        return this;
    },

    getDefaultProducts() {
        return [];
    },

    logAllProducts() {
        console.log('\n=== 📊 ALL PRODUCTS IN STORAGE ===');
        console.log(`📦 Total Products: ${this.products.length}`);
        console.log(`👨 Men: ${this.products.filter((p) => p.gender === 'men').length} products`);
        console.log(`👩 Women: ${this.products.filter((p) => p.gender === 'women').length} products`);
        console.log(`👧 Kids: ${this.products.filter((p) => p.gender === 'kids').length} products`);
        console.log(`⭐ Featured: ${this.products.filter((p) => p.isFeatured).length} products`);
        console.log(`🆕 New Arrivals: ${this.products.filter((p) => p.isNewArrival).length} products`);

        console.log('\n📋 Product List:');
        this.products.forEach((p) => {
            console.log(`   ${p.isFeatured ? '⭐' : '  '} ${p.isNewArrival ? '🆕' : '  '} "${p.name}" | Gender: "${p.gender}" | Category: "${p.category}" | Price: $${p.price}`);
        });
        console.log('===================================\n');
    },

    getAllProducts() {
        return [...this.products];
    },

    // ============================================================
    // FIX: getAllProductsWithImages - NOW uses imageLoader
    // ============================================================
    async getAllProductsWithImages() {
        console.log('📦 Loading products with images from IndexedDB...');
        const products = [...this.products];
        
        // Import imageLoader dynamically to avoid circular dependency
        const { loadAllProductImages } = await import('../utils/imageLoader');
        
        return await loadAllProductImages(products);
    },

    // ============================================================
    // FIX: getProductWithImages - NOW uses imageLoader
    // ============================================================
    async getProductWithImages(id) {
        const product = this.products.find((p) => String(p.id) === String(id));
        if (!product) return null;
        
        const { loadProductImages } = await import('../utils/imageLoader');
        return await loadProductImages({ ...product });
    },

    getProductsByGender(gender) {
        const normalizedGender = String(gender || '').toLowerCase();
        const filtered = this.products.filter((p) => p.gender === normalizedGender);
        return filtered;
    },

    getProductsByCategory(category) {
        return this.products.filter((p) => p.category === category);
    },

    getFeaturedProducts(limit = 8) {
        return this.products.filter((p) => p.isFeatured === true).slice(0, limit);
    },

    getNewArrivals(limit = 8) {
        return this.products.filter((p) => p.isNewArrival === true).slice(0, limit);
    },

    getProductById(id) {
        const product = this.products.find((p) => String(p.id) === String(id));
        return product || null;
    },

    searchProducts(query) {
        const lowerQuery = String(query || '').toLowerCase();
        return this.products.filter((product) =>
            product.name.toLowerCase().includes(lowerQuery) ||
            (product.brand && product.brand.toLowerCase().includes(lowerQuery)) ||
            (product.category && product.category.toLowerCase().includes(lowerQuery)) ||
            (product.description && product.description.toLowerCase().includes(lowerQuery))
        );
    },

    // ============================================================
    // FIX: addProduct - Saves images to IndexedDB
    // ============================================================
    async addProduct(product) {
        const validGender = String(product?.gender || 'men').toLowerCase();

        const uniqueId = Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 9);

        let newProduct = normalizeProductRecord({
            id: uniqueId,
            name: product.name,
            price: parseFloat(product.price),
            originalPrice: product.originalPrice ? parseFloat(product.originalPrice) : null,
            gender: validGender,
            category: product.category || 'top-wear',
            sizes: product.sizes || [],
            colors: product.colors || [],
            stock: parseInt(product.stock) || 50,
            description: product.description || 'Premium quality product with excellent craftsmanship.',
            brand: product.brand || 'Zamed Premium',
            image: product.image || NO_IMAGE,
            colorImages: product.colorImages || {},
            rating: 4.5,
            isFeatured: Boolean(product.isFeatured),
            isNewArrival: Boolean(product.isNewArrival),
            inStock: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        });

        // Save images to IndexedDB
        newProduct = await saveProductImagesToDB(newProduct);

        this.products.push(newProduct);
        this.saveProducts();
        
        console.log(`✅ Added product: "${newProduct.name}" (${newProduct.id})`);
        console.log(`📦 Total products now: ${this.products.length}`);
        
        return newProduct;
    },

    // ============================================================
    // FIX: updateProduct - Preserves existing color images
    // ============================================================
    async updateProduct(id, updatedData) {
        const index = this.products.findIndex((p) => String(p.id) === String(id));

        if (index === -1) {
            console.warn(`Product with id ${id} not found for update`);
            return null;
        }

        if (updatedData.gender) {
            updatedData.gender = String(updatedData.gender).toLowerCase();
        }

        // Preserve existing color images if new ones aren't provided
        const existingProduct = this.products[index];
        if (!updatedData.colorImages || Object.keys(updatedData.colorImages).length === 0) {
            updatedData.colorImages = existingProduct.colorImages || {};
        }

        let updatedProduct = {
            ...existingProduct,
            ...updatedData,
            updatedAt: new Date().toISOString(),
        };

        // Save new images to IndexedDB
        updatedProduct = await saveProductImagesToDB(updatedProduct);

        this.products[index] = updatedProduct;
        this.saveProducts();
        console.log(`✅ Updated product: "${this.products[index].name}"`);
        return this.products[index];
    },

    deleteProduct(id) {
        const deletedProduct = this.products.find((p) => String(p.id) === String(id));

        if (!deletedProduct) {
            console.warn(`Product with id ${id} not found for deletion`);
            return false;
        }

        this.products = this.products.filter((p) => String(p.id) !== String(id));
        this.saveProducts();
        console.log(`🗑️ Deleted product: "${deletedProduct.name}"`);
        console.log(`📦 Total products now: ${this.products.length}`);
        return true;
    },

    getProductsPaginated(page = 1, limit = 12, filters = {}) {
        let filtered = [...this.products];

        if (filters.gender && filters.gender !== 'all') {
            filtered = filtered.filter((p) => p.gender === filters.gender);
        }
        if (filters.category && filters.category !== 'all') {
            filtered = filtered.filter((p) => p.category === filters.category);
        }
        if (filters.minPrice) {
            filtered = filtered.filter((p) => p.price >= filters.minPrice);
        }
        if (filters.maxPrice) {
            filtered = filtered.filter((p) => p.price <= filters.maxPrice);
        }
        if (filters.search) {
            const searchLower = filters.search.toLowerCase();
            filtered = filtered.filter((p) =>
                p.name.toLowerCase().includes(searchLower) ||
                p.brand?.toLowerCase().includes(searchLower)
            );
        }
        if (filters.featured) {
            filtered = filtered.filter((p) => p.isFeatured === true);
        }
        if (filters.newArrival) {
            filtered = filtered.filter((p) => p.isNewArrival === true);
        }

        if (filters.sortBy === 'price_asc') {
            filtered.sort((a, b) => a.price - b.price);
        } else if (filters.sortBy === 'price_desc') {
            filtered.sort((a, b) => b.price - a.price);
        } else if (filters.sortBy === 'newest') {
            filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        } else if (filters.sortBy === 'rating') {
            filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        }

        const start = (page - 1) * limit;
        const paginated = filtered.slice(start, start + limit);

        return {
            products: paginated,
            total: filtered.length,
            page,
            totalPages: Math.ceil(filtered.length / limit),
            limit,
        };
    },

    getAllBrands() {
        return [...new Set(this.products.map((p) => p.brand).filter(Boolean))].sort();
    },

    getAllCategories() {
        return [...new Set(this.products.map((p) => p.category).filter(Boolean))].sort();
    },

    getProductCountByGender() {
        return {
            men: this.products.filter((p) => p.gender === 'men').length,
            women: this.products.filter((p) => p.gender === 'women').length,
            kids: this.products.filter((p) => p.gender === 'kids').length,
            total: this.products.length,
        };
    },

    getLowStockProducts(threshold = 10) {
        return this.products.filter((p) => p.stock > 0 && p.stock < threshold);
    },

    getOutOfStockProducts() {
        return this.products.filter((p) => p.stock === 0);
    },

    bulkUpdateStock(updates) {
        let updatedCount = 0;

        this.products = this.products.map((product) => {
            const update = updates.find((u) => String(u.id) === String(product.id));
            if (update && update.stock !== undefined) {
                updatedCount += 1;
                return { ...product, stock: Math.max(0, update.stock) };
            }
            return product;
        });

        this.saveProducts();
        return updatedCount;
    },

    getStockStats() {
        const products = this.products;
        return {
            totalStock: products.reduce((sum, p) => sum + (p.stock || 0), 0),
            averageStock: products.length > 0 ? products.reduce((sum, p) => sum + (p.stock || 0), 0) / products.length : 0,
            lowStockCount: products.filter((p) => p.stock > 0 && p.stock < 10).length,
            outOfStockCount: products.filter((p) => p.stock === 0).length,
            totalValue: products.reduce((sum, p) => sum + ((p.price || 0) * (p.stock || 0)), 0),
        };
    },

    forceRefresh() {
        const stored = getStoredProducts();
        if (stored && stored.length > 0) {
            this.products = stored;
            this.notifyListeners();
        }
        return this.products;
    },

    subscribe(callback) {
        this.listeners.push(callback);
        return () => {
            this.listeners = this.listeners.filter((listener) => listener !== callback);
        };
    },

    notifyListeners() {
        this.listeners.forEach((callback) => {
            try {
                callback(this.products);
            } catch (error) {
                console.error('Error in listener:', error);
            }
        });
    },
};

if (typeof window !== 'undefined') {
    productService.init();
    window.productService = productService;
}

export default productService;