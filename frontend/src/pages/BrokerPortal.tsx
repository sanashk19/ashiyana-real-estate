import React, { useState, useEffect, useMemo, useRef } from "react";
import { Link } from "react-router";
import {
  type PropertyCardDto,
  type PropertyType,
  type ListingType,
  type GoaRegion,
  type PropertyStatus,
  type PropertyCreateDto,
  type PropertyUpdateDto,
  type LeadStatus,
  type EnquiryDto,
  type DashboardStatsDto,
  type SellerSubmissionDto,
  type BusinessProfileDto,
  fetchProperties,
  createProperty,
  updateProperty,
  deleteProperty,
  uploadPropertyImages,
  fetchEnquiries,
  updateEnquiry,
  archiveEnquiry,
  unarchiveEnquiry,
  fetchSubmissions,
  reviewSubmission,
  formatSubmissionStatusLabel,
  fetchDashboardStats,
  formatLeadStatusLabel,
  loginBroker,
  getAuthToken,
  clearAuthToken,
  formatPriceINR,
  updateBusinessProfile,
  fetchBrokerSellers,
  fetchBrokerSellerDetail,
  BrokerSellerListItemDto,
  BrokerSellerDetailDto,
  estimatePropertyPrice,
  fetchValuationHistory,
  ValuationRequestDto,
  ValuationResultDto,
  ValuationHistoryItemDto,
  fetchPropertyWatchers,
  fetchPropertyWatcherSummary,
  PropertyWatcherItemDto,
  fetchPropertySellerDocuments,
  SellerDocumentDto,
  fetchDeals,
  fetchDeal,
  createDeal,
  updateDeal,
  deleteDeal,
  uploadDealDocument,
  downloadDealDocument,
  deleteDealDocument,
  type DealListItemDto,
  type DealDetailDto,
  type DealCreateDto,
  type DealUpdateDto,
  type DealStatus,
  type DealDocumentCategory,
  type DealDocumentDto,
} from "@/lib/api";
import { AshiyanaLogo } from "@/lib/shared";
import { PropertyImageManager } from "@/components/PropertyImageManager";
import { getApiErrorMessage } from "@/lib/errorUtils";
import { useBusinessProfile } from "@/context/BusinessProfileContext";
import {
  LayoutDashboard,
  Building2,
  PlusCircle,
  Inbox,
  Archive,
  ArchiveRestore,
  Users,
  Calendar,
  Settings,
  LogOut,
  Phone,
  MessageSquare,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Plus,
  FileText,
  Bell,
  Clock,
  Camera,
  Trash2,
  ExternalLink,
  Search,
  ChevronRight,
  Check,
  X,
  ShieldCheck,
  Star,
  Download,
  Home,
  Menu,
  Maximize2,
  Edit3,
  ArrowUpRight,
  PanelLeftClose,
  PanelLeftOpen,
  TrendingUp,
  Sparkles,
  Calculator,
  SlidersHorizontal,
  FolderKey,
  Handshake,
  Briefcase,
  UploadCloud,
  FileCheck,
  ArrowLeft,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────
type ActiveTab =
  | "dashboard"
  | "properties"
  | "add-property"
  | "submissions"
  | "sellers"
  | "deals"
  | "enquiries"
  | "visits"
  | "valuation"
  | "profile";

const DEAL_STATUS_META: Record<DealStatus, { label: string; bg: string; text: string; border: string }> = {
  inquiry: { label: "Inquiry", bg: "bg-sky-50", text: "text-sky-700", border: "border-sky-200" },
  negotiation: { label: "Negotiation", bg: "bg-amber-50", text: "text-amber-800", border: "border-amber-200" },
  agreement: { label: "Agreement Signed", bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" },
  completed: { label: "Closed Won", bg: "bg-emerald-50", text: "text-emerald-800", border: "border-emerald-200" },
  cancelled: { label: "Cancelled", bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200" },
};

const DOC_CATEGORY_META: Record<DealDocumentCategory, { label: string; bg: string; text: string }> = {
  property: { label: "Property Documents", bg: "bg-emerald-50 text-emerald-800 border-emerald-200" },
  seller: { label: "Seller KYC & Deeds", bg: "bg-amber-50 text-amber-800 border-amber-200" },
  buyer: { label: "Buyer ID & Proofs", bg: "bg-blue-50 text-blue-800 border-blue-200" },
  legal: { label: "Legal Agreements", bg: "bg-purple-50 text-purple-800 border-purple-200" },
  financial: { label: "Financial & Escrow", bg: "bg-rose-50 text-rose-800 border-rose-200" },
  other: { label: "Other Attachments", bg: "bg-gray-100 text-gray-800 border-gray-200" },
};

// Helper for relative timestamps
function formatTimeAgo(dateStr?: string | null): string {
  if (!dateStr) return "Recently";
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diffSeconds < 60) return "Just now";
    if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
    if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}h ago`;
    if (diffSeconds < 604800) return `${Math.floor(diffSeconds / 86400)}d ago`;
    return date.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
  } catch {
    return "Recently";
  }
}

// Dynamic time-of-day greeting
function getTimeGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default function BrokerPortal() {
  const [authToken, setToken] = useState<string | null>(getAuthToken());
  const { profile: globalBusinessProfile, refreshProfile: refreshGlobalBusinessProfile } = useBusinessProfile();
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  // Active Navigation & Collapsible Sidebar
  const [activeTab, setActiveTab] = useState<ActiveTab>("dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("ashiyana_sidebar_collapsed") === "true";
    }
    return false;
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [globalSearchQuery, setGlobalSearchQuery] = useState("");

  const toggleSidebar = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        localStorage.setItem("ashiyana_sidebar_collapsed", String(next));
      }
      return next;
    });
  };

  // Sellers Management State
  const [sellers, setSellers] = useState<BrokerSellerListItemDto[]>([]);
  const [loadingSellers, setLoadingSellers] = useState(false);
  const [sellerSearch, setSellerSearch] = useState("");
  const [selectedSeller, setSelectedSeller] = useState<BrokerSellerDetailDto | null>(null);
  const [loadingSellerDetail, setLoadingSellerDetail] = useState(false);

  // Deals & Deal Document Vault State
  const [deals, setDeals] = useState<DealListItemDto[]>([]);
  const [loadingDeals, setLoadingDeals] = useState(false);
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null);
  const [selectedDealDetail, setSelectedDealDetail] = useState<DealDetailDto | null>(null);
  const [loadingDealDetail, setLoadingDealDetail] = useState(false);
  const [dealSearch, setDealSearch] = useState("");
  const [dealStatusFilter, setDealStatusFilter] = useState<string>("all");
  const [createDealModalOpen, setCreateDealModalOpen] = useState(false);
  const [editDealModalOpen, setEditDealModalOpen] = useState(false);
  const [dealSaving, setDealSaving] = useState(false);
  const [dealFeedback, setDealFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const [newDealForm, setNewDealForm] = useState<DealCreateDto>({
    title: "",
    property_id: undefined,
    status: "inquiry",
    buyer_name: "",
    buyer_contact: "",
    seller_name: "",
    seller_contact: "",
    agreed_price: undefined,
    commission_rate: undefined,
    commission_amount: undefined,
    target_closing_date: undefined,
    broker_notes: "",
  });

  const [editDealForm, setEditDealForm] = useState<DealUpdateDto>({
    title: "",
    status: "inquiry",
    buyer_name: "",
    buyer_contact: "",
    seller_name: "",
    seller_contact: "",
    agreed_price: undefined,
    commission_rate: undefined,
    commission_amount: undefined,
    target_closing_date: undefined,
    actual_closing_date: undefined,
    broker_notes: "",
  });

  // Deal Document States
  const [dealDocCategoryFilter, setDealDocCategoryFilter] = useState<string>("all");
  const [uploadDocModalOpen, setUploadDocModalOpen] = useState(false);
  const [uploadDocCategory, setUploadDocCategory] = useState<DealDocumentCategory>("property");
  const [uploadDocTitle, setUploadDocTitle] = useState("");
  const [selectedDealDocFile, setSelectedDealDocFile] = useState<File | null>(null);
  const [uploadingDealDoc, setUploadingDealDoc] = useState(false);
  const [uploadDealDocError, setUploadDealDocError] = useState<string | null>(null);
  const [deletingDealDocId, setDeletingDealDocId] = useState<string | null>(null);
  const [deleteDealDocLoading, setDeleteDealDocLoading] = useState(false);
  const [deletingDealConfirmId, setDeletingDealConfirmId] = useState<string | null>(null);
  const [deleteDealLoading, setDeleteDealLoading] = useState(false);

  // Profile Edit State
  const [profileForm, setProfileForm] = useState<BusinessProfileDto>(globalBusinessProfile);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileFeedback, setProfileFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Sync profileForm when globalBusinessProfile loads
  useEffect(() => {
    if (globalBusinessProfile) {
      setProfileForm(globalBusinessProfile);
    }
  }, [globalBusinessProfile]);

  // Dashboard Stats State
  const [dashboardStats, setDashboardStats] = useState<DashboardStatsDto | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  // Properties State
  const [properties, setProperties] = useState<PropertyCardDto[]>([]);
  const [loadingProps, setLoadingProps] = useState(false);
  const [propSearch, setPropSearch] = useState("");
  const [propTypeFilter, setPropTypeFilter] = useState<string>("all");
  const [propListingFilter, setPropListingFilter] = useState<string>("all");
  const [propStatusFilter, setPropStatusFilter] = useState<string>("all");
  const [propFeaturedFilter, setPropFeaturedFilter] = useState<string>("all");

  // Property Modals State
  const [editingProperty, setEditingProperty] = useState<PropertyCardDto | null>(null);
  const [editForm, setEditForm] = useState<PropertyUpdateDto>({});
  const [editSaving, setEditSaving] = useState(false);
  const [editFeedback, setEditFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const [managingPhotosPropId, setManagingPhotosPropId] = useState<string | null>(null);
  const [deletingPropId, setDeletingPropId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Watcher Intelligence State
  const [watcherSummaryMap, setWatcherSummaryMap] = useState<Record<string, number>>({});
  const [selectedWatcherProperty, setSelectedWatcherProperty] = useState<PropertyCardDto | null>(null);
  const [propertyWatchersList, setPropertyWatchersList] = useState<PropertyWatcherItemDto[]>([]);
  const [loadingWatchersList, setLoadingWatchersList] = useState(false);

  // Property Legal Documents State
  const [propertyDocuments, setPropertyDocuments] = useState<SellerDocumentDto[]>([]);
  const [loadingPropertyDocs, setLoadingPropertyDocs] = useState(false);

  // Image Enlarge Modal State
  const [enlargedImageUrl, setEnlargedImageUrl] = useState<string | null>(null);

  // Add Property Form State
  const [newProp, setNewProp] = useState<PropertyCreateDto>({
    title: "",
    property_type: "flat",
    listing_type: "sale",
    price: 0,
    price_negotiable: true,
    locality: "",
    village: "",
    taluka: "",
    region: "north_goa",
    bedrooms: 0,
    bathrooms: 0,
    area_sqft: 0,
    description: "",
    furnished: "furnished",
    possession_status: "ready_to_move",
    connectivity_score: 8,
    is_featured: false,
    status: "active",
    nri_eligible: true,
    fema_compliant: true,
    amenities: ["Reserved Parking", "24/7 Security"],
  });
  const [selectedPhotos, setSelectedPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [addPropLoading, setAddPropLoading] = useState(false);
  const [addPropSuccess, setAddPropSuccess] = useState<{ id: string; title: string } | null>(null);
  const [addPropError, setAddPropError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Seller Submissions State
  const [submissions, setSubmissions] = useState<SellerSubmissionDto[]>([]);
  const [submissionFilter, setSubmissionFilter] = useState<string>("all");
  const [selectedSubmission, setSelectedSubmission] = useState<SellerSubmissionDto | null>(null);
  const [subBrokerNotes, setSubBrokerNotes] = useState<string>("");
  const [subRejectionReason, setSubRejectionReason] = useState<string>("");
  const [subSaving, setSubSaving] = useState(false);
  const [subFeedback, setSubFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Enquiries & CRM State
  const [enquiries, setEnquiries] = useState<EnquiryDto[]>([]);
  const [archivedEnquiries, setArchivedEnquiries] = useState<EnquiryDto[]>([]);
  const [enquiryArchiveView, setEnquiryArchiveView] = useState<"active" | "archived">("active");
  const [loadingArchived, setLoadingArchived] = useState(false);
  const [enquiryArchiveConfirmId, setEnquiryArchiveConfirmId] = useState<string | null>(null);
  const [enquiryStatusFilter, setEnquiryStatusFilter] = useState<string>("all");
  const [enquiryNriFilter, setEnquiryNriFilter] = useState<string>("all");
  const [selectedEnquiry, setSelectedEnquiry] = useState<EnquiryDto | null>(null);
  const [leadStatusVal, setLeadStatusVal] = useState<LeadStatus>("new");
  const [leadNotesVal, setLeadNotesVal] = useState<string>("");
  const [leadFollowUpVal, setLeadFollowUpVal] = useState<string>("");
  const [leadSaving, setLeadSaving] = useState(false);
  const [leadFeedback, setLeadFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Valuation Estimator State
  const [valuationForm, setValuationForm] = useState<ValuationRequestDto>({
    locality: "Calangute",
    property_type: "villa",
    area_sqft: 2000,
    bedrooms: 3,
    age_years: 4,
    beach_distance_km: 1.5,
    mopa_airport_km: 28,
    floor_number: 0,
    region: "north_goa",
    furnished: "furnished",
  });
  const [valuationResult, setValuationResult] = useState<ValuationResultDto | null>(null);
  const [valuationHistory, setValuationHistory] = useState<ValuationHistoryItemDto[]>([]);
  const [valuationLoading, setValuationLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [valuationError, setValuationError] = useState<string | null>(null);

  // ─── Loaders ─────────────────────────────────────────────────────────────────
  const loadDashboardData = async () => {
    setLoadingStats(true);
    setLoadingProps(true);
    setLoadingSellers(true);
    setHistoryLoading(true);
    try {
      const [statsRes, propsRes, enqRes, subsRes, sellersRes, valHistRes, watcherRes, dealsRes] = await Promise.allSettled([
        fetchDashboardStats(),
        fetchProperties({ limit: 100 }),
        fetchEnquiries({ limit: 100 }),
        fetchSubmissions({ limit: 100 }),
        fetchBrokerSellers(),
        fetchValuationHistory(),
        fetchPropertyWatcherSummary(),
        fetchDeals(),
      ]);

      // Check if session has expired (401 Unauthorized)
      const has401 = [statsRes, propsRes, enqRes, subsRes, sellersRes, valHistRes, watcherRes, dealsRes].some(
        (r) => r.status === "rejected" && (r.reason?.response?.status === 401 || String(r.reason).includes("401"))
      );
      if (has401) {
        clearAuthToken();
        setToken(null);
        setAuthError("Your session has expired. Please sign in with your broker credentials.");
        return;
      }

      if (statsRes.status === "fulfilled") setDashboardStats(statsRes.value);
      if (propsRes.status === "fulfilled") setProperties(propsRes.value.results || []);
      if (enqRes.status === "fulfilled") setEnquiries(enqRes.value || []);
      if (subsRes.status === "fulfilled") setSubmissions(subsRes.value || []);
      if (sellersRes.status === "fulfilled") setSellers(sellersRes.value || []);
      if (valHistRes.status === "fulfilled") setValuationHistory(valHistRes.value || []);
      if (dealsRes.status === "fulfilled") setDeals(dealsRes.value || []);
      if (watcherRes.status === "fulfilled") {
        const map: Record<string, number> = {};
        watcherRes.value.forEach((item) => {
          map[item.property_id] = item.watcher_count;
        });
        setWatcherSummaryMap(map);
      }
    } catch (err) {
      console.error("Error refreshing dashboard data:", err);
    } finally {
      setLoadingStats(false);
      setLoadingProps(false);
      setLoadingSellers(false);
      setHistoryLoading(false);
    }
  };

  const handleViewWatchers = async (prop: PropertyCardDto) => {
    setSelectedWatcherProperty(prop);
    setLoadingWatchersList(true);
    try {
      const data = await fetchPropertyWatchers(prop.id);
      setPropertyWatchersList(data);
    } catch (err: any) {
      console.error("Error fetching property watchers:", err);
      alert(getApiErrorMessage(err, "Could not load watcher intelligence."));
    } finally {
      setLoadingWatchersList(false);
    }
  };

  const handleOpenSellerDetail = async (sellerId: string) => {
    setLoadingSellerDetail(true);
    try {
      const detail = await fetchBrokerSellerDetail(sellerId);
      setSelectedSeller(detail);
    } catch (err: any) {
      alert(getApiErrorMessage(err, "Could not load seller details."));
    } finally {
      setLoadingSellerDetail(false);
    }
  };

  // ─── Deals & Vault Handlers ─────────────────────────────────────────────────
  const handleOpenDealDetail = async (dealId: string) => {
    setSelectedDealId(dealId);
    setLoadingDealDetail(true);
    try {
      const detail = await fetchDeal(dealId);
      setSelectedDealDetail(detail);
      setEditDealForm({
        title: detail.title,
        property_id: detail.property_id || undefined,
        status: detail.status,
        buyer_name: detail.buyer_name || "",
        buyer_contact: detail.buyer_contact || "",
        seller_name: detail.seller_name || "",
        seller_contact: detail.seller_contact || "",
        agreed_price: detail.agreed_price || undefined,
        commission_rate: detail.commission_rate || undefined,
        commission_amount: detail.commission_amount || undefined,
        target_closing_date: detail.target_closing_date || undefined,
        actual_closing_date: detail.actual_closing_date || undefined,
        broker_notes: detail.broker_notes || "",
      });
    } catch (err: any) {
      alert(getApiErrorMessage(err, "Failed to load deal details."));
      setSelectedDealId(null);
    } finally {
      setLoadingDealDetail(false);
    }
  };

  const handleCreateDealSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDealForm.title.trim()) return;
    setDealSaving(true);
    setDealFeedback(null);
    try {
      const created = await createDeal({
        ...newDealForm,
        property_id: newDealForm.property_id || undefined,
        agreed_price: newDealForm.agreed_price ? Number(newDealForm.agreed_price) : undefined,
        commission_rate: newDealForm.commission_rate ? Number(newDealForm.commission_rate) : undefined,
        commission_amount: newDealForm.commission_amount ? Number(newDealForm.commission_amount) : undefined,
      });
      setDeals((prev) => [created, ...prev]);
      setCreateDealModalOpen(false);
      setNewDealForm({
        title: "",
        property_id: undefined,
        status: "inquiry",
        buyer_name: "",
        buyer_contact: "",
        seller_name: "",
        seller_contact: "",
        agreed_price: undefined,
        commission_rate: undefined,
        commission_amount: undefined,
        target_closing_date: undefined,
        broker_notes: "",
      });
      handleOpenDealDetail(created.id);
    } catch (err: any) {
      setDealFeedback({ type: "error", message: getApiErrorMessage(err, "Failed to create deal.") });
    } finally {
      setDealSaving(false);
    }
  };

  const handleUpdateDealSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDealId) return;
    setDealSaving(true);
    try {
      const updated = await updateDeal(selectedDealId, {
        ...editDealForm,
        agreed_price: editDealForm.agreed_price ? Number(editDealForm.agreed_price) : undefined,
        commission_rate: editDealForm.commission_rate ? Number(editDealForm.commission_rate) : undefined,
        commission_amount: editDealForm.commission_amount ? Number(editDealForm.commission_amount) : undefined,
      });
      setSelectedDealDetail(updated);
      setDeals((prev) =>
        prev.map((d) =>
          d.id === updated.id
            ? {
                ...d,
                title: updated.title,
                status: updated.status,
                buyer_name: updated.buyer_name,
                seller_name: updated.seller_name,
                agreed_price: updated.agreed_price,
                document_count: updated.documents?.length ?? d.document_count,
              }
            : d
        )
      );
      setEditDealModalOpen(false);
    } catch (err: any) {
      alert(getApiErrorMessage(err, "Failed to update deal."));
    } finally {
      setDealSaving(false);
    }
  };

  const handleQuickDealStatusChange = async (newStatus: DealStatus) => {
    if (!selectedDealId || !selectedDealDetail) return;
    try {
      const updated = await updateDeal(selectedDealId, { status: newStatus });
      setSelectedDealDetail(updated);
      setDeals((prev) => prev.map((d) => (d.id === updated.id ? { ...d, status: updated.status } : d)));
    } catch (err: any) {
      alert(getApiErrorMessage(err, "Failed to update deal status."));
    }
  };

  const handleDeleteDealConfirm = async () => {
    if (!deletingDealConfirmId) return;
    setDeleteDealLoading(true);
    try {
      await deleteDeal(deletingDealConfirmId);
      setDeals((prev) => prev.filter((d) => d.id !== deletingDealConfirmId));
      if (selectedDealId === deletingDealConfirmId) {
        setSelectedDealId(null);
        setSelectedDealDetail(null);
      }
      setDeletingDealConfirmId(null);
    } catch (err: any) {
      alert(getApiErrorMessage(err, "Failed to delete deal."));
    } finally {
      setDeleteDealLoading(false);
    }
  };

  const handleUploadDealDocSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDealId || !selectedDealDocFile) {
      setUploadDealDocError("Please select a file to upload.");
      return;
    }
    setUploadingDealDoc(true);
    setUploadDealDocError(null);
    try {
      const newDoc = await uploadDealDocument(
        selectedDealId,
        selectedDealDocFile,
        uploadDocTitle.trim() || selectedDealDocFile.name,
        uploadDocCategory
      );
      if (selectedDealDetail) {
        setSelectedDealDetail({
          ...selectedDealDetail,
          documents: [newDoc, ...(selectedDealDetail.documents || [])],
        });
      }
      setDeals((prev) =>
        prev.map((d) => (d.id === selectedDealId ? { ...d, document_count: (d.document_count || 0) + 1 } : d))
      );
      setUploadDocModalOpen(false);
      setUploadDocTitle("");
      setSelectedDealDocFile(null);
    } catch (err: any) {
      setUploadDealDocError(getApiErrorMessage(err, "Failed to upload deal document. Max size is 15MB."));
    } finally {
      setUploadingDealDoc(false);
    }
  };

  const handleDownloadDealDoc = async (doc: DealDocumentDto) => {
    if (!selectedDealId) return;
    try {
      await downloadDealDocument(selectedDealId, doc.id, doc.original_filename);
    } catch (err: any) {
      alert(getApiErrorMessage(err, "Could not open document. Please try again."));
    }
  };

  const handleDeleteDealDocConfirm = async () => {
    if (!selectedDealId || !deletingDealDocId) return;
    setDeleteDealDocLoading(true);
    try {
      await deleteDealDocument(selectedDealId, deletingDealDocId);
      if (selectedDealDetail) {
        setSelectedDealDetail({
          ...selectedDealDetail,
          documents: (selectedDealDetail.documents || []).filter((d) => d.id !== deletingDealDocId),
        });
      }
      setDeals((prev) =>
        prev.map((d) =>
          d.id === selectedDealId ? { ...d, document_count: Math.max(0, (d.document_count || 1) - 1) } : d
        )
      );
      setDeletingDealDocId(null);
    } catch (err: any) {
      alert(getApiErrorMessage(err, "Could not delete document."));
    } finally {
      setDeleteDealDocLoading(false);
    }
  };

  useEffect(() => {
    if (authToken) {
      loadDashboardData();
    }
  }, [authToken]);

  // ─── Authentication Handlers ────────────────────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError(null);
    try {
      const tokens = await loginBroker(loginEmail, loginPassword);
      setToken(tokens.access_token);
      setActiveTab("dashboard");
    } catch (err: any) {
      console.error("Broker login error:", err);
      setAuthError(getApiErrorMessage(err, "Authentication failed. Please verify broker credentials."));
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    clearAuthToken();
    setToken(null);
    setDashboardStats(null);
    setProperties([]);
    setEnquiries([]);
    setSubmissions([]);
    setDeals([]);
    setSelectedDealId(null);
    setSelectedDealDetail(null);
    setActiveTab("dashboard");
  };

  // ─── Add Property Photo Selection ──────────────────────────────────────────
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const newFiles = Array.from(e.target.files);
    setSelectedPhotos((prev) => [...prev, ...newFiles]);

    const newPreviews = newFiles.map((file) => URL.createObjectURL(file));
    setPhotoPreviews((prev) => [...prev, ...newPreviews]);
  };

  const handleRemovePhoto = (index: number) => {
    setSelectedPhotos((prev) => prev.filter((_, i) => i !== index));
    setPhotoPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  // ─── Create Property Handler ───────────────────────────────────────────────
  const handleCreateProperty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProp.title.trim() || !newProp.locality.trim() || !newProp.price || newProp.price <= 0) {
      setAddPropError("Please fill in Property Title, Locality, and a valid Price.");
      return;
    }
    setAddPropLoading(true);
    setAddPropError(null);
    setAddPropSuccess(null);

    try {
      const payload: PropertyCreateDto = {
        ...newProp,
        title: newProp.title.trim(),
        locality: newProp.locality.trim(),
        village: newProp.village?.trim() || undefined,
        taluka: newProp.taluka?.trim() || undefined,
        full_address: newProp.full_address?.trim() || undefined,
        description: newProp.description?.trim() || undefined,
        price: Number(newProp.price),
        bedrooms: newProp.bedrooms ? Number(newProp.bedrooms) : undefined,
        bathrooms: newProp.bathrooms ? Number(newProp.bathrooms) : undefined,
        area_sqft: newProp.area_sqft ? Number(newProp.area_sqft) : undefined,
      };

      const res = await createProperty(payload);
      const propertyId = res.id;

      // If photos were selected, upload them now
      if (selectedPhotos.length > 0) {
        try {
          await uploadPropertyImages(propertyId, selectedPhotos);
        } catch (uploadErr) {
          console.error("Photos uploaded with warning:", uploadErr);
        }
      }

      setAddPropSuccess({ id: propertyId, title: newProp.title });
      // Reset form to clean blank state
      setNewProp({
        title: "",
        property_type: "flat",
        listing_type: "sale",
        price: 0,
        price_negotiable: true,
        locality: "",
        village: "",
        taluka: "",
        region: "north_goa",
        bedrooms: 0,
        bathrooms: 0,
        area_sqft: 0,
        description: "",
        furnished: "furnished",
        possession_status: "ready_to_move",
        connectivity_score: 8,
        is_featured: false,
        status: "active",
        nri_eligible: true,
        fema_compliant: true,
        amenities: ["Reserved Parking", "24/7 Security"],
      });
      setSelectedPhotos([]);
      setPhotoPreviews([]);

      // Refresh properties
      const updated = await fetchProperties({ limit: 100 });
      setProperties(updated.results || []);
    } catch (err: any) {
      console.error("Create property error:", err);
      if (err?.response?.status === 401) {
        clearAuthToken();
        setToken(null);
        setAuthError("Your broker session expired. Please sign in again to add properties.");
        return;
      }
      setAddPropError(getApiErrorMessage(err, "Failed to create property. Please verify all required fields."));
    } finally {
      setAddPropLoading(false);
    }
  };

  // ─── Edit Property Handler ─────────────────────────────────────────────────
  const handleOpenEditProperty = async (prop: PropertyCardDto) => {
    setEditingProperty(prop);
    setEditForm({
      title: prop.title,
      property_type: prop.property_type,
      listing_type: prop.listing_type,
      price: prop.price,
      locality: prop.locality,
      village: prop.village || "",
      taluka: prop.taluka || "",
      region: prop.region || "north_goa",
      bedrooms: prop.bedrooms,
      bathrooms: prop.bathrooms,
      area_sqft: prop.area_sqft,
      status: prop.status,
      is_featured: prop.is_featured,
    });
    setEditFeedback(null);
    setPropertyDocuments([]);
    setLoadingPropertyDocs(true);
    try {
      const docs = await fetchPropertySellerDocuments(prop.id);
      setPropertyDocuments(docs || []);
    } catch (err) {
      console.error("Error loading property seller documents:", err);
    } finally {
      setLoadingPropertyDocs(false);
    }
  };

  const handleSaveEditProperty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProperty) return;
    setEditSaving(true);
    setEditFeedback(null);
    try {
      const updated = await updateProperty(editingProperty.id, editForm);
      setProperties((prev) =>
        prev.map((p) => (p.id === editingProperty.id ? { ...p, ...updated } : p))
      );
      setEditFeedback({ type: "success", message: "Property updated successfully." });
      setTimeout(() => {
        setEditingProperty(null);
      }, 1000);
    } catch (err: any) {
      console.error("Save edit property error:", err);
      setEditFeedback({
        type: "error",
        message: getApiErrorMessage(err, "Failed to save property changes."),
      });
    } finally {
      setEditSaving(false);
    }
  };

  // ─── Property Row Actions ──────────────────────────────────────────────────
  const handleToggleFeatured = async (property: PropertyCardDto) => {
    try {
      const nextFeatured = !property.is_featured;
      await updateProperty(property.id, { is_featured: nextFeatured });
      setProperties((prev) =>
        prev.map((p) => (p.id === property.id ? { ...p, is_featured: nextFeatured } : p))
      );
    } catch (err) {
      console.error("Toggle featured error:", err);
    }
  };

  const handleUpdateStatus = async (property: PropertyCardDto, newStatus: PropertyStatus) => {
    try {
      await updateProperty(property.id, { status: newStatus });
      setProperties((prev) =>
        prev.map((p) => (p.id === property.id ? { ...p, status: newStatus } : p))
      );
    } catch (err) {
      console.error("Update status error:", err);
    }
  };

  const handleDeletePropertyConfirm = async () => {
    if (!deletingPropId) return;
    setDeleteLoading(true);
    try {
      await deleteProperty(deletingPropId);
      setProperties((prev) => prev.filter((p) => p.id !== deletingPropId));
      setDeletingPropId(null);
    } catch (err) {
      console.error("Delete property error:", err);
    } finally {
      setDeleteLoading(false);
    }
  };

  // ─── Filtered Properties ───────────────────────────────────────────────────
  const filteredProperties = useMemo(() => {
    return properties.filter((p) => {
      const query = (globalSearchQuery || propSearch).trim().toLowerCase();
      if (query) {
        const matches =
          p.title?.toLowerCase().includes(query) ||
          p.locality?.toLowerCase().includes(query) ||
          p.village?.toLowerCase().includes(query);
        if (!matches) return false;
      }
      if (propTypeFilter !== "all" && p.property_type !== propTypeFilter) return false;
      if (propListingFilter !== "all" && p.listing_type !== propListingFilter) return false;
      if (propStatusFilter !== "all" && p.status !== propStatusFilter) return false;
      if (propFeaturedFilter === "featured" && !p.is_featured) return false;
      if (propFeaturedFilter === "standard" && p.is_featured) return false;
      return true;
    });
  }, [properties, propSearch, globalSearchQuery, propTypeFilter, propListingFilter, propStatusFilter, propFeaturedFilter]);

  // ─── Filtered Enquiries & Visits ───────────────────────────────────────────
  const filteredEnquiries = useMemo(() => {
    const sourceList = enquiryArchiveView === "archived" ? archivedEnquiries : enquiries;
    return sourceList.filter((e) => {
      const query = globalSearchQuery.trim().toLowerCase();
      if (query) {
        const matches =
          e.buyer_name?.toLowerCase().includes(query) ||
          e.buyer_email?.toLowerCase().includes(query) ||
          e.buyer_phone?.toLowerCase().includes(query) ||
          e.property_title?.toLowerCase().includes(query);
        if (!matches) return false;
      }
      if (enquiryStatusFilter !== "all" && e.status !== enquiryStatusFilter) return false;
      if (enquiryNriFilter === "nri" && !e.is_nri) return false;
      if (enquiryNriFilter === "domestic" && e.is_nri) return false;
      return true;
    });
  }, [enquiries, archivedEnquiries, enquiryArchiveView, enquiryStatusFilter, enquiryNriFilter, globalSearchQuery]);

  const scheduledVisits = useMemo(() => {
    return enquiries.filter((e) => {
      const isVisitStatus = e.status === "site_visit";
      const hasFollowUp = Boolean(e.follow_up_date);
      const isVisitMsg =
        e.message &&
        (e.message.toLowerCase().includes("visit") ||
          e.message.toLowerCase().includes("walkthrough") ||
          e.message.toLowerCase().includes("schedule") ||
          e.message.toLowerCase().includes("tour"));
      return isVisitStatus || hasFollowUp || isVisitMsg;
    });
  }, [enquiries]);

  // ─── Filtered Submissions ──────────────────────────────────────────────────
  const filteredSubmissions = useMemo(() => {
    return submissions.filter((s) => {
      const query = globalSearchQuery.trim().toLowerCase();
      if (query) {
        const matches =
          s.seller_name?.toLowerCase().includes(query) ||
          s.seller_email?.toLowerCase().includes(query) ||
          s.seller_phone?.toLowerCase().includes(query) ||
          s.locality?.toLowerCase().includes(query);
        if (!matches) return false;
      }
      if (submissionFilter !== "all" && s.status !== submissionFilter) return false;
      return true;
    });
  }, [submissions, submissionFilter, globalSearchQuery]);

  // ─── Filtered Sellers ──────────────────────────────────────────────────────
  const filteredSellers = useMemo(() => {
    return sellers.filter((s) => {
      const query = (sellerSearch || globalSearchQuery).trim().toLowerCase();
      if (!query) return true;
      return (
        s.full_name?.toLowerCase().includes(query) ||
        s.email?.toLowerCase().includes(query) ||
        s.phone?.toLowerCase().includes(query)
      );
    });
  }, [sellers, sellerSearch, globalSearchQuery]);

  // ─── Filtered Deals & Vault ────────────────────────────────────────────────
  const filteredDeals = useMemo(() => {
    return deals.filter((d) => {
      const query = (dealSearch || globalSearchQuery).trim().toLowerCase();
      if (query) {
        const matches =
          d.deal_number?.toLowerCase().includes(query) ||
          d.title?.toLowerCase().includes(query) ||
          d.buyer_name?.toLowerCase().includes(query) ||
          d.seller_name?.toLowerCase().includes(query) ||
          d.property_title?.toLowerCase().includes(query);
        if (!matches) return false;
      }
      if (dealStatusFilter !== "all" && d.status !== dealStatusFilter) return false;
      return true;
    });
  }, [deals, dealSearch, dealStatusFilter, globalSearchQuery]);

  const activeDealsCount = useMemo(() => {
    return deals.filter((d) => d.status !== "completed" && d.status !== "cancelled").length;
  }, [deals]);

  const filteredDealDocuments = useMemo(() => {
    if (!selectedDealDetail || !selectedDealDetail.documents) return [];
    if (dealDocCategoryFilter === "all") return selectedDealDetail.documents;
    return selectedDealDetail.documents.filter((doc) => doc.category === dealDocCategoryFilter);
  }, [selectedDealDetail, dealDocCategoryFilter]);

  // ─── Chronological Real Activity Feed ──────────────────────────────────────
  const recentActivities = useMemo(() => {
    const acts: {
      id: string;
      icon: React.ReactNode;
      title: string;
      subtitle: string;
      timeStr: string;
      badgeColor: string;
      onClickTab?: ActiveTab;
    }[] = [];

    // Recent enquiries
    enquiries.forEach((e) => {
      acts.push({
        id: `enq-${e.id}`,
        icon: <MessageSquare className="size-4 text-blue-600" />,
        title: `New enquiry from ${e.buyer_name}`,
        subtitle: `Interested in ${e.property_title || "Goa property"} · Status: ${formatLeadStatusLabel(e.status)}`,
        timeStr: e.created_at,
        badgeColor: "bg-blue-50 text-blue-700",
        onClickTab: "enquiries",
      });
    });

    // Recent submissions
    submissions.forEach((s) => {
      acts.push({
        id: `sub-${s.id}`,
        icon: <Inbox className="size-4 text-amber-600" />,
        title: `Seller submission from ${s.seller_name}`,
        subtitle: `${s.property_type} in ${s.locality} · Status: ${formatSubmissionStatusLabel(s.status)}`,
        timeStr: s.created_at,
        badgeColor: "bg-amber-50 text-amber-700",
        onClickTab: "submissions",
      });
    });

    // Recent properties
    properties.forEach((p) => {
      acts.push({
        id: `prop-${p.id}`,
        icon: <Building2 className="size-4 text-[#17805B]" />,
        title: `Property listed: ${p.title}`,
        subtitle: `${formatPriceINR(p.price, p.listing_type)} in ${p.locality}`,
        timeStr: p.created_at,
        badgeColor: "bg-emerald-50 text-[#17805B]",
        onClickTab: "properties",
      });
    });

    // Sort by timestamp desc
    return acts
      .sort((a, b) => new Date(b.timeStr).getTime() - new Date(a.timeStr).getTime())
      .slice(0, 6);
  }, [enquiries, submissions, properties]);

  // ─── Lead Update Handler ───────────────────────────────────────────────────
  const handleSaveLead = async () => {
    if (!selectedEnquiry) return;
    setLeadSaving(true);
    setLeadFeedback(null);
    try {
      await updateEnquiry(selectedEnquiry.id, {
        status: leadStatusVal,
        broker_notes: leadNotesVal,
        follow_up_date: leadFollowUpVal || undefined,
      });
      setEnquiries((prev) =>
        prev.map((e) =>
          e.id === selectedEnquiry.id
            ? { ...e, status: leadStatusVal, broker_notes: leadNotesVal, follow_up_date: leadFollowUpVal || null }
            : e
        )
      );
      setLeadFeedback({ type: "success", message: "Lead updated successfully." });
      setTimeout(() => setSelectedEnquiry(null), 1000);
    } catch (err: any) {
      console.error("Update lead error:", err);
      setLeadFeedback({ type: "error", message: getApiErrorMessage(err, "Failed to update lead.") });
    } finally {
      setLeadSaving(false);
    }
  };

  const handleArchiveEnquiryAction = async (enquiryId: string) => {
    try {
      await archiveEnquiry(enquiryId);
      const target = enquiries.find((e) => e.id === enquiryId);
      setEnquiries((prev) => prev.filter((e) => e.id !== enquiryId));
      if (target) {
        setArchivedEnquiries((prev) => [{ ...target, is_archived: true }, ...prev]);
      }
      if (selectedEnquiry?.id === enquiryId) {
        setSelectedEnquiry(null);
      }
      setEnquiryArchiveConfirmId(null);
    } catch (err) {
      console.error("Archive enquiry error:", err);
    }
  };

  const handleUnarchiveEnquiryAction = async (enquiryId: string) => {
    try {
      await unarchiveEnquiry(enquiryId);
      const target = archivedEnquiries.find((e) => e.id === enquiryId);
      setArchivedEnquiries((prev) => prev.filter((e) => e.id !== enquiryId));
      if (target) {
        setEnquiries((prev) => [{ ...target, is_archived: false }, ...prev]);
      }
    } catch (err) {
      console.error("Unarchive enquiry error:", err);
    }
  };

  const handleSwitchEnquiryView = async (view: "active" | "archived") => {
    setEnquiryArchiveView(view);
    if (view === "archived" && archivedEnquiries.length === 0) {
      setLoadingArchived(true);
      try {
        const res = await fetchEnquiries({ is_archived: true, limit: 100 });
        setArchivedEnquiries(res || []);
      } catch (err) {
        console.error("Fetch archived enquiries error:", err);
      } finally {
        setLoadingArchived(false);
      }
    }
  };

  // ─── AI Valuation Estimator Handler ─────────────────────────────────────────
  const handleEstimatePrice = async (e: React.FormEvent) => {
    e.preventDefault();
    setValuationLoading(true);
    setValuationError(null);
    try {
      const res = await estimatePropertyPrice({
        ...valuationForm,
        area_sqft: Number(valuationForm.area_sqft),
        bedrooms: Number(valuationForm.bedrooms || 0),
        age_years: Number(valuationForm.age_years || 0),
        beach_distance_km: Number(valuationForm.beach_distance_km || 0),
        mopa_airport_km: Number(valuationForm.mopa_airport_km || 0),
        floor_number: Number(valuationForm.floor_number || 0),
      });
      setValuationResult(res);

      // Auto-refresh history log from database
      const hist = await fetchValuationHistory();
      setValuationHistory(hist || []);
    } catch (err: any) {
      console.error("Valuation error:", err);
      setValuationError(getApiErrorMessage(err, "Failed to compute valuation estimate."));
    } finally {
      setValuationLoading(false);
    }
  };

  const handleRefreshValuationHistory = async () => {
    setHistoryLoading(true);
    try {
      const hist = await fetchValuationHistory();
      setValuationHistory(hist || []);
    } catch (err) {
      console.error("Valuation history error:", err);
    } finally {
      setHistoryLoading(false);
    }
  };

  // ─── Business Profile Save Handler ─────────────────────────────────────────
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaving(true);
    setProfileFeedback(null);
    try {
      const updated = await updateBusinessProfile({
        broker_name: profileForm.broker_name?.trim(),
        broker_role: profileForm.broker_role?.trim(),
        company_name: profileForm.company_name?.trim(),
        phone: profileForm.phone?.trim(),
        whatsapp_number: profileForm.whatsapp_number?.trim(),
        email: profileForm.email?.trim(),
        office_address: profileForm.office_address?.trim(),
        facebook_url: profileForm.facebook_url?.trim() || null,
        instagram_url: profileForm.instagram_url?.trim() || null,
        olx_url: profileForm.olx_url?.trim() || null,
      });
      setProfileForm(updated);
      await refreshGlobalBusinessProfile();
      setProfileFeedback({
        type: "success",
        message: "Business profile and contact channels saved successfully to database.",
      });
    } catch (err: any) {
      console.error("Profile save error:", err);
      setProfileFeedback({
        type: "error",
        message: getApiErrorMessage(err, "Failed to update business profile."),
      });
    } finally {
      setProfileSaving(false);
    }
  };

  // ─── Submission Convert / Review Handlers ──────────────────────────────────
  const handleConvertSubmission = async (sub: SellerSubmissionDto) => {
    setSubSaving(true);
    setSubFeedback(null);
    try {
      await reviewSubmission(sub.id, {
        status: "listed",
        broker_notes: subBrokerNotes || "Verified by Kassim Shaikh. Converted to live listing.",
      });
      setSubmissions((prev) =>
        prev.map((s) =>
          s.id === sub.id ? { ...s, status: "listed", broker_notes: subBrokerNotes } : s
        )
      );
      setSubFeedback({
        type: "success",
        message: "Submission accepted & converted to live property listing!",
      });
      const updatedProps = await fetchProperties({ limit: 100 });
      setProperties(updatedProps.results || []);
      setTimeout(() => setSelectedSubmission(null), 1200);
    } catch (err: any) {
      console.error("Convert submission error:", err);
      setSubFeedback({
        type: "error",
        message: getApiErrorMessage(err, "Failed to convert submission."),
      });
    } finally {
      setSubSaving(false);
    }
  };

  const handleRejectSubmission = async (sub: SellerSubmissionDto) => {
    setSubSaving(true);
    setSubFeedback(null);
    try {
      await reviewSubmission(sub.id, {
        status: "rejected",
        rejection_reason: subRejectionReason || "Listing criteria not met.",
      });
      setSubmissions((prev) =>
        prev.map((s) =>
          s.id === sub.id
            ? { ...s, status: "rejected", rejection_reason: subRejectionReason }
            : s
        )
      );
      setSubFeedback({
        type: "success",
        message: "Submission marked as rejected.",
      });
      setTimeout(() => setSelectedSubmission(null), 1200);
    } catch (err: any) {
      console.error("Reject submission error:", err);
      setSubFeedback({
        type: "error",
        message: getApiErrorMessage(err, "Failed to update submission status."),
      });
    } finally {
      setSubSaving(false);
    }
  };

  // ─── Active Counts for Badges ──────────────────────────────────────────────
  const pendingSubmissionsCount = submissions.filter((s) => s.status === "pending").length;
  const newLeadsCount = enquiries.filter((e) => e.status === "new").length;
  const totalNotifications = pendingSubmissionsCount + newLeadsCount;

  // ─── IF NOT AUTHENTICATED: CLEAN LOGIN SCREEN (SPLIT DESIGN) ──────────────
  if (!authToken) {
    return (
      <div className="min-h-screen bg-[#F4F1EA] flex flex-col justify-between font-sans p-4 sm:p-6 lg:p-8">
        {/* Top Header */}
        <header className="max-w-[1140px] w-full mx-auto flex items-center justify-between py-2">
          <Link to="/" className="flex items-center">
            <AshiyanaLogo dark={true} className="h-[44px] object-contain" />
          </Link>
          <Link
            to="/"
            className="text-[12.5px] font-semibold text-[#172124]/80 hover:text-[#172124] flex items-center gap-1.5 px-4 py-2 rounded-full border border-[#EDE8E0] bg-white hover:bg-[#FAF7F2] transition-colors"
          >
            <span>Back to Public Site</span>
            <ExternalLink className="size-3.5" />
          </Link>
        </header>

        {/* Main Split Card */}
        <main className="flex-1 flex items-center justify-center my-6">
          <div className="w-full max-w-[1140px] bg-white rounded-[32px] border border-[#EDE8E0] shadow-xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[640px]">
            
            {/* Left Column: Visual Dashboard Preview & Metrics (Dark Luxury) */}
            <div className="lg:col-span-6 bg-gradient-to-br from-[#172124] via-[#1E2B2F] to-[#111719] text-white p-7 sm:p-10 flex flex-col justify-between relative overflow-hidden m-3.5 rounded-[24px]">
              
              {/* Background Glow Blobs */}
              <div className="absolute -top-24 -left-24 size-80 rounded-full bg-[#C9AD86]/15 blur-3xl pointer-events-none" />
              <div className="absolute -bottom-24 -right-24 size-80 rounded-full bg-[#8B7D68]/15 blur-3xl pointer-events-none" />

              {/* Top Branding Tag */}
              <div className="relative z-10 flex items-center justify-between">
                <span className="text-[11px] font-mono font-semibold uppercase tracking-[0.2em] text-[#C9AD86] flex items-center gap-2">
                  <span className="size-2 rounded-full bg-[#C9AD86] animate-pulse" />
                  Ashiyana Broker Desk
                </span>
                <span className="text-[11px] font-mono text-white/50">Goa, IN</span>
              </div>

              {/* Center Floating Analytics Graphic (Inspired by reference) */}
              <div className="relative z-10 my-8 flex flex-col items-center">
                
                {/* Floating Badge Top Right */}
                <div className="self-end mr-2 -mb-5 z-20 bg-white/95 backdrop-blur-md text-[#172124] rounded-[16px] p-3.5 shadow-xl border border-white/60 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="flex items-center justify-between gap-4 text-[11px] text-[#717A7D]">
                    <span className="font-semibold uppercase tracking-wider text-[#8B7D68] text-[10px]">Monthly Sales</span>
                    <span className="text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded-full text-[10px]">↗ +18%</span>
                  </div>
                  <div className="text-[18px] font-display font-bold text-[#172124] mt-0.5">
                    ₹24.50 Cr
                  </div>
                </div>

                {/* Main Overview Card with Mini Bar Chart */}
                <div className="w-full bg-white/10 backdrop-blur-md rounded-[22px] border border-white/15 p-5 sm:p-6 shadow-2xl text-white">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="size-8 rounded-[10px] bg-white/10 flex items-center justify-center">
                        <TrendingUp className="size-4 text-[#C9AD86]" />
                      </div>
                      <div>
                        <span className="text-[11px] uppercase tracking-wider text-white/60 font-mono block">Portfolio Overview</span>
                        <span className="text-[20px] font-display font-bold text-white tracking-tight">₹180.00 Cr</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-[10.5px] text-white/70">
                      <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-[#C9AD86]" /> Villas</span>
                      <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-sky-400" /> Estates</span>
                    </div>
                  </div>

                  {/* Simulated Chart Bars */}
                  <div className="pt-3 flex items-end justify-between gap-2.5 h-[90px] border-t border-white/10">
                    {[
                      { label: "Mon", v1: 45, v2: 65 },
                      { label: "Tue", v1: 70, v2: 50 },
                      { label: "Wed", v1: 90, v2: 75 },
                      { label: "Thu", v1: 60, v2: 85 },
                      { label: "Fri", v1: 100, v2: 95 },
                      { label: "Sat", v1: 80, v2: 60 },
                    ].map((bar, idx) => (
                      <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                        <div className="w-full flex items-end justify-center gap-1 h-[70px]">
                          <div
                            style={{ height: `${bar.v1}%` }}
                            className="w-2.5 sm:w-3 rounded-t-sm bg-[#C9AD86]/90 transition-all"
                          />
                          <div
                            style={{ height: `${bar.v2}%` }}
                            className="w-2.5 sm:w-3 rounded-t-sm bg-sky-400/80 transition-all"
                          />
                        </div>
                        <span className="text-[9.5px] font-mono text-white/50">{bar.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Floating Badge Bottom Left */}
                <div className="self-start ml-2 -mt-5 z-20 bg-white/95 backdrop-blur-md text-[#172124] rounded-[16px] p-3.5 shadow-xl border border-white/60 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="flex items-center gap-2 text-[11px] text-[#717A7D]">
                    <span className="size-2 rounded-full bg-emerald-500" />
                    <span className="font-semibold text-[#172124] text-[12px]">14 Active Buyer Enquiries</span>
                  </div>
                  <span className="text-[10px] text-[#8B7D68] block mt-0.5">Assagao • Anjuna • Candolim</span>
                </div>

              </div>

              {/* Bottom Testimonial / Broker Endorsement (Matching Reference) */}
              <div className="relative z-10 pt-4 border-t border-white/10 flex flex-col gap-3">
                <p className="text-[12.5px] text-white/80 italic leading-relaxed">
                  "Ashiyana has completely transformed how I manage high-ticket luxury villas in Goa. Seller deeds, leads, and client walkthroughs are seamlessly organized."
                </p>
                <div className="flex items-center gap-3">
                  <div className="size-9 rounded-full bg-[#C9AD86] text-[#172124] font-bold text-[13px] flex items-center justify-center border border-white/30 shrink-0">
                    KS
                  </div>
                  <div className="flex flex-col">
                    <span className="font-semibold text-[13px] text-white">Kassim Shaikh</span>
                    <span className="text-[11px] text-[#C9AD86]">Founder & Lead Broker · Ashiyana Real Estate</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Right Column: Clean Form Layout (Matching Reference) */}
            <div className="lg:col-span-6 p-8 sm:p-12 lg:p-14 flex flex-col justify-center">
              
              <div className="max-w-[380px] mx-auto w-full flex flex-col gap-6">
                
                {/* Header Icon + Title */}
                <div className="flex flex-col items-center text-center">
                  <div className="size-12 rounded-full bg-[#FAF7F2] border border-[#EDE8E0] flex items-center justify-center text-[#C9AD86] mb-3">
                    <Sparkles className="size-6" />
                  </div>
                  <h1 className="text-[26px] sm:text-[28px] font-display font-bold text-[#172124] tracking-tight leading-snug">
                    Manage your properties with clarity
                  </h1>
                  <p className="text-[13.5px] text-[#717A7D] mt-1.5 leading-relaxed">
                    Enter your email and password to access the executive broker desk.
                  </p>
                </div>

                {authError && (
                  <div className="p-3.5 rounded-[14px] bg-red-50 border border-red-200 text-red-700 text-[13px] flex items-start gap-2.5">
                    <AlertCircle className="size-4 shrink-0 text-red-600 mt-0.5" />
                    <span>{authError}</span>
                  </div>
                )}

                <form onSubmit={handleLogin} className="flex flex-col gap-4">
                  <div>
                    <label className="block text-[12px] font-semibold text-[#172124] mb-1.5">
                      Email
                    </label>
                    <input
                      type="email"
                      required
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      className="w-full px-4 py-3 rounded-[14px] border border-[#EDE8E0] bg-[#FAF7F2] text-[13.5px] text-[#172124] placeholder:text-[#A49E93] focus:outline-none focus:border-[#172124] focus:bg-white transition-all font-sans"
                      placeholder="example@ashiyana.com"
                    />
                  </div>

                  <div>
                    <label className="block text-[12px] font-semibold text-[#172124] mb-1.5">
                      Password
                    </label>
                    <div className="relative">
                      <input
                        type={showLoginPassword ? "text" : "password"}
                        required
                        autoComplete="current-password"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-4 pr-11 py-3 rounded-[14px] border border-[#EDE8E0] bg-[#FAF7F2] text-[13.5px] text-[#172124] placeholder:text-[#A49E93] focus:outline-none focus:border-[#172124] focus:bg-white transition-all font-sans"
                      />
                      <button
                        type="button"
                        onClick={() => setShowLoginPassword((prev) => !prev)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#717A7D] hover:text-[#172124] p-1 cursor-pointer transition-colors"
                        aria-label={showLoginPassword ? "Hide password" : "Show password"}
                      >
                        {showLoginPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[12.5px] pt-1">
                    <label className="flex items-center gap-2 cursor-pointer text-[#717A7D] hover:text-[#172124]">
                      <input
                        type="checkbox"
                        defaultChecked
                        className="size-4 rounded accent-[#172124]"
                      />
                      <span>Remember this device</span>
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={authLoading}
                    className="w-full py-3.5 rounded-full text-white font-semibold text-[14px] transition-all hover:bg-[#2C383C] active:scale-98 disabled:opacity-50 mt-2 shadow-md cursor-pointer flex items-center justify-center gap-2 bg-[#172124]"
                  >
                    <span>{authLoading ? "Authenticating..." : "Sign In to Portal"}</span>
                    <ChevronRight className="size-4" />
                  </button>
                </form>

                <div className="pt-2 text-center text-[12px] text-[#717A7D]">
                  Need broker access credentials?{" "}
                  <Link to="/contact" className="text-[#172124] font-semibold underline hover:text-[#8B7D68]">
                    Contact Administrator
                  </Link>
                </div>

              </div>

            </div>

          </div>
        </main>

        {/* Footer */}
        <footer className="max-w-[1140px] w-full mx-auto py-2 text-center text-[11.5px] text-[#8B7D68] font-mono">
          Ashiyana Real Estate · Executive Desk · Goa, India
        </footer>
      </div>
    );
  }

  // ─── AUTHENTICATED BROKER WORKSPACE ────────────────────────────────────────
  return (
    <div className="min-h-screen bg-white flex flex-col md:flex-row font-sans text-[#172124]">
      
      {/* ─── SIDEBAR NAVIGATION (Desktop: Deep Charcoal & Collapsible) ───── */}
      <aside
        className={`hidden md:flex flex-col bg-[#172124] text-white h-screen sticky top-0 z-30 border-r border-white/5 shadow-md transition-all duration-200 ease-in-out shrink-0 ${
          sidebarCollapsed ? "w-[72px]" : "w-[260px]"
        }`}
      >
        {/* Brand & Toggle Header */}
        <div className="px-4 pt-5 pb-3 flex items-center justify-between border-b border-white/5">
          {!sidebarCollapsed ? (
            <Link to="/" className="flex items-center" title="Return to Ashiyana Home">
              <AshiyanaLogo dark={false} className="h-[46px] object-contain max-w-[170px]" />
            </Link>
          ) : (
            <Link to="/" className="mx-auto" title="Ashiyana Real Estate">
              <div className="size-9 rounded-[10px] bg-white/10 flex items-center justify-center font-bold text-white text-sm">
                A
              </div>
            </Link>
          )}

          <button
            onClick={toggleSidebar}
            className={`p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors cursor-pointer ${
              sidebarCollapsed ? "mx-auto mt-2" : ""
            }`}
            title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {sidebarCollapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
          </button>
        </div>

        {/* Online Status Pill */}
        {!sidebarCollapsed && (
          <div className="px-5 pt-3 pb-1">
            <div className="flex items-center gap-2 bg-white/[0.04] px-3 py-1 rounded-full border border-white/10 w-fit">
              <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] font-mono font-bold tracking-wider text-[#C9AD86] uppercase">
                Broker Desk · Online
              </span>
            </div>
          </div>
        )}

        {/* Broker Profile Card */}
        <div className="px-3 py-2">
          {!sidebarCollapsed ? (
            <div className="p-3 rounded-[14px] bg-white/[0.04] border border-white/5 flex items-center gap-3">
              <div className="size-[38px] rounded-full bg-[#243034] text-[#C9AD86] border border-[#C9AD86]/30 flex items-center justify-center font-bold text-[13px] shrink-0 shadow-xs">
                KS
              </div>
              <div className="flex flex-col overflow-hidden">
                <span className="text-[13px] font-semibold text-white truncate leading-tight">
                  {globalBusinessProfile.broker_name || "Kassim Shaikh"}
                </span>
                <span className="text-[11px] text-[#A6B0B3] truncate mt-0.5 font-mono">
                  {globalBusinessProfile.broker_role || "Lead Broker & Founder"}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex justify-center py-1">
              <div
                className="size-[38px] rounded-full bg-[#243034] text-[#C9AD86] border border-[#C9AD86]/30 flex items-center justify-center font-bold text-[13px] shadow-xs"
                title={`${globalBusinessProfile.broker_name || "Kassim Shaikh"} (${globalBusinessProfile.broker_role || "Lead Broker"})`}
              >
                KS
              </div>
            </div>
          )}
        </div>

        {/* Navigation Items with Real Database Counts */}
        <nav className="flex-1 px-2.5 py-2 flex flex-col gap-1 overflow-y-auto no-scrollbar">
          {[
            { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard className="size-4" /> },
            { id: "properties", label: "All Properties", icon: <Building2 className="size-4" />, badge: properties.length },
            { id: "add-property", label: "Add Property", icon: <PlusCircle className="size-4" /> },
            {
              id: "submissions",
              label: "Seller Submissions",
              icon: <Inbox className="size-4" />,
              badge: pendingSubmissionsCount,
            },
            {
              id: "sellers",
              label: "Sellers Management",
              icon: <ShieldCheck className="size-4" />,
              badge: sellers.length,
            },
            {
              id: "deals",
              label: "Deals & Vault",
              icon: <FolderKey className="size-4" />,
              badge: activeDealsCount,
            },
            {
              id: "enquiries",
              label: "Leads & Enquiries",
              icon: <Users className="size-4" />,
              badge: newLeadsCount,
            },
            {
              id: "visits",
              label: "Scheduled Visits",
              icon: <Calendar className="size-4" />,
              badge: scheduledVisits.length,
            },
            {
              id: "valuation",
              label: "Property Valuation",
              icon: <Calculator className="size-4" />,
              badge: valuationHistory.length > 0 ? valuationHistory.length : undefined,
            },
            { id: "profile", label: "Profile & Settings", icon: <Settings className="size-4" /> },
          ].map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as ActiveTab)}
                title={sidebarCollapsed ? `${item.label}${item.badge ? ` (${item.badge})` : ""}` : undefined}
                className={`w-full flex items-center ${
                  sidebarCollapsed ? "justify-center px-0 py-2.5" : "justify-between px-3.5 py-2.5"
                } rounded-[10px] text-[13px] font-medium transition-all cursor-pointer relative ${
                  isActive
                    ? "bg-white/[0.08] text-white font-semibold border-l-[3px] border-[#C9AD86] shadow-2xs"
                    : "text-[#A6B0B3] hover:bg-white/[0.04] hover:text-white"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className={isActive ? "text-[#C9AD86]" : "text-[#A6B0B3]"}>{item.icon}</span>
                  {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
                </div>

                {!sidebarCollapsed && item.badge !== undefined && item.badge > 0 && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10.5px] font-bold ${
                      isActive ? "bg-[#C9AD86] text-[#172124]" : "bg-white/10 text-white/80"
                    }`}
                  >
                    {item.badge}
                  </span>
                )}

                {sidebarCollapsed && item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute top-1.5 right-2 size-2 rounded-full bg-[#C9AD86]" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-white/5 flex flex-col gap-1.5">
          <Link
            to="/"
            title="Public Website"
            className={`flex items-center ${
              sidebarCollapsed ? "justify-center p-2" : "justify-between px-3 py-2"
            } rounded-[8px] text-[12px] font-medium text-[#A6B0B3] hover:bg-white/[0.04] hover:text-white transition-colors`}
          >
            <div className="flex items-center gap-2">
              <Home className="size-4 text-[#A6B0B3]" />
              {!sidebarCollapsed && <span>Public Website</span>}
            </div>
            {!sidebarCollapsed && <ExternalLink className="size-3 text-white/40" />}
          </Link>
          <button
            onClick={handleLogout}
            title="Sign Out"
            className={`w-full flex items-center ${
              sidebarCollapsed ? "justify-center p-2" : "px-3 py-2 gap-2"
            } rounded-[8px] text-[12px] font-medium text-red-400/80 hover:bg-red-500/10 hover:text-red-300 transition-colors cursor-pointer`}
          >
            <LogOut className="size-4" />
            {!sidebarCollapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* ─── MOBILE TOP BAR ───────────────────────────────────────────────── */}
      <div className="md:hidden bg-white border-b border-[#EDE8E0] px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        <Link to="/">
          <AshiyanaLogo dark={true} className="h-[38px] object-contain" />
        </Link>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab("add-property")}
            className="px-3.5 py-1.5 rounded-full text-white text-[12px] font-semibold flex items-center gap-1 shadow-xs bg-[#172124] hover:bg-[#2C383C]"
          >
            <Plus className="size-3.5" />
            <span>Add</span>
          </button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="size-9 rounded-[8px] border border-[#EDE8E0] flex items-center justify-center text-[#172124] cursor-pointer"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="size-4.5" /> : <Menu className="size-4.5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu (Deep Charcoal) */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#172124] text-white border-b border-white/10 p-4 flex flex-col gap-2 sticky top-[57px] z-40 shadow-xl animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-3 p-3 rounded-[12px] bg-white/5 border border-white/10 mb-2">
            <div className="size-9 rounded-full bg-[#243034] text-[#C9AD86] border border-[#C9AD86]/30 flex items-center justify-center font-bold text-sm">
              KS
            </div>
            <div>
              <p className="font-semibold text-[13.5px] text-white leading-tight">
                {globalBusinessProfile.broker_name || "Kassim Shaikh"}
              </p>
              <p className="text-[11px] text-[#A6B0B3] mt-0.5 font-mono">
                {globalBusinessProfile.broker_role || "Lead Broker"}
              </p>
            </div>
          </div>

          {[
            { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard className="size-4" /> },
            { id: "properties", label: "All Properties", icon: <Building2 className="size-4" />, badge: properties.length },
            { id: "add-property", label: "Add Property", icon: <PlusCircle className="size-4" /> },
            { id: "submissions", label: "Seller Submissions", icon: <Inbox className="size-4" />, badge: pendingSubmissionsCount },
            { id: "sellers", label: "Sellers Management", icon: <ShieldCheck className="size-4" />, badge: sellers.length },
            { id: "deals", label: "Deals & Vault", icon: <FolderKey className="size-4" />, badge: activeDealsCount },
            { id: "enquiries", label: "Leads & Enquiries", icon: <Users className="size-4" />, badge: newLeadsCount },
            { id: "visits", label: "Scheduled Visits", icon: <Calendar className="size-4" />, badge: scheduledVisits.length },
            { id: "valuation", label: "Property Valuation", icon: <Calculator className="size-4" />, badge: valuationHistory.length > 0 ? valuationHistory.length : undefined },
            { id: "profile", label: "Profile & Settings", icon: <Settings className="size-4" /> },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id as ActiveTab);
                setMobileMenuOpen(false);
              }}
              className={`flex items-center justify-between px-3.5 py-2.5 rounded-[8px] text-[13.5px] font-medium transition-colors ${
                activeTab === item.id
                  ? "bg-white/[0.08] text-white font-semibold border-l-[3px] border-[#C9AD86]"
                  : "text-[#A6B0B3] hover:bg-white/5"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className={activeTab === item.id ? "text-[#C9AD86]" : "text-[#A6B0B3]"}>{item.icon}</span>
                <span>{item.label}</span>
              </div>
              {item.badge !== undefined && item.badge > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-white/10 text-white">
                  {item.badge}
                </span>
              )}
            </button>
          ))}

          <div className="pt-2 mt-2 border-t border-white/10 flex items-center justify-between">
            <Link
              to="/"
              className="text-[13px] text-[#A6B0B3] hover:text-white flex items-center gap-1.5"
            >
              <ExternalLink className="size-3.5" />
              <span>Public Website</span>
            </Link>
            <button
              onClick={handleLogout}
              className="text-[13px] text-red-400/80 hover:text-red-300 flex items-center gap-1"
            >
              <LogOut className="size-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}

      {/* ─── MAIN CONTENT AREA ────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto bg-[#FAF7F2]">
        
        {/* Top Action Header Bar */}
        <header className="bg-white border-b border-[#EDE8E0] px-6 py-4 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-20 shadow-2xs">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-[20px] sm:text-[22px] font-display font-bold text-[#172124] leading-tight tracking-tight">
                {activeTab === "dashboard" && "Dashboard Overview"}
                {activeTab === "properties" && "Property Management"}
                {activeTab === "add-property" && "Add New Property"}
                {activeTab === "submissions" && "Seller Submissions Queue"}
                {activeTab === "sellers" && "Registered Sellers CRM"}
                {activeTab === "enquiries" && "Leads & Enquiries CRM"}
                {activeTab === "visits" && "Scheduled Client Visits"}
                {activeTab === "profile" && "Broker Profile & Settings"}
              </h1>
              <p className="text-[12.5px] text-[#717A7D]">
                Welcome back, {globalBusinessProfile.broker_name || "Kassim Shaikh"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-1 justify-end max-w-xl">
            {/* Global Search Input */}
            <div className="relative min-w-[200px] flex-1 max-w-[320px]">
              <input
                type="text"
                placeholder="Search anything..."
                value={globalSearchQuery}
                onChange={(e) => setGlobalSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-full border border-[#EDE8E0] bg-[#FAF7F2] text-[13px] text-[#172124] placeholder:text-[#9A948B] focus:outline-none focus:border-[#172124] focus:bg-white transition-all font-sans"
              />
              <Search className="absolute left-3 top-2.5 size-4 text-[#717A7D]" />
              {globalSearchQuery && (
                <button
                  onClick={() => setGlobalSearchQuery("")}
                  className="absolute right-3 top-2.5 text-[#717A7D] hover:text-[#172124]"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>

            {/* Notification Bell */}
            <button
              onClick={() => {
                if (pendingSubmissionsCount > 0) setActiveTab("submissions");
                else if (newLeadsCount > 0) setActiveTab("enquiries");
              }}
              className="relative p-2 rounded-full border border-[#EDE8E0] text-[#717A7D] hover:bg-[#FAF7F2] hover:text-[#172124] transition-colors cursor-pointer"
              title={`${totalNotifications} pending notifications`}
            >
              <Bell className="size-4" />
              {totalNotifications > 0 && (
                <span className="absolute -top-1 -right-1 size-4.5 rounded-full bg-[#B45309] text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white">
                  {totalNotifications}
                </span>
              )}
            </button>

            {/* Refresh Data */}
            <button
              onClick={loadDashboardData}
              disabled={loadingStats || loadingProps}
              className="p-2 sm:px-4 sm:py-2 rounded-full border border-[#EDE8E0] text-[12.5px] font-semibold text-[#172124] hover:bg-[#FAF7F2] transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
              title="Refresh database records"
            >
              <RefreshCw className={`size-4 ${loadingStats ? "animate-spin text-[#172124]" : ""}`} />
              <span className="hidden sm:inline">{loadingStats ? "Refreshing..." : "Refresh"}</span>
            </button>

            {/* Add Property Quick Action */}
            {activeTab !== "add-property" && (
              <button
                onClick={() => setActiveTab("add-property")}
                className="px-4 py-2 rounded-full text-white text-[13px] font-semibold transition-all hover:bg-[#243236] flex items-center gap-1.5 shadow-2xs shrink-0 cursor-pointer bg-[#172124]"
              >
                <Plus className="size-4" />
                <span className="hidden sm:inline">Add Property</span>
              </button>
            )}
          </div>
        </header>

        {/* Tab Body View */}
        <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] w-full mx-auto flex flex-col gap-6">
          
          {/* ══════════════════════════════════════════════════════════════════
              TAB 1: DASHBOARD OVERVIEW (DEEP CHARCOAL & WARM ACCENTS)
          ══════════════════════════════════════════════════════════════════ */}
          {activeTab === "dashboard" && (
            <div className="flex flex-col gap-6 animate-in fade-in duration-200">
              
              {/* Hero / Welcome Panel (Deep Charcoal & Champagne Gold Tag) */}
              <div className="bg-[#172124] text-white rounded-[16px] border border-white/10 p-6 sm:p-7 flex flex-col md:flex-row items-start md:items-center justify-between gap-5 shadow-xs relative overflow-hidden">
                <div className="flex flex-col gap-1.5 relative z-10">
                  <span className="text-[#C4A66A] text-[11px] font-bold tracking-wider uppercase">
                    Ashiyana Real Estate CRM
                  </span>
                  <h2 className="text-[24px] sm:text-[28px] font-semibold text-[#F7F7F4] leading-tight">
                    {getTimeGreeting()}, {globalBusinessProfile.broker_name?.split(" ")[0] || "Kassim"}!
                  </h2>
                  <p className="text-[13.5px] text-[#A6B0B3] max-w-[560px]">
                    Here's what's happening with your real estate business today.
                  </p>
                  <div className="flex flex-wrap items-center gap-3 text-[12px] text-white/80 font-medium mt-1">
                    <span>
                      <strong className="text-[#F7F7F4]">
                        {dashboardStats?.total_active_listings ?? properties.filter((p) => p.status === "active").length}
                      </strong> active properties
                    </span>
                    <span className="text-white/30">•</span>
                    <span>
                      <strong className="text-[#F7F7F4]">
                        {enquiries.filter((e) => e.status === "new").length}
                      </strong> new enquiries
                    </span>
                    <span className="text-white/30">•</span>
                    <span>
                      <strong className="text-[#C4A66A]">
                        {pendingSubmissionsCount}
                      </strong> submissions pending review
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 relative z-10 shrink-0">
                  <button
                    onClick={() => setActiveTab("add-property")}
                    className="px-6 py-3 rounded-full text-[#172124] font-semibold text-[13.5px] transition-all hover:bg-[#DFCCA8] shadow-sm flex items-center gap-1.5 cursor-pointer bg-[#C9AD86]"
                  >
                    <Plus className="size-4" />
                    <span>Add New Property</span>
                  </button>
                </div>
              </div>

              {/* 6 Real Database KPI Cards */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5 sm:gap-4">
                {[
                  {
                    label: "Active Properties",
                    value:
                      dashboardStats?.total_active_listings ??
                      properties.filter((p) => p.status === "active").length,
                    subtext: "Verified live",
                    icon: <Building2 className="size-4 text-[#17805B]" />,
                    iconBg: "bg-emerald-50 text-[#17805B]",
                    onClick: () => {
                      setPropStatusFilter("active");
                      setActiveTab("properties");
                    },
                  },
                  {
                    label: "Inactive / Draft",
                    value: properties.filter((p) => p.status !== "active").length,
                    subtext: "Archived / draft",
                    icon: <FileText className="size-4 text-slate-500" />,
                    iconBg: "bg-slate-100 text-slate-600",
                    onClick: () => {
                      setPropStatusFilter("inactive");
                      setActiveTab("properties");
                    },
                  },
                  {
                    label: "Seller Submissions",
                    value: pendingSubmissionsCount,
                    subtext: pendingSubmissionsCount > 0 ? "Pending review" : "Up to date",
                    icon: <Inbox className="size-4 text-[#8B7D68]" />,
                    iconBg: "bg-[#FAF7F2] text-[#8B7D68]",
                    onClick: () => setActiveTab("submissions"),
                  },
                  {
                    label: "New Enquiries",
                    value: newLeadsCount,
                    subtext: newLeadsCount > 0 ? "Needs response" : "Followed up",
                    icon: <Bell className="size-4 text-[#1D4ED8]" />,
                    iconBg: "bg-blue-50 text-[#1D4ED8]",
                    onClick: () => setActiveTab("enquiries"),
                  },
                  {
                    label: "Follow-ups Due",
                    value: enquiries.filter((e) => e.follow_up_date).length,
                    subtext: "Scheduled",
                    icon: <Clock className="size-4 text-[#7E22CE]" />,
                    iconBg: "bg-purple-50 text-[#7E22CE]",
                    onClick: () => setActiveTab("enquiries"),
                  },
                  {
                    label: "Scheduled Visits",
                    value: scheduledVisits.length,
                    subtext: "Client tours",
                    icon: <Calendar className="size-4 text-[#0369A1]" />,
                    iconBg: "bg-sky-50 text-[#0369A1]",
                    onClick: () => setActiveTab("visits"),
                  },
                ].map((kpi, idx) => (
                  <div
                    key={idx}
                    onClick={kpi.onClick}
                    className="bg-white rounded-[20px] border border-[#EDE8E0] p-5 shadow-xs hover:border-[#172124]/30 hover:shadow-sm transition-all cursor-pointer flex flex-col justify-between gap-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11.5px] font-semibold text-[#8B7D68] uppercase tracking-wider truncate">
                        {kpi.label}
                      </span>
                      <div className={`size-7 rounded-lg ${kpi.iconBg} flex items-center justify-center shrink-0`}>
                        {kpi.icon}
                      </div>
                    </div>
                    <div>
                      <span className="text-[28px] font-display font-bold text-[#172124] leading-none block">
                        {kpi.value}
                      </span>
                      <span className="text-[12px] text-[#717A7D] block mt-1.5 truncate">
                        {kpi.subtext}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* 2-Column Split: Recently Added Properties (60%) & Recent Activity (40%) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Left Column: Recently Added Properties (7 of 12 Cols) */}
                <div className="lg:col-span-7 bg-white rounded-[24px] border border-[#EDE8E0] p-6 sm:p-7 flex flex-col gap-4 shadow-xs">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-[18px] font-display font-bold text-[#172124] tracking-tight">
                        Recently Added Properties
                      </h3>
                      <p className="text-[13px] text-[#717A7D] mt-0.5">
                        Latest listings in your Ashiyana inventory
                      </p>
                    </div>
                    <button
                      onClick={() => setActiveTab("properties")}
                      className="text-[13px] font-semibold text-[#172124] hover:text-[#8B7D68] cursor-pointer flex items-center gap-1 transition-colors"
                    >
                      <span>View All</span>
                      <ArrowUpRight className="size-3.5" />
                    </button>
                  </div>

                  {properties.length === 0 ? (
                    <div className="py-12 text-center text-gray-400 border border-dashed border-[#EDE8E0] rounded-[16px] flex flex-col items-center gap-2">
                      <Building2 className="size-8 text-gray-300" />
                      <span className="text-[13.5px]">No properties added yet.</span>
                      <button
                        onClick={() => setActiveTab("add-property")}
                        className="text-[13px] text-[#172124] font-semibold hover:underline"
                      >
                        + Add your first property
                      </button>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-[13px]">
                        <thead>
                          <tr className="border-b border-[#EDE8E0] text-[#8B7D68] text-[11px] font-mono uppercase tracking-wider">
                            <th className="pb-3 font-semibold">Property</th>
                            <th className="pb-3 font-semibold">Location</th>
                            <th className="pb-3 font-semibold">Price</th>
                            <th className="pb-3 font-semibold">Type</th>
                            <th className="pb-3 font-semibold">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#EDE8E0]/60">
                          {properties.slice(0, 5).map((prop) => (
                            <tr key={prop.id} className="hover:bg-[#FAF7F2] transition-colors group">
                              <td className="py-3.5 pr-3">
                                <div className="flex items-center gap-3">
                                  {prop.thumbnail_url ? (
                                    <img
                                      src={prop.thumbnail_url}
                                      alt={prop.title}
                                      className="size-11 rounded-[10px] object-cover bg-gray-100 shrink-0 border border-[#EDE8E0]"
                                    />
                                  ) : (
                                    <div className="size-11 rounded-[10px] bg-gray-100 text-[#717A7D] flex items-center justify-center shrink-0 border border-[#EDE8E0] font-bold">
                                      <Building2 className="size-5" />
                                    </div>
                                  )}
                                  <div className="flex flex-col overflow-hidden">
                                    <span className="font-semibold text-[#172124] line-clamp-1 max-w-[200px] group-hover:text-[#8B7D68] transition-colors">
                                      {prop.title}
                                    </span>
                                    <span className="text-[11px] text-[#717A7D] capitalize">
                                      For {prop.listing_type}
                                    </span>
                                  </div>
                                </div>
                              </td>
                              <td className="py-3.5 text-[#717A7D]">{prop.locality}</td>
                              <td className="py-3.5 font-display font-bold text-[#172124]">
                                {formatPriceINR(prop.price, prop.listing_type)}
                              </td>
                              <td className="py-3.5 capitalize text-[#717A7D]">{prop.property_type}</td>
                              <td className="py-3.5">
                                <span
                                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                                    prop.status === "active"
                                      ? "bg-emerald-50 text-[#17805B] border border-emerald-200"
                                      : prop.status === "sold"
                                      ? "bg-blue-50 text-[#1D4ED8] border border-blue-200"
                                      : prop.status === "rented"
                                      ? "bg-amber-50 text-[#B45309] border border-amber-200"
                                      : "bg-gray-100 text-gray-700 border border-gray-200"
                                  }`}
                                >
                                  {prop.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Right Column: Recent Activity Feed (5 of 12 Cols) */}
                <div className="lg:col-span-5 bg-white rounded-[24px] border border-[#EDE8E0] p-6 sm:p-7 flex flex-col gap-4 shadow-xs">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-[18px] font-display font-bold text-[#172124] tracking-tight">
                        Recent Activity
                      </h3>
                      <p className="text-[13px] text-[#717A7D] mt-0.5">
                        Real-time client & listing updates
                      </p>
                    </div>
                    {recentActivities.length > 0 && (
                      <span className="text-[11px] font-mono font-semibold uppercase px-2.5 py-0.5 rounded-full bg-[#FAF7F2] border border-[#EDE8E0] text-[#8B7D68]">
                        Live Feed
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col gap-2.5">
                    {recentActivities.map((act) => (
                      <div
                        key={act.id}
                        onClick={() => act.onClickTab && setActiveTab(act.onClickTab)}
                        className={`flex items-start gap-3 p-3.5 rounded-[14px] bg-[#FAF7F2] border border-[#EDE8E0] hover:border-[#172124]/30 hover:bg-white transition-all ${
                          act.onClickTab ? "cursor-pointer" : ""
                        }`}
                      >
                        <div className="size-8 rounded-full bg-white border border-[#EDE8E0] flex items-center justify-center shrink-0 shadow-2xs mt-0.5">
                          {act.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[13px] font-semibold text-[#172124] truncate">
                              {act.title}
                            </span>
                            <span className="text-[11px] text-[#717A7D] whitespace-nowrap shrink-0">
                              {formatTimeAgo(act.timeStr)}
                            </span>
                          </div>
                          <span className="text-[12px] text-[#717A7D] line-clamp-1 block mt-0.5">
                            {act.subtitle}
                          </span>
                        </div>
                      </div>
                    ))}

                    {recentActivities.length === 0 && (
                      <div className="py-12 text-center text-gray-400 border border-dashed border-[#EDE8E0] rounded-[16px] flex flex-col items-center gap-2">
                        <Clock className="size-7 text-gray-300" />
                        <span className="text-[13px]">No recent activity recorded yet.</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              TAB 2: ALL PROPERTIES MANAGEMENT
          ══════════════════════════════════════════════════════════════════ */}
          {activeTab === "properties" && (
            <div className="flex flex-col gap-6 animate-in fade-in duration-200">
              
              {/* Toolbar & Filter Controls */}
              <div className="bg-white rounded-[24px] border border-[#EDE8E0] p-5 sm:p-6 flex flex-wrap items-center justify-between gap-4 shadow-xs">
                <div className="flex flex-wrap items-center gap-3 flex-1">
                  <div className="relative min-w-[220px] flex-1 max-w-[320px]">
                    <input
                      type="text"
                      placeholder="Search title, locality, village..."
                      value={propSearch}
                      onChange={(e) => setPropSearch(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 rounded-[12px] border border-[#EDE8E0] bg-[#FAF7F2] text-[13px] text-[#172124] placeholder:text-[#9A948B] focus:outline-none focus:border-[#172124] focus:bg-white transition-all font-sans"
                    />
                    <Search className="absolute left-3 top-3 size-4 text-[#717A7D]" />
                  </div>

                  <select
                    value={propTypeFilter}
                    onChange={(e) => setPropTypeFilter(e.target.value)}
                    className="px-3.5 py-2.5 rounded-[12px] border border-[#EDE8E0] bg-[#FAF7F2] text-[13px] capitalize text-[#172124] focus:border-[#172124] focus:bg-white"
                  >
                    <option value="all">All Types</option>
                    <option value="villa">Villas</option>
                    <option value="flat">Flats / Apartments</option>
                    <option value="penthouse">Penthouses</option>
                    <option value="studio">Studios</option>
                    <option value="plot">Plots</option>
                    <option value="commercial">Commercial</option>
                  </select>

                  <select
                    value={propListingFilter}
                    onChange={(e) => setPropListingFilter(e.target.value)}
                    className="px-3.5 py-2.5 rounded-[12px] border border-[#EDE8E0] bg-[#FAF7F2] text-[13px] text-[#172124] focus:border-[#172124] focus:bg-white"
                  >
                    <option value="all">All Purposes</option>
                    <option value="sale">For Sale</option>
                    <option value="rent">For Rent</option>
                  </select>

                  <select
                    value={propStatusFilter}
                    onChange={(e) => setPropStatusFilter(e.target.value)}
                    className="px-3.5 py-2.5 rounded-[12px] border border-[#EDE8E0] bg-[#FAF7F2] text-[13px] capitalize text-[#172124] focus:border-[#172124] focus:bg-white"
                  >
                    <option value="all">All Statuses</option>
                    <option value="active">Active (Published)</option>
                    <option value="inactive">Inactive (Draft)</option>
                    <option value="sold">Sold</option>
                    <option value="rented">Rented</option>
                  </select>

                  <select
                    value={propFeaturedFilter}
                    onChange={(e) => setPropFeaturedFilter(e.target.value)}
                    className="px-3.5 py-2.5 rounded-[12px] border border-[#EDE8E0] bg-[#FAF7F2] text-[13px] text-[#172124] focus:border-[#172124] focus:bg-white"
                  >
                    <option value="all">Featured & Standard</option>
                    <option value="featured">Featured Only</option>
                    <option value="standard">Standard Only</option>
                  </select>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-[12.5px] text-[#717A7D] font-medium">
                    {filteredProperties.length} properties found
                  </span>
                  <button
                    onClick={() => setActiveTab("add-property")}
                    className="px-5 py-2.5 rounded-full text-white text-[13px] font-semibold flex items-center gap-1.5 shadow-2xs cursor-pointer bg-[#172124] hover:bg-[#2C383C] transition-all"
                  >
                    <Plus className="size-4" />
                    <span>Add New</span>
                  </button>
                </div>
              </div>

              {/* Properties Data Table */}
              <div className="bg-white rounded-[24px] border border-[#EDE8E0] shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[13px]">
                    <thead className="bg-[#FAF7F2] border-b border-[#EDE8E0] text-[#8B7D68] text-[11px] font-mono uppercase tracking-wider">
                      <tr>
                        <th className="py-3.5 px-5 font-semibold">Property</th>
                        <th className="py-3.5 px-4 font-semibold">Locality</th>
                        <th className="py-3.5 px-4 font-semibold">Price</th>
                        <th className="py-3.5 px-4 font-semibold">Specs</th>
                        <th className="py-3.5 px-4 font-semibold">Watchers</th>
                        <th className="py-3.5 px-4 font-semibold">Status</th>
                        <th className="py-3.5 px-4 font-semibold">Featured</th>
                        <th className="py-3.5 px-5 text-right font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#EDE8E0]/60">
                      {filteredProperties.map((prop) => (
                        <tr key={prop.id} className="hover:bg-[#FAF7F2] transition-colors">
                          <td className="py-3.5 px-5">
                            <div className="flex items-center gap-3.5">
                              {prop.thumbnail_url ? (
                                <img
                                  src={prop.thumbnail_url}
                                  alt={prop.title}
                                  className="size-12 rounded-[10px] object-cover bg-gray-100 shrink-0 border border-[#EDE8E0]"
                                />
                              ) : (
                                <div className="size-12 rounded-[10px] bg-gray-100 text-[#717A7D] flex items-center justify-center shrink-0 border border-[#EDE8E0] font-bold">
                                  <Building2 className="size-5" />
                                </div>
                              )}
                              <div className="flex flex-col">
                                <span className="font-semibold text-[#172124] line-clamp-1 max-w-[240px]">
                                  {prop.title}
                                </span>
                                <span className="text-[11px] text-[#8B7D68] font-mono font-medium uppercase">
                                  {prop.property_type} • For {prop.listing_type}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-[#717A7D]">
                            {prop.locality}
                            {prop.village ? `, ${prop.village}` : ""}
                          </td>
                          <td className="py-3.5 px-4 font-display font-bold text-[#172124]">
                            {formatPriceINR(prop.price, prop.listing_type)}
                          </td>
                          <td className="py-3.5 px-4 text-[#717A7D]">
                            {prop.bedrooms ? `${prop.bedrooms} BHK` : ""}
                            {prop.area_sqft ? ` • ${prop.area_sqft} sqft` : ""}
                          </td>
                          <td className="py-3.5 px-4">
                            <button
                              type="button"
                              onClick={() => handleViewWatchers(prop)}
                              title="Click to view interested buyers"
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11.5px] font-semibold bg-amber-50 text-amber-900 border border-amber-200/80 hover:bg-amber-100 hover:border-amber-300 transition-colors cursor-pointer shadow-2xs"
                            >
                              <Eye className="size-3.5 text-amber-700" />
                              <span>{watcherSummaryMap[prop.id] ?? 0}</span>
                              <span className="text-[10px] text-amber-700 font-normal uppercase tracking-wider">
                                {(watcherSummaryMap[prop.id] ?? 0) === 1 ? "Watcher" : "Watchers"}
                              </span>
                            </button>
                          </td>
                          <td className="py-3.5 px-4">
                            <select
                              value={prop.status}
                              onChange={(e) => handleUpdateStatus(prop, e.target.value as PropertyStatus)}
                              className={`text-[11.5px] font-semibold px-3 py-1 rounded-full border focus:outline-none cursor-pointer ${
                                prop.status === "active"
                                  ? "bg-emerald-50 text-[#17805B] border-emerald-200"
                                  : prop.status === "sold"
                                  ? "bg-blue-50 text-[#1D4ED8] border-blue-200"
                                  : prop.status === "rented"
                                  ? "bg-amber-50 text-[#B45309] border-amber-200"
                                  : "bg-gray-100 text-gray-700 border-gray-200"
                              }`}
                            >
                              <option value="active">Active</option>
                              <option value="inactive">Inactive</option>
                              <option value="sold">Sold</option>
                              <option value="rented">Rented</option>
                            </select>
                          </td>
                          <td className="py-3.5 px-4">
                            <button
                              onClick={() => handleToggleFeatured(prop)}
                              className={`p-1.5 rounded-full transition-colors cursor-pointer ${
                                prop.is_featured
                                  ? "text-[#C9AD86] bg-[#FAF6EE]"
                                  : "text-gray-300 hover:text-[#C9AD86]"
                              }`}
                              title={prop.is_featured ? "Featured property" : "Mark as featured"}
                            >
                              <Star className={`size-4.5 ${prop.is_featured ? "fill-[#C9AD86]" : ""}`} />
                            </button>
                          </td>
                          <td className="py-3.5 px-5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => setManagingPhotosPropId(prop.id)}
                                className="p-2 rounded-[10px] border border-[#EDE8E0] text-[#717A7D] hover:text-[#172124] hover:bg-[#FAF7F2] transition-colors cursor-pointer"
                                title="Manage Photos"
                              >
                                <Camera className="size-4" />
                              </button>
                              <button
                                onClick={() => handleOpenEditProperty(prop)}
                                className="p-2 rounded-[10px] border border-[#EDE8E0] text-[#717A7D] hover:text-[#172124] hover:bg-[#FAF7F2] transition-colors cursor-pointer"
                                title="Edit Property Details"
                              >
                                <Edit3 className="size-4" />
                              </button>
                              <Link
                                to={`/property/${prop.id}`}
                                target="_blank"
                                className="p-2 rounded-[10px] border border-[#EDE8E0] text-[#717A7D] hover:text-[#172124] hover:bg-[#FAF7F2] transition-colors cursor-pointer"
                                title="View Public Listing"
                              >
                                <ExternalLink className="size-4" />
                              </Link>
                              <button
                                onClick={() => setDeletingPropId(prop.id)}
                                className="p-2 rounded-[10px] border border-[#EDE8E0] text-red-600 hover:bg-red-50 hover:border-red-300 transition-colors cursor-pointer"
                                title="Delete Property"
                              >
                                <Trash2 className="size-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {filteredProperties.length === 0 && (
                  <div className="p-12 text-center text-gray-400 flex flex-col items-center gap-2">
                    <Building2 className="size-8 text-gray-300" />
                    <span>No properties matched the selected filters.</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              TAB 3: ADD NEW PROPERTY (STRUCTURED PROFESSIONAL FORM)
          ══════════════════════════════════════════════════════════════════ */}
          {activeTab === "add-property" && (
            <div className="max-w-[880px] mx-auto w-full flex flex-col gap-6 animate-in fade-in duration-200">
              
              <div className="bg-white rounded-[24px] border border-[#EDE8E0] p-7 sm:p-9 shadow-xs flex flex-col gap-6">
                <div>
                  <span className="text-[11px] font-mono font-semibold uppercase tracking-[0.2em] text-[#8B7D68] block mb-1">
                    [ Inventory Management ]
                  </span>
                  <h2 className="text-[22px] font-display font-bold text-[#172124] tracking-tight">
                    Add New Property Listing
                  </h2>
                  <p className="text-[13.5px] text-[#717A7D] mt-0.5">
                    Create a verified Goa property listing in the Ashiyana PostgreSQL database.
                  </p>
                </div>

                {addPropSuccess && (
                  <div className="p-4 rounded-[14px] bg-emerald-50 border border-emerald-200 text-emerald-900 text-[13.5px] flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <CheckCircle2 className="size-5 text-[#17805B] shrink-0" />
                      <span>Property <strong>"{addPropSuccess.title}"</strong> created successfully!</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Link
                        to={`/property/${addPropSuccess.id}`}
                        target="_blank"
                        className="px-4 py-1.5 bg-[#172124] text-white rounded-full text-[12px] font-semibold flex items-center gap-1 hover:bg-[#2C383C]"
                      >
                        <span>View Live</span>
                        <ExternalLink className="size-3" />
                      </Link>
                    </div>
                  </div>
                )}

                {addPropError && (
                  <div className="p-4 rounded-[14px] bg-red-50 border border-red-200 text-red-700 text-[13.5px] flex items-start gap-2.5">
                    <AlertCircle className="size-5 text-red-600 shrink-0 mt-0.5" />
                    <span>{addPropError}</span>
                  </div>
                )}

                <form onSubmit={handleCreateProperty} className="flex flex-col gap-6">
                  
                  {/* Section 1: Property Details */}
                  <div className="border border-[#EDE8E0] rounded-[18px] p-6 flex flex-col gap-4 bg-[#FAF7F2]">
                    <h3 className="text-[12px] font-mono font-bold text-[#8B7D68] uppercase tracking-wider">
                      1. Property Details & Type
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="sm:col-span-2">
                        <label className="block text-[11.5px] font-semibold text-[#8B7D68] uppercase tracking-wider mb-1.5">
                          Property Title *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Ultra Luxury 4BHK Private Pool Villa in Assagao"
                          value={newProp.title}
                          onChange={(e) => setNewProp({ ...newProp, title: e.target.value })}
                          className="w-full px-4 py-2.5 rounded-[12px] border border-[#EDE8E0] bg-white text-[13.5px] text-[#172124] focus:outline-none focus:border-[#172124] font-sans"
                        />
                      </div>

                      <div>
                        <label className="block text-[11.5px] font-semibold text-[#8B7D68] uppercase tracking-wider mb-1.5">
                          Property Type *
                        </label>
                        <select
                          value={newProp.property_type}
                          onChange={(e) => setNewProp({ ...newProp, property_type: e.target.value as PropertyType })}
                          className="w-full px-4 py-2.5 rounded-[12px] border border-[#EDE8E0] bg-white text-[13.5px] capitalize text-[#172124] focus:outline-none focus:border-[#172124]"
                        >
                          <option value="villa">Luxury Villa</option>
                          <option value="flat">Apartment / Flat</option>
                          <option value="penthouse">Penthouse</option>
                          <option value="studio">Studio Apartment</option>
                          <option value="plot">Land / Plot</option>
                          <option value="commercial">Commercial Space</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11.5px] font-semibold text-[#8B7D68] uppercase tracking-wider mb-1.5">
                          Purpose *
                        </label>
                        <select
                          value={newProp.listing_type}
                          onChange={(e) => setNewProp({ ...newProp, listing_type: e.target.value as ListingType })}
                          className="w-full px-4 py-2.5 rounded-[12px] border border-[#EDE8E0] bg-white text-[13.5px] text-[#172124] focus:outline-none focus:border-[#172124]"
                        >
                          <option value="sale">For Sale (Outright Purchase)</option>
                          <option value="rent">For Rent (Long Term)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Section 2: Pricing */}
                  <div className="border border-[#EDE8E0] rounded-[18px] p-6 flex flex-col gap-4 bg-[#FAF7F2]">
                    <div className="flex items-center justify-between">
                      <h3 className="text-[12px] font-mono font-bold text-[#8B7D68] uppercase tracking-wider">
                        2. Pricing & Valuation
                      </h3>
                      {newProp.price > 0 && (
                        <span className="text-[13px] font-display font-bold text-[#172124] bg-white px-3.5 py-1 rounded-full border border-[#EDE8E0]">
                          {formatPriceINR(newProp.price, newProp.listing_type)}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[11.5px] font-semibold text-[#8B7D68] uppercase tracking-wider mb-1.5">
                          Price in Rupees (INR) *
                        </label>
                        <input
                          type="number"
                          required
                          min="1"
                          placeholder="e.g. 35000000 (3.5 Cr)"
                          value={newProp.price || ""}
                          onChange={(e) => setNewProp({ ...newProp, price: Number(e.target.value) })}
                          className="w-full px-4 py-2.5 rounded-[12px] border border-[#EDE8E0] bg-white text-[13.5px] font-semibold text-[#172124] focus:outline-none focus:border-[#172124]"
                        />
                      </div>

                      <div className="flex items-center gap-3 pt-6">
                        <label className="flex items-center gap-2 cursor-pointer text-[13px] text-[#172124]">
                          <input
                            type="checkbox"
                            checked={newProp.price_negotiable}
                            onChange={(e) => setNewProp({ ...newProp, price_negotiable: e.target.checked })}
                            className="size-4 rounded accent-[#172124]"
                          />
                          <span>Price is negotiable</span>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Section 3: Specifications */}
                  <div className="border border-[#E5E7E6] rounded-[14px] p-5 flex flex-col gap-4 bg-[#FAFAF8]">
                    <h3 className="text-[13px] font-bold text-[#172124] uppercase tracking-wider">
                      3. Property Specifications
                    </h3>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-[12px] font-medium text-[#172124] mb-1">Bedrooms</label>
                        <input
                          type="number"
                          min="0"
                          value={newProp.bedrooms || ""}
                          onChange={(e) => setNewProp({ ...newProp, bedrooms: Number(e.target.value) })}
                          placeholder="4"
                          className="w-full px-3 py-2 rounded-[10px] border border-[#E5E7E6] bg-white text-[13.5px]"
                        />
                      </div>
                      <div>
                        <label className="block text-[12px] font-medium text-[#172124] mb-1">Bathrooms</label>
                        <input
                          type="number"
                          min="0"
                          value={newProp.bathrooms || ""}
                          onChange={(e) => setNewProp({ ...newProp, bathrooms: Number(e.target.value) })}
                          placeholder="4"
                          className="w-full px-3 py-2 rounded-[10px] border border-[#E5E7E6] bg-white text-[13.5px]"
                        />
                      </div>
                      <div>
                        <label className="block text-[12px] font-medium text-[#172124] mb-1">Area (sqft)</label>
                        <input
                          type="number"
                          min="0"
                          value={newProp.area_sqft || ""}
                          onChange={(e) => setNewProp({ ...newProp, area_sqft: Number(e.target.value) })}
                          placeholder="3800"
                          className="w-full px-3 py-2 rounded-[10px] border border-[#E5E7E6] bg-white text-[13.5px]"
                        />
                      </div>
                      <div>
                        <label className="block text-[12px] font-medium text-[#172124] mb-1">Furnishing</label>
                        <select
                          value={newProp.furnished}
                          onChange={(e) => setNewProp({ ...newProp, furnished: e.target.value as any })}
                          className="w-full px-3 py-2 rounded-[10px] border border-[#E5E7E6] bg-white text-[13px]"
                        >
                          <option value="furnished">Furnished</option>
                          <option value="semi_furnished">Semi-Furnished</option>
                          <option value="unfurnished">Unfurnished</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Section 4: Location */}
                  <div className="border border-[#EDE8E0] rounded-[18px] p-6 flex flex-col gap-4 bg-[#FAF7F2]">
                    <h3 className="text-[12px] font-mono font-bold text-[#8B7D68] uppercase tracking-wider">
                      4. Goa Locality & Location
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-[11.5px] font-semibold text-[#8B7D68] uppercase tracking-wider mb-1.5">Locality *</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Assagao"
                          value={newProp.locality}
                          onChange={(e) => setNewProp({ ...newProp, locality: e.target.value })}
                          className="w-full px-4 py-2.5 rounded-[12px] border border-[#EDE8E0] bg-white text-[13.5px] text-[#172124] focus:outline-none focus:border-[#172124]"
                        />
                      </div>
                      <div>
                        <label className="block text-[11.5px] font-semibold text-[#8B7D68] uppercase tracking-wider mb-1.5">Village / Landmark</label>
                        <input
                          type="text"
                          placeholder="e.g. Badem"
                          value={newProp.village}
                          onChange={(e) => setNewProp({ ...newProp, village: e.target.value })}
                          className="w-full px-4 py-2.5 rounded-[12px] border border-[#EDE8E0] bg-white text-[13.5px] text-[#172124] focus:outline-none focus:border-[#172124]"
                        />
                      </div>
                      <div>
                        <label className="block text-[11.5px] font-semibold text-[#8B7D68] uppercase tracking-wider mb-1.5">Goa Region *</label>
                        <select
                          value={newProp.region}
                          onChange={(e) => setNewProp({ ...newProp, region: e.target.value as GoaRegion })}
                          className="w-full px-4 py-2.5 rounded-[12px] border border-[#EDE8E0] bg-white text-[13.5px] text-[#172124] focus:outline-none focus:border-[#172124]"
                        >
                          <option value="north_goa">North Goa (Coastal & Luxury)</option>
                          <option value="south_goa">South Goa (Heritage & Serene)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Section 5: Photos Multi-Upload */}
                  <div className="border border-[#EDE8E0] rounded-[18px] p-6 flex flex-col gap-4 bg-[#FAF7F2]">
                    <div className="flex items-center justify-between">
                      <h3 className="text-[12px] font-mono font-bold text-[#8B7D68] uppercase tracking-wider">
                        5. Property Photos ({selectedPhotos.length})
                      </h3>
                      <span className="text-[12px] text-[#717A7D]">
                        First photo will serve as the listing cover
                      </span>
                    </div>

                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handlePhotoSelect}
                      className="hidden"
                      id="broker-add-photos"
                    />

                    <label
                      htmlFor="broker-add-photos"
                      className="border-2 border-dashed border-[#EDE8E0] hover:border-[#172124] rounded-[16px] p-7 text-center cursor-pointer bg-white flex flex-col items-center gap-2.5 transition-colors"
                    >
                      <div className="size-11 rounded-full bg-[#FAF7F2] border border-[#EDE8E0] flex items-center justify-center text-[#8B7D68]">
                        <Camera className="size-5" />
                      </div>
                      <span className="text-[13.5px] font-semibold text-[#172124]">
                        Click to select property photos
                      </span>
                      <span className="text-[12px] text-[#717A7D]">
                        Upload high-res JPG, PNG, WEBP (up to 10 photos)
                      </span>
                    </label>

                    {photoPreviews.length > 0 && (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 pt-2">
                        {photoPreviews.map((preview, idx) => (
                          <div key={idx} className="relative aspect-[4/3] rounded-[12px] overflow-hidden border border-[#EDE8E0] group bg-gray-100">
                            <img src={preview} alt={`Upload ${idx}`} className="size-full object-cover" />
                            {idx === 0 && (
                              <span className="absolute top-1.5 left-1.5 px-2.5 py-0.5 rounded-full bg-[#172124] text-white text-[10px] font-mono font-bold uppercase">
                                Cover Photo
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => handleRemovePhoto(idx)}
                              className="absolute top-1.5 right-1.5 size-6 rounded-full bg-red-600 text-white flex items-center justify-center text-[12px] shadow-sm hover:bg-red-700 cursor-pointer"
                            >
                              &times;
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#EDE8E0]">
                    <button
                      type="submit"
                      disabled={addPropLoading}
                      className="px-8 py-3.5 rounded-full text-white font-semibold text-[14px] shadow-xs hover:bg-[#2C383C] disabled:opacity-50 flex items-center gap-2 cursor-pointer bg-[#172124]"
                    >
                      {addPropLoading ? (
                        <>
                          <RefreshCw className="size-4 animate-spin" />
                          <span>Publishing Property...</span>
                        </>
                      ) : (
                        <>
                          <Check className="size-4" />
                          <span>Publish Property Listing</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              TAB 4: SELLER SUBMISSIONS (CRM PIPELINE)
          ══════════════════════════════════════════════════════════════════ */}
          {activeTab === "submissions" && (
            <div className="flex flex-col gap-6 animate-in fade-in duration-200">
              
              {/* Filter Tabs */}
              <div className="bg-white rounded-[24px] border border-[#EDE8E0] p-5 flex flex-wrap items-center justify-between gap-4 shadow-xs">
                <div className="flex flex-wrap items-center gap-2">
                  {[
                    { id: "all", label: "All Submissions", count: submissions.length },
                    { id: "pending", label: "Pending Review", count: pendingSubmissionsCount },
                    { id: "reviewing", label: "Under Review", count: submissions.filter((s) => s.status === "reviewing").length },
                    { id: "listed", label: "Listed on Portal", count: submissions.filter((s) => s.status === "listed").length },
                    { id: "rejected", label: "Rejected", count: submissions.filter((s) => s.status === "rejected").length },
                  ].map((filter) => (
                    <button
                      key={filter.id}
                      onClick={() => setSubmissionFilter(filter.id)}
                      className={`px-4 py-2 rounded-full text-[12.5px] font-semibold transition-all cursor-pointer flex items-center gap-2 ${
                        submissionFilter === filter.id
                          ? "bg-[#172124] text-white shadow-xs"
                          : "text-[#717A7D] hover:bg-[#FAF7F2] hover:text-[#172124]"
                      }`}
                    >
                      <span>{filter.label}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10.5px] font-bold ${
                        submissionFilter === filter.id ? "bg-white/20 text-white" : "bg-[#FAF7F2] border border-[#EDE8E0] text-[#172124]"
                      }`}>
                        {filter.count}
                      </span>
                    </button>
                  ))}
                </div>

                <span className="text-[12.5px] text-[#717A7D] font-medium">
                  {filteredSubmissions.length} submissions shown
                </span>
              </div>

              {/* Submissions Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredSubmissions.map((sub) => (
                  <div
                    key={sub.id}
                    className="bg-white rounded-[24px] border border-[#EDE8E0] p-6 sm:p-7 flex flex-col justify-between gap-5 shadow-xs"
                  >
                    <div className="flex flex-col gap-3.5">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <span className="text-[11px] font-mono font-semibold uppercase tracking-[0.2em] text-[#8B7D68]">
                            {sub.property_type} • For {sub.listing_type}
                          </span>
                          <h3 className="font-display font-bold text-[19px] text-[#172124] mt-0.5">
                            {sub.locality}, Goa
                          </h3>
                        </div>
                        <span
                          className={`px-3 py-1 rounded-full text-[11.5px] font-semibold shrink-0 ${
                            sub.status === "listed"
                              ? "bg-emerald-50 text-[#17805B] border border-emerald-200"
                              : sub.status === "rejected"
                              ? "bg-red-50 text-red-700 border border-red-200"
                              : "bg-amber-50 text-[#B45309] border border-amber-200"
                          }`}
                        >
                          {formatSubmissionStatusLabel(sub.status)}
                        </span>
                      </div>

                      {/* Specs */}
                      <div className="flex flex-wrap items-center gap-3 text-[13px] text-[#717A7D]">
                        {sub.asking_price && (
                          <span className="font-display font-bold text-[#172124]">
                            ₹{(sub.asking_price / 10000000).toFixed(2)} Cr
                          </span>
                        )}
                        {sub.area_sqft && <span>• {sub.area_sqft} sqft</span>}
                        {sub.bedrooms && <span>• {sub.bedrooms} BHK</span>}
                        {sub.bathrooms && <span>• {sub.bathrooms} Baths</span>}
                      </div>

                      {/* Seller Contact Info */}
                      <div className="p-4 rounded-[14px] bg-[#FAF7F2] border border-[#EDE8E0] flex flex-col gap-1.5 text-[13px]">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-[#172124]">{sub.seller_name}</span>
                          <span className="text-[11.5px] text-[#8B7D68] font-mono">{formatTimeAgo(sub.created_at)}</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-[12.5px] text-[#717A7D]">
                          <a href={`tel:${sub.seller_phone}`} className="hover:text-[#172124] font-medium flex items-center gap-1">
                            <Phone className="size-3.5 text-[#8B7D68]" />
                            <span>{sub.seller_phone}</span>
                          </a>
                          <span>•</span>
                          <span>{sub.seller_email}</span>
                        </div>
                      </div>

                      {/* Multi-Image Gallery */}
                      {sub.image_urls && sub.image_urls.length > 0 ? (
                        <div className="flex flex-col gap-1.5">
                          <span className="text-[11px] font-semibold text-[#8B7D68] uppercase tracking-wider">
                            Uploaded Photos ({sub.image_urls.length})
                          </span>
                          <div className="grid grid-cols-4 gap-2.5">
                            {sub.image_urls.slice(0, 4).map((url, i) => (
                              <div
                                key={i}
                                onClick={() => setEnlargedImageUrl(url)}
                                className="relative aspect-[4/3] rounded-[10px] overflow-hidden border border-[#EDE8E0] cursor-pointer group bg-gray-100"
                              >
                                <img src={url} alt={`Submission photo ${i}`} className="size-full object-cover group-hover:scale-105 transition-transform" />
                                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                                  <Maximize2 className="size-3.5" />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <span className="text-[12px] text-gray-400 italic">No photos uploaded with this submission.</span>
                      )}

                      {sub.broker_notes && (
                        <div className="p-3 rounded-[12px] bg-[#FAF7F2] border border-[#EDE8E0] text-[12px] text-[#172124]">
                          <strong>Broker Note:</strong> {sub.broker_notes}
                        </div>
                      )}
                    </div>

                    {/* Review Actions */}
                    <div className="pt-4 border-t border-[#EDE8E0] flex items-center justify-between gap-3">
                      <a
                        href={`https://wa.me/${sub.seller_phone.replace(/\D/g, "")}?text=${encodeURIComponent(
                          `Hi ${sub.seller_name}, this is ${globalBusinessProfile.broker_name || "Kassim Shaikh"} from Ashiyana Real Estate regarding your property submission in ${sub.locality}.`
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 rounded-full border border-[#EDE8E0] hover:bg-[#FAF7F2] text-[12.5px] font-semibold text-[#172124] flex items-center gap-1.5 transition-colors"
                      >
                        <MessageSquare className="size-3.5 text-emerald-600" />
                        <span>WhatsApp Seller</span>
                      </a>

                      <button
                        onClick={() => {
                          setSelectedSubmission(sub);
                          setSubBrokerNotes(sub.broker_notes || "");
                          setSubRejectionReason(sub.rejection_reason || "");
                          setSubFeedback(null);
                        }}
                        className="px-5 py-2.5 rounded-full bg-[#172124] text-white font-semibold text-[13px] hover:bg-[#2C383C] transition-colors cursor-pointer shadow-xs"
                      >
                        Review & Decision
                      </button>
                    </div>
                  </div>
                ))}

                {filteredSubmissions.length === 0 && (
                  <div className="col-span-full py-16 text-center text-gray-400 bg-white rounded-[24px] border border-[#EDE8E0]">
                    No submissions found in this status category.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              TAB 5: REGISTERED SELLERS CRM
          ══════════════════════════════════════════════════════════════════ */}
          {activeTab === "sellers" && (
            <div className="flex flex-col gap-6 animate-in fade-in duration-200">
              
              <div className="bg-white p-6 sm:p-7 rounded-[24px] border border-[#EDE8E0] flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
                <div>
                  <h2 className="font-display font-bold text-[20px] text-[#172124] tracking-tight">
                    Registered Property Owners ({sellers.length})
                  </h2>
                  <p className="text-[13px] text-[#717A7D] mt-0.5">
                    Sellers with registered accounts. Review their submissions, properties, and uploaded title deeds.
                  </p>
                </div>

                <div className="relative min-w-[260px]">
                  <input
                    type="text"
                    placeholder="Search by name, email, phone..."
                    value={sellerSearch}
                    onChange={(e) => setSellerSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 rounded-[12px] border border-[#EDE8E0] bg-[#FAF7F2] text-[13px] text-[#172124] placeholder:text-[#9A948B] focus:outline-none focus:border-[#172124] focus:bg-white transition-all font-sans"
                  />
                  <Search className="absolute left-3 top-3 size-4 text-[#717A7D]" />
                </div>
              </div>

              <div className="bg-white rounded-[24px] border border-[#EDE8E0] shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[13px]">
                    <thead className="bg-[#FAF7F2] border-b border-[#EDE8E0] text-[#8B7D68] text-[11px] font-mono uppercase tracking-wider">
                      <tr>
                        <th className="py-3.5 px-5 font-semibold">Seller Name</th>
                        <th className="py-3.5 px-4 font-semibold">Contact</th>
                        <th className="py-3.5 px-4 font-semibold">Submissions</th>
                        <th className="py-3.5 px-4 font-semibold">Live Listings</th>
                        <th className="py-3.5 px-4 font-semibold">Document Vault</th>
                        <th className="py-3.5 px-4 font-semibold">Registered</th>
                        <th className="py-3.5 px-5 text-right font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#EDE8E0]/60">
                      {filteredSellers.map((s) => (
                        <tr key={s.id} className="hover:bg-[#FAF7F2] transition-colors">
                          <td className="py-3.5 px-5">
                            <div className="flex items-center gap-3">
                              <div className="size-9 rounded-full bg-[#FAF7F2] text-[#172124] font-bold text-[13px] flex items-center justify-center shrink-0 border border-[#EDE8E0]">
                                {s.full_name?.charAt(0).toUpperCase() || "S"}
                              </div>
                              <span className="font-semibold text-[#172124]">{s.full_name}</span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex flex-col text-[12.5px]">
                              <span className="text-[#172124]">{s.email}</span>
                              <span className="text-[#717A7D]">{s.phone || "No phone"}</span>
                            </div>
                          </td>
                          <td className="py-3.5 px-3">
                            <span className="px-2.5 py-0.5 rounded-full text-[11.5px] font-bold bg-amber-50 text-[#B45309]">
                              {s.submissions_count} submissions
                            </span>
                          </td>
                          <td className="py-3.5 px-3">
                            <span className="px-2.5 py-0.5 rounded-full text-[11.5px] font-bold bg-blue-50 text-[#1D4ED8]">
                              {s.listed_properties_count} live
                            </span>
                          </td>
                          <td className="py-3.5 px-3">
                            <span className="px-2.5 py-0.5 rounded-full text-[11.5px] font-bold bg-purple-50 text-[#7E22CE]">
                              {s.documents_count} deeds
                            </span>
                          </td>
                          <td className="py-3.5 px-3 text-[#717A7D] text-[12px]">
                            {new Date(s.created_at).toLocaleDateString()}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <button
                              onClick={() => handleOpenSellerDetail(s.id)}
                              className="px-3.5 py-1.5 rounded-full bg-[#172124] text-white text-[12px] font-semibold hover:bg-[#243236] transition-colors cursor-pointer"
                            >
                              Inspect Seller
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {filteredSellers.length === 0 && (
                  <div className="p-12 text-center text-gray-400">
                    No registered sellers found.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              TAB: DEALS & DOCUMENT VAULT
          ══════════════════════════════════════════════════════════════════ */}
          {activeTab === "deals" && (
            <div className="flex flex-col gap-6 animate-in fade-in duration-200">
              {selectedDealId && selectedDealDetail ? (
                /* ── DEAL DETAIL & DOCUMENT VAULT VIEW ── */
                <div className="flex flex-col gap-6">
                  {/* Top Bar / Navigation */}
                  <div className="bg-white rounded-[24px] border border-[#EDE8E0] p-5 sm:p-6 flex flex-wrap items-center justify-between gap-4 shadow-xs">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedDealId(null);
                          setSelectedDealDetail(null);
                        }}
                        className="px-4 py-2 rounded-full border border-[#EDE8E0] text-[12.5px] font-semibold text-[#172124] hover:bg-[#FAF7F2] transition-colors flex items-center gap-2 cursor-pointer"
                      >
                        <ArrowLeft className="size-3.5" />
                        <span>Back to Deals</span>
                      </button>
                      <span className="font-mono text-[12px] font-bold tracking-wider px-3 py-1 rounded-full bg-[#172124] text-[#C9AD86]">
                        {selectedDealDetail.deal_number}
                      </span>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <div className="flex items-center gap-2 bg-[#FAF7F2] border border-[#EDE8E0] px-3.5 py-1.5 rounded-full">
                        <span className="text-[11.5px] font-semibold text-[#8B7D68] uppercase tracking-wider">
                          Status:
                        </span>
                        <select
                          value={selectedDealDetail.status}
                          onChange={(e) => handleQuickDealStatusChange(e.target.value as DealStatus)}
                          className="bg-transparent text-[12.5px] font-bold text-[#172124] focus:outline-none cursor-pointer"
                        >
                          <option value="inquiry">Inquiry</option>
                          <option value="negotiation">Negotiation</option>
                          <option value="agreement">Agreement Signed</option>
                          <option value="completed">Closed Won</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </div>

                      <button
                        type="button"
                        onClick={() => setEditDealModalOpen(true)}
                        className="px-4 py-2 rounded-full border border-[#EDE8E0] text-[#172124] hover:bg-[#FAF7F2] text-[12.5px] font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Edit3 className="size-3.5 text-[#8B7D68]" />
                        <span>Edit Deal</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setDeletingDealConfirmId(selectedDealDetail.id)}
                        className="p-2 rounded-full border border-red-200 text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                        title="Delete Deal"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </div>

                  {/* Header Summary Banner */}
                  <div className="bg-white rounded-[24px] border border-[#EDE8E0] p-6 sm:p-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-2.5">
                        <span className={`px-3 py-1 rounded-full text-[11.5px] font-semibold border ${DEAL_STATUS_META[selectedDealDetail.status]?.bg || "bg-gray-50"} ${DEAL_STATUS_META[selectedDealDetail.status]?.text || "text-gray-700"} ${DEAL_STATUS_META[selectedDealDetail.status]?.border || "border-gray-200"}`}>
                          {DEAL_STATUS_META[selectedDealDetail.status]?.label || selectedDealDetail.status}
                        </span>
                        <span className="text-[12px] text-[#717A7D] font-mono">
                          Created {new Date(selectedDealDetail.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <h2 className="font-display font-bold text-[24px] sm:text-[28px] text-[#172124] tracking-tight">
                        {selectedDealDetail.title}
                      </h2>
                      <p className="text-[13.5px] text-[#717A7D]">
                        Target Closing: {selectedDealDetail.target_closing_date ? new Date(selectedDealDetail.target_closing_date).toLocaleDateString() : "Flexible / Not set"}
                        {selectedDealDetail.actual_closing_date && ` · Closed: ${new Date(selectedDealDetail.actual_closing_date).toLocaleDateString()}`}
                      </p>
                    </div>

                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                      <div className="bg-[#FAF7F2] border border-[#EDE8E0] rounded-[16px] p-4 text-center min-w-[140px]">
                        <span className="text-[10.5px] font-mono font-bold uppercase tracking-wider text-[#8B7D68] block">
                          Agreed Price
                        </span>
                        <span className="font-display font-bold text-[18px] text-[#172124]">
                          {selectedDealDetail.agreed_price ? formatPriceINR(selectedDealDetail.agreed_price) : "Pending"}
                        </span>
                      </div>
                      <div className="bg-[#FAF7F2] border border-[#EDE8E0] rounded-[16px] p-4 text-center min-w-[140px]">
                        <span className="text-[10.5px] font-mono font-bold uppercase tracking-wider text-[#8B7D68] block">
                          Broker Fee
                        </span>
                        <span className="font-display font-bold text-[18px] text-[#17805B]">
                          {selectedDealDetail.commission_amount
                            ? formatPriceINR(selectedDealDetail.commission_amount)
                            : selectedDealDetail.commission_rate
                            ? `${selectedDealDetail.commission_rate}%`
                            : "Standard"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 2-Column Layout: Commercials & Document Vault */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    {/* Left Column: Deal Info, Parties, Notes (5 cols) */}
                    <div className="lg:col-span-5 flex flex-col gap-6">
                      {/* Linked Property Card */}
                      {selectedDealDetail.property ? (
                        <div className="bg-white rounded-[24px] border border-[#EDE8E0] p-6 shadow-xs flex flex-col gap-4">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#8B7D68]">
                              Associated Property
                            </span>
                            <Link
                              to={`/property/${selectedDealDetail.property.id}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[12px] font-semibold text-[#172124] hover:text-[#8B7D68] flex items-center gap-1"
                            >
                              <span>View Listing</span>
                              <ExternalLink className="size-3" />
                            </Link>
                          </div>
                          <div className="flex items-center gap-3.5">
                            {selectedDealDetail.property.images && selectedDealDetail.property.images.length > 0 ? (
                              <img
                                src={selectedDealDetail.property.images[0].image_url}
                                alt={selectedDealDetail.property.title}
                                className="size-16 rounded-[14px] object-cover border border-[#EDE8E0] shrink-0"
                              />
                            ) : (
                              <div className="size-16 rounded-[14px] bg-[#FAF7F2] border border-[#EDE8E0] flex items-center justify-center text-[#8B7D68] shrink-0">
                                <Building2 className="size-6" />
                              </div>
                            )}
                            <div className="flex flex-col min-w-0">
                              <span className="text-[11px] font-semibold text-[#8B7D68] uppercase">
                                {selectedDealDetail.property.property_type} · {selectedDealDetail.property.locality}
                              </span>
                              <h4 className="font-display font-bold text-[15px] text-[#172124] truncate">
                                {selectedDealDetail.property.title}
                              </h4>
                              <span className="font-display font-bold text-[14px] text-[#17805B] mt-0.5">
                                {formatPriceINR(selectedDealDetail.property.price)}
                              </span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-white rounded-[24px] border border-dashed border-[#EDE8E0] p-5 text-center text-[13px] text-[#717A7D]">
                          No specific property attached to this deal.
                        </div>
                      )}

                      {/* Buyer & Seller Parties Card */}
                      <div className="bg-white rounded-[24px] border border-[#EDE8E0] p-6 shadow-xs flex flex-col gap-4">
                        <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#8B7D68]">
                          Deal Parties
                        </span>

                        <div className="flex flex-col gap-3">
                          {/* Buyer */}
                          <div className="p-4 rounded-[16px] bg-[#FAF7F2] border border-[#EDE8E0] flex flex-col gap-1">
                            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#8B7D68]">
                              Buyer
                            </span>
                            <span className="font-display font-bold text-[15px] text-[#172124]">
                              {selectedDealDetail.buyer_name || "Buyer name not recorded"}
                            </span>
                            {selectedDealDetail.buyer_contact && (
                              <span className="text-[12.5px] text-[#717A7D]">
                                {selectedDealDetail.buyer_contact}
                              </span>
                            )}
                          </div>

                          {/* Seller */}
                          <div className="p-4 rounded-[16px] bg-[#FAF7F2] border border-[#EDE8E0] flex flex-col gap-1">
                            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#8B7D68]">
                              Seller
                            </span>
                            <span className="font-display font-bold text-[15px] text-[#172124]">
                              {selectedDealDetail.seller_name || "Seller name not recorded"}
                            </span>
                            {selectedDealDetail.seller_contact && (
                              <span className="text-[12.5px] text-[#717A7D]">
                                {selectedDealDetail.seller_contact}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Broker Notes Card */}
                      <div className="bg-white rounded-[24px] border border-[#EDE8E0] p-6 shadow-xs flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#8B7D68]">
                            Confidential Broker Notes
                          </span>
                          <button
                            type="button"
                            onClick={() => setEditDealModalOpen(true)}
                            className="text-[12px] font-semibold text-[#172124] hover:underline"
                          >
                            Edit
                          </button>
                        </div>
                        <p className="text-[13px] text-[#717A7D] leading-relaxed bg-[#FAF7F2] p-4 rounded-[14px] border border-[#EDE8E0] whitespace-pre-wrap">
                          {selectedDealDetail.broker_notes || "No internal deal notes recorded. Click 'Edit' to document negotiations, client timelines, or legal checks."}
                        </p>
                      </div>
                    </div>

                    {/* Right Column: Deal Document Vault (7 cols) */}
                    <div className="lg:col-span-7 bg-white rounded-[24px] border border-[#EDE8E0] p-6 sm:p-7 shadow-xs flex flex-col gap-5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#EDE8E0]">
                        <div>
                          <div className="flex items-center gap-2 text-[#17805B] text-[12px] font-semibold">
                            <ShieldCheck className="size-4 text-[#17805B]" />
                            <span>Authenticated Cloudinary Storage</span>
                          </div>
                          <h3 className="font-display font-bold text-[20px] text-[#172124]">
                            Deal Document Vault
                          </h3>
                          <p className="text-[12.5px] text-[#717A7D]">
                            Private legal deeds, buyer KYC, and financial escrow proofs. Strictly broker-accessible.
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setUploadDocModalOpen(true);
                            setUploadDealDocError(null);
                          }}
                          className="px-4 py-2.5 rounded-full text-white font-semibold text-[13px] shadow-xs flex items-center gap-2 cursor-pointer shrink-0 bg-[#172124] hover:bg-[#2C383C]"
                        >
                          <UploadCloud className="size-4 text-[#C9AD86]" />
                          <span>Upload Document</span>
                        </button>
                      </div>

                      {/* Category Filter Pills */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        {[
                          { id: "all", label: "All Docs" },
                          { id: "property", label: "Property" },
                          { id: "seller", label: "Seller KYC" },
                          { id: "buyer", label: "Buyer Proofs" },
                          { id: "legal", label: "Legal Contracts" },
                          { id: "financial", label: "Financial" },
                          { id: "other", label: "Other" },
                        ].map((cat) => (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => setDealDocCategoryFilter(cat.id)}
                            className={`px-3 py-1.5 rounded-full text-[12px] font-semibold transition-all cursor-pointer ${
                              dealDocCategoryFilter === cat.id
                                ? "bg-[#172124] text-white shadow-xs"
                                : "bg-[#FAF7F2] text-[#717A7D] hover:text-[#172124] border border-[#EDE8E0]"
                            }`}
                          >
                            {cat.label}
                          </button>
                        ))}
                      </div>

                      {/* Documents List */}
                      <div className="flex flex-col gap-3">
                        {filteredDealDocuments.map((doc) => (
                          <div
                            key={doc.id}
                            className="p-4 rounded-[16px] bg-[#FAF7F2] border border-[#EDE8E0] flex items-center justify-between gap-4 hover:bg-white hover:border-[#172124]/30 transition-all group"
                          >
                            <div className="flex items-center gap-3.5 min-w-0">
                              <div className="size-10 rounded-[12px] bg-white border border-[#EDE8E0] flex items-center justify-center text-[#8B7D68] shrink-0">
                                <FileText className="size-5" />
                              </div>
                              <div className="flex flex-col min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border uppercase tracking-wider ${DOC_CATEGORY_META[doc.category]?.bg || "bg-gray-100 text-gray-800"}`}>
                                    {DOC_CATEGORY_META[doc.category]?.label || doc.category}
                                  </span>
                                  <span className="text-[11px] text-[#717A7D] font-mono">
                                    {(doc.file_size / 1024).toFixed(1)} KB
                                  </span>
                                </div>
                                <h5 className="font-semibold text-[14px] text-[#172124] truncate mt-0.5">
                                  {doc.title}
                                </h5>
                                <span className="text-[11px] text-[#717A7D] truncate max-w-[280px]">
                                  {doc.original_filename} · {new Date(doc.created_at).toLocaleDateString()}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleDownloadDealDoc(doc)}
                                className="px-3.5 py-1.5 rounded-full bg-white border border-[#EDE8E0] text-[#172124] hover:bg-[#FAF7F2] text-[12px] font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                                title="View / Download Document"
                              >
                                <Download className="size-3.5 text-[#17805B]" />
                                <span>Download</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeletingDealDocId(doc.id)}
                                className="p-1.5 rounded-full text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                                title="Delete Document"
                              >
                                <Trash2 className="size-4" />
                              </button>
                            </div>
                          </div>
                        ))}

                        {filteredDealDocuments.length === 0 && (
                          <div className="py-12 border border-dashed border-[#EDE8E0] rounded-[18px] text-center flex flex-col items-center gap-2 bg-[#FAF7F2]/50">
                            <div className="size-12 rounded-full bg-white border border-[#EDE8E0] flex items-center justify-center text-[#8B7D68]">
                              <FolderKey className="size-6" />
                            </div>
                            <h4 className="font-semibold text-[15px] text-[#172124]">
                              No documents in this category
                            </h4>
                            <p className="text-[12.5px] text-[#717A7D] max-w-[340px]">
                              Upload sale deeds, 7/12 extracts, KYC proofs, or bank agreements to securely store them.
                            </p>
                            <button
                              type="button"
                              onClick={() => {
                                setUploadDocCategory(dealDocCategoryFilter !== "all" ? (dealDocCategoryFilter as DealDocumentCategory) : "property");
                                setUploadDocModalOpen(true);
                              }}
                              className="px-4 py-2 rounded-full bg-[#172124] text-white text-[12px] font-semibold mt-2 cursor-pointer"
                            >
                              Upload Now
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* ── DEALS LIST VIEW ── */
                <div className="flex flex-col gap-6">
                  {/* Header */}
                  <div className="bg-white rounded-[24px] border border-[#EDE8E0] p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xs">
                    <div>
                      <div className="flex items-center gap-2 text-[#C9AD86] text-[11px] font-mono font-bold uppercase tracking-[0.2em] mb-1">
                        <FolderKey className="size-3.5" />
                        <span>Executive Transaction Pipeline</span>
                      </div>
                      <h2 className="font-display font-bold text-[24px] sm:text-[28px] text-[#172124] tracking-tight">
                        Deals & Document Vault
                      </h2>
                      <p className="text-[13.5px] text-[#717A7D] max-w-[560px]">
                        Track active real estate transactions, party agreements, and authenticated closing documentation in Goa.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setCreateDealModalOpen(true)}
                      className="px-6 py-3 rounded-full text-white font-semibold text-[13.5px] shadow-xs flex items-center gap-2 cursor-pointer self-start md:self-auto bg-[#172124] hover:bg-[#2C383C]"
                    >
                      <Plus className="size-4 text-[#C9AD86]" />
                      <span>New Deal</span>
                    </button>
                  </div>

                  {/* Summary Metric Cards */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                    {[
                      {
                        label: "Total Pipeline Deals",
                        value: deals.length,
                        icon: Briefcase,
                        color: "#C9AD86",
                        bg: "bg-[#172124] text-[#C9AD86]",
                      },
                      {
                        label: "Active Negotiations",
                        value: activeDealsCount,
                        icon: Handshake,
                        color: "#B45309",
                        bg: "bg-amber-50 text-[#B45309]",
                      },
                      {
                        label: "Closed Transactions",
                        value: deals.filter((d) => d.status === "completed").length,
                        icon: FileCheck,
                        color: "#17805B",
                        bg: "bg-emerald-50 text-[#17805B]",
                      },
                      {
                        label: "Secured Vault Documents",
                        value: deals.reduce((acc, d) => acc + (d.document_count || 0), 0),
                        icon: ShieldCheck,
                        color: "#7E22CE",
                        bg: "bg-purple-50 text-[#7E22CE]",
                      },
                    ].map((metric, idx) => {
                      const Icon = metric.icon;
                      return (
                        <div
                          key={idx}
                          className="bg-white rounded-[20px] border border-[#EDE8E0] p-5 flex flex-col justify-between gap-4 shadow-xs"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[12px] font-medium text-[#717A7D]">{metric.label}</span>
                            <div className={`size-9 rounded-xl ${metric.bg} flex items-center justify-center`}>
                              <Icon className="size-4.5" />
                            </div>
                          </div>
                          <span className="font-display font-bold text-[28px] text-[#172124]">
                            {metric.value}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Filters Bar */}
                  <div className="bg-white rounded-[24px] border border-[#EDE8E0] p-5 flex flex-wrap items-center justify-between gap-4 shadow-xs">
                    <div className="flex flex-wrap items-center gap-2">
                      {[
                        { id: "all", label: "All Deals", count: deals.length },
                        { id: "inquiry", label: "Inquiry", count: deals.filter((d) => d.status === "inquiry").length },
                        { id: "negotiation", label: "Negotiation", count: deals.filter((d) => d.status === "negotiation").length },
                        { id: "agreement", label: "Agreement Signed", count: deals.filter((d) => d.status === "agreement").length },
                        { id: "completed", label: "Closed Won", count: deals.filter((d) => d.status === "completed").length },
                        { id: "cancelled", label: "Cancelled", count: deals.filter((d) => d.status === "cancelled").length },
                      ].map((filter) => (
                        <button
                          key={filter.id}
                          type="button"
                          onClick={() => setDealStatusFilter(filter.id)}
                          className={`px-4 py-2 rounded-full text-[12.5px] font-semibold transition-all cursor-pointer flex items-center gap-2 ${
                            dealStatusFilter === filter.id
                              ? "bg-[#172124] text-white shadow-xs"
                              : "text-[#717A7D] hover:bg-[#FAF7F2] hover:text-[#172124]"
                          }`}
                        >
                          <span>{filter.label}</span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10.5px] font-bold ${
                              dealStatusFilter === filter.id
                                ? "bg-white/20 text-white"
                                : "bg-[#FAF7F2] border border-[#EDE8E0] text-[#172124]"
                            }`}
                          >
                            {filter.count}
                          </span>
                        </button>
                      ))}
                    </div>

                    <div className="relative min-w-[240px]">
                      <Search className="size-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8B7D68]" />
                      <input
                        type="text"
                        placeholder="Search deals, clients, properties..."
                        value={dealSearch}
                        onChange={(e) => setDealSearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 rounded-full border border-[#EDE8E0] bg-[#FAF7F2] text-[13px] text-[#172124] focus:outline-none focus:border-[#172124] focus:bg-white"
                      />
                    </div>
                  </div>

                  {/* Deals Cards Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredDeals.map((deal) => (
                      <div
                        key={deal.id}
                        className="bg-white rounded-[24px] border border-[#EDE8E0] p-6 shadow-xs flex flex-col justify-between gap-5 hover:border-[#172124]/40 hover:shadow-md transition-all group"
                      >
                        <div className="flex flex-col gap-3">
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-mono text-[11px] font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-[#FAF7F2] border border-[#EDE8E0] text-[#8B7D68]">
                              {deal.deal_number}
                            </span>
                            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${DEAL_STATUS_META[deal.status]?.bg || "bg-gray-50"} ${DEAL_STATUS_META[deal.status]?.text || "text-gray-700"} ${DEAL_STATUS_META[deal.status]?.border || "border-gray-200"}`}>
                              {DEAL_STATUS_META[deal.status]?.label || deal.status}
                            </span>
                          </div>

                          <div>
                            <h3 className="font-display font-bold text-[18px] text-[#172124] line-clamp-1 group-hover:text-[#8B7D68] transition-colors">
                              {deal.title}
                            </h3>
                            <p className="text-[12.5px] text-[#717A7D] line-clamp-1 mt-0.5">
                              {deal.property_title || "General Deal"}
                            </p>
                          </div>

                          <div className="p-3.5 rounded-[14px] bg-[#FAF7F2] border border-[#EDE8E0] flex flex-col gap-2 text-[12.5px]">
                            <div className="flex items-center justify-between">
                              <span className="text-[#8B7D68] font-mono text-[11px] uppercase">Buyer:</span>
                              <span className="font-semibold text-[#172124] truncate max-w-[160px]">
                                {deal.buyer_name || "Unassigned"}
                              </span>
                            </div>
                            <div className="flex items-center justify-between border-t border-[#EDE8E0]/60 pt-1.5">
                              <span className="text-[#8B7D68] font-mono text-[11px] uppercase">Seller:</span>
                              <span className="font-semibold text-[#172124] truncate max-w-[160px]">
                                {deal.seller_name || "Unassigned"}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-[13px] pt-1">
                            <span className="text-[#717A7D] font-mono text-[11.5px]">Agreed Price:</span>
                            <span className="font-display font-bold text-[#172124]">
                              {deal.agreed_price ? formatPriceINR(deal.agreed_price) : "Under Negotiation"}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-3.5 border-t border-[#EDE8E0]">
                          <span className="text-[12px] text-[#717A7D] font-mono flex items-center gap-1.5">
                            <FolderKey className="size-3.5 text-[#8B7D68]" />
                            <span>{deal.document_count || 0} deeds</span>
                          </span>

                          <button
                            type="button"
                            onClick={() => handleOpenDealDetail(deal.id)}
                            className="px-4 py-1.5 rounded-full bg-[#172124] text-white text-[12.5px] font-semibold hover:bg-[#2C383C] transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
                          >
                            <span>Open Vault</span>
                            <ChevronRight className="size-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {filteredDeals.length === 0 && (
                    <div className="bg-white rounded-[24px] border border-[#EDE8E0] p-12 text-center flex flex-col items-center gap-3">
                      <div className="size-14 rounded-full bg-[#FAF7F2] border border-[#EDE8E0] flex items-center justify-center text-[#8B7D68]">
                        <FolderKey className="size-7" />
                      </div>
                      <h3 className="font-display font-bold text-[18px] text-[#172124]">
                        No deals found
                      </h3>
                      <p className="text-[13.5px] text-[#717A7D] max-w-[420px]">
                        Create a deal to start tracking buyer negotiations, seller terms, and secure document vault uploads.
                      </p>
                      <button
                        type="button"
                        onClick={() => setCreateDealModalOpen(true)}
                        className="px-6 py-2.5 rounded-full text-white text-[13px] font-semibold mt-2 bg-[#172124] hover:bg-[#2C383C] cursor-pointer"
                      >
                        Create First Deal
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              TAB 6: LEADS & ENQUIRIES CRM
          ══════════════════════════════════════════════════════════════════ */}
          {activeTab === "enquiries" && (
            <div className="flex flex-col gap-6 animate-in fade-in duration-200">
              
              {/* Header with View Toggle (Active vs Archived) */}
              <div className="bg-white rounded-[24px] border border-[#EDE8E0] p-5 flex flex-wrap items-center justify-between gap-4 shadow-xs">
                
                {/* Active / Archived View Switcher */}
                <div className="flex items-center gap-1.5 p-1 bg-[#FAF7F2] rounded-full border border-[#EDE8E0]">
                  <button
                    type="button"
                    onClick={() => handleSwitchEnquiryView("active")}
                    className={`px-4 py-2 rounded-full text-[12.5px] font-semibold transition-all cursor-pointer flex items-center gap-2 ${
                      enquiryArchiveView === "active"
                        ? "bg-[#172124] text-white shadow-xs"
                        : "text-[#717A7D] hover:text-[#172124]"
                    }`}
                  >
                    <Inbox className="size-3.5" />
                    <span>Active Leads</span>
                    <span
                      className={`px-2 py-0.2 rounded-full text-[10.5px] font-bold ${
                        enquiryArchiveView === "active"
                          ? "bg-white/20 text-white"
                          : "bg-white border border-[#EDE8E0] text-[#172124]"
                      }`}
                    >
                      {enquiries.length}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSwitchEnquiryView("archived")}
                    className={`px-4 py-2 rounded-full text-[12.5px] font-semibold transition-all cursor-pointer flex items-center gap-2 ${
                      enquiryArchiveView === "archived"
                        ? "bg-[#172124] text-white shadow-xs"
                        : "text-[#717A7D] hover:text-[#172124]"
                    }`}
                  >
                    <Archive className="size-3.5" />
                    <span>Archived Leads</span>
                    <span
                      className={`px-2 py-0.2 rounded-full text-[10.5px] font-bold ${
                        enquiryArchiveView === "archived"
                          ? "bg-white/20 text-white"
                          : "bg-white border border-[#EDE8E0] text-[#172124]"
                      }`}
                    >
                      {archivedEnquiries.length}
                    </span>
                  </button>
                </div>

                {/* Sub-Filters */}
                <div className="flex flex-wrap items-center gap-2">
                  {[
                    { id: "all", label: "All Statuses" },
                    { id: "new", label: "New" },
                    { id: "contacted", label: "Contacted" },
                    { id: "site_visit", label: "Site Visit" },
                    { id: "negotiation", label: "Negotiation" },
                    { id: "closed", label: "Closed Won" },
                    { id: "lost", label: "Lost" },
                  ].map((filter) => (
                    <button
                      key={filter.id}
                      onClick={() => setEnquiryStatusFilter(filter.id)}
                      className={`px-3.5 py-1.5 rounded-full text-[12px] font-semibold transition-all cursor-pointer ${
                        enquiryStatusFilter === filter.id
                          ? "bg-[#172124] text-white shadow-xs"
                          : "text-[#717A7D] hover:bg-[#FAF7F2] hover:text-[#172124]"
                      }`}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>

                <span className="text-[12.5px] text-[#717A7D] font-medium">
                  {filteredEnquiries.length} leads in view
                </span>
              </div>

              {/* Leads Table */}
              <div className="bg-white rounded-[24px] border border-[#EDE8E0] shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[13px]">
                    <thead className="bg-[#FAF7F2] border-b border-[#EDE8E0] text-[#8B7D68] text-[11px] font-mono uppercase tracking-wider">
                      <tr>
                        <th className="py-3.5 px-5 font-semibold">Client Name</th>
                        <th className="py-3.5 px-4 font-semibold">Contact</th>
                        <th className="py-3.5 px-4 font-semibold">Property Interested</th>
                        <th className="py-3.5 px-4 font-semibold">Status</th>
                        <th className="py-3.5 px-4 font-semibold">Follow-up</th>
                        <th className="py-3.5 px-5 text-right font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#EDE8E0]/60">
                      {filteredEnquiries.map((enq) => (
                        <tr key={enq.id} className="hover:bg-[#FAF7F2] transition-colors">
                          <td className="py-3.5 px-5">
                            <div className="flex flex-col">
                              <span className="font-semibold text-[#172124]">{enq.buyer_name}</span>
                              <span className="text-[11px] text-[#8B7D68] font-mono">{formatTimeAgo(enq.created_at)}</span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex flex-col text-[12.5px]">
                              <a href={`tel:${enq.buyer_phone}`} className="text-[#172124] font-medium hover:underline">
                                {enq.buyer_phone}
                              </a>
                              <span className="text-[#717A7D]">{enq.buyer_email || "No email"}</span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="font-medium text-[#172124] line-clamp-1 max-w-[200px]">
                              {enq.property_title || "General Goa Inquiry"}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                                enq.status === "new"
                                  ? "bg-blue-50 text-[#1D4ED8] border border-blue-200"
                                  : enq.status === "site_visit"
                                  ? "bg-sky-50 text-[#0369A1] border border-sky-200"
                                  : enq.status === "negotiation"
                                  ? "bg-purple-50 text-[#7E22CE] border border-purple-200"
                                  : enq.status === "closed"
                                  ? "bg-emerald-50 text-[#17805B] border border-emerald-200"
                                  : "bg-gray-100 text-gray-700 border border-gray-200"
                              }`}
                            >
                              {formatLeadStatusLabel(enq.status)}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-[12px] text-[#717A7D]">
                            {enq.follow_up_date
                              ? new Date(enq.follow_up_date).toLocaleDateString("en-IN", { month: "short", day: "numeric" })
                              : "—"}
                          </td>
                          <td className="py-3.5 px-5 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <a
                                href={`https://wa.me/${enq.buyer_phone.replace(/\D/g, "")}?text=${encodeURIComponent(
                                  `Hi ${enq.buyer_name}, this is ${globalBusinessProfile.broker_name || "Kassim Shaikh"} from Ashiyana Real Estate regarding your enquiry for ${enq.property_title || "Goa properties"}.`
                                )}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 rounded-[10px] border border-[#EDE8E0] text-emerald-600 hover:bg-[#FAF7F2] transition-colors"
                                title="Chat on WhatsApp"
                              >
                                <MessageSquare className="size-4" />
                              </a>

                              {enquiryArchiveView === "active" ? (
                                <>
                                  <button
                                    onClick={() => {
                                      setSelectedEnquiry(enq);
                                      setLeadStatusVal(enq.status);
                                      setLeadNotesVal(enq.broker_notes || "");
                                      setLeadFollowUpVal(enq.follow_up_date ? enq.follow_up_date.slice(0, 16) : "");
                                      setLeadFeedback(null);
                                    }}
                                    className="px-4 py-1.5 rounded-full bg-[#172124] text-white text-[12px] font-semibold hover:bg-[#2C383C] transition-colors cursor-pointer shadow-2xs"
                                  >
                                    Update CRM
                                  </button>

                                  {enquiryArchiveConfirmId === enq.id ? (
                                    <div className="flex items-center gap-1">
                                      <button
                                        onClick={() => handleArchiveEnquiryAction(enq.id)}
                                        className="px-2.5 py-1.5 rounded-full bg-amber-600 text-white text-[11px] font-semibold hover:bg-amber-700 transition-colors cursor-pointer"
                                        title="Confirm Archiving"
                                      >
                                        Confirm
                                      </button>
                                      <button
                                        onClick={() => setEnquiryArchiveConfirmId(null)}
                                        className="p-1.5 rounded-full border border-[#EDE8E0] text-[#717A7D] hover:bg-white text-[11px]"
                                        title="Cancel"
                                      >
                                        <X className="size-3" />
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      onClick={() => setEnquiryArchiveConfirmId(enq.id)}
                                      className="p-2 rounded-[10px] border border-[#EDE8E0] text-[#717A7D] hover:text-amber-700 hover:bg-amber-50/50 hover:border-amber-200 transition-colors cursor-pointer"
                                      title="Archive Lead"
                                    >
                                      <Archive className="size-4" />
                                    </button>
                                  )}
                                </>
                              ) : (
                                <button
                                  onClick={() => handleUnarchiveEnquiryAction(enq.id)}
                                  className="px-3.5 py-1.5 rounded-full bg-[#FAF7F2] border border-[#EDE8E0] hover:bg-white text-[#172124] text-[12px] font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                                  title="Restore to Active CRM"
                                >
                                  <ArchiveRestore className="size-3.5 text-[#17805B]" />
                                  <span>Restore Lead</span>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {filteredEnquiries.length === 0 && (
                  <div className="p-12 text-center text-gray-400">
                    {loadingArchived
                      ? "Loading archived leads..."
                      : enquiryArchiveView === "archived"
                      ? "No archived leads found."
                      : "No active leads found matching your criteria."}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              TAB 7: SCHEDULED CLIENT VISITS
          ══════════════════════════════════════════════════════════════════ */}
          {activeTab === "visits" && (
            <div className="flex flex-col gap-6 animate-in fade-in duration-200">
              
              <div className="bg-white p-6 sm:p-7 rounded-[24px] border border-[#EDE8E0] flex items-center justify-between shadow-xs">
                <div>
                  <h2 className="font-display font-bold text-[20px] text-[#172124] tracking-tight">
                    Scheduled Client Walkthroughs & Site Visits ({scheduledVisits.length})
                  </h2>
                  <p className="text-[13px] text-[#717A7D] mt-0.5">
                    Direct appointments requested by buyers on the Ashiyana portal.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {scheduledVisits.map((v) => (
                  <div
                    key={v.id}
                    className="bg-white rounded-[24px] border border-[#EDE8E0] p-6 flex flex-col justify-between gap-4 shadow-xs"
                  >
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <span className="px-3 py-0.5 rounded-full text-[11px] font-semibold bg-sky-50 text-[#0369A1] border border-sky-200">
                          {v.status === "site_visit" ? "Site Visit Confirmed" : "Follow-up Scheduled"}
                        </span>
                        {v.follow_up_date && (
                          <span className="text-[12px] font-mono font-semibold text-[#8B7D68]">
                            {new Date(v.follow_up_date).toLocaleDateString("en-IN", {
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                        )}
                      </div>

                      <div>
                        <h4 className="font-display font-bold text-[17px] text-[#172124]">{v.buyer_name}</h4>
                        <span className="text-[12.5px] text-[#717A7D] font-medium truncate block mt-0.5">
                          {v.property_title || "Goa Villa / Estate"}
                        </span>
                      </div>

                      <p className="text-[13px] text-[#717A7D] italic bg-[#FAF7F2] p-3.5 rounded-[12px] border border-[#EDE8E0] leading-relaxed">
                        "{v.message || "Client requested on-site property walkthrough."}"
                      </p>

                      {v.broker_notes && (
                        <div className="p-3 rounded-[10px] bg-[#FAF7F2] text-[#172124] text-[12px] border border-[#EDE8E0]">
                          <strong>Notes:</strong> {v.broker_notes}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 pt-3 border-t border-[#EDE8E0]">
                      <a
                        href={`tel:${v.buyer_phone}`}
                        className="flex-1 py-2.5 rounded-full bg-[#172124] text-white text-[12px] font-semibold flex items-center justify-center gap-1.5 hover:bg-[#2C383C] shadow-xs"
                      >
                        <Phone className="size-3.5" />
                        <span>Call</span>
                      </a>
                      <a
                        href={`https://wa.me/${v.buyer_phone.replace(/\D/g, "")}?text=${encodeURIComponent(
                          `Hi ${v.buyer_name}, this is ${globalBusinessProfile.broker_name || "Kassim Shaikh"} from Ashiyana Real Estate confirming your requested visit for ${v.property_title || "the property"}.`
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 py-2.5 rounded-full border border-[#EDE8E0] hover:bg-[#FAF7F2] text-[#172124] text-[12px] font-semibold flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <MessageSquare className="size-3.5 text-emerald-600" />
                        <span>WhatsApp</span>
                      </a>
                    </div>
                  </div>
                ))}

                {scheduledVisits.length === 0 && (
                  <div className="col-span-full py-16 text-center text-gray-400 bg-white rounded-[24px] border border-[#EDE8E0]">
                    No site visits currently scheduled.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              TAB 8: AI PROPERTY VALUATION ENGINE (BROKER TOOL)
          ══════════════════════════════════════════════════════════════════ */}
          {activeTab === "valuation" && (
            <div className="flex flex-col gap-6 animate-in fade-in duration-200">
              
              {/* Header Card */}
              <div className="bg-white p-6 sm:p-7 rounded-[24px] border border-[#EDE8E0] flex flex-wrap items-center justify-between gap-4 shadow-xs">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[11px] font-mono font-bold uppercase tracking-[0.2em] text-[#8B7D68]">
                      Private Broker Estimator
                    </span>
                  </div>
                  <h2 className="font-display font-bold text-[22px] text-[#172124] tracking-tight">
                    Property Valuation Engine
                  </h2>
                  <p className="text-[13px] text-[#717A7D] mt-0.5 max-w-2xl">
                    Internal price range forecasting trained on approximate Goa real estate locality baselines and property parameters.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11.5px] font-mono font-medium text-[#8B7D68] bg-[#FAF7F2] px-3.5 py-1.5 rounded-full border border-[#EDE8E0]">
                    Kassim Shaikh Advisory Desk
                  </span>
                </div>
              </div>

              {valuationError && (
                <div className="p-4 rounded-[16px] bg-red-50 text-red-800 border border-red-200 text-[13px] flex items-center gap-2.5">
                  <AlertCircle className="size-4.5 text-red-600 shrink-0" />
                  <span>{valuationError}</span>
                </div>
              )}

              {/* Main Estimation Grid: Form (Left) & Result (Right) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* Form Card */}
                <div className="lg:col-span-7 bg-white rounded-[24px] border border-[#EDE8E0] p-6 sm:p-7 shadow-xs">
                  <div className="flex items-center justify-between border-b border-[#EDE8E0] pb-4 mb-5">
                    <div className="flex items-center gap-2">
                      <SlidersHorizontal className="size-4 text-[#8B7D68]" />
                      <h3 className="font-display font-bold text-[16px] text-[#172124]">
                        Property Specifications
                      </h3>
                    </div>
                    <span className="text-[11.5px] text-[#717A7D]">All fields market-adjusted</span>
                  </div>

                  <form onSubmit={handleEstimatePrice} className="flex flex-col gap-4">
                    
                    {/* Locality & Region */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[11.5px] font-semibold text-[#8B7D68] uppercase tracking-wider mb-1.5">
                          Locality / Village
                        </label>
                        <select
                          value={valuationForm.locality}
                          onChange={(e) => setValuationForm({ ...valuationForm, locality: e.target.value })}
                          className="w-full px-4 py-2.5 rounded-[12px] border border-[#EDE8E0] bg-[#FAF7F2] text-[13.5px] text-[#172124] focus:outline-none focus:border-[#172124] focus:bg-white transition-all font-sans"
                        >
                          <optgroup label="North Goa — Coastal Belt">
                            <option value="Calangute">Calangute</option>
                            <option value="Baga">Baga</option>
                            <option value="Candolim">Candolim</option>
                            <option value="Sinquerim">Sinquerim</option>
                            <option value="Anjuna">Anjuna</option>
                            <option value="Vagator">Vagator</option>
                            <option value="Assagao">Assagao</option>
                            <option value="Siolim">Siolim</option>
                            <option value="Morjim">Morjim</option>
                          </optgroup>
                          <optgroup label="North Goa — Inland & Capital">
                            <option value="Panjim">Panjim</option>
                            <option value="Miramar">Miramar</option>
                            <option value="Dona Paula">Dona Paula</option>
                            <option value="Caranzalem">Caranzalem</option>
                            <option value="Porvorim">Porvorim</option>
                            <option value="Saligao">Saligao</option>
                            <option value="Pilerne">Pilerne</option>
                            <option value="Mapusa">Mapusa</option>
                            <option value="Aldona">Aldona</option>
                            <option value="Bicholim">Bicholim</option>
                          </optgroup>
                          <optgroup label="South Goa — Coastal Belt">
                            <option value="Colva">Colva</option>
                            <option value="Benaulim">Benaulim</option>
                            <option value="Varca">Varca</option>
                            <option value="Cavelossim">Cavelossim</option>
                            <option value="Betalbatim">Betalbatim</option>
                            <option value="Majorda">Majorda</option>
                            <option value="Palolem">Palolem</option>
                            <option value="Agonda">Agonda</option>
                          </optgroup>
                          <optgroup label="South Goa — Urban & Industrial">
                            <option value="Margao">Margao</option>
                            <option value="Vasco">Vasco</option>
                            <option value="Dabolim">Dabolim</option>
                            <option value="Chicalim">Chicalim</option>
                            <option value="Verna">Verna</option>
                            <option value="Cortalim">Cortalim</option>
                            <option value="Curchorem">Curchorem</option>
                            <option value="Quepem">Quepem</option>
                            <option value="Sanvordem">Sanvordem</option>
                            <option value="Sanguem">Sanguem</option>
                          </optgroup>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11.5px] font-semibold text-[#8B7D68] uppercase tracking-wider mb-1.5">
                          Region
                        </label>
                        <select
                          value={valuationForm.region}
                          onChange={(e) => setValuationForm({ ...valuationForm, region: e.target.value })}
                          className="w-full px-4 py-2.5 rounded-[12px] border border-[#EDE8E0] bg-[#FAF7F2] text-[13.5px] text-[#172124] focus:outline-none focus:border-[#172124] focus:bg-white transition-all font-sans"
                        >
                          <option value="north_goa">North Goa</option>
                          <option value="south_goa">South Goa</option>
                          <option value="central_goa">Central Goa</option>
                        </select>
                      </div>
                    </div>

                    {/* Property Type & Area */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[11.5px] font-semibold text-[#8B7D68] uppercase tracking-wider mb-1.5">
                          Property Type
                        </label>
                        <select
                          value={valuationForm.property_type}
                          onChange={(e) => setValuationForm({ ...valuationForm, property_type: e.target.value })}
                          className="w-full px-4 py-2.5 rounded-[12px] border border-[#EDE8E0] bg-[#FAF7F2] text-[13.5px] text-[#172124] focus:outline-none focus:border-[#172124] focus:bg-white transition-all font-sans"
                        >
                          <option value="villa">Luxury Villa</option>
                          <option value="flat">Apartment / Flat</option>
                          <option value="bungalow">Independent Bungalow</option>
                          <option value="plot">Land / Plot</option>
                          <option value="commercial">Commercial Space</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11.5px] font-semibold text-[#8B7D68] uppercase tracking-wider mb-1.5">
                          Built-up Area (sq. ft.)
                        </label>
                        <input
                          type="number"
                          required
                          min={100}
                          max={50000}
                          value={valuationForm.area_sqft}
                          onChange={(e) => setValuationForm({ ...valuationForm, area_sqft: Number(e.target.value) })}
                          className="w-full px-4 py-2.5 rounded-[12px] border border-[#EDE8E0] bg-[#FAF7F2] text-[13.5px] text-[#172124] focus:outline-none focus:border-[#172124] focus:bg-white transition-all font-sans"
                        />
                      </div>
                    </div>

                    {/* Bedrooms & Age */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-[11.5px] font-semibold text-[#8B7D68] uppercase tracking-wider mb-1.5">
                          Bedrooms (BHK)
                        </label>
                        <select
                          value={valuationForm.bedrooms}
                          onChange={(e) => setValuationForm({ ...valuationForm, bedrooms: Number(e.target.value) })}
                          className="w-full px-4 py-2.5 rounded-[12px] border border-[#EDE8E0] bg-[#FAF7F2] text-[13.5px] text-[#172124] focus:outline-none focus:border-[#172124] focus:bg-white transition-all font-sans"
                        >
                          <option value={1}>1 BHK</option>
                          <option value={2}>2 BHK</option>
                          <option value={3}>3 BHK</option>
                          <option value={4}>4 BHK</option>
                          <option value={5}>5+ BHK</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11.5px] font-semibold text-[#8B7D68] uppercase tracking-wider mb-1.5">
                          Furnishing
                        </label>
                        <select
                          value={valuationForm.furnished}
                          onChange={(e) => setValuationForm({ ...valuationForm, furnished: e.target.value })}
                          className="w-full px-4 py-2.5 rounded-[12px] border border-[#EDE8E0] bg-[#FAF7F2] text-[13.5px] text-[#172124] focus:outline-none focus:border-[#172124] focus:bg-white transition-all font-sans"
                        >
                          <option value="furnished">Fully Furnished</option>
                          <option value="semi-furnished">Semi-Furnished</option>
                          <option value="unfurnished">Unfurnished</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11.5px] font-semibold text-[#8B7D68] uppercase tracking-wider mb-1.5">
                          Age (Years)
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={50}
                          value={valuationForm.age_years}
                          onChange={(e) => setValuationForm({ ...valuationForm, age_years: Number(e.target.value) })}
                          className="w-full px-4 py-2.5 rounded-[12px] border border-[#EDE8E0] bg-[#FAF7F2] text-[13.5px] text-[#172124] focus:outline-none focus:border-[#172124] focus:bg-white transition-all font-sans"
                        />
                      </div>
                    </div>

                    {/* Proximity & Floor */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-[11.5px] font-semibold text-[#8B7D68] uppercase tracking-wider mb-1.5">
                          Beach Dist. (km)
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          min={0}
                          max={50}
                          value={valuationForm.beach_distance_km}
                          onChange={(e) => setValuationForm({ ...valuationForm, beach_distance_km: Number(e.target.value) })}
                          className="w-full px-4 py-2.5 rounded-[12px] border border-[#EDE8E0] bg-[#FAF7F2] text-[13.5px] text-[#172124] focus:outline-none focus:border-[#172124] focus:bg-white transition-all font-sans"
                        />
                      </div>

                      <div>
                        <label className="block text-[11.5px] font-semibold text-[#8B7D68] uppercase tracking-wider mb-1.5">
                          Mopa Airport (km)
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          min={1}
                          max={100}
                          value={valuationForm.mopa_airport_km}
                          onChange={(e) => setValuationForm({ ...valuationForm, mopa_airport_km: Number(e.target.value) })}
                          className="w-full px-4 py-2.5 rounded-[12px] border border-[#EDE8E0] bg-[#FAF7F2] text-[13.5px] text-[#172124] focus:outline-none focus:border-[#172124] focus:bg-white transition-all font-sans"
                        />
                      </div>

                      <div>
                        <label className="block text-[11.5px] font-semibold text-[#8B7D68] uppercase tracking-wider mb-1.5">
                          Floor Number
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={30}
                          value={valuationForm.floor_number}
                          onChange={(e) => setValuationForm({ ...valuationForm, floor_number: Number(e.target.value) })}
                          className="w-full px-4 py-2.5 rounded-[12px] border border-[#EDE8E0] bg-[#FAF7F2] text-[13.5px] text-[#172124] focus:outline-none focus:border-[#172124] focus:bg-white transition-all font-sans"
                        />
                      </div>
                    </div>

                    <div className="pt-3 border-t border-[#EDE8E0] flex items-center justify-end">
                      <button
                        type="submit"
                        disabled={valuationLoading}
                        className="w-full sm:w-auto px-7 py-3 rounded-full bg-[#172124] hover:bg-[#2C383C] text-white font-semibold text-[13.5px] shadow-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        {valuationLoading ? (
                          <>
                            <RefreshCw className="size-4 animate-spin" />
                            <span>Computing Market Range...</span>
                          </>
                        ) : (
                          <>
                            <Calculator className="size-4" />
                            <span>Run Price Valuation</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>

                {/* Result Card */}
                <div className="lg:col-span-5 flex flex-col gap-6">
                  {valuationResult ? (
                    <div className="bg-white rounded-[24px] border border-[#EDE8E0] p-6 sm:p-7 shadow-xs flex flex-col gap-5 animate-in fade-in duration-200">
                      <div className="flex items-center justify-between border-b border-[#EDE8E0] pb-3.5">
                        <span className="text-[11px] font-mono font-bold uppercase tracking-[0.2em] text-[#8B7D68]">
                          Estimated Market Valuation
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-[#17805B] border border-emerald-200">
                          {valuationResult.locality_known ? "Locality Benchmark Match" : "Regional Baseline"}
                        </span>
                      </div>

                      {/* Primary Mid Estimate Display */}
                      <div className="p-5 rounded-[18px] bg-gradient-to-br from-[#172124] to-[#243034] text-white flex flex-col gap-1.5 shadow-md">
                        <span className="text-[11.5px] uppercase tracking-wider text-white/70 font-mono">
                          Suggested Market Anchor (Mid)
                        </span>
                        <div className="text-[30px] sm:text-[34px] font-display font-bold text-white tracking-tight">
                          {formatPriceINR(valuationResult.estimated_mid)}
                        </div>
                        <div className="flex items-center justify-between text-[12px] text-white/80 pt-2 border-t border-white/10 mt-1">
                          <span>Approx. Per Sq.Ft. Rate</span>
                          <span className="font-mono font-semibold text-[#C9AD86]">
                            ₹{valuationResult.price_per_sqft_approx.toLocaleString("en-IN")}/sqft
                          </span>
                        </div>
                      </div>

                      {/* Low and High Range */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-4 rounded-[14px] bg-[#FAF7F2] border border-[#EDE8E0] flex flex-col gap-1">
                          <span className="text-[11px] font-semibold text-[#8B7D68] uppercase tracking-wider">
                            Conservative (Low)
                          </span>
                          <span className="font-display font-bold text-[18px] text-[#172124]">
                            {formatPriceINR(valuationResult.estimated_low)}
                          </span>
                          <span className="text-[11px] text-[#717A7D]">Fast liquidity bound</span>
                        </div>

                        <div className="p-4 rounded-[14px] bg-[#FAF7F2] border border-[#EDE8E0] flex flex-col gap-1">
                          <span className="text-[11px] font-semibold text-[#8B7D68] uppercase tracking-wider">
                            Optimistic (High)
                          </span>
                          <span className="font-display font-bold text-[18px] text-[#172124]">
                            {formatPriceINR(valuationResult.estimated_high)}
                          </span>
                          <span className="text-[11px] text-[#717A7D]">Premium demand bound</span>
                        </div>
                      </div>

                      {/* Model Confidence */}
                      <div className="p-4 rounded-[14px] bg-[#FAF7F2] border border-[#EDE8E0] flex flex-col gap-2">
                        <div className="flex items-center justify-between text-[12.5px]">
                          <span className="font-semibold text-[#172124]">Model Confidence Score</span>
                          <span className="font-mono font-bold text-[#17805B]">
                            {(valuationResult.confidence_score * 100).toFixed(0)}%
                          </span>
                        </div>
                        <div className="w-full bg-[#EDE8E0] h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-[#17805B] h-full rounded-full transition-all duration-500"
                            style={{ width: `${valuationResult.confidence_score * 100}%` }}
                          />
                        </div>
                      </div>

                      {/* Advisory Disclaimer */}
                      <p className="text-[12px] text-[#717A7D] leading-relaxed italic bg-[#FAF7F2] p-3.5 rounded-[12px] border border-[#EDE8E0]">
                        "{valuationResult.note}"
                      </p>
                    </div>
                  ) : (
                    <div className="bg-white rounded-[24px] border border-[#EDE8E0] p-8 text-center flex flex-col items-center justify-center gap-3 min-h-[360px] shadow-xs">
                      <div className="size-12 rounded-full bg-[#FAF7F2] border border-[#EDE8E0] flex items-center justify-center text-[#8B7D68]">
                        <Calculator className="size-6" />
                      </div>
                      <h4 className="font-display font-bold text-[17px] text-[#172124]">
                        Ready for Market Estimation
                      </h4>
                      <p className="text-[12.5px] text-[#717A7D] max-w-xs leading-relaxed">
                        Configure property specifications on the left and run the estimation to generate instant pricing bands.
                      </p>
                    </div>
                  )}
                </div>

              </div>

              {/* Valuation History Log */}
              <div className="bg-white rounded-[24px] border border-[#EDE8E0] shadow-xs overflow-hidden">
                <div className="p-5 sm:p-6 border-b border-[#EDE8E0] flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <h3 className="font-display font-bold text-[18px] text-[#172124]">
                      Valuation History Log ({valuationHistory.length})
                    </h3>
                    <p className="text-[12.5px] text-[#717A7D] mt-0.5">
                      Persisted records of past pricing estimates conducted from the broker desk.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleRefreshValuationHistory}
                    disabled={historyLoading}
                    className="px-3.5 py-1.5 rounded-full border border-[#EDE8E0] hover:bg-[#FAF7F2] text-[#172124] text-[12px] font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <RefreshCw className={`size-3.5 ${historyLoading ? "animate-spin" : ""}`} />
                    <span>Refresh Log</span>
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[13px]">
                    <thead className="bg-[#FAF7F2] border-b border-[#EDE8E0] text-[#8B7D68] text-[11px] font-mono uppercase tracking-wider">
                      <tr>
                        <th className="py-3.5 px-5 font-semibold">Date & Time</th>
                        <th className="py-3.5 px-4 font-semibold">Locality</th>
                        <th className="py-3.5 px-4 font-semibold">Type & Area</th>
                        <th className="py-3.5 px-4 font-semibold">Suggested Mid</th>
                        <th className="py-3.5 px-4 font-semibold">Estimated Range</th>
                        <th className="py-3.5 px-5 text-right font-semibold">Confidence</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#EDE8E0]/60">
                      {valuationHistory.map((item) => (
                        <tr key={item.id} className="hover:bg-[#FAF7F2] transition-colors">
                          <td className="py-3.5 px-5">
                            <span className="font-mono text-[12px] text-[#172124]">
                              {new Date(item.created_at).toLocaleDateString("en-IN", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-semibold text-[#172124]">
                            {item.locality}
                          </td>
                          <td className="py-3.5 px-4 text-[#717A7D]">
                            <span className="capitalize">{item.property_type}</span> · {item.area_sqft} sqft
                          </td>
                          <td className="py-3.5 px-4 font-display font-bold text-[#172124]">
                            {formatPriceINR(item.estimated_mid)}
                          </td>
                          <td className="py-3.5 px-4 text-[12px] text-[#717A7D]">
                            {formatPriceINR(item.estimated_low)} – {formatPriceINR(item.estimated_high)}
                          </td>
                          <td className="py-3.5 px-5 text-right font-mono font-semibold text-[#17805B]">
                            {(item.confidence_score * 100).toFixed(0)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {valuationHistory.length === 0 && (
                  <div className="p-12 text-center text-gray-400">
                    {historyLoading ? "Loading valuation records..." : "No property valuations recorded in history yet."}
                  </div>
                )}
              </div>

            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              TAB 9: BROKER PROFILE & SETTINGS
          ══════════════════════════════════════════════════════════════════ */}
          {activeTab === "profile" && (
            <div className="max-w-[760px] mx-auto w-full flex flex-col gap-6 animate-in fade-in duration-200">
              
              <div className="bg-white rounded-[24px] border border-[#EDE8E0] p-7 sm:p-9 shadow-xs flex flex-col gap-6">
                <div className="flex items-center justify-between flex-wrap gap-4 border-b border-[#EDE8E0] pb-6">
                  <div className="flex items-center gap-4">
                    <div className="size-16 rounded-full bg-[#172124] text-[#C9AD86] border border-[#C9AD86]/30 font-bold text-[22px] flex items-center justify-center shadow-xs">
                      KS
                    </div>
                    <div>
                      <h2 className="text-[22px] font-display font-bold text-[#172124]">
                        {profileForm.broker_name || "Kassim Shaikh"}
                      </h2>
                      <p className="text-[13px] text-[#717A7D] font-medium">
                        {profileForm.broker_role || "Lead Broker & Founder"} · {profileForm.company_name || "Ashiyana Real Estate"}
                      </p>
                      <p className="text-[12px] text-[#717A7D]/70">{profileForm.office_address || "Calangute & Panaji, Goa, India"}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#FAF7F2] border border-[#EDE8E0] text-[#172124] text-[11.5px] font-semibold">
                    <ShieldCheck className="size-4 text-[#17805B]" />
                    <span>Database Synchronized</span>
                  </div>
                </div>

                {profileFeedback && (
                  <div
                    className={`p-4 rounded-[14px] text-[13px] flex items-start gap-2.5 ${
                      profileFeedback.type === "success"
                        ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                        : "bg-red-50 text-red-800 border border-red-200"
                    }`}
                  >
                    {profileFeedback.type === "success" ? (
                      <CheckCircle2 className="size-4.5 shrink-0 mt-0.5 text-[#17805B]" />
                    ) : (
                      <AlertCircle className="size-4.5 shrink-0 mt-0.5 text-red-600" />
                    )}
                    <span>{profileFeedback.message}</span>
                  </div>
                )}

                <form onSubmit={handleSaveProfile} className="flex flex-col gap-6">
                  
                  {/* Identity */}
                  <div className="flex flex-col gap-4">
                    <h3 className="text-[12px] font-mono font-bold text-[#8B7D68] uppercase tracking-wider">
                      Broker Identity & Firm
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[11.5px] font-semibold text-[#8B7D68] uppercase tracking-wider mb-1.5">Broker Name</label>
                        <input
                          type="text"
                          required
                          value={profileForm.broker_name}
                          onChange={(e) => setProfileForm({ ...profileForm, broker_name: e.target.value })}
                          className="w-full px-4 py-2.5 rounded-[12px] border border-[#EDE8E0] bg-[#FAF7F2] text-[13.5px] text-[#172124] focus:outline-none focus:border-[#172124] focus:bg-white transition-all font-sans"
                        />
                      </div>
                      <div>
                        <label className="block text-[11.5px] font-semibold text-[#8B7D68] uppercase tracking-wider mb-1.5">Broker Role</label>
                        <input
                          type="text"
                          required
                          value={profileForm.broker_role}
                          onChange={(e) => setProfileForm({ ...profileForm, broker_role: e.target.value })}
                          className="w-full px-4 py-2.5 rounded-[12px] border border-[#EDE8E0] bg-[#FAF7F2] text-[13.5px] text-[#172124] focus:outline-none focus:border-[#172124] focus:bg-white transition-all font-sans"
                        />
                      </div>
                      <div>
                        <label className="block text-[11.5px] font-semibold text-[#8B7D68] uppercase tracking-wider mb-1.5">Company Name</label>
                        <input
                          type="text"
                          required
                          value={profileForm.company_name}
                          onChange={(e) => setProfileForm({ ...profileForm, company_name: e.target.value })}
                          className="w-full px-4 py-2.5 rounded-[12px] border border-[#EDE8E0] bg-[#FAF7F2] text-[13.5px] text-[#172124] focus:outline-none focus:border-[#172124] focus:bg-white transition-all font-sans"
                        />
                      </div>
                      <div>
                        <label className="block text-[11.5px] font-semibold text-[#8B7D68] uppercase tracking-wider mb-1.5">Office Address</label>
                        <input
                          type="text"
                          required
                          value={profileForm.office_address}
                          onChange={(e) => setProfileForm({ ...profileForm, office_address: e.target.value })}
                          className="w-full px-4 py-2.5 rounded-[12px] border border-[#EDE8E0] bg-[#FAF7F2] text-[13.5px] text-[#172124] focus:outline-none focus:border-[#172124] focus:bg-white transition-all font-sans"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Contact Channels */}
                  <div className="flex flex-col gap-4 pt-4 border-t border-[#EDE8E0]">
                    <h3 className="text-[12px] font-mono font-bold text-[#8B7D68] uppercase tracking-wider">
                      Public Contact Numbers
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-[11.5px] font-semibold text-[#8B7D68] uppercase tracking-wider mb-1.5">Phone</label>
                        <input
                          type="text"
                          required
                          value={profileForm.phone}
                          onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                          className="w-full px-4 py-2.5 rounded-[12px] border border-[#EDE8E0] bg-[#FAF7F2] text-[13.5px] text-[#172124] focus:outline-none focus:border-[#172124] focus:bg-white transition-all font-sans"
                        />
                      </div>
                      <div>
                        <label className="block text-[11.5px] font-semibold text-[#8B7D68] uppercase tracking-wider mb-1.5">WhatsApp</label>
                        <input
                          type="text"
                          required
                          value={profileForm.whatsapp_number}
                          onChange={(e) => setProfileForm({ ...profileForm, whatsapp_number: e.target.value })}
                          className="w-full px-4 py-2.5 rounded-[12px] border border-[#EDE8E0] bg-[#FAF7F2] text-[13.5px] text-[#172124] focus:outline-none focus:border-[#172124] focus:bg-white transition-all font-sans"
                        />
                      </div>
                      <div>
                        <label className="block text-[11.5px] font-semibold text-[#8B7D68] uppercase tracking-wider mb-1.5">Email</label>
                        <input
                          type="email"
                          required
                          value={profileForm.email}
                          onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                          className="w-full px-4 py-2.5 rounded-[12px] border border-[#EDE8E0] bg-[#FAF7F2] text-[13.5px] text-[#172124] focus:outline-none focus:border-[#172124] focus:bg-white transition-all font-sans"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Social Media */}
                  <div className="flex flex-col gap-4 pt-4 border-t border-[#EDE8E0]">
                    <h3 className="text-[12px] font-mono font-bold text-[#8B7D68] uppercase tracking-wider">
                      Social Media Channels
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-[11.5px] font-semibold text-[#8B7D68] uppercase tracking-wider mb-1.5">Facebook URL</label>
                        <input
                          type="url"
                          placeholder="https://facebook.com/ashiyana"
                          value={profileForm.facebook_url || ""}
                          onChange={(e) => setProfileForm({ ...profileForm, facebook_url: e.target.value })}
                          className="w-full px-4 py-2.5 rounded-[12px] border border-[#EDE8E0] bg-[#FAF7F2] text-[13.5px] text-[#172124] focus:outline-none focus:border-[#172124] focus:bg-white transition-all font-sans"
                        />
                      </div>
                      <div>
                        <label className="block text-[11.5px] font-semibold text-[#8B7D68] uppercase tracking-wider mb-1.5">Instagram URL</label>
                        <input
                          type="url"
                          placeholder="https://instagram.com/ashiyana"
                          value={profileForm.instagram_url || ""}
                          onChange={(e) => setProfileForm({ ...profileForm, instagram_url: e.target.value })}
                          className="w-full px-4 py-2.5 rounded-[12px] border border-[#EDE8E0] bg-[#FAF7F2] text-[13.5px] text-[#172124] focus:outline-none focus:border-[#172124] focus:bg-white transition-all font-sans"
                        />
                      </div>
                      <div>
                        <label className="block text-[11.5px] font-semibold text-[#8B7D68] uppercase tracking-wider mb-1.5">OLX Profile URL</label>
                        <input
                          type="url"
                          placeholder="https://olx.in/ashiyana"
                          value={profileForm.olx_url || ""}
                          onChange={(e) => setProfileForm({ ...profileForm, olx_url: e.target.value })}
                          className="w-full px-4 py-2.5 rounded-[12px] border border-[#EDE8E0] bg-[#FAF7F2] text-[13.5px] text-[#172124] focus:outline-none focus:border-[#172124] focus:bg-white transition-all font-sans"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end pt-4 border-t border-[#EDE8E0]">
                    <button
                      type="submit"
                      disabled={profileSaving}
                      className="px-8 py-3 rounded-full text-white font-semibold text-[13.5px] shadow-xs hover:bg-[#2C383C] disabled:opacity-50 flex items-center gap-2 cursor-pointer bg-[#172124] transition-all"
                    >
                      {profileSaving ? (
                        <>
                          <RefreshCw className="size-4 animate-spin" />
                          <span>Saving Profile...</span>
                        </>
                      ) : (
                        <>
                          <Check className="size-4" />
                          <span>Save Settings</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

        </div>
      </main>

      {/* ─── MODAL: EDIT PROPERTY DETAILS ─────────────────────────────────── */}
      {editingProperty && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-[24px] max-w-[640px] w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-[#EDE8E0]">
            <div className="px-7 py-5 border-b border-[#EDE8E0] flex items-center justify-between bg-[#FAF7F2]">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-[#8B7D68] block">
                  [ Inventory Editor ]
                </span>
                <h3 className="font-display font-bold text-[18px] text-[#172124]">
                  Edit Property Details
                </h3>
              </div>
              <button
                onClick={() => setEditingProperty(null)}
                className="size-8 rounded-full hover:bg-gray-200 flex items-center justify-center text-gray-500 cursor-pointer"
              >
                <X className="size-4.5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditProperty} className="p-7 overflow-y-auto flex flex-col gap-4">
              {editFeedback && (
                <div
                  className={`p-3.5 rounded-[12px] text-[13px] flex items-center gap-2 ${
                    editFeedback.type === "success" ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-red-50 text-red-800 border border-red-200"
                  }`}
                >
                  {editFeedback.type === "success" ? <CheckCircle2 className="size-4 text-[#17805B]" /> : <AlertCircle className="size-4 text-red-600" />}
                  <span>{editFeedback.message}</span>
                </div>
              )}

              {/* Buyer Interest & Watcher Intelligence */}
              <div className="p-4 rounded-[16px] bg-[#FAF7F2] border border-[#EDE8E0] flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-700 shrink-0">
                    <Eye className="size-5" />
                  </div>
                  <div>
                    <p className="text-[10.5px] font-mono uppercase font-bold text-[#8B7D68] tracking-wider">
                      Buyer Interest Intelligence
                    </p>
                    <p className="text-[13.5px] font-semibold text-[#172124]">
                      {watcherSummaryMap[editingProperty.id] ?? 0} {(watcherSummaryMap[editingProperty.id] ?? 0) === 1 ? "registered buyer" : "registered buyers"} saved this listing
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const currentProp = editingProperty;
                    setEditingProperty(null);
                    handleViewWatchers(currentProp);
                  }}
                  className="px-3.5 py-1.5 rounded-full text-[12px] font-semibold bg-white border border-[#EDE8E0] hover:bg-[#FAF7F2] text-[#172124] transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs shrink-0"
                >
                  <Users className="size-3.5 text-amber-700" />
                  <span>View Watchers</span>
                </button>
              </div>

              {/* Private Property Legal Documents */}
              <div className="p-4 rounded-[16px] bg-[#FAF7F2] border border-[#EDE8E0] flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="size-4 text-[#8B7D68]" />
                    <span className="text-[10.5px] font-mono uppercase font-bold text-[#8B7D68] tracking-wider">
                      Seller Legal Documents ({propertyDocuments.length})
                    </span>
                  </div>
                  <span className="text-[10.5px] font-mono uppercase text-[#717A7D] font-semibold">
                    Confidential Vault
                  </span>
                </div>

                {loadingPropertyDocs ? (
                  <div className="py-2.5 text-center text-xs text-[#717A7D] font-mono">
                    Loading attached documents...
                  </div>
                ) : propertyDocuments.length === 0 ? (
                  <div className="py-2.5 px-3 rounded-[10px] bg-white border border-[#EDE8E0] text-[12px] text-gray-400 text-center">
                    No legal documents attached to this property listing.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {propertyDocuments.map((doc) => (
                      <div
                        key={doc.id}
                        className="p-3 rounded-[12px] border border-[#EDE8E0] bg-white flex items-center justify-between gap-3 shadow-2xs"
                      >
                        <div className="flex flex-col min-w-0">
                          <span className="font-semibold text-[13px] text-[#172124] truncate">
                            {doc.title}
                          </span>
                          <span className="text-[10.5px] text-[#8B7D68] font-mono uppercase font-semibold">
                            {doc.doc_type} • {(doc.file_size / 1024).toFixed(1)} KB
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleBrokerDownloadSellerDoc(doc.id, doc.original_filename)}
                          className="px-3 py-1.5 rounded-full bg-[#172124] text-white text-[11px] font-semibold hover:bg-[#2C383C] transition-colors flex items-center gap-1 shrink-0 cursor-pointer"
                        >
                          <Download className="size-3.5" />
                          <span>Download</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[11.5px] font-semibold text-[#8B7D68] uppercase tracking-wider mb-1.5">Title</label>
                <input
                  type="text"
                  required
                  value={editForm.title || ""}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-[12px] border border-[#EDE8E0] bg-[#FAF7F2] text-[13.5px] text-[#172124] focus:outline-none focus:border-[#172124] focus:bg-white font-sans"
                />
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[11.5px] font-semibold text-[#8B7D68] uppercase tracking-wider mb-1.5">Price (INR)</label>
                  <input
                    type="number"
                    required
                    value={editForm.price || ""}
                    onChange={(e) => setEditForm({ ...editForm, price: Number(e.target.value) })}
                    className="w-full px-4 py-2.5 rounded-[12px] border border-[#EDE8E0] bg-[#FAF7F2] text-[13.5px] font-semibold text-[#172124] focus:outline-none focus:border-[#172124] focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11.5px] font-semibold text-[#8B7D68] uppercase tracking-wider mb-1.5">Locality</label>
                  <input
                    type="text"
                    required
                    value={editForm.locality || ""}
                    onChange={(e) => setEditForm({ ...editForm, locality: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-[12px] border border-[#EDE8E0] bg-[#FAF7F2] text-[13.5px] text-[#172124] focus:outline-none focus:border-[#172124] focus:bg-white font-sans"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3.5">
                <div>
                  <label className="block text-[11.5px] font-semibold text-[#8B7D68] uppercase tracking-wider mb-1.5">Bedrooms</label>
                  <input
                    type="number"
                    value={editForm.bedrooms ?? ""}
                    onChange={(e) => setEditForm({ ...editForm, bedrooms: Number(e.target.value) })}
                    className="w-full px-4 py-2.5 rounded-[12px] border border-[#EDE8E0] bg-[#FAF7F2] text-[13.5px] text-[#172124] focus:outline-none focus:border-[#172124] focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11.5px] font-semibold text-[#8B7D68] uppercase tracking-wider mb-1.5">Bathrooms</label>
                  <input
                    type="number"
                    value={editForm.bathrooms ?? ""}
                    onChange={(e) => setEditForm({ ...editForm, bathrooms: Number(e.target.value) })}
                    className="w-full px-4 py-2.5 rounded-[12px] border border-[#EDE8E0] bg-[#FAF7F2] text-[13.5px] text-[#172124] focus:outline-none focus:border-[#172124] focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11.5px] font-semibold text-[#8B7D68] uppercase tracking-wider mb-1.5">Area (sqft)</label>
                  <input
                    type="number"
                    value={editForm.area_sqft ?? ""}
                    onChange={(e) => setEditForm({ ...editForm, area_sqft: Number(e.target.value) })}
                    className="w-full px-4 py-2.5 rounded-[12px] border border-[#EDE8E0] bg-[#FAF7F2] text-[13.5px] text-[#172124] focus:outline-none focus:border-[#172124] focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[11.5px] font-semibold text-[#8B7D68] uppercase tracking-wider mb-1.5">Status</label>
                  <select
                    value={editForm.status || "active"}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value as PropertyStatus })}
                    className="w-full px-4 py-2.5 rounded-[12px] border border-[#EDE8E0] bg-[#FAF7F2] text-[13.5px] text-[#172124] focus:outline-none focus:border-[#172124] focus:bg-white"
                  >
                    <option value="active">Active (Published)</option>
                    <option value="inactive">Inactive (Draft)</option>
                    <option value="sold">Sold</option>
                    <option value="rented">Rented</option>
                  </select>
                </div>
                <div className="flex items-center pt-6">
                  <label className="flex items-center gap-2 cursor-pointer text-[13px] text-[#172124]">
                    <input
                      type="checkbox"
                      checked={Boolean(editForm.is_featured)}
                      onChange={(e) => setEditForm({ ...editForm, is_featured: e.target.checked })}
                      className="size-4 rounded accent-[#172124]"
                    />
                    <span>Featured listing</span>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-[#EDE8E0]">
                <button
                  type="button"
                  onClick={() => setEditingProperty(null)}
                  className="px-5 py-2.5 rounded-full border border-[#EDE8E0] text-[13px] font-semibold text-[#172124] hover:bg-[#FAF7F2] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSaving}
                  className="px-7 py-2.5 rounded-full text-white text-[13px] font-semibold disabled:opacity-50 bg-[#172124] hover:bg-[#2C383C] cursor-pointer shadow-xs"
                >
                  {editSaving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: PROPERTY PHOTO MANAGER ───────────────────────────────── */}
      {managingPhotosPropId && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-[24px] max-w-[820px] w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-[#EDE8E0]">
            <div className="px-7 py-5 border-b border-[#EDE8E0] flex items-center justify-between bg-[#FAF7F2]">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-[#8B7D68] block">
                  [ Media Vault ]
                </span>
                <h3 className="font-display font-bold text-[18px] text-[#172124]">
                  Manage Property Photos
                </h3>
              </div>
              <button
                onClick={() => setManagingPhotosPropId(null)}
                className="size-8 rounded-full hover:bg-gray-200 flex items-center justify-center text-gray-500 cursor-pointer"
              >
                <X className="size-4.5" />
              </button>
            </div>
            <div className="p-7 overflow-y-auto">
              <PropertyImageManager
                propertyId={managingPhotosPropId}
                onImagesUpdated={() => {
                  fetchProperties({ limit: 100 }).then((res) => setProperties(res.results || []));
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: DELETE CONFIRMATION ──────────────────────────────────── */}
      {deletingPropId && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-[24px] max-w-[420px] w-full p-7 flex flex-col gap-4 text-center shadow-2xl border border-[#EDE8E0]">
            <div className="mx-auto size-12 rounded-full bg-red-50 border border-red-100 flex items-center justify-center text-red-600">
              <Trash2 className="size-5" />
            </div>
            <div>
              <h3 className="text-[18px] font-display font-bold text-[#172124]">
                Delete Property Listing?
              </h3>
              <p className="text-[13px] text-[#717A7D] mt-1.5 leading-relaxed">
                Are you sure you want to delete this listing? This action removes the listing from the live database.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setDeletingPropId(null)}
                className="px-6 py-2.5 rounded-full border border-[#EDE8E0] text-[13px] font-semibold text-[#172124] hover:bg-[#FAF7F2] cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDeletePropertyConfirm}
                disabled={deleteLoading}
                className="px-6 py-2.5 rounded-full bg-red-600 text-white text-[13px] font-semibold hover:bg-red-700 disabled:opacity-50 cursor-pointer shadow-xs"
              >
                {deleteLoading ? "Deleting..." : "Confirm Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: SELLER DETAIL & DOCUMENT VAULT ─────────────────────────── */}
      {selectedSeller && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-[24px] max-w-[800px] w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-[#EDE8E0]">
            <div className="px-7 py-5 border-b border-[#EDE8E0] flex items-center justify-between bg-[#FAF7F2]">
              <div className="flex items-center gap-3.5">
                <div className="size-11 rounded-full bg-[#172124] text-[#C9AD86] border border-[#EDE8E0] flex items-center justify-center font-bold text-[16px]">
                  {selectedSeller.full_name?.charAt(0).toUpperCase() || "S"}
                </div>
                <div>
                  <h3 className="font-display font-bold text-[18px] text-[#172124]">
                    {selectedSeller.full_name}
                  </h3>
                  <p className="text-[12px] text-[#717A7D]">
                    {selectedSeller.email} • {selectedSeller.phone || "No phone"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedSeller(null)}
                className="size-8 rounded-full hover:bg-gray-200 flex items-center justify-center text-gray-500 cursor-pointer"
              >
                <X className="size-4.5" />
              </button>
            </div>

            <div className="p-7 overflow-y-auto flex flex-col gap-6">
              {/* Document Vault */}
              <div>
                <h4 className="font-display font-bold text-[16px] text-[#172124] mb-3.5 flex items-center gap-2">
                  <ShieldCheck className="size-4.5 text-[#8B7D68]" />
                  <span>Private Legal Documents ({selectedSeller.documents.length})</span>
                </h4>

                {selectedSeller.documents.length === 0 ? (
                  <div className="p-6 rounded-[14px] bg-[#FAF7F2] text-center text-[13px] text-gray-400 border border-[#EDE8E0]">
                    No documents uploaded by this seller yet.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {selectedSeller.documents.map((doc) => (
                      <div
                        key={doc.id}
                        className="p-4 rounded-[14px] border border-[#EDE8E0] bg-[#FAF7F2] flex items-center justify-between gap-3"
                      >
                        <div className="flex flex-col min-w-0">
                          <span className="font-semibold text-[13.5px] text-[#172124] truncate">{doc.title}</span>
                          <span className="text-[11px] text-[#8B7D68] font-mono uppercase font-semibold">{doc.doc_type}</span>
                        </div>
                        <button
                          onClick={() => handleBrokerDownloadSellerDoc(doc.id, doc.original_filename)}
                          className="px-3.5 py-1.5 rounded-full bg-[#172124] text-white text-[11.5px] font-semibold hover:bg-[#2C383C] transition-colors flex items-center gap-1 shrink-0 cursor-pointer"
                        >
                          <Download className="size-3.5" />
                          <span>Download</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Submissions */}
              <div>
                <h4 className="font-display font-bold text-[16px] text-[#172124] mb-3.5 flex items-center gap-2">
                  <Inbox className="size-4.5 text-[#8B7D68]" />
                  <span>Property Submissions ({selectedSeller.submissions.length})</span>
                </h4>

                {selectedSeller.submissions.length === 0 ? (
                  <div className="p-6 rounded-[14px] bg-[#FAF7F2] text-center text-[13px] text-gray-400 border border-[#EDE8E0]">
                    No submissions from this seller.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedSeller.submissions.map((sub: any) => (
                      <div key={sub.id} className="p-4 rounded-[14px] border border-[#EDE8E0] bg-[#FAF7F2] flex items-center justify-between gap-3">
                        <div>
                          <p className="font-display font-bold text-[15px] text-[#172124]">{sub.locality}, Goa</p>
                          <p className="text-[12px] text-[#717A7D] font-mono">{sub.property_type} • ₹{(sub.asking_price / 10000000).toFixed(2)} Cr</p>
                        </div>
                        <span className="px-3 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-[#B45309] border border-amber-200">
                          {sub.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="px-7 py-4.5 bg-[#FAF7F2] border-t border-[#EDE8E0] flex items-center justify-between">
              {selectedSeller.phone ? (
                <a
                  href={`https://wa.me/${selectedSeller.phone.replace(/\D/g, "")}?text=${encodeURIComponent(
                    `Hi ${selectedSeller.full_name}, this is ${globalBusinessProfile.broker_name || "Kassim Shaikh"} from Ashiyana Real Estate.`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-5 py-2.5 rounded-full border border-[#EDE8E0] bg-white text-[#172124] font-semibold text-[12.5px] flex items-center gap-2 hover:bg-[#FAF7F2] transition-colors"
                >
                  <MessageSquare className="size-4 text-emerald-600" />
                  <span>WhatsApp Seller</span>
                </a>
              ) : <div />}
              <button
                onClick={() => setSelectedSeller(null)}
                className="px-6 py-2.5 rounded-full border border-[#EDE8E0] text-[13px] font-semibold text-[#172124] hover:bg-white cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: SUBMISSION REVIEW & DECISION ───────────────────────────── */}
      {selectedSubmission && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-[24px] max-w-[620px] w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-[#EDE8E0]">
            <div className="px-7 py-5 border-b border-[#EDE8E0] flex items-center justify-between bg-[#FAF7F2]">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-[#8B7D68] block">
                  [ Seller CRM ]
                </span>
                <h3 className="font-display font-bold text-[18px] text-[#172124]">
                  Review Seller Submission
                </h3>
              </div>
              <button
                onClick={() => setSelectedSubmission(null)}
                className="size-8 rounded-full hover:bg-gray-200 flex items-center justify-center text-gray-500 cursor-pointer"
              >
                <X className="size-4.5" />
              </button>
            </div>

            <div className="p-7 overflow-y-auto flex flex-col gap-4">
              {subFeedback && (
                <div
                  className={`p-3.5 rounded-[12px] text-[13px] flex items-center gap-2 ${
                    subFeedback.type === "success" ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-red-50 text-red-800 border border-red-200"
                  }`}
                >
                  {subFeedback.type === "success" ? <CheckCircle2 className="size-4 text-[#17805B]" /> : <AlertCircle className="size-4 text-red-600" />}
                  <span>{subFeedback.message}</span>
                </div>
              )}

              <div className="p-5 rounded-[16px] bg-[#FAF7F2] border border-[#EDE8E0] flex flex-col gap-2">
                <span className="font-display font-bold text-[17px] text-[#172124]">{selectedSubmission.locality}, Goa</span>
                <div className="flex flex-wrap items-center gap-3 text-[12.5px] text-[#717A7D]">
                  <span>Seller: <strong className="text-[#172124]">{selectedSubmission.seller_name}</strong></span>
                  <span>•</span>
                  <span>Asking: <strong className="text-[#172124]">₹{(selectedSubmission.asking_price / 10000000).toFixed(2)} Cr</strong></span>
                  <span>•</span>
                  <span className="capitalize">{selectedSubmission.property_type}</span>
                </div>
              </div>

              <div>
                <label className="block text-[11.5px] font-semibold text-[#8B7D68] uppercase tracking-wider mb-1.5">
                  Broker Feedback / Approval Notes
                </label>
                <textarea
                  rows={3}
                  value={subBrokerNotes}
                  onChange={(e) => setSubBrokerNotes(e.target.value)}
                  placeholder="Notes for the seller or internal records..."
                  className="w-full p-3.5 rounded-[12px] border border-[#EDE8E0] bg-[#FAF7F2] text-[13.5px] text-[#172124] focus:outline-none focus:border-[#172124] focus:bg-white font-sans"
                />
              </div>

              <div>
                <label className="block text-[11.5px] font-semibold text-red-700 uppercase tracking-wider mb-1.5">
                  Rejection Reason (if rejecting)
                </label>
                <input
                  type="text"
                  value={subRejectionReason}
                  onChange={(e) => setSubRejectionReason(e.target.value)}
                  placeholder="e.g. Incomplete title documentation / price mismatch"
                  className="w-full px-4 py-2.5 rounded-[12px] border border-red-200 bg-red-50/40 text-[13.5px] text-[#172124] focus:outline-none focus:border-red-500 font-sans"
                />
              </div>
            </div>

            <div className="px-7 py-4.5 bg-[#FAF7F2] border-t border-[#EDE8E0] flex items-center justify-between gap-3">
              <button
                type="button"
                disabled={subSaving}
                onClick={() => handleRejectSubmission(selectedSubmission)}
                className="px-5 py-2.5 rounded-full border border-red-200 text-red-600 hover:bg-red-50 text-[13px] font-semibold transition-colors disabled:opacity-50 cursor-pointer"
              >
                Reject Submission
              </button>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setSelectedSubmission(null)}
                  className="px-5 py-2.5 rounded-full border border-[#EDE8E0] text-[13px] font-semibold text-[#172124] hover:bg-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={subSaving}
                  onClick={() => handleConvertSubmission(selectedSubmission)}
                  className="px-6 py-2.5 rounded-full text-white text-[13px] font-semibold shadow-xs hover:bg-[#2C383C] disabled:opacity-50 cursor-pointer bg-[#172124]"
                >
                  {subSaving ? "Publishing..." : "Accept & Publish Listing"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: LEAD UPDATE CRM ───────────────────────────────────────── */}
      {selectedEnquiry && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-[24px] max-w-[560px] w-full flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-[#EDE8E0]">
            <div className="px-7 py-5 border-b border-[#EDE8E0] flex items-center justify-between bg-[#FAF7F2]">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-[#8B7D68] block">
                  [ Buyer CRM ]
                </span>
                <h3 className="font-display font-bold text-[18px] text-[#172124]">
                  Manage Lead & Follow-Up
                </h3>
              </div>
              <button
                onClick={() => setSelectedEnquiry(null)}
                className="size-8 rounded-full hover:bg-gray-200 flex items-center justify-center text-gray-500 cursor-pointer"
              >
                <X className="size-4.5" />
              </button>
            </div>

            <div className="p-7 flex flex-col gap-4">
              {leadFeedback && (
                <div
                  className={`p-3.5 rounded-[12px] text-[13px] flex items-center gap-2 ${
                    leadFeedback.type === "success" ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-red-50 text-red-800 border border-red-200"
                  }`}
                >
                  {leadFeedback.type === "success" ? <CheckCircle2 className="size-4 text-[#17805B]" /> : <AlertCircle className="size-4 text-red-600" />}
                  <span>{leadFeedback.message}</span>
                </div>
              )}

              <div className="p-5 rounded-[16px] bg-[#FAF7F2] border border-[#EDE8E0] flex flex-col gap-1.5">
                <span className="font-display font-bold text-[16px] text-[#172124]">{selectedEnquiry.buyer_name}</span>
                <span className="text-[12.5px] text-[#717A7D]">{selectedEnquiry.property_title || "General Goa Inquiry"}</span>
                <p className="text-[12.5px] text-[#717A7D] italic mt-1 bg-white p-3 rounded-[10px] border border-[#EDE8E0]">
                  "{selectedEnquiry.message}"
                </p>
              </div>

              <div>
                <label className="block text-[11.5px] font-semibold text-[#8B7D68] uppercase tracking-wider mb-1.5">
                  Lead Status
                </label>
                <select
                  value={leadStatusVal}
                  onChange={(e) => setLeadStatusVal(e.target.value as LeadStatus)}
                  className="w-full px-4 py-2.5 rounded-[12px] border border-[#EDE8E0] bg-[#FAF7F2] text-[13.5px] text-[#172124] focus:outline-none focus:border-[#172124] focus:bg-white"
                >
                  <option value="new">New Lead</option>
                  <option value="contacted">Contacted / In Discussion</option>
                  <option value="site_visit">Site Visit Confirmed</option>
                  <option value="negotiation">Price / Term Negotiation</option>
                  <option value="closed">Closed Won (Deal Done)</option>
                  <option value="lost">Lost / Inactive</option>
                </select>
              </div>

              <div>
                <label className="block text-[11.5px] font-semibold text-[#8B7D68] uppercase tracking-wider mb-1.5">
                  Schedule Follow-up / Visit Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={leadFollowUpVal}
                  onChange={(e) => setLeadFollowUpVal(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-[12px] border border-[#EDE8E0] bg-[#FAF7F2] text-[13.5px] text-[#172124] focus:outline-none focus:border-[#172124] focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-[11.5px] font-semibold text-[#8B7D68] uppercase tracking-wider mb-1.5">
                  Broker Notes
                </label>
                <textarea
                  rows={3}
                  value={leadNotesVal}
                  onChange={(e) => setLeadNotesVal(e.target.value)}
                  placeholder="Record client budget, preferences, walkthrough notes..."
                  className="w-full p-3.5 rounded-[12px] border border-[#EDE8E0] bg-[#FAF7F2] text-[13.5px] text-[#172124] focus:outline-none focus:border-[#172124] focus:bg-white font-sans"
                />
              </div>
            </div>

            <div className="px-7 py-4.5 bg-[#FAF7F2] border-t border-[#EDE8E0] flex items-center justify-between gap-2.5">
              {!selectedEnquiry.is_archived ? (
                <button
                  type="button"
                  onClick={() => handleArchiveEnquiryAction(selectedEnquiry.id)}
                  className="px-4 py-2 rounded-full border border-amber-200 bg-amber-50/50 hover:bg-amber-100/60 text-amber-800 text-[12.5px] font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Archive className="size-3.5" />
                  <span>Archive Lead</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    handleUnarchiveEnquiryAction(selectedEnquiry.id);
                    setSelectedEnquiry(null);
                  }}
                  className="px-4 py-2 rounded-full border border-emerald-200 bg-emerald-50/50 hover:bg-emerald-100/60 text-[#17805B] text-[12.5px] font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <ArchiveRestore className="size-3.5" />
                  <span>Restore Lead</span>
                </button>
              )}

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setSelectedEnquiry(null)}
                  className="px-5 py-2.5 rounded-full border border-[#EDE8E0] text-[13px] font-semibold text-[#172124] hover:bg-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={leadSaving}
                  onClick={handleSaveLead}
                  className="px-6 py-2.5 rounded-full text-white text-[13px] font-semibold shadow-xs hover:bg-[#2C383C] disabled:opacity-50 cursor-pointer bg-[#172124]"
                >
                  {leadSaving ? "Saving..." : "Save Lead Updates"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: BUYER WATCHER LEAD INTELLIGENCE ─────────────────────── */}
      {selectedWatcherProperty && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-[24px] max-w-[620px] w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-[#EDE8E0]">
            <div className="px-7 py-5 border-b border-[#EDE8E0] flex items-center justify-between bg-[#FAF7F2]">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-[#8B7D68] block">
                  [ Lead Intelligence ]
                </span>
                <h3 className="font-display font-bold text-[18px] text-[#172124]">
                  Property Watchers & Saved Buyers
                </h3>
              </div>
              <button
                onClick={() => setSelectedWatcherProperty(null)}
                className="size-8 rounded-full hover:bg-gray-200 flex items-center justify-center text-gray-500 cursor-pointer"
                aria-label="Close watchers dialog"
              >
                <X className="size-4.5" />
              </button>
            </div>

            <div className="p-7 overflow-y-auto flex flex-col gap-5">
              {/* Property summary pill */}
              <div className="p-4 rounded-[16px] bg-[#FAF7F2] border border-[#EDE8E0] flex items-center justify-between gap-3">
                <div className="flex flex-col min-w-0">
                  <span className="font-semibold text-[14px] text-[#172124] truncate">
                    {selectedWatcherProperty.title}
                  </span>
                  <span className="text-[12px] text-[#717A7D]">
                    {selectedWatcherProperty.locality} • {formatPriceINR(selectedWatcherProperty.price, selectedWatcherProperty.listing_type)}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-900 border border-amber-200 text-xs font-bold shrink-0">
                  <Eye className="size-3.5 text-amber-700" />
                  <span>{loadingWatchersList ? "..." : propertyWatchersList.length}</span>
                  <span className="font-normal">{propertyWatchersList.length === 1 ? "Watcher" : "Watchers"}</span>
                </div>
              </div>

              {/* Watchers list / Loading / Empty */}
              {loadingWatchersList ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3 text-[#717A7D]">
                  <RefreshCw className="size-6 animate-spin text-[#8B7D68]" />
                  <span className="text-xs font-mono uppercase tracking-wider">Loading buyer intelligence...</span>
                </div>
              ) : propertyWatchersList.length === 0 ? (
                <div className="text-center py-12 px-6 rounded-[18px] border border-dashed border-[#EDE8E0] bg-[#FAF7F2]">
                  <EyeOff className="size-8 text-[#8B7D68] mx-auto mb-3" />
                  <h4 className="font-semibold text-[14.5px] text-[#172124]">No Watchers Yet</h4>
                  <p className="text-xs text-[#717A7D] mt-1 max-w-sm mx-auto">
                    No registered buyers have bookmarked this property yet. Watcher intelligence will update in real time as buyers save this listing.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between text-xs text-[#8B7D68] font-mono uppercase font-semibold">
                    <span>Interested Buyer</span>
                    <span>Saved Date</span>
                  </div>
                  {propertyWatchersList.map((watcher, idx) => (
                    <div
                      key={watcher.user_id || idx}
                      className="p-4 rounded-[14px] border border-[#EDE8E0] bg-white hover:border-[#172124]/20 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
                    >
                      <div className="flex items-start gap-3">
                        <div className="size-9 rounded-full bg-slate-900 text-amber-300 flex items-center justify-center font-bold text-xs shrink-0 border border-amber-500/20">
                          {watcher.buyer_name?.charAt(0).toUpperCase() || "B"}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-[13.5px] text-[#172124]">
                              {watcher.buyer_name || "Registered Buyer"}
                            </span>
                            {watcher.is_nri && (
                              <span className="px-2 py-0.2 rounded-full bg-blue-50 border border-blue-200 text-blue-800 text-[10px] font-bold font-mono">
                                NRI
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[12px] text-[#717A7D] mt-0.5">
                            {watcher.buyer_email && <span>{watcher.buyer_email}</span>}
                            {watcher.buyer_phone && (
                              <>
                                <span>•</span>
                                <span>{watcher.buyer_phone}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#EDE8E0]">
                        <span className="text-[11px] font-mono text-[#8B7D68] shrink-0">
                          {formatTimeAgo(watcher.saved_at)}
                        </span>
                        {watcher.buyer_phone && (
                          <div className="flex items-center gap-1.5">
                            <a
                              href={`https://wa.me/${watcher.buyer_phone.replace(/\D/g, "")}?text=${encodeURIComponent(
                                `Hi ${watcher.buyer_name || "there"}, this is ${globalBusinessProfile.broker_name || "Kassim Shaikh"} from Ashiyana Real Estate regarding ${selectedWatcherProperty.title}.`
                              )}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="size-7 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center hover:bg-emerald-100 transition-colors"
                              title="Chat on WhatsApp"
                            >
                              <MessageSquare className="size-3.5" />
                            </a>
                            <a
                              href={`tel:${watcher.buyer_phone.replace(/\s+/g, "")}`}
                              className="size-7 rounded-full bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center hover:bg-slate-200 transition-colors"
                              title="Call Buyer"
                            >
                              <Phone className="size-3.5" />
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="px-7 py-4.5 bg-[#FAF7F2] border-t border-[#EDE8E0] flex items-center justify-end">
              <button
                onClick={() => setSelectedWatcherProperty(null)}
                className="px-6 py-2 rounded-full border border-[#EDE8E0] text-[13px] font-semibold text-[#172124] hover:bg-white cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: FULLSCREEN IMAGE VIEWER ──────────────────────────────── */}
      {enlargedImageUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setEnlargedImageUrl(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center">
            <button
              onClick={() => setEnlargedImageUrl(null)}
              className="absolute -top-10 right-0 text-white hover:text-gray-300 p-2 cursor-pointer"
            >
              <X className="size-6" />
            </button>
            <img
              src={enlargedImageUrl}
              alt="Enlarged preview"
              className="max-h-[85vh] w-auto rounded-[16px] shadow-2xl object-contain border border-white/20"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}

      {/* ─── MODAL: CREATE DEAL ─────────────────────────────────────────────── */}
      {createDealModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-[24px] max-w-[640px] w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-[#EDE8E0]">
            <div className="px-7 py-5 border-b border-[#EDE8E0] flex items-center justify-between bg-[#FAF7F2]">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-[#8B7D68] block">
                  [ New Transaction ]
                </span>
                <h3 className="font-display font-bold text-[18px] text-[#172124]">
                  Create Deal Pipeline Record
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setCreateDealModalOpen(false)}
                className="size-8 rounded-full hover:bg-gray-200 flex items-center justify-center text-gray-500 cursor-pointer"
              >
                <X className="size-4.5" />
              </button>
            </div>

            <form onSubmit={handleCreateDealSubmit} className="flex flex-col flex-1 overflow-y-auto">
              <div className="p-7 flex flex-col gap-4">
                {dealFeedback && (
                  <div
                    className={`p-3.5 rounded-[12px] text-[13px] flex items-center gap-2 ${
                      dealFeedback.type === "success"
                        ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                        : "bg-red-50 text-red-800 border border-red-200"
                    }`}
                  >
                    {dealFeedback.type === "success" ? <CheckCircle2 className="size-4 text-[#17805B]" /> : <AlertCircle className="size-4 text-red-600" />}
                    <span>{dealFeedback.message}</span>
                  </div>
                )}

                <div>
                  <label className="block text-[11.5px] font-semibold text-[#8B7D68] uppercase tracking-wider mb-1.5">
                    Deal Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 4BHK Villa Sale - Assagao · Dr. Sharma"
                    value={newDealForm.title}
                    onChange={(e) => setNewDealForm({ ...newDealForm, title: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-[12px] border border-[#EDE8E0] bg-[#FAF7F2] text-[13.5px] text-[#172124] focus:outline-none focus:border-[#172124] focus:bg-white"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11.5px] font-semibold text-[#8B7D68] uppercase tracking-wider mb-1.5">
                      Associated Property
                    </label>
                    <select
                      value={newDealForm.property_id || ""}
                      onChange={(e) => setNewDealForm({ ...newDealForm, property_id: e.target.value || undefined })}
                      className="w-full px-4 py-2.5 rounded-[12px] border border-[#EDE8E0] bg-[#FAF7F2] text-[13.5px] text-[#172124] focus:outline-none focus:border-[#172124] focus:bg-white"
                    >
                      <option value="">No Property Attached</option>
                      {properties.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.title} ({p.locality})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11.5px] font-semibold text-[#8B7D68] uppercase tracking-wider mb-1.5">
                      Deal Stage
                    </label>
                    <select
                      value={newDealForm.status}
                      onChange={(e) => setNewDealForm({ ...newDealForm, status: e.target.value as DealStatus })}
                      className="w-full px-4 py-2.5 rounded-[12px] border border-[#EDE8E0] bg-[#FAF7F2] text-[13.5px] text-[#172124] focus:outline-none focus:border-[#172124] focus:bg-white"
                    >
                      <option value="inquiry">Inquiry</option>
                      <option value="negotiation">Negotiation</option>
                      <option value="agreement">Agreement Signed</option>
                      <option value="completed">Closed Won</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11.5px] font-semibold text-[#8B7D68] uppercase tracking-wider mb-1.5">
                      Buyer Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Vikramaditya Rao"
                      value={newDealForm.buyer_name || ""}
                      onChange={(e) => setNewDealForm({ ...newDealForm, buyer_name: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-[12px] border border-[#EDE8E0] bg-[#FAF7F2] text-[13.5px] text-[#172124] focus:outline-none focus:border-[#172124] focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11.5px] font-semibold text-[#8B7D68] uppercase tracking-wider mb-1.5">
                      Buyer Contact (Phone / Email)
                    </label>
                    <input
                      type="text"
                      placeholder="+91 98200 12345 / vikram@example.com"
                      value={newDealForm.buyer_contact || ""}
                      onChange={(e) => setNewDealForm({ ...newDealForm, buyer_contact: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-[12px] border border-[#EDE8E0] bg-[#FAF7F2] text-[13.5px] text-[#172124] focus:outline-none focus:border-[#172124] focus:bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11.5px] font-semibold text-[#8B7D68] uppercase tracking-wider mb-1.5">
                      Seller Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Maria Fernandes"
                      value={newDealForm.seller_name || ""}
                      onChange={(e) => setNewDealForm({ ...newDealForm, seller_name: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-[12px] border border-[#EDE8E0] bg-[#FAF7F2] text-[13.5px] text-[#172124] focus:outline-none focus:border-[#172124] focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11.5px] font-semibold text-[#8B7D68] uppercase tracking-wider mb-1.5">
                      Seller Contact (Phone / Email)
                    </label>
                    <input
                      type="text"
                      placeholder="+91 94220 98765 / maria@example.com"
                      value={newDealForm.seller_contact || ""}
                      onChange={(e) => setNewDealForm({ ...newDealForm, seller_contact: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-[12px] border border-[#EDE8E0] bg-[#FAF7F2] text-[13.5px] text-[#172124] focus:outline-none focus:border-[#172124] focus:bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[11.5px] font-semibold text-[#8B7D68] uppercase tracking-wider mb-1.5">
                      Agreed Price (INR)
                    </label>
                    <input
                      type="number"
                      placeholder="e.g. 45000000"
                      value={newDealForm.agreed_price || ""}
                      onChange={(e) => setNewDealForm({ ...newDealForm, agreed_price: e.target.value ? Number(e.target.value) : undefined })}
                      className="w-full px-4 py-2.5 rounded-[12px] border border-[#EDE8E0] bg-[#FAF7F2] text-[13.5px] text-[#172124] focus:outline-none focus:border-[#172124] focus:bg-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11.5px] font-semibold text-[#8B7D68] uppercase tracking-wider mb-1.5">
                      Commission (%)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="e.g. 2"
                      value={newDealForm.commission_rate || ""}
                      onChange={(e) => setNewDealForm({ ...newDealForm, commission_rate: e.target.value ? Number(e.target.value) : undefined })}
                      className="w-full px-4 py-2.5 rounded-[12px] border border-[#EDE8E0] bg-[#FAF7F2] text-[13.5px] text-[#172124] focus:outline-none focus:border-[#172124] focus:bg-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11.5px] font-semibold text-[#8B7D68] uppercase tracking-wider mb-1.5">
                      Target Closing Date
                    </label>
                    <input
                      type="date"
                      value={newDealForm.target_closing_date ? newDealForm.target_closing_date.substring(0, 10) : ""}
                      onChange={(e) => setNewDealForm({ ...newDealForm, target_closing_date: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
                      className="w-full px-4 py-2.5 rounded-[12px] border border-[#EDE8E0] bg-[#FAF7F2] text-[13.5px] text-[#172124] focus:outline-none focus:border-[#172124] focus:bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11.5px] font-semibold text-[#8B7D68] uppercase tracking-wider mb-1.5">
                    Confidential Broker Notes
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Document transaction terms, payment milestones, lawyer remarks..."
                    value={newDealForm.broker_notes || ""}
                    onChange={(e) => setNewDealForm({ ...newDealForm, broker_notes: e.target.value })}
                    className="w-full p-3.5 rounded-[12px] border border-[#EDE8E0] bg-[#FAF7F2] text-[13.5px] text-[#172124] focus:outline-none focus:border-[#172124] focus:bg-white"
                  />
                </div>
              </div>

              <div className="px-7 py-4.5 bg-[#FAF7F2] border-t border-[#EDE8E0] flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setCreateDealModalOpen(false)}
                  className="px-5 py-2.5 rounded-full border border-[#EDE8E0] text-[13px] font-semibold text-[#172124] hover:bg-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={dealSaving}
                  className="px-6 py-2.5 rounded-full text-white text-[13px] font-semibold shadow-xs hover:bg-[#2C383C] disabled:opacity-50 cursor-pointer bg-[#172124]"
                >
                  {dealSaving ? "Creating Deal..." : "Create Deal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: EDIT DEAL ───────────────────────────────────────────────── */}
      {editDealModalOpen && selectedDealDetail && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-[24px] max-w-[640px] w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-[#EDE8E0]">
            <div className="px-7 py-5 border-b border-[#EDE8E0] flex items-center justify-between bg-[#FAF7F2]">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-[#8B7D68] block">
                  [ Edit Deal ] {selectedDealDetail.deal_number}
                </span>
                <h3 className="font-display font-bold text-[18px] text-[#172124]">
                  Update Deal Commercials & Terms
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditDealModalOpen(false)}
                className="size-8 rounded-full hover:bg-gray-200 flex items-center justify-center text-gray-500 cursor-pointer"
              >
                <X className="size-4.5" />
              </button>
            </div>

            <form onSubmit={handleUpdateDealSubmit} className="flex flex-col flex-1 overflow-y-auto">
              <div className="p-7 flex flex-col gap-4">
                <div>
                  <label className="block text-[11.5px] font-semibold text-[#8B7D68] uppercase tracking-wider mb-1.5">
                    Deal Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={editDealForm.title || ""}
                    onChange={(e) => setEditDealForm({ ...editDealForm, title: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-[12px] border border-[#EDE8E0] bg-[#FAF7F2] text-[13.5px] text-[#172124] focus:outline-none focus:border-[#172124] focus:bg-white"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11.5px] font-semibold text-[#8B7D68] uppercase tracking-wider mb-1.5">
                      Associated Property
                    </label>
                    <select
                      value={editDealForm.property_id || ""}
                      onChange={(e) => setEditDealForm({ ...editDealForm, property_id: e.target.value || undefined })}
                      className="w-full px-4 py-2.5 rounded-[12px] border border-[#EDE8E0] bg-[#FAF7F2] text-[13.5px] text-[#172124] focus:outline-none focus:border-[#172124] focus:bg-white"
                    >
                      <option value="">No Property Attached</option>
                      {properties.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.title} ({p.locality})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11.5px] font-semibold text-[#8B7D68] uppercase tracking-wider mb-1.5">
                      Stage
                    </label>
                    <select
                      value={editDealForm.status}
                      onChange={(e) => setEditDealForm({ ...editDealForm, status: e.target.value as DealStatus })}
                      className="w-full px-4 py-2.5 rounded-[12px] border border-[#EDE8E0] bg-[#FAF7F2] text-[13.5px] text-[#172124] focus:outline-none focus:border-[#172124] focus:bg-white"
                    >
                      <option value="inquiry">Inquiry</option>
                      <option value="negotiation">Negotiation</option>
                      <option value="agreement">Agreement Signed</option>
                      <option value="completed">Closed Won</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11.5px] font-semibold text-[#8B7D68] uppercase tracking-wider mb-1.5">
                      Buyer Name
                    </label>
                    <input
                      type="text"
                      value={editDealForm.buyer_name || ""}
                      onChange={(e) => setEditDealForm({ ...editDealForm, buyer_name: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-[12px] border border-[#EDE8E0] bg-[#FAF7F2] text-[13.5px] text-[#172124] focus:outline-none focus:border-[#172124] focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11.5px] font-semibold text-[#8B7D68] uppercase tracking-wider mb-1.5">
                      Buyer Contact
                    </label>
                    <input
                      type="text"
                      value={editDealForm.buyer_contact || ""}
                      onChange={(e) => setEditDealForm({ ...editDealForm, buyer_contact: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-[12px] border border-[#EDE8E0] bg-[#FAF7F2] text-[13.5px] text-[#172124] focus:outline-none focus:border-[#172124] focus:bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11.5px] font-semibold text-[#8B7D68] uppercase tracking-wider mb-1.5">
                      Seller Name
                    </label>
                    <input
                      type="text"
                      value={editDealForm.seller_name || ""}
                      onChange={(e) => setEditDealForm({ ...editDealForm, seller_name: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-[12px] border border-[#EDE8E0] bg-[#FAF7F2] text-[13.5px] text-[#172124] focus:outline-none focus:border-[#172124] focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11.5px] font-semibold text-[#8B7D68] uppercase tracking-wider mb-1.5">
                      Seller Contact
                    </label>
                    <input
                      type="text"
                      value={editDealForm.seller_contact || ""}
                      onChange={(e) => setEditDealForm({ ...editDealForm, seller_contact: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-[12px] border border-[#EDE8E0] bg-[#FAF7F2] text-[13.5px] text-[#172124] focus:outline-none focus:border-[#172124] focus:bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[11.5px] font-semibold text-[#8B7D68] uppercase tracking-wider mb-1.5">
                      Agreed Price (INR)
                    </label>
                    <input
                      type="number"
                      value={editDealForm.agreed_price || ""}
                      onChange={(e) => setEditDealForm({ ...editDealForm, agreed_price: e.target.value ? Number(e.target.value) : undefined })}
                      className="w-full px-4 py-2.5 rounded-[12px] border border-[#EDE8E0] bg-[#FAF7F2] text-[13.5px] text-[#172124] focus:outline-none focus:border-[#172124] focus:bg-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11.5px] font-semibold text-[#8B7D68] uppercase tracking-wider mb-1.5">
                      Commission (%)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={editDealForm.commission_rate || ""}
                      onChange={(e) => setEditDealForm({ ...editDealForm, commission_rate: e.target.value ? Number(e.target.value) : undefined })}
                      className="w-full px-4 py-2.5 rounded-[12px] border border-[#EDE8E0] bg-[#FAF7F2] text-[13.5px] text-[#172124] focus:outline-none focus:border-[#172124] focus:bg-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11.5px] font-semibold text-[#8B7D68] uppercase tracking-wider mb-1.5">
                      Commission (INR)
                    </label>
                    <input
                      type="number"
                      value={editDealForm.commission_amount || ""}
                      onChange={(e) => setEditDealForm({ ...editDealForm, commission_amount: e.target.value ? Number(e.target.value) : undefined })}
                      className="w-full px-4 py-2.5 rounded-[12px] border border-[#EDE8E0] bg-[#FAF7F2] text-[13.5px] text-[#172124] focus:outline-none focus:border-[#172124] focus:bg-white font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11.5px] font-semibold text-[#8B7D68] uppercase tracking-wider mb-1.5">
                      Target Closing Date
                    </label>
                    <input
                      type="date"
                      value={editDealForm.target_closing_date ? editDealForm.target_closing_date.substring(0, 10) : ""}
                      onChange={(e) => setEditDealForm({ ...editDealForm, target_closing_date: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
                      className="w-full px-4 py-2.5 rounded-[12px] border border-[#EDE8E0] bg-[#FAF7F2] text-[13.5px] text-[#172124] focus:outline-none focus:border-[#172124] focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11.5px] font-semibold text-[#8B7D68] uppercase tracking-wider mb-1.5">
                      Actual Closing Date
                    </label>
                    <input
                      type="date"
                      value={editDealForm.actual_closing_date ? editDealForm.actual_closing_date.substring(0, 10) : ""}
                      onChange={(e) => setEditDealForm({ ...editDealForm, actual_closing_date: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
                      className="w-full px-4 py-2.5 rounded-[12px] border border-[#EDE8E0] bg-[#FAF7F2] text-[13.5px] text-[#172124] focus:outline-none focus:border-[#172124] focus:bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11.5px] font-semibold text-[#8B7D68] uppercase tracking-wider mb-1.5">
                    Confidential Broker Notes
                  </label>
                  <textarea
                    rows={3}
                    value={editDealForm.broker_notes || ""}
                    onChange={(e) => setEditDealForm({ ...editDealForm, broker_notes: e.target.value })}
                    className="w-full p-3.5 rounded-[12px] border border-[#EDE8E0] bg-[#FAF7F2] text-[13.5px] text-[#172124] focus:outline-none focus:border-[#172124] focus:bg-white"
                  />
                </div>
              </div>

              <div className="px-7 py-4.5 bg-[#FAF7F2] border-t border-[#EDE8E0] flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditDealModalOpen(false)}
                  className="px-5 py-2.5 rounded-full border border-[#EDE8E0] text-[13px] font-semibold text-[#172124] hover:bg-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={dealSaving}
                  className="px-6 py-2.5 rounded-full text-white text-[13px] font-semibold shadow-xs hover:bg-[#2C383C] disabled:opacity-50 cursor-pointer bg-[#172124]"
                >
                  {dealSaving ? "Saving..." : "Save Deal Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: UPLOAD DEAL DOCUMENT ─────────────────────────────────────── */}
      {uploadDocModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-[24px] max-w-[540px] w-full flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-[#EDE8E0]">
            <div className="px-7 py-5 border-b border-[#EDE8E0] flex items-center justify-between bg-[#FAF7F2]">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-[#8B7D68] block">
                  [ Secure Vault ]
                </span>
                <h3 className="font-display font-bold text-[18px] text-[#172124]">
                  Upload Deal Document
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setUploadDocModalOpen(false)}
                className="size-8 rounded-full hover:bg-gray-200 flex items-center justify-center text-gray-500 cursor-pointer"
              >
                <X className="size-4.5" />
              </button>
            </div>

            <form onSubmit={handleUploadDealDocSubmit} className="p-7 flex flex-col gap-4">
              {uploadDealDocError && (
                <div className="p-3.5 rounded-[12px] bg-red-50 text-red-800 border border-red-200 text-[13px] flex items-center gap-2">
                  <AlertCircle className="size-4 text-red-600 shrink-0" />
                  <span>{uploadDealDocError}</span>
                </div>
              )}

              <div>
                <label className="block text-[11.5px] font-semibold text-[#8B7D68] uppercase tracking-wider mb-1.5">
                  Document Category *
                </label>
                <select
                  value={uploadDocCategory}
                  onChange={(e) => setUploadDocCategory(e.target.value as DealDocumentCategory)}
                  className="w-full px-4 py-2.5 rounded-[12px] border border-[#EDE8E0] bg-[#FAF7F2] text-[13.5px] text-[#172124] focus:outline-none focus:border-[#172124] focus:bg-white"
                >
                  <option value="property">Property Document (Title, 7/12, NOC)</option>
                  <option value="seller">Seller KYC & Ownership Deeds</option>
                  <option value="buyer">Buyer Identification & Proofs</option>
                  <option value="legal">Legal Agreements & Power of Attorney</option>
                  <option value="financial">Financial, Tax & Escrow Receipts</option>
                  <option value="other">Other Deal Attachment</option>
                </select>
              </div>

              <div>
                <label className="block text-[11.5px] font-semibold text-[#8B7D68] uppercase tracking-wider mb-1.5">
                  Document Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Registered Sale Deed - Assagao Estate"
                  value={uploadDocTitle}
                  onChange={(e) => setUploadDocTitle(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-[12px] border border-[#EDE8E0] bg-[#FAF7F2] text-[13.5px] text-[#172124] focus:outline-none focus:border-[#172124] focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-[11.5px] font-semibold text-[#8B7D68] uppercase tracking-wider mb-1.5">
                  Select File (PDF, PNG, JPG max 15MB) *
                </label>
                <input
                  type="file"
                  required
                  accept=".pdf,.png,.jpg,.jpeg,.webp"
                  onChange={(e) => setSelectedDealDocFile(e.target.files?.[0] || null)}
                  className="w-full text-[13px] text-[#172124]/70 file:mr-3 file:py-2.5 file:px-5 file:rounded-full file:border-0 file:text-[12.5px] file:font-semibold file:bg-[#172124] file:text-white hover:file:bg-[#2C383C] cursor-pointer"
                />
              </div>

              <div className="pt-4 border-t border-[#EDE8E0] flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setUploadDocModalOpen(false)}
                  className="px-5 py-2.5 rounded-full border border-[#EDE8E0] text-[13px] font-semibold text-[#172124] hover:bg-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploadingDealDoc}
                  className="px-6 py-2.5 rounded-full text-white text-[13px] font-semibold shadow-xs hover:bg-[#2C383C] disabled:opacity-50 cursor-pointer bg-[#172124] flex items-center gap-2"
                >
                  <UploadCloud className="size-4 text-[#C9AD86]" />
                  <span>{uploadingDealDoc ? "Encrypting & Uploading..." : "Upload to Vault"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: DELETE DEAL CONFIRMATION ─────────────────────────────────── */}
      {deletingDealConfirmId && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-[24px] max-w-[420px] w-full p-6 sm:p-7 flex flex-col gap-4 shadow-2xl animate-in fade-in zoom-in-95 duration-200 border border-[#EDE8E0]">
            <div className="size-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center">
              <Trash2 className="size-6" />
            </div>
            <div>
              <h3 className="font-display font-bold text-[18px] text-[#172124]">
                Delete Deal Record?
              </h3>
              <p className="text-[13px] text-[#717A7D] mt-1">
                Are you sure you want to permanently delete this deal and remove all linked vault documents?
              </p>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingDealConfirmId(null)}
                className="flex-1 py-2.5 rounded-full border border-[#EDE8E0] text-[#172124] text-[13px] font-semibold hover:bg-[#FAF7F2] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteDealLoading}
                onClick={handleDeleteDealConfirm}
                className="flex-1 py-2.5 rounded-full bg-red-600 text-white text-[13px] font-semibold hover:bg-red-700 disabled:opacity-50 cursor-pointer"
              >
                {deleteDealLoading ? "Deleting..." : "Confirm Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: DELETE DOCUMENT CONFIRMATION ─────────────────────────────── */}
      {deletingDealDocId && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-[24px] max-w-[420px] w-full p-6 sm:p-7 flex flex-col gap-4 shadow-2xl animate-in fade-in zoom-in-95 duration-200 border border-[#EDE8E0]">
            <div className="size-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center">
              <Trash2 className="size-6" />
            </div>
            <div>
              <h3 className="font-display font-bold text-[18px] text-[#172124]">
                Delete Document?
              </h3>
              <p className="text-[13px] text-[#717A7D] mt-1">
                Are you sure you want to permanently remove this document from the deal vault?
              </p>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingDealDocId(null)}
                className="flex-1 py-2.5 rounded-full border border-[#EDE8E0] text-[#172124] text-[13px] font-semibold hover:bg-[#FAF7F2] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteDealDocLoading}
                onClick={handleDeleteDealDocConfirm}
                className="flex-1 py-2.5 rounded-full bg-red-600 text-white text-[13px] font-semibold hover:bg-red-700 disabled:opacity-50 cursor-pointer"
              >
                {deleteDealDocLoading ? "Deleting..." : "Confirm Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

