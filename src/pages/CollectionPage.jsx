// src/pages/CollectionPage.jsx
import {
    useCallback,
    useEffect,
    useMemo,
    useState
} from "react";
import {
    Filter,
    ChevronDown,
    ChevronUp,
    SlidersHorizontal,
    Heart,
    Home,
    MessageCircle,
    Search,
    ShoppingBag,
    Star,
    X
} from "lucide-react";
import {
    Link,
    useNavigate,
    useParams
} from "react-router-dom";
import {
    AnimatePresence,
    motion
} from "framer-motion";
import { toast } from "sonner";

import { useCart } from "../context/CartContext";
import productService from "../services/productService";
import { loadProductsImages } from "../utils/imageLoader";


const CURRENCY_SYMBOLS = {
    USD: "$",
    GBP: "£",
    EUR: "€",
    LKR: "Rs",
    INR: "₹",
    AUD: "A$",
    CAD: "C$",
    JPY: "¥",
    CNY: "¥",
    AED: "AED",
    SAR: "SAR",
    QAR: "QAR"
};

// -----------------------------------------------------------------------------
// FILTER SYSTEM IS KEPT IN THIS FILE ON PURPOSE.
// This avoids Vite path/import problems on Windows and keeps the page portable.
// -----------------------------------------------------------------------------

// src/hooks/useCollectionFilters.js

const normalize = (value) =>
    String(value ?? "")
        .trim()
        .toLowerCase();

const toList = (value) => {
    if (Array.isArray(value)) {
        return value
            .map(item => String(item).trim())
            .filter(Boolean);
    }

    if (typeof value === "string") {
        return value
            .split(",")
            .map(item => item.trim())
            .filter(Boolean);
    }

    return [];
};

const initialFilters = {
    selectedCategories: [],
    selectedBrands: [],
    selectedSizes: [],
    selectedColors: [],
    inStockOnly: false,
    saleOnly: false,
    newArrivalOnly: false,
    sortBy: "featured",
    priceRange: {
        min: 0,
        max: Number.POSITIVE_INFINITY
    }
};

