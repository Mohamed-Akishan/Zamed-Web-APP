// src/components/Products/GenderCollectionSection.jsx
import { useNavigate } from "react-router-dom";

const GenderCollectionSection = () => {
    const navigate = useNavigate();

    const goToCollection = (gender) => {
        navigate(`/collections/${gender}`);

        requestAnimationFrame(() => {
            window.scrollTo({
                top: 0,
                behavior: "smooth"
            });
        });
    };

    return (
        <section
            className="w-full bg-[#fbf7f1]"
            aria-label="Shop by collection"
        >
            <div className="mx-auto w-full max-w-[2048px]">
                <div className="relative w-full overflow-hidden">

                    {/* Exact approved UI image */}
                    <img
                        src="/images/shop-by-collection-ui.png"
                        alt="Shop by Collection - Men's, Women's and Kids collections"
                        className="block h-auto w-full select-none"
                        draggable="false"
                    />

                    {/*
                        Transparent click layers.
                        These positions match the approved UI image:
                        Men   = left card
                        Women = centre card
                        Kids  = right card
                    */}

                    {/* MEN */}
                    <button
                        type="button"
                        onClick={() => goToCollection("men")}
                        aria-label="Shop Men's Collection"
                        title="Shop Men's Collection"
                        className="absolute left-[2.5%] top-[27.5%] h-[57.5%] w-[30.3%] cursor-pointer rounded-[2vw] bg-transparent outline-none transition focus-visible:ring-4 focus-visible:ring-[#c98a2f]/70"
                    />

                    {/* WOMEN */}
                    <button
                        type="button"
                        onClick={() => goToCollection("women")}
                        aria-label="Shop Women's Collection"
                        title="Shop Women's Collection"
                        className="absolute left-[33.9%] top-[27.5%] h-[57.5%] w-[30.3%] cursor-pointer rounded-[2vw] bg-transparent outline-none transition focus-visible:ring-4 focus-visible:ring-[#d84970]/70"
                    />

                    {/* KIDS */}
                    <button
                        type="button"
                        onClick={() => goToCollection("kids")}
                        aria-label="Shop Kids Collection"
                        title="Shop Kids Collection"
                        className="absolute left-[65.3%] top-[27.5%] h-[57.5%] w-[30.3%] cursor-pointer rounded-[2vw] bg-transparent outline-none transition focus-visible:ring-4 focus-visible:ring-[#708d38]/70"
                    />
                </div>
            </div>
        </section>
    );
};

export default GenderCollectionSection;
