import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FiMail, FiLock, FiEye, FiEyeOff } from "react-icons/fi";
import { toast } from "sonner";

const API_URL = import.meta.env.VITE_API_URL || 'https://zamed-backend.onrender.com/api';

const Login = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        
        try {
            const response = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password })
            });
            
            const data = await response.json();
            
            if (data.success) {
                // Store user data and token
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify({
                    id: data._id,
                    firstName: data.firstName,
                    lastName: data.lastName,
                    email: data.email,
                    role: data.role
                }));
                
                toast.success(`Welcome back, ${data.firstName}!`);
                
                // Check for redirect after login
                const redirectTo = localStorage.getItem('redirectAfterLogin');
                if (redirectTo) {
                    localStorage.removeItem('redirectAfterLogin');
                    navigate(redirectTo);
                } else {
                    navigate("/");
                }
            } else {
                toast.error(data.message || "Login failed. Please check your credentials.");
            }
        } catch (error) {
            console.error("Login error:", error);
            toast.error("Server error. Please try again later.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
            <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
                <div className="text-center mb-8">
                    <h2 className="text-3xl font-bold text-gray-900">Welcome Back</h2>
                    <p className="text-gray-600 mt-2">Login to your account</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Email Address
                        </label>
                        <div className="relative">
                            <FiMail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="you@example.com"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Password
                        </label>
                        <div className="relative">
                            <FiLock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                            <input
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="••••••••"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 transform -translate-y-1/2"
                            >
                                {showPassword ? <FiEyeOff className="text-gray-400" /> : <FiEye className="text-gray-400" />}
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center justify-between">
                        <label className="flex items-center">
                            <input type="checkbox" className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
                            <span className="ml-2 text-sm text-gray-600">Remember me</span>
                        </label>
                        <a href="#" className="text-sm text-blue-600 hover:text-blue-800">
                            Forgot password?
                        </a>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                        {loading ? "Logging in..." : "Login"}
                    </button>
                </form>

                <p className="text-center mt-6 text-gray-600">
                    Don't have an account?{" "}
                    <Link to="/register" className="text-blue-600 font-semibold hover:text-blue-800">
                        Register
                    </Link>
                </p>
            </div>
        </div>
    );
};

export default Login;