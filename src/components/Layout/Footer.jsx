// src/components/Layout/Footer.jsx
import { Link } from "react-router-dom";
import { FiPhoneCall, FiMail, FiMapPin, FiX, FiSend, FiTruck, FiClock, FiShield, FiCreditCard, FiGlobe, FiCheck } from "react-icons/fi";
import { FaFacebook, FaInstagram, FaTwitter } from "react-icons/fa";
import { useState, useEffect } from "react";
import { toast } from "sonner";

const Footer = () => {
    const [siteInfo, setSiteInfo] = useState({
        siteName: "Zamed Premium Wear",
        siteEmail: "support@zamed.com",
        sitePhone: "+94 77 061 6154",
        siteAddress: "Colombo, Sri Lanka",
        footerText: "© 2025, Zamed Premium Wear. All rights reserved.",
        logo: null,
        socialLinks: {
            facebook: "https://facebook.com/zamed",
            instagram: "https://instagram.com/zamed",
            twitter: "https://twitter.com/zamed"
        }
    });
    
    // Modal states
    const [activeModal, setActiveModal] = useState(null);
    const [contactForm, setContactForm] = useState({
        name: "",
        email: "",
        message: ""
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const loadData = () => {
        const savedInfo = JSON.parse(localStorage.getItem('site_info') || '{}');
        const savedSettings = JSON.parse(localStorage.getItem('site_settings') || '{}');
        const merged = { ...savedInfo, ...savedSettings };
        
        if (Object.keys(merged).length > 0) {
            setSiteInfo(prev => ({ ...prev, ...merged }));
        }
    };

    useEffect(() => {
        loadData();
        
        const handleUpdate = () => {
            loadData();
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

    const openModal = (modalName) => {
        setActiveModal(modalName);
        document.body.style.overflow = 'hidden';
    };

    const closeModal = () => {
        setActiveModal(null);
        document.body.style.overflow = 'unset';
        setContactForm({ name: "", email: "", message: "" });
    };

    const handleContactSubmit = (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        
        setTimeout(() => {
            toast.success("Thank you for your message! We'll get back to you soon.");
            setIsSubmitting(false);
            closeModal();
        }, 1500);
    };

    // Simple Modal without animations
    const Modal = ({ title, children, isOpen }) => {
        if (!isOpen) return null;
        
        return (
            <div 
                className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50"
                onClick={closeModal}
            >
                <div 
                    className="relative bg-white rounded-2xl w-full max-w-3xl max-h-[85vh] overflow-y-auto shadow-2xl"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-purple-600 p-4 flex justify-between items-center rounded-t-2xl">
                        <h2 className="text-xl font-bold text-white">{title}</h2>
                        <button 
                            onClick={closeModal}
                            className="p-2 hover:bg-white/20 rounded-full transition-colors text-white"
                        >
                            <FiX size={20} />
                        </button>
                    </div>
                    <div className="p-6">
                        {children}
                    </div>
                </div>
            </div>
        );
    };

    // Contact Us Modal Content
    const ContactModal = () => (
        <Modal title="Contact Us" isOpen={activeModal === 'contact'}>
            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg">
                        <FiPhoneCall className="text-blue-600" size={20} />
                        <div>
                            <p className="text-xs text-gray-500">Call Us</p>
                            <p className="font-semibold text-blue-700">{siteInfo.sitePhone}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-green-50 to-green-100 rounded-lg">
                        <FiMail className="text-green-600" size={20} />
                        <div>
                            <p className="text-xs text-gray-500">Email Us</p>
                            <p className="font-semibold text-green-700">{siteInfo.siteEmail}</p>
                        </div>
                    </div>
                </div>
                
                <div className="border-t pt-4">
                    <h3 className="font-semibold text-lg text-gray-800 mb-4">Send us a message</h3>
                    <form onSubmit={handleContactSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Your Name</label>
                            <input
                                type="text"
                                required
                                value={contactForm.name}
                                onChange={(e) => setContactForm({...contactForm, name: e.target.value})}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Enter your name"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                            <input
                                type="email"
                                required
                                value={contactForm.email}
                                onChange={(e) => setContactForm({...contactForm, email: e.target.value})}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                                placeholder="your@email.com"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                            <textarea
                                rows="4"
                                required
                                value={contactForm.message}
                                onChange={(e) => setContactForm({...contactForm, message: e.target.value})}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                                placeholder="How can we help you?"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-2 rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {isSubmitting ? (
                                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                            ) : (
                                <>
                                    <FiSend size={16} /> Send Message
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </Modal>
    );

    // FAQs Modal Content
    const FAQsModal = () => (
        <Modal title="Frequently Asked Questions" isOpen={activeModal === 'faqs'}>
            <div className="space-y-6">
                <div className="border-b pb-4">
                    <h3 className="font-semibold text-lg text-blue-700 mb-3">Orders & Shipping</h3>
                    <div className="space-y-3">
                        <div>
                            <p className="font-medium text-gray-800">How long does shipping take?</p>
                            <p className="text-gray-600 text-sm mt-1">Standard shipping takes 3-5 business days. Express shipping takes 1-2 business days.</p>
                        </div>
                        <div>
                            <p className="font-medium text-gray-800">Do you ship internationally?</p>
                            <p className="text-gray-600 text-sm mt-1">Yes, we ship worldwide. International delivery takes 7-14 business days.</p>
                        </div>
                        <div>
                            <p className="font-medium text-gray-800">How can I track my order?</p>
                            <p className="text-gray-600 text-sm mt-1">Once your order ships, you'll receive a tracking number via email. You can also track in your profile under "My Orders".</p>
                        </div>
                    </div>
                </div>
                
                <div className="border-b pb-4">
                    <h3 className="font-semibold text-lg text-green-700 mb-3">Returns & Exchanges</h3>
                    <div className="space-y-3">
                        <div>
                            <p className="font-medium text-gray-800">What is your return policy?</p>
                            <p className="text-gray-600 text-sm mt-1">We offer 30-day easy returns. Items must be unworn, unwashed, with original tags attached.</p>
                        </div>
                        <div>
                            <p className="font-medium text-gray-800">How do I initiate a return?</p>
                            <p className="text-gray-600 text-sm mt-1">Login to your account, go to "My Orders", select the order and click "Return Item".</p>
                        </div>
                        <div>
                            <p className="font-medium text-gray-800">Is return shipping free?</p>
                            <p className="text-gray-600 text-sm mt-1">Return shipping is free for defective items. For other returns, a small fee may apply.</p>
                        </div>
                    </div>
                </div>
                
                <div className="border-b pb-4">
                    <h3 className="font-semibold text-lg text-purple-700 mb-3">Payment & Security</h3>
                    <div className="space-y-3">
                        <div>
                            <p className="font-medium text-gray-800">What payment methods do you accept?</p>
                            <p className="text-gray-600 text-sm mt-1">We accept Credit/Debit cards Visa, Mastercard, Amex, PayPal, and Apple Pay.</p>
                        </div>
                        <div>
                            <p className="font-medium text-gray-800">Is my payment information secure?</p>
                            <p className="text-gray-600 text-sm mt-1">Yes, we use SSL encryption and never store your full payment details.</p>
                        </div>
                    </div>
                </div>
                
                <div>
                    <h3 className="font-semibold text-lg text-orange-700 mb-3">Products & Sizing</h3>
                    <div className="space-y-3">
                        <div>
                            <p className="font-medium text-gray-800">How do I find my size?</p>
                            <p className="text-gray-600 text-sm mt-1">Check our size guide on each product page. We also offer free size exchanges.</p>
                        </div>
                        <div>
                            <p className="font-medium text-gray-800">Are your products true to size?</p>
                            <p className="text-gray-600 text-sm mt-1">Most customers find our products true to size. Check individual product reviews for specific feedback.</p>
                        </div>
                    </div>
                </div>
                
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600 text-center">
                        Still have questions? <button onClick={() => { closeModal(); openModal('contact'); }} className="text-blue-600 font-semibold hover:underline">Contact us</button>
                    </p>
                </div>
            </div>
        </Modal>
    );

    // Shipping Info Modal Content
    const ShippingModal = () => (
        <Modal title="Shipping Information" isOpen={activeModal === 'shipping'}>
            <div className="space-y-6">
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-lg text-green-700 mb-2">Free Shipping Offer</h3>
                    <p className="text-gray-700">Enjoy free standard shipping on all orders over $100!</p>
                </div>
                
                <div>
                    <h3 className="font-semibold text-lg text-blue-700 mb-3">Shipping Options</h3>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center p-3 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg">
                            <div>
                                <p className="font-medium">Standard Shipping</p>
                                <p className="text-sm text-gray-500">3-5 business days</p>
                            </div>
                            <p className="font-semibold text-green-600">$5.00</p>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg">
                            <div>
                                <p className="font-medium">Express Shipping</p>
                                <p className="text-sm text-gray-500">1-2 business days</p>
                            </div>
                            <p className="font-semibold text-green-600">$15.00</p>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg">
                            <div>
                                <p className="font-medium">International Shipping</p>
                                <p className="text-sm text-gray-500">7-14 business days</p>
                            </div>
                            <p className="font-semibold text-green-600">$25.00</p>
                        </div>
                    </div>
                </div>
                
                <div>
                    <h3 className="font-semibold text-lg text-purple-700 mb-3">Shipping Locations</h3>
                    <p className="text-gray-600">We ship to over 50 countries worldwide including:</p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-3">
                        {["United States", "Canada", "United Kingdom", "Australia", "Germany", "France", "India", "Sri Lanka", "Singapore", "UAE"].map(country => (
                            <div key={country} className="flex items-center gap-2 text-sm text-gray-600">
                                <FiGlobe className="text-blue-500" size={12} /> {country}
                            </div>
                        ))}
                    </div>
                </div>
                
                <div className="bg-gradient-to-r from-yellow-50 to-amber-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-amber-700 mb-2">Important Notes</h3>
                    <ul className="text-sm text-gray-600 space-y-1">
                        <li className="flex items-center gap-2"><FiClock className="text-amber-500" size={14} /> Orders are processed within 24 hours</li>
                        <li className="flex items-center gap-2"><FiTruck className="text-amber-500" size={14} /> You'll receive a tracking number once shipped</li>
                        <li className="flex items-center gap-2"><FiShield className="text-amber-500" size={14} /> Customs fees may apply for international orders</li>
                    </ul>
                </div>
            </div>
        </Modal>
    );

    // Returns Policy Modal Content
    const ReturnsModal = () => (
        <Modal title="Returns Policy" isOpen={activeModal === 'returns'}>
            <div className="space-y-6">
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-lg text-blue-700 mb-2">30-Day Easy Returns</h3>
                    <p className="text-gray-700">We want you to love your purchase! If not, you have 30 days to return.</p>
                </div>
                
                <div>
                    <h3 className="font-semibold text-lg text-green-700 mb-3">Return Conditions</h3>
                    <ul className="space-y-2 text-gray-600">
                        <li className="flex items-start gap-2"><FiCheck className="text-green-500 mt-0.5" size={16} /> Items must be unworn and unwashed</li>
                        <li className="flex items-start gap-2"><FiCheck className="text-green-500 mt-0.5" size={16} /> Original tags must be attached</li>
                        <li className="flex items-start gap-2"><FiCheck className="text-green-500 mt-0.5" size={16} /> Returns accepted within 30 days of delivery</li>
                        <li className="flex items-start gap-2"><FiCheck className="text-green-500 mt-0.5" size={16} /> Proof of purchase required</li>
                    </ul>
                </div>
                
                <div>
                    <h3 className="font-semibold text-lg text-orange-700 mb-3">How to Return</h3>
                    <ol className="space-y-3 text-gray-600">
                        <li className="flex items-start gap-2">1. Login to your account and go to "My Orders"</li>
                        <li className="flex items-start gap-2">2. Select the order and click "Return Item"</li>
                        <li className="flex items-start gap-2">3. Print the return label (free for defective items)</li>
                        <li className="flex items-start gap-2">4. Pack the item securely and attach the label</li>
                        <li className="flex items-start gap-2">5. Drop off at your nearest shipping location</li>
                    </ol>
                </div>
                
                <div>
                    <h3 className="font-semibold text-lg text-purple-700 mb-3">Refund Process</h3>
                    <ul className="space-y-2 text-gray-600">
                        <li className="flex items-start gap-2"><FiCreditCard className="text-purple-500 mt-0.5" size={16} /> Refunds processed within 5-7 business days after return receipt</li>
                        <li className="flex items-start gap-2"><FiCreditCard className="text-purple-500 mt-0.5" size={16} /> Refund issued to original payment method</li>
                        <li className="flex items-start gap-2"><FiCreditCard className="text-purple-500 mt-0.5" size={16} /> Shipping fees are non-refundable unless item is defective</li>
                        <li className="flex items-start gap-2"><FiMail className="text-purple-500 mt-0.5" size={16} /> You'll receive email confirmation once refund is processed</li>
                    </ul>
                </div>
                
                <div className="bg-gradient-to-r from-red-50 to-pink-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-red-700 mb-2">Non-Returnable Items</h3>
                    <ul className="text-sm text-gray-600 space-y-1">
                        <li className="flex items-center gap-2">• Intimate apparel underwear, swimwear</li>
                        <li className="flex items-center gap-2">• Items with missing tags</li>
                        <li className="flex items-center gap-2">• Items with signs of wear or damage</li>
                        <li className="flex items-center gap-2">• Final sale items</li>
                    </ul>
                </div>
            </div>
        </Modal>
    );

    // Get current year
    const currentYear = new Date().getFullYear();
    
    // Get site name from settings or use default
    const displaySiteName = siteInfo.siteName || "Zamed Premium Wear";

    return (
        <>
            <footer className="bg-gray-900 text-white pt-12 pb-6">
                <div className="container mx-auto px-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
                        <div>
                            {siteInfo.logo ? (
                                <img src={siteInfo.logo} alt={siteInfo.siteName} className="h-12 mb-4" />
                            ) : (
                                <h3 className="text-xl font-bold mb-4 bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent">
                                    {displaySiteName}
                                </h3>
                            )}
                            <p className="text-gray-400 text-sm mb-4">
                                Premium fashion for the modern individual. Quality clothing that defines your style.
                            </p>
                            <div className="flex space-x-4">
                                {siteInfo.socialLinks?.facebook && (
                                    <a href={siteInfo.socialLinks.facebook} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-blue-500 transition-colors">
                                        <FaFacebook size={20} />
                                    </a>
                                )}
                                {siteInfo.socialLinks?.instagram && (
                                    <a href={siteInfo.socialLinks.instagram} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-pink-600 transition-colors">
                                        <FaInstagram size={20} />
                                    </a>
                                )}
                                {siteInfo.socialLinks?.twitter && (
                                    <a href={siteInfo.socialLinks.twitter} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-blue-400 transition-colors">
                                        <FaTwitter size={20} />
                                    </a>
                                )}
                            </div>
                        </div>

                        <div>
                            <h4 className="font-semibold mb-4 text-lg">Quick Links</h4>
                            <ul className="space-y-2">
                                <li><Link to="/collections/men" className="text-gray-400 hover:text-white transition-colors">Men's Collection</Link></li>
                                <li><Link to="/collections/women" className="text-gray-400 hover:text-white transition-colors">Women's Collection</Link></li>
                                <li><Link to="/collections/kids" className="text-gray-400 hover:text-white transition-colors">Kids Collection</Link></li>
                                <li><Link to="/collections/all" className="text-gray-400 hover:text-white transition-colors">All Products</Link></li>
                            </ul>
                        </div>

                        <div>
                            <h4 className="font-semibold mb-4 text-lg">Customer Service</h4>
                            <ul className="space-y-2">
                                <li>
                                    <button onClick={() => openModal('contact')} className="text-gray-400 hover:text-white transition-colors">
                                        Contact Us
                                    </button>
                                </li>
                                <li>
                                    <button onClick={() => openModal('faqs')} className="text-gray-400 hover:text-white transition-colors">
                                        FAQs
                                    </button>
                                </li>
                                <li>
                                    <button onClick={() => openModal('shipping')} className="text-gray-400 hover:text-white transition-colors">
                                        Shipping Info
                                    </button>
                                </li>
                                <li>
                                    <button onClick={() => openModal('returns')} className="text-gray-400 hover:text-white transition-colors">
                                        Returns Policy
                                    </button>
                                </li>
                            </ul>
                        </div>

                        <div>
                            <h4 className="font-semibold mb-4 text-lg">Contact Us</h4>
                            <ul className="space-y-3">
                                <li className="flex items-center space-x-3 text-gray-400">
                                    <FiPhoneCall className="text-blue-500" />
                                    <span>{siteInfo.sitePhone}</span>
                                </li>
                                <li className="flex items-center space-x-3 text-gray-400">
                                    <FiMail className="text-blue-500" />
                                    <span>{siteInfo.siteEmail}</span>
                                </li>
                                <li className="flex items-center space-x-3 text-gray-400">
                                    <FiMapPin className="text-blue-500" />
                                    <span>{siteInfo.siteAddress}</span>
                                </li>
                            </ul>
                        </div>
                    </div>

                    <div className="border-t border-gray-800 pt-6 text-center text-gray-400 text-sm">
                        <p>
                            © {currentYear},{" "}
                            <a 
                                href="https://akishan97.github.io/my_resume/?fbclid=IwVERDUARqCgJleHRuA2FlbQIxMABzcnRjBmFwcF9pZAo2NjI4NTY4Mzc5AAEeAZAsA3Gj3Hy1LhP-ZfJl4rJxzLNR3lATWjam7_wMJiNIQmL3aNZLegBnnQI_aem_Q9QDtY6WKUESAP9BuxwcAQ"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-400 hover:text-blue-300 transition-colors hover:underline"
                            >
                                Mohamed Akishan
                            </a>
                            {" "}and {displaySiteName}. All rights reserved.
                        </p>
                    </div>
                </div>
            </footer>

            {/* Modals */}
            <ContactModal />
            <FAQsModal />
            <ShippingModal />
            <ReturnsModal />
        </>
    );
};

export default Footer;