const useCollectionFilters = (products = []) => {
    const [searchQuery, setSearchQuery] = useState("");
    const [filters, setFilters] = useState(initialFilters);

    const normalizedProducts = useMemo(() => {
        return (Array.isArray(products) ? products : []).map(product => ({
            ...product,
            price: Number(product.price) || 0,
            originalPrice:
                product.originalPrice === null ||
                product.originalPrice === undefined ||
                product.originalPrice === ""
                    ? null
                    : Number(product.originalPrice) || 0,
            stock: Number(product.stock) || 0,
            sizes: toList(product.sizes),
            colors: toList(product.colors),
            tags: toList(product.tags)
        }));
    }, [products]);

    const priceBounds = useMemo(() => {
        const prices = normalizedProducts
            .map(product => product.price)
            .filter(price => Number.isFinite(price) && price >= 0);

        if (!prices.length) {
            return {
                min: 0,
                max: 0
            };
        }

        return {
            min: Math.min(...prices),
            max: Math.max(...prices)
        };
    }, [normalizedProducts]);

    const categories = useMemo(() => {
        return [
            ...new Set(
                normalizedProducts
                    .map(product => String(product.category || "").trim())
                    .filter(Boolean)
            )
        ].sort((a, b) => a.localeCompare(b));
    }, [normalizedProducts]);

    const brands = useMemo(() => {
        return [
            ...new Set(
                normalizedProducts
                    .map(product => String(product.brand || "").trim())
                    .filter(Boolean)
            )
        ].sort((a, b) => a.localeCompare(b));
    }, [normalizedProducts]);

    const sizes = useMemo(() => {
        return [
            ...new Set(
                normalizedProducts.flatMap(product => product.sizes)
            )
        ].filter(Boolean);
    }, [normalizedProducts]);

    const colors = useMemo(() => {
        return [
            ...new Set(
                normalizedProducts.flatMap(product => product.colors)
            )
        ]
            .filter(Boolean)
            .sort((a, b) => String(a).localeCompare(String(b)));
    }, [normalizedProducts]);

    useEffect(() => {
        if (!normalizedProducts.length) {
            setFilters(prev => ({
                ...prev,
                priceRange: {
                    min: 0,
                    max: Number.POSITIVE_INFINITY
                }
            }));

            return;
        }

        setFilters(prev => ({
            ...prev,
            priceRange: {
                min: priceBounds.min,
                max: priceBounds.max
            }
        }));
    }, [
        priceBounds.min,
        priceBounds.max,
        normalizedProducts.length
    ]);

    const setPriceRange = useCallback(
        (minValue, maxValue) => {
            if (!normalizedProducts.length) return;

            const safeMin = Math.max(
                priceBounds.min,
                Math.min(
                    Number(minValue) || priceBounds.min,
                    priceBounds.max
                )
            );

            const safeMax = Math.max(
                safeMin,
                Math.min(
                    Number(maxValue) || priceBounds.max,
                    priceBounds.max
                )
            );

            setFilters(prev => ({
                ...prev,
                priceRange: {
                    min: safeMin,
                    max: safeMax
                }
            }));
        },
        [
            normalizedProducts.length,
            priceBounds.min,
            priceBounds.max
        ]
    );

    const toggleArrayFilter = useCallback((field, value) => {
        setFilters(prev => {
            const current = prev[field] || [];

            return {
                ...prev,
                [field]:
                    current.includes(value)
                        ? current.filter(item => item !== value)
                        : [...current, value]
            };
        });
    }, []);

    const setBooleanFilter = useCallback((field, value) => {
        setFilters(prev => ({
            ...prev,
            [field]: Boolean(value)
        }));
    }, []);

    const setSortBy = useCallback((value) => {
        setFilters(prev => ({
            ...prev,
            sortBy: value
        }));
    }, []);

    const removeFilter = useCallback(
        (field, value = null) => {
            if (
                [
                    "selectedCategories",
                    "selectedBrands",
                    "selectedSizes",
                    "selectedColors"
                ].includes(field)
            ) {
                setFilters(prev => ({
                    ...prev,
                    [field]:
                        prev[field].filter(item => item !== value)
                }));

                return;
            }

            if (field === "priceRange") {
                setFilters(prev => ({
                    ...prev,
                    priceRange: {
                        min: priceBounds.min,
                        max:
                            priceBounds.max > 0
                                ? priceBounds.max
                                : Number.POSITIVE_INFINITY
                    }
                }));

                return;
            }

            if (field === "sortBy") {
                setFilters(prev => ({
                    ...prev,
                    sortBy: "featured"
                }));

                return;
            }

            setFilters(prev => ({
                ...prev,
                [field]: false
            }));
        },
        [priceBounds.min, priceBounds.max]
    );

    const clearAllFilters = useCallback(() => {
        setSearchQuery("");

        setFilters({
            ...initialFilters,
            priceRange: {
                min: priceBounds.min,
                max:
                    priceBounds.max > 0
                        ? priceBounds.max
                        : Number.POSITIVE_INFINITY
            }
        });
    }, [priceBounds.min, priceBounds.max]);

    const filteredProducts = useMemo(() => {
        let result = [...normalizedProducts];

        const query = normalize(searchQuery);

        if (query) {
            result = result.filter(product => {
                const searchable = [
                    product.name,
                    product.brand,
                    product.category,
                    product.gender,
                    product.description,
                    product.material,
                    product.details,
                    product.careInstructions,
                    product.tags.join(" ")
                ]
                    .filter(Boolean)
                    .join(" ")
                    .toLowerCase();

                return searchable.includes(query);
            });
        }

        result = result.filter(product => {
            const price = Number(product.price) || 0;

            return (
                price >= filters.priceRange.min &&
                price <= filters.priceRange.max
            );
        });

        if (filters.selectedCategories.length) {
            const wanted = filters.selectedCategories.map(normalize);

            result = result.filter(product =>
                wanted.includes(normalize(product.category))
            );
        }

        if (filters.selectedBrands.length) {
            const wanted = filters.selectedBrands.map(normalize);

            result = result.filter(product =>
                wanted.includes(normalize(product.brand))
            );
        }

        if (filters.selectedSizes.length) {
            const wanted = filters.selectedSizes.map(normalize);

            result = result.filter(product =>
                product.sizes.some(size =>
                    wanted.includes(normalize(size))
                )
            );
        }

        if (filters.selectedColors.length) {
            const wanted = filters.selectedColors.map(normalize);

            result = result.filter(product =>
                product.colors.some(color =>
                    wanted.includes(normalize(color))
                )
            );
        }

        if (filters.inStockOnly) {
            result = result.filter(
                product =>
                    product.stock > 0 ||
                    product.inStock === true
            );
        }

        if (filters.saleOnly) {
            result = result.filter(
                product =>
                    Number(product.originalPrice) >
                    Number(product.price)
            );
        }

        if (filters.newArrivalOnly) {
            result = result.filter(
                product => product.isNewArrival === true
            );
        }

        switch (filters.sortBy) {
            case "price-low-high":
                result.sort(
                    (a, b) =>
                        Number(a.price) -
                        Number(b.price)
                );
                break;

            case "price-high-low":
                result.sort(
                    (a, b) =>
                        Number(b.price) -
                        Number(a.price)
                );
                break;

            case "rating":
                result.sort(
                    (a, b) =>
                        Number(b.rating || 0) -
                        Number(a.rating || 0)
                );
                break;

            case "newest":
                result.sort(
                    (a, b) =>
                        new Date(
                            b.updatedAt ||
                            b.createdAt ||
                            b.date ||
                            0
                        ).getTime() -
                        new Date(
                            a.updatedAt ||
                            a.createdAt ||
                            a.date ||
                            0
                        ).getTime()
                );
                break;

            case "name-a-z":
                result.sort((a, b) =>
                    String(a.name || "")
                        .localeCompare(
                            String(b.name || "")
                        )
                );
                break;

            case "name-z-a":
                result.sort((a, b) =>
                    String(b.name || "")
                        .localeCompare(
                            String(a.name || "")
                        )
                );
                break;

            case "featured":
            default:
                result.sort((a, b) => {
                    const featuredDiff =
                        Number(Boolean(b.isFeatured)) -
                        Number(Boolean(a.isFeatured));

                    if (featuredDiff !== 0) {
                        return featuredDiff;
                    }

                    const arrivalDiff =
                        Number(Boolean(b.isNewArrival)) -
                        Number(Boolean(a.isNewArrival));

                    if (arrivalDiff !== 0) {
                        return arrivalDiff;
                    }

                    return (
                        new Date(
                            b.updatedAt ||
                            b.createdAt ||
                            0
                        ).getTime() -
                        new Date(
                            a.updatedAt ||
                            a.createdAt ||
                            0
                        ).getTime()
                    );
                });
                break;
        }

        return result;
    }, [
        normalizedProducts,
        searchQuery,
        filters
    ]);

    const activeFilterCount = useMemo(() => {
        let count = 0;

        count += filters.selectedCategories.length;
        count += filters.selectedBrands.length;
        count += filters.selectedSizes.length;
        count += filters.selectedColors.length;

        if (filters.inStockOnly) count += 1;
        if (filters.saleOnly) count += 1;
        if (filters.newArrivalOnly) count += 1;
        if (filters.sortBy !== "featured") count += 1;

        if (
            priceBounds.max > 0 &&
            (
                filters.priceRange.min > priceBounds.min ||
                filters.priceRange.max < priceBounds.max
            )
        ) {
            count += 1;
        }

        return count;
    }, [
        filters,
        priceBounds.min,
        priceBounds.max
    ]);

    return {
        searchQuery,
        setSearchQuery,

        filters,
        setFilters,

        filteredProducts,
        activeFilterCount,

        priceBounds,
        categories,
        brands,
        sizes,
        colors,

        setPriceRange,
        toggleArrayFilter,
        setBooleanFilter,
        setSortBy,
        removeFilter,
        clearAllFilters
    };
};

// src/components/Collection/CollectionFilters.jsx
const COLOR_MAP = {
    Black: "#111111",
    White: "#ffffff",
    Red: "#dc2626",
    Blue: "#2563eb",
    Green: "#16a34a",
    Yellow: "#eab308",
    Purple: "#9333ea",
    Pink: "#ec4899",
    Gray: "#9ca3af",
    Grey: "#9ca3af",
    Brown: "#78350f",
    Navy: "#172554",
    Orange: "#f97316",
    Beige: "#e7d7bd",
    Maroon: "#7f1d1d",
    Teal: "#0f766e",
    Gold: "#fbbf24",
    Silver: "#c0c0c0",
    Charcoal: "#36454f",
    Burgundy: "#800020",
    Khaki: "#c3b091",
    Cream: "#fffdd0",
    Ivory: "#fffff0"
};

