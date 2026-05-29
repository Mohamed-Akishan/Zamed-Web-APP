import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { saveOrder, updateDeliveryDate } from "../services/orderService";
import { toast } from "sonner";
import { 
    FiTruck, FiShield, FiCreditCard, FiMapPin, FiPhone, FiMail, 
    FiUser, FiArrowRight, FiCheckCircle, FiLock, FiCalendar, 
    FiPackage, FiClock, FiDollarSign, FiShoppingBag, FiTag,
    FiEdit2, FiTrash2, FiPlus, FiChevronRight, FiChevronDown,
    FiAlertCircle, FiSmartphone, FiGlobe, FiHome, FiHeart
} from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";

const Checkout = () => {
    const navigate = useNavigate();
    const { cartItems = [], clearCart, removeFromCart, updateQuantity } = useCart();
    const [loading, setLoading] = useState(false);
    const [currentStep, setCurrentStep] = useState(1);
    const [currencyCode, setCurrencyCode] = useState("USD");
    const [currencySymbol, setCurrencySymbol] = useState("$");
    const [couponCode, setCouponCode] = useState("");
    const [appliedCoupon, setAppliedCoupon] = useState(null);
    const [couponError, setCouponError] = useState("");
    const [couponSuccess, setCouponSuccess] = useState("");
    const [savedCards, setSavedCards] = useState([]);
    const [selectedSavedCard, setSelectedSavedCard] = useState(null);
    const [showSaveCard, setShowSaveCard] = useState(false);
    const [editingAddress, setEditingAddress] = useState(null);
    const [showAddAddress, setShowAddAddress] = useState(false);
    const [addresses, setAddresses] = useState([]);
    const [selectedAddress, setSelectedAddress] = useState(null);
    const [selectedShipping, setSelectedShipping] = useState(null);
    const [orderPlaced, setOrderPlaced] = useState(false);
    const [orderId, setOrderId] = useState(null);
    const [finalOrderTotal, setFinalOrderTotal] = useState(0);
    const [orderDetails, setOrderDetails] = useState(null);
    
    const [shippingSettings, setShippingSettings] = useState({
        shippingFee: 5,
        freeShippingThreshold: 100,
        taxRate: 10,
        deliveryInfoText: "Free delivery on orders over $100",
        returnPolicyText: "30-day easy returns",
        securePaymentText: "Secure payment"
    });
    
    // Shipping options
    const shippingOptions = [
        { id: "standard", label: "Standard Delivery", days: "5-7 Days", price: 0, estimated: "May 20-22", icon: FiPackage },
        { id: "express", label: "Express Delivery", days: "2-3 Days", price: 10, estimated: "May 17-18", icon: FiTruck },
        { id: "same-day", label: "Same Day Delivery", days: "24 Hours", price: 20, estimated: "Today", icon: FiClock }
    ];
    
    const [cardDetails, setCardDetails] = useState({
        cardNumber: "",
        cardName: "",
        expiryDate: "",
        cvv: ""
    });
    
    const [formData, setFormData] = useState({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        address: "",
        city: "",
        state: "",
        postalCode: "",
        country: "Sri Lanka",
        paymentMethod: "card",
        deliveryDate: ""
    });
    
    // Get min date (today)
    const minDate = new Date().toISOString().split('T')[0];
    const maxDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Steps configuration
    const steps = [
        { id: 1, name: "Cart", icon: FiShoppingBag },
        { id: 2, name: "Address", icon: FiMapPin },
        { id: 3, name: "Shipping", icon: FiTruck },
        { id: 4, name: "Payment", icon: FiCreditCard },
        { id: 5, name: "Review", icon: FiCheckCircle }
    ];

    // Function to get valid image URL
    const getValidImageUrl = (image) => {
        if (!image) return 'https://via.placeholder.com/80x80?text=No+Image';
        if (image.startsWith('data:') || image.startsWith('http')) return image;
        return 'https://via.placeholder.com/80x80?text=No+Image';
    };

    // Load settings and saved data
    useEffect(() => {
        try {
            const settings = JSON.parse(localStorage.getItem('site_settings') || '{}');
            const symbols = { USD: "$", EUR: "€", GBP: "£", LKR: "Rs" };
            setCurrencySymbol(symbols[settings.currency] || "$");
            setCurrencyCode(settings.currency || "USD");
            
            setShippingSettings({
                shippingFee: settings.shippingFee || 5,
                freeShippingThreshold: settings.freeShippingThreshold || 100,
                taxRate: settings.taxRate || 10,
                deliveryInfoText: settings.deliveryInfoText || "Free delivery on orders over $100",
                returnPolicyText: settings.returnPolicyText || "30-day easy returns",
                securePaymentText: settings.securePaymentText || "Secure payment"
            });
            
            // Load user data
            const userData = localStorage.getItem('user');
            if (userData) {
                const user = JSON.parse(userData);
                setFormData(prev => ({
                    ...prev,
                    firstName: user.firstName || "",
                    lastName: user.lastName || "",
                    email: user.email || "",
                    phone: user.phone || "",
                    address: user.address || ""
                }));
            }
            
            // Load saved addresses
            const savedAddresses = JSON.parse(localStorage.getItem('checkout_addresses') || '[]');
            setAddresses(savedAddresses);
            if (savedAddresses.length > 0) {
                const defaultAddr = savedAddresses.find(a => a.isDefault) || savedAddresses[0];
                setSelectedAddress(defaultAddr);
            }
            
            // Load saved cards
            const savedCardsList = JSON.parse(localStorage.getItem('saved_cards') || '[]');
            setSavedCards(savedCardsList);
            
            // Set default shipping
            setSelectedShipping(shippingOptions[0]);
            
        } catch (error) {
            console.error("Error loading settings:", error);
        }
    }, []);

    // Calculate totals
    const calculateSubtotal = () => {
        if (!cartItems || cartItems.length === 0) return 0;
        return cartItems.reduce((total, item) => {
            const price = typeof item.price === 'number' ? item.price : parseFloat(item.price) || 0;
            const quantity = item.quantity || 1;
            return total + (price * quantity);
        }, 0);
    };

    const subtotal = calculateSubtotal();
    const isLKR = currencyCode === 'LKR';
    const freeThreshold = isLKR ? 10000 : shippingSettings.freeShippingThreshold;
    
    const getShippingFee = () => {
        if (!selectedShipping) return 0;
        const baseFee = selectedShipping.price;
        if (selectedShipping.id === 'standard' && subtotal > freeThreshold) {
            return 0;
        }
        return baseFee;
    };
    
    const shippingFee = getShippingFee();
    const taxAmount = subtotal * (shippingSettings.taxRate / 100);
    const discountAmount = appliedCoupon?.discountAmount || 0;
    const total = subtotal + shippingFee + taxAmount - discountAmount;

    useEffect(() => {
        setFinalOrderTotal(total);
    }, [total]);

    const validateCardDetails = () => {
        if (selectedSavedCard) return true;
        
        if (!cardDetails.cardNumber || cardDetails.cardNumber.replace(/\s/g, '').length < 16) {
            toast.error("Please enter a valid 16-digit card number");
            return false;
        }
        if (!cardDetails.cardName || cardDetails.cardName.length < 3) {
            toast.error("Please enter card holder name");
            return false;
        }
        if (!cardDetails.expiryDate || cardDetails.expiryDate.length < 5) {
            toast.error("Please enter expiry date (MM/YY)");
            return false;
        }
        if (!cardDetails.cvv || cardDetails.cvv.length < 3) {
            toast.error("Please enter CVV");
            return false;
        }
        return true;
    };

    // Redirect if cart is empty
    useEffect(() => {
        if ((!cartItems || cartItems.length === 0) && !loading && !orderPlaced) {
            toast.error("Your cart is empty");
            navigate('/cart');
        }
    }, [cartItems, navigate, loading, orderPlaced]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleCardInputChange = (e) => {
        const { name, value } = e.target;
        
        if (name === 'cardNumber') {
            let formatted = value.replace(/\s/g, '').replace(/(.{4})/g, '$1 ').trim();
            if (formatted.length > 19) formatted = formatted.slice(0, 19);
            setCardDetails(prev => ({ ...prev, [name]: formatted }));
        } else if (name === 'expiryDate') {
            let formatted = value.replace(/\//g, '');
            if (formatted.length >= 2) {
                formatted = formatted.slice(0, 2) + '/' + formatted.slice(2, 4);
            }
            if (formatted.length > 5) formatted = formatted.slice(0, 5);
            setCardDetails(prev => ({ ...prev, [name]: formatted }));
        } else if (name === 'cvv') {
            let formatted = value.replace(/\D/g, '');
            if (formatted.length > 3) formatted = formatted.slice(0, 3);
            setCardDetails(prev => ({ ...prev, [name]: formatted }));
        } else {
            setCardDetails(prev => ({ ...prev, [name]: value }));
        }
    };

    const generateOrderId = () => {
        return 'ORD-' + Date.now().toString().slice(-8) + Math.random().toString(36).substr(2, 4).toUpperCase();
    };

    const formatPrice = (price) => {
        const numPrice = typeof price === 'number' && !isNaN(price) ? price : 0;
        return `${currencySymbol}${numPrice.toFixed(2)}`;
    };

    // Coupon handling
    const availableCoupons = [
        { code: "SAVE10", discount: 10, type: "percentage", minPurchase: 50 },
        { code: "SAVE20", discount: 20, type: "percentage", minPurchase: 100 },
        { code: "FLAT50", discount: 50, type: "fixed", minPurchase: 200 },
        { code: "WELCOME15", discount: 15, type: "percentage", minPurchase: 0 },
        { code: "FREESHIP", discount: shippingFee, type: "shipping", minPurchase: 0 }
    ];

    const applyCoupon = () => {
        if (!couponCode.trim()) {
            setCouponError("Please enter a coupon code");
            return;
        }
        
        const coupon = availableCoupons.find(c => c.code === couponCode.toUpperCase());
        
        if (!coupon) {
            setCouponError("Invalid coupon code");
            setCouponSuccess("");
            return;
        }
        
        if (subtotal < coupon.minPurchase) {
            setCouponError(`Minimum purchase of ${formatPrice(coupon.minPurchase)} required`);
            setCouponSuccess("");
            return;
        }
        
        let discount = 0;
        if (coupon.type === "percentage") {
            discount = (subtotal * coupon.discount) / 100;
        } else if (coupon.type === "fixed") {
            discount = coupon.discount;
        } else if (coupon.type === "shipping") {
            discount = shippingFee;
        }
        
        setAppliedCoupon({ ...coupon, discountAmount: discount });
        setCouponSuccess(`Coupon ${coupon.code} applied! You saved ${formatPrice(discount)}`);
        setCouponError("");
        toast.success(`Coupon applied! You saved ${formatPrice(discount)}`);
    };

    const removeCoupon = () => {
        setAppliedCoupon(null);
        setCouponCode("");
        setCouponSuccess("");
        toast.info("Coupon removed");
    };

    // Address management
    const addAddress = (address) => {
        const newAddress = {
            id: Date.now(),
            ...address,
            isDefault: addresses.length === 0
        };
        const updatedAddresses = [...addresses, newAddress];
        setAddresses(updatedAddresses);
        localStorage.setItem('checkout_addresses', JSON.stringify(updatedAddresses));
        setSelectedAddress(newAddress);
        setShowAddAddress(false);
        toast.success("Address added successfully");
    };

    const updateAddress = (id, updatedData) => {
        const updatedAddresses = addresses.map(addr => 
            addr.id === id ? { ...addr, ...updatedData } : addr
        );
        setAddresses(updatedAddresses);
        localStorage.setItem('checkout_addresses', JSON.stringify(updatedAddresses));
        setSelectedAddress(updatedAddresses.find(a => a.id === id));
        setEditingAddress(null);
        toast.success("Address updated");
    };

    const deleteAddress = (id) => {
        const updatedAddresses = addresses.filter(addr => addr.id !== id);
        setAddresses(updatedAddresses);
        localStorage.setItem('checkout_addresses', JSON.stringify(updatedAddresses));
        if (selectedAddress?.id === id) {
            setSelectedAddress(updatedAddresses[0] || null);
        }
        toast.success("Address deleted");
    };

    // Save card for future
    const saveCardForFuture = () => {
        if (cardDetails.cardNumber && cardDetails.cardName) {
            const newCard = {
                id: Date.now(),
                cardNumber: `**** ${cardDetails.cardNumber.slice(-4)}`,
                cardName: cardDetails.cardName,
                expiryDate: cardDetails.expiryDate,
                isDefault: savedCards.length === 0
            };
            const updatedCards = [...savedCards, newCard];
            setSavedCards(updatedCards);
            localStorage.setItem('saved_cards', JSON.stringify(updatedCards));
            toast.success("Card saved for future purchases");
        }
    };

    const selectSavedCard = (card) => {
        setSelectedSavedCard(card);
        setCardDetails({
            cardNumber: "",
            cardName: "",
            expiryDate: "",
            cvv: ""
        });
    };

    const handlePlaceOrder = async () => {
        if (currentStep === 1) {
            if (!cartItems || cartItems.length === 0) {
                toast.error("Your cart is empty");
                return;
            }
            setCurrentStep(2);
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }
        
        if (currentStep === 2) {
            if (!selectedAddress) {
                toast.error("Please select or add a delivery address");
                return;
            }
            setCurrentStep(3);
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }
        
        if (currentStep === 3) {
            if (!selectedShipping) {
                toast.error("Please select a shipping method");
                return;
            }
            setCurrentStep(4);
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }
        
        if (currentStep === 4) {
            if (formData.paymentMethod === 'card') {
                if (!validateCardDetails()) {
                    return;
                }
            }
            setCurrentStep(5);
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }
        
        if (currentStep === 5) {
            await placeOrder();
        }
    };

    const placeOrder = async () => {
        setLoading(true);
        
        try {
            const currentCartItems = [...cartItems];
            
            if (!currentCartItems || currentCartItems.length === 0) {
                toast.error("Your cart is empty");
                setLoading(false);
                return;
            }
            
            const orderId = generateOrderId();
            const userData = localStorage.getItem('user');
            const user = userData ? JSON.parse(userData) : null;
            
            const finalSubtotal = currentCartItems.reduce((total, item) => {
                const price = typeof item.price === 'number' ? item.price : parseFloat(item.price) || 0;
                const quantity = item.quantity || 1;
                return total + (price * quantity);
            }, 0);
            
            const finalShippingFee = (selectedShipping?.id === 'standard' && finalSubtotal > freeThreshold) ? 0 : (selectedShipping?.price || 0);
            const finalTaxAmount = finalSubtotal * (shippingSettings.taxRate / 100);
            const finalDiscountAmount = appliedCoupon?.discountAmount || 0;
            const finalTotalAmount = finalSubtotal + finalShippingFee + finalTaxAmount - finalDiscountAmount;
            
            const orderData = {
                id: orderId,
                userEmail: user?.email || formData.email,
                customerName: selectedAddress ? 
                    `${selectedAddress.firstName} ${selectedAddress.lastName}` : 
                    `${formData.firstName} ${formData.lastName}`,
                customerEmail: formData.email,
                customerPhone: selectedAddress?.phone || formData.phone,
                shippingAddress: selectedAddress ? 
                    `${selectedAddress.address}, ${selectedAddress.city}, ${selectedAddress.state}, ${selectedAddress.postalCode}, ${selectedAddress.country}` :
                    `${formData.address}, ${formData.city}, ${formData.state}, ${formData.postalCode}, ${formData.country}`,
                items: currentCartItems.length,
                itemsList: currentCartItems.map(item => ({
                    id: item.id,
                    name: item.name,
                    price: item.price,
                    quantity: item.quantity,
                    size: item.size,
                    color: item.color,
                    image: getValidImageUrl(item.image)
                })),
                subtotal: finalSubtotal,
                shippingFee: finalShippingFee,
                shippingMethod: selectedShipping?.label,
                taxRate: shippingSettings.taxRate,
                taxAmount: finalTaxAmount,
                discount: finalDiscountAmount,
                couponCode: appliedCoupon?.code,
                total: finalTotalAmount,
                status: "pending",
                paymentMethod: formData.paymentMethod === 'card' ? 'Credit Card' : 
                              formData.paymentMethod === 'paypal' ? 'PayPal' :
                              formData.paymentMethod === 'apple_pay' ? 'Apple Pay' :
                              formData.paymentMethod === 'google_pay' ? 'Google Pay' : 'Cash on Delivery',
                date: new Date().toISOString(),
                deliveryDate: formData.deliveryDate,
                deliveryStatus: "scheduled",
                estimatedDelivery: selectedShipping?.estimated
            };
            
            const saved = await saveOrder(orderData);
            
            if (saved) {
                if (showSaveCard && formData.paymentMethod === 'card' && cardDetails.cardNumber) {
                    saveCardForFuture();
                }
                
                setOrderDetails(orderData);
                setOrderId(orderId);
                setFinalOrderTotal(finalTotalAmount);
                
                if (clearCart) {
                    clearCart();
                }
                
                setOrderPlaced(true);
                toast.success(`Order placed successfully! Order ID: ${orderId}`);
                
            } else {
                throw new Error("Failed to save order");
            }
            
        } catch (error) {
            console.error("Error placing order:", error);
            toast.error("Failed to place order. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleBackStep = () => {
        if (currentStep > 1) {
            setCurrentStep(currentStep - 1);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    // Order Confirmation Component
    if (orderPlaced) {
        const displayOrder = orderDetails || {};
        const displaySubtotal = displayOrder.subtotal || subtotal;
        const displayShipping = displayOrder.shippingFee || shippingFee;
        const displayTax = displayOrder.taxAmount || taxAmount;
        const displayDiscount = displayOrder.discount || discountAmount;
        const displayTotal = displayOrder.total || finalOrderTotal;
        
        return (
            <div className="min-h-screen bg-gray-50 py-16">
                <div className="container mx-auto px-4 max-w-2xl">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white rounded-2xl shadow-xl p-8 text-center"
                    >
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.2, type: "spring" }}
                            className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6"
                        >
                            <FiCheckCircle className="w-12 h-12 text-green-500" />
                        </motion.div>
                        
                        <h1 className="text-3xl font-bold mb-2">Order Confirmed!</h1>
                        <p className="text-gray-600 mb-6">Thank you for your purchase</p>
                        
                        <div className="bg-gray-50 rounded-xl p-4 mb-6 text-left">
                            <p className="mb-2"><strong>Order ID:</strong> {orderId}</p>
                            <p className="mb-2"><strong>Estimated Delivery:</strong> {selectedShipping?.estimated || "5-7 business days"}</p>
                            <p className="mb-2"><strong>Payment Method:</strong> {formData.paymentMethod === 'card' ? 'Credit Card' : 
                                formData.paymentMethod === 'paypal' ? 'PayPal' : 
                                formData.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Digital Wallet'}</p>
                            <p><strong>Total Amount:</strong> <span className="text-green-600 font-bold text-xl">{formatPrice(displayTotal)}</span></p>
                        </div>
                        
                        <div className="bg-gray-50 rounded-xl p-4 mb-6 text-left">
                            <h3 className="font-semibold mb-3">Order Summary</h3>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span>Subtotal ({displayOrder.items || cartItems.length} items):</span>
                                    <span>{formatPrice(displaySubtotal)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Shipping:</span>
                                    <span>{displayShipping === 0 ? 'Free' : formatPrice(displayShipping)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Tax ({shippingSettings.taxRate}%):</span>
                                    <span>{formatPrice(displayTax)}</span>
                                </div>
                                {displayDiscount > 0 && (
                                    <div className="flex justify-between text-green-600">
                                        <span>Discount:</span>
                                        <span>-{formatPrice(displayDiscount)}</span>
                                    </div>
                                )}
                                <div className="border-t pt-2 mt-2">
                                    <div className="flex justify-between font-bold">
                                        <span>Total Paid:</span>
                                        <span className="text-green-600 text-lg">{formatPrice(displayTotal)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        {displayOrder.itemsList && displayOrder.itemsList.length > 0 && (
                            <div className="bg-gray-50 rounded-xl p-4 mb-6 text-left">
                                <h3 className="font-semibold mb-3">Items Ordered</h3>
                                <div className="space-y-2">
                                    {displayOrder.itemsList.map((item, idx) => (
                                        <div key={idx} className="flex justify-between items-center text-sm">
                                            <div className="flex items-center gap-3">
                                                {item.image && (item.image.startsWith('data:') || item.image.startsWith('http')) ? (
                                                    <img src={item.image} alt={item.name} className="w-12 h-12 object-cover rounded" />
                                                ) : (
                                                    <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center">
                                                        <FiPackage className="text-gray-400" />
                                                    </div>
                                                )}
                                                <div>
                                                    <p className="font-medium">{item.name}</p>
                                                    <p className="text-xs text-gray-500">Qty: {item.quantity} | Size: {item.size} | Color: {item.color}</p>
                                                </div>
                                            </div>
                                            <span>{formatPrice(item.price * item.quantity)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        
                        <div className="flex flex-col sm:flex-row gap-4">
                            <button 
                                onClick={() => navigate('/profile', { state: { activeTab: 'orders' } })}
                                className="flex-1 bg-gray-900 text-white py-3 rounded-xl font-semibold hover:bg-gray-800 transition-all"
                            >
                                View Orders
                            </button>
                            <button 
                                onClick={() => navigate('/collections/all')}
                                className="flex-1 border-2 border-gray-900 text-gray-900 py-3 rounded-xl font-semibold hover:bg-gray-900 hover:text-white transition-all"
                            >
                                Continue Shopping
                            </button>
                        </div>
                        
                        <button 
                            onClick={() => window.print()}
                            className="mt-4 text-sm text-blue-600 hover:text-blue-800"
                        >
                            Download Invoice
                        </button>
                    </motion.div>
                </div>
            </div>
        );
    }

    if (!cartItems || cartItems.length === 0) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="text-6xl mb-4">🛒</div>
                    <h2 className="text-2xl font-bold mb-4">Your cart is empty</h2>
                    <button onClick={() => navigate('/collections/all')} className="bg-gray-900 text-white px-6 py-3 rounded-xl hover:bg-gray-800 transition-all">
                        Continue Shopping
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="container mx-auto px-4 max-w-7xl">
                {/* Progress Indicator */}
                <div className="mb-8">
                    <div className="flex justify-between items-center max-w-3xl mx-auto">
                        {steps.map((step, index) => {
                            const Icon = step.icon;
                            const isCompleted = currentStep > step.id;
                            const isCurrent = currentStep === step.id;
                            
                            return (
                                <div key={step.id} className="flex flex-col items-center flex-1">
                                    <div className="relative flex items-center justify-center w-full">
                                        {index > 0 && (
                                            <div className={`absolute left-0 w-full h-0.5 ${isCompleted ? 'bg-green-500' : 'bg-gray-200'}`} 
                                                 style={{ left: '-50%', width: '100%' }} />
                                        )}
                                        <div className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                                            isCompleted ? 'bg-green-500 text-white' :
                                            isCurrent ? 'bg-blue-600 text-white ring-4 ring-blue-200' :
                                            'bg-gray-200 text-gray-500'
                                        }`}>
                                            {isCompleted ? <FiCheckCircle size={18} /> : <Icon size={18} />}
                                        </div>
                                    </div>
                                    <span className={`text-xs mt-2 ${isCurrent ? 'text-blue-600 font-semibold' : 'text-gray-500'}`}>
                                        {step.name}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="flex flex-col lg:flex-row gap-8">
                    {/* Left Section - Checkout Forms */}
                    <div className="flex-1 space-y-6">
                        {/* Step 1: Cart Review */}
                        {currentStep === 1 && (
                            <motion.div
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="bg-white rounded-2xl shadow-md p-6"
                            >
                                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                                    <FiShoppingBag className="text-blue-600" /> Review Cart Items ({cartItems.length} items)
                                </h2>
                                
                                <div className="space-y-4 max-h-96 overflow-y-auto">
                                    {cartItems.map((item, index) => {
                                        const itemPrice = typeof item.price === 'number' ? item.price : parseFloat(item.price) || 0;
                                        const itemTotal = itemPrice * (item.quantity || 1);
                                        return (
                                            <div key={item.id || index} className="flex gap-4 p-4 border rounded-xl">
                                                <img 
                                                    src={getValidImageUrl(item.image)} 
                                                    alt={item.name} 
                                                    className="w-20 h-20 object-cover rounded-lg"
                                                    onError={(e) => { e.target.src = 'https://via.placeholder.com/80x80?text=No+Image'; }}
                                                />
                                                <div className="flex-1">
                                                    <div className="flex justify-between">
                                                        <div>
                                                            <h3 className="font-semibold">{item.name}</h3>
                                                            <p className="text-sm text-gray-500">Size: {item.size} | Color: {item.color}</p>
                                                        </div>
                                                        <button 
                                                            onClick={() => removeFromCart(item.id, item.size, item.color)}
                                                            className="text-red-500 hover:text-red-700"
                                                        >
                                                            <FiTrash2 size={16} />
                                                        </button>
                                                    </div>
                                                    <div className="flex justify-between items-center mt-2">
                                                        <div className="flex items-center gap-3">
                                                            <button 
                                                                onClick={() => updateQuantity(item.id, item.size, item.color, Math.max(1, (item.quantity || 1) - 1))}
                                                                className="w-8 h-8 border rounded-lg hover:bg-gray-100"
                                                            >-</button>
                                                            <span className="w-8 text-center">{item.quantity || 1}</span>
                                                            <button 
                                                                onClick={() => updateQuantity(item.id, item.size, item.color, (item.quantity || 1) + 1)}
                                                                className="w-8 h-8 border rounded-lg hover:bg-gray-100"
                                                            >+</button>
                                                        </div>
                                                        <p className="font-semibold">{formatPrice(itemTotal)}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                                
                                <div className="mt-4 pt-4 border-t">
                                    <div className="flex justify-between font-bold text-lg">
                                        <span>Cart Total:</span>
                                        <span className="text-blue-600">{formatPrice(subtotal)}</span>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* Step 2: Delivery Address */}
                        {currentStep === 2 && (
                            <motion.div
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="bg-white rounded-2xl shadow-md p-6"
                            >
                                <div className="flex justify-between items-center mb-4">
                                    <h2 className="text-xl font-semibold flex items-center gap-2">
                                        <FiMapPin className="text-blue-600" /> Delivery Address
                                    </h2>
                                    <button 
                                        onClick={() => setShowAddAddress(true)}
                                        className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                                    >
                                        <FiPlus size={14} /> Add New Address
                                    </button>
                                </div>
                                
                                <div className="space-y-3 max-h-96 overflow-y-auto">
                                    {addresses.map((address) => (
                                        <div 
                                            key={address.id}
                                            className={`border-2 rounded-xl p-4 cursor-pointer transition-all ${
                                                selectedAddress?.id === address.id 
                                                    ? 'border-blue-500 bg-blue-50' 
                                                    : 'border-gray-200 hover:border-blue-300'
                                            }`}
                                            onClick={() => setSelectedAddress(address)}
                                        >
                                            <div className="flex justify-between items-start">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <p className="font-semibold">{address.firstName} {address.lastName}</p>
                                                        {address.isDefault && (
                                                            <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">Default</span>
                                                        )}
                                                    </div>
                                                    <p className="text-sm text-gray-600 mt-1">{address.address}</p>
                                                    <p className="text-sm text-gray-600">{address.city}, {address.state} - {address.postalCode}</p>
                                                    <p className="text-sm text-gray-600">{address.country}</p>
                                                    <p className="text-sm text-gray-500 mt-1">📞 {address.phone}</p>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); setEditingAddress(address); }}
                                                        className="text-gray-500 hover:text-blue-600"
                                                    >
                                                        <FiEdit2 size={16} />
                                                    </button>
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); deleteAddress(address.id); }}
                                                        className="text-gray-500 hover:text-red-600"
                                                    >
                                                        <FiTrash2 size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    
                                    {addresses.length === 0 && (
                                        <div className="text-center py-8">
                                            <FiMapPin className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                                            <p className="text-gray-500">No addresses saved</p>
                                            <button onClick={() => setShowAddAddress(true)} className="mt-2 text-blue-600">
                                                Add your first address
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )}

                        {/* Step 3: Shipping Method */}
                        {currentStep === 3 && (
                            <motion.div
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="bg-white rounded-2xl shadow-md p-6"
                            >
                                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                                    <FiTruck className="text-blue-600" /> Select Shipping Method
                                </h2>
                                
                                <div className="space-y-3">
                                    {shippingOptions.map((option) => {
                                        const Icon = option.icon;
                                        const actualPrice = (option.id === 'standard' && subtotal > freeThreshold) ? 0 : option.price;
                                        
                                        return (
                                            <label
                                                key={option.id}
                                                className={`flex items-center justify-between p-4 border-2 rounded-xl cursor-pointer transition-all ${
                                                    selectedShipping?.id === option.id 
                                                        ? 'border-blue-500 bg-blue-50' 
                                                        : 'border-gray-200 hover:border-blue-300'
                                                }`}
                                            >
                                                <div className="flex items-center gap-4">
                                                    <input
                                                        type="radio"
                                                        name="shipping"
                                                        value={option.id}
                                                        checked={selectedShipping?.id === option.id}
                                                        onChange={() => setSelectedShipping(option)}
                                                        className="w-4 h-4 text-blue-600"
                                                    />
                                                    <Icon size={24} className="text-gray-600" />
                                                    <div>
                                                        <p className="font-semibold">{option.label}</p>
                                                        <p className="text-sm text-gray-500">Delivery in {option.days}</p>
                                                        <p className="text-xs text-green-600">Est. delivery: {option.estimated}</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-bold">
                                                        {actualPrice === 0 ? 'Free' : formatPrice(actualPrice)}
                                                    </p>
                                                    {subtotal > freeThreshold && option.id === 'standard' && (
                                                        <p className="text-xs text-green-600">Free Shipping Applied!</p>
                                                    )}
                                                </div>
                                            </label>
                                        );
                                    })}
                                </div>
                            </motion.div>
                        )}

                        {/* Step 4: Payment Method */}
                        {currentStep === 4 && (
                            <motion.div
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="bg-white rounded-2xl shadow-md p-6"
                            >
                                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                                    <FiCreditCard className="text-blue-600" /> Payment Method
                                </h2>
                                
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-3">
                                        {[
                                            { id: "card", label: "Credit / Debit Card", icon: FiCreditCard },
                                            { id: "paypal", label: "PayPal", icon: FiDollarSign },
                                            { id: "apple_pay", label: "Apple Pay", icon: FiSmartphone },
                                            { id: "google_pay", label: "Google Pay", icon: FiGlobe },
                                            { id: "cod", label: "Cash on Delivery", icon: FiHome }
                                        ].map((method) => (
                                            <label
                                                key={method.id}
                                                className={`flex items-center gap-3 p-3 border-2 rounded-xl cursor-pointer transition-all ${
                                                    formData.paymentMethod === method.id 
                                                        ? 'border-blue-500 bg-blue-50' 
                                                        : 'border-gray-200 hover:border-blue-300'
                                                }`}
                                            >
                                                <input
                                                    type="radio"
                                                    name="paymentMethod"
                                                    value={method.id}
                                                    checked={formData.paymentMethod === method.id}
                                                    onChange={handleInputChange}
                                                    className="w-4 h-4"
                                                />
                                                <method.icon size={20} />
                                                <span className="text-sm font-medium">{method.label}</span>
                                            </label>
                                        ))}
                                    </div>
                                    
                                    {formData.paymentMethod === 'card' && (
                                        <div className="mt-4 p-4 bg-gray-50 rounded-xl border">
                                            {savedCards.length > 0 && (
                                                <div className="mb-4">
                                                    <p className="text-sm font-medium mb-2">Saved Cards</p>
                                                    <div className="space-y-2">
                                                        {savedCards.map(card => (
                                                            <label key={card.id} className="flex items-center gap-3 p-2 border rounded-lg cursor-pointer">
                                                                <input
                                                                    type="radio"
                                                                    name="savedCard"
                                                                    checked={selectedSavedCard?.id === card.id}
                                                                    onChange={() => selectSavedCard(card)}
                                                                    className="w-4 h-4"
                                                                />
                                                                <FiCreditCard />
                                                                <span className="text-sm">{card.cardNumber}</span>
                                                                <span className="text-sm text-gray-500">Expires: {card.expiryDate}</span>
                                                            </label>
                                                        ))}
                                                    </div>
                                                    <hr className="my-3" />
                                                </div>
                                            )}
                                            
                                            <h3 className="font-semibold mb-3 flex items-center gap-2">
                                                <FiLock className="text-blue-600" size={16} /> 
                                                {selectedSavedCard ? 'Enter CVV' : 'Card Details'}
                                            </h3>
                                            
                                            {!selectedSavedCard && (
                                                <div className="space-y-3">
                                                    <div>
                                                        <label className="block text-sm font-medium mb-1">Card Number *</label>
                                                        <input type="text" name="cardNumber" value={cardDetails.cardNumber} onChange={handleCardInputChange} placeholder="1234 5678 9012 3456" className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" maxLength="19" />
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-medium mb-1">Card Holder Name *</label>
                                                        <input type="text" name="cardName" value={cardDetails.cardName} onChange={handleCardInputChange} placeholder="JOHN DOE" className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div>
                                                            <label className="block text-sm font-medium mb-1">Expiry Date *</label>
                                                            <input type="text" name="expiryDate" value={cardDetails.expiryDate} onChange={handleCardInputChange} placeholder="MM/YY" className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" maxLength="5" />
                                                        </div>
                                                        <div>
                                                            <label className="block text-sm font-medium mb-1">CVV *</label>
                                                            <input type="password" name="cvv" value={cardDetails.cvv} onChange={handleCardInputChange} placeholder="123" className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" maxLength="3" />
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                            
                                            {selectedSavedCard && (
                                                <div>
                                                    <label className="block text-sm font-medium mb-1">CVV *</label>
                                                    <input type="password" name="cvv" value={cardDetails.cvv} onChange={handleCardInputChange} placeholder="123" className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" maxLength="3" />
                                                </div>
                                            )}
                                            
                                            <label className="flex items-center gap-2 mt-3">
                                                <input type="checkbox" checked={showSaveCard} onChange={(e) => setShowSaveCard(e.target.checked)} />
                                                <span className="text-sm">Save card for future purchases</span>
                                            </label>
                                        </div>
                                    )}
                                    
                                    {formData.paymentMethod === 'cod' && (
                                        <div className="mt-4">
                                            <label className="block text-sm font-medium mb-1">Select Delivery Date *</label>
                                            <input
                                                type="date"
                                                name="deliveryDate"
                                                value={formData.deliveryDate}
                                                onChange={handleInputChange}
                                                min={minDate}
                                                max={maxDate}
                                                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                                required
                                            />
                                            <p className="text-xs text-gray-500 mt-1">Choose your preferred delivery date (within 30 days)</p>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )}

                        {/* Step 5: Review Order */}
                        {currentStep === 5 && (
                            <motion.div
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="bg-white rounded-2xl shadow-md p-6"
                            >
                                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                                    <FiCheckCircle className="text-green-600" /> Review Your Order
                                </h2>
                                
                                <div className="space-y-4">
                                    <div className="border-b pb-3">
                                        <h3 className="font-semibold mb-2">Delivery Address</h3>
                                        {selectedAddress && (
                                            <div className="text-sm">
                                                <p>{selectedAddress.firstName} {selectedAddress.lastName}</p>
                                                <p>{selectedAddress.address}</p>
                                                <p>{selectedAddress.city}, {selectedAddress.state} - {selectedAddress.postalCode}</p>
                                                <p>{selectedAddress.country}</p>
                                                <p>📞 {selectedAddress.phone}</p>
                                            </div>
                                        )}
                                    </div>
                                    
                                    <div className="border-b pb-3">
                                        <h3 className="font-semibold mb-2">Shipping Method</h3>
                                        <div className="flex justify-between">
                                            <span>{selectedShipping?.label}</span>
                                            <span>{shippingFee === 0 ? 'Free' : formatPrice(shippingFee)}</span>
                                        </div>
                                        <p className="text-xs text-gray-500">Est. delivery: {selectedShipping?.estimated}</p>
                                    </div>
                                    
                                    <div className="border-b pb-3">
                                        <h3 className="font-semibold mb-2">Payment Method</h3>
                                        <p>{formData.paymentMethod === 'card' ? 'Credit Card' : 
                                             formData.paymentMethod === 'paypal' ? 'PayPal' : 
                                             formData.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Digital Wallet'}</p>
                                        {formData.paymentMethod === 'cod' && formData.deliveryDate && (
                                            <p className="text-sm text-gray-500 mt-1">Delivery Date: {new Date(formData.deliveryDate).toLocaleDateString()}</p>
                                        )}
                                    </div>
                                    
                                    <div className="pt-2">
                                        <h3 className="font-semibold mb-2">Price Details</h3>
                                        <div className="space-y-1 text-sm">
                                            <div className="flex justify-between">
                                                <span>Subtotal ({cartItems.length} items):</span>
                                                <span>{formatPrice(subtotal)}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Shipping:</span>
                                                <span>{shippingFee === 0 ? 'Free' : formatPrice(shippingFee)}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Tax ({shippingSettings.taxRate}%):</span>
                                                <span>{formatPrice(taxAmount)}</span>
                                            </div>
                                            {discountAmount > 0 && (
                                                <div className="flex justify-between text-green-600">
                                                    <span>Discount:</span>
                                                    <span>-{formatPrice(discountAmount)}</span>
                                                </div>
                                            )}
                                            <div className="border-t pt-2 mt-2">
                                                <div className="flex justify-between font-bold">
                                                    <span>Total to Pay:</span>
                                                    <span className="text-blue-600 text-lg">{formatPrice(total)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                        
                        {/* Navigation Buttons */}
                        <div className="flex gap-4">
                            {currentStep > 1 && (
                                <button
                                    onClick={handleBackStep}
                                    className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all"
                                >
                                    Back
                                </button>
                            )}
                            <button
                                onClick={handlePlaceOrder}
                                disabled={loading}
                                className="flex-1 bg-gray-900 text-white py-3 rounded-xl font-semibold hover:bg-gray-800 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {loading ? (
                                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                                ) : (
                                    <>
                                        {currentStep === 5 ? 'Place Order' : 'Continue'} 
                                        <FiArrowRight />
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                    
                    {/* Right Section - Order Summary */}
                    <div className="lg:w-96">
                        <div className="bg-white rounded-2xl shadow-md p-6 sticky top-24">
                            <h2 className="text-xl font-semibold mb-4 pb-2 border-b">Order Summary</h2>
                            
                            <div className="space-y-3 max-h-64 overflow-y-auto mb-4">
                                {cartItems.map((item, index) => (
                                    <div key={item.id || index} className="flex gap-3">
                                        <img 
                                            src={getValidImageUrl(item.image)} 
                                            alt={item.name} 
                                            className="w-12 h-12 object-cover rounded-lg"
                                            onError={(e) => { e.target.src = 'https://via.placeholder.com/48x48?text=No+Image'; }}
                                        />
                                        <div className="flex-1">
                                            <p className="font-medium text-sm line-clamp-1">{item.name}</p>
                                            <p className="text-xs text-gray-500">Qty: {item.quantity} | {item.size} | {item.color}</p>
                                            <p className="text-sm font-semibold">{formatPrice((item.price || 0) * (item.quantity || 1))}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            
                            <div className="border-t pt-4 mb-4">
                                {!appliedCoupon ? (
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={couponCode}
                                            onChange={(e) => setCouponCode(e.target.value)}
                                            placeholder="Coupon code"
                                            className="flex-1 px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                                        />
                                        <button
                                            onClick={applyCoupon}
                                            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-all"
                                        >
                                            Apply
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-between p-2 bg-green-50 rounded-lg">
                                        <div className="flex items-center gap-2">
                                            <FiTag className="text-green-600" size={14} />
                                            <span className="text-sm text-green-700">{appliedCoupon.code}</span>
                                        </div>
                                        <button onClick={removeCoupon} className="text-red-500 text-sm">Remove</button>
                                    </div>
                                )}
                                {couponError && <p className="text-xs text-red-500 mt-1">{couponError}</p>}
                                {couponSuccess && <p className="text-xs text-green-500 mt-1">{couponSuccess}</p>}
                            </div>
                            
                            <div className="space-y-2">
                                <div className="flex justify-between text-gray-600 text-sm">
                                    <span>Subtotal ({cartItems.length} items)</span>
                                    <span>{formatPrice(subtotal)}</span>
                                </div>
                                <div className="flex justify-between text-gray-600 text-sm">
                                    <span>Shipping</span>
                                    <span>{shippingFee === 0 ? "Free" : formatPrice(shippingFee)}</span>
                                </div>
                                <div className="flex justify-between text-gray-600 text-sm">
                                    <span>Tax ({shippingSettings.taxRate}%)</span>
                                    <span>{formatPrice(taxAmount)}</span>
                                </div>
                                {discountAmount > 0 && (
                                    <div className="flex justify-between text-green-600 text-sm">
                                        <span>Discount</span>
                                        <span>-{formatPrice(discountAmount)}</span>
                                    </div>
                                )}
                                {subtotal > freeThreshold && selectedShipping?.id === 'standard' && (
                                    <div className="text-green-600 text-xs text-center py-1 bg-green-50 rounded-lg">
                                        ✨ Free Shipping Applied! ✨
                                    </div>
                                )}
                                <div className="border-t pt-3 mt-2">
                                    <div className="flex justify-between font-bold text-lg">
                                        <span>Total</span>
                                        <span className="text-blue-600">{formatPrice(total)}</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="mt-6 pt-4 border-t space-y-2">
                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                    <FiShield className="text-green-600" size={14} />
                                    <span>{shippingSettings.securePaymentText}</span>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                    <FiLock className="text-blue-600" size={14} />
                                    <span>SSL Secure Payment</span>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                    <FiHeart className="text-red-500" size={14} />
                                    <span>100% Buyer Protection</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Add Address Modal */}
                <AnimatePresence>
                    {showAddAddress && (
                        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={() => setShowAddAddress(false)}>
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                className="bg-white rounded-2xl max-w-md w-full p-6"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <h2 className="text-2xl font-bold mb-4">Add New Address</h2>
                                <div className="space-y-3">
                                    <div className="grid grid-cols-2 gap-3">
                                        <input type="text" placeholder="First Name" className="px-3 py-2 border rounded-lg" id="addrFirstName" />
                                        <input type="text" placeholder="Last Name" className="px-3 py-2 border rounded-lg" id="addrLastName" />
                                    </div>
                                    <input type="text" placeholder="Phone Number" className="w-full px-3 py-2 border rounded-lg" id="addrPhone" />
                                    <input type="text" placeholder="Address" className="w-full px-3 py-2 border rounded-lg" id="addrAddress" />
                                    <div className="grid grid-cols-2 gap-3">
                                        <input type="text" placeholder="City" className="px-3 py-2 border rounded-lg" id="addrCity" />
                                        <input type="text" placeholder="State" className="px-3 py-2 border rounded-lg" id="addrState" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <input type="text" placeholder="Postal Code" className="px-3 py-2 border rounded-lg" id="addrPostal" />
                                        <input type="text" placeholder="Country" className="px-3 py-2 border rounded-lg" id="addrCountry" />
                                    </div>
                                    <div className="flex gap-3 pt-4">
                                        <button
                                            onClick={() => {
                                                const newAddress = {
                                                    firstName: document.getElementById('addrFirstName').value,
                                                    lastName: document.getElementById('addrLastName').value,
                                                    phone: document.getElementById('addrPhone').value,
                                                    address: document.getElementById('addrAddress').value,
                                                    city: document.getElementById('addrCity').value,
                                                    state: document.getElementById('addrState').value,
                                                    postalCode: document.getElementById('addrPostal').value,
                                                    country: document.getElementById('addrCountry').value
                                                };
                                                if (newAddress.firstName && newAddress.address) {
                                                    addAddress(newAddress);
                                                } else {
                                                    toast.error("Please fill required fields");
                                                }
                                            }}
                                            className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-semibold"
                                        >
                                            Save Address
                                        </button>
                                        <button onClick={() => setShowAddAddress(false)} className="flex-1 bg-gray-500 text-white py-2 rounded-lg font-semibold">
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>

                {/* Edit Address Modal */}
                <AnimatePresence>
                    {editingAddress && (
                        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={() => setEditingAddress(null)}>
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                className="bg-white rounded-2xl max-w-md w-full p-6"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <h2 className="text-2xl font-bold mb-4">Edit Address</h2>
                                <div className="space-y-3">
                                    <div className="grid grid-cols-2 gap-3">
                                        <input type="text" defaultValue={editingAddress.firstName} placeholder="First Name" className="px-3 py-2 border rounded-lg" id="editFirstName" />
                                        <input type="text" defaultValue={editingAddress.lastName} placeholder="Last Name" className="px-3 py-2 border rounded-lg" id="editLastName" />
                                    </div>
                                    <input type="text" defaultValue={editingAddress.phone} placeholder="Phone Number" className="w-full px-3 py-2 border rounded-lg" id="editPhone" />
                                    <input type="text" defaultValue={editingAddress.address} placeholder="Address" className="w-full px-3 py-2 border rounded-lg" id="editAddress" />
                                    <div className="grid grid-cols-2 gap-3">
                                        <input type="text" defaultValue={editingAddress.city} placeholder="City" className="px-3 py-2 border rounded-lg" id="editCity" />
                                        <input type="text" defaultValue={editingAddress.state} placeholder="State" className="px-3 py-2 border rounded-lg" id="editState" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <input type="text" defaultValue={editingAddress.postalCode} placeholder="Postal Code" className="px-3 py-2 border rounded-lg" id="editPostal" />
                                        <input type="text" defaultValue={editingAddress.country} placeholder="Country" className="px-3 py-2 border rounded-lg" id="editCountry" />
                                    </div>
                                    <div className="flex gap-3 pt-4">
                                        <button
                                            onClick={() => {
                                                const updatedData = {
                                                    firstName: document.getElementById('editFirstName').value,
                                                    lastName: document.getElementById('editLastName').value,
                                                    phone: document.getElementById('editPhone').value,
                                                    address: document.getElementById('editAddress').value,
                                                    city: document.getElementById('editCity').value,
                                                    state: document.getElementById('editState').value,
                                                    postalCode: document.getElementById('editPostal').value,
                                                    country: document.getElementById('editCountry').value
                                                };
                                                updateAddress(editingAddress.id, updatedData);
                                            }}
                                            className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-semibold"
                                        >
                                            Update Address
                                        </button>
                                        <button onClick={() => setEditingAddress(null)} className="flex-1 bg-gray-500 text-white py-2 rounded-lg font-semibold">
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default Checkout;