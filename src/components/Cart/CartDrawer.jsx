import { useState, useEffect } from "react";
import { IoMdClose } from "react-icons/io";
import { Link, useNavigate } from "react-router-dom";
import { useCart } from "../../context/CartContext";
import { RiDeleteBin3Line } from "react-icons/ri";
import { FiPlus, FiMinus } from "react-icons/fi";
import { toast } from "sonner";

const CartDrawer = ({ drawerOpen, toggleCartDrawer }) => {
    const { cartItems, removeFromCart, updateQuantity, getCartTotal, getCartItemsCount } = useCart();
    const navigate = useNavigate();
    const [isCheckingOut, setIsCheckingOut] = useState(false);
    const [currencySymbol, setCurrencySymbol] = useState("$");

    useEffect(() => {
        const siteSettings = JSON.parse(localStorage.getItem('site_settings') || '{}');
        const symbols = { USD: "$", EUR: "€", GBP: "£", LKR: "Rs" };
        setCurrencySymbol(symbols[siteSettings.currency] || "$");
    }, []);

    const handleQuantityChange = (productId, currentQuantity, delta, size, color) => {
        const newQuantity = currentQuantity + delta;
        if (newQuantity < 1) {
            removeFromCart(productId, size, color);
        } else {
            updateQuantity(productId, size, color, newQuantity);
        }
    };

    const handleRemoveItem = (productId, size, color, productName) => {
        removeFromCart(productId, size, color);
    };

    const handleCheckout = () => {
        if (!cartItems || cartItems.length === 0) {
            toast.error("Your cart is empty");
            return;
        }
        
        setIsCheckingOut(true);
        toggleCartDrawer();
        
        const user = localStorage.getItem('user');
        if (!user) {
            localStorage.setItem('redirectAfterLogin', '/checkout');
            navigate('/login');
        } else {
            navigate('/checkout');
        }
        setTimeout(() => setIsCheckingOut(false), 500);
    };

    const handleContinueShopping = () => {
        toggleCartDrawer();
        navigate('/collections/all');
    };

    if (!cartItems) {
        return null;
    }

    return (
        <div className={`fixed top-0 right-0 w-3/4 sm:w-1/2 md:w-[30rem] h-full bg-white shadow-lg transform transition-transform duration-300 flex flex-col z-50 ${drawerOpen ? 'translate-x-0' : 'translate-x-full'}`}>
            {/* Header */}
            <div className="flex justify-between items-center p-4 border-b sticky top-0 bg-white z-10">
                <h2 className="text-xl font-semibold">Your Cart ({getCartItemsCount()})</h2>
                <button onClick={toggleCartDrawer} className="p-1 hover:bg-gray-100 rounded-full transition-colors">
                    <IoMdClose className="h-6 w-6" />
                </button>
            </div>

            {/* Cart Items */}
            <div className="flex-grow p-4 overflow-y-auto">
                {!cartItems || cartItems.length === 0 ? (
                    <div className="text-center py-12">
                        <div className="text-6xl mb-4">🛒</div>
                        <p className="text-gray-500 mb-4">Your cart is empty</p>
                        <button 
                            onClick={handleContinueShopping}
                            className="text-blue-600 hover:text-blue-800 font-medium transition-colors"
                        >
                            Start Shopping →
                        </button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {cartItems.map((item, index) => (
                            <div key={`${item.id}-${item.size}-${item.color}-${index}`} className="flex py-4 border-b last:border-b-0">
                                <img 
                                    src={item.image || '/images/no-image.svg'} 
                                    alt={item.name || 'Product'} 
                                    className="w-20 h-24 object-cover rounded-lg" 
                                    onError={(e) => { e.target.src = "/images/no-image.svg"; }}
                                />
                                <div className="flex-1 ml-4">
                                    <h3 className="font-semibold text-gray-800">{item.name || 'Product'}</h3>
                                    <p className="text-sm text-gray-500 capitalize mt-1">{item.category || 'General'}</p>
                                    {item.size && <p className="text-xs text-gray-500 mt-1">Size: {item.size}</p>}
                                    {item.color && <p className="text-xs text-gray-500">Color: {item.color}</p>}
                                    <div className="flex items-center mt-3 space-x-2 border rounded-lg w-fit">
                                        <button 
                                            onClick={() => handleQuantityChange(item.id, item.quantity, -1, item.size, item.color)} 
                                            className="px-2 py-1 hover:bg-gray-100 rounded-l-lg transition-colors"
                                        >
                                            <FiMinus size={12} />
                                        </button>
                                        <span className="px-3 min-w-[40px] text-center">{item.quantity || 1}</span>
                                        <button 
                                            onClick={() => handleQuantityChange(item.id, item.quantity, 1, item.size, item.color)} 
                                            className="px-2 py-1 hover:bg-gray-100 rounded-r-lg transition-colors"
                                        >
                                            <FiPlus size={12} />
                                        </button>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="font-semibold text-gray-900">
                                        {currencySymbol}{((item.price || 0) * (item.quantity || 1)).toFixed(2)}
                                    </p>
                                    <button 
                                        onClick={() => handleRemoveItem(item.id, item.size, item.color, item.name)} 
                                        className="mt-2 p-1 hover:bg-red-50 rounded-full transition-colors"
                                    >
                                        <RiDeleteBin3Line className="h-5 w-5 text-red-500 hover:text-red-700" />
                                    </button>
                                </div>
                            </div>
                        ))}
                        
                        {/* Cart Total */}
                        <div className="mt-6 pt-4 border-t">
                            <div className="flex justify-between text-lg font-bold">
                                <span>Total:</span>
                                <span className="text-blue-600">{currencySymbol}{getCartTotal().toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Buttons */}
            {cartItems && cartItems.length > 0 && (
                <div className="p-4 border-t bg-white sticky bottom-0 space-y-3">
                    <button 
                        onClick={handleCheckout}
                        disabled={isCheckingOut}
                        className="w-full bg-gray-900 text-white py-3 rounded-lg font-semibold hover:bg-gray-800 transition-colors disabled:opacity-50"
                    >
                        {isCheckingOut ? "Processing..." : "Proceed to Checkout"}
                    </button>
                    <button 
                        onClick={handleContinueShopping}
                        className="w-full border-2 border-gray-300 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
                    >
                        Continue Shopping
                    </button>
                    <p className="text-xs text-gray-500 text-center">
                        Shipping and taxes calculated at checkout.
                    </p>
                </div>
            )}
        </div>
    );
};

export default CartDrawer;