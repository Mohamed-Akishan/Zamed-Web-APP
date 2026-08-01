// src/components/Products/GenderCollectionSection.jsx
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import { ArrowRight, Sparkles, Crown, Shield, Star, ChevronDown } from "lucide-react";

const GenderCollectionSection = () => {
    const navigate = useNavigate();
    const [hoveredIndex, setHoveredIndex] = useState(null);
    const [isVisible, setIsVisible] = useState(false);
    const sectionRef = useRef(null);
    const { scrollYProgress } = useScroll({
        target: sectionRef,
        offset: ["start end", "end start"]
    });

    // Parallax effects for images
    const y1 = useTransform(scrollYProgress, [0, 1], [0, -80]);
    const y2 = useTransform(scrollYProgress, [0, 1], [0, 80]);
    const y3 = useTransform(scrollYProgress, [0, 1], [0, -40]);
    const opacity1 = useTransform(scrollYProgress, [0, 0.3], [0.5, 1]);
    const scale1 = useTransform(scrollYProgress, [0, 0.3], [0.95, 1]);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                }
            },
            { threshold: 0.1, triggerOnce: true }
        );

        if (sectionRef.current) {
            observer.observe(sectionRef.current);
        }

        return () => {
            if (sectionRef.current) {
                observer.unobserve(sectionRef.current);
            }
        };
    }, []);

    const handleShopClick = (gender) => {
        navigate(`/collections/${gender}`);
        setTimeout(() => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }, 100);
    };

    const collections = [
        { 
            name: "Men's Collection", 
            gender: "men", 
            image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800&h=600&fit=crop", 
            color: "from-blue-600",
            description: "Sophisticated styles for the modern gentleman",
            badge: "Premium",
            stats: "200+ Styles",
            icon: Crown,
            bgColor: "bg-blue-500/10"
        },
        { 
            name: "Women's Collection", 
            gender: "women", 
            image: "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=800&h=600&fit=crop", 
            color: "from-pink-600",
            description: "Elegant designs that celebrate femininity",
            badge: "Trending",
            stats: "150+ Styles",
            icon: Shield,
            bgColor: "bg-pink-500/10"
        },
        { 
            name: "Kids Collection", 
            gender: "kids", 
            image: "https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?w=800&h=600&fit=crop", 
            color: "from-green-600",
            description: "Adorable outfits for your little ones",
            badge: "New",
            stats: "100+ Styles",
            icon: Star,
            bgColor: "bg-green-500/10"
        }
    ];

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.2,
                delayChildren: 0.3,
            }
        }
    };

    const cardVariants = {
        hidden: { 
            opacity: 0, 
            y: 80,
            scale: 0.9,
            rotateX: 15,
            filter: "blur(10px)",
        },
        visible: { 
            opacity: 1, 
            y: 0,
            scale: 1,
            rotateX: 0,
            filter: "blur(0px)",
            transition: { 
                duration: 1,
                ease: [0.16, 1, 0.3, 1],
            }
        }
    };

    const imageVariants = {
        hidden: { 
            scale: 1.2,
            opacity: 0,
        },
        visible: { 
            scale: 1,
            opacity: 1,
            transition: { 
                duration: 1.2,
                ease: [0.16, 1, 0.3, 1],
                delay: 0.2,
            }
        }
    };

    const badgeVariants = {
        hidden: { opacity: 0, scale: 0.5, y: -20 },
        visible: {
            opacity: 1,
            scale: 1,
            y: 0,
            transition: {
                duration: 0.6,
                delay: 0.4,
                ease: "easeOut"
            }
        }
    };

    const contentVariants = {
        hidden: { opacity: 0, y: 40 },
        visible: {
            opacity: 1,
            y: 0,
            transition: {
                duration: 0.7,
                delay: 0.5,
                ease: [0.16, 1, 0.3, 1]
            }
        }
    };

    const buttonVariants = {
        hidden: { opacity: 0, scale: 0.9 },
        visible: {
            opacity: 1,
            scale: 1,
            transition: {
                duration: 0.5,
                delay: 0.6,
                ease: "easeOut"
            }
        },
        hover: {
            scale: 1.05,
            boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
            transition: {
                duration: 0.3,
                ease: "easeOut"
            }
        },
        tap: {
            scale: 0.95
        }
    };

    const textRevealVariants = {
        hidden: { 
            opacity: 0,
            y: 30,
        },
        visible: {
            opacity: 1,
            y: 0,
            transition: {
                duration: 0.6,
                ease: [0.16, 1, 0.3, 1]
            }
        }
    };

    return (
        <section 
            ref={sectionRef}
            className="relative py-24 px-4 overflow-hidden bg-gradient-to-b from-white via-gray-50/30 to-white"
        >
            {/* Animated Background Particles */}
            <div className="absolute inset-0 pointer-events-none">
                {[...Array(15)].map((_, i) => (
                    <motion.div
                        key={i}
                        className="absolute rounded-full bg-gradient-to-r from-blue-400/5 to-purple-400/5"
                        style={{
                            width: Math.random() * 400 + 100,
                            height: Math.random() * 400 + 100,
                            left: `${Math.random() * 100}%`,
                            top: `${Math.random() * 100}%`,
                        }}
                        animate={{
                            y: [0, -50, 0],
                            x: [0, 30, 0],
                            scale: [1, 1.2, 1],
                        }}
                        transition={{
                            duration: Math.random() * 15 + 10,
                            repeat: Infinity,
                            ease: "easeInOut",
                            delay: Math.random() * 5,
                        }}
                    />
                ))}
            </div>

            {/* Scroll Progress Indicator */}
            <motion.div 
                className="absolute top-0 left-0 h-1 bg-gradient-to-r from-blue-600 to-purple-600"
                style={{ 
                    width: useTransform(scrollYProgress, [0, 1], [0, 100]) + '%',
                    opacity: useTransform(scrollYProgress, [0, 0.1], [0, 1])
                }}
            />

            <div className="container mx-auto relative z-10">
                {/* Header with Text Reveal */}
                <motion.div 
                    className="text-center mb-16"
                    initial={{ opacity: 0, y: -40 }}
                    animate={isVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: -40 }}
                    transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                >
                    <motion.div
                        variants={badgeVariants}
                        initial="hidden"
                        animate={isVisible ? "visible" : "hidden"}
                        className="inline-flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full text-white text-sm font-medium mb-5"
                    >
                        <Sparkles size={16} />
                        <span>Premium Collections</span>
                    </motion.div>
                    
                    <motion.h2 
                        variants={textRevealVariants}
                        initial="hidden"
                        animate={isVisible ? "visible" : "hidden"}
                        className="text-4xl md:text-6xl font-light text-gray-800 mb-4"
                    >
                        Explore Our
                        <span className="block md:inline font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                            {" "}Collections
                        </span>
                    </motion.h2>
                    
                    <motion.div 
                        variants={textRevealVariants}
                        initial="hidden"
                        animate={isVisible ? "visible" : "hidden"}
                        className="w-24 h-1 bg-gradient-to-r from-blue-600 to-purple-600 mx-auto mb-4 rounded-full"
                    />
                    
                    <motion.p 
                        variants={textRevealVariants}
                        initial="hidden"
                        animate={isVisible ? "visible" : "hidden"}
                        className="text-lg text-gray-500 max-w-2xl mx-auto"
                    >
                        Discover our premium collections crafted with exceptional quality and style
                    </motion.p>
                </motion.div>

                {/* Collections Grid with Image Reveal */}
                <motion.div 
                    className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-7xl mx-auto"
                    variants={containerVariants}
                    initial="hidden"
                    animate={isVisible ? "visible" : "hidden"}
                >
                    {collections.map((collection, index) => {
                        const Icon = collection.icon;
                        const isHovered = hoveredIndex === index;
                        const imageY = index === 0 ? y1 : index === 1 ? y2 : y3;

                        return (
                            <motion.div 
                                key={index}
                                className="relative group cursor-pointer perspective-1000"
                                variants={cardVariants}
                                whileHover="hover"
                                onHoverStart={() => setHoveredIndex(index)}
                                onHoverEnd={() => setHoveredIndex(null)}
                                onClick={() => handleShopClick(collection.gender)}
                            >
                                <div className="relative overflow-hidden rounded-3xl shadow-2xl h-[520px] preserve-3d transition-all duration-500">
                                    {/* Image with Scroll Parallax & Reveal */}
                                    <motion.div 
                                        className="absolute inset-0 overflow-hidden"
                                        style={{
                                            y: imageY,
                                        }}
                                    >
                                        <motion.img 
                                            src={collection.image} 
                                            alt={collection.name} 
                                            className="w-full h-full object-cover"
                                            variants={imageVariants}
                                            whileHover={{ scale: 1.15 }}
                                            transition={{ duration: 0.7 }}
                                        />
                                    </motion.div>

                                    {/* Overlay with scroll opacity */}
                                    <motion.div 
                                        className={`absolute inset-0 bg-gradient-to-t ${collection.color} to-transparent opacity-60`}
                                        style={{
                                            opacity: useTransform(scrollYProgress, [0, 0.3], [0.7, 0.5])
                                        }}
                                        animate={{
                                            opacity: isHovered ? 0.8 : 0.5,
                                        }}
                                        transition={{ duration: 0.3 }}
                                    />

                                    {/* Dark overlay for text readability */}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                                    {/* Badge with Scroll Animation */}
                                    <motion.div
                                        variants={badgeVariants}
                                        className="absolute top-6 left-6 z-10"
                                    >
                                        <div className="flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-md rounded-full border border-white/20">
                                            <Icon size={14} className="text-white" />
                                            <span className="text-white text-xs font-medium tracking-wider">
                                                {collection.badge}
                                            </span>
                                        </div>
                                    </motion.div>

                                    {/* Stats Badge with Scroll Animation */}
                                    <motion.div
                                        initial={{ opacity: 0, x: 30 }}
                                        animate={isVisible ? { opacity: 1, x: 0 } : { opacity: 0, x: 30 }}
                                        transition={{ duration: 0.6, delay: 0.7 + (index * 0.1) }}
                                        className="absolute top-6 right-6 z-10"
                                    >
                                        <div className="px-3 py-1.5 bg-black/50 backdrop-blur-sm rounded-full border border-white/10">
                                            <span className="text-white text-xs font-medium">
                                                {collection.stats}
                                            </span>
                                        </div>
                                    </motion.div>

                                    {/* Content with Scroll Animation */}
                                    <motion.div 
                                        className="absolute bottom-0 left-0 right-0 p-8 z-10"
                                        variants={contentVariants}
                                    >
                                        <motion.div 
                                            className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/10"
                                            whileHover={{
                                                backgroundColor: "rgba(255,255,255,0.2)",
                                                transition: { duration: 0.3 }
                                            }}
                                        >
                                            <motion.h3 
                                                variants={textRevealVariants}
                                                className="text-2xl md:text-3xl font-bold text-white mb-2"
                                            >
                                                {collection.name}
                                            </motion.h3>
                                            
                                            <motion.p 
                                                variants={textRevealVariants}
                                                className="text-white/80 text-sm mb-4"
                                            >
                                                {collection.description}
                                            </motion.p>
                                            
                                            <motion.button 
                                                className="group w-full flex items-center justify-center gap-3 px-6 py-3.5 bg-white text-gray-900 rounded-xl font-semibold hover:bg-gray-50 transition-all duration-300 relative overflow-hidden"
                                                variants={buttonVariants}
                                                whileHover="hover"
                                                whileTap="tap"
                                            >
                                                <span className="relative z-10">Shop Now</span>
                                                <ArrowRight 
                                                    size={18} 
                                                    className="relative z-10 group-hover:translate-x-1 transition-transform duration-300" 
                                                />
                                                <motion.div
                                                    className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10"
                                                    initial={{ x: '-100%' }}
                                                    whileHover={{ x: '100%' }}
                                                    transition={{ duration: 0.6 }}
                                                />
                                            </motion.button>
                                        </motion.div>
                                    </motion.div>

                                    {/* Hover Glow Effect */}
                                    {isHovered && (
                                        <motion.div
                                            className="absolute inset-0 pointer-events-none"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                        >
                                            <div className={`absolute inset-0 bg-gradient-to-r ${collection.color} opacity-20 blur-3xl`} />
                                        </motion.div>
                                    )}
                                </div>
                            </motion.div>
                        );
                    })}
                </motion.div>

                {/* Bottom Decorative Element with Scroll Animation */}
                <motion.div 
                    className="mt-16 flex justify-center"
                    initial={{ opacity: 0, scale: 0 }}
                    animate={isVisible ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0 }}
                    transition={{ duration: 0.6, delay: 0.9 }}
                >
                    <div className="flex items-center gap-4">
                        <motion.div 
                            className="w-16 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"
                            initial={{ scaleX: 0 }}
                            animate={isVisible ? { scaleX: 1 } : { scaleX: 0 }}
                            transition={{ duration: 0.6, delay: 0.8 }}
                        />
                        <div className="flex items-center gap-2">
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                            >
                                <Sparkles size={16} className="text-gray-400" />
                            </motion.div>
                            <motion.span
                                initial={{ opacity: 0 }}
                                animate={isVisible ? { opacity: 1 } : { opacity: 0 }}
                                transition={{ duration: 0.4, delay: 0.9 }}
                                className="text-xs text-gray-400 tracking-widest uppercase"
                            >
                                Scroll to Explore
                            </motion.span>
                            <motion.div
                                animate={{ y: [0, 5, 0] }}
                                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                            >
                                <ChevronDown size={16} className="text-gray-400" />
                            </motion.div>
                        </div>
                        <motion.div 
                            className="w-16 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"
                            initial={{ scaleX: 0 }}
                            animate={isVisible ? { scaleX: 1 } : { scaleX: 0 }}
                            transition={{ duration: 0.6, delay: 0.8 }}
                        />
                    </div>
                </motion.div>
            </div>
        </section>
    );
};

export default GenderCollectionSection;