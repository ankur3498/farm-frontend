import React, { useEffect, useState, useCallback } from "react";
import api from "../api/axios.js";
import { useAuth } from "../context/AuthContext.jsx";
import Pagination from "../components/Pagination.jsx";

const CATEGORIES = ["feed", "medicine", "equipment", "other"];

const categoryIcon = {
  feed: "🌾",
  medicine: "💊",
  equipment: "⚙️",
  other: "📦",
};

const PAGE_SIZE = 9;
const emptyItemForm = { name: "", category: "feed", unit: "kg", currentQuantity: 0, reorderLevel: 10 };

const Inventory = () => {
  const { user } = useAuth();
  const isPrivileged = ["admin", "manager_operations"].includes(user?.role);

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [page, setPage] = useState(1);

  // Add / Edit item modal
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyItemForm);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  // Stock Adjustment modal
  const [adjustModal, setAdjustModal] = useState(null); // item object
  const [adjustForm, setAdjustForm] = useState({ operation: "add", amount: 10 });
  const [adjustSubmitting, setAdjustSubmitting] = useState(false);

  const fetchInventory = useCallback(async () => {
    if (!isPrivileged) return;
    setLoading(true);
    setError("");
    try {
      const url = categoryFilter ? `/inventory?category=${categoryFilter}` : "/inventory";
      const res = await api.get(url);
      setItems(res.data.items || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load inventory");
    } finally {
      setLoading(false);
    }
  }, [isPrivileged, categoryFilter]);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  if (!isPrivileged) {
    return (
      <div className="px-4 md:px-8 py-6 md:py-8">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 text-center">
          <p className="text-3xl mb-2">🔒</p>
          <p className="font-medium text-gray-700">Not authorized</p>
          <p className="text-sm text-gray-500 mt-1">Only admin and managers can view Inventory & Stock.</p>
        </div>
      </div>
    );
  }

  const openAddModal = () => {
    setEditingId(null);
    setForm(emptyItemForm);
    setFormError("");
    setShowModal(true);
  };

  const openEditModal = (item) => {
    setEditingId(item._id);
    setForm({
      name: item.name,
      category: item.category,
      unit: item.unit,
      currentQuantity: item.currentQuantity,
      reorderLevel: item.reorderLevel,
    });
    setFormError("");
    setShowModal(true);
  };

  const submitItem = async (e) => {
    e.preventDefault();
    setFormError("");
    setSubmitting(true);
    try {
      if (editingId) {
        await api.put(`/inventory/${editingId}`, form);
      } else {
        await api.post("/inventory", form);
      }
      setShowModal(false);
      fetchInventory();
    } catch (err) {
      setFormError(err.response?.data?.message || "Failed to save item");
    } finally {
      setSubmitting(false);
    }
  };

  const deleteItem = async (item) => {
    if (!confirm(`Delete item "${item.name}"?`)) return;
    try {
      await api.delete(`/inventory/${item._id}`);
      fetchInventory();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to delete item");
    }
  };

  const handleAdjustStock = async (e) => {
    e.preventDefault();
    if (!adjustModal) return;
    setAdjustSubmitting(true);
    try {
      await api.patch(`/inventory/${adjustModal._id}/adjust`, {
        operation: adjustForm.operation,
        amount: Number(adjustForm.amount),
      });
      setAdjustModal(null);
      fetchInventory();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to adjust stock");
    } finally {
      setAdjustSubmitting(false);
    }
  };

  const lowStockCount = items.filter((i) => i.isLowStock || i.currentQuantity <= i.reorderLevel).length;
  const pagedItems = items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="px-4 md:px-8 py-6 md:py-8">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-800">Inventory & Stock</h1>
          <p className="text-sm text-gray-500 mt-0.5">Track feed, medicine, and equipment stock levels</p>
        </div>
        {isPrivileged && (
          <button
            onClick={openAddModal}
            className="bg-farm-600 hover:bg-farm-700 text-white text-sm font-medium rounded-lg px-4 py-2 transition"
          >
            + Add Stock Item
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">{error}</div>
      )}

      {lowStockCount > 0 && (
        <div className="mb-6 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">⚠️</span>
            <div>
              <p className="text-sm font-semibold">{lowStockCount} item(s) running low on stock!</p>
              <p className="text-xs text-amber-700">Stock is below reorder threshold. Restock recommended.</p>
            </div>
          </div>
        </div>
      )}

      {/* Category filter */}
      <div className="flex items-center gap-2 mb-6">
        <button
          onClick={() => { setCategoryFilter(""); setPage(1); }}
          className={`text-xs font-medium px-3 py-1.5 rounded-full transition ${
            !categoryFilter ? "bg-farm-600 text-white" : "bg-white border border-gray-300 text-gray-600 hover:bg-gray-50"
          }`}
        >
          All Items ({items.length})
        </button>
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => { setCategoryFilter(cat); setPage(1); }}
            className={`text-xs font-medium px-3 py-1.5 rounded-full capitalize transition ${
              categoryFilter === cat ? "bg-farm-600 text-white" : "bg-white border border-gray-300 text-gray-600 hover:bg-gray-50"
            }`}
          >
            {categoryIcon[cat]} {cat}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center text-gray-400 py-12">Loading inventory...</div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-10 text-center text-gray-400">
          No inventory items found.
        </div>
      ) : (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            {pagedItems.map((item) => {
              const isLow = item.isLowStock || item.currentQuantity <= item.reorderLevel;
              return (
                <div key={item._id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{categoryIcon[item.category] || "📦"}</span>
                        <div>
                          <p className="font-semibold text-gray-800 text-base">{item.name}</p>
                          <p className="text-xs text-gray-400 capitalize">{item.category}</p>
                        </div>
                      </div>
                      {isLow ? (
                        <span className="text-xs font-semibold bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                          Low Stock ⚠️
                        </span>
                      ) : (
                        <span className="text-xs font-semibold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                          In Stock ✓
                        </span>
                      )}
                    </div>

                    <div className="my-4 bg-gray-50 border border-gray-100 rounded-lg p-3 flex items-center justify-between">
                      <div>
                        <p className="text-xs text-gray-400">Current Quantity</p>
                        <p className="text-2xl font-bold text-gray-800">
                          {item.currentQuantity} <span className="text-sm font-normal text-gray-500">{item.unit}</span>
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-400">Reorder Alert At</p>
                        <p className="text-sm font-medium text-gray-600">{item.reorderLevel} {item.unit}</p>
                      </div>
                    </div>
                  </div>

                  {isPrivileged && (
                    <div className="flex gap-2 pt-2 border-t border-gray-100">
                      <button
                        onClick={() => { setAdjustModal(item); setAdjustForm({ operation: "add", amount: 10 }); }}
                        className="flex-1 bg-farm-50 hover:bg-farm-100 text-farm-700 text-xs font-semibold rounded-lg py-2 transition"
                      >
                        ⚡ Adjust Stock
                      </button>
                      <button
                        onClick={() => openEditModal(item)}
                        className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium px-3 py-2 rounded-lg transition"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteItem(item)}
                        className="bg-red-50 hover:bg-red-100 text-red-600 text-xs font-medium px-3 py-2 rounded-lg transition"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <Pagination page={page} totalItems={items.length} pageSize={PAGE_SIZE} onChange={setPage} />
        </>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center px-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800">{editingId ? "Edit Item" : "Add Inventory Item"}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
            </div>

            {formError && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">{formError}</div>
            )}

            <form onSubmit={submitItem} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Item Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Cattle Feed, Dewormer Medicine"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-farm-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 capitalize focus:outline-none focus:ring-2 focus:ring-farm-500"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Unit</label>
                  <input
                    type="text"
                    required
                    placeholder="kg, litre, pcs, etc."
                    value={form.unit}
                    onChange={(e) => setForm({ ...form, unit: e.target.value })}
                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-farm-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Current Stock Quantity</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={form.currentQuantity}
                    onChange={(e) => setForm({ ...form, currentQuantity: e.target.value })}
                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-farm-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Reorder Alert Level</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={form.reorderLevel}
                    onChange={(e) => setForm({ ...form, reorderLevel: e.target.value })}
                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-farm-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-farm-600 hover:bg-farm-700 disabled:opacity-60 text-white font-medium rounded-lg py-2.5 text-sm mt-3 transition"
              >
                {submitting ? "Saving..." : editingId ? "Save Changes" : "Create Item"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Adjust Stock Modal */}
      {adjustModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center px-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-gray-800">Adjust Stock — {adjustModal.name}</h2>
              <button onClick={() => setAdjustModal(null)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
            </div>
            <p className="text-xs text-gray-500 mb-4">
              Current quantity: <span className="font-semibold text-gray-700">{adjustModal.currentQuantity} {adjustModal.unit}</span>
            </p>

            <form onSubmit={handleAdjustStock} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Action</label>
                <select
                  value={adjustForm.operation}
                  onChange={(e) => setAdjustForm({ ...adjustForm, operation: e.target.value })}
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-farm-500"
                >
                  <option value="add">➕ Add Stock (Restock)</option>
                  <option value="deduct">➖ Deduct Stock (Used/Damaged)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Quantity ({adjustModal.unit})</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={adjustForm.amount}
                  onChange={(e) => setAdjustForm({ ...adjustForm, amount: e.target.value })}
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-farm-500"
                />
              </div>

              <button
                type="submit"
                disabled={adjustSubmitting}
                className="w-full bg-farm-600 hover:bg-farm-700 disabled:opacity-60 text-white font-medium rounded-lg py-2.5 text-sm mt-3 transition"
              >
                {adjustSubmitting ? "Updating..." : "Update Stock Quantity"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;
