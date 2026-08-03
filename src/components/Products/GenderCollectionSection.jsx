// src/components/Products/GenderCollectionSection.jsx

import { useState } from "react";
import { useNavigate } from "react-router-dom";

const GenderCollectionSection = () => {
    const navigate = useNavigate();

    const [imageLoaded, setImageLoaded] = useState(false);
    const [imageError, setImageError] = useState(false);

    // Collection image path
    const collectionImage = "/images/shop-by-collection-ui.png";

    const goToCollection = (gender) => {
        navigate(`/collections/${gender}`);

        requestAnimationFrame(() => {
            window.scrollTo({
                top: 0,
                behavior: "smooth",
            });
        });
    };

    // Fallback UI with collection cards
    const renderFallbackUI = () => (
        <div className="w-full bg-[#fbf7f1] px-4 py-12 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-7xl">
                {/* Header */}
                <div className="mb-10 text-center">
                    <h2 
                        className="text-3xl font-semibold text-gray-900 sm:text-4xl"
                        style={{ fontFamily: "'Times New Roman', Times, serif" }}
                    >
                        Shop By Collection
                    </h2>
                    <p className="mt-2 text-sm text-gray-500 sm:text-base">
                        Discover premium fashion for everyone
                    </p>
                </div>

                {/* Collection Cards Grid */}
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {/* Men's Collection */}
                    <button
                        type="button"
                        onClick={() => goToCollection("men")}
                        className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 to-gray-800 p-1 shadow-lg transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl"
                    >
                        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-black/50 p-8 flex flex-col items-center justify-center text-center">
                            <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-white/10 text-4xl text-white backdrop-blur-sm">
                                👔
                            </div>
                            <h3 className="text-2xl font-bold text-white">Men's Collection</h3>
                            <p className="mt-2 text-sm text-white/70">Premium fashion for men</p>
                            <span className="mt-4 inline-block rounded-full bg-white px-6 py-2 text-sm font-semibold text-gray-900 transition-all group-hover:bg-gray-100">
                                Shop Now →
                            </span>
                        </div>
                    </button>

                    {/* Women's Collection */}
                    <button
                        type="button"
                        onClick={() => goToCollection("women")}
                        className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-rose-700 to-pink-800 p-1 shadow-lg transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl"
                    >
                        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-black/50 p-8 flex flex-col items-center justify-center text-center">
                            <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-white/10 text-4xl text-white backdrop-blur-sm">
                                👗
                            </div>
                            <h3 className="text-2xl font-bold text-white">Women's Collection</h3>
                            <p className="mt-2 text-sm text-white/70">Elegant fashion for women</p>
                            <span className="mt-4 inline-block rounded-full bg-white px-6 py-2 text-sm font-semibold text-gray-900 transition-all group-hover:bg-gray-100">
                                Shop Now →
                            </span>
                        </div>
                    </button>

                    {/* Kids' Collection */}
                    <button
                        type="button"
                        onClick={() => goToCollection("kids")}
                        className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-700 to-cyan-800 p-1 shadow-lg transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl sm:col-span-2 lg:col-span-1"
                    >
                        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-black/50 p-8 flex flex-col items-center justify-center text-center">
                            <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-white/10 text-4xl text-white backdrop-blur-sm">
                                🧸
                            </div>
                            <h3 className="text-2xl font-bold text-white">Kids' Collection</h3>
                            <p className="mt-2 text-sm text-white/70">Stylish fashion for kids</p>
                            <span className="mt-4 inline-block rounded-full bg-white px-6 py-2 text-sm font-semibold text-gray-900 transition-all group-hover:bg-gray-100">
                                Shop Now →
                            </span>
                        </div>
                    </button>
                </div>

                {/* Development help */}
                {import.meta.env.DEV && (
                    <div className="mt-8 rounded-xl border border-yellow-200 bg-yellow-50 p-4">
                        <p className="text-sm font-semibold text-yellow-700">
                            💡 Collection image fallback active
                        </p>
                        <p className="mt-1 text-xs text-yellow-600">
                            To use the main image, place it at: 
                            <code className="ml-1 rounded bg-yellow-100 px-2 py-0.5 font-mono">
                                public/images/shop-by-collection-ui.png
                            </code>
                        </p>
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <section
            className="w-full bg-[#fbf7f1]"
            aria-label="Shop by collection"
        >
            <div className="mx-auto w-full max-w-[2048px]">
                {imageError ? (
                    renderFallbackUI()
                ) : (
                    <div className="relative w-full overflow-hidden">
                        {/* Loading placeholder */}
                        {!imageLoaded && (
                            <div className="absolute inset-0 z-10 flex min-h-[400px] items-center justify-center bg-[#fbf7f1]">
                                <div className="flex flex-col items-center gap-4">
                                    <div className="h-10 w-10 animate-spin rounded-full border-2 border-gray-200 border-t-black" />
                                    <span className="text-sm text-gray-500">
                                        Loading collections...
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* Main Image */}
                        <img
                            src={collectionImage}
                            alt="Shop by Collection - Men's, Women's and Kids collections"
                            className={`block h-auto w-full select-none transition-opacity duration-500 ${
                                imageLoaded ? "opacity-100" : "opacity-0"
                            }`}
                            draggable="false"
                            loading="eager"
                            onLoad={() => {
                                setImageLoaded(true);
                                setImageError(false);
                            }}
                            onError={() => {
                                console.error(
                                    `Collection image failed to load: ${collectionImage}`
                                );
                                setImageLoaded(false);
                                setImageError(true);
                            }}
                        />

                        {/* Clickable Collection Areas */}
                        {imageLoaded && (
                            <>
                                {/* MEN */}
                                <button
                                    type="button"
                                    onClick={() => goToCollection("men")}
                                    aria-label="Shop Men's Collection"
                                    title="Shop Men's Collection"
                                    className="
                                        absolute
                                        left-[2.5%]
                                        top-[27.5%]
                                        h-[57.5%]
                                        w-[30.3%]
                                        cursor-pointer
                                        rounded-[2vw]
                                        bg-transparent
                                        outline-none
                                        transition-all
                                        duration-300
                                        focus-visible:ring-4
                                        focus-visible:ring-[#c98a2f]/70
                                        hover:bg-white/5
                                    "
                                />

                                {/* WOMEN */}
                                <button
                                    type="button"
                                    onClick={() => goToCollection("women")}
                                    aria-label="Shop Women's Collection"
                                    title="Shop Women's Collection"
                                    className="
                                        absolute
                                        left-[33.9%]
                                        top-[27.5%]
                                        h-[57.5%]
                                        w-[30.3%]
                                        cursor-pointer
                                        rounded-[2vw]
                                        bg-transparent
                                        outline-none
                                        transition-all
                                        duration-300
                                        focus-visible:ring-4
                                        focus-visible:ring-[#d84970]/70
                                        hover:bg-white/5
                                    "
                                />

                                {/* KIDS */}
                                <button
                                    type="button"
                                    onClick={() => goToCollection("kids")}
                                    aria-label="Shop Kids Collection"
                                    title="Shop Kids Collection"
                                    className="
                                        absolute
                                        left-[65.3%]
                                        top-[27.5%]
                                        h-[57.5%]
                                        w-[30.3%]
                                        cursor-pointer
                                        rounded-[2vw]
                                        bg-transparent
                                        outline-none
                                        transition-all
                                        duration-300
                                        focus-visible:ring-4
                                        focus-visible:ring-[#708d38]/70
                                        hover:bg-white/5
                                    "
                                />
                            </>
                        )}
                    </div>
                )}
            </div>
        </section>
    );
};

export default GenderCollectionSection;