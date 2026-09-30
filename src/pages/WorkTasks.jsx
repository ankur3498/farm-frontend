import React, { useEffect, useState, useCallback } from "react";
import api from "../api/axios.js";
import Pagination from "../components/Pagination.jsx";

const IST = "Asia/Kolkata";
const PAGE_SIZE = 9;

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

  const [submitModal, setSubmitModal] = useState(null); // { task, mode: "complete" | "resubmit" }
  const [photoFile, setPhotoFile] = useState(null);
  const [videoFile, setVideoFile] = useState(null);
  const [sampleWeight, setSampleWeight] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Media Modal for viewing uploaded proof
  const [mediaModal, setMediaModal] = useState(null); // { photoUrl, videoUrl, taskTitle }

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
    setSampleWeight(task.sampleWeight || "");
    setSubmitError("");
  };

  const handleSubmitProof = async (e) => {
    e.preventDefault();
    if (!photoFile || !videoFile) {
      setSubmitError("Both a photo and a video are required for task proof");
      return;
    }
    setSubmitError("");
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("photo", photoFile);
      formData.append("video", videoFile);
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

  return (
    <div className="px-4 md:px-8 py-6 md:py-8">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-800">My Tasks</h1>
          <p className="text-sm text-gray-500 mt-0.5">Daily work assigned to you — start, complete, and submit photo + video proof</p>
        </div>
        <input
          type="date"
          value={date}
          max={fmtDateInput(now)}
          onChange={(e) => { setDate(e.target.value); setPage(1); }}
          className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-farm-500"
        />
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {sessionLogs.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Today's Sessions</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {sessionLogs.map((log) => (
              <div key={log.session._id} className="border border-gray-200 rounded-lg p-3">
                <p className="text-sm font-medium text-gray-800">{log.session.name}</p>
                <p className="text-xs text-gray-400 mb-2">{log.session.startTime} – {log.session.endTime}</p>
                {log.status === "not_started" && (
                  <button
                    onClick={() => startSession(log.session._id)}
                    disabled={sessionActionLoading === log.session._id}
                    className="w-full bg-farm-600 hover:bg-farm-700 disabled:opacity-60 text-white text-xs font-medium rounded-lg py-2 transition"
                  >
                    ▶ Start Session
                  </button>
                )}
                {log.status === "in_progress" && (
                  <>
                    <p className="text-xs text-blue-600 mb-2">● Started {fmtTime(log.startedAt)}</p>
                    <button
                      onClick={() => endSession(log.session._id)}
                      disabled={sessionActionLoading === log.session._id}
                      className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white text-xs font-medium rounded-lg py-2 transition"
                    >
                      ■ End Session
                    </button>
                  </>
                )}
                {log.status === "completed" && (
                  <p className="text-xs text-green-700 bg-green-50 rounded-lg px-2 py-1.5 text-center font-medium">
                    ✓ Completed {fmtTime(log.completedAt)}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center text-gray-400 py-12">Loading tasks...</div>
      ) : tasks.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-10 text-center text-gray-400">
          {isToday ? "No tasks assigned for today yet." : "No tasks for this date."}
        </div>
      ) : (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            {pagedTasks.map((task) => (
              <div key={task._id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{categoryIcon[task.category] || "📋"}</span>
                      <span className="font-semibold text-gray-800">{task.category}</span>
                    </div>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusStyle[task.status]}`}>
                      {statusLabel[task.status]}
                    </span>
                  </div>

                  {task.notes && <p className="text-xs text-gray-600 bg-gray-50 rounded-lg px-2.5 py-1.5 mb-3">📝 {task.notes}</p>}

                  {task.sampleWeight && (
                    <p className="text-xs text-purple-700 bg-purple-50 rounded-lg px-2.5 py-1.5 mb-3 font-medium">
                      ⚖️ Sample Weight: {task.sampleWeight}
                    </p>
                  )}

                  {task.session && (
                    <p className="text-xs text-farm-700 bg-farm-50 inline-block px-2.5 py-0.5 rounded-full mb-3 font-medium">
                      {task.session} · {task.timeLabel} · {task.track}
                    </p>
                  )}

                  <div className="text-xs text-gray-400 space-y-0.5 mb-3">
                    {task.startedAt && <p>Started: {fmtTime(task.startedAt)}</p>}
                    {task.completedAt && <p>Submitted: {fmtTime(task.completedAt)}</p>}
                    <p className="capitalize">Source: {task.source}</p>
                  </div>

                  {task.status === "declined" && (
                    <div className="bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-3">
                      <p className="text-xs text-red-700"><span className="font-medium">Declined Reason:</span> {task.review?.note}</p>
                    </div>
                  )}

                  {/* Submitted Proof Preview (Photo + Video) */}
                  {task.proof && (task.proof.photoUrl || task.proof.videoUrl) && (
                    <div className="bg-blue-50/60 border border-blue-100 rounded-lg p-2.5 mb-3">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-semibold text-gray-700">📸 Your Submitted Proof</span>
                        <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-medium">Attached</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {task.proof.photoUrl && (
                          <button
                            type="button"
                            onClick={() => setMediaModal({ photoUrl: task.proof.photoUrl, videoUrl: task.proof.videoUrl, taskTitle: task.category })}
                            className="flex items-center gap-1.5 text-xs text-farm-700 bg-white border border-gray-200 hover:border-farm-400 px-2 py-1 rounded-md transition"
                          >
                            📷 Photo
                          </button>
                        )}
                        {task.proof.videoUrl && (
                          <button
                            type="button"
                            onClick={() => setMediaModal({ photoUrl: task.proof.photoUrl, videoUrl: task.proof.videoUrl, taskTitle: task.category })}
                            className="flex items-center gap-1.5 text-xs text-blue-700 bg-white border border-gray-200 hover:border-blue-400 px-2 py-1 rounded-md font-medium transition"
                          >
                            🎥 Play Video
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 mt-2">
                  {task.status === "assigned" && (
                    <button
                      onClick={() => startTask(task)}
                      disabled={actionLoadingId === task._id}
                      className="flex-1 bg-farm-600 hover:bg-farm-700 disabled:opacity-60 text-white text-xs font-semibold rounded-lg py-2.5 transition"
                    >
                      {actionLoadingId === task._id ? "Starting..." : "▶ Start Work"}
                    </button>
                  )}
                  {task.status === "in_progress" && (
                    <button
                      onClick={() => openSubmitModal(task, "complete")}
                      className="flex-1 bg-farm-600 hover:bg-farm-700 text-white text-xs font-semibold rounded-lg py-2.5 transition"
                    >
                      ✅ Complete & Submit Proof
                    </button>
                  )}
                  {task.status === "declined" && (
                    <button
                      onClick={() => openSubmitModal(task, "resubmit")}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg py-2.5 transition"
                    >
                      🔁 Resubmit Proof
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <Pagination page={page} totalItems={tasks.length} pageSize={PAGE_SIZE} onChange={setPage} />
        </>
      )}

      {/* Submit proof modal */}
      {submitModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center px-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-gray-800">
                {submitModal.mode === "resubmit" ? "Resubmit Proof" : "Submit Work Proof"}
              </h2>
              <button onClick={() => setSubmitModal(null)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
            </div>
            <p className="text-xs text-gray-500 mb-4">
              <span className="font-semibold text-gray-700">{submitModal.task.category}:</span> Photo AND video mandatory as proof of work.
            </p>

            {submitError && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">{submitError}</div>
            )}

            <form onSubmit={handleSubmitProof} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  ⚖️ Sample Weight / Batch Note (Optional / Batch Task)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 14.5 kg sample weight / 12 goats"
                  value={sampleWeight}
                  onChange={(e) => setSampleWeight(e.target.value)}
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-farm-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">📷 Photo Proof (Required)</label>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-farm-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">🎥 Video Proof (Required)</label>
                <input
                  type="file"
                  accept="video/*"
                  capture="environment"
                  onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-farm-500"
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-farm-600 hover:bg-farm-700 disabled:opacity-60 text-white font-semibold rounded-lg py-2.5 text-sm mt-3 transition"
              >
                {submitting ? "Uploading Proof..." : "Submit for Approval"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Interactive Media Modal for Worker */}
      {mediaModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-800 text-base">{mediaModal.taskTitle} — Submitted Proof</h3>
              <button onClick={() => setMediaModal(null)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4">
              {mediaModal.photoUrl && (
                <div>
                  <p className="text-xs font-semibold text-gray-700 mb-1">📷 Photo Proof:</p>
                  <img src={mediaModal.photoUrl} alt="Photo proof" className="w-full max-h-72 object-contain rounded-xl border border-gray-200 bg-gray-900" />
                </div>
              )}
              {mediaModal.videoUrl && (
                <div>
                  <p className="text-xs font-semibold text-gray-700 mb-1">🎥 Video Proof Player:</p>
                  <video controls autoPlay className="w-full max-h-72 rounded-xl border border-gray-200 bg-black">
                    <source src={mediaModal.videoUrl} type="video/mp4" />
                    Your browser does not support the video player.
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

export default WorkTasks;
