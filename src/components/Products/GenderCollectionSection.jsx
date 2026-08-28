// src/components/Products/GenderCollectionSection.jsx

import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, useMotionValue, useTransform, useSpring } from "framer-motion";

const GenderCollectionSection = () => {
    const navigate = useNavigate();
    const [settings, setSettings] = useState({
        genderMenBackground: null,
        genderWomenBackground: null,
        genderKidsBackground: null,
        genderMenOverlayOpacity: 40,
        genderWomenOverlayOpacity: 40,
        genderKidsOverlayOpacity: 40,
        genderMenTextColor: "#ffffff",
        genderWomenTextColor: "#ffffff",
        genderKidsTextColor: "#ffffff",
        genderMenAccentColor: "#B9853F",
        genderWomenAccentColor: "#C57887",
        genderKidsAccentColor: "#93A562"
    });
    const [isMobile, setIsMobile] = useState(false);
    const [imageErrors, setImageErrors] = useState({});
    const [isLoaded, setIsLoaded] = useState(false);

    // Fallback gradient colors for each collection
    const fallbackGradients = {
        men: "linear-gradient(135deg,#151515 0%,#292723 58%,#4b3b28 100%)",
        women: "linear-gradient(135deg,#2c2024 0%,#5d3942 58%,#8d5d68 100%)",
        kids: "linear-gradient(135deg,#23251d 0%,#485138 58%,#78845d 100%)"
    };

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
            // Force re-render after checking
            setIsLoaded(true);
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        
        loadSettings();
        
        const handleSettingsUpdate = () => loadSettings();
        window.addEventListener('settingsSaved', handleSettingsUpdate);
        window.addEventListener('siteInfoUpdated', handleSettingsUpdate);
        window.addEventListener('storage', handleSettingsUpdate);
        
        return () => {
            window.removeEventListener('resize', checkMobile);
            window.removeEventListener('settingsSaved', handleSettingsUpdate);
            window.removeEventListener('siteInfoUpdated', handleSettingsUpdate);
            window.removeEventListener('storage', handleSettingsUpdate);
        };
    }, []);

    const loadSettings = () => {
        try {
            // Try multiple storage locations
            const siteInfo = JSON.parse(localStorage.getItem('site_info') || '{}');
            const siteSettings = JSON.parse(localStorage.getItem('site_settings') || '{}');
            const siteImages = JSON.parse(localStorage.getItem('site_images') || '{}');
            
            // Get images from any available source
            const menBg = siteInfo.genderMenBackground || 
                         siteImages.genderMenBackground || 
                         siteSettings.genderMenBackground || 
                         null;
            
            const womenBg = siteInfo.genderWomenBackground || 
                           siteImages.genderWomenBackground || 
                           siteSettings.genderWomenBackground || 
                           null;
            
            const kidsBg = siteInfo.genderKidsBackground || 
                          siteImages.genderKidsBackground || 
                          siteSettings.genderKidsBackground || 
                          null;
            
            setSettings({
                genderMenBackground: menBg,
                genderWomenBackground: womenBg,
                genderKidsBackground: kidsBg,
                genderMenOverlayOpacity: siteInfo.genderMenOverlayOpacity || siteSettings.genderMenOverlayOpacity || 40,
                genderWomenOverlayOpacity: siteInfo.genderWomenOverlayOpacity || siteSettings.genderWomenOverlayOpacity || 40,
                genderKidsOverlayOpacity: siteInfo.genderKidsOverlayOpacity || siteSettings.genderKidsOverlayOpacity || 40,
                genderMenTextColor: siteInfo.genderMenTextColor || siteSettings.genderMenTextColor || "#ffffff",
                genderWomenTextColor: siteInfo.genderWomenTextColor || siteSettings.genderWomenTextColor || "#ffffff",
                genderKidsTextColor: siteInfo.genderKidsTextColor || siteSettings.genderKidsTextColor || "#ffffff",
                genderMenAccentColor: siteInfo.genderMenAccentColor || siteSettings.genderMenAccentColor || "#B9853F",
                genderWomenAccentColor: siteInfo.genderWomenAccentColor || siteSettings.genderWomenAccentColor || "#C57887",
                genderKidsAccentColor: siteInfo.genderKidsAccentColor || siteSettings.genderKidsAccentColor || "#93A562"
            });
            
            console.log('✅ Gender settings loaded:', { menBg, womenBg, kidsBg });
        } catch (error) {
            console.error('Error loading gender collection settings:', error);
        }
    };

    const goToCollection = (gender) => {
        navigate(`/collections/${gender}`);
        requestAnimationFrame(() => {
            window.scrollTo({ top: 0, behavior: "smooth" });
        });
    };

    const handleImageError = (collectionId) => {
        setImageErrors(prev => ({ ...prev, [collectionId]: true }));
        console.warn(`⚠️ Image failed to load for ${collectionId} collection`);
    };

    const collections = [
        {
            id: "men",
            label: "MEN",
            title: "Men's Collection",
            subtitle: "Sophisticated styles for the modern gentleman.",
            number: "01",
            accent: settings.genderMenAccentColor || "#B9853F",
            backgroundImage: settings.genderMenBackground,
            overlayOpacity: settings.genderMenOverlayOpacity || 40,
            textColor: settings.genderMenTextColor || "#ffffff",
            gradient: fallbackGradients.men,
            stats: [
                { label: "200+ Styles", icon: "✦" },
                { label: "Premium Quality", icon: "✦" }
            ],
            badge: "PREMIUM"
        },
        {
            id: "women",
            label: "WOMEN",
            title: "Women's Collection",
            subtitle: "Elegant designs that celebrate femininity.",
            number: "02",
            accent: settings.genderWomenAccentColor || "#C57887",
            backgroundImage: settings.genderWomenBackground,
            overlayOpacity: settings.genderWomenOverlayOpacity || 40,
            textColor: settings.genderWomenTextColor || "#ffffff",
            gradient: fallbackGradients.women,
            stats: [
                { label: "150+ Styles", icon: "✦" },
                { label: "Latest Trends", icon: "✦" }
            ],
            badge: "TRENDING"
        },
        {
            id: "kids",
            label: "KIDS",
            title: "Kids' Collection",
            subtitle: "Adorable outfits for your little ones.",
            number: "03",
            accent: settings.genderKidsAccentColor || "#93A562",
            backgroundImage: settings.genderKidsBackground,
            overlayOpacity: settings.genderKidsOverlayOpacity || 40,
            textColor: settings.genderKidsTextColor || "#ffffff",
            gradient: fallbackGradients.kids,
            stats: [
                { label: "100+ Styles", icon: "✦" },
                { label: "Safe & Comfortable", icon: "✦" }
            ],
            badge: "NEW ARRIVAL"
        }
    ];

    // Simplified Tilt Effect for desktop only
    const TiltCard = ({ children, className = "", style = {} }) => {
        const ref = useRef(null);
        const x = useMotionValue(0);
        const y = useMotionValue(0);
        
        const rotateX = useTransform(y, [-1, 1], [5, -5]);
        const rotateY = useTransform(x, [-1, 1], [-5, 5]);
        
        const springConfig = { damping: 30, stiffness: 400 };
        const springRotateX = useSpring(rotateX, springConfig);
        const springRotateY = useSpring(rotateY, springConfig);
        
        const handleMouseMove = (e) => {
            if (!ref.current || isMobile) return;
            const rect = ref.current.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            const normalizedX = (e.clientX - centerX) / (rect.width / 2);
            const normalizedY = (e.clientY - centerY) / (rect.height / 2);
            x.set(Math.max(-1, Math.min(1, normalizedX)));
            y.set(Math.max(-1, Math.min(1, normalizedY)));
        };
        
        const handleMouseLeave = () => {
            x.set(0);
            y.set(0);
        };
        
        return (
            <div
                ref={ref}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                style={{
                    ...style,
                    transform: isMobile ? 'none' : `perspective(1000px) rotateX(${springRotateX.get()}deg) rotateY(${springRotateY.get()}deg)`,
                    transition: isMobile ? 'none' : 'transform 0.1s ease-out',
                }}
                className={className}
            >
                {children}
            </div>
        );
    };

    return (
        <section
            className="relative overflow-hidden bg-[#f7f3ec] py-12 sm:py-16 lg:py-24"
            aria-label="Shop by collection"
        >
            {/* Decorative Background */}
            <div className="pointer-events-none absolute -left-24 top-14 h-72 w-72 rounded-full bg-[#b9853f]/10 blur-3xl" />
            <div className="pointer-events-none absolute -right-24 bottom-10 h-80 w-80 rounded-full bg-[#b9853f]/10 blur-3xl" />

            <div className="relative mx-auto max-w-[1480px] px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <motion.div 
                    className="mx-auto mb-8 sm:mb-10 lg:mb-16 max-w-3xl text-center"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    viewport={{ once: true }}
                >
                    <div className="mb-3 sm:mb-4 flex items-center justify-center gap-2 sm:gap-3">
                        <span className="h-px w-6 sm:w-10 bg-[#b9853f]/40 sm:w-14" />
                        <span className="text-[8px] sm:text-[10px] lg:text-[11px] font-bold uppercase tracking-[0.28em] sm:tracking-[0.32em] text-[#9a6b2f]">
                            Shop By Collection
                        </span>
                        <span className="h-px w-6 sm:w-10 bg-[#b9853f]/40 sm:w-14" />
                    </div>

                    <h2
                        className="text-2xl sm:text-4xl lg:text-5xl xl:text-7xl leading-[0.95] text-[#171717]"
                        style={{ fontFamily: "'Times New Roman', Times, serif" }}
                    >
                        FIND YOUR <span className="italic text-[#b9853f]">PERFECT STYLE</span>
                    </h2>

                    <p className="mx-auto mt-2 sm:mt-3 max-w-2xl text-[10px] sm:text-xs lg:text-sm leading-5 sm:leading-6 text-gray-500">
                        Discover carefully curated collections for every member of your family.
                    </p>
                </motion.div>

                {/* Collection Cards - Grid layout */}
                <div className="grid gap-4 sm:gap-5 lg:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                    {collections.map((collection, index) => {
                        const hasImageError = imageErrors[collection.id];
                        const showFallback = !collection.backgroundImage || hasImageError;
                        
                        return (
                            <motion.div
                                key={collection.id}
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5, delay: index * 0.1 }}
                                viewport={{ once: true }}
                                className="h-full"
                            >
                                <TiltCard
                                    className="group relative h-full min-h-[340px] sm:min-h-[400px] lg:min-h-[540px] overflow-hidden rounded-[20px] sm:rounded-[24px] text-left shadow-[0_15px_40px_rgba(32,24,16,0.12)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_50px_rgba(32,24,16,0.18)] cursor-pointer"
                                >
                                    {/* Base Gradient Background */}
                                    <div 
                                        className="absolute inset-0 w-full h-full"
                                        style={{ background: collection.gradient }}
                                    />

                                    {/* Background Image - Only on desktop or if image exists */}
                                    {collection.backgroundImage && !hasImageError && (
                                        <>
                                            <div className="absolute inset-0 w-full h-full">
                                                <img
                                                    src={collection.backgroundImage}
                                                    alt={`${collection.label} Collection`}
                                                    className="w-full h-full object-cover"
                                                    loading="lazy"
                                                    onError={() => handleImageError(collection.id)}
                                                    style={{
                                                        opacity: isMobile ? 0.7 : 1,
                                                    }}
                                                />
                                            </div>
                                            {/* Dark Overlay for text readability */}
                                            <div 
                                                className="absolute inset-0"
                                                style={{
                                                    background: isMobile 
                                                        ? `linear-gradient(180deg, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.7) 100%)`
                                                        : `linear-gradient(180deg, rgba(0,0,0,${collection.overlayOpacity / 100 - 0.1}) 0%, rgba(0,0,0,${collection.overlayOpacity / 100 + 0.2}) 100%)`,
                                                }}
                                            />
                                        </>
                                    )}

                                    {/* If no image, add overlay for text readability */}
                                    {showFallback && (
                                        <div 
                                            className="absolute inset-0"
                                            style={{
                                                background: `linear-gradient(180deg, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.8) 100%)`,
                                            }}
                                        />
                                    )}

                                    {/* Accent Glow - Desktop only */}
                                    {!isMobile && (
                                        <div
                                            className="absolute -right-16 -top-12 h-48 w-48 rounded-full blur-3xl"
                                            style={{ 
                                                background: `${collection.accent}25`,
                                                opacity: 0.6,
                                            }}
                                        />
                                    )}

                                    {/* Collection Number - Desktop only */}
                                    {!isMobile && (
                                        <div className="absolute -right-2 sm:-right-4 top-4 sm:top-8 select-none text-[100px] sm:text-[140px] font-black leading-none text-white/[0.04] sm:text-white/[0.06]">
                                            {collection.number}
                                        </div>
                                    )}

                                    {/* Content */}
                                    <div className="relative z-10 flex flex-col h-full min-h-[340px] sm:min-h-[400px] lg:min-h-[540px] justify-between p-4 sm:p-5 lg:p-8">
                                        {/* Top: Badge */}
                                        <div className="flex items-start justify-between">
                                            <div
                                                className="inline-block rounded-full px-2.5 py-0.5 sm:px-3 sm:py-1 text-[7px] sm:text-[9px] lg:text-[10px] font-bold uppercase tracking-[0.2em] backdrop-blur-sm"
                                                style={{
                                                    borderColor: `${collection.accent}55`,
                                                    color: collection.accent,
                                                    background: "rgba(255,255,255,.08)",
                                                    border: `1px solid ${collection.accent}55`,
                                                }}
                                            >
                                                {collection.badge}
                                            </div>

                                            <div className="flex h-7 w-7 sm:h-8 sm:w-8 lg:h-10 lg:w-10 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white transition-all duration-300 group-hover:rotate-45 group-hover:bg-white group-hover:text-black backdrop-blur-sm">
                                                <span className="text-xs sm:text-sm lg:text-lg">→</span>
                                            </div>
                                        </div>

                                        {/* Center: Large Letter - Hidden on very small screens */}
                                        <div className="relative py-2 sm:py-4 lg:py-8">
                                            {!isMobile && (
                                                <div className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-white/[0.06]" />
                                            )}

                                            <div className="relative mx-auto flex h-20 w-20 sm:h-28 sm:w-28 lg:h-44 lg:w-44 items-center justify-center rounded-full border border-white/[0.06] backdrop-blur-sm">
                                                <span
                                                    className="relative text-5xl sm:text-6xl lg:text-[100px] font-black leading-none text-white/[0.10] sm:text-white/[0.12]"
                                                    style={{ fontFamily: "'Times New Roman', Times, serif" }}
                                                >
                                                    {collection.label.charAt(0)}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Bottom: Collection Info */}
                                        <div>
                                            <p
                                                className="text-[7px] sm:text-[9px] lg:text-[10px] font-bold uppercase tracking-[0.18em] sm:tracking-[0.2em]"
                                                style={{ color: collection.accent }}
                                            >
                                                {collection.label}'s Collection
                                            </p>

                                            <h3
                                                className="mt-0.5 sm:mt-1 text-lg sm:text-xl lg:text-3xl xl:text-4xl font-bold leading-[0.98]"
                                                style={{ 
                                                    fontFamily: "'Times New Roman', Times, serif",
                                                    color: collection.textColor || "#ffffff"
                                                }}
                                            >
                                                {collection.title}
                                            </h3>

                                            <p 
                                                className="mt-1 sm:mt-2 max-w-[90%] sm:max-w-sm text-[10px] sm:text-xs lg:text-sm leading-4 sm:leading-5 lg:leading-6"
                                                style={{ 
                                                    color: collection.textColor || "#ffffff",
                                                    opacity: 0.75
                                                }}
                                            >
                                                {collection.subtitle}
                                            </p>

                                            {/* Stats Row - Simplified on mobile */}
                                            <div className="mt-2 sm:mt-3 flex flex-wrap items-center gap-1 sm:gap-2 lg:gap-4">
                                                {collection.stats.map((stat, idx) => (
                                                    <div key={idx} className="flex items-center gap-0.5 sm:gap-1">
                                                        <span 
                                                            className="text-[6px] sm:text-[7px] lg:text-[8px]"
                                                            style={{ color: collection.accent }}
                                                        >
                                                            {stat.icon}
                                                        </span>
                                                        <span 
                                                            className="text-[7px] sm:text-[8px] lg:text-[10px] font-medium tracking-wide whitespace-nowrap"
                                                            style={{ 
                                                                color: collection.textColor || "#ffffff",
                                                                opacity: 0.8
                                                            }}
                                                        >
                                                            {stat.label}
                                                        </span>
                                                        {idx < collection.stats.length - 1 && (
                                                            <span className="w-px h-2 sm:h-3 bg-white/20 mx-0.5 sm:mx-1" />
                                                        )}
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Shop Button */}
                                            <div className="mt-2 sm:mt-3 lg:mt-5 flex items-center justify-between border-t border-white/10 pt-2 sm:pt-3 lg:pt-4">
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        goToCollection(collection.id);
                                                    }}
                                                    className="text-[8px] sm:text-[9px] lg:text-xs font-bold uppercase tracking-[0.14em] sm:tracking-[0.16em] transition hover:opacity-80"
                                                    style={{ 
                                                        color: collection.textColor || "#ffffff",
                                                        opacity: 0.9
                                                    }}
                                                >
                                                    SHOP {collection.label}
                                                </button>

                                                <span 
                                                    className="flex h-6 w-6 sm:h-7 sm:w-7 lg:h-9 lg:w-9 items-center justify-center rounded-full bg-white text-xs sm:text-sm lg:text-lg transition-all duration-300 group-hover:translate-x-1"
                                                    style={{ color: collection.accent }}
                                                >
                                                    →
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </TiltCard>
                            </motion.div>
                        );
                    })}
                </div>

                {/* Bottom Feature Bar - Mobile Optimized */}
                <motion.div 
                    className="mt-6 sm:mt-8 overflow-hidden rounded-[16px] sm:rounded-[20px] lg:rounded-[24px] border border-[#e6dccb] bg-white shadow-sm"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    viewport={{ once: true }}
                >
                    {/* Features - 2x2 grid on mobile, 4 column on desktop */}
                    <div className="grid grid-cols-2 gap-0 divide-y divide-x-0 sm:divide-y-0 lg:grid-cols-4 lg:divide-x divide-[#eee4d5]">
                        {/* Feature 1 */}
                        <div className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 lg:p-5 lg:px-6">
                            <div className="flex h-7 w-7 sm:h-8 sm:w-8 lg:h-10 lg:w-10 flex-shrink-0 items-center justify-center rounded-full bg-[#f5f0e8] text-[#b9853f]">
                                <svg className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <div className="min-w-0">
                                <p className="text-[8px] sm:text-[10px] lg:text-xs font-bold uppercase tracking-wider text-gray-800">Free Shipping</p>
                                <p className="text-[6px] sm:text-[8px] lg:text-[10px] text-gray-400 truncate">Over $100</p>
                            </div>
                        </div>

                        {/* Feature 2 */}
                        <div className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 lg:p-5 lg:px-6">
                            <div className="flex h-7 w-7 sm:h-8 sm:w-8 lg:h-10 lg:w-10 flex-shrink-0 items-center justify-center rounded-full bg-[#f5f0e8] text-[#b9853f]">
                                <svg className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                            </div>
                            <div className="min-w-0">
                                <p className="text-[8px] sm:text-[10px] lg:text-xs font-bold uppercase tracking-wider text-gray-800">Easy Returns</p>
                                <p className="text-[6px] sm:text-[8px] lg:text-[10px] text-gray-400 truncate">30-day policy</p>
                            </div>
                        </div>

                        {/* Feature 3 */}
                        <div className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 lg:p-5 lg:px-6 border-t sm:border-t-0">
                            <div className="flex h-7 w-7 sm:h-8 sm:w-8 lg:h-10 lg:w-10 flex-shrink-0 items-center justify-center rounded-full bg-[#f5f0e8] text-[#b9853f]">
                                <svg className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                                </svg>
                            </div>
                            <div className="min-w-0">
                                <p className="text-[8px] sm:text-[10px] lg:text-xs font-bold uppercase tracking-wider text-gray-800">Quality Guarantee</p>
                                <p className="text-[6px] sm:text-[8px] lg:text-[10px] text-gray-400 truncate">Premium products</p>
                            </div>
                        </div>

                        {/* Feature 4 */}
                        <div className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 lg:p-5 lg:px-6 border-t sm:border-t-0">
                            <div className="flex h-7 w-7 sm:h-8 sm:w-8 lg:h-10 lg:w-10 flex-shrink-0 items-center justify-center rounded-full bg-[#f5f0e8] text-[#b9853f]">
                                <svg className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                            </div>
                            <div className="min-w-0">
                                <p className="text-[8px] sm:text-[10px] lg:text-xs font-bold uppercase tracking-wider text-gray-800">Secure Payment</p>
                                <p className="text-[6px] sm:text-[8px] lg:text-[10px] text-gray-400 truncate">100% secure</p>
                            </div>
                        </div>
                    </div>

                    {/* Bottom "View All Products" Button */}
                    <div className="border-t border-[#eee4d5]">
                        <button
                            type="button"
                            onClick={() => navigate("/collections/all")}
                            className="group flex w-full items-center justify-between px-3 sm:px-5 lg:px-8 py-2.5 sm:py-3 lg:py-4 text-left transition hover:bg-[#171717]"
                        >
                            <div>
                                <p className="text-[8px] sm:text-[9px] lg:text-[10px] font-bold uppercase tracking-[0.16em] sm:tracking-[0.18em] text-gray-400 transition group-hover:text-white/50">
                                    Explore More
                                </p>
                                <p className="mt-0.5 text-[10px] sm:text-xs lg:text-sm font-bold text-gray-900 transition group-hover:text-white">
                                    View All Products
                                </p>
                            </div>

                            <span className="flex h-7 w-7 sm:h-8 sm:w-8 lg:h-10 lg:w-10 items-center justify-center rounded-full bg-black text-white transition group-hover:bg-[#b9853f]">
                                →
                            </span>
                        </button>
                    </div>
                </motion.div>
            </div>
        </section>
    );
};

export default GenderCollectionSection;