import React, { useEffect, useState, useCallback } from "react";
import api from "../api/axios.js";
import { useAuth } from "../context/AuthContext.jsx";
import Pagination from "../components/Pagination.jsx";

const IST = "Asia/Kolkata";
const PAGE_SIZE = 10;

const fmtDate = (iso) =>
  new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: IST });

const fmtTime = (iso) =>
  iso ? new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", timeZone: IST }) : "—";

const fmtDateInput = (d) => {
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, "0"), day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const statusStyle = {
  assigned: "bg-gray-100 text-gray-600",
  in_progress: "bg-blue-100 text-blue-700",
  submitted: "bg-yellow-100 text-yellow-700",
  approved: "bg-green-100 text-green-700",
  declined: "bg-red-100 text-red-700",
};

const statusLabel = {
  assigned: "Not Started ⏳",
  in_progress: "In Progress 🔄",
  submitted: "Pending Review 🟡",
  approved: "Approved ✅",
  declined: "Declined ❌",
};

const TABS = ["Review Queue", "Assign Task", "Daily Rules", "All Tasks"];

const categoryIcon = {
  Cleaning: "🧹",
  Milking: "🥛",
  Cropping: "🌾",
  Feeding: "🌿",
  Medication: "💉",
  "Goat Batch Weight": "🐐",
  "Hen/Chicken Batch Weight": "🐔",
  "Goat Batch": "🐐",
  "Hen/Chicken Batch": "🐔",
};

const roleLabel = (role) => (role || "").split("_").map((w) => w[0]?.toUpperCase() + w.slice(1)).join(" ");

