import React, { useEffect, useState, useCallback } from "react";
import api from "../api/axios.js";
import { useAuth } from "../context/AuthContext.jsx";

const CATEGORIES = ["Equipment", "Vehicle", "Tool", "Electronics", "Other"];

const CATEGORY_ICON = {
  Equipment: "⚙️",
  Vehicle: "🚜",
  Tool: "🔧",
  Electronics: "🔌",
  Other: "📦",
};

const IST = "Asia/Kolkata";
const fmtDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: IST }) : "—";
const fmtTime = (iso) =>
  iso ? new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", timeZone: IST }) : "—";
const roleLabel = (role) => (role || "").split("_").map((w) => w[0]?.toUpperCase() + w.slice(1)).join(" ");

const inspectionBadge = {
  overdue: { label: "Overdue", style: "bg-red-100 text-red-700" },
  "due-soon": { label: "Due Soon", style: "bg-yellow-100 text-yellow-700" },
  ok: { label: "OK", style: "bg-green-100 text-green-700" },
};

const emptyForm = { name: "", category: "Equipment", responsiblePerson: "" };

const Assets = () => {
  const { user } = useAuth();
  const isPrivileged = ["admin", "manager_operations"].includes(user?.role);

  const [assets, setAssets] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [photoFile, setPhotoFile] = useState(null);
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [historyModal, setHistoryModal] = useState(null); // asset object
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const fetchAssets = useCallback(async () => {
    if (!isPrivileged) return;
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/assets");
      setAssets(res.data.assets || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load assets");
    } finally {
      setLoading(false);
    }
  }, [isPrivileged]);

  useEffect(() => {
    if (!isPrivileged) return;
    fetchAssets();
    api.get("/users").then((res) => setStaffList(res.data.users || [])).catch(() => {});
  }, [isPrivileged, fetchAssets]);

  const openAddModal = () => {
    setEditingId(null);
    setForm(emptyForm);
    setPhotoFile(null);
    setFormError("");
    setShowModal(true);
  };

  const openEditModal = (asset) => {
    setEditingId(asset._id);
    setForm({
      name: asset.name,
      category: asset.category,
      responsiblePerson: asset.responsiblePerson?._id || "",
    });
    setPhotoFile(null);
    setFormError("");
    setShowModal(true);
  };

  const submitAsset = async (e) => {
    e.preventDefault();
    setFormError("");
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("name", form.name);
      formData.append("category", form.category);
      formData.append("responsiblePerson", form.responsiblePerson);
      if (photoFile) formData.append("photo", photoFile);

      if (editingId) {
        await api.put(`/assets/${editingId}`, formData);
      } else {
        await api.post("/assets", formData);
      }
      setShowModal(false);
      fetchAssets();
    } catch (err) {
      setFormError(err.response?.data?.message || "Failed to save asset");
    } finally {
      setSubmitting(false);
    }
  };

  const removeAsset = async (asset) => {
    if (!confirm(`Remove "${asset.name}"? This won't delete its past inspection history.`)) return;
    try {
      await api.delete(`/assets/${asset._id}`);
      fetchAssets();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to remove asset");
    }
  };

  const openHistory = async (asset) => {
    setHistoryModal(asset);
    setHistoryLoading(true);
    try {
      const res = await api.get(`/assets/${asset._id}/history`);
      setHistory(res.data.history || []);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to load history");
    } finally {
      setHistoryLoading(false);
    }
  };

  if (!isPrivileged) {
    return (
      <div className="px-4 md:px-8 py-6 md:py-8">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 text-center">
          <p className="text-3xl mb-2">🔒</p>
          <p className="font-medium text-gray-700">Not authorized</p>
          <p className="text-sm text-gray-500 mt-1">Only admin and managers can view Assets.</p>
        </div>
      </div>
    );
  }

  const activeCategories = categoryFilter ? [categoryFilter] : CATEGORIES;

  return (
    <div className="px-4 md:px-8 py-6 md:py-8">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-800">Assets Directory</h1>
          <p className="text-sm text-gray-500 mt-0.5">Categorized view — equipment, vehicles, tools, and electronics</p>
        </div>
        {isPrivileged && (
          <button onClick={openAddModal} className="bg-farm-600 hover:bg-farm-700 text-white text-sm font-medium rounded-lg px-4 py-2 transition">
            + Add Asset
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">{error}</div>
      )}

      {/* Category Filter Buttons */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <button
          onClick={() => setCategoryFilter("")}
          className={`text-xs font-medium px-3.5 py-1.5 rounded-full transition ${
            !categoryFilter ? "bg-farm-600 text-white" : "bg-white border border-gray-300 text-gray-600 hover:bg-gray-50"
          }`}
        >
          All Categories ({assets.length})
        </button>
        {CATEGORIES.map((c) => {
          const count = assets.filter((a) => a.category === c).length;
          return (
            <button
              key={c}
              onClick={() => setCategoryFilter(c)}
              className={`text-xs font-medium px-3.5 py-1.5 rounded-full transition ${
                categoryFilter === c ? "bg-farm-600 text-white" : "bg-white border border-gray-300 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {CATEGORY_ICON[c]} {c} ({count})
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="text-center text-gray-400 py-12">Loading assets...</div>
      ) : assets.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-10 text-center text-gray-400">
          No assets registered yet.
        </div>
      ) : (
        /* Render Row-Wise Category Sections */
        activeCategories.map((cat) => {
          const categoryAssets = assets.filter((a) => a.category === cat);
          if (categoryFilter && categoryAssets.length === 0) return null;

          return (
            <div key={cat} className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{CATEGORY_ICON[cat]}</span>
                  <h2 className="font-semibold text-gray-800 text-lg">{cat}</h2>
                  <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-0.5 rounded-full font-medium">
                    {categoryAssets.length} asset{categoryAssets.length !== 1 ? "s" : ""}
                  </span>
                </div>
              </div>

              {categoryAssets.length === 0 ? (
                <p className="text-xs text-gray-400 py-3 italic">No items registered under {cat}.</p>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {categoryAssets.map((asset) => {
                    const badge = inspectionBadge[asset.inspectionStatus] || inspectionBadge.ok;
                    return (
                      <div key={asset._id} className="border border-gray-200 rounded-xl overflow-hidden hover:border-gray-300 transition">
                        <div className="h-32 bg-gray-100 flex items-center justify-center">
                          {asset.photoUrl ? (
                            <img src={asset.photoUrl} alt={asset.name} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-4xl">{CATEGORY_ICON[asset.category] || "📦"}</span>
                          )}
                        </div>
                        <div className="p-4">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <p className="font-semibold text-gray-800 text-base">{asset.name}</p>
                            <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full shrink-0 ${badge.style}`}>{badge.label}</span>
                          </div>
                          <p className="text-xs text-gray-500 mb-2">
                            Responsible: <span className="font-medium text-gray-700">{asset.responsiblePerson?.name || "— unassigned —"}</span>
                          </p>
                          <p className="text-xs text-gray-400 mb-3">Next inspection: {fmtDate(asset.inspectionDueDate)}</p>
                          <div className="flex gap-2">
                            <button onClick={() => openHistory(asset)} className="flex-1 text-xs font-medium px-3 py-1.5 rounded-lg bg-gray-50 text-gray-600 hover:bg-gray-100 transition">
                              History
                            </button>
                            {isPrivileged && (
                              <>
                                <button onClick={() => openEditModal(asset)} className="flex-1 text-xs font-medium px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition">
                                  Edit
                                </button>
                                <button onClick={() => removeAsset(asset)} className="text-xs font-medium px-3 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition">
                                  ✕
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })
      )}

      {/* Add/Edit modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center px-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800">{editingId ? "Edit Asset" : "Add Asset"}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
            </div>

            {formError && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">{formError}</div>
            )}

            <form onSubmit={submitAsset} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Item Name</label>
                <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-farm-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-farm-500">
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Responsible Person</label>
                <select value={form.responsiblePerson} onChange={(e) => setForm({ ...form, responsiblePerson: e.target.value })}
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-farm-500">
                  <option value="">— Unassigned —</option>
                  {staffList.map((s) => <option key={s._id} value={s._id}>{s.name} ({roleLabel(s.role)})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Photo {editingId ? "(leave blank to keep current)" : ""}</label>
                <input type="file" accept="image/*" onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-farm-500" />
              </div>
              <button type="submit" disabled={submitting}
                className="w-full bg-farm-600 hover:bg-farm-700 disabled:opacity-60 text-white font-medium rounded-lg py-2.5 text-sm mt-2 transition">
                {submitting ? "Saving..." : editingId ? "Save Changes" : "Add Asset"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Inspection history modal */}
      {historyModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center px-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-lg font-semibold text-gray-800">{historyModal.name} — Inspection History</h2>
              <button onClick={() => setHistoryModal(null)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
            </div>
            <p className="text-xs text-gray-500 mb-4">Weekly inspection tasks generated for this asset, most recent first.</p>

            {historyLoading ? (
              <p className="text-sm text-gray-400 text-center py-6">Loading...</p>
            ) : history.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">No inspections yet</p>
            ) : (
              <div className="space-y-3">
                {history.map((h) => (
                  <div key={h._id} className="border border-gray-200 rounded-lg p-3">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <p className="text-sm font-medium text-gray-800">{fmtDate(h.date)}</p>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        h.status === "approved" ? "bg-green-100 text-green-700" :
                        h.status === "declined" ? "bg-red-100 text-red-700" :
                        h.status === "submitted" ? "bg-yellow-100 text-yellow-700" :
                        "bg-gray-100 text-gray-500"
                      }`}>
                        {h.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">By {h.assignedTo?.name || "—"}</p>
                    {h.completedAt && <p className="text-xs text-gray-400">Submitted {fmtTime(h.completedAt)}</p>}
                    {h.proof?.photoUrl && (
                      <div className="flex gap-3 mt-2">
                        <a href={h.proof.photoUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline">View photo</a>
                        {h.proof?.videoUrl && <a href={h.proof.videoUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline">View video</a>}
                      </div>
                    )}
                    {h.review?.note && <p className="text-xs text-red-600 mt-1">Note: {h.review.note}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Assets;
