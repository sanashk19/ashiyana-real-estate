import { useState } from "react";
import { Link, useLocation } from "react-router";
import { AshiyanaLogo } from "@/lib/shared";
import { useBusinessProfile } from "@/context/BusinessProfileContext";
import { useSavedProperties } from "@/context/SavedPropertiesContext";
import { X, Menu, Phone, MessageSquare, ArrowUpRight, Bookmark } from "lucide-react";

type NavbarProps = {
  variant?: "hero" | "page";
};

export function SiteNavbar({ variant = "page" }: NavbarProps) {
  const isHero = variant === "hero";
  const [menuOpen, setMenuOpen] = useState(false);
  const { profile } = useBusinessProfile();
  const { savedProperties } = useSavedProperties();
  const location = useLocation();
  const phoneTel = `tel:${(profile?.phone || "+91 832 246 7890").replace(/\s+/g, "")}`;

  // Navigation items
  const navLinks = [
    { to: "/", label: "Home" },
    { to: "/properties", label: "Properties" },
    { to: "/services", label: "Services" },
    { to: "/sell", label: "Sell Property" },
    { to: "/contact", label: "Contact" },
  ];

  const isLinkActive = (to: string) => {
    if (to === "/") return location.pathname === "/";
    if (to === "/properties") {
      return location.pathname.startsWith("/properties") || location.pathname.startsWith("/property");
    }
    return location.pathname.startsWith(to);
  };

  const isSavedActive = location.pathname.startsWith("/saved-properties");

  return (
    <nav className="w-full relative z-30 font-sans">
      <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-5 flex items-center justify-between gap-4">
        
        {/* 1. Brand Logo */}
        <Link to="/" className="flex items-center shrink-0">
          <AshiyanaLogo dark={!isHero} className="h-[46px] sm:h-[54px] object-contain" />
        </Link>

        {/* 2. Central Floating Pill Menu (Desktop) */}
        <div
          className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full border shadow-2xs transition-all ${
            isHero
              ? "bg-[#172124]/75 backdrop-blur-md border-white/15 text-white"
              : "bg-white/95 backdrop-blur-md border-[#EDE8E0] text-[#172124]"
          }`}
        >
          {navLinks.map(({ to, label }) => {
            const active = isLinkActive(to);

            let buttonClass = "";
            if (active) {
              buttonClass = isHero
                ? "bg-white text-[#172124] font-semibold shadow-xs"
                : "bg-[#172124] text-white font-semibold shadow-xs";
            } else {
              buttonClass = isHero
                ? "text-white/80 hover:text-white hover:bg-white/10 font-medium"
                : "text-[#717A7D] hover:text-[#172124] hover:bg-[#FAF7F2] font-medium";
            }

            return (
              <Link
                key={to}
                to={to}
                className={`px-4 py-1.5 rounded-full text-[13.5px] transition-all whitespace-nowrap ${buttonClass}`}
              >
                {label}
              </Link>
            );
          })}
        </div>

        {/* 3. Right Actions: Saved Bookmark + Phone + Get in Touch Button */}
        <div className="hidden lg:flex items-center gap-3 shrink-0">
          {/* Saved Properties Button */}
          <Link
            to="/saved-properties"
            title="Saved Properties"
            aria-label={`Saved properties, ${savedProperties.length} saved`}
            className={`relative flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border transition-all ${
              isSavedActive
                ? isHero
                  ? "bg-amber-500 border-amber-500 text-slate-950 font-semibold shadow-xs"
                  : "bg-amber-500 border-amber-500 text-slate-950 font-semibold shadow-xs"
                : isHero
                ? "text-white/90 border-white/20 hover:bg-white/10"
                : "text-[#172124] border-[#EDE8E0] hover:bg-[#FAF7F2]"
            }`}
          >
            <Bookmark className={`size-3.5 ${isSavedActive ? "fill-slate-950" : "text-amber-500"}`} />
            <span className="text-[13px] font-medium">Saved</span>
            {savedProperties.length > 0 && (
              <span className={`ml-0.5 px-1.5 py-0.2 rounded-full text-[10.5px] font-bold ${
                isSavedActive
                  ? "bg-slate-950 text-amber-300"
                  : "bg-amber-500 text-slate-950"
              }`}>
                {savedProperties.length}
              </span>
            )}
          </Link>

          <a
            href={phoneTel}
            className={`flex items-center gap-2 text-[13.5px] font-medium px-3.5 py-1.5 rounded-full border transition-all ${
              isHero
                ? "text-white/90 border-white/20 hover:bg-white/10"
                : "text-[#172124] border-[#EDE8E0] hover:bg-[#FAF7F2]"
            }`}
          >
            <Phone className="size-3.5 text-[#8B7D68]" />
            <span>{profile?.phone || "+91 832 246 7890"}</span>
          </a>

          <Link
            to="/contact"
            className="px-5 py-2 rounded-full text-white text-[13.5px] font-semibold bg-[#172124] hover:bg-[#2C383C] transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <span>Get in touch</span>
            <ArrowUpRight className="size-3.5" />
          </Link>
        </div>

        {/* 4. Mobile Menu Button */}
        <div className="flex md:hidden items-center gap-2">
          <Link
            to="/saved-properties"
            className="relative p-2 rounded-full text-[#172124] bg-white border border-[#EDE8E0] shadow-2xs"
            aria-label="Saved Properties"
          >
            <Bookmark className="size-4 text-amber-600" />
            {savedProperties.length > 0 && (
              <span className="absolute -top-1 -right-1 size-4 bg-amber-500 text-slate-950 rounded-full text-[9.5px] font-bold flex items-center justify-center">
                {savedProperties.length}
              </span>
            )}
          </Link>
          <Link
            to="/sell"
            className="px-3.5 py-1.5 rounded-full text-[#172124] bg-[#FAF7F2] border border-[#EDE8E0] text-[12px] font-semibold shadow-2xs"
          >
            Sell Property
          </Link>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className={`p-2 rounded-full border flex items-center justify-center transition-colors cursor-pointer ${
              isHero
                ? "bg-[#172124]/80 text-white border-white/15"
                : "bg-white text-[#172124] border-[#EDE8E0]"
            }`}
            aria-label="Toggle navigation menu"
          >
            {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {/* 5. Mobile Slide-Out Drawer Menu */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-end"
          onClick={() => setMenuOpen(false)}
        >
          <div
            className="w-full max-w-[340px] h-full bg-[#172124] text-white p-6 flex flex-col justify-between shadow-2xl animate-in slide-in-from-right duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <Link to="/" onClick={() => setMenuOpen(false)}>
                <AshiyanaLogo dark={false} className="h-[36px] object-contain" />
              </Link>
              <button
                onClick={() => setMenuOpen(false)}
                className="size-9 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors cursor-pointer"
                aria-label="Close menu"
              >
                <X className="size-4.5" />
              </button>
            </div>

            {/* Mobile Nav Links */}
            <div className="flex flex-col gap-2.5 my-auto py-6">
              {navLinks.map(({ to, label }) => {
                const active = isLinkActive(to);
                return (
                  <Link
                    key={to}
                    to={to}
                    onClick={() => setMenuOpen(false)}
                    className={`flex items-center justify-between font-display text-[19px] px-4 py-3 rounded-[14px] transition-all ${
                      active
                        ? "bg-white text-[#172124] font-bold shadow-xs"
                        : "text-white/90 hover:text-white hover:bg-white/10 font-medium"
                    }`}
                  >
                    <span>{label}</span>
                  </Link>
                );
              })}

              {/* Saved Properties Mobile Link */}
              <Link
                to="/saved-properties"
                onClick={() => setMenuOpen(false)}
                className={`flex items-center justify-between font-display text-[19px] px-4 py-3 rounded-[14px] transition-all ${
                  isSavedActive
                    ? "bg-amber-500 text-slate-950 font-bold shadow-xs"
                    : "text-amber-300 bg-amber-500/10 border border-amber-500/20 font-semibold"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Bookmark className="size-4.5 fill-current" />
                  <span>Saved Properties</span>
                </div>
                {savedProperties.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 text-xs font-bold">
                    {savedProperties.length}
                  </span>
                )}
              </Link>
            </div>

            {/* Mobile Footer Contact Actions */}
            <div className="flex flex-col gap-3 pt-6 border-t border-white/10">
              <a
                href={phoneTel}
                className="flex items-center gap-3 text-white/90 font-medium text-[14px]"
              >
                <div className="size-8 rounded-full bg-white/10 flex items-center justify-center text-[#17805B]">
                  <Phone className="size-4" />
                </div>
                <span>{profile?.phone || "+91 832 246 7890"}</span>
              </a>

              {profile?.whatsapp_number && (
                <a
                  href={`https://wa.me/${profile.whatsapp_number.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 text-white/90 font-medium text-[14px]"
                >
                  <div className="size-8 rounded-full bg-white/10 flex items-center justify-center text-emerald-400">
                    <MessageSquare className="size-4" />
                  </div>
                  <span>Chat on WhatsApp</span>
                </a>
              )}

              <Link
                to="/sell"
                onClick={() => setMenuOpen(false)}
                className="w-full mt-2 py-2.5 rounded-full bg-[#C4A66A] text-[#172124] font-bold text-[13.5px] text-center hover:bg-[#B89B5E] transition-colors"
              >
                Submit Property to Sell
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
