// src/pages/Home.jsx
import { useState, useEffect } from "react";
import Hero from "../components/Layout/Hero";
import GenderCollectionSection from "../components/Products/GenderCollectionSection";
import FeaturedCollection from "../components/Products/FeaturedCollection";
import FeaturesSection from "../components/Products/FeaturesSection";
import ProductGrid from "../components/Products/ProductGrid";
import productService from "../services/productService";

const Home = () => {
    const [featuredProducts, setFeaturedProducts] = useState([]);
    const [newArrivalProducts, setNewArrivalProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Function to load all products
    const loadProducts = () => {
        try {
            const products = productService.getAllProducts();
            console.log("🏠 Home page - loading products:", products.length);
            
            // Get products marked as featured
            const featured = products.filter(p => p.isFeatured === true);
            setFeaturedProducts(featured);
            console.log("⭐ Featured products:", featured.length);
            
            // Get products marked as new arrivals
            const newArrivals = products.filter(p => p.isNewArrival === true);
            setNewArrivalProducts(newArrivals);
            console.log("🆕 New arrivals:", newArrivals.length);
            
            setLoading(false);
        } catch (err) {
            console.error("❌ Error loading products:", err);
            setError("Failed to load products");
            setLoading(false);
        }
    };

    // Initial load
    useEffect(() => {
        loadProducts();
        
        // Subscribe to product service updates
        const unsubscribe = productService.subscribe((updatedProducts) => {
            console.log("🔄 Products updated in Home page - refreshing");
            const featured = updatedProducts.filter(p => p.isFeatured === true);
            const newArrivals = updatedProducts.filter(p => p.isNewArrival === true);
            setFeaturedProducts(featured);
            setNewArrivalProducts(newArrivals);
        });
        
        return () => unsubscribe();
    }, []);

    // Listen for review updates to refresh ratings
    useEffect(() => {
        const handleReviewUpdate = () => {
            console.log("📝 Review added - refreshing products in Home page");
            loadProducts();
        };
        
        const handleProductsUpdate = () => {
            console.log("🔄 Products updated - refreshing Home page");
            loadProducts();
        };
        
        const handleStorageChange = () => {
            console.log("💾 Storage changed - refreshing Home page");
            loadProducts();
        };
        
        window.addEventListener('reviewAdded', handleReviewUpdate);
        window.addEventListener('productsUpdated', handleProductsUpdate);
        window.addEventListener('storage', handleStorageChange);
        
        return () => {
            window.removeEventListener('reviewAdded', handleReviewUpdate);
            window.removeEventListener('productsUpdated', handleProductsUpdate);
            window.removeEventListener('storage', handleStorageChange);
        };
    }, []);

    // Refresh products every 30 seconds to ensure ratings are up to date
    useEffect(() => {
        const interval = setInterval(() => {
            console.log("⏰ Auto-refreshing products in Home page");
            loadProducts();
        }, 30000);
        
        return () => clearInterval(interval);
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading amazing products...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="text-6xl mb-4">⚠️</div>
                    <p className="text-red-600 mb-4">{error}</p>
                    <button 
                        onClick={() => {
                            setLoading(true);
                            setError(null);
                            loadProducts();
                        }} 
                        className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white overflow-hidden">
            {/* Hero Section */}
            <Hero />
            
            {/* Gender Collection Section */}
            <GenderCollectionSection />
            
            {/* NEW ARRIVALS SECTION - ONLY ONE */}
            {newArrivalProducts.length > 0 ? (
                <ProductGrid products={newArrivalProducts} title="New Arrivals" />
            ) : (
                <div className="py-8 text-center text-gray-500">
                    <p>No new arrivals at the moment. Check back soon!</p>
                </div>
            )}
            
            {/* FEATURED PRODUCTS SECTION */}
            {featuredProducts.length > 0 ? (
                <ProductGrid products={featuredProducts} title="Featured Products" />
            ) : (
                <div className="py-8 text-center text-gray-500">
                    <p>No featured products at the moment.</p>
                </div>
            )}
            
            {/* Featured Collection - Single featured product spotlight */}
            <FeaturedCollection />
            
            {/* Features Section - Benefits and trust badges */}
            <FeaturesSection />
        </div>
    );
};

export default Home;