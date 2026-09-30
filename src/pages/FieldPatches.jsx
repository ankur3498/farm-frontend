import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import api from "../api/axios.js";
import {
  MapPin,
  Plus,
  User,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  Search,
  Filter,
  Image as ImageIcon,
  Edit2,
  Trash2,
  FileText,
  Layers,
  Repeat,
  Calendar,
  Upload,
  CheckSquare,
  AlertCircle,
  Camera,
  Briefcase,
  UserCheck,
} from "lucide-react";

const STORAGE_KEY = "dewals_field_patches_v1";

const DEFAULT_PATCHES = [
  {
    id: "patch-101",
    _id: "patch-101",
    name: "North Plot - Wheat Field A",
    image: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=800&q=80",
    work: "Daily soil moisture check, drip line cleaning & organic composting.",
    workType: "daily", // daily, one_time
    landmark: "Behind Gate 2 Solar Borewell",
    assignedToName: "Ramesh Kumar",
    assignedTo: "user-101",
    status: "in_progress", // active, in_progress, submitted, approved, declined
    size: "2.5 Acres",
    crop: "Wheat",
    createdAt: "2026-09-20",
  },
  {
    id: "patch-102",
    _id: "patch-102",
    name: "East Greenhouse - Tomato Plot B",
    image: "https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?auto=format&fit=crop&w=800&q=80",
    work: "Pruning vines & liquid fertilizer application.",
    workType: "one_time",
    landmark: "Adjacent to Packing Shed #3",
    assignedToName: "Suresh Patel",
    assignedTo: "user-102",
    status: "submitted",
    submissionProof: "https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?auto=format&fit=crop&w=800&q=80",
    submissionNotes: "Completed pruning and sprayed liquid fertilizer on all 4 rows.",
    size: "1.0 Acre",
    crop: "Tomato",
    createdAt: "2026-09-22",
  },
  {
    id: "patch-103",
    _id: "patch-103",
    name: "South Orchard - Guava Block #4",
    image: "https://images.unsplash.com/photo-1615485290382-441e4d049cb5?auto=format&fit=crop&w=800&q=80",
    work: "Daily weeding & pest monitoring.",
    workType: "daily",
    landmark: "Near East Entrance Banyan Tree",
    assignedToName: "Anita Singh",
    assignedTo: "user-103",
    status: "active",
    size: "3.2 Acres",
    crop: "Guava Orchard",
    createdAt: "2026-09-24",
  },
];

const PRESET_IMAGES = [
  "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1615485290382-441e4d049cb5?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1523348837708-15d4a09cfac2?auto=format&fit=crop&w=800&q=80",
];

