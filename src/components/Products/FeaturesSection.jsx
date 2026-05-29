import { motion } from "framer-motion";
import { Truck, Shield, RefreshCw, Headphones, Award, Clock } from "lucide-react";

const FeaturesSection = () => {
    const features = [
        { icon: Truck, title: "Free Shipping", description: "On orders over $100", color: "from-blue-500" },
        { icon: Shield, title: "Secure Payment", description: "100% secure transactions", color: "from-green-500" },
        { icon: RefreshCw, title: "Easy Returns", description: "30-day return policy", color: "from-yellow-500" },
        { icon: Headphones, title: "24/7 Support", description: "Dedicated customer support", color: "from-purple-500" },
        { icon: Award, title: "Premium Quality", description: "Best materials used", color: "from-red-500" },
        { icon: Clock, title: "Fast Delivery", description: "2-3 business days", color: "from-indigo-500" }
    ];

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.1, delayChildren: 0.2 }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, scale: 0.5, rotate: -180 },
        visible: { 
            opacity: 1, 
            scale: 1, 
            rotate: 0,
            transition: { duration: 0.5, type: "spring" }
        },
        hover: { 
            scale: 1.05,
            transition: { duration: 0.3 }
        }
    };

    return (
        <div className="bg-gradient-to-br from-gray-50 to-white py-16">
            <div className="container mx-auto px-4">
                <motion.h2 
                    className="text-3xl md:text-4xl font-bold text-center mb-12"
                    initial={{ opacity: 0, y: -30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    viewport={{ once: true }}
                >
                    Why Choose{" "}
                    <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                        Us
                    </span>
                </motion.h2>
                
                <motion.div 
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
                    variants={containerVariants}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, amount: 0.3 }}
                >
                    {features.map((feature, index) => (
                        <motion.div 
                            key={index}
                            variants={itemVariants}
                            whileHover="hover"
                            className="text-center group cursor-pointer"
                        >
                            <div className={`w-20 h-20 bg-gradient-to-br ${feature.color} to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg group-hover:shadow-xl transition-all`}>
                                <feature.icon className="w-10 h-10 text-white" />
                            </div>
                            <h3 className="font-bold text-xl mb-2 text-gray-800">{feature.title}</h3>
                            <p className="text-gray-600 text-sm">{feature.description}</p>
                        </motion.div>
                    ))}
                </motion.div>

                {/* Trust Badge */}
                <motion.div 
                    className="mt-16 text-center"
                    initial={{ opacity: 0, y: 50 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.5 }}
                    viewport={{ once: true }}
                >
                    <div className="inline-flex items-center space-x-4 bg-white px-6 py-3 rounded-full shadow-md">
                        <span className="text-2xl">⭐</span>
                        <span className="font-semibold">Trusted by 10,000+ Customers</span>
                        <span className="text-2xl">⭐</span>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default FeaturesSection;