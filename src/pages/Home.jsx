// src/pages/Home.jsx

import Hero from "../components/Layout/Hero";
import GenderCollectionSection from "../components/Products/GenderCollectionSection";
import NewArrivals from "../components/Products/NewArrivals";
import FeaturedCollection from "../components/Products/FeaturedCollection";
import FeaturesSection from "../components/Products/FeaturesSection";

const Home = () => {
    return (
        <main className="min-h-screen bg-white">
            {/* Hero */}
            <Hero />

            {/* Men, Women and Kids collections */}
            <GenderCollectionSection />

            {/* New Arrival products */}
            <NewArrivals />

            {/* Featured products */}
            <FeaturedCollection />

            {/* Shipping, payment, returns and support */}
            <FeaturesSection />
        </main>
    );
};

export default Home;