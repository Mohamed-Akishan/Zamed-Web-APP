// src/components/Layout/Header.jsx
import Navbar from "./Navbar";

const Header = () => {
    return (
        <header className="border-b border-gray-200 bg-white shadow-sm sticky top-0 z-50">
            <Navbar />
        </header>
    );
};

export default Header;