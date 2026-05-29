// src/pages/Admin/AdminUsers.jsx
import { useState, useEffect } from "react";
import { FiPlus, FiEdit2, FiTrash2, FiX, FiUser, FiMail, FiShield } from "react-icons/fi";
import { toast } from "sonner";

const AdminUsers = () => {
    const [admins, setAdmins] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [editingAdmin, setEditingAdmin] = useState(null);
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        password: "",
        role: "editor"
    });

    useEffect(() => {
        loadAdmins();
        
        // Listen for admin updates from other tabs/windows
        const handleStorageChange = () => {
            loadAdmins();
        };
        
        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, []);

    const loadAdmins = () => {
        const stored = JSON.parse(localStorage.getItem('admin_users') || '[]');
        if (stored.length === 0) {
            const defaultAdmins = [
                { id: 1, name: "Super Admin", email: "admin@blacksquad.com", role: "super_admin", createdAt: new Date().toISOString() }
            ];
            localStorage.setItem('admin_users', JSON.stringify(defaultAdmins));
            setAdmins(defaultAdmins);
        } else {
            setAdmins(stored);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        
        if (!formData.name || !formData.email) {
            toast.error("Please fill all required fields");
            return;
        }
        
        const adminData = {
            id: editingAdmin ? editingAdmin.id : Date.now(),
            name: formData.name,
            email: formData.email,
            role: formData.role,
            createdAt: editingAdmin ? editingAdmin.createdAt : new Date().toISOString()
        };

        let updatedAdmins;
        if (editingAdmin) {
            updatedAdmins = admins.map(a => a.id === editingAdmin.id ? adminData : a);
            toast.success("Admin updated successfully!");
            
            // If the updated admin is the currently logged in admin, update localStorage and dispatch event
            const currentAdmin = JSON.parse(localStorage.getItem('admin') || '{}');
            if (currentAdmin.email === adminData.email) {
                const updatedCurrentAdmin = {
                    ...currentAdmin,
                    name: adminData.name,
                    role: adminData.role
                };
                localStorage.setItem('admin', JSON.stringify(updatedCurrentAdmin));
                
                // Dispatch event to update AdminLayout
                window.dispatchEvent(new CustomEvent('adminUpdated'));
                window.dispatchEvent(new Event('storage'));
                
                toast.info("Your admin profile has been updated!");
            }
        } else {
            updatedAdmins = [...admins, adminData];
            toast.success("New admin added successfully!");
        }

        localStorage.setItem('admin_users', JSON.stringify(updatedAdmins));
        setAdmins(updatedAdmins);
        handleCloseModal();
    };

    const handleDelete = (admin) => {
        if (admin.role === 'super_admin') {
            toast.error("Cannot delete Super Admin");
            return;
        }
        
        if (window.confirm(`⚠️ Are you sure you want to delete "${admin.name}"?`)) {
            const updatedAdmins = admins.filter(a => a.id !== admin.id);
            localStorage.setItem('admin_users', JSON.stringify(updatedAdmins));
            setAdmins(updatedAdmins);
            toast.success("Admin deleted successfully!");
            
            // If the deleted admin is the currently logged in admin, log them out
            const currentAdmin = JSON.parse(localStorage.getItem('admin') || '{}');
            if (currentAdmin.email === admin.email) {
                localStorage.removeItem('admin');
                window.dispatchEvent(new CustomEvent('adminUpdated'));
                toast.warning("Your account has been deleted. Please contact support.");
                setTimeout(() => {
                    window.location.href = '/admin/login';
                }, 2000);
            }
        }
    };

    const handleEdit = (admin) => {
        setEditingAdmin(admin);
        setFormData({
            name: admin.name,
            email: admin.email,
            password: "",
            role: admin.role
        });
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setEditingAdmin(null);
        setFormData({ name: "", email: "", password: "", role: "editor" });
    };

    const getRoleBadge = (role) => {
        const badges = {
            super_admin: "bg-red-100 text-red-800",
            admin: "bg-purple-100 text-purple-800",
            editor: "bg-blue-100 text-blue-800",
            viewer: "bg-gray-100 text-gray-800"
        };
        return badges[role] || badges.editor;
    };

    const getRoleDisplay = (role) => {
        const display = {
            super_admin: "Super Admin",
            admin: "Admin",
            editor: "Editor",
            viewer: "Viewer"
        };
        return display[role] || role;
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold">Admin Users</h1>
                    <p className="text-gray-500 text-sm mt-1">Manage administrator accounts</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-blue-700 transition-colors"
                >
                    <FiPlus /> <span>Add Admin</span>
                </button>
            </div>

            <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-3 text-left">Name</th>
                                <th className="px-4 py-3 text-left">Email</th>
                                <th className="px-4 py-3 text-left">Role</th>
                                <th className="px-4 py-3 text-left">Created</th>
                                <th className="px-4 py-3 text-left">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {admins.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="text-center py-8 text-gray-500">
                                        No admin users found
                                    </td>
                                </tr>
                            ) : (
                                admins.map((admin) => (
                                    <tr key={admin.id} className="border-b hover:bg-gray-50 transition-colors">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center space-x-2">
                                                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                                                    {admin.name.charAt(0).toUpperCase()}
                                                </div>
                                                <span className="font-medium">{admin.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center space-x-2">
                                                <FiMail className="text-gray-400" size={14} />
                                                {admin.email}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getRoleBadge(admin.role)}`}>
                                                {getRoleDisplay(admin.role)}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-sm">
                                            {new Date(admin.createdAt).toLocaleDateString()}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex space-x-2">
                                                <button 
                                                    onClick={() => handleEdit(admin)} 
                                                    className="text-blue-600 hover:text-blue-800 transition-colors p-1"
                                                    title="Edit Admin"
                                                >
                                                    <FiEdit2 size={18} />
                                                </button>
                                                <button 
                                                    onClick={() => handleDelete(admin)} 
                                                    className="text-red-600 hover:text-red-800 transition-colors p-1"
                                                    title="Delete Admin"
                                                >
                                                    <FiTrash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add/Edit Admin Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl">
                        <div className="flex justify-between items-center mb-4 pb-2 border-b">
                            <h2 className="text-2xl font-bold">
                                {editingAdmin ? "Edit Admin" : "Add New Admin"}
                            </h2>
                            <button onClick={handleCloseModal} className="text-gray-500 hover:text-gray-700 transition-colors">
                                <FiX size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Full Name *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="John Doe"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Email *
                                </label>
                                <input
                                    type="email"
                                    required
                                    value={formData.email}
                                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="admin@example.com"
                                />
                            </div>

                            {!editingAdmin && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Password *
                                    </label>
                                    <input
                                        type="password"
                                        required={!editingAdmin}
                                        value={formData.password}
                                        onChange={(e) => setFormData({...formData, password: e.target.value})}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="••••••••"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Minimum 6 characters recommended</p>
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Role *
                                </label>
                                <select
                                    value={formData.role}
                                    onChange={(e) => setFormData({...formData, role: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="super_admin">Super Admin (Full Access)</option>
                                    <option value="admin">Admin (All Access except Admin Settings)</option>
                                    <option value="editor">Editor (Products & Orders Only)</option>
                                    <option value="viewer">Viewer (Read Only)</option>
                                </select>
                                <p className="text-xs text-gray-500 mt-1">
                                    {formData.role === 'super_admin' && "Has full access to all features including admin management"}
                                    {formData.role === 'admin' && "Can manage products, orders, customers, but not other admins"}
                                    {formData.role === 'editor' && "Can add/edit products and view orders"}
                                    {formData.role === 'viewer' && "Can only view data, cannot make changes"}
                                </p>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button 
                                    type="submit" 
                                    className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                                >
                                    {editingAdmin ? "Update Admin" : "Add Admin"}
                                </button>
                                <button 
                                    type="button" 
                                    onClick={handleCloseModal} 
                                    className="flex-1 bg-gray-500 text-white py-2 rounded-lg hover:bg-gray-600 transition-colors font-medium"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminUsers;