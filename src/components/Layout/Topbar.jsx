// src/components/Layout/Topbar.jsx
import { Link } from "react-router-dom";
import { useSite } from "../../context/SiteContext";
import { FiMail, FiPhone, FiHelpCircle, FiUser, FiLogIn, FiUserPlus } from "react-icons/fi";
import { useState, useEffect } from "react";

const Topbar = () => {
    const { siteInfo } = useSite();
    const [user, setUser] = useState(null);
    
    const sitePhone = siteInfo?.sitePhone || "+94 77 061 6154";
    const siteEmail = siteInfo?.siteEmail || "support@zamed.com";
    const siteName = siteInfo?.siteName || "Zamed";

    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (userData) {
            try {
                setUser(JSON.parse(userData));
            } catch (e) {
                setUser(null);
            }
        }
        
        const handleAuthChange = () => {
            const updatedUser = localStorage.getItem('user');
            if (updatedUser) {
                try {
                    setUser(JSON.parse(updatedUser));
                } catch (e) {
                    setUser(null);
                }
            } else {
                setUser(null);
            }
        };
        
        window.addEventListener('authChanged', handleAuthChange);
        window.addEventListener('userUpdated', handleAuthChange);
        window.addEventListener('profileUpdated', handleAuthChange);
        
        return () => {
            window.removeEventListener('authChanged', handleAuthChange);
            window.removeEventListener('userUpdated', handleAuthChange);
            window.removeEventListener('profileUpdated', handleAuthChange);
        };
    }, []);

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
        // Absolute positioning - overlays hero without pushing content
        <div className="absolute top-0 left-0 right-0 z-50 pointer-events-none">
            {/* Blurred glass background */}
            <div className="absolute inset-0 bg-black/30 backdrop-blur-md pointer-events-none" />
            
            {/* Bottom gradient fade */}
            <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-b from-black/30 to-transparent pointer-events-none" />
            
            {/* Content - pointer-events-auto so buttons work */}
            <div className="relative z-10 container mx-auto px-4 pointer-events-auto">
                <div className="flex flex-wrap justify-between items-center text-xs md:text-sm py-2 md:py-2.5 gap-1">
                    {/* Left Section - Contact Info */}
                    <div className="flex items-center space-x-2 md:space-x-4 flex-wrap">
                        <a 
                            href={`tel:${sitePhone}`} 
                            className="flex items-center gap-1 hover:text-white/70 transition-colors text-white/80 hover:text-white"
                        >
                            <FiPhone size={12} className="md:size-14" /> 
                            <span className="hidden sm:inline text-white/90">{sitePhone}</span>
                            <span className="sm:hidden text-white/90">{sitePhone.replace(/\s/g, '')}</span>
                        </a>
                        <span className="hidden sm:inline text-white/20">|</span>
                        <a 
                            href={`mailto:${siteEmail}`} 
                            className="hidden sm:flex items-center gap-1 hover:text-white/70 transition-colors text-white/80 hover:text-white"
                        >
                            <FiMail size={12} className="md:size-14" /> 
                            <span className="text-white/90">{siteEmail}</span>
                        </a>
                    </div>

                    {/* Right Section - Navigation */}
                    <div className="flex items-center space-x-2 md:space-x-4">
                        {/* Contact Us Button */}
                        <button 
                            onClick={scrollToFooter}
                            className="flex items-center gap-1 hover:text-white/70 transition-colors cursor-pointer group text-white/80 hover:text-white"
                            aria-label="Contact Us"
                        >
                            <FiHelpCircle size={14} className="md:size-16 group-hover:scale-110 transition-transform" />
                            <span className="hidden xs:inline text-white/90">Contact</span>
                        </button>
                        
                        <span className="text-white/20 hidden xs:inline">|</span>
                        
                        {/* User Authentication */}
                        {user ? (
                            <Link 
                                to="/profile" 
                                className="flex items-center gap-1 hover:text-white/70 transition-colors text-white/80 hover:text-white"
                            >
                                <FiUser size={14} className="md:size-16" />
                                <span className="hidden xs:inline text-white/90">Profile</span>
                            </Link>
                        ) : (
                            <>
                                <Link 
                                    to="/login" 
                                    className="flex items-center gap-1 hover:text-white/70 transition-colors text-white/80 hover:text-white"
                                >
                                    <FiLogIn size={14} className="md:size-16" />
                                    <span className="hidden xs:inline text-white/90">Login</span>
                                </Link>
                                <span className="text-white/20 hidden xs:inline">|</span>
                                <Link 
                                    to="/register" 
                                    className="hidden xs:flex items-center gap-1 hover:text-white/70 transition-colors text-white/80 hover:text-white"
                                >
                                    <FiUserPlus size={14} className="md:size-16" />
                                    <span className="text-white/90">Register</span>
                                </Link>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Topbar;