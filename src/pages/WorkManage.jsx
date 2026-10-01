import React, { useEffect, useState, useCallback } from "react";
import api from "../api/axios.js";
import { useAuth } from "../context/AuthContext.jsx";
import Pagination from "../components/Pagination.jsx";

const IST = "Asia/Kolkata";
const PAGE_SIZE = 12;

const TIME_SLOTS_7AM_8PM = [
  "07:00 AM - 08:00 AM",
  "08:00 AM - 09:00 AM",
  "09:00 AM - 10:00 AM",
  "10:00 AM - 11:00 AM",
  "11:00 AM - 12:00 PM",
  "12:00 PM - 01:00 PM",
  "01:00 PM - 02:00 PM",
  "02:00 PM - 03:00 PM",
  "03:00 PM - 04:00 PM",
  "04:00 PM - 05:00 PM",
  "05:00 PM - 06:00 PM",
  "06:00 PM - 07:00 PM",
  "07:00 PM - 08:00 PM",
];

const fmtDate = (iso) =>
  new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: IST });

const fmtTime = (iso) =>
  iso ? new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", timeZone: IST }) : "—";

const fmtDateInput = (d) => {
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, "0"), day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const statusStyle = {
  assigned: "bg-gray-100 text-gray-700 border border-gray-200",
  in_progress: "bg-blue-50 text-blue-700 border border-blue-200 font-semibold",
  submitted: "bg-amber-50 text-amber-700 border border-amber-200 font-semibold",
  approved: "bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold",
  declined: "bg-rose-50 text-rose-700 border border-rose-200 font-semibold",
};

const statusLabel = {
  assigned: "Not Started ⏳",
  in_progress: "In Progress 🔄",
  submitted: "Pending Review 🟡",
  approved: "Approved ✅",
  declined: "Declined ❌",
};

const TABS = ["Staff Daily Timesheets", "Review Queue", "Previous Work History", "Assign & Schedule", "Daily Rules"];

const categoryIcon = {
  Cleaning: "🧹",
  Milking: "🥛",
  Cropping: "🌾",
  Feeding: "🌿",
  Medication: "💉",
  "Hen/Chicken Batch Weight": "🐔",
  "Hen/Chicken Batch": "🐔",
};

const roleLabel = (role) => (role || "").split("_").map((w) => w[0]?.toUpperCase() + w.slice(1)).join(" ");

