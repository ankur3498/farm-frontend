import React, { useEffect, useState, useCallback } from "react";
import api from "../api/axios.js";
import { useAuth } from "../context/AuthContext.jsx";
import Pagination from "../components/Pagination.jsx";

const PAGE_SIZE = 9;
const IST = "Asia/Kolkata";

const fmtDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: IST }) : "—";
const fmtDateInput = (d) => {
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, "0"), day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const calculateAge = (dobIso) => {
  if (!dobIso) return "Not specified";
  const dob = new Date(dobIso);
  if (isNaN(dob.getTime())) return "Not specified";
  const now = new Date();

  let years = now.getFullYear() - dob.getFullYear();
  let months = now.getMonth() - dob.getMonth();
  let days = now.getDate() - dob.getDate();

  if (days < 0) {
    months -= 1;
    const prevMonthLastDay = new Date(now.getFullYear(), now.getMonth(), 0).getDate();
    days += prevMonthLastDay;
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }

  if (years > 0) {
    return `${years} yr${years > 1 ? "s" : ""}${months > 0 ? ` ${months} mo${months > 1 ? "s" : ""}` : ""}`;
  } else if (months > 0) {
    return `${months} mo${months > 1 ? "s" : ""}${days > 0 ? ` ${days} day${days > 1 ? "s" : ""}` : ""}`;
  } else if (days >= 0) {
    return `${days} day${days !== 1 ? "s" : ""}`;
  }
  return "Not specified";
};

const speciesIcon = {
  cow: "🐄",
  buffalo: "🐃",
  goat: "🐐",
  dog: "🐕",
};

const speciesLabel = {
  cow: "Cow",
  buffalo: "Buffalo",
  goat: "Goat",
  dog: "Dog",
};

const emptyForm = {
  tagId: "",
  name: "",
  species: "cow",
  breed: "",
  gender: "female",
  dateOfBirth: "",
  assignedTo: "",
};

