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

    useEffect(() => {
        loadSettings();
        
        const handleSettingsUpdate = () => loadSettings();
        window.addEventListener('settingsSaved', handleSettingsUpdate);
        window.addEventListener('siteInfoUpdated', handleSettingsUpdate);
        
        return () => {
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

    // 3D Tilt Effect Component
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
            if (!ref.current) return;
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
                    rotateX: springRotateX,
                    rotateY: springRotateY,
                    transformStyle: "preserve-3d",
                    perspective: 1000,
                }}
                className={className}
            >
                {children}
            </motion.div>
        );
    };

    // Floating Elements
    const FloatingElement = ({ children, delay = 0, duration = 4, className = "" }) => (
        <motion.div
            className={className}
            animate={{
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

    return (
        <section
            className="relative overflow-hidden bg-[#f7f3ec] py-16 sm:py-20 lg:py-24"
            aria-label="Shop by collection"
        >
            {/* Decorative Background Blobs */}
            <div className="pointer-events-none absolute -left-24 top-14 h-72 w-72 rounded-full bg-[#b9853f]/10 blur-3xl" />
            <div className="pointer-events-none absolute -right-24 bottom-10 h-80 w-80 rounded-full bg-[#b9853f]/10 blur-3xl" />

            <div className="relative mx-auto max-w-[1480px] px-4 sm:px-6 lg:px-8">
                {/* Header - Exact match to image */}
                <motion.div 
                    className="mx-auto mb-12 max-w-3xl text-center sm:mb-14 lg:mb-16"
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    viewport={{ once: true }}
                >
                    <div className="mb-4 flex items-center justify-center gap-3">
                        <span className="h-px w-10 bg-[#b9853f]/40 sm:w-14" />
                        <span className="text-[10px] font-bold uppercase tracking-[0.32em] text-[#9a6b2f] sm:text-[11px]">
                            Shop By Collection
                        </span>
                        <span className="h-px w-10 bg-[#b9853f]/40 sm:w-14" />
                    </div>

                    <h2
                        className="text-4xl leading-[0.95] text-[#171717] sm:text-5xl lg:text-6xl xl:text-7xl"
                        style={{ fontFamily: "'Times New Roman', Times, serif" }}
                    >
                        FIND YOUR <span className="italic text-[#b9853f]">PERFECT STYLE</span>
                    </h2>

                    <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-gray-500 sm:text-base">
                        Discover carefully curated collections for every member of your family.
                    </p>
                </motion.div>

                {/* Collection Cards with 3D Effect - Matching the image design */}
                <div className="grid gap-6 lg:grid-cols-3">
                    {collections.map((collection, index) => (
                        <motion.div
                            key={collection.id}
                            initial={{ opacity: 0, y: 50 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, delay: index * 0.15 }}
                            viewport={{ once: true }}
                        >
                            <TiltCard
                                className="group relative min-h-[540px] overflow-hidden rounded-[28px] text-left shadow-[0_22px_60px_rgba(32,24,16,0.14)] transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_30px_75px_rgba(32,24,16,0.22)] sm:min-h-[580px] lg:min-h-[620px] cursor-pointer"
                            >
                                {/* Background Image with 3D Parallax */}
                                {collection.backgroundImage ? (
                                    <>
                                        <div 
                                            className="absolute inset-0 w-full h-full bg-cover bg-center transition-transform duration-1000 group-hover:scale-110"
                                            style={{ 
                                                backgroundImage: `url(${collection.backgroundImage})`,
                                            }}
                                        />
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

                                {/* 3D Depth Glow */}
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

                                {/* Floating Collection Number */}
                                <FloatingElement
                                    delay={index * 0.3}
                                    duration={3 + index}
                                    className="absolute -right-4 top-8 select-none text-[140px] font-black leading-none text-white/[0.06] sm:text-[170px]"
                                >
                                    {collection.number}
                                </FloatingElement>

                                {/* Content */}
                                <div className="relative z-10 flex h-full min-h-[540px] flex-col justify-between p-6 sm:min-h-[580px] sm:p-8 lg:min-h-[620px] lg:p-9">
                                    {/* Top: Badge */}
                                    <div className="flex items-start justify-between">
                                        <motion.div
                                            className="inline-block rounded-full px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.22em] backdrop-blur-sm border"
                                            style={{
                                                borderColor: `${collection.accent}55`,
                                                color: collection.accent,
                                                background: "rgba(255,255,255,.08)",
                                            }}
                                            whileHover={{ scale: 1.05 }}
                                            transition={{ type: "spring", stiffness: 400 }}
                                        >
                                            {collection.badge}
                                        </motion.div>

                                        <motion.div 
                                            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white transition-all duration-300 group-hover:rotate-45 group-hover:bg-white group-hover:text-black backdrop-blur-sm"
                                            whileHover={{ scale: 1.1 }}
                                            transition={{ type: "spring", stiffness: 400 }}
                                        >
                                            <span className="text-lg">→</span>
                                        </motion.div>
                                    </div>

                                    {/* Center: Large Letter with 3D effect */}
                                    <div className="relative py-8">
                                        <div className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-white/[0.06]" />

                                        <motion.div 
                                            className="relative mx-auto flex h-44 w-44 items-center justify-center rounded-full border border-white/[0.06] backdrop-blur-sm sm:h-52 sm:w-52 lg:h-56 lg:w-56"
                                            whileHover={{ scale: 1.05 }}
                                            transition={{ type: "spring", stiffness: 300 }}
                                        >
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

                                            <span
                                                className="relative text-[100px] font-black leading-none text-white/[0.12] sm:text-[120px]"
                                                style={{ fontFamily: "'Times New Roman', Times, serif" }}
                                            >
                                                {collection.label.charAt(0)}
                                            </span>

                                            <motion.div 
                                                className="absolute bottom-4 left-1/2 h-1 w-12 -translate-x-1/2 rounded-full bg-white/15"
                                                animate={{
                                                    width: [12, 28, 12],
                                                }}
                                                transition={{
                                                    duration: 3,
                                                    repeat: Infinity,
                                                    ease: "easeInOut",
                                                }}
                                            />
                                        </motion.div>
                                    </div>

                                    {/* Bottom: Collection Info */}
                                    <div>
                                        <p
                                            className="text-[10px] font-bold uppercase tracking-[0.2em]"
                                            style={{ color: collection.accent }}
                                        >
                                            {collection.label}'s Collection
                                        </p>

                                        <h3
                                            className="mt-1.5 text-3xl font-bold leading-[0.98] sm:text-4xl"
                                            style={{ 
                                                fontFamily: "'Times New Roman', Times, serif",
                                                color: collection.textColor || "#ffffff"
                                            }}
                                        >
                                            {collection.title}
                                        </h3>

                                        <p 
                                            className="mt-3 max-w-sm text-sm leading-6"
                                            style={{ 
                                                color: collection.textColor || "#ffffff",
                                                opacity: 0.75
                                            }}
                                        >
                                            {collection.subtitle}
                                        </p>

                                        {/* Stats Row - Matching the image design with dots */}
                                        <div className="mt-4 flex items-center gap-4">
                                            {collection.stats.map((stat, idx) => (
                                                <div key={idx} className="flex items-center gap-1.5">
                                                    <span 
                                                        className="text-[8px]"
                                                        style={{ color: collection.accent }}
                                                    >
                                                        {stat.icon}
                                                    </span>
                                                    <span 
                                                        className="text-[10px] font-medium tracking-wide"
                                                        style={{ 
                                                            color: collection.textColor || "#ffffff",
                                                            opacity: 0.8
                                                        }}
                                                    >
                                                        {stat.label}
                                                    </span>
                                                    {idx < collection.stats.length - 1 && (
                                                        <span className="w-px h-3 bg-white/20 mx-1" />
                                                    )}
                                                </div>
                                            ))}
                                        </div>

                                        {/* Shop Button */}
                                        <motion.div 
                                            className="mt-5 flex items-center justify-between border-t border-white/10 pt-4"
                                            whileHover={{ y: -2 }}
                                            transition={{ type: "spring", stiffness: 300 }}
                                        >
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    goToCollection(collection.id);
                                                }}
                                                className="text-xs font-bold uppercase tracking-[0.16em] transition hover:opacity-80"
                                                style={{ 
                                                    color: collection.textColor || "#ffffff",
                                                    opacity: 0.9
                                                }}
                                            >
                                                SHOP {collection.label}
                                            </button>

                                            <motion.span 
                                                className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-lg transition-all duration-300 group-hover:translate-x-1"
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

                {/* Bottom Feature Bar - Matching the image design */}
                <motion.div 
                    className="mt-8 overflow-hidden rounded-[24px] border border-[#e6dccb] bg-white shadow-sm"
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.3 }}
                    viewport={{ once: true }}
                >
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-[#eee4d5]">
                        {/* Feature 1 */}
                        <div className="flex items-center gap-4 p-5 px-6">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f5f0e8] text-[#b9853f]">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-xs font-bold uppercase tracking-wider text-gray-800">Free Shipping</p>
                                <p className="text-[10px] text-gray-400">On orders over $100</p>
                            </div>
                        </div>

                        {/* Feature 2 */}
                        <div className="flex items-center gap-4 p-5 px-6">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f5f0e8] text-[#b9853f]">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-xs font-bold uppercase tracking-wider text-gray-800">Easy Returns</p>
                                <p className="text-[10px] text-gray-400">30-day return policy</p>
                            </div>
                        </div>

                        {/* Feature 3 */}
                        <div className="flex items-center gap-4 p-5 px-6">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f5f0e8] text-[#b9853f]">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-xs font-bold uppercase tracking-wider text-gray-800">Quality Guarantee</p>
                                <p className="text-[10px] text-gray-400">Premium quality products</p>
                            </div>
                        </div>

                        {/* Feature 4 */}
                        <div className="flex items-center gap-4 p-5 px-6">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f5f0e8] text-[#b9853f]">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-xs font-bold uppercase tracking-wider text-gray-800">Secure Payment</p>
                                <p className="text-[10px] text-gray-400">100% secure checkout</p>
                            </div>
                        </div>
                    </div>

                    {/* Bottom "View All Products" Button */}
                    <div className="border-t border-[#eee4d5]">
                        <button
                            type="button"
                            onClick={() => navigate("/collections/all")}
                            className="group flex w-full items-center justify-between px-6 py-4 text-left transition hover:bg-[#171717] sm:px-8"
                        >
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-400 transition group-hover:text-white/50">
                                    Explore More
                                </p>
                                <p className="mt-0.5 text-sm font-bold text-gray-900 transition group-hover:text-white">
                                    View All Products
                                </p>
                            </div>

                            <motion.span 
                                className="flex h-10 w-10 items-center justify-center rounded-full bg-black text-white transition group-hover:bg-[#b9853f]"
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