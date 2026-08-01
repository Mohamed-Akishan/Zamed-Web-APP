// src/pages/Register.jsx
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FiArrowRight,
  FiEye,
  FiEyeOff,
  FiLock,
  FiMail,
  FiPhone,
  FiShield,
  FiShoppingBag,
  FiUser,
} from "react-icons/fi";
import { motion } from "framer-motion";
import { toast } from "sonner";

const API_URL =
  import.meta.env.VITE_API_URL ||
  "https://zamed-backend.onrender.com/api";

const DB_NAME = "ZamedImageStore";
const STORE_NAME = "images";

const DEFAULT_AUTH = {
  siteName: "Zamed Premium Wear",
  authEyebrow: "ZAMED PREMIUM",
  registerTitle: "Create Your Account",
  registerSubtitle:
    "Join ZAMED PREMIUM and enjoy a seamless shopping experience.",
  registerPromoTitle: "Discover Premium. Live Better.",
  registerPromoText: "Quality you can trust, style you'll love.",
  registerButtonText: "Create Account",
  authPrimaryColor: "#c79342",
  authSecondaryColor: "#2a2118",
  authImagePosition: "center",
  authBorderRadius: 28,
  authBackgroundBlur: 18,
  showGoogleLogin: true,
  showFacebookLogin: true,
  showPasswordStrength: true,
  showTermsAgreement: true,
  showNewsletterOptIn: true,
  showAuthTrustBadges: true,
  primaryFont: "Inter",
  headingFont: "Playfair Display",
};

const openImageDatabase = () =>
  new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      resolve(null);
      return;
    }

    const request = indexedDB.open(DB_NAME);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("type", "type", { unique: false });
        store.createIndex("timestamp", "timestamp", { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

const getStoredImage = async (id) => {
  if (!id) return null;

  try {
    const db = await openImageDatabase();
    if (!db || !db.objectStoreNames.contains(STORE_NAME)) return null;

    return await new Promise((resolve) => {
      const transaction = db.transaction(STORE_NAME, "readonly");
      const request = transaction.objectStore(STORE_NAME).get(String(id));

      request.onsuccess = () =>
        resolve(request.result ? request.result.data : null);
      request.onerror = () => resolve(null);
    });
  } catch (error) {
    console.warn("Unable to load image from IndexedDB:", error);
    return null;
  }
};

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
    <path
      fill="#4285F4"
      d="M21.8 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.5a4.7 4.7 0 0 1-2 3.1v2.6h3.2c1.9-1.7 3.1-4.3 3.1-7.5Z"
    />
    <path
      fill="#34A853"
      d="M12 22c2.7 0 5-.9 6.7-2.3l-3.2-2.6c-.9.6-2 1-3.5 1-2.6 0-4.8-1.8-5.6-4.2H3.1v2.7A10 10 0 0 0 12 22Z"
    />
    <path
      fill="#FBBC05"
      d="M6.4 13.9a6 6 0 0 1 0-3.8V7.4H3.1a10 10 0 0 0 0 9.2l3.3-2.7Z"
    />
    <path
      fill="#EA4335"
      d="M12 5.9c1.6 0 3 .5 4.1 1.6l3.1-3A10 10 0 0 0 3.1 7.4l3.3 2.7C7.2 7.7 9.4 5.9 12 5.9Z"
    />
  </svg>
);

const FacebookIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
    <circle cx="12" cy="12" r="11" fill="#1877F2" />
    <path
      fill="#fff"
      d="M13.6 21v-8h2.7l.4-3.1h-3.1v-2c0-.9.2-1.5 1.6-1.5h1.7V3.6c-.3 0-1.3-.1-2.5-.1-2.5 0-4.2 1.5-4.2 4.3v2.1H7.4V13h2.8v8h3.4Z"
    />
  </svg>
);