const Animals = () => {
  const { user } = useAuth();
  const isPrivileged = ["admin", "manager_operations", "field_manager"].includes(user?.role);
  const now = new Date();

  const [animals, setAnimals] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [speciesFilter, setSpeciesFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);

  // Tag New Animal Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  // Selected Animal Details & Sub-modals
  const [selectedAnimal, setSelectedAnimal] = useState(null);
  const [activeTab, setActiveTab] = useState("overview"); // "overview" | "heat" | "pregnancy" | "medical"

  // Sub-modal forms
  const [heatDate, setHeatDate] = useState(fmtDateInput(now));
  const [heatNotes, setHeatNotes] = useState("");

  const [insemDate, setInsemDate] = useState(fmtDateInput(now));
  const [pregStatus, setPregStatus] = useState("confirmed");
  const [pregNotes, setPregNotes] = useState("");

  const [medTitle, setMedTitle] = useState("");
  const [medType, setMedType] = useState("vaccination");
  const [medicine, setMedicine] = useState("");
  const [nextDueDate, setNextDueDate] = useState("");
  const [medNotes, setMedNotes] = useState("");
  const [photoFile, setPhotoFile] = useState(null);
  const [videoFile, setVideoFile] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Interactive Media Modal
  const [mediaModal, setMediaModal] = useState(null);

  const fetchStaff = useCallback(async () => {
    try {
      const res = await api.get("/users");
      setStaffList(res.data.users || []);
    } catch (err) {
      // non critical
    }
  }, []);

  const fetchAlerts = useCallback(async () => {
    try {
      const res = await api.get("/animals/alerts");
      setAlerts(res.data.alerts || []);
    } catch (err) {
      // non critical
    }
  }, []);

  const fetchAnimals = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (speciesFilter) params.set("species", speciesFilter);
      if (searchQuery) params.set("search", searchQuery);

      const res = await api.get(`/animals?${params.toString()}`);
      setAnimals(res.data.animals || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load animals");
    } finally {
      setLoading(false);
    }
  }, [speciesFilter, searchQuery]);

  useEffect(() => {
    fetchStaff();
    fetchAlerts();
  }, [fetchStaff, fetchAlerts]);

  useEffect(() => {
    fetchAnimals();
  }, [fetchAnimals]);

  const refreshAll = () => {
    fetchAnimals();
    fetchAlerts();
    if (selectedAnimal) {
      api.get(`/animals/${selectedAnimal._id}`).then((res) => setSelectedAnimal(res.data));
    }
  };

  const handleAddAnimal = async (e) => {
    e.preventDefault();
    setFormError("");
    setSubmitting(true);
    try {
      await api.post("/animals", form);
      setShowAddModal(false);
      setForm(emptyForm);
      refreshAll();
    } catch (err) {
      setFormError(err.response?.data?.message || "Failed to register animal");
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogHeat = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      await api.post(`/animals/${selectedAnimal._id}/heat`, { lastHeatDate: heatDate, notes: heatNotes });
      setHeatNotes("");
      refreshAll();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to log heat cycle");
    } finally {
      setActionLoading(false);
    }
  };

  const handleLogPregnancy = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      await api.post(`/animals/${selectedAnimal._id}/pregnancy`, {
        inseminationDate: insemDate,
        pregnancyStatus: pregStatus,
        notes: pregNotes,
      });
      setPregNotes("");
      refreshAll();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to log pregnancy");
    } finally {
      setActionLoading(false);
    }
  };

  const handleLogMedical = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const formData = new FormData();
      formData.append("title", medTitle);
      formData.append("type", medType);
      formData.append("medicine", medicine);
      if (nextDueDate) formData.append("nextDueDate", nextDueDate);
      formData.append("notes", medNotes);
      if (photoFile) formData.append("photo", photoFile);
      if (videoFile) formData.append("video", videoFile);

      await api.post(`/animals/${selectedAnimal._id}/medical`, formData);
      setMedTitle("");
      setMedicine("");
      setNextDueDate("");
      setMedNotes("");
      setPhotoFile(null);
      setVideoFile(null);
      refreshAll();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to add medical record");
    } finally {
      setActionLoading(false);
    }
  };

  const [editingDob, setEditingDob] = useState(false);
  const [editDobValue, setEditDobValue] = useState("");
  const [editGenderValue, setEditGenderValue] = useState("female");

  const handleReassign = async (newStaffId) => {
    try {
      await api.put(`/animals/${selectedAnimal._id}`, { assignedTo: newStaffId });
      refreshAll();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to reassign animal");
    }
  };

  const handleUpdateAnimalDetails = async (updatedFields) => {
    try {
      const res = await api.put(`/animals/${selectedAnimal._id}`, updatedFields);
      setSelectedAnimal(res.data.animal);
      refreshAll();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to update animal details");
    }
  };

  const pagedAnimals = animals.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="px-4 md:px-8 py-6 md:py-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
            🏷️ Animal Tagging & Tracking
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Individual animal profile tags for Cow, Buffalo, Goat, Dog · Heat cycles, Pregnancy & Vaccination alerts
          </p>
        </div>
        {isPrivileged && (
          <button
            onClick={() => { setForm(emptyForm); setFormError(""); setShowAddModal(true); }}
            className="bg-farm-600 hover:bg-farm-700 text-white text-sm font-medium rounded-lg px-4 py-2.5 transition shadow-sm"
          >
            + Tag New Animal
          </button>
        )}
      </div>

      {/* Alerts Bar */}
      {alerts.length > 0 && (
        <div className="bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl shadow-md p-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              🔔 Upcoming Animal Alerts ({alerts.length})
            </h2>
            <span className="text-[11px] bg-white/20 px-2 py-0.5 rounded font-medium">Next 14 Days</span>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {alerts.slice(0, 6).map((alt, idx) => (
              <div key={idx} className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg p-2.5 text-xs">
                <p className="font-semibold text-white truncate">{alt.title}</p>
                <p className="text-amber-100 text-[11px] mt-0.5">{alt.message}</p>
                <p className="text-white/70 text-[10px] mt-1 font-medium">Assigned: {alt.animal.assignedTo?.name || "Manager"}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Species Filter Tabs & Search */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          <button
            onClick={() => { setSpeciesFilter(""); setPage(1); }}
            className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition ${
              speciesFilter === "" ? "bg-farm-600 text-white" : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
            }`}
          >
            🐾 All Species
          </button>
          {["cow", "buffalo", "goat", "dog"].map((sp) => (
            <button
              key={sp}
              onClick={() => { setSpeciesFilter(sp); setPage(1); }}
              className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition ${
                speciesFilter === sp ? "bg-farm-600 text-white" : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
              }`}
            >
              {speciesIcon[sp]} {speciesLabel[sp]}s
            </button>
          ))}
        </div>

        <input
          type="text"
          placeholder="🔍 Search Tag ID, Name, Breed..."
          value={searchQuery}
          onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
          className="text-xs border border-gray-300 rounded-lg px-3 py-2 w-full sm:w-64 focus:outline-none focus:ring-2 focus:ring-farm-500"
        />
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">{error}</div>
      )}

      {loading ? (
        <div className="text-center text-gray-400 py-12">Loading tagged animals...</div>
      ) : animals.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center">
          <p className="text-5xl mb-3">🏷️</p>
          <p className="font-medium text-gray-700 mb-1">No animals tagged yet</p>
          <p className="text-sm text-gray-500 mb-4">Tag individual Cows, Buffaloes, Goats, or Dogs to track heat cycles and pregnancy.</p>
          {isPrivileged && (
            <button
              onClick={() => { setForm(emptyForm); setShowAddModal(true); }}
              className="bg-farm-600 hover:bg-farm-700 text-white text-sm font-medium rounded-lg px-5 py-2.5 transition"
            >
              + Tag your first animal
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Animals Grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {pagedAnimals.map((a) => (
              <div key={a._id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex flex-col justify-between hover:border-farm-400 transition">
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{speciesIcon[a.species]}</span>
                      <div>
                        <h2 className="font-bold text-gray-800 text-base">{a.tagId}</h2>
                        {a.name && <p className="text-xs text-gray-500">{a.name} · {a.breed || a.species}</p>}
                      </div>
                    </div>
                    <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${
                      a.reproductiveStatus === "pregnant" ? "bg-purple-100 text-purple-700" :
                      a.reproductiveStatus === "in_heat" ? "bg-red-100 text-red-700" :
                      a.reproductiveStatus === "lactating" ? "bg-blue-100 text-blue-700" :
                      "bg-gray-100 text-gray-600"
                    }`}>
                      {a.reproductiveStatus.replace("_", " ").toUpperCase()}
                    </span>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-3 text-xs space-y-1 mb-3">
                    <p className="text-gray-600">👤 <span className="font-semibold">Assigned Staff:</span> {a.assignedTo?.name || "Manager (Default)"}</p>
                    <p className="text-gray-600">🎂 <span className="font-semibold">DOB & Age:</span> {a.dateOfBirth ? `${fmtDate(a.dateOfBirth)} (${calculateAge(a.dateOfBirth)})` : "Not specified"}</p>
                    {a.heatTracking?.nextExpectedHeatDate && (
                      <p className="text-red-700 font-medium">♀️ Next Heat: {fmtDate(a.heatTracking.nextExpectedHeatDate)}</p>
                    )}
                    {a.pregnancyTracking?.expectedDeliveryDate && a.pregnancyTracking.pregnancyStatus !== "delivered" && (
                      <p className="text-purple-700 font-medium">🤰 Delivery Due: {fmtDate(a.pregnancyTracking.expectedDeliveryDate)}</p>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => { setSelectedAnimal(a); setActiveTab("overview"); setEditingDob(false); }}
                  className="w-full bg-gray-900 hover:bg-black text-white text-xs font-semibold rounded-lg py-2.5 transition"
                >
                  View Profile & Log Medical/Heat →
                </button>
              </div>
            ))}
          </div>

          <Pagination page={page} totalItems={animals.length} pageSize={PAGE_SIZE} onChange={setPage} />
        </>
      )}

      {/* Tag New Animal Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800">Tag New Animal</h2>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
            </div>
            {formError && <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg p-2.5">{formError}</div>}
            <form onSubmit={handleAddAnimal} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Tag ID / Ear Tag *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. COW-101"
                    value={form.tagId}
                    onChange={(e) => setForm({ ...form, tagId: e.target.value.toUpperCase() })}
                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 font-semibold uppercase"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Species *</label>
                  <select
                    value={form.species}
                    onChange={(e) => setForm({ ...form, species: e.target.value })}
                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2"
                  >
                    <option value="cow">🐄 Cow</option>
                    <option value="buffalo">🐃 Buffalo</option>
                    <option value="goat">🐐 Goat</option>
                    <option value="dog">🐕 Dog</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Name (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Gauri"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Breed</label>
                  <input
                    type="text"
                    placeholder="e.g. Gir / Murrah"
                    value={form.breed}
                    onChange={(e) => setForm({ ...form, breed: e.target.value })}
                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Gender *</label>
                  <select
                    value={form.gender}
                    onChange={(e) => setForm({ ...form, gender: e.target.value })}
                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2"
                  >
                    <option value="female">♀️ Female</option>
                    <option value="male">♂️ Male</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Date of Birth (DOB)</label>
                  <input
                    type="date"
                    max={fmtDateInput(now)}
                    value={form.dateOfBirth}
                    onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })}
                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2"
                  />
                  {form.dateOfBirth && (
                    <span className="text-[10px] text-farm-700 font-semibold block mt-0.5">
                      Age: {calculateAge(form.dateOfBirth)}
                    </span>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Assigned Person (Default: Manager)</label>
                <select
                  value={form.assignedTo}
                  onChange={(e) => setForm({ ...form, assignedTo: e.target.value })}
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2"
                >
                  <option value="">Manager Operations (Default Manager)</option>
                  {staffList.map((s) => (
                    <option key={s._id} value={s._id}>{s.name} ({s.role})</option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-farm-600 hover:bg-farm-700 disabled:opacity-60 text-white font-semibold rounded-lg py-2.5 text-sm mt-2 transition"
              >
                {submitting ? "Registering Tag..." : "Tag & Register Animal"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Selected Animal Profile Drawer & Tracking Modal */}
      {selectedAnimal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 bg-gray-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{speciesIcon[selectedAnimal.species]}</span>
                <div>
                  <h2 className="text-lg font-bold">{selectedAnimal.tagId} {selectedAnimal.name ? `(${selectedAnimal.name})` : ""}</h2>
                  <p className="text-xs text-gray-300">
                    {speciesLabel[selectedAnimal.species]} · Breed: {selectedAnimal.breed || "Standard"}
                    {selectedAnimal.dateOfBirth ? ` · Age: ${calculateAge(selectedAnimal.dateOfBirth)}` : ""}
                  </p>
                </div>
              </div>
              <button onClick={() => setSelectedAnimal(null)} className="text-gray-400 hover:text-white text-2xl leading-none">&times;</button>
            </div>

            {/* Reassign & Status Bar */}
            <div className="px-6 py-3 bg-gray-50 border-b border-gray-200 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-700">Assigned To:</span>
                <select
                  value={selectedAnimal.assignedTo?._id || ""}
                  onChange={(e) => handleReassign(e.target.value)}
                  className="border border-gray-300 rounded px-2 py-1 bg-white font-medium text-gray-800"
                >
                  <option value="">Manager Operations (Default)</option>
                  {staffList.map((s) => (
                    <option key={s._id} value={s._id}>{s.name} ({s.role})</option>
                  ))}
                </select>
              </div>

              <span className="font-bold text-purple-700 bg-purple-50 border border-purple-200 px-2.5 py-1 rounded-full uppercase">
                Status: {selectedAnimal.reproductiveStatus.replace("_", " ")}
              </span>
            </div>

            {/* Tabs inside modal */}
            <div className="flex border-b border-gray-200 text-xs font-semibold px-6 bg-white">
              <button
                onClick={() => setActiveTab("overview")}
                className={`py-3 px-4 border-b-2 transition ${activeTab === "overview" ? "border-farm-600 text-farm-700" : "border-transparent text-gray-500"}`}
              >
                📋 Overview
              </button>
              <button
                onClick={() => setActiveTab("heat")}
                className={`py-3 px-4 border-b-2 transition ${activeTab === "heat" ? "border-farm-600 text-farm-700" : "border-transparent text-gray-500"}`}
              >
                ♀️ Heat Cycle Log
              </button>
              <button
                onClick={() => setActiveTab("pregnancy")}
                className={`py-3 px-4 border-b-2 transition ${activeTab === "pregnancy" ? "border-farm-600 text-farm-700" : "border-transparent text-gray-500"}`}
              >
                🤰 Pregnancy Log
              </button>
              <button
                onClick={() => setActiveTab("medical")}
                className={`py-3 px-4 border-b-2 transition ${activeTab === "medical" ? "border-farm-600 text-farm-700" : "border-transparent text-gray-500"}`}
              >
                💊 Medical & Vaccination
              </button>
            </div>

            {/* Tab Content */}
            <div className="p-6 overflow-y-auto flex-1 space-y-4 text-xs">
              {activeTab === "overview" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-gray-50 p-3 rounded-xl border border-gray-200">
                      <p className="text-gray-400 font-semibold text-[10px]">TAG ID</p>
                      <p className="font-bold text-gray-800 text-sm mt-0.5">{selectedAnimal.tagId}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-xl border border-gray-200">
                      <p className="text-gray-400 font-semibold text-[10px]">SPECIES & GENDER</p>
                      <p className="font-bold text-gray-800 text-sm mt-0.5 capitalize">{selectedAnimal.species} ({selectedAnimal.gender})</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-xl border border-gray-200">
                      <p className="text-gray-400 font-semibold text-[10px]">CURRENT AGE</p>
                      <p className="font-bold text-farm-700 text-sm mt-0.5">{calculateAge(selectedAnimal.dateOfBirth)}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-xl border border-gray-200">
                      <p className="text-gray-400 font-semibold text-[10px]">ASSIGNED PERSON</p>
                      <p className="font-bold text-gray-800 text-sm mt-0.5 truncate">{selectedAnimal.assignedTo?.name || "Manager"}</p>
                    </div>
                  </div>

                  {/* DOB & Gender Edit Card */}
                  <div className="bg-blue-50/60 border border-blue-200 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-bold text-blue-900 text-sm flex items-center gap-1.5">
                        🎂 Birth & Age Details
                      </h4>
                      {!editingDob ? (
                        <button
                          onClick={() => {
                            setEditingDob(true);
                            setEditDobValue(selectedAnimal.dateOfBirth ? fmtDateInput(new Date(selectedAnimal.dateOfBirth)) : "");
                            setEditGenderValue(selectedAnimal.gender || "female");
                          }}
                          className="text-[11px] bg-blue-600 hover:bg-blue-700 text-white font-semibold px-2.5 py-1 rounded transition"
                        >
                          ✏️ Edit DOB / Gender
                        </button>
                      ) : null}
                    </div>

                    {!editingDob ? (
                      <div className="grid grid-cols-3 gap-2 text-xs text-gray-700">
                        <div>
                          <span className="text-gray-500 font-medium">Date of Birth:</span>{" "}
                          <span className="font-bold block text-gray-800 mt-0.5">{fmtDate(selectedAnimal.dateOfBirth)}</span>
                        </div>
                        <div>
                          <span className="text-gray-500 font-medium">Calculated Age:</span>{" "}
                          <span className="font-bold block text-farm-700 mt-0.5">{calculateAge(selectedAnimal.dateOfBirth)}</span>
                        </div>
                        <div>
                          <span className="text-gray-500 font-medium">Gender:</span>{" "}
                          <span className="font-bold block text-gray-800 mt-0.5 capitalize">{selectedAnimal.gender === "female" ? "♀️ Female" : "♂️ Male"}</span>
                        </div>
                      </div>
                    ) : (
                      <form
                        onSubmit={async (e) => {
                          e.preventDefault();
                          await handleUpdateAnimalDetails({
                            dateOfBirth: editDobValue || null,
                            gender: editGenderValue,
                          });
                          setEditingDob(false);
                        }}
                        className="space-y-3"
                      >
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-semibold text-gray-700 mb-1">Date of Birth</label>
                            <input
                              type="date"
                              max={fmtDateInput(now)}
                              value={editDobValue}
                              onChange={(e) => setEditDobValue(e.target.value)}
                              className="w-full text-xs border border-gray-300 rounded px-2.5 py-1.5 bg-white"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold text-gray-700 mb-1">Gender</label>
                            <select
                              value={editGenderValue}
                              onChange={(e) => setEditGenderValue(e.target.value)}
                              className="w-full text-xs border border-gray-300 rounded px-2.5 py-1.5 bg-white"
                            >
                              <option value="female">♀️ Female</option>
                              <option value="male">♂️ Male</option>
                            </select>
                          </div>
                        </div>
                        {editDobValue && (
                          <p className="text-[11px] font-semibold text-farm-700">
                            Age preview: {calculateAge(editDobValue)}
                          </p>
                        )}
                        <div className="flex gap-2 justify-end">
                          <button
                            type="button"
                            onClick={() => setEditingDob(false)}
                            className="px-3 py-1 text-xs border border-gray-300 rounded bg-white text-gray-600 hover:bg-gray-100"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            className="px-3 py-1 text-xs bg-farm-600 text-white rounded hover:bg-farm-700 font-semibold"
                          >
                            Save DOB & Gender
                          </button>
                        </div>
                      </form>
                    )}
                  </div>

                  {/* Heat info card */}
                  <div className="bg-red-50/60 border border-red-200 rounded-xl p-4">
                    <h4 className="font-bold text-red-800 text-sm mb-1">♀️ Heat Cycle Tracking</h4>
                    <p className="text-gray-700">Last Heat Date: <strong>{fmtDate(selectedAnimal.heatTracking?.lastHeatDate)}</strong></p>
                    <p className="text-red-700 font-bold mt-0.5">Next Expected Heat: {fmtDate(selectedAnimal.heatTracking?.nextExpectedHeatDate)}</p>
                  </div>

                  {/* Pregnancy info card */}
                  <div className="bg-purple-50/60 border border-purple-200 rounded-xl p-4">
                    <h4 className="font-bold text-purple-800 text-sm mb-1">🤰 Pregnancy & Delivery Tracking</h4>
                    <p className="text-gray-700">Insemination Date: <strong>{fmtDate(selectedAnimal.pregnancyTracking?.inseminationDate)}</strong></p>
                    <p className="text-purple-800 font-bold mt-0.5">Expected Delivery Date: {fmtDate(selectedAnimal.pregnancyTracking?.expectedDeliveryDate)}</p>
                  </div>
                </div>
              )}

              {activeTab === "heat" && (
                <form onSubmit={handleLogHeat} className="space-y-3 bg-red-50/40 p-4 rounded-xl border border-red-100">
                  <h4 className="font-bold text-red-800 text-sm">♀️ Record Heat Cycle Event</h4>
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Last Heat Date *</label>
                    <input
                      type="date"
                      required
                      value={heatDate}
                      onChange={(e) => setHeatDate(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg p-2 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Notes / Signs Observed</label>
                    <input
                      type="text"
                      placeholder="e.g. Mucus discharge, restlessness"
                      value={heatNotes}
                      onChange={(e) => setHeatNotes(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg p-2 bg-white"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg px-4 py-2 transition"
                  >
                    {actionLoading ? "Saving..." : "Save Heat Log & Calculate Next Heat"}
                  </button>
                </form>
              )}

              {activeTab === "pregnancy" && (
                <form onSubmit={handleLogPregnancy} className="space-y-3 bg-purple-50/40 p-4 rounded-xl border border-purple-100">
                  <h4 className="font-bold text-purple-800 text-sm">🤰 Record Insemination / Pregnancy Event</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-gray-700 mb-1">Insemination / Mating Date *</label>
                      <input
                        type="date"
                        required
                        value={insemDate}
                        onChange={(e) => setInsemDate(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg p-2 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-gray-700 mb-1">Pregnancy Status</label>
                      <select
                        value={pregStatus}
                        onChange={(e) => setPregStatus(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg p-2 bg-white"
                      >
                        <option value="confirmed">Confirmed Pregnant</option>
                        <option value="suspected">Suspected</option>
                        <option value="delivered">Delivered / Calved</option>
                        <option value="not_pregnant">Not Pregnant</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Notes / Bull Info</label>
                    <input
                      type="text"
                      placeholder="e.g. AI done with Semen Straw #402"
                      value={pregNotes}
                      onChange={(e) => setPregNotes(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg p-2 bg-white"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="bg-purple-700 hover:bg-purple-800 text-white font-semibold rounded-lg px-4 py-2 transition"
                  >
                    {actionLoading ? "Saving..." : "Save Pregnancy & Calculate Expected Delivery"}
                  </button>
                </form>
              )}

              {activeTab === "medical" && (
                <div className="space-y-4">
                  <form onSubmit={handleLogMedical} className="space-y-3 bg-blue-50/40 p-4 rounded-xl border border-blue-100">
                    <h4 className="font-bold text-blue-800 text-sm">💊 Add Vaccination / Medication / Treatment Log</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block font-semibold text-gray-700 mb-1">Title / Event *</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. FMD Vaccination"
                          value={medTitle}
                          onChange={(e) => setMedTitle(e.target.value)}
                          className="w-full border border-gray-300 rounded-lg p-2 bg-white"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-gray-700 mb-1">Type</label>
                        <select
                          value={medType}
                          onChange={(e) => setMedType(e.target.value)}
                          className="w-full border border-gray-300 rounded-lg p-2 bg-white"
                        >
                          <option value="vaccination">Vaccination</option>
                          <option value="deworming">Deworming</option>
                          <option value="treatment">Medical Treatment</option>
                          <option value="checkup">Routine Checkup</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block font-semibold text-gray-700 mb-1">Medicine Name</label>
                        <input
                          type="text"
                          placeholder="e.g. Raksha-OVac / Ivermectin"
                          value={medicine}
                          onChange={(e) => setMedicine(e.target.value)}
                          className="w-full border border-gray-300 rounded-lg p-2 bg-white"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-gray-700 mb-1">Next Booster / Due Date (Alert)</label>
                        <input
                          type="date"
                          value={nextDueDate}
                          onChange={(e) => setNextDueDate(e.target.value)}
                          className="w-full border border-gray-300 rounded-lg p-2 bg-white"
                        />
                      </div>
                    </div>

                    {/* Proof file upload */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block font-semibold text-gray-700 mb-0.5">📷 Photo Proof</label>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
                          className="w-full text-xs border border-gray-300 rounded p-1 bg-white"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-gray-700 mb-0.5">🎥 Video Proof</label>
                        <input
                          type="file"
                          accept="video/*"
                          onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
                          className="w-full text-xs border border-gray-300 rounded p-1 bg-white"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={actionLoading}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg px-4 py-2 transition"
                    >
                      {actionLoading ? "Uploading & Saving..." : "Save Medical Log"}
                    </button>
                  </form>

                  {/* Medical History Logs */}
                  <div className="space-y-2">
                    <h4 className="font-bold text-gray-700 text-xs uppercase">Medical History & Proofs</h4>
                    {selectedAnimal.medicalLogs?.length === 0 ? (
                      <p className="text-gray-400">No medical logs added yet.</p>
                    ) : (
                      selectedAnimal.medicalLogs?.map((log, idx) => (
                        <div key={idx} className="bg-white border border-gray-200 rounded-lg p-3 flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="font-semibold text-gray-800">{log.title} <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">{log.type}</span></p>
                            <p className="text-gray-500 text-[11px]">Given on {fmtDate(log.date)} {log.medicine ? `· Medicine: ${log.medicine}` : ""}</p>
                            {log.nextDueDate && <p className="text-amber-700 font-medium text-[11px]">Next Due: {fmtDate(log.nextDueDate)}</p>}
                          </div>
                          {log.proof && (log.proof.photoUrl || log.proof.videoUrl) && (
                            <div className="flex gap-1">
                              {log.proof.photoUrl && (
                                <button
                                  type="button"
                                  onClick={() => setMediaModal({ photoUrl: log.proof.photoUrl, videoUrl: log.proof.videoUrl, title: log.title })}
                                  className="bg-purple-50 text-purple-700 border border-purple-200 px-2 py-1 rounded font-medium"
                                >
                                  📷 Photo
                                </button>
                              )}
                              {log.proof.videoUrl && (
                                <button
                                  type="button"
                                  onClick={() => setMediaModal({ photoUrl: log.proof.photoUrl, videoUrl: log.proof.videoUrl, title: log.title })}
                                  className="bg-blue-50 text-blue-700 border border-blue-200 px-2 py-1 rounded font-medium"
                                >
                                  🎥 Video
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
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
            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              {mediaModal.photoUrl && (
                <div>
                  <p className="font-semibold text-gray-700 mb-1">📷 Photo Proof:</p>
                  <img src={mediaModal.photoUrl} alt="Animal medical photo proof" className="w-full max-h-72 object-contain rounded-xl border border-gray-200 bg-gray-900" />
                </div>
              )}
              {mediaModal.videoUrl && (
                <div>
                  <p className="font-semibold text-gray-700 mb-1">🎥 Video Proof Player:</p>
                  <video controls autoPlay className="w-full max-h-72 rounded-xl border border-gray-200 bg-black">
                    <source src={mediaModal.videoUrl} type="video/mp4" />
                    Your browser does not support video playback.
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

export default Animals;
