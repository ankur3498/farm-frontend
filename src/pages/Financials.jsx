import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import api from "../api/axios.js";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  Clock,
  PieChart,
  Calendar,
  User,
  Filter,
  Search,
  Lock,
  ArrowUpRight,
  ArrowDownRight,
  ShieldAlert,
} from "lucide-react";

const SALES_STORAGE_KEY = "dewals_farm_sales_v1";
const EXPENSE_STORAGE_KEY = "dewals_farm_expenses_v1";

const DEFAULT_SALES = [
  {
    id: "sale-101",
    _id: "sale-101",
    title: "Layer Hen Egg Wholesale Batch",
    category: "Poultry & Eggs",
    amount: 45000,
    date: "2026-09-24",
    buyer: "City Fresh Supermarket",
    status: "paid",
    paymentMethod: "Bank Transfer",
    invoiceNo: "INV-2026-001",
    notes: "500 Trays of fresh A-grade eggs.",
  },
  {
    id: "sale-102",
    _id: "sale-102",
    title: "Organic Wheat Grain Harvest",
    category: "Crop Produce",
    amount: 120000,
    date: "2026-09-26",
    buyer: "Green Harvest Agro Traders",
    status: "paid",
    paymentMethod: "UPI / Online",
    invoiceNo: "INV-2026-002",
    notes: "4.5 Tons organic wheat grain sold.",
  },
  {
    id: "sale-103",
    _id: "sale-103",
    title: "Goat Kids & Livestock Batch",
    category: "Goat & Livestock",
    amount: 35000,
    date: "2026-09-28",
    buyer: "Venkatesh Livestock Farm",
    status: "pending",
    paymentMethod: "Bank Transfer",
    invoiceNo: "INV-2026-003",
    notes: "5 Male Barbari goats sold for breeding.",
  },
];

const CATEGORIES = [
  "Poultry & Eggs",
  "Goat & Livestock",
  "Crop Produce",
  "Dairy & Milk",
  "Organic Fertilizer & Manure",
  "Equipment Rental",
  "Services & Other",
];