const Register = () => {
  const navigate = useNavigate();

  const [auth, setAuth] = useState(DEFAULT_AUTH);
  const [assets, setAssets] = useState({
    logo: null,
    background: null,
  });

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [newsletter, setNewsletter] = useState(true);
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState("");
  const [errors, setErrors] = useState({});

  const passwordScore = useMemo(() => {
    const value = formData.password;
    let score = 0;

    if (value.length >= 8) score += 1;
    if (/[A-Z]/.test(value)) score += 1;
    if (/[0-9]/.test(value)) score += 1;
    if (/[^A-Za-z0-9]/.test(value)) score += 1;

    return score;
  }, [formData.password]);

  const passwordLabels = ["Very weak", "Weak", "Fair", "Good", "Strong"];

  const loadAuthSettings = async () => {
    try {
      const siteSettings = JSON.parse(
        localStorage.getItem("site_settings") || "{}"
      );
      const siteInfo = JSON.parse(localStorage.getItem("site_info") || "{}");
      const siteImages = JSON.parse(
        localStorage.getItem("site_images") || "{}"
      );
      const authSettings = siteInfo.authSettings || {};

      const merged = {
        ...DEFAULT_AUTH,
        ...siteSettings,
        ...authSettings,
        siteName:
          siteInfo.siteName ||
          siteSettings.siteName ||
          DEFAULT_AUTH.siteName,
        primaryFont:
          siteInfo.fontSettings?.primaryFont ||
          siteSettings.primaryFont ||
          DEFAULT_AUTH.primaryFont,
        headingFont:
          siteInfo.fontSettings?.headingFont ||
          siteSettings.headingFont ||
          DEFAULT_AUTH.headingFont,
      };

      const logoId =
        siteInfo.logoId || siteSettings.logoId || siteImages.logoId;

      const backgroundId =
        authSettings.registerBackgroundId ||
        siteInfo.registerBackgroundId ||
        siteSettings.registerBackgroundId ||
        siteImages.registerBackgroundId;

      const [logoFromDb, backgroundFromDb] = await Promise.all([
        getStoredImage(logoId),
        getStoredImage(backgroundId),
      ]);

      setAuth(merged);
      setAssets({
        logo: logoFromDb || siteImages.logo || null,
        background:
          backgroundFromDb ||
          siteImages.registerBackground ||
          authSettings.registerBackground ||
          null,
      });
    } catch (error) {
      console.warn("Could not load register settings:", error);
    }
  };

  useEffect(() => {
    loadAuthSettings();

    const refresh = () => {
      loadAuthSettings();
    };

    window.addEventListener("authSettingsUpdated", refresh);
    window.addEventListener("siteImagesUpdated", refresh);
    window.addEventListener("settingsSaved", refresh);
    window.addEventListener("storage", refresh);

    return () => {
      window.removeEventListener("authSettingsUpdated", refresh);
      window.removeEventListener("siteImagesUpdated", refresh);
      window.removeEventListener("settingsSaved", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const setField = (field, value) => {
    setFormData((current) => ({
      ...current,
      [field]: value,
    }));

    setErrors((current) => ({
      ...current,
      [field]: "",
    }));
  };

  const validate = () => {
    const nextErrors = {};

    if (!formData.firstName.trim()) {
      nextErrors.firstName = "First name is required.";
    }

    if (!formData.lastName.trim()) {
      nextErrors.lastName = "Last name is required.";
    }

    if (!formData.email.trim()) {
      nextErrors.email = "Email address is required.";
    } else if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())
    ) {
      nextErrors.email = "Enter a valid email address.";
    }

    if (
      formData.phone &&
      !/^[+\d][\d\s()-]{7,19}$/.test(formData.phone.trim())
    ) {
      nextErrors.phone = "Enter a valid phone number.";
    }

    if (formData.password.length < 8) {
      nextErrors.password = "Password must contain at least 8 characters.";
    }

    if (formData.password !== formData.confirmPassword) {
      nextErrors.confirmPassword = "Passwords do not match.";
    }

    if (auth.showTermsAgreement && !acceptedTerms) {
      nextErrors.terms = "Please accept the Terms and Privacy Policy.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!validate() || loading) return;

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          email: formData.email.trim().toLowerCase(),
          phone: formData.phone.trim(),
          password: formData.password,
          newsletter,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Registration failed. Please try again."
        );
      }

      const user = data.user || data;

      localStorage.setItem("token", data.token);
      localStorage.setItem(
        "user",
        JSON.stringify({
          id: user._id || user.id || data._id,
          firstName: user.firstName || data.firstName,
          lastName: user.lastName || data.lastName,
          email: user.email || data.email,
          phone: user.phone || data.phone || formData.phone.trim(),
          role: user.role || data.role || "user",
          profileImage: user.profileImage || user.avatar || "",
          newsletter,
        })
      );

      toast.success("Welcome to ZAMED PREMIUM!");
      navigate("/", { replace: true });
    } catch (error) {
      console.error("Registration error:", error);
      toast.error(error.message || "Server error. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const socialLogin = (provider) => {
    setSocialLoading(provider);
    localStorage.setItem("redirectAfterLogin", "/");
    window.location.href = `${API_URL}/auth/${provider}`;
  };

  const inputClass = (field) =>
    `relative rounded-2xl border bg-white transition ${
      errors[field]
        ? "border-red-400 ring-4 ring-red-100"
        : "border-slate-200 focus-within:border-[#d6aa61] focus-within:ring-4 focus-within:ring-amber-50"
    }`;

  return (
    <main
      className="relative min-h-screen overflow-hidden bg-[#eee6dc]"
      style={{ fontFamily: auth.primaryFont }}
    >
      {/* Background Image - Full Cover */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-all duration-700"
        style={{
          backgroundImage: assets.background
            ? `url("${assets.background}")`
            : "linear-gradient(135deg,#f8efe2 0%,#e9d8c1 50%,#d5b789 100%)",
          backgroundPosition: auth.authImagePosition || "center",
          backgroundSize: "cover",
        }}
      />

      {/* Subtle overlay gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] via-transparent to-black/[0.03]" />

      <div className="relative z-10 flex min-h-screen items-center justify-center px-3 py-4 sm:px-6 sm:py-6 lg:px-8 xl:px-12">
        {/* Left Side - Branding / Promo (Hidden on mobile) */}
        <div className="hidden lg:block lg:w-1/2">
          <div className="max-w-lg">
            <div className="flex items-center gap-4">
              {assets.logo ? (
                <img
                  src={assets.logo}
                  alt={auth.siteName}
                  className="h-16 w-16 rounded-2xl bg-white/85 object-contain p-2 shadow-xl backdrop-blur-sm"
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/80 shadow-xl backdrop-blur-sm">
                  <FiShoppingBag size={30} className="text-[#2c231d]" />
                </div>
              )}

              <div>
                <p className="text-2xl font-black tracking-[0.12em] text-[#2c231d]">
                  {auth.siteName}
                </p>
                <p
                  className="text-xs font-black tracking-[0.28em]"
                  style={{ color: auth.authPrimaryColor }}
                >
                  {auth.authEyebrow}
                </p>
              </div>
            </div>

            <h1
              className="mt-14 text-6xl font-black leading-[1.02] text-[#2d241e] drop-shadow-sm"
              style={{ fontFamily: auth.headingFont }}
            >
              {auth.registerPromoTitle}
            </h1>

            <p className="mt-5 text-base leading-7 text-[#66594e]">
              {auth.registerPromoText}
            </p>
          </div>
        </div>

        {/* Right Side - Register Form */}
        <motion.section
          initial={{ opacity: 0, y: 20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="relative w-full max-w-[520px] border border-white/70 bg-white/[0.92] px-5 py-6 shadow-[0_30px_100px_rgba(62,45,28,.18)] backdrop-blur-2xl sm:px-7 sm:py-8 lg:px-9"
          style={{
            borderRadius: `${Number(auth.authBorderRadius || 28)}px`,
            backdropFilter: `blur(${Number(auth.authBackgroundBlur || 18)}px)`,
          }}
        >
          <div
            className="pointer-events-none absolute -right-20 -top-20 h-52 w-52 rounded-full opacity-10 blur-3xl"
            style={{ background: auth.authPrimaryColor }}
          />

          <div className="relative z-10">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 lg:hidden">
                {assets.logo && (
                  <img
                    src={assets.logo}
                    alt={auth.siteName}
                    className="h-10 w-10 rounded-xl bg-white object-contain p-1 shadow"
                  />
                )}
                <div>
                  <p className="text-sm font-black text-[#2d241e]">
                    {auth.siteName}
                  </p>
                  <p
                    className="text-[10px] font-black tracking-[0.2em]"
                    style={{ color: auth.authPrimaryColor }}
                  >
                    {auth.authEyebrow}
                  </p>
                </div>
              </div>

              <p className="text-xs text-slate-500">
                Already a member?{" "}
                <Link
                  to="/login"
                  className="font-black hover:underline"
                  style={{ color: auth.authPrimaryColor }}
                >
                  Sign in
                </Link>
              </p>
            </div>

            <div className="text-center sm:text-left">
              <p
                className="text-[11px] font-black tracking-[0.25em]"
                style={{ color: auth.authPrimaryColor }}
              >
                JOIN ZAMED PREMIUM
              </p>

              <h2
                className="mt-3 text-4xl font-black tracking-tight text-[#211b17] sm:text-5xl"
                style={{ fontFamily: auth.headingFont }}
              >
                {auth.registerTitle}
              </h2>

              <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-500 sm:mx-0">
                {auth.registerSubtitle}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-bold text-[#322b25]">
                    First name
                  </label>

                  <div className={inputClass("firstName")}>
                    <FiUser className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      value={formData.firstName}
                      onChange={(event) =>
                        setField("firstName", event.target.value)
                      }
                      className="w-full rounded-2xl bg-transparent py-3 pl-12 pr-4 outline-none sm:py-3.5"
                      placeholder="First name"
                      autoComplete="given-name"
                    />
                  </div>

                  {errors.firstName && (
                    <p className="mt-1 text-xs text-red-500">
                      {errors.firstName}
                    </p>
                  )}
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-[#322b25]">
                    Last name
                  </label>

                  <div className={inputClass("lastName")}>
                    <FiUser className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      value={formData.lastName}
                      onChange={(event) =>
                        setField("lastName", event.target.value)
                      }
                      className="w-full rounded-2xl bg-transparent py-3 pl-12 pr-4 outline-none sm:py-3.5"
                      placeholder="Last name"
                      autoComplete="family-name"
                    />
                  </div>

                  {errors.lastName && (
                    <p className="mt-1 text-xs text-red-500">
                      {errors.lastName}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-[#322b25]">
                  Email address
                </label>

                <div className={inputClass("email")}>
                  <FiMail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(event) => setField("email", event.target.value)}
                    className="w-full rounded-2xl bg-transparent py-3 pl-12 pr-4 outline-none sm:py-3.5"
                    placeholder="you@example.com"
                    autoComplete="email"
                  />
                </div>

                {errors.email && (
                  <p className="mt-1 text-xs text-red-500">{errors.email}</p>
                )}
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-[#322b25]">
                  Phone{" "}
                  <span className="font-normal text-slate-400">(optional)</span>
                </label>

                <div className={inputClass("phone")}>
                  <FiPhone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(event) => setField("phone", event.target.value)}
                    className="w-full rounded-2xl bg-transparent py-3 pl-12 pr-4 outline-none sm:py-3.5"
                    placeholder="+44 7000 000000"
                    autoComplete="tel"
                  />
                </div>

                {errors.phone && (
                  <p className="mt-1 text-xs text-red-500">{errors.phone}</p>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-bold text-[#322b25]">
                    Password
                  </label>

                  <div className={inputClass("password")}>
                    <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />

                    <input
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={(event) =>
                        setField("password", event.target.value)
                      }
                      className="w-full rounded-2xl bg-transparent py-3 pl-12 pr-11 outline-none sm:py-3.5"
                      placeholder="Create password"
                      autoComplete="new-password"
                    />

                    <button
                      type="button"
                      onClick={() => setShowPassword((current) => !current)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-slate-400"
                    >
                      {showPassword ? <FiEyeOff /> : <FiEye />}
                    </button>
                  </div>

                  {errors.password && (
                    <p className="mt-1 text-xs text-red-500">
                      {errors.password}
                    </p>
                  )}
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-[#322b25]">
                    Confirm password
                  </label>

                  <div className={inputClass("confirmPassword")}>
                    <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />

                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={formData.confirmPassword}
                      onChange={(event) =>
                        setField("confirmPassword", event.target.value)
                      }
                      className="w-full rounded-2xl bg-transparent py-3 pl-12 pr-11 outline-none sm:py-3.5"
                      placeholder="Repeat password"
                      autoComplete="new-password"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword((current) => !current)
                      }
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-slate-400"
                    >
                      {showConfirmPassword ? <FiEyeOff /> : <FiEye />}
                    </button>
                  </div>

                  {errors.confirmPassword && (
                    <p className="mt-1 text-xs text-red-500">
                      {errors.confirmPassword}
                    </p>
                  )}
                </div>
              </div>

              {auth.showPasswordStrength && formData.password && (
                <div className="rounded-2xl bg-[#f8f5f1] p-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-600">
                      Password strength
                    </span>

                    <span
                      className="font-black"
                      style={{ color: auth.authPrimaryColor }}
                    >
                      {passwordLabels[passwordScore]}
                    </span>
                  </div>

                  <div className="mt-2 grid grid-cols-4 gap-2">
                    {[1, 2, 3, 4].map((level) => (
                      <div
                        key={level}
                        className="h-1.5 rounded-full"
                        style={{
                          background:
                            passwordScore >= level
                              ? auth.authPrimaryColor
                              : "#e2e8f0",
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {auth.showTermsAgreement && (
                <>
                  <label className="flex cursor-pointer items-start gap-3 text-sm text-slate-600">
                    <input
                      type="checkbox"
                      checked={acceptedTerms}
                      onChange={(event) => {
                        setAcceptedTerms(event.target.checked);
                        setErrors((current) => ({
                          ...current,
                          terms: "",
                        }));
                      }}
                      className="mt-1 h-4 w-4 shrink-0 accent-[#c79342]"
                    />

                    <span>
                      I agree to the{" "}
                      <Link
                        to="/terms"
                        className="font-bold hover:underline"
                        style={{ color: auth.authPrimaryColor }}
                      >
                        Terms of Service
                      </Link>{" "}
                      and{" "}
                      <Link
                        to="/privacy"
                        className="font-bold hover:underline"
                        style={{ color: auth.authPrimaryColor }}
                      >
                        Privacy Policy
                      </Link>
                      .
                    </span>
                  </label>

                  {errors.terms && (
                    <p className="text-xs text-red-500">{errors.terms}</p>
                  )}
                </>
              )}

              {auth.showNewsletterOptIn && (
                <label className="flex cursor-pointer items-start gap-3 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    checked={newsletter}
                    onChange={(event) => setNewsletter(event.target.checked)}
                    className="mt-1 h-4 w-4 accent-[#c79342]"
                  />

                  <span>
                    Subscribe for exclusive member offers and new arrivals.
                  </span>
                </label>
              )}

              <motion.button
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.985 }}
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-3 rounded-2xl px-5 py-3.5 text-base font-black text-white shadow-[0_18px_35px_rgba(0,0,0,.14)] transition hover:shadow-[0_20px_40px_rgba(0,0,0,.2)] disabled:cursor-not-allowed disabled:opacity-60 sm:py-4"
                style={{
                  background: `linear-gradient(90deg, ${auth.authPrimaryColor}, ${auth.authPrimaryColor}dd)`,
                }}
              >
                {loading ? (
                  <>
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Creating account...
                  </>
                ) : (
                  <>
                    {auth.registerButtonText}
                    <FiArrowRight />
                  </>
                )}
              </motion.button>
            </form>

            {(auth.showGoogleLogin || auth.showFacebookLogin) && (
              <>
                <div className="my-5 flex items-center gap-4">
                  <div className="h-px flex-1 bg-slate-200" />
                  <span className="text-[11px] font-bold tracking-wider text-slate-400">
                    OR SIGN UP WITH
                  </span>
                  <div className="h-px flex-1 bg-slate-200" />
                </div>

                <div
                  className={`grid gap-3 ${
                    auth.showGoogleLogin && auth.showFacebookLogin
                      ? "sm:grid-cols-2"
                      : ""
                  }`}
                >
                  {auth.showGoogleLogin && (
                    <button
                      type="button"
                      onClick={() => socialLogin("google")}
                      disabled={Boolean(socialLoading)}
                      className="flex items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-[#10264c] transition hover:-translate-y-0.5 hover:shadow-md disabled:opacity-60"
                    >
                      <GoogleIcon />
                      Google
                    </button>
                  )}

                  {auth.showFacebookLogin && (
                    <button
                      type="button"
                      onClick={() => socialLogin("facebook")}
                      disabled={Boolean(socialLoading)}
                      className="flex items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-[#10264c] transition hover:-translate-y-0.5 hover:shadow-md disabled:opacity-60"
                    >
                      <FacebookIcon />
                      Facebook
                    </button>
                  )}
                </div>
              </>
            )}

            <p className="mt-6 text-center text-sm text-slate-500">
              Already have an account?{" "}
              <Link
                to="/login"
                className="font-black hover:underline"
                style={{ color: auth.authPrimaryColor }}
              >
                Sign in
              </Link>
            </p>

            {auth.showAuthTrustBadges && (
              <div className="mt-5 flex items-start gap-3 rounded-2xl border border-amber-100 bg-amber-50/70 p-3.5 text-xs text-[#5e5043]">
                <FiShield
                  className="mt-0.5 shrink-0"
                  style={{ color: auth.authPrimaryColor }}
                />
                <p>
                  Your personal information is protected and used only to
                  provide your account and shopping experience.
                </p>
              </div>
            )}
          </div>
        </motion.section>
      </div>
    </main>
  );
};

export default Register;