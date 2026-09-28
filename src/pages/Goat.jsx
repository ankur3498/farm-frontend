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

const emptyBatchForm = { name: "", breed: "", entryDate: fmtDateInput(new Date()), goatsReceived: "" };
const emptyRecordForm = { date: fmtDateInput(new Date()), mortality: "0", culls: "0", feedKg: "", sampleWeightKg: "", remarks: "" };

const CardSkeleton = () => (
  <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 animate-pulse">
    <div className="h-4 bg-gray-200 rounded w-2/3 mb-3" />
    <div className="h-3 bg-gray-100 rounded w-1/2 mb-4" />
    <div className="grid grid-cols-2 gap-3">
      <div className="h-8 bg-gray-100 rounded" />
      <div className="h-8 bg-gray-100 rounded" />
    </div>
  </div>
);

const Goat = () => {
  const { user } = useAuth();
  const isPrivileged = ["admin", "manager_operations"].includes(user?.role);
  const now = new Date();

  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedBatch, setSelectedBatch] = useState(null);
  const [records, setRecords] = useState([]);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [page, setPage] = useState(1);

  // Modal states for Batches & Records
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

  // Interactive Media Modal for photo/video proof
  const [mediaModal, setMediaModal] = useState(null);

  const fetchBatches = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/goat/batches");
      setBatches(res.data.batches || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load goat batches");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchBatches(); }, [fetchBatches]);

  const fetchRecords = useCallback(async (batchId) => {
    if (!batchId) return;
    setRecordsLoading(true);
    try {
      const res = await api.get(`/goat/batches/${batchId}/records`);
      setRecords(res.data.records || []);
      setPage(1);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load goat records");
    } finally {
      setRecordsLoading(false);
    }
  }, []);

  const openBatch = (batch) => {
    setSelectedBatch(batch);
    fetchRecords(batch._id);
  };

  const refreshAll = () => {
    fetchBatches();
    if (selectedBatch) fetchRecords(selectedBatch._id);
  };

  const submitBatch = async (e) => {
    e.preventDefault();
    setBatchError("");
    setBatchSubmitting(true);
    try {
      await api.post("/goat/batches", {
        name: batchForm.name,
        breed: batchForm.breed,
        entryDate: batchForm.entryDate,
        goatsReceived: Number(batchForm.goatsReceived),
      });
      setBatchModalOpen(false);
      fetchBatches();
    } catch (err) {
      setBatchError(err.response?.data?.message || "Failed to create batch");
    } finally {
      setBatchSubmitting(false);
    }
  };

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
      sampleWeightKg: record.sampleWeightKg ?? "",
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
      if (recordForm.sampleWeightKg !== "") {
        formData.append("sampleWeightKg", Number(recordForm.sampleWeightKg));
      }
      formData.append("remarks", recordForm.remarks || "");

      if (photoFile) formData.append("photo", photoFile);
      if (videoFile) formData.append("video", videoFile);

      if (editingRecordId) {
        await api.put(`/goat/records/${editingRecordId}`, formData);
      } else {
        await api.post(`/goat/batches/${selectedBatch._id}/records`, formData);
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
      await api.delete(`/goat/records/${record._id}`);
      refreshAll();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to remove record");
    }
  };

  const pagedRecords = records.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="px-4 md:px-8 py-6 md:py-8">
      {!selectedBatch ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <div>
              <h1 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                <span className="text-2xl">🐐</span> Goat Batches
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">Track goat flocks, daily feed, sample weights, photo & video proof</p>
            </div>
            {isPrivileged && (
              <button
                onClick={() => { setBatchForm(emptyBatchForm); setBatchError(""); setBatchModalOpen(true); }}
                className="bg-farm-600 hover:bg-farm-700 text-white text-sm font-medium rounded-lg px-4 py-2.5 transition shadow-sm"
              >
                + New Goat Batch
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
              <p className="text-5xl mb-3">🐐</p>
              <p className="font-medium text-gray-700 mb-1">No Goat batches created yet</p>
              <p className="text-sm text-gray-500 mb-4">Start your first goat flock to begin tracking growth and sample weights.</p>
              {isPrivileged && (
                <button
                  onClick={() => { setBatchForm(emptyBatchForm); setBatchModalOpen(true); }}
                  className="bg-farm-600 hover:bg-farm-700 text-white text-sm font-medium rounded-lg px-5 py-2.5 transition"
                >
                  + Create your first batch
                </button>
              )}
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {batches.map((b) => (
                <div key={b._id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex flex-col justify-between hover:border-farm-400 transition">
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <h2 className="font-semibold text-gray-800 text-base">{b.name}</h2>
                        <p className="text-xs text-gray-400">{b.breed ? `Breed: ${b.breed} · ` : ""}Started {fmtDate(b.entryDate)}</p>
                      </div>
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-purple-100 text-purple-700">
                        Day {b.ageDay}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 my-4">
                      <div className="bg-gray-50 rounded-lg p-2.5 border border-gray-100">
                        <p className="text-[10px] text-gray-400 uppercase font-semibold">Head Count</p>
                        <p className="text-lg font-bold text-gray-800">{b.currentStock} <span className="text-xs font-normal text-gray-400">/ {b.goatsReceived}</span></p>
                      </div>
                      <div className="bg-purple-50/60 rounded-lg p-2.5 border border-purple-100">
                        <p className="text-[10px] text-purple-600 uppercase font-semibold">Avg Weight</p>
                        <p className="text-lg font-bold text-purple-800">{b.avgSampleWeight ? `${b.avgSampleWeight} kg` : "—"}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-gray-500 border-t border-gray-100 pt-3">
                      <span>Mortality: <strong className="text-red-600">{b.totalMortality}</strong></span>
                      <span>Total Feed: <strong className="text-gray-700">{b.totalFeedKg} kg</strong></span>
                    </div>
                  </div>

                  <button
                    onClick={() => openBatch(b)}
                    className="w-full mt-4 bg-gray-900 hover:bg-black text-white text-xs font-semibold rounded-lg py-2.5 transition"
                  >
                    View Batch Logs & Proofs →
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        /* Batch Detail View */
        <>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelectedBatch(null)}
                className="text-sm font-medium text-gray-500 hover:text-gray-800 bg-white border border-gray-200 px-3 py-1.5 rounded-lg transition"
              >
                ← Back to Batches
              </button>
              <div>
                <h1 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                  <span>🐐</span> {selectedBatch.name}
                </h1>
                <p className="text-xs text-gray-500">Started {fmtDate(selectedBatch.entryDate)} · Day {selectedBatch.ageDay}</p>
              </div>
            </div>

            <button
              onClick={openAddRecord}
              className="bg-farm-600 hover:bg-farm-700 text-white text-sm font-medium rounded-lg px-4 py-2.5 transition shadow-sm"
            >
              + Log Daily Record & Proof
            </button>
          </div>

          {recordsLoading ? (
            <div className="text-center text-gray-400 py-12">Loading batch records...</div>
          ) : records.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-10 text-center text-gray-400">
              No daily logs recorded yet for this goat batch.
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-4">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold uppercase">
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Age</th>
                      <th className="py-3 px-4">Head Count</th>
                      <th className="py-3 px-4">Mortality</th>
                      <th className="py-3 px-4">Feed (Kg)</th>
                      <th className="py-3 px-4">Sample Weight</th>
                      <th className="py-3 px-4">Photo & Video Proof</th>
                      <th className="py-3 px-4">Remarks</th>
                      {isPrivileged && <th className="py-3 px-4 text-right">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {pagedRecords.map((r) => (
                      <tr key={r._id} className="hover:bg-gray-50/50">
                        <td className="py-3 px-4 font-medium text-gray-800">{fmtDate(r.date)}</td>
                        <td className="py-3 px-4 text-gray-500">Day {r.ageDay}</td>
                        <td className="py-3 px-4 font-semibold text-gray-800">{r.closingStock}</td>
                        <td className="py-3 px-4 text-red-600 font-medium">{r.mortality > 0 ? r.mortality : "—"}</td>
                        <td className="py-3 px-4 text-gray-700">{r.feedKg ? `${r.feedKg} kg` : "—"}</td>
                        <td className="py-3 px-4 font-bold text-purple-700">
                          {r.sampleWeightKg ? `${r.sampleWeightKg} kg` : "—"}
                        </td>
                        <td className="py-3 px-4">
                          {r.proof && (r.proof.photoUrl || r.proof.videoUrl) ? (
                            <div className="flex items-center gap-1.5">
                              {r.proof.photoUrl && (
                                <button
                                  type="button"
                                  onClick={() => setMediaModal({ photoUrl: r.proof.photoUrl, videoUrl: r.proof.videoUrl, title: `${selectedBatch.name} — ${fmtDate(r.date)}` })}
                                  className="bg-purple-50 text-purple-700 border border-purple-200 px-2 py-1 rounded text-[11px] font-medium hover:bg-purple-100"
                                >
                                  📷 Photo
                                </button>
                              )}
                              {r.proof.videoUrl && (
                                <button
                                  type="button"
                                  onClick={() => setMediaModal({ photoUrl: r.proof.photoUrl, videoUrl: r.proof.videoUrl, title: `${selectedBatch.name} — ${fmtDate(r.date)}` })}
                                  className="bg-blue-50 text-blue-700 border border-blue-200 px-2 py-1 rounded text-[11px] font-medium hover:bg-blue-100"
                                >
                                  🎥 Video
                                </button>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-gray-500 max-w-xs truncate">{r.remarks || "—"}</td>
                        {isPrivileged && (
                          <td className="py-3 px-4 text-right space-x-2">
                            <button onClick={() => openEditRecord(r)} className="text-blue-600 hover:text-blue-800 font-medium">Edit</button>
                            <button onClick={() => removeRecord(r)} className="text-red-600 hover:text-red-800 font-medium">Del</button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="p-3 border-t border-gray-100">
                <Pagination page={page} totalItems={records.length} pageSize={PAGE_SIZE} onChange={setPage} />
              </div>
            </div>
          )}
        </>
      )}

      {/* New Goat Batch Modal */}
      {batchModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800">New Goat Batch</h2>
              <button onClick={() => setBatchModalOpen(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
            </div>
            {batchError && <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg p-2.5">{batchError}</div>}
            <form onSubmit={submitBatch} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Batch Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Batch A - Jamunapari"
                  required
                  value={batchForm.name}
                  onChange={(e) => setBatchForm({ ...batchForm, name: e.target.value })}
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Breed</label>
                <input
                  type="text"
                  placeholder="e.g. Jamunapari / Sirohi / Barbari"
                  value={batchForm.breed}
                  onChange={(e) => setBatchForm({ ...batchForm, breed: e.target.value })}
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Entry Date *</label>
                  <input
                    type="date"
                    required
                    value={batchForm.entryDate}
                    onChange={(e) => setBatchForm({ ...batchForm, entryDate: e.target.value })}
                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Goats Received *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    placeholder="e.g. 20"
                    value={batchForm.goatsReceived}
                    onChange={(e) => setBatchForm({ ...batchForm, goatsReceived: e.target.value })}
                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={batchSubmitting}
                className="w-full bg-farm-600 hover:bg-farm-700 disabled:opacity-60 text-white font-semibold rounded-lg py-2.5 text-sm mt-2 transition"
              >
                {batchSubmitting ? "Creating Batch..." : "Create Goat Batch"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Daily Record Entry Modal with Photo & Video Proof */}
      {recordModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 my-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800">
                {editingRecordId ? "Edit Goat Daily Record" : "Log Goat Daily Record & Proof"}
              </h2>
              <button onClick={() => setRecordModalOpen(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
            </div>
            {recordError && <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg p-2.5">{recordError}</div>}
            <form onSubmit={submitRecord} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Date *</label>
                <input
                  type="date"
                  required
                  value={recordForm.date}
                  onChange={(e) => setRecordForm({ ...recordForm, date: e.target.value })}
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Mortality</label>
                  <input
                    type="number"
                    min="0"
                    value={recordForm.mortality}
                    onChange={(e) => setRecordForm({ ...recordForm, mortality: e.target.value })}
                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Culls / Sales</label>
                  <input
                    type="number"
                    min="0"
                    value={recordForm.culls}
                    onChange={(e) => setRecordForm({ ...recordForm, culls: e.target.value })}
                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Total Feed (Kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="e.g. 15.0"
                    value={recordForm.feedKg}
                    onChange={(e) => setRecordForm({ ...recordForm, feedKg: e.target.value })}
                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-purple-700 mb-1">⚖️ Sample Weight (Kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="e.g. 18.5"
                    value={recordForm.sampleWeightKg}
                    onChange={(e) => setRecordForm({ ...recordForm, sampleWeightKg: e.target.value })}
                    className="w-full text-sm border border-purple-300 focus:ring-purple-500 rounded-lg px-3 py-2"
                  />
                </div>
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

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Remarks / Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Deworming done / Healthy weight gain"
                  value={recordForm.remarks}
                  onChange={(e) => setRecordForm({ ...recordForm, remarks: e.target.value })}
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>

              <button
                type="submit"
                disabled={recordSubmitting}
                className="w-full bg-farm-600 hover:bg-farm-700 disabled:opacity-60 text-white font-semibold rounded-lg py-2.5 text-sm mt-2 transition"
              >
                {recordSubmitting ? "Uploading & Saving..." : "Save Daily Record"}
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
                  <img src={mediaModal.photoUrl} alt="Goat batch photo proof" className="w-full max-h-72 object-contain rounded-xl border border-gray-200 bg-gray-900" />
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

export default Goat;
