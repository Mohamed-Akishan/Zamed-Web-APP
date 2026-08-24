// src/components/Layout/Hero.jsx
import { Link } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, Pause, Play, ArrowRight } from "lucide-react";
import { useSite } from "../../context/SiteContext";
import { motion, AnimatePresence } from "framer-motion";

const Hero = () => {
    const { siteInfo } = useSite();
    const [currentSlide, setCurrentSlide] = useState(0);
    const [isAutoPlaying, setIsAutoPlaying] = useState(true);
    const [touchStart, setTouchStart] = useState(0);
    const [touchEnd, setTouchEnd] = useState(0);
    const [slides, setSlides] = useState([]);
    const [loading, setLoading] = useState(true);
    const [progress, setProgress] = useState(0);
    const [imageLoaded, setImageLoaded] = useState({});
    const [loadedImages, setLoadedImages] = useState({});
    
    const heroRef = useRef(null);

    // ============================================================
    // FIX: Load slides from localStorage (Cloudinary URLs)
    // ============================================================
    const loadSlides = async () => {
        setLoading(true);
        try {
            // Get data from localStorage (Cloudinary URLs)
            const siteInfoData = JSON.parse(localStorage.getItem('site_info') || '{}');
            const savedImages = JSON.parse(localStorage.getItem('site_images') || '{}');
            const siteSettings = JSON.parse(localStorage.getItem('site_settings') || '{}');
            
            let slidesData = siteInfoData.slides || 
                            siteInfo?.slides || 
                            siteSettings.slides || 
                            [];
            
            // Also try to get slides from auth settings
            if (!slidesData || slidesData.length === 0) {
                const authSlides = siteInfoData.authSettings?.slides || [];
                if (authSlides.length > 0) {
                    slidesData = authSlides;
                }
            }

            // Process slides with images
            const slidesWithImages = slidesData.map((slide, index) => {
                let imageData = null;
                
                // 1. Use direct Cloudinary URL from slide
                if (slide.image && typeof slide.image === 'string' && 
                    (slide.image.startsWith('http') || slide.image.startsWith('https') || slide.image.startsWith('data:'))) {
                    imageData = slide.image;
                    console.log(`✅ Slide ${index} image loaded from direct URL`);
                }
                
                // 2. Check savedImages
                if (!imageData && savedImages?.slides) {
                    const savedSlide = savedImages.slides.find(s => s.id === slide.id);
                    if (savedSlide && savedSlide.image) {
                        imageData = savedSlide.image;
                        console.log(`✅ Slide ${index} image loaded from savedImages`);
                    }
                }
                
                // 3. Check slide imageId (for legacy support)
                if (!imageData && slide.imageId) {
                    // Try to get from savedImages by imageId
                    if (savedImages?.slides) {
                        const savedSlide = savedImages.slides.find(s => s.imageId === slide.imageId);
                        if (savedSlide && savedSlide.image) {
                            imageData = savedSlide.image;
                            console.log(`✅ Slide ${index} image loaded via imageId`);
                        }
                    }
                }
                
                // 4. Fallback: use slide.image as is
                if (!imageData && slide.image) {
                    imageData = slide.image;
                }
                
                // Validate image data
                if (imageData && typeof imageData === 'string') {
                    if (imageData.startsWith('data:image') || 
                        imageData.startsWith('http') ||
                        imageData.startsWith('https')) {
                        // Valid image
                    } else {
                        imageData = null;
                    }
                } else {
                    imageData = null;
                }
                
                return {
                    ...slide,
                    image: imageData || null,
                    imageId: slide.imageId || null
                };
            });
            
            // Filter active slides
            const activeSlides = slidesWithImages.filter(s => s.active !== false);
            const finalSlides = activeSlides.length > 0 ? activeSlides : slidesWithImages;
            
            // Preload images
            finalSlides.forEach((slide, index) => {
                if (slide.image) {
                    const img = new Image();
                    img.onload = () => {
                        setLoadedImages(prev => ({ ...prev, [index]: true }));
                        console.log(`✅ Slide ${index} image preloaded successfully`);
                    };
                    img.onerror = () => {
                        console.warn(`⚠️ Failed to preload slide ${index} image`);
                    };
                    img.src = slide.image;
                }
            });
            
            setSlides(finalSlides);
            console.log(`✅ Loaded ${finalSlides.length} slides`);
        } catch (error) {
            console.error('Error loading slides:', error);
            // Fallback to default slides
            setSlides([
                {
                    id: 1,
                    title: "Zamed Premium Collection",
                    subtitle: "Discover the latest fashion trends",
                    buttonText: "Shop Now",
                    buttonLink: "/collections/all",
                    color: "from-blue-600",
                    active: true,
                    image: null,
                    badge: "Zamed Premium"
                }
            ]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadSlides();
        
        const handleUpdate = () => {
            loadSlides();
        };
        
        window.addEventListener('storage', handleUpdate);
        window.addEventListener('siteInfoUpdated', handleUpdate);
        window.addEventListener('settingsSaved', handleUpdate);
        window.addEventListener('siteImagesUpdated', handleUpdate);
        window.addEventListener('heroSlidesUpdated', handleUpdate);
        
        return () => {
            window.removeEventListener('storage', handleUpdate);
            window.removeEventListener('siteInfoUpdated', handleUpdate);
            window.removeEventListener('settingsSaved', handleUpdate);
            window.removeEventListener('siteImagesUpdated', handleUpdate);
            window.removeEventListener('heroSlidesUpdated', handleUpdate);
        };
    }, [siteInfo]);

    // Progress bar animation
    useEffect(() => {
        if (isAutoPlaying && slides.length > 1) {
            setProgress(0);
            const interval = setInterval(() => {
                setProgress(prev => {
                    if (prev >= 100) {
                        clearInterval(interval);
                        return 100;
                    }
                    return prev + 0.5;
                });
            }, 25);
            
            const timeout = setTimeout(() => {
                setCurrentSlide((prev) => (prev + 1) % slides.length);
                setProgress(0);
            }, 5000);
            
            return () => {
                clearInterval(interval);
                clearTimeout(timeout);
            };
        }
    }, [isAutoPlaying, currentSlide, slides.length]);

    const changeSlide = (newIndex) => {
        setCurrentSlide(newIndex);
        setProgress(0);
        setIsAutoPlaying(false);
        setTimeout(() => setIsAutoPlaying(true), 8000);
    };

    const nextSlide = () => {
        changeSlide((currentSlide + 1) % slides.length);
    };

    const prevSlide = () => {
        changeSlide((currentSlide - 1 + slides.length) % slides.length);
    };

    const handleTouchStart = (e) => {
        setTouchStart(e.targetTouches[0].clientX);
    };

    const handleTouchMove = (e) => {
        setTouchEnd(e.targetTouches[0].clientX);
    };

    const handleTouchEnd = () => {
        if (touchStart - touchEnd > 50) {
            nextSlide();
        }
        if (touchStart - touchEnd < -50) {
            prevSlide();
        }
    };

    const toggleAutoPlay = () => {
        setIsAutoPlaying(!isAutoPlaying);
    };

    const handleImageLoad = (index) => {
        setImageLoaded(prev => ({ ...prev, [index]: true }));
    };

    if (loading) {
        return (
            <div className="relative w-full h-screen flex items-center justify-center bg-white" style={{ marginTop: 0 }}>
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-gray-200 border-t-black rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-400">Loading...</p>
                </div>
            </div>
        );
    }

    if (slides.length === 0) {
        return (
            <div className="relative w-full h-screen flex items-center justify-center bg-white overflow-hidden" style={{ marginTop: 0 }}>
                <div className="absolute inset-0 bg-gradient-to-br from-gray-50 via-white to-gray-50" />
                <div className="relative z-10 text-center px-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.8 }}
                        className="inline-block mb-6"
                    >
                        <div className="w-20 h-20 bg-black rounded-2xl flex items-center justify-center mx-auto">
                            <span className="text-white font-bold text-3xl">Z</span>
                        </div>
                    </motion.div>
                    <motion.h1 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                        className="text-4xl md:text-7xl font-light text-gray-900 mb-4"
                    >
                        Zamed
                    </motion.h1>
                    <motion.p 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.4 }}
                        className="text-base md:text-xl text-gray-500 mb-8"
                    >
                        Premium Fashion Collection
                    </motion.p>
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.6 }}
                    >
                        <Link 
                            to="/collections/all" 
                            className="inline-flex items-center gap-2 px-6 md:px-8 py-3 bg-black text-white rounded-full font-medium hover:bg-gray-800 transition-all duration-300"
                        >
                            Explore Collection <ArrowRight size={18} />
                        </Link>
                    </motion.div>
                </div>
            </div>
        );
    }

    return (
        <div 
            ref={heroRef}
            className="relative w-full overflow-hidden bg-black"
            style={{ 
                height: '100vh', 
                maxHeight: '100vh', 
                marginTop: 0,
                paddingTop: 0
            }}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
        >
            {/* Slides */}
            <AnimatePresence mode="wait">
                {slides.map((slide, index) => {
                    if (index !== currentSlide) return null;
                    const image = slide.image || null;
                    const isImageLoaded = imageLoaded[index] || loadedImages[index];

                    return (
                        <motion.div
                            key={slide.id || index}
                            className="absolute inset-0"
                            initial={{ opacity: 0, scale: 1.05 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 1.05 }}
                            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                        >
                            {/* Background Image */}
                            <div className="absolute inset-0 w-full h-full">
                                {image ? (
                                    <>
                                        <img
                                            src={image}
                                            alt={slide.title || 'Slide'}
                                            className="w-full h-full object-cover object-center"
                                            style={{
                                                width: '100%',
                                                height: '100%',
                                                objectFit: 'cover',
                                                objectPosition: slide.imagePosition || slide.objectPosition || 'center center',
                                                imageRendering: 'auto',
                                                display: 'block',
                                            }}
                                            decoding="async"
                                            fetchpriority={index === 0 ? "high" : "auto"}
                                            loading={index === 0 ? "eager" : "lazy"}
                                            onLoad={() => handleImageLoad(index)}
                                            onError={(e) => {
                                                console.warn('Image failed to load, using fallback:', index);
                                                e.target.style.display = 'none';
                                                const parent = e.target.parentElement;
                                                if (parent) {
                                                    parent.className = `w-full h-full bg-gradient-to-r ${slide.color || 'from-gray-900 to-gray-700'}`;
                                                }
                                            }}
                                        />
                                        {/* Gradient overlay for better text readability */}
                                        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/20 to-black/60" />
                                        <div className="absolute inset-0 bg-gradient-to-r from-black/40 to-transparent" />
                                    </>
                                ) : (
                                    <div className={`w-full h-full bg-gradient-to-r ${slide.color || 'from-gray-900 to-gray-700'}`}>
                                        <div className="absolute inset-0 bg-black/30" />
                                        <div className="absolute inset-0 opacity-5" style={{
                                            backgroundImage: `radial-gradient(circle at 20% 50%, white 1px, transparent 1px)`,
                                            backgroundSize: '40px 40px'
                                        }} />
                                    </div>
                                )}
                            </div>

                            {/* Content */}
                            <div className="relative h-full flex items-center">
                                <div className="container mx-auto px-4 sm:px-6">
                                    <div className="max-w-3xl">
                                        <motion.div
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ duration: 0.6, delay: 0.2 }}
                                            className="mb-3 md:mb-4"
                                        >
                                            <span className="inline-block px-3 md:px-4 py-1 md:py-1.5 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full text-white/80 text-xs md:text-sm font-medium">
                                                {slide.badge || "Zamed Premium"}
                                            </span>
                                        </motion.div>

                                        <motion.h1 
                                            className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-light text-white leading-[1.1] mb-3 md:mb-6"
                                            initial={{ opacity: 0, y: 30 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ duration: 0.8, delay: 0.3 }}
                                        >
                                            {slide.title}
                                        </motion.h1>

                                        <motion.p 
                                            className="text-sm sm:text-base md:text-lg lg:text-xl text-white/80 max-w-lg mb-6 md:mb-8"
                                            initial={{ opacity: 0, y: 30 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ duration: 0.8, delay: 0.4 }}
                                        >
                                            {slide.subtitle}
                                        </motion.p>

                                        <motion.div 
                                            className="flex flex-col sm:flex-row gap-3 md:gap-4"
                                            initial={{ opacity: 0, y: 30 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ duration: 0.8, delay: 0.5 }}
                                        >
                                            <Link
                                                to={slide.buttonLink || "/collections/all"}
                                                className="inline-flex items-center justify-center gap-2 px-6 md:px-8 py-3 md:py-3.5 bg-white text-black rounded-full font-medium text-sm md:text-base hover:bg-gray-100 transition-all duration-300 min-h-[44px] group"
                                            >
                                                {slide.buttonText || "Shop Now"}
                                                <ArrowRight size={16} className="md:w-[18px] md:h-[18px] group-hover:translate-x-1 transition-transform" />
                                            </Link>
                                            
                                            <Link
                                                to="/collections/all"
                                                className="inline-flex items-center justify-center px-6 md:px-8 py-3 md:py-3.5 border border-white/30 text-white rounded-full font-medium text-sm md:text-base hover:bg-white/10 transition-all duration-300 min-h-[44px]"
                                            >
                                                View All
                                            </Link>
                                        </motion.div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    );
                })}
            </AnimatePresence>

            {/* Navigation Controls - Always visible */}
            {slides.length > 1 && (
                <>
                    {/* Previous Button */}
                    <button 
                        onClick={prevSlide} 
                        className="absolute left-2 sm:left-4 md:left-6 top-1/2 transform -translate-y-1/2 z-30 w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-full bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 transition-all duration-300 border border-white/10 shadow-lg"
                        aria-label="Previous slide"
                    >
                        <ChevronLeft size={18} className="sm:w-5 sm:h-5" />
                    </button>
                    
                    {/* Next Button */}
                    <button 
                        onClick={nextSlide} 
                        className="absolute right-2 sm:right-4 md:right-6 top-1/2 transform -translate-y-1/2 z-30 w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-full bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 transition-all duration-300 border border-white/10 shadow-lg"
                        aria-label="Next slide"
                    >
                        <ChevronRight size={18} className="sm:w-5 sm:h-5" />
                    </button>

                    {/* Bottom Controls */}
                    <div className="absolute bottom-4 sm:bottom-6 md:bottom-8 left-0 right-0 z-30">
                        <div className="container mx-auto px-4">
                            <div className="flex items-center justify-between">
                                {/* Progress Bar */}
                                <div className="hidden sm:block flex-1 max-w-xs">
                                    <div className="h-[2px] bg-white/20 rounded-full overflow-hidden">
                                        <motion.div 
                                            className="h-full bg-white"
                                            initial={{ width: 0 }}
                                            animate={{ width: `${progress}%` }}
                                            transition={{ duration: 0.1 }}
                                        />
                                    </div>
                                </div>

                                {/* Controls */}
                                <div className="flex items-center gap-2 sm:gap-4 mx-auto sm:mx-0">
                                    {/* Auto-play Toggle */}
                                    <button 
                                        onClick={toggleAutoPlay} 
                                        className="text-white/60 hover:text-white transition-colors p-1"
                                        aria-label={isAutoPlaying ? 'Pause' : 'Play'}
                                    >
                                        {isAutoPlaying ? <Pause size={16} className="sm:w-[18px] sm:h-[18px]" /> : <Play size={16} className="sm:w-[18px] sm:h-[18px]" />}
                                    </button>

                                    {/* Dot Indicators */}
                                    <div className="flex gap-1.5 sm:gap-2">
                                        {slides.map((_, index) => (
                                            <button
                                                key={index}
                                                onClick={() => changeSlide(index)}
                                                className={`transition-all duration-300 rounded-full ${
                                                    currentSlide === index
                                                        ? 'w-6 sm:w-8 h-1.5 sm:h-2 bg-white'
                                                        : 'w-1.5 sm:w-2 h-1.5 sm:h-2 bg-white/30 hover:bg-white/50'
                                                }`}
                                                aria-label={`Go to slide ${index + 1}`}
                                            />
                                        ))}
                                    </div>

                                    {/* Slide Counter */}
                                    <span className="text-white/60 text-xs sm:text-sm font-mono tabular-nums">
                                        {String(currentSlide + 1).padStart(2, '0')} / {String(slides.length).padStart(2, '0')}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* Scroll Indicator */}
            <div className="absolute bottom-16 sm:bottom-20 left-1/2 transform -translate-x-1/2 z-30 hidden md:block">
                <div className="flex flex-col items-center gap-1 text-white/30 text-[10px] tracking-widest uppercase">
                    <span>Scroll</span>
                    <motion.div
                        animate={{ y: [0, 6, 0] }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                        </svg>
                    </motion.div>
                </div>
            </div>
        </div>
    );
};

export default Hero;