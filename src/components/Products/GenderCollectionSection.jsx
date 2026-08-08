// src/components/Products/GenderCollectionSection.jsx

import { useNavigate } from "react-router-dom";

const GenderCollectionSection = () => {
    const navigate = useNavigate();

    const goToCollection = (gender) => {
        navigate(`/collections/${gender}`);
        requestAnimationFrame(() => {
            window.scrollTo({ top: 0, behavior: "smooth" });
        });
    };

    const collections = [
        {
            id: "men",
            label: "MEN",
            title: "Modern Menswear",
            subtitle: "Clean tailoring, premium essentials and confident everyday style.",
            number: "01",
            accent: "#B9853F",
            background: "linear-gradient(135deg,#151515 0%,#292723 58%,#4b3b28 100%)",
            glow: "rgba(185,133,63,.24)"
        },
        {
            id: "women",
            label: "WOMEN",
            title: "Elegant Womenswear",
            subtitle: "Refined silhouettes, statement pieces and effortless elegance.",
            number: "02",
            accent: "#C57887",
            background: "linear-gradient(135deg,#2c2024 0%,#5d3942 58%,#8d5d68 100%)",
            glow: "rgba(197,120,135,.24)"
        },
        {
            id: "kids",
            label: "KIDS",
            title: "Playful Kidswear",
            subtitle: "Comfortable, stylish and fun pieces made for little personalities.",
            number: "03",
            accent: "#93A562",
            background: "linear-gradient(135deg,#23251d 0%,#485138 58%,#78845d 100%)",
            glow: "rgba(147,165,98,.24)"
        }
    ];

    return (
        <section
            className="relative overflow-hidden bg-[#f7f3ec] py-16 sm:py-20 lg:py-24"
            aria-label="Shop by collection"
        >
            <div className="pointer-events-none absolute -left-24 top-14 h-72 w-72 rounded-full bg-[#b9853f]/10 blur-3xl" />
            <div className="pointer-events-none absolute -right-24 bottom-10 h-80 w-80 rounded-full bg-[#b9853f]/10 blur-3xl" />

            <div className="relative mx-auto max-w-[1480px] px-4 sm:px-6 lg:px-8">
                <div className="mx-auto mb-12 max-w-3xl text-center sm:mb-14 lg:mb-16">
                    <div className="mb-5 flex items-center justify-center gap-3">
                        <span className="h-px w-10 bg-[#b9853f]/40 sm:w-14" />
                        <span className="text-[10px] font-bold uppercase tracking-[0.32em] text-[#9a6b2f] sm:text-[11px]">
                            Zamed Collections
                        </span>
                        <span className="h-px w-10 bg-[#b9853f]/40 sm:w-14" />
                    </div>

                    <h2
                        className="text-4xl leading-[0.95] text-[#171717] sm:text-5xl lg:text-6xl xl:text-7xl"
                        style={{ fontFamily: "'Times New Roman', Times, serif" }}
                    >
                        Find Your <span className="italic text-[#b9853f]">Signature Style</span>
                    </h2>

                    <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-gray-500 sm:text-base">
                        Explore premium collections designed for men, women and kids.
                    </p>
                </div>

                <div className="grid gap-5 lg:grid-cols-3">
                    {collections.map((collection) => (
                        <button
                            key={collection.id}
                            type="button"
                            onClick={() => goToCollection(collection.id)}
                            className="group relative min-h-[520px] overflow-hidden rounded-[30px] text-left shadow-[0_22px_60px_rgba(32,24,16,0.14)] transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_30px_75px_rgba(32,24,16,0.22)] sm:min-h-[580px] lg:min-h-[620px]"
                            style={{ background: collection.background }}
                        >
                            <div
                                className="absolute -right-20 -top-16 h-64 w-64 rounded-full blur-3xl transition-transform duration-700 group-hover:scale-125"
                                style={{ background: collection.glow }}
                            />

                            <div
                                className="absolute -right-4 top-12 select-none text-[150px] font-black leading-none text-white/[0.045] sm:text-[180px]"
                                aria-hidden="true"
                            >
                                {collection.number}
                            </div>

                            <div className="relative z-10 flex h-full min-h-[520px] flex-col justify-between p-6 sm:min-h-[580px] sm:p-7 lg:min-h-[620px]">
                                <div className="flex items-center justify-between">
                                    <div
                                        className="rounded-full border px-3 py-2 text-[10px] font-bold tracking-[0.22em]"
                                        style={{
                                            borderColor: `${collection.accent}66`,
                                            color: collection.accent,
                                            background: "rgba(255,255,255,.06)"
                                        }}
                                    >
                                        {collection.label}
                                    </div>

                                    <div className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white transition-all duration-300 group-hover:rotate-45 group-hover:bg-white group-hover:text-black">
                                        ↗
                                    </div>
                                </div>

                                <div className="relative py-10">
                                    <div className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-white/[0.08]" />

                                    <div className="relative mx-auto flex h-52 w-52 items-center justify-center rounded-full border border-white/[0.08] sm:h-60 sm:w-60">
                                        <div
                                            className="absolute inset-5 rounded-full blur-2xl"
                                            style={{ background: collection.glow }}
                                        />

                                        <span
                                            className="relative text-[110px] font-black leading-none text-white/[0.12] sm:text-[132px]"
                                            style={{ fontFamily: "'Times New Roman', Times, serif" }}
                                        >
                                            {collection.label.charAt(0)}
                                        </span>

                                        <div className="absolute bottom-4 left-1/2 h-1 w-16 -translate-x-1/2 rounded-full bg-white/10" />
                                    </div>
                                </div>

                                <div>
                                    <p
                                        className="text-[10px] font-bold uppercase tracking-[0.2em]"
                                        style={{ color: collection.accent }}
                                    >
                                        Zamed Premium Wear
                                    </p>

                                    <h3
                                        className="mt-2 max-w-[90%] text-4xl leading-[0.98] text-white sm:text-5xl"
                                        style={{ fontFamily: "'Times New Roman', Times, serif" }}
                                    >
                                        {collection.title}
                                    </h3>

                                    <p className="mt-4 max-w-md text-sm leading-6 text-white/65">
                                        {collection.subtitle}
                                    </p>

                                    <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-5">
                                        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-white/80">
                                            Shop Collection
                                        </span>

                                        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-lg text-black transition-all duration-300 group-hover:translate-x-1">
                                            →
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </button>
                    ))}
                </div>

                <div className="mt-6 overflow-hidden rounded-[26px] border border-[#e6dccb] bg-white">
                    <div className="grid md:grid-cols-[1.4fr_1fr]">
                        <div className="p-6 sm:p-8">
                            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#a16e20]">
                                One Store. Every Style.
                            </p>

                            <h3
                                className="mt-2 max-w-xl text-2xl leading-tight text-gray-900 sm:text-3xl"
                                style={{ fontFamily: "'Times New Roman', Times, serif" }}
                            >
                                Premium fashion for every member of your family.
                            </h3>
                        </div>

                        <button
                            type="button"
                            onClick={() => navigate("/collections/all")}
                            className="group flex items-center justify-between gap-5 border-t border-[#eee4d5] px-6 py-6 text-left transition hover:bg-[#171717] md:border-l md:border-t-0 sm:px-8"
                        >
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-400 transition group-hover:text-white/50">
                                    Explore More
                                </p>
                                <p className="mt-1 text-sm font-bold text-gray-900 transition group-hover:text-white">
                                    View All Products
                                </p>
                            </div>

                            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-black text-xl text-white transition group-hover:bg-[#b9853f]">
                                →
                            </span>
                        </button>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default GenderCollectionSection;
