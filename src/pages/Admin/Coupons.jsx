// src/pages/Admin/Coupons.jsx
import { useEffect, useMemo, useState } from "react";
import {
  FiAlertCircle,
  FiCalendar,
  FiCheck,
  FiCheckCircle,
  FiChevronDown,
  FiClock,
  FiCopy,
  FiEdit2,
  FiFilter,
  FiGift,
  FiImage,
  FiUploadCloud,
  FiMail,
  FiPercent,
  FiPlus,
  FiRefreshCw,
  FiSearch,
  FiSend,
  FiShoppingBag,
  FiTag,
  FiTrash2,
  FiTruck,
  FiUserCheck,
  FiUsers,
  FiX,
  FiZap,
} from "react-icons/fi";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";

const API_URL =
  import.meta.env.VITE_API_URL ||
  (window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5000/api'
    : window.location.hostname.endsWith('.vercel.app')
      ? 'https://zamed-backend-1.onrender.com/api'
      : 'https://zamed-backend-1.onrender.com/api');

const COUPON_IMAGE_DB = "zamed_coupon_assets";
const COUPON_IMAGE_STORE = "coupon_images";

const openCouponImageDB = () =>
  new Promise((resolve, reject) => {
    if (!("indexedDB" in window)) {
      reject(new Error("IndexedDB is not supported in this browser"));
      return;
    }

    const request = indexedDB.open(COUPON_IMAGE_DB, 1);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(COUPON_IMAGE_STORE)) {
        database.createObjectStore(COUPON_IMAGE_STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Unable to open coupon image storage"));
  });

const saveCouponImage = async (couponId, imageData) => {
  if (!couponId || !imageData) return;
  const database = await openCouponImageDB();
  await new Promise((resolve, reject) => {
    const transaction = database.transaction(COUPON_IMAGE_STORE, "readwrite");
    transaction.objectStore(COUPON_IMAGE_STORE).put(imageData, String(couponId));
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error);
  });
  database.close();
};

const getCouponImage = async (couponId) => {
  if (!couponId) return "";
  try {
    const database = await openCouponImageDB();
    const result = await new Promise((resolve, reject) => {
      const transaction = database.transaction(COUPON_IMAGE_STORE, "readonly");
      const request = transaction.objectStore(COUPON_IMAGE_STORE).get(String(couponId));
      request.onsuccess = () => resolve(request.result || "");
      request.onerror = () => reject(request.error);
    });
    database.close();
    return result;
  } catch (error) {
    console.info("Coupon image could not be loaded", error);
    return "";
  }
};

const deleteCouponImage = async (couponId) => {
  if (!couponId) return;
  try {
    const database = await openCouponImageDB();
    await new Promise((resolve, reject) => {
      const transaction = database.transaction(COUPON_IMAGE_STORE, "readwrite");
      transaction.objectStore(COUPON_IMAGE_STORE).delete(String(couponId));
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error);
    });
    database.close();
  } catch (error) {
    console.info("Coupon image could not be deleted", error);
  }
};

const withoutEmbeddedImage = (coupon) => ({
  ...coupon,
  backgroundImage: "",
  hasBackgroundImage: Boolean(coupon.backgroundImage || coupon.hasBackgroundImage),
  imageStorageKey: coupon.id ? String(coupon.id) : coupon.imageStorageKey || "",
});

const hydrateCouponImages = async (couponList = []) =>
  Promise.all(
    couponList.map(async (coupon) => {
      if (coupon.backgroundImage) return coupon;
      if (!coupon.hasBackgroundImage && !coupon.imageStorageKey) return coupon;
      const image = await getCouponImage(coupon.imageStorageKey || coupon.id);
      return { ...coupon, backgroundImage: image };
    })
  );

const cleanupEmbeddedCouponImagesFromLocalStorage = async () => {
  const keys = [];
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (
      key === "admin_coupons" ||
      key === "shop_coupons" ||
      key?.startsWith("user_coupons_")
    ) {
      keys.push(key);
    }
  }

  for (const key of keys) {
    const records = safeParse(localStorage.getItem(key), []);
    if (!Array.isArray(records)) continue;

    await Promise.all(
      records.map((coupon) =>
        coupon?.id && coupon?.backgroundImage
          ? saveCouponImage(coupon.id, coupon.backgroundImage)
          : Promise.resolve()
      )
    );

    const lightweightRecords = records.map(withoutEmbeddedImage);
    localStorage.setItem(key, JSON.stringify(lightweightRecords));
  }
};

const EMPTY_FORM = {
  code: "",
  title: "",
  description: "",
  discountType: "percentage",
  discountValue: 10,
  minPurchase: 0,
  maxDiscount: "",
  startDate: new Date().toISOString().split("T")[0],
  endDate: "",
  usageLimit: "",
  perUserLimit: 1,
  status: "active",
  applicableProducts: "all",
  applicableCategories: [],
  memberOnly: false,
  firstOrderOnly: false,
  featured: false,
  autoSend: false,
  backgroundImage: "",
  backgroundOverlay: 55,
  imagePosition: "center",
  couponTextColor: "#ffffff",
};

const safeParse = (value, fallback = []) => {
  try {
    return JSON.parse(value) ?? fallback;
  } catch {
    return fallback;
  }
};

const numberOr = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeEmail = (email = "") => email.trim().toLowerCase();

const uniqueCustomers = (customers) => {
  const map = new Map();
  customers.forEach((customer) => {
    const email = normalizeEmail(customer?.email);
    if (!email) return;
    map.set(email, {
      id: customer.id || customer._id || email,
      firstName: customer.firstName || customer.name?.split(" ")[0] || "Customer",
      lastName: customer.lastName || customer.name?.split(" ").slice(1).join(" ") || "",
      email,
      role: customer.role || "user",
    });
  });
  return [...map.values()].filter((customer) => customer.role !== "admin");
};

