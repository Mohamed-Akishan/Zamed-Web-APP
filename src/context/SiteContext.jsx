// src/context/SiteContext.jsx
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

const API_URL = (
    import.meta.env.VITE_API_URL ||
    (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
        ? "http://localhost:5000/api"
        : "https://zamed-backend-1.onrender.com/api")
).replace(/\/$/, "");

const DEFAULT_SITE_INFO = {
    siteName: "Zamed",
    siteEmail: "support@zamed.com",
    sitePhone: "+94 77 061 6154",
    siteAddress: "",
    logo: null,
    logoId: null,
    footerLogo: null,
    footerLogoId: null,
    favicon: null,
    faviconId: null,
    heroImage: null,
    heroTitle: "Style That Defines You",
    heroSubtitle: "Discover the latest trends",
    heroButtonText: "Shop Now",
    footerText: "© 2026, Zamed Premium Wear. All rights reserved.",
    currency: "USD",
    currencySymbol: "$",
    slides: [],
    socialLinks: {},
    fontSettings: {}
};

const CURRENCY_SYMBOLS = { USD: "$", EUR: "€", GBP: "£", LKR: "Rs" };

const safeParse = (value, fallback = {}) => {
    try {
        return JSON.parse(value) ?? fallback;
    } catch {
        return fallback;
    }
};

const unwrapSettings = (result) => {
    if (!result || typeof result !== "object") return {};
    return result.settings ?? result.data?.settings ?? result.data ?? result;
};

const isPublicImage = (value) =>
    typeof value === "string" && /^https?:\/\//i.test(value);

const normalizeSlides = (slides = []) => {
    if (!Array.isArray(slides)) return [];

    return slides
        .filter((slide) => slide && typeof slide === "object")
        .map((slide, index) => ({
            ...slide,
            id: slide.id ?? slide._id ?? `slide-${index + 1}`,
            image: isPublicImage(slide.image)
                ? slide.image
                : isPublicImage(slide.imageUrl)
                    ? slide.imageUrl
                    : null,
            active: slide.active !== false,
            order: Number(slide.order ?? index + 1)
        }))
        .sort((a, b) => a.order - b.order);
};

const buildSiteInfo = (settings = {}, localInfo = {}, localImages = {}) => {
    const socialLinks = settings.socialLinks || localInfo.socialLinks || {};
    const fontSettings = settings.fontSettings || localInfo.fontSettings || {};
    const currency = settings.currency || localInfo.currency || "USD";

    const remoteSlides = normalizeSlides(settings.slides);
    const localSlides = normalizeSlides(localInfo.slides || localImages.slides);

    return {
        ...DEFAULT_SITE_INFO,
        ...localInfo,
        ...settings,
        siteName: settings.siteName || localInfo.siteName || DEFAULT_SITE_INFO.siteName,
        siteEmail: settings.siteEmail || localInfo.siteEmail || DEFAULT_SITE_INFO.siteEmail,
        sitePhone: settings.sitePhone || localInfo.sitePhone || DEFAULT_SITE_INFO.sitePhone,
        siteAddress: settings.siteAddress || localInfo.siteAddress || "",
        logo: isPublicImage(settings.logo)
            ? settings.logo
            : isPublicImage(localInfo.logo)
                ? localInfo.logo
                : isPublicImage(localImages.logo)
                    ? localImages.logo
                    : null,
        footerLogo: isPublicImage(settings.footerLogo)
            ? settings.footerLogo
            : isPublicImage(localInfo.footerLogo)
                ? localInfo.footerLogo
                : isPublicImage(localImages.footerLogo)
                    ? localImages.footerLogo
                    : null,
        favicon: isPublicImage(settings.favicon)
            ? settings.favicon
            : isPublicImage(localInfo.favicon)
                ? localInfo.favicon
                : isPublicImage(localImages.favicon)
                    ? localImages.favicon
                    : null,
        heroImage: isPublicImage(settings.heroImage)
            ? settings.heroImage
            : isPublicImage(localInfo.heroImage)
                ? localInfo.heroImage
                : null,
        slides: remoteSlides.length > 0 ? remoteSlides : localSlides,
        socialLinks: {
            facebook: socialLinks.facebook || settings.facebookUrl || "",
            instagram: socialLinks.instagram || settings.instagramUrl || "",
            twitter: socialLinks.twitter || settings.twitterUrl || "",
            youtube: socialLinks.youtube || settings.youtubeUrl || "",
            linkedin: socialLinks.linkedin || settings.linkedinUrl || ""
        },
        fontSettings: {
            primaryFont: fontSettings.primaryFont || settings.primaryFont || "Inter",
            headingFont: fontSettings.headingFont || settings.headingFont || "Poppins",
            bodyFont: fontSettings.bodyFont || settings.bodyFont || "Inter",
            fontScale: fontSettings.fontScale || settings.fontScale || "medium"
        },
        currency,
        currencySymbol: CURRENCY_SYMBOLS[currency] || "$"
    };
};

