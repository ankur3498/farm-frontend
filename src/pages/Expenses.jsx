import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import api from "../api/axios.js";
import {
  Receipt,
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  CreditCard,
  DollarSign,
  FileText,
  Filter,
  Search,
  Eye,
  Trash2,
  Upload,
  Calendar,
  User,
  Tag,
  AlertCircle,
  Image as ImageIcon,
} from "lucide-react";

const STORAGE_KEY = "dewals_farm_expenses_v1";

const DEFAULT_EXPENSES = [
  {
    id: "exp-101",
    _id: "exp-101",
    title: "Organic Fertilizer & Compost",
    category: "Fertilizers & Seeds",
    amount: 14500,
    date: "2026-09-25",
    submittedByName: "Ramesh Kumar",
    status: "paid",
    notes: "50 bags of organic compost for North Plot preparation.",
    billUrl: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=600&q=80",
    paymentMode: "UPI / Online",
    paymentRef: "UPI9823471029",
  },
  {
    id: "exp-102",
    _id: "exp-102",
    title: "Poultry Feed & Layer Pellets",
    category: "Feed & Livestock",
    amount: 28000,
    date: "2026-09-27",
    submittedByName: "Suresh Patel",
    status: "approved",
    notes: "Monthly feed supply for Hen House B.",
    billUrl: "https://images.unsplash.com/photo-1554224154-26032ffc0d07?auto=format&fit=crop&w=600&q=80",
  },
  {
    id: "exp-103",
    _id: "exp-103",
    title: "Tractor Fuel & Diesel Refill",
    category: "Fuel & Utilities",
    amount: 8500,
    date: "2026-09-28",
    submittedByName: "Anita Singh",
    status: "pending",
    notes: "100 Liters diesel for field plowing.",
    billUrl: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=600&q=80",
  },
];

const CATEGORIES = [
  "Feed & Livestock",
  "Equipment & Machinery",
  "Fuel & Utilities",
  "Fertilizers & Seeds",
  "Labor & Wages",
  "Repairs & Maintenance",
  "Medical & Veterinary",
  "Miscellaneous",
];

