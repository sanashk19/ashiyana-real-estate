import React, { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router";
import {
  LayoutDashboard,
  FileText,
  Home,
  ShieldCheck,
  User,
  LogOut,
  Plus,
  Eye,
  EyeOff,
  AlertCircle,
  Clock,
  ChevronRight,
  Menu,
  X,
  Building2,
  Sparkles,
} from "lucide-react";
import {
  getSellerAuthToken,
  clearSellerAuthToken,
  loginSeller,
  registerSeller,
  fetchCurrentUserProfile,
  fetchSellerDashboardStats,
  fetchSellerSubmissions,
  fetchSellerProperties,
  SellerDashboardStatsDto,
  SellerListedPropertyDto,
  SellerSubmissionDto,
  UserProfileDto,
  formatSubmissionStatusLabel,
} from "@/lib/api";
import { getApiErrorMessage } from "@/lib/errorUtils";
import { AshiyanaLogo, GREEN } from "@/lib/shared";
import { SiteNavbar } from "@/components/SiteNavbar";
import { SiteFooter } from "@/components/SiteFooter";

type SellerTab = "overview" | "submissions" | "properties" | "profile";

export default function SellerPortalPage() {
  const [searchParams] = useSearchParams();
  const initialMode = searchParams.get("mode") === "register" ? "register" : "login";

  const [authToken, setAuthTokenState] = useState<string | null>(getSellerAuthToken());
  const [userProfile, setUserProfile] = useState<UserProfileDto | null>(null);
  const [activeTab, setActiveTab] = useState<SellerTab>("overview");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Auth Form State
  const [authMode, setAuthMode] = useState<"login" | "register">(initialMode);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [registerName, setRegisterName] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPhone, setRegisterPhone] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");

  // Dashboard Data State
  const [stats, setStats] = useState<SellerDashboardStatsDto | null>(null);
  const [submissions, setSubmissions] = useState<SellerSubmissionDto[]>([]);
  const [properties, setProperties] = useState<SellerListedPropertyDto[]>([]);

  // Initial Load & Auth Check
  useEffect(() => {
    if (authToken) {
      fetchCurrentUserProfile()
        .then((profile) => {
          setUserProfile(profile);
          loadSellerData();
        })
        .catch((err) => {
          console.warn("Seller session expired:", err);
          clearSellerAuthToken();
          setAuthTokenState(null);
        });
    }
  }, [authToken]);

  const loadSellerData = async () => {
    setDataLoading(true);
    try {
      const [statsRes, subsRes, propsRes] = await Promise.allSettled([
        fetchSellerDashboardStats(),
        fetchSellerSubmissions(),
        fetchSellerProperties(),
      ]);

      if (statsRes.status === "fulfilled") setStats(statsRes.value);
      if (subsRes.status === "fulfilled") setSubmissions(subsRes.value);
      if (propsRes.status === "fulfilled") setProperties(propsRes.value);
    } catch (err) {
      console.error("Error loading seller data:", err);
    } finally {
      setDataLoading(false);
    }
  };

  // Auth Handlers
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError(null);
    try {
      const res = await loginSeller({
        email: loginEmail.trim(),
        password: loginPassword,
      });
      setAuthTokenState(res.access_token);
      const profile = await fetchCurrentUserProfile();
      setUserProfile(profile);
      setActiveTab("overview");
    } catch (err: any) {
      setAuthError(getApiErrorMessage(err, "Invalid email or password."));
    } finally {
      setAuthLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError(null);

    const digits = registerPhone.replace(/\D/g, "");
    if (digits.length < 7 || digits.length > 15) {
      setAuthError("Please provide a valid phone number with digits (7-15 numbers).");
      setAuthLoading(false);
      return;
    }

    try {
      const res = await registerSeller({
        full_name: registerName.trim(),
        email: registerEmail.trim(),
        phone: registerPhone.trim(),
        password: registerPassword,
      });
      setAuthTokenState(res.access_token);
      const profile = await fetchCurrentUserProfile();
      setUserProfile(profile);
      setActiveTab("overview");
    } catch (err: any) {
      setAuthError(getApiErrorMessage(err, "Could not create seller account. Please check your details."));
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    clearSellerAuthToken();
    setAuthTokenState(null);
    setUserProfile(null);
    setStats(null);
    setSubmissions([]);
    setProperties([]);
    setActiveTab("overview");
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER: Unauthenticated Seller Auth View
  // ─────────────────────────────────────────────────────────────────────────────
  if (!authToken || !userProfile) {
    return (
      <div className="bg-[#f8fafb] min-h-screen flex flex-col font-sans">
        <SiteNavbar variant="page" />

        <main className="flex-1 max-w-[540px] w-full mx-auto px-4 py-12 sm:py-16 flex flex-col items-center justify-center">
          <div className="bg-white rounded-[24px] border border-[#172023]/10 shadow-[0_4px_40px_rgba(23,32,35,0.06)] p-6 sm:p-10 w-full flex flex-col gap-6">
            
            <div className="flex flex-col items-center text-center gap-2">
              <div className="size-12 rounded-full bg-emerald-50 text-[#07be8a] flex items-center justify-center mb-1">
                <ShieldCheck className="size-6 text-[#07be8a]" />
              </div>
              <h1 className="font-semibold text-[24px] sm:text-[26px] text-[#172023]">
                {authMode === "login" ? "Seller Sign In" : "Create Seller Account"}
              </h1>
              <p className="text-[14px] text-[#172023]/60 max-w-[380px]">
                {authMode === "login"
                  ? "Access your property submissions and listing statuses."
                  : "Register as a verified property owner in Goa to track property submissions."}
              </p>
            </div>

            {/* Mode Switcher */}
            <div className="grid grid-cols-2 p-1 rounded-xl bg-gray-100 border border-gray-200/60">
              <button
                type="button"
                onClick={() => { setAuthMode("login"); setAuthError(null); }}
                className={`py-2 text-[13.5px] font-semibold rounded-lg transition-all cursor-pointer ${
                  authMode === "login" ? "bg-white text-[#172023] shadow-xs" : "text-[#172023]/60 hover:text-[#172023]"
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => { setAuthMode("register"); setAuthError(null); }}
                className={`py-2 text-[13.5px] font-semibold rounded-lg transition-all cursor-pointer ${
                  authMode === "register" ? "bg-white text-[#172023] shadow-xs" : "text-[#172023]/60 hover:text-[#172023]"
                }`}
              >
                Sign Up
              </button>
            </div>

            {authError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-[13px] flex items-start gap-2.5">
                <AlertCircle className="size-4 text-red-600 shrink-0 mt-0.5" />
                <span>{authError}</span>
              </div>
            )}

            {authMode === "login" ? (
              <form onSubmit={handleLoginSubmit} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[13px] font-semibold text-[#172023]/70 uppercase tracking-wider">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="e.g. ramesh@example.com"
                    className="w-full px-4 py-3 rounded-xl border border-[#172023]/15 bg-[#fcfdfe] text-[14.5px] text-[#172023] focus:outline-none focus:border-[#07be8a] focus:bg-white"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[13px] font-semibold text-[#172023]/70 uppercase tracking-wider">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="w-full pl-4 pr-11 py-3 rounded-xl border border-[#172023]/15 bg-[#fcfdfe] text-[14.5px] text-[#172023] focus:outline-none focus:border-[#07be8a] focus:bg-white"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((p) => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#172023]/40 hover:text-[#172023] p-1 cursor-pointer"
                      aria-label="Toggle password visibility"
                    >
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full py-3.5 rounded-full text-white font-semibold text-[15px] shadow-sm hover:opacity-95 active:scale-98 transition-all disabled:opacity-50 mt-2 cursor-pointer flex items-center justify-center gap-2"
                  style={{ backgroundColor: GREEN }}
                >
                  <span>{authLoading ? "Signing In..." : "Sign In to Seller Dashboard"}</span>
                  <ChevronRight className="size-4" />
                </button>
              </form>
            ) : (
              <form onSubmit={handleRegisterSubmit} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[13px] font-semibold text-[#172023]/70 uppercase tracking-wider">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={registerName}
                    onChange={(e) => setRegisterName(e.target.value)}
                    placeholder="e.g. Ramesh Naik"
                    className="w-full px-4 py-3 rounded-xl border border-[#172023]/15 bg-[#fcfdfe] text-[14.5px] text-[#172023] focus:outline-none focus:border-[#07be8a] focus:bg-white"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[13px] font-semibold text-[#172023]/70 uppercase tracking-wider">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={registerEmail}
                    onChange={(e) => setRegisterEmail(e.target.value)}
                    placeholder="e.g. ramesh@example.com"
                    className="w-full px-4 py-3 rounded-xl border border-[#172023]/15 bg-[#fcfdfe] text-[14.5px] text-[#172023] focus:outline-none focus:border-[#07be8a] focus:bg-white"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[13px] font-semibold text-[#172023]/70 uppercase tracking-wider">
                    Phone Number (WhatsApp) *
                  </label>
                  <input
                    type="tel"
                    required
                    value={registerPhone}
                    onChange={(e) => setRegisterPhone(e.target.value.replace(/[^\d+\-\s()]/g, ""))}
                    placeholder="+91 98765 43210"
                    className="w-full px-4 py-3 rounded-xl border border-[#172023]/15 bg-[#fcfdfe] text-[14.5px] text-[#172023] focus:outline-none focus:border-[#07be8a] focus:bg-white"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[13px] font-semibold text-[#172023]/70 uppercase tracking-wider">
                    Create Password (min 6 characters) *
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={registerPassword}
                      onChange={(e) => setRegisterPassword(e.target.value)}
                      className="w-full pl-4 pr-11 py-3 rounded-xl border border-[#172023]/15 bg-[#fcfdfe] text-[14.5px] text-[#172023] focus:outline-none focus:border-[#07be8a] focus:bg-white"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((p) => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#172023]/40 hover:text-[#172023] p-1 cursor-pointer"
                      aria-label="Toggle password visibility"
                    >
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full py-3.5 rounded-full text-white font-semibold text-[15px] shadow-sm hover:opacity-95 active:scale-98 transition-all disabled:opacity-50 mt-2 cursor-pointer flex items-center justify-center gap-2"
                  style={{ backgroundColor: GREEN }}
                >
                  <span>{authLoading ? "Creating Account..." : "Create Seller Account"}</span>
                  <ChevronRight className="size-4" />
                </button>
              </form>
            )}

            <div className="pt-4 border-t border-gray-100 text-center">
              <Link to="/sell" className="text-[13.5px] text-[#07be8a] font-semibold hover:underline">
                Want to submit a property as a guest first? Click here ↗
              </Link>
            </div>
          </div>
        </main>

        <SiteFooter />
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER: Authenticated Seller Dashboard View
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="bg-[#f8fafb] min-h-screen flex flex-col font-sans text-[#172023]">
      
      {/* ─── Seller Header ─────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-[#172023]/10 sticky top-0 z-40">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 h-[70px] flex items-center justify-between">
          
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-2" title="Return to Ashiyana Home">
              <AshiyanaLogo dark={true} className="h-[36px]" />
            </Link>
            <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-[#07be8a] text-[12px] font-semibold">
              <ShieldCheck className="size-3.5" />
              <span>Seller Account</span>
            </div>
          </div>

          {/* Desktop Nav Items */}
          <nav className="hidden lg:flex items-center gap-1">
            {[
              { id: "overview", label: "Overview", icon: LayoutDashboard },
              { id: "submissions", label: "My Submissions", icon: FileText, badge: submissions.length },
              { id: "properties", label: "My Properties", icon: Home, badge: properties.length },
              { id: "profile", label: "Profile", icon: User },
            ].map(({ id, label, icon: Icon, badge }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id as SellerTab)}
                className={`px-3.5 py-2 rounded-xl text-[13.5px] font-medium flex items-center gap-2 transition-all cursor-pointer ${
                  activeTab === id
                    ? "bg-[#07be8a]/10 text-[#07be8a] font-semibold"
                    : "text-[#172023]/70 hover:bg-gray-100 hover:text-[#172023]"
                }`}
              >
                <Icon className="size-4" />
                <span>{label}</span>
                {typeof badge === "number" && badge > 0 && (
                  <span className="px-1.5 py-0.5 text-[11px] rounded-full bg-[#172023]/10 text-[#172023] font-bold">
                    {badge}
                  </span>
                )}
              </button>
            ))}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <Link
              to="/sell"
              className="hidden sm:flex items-center gap-1.5 px-4 py-2 rounded-full text-white text-[13px] font-semibold shadow-2xs hover:opacity-95 transition-opacity"
              style={{ backgroundColor: GREEN }}
            >
              <Plus className="size-4" />
              <span>Submit Property</span>
            </Link>

            <button
              onClick={handleLogout}
              className="hidden md:flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-gray-200 text-[#172023]/70 hover:text-red-600 hover:border-red-200 transition-colors text-[13px] font-medium cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="size-3.5" />
              <span>Sign Out</span>
            </button>

            {/* Mobile Hamburger */}
            <button
              onClick={() => setMobileMenuOpen((p) => !p)}
              className="lg:hidden p-2 rounded-xl bg-gray-100 text-[#172023] hover:bg-gray-200 transition-colors"
              aria-label="Toggle navigation"
            >
              {mobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-white border-b border-gray-200 px-4 py-4 flex flex-col gap-2">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <p className="font-semibold text-[15px] text-[#172023]">{userProfile.full_name}</p>
                <p className="text-[12px] text-[#172023]/50">{userProfile.email}</p>
              </div>
              <div className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-[#07be8a] text-[11px] font-bold">
                Seller
              </div>
            </div>

            {[
              { id: "overview", label: "Overview", icon: LayoutDashboard },
              { id: "submissions", label: "My Submissions", icon: FileText, badge: submissions.length },
              { id: "properties", label: "My Properties", icon: Home, badge: properties.length },
              { id: "profile", label: "Profile & Settings", icon: User },
            ].map(({ id, label, icon: Icon, badge }) => (
              <button
                key={id}
                onClick={() => { setActiveTab(id as SellerTab); setMobileMenuOpen(false); }}
                className={`p-3 rounded-xl text-[14px] flex items-center justify-between transition-colors ${
                  activeTab === id ? "bg-emerald-50 text-[#07be8a] font-semibold" : "text-[#172023]/80 hover:bg-gray-50"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className="size-4.5" />
                  <span>{label}</span>
                </div>
                {typeof badge === "number" && badge > 0 && (
                  <span className="px-2 py-0.5 text-[11px] rounded-full bg-gray-200 font-bold">
                    {badge}
                  </span>
                )}
              </button>
            ))}

            <div className="pt-2 flex items-center justify-between border-t border-gray-100">
              <Link
                to="/sell"
                onClick={() => setMobileMenuOpen(false)}
                className="px-4 py-2.5 rounded-full text-white text-[13px] font-semibold flex items-center gap-1.5"
                style={{ backgroundColor: GREEN }}
              >
                <Plus className="size-4" />
                <span>Submit Property</span>
              </Link>
              <button
                onClick={handleLogout}
                className="px-4 py-2.5 rounded-full text-red-600 border border-red-200 text-[13px] font-medium flex items-center gap-1.5"
              >
                <LogOut className="size-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        )}
      </header>

      {/* ─── Main Content Body ──────────────────────────────────────────────── */}
      <main className="flex-1 max-w-[1200px] w-full mx-auto px-4 sm:px-6 py-8">
        
        {/* ── TAB 1: OVERVIEW ───────────────────────────────────────────────── */}
        {activeTab === "overview" && (
          <div className="flex flex-col gap-8 animate-in fade-in duration-200">
            
            {/* Welcome Banner */}
            <div className="bg-white rounded-[24px] border border-[#172023]/10 p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-2xs">
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2 text-[#07be8a] text-[13px] font-semibold">
                  <Sparkles className="size-4 text-[#07be8a]" />
                  <span>Welcome back</span>
                </div>
                <h2 className="font-semibold text-[26px] text-[#172023]">
                  {userProfile.full_name}
                </h2>
                <p className="text-[14px] text-[#172023]/60 max-w-[540px]">
                  Manage your property submissions in Goa and track broker listing approvals.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Link
                  to="/sell"
                  className="px-5 py-2.5 rounded-full text-white font-semibold text-[13.5px] hover:opacity-95 transition-opacity flex items-center gap-2 shadow-2xs"
                  style={{ backgroundColor: GREEN }}
                >
                  <Plus className="size-4" />
                  <span>Submit New Property</span>
                </Link>
              </div>
            </div>

            {/* Metrics Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
              {[
                {
                  label: "Total Submissions",
                  value: stats?.total_submissions ?? submissions.length,
                  icon: FileText,
                  color: "#07be8a",
                  bg: "bg-emerald-50",
                },
                {
                  label: "Pending Review",
                  value: stats?.pending_submissions ?? submissions.filter((s) => s.status === "pending" || s.status === "reviewing").length,
                  icon: Clock,
                  color: "#f59e0b",
                  bg: "bg-amber-50",
                },
                {
                  label: "Listed on Ashiyana",
                  value: stats?.listed_properties ?? properties.length,
                  icon: Home,
                  color: "#3b82f6",
                  bg: "bg-blue-50",
                },
              ].map(({ label, value, icon: Icon, color, bg }, idx) => (
                <div
                  key={idx}
                  className="bg-white rounded-[20px] border border-[#172023]/10 p-5 flex flex-col justify-between gap-4 shadow-2xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-medium text-[#172023]/60">{label}</span>
                    <div className={`size-9 rounded-xl ${bg} flex items-center justify-center`} style={{ color }}>
                      <Icon className="size-4.5" />
                    </div>
                  </div>
                  <span className="font-semibold text-[30px] text-[#172023]">
                    {value}
                  </span>
                </div>
              ))}
            </div>

            {/* Recent Submissions Snippet */}
            <div className="bg-white rounded-[24px] border border-[#172023]/10 p-6 sm:p-8 flex flex-col gap-6 shadow-2xs">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-[18px] text-[#172023]">
                    Recent Property Submissions
                  </h3>
                  <p className="text-[13px] text-[#172023]/50">
                    Live updates from Lead Broker Kassim Shaikh on your properties.
                  </p>
                </div>
                {submissions.length > 0 && (
                  <button
                    onClick={() => setActiveTab("submissions")}
                    className="text-[13.5px] font-semibold text-[#07be8a] hover:underline cursor-pointer"
                  >
                    View All ({submissions.length})
                  </button>
                )}
              </div>

              {submissions.length === 0 ? (
                <div className="py-12 border border-dashed border-gray-200 rounded-[18px] text-center flex flex-col items-center gap-3">
                  <div className="size-12 rounded-full bg-gray-100 flex items-center justify-center text-[#172023]/40">
                    <Building2 className="size-6" />
                  </div>
                  <h4 className="font-semibold text-[16px] text-[#172023]">No property submissions yet.</h4>
                  <p className="text-[13.5px] text-[#172023]/50 max-w-[360px]">
                    Submit your villa, apartment, or plot for a free valuation and direct broker listing.
                  </p>
                  <Link
                    to="/sell"
                    className="px-5 py-2.5 rounded-full text-white text-[13px] font-semibold mt-2"
                    style={{ backgroundColor: GREEN }}
                  >
                    Submit Property Now
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {submissions.slice(0, 4).map((sub) => (
                    <div
                      key={sub.id}
                      className="p-4 rounded-[16px] border border-gray-100 bg-[#fbfcfc] flex flex-col gap-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-[11px] font-bold uppercase tracking-wider text-[#07be8a]">
                            {sub.property_type} • {sub.listing_type}
                          </span>
                          <h4 className="font-semibold text-[16px] text-[#172023] mt-0.5">
                            {sub.locality}, Goa
                          </h4>
                        </div>
                        <span
                          className={`px-3 py-1 rounded-full text-[11.5px] font-semibold shrink-0 ${
                            sub.status === "listed"
                              ? "bg-emerald-100 text-emerald-800"
                              : sub.status === "rejected"
                              ? "bg-red-100 text-red-700"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {formatSubmissionStatusLabel(sub.status)}
                        </span>
                      </div>

                      <div className="flex items-center gap-4 text-[13px] text-[#172023]/60">
                        {sub.asking_price && (
                          <span>₹{(sub.asking_price / 10000000).toFixed(2)} Cr</span>
                        )}
                        {sub.area_sqft && <span>{sub.area_sqft.toLocaleString()} sqft</span>}
                        {sub.bedrooms && <span>{sub.bedrooms} BHK</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── TAB 2: MY SUBMISSIONS ─────────────────────────────────────────── */}
        {activeTab === "submissions" && (
          <div className="flex flex-col gap-6 animate-in fade-in duration-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="font-semibold text-[24px] text-[#172023]">
                  My Property Submissions
                </h2>
                <p className="text-[14px] text-[#172023]/50">
                  Track valuation and review progress for all submitted properties.
                </p>
              </div>
              <Link
                to="/sell"
                className="px-5 py-2.5 rounded-full text-white font-semibold text-[13.5px] flex items-center gap-2 self-start sm:self-auto"
                style={{ backgroundColor: GREEN }}
              >
                <Plus className="size-4" />
                <span>Submit Another Property</span>
              </Link>
            </div>

            {submissions.length === 0 ? (
              <div className="bg-white rounded-[24px] border border-[#172023]/10 p-12 text-center flex flex-col items-center gap-3">
                <div className="size-14 rounded-full bg-gray-100 flex items-center justify-center text-[#172023]/40">
                  <FileText className="size-7" />
                </div>
                <h3 className="font-semibold text-[18px] text-[#172023]">No property submissions yet.</h3>
                <p className="text-[14px] text-[#172023]/60 max-w-[420px]">
                  When you submit a property for sale or rent, it will appear here with live review updates.
                </p>
                <Link
                  to="/sell"
                  className="px-6 py-3 rounded-full text-white text-[14px] font-semibold mt-2"
                  style={{ backgroundColor: GREEN }}
                >
                  Submit Property for Free Valuation
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {submissions.map((sub) => (
                  <div
                    key={sub.id}
                    className="bg-white rounded-[22px] border border-[#172023]/10 p-6 flex flex-col justify-between gap-5 shadow-2xs"
                  >
                    <div className="flex flex-col gap-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <span className="text-[11.5px] font-bold uppercase tracking-wider text-[#07be8a]">
                            {sub.property_type} • For {sub.listing_type}
                          </span>
                          <h3 className="font-semibold text-[20px] text-[#172023] mt-0.5">
                            {sub.locality}, Goa
                          </h3>
                        </div>
                        <span
                          className={`px-3.5 py-1 rounded-full text-[12px] font-semibold shrink-0 ${
                            sub.status === "listed"
                              ? "bg-emerald-100 text-emerald-800"
                              : sub.status === "rejected"
                              ? "bg-red-100 text-red-700"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {formatSubmissionStatusLabel(sub.status)}
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 py-3 border-y border-gray-100 text-center">
                        <div>
                          <span className="text-[11px] text-[#172023]/50 uppercase font-semibold">Asking Price</span>
                          <p className="font-semibold text-[14px] text-[#172023]" style={fv}>
                            {sub.asking_price ? `₹${(sub.asking_price / 10000000).toFixed(2)} Cr` : "On Request"}
                          </p>
                        </div>
                        <div>
                          <span className="text-[11px] text-[#172023]/50 uppercase font-semibold">Area</span>
                          <p className="font-semibold text-[14px] text-[#172023]" style={fv}>
                            {sub.area_sqft ? `${sub.area_sqft} sqft` : "—"}
                          </p>
                        </div>
                        <div>
                          <span className="text-[11px] text-[#172023]/50 uppercase font-semibold">Bedrooms</span>
                          <p className="font-semibold text-[14px] text-[#172023]" style={fv}>
                            {sub.bedrooms ? `${sub.bedrooms} BHK` : "—"}
                          </p>
                        </div>
                      </div>

                      {sub.description && (
                        <p className="text-[13.5px] text-[#172023]/70 line-clamp-2 italic">
                          "{sub.description}"
                        </p>
                      )}

                      {sub.broker_notes && (
                        <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-100 text-[13px] text-blue-900">
                          <strong className="block text-[11px] uppercase tracking-wider text-blue-700 font-bold mb-0.5">
                            Broker Update:
                          </strong>
                          {sub.broker_notes}
                        </div>
                      )}

                      {sub.rejection_reason && (
                        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-[13px] text-red-800">
                          <strong>Reason: </strong> {sub.rejection_reason}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-[12px] text-[#172023]/40 pt-2 border-t border-gray-100">
                      <span>Submitted on {new Date(sub.created_at).toLocaleDateString()}</span>
                      {sub.converted_property_id && (
                        <Link
                          to={`/property/${sub.converted_property_id}`}
                          className="font-semibold text-[#07be8a] hover:underline"
                        >
                          View Public Listing ↗
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── TAB 3: MY PROPERTIES ──────────────────────────────────────────── */}
        {activeTab === "properties" && (
          <div className="flex flex-col gap-6 animate-in fade-in duration-200">
            <div>
              <h2 className="font-semibold text-[24px] text-[#172023]">
                My Listed Properties
              </h2>
              <p className="text-[14px] text-[#172023]/50">
                Properties verified and published on the live Ashiyana portal.
              </p>
            </div>

            {properties.length === 0 ? (
              <div className="bg-white rounded-[24px] border border-[#172023]/10 p-12 text-center flex flex-col items-center gap-3">
                <div className="size-14 rounded-full bg-gray-100 flex items-center justify-center text-[#172023]/40">
                  <Home className="size-7" />
                </div>
                <h3 className="font-semibold text-[18px] text-[#172023]">No listed properties yet.</h3>
                <p className="text-[14px] text-[#172023]/60 max-w-[420px]">
                  Once Lead Broker Kassim reviews and approves your submission, your property will be published and appear here.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {properties.map((p) => (
                  <div
                    key={p.id}
                    className="bg-white rounded-[22px] border border-[#172023]/10 overflow-hidden shadow-2xs flex flex-col"
                  >
                    <div className="aspect-[16/10] bg-gray-100 relative overflow-hidden">
                      <img
                        src={p.thumbnail_url || "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800"}
                        alt={p.title}
                        className="size-full object-cover"
                      />
                      <span className="absolute top-3 right-3 px-3 py-1 rounded-full text-[11.5px] font-bold bg-emerald-500 text-white uppercase tracking-wider">
                        {p.status}
                      </span>
                    </div>

                    <div className="p-5 flex flex-col gap-3 flex-1 justify-between">
                      <div>
                        <span className="text-[12px] text-[#07be8a] font-semibold uppercase">
                          {p.property_type} • {p.locality}
                        </span>
                        <h3 className="font-semibold text-[17px] text-[#172023] line-clamp-1 mt-0.5">
                          {p.title}
                        </h3>
                        <p className="font-bold text-[18px] text-[#07be8a] mt-1">
                          ₹{(p.price / 10000000).toFixed(2)} Cr
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                        <span className="text-[12px] text-[#172023]/50">{p.view_count} views</span>
                        <Link
                          to={`/property/${p.id}`}
                          className="px-4 py-1.5 rounded-full text-white text-[12.5px] font-semibold"
                          style={{ backgroundColor: GREEN }}
                        >
                          View Listing
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}


        {/* ── TAB 5: PROFILE ────────────────────────────────────────────────── */}
        {activeTab === "profile" && (
          <div className="max-w-[600px] flex flex-col gap-6 animate-in fade-in duration-200">
            <div>
              <h2 className="font-sans font-semibold text-[24px] text-[#172023]">
                Seller Profile & Settings
              </h2>
              <p className="text-[14px] text-[#172023]/50">
                Your verified contact information linked to submissions.
              </p>
            </div>

            <div className="bg-white rounded-[24px] border border-[#172023]/10 p-6 sm:p-8 flex flex-col gap-6 shadow-2xs">
              <div className="flex items-center gap-4 pb-6 border-b border-gray-100">
                <div className="size-16 rounded-full bg-emerald-100 text-[#07be8a] flex items-center justify-center font-bold text-2xl font-sans">
                  {userProfile.full_name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-semibold text-[18px] text-[#172023] font-sans">{userProfile.full_name}</h3>
                  <p className="text-[13px] text-[#172023]/50">{userProfile.email}</p>
                  <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-[#07be8a] text-[11px] font-bold">
                    Verified Seller Account
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-4 text-[14px]">
                <div>
                  <label className="text-[12px] font-semibold text-[#172023]/50 uppercase tracking-wider">Full Name</label>
                  <p className="font-medium text-[#172023] mt-0.5">{userProfile.full_name}</p>
                </div>
                <div>
                  <label className="text-[12px] font-semibold text-[#172023]/50 uppercase tracking-wider">Email Address</label>
                  <p className="font-medium text-[#172023] mt-0.5">{userProfile.email}</p>
                </div>
                <div>
                  <label className="text-[12px] font-semibold text-[#172023]/50 uppercase tracking-wider">Phone (WhatsApp)</label>
                  <p className="font-medium text-[#172023] mt-0.5">{userProfile.phone || "Not provided"}</p>
                </div>
                <div>
                  <label className="text-[12px] font-semibold text-[#172023]/50 uppercase tracking-wider">Account Created</label>
                  <p className="font-medium text-[#172023] mt-0.5">{new Date(userProfile.created_at).toLocaleDateString()}</p>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100 flex justify-between items-center">
                <button
                  onClick={handleLogout}
                  className="px-5 py-2.5 rounded-full text-red-600 border border-red-200 hover:bg-red-50 text-[13.5px] font-semibold flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <LogOut className="size-4" />
                  <span>Sign Out of Seller Portal</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </main>


      <SiteFooter />
    </div>
  );
}
