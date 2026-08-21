// src/components/Common/SearchBar.jsx
import { useState, useEffect, useRef } from "react";
import { Search, X, Clock3 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

const SEARCH_HISTORY_KEY = "zamed_search_history";

const SearchBar = ({
    mobile = false,
    onSearch,
    placeholder = "Search products...",
    onClose // NEW: callback to close mobile search
}) => {
    const [query, setQuery] = useState("");
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [expanded, setExpanded] = useState(mobile);

    const wrapperRef = useRef(null);
    const inputRef = useRef(null);
    const navigate = useNavigate();

    const getHistory = () => {
        try {
            const history = JSON.parse(
                localStorage.getItem(SEARCH_HISTORY_KEY) || "[]"
            );
            return Array.isArray(history) ? history : [];
        } catch {
            return [];
        }
    };

    const saveToHistory = (term) => {
        const clean = String(term || "").trim();
        if (!clean) return;

        const history = getHistory();
        const updated = [
            clean,
            ...history.filter(
                item => item.toLowerCase() !== clean.toLowerCase()
            )
        ].slice(0, 10);

        localStorage.setItem(
            SEARCH_HISTORY_KEY,
            JSON.stringify(updated)
        );
    };

    useEffect(() => {
        const cleanQuery = query.trim().toLowerCase();

        if (!cleanQuery) {
            setSuggestions(getHistory().slice(0, 5));
            return;
        }

        const filtered = getHistory().filter(item =>
            item.toLowerCase().includes(cleanQuery)
        );

        setSuggestions(filtered.slice(0, 5));
    }, [query]);

    useEffect(() => {
        const handleClickOutside = event => {
            if (
                wrapperRef.current &&
                !wrapperRef.current.contains(event.target)
            ) {
                setShowSuggestions(false);

                if (!mobile && !query.trim()) {
                    setExpanded(false);
                }
            }
        };

        document.addEventListener("mousedown", handleClickOutside);

        return () =>
            document.removeEventListener(
                "mousedown",
                handleClickOutside
            );
    }, [mobile, query]);

    const executeSearch = term => {
        const clean = String(term || "").trim();
        if (!clean) return;

        saveToHistory(clean);
        setQuery(clean);
        setShowSuggestions(false);

        if (onSearch) {
            onSearch(clean);
        } else {
            navigate(`/search?q=${encodeURIComponent(clean)}`);
        }

        inputRef.current?.blur();

        if (!mobile) {
            setExpanded(false);
        }
        
        // NEW: Close mobile search if onClose provided
        if (mobile && onClose) {
            onClose();
        }
    };

    const handleSubmit = event => {
        event.preventDefault();
        executeSearch(query);
    };

    const handleSuggestionClick = suggestion => {
        executeSearch(suggestion);
    };

    const clearSearch = event => {
        event?.stopPropagation();
        setQuery("");
        setSuggestions(getHistory().slice(0, 5));
        setShowSuggestions(true);
        setExpanded(true);

        requestAnimationFrame(() => {
            inputRef.current?.focus();
        });
    };

    const openSearch = () => {
        if (mobile) return;

        setExpanded(true);
        setSuggestions(getHistory().slice(0, 5));
        setShowSuggestions(true);

        requestAnimationFrame(() => {
            inputRef.current?.focus();
        });
    };

    // Mobile: full-width search field
    if (mobile) {
        return (
            <div ref={wrapperRef} className="relative w-full">
                <form onSubmit={handleSubmit} className="relative">
                    <Search
                        size={17}
                        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                    />

                    <input
                        ref={inputRef}
                        type="search"
                        value={query}
                        onChange={event => {
                            setQuery(event.target.value);
                            setShowSuggestions(true);
                        }}
                        onFocus={() => {
                            setSuggestions(getHistory().slice(0, 5));
                            setShowSuggestions(true);
                        }}
                        placeholder={placeholder}
                        autoComplete="off"
                        className="w-full rounded-xl border border-gray-200 bg-gray-100 py-2.5 pl-10 pr-10 text-sm outline-none transition-all placeholder:text-gray-400 focus:border-orange-400 focus:bg-white focus:ring-2 focus:ring-orange-500/10"
                    />

                    {query && (
                        <button
                            type="button"
                            onClick={clearSearch}
                            className="absolute right-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-gray-400 transition hover:bg-gray-200 hover:text-gray-700"
                            aria-label="Clear search"
                        >
                            <X size={15} />
                        </button>
                    )}
                </form>

                <Suggestions
                    visible={showSuggestions}
                    suggestions={suggestions}
                    onSelect={handleSuggestionClick}
                />
            </div>
        );
    }

    // Desktop: compact icon by default, expanding search input only when clicked.
    return (
        <div
            ref={wrapperRef}
            className="relative flex h-10 items-center justify-end"
        >
            <AnimatePresence initial={false} mode="wait">
                {!expanded ? (
                    <motion.button
                        key="search-icon"
                        type="button"
                        onClick={openSearch}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        title="Search"
                        aria-label="Search products"
                        className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-gray-600 transition-all hover:bg-gradient-to-r hover:from-orange-500/10 hover:to-red-500/10 hover:text-orange-500"
                    >
                        <Search className="h-4 w-4 md:h-5 md:w-5" />
                    </motion.button>
                ) : (
                    <motion.form
                        key="search-input"
                        onSubmit={handleSubmit}
                        initial={{ width: 40, opacity: 0 }}
                        animate={{ width: 220, opacity: 1 }}
                        exit={{ width: 40, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="relative"
                    >
                        <Search
                            size={16}
                            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                        />

                        <input
                            ref={inputRef}
                            type="search"
                            value={query}
                            onChange={event => {
                                setQuery(event.target.value);
                                setShowSuggestions(true);
                            }}
                            onFocus={() => {
                                setSuggestions(getHistory().slice(0, 5));
                                setShowSuggestions(true);
                            }}
                            placeholder={placeholder}
                            autoComplete="off"
                            className="h-10 w-full rounded-xl border border-gray-200 bg-white pl-9 pr-9 text-sm outline-none shadow-sm transition placeholder:text-gray-400 focus:border-orange-400 focus:ring-2 focus:ring-orange-500/10"
                        />

                        <button
                            type="button"
                            onClick={clearSearch}
                            className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
                            aria-label="Clear search"
                        >
                            <X size={14} />
                        </button>

                        <Suggestions
                            visible={showSuggestions}
                            suggestions={suggestions}
                            onSelect={handleSuggestionClick}
                        />
                    </motion.form>
                )}
            </AnimatePresence>
        </div>
    );
};

const Suggestions = ({
    visible,
    suggestions,
    onSelect
}) => (
    <AnimatePresence>
        {visible && suggestions.length > 0 && (
            <motion.div
                initial={{ opacity: 0, y: -6, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.98 }}
                transition={{ duration: 0.15 }}
                className="absolute left-0 right-0 top-[calc(100%+8px)] z-[70] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl"
            >
                <div className="flex items-center gap-2 border-b border-gray-100 px-3 py-2">
                    <Clock3 size={13} className="text-gray-400" />
                    <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                        Recent Searches
                    </span>
                </div>

                {suggestions.map(item => (
                    <button
                        key={item}
                        type="button"
                        onClick={() => onSelect(item)}
                        className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-gray-50"
                    >
                        <Search size={14} className="shrink-0 text-gray-400" />
                        <span className="truncate text-sm text-gray-700">
                            {item}
                        </span>
                    </button>
                ))}
            </motion.div>
        )}
    </AnimatePresence>
);

export default SearchBar;