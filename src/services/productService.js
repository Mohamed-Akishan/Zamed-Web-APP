// src/services/productService.js
import { SEED_PRODUCTS } from '../data/seedProducts';
import { fixProductImages } from '../utils/imageUtils';

const NO_IMAGE = '/images/no-image.svg';
const STORAGE_KEYS = ['shop_products', 'admin_products'];

const forceWorkingImages = (products) => {
    if (!Array.isArray(products)) return [];
    return fixProductImages(products);
};

const normalizeProductImage = (image) => {
    if (!image || typeof image !== 'string') return NO_IMAGE;

    const trimmed = image.trim();
    if (!trimmed) return NO_IMAGE;

    if (
        trimmed.startsWith('data:image/') ||
        trimmed.startsWith('blob:') ||
        trimmed.startsWith('/') ||
        /^https?:\/\//i.test(trimmed)
    ) {
        return trimmed;
    }

    return NO_IMAGE;
};

const normalizeProductRecord = (product = {}) => {
    const safeProduct = { ...product };

    safeProduct.id = safeProduct.id ?? Date.now();
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
    for (const key of STORAGE_KEYS) {
        const parsed = safeReadStorage(key);
        if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed.map(normalizeProductRecord);
        }
    }

    return null;
};

const productService = {
    products: [],
    listeners: [],

    init() {
        console.log('=== PRODUCT SERVICE INITIALIZED ===');

        const storedProducts = getStoredProducts();

        if (storedProducts && storedProducts.length > 0) {
            this.products = forceWorkingImages(storedProducts);
            console.log(`✅ Loaded ${this.products.length} products from storage`);
            this.saveProducts();
        } else {
            console.log('📦 No products found, using seed data fallback');
            this.products = this.getDefaultProducts();
            this.saveProducts();
        }

        this.logAllProducts();
        return this;
    },

    getDefaultProducts() {
        const defaultProducts = Array.isArray(SEED_PRODUCTS)
            ? SEED_PRODUCTS.map((product) => normalizeProductRecord(product))
            : [];

        console.log(`📦 Created ${defaultProducts.length} products from seed data`);
        return forceWorkingImages(defaultProducts);
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

    saveProducts() {
        this.products = this.products.map((product) => normalizeProductRecord(product));
        const productsJson = JSON.stringify(this.products);

        const shopSaved = safeSetStorage('shop_products', this.products);
        const adminSaved = safeSetStorage('admin_products', this.products);

        if (shopSaved || adminSaved) {
            console.log('💾 Products saved successfully');
            this.notifyListeners();

            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('productsUpdated'));
                window.dispatchEvent(new Event('storage'));
            }
        } else {
            console.error('❌ Failed to save products to localStorage');
        }

        return productsJson;
    },

    getAllProducts() {
        return [...this.products];
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

    addProduct(product) {
        const validGender = String(product?.gender || 'men').toLowerCase();

        const newProduct = normalizeProductRecord({
            id: Date.now(),
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

        this.products.push(newProduct);
        this.saveProducts();
        return newProduct;
    },

    updateProduct(id, updatedData) {
        const index = this.products.findIndex((p) => String(p.id) === String(id));

        if (index === -1) return null;

        if (updatedData.gender) {
            updatedData.gender = String(updatedData.gender).toLowerCase();
        }

        this.products[index] = {
            ...this.products[index],
            ...updatedData,
            updatedAt: new Date().toISOString(),
        };

        this.saveProducts();
        return this.products[index];
    },

    deleteProduct(id) {
        const deletedProduct = this.products.find((p) => String(p.id) === String(id));

        if (!deletedProduct) return false;

        this.products = this.products.filter((p) => String(p.id) !== String(id));
        this.saveProducts();
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