const Section = ({
    title,
    count = 0,
    open,
    onToggle,
    children
}) => (
    <div className="border-b border-gray-100 py-1">
        <button
            type="button"
            onClick={onToggle}
            className="flex w-full items-center justify-between py-3 text-left"
        >
            <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-900">
                    {title}
                </span>

                {count > 0 && (
                    <span className="rounded-full bg-black px-2 py-0.5 text-[10px] font-bold text-white">
                        {count}
                    </span>
                )}
            </div>

            {open ? (
                <ChevronUp size={17} />
            ) : (
                <ChevronDown size={17} />
            )}
        </button>

        <AnimatePresence initial={false}>
            {open && (
                <motion.div
                    initial={{
                        height: 0,
                        opacity: 0
                    }}
                    animate={{
                        height: "auto",
                        opacity: 1
                    }}
                    exit={{
                        height: 0,
                        opacity: 0
                    }}
                    transition={{
                        duration: 0.18
                    }}
                    className="overflow-hidden"
                >
                    <div className="pb-4">
                        {children}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    </div>
);

const ChoiceButtons = ({
    items,
    selectedItems,
    onToggle
}) => {
    if (!items.length) {
        return (
            <p className="text-sm text-gray-400">
                No options available.
            </p>
        );
    }

    return (
        <div className="flex flex-wrap gap-2">
            {items.map(item => {
                const active =
                    selectedItems.includes(item);

                return (
                    <button
                        key={item}
                        type="button"
                        onClick={() => onToggle(item)}
                        className={`rounded-xl border px-3 py-2 text-sm transition ${
                            active
                                ? "border-black bg-black text-white"
                                : "border-gray-200 bg-white text-gray-700 hover:border-gray-400"
                        }`}
                    >
                        {item}
                    </button>
                );
            })}
        </div>
    );
};

const CollectionFilters = ({
    open,
    onClose,
    totalProducts,
    resultCount,
    currencyCode,
    formatMoney,

    filters,
    activeFilterCount,

    priceBounds,
    categories,
    brands,
    sizes,
    colors,

    setPriceRange,
    toggleArrayFilter,
    setBooleanFilter,
    setSortBy,
    clearAllFilters
}) => {
    const [sections, setSections] = useState({
        availability: true,
        price: true,
        categories: true,
        brands: false,
        sizes: true,
        colors: false,
        sort: false
    });

    const [draftMin, setDraftMin] = useState(
        filters.priceRange.min
    );

    const [draftMax, setDraftMax] = useState(
        filters.priceRange.max
    );

    useEffect(() => {
        setDraftMin(filters.priceRange.min);
        setDraftMax(filters.priceRange.max);
    }, [
        filters.priceRange.min,
        filters.priceRange.max
    ]);

    useEffect(() => {
        if (!open) return undefined;

        const oldOverflow =
            document.body.style.overflow;

        document.body.style.overflow =
            "hidden";

        return () => {
            document.body.style.overflow =
                oldOverflow;
        };
    }, [open]);

    const toggleSection = key => {
        setSections(prev => ({
            ...prev,
            [key]: !prev[key]
        }));
    };

    const applyDraftPrice = () => {
        setPriceRange(
            draftMin,
            draftMax
        );
    };

    const resetPrice = () => {
        setDraftMin(priceBounds.min);
        setDraftMax(priceBounds.max);

        setPriceRange(
            priceBounds.min,
            priceBounds.max
        );
    };

    if (!open) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100]">
                <motion.button
                    type="button"
                    aria-label="Close filters"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-black/50"
                />

                <motion.aside
                    initial={{
                        x: "100%"
                    }}
                    animate={{
                        x: 0
                    }}
                    exit={{
                        x: "100%"
                    }}
                    transition={{
                        type: "spring",
                        damping: 28,
                        stiffness: 260
                    }}
                    className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-white shadow-2xl"
                >
                    <div className="flex items-start justify-between border-b px-5 py-5">
                        <div>
                            <div className="flex items-center gap-2">
                                <SlidersHorizontal size={19} />

                                <h2 className="text-xl font-black">
                                    Filters
                                </h2>

                                {activeFilterCount > 0 && (
                                    <span className="rounded-full bg-black px-2 py-0.5 text-xs font-bold text-white">
                                        {activeFilterCount}
                                    </span>
                                )}
                            </div>

                            <p className="mt-1 text-xs text-gray-500">
                                {resultCount} of {totalProducts} products
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={onClose}
                            className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-600 transition hover:bg-gray-200"
                        >
                            <X size={19} />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto px-5">
                        <Section
                            title="Availability"
                            count={
                                Number(filters.inStockOnly) +
                                Number(filters.saleOnly) +
                                Number(filters.newArrivalOnly)
                            }
                            open={sections.availability}
                            onToggle={() =>
                                toggleSection("availability")
                            }
                        >
                            <div className="space-y-2">
                                {[
                                    {
                                        key: "inStockOnly",
                                        label: "In Stock"
                                    },
                                    {
                                        key: "saleOnly",
                                        label: "On Sale"
                                    },
                                    {
                                        key: "newArrivalOnly",
                                        label: "New Arrivals"
                                    }
                                ].map(option => (
                                    <label
                                        key={option.key}
                                        className="flex cursor-pointer items-center justify-between rounded-xl border border-gray-200 px-3 py-3"
                                    >
                                        <span className="text-sm font-medium text-gray-700">
                                            {option.label}
                                        </span>

                                        <input
                                            type="checkbox"
                                            checked={filters[option.key]}
                                            onChange={event =>
                                                setBooleanFilter(
                                                    option.key,
                                                    event.target.checked
                                                )
                                            }
                                            className="h-4 w-4 accent-black"
                                        />
                                    </label>
                                ))}
                            </div>
                        </Section>

                        <Section
                            title={`Price (${currencyCode})`}
                            count={
                                priceBounds.max > 0 &&
                                (
                                    filters.priceRange.min >
                                        priceBounds.min ||
                                    filters.priceRange.max <
                                        priceBounds.max
                                )
                                    ? 1
                                    : 0
                            }
                            open={sections.price}
                            onToggle={() =>
                                toggleSection("price")
                            }
                        >
                            {priceBounds.max > 0 ? (
                                <div>
                                    <div className="mb-4 rounded-2xl bg-gray-50 p-4">
                                        <div className="flex items-center justify-between gap-4">
                                            <div>
                                                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                                                    Minimum
                                                </p>
                                                <p className="mt-1 text-base font-black">
                                                    {formatMoney(draftMin)}
                                                </p>
                                            </div>

                                            <div className="h-px flex-1 bg-gray-300" />

                                            <div className="text-right">
                                                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                                                    Maximum
                                                </p>
                                                <p className="mt-1 text-base font-black">
                                                    {formatMoney(draftMax)}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="mt-5 space-y-4">
                                            <input
                                                type="range"
                                                min={priceBounds.min}
                                                max={priceBounds.max}
                                                step={
                                                    priceBounds.max -
                                                        priceBounds.min >
                                                    1000
                                                        ? 10
                                                        : 1
                                                }
                                                value={draftMin}
                                                onChange={event =>
                                                    setDraftMin(
                                                        Math.min(
                                                            Number(event.target.value),
                                                            Number(draftMax)
                                                        )
                                                    )
                                                }
                                                className="w-full accent-black"
                                            />

                                            <input
                                                type="range"
                                                min={priceBounds.min}
                                                max={priceBounds.max}
                                                step={
                                                    priceBounds.max -
                                                        priceBounds.min >
                                                    1000
                                                        ? 10
                                                        : 1
                                                }
                                                value={draftMax}
                                                onChange={event =>
                                                    setDraftMax(
                                                        Math.max(
                                                            Number(event.target.value),
                                                            Number(draftMin)
                                                        )
                                                    )
                                                }
                                                className="w-full accent-black"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="mb-1 block text-[10px] font-bold uppercase text-gray-400">
                                                Min
                                            </label>

                                            <input
                                                type="number"
                                                min={priceBounds.min}
                                                max={priceBounds.max}
                                                value={draftMin}
                                                onChange={event =>
                                                    setDraftMin(
                                                        event.target.value
                                                    )
                                                }
                                                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-black"
                                            />
                                        </div>

                                        <div>
                                            <label className="mb-1 block text-[10px] font-bold uppercase text-gray-400">
                                                Max
                                            </label>

                                            <input
                                                type="number"
                                                min={priceBounds.min}
                                                max={priceBounds.max}
                                                value={draftMax}
                                                onChange={event =>
                                                    setDraftMax(
                                                        event.target.value
                                                    )
                                                }
                                                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-black"
                                            />
                                        </div>
                                    </div>

                                    <div className="mt-3 grid grid-cols-2 gap-2">
                                        <button
                                            type="button"
                                            onClick={resetPrice}
                                            className="rounded-xl border border-gray-300 py-2.5 text-sm font-semibold"
                                        >
                                            Reset
                                        </button>

                                        <button
                                            type="button"
                                            onClick={applyDraftPrice}
                                            className="rounded-xl bg-black py-2.5 text-sm font-semibold text-white"
                                        >
                                            Apply Price
                                        </button>
                                    </div>

                                    <p className="mt-3 text-xs text-gray-400">
                                        Real catalog range:{" "}
                                        {formatMoney(priceBounds.min)} –{" "}
                                        {formatMoney(priceBounds.max)}
                                    </p>
                                </div>
                            ) : (
                                <p className="text-sm text-gray-400">
                                    No product prices available.
                                </p>
                            )}
                        </Section>

                        <Section
                            title="Categories"
                            count={filters.selectedCategories.length}
                            open={sections.categories}
                            onToggle={() =>
                                toggleSection("categories")
                            }
                        >
                            <ChoiceButtons
                                items={categories}
                                selectedItems={
                                    filters.selectedCategories
                                }
                                onToggle={item =>
                                    toggleArrayFilter(
                                        "selectedCategories",
                                        item
                                    )
                                }
                            />
                        </Section>

                        <Section
                            title="Brands"
                            count={filters.selectedBrands.length}
                            open={sections.brands}
                            onToggle={() =>
                                toggleSection("brands")
                            }
                        >
                            <ChoiceButtons
                                items={brands}
                                selectedItems={
                                    filters.selectedBrands
                                }
                                onToggle={item =>
                                    toggleArrayFilter(
                                        "selectedBrands",
                                        item
                                    )
                                }
                            />
                        </Section>

                        <Section
                            title="Sizes"
                            count={filters.selectedSizes.length}
                            open={sections.sizes}
                            onToggle={() =>
                                toggleSection("sizes")
                            }
                        >
                            <ChoiceButtons
                                items={sizes}
                                selectedItems={
                                    filters.selectedSizes
                                }
                                onToggle={item =>
                                    toggleArrayFilter(
                                        "selectedSizes",
                                        item
                                    )
                                }
                            />
                        </Section>

                        <Section
                            title="Colors"
                            count={filters.selectedColors.length}
                            open={sections.colors}
                            onToggle={() =>
                                toggleSection("colors")
                            }
                        >
                            <div className="grid grid-cols-2 gap-2">
                                {colors.map(color => {
                                    const active =
                                        filters.selectedColors.includes(
                                            color
                                        );

                                    return (
                                        <button
                                            key={color}
                                            type="button"
                                            onClick={() =>
                                                toggleArrayFilter(
                                                    "selectedColors",
                                                    color
                                                )
                                            }
                                            className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm transition ${
                                                active
                                                    ? "border-black bg-black text-white"
                                                    : "border-gray-200 bg-white text-gray-700"
                                            }`}
                                        >
                                            <span
                                                className="h-4 w-4 rounded-full border border-black/10"
                                                style={{
                                                    backgroundColor:
                                                        COLOR_MAP[color] ||
                                                        "#d1d5db"
                                                }}
                                            />

                                            <span className="truncate">
                                                {color}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </Section>

                        <Section
                            title="Sort By"
                            count={
                                filters.sortBy !== "featured"
                                    ? 1
                                    : 0
                            }
                            open={sections.sort}
                            onToggle={() =>
                                toggleSection("sort")
                            }
                        >
                            <select
                                value={filters.sortBy}
                                onChange={event =>
                                    setSortBy(
                                        event.target.value
                                    )
                                }
                                className="w-full rounded-xl border border-gray-200 p-3 text-sm outline-none focus:border-black"
                            >
                                <option value="featured">
                                    Featured
                                </option>
                                <option value="newest">
                                    Newest First
                                </option>
                                <option value="price-low-high">
                                    Price: Low to High
                                </option>
                                <option value="price-high-low">
                                    Price: High to Low
                                </option>
                                <option value="rating">
                                    Highest Rated
                                </option>
                                <option value="name-a-z">
                                    Name: A-Z
                                </option>
                                <option value="name-z-a">
                                    Name: Z-A
                                </option>
                            </select>
                        </Section>
                    </div>

                    <div className="border-t bg-gray-50 p-5">
                        <button
                            type="button"
                            onClick={clearAllFilters}
                            className="mb-3 w-full rounded-xl border border-gray-300 bg-white py-3 text-sm font-semibold text-gray-700"
                        >
                            Clear All Filters
                        </button>

                        <button
                            type="button"
                            onClick={onClose}
                            className="w-full rounded-xl bg-black py-3 text-sm font-black text-white"
                        >
                            Show {resultCount} Products
                        </button>
                    </div>
                </motion.aside>
            </div>
        </AnimatePresence>
    );
};

// src/components/Collection/ActiveFilterChips.jsx

const Chip = ({
    children,
    onRemove,
    className = ""
}) => (
    <button
        type="button"
        onClick={onRemove}
        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${className}`}
    >
        {children}
        <X size={12} />
    </button>
);

const ActiveFilterChips = ({
    filters,
    priceBounds,
    formatMoney,
    removeFilter,
    clearAllFilters
}) => {
    const hasCustomPrice =
        priceBounds.max > 0 &&
        (
            filters.priceRange.min > priceBounds.min ||
            filters.priceRange.max < priceBounds.max
        );

    const hasAnything =
        hasCustomPrice ||
        filters.selectedCategories.length ||
        filters.selectedBrands.length ||
        filters.selectedSizes.length ||
        filters.selectedColors.length ||
        filters.inStockOnly ||
        filters.saleOnly ||
        filters.newArrivalOnly ||
        filters.sortBy !== "featured";

    if (!hasAnything) return null;

    return (
        <div className="mb-4 flex flex-wrap items-center gap-2">
            {hasCustomPrice && (
                <Chip
                    onRemove={() =>
                        removeFilter("priceRange")
                    }
                    className="bg-black text-white"
                >
                    {formatMoney(filters.priceRange.min)} –{" "}
                    {formatMoney(filters.priceRange.max)}
                </Chip>
            )}

            {filters.selectedCategories.map(item => (
                <Chip
                    key={`category-${item}`}
                    onRemove={() =>
                        removeFilter(
                            "selectedCategories",
                            item
                        )
                    }
                    className="bg-gray-200 text-gray-800"
                >
                    {item}
                </Chip>
            ))}

            {filters.selectedBrands.map(item => (
                <Chip
                    key={`brand-${item}`}
                    onRemove={() =>
                        removeFilter(
                            "selectedBrands",
                            item
                        )
                    }
                    className="bg-gray-200 text-gray-800"
                >
                    {item}
                </Chip>
            ))}

            {filters.selectedSizes.map(item => (
                <Chip
                    key={`size-${item}`}
                    onRemove={() =>
                        removeFilter(
                            "selectedSizes",
                            item
                        )
                    }
                    className="bg-gray-200 text-gray-800"
                >
                    Size {item}
                </Chip>
            ))}

            {filters.selectedColors.map(item => (
                <Chip
                    key={`color-${item}`}
                    onRemove={() =>
                        removeFilter(
                            "selectedColors",
                            item
                        )
                    }
                    className="bg-gray-200 text-gray-800"
                >
                    {item}
                </Chip>
            ))}

            {filters.inStockOnly && (
                <Chip
                    onRemove={() =>
                        removeFilter("inStockOnly")
                    }
                    className="bg-green-100 text-green-800"
                >
                    In Stock
                </Chip>
            )}

            {filters.saleOnly && (
                <Chip
                    onRemove={() =>
                        removeFilter("saleOnly")
                    }
                    className="bg-red-100 text-red-700"
                >
                    Sale
                </Chip>
            )}

            {filters.newArrivalOnly && (
                <Chip
                    onRemove={() =>
                        removeFilter("newArrivalOnly")
                    }
                    className="bg-blue-100 text-blue-700"
                >
                    New Arrival
                </Chip>
            )}

            {filters.sortBy !== "featured" && (
                <Chip
                    onRemove={() =>
                        removeFilter("sortBy")
                    }
                    className="bg-purple-100 text-purple-700"
                >
                    {filters.sortBy}
                </Chip>
            )}

            <button
                type="button"
                onClick={clearAllFilters}
                className="px-2 text-xs font-bold text-red-600 hover:underline"
            >
                Clear all
            </button>
        </div>
    );
};

const CollectionPage = () => {
    const { collection } = useParams();
    const navigate = useNavigate();
    const { addToCart } = useCart();

    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showFilters, setShowFilters] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);

    const [currencyCode, setCurrencyCode] = useState("USD");
    const [currencySymbol, setCurrencySymbol] = useState("$");

    const [settings, setSettings] = useState({
        showProductRatings: true,
        showProductColors: true,
        showProductSizes: true,
        showSaleBadge: true,
        showQuickAdd: true,
        showProductBrand: true,
        productsPerRow: 4
    });

    const [user, setUser] = useState(null);
    const [favorites, setFavorites] = useState([]);

    const readSettings = useCallback(() => {
        try {
            const siteSettings = JSON.parse(
                localStorage.getItem("site_settings") || "{}"
            );

            const code = String(
                siteSettings.currency || "USD"
            ).toUpperCase();

            setCurrencyCode(code);
            setCurrencySymbol(
                siteSettings.currencySymbol ||
                CURRENCY_SYMBOLS[code] ||
                code
            );

            setSettings(prev => ({
                ...prev,
                ...siteSettings,
                productsPerRow:
                    Number(siteSettings.productsPerRow) || 4
            }));
        } catch (error) {
            console.error(
                "Unable to load collection settings:",
                error
            );
        }
    }, []);

    const formatMoney = useCallback(
        value => {
            const amount = Number(value) || 0;

            try {
                return new Intl.NumberFormat(
                    currencyCode === "LKR"
                        ? "en-LK"
                        : "en-GB",
                    {
                        style: "currency",
                        currency: currencyCode,
                        maximumFractionDigits:
                            currencyCode === "JPY"
                                ? 0
                                : 2
                    }
                ).format(amount);
            } catch {
                return `${currencySymbol}${amount.toLocaleString()}`;
            }
        },
        [
            currencyCode,
            currencySymbol
        ]
    );

    const normalizeProducts = useCallback(
        async rawProducts => {
            const loaded = await loadProductsImages(
                Array.isArray(rawProducts)
                    ? rawProducts
                    : []
            );

            return loaded.map(product => ({
                ...product,
                price: Number(product.price) || 0,
                originalPrice:
                    product.originalPrice === null ||
                    product.originalPrice === undefined ||
                    product.originalPrice === ""
                        ? null
                        : Number(product.originalPrice) || 0,
                stock: Number(product.stock) || 0
            }));
        },
        []
    );

    const filterByCollection = useCallback(
        allProducts => {
            const current =
                String(collection || "all")
                    .toLowerCase();

            if (["men", "women", "kids"].includes(current)) {
                return allProducts.filter(
                    product =>
                        String(product.gender || "")
                            .toLowerCase() === current
                );
            }

            if (current === "new-arrivals") {
                return allProducts.filter(
                    product =>
                        product.isNewArrival === true
                );
            }

            if (current === "best-sellers") {
                return allProducts.filter(
                    product =>
                        product.isFeatured === true
                );
            }

            if (current === "sale") {
                return allProducts.filter(
                    product =>
                        Number(product.originalPrice) >
                        Number(product.price)
                );
            }

            return allProducts;
        },
        [collection]
    );

    const loadProducts = useCallback(async () => {
        setLoading(true);

        try {
            const raw =
                productService.getAllProducts() || [];

            const loaded =
                await normalizeProducts(raw);

            setProducts(
                filterByCollection(loaded)
            );
        } catch (error) {
            console.error(
                "Unable to load products:",
                error
            );

            setProducts([]);
        } finally {
            setLoading(false);
        }
    }, [
        normalizeProducts,
        filterByCollection
    ]);

    useEffect(() => {
        readSettings();
        loadProducts();

        const refreshSettings = () => readSettings();
        const refreshProducts = () => loadProducts();

        const storageHandler = event => {
            if (
                !event.key ||
                event.key === "site_settings"
            ) {
                readSettings();
            }

            if (
                !event.key ||
                [
                    "shop_products",
                    "admin_products",
                    "products"
                ].includes(event.key)
            ) {
                loadProducts();
            }
        };

        const unsubscribe =
            productService.subscribe?.(
                refreshProducts
            );

        window.addEventListener(
            "settingsSaved",
            refreshSettings
        );
        window.addEventListener(
            "siteInfoUpdated",
            refreshSettings
        );
        window.addEventListener(
            "currencyChanged",
            refreshSettings
        );

        window.addEventListener(
            "productsUpdated",
            refreshProducts
        );
        window.addEventListener(
            "productsRefreshed",
            refreshProducts
        );

        window.addEventListener(
            "storage",
            storageHandler
        );

        return () => {
            unsubscribe?.();

            window.removeEventListener(
                "settingsSaved",
                refreshSettings
            );
            window.removeEventListener(
                "siteInfoUpdated",
                refreshSettings
            );
            window.removeEventListener(
                "currencyChanged",
                refreshSettings
            );
            window.removeEventListener(
                "productsUpdated",
                refreshProducts
            );
            window.removeEventListener(
                "productsRefreshed",
                refreshProducts
            );
            window.removeEventListener(
                "storage",
                storageHandler
            );
        };
    }, [
        readSettings,
        loadProducts
    ]);

    useEffect(() => {
        try {
            const storedUser = JSON.parse(
                localStorage.getItem("user") || "null"
            );

            setUser(storedUser);

            if (storedUser?.email) {
                const ids = JSON.parse(
                    localStorage.getItem(
                        `favorites_${storedUser.email}`
                    ) || "[]"
                );

                setFavorites(
                    Array.isArray(ids)
                        ? ids
                        : []
                );
            }
        } catch {
            setUser(null);
            setFavorites([]);
        }
    }, []);

    const {
        searchQuery,
        setSearchQuery,
        filters,
        filteredProducts,
        activeFilterCount,
        priceBounds,
        categories,
        brands,
        sizes,
        colors,
        setPriceRange,
        toggleArrayFilter,
        setBooleanFilter,
        setSortBy,
        removeFilter,
        clearAllFilters
    } = useCollectionFilters(products);

    const toggleFavorite = product => {
        if (!user?.email) {
            toast.error(
                "Please login to add favourites."
            );
            navigate("/login");
            return;
        }

        const productId = product.id;
        const alreadySaved =
            favorites.some(
                id => String(id) === String(productId)
            );

        const next = alreadySaved
            ? favorites.filter(
                id => String(id) !== String(productId)
            )
            : [
                ...favorites,
                productId
            ];

        setFavorites(next);

        localStorage.setItem(
            `favorites_${user.email}`,
            JSON.stringify(next)
        );

        window.dispatchEvent(
            new CustomEvent("favoritesUpdated", {
                detail: {
                    email: user.email,
                    favorites: next
                }
            })
        );

        toast.success(
            alreadySaved
                ? "Removed from favourites."
                : "Added to favourites."
        );
    };

    const getTitle = () => {
        const titles = {
            men: "Men",
            women: "Women",
            kids: "Kids",
            all: "All Products",
            "new-arrivals": "New Arrivals",
            "best-sellers": "Best Sellers",
            sale: "Sale"
        };

        return titles[collection] || "Collection";
    };

    const getSubtitle = () => {
        if (collection === "men") {
            return "Complete men's fashion collection";
        }

        if (collection === "women") {
            return "Complete women's fashion collection";
        }

        if (collection === "kids") {
            return "Complete kids' fashion collection";
        }

        return "Discover our premium collection";
    };

    const getGridCols = () => {
        const count =
            Number(settings.productsPerRow) || 4;

        if (count === 2) {
            return "grid-cols-1 sm:grid-cols-2";
        }

        if (count === 3) {
            return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3";
        }

        if (count === 5) {
            return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5";
        }

        return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";
    };

    const ProductCard = ({ product }) => {
        const favourite =
            favorites.some(
                id => String(id) === String(product.id)
            );

        const sale =
            product.originalPrice &&
            Number(product.originalPrice) >
                Number(product.price);

        return (
            <motion.article
                layout
                initial={{
                    opacity: 0,
                    y: 15
                }}
                animate={{
                    opacity: 1,
                    y: 0
                }}
                className="group flex h-full flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
            >
                <div className="relative aspect-[4/5] overflow-hidden bg-white">
                    <button
                        type="button"
                        onClick={() =>
                            navigate(
                                `/product/${product.id}`
                            )
                        }
                        className="h-full w-full"
                    >
                        <img
                            src={product.image || "/images/no-image.svg"}
                            alt={product.name}
                            className="h-full w-full object-contain p-2 transition duration-500 group-hover:scale-[1.03]"
                            loading="lazy"
                            decoding="async"
                            onError={(event) => {
                                event.currentTarget.onerror = null;
                                event.currentTarget.src = "/images/no-image.svg";
                            }}
                        />
                    </button>

                    {settings.showSaleBadge && sale && (
                        <span className="absolute left-3 top-3 rounded-full bg-red-600 px-3 py-1 text-[10px] font-black text-white">
                            SALE
                        </span>
                    )}

                    <button
                        type="button"
                        onClick={() =>
                            toggleFavorite(product)
                        }
                        className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-md"
                    >
                        <Heart
                            size={17}
                            className={
                                favourite
                                    ? "fill-current text-red-500"
                                    : "text-gray-500"
                            }
                        />
                    </button>
                </div>

                <div className="flex flex-1 flex-col p-4">
                    {settings.showProductBrand && (
                        <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-gray-400">
                            {product.brand ||
                                "Zamed Premium"}
                        </p>
                    )}

                    <button
                        type="button"
                        onClick={() =>
                            navigate(
                                `/product/${product.id}`
                            )
                        }
                        className="text-left"
                    >
                        <h3 className="line-clamp-2 font-semibold text-gray-900 transition hover:text-black">
                            {product.name}
                        </h3>
                    </button>

                    {settings.showProductRatings && (
                        <div className="mt-2 flex items-center gap-2">
                            <div className="flex">
                                {[1, 2, 3, 4, 5].map(star => (
                                    <Star
                                        key={star}
                                        size={12}
                                        className={
                                            star <=
                                            Math.round(
                                                Number(
                                                    product.rating ||
                                                    0
                                                )
                                            )
                                                ? "fill-current text-amber-400"
                                                : "text-gray-300"
                                        }
                                    />
                                ))}
                            </div>

                            <button
                                type="button"
                                onClick={() =>
                                    navigate(
                                        `/product/${product.id}#reviews`
                                    )
                                }
                                className="flex items-center gap-1 text-[11px] text-gray-500"
                            >
                                <MessageCircle size={11} />
                                {Array.isArray(product.reviews)
                                    ? product.reviews.length
                                    : Number(
                                        product.reviews || 0
                                    )}
                            </button>
                        </div>
                    )}

                    <div className="mt-3 flex items-center gap-2">
                        <span className="text-lg font-black text-gray-950">
                            {formatMoney(product.price)}
                        </span>

                        {sale && (
                            <span className="text-xs text-gray-400 line-through">
                                {formatMoney(
                                    product.originalPrice
                                )}
                            </span>
                        )}
                    </div>

                    {settings.showProductColors &&
                        product.colors?.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-1.5">
                                {product.colors
                                    .slice(0, 5)
                                    .map(color => (
                                        <span
                                            key={color}
                                            className="rounded-full border border-gray-200 bg-gray-50 px-2 py-1 text-[10px] text-gray-600"
                                        >
                                            {color}
                                        </span>
                                    ))}
                            </div>
                        )}

                    <div className="mt-auto pt-4">
                        {settings.showQuickAdd ? (
                            <button
                                type="button"
                                onClick={() =>
                                    setSelectedProduct(
                                        product
                                    )
                                }
                                className="flex w-full items-center justify-center gap-2 rounded-xl bg-black py-2.5 text-sm font-bold text-white transition hover:bg-gray-800"
                            >
                                <ShoppingBag size={15} />
                                Quick Shop
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={() =>
                                    navigate(
                                        `/product/${product.id}`
                                    )
                                }
                                className="w-full rounded-xl bg-black py-2.5 text-sm font-bold text-white"
                            >
                                View Product
                            </button>
                        )}
                    </div>
                </div>
            </motion.article>
        );
    };

    const QuickShopModal = ({
        product,
        onClose
    }) => {
        const [size, setSize] = useState(
            product.sizes?.[0] || ""
        );

        const [color, setColor] = useState(
            product.colors?.[0] || ""
        );

        const [quantity, setQuantity] = useState(1);

        const image =
            product.colorImages?.[color] ||
            product.image;

        const addProduct = () => {
            addToCart({
                id: product.id,
                name: product.name,
                price: product.price,
                image,
                category: product.category,
                size:
                    size ||
                    product.sizes?.[0] ||
                    "One Size",
                color:
                    color ||
                    product.colors?.[0] ||
                    "Default",
                quantity
            });

            toast.success(
                `${product.name} added to cart.`
            );

            onClose();
        };

        return (
            <motion.div
                className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 p-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
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
                        scale: 0.96,
                        y: 15
                    }}
                    animate={{
                        opacity: 1,
                        scale: 1,
                        y: 0
                    }}
                    className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-3xl bg-white shadow-2xl"
                >
                    <div className="grid md:grid-cols-2">
                        <div className="relative min-h-[420px] bg-gray-50 p-4">
                            <img
                                src={image}
                                alt={product.name}
                                className="h-full max-h-[560px] w-full object-contain"
                            />

                            <button
                                type="button"
                                onClick={onClose}
                                className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white shadow"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="p-6">
                            <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
                                {product.brand ||
                                    "Zamed Premium"}
                            </p>

                            <h2 className="mt-1 text-2xl font-black">
                                {product.name}
                            </h2>

                            <p className="mt-3 text-2xl font-black">
                                {formatMoney(product.price)}
                            </p>

                            {product.sizes?.length > 0 && (
                                <div className="mt-6">
                                    <p className="mb-2 text-sm font-bold">
                                        Size
                                    </p>

                                    <div className="flex flex-wrap gap-2">
                                        {product.sizes.map(item => (
                                            <button
                                                key={item}
                                                type="button"
                                                onClick={() =>
                                                    setSize(item)
                                                }
                                                className={`rounded-xl border px-4 py-2 text-sm ${
                                                    size === item
                                                        ? "border-black bg-black text-white"
                                                        : "border-gray-200"
                                                }`}
                                            >
                                                {item}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {product.colors?.length > 0 && (
                                <div className="mt-5">
                                    <p className="mb-2 text-sm font-bold">
                                        Color
                                    </p>

                                    <div className="flex flex-wrap gap-2">
                                        {product.colors.map(item => (
                                            <button
                                                key={item}
                                                type="button"
                                                onClick={() =>
                                                    setColor(item)
                                                }
                                                className={`rounded-xl border px-4 py-2 text-sm ${
                                                    color === item
                                                        ? "border-black bg-black text-white"
                                                        : "border-gray-200"
                                                }`}
                                            >
                                                {item}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="mt-5">
                                <p className="mb-2 text-sm font-bold">
                                    Quantity
                                </p>

                                <div className="inline-flex items-center overflow-hidden rounded-xl border border-gray-200">
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setQuantity(
                                                Math.max(
                                                    1,
                                                    quantity - 1
                                                )
                                            )
                                        }
                                        className="h-10 w-10"
                                    >
                                        -
                                    </button>

                                    <span className="w-12 text-center font-bold">
                                        {quantity}
                                    </span>

                                    <button
                                        type="button"
                                        onClick={() =>
                                            setQuantity(
                                                quantity + 1
                                            )
                                        }
                                        className="h-10 w-10"
                                    >
                                        +
                                    </button>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={addProduct}
                                className="mt-7 flex w-full items-center justify-center gap-2 rounded-xl bg-black py-3.5 font-black text-white"
                            >
                                <ShoppingBag size={18} />
                                Add to Cart
                            </button>

                            <button
                                type="button"
                                onClick={() => {
                                    onClose();
                                    navigate(
                                        `/product/${product.id}`
                                    );
                                }}
                                className="mt-3 w-full rounded-xl border border-gray-300 py-3 text-sm font-bold"
                            >
                                View Full Details
                            </button>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        );
    };

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <div className="h-11 w-11 animate-spin rounded-full border-4 border-gray-200 border-t-black" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="border-b bg-white">
                <div className="container mx-auto px-4 py-3">
                    <div className="flex items-center gap-2 text-sm">
                        <Link
                            to="/"
                            className="flex items-center gap-1 text-gray-500"
                        >
                            <Home size={14} />
                            Home
                        </Link>

                        <span className="text-gray-300">
                            /
                        </span>

                        <span className="font-medium text-gray-900">
                            {getTitle()}
                        </span>
                    </div>
                </div>
            </div>

            <section className="bg-black py-9 text-white">
                <div className="container mx-auto px-4 text-center">
                    <h1 className="text-3xl font-black">
                        {getTitle()} Collection
                    </h1>

                    <p className="mt-1 text-sm text-gray-400">
                        {getSubtitle()}
                    </p>

                    <p className="mt-2 text-xs font-bold text-white/70">
                        {filteredProducts.length} products
                    </p>
                </div>
            </section>

            <main className="container mx-auto px-4 py-6">
                <div className="mb-4 flex gap-2">
                    <div className="relative flex-1">
                        <Search
                            size={16}
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                        />

                        <input
                            type="text"
                            value={searchQuery}
                            onChange={event =>
                                setSearchQuery(
                                    event.target.value
                                )
                            }
                            placeholder="Search name, brand, category, material..."
                            className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-10 text-sm outline-none focus:border-black"
                        />

                        {searchQuery && (
                            <button
                                type="button"
                                onClick={() =>
                                    setSearchQuery("")
                                }
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                            >
                                <X size={15} />
                            </button>
                        )}
                    </div>

                    <button
                        type="button"
                        onClick={() =>
                            setShowFilters(true)
                        }
                        className="relative flex items-center gap-2 rounded-xl bg-black px-4 py-3 text-sm font-bold text-white"
                    >
                        <Filter size={16} />
                        Filters

                        {activeFilterCount > 0 && (
                            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1 text-[10px] font-black text-black">
                                {activeFilterCount}
                            </span>
                        )}
                    </button>
                </div>

                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <p className="text-xs text-gray-500">
                        Showing {filteredProducts.length} of{" "}
                        {products.length}
                    </p>

                    <select
                        value={filters.sortBy}
                        onChange={event =>
                            setSortBy(
                                event.target.value
                            )
                        }
                        className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs outline-none focus:border-black"
                    >
                        <option value="featured">
                            Featured
                        </option>
                        <option value="newest">
                            Newest
                        </option>
                        <option value="price-low-high">
                            Price: Low to High
                        </option>
                        <option value="price-high-low">
                            Price: High to Low
                        </option>
                        <option value="rating">
                            Highest Rated
                        </option>
                        <option value="name-a-z">
                            Name: A-Z
                        </option>
                        <option value="name-z-a">
                            Name: Z-A
                        </option>
                    </select>
                </div>

                <ActiveFilterChips
                    filters={filters}
                    priceBounds={priceBounds}
                    formatMoney={formatMoney}
                    removeFilter={removeFilter}
                    clearAllFilters={
                        clearAllFilters
                    }
                />

                {filteredProducts.length === 0 ? (
                    <div className="rounded-2xl bg-white py-16 text-center shadow-sm">
                        <ShoppingBag
                            size={44}
                            className="mx-auto text-gray-300"
                        />

                        <h3 className="mt-3 text-lg font-bold text-gray-700">
                            No products found
                        </h3>

                        <p className="mt-1 text-sm text-gray-400">
                            Try changing or clearing your filters.
                        </p>

                        <button
                            type="button"
                            onClick={clearAllFilters}
                            className="mt-5 rounded-xl bg-black px-5 py-2.5 text-sm font-bold text-white"
                        >
                            Clear Filters
                        </button>
                    </div>
                ) : (
                    <motion.div
                        layout
                        className={`grid ${getGridCols()} gap-4`}
                    >
                        {filteredProducts.map(product => (
                            <ProductCard
                                key={product.id}
                                product={product}
                            />
                        ))}
                    </motion.div>
                )}
            </main>

            <CollectionFilters
                open={showFilters}
                onClose={() =>
                    setShowFilters(false)
                }
                totalProducts={products.length}
                resultCount={
                    filteredProducts.length
                }
                currencyCode={currencyCode}
                formatMoney={formatMoney}
                filters={filters}
                activeFilterCount={
                    activeFilterCount
                }
                priceBounds={priceBounds}
                categories={categories}
                brands={brands}
                sizes={sizes}
                colors={colors}
                setPriceRange={setPriceRange}
                toggleArrayFilter={
                    toggleArrayFilter
                }
                setBooleanFilter={
                    setBooleanFilter
                }
                setSortBy={setSortBy}
                clearAllFilters={
                    clearAllFilters
                }
            />

            <AnimatePresence>
                {selectedProduct && (
                    <QuickShopModal
                        product={selectedProduct}
                        onClose={() =>
                            setSelectedProduct(
                                null
                            )
                        }
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

export default CollectionPage;