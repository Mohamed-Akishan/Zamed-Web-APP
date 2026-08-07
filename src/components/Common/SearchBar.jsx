// src/components/Common/SearchBar.jsx
import { useState, useEffect, useRef, useCallback } from "react";
import { Search, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import productService from "../../services/productService";
import { getWorkingImage } from "../../utils/imageUtils";

const SearchBar = () => {
    const [searchTerm, setSearchTerm] = useState("");
    const [isOpen, setIsOpen] = useState(false);
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [visibleCount, setVisibleCount] = useState(20);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [currencySymbol, setCurrencySymbol] = useState("$");
    const navigate = useNavigate();
    const resultsContainerRef = useRef(null);
    const searchInputRef = useRef(null);
    const fallbackProductImage = getWorkingImage(0);

    useEffect(() => {
        const siteSettings = JSON.parse(localStorage.getItem('site_settings') || '{}');
        const symbols = { USD: "$", EUR: "€", GBP: "£", LKR: "Rs" };
        setCurrencySymbol(symbols[siteSettings.currency] || "$");
    }, []);

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            setTimeout(() => {
                searchInputRef.current?.focus();
            }, 100);
        } else {
            document.body.style.overflow = 'unset';
            setSearchTerm("");
            setSearchResults([]);
            setVisibleCount(20);
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    const handleScroll = useCallback(() => {
        if (!resultsContainerRef.current) return;
        
        const { scrollTop, scrollHeight, clientHeight } = resultsContainerRef.current;
        if (scrollTop + clientHeight >= scrollHeight - 200 && 
            !isLoadingMore && 
            visibleCount < searchResults.length) {
            setIsLoadingMore(true);
            setTimeout(() => {
                setVisibleCount(prev => Math.min(prev + 20, searchResults.length));
                setIsLoadingMore(false);
            }, 500);
        }
    }, [isLoadingMore, visibleCount, searchResults.length]);

    useEffect(() => {
        const container = resultsContainerRef.current;
        if (container) {
            container.addEventListener('scroll', handleScroll);
            return () => container.removeEventListener('scroll', handleScroll);
        }
    }, [handleScroll]);

    const performSearch = (query) => {
        if (!query.trim()) {
            setSearchResults([]);
            setVisibleCount(20);
            return;
        }
        
        setIsSearching(true);
        const results = productService.searchProducts(query);
        setSearchResults(results);
        setVisibleCount(20);
        setIsSearching(false);
    };

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        if (searchTerm.trim()) {
            localStorage.setItem('searchTerm', searchTerm);
            localStorage.setItem('searchResults', JSON.stringify(searchResults));
            setIsOpen(false);
            navigate(`/search?q=${encodeURIComponent(searchTerm)}`);
            toast.info(`Found ${searchResults.length} results for "${searchTerm}"`);
        }
    };

    const handleInputChange = (e) => {
        const value = e.target.value;
        setSearchTerm(value);
        performSearch(value);
    };

    const handleResultClick = (productId) => {
        setIsOpen(false);
        setSearchTerm("");
        setSearchResults([]);
        navigate(`/product/${productId}`);
    };

    const clearSearch = () => {
        setSearchTerm("");
        setSearchResults([]);
        setVisibleCount(20);
        searchInputRef.current?.focus();
    };

    const visibleResults = searchResults.slice(0, visibleCount);

    return (
        <>
            <button 
                onClick={() => setIsOpen(true)} 
                className="hover:text-blue-600 transition-colors"
            >
                <Search className="h-5 w-5 text-gray-700" />
            </button>

            {isOpen && (
                <div className="fixed inset-0 bg-white z-50 flex flex-col">
                    <div className="sticky top-0 bg-white border-b shadow-lg z-20">
                        <div className="container mx-auto px-4 py-4">
                            <div className="flex items-center gap-4">
                                <form onSubmit={handleSearchSubmit} className="flex-1 relative">
                                    <input 
                                        ref={searchInputRef}
                                        type="text" 
                                        placeholder="Search for products by name, brand, or category..." 
                                        value={searchTerm}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-3 pl-12 pr-12 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-lg"
                                    />
                                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                                    {searchTerm && (
                                        <button
                                            type="button"
                                            onClick={clearSearch}
                                            className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                        >
                                            <X className="h-5 w-5" />
                                        </button>
                                    )}
                                </form>
                                <button 
                                    onClick={() => setIsOpen(false)}
                                    className="text-gray-600 hover:text-gray-800 font-medium px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                            
                            {searchTerm && !isSearching && (
                                <div className="mt-3 text-sm">
                                    {searchResults.length > 0 ? (
                                        <p className="text-gray-500">
                                            Found <span className="font-semibold text-blue-600">{searchResults.length}</span> results for "
                                            <span className="font-semibold text-gray-700">{searchTerm}</span>"
                                        </p>
                                    ) : (
                                        <p className="text-gray-500">
                                            No results found for "<span className="font-semibold text-gray-700">{searchTerm}</span>"
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    <div 
                        ref={resultsContainerRef}
                        className="flex-1 overflow-y-auto"
                        style={{ height: 'calc(100vh - 120px)' }}
                    >
                        <div className="container mx-auto px-4 py-6">
                            {isSearching ? (
                                <div className="text-center py-12">
                                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                                    <p className="mt-4 text-gray-500">Searching products...</p>
                                </div>
                            ) : searchTerm && searchResults.length === 0 ? (
                                <div className="text-center py-12">
                                    <div className="text-8xl mb-4">🔍</div>
                                    <h3 className="text-2xl font-semibold text-gray-700 mb-2">No products found</h3>
                                    <p className="text-gray-500">Try searching with different keywords</p>
                                    <div className="flex flex-wrap gap-2 justify-center mt-8">
                                        <button 
                                            onClick={() => handleInputChange({ target: { value: "t-shirt" } })}
                                            className="px-4 py-2 bg-gray-100 rounded-full text-sm hover:bg-gray-200 transition-colors"
                                        >
                                            T-Shirt
                                        </button>
                                        <button 
                                            onClick={() => handleInputChange({ target: { value: "jeans" } })}
                                            className="px-4 py-2 bg-gray-100 rounded-full text-sm hover:bg-gray-200"
                                        >
                                            Jeans
                                        </button>
                                        <button 
                                            onClick={() => handleInputChange({ target: { value: "jacket" } })}
                                            className="px-4 py-2 bg-gray-100 rounded-full text-sm hover:bg-gray-200"
                                        >
                                            Jacket
                                        </button>
                                        <button 
                                            onClick={() => handleInputChange({ target: { value: "shoes" } })}
                                            className="px-4 py-2 bg-gray-100 rounded-full text-sm hover:bg-gray-200"
                                        >
                                            Shoes
                                        </button>
                                    </div>
                                </div>
                            ) : searchTerm && searchResults.length > 0 ? (
                                <>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                                        {visibleResults.map((product, index) => (
                                            <div 
                                                key={product.id}
                                                onClick={() => handleResultClick(product.id)}
                                                className="bg-white rounded-xl shadow-md overflow-hidden cursor-pointer hover:shadow-xl transition-all transform hover:-translate-y-1 group"
                                            >
                                                <div className="relative overflow-hidden">
                                                    <img 
                                                        src={product.image || fallbackProductImage} 
                                                        alt={product.name}
                                                        className="w-full h-56 object-cover group-hover:scale-105 transition-transform duration-300"
                                                        onError={(event) => {
                                                            event.currentTarget.onerror = null;
                                                            event.currentTarget.src = fallbackProductImage;
                                                        }}
                                                    />
                                                    {product.originalPrice && (
                                                        <div className="absolute top-2 left-2 bg-red-500 text-white px-2 py-1 rounded-lg text-xs font-semibold">
                                                            SALE
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="p-4">
                                                    <h3 className="font-semibold text-gray-800 mb-1 line-clamp-1">{product.name}</h3>
                                                    <p className="text-gray-500 text-xs mb-2">{product.brand || "Zamed Premium"}</p>
                                                    <div className="flex items-center justify-between">
                                                        <div>
                                                            <span className="text-xl font-bold text-gray-900">{currencySymbol}{product.price}</span>
                                                            {product.originalPrice && (
                                                                <span className="text-xs text-gray-400 line-through ml-2">{currencySymbol}{product.originalPrice}</span>
                                                            )}
                                                        </div>
                                                        <button 
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleResultClick(product.id);
                                                            }}
                                                            className="text-blue-600 text-sm font-medium hover:text-blue-800"
                                                        >
                                                            View
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    
                                    {isLoadingMore && (
                                        <div className="text-center py-8">
                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                                            <p className="mt-2 text-sm text-gray-500">Loading more products...</p>
                                        </div>
                                    )}
                                    
                                    {visibleCount < searchResults.length && !isLoadingMore && (
                                        <div className="text-center mt-8">
                                            <button
                                                onClick={() => setVisibleCount(prev => Math.min(prev + 20, searchResults.length))}
                                                className="bg-gray-900 text-white px-8 py-3 rounded-xl font-semibold hover:bg-gray-800 transition-all"
                                            >
                                                Load More Products ({searchResults.length - visibleCount} remaining)
                                            </button>
                                        </div>
                                    )}
                                    
                                    <div className="text-center mt-8 pt-4 border-t">
                                        <button
                                            onClick={handleSearchSubmit}
                                            className="bg-blue-600 text-white px-8 py-3 rounded-xl font-semibold hover:bg-blue-700 transition-all inline-flex items-center gap-2"
                                        >
                                            <Search size={18} /> View All {searchResults.length} Results
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <div className="text-center py-12">
                                    <div className="text-8xl mb-4">🔍</div>
                                    <h3 className="text-2xl font-semibold text-gray-700 mb-2">What are you looking for?</h3>
                                    <p className="text-gray-500">Start typing to search for products</p>
                                    <div className="flex flex-wrap gap-2 justify-center mt-8">
                                        <p className="text-sm text-gray-400 w-full mb-2">Popular searches:</p>
                                        <button 
                                            onClick={() => handleInputChange({ target: { value: "t-shirt" } })}
                                            className="px-4 py-2 bg-gray-100 rounded-full text-sm hover:bg-gray-200"
                                        >
                                            T-Shirt
                                        </button>
                                        <button 
                                            onClick={() => handleInputChange({ target: { value: "jeans" } })}
                                            className="px-4 py-2 bg-gray-100 rounded-full text-sm hover:bg-gray-200"
                                        >
                                            Jeans
                                        </button>
                                        <button 
                                            onClick={() => handleInputChange({ target: { value: "jacket" } })}
                                            className="px-4 py-2 bg-gray-100 rounded-full text-sm hover:bg-gray-200"
                                        >
                                            Jacket
                                        </button>
                                        <button 
                                            onClick={() => handleInputChange({ target: { value: "shoes" } })}
                                            className="px-4 py-2 bg-gray-100 rounded-full text-sm hover:bg-gray-200"
                                        >
                                            Shoes
                                        </button>
                                        <button 
                                            onClick={() => handleInputChange({ target: { value: "dress" } })}
                                            className="px-4 py-2 bg-gray-100 rounded-full text-sm hover:bg-gray-200"
                                        >
                                            Dress
                                        </button>
                                        <button 
                                            onClick={() => handleInputChange({ target: { value: "bag" } })}
                                            className="px-4 py-2 bg-gray-100 rounded-full text-sm hover:bg-gray-200"
                                        >
                                            Bag
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default SearchBar;