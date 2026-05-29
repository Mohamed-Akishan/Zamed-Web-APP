// src/utils/imageLoader.js
import { getImageFromDB } from "../services/imageStorage";

// Cache for loaded images to avoid repeated DB calls
const imageCache = new Map();

// Function to load image from IndexedDB or return original URL
export const loadImage = async (imageRef) => {
    if (!imageRef) return null;
    
    // If it's already a data URL, return it
    if (imageRef && imageRef.startsWith('data:')) {
        return imageRef;
    }
    
    // If it's a regular URL (placeholder or external image)
    if (imageRef && (imageRef.startsWith('http') || imageRef.startsWith('https'))) {
        return imageRef;
    }
    
    // Check cache first
    if (imageCache.has(imageRef)) {
        return imageCache.get(imageRef);
    }
    
    // Load from IndexedDB
    if (imageRef && imageRef.startsWith('db://')) {
        const imageId = imageRef.replace('db://', '');
        const imageData = await getImageFromDB(imageId);
        if (imageData) {
            imageCache.set(imageRef, imageData);
            return imageData;
        }
    }
    
    return null;
};

// Function to load product images
export const loadProductImages = async (product) => {
    if (!product) return product;
    
    const updatedProduct = { ...product };
    
    // Load main image
    if (product.image) {
        const loadedImage = await loadImage(product.image);
        if (loadedImage) {
            updatedProduct.image = loadedImage;
        }
    }
    
    // Load color images
    if (product.colorImages && typeof product.colorImages === 'object') {
        const updatedColorImages = {};
        for (const [color, imgRef] of Object.entries(product.colorImages)) {
            const loadedImage = await loadImage(imgRef);
            if (loadedImage) {
                updatedColorImages[color] = loadedImage;
            } else {
                updatedColorImages[color] = imgRef;
            }
        }
        updatedProduct.colorImages = updatedColorImages;
    }
    
    return updatedProduct;
};

// Function to load multiple products
export const loadProductsImages = async (products) => {
    if (!products || products.length === 0) return products;
    
    const loadedProducts = await Promise.all(
        products.map(product => loadProductImages(product))
    );
    
    return loadedProducts;
};

// Clear image cache (useful after product updates)
export const clearImageCache = () => {
    imageCache.clear();
    console.log("Image cache cleared");
};