// src/utils/generateSitemap.js
const generateSitemap = (products, collections) => {
    const baseUrl = "https://blacksquad.com";
    const today = new Date().toISOString().split('T')[0];
    
    const pages = [
        { url: "/", priority: "1.0", changefreq: "daily" },
        { url: "/collections/men", priority: "0.9", changefreq: "weekly" },
        { url: "/collections/women", priority: "0.9", changefreq: "weekly" },
        { url: "/collections/kids", priority: "0.9", changefreq: "weekly" },
        { url: "/collections/all", priority: "0.8", changefreq: "weekly" }
    ];
    
    let sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n';
    sitemap += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
    
    // Add static pages
    pages.forEach(page => {
        sitemap += `  <url>\n`;
        sitemap += `    <loc>${baseUrl}${page.url}</loc>\n`;
        sitemap += `    <lastmod>${today}</lastmod>\n`;
        sitemap += `    <changefreq>${page.changefreq}</changefreq>\n`;
        sitemap += `    <priority>${page.priority}</priority>\n`;
        sitemap += `  </url>\n`;
    });
    
    // Add product pages
    products.forEach(product => {
        sitemap += `  <url>\n`;
        sitemap += `    <loc>${baseUrl}/product/${product.id}</loc>\n`;
        sitemap += `    <lastmod>${today}</lastmod>\n`;
        sitemap += `    <changefreq>weekly</changefreq>\n`;
        sitemap += `    <priority>0.7</priority>\n`;
        sitemap += `  </url>\n`;
    });
    
    sitemap += '</urlset>';
    
    return sitemap;
};

export default generateSitemap;