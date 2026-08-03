// src/components/Home/FeaturesSection.jsx

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Truck,
    ShieldCheck,
    RefreshCw,
    Headphones,
    Award,
    Clock3,
    X,
    ArrowUpRight,
    CheckCircle2,
    CreditCard,
    PackageCheck,
    Mail,
    Phone,
    Sparkles
} from "lucide-react";

const FeaturesSection = () => {
    const [siteSettings, setSiteSettings] = useState({});
    const [siteInfo, setSiteInfo] = useState({});
    const [selectedFeature, setSelectedFeature] = useState(null);

    const readSettings = () => {
        try {
            const settings = JSON.parse(
                localStorage.getItem("site_settings") || "{}"
            );

            const info = JSON.parse(
                localStorage.getItem("site_info") || "{}"
            );

            setSiteSettings(settings);
            setSiteInfo(info);
        } catch (error) {
            console.error(
                "Unable to load feature section settings:",
                error
            );
        }
    };

    useEffect(() => {
        readSettings();

        const refresh = () => readSettings();

        const handleStorage = (event) => {
            if (
                !event.key ||
                event.key === "site_settings" ||
                event.key === "site_info"
            ) {
                readSettings();
            }
        };

        window.addEventListener(
            "settingsSaved",
            refresh
        );

        window.addEventListener(
            "siteInfoUpdated",
            refresh
        );

        window.addEventListener(
            "storage",
            handleStorage
        );

        return () => {
            window.removeEventListener(
                "settingsSaved",
                refresh
            );

            window.removeEventListener(
                "siteInfoUpdated",
                refresh
            );

            window.removeEventListener(
                "storage",
                handleStorage
            );
        };
    }, []);

    const siteName =
        siteInfo.siteName ||
        siteSettings.siteName ||
        "Zamed";

    const sitePhone =
        siteInfo.sitePhone ||
        siteSettings.sitePhone ||
        "+94 77 061 6154";

    const siteEmail =
        siteInfo.siteEmail ||
        siteSettings.siteEmail ||
        "support@zamed.com";

    const currencySymbol =
        siteSettings.currencySymbol ||
        (
            siteSettings.currency === "GBP"
                ? "£"
                : siteSettings.currency === "EUR"
                    ? "€"
                    : siteSettings.currency === "LKR"
                        ? "Rs"
                        : "$"
        );

    const freeShippingThreshold =
        siteSettings.freeShippingThreshold ??
        100;

    const deliveryDays =
        siteSettings.deliveryDays ||
        siteSettings.defaultDeliveryDays ||
        "2-3";

    const returnPolicy =
        siteSettings.returnPolicy ||
        "30-day easy returns";

    const features = useMemo(
        () => [
            {
                id: "shipping",
                icon: Truck,
                title: "Free Shipping",
                shortDescription:
                    `Free shipping on eligible orders over ${currencySymbol}${freeShippingThreshold}`,
                badge: "Delivery Benefit",
                accent:
                    "from-blue-500/20 via-cyan-500/10 to-transparent",
                iconClass:
                    "bg-blue-50 text-blue-600 border-blue-100",
                detailsTitle:
                    "Free Shipping & Delivery",
                detailsIntro:
                    `${siteName} offers free shipping when your eligible order reaches the current free-shipping threshold.`,
                details: [
                    `Free shipping threshold: ${currencySymbol}${freeShippingThreshold}`,
                    `Standard estimated delivery: ${deliveryDays} business days`,
                    "Product-specific delivery estimates can override the default delivery time",
                    "Your delivery estimate is shown again during checkout before you place the order"
                ]
            },
            {
                id: "payment",
                icon: ShieldCheck,
                title: "Secure Payment",
                shortDescription:
                    "Protected checkout with trusted payment options",
                badge: "Checkout Security",
                accent:
                    "from-emerald-500/20 via-green-500/10 to-transparent",
                iconClass:
                    "bg-emerald-50 text-emerald-600 border-emerald-100",
                detailsTitle:
                    "Secure Payment Experience",
                detailsIntro:
                    "Your checkout is designed to clearly show the payment option selected and the payment status on the order and invoice.",
                details: [
                    "Supports your configured checkout payment methods",
                    "Cash on Delivery invoices are marked NOT PAID until payment is collected",
                    "Online-payment invoices can display PAID status",
                    "Order totals, tax, delivery charges and coupon discounts are shown before confirmation"
                ]
            },
            {
                id: "returns",
                icon: RefreshCw,
                title: "Easy Returns",
                shortDescription:
                    returnPolicy,
                badge: "After-Sales Care",
                accent:
                    "from-amber-500/20 via-orange-500/10 to-transparent",
                iconClass:
                    "bg-amber-50 text-amber-600 border-amber-100",
                detailsTitle:
                    "Easy Returns",
                detailsIntro:
                    `Eligible delivered products can follow the return process available in your ${siteName} profile.`,
                details: [
                    `Current return policy: ${returnPolicy}`,
                    "Return options become available after an eligible order is delivered",
                    "Customers can choose a return reason and add additional notes",
                    "Existing active return requests are protected from duplicate submission"
                ]
            },
            {
                id: "support",
                icon: Headphones,
                title: "Customer Support",
                shortDescription:
                    "Fast access to help when you need it",
                badge: "Contact",
                accent:
                    "from-violet-500/20 via-purple-500/10 to-transparent",
                iconClass:
                    "bg-violet-50 text-violet-600 border-violet-100",
                detailsTitle:
                    "Customer Support",
                detailsIntro:
                    `Need help with an order, product or account? Contact ${siteName} using the support details below.`,
                details: [
                    `Phone: ${sitePhone}`,
                    `Email: ${siteEmail}`,
                    "The navigation Contact Us control can take customers directly to the footer contact section",
                    "Customers can also use the website contact/footer messaging options where available"
                ],
                actions: [
                    {
                        label: "Call Support",
                        href: `tel:${sitePhone.replace(/\s+/g, "")}`,
                        icon: Phone
                    },
                    {
                        label: "Email Support",
                        href: `mailto:${siteEmail}`,
                        icon: Mail
                    }
                ]
            },
            {
                id: "quality",
                icon: Award,
                title: "Premium Quality",
                shortDescription:
                    "Fashion selected for a premium shopping experience",
                badge: "Zamed Standard",
                accent:
                    "from-rose-500/20 via-red-500/10 to-transparent",
                iconClass:
                    "bg-rose-50 text-rose-600 border-rose-100",
                detailsTitle:
                    "Premium Quality",
                detailsIntro:
                    `${siteName} presents products with detailed material, care, sizing and product information where those details are configured in Admin.`,
                details: [
                    "Product material and care information can be shown on the product details page",
                    "Size guides are available for supported products",
                    "Product descriptions and specifications are managed from Admin",
                    "High-resolution product imagery is supported by the current product image workflow"
                ]
            },
            {
                id: "delivery",
                icon: Clock3,
                title: "Fast Delivery",
                shortDescription:
                    `Typical delivery in ${deliveryDays} business days`,
                badge: "Order Tracking",
                accent:
                    "from-indigo-500/20 via-blue-500/10 to-transparent",
                iconClass:
                    "bg-indigo-50 text-indigo-600 border-indigo-100",
                detailsTitle:
                    "Delivery & Tracking",
                detailsIntro:
                    "Customers can follow the order journey while the order is still in transit.",
                details: [
                    `Default estimated delivery: ${deliveryDays} business days`,
                    "Product-specific delivery settings can be displayed during checkout",
                    "Tracking is available before delivery",
                    "Once an order is delivered, tracking is replaced by eligible review and return actions"
                ]
            }
        ],
        [
            siteName,
            sitePhone,
            siteEmail,
            currencySymbol,
            freeShippingThreshold,
            deliveryDays,
            returnPolicy
        ]
    );

    const containerVariants = {
        hidden: {
            opacity: 0
        },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.08
            }
        }
    };

    const itemVariants = {
        hidden: {
            opacity: 0,
            y: 24
        },
        visible: {
            opacity: 1,
            y: 0,
            transition: {
                duration: 0.45,
                ease: "easeOut"
            }
        }
    };

    return (
        <>
            <section className="relative overflow-hidden bg-white py-16 md:py-20">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-gray-50 to-transparent" />

                <div className="relative container mx-auto px-4">
                    <motion.div
                        initial={{
                            opacity: 0,
                            y: 20
                        }}
                        whileInView={{
                            opacity: 1,
                            y: 0
                        }}
                        viewport={{
                            once: true
                        }}
                        transition={{
                            duration: 0.5
                        }}
                        className="mx-auto mb-11 max-w-2xl text-center"
                    >
                        <div className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-gray-500 shadow-sm">
                            <Sparkles
                                size={14}
                                className="text-orange-500"
                            />
                            Zamed Benefits
                        </div>

                        <h2 className="text-3xl font-black tracking-tight text-gray-950 md:text-4xl lg:text-5xl">
                            Why choose{" "}
                            <span className="text-orange-500">
                                {siteName}
                            </span>
                        </h2>

                        <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-gray-500 md:text-base">
                            Everything you need for a smoother,
                            safer and more confident shopping
                            experience.
                        </p>
                    </motion.div>

                    <motion.div
                        variants={containerVariants}
                        initial="hidden"
                        whileInView="visible"
                        viewport={{
                            once: true,
                            amount: 0.15
                        }}
                        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
                    >
                        {features.map(feature => {
                            const Icon = feature.icon;

                            return (
                                <motion.button
                                    key={feature.id}
                                    type="button"
                                    variants={itemVariants}
                                    whileHover={{
                                        y: -5
                                    }}
                                    whileTap={{
                                        scale: 0.99
                                    }}
                                    onClick={() =>
                                        setSelectedFeature(
                                            feature
                                        )
                                    }
                                    className="group relative overflow-hidden rounded-3xl border border-gray-200 bg-white p-5 text-left shadow-sm transition hover:border-gray-300 hover:shadow-xl"
                                >
                                    <div
                                        className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${feature.accent} opacity-0 transition duration-300 group-hover:opacity-100`}
                                    />

                                    <div className="relative">
                                        <div className="flex items-start justify-between gap-4">
                                            <div
                                                className={`flex h-12 w-12 items-center justify-center rounded-2xl border ${feature.iconClass}`}
                                            >
                                                <Icon
                                                    size={22}
                                                />
                                            </div>

                                            <div className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-400 transition group-hover:border-black group-hover:bg-black group-hover:text-white">
                                                <ArrowUpRight
                                                    size={15}
                                                />
                                            </div>
                                        </div>

                                        <p className="mt-5 text-[10px] font-black uppercase tracking-[0.16em] text-gray-400">
                                            {feature.badge}
                                        </p>

                                        <h3 className="mt-1 text-lg font-black text-gray-950">
                                            {feature.title}
                                        </h3>

                                        <p className="mt-2 text-sm leading-6 text-gray-500">
                                            {
                                                feature.shortDescription
                                            }
                                        </p>

                                        <p className="mt-5 text-xs font-bold text-gray-900">
                                            View full details
                                        </p>
                                    </div>
                                </motion.button>
                            );
                        })}
                    </motion.div>

                    <motion.div
                        initial={{
                            opacity: 0,
                            y: 20
                        }}
                        whileInView={{
                            opacity: 1,
                            y: 0
                        }}
                        viewport={{
                            once: true
                        }}
                        transition={{
                            duration: 0.5,
                            delay: 0.15
                        }}
                        className="mt-10 flex flex-col items-center justify-between gap-4 rounded-3xl border border-gray-200 bg-gray-950 px-6 py-5 text-white md:flex-row"
                    >
                        <div className="flex items-center gap-4">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/10">
                                <PackageCheck
                                    size={21}
                                />
                            </div>

                            <div>
                                <p className="font-black">
                                    Shop with confidence
                                </p>

                                <p className="mt-1 text-sm text-white/60">
                                    Product details, checkout totals,
                                    delivery information and support
                                    options are kept clear throughout
                                    your shopping journey.
                                </p>
                            </div>
                        </div>

                        <div className="flex shrink-0 items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-white/80">
                            <ShieldCheck
                                size={15}
                            />
                            Secure shopping
                        </div>
                    </motion.div>
                </div>
            </section>

            <AnimatePresence>
                {selectedFeature && (
                    <FeatureDetailsModal
                        feature={
                            selectedFeature
                        }
                        onClose={() =>
                            setSelectedFeature(
                                null
                            )
                        }
                    />
                )}
            </AnimatePresence>
        </>
    );
};

const FeatureDetailsModal = ({
    feature,
    onClose
}) => {
    const Icon = feature.icon;

    useEffect(() => {
        const oldOverflow =
            document.body.style.overflow;

        document.body.style.overflow =
            "hidden";

        const handleEscape = event => {
            if (event.key === "Escape") {
                onClose();
            }
        };

        window.addEventListener(
            "keydown",
            handleEscape
        );

        return () => {
            document.body.style.overflow =
                oldOverflow;

            window.removeEventListener(
                "keydown",
                handleEscape
            );
        };
    }, [onClose]);

    return (
        <motion.div
            initial={{
                opacity: 0
            }}
            animate={{
                opacity: 1
            }}
            exit={{
                opacity: 0
            }}
            className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
            onMouseDown={event => {
                if (
                    event.target ===
                    event.currentTarget
                ) {
                    onClose();
                }
            }}
        >
            <motion.div
                initial={{
                    opacity: 0,
                    y: 25,
                    scale: 0.97
                }}
                animate={{
                    opacity: 1,
                    y: 0,
                    scale: 1
                }}
                exit={{
                    opacity: 0,
                    y: 15,
                    scale: 0.98
                }}
                transition={{
                    duration: 0.22
                }}
                className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-2xl"
            >
                <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-gray-100 bg-white/95 px-6 py-5 backdrop-blur-xl">
                    <div className="flex items-center gap-4">
                        <div
                            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border ${feature.iconClass}`}
                        >
                            <Icon
                                size={22}
                            />
                        </div>

                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-gray-400">
                                {feature.badge}
                            </p>

                            <h2 className="mt-1 text-xl font-black text-gray-950 md:text-2xl">
                                {
                                    feature.detailsTitle
                                }
                            </h2>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition hover:bg-gray-200"
                    >
                        <X
                            size={19}
                        />
                    </button>
                </div>

                <div className="p-6">
                    <p className="text-sm leading-7 text-gray-600 md:text-base">
                        {feature.detailsIntro}
                    </p>

                    <div className="mt-6 space-y-3">
                        {feature.details.map(
                            detail => (
                                <div
                                    key={detail}
                                    className="flex items-start gap-3 rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3.5"
                                >
                                    <CheckCircle2
                                        size={18}
                                        className="mt-0.5 shrink-0 text-green-600"
                                    />

                                    <p className="text-sm leading-6 text-gray-700">
                                        {detail}
                                    </p>
                                </div>
                            )
                        )}
                    </div>

                    {feature.id ===
                        "payment" && (
                        <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-4">
                            <div className="flex items-center gap-3">
                                <CreditCard
                                    size={20}
                                    className="text-gray-700"
                                />

                                <div>
                                    <p className="text-sm font-black text-gray-900">
                                        Payment information
                                    </p>

                                    <p className="mt-1 text-xs leading-5 text-gray-500">
                                        Final payment
                                        availability depends
                                        on the payment methods
                                        currently configured
                                        for your checkout.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {feature.actions?.length >
                        0 && (
                        <div className="mt-6 grid gap-2 sm:grid-cols-2">
                            {feature.actions.map(
                                action => {
                                    const ActionIcon =
                                        action.icon;

                                    return (
                                        <a
                                            key={
                                                action.label
                                            }
                                            href={
                                                action.href
                                            }
                                            className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 px-4 py-3 text-sm font-bold text-gray-800 transition hover:border-black hover:bg-black hover:text-white"
                                        >
                                            <ActionIcon
                                                size={16}
                                            />
                                            {
                                                action.label
                                            }
                                        </a>
                                    );
                                }
                            )}
                        </div>
                    )}

                    <button
                        type="button"
                        onClick={onClose}
                        className="mt-6 w-full rounded-xl bg-black py-3.5 text-sm font-black text-white transition hover:bg-gray-800"
                    >
                        Close Details
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
};

export default FeaturesSection;