const updateFavicon = (faviconUrl) => {
    if (!faviconUrl) return;

    let link = document.querySelector("link[rel='icon']");
    if (!link) {
        link = document.createElement("link");
        link.rel = "icon";
        document.head.appendChild(link);
    }
    link.href = faviconUrl;

    let appleLink = document.querySelector("link[rel='apple-touch-icon']");
    if (!appleLink) {
        appleLink = document.createElement("link");
        appleLink.rel = "apple-touch-icon";
        document.head.appendChild(appleLink);
    }
    appleLink.href = faviconUrl;
};

const SiteContext = createContext({
    siteInfo: DEFAULT_SITE_INFO,
    loading: true,
    error: null,
    refreshSiteInfo: async () => {}
});

export const useSite = () => useContext(SiteContext);

export const SiteProvider = ({ children }) => {
    const [siteInfo, setSiteInfo] = useState(DEFAULT_SITE_INFO);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const mountedRef = useRef(true);
    const requestRef = useRef(null);

    const loadSiteInfo = useCallback(async () => {
        requestRef.current?.abort();
        const controller = new AbortController();
        requestRef.current = controller;

        const localSettings = safeParse(localStorage.getItem("site_settings"), {});
        const localInfo = safeParse(localStorage.getItem("site_info"), {});
        const localImages = safeParse(localStorage.getItem("site_images"), {});

        try {
            setLoading(true);

            const response = await fetch(`${API_URL}/settings`, {
                method: "GET",
                headers: { Accept: "application/json" },
                cache: "no-store",
                signal: controller.signal
            });

            const result = await response.json().catch(() => ({}));
            if (!response.ok || result.success === false) {
                throw new Error(result.message || `Settings request failed (${response.status})`);
            }

            const remoteSettings = unwrapSettings(result);
            const nextSiteInfo = buildSiteInfo(remoteSettings, localInfo, localImages);

            // Cache only public server data. The server remains authoritative.
            localStorage.setItem("site_settings", JSON.stringify(remoteSettings));
            localStorage.setItem("site_info", JSON.stringify(nextSiteInfo));

            if (mountedRef.current) {
                setSiteInfo(nextSiteInfo);
                setError(null);
                updateFavicon(nextSiteInfo.favicon);
                window.dispatchEvent(new CustomEvent("logoUpdated", {
                    detail: { logo: nextSiteInfo.logo, logoId: nextSiteInfo.logoId }
                }));
                window.dispatchEvent(new CustomEvent("heroSlidesUpdated", {
                    detail: { slides: nextSiteInfo.slides }
                }));
            }
        } catch (loadError) {
            if (loadError?.name === "AbortError") return;

            console.warn("Unable to load server settings; using browser cache:", loadError);
            const fallbackInfo = buildSiteInfo(localSettings, localInfo, localImages);

            if (mountedRef.current) {
                setSiteInfo(fallbackInfo);
                setError(loadError?.message || "Unable to load website settings");
                updateFavicon(fallbackInfo.favicon);
            }
        } finally {
            if (mountedRef.current && !controller.signal.aborted) {
                setLoading(false);
            }
        }
    }, []);

    useEffect(() => {
        mountedRef.current = true;
        loadSiteInfo();

        const refresh = () => loadSiteInfo();
        const handleStorage = (event) => {
            if (!event.key || ["site_settings", "site_info", "site_images"].includes(event.key)) {
                loadSiteInfo();
            }
        };

        window.addEventListener("settingsSaved", refresh);
        window.addEventListener("siteInfoUpdated", refresh);
        window.addEventListener("siteImagesUpdated", refresh);
        window.addEventListener("storage", handleStorage);

        return () => {
            mountedRef.current = false;
            requestRef.current?.abort();
            window.removeEventListener("settingsSaved", refresh);
            window.removeEventListener("siteInfoUpdated", refresh);
            window.removeEventListener("siteImagesUpdated", refresh);
            window.removeEventListener("storage", handleStorage);
        };
    }, [loadSiteInfo]);

    const value = useMemo(() => ({
        siteInfo,
        loading,
        error,
        refreshSiteInfo: loadSiteInfo
    }), [siteInfo, loading, error, loadSiteInfo]);

    return <SiteContext.Provider value={value}>{children}</SiteContext.Provider>;
};

export default SiteContext;
