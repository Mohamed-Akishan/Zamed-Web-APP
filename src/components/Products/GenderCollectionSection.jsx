// src/components/Products/GenderCollectionSection.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

const GenderCollectionSection = () => {
    const navigate = useNavigate();

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
            image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600&h=500&fit=crop", 
            color: "from-blue-600",
            description: "Sophisticated styles for the modern gentleman"
        },
        { 
            name: "Women's Collection", 
            gender: "women", 
            image: "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=600&h=500&fit=crop", 
            color: "from-pink-600",
            description: "Elegant designs that celebrate femininity"
        },
        { 
            name: "Kids Collection", 
            gender: "kids", 
            image: "https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?w=600&h=500&fit=crop", 
            color: "from-green-600",
            description: "Adorable outfits for your little ones"
        }
    ];

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.3, delayChildren: 0.2 }
        }
    };

    const cardVariants = {
        hidden: { opacity: 0, y: 50, scale: 0.9 },
        visible: { 
            opacity: 1, 
            y: 0, 
            scale: 1,
            transition: { duration: 0.6, type: "spring", stiffness: 100 }
        },
        hover: { 
            scale: 1.05,
            y: -10,
            transition: { duration: 0.3 }
        }
    };

    return (
        <section className="py-20 px-4 bg-gradient-to-b from-white to-gray-50 overflow-hidden">
            <div className="container mx-auto">
                <motion.div 
                    className="text-center mb-12"
                    initial={{ opacity: 0, y: -30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    viewport={{ once: true }}
                >
                    <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-4">
                        Explore Collections
                    </h2>
                    <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                        Discover our premium collections crafted with exceptional quality and style
                    </p>
                </motion.div>

                <motion.div 
                    className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-6xl mx-auto"
                    variants={containerVariants}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, amount: 0.3 }}
                >
                    {collections.map((collection, index) => (
                        <motion.div 
                            key={index}
                            className="relative group overflow-hidden rounded-2xl shadow-xl cursor-pointer"
                            variants={cardVariants}
                            whileHover="hover"
                            onClick={() => handleShopClick(collection.gender)}
                        >
                            <div className="relative overflow-hidden h-96">
                                <motion.img 
                                    src={collection.image} 
                                    alt={collection.name} 
                                    className="w-full h-full object-cover"
                                    whileHover={{ scale: 1.1 }}
                                    transition={{ duration: 0.5 }}
                                />
                                <div className={`absolute inset-0 bg-gradient-to-t ${collection.color} to-transparent opacity-70`}></div>
                            </div>
                            
                            <motion.div 
                                className="absolute bottom-0 left-0 right-0 p-6 transform transition-all duration-500"
                                initial={{ y: 20, opacity: 0 }}
                                whileInView={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.2 }}
                            >
                                <div className="bg-white/95 backdrop-blur-sm rounded-xl p-5 shadow-xl">
                                    <h3 className="text-2xl font-bold text-gray-900 mb-2">{collection.name}</h3>
                                    <p className="text-gray-600 text-sm mb-4">{collection.description}</p>
                                    <motion.button 
                                        className="w-full bg-gradient-to-r from-gray-900 to-gray-800 text-white px-6 py-3 rounded-lg font-semibold"
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                    >
                                        Shop Now →
                                    </motion.button>
                                </div>
                            </motion.div>
                        </motion.div>
                    ))}
                </motion.div>
            </div>
        </section>
    );
};

export default GenderCollectionSection;