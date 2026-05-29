// src/components/Products/FilterSidebar.jsx
import { useState, useEffect } from "react";
import { HiX, HiFilter } from "react-icons/hi";

const FilterSidebar = ({ products, onFilterChange, isOpen, onClose }) => {
    const [filters, setFilters] = useState({
        priceRange: { min: 0, max: 500 },
        selectedSizes: [],
        selectedColors: [],
        selectedCategories: [],
        selectedBrands: [],
        sortBy: "featured"
    });

    // Get unique values from products
    const allSizes = ["XS", "S", "M", "L", "XL", "XXL", "28", "30", "32", "34", "36", "38", "7", "8", "9", "10", "11", "12"];
    const allColors = ["Black", "White", "Red", "Blue", "Green", "Yellow", "Purple", "Pink", "Gray", "Brown", "Navy", "Beige"];
    const allCategories = ["top-wear", "bottom-wear", "footwear", "accessories"];
    const allBrands = ["UrbanStyle", "PremiumWear", "FashionCo", "ComfortZone", "ElegantLook", "SportFit", "CasualBrand", "LuxuryWear"];

    const handlePriceChange = (type, value) => {
        const newPriceRange = { ...filters.priceRange, [type]: parseInt(value) };
        setFilters({ ...filters, priceRange: newPriceRange });
    };

    const handleSizeToggle = (size) => {
        const newSizes = filters.selectedSizes.includes(size)
            ? filters.selectedSizes.filter(s => s !== size)
            : [...filters.selectedSizes, size];
        setFilters({ ...filters, selectedSizes: newSizes });
    };

    const handleColorToggle = (color) => {
        const newColors = filters.selectedColors.includes(color)
            ? filters.selectedColors.filter(c => c !== color)
            : [...filters.selectedColors, color];
        setFilters({ ...filters, selectedColors: newColors });
    };

    const handleCategoryToggle = (category) => {
        const newCategories = filters.selectedCategories.includes(category)
            ? filters.selectedCategories.filter(c => c !== category)
            : [...filters.selectedCategories, category];
        setFilters({ ...filters, selectedCategories: newCategories });
    };

    const handleBrandToggle = (brand) => {
        const newBrands = filters.selectedBrands.includes(brand)
            ? filters.selectedBrands.filter(b => b !== brand)
            : [...filters.selectedBrands, brand];
        setFilters({ ...filters, selectedBrands: newBrands });
    };

    const handleSortChange = (sort) => {
        setFilters({ ...filters, sortBy: sort });
    };

    const clearAllFilters = () => {
        setFilters({
            priceRange: { min: 0, max: 500 },
            selectedSizes: [],
            selectedColors: [],
            selectedCategories: [],
            selectedBrands: [],
            sortBy: "featured"
        });
    };

    // Apply filters whenever they change
    useEffect(() => {
        onFilterChange(filters);
    }, [filters]);

    const getActiveFilterCount = () => {
        let count = 0;
        if (filters.selectedSizes.length) count++;
        if (filters.selectedColors.length) count++;
        if (filters.selectedCategories.length) count++;
        if (filters.selectedBrands.length) count++;
        if (filters.priceRange.min > 0 || filters.priceRange.max < 500) count++;
        if (filters.sortBy !== "featured") count++;
        return count;
    };

    return (
        <>
            {/* Mobile Filter Drawer */}
            <div className={`fixed inset-0 z-50 lg:hidden transition-transform duration-300 transform ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose}></div>
                <div className="absolute left-0 top-0 h-full w-4/5 max-w-sm bg-white shadow-2xl overflow-y-auto">
                    <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
                        <h2 className="text-xl font-bold flex items-center">
                            <HiFilter className="mr-2" /> Filters
                        </h2>
                        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
                            <HiX className="h-5 w-5" />
                        </button>
                    </div>
                    <FilterContent />
                </div>
            </div>

            {/* Desktop Sidebar */}
            <div className="hidden lg:block w-80 space-y-6">
                <FilterContent />
            </div>
        </>
    );

    function FilterContent() {
        return (
            <div className="p-4 space-y-6">
                {/* Filter Header with Clear All */}
                <div className="flex justify-between items-center border-b pb-3">
                    <h3 className="font-semibold text-lg">Filters</h3>
                    <button 
                        onClick={clearAllFilters}
                        className="text-sm text-red-500 hover:text-red-700 font-medium"
                    >
                        Clear All Filters
                    </button>
                </div>

                {/* Active Filters Summary */}
                {getActiveFilterCount() > 0 && (
                    <div className="bg-blue-50 p-3 rounded-lg">
                        <p className="text-sm text-blue-800">
                            {getActiveFilterCount()} active filter{getActiveFilterCount() !== 1 ? 's' : ''}
                        </p>
                        <button 
                            onClick={clearAllFilters}
                            className="text-xs text-blue-600 hover:text-blue-800 mt-1"
                        >
                            Clear all
                        </button>
                    </div>
                )}

                {/* Sort By */}
                <div className="border-b pb-4">
                    <h4 className="font-semibold mb-3">Sort By</h4>
                    <div className="space-y-2">
                        {[
                            { value: "featured", label: "Featured" },
                            { value: "price-low-high", label: "Price: Low to High" },
                            { value: "price-high-low", label: "Price: High to Low" },
                            { value: "rating", label: "Highest Rated" },
                            { value: "newest", label: "Newest First" }
                        ].map(option => (
                            <label key={option.value} className="flex items-center space-x-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="sort"
                                    value={option.value}
                                    checked={filters.sortBy === option.value}
                                    onChange={() => handleSortChange(option.value)}
                                    className="w-4 h-4 text-blue-600"
                                />
                                <span className="text-sm text-gray-700">{option.label}</span>
                            </label>
                        ))}
                    </div>
                </div>

                {/* Price Range */}
                <div className="border-b pb-4">
                    <h4 className="font-semibold mb-3">Price Range</h4>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between gap-2">
                            <div className="flex-1">
                                <label className="text-xs text-gray-500">Min</label>
                                <input
                                    type="range"
                                    min="0"
                                    max="500"
                                    value={filters.priceRange.min}
                                    onChange={(e) => handlePriceChange('min', e.target.value)}
                                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                                />
                                <span className="text-sm font-semibold">${filters.priceRange.min}</span>
                            </div>
                            <div className="flex-1">
                                <label className="text-xs text-gray-500">Max</label>
                                <input
                                    type="range"
                                    min="0"
                                    max="500"
                                    value={filters.priceRange.max}
                                    onChange={(e) => handlePriceChange('max', e.target.value)}
                                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                                />
                                <span className="text-sm font-semibold">${filters.priceRange.max}</span>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button 
                                onClick={() => handlePriceChange('min', 0)} 
                                className="text-xs px-2 py-1 bg-gray-100 rounded hover:bg-gray-200"
                            >
                                Under $50
                            </button>
                            <button 
                                onClick={() => { handlePriceChange('min', 50); handlePriceChange('max', 100); }} 
                                className="text-xs px-2 py-1 bg-gray-100 rounded hover:bg-gray-200"
                            >
                                $50 - $100
                            </button>
                            <button 
                                onClick={() => { handlePriceChange('min', 100); handlePriceChange('max', 200); }} 
                                className="text-xs px-2 py-1 bg-gray-100 rounded hover:bg-gray-200"
                            >
                                $100 - $200
                            </button>
                            <button 
                                onClick={() => { handlePriceChange('min', 200); handlePriceChange('max', 500); }} 
                                className="text-xs px-2 py-1 bg-gray-100 rounded hover:bg-gray-200"
                            >
                                $200+
                            </button>
                        </div>
                    </div>
                </div>

                {/* Size Filter */}
                <div className="border-b pb-4">
                    <div className="flex justify-between items-center mb-3">
                        <h4 className="font-semibold">Size</h4>
                        {filters.selectedSizes.length > 0 && (
                            <button 
                                onClick={() => setFilters({...filters, selectedSizes: []})}
                                className="text-xs text-red-500"
                            >
                                Clear ({filters.selectedSizes.length})
                            </button>
                        )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {allSizes.map(size => (
                            <button
                                key={size}
                                onClick={() => handleSizeToggle(size)}
                                className={`px-3 py-1.5 text-sm rounded-lg border transition-all ${
                                    filters.selectedSizes.includes(size)
                                        ? 'bg-blue-600 text-white border-blue-600'
                                        : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                                }`}
                            >
                                {size}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Color Filter */}
                <div className="border-b pb-4">
                    <div className="flex justify-between items-center mb-3">
                        <h4 className="font-semibold">Color</h4>
                        {filters.selectedColors.length > 0 && (
                            <button 
                                onClick={() => setFilters({...filters, selectedColors: []})}
                                className="text-xs text-red-500"
                            >
                                Clear ({filters.selectedColors.length})
                            </button>
                        )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {allColors.map(color => (
                            <button
                                key={color}
                                onClick={() => handleColorToggle(color)}
                                className={`px-3 py-1.5 text-sm rounded-lg border transition-all ${
                                    filters.selectedColors.includes(color)
                                        ? 'bg-blue-600 text-white border-blue-600'
                                        : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                                }`}
                            >
                                {color}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Category Filter */}
                <div className="border-b pb-4">
                    <div className="flex justify-between items-center mb-3">
                        <h4 className="font-semibold">Category</h4>
                        {filters.selectedCategories.length > 0 && (
                            <button 
                                onClick={() => setFilters({...filters, selectedCategories: []})}
                                className="text-xs text-red-500"
                            >
                                Clear ({filters.selectedCategories.length})
                            </button>
                        )}
                    </div>
                    <div className="space-y-2">
                        {allCategories.map(category => (
                            <label key={category} className="flex items-center space-x-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={filters.selectedCategories.includes(category)}
                                    onChange={() => handleCategoryToggle(category)}
                                    className="w-4 h-4 text-blue-600 rounded"
                                />
                                <span className="text-sm text-gray-700 capitalize">
                                    {category.replace('-', ' ')}
                                </span>
                            </label>
                        ))}
                    </div>
                </div>

                {/* Brand Filter */}
                <div className="pb-4">
                    <div className="flex justify-between items-center mb-3">
                        <h4 className="font-semibold">Brand</h4>
                        {filters.selectedBrands.length > 0 && (
                            <button 
                                onClick={() => setFilters({...filters, selectedBrands: []})}
                                className="text-xs text-red-500"
                            >
                                Clear ({filters.selectedBrands.length})
                            </button>
                        )}
                    </div>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                        {allBrands.map(brand => (
                            <label key={brand} className="flex items-center space-x-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={filters.selectedBrands.includes(brand)}
                                    onChange={() => handleBrandToggle(brand)}
                                    className="w-4 h-4 text-blue-600 rounded"
                                />
                                <span className="text-sm text-gray-700">{brand}</span>
                            </label>
                        ))}
                    </div>
                </div>

                {/* Apply Button for Mobile */}
                <div className="lg:hidden sticky bottom-0 bg-white border-t pt-4 mt-4">
                    <button
                        onClick={onClose}
                        className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700"
                    >
                        Apply Filters ({getActiveFilterCount()})
                    </button>
                </div>
            </div>
        );
    }
};

export default FilterSidebar;