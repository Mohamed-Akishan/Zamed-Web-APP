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

    const loadProducts = () => {
        try {
            const products = productService.getAllProducts();
            
            const featured = products.filter(p => p.isFeatured === true);
            setFeaturedProducts(featured);
            
            const newArrivals = products.filter(p => p.isNewArrival === true);
            setNewArrivalProducts(newArrivals);
            
            setLoading(false);
        } catch (err) {
            console.error("❌ Error loading products:", err);
            setError("Failed to load products");
            setLoading(false);
        }
    };

    useEffect(() => {
        loadProducts();
        
        const unsubscribe = productService.subscribe((updatedProducts) => {
            const featured = updatedProducts.filter(p => p.isFeatured === true);
            const newArrivals = updatedProducts.filter(p => p.isNewArrival === true);
            setFeaturedProducts(featured);
            setNewArrivalProducts(newArrivals);
        });
        
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        const handleReviewUpdate = () => loadProducts();
        const handleProductsUpdate = () => loadProducts();
        const handleStorageChange = () => loadProducts();
        
        window.addEventListener('reviewAdded', handleReviewUpdate);
        window.addEventListener('productsUpdated', handleProductsUpdate);
        window.addEventListener('storage', handleStorageChange);
        
        return () => {
            window.removeEventListener('reviewAdded', handleReviewUpdate);
            window.removeEventListener('productsUpdated', handleProductsUpdate);
            window.removeEventListener('storage', handleStorageChange);
        };
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white">
                <div className="text-center">
                    <div className="w-16 h-16 border-2 border-gray-200 border-t-black rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-400 text-sm">Loading...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white">
                <div className="text-center">
                    <div className="text-5xl mb-4">⚠️</div>
                    <p className="text-gray-600 mb-4">{error}</p>
                    <button 
                        onClick={() => {
                            setLoading(true);
                            setError(null);
                            loadProducts();
                        }} 
                        className="px-6 py-2.5 bg-black text-white rounded-full text-sm font-medium hover:bg-gray-800 transition-colors"
                    >
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white">
            {/* Hero */}
            <Hero />
            
            {/* Gender Collection */}
            <GenderCollectionSection />
            
            {/* New Arrivals */}
            {newArrivalProducts.length > 0 ? (
                <ProductGrid products={newArrivalProducts} title="New Arrivals" />
            ) : (
                <div className="py-12 text-center">
                    <p className="text-gray-400 text-sm">No new arrivals at the moment.</p>
                </div>
            )}
            
            {/* Featured Products */}
            {featuredProducts.length > 0 ? (
                <ProductGrid products={featuredProducts} title="Featured Products" />
            ) : (
                <div className="py-12 text-center">
                    <p className="text-gray-400 text-sm">No featured products at the moment.</p>
                </div>
            )}
            
            {/* Featured Collection - Always visible */}
            <FeaturedCollection />
            
            {/* Features */}
            <FeaturesSection />
        </div>
    );
};

export default Home;