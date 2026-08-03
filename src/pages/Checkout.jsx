// src/pages/Checkout.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import orderService from "../services/orderService";
import { toast } from "sonner";
import { 
    FiTruck, FiShield, FiCreditCard, FiMapPin, FiPhone, FiMail, 
    FiUser, FiArrowRight, FiCheckCircle, FiLock, FiCalendar, 
    FiPackage, FiClock, FiDollarSign, FiShoppingBag, FiTag,
    FiEdit2, FiTrash2, FiPlus, FiChevronRight, FiChevronDown,
    FiAlertCircle, FiSmartphone, FiGlobe, FiHome, FiHeart, FiDownload
} from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";


const ApplePayLogo = () => (
    <div className="flex items-center gap-1.5" aria-label="Apple Pay">
        <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden="true">
            <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.79 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.53 4.09ZM12.03 7.25C11.88 5.02 13.69 3.18 15.77 3c.29 2.58-2.34 4.5-3.74 4.25Z"/>
        </svg>
        <span className="text-lg font-semibold tracking-tight">Pay</span>
    </div>
);

const GooglePayLogo = () => (
    <div className="flex items-center gap-1.5" aria-label="Google Pay">
        <span className="text-lg font-bold tracking-tight"><span className="text-blue-500">G</span><span className="text-red-500">o</span><span className="text-yellow-500">o</span><span className="text-blue-500">g</span><span className="text-green-500">l</span><span className="text-red-500">e</span></span>
        <span className="text-lg font-medium text-gray-800">Pay</span>
    </div>
);

