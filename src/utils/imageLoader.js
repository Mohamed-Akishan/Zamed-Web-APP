// src/utils/imageLoader.js
import { getImageFromDB, imageExistsInDB } from '../services/imageStorage';

const NO_IMAGE = '/images/no-image.svg';

/**
 * Resolves a db:// reference to actual image data from IndexedDB
 * @param {string} imageRef - The image reference (db://id or data URL or http URL)
 * @returns {Promise<string>} - The resolved image data or fallback
 */
export const resolveImage = async (imageRef) => {
    if (!imageRef || typeof imageRef !== 'string') {
        return NO_IMAGE;
    }

    // If it's already a data URL or http URL, return it
    if (imageRef.startsWith('data:image/') || 
        imageRef.startsWith('http') || 
        imageRef.startsWith('blob:')) {
        return imageRef;
    }

    // If it's a db:// reference, resolve it
    if (imageRef.startsWith('db://')) {
        const imageId = imageRef.replace('db://', '');
        const imageData = await getImageFromDB(imageId);
        if (imageData) {
            return imageData;
        }
        console.warn(`⚠️ Image not found in IndexedDB: ${imageId}`);
        return NO_IMAGE;
    }

    // If it's a relative path or other, return as-is (might be a valid URL)
    return imageRef;
};

/**
 * Loads all images for a product from IndexedDB
 * @param {Object} product - The product object with db:// references
 * @returns {Promise<Object>} - The product with resolved images
 */
export const loadProductImages = async (product) => {
    if (!product || !product.id) return product;

    const updatedProduct = { ...product };

    try {
        // Load main image
        if (product.image) {
            updatedProduct.image = await resolveImage(product.image);
        }

        // Load color images
        if (product.colorImages && typeof product.colorImages === 'object') {
            const updatedColorImages = {};
            for (const [color, imgRef] of Object.entries(product.colorImages)) {
                updatedColorImages[color] = await resolveImage(imgRef);
            }
            updatedProduct.colorImages = updatedColorImages;
        }
    } catch (error) {
        console.error(`❌ Error loading images for product ${product.id}:`, error);
    }

    return updatedProduct;
};

/**
 * Loads all products with images from IndexedDB
 * @param {Array} products - Array of product objects
 * @returns {Promise<Array>} - Array of products with resolved images
 */
export const loadAllProductImages = async (products) => {
    if (!Array.isArray(products)) return [];
    
    const loadedProducts = [];
    for (const product of products) {
        const loaded = await loadProductImages(product);
        loadedProducts.push(loaded);
    }
    return loadedProducts;
};

// ============================================================
// FIX: Multiple aliases for compatibility with different imports
// ============================================================
export const loadProductsImages = loadAllProductImages;
export const loadProductsWithImages = loadAllProductImages;
export const loadAllProductsWithImages = loadAllProductImages;

/**
 * Preloads images for a product (useful for hover previews)
 * @param {Object} product - The product with image references
 */
export const preloadProductImages = async (product) => {
    if (!product) return;
    
    const images = [];
    
    if (product.image && typeof product.image === 'string' && product.image.startsWith('db://')) {
        images.push(product.image);
    }
    
    if (product.colorImages && typeof product.colorImages === 'object') {
        for (const imgRef of Object.values(product.colorImages)) {
            if (typeof imgRef === 'string' && imgRef.startsWith('db://')) {
                images.push(imgRef);
            }
        }
    }
    
    // Resolve all images in parallel
    await Promise.all(images.map(resolveImage));
    console.log(`✅ Preloaded ${images.length} images for ${product.name}`);
};