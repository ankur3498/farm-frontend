import React, { useEffect, useState, useCallback } from "react";
import api from "../api/axios.js";
import { useAuth } from "../context/AuthContext.jsx";
import Pagination from "../components/Pagination.jsx";

const PAGE_SIZE = 10;
const IST = "Asia/Kolkata";

const fmtDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: IST }) : "—";
const fmtDateInput = (d) => {
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, "0"), day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const emptyBatchForm = { name: "", breed: "", dateOfHatch: fmtDateInput(new Date()), chicksReceived: "", assignedTo: "" };
const emptyRecordForm = { date: fmtDateInput(new Date()), mortality: "0", culls: "0", feedKg: "", eggCount: "", bodyWeightGms: "", remarks: "" };

const getPhase = (ageDay) => {
  if (ageDay <= 28) return { label: "Brooding", icon: "🐣", style: "bg-blue-100 text-blue-700" };
  if (ageDay <= 140) return { label: "Growing", icon: "🐤", style: "bg-amber-100 text-amber-700" };
  return { label: "Laying", icon: "🥚", style: "bg-green-100 text-green-700" };
};

const survivalStyle = (pct) => {
  if (pct >= 95) return "text-green-600";
  if (pct >= 90) return "text-amber-600";
  return "text-red-600";
};

const CardSkeleton = () => (
  <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 animate-pulse">
    <div className="h-4 bg-gray-200 rounded w-2/3 mb-3" />
    <div className="h-3 bg-gray-100 rounded w-1/2 mb-4" />
    <div className="grid grid-cols-2 gap-3">
      <div className="h-8 bg-gray-100 rounded" />
      <div className="h-8 bg-gray-100 rounded" />
      <div className="h-8 bg-gray-100 rounded" />
      <div className="h-8 bg-gray-100 rounded" />
    </div>
  </div>
);