const PayPalLogo = () => (
    <div className="flex items-center gap-2" aria-label="PayPal">
        <div className="relative h-7 w-6">
            <span className="absolute left-0 top-0 text-2xl font-black italic text-blue-900">P</span>
            <span className="absolute left-1.5 top-0.5 text-2xl font-black italic text-sky-500">P</span>
        </div>
        <span className="text-lg font-bold italic text-blue-900">PayPal</span>
    </div>
);

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
    const [customerCoupons, setCustomerCoupons] = useState([]);
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
    const [productDetails, setProductDetails] = useState({});
    
    const [globalSettings, setGlobalSettings] = useState({
        shippingFee: 5,
        freeShippingThreshold: 100,
        taxRate: 10,
        deliveryInfoText: "Free delivery on orders over $100",
        returnPolicyText: "30-day easy returns",
        securePaymentText: "Secure payment"
    });
    
    // Delivery is automatically calculated from each product's
    // deliveryDays value configured in Admin > Products.

    
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
        if (!image) return '/images/no-image.svg';
        if (image.startsWith('data:') || image.startsWith('http')) return image;
        return '/images/no-image.svg';
    };

    // ------------------------------------------------------------------
    // PRODUCT DELIVERY HELPERS
    // ------------------------------------------------------------------

    const parseDeliveryDays = (value) => {
        const raw = String(value || "").trim();

        if (!raw) {
            return { min: 3, max: 5, label: "3-5 Days" };
        }

        const normalized = raw.toLowerCase();

        if (
            normalized.includes("same day") ||
            normalized.includes("today")
        ) {
            return { min: 0, max: 0, label: "Same Day" };
        }

        if (
            normalized.includes("next day") ||
            normalized.includes("24 hour")
        ) {
            return { min: 1, max: 1, label: "1 Day" };
        }

        const numbers = raw.match(/\d+/g)?.map(Number) || [];

        if (numbers.length >= 2) {
            const min = Math.min(numbers[0], numbers[1]);
            const max = Math.max(numbers[0], numbers[1]);

            return {
                min,
                max,
                label: `${min}-${max} Days`
            };
        }

        if (numbers.length === 1) {
            const days = numbers[0];

            return {
                min: days,
                max: days,
                label: `${days} Day${days === 1 ? "" : "s"}`
            };
        }

        return {
            min: 3,
            max: 5,
            label: raw
        };
    };

    const addDeliveryDays = (startDate, days) => {
        const result = new Date(startDate);
        result.setHours(12, 0, 0, 0);

        if (days > 0) {
            result.setDate(result.getDate() + days);
        }

        return result;
    };

    const formatDeliveryDate = (date) =>
        new Intl.DateTimeFormat("en-GB", {
            day: "numeric",
            month: "short"
        }).format(date);

    const getProductDeliveryInfo = (productId) => {
        const configured =
            productDetails?.[productId]?.deliveryDays ||
            "3-5";

        const parsed = parseDeliveryDays(configured);
        const today = new Date();

        const from = addDeliveryDays(today, parsed.min);
        const to = addDeliveryDays(today, parsed.max);

        let estimated = "";

        if (parsed.min === 0 && parsed.max === 0) {
            estimated = "Today";
        } else if (parsed.min === parsed.max) {
            estimated = formatDeliveryDate(to);
        } else {
            estimated =
                `${formatDeliveryDate(from)} - ${formatDeliveryDate(to)}`;
        }

        return {
            ...parsed,
            configured,
            estimated
        };
    };

    const getCartDeliverySchedule = () => {
        const products = (cartItems || []).map((item) => {
            const delivery = getProductDeliveryInfo(item.id);

            return {
                productId: item.id,
                name: item.name || "Product",
                image: item.image,
                quantity: item.quantity || 1,
                ...delivery
            };
        });

        if (!products.length) {
            const fallback = parseDeliveryDays("3-5");

            return {
                products: [],
                overall: {
                    ...fallback,
                    estimated:
                        `${formatDeliveryDate(
                            addDeliveryDays(new Date(), fallback.min)
                        )} - ${formatDeliveryDate(
                            addDeliveryDays(new Date(), fallback.max)
                        )}`
                }
            };
        }

        const overallMin = Math.max(
            ...products.map((item) => item.min)
        );

        const overallMax = Math.max(
            ...products.map((item) => item.max)
        );

        const from = addDeliveryDays(
            new Date(),
            overallMin
        );

        const to = addDeliveryDays(
            new Date(),
            overallMax
        );

        let estimated = "";

        if (overallMin === 0 && overallMax === 0) {
            estimated = "Today";
        } else if (overallMin === overallMax) {
            estimated = formatDeliveryDate(to);
        } else {
            estimated =
                `${formatDeliveryDate(from)} - ${formatDeliveryDate(to)}`;
        }

        return {
            products,
            overall: {
                min: overallMin,
                max: overallMax,
                label:
                    overallMin === overallMax
                        ? `${overallMax} Day${overallMax === 1 ? "" : "s"}`
                        : `${overallMin}-${overallMax} Days`,
                estimated
            }
        };
    };

    // Load product details
    const loadProductDetails = () => {
        const products = JSON.parse(localStorage.getItem('shop_products') || '[]');
        const detailsMap = {};
        products.forEach(product => {
            if (product.id) {
                detailsMap[product.id] = {
                    taxRate: product.taxRate !== undefined ? parseFloat(product.taxRate) : null,
                    shippingFee: product.shippingFee !== undefined ? parseFloat(product.shippingFee) : null,
                    freeShippingThreshold: product.freeShippingThreshold !== undefined ? parseFloat(product.freeShippingThreshold) : null,
                    deliveryDays: product.deliveryDays || null,
                    returnPolicy: product.returnPolicy || null
                };
            }
        });
        setProductDetails(detailsMap);
    };

    // Load ONLY coupons that the current customer is still eligible to use.
    // Used / expired / inactive / over-limit / ineligible coupons are hidden.
    const loadCustomerCoupons = () => {
        try {
            const userData = JSON.parse(
                localStorage.getItem('user') || 'null'
            );

            const rawEmail = userData?.email || '';
            const email = rawEmail.trim().toLowerCase();

            if (!email) {
                setCustomerCoupons([]);
                return;
            }

            const assignedCoupons = [
                ...JSON.parse(
                    localStorage.getItem(`user_coupons_${rawEmail}`) || '[]'
                ),
                ...JSON.parse(
                    localStorage.getItem(`user_coupons_${email}`) || '[]'
                )
            ];

            const adminCoupons = JSON.parse(
                localStorage.getItem('admin_coupons') || '[]'
            );

            // Merge without duplicate coupon codes.
            const merged = [...assignedCoupons, ...adminCoupons].reduce(
                (list, coupon) => {
                    const code = String(
                        coupon?.code || ''
                    )
                        .trim()
                        .toUpperCase();

                    if (
                        !code ||
                        list.some(
                            item =>
                                String(item.code)
                                    .trim()
                                    .toUpperCase() === code
                        )
                    ) {
                        return list;
                    }

                    list.push({
                        ...coupon,
                        code
                    });

                    return list;
                },
                []
            );

            const now = new Date();

            const usageKey = `coupon_usage_${email}`;

            let usage = {};

            try {
                usage = JSON.parse(
                    localStorage.getItem(usageKey) || '{}'
                );
            } catch {
                usage = {};
            }

            // Read previous orders for first-order-only eligibility.
            let userOrders = [];

            const orderKeys = [
                'orders',
                'all_orders',
                'customer_orders',
                `orders_${email}`
            ];

            orderKeys.forEach(key => {
                try {
                    const orders = JSON.parse(
                        localStorage.getItem(key) || '[]'
                    );

                    if (Array.isArray(orders)) {
                        userOrders.push(
                            ...orders.filter(order => {
                                const orderEmail = String(
                                    order.userEmail ||
                                    order.customerEmail ||
                                    order.email ||
                                    order.customer?.email ||
                                    ''
                                )
                                    .trim()
                                    .toLowerCase();

                                return orderEmail === email;
                            })
                        );
                    }
                } catch {
                    // Ignore malformed legacy order storage.
                }
            });

            const cartSubtotal = (cartItems || []).reduce(
                (sum, item) => {
                    const price =
                        typeof item.price === 'number'
                            ? item.price
                            : parseFloat(item.price) || 0;

                    const quantity =
                        Number(item.quantity) || 1;

                    return sum + price * quantity;
                },
                0
            );

            const eligibleCoupons = merged.filter(coupon => {
                const status = String(
                    coupon.status || 'active'
                ).toLowerCase();

                if (status !== 'active') {
                    return false;
                }

                const startDate = coupon.startDate
                    ? new Date(
                        `${String(coupon.startDate).split('T')[0]}T00:00:00`
                    )
                    : null;

                const endDate = coupon.endDate
                    ? new Date(
                        `${String(coupon.endDate).split('T')[0]}T23:59:59`
                    )
                    : null;

                if (
                    startDate &&
                    !Number.isNaN(startDate.getTime()) &&
                    now < startDate
                ) {
                    return false;
                }

                if (
                    endDate &&
                    !Number.isNaN(endDate.getTime()) &&
                    now > endDate
                ) {
                    return false;
                }

                const usageLimit =
                    coupon.usageLimit === null ||
                    coupon.usageLimit === '' ||
                    coupon.usageLimit === undefined
                        ? null
                        : Number(coupon.usageLimit);

                const usedCount =
                    Number(coupon.usedCount || 0);

                if (
                    usageLimit &&
                    usedCount >= usageLimit
                ) {
                    return false;
                }

                const perUserLimit =
                    Number(coupon.perUserLimit || 1);

                const customerUses =
                    Number(usage[coupon.code] || 0);

                if (
                    perUserLimit &&
                    customerUses >= perUserLimit
                ) {
                    return false;
                }

                if (
                    coupon.redemptionStatus === 'used' ||
                    Number(coupon.customerUsedCount || 0) >= perUserLimit
                ) {
                    return false;
                }

                if (
                    coupon.firstOrderOnly &&
                    userOrders.length > 0
                ) {
                    return false;
                }

                if (
                    coupon.memberOnly &&
                    !userData?.isPremiumMember &&
                    !userData?.premiumMember &&
                    userData?.membershipTier !== 'premium'
                ) {
                    return false;
                }

                const minPurchase =
                    Number(
                        coupon.minPurchase ??
                        coupon.minimumPurchase ??
                        0
                    ) || 0;

                if (
                    minPurchase > 0 &&
                    cartSubtotal < minPurchase
                ) {
                    return false;
                }

                const applicableProducts =
                    coupon.applicableProducts;

                const applicableCategories =
                    coupon.applicableCategories || [];

                const hasEligibleItem =
                    (cartItems || []).some(item => {
                        const productMatch =
                            !applicableProducts ||
                            applicableProducts === 'all' ||
                            (
                                Array.isArray(applicableProducts) &&
                                applicableProducts
                                    .map(String)
                                    .includes(String(item.id))
                            );

                        const categoryMatch =
                            !applicableCategories.length ||
                            applicableCategories.includes(
                                item.category
                            );

                        return productMatch && categoryMatch;
                    });

                if (!hasEligibleItem) {
                    return false;
                }

                return true;
            });

            setCustomerCoupons(eligibleCoupons);
        } catch (error) {
            console.error(
                'Error loading eligible customer coupons:',
                error
            );

            setCustomerCoupons([]);
        }
    };

    // Load settings with real-time updates
    const loadSettings = () => {
        try {
            const settings = JSON.parse(localStorage.getItem('site_settings') || '{}');
            const symbols = { USD: "$", EUR: "€", GBP: "£", LKR: "Rs" };
            setCurrencySymbol(symbols[settings.currency] || "$");
            setCurrencyCode(settings.currency || "USD");
            
            setGlobalSettings({
                shippingFee: settings.shippingFee !== undefined ? parseFloat(settings.shippingFee) : 5,
                freeShippingThreshold: settings.freeShippingThreshold !== undefined ? parseFloat(settings.freeShippingThreshold) : 100,
                taxRate: settings.taxRate !== undefined ? parseFloat(settings.taxRate) : 10,
                deliveryInfoText: settings.deliveryInfoText || "Free delivery on orders over $100",
                returnPolicyText: settings.returnPolicyText || "30-day easy returns",
                securePaymentText: settings.securePaymentText || "Secure payment"
            });
            
            // Load product details and coupons created/sent from Admin
            loadProductDetails();
            loadCustomerCoupons();
            
            // Load customer profile data.
            // Profile values are authoritative for name/contact/address.
            const userData = localStorage.getItem('user');
            const user = userData
                ? JSON.parse(userData)
                : null;

            if (user) {
                const profileName = getProfileDisplayName(user);
                const nameParts = profileName.trim().split(/\s+/);
                const profileAddress = normalizeProfileAddress(user);

                setFormData(prev => ({
                    ...prev,
                    firstName:
                        user.firstName ||
                        nameParts[0] ||
                        "",
                    lastName:
                        user.lastName ||
                        nameParts.slice(1).join(" ") ||
                        "",
                    email: user.email || "",
                    phone: profileAddress.phone || "",
                    address: profileAddress.address || "",
                    city: profileAddress.city || "",
                    state: profileAddress.state || "",
                    postalCode: profileAddress.postalCode || "",
                    country:
                        profileAddress.country ||
                        prev.country ||
                        "Sri Lanka"
                }));
            }

            // Load saved checkout addresses.
            let savedAddresses = JSON.parse(
                localStorage.getItem('checkout_addresses') || '[]'
            );

            // If Profile already has a complete delivery address,
            // use it automatically and do not make the customer re-enter it.
            if (user && profileHasDeliveryAddress(user)) {
                const profileAddress =
                    buildProfileCheckoutAddress(user);

                savedAddresses = [
                    profileAddress,
                    ...savedAddresses.filter(
                        address =>
                            address?.id !== "profile-address"
                    )
                ];

                setSelectedAddress(profileAddress);
            } else if (savedAddresses.length > 0) {
                const defaultAddr =
                    savedAddresses.find(a => a.isDefault) ||
                    savedAddresses[0];

                setSelectedAddress(defaultAddr);
            } else {
                setSelectedAddress(null);
            }

            setAddresses(savedAddresses);

            // Load saved cards
            const savedCardsList = JSON.parse(localStorage.getItem('saved_cards') || '[]');
            setSavedCards(savedCardsList);
            
            // Delivery is calculated automatically from Admin product settings.
            
        } catch (error) {
            console.error("Error loading settings:", error);
        }
    };

    // Load settings on mount and listen for changes
    useEffect(() => {
        loadSettings();

        // Listen for settings updates
        const handleSettingsUpdate = () => {
            console.log("🔄 Checkout: Settings updated, reloading...");
            loadSettings();
        };

        const handleProductsUpdate = () => {
            console.log("🔄 Checkout: Products updated, reloading product details...");
            loadProductDetails();
        };

        window.addEventListener('settingsSaved', handleSettingsUpdate);
        window.addEventListener('siteInfoUpdated', handleSettingsUpdate);
        window.addEventListener('currencyChanged', handleSettingsUpdate);
        window.addEventListener('productsUpdated', handleProductsUpdate);
        window.addEventListener('couponsUpdated', loadCustomerCoupons);
        window.addEventListener('couponReceived', loadCustomerCoupons);
        const handleStorage = (e) => {
            if (e.key === 'site_settings') {
                handleSettingsUpdate();
            }

            if (e.key === 'shop_products') {
                handleProductsUpdate();
            }

            if (
                e.key === 'admin_coupons' ||
                e.key?.startsWith('user_coupons_')
            ) {
                loadCustomerCoupons();
            }
        };

        window.addEventListener('storage', handleStorage);

        return () => {
            window.removeEventListener('settingsSaved', handleSettingsUpdate);
            window.removeEventListener('siteInfoUpdated', handleSettingsUpdate);
            window.removeEventListener('currencyChanged', handleSettingsUpdate);
            window.removeEventListener('productsUpdated', handleProductsUpdate);
            window.removeEventListener('couponsUpdated', loadCustomerCoupons);
            window.removeEventListener('couponReceived', loadCustomerCoupons);
            window.removeEventListener('storage', handleStorage);
        };
    }, []);

    // Re-evaluate coupon visibility whenever the cart changes.
    // This keeps minimum-spend and product/category eligibility accurate.
    useEffect(() => {
        loadCustomerCoupons();
    }, [cartItems]);

    // Get product-specific tax rate or fallback to global
    const getProductTaxRate = (productId) => {
        const product = productDetails[productId];
        if (product && product.taxRate !== null) {
            return product.taxRate;
        }
        return globalSettings.taxRate || 10;
    };

    // Get product-specific shipping fee or fallback to global
    const getProductShippingFee = (productId) => {
        const product = productDetails[productId];
        if (product && product.shippingFee !== null) {
            return product.shippingFee;
        }
        return globalSettings.shippingFee || 5;
    };

    // Get product-specific free shipping threshold or fallback to global
    const getProductFreeShippingThreshold = (productId) => {
        const product = productDetails[productId];
        if (product && product.freeShippingThreshold !== null) {
            return product.freeShippingThreshold;
        }
        return globalSettings.freeShippingThreshold || 100;
    };

    // Calculate totals with product-specific rates
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
    
    // Calculate shipping and tax with product-specific rates
    let totalShipping = 0;
    let totalTax = 0;
    let hasFreeShipping = false;
    let weightedTaxRate = 0;
    let totalWeighted = 0;
    
    cartItems.forEach(item => {
        const productTaxRate = getProductTaxRate(item.id);
        const productShippingFee = getProductShippingFee(item.id);
        const productFreeThreshold = getProductFreeShippingThreshold(item.id);
        
        const itemTotal = (typeof item.price === 'number' ? item.price : parseFloat(item.price) || 0) * (item.quantity || 1);
        
        // Calculate shipping for this item
        const threshold = isLKR ? productFreeThreshold * 100 : productFreeThreshold;
        const shippingFee = isLKR ? productShippingFee * 100 : productShippingFee;
        
        if (itemTotal >= threshold) {
            hasFreeShipping = true;
        } else {
            totalShipping += shippingFee;
        }
        
        // Calculate tax for this item
        totalTax += itemTotal * (productTaxRate / 100);
        
        // Weighted average tax rate for display
        totalWeighted += itemTotal;
        weightedTaxRate += (productTaxRate * itemTotal);
    });
    
    const averageTaxRate = totalWeighted > 0 ? (weightedTaxRate / totalWeighted) : (globalSettings.taxRate || 10);
    const shippingFee = hasFreeShipping ? 0 : totalShipping;
    const taxAmount = totalTax;
    const discountAmount = appliedCoupon?.discountAmount || 0;
    const total = subtotal + shippingFee + taxAmount - discountAmount;

    const deliverySchedule = getCartDeliverySchedule();
    const overallDelivery = deliverySchedule.overall;

    useEffect(() => {
        setFinalOrderTotal(total);
    }, [total, cartItems, productDetails]);

    useEffect(() => {
        setSelectedShipping({
            id: "product-delivery",
            label: "Product Delivery",
            days: overallDelivery.label,
            estimated: overallDelivery.estimated,
            price: shippingFee,
            icon: FiTruck
        });
    }, [
        overallDelivery.label,
        overallDelivery.estimated,
        shippingFee
    ]);

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

    // Coupon handling - Admin coupons + customer-assigned coupons
    const normalizeCoupon = (coupon) => ({
        ...coupon,
        code: String(coupon?.code || '').trim().toUpperCase(),
        discountType: coupon?.discountType || coupon?.type || 'percentage',
        discountValue: Number(coupon?.discountValue ?? coupon?.discount ?? 0),
        minPurchase: Number(coupon?.minPurchase ?? coupon?.minimumPurchase ?? 0),
        maxDiscount: coupon?.maxDiscount === null || coupon?.maxDiscount === '' || coupon?.maxDiscount === undefined
            ? null
            : Number(coupon.maxDiscount),
        usageLimit: coupon?.usageLimit === null || coupon?.usageLimit === '' || coupon?.usageLimit === undefined
            ? null
            : Number(coupon.usageLimit),
        perUserLimit: Number(coupon?.perUserLimit || 1),
        usedCount: Number(coupon?.usedCount || 0),
        status: coupon?.status || 'active'
    });

    const getCurrentUser = () => {
        try {
            return JSON.parse(localStorage.getItem('user') || 'null');
        } catch {
            return null;
        }
    };

    const getProfileDisplayName = (user = {}) => {
        return (
            user.name ||
            user.fullName ||
            `${user.firstName || ""} ${user.lastName || ""}`.trim() ||
            user.email?.split("@")?.[0] ||
            "Customer"
        );
    };

    const normalizeProfileAddress = (user = {}) => {
        const rawAddress = user.address;

        if (rawAddress && typeof rawAddress === "object") {
            return {
                address:
                    rawAddress.address ||
                    rawAddress.line1 ||
                    rawAddress.addressLine1 ||
                    "",
                city:
                    rawAddress.city || "",
                state:
                    rawAddress.state ||
                    rawAddress.county ||
                    rawAddress.province ||
                    "",
                postalCode:
                    rawAddress.postalCode ||
                    rawAddress.postcode ||
                    rawAddress.zip ||
                    "",
                country:
                    rawAddress.country ||
                    user.country ||
                    "",
                phone:
                    rawAddress.phone ||
                    user.phone ||
                    user.phoneNumber ||
                    ""
            };
        }

        return {
            address:
                typeof rawAddress === "string"
                    ? rawAddress
                    : user.addressLine1 || "",
            city: user.city || "",
            state:
                user.state ||
                user.county ||
                user.province ||
                "",
            postalCode:
                user.postalCode ||
                user.postcode ||
                user.zip ||
                "",
            country: user.country || "",
            phone:
                user.phone ||
                user.phoneNumber ||
                ""
        };
    };

    const profileHasDeliveryAddress = (user = {}) => {
        const address = normalizeProfileAddress(user);

        return Boolean(
            String(address.address || "").trim() &&
            String(address.city || "").trim() &&
            String(address.country || "").trim()
        );
    };

    const buildProfileCheckoutAddress = (user = {}) => {
        const normalized = normalizeProfileAddress(user);
        const displayName = getProfileDisplayName(user);
        const nameParts = displayName.trim().split(/\s+/);

        return {
            id: "profile-address",
            firstName:
                user.firstName ||
                nameParts[0] ||
                "",
            lastName:
                user.lastName ||
                nameParts.slice(1).join(" ") ||
                "",
            email: user.email || "",
            phone: normalized.phone || "",
            address: normalized.address || "",
            city: normalized.city || "",
            state: normalized.state || "",
            postalCode: normalized.postalCode || "",
            country: normalized.country || "",
            isDefault: true,
            source: "profile"
        };
    };

    const getSiteLogoForInvoice = () => {
        try {
            const siteInfo = JSON.parse(
                localStorage.getItem("site_info") || "{}"
            );

            const siteImages = JSON.parse(
                localStorage.getItem("site_images") || "{}"
            );

            const siteSettings = JSON.parse(
                localStorage.getItem("site_settings") || "{}"
            );

            return (
                siteImages.invoiceLogo ||
                siteImages.footerLogo ||
                siteImages.logo ||
                siteInfo.invoiceLogo ||
                siteInfo.footerLogo ||
                siteInfo.logo ||
                siteSettings.logo ||
                null
            );
        } catch {
            return null;
        }
    };

    const getSiteNameForInvoice = () => {
        try {
            const siteInfo = JSON.parse(
                localStorage.getItem("site_info") || "{}"
            );

            const siteSettings = JSON.parse(
                localStorage.getItem("site_settings") || "{}"
            );

            return (
                siteInfo.siteName ||
                siteInfo.name ||
                siteSettings.siteName ||
                siteSettings.storeName ||
                siteSettings.shopName ||
                siteSettings.name ||
                "Zamed Premium Wear"
            );
        } catch {
            return "Zamed Premium Wear";
        }
    };

    const getCouponUsageKey = (email) => `coupon_usage_${String(email || 'guest').toLowerCase()}`;

    const getUserCouponUsage = (email) => {
        try {
            return JSON.parse(localStorage.getItem(getCouponUsageKey(email)) || '{}');
        } catch {
            return {};
        }
    };

    const getEligibleSubtotal = (coupon) => {
        // Current Admin implementation uses "all" products. This also supports arrays
        // of product IDs or category names when you add those controls later.
        const applicableProducts = coupon.applicableProducts;
        const applicableCategories = coupon.applicableCategories || [];

        return cartItems.reduce((sum, item) => {
            const productMatch = !applicableProducts || applicableProducts === 'all' ||
                (Array.isArray(applicableProducts) && applicableProducts.map(String).includes(String(item.id)));
            const categoryMatch = !applicableCategories.length || applicableCategories.includes(item.category);
            if (!productMatch || !categoryMatch) return sum;
            const price = Number(item.price) || 0;
            const quantity = Number(item.quantity) || 1;
            return sum + price * quantity;
        }, 0);
    };

    const calculateCouponDiscount = (coupon, eligibleSubtotal) => {
        let discount = 0;
        const type = coupon.discountType;

        if (type === 'percentage') {
            discount = eligibleSubtotal * (coupon.discountValue / 100);
            if (coupon.maxDiscount !== null && Number.isFinite(coupon.maxDiscount)) {
                discount = Math.min(discount, coupon.maxDiscount);
            }
        } else if (type === 'fixed') {
            discount = Math.min(coupon.discountValue, eligibleSubtotal);
        } else if (type === 'shipping' || type === 'free_shipping') {
            discount = shippingFee;
        } else if (type === 'bogo' || type === 'buy_x_get_y') {
            // Buy 2 Get 1: discount the cheapest eligible unit.
            const eligibleUnits = cartItems
                .flatMap(item => Array.from({ length: Number(item.quantity) || 1 }, () => Number(item.price) || 0))
                .sort((a, b) => a - b);
            if (eligibleUnits.length >= 3) discount = eligibleUnits[0];
        }

        return Math.max(0, Math.min(discount, subtotal + shippingFee));
    };

    const applyCoupon = () => {
        const enteredCode = couponCode.trim().toUpperCase();
        setCouponError('');
        setCouponSuccess('');

        if (!enteredCode) {
            setCouponError('Please enter a coupon code');
            return;
        }

        const user = getCurrentUser();
        const rawEmail = user?.email || '';
        const email = rawEmail.toLowerCase();
        const assignedCoupons = email
            ? [
                ...JSON.parse(localStorage.getItem(`user_coupons_${rawEmail}`) || '[]'),
                ...JSON.parse(localStorage.getItem(`user_coupons_${email}`) || '[]')
            ]
            : [];
        const adminCoupons = JSON.parse(localStorage.getItem('admin_coupons') || '[]');
        const allCoupons = [...assignedCoupons, ...adminCoupons].map(normalizeCoupon);
        const coupon = allCoupons.find(
            item => item.code === enteredCode
        );

        if (!coupon) {
            setCouponError(
                'This coupon is not available for your account.'
            );
            return;
        }

        // Do not allow manually typing a coupon that Checkout has already
        // determined is not currently eligible.
        const visibleEligibleCoupon = customerCoupons.find(
            item =>
                String(item.code || '')
                    .trim()
                    .toUpperCase() === enteredCode
        );

        if (!visibleEligibleCoupon) {
            setCouponError(
                'This coupon is not currently eligible for this checkout.'
            );
            return;
        }

        const now = new Date();
        const startDate = coupon.startDate ? new Date(`${String(coupon.startDate).split('T')[0]}T00:00:00`) : null;
        const endDate = coupon.endDate ? new Date(`${String(coupon.endDate).split('T')[0]}T23:59:59`) : null;

        if (coupon.status !== 'active') {
            setCouponError('This coupon is currently inactive');
            return;
        }
        if (startDate && now < startDate) {
            setCouponError(`This coupon starts on ${startDate.toLocaleDateString()}`);
            return;
        }
        if (endDate && now > endDate) {
            setCouponError('This coupon has expired');
            return;
        }
        if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
            setCouponError('This coupon has reached its usage limit');
            return;
        }
        if (coupon.memberOnly && !user?.isPremiumMember && !user?.premiumMember && user?.membershipTier !== 'premium') {
            setCouponError('This offer is available to ZAMED Premium members only');
            return;
        }

        const usage = getUserCouponUsage(email);
        const customerUses = Number(usage[coupon.code] || 0);
        if (coupon.perUserLimit && customerUses >= coupon.perUserLimit) {
            setCouponError('You have already used this coupon');
            return;
        }

        const userOrders = JSON.parse(localStorage.getItem('orders') || '[]')
            .filter(order => String(order.userEmail || order.customerEmail || '').toLowerCase() === String(email || '').toLowerCase());
        if (coupon.firstOrderOnly && userOrders.length > 0) {
            setCouponError('This coupon is valid for first orders only');
            return;
        }

        const eligibleSubtotal = getEligibleSubtotal(coupon);
        if (eligibleSubtotal <= 0) {
            setCouponError('This coupon is not valid for the products in your cart');
            return;
        }
        if (eligibleSubtotal < coupon.minPurchase) {
            setCouponError(`Spend ${formatPrice(coupon.minPurchase)} to use this coupon`);
            return;
        }

        const discount = calculateCouponDiscount(coupon, eligibleSubtotal);
        if (discount <= 0) {
            setCouponError('This coupon does not provide a discount for the current cart');
            return;
        }

        const applied = {
            ...coupon,
            discountAmount: discount,
            eligibleSubtotal,
            appliedAt: new Date().toISOString()
        };
        setAppliedCoupon(applied);
        setCouponCode(coupon.code);
        setCouponSuccess(`Coupon ${coupon.code} applied — you saved ${formatPrice(discount)}`);
        toast.success(`Coupon applied! You saved ${formatPrice(discount)}`);
    };

    const removeCoupon = () => {
        setAppliedCoupon(null);
        setCouponCode('');
        setCouponError('');
        setCouponSuccess('');
        toast.info('Coupon removed');
    };

    const markCouponAsUsed = (coupon, orderId, customerEmail) => {
        if (!coupon?.code) return;
        const code = String(coupon.code).toUpperCase();
        const email = String(customerEmail || '').toLowerCase();

        // Update the global Admin coupon usage count.
        const adminCoupons = JSON.parse(localStorage.getItem('admin_coupons') || '[]');
        const updatedAdminCoupons = adminCoupons.map(item =>
            String(item.code || '').toUpperCase() === code
                ? { ...item, usedCount: Number(item.usedCount || 0) + 1, updatedAt: new Date().toISOString() }
                : item
        );
        localStorage.setItem('admin_coupons', JSON.stringify(updatedAdminCoupons));

        // Update the coupon shown in Profile → Coupons.
        if (email) {
            const key = `user_coupons_${email}`;
            const assigned = JSON.parse(localStorage.getItem(key) || '[]');
            const updatedAssigned = assigned.map(item =>
                String(item.code || '').toUpperCase() === code
                    ? {
                        ...item,
                        customerUsedCount: Number(item.customerUsedCount || 0) + 1,
                        lastUsedAt: new Date().toISOString(),
                        lastOrderId: orderId,
                        redemptionStatus: 'used'
                    }
                    : item
            );
            localStorage.setItem(key, JSON.stringify(updatedAssigned));

            const usage = getUserCouponUsage(email);
            usage[code] = Number(usage[code] || 0) + 1;
            localStorage.setItem(getCouponUsageKey(email), JSON.stringify(usage));

            const notificationKey = `notifications_${email}`;
            const notifications = JSON.parse(localStorage.getItem(notificationKey) || '[]');
            notifications.unshift({
                id: Date.now(),
                title: 'Coupon successfully redeemed',
                message: `${code} saved you ${formatPrice(coupon.discountAmount)} on order ${orderId}.`,
                type: 'coupon',
                date: new Date().toISOString(),
                read: false,
                couponCode: code,
                orderId
            });
            localStorage.setItem(notificationKey, JSON.stringify(notifications.slice(0, 50)));
        }

        window.dispatchEvent(
            new CustomEvent('couponsUpdated', {
                detail: { code }
            })
        );

        window.dispatchEvent(
            new CustomEvent('couponReceived', {
                detail: {
                    email,
                    couponCode: code
                }
            })
        );

        // Remove the redeemed coupon from Checkout immediately.
        loadCustomerCoupons();
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
                const currentUser = getCurrentUser();

                if (
                    currentUser &&
                    profileHasDeliveryAddress(currentUser)
                ) {
                    const profileAddress =
                        buildProfileCheckoutAddress(currentUser);

                    setSelectedAddress(profileAddress);

                    setAddresses(prev => [
                        profileAddress,
                        ...prev.filter(
                            address =>
                                address?.id !== "profile-address"
                        )
                    ]);

                    setCurrentStep(3);

                    window.scrollTo({
                        top: 0,
                        behavior: 'smooth'
                    });

                    return;
                }

                toast.error(
                    "Please add a delivery address to your profile or checkout."
                );
                setShowAddAddress(true);
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
            
            // Calculate product-specific shipping and tax
            let finalShippingFee = 0;
            let finalTaxAmount = 0;
            let hasFreeShipping = false;
            
            currentCartItems.forEach(item => {
                const productTaxRate = getProductTaxRate(item.id);
                const productShippingFee = getProductShippingFee(item.id);
                const productFreeThreshold = getProductFreeShippingThreshold(item.id);
                const itemTotal = (typeof item.price === 'number' ? item.price : parseFloat(item.price) || 0) * (item.quantity || 1);
                
                const threshold = isLKR ? productFreeThreshold * 100 : productFreeThreshold;
                const shippingFee = isLKR ? productShippingFee * 100 : productShippingFee;
                
                if (itemTotal >= threshold) {
                    hasFreeShipping = true;
                } else {
                    finalShippingFee += shippingFee;
                }
                
                finalTaxAmount += itemTotal * (productTaxRate / 100);
            });
            
            const finalShippingFeeAmount = hasFreeShipping ? 0 : finalShippingFee;
            const finalDiscountAmount = appliedCoupon?.discountAmount || 0;
            const finalTotalAmount = finalSubtotal + finalShippingFeeAmount + finalTaxAmount - finalDiscountAmount;
            
            const orderData = {
                id: orderId,
                userEmail: user?.email || formData.email,
                customerName:
                    getProfileDisplayName(user || {}) ||
                    (selectedAddress
                        ? `${selectedAddress.firstName || ""} ${selectedAddress.lastName || ""}`.trim()
                        : `${formData.firstName || ""} ${formData.lastName || ""}`.trim()),
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
                    image: getValidImageUrl(item.image),
                    taxRate: getProductTaxRate(item.id),
                    shippingFee: getProductShippingFee(item.id),
                    freeShippingThreshold: getProductFreeShippingThreshold(item.id),
                    deliveryDays:
                        productDetails[item.id]?.deliveryDays || "3-5",
                    estimatedDelivery:
                        getProductDeliveryInfo(item.id).estimated
                })),
                subtotal: finalSubtotal,
                shippingFee: finalShippingFeeAmount,
                shippingMethod: "Product Delivery",
                taxRate: averageTaxRate,
                taxAmount: finalTaxAmount,
                discount: finalDiscountAmount,
                couponCode: appliedCoupon?.code,
                total: finalTotalAmount,
                status: "pending",
                paymentMethod: formData.paymentMethod === 'card' ? 'Credit Card' : 
                              formData.paymentMethod === 'paypal' ? 'PayPal' :
                              formData.paymentMethod === 'apple_pay' ? 'Apple Pay' :
                              formData.paymentMethod === 'google_pay' ? 'Google Pay' : 'Cash on Delivery',
                paymentStatus:
                    formData.paymentMethod === 'cod'
                        ? 'not_paid'
                        : 'paid',
                date: new Date().toISOString(),
                deliveryDate: formData.deliveryDate,
                deliveryStatus: "scheduled",
                estimatedDelivery: overallDelivery.estimated,
                deliveryDays: overallDelivery.label,
                hasFreeShipping: hasFreeShipping
            };
            
            // Use orderService to save the order
            const saved = await orderService.saveOrder(orderData);
            
            if (saved) {
                if (appliedCoupon) {
                    markCouponAsUsed(appliedCoupon, orderId, user?.email || formData.email);
                }

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

    const AnimatedMoney = ({
        value,
        className = ""
    }) => {
        const numericValue =
            typeof value === "number"
                ? value
                : parseFloat(value) || 0;

        return (
            <span className={`relative inline-flex overflow-hidden ${className}`}>
                <AnimatePresence mode="popLayout" initial={false}>
                    <motion.span
                        key={numericValue.toFixed(2)}
                        initial={{
                            opacity: 0,
                            y: 14,
                            scale: 0.96
                        }}
                        animate={{
                            opacity: 1,
                            y: 0,
                            scale: 1
                        }}
                        exit={{
                            opacity: 0,
                            y: -14,
                            scale: 0.96
                        }}
                        transition={{
                            duration: 0.28,
                            ease: [0.22, 1, 0.36, 1]
                        }}
                    >
                        {formatPrice(numericValue)}
                    </motion.span>
                </AnimatePresence>
            </span>
        );
    };

    const getPaymentDisplay = (order = {}) => {
        const paymentMethod =
            order.paymentMethod ||
            (formData.paymentMethod === "card"
                ? "Credit Card"
                : formData.paymentMethod === "paypal"
                ? "PayPal"
                : formData.paymentMethod === "apple_pay"
                ? "Apple Pay"
                : formData.paymentMethod === "google_pay"
                ? "Google Pay"
                : "Cash on Delivery");

        const isCashOnDelivery =
            String(paymentMethod).toLowerCase().includes("cash") ||
            formData.paymentMethod === "cod";

        const paymentStatus =
            order.paymentStatus ||
            (isCashOnDelivery ? "not_paid" : "paid");

        return {
            paymentMethod,
            paymentStatus,
            isCashOnDelivery,
            paymentStatusLabel:
                paymentStatus === "paid"
                    ? "PAID"
                    : "NOT PAID"
        };
    };

    const downloadInvoice = () => {
        const invoiceOrder = orderDetails || {};
        const payment = getPaymentDisplay(invoiceOrder);
        const siteLogo = getSiteLogoForInvoice();
        const siteName = getSiteNameForInvoice();

        const invoiceSubtotal =
            invoiceOrder.subtotal ?? subtotal;

        const invoiceShipping =
            invoiceOrder.shippingFee ?? shippingFee;

        const invoiceTax =
            invoiceOrder.taxAmount ?? taxAmount;

        const invoiceDiscount =
            invoiceOrder.discount ?? discountAmount;

        const invoiceTotal =
            invoiceOrder.total ?? finalOrderTotal;

        const invoiceItems =
            Array.isArray(invoiceOrder.itemsList)
                ? invoiceOrder.itemsList
                : [];

        const profileUser = getCurrentUser() || {};
        const profileAddress =
            normalizeProfileAddress(profileUser);

        const customerName =
            getProfileDisplayName(profileUser) ||
            invoiceOrder.customerName ||
            `${formData.firstName || ""} ${formData.lastName || ""}`.trim() ||
            "Customer";

        const customerEmail =
            profileUser.email ||
            invoiceOrder.customerEmail ||
            formData.email ||
            "";

        const customerPhone =
            profileAddress.phone ||
            invoiceOrder.customerPhone ||
            formData.phone ||
            "";

        const profileShippingAddress = [
            profileAddress.address,
            profileAddress.city,
            profileAddress.state,
            profileAddress.postalCode,
            profileAddress.country
        ]
            .filter(Boolean)
            .join(", ");

        const shippingAddress =
            profileShippingAddress ||
            invoiceOrder.shippingAddress ||
            "";

        const orderDate =
            invoiceOrder.date
                ? new Date(invoiceOrder.date)
                : new Date();

        const safe = (value) =>
            String(value ?? "")
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#039;");

        const rows = invoiceItems
            .map((item) => {
                const lineTotal =
                    (Number(item.price) || 0) *
                    (Number(item.quantity) || 1);

                return `
                    <tr>
                        <td>
                            <div class="item-name">${safe(item.name || "Product")}</div>
                            <div class="item-meta">
                                ${item.size ? `Size: ${safe(item.size)}` : ""}
                                ${item.color ? ` · Color: ${safe(item.color)}` : ""}
                            </div>
                        </td>
                        <td>${Number(item.quantity) || 1}</td>
                        <td>${safe(formatPrice(Number(item.price) || 0))}</td>
                        <td class="amount">${safe(formatPrice(lineTotal))}</td>
                    </tr>
                `;
            })
            .join("");

        const statusClass =
            payment.paymentStatus === "paid"
                ? "paid"
                : "not-paid";

        const invoiceHtml = `
<!doctype html>
<html>
<head>
    <meta charset="utf-8" />
    <title>Invoice ${safe(orderId || invoiceOrder.id || "")}</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
        * { box-sizing: border-box; }
        body {
            margin: 0;
            padding: 32px;
            background: #f4f5f7;
            color: #171717;
            font-family: "Times New Roman", Times, serif;
        }
        .invoice {
            max-width: 900px;
            margin: 0 auto;
            background: #fff;
            border-radius: 24px;
            overflow: hidden;
            box-shadow: 0 25px 70px rgba(0,0,0,.08);
        }
        .top {
            padding: 34px;
            color: #fff;
            background:
                linear-gradient(135deg,#111827,#1f2937 60%,#7c2d12);
        }
        .brand {
            display: flex;
            align-items: center;
            gap: 16px;
        }
        .brand-logo {
            max-width: 150px;
            max-height: 64px;
            object-fit: contain;
            object-position: left center;
            display: block;
        }
        .brand-text {
            min-width: 0;
        }
        .brand-name {
            font-size: 29px;
            line-height: 1.05;
            font-weight: 900;
            letter-spacing: .02em;
            color: #ffffff;
        }
        .brand small {
            display: block;
            margin-top: 6px;
            font-size: 10px;
            letter-spacing: .22em;
            opacity: .72;
            text-transform: uppercase;
        }
        .invoice-title {
            margin-top: 28px;
            display: flex;
            align-items: flex-end;
            justify-content: space-between;
            gap: 20px;
        }
        .invoice-title h1 {
            margin: 0;
            font-size: 34px;
        }
        .invoice-title p {
            margin: 6px 0 0;
            opacity: .7;
            font-size: 13px;
        }
        .status {
            display: inline-block;
            padding: 8px 14px;
            border-radius: 999px;
            font-size: 12px;
            font-weight: 900;
            letter-spacing: .08em;
        }
        .status.paid {
            background: #dcfce7;
            color: #166534;
        }
        .status.not-paid {
            background: #fff7ed;
            color: #c2410c;
        }
        .content { padding: 34px; }
        .grid {
            display: grid;
            grid-template-columns: repeat(2,minmax(0,1fr));
            gap: 18px;
            margin-bottom: 28px;
        }
        .card {
            border: 1px solid #ececec;
            border-radius: 16px;
            padding: 18px;
            background: #fafafa;
        }
        .label {
            font-size: 10px;
            font-weight: 800;
            color: #888;
            text-transform: uppercase;
            letter-spacing: .14em;
            margin-bottom: 7px;
        }
        .value {
            font-size: 14px;
            line-height: 1.5;
            font-weight: 700;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
        }
        th {
            text-align: left;
            font-size: 10px;
            letter-spacing: .1em;
            text-transform: uppercase;
            color: #8a8a8a;
            padding: 12px 10px;
            border-bottom: 1px solid #eee;
        }
        td {
            padding: 14px 10px;
            border-bottom: 1px solid #f0f0f0;
            font-size: 13px;
            vertical-align: top;
        }
        td.amount { font-weight: 800; text-align: right; }
        .item-name { font-weight: 800; }
        .item-meta {
            margin-top: 3px;
            color: #888;
            font-size: 11px;
        }
        .summary {
            width: min(420px,100%);
            margin-left: auto;
            margin-top: 26px;
        }
        .summary-row {
            display: flex;
            justify-content: space-between;
            gap: 20px;
            padding: 8px 0;
            font-size: 14px;
        }
        .summary-row.discount { color: #dc2626; }
        .summary-row.total {
            margin-top: 8px;
            padding-top: 16px;
            border-top: 2px solid #111;
            font-size: 20px;
            font-weight: 900;
            color: #15803d;
        }
        .payment-note {
            margin-top: 28px;
            padding: 18px;
            border-radius: 16px;
            background: ${
                payment.isCashOnDelivery
                    ? "#fff7ed"
                    : "#f0fdf4"
            };
            border: 1px solid ${
                payment.isCashOnDelivery
                    ? "#fed7aa"
                    : "#bbf7d0"
            };
        }
        .payment-note strong {
            display: block;
            margin-bottom: 5px;
            color: ${
                payment.isCashOnDelivery
                    ? "#c2410c"
                    : "#166534"
            };
        }
        .footer {
            margin-top: 30px;
            padding-top: 18px;
            border-top: 1px solid #eee;
            color: #888;
            font-size: 11px;
            text-align: center;
        }
        @media print {
            body {
                background: #fff;
                padding: 0;
            }
            .invoice {
                box-shadow: none;
                border-radius: 0;
            }
        }
        @media (max-width: 640px) {
            body { padding: 10px; }
            .grid { grid-template-columns: 1fr; }
            .content, .top { padding: 22px; }
        }
    </style>
</head>
<body>
    <div class="invoice">
        <div class="top">
            <div class="brand">
                ${
                    siteLogo
                        ? `<img
                            src="${safe(siteLogo)}"
                            alt="${safe(siteName)}"
                            class="brand-logo"
                        />`
                        : ""
                }

                <div class="brand-text">
                    <div class="brand-name">
                        ${safe(siteName)}
                    </div>
                    <small>Official Order Invoice</small>
                </div>
            </div>

            <div class="invoice-title">
                <div>
                    <h1>Invoice</h1>
                    <p>Order #${safe(orderId || invoiceOrder.id || "")}</p>
                </div>

                <span class="status ${statusClass}">
                    ${safe(payment.paymentStatusLabel)}
                </span>
            </div>
        </div>

        <div class="content">
            <div class="grid">
                <div class="card">
                    <div class="label">Customer</div>
                    <div class="value">
                        <strong>${safe(customerName)}</strong><br/>
                        ${safe(customerEmail)}<br/>
                        ${safe(customerPhone || "Phone not provided")}
                    </div>
                </div>

                <div class="card">
                    <div class="label">Order Information</div>
                    <div class="value">
                        Date: ${safe(orderDate.toLocaleString("en-GB"))}<br/>
                        Delivery: ${safe(invoiceOrder.estimatedDelivery || overallDelivery.estimated)}<br/>
                        Method: ${safe(invoiceOrder.shippingMethod || "Product Delivery")}
                    </div>
                </div>

                <div class="card">
                    <div class="label">Payment Method</div>
                    <div class="value">
                        ${safe(payment.paymentMethod)}<br/>
                        Payment Status: ${safe(payment.paymentStatusLabel)}
                    </div>
                </div>

                <div class="card">
                    <div class="label">Delivery Address</div>
                    <div class="value">
                        ${safe(shippingAddress || "Not provided")}
                    </div>
                </div>
            </div>

            <table>
                <thead>
                    <tr>
                        <th>Item</th>
                        <th>Qty</th>
                        <th>Unit Price</th>
                        <th style="text-align:right">Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows || `
                        <tr>
                            <td colspan="4">Order items unavailable</td>
                        </tr>
                    `}
                </tbody>
            </table>

            <div class="summary">
                <div class="summary-row">
                    <span>Subtotal</span>
                    <strong>${safe(formatPrice(invoiceSubtotal))}</strong>
                </div>

                <div class="summary-row">
                    <span>Shipping</span>
                    <strong>
                        ${invoiceShipping === 0
                            ? "Free"
                            : safe(formatPrice(invoiceShipping))}
                    </strong>
                </div>

                <div class="summary-row">
                    <span>Tax</span>
                    <strong>${safe(formatPrice(invoiceTax))}</strong>
                </div>

                ${
                    invoiceDiscount > 0
                        ? `
                        <div class="summary-row discount">
                            <span>Coupon Discount</span>
                            <strong>-${safe(formatPrice(invoiceDiscount))}</strong>
                        </div>
                        `
                        : ""
                }

                <div class="summary-row total">
                    <span>
                        ${
                            payment.isCashOnDelivery
                                ? "Amount Due"
                                : "Total Paid"
                        }
                    </span>
                    <span>${safe(formatPrice(invoiceTotal))}</span>
                </div>
            </div>

            <div class="payment-note">
                <strong>
                    ${
                        payment.isCashOnDelivery
                            ? "Cash on Delivery — NOT PAID"
                            : `${safe(payment.paymentMethod)} — PAID`
                    }
                </strong>

                ${
                    payment.isCashOnDelivery
                        ? `Please pay ${safe(formatPrice(invoiceTotal))} when your order is delivered.`
                        : "Payment has been recorded for this order."
                }
            </div>

            <div class="footer">
                Thank you for shopping with Zamed Premium Wear.
            </div>
        </div>
    </div>

    <script>
        window.onload = function () {
            setTimeout(function () {
                window.print();
            }, 350);
        };
    </script>
</body>
</html>`;

        const invoiceWindow = window.open(
            "",
            "_blank",
            "width=980,height=900"
        );

        if (!invoiceWindow) {
            toast.error(
                "Please allow pop-ups to download the invoice."
            );
            return;
        }

        invoiceWindow.document.open();
        invoiceWindow.document.write(invoiceHtml);
        invoiceWindow.document.close();
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
        const displaySubtotal = displayOrder.subtotal ?? subtotal;
        const displayShipping = displayOrder.shippingFee ?? shippingFee;
        const displayTax = displayOrder.taxAmount ?? taxAmount;
        const displayDiscount = displayOrder.discount ?? discountAmount;
        const displayTotal = displayOrder.total ?? finalOrderTotal;
        
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
                            <p className="mb-2">
                                <strong>Estimated Delivery:</strong>{" "}
                                {displayOrder.estimatedDelivery ||
                                    overallDelivery.estimated}
                            </p>
                            {(() => {
                                const payment = getPaymentDisplay(displayOrder);

                                return (
                                    <>
                                        <p className="mb-2">
                                            <strong>Payment Method:</strong>{" "}
                                            {payment.paymentMethod}
                                        </p>

                                        <p className="mb-2">
                                            <strong>Payment Status:</strong>{" "}
                                            <span
                                                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-black ${
                                                    payment.paymentStatus === "paid"
                                                        ? "bg-green-100 text-green-700"
                                                        : "bg-orange-100 text-orange-700"
                                                }`}
                                            >
                                                {payment.paymentStatusLabel}
                                            </span>
                                        </p>

                                        <p>
                                            <strong>
                                                {payment.isCashOnDelivery
                                                    ? "Amount Due:"
                                                    : "Total Amount:"}
                                            </strong>{" "}
                                            <AnimatedMoney
                                                value={displayTotal}
                                                className="text-xl font-black text-green-600"
                                            />
                                        </p>
                                    </>
                                );
                            })()}
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
                                    <span>Tax ({displayOrder.taxRate?.toFixed(1) || globalSettings.taxRate}%):</span>
                                    <span>{formatPrice(displayTax)}</span>
                                </div>
                                {displayDiscount > 0 && (
                                    <div className="flex justify-between text-green-600">
                                        <span>Discount:</span>
                                        <span>-{formatPrice(displayDiscount)}</span>
                                    </div>
                                )}
                                {displayOrder.hasFreeShipping && (
                                    <div className="text-green-600 text-xs text-center py-1 bg-green-50 rounded-lg">
                                        ✨ Free Shipping Applied! ✨
                                    </div>
                                )}
                                <div className="border-t pt-3 mt-2">
                                    {(() => {
                                        const payment = getPaymentDisplay(displayOrder);

                                        return (
                                            <div className="flex items-center justify-between gap-4 font-bold">
                                                <div>
                                                    <span>
                                                        {payment.isCashOnDelivery
                                                            ? "Amount Due"
                                                            : "Total Paid"}
                                                    </span>

                                                    <p
                                                        className={`mt-1 text-[10px] font-black uppercase tracking-[0.16em] ${
                                                            payment.paymentStatus === "paid"
                                                                ? "text-green-600"
                                                                : "text-orange-600"
                                                        }`}
                                                    >
                                                        {payment.paymentStatusLabel}
                                                    </p>
                                                </div>

                                                <AnimatedMoney
                                                    value={displayTotal}
                                                    className="text-lg font-black text-green-600"
                                                />
                                            </div>
                                        );
                                    })()}
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
                                                    <p className="text-[10px] text-gray-400">Tax: {item.taxRate || globalSettings.taxRate}%</p>
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
                            onClick={downloadInvoice}
                            className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-black text-gray-800 shadow-sm transition-all hover:-translate-y-0.5 hover:border-orange-300 hover:bg-orange-50 hover:text-orange-700 hover:shadow-md"
                        >
                            <FiDownload />
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
        <div className="checkout-premium min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(245,197,66,0.18),_transparent_32%),radial-gradient(circle_at_bottom_right,_rgba(59,130,246,0.12),_transparent_30%),linear-gradient(135deg,#f8fafc_0%,#fffaf0_45%,#f1f5f9_100%)] py-10">
            <style>{`
                .checkout-premium { font-family: "Times New Roman", Times, serif; }
                .checkout-premium h1, .checkout-premium h2, .checkout-premium h3 { font-family: "Times New Roman", Times, serif; letter-spacing: normal; }
                .checkout-3d-card { transform-style: preserve-3d; transition: transform .35s ease, box-shadow .35s ease, border-color .35s ease; }
                .checkout-3d-card:hover { transform: translateY(-4px) rotateX(.35deg); box-shadow: 0 34px 90px rgba(15,23,42,.16); border-color: rgba(245,158,11,.38); }
                .preserve-3d { transform-style: preserve-3d; perspective: 900px; }
                .checkout-premium input, .checkout-premium select, .checkout-premium textarea { transition: border-color .2s ease, box-shadow .2s ease, transform .2s ease; }
                .checkout-premium input:focus, .checkout-premium select:focus, .checkout-premium textarea:focus { border-color: rgb(245 158 11); box-shadow: 0 0 0 4px rgba(245,158,11,.13); outline: none; }
            `}</style>
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
                                className="checkout-3d-card rounded-[28px] border border-white/70 bg-white/75 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.12)] backdrop-blur-xl"
                            >
                                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                                    <FiShoppingBag className="text-blue-600" /> Review Cart Items ({cartItems.length} items)
                                </h2>
                                
                                <div className="space-y-4 max-h-96 overflow-y-auto">
                                    {cartItems.map((item, index) => {
                                        const itemPrice = typeof item.price === 'number' ? item.price : parseFloat(item.price) || 0;
                                        const itemTotal = itemPrice * (item.quantity || 1);
                                        const productTaxRate = getProductTaxRate(item.id);
                                        return (
                                            <div key={item.id || index} className="flex gap-4 p-4 border rounded-xl">
                                                <img 
                                                    src={getValidImageUrl(item.image)} 
                                                    alt={item.name} 
                                                    className="w-20 h-20 object-cover rounded-lg"
                                                    onError={(e) => { e.target.src = '/images/no-image.svg'; }}
                                                />
                                                <div className="flex-1">
                                                    <div className="flex justify-between">
                                                        <div>
                                                            <h3 className="font-semibold">{item.name}</h3>
                                                            <p className="text-sm text-gray-500">Size: {item.size} | Color: {item.color}</p>
                                                            <p className="text-xs text-gray-400">Tax: {productTaxRate}%</p>
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

                        {/* Step 2: Delivery Address - Same as before */}
                        {currentStep === 2 && (
                            <motion.div
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="checkout-3d-card rounded-[28px] border border-white/70 bg-white/75 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.12)] backdrop-blur-xl"
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

                        {/* Step 3: Shipping Method - Same as before */}
                        {currentStep === 3 && (
                            <motion.div
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="checkout-3d-card rounded-[28px] border border-white/70 bg-white/75 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.12)] backdrop-blur-xl"
                            >
                                <div className="mb-5 flex items-start justify-between gap-4">
                                    <div>
                                        <h2 className="flex items-center gap-2 text-xl font-semibold">
                                            <FiTruck className="text-blue-600" />
                                            Delivery
                                        </h2>
                                        <p className="mt-1 text-sm text-gray-500">
                                            Delivery time is automatically taken from each product configured by Admin.
                                        </p>
                                    </div>

                                    <div className="rounded-full bg-green-50 px-3 py-1.5 text-xs font-bold text-green-700">
                                        {shippingFee === 0
                                            ? "Free Delivery"
                                            : formatPrice(shippingFee)}
                                    </div>
                                </div>

                                <div className="mb-5 overflow-hidden rounded-2xl border-2 border-blue-500 bg-gradient-to-r from-blue-50 to-indigo-50">
                                    <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg">
                                                <FiPackage size={23} />
                                            </div>

                                            <div>
                                                <p className="font-black text-gray-900">
                                                    Your Order Delivery
                                                </p>
                                                <p className="mt-1 text-sm font-medium text-gray-600">
                                                    Delivery in {overallDelivery.label}
                                                </p>
                                                <p className="mt-1 text-xs font-semibold text-green-700">
                                                    Estimated: {overallDelivery.estimated}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="text-left sm:text-right">
                                            <p className="font-black text-gray-900">
                                                {shippingFee === 0
                                                    ? "Free"
                                                    : formatPrice(shippingFee)}
                                            </p>

                                            {hasFreeShipping && (
                                                <p className="mt-1 text-xs font-semibold text-green-600">
                                                    Free shipping applied
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <div className="mb-3 flex items-center justify-between gap-3">
                                        <h3 className="text-sm font-black text-gray-900">
                                            Delivery by product
                                        </h3>

                                        <span className="text-xs text-gray-400">
                                            Admin → Products
                                        </span>
                                    </div>

                                    <div className="space-y-3">
                                        {deliverySchedule.products.map((delivery) => (
                                            <div
                                                key={`${delivery.productId}-${delivery.name}`}
                                                className="flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
                                            >
                                                <img
                                                    src={getValidImageUrl(delivery.image)}
                                                    alt={delivery.name}
                                                    className="h-16 w-16 shrink-0 rounded-xl border border-gray-100 bg-gray-50 object-cover"
                                                />

                                                <div className="min-w-0 flex-1">
                                                    <p className="truncate text-sm font-bold text-gray-900">
                                                        {delivery.name}
                                                    </p>

                                                    <p className="mt-1 text-xs text-gray-500">
                                                        Qty: {delivery.quantity}
                                                    </p>

                                                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
                                                        <span className="flex items-center gap-1.5 text-xs font-semibold text-blue-700">
                                                            <FiClock />
                                                            {delivery.label}
                                                        </span>

                                                        <span className="flex items-center gap-1.5 text-xs font-semibold text-green-700">
                                                            <FiCalendar />
                                                            {delivery.estimated}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="mt-5 flex gap-3 rounded-2xl border border-amber-100 bg-amber-50 p-4">
                                    <FiAlertCircle className="mt-0.5 shrink-0 text-amber-600" />

                                    <p className="text-xs leading-5 text-amber-800">
                                        If products have different delivery times,
                                        the overall order estimate uses the longest delivery time.
                                    </p>
                                </div>
                            </motion.div>
                        )}

                        {/* Step 4: Payment Method - Same as before */}
                        {currentStep === 4 && (
                            <motion.div
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="checkout-3d-card rounded-[28px] border border-white/70 bg-white/75 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.12)] backdrop-blur-xl"
                            >
                                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                                    <FiCreditCard className="text-blue-600" /> Payment Method
                                </h2>
                                
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {[
                                            { id: "card", label: "Credit / Debit Card", subtitle: "Visa, Mastercard & Amex", logo: <div className="flex items-center gap-2"><FiCreditCard size={24} /><span className="font-semibold">Card</span></div> },
                                            { id: "apple_pay", label: "Apple Pay", subtitle: "Fast checkout with Touch ID", logo: <ApplePayLogo /> },
                                            { id: "google_pay", label: "Google Pay", subtitle: "Pay securely with Google", logo: <GooglePayLogo /> },
                                            { id: "paypal", label: "PayPal", subtitle: "Use your PayPal balance", logo: <PayPalLogo /> },
                                            { id: "cod", label: "Cash on Delivery", subtitle: "Pay when your order arrives", logo: <div className="flex items-center gap-2"><FiHome size={24} /><span className="font-semibold">Cash</span></div> }
                                        ].map((method) => {
                                            const selected = formData.paymentMethod === method.id;
                                            return (
                                                <motion.label
                                                    key={method.id}
                                                    whileHover={{ y: -5, rotateX: 2, rotateY: -2 }}
                                                    whileTap={{ scale: 0.98 }}
                                                    transition={{ type: "spring", stiffness: 280, damping: 20 }}
                                                    className={`relative overflow-hidden rounded-2xl border p-4 cursor-pointer preserve-3d transition-all duration-300 ${
                                                        selected
                                                            ? 'border-amber-400 bg-gradient-to-br from-amber-50 via-white to-yellow-50 shadow-[0_18px_45px_rgba(180,130,35,0.20)]'
                                                            : 'border-white/70 bg-white/75 shadow-[0_14px_35px_rgba(15,23,42,0.10)] hover:border-amber-300'
                                                    }`}
                                                >
                                                    <input
                                                        type="radio"
                                                        name="paymentMethod"
                                                        value={method.id}
                                                        checked={selected}
                                                        onChange={handleInputChange}
                                                        className="sr-only"
                                                    />
                                                    <div className="relative z-10 flex items-start justify-between gap-3">
                                                        <div>
                                                            <div className="mb-3 min-h-7 text-gray-950">{method.logo}</div>
                                                            <p className="font-semibold text-gray-950">{method.label}</p>
                                                            <p className="mt-1 text-xs text-gray-500">{method.subtitle}</p>
                                                        </div>
                                                        <div className={`mt-1 flex h-5 w-5 items-center justify-center rounded-full border-2 ${selected ? 'border-amber-500 bg-amber-500' : 'border-gray-300 bg-white'}`}>
                                                            {selected && <FiCheckCircle className="text-white" size={14} />}
                                                        </div>
                                                    </div>
                                                    <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-amber-200/30 blur-2xl" />
                                                </motion.label>
                                            );
                                        })}
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
                                className="checkout-3d-card rounded-[28px] border border-white/70 bg-white/75 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.12)] backdrop-blur-xl"
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
                                        <h3 className="font-semibold mb-2">Delivery</h3>
                                        <div className="flex justify-between">
                                            <span>Product Delivery · {overallDelivery.label}</span>
                                            <span>{shippingFee === 0 ? 'Free' : formatPrice(shippingFee)}</span>
                                        </div>
                                        <p className="text-xs text-gray-500">
                                            Estimated delivery: {overallDelivery.estimated}
                                        </p>
                                        {hasFreeShipping && (
                                            <p className="text-xs text-green-600 mt-1">✨ Free Shipping Applied!</p>
                                        )}
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
                                                <span>Tax ({averageTaxRate.toFixed(1)}% avg):</span>
                                                <span>{formatPrice(taxAmount)}</span>
                                            </div>
                                            {discountAmount > 0 && (
                                                <div className="flex justify-between text-green-600">
                                                    <span>Discount:</span>
                                                    <span>-{formatPrice(discountAmount)}</span>
                                                </div>
                                            )}
                                            {hasFreeShipping && (
                                                <div className="text-green-600 text-xs text-center py-1 bg-green-50 rounded-lg">
                                                    ✨ Free Shipping Applied! ✨
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
                            <motion.button
                                whileHover={
                                    loading
                                        ? undefined
                                        : {
                                            y: -2,
                                            scale: 1.01
                                        }
                                }
                                whileTap={
                                    loading
                                        ? undefined
                                        : {
                                            scale: 0.985
                                        }
                                }
                                onClick={handlePlaceOrder}
                                disabled={loading}
                                className="group relative flex flex-1 items-center justify-center gap-3 overflow-hidden rounded-2xl border border-black bg-black px-6 py-4 text-base font-black text-white shadow-[0_18px_45px_rgba(0,0,0,0.22)] transition-all hover:bg-[#171717] hover:shadow-[0_24px_55px_rgba(0,0,0,0.30)] disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover:translate-x-full" />

                                {loading ? (
                                    <>
                                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                                        <span>
                                            {currentStep === 5
                                                ? "Placing Order..."
                                                : "Please wait..."}
                                        </span>
                                    </>
                                ) : (
                                    <>
                                        <span>
                                            {currentStep === 5
                                                ? "Place Order Securely"
                                                : currentStep === 1
                                                ? "Continue to Address"
                                                : currentStep === 2
                                                ? "Continue to Delivery"
                                                : currentStep === 3
                                                ? "Continue to Payment"
                                                : "Continue to Review"}
                                        </span>

                                        <motion.span
                                            className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-black"
                                            whileHover={{ x: 2 }}
                                        >
                                            {currentStep === 5 ? (
                                                <FiCheckCircle />
                                            ) : (
                                                <FiArrowRight />
                                            )}
                                        </motion.span>
                                    </>
                                )}
                            </motion.button>
                        </div>
                    </div>
                    
                    {/* Right Section - Order Summary */}
                    <div className="lg:w-96">
                        <div className="checkout-3d-card rounded-[28px] border border-white/70 bg-white/80 p-6 shadow-[0_28px_80px_rgba(15,23,42,0.16)] backdrop-blur-xl sticky top-24">
                            <h2 className="text-xl font-semibold mb-4 pb-2 border-b">Order Summary</h2>
                            
                            <div className="space-y-3 max-h-64 overflow-y-auto mb-4">
                                {cartItems.map((item, index) => (
                                    <div key={item.id || index} className="flex gap-3">
                                        <img 
                                            src={getValidImageUrl(item.image)} 
                                            alt={item.name} 
                                            className="w-12 h-12 object-cover rounded-lg"
                                            onError={(e) => { e.target.src = '/images/no-image.svg'; }}
                                        />
                                        <div className="flex-1">
                                            <p className="font-medium text-sm line-clamp-1">{item.name}</p>
                                            <p className="text-xs text-gray-500">Qty: {item.quantity} | {item.size} | {item.color}</p>
                                            <p className="text-[10px] text-gray-400">Tax: {getProductTaxRate(item.id)}%</p>
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
                                    <motion.div
                                        initial={{
                                            opacity: 0,
                                            y: 8,
                                            scale: 0.98
                                        }}
                                        animate={{
                                            opacity: 1,
                                            y: 0,
                                            scale: 1
                                        }}
                                        transition={{
                                            duration: 0.28
                                        }}
                                        className="flex items-center justify-between rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-green-50 p-3 shadow-sm"
                                    >
                                        <div className="flex items-center gap-3">
                                            <motion.div
                                                initial={{ rotate: -14, scale: 0.8 }}
                                                animate={{ rotate: 0, scale: 1 }}
                                                className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm"
                                            >
                                                <FiTag size={15} />
                                            </motion.div>

                                            <div>
                                                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-600">
                                                    Coupon Applied
                                                </p>
                                                <p className="text-sm font-black text-emerald-800">
                                                    {appliedCoupon.code}
                                                </p>
                                            </div>
                                        </div>

                                        <button
                                            onClick={removeCoupon}
                                            className="rounded-lg px-3 py-1.5 text-xs font-bold text-red-500 transition hover:bg-red-50"
                                        >
                                            Remove
                                        </button>
                                    </motion.div>
                                )}
                                {couponError && <p className="text-xs text-red-500 mt-2 flex items-center gap-1"><FiAlertCircle />{couponError}</p>}
                                {couponSuccess && <p className="text-xs text-green-600 mt-2 flex items-center gap-1"><FiCheckCircle />{couponSuccess}</p>}
                                {!appliedCoupon && customerCoupons.filter(c => c.status === 'active').length > 0 && (
                                    <div className="mt-3 rounded-xl border border-[#eadfce] bg-[#fffaf1] p-3">
                                        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#9a6828]">Your available offers</p>
                                        <div className="flex flex-wrap gap-2">
                                            {customerCoupons.filter(c => c.status === 'active').slice(0, 4).map(coupon => (
                                                <button
                                                    key={coupon.id || coupon.code}
                                                    type="button"
                                                    onClick={() => { setCouponCode(String(coupon.code).toUpperCase()); setCouponError(''); }}
                                                    className="rounded-full border border-[#d7c09a] bg-white px-3 py-1.5 text-[11px] font-bold tracking-wide text-[#8f5e20] transition hover:-translate-y-0.5 hover:border-black hover:text-black"
                                                >
                                                    {String(coupon.code).toUpperCase()}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
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
                                    <span>Tax ({averageTaxRate.toFixed(1)}% avg)</span>
                                    <span>{formatPrice(taxAmount)}</span>
                                </div>
                                <AnimatePresence initial={false}>
                                    {discountAmount > 0 && (
                                        <motion.div
                                            initial={{
                                                opacity: 0,
                                                height: 0,
                                                y: -6
                                            }}
                                            animate={{
                                                opacity: 1,
                                                height: "auto",
                                                y: 0
                                            }}
                                            exit={{
                                                opacity: 0,
                                                height: 0,
                                                y: -6
                                            }}
                                            transition={{
                                                duration: 0.26
                                            }}
                                            className="overflow-hidden"
                                        >
                                            <div className="flex items-center justify-between rounded-xl bg-red-50 px-3 py-2.5 text-sm font-bold text-red-600">
                                                <span className="flex items-center gap-2">
                                                    <FiTag />
                                                    Coupon Discount
                                                </span>

                                                <span>
                                                    -
                                                    <AnimatedMoney
                                                        value={discountAmount}
                                                    />
                                                </span>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                                {hasFreeShipping && (
                                    <div className="text-green-600 text-xs text-center py-1 bg-green-50 rounded-lg">
                                        ✨ Free Shipping Applied! ✨
                                    </div>
                                )}
                                <motion.div
                                    layout
                                    className="mt-3 overflow-hidden rounded-2xl border border-emerald-100 bg-gradient-to-r from-emerald-50 via-white to-green-50 p-4"
                                >
                                    <div className="flex items-end justify-between gap-4">
                                        <div>
                                            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-600">
                                                Final Total
                                            </p>

                                            {discountAmount > 0 && (
                                                <motion.p
                                                    initial={{ opacity: 0, y: 4 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    className="mt-1 text-xs font-semibold text-emerald-600"
                                                >
                                                    You saved {formatPrice(discountAmount)}
                                                </motion.p>
                                            )}
                                        </div>

                                        <AnimatedMoney
                                            value={total}
                                            className="text-2xl font-black tracking-tight text-emerald-600"
                                        />
                                    </div>
                                </motion.div>
                            </div>
                            
                            <div className="mt-6 pt-4 border-t space-y-2">
                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                    <FiShield className="text-green-600" size={14} />
                                    <span>{globalSettings.securePaymentText}</span>
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