export default function Financials() {
  const { user } = useAuth();
  const isAdminOrManager = ["admin", "manager_operations"].includes(user?.role);

  const [sales, setSales] = useState(() => {
    const saved = localStorage.getItem(SALES_STORAGE_KEY);
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return DEFAULT_SALES;
  });

  const [expenses, setExpenses] = useState(() => {
    const saved = localStorage.getItem(EXPENSE_STORAGE_KEY);
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return [];
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSale, setEditingSale] = useState(null);

  // Form state
  const [form, setForm] = useState({
    title: "",
    category: CATEGORIES[0],
    amount: "",
    date: new Date().toISOString().split("T")[0],
    buyer: "",
    status: "paid",
    paymentMethod: "Bank Transfer",
    invoiceNo: `INV-${Date.now().toString().slice(-4)}`,
    notes: "",
  });

  // Fetch Sales & Financial Summary from Backend API
  const fetchSalesData = useCallback(async () => {
    try {
      const res = await api.get("/financials/sales");
      if (res.data?.sales) {
        setSales(res.data.sales);
        localStorage.setItem(SALES_STORAGE_KEY, JSON.stringify(res.data.sales));
      }
    } catch (err) {
      console.warn("Could not fetch backend sales:", err.message);
    }
  }, []);

  const fetchExpensesData = useCallback(async () => {
    try {
      const res = await api.get("/expenses");
      if (res.data?.expenses) {
        setExpenses(res.data.expenses);
      }
    } catch (err) {
      console.warn("Could not fetch backend expenses for financials:", err.message);
    }
  }, []);

  useEffect(() => {
    if (isAdminOrManager) {
      fetchSalesData();
      fetchExpensesData();
    }
  }, [isAdminOrManager, fetchSalesData, fetchExpensesData]);

  useEffect(() => {
    localStorage.setItem(SALES_STORAGE_KEY, JSON.stringify(sales));
  }, [sales]);

  if (!isAdminOrManager) {
    return (
      <div className="px-4 py-12 max-w-lg mx-auto text-center">
        <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-md space-y-3">
          <ShieldAlert className="w-12 h-12 text-red-500 mx-auto" />
          <h2 className="text-xl font-bold text-gray-900">Restricted Access</h2>
          <p className="text-xs text-gray-500 leading-relaxed">
            The Financials and Sales section is available exclusively to Farm Managers and Operations Admins.
          </p>
        </div>
      </div>
    );
  }

  // Handle Save / Edit Sale
  const handleSaveSale = async (e) => {
    e.preventDefault();
    if (!form.title || !form.amount) return;

    const payload = {
      title: form.title.trim(),
      category: form.category,
      amount: parseFloat(form.amount),
      date: form.date,
      buyer: form.buyer.trim(),
      status: form.status,
      paymentMethod: form.paymentMethod,
      invoiceNo: form.invoiceNo,
      notes: form.notes.trim(),
    };

    if (editingSale) {
      const saleId = editingSale._id || editingSale.id;
      try {
        await api.put(`/financials/sales/${saleId}`, payload);
      } catch (err) {
        console.warn("Backend offline, updating sale locally:", err.message);
      }
      setSales((prev) =>
        prev.map((s) => ((s._id === saleId || s.id === saleId) ? { ...s, ...payload } : s))
      );
    } else {
      try {
        const res = await api.post("/financials/sales", payload);
        if (res.data?.sale) {
          setSales([res.data.sale, ...sales]);
        }
      } catch (err) {
        console.warn("Backend offline, saving sale locally:", err.message);
        const newSale = {
          _id: `sale-${Date.now()}`,
          id: `sale-${Date.now()}`,
          ...payload,
          createdAt: new Date().toISOString(),
        };
        setSales([newSale, ...sales]);
      }
    }

    setIsModalOpen(false);
    setEditingSale(null);
    resetForm();
  };

  const resetForm = () => {
    setForm({
      title: "",
      category: CATEGORIES[0],
      amount: "",
      date: new Date().toISOString().split("T")[0],
      buyer: "",
      status: "paid",
      paymentMethod: "Bank Transfer",
      invoiceNo: `INV-${Date.now().toString().slice(-4)}`,
      notes: "",
    });
  };

  const openEditModal = (sale) => {
    setEditingSale(sale);
    setForm({ ...sale });
    setIsModalOpen(true);
  };

  const handleDelete = async (sale) => {
    const id = sale._id || sale.id;
    if (confirm("Are you sure you want to delete this sale record?")) {
      try {
        await api.delete(`/financials/sales/${id}`);
      } catch (err) {
        console.warn("Backend offline, deleting sale locally:", err.message);
      }
      setSales((prev) => prev.filter((s) => (s._id || s.id) !== id));
    }
  };

  const toggleStatus = async (sale) => {
    const id = sale._id || sale.id;
    const newStatus = sale.status === "paid" ? "pending" : "paid";
    try {
      await api.put(`/financials/sales/${id}`, { status: newStatus });
    } catch (err) {
      console.warn("Backend offline, updating status locally:", err.message);
    }
    setSales((prev) =>
      prev.map((s) => ((s._id === id || s.id === id) ? { ...s, status: newStatus } : s))
    );
  };

  // Calculations
  const totalRevenue = sales.filter((s) => s.status === "paid").reduce((sum, s) => sum + (s.amount || 0), 0);
  const pendingReceivables = sales.filter((s) => s.status === "pending").reduce((sum, s) => sum + (s.amount || 0), 0);
  const totalPaidExpenses = expenses.filter((e) => e.status === "paid" || e.status === "approved").reduce((sum, e) => sum + (e.amount || 0), 0);
  const netProfit = totalRevenue - totalPaidExpenses;

  // Filtered Sales
  const filteredSales = sales.filter((s) => {
    const matchesCategory = categoryFilter === "all" || s.category === categoryFilter;
    const matchesStatus = statusFilter === "all" || s.status === statusFilter;
    const matchesSearch =
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.buyer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.invoiceNo && s.invoiceNo.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesCategory && matchesStatus && matchesSearch;
  });

  return (
    <div className="px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-5 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-emerald-600" />
            Financials & Sales Management
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Track farm sales revenues, pending receivables, and net profitability via backend API.
          </p>
        </div>

        <button
          onClick={() => {
            resetForm();
            setEditingSale(null);
            setIsModalOpen(true);
          }}
          className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-md transition flex items-center justify-center gap-2 active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Record New Sale</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-emerald-500 text-white p-4 rounded-2xl shadow-md relative overflow-hidden">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-emerald-100">Total Sales Revenue</p>
            <TrendingUp className="w-4 h-4 text-emerald-200" />
          </div>
          <p className="text-xl sm:text-3xl font-extrabold mt-2">₹{totalRevenue.toLocaleString()}</p>
          <span className="text-[10px] text-emerald-100/90 mt-1 block">
            {sales.filter((s) => s.status === "paid").length} Settled Sales
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between text-gray-500">
            <p className="text-xs font-semibold">Total Farm Expenses</p>
            <TrendingDown className="w-4 h-4 text-red-500" />
          </div>
          <p className="text-xl sm:text-3xl font-extrabold text-gray-900 mt-2">₹{totalPaidExpenses.toLocaleString()}</p>
          <span className="text-[10px] text-gray-400 mt-1 block">Approved/Paid Outflow</span>
        </div>

        <div className={`p-4 rounded-2xl border shadow-sm ${
          netProfit >= 0 ? "bg-emerald-50 border-emerald-200 text-emerald-900" : "bg-red-50 border-red-200 text-red-900"
        }`}>
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold">Net Profit / Balance</p>
            {netProfit >= 0 ? <ArrowUpRight className="w-4 h-4 text-emerald-600" /> : <ArrowDownRight className="w-4 h-4 text-red-600" />}
          </div>
          <p className="text-xl sm:text-3xl font-extrabold mt-2">₹{netProfit.toLocaleString()}</p>
          <span className="text-[10px] font-medium mt-1 block opacity-80">Revenue minus Expenses</span>
        </div>

        <div className="bg-amber-50 p-4 rounded-2xl border border-amber-200 shadow-sm">
          <div className="flex items-center justify-between text-amber-800">
            <p className="text-xs font-semibold">Pending Receivables</p>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-xl sm:text-3xl font-extrabold text-amber-900 mt-2">₹{pendingReceivables.toLocaleString()}</p>
          <span className="text-[10px] text-amber-700 mt-1 block">Uncollected Invoices</span>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-3 sm:p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search sale title, buyer name, invoice #..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-gray-50 border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-xs sm:text-sm focus:outline-none focus:border-emerald-600 focus:bg-white transition"
          />
        </div>

        <div className="flex gap-2">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-gray-50 border border-gray-300 text-xs rounded-lg px-3 py-2 focus:outline-none"
          >
            <option value="all">All Categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-gray-50 border border-gray-300 text-xs rounded-lg px-3 py-2 focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="paid">Paid</option>
            <option value="pending">Pending</option>
          </select>
        </div>
      </div>

      {/* Sales Transactions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredSales.length === 0 ? (
          <div className="col-span-full bg-white p-8 text-center rounded-2xl border border-gray-200">
            <DollarSign className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="font-semibold text-gray-700 text-sm">No sales records found</p>
            <p className="text-xs text-gray-400 mt-1">Record a sale to track revenues.</p>
          </div>
        ) : (
          filteredSales.map((sale) => (
            <div
              key={sale._id || sale.id}
              className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition overflow-hidden flex flex-col justify-between"
            >
              <div>
                <div className="p-4 border-b border-gray-100">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="inline-block bg-emerald-50 text-emerald-800 text-[10px] font-semibold px-2 py-0.5 rounded-md border border-emerald-200 mb-1">
                        {sale.category}
                      </span>
                      <h3 className="font-bold text-gray-900 text-sm sm:text-base leading-snug">
                        {sale.title}
                      </h3>
                    </div>

                    <button
                      onClick={() => toggleStatus(sale)}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-bold capitalize shrink-0 transition border ${
                        sale.status === "paid"
                          ? "bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-200"
                          : "bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-200"
                      }`}
                      title="Click to toggle payment status"
                    >
                      {sale.status === "paid" ? "Paid 🟢" : "Pending 🟡"}
                    </button>
                  </div>

                  <p className="text-xl font-extrabold text-emerald-700 mt-2">
                    ₹{sale.amount.toLocaleString()}
                  </p>
                </div>

                <div className="p-4 space-y-2 text-xs text-gray-600">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1 text-gray-500">
                      <User className="w-3.5 h-3.5" /> Customer / Buyer:
                    </span>
                    <span className="font-bold text-gray-900">{sale.buyer}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1 text-gray-500">
                      <Calendar className="w-3.5 h-3.5" /> Date:
                    </span>
                    <span className="font-medium text-gray-700">{sale.date ? new Date(sale.date).toLocaleDateString() : "Today"}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Payment Mode:</span>
                    <span className="font-semibold text-gray-800">{sale.paymentMethod}</span>
                  </div>

                  {sale.invoiceNo && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Invoice No:</span>
                      <span className="font-mono text-gray-700 bg-gray-100 px-2 py-0.5 rounded text-[11px]">
                        {sale.invoiceNo}
                      </span>
                    </div>
                  )}

                  {sale.notes && (
                    <p className="bg-gray-50 p-2 rounded-lg border border-gray-100 text-[11px] text-gray-600">
                      "{sale.notes}"
                    </p>
                  )}
                </div>
              </div>

              <div className="p-3 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-1">
                <button
                  onClick={() => openEditModal(sale)}
                  className="p-1.5 text-gray-600 hover:text-emerald-600 rounded-lg hover:bg-gray-200 transition"
                  title="Edit sale"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(sale)}
                  className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-gray-200 transition"
                  title="Delete sale"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Record / Edit Sale Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-600" />
                {editingSale ? "Edit Sale Record" : "Record New Farm Sale"}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400">✕</button>
            </div>

            <form onSubmit={handleSaveSale} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-gray-700 block mb-1">Sale Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Poultry Egg Wholesale Batch"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">Category</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-emerald-600 focus:outline-none"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-gray-700 block mb-1">Amount (₹) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="e.g. 45000"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-emerald-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">Buyer / Customer *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. City Fresh Supermarket"
                    value={form.buyer}
                    onChange={(e) => setForm({ ...form, buyer: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-emerald-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-semibold text-gray-700 block mb-1">Sale Date</label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-emerald-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">Payment Method</label>
                  <select
                    value={form.paymentMethod}
                    onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-emerald-600 focus:outline-none"
                  >
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="UPI / Online">UPI / Mobile Payment</option>
                    <option value="Cash">Cash</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-gray-700 block mb-1">Payment Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-emerald-600 focus:outline-none"
                  >
                    <option value="paid">Paid</option>
                    <option value="pending">Pending</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-gray-700 block mb-1">Invoice Number</label>
                <input
                  type="text"
                  value={form.invoiceNo}
                  onChange={(e) => setForm({ ...form, invoiceNo: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-gray-700 block mb-1">Notes</label>
                <textarea
                  rows="2"
                  placeholder="Additional notes about produce quality or delivery..."
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-xl text-xs font-bold shadow-md"
                >
                  {editingSale ? "Update Sale" : "Record Sale"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