const WorkManage = () => {
  const { user } = useAuth();
  const now = new Date();
  const isPrivileged = ["admin", "manager_operations"].includes(user?.role);

  const [tab, setTab] = useState("Review Queue");
  const [categories, setCategories] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [error, setError] = useState("");

  // Review queue + all tasks
  const [tasks, setTasks] = useState([]);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [filters, setFilters] = useState({ date: "", userId: "", status: "", category: "" });
  const [reviewNoteDraft, setReviewNoteDraft] = useState({}); // taskId -> note text
  const [reviewLoadingId, setReviewLoadingId] = useState(null);
  const [page, setPage] = useState(1);

  // Media Modal (for full photo + video preview)
  const [mediaModal, setMediaModal] = useState(null); 

  // Assign task form
  const [assignForm, setAssignForm] = useState({ categories: [], assignedTo: [], date: fmtDateInput(now), notes: "" });
  const [assignSubmitting, setAssignSubmitting] = useState(false);
  const [assignMessage, setAssignMessage] = useState("");

  // Add category
  const [newCategory, setNewCategory] = useState("");
  const [categorySubmitting, setCategorySubmitting] = useState(false);

  // Daily rules
  const [rules, setRules] = useState([]);
  const [rulesLoading, setRulesLoading] = useState(true);
  const [ruleForm, setRuleForm] = useState({ categories: [], assignedTo: [], notes: "" });
  const [ruleSubmitting, setRuleSubmitting] = useState(false);

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

  const loadTasks = useCallback(async (activeFilters) => {
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
    loadTasks({});
    loadRules();
  }, [isPrivileged, loadStaticData, loadTasks, loadRules]);

  if (!isPrivileged) {
    return (
      <div className="px-4 md:px-8 py-6 md:py-8">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 text-center">
          <p className="text-3xl mb-2">🔒</p>
          <p className="font-medium text-gray-700">Not authorized</p>
          <p className="text-sm text-gray-500 mt-1">Only admin and managers can manage work assignments.</p>
        </div>
      </div>
    );
  }

  const applyFilters = () => { setPage(1); loadTasks(filters); };

  const handleReview = async (task, action) => {
    const note = reviewNoteDraft[task._id] || "";
    if (action === "decline" && !note.trim()) {
      alert("Please write a reason before declining");
      return;
    }
    setReviewLoadingId(task._id);
    try {
      await api.put(`/work/${task._id}/review`, { action, note });
      loadTasks(tab === "Review Queue" ? {} : filters);
    } catch (err) {
      alert(err.response?.data?.message || `Failed to ${action} task`);
    } finally {
      setReviewLoadingId(null);
    }
  };

  const submitAssign = async (e) => {
    e.preventDefault();
    setAssignMessage("");
    setAssignSubmitting(true);
    try {
      const res = await api.post("/work/assign", assignForm);
      setAssignMessage(`✅ ${res.data.message}`);
      setAssignForm({ categories: [], assignedTo: [], date: fmtDateInput(now), notes: "" });
    } catch (err) {
      setAssignMessage(`❌ ${err.response?.data?.message || "Failed to assign task"}`);
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
  const visibleTasks = tab === "Review Queue" ? pendingTasks : tasks;
  const pagedVisibleTasks = visibleTasks.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="px-4 md:px-8 py-6 md:py-8">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-800">Work Management</h1>
        <p className="text-sm text-gray-500 mt-0.5">Assign daily work, review submissions with photo & video proof, manage rules</p>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">{error}</div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setPage(1); }}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition ${
              tab === t ? "border-farm-600 text-farm-700" : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {t}{t === "Review Queue" && pendingTasks.length > 0 ? ` (${pendingTasks.length})` : ""}
          </button>
        ))}
      </div>

      {/* Review Queue / All Tasks */}
      {(tab === "Review Queue" || tab === "All Tasks") && (
        <>
          {tab === "All Tasks" && (
            <div className="flex flex-wrap items-end gap-2 mb-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Date</label>
                <input type="date" value={filters.date} onChange={(e) => setFilters({ ...filters, date: e.target.value })}
                  className="text-sm border border-gray-300 rounded-lg px-3 py-2" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Staff</label>
                <select value={filters.userId} onChange={(e) => setFilters({ ...filters, userId: e.target.value })}
                  className="text-sm border border-gray-300 rounded-lg px-3 py-2">
                  <option value="">All</option>
                  {staffList.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Category</label>
                <select value={filters.category} onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                  className="text-sm border border-gray-300 rounded-lg px-3 py-2">
                  <option value="">All</option>
                  {categories.map((c) => <option key={c._id} value={c.name}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Status</label>
                <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                  className="text-sm border border-gray-300 rounded-lg px-3 py-2">
                  <option value="">All</option>
                  {Object.keys(statusLabel).map((s) => <option key={s} value={s}>{statusLabel[s]}</option>)}
                </select>
              </div>
              <button onClick={applyFilters} className="bg-farm-600 hover:bg-farm-700 text-white text-sm font-medium rounded-lg px-4 py-2 transition">
                Apply
              </button>
            </div>
          )}

          {tasksLoading ? (
            <div className="text-center text-gray-400 py-12">Loading tasks...</div>
          ) : visibleTasks.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-10 text-center text-gray-400">
              {tab === "Review Queue" ? "Nothing pending review 🎉" : "No tasks found"}
            </div>
          ) : (
            <>
              <div className="space-y-4 mb-4">
                {pagedVisibleTasks.map((task) => (
                  <div key={task._id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{categoryIcon[task.category] || "📋"}</span>
                          <span className="font-semibold text-gray-800 text-base">{task.category}</span>
                          <span className="text-xs font-medium bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md">
                            Assigned to: {task.assignedTo?.name || "Unassigned"} ({roleLabel(task.assignedTo?.role)})
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          📅 {fmtDate(task.date)} · {task.source === "auto" ? "Auto-assigned" : `Assigned by ${task.assignedBy?.name || "admin"}`}
                        </p>
                      </div>
                      <span className={`text-xs font-semibold px-3 py-1 rounded-full ${statusStyle[task.status]}`}>
                        {statusLabel[task.status]}
                      </span>
                    </div>

                    {task.notes && <p className="text-xs text-gray-600 bg-gray-50 rounded-lg px-3 py-2 mb-3">📝 <span className="font-medium">Instructions:</span> {task.notes}</p>}
                    {task.sampleWeight && (
                      <p className="text-xs text-purple-700 bg-purple-50 rounded-lg px-3 py-2 mb-3 font-medium">
                        ⚖️ <span className="font-semibold">Sample Weight / Batch Note:</span> {task.sampleWeight}
                      </p>
                    )}
                    {task.session && (
                      <p className="text-xs text-farm-700 bg-farm-50 inline-block px-2.5 py-1 rounded-full mb-3 font-medium">
                        {task.session} · {task.timeLabel} · {task.track}
                      </p>
                    )}

                    {/* Photo & Video Proof Viewer Section — ALWAYS visible when proof exists! */}
                    {task.proof && (task.proof.photoUrl || task.proof.videoUrl) && (
                      <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-3.5 mb-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                            📸 Submitted Work Proof
                          </span>
                          {task.proof.photoUrl && task.proof.videoUrl ? (
                            <span className="bg-green-100 text-green-700 text-[10px] px-2 py-0.5 rounded-full font-medium">
                              ✓ Photo + Video Attached
                            </span>
                          ) : (
                            <span className="bg-yellow-100 text-yellow-700 text-[10px] px-2 py-0.5 rounded-full font-medium">
                              Partial Proof
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                          {task.proof.photoUrl && (
                            <button
                              type="button"
                              onClick={() => setMediaModal({
                                photoUrl: task.proof.photoUrl,
                                videoUrl: task.proof.videoUrl,
                                taskTitle: task.category,
                                staffName: task.assignedTo?.name
                              })}
                              className="flex items-center gap-2.5 bg-white border border-gray-200 rounded-lg p-1.5 pr-3 hover:border-farm-500 hover:shadow-sm transition group text-left"
                            >
                              <img src={task.proof.photoUrl} alt="Photo proof" className="w-12 h-12 object-cover rounded-md border border-gray-100" />
                              <div>
                                <p className="text-xs font-semibold text-gray-800 group-hover:text-farm-700">📷 View Photo</p>
                                <p className="text-[10px] text-gray-400">Click to expand photo</p>
                              </div>
                            </button>
                          )}

                          {task.proof.videoUrl && (
                            <button
                              type="button"
                              onClick={() => setMediaModal({
                                photoUrl: task.proof.photoUrl,
                                videoUrl: task.proof.videoUrl,
                                taskTitle: task.category,
                                staffName: task.assignedTo?.name
                              })}
                              className="flex items-center gap-2.5 bg-white border border-gray-200 rounded-lg p-2 pr-3 hover:border-farm-500 hover:shadow-sm transition group text-left"
                            >
                              <div className="w-10 h-10 bg-blue-600 text-white rounded-md flex items-center justify-center text-sm font-bold shadow-sm">
                                ▶
                              </div>
                              <div>
                                <p className="text-xs font-semibold text-gray-800 group-hover:text-farm-700">🎥 Play Video Proof</p>
                                <p className="text-[10px] text-blue-600 font-medium">Click to watch video</p>
                              </div>
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Review Actions (only for pending review / submitted status) */}
                    {task.status === "submitted" && (
                      <div className="pt-2 border-t border-gray-100">
                        <textarea
                          placeholder="Reason for decision / note (required if declining)"
                          value={reviewNoteDraft[task._id] || ""}
                          onChange={(e) => setReviewNoteDraft({ ...reviewNoteDraft, [task._id]: e.target.value })}
                          rows={2}
                          className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 mb-2 focus:outline-none focus:ring-2 focus:ring-farm-500"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleReview(task, "approve")}
                            disabled={reviewLoadingId === task._id}
                            className="flex-1 bg-farm-600 hover:bg-farm-700 disabled:opacity-60 text-white text-xs font-semibold rounded-lg py-2.5 transition"
                          >
                            ✅ Approve Work
                          </button>
                          <button
                            onClick={() => handleReview(task, "decline")}
                            disabled={reviewLoadingId === task._id}
                            className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white text-xs font-semibold rounded-lg py-2.5 transition"
                          >
                            ❌ Decline Work
                          </button>
                        </div>
                      </div>
                    )}

                    {task.status === "declined" && task.review?.note && (
                      <div className="bg-red-50 border border-red-100 rounded-lg px-3 py-2 mt-2">
                        <p className="text-xs text-red-700 font-medium">Declined Reason: {task.review.note}</p>
                      </div>
                    )}

                    {task.status === "approved" && (
                      <p className="text-xs text-gray-400 mt-2">
                        Approved at {fmtTime(task.review?.reviewedAt)} by {task.review?.reviewedBy?.name || "Admin"}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              <Pagination page={page} totalItems={visibleTasks.length} pageSize={PAGE_SIZE} onChange={setPage} />
            </>
          )}
        </>
      )}

      {/* Assign Task Tab */}
      {tab === "Assign Task" && (
        <div className="max-w-lg">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">One-off Task Assignment</h2>
            {assignMessage && <p className="text-sm mb-3">{assignMessage}</p>}
            <form onSubmit={submitAssign} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Categories (select one or more)</label>
                <div className="flex flex-wrap gap-2">
                  {categories.map((c) => {
                    const checked = assignForm.categories.includes(c.name);
                    return (
                      <button
                        type="button"
                        key={c._id}
                        onClick={() => setAssignForm({
                          ...assignForm,
                          categories: checked ? assignForm.categories.filter((x) => x !== c.name) : [...assignForm.categories, c.name],
                        })}
                        className={`text-xs font-medium px-3 py-1.5 rounded-full border transition ${
                          checked ? "bg-farm-600 border-farm-600 text-white" : "bg-white border-gray-300 text-gray-600 hover:border-farm-400"
                        }`}
                      >
                        {c.name}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Staff (select one or more)</label>
                <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
                  {staffList.map((s) => {
                    const checked = assignForm.assignedTo.includes(s._id);
                    return (
                      <label key={s._id} className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-gray-50">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => setAssignForm({
                            ...assignForm,
                            assignedTo: checked ? assignForm.assignedTo.filter((x) => x !== s._id) : [...assignForm.assignedTo, s._id],
                          })}
                          className="rounded border-gray-300 text-farm-600 focus:ring-farm-500"
                        />
                        {s.name} <span className="text-xs text-gray-400">({roleLabel(s.role)})</span>
                      </label>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Date</label>
                <input type="date" required value={assignForm.date} onChange={(e) => setAssignForm({ ...assignForm, date: e.target.value })}
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-farm-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Notes (optional)</label>
                <textarea rows={2} value={assignForm.notes} onChange={(e) => setAssignForm({ ...assignForm, notes: e.target.value })}
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-farm-500" />
              </div>
              <button
                type="submit"
                disabled={assignSubmitting || assignForm.categories.length === 0 || assignForm.assignedTo.length === 0}
                className="w-full bg-farm-600 hover:bg-farm-700 disabled:opacity-60 text-white font-medium rounded-lg py-2.5 text-sm transition"
              >
                {assignSubmitting
                  ? "Assigning..."
                  : `Assign ${assignForm.categories.length || 0} categor${assignForm.categories.length === 1 ? "y" : "ies"} to ${assignForm.assignedTo.length || 0} staff`}
              </button>
            </form>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Add Custom Category</h2>
            <form onSubmit={submitCategory} className="flex gap-2">
              <input
                type="text"
                placeholder="e.g. Fencing Repair"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="flex-1 text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-farm-500"
              />
              <button type="submit" disabled={categorySubmitting}
                className="bg-gray-800 hover:bg-gray-900 disabled:opacity-60 text-white text-sm font-medium rounded-lg px-4 py-2 transition">
                Add
              </button>
            </form>
            <div className="flex flex-wrap gap-2 mt-3">
              {categories.map((c) => (
                <span key={c._id} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">{c.name}</span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Daily Rules */}
      {tab === "Daily Rules" && (
        <div>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6 max-w-lg">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">New Daily Assignment</h2>
            <form onSubmit={submitRule} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Categories (select one or more)</label>
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
                        className={`text-xs font-medium px-3 py-1.5 rounded-full border transition ${
                          checked ? "bg-farm-600 border-farm-600 text-white" : "bg-white border-gray-300 text-gray-600 hover:border-farm-400"
                        }`}
                      >
                        {c.name}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Staff (select one or more, roz assign)</label>
                <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
                  {staffList.map((s) => {
                    const checked = ruleForm.assignedTo.includes(s._id);
                    return (
                      <label key={s._id} className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-gray-50">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => setRuleForm({
                            ...ruleForm,
                            assignedTo: checked ? ruleForm.assignedTo.filter((x) => x !== s._id) : [...ruleForm.assignedTo, s._id],
                          })}
                          className="rounded border-gray-300 text-farm-600 focus:ring-farm-500"
                        />
                        {s.name} <span className="text-xs text-gray-400">({roleLabel(s.role)})</span>
                      </label>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Notes (optional)</label>
                <input type="text" value={ruleForm.notes} onChange={(e) => setRuleForm({ ...ruleForm, notes: e.target.value })}
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-farm-500" />
              </div>
              <button
                type="submit"
                disabled={ruleSubmitting || ruleForm.categories.length === 0 || ruleForm.assignedTo.length === 0}
                className="w-full bg-farm-600 hover:bg-farm-700 disabled:opacity-60 text-white font-medium rounded-lg py-2.5 text-sm transition"
              >
                {ruleSubmitting
                  ? "Creating..."
                  : `Create ${ruleForm.categories.length || 0} × ${ruleForm.assignedTo.length || 0} Daily Rules`}
              </button>
            </form>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Active Daily Assignments
            </div>
            {rulesLoading ? (
              <p className="px-4 py-6 text-sm text-gray-400 text-center">Loading...</p>
            ) : rules.length === 0 ? (
              <p className="px-4 py-6 text-sm text-gray-400 text-center">No daily rules yet</p>
            ) : (
              rules.map((rule) => (
                <div key={rule._id} className="flex items-center justify-between px-4 py-3 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{rule.category} — {rule.assignedTo?.name}</p>
                    <p className="text-xs text-gray-500">{rule.notes || "No notes"}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleRule(rule)}
                      className={`text-xs font-medium px-3 py-1.5 rounded-lg transition ${
                        rule.isActive ? "bg-farm-50 text-farm-700 hover:bg-farm-100" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                      }`}
                    >
                      {rule.isActive ? "Active" : "Paused"}
                    </button>
                    <button onClick={() => deleteRule(rule)} className="text-xs font-medium px-3 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition">
                      Remove
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Interactive Media Modal for Photo and Video Playback */}
      {mediaModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div>
                <h3 className="font-semibold text-gray-800 text-base">{mediaModal.taskTitle} — Work Proof</h3>
                <p className="text-xs text-gray-500">Submitted by {mediaModal.staffName || "Staff"}</p>
              </div>
              <button
                onClick={() => setMediaModal(null)}
                className="text-gray-400 hover:text-gray-600 text-2xl font-semibold leading-none"
              >
                &times;
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-5">
              {/* Photo Section */}
              {mediaModal.photoUrl && (
                <div>
                  <p className="text-xs font-semibold text-gray-700 mb-2">📸 Photo Proof:</p>
                  <a href={mediaModal.photoUrl} target="_blank" rel="noreferrer" title="Click to view full image in new tab">
                    <img
                      src={mediaModal.photoUrl}
                      alt="Submitted Photo Proof"
                      className="w-full max-h-80 object-contain rounded-xl border border-gray-200 bg-gray-900"
                    />
                  </a>
                </div>
              )}

              {/* Video Section with HTML5 Video Player */}
              {mediaModal.videoUrl && (
                <div>
                  <p className="text-xs font-semibold text-gray-700 mb-2">🎥 Video Proof (Click Play below):</p>
                  <video
                    controls
                    autoPlay
                    controlsList="nodownload"
                    className="w-full max-h-80 rounded-xl border border-gray-200 bg-black shadow-inner"
                  >
                    <source src={mediaModal.videoUrl} type="video/mp4" />
                    Your browser does not support the video player.
                  </video>
                  <a
                    href={mediaModal.videoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-block text-xs text-blue-600 hover:underline mt-1.5"
                  >
                     Open video in new tab
                  </a>
                </div>
              )}
            </div>

            <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex justify-end">
              <button
                onClick={() => setMediaModal(null)}
                className="bg-gray-800 hover:bg-gray-900 text-white text-xs font-medium px-4 py-2 rounded-lg transition"
              >
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
