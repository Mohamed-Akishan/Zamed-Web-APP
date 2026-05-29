// src/pages/OrderSuccess.jsx
import { useEffect, useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { FiCheckCircle, FiShoppingBag, FiHome, FiStar } from "react-icons/fi";
import { toast } from "sonner";

const OrderSuccess = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [order, setOrder] = useState(null);
    const [currencySymbol, setCurrencySymbol] = useState("$");

    useEffect(() => {
        const siteSettings = JSON.parse(localStorage.getItem('site_settings') || '{}');
        const symbols = { USD: "$", EUR: "€", GBP: "£", LKR: "Rs" };
        setCurrencySymbol(symbols[siteSettings.currency] || "$");
        
        const stateOrder = location.state?.order;
        
        if (stateOrder) {
            setOrder(stateOrder);
            localStorage.removeItem('pendingCheckout');
        } else {
            const user = localStorage.getItem('user');
            if (user) {
                const userData = JSON.parse(user);
                const userOrders = JSON.parse(localStorage.getItem(`orders_${userData.email}`) || '[]');
                if (userOrders.length > 0) {
                    setOrder(userOrders[userOrders.length - 1]);
                } else {
                    const timer = setTimeout(() => {
                        navigate('/');
                    }, 3000);
                    return () => clearTimeout(timer);
                }
            } else {
                const guestOrders = JSON.parse(localStorage.getItem('guestOrders') || '[]');
                if (guestOrders.length > 0) {
                    setOrder(guestOrders[guestOrders.length - 1]);
                } else {
                    const timer = setTimeout(() => {
                        navigate('/');
                    }, 3000);
                    return () => clearTimeout(timer);
                }
            }
        }
    }, [location, navigate]);

    const handleReviewProduct = (productId, productName) => {
        navigate(`/product/${productId}#reviews`);
        setTimeout(() => {
            const reviewSection = document.getElementById('reviews-section');
            if (reviewSection) {
                reviewSection.scrollIntoView({ behavior: 'smooth' });
            }
        }, 500);
    };

    if (!order) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading order details...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-16">
            <div className="container mx-auto px-4 max-w-2xl">
                <div className="bg-white rounded-lg shadow-md p-8">
                    <div className="text-center">
                        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <FiCheckCircle className="w-10 h-10 text-green-500" />
                        </div>
                        <h1 className="text-2xl font-bold mb-2">Order Confirmed!</h1>
                        <p className="text-gray-600 mb-6">Thank you for your purchase</p>
                        
                        <div className="border-t border-b py-4 mb-6 text-left">
                            <p className="mb-2"><strong>Order ID:</strong> {order.id}</p>
                            <p className="mb-2"><strong>Date:</strong> {new Date(order.date).toLocaleDateString()}</p>
                            <p className="mb-2"><strong>Total Amount:</strong> {currencySymbol}{(order.total || 0).toFixed(2)}</p>
                            <p><strong>Status:</strong> <span className="text-green-600">{order.status || 'Processing'}</span></p>
                        </div>
                    </div>
                    
                    {/* Products in this order - Customer can review them */}
                    {order.itemsList && order.itemsList.length > 0 && (
                        <div className="mb-6">
                            <h3 className="font-semibold text-lg mb-3">Your Items</h3>
                            <div className="space-y-3">
                                {order.itemsList.map((item, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                        <div className="flex items-center gap-3">
                                            <img src={item.image} alt={item.name} className="w-12 h-12 object-cover rounded" />
                                            <div>
                                                <p className="font-medium">{item.name}</p>
                                                <p className="text-sm text-gray-500">Qty: {item.quantity}</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleReviewProduct(item.id, item.name)}
                                            className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm font-medium"
                                        >
                                            <FiStar size={14} /> Write a Review
                                        </button>
                                    </div>
                                ))}
                            </div>
                            <p className="text-xs text-gray-500 mt-3 text-center">
                                ⭐ Once your order is delivered, you can review your purchased products
                            </p>
                        </div>
                    )}
                    
                    <div className="flex gap-4">
                        <Link to="/profile" className="flex-1 bg-gray-900 text-white py-2 rounded-lg hover:bg-gray-800 transition-colors text-center">
                            View Orders
                        </Link>
                        <Link to="/collections/all" className="flex-1 border border-gray-900 text-gray-900 py-2 rounded-lg hover:bg-gray-900 hover:text-white transition-colors text-center">
                            Continue Shopping
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OrderSuccess;