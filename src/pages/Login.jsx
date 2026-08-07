// src/pages/Login.jsx
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  FiArrowRight,
  FiEye,
  FiEyeOff,
  FiLock,
  FiMail,
  FiShield,
  FiShoppingBag,
} from "react-icons/fi";
import { motion } from "framer-motion";
import { toast } from "sonner";

const API_URL =
  import.meta.env.VITE_API_URL ||
  (window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1"
    ? "http://localhost:5000/api"
    : "https://zamed-backend.onrender.com/api");

const DB_NAME = "ZamedImageStore";
const STORE_NAME = "images";

const normalizeAuthResponse = (payload = {}) => {
  const root = payload?.data && typeof payload.data === "object"
    ? payload.data
    : payload;

  const user =
    payload.user ||
    root.user ||
    root.customer ||
    payload.customer ||
    (root && (root.email || root.firstName || root._id || root.id) ? root : null);

  const token =
    payload.token ||
    payload.accessToken ||
    payload.jwt ||
    root.token ||
    root.accessToken ||
    root.jwt ||
    null;

  return { user, token };
};

const saveAuthenticatedUser = (user, token, fallback = {}) => {
  if (!user) return null;

  const normalizedUser = {
    id: user._id || user.id || fallback.id || null,
    _id: user._id || user.id || fallback.id || null,
    firstName: user.firstName || fallback.firstName || "",
    lastName: user.lastName || fallback.lastName || "",
    email: user.email || fallback.email || "",
    phone: user.phone || user.phoneNumber || fallback.phone || "",
    role: user.role || fallback.role || "user",
    profileImage: user.profileImage || user.avatar || fallback.profileImage || "",
    avatar: user.avatar || user.profileImage || fallback.profileImage || "",
    ...user,
  };

  if (token) {
    localStorage.setItem("token", token);
  }

  localStorage.setItem("user", JSON.stringify(normalizedUser));
  localStorage.setItem("auth_timestamp", String(Date.now()));

  window.dispatchEvent(
    new CustomEvent("authChanged", {
      detail: {
        authenticated: Boolean(token),
        user: normalizedUser,
        token,
      },
    })
  );

  return normalizedUser;
};

