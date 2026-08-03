#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const normalizeImage = (image) => {
  if (!image || typeof image !== 'string') return '/images/no-image.svg';

  const trimmed = image.trim();
  if (!trimmed) return '/images/no-image.svg';

  if (
    trimmed.startsWith('data:image/') ||
    trimmed.startsWith('/') ||
    /^https?:\/\//i.test(trimmed)
  ) {
    return trimmed;
  }

  return '/images/no-image.svg';
};

const normalizeProduct = (product = {}, index = 0) => {
  const safe = { ...product };

  return {
    id: safe.id ?? `seed-${index + 1}`,
    name: safe.name || `Product ${index + 1}`,
    price: Number(safe.price) || 0,
    originalPrice: safe.originalPrice == null ? Number(safe.price) || 0 : Number(safe.originalPrice) || Number(safe.price) || 0,
    category: safe.category || 'General',
    gender: (safe.gender || 'men').toLowerCase(),
    sizes: Array.isArray(safe.sizes) ? safe.sizes : [],
    colors: Array.isArray(safe.colors) ? safe.colors : [],
    stock: Number(safe.stock) || 0,
    description: safe.description || 'Premium quality product',
    details: safe.details || '',
    shipping: safe.shipping || '',
    brand: safe.brand || 'Zamed Premium',
    image: normalizeImage(safe.image),
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

const readJsonFile = (filePath) => {
  const raw = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(raw);
};

const extractProducts = (payload) => {
  if (Array.isArray(payload)) return payload;

  if (payload && typeof payload === 'object') {
    if (Array.isArray(payload.shop_products)) return payload.shop_products;
    if (Array.isArray(payload.products)) return payload.products;
    if (Array.isArray(payload.data)) return payload.data;
  }

  throw new Error('Input file must be a JSON array or an object containing a products array.');
};

const buildSeedFile = (products) => {
  const normalized = products.map((product, index) => normalizeProduct(product, index));

  return `export const SEED_PRODUCTS = ${JSON.stringify(normalized, null, 2)};\n\nexport default SEED_PRODUCTS;\n`;
};

const main = () => {
  const args = process.argv.slice(2);

  if (args.length < 1 || args.length > 2) {
    console.log('Usage: node scripts/convertLocalStorageSeed.js <input.json> [output.js]');
    console.log('Example: node scripts/convertLocalStorageSeed.js ./data/localStorageProducts.json ./src/data/seedProducts.js');
    process.exit(1);
  }

  const inputPath = path.resolve(process.cwd(), args[0]);
  const outputPath = args[1]
    ? path.resolve(process.cwd(), args[1])
    : path.resolve(__dirname, '../src/data/seedProducts.js');

  if (!fs.existsSync(inputPath)) {
    console.error(`Input file not found: ${inputPath}`);
    process.exit(1);
  }

  try {
    const rawData = readJsonFile(inputPath);
    const products = extractProducts(rawData);
    const seedOutput = buildSeedFile(products);

    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(outputPath, seedOutput, 'utf8');

    console.log(`✅ Converted ${products.length} products and saved to: ${outputPath}`);
  } catch (error) {
    console.error('❌ Failed to convert seed data:', error.message);
    process.exit(1);
  }
};

main();
