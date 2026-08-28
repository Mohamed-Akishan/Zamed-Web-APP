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

    useEffect(() => {
        // Check if mobile
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        
        loadSettings();
        
        const handleSettingsUpdate = () => loadSettings();
        window.addEventListener('settingsSaved', handleSettingsUpdate);
        window.addEventListener('siteInfoUpdated', handleSettingsUpdate);
        
        return () => {
            window.removeEventListener('resize', checkMobile);
            window.removeEventListener('settingsSaved', handleSettingsUpdate);
            window.removeEventListener('siteInfoUpdated', handleSettingsUpdate);
        };
    }, []);

    const loadSettings = () => {
        try {
            const siteInfo = JSON.parse(localStorage.getItem('site_info') || '{}');
            const siteSettings = JSON.parse(localStorage.getItem('site_settings') || '{}');
            
            setSettings({
                genderMenBackground: siteInfo.genderMenBackground || siteSettings.genderMenBackground || null,
                genderWomenBackground: siteInfo.genderWomenBackground || siteSettings.genderWomenBackground || null,
                genderKidsBackground: siteInfo.genderKidsBackground || siteSettings.genderKidsBackground || null,
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
            gradient: "linear-gradient(135deg,#151515 0%,#292723 58%,#4b3b28 100%)",
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
            gradient: "linear-gradient(135deg,#2c2024 0%,#5d3942 58%,#8d5d68 100%)",
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
            gradient: "linear-gradient(135deg,#23251d 0%,#485138 58%,#78845d 100%)",
            stats: [
                { label: "100+ Styles", icon: "✦" },
                { label: "Safe & Comfortable", icon: "✦" }
            ],
            badge: "NEW ARRIVAL"
        }
    ];

    // 3D Tilt Effect Component - Disabled on mobile
    const TiltCard = ({ children, className = "", style = {} }) => {
        const ref = useRef(null);
        const x = useMotionValue(0);
        const y = useMotionValue(0);
        
        const rotateX = useTransform(y, [-1, 1], [10, -10]);
        const rotateY = useTransform(x, [-1, 1], [-10, 10]);
        
        const springConfig = { damping: 25, stiffness: 350 };
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
            <motion.div
                ref={ref}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                style={{
                    ...style,
                    rotateX: isMobile ? 0 : springRotateX,
                    rotateY: isMobile ? 0 : springRotateY,
                    transformStyle: "preserve-3d",
                    perspective: isMobile ? 'none' : 1000,
                }}
                className={className}
            >
                {children}
            </motion.div>
        );
    };

    // Floating Elements - Disabled on mobile for performance
    const FloatingElement = ({ children, delay = 0, duration = 4, className = "" }) => (
        <motion.div
            className={className}
            animate={isMobile ? {} : {
                y: [0, -12, 0],
                rotate: [0, 3, -3, 0],
            }}
            transition={{
                duration,
                delay,
                repeat: Infinity,
                repeatType: "reverse",
                ease: "easeInOut",
            }}
        >
            {children}
        </motion.div>
    );

    // Background Image Component with fallback
    const BackgroundImage = ({ image, gradient, children }) => {
        return (
            <div className="absolute inset-0 w-full h-full">
                {image ? (
                    // Using img tag instead of background-image for better mobile support
                    <img
                        src={image}
                        alt="Collection background"
                        className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
                        loading="lazy"
                        onError={(e) => {
                            // Fallback to gradient if image fails to load
                            e.target.style.display = 'none';
                            e.target.parentElement.style.background = gradient;
                        }}
                    />
                ) : (
                    <div 
                        className="w-full h-full transition-transform duration-700 group-hover:scale-110"
                        style={{ background: gradient }}
                    />
                )}
                {image && (
                    <div 
                        className="absolute inset-0"
                        style={{
                            background: `linear-gradient(180deg, rgba(0,0,0,${settings.genderMenOverlayOpacity / 100 - 0.1}) 0%, rgba(0,0,0,${settings.genderMenOverlayOpacity / 100 + 0.2}) 100%)`,
                        }}
                    />
                )}
                {children}
            </div>
        );
    };

    return (
        <section
            className="relative overflow-hidden bg-[#f7f3ec] py-12 sm:py-16 lg:py-24"
            aria-label="Shop by collection"
        >
            {/* Decorative Background Blobs */}
            <div className="pointer-events-none absolute -left-24 top-14 h-72 w-72 rounded-full bg-[#b9853f]/10 blur-3xl" />
            <div className="pointer-events-none absolute -right-24 bottom-10 h-80 w-80 rounded-full bg-[#b9853f]/10 blur-3xl" />

            <div className="relative mx-auto max-w-[1480px] px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <motion.div 
                    className="mx-auto mb-10 max-w-3xl text-center sm:mb-14 lg:mb-16"
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    viewport={{ once: true }}
                >
                    <div className="mb-4 flex items-center justify-center gap-3">
                        <span className="h-px w-8 bg-[#b9853f]/40 sm:w-14" />
                        <span className="text-[10px] font-bold uppercase tracking-[0.32em] text-[#9a6b2f] sm:text-[11px]">
                            Shop By Collection
                        </span>
                        <span className="h-px w-8 bg-[#b9853f]/40 sm:w-14" />
                    </div>

                    <h2
                        className="text-3xl leading-[0.95] text-[#171717] sm:text-5xl lg:text-6xl xl:text-7xl"
                        style={{ fontFamily: "'Times New Roman', Times, serif" }}
                    >
                        FIND YOUR <span className="italic text-[#b9853f]">PERFECT STYLE</span>
                    </h2>

                    <p className="mx-auto mt-3 max-w-2xl text-xs leading-6 text-gray-500 sm:text-sm">
                        Discover carefully curated collections for every member of your family.
                    </p>
                </motion.div>

                {/* Collection Cards */}
                <div className="grid gap-5 sm:gap-6 lg:grid-cols-3">
                    {collections.map((collection, index) => (
                        <motion.div
                            key={collection.id}
                            initial={{ opacity: 0, y: 50 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, delay: index * 0.15 }}
                            viewport={{ once: true }}
                        >
                            <TiltCard
                                className="group relative min-h-[400px] overflow-hidden rounded-[24px] text-left shadow-[0_22px_60px_rgba(32,24,16,0.14)] transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_30px_75px_rgba(32,24,16,0.22)] sm:min-h-[540px] lg:min-h-[620px] cursor-pointer"
                            >
                                {/* Background Image with Mobile Fix */}
                                {collection.backgroundImage ? (
                                    <>
                                        <div className="absolute inset-0 w-full h-full">
                                            <img
                                                src={collection.backgroundImage}
                                                alt={`${collection.label} Collection`}
                                                className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
                                                loading="lazy"
                                                onError={(e) => {
                                                    // Fallback to gradient if image fails
                                                    e.target.style.display = 'none';
                                                    e.target.parentElement.style.background = collection.gradient;
                                                }}
                                            />
                                        </div>
                                        {/* Overlay */}
                                        <div 
                                            className="absolute inset-0"
                                            style={{
                                                background: `linear-gradient(180deg, rgba(0,0,0,${collection.overlayOpacity / 100 - 0.1}) 0%, rgba(0,0,0,${collection.overlayOpacity / 100 + 0.2}) 100%)`,
                                            }}
                                        />
                                    </>
                                ) : (
                                    <div 
                                        className="absolute inset-0 w-full h-full transition-transform duration-700 group-hover:scale-110"
                                        style={{ background: collection.gradient }}
                                    />
                                )}

                                {/* 3D Depth Glow - Reduced on mobile */}
                                {!isMobile && (
                                    <motion.div
                                        className="absolute -right-20 -top-16 h-64 w-64 rounded-full blur-3xl"
                                        style={{ background: `${collection.accent}30` }}
                                        animate={{
                                            scale: [1, 1.2, 1],
                                            opacity: [0.4, 0.7, 0.4],
                                        }}
                                        transition={{
                                            duration: 5,
                                            repeat: Infinity,
                                            ease: "easeInOut",
                                        }}
                                    />
                                )}

                                {/* Floating Collection Number - Hidden on mobile */}
                                {!isMobile && (
                                    <FloatingElement
                                        delay={index * 0.3}
                                        duration={3 + index}
                                        className="absolute -right-4 top-8 select-none text-[140px] font-black leading-none text-white/[0.06] sm:text-[170px]"
                                    >
                                        {collection.number}
                                    </FloatingElement>
                                )}

                                {/* Content */}
                                <div className="relative z-10 flex h-full min-h-[400px] flex-col justify-between p-5 sm:min-h-[540px] sm:p-8 lg:min-h-[620px] lg:p-9">
                                    {/* Top: Badge */}
                                    <div className="flex items-start justify-between">
                                        <motion.div
                                            className="inline-block rounded-full px-3 py-1 text-[9px] font-bold uppercase tracking-[0.22em] backdrop-blur-sm sm:px-4 sm:py-1.5 sm:text-[10px]"
                                            style={{
                                                borderColor: `${collection.accent}55`,
                                                color: collection.accent,
                                                background: "rgba(255,255,255,.08)",
                                                border: `1px solid ${collection.accent}55`,
                                            }}
                                            whileHover={{ scale: 1.05 }}
                                            transition={{ type: "spring", stiffness: 400 }}
                                        >
                                            {collection.badge}
                                        </motion.div>

                                        <motion.div 
                                            className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white transition-all duration-300 group-hover:rotate-45 group-hover:bg-white group-hover:text-black backdrop-blur-sm"
                                            whileHover={{ scale: 1.1 }}
                                            transition={{ type: "spring", stiffness: 400 }}
                                        >
                                            <span className="text-sm sm:text-lg">→</span>
                                        </motion.div>
                                    </div>

                                    {/* Center: Large Letter */}
                                    <div className="relative py-4 sm:py-8">
                                        {!isMobile && (
                                            <div className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-white/[0.06]" />
                                        )}

                                        <motion.div 
                                            className="relative mx-auto flex h-32 w-32 sm:h-44 sm:w-44 lg:h-56 lg:w-56 items-center justify-center rounded-full border border-white/[0.06] backdrop-blur-sm"
                                            whileHover={{ scale: 1.05 }}
                                            transition={{ type: "spring", stiffness: 300 }}
                                        >
                                            {!isMobile && (
                                                <motion.div
                                                    className="absolute inset-4 rounded-full blur-2xl"
                                                    style={{ background: `${collection.accent}30` }}
                                                    animate={{
                                                        scale: [1, 1.3, 1],
                                                        opacity: [0.4, 0.8, 0.4],
                                                    }}
                                                    transition={{
                                                        duration: 4,
                                                        delay: index * 0.5,
                                                        repeat: Infinity,
                                                        ease: "easeInOut",
                                                    }}
                                                />
                                            )}

                                            <span
                                                className="relative text-7xl sm:text-[100px] font-black leading-none text-white/[0.12]"
                                                style={{ fontFamily: "'Times New Roman', Times, serif" }}
                                            >
                                                {collection.label.charAt(0)}
                                            </span>

                                            {!isMobile && (
                                                <motion.div 
                                                    className="absolute bottom-4 left-1/2 h-1 w-8 sm:w-12 -translate-x-1/2 rounded-full bg-white/15"
                                                    animate={{
                                                        width: [8, 20, 8],
                                                    }}
                                                    transition={{
                                                        duration: 3,
                                                        repeat: Infinity,
                                                        ease: "easeInOut",
                                                    }}
                                                />
                                            )}
                                        </motion.div>
                                    </div>

                                    {/* Bottom: Collection Info */}
                                    <div>
                                        <p
                                            className="text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.2em]"
                                            style={{ color: collection.accent }}
                                        >
                                            {collection.label}'s Collection
                                        </p>

                                        <h3
                                            className="mt-1 text-xl sm:text-3xl lg:text-4xl font-bold leading-[0.98]"
                                            style={{ 
                                                fontFamily: "'Times New Roman', Times, serif",
                                                color: collection.textColor || "#ffffff"
                                            }}
                                        >
                                            {collection.title}
                                        </h3>

                                        <p 
                                            className="mt-2 max-w-sm text-xs sm:text-sm leading-5 sm:leading-6"
                                            style={{ 
                                                color: collection.textColor || "#ffffff",
                                                opacity: 0.75
                                            }}
                                        >
                                            {collection.subtitle}
                                        </p>

                                        {/* Stats Row */}
                                        <div className="mt-3 flex flex-wrap items-center gap-2 sm:gap-4">
                                            {collection.stats.map((stat, idx) => (
                                                <div key={idx} className="flex items-center gap-1 sm:gap-1.5">
                                                    <span 
                                                        className="text-[7px] sm:text-[8px]"
                                                        style={{ color: collection.accent }}
                                                    >
                                                        {stat.icon}
                                                    </span>
                                                    <span 
                                                        className="text-[8px] sm:text-[10px] font-medium tracking-wide"
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
                                        <motion.div 
                                            className="mt-3 sm:mt-5 flex items-center justify-between border-t border-white/10 pt-3 sm:pt-4"
                                            whileHover={{ y: -2 }}
                                            transition={{ type: "spring", stiffness: 300 }}
                                        >
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    goToCollection(collection.id);
                                                }}
                                                className="text-[9px] sm:text-xs font-bold uppercase tracking-[0.16em] transition hover:opacity-80"
                                                style={{ 
                                                    color: collection.textColor || "#ffffff",
                                                    opacity: 0.9
                                                }}
                                            >
                                                SHOP {collection.label}
                                            </button>

                                            <motion.span 
                                                className="flex h-7 w-7 sm:h-9 sm:w-9 items-center justify-center rounded-full bg-white text-base sm:text-lg transition-all duration-300 group-hover:translate-x-1"
                                                style={{ color: collection.accent }}
                                                whileHover={{ scale: 1.1, x: 3 }}
                                                transition={{ type: "spring", stiffness: 400 }}
                                            >
                                                →
                                            </motion.span>
                                        </motion.div>
                                    </div>
                                </div>
                            </TiltCard>
                        </motion.div>
                    ))}
                </div>

                {/* Bottom Feature Bar - Responsive */}
                <motion.div 
                    className="mt-6 sm:mt-8 overflow-hidden rounded-[20px] sm:rounded-[24px] border border-[#e6dccb] bg-white shadow-sm"
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.3 }}
                    viewport={{ once: true }}
                >
                    {/* Features Grid - 2 columns on mobile, 4 on desktop */}
                    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 divide-y divide-x-0 sm:divide-y-0 lg:divide-x divide-[#eee4d5]">
                        {/* Feature 1 */}
                        <div className="flex items-center gap-3 p-3 sm:p-5 sm:px-6">
                            <div className="flex h-8 w-8 sm:h-10 sm:w-10 flex-shrink-0 items-center justify-center rounded-full bg-[#f5f0e8] text-[#b9853f]">
                                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <div className="min-w-0">
                                <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-gray-800">Free Shipping</p>
                                <p className="text-[8px] sm:text-[10px] text-gray-400 truncate">On orders over $100</p>
                            </div>
                        </div>

                        {/* Feature 2 */}
                        <div className="flex items-center gap-3 p-3 sm:p-5 sm:px-6">
                            <div className="flex h-8 w-8 sm:h-10 sm:w-10 flex-shrink-0 items-center justify-center rounded-full bg-[#f5f0e8] text-[#b9853f]">
                                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                            </div>
                            <div className="min-w-0">
                                <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-gray-800">Easy Returns</p>
                                <p className="text-[8px] sm:text-[10px] text-gray-400 truncate">30-day return policy</p>
                            </div>
                        </div>

                        {/* Feature 3 */}
                        <div className="flex items-center gap-3 p-3 sm:p-5 sm:px-6 border-t sm:border-t-0">
                            <div className="flex h-8 w-8 sm:h-10 sm:w-10 flex-shrink-0 items-center justify-center rounded-full bg-[#f5f0e8] text-[#b9853f]">
                                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                                </svg>
                            </div>
                            <div className="min-w-0">
                                <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-gray-800">Quality Guarantee</p>
                                <p className="text-[8px] sm:text-[10px] text-gray-400 truncate">Premium quality products</p>
                            </div>
                        </div>

                        {/* Feature 4 */}
                        <div className="flex items-center gap-3 p-3 sm:p-5 sm:px-6 border-t sm:border-t-0">
                            <div className="flex h-8 w-8 sm:h-10 sm:w-10 flex-shrink-0 items-center justify-center rounded-full bg-[#f5f0e8] text-[#b9853f]">
                                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                            </div>
                            <div className="min-w-0">
                                <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-gray-800">Secure Payment</p>
                                <p className="text-[8px] sm:text-[10px] text-gray-400 truncate">100% secure checkout</p>
                            </div>
                        </div>
                    </div>

                    {/* Bottom "View All Products" Button */}
                    <div className="border-t border-[#eee4d5]">
                        <button
                            type="button"
                            onClick={() => navigate("/collections/all")}
                            className="group flex w-full items-center justify-between px-4 sm:px-6 lg:px-8 py-3 sm:py-4 text-left transition hover:bg-[#171717]"
                        >
                            <div>
                                <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.18em] text-gray-400 transition group-hover:text-white/50">
                                    Explore More
                                </p>
                                <p className="mt-0.5 text-xs sm:text-sm font-bold text-gray-900 transition group-hover:text-white">
                                    View All Products
                                </p>
                            </div>

                            <motion.span 
                                className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-black text-white transition group-hover:bg-[#b9853f]"
                                whileHover={{ scale: 1.05 }}
                                transition={{ type: "spring", stiffness: 300 }}
                            >
                                →
                            </motion.span>
                        </button>
                    </div>
                </motion.div>
            </div>
        </section>
    );
};

export default GenderCollectionSection;