const WorkManage = () => {
  const { user } = useAuth();
  const now = new Date();
  const isPrivileged = ["admin", "manager_operations"].includes(user?.role);

  const [tab, setTab] = useState("Staff Daily Timesheets");
  const [categories, setCategories] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Staff Tabs selection for Excel Timesheet (ALL or staffId)
  const [selectedStaffId, setSelectedStaffId] = useState("ALL");

  // Review queue + all tasks + timesheets
  const [tasks, setTasks] = useState([]);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [filters, setFilters] = useState({ date: fmtDateInput(now), userId: "", status: "", category: "" });
  const [reviewNoteDraft, setReviewNoteDraft] = useState({});
  const [reviewLoadingId, setReviewLoadingId] = useState(null);
  const [page, setPage] = useState(1);

  // Draft state for Excel cells inline edits: timeSlot -> { category, notes }
  const [excelDraft, setExcelDraft] = useState({});
  const [savingSlot, setSavingSlot] = useState(null);

  // Media Modal (for full photo + video preview)
  const [mediaModal, setMediaModal] = useState(null);

  // Quick Add Schedule Item Modal
  const [addScheduleModalOpen, setAddScheduleModalOpen] = useState(false);
  const [quickScheduleForm, setQuickScheduleForm] = useState({
    staffIds: [],
    category: "",
    customCategory: "",
    timeLabel: "",
    session: "Morning",
    date: fmtDateInput(now),
    notes: "",
  });
  const [quickScheduleSubmitting, setQuickScheduleSubmitting] = useState(false);

  // Assign task form (bulk tab)
  const [assignForm, setAssignForm] = useState({ categories: [], assignedTo: [], date: fmtDateInput(now), notes: "", timeLabel: "" });
  const [assignSubmitting, setAssignSubmitting] = useState(false);

  // Custom Category
  const [newCategory, setNewCategory] = useState("");
  const [categorySubmitting, setCategorySubmitting] = useState(false);

  // Daily rules
  const [rules, setRules] = useState([]);
  const [rulesLoading, setRulesLoading] = useState(true);
  const [ruleForm, setRuleForm] = useState({ categories: [], assignedTo: [], notes: "" });
  const [ruleSubmitting, setRuleSubmitting] = useState(false);

  // Generator trigger
  const [genLoading, setGenLoading] = useState(false);

  const loadStaticData = useCallback(async () => {
    try {
      const [catRes, staffRes] = await Promise.all([
        api.get("/work/categories"),
        api.get("/users"),
      ]);
      setCategories(catRes.data.categories || []);
      setStaffList(staffRes.data.users || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load categories/staff");
    }
  }, []);

  const loadTasks = useCallback(async (activeFilters = {}) => {
    setTasksLoading(true);
    try {
      const params = new URLSearchParams();
      Object.entries(activeFilters).forEach(([k, v]) => { if (v) params.set(k, v); });
      const res = await api.get(`/work?${params.toString()}`);
      setTasks(res.data.tasks || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load tasks");
    } finally {
      setTasksLoading(false);
    }
  }, []);

  const loadRules = useCallback(async () => {
    setRulesLoading(true);
    try {
      const res = await api.get("/work/recurring");
      setRules(res.data.rules || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load daily rules");
    } finally {
      setRulesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isPrivileged) return;
    loadStaticData();
    loadTasks({ date: filters.date });
    loadRules();
  }, [isPrivileged, loadStaticData, loadTasks, loadRules]);

  if (!isPrivileged) {
    return (
      <div className="px-4 md:px-8 py-6 md:py-8">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 text-center">
          <p className="text-3xl mb-2">🔒</p>
          <p className="font-semibold text-gray-800">Not Authorized</p>
          <p className="text-sm text-gray-500 mt-1">Only admin and operations managers can access Work Management.</p>
        </div>
      </div>
    );
  }

  const applyFilters = () => {
    setPage(1);
    loadTasks(filters);
  };

  const handleReview = async (task, action) => {
    const note = reviewNoteDraft[task._id] || "";
    if (action === "decline" && !note.trim()) {
      alert("Please write a reason before declining task");
      return;
    }
    setReviewLoadingId(task._id);
    try {
      await api.put(`/work/${task._id}/review`, { action, note });
      loadTasks(filters);
    } catch (err) {
      alert(err.response?.data?.message || `Failed to ${action} task`);
    } finally {
      setReviewLoadingId(null);
    }
  };

  const handleDeleteTask = async (task) => {
    if (!confirm(`Are you sure you want to remove "${task.category}" for ${task.assignedTo?.name || "staff"}?`)) return;
    try {
      await api.delete(`/work/${task._id}`);
      setSuccessMsg("Schedule item removed");
      setTimeout(() => setSuccessMsg(""), 3000);
      loadTasks(filters);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to delete task");
    }
  };

  // Save Excel Slot inline from 7 AM to 8 PM
  const handleSaveExcelSlot = async (slotTime, staffId) => {
    const draftKey = `${staffId}_${slotTime}`;
    const draft = excelDraft[draftKey] || {};
    const catName = draft.category;
    if (!catName || !catName.trim()) {
      alert("Please select or enter a Category for this time slot.");
      return;
    }

    setSavingSlot(draftKey);
    try {
      const res = await api.post("/work/assign", {
        categories: [catName.trim()],
        assignedTo: [staffId],
        date: filters.date || fmtDateInput(now),
        timeLabel: slotTime,
        notes: draft.notes || "",
      });
      setSuccessMsg(`✅ ${res.data.message}`);
      setTimeout(() => setSuccessMsg(""), 3000);
      loadTasks(filters);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to save slot");
    } finally {
      setSavingSlot(null);
    }
  };

  const handleQuickScheduleSubmit = async (e) => {
    e.preventDefault();
    const catName = quickScheduleForm.category === "OTHER" ? quickScheduleForm.customCategory : quickScheduleForm.category;
    if (!catName.trim() || quickScheduleForm.staffIds.length === 0 || !quickScheduleForm.date) {
      alert("Please select staff, category, and date.");
      return;
    }
    setQuickScheduleSubmitting(true);
    try {
      const res = await api.post("/work/assign", {
        categories: [catName.trim()],
        assignedTo: quickScheduleForm.staffIds,
        date: quickScheduleForm.date,
        timeLabel: quickScheduleForm.timeLabel,
        session: quickScheduleForm.session,
        notes: quickScheduleForm.notes,
      });
      setSuccessMsg(`✅ ${res.data.message}`);
      setTimeout(() => setSuccessMsg(""), 4000);
      setAddScheduleModalOpen(false);
      setQuickScheduleForm({
        staffIds: [],
        category: "",
        customCategory: "",
        timeLabel: "",
        session: "Morning",
        date: fmtDateInput(now),
        notes: "",
      });
      loadTasks(filters);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to create schedule item");
    } finally {
      setQuickScheduleSubmitting(false);
    }
  };

  const handleGenerateScheduleTasks = async () => {
    setGenLoading(true);
    try {
      const res = await api.post("/schedule/generate", { date: filters.date || fmtDateInput(now) });
      setSuccessMsg(`⚡ ${res.data.message}`);
      setTimeout(() => setSuccessMsg(""), 5000);
      loadTasks(filters);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to generate schedule tasks");
    } finally {
      setGenLoading(false);
    }
  };

  const submitAssign = async (e) => {
    e.preventDefault();
    setAssignSubmitting(true);
    try {
      const res = await api.post("/work/assign", assignForm);
      setSuccessMsg(`✅ ${res.data.message}`);
      setTimeout(() => setSuccessMsg(""), 4000);
      setAssignForm({ categories: [], assignedTo: [], date: fmtDateInput(now), notes: "", timeLabel: "" });
      loadTasks(filters);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to assign task");
    } finally {
      setAssignSubmitting(false);
    }
  };

  const submitCategory = async (e) => {
    e.preventDefault();
    if (!newCategory.trim()) return;
    setCategorySubmitting(true);
    try {
      await api.post("/work/categories", { name: newCategory.trim() });
      setNewCategory("");
      loadStaticData();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to add category");
    } finally {
      setCategorySubmitting(false);
    }
  };

  const submitRule = async (e) => {
    e.preventDefault();
    setRuleSubmitting(true);
    try {
      const res = await api.post("/work/recurring", ruleForm);
      alert(res.data.message);
      setRuleForm({ categories: [], assignedTo: [], notes: "" });
      loadRules();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to create daily rule");
    } finally {
      setRuleSubmitting(false);
    }
  };

  const toggleRule = async (rule) => {
    try {
      await api.put(`/work/recurring/${rule._id}`, { isActive: !rule.isActive });
      loadRules();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to update rule");
    }
  };

  const deleteRule = async (rule) => {
    if (!confirm(`Remove daily "${rule.category}" assignment for ${rule.assignedTo?.name}?`)) return;
    try {
      await api.delete(`/work/recurring/${rule._id}`);
      loadRules();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to remove rule");
    }
  };

  const pendingTasks = tasks.filter((t) => t.status === "submitted");
  const historyTasks = tasks.filter((t) => ["approved", "declined"].includes(t.status));

  const visibleTasks =
    tab === "Review Queue"
      ? pendingTasks
      : tab === "Previous Work History"
      ? historyTasks
      : tasks;

  const pagedVisibleTasks = visibleTasks.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Task Stats for top summary bar
  const totalCount = tasks.length;
  const inProgressCount = tasks.filter((t) => t.status === "in_progress").length;
  const pendingReviewCount = tasks.filter((t) => t.status === "submitted").length;
  const approvedCount = tasks.filter((t) => t.status === "approved").length;
  const declinedCount = tasks.filter((t) => t.status === "declined").length;

  const selectedStaffObj = staffList.find((s) => s._id === selectedStaffId);

  return (
    <div className="px-4 md:px-8 py-6 md:py-8 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Work & Schedule Management</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage staff daily time schedules (Morning 7 AM - Evening 8 PM), timesheets, & review work proof
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setAddScheduleModalOpen(true)}
            className="bg-farm-600 hover:bg-farm-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-sm transition flex items-center gap-1.5"
          >
            <span>+</span> Add Time Schedule Item
          </button>
          <button
            onClick={handleGenerateScheduleTasks}
            disabled={genLoading}
            className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-sm transition flex items-center gap-1.5"
          >
            <span>⚡</span> {genLoading ? "Generating..." : "Auto-Generate Daily Tasks"}
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="mb-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium rounded-xl px-4 py-3 shadow-xs flex items-center justify-between">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg("")} className="text-emerald-500 hover:text-emerald-700 font-bold">&times;</button>
        </div>
      )}

      {error && (
        <div className="mb-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium rounded-xl px-4 py-3 shadow-xs">
          {error}
        </div>
      )}

      {/* Primary Section Tabs */}
      <div className="flex gap-1.5 mb-6 border-b border-gray-200 overflow-x-auto pb-0.5">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setPage(1); }}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition whitespace-nowrap rounded-t-lg ${
              tab === t
                ? "border-farm-600 text-farm-700 bg-farm-50/50"
                : "border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-50"
            }`}
          >
            {t === "Staff Daily Timesheets" && "🗓️ "}
            {t === "Review Queue" && "📥 "}
            {t === "Previous Work History" && "📜 "}
            {t === "Assign & Schedule" && "➕ "}
            {t === "Daily Rules" && "🔄 "}
            {t}
            {t === "Review Queue" && pendingTasks.length > 0 ? (
              <span className="ml-1.5 bg-amber-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                {pendingTasks.length}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {/* TAB 1: Staff Daily Timesheets (Excel Format 7:00 AM to 8:00 PM) */}
      {(tab === "Staff Daily Timesheets" || tab === "Review Queue" || tab === "Previous Work History") && (
        <>
          {/* STAFF TABS ON TOP */}
          <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs p-4 mb-6">
            <div className="flex items-center justify-between gap-3 mb-3">
              <span className="text-xs font-bold text-gray-700 uppercase tracking-wide">
                👥 Select Staff Member Schedule (Morning 7:00 AM – Evening 8:00 PM)
              </span>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-gray-500">Date:</span>
                <input
                  type="date"
                  value={filters.date}
                  onChange={(e) => {
                    setFilters({ ...filters, date: e.target.value });
                    loadTasks({ date: e.target.value });
                  }}
                  className="text-xs font-semibold border border-gray-300 rounded-xl px-3 py-1.5 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-farm-500"
                />
              </div>
            </div>

            {/* Scrollable Staff Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-1">
              <button
                onClick={() => setSelectedStaffId("ALL")}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap border ${
                  selectedStaffId === "ALL"
                    ? "bg-farm-600 text-white border-farm-600 shadow-xs"
                    : "bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-200"
                }`}
              >
                <span>📊</span> All Staff Master Grid
              </button>
              {staffList.map((s) => (
                <button
                  key={s._id}
                  onClick={() => setSelectedStaffId(s._id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap border ${
                    selectedStaffId === s._id
                      ? "bg-farm-600 text-white border-farm-600 shadow-xs"
                      : "bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-200"
                  }`}
                >
                  <span>👤</span> {s.name} <span className="text-[10px] opacity-80">({roleLabel(s.role)})</span>
                </button>
              ))}
            </div>
          </div>

          {/* Timesheet Summary KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
            <div className="bg-white rounded-xl border border-gray-200 p-3.5 shadow-xs">
              <p className="text-[11px] font-medium text-gray-500">Total Tasks</p>
              <p className="text-xl font-bold text-gray-800 mt-0.5">{totalCount}</p>
            </div>
            <div className="bg-blue-50/60 rounded-xl border border-blue-100 p-3.5 shadow-xs">
              <p className="text-[11px] font-medium text-blue-700">In Progress 🔄</p>
              <p className="text-xl font-bold text-blue-800 mt-0.5">{inProgressCount}</p>
            </div>
            <div className="bg-amber-50/60 rounded-xl border border-amber-100 p-3.5 shadow-xs">
              <p className="text-[11px] font-medium text-amber-700">Pending Review 🟡</p>
              <p className="text-xl font-bold text-amber-800 mt-0.5">{pendingReviewCount}</p>
            </div>
            <div className="bg-emerald-50/60 rounded-xl border border-emerald-100 p-3.5 shadow-xs">
              <p className="text-[11px] font-medium text-emerald-700">Approved ✅</p>
              <p className="text-xl font-bold text-emerald-800 mt-0.5">{approvedCount}</p>
            </div>
            <div className="bg-rose-50/60 rounded-xl border border-rose-100 p-3.5 shadow-xs col-span-2 sm:col-span-1">
              <p className="text-[11px] font-medium text-rose-700">Declined ❌</p>
              <p className="text-xl font-bold text-rose-800 mt-0.5">{declinedCount}</p>
            </div>
          </div>

          {/* SINGLE STAFF EXCEL TIMESHEET VIEW (7:00 AM to 8:00 PM) */}
          {selectedStaffId !== "ALL" ? (
            <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs overflow-hidden mb-6">
              <div className="bg-gray-50/90 px-5 py-4 border-b border-gray-200 flex items-center justify-between">
                <div>
                  <h2 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                    <span className="text-lg">👤</span> {selectedStaffObj?.name}'s Excel Daily Timesheet
                  </h2>
                  <p className="text-xs text-gray-500">
                    Schedule slots from Morning 07:00 AM to Evening 08:00 PM ({filters.date})
                  </p>
                </div>
                <button
                  onClick={() => setAddScheduleModalOpen(true)}
                  className="bg-farm-600 hover:bg-farm-700 text-white text-xs font-semibold px-3.5 py-2 rounded-xl transition"
                >
                  + Add Custom Slot
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-100/70 border-b border-gray-200 text-[11px] font-bold text-gray-600 uppercase tracking-wider">
                      <th className="px-4 py-3 min-w-[170px] border-r border-gray-200">⏰ Time Slot</th>
                      <th className="px-4 py-3 min-w-[220px] border-r border-gray-200">📋 Category / Task</th>
                      <th className="px-4 py-3 min-w-[240px] border-r border-gray-200">📝 Work Instructions</th>
                      <th className="px-4 py-3 text-center min-w-[140px] border-r border-gray-200">Live Status</th>
                      <th className="px-4 py-3 min-w-[200px] border-r border-gray-200">Submitted Proof & Remark</th>
                      <th className="px-4 py-3 text-right min-w-[130px]">Quick Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 text-xs">
                    {TIME_SLOTS_7AM_8PM.map((slotTime) => {
                      // Find existing task for this staff member in this time slot
                      const task = tasks.find(
                        (t) =>
                          String(t.assignedTo?._id || t.assignedTo) === String(selectedStaffId) &&
                          t.timeLabel === slotTime
                      );

                      const draftKey = `${selectedStaffId}_${slotTime}`;
                      const currentDraft = excelDraft[draftKey] || {
                        category: task?.category || "",
                        notes: task?.notes || "",
                      };

                      return (
                        <tr key={slotTime} className="hover:bg-blue-50/30 transition-colors">
                          {/* Time Slot Column */}
                          <td className="px-4 py-3 font-bold text-gray-800 bg-gray-50/50 border-r border-gray-200 whitespace-nowrap">
                            {slotTime}
                          </td>

                          {/* Category Cell (Excel Input / Select) */}
                          <td className="px-3 py-2 border-r border-gray-200">
                            {task ? (
                              <div className="flex items-center gap-2 font-bold text-gray-900">
                                <span className="text-base">{categoryIcon[task.category] || "📋"}</span>
                                <span>{task.category}</span>
                              </div>
                            ) : (
                              <select
                                value={currentDraft.category}
                                onChange={(e) =>
                                  setExcelDraft({
                                    ...excelDraft,
                                    [draftKey]: { ...currentDraft, category: e.target.value },
                                  })
                                }
                                className="w-full text-xs border border-gray-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-farm-500 bg-white"
                              >
                                <option value="">— Select Category —</option>
                                {categories.map((c) => (
                                  <option key={c._id} value={c.name}>{c.name}</option>
                                ))}
                              </select>
                            )}
                          </td>

                          {/* Instructions Cell */}
                          <td className="px-3 py-2 border-r border-gray-200">
                            {task ? (
                              <span className="text-gray-700">{task.notes || "—"}</span>
                            ) : (
                              <input
                                type="text"
                                placeholder="Enter instructions..."
                                value={currentDraft.notes}
                                onChange={(e) =>
                                  setExcelDraft({
                                    ...excelDraft,
                                    [draftKey]: { ...currentDraft, notes: e.target.value },
                                  })
                                }
                                className="w-full text-xs border border-gray-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-farm-500 bg-white"
                              />
                            )}
                          </td>

                          {/* Live Status Cell */}
                          <td className="px-4 py-3 text-center border-r border-gray-200 whitespace-nowrap">
                            {task ? (
                              <span className={`inline-block text-[11px] px-2.5 py-1 rounded-full ${statusStyle[task.status]}`}>
                                {statusLabel[task.status]}
                              </span>
                            ) : (
                              <span className="text-gray-300 text-[11px] italic">Not Assigned</span>
                            )}
                          </td>

                          {/* Submitted Proof & Remark Cell */}
                          <td className="px-4 py-3 border-r border-gray-200">
                            {task?.proof && (task.proof.photoUrl || task.proof.videoUrl) ? (
                              <div className="space-y-1">
                                <div className="flex items-center gap-1.5">
                                  {task.proof.photoUrl && (
                                    <button
                                      type="button"
                                      onClick={() => setMediaModal({ photoUrl: task.proof.photoUrl, videoUrl: task.proof.videoUrl, taskTitle: task.category, staffName: selectedStaffObj?.name })}
                                      className="text-[10px] text-farm-700 bg-farm-50 border border-farm-200 px-2 py-0.5 rounded font-semibold"
                                    >
                                      📷 Photo
                                    </button>
                                  )}
                                  {task.proof.videoUrl && (
                                    <button
                                      type="button"
                                      onClick={() => setMediaModal({ photoUrl: task.proof.photoUrl, videoUrl: task.proof.videoUrl, taskTitle: task.category, staffName: selectedStaffObj?.name })}
                                      className="text-[10px] text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded font-semibold"
                                    >
                                      🎥 Video
                                    </button>
                                  )}
                                </div>
                                {(task.userRemark || task.sampleWeight) && (
                                  <p className="text-[10px] text-gray-700 bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded">
                                    💬 {task.userRemark || task.sampleWeight}
                                  </p>
                                )}
                              </div>
                            ) : (
                              <span className="text-gray-300 text-[11px] italic">—</span>
                            )}
                          </td>

                          {/* Quick Actions Cell */}
                          <td className="px-4 py-3 text-right whitespace-nowrap">
                            {task ? (
                              <div className="flex items-center justify-end gap-2">
                                {task.status === "submitted" && (
                                  <button
                                    onClick={() => handleReview(task, "approve")}
                                    className="bg-emerald-600 text-white text-[10px] font-bold px-2 py-1 rounded"
                                  >
                                    Approve
                                  </button>
                                )}
                                <button
                                  onClick={() => handleDeleteTask(task)}
                                  className="text-gray-400 hover:text-rose-600 text-sm"
                                  title="Clear / Delete Task"
                                >
                                  🗑️
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => handleSaveExcelSlot(slotTime, selectedStaffId)}
                                disabled={savingSlot === draftKey || !currentDraft.category}
                                className="bg-farm-600 hover:bg-farm-700 disabled:opacity-40 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg transition"
                              >
                                {savingSlot === draftKey ? "Saving..." : "💾 Save Slot"}
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* ALL STAFF MASTER EXCEL MATRIX GRID */
            <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs overflow-hidden mb-6">
              <div className="bg-gray-50/90 px-5 py-4 border-b border-gray-200">
                <h2 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                  <span>📊</span> Master Staff Excel Grid (Morning 7:00 AM – Evening 8:00 PM)
                </h2>
                <p className="text-xs text-gray-500">Live view of all staff time slots side by side</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-100/70 border-b border-gray-200 text-[11px] font-bold text-gray-600 uppercase">
                      <th className="px-4 py-3 min-w-[170px] border-r border-gray-200 sticky left-0 bg-gray-100 z-10">
                        ⏰ Time Slot
                      </th>
                      {staffList.map((s) => (
                        <th key={s._id} className="px-4 py-3 min-w-[180px] border-r border-gray-200">
                          <div>
                            <p className="font-bold text-gray-900">{s.name}</p>
                            <p className="text-[10px] text-gray-400 font-normal">{roleLabel(s.role)}</p>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 text-xs">
                    {TIME_SLOTS_7AM_8PM.map((slotTime) => (
                      <tr key={slotTime} className="hover:bg-blue-50/30 transition-colors">
                        <td className="px-4 py-3 font-bold text-gray-800 bg-gray-50/80 border-r border-gray-200 sticky left-0 z-10 whitespace-nowrap">
                          {slotTime}
                        </td>

                        {staffList.map((s) => {
                          const task = tasks.find(
                            (t) =>
                              String(t.assignedTo?._id || t.assignedTo) === String(s._id) &&
                              t.timeLabel === slotTime
                          );

                          return (
                            <td key={s._id} className="px-3 py-2.5 border-r border-gray-200 align-top">
                              {task ? (
                                <div className="p-2 rounded-xl bg-farm-50/70 border border-farm-200 space-y-1">
                                  <div className="flex items-center justify-between">
                                    <span className="font-bold text-gray-900 text-xs">
                                      {categoryIcon[task.category] || "📋"} {task.category}
                                    </span>
                                    <button
                                      onClick={() => handleDeleteTask(task)}
                                      className="text-gray-300 hover:text-rose-600 text-xs"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                  <span className={`inline-block text-[9px] px-1.5 py-0.5 rounded-md ${statusStyle[task.status]}`}>
                                    {statusLabel[task.status]}
                                  </span>
                                </div>
                              ) : (
                                <button
                                  onClick={() => {
                                    setSelectedStaffId(s._id);
                                    setAddScheduleModalOpen(true);
                                    setQuickScheduleForm({
                                      ...quickScheduleForm,
                                      staffIds: [s._id],
                                      timeLabel: slotTime,
                                    });
                                  }}
                                  className="w-full py-2 border border-dashed border-gray-200 hover:border-farm-400 rounded-xl text-gray-400 hover:text-farm-600 text-[11px] font-medium transition"
                                >
                                  + Assign
                                </button>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* TAB 4: Assign & Schedule Task (Bulk Form) */}
      {tab === "Assign & Schedule" && (
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs p-6 mb-6">
            <h2 className="text-base font-bold text-gray-800 mb-1">Create Time Schedule & Tasks</h2>
            <p className="text-xs text-gray-500 mb-5">Assign specific work categories and time slots to staff members.</p>

            <form onSubmit={submitAssign} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-2">
                  Select Work Category(ies)
                </label>
                <div className="flex flex-wrap gap-2">
                  {categories.map((c) => {
                    const checked = assignForm.categories.includes(c.name);
                    return (
                      <button
                        type="button"
                        key={c._id}
                        onClick={() => setAssignForm({
                          ...assignForm,
                          categories: checked
                            ? assignForm.categories.filter((x) => x !== c.name)
                            : [...assignForm.categories, c.name],
                        })}
                        className={`text-xs font-semibold px-3.5 py-2 rounded-xl border transition ${
                          checked
                            ? "bg-farm-600 border-farm-600 text-white shadow-xs"
                            : "bg-white border-gray-300 text-gray-700 hover:border-farm-400"
                        }`}
                      >
                        {categoryIcon[c.name] || "📋"} {c.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-2">
                  Select Staff Member(s)
                </label>
                <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-xl divide-y divide-gray-100 bg-gray-50/50">
                  {staffList.map((s) => {
                    const checked = assignForm.assignedTo.includes(s._id);
                    return (
                      <label key={s._id} className="flex items-center gap-2.5 px-3.5 py-2.5 text-xs cursor-pointer hover:bg-white transition">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => setAssignForm({
                            ...assignForm,
                            assignedTo: checked ? assignForm.assignedTo.filter((x) => x !== s._id) : [...assignForm.assignedTo, s._id],
                          })}
                          className="rounded border-gray-300 text-farm-600 focus:ring-farm-500 w-4 h-4"
                        />
                        <span className="font-semibold text-gray-800">{s.name}</span>
                        <span className="text-gray-400">({roleLabel(s.role)})</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={assignForm.date}
                    onChange={(e) => setAssignForm({ ...assignForm, date: e.target.value })}
                    className="w-full text-xs border border-gray-300 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-farm-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Time Slot (e.g. 07:00 AM - 08:00 AM)</label>
                  <input
                    type="text"
                    placeholder="e.g. 07:00 AM - 08:00 AM"
                    value={assignForm.timeLabel}
                    onChange={(e) => setAssignForm({ ...assignForm, timeLabel: e.target.value })}
                    className="w-full text-xs border border-gray-300 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-farm-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Admin Instructions / Notes (optional)</label>
                <textarea
                  rows={2}
                  value={assignForm.notes}
                  onChange={(e) => setAssignForm({ ...assignForm, notes: e.target.value })}
                  className="w-full text-xs border border-gray-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-farm-500"
                  placeholder="Specific work instructions for staff..."
                />
              </div>

              <button
                type="submit"
                disabled={assignSubmitting || assignForm.categories.length === 0 || assignForm.assignedTo.length === 0}
                className="w-full bg-farm-600 hover:bg-farm-700 disabled:opacity-60 text-white font-semibold rounded-xl py-3 text-xs transition shadow-sm"
              >
                {assignSubmitting ? "Assigning..." : "Assign Tasks to Selected Staff"}
              </button>
            </form>
          </div>

          {/* Add Category Section */}
          <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs p-6">
            <h2 className="text-sm font-bold text-gray-800 mb-3">Add Custom Work Category</h2>
            <form onSubmit={submitCategory} className="flex gap-2">
              <input
                type="text"
                placeholder="e.g. Fencing Repair, Shed Cleaning"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="flex-1 text-xs border border-gray-300 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-farm-500"
              />
              <button
                type="submit"
                disabled={categorySubmitting}
                className="bg-gray-900 hover:bg-black text-white text-xs font-semibold rounded-xl px-4 py-2.5 transition"
              >
                Add Category
              </button>
            </form>
          </div>
        </div>
      )}

      {/* TAB 5: Daily Rules */}
      {tab === "Daily Rules" && (
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs p-6">
            <h2 className="text-sm font-bold text-gray-800 mb-1">Create Daily Auto-Recurring Assignment</h2>
            <p className="text-xs text-gray-500 mb-4">Staff added here will automatically get this task assigned every morning.</p>

            <form onSubmit={submitRule} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Categories</label>
                <div className="flex flex-wrap gap-2">
                  {categories.map((c) => {
                    const checked = ruleForm.categories.includes(c.name);
                    return (
                      <button
                        type="button"
                        key={c._id}
                        onClick={() => setRuleForm({
                          ...ruleForm,
                          categories: checked ? ruleForm.categories.filter((x) => x !== c.name) : [...ruleForm.categories, c.name],
                        })}
                        className={`text-xs font-semibold px-3 py-1.5 rounded-xl border transition ${
                          checked ? "bg-farm-600 border-farm-600 text-white" : "bg-white border-gray-300 text-gray-600"
                        }`}
                      >
                        {c.name}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Staff Members</label>
                <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-xl divide-y divide-gray-100 bg-gray-50/50">
                  {staffList.map((s) => {
                    const checked = ruleForm.assignedTo.includes(s._id);
                    return (
                      <label key={s._id} className="flex items-center gap-2 px-3 py-2 text-xs cursor-pointer hover:bg-white">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => setRuleForm({
                            ...ruleForm,
                            assignedTo: checked ? ruleForm.assignedTo.filter((x) => x !== s._id) : [...ruleForm.assignedTo, s._id],
                          })}
                          className="rounded border-gray-300 text-farm-600 focus:ring-farm-500"
                        />
                        {s.name} <span className="text-gray-400">({roleLabel(s.role)})</span>
                      </label>
                    );
                  })}
                </div>
              </div>
              <button
                type="submit"
                disabled={ruleSubmitting || ruleForm.categories.length === 0 || ruleForm.assignedTo.length === 0}
                className="w-full bg-farm-600 hover:bg-farm-700 disabled:opacity-60 text-white font-semibold rounded-xl py-2.5 text-xs transition"
              >
                Create Daily Auto-Assignment Rules
              </button>
            </form>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-100 text-xs font-bold text-gray-700 uppercase tracking-wide">
              Active Daily Auto-Rules ({rules.length})
            </div>
            {rulesLoading ? (
              <p className="p-6 text-xs text-gray-400 text-center">Loading rules...</p>
            ) : rules.length === 0 ? (
              <p className="p-6 text-xs text-gray-400 text-center">No daily recurring rules created yet.</p>
            ) : (
              <div className="divide-y divide-gray-100">
                {rules.map((rule) => (
                  <div key={rule._id} className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition">
                    <div>
                      <p className="text-xs font-bold text-gray-900">{rule.category} → {rule.assignedTo?.name}</p>
                      <p className="text-[11px] text-gray-500">{rule.notes || "Auto-assign daily"}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleRule(rule)}
                        className={`text-xs font-semibold px-3 py-1 rounded-lg transition ${
                          rule.isActive ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {rule.isActive ? "Active" : "Paused"}
                      </button>
                      <button
                        onClick={() => deleteRule(rule)}
                        className="text-xs font-semibold px-3 py-1 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 transition"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* QUICK ADD TIME SCHEDULE ITEM MODAL */}
      {addScheduleModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50/50">
              <div>
                <h3 className="font-bold text-gray-900 text-base">Add Staff Time Schedule Item</h3>
                <p className="text-xs text-gray-500">Create schedule entry with time slot and category</p>
              </div>
              <button onClick={() => setAddScheduleModalOpen(false)} className="text-gray-400 hover:text-gray-600 text-2xl font-bold leading-none">&times;</button>
            </div>

            <form onSubmit={handleQuickScheduleSubmit} className="p-5 overflow-y-auto space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Select Staff Member(s)*</label>
                <div className="max-h-36 overflow-y-auto border border-gray-200 rounded-xl p-2 bg-gray-50/50 space-y-1">
                  {staffList.map((s) => {
                    const checked = quickScheduleForm.staffIds.includes(s._id);
                    return (
                      <label key={s._id} className="flex items-center gap-2 text-xs font-medium text-gray-800 cursor-pointer p-1.5 hover:bg-white rounded-lg">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => setQuickScheduleForm({
                            ...quickScheduleForm,
                            staffIds: checked
                              ? quickScheduleForm.staffIds.filter((x) => x !== s._id)
                              : [...quickScheduleForm.staffIds, s._id],
                          })}
                          className="rounded text-farm-600 focus:ring-farm-500"
                        />
                        <span>{s.name} ({roleLabel(s.role)})</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Work Category*</label>
                <select
                  value={quickScheduleForm.category}
                  onChange={(e) => setQuickScheduleForm({ ...quickScheduleForm, category: e.target.value })}
                  className="w-full text-xs border border-gray-300 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-farm-500"
                >
                  <option value="">Select Category...</option>
                  {categories.map((c) => (
                    <option key={c._id} value={c.name}>{c.name}</option>
                  ))}
                  <option value="OTHER">+ Add Custom Category</option>
                </select>
                {quickScheduleForm.category === "OTHER" && (
                  <input
                    type="text"
                    placeholder="Enter custom category name..."
                    value={quickScheduleForm.customCategory}
                    onChange={(e) => setQuickScheduleForm({ ...quickScheduleForm, customCategory: e.target.value })}
                    className="w-full text-xs border border-gray-300 rounded-xl px-3 py-2 mt-2 focus:outline-none focus:ring-2 focus:ring-farm-500"
                  />
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Date*</label>
                  <input
                    type="date"
                    value={quickScheduleForm.date}
                    onChange={(e) => setQuickScheduleForm({ ...quickScheduleForm, date: e.target.value })}
                    className="w-full text-xs border border-gray-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-farm-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Time Slot (e.g. 07:00 AM - 08:00 AM)</label>
                  <select
                    value={quickScheduleForm.timeLabel}
                    onChange={(e) => setQuickScheduleForm({ ...quickScheduleForm, timeLabel: e.target.value })}
                    className="w-full text-xs border border-gray-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-farm-500"
                  >
                    <option value="">Select Time Slot...</option>
                    {TIME_SLOTS_7AM_8PM.map((slot) => (
                      <option key={slot} value={slot}>{slot}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Work Instructions / Remark</label>
                <textarea
                  rows={2}
                  value={quickScheduleForm.notes}
                  onChange={(e) => setQuickScheduleForm({ ...quickScheduleForm, notes: e.target.value })}
                  placeholder="Instructions for the staff..."
                  className="w-full text-xs border border-gray-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-farm-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAddScheduleModalOpen(false)}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold px-4 py-2.5 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={quickScheduleSubmitting}
                  className="bg-farm-600 hover:bg-farm-700 text-white text-xs font-semibold px-5 py-2.5 rounded-xl transition shadow-xs"
                >
                  {quickScheduleSubmitting ? "Creating..." : "Save Schedule Entry"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MEDIA PREVIEW MODAL */}
      {mediaModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div>
                <h3 className="font-bold text-gray-900 text-base">{mediaModal.taskTitle} — Work Proof</h3>
                <p className="text-xs text-gray-500">Submitted by {mediaModal.staffName || "Staff"}</p>
              </div>
              <button onClick={() => setMediaModal(null)} className="text-gray-400 hover:text-gray-600 text-2xl font-bold leading-none">&times;</button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4">
              {mediaModal.photoUrl && (
                <div>
                  <p className="text-xs font-bold text-gray-700 mb-1.5">📷 Photo Proof:</p>
                  <img src={mediaModal.photoUrl} alt="Photo proof" className="w-full max-h-80 object-contain rounded-xl border border-gray-200 bg-gray-950" />
                </div>
              )}
              {mediaModal.videoUrl && (
                <div>
                  <p className="text-xs font-bold text-gray-700 mb-1.5">🎥 Video Proof Player:</p>
                  <video controls autoPlay className="w-full max-h-80 rounded-xl border border-gray-200 bg-black">
                    <source src={mediaModal.videoUrl} type="video/mp4" />
                    Browser does not support video player.
                  </video>
                </div>
              )}
            </div>

            <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex justify-end">
              <button onClick={() => setMediaModal(null)} className="bg-gray-900 text-white text-xs font-semibold px-4 py-2 rounded-xl">
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkManage;
