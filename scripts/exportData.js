// scripts/exportData.js
// This script helps extract data from localStorage for seeding
// Run it in the browser console on your local site or paste its contents there.

const exportData = () => {
  const products = JSON.parse(localStorage.getItem('shop_products') || '[]');

  if (!products.length) {
    console.log('❌ No products found in localStorage under shop_products');
    return;
  }

  const processedProducts = products.map((product) => ({
    ...product,
    image:
      product.image && product.image.length > 100000
        ? `https://placehold.co/300x300/1a1a1a/ffffff?text=${encodeURIComponent(product.name || 'Product')}`
        : product.image || '/images/no-image.svg',
    originalPrice:
      product.originalPrice == null
        ? Number(product.price) || 0
        : Number(product.originalPrice) || Number(product.price) || 0,
    price: Number(product.price) || 0,
    stock: Number(product.stock) || 0,
    gender: String(product.gender || 'men').toLowerCase(),
    inStock: product.inStock !== false,
    isFeatured: Boolean(product.isFeatured),
    isNewArrival: Boolean(product.isNewArrival),
    tags: Array.isArray(product.tags) ? product.tags : [],
    sizes: Array.isArray(product.sizes) ? product.sizes : [],
    colors: Array.isArray(product.colors) ? product.colors : [],
  }));

  const content = `// Auto-generated seed data - ${new Date().toISOString()}
export const SEED_PRODUCTS = ${JSON.stringify(processedProducts, null, 2)};

export default SEED_PRODUCTS;
`;

  const blob = new Blob([content], { type: 'application/javascript' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');

  a.href = url;
  a.download = 'seedProducts.js';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  console.log(`✅ Exported ${products.length} products`);
  console.log('📁 File: seedProducts.js');
};

exportData();
