// src/components/Layout/Topbar.jsx
import { Link } from "react-router-dom";
import { useSite } from "../../context/SiteContext";
import { FiMail, FiPhone, FiHelpCircle } from "react-icons/fi";

const Topbar = () => {
    const { siteInfo } = useSite();
    
    const sitePhone = siteInfo?.sitePhone || "+94 77 061 6154";
    const siteEmail = siteInfo?.siteEmail || "support@zamed.com";
    const siteName = siteInfo?.siteName || "Zamed";

    const scrollToFooter = () => {
        const footer = document.querySelector('footer');
        if (footer) {
            footer.scrollIntoView({ 
                behavior: 'smooth',
                block: 'start'
            });
        } else {
            window.scrollTo({
                top: document.documentElement.scrollHeight,
                behavior: 'smooth'
            });
        }
    };

    return (
        <div className="bg-gradient-to-r from-gray-900 to-gray-800 text-white py-1.5 px-4">
            <div className="container mx-auto flex justify-between items-center text-xs md:text-sm">
                <div className="flex items-center space-x-3 md:space-x-4">
                    <a href={`tel:${sitePhone}`} className="flex items-center gap-1 hover:text-gray-300 transition-colors">
                        <FiPhone size={12} className="md:size-14" /> 
                        <span className="hidden xs:inline">{sitePhone}</span>
                    </a>
                    <a href={`mailto:${siteEmail}`} className="flex items-center gap-1 hover:text-gray-300 transition-colors hidden sm:inline-flex">
                        <FiMail size={12} className="md:size-14" /> 
                        <span className="hidden xs:inline">{siteEmail}</span>
                    </a>
                </div>
                <div className="flex items-center space-x-3 md:space-x-4">
                    <button 
                        onClick={scrollToFooter}
                        className="flex items-center gap-1 hover:text-gray-300 transition-colors cursor-pointer group"
                        aria-label="Contact Us"
                    >
                        <FiHelpCircle size={14} className="md:size-16 group-hover:scale-110 transition-transform" />
                        <span className="hidden sm:inline">Contact Us</span>
                    </button>
                    <Link to="/login" className="hover:text-gray-300 transition-colors">Login</Link>
                    <Link to="/register" className="hover:text-gray-300 transition-colors hidden xs:inline">Register</Link>
                </div>
            </div>
        </div>
    );
};

export default Topbar;