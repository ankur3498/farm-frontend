import React, { useEffect, useState } from "react";
import api from "../api/axios.js";
import { useAuth } from "../context/AuthContext.jsx";
import Pagination from "../components/Pagination.jsx";

const ROLES = ["manager_operations", "field_manager", "worker", "temporary_worker", "audit_manager"];
const PAGE_SIZE = 10;

const roleLabel = (role) =>
  role
    .split("_")
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");

const roleColors = {
  manager_operations: "bg-blue-100 text-blue-700",
  field_manager: "bg-purple-100 text-purple-700",
  worker: "bg-green-100 text-green-700",
  temporary_worker: "bg-yellow-100 text-yellow-700",
  audit_manager: "bg-pink-100 text-pink-700",
};

const emptyForm = {
  name: "",
  mobile: "",
  email: "",
  role: "worker",
  salary: "",
  address: "",
  dateOfJoining: "",
  pin: "1234",
};

const Staff = () => {
  const { user } = useAuth();
  const isPrivileged = ["admin", "manager_operations"].includes(user?.role);
  const isAdmin = user?.role === "admin";

  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [page, setPage] = useState(1);

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [showPin, setShowPin] = useState(false);
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null); // null = Add mode, id = Edit mode

  const fetchStaff = async () => {
    if (!isPrivileged) return;
    setLoading(true);
    setError("");
    try {
      const query = roleFilter ? `?role=${roleFilter}` : "";
      const res = await api.get(`/users${query}`);
      setStaff(res.data.users || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load staff");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isPrivileged) return;
    fetchStaff();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPrivileged, roleFilter]);

  if (!isPrivileged) {
    return (
      <div className="px-4 md:px-8 py-6 md:py-8">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 text-center">
          <p className="text-3xl mb-2">🔒</p>
          <p className="font-medium text-gray-700">Not authorized</p>
          <p className="text-sm text-gray-500 mt-1">Only admin and managers can view Staff Directory.</p>
        </div>
      </div>
    );
  }

  const toggleActive = async (member) => {
    if (!isAdmin) return;
    const action = member.isActive ? "deactivate" : "activate";
    try {
      await api.put(`/users/${member._id}/${action}`);
      fetchStaff();
    } catch (err) {
      alert(err.response?.data?.message || `Failed to ${action} user`);
    }
  };

  const handleFormChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const openAddModal = () => {
    if (!isAdmin) return;
    setEditingId(null);
    setForm(emptyForm);
    setFormError("");
    setShowModal(true);
  };

  const openEditModal = (member) => {
    if (!isAdmin) return;
    setEditingId(member._id);
    setForm({
      name: member.name || "",
      mobile: member.mobile || "",
      email: member.email || "",
      role: member.role || "worker",
      salary: member.salary ?? "",
      address: member.address || "",
      dateOfJoining: member.dateOfJoining ? member.dateOfJoining.slice(0, 10) : "",
      pin: "",
    });
    setFormError("");
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
    setForm(emptyForm);
    setFormError("");
  };

  const handleSubmitStaff = async (e) => {
    e.preventDefault();
    if (!isAdmin) return;
    setFormError("");
    setSubmitting(true);
    try {
      const payload = { ...form, salary: Number(form.salary) };
      if (editingId) {
        await api.put(`/users/${editingId}`, payload);
      } else {
        await api.post("/auth/create-user", payload);
      }
      closeModal();
      fetchStaff();
    } catch (err) {
      setFormError(err.response?.data?.message || `Failed to ${editingId ? "update" : "create"} staff`);
    } finally {
      setSubmitting(false);
    }
  };

  const pagedStaff = staff.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="px-4 md:px-8 py-6 md:py-8">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-800">Staff Directory</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage farm operations staff and their roles</p>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-2">
          <select
            value={roleFilter}
            onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
            className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-farm-500"
          >
            <option value="">All Roles</option>
            {ROLES.map((r) => (
              <option key={r} value={r}>{roleLabel(r)}</option>
            ))}
          </select>
          <span className="text-sm text-gray-500">{staff.length} staff</span>
        </div>
        <button
          onClick={openAddModal}
          disabled={!isAdmin}
          title={isAdmin ? "Add staff member" : "Only Admin can add new staff"}
          className={`text-sm font-medium rounded-lg px-4 py-2 transition ${
            isAdmin
              ? "bg-farm-600 hover:bg-farm-700 text-white cursor-pointer"
              : "bg-gray-200 text-gray-400 cursor-not-allowed"
          }`}
        >
          + Add Staff
        </button>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm min-w-[800px]">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-left text-gray-500">
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Mobile</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Salary</th>
              <th className="px-4 py-3 font-medium">Joined</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-400">Loading...</td>
              </tr>
            ) : pagedStaff.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-400">No staff found</td>
              </tr>
            ) : (
              pagedStaff.map((m) => (
                <tr key={m._id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">{m.name}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${roleColors[m.role] || "bg-gray-100 text-gray-700"}`}>
                      {roleLabel(m.role)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{m.mobile}</td>
                  <td className="px-4 py-3 text-gray-600">{m.email}</td>
                  <td className="px-4 py-3 text-gray-600 font-medium">
                    ₹{m.salary?.toLocaleString("en-IN")}{m.role === "temporary_worker" ? " / day" : " / mo"}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {m.dateOfJoining ? new Date(m.dateOfJoining).toLocaleDateString("en-IN") : "-"}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${m.isActive ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-600"}`}>
                      {m.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEditModal(m)}
                        disabled={!isAdmin}
                        title={isAdmin ? "Edit staff" : "Only Admin can edit staff"}
                        className={`text-xs font-medium px-3 py-1.5 rounded-lg transition ${
                          isAdmin
                            ? "bg-blue-50 text-blue-600 hover:bg-blue-100"
                            : "bg-gray-100 text-gray-400 cursor-not-allowed opacity-60"
                        }`}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => toggleActive(m)}
                        disabled={!isAdmin}
                        title={isAdmin ? `${m.isActive ? "Deactivate" : "Activate"} staff` : "Only Admin can change staff status"}
                        className={`text-xs font-medium px-3 py-1.5 rounded-lg transition ${
                          !isAdmin
                            ? "bg-gray-100 text-gray-400 cursor-not-allowed opacity-60"
                            : m.isActive
                            ? "bg-red-50 text-red-600 hover:bg-red-100"
                            : "bg-farm-50 text-farm-700 hover:bg-farm-100"
                        }`}
                      >
                        {m.isActive ? "Deactivate" : "Activate"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {!loading && staff.length > 0 && (
        <Pagination page={page} totalItems={staff.length} pageSize={PAGE_SIZE} onChange={setPage} />
      )}

      {/* Add / Edit Staff Modal */}
      {showModal && isAdmin && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center px-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800">
                {editingId ? "Edit Staff" : "Add Staff"}
              </h2>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
              >
                &times;
              </button>
            </div>

            {formError && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmitStaff} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Name</label>
                <input name="name" required value={form.name} onChange={handleFormChange}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-farm-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Mobile</label>
                  <input name="mobile" required pattern="[0-9]{10}" title="10 digit mobile number"
                    value={form.mobile} onChange={handleFormChange}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-farm-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Role</label>
                  <select name="role" value={form.role} onChange={handleFormChange}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-farm-500">
                    {ROLES.map((r) => (
                      <option key={r} value={r}>{roleLabel(r)}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
                <input type="email" name="email" required value={form.email} onChange={handleFormChange}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-farm-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    {form.role === "temporary_worker" ? "Daily Salary (₹ / Day) *" : "Monthly Salary (₹ / Mo) *"}
                  </label>
                  <input type="number" name="salary" required min="0" placeholder={form.role === "temporary_worker" ? "e.g. 500" : "e.g. 15000"} value={form.salary} onChange={handleFormChange}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-farm-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Date of Joining</label>
                  <input type="date" name="dateOfJoining" required value={form.dateOfJoining} onChange={handleFormChange}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-farm-500" />
                </div>
              </div>

              {form.role === "temporary_worker" && (
                <p className="text-[11px] text-amber-700 bg-amber-50 rounded-lg p-2 font-medium">
                  💡 Temporary Worker: Enter daily rate (e.g. ₹500/day). Salary will be calculated as: Present Days × Daily Rate.
                </p>
              )}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Login PIN (4-6 digits) {editingId ? "(Leave blank to keep existing)" : "*"}
                </label>
                <div className="relative">
                  <input
                    type={showPin ? "text" : "password"}
                    name="pin"
                    maxLength={6}
                    required={!editingId}
                    placeholder="e.g. 1234"
                    value={form.pin}
                    onChange={handleFormChange}
                    className="w-full rounded-lg border border-gray-300 pl-3 pr-10 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-farm-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPin(!showPin)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-base leading-none p-1 focus:outline-none"
                    title={showPin ? "Hide PIN" : "Show PIN"}
                  >
                    {showPin ? "👁️" : "🙈"}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Address</label>
                <textarea name="address" required rows={2} value={form.address} onChange={handleFormChange}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-farm-500" />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-farm-600 hover:bg-farm-700 disabled:opacity-60 text-white font-medium rounded-lg py-2.5 text-sm mt-2 transition"
              >
                {submitting
                  ? editingId ? "Saving..." : "Creating..."
                  : editingId ? "Save Changes" : "Create Staff"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Staff;