import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { FiMail, FiLock, FiShield, FiAlertCircle } from "react-icons/fi";
import { Helmet } from "react-helmet-async";

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const AdminLogin = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            // Make sure this is a POST request
            const response = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',  // <-- IMPORTANT: Must be POST
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password })  // <-- Send data in body
            });

            const data = await response.json();
            console.log("Login response:", data);

            if (data.success) {
                // Store token and admin data
                localStorage.setItem('token', data.token);
                localStorage.setItem('admin', JSON.stringify({
                    id: data._id,
                    name: `${data.firstName} ${data.lastName}`,
                    email: data.email,
                    role: data.role
                }));
                
                toast.success(`Welcome back, ${data.firstName}!`);
                navigate("/admin/dashboard");
            } else {
                setError(data.message || "Invalid credentials");
                toast.error(data.message || "Login failed");
            }
        } catch (error) {
            console.error("Login error:", error);
            setError("Server error. Please try again later.");
            toast.error("Server error. Please check if backend is running.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <Helmet>
                <title>ZAMED Admin - Login</title>
                <meta name="description" content="Admin Login for ZAMED Management Dashboard" />
            </Helmet>
            <div className="min-h-screen bg-gradient-to-br from-blue-900 to-purple-900 flex items-center justify-center py-12 px-4">
                <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8">
                    <div className="text-center mb-8">
                        <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                            <FiShield className="w-10 h-10 text-white" />
                        </div>
                        <h2 className="text-3xl font-bold text-gray-900">ZAMED</h2>
                        <p className="text-gray-600 mt-2">Admin Login</p>
                    </div>

                    {error && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-600 text-sm">
                            <FiAlertCircle size={16} />
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                            <div className="relative">
                                <FiMail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="admin@zamed.com"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                            <div className="relative">
                                <FiLock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="••••••••"
                                    required
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-2 rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    Logging in...
                                </span>
                            ) : (
                                "Login"
                            )}
                        </button>
                    </form>

                    <div className="mt-6 text-center text-sm text-gray-500">
                        <p>Admin Credentials:</p>
                        <p className="text-xs">admin@zamed.com / Admin@123456</p>
                    </div>
                </div>
            </div>
        </>
    );
};

export default AdminLogin;