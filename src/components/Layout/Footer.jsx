
// src/components/Layout/Footer.jsx
import { Link, useNavigate } from "react-router-dom";
import {
  FiAward,
  FiChevronDown,
  FiClock,
  FiCreditCard,
  FiGlobe,
  FiHeadphones,
  FiHeart,
  FiMail,
  FiMapPin,
  FiPackage,
  FiPhoneCall,
  FiRefreshCw,
  FiSearch,
  FiSend,
  FiShield,
  FiShoppingBag,
  FiTruck,
} from "react-icons/fi";
import {
  FaFacebookF,
  FaInstagram,
  FaLinkedinIn,
  FaTwitter,
  FaYoutube,
} from "react-icons/fa";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

const Footer = () => {
  const navigate = useNavigate();

  const [siteInfo, setSiteInfo] = useState({
    siteName: "Zamed Premium Wear",
    siteEmail: "support@zamed.com",
    sitePhone: "+94 77 061 6154",
    siteAddress: "Colombo, Sri Lanka",
    footerText: "© 2026 Zamed Premium Wear. All rights reserved.",
    logo: null,
    footerLogo: null,
    currency: "USD",
    socialLinks: {
      facebook: "https://facebook.com/zamed",
      instagram: "https://instagram.com/zamed",
      twitter: "https://twitter.com/zamed",
      youtube: "",
      linkedin: "",
    },
  });

  const [expandedItem, setExpandedItem] = useState(null);
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [newsletterLoading, setNewsletterLoading] = useState(false);

  const currentYear = new Date().getFullYear();

  const loadData = () => {
    try {
      const savedInfo = JSON.parse(localStorage.getItem("site_info") || "{}");
      const savedSettings = JSON.parse(
        localStorage.getItem("site_settings") || "{}"
      );
      const savedImages = JSON.parse(
        localStorage.getItem("site_images") || "{}"
      );

      const socialLinks =
        savedInfo.socialLinks ||
        savedSettings.socialLinks || {
          facebook: savedSettings.facebookUrl,
          instagram: savedSettings.instagramUrl,
          twitter: savedSettings.twitterUrl,
          youtube: savedSettings.youtubeUrl,
          linkedin: savedSettings.linkedinUrl,
        };

      setSiteInfo((prev) => ({
        ...prev,
        ...savedSettings,
        ...savedInfo,
        logo:
          savedImages.footerLogo ||
          savedImages.logo ||
          savedInfo.footerLogo ||
          savedInfo.logo ||
          prev.logo,
        footerLogo:
          savedImages.footerLogo ||
          savedInfo.footerLogo ||
          savedImages.logo ||
          prev.footerLogo,
        socialLinks: {
          ...prev.socialLinks,
          ...(socialLinks || {}),
        },
      }));

    } catch (error) {
      console.warn("Footer settings load failed:", error);
    }
  };

  useEffect(() => {
    loadData();

    const refresh = () => loadData();

    window.addEventListener("storage", refresh);
    window.addEventListener("siteInfoUpdated", refresh);
    window.addEventListener("siteImagesUpdated", refresh);
    window.addEventListener("settingsSaved", refresh);
    window.addEventListener("logoUpdated", refresh);

    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("siteInfoUpdated", refresh);
      window.removeEventListener("siteImagesUpdated", refresh);
      window.removeEventListener("settingsSaved", refresh);
      window.removeEventListener("logoUpdated", refresh);
    };
  }, []);

  const footerLogo = siteInfo.footerLogo || siteInfo.logo;

  const toggleDetails = (id) => {
    setExpandedItem((current) => (current === id ? null : id));
  };

  const featureItems = [
    {
      id: "freeShipping",
      icon: FiTruck,
      title: "Free Shipping",
      subtitle: "On all orders over $99",
    },
    {
      id: "securePayment",
      icon: FiShield,
      title: "Secure Payment",
      subtitle: "100% secure checkout",
    },
    {
      id: "easyReturns",
      icon: FiRefreshCw,
      title: "Easy Returns",
      subtitle: "30-day return policy",
    },
    {
      id: "premiumQuality",
      icon: FiAward,
      title: "Premium Quality",
      subtitle: "Top quality products",
    },
  ];

  const shopLinks = [
    { label: "All Products", to: "/collections/all" },
    { label: "New Arrivals", to: "/collections/all?sort=newest" },
    { label: "Best Sellers", to: "/collections/all?sort=best-selling" },
    { label: "Men", to: "/collections/men" },
    { label: "Women", to: "/collections/women" },
    { label: "Kids", to: "/collections/kids" },
    { label: "Collections", to: "/collections/all" },
    { label: "Sale", to: "/collections/all?sale=true" },
  ];

  const serviceLinks = [
    { id: "contact", label: "Contact Us" },
    { id: "faqs", label: "FAQs" },
    { id: "shipping", label: "Shipping & Delivery" },
    { id: "returns", label: "Returns & Refunds" },
    { id: "sizeGuide", label: "Size Guide" },
    { id: "orderTracking", label: "Order Tracking" },
    { id: "care", label: "Care Instructions" },
  ];

  const companyLinks = [
    { id: "about", label: "About Us" },
    { id: "story", label: "Our Story" },
    { id: "careers", label: "Careers" },
    { id: "sustainability", label: "Sustainability" },
    { id: "privacy", label: "Privacy Policy" },
    { id: "terms", label: "Terms & Conditions" },
    { id: "blog", label: "Blog" },
  ];

  const details = useMemo(
    () => ({
      freeShipping: {
        icon: FiTruck,
        text: "Free standard shipping is automatically applied when the basket reaches $99. Standard delivery is usually 3–5 business days after dispatch.",
      },
      securePayment: {
        icon: FiShield,
        text: "Checkout uses your configured secure payment provider. Full card details should never be stored directly by the Zamed frontend.",
      },
      easyReturns: {
        icon: FiRefreshCw,
        text: "Eligible unworn and unwashed products with original tags can be returned within the published 30-day return period.",
      },
      premiumQuality: {
        icon: FiAward,
        text: "Zamed focuses on premium presentation, comfortable fashion, clear sizing information and product quality.",
      },
      contact: {
        icon: FiPhoneCall,
        text: `Call ${siteInfo.sitePhone}, email ${siteInfo.siteEmail}, or visit us at ${siteInfo.siteAddress}.`,
      },
      faqs: {
        icon: FiHeadphones,
        text: "Find quick answers about orders, delivery, payment, coupons, returns, account access and product sizing.",
      },
      shipping: {
        icon: FiTruck,
        text: "Standard delivery is typically 3–5 business days. Express and international delivery can be offered depending on your checkout configuration.",
      },
      returns: {
        icon: FiRefreshCw,
        text: "Open Profile → Orders, select an eligible delivered order, choose Return Item and follow the return instructions.",
      },
      sizeGuide: {
        icon: FiPackage,
        text: "Use the measurements on each product page and compare them with your body measurements before selecting a size.",
      },
      orderTracking: {
        icon: FiSearch,
        text: "Sign in, open Profile → Orders and select the order to view its current order and delivery status.",
        action: {
          label: "Open My Orders",
          to: "/profile?tab=orders",
        },
      },
      care: {
        icon: FiHeart,
        text: "Always follow the garment care label. Wash similar colours together and use the recommended washing, drying and ironing settings.",
      },
      about: {
        icon: FiShoppingBag,
        text: "Zamed Premium Wear is a modern fashion shopping experience for men, women and kids, designed around easy product discovery, clean presentation and convenient online ordering.",
      },
      story: {
        icon: FiShoppingBag,
        text: "Zamed was built around a simple idea: premium-looking fashion shopping should feel modern, clear and easy to use across desktop and mobile.",
      },
      careers: {
        icon: FiAward,
        text: `Future opportunities can include retail, customer support, content, design, operations and technology. Career enquiries can be sent to ${siteInfo.siteEmail}.`,
      },
      sustainability: {
        icon: FiGlobe,
        text: "Zamed can support responsible retail through better packaging choices, clear garment-care guidance and thoughtful fulfilment practices.",
      },
      privacy: {
        icon: FiShield,
        text: "Customer information should only be used for account, ordering, support and consented marketing purposes. Replace this summary with your production legal privacy policy.",
      },
      terms: {
        icon: FiCreditCard,
        text: "Orders are subject to product availability, correct pricing and successful payment. Replace this summary with terms written for your actual business.",
      },
      blog: {
        icon: FiPackage,
        text: "The Zamed Journal can feature new collection launches, styling inspiration, sizing advice, clothing-care guides and store news.",
      },
    }),
    [siteInfo.siteEmail, siteInfo.sitePhone, siteInfo.siteAddress]
  );

  const handleNewsletterSubmit = (event) => {
    event.preventDefault();

    const email = newsletterEmail.trim().toLowerCase();

    if (!email) {
      toast.error("Enter your email address.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Enter a valid email address.");
      return;
    }

    setNewsletterLoading(true);

    try {
      const subscribers = JSON.parse(
        localStorage.getItem("zamed_newsletter_subscribers") || "[]"
      );

      if (!subscribers.includes(email)) {
        subscribers.push(email);
        localStorage.setItem(
          "zamed_newsletter_subscribers",
          JSON.stringify(subscribers)
        );
      }

      toast.success("You're subscribed to Zamed updates.");
      setNewsletterEmail("");
    } catch {
      toast.error("Unable to save subscription.");
    } finally {
      setNewsletterLoading(false);
    }
  };

  const socialItems = [
    {
      key: "instagram",
      icon: FaInstagram,
      url: siteInfo.socialLinks?.instagram,
    },
    {
      key: "facebook",
      icon: FaFacebookF,
      url: siteInfo.socialLinks?.facebook,
    },
    {
      key: "twitter",
      icon: FaTwitter,
      url: siteInfo.socialLinks?.twitter,
    },
    {
      key: "youtube",
      icon: FaYoutube,
      url: siteInfo.socialLinks?.youtube,
    },
    {
      key: "linkedin",
      icon: FaLinkedinIn,
      url:
        siteInfo.socialLinks?.linkedin ||
        siteInfo.linkedinUrl ||
        "",
    },
  ].filter((item) => item.url);

  return (
    <>
      {/* BENEFITS */}
      <section className="bg-white px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-[1440px] overflow-hidden rounded-[20px] border border-[#eee8e2] bg-[#fcfbfa] shadow-[0_10px_35px_rgba(0,0,0,.035)] sm:grid-cols-2 xl:grid-cols-4">
          {featureItems.map((item, index) => {
            const Icon = item.icon;
            const isOpen = expandedItem === item.id;

            return (
              <div
                key={item.id}
                className={`relative ${
                  index !== featureItems.length - 1
                    ? "xl:border-r xl:border-[#e8e1db]"
                    : ""
                }`}
              >
                <button
                  type="button"
                  onClick={() => toggleDetails(item.id)}
                  className="group flex w-full items-center gap-4 px-6 py-6 text-left transition hover:bg-white"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#fff0e5] text-[#c95218] transition group-hover:scale-110">
                    <Icon size={22} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="font-black text-[#161616]">{item.title}</p>
                    <p className="mt-1 text-sm text-gray-500">
                      {item.subtitle}
                    </p>
                  </div>

                  <FiChevronDown
                    className={`shrink-0 text-gray-400 transition-transform duration-300 ${
                      isOpen ? "rotate-180 text-[#ef5b18]" : ""
                    }`}
                  />
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="border-t border-[#eee8e2] bg-white px-6 py-5 text-sm leading-6 text-gray-600">
                        {details[item.id]?.text}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </section>

      <footer className="relative overflow-hidden bg-[#111111] text-white">
        <div className="pointer-events-none absolute -left-40 top-0 h-80 w-80 rounded-full bg-[#ef5b18]/5 blur-[100px]" />

        <div className="relative mx-auto max-w-[1440px] px-5 pb-8 pt-14 sm:px-7 lg:px-10 lg:pt-16">
          <div className="grid gap-12 xl:grid-cols-[1.35fr_.75fr_1fr_.85fr_1.05fr]">
            {/* BRAND */}
            <div className="xl:pr-8">
              <Link to="/" className="inline-flex items-center gap-3">
                {footerLogo ? (
                  <img
                    src={footerLogo}
                    alt={siteInfo.siteName}
                    className="h-14 max-w-[190px] object-contain object-left"
                  />
                ) : (
                  <>
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#ff7b31] to-[#e94b12] text-2xl font-black shadow-lg">
                      Z
                    </div>
                    <div>
                      <p className="text-3xl font-black leading-none">Zamed</p>
                      <p className="mt-1 text-[10px] font-bold tracking-[.3em] text-white/60">
                        PREMIUM WEAR
                      </p>
                    </div>
                  </>
                )}
              </Link>

              <p className="mt-7 max-w-sm text-[15px] leading-7 text-white/55">
                Zamed Premium Wear brings you modern fashion with a clean,
                convenient shopping experience for men, women and kids.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                {socialItems.map(({ key, icon: Icon, url }) => (
                  <a
                    key={key}
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={key}
                    className="flex h-11 w-11 items-center justify-center rounded-full bg-white/[0.07] text-white/75 transition hover:-translate-y-1 hover:bg-[#ef5b18] hover:text-white"
                  >
                    <Icon />
                  </a>
                ))}
              </div>

              <div className="my-8 h-px bg-white/10" />

              <h3 className="font-black">Subscribe to our newsletter</h3>
              <p className="mt-2 max-w-sm text-sm leading-6 text-white/50">
                Be the first to know about new arrivals and exclusive offers.
              </p>

              <form
                onSubmit={handleNewsletterSubmit}
                className="mt-5 flex max-w-sm overflow-hidden rounded-xl border border-white/10 bg-white/[0.06]"
              >
                <input
                  type="email"
                  value={newsletterEmail}
                  onChange={(event) => setNewsletterEmail(event.target.value)}
                  placeholder="Enter your email address"
                  className="min-w-0 flex-1 bg-transparent px-4 py-3.5 text-sm text-white outline-none placeholder:text-white/30"
                />

                <button
                  type="submit"
                  disabled={newsletterLoading}
                  className="flex w-14 items-center justify-center bg-white text-black transition hover:bg-[#ef5b18] hover:text-white"
                  aria-label="Subscribe"
                >
                  {newsletterLoading ? (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-black border-t-transparent" />
                  ) : (
                    <FiSend />
                  )}
                </button>
              </form>
            </div>

            {/* SHOP */}
            <div>
              <FooterHeading title="SHOP" />

              <ul className="mt-7 space-y-4">
                {shopLinks.map((item) => (
                  <li key={item.label}>
                    <Link
                      to={item.to}
                      className="text-[15px] text-white/55 transition hover:text-white"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* SERVICE */}
            <div>
              <FooterHeading title="CUSTOMER SERVICE" />

              <div className="mt-5 divide-y divide-white/[0.07]">
                {serviceLinks.map((item) => (
                  <FooterAccordionItem
                    key={item.id}
                    item={item}
                    details={details[item.id]}
                    expanded={expandedItem === item.id}
                    onToggle={() => toggleDetails(item.id)}
                    onNavigate={(to) => navigate(to)}
                  />
                ))}
              </div>
            </div>

            {/* COMPANY */}
            <div>
              <FooterHeading title="COMPANY" />

              <div className="mt-5 divide-y divide-white/[0.07]">
                {companyLinks.map((item) => (
                  <FooterAccordionItem
                    key={item.id}
                    item={item}
                    details={details[item.id]}
                    expanded={expandedItem === item.id}
                    onToggle={() => toggleDetails(item.id)}
                    onNavigate={(to) => navigate(to)}
                  />
                ))}
              </div>
            </div>

            {/* CONTACT */}
            <div>
              <FooterHeading title="CONTACT US" />

              <div className="mt-7 space-y-6">
                <div className="flex items-start gap-4">
                  <FiMapPin className="mt-1 shrink-0 text-xl text-white/85" />
                  <span className="text-sm leading-6 text-white/60">
                    {siteInfo.siteAddress}
                  </span>
                </div>

                <a
                  href={`tel:${siteInfo.sitePhone}`}
                  className="group flex items-center gap-4"
                >
                  <FiPhoneCall className="shrink-0 text-xl text-white/85 transition group-hover:text-[#ef5b18]" />
                  <span className="text-sm text-white/60 transition group-hover:text-white">
                    {siteInfo.sitePhone}
                  </span>
                </a>

                <a
                  href={`mailto:${siteInfo.siteEmail}`}
                  className="group flex items-start gap-4"
                >
                  <FiMail className="mt-0.5 shrink-0 text-xl text-white/85 transition group-hover:text-[#ef5b18]" />
                  <span className="break-all text-sm text-white/60 transition group-hover:text-white">
                    {siteInfo.siteEmail}
                  </span>
                </a>

                <div className="flex items-start gap-4">
                  <FiClock className="mt-0.5 shrink-0 text-xl text-white/85" />
                  <span className="text-sm leading-6 text-white/60">
                    Mon – Fri: 9AM – 6PM
                    <br />
                    Sat – Sun: 10AM – 4PM
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* PAYMENT + BOTTOM */}
          <div className="mt-14 border-t border-white/10 pt-7">
            <div className="flex flex-col gap-8 xl:flex-row xl:items-end xl:justify-between">
              <div className="text-center xl:text-left">
                <p className="text-sm leading-6 text-white/45">
                  © {currentYear} Zamed. All rights reserved.
                </p>

                <p className="mt-1 text-sm text-white/45">
                  Designed &amp; Developed by{" "}
                  <a
                    href="https://akishan97.github.io/my_resume/"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Visit Mohamed Akishan portfolio website"
                    className="group inline-flex items-center gap-1 font-semibold text-white/80 transition hover:text-[#ef5b18]"
                  >
                    <span className="border-b border-transparent transition group-hover:border-[#ef5b18]">
                      Mohamed Akishan
                    </span>
                    <span
                      aria-hidden="true"
                      className="inline-block transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                    >
                      ↗
                    </span>
                  </a>
                </p>
              </div>

              <div>
                <p className="mb-3 text-center text-[10px] font-bold uppercase tracking-[.18em] text-white/30 xl:text-right">
                  Secure payments
                </p>

                <div className="flex flex-wrap items-center justify-center gap-2 xl:justify-end">
                  <VisaBadge />
                  <MastercardBadge />
                  <AmexBadge />
                  <PayPalBadge />
                  <ApplePayBadge />
                  <GooglePayBadge />
                </div>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
};

const FooterHeading = ({ title }) => (
  <div>
    <h3 className="text-[15px] font-black tracking-wide text-white">{title}</h3>
    <div className="mt-3 h-[2px] w-9 bg-[#ef5b18]" />
  </div>
);

const FooterAccordionItem = ({
  item,
  details,
  expanded,
  onToggle,
  onNavigate,
}) => {
  const Icon = details?.icon || FiShoppingBag;

  return (
    <div className="py-1">
      <button
        type="button"
        onClick={onToggle}
        className="group flex w-full items-center justify-between gap-3 py-3 text-left"
      >
        <span
          className={`text-[15px] transition ${
            expanded ? "text-white" : "text-white/55 group-hover:text-white"
          }`}
        >
          {item.label}
        </span>

        <FiChevronDown
          className={`shrink-0 text-sm transition-transform duration-300 ${
            expanded ? "rotate-180 text-[#ef5b18]" : "text-white/25"
          }`}
        />
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="mb-3 rounded-xl border border-white/[0.07] bg-white/[0.045] p-3.5">
              <div className="flex gap-3">
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#ef5b18]/15 text-[#ff7b3b]">
                  <Icon size={13} />
                </div>

                <p className="text-xs leading-5 text-white/50">
                  {details?.text}
                </p>
              </div>

              {details?.action && (
                <button
                  type="button"
                  onClick={() => onNavigate(details.action.to)}
                  className="mt-3 text-xs font-bold text-[#ff7b3b] transition hover:text-white"
                >
                  {details.action.label} →
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*                            REALISTIC PAYMENT UI                            */
/* -------------------------------------------------------------------------- */

const PaymentShell = ({ children, ariaLabel, className = "" }) => (
  <div
    aria-label={ariaLabel}
    title={ariaLabel}
    className={`flex h-[38px] min-w-[62px] items-center justify-center rounded-[7px] border border-[#dedede] bg-white px-2.5 shadow-[0_2px_7px_rgba(0,0,0,.16)] ${className}`}
  >
    {children}
  </div>
);

const VisaBadge = () => (
  <PaymentShell ariaLabel="Visa">
    <span
      className="text-[18px] font-black italic tracking-[-1.5px]"
      style={{ color: "#1434CB", fontFamily: "Arial, sans-serif" }}
    >
      VISA
    </span>
  </PaymentShell>
);

const MastercardBadge = () => (
  <PaymentShell ariaLabel="Mastercard">
    <div className="relative h-[21px] w-[36px]">
      <span className="absolute left-0 top-0 h-[21px] w-[21px] rounded-full bg-[#EB001B]" />
      <span className="absolute right-0 top-0 h-[21px] w-[21px] rounded-full bg-[#F79E1B]" />
      <span className="absolute left-[9px] top-0 h-[21px] w-[18px] rounded-full bg-[#FF5F00]/80" />
    </div>
  </PaymentShell>
);

const AmexBadge = () => (
  <PaymentShell ariaLabel="American Express" className="!border-[#2876bc] !bg-[#2876bc]">
    <div className="text-center font-black leading-none text-white">
      <div className="text-[9px] tracking-[-.4px]">AMERICAN</div>
      <div className="mt-[1px] text-[12px] tracking-[-.6px]">EXPRESS</div>
    </div>
  </PaymentShell>
);

const PayPalBadge = () => (
  <PaymentShell ariaLabel="PayPal">
    <span className="mr-[1px] text-[21px] font-black italic text-[#003087]">
      P
    </span>
    <span className="text-[13px] font-bold tracking-[-.7px] text-[#003087]">
      Pay
    </span>
    <span className="text-[13px] font-bold tracking-[-.7px] text-[#009cde]">
      Pal
    </span>
  </PaymentShell>
);

const ApplePayBadge = () => (
  <PaymentShell ariaLabel="Apple Pay">
    <svg
      viewBox="0 0 24 24"
      className="mr-1.5 h-[16px] w-[16px] fill-black"
      aria-hidden="true"
    >
      <path d="M17.05 12.54c-.03-2.91 2.38-4.33 2.49-4.39-1.37-2-3.49-2.27-4.24-2.29-1.78-.19-3.5 1.07-4.4 1.07-.92 0-2.31-1.05-3.8-1.02-1.92.03-3.72 1.14-4.71 2.87-2.05 3.55-.52 8.77 1.44 11.64.98 1.4 2.12 2.96 3.61 2.91 1.46-.06 2.01-.93 3.78-.93 1.75 0 2.27.93 3.79.9 1.57-.03 2.56-1.41 3.51-2.82 1.13-1.61 1.58-3.19 1.6-3.27-.04-.01-3.04-1.16-3.07-4.67Z" />
      <path d="M14.14 3.97c.79-.99 1.33-2.33 1.18-3.69-1.14.05-2.56.79-3.39 1.76-.73.85-1.38 2.24-1.21 3.55 1.29.1 2.62-.64 3.42-1.62Z" />
    </svg>

    <span className="text-[15px] font-semibold tracking-[-.5px] text-black">
      Pay
    </span>
  </PaymentShell>
);

const GooglePayBadge = () => (
  <PaymentShell ariaLabel="Google Pay">
    <svg
      viewBox="0 0 18 18"
      className="mr-1 h-[17px] w-[17px]"
      aria-hidden="true"
    >
      <path fill="#4285F4" d="M17.64 9.205c0-.638-.057-1.252-.164-1.841H9v3.482h4.844a4.14 4.14 0 0 1-1.797 2.715v2.258h2.909c1.702-1.567 2.684-3.878 2.684-6.614Z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.468-.806 5.956-2.181l-2.909-2.258c-.806.54-1.835.859-3.047.859-2.344 0-4.33-1.585-5.04-3.714H.951v2.332A9 9 0 0 0 9 18Z" />
      <path fill="#FBBC05" d="M3.96 10.706A5.41 5.41 0 0 1 3.678 9c0-.592.102-1.167.282-1.706V4.962H.951A9 9 0 0 0 0 9c0 1.452.347 2.827.951 4.038l3.009-2.332Z" />
      <path fill="#EA4335" d="M9 3.58c1.322 0 2.507.454 3.441 1.346l2.581-2.581C13.464.892 11.426 0 9 0A9 9 0 0 0 .951 4.962L3.96 7.294C4.67 5.165 6.656 3.58 9 3.58Z" />
    </svg>

    <span className="text-[15px] font-medium tracking-[-.6px] text-[#5f6368]">
      Pay
    </span>
  </PaymentShell>
);

export default Footer;
