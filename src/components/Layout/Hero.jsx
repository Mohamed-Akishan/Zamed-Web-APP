// src/components/Layout/Hero.jsx
import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";

const Hero = () => {
    const [slides, setSlides] = useState([]);
    const [currentSlide, setCurrentSlide] = useState(0);
    const [isAutoPlaying, setIsAutoPlaying] = useState(true);
    const [touchStart, setTouchStart] = useState(0);
    const [touchEnd, setTouchEnd] = useState(0);
    const [animationKey, setAnimationKey] = useState(0);

    const loadSlides = () => {
        const siteInfo = JSON.parse(localStorage.getItem('site_info') || '{}');
        const siteSettings = JSON.parse(localStorage.getItem('site_settings') || '{}');
        const allSlides = siteInfo.slides || siteSettings.slides || [];
        
        if (allSlides.length > 0) {
            setSlides(allSlides);
        } else {
            setSlides([
                {
                    id: 1,
                    title: "Zamed Premium Collection",
                    subtitle: "Discover the latest fashion trends",
                    buttonText: "Shop Now",
                    buttonLink: "/collections/all",
                    image: null,
                    color: "from-blue-600"
                },
                {
                    id: 2,
                    title: "Men's Premium Collection",
                    subtitle: "Elevate your style with our new arrivals",
                    buttonText: "Explore Men",
                    buttonLink: "/collections/men",
                    image: null,
                    color: "from-gray-800"
                },
                {
                    id: 3,
                    title: "Women's Elegant Collection",
                    subtitle: "Timeless pieces for every occasion",
                    buttonText: "Explore Women",
                    buttonLink: "/collections/women",
                    image: null,
                    color: "from-pink-600"
                }
            ]);
        }
    };

    useEffect(() => {
        loadSlides();
        
        const handleUpdate = () => {
            console.log("Hero received update");
            loadSlides();
            setAnimationKey(prev => prev + 1);
        };
        
        window.addEventListener('storage', handleUpdate);
        window.addEventListener('siteInfoUpdated', handleUpdate);
        window.addEventListener('settingsSaved', handleUpdate);
        window.addEventListener('adminSettingsSaved', handleUpdate);
        
        return () => {
            window.removeEventListener('storage', handleUpdate);
            window.removeEventListener('siteInfoUpdated', handleUpdate);
            window.removeEventListener('settingsSaved', handleUpdate);
            window.removeEventListener('adminSettingsSaved', handleUpdate);
        };
    }, []);

    useEffect(() => {
        let interval;
        if (isAutoPlaying && slides.length > 0) {
            interval = setInterval(() => {
                changeSlide((currentSlide + 1) % slides.length);
            }, 5000);
        }
        return () => clearInterval(interval);
    }, [isAutoPlaying, slides.length, currentSlide]);

    const changeSlide = (newIndex) => {
        setCurrentSlide(newIndex);
        setAnimationKey(prev => prev + 1);
    };

    const nextSlide = () => {
        changeSlide((currentSlide + 1) % slides.length);
        setIsAutoPlaying(false);
        setTimeout(() => setIsAutoPlaying(true), 10000);
    };

    const prevSlide = () => {
        changeSlide((currentSlide - 1 + slides.length) % slides.length);
        setIsAutoPlaying(false);
        setTimeout(() => setIsAutoPlaying(true), 10000);
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

    if (slides.length === 0) return null;

    return (
        <div 
            className="relative h-screen overflow-hidden"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
        >
            {slides.map((slide, index) => (
                <div
                    key={`${slide.id}-${animationKey}`}
                    className={`absolute inset-0 transition-all duration-700 ease-in-out ${
                        index === currentSlide 
                            ? 'opacity-100 scale-100 z-10' 
                            : 'opacity-0 scale-105 z-0'
                    }`}
                >
                    <div className="absolute inset-0">
                        {slide.image ? (
                            <img 
                                src={slide.image} 
                                alt={slide.title}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className={`w-full h-full bg-gradient-to-r ${slide.color} to-purple-600`} />
                        )}
                        <div className="absolute inset-0 bg-black bg-opacity-40" />
                    </div>
                    
                    <div className="relative h-full flex items-center z-20">
                        <div className="container mx-auto px-4">
                            <div className="max-w-3xl mx-auto text-center">
                                <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 animate-fade-in-up">
                                    {slide.title}
                                </h1>
                                <p className="text-xl md:text-2xl text-white/90 mb-8 animate-fade-in-up animation-delay-200">
                                    {slide.subtitle}
                                </p>
                                <div className="animate-fade-in-up animation-delay-400">
                                    <Link 
                                        to={slide.buttonLink}
                                        className="inline-block bg-white text-gray-900 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-all transform hover:scale-105 shadow-lg"
                                    >
                                        {slide.buttonText} →
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ))}

            {slides.length > 1 && (
                <>
                    <button onClick={prevSlide} className="absolute left-4 top-1/2 transform -translate-y-1/2 z-30 bg-white/20 backdrop-blur-sm text-white p-3 rounded-full hover:bg-white/40 transition-all hover:scale-110">
                        <ChevronLeft size={28} />
                    </button>
                    <button onClick={nextSlide} className="absolute right-4 top-1/2 transform -translate-y-1/2 z-30 bg-white/20 backdrop-blur-sm text-white p-3 rounded-full hover:bg-white/40 transition-all hover:scale-110">
                        <ChevronRight size={28} />
                    </button>
                    <button onClick={toggleAutoPlay} className="absolute bottom-24 right-4 z-30 bg-black/50 backdrop-blur-sm text-white p-2 rounded-full hover:bg-black/70 transition-all">
                        {isAutoPlaying ? <Pause size={20} /> : <Play size={20} />}
                    </button>
                    <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-30 flex space-x-3">
                        {slides.map((_, index) => (
                            <button
                                key={index}
                                onClick={() => {
                                    changeSlide(index);
                                    setIsAutoPlaying(false);
                                    setTimeout(() => setIsAutoPlaying(true), 10000);
                                }}
                                className={`transition-all duration-300 rounded-full ${
                                    currentSlide === index 
                                        ? 'w-10 h-2.5 bg-white' 
                                        : 'w-2.5 h-2.5 bg-white/50 hover:bg-white/80'
                                }`}
                            />
                        ))}
                    </div>
                </>
            )}
        </div>
    );
};

export default Hero;