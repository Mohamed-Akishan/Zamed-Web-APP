// src/utils/syncCustomers.js

export const syncAllCustomers = () => {
    const allCustomers = [];
    
    // Scan all localStorage keys
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        
        // Find user data
        if (key === 'user') {
            try {
                const user = JSON.parse(localStorage.getItem('user'));
                if (user && user.email) {
                    const userOrders = JSON.parse(localStorage.getItem(`orders_${user.email}`) || '[]');
                    allCustomers.push({
                        name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email.split('@')[0],
                        email: user.email,
                        phone: user.phone || "Not provided",
                        address: user.address || "Not provided",
                        joinDate: user.registeredAt ? user.registeredAt.split('T')[0] : new Date().toISOString().split('T')[0],
                        totalOrders: userOrders.length,
                        totalSpent: userOrders.reduce((sum, o) => sum + (o.total || 0), 0),
                        status: "active"
                    });
                }
            } catch (e) {}
        }
        
        // Find cart data (indicates user exists)
        if (key && key.startsWith('cart_') && !key.includes('guest')) {
            const email = key.replace('cart_', '');
            if (!allCustomers.some(c => c.email === email)) {
                const userOrders = JSON.parse(localStorage.getItem(`orders_${email}`) || '[]');
                allCustomers.push({
                    name: email.split('@')[0],
                    email: email,
                    phone: "Not provided",
                    address: "Not provided",
                    joinDate: new Date().toISOString().split('T')[0],
                    totalOrders: userOrders.length,
                    totalSpent: userOrders.reduce((sum, o) => sum + (o.total || 0), 0),
                    status: "active"
                });
            }
        }
    }
    
    // Remove duplicates
    const uniqueCustomers = [];
    const emailSet = new Set();
    for (const customer of allCustomers) {
        if (!emailSet.has(customer.email)) {
            emailSet.add(customer.email);
            uniqueCustomers.push(customer);
        }
    }
    
    // Save to admin_customers
    localStorage.setItem('admin_customers', JSON.stringify(uniqueCustomers));
    console.log(`✅ Synced ${uniqueCustomers.length} customers to admin panel`);
    
    return uniqueCustomers;
};

// Auto-sync on page load
if (typeof window !== 'undefined') {
    syncAllCustomers();
}