export default function FieldPatches() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const isAdminOrManager = ["admin", "manager_operations"].includes(user?.role);

  const [patches, setPatches] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return DEFAULT_PATCHES;
  });

  const [staffList, setStaffList] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [tabFilter, setTabFilter] = useState("all"); // all, my_assigned, daily, one_time, submitted
  const [statusFilter, setStatusFilter] = useState("all");

  // Modals
  const [isAddPatchModalOpen, setIsAddPatchModalOpen] = useState(false);
  const [isAssignTaskModalOpen, setIsAssignTaskModalOpen] = useState(false);
  const [editingPatch, setEditingPatch] = useState(null);
  const [selectedPatchForAssign, setSelectedPatchForAssign] = useState(null);
  const [proofSubmitPatch, setProofSubmitPatch] = useState(null);
  const [reviewPatch, setReviewPatch] = useState(null);

  // Form State: Add/Edit Patch
  const [patchForm, setPatchForm] = useState({
    name: "",
    image: PRESET_IMAGES[0],
    crop: "General Crop",
    size: "1.0 Acre",
    landmark: "",
    work: "Initial plot setup & soil preparation.",
    workType: "one_time",
    assignedTo: "",
    assignedToName: "Unassigned Worker",
    status: "active",
  });

  // Form State: Assign Task to Existing Patch
  const [assignTaskForm, setAssignTaskForm] = useState({
    patchId: "",
    assignedTo: "",
    assignedToName: "",
    work: "",
    workType: "one_time", // daily, one_time
  });

  // Proof Submission Form (Worker)
  const [proofForm, setProofForm] = useState({
    submissionProof: "",
    submissionNotes: "",
  });

  // Review Form (Admin Only)
  const [reviewForm, setReviewForm] = useState({
    action: "approve", // approve, decline
    reviewNote: "",
  });

  // Fetch Backend Staff List
  const fetchStaffList = useCallback(async () => {
    try {
      const res = await api.get("/users");
      if (res.data?.users) {
        setStaffList(res.data.users);
      }
    } catch (err) {
      console.warn("Could not fetch backend staff list:", err.message);
    }
  }, []);

  // Fetch Patches from Backend API
  const fetchPatches = useCallback(async () => {
    try {
      const res = await api.get("/field-patches");
      if (res.data?.patches && res.data.patches.length > 0) {
        setPatches(res.data.patches);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(res.data.patches));
      }
    } catch (err) {
      console.warn("Could not fetch backend patches:", err.message);
    }
  }, []);

  useEffect(() => {
    fetchStaffList();
    fetchPatches();
  }, [fetchStaffList, fetchPatches]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(patches));
  }, [patches]);

  // 1. Create or Edit Field Patch (Admin / Manager)
  const handleSavePatch = async (e) => {
    e.preventDefault();
    if (!patchForm.name || !patchForm.landmark) return;

    const selectedStaff = staffList.find((s) => s._id === patchForm.assignedTo || s.name === patchForm.assignedTo);
    const workerName = selectedStaff ? selectedStaff.name : (patchForm.assignedToName || "Unassigned Worker");

    const payload = {
      name: patchForm.name.trim(),
      image: patchForm.image,
      crop: patchForm.crop,
      size: patchForm.size,
      landmark: patchForm.landmark.trim(),
      work: patchForm.work.trim(),
      workType: patchForm.workType,
      assignedTo: selectedStaff ? selectedStaff._id : undefined,
      assignedToName: workerName,
      status: patchForm.status,
    };

    if (editingPatch) {
      const patchId = editingPatch._id || editingPatch.id;
      try {
        await api.put(`/field-patches/${patchId}`, payload);
      } catch (err) {
        console.warn("Backend offline, editing patch locally:", err.message);
      }
      setPatches((prev) =>
        prev.map((item) => ((item._id === patchId || item.id === patchId) ? { ...item, ...payload } : item))
      );
    } else {
      try {
        const res = await api.post("/field-patches", payload);
        if (res.data?.patch) {
          setPatches([res.data.patch, ...patches]);
        }
      } catch (err) {
        console.warn("Backend offline, saving patch locally:", err.message);
        const newPatch = {
          _id: `patch-${Date.now()}`,
          id: `patch-${Date.now()}`,
          ...payload,
          createdAt: new Date().toISOString().split("T")[0],
        };
        setPatches([newPatch, ...patches]);
      }
    }

    setIsAddPatchModalOpen(false);
    setEditingPatch(null);
    resetPatchForm();
  };

  const resetPatchForm = () => {
    setPatchForm({
      name: "",
      image: PRESET_IMAGES[0],
      crop: "General Crop",
      size: "1.0 Acre",
      landmark: "",
      work: "Initial plot setup & soil preparation.",
      workType: "one_time",
      assignedTo: staffList[0]?._id || "",
      assignedToName: staffList[0]?.name || "Unassigned",
      status: "active",
    });
  };

  // 2. Assign / Update Work Task on Existing Patch (Admin / Manager)
  const handleAssignTaskToPatch = async (e) => {
    e.preventDefault();
    if (!assignTaskForm.patchId || !assignTaskForm.work) return;

    const patch = patches.find((p) => (p._id || p.id) === assignTaskForm.patchId);
    if (!patch) return;

    const selectedStaff = staffList.find((s) => s._id === assignTaskForm.assignedTo || s.name === assignTaskForm.assignedTo);
    const workerName = selectedStaff ? selectedStaff.name : (assignTaskForm.assignedToName || "Unassigned Worker");

    const payload = {
      work: assignTaskForm.work.trim(),
      workType: assignTaskForm.workType,
      assignedTo: selectedStaff ? selectedStaff._id : undefined,
      assignedToName: workerName,
      status: "in_progress", // reset status to in_progress when new task assigned
      submissionProof: undefined,
      submissionNotes: undefined,
      submittedAt: undefined,
    };

    const patchId = patch._id || patch.id;
    try {
      await api.put(`/field-patches/${patchId}`, payload);
    } catch (err) {
      console.warn("Backend offline, assigning task locally:", err.message);
    }

    setPatches((prev) =>
      prev.map((p) => ((p._id === patchId || p.id === patchId) ? { ...p, ...payload } : p))
    );

    setIsAssignTaskModalOpen(false);
    setAssignTaskForm({ patchId: "", assignedTo: "", assignedToName: "", work: "", workType: "one_time" });
  };

  // 3. Submit Completion Proof (Worker ONLY)
  const handleSubmitProof = async (e) => {
    e.preventDefault();
    if (!proofSubmitPatch) return;
    const patchId = proofSubmitPatch._id || proofSubmitPatch.id;

    const payload = {
      submissionProof: proofForm.submissionProof || proofSubmitPatch.image,
      submissionNotes: proofForm.submissionNotes.trim() || "Work completed as assigned.",
    };

    try {
      await api.put(`/field-patches/${patchId}/submit-proof`, payload);
    } catch (err) {
      console.warn("Backend offline, submitting proof locally:", err.message);
    }

    setPatches((prev) =>
      prev.map((p) =>
        (p._id === patchId || p.id === patchId)
          ? {
              ...p,
              ...payload,
              status: "submitted",
              submittedAt: new Date().toISOString(),
            }
          : p
      )
    );

    setProofSubmitPatch(null);
    setProofForm({ submissionProof: "", submissionNotes: "" });
  };

  // 4. Review Work Proof (ADMIN ONLY)
  const handleReviewSubmission = async (e) => {
    e.preventDefault();
    if (!reviewPatch) return;
    const patchId = reviewPatch._id || reviewPatch.id;

    const payload = {
      action: reviewForm.action,
      reviewNote: reviewForm.reviewNote.trim(),
    };

    try {
      await api.put(`/field-patches/${patchId}/review`, payload);
    } catch (err) {
      console.warn("Backend offline, reviewing locally:", err.message);
    }

    const newStatus = reviewForm.action === "approve" ? "approved" : "declined";

    setPatches((prev) =>
      prev.map((p) =>
        (p._id === patchId || p.id === patchId)
          ? {
              ...p,
              status: newStatus,
              reviewNote: reviewForm.reviewNote,
              reviewedByName: user?.name || "Admin",
            }
          : p
      )
    );

    setReviewPatch(null);
    setReviewForm({ action: "approve", reviewNote: "" });
  };

  const handleDelete = async (patch) => {
    const id = patch._id || patch.id;
    if (confirm("Are you sure you want to delete this field patch?")) {
      try {
        await api.delete(`/field-patches/${id}`);
      } catch (err) {
        console.warn("Backend offline, deleting locally:", err.message);
      }
      setPatches((prev) => prev.filter((p) => (p._id || p.id) !== id));
    }
  };

  const handleFileUpload = (e, targetForm = "create") => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (targetForm === "create") {
          setPatchForm((prev) => ({ ...prev, image: reader.result }));
        } else if (targetForm === "proof") {
          setProofForm((prev) => ({ ...prev, submissionProof: reader.result }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Filtered Patches Logic
  const filteredPatches = patches.filter((p) => {
    const workerName = p.assignedToName || p.assignedTo?.name || "";
    const workerId = p.assignedTo?._id || p.assignedTo;

    // Tab Filter
    if (tabFilter === "my_assigned") {
      const isMine = workerId === user?._id || workerName.toLowerCase() === user?.name?.toLowerCase();
      if (!isMine) return false;
    } else if (tabFilter === "daily") {
      if (p.workType !== "daily") return false;
    } else if (tabFilter === "one_time") {
      if (p.workType !== "one_time") return false;
    } else if (tabFilter === "submitted") {
      if (p.status !== "submitted") return false;
    }

    // Status filter dropdown
    if (statusFilter !== "all" && p.status !== statusFilter) return false;

    // Search query
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.landmark.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.work.toLowerCase().includes(searchQuery.toLowerCase()) ||
      workerName.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesSearch;
  });

  // Calculate my assigned count
  const myAssignedCount = patches.filter(
    (p) =>
      p.assignedTo === user?._id ||
      p.assignedTo?._id === user?._id ||
      p.assignedToName?.toLowerCase() === user?.name?.toLowerCase()
  ).length;

  const pendingReviewCount = patches.filter((p) => p.status === "submitted").length;

  return (
    <div className="px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-5 max-w-7xl mx-auto">
      {/* Top Title & Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Layers className="w-6 h-6 text-farm-600" />
            Field Patches & Work Assignments
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Manage farm plots, assign daily or one-time tasks to staff, and review work proof.
          </p>
        </div>

        {isAdminOrManager && (
          <div className="flex flex-wrap sm:flex-nowrap gap-2 w-full sm:w-auto">
            <button
              onClick={() => {
                resetPatchForm();
                setEditingPatch(null);
                setIsAddPatchModalOpen(true);
              }}
              className="flex-1 sm:flex-none bg-farm-600 hover:bg-farm-700 text-white text-xs sm:text-sm font-semibold px-3.5 py-2.5 rounded-xl shadow-md transition flex items-center justify-center gap-1.5 active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Add Field Patch</span>
            </button>

            <button
              onClick={() => {
                if (patches.length === 0) {
                  alert("Please create at least one field patch first!");
                  return;
                }
                setAssignTaskForm({
                  patchId: patches[0]._id || patches[0].id,
                  assignedTo: staffList[0]?._id || "",
                  assignedToName: staffList[0]?.name || "",
                  work: patches[0].work || "",
                  workType: "one_time",
                });
                setIsAssignTaskModalOpen(true);
              }}
              className="flex-1 sm:flex-none bg-emerald-700 hover:bg-emerald-800 text-white text-xs sm:text-sm font-semibold px-3.5 py-2.5 rounded-xl shadow-md transition flex items-center justify-center gap-1.5 active:scale-95"
            >
              <Briefcase className="w-4 h-4" />
              <span>Assign Work Task</span>
            </button>
          </div>
        )}
      </div>

      {/* Tabs & Search Bar */}
      <div className="bg-white p-3 sm:p-4 rounded-xl border border-gray-200 shadow-sm space-y-3">
        {/* Quick Filter Tabs */}
        <div className="flex gap-1 overflow-x-auto pb-1 border-b border-gray-100 scrollbar-none">
          <button
            onClick={() => setTabFilter("all")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
              tabFilter === "all" ? "bg-farm-600 text-white shadow-xs" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            All Patches ({patches.length})
          </button>

          <button
            onClick={() => setTabFilter("my_assigned")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition flex items-center gap-1 ${
              tabFilter === "my_assigned" ? "bg-farm-600 text-white shadow-xs" : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            My Assigned ({myAssignedCount})
          </button>

          <button
            onClick={() => setTabFilter("daily")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition flex items-center gap-1 ${
              tabFilter === "daily" ? "bg-farm-600 text-white shadow-xs" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            <Repeat className="w-3.5 h-3.5 text-emerald-600" />
            Daily Work 🔁
          </button>

          <button
            onClick={() => setTabFilter("one_time")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition flex items-center gap-1 ${
              tabFilter === "one_time" ? "bg-farm-600 text-white shadow-xs" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            <Calendar className="w-3.5 h-3.5 text-amber-600" />
            One-Time Tasks 📌
          </button>

          {pendingReviewCount > 0 && (
            <button
              onClick={() => setTabFilter("submitted")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition flex items-center gap-1 ${
                tabFilter === "submitted" ? "bg-amber-500 text-white shadow-xs" : "bg-amber-100 text-amber-800 border border-amber-300 animate-pulse"
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              Pending Review ({pendingReviewCount}) 🟡
            </button>
          )}
        </div>

        {/* Search input */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search patch name, landmark, task or worker..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-50 border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-xs sm:text-sm focus:outline-none focus:border-farm-600 focus:bg-white transition"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-gray-50 border border-gray-300 text-xs rounded-lg px-3 py-2 focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active 🟢</option>
            <option value="in_progress">In Progress 🔄</option>
            <option value="submitted">Submitted 🟡</option>
            <option value="approved">Approved ✅</option>
            <option value="declined">Declined ❌</option>
          </select>
        </div>
      </div>

      {/* Field Patches Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredPatches.length === 0 ? (
          <div className="col-span-full bg-white p-8 text-center rounded-2xl border border-gray-200">
            <Layers className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="font-semibold text-gray-700 text-sm">No field patches found</p>
            <p className="text-xs text-gray-400 mt-1">Try creating a patch or changing filters.</p>
          </div>
        ) : (
          filteredPatches.map((patch) => {
            const workerName = patch.assignedToName || patch.assignedTo?.name || "Unassigned Worker";
            const workerId = patch.assignedTo?._id || patch.assignedTo;
            const isDaily = patch.workType === "daily";

            // Check if current user is the assigned non-admin worker
            const isAssignedToMe =
              !isAdmin &&
              (workerId === user?._id ||
                workerName.toLowerCase() === user?.name?.toLowerCase());

            return (
              <div
                key={patch._id || patch.id}
                className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition overflow-hidden flex flex-col justify-between"
              >
                <div>
                  {/* Image & Badges */}
                  <div className="relative h-48 w-full bg-gray-100 overflow-hidden group">
                    <img
                      src={patch.image}
                      alt={patch.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />

                    {/* Work Type Badge */}
                    <span className="absolute top-3 left-3 bg-black/60 text-white backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 border border-white/20">
                      {isDaily ? <Repeat className="w-3 h-3 text-emerald-400" /> : <Calendar className="w-3 h-3 text-yellow-300" />}
                      {isDaily ? "Daily Work 🔁" : "One-Time Task 📌"}
                    </span>

                    {/* Status Badge */}
                    <span
                      className={`absolute top-3 right-3 px-2.5 py-1 rounded-full text-[10px] font-extrabold capitalize shadow-md border ${
                        patch.status === "approved" || patch.status === "completed"
                          ? "bg-emerald-600 text-white border-emerald-400"
                          : patch.status === "submitted"
                          ? "bg-yellow-500 text-white border-yellow-400 animate-pulse"
                          : patch.status === "declined"
                          ? "bg-red-600 text-white border-red-400"
                          : patch.status === "in_progress"
                          ? "bg-blue-600 text-white border-blue-400"
                          : "bg-gray-700 text-white border-gray-500"
                      }`}
                    >
                      {patch.status === "submitted"
                        ? "Pending Review 🟡"
                        : patch.status === "approved"
                        ? "Approved ✅"
                        : patch.status === "declined"
                        ? "Declined ❌"
                        : patch.status === "in_progress"
                        ? "In Progress 🔄"
                        : "Active 🟢"}
                    </span>

                    {/* Title */}
                    <div className="absolute bottom-3 left-3 right-3 text-white">
                      <span className="text-[10px] font-medium bg-black/40 px-2 py-0.5 rounded backdrop-blur-sm">
                        {patch.crop || "Crop"} • {patch.size || "1 Acre"}
                      </span>
                      <h3 className="font-bold text-base leading-snug drop-shadow-sm mt-0.5">
                        {patch.name}
                      </h3>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-4 space-y-3 text-xs">
                    {/* Landmark */}
                    <div className="bg-farm-50/90 p-2.5 rounded-xl border border-farm-200/80 flex items-start gap-2 text-farm-900">
                      <MapPin className="w-4 h-4 text-farm-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-[10px] text-farm-800 uppercase tracking-wider">Landmark Location:</p>
                        <p className="text-farm-900 font-semibold">{patch.landmark}</p>
                      </div>
                    </div>

                    {/* Work Description */}
                    <div>
                      <p className="font-semibold text-gray-700 mb-0.5 flex items-center gap-1">
                        <FileText className="w-3.5 h-3.5 text-gray-400" />
                        Assigned Activity:
                      </p>
                      <p className="text-gray-600 leading-relaxed bg-gray-50 p-2 rounded-lg border border-gray-100">
                        {patch.work}
                      </p>
                    </div>

                    {/* Assigned Worker */}
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-gray-500 flex items-center gap-1">
                        <User className="w-3.5 h-3.5" /> Assigned Worker:
                      </span>
                      <span className="font-bold text-gray-900 bg-gray-100 px-2.5 py-1 rounded-lg border border-gray-200">
                        {workerName}
                      </span>
                    </div>

                    {/* Submitted Proof Details if present */}
                    {patch.submissionProof && (
                      <div className="bg-amber-50 p-2.5 rounded-xl border border-amber-200 space-y-1.5">
                        <p className="font-bold text-amber-900 flex items-center gap-1 text-[11px]">
                          <Camera className="w-3.5 h-3.5 text-amber-600" /> Submitted Proof of Work:
                        </p>
                        {patch.submissionNotes && (
                          <p className="text-amber-800 text-[11px]">"{patch.submissionNotes}"</p>
                        )}
                        <img
                          src={patch.submissionProof}
                          alt="Proof"
                          className="w-full h-28 object-cover rounded-lg border border-amber-300"
                        />
                      </div>
                    )}

                    {/* Review Feedback Note if declined/approved */}
                    {patch.reviewNote && (
                      <div className={`p-2.5 rounded-xl border text-[11px] ${
                        patch.status === "approved" ? "bg-emerald-50 border-emerald-200 text-emerald-900" : "bg-red-50 border-red-200 text-red-900"
                      }`}>
                        <p className="font-bold">Admin Review ({patch.reviewedByName || "Admin"}):</p>
                        <p className="mt-0.5">"{patch.reviewNote}"</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="p-3 bg-gray-50 border-t border-gray-100 flex flex-wrap items-center justify-between gap-2">
                  {/* WORKER PROOF SUBMIT BUTTON (Only shown to assigned worker or admin!) */}
                  {isAssignedToMe && patch.status !== "submitted" && patch.status !== "approved" && (
                    <button
                      onClick={() => {
                        setProofSubmitPatch(patch);
                        setProofForm({ submissionProof: patch.image, submissionNotes: "" });
                      }}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold px-3 py-1.5 rounded-lg shadow-sm transition flex items-center gap-1 active:scale-95"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      Submit Proof 📷
                    </button>
                  )}

                  {/* ADMIN ONLY REVIEW BUTTONS (Approve / Decline) */}
                  {isAdmin && patch.status === "submitted" && (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          setReviewPatch(patch);
                          setReviewForm({ action: "approve", reviewNote: "" });
                        }}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg shadow-sm transition flex items-center gap-1"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Approve ✅
                      </button>
                      <button
                        onClick={() => {
                          setReviewPatch(patch);
                          setReviewForm({ action: "decline", reviewNote: "" });
                        }}
                        className="bg-red-50 hover:bg-red-100 text-red-700 text-[11px] font-bold px-2.5 py-1.5 rounded-lg border border-red-200 transition flex items-center gap-1"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        Decline ❌
                      </button>
                    </div>
                  )}

                  {/* Admin / Manager Edit & Delete Controls */}
                  {isAdminOrManager && (
                    <div className="flex items-center gap-1 ml-auto">
                      <button
                        onClick={() => openEditModal(patch)}
                        className="p-1.5 text-gray-600 hover:text-farm-600 rounded-lg hover:bg-gray-200 transition"
                        title="Edit patch"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(patch)}
                        className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-gray-200 transition"
                        title="Delete patch"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal 1: Add or Edit Field Patch (Admin / Manager) */}
      {isAddPatchModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
                <Layers className="w-5 h-5 text-farm-600" />
                {editingPatch ? "Edit Field Patch" : "Add New Field Patch"}
              </h3>
              <button onClick={() => setIsAddPatchModalOpen(false)} className="text-gray-400">✕</button>
            </div>

            <form onSubmit={handleSavePatch} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-gray-700 block mb-1">Patch Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. North Plot - Wheat Field A"
                  value={patchForm.name}
                  onChange={(e) => setPatchForm({ ...patchForm, name: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-farm-600 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">Crop / Purpose</label>
                  <input
                    type="text"
                    placeholder="e.g. Wheat, Tomato"
                    value={patchForm.crop}
                    onChange={(e) => setPatchForm({ ...patchForm, crop: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-farm-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-semibold text-gray-700 block mb-1">Plot Size</label>
                  <input
                    type="text"
                    placeholder="e.g. 2.5 Acres"
                    value={patchForm.size}
                    onChange={(e) => setPatchForm({ ...patchForm, size: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-farm-600 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-gray-700 block mb-1">Landmark Location *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Behind Gate 2 Solar Borewell"
                  value={patchForm.landmark}
                  onChange={(e) => setPatchForm({ ...patchForm, landmark: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-farm-600 focus:outline-none"
                />
              </div>

              {/* Upload Cover Photo */}
              <div>
                <label className="font-semibold text-gray-700 block mb-1">Plot Cover Photo</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileUpload(e, "create")}
                  className="w-full text-xs text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-farm-50 file:text-farm-700"
                />

                <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
                  {PRESET_IMAGES.map((imgUrl, idx) => (
                    <img
                      key={idx}
                      src={imgUrl}
                      alt="Sample"
                      onClick={() => setPatchForm({ ...patchForm, image: imgUrl })}
                      className={`w-14 h-14 object-cover rounded-lg cursor-pointer border-2 transition ${
                        patchForm.image === imgUrl ? "border-farm-600 scale-105" : "border-transparent opacity-60"
                      }`}
                    />
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddPatchModalOpen(false)}
                  className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-farm-600 text-white py-2 rounded-xl text-xs font-semibold hover:bg-farm-700 shadow-md"
                >
                  {editingPatch ? "Update Patch" : "Save Field Patch"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Assign Task to Existing Patch (Admin / Manager) */}
      {isAssignTaskModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-emerald-600" />
                Assign Work Task to Field Patch
              </h3>
              <button onClick={() => setIsAssignTaskModalOpen(false)} className="text-gray-400">✕</button>
            </div>

            <form onSubmit={handleAssignTaskToPatch} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-gray-700 block mb-1">Select Field Patch *</label>
                <select
                  value={assignTaskForm.patchId}
                  onChange={(e) => {
                    const p = patches.find((item) => (item._id || item.id) === e.target.value);
                    setAssignTaskForm({
                      ...assignTaskForm,
                      patchId: e.target.value,
                      work: p ? p.work : "",
                    });
                  }}
                  className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-emerald-600 focus:outline-none font-semibold text-gray-900"
                >
                  {patches.map((p) => (
                    <option key={p._id || p.id} value={p._id || p.id}>
                      {p.name} ({p.crop}) — {p.landmark}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-gray-700 block mb-1">Select Worker from Database *</label>
                <select
                  value={assignTaskForm.assignedTo}
                  onChange={(e) => {
                    const selected = staffList.find((s) => s._id === e.target.value);
                    setAssignTaskForm({
                      ...assignTaskForm,
                      assignedTo: e.target.value,
                      assignedToName: selected ? selected.name : "",
                    });
                  }}
                  className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-emerald-600 focus:outline-none"
                >
                  <option value="">Select Worker...</option>
                  {staffList.map((staff) => (
                    <option key={staff._id} value={staff._id}>
                      {staff.name} ({staff.role ? staff.role.replace("_", " ") : "Worker"}) {staff.mobile ? `- ${staff.mobile}` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">Work Frequency *</label>
                  <select
                    value={assignTaskForm.workType}
                    onChange={(e) => setAssignTaskForm({ ...assignTaskForm, workType: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-emerald-600 focus:outline-none font-semibold text-farm-900"
                  >
                    <option value="one_time">One-Time Task 📌</option>
                    <option value="daily">Daily Work 🔁</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-gray-700 block mb-1">Work Activity Instructions *</label>
                <textarea
                  rows="3"
                  required
                  placeholder="e.g. Weeding, liquid fertilizer spraying, drip irrigation check..."
                  value={assignTaskForm.work}
                  onChange={(e) => setAssignTaskForm({ ...assignTaskForm, work: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAssignTaskModalOpen(false)}
                  className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-xl text-xs font-semibold shadow-md"
                >
                  Assign Task ⚡
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Proof Submission Modal (Assigned Worker ONLY) */}
      {proofSubmitPatch && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
                <Camera className="w-5 h-5 text-emerald-600" />
                Submit Completion Proof
              </h3>
              <button onClick={() => setProofSubmitPatch(null)} className="text-gray-400">✕</button>
            </div>

            <div className="bg-farm-50 p-3 rounded-xl border border-farm-200 text-xs">
              <p className="font-bold text-farm-900 text-sm">{proofSubmitPatch.name}</p>
              <p className="text-farm-700 mt-0.5">Task: {proofSubmitPatch.work}</p>
            </div>

            <form onSubmit={handleSubmitProof} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-gray-700 block mb-1">Upload Photo Proof *</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileUpload(e, "proof")}
                  className="w-full text-xs text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700"
                />

                {proofForm.submissionProof && (
                  <div className="mt-2 h-32 rounded-xl overflow-hidden border border-gray-300">
                    <img src={proofForm.submissionProof} alt="Proof" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>

              <div>
                <label className="font-semibold text-gray-700 block mb-1">Completion Notes / Remarks</label>
                <textarea
                  rows="3"
                  placeholder="Explain work performed or any remarks for admin..."
                  value={proofForm.submissionNotes}
                  onChange={(e) => setProofForm({ ...proofForm, submissionNotes: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setProofSubmitPatch(null)}
                  className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-xl text-xs font-bold shadow-md"
                >
                  Submit for Approval 🚀
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Review Modal (ADMIN ONLY) */}
      {reviewPatch && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-farm-600" />
                Admin Proof Review
              </h3>
              <button onClick={() => setReviewPatch(null)} className="text-gray-400">✕</button>
            </div>

            <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 text-xs space-y-1">
              <p className="font-bold text-gray-900 text-sm">{reviewPatch.name}</p>
              <p className="text-gray-600">Worker: <strong>{reviewPatch.assignedToName}</strong></p>
              <p className="text-gray-600">Notes: "{reviewPatch.submissionNotes}"</p>
            </div>

            <form onSubmit={handleReviewSubmission} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-gray-700 block mb-1">Review Decision</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setReviewForm({ ...reviewForm, action: "approve" })}
                    className={`py-2 px-3 rounded-xl font-bold text-xs border transition ${
                      reviewForm.action === "approve"
                        ? "bg-emerald-600 text-white border-emerald-600 shadow"
                        : "bg-gray-50 text-gray-700 border-gray-200"
                    }`}
                  >
                    Approve ✅
                  </button>
                  <button
                    type="button"
                    onClick={() => setReviewForm({ ...reviewForm, action: "decline" })}
                    className={`py-2 px-3 rounded-xl font-bold text-xs border transition ${
                      reviewForm.action === "decline"
                        ? "bg-red-600 text-white border-red-600 shadow"
                        : "bg-gray-50 text-gray-700 border-gray-200"
                    }`}
                  >
                    Decline ❌
                  </button>
                </div>
              </div>

              <div>
                <label className="font-semibold text-gray-700 block mb-1">Review Feedback / Notes</label>
                <textarea
                  rows="2"
                  placeholder={
                    reviewForm.action === "approve"
                      ? "Work verified clean and complete."
                      : "Please write reason for declining..."
                  }
                  value={reviewForm.reviewNote}
                  onChange={(e) => setReviewForm({ ...reviewForm, reviewNote: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-farm-600 focus:outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setReviewPatch(null)}
                  className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`flex-1 text-white py-2 rounded-xl text-xs font-bold shadow-md transition ${
                    reviewForm.action === "approve" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700"
                  }`}
                >
                  Confirm Review
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
