// src/components/Layout/Header.jsx
import { Link, useNavigate } from "react-router-dom";
import { useSite } from "../../context/SiteContext";
import SearchBar from "../Common/SearchBar";
import { useState } from "react";

const Header = () => {
    const { siteInfo } = useSite();
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState("");
    
    const logo = siteInfo?.logo || null;
    const siteName = siteInfo?.siteName || "Zamed";

    const handleSearch = (query) => {
        if (query && query.trim()) {
            navigate(`/search?q=${encodeURIComponent(query.trim())}`);
        }
    };

    return (
        <header className="bg-white shadow-sm">
            <div className="container mx-auto px-4 py-3">
                <div className="flex items-center justify-between">
                    <Link to="/" className="flex items-center space-x-3">
                        {logo ? (
                            <img 
                                src={logo} 
                                alt={siteName} 
                                className="h-12 w-auto object-contain"
                                onError={(e) => {
                                    e.target.style.display = 'none';
                                }}
                            />
                        ) : (
                            <span className="text-2xl font-bold text-gray-800">{siteName}</span>
                        )}
                    </Link>
                    
                    {/* Add search bar in header */}
                    <div className="hidden md:block flex-1 max-w-md mx-4">
                        <SearchBar onSearch={handleSearch} />
                    </div>
                    
                    <div className="flex items-center space-x-2">
                        {/* You can add additional header buttons here */}
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Header;