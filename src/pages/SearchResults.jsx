// src/pages/SearchResults.jsx
import { useState, useEffect } from "react";
import { useLocation, Link } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { toast } from "sonner";
import { HiStar } from "react-icons/hi";
import productService from "../services/productService";

const SearchResults = () => {
    const location = useLocation();
    const { addToCart } = useCart();
    const [searchTerm, setSearchTerm] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const query = params.get('q');
        
        if (query) {
            setSearchTerm(query);
            
            // Get search results from localStorage or perform search
            const storedResults = JSON.parse(localStorage.getItem('searchResults') || '[]');
            const storedTerm = localStorage.getItem('searchTerm');
            
            if (storedTerm === query && storedResults.length > 0) {
                setSearchResults(storedResults);
                setLoading(false);
            } else {
                // Perform search if no stored results
                const allProducts = productService.getAllProducts();
                const results = allProducts.filter(product => 
                    product.name.toLowerCase().includes(query.toLowerCase()) ||
                    (product.category && product.category.toLowerCase().includes(query.toLowerCase())) ||
                    (product.brand && product.brand.toLowerCase().includes(query.toLowerCase())) ||
                    (product.description && product.description.toLowerCase().includes(query.toLowerCase()))
                );
                setSearchResults(results);
                setLoading(false);
            }
        } else {
            setLoading(false);
        }
    }, [location]);

    const handleAddToCart = (product) => {
        addToCart({
            id: product.id,
            name: product.name,
            price: product.price,
            image: product.image,
            category: product.category,
            quantity: 1,
            size: product.sizes?.[0] || "One Size",
            color: product.colors?.[0] || "Default"
        });
        toast.success(`${product.name} added to cart!`);
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="container mx-auto px-4">
                <div className="mb-6">
                    <Link to="/" className="text-gray-600 hover:text-gray-900">← Back to Home</Link>
                </div>
                
                <h1 className="text-2xl font-bold mb-2">Search Results</h1>
                <p className="text-gray-600 mb-8">
                    {searchResults.length} {searchResults.length === 1 ? 'result' : 'results'} for "{searchTerm}"
                </p>
                
                {searchResults.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-lg">
                        <div className="text-6xl mb-4">🔍</div>
                        <h3 className="text-xl font-semibold text-gray-700 mb-2">No products found</h3>
                        <p className="text-gray-500">Try searching with different keywords</p>
                        <div className="mt-6 flex flex-wrap gap-2 justify-center">
                            <Link to="/collections/men" className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200">Men's Collection</Link>
                            <Link to="/collections/women" className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200">Women's Collection</Link>
                            <Link to="/collections/kids" className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200">Kids Collection</Link>
                            <Link to="/collections/all" className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">
                                Browse All Products
                            </Link>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {searchResults.map((product) => (
                            <div key={product.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-all group relative">
                                <Link to={`/product/${product.id}`} className="block">
                                    <div className="relative overflow-hidden">
                                        <img 
                                            src={product.image} 
                                            alt={product.name} 
                                            className="w-full h-64 object-cover group-hover:scale-105 transition-transform duration-300" 
                                        />
                                        {product.originalPrice && (
                                            <div className="absolute top-2 left-2 bg-red-500 text-white px-2 py-1 rounded text-xs font-semibold">
                                                Sale
                                            </div>
                                        )}
                                    </div>
                                </Link>
                                <div className="p-4">
                                    <Link to={`/product/${product.id}`}>
                                        <h3 className="font-semibold text-gray-800 mb-1 line-clamp-1">{product.name}</h3>
                                    </Link>
                                    <p className="text-gray-600 text-sm mb-2">{product.brand || "Zamed"}</p>
                                    <div className="flex items-center justify-between mb-3">
                                        <div>
                                            <span className="text-xl font-bold text-gray-900">${product.price}</span>
                                            {product.originalPrice && (
                                                <span className="text-sm text-gray-500 line-through ml-2">${product.originalPrice}</span>
                                            )}
                                        </div>
                                        <div className="flex items-center space-x-1">
                                            <HiStar className="text-yellow-400" />
                                            <span className="text-sm text-gray-600">{product.rating || "4.5"}</span>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => handleAddToCart(product)} 
                                        className="w-full bg-gray-900 text-white py-2 rounded-lg hover:bg-gray-800 transition-colors"
                                    >
                                        Add to Cart
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default SearchResults;