const DEFAULT_AUTH = {
  siteName: "Zamed Premium Wear",
  authEyebrow: "ZAMED PREMIUM",
  loginTitle: "Welcome Back",
  loginSubtitle: "Sign in to continue your premium shopping journey.",
  loginPromoTitle: "Discover Premium. Live Better.",
  loginPromoText: "Quality you can trust, style you'll love.",
  loginButtonText: "Sign In",
  forgotPasswordText: "Forgot password?",
  rememberMeText: "Remember me",
  authPrimaryColor: "#c79342",
  authSecondaryColor: "#2a2118",
  authUseSiteTypography: true,
  authHeadingFont: "Poppins",
  authBodyFont: "Inter",
  authTitleColor: "#081b3c",
  authSubtitleColor: "#64748b",
  authLabelColor: "#322b25",
  authInputTextColor: "#111827",
  authPlaceholderColor: "#94a3b8",
  authLinkColor: "#c79342",
  authButtonTextColor: "#ffffff",
  authMutedTextColor: "#64748b",
  authImagePosition: "center",
  authBorderRadius: 28,
  authBackgroundBlur: 18,
  showGoogleLogin: true,
  showFacebookLogin: true,
  showRememberMe: true,
  showForgotPassword: true,
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

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [auth, setAuth] = useState(DEFAULT_AUTH);
  const [assets, setAssets] = useState({
    logo: null,
    background: null,
  });

  const [email, setEmail] = useState(
    () => localStorage.getItem("remembered_email") || ""
  );
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(
    () => Boolean(localStorage.getItem("remembered_email"))
  );
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState("");
  const [errors, setErrors] = useState({});

  useEffect(() => {
    const registeredEmail = location.state?.registeredEmail;

    if (registeredEmail && !email) {
      setEmail(registeredEmail);
      toast.success("Account created. Please sign in.");
    }
  }, [location.state, email]);

  const redirectTarget = useMemo(
    () =>
      location.state?.from ||
      localStorage.getItem("redirectAfterLogin") ||
      "/",
    [location.state]
  );

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
          authSettings.authUseSiteTypography === false
            ? authSettings.authBodyFont || DEFAULT_AUTH.authBodyFont
            : siteInfo.fontSettings?.bodyFont ||
              siteInfo.fontSettings?.primaryFont ||
              siteSettings.bodyFont ||
              siteSettings.primaryFont ||
              DEFAULT_AUTH.primaryFont,
        headingFont:
          authSettings.authUseSiteTypography === false
            ? authSettings.authHeadingFont || DEFAULT_AUTH.authHeadingFont
            : siteInfo.fontSettings?.headingFont ||
              siteSettings.headingFont ||
              DEFAULT_AUTH.headingFont,
      };

      const logoId =
        siteInfo.logoId || siteSettings.logoId || siteImages.logoId;

      const backgroundId =
        authSettings.loginBackgroundId ||
        siteInfo.loginBackgroundId ||
        siteSettings.loginBackgroundId ||
        siteImages.loginBackgroundId;

      const [logoFromDb, backgroundFromDb] = await Promise.all([
        getStoredImage(logoId),
        getStoredImage(backgroundId),
      ]);

      setAuth(merged);
      setAssets({
        logo: logoFromDb || siteImages.logo || null,
        background:
          backgroundFromDb ||
          siteImages.loginBackground ||
          authSettings.loginBackground ||
          null,
      });
    } catch (error) {
      console.warn("Could not load login settings:", error);
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

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const token = params.get("token");
    const encodedUser = params.get("user");

    if (!token || !encodedUser) return;

    try {
      const decodedUser = decodeURIComponent(encodedUser);
      JSON.parse(decodedUser);

      const parsedUser = JSON.parse(decodedUser);
      saveAuthenticatedUser(parsedUser, token);

      const target =
        localStorage.getItem("redirectAfterLogin") ||
        redirectTarget ||
        "/";

      localStorage.removeItem("redirectAfterLogin");

      toast.success("Login successful");
      window.location.assign(target);
    } catch (error) {
      console.error("Social login callback error:", error);
      toast.error("Unable to complete social login.");
    }
  }, [location.search, navigate, redirectTarget]);

  const validate = () => {
    const nextErrors = {};

    if (!email.trim()) {
      nextErrors.email = "Email address is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      nextErrors.email = "Enter a valid email address.";
    }

    if (!password) {
      nextErrors.password = "Password is required.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!validate() || loading) return;

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.message ||
            data.error ||
            "Login failed. Please check your email and password."
        );
      }

      const { user, token } = normalizeAuthResponse(data);

      if (!token) {
        console.error("Login response did not include a token:", data);
        throw new Error(
          "Your login details were accepted, but the server did not return an authentication token."
        );
      }

      if (!user) {
        console.error("Login response did not include user data:", data);
        throw new Error(
          "Login succeeded, but your account information was missing from the server response."
        );
      }

      const savedUser = saveAuthenticatedUser(user, token, {
        email: email.trim().toLowerCase(),
      });

      if (rememberMe) {
        localStorage.setItem("remembered_email", email.trim());
      } else {
        localStorage.removeItem("remembered_email");
      }

      const target =
        localStorage.getItem("redirectAfterLogin") ||
        redirectTarget ||
        "/";

      localStorage.removeItem("redirectAfterLogin");

      toast.success(
        `Welcome back${savedUser?.firstName ? `, ${savedUser.firstName}` : ""}!`
      );

      // Check if user is admin and redirect to admin dashboard
      const userRole = savedUser?.role || user?.role || '';
      if (userRole === 'admin' || userRole === 'super_admin') {
        // Store admin session
        localStorage.setItem('admin', JSON.stringify(savedUser));
        localStorage.setItem('adminToken', token);
        window.location.assign('/admin/dashboard');
      } else {
        window.location.assign(target);
      }
    } catch (error) {
      console.error("Login error:", error);
      toast.error(error.message || "Server error. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const socialLogin = (provider) => {
    setSocialLoading(provider);
    localStorage.setItem("redirectAfterLogin", redirectTarget);
    window.location.href = `${API_URL}/auth/${provider}`;
  };

  return (
    <main
      className="relative min-h-screen overflow-hidden bg-[#eee6dc]"
      style={{ fontFamily: auth.primaryFont, color: auth.authInputTextColor }}
    >
      <div
        className="absolute inset-0 bg-cover bg-no-repeat transition-all duration-700"
        style={{
          backgroundImage: assets.background
            ? `url("${assets.background}")`
            : "linear-gradient(135deg,#f8efe2 0%,#e9d8c1 50%,#d5b789 100%)",
          backgroundPosition: auth.authImagePosition || "center",
        }}
      />

      <div className="absolute inset-0 bg-gradient-to-r from-white/[0.01] via-transparent to-black/[0.02]" />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-[1720px] items-center justify-end px-3 py-4 sm:px-6 sm:py-6 lg:px-10 xl:px-16">
        {!assets.background && (
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="absolute left-8 top-1/2 hidden max-w-xl -translate-y-1/2 lg:block xl:left-16"
          >
            <div className="flex items-center gap-4">
              {assets.logo ? (
                <img
                  src={assets.logo}
                  alt={auth.siteName}
                  className="h-16 w-16 rounded-2xl bg-white/85 object-contain p-2 shadow-xl"
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/80 shadow-xl">
                  <FiShoppingBag size={30} />
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
              className="mt-14 max-w-lg text-6xl font-black leading-[1.02] text-[#2d241e]"
              style={{ fontFamily: auth.headingFont }}
            >
              {auth.loginPromoTitle}
            </h1>

            <p className="mt-5 max-w-md text-base leading-7 text-[#66594e]">
              {auth.loginPromoText}
            </p>
          </motion.div>
        )}

        <motion.section
          initial={{ opacity: 0, x: 45, scale: 0.97 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
          className="relative w-full max-w-[580px] overflow-hidden border border-white/70 bg-white/[0.95] px-5 py-7 shadow-[0_30px_100px_rgba(62,45,28,.18)] backdrop-blur-2xl sm:px-8 sm:py-9 lg:px-10 xl:px-12"
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
            <div className="mb-7 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                {assets.logo && (
                  <img
                    src={assets.logo}
                    alt={auth.siteName}
                    className="h-12 w-12 rounded-xl bg-white object-contain p-1 shadow"
                  />
                )}
                <div className="lg:hidden">
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

              <p className="text-xs" style={{ color: auth.authMutedTextColor }}>
                New customer?{" "}
                <Link
                  to="/register"
                  className="font-black hover:underline"
                  style={{ color: auth.authLinkColor }}
                >
                  Create account
                </Link>
              </p>
            </div>

            <div>
              <p
                className="text-[11px] font-black tracking-[0.25em]"
                style={{ color: auth.authPrimaryColor }}
              >
                MEMBER ACCESS
              </p>

              <h2
                className="mt-3 text-4xl font-black tracking-tight sm:text-5xl"
                style={{ fontFamily: auth.headingFont, color: auth.authTitleColor }}
              >
                {auth.loginTitle}
              </h2>

              <p
                className="mt-3 max-w-lg text-sm leading-6"
                style={{ color: auth.authSubtitleColor }}
              >
                {auth.loginSubtitle}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="mt-8 space-y-5" noValidate>
              <div>
                <label className="mb-2 block text-sm font-bold" style={{ color: auth.authLabelColor }}>
                  Email address
                </label>

                <div
                  className={`relative rounded-2xl border bg-white transition ${
                    errors.email
                      ? "border-red-400 ring-4 ring-red-100"
                      : "border-slate-200 focus-within:border-[#d6aa61] focus-within:ring-4 focus-within:ring-amber-50"
                  }`}
                >
                  <FiMail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />

                  <input
                    type="email"
                    value={email}
                    onChange={(event) => {
                      setEmail(event.target.value);
                      setErrors((current) => ({
                        ...current,
                        email: "",
                      }));
                    }}
                    className="w-full rounded-2xl bg-transparent py-4 pl-12 pr-4 outline-none placeholder:text-[var(--auth-placeholder)]"
                    style={{ color: auth.authInputTextColor, "--auth-placeholder": auth.authPlaceholderColor }}
                    placeholder="you@example.com"
                    autoComplete="email"
                  />
                </div>

                {errors.email && (
                  <p className="mt-1.5 text-xs font-medium text-red-500">
                    {errors.email}
                  </p>
                )}
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-sm font-bold" style={{ color: auth.authLabelColor }}>
                    Password
                  </label>

                  {auth.showForgotPassword && (
                    <Link
                      to="/forgot-password"
                      className="text-xs font-bold hover:underline"
                      style={{ color: auth.authLinkColor }}
                    >
                      {auth.forgotPasswordText}
                    </Link>
                  )}
                </div>

                <div
                  className={`relative rounded-2xl border bg-white transition ${
                    errors.password
                      ? "border-red-400 ring-4 ring-red-100"
                      : "border-slate-200 focus-within:border-[#d6aa61] focus-within:ring-4 focus-within:ring-amber-50"
                  }`}
                >
                  <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />

                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(event) => {
                      setPassword(event.target.value);
                      setErrors((current) => ({
                        ...current,
                        password: "",
                      }));
                    }}
                    className="w-full rounded-2xl bg-transparent py-4 pl-12 pr-12 outline-none placeholder:text-[var(--auth-placeholder)]"
                    style={{ color: auth.authInputTextColor, "--auth-placeholder": auth.authPlaceholderColor }}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 transition hover:bg-slate-100"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <FiEyeOff /> : <FiEye />}
                  </button>
                </div>

                {errors.password && (
                  <p className="mt-1.5 text-xs font-medium text-red-500">
                    {errors.password}
                  </p>
                )}
              </div>

              {auth.showRememberMe && (
                <label className="flex cursor-pointer items-center gap-3 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(event) => setRememberMe(event.target.checked)}
                    className="h-4 w-4 accent-[#c79342]"
                  />
                  {auth.rememberMeText}
                </label>
              )}

              <motion.button
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.985 }}
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-3 rounded-2xl px-5 py-4 text-base font-black shadow-[0_18px_35px_rgba(0,0,0,.14)] disabled:cursor-not-allowed disabled:opacity-60"
                style={{
                  background: `linear-gradient(90deg, ${auth.authPrimaryColor}, ${auth.authPrimaryColor}dd)`,
                  color: auth.authButtonTextColor,
                }}
              >
                {loading ? (
                  <>
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Signing in...
                  </>
                ) : (
                  <>
                    {auth.loginButtonText}
                    <FiArrowRight />
                  </>
                )}
              </motion.button>
            </form>

            {(auth.showGoogleLogin || auth.showFacebookLogin) && (
              <>
                <div className="my-6 flex items-center gap-4">
                  <div className="h-px flex-1 bg-slate-200" />
                  <span className="text-[11px] font-bold tracking-wider text-slate-400">
                    OR CONTINUE WITH
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
                      className="flex items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-bold text-[#10264c] transition hover:-translate-y-0.5 hover:shadow-md disabled:opacity-60"
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
                      className="flex items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-bold text-[#10264c] transition hover:-translate-y-0.5 hover:shadow-md disabled:opacity-60"
                    >
                      <FacebookIcon />
                      Facebook
                    </button>
                  )}
                </div>
              </>
            )}

            {auth.showAuthTrustBadges && (
              <div className="mt-6 flex items-start gap-3 rounded-2xl border border-amber-100 bg-amber-50/70 p-4 text-sm text-[#5e5043]">
                <FiShield
                  className="mt-0.5 shrink-0"
                  style={{ color: auth.authPrimaryColor }}
                />
                <p>
                  Your sign-in is protected. We never share your credentials or
                  password.
                </p>
              </div>
            )}
          </div>
        </motion.section>
      </div>
    </main>
  );
};

export default Login;