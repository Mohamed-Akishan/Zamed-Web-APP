import { Link, useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { FiTrash2, FiPlus, FiMinus, FiArrowLeft, FiTruck, FiShield } from "react-icons/fi";
import { toast } from "sonner";
import { useState, useEffect } from "react";

const Cart = () => {
    const navigate = useNavigate();
    const { 
        cartItems = [], 
        removeFromCart, 
        updateQuantity, 
        clearCart
    } = useCart();
    
    const [currencySymbol, setCurrencySymbol] = useState("$");
    const [currencyCode, setCurrencyCode] = useState("USD");
    const [shippingSettings, setShippingSettings] = useState({
        shippingFee: 5,
        freeShippingThreshold: 100,
        taxRate: 10
    });
    const [productImages, setProductImages] = useState({});

    useEffect(() => {
        const settings = JSON.parse(localStorage.getItem('site_settings') || '{}');
        const symbols = { USD: "$", EUR: "€", GBP: "£", LKR: "Rs" };
        setCurrencySymbol(symbols[settings.currency] || "$");
        setCurrencyCode(settings.currency || "USD");
        
        setShippingSettings({
            shippingFee: settings.shippingFee || 5,
            freeShippingThreshold: settings.freeShippingThreshold || 100,
            taxRate: settings.taxRate || 10
        });
        
        // Load product images from localStorage
        loadProductImages();
    }, []);

    // Load product images from products storage
    const loadProductImages = () => {
        const products = JSON.parse(localStorage.getItem('shop_products') || '[]');
        const imageMap = {};
        products.forEach(product => {
            if (product.id && product.image) {
                imageMap[product.id] = product.image;
            }
            // Also store color images if needed
            if (product.colorImages) {
                Object.values(product.colorImages).forEach(img => {
                    if (img) imageMap[product.id] = img;
                });
            }
        });
        setProductImages(imageMap);
    };

    // Get valid image URL
    const getProductImage = (item) => {
        // First check if we have an image from product storage
        if (productImages[item.id]) {
            return productImages[item.id];
        }
        // Then check if the item itself has an image
        if (item.image && (item.image.startsWith('data:') || item.image.startsWith('http'))) {
            return item.image;
        }
        // Fallback to placeholder
        return 'https://via.placeholder.com/80x80?text=No+Image';
    };

    // Calculate totals directly from cartItems
    const calculateSubtotal = () => {
        if (!cartItems || cartItems.length === 0) return 0;
        return cartItems.reduce((total, item) => {
            const price = typeof item.price === 'number' ? item.price : parseFloat(item.price) || 0;
            const quantity = item.quantity || 1;
            return total + (price * quantity);
        }, 0);
    };

    const subtotal = calculateSubtotal();
    
    // Calculate shipping based on currency and subtotal
    const isLKR = currencyCode === 'LKR';
    const freeThreshold = isLKR ? 10000 : shippingSettings.freeShippingThreshold;
    const shippingAmount = isLKR ? 500 : shippingSettings.shippingFee;
    const calculatedShipping = subtotal > freeThreshold ? 0 : shippingAmount;
    
    // Calculate tax
    const taxAmount = subtotal * (shippingSettings.taxRate / 100);
    const total = subtotal + calculatedShipping + taxAmount;
    const itemsCount = cartItems.reduce((sum, item) => sum + (item.quantity || 1), 0);

    const handleQuantityChange = (productId, currentQuantity, delta, size, color) => {
        const newQuantity = currentQuantity + delta;
        if (newQuantity < 1) {
            if (removeFromCart) {
                removeFromCart(productId, size, color);
            }
        } else {
            if (updateQuantity) {
                updateQuantity(productId, size, color, newQuantity);
            }
        }
    };

    const handleRemoveItem = (productId, size, color, productName) => {
        if (removeFromCart) {
            removeFromCart(productId, size, color);
            toast.success(`${productName} removed from cart`);
        }
    };

    const handleCheckout = () => {
        if (!cartItems || cartItems.length === 0) {
            toast.error("Your cart is empty");
            return;
        }
        
        const user = localStorage.getItem('user');
        if (!user) {
            localStorage.setItem('redirectAfterLogin', '/checkout');
            navigate('/login');
        } else {
            navigate('/checkout');
        }
    };

    const formatPrice = (price) => {
        const numPrice = typeof price === 'number' && !isNaN(price) ? price : 0;
        return `${currencySymbol}${numPrice.toFixed(2)}`;
    };

    if (!cartItems || cartItems.length === 0) {
        return (
            <div className="min-h-screen bg-gray-50 py-16">
                <div className="container mx-auto px-4 max-w-4xl">
                    <div className="bg-white rounded-lg shadow-md p-12 text-center">
                        <div className="text-6xl mb-4">🛒</div>
                        <h2 className="text-2xl font-bold mb-4">Your Cart is Empty</h2>
                        <p className="text-gray-500 mb-8">Looks like you haven't added any items to your cart yet.</p>
                        <Link to="/collections/all" className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors inline-block">
                            Start Shopping
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="container mx-auto px-4 max-w-6xl">
                <div className="mb-6">
                    <button 
                        onClick={() => navigate(-1)}
                        className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
                    >
                        <FiArrowLeft className="mr-2" /> Continue Shopping
                    </button>
                </div>

                <h1 className="text-3xl font-bold mb-8">Shopping Cart ({itemsCount} items)</h1>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Cart Items */}
                    <div className="lg:col-span-2">
                        <div className="bg-white rounded-lg shadow-md overflow-hidden">
                            <div className="hidden md:grid grid-cols-12 gap-4 p-4 bg-gray-50 border-b font-semibold text-gray-600">
                                <div className="col-span-6">Product</div>
                                <div className="col-span-2 text-center">Price</div>
                                <div className="col-span-2 text-center">Quantity</div>
                                <div className="col-span-2 text-right">Total</div>
                            </div>
                            
                            {cartItems.map((item, idx) => {
                                const itemPrice = typeof item.price === 'number' ? item.price : parseFloat(item.price) || 0;
                                const itemTotal = itemPrice * (item.quantity || 1);
                                const productImage = getProductImage(item);
                                
                                return (
                                    <div key={`${item.id}-${item.size}-${item.color}-${idx}`} className="grid grid-cols-1 md:grid-cols-12 gap-4 p-4 border-b items-center">
                                        <div className="md:col-span-6 flex items-center space-x-4">
                                            <img 
                                                src={productImage} 
                                                alt={item.name} 
                                                className="w-20 h-20 object-cover rounded-lg"
                                                onError={(e) => { e.target.src = 'https://via.placeholder.com/80x80?text=No+Image'; }}
                                            />
                                            <div>
                                                <h3 className="font-semibold">{item.name}</h3>
                                                <p className="text-sm text-gray-500 capitalize">{item.category || 'Fashion'}</p>
                                                {item.size && <p className="text-xs text-gray-400">Size: {item.size}</p>}
                                                {item.color && <p className="text-xs text-gray-400">Color: {item.color}</p>}
                                            </div>
                                        </div>
                                        <div className="md:col-span-2 text-center">
                                            <span className="font-semibold">{formatPrice(itemPrice)}</span>
                                        </div>
                                        <div className="md:col-span-2 flex justify-center">
                                            <div className="flex items-center space-x-3 border rounded-lg">
                                                <button 
                                                    onClick={() => handleQuantityChange(item.id, item.quantity, -1, item.size, item.color)} 
                                                    className="px-3 py-1 hover:bg-gray-100 rounded-l-lg"
                                                >
                                                    <FiMinus size={12} />
                                                </button>
                                                <span className="w-10 text-center">{item.quantity || 1}</span>
                                                <button 
                                                    onClick={() => handleQuantityChange(item.id, item.quantity, 1, item.size, item.color)} 
                                                    className="px-3 py-1 hover:bg-gray-100 rounded-r-lg"
                                                >
                                                    <FiPlus size={12} />
                                                </button>
                                            </div>
                                        </div>
                                        <div className="md:col-span-2 flex items-center justify-between md:justify-end">
                                            <span className="font-semibold text-blue-600">{formatPrice(itemTotal)}</span>
                                            <button 
                                                onClick={() => handleRemoveItem(item.id, item.size, item.color, item.name)} 
                                                className="ml-4 p-2 hover:bg-red-50 rounded-full transition-colors"
                                            >
                                                <FiTrash2 className="text-red-500" />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        
                        <div className="mt-4 flex justify-between">
                            <button 
                                onClick={() => {
                                    if (clearCart && window.confirm("Are you sure you want to clear your cart?")) {
                                        clearCart();
                                        toast.success("Cart cleared");
                                    }
                                }}
                                className="text-red-500 hover:text-red-700 transition-colors"
                            >
                                Clear Cart
                            </button>
                        </div>
                    </div>

                    {/* Order Summary */}
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-lg shadow-md p-6 sticky top-8">
                            <h2 className="text-xl font-semibold mb-4">Order Summary</h2>
                            <div className="space-y-3">
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Subtotal</span>
                                    <span>{formatPrice(subtotal)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600 flex items-center gap-1">
                                        <FiTruck size={14} /> Shipping
                                    </span>
                                    <span>{calculatedShipping === 0 ? 'Free' : formatPrice(calculatedShipping)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600 flex items-center gap-1">
                                        <FiShield size={14} /> Tax ({shippingSettings.taxRate}%)
                                    </span>
                                    <span>{formatPrice(taxAmount)}</span>
                                </div>
                                {subtotal > freeThreshold && (
                                    <div className="text-green-600 text-sm text-center py-2 bg-green-50 rounded-lg">
                                        ✨ Free Shipping Applied! ✨
                                    </div>
                                )}
                                <div className="border-t pt-3 flex justify-between font-bold text-lg">
                                    <span>Total</span>
                                    <span className="text-blue-600">{formatPrice(total)}</span>
                                </div>
                            </div>
                            <button
                                onClick={handleCheckout}
                                className="w-full mt-6 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                            >
                                Proceed to Checkout
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Cart;