const Poultry = () => {
  const { user } = useAuth();
  const isPrivileged = ["admin", "manager_operations"].includes(user?.role);
  const now = new Date();

  const [batches, setBatches] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedBatch, setSelectedBatch] = useState(null);
  const [records, setRecords] = useState([]);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [page, setPage] = useState(1);

  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [batchForm, setBatchForm] = useState(emptyBatchForm);
  const [batchSubmitting, setBatchSubmitting] = useState(false);
  const [batchError, setBatchError] = useState("");

  const [recordModalOpen, setRecordModalOpen] = useState(false);
  const [recordForm, setRecordForm] = useState(emptyRecordForm);
  const [photoFile, setPhotoFile] = useState(null);
  const [videoFile, setVideoFile] = useState(null);
  const [recordSubmitting, setRecordSubmitting] = useState(false);
  const [recordError, setRecordError] = useState("");
  const [editingRecordId, setEditingRecordId] = useState(null);

  // Media Modal for proof viewing
  const [mediaModal, setMediaModal] = useState(null);

  const fetchStaff = useCallback(async () => {
    try {
      const res = await api.get("/users");
      setStaffList(res.data.users || []);
    } catch (err) {
      // non-critical
    }
  }, []);

  useEffect(() => { fetchStaff(); }, [fetchStaff]);

  const fetchBatches = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/poultry/batches");
      setBatches(res.data.batches || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load batches");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchBatches(); }, [fetchBatches]);

  const fetchRecords = useCallback(async (batchId) => {
    if (!batchId) return;
    setRecordsLoading(true);
    try {
      const res = await api.get(`/poultry/batches/${batchId}/records`);
      setRecords(res.data.records || []);
      setPage(1);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load records");
    } finally {
      setRecordsLoading(false);
    }
  }, []);

  const openBatch = (batch) => {
    setSelectedBatch(batch);
    fetchRecords(batch._id);
  };

  const refreshAll = async () => {
    await fetchBatches();
    if (selectedBatch) fetchRecords(selectedBatch._id);
  };

  // Keep the open detail view's header numbers fresh after edits
  useEffect(() => {
    if (selectedBatch) {
      const fresh = batches.find((b) => b._id === selectedBatch._id);
      if (fresh) setSelectedBatch(fresh);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batches]);

  // ---- Batch CRUD ----
  const submitBatch = async (e) => {
    e.preventDefault();
    setBatchError("");
    setBatchSubmitting(true);
    try {
      await api.post("/poultry/batches", batchForm);
      setBatchModalOpen(false);
      setBatchForm(emptyBatchForm);
      fetchBatches();
    } catch (err) {
      setBatchError(err.response?.data?.message || "Failed to create batch");
    } finally {
      setBatchSubmitting(false);
    }
  };

  const removeBatch = async (batch) => {
    if (!confirm(`Remove "${batch.name}"? All its daily records will be deleted too.`)) return;
    try {
      await api.delete(`/poultry/batches/${batch._id}`);
      if (selectedBatch?._id === batch._id) setSelectedBatch(null);
      fetchBatches();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to remove batch");
    }
  };

  // ---- Record CRUD ----
  const openAddRecord = () => {
    setEditingRecordId(null);
    setRecordForm({ ...emptyRecordForm, date: fmtDateInput(now) });
    setPhotoFile(null);
    setVideoFile(null);
    setRecordError("");
    setRecordModalOpen(true);
  };

  const openEditRecord = (record) => {
    setEditingRecordId(record._id);
    setRecordForm({
      date: fmtDateInput(new Date(record.date)),
      mortality: String(record.mortality),
      culls: String(record.culls),
      feedKg: String(record.feedKg),
      eggCount: record.eggCount ?? "",
      bodyWeightGms: record.bodyWeightGms ?? "",
      remarks: record.remarks || "",
    });
    setPhotoFile(null);
    setVideoFile(null);
    setRecordError("");
    setRecordModalOpen(true);
  };

  const submitRecord = async (e) => {
    e.preventDefault();
    setRecordError("");
    setRecordSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("date", recordForm.date);
      formData.append("mortality", Number(recordForm.mortality) || 0);
      formData.append("culls", Number(recordForm.culls) || 0);
      formData.append("feedKg", Number(recordForm.feedKg) || 0);
      if (recordForm.eggCount !== "") formData.append("eggCount", Number(recordForm.eggCount));
      if (recordForm.bodyWeightGms !== "") formData.append("bodyWeightGms", Number(recordForm.bodyWeightGms));
      formData.append("remarks", recordForm.remarks || "");

      if (photoFile) formData.append("photo", photoFile);
      if (videoFile) formData.append("video", videoFile);

      if (editingRecordId) {
        await api.put(`/poultry/records/${editingRecordId}`, formData);
      } else {
        await api.post(`/poultry/batches/${selectedBatch._id}/records`, formData);
      }
      setRecordModalOpen(false);
      refreshAll();
    } catch (err) {
      setRecordError(err.response?.data?.message || "Failed to save record");
    } finally {
      setRecordSubmitting(false);
    }
  };

  const removeRecord = async (record) => {
    if (!confirm(`Remove the ${fmtDate(record.date)} record?`)) return;
    try {
      await api.delete(`/poultry/records/${record._id}`);
      refreshAll();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to remove record");
    }
  };

  const pagedRecords = records.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const todayStr = fmtDateInput(now);

  return (
    <div className="px-4 md:px-8 py-6 md:py-8">
      {!selectedBatch ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <div>
              <h1 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                <span className="text-2xl">🐔</span> Hen & Chicken
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">Track every flock from day-old chick to full lay</p>
            </div>
            {isPrivileged && (
              <button onClick={() => { setBatchForm(emptyBatchForm); setBatchError(""); setBatchModalOpen(true); }}
                className="bg-farm-600 hover:bg-farm-700 text-white text-sm font-medium rounded-lg px-4 py-2.5 transition shadow-sm">
                + New Batch
              </button>
            )}
          </div>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">{error}</div>
          )}

          {loading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => <CardSkeleton key={i} />)}
            </div>
          ) : batches.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center">
              <p className="text-5xl mb-3">🐣</p>
              <p className="font-medium text-gray-700 mb-1">No batches yet</p>
              <p className="text-sm text-gray-500 mb-4">Start your first flock to begin tracking brooding, growing and laying.</p>
              {isPrivileged && (
                <button onClick={() => { setBatchForm(emptyBatchForm); setBatchModalOpen(true); }}
                  className="bg-farm-600 hover:bg-farm-700 text-white text-sm font-medium rounded-lg px-5 py-2.5 transition">
                  + Create your first batch
                </button>
              )}
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {batches.map((b) => {
                const phase = getPhase(b.ageDay);
                const survivalPct = b.chicksReceived > 0 ? Math.round((b.currentStock / b.chicksReceived) * 1000) / 10 : 0;
                return (
                  <div key={b._id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition">
                    <div onClick={() => openBatch(b)} className="p-5 cursor-pointer">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-semibold text-gray-800">{b.name}</p>
                          <p className="text-xs text-gray-400">{b.breed || "Mixed breed"}</p>
                          <p className="text-[11px] text-gray-500 font-medium mt-0.5">👤 Assigned: <span className="text-gray-700 font-semibold">{b.assignedTo?.name || "Manager Operations"}</span></p>
                        </div>
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full shrink-0 ${phase.style}`}>
                          {phase.icon} {phase.label}
                        </span>
                      </div>

                      <div className="flex items-baseline gap-2 mb-1 mt-3">
                        <span className="text-2xl font-bold text-gray-800">{b.currentStock.toLocaleString("en-IN")}</span>
                        <span className="text-xs text-gray-400">birds · Day {b.ageDay}</span>
                      </div>
                      <div className="flex items-center gap-1.5 mb-4">
                        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${survivalPct >= 95 ? "bg-green-500" : survivalPct >= 90 ? "bg-amber-500" : "bg-red-500"}`}
                            style={{ width: `${Math.min(100, survivalPct)}%` }}
                          />
                        </div>
                        <span className={`text-xs font-medium ${survivalStyle(survivalPct)}`}>{survivalPct}% alive</span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-center border-t border-gray-100 pt-3">
                        <div>
                          <p className="text-sm font-semibold text-red-600">{b.totalMortality + b.totalCulls}</p>
                          <p className="text-[10px] text-gray-400 uppercase tracking-wide">Lost</p>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-700">{b.totalFeedKg}</p>
                          <p className="text-[10px] text-gray-400 uppercase tracking-wide">Kg Feed</p>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-farm-700">{b.avgProductionPercent != null ? `${b.avgProductionPercent}%` : "—"}</p>
                          <p className="text-[10px] text-gray-400 uppercase tracking-wide">Avg Lay</p>
                        </div>
                      </div>
                    </div>
                    <div className="border-t border-gray-100 px-5 py-2.5 flex items-center justify-between bg-gray-50">
                      <span className="text-xs text-gray-400">
                        {b.lastRecordDate ? `Updated ${fmtDate(b.lastRecordDate)}` : "No entries yet"}
                      </span>
                      {isPrivileged && (
                        <button onClick={(e) => { e.stopPropagation(); removeBatch(b); }} className="text-xs text-gray-400 hover:text-red-600 transition">
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      ) : (
        <>
          <button onClick={() => setSelectedBatch(null)} className="text-sm text-gray-500 hover:text-gray-700 mb-4 flex items-center gap-1">
            ← Back to Batches
          </button>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-6">
            <div className="px-6 py-5 bg-gradient-to-r from-farm-600 to-farm-700 flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-white font-semibold text-lg">🐔 {selectedBatch.name}</h1>
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${getPhase(selectedBatch.ageDay).style}`}>
                    {getPhase(selectedBatch.ageDay).icon} {getPhase(selectedBatch.ageDay).label}
                  </span>
                </div>
                <p className="text-farm-100 text-xs mt-1">{selectedBatch.breed || "Mixed breed"} · Hatched {fmtDate(selectedBatch.dateOfHatch)} · Age Day {selectedBatch.ageDay}</p>
              </div>
              <div className="text-right">
                <p className="text-farm-100 text-xs">Current Stock</p>
                <p className="text-white text-2xl font-bold">{selectedBatch.currentStock.toLocaleString("en-IN")}</p>
                <p className="text-farm-100 text-xs">
                  of {selectedBatch.chicksReceived.toLocaleString("en-IN")} received
                </p>
              </div>
            </div>
            <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center sm:text-left">
                <p className="text-xs text-gray-400 mb-0.5">Mortality + Culls</p>
                <p className="text-lg font-semibold text-red-600">{selectedBatch.totalMortality + selectedBatch.totalCulls}</p>
              </div>
              <div className="text-center sm:text-left">
                <p className="text-xs text-gray-400 mb-0.5">Total Feed</p>
                <p className="text-lg font-semibold text-gray-700">{selectedBatch.totalFeedKg} kg</p>
              </div>
              <div className="text-center sm:text-left">
                <p className="text-xs text-gray-400 mb-0.5">Total Eggs</p>
                <p className="text-lg font-semibold text-gray-700">{selectedBatch.totalEggs.toLocaleString("en-IN")}</p>
              </div>
              <div className="text-center sm:text-left">
                <p className="text-xs text-gray-400 mb-0.5">Avg Production</p>
                <p className="text-lg font-semibold text-farm-700">{selectedBatch.avgProductionPercent != null ? `${selectedBatch.avgProductionPercent}%` : "—"}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-700">Daily Records</h3>
            <button onClick={openAddRecord} className="bg-farm-600 hover:bg-farm-700 text-white text-sm font-medium rounded-lg px-4 py-2 transition shadow-sm">
              + Add Today's Entry
            </button>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[900px]">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-left text-gray-500">
                    <th className="sticky left-0 z-10 bg-gray-50 px-3 py-2.5 font-medium">Date</th>
                    <th className="px-3 py-2.5 font-medium">Age</th>
                    <th className="px-3 py-2.5 font-medium">Open</th>
                    <th className="px-3 py-2.5 font-medium">Mort.</th>
                    <th className="px-3 py-2.5 font-medium">Culls</th>
                    <th className="px-3 py-2.5 font-medium">Closing</th>
                    <th className="px-3 py-2.5 font-medium">Feed (kg)</th>
                    <th className="px-3 py-2.5 font-medium">Feed/Bird</th>
                    <th className="px-3 py-2.5 font-medium">Eggs</th>
                    <th className="px-3 py-2.5 font-medium">Prod %</th>
                    <th className="px-3 py-2.5 font-medium">Body Wt</th>
                    <th className="px-3 py-2.5 font-medium">Proof</th>
                    <th className="px-3 py-2.5 font-medium">Remarks</th>
                    {isPrivileged && <th className="px-3 py-2.5 font-medium text-right">Action</th>}
                  </tr>
                </thead>
                <tbody>
                  {recordsLoading ? (
                    <tr><td colSpan={14} className="px-4 py-10 text-center text-gray-400">Loading records...</td></tr>
                  ) : pagedRecords.length === 0 ? (
                    <tr>
                      <td colSpan={14} className="px-4 py-10 text-center text-gray-400">
                        <p className="text-3xl mb-2">📋</p>
                        No records yet — add today's entry to get started
                      </td>
                    </tr>
                  ) : (
                    pagedRecords.map((r) => {
                      const isToday = fmtDateInput(new Date(r.date)) === todayStr;
                      return (
                        <tr key={r._id} className={`border-b border-gray-100 last:border-0 hover:bg-gray-50 transition ${isToday ? "bg-farm-50/40" : ""}`}>
                          <td className="sticky left-0 z-10 bg-white px-3 py-2 text-gray-700 font-medium">
                            {fmtDate(r.date)} {isToday && <span className="text-[10px] text-farm-600 font-normal">· today</span>}
                          </td>
                          <td className="px-3 py-2 text-gray-500">{r.ageDay}</td>
                          <td className="px-3 py-2 text-gray-600">{r.openStock}</td>
                          <td className="px-3 py-2 text-red-600">{r.mortality || "—"}</td>
                          <td className="px-3 py-2 text-gray-600">{r.culls || "—"}</td>
                          <td className="px-3 py-2 font-medium text-gray-800">{r.closingStock}</td>
                          <td className="px-3 py-2 text-gray-600">{r.feedKg}</td>
                          <td className="px-3 py-2 text-gray-600">{r.feedPerBirdGms}g</td>
                          <td className="px-3 py-2 text-gray-600">{r.eggCount ?? "—"}</td>
                          <td className="px-3 py-2 text-farm-700 font-medium">{r.eggProductionPercent != null ? `${r.eggProductionPercent}%` : "—"}</td>
                          <td className="px-3 py-2 text-gray-600">{r.bodyWeightGms != null ? `${r.bodyWeightGms}g` : "—"}</td>
                          <td className="px-3 py-2">
                            {r.proof && (r.proof.photoUrl || r.proof.videoUrl) ? (
                              <div className="flex items-center gap-1">
                                {r.proof.photoUrl && (
                                  <button
                                    type="button"
                                    onClick={() => setMediaModal({ photoUrl: r.proof.photoUrl, videoUrl: r.proof.videoUrl, title: `${selectedBatch.name} — ${fmtDate(r.date)}` })}
                                    className="bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded text-[10px] font-medium hover:bg-amber-100"
                                  >
                                    📷
                                  </button>
                                )}
                                {r.proof.videoUrl && (
                                  <button
                                    type="button"
                                    onClick={() => setMediaModal({ photoUrl: r.proof.photoUrl, videoUrl: r.proof.videoUrl, title: `${selectedBatch.name} — ${fmtDate(r.date)}` })}
                                    className="bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.5 rounded text-[10px] font-medium hover:bg-blue-100"
                                  >
                                    🎥
                                  </button>
                                )}
                              </div>
                            ) : (
                              <span className="text-gray-300">—</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-gray-500 max-w-[160px] truncate" title={r.remarks}>{r.remarks || "—"}</td>
                          {isPrivileged && (
                            <td className="px-3 py-2 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button onClick={() => openEditRecord(r)} className="text-xs font-medium px-2 py-1 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition">Edit</button>
                                <button onClick={() => removeRecord(r)} className="text-xs font-medium px-2 py-1 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition">✕</button>
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            {!recordsLoading && records.length > 0 && (
              <Pagination page={page} totalItems={records.length} pageSize={PAGE_SIZE} onChange={setPage} />
            )}
          </div>
        </>
      )}

      {/* New Batch modal */}
      {batchModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center px-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-lg font-semibold text-gray-800">🐣 New Batch</h2>
              <button onClick={() => setBatchModalOpen(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
            </div>
            <p className="text-xs text-gray-500 mb-4">Start tracking a new flock from day one.</p>
            {batchError && <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">{batchError}</div>}
            <form onSubmit={submitBatch} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Batch Name</label>
                <input required placeholder="e.g. Batch A - IB H120" value={batchForm.name} onChange={(e) => setBatchForm({ ...batchForm, name: e.target.value })}
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-farm-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Breed (optional)</label>
                <input placeholder="e.g. IB H120, BV300" value={batchForm.breed} onChange={(e) => setBatchForm({ ...batchForm, breed: e.target.value })}
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-farm-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Date of Hatch</label>
                  <input type="date" required value={batchForm.dateOfHatch} onChange={(e) => setBatchForm({ ...batchForm, dateOfHatch: e.target.value })}
                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-farm-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Chicks Received</label>
                  <input type="number" required min="0" placeholder="e.g. 10400" value={batchForm.chicksReceived} onChange={(e) => setBatchForm({ ...batchForm, chicksReceived: e.target.value })}
                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-farm-500" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Assigned Person (Default: Manager)</label>
                <select
                  value={batchForm.assignedTo}
                  onChange={(e) => setBatchForm({ ...batchForm, assignedTo: e.target.value })}
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-farm-500"
                >
                  <option value="">Manager Operations (Default Manager)</option>
                  {staffList.map((s) => (
                    <option key={s._id} value={s._id}>{s.name} ({s.role})</option>
                  ))}
                </select>
              </div>
              <button type="submit" disabled={batchSubmitting}
                className="w-full bg-farm-600 hover:bg-farm-700 disabled:opacity-60 text-white font-medium rounded-lg py-2.5 text-sm mt-2 transition">
                {batchSubmitting ? "Creating..." : "Create Batch"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Add/Edit Record modal */}
      {recordModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center px-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-lg font-semibold text-gray-800">{editingRecordId ? "✏️ Edit Record" : "📋 Add Today's Entry"}</h2>
              <button onClick={() => setRecordModalOpen(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
            </div>
            <p className="text-xs text-gray-500 mb-4">
              {editingRecordId ? "Adjust the numbers for this day." : "Open stock carries forward automatically from yesterday's closing stock."}
            </p>
            {recordError && <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">{recordError}</div>}
            <form onSubmit={submitRecord} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Date</label>
                <input type="date" required disabled={!!editingRecordId} value={recordForm.date} onChange={(e) => setRecordForm({ ...recordForm, date: e.target.value })}
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-farm-500 disabled:bg-gray-100" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">💀 Mortality</label>
                  <input type="number" min="0" value={recordForm.mortality} onChange={(e) => setRecordForm({ ...recordForm, mortality: e.target.value })}
                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-farm-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">✂️ Culls</label>
                  <input type="number" min="0" value={recordForm.culls} onChange={(e) => setRecordForm({ ...recordForm, culls: e.target.value })}
                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-farm-500" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">🌾 Feed Used (kg)</label>
                <input type="number" step="0.1" min="0" value={recordForm.feedKg} onChange={(e) => setRecordForm({ ...recordForm, feedKg: e.target.value })}
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-farm-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">🥚 Eggs</label>
                  <input type="number" min="0" placeholder="if laying" value={recordForm.eggCount} onChange={(e) => setRecordForm({ ...recordForm, eggCount: e.target.value })}
                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-farm-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">⚖️ Body Wt (g)</label>
                  <input type="number" min="0" placeholder="optional" value={recordForm.bodyWeightGms} onChange={(e) => setRecordForm({ ...recordForm, bodyWeightGms: e.target.value })}
                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-farm-500" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">📝 Remarks</label>
                <input placeholder="e.g. MD Vaccination, Debeaking" value={recordForm.remarks} onChange={(e) => setRecordForm({ ...recordForm, remarks: e.target.value })}
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-farm-500" />
              </div>

              {/* Photo & Video Proof Upload */}
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 space-y-2">
                <p className="text-xs font-semibold text-gray-700 mb-1">📸 Photo & 🎥 Video Proof Upload</p>
                <div>
                  <label className="block text-[11px] text-gray-600 mb-0.5">📷 Photo Proof</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
                    className="w-full text-xs border border-gray-300 rounded-md p-1 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-gray-600 mb-0.5">🎥 Video Proof</label>
                  <input
                    type="file"
                    accept="video/*"
                    onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
                    className="w-full text-xs border border-gray-300 rounded-md p-1 bg-white"
                  />
                </div>
              </div>

              <button type="submit" disabled={recordSubmitting}
                className="w-full bg-farm-600 hover:bg-farm-700 disabled:opacity-60 text-white font-medium rounded-lg py-2.5 text-sm mt-2 transition">
                {recordSubmitting ? "Uploading & Saving..." : editingRecordId ? "Save Changes" : "Add Entry"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Media Player Modal */}
      {mediaModal && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-800 text-sm">{mediaModal.title}</h3>
              <button onClick={() => setMediaModal(null)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
            </div>
            <div className="p-5 overflow-y-auto space-y-4">
              {mediaModal.photoUrl && (
                <div>
                  <p className="text-xs font-semibold text-gray-700 mb-1">📷 Photo Proof:</p>
                  <img src={mediaModal.photoUrl} alt="Poultry photo proof" className="w-full max-h-72 object-contain rounded-xl border border-gray-200 bg-gray-900" />
                </div>
              )}
              {mediaModal.videoUrl && (
                <div>
                  <p className="text-xs font-semibold text-gray-700 mb-1">🎥 Video Proof Player:</p>
                  <video controls autoPlay className="w-full max-h-72 rounded-xl border border-gray-200 bg-black">
                    <source src={mediaModal.videoUrl} type="video/mp4" />
                    Your browser does not support the video tag.
                  </video>
                </div>
              )}
            </div>
            <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex justify-end">
              <button onClick={() => setMediaModal(null)} className="bg-gray-800 text-white text-xs font-medium px-4 py-2 rounded-lg">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Poultry;
