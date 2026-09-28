import React, { useEffect, useState, useCallback, useRef } from "react";
import api from "../api/axios.js";
import { useAuth } from "../context/AuthContext.jsx";
import Pagination from "../components/Pagination.jsx";

const PAGE_SIZE = 8;

const fmtDateInput = (d) => {
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, "0"), day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};
const roleLabel = (role) => (role || "").split("_").map((w) => w[0]?.toUpperCase() + w.slice(1)).join(" ");

const SESSION_ICON = {
  Milking: "🥛",
  Feeding: "🌿",
  Medication: "💉",
  Cleaning: "🧹",
  Cropping: "🌾",
};
const sessionIcon = (name) => SESSION_ICON[name] || "📋";

const SaveDot = ({ status }) => {
  if (!status) return null;
  if (status === "pending" || status === "saving") {
    return <span className="absolute right-1 top-1.5 w-2 h-2 rounded-full bg-yellow-400 animate-pulse" title="Saving..." />;
  }
  if (status === "saved") {
    return <span className="absolute right-1 top-1.5 text-green-600 text-xs" title="Saved">✓</span>;
  }
  if (status === "error") {
    return <span className="absolute right-1 top-1.5 text-red-500 text-xs" title="Failed to save">⚠</span>;
  }
  return null;
};

const ScheduleBuilder = () => {
  const { user } = useAuth();
  const now = new Date();
  const isPrivileged = ["admin", "manager_operations"].includes(user?.role);

  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [tracks, setTracks] = useState([]); // scoped to the active session only
  const [slots, setSlots] = useState([]);
  const [slotPage, setSlotPage] = useState(1);
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [saveStatus, setSaveStatus] = useState({});
  const saveTimers = useRef({});

  const [tracksModalOpen, setTracksModalOpen] = useState(false);
  const [newTrackName, setNewTrackName] = useState("");

  const [genDate, setGenDate] = useState(fmtDateInput(now));
  const [genLoading, setGenLoading] = useState(false);
  const [genMessage, setGenMessage] = useState("");

  const [sessionLogRows, setSessionLogRows] = useState([]);
  const [sessionLogSessions, setSessionLogSessions] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);

  const loadSessionsAndStaff = useCallback(async () => {
    try {
      const [sessRes, staffRes] = await Promise.all([
        api.get("/schedule/sessions"),
        api.get("/users"),
      ]);
      setSessions(sessRes.data.sessions || []);
      setStaffList(staffRes.data.users || []);
      setActiveSessionId((prev) => prev || sessRes.data.sessions?.[0]?._id || null);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load schedule data");
    }
  }, []);

  // Tracks + slots both belong to the active session — load together
  const loadSessionContent = useCallback(async (sessionId) => {
    if (!sessionId) return;
    setLoading(true);
    try {
      const [trackRes, slotRes] = await Promise.all([
        api.get(`/schedule/tracks?sessionId=${sessionId}`),
        api.get(`/schedule/slots?sessionId=${sessionId}`),
      ]);
      setTracks(trackRes.data.tracks || []);
      setSlots(slotRes.data.slots || []);
      setSlotPage(1);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load session content");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (isPrivileged) loadSessionsAndStaff(); }, [isPrivileged, loadSessionsAndStaff]);
  useEffect(() => { if (activeSessionId) loadSessionContent(activeSessionId); }, [activeSessionId, loadSessionContent]);

  const loadSessionLogs = useCallback(async () => {
    if (!isPrivileged) return;
    setLogsLoading(true);
    try {
      const res = await api.get(`/schedule/session-log/all?date=${genDate}`);
      setSessionLogRows(res.data.rows || []);
      setSessionLogSessions(res.data.sessions || []);
    } catch (err) {
      // non-critical, don't block the page
    } finally {
      setLogsLoading(false);
    }
  }, [isPrivileged, genDate]);

  useEffect(() => { loadSessionLogs(); }, [loadSessionLogs]);

  if (!isPrivileged) {
    return (
      <div className="px-4 md:px-8 py-6 md:py-8">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 text-center">
          <p className="text-3xl mb-2">🔒</p>
          <p className="font-medium text-gray-700">Not authorized</p>
          <p className="text-sm text-gray-500 mt-1">Only admin and managers can build the daily schedule.</p>
        </div>
      </div>
    );
  }

  const activeSession = sessions.find((s) => s._id === activeSessionId);

  const saveSessionField = async (field, value) => {
    try {
      await api.put(`/schedule/sessions/${activeSessionId}`, { [field]: value });
      loadSessionsAndStaff();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to update session");
    }
  };

  const addTrack = async (e) => {
    e.preventDefault();
    if (!newTrackName.trim()) return;
    try {
      await api.post("/schedule/tracks", { session: activeSessionId, name: newTrackName.trim() });
      setNewTrackName("");
      loadSessionContent(activeSessionId);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to add track");
    }
  };

  const updateTrackStaff = async (trackId, staffId) => {
    try {
      await api.put(`/schedule/tracks/${trackId}`, { defaultAssignedTo: staffId || null });
      loadSessionContent(activeSessionId);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to update track");
    }
  };

  const renameTrack = async (trackId, name) => {
    try {
      await api.put(`/schedule/tracks/${trackId}`, { name });
      loadSessionContent(activeSessionId);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to rename track");
    }
  };

  const removeTrack = async (track) => {
    if (!confirm(`Remove track "${track.name}"? It will be cleared from every time slot.`)) return;
    try {
      await api.delete(`/schedule/tracks/${track._id}`);
      loadSessionContent(activeSessionId);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to remove track");
    }
  };

  const debouncedSave = (key, fn) => {
    if (saveTimers.current[key]) clearTimeout(saveTimers.current[key]);
    setSaveStatus((prev) => ({ ...prev, [key]: "pending" }));
    saveTimers.current[key] = setTimeout(async () => {
      setSaveStatus((prev) => ({ ...prev, [key]: "saving" }));
      try {
        await fn();
        setSaveStatus((prev) => ({ ...prev, [key]: "saved" }));
        setTimeout(() => setSaveStatus((prev) => ({ ...prev, [key]: undefined })), 1500);
      } catch (err) {
        setSaveStatus((prev) => ({ ...prev, [key]: "error" }));
        setError(err.response?.data?.message || "Failed to save — check your connection and try again");
      }
    }, 600);
  };

  const addSlot = async () => {
    try {
      const res = await api.post("/schedule/slots", {
        session: activeSessionId,
        startTime: "09:00",
        endTime: "09:15",
        order: slots.length,
        entries: tracks.map((t) => ({ track: t._id, description: "" })),
      });
      setSlots([...slots, res.data.slot]);
      setSlotPage(Math.ceil((slots.length + 1) / PAGE_SIZE));
    } catch (err) {
      alert(err.response?.data?.message || "Failed to add row");
    }
  };

  const saveSlotStartTime = async (slotId, startTime) => {
    await api.put(`/schedule/slots/${slotId}`, { startTime });
  };
  const saveSlotEndTime = async (slotId, endTime) => {
    await api.put(`/schedule/slots/${slotId}`, { endTime });
  };
  const saveSlotEntry = async (slotId, entries) => {
    await api.put(`/schedule/slots/${slotId}`, { entries });
  };

  const updateLocalSlot = (slotId, trackId, description) => {
    let newEntries = null;
    setSlots((prev) =>
      prev.map((s) => {
        if (s._id !== slotId) return s;
        const entries = tracks.map((t) => {
          const existing = s.entries.find((e) => e.track?._id === t._id);
          return { track: { _id: t._id, name: t.name }, description: t._id === trackId ? description : (existing?.description || "") };
        });
        newEntries = entries;
        return { ...s, entries };
      })
    );
    debouncedSave(`${slotId}:${trackId}`, () =>
      saveSlotEntry(slotId, newEntries.map((e) => ({ track: e.track._id, description: e.description })))
    );
  };

  const updateLocalStartTime = (slotId, value) => {
    setSlots((prev) => prev.map((s) => (s._id === slotId ? { ...s, startTime: value } : s)));
    debouncedSave(`${slotId}:start`, () => saveSlotStartTime(slotId, value));
  };

  const updateLocalEndTime = (slotId, value) => {
    setSlots((prev) => prev.map((s) => (s._id === slotId ? { ...s, endTime: value } : s)));
    debouncedSave(`${slotId}:end`, () => saveSlotEndTime(slotId, value));
  };

  const deleteSlot = async (slot) => {
    if (!confirm(`Remove the "${slot.startTime}–${slot.endTime}" row?`)) return;
    try {
      await api.delete(`/schedule/slots/${slot._id}`);
      setSlots(slots.filter((s) => s._id !== slot._id));
    } catch (err) {
      alert(err.response?.data?.message || "Failed to remove row");
    }
  };

  const generateTasks = async () => {
    setGenLoading(true);
    setGenMessage("");
    try {
      const res = await api.post("/schedule/generate", { date: genDate });
      setGenMessage(`✅ ${res.data.message}`);
      loadSessionLogs();
    } catch (err) {
      setGenMessage(`❌ ${err.response?.data?.message || "Failed to generate tasks"}`);
    } finally {
      setGenLoading(false);
    }
  };

  const unassignedTracks = tracks.filter((t) => !t.defaultAssignedTo);
  const pagedSlots = slots.slice((slotPage - 1) * PAGE_SIZE, slotPage * PAGE_SIZE);

  return (
    <div className="px-4 md:px-8 py-6 md:py-8">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-800">Daily Schedule</h1>
          <p className="text-sm text-gray-500 mt-0.5">Build the time-based work grid, then generate real tasks for any day</p>
        </div>
        <button
          onClick={() => setTracksModalOpen(true)}
          className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg px-4 py-2 transition shadow-sm"
        >
          👥 Manage Tracks ({tracks.length})
        </button>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">{error}</div>
      )}

      {/* Session tabs — pill style, icon per session */}
      <div className="flex flex-wrap gap-2 mb-5">
        {sessions.map((s) => (
          <button
            key={s._id}
            onClick={() => setActiveSessionId(s._id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition ${
              activeSessionId === s._id
                ? "bg-farm-600 border-farm-600 text-white shadow-sm"
                : "bg-white border-gray-200 text-gray-600 hover:border-farm-400 hover:text-farm-700"
            }`}
          >
            <span className="text-base">{sessionIcon(s.name)}</span>
            {s.name}
          </button>
        ))}
      </div>

      {unassignedTracks.length > 0 && (
        <div className="mb-4 bg-yellow-50 border border-yellow-200 text-yellow-800 text-sm rounded-lg px-4 py-3">
          ⚠️ {unassignedTracks.length} track{unassignedTracks.length !== 1 ? "s" : ""} in this session ({unassignedTracks.map((t) => t.name).join(", ")}) has no staff assigned — won't generate tasks until assigned in "Manage Tracks".
        </div>
      )}

      {/* Session header card — icon, editable name/time */}
      {activeSession && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-5 flex flex-wrap items-center gap-4">
          <div className="w-11 h-11 shrink-0 rounded-xl bg-farm-50 flex items-center justify-center text-xl">
            {sessionIcon(activeSession.name)}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <input
              defaultValue={activeSession.name}
              key={activeSession._id + "-name"}
              onBlur={(e) => e.target.value !== activeSession.name && saveSessionField("name", e.target.value)}
              className="font-semibold text-gray-800 text-base border-b border-transparent hover:border-gray-300 focus:border-farm-500 focus:outline-none px-1 py-0.5"
            />
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <input
                defaultValue={activeSession.startTime}
                key={activeSession._id + "-start"}
                placeholder="Start"
                onBlur={(e) => e.target.value !== activeSession.startTime && saveSessionField("startTime", e.target.value)}
                className="border-b border-transparent hover:border-gray-300 focus:border-farm-500 focus:outline-none px-1 py-0.5 w-24"
              />
              <span className="text-gray-300">→</span>
              <input
                defaultValue={activeSession.endTime}
                key={activeSession._id + "-end"}
                placeholder="End"
                onBlur={(e) => e.target.value !== activeSession.endTime && saveSessionField("endTime", e.target.value)}
                className="border-b border-transparent hover:border-gray-300 focus:border-farm-500 focus:outline-none px-1 py-0.5 w-24"
              />
            </div>
          </div>
          <span className="ml-auto text-xs text-gray-400">{slots.length} time slot{slots.length !== 1 ? "s" : ""} · {tracks.length} track{tracks.length !== 1 ? "s" : ""}</span>
        </div>
      )}

      {/* The grid */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-6">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 bg-gray-50 border-b border-r border-gray-200 px-3 py-2.5 text-left font-medium text-gray-500 min-w-[190px]">
                  Time
                </th>
                {tracks.map((t) => (
                  <th key={t._id} className="bg-gray-50 border-b border-gray-200 px-3 py-2.5 text-left font-medium text-gray-500 min-w-[180px]">
                    <div className="flex flex-col">
                      <span>{t.name}</span>
                      <span className={`text-[10px] font-normal normal-case ${t.defaultAssignedTo ? "text-farm-600" : "text-red-400"}`}>
                        {t.defaultAssignedTo?.name || "— unassigned —"}
                      </span>
                    </div>
                  </th>
                ))}
                <th className="bg-gray-50 border-b border-gray-200 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={tracks.length + 2} className="px-4 py-10 text-center text-gray-400">Loading...</td></tr>
              ) : slots.length === 0 ? (
                <tr><td colSpan={tracks.length + 2} className="px-4 py-10 text-center text-gray-400">No time slots yet — add the first row below</td></tr>
              ) : (
                pagedSlots.map((slot) => (
                  <tr key={slot._id} className="hover:bg-gray-50 transition">
                    <td className="sticky left-0 z-10 bg-white border-r border-b border-gray-100 px-2 py-1.5">
                      <div className="flex items-center gap-1">
                        <div className="relative">
                          <input
                            type="time"
                            value={slot.startTime}
                            onChange={(e) => updateLocalStartTime(slot._id, e.target.value)}
                            className="text-xs font-medium text-gray-700 border-0 focus:ring-1 focus:ring-farm-500 rounded px-1 py-1 w-[88px]"
                          />
                          <SaveDot status={saveStatus[`${slot._id}:start`]} />
                        </div>
                        <span className="text-gray-300 text-xs">–</span>
                        <div className="relative">
                          <input
                            type="time"
                            value={slot.endTime}
                            onChange={(e) => updateLocalEndTime(slot._id, e.target.value)}
                            className="text-xs font-medium text-gray-700 border-0 focus:ring-1 focus:ring-farm-500 rounded px-1 py-1 w-[88px]"
                          />
                          <SaveDot status={saveStatus[`${slot._id}:end`]} />
                        </div>
                      </div>
                    </td>
                    {tracks.map((t) => {
                      const entry = slot.entries.find((e) => e.track?._id === t._id);
                      return (
                        <td key={t._id} className="border-b border-gray-100 px-2 py-1.5">
                          <div className="relative">
                            <textarea
                              rows={1}
                              value={entry?.description || ""}
                              onChange={(e) => updateLocalSlot(slot._id, t._id, e.target.value)}
                              placeholder="—"
                              className="w-full text-xs text-gray-700 border-0 focus:ring-1 focus:ring-farm-500 rounded px-1.5 py-1 pr-5 resize-y"
                            />
                            <SaveDot status={saveStatus[`${slot._id}:${t._id}`]} />
                          </div>
                        </td>
                      );
                    })}
                    <td className="border-b border-gray-100 text-center">
                      <button onClick={() => deleteSlot(slot)} className="text-gray-300 hover:text-red-500 text-sm px-1">✕</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {!loading && slots.length > 0 && (
          <Pagination page={slotPage} totalItems={slots.length} pageSize={PAGE_SIZE} onChange={setSlotPage} />
        )}
        <div className="px-4 py-3 border-t border-gray-100">
          <button onClick={addSlot} className="text-sm font-medium text-farm-700 hover:text-farm-800">
            + Add Time Slot
          </button>
        </div>
      </div>

      {/* Generate bar */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-6 flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium text-gray-700">⚡ Generate real tasks for:</span>
        <input
          type="date"
          value={genDate}
          onChange={(e) => setGenDate(e.target.value)}
          className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-farm-500"
        />
        <button
          onClick={generateTasks}
          disabled={genLoading}
          className="bg-farm-600 hover:bg-farm-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg px-4 py-2 transition"
        >
          {genLoading ? "Generating..." : "Generate All Sessions"}
        </button>
        {genMessage && <span className="text-sm">{genMessage}</span>}
      </div>

      {/* Session status table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 text-sm font-semibold text-gray-700">
          Session Status — {genDate}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-left text-gray-500">
                <th className="px-4 py-2.5 font-medium">Staff</th>
                {sessionLogSessions.map((s) => (
                  <th key={s._id} className="px-4 py-2.5 font-medium">
                    <span className="mr-1">{sessionIcon(s.name)}</span>{s.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logsLoading ? (
                <tr><td colSpan={sessionLogSessions.length + 1} className="px-4 py-6 text-center text-gray-400">Loading...</td></tr>
              ) : sessionLogRows.length === 0 ? (
                <tr><td colSpan={sessionLogSessions.length + 1} className="px-4 py-6 text-center text-gray-400">No staff assigned to any track yet</td></tr>
              ) : (
                sessionLogRows.map((row) => (
                  <tr key={row.staff._id} className="border-b border-gray-50 last:border-0">
                    <td className="px-4 py-2.5 font-medium text-gray-800">{row.staff.name}</td>
                    {row.sessions.map((s) => (
                      <td key={s.sessionId} className="px-4 py-2.5">
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                          s.status === "completed" ? "bg-green-100 text-green-700" :
                          s.status === "in_progress" ? "bg-blue-100 text-blue-700" :
                          "bg-gray-100 text-gray-500"
                        }`}>
                          {s.status === "completed" ? "✓ Done" : s.status === "in_progress" ? "● Active" : "—"}
                        </span>
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manage Tracks modal — scoped to the active session */}
      {tracksModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center px-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-lg font-semibold text-gray-800">Manage Tracks</h2>
              <button onClick={() => setTracksModalOpen(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
            </div>
            <p className="text-xs text-gray-500 mb-4">
              {sessionIcon(activeSession?.name)} <span className="font-medium">{activeSession?.name}</span> — assign whichever real staff member fills each track today.
            </p>

            <div className="space-y-3 mb-5">
              {tracks.map((t) => (
                <div key={t._id} className="border border-gray-200 rounded-lg p-3">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <input
                      defaultValue={t.name}
                      key={t._id + "-name"}
                      onBlur={(e) => e.target.value !== t.name && renameTrack(t._id, e.target.value)}
                      className="text-sm font-medium text-gray-800 border-b border-transparent hover:border-gray-300 focus:border-farm-500 focus:outline-none flex-1"
                    />
                    <button onClick={() => removeTrack(t)} className="text-xs text-red-500 hover:text-red-700">Remove</button>
                  </div>
                  <select
                    value={t.defaultAssignedTo?._id || ""}
                    onChange={(e) => updateTrackStaff(t._id, e.target.value)}
                    className="w-full text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-farm-500"
                  >
                    <option value="">— Unassigned —</option>
                    {staffList.map((s) => (
                      <option key={s._id} value={s._id}>{s.name} ({roleLabel(s.role)})</option>
                    ))}
                  </select>
                </div>
              ))}
              {tracks.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-4">No tracks in this session yet</p>
              )}
            </div>

            <form onSubmit={addTrack} className="flex gap-2">
              <input
                type="text"
                placeholder="e.g. Worker 4"
                value={newTrackName}
                onChange={(e) => setNewTrackName(e.target.value)}
                className="flex-1 text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-farm-500"
              />
              <button type="submit" className="bg-gray-800 hover:bg-gray-900 text-white text-sm font-medium rounded-lg px-4 py-2 transition">
                Add
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScheduleBuilder;
