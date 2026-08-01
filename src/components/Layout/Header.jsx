// src/components/Layout/Header.jsx
import { Link } from "react-router-dom";
import { useSite } from "../../context/SiteContext";

const Header = () => {
    const { siteInfo } = useSite();
    
    const logo = siteInfo?.logo || null;
    const siteName = siteInfo?.siteName || "Zamed";

    return (
        <header className="bg-white shadow-sm">
            <div className="container mx-auto px-4 py-3">
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
            </div>
        </header>
    );
};

export default Header;