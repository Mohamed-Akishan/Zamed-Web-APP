// src/components/Layout/UserLayout.jsx
import { Outlet } from "react-router-dom";
import { useSite } from "../../context/SiteContext";
import Header from "./Header";
import Footer from "./Footer";
import Maintenance from "./Maintenance";
import { useEffect, useState } from "react";

const UserLayout = () => {
    const { siteInfo, version } = useSite();
    const [isRefreshing, setIsRefreshing] = useState(false);
    const isAdmin = !!localStorage.getItem('admin');

    useEffect(() => {
        let refreshTimeout;
        let lastSavedTime = localStorage.getItem('site_settings_last_saved');
        
        const checkForUpdates = () => {
            const currentSavedTime = localStorage.getItem('site_settings_last_saved');
            
            if (currentSavedTime && lastSavedTime !== currentSavedTime) {
                console.log("Settings changed! Refreshing page...");
                lastSavedTime = currentSavedTime;
                setIsRefreshing(true);
                refreshTimeout = setTimeout(() => {
                    window.location.reload();
                }, 500);
            }
        };
        
        const handleStorageChange = (e) => {
            if (e.key === 'site_settings_last_saved' || e.key === 'site_info' || e.key === 'site_settings') {
                console.log("Storage changed:", e.key);
                checkForUpdates();
            }
        };
        
        const handleAdminUpdate = () => {
            console.log("Admin update event received");
            checkForUpdates();
        };
        
        const interval = setInterval(checkForUpdates, 3000);
        
        window.addEventListener('storage', handleStorageChange);
        window.addEventListener('adminSettingsSaved', handleAdminUpdate);
        window.addEventListener('siteInfoUpdated', handleAdminUpdate);
        window.addEventListener('settingsSaved', handleAdminUpdate);
        
        return () => {
            clearInterval(interval);
            clearTimeout(refreshTimeout);
            window.removeEventListener('storage', handleStorageChange);
            window.removeEventListener('adminSettingsSaved', handleAdminUpdate);
            window.removeEventListener('siteInfoUpdated', handleAdminUpdate);
            window.removeEventListener('settingsSaved', handleAdminUpdate);
        };
    }, [version]);

    if (isRefreshing) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Updating website...</p>
                </div>
            </div>
        );
    }

    if (siteInfo.maintenanceMode && !isAdmin) {
        return <Maintenance />;
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <Header />
            <main className="flex-grow">
                <Outlet />
            </main>
            <Footer />
        </div>
    );
};

export default UserLayout;