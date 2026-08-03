import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Helmet, HelmetProvider } from 'react-helmet-async';
import UserLayout from "./components/Layout/UserLayout";
import Home from "./pages/Home";
import { Toaster } from "sonner";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Profile from "./pages/Profile";
import CollectionPage from "./pages/CollectionPage";
import ProductDetails from "./components/Products/ProductDetails";
import Checkout from "./pages/Checkout";
import OrderSuccess from "./pages/OrderSuccess";
import Cart from "./pages/Cart";
import AdminLayout from "./components/Admin/AdminLayout";
import AdminLogin from "./pages/Admin/AdminLogin";
import Dashboard from "./pages/Admin/Dashboard";
import Products from "./pages/Admin/Products";
import Orders from "./pages/Admin/Orders";
import Customers from "./pages/Admin/Customers";
import Categories from "./pages/Admin/Categories";
import AdminUsers from "./pages/Admin/AdminUsers";
import Settings from "./pages/Admin/Settings";
import Inventory from "./pages/Admin/Inventory";
import Coupons from "./pages/Admin/Coupons";
import Reviews from "./pages/Admin/Reviews";
import Payments from "./pages/Admin/Payments";
import Reports from "./pages/Admin/Reports";
import ReturnManagement from "./pages/Admin/ReturnManagement";
import { CartProvider } from "./context/CartContext";
import { SiteProvider } from "./context/SiteContext";
import { AuthProvider } from "./context/AuthContext";
import SearchResults from "./pages/SearchResults";

const App = () => {
  return (
    <HelmetProvider>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Helmet>
          <title>Zamed Premium Wear - Premium Fashion Clothing</title>
          <meta name="description" content="Zamed Premium Wear - Discover premium fashion for men, women, and kids." />
        </Helmet>
        <SiteProvider>
          <AuthProvider>
            <CartProvider>
              <Toaster position="top-center" richColors />
              <Routes>
                {/* User Routes */}
                <Route path="/" element={<UserLayout />}>
                  <Route index element={<Home />} />
                  <Route path="login" element={<Login />} />
                  <Route path="register" element={<Register />} />
                  <Route path="profile" element={<Profile />} />
                  <Route path="cart" element={<Cart />} />
                  <Route path="collections/:collection" element={<CollectionPage />} />
                  <Route path="product/:id" element={<ProductDetails />} />
                  <Route path="checkout" element={<Checkout />} />
                  <Route path="order-success" element={<OrderSuccess />} />
                  <Route path="search" element={<SearchResults />} />
                </Route>
                
                {/* Admin Routes */}
                <Route path="/admin/login" element={<AdminLogin />} />
                <Route path="/admin" element={<AdminLayout />}>
                  <Route index element={<Dashboard />} />
                  <Route path="dashboard" element={<Dashboard />} />
                  <Route path="products" element={<Products />} />
                  <Route path="orders" element={<Orders />} />
                  <Route path="customers" element={<Customers />} />
                  <Route path="categories" element={<Categories />} />
                  <Route path="inventory" element={<Inventory />} />
                  <Route path="coupons" element={<Coupons />} />
                  <Route path="reviews" element={<Reviews />} />
                  <Route path="payments" element={<Payments />} />
                  <Route path="reports" element={<Reports />} />
                  <Route path="admins" element={<AdminUsers />} />
                  <Route path="settings" element={<Settings />} />
                  <Route path="returns" element={<ReturnManagement />} />
                </Route>
              </Routes>
            </CartProvider>
          </AuthProvider>
        </SiteProvider>
      </BrowserRouter>
    </HelmetProvider>
  );
};

export default App;