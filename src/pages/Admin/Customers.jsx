
// src/pages/Admin/Customers.jsx
import { useEffect, useMemo, useState } from "react";
import {
  FiAlertCircle,
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiDownload,
  FiEdit2,
  FiEye,
  FiMail,
  FiMapPin,
  FiPhone,
  FiRefreshCw,
  FiSearch,
  FiShoppingBag,
  FiTrash2,
  FiTrendingUp,
  FiUser,
  FiUsers,
  FiX,
  FiDollarSign,
  FiPackage,
} from "react-icons/fi";
import { toast } from "sonner";
import { AnimatePresence, motion } from "framer-motion";

const Customers = () => {
  const [customers, setCustomers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [currencySymbol, setCurrencySymbol] = useState("$");
  const [editFormData, setEditFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    status: "active",
  });

  /* -------------------------------------------------------------------------- */
  /*                                   HELPERS                                  */
  /* -------------------------------------------------------------------------- */

  const safeJSON = (value, fallback) => {
    try {
      return JSON.parse(value || JSON.stringify(fallback));
    } catch {
      return fallback;
    }
  };

  const normalizeEmail = (email = "") => String(email).trim().toLowerCase();

  const parseNumber = (value) => {
    if (typeof value === "number") {
      return Number.isFinite(value) ? value : 0;
    }

    if (typeof value === "string") {
      const cleaned = value.replace(/[^0-9.-]/g, "");
      const parsed = Number(cleaned);
      return Number.isFinite(parsed) ? parsed : 0;
    }

    return 0;
  };

  const getOrderTotal = (order = {}) => {
    const candidates = [
      order.total,
      order.grandTotal,
      order.totalAmount,
      order.amount,
      order.orderTotal,
      order.finalTotal,
      order.payableTotal,
      order.summary?.total,
      order.pricing?.total,
      order.payment?.amount,
    ];

    for (const candidate of candidates) {
      const parsed = parseNumber(candidate);
      if (parsed > 0) return parsed;
    }

    const items = order.items || order.products || order.orderItems || [];

    if (Array.isArray(items) && items.length > 0) {
      const itemsTotal = items.reduce((sum, item) => {
        const quantity = parseNumber(item.quantity || item.qty || 1) || 1;
        const price =
          parseNumber(item.price) ||
          parseNumber(item.unitPrice) ||
          parseNumber(item.salePrice) ||
          parseNumber(item.product?.price);

        return sum + price * quantity;
      }, 0);

      const shipping =
        parseNumber(order.shipping) ||
        parseNumber(order.shippingFee) ||
        parseNumber(order.deliveryFee);

      const tax =
        parseNumber(order.tax) ||
        parseNumber(order.taxAmount);

      const discount =
        parseNumber(order.discount) ||
        parseNumber(order.discountAmount);

      return Math.max(0, itemsTotal + shipping + tax - discount);
    }

    return 0;
  };

  const normalizeStatus = (value = "") =>
    String(value).trim().toLowerCase().replace(/\s+/g, "-");

  const isCancelledOrder = (order = {}) => {
    const status = normalizeStatus(
      order.status ||
        order.orderStatus ||
        order.paymentStatus ||
        ""
    );

    return [
      "cancelled",
      "canceled",
      "refunded",
      "failed",
      "payment-failed",
    ].includes(status);
  };

  const getCustomerSpent = (orders = []) =>
    orders.reduce(
      (sum, order) =>
        isCancelledOrder(order) ? sum : sum + getOrderTotal(order),
      0
    );

  const getOrderDateValue = (order = {}) =>
    order.createdAt ||
    order.created_at ||
    order.orderDate ||
    order.date ||
    order.placedAt ||
    order.updatedAt ||
    null;

  const toValidDate = (value) => {
    if (!value) return null;

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  };

  const earliestDate = (values = []) => {
    const validDates = values
      .map(toValidDate)
      .filter(Boolean)
      .sort((a, b) => a.getTime() - b.getTime());

    return validDates[0] || null;
  };

  const getCustomerJoinDate = (customer = {}, orders = []) => {
    const direct = earliestDate([
      customer.createdAt,
      customer.created_at,
      customer.registeredAt,
      customer.registrationDate,
      customer.joinDate,
      customer.joinedAt,
      customer.dateJoined,
    ]);

    if (direct) return direct.toISOString();

    const firstOrder = earliestDate(orders.map(getOrderDateValue));
    if (firstOrder) return firstOrder.toISOString();

    return null;
  };

  const getLastActiveDate = (customer = {}, orders = []) => {
    const values = [
      customer.lastActive,
      customer.lastLogin,
      customer.updatedAt,
      customer.updated_at,
      ...orders.map(getOrderDateValue),
    ];

    const dates = values
      .map(toValidDate)
      .filter(Boolean)
      .sort((a, b) => b.getTime() - a.getTime());

    return dates[0] ? dates[0].toISOString() : null;
  };

  const formatDate = (value) => {
    const date = toValidDate(value);

    if (!date) return "Unknown";

    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(date);
  };

  const formatDateTime = (value) => {
    const date = toValidDate(value);

    if (!date) return "Unknown";

    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  const formatPrice = (price) =>
    `${currencySymbol}${parseNumber(price).toLocaleString("en-GB", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const getOrderId = (order = {}, index = 0) =>
    order.orderNumber ||
    order.orderId ||
    order._id ||
    order.id ||
    `ORDER-${index + 1}`;

  const getOrderStatus = (order = {}) =>
    order.status ||
    order.orderStatus ||
    order.paymentStatus ||
    "Processing";

  const getOrderItems = (order = {}) =>
    order.items || order.products || order.orderItems || [];

  const getCustomerName = (customer = {}) => {
    const firstLastName =
      `${customer.firstName || ""} ${customer.lastName || ""}`.trim();

    const fullName =
      firstLastName ||
      customer.name ||
      customer.fullName;

    return fullName || customer.email?.split("@")[0] || "Customer";
  };

  const getCustomerPhone = (customer = {}) =>
    customer.phone ||
    customer.phoneNumber ||
    customer.mobile ||
    "Not provided";

  const getCustomerAddress = (customer = {}) => {
    if (typeof customer.address === "string" && customer.address.trim()) {
      return customer.address;
    }

    if (customer.address && typeof customer.address === "object") {
      return [
        customer.address.line1,
        customer.address.line2,
        customer.address.city,
        customer.address.postcode,
        customer.address.postalCode,
        customer.address.country,
      ]
        .filter(Boolean)
        .join(", ");
    }

    const fallback = [
      customer.addressLine1,
      customer.addressLine2,
      customer.city,
      customer.postcode,
      customer.postalCode,
      customer.country,
    ]
      .filter(Boolean)
      .join(", ");

    return fallback || "Not provided";
  };

  const mergeOrders = (...orderGroups) => {
    const result = [];
    const seen = new Set();

    orderGroups.flat().forEach((order, index) => {
      if (!order || typeof order !== "object") return;

      const id = String(
        order._id ||
          order.id ||
          order.orderId ||
          order.orderNumber ||
          `${getOrderDateValue(order) || "no-date"}-${getOrderTotal(order)}-${index}`
      );

      if (seen.has(id)) return;
      seen.add(id);
      result.push(order);
    });

    return result;
  };

  /* -------------------------------------------------------------------------- */
  /*                              LOAD CUSTOMER DATA                            */
  /* -------------------------------------------------------------------------- */

  const loadAllCustomers = () => {
    const customerMap = new Map();

    const upsertCustomer = (rawCustomer = {}, extraOrders = []) => {
      const email = normalizeEmail(rawCustomer.email);

      if (!email) return;

      const existing = customerMap.get(email) || {};
      const existingOrders = existing.orders || [];
      const customerOrders = Array.isArray(rawCustomer.orders)
        ? rawCustomer.orders
        : [];

      const orders = mergeOrders(
        existingOrders,
        customerOrders,
        extraOrders
      );

      const merged = {
        ...existing,
        ...rawCustomer,
        email,
        name: getCustomerName({
          ...existing,
          ...rawCustomer,
        }),
        phone: getCustomerPhone({
          ...existing,
          ...rawCustomer,
        }),
        address: getCustomerAddress({
          ...existing,
          ...rawCustomer,
        }),
        status:
          rawCustomer.status ||
          existing.status ||
          "active",
        orders,
      };

      const joinedAt = getCustomerJoinDate(merged, orders);
      const lastActiveAt = getLastActiveDate(merged, orders);

      merged.joinedAt = joinedAt;
      merged.joinDate = joinedAt;
      merged.lastActive = lastActiveAt;
      merged.totalOrders = orders.length;
      merged.totalSpent = getCustomerSpent(orders);
      merged.averageOrderValue =
        orders.length > 0 ? merged.totalSpent / orders.length : 0;

      customerMap.set(email, merged);
    };

    // Existing admin customer records.
    const savedCustomers = safeJSON(
      localStorage.getItem("admin_customers"),
      []
    );

    if (Array.isArray(savedCustomers)) {
      savedCustomers.forEach((customer) => {
        if (!customer?.email) return;

        const email = normalizeEmail(customer.email);
        const customerOrders = safeJSON(
          localStorage.getItem(`orders_${email}`),
          []
        );

        upsertCustomer(
          customer,
          Array.isArray(customerOrders) ? customerOrders : []
        );
      });
    }

    // IMPORTANT:
    // Load the currently signed-in customer AFTER admin_customers.
    // This makes the latest Profile page data authoritative and prevents
    // an older cached admin customer name from overwriting it.
    const currentUser = safeJSON(
      localStorage.getItem("user"),
      null
    );

    if (currentUser?.email) {
      const email = normalizeEmail(currentUser.email);
      const orders = safeJSON(
        localStorage.getItem(`orders_${email}`),
        []
      );

      upsertCustomer(
        {
          ...currentUser,
          // Explicitly rebuild the display name from the latest profile fields.
          name:
            currentUser.name ||
            currentUser.fullName ||
            `${currentUser.firstName || ""} ${currentUser.lastName || ""}`.trim() ||
            currentUser.email?.split("@")[0] ||
            "Customer",
        },
        Array.isArray(orders) ? orders : []
      );
    }

    // Scan email-specific order histories.
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);

      if (!key?.startsWith("orders_")) continue;

      const email = normalizeEmail(key.substring("orders_".length));

      if (!email) continue;

      const orders = safeJSON(localStorage.getItem(key), []);

      upsertCustomer(
        {
          email,
          name: email.split("@")[0],
        },
        Array.isArray(orders) ? orders : []
      );
    }

    // Support stores that keep all orders in a single localStorage key.
    const globalOrderKeys = [
      "orders",
      "all_orders",
      "admin_orders",
      "customer_orders",
    ];

    globalOrderKeys.forEach((key) => {
      const globalOrders = safeJSON(localStorage.getItem(key), []);

      if (!Array.isArray(globalOrders)) return;

      const grouped = {};

      globalOrders.forEach((order) => {
        const email = normalizeEmail(
          order.customerEmail ||
            order.email ||
            order.customer?.email ||
            order.user?.email
        );

        if (!email) return;

        if (!grouped[email]) grouped[email] = [];
        grouped[email].push(order);
      });

      Object.entries(grouped).forEach(([email, orders]) => {
        const firstOrder = orders[0] || {};
        const customer =
          firstOrder.customer ||
          firstOrder.user ||
          {
            email,
            name:
              firstOrder.customerName ||
              firstOrder.name ||
              email.split("@")[0],
            phone:
              firstOrder.customerPhone ||
              firstOrder.phone ||
              "",
            address:
              firstOrder.shippingAddress ||
              firstOrder.address ||
              "",
          };

        upsertCustomer(
          {
            ...customer,
            email,
          },
          orders
        );
      });
    });

    const allCustomers = Array.from(customerMap.values());

    setCustomers(allCustomers);

    // Keep admin cache lightweight and accurate.
    try {
      // Keep admin_customers lightweight.
      // Full orders/images already live in order storage and must not be duplicated
      // into localStorage or it will cause QuotaExceededError.
      const cache = allCustomers.map((customer) => ({
        id: customer.id || customer._id || null,
        _id: customer._id || customer.id || null,
        name: customer.name,
        firstName: customer.firstName || "",
        lastName: customer.lastName || "",
        email: customer.email,
        phone: customer.phone,
        address: customer.address,
        city: customer.city || "",
        status: customer.status || "active",
        joinedAt: customer.joinedAt || null,
        joinDate: customer.joinDate || customer.joinedAt || null,
        lastActive: customer.lastActive || null,
        totalOrders: customer.totalOrders || 0,
        totalSpent: customer.totalSpent || 0,
        averageOrderValue: customer.averageOrderValue || 0
      }));

      localStorage.setItem(
        "admin_customers",
        JSON.stringify(cache)
      );
    } catch (error) {
      console.warn(
        "Unable to update lightweight admin customer cache:",
        error
      );
    }
  };

  useEffect(() => {
    const settings = safeJSON(
      localStorage.getItem("site_settings"),
      {}
    );

    const siteInfo = safeJSON(
      localStorage.getItem("site_info"),
      {}
    );

    const symbols = {
      USD: "$",
      EUR: "€",
      GBP: "£",
      LKR: "Rs ",
    };

    setCurrencySymbol(
      symbols[siteInfo.currency || settings.currency] || "$"
    );

    loadAllCustomers();

    const refresh = () => loadAllCustomers();

    window.addEventListener("storage", refresh);
    window.addEventListener("authChanged", refresh);
    window.addEventListener("ordersUpdated", refresh);

    // Same-tab profile update events.
    // The browser's native "storage" event does not fire in the same tab,
    // so these events keep Admin > Customers synchronized immediately.
    window.addEventListener("profileUpdated", refresh);
    window.addEventListener("userUpdated", refresh);
    window.addEventListener("customerUpdated", refresh);
    window.addEventListener("customerProfileUpdated", refresh);

    // Fallback for older Profile.jsx versions that only update localStorage
    // and do not dispatch a custom event yet.
    const syncInterval = window.setInterval(refresh, 3000);

    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("authChanged", refresh);
      window.removeEventListener("ordersUpdated", refresh);
      window.removeEventListener("profileUpdated", refresh);
      window.removeEventListener("userUpdated", refresh);
      window.removeEventListener("customerUpdated", refresh);
      window.removeEventListener("customerProfileUpdated", refresh);
      window.clearInterval(syncInterval);
    };
  }, []);

  /* -------------------------------------------------------------------------- */
  /*                              FILTER / STATISTICS                           */
  /* -------------------------------------------------------------------------- */

  const filteredCustomers = useMemo(() => {
    let result = [...customers];

    const term = searchTerm.trim().toLowerCase();

    if (term) {
      result = result.filter((customer) =>
        [
          customer.name,
          customer.email,
          customer.phone,
          customer.address,
        ].some((value) =>
          String(value || "")
            .toLowerCase()
            .includes(term)
        )
      );
    }

    if (statusFilter !== "all") {
      result = result.filter(
        (customer) => customer.status === statusFilter
      );
    }

    if (sortBy === "newest") {
      result.sort((a, b) => {
        const aDate = toValidDate(a.joinedAt)?.getTime() || 0;
        const bDate = toValidDate(b.joinedAt)?.getTime() || 0;
        return bDate - aDate;
      });
    }

    if (sortBy === "oldest") {
      result.sort((a, b) => {
        const aDate =
          toValidDate(a.joinedAt)?.getTime() ||
          Number.MAX_SAFE_INTEGER;
        const bDate =
          toValidDate(b.joinedAt)?.getTime() ||
          Number.MAX_SAFE_INTEGER;
        return aDate - bDate;
      });
    }

    if (sortBy === "spent-high") {
      result.sort(
        (a, b) =>
          parseNumber(b.totalSpent) - parseNumber(a.totalSpent)
      );
    }

    if (sortBy === "orders-high") {
      result.sort(
        (a, b) =>
          parseNumber(b.totalOrders) - parseNumber(a.totalOrders)
      );
    }

    return result;
  }, [customers, searchTerm, statusFilter, sortBy]);

  const stats = useMemo(() => {
    const now = new Date();

    const totalSpent = customers.reduce(
      (sum, customer) => sum + parseNumber(customer.totalSpent),
      0
    );

    const totalOrders = customers.reduce(
      (sum, customer) => sum + parseNumber(customer.totalOrders),
      0
    );

    const newThisMonth = customers.filter((customer) => {
      const joined = toValidDate(customer.joinedAt);

      return (
        joined &&
        joined.getMonth() === now.getMonth() &&
        joined.getFullYear() === now.getFullYear()
      );
    }).length;

    return {
      total: customers.length,
      active: customers.filter(
        (customer) => customer.status === "active"
      ).length,
      inactive: customers.filter(
        (customer) => customer.status === "inactive"
      ).length,
      blocked: customers.filter(
        (customer) => customer.status === "blocked"
      ).length,
      totalSpent,
      totalOrders,
      averageOrderValue:
        totalOrders > 0 ? totalSpent / totalOrders : 0,
      newThisMonth,
    };
  }, [customers]);

  /* -------------------------------------------------------------------------- */
  /*                                  ACTIONS                                   */
  /* -------------------------------------------------------------------------- */

  const persistCustomers = (nextCustomers) => {
    setCustomers(nextCustomers);

    try {
      const lightweightCustomers = nextCustomers.map((customer) => ({
        id: customer.id || customer._id || null,
        _id: customer._id || customer.id || null,
        name: customer.name,
        firstName: customer.firstName || "",
        lastName: customer.lastName || "",
        email: customer.email,
        phone: customer.phone,
        address: customer.address,
        city: customer.city || "",
        status: customer.status || "active",
        joinedAt: customer.joinedAt || null,
        joinDate: customer.joinDate || customer.joinedAt || null,
        lastActive: customer.lastActive || null,
        totalOrders: customer.totalOrders || 0,
        totalSpent: customer.totalSpent || 0,
        averageOrderValue: customer.averageOrderValue || 0
      }));

      localStorage.setItem(
        "admin_customers",
        JSON.stringify(lightweightCustomers)
      );
    } catch (error) {
      console.warn(
        "Unable to persist lightweight customers:",
        error
      );
    }
  };

  const updateCustomerStatus = (email, status) => {
    const nextCustomers = customers.map((customer) =>
      customer.email === email
        ? { ...customer, status }
        : customer
    );

    persistCustomers(nextCustomers);

    if (selectedCustomer?.email === email) {
      setSelectedCustomer((current) => ({
        ...current,
        status,
      }));
    }

    toast.success(`Customer marked as ${status}.`);
  };

  const viewCustomerDetails = (customer) => {
    setSelectedCustomer(customer);
    setShowDetailsModal(true);
  };

  const openEditModal = (customer) => {
    setEditingCustomer(customer);
    setEditFormData({
      name: customer.name || "",
      email: customer.email || "",
      phone:
        customer.phone === "Not provided"
          ? ""
          : customer.phone || "",
      address:
        customer.address === "Not provided"
          ? ""
          : customer.address || "",
      status: customer.status || "active",
    });
    setShowEditModal(true);
  };

  const updateCustomerInfo = () => {
    const nextCustomers = customers.map((customer) =>
      customer.email === editingCustomer.email
        ? {
            ...customer,
            name: editFormData.name.trim() || customer.name,
            phone:
              editFormData.phone.trim() || "Not provided",
            address:
              editFormData.address.trim() || "Not provided",
            status: editFormData.status,
          }
        : customer
    );

    persistCustomers(nextCustomers);

    // If the admin edited the currently signed-in storefront customer,
    // update that user's local profile too so both sides remain consistent.
    const currentUser = safeJSON(
      localStorage.getItem("user"),
      null
    );

    if (
      currentUser?.email &&
      normalizeEmail(currentUser.email) ===
        normalizeEmail(editingCustomer.email)
    ) {
      const [firstName = "", ...lastNameParts] =
        editFormData.name.trim().split(/\s+/);

      const updatedUser = {
        ...currentUser,
        name: editFormData.name.trim(),
        firstName:
          editFormData.name.trim()
            ? firstName
            : currentUser.firstName,
        lastName:
          editFormData.name.trim()
            ? lastNameParts.join(" ")
            : currentUser.lastName,
        phone:
          editFormData.phone.trim() ||
          currentUser.phone ||
          "",
        address:
          editFormData.address.trim() ||
          currentUser.address ||
          "",
      };

      localStorage.setItem(
        "user",
        JSON.stringify(updatedUser)
      );

      window.dispatchEvent(
        new CustomEvent("profileUpdated", {
          detail: updatedUser,
        })
      );
    }

    toast.success("Customer information updated.");
    setShowEditModal(false);
    setEditingCustomer(null);
  };

  const deleteCustomer = (email, name) => {
    if (
      !window.confirm(
        `Remove ${name} from the admin customer list?`
      )
    ) {
      return;
    }

    const nextCustomers = customers.filter(
      (customer) => customer.email !== email
    );

    persistCustomers(nextCustomers);
    toast.success(`${name} removed from customer list.`);
  };

  const exportCustomers = () => {
    if (!filteredCustomers.length) {
      toast.error("No customers to export.");
      return;
    }

    const rows = filteredCustomers.map((customer) => ({
      Name: customer.name,
      Email: customer.email,
      Phone: customer.phone,
      Address: customer.address,
      Joined: formatDate(customer.joinedAt),
      Orders: customer.totalOrders || 0,
      "Total Spent": parseNumber(customer.totalSpent).toFixed(2),
      "Average Order Value": parseNumber(
        customer.averageOrderValue
      ).toFixed(2),
      Status: customer.status || "active",
    }));

    const escapeCell = (value) =>
      `"${String(value ?? "").replace(/"/g, '""')}"`;

    const headers = Object.keys(rows[0]);

    const csv = [
      headers.map(escapeCell).join(","),
      ...rows.map((row) =>
        headers.map((header) => escapeCell(row[header])).join(",")
      ),
    ].join("\n");

    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `customers_${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;

    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);

    toast.success("Customers exported.");
  };

  /* -------------------------------------------------------------------------- */
  /*                                    UI                                      */
  /* -------------------------------------------------------------------------- */

  const StatCard = ({
    label,
    value,
    icon: Icon,
    iconClass,
    helper,
  }) => (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            {label}
          </p>
          <p className="mt-2 text-2xl font-black text-gray-900 dark:text-white">
            {value}
          </p>
          {helper && (
            <p className="mt-1 text-xs text-gray-400">
              {helper}
            </p>
          )}
        </div>

        <div
          className={`flex h-12 w-12 items-center justify-center rounded-2xl ${iconClass}`}
        >
          <Icon size={22} />
        </div>
      </div>
    </div>
  );

  return (
    <div className="pb-10">
      {/* HEADER */}
      <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-500">
            Customer Management
          </p>
          <h1 className="mt-2 text-3xl font-black text-gray-900 dark:text-white">
            Customers
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            View customer profiles, order history, spend and account status.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={exportCustomers}
            className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          >
            <FiDownload />
            Export
          </button>

          <button
            onClick={loadAllCustomers}
            className="flex items-center gap-2 rounded-xl bg-[#ef5b18] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#d94c0d]"
          >
            <FiRefreshCw />
            Refresh
          </button>
        </div>
      </div>

      {/* STATS */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Customers"
          value={stats.total}
          icon={FiUsers}
          iconClass="bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20"
          helper={`${stats.newThisMonth} joined this month`}
        />

        <StatCard
          label="Total Orders"
          value={stats.totalOrders}
          icon={FiShoppingBag}
          iconClass="bg-blue-50 text-blue-600 dark:bg-blue-900/20"
          helper={`${formatPrice(stats.averageOrderValue)} avg. order`}
        />

        <StatCard
          label="Total Customer Spend"
          value={formatPrice(stats.totalSpent)}
          icon={FiDollarSign}
          iconClass="bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20"
          helper="Cancelled/refunded orders excluded"
        />

        <StatCard
          label="Active Customers"
          value={stats.active}
          icon={FiTrendingUp}
          iconClass="bg-orange-50 text-orange-600 dark:bg-orange-900/20"
          helper={`${stats.blocked} blocked`}
        />
      </div>

      {/* SEARCH / FILTER */}
      <div className="mb-5 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="flex flex-col gap-3 lg:flex-row">
          <div className="relative min-w-0 flex-1">
            <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />

            <input
              value={searchTerm}
              onChange={(event) =>
                setSearchTerm(event.target.value)
              }
              placeholder="Search by name, email, phone or address..."
              className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-11 pr-4 text-sm outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-50 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value)
            }
            className="rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          >
            <option value="all">All status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="blocked">Blocked</option>
          </select>

          <select
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value)}
            className="rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          >
            <option value="newest">Newest customers</option>
            <option value="oldest">Oldest customers</option>
            <option value="spent-high">Highest spend</option>
            <option value="orders-high">Most orders</option>
          </select>
        </div>
      </div>

      {/* TABLE */}
      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
        {filteredCustomers.length === 0 ? (
          <div className="py-20 text-center">
            <FiUsers className="mx-auto h-14 w-14 text-gray-300" />
            <h3 className="mt-4 font-bold text-gray-700 dark:text-gray-200">
              No customers found
            </h3>
            <p className="mt-1 text-sm text-gray-400">
              Try changing your search or filter.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1120px]">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/80 text-left text-xs uppercase tracking-wide text-gray-400 dark:border-gray-700 dark:bg-gray-700/50">
                  <th className="px-5 py-4">Customer</th>
                  <th className="px-5 py-4">Contact</th>
                  <th className="px-5 py-4">Joined</th>
                  <th className="px-5 py-4 text-center">Orders</th>
                  <th className="px-5 py-4">Total Spent</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4 text-center">Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredCustomers.map((customer) => (
                  <tr
                    key={customer.email}
                    className="border-b border-gray-100 transition last:border-0 hover:bg-gray-50/70 dark:border-gray-700 dark:hover:bg-gray-700/40"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-orange-100 to-orange-200 font-black uppercase text-orange-700">
                          {(customer.name?.[0] ||
                            customer.email?.[0] ||
                            "C").toUpperCase()}
                        </div>

                        <div className="min-w-0">
                          <p className="truncate font-bold text-gray-900 dark:text-white">
                            {customer.name}
                          </p>
                          <p className="truncate text-xs text-gray-400">
                            {customer.email}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <p className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
                        <FiPhone className="text-gray-400" />
                        {customer.phone}
                      </p>

                      {customer.address !== "Not provided" && (
                        <p className="mt-1 flex max-w-[250px] items-center gap-2 truncate text-xs text-gray-400">
                          <FiMapPin />
                          {customer.address}
                        </p>
                      )}
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <FiCalendar className="text-gray-400" />
                        <div>
                          <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                            {formatDate(customer.joinedAt)}
                          </p>
                          {customer.joinedAt && (
                            <p className="text-[11px] text-gray-400">
                              Registered
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4 text-center">
                      <span className="inline-flex min-w-9 items-center justify-center rounded-full bg-blue-50 px-2.5 py-1 text-sm font-bold text-blue-700 dark:bg-blue-900/20">
                        {customer.totalOrders || 0}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <p className="text-base font-black text-emerald-600">
                        {formatPrice(customer.totalSpent)}
                      </p>
                      <p className="mt-1 text-[11px] text-gray-400">
                        Avg {formatPrice(customer.averageOrderValue)}
                      </p>
                    </td>

                    <td className="px-5 py-4">
                      <select
                        value={customer.status || "active"}
                        onChange={(event) =>
                          updateCustomerStatus(
                            customer.email,
                            event.target.value
                          )
                        }
                        className={`rounded-full border-0 px-3 py-1.5 text-xs font-bold outline-none ${
                          customer.status === "blocked"
                            ? "bg-red-50 text-red-700"
                            : customer.status === "inactive"
                              ? "bg-gray-100 text-gray-600"
                              : "bg-green-50 text-green-700"
                        }`}
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                        <option value="blocked">Blocked</option>
                      </select>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() =>
                            viewCustomerDetails(customer)
                          }
                          className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-blue-600 transition hover:border-blue-200 hover:bg-blue-50"
                          title="View customer"
                        >
                          <FiEye />
                        </button>

                        <button
                          onClick={() => openEditModal(customer)}
                          className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-emerald-600 transition hover:border-emerald-200 hover:bg-emerald-50"
                          title="Edit customer"
                        >
                          <FiEdit2 />
                        </button>

                        <a
                          href={`mailto:${customer.email}`}
                          className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-purple-600 transition hover:border-purple-200 hover:bg-purple-50"
                          title="Email customer"
                        >
                          <FiMail />
                        </a>

                        <button
                          onClick={() =>
                            deleteCustomer(
                              customer.email,
                              customer.name
                            )
                          }
                          className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-red-500 transition hover:border-red-200 hover:bg-red-50"
                          title="Remove customer"
                        >
                          <FiTrash2 />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CUSTOMER DETAILS */}
      <AnimatePresence>
        {showDetailsModal && selectedCustomer && (
          <motion.div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                setShowDetailsModal(false);
              }
            }}
          >
            <motion.div
              initial={{
                opacity: 0,
                y: 30,
                scale: 0.97,
              }}
              animate={{
                opacity: 1,
                y: 0,
                scale: 1,
              }}
              exit={{
                opacity: 0,
                y: 20,
                scale: 0.98,
              }}
              className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-[28px] bg-white shadow-2xl dark:bg-gray-800"
            >
              {/* Modal Header */}
              <div className="sticky top-0 z-20 flex items-center justify-between border-b border-gray-100 bg-white/95 px-6 py-5 backdrop-blur-xl dark:border-gray-700 dark:bg-gray-800/95">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-500">
                    Customer Profile
                  </p>
                  <h2 className="mt-1 text-2xl font-black text-gray-900 dark:text-white">
                    Customer Details
                  </h2>
                </div>

                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition hover:bg-gray-900 hover:text-white dark:bg-gray-700"
                >
                  <FiX />
                </button>
              </div>

              <div className="p-6">
                {/* Profile card */}
                <div className="rounded-3xl bg-gradient-to-br from-[#111827] to-[#1f2937] p-6 text-white">
                  <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
                    <div className="flex items-center gap-4">
                      <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl bg-white/10 text-3xl font-black uppercase ring-1 ring-white/10">
                        {(selectedCustomer.name?.[0] ||
                          selectedCustomer.email?.[0] ||
                          "C").toUpperCase()}
                      </div>

                      <div>
                        <h3 className="text-2xl font-black">
                          {selectedCustomer.name}
                        </h3>
                        <p className="mt-1 text-sm text-white/60">
                          {selectedCustomer.email}
                        </p>

                        <span
                          className={`mt-3 inline-flex rounded-full px-3 py-1 text-xs font-bold capitalize ${
                            selectedCustomer.status === "blocked"
                              ? "bg-red-500/20 text-red-200"
                              : selectedCustomer.status === "inactive"
                                ? "bg-gray-500/20 text-gray-200"
                                : "bg-green-500/20 text-green-200"
                          }`}
                        >
                          {selectedCustomer.status || "active"}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      <div className="rounded-2xl bg-white/[0.08] px-4 py-3">
                        <p className="text-[10px] uppercase tracking-wide text-white/40">
                          Orders
                        </p>
                        <p className="mt-1 text-xl font-black">
                          {selectedCustomer.totalOrders || 0}
                        </p>
                      </div>

                      <div className="rounded-2xl bg-white/[0.08] px-4 py-3">
                        <p className="text-[10px] uppercase tracking-wide text-white/40">
                          Total Spent
                        </p>
                        <p className="mt-1 text-xl font-black text-emerald-300">
                          {formatPrice(selectedCustomer.totalSpent)}
                        </p>
                      </div>

                      <div className="col-span-2 rounded-2xl bg-white/[0.08] px-4 py-3 sm:col-span-1">
                        <p className="text-[10px] uppercase tracking-wide text-white/40">
                          Avg Order
                        </p>
                        <p className="mt-1 text-xl font-black">
                          {formatPrice(
                            selectedCustomer.averageOrderValue
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Information */}
                <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <InfoCard
                    icon={FiPhone}
                    label="Phone"
                    value={selectedCustomer.phone}
                  />

                  <InfoCard
                    icon={FiCalendar}
                    label="Joined"
                    value={formatDate(
                      selectedCustomer.joinedAt
                    )}
                  />

                  <InfoCard
                    icon={FiClock}
                    label="Last Active"
                    value={formatDateTime(
                      selectedCustomer.lastActive
                    )}
                  />

                  <InfoCard
                    icon={FiMapPin}
                    label="Address"
                    value={selectedCustomer.address}
                  />
                </div>

                {/* Orders */}
                <div className="mt-7">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-black text-gray-900 dark:text-white">
                        Order History
                      </h3>
                      <p className="mt-1 text-xs text-gray-400">
                        All orders currently available for this customer
                      </p>
                    </div>

                    <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-bold text-orange-600">
                      {selectedCustomer.orders?.length || 0} orders
                    </span>
                  </div>

                  {!selectedCustomer.orders?.length ? (
                    <div className="rounded-2xl border border-dashed border-gray-200 py-12 text-center dark:border-gray-700">
                      <FiPackage className="mx-auto h-10 w-10 text-gray-300" />
                      <p className="mt-3 font-semibold text-gray-500">
                        No orders found for this customer.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {[...selectedCustomer.orders]
                        .sort((a, b) => {
                          const aDate =
                            toValidDate(
                              getOrderDateValue(a)
                            )?.getTime() || 0;
                          const bDate =
                            toValidDate(
                              getOrderDateValue(b)
                            )?.getTime() || 0;

                          return bDate - aDate;
                        })
                        .map((order, index) => {
                          const items = getOrderItems(order);
                          const orderTotal = getOrderTotal(order);
                          const orderStatus = getOrderStatus(order);
                          const normalized = normalizeStatus(
                            orderStatus
                          );

                          return (
                            <div
                              key={`${getOrderId(
                                order,
                                index
                              )}-${index}`}
                              className="rounded-2xl border border-gray-100 p-4 dark:border-gray-700"
                            >
                              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                                <div>
                                  <p className="font-mono text-sm font-bold text-gray-900 dark:text-white">
                                    {getOrderId(order, index)}
                                  </p>

                                  <p className="mt-1 flex items-center gap-1.5 text-xs text-gray-400">
                                    <FiCalendar />
                                    {formatDateTime(
                                      getOrderDateValue(order)
                                    )}
                                  </p>
                                </div>

                                <div className="flex items-center gap-3">
                                  <span
                                    className={`rounded-full px-3 py-1 text-xs font-bold capitalize ${
                                      [
                                        "delivered",
                                        "completed",
                                        "paid",
                                      ].includes(normalized)
                                        ? "bg-green-50 text-green-700"
                                        : [
                                              "cancelled",
                                              "canceled",
                                              "refunded",
                                              "failed",
                                            ].includes(normalized)
                                          ? "bg-red-50 text-red-700"
                                          : "bg-amber-50 text-amber-700"
                                    }`}
                                  >
                                    {orderStatus}
                                  </span>

                                  <p className="min-w-[95px] text-right text-base font-black text-gray-900 dark:text-white">
                                    {formatPrice(orderTotal)}
                                  </p>
                                </div>
                              </div>

                              {items.length > 0 && (
                                <div className="mt-4 border-t border-gray-100 pt-3 dark:border-gray-700">
                                  <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-gray-400">
                                    Items
                                  </p>

                                  <div className="space-y-2">
                                    {items
                                      .slice(0, 4)
                                      .map((item, itemIndex) => (
                                        <div
                                          key={item._id || item.id || itemIndex}
                                          className="flex items-center justify-between gap-3 text-sm"
                                        >
                                          <p className="min-w-0 truncate text-gray-600 dark:text-gray-300">
                                            {item.name ||
                                              item.title ||
                                              item.productName ||
                                              item.product?.name ||
                                              "Product"}
                                            <span className="ml-2 text-xs text-gray-400">
                                              ×{" "}
                                              {item.quantity ||
                                                item.qty ||
                                                1}
                                            </span>
                                          </p>

                                          <p className="shrink-0 font-semibold text-gray-700 dark:text-gray-200">
                                            {formatPrice(
                                              parseNumber(
                                                item.price ||
                                                  item.unitPrice ||
                                                  item.salePrice ||
                                                  item.product?.price
                                              ) *
                                                (parseNumber(
                                                  item.quantity ||
                                                    item.qty ||
                                                    1
                                                ) || 1)
                                            )}
                                          </p>
                                        </div>
                                      ))}

                                    {items.length > 4 && (
                                      <p className="text-xs text-gray-400">
                                        +{items.length - 4} more item
                                        {items.length - 4 > 1 ? "s" : ""}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>

                <div className="mt-7 flex flex-col gap-3 border-t border-gray-100 pt-5 sm:flex-row dark:border-gray-700">
                  <button
                    onClick={() => {
                      setShowDetailsModal(false);
                      openEditModal(selectedCustomer);
                    }}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#ef5b18] px-5 py-3 font-bold text-white transition hover:bg-[#d94c0d]"
                  >
                    <FiEdit2 />
                    Edit Customer
                  </button>

                  <a
                    href={`mailto:${selectedCustomer.email}`}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-gray-200 px-5 py-3 font-bold text-gray-700 transition hover:bg-gray-50 dark:border-gray-600 dark:text-white dark:hover:bg-gray-700"
                  >
                    <FiMail />
                    Email Customer
                  </a>

                  <button
                    onClick={() => setShowDetailsModal(false)}
                    className="rounded-xl border border-gray-200 px-6 py-3 font-bold text-gray-500 transition hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700"
                  >
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* EDIT CUSTOMER */}
      <AnimatePresence>
        {showEditModal && editingCustomer && (
          <motion.div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                setShowEditModal(false);
              }
            }}
          >
            <motion.div
              initial={{
                opacity: 0,
                y: 20,
                scale: 0.98,
              }}
              animate={{
                opacity: 1,
                y: 0,
                scale: 1,
              }}
              exit={{
                opacity: 0,
                y: 10,
              }}
              className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl dark:bg-gray-800"
            >
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-orange-500">
                    Customer
                  </p>
                  <h2 className="mt-1 text-2xl font-black dark:text-white">
                    Edit Details
                  </h2>
                </div>

                <button
                  onClick={() => setShowEditModal(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-500 dark:bg-gray-700"
                >
                  <FiX />
                </button>
              </div>

              <div className="space-y-4">
                <FormField label="Name">
                  <input
                    value={editFormData.name}
                    onChange={(event) =>
                      setEditFormData((prev) => ({
                        ...prev,
                        name: event.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-50 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                </FormField>

                <FormField label="Email">
                  <input
                    value={editFormData.email}
                    disabled
                    className="w-full cursor-not-allowed rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-400 dark:border-gray-600 dark:bg-gray-700"
                  />
                </FormField>

                <FormField label="Phone">
                  <input
                    value={editFormData.phone}
                    onChange={(event) =>
                      setEditFormData((prev) => ({
                        ...prev,
                        phone: event.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-50 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                </FormField>

                <FormField label="Address">
                  <textarea
                    rows={3}
                    value={editFormData.address}
                    onChange={(event) =>
                      setEditFormData((prev) => ({
                        ...prev,
                        address: event.target.value,
                      }))
                    }
                    className="w-full resize-none rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-50 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                </FormField>

                <FormField label="Status">
                  <select
                    value={editFormData.status}
                    onChange={(event) =>
                      setEditFormData((prev) => ({
                        ...prev,
                        status: event.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="blocked">Blocked</option>
                  </select>
                </FormField>
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  onClick={updateCustomerInfo}
                  className="flex-1 rounded-xl bg-[#ef5b18] py-3 font-bold text-white transition hover:bg-[#d94c0d]"
                >
                  Save Changes
                </button>

                <button
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 rounded-xl bg-gray-100 py-3 font-bold text-gray-600 transition hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const InfoCard = ({ icon: Icon, label, value }) => (
  <div className="rounded-2xl border border-gray-100 bg-gray-50/60 p-4 dark:border-gray-700 dark:bg-gray-700/30">
    <div className="flex items-start gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-600 dark:bg-orange-900/20">
        <Icon />
      </div>

      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">
          {label}
        </p>
        <p className="mt-1 break-words text-sm font-semibold text-gray-800 dark:text-gray-100">
          {value || "Not provided"}
        </p>
      </div>
    </div>
  </div>
);

const FormField = ({ label, children }) => (
  <div>
    <label className="mb-2 block text-sm font-bold text-gray-700 dark:text-gray-200">
      {label}
    </label>
    {children}
  </div>
);

export default Customers;