export default function Expenses() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [expenses, setExpenses] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return DEFAULT_EXPENSES;
  });

  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [previewBillUrl, setPreviewBillUrl] = useState(null);
  const [payingExpense, setPayingExpense] = useState(null);

  // Form State
  const [form, setForm] = useState({
    title: "",
    category: CATEGORIES[0],
    amount: "",
    date: new Date().toISOString().split("T")[0],
    notes: "",
    billUrl: "",
  });

  // Payment Form State
  const [payForm, setPayForm] = useState({
    paymentMode: "UPI / Online",
    paymentRef: "",
    paymentNotes: "",
  });

  // Fetch Expenses from API
  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/expenses");
      if (res.data?.expenses) {
        setExpenses(res.data.expenses);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(res.data.expenses));
      }
    } catch (err) {
      console.warn("Backend API unavailable, using local state:", err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  // Save changes to localStorage as fallback
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
  }, [expenses]);

  // Add Expense
  const handleAddExpense = async (e) => {
    e.preventDefault();
    if (!form.title || !form.amount) return;

    const payload = {
      title: form.title.trim(),
      category: form.category,
      amount: parseFloat(form.amount),
      date: form.date,
      notes: form.notes.trim(),
      billUrl: form.billUrl || "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=600&q=80",
    };

    try {
      const res = await api.post("/expenses", payload);
      if (res.data?.expense) {
        setExpenses([res.data.expense, ...expenses]);
      }
    } catch (err) {
      console.warn("Backend offline, saving locally:", err.message);
      const localExp = {
        _id: `exp-${Date.now()}`,
        id: `exp-${Date.now()}`,
        ...payload,
        submittedByName: user?.name || "Staff Member",
        status: "pending",
      };
      setExpenses([localExp, ...expenses]);
    }

    setIsAddModalOpen(false);
    setForm({
      title: "",
      category: CATEGORIES[0],
      amount: "",
      date: new Date().toISOString().split("T")[0],
      notes: "",
      billUrl: "",
    });
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setForm((prev) => ({ ...prev, billUrl: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Approve Expense
  const handleApprove = async (exp) => {
    const id = exp._id || exp.id;
    try {
      await api.put(`/expenses/${id}/approve`);
    } catch (err) {
      console.warn("Backend offline, approving locally:", err.message);
    }

    setExpenses((prev) =>
      prev.map((item) =>
        (item._id === id || item.id === id)
          ? { ...item, status: "approved", approvedByName: user?.name || "Admin" }
          : item
      )
    );
  };

  // Reject Expense
  const handleReject = async (exp) => {
    const id = exp._id || exp.id;
    const reason = prompt("Enter reason for rejecting this expense:");
    if (reason === null) return;

    try {
      await api.put(`/expenses/${id}/reject`, { reason });
    } catch (err) {
      console.warn("Backend offline, rejecting locally:", err.message);
    }

    setExpenses((prev) =>
      prev.map((item) =>
        (item._id === id || item.id === id)
          ? { ...item, status: "rejected", rejectionReason: reason || "Rejected" }
          : item
      )
    );
  };

  // Confirm Payment
  const handleConfirmPayment = async (e) => {
    e.preventDefault();
    if (!payingExpense) return;
    const id = payingExpense._id || payingExpense.id;

    try {
      await api.put(`/expenses/${id}/pay`, payForm);
    } catch (err) {
      console.warn("Backend offline, paying locally:", err.message);
    }

    setExpenses((prev) =>
      prev.map((item) =>
        (item._id === id || item.id === id)
          ? {
              ...item,
              status: "paid",
              paymentMode: payForm.paymentMode,
              paymentRef: payForm.paymentRef || "N/A",
            }
          : item
      )
    );

    setPayingExpense(null);
    setPayForm({ paymentMode: "UPI / Online", paymentRef: "", paymentNotes: "" });
  };

  // Delete Expense
  const handleDelete = async (exp) => {
    const id = exp._id || exp.id;
    if (confirm("Are you sure you want to delete this expense record?")) {
      try {
        await api.delete(`/expenses/${id}`);
      } catch (err) {
        console.warn("Backend offline, deleting locally:", err.message);
      }
      setExpenses((prev) => prev.filter((i) => (i._id || i.id) !== id));
    }
  };

  // Filtered Expenses
  const filteredExpenses = expenses.filter((item) => {
    const matchesStatus = statusFilter === "all" || item.status === statusFilter;
    const matchesCategory = categoryFilter === "all" || item.category === categoryFilter;
    const submittedName = item.submittedByName || item.submittedBy || "";
    const matchesSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      submittedName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.notes && item.notes.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesStatus && matchesCategory && matchesSearch;
  });

  const totalAmount = expenses.reduce((sum, item) => sum + (item.amount || 0), 0);
  const pendingAmount = expenses.filter((i) => i.status === "pending").reduce((sum, item) => sum + (item.amount || 0), 0);
  const approvedUnpaidAmount = expenses.filter((i) => i.status === "approved").reduce((sum, item) => sum + (item.amount || 0), 0);
  const paidAmount = expenses.filter((i) => i.status === "paid").reduce((sum, item) => sum + (item.amount || 0), 0);

  return (
    <div className="px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-5 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Receipt className="w-6 h-6 text-farm-600" />
            Expenses & Bill Management
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Submit farm expense bills, request approval, and track payouts via API & local state.
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="w-full sm:w-auto bg-farm-600 hover:bg-farm-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-md transition flex items-center justify-center gap-2 active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Expense</span>
        </button>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <p className="text-xs font-medium text-gray-500">Total Expenses</p>
          <p className="text-lg sm:text-2xl font-bold text-gray-900 mt-1">₹{totalAmount.toLocaleString()}</p>
          <span className="text-[10px] text-gray-400 mt-0.5 block">{expenses.length} Records</span>
        </div>

        <div className="bg-amber-50/70 p-4 rounded-xl border border-amber-200 shadow-sm">
          <p className="text-xs font-medium text-amber-800 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" /> Pending Review
          </p>
          <p className="text-lg sm:text-2xl font-bold text-amber-900 mt-1">₹{pendingAmount.toLocaleString()}</p>
          <span className="text-[10px] text-amber-700 mt-0.5 block">{expenses.filter((i) => i.status === "pending").length} Pending</span>
        </div>

        <div className="bg-blue-50/70 p-4 rounded-xl border border-blue-200 shadow-sm">
          <p className="text-xs font-medium text-blue-800 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> Approved (Unpaid)
          </p>
          <p className="text-lg sm:text-2xl font-bold text-blue-900 mt-1">₹{approvedUnpaidAmount.toLocaleString()}</p>
          <span className="text-[10px] text-blue-700 mt-0.5 block">Ready for Payout</span>
        </div>

        <div className="bg-emerald-50/70 p-4 rounded-xl border border-emerald-200 shadow-sm">
          <p className="text-xs font-medium text-emerald-800 flex items-center gap-1">
            <CreditCard className="w-3.5 h-3.5" /> Total Paid
          </p>
          <p className="text-lg sm:text-2xl font-bold text-emerald-900 mt-1">₹{paidAmount.toLocaleString()}</p>
          <span className="text-[10px] text-emerald-700 mt-0.5 block">Settled Bills</span>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-3 sm:p-4 rounded-xl border border-gray-200 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search expenses, title, user..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-50 border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-xs sm:text-sm focus:outline-none focus:border-farm-600 focus:bg-white transition"
            />
          </div>

          <div className="flex gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {["all", "pending", "approved", "paid", "rejected"].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize whitespace-nowrap transition ${
                  statusFilter === st ? "bg-farm-600 text-white shadow-sm" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Expense List / Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredExpenses.length === 0 ? (
          <div className="col-span-full bg-white p-8 text-center rounded-2xl border border-gray-200">
            <Receipt className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="font-semibold text-gray-700 text-sm">No expenses found</p>
            <p className="text-xs text-gray-400 mt-1">Try adjusting your search or filter.</p>
          </div>
        ) : (
          filteredExpenses.map((exp) => (
            <div
              key={exp._id || exp.id}
              className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition overflow-hidden flex flex-col justify-between"
            >
              <div>
                <div className="p-4 border-b border-gray-100">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="inline-block bg-farm-50 text-farm-800 text-[10px] font-semibold px-2 py-0.5 rounded-md border border-farm-200 mb-1">
                        {exp.category}
                      </span>
                      <h3 className="font-bold text-gray-900 text-sm sm:text-base leading-snug">
                        {exp.title}
                      </h3>
                    </div>

                    <span
                      className={`px-2.5 py-1 rounded-full text-[11px] font-bold capitalize shrink-0 border ${
                        exp.status === "paid"
                          ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                          : exp.status === "approved"
                          ? "bg-blue-100 text-blue-800 border-blue-300"
                          : exp.status === "pending"
                          ? "bg-amber-100 text-amber-800 border-amber-300"
                          : "bg-red-100 text-red-800 border-red-300"
                      }`}
                    >
                      {exp.status === "paid" ? "Paid 💳" : exp.status === "approved" ? "Approved 🟢" : exp.status === "pending" ? "Pending 🟡" : "Rejected ❌"}
                    </span>
                  </div>

                  <p className="text-xl font-extrabold text-gray-900 mt-2">
                    ₹{exp.amount.toLocaleString()}
                  </p>
                </div>

                <div className="p-4 space-y-2 text-xs text-gray-600">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1 text-gray-500">
                      <User className="w-3.5 h-3.5" /> Submitted by:
                    </span>
                    <span className="font-semibold text-gray-800">{exp.submittedByName || exp.submittedBy || "Staff"}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1 text-gray-500">
                      <Calendar className="w-3.5 h-3.5" /> Date:
                    </span>
                    <span className="font-medium text-gray-700">{exp.date ? new Date(exp.date).toLocaleDateString() : "Today"}</span>
                  </div>

                  {exp.notes && (
                    <p className="bg-gray-50 p-2 rounded-lg border border-gray-100 text-[11px] text-gray-600 line-clamp-2">
                      "{exp.notes}"
                    </p>
                  )}

                  {exp.status === "paid" && (
                    <div className="bg-emerald-50/80 p-2.5 rounded-lg border border-emerald-200 text-[11px] space-y-1">
                      <p className="font-semibold text-emerald-900 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Paid via {exp.paymentMode || "UPI / Online"}
                      </p>
                      {exp.paymentRef && <p className="text-emerald-700">Ref: {exp.paymentRef}</p>}
                    </div>
                  )}

                  {exp.status === "rejected" && exp.rejectionReason && (
                    <div className="bg-red-50 p-2 rounded-lg border border-red-200 text-[11px] text-red-700">
                      Reason: {exp.rejectionReason}
                    </div>
                  )}
                </div>
              </div>

              <div className="p-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between gap-2">
                {exp.billUrl ? (
                  <button
                    onClick={() => setPreviewBillUrl(exp.billUrl)}
                    className="flex items-center gap-1.5 text-xs text-farm-700 hover:text-farm-900 font-semibold bg-white border border-gray-200 px-2.5 py-1.5 rounded-lg shadow-sm transition"
                  >
                    <ImageIcon className="w-3.5 h-3.5 text-farm-600" />
                    <span>View Bill</span>
                  </button>
                ) : (
                  <span className="text-[11px] text-gray-400 italic">No bill attached</span>
                )}

                <div className="flex items-center gap-1.5">
                  {isAdmin && exp.status === "pending" && (
                    <>
                      <button
                        onClick={() => handleApprove(exp)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold px-2.5 py-1.5 rounded-lg shadow-sm transition"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleReject(exp)}
                        className="bg-red-50 hover:bg-red-100 text-red-700 text-[11px] font-semibold px-2 py-1.5 rounded-lg border border-red-200 transition"
                      >
                        Reject
                      </button>
                    </>
                  )}

                  {isAdmin && exp.status === "approved" && (
                    <button
                      onClick={() => setPayingExpense(exp)}
                      className="bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg shadow-sm transition flex items-center gap-1"
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      Mark as Paid
                    </button>
                  )}

                  {isAdmin && (
                    <button
                      onClick={() => handleDelete(exp)}
                      className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-gray-200 transition"
                      title="Delete expense"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Expense Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
                <Receipt className="w-5 h-5 text-farm-600" />
                Submit New Farm Expense
              </h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-gray-400">✕</button>
            </div>

            <form onSubmit={handleAddExpense} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-gray-700 block mb-1">Expense Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Tractor Repair, Poultry Feed Batch"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-farm-600 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">Category</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-farm-600 focus:outline-none"
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
                    placeholder="e.g. 5000"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-farm-600 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-gray-700 block mb-1">Date</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-farm-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-gray-700 block mb-1">Description / Notes</label>
                <textarea
                  rows="2"
                  placeholder="Provide brief details about this expense..."
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-farm-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-gray-700 block mb-1">Upload Bill / Receipt Photo</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="w-full text-xs text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-farm-50 file:text-farm-700"
                />

                {form.billUrl && (
                  <div className="mt-2 relative w-24 h-24 rounded-lg overflow-hidden border border-gray-300">
                    <img src={form.billUrl} alt="Bill Preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, billUrl: "" })}
                      className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-0.5 text-[10px]"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-farm-600 text-white py-2 rounded-xl text-xs font-semibold hover:bg-farm-700 shadow-md"
                >
                  Submit Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Mark as Paid Modal */}
      {payingExpense && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-600" />
                Mark Expense as Paid
              </h3>
              <button onClick={() => setPayingExpense(null)} className="text-gray-400">✕</button>
            </div>

            <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 text-xs space-y-1">
              <p className="font-bold text-gray-900 text-sm">{payingExpense.title}</p>
              <p className="text-gray-600">
                Amount: <strong className="text-emerald-700">₹{payingExpense.amount.toLocaleString()}</strong>
              </p>
            </div>

            <form onSubmit={handleConfirmPayment} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-gray-700 block mb-1">Payment Method</label>
                <select
                  value={payForm.paymentMode}
                  onChange={(e) => setPayForm({ ...payForm, paymentMode: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-emerald-600 focus:outline-none"
                >
                  <option value="UPI / Online">UPI / Mobile Payment</option>
                  <option value="Bank Transfer">Bank Transfer (NEFT/IMPS)</option>
                  <option value="Cash">Cash Payment</option>
                  <option value="Cheque">Cheque</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-gray-700 block mb-1">Transaction Reference ID (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. UPI Ref #9812739182"
                  value={payForm.paymentRef}
                  onChange={(e) => setPayForm({ ...payForm, paymentRef: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPayingExpense(null)}
                  className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-xl text-xs font-bold shadow-md"
                >
                  Confirm Paid
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bill Preview Modal */}
      {previewBillUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setPreviewBillUrl(null)}
        >
          <div className="relative max-w-2xl max-h-[90vh] bg-white rounded-2xl p-2 shadow-2xl overflow-hidden">
            <button
              onClick={() => setPreviewBillUrl(null)}
              className="absolute top-3 right-3 bg-black/60 text-white p-2 rounded-full hover:bg-black transition z-10"
            >
              ✕
            </button>
            <img src={previewBillUrl} alt="Bill Receipt" className="w-full max-h-[85vh] object-contain rounded-xl" />
          </div>
        </div>
      )}
    </div>
  );
}
