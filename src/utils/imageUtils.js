// frontend/src/utils/imageUtils.js

// These are guaranteed working image URLs from Unsplash
export const WORKING_IMAGES = [
    'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1583391733956-3750e0b4f8d6?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1564257631407-4deb1f99d992?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1539008835657-9e8e9680c956?w=400&h=400&fit=crop',
];

export const getWorkingImage = (index) => {
    return WORKING_IMAGES[index % WORKING_IMAGES.length];
};

export const fixProductImages = (products) => {
    if (!products || !Array.isArray(products)) return [];
    return products.map((product, index) => ({
        ...product,
        image: getWorkingImage(index),
    }));
};

export default { WORKING_IMAGES, getWorkingImage, fixProductImages };