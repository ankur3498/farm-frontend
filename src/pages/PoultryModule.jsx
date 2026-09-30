import React, { useEffect, useState, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import api from "../api/axios.js";
import { useAuth } from "../context/AuthContext.jsx";
import Pagination from "../components/Pagination.jsx";

const PAGE_SIZE = 10;
const IST = "Asia/Kolkata";

const fmtDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: IST }) : "—";

const fmtDateInput = (d) => {
  const dateObj = typeof d === "string" ? new Date(d) : d;
  const y = dateObj.getFullYear(), m = String(dateObj.getMonth() + 1).padStart(2, "0"), day = String(dateObj.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const getSurvivalBadgeStyle = (pct) => {
  if (pct >= 98.0) return { label: "Excellent Transit (≥98%)", badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-300" };
  if (pct >= 95.0) return { label: "Moderate Transit (95-97.9%)", badgeClass: "bg-amber-100 text-amber-800 border-amber-300" };
  return { label: "High Mortality Alert (<95%)", badgeClass: "bg-red-100 text-red-800 border-red-300" };
};

const emptyInTransitForm = {
  batchNo: "",
  startDate: fmtDateInput(new Date()),
  distanceKm: "",
  transitHours: "",
  chicksLoaded: "",
  transitMortality: "0",
  sourceSupplier: "",
  vehicleDetails: "",
};

const emptyBrooderForm = {
  brooderBatchNo: "",
  brooderHouseNo: "",
  placementDate: fmtDateInput(new Date()),
  chicksPlaced: "",
  heatSource: "Infrared Lamp",
  targetTempC: "33",
  starterFeedType: "Pre-Starter Crumb",
  assignedTo: "",
};

const emptyBrooderRecordForm = {
  date: fmtDateInput(new Date()),
  tempMorningC: "",
  tempEveningC: "",
  humidityPct: "",
  mortality: "0",
  culls: "0",
  feedKg: "",
  waterLiters: "",
  sampleAvgWeightGms: "",
  checklist: [],
  remarks: "",
};

const emptyVaccineForm = {
  flockBatchId: "",
  flockName: "",
  vaccineName: "",
  diseaseTarget: "",
  targetAgeDays: "7",
  scheduledDate: fmtDateInput(new Date()),
  route: "drinking_water",
  vaccineBrand: "",
  batchLotNo: "",
  dosesCount: "",
  cost: "",
  notes: "",
};

const emptyHatcheryForm = {
  hatcheryBatchNo: "",
  incubatorNo: "",
  breedName: "",
  settingDate: fmtDateInput(new Date()),
  expectedHatchDate: fmtDateInput(new Date(Date.now() + 21 * 24 * 60 * 60 * 1000)),
  eggsSet: "",
  fertileEggs: "",
  notes: "",
};

const emptyBookingForm = {
  partyName: "",
  quantity: "",
  advanceAmount: "",
  contactMobile: "",
};

const emptyBatchForm = { name: "", breed: "", poultryType: "layer", dateOfHatch: fmtDateInput(new Date()), chicksReceived: "", targetWeightGms: "", houseNo: "", assignedTo: "" };
const emptyRecordForm = { date: fmtDateInput(new Date()), mortality: "0", culls: "0", feedKg: "", eggCount: "", bodyWeightGms: "", remarks: "" };

const BROODING_CHECKLIST_OPTIONS = [
  { id: "vitamin_water", label: "Electrolytes & Vitamin AD3E in water" },
  { id: "paper_changed", label: "Paper changed / Litter turned" },
  { id: "ring_expanded", label: "Brooder ring expanded" },
  { id: "temp_adjusted", label: "Temperature & lamp height adjusted" },
  { id: "vaccination_done", label: "Newcastle / IB Vaccination done" },
  { id: "beak_trimming", label: "Debeaking / Beak trimming" },
];

const ROUTE_LABELS = {
  drinking_water: "💧 Drinking Water",
  eye_drop: "👁️ Eye Drop / Ocular",
  wing_web: "🪶 Wing Web Stab",
  subq: "💉 Subcutaneous (SubQ)",
  im: "💉 Intramuscular (IM)",
  spray: "💨 Spray / Aerosol",
};

const PoultryModule = () => {
  const { user } = useAuth();
  const isPrivileged = ["admin", "manager_operations"].includes(user?.role);
  const location = useLocation();
  const navigate = useNavigate();

  // Tab state: "in-transit" | "brooder" | "vaccination" | "layer" | "breeder" | "broiler" | "received"
  const [activeTab, setActiveTab] = useState("in-transit");

  // Sync tab with URL query or pathname
  useEffect(() => {
    const pathSegments = location.pathname.split("/").filter(Boolean);
    const subRoute = pathSegments[1];
    if (["in-transit", "brooder", "vaccination", "layer", "breeder", "broiler", "received"].includes(subRoute)) {
      setActiveTab(subRoute);
    }
  }, [location.pathname]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    navigate(`/poultry/${tab}`, { replace: true });
  };

  // State for In-Transit & Received Chicks
  const [inTransitList, setInTransitList] = useState([]);
  const [inTransitLoading, setInTransitLoading] = useState(false);
  const [inTransitModalOpen, setInTransitModalOpen] = useState(false);
  const [inTransitForm, setInTransitForm] = useState(emptyInTransitForm);
  const [inTransitSubmitting, setInTransitSubmitting] = useState(false);
  const [inTransitError, setInTransitError] = useState("");

  // Receive modal state
  const [receiveModalItem, setReceiveModalItem] = useState(null);
  const [receiveForm, setReceiveForm] = useState({ destinationType: "brooder", assignedPen: "", receivedNotes: "", createFlockBatch: true });
  const [receiveSubmitting, setReceiveSubmitting] = useState(false);

  // Brooder Management State
  const [brooderList, setBrooderList] = useState([]);
  const [brooderLoading, setBrooderLoading] = useState(false);
  const [brooderModalOpen, setBrooderModalOpen] = useState(false);
  const [brooderForm, setBrooderForm] = useState(emptyBrooderForm);
  const [brooderSubmitting, setBrooderSubmitting] = useState(false);
  const [selectedBrooder, setSelectedBrooder] = useState(null);
  const [brooderRecords, setBrooderRecords] = useState([]);
  const [brooderRecordsLoading, setBrooderRecordsLoading] = useState(false);
  const [brooderRecordModalOpen, setBrooderRecordModalOpen] = useState(false);
  const [brooderRecordForm, setBrooderRecordForm] = useState(emptyBrooderRecordForm);
  const [brooderRecordSubmitting, setBrooderRecordSubmitting] = useState(false);
  const [transferBrooderModal, setTransferBrooderModal] = useState(null);
  const [transferBrooderForm, setTransferBrooderForm] = useState({ transferredToType: "layer", houseNo: "" });

  // Vaccination Schedule State
  const [vaccinations, setVaccinations] = useState([]);
  const [vaccineLoading, setVaccineLoading] = useState(false);
  const [vaccineModalOpen, setVaccineModalOpen] = useState(false);
  const [vaccineForm, setVaccineForm] = useState(emptyVaccineForm);
  const [vaccineSubmitting, setVaccineSubmitting] = useState(false);
  const [completeVaccineModal, setCompleteVaccineModal] = useState(null);
  const [completeVaccineForm, setCompleteVaccineForm] = useState({ actualDate: fmtDateInput(new Date()), vaccineBrand: "", batchLotNo: "", dosesCount: "", cost: "", notes: "" });
  const [vaccinePhotoFile, setVaccinePhotoFile] = useState(null);
  const [autoGenModalOpen, setAutoGenModalOpen] = useState(false);
  const [selectedAutoGenFlockId, setSelectedAutoGenFlockId] = useState("");

  // Hatchery state
  const [hatcheryLogs, setHatcheryLogs] = useState([]);
  const [hatcheryLoading, setHatcheryLoading] = useState(false);
  const [hatcheryModalOpen, setHatcheryModalOpen] = useState(false);
  const [hatcheryForm, setHatcheryForm] = useState(emptyHatcheryForm);
  const [hatcherySubmitting, setHatcherySubmitting] = useState(false);
  const [hatchResultModal, setHatchResultModal] = useState(null);
  const [hatchResultForm, setHatchResultForm] = useState({ actualHatchDate: fmtDateInput(new Date()), hatchedGradeA: "", hatchedGradeB: "", culls: "", notes: "" });
  const [bookingModal, setBookingModal] = useState(null);
  const [bookingForm, setBookingForm] = useState(emptyBookingForm);
  const [bookingSubmitting, setBookingSubmitting] = useState(false);

  // Flocks / Batches state
  const [batches, setBatches] = useState([]);
  const [batchesLoading, setBatchesLoading] = useState(false);
  const [staffList, setStaffList] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [records, setRecords] = useState([]);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [page, setPage] = useState(1);

  // Batch modal
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [batchForm, setBatchForm] = useState(emptyBatchForm);
  const [batchSubmitting, setBatchSubmitting] = useState(false);

  // Daily Record modal
  const [recordModalOpen, setRecordModalOpen] = useState(false);
  const [recordForm, setRecordForm] = useState(emptyRecordForm);
  const [photoFile, setPhotoFile] = useState(null);
  const [videoFile, setVideoFile] = useState(null);
  const [editingRecordId, setEditingRecordId] = useState(null);
  const [recordSubmitting, setRecordSubmitting] = useState(false);

  // Media proof viewing modal
  const [mediaModal, setMediaModal] = useState(null);

  // Fetch Staff
  const fetchStaff = useCallback(async () => {
    try {
      const res = await api.get("/users");
      setStaffList(res.data.users || []);
    } catch (err) {
      // non-critical
    }
  }, []);

  useEffect(() => { fetchStaff(); }, [fetchStaff]);

  // Fetch In-Transit & Received Chicks
  const fetchInTransit = useCallback(async () => {
    setInTransitLoading(true);
    try {
      const res = await api.get("/poultry/in-transit");
      setInTransitList(res.data.shipments || []);
    } catch (err) {
      // console.error(err);
    } finally {
      setInTransitLoading(false);
    }
  }, []);

  // Fetch Brooder Batches
  const fetchBrooders = useCallback(async () => {
    setBrooderLoading(true);
    try {
      const res = await api.get("/poultry/brooder");
      setBrooderList(res.data.brooders || []);
    } catch (err) {
      // console.error(err);
    } finally {
      setBrooderLoading(false);
    }
  }, []);

  // Fetch Vaccinations
  const fetchVaccinations = useCallback(async () => {
    setVaccineLoading(true);
    try {
      const res = await api.get("/poultry/vaccinations");
      setVaccinations(res.data.vaccinations || []);
    } catch (err) {
      // console.error(err);
    } finally {
      setVaccineLoading(false);
    }
  }, []);

  // Fetch Hatchery Logs
  const fetchHatchery = useCallback(async () => {
    setHatcheryLoading(true);
    try {
      const res = await api.get("/poultry/hatchery");
      setHatcheryLogs(res.data.hatcheryLogs || []);
    } catch (err) {
      // console.error(err);
    } finally {
      setHatcheryLoading(false);
    }
  }, []);

  // Fetch Flocks / Batches
  const fetchBatches = useCallback(async () => {
    setBatchesLoading(true);
    try {
      const res = await api.get("/poultry/batches");
      setBatches(res.data.batches || []);
    } catch (err) {
      // console.error(err);
    } finally {
      setBatchesLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInTransit();
    fetchBrooders();
    fetchVaccinations();
    fetchHatchery();
    fetchBatches();
  }, [fetchInTransit, fetchBrooders, fetchVaccinations, fetchHatchery, fetchBatches]);

  // Fetch Brooder Records
  const fetchBrooderRecords = useCallback(async (brooderId) => {
    if (!brooderId) return;
    setBrooderRecordsLoading(true);
    try {
      const res = await api.get(`/poultry/brooder/${brooderId}/records`);
      setBrooderRecords(res.data.records || []);
    } catch (err) {
      // console.error(err);
    } finally {
      setBrooderRecordsLoading(false);
    }
  }, []);

  // Fetch Records for a batch
  const fetchRecords = useCallback(async (batchId) => {
    if (!batchId) return;
    setRecordsLoading(true);
    try {
      const res = await api.get(`/poultry/batches/${batchId}/records`);
      setRecords(res.data.records || []);
      setPage(1);
    } catch (err) {
      // console.error(err);
    } finally {
      setRecordsLoading(false);
    }
  }, []);

  // Submit In-Transit Chick form
  const submitInTransit = async (e) => {
    e.preventDefault();
    setInTransitError("");
    setInTransitSubmitting(true);
    try {
      await api.post("/poultry/in-transit", inTransitForm);
      setInTransitModalOpen(false);
      setInTransitForm(emptyInTransitForm);
      fetchInTransit();
    } catch (err) {
      setInTransitError(err.response?.data?.message || "Failed to save in-transit record");
    } finally {
      setInTransitSubmitting(false);
    }
  };

  // Mark In-Transit as Received
  const submitReceive = async (e) => {
    e.preventDefault();
    if (!receiveModalItem) return;
    setReceiveSubmitting(true);
    try {
      await api.put(`/poultry/in-transit/${receiveModalItem._id}/receive`, receiveForm);
      setReceiveModalItem(null);
      fetchInTransit();
      fetchBrooders();
      fetchBatches();
      fetchVaccinations();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to receive chicks");
    } finally {
      setReceiveSubmitting(false);
    }
  };

  // Submit Brooder Batch Form
  const submitBrooder = async (e) => {
    e.preventDefault();
    setBrooderSubmitting(true);
    try {
      await api.post("/poultry/brooder", brooderForm);
      setBrooderModalOpen(false);
      setBrooderForm(emptyBrooderForm);
      fetchBrooders();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to set up brooder batch");
    } finally {
      setBrooderSubmitting(false);
    }
  };

  // Submit Brooder Daily Record Form
  const submitBrooderRecord = async (e) => {
    e.preventDefault();
    if (!selectedBrooder) return;
    setBrooderRecordSubmitting(true);
    try {
      await api.post(`/poultry/brooder/${selectedBrooder._id}/records`, brooderRecordForm);
      setBrooderRecordModalOpen(false);
      setBrooderRecordForm(emptyBrooderRecordForm);
      fetchBrooders();
      fetchBrooderRecords(selectedBrooder._id);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to save brooder log");
    } finally {
      setBrooderRecordSubmitting(false);
    }
  };

  // Submit Transfer Brooder to Grower House
  const submitBrooderTransfer = async (e) => {
    e.preventDefault();
    if (!transferBrooderModal) return;
    try {
      await api.put(`/poultry/brooder/${transferBrooderModal._id}`, {
        status: "transferred",
        transferredToType: transferBrooderForm.transferredToType,
        transferredDate: new Date(),
      });
      setTransferBrooderModal(null);
      fetchBrooders();
      fetchBatches();
      fetchVaccinations();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to transfer brooder batch");
    }
  };

  // Submit Add Single Vaccination Form
  const submitVaccine = async (e) => {
    e.preventDefault();
    setVaccineSubmitting(true);
    try {
      await api.post("/poultry/vaccinations", vaccineForm);
      setVaccineModalOpen(false);
      setVaccineForm(emptyVaccineForm);
      fetchVaccinations();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to schedule vaccination");
    } finally {
      setVaccineSubmitting(false);
    }
  };

  // Submit Auto-Generate Vaccination Schedule Form
  const submitAutoGenVaccines = async (e) => {
    e.preventDefault();
    if (!selectedAutoGenFlockId) return;
    try {
      await api.post("/poultry/vaccinations/auto-generate", { flockBatchId: selectedAutoGenFlockId });
      setAutoGenModalOpen(false);
      setSelectedAutoGenFlockId("");
      fetchVaccinations();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to auto-generate vaccination schedule");
    }
  };

  // Submit Complete Vaccination Form
  const submitCompleteVaccine = async (e) => {
    e.preventDefault();
    if (!completeVaccineModal) return;
    try {
      const formData = new FormData();
      formData.append("status", "completed");
      formData.append("actualDate", completeVaccineForm.actualDate);
      if (completeVaccineForm.vaccineBrand) formData.append("vaccineBrand", completeVaccineForm.vaccineBrand);
      if (completeVaccineForm.batchLotNo) formData.append("batchLotNo", completeVaccineForm.batchLotNo);
      if (completeVaccineForm.dosesCount) formData.append("dosesCount", Number(completeVaccineForm.dosesCount));
      if (completeVaccineForm.cost) formData.append("cost", Number(completeVaccineForm.cost));
      if (completeVaccineForm.notes) formData.append("notes", completeVaccineForm.notes);

      if (vaccinePhotoFile) formData.append("photo", vaccinePhotoFile);

      await api.put(`/poultry/vaccinations/${completeVaccineModal._id}`, formData);
      setCompleteVaccineModal(null);
      setVaccinePhotoFile(null);
      fetchVaccinations();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to mark vaccination completed");
    }
  };

  // Submit Hatchery Incubator form
  const submitHatchery = async (e) => {
    e.preventDefault();
    setHatcherySubmitting(true);
    try {
      await api.post("/poultry/hatchery", hatcheryForm);
      setHatcheryModalOpen(false);
      setHatcheryForm(emptyHatcheryForm);
      fetchHatchery();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to create incubator log");
    } finally {
      setHatcherySubmitting(false);
    }
  };

  // Log Hatching Results
  const submitHatchResult = async (e) => {
    e.preventDefault();
    if (!hatchResultModal) return;
    try {
      await api.put(`/poultry/hatchery/${hatchResultModal._id}`, {
        ...hatchResultForm,
        status: "hatched",
      });
      setHatchResultModal(null);
      fetchHatchery();
      fetchVaccinations();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to save hatching results");
    }
  };

  // Submit Advance Booking for Hatchery batch
  const submitHatcheryBooking = async (e) => {
    e.preventDefault();
    if (!bookingModal) return;
    setBookingSubmitting(true);
    try {
      await api.post(`/poultry/hatchery/${bookingModal._id}/bookings`, bookingForm);
      setBookingModal(null);
      setBookingForm(emptyBookingForm);
      fetchHatchery();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to save advance booking");
    } finally {
      setBookingSubmitting(false);
    }
  };

  // Submit Batch form
  const submitBatch = async (e) => {
    e.preventDefault();
    setBatchSubmitting(true);
    try {
      await api.post("/poultry/batches", batchForm);
      setBatchModalOpen(false);
      setBatchForm(emptyBatchForm);
      fetchBatches();
      fetchVaccinations();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to create batch");
    } finally {
      setBatchSubmitting(false);
    }
  };

  // Submit Daily Record form
  const submitRecord = async (e) => {
    e.preventDefault();
    setRecordSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("date", recordForm.date);
      formData.append("mortality", Number(recordForm.mortality) || 0);
      formData.append("culls", Number(recordForm.culls) || 0);
      formData.append("feedKg", Number(recordForm.feedKg) || 0);
      if (recordForm.eggCount !== "") formData.append("eggCount", Number(recordForm.eggCount));
      if (recordForm.bodyWeightGms !== "") formData.append("bodyWeightGms", Number(recordForm.bodyWeightGms));
      formData.append("remarks", recordForm.remarks || "");

      if (photoFile) formData.append("photo", photoFile);
      if (videoFile) formData.append("video", videoFile);

      if (editingRecordId) {
        await api.put(`/poultry/records/${editingRecordId}`, formData);
      } else {
        await api.post(`/poultry/batches/${selectedBatch._id}/records`, formData);
      }
      setRecordModalOpen(false);
      fetchBatches();
      if (selectedBatch) fetchRecords(selectedBatch._id);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to save record");
    } finally {
      setRecordSubmitting(false);
    }
  };

  // Calculations for live preview in In-Transit Form
  const calcLoaded = Number(inTransitForm.chicksLoaded) || 0;
  const calcMort = Number(inTransitForm.transitMortality) || 0;
  const calcLive = Math.max(0, calcLoaded - calcMort);
  const calcSurvivalPct = calcLoaded > 0 ? Math.round((calcLive / calcLoaded) * 1000) / 10 : 100;
  const calcBadge = getSurvivalBadgeStyle(calcSurvivalPct);

  // Filter batches by current type (Layer, Broiler, Breeder)
  const currentTypeBatches = batches.filter((b) => {
    if (activeTab === "layer") return b.poultryType === "layer" || !b.poultryType;
    if (activeTab === "broiler") return b.poultryType === "broiler";
    if (activeTab === "breeder") return b.poultryType === "breeder";
    return true;
  });

  // Filter in-transit list vs received chicks list
  const activeInTransit = inTransitList.filter((item) => item.status === "in_transit");
  const receivedChicksList = inTransitList.filter((item) => item.status === "received");

  // Vaccination metrics
  const pendingVaccines = vaccinations.filter((v) => v.status === "scheduled" && !v.isOverdue);
  const overdueVaccines = vaccinations.filter((v) => v.isOverdue || v.status === "missed");
  const completedVaccines = vaccinations.filter((v) => v.status === "completed");

  return (
    <div className="px-4 md:px-8 py-6 md:py-8 min-h-screen">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <span>🐔</span> Poultry Management
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Complete management module for In-Transit Chicks, Brooder Management, Vaccination Schedule, Layer Farming, Breeder & Hatchery, Broiler, and Received Chicks.
          </p>
        </div>
      </div>

      {/* Tab Pills Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-6 border-b border-gray-200 scrollbar-none">
        <button
          onClick={() => handleTabChange("in-transit")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
            activeTab === "in-transit" ? "bg-farm-600 text-white shadow-sm" : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
          }`}
        >
          <span>🚚</span> 1. In Transit Chicks
          {activeInTransit.length > 0 && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${activeTab === "in-transit" ? "bg-white/20 text-white" : "bg-amber-100 text-amber-800"}`}>
              {activeInTransit.length}
            </span>
          )}
        </button>

        <button
          onClick={() => handleTabChange("brooder")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
            activeTab === "brooder" ? "bg-farm-600 text-white shadow-sm" : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
          }`}
        >
          <span>🔥</span> 2. Brooder Management
          {brooderList.filter(b => b.status === "active").length > 0 && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${activeTab === "brooder" ? "bg-white/20 text-white" : "bg-orange-100 text-orange-800"}`}>
              {brooderList.filter(b => b.status === "active").length}
            </span>
          )}
        </button>

        <button
          onClick={() => handleTabChange("vaccination")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
            activeTab === "vaccination" ? "bg-farm-600 text-white shadow-sm" : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
          }`}
        >
          <span>💉</span> 3. Vaccination Schedule
          {overdueVaccines.length > 0 && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${activeTab === "vaccination" ? "bg-white/20 text-white" : "bg-red-100 text-red-800"}`}>
              {overdueVaccines.length} Alert
            </span>
          )}
        </button>

        <button
          onClick={() => handleTabChange("layer")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
            activeTab === "layer" ? "bg-farm-600 text-white shadow-sm" : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
          }`}
        >
          <span>🥚</span> 4. Layer Farming
        </button>

        <button
          onClick={() => handleTabChange("breeder")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
            activeTab === "breeder" ? "bg-farm-600 text-white shadow-sm" : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
          }`}
        >
          <span>🐣</span> 5. Breeder & Hatchery
        </button>

        <button
          onClick={() => handleTabChange("broiler")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
            activeTab === "broiler" ? "bg-farm-600 text-white shadow-sm" : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
          }`}
        >
          <span>🍗</span> 6. Broiler
        </button>

        <button
          onClick={() => handleTabChange("received")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
            activeTab === "received" ? "bg-farm-600 text-white shadow-sm" : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
          }`}
        >
          <span>📦</span> 7. Received Chicks
          {receivedChicksList.length > 0 && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${activeTab === "received" ? "bg-white/20 text-white" : "bg-emerald-100 text-emerald-800"}`}>
              {receivedChicksList.length}
            </span>
          )}
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: IN TRANSIT CHICKS */}
      {/* ========================================================================= */}
      {activeTab === "in-transit" && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
            <div>
              <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <span>🚚</span> In-Transit Chicks Shipments
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Log chick shipments in-transit, track mortality, distance, transit hours, and view survival rate badges.
              </p>
            </div>
            {isPrivileged && (
              <button
                onClick={() => { setInTransitForm(emptyInTransitForm); setInTransitError(""); setInTransitModalOpen(true); }}
                className="bg-farm-600 hover:bg-farm-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition shadow-xs flex items-center gap-1.5"
              >
                <span>+</span> Log In-Transit Shipment
              </button>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
              <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                Saved Flocks In-Transit ({activeInTransit.length})
              </h3>
            </div>

            {inTransitLoading ? (
              <div className="p-8 text-center text-sm text-gray-400">Loading in-transit shipments...</div>
            ) : activeInTransit.length === 0 ? (
              <div className="p-12 text-center">
                <p className="text-4xl mb-2">🚚</p>
                <p className="font-semibold text-gray-700 text-sm">No active in-transit shipments</p>
                <p className="text-xs text-gray-400 mt-1 mb-4">Click "Log In-Transit Shipment" to add a new chick transport batch.</p>
                {isPrivileged && (
                  <button
                    onClick={() => { setInTransitForm(emptyInTransitForm); setInTransitModalOpen(true); }}
                    className="bg-farm-600 text-white text-xs font-medium px-4 py-2 rounded-lg"
                  >
                    + Add New Shipment
                  </button>
                )}
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 p-5">
                {activeInTransit.map((item) => {
                  const badge = getSurvivalBadgeStyle(item.survivalRate);
                  return (
                    <div key={item._id} className="bg-gray-50/80 rounded-xl border border-gray-200 p-4 flex flex-col justify-between hover:shadow-md transition">
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div>
                            <p className="font-bold text-gray-800 text-sm">{item.batchNo}</p>
                            <p className="text-[11px] text-gray-500">Source: {item.sourceSupplier || "Hatchery Source"}</p>
                          </div>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badge.badgeClass}`}>
                            {badge.label}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs bg-white p-3 rounded-lg border border-gray-100 my-3">
                          <div>
                            <span className="text-[10px] text-gray-400 block">Loaded</span>
                            <span className="font-bold text-gray-800">{item.chicksLoaded.toLocaleString("en-IN")}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-gray-400 block">Mortality</span>
                            <span className="font-bold text-red-600">{item.transitMortality} lost</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-gray-400 block">Live Chicks</span>
                            <span className="font-bold text-emerald-700">{item.liveChicks.toLocaleString("en-IN")}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-gray-400 block">Survival %</span>
                            <span className="font-bold text-farm-700">{item.survivalRate}%</span>
                          </div>
                        </div>

                        <div className="text-[11px] text-gray-500 space-y-0.5 mb-3">
                          <p>📅 Journey Started: {fmtDate(item.startDate)}</p>
                          <p>📍 Distance: {item.distanceKm} km · ⏱️ Transit: {item.transitHours} hrs</p>
                          {item.vehicleDetails && <p>🚚 Vehicle: {item.vehicleDetails}</p>}
                        </div>
                      </div>

                      {isPrivileged && (
                        <div className="pt-2 border-t border-gray-200 flex items-center justify-between">
                          <button
                            onClick={() => {
                              setReceiveModalItem(item);
                              setReceiveForm({ destinationType: "brooder", assignedPen: "", receivedNotes: "", createFlockBatch: true });
                            }}
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold py-2 rounded-lg transition text-center shadow-xs"
                          >
                            ✓ Mark Received Chicks
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: BROODER MANAGEMENT */}
      {/* ========================================================================= */}
      {activeTab === "brooder" && !selectedBrooder && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
            <div>
              <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <span>🔥</span> Brooder House Management (Day 1 - 21)
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Monitor chick brooding temperature, humidity, water intake, pre-starter feed, 7-day brooding survival, and vaccinations.
              </p>
            </div>
            {isPrivileged && (
              <button
                onClick={() => { setBrooderForm(emptyBrooderForm); setBrooderModalOpen(true); }}
                className="bg-farm-600 hover:bg-farm-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition shadow-xs flex items-center gap-1.5"
              >
                <span>+</span> Setup Brooder House Batch
              </button>
            )}
          </div>

          <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl border border-amber-200 p-4">
            <h3 className="text-xs font-bold text-amber-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <span>🌡️</span> Brooding Temperature & Humidity Target Guide
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div className="bg-white p-2.5 rounded-xl border border-amber-100 shadow-2xs">
                <span className="font-bold text-amber-800 block">Day 1 – 3</span>
                <span className="text-gray-700 font-medium">32°C – 35°C (90-95°F)</span>
                <span className="text-[10px] text-gray-500 block mt-0.5">RH: 60-70%</span>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-amber-100 shadow-2xs">
                <span className="font-bold text-amber-800 block">Day 4 – 7</span>
                <span className="text-gray-700 font-medium">29°C – 32°C (85-90°F)</span>
                <span className="text-[10px] text-gray-500 block mt-0.5">RH: 55-65%</span>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-amber-100 shadow-2xs">
                <span className="font-bold text-amber-800 block">Day 8 – 14</span>
                <span className="text-gray-700 font-medium">26°C – 29°C (80-85°F)</span>
                <span className="text-[10px] text-gray-500 block mt-0.5">RH: 50-60%</span>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-amber-100 shadow-2xs">
                <span className="font-bold text-amber-800 block">Day 15 – 21</span>
                <span className="text-gray-700 font-medium">23°C – 26°C (75-80°F)</span>
                <span className="text-[10px] text-gray-500 block mt-0.5">RH: 50-60%</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-5">
            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-4">
              Active Brooder Batches ({brooderList.length})
            </h3>

            {brooderLoading ? (
              <div className="p-8 text-center text-xs text-gray-400">Loading brooder batches...</div>
            ) : brooderList.length === 0 ? (
              <div className="p-10 text-center">
                <p className="text-4xl mb-2">🐤</p>
                <p className="font-semibold text-gray-700 text-sm">No brooder batches active</p>
                <p className="text-xs text-gray-400 mt-1 mb-4">
                  Set up a new brooder ring batch or receive chicks directly into brooder house.
                </p>
                {isPrivileged && (
                  <button
                    onClick={() => { setBrooderForm(emptyBrooderForm); setBrooderModalOpen(true); }}
                    className="bg-farm-600 text-white text-xs font-medium px-4 py-2 rounded-lg"
                  >
                    + Setup Brooder Batch
                  </button>
                )}
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {brooderList.map((b) => (
                  <div
                    key={b._id}
                    className="bg-gray-50/80 rounded-xl border border-gray-200 p-5 flex flex-col justify-between hover:shadow-md transition cursor-pointer"
                    onClick={() => { setSelectedBrooder(b); fetchBrooderRecords(b._id); }}
                  >
                    <div>
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-bold text-gray-800 text-base">{b.brooderBatchNo}</p>
                          <p className="text-xs text-gray-500">🏠 {b.brooderHouseNo}</p>
                        </div>
                        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${b.status === "transferred" ? "bg-purple-100 text-purple-800" : "bg-orange-100 text-orange-800"}`}>
                          {b.status === "transferred" ? "Transferred" : `Day ${b.ageDay} Brooding`}
                        </span>
                      </div>

                      <div className="flex items-baseline gap-2 mb-2 mt-3">
                        <span className="text-2xl font-bold text-gray-800">{b.currentStock.toLocaleString("en-IN")}</span>
                        <span className="text-xs text-gray-400">chicks · of {b.chicksPlaced.toLocaleString("en-IN")} placed</span>
                      </div>

                      <div className="flex items-center gap-1.5 mb-3">
                        <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${b.broodingSurvivalPct >= 98 ? "bg-emerald-500" : b.broodingSurvivalPct >= 95 ? "bg-amber-500" : "bg-red-500"}`}
                            style={{ width: `${Math.min(100, b.broodingSurvivalPct)}%` }}
                          />
                        </div>
                        <span className="text-xs font-semibold text-gray-600">{b.broodingSurvivalPct}% survival</span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-center border-t border-gray-200 pt-3 text-xs">
                        <div>
                          <p className="font-bold text-red-600">{b.totalMortality + b.totalCulls}</p>
                          <p className="text-[9px] text-gray-400 uppercase">Lost</p>
                        </div>
                        <div>
                          <p className="font-bold text-gray-700">{b.totalFeedKg} kg</p>
                          <p className="text-[9px] text-gray-400 uppercase">Pre-Starter</p>
                        </div>
                        <div>
                          <p className="font-bold text-blue-700">{b.totalWaterLiters} L</p>
                          <p className="text-[9px] text-gray-400 uppercase">Water Intake</p>
                        </div>
                      </div>

                      <div className="text-[11px] text-gray-500 mt-3 pt-2 border-t border-gray-100 space-y-0.5">
                        <p>🔥 Heat Source: <span className="font-semibold text-gray-700">{b.heatSource}</span></p>
                        <p>📅 Placed: {fmtDate(b.placementDate)}</p>
                        {b.latestRecord && (
                          <p>🌡️ Latest Temp: {b.latestRecord.tempMorningC || b.latestRecord.tempEveningC || "—"}°C</p>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 pt-2 border-t border-gray-200 flex items-center justify-between text-xs">
                      {isPrivileged && b.status === "active" && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setTransferBrooderModal(b);
                            setTransferBrooderForm({ transferredToType: "layer", houseNo: "" });
                          }}
                          className="text-[11px] bg-purple-50 text-purple-700 border border-purple-200 px-2 py-1 rounded font-semibold hover:bg-purple-100"
                        >
                          → Transfer to Grower
                        </button>
                      )}
                      <span className="text-farm-600 font-semibold ml-auto">View Brooder Logs →</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Selected Brooder Batch Detail View */}
      {selectedBrooder && (
        <div className="space-y-6">
          <button
            onClick={() => setSelectedBrooder(null)}
            className="text-xs font-semibold text-gray-600 hover:text-gray-900 bg-white border border-gray-200 px-3 py-1.5 rounded-lg flex items-center gap-1 shadow-xs"
          >
            ← Back to Brooder Batches
          </button>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
            <div className="p-6 bg-gradient-to-r from-orange-600 to-amber-700 text-white flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold">🔥 {selectedBrooder.brooderBatchNo}</h2>
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-white/20">
                    Day {selectedBrooder.ageDay} Brooding
                  </span>
                </div>
                <p className="text-amber-100 text-xs mt-1">
                  House: {selectedBrooder.brooderHouseNo} · Placed: {fmtDate(selectedBrooder.placementDate)} · Heat Source: {selectedBrooder.heatSource}
                </p>
              </div>

              <div className="text-right">
                <p className="text-amber-100 text-xs">Current Live Chicks</p>
                <p className="text-3xl font-black">{selectedBrooder.currentStock.toLocaleString("en-IN")}</p>
                <p className="text-amber-100 text-xs">of {selectedBrooder.chicksPlaced.toLocaleString("en-IN")} initial chicks</p>
              </div>
            </div>

            <div className="p-5 grid grid-cols-2 md:grid-cols-4 gap-4 bg-amber-50/40 text-center border-b border-gray-200">
              <div>
                <span className="text-xs text-gray-400 block">Brooding Survival %</span>
                <span className="text-lg font-bold text-emerald-700">{selectedBrooder.broodingSurvivalPct}%</span>
              </div>
              <div>
                <span className="text-xs text-gray-400 block">Brooding Lost</span>
                <span className="text-lg font-bold text-red-600">{selectedBrooder.totalMortality + selectedBrooder.totalCulls}</span>
              </div>
              <div>
                <span className="text-xs text-gray-400 block">Total Starter Feed</span>
                <span className="text-lg font-bold text-gray-800">{selectedBrooder.totalFeedKg} kg</span>
              </div>
              <div>
                <span className="text-xs text-gray-400 block">Total Water Intake</span>
                <span className="text-lg font-bold text-blue-700">{selectedBrooder.totalWaterLiters} L</span>
              </div>
            </div>

            <div className="p-4 flex items-center justify-between border-b border-gray-100">
              <h3 className="text-sm font-bold text-gray-800">Daily Brooder Temperature & Health Logs</h3>
              <button
                onClick={() => {
                  setBrooderRecordForm({ ...emptyBrooderRecordForm, date: fmtDateInput(new Date()) });
                  setBrooderRecordModalOpen(true);
                }}
                className="bg-farm-600 hover:bg-farm-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition"
              >
                + Log Today's Brooder Check
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-gray-100 text-gray-600 uppercase font-semibold">
                  <tr>
                    <th className="p-3">Date</th>
                    <th className="p-3">Age</th>
                    <th className="p-3">Morning Temp</th>
                    <th className="p-3">Evening Temp</th>
                    <th className="p-3">Humidity %</th>
                    <th className="p-3">Mortality</th>
                    <th className="p-3">Starter Feed</th>
                    <th className="p-3">Water (L)</th>
                    <th className="p-3">Sample Wt (g)</th>
                    <th className="p-3">Checklist Completed</th>
                    <th className="p-3">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {brooderRecordsLoading ? (
                    <tr><td colSpan={11} className="p-6 text-center text-gray-400">Loading daily brooder logs...</td></tr>
                  ) : brooderRecords.length === 0 ? (
                    <tr><td colSpan={11} className="p-8 text-center text-gray-400">No daily brooding logs recorded yet.</td></tr>
                  ) : (
                    brooderRecords.map((r) => (
                      <tr key={r._id} className="hover:bg-gray-50/80">
                        <td className="p-3 font-semibold text-gray-800">{fmtDate(r.date)}</td>
                        <td className="p-3 text-gray-500 font-bold">Day {r.ageDay}</td>
                        <td className="p-3 text-amber-800 font-semibold">{r.tempMorningC != null ? `${r.tempMorningC}°C` : "—"}</td>
                        <td className="p-3 text-amber-800 font-semibold">{r.tempEveningC != null ? `${r.tempEveningC}°C` : "—"}</td>
                        <td className="p-3 text-blue-700">{r.humidityPct != null ? `${r.humidityPct}%` : "—"}</td>
                        <td className="p-3 font-bold text-red-600">{r.mortality || 0}</td>
                        <td className="p-3 text-gray-700">{r.feedKg} kg</td>
                        <td className="p-3 text-blue-600">{r.waterLiters} L</td>
                        <td className="p-3 font-bold text-gray-800">{r.sampleAvgWeightGms != null ? `${r.sampleAvgWeightGms} g` : "—"}</td>
                        <td className="p-3">
                          {r.checklist && r.checklist.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {r.checklist.map((item, i) => (
                                <span key={i} className="text-[9px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded font-medium">
                                  ✓ {item.replace("_", " ")}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                        <td className="p-3 text-gray-500 max-w-[150px] truncate">{r.remarks || "—"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: VACCINATION SCHEDULE */}
      {/* ========================================================================= */}
      {activeTab === "vaccination" && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
            <div>
              <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <span>💉</span> Flock Vaccination Schedule & Logs
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Track disease protection schedules (Ranikhet ND, Gumboro IBD, Marek's, Fowl Pox, Coryza, EDS), dose counts, and lot numbers.
              </p>
            </div>
            {isPrivileged && (
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => setAutoGenModalOpen(true)}
                  className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold px-3 py-2.5 rounded-xl transition flex items-center gap-1 shadow-xs"
                >
                  <span>⚡</span> Auto-Generate Flock Schedule
                </button>
                <button
                  onClick={() => { setVaccineForm(emptyVaccineForm); setVaccineModalOpen(true); }}
                  className="bg-farm-600 hover:bg-farm-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition shadow-xs flex items-center gap-1"
                >
                  <span>+</span> Schedule Vaccine
                </button>
              </div>
            )}
          </div>

          {/* Vaccination Summary Metrics */}
          <div className="grid grid-cols-3 gap-4 bg-white p-5 rounded-2xl border border-gray-200 shadow-xs text-center">
            <div className="bg-blue-50/70 p-3 rounded-xl border border-blue-100">
              <span className="text-xs text-blue-700 font-semibold block">Scheduled / Upcoming</span>
              <span className="text-2xl font-black text-blue-900">{pendingVaccines.length}</span>
            </div>
            <div className="bg-red-50/70 p-3 rounded-xl border border-red-100">
              <span className="text-xs text-red-700 font-semibold block">Overdue / Missed Alert</span>
              <span className="text-2xl font-black text-red-900">{overdueVaccines.length}</span>
            </div>
            <div className="bg-emerald-50/70 p-3 rounded-xl border border-emerald-100">
              <span className="text-xs text-emerald-700 font-semibold block">Completed Administered</span>
              <span className="text-2xl font-black text-emerald-900">{completedVaccines.length}</span>
            </div>
          </div>

          {/* Vaccination Records Table */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
              <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                Vaccination Schedule Log ({vaccinations.length})
              </h3>
            </div>

            {vaccineLoading ? (
              <div className="p-8 text-center text-xs text-gray-400">Loading vaccination schedules...</div>
            ) : vaccinations.length === 0 ? (
              <div className="p-12 text-center">
                <p className="text-4xl mb-2">💉</p>
                <p className="font-semibold text-gray-700 text-sm">No vaccination schedules logged</p>
                <p className="text-xs text-gray-400 mt-1 mb-4">
                  Click "⚡ Auto-Generate Flock Schedule" or "+ Schedule Vaccine" to start disease protection logs.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-gray-100 text-gray-600 uppercase font-semibold">
                    <tr>
                      <th className="p-3">Flock Name</th>
                      <th className="p-3">Vaccine Name</th>
                      <th className="p-3">Target Age</th>
                      <th className="p-3">Scheduled Date</th>
                      <th className="p-3">Route</th>
                      <th className="p-3">Brand / Lot No</th>
                      <th className="p-3">Doses / Cost</th>
                      <th className="p-3">Status</th>
                      {isPrivileged && <th className="p-3 text-right">Action</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {vaccinations.map((v) => (
                      <tr key={v._id} className="hover:bg-gray-50/80">
                        <td className="p-3 font-bold text-gray-800">{v.flockName}</td>
                        <td className="p-3">
                          <p className="font-bold text-gray-800">{v.vaccineName}</p>
                          {v.diseaseTarget && <p className="text-[10px] text-gray-400">{v.diseaseTarget}</p>}
                        </td>
                        <td className="p-3 font-semibold text-gray-700">Day {v.targetAgeDays}</td>
                        <td className="p-3 text-gray-700 font-medium">{fmtDate(v.scheduledDate)}</td>
                        <td className="p-3 font-medium text-gray-600">{ROUTE_LABELS[v.route] || v.route}</td>
                        <td className="p-3 text-gray-600">
                          {v.vaccineBrand || v.batchLotNo ? (
                            <span>{v.vaccineBrand} {v.batchLotNo ? `(Lot: ${v.batchLotNo})` : ""}</span>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                        <td className="p-3 text-gray-600">
                          {v.dosesCount ? `${v.dosesCount.toLocaleString()} doses` : "—"} {v.cost ? `· ₹${v.cost}` : ""}
                        </td>
                        <td className="p-3">
                          {v.status === "completed" ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                              ✓ Completed ({fmtDate(v.actualDate)})
                            </span>
                          ) : v.isOverdue || v.status === "missed" ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-800 border border-red-300">
                              ⚠️ Overdue / Missed
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-300">
                              🕒 Scheduled
                            </span>
                          )}
                        </td>
                        {isPrivileged && (
                          <td className="p-3 text-right">
                            {v.status !== "completed" && (
                              <button
                                onClick={() => {
                                  setCompleteVaccineModal(v);
                                  setCompleteVaccineForm({
                                    actualDate: fmtDateInput(new Date()),
                                    vaccineBrand: v.vaccineBrand || "",
                                    batchLotNo: v.batchLotNo || "",
                                    dosesCount: v.dosesCount ? String(v.dosesCount) : "",
                                    cost: v.cost ? String(v.cost) : "",
                                    notes: v.notes || "",
                                  });
                                  setVaccinePhotoFile(null);
                                }}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold px-2.5 py-1 rounded-lg transition"
                              >
                                ✓ Mark Administered
                              </button>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4, 5, 6: FLOCK MANAGEMENT (Layer / Breeder / Broiler) */}
      {/* ========================================================================= */}
      {["layer", "breeder", "broiler"].includes(activeTab) && !selectedBatch && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
            <div>
              <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <span>{activeTab === "layer" ? "🥚 Layer Farming" : activeTab === "breeder" ? "🐣 Breeder & Hatchery" : "🍗 Broiler Farming"}</span>
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                {activeTab === "layer"
                  ? "Track daily egg production, layer flock age, egg grade breakdown, feed consumption, and mortality."
                  : activeTab === "breeder"
                  ? "Manage parent breeder flocks and log egg setting, fertile counts, and hatchability rates."
                  : "Track meat bird batch growth, body weight targets, FCR (Feed Conversion Ratio), and harvest readiness."}
              </p>
            </div>
            {isPrivileged && (
              <button
                onClick={() => {
                  setBatchForm({ ...emptyBatchForm, poultryType: activeTab });
                  setBatchModalOpen(true);
                }}
                className="bg-farm-600 hover:bg-farm-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition shadow-xs"
              >
                + New {activeTab.toUpperCase()} Flock
              </button>
            )}
          </div>

          {activeTab === "breeder" && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 bg-amber-50/50 flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                    <span>🥚</span> Incubator & Setter Logs ({hatcheryLogs.length})
                  </h3>
                  <p className="text-[11px] text-amber-700">Track egg setting, fertility %, and hatchability.</p>
                </div>
                {isPrivileged && (
                  <button
                    onClick={() => { setHatcheryForm(emptyHatcheryForm); setHatcheryModalOpen(true); }}
                    className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition"
                  >
                    + Log Egg Setting
                  </button>
                )}
              </div>

              {hatcheryLoading ? (
                <div className="p-6 text-center text-xs text-gray-400">Loading incubator logs...</div>
              ) : hatcheryLogs.length === 0 ? (
                <div className="p-8 text-center text-xs text-gray-400">
                  No active incubator runs logged yet. Click "+ Log Egg Setting" to begin tracking.
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {hatcheryLogs.map((h) => {
                    const totalBookedChicks = (h.advanceBookings || []).reduce((sum, b) => sum + (b.quantity || 0), 0);
                    const totalAdvancePaid = (h.advanceBookings || []).reduce((sum, b) => sum + (b.advanceAmount || 0), 0);

                    return (
                      <div key={h._id} className="p-4 space-y-3 hover:bg-gray-50/50">
                        <div className="flex flex-wrap items-center justify-between gap-4">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-gray-800 text-sm">{h.hatcheryBatchNo}</span>
                              {h.breedName && (
                                <span className="text-[10px] bg-purple-100 text-purple-800 border border-purple-200 px-2 py-0.5 rounded-full font-bold">
                                  🐣 Breed: {h.breedName}
                                </span>
                              )}
                              <span className="text-[10px] bg-gray-100 text-gray-700 px-2 py-0.5 rounded font-medium">
                                Incubator #{h.incubatorNo}
                              </span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${h.status === "hatched" ? "bg-emerald-100 text-emerald-800" : "bg-blue-100 text-blue-800"}`}>
                                {h.status === "hatched" ? "Hatched" : "Incubating"}
                              </span>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              Eggs Set: <span className="font-semibold text-gray-700">{h.eggsSet.toLocaleString("en-IN")}</span> · Set Date: {fmtDate(h.settingDate)} · Expected Hatch: {fmtDate(h.expectedHatchDate)}
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            {isPrivileged && (
                              <button
                                onClick={() => { setBookingModal(h); setBookingForm(emptyBookingForm); }}
                                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition"
                              >
                                + Advance Booking
                              </button>
                            )}

                            {h.status === "hatched" ? (
                              <div className="text-right text-xs">
                                <p className="font-bold text-emerald-700">Hatchability: {h.hatchabilityPercent}%</p>
                                <p className="text-[11px] text-gray-500">
                                  Grade A: {h.hatchedGradeA} · Grade B: {h.hatchedGradeB} · Culls: {h.culls}
                                </p>
                              </div>
                            ) : (
                              isPrivileged && (
                                <button
                                  onClick={() => {
                                    setHatchResultModal(h);
                                    setHatchResultForm({ actualHatchDate: fmtDateInput(new Date()), hatchedGradeA: "", hatchedGradeB: "", culls: "", notes: "" });
                                  }}
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition"
                                >
                                  ✓ Record Hatch Results
                                </button>
                              )
                            )}
                          </div>
                        </div>

                        {/* Advance Bookings Section */}
                        {h.advanceBookings && h.advanceBookings.length > 0 && (
                          <div className="bg-amber-50/60 rounded-xl p-3 border border-amber-200/70 text-xs">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-bold text-amber-900 flex items-center gap-1 text-[11px] uppercase tracking-wider">
                                📋 Advance Bookings ({h.advanceBookings.length}) — {totalBookedChicks.toLocaleString("en-IN")} Chicks Booked (Advance ₹{totalAdvancePaid.toLocaleString("en-IN")})
                              </span>
                            </div>
                            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                              {h.advanceBookings.map((bk, idx) => (
                                <div key={bk._id || idx} className="bg-white rounded-lg p-2.5 border border-amber-200 flex items-center justify-between gap-2 shadow-2xs">
                                  <div>
                                    <p className="font-bold text-gray-800">{bk.partyName}</p>
                                    <p className="text-[10px] text-gray-500">
                                      📞 {bk.contactMobile || "N/A"} · Qty: <span className="font-semibold text-gray-800">{bk.quantity}</span>
                                    </p>
                                    {bk.advanceAmount > 0 && (
                                      <p className="text-[10px] text-emerald-700 font-semibold">Advance: ₹{bk.advanceAmount.toLocaleString("en-IN")}</p>
                                    )}
                                  </div>
                                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0 ${bk.status === "delivered" ? "bg-emerald-100 text-emerald-800 border border-emerald-300" : bk.status === "cancelled" ? "bg-red-100 text-red-800 border border-red-300" : "bg-amber-100 text-amber-800 border border-amber-300"}`}>
                                    {bk.status === "delivered" ? "🟢 Delivered" : bk.status === "cancelled" ? "🔴 Cancelled" : "🟡 Booked"}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-5">
            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-4">
              Active {activeTab.toUpperCase()} Flocks ({currentTypeBatches.length})
            </h3>

            {batchesLoading ? (
              <div className="p-8 text-center text-xs text-gray-400">Loading flocks...</div>
            ) : currentTypeBatches.length === 0 ? (
              <div className="p-10 text-center">
                <p className="text-4xl mb-2">🐥</p>
                <p className="font-semibold text-gray-700 text-sm">No {activeTab} flocks active</p>
                <p className="text-xs text-gray-400 mt-1 mb-4">
                  Create a new {activeTab} flock or transfer received/brooded chicks into this module.
                </p>
                {isPrivileged && (
                  <button
                    onClick={() => {
                      setBatchForm({ ...emptyBatchForm, poultryType: activeTab });
                      setBatchModalOpen(true);
                    }}
                    className="bg-farm-600 text-white text-xs font-medium px-4 py-2 rounded-lg"
                  >
                    + Create {activeTab} flock
                  </button>
                )}
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {currentTypeBatches.map((b) => {
                  const survivalPct = b.chicksReceived > 0 ? Math.round((b.currentStock / b.chicksReceived) * 1000) / 10 : 0;
                  const estAvgWeightKg = b.targetWeightGms ? b.targetWeightGms / 1000 : 1.8;
                  const totalLiveWeightKg = b.currentStock * estAvgWeightKg;
                  const fcr = totalLiveWeightKg > 0 ? Math.round((b.totalFeedKg / totalLiveWeightKg) * 100) / 100 : 0;

                  return (
                    <div
                      key={b._id}
                      onClick={() => { setSelectedBatch(b); fetchRecords(b._id); }}
                      className="bg-gray-50/80 rounded-xl border border-gray-200 p-5 cursor-pointer hover:shadow-md transition flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-bold text-gray-800 text-base">{b.name}</p>
                            <p className="text-xs text-gray-400">{b.breed || "Standard Breed"}</p>
                            {b.houseNo && <p className="text-[11px] text-gray-500">🏠 House/Pen: {b.houseNo}</p>}
                          </div>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-farm-100 text-farm-800 uppercase">
                            {b.poultryType || "layer"}
                          </span>
                        </div>

                        <div className="flex items-baseline gap-2 mb-2 mt-4">
                          <span className="text-2xl font-bold text-gray-800">{b.currentStock.toLocaleString("en-IN")}</span>
                          <span className="text-xs text-gray-400">birds · Day {b.ageDay} (Wk {Math.floor(b.ageDay / 7)})</span>
                        </div>

                        <div className="flex items-center gap-1.5 mb-4">
                          <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${survivalPct >= 95 ? "bg-emerald-500" : survivalPct >= 90 ? "bg-amber-500" : "bg-red-500"}`}
                              style={{ width: `${Math.min(100, survivalPct)}%` }}
                            />
                          </div>
                          <span className="text-xs font-semibold text-gray-600">{survivalPct}% alive</span>
                        </div>

                        <div className="grid grid-cols-3 gap-2 text-center border-t border-gray-200 pt-3 text-xs">
                          <div>
                            <p className="font-bold text-red-600">{b.totalMortality + b.totalCulls}</p>
                            <p className="text-[9px] text-gray-400 uppercase">Lost</p>
                          </div>
                          <div>
                            <p className="font-bold text-gray-700">{b.totalFeedKg} kg</p>
                            <p className="text-[9px] text-gray-400 uppercase">Feed</p>
                          </div>
                          <div>
                            {activeTab === "broiler" ? (
                              <>
                                <p className="font-bold text-blue-700">{fcr || "—"}</p>
                                <p className="text-[9px] text-gray-400 uppercase">Est FCR</p>
                              </>
                            ) : (
                              <>
                                <p className="font-bold text-farm-700">{b.avgProductionPercent != null ? `${b.avgProductionPercent}%` : "—"}</p>
                                <p className="text-[9px] text-gray-400 uppercase">Lay Rate</p>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="border-t border-gray-200 mt-4 pt-2.5 flex items-center justify-between text-xs text-gray-400">
                        <span>{b.lastRecordDate ? `Last log: ${fmtDate(b.lastRecordDate)}` : "No entries yet"}</span>
                        <span className="text-farm-600 font-semibold">View Logs →</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Selected Batch Detail View */}
      {selectedBatch && (
        <div className="space-y-6">
          <button
            onClick={() => setSelectedBatch(null)}
            className="text-xs font-semibold text-gray-600 hover:text-gray-900 bg-white border border-gray-200 px-3 py-1.5 rounded-lg flex items-center gap-1 shadow-xs"
          >
            ← Back to Flocks Overview
          </button>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
            <div className="p-6 bg-gradient-to-r from-farm-700 to-farm-900 text-white flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold">{selectedBatch.name}</h2>
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-white/20 uppercase">
                    {selectedBatch.poultryType || "layer"}
                  </span>
                </div>
                <p className="text-farm-100 text-xs mt-1">
                  Breed: {selectedBatch.breed || "Standard"} · Hatched: {fmtDate(selectedBatch.dateOfHatch)} · Age: Day {selectedBatch.ageDay} (Wk {Math.floor(selectedBatch.ageDay / 7)})
                </p>
              </div>

              <div className="text-right">
                <p className="text-farm-100 text-xs">Current Live Stock</p>
                <p className="text-3xl font-black">{selectedBatch.currentStock.toLocaleString("en-IN")}</p>
                <p className="text-farm-100 text-xs">of {selectedBatch.chicksReceived.toLocaleString("en-IN")} initial chicks</p>
              </div>
            </div>

            <div className="p-5 grid grid-cols-2 md:grid-cols-4 gap-4 bg-gray-50/50 text-center border-b border-gray-200">
              <div>
                <span className="text-xs text-gray-400 block">Total Lost (Mort + Cull)</span>
                <span className="text-lg font-bold text-red-600">{selectedBatch.totalMortality + selectedBatch.totalCulls}</span>
              </div>
              <div>
                <span className="text-xs text-gray-400 block">Total Feed Used</span>
                <span className="text-lg font-bold text-gray-800">{selectedBatch.totalFeedKg} kg</span>
              </div>
              <div>
                <span className="text-xs text-gray-400 block">Total Eggs Collected</span>
                <span className="text-lg font-bold text-gray-800">{selectedBatch.totalEggs.toLocaleString("en-IN")}</span>
              </div>
              <div>
                <span className="text-xs text-gray-400 block">Avg Lay Rate</span>
                <span className="text-lg font-bold text-farm-700">{selectedBatch.avgProductionPercent != null ? `${selectedBatch.avgProductionPercent}%` : "—"}</span>
              </div>
            </div>

            <div className="p-4 flex items-center justify-between border-b border-gray-100">
              <h3 className="text-sm font-bold text-gray-800">Daily Flock Logs</h3>
              <button
                onClick={() => {
                  setEditingRecordId(null);
                  setRecordForm({ ...emptyRecordForm, date: fmtDateInput(new Date()) });
                  setPhotoFile(null);
                  setVideoFile(null);
                  setRecordModalOpen(true);
                }}
                className="bg-farm-600 hover:bg-farm-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition"
              >
                + Add Today's Entry
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-gray-100 text-gray-600 uppercase font-semibold">
                  <tr>
                    <th className="p-3">Date</th>
                    <th className="p-3">Age</th>
                    <th className="p-3">Open</th>
                    <th className="p-3">Mortality</th>
                    <th className="p-3">Culls</th>
                    <th className="p-3">Closing</th>
                    <th className="p-3">Feed (kg)</th>
                    <th className="p-3">Eggs</th>
                    <th className="p-3">Lay %</th>
                    <th className="p-3">Proof</th>
                    <th className="p-3">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {recordsLoading ? (
                    <tr><td colSpan={11} className="p-6 text-center text-gray-400">Loading daily records...</td></tr>
                  ) : records.length === 0 ? (
                    <tr><td colSpan={11} className="p-8 text-center text-gray-400">No daily entries logged yet.</td></tr>
                  ) : (
                    records.map((r) => (
                      <tr key={r._id} className="hover:bg-gray-50/80">
                        <td className="p-3 font-semibold text-gray-800">{fmtDate(r.date)}</td>
                        <td className="p-3 text-gray-500">Day {r.ageDay}</td>
                        <td className="p-3 text-gray-600">{r.openStock}</td>
                        <td className="p-3 font-bold text-red-600">{r.mortality || 0}</td>
                        <td className="p-3 text-gray-600">{r.culls || 0}</td>
                        <td className="p-3 font-bold text-gray-900">{r.closingStock}</td>
                        <td className="p-3 text-gray-700">{r.feedKg}</td>
                        <td className="p-3 text-gray-700">{r.eggCount ?? "—"}</td>
                        <td className="p-3 font-bold text-farm-700">{r.eggProductionPercent != null ? `${r.eggProductionPercent}%` : "—"}</td>
                        <td className="p-3">
                          {r.proof && (r.proof.photoUrl || r.proof.videoUrl) ? (
                            <button
                              type="button"
                              onClick={() => setMediaModal({ photoUrl: r.proof.photoUrl, videoUrl: r.proof.videoUrl, title: `Log Proof — ${fmtDate(r.date)}` })}
                              className="text-[10px] bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded font-semibold"
                            >
                              View Proof 📷
                            </button>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                        <td className="p-3 text-gray-500 max-w-[150px] truncate">{r.remarks || "—"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 7: RECEIVED CHICKS BULLET / CARD LOG */}
      {/* ========================================================================= */}
      {activeTab === "received" && (
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <span>📦</span> Received Chicks Reference Log ({receivedChicksList.length})
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Bullet log of all received chick shipments transferred from In Transit or direct entry, saved for future reference.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden p-5">
            {receivedChicksList.length === 0 ? (
              <div className="p-12 text-center text-gray-400">
                <p className="text-4xl mb-2">📦</p>
                <p className="font-semibold text-gray-700 text-sm">No received chick records yet</p>
                <p className="text-xs text-gray-400 mt-1">
                  Once an In-Transit chick shipment is marked as received, it will automatically appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {receivedChicksList.map((item) => {
                  const badge = getSurvivalBadgeStyle(item.survivalRate);
                  return (
                    <div key={item._id} className="bg-gray-50/80 rounded-xl border border-gray-200 p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center text-xl shrink-0 font-bold">
                          🐤
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-gray-800 text-sm">Batch: {item.batchNo}</span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badge.badgeClass}`}>
                              {badge.label}
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 uppercase">
                              Allocated: {item.destinationType}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            Received Date: <span className="font-semibold text-gray-700">{fmtDate(item.dateReceived)}</span> · Source: {item.sourceSupplier || "Hatchery"} · House/Pen: <span className="font-semibold text-gray-700">{item.assignedPen || "Main Pen"}</span>
                          </p>
                          {item.receivedNotes && (
                            <p className="text-[11px] text-gray-600 bg-white p-2 rounded-lg border border-gray-200 mt-2">
                              📝 Note: {item.receivedNotes}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-4 border-t md:border-t-0 border-gray-200 pt-3 md:pt-0 shrink-0 justify-between md:justify-end">
                        <div className="text-right text-xs">
                          <span className="text-[10px] text-gray-400 block">Live Received</span>
                          <span className="font-extrabold text-emerald-700 text-base">{item.liveChicks.toLocaleString("en-IN")}</span>
                          <span className="text-[10px] text-gray-400 block">of {item.chicksLoaded} loaded</span>
                        </div>

                        {isPrivileged && (
                          <button
                            onClick={() => {
                              if (item.destinationType === "brooder") {
                                setActiveTab("brooder");
                                setBrooderForm({
                                  brooderBatchNo: `BR-${item.batchNo}`,
                                  brooderHouseNo: item.assignedPen || "Brooder Shed 1",
                                  placementDate: fmtDateInput(item.startDate),
                                  chicksPlaced: String(item.liveChicks),
                                  heatSource: "Infrared Lamp",
                                  targetTempC: "33",
                                  starterFeedType: "Pre-Starter Crumb",
                                  assignedTo: "",
                                });
                                setBrooderModalOpen(true);
                              } else {
                                setActiveTab(item.destinationType === "unassigned" ? "layer" : item.destinationType);
                                setBatchForm({
                                  name: `Flock ${item.batchNo}`,
                                  breed: item.sourceSupplier || "Day-Old Chicks",
                                  poultryType: item.destinationType === "unassigned" ? "layer" : item.destinationType,
                                  dateOfHatch: fmtDateInput(item.startDate),
                                  chicksReceived: String(item.liveChicks),
                                  targetWeightGms: "",
                                  houseNo: item.assignedPen || "",
                                  assignedTo: "",
                                });
                                setBatchModalOpen(true);
                              }
                            }}
                            className="bg-farm-600 hover:bg-farm-700 text-white text-xs font-semibold px-3 py-2 rounded-lg transition"
                          >
                            + Start {item.destinationType === "brooder" ? "Brooder Batch" : "Flock Batch"}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODALS */}
      {/* ========================================================================= */}

      {/* Modal: Schedule Single Vaccination */}
      {vaccineModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base font-bold text-gray-800">💉 Schedule Flock Vaccination</h3>
              <button onClick={() => setVaccineModalOpen(false)} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
            </div>

            <form onSubmit={submitVaccine} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Select Flock Batch *</label>
                <select
                  value={vaccineForm.flockBatchId}
                  onChange={(e) => {
                    const selected = batches.find((b) => b._id === e.target.value);
                    setVaccineForm({
                      ...vaccineForm,
                      flockBatchId: e.target.value,
                      flockName: selected ? selected.name : "",
                    });
                  }}
                  className="w-full text-xs border border-gray-300 rounded-lg p-2.5 outline-none"
                >
                  <option value="">-- Select Flock Batch or Enter Name Below --</option>
                  {batches.map((b) => (
                    <option key={b._id} value={b._id}>{b.name} ({b.poultryType.toUpperCase()})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Flock Name *</label>
                <input
                  required
                  placeholder="e.g. Batch A - Layer"
                  value={vaccineForm.flockName}
                  onChange={(e) => setVaccineForm({ ...vaccineForm, flockName: e.target.value })}
                  className="w-full text-xs border border-gray-300 rounded-lg p-2.5 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Vaccine Name *</label>
                  <input
                    required
                    placeholder="e.g. Ranikhet ND B1"
                    value={vaccineForm.vaccineName}
                    onChange={(e) => setVaccineForm({ ...vaccineForm, vaccineName: e.target.value })}
                    className="w-full text-xs border border-gray-300 rounded-lg p-2.5 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Disease Target</label>
                  <input
                    placeholder="e.g. Newcastle Disease"
                    value={vaccineForm.diseaseTarget}
                    onChange={(e) => setVaccineForm({ ...vaccineForm, diseaseTarget: e.target.value })}
                    className="w-full text-xs border border-gray-300 rounded-lg p-2.5 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Target Age (Days) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="7"
                    value={vaccineForm.targetAgeDays}
                    onChange={(e) => setVaccineForm({ ...vaccineForm, targetAgeDays: e.target.value })}
                    className="w-full text-xs border border-gray-300 rounded-lg p-2.5 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Scheduled Date *</label>
                  <input
                    type="date"
                    required
                    value={vaccineForm.scheduledDate}
                    onChange={(e) => setVaccineForm({ ...vaccineForm, scheduledDate: e.target.value })}
                    className="w-full text-xs border border-gray-300 rounded-lg p-2.5 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Route of Administration</label>
                <select
                  value={vaccineForm.route}
                  onChange={(e) => setVaccineForm({ ...vaccineForm, route: e.target.value })}
                  className="w-full text-xs border border-gray-300 rounded-lg p-2.5 outline-none"
                >
                  <option value="drinking_water">💧 Drinking Water</option>
                  <option value="eye_drop">👁️ Eye Drop / Ocular</option>
                  <option value="wing_web">🪶 Wing Web Stab</option>
                  <option value="subq">💉 Subcutaneous (SubQ Injection)</option>
                  <option value="im">💉 Intramuscular (IM Injection)</option>
                  <option value="spray">💨 Spray / Aerosol</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={vaccineSubmitting}
                className="w-full bg-farm-600 hover:bg-farm-700 text-white font-semibold rounded-lg py-2.5 text-xs transition mt-2"
              >
                {vaccineSubmitting ? "Scheduling..." : "Schedule Vaccination"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Auto-Generate Vaccination Schedule */}
      {autoGenModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base font-bold text-gray-800">⚡ Auto-Generate Standard Vaccination Schedule</h3>
              <button onClick={() => setAutoGenModalOpen(false)} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
            </div>
            <p className="text-xs text-gray-500 mb-4">
              Select an active flock to automatically populate 9 standard vaccines (Marek's, Ranikhet ND B1/LaSota, Gumboro IBD, Fowl Pox, Coryza, EDS-76).
            </p>

            <form onSubmit={submitAutoGenVaccines} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Select Active Flock *</label>
                <select
                  required
                  value={selectedAutoGenFlockId}
                  onChange={(e) => setSelectedAutoGenFlockId(e.target.value)}
                  className="w-full text-xs border border-gray-300 rounded-lg p-2.5 outline-none"
                >
                  <option value="">-- Choose Flock Batch --</option>
                  {batches.map((b) => (
                    <option key={b._id} value={b._id}>{b.name} ({b.poultryType.toUpperCase()}) — Hatched: {fmtDate(b.dateOfHatch)}</option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                className="w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg py-2.5 text-xs transition mt-2"
              >
                ⚡ Generate 9-Vaccine Schedule
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Mark Vaccination Administered / Completed */}
      {completeVaccineModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base font-bold text-gray-800">✓ Mark Vaccination Administered</h3>
              <button onClick={() => setCompleteVaccineModal(null)} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
            </div>
            <p className="text-xs text-gray-500 mb-4">
              Flock: <span className="font-bold text-gray-800">{completeVaccineModal.flockName}</span> · Vaccine: <span className="font-bold text-gray-800">{completeVaccineModal.vaccineName}</span>
            </p>

            <form onSubmit={submitCompleteVaccine} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Actual Administered Date *</label>
                <input
                  type="date"
                  required
                  value={completeVaccineForm.actualDate}
                  onChange={(e) => setCompleteVaccineForm({ ...completeVaccineForm, actualDate: e.target.value })}
                  className="w-full text-xs border border-gray-300 rounded-lg p-2.5 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Vaccine Brand / Manufacturer</label>
                  <input
                    placeholder="e.g. Venky's / Hester"
                    value={completeVaccineForm.vaccineBrand}
                    onChange={(e) => setCompleteVaccineForm({ ...completeVaccineForm, vaccineBrand: e.target.value })}
                    className="w-full text-xs border border-gray-300 rounded-lg p-2.5 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Batch / Lot Number</label>
                  <input
                    placeholder="e.g. LOT-ND-9921"
                    value={completeVaccineForm.batchLotNo}
                    onChange={(e) => setCompleteVaccineForm({ ...completeVaccineForm, batchLotNo: e.target.value })}
                    className="w-full text-xs border border-gray-300 rounded-lg p-2.5 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Doses Administered</label>
                  <input
                    type="number"
                    placeholder="5000"
                    value={completeVaccineForm.dosesCount}
                    onChange={(e) => setCompleteVaccineForm({ ...completeVaccineForm, dosesCount: e.target.value })}
                    className="w-full text-xs border border-gray-300 rounded-lg p-2.5 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Total Vaccine Cost (₹)</label>
                  <input
                    type="number"
                    placeholder="1200"
                    value={completeVaccineForm.cost}
                    onChange={(e) => setCompleteVaccineForm({ ...completeVaccineForm, cost: e.target.value })}
                    className="w-full text-xs border border-gray-300 rounded-lg p-2.5 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Notes / Stabilizer Used</label>
                <input
                  placeholder="e.g. Skimmed milk powder added to water as stabilizer"
                  value={completeVaccineForm.notes}
                  onChange={(e) => setCompleteVaccineForm({ ...completeVaccineForm, notes: e.target.value })}
                  className="w-full text-xs border border-gray-300 rounded-lg p-2.5 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">📷 Vaccine Vial / Proof Photo (optional)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setVaccinePhotoFile(e.target.files?.[0] || null)}
                  className="w-full text-xs border border-gray-300 rounded-md p-1 bg-white"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg py-2.5 text-xs transition mt-2"
              >
                Confirm & Save Administered Record
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Rest of Modals (Brooder, In-Transit, Hatchery, Flock, Media) */}
      {brooderModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base font-bold text-gray-800">🔥 Setup Brooder House Batch</h3>
              <button onClick={() => setBrooderModalOpen(false)} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
            </div>

            <form onSubmit={submitBrooder} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Brooder Batch / Flock No *</label>
                <input
                  required
                  placeholder="e.g. BR-2026-CHICK-01"
                  value={brooderForm.brooderBatchNo}
                  onChange={(e) => setBrooderForm({ ...brooderForm, brooderBatchNo: e.target.value })}
                  className="w-full text-xs border border-gray-300 rounded-lg p-2.5 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Brooder House / Ring *</label>
                  <input
                    required
                    placeholder="e.g. Shed 1 / Ring A"
                    value={brooderForm.brooderHouseNo}
                    onChange={(e) => setBrooderForm({ ...brooderForm, brooderHouseNo: e.target.value })}
                    className="w-full text-xs border border-gray-300 rounded-lg p-2.5 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Placement Date *</label>
                  <input
                    type="date"
                    required
                    value={brooderForm.placementDate}
                    onChange={(e) => setBrooderForm({ ...brooderForm, placementDate: e.target.value })}
                    className="w-full text-xs border border-gray-300 rounded-lg p-2.5 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Chicks Placed *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="e.g. 5000"
                    value={brooderForm.chicksPlaced}
                    onChange={(e) => setBrooderForm({ ...brooderForm, chicksPlaced: e.target.value })}
                    className="w-full text-xs border border-gray-300 rounded-lg p-2.5 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Target Temp (°C)</label>
                  <input
                    type="number"
                    placeholder="33"
                    value={brooderForm.targetTempC}
                    onChange={(e) => setBrooderForm({ ...brooderForm, targetTempC: e.target.value })}
                    className="w-full text-xs border border-gray-300 rounded-lg p-2.5 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Heat Source</label>
                  <select
                    value={brooderForm.heatSource}
                    onChange={(e) => setBrooderForm({ ...brooderForm, heatSource: e.target.value })}
                    className="w-full text-xs border border-gray-300 rounded-lg p-2.5 outline-none"
                  >
                    <option value="Infrared Lamp">Infrared Lamp</option>
                    <option value="Gas Brooder">Gas Brooder</option>
                    <option value="Bukhari/Charcoal">Bukhari / Charcoal Stove</option>
                    <option value="Diesel Heater">Diesel Space Heater</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Starter Feed Type</label>
                  <input
                    placeholder="e.g. Pre-Starter Crumb"
                    value={brooderForm.starterFeedType}
                    onChange={(e) => setBrooderForm({ ...brooderForm, starterFeedType: e.target.value })}
                    className="w-full text-xs border border-gray-300 rounded-lg p-2.5 outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={brooderSubmitting}
                className="w-full bg-farm-600 hover:bg-farm-700 disabled:opacity-60 text-white font-semibold rounded-lg py-2.5 text-xs transition mt-2"
              >
                {brooderSubmitting ? "Saving..." : "Save Brooder Batch"}
              </button>
            </form>
          </div>
        </div>
      )}

      {brooderRecordModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base font-bold text-gray-800">🌡️ Log Today's Brooder Check</h3>
              <button onClick={() => setBrooderRecordModalOpen(false)} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
            </div>

            <form onSubmit={submitBrooderRecord} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  required
                  value={brooderRecordForm.date}
                  onChange={(e) => setBrooderRecordForm({ ...brooderRecordForm, date: e.target.value })}
                  className="w-full text-xs border border-gray-300 rounded-lg p-2.5 outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Morning Temp (°C)</label>
                  <input
                    type="number"
                    step="0.5"
                    placeholder="33.5"
                    value={brooderRecordForm.tempMorningC}
                    onChange={(e) => setBrooderRecordForm({ ...brooderRecordForm, tempMorningC: e.target.value })}
                    className="w-full text-xs border border-gray-300 rounded-lg p-2.5 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Evening Temp (°C)</label>
                  <input
                    type="number"
                    step="0.5"
                    placeholder="32.0"
                    value={brooderRecordForm.tempEveningC}
                    onChange={(e) => setBrooderRecordForm({ ...brooderRecordForm, tempEveningC: e.target.value })}
                    className="w-full text-xs border border-gray-300 rounded-lg p-2.5 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Humidity % (RH)</label>
                  <input
                    type="number"
                    placeholder="65"
                    value={brooderRecordForm.humidityPct}
                    onChange={(e) => setBrooderRecordForm({ ...brooderRecordForm, humidityPct: e.target.value })}
                    className="w-full text-xs border border-gray-300 rounded-lg p-2.5 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">💀 Mortality</label>
                  <input
                    type="number"
                    min="0"
                    value={brooderRecordForm.mortality}
                    onChange={(e) => setBrooderRecordForm({ ...brooderRecordForm, mortality: e.target.value })}
                    className="w-full text-xs border border-gray-300 rounded-lg p-2.5 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">✂️ Culls</label>
                  <input
                    type="number"
                    min="0"
                    value={brooderRecordForm.culls}
                    onChange={(e) => setBrooderRecordForm({ ...brooderRecordForm, culls: e.target.value })}
                    className="w-full text-xs border border-gray-300 rounded-lg p-2.5 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Feed (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={brooderRecordForm.feedKg}
                    onChange={(e) => setBrooderRecordForm({ ...brooderRecordForm, feedKg: e.target.value })}
                    className="w-full text-xs border border-gray-300 rounded-lg p-2.5 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Water (L)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={brooderRecordForm.waterLiters}
                    onChange={(e) => setBrooderRecordForm({ ...brooderRecordForm, waterLiters: e.target.value })}
                    className="w-full text-xs border border-gray-300 rounded-lg p-2.5 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Sample Wt (g)</label>
                  <input
                    type="number"
                    placeholder="145"
                    value={brooderRecordForm.sampleAvgWeightGms}
                    onChange={(e) => setBrooderRecordForm({ ...brooderRecordForm, sampleAvgWeightGms: e.target.value })}
                    className="w-full text-xs border border-gray-300 rounded-lg p-2.5 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Brooding Checklist Completed Today</label>
                <div className="grid grid-cols-1 gap-1.5 bg-gray-50 p-3 rounded-xl border border-gray-200 text-xs">
                  {BROODING_CHECKLIST_OPTIONS.map((chk) => (
                    <label key={chk.id} className="flex items-center gap-2 text-gray-700">
                      <input
                        type="checkbox"
                        checked={brooderRecordForm.checklist.includes(chk.id)}
                        onChange={(e) => {
                          const current = brooderRecordForm.checklist;
                          const next = e.target.checked
                            ? [...current, chk.id]
                            : current.filter((item) => item !== chk.id);
                          setBrooderRecordForm({ ...brooderRecordForm, checklist: next });
                        }}
                        className="rounded text-farm-600 focus:ring-farm-500"
                      />
                      <span>{chk.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Remarks</label>
                <input
                  placeholder="e.g. Chicks lively, spread evenly under brooder"
                  value={brooderRecordForm.remarks}
                  onChange={(e) => setBrooderRecordForm({ ...brooderRecordForm, remarks: e.target.value })}
                  className="w-full text-xs border border-gray-300 rounded-lg p-2.5 outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={brooderRecordSubmitting}
                className="w-full bg-farm-600 hover:bg-farm-700 disabled:opacity-60 text-white font-semibold rounded-lg py-2.5 text-xs transition mt-2"
              >
                {brooderRecordSubmitting ? "Saving..." : "Save Brooder Daily Log"}
              </button>
            </form>
          </div>
        </div>
      )}

      {transferBrooderModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base font-bold text-gray-800">→ Transfer to Grower House</h3>
              <button onClick={() => setTransferBrooderModal(null)} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
            </div>
            <p className="text-xs text-gray-500 mb-4">
              Brooding period completed for <span className="font-bold text-gray-800">{transferBrooderModal.brooderBatchNo}</span>. Move chicks to growing house.
            </p>

            <form onSubmit={submitBrooderTransfer} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Target Grower Module *</label>
                <select
                  value={transferBrooderForm.transferredToType}
                  onChange={(e) => setTransferBrooderForm({ ...transferBrooderForm, transferredToType: e.target.value })}
                  className="w-full text-xs border border-gray-300 rounded-lg p-2.5 outline-none"
                >
                  <option value="layer">Layer Farming</option>
                  <option value="broiler">Broiler</option>
                  <option value="breeder">Breeder</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg py-2.5 text-xs transition mt-2"
              >
                Confirm & Auto-Create Grower Flock Batch
              </button>
            </form>
          </div>
        </div>
      )}

      {receiveModalItem && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base font-bold text-gray-800">📦 Mark Shipment as Received</h3>
              <button onClick={() => setReceiveModalItem(null)} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
            </div>
            <p className="text-xs text-gray-500 mb-4">
              Receive batch <span className="font-bold text-gray-700">{receiveModalItem.batchNo}</span> into farm inventory.
            </p>

            <form onSubmit={submitReceive} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Destination Poultry Type *</label>
                <select
                  value={receiveForm.destinationType}
                  onChange={(e) => setReceiveForm({ ...receiveForm, destinationType: e.target.value })}
                  className="w-full text-xs border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-farm-500 outline-none"
                >
                  <option value="brooder">🔥 Brooder House (Recommended for Day 1-21)</option>
                  <option value="layer">Layer Farming</option>
                  <option value="breeder">Breeder & Hatchery</option>
                  <option value="broiler">Broiler</option>
                  <option value="unassigned">General / Unassigned</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Assigned House / Pen</label>
                <input
                  placeholder="e.g. Brooder Ring 1 / Shed 2"
                  value={receiveForm.assignedPen}
                  onChange={(e) => setReceiveForm({ ...receiveForm, assignedPen: e.target.value })}
                  className="w-full text-xs border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-farm-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Condition / Arrival Notes</label>
                <input
                  placeholder="e.g. Chicks active, normal hydration, temperature optimal"
                  value={receiveForm.receivedNotes}
                  onChange={(e) => setReceiveForm({ ...receiveForm, receivedNotes: e.target.value })}
                  className="w-full text-xs border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-farm-500 outline-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="createFlockBatch"
                  checked={receiveForm.createFlockBatch}
                  onChange={(e) => setReceiveForm({ ...receiveForm, createFlockBatch: e.target.checked })}
                  className="w-4 h-4 text-farm-600 rounded"
                />
                <label htmlFor="createFlockBatch" className="text-xs text-gray-700 font-medium">
                  Auto-create active batch for {receiveForm.destinationType.toUpperCase()}
                </label>
              </div>

              <button
                type="submit"
                disabled={receiveSubmitting}
                className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-semibold rounded-lg py-2.5 text-xs transition mt-3"
              >
                {receiveSubmitting ? "Processing..." : "Confirm & Save Received Chicks"}
              </button>
            </form>
          </div>
        </div>
      )}

      {hatcheryModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base font-bold text-gray-800">🐣 Log Incubator Egg Setting</h3>
              <button onClick={() => setHatcheryModalOpen(false)} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
            </div>

            <form onSubmit={submitHatchery} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Hatchery Batch No *</label>
                <input
                  required
                  placeholder="e.g. INC-2026-SET-01"
                  value={hatcheryForm.hatcheryBatchNo}
                  onChange={(e) => setHatcheryForm({ ...hatcheryForm, hatcheryBatchNo: e.target.value })}
                  className="w-full text-xs border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-farm-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Breed Name</label>
                  <input
                    placeholder="e.g. Cobb 500 / BV380 / Ross 308"
                    value={hatcheryForm.breedName}
                    onChange={(e) => setHatcheryForm({ ...hatcheryForm, breedName: e.target.value })}
                    className="w-full text-xs border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-farm-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Incubator / Setter No *</label>
                  <input
                    required
                    placeholder="e.g. Setter 1"
                    value={hatcheryForm.incubatorNo}
                    onChange={(e) => setHatcheryForm({ ...hatcheryForm, incubatorNo: e.target.value })}
                    className="w-full text-xs border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-farm-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Total Eggs Set *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="e.g. 10000"
                    value={hatcheryForm.eggsSet}
                    onChange={(e) => setHatcheryForm({ ...hatcheryForm, eggsSet: e.target.value })}
                    className="w-full text-xs border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-farm-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Fertile Eggs Count</label>
                  <input
                    type="number"
                    placeholder="e.g. 9200"
                    value={hatcheryForm.fertileEggs}
                    onChange={(e) => setHatcheryForm({ ...hatcheryForm, fertileEggs: e.target.value })}
                    className="w-full text-xs border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-farm-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Setting Date *</label>
                  <input
                    type="date"
                    required
                    value={hatcheryForm.settingDate}
                    onChange={(e) => setHatcheryForm({ ...hatcheryForm, settingDate: e.target.value })}
                    className="w-full text-xs border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-farm-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Expected Hatch Date</label>
                  <input
                    type="date"
                    value={hatcheryForm.expectedHatchDate}
                    onChange={(e) => setHatcheryForm({ ...hatcheryForm, expectedHatchDate: e.target.value })}
                    className="w-full text-xs border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-farm-500 outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={hatcherySubmitting}
                className="w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg py-2.5 text-xs transition mt-2"
              >
                {hatcherySubmitting ? "Logging..." : "Save Egg Setting Log"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Record Hatching Results & Auto-Trigger Day 1 Vaccines */}
      {hatchResultModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base font-bold text-gray-800">🐣 Record Hatching Results</h3>
              <button onClick={() => setHatchResultModal(null)} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
            </div>
            <p className="text-xs text-gray-500 mb-3">
              Hatchery Batch: <span className="font-bold text-gray-700">{hatchResultModal.hatcheryBatchNo}</span> ({hatchResultModal.eggsSet} eggs set)
            </p>

            <div className="bg-blue-50 border border-blue-200 text-blue-900 rounded-xl p-3 text-xs mb-3 space-y-1">
              <p className="font-bold flex items-center gap-1"><span>💡</span> Automatic Actions on Saving Hatch:</p>
              <p>1. Marks all active advance bookings as <span className="font-bold text-emerald-700">Delivered 🟢</span>.</p>
              <p>2. Starts <span className="font-bold text-blue-700">1st Day Vaccination</span> (Marek's Disease SubQ & ND+IB Spray) in Vaccination Schedule.</p>
            </div>

            <form onSubmit={submitHatchResult} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Actual Hatch Date</label>
                <input
                  type="date"
                  required
                  value={hatchResultForm.actualHatchDate}
                  onChange={(e) => setHatchResultForm({ ...hatchResultForm, actualHatchDate: e.target.value })}
                  className="w-full text-xs border border-gray-300 rounded-lg p-2.5 outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Grade A Chicks</label>
                  <input
                    type="number"
                    min="0"
                    required
                    placeholder="8500"
                    value={hatchResultForm.hatchedGradeA}
                    onChange={(e) => setHatchResultForm({ ...hatchResultForm, hatchedGradeA: e.target.value })}
                    className="w-full text-xs border border-gray-300 rounded-lg p-2.5 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Grade B Chicks</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="300"
                    value={hatchResultForm.hatchedGradeB}
                    onChange={(e) => setHatchResultForm({ ...hatchResultForm, hatchedGradeB: e.target.value })}
                    className="w-full text-xs border border-gray-300 rounded-lg p-2.5 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Culls / Unhatched</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="1200"
                    value={hatchResultForm.culls}
                    onChange={(e) => setHatchResultForm({ ...hatchResultForm, culls: e.target.value })}
                    className="w-full text-xs border border-gray-300 rounded-lg p-2.5 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Notes / Observations</label>
                <input
                  placeholder="e.g. Good feathering, active chicks"
                  value={hatchResultForm.notes}
                  onChange={(e) => setHatchResultForm({ ...hatchResultForm, notes: e.target.value })}
                  className="w-full text-xs border border-gray-300 rounded-lg p-2.5 outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg py-2.5 text-xs transition mt-2"
              >
                Confirm Hatching & Trigger 1st Day Vaccinations
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Hatchery Advance Booking */}
      {bookingModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base font-bold text-gray-800">📋 Add Advance Booking</h3>
              <button onClick={() => setBookingModal(null)} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
            </div>
            <p className="text-xs text-gray-500 mb-4">
              Booking for Incubator Batch: <span className="font-bold text-gray-800">{bookingModal.hatcheryBatchNo}</span> {bookingModal.breedName ? `(${bookingModal.breedName})` : ""}
            </p>

            <form onSubmit={submitHatcheryBooking} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Party / Buyer Name *</label>
                <input
                  required
                  placeholder="e.g. Apex Farmers Co-op / Rahul Sharma"
                  value={bookingForm.partyName}
                  onChange={(e) => setBookingForm({ ...bookingForm, partyName: e.target.value })}
                  className="w-full text-xs border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-farm-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Chicks Quantity *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="e.g. 2000"
                    value={bookingForm.quantity}
                    onChange={(e) => setBookingForm({ ...bookingForm, quantity: e.target.value })}
                    className="w-full text-xs border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-farm-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Advance Paid (₹)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 5000"
                    value={bookingForm.advanceAmount}
                    onChange={(e) => setBookingForm({ ...bookingForm, advanceAmount: e.target.value })}
                    className="w-full text-xs border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-farm-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Contact Mobile Number</label>
                <input
                  type="tel"
                  placeholder="e.g. 9876543210"
                  value={bookingForm.contactMobile}
                  onChange={(e) => setBookingForm({ ...bookingForm, contactMobile: e.target.value })}
                  className="w-full text-xs border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-farm-500 outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={bookingSubmitting}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold rounded-lg py-2.5 text-xs transition mt-2"
              >
                {bookingSubmitting ? "Saving..." : "Save Advance Booking"}
              </button>
            </form>
          </div>
        </div>
      )}

      {batchModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base font-bold text-gray-800">🐥 New Flock Batch</h3>
              <button onClick={() => setBatchModalOpen(false)} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
            </div>

            <form onSubmit={submitBatch} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Flock Name *</label>
                <input
                  required
                  placeholder="e.g. Batch A - Layer"
                  value={batchForm.name}
                  onChange={(e) => setBatchForm({ ...batchForm, name: e.target.value })}
                  className="w-full text-xs border border-gray-300 rounded-lg p-2.5 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Poultry Type</label>
                  <select
                    value={batchForm.poultryType}
                    onChange={(e) => setBatchForm({ ...batchForm, poultryType: e.target.value })}
                    className="w-full text-xs border border-gray-300 rounded-lg p-2.5 outline-none capitalize"
                  >
                    <option value="layer">Layer</option>
                    <option value="broiler">Broiler</option>
                    <option value="breeder">Breeder</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Chicks Received *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="e.g. 5000"
                    value={batchForm.chicksReceived}
                    onChange={(e) => setBatchForm({ ...batchForm, chicksReceived: e.target.value })}
                    className="w-full text-xs border border-gray-300 rounded-lg p-2.5 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Breed / Line</label>
                <input
                  placeholder="e.g. IB H120, BV300, Cobb 500"
                  value={batchForm.breed}
                  onChange={(e) => setBatchForm({ ...batchForm, breed: e.target.value })}
                  className="w-full text-xs border border-gray-300 rounded-lg p-2.5 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Date of Hatch</label>
                  <input
                    type="date"
                    required
                    value={batchForm.dateOfHatch}
                    onChange={(e) => setBatchForm({ ...batchForm, dateOfHatch: e.target.value })}
                    className="w-full text-xs border border-gray-300 rounded-lg p-2.5 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Assigned House/Pen</label>
                  <input
                    placeholder="e.g. Shed 1"
                    value={batchForm.houseNo}
                    onChange={(e) => setBatchForm({ ...batchForm, houseNo: e.target.value })}
                    className="w-full text-xs border border-gray-300 rounded-lg p-2.5 outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={batchSubmitting}
                className="w-full bg-farm-600 hover:bg-farm-700 text-white font-semibold rounded-lg py-2.5 text-xs transition mt-2"
              >
                {batchSubmitting ? "Creating..." : "Create Flock Batch"}
              </button>
            </form>
          </div>
        </div>
      )}

      {recordModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base font-bold text-gray-800">📋 {editingRecordId ? "Edit Daily Record" : "Add Today's Flock Entry"}</h3>
              <button onClick={() => setRecordModalOpen(false)} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
            </div>

            <form onSubmit={submitRecord} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  required
                  disabled={!!editingRecordId}
                  value={recordForm.date}
                  onChange={(e) => setRecordForm({ ...recordForm, date: e.target.value })}
                  className="w-full text-xs border border-gray-300 rounded-lg p-2.5 outline-none disabled:bg-gray-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">💀 Mortality</label>
                  <input
                    type="number"
                    min="0"
                    value={recordForm.mortality}
                    onChange={(e) => setRecordForm({ ...recordForm, mortality: e.target.value })}
                    className="w-full text-xs border border-gray-300 rounded-lg p-2.5 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">✂️ Culls</label>
                  <input
                    type="number"
                    min="0"
                    value={recordForm.culls}
                    onChange={(e) => setRecordForm({ ...recordForm, culls: e.target.value })}
                    className="w-full text-xs border border-gray-300 rounded-lg p-2.5 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">🌾 Feed Used (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={recordForm.feedKg}
                  onChange={(e) => setRecordForm({ ...recordForm, feedKg: e.target.value })}
                  className="w-full text-xs border border-gray-300 rounded-lg p-2.5 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">🥚 Eggs Collected</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="optional"
                    value={recordForm.eggCount}
                    onChange={(e) => setRecordForm({ ...recordForm, eggCount: e.target.value })}
                    className="w-full text-xs border border-gray-300 rounded-lg p-2.5 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">⚖️ Avg Body Wt (g)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="optional"
                    value={recordForm.bodyWeightGms}
                    onChange={(e) => setRecordForm({ ...recordForm, bodyWeightGms: e.target.value })}
                    className="w-full text-xs border border-gray-300 rounded-lg p-2.5 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">📝 Remarks</label>
                <input
                  placeholder="e.g. Vaccination done, Feed change"
                  value={recordForm.remarks}
                  onChange={(e) => setRecordForm({ ...recordForm, remarks: e.target.value })}
                  className="w-full text-xs border border-gray-300 rounded-lg p-2.5 outline-none"
                />
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 space-y-2">
                <p className="text-xs font-bold text-gray-700">📸 Photo & 🎥 Video Proof Upload</p>
                <div>
                  <label className="block text-[10px] text-gray-600 mb-0.5">📷 Photo Proof</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
                    className="w-full text-xs border border-gray-300 rounded-md p-1 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-600 mb-0.5">🎥 Video Proof</label>
                  <input
                    type="file"
                    accept="video/*"
                    onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
                    className="w-full text-xs border border-gray-300 rounded-md p-1 bg-white"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={recordSubmitting}
                className="w-full bg-farm-600 hover:bg-farm-700 disabled:opacity-60 text-white font-semibold rounded-lg py-2.5 text-xs transition mt-2"
              >
                {recordSubmitting ? "Uploading & Saving..." : "Save Entry"}
              </button>
            </form>
          </div>
        </div>
      )}

      {mediaModal && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="font-bold text-gray-800 text-sm">{mediaModal.title}</h3>
              <button onClick={() => setMediaModal(null)} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
            </div>
            <div className="p-4 space-y-4 max-h-[75vh] overflow-y-auto">
              {mediaModal.photoUrl && (
                <div>
                  <p className="text-xs font-semibold text-gray-700 mb-1">📷 Photo Proof:</p>
                  <img src={mediaModal.photoUrl} alt="Log Proof" className="w-full rounded-xl border border-gray-200" />
                </div>
              )}
              {mediaModal.videoUrl && (
                <div>
                  <p className="text-xs font-semibold text-gray-700 mb-1">🎥 Video Proof Player:</p>
                  <video controls autoPlay className="w-full rounded-xl border border-gray-200 bg-black">
                    <source src={mediaModal.videoUrl} type="video/mp4" />
                  </video>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PoultryModule;
