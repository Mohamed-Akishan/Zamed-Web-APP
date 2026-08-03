#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v2 as cloudinary } from 'cloudinary';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const getArgValue = (flag, fallback) => {
  const index = process.argv.indexOf(flag);
  if (index !== -1 && process.argv[index + 1]) {
    return process.argv[index + 1];
  }
  return fallback;
};

const inputPath = path.resolve(process.cwd(), getArgValue('--input', './data/products.json'));
const outputPath = path.resolve(process.cwd(), getArgValue('--output', './src/data/seedProducts.js'));
const folder = getArgValue('--folder', 'zamed/products');

const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

if (!cloudName || !apiKey || !apiSecret) {
  console.error('Missing Cloudinary environment variables. Set:');
  console.error('  CLOUDINARY_CLOUD_NAME');
  console.error('  CLOUDINARY_API_KEY');
  console.error('  CLOUDINARY_API_SECRET');
  process.exit(1);
}

cloudinary.config({
  cloud_name: cloudName,
  api_key: apiKey,
  api_secret: apiSecret,
  secure: true,
});

const normalizeProduct = (product = {}, index = 0) => {
  const safe = { ...product };

  return {
    id: safe.id ?? `seed-${index + 1}`,
    name: safe.name || `Product ${index + 1}`,
    price: Number(safe.price) || 0,
    originalPrice:
      safe.originalPrice == null
        ? Number(safe.price) || 0
        : Number(safe.originalPrice) || Number(safe.price) || 0,
    category: safe.category || 'General',
    gender: (safe.gender || 'men').toLowerCase(),
    sizes: Array.isArray(safe.sizes) ? safe.sizes : [],
    colors: Array.isArray(safe.colors) ? safe.colors : [],
    stock: Number(safe.stock) || 0,
    description: safe.description || 'Premium quality product',
    details: safe.details || '',
    shipping: safe.shipping || '',
    brand: safe.brand || 'Zamed Premium',
    image: safe.image || '/images/no-image.svg',
    colorImages: safe.colorImages || {},
    rating: Number(safe.rating) || 4.5,
    reviews: Array.isArray(safe.reviews) ? safe.reviews : [],
    isFeatured: Boolean(safe.isFeatured),
    isNewArrival: Boolean(safe.isNewArrival),
    inStock: safe.inStock !== false,
    tags: Array.isArray(safe.tags) ? safe.tags : [],
    material: safe.material || '',
    weight: safe.weight || '',
    careInstructions: safe.careInstructions || '',
    createdAt: safe.createdAt || new Date().toISOString(),
    updatedAt: safe.updatedAt || new Date().toISOString(),
  };
};

const readJsonFile = (fileLocation) => {
  const raw = fs.readFileSync(fileLocation, 'utf8');
  return JSON.parse(raw);
};

const getProductsFromPayload = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === 'object') {
    if (Array.isArray(payload.shop_products)) return payload.shop_products;
    if (Array.isArray(payload.products)) return payload.products;
    if (Array.isArray(payload.data)) return payload.data;
  }
  throw new Error('Input must be an array or object with a products array.');
};

const isDataUrl = (value) => typeof value === 'string' && value.startsWith('data:image/');
const isRemoteUrl = (value) => typeof value === 'string' && /^(https?:)?\/\//i.test(value);

const uploadImageToCloudinary = async (image, productName) => {
  if (!isDataUrl(image)) {
    return image || '/images/no-image.svg';
  }

  const result = await cloudinary.uploader.upload(image, {
    folder,
    resource_type: 'image',
    public_id: `${productName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`,
    transformation: [{ quality: 'auto', fetch_format: 'auto' }],
  });

  return result.secure_url;
};

const buildSeedFile = (products) => {
  const formatted = products.map((product, index) => normalizeProduct(product, index));
  return `export const SEED_PRODUCTS = ${JSON.stringify(formatted, null, 2)};\n\nexport default SEED_PRODUCTS;\n`;
};

const main = async () => {
  if (!fs.existsSync(inputPath)) {
    console.error(`Input file not found: ${inputPath}`);
    process.exit(1);
  }

  try {
    const payload = readJsonFile(inputPath);
    const products = getProductsFromPayload(payload);

    console.log(`Found ${products.length} products to process.`);

    const updatedProducts = [];

    for (let index = 0; index < products.length; index += 1) {
      const product = products[index];
      const currentImage = product.image;

      if (isDataUrl(currentImage)) {
        console.log(`Uploading image for: ${product.name || 'product-' + (index + 1)}`);
        const uploadedUrl = await uploadImageToCloudinary(currentImage, product.name || `product-${index + 1}`);
        updatedProducts.push({ ...product, image: uploadedUrl });
      } else if (isRemoteUrl(currentImage)) {
        updatedProducts.push({ ...product, image: currentImage });
      } else {
        updatedProducts.push({ ...product, image: '/images/no-image.svg' });
      }
    }

    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(outputPath, buildSeedFile(updatedProducts), 'utf8');
    console.log(`✅ Saved converted product data to: ${outputPath}`);
    console.log('Tip: re-import this file in your React app and replace your localStorage seed data with the generated values.');
  } catch (error) {
    console.error('❌ Conversion failed:', error.message);
    process.exit(1);
  }
};

main();