const Coupons = () => {
  const [coupons, setCoupons] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState(null);
  const [selectedCoupon, setSelectedCoupon] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [selectedCustomerEmails, setSelectedCustomerEmails] = useState([]);
  const [sendToAll, setSendToAll] = useState(true);
  const [notificationTitle, setNotificationTitle] = useState("");
  const [notificationMessage, setNotificationMessage] = useState("");
  const [sendEmail, setSendEmail] = useState(true);
  const [sendProfileNotification, setSendProfileNotification] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [currencyCode, setCurrencyCode] = useState("GBP");
  const [currencySymbol, setCurrencySymbol] = useState("£");

  const token = localStorage.getItem("token");


  const handleCouponImage = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be smaller than 5MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        const maxWidth = 1200;
        const scale = Math.min(1, maxWidth / image.width);
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(image.width * scale);
        canvas.height = Math.round(image.height * scale);

        const context = canvas.getContext("2d");
        context.drawImage(image, 0, 0, canvas.width, canvas.height);

        const compressedImage = canvas.toDataURL("image/webp", 0.72);
        setFormData((current) => ({
          ...current,
          backgroundImage: compressedImage,
        }));
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  };

  const removeCouponImage = () => {
    setFormData((current) => ({
      ...current,
      backgroundImage: "",
    }));
  };

  const getCouponBackgroundStyle = (coupon) => {
    if (!coupon?.backgroundImage) return undefined;

    const overlay = Math.min(90, Math.max(0, numberOr(coupon.backgroundOverlay, 55))) / 100;
    return {
      backgroundImage: `linear-gradient(rgba(10, 8, 5, ${overlay}), rgba(10, 8, 5, ${overlay})), url("${coupon.backgroundImage}")`,
      backgroundSize: "cover",
      backgroundPosition: coupon.imagePosition || "center",
      color: coupon.couponTextColor || "#ffffff",
    };
  };

  const persistCoupons = async (nextCoupons) => {
    const previousById = new Map(coupons.map((coupon) => [String(coupon.id), coupon]));

    await Promise.all(
      nextCoupons.map(async (coupon) => {
        const previous = previousById.get(String(coupon.id));
        if (coupon.backgroundImage) {
          await saveCouponImage(coupon.id, coupon.backgroundImage);
        } else if (previous?.backgroundImage || previous?.hasBackgroundImage) {
          await deleteCouponImage(coupon.id);
        }
      })
    );

    const lightweightCoupons = nextCoupons.map(withoutEmbeddedImage);
    setCoupons(nextCoupons);

    try {
      localStorage.setItem("admin_coupons", JSON.stringify(lightweightCoupons));
      localStorage.setItem("shop_coupons", JSON.stringify(lightweightCoupons));
    } catch (error) {
      if (error?.name !== "QuotaExceededError") throw error;

      // Remove image-heavy coupon copies from every coupon-related key and retry.
      await cleanupEmbeddedCouponImagesFromLocalStorage();
      localStorage.removeItem("admin_coupons");
      localStorage.removeItem("shop_coupons");
      localStorage.setItem("admin_coupons", JSON.stringify(lightweightCoupons));
      localStorage.setItem("shop_coupons", JSON.stringify(lightweightCoupons));
      toast.info("Old embedded coupon images were migrated to browser image storage");
    }

    window.dispatchEvent(
      new CustomEvent("couponsUpdated", { detail: { coupons: lightweightCoupons } })
    );
  };

  const loadSettings = () => {
    const settings = safeParse(localStorage.getItem("site_settings"), {});
    const symbols = { USD: "$", EUR: "€", GBP: "£", LKR: "Rs" };
    const code = settings.currency || "GBP";
    setCurrencyCode(code);
    setCurrencySymbol(symbols[code] || "£");
  };

  const loadLocalCustomers = () => {
    const sources = [
      ...safeParse(localStorage.getItem("admin_customers"), []),
      ...safeParse(localStorage.getItem("users"), []),
      ...safeParse(localStorage.getItem("registered_users"), []),
    ];

    const currentUser = safeParse(localStorage.getItem("user"), null);
    if (currentUser?.email) sources.push(currentUser);

    return uniqueCustomers(sources);
  };

  const loadCustomers = async () => {
    let localCustomers = loadLocalCustomers();
    setCustomers(localCustomers);

    if (!token) return;

    try {
      const response = await fetch(`${API_URL}/users?role=user`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) return;
      const data = await response.json();
      const remoteCustomers = uniqueCustomers(data.users || data.customers || []);
      if (remoteCustomers.length) {
        localCustomers = uniqueCustomers([...localCustomers, ...remoteCustomers]);
        setCustomers(localCustomers);
        localStorage.setItem("admin_customers", JSON.stringify(localCustomers));
      }
    } catch (error) {
      console.info("Using locally stored customers", error);
    }
  };

  const loadCoupons = async () => {
    setLoading(true);
    const storedCoupons = safeParse(
      localStorage.getItem("admin_coupons") || localStorage.getItem("shop_coupons"),
      []
    );

    // Migrate older coupons that still contain Base64 images in localStorage.
    const containsEmbeddedImages = storedCoupons.some((coupon) => Boolean(coupon.backgroundImage));
    if (containsEmbeddedImages) {
      await Promise.all(
        storedCoupons.map((coupon) =>
          coupon.backgroundImage ? saveCouponImage(coupon.id, coupon.backgroundImage) : Promise.resolve()
        )
      );
      const lightweightCoupons = storedCoupons.map(withoutEmbeddedImage);
      localStorage.setItem("admin_coupons", JSON.stringify(lightweightCoupons));
      localStorage.setItem("shop_coupons", JSON.stringify(lightweightCoupons));
    }

    const localCoupons = await hydrateCouponImages(storedCoupons);
    setCoupons(localCoupons);

    if (token) {
      try {
        const response = await fetch(`${API_URL}/coupons`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data.coupons)) {
            const remoteCoupons = await hydrateCouponImages(data.coupons);
            await persistCoupons(remoteCoupons);
          }
        }
      } catch (error) {
        console.info("Using locally stored coupons", error);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    loadSettings();
    Promise.all([loadCoupons(), loadCustomers()]);

    const refresh = () => {
      loadSettings();
      loadCoupons();
      loadCustomers();
    };
    window.addEventListener("settingsSaved", refresh);
    window.addEventListener("customersUpdated", refresh);
    return () => {
      window.removeEventListener("settingsSaved", refresh);
      window.removeEventListener("customersUpdated", refresh);
    };
  }, []);

  const isExpired = (coupon) =>
    Boolean(coupon.endDate && new Date(`${coupon.endDate}T23:59:59`) < new Date());

  const isUsedUp = (coupon) =>
    Boolean(coupon.usageLimit && numberOr(coupon.usedCount) >= numberOr(coupon.usageLimit));

  const getCouponState = (coupon) => {
    if (coupon.status === "inactive") return "inactive";
    if (isExpired(coupon)) return "expired";
    if (isUsedUp(coupon)) return "used-up";
    return "active";
  };

  const formatMoney = (value) =>
    `${currencySymbol}${numberOr(value).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const getDiscountLabel = (coupon) => {
    if (coupon.discountType === "free_shipping") return "FREE SHIPPING";
    if (coupon.discountType === "buy_x_get_y") return "BUY 2 GET 1";
    if (coupon.discountType === "percentage") return `${numberOr(coupon.discountValue)}% OFF`;
    return `${formatMoney(coupon.discountValue)} OFF`;
  };

  const filteredCoupons = useMemo(() => {
    return coupons.filter((coupon) => {
      const query = searchTerm.toLowerCase();
      const matchesSearch =
        !query ||
        coupon.code?.toLowerCase().includes(query) ||
        coupon.title?.toLowerCase().includes(query) ||
        coupon.description?.toLowerCase().includes(query);
      const state = getCouponState(coupon);
      const matchesStatus = statusFilter === "all" || state === statusFilter;
      const matchesType = typeFilter === "all" || coupon.discountType === typeFilter;
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [coupons, searchTerm, statusFilter, typeFilter]);

  const stats = useMemo(() => {
    const active = coupons.filter((coupon) => getCouponState(coupon) === "active").length;
    const sent = coupons.reduce((sum, coupon) => sum + numberOr(coupon.sentCount), 0);
    const used = coupons.reduce((sum, coupon) => sum + numberOr(coupon.usedCount), 0);
    return { total: coupons.length, active, sent, used };
  }, [coupons]);

  const openCreateModal = () => {
    setEditingCoupon(null);
    setFormData(EMPTY_FORM);
    setShowCreateModal(true);
  };

  const openEditModal = (coupon) => {
    setEditingCoupon(coupon);
    setFormData({ ...EMPTY_FORM, ...coupon });
    setShowCreateModal(true);
  };

  const closeCreateModal = () => {
    setShowCreateModal(false);
    setEditingCoupon(null);
    setFormData(EMPTY_FORM);
  };

  const generateCode = () => {
    const prefix = "ZAMED";
    const random = Math.random().toString(36).slice(2, 7).toUpperCase();
    setFormData((current) => ({ ...current, code: `${prefix}${random}` }));
  };

  const validateCoupon = () => {
    if (!formData.code.trim()) return "Coupon code is required";
    if (!formData.title.trim()) return "Coupon title is required";
    if (!["free_shipping", "buy_x_get_y"].includes(formData.discountType)) {
      if (numberOr(formData.discountValue) <= 0) return "Discount value must be greater than zero";
    }
    if (!formData.startDate) return "Start date is required";
    if (formData.endDate && formData.endDate < formData.startDate) {
      return "End date cannot be before start date";
    }
    const duplicate = coupons.some(
      (coupon) =>
        coupon.code?.toUpperCase() === formData.code.trim().toUpperCase() &&
        String(coupon.id) !== String(editingCoupon?.id)
    );
    if (duplicate) return "This coupon code already exists";
    return null;
  };

  const buildCouponPayload = () => ({
    ...formData,
    id: editingCoupon?.id || `CPN-${Date.now()}`,
    code: formData.code.trim().toUpperCase(),
    title: formData.title.trim(),
    description: formData.description.trim(),
    discountValue: numberOr(formData.discountValue),
    minPurchase: numberOr(formData.minPurchase),
    maxDiscount: formData.maxDiscount === "" ? null : numberOr(formData.maxDiscount),
    usageLimit: formData.usageLimit === "" ? null : numberOr(formData.usageLimit),
    perUserLimit: Math.max(1, numberOr(formData.perUserLimit, 1)),
    usedCount: numberOr(editingCoupon?.usedCount || formData.usedCount),
    sentCount: numberOr(editingCoupon?.sentCount),
    createdAt: editingCoupon?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    backgroundImage: formData.backgroundImage || "",
    backgroundOverlay: numberOr(formData.backgroundOverlay, 55),
    imagePosition: formData.imagePosition || "center",
    couponTextColor: formData.couponTextColor || "#ffffff",
  });

  const deliverCouponLocally = (coupon, recipients, options = {}) => {
    const timestamp = new Date().toISOString();
    recipients.forEach((customer) => {
      const email = normalizeEmail(customer.email);
      const couponKey = `user_coupons_${email}`;
      const notificationKey = `notifications_${email}`;

      const existingCoupons = safeParse(localStorage.getItem(couponKey), []);
      const deliveredCoupon = {
        ...withoutEmbeddedImage(coupon),
        assignedTo: email,
        assignedAt: timestamp,
        claimed: false,
        source: "admin",
      };
      const nextCoupons = [
        deliveredCoupon,
        ...existingCoupons.filter((item) => String(item.id) !== String(coupon.id)),
      ];
      localStorage.setItem(couponKey, JSON.stringify(nextCoupons));

      if (options.profileNotification !== false) {
        const existingNotifications = safeParse(localStorage.getItem(notificationKey), []);
        const notification = {
          id: `COUPON-${coupon.id}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          title: options.title || `New coupon: ${coupon.code}`,
          message:
            options.message ||
            `${getDiscountLabel(coupon)} is now available. Use code ${coupon.code} before ${
              coupon.endDate ? new Date(coupon.endDate).toLocaleDateString() : "it expires"
            }.`,
          type: "coupon",
          couponId: coupon.id,
          couponCode: coupon.code,
          date: timestamp,
          read: false,
          actionUrl: "/profile?tab=coupons",
        };
        localStorage.setItem(
          notificationKey,
          JSON.stringify([notification, ...existingNotifications].slice(0, 100))
        );
      }
    });

    const broadcasts = safeParse(localStorage.getItem("coupon_broadcasts"), []);
    localStorage.setItem(
      "coupon_broadcasts",
      JSON.stringify([
        {
          id: `BROADCAST-${Date.now()}`,
          couponId: coupon.id,
          couponCode: coupon.code,
          recipientCount: recipients.length,
          recipients: recipients.map((customer) => customer.email),
          sentAt: timestamp,
        },
        ...broadcasts,
      ])
    );

    window.dispatchEvent(
      new CustomEvent("couponReceived", {
        detail: { couponCode: coupon.code, allUsers: recipients.length === customers.length },
      })
    );
    window.dispatchEvent(new Event("storage"));
  };

  const saveCoupon = async (event) => {
    event.preventDefault();
    const validationError = validateCoupon();
    if (validationError) {
      toast.error(validationError);
      return;
    }

    setSaving(true);
    const payload = buildCouponPayload();
    let savedCoupon = payload;

    try {
      if (token) {
        const endpoint = editingCoupon
          ? `${API_URL}/coupons/${editingCoupon.id}`
          : `${API_URL}/coupons`;
        const response = await fetch(endpoint, {
          method: editingCoupon ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });
        if (response.ok) {
          const data = await response.json();
          savedCoupon = data.coupon || payload;
        }
      }
    } catch (error) {
      console.info("Coupon stored locally", error);
    }

    const nextCoupons = editingCoupon
      ? coupons.map((coupon) =>
          String(coupon.id) === String(editingCoupon.id) ? savedCoupon : coupon
        )
      : [savedCoupon, ...coupons];
    await persistCoupons(nextCoupons);
    closeCreateModal();
    toast.success(editingCoupon ? "Coupon updated successfully" : "Coupon created successfully");

    if (!editingCoupon && formData.autoSend) {
      openSendModal(savedCoupon);
    }
    setSaving(false);
  };

  const deleteCoupon = async (coupon) => {
    if (!window.confirm(`Delete coupon ${coupon.code}?`)) return;

    try {
      if (token) {
        await fetch(`${API_URL}/coupons/${coupon.id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    } catch (error) {
      console.info("Coupon deleted locally", error);
    }

    await deleteCouponImage(coupon.id);

    const nextCoupons = coupons.filter(
      (item) =>
        String(item.id) !== String(coupon.id) &&
        String(item.code || "").toUpperCase() !== String(coupon.code || "").toUpperCase()
    );
    await persistCoupons(nextCoupons);

    // Remove the deleted coupon and its offer notification from every local customer.
    Object.keys(localStorage).forEach((key) => {
      try {
        if (key.startsWith("user_coupons_")) {
          const values = safeParse(localStorage.getItem(key), []);
          const cleaned = values.filter(
            (item) =>
              String(item.id) !== String(coupon.id) &&
              String(item.code || "").toUpperCase() !== String(coupon.code || "").toUpperCase()
          );
          localStorage.setItem(key, JSON.stringify(cleaned));
        }

        if (key.startsWith("notifications_")) {
          const values = safeParse(localStorage.getItem(key), []);
          const cleaned = values.filter(
            (notification) =>
              !(
                notification.type === "coupon" &&
                (
                  String(notification.couponId || "") === String(coupon.id) ||
                  String(notification.couponCode || "").toUpperCase() === String(coupon.code || "").toUpperCase()
                )
              )
          );
          localStorage.setItem(key, JSON.stringify(cleaned));
        }
      } catch (storageError) {
        console.warn("Unable to clean customer coupon data", storageError);
      }
    });

    window.dispatchEvent(
      new CustomEvent("couponDeleted", {
        detail: { couponId: coupon.id, couponCode: coupon.code },
      })
    );
    window.dispatchEvent(
      new CustomEvent("couponsUpdated", {
        detail: { action: "deleted", couponId: coupon.id, couponCode: coupon.code },
      })
    );

    toast.success("Coupon deleted from Admin, profiles and notifications");
  };

  const toggleStatus = (coupon) => {
    const nextStatus = coupon.status === "active" ? "inactive" : "active";
    const nextCoupons = coupons.map((item) =>
      String(item.id) === String(coupon.id)
        ? { ...item, status: nextStatus, updatedAt: new Date().toISOString() }
        : item
    );
    void persistCoupons(nextCoupons);
    toast.success(`Coupon ${nextStatus}`);
  };

  const openSendModal = (coupon) => {
    setSelectedCoupon(coupon);
    setSendToAll(true);
    setSelectedCustomerEmails([]);
    setSendEmail(true);
    setSendProfileNotification(true);
    setNotificationTitle(`Exclusive ${getDiscountLabel(coupon)} offer`);
    setNotificationMessage(
      `Use code ${coupon.code} and enjoy ${getDiscountLabel(coupon)}${
        coupon.minPurchase > 0 ? ` on orders over ${formatMoney(coupon.minPurchase)}` : ""
      }. ${coupon.endDate ? `Valid until ${new Date(coupon.endDate).toLocaleDateString()}.` : ""}`
    );
    setShowSendModal(true);
  };

  const sendCoupon = async () => {
    if (!selectedCoupon) return;
    const recipients = sendToAll
      ? customers
      : customers.filter((customer) => selectedCustomerEmails.includes(customer.email));

    if (!recipients.length) {
      toast.error("No customers selected");
      return;
    }

    setSending(true);
    let backendDelivered = false;

    try {
      if (token) {
        const response = await fetch(`${API_URL}/coupons/send-to-customers`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            couponId: selectedCoupon.id,
            couponCode: selectedCoupon.code,
            customerEmails: recipients.map((customer) => customer.email),
            sendEmail,
            createNotification: sendProfileNotification,
            notificationTitle,
            notificationMessage,
          }),
        });
        backendDelivered = response.ok;
      }
    } catch (error) {
      console.info("Backend delivery unavailable; using local delivery", error);
    }

    // Always mirror locally so Profile.jsx updates immediately in this browser.
    deliverCouponLocally(selectedCoupon, recipients, {
      profileNotification: sendProfileNotification,
      title: notificationTitle,
      message: notificationMessage,
    });

    const nextCoupons = coupons.map((coupon) =>
      String(coupon.id) === String(selectedCoupon.id)
        ? {
            ...coupon,
            sentCount: numberOr(coupon.sentCount) + recipients.length,
            lastSentAt: new Date().toISOString(),
          }
        : coupon
    );
    await persistCoupons(nextCoupons);

    toast.success(
      `${selectedCoupon.code} sent to ${recipients.length} customer${recipients.length === 1 ? "" : "s"}${
        backendDelivered ? "" : " (local profile delivery)"
      }`
    );
    setShowSendModal(false);
    setSending(false);
  };

  const copyCode = async (code) => {
    await navigator.clipboard.writeText(code);
    toast.success(`${code} copied`);
  };

  const toggleCustomer = (email) => {
    setSelectedCustomerEmails((current) =>
      current.includes(email) ? current.filter((item) => item !== email) : [...current, email]
    );
  };

  const cardAccent = (type) => {
    if (type === "free_shipping") return "from-emerald-950 to-emerald-700";
    if (type === "fixed") return "from-[#7a4b14] to-[#d3a24f]";
    if (type === "buy_x_get_y") return "from-slate-950 to-slate-700";
    return "from-[#17130e] to-[#3a2a14]";
  };

  if (loading && coupons.length === 0) {
    return (
      <div className="flex min-h-[65vh] items-center justify-center bg-[#f8f5ef]">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-2 border-[#d1a34a] border-t-transparent" />
          <p className="mt-4 text-sm text-gray-500">Loading coupon centre...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f5ef] p-4 text-[#181511] sm:p-6 xl:p-8">
      <div className="mx-auto max-w-[1500px]">
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-[28px] bg-[#11100e] px-6 py-7 text-white shadow-[0_30px_80px_rgba(33,25,12,0.16)] sm:px-9"
        >
          <div className="absolute -right-20 -top-32 h-72 w-72 rounded-full bg-[#d3a24f]/20 blur-3xl" />
          <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
            <div>
              <div className="mb-3 flex items-center gap-2 text-xs font-semibold tracking-[0.28em] text-[#d9ad5b]">
                <FiGift /> ZAMED PREMIUM REWARDS
              </div>
              <h1 className="font-serif text-4xl sm:text-5xl">Coupon Management</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-white/65">
                Create luxury offers, distribute them to every registered customer, and deliver them directly to Profile notifications and Coupons.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => Promise.all([loadCoupons(), loadCustomers()])}
                className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-5 py-3 text-sm font-semibold transition hover:border-[#d3a24f] hover:text-[#d3a24f]"
              >
                <FiRefreshCw /> Refresh
              </button>
              <button
                onClick={openCreateModal}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#b47a29] to-[#e1b762] px-6 py-3 text-sm font-bold text-black shadow-lg transition hover:-translate-y-0.5"
              >
                <FiPlus /> Create Coupon
              </button>
            </div>
          </div>
        </motion.section>

        <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Total Coupons", value: stats.total, icon: FiTag },
            { label: "Active Offers", value: stats.active, icon: FiCheckCircle },
            { label: "Customer Deliveries", value: stats.sent, icon: FiUsers },
            { label: "Coupons Redeemed", value: stats.used, icon: FiShoppingBag },
          ].map((item, index) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.06 }}
                className="rounded-2xl border border-[#e6dccb] bg-white p-5 shadow-[0_10px_30px_rgba(40,28,10,0.05)]"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-400">{item.label}</p>
                    <p className="mt-2 font-serif text-4xl">{item.value}</p>
                  </div>
                  <div className="rounded-2xl bg-[#f7efe1] p-4 text-[#b27a2c]"><Icon size={24} /></div>
                </div>
              </motion.div>
            );
          })}
        </section>

        <section className="mt-6 rounded-2xl border border-[#e6dccb] bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
            <div className="relative flex-1">
              <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search coupon code, title or description..."
                className="w-full rounded-xl border border-[#e7dfd2] bg-[#fbfaf7] py-3 pl-11 pr-4 text-sm outline-none transition focus:border-[#c08a38] focus:ring-4 focus:ring-[#c08a38]/10"
              />
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative">
                <FiFilter className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full appearance-none rounded-xl border border-[#e7dfd2] bg-white py-3 pl-10 pr-10 text-sm outline-none">
                  <option value="all">All statuses</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="expired">Expired</option>
                  <option value="used-up">Used up</option>
                </select>
                <FiChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" />
              </div>
              <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="rounded-xl border border-[#e7dfd2] bg-white px-4 py-3 text-sm outline-none">
                <option value="all">All discount types</option>
                <option value="percentage">Percentage</option>
                <option value="fixed">Fixed amount</option>
                <option value="free_shipping">Free shipping</option>
                <option value="buy_x_get_y">Buy 2 get 1</option>
              </select>
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {filteredCoupons.map((coupon, index) => {
              const state = getCouponState(coupon);
              return (
                <motion.article
                  layout
                  key={coupon.id}
                  initial={{ opacity: 0, y: 18, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ delay: index * 0.035 }}
                  whileHover={{ y: -5 }}
                  className="overflow-hidden rounded-[24px] border border-[#e6dccb] bg-white shadow-[0_18px_45px_rgba(40,28,10,0.07)]"
                >
                  <div
                    className={`relative overflow-hidden bg-gradient-to-br ${cardAccent(coupon.discountType)} p-5 text-white`}
                    style={getCouponBackgroundStyle(coupon)}
                  >
                    {coupon.backgroundImage && (
                      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-black/20" />
                    )}
                    <div className="relative z-[1]">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-semibold tracking-[0.2em] text-[#e6bd70]">EXCLUSIVE OFFER</p>
                        <h3 className="mt-2 font-serif text-3xl">{getDiscountLabel(coupon)}</h3>
                        <p className="mt-1 text-sm text-white/65">{coupon.title}</p>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase ${state === "active" ? "bg-emerald-400/15 text-emerald-300" : state === "expired" ? "bg-red-400/15 text-red-300" : "bg-white/10 text-white/60"}`}>
                        {state.replace("-", " ")}
                      </span>
                    </div>
                    <div className="mt-5 flex items-center justify-between rounded-xl border border-white/15 bg-black/20 px-4 py-3">
                      <span className="font-mono text-lg font-bold tracking-[0.12em]">{coupon.code}</span>
                      <button onClick={() => copyCode(coupon.code)} className="rounded-lg p-2 text-[#e8bf75] transition hover:bg-white/10"><FiCopy /></button>
                    </div>
                    </div>
                  </div>

                  <div className="p-5">
                    <p className="min-h-[42px] text-sm leading-6 text-gray-500">{coupon.description || "Premium discount created for ZAMED customers."}</p>
                    <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                      <div className="rounded-xl bg-[#faf7f1] p-3">
                        <span className="text-gray-400">Minimum order</span>
                        <p className="mt-1 font-semibold">{coupon.minPurchase > 0 ? formatMoney(coupon.minPurchase) : "No minimum"}</p>
                      </div>
                      <div className="rounded-xl bg-[#faf7f1] p-3">
                        <span className="text-gray-400">Expires</span>
                        <p className="mt-1 font-semibold">{coupon.endDate ? new Date(coupon.endDate).toLocaleDateString() : "No expiry"}</p>
                      </div>
                      <div className="rounded-xl bg-[#faf7f1] p-3">
                        <span className="text-gray-400">Usage</span>
                        <p className="mt-1 font-semibold">{numberOr(coupon.usedCount)} / {coupon.usageLimit || "∞"}</p>
                      </div>
                      <div className="rounded-xl bg-[#faf7f1] p-3">
                        <span className="text-gray-400">Delivered</span>
                        <p className="mt-1 font-semibold">{numberOr(coupon.sentCount)} customers</p>
                      </div>
                    </div>

                    <div className="mt-5 flex flex-wrap gap-2">
                      <button onClick={() => openSendModal(coupon)} className="flex-1 rounded-xl bg-[#171511] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#b47a29]"><span className="inline-flex items-center gap-2"><FiSend /> Send</span></button>
                      <button onClick={() => openEditModal(coupon)} className="rounded-xl border border-[#ded4c5] px-4 py-3 transition hover:border-[#b47a29] hover:text-[#a36d23]"><FiEdit2 /></button>
                      <button onClick={() => toggleStatus(coupon)} className="rounded-xl border border-[#ded4c5] px-4 py-3 transition hover:border-[#b47a29] hover:text-[#a36d23]">{coupon.status === "active" ? "Pause" : "Activate"}</button>
                      <button onClick={() => deleteCoupon(coupon)} className="rounded-xl border border-red-100 px-4 py-3 text-red-500 transition hover:bg-red-50"><FiTrash2 /></button>
                    </div>
                  </div>
                </motion.article>
              );
            })}
          </AnimatePresence>
        </section>

        {filteredCoupons.length === 0 && (
          <div className="mt-6 rounded-3xl border border-dashed border-[#d8cbb8] bg-white py-20 text-center">
            <FiTag className="mx-auto text-5xl text-[#c69a54]" />
            <h3 className="mt-4 font-serif text-2xl">No coupons found</h3>
            <p className="mt-2 text-sm text-gray-500">Create a new offer or change the selected filters.</p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showCreateModal && (
          <motion.div className="fixed inset-0 z-50 flex items-end justify-center bg-black/65 p-0 backdrop-blur-sm sm:items-center sm:p-5" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(e) => e.target === e.currentTarget && closeCreateModal()}>
            <motion.div initial={{ opacity: 0, y: 60, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 40, scale: 0.98 }} transition={{ type: "spring", stiffness: 260, damping: 28 }} className="max-h-[96vh] w-full max-w-5xl overflow-hidden rounded-t-[28px] bg-[#fbfaf7] shadow-2xl sm:rounded-[28px]">
              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#e8dfd2] bg-[#11100e] px-6 py-5 text-white sm:px-8">
                <div>
                  <p className="text-xs tracking-[0.22em] text-[#d3a24f]">ZAMED PREMIUM</p>
                  <h2 className="mt-1 font-serif text-3xl">{editingCoupon ? "Edit Coupon" : "Create New Coupon"}</h2>
                </div>
                <button onClick={closeCreateModal} className="rounded-full border border-white/15 p-3 transition hover:rotate-90 hover:border-[#d3a24f] hover:text-[#d3a24f]"><FiX /></button>
              </div>

              <form onSubmit={saveCoupon} className="max-h-[calc(96vh-92px)] overflow-y-auto p-6 sm:p-8">
                <div className="grid gap-7 lg:grid-cols-[1.55fr_.75fr]">
                  <div className="space-y-6">
                    <FormSection title="Coupon identity" icon={FiTag}>
                      <div className="grid gap-4 md:grid-cols-2">
                        <Field label="Coupon code" required>
                          <div className="flex gap-2">
                            <input value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase().replace(/\s/g, "") })} className="field flex-1 font-mono uppercase" placeholder="ZAMED25" />
                            <button type="button" onClick={generateCode} className="rounded-xl border border-[#d9cfbf] px-4 text-xs font-semibold hover:border-[#b47a29]">Generate</button>
                          </div>
                        </Field>
                        <Field label="Offer title" required><input value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="field" placeholder="Mega Sale – 25% OFF" /></Field>
                      </div>
                      <Field label="Description"><textarea rows={3} value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="field resize-none" placeholder="Describe the customer benefit and any important conditions." /></Field>
                    </FormSection>

                    <FormSection title="Coupon background design" icon={FiImage}>
                      <div className="grid gap-5 lg:grid-cols-[1fr_.8fr]">
                        <div>
                          <label className={`group flex min-h-[180px] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed transition ${
                            formData.backgroundImage
                              ? "border-[#b47a29] bg-[#171511]"
                              : "border-[#d9cfbf] bg-[#fbfaf7] hover:border-[#b47a29] hover:bg-[#fbf3e5]"
                          }`}>
                            {formData.backgroundImage ? (
                              <img
                                src={formData.backgroundImage}
                                alt="Coupon background preview"
                                className="h-[180px] w-full object-cover"
                                style={{ objectPosition: formData.imagePosition || "center" }}
                              />
                            ) : (
                              <>
                                <span className="rounded-2xl bg-[#f3e5ce] p-4 text-2xl text-[#a96f22]">
                                  <FiUploadCloud />
                                </span>
                                <strong className="mt-4 text-sm">Upload coupon background</strong>
                                <span className="mt-1 text-xs text-gray-500">JPG, PNG or WEBP · maximum 5MB</span>
                              </>
                            )}
                            <input
                              type="file"
                              accept="image/png,image/jpeg,image/webp"
                              onChange={handleCouponImage}
                              className="hidden"
                            />
                          </label>

                          {formData.backgroundImage && (
                            <div className="mt-3 flex gap-2">
                              <label className="flex-1 cursor-pointer rounded-xl border border-[#d9cfbf] bg-white px-4 py-3 text-center text-xs font-semibold transition hover:border-[#b47a29]">
                                Replace image
                                <input
                                  type="file"
                                  accept="image/png,image/jpeg,image/webp"
                                  onChange={handleCouponImage}
                                  className="hidden"
                                />
                              </label>
                              <button
                                type="button"
                                onClick={removeCouponImage}
                                className="rounded-xl border border-red-100 px-4 py-3 text-xs font-semibold text-red-500 transition hover:bg-red-50"
                              >
                                Remove
                              </button>
                            </div>
                          )}
                        </div>

                        <div className="space-y-4">
                          <Field label={`Dark overlay (${numberOr(formData.backgroundOverlay, 55)}%)`}>
                            <input
                              type="range"
                              min="0"
                              max="90"
                              step="5"
                              value={formData.backgroundOverlay}
                              onChange={(e) => setFormData({ ...formData, backgroundOverlay: e.target.value })}
                              className="w-full accent-[#b47a29]"
                            />
                          </Field>

                          <Field label="Image position">
                            <select
                              value={formData.imagePosition}
                              onChange={(e) => setFormData({ ...formData, imagePosition: e.target.value })}
                              className="field"
                            >
                              <option value="center">Centre</option>
                              <option value="top">Top</option>
                              <option value="bottom">Bottom</option>
                              <option value="left">Left</option>
                              <option value="right">Right</option>
                            </select>
                          </Field>

                          <Field label="Coupon text colour">
                            <div className="flex items-center gap-3">
                              <input
                                type="color"
                                value={formData.couponTextColor}
                                onChange={(e) => setFormData({ ...formData, couponTextColor: e.target.value })}
                                className="h-12 w-16 cursor-pointer rounded-xl border border-[#ded4c5] bg-white p-1"
                              />
                              <input
                                value={formData.couponTextColor}
                                onChange={(e) => setFormData({ ...formData, couponTextColor: e.target.value })}
                                className="field font-mono uppercase"
                              />
                            </div>
                          </Field>

                          <p className="rounded-xl bg-[#faf6ef] p-3 text-xs leading-5 text-gray-500">
                            The image is compressed automatically and saved with the coupon. It is also included when the coupon is sent to customer profiles.
                          </p>
                        </div>
                      </div>
                    </FormSection>

                    <FormSection title="Discount rules" icon={FiPercent}>
                      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                        <Field label="Discount type"><select value={formData.discountType} onChange={(e) => setFormData({ ...formData, discountType: e.target.value })} className="field"><option value="percentage">Percentage</option><option value="fixed">Fixed amount</option><option value="free_shipping">Free shipping</option><option value="buy_x_get_y">Buy 2 get 1</option></select></Field>
                        <Field label="Discount value"><input type="number" min="0" step="0.01" disabled={["free_shipping", "buy_x_get_y"].includes(formData.discountType)} value={formData.discountValue} onChange={(e) => setFormData({ ...formData, discountValue: e.target.value })} className="field disabled:bg-gray-100" /></Field>
                        <Field label="Minimum purchase"><input type="number" min="0" step="0.01" value={formData.minPurchase} onChange={(e) => setFormData({ ...formData, minPurchase: e.target.value })} className="field" /></Field>
                        <Field label="Maximum discount"><input type="number" min="0" step="0.01" value={formData.maxDiscount} onChange={(e) => setFormData({ ...formData, maxDiscount: e.target.value })} className="field" placeholder="No limit" /></Field>
                      </div>
                    </FormSection>

                    <FormSection title="Schedule and limits" icon={FiCalendar}>
                      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                        <Field label="Start date" required><input type="date" value={formData.startDate} onChange={(e) => setFormData({ ...formData, startDate: e.target.value })} className="field" /></Field>
                        <Field label="End date"><input type="date" min={formData.startDate} value={formData.endDate} onChange={(e) => setFormData({ ...formData, endDate: e.target.value })} className="field" /></Field>
                        <Field label="Total usage limit"><input type="number" min="1" value={formData.usageLimit} onChange={(e) => setFormData({ ...formData, usageLimit: e.target.value })} className="field" placeholder="Unlimited" /></Field>
                        <Field label="Limit per customer"><input type="number" min="1" value={formData.perUserLimit} onChange={(e) => setFormData({ ...formData, perUserLimit: e.target.value })} className="field" /></Field>
                      </div>
                    </FormSection>

                    <FormSection title="Eligibility" icon={FiUserCheck}>
                      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        <ToggleCard label="Active coupon" checked={formData.status === "active"} onChange={(checked) => setFormData({ ...formData, status: checked ? "active" : "inactive" })} />
                        <ToggleCard label="Premium members only" checked={formData.memberOnly} onChange={(checked) => setFormData({ ...formData, memberOnly: checked })} />
                        <ToggleCard label="First order only" checked={formData.firstOrderOnly} onChange={(checked) => setFormData({ ...formData, firstOrderOnly: checked })} />
                        <ToggleCard label="Featured coupon" checked={formData.featured} onChange={(checked) => setFormData({ ...formData, featured: checked })} />
                      </div>
                    </FormSection>
                  </div>

                  <div className="space-y-5">
                    <div
                      className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${cardAccent(formData.discountType)} p-6 text-white shadow-xl`}
                      style={getCouponBackgroundStyle(formData)}
                    >
                      {formData.backgroundImage && <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-black/25" />}
                      <div className="relative z-[1]">
                      <p className="text-xs tracking-[0.2em] text-[#e2b866]">LIVE PREVIEW</p>
                      <h3 className="mt-4 font-serif text-4xl">{getDiscountLabel(formData)}</h3>
                      <p className="mt-2 text-sm text-white/65">{formData.title || "Your offer title"}</p>
                      <div className="mt-7 rounded-xl border border-white/15 bg-black/20 p-4 font-mono text-xl font-bold tracking-[0.14em]">{formData.code || "ZAMEDCODE"}</div>
                      <div className="mt-5 space-y-2 text-xs text-white/60"><p>Minimum: {numberOr(formData.minPurchase) > 0 ? formatMoney(formData.minPurchase) : "No minimum"}</p><p>Valid until: {formData.endDate ? new Date(formData.endDate).toLocaleDateString() : "No expiry"}</p></div>
                      </div>
                    </div>
                    {!editingCoupon && <ToggleCard label="Send after creating" description="Open customer delivery immediately after saving." checked={formData.autoSend} onChange={(checked) => setFormData({ ...formData, autoSend: checked })} />}
                    <div className="rounded-2xl border border-[#e5dac9] bg-white p-5 text-sm leading-6 text-gray-500"><FiAlertCircle className="mb-3 text-xl text-[#b47a29]" /><strong className="block text-gray-900">Profile integration</strong>Sending writes the coupon to <code>user_coupons_email</code> and creates an unread item in <code>notifications_email</code>, matching your existing Profile.jsx.</div>
                  </div>
                </div>

                <div className="sticky bottom-0 mt-8 flex flex-col-reverse gap-3 border-t border-[#e8dfd2] bg-[#fbfaf7]/95 pt-5 backdrop-blur sm:flex-row sm:justify-end">
                  <button type="button" onClick={closeCreateModal} className="rounded-xl border border-[#d9cfbf] px-7 py-3 text-sm font-semibold">Cancel</button>
                  <button type="submit" disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#171511] px-8 py-3 text-sm font-semibold text-white transition hover:bg-[#b47a29] disabled:opacity-60">{saving ? <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <FiCheck />} {editingCoupon ? "Update Coupon" : "Create Coupon"}</button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSendModal && selectedCoupon && (
          <motion.div className="fixed inset-0 z-50 flex items-end justify-center bg-black/65 p-0 backdrop-blur-sm sm:items-center sm:p-5" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(e) => e.target === e.currentTarget && setShowSendModal(false)}>
            <motion.div initial={{ opacity: 0, y: 60, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 40 }} transition={{ type: "spring", stiffness: 250, damping: 28 }} className="max-h-[94vh] w-full max-w-4xl overflow-hidden rounded-t-[28px] bg-[#fbfaf7] shadow-2xl sm:rounded-[28px]">
              <div className="flex items-center justify-between bg-[#11100e] px-6 py-5 text-white sm:px-8"><div><p className="text-xs tracking-[0.2em] text-[#d3a24f]">CUSTOMER DELIVERY</p><h2 className="mt-1 font-serif text-3xl">Send {selectedCoupon.code}</h2></div><button onClick={() => setShowSendModal(false)} className="rounded-full border border-white/15 p-3"><FiX /></button></div>
              <div className="max-h-[calc(94vh-88px)] overflow-y-auto p-6 sm:p-8">
                <div className="grid gap-6 lg:grid-cols-[1fr_.85fr]">
                  <div className="space-y-5">
                    <FormSection title="Recipients" icon={FiUsers}>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <button type="button" onClick={() => setSendToAll(true)} className={`rounded-2xl border p-4 text-left transition ${sendToAll ? "border-[#b47a29] bg-[#fbf3e5]" : "border-[#e3d9ca] bg-white"}`}><div className="flex items-center justify-between"><FiUsers className="text-xl text-[#b47a29]" />{sendToAll && <FiCheckCircle className="text-[#b47a29]" />}</div><strong className="mt-3 block">All customers</strong><span className="text-xs text-gray-500">Send to all {customers.length} registered users</span></button>
                        <button type="button" onClick={() => setSendToAll(false)} className={`rounded-2xl border p-4 text-left transition ${!sendToAll ? "border-[#b47a29] bg-[#fbf3e5]" : "border-[#e3d9ca] bg-white"}`}><div className="flex items-center justify-between"><FiUserCheck className="text-xl text-[#b47a29]" />{!sendToAll && <FiCheckCircle className="text-[#b47a29]" />}</div><strong className="mt-3 block">Selected customers</strong><span className="text-xs text-gray-500">Choose individual recipients</span></button>
                      </div>
                      {!sendToAll && <div className="mt-4 max-h-64 space-y-2 overflow-y-auto rounded-2xl border border-[#e3d9ca] bg-white p-3">{customers.map((customer) => <label key={customer.email} className="flex cursor-pointer items-center gap-3 rounded-xl p-3 hover:bg-[#faf6ef]"><input type="checkbox" checked={selectedCustomerEmails.includes(customer.email)} onChange={() => toggleCustomer(customer.email)} className="h-4 w-4 accent-[#b47a29]" /><div><p className="text-sm font-semibold">{customer.firstName} {customer.lastName}</p><p className="text-xs text-gray-500">{customer.email}</p></div></label>)}{customers.length === 0 && <p className="py-6 text-center text-sm text-gray-500">No users were found in admin_customers, users, registered_users, or the backend.</p>}</div>}
                    </FormSection>

                    <FormSection title="Profile notification" icon={FiMail}>
                      <Field label="Notification title"><input value={notificationTitle} onChange={(e) => setNotificationTitle(e.target.value)} className="field" /></Field>
                      <Field label="Notification message"><textarea rows={4} value={notificationMessage} onChange={(e) => setNotificationMessage(e.target.value)} className="field resize-none" /></Field>
                    </FormSection>
                  </div>

                  <div className="space-y-5">
                    <div
                      className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${cardAccent(selectedCoupon.discountType)} p-6 text-white shadow-xl`}
                      style={getCouponBackgroundStyle(selectedCoupon)}
                    >
                      {selectedCoupon.backgroundImage && <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-black/25" />}
                      <div className="relative z-[1]"><p className="text-xs tracking-[0.2em] text-[#e2b866]">COUPON PREVIEW</p><h3 className="mt-4 font-serif text-4xl">{getDiscountLabel(selectedCoupon)}</h3><p className="mt-2 text-sm text-white/65">{selectedCoupon.title}</p><div className="mt-6 rounded-xl border border-white/15 bg-black/20 p-4 font-mono text-xl font-bold tracking-[0.15em]">{selectedCoupon.code}</div></div></div>
                    <div className="space-y-3"><ToggleCard label="Profile notification" description="Creates an unread coupon alert in the customer's Notifications section." checked={sendProfileNotification} onChange={setSendProfileNotification} /><ToggleCard label="Email delivery" description="Requests email delivery from your backend endpoint when available." checked={sendEmail} onChange={setSendEmail} /></div>
                    <div className="rounded-2xl border border-[#e3d9ca] bg-white p-5"><div className="flex justify-between text-sm"><span className="text-gray-500">Recipients</span><strong>{sendToAll ? customers.length : selectedCustomerEmails.length}</strong></div><div className="mt-3 flex justify-between text-sm"><span className="text-gray-500">Profile coupon</span><strong className="text-emerald-600">Enabled</strong></div><div className="mt-3 flex justify-between text-sm"><span className="text-gray-500">Notification</span><strong>{sendProfileNotification ? "Enabled" : "Disabled"}</strong></div></div>
                  </div>
                </div>
                <div className="mt-7 flex flex-col-reverse gap-3 border-t border-[#e8dfd2] pt-5 sm:flex-row sm:justify-end"><button onClick={() => setShowSendModal(false)} className="rounded-xl border border-[#d9cfbf] px-7 py-3 text-sm font-semibold">Cancel</button><button onClick={sendCoupon} disabled={sending} className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#af7526] to-[#ddb15d] px-8 py-3 text-sm font-bold text-black disabled:opacity-60">{sending ? <span className="h-5 w-5 animate-spin rounded-full border-2 border-black border-t-transparent" /> : <FiSend />} Send Coupon</button></div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .field { width: 100%; border: 1px solid #ded4c5; border-radius: 0.75rem; background: white; padding: 0.75rem 0.9rem; font-size: 0.875rem; outline: none; transition: 180ms ease; }
        .field:focus { border-color: #b47a29; box-shadow: 0 0 0 4px rgba(180,122,41,.10); }
      `}</style>
    </div>
  );
};

const FormSection = ({ title, icon: Icon, children }) => (
  <section className="rounded-2xl border border-[#e5dac9] bg-white p-5 sm:p-6">
    <div className="mb-5 flex items-center gap-3"><div className="rounded-xl bg-[#f8efe0] p-2.5 text-[#b47a29]"><Icon /></div><h3 className="font-serif text-xl">{title}</h3></div>
    <div className="space-y-4">{children}</div>
  </section>
);

const Field = ({ label, required, children }) => (
  <label className="block"><span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-gray-500">{label}{required && <span className="ml-1 text-red-500">*</span>}</span>{children}</label>
);

const ToggleCard = ({ label, description, checked, onChange }) => (
  <button type="button" onClick={() => onChange(!checked)} className={`w-full rounded-2xl border p-4 text-left transition ${checked ? "border-[#b47a29] bg-[#fbf3e5]" : "border-[#e3d9ca] bg-white hover:border-[#cba15f]"}`}>
    <div className="flex items-center justify-between gap-3"><div><strong className="block text-sm">{label}</strong>{description && <span className="mt-1 block text-xs leading-5 text-gray-500">{description}</span>}</div><span className={`relative h-6 w-11 shrink-0 rounded-full transition ${checked ? "bg-[#b47a29]" : "bg-gray-200"}`}><span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition ${checked ? "left-6" : "left-1"}`} /></span></div>
  </button>
);

export default Coupons;
