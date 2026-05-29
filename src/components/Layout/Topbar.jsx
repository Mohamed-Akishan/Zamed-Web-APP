import { Link } from "react-router-dom";

const Topbar = () => {
    return (
        <div className="bg-gradient-to-r from-gray-900 to-gray-800 text-white py-2 px-4">
            <div className="container mx-auto flex justify-between items-center text-xs md:text-sm">
                <div className="flex items-center space-x-4">
                    <span>📞 +94 77 061 6154</span>
                    <span>✉️ support@blacksquad.com</span>
                </div>
                <div className="flex items-center space-x-4">
                    <Link to="/login" className="hover:text-gray-300 transition-colors">Login</Link>
                    <Link to="/register" className="hover:text-gray-300 transition-colors">Register</Link>
                </div>
            </div>
        </div>
    );
};
 
export default Topbar;