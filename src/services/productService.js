// src/services/productService.js
import { saveImageToDB, getImageFromDB, deleteImageFromDB, cleanupOldImages } from "./imageStorage";

// Helper function to safely save to localStorage with fallback
const safeSetItem = (key, value) => {
    try {
        localStorage.setItem(key, value);
        return true;
    } catch (error) {
        if (error.name === 'QuotaExceededError') {
            console.warn(`⚠️ Quota exceeded for ${key}, attempting to clear old data...`);
            
            // Try to clear non-essential items
            const nonEssentialKeys = [
                'admin_notifications', 
                'guestOrders', 
                'cart',
                'site_settings_last_updated',
                'site_settings_last_saved',
                'admin_orders_backup'
            ];
            
            for (const k of nonEssentialKeys) {
                if (localStorage.getItem(k)) {
                    localStorage.removeItem(k);
                    console.log(`🗑️ Cleared: ${k}`);
                }
            }
            
            // Retry saving
            try {
                localStorage.setItem(key, value);
                console.log(`✅ Successfully saved ${key} after cleanup`);
                return true;
            } catch (retryError) {
                console.error(`❌ Failed to save ${key} even after cleanup:`, retryError);
                return false;
            }
        }
        console.error(`Error saving to localStorage:`, error);
        return false;
    }
};

const productService = {
    products: [],
    listeners: [],

    init() {
        console.log("=== PRODUCT SERVICE INITIALIZED ===");
        
        let stored = localStorage.getItem('shop_products');
        if (!stored) {
            stored = localStorage.getItem('admin_products');
        }
        
        if (stored) {
            try {
                this.products = JSON.parse(stored);
                console.log(`✅ Loaded ${this.products.length} products from storage`);
                
                // Fix all products - ensure gender is lowercase and all fields are present
                let fixedCount = 0;
                this.products = this.products.map(product => {
                    let updated = { ...product };
                    
                    // Fix gender
                    if (updated.gender) {
                        const originalGender = updated.gender;
                        updated.gender = updated.gender.toLowerCase();
                        if (originalGender !== updated.gender) {
                            fixedCount++;
                            console.log(`🔧 Fixed gender case: "${originalGender}" -> "${updated.gender}" for "${updated.name}"`);
                        }
                    } else {
                        updated.gender = 'men';
                        fixedCount++;
                        console.log(`🔧 Added missing gender: "men" for "${updated.name}"`);
                    }
                    
                    // Ensure all required fields exist
                    if (updated.isFeatured === undefined) updated.isFeatured = false;
                    if (updated.isNewArrival === undefined) updated.isNewArrival = false;
                    if (!updated.sizes) updated.sizes = [];
                    if (!updated.colors) updated.colors = [];
                    if (updated.stock === undefined) updated.stock = 50;
                    if (!updated.brand) updated.brand = "Zamed Premium";
                    if (!updated.rating) updated.rating = 4.5;
                    if (!updated.reviews) updated.reviews = 0;
                    if (!updated.category) updated.category = "top-wear";
                    if (!updated.description) updated.description = "Premium quality product";
                    
                    return updated;
                });
                
                if (fixedCount > 0) {
                    console.log(`🔧 Fixed ${fixedCount} products`);
                    this.saveProducts();
                }
            } catch (parseError) {
                console.error("Error parsing stored products:", parseError);
                this.products = this.getDefaultProducts();
                this.saveProducts();
            }
        } else {
            console.log("📦 No products found, creating default products");
            this.products = this.getDefaultProducts();
            this.saveProducts();
        }
        
        this.logAllProducts();
        return this;
    },

    getDefaultProducts() {
        const defaultProducts = [
            {
                id: 1001,
                name: "Classic Men's Cotton T-Shirt",
                price: 29.99,
                originalPrice: 49.99,
                gender: "men",
                category: "T-Shirts",
                sizes: ["S", "M", "L", "XL"],
                colors: ["Black", "White", "Navy"],
                stock: 100,
                description: "Premium quality 100% cotton t-shirt with comfortable fit. Perfect for everyday wear. Breathable fabric and durable stitching.",
                brand: "Zamed Premium",
                image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500&h=600&fit=crop",
                rating: 4.5,
                reviews: 128,
                isFeatured: true,
                isNewArrival: true,
                inStock: true,
                createdAt: new Date().toISOString()
            },
            {
                id: 1002,
                name: "Women's Floral Summer Dress",
                price: 59.99,
                originalPrice: 89.99,
                gender: "women",
                category: "Dresses",
                sizes: ["XS", "S", "M", "L"],
                colors: ["Red", "Blue", "Pink"],
                stock: 75,
                description: "Beautiful floral summer dress made from breathable cotton blend. Perfect for beach days and summer parties.",
                brand: "Zamed Premium",
                image: "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=500&h=600&fit=crop",
                rating: 4.8,
                reviews: 256,
                isFeatured: true,
                isNewArrival: false,
                inStock: true,
                createdAt: new Date().toISOString()
            },
            {
                id: 1003,
                name: "Kids Running Sport Shoes",
                price: 39.99,
                originalPrice: 59.99,
                gender: "kids",
                category: "Footwear",
                sizes: ["1", "2", "3", "4"],
                colors: ["Black", "Red", "Blue"],
                stock: 50,
                description: "Comfortable and durable sports shoes for active kids. Non-slip sole and breathable material.",
                brand: "Zamed Premium",
                image: "https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?w=500&h=600&fit=crop",
                rating: 4.6,
                reviews: 89,
                isFeatured: false,
                isNewArrival: true,
                inStock: true,
                createdAt: new Date().toISOString()
            },
            {
                id: 1004,
                name: "Men's Slim Fit Jeans",
                price: 49.99,
                originalPrice: 79.99,
                gender: "men",
                category: "Jeans",
                sizes: ["28", "30", "32", "34", "36"],
                colors: ["Blue", "Black", "Grey"],
                stock: 85,
                description: "Premium denim jeans with slim fit design. Stretchable fabric for maximum comfort.",
                brand: "Zamed Premium",
                image: "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=500&h=600&fit=crop",
                rating: 4.7,
                reviews: 312,
                isFeatured: true,
                isNewArrival: false,
                inStock: true,
                createdAt: new Date().toISOString()
            },
            {
                id: 1005,
                name: "Women's Leather Handbag",
                price: 89.99,
                originalPrice: 149.99,
                gender: "women",
                category: "Accessories",
                sizes: ["One Size"],
                colors: ["Brown", "Black", "Tan"],
                stock: 30,
                description: "Elegant genuine leather handbag with multiple compartments. Perfect for daily use.",
                brand: "Zamed Premium",
                image: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=500&h=600&fit=crop",
                rating: 4.9,
                reviews: 445,
                isFeatured: true,
                isNewArrival: true,
                inStock: true,
                createdAt: new Date().toISOString()
            },
            {
                id: 1006,
                name: "Kids Winter Puffer Jacket",
                price: 55.99,
                originalPrice: 89.99,
                gender: "kids",
                category: "Jackets",
                sizes: ["2T", "3T", "4T", "5T", "6T"],
                colors: ["Red", "Blue", "Green", "Yellow"],
                stock: 60,
                description: "Warm and cozy winter jacket for kids. Water-resistant outer shell with soft inner lining.",
                brand: "Zamed Premium",
                image: "https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?w=500&h=600&fit=crop",
                rating: 4.5,
                reviews: 67,
                isFeatured: false,
                isNewArrival: true,
                inStock: true,
                createdAt: new Date().toISOString()
            },
            {
                id: 1007,
                name: "Men's Hoodie Sweatshirt",
                price: 45.99,
                originalPrice: 69.99,
                gender: "men",
                category: "Hoodies",
                sizes: ["S", "M", "L", "XL", "XXL"],
                colors: ["Black", "Grey", "Navy"],
                stock: 90,
                description: "Cozy fleece hoodie with front pocket and adjustable drawstring hood. Perfect for casual wear.",
                brand: "Zamed Premium",
                image: "https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=500&h=600&fit=crop",
                rating: 4.6,
                reviews: 178,
                isFeatured: false,
                isNewArrival: true,
                inStock: true,
                createdAt: new Date().toISOString()
            },
            {
                id: 1008,
                name: "Women's Abaya - Premium Quality",
                price: 79.99,
                originalPrice: 129.99,
                gender: "women",
                category: "Abayas",
                sizes: ["S", "M", "L", "XL"],
                colors: ["Black", "Navy", "Beige", "Maroon"],
                stock: 45,
                description: "Elegant and comfortable abaya made from premium crepe fabric. Perfect for daily wear and special occasions.",
                brand: "Zamed Premium",
                image: "https://images.unsplash.com/photo-1583391733956-3750e0b4f8d6?w=500&h=600&fit=crop",
                rating: 4.9,
                reviews: 234,
                isFeatured: true,
                isNewArrival: true,
                inStock: true,
                createdAt: new Date().toISOString()
            },
            {
                id: 1009,
                name: "Women's Hijab - Chiffon",
                price: 19.99,
                originalPrice: 29.99,
                gender: "women",
                category: "Hijabs",
                sizes: ["One Size"],
                colors: ["Black", "White", "Beige", "Pink", "Lavender", "Mint"],
                stock: 200,
                description: "Soft and breathable chiffon hijab. Lightweight and comfortable for all-day wear.",
                brand: "Zamed Premium",
                image: "https://images.unsplash.com/photo-1583391733956-3750e0b4f8d6?w=500&h=600&fit=crop",
                rating: 4.7,
                reviews: 567,
                isFeatured: false,
                isNewArrival: true,
                inStock: true,
                createdAt: new Date().toISOString()
            },
            {
                id: 1010,
                name: "Women's Sports Bra",
                price: 29.99,
                originalPrice: 49.99,
                gender: "women",
                category: "Sports Bra",
                sizes: ["XS", "S", "M", "L", "XL"],
                colors: ["Black", "White", "Pink", "Blue"],
                stock: 120,
                description: "High-impact sports bra with moisture-wicking fabric. Perfect for running, gym, and yoga.",
                brand: "Zamed Premium",
                image: "https://images.unsplash.com/photo-1583391733956-3750e0b4f8d6?w=500&h=600&fit=crop",
                rating: 4.8,
                reviews: 189,
                isFeatured: false,
                isNewArrival: false,
                inStock: true,
                createdAt: new Date().toISOString()
            }
        ];
        console.log(`📦 Created ${defaultProducts.length} default products`);
        return defaultProducts;
    },

    logAllProducts() {
        console.log("\n=== 📊 ALL PRODUCTS IN STORAGE ===");
        console.log(`📦 Total Products: ${this.products.length}`);
        console.log(`👨 Men: ${this.products.filter(p => p.gender === 'men').length} products`);
        console.log(`👩 Women: ${this.products.filter(p => p.gender === 'women').length} products`);
        console.log(`👧 Kids: ${this.products.filter(p => p.gender === 'kids').length} products`);
        console.log(`⭐ Featured: ${this.products.filter(p => p.isFeatured).length} products`);
        console.log(`🆕 New Arrivals: ${this.products.filter(p => p.isNewArrival).length} products`);
        
        console.log("\n📋 Product List:");
        this.products.forEach(p => {
            console.log(`   ${p.isFeatured ? '⭐' : '  '} ${p.isNewArrival ? '🆕' : '  '} "${p.name}" | Gender: "${p.gender}" | Category: "${p.category}" | Price: $${p.price}`);
        });
        console.log("===================================\n");
    },

    saveProducts() {
        const productsJson = JSON.stringify(this.products);
        
        // Try to save with safeSetItem
        const savedShop = safeSetItem('shop_products', productsJson);
        const savedAdmin = safeSetItem('admin_products', productsJson);
        
        if (savedShop || savedAdmin) {
            console.log("💾 Products saved successfully");
            this.notifyListeners();
            window.dispatchEvent(new CustomEvent('productsUpdated'));
            window.dispatchEvent(new Event('storage'));
            
            // Show warning if localStorage is getting full
            const totalSize = JSON.stringify(localStorage).length;
            if (totalSize > 4 * 1024 * 1024) {
                console.warn(`⚠️ localStorage is ${(totalSize / 1024 / 1024).toFixed(2)} MB / 5 MB`);
                window.dispatchEvent(new CustomEvent('storageWarning', { 
                    detail: { message: "Storage is getting full! Consider using smaller images." }
                }));
            }
        } else {
            console.error("❌ Failed to save products to localStorage");
            window.dispatchEvent(new CustomEvent('storageFull', { 
                detail: { message: "Storage is full! Please delete some products or clear cache." }
            }));
        }
    },

    getAllProducts() {
        return [...this.products];
    },

    getProductsByGender(gender) {
        const normalizedGender = gender.toLowerCase();
        console.log(`🔍 Filtering products by gender: "${normalizedGender}"`);
        const filtered = this.products.filter(p => p.gender === normalizedGender);
        console.log(`✅ Found ${filtered.length} products for ${normalizedGender}`);
        
        if (filtered.length === 0) {
            console.warn(`⚠️ No products with gender "${normalizedGender}". Available genders:`, [...new Set(this.products.map(p => p.gender))]);
        } else {
            filtered.forEach(p => console.log(`   - ${p.name}`));
        }
        return filtered;
    },

    getProductsByCategory(category) {
        return this.products.filter(p => p.category === category);
    },

    getFeaturedProducts(limit = 8) {
        const featured = this.products.filter(p => p.isFeatured === true);
        console.log(`⭐ Found ${featured.length} featured products`);
        return featured.slice(0, limit);
    },

    getNewArrivals(limit = 8) {
        const newArrivals = this.products.filter(p => p.isNewArrival === true);
        console.log(`🆕 Found ${newArrivals.length} new arrivals`);
        return newArrivals.slice(0, limit);
    },

    getProductById(id) {
        const product = this.products.find(p => p.id === parseInt(id) || p.id === id);
        if (product) {
            console.log(`📦 Found product: ${product.name}`);
        } else {
            console.log(`❌ Product with ID ${id} not found`);
        }
        return product;
    },

    searchProducts(query) {
        const lowerQuery = query.toLowerCase();
        const results = this.products.filter(product => 
            product.name.toLowerCase().includes(lowerQuery) ||
            (product.brand && product.brand.toLowerCase().includes(lowerQuery)) ||
            (product.category && product.category.toLowerCase().includes(lowerQuery)) ||
            (product.description && product.description.toLowerCase().includes(lowerQuery))
        );
        console.log(`🔍 Search for "${query}" found ${results.length} results`);
        return results;
    },

    addProduct(product) {
        console.log("\n=== 🆕 ADDING NEW PRODUCT ===");
        console.log("📝 Received product data:", product);
        
        // CRITICAL: Ensure gender is set correctly
        let gender = product.gender;
        if (!gender || gender === "") {
            console.error("❌ GENDER IS MISSING! Setting to 'men' as default");
            gender = "men";
        }
        gender = gender.toLowerCase();
        console.log(`✅ Using gender: "${gender}"`);
        
        const newProduct = {
            id: Date.now(),
            name: product.name,
            price: parseFloat(product.price),
            originalPrice: product.originalPrice ? parseFloat(product.originalPrice) : null,
            gender: gender,
            category: product.category || "top-wear",
            sizes: product.sizes || [],
            colors: product.colors || [],
            stock: parseInt(product.stock) || 50,
            description: product.description || "Premium quality product with excellent craftsmanship.",
            brand: product.brand || "Zamed Premium",
            image: product.image || `https://picsum.photos/500/600?random=${Date.now()}`,
            colorImages: product.colorImages || {},
            rating: 4.5,
            reviews: 0,
            isFeatured: product.isFeatured || false,
            isNewArrival: product.isNewArrival || false,
            inStock: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        console.log(`🎯 Product will appear in: "${newProduct.gender}" collection`);
        console.log("✅ Created product:", newProduct);
        
        this.products.push(newProduct);
        this.saveProducts();
        
        // Verify the product was added correctly
        const verifyCount = this.getProductsByGender(gender).length;
        console.log(`📊 Total ${gender} products now: ${verifyCount}`);
        console.log("=== 🆕 PRODUCT ADDED SUCCESSFULLY ===\n");
        
        return newProduct;
    },

    updateProduct(id, updatedData) {
        console.log(`✏️ Updating product ${id}`);
        const index = this.products.findIndex(p => p.id === parseInt(id) || p.id === id);
        if (index !== -1) {
            // Normalize gender if present in updated data
            if (updatedData.gender) {
                updatedData.gender = updatedData.gender.toLowerCase();
            }
            
            this.products[index] = { 
                ...this.products[index], 
                ...updatedData, 
                updatedAt: new Date().toISOString() 
            };
            this.saveProducts();
            console.log(`✅ Product ${id} updated successfully`);
            return this.products[index];
        }
        console.log(`❌ Product ${id} not found for update`);
        return null;
    },

    deleteProduct(id) {
        console.log(`🗑️ Deleting product ${id}`);
        const deletedProduct = this.products.find(p => p.id === parseInt(id) || p.id === id);
        if (deletedProduct) {
            this.products = this.products.filter(p => p.id !== parseInt(id) && p.id !== id);
            this.saveProducts();
            console.log(`✅ Product "${deletedProduct.name}" deleted successfully`);
            
            // Trigger cleanup of unused images
            cleanupOldImages().catch(console.error);
            
            return true;
        }
        console.log(`❌ Product ${id} not found for deletion`);
        return false;
    },

    // ==================== NEW UTILITY METHODS ====================
    
    getProductsPaginated(page = 1, limit = 12, filters = {}) {
        let filtered = [...this.products];
        
        if (filters.gender && filters.gender !== 'all') {
            filtered = filtered.filter(p => p.gender === filters.gender);
        }
        if (filters.category && filters.category !== 'all') {
            filtered = filtered.filter(p => p.category === filters.category);
        }
        if (filters.minPrice) {
            filtered = filtered.filter(p => p.price >= filters.minPrice);
        }
        if (filters.maxPrice) {
            filtered = filtered.filter(p => p.price <= filters.maxPrice);
        }
        if (filters.search) {
            const searchLower = filters.search.toLowerCase();
            filtered = filtered.filter(p => 
                p.name.toLowerCase().includes(searchLower) ||
                p.brand?.toLowerCase().includes(searchLower)
            );
        }
        if (filters.featured) {
            filtered = filtered.filter(p => p.isFeatured === true);
        }
        if (filters.newArrival) {
            filtered = filtered.filter(p => p.isNewArrival === true);
        }
        
        // Sort
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
            limit
        };
    },

    getAllBrands() {
        const brands = [...new Set(this.products.map(p => p.brand).filter(b => b))];
        return brands.sort();
    },

    getAllCategories() {
        const categories = [...new Set(this.products.map(p => p.category).filter(c => c))];
        return categories.sort();
    },

    getProductCountByGender() {
        return {
            men: this.products.filter(p => p.gender === 'men').length,
            women: this.products.filter(p => p.gender === 'women').length,
            kids: this.products.filter(p => p.gender === 'kids').length,
            total: this.products.length
        };
    },

    getLowStockProducts(threshold = 10) {
        return this.products.filter(p => p.stock > 0 && p.stock < threshold);
    },

    getOutOfStockProducts() {
        return this.products.filter(p => p.stock === 0);
    },

    bulkUpdateStock(updates) {
        let updatedCount = 0;
        this.products = this.products.map(product => {
            const update = updates.find(u => u.id === product.id);
            if (update && update.stock !== undefined) {
                updatedCount++;
                return { ...product, stock: Math.max(0, update.stock) };
            }
            return product;
        });
        this.saveProducts();
        console.log(`✅ Bulk updated stock for ${updatedCount} products`);
        return updatedCount;
    },

    getStockStats() {
        const products = this.products;
        return {
            totalStock: products.reduce((sum, p) => sum + (p.stock || 0), 0),
            averageStock: products.length > 0 ? products.reduce((sum, p) => sum + (p.stock || 0), 0) / products.length : 0,
            lowStockCount: products.filter(p => p.stock > 0 && p.stock < 10).length,
            outOfStockCount: products.filter(p => p.stock === 0).length,
            totalValue: products.reduce((sum, p) => sum + ((p.price || 0) * (p.stock || 0)), 0)
        };
    },

    forceRefresh() {
        console.log("🔄 Force refreshing products...");
        const stored = localStorage.getItem('shop_products');
        if (stored) {
            try {
                this.products = JSON.parse(stored);
                this.logAllProducts();
                this.notifyListeners();
            } catch (e) {
                console.error("Error parsing stored products:", e);
            }
        }
        return this.products;
    },

    subscribe(callback) {
        this.listeners.push(callback);
        return () => {
            this.listeners = this.listeners.filter(l => l !== callback);
        };
    },

    notifyListeners() {
        this.listeners.forEach(callback => {
            try {
                callback(this.products);
            } catch (e) {
                console.error("Error in listener:", e);
            }
        });
    }
};

// Initialize the service
productService.init();

// Make available globally for debugging
window.productService = productService;

export default productService;