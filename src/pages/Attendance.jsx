import React, { useEffect, useState, useCallback } from "react";
import api from "../api/axios.js";
import { useAuth } from "../context/AuthContext.jsx";
import { getCurrentLocation } from "../utils/geolocation.js";

const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const IST = "Asia/Kolkata";

const fmtTime = (iso) =>
  iso ? new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", timeZone: IST }) : "—";

const fmtDate = (iso) =>
  new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", weekday: "short", timeZone: IST });

const fmtDateInput = (d) => {
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, "0"), day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const isSameDay = (a, b) => new Date(a).toDateString() === new Date(b).toDateString();

const editStatusBadge = {
  pending: "bg-yellow-100 text-yellow-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
};

const Attendance = () => {
  const { user } = useAuth();
  const now = new Date();

  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [records, setRecords] = useState([]);
  const [salary, setSalary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");

  const [editModal, setEditModal] = useState(null);
  const [editForm, setEditForm] = useState({ proposedTimeIn: "", proposedTimeOut: "", reason: "" });
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState("");

  const [leaveModal, setLeaveModal] = useState(false);
  const [leaveForm, setLeaveForm] = useState({ date: fmtDateInput(now), reason: "" });
  const [leaveSubmitting, setLeaveSubmitting] = useState(false);
  const [leaveError, setLeaveError] = useState("");

  const [advanceModal, setAdvanceModal] = useState(false);
  const [advanceForm, setAdvanceForm] = useState({ date: fmtDateInput(now), amount: "", reason: "" });
  const [advanceSubmitting, setAdvanceSubmitting] = useState(false);
  const [advanceError, setAdvanceError] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [attRes, salRes] = await Promise.all([
        api.get(`/attendance/me?month=${month}&year=${year}`),
        api.get(`/attendance/salary/${user._id}?month=${month}&year=${year}`),
      ]);
      setRecords(attRes.data.records || []);
      setSalary(salRes.data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load attendance");
    } finally {
      setLoading(false);
    }
  }, [month, year, user?._id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const todayRecord = records.find((r) => isSameDay(r.date, now));

  const handleCheckIn = async () => {
    setActionLoading(true);
    setError("");
    try {
      const { latitude, longitude } = await getCurrentLocation();
      await api.post("/attendance/checkin", { latitude, longitude });
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Check-in failed");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckOut = async () => {
    setActionLoading(true);
    setError("");
    try {
      const { latitude, longitude } = await getCurrentLocation();
      await api.post("/attendance/checkout", { latitude, longitude });
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Check-out failed");
    } finally {
      setActionLoading(false);
    }
  };

  const openEditRequest = (record) => {
    setEditModal(record);
    setEditForm({
      proposedTimeIn: record.timeIn?.time ? record.timeIn.time.slice(0, 16) : "",
      proposedTimeOut: record.timeOut?.time ? record.timeOut.time.slice(0, 16) : "",
      reason: "",
    });
    setEditError("");
  };

  const submitEditRequest = async (e) => {
    e.preventDefault();
    setEditError("");
    setEditSubmitting(true);
    try {
      const payload = { reason: editForm.reason };
      if (editForm.proposedTimeIn) payload.proposedTimeIn = new Date(editForm.proposedTimeIn).toISOString();
      if (editForm.proposedTimeOut) payload.proposedTimeOut = new Date(editForm.proposedTimeOut).toISOString();

      await api.post(`/attendance/${editModal._id}/edit-request`, payload);
      setEditModal(null);
      fetchData();
    } catch (err) {
      setEditError(err.response?.data?.message || "Failed to submit edit request");
    } finally {
      setEditSubmitting(false);
    }
  };

  const openLeaveModal = () => {
    setLeaveForm({ date: fmtDateInput(now), reason: "" });
    setLeaveError("");
    setLeaveModal(true);
  };

  const submitLeaveRequest = async (e) => {
    e.preventDefault();
    setLeaveError("");
    setLeaveSubmitting(true);
    try {
      await api.post("/attendance/leave-request", leaveForm);
      setLeaveModal(false);
      fetchData();
    } catch (err) {
      setLeaveError(err.response?.data?.message || "Failed to submit leave request");
    } finally {
      setLeaveSubmitting(false);
    }
  };

  const openAdvanceModal = () => {
    setAdvanceForm({ date: fmtDateInput(now), amount: "", reason: "" });
    setAdvanceError("");
    setAdvanceModal(true);
  };

  const submitAdvanceSalary = async (e) => {
    e.preventDefault();
    setAdvanceError("");
    setAdvanceSubmitting(true);
    try {
      await api.post("/attendance/advance-salary", advanceForm);
      setAdvanceModal(false);
      fetchData();
    } catch (err) {
      setAdvanceError(err.response?.data?.message || "Failed to submit advance salary request");
    } finally {
      setAdvanceSubmitting(false);
    }
  };

  const status = !todayRecord
    ? "not-checked-in"
    : !todayRecord.timeOut?.time
    ? "checked-in"
    : "completed";

  const daysInMonth = new Date(year, month, 0).getDate();
  const todayStr = fmtDateInput(now);
  const calendarRows = Array.from({ length: daysInMonth }, (_, i) => {
    const dayDate = new Date(year, month - 1, i + 1);
    const dayStr = fmtDateInput(dayDate);
    const record = records.find((r) => isSameDay(r.date, dayDate));
    const isFuture = dayStr > todayStr;
    return { dayDate, dayStr, record, isFuture };
  });

  return (
    <div className="px-4 md:px-8 py-6 md:py-8">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-800">Attendance</h1>
          <p className="text-sm text-gray-500 mt-0.5">Mark your attendance, apply for leave, or request advance salary</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={openAdvanceModal}
            className="bg-farm-600 hover:bg-farm-700 text-white text-sm font-medium rounded-lg px-4 py-2 transition shadow-sm"
          >
            💵 Apply Advance Salary
          </button>
          <button
            onClick={openLeaveModal}
            className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg px-4 py-2 transition"
          >
            🗓️ Apply Leave
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-sm text-gray-500">
              {now.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: IST })}
            </p>
            <div className="flex items-center gap-4 mt-1">
              <div>
                <p className="text-xs text-gray-400">Time In</p>
                <p className="text-lg font-semibold text-gray-800">{fmtTime(todayRecord?.timeIn?.time)}</p>
              </div>
              <div className="w-px h-8 bg-gray-200" />
              <div>
                <p className="text-xs text-gray-400">Time Out</p>
                <p className="text-lg font-semibold text-gray-800">{fmtTime(todayRecord?.timeOut?.time)}</p>
              </div>
            </div>
          </div>

          <div>
            {status === "not-checked-in" && (
              <button
                onClick={handleCheckIn}
                disabled={actionLoading}
                className="bg-farm-600 hover:bg-farm-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg px-6 py-3 transition w-full sm:w-auto"
              >
                {actionLoading ? "Getting location..." : "📍 Check In"}
              </button>
            )}
            {status === "checked-in" && (
              <button
                onClick={handleCheckOut}
                disabled={actionLoading}
                className="bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg px-6 py-3 transition w-full sm:w-auto"
              >
                {actionLoading ? "Getting location..." : "📍 Check Out"}
              </button>
            )}
            {status === "completed" && (
              <span className="inline-block bg-green-50 text-green-700 text-sm font-medium rounded-lg px-6 py-3">
                ✅ Day completed
              </span>
            )}
          </div>
        </div>
        {todayRecord?.timeIn?.address && (
          <p className="text-xs text-gray-400 mt-3">📍 In: {todayRecord.timeIn.address}</p>
        )}
        {todayRecord?.timeOut?.address && (
          <p className="text-xs text-gray-400 mt-0.5">📍 Out: {todayRecord.timeOut.address}</p>
        )}
      </div>

      <div className="flex items-center gap-2 mb-4">
        <select
          value={month}
          onChange={(e) => setMonth(Number(e.target.value))}
          className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-farm-500"
        >
          {MONTH_NAMES.map((m, i) => (
            <option key={m} value={i + 1}>{m}</option>
          ))}
        </select>
        <select
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-farm-500"
        >
          {[now.getFullYear(), now.getFullYear() - 1].map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      {salary && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">
            Salary Summary — {MONTH_NAMES[month - 1]} {year}
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
            <div>
              <p className="text-xs text-gray-400">Present</p>
              <p className="text-lg font-semibold text-gray-800">{salary.attendance.presentDays}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Leave</p>
              <p className="text-lg font-semibold text-gray-800">{salary.attendance.leaveDays}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Absent</p>
              <p className="text-lg font-semibold text-gray-800">{salary.attendance.absentDays}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Advance Taken</p>
              <p className="text-lg font-semibold text-amber-700">₹{salary.advanceSalaryTotal?.toLocaleString("en-IN") || 0}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Free leaves/mo</p>
              <p className="text-lg font-semibold text-gray-800">{salary.freeLeavesPerMonth}</p>
            </div>
          </div>
          <div className="border-t border-gray-100 pt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
            {salary.isDailyWorker ? (
              <>
                <span className="text-gray-500">
                  Daily Rate: <span className="font-medium text-gray-700">₹{salary.perDayRate?.toLocaleString("en-IN")}/day</span>
                </span>
                <span className="text-gray-500">
                  Gross Earned ({salary.attendance.presentDays} days): <span className="font-medium text-green-700">₹{salary.grossSalary?.toLocaleString("en-IN")}</span>
                </span>
                {salary.advanceSalaryTotal > 0 && (
                  <span className="text-gray-500">
                    Advance Deducted: <span className="font-medium text-amber-600">−₹{salary.advanceSalaryTotal.toLocaleString("en-IN")}</span>
                  </span>
                )}
                <span className="text-gray-700 font-semibold">
                  Net Payable: <span className="text-farm-700">₹{salary.netSalary.toLocaleString("en-IN")}</span>
                </span>
              </>
            ) : (
              <>
                <span className="text-gray-500">
                  Monthly Salary: <span className="font-medium text-gray-700">₹{salary.user.monthlySalary.toLocaleString("en-IN")}</span>
                </span>
                <span className="text-gray-500">
                  Absence Deduction: <span className="font-medium text-red-600">−₹{salary.deduction.toLocaleString("en-IN")}</span>
                </span>
                {salary.advanceSalaryTotal > 0 && (
                  <span className="text-gray-500">
                    Advance Deducted: <span className="font-medium text-amber-600">−₹{salary.advanceSalaryTotal.toLocaleString("en-IN")}</span>
                  </span>
                )}
                <span className="text-gray-700 font-semibold">
                  Net Payable: <span className="text-farm-700">₹{salary.netSalary.toLocaleString("en-IN")}</span>
                </span>
              </>
            )}
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
        <table className="w-full text-sm min-w-[750px]">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-left text-gray-500">
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Time In</th>
              <th className="px-4 py-3 font-medium">Time Out</th>
              <th className="px-4 py-3 font-medium">Hours</th>
              <th className="px-4 py-3 font-medium">Status / Requests</th>
              <th className="px-4 py-3 font-medium text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Loading...</td></tr>
            ) : (
              calendarRows.map(({ dayDate, dayStr, record, isFuture }) => (
                <tr key={dayStr} className={`border-b border-gray-100 last:border-0 hover:bg-gray-50 ${dayStr === todayStr ? "bg-farm-50/40" : ""}`}>
                  <td className="px-4 py-3 text-gray-700">{fmtDate(dayDate)}</td>
                  <td className="px-4 py-3 text-gray-600">
                    <div>{fmtTime(record?.timeIn?.time)}</div>
                    {record?.timeIn?.address && (
                      <div className="text-xs text-gray-400 max-w-[160px] truncate" title={record.timeIn.address}>
                        📍 {record.timeIn.address}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    <div>{fmtTime(record?.timeOut?.time)}</div>
                    {record?.timeOut?.address && (
                      <div className="text-xs text-gray-400 max-w-[160px] truncate" title={record.timeOut.address}>
                        📍 {record.timeOut.address}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{record?.workedHours != null ? `${record.workedHours}h` : "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1 items-start">
                      {record?.editRequest?.requested && record.editRequest.status === "pending" && (
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${editStatusBadge.pending}`}>Edit pending</span>
                      )}
                      {record?.leaveRequest?.requested && record.leaveRequest.status === "pending" && (
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${editStatusBadge.pending}`}>Leave pending</span>
                      )}
                      {record?.advanceSalaryRequest?.requested && (
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          record.advanceSalaryRequest.status === "approved" ? "bg-green-100 text-green-700" :
                          record.advanceSalaryRequest.status === "rejected" ? "bg-red-100 text-red-700" :
                          "bg-amber-100 text-amber-800"
                        }`}>
                          Advance ₹{record.advanceSalaryRequest.amount} ({record.advanceSalaryRequest.status})
                        </span>
                      )}
                      {record ? (
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 capitalize">
                          {record.status}
                        </span>
                      ) : isFuture ? (
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-50 text-gray-400">Upcoming</span>
                      ) : (
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-50 text-red-600">Absent</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {record && (
                      <button
                        onClick={() => openEditRequest(record)}
                        disabled={record.editRequest?.requested && record.editRequest.status === "pending"}
                        className="text-xs font-medium px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
                      >
                        Request Edit
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {editModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center px-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800">Request Edit</h2>
              <button
                onClick={() => setEditModal(null)}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
              >
                &times;
              </button>
            </div>
            <p className="text-xs text-gray-500 mb-4">
              For {fmtDate(editModal.date)} — this needs admin/manager approval before it applies.
            </p>

            {editError && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">
                {editError}
              </div>
            )}

            <form onSubmit={submitEditRequest} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Corrected Time In</label>
                <input
                  type="datetime-local"
                  value={editForm.proposedTimeIn}
                  onChange={(e) => setEditForm({ ...editForm, proposedTimeIn: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-farm-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Corrected Time Out</label>
                <input
                  type="datetime-local"
                  value={editForm.proposedTimeOut}
                  onChange={(e) => setEditForm({ ...editForm, proposedTimeOut: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-farm-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Reason</label>
                <textarea
                  required
                  rows={2}
                  value={editForm.reason}
                  onChange={(e) => setEditForm({ ...editForm, reason: e.target.value })}
                  placeholder="Forgot to check out, network issue, etc."
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-farm-500"
                />
              </div>
              <button
                type="submit"
                disabled={editSubmitting}
                className="w-full bg-farm-600 hover:bg-farm-700 disabled:opacity-60 text-white font-medium rounded-lg py-2.5 text-sm mt-2 transition"
              >
                {editSubmitting ? "Submitting..." : "Submit for Approval"}
              </button>
            </form>
          </div>
        </div>
      )}

      {leaveModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center px-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800">Apply Leave</h2>
              <button
                onClick={() => setLeaveModal(false)}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
              >
                &times;
              </button>
            </div>
            <p className="text-xs text-gray-500 mb-4">
              First {salary?.freeLeavesPerMonth ?? 2} approved leaves each month are free — after that they're deducted per day.
            </p>

            {leaveError && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">
                {leaveError}
              </div>
            )}

            <form onSubmit={submitLeaveRequest} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Date</label>
                <input
                  type="date"
                  required
                  value={leaveForm.date}
                  onChange={(e) => setLeaveForm({ ...leaveForm, date: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-farm-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Reason</label>
                <textarea
                  required
                  rows={2}
                  value={leaveForm.reason}
                  onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                  placeholder="Personal, medical, family function, etc."
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-farm-500"
                />
              </div>
              <button
                type="submit"
                disabled={leaveSubmitting}
                className="w-full bg-farm-600 hover:bg-farm-700 disabled:opacity-60 text-white font-medium rounded-lg py-2.5 text-sm mt-2 transition"
              >
                {leaveSubmitting ? "Submitting..." : "Submit for Approval"}
              </button>
            </form>
          </div>
        </div>
      )}

      {advanceModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center px-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800">Apply Advance Salary</h2>
              <button
                onClick={() => setAdvanceModal(false)}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
              >
                &times;
              </button>
            </div>
            <p className="text-xs text-gray-500 mb-4">
              Request advance salary payment. Subject to admin/manager approval.
            </p>

            {advanceError && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">
                {advanceError}
              </div>
            )}

            <form onSubmit={submitAdvanceSalary} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Date</label>
                <input
                  type="date"
                  required
                  value={advanceForm.date}
                  onChange={(e) => setAdvanceForm({ ...advanceForm, date: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-farm-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Amount (₹)</label>
                <input
                  type="number"
                  min="1"
                  required
                  placeholder="e.g. 5000"
                  value={advanceForm.amount}
                  onChange={(e) => setAdvanceForm({ ...advanceForm, amount: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-farm-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Reason</label>
                <textarea
                  required
                  rows={2}
                  value={advanceForm.reason}
                  onChange={(e) => setAdvanceForm({ ...advanceForm, reason: e.target.value })}
                  placeholder="Emergency expense, medical, festival, etc."
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-farm-500"
                />
              </div>
              <button
                type="submit"
                disabled={advanceSubmitting}
                className="w-full bg-farm-600 hover:bg-farm-700 disabled:opacity-60 text-white font-medium rounded-lg py-2.5 text-sm mt-2 transition"
              >
                {advanceSubmitting ? "Submitting..." : "Submit Advance Salary Request"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Attendance;