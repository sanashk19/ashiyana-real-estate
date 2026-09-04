import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import {
  PropertyCardDto,
  fetchMySavedProperties,
  saveProperty,
  unsaveProperty,
  getUserAuthToken,
  setUserAuthToken,
  clearUserAuthToken,
  getActiveAuthToken,
  loginUser,
  registerUser,
  fetchCurrentUserProfile,
  UserProfileDto,
} from "@/lib/api";
import { Bookmark, Lock, Mail, User, Phone, X, ArrowRight, CheckCircle2, AlertCircle } from "lucide-react";

interface SavedPropertiesContextType {
  savedIds: Set<string>;
  savedProperties: PropertyCardDto[];
  loading: boolean;
  isSaved: (propertyId: string) => boolean;
  toggleSave: (propertyId: string, card?: PropertyCardDto) => Promise<boolean>;
  refreshSaved: () => Promise<void>;
  authModalOpen: boolean;
  openAuthModal: () => void;
  closeAuthModal: () => void;
  buyerUser: UserProfileDto | null;
  logoutBuyer: () => void;
}

const SavedPropertiesContext = createContext<SavedPropertiesContextType | undefined>(undefined);

export const SavedPropertiesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [savedProperties, setSavedProperties] = useState<PropertyCardDto[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);
  const [pendingPropertyId, setPendingPropertyId] = useState<string | null>(null);
  const [buyerUser, setBuyerUser] = useState<UserProfileDto | null>(null);

  // Auth modal form state
  const [isRegisterMode, setIsRegisterMode] = useState<boolean>(false);
  const [authFullName, setAuthFullName] = useState<string>("");
  const [authEmail, setAuthEmail] = useState<string>("");
  const [authPhone, setAuthPhone] = useState<string>("");
  const [authPassword, setAuthPassword] = useState<string>("");
  const [authLoading, setAuthLoading] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);

  const refreshSaved = useCallback(async () => {
    const token = getActiveAuthToken();
    if (!token) {
      setSavedIds(new Set());
      setSavedProperties([]);
      setBuyerUser(null);
      return;
    }

    try {
      setLoading(true);
      const [props, profile] = await Promise.all([
        fetchMySavedProperties().catch(() => []),
        fetchCurrentUserProfile().catch(() => null),
      ]);
      setSavedProperties(props);
      setSavedIds(new Set(props.map((p) => p.id)));
      if (profile) setBuyerUser(profile);
    } catch {
      // Fallback silently if not authenticated
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshSaved();
  }, [refreshSaved]);

  const isSaved = useCallback(
    (propertyId: string) => {
      return savedIds.has(propertyId);
    },
    [savedIds]
  );

  const toggleSave = useCallback(
    async (propertyId: string, card?: PropertyCardDto): Promise<boolean> => {
      const token = getActiveAuthToken();
      if (!token) {
        setPendingPropertyId(propertyId);
        setAuthModalOpen(true);
        return false;
      }

      const alreadySaved = savedIds.has(propertyId);

      // Optimistic update
      setSavedIds((prev) => {
        const next = new Set(prev);
        if (alreadySaved) {
          next.delete(propertyId);
        } else {
          next.add(propertyId);
        }
        return next;
      });

      if (alreadySaved) {
        setSavedProperties((prev) => prev.filter((p) => p.id !== propertyId));
      } else if (card) {
        setSavedProperties((prev) => [card, ...prev.filter((p) => p.id !== propertyId)]);
      }

      try {
        if (alreadySaved) {
          await unsaveProperty(propertyId);
        } else {
          await saveProperty(propertyId);
        }
        return !alreadySaved;
      } catch (err) {
        // Rollback on failure
        setSavedIds((prev) => {
          const next = new Set(prev);
          if (alreadySaved) {
            next.add(propertyId);
          } else {
            next.delete(propertyId);
          }
          return next;
        });
        await refreshSaved();
        throw err;
      }
    },
    [savedIds, refreshSaved]
  );

  const logoutBuyer = useCallback(() => {
    clearUserAuthToken();
    setBuyerUser(null);
    setSavedIds(new Set());
    setSavedProperties([]);
  }, []);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError(null);
    setAuthSuccess(null);

    try {
      if (isRegisterMode) {
        if (!authFullName.trim() || !authEmail.trim() || !authPassword.trim()) {
          throw new Error("Please complete all required fields.");
        }
        await registerUser({
          full_name: authFullName.trim(),
          email: authEmail.trim(),
          phone: authPhone.trim() || undefined,
          password: authPassword,
        });
        setAuthSuccess("Account created successfully!");
      } else {
        if (!authEmail.trim() || !authPassword.trim()) {
          throw new Error("Please enter your email and password.");
        }
        await loginUser({
          email: authEmail.trim(),
          password: authPassword,
        });
        setAuthSuccess("Welcome back!");
      }

      // Refresh saved properties
      await refreshSaved();

      // If there was a pending save, execute it
      if (pendingPropertyId) {
        try {
          await saveProperty(pendingPropertyId);
          setSavedIds((prev) => new Set([...prev, pendingPropertyId]));
          await refreshSaved();
        } catch {
          // Ignore if already saved
        }
        setPendingPropertyId(null);
      }

      setTimeout(() => {
        setAuthModalOpen(false);
        setAuthSuccess(null);
        setAuthPassword("");
      }, 700);
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail ||
        err?.message ||
        "Authentication failed. Please check your credentials.";
      setAuthError(msg);
    } finally {
      setAuthLoading(false);
    }
  };

  return (
    <SavedPropertiesContext.Provider
      value={{
        savedIds,
        savedProperties,
        loading,
        isSaved,
        toggleSave,
        refreshSaved,
        authModalOpen,
        openAuthModal: () => setAuthModalOpen(true),
        closeAuthModal: () => {
          setAuthModalOpen(false);
          setPendingPropertyId(null);
          setAuthError(null);
        },
        buyerUser,
        logoutBuyer,
      }}
    >
      {children}

      {/* Buyer Authentication Modal */}
      {authModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
          aria-labelledby="buyer-auth-title"
        >
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl text-slate-100">
            {/* Close Button */}
            <button
              onClick={() => {
                setAuthModalOpen(false);
                setPendingPropertyId(null);
                setAuthError(null);
              }}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/80 transition-colors"
              aria-label="Close authentication modal"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <Bookmark className="w-5 h-5 fill-amber-400/20" />
              </div>
              <div>
                <h3 id="buyer-auth-title" className="text-xl font-semibold text-white">
                  {isRegisterMode ? "Create Client Account" : "Sign in to Save Listings"}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {isRegisterMode
                    ? "Join Ashiyana to curate your luxury Goa property portfolio"
                    : "Access your bookmarked villas, apartments, and plots"}
                </p>
              </div>
            </div>

            {/* Status alerts */}
            {authError && (
              <div className="mb-5 p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center space-x-2.5 text-xs text-rose-300">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{authError}</span>
              </div>
            )}
            {authSuccess && (
              <div className="mb-5 p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center space-x-2.5 text-xs text-emerald-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{authSuccess}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleAuthSubmit} className="space-y-4">
              {isRegisterMode && (
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Full Name *
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="text"
                      required
                      value={authFullName}
                      onChange={(e) => setAuthFullName(e.target.value)}
                      placeholder="e.g. Rohini Deshmukh"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/60 transition-colors"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Email Address *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="email"
                    required
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    placeholder="client@example.com"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/60 transition-colors"
                  />
                </div>
              </div>

              {isRegisterMode && (
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Phone / WhatsApp Number (Optional)
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="tel"
                      value={authPhone}
                      onChange={(e) => setAuthPhone(e.target.value)}
                      placeholder="+91 98221 XXXXX"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/60 transition-colors"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Password *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="password"
                    required
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/60 transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={authLoading}
                className="w-full mt-2 py-3 px-4 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-semibold text-sm rounded-xl flex items-center justify-center space-x-2 transition-all shadow-lg shadow-amber-500/20 active:scale-[0.99]"
              >
                <span>
                  {authLoading
                    ? "Processing..."
                    : isRegisterMode
                    ? "Create Account & Save"
                    : "Sign In & Continue"}
                </span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            {/* Toggle Sign in / Register */}
            <div className="mt-6 pt-4 border-t border-slate-800 text-center">
              <button
                type="button"
                onClick={() => {
                  setIsRegisterMode(!isRegisterMode);
                  setAuthError(null);
                  setAuthSuccess(null);
                }}
                className="text-xs text-slate-400 hover:text-amber-400 transition-colors"
              >
                {isRegisterMode ? (
                  <>
                    Already have an account? <span className="text-amber-400 underline ml-1">Sign in</span>
                  </>
                ) : (
                  <>
                    Don't have an account? <span className="text-amber-400 underline ml-1">Register for free</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </SavedPropertiesContext.Provider>
  );
};

export const useSavedProperties = () => {
  const context = useContext(SavedPropertiesContext);
  if (!context) {
    throw new Error("useSavedProperties must be used within a SavedPropertiesProvider");
  }
  return context;
};
