import { useEffect } from "react";
import { Link } from "react-router";
import { SiteNavbar } from "@/components/SiteNavbar";
import { SiteFooter } from "@/components/SiteFooter";
import { PropertyCard } from "@/components/PropertyCard";
import { useSavedProperties } from "@/context/SavedPropertiesContext";
import {
  Bookmark,
  Building2,
  ArrowRight,
  User,
  LogOut,
  Sparkles,
  Search,
  ShieldCheck,
} from "lucide-react";

export function SavedProperties() {
  const {
    savedProperties,
    loading,
    refreshSaved,
    buyerUser,
    logoutBuyer,
    openAuthModal,
  } = useSavedProperties();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    refreshSaved();
  }, [refreshSaved]);

  return (
    <div className="min-h-screen flex flex-col bg-[#FBF9F5] text-[#172124] selection:bg-[#C9AD86]/30">
      <SiteNavbar />

      {/* Hero Header */}
      <section className="relative pt-32 pb-16 px-6 sm:px-12 lg:px-16 bg-[#172124] text-white overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-[1400px] w-full mx-auto relative z-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/15 text-amber-300 text-xs font-medium uppercase tracking-wider mb-4">
                <Bookmark className="size-3.5 fill-amber-300/20" />
                <span>Buyer Portfolio</span>
              </div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-display font-bold tracking-tight text-white">
                Saved Properties
              </h1>
              <p className="mt-3 text-sm sm:text-base text-slate-300 leading-relaxed font-light">
                Your curated shortlist of luxury villas, coastal apartments, and bespoke estates in Goa.
              </p>
            </div>

            {/* Buyer profile state / Auth CTA */}
            <div className="flex items-center gap-3">
              {buyerUser ? (
                <div className="flex items-center gap-3 bg-slate-800/80 border border-slate-700/80 px-4 py-2.5 rounded-2xl">
                  <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center font-semibold text-xs border border-amber-500/30">
                    <User className="size-4" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-semibold text-white leading-tight">
                      {buyerUser.full_name}
                    </p>
                    <p className="text-[11px] text-slate-400 leading-tight truncate max-w-[160px]">
                      {buyerUser.email}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={logoutBuyer}
                    title="Sign Out"
                    className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors ml-1"
                    aria-label="Sign out of buyer account"
                  >
                    <LogOut className="size-4" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={openAuthModal}
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs uppercase tracking-wider transition-all shadow-lg shadow-amber-500/20 flex items-center gap-2"
                >
                  <User className="size-4" />
                  <span>Sign In / Register</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="flex-1 max-w-[1400px] w-full mx-auto px-6 sm:px-12 lg:px-16 py-12">
        {/* Count and filter summary */}
        <div className="flex items-center justify-between border-b border-[#EDE8E0] pb-5 mb-8">
          <div className="flex items-center gap-2 text-sm text-[#717A7D]">
            <Building2 className="size-4 text-[#8B7D68]" />
            <span className="font-medium text-[#172124]">
              {loading ? "Loading listings..." : `${savedProperties.length} ${savedProperties.length === 1 ? "Property" : "Properties"} Saved`}
            </span>
          </div>

          <Link
            to="/properties"
            className="text-xs font-semibold text-[#8B7D68] hover:text-[#172124] transition-colors flex items-center gap-1 group"
          >
            <span>Browse More Listings</span>
            <ArrowRight className="size-3.5 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        {/* Loading Skeletons */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex flex-col gap-3 animate-pulse">
                <div className="aspect-[16/11] bg-[#EDE8E0] rounded-[18px]" />
                <div className="h-4 bg-[#EDE8E0] rounded-md w-1/3" />
                <div className="h-6 bg-[#EDE8E0] rounded-md w-3/4" />
                <div className="h-4 bg-[#EDE8E0] rounded-md w-1/2" />
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && savedProperties.length === 0 && (
          <div className="text-center py-20 px-6 max-w-lg mx-auto bg-white rounded-3xl border border-[#EDE8E0] shadow-xs my-6">
            <div className="w-16 h-16 rounded-2xl bg-[#EDE8E0]/70 text-[#8B7D68] mx-auto flex items-center justify-center mb-5">
              <Bookmark className="size-8" />
            </div>
            <h2 className="text-2xl font-display font-bold text-[#172124] tracking-tight">
              No Saved Properties Yet
            </h2>
            <p className="mt-2.5 text-sm text-[#717A7D] leading-relaxed">
              Explore our exclusive Goa properties and click the bookmark icon on any card to save listings here for easy access.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                to="/properties"
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#172124] hover:bg-[#8B7D68] text-white text-xs font-semibold uppercase tracking-wider transition-colors flex items-center justify-center gap-2"
              >
                <Search className="size-4" />
                <span>Explore Properties</span>
              </Link>
              {!buyerUser && (
                <button
                  type="button"
                  onClick={openAuthModal}
                  className="w-full sm:w-auto px-6 py-3 rounded-xl border border-[#EDE8E0] hover:bg-[#FAF7F2] text-[#172124] text-xs font-semibold uppercase tracking-wider transition-colors flex items-center justify-center gap-2"
                >
                  <User className="size-4" />
                  <span>Client Login</span>
                </button>
              )}
            </div>

            {/* Feature highlights */}
            <div className="mt-10 pt-8 border-t border-[#EDE8E0] grid grid-cols-2 gap-4 text-left">
              <div className="flex items-start gap-2.5">
                <ShieldCheck className="size-4 text-[#17805B] shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-[#172124]">Private & Secure</p>
                  <p className="text-[11px] text-[#717A7D]">Stored securely under your verified buyer account.</p>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <Sparkles className="size-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-[#172124]">Direct Broker Access</p>
                  <p className="text-[11px] text-[#717A7D]">Inquire directly with Kassim Shaikh for site visits.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Saved Properties Grid */}
        {!loading && savedProperties.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {savedProperties.map((prop) => (
              <PropertyCard
                key={prop.id}
                id={prop.id}
                name={prop.title}
                location={prop.locality}
                price={prop.price}
                beds={prop.bedrooms || 0}
                baths={prop.bathrooms || 0}
                area={prop.area_sqft || ""}
                listing_type={prop.listing_type}
                property_type={prop.property_type}
                featured={prop.is_featured}
              />
            ))}
          </div>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
export default SavedProperties;
