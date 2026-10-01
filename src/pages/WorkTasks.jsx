import React, { useEffect, useState, useCallback } from "react";
import api from "../api/axios.js";
import Pagination from "../components/Pagination.jsx";

const IST = "Asia/Kolkata";
const PAGE_SIZE = 10;

const fmtTime = (iso) =>
  iso ? new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", timeZone: IST }) : "—";

const fmtDateInput = (d) => {
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, "0"), day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const categoryIcon = {
  Cleaning: "🧹",
  Milking: "🥛",
  Cropping: "🌾",
  Feeding: "🌿",
  Medication: "💉",
  "Hen/Chicken Batch Weight": "🐔",
  "Hen/Chicken Batch": "🐔",
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

const WorkTasks = () => {
  const now = new Date();
  const [date, setDate] = useState(fmtDateInput(now));
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [page, setPage] = useState(1);

  const [sessionLogs, setSessionLogs] = useState([]);
  const [sessionActionLoading, setSessionActionLoading] = useState(null);

  // Submit proof modal
  const [submitModal, setSubmitModal] = useState(null); // { task, mode: "complete" | "resubmit" }
  const [photoFile, setPhotoFile] = useState(null);
  const [videoFile, setVideoFile] = useState(null);
  const [userRemark, setUserRemark] = useState("");
  const [sampleWeight, setSampleWeight] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Media Modal for viewing uploaded proof
  const [mediaModal, setMediaModal] = useState(null);

  const fetchSessionLogs = useCallback(async () => {
    try {
      const res = await api.get(`/schedule/session-log?date=${date}`);
      setSessionLogs(res.data.logs || []);
    } catch (err) {
      // non-critical
    }
  }, [date]);

  useEffect(() => { fetchSessionLogs(); }, [fetchSessionLogs]);

  const startSession = async (sessionId) => {
    setSessionActionLoading(sessionId);
    try {
      await api.post(`/schedule/session-log/${sessionId}/start`, { date });
      fetchSessionLogs();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to start session");
    } finally {
      setSessionActionLoading(null);
    }
  };

  const endSession = async (sessionId) => {
    setSessionActionLoading(sessionId);
    try {
      await api.post(`/schedule/session-log/${sessionId}/end`, { date });
      fetchSessionLogs();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to end session");
    } finally {
      setSessionActionLoading(null);
    }
  };

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get(`/work/my-tasks?date=${date}`);
      setTasks(res.data.tasks || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load tasks");
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const startTask = async (task) => {
    setActionLoadingId(task._id);
    try {
      await api.post(`/work/${task._id}/start`);
      fetchTasks();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to start task");
    } finally {
      setActionLoadingId(null);
    }
  };

  const openSubmitModal = (task, mode) => {
    setSubmitModal({ task, mode });
    setPhotoFile(null);
    setVideoFile(null);
    setUserRemark(task.userRemark || "");
    setSampleWeight(task.sampleWeight || "");
    setSubmitError("");
  };

  const handleSubmitProof = async (e) => {
    e.preventDefault();
    if (!photoFile || !videoFile) {
      setSubmitError("Both a photo and a video are required as proof of work");
      return;
    }
    setSubmitError("");
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("photo", photoFile);
      formData.append("video", videoFile);
      if (userRemark.trim()) {
        formData.append("userRemark", userRemark.trim());
        formData.append("remarks", userRemark.trim());
      }
      if (sampleWeight.trim()) {
        formData.append("sampleWeight", sampleWeight.trim());
      }

      const endpoint = submitModal.mode === "resubmit" ? "resubmit" : "complete";
      await api.post(`/work/${submitModal.task._id}/${endpoint}`, formData);
      setSubmitModal(null);
      fetchTasks();
    } catch (err) {
      setSubmitError(err.response?.data?.message || "Failed to submit proof");
    } finally {
      setSubmitting(false);
    }
  };

  const isToday = date === fmtDateInput(now);
  const pagedTasks = tasks.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Summary counts
  const totalTasks = tasks.length;
  const inProgressCount = tasks.filter((t) => t.status === "in_progress").length;
  const submittedCount = tasks.filter((t) => t.status === "submitted").length;
  const approvedCount = tasks.filter((t) => t.status === "approved").length;

  return (
    <div className="px-4 md:px-8 py-6 md:py-8 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">My Daily Schedule & Tasks</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Your daily work list — start work, upload photo & video proof, and track live status
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-gray-500">Date:</label>
          <input
            type="date"
            value={date}
            max={fmtDateInput(now)}
            onChange={(e) => { setDate(e.target.value); setPage(1); }}
            className="text-xs font-semibold border border-gray-300 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-farm-500 shadow-xs"
          />
        </div>
      </div>

      {error && (
        <div className="mb-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      {/* Session Clock-in Bar */}
      {sessionLogs.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs p-4 mb-6">
          <h2 className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-3">Today's Session Attendance</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {sessionLogs.map((log) => (
              <div key={log.session._id} className="border border-gray-200 rounded-xl p-3 bg-gray-50/50">
                <p className="text-xs font-bold text-gray-800">{log.session.name}</p>
                <p className="text-[10px] text-gray-400 mb-2">{log.session.startTime} – {log.session.endTime}</p>
                {log.status === "not_started" && (
                  <button
                    onClick={() => startSession(log.session._id)}
                    disabled={sessionActionLoading === log.session._id}
                    className="w-full bg-farm-600 hover:bg-farm-700 disabled:opacity-60 text-white text-xs font-semibold rounded-lg py-1.5 transition"
                  >
                    ▶ Start Session
                  </button>
                )}
                {log.status === "in_progress" && (
                  <div className="space-y-1">
                    <p className="text-[10px] text-blue-600 font-semibold">● Started {fmtTime(log.startedAt)}</p>
                    <button
                      onClick={() => endSession(log.session._id)}
                      disabled={sessionActionLoading === log.session._id}
                      className="w-full bg-rose-600 hover:bg-rose-700 disabled:opacity-60 text-white text-xs font-semibold rounded-lg py-1.5 transition"
                    >
                      ■ End Session
                    </button>
                  </div>
                )}
                {log.status === "completed" && (
                  <p className="text-[10px] text-emerald-700 bg-emerald-50 rounded-lg py-1 text-center font-bold">
                    ✓ Completed {fmtTime(log.completedAt)}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-3.5 shadow-xs">
          <p className="text-[11px] font-medium text-gray-500">Assigned Tasks</p>
          <p className="text-xl font-bold text-gray-800 mt-0.5">{totalTasks}</p>
        </div>
        <div className="bg-blue-50/60 rounded-xl border border-blue-100 p-3.5 shadow-xs">
          <p className="text-[11px] font-medium text-blue-700">In Progress 🔄</p>
          <p className="text-xl font-bold text-blue-800 mt-0.5">{inProgressCount}</p>
        </div>
        <div className="bg-amber-50/60 rounded-xl border border-amber-100 p-3.5 shadow-xs">
          <p className="text-[11px] font-medium text-amber-700">Pending Review 🟡</p>
          <p className="text-xl font-bold text-amber-800 mt-0.5">{submittedCount}</p>
        </div>
        <div className="bg-emerald-50/60 rounded-xl border border-emerald-100 p-3.5 shadow-xs">
          <p className="text-[11px] font-medium text-emerald-700">Approved ✅</p>
          <p className="text-xl font-bold text-emerald-800 mt-0.5">{approvedCount}</p>
        </div>
      </div>

      {/* TABULAR MY TASKS TABLE */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center text-gray-400">
          <div className="inline-block w-6 h-6 border-2 border-farm-600 border-t-transparent rounded-full animate-spin mb-2"></div>
          <p className="text-sm font-medium">Loading your tasks...</p>
        </div>
      ) : tasks.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center text-gray-400 shadow-xs">
          <p className="text-4xl mb-2">🎉</p>
          <p className="text-base font-semibold text-gray-700">
            {isToday ? "No tasks assigned for today!" : "No tasks found for this date."}
          </p>
          <p className="text-xs text-gray-500 mt-1">Check back later or pick a different date.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs overflow-hidden mb-6">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-200 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  <th className="px-4 py-3.5">Time & Session</th>
                  <th className="px-4 py-3.5">Task & Category</th>
                  <th className="px-4 py-3.5">Instructions & Notes</th>
                  <th className="px-4 py-3.5 text-center">Status</th>
                  <th className="px-4 py-3.5">Your Submitted Proof & Remark</th>
                  <th className="px-4 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs">
                {pagedTasks.map((task) => (
                  <tr key={task._id} className="hover:bg-gray-50/80 transition-colors">
                    {/* Time & Session */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="font-semibold text-gray-900">
                          ⏰ {task.timeLabel || "Anytime Today"}
                        </span>
                        {task.session && (
                          <span className="text-[10px] font-medium text-farm-700 bg-farm-50 px-1.5 py-0.5 rounded w-fit mt-0.5">
                            {task.session}
                          </span>
                        )}
                        {task.track && (
                          <span className="text-[10px] text-gray-400 mt-0.5">{task.track}</span>
                        )}
                      </div>
                    </td>

                    {/* Task & Category */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2 font-bold text-gray-900">
                        <span className="text-lg">{categoryIcon[task.category] || "📋"}</span>
                        <span>{task.category}</span>
                      </div>
                      <span className="text-[10px] text-gray-400 capitalize block mt-0.5">Source: {task.source}</span>
                    </td>

                    {/* Instructions & Notes */}
                    <td className="px-4 py-3.5 max-w-xs">
                      {task.notes ? (
                        <p className="text-gray-600 text-xs bg-gray-50 p-2 rounded-lg border border-gray-100 line-clamp-2">
                          📝 {task.notes}
                        </p>
                      ) : (
                        <span className="text-gray-300 italic text-[11px]">No notes</span>
                      )}

                      {task.status === "declined" && task.review?.note && (
                        <div className="mt-1.5 text-[11px] text-rose-700 bg-rose-50 border border-rose-100 p-1.5 rounded-md font-medium">
                          ❌ Reason: {task.review.note}
                        </div>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3.5 text-center whitespace-nowrap">
                      <span className={`inline-block text-[11px] px-2.5 py-1 rounded-full ${statusStyle[task.status]}`}>
                        {statusLabel[task.status]}
                      </span>
                    </td>

                    {/* Submitted Proof & Remark */}
                    <td className="px-4 py-3.5 min-w-[200px]">
                      {task.proof && (task.proof.photoUrl || task.proof.videoUrl) ? (
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-1.5">
                            {task.proof.photoUrl && (
                              <button
                                type="button"
                                onClick={() => setMediaModal({ photoUrl: task.proof.photoUrl, videoUrl: task.proof.videoUrl, taskTitle: task.category })}
                                className="flex items-center gap-1 text-[11px] text-farm-700 bg-farm-50 hover:bg-farm-100 border border-farm-200 px-2 py-1 rounded-md font-medium transition"
                              >
                                📷 Photo
                              </button>
                            )}
                            {task.proof.videoUrl && (
                              <button
                                type="button"
                                onClick={() => setMediaModal({ photoUrl: task.proof.photoUrl, videoUrl: task.proof.videoUrl, taskTitle: task.category })}
                                className="flex items-center gap-1 text-[11px] text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2 py-1 rounded-md font-semibold transition"
                              >
                                🎥 Video
                              </button>
                            )}
                          </div>
                          {(task.userRemark || task.sampleWeight) && (
                            <p className="text-[11px] text-gray-700 bg-amber-50/80 border border-amber-100 rounded-md px-2 py-1">
                              💬 {task.userRemark || task.sampleWeight}
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400 text-[11px] italic">No proof submitted</span>
                      )}
                    </td>

                    {/* Action */}
                    <td className="px-4 py-3.5 text-right whitespace-nowrap">
                      {task.status === "assigned" && (
                        <button
                          onClick={() => startTask(task)}
                          disabled={actionLoadingId === task._id}
                          className="bg-farm-600 hover:bg-farm-700 disabled:opacity-60 text-white text-xs font-semibold px-3.5 py-1.5 rounded-lg transition shadow-xs"
                        >
                          {actionLoadingId === task._id ? "Starting..." : "▶ Start Work"}
                        </button>
                      )}
                      {task.status === "in_progress" && (
                        <button
                          onClick={() => openSubmitModal(task, "complete")}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition shadow-xs"
                        >
                          ✅ Submit Proof
                        </button>
                      )}
                      {task.status === "declined" && (
                        <button
                          onClick={() => openSubmitModal(task, "resubmit")}
                          className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition shadow-xs"
                        >
                          🔁 Resubmit
                        </button>
                      )}
                      {["submitted", "approved"].includes(task.status) && (
                        <span className="text-[11px] font-semibold text-gray-400">
                          Completed {fmtTime(task.completedAt)}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination page={page} totalItems={tasks.length} pageSize={PAGE_SIZE} onChange={setPage} />
        </div>
      )}

      {/* SUBMIT PROOF MODAL */}
      {submitModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50/50">
              <div>
                <h3 className="font-bold text-gray-900 text-base">
                  {submitModal.mode === "resubmit" ? "Resubmit Work Proof" : "Submit Work Proof"}
                </h3>
                <p className="text-xs text-gray-500">{submitModal.task.category}</p>
              </div>
              <button onClick={() => setSubmitModal(null)} className="text-gray-400 hover:text-gray-600 text-2xl font-bold leading-none">&times;</button>
            </div>

            <form onSubmit={handleSubmitProof} className="p-5 space-y-4">
              <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-xl p-3">
                <span className="font-bold">Mandatory:</span> Both a photo and a short video are required as proof of work.
              </div>

              {submitError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl p-3 font-medium">
                  {submitError}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">💬 Worker Remarks / Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Task completed successfully, feed added..."
                  value={userRemark}
                  onChange={(e) => setUserRemark(e.target.value)}
                  className="w-full text-xs border border-gray-300 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-farm-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">⚖️ Sample Weight / Batch Note (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. 14.5 kg weight / batch size 20"
                  value={sampleWeight}
                  onChange={(e) => setSampleWeight(e.target.value)}
                  className="w-full text-xs border border-gray-300 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-farm-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">📷 Photo Proof (Required)*</label>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  required
                  onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
                  className="w-full text-xs border border-gray-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-farm-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">🎥 Video Proof (Required)*</label>
                <input
                  type="file"
                  accept="video/*"
                  capture="environment"
                  required
                  onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
                  className="w-full text-xs border border-gray-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-farm-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSubmitModal(null)}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold px-4 py-2.5 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-farm-600 hover:bg-farm-700 disabled:opacity-60 text-white text-xs font-semibold px-5 py-2.5 rounded-xl transition shadow-xs"
                >
                  {submitting ? "Uploading Proof..." : "Submit for Approval"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MEDIA PREVIEW MODAL FOR WORKER */}
      {mediaModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-900 text-base">{mediaModal.taskTitle} — Submitted Proof</h3>
              <button onClick={() => setMediaModal(null)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4">
              {mediaModal.photoUrl && (
                <div>
                  <p className="text-xs font-bold text-gray-700 mb-1">📷 Photo Proof:</p>
                  <img src={mediaModal.photoUrl} alt="Photo proof" className="w-full max-h-72 object-contain rounded-xl border border-gray-200 bg-gray-950" />
                </div>
              )}
              {mediaModal.videoUrl && (
                <div>
                  <p className="text-xs font-bold text-gray-700 mb-1">🎥 Video Proof Player:</p>
                  <video controls autoPlay className="w-full max-h-72 rounded-xl border border-gray-200 bg-black">
                    <source src={mediaModal.videoUrl} type="video/mp4" />
                    Browser does not support video player.
                  </video>
                </div>
              )}
            </div>

            <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex justify-end">
              <button onClick={() => setMediaModal(null)} className="bg-gray-900 text-white text-xs font-semibold px-4 py-2 rounded-xl">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkTasks;
