import { useState } from "react";
import {
  BG, GREEN, fv, Reveal, SectionLabel,
  IconSearch, IconChevronDown, IconArrowRight, IconArrowLeft,
  IconBed, IconBath, IconArea, IconMap,
} from "@/lib/shared";
import { SiteNavbar } from "@/components/SiteNavbar";
import { SiteFooter } from "@/components/SiteFooter";

import imgP1 from "@/imports/PropertiesListingPage/721343dadb78ce017961e6632d7d0b288171d892.png";
import imgP2 from "@/imports/PropertiesListingPage/51dadbde438a85a76794ae7bb5d236bd397142c4.png";
import imgP3 from "@/imports/PropertiesListingPage/02397dd95a1cf0bc9f1bf2dc72092471ba81f810.png";
import imgP4 from "@/imports/PropertiesListingPage/3ccc16e633d8543e1cd4eb7277c90c1766d6b950.png";
import imgP5 from "@/imports/PropertiesListingPage/c8fd636d096d527db411430cbd96ef0cb517ff64.png";
import imgP6 from "@/imports/PropertiesListingPage/6389556655a7b2a2111fce6abd1dc5de87f732e3.png";
import imgP7 from "@/imports/PropertiesListingPage/c52dde40b73c7201fc90f2002bf1c2e5afa57746.png";
import imgP8 from "@/imports/PropertiesListingPage/bd19fd3e17c5739c9f660eb65ee82fd72a947f79.png";
import imgP9 from "@/imports/PropertiesListingPage/ef0e900d83cecc614c11eb9526b1ad2d1c1ba651.png";

// ─── Data ──────────────────────────────────────────────────────────────────────
type Listing = {
  id: number;
  image: string;
  name: string;
  location: string;
  price: string;
  priceNum: number;
  beds: number;
  baths: number;
  area: number;
  type: "Villa" | "Apartment" | "Plot" | "Studio";
  status: "Buy" | "Rent";
  featured?: boolean;
};

const ALL_LISTINGS: Listing[] = [
  { id: 1, image: imgP1, name: "Candolim Beach Villa", location: "Candolim, North Goa", price: "₹2.8 Cr", priceNum: 28000000, beds: 4, baths: 3, area: 320, type: "Villa", status: "Buy", featured: true },
  { id: 2, image: imgP2, name: "Anjuna Cliffside Retreat", location: "Anjuna, North Goa", price: "₹3.1 Cr", priceNum: 31000000, beds: 5, baths: 2, area: 380, type: "Villa", status: "Buy" },
  { id: 3, image: imgP3, name: "Panjim Modern Apartment", location: "Fontainhas, Panjim", price: "₹1.4 Cr", priceNum: 14000000, beds: 3, baths: 2, area: 140, type: "Apartment", status: "Buy" },
  { id: 4, image: imgP4, name: "Assagao Garden Estate", location: "Assagao, North Goa", price: "₹3.5 Cr", priceNum: 35000000, beds: 6, baths: 4, area: 450, type: "Villa", status: "Buy" },
  { id: 5, image: imgP5, name: "Vagator Hilltop View", location: "Vagator, North Goa", price: "₹70K/mo", priceNum: 70000, beds: 2, baths: 2, area: 180, type: "Studio", status: "Rent" },
  { id: 6, image: imgP6, name: "Calangute Pearl Villa", location: "Calangute, North Goa", price: "₹3.8 Cr", priceNum: 38000000, beds: 4, baths: 3, area: 290, type: "Villa", status: "Buy" },
  { id: 7, image: imgP7, name: "Siolim Riverside Bungalow", location: "Siolim, North Goa", price: "₹4.2 Cr", priceNum: 42000000, beds: 5, baths: 4, area: 520, type: "Villa", status: "Buy", featured: true },
  { id: 8, image: imgP8, name: "Mapusa Studio Apartment", location: "Mapusa, North Goa", price: "₹45K/mo", priceNum: 45000, beds: 1, baths: 1, area: 60, type: "Studio", status: "Rent" },
  { id: 9, image: imgP9, name: "Porvorim Heritage Plot", location: "Porvorim, North Goa", price: "₹90L", priceNum: 9000000, beds: 0, baths: 0, area: 800, type: "Plot", status: "Buy" },
];

// ─── Filter Bar ────────────────────────────────────────────────────────────────
type Filters = {
  search: string;
  status: "All" | "Buy" | "Rent";
  type: string;
  beds: string;
  budget: string;
  sort: string;
};

function FilterBar({ filters, onChange }: { filters: Filters; onChange: (f: Filters) => void }) {
  function set(key: keyof Filters, val: string) {
    onChange({ ...filters, [key]: val });
  }

  return (
    <div className="bg-white border border-[#172023]/10 rounded-[20px] p-[8px] flex flex-wrap gap-[8px] items-center shadow-[0_4px_24px_rgba(23,32,35,0.06)]">
      {/* Search */}
      <div className="flex items-center gap-[10px] flex-1 min-w-[200px] px-[16px] py-[12px]">
        <IconSearch color={`${BG}60`} />
        <input
          className="flex-1 bg-transparent outline-none font-['Bricolage_Grotesque:Regular',sans-serif] font-normal text-[15px] text-[#172023] placeholder-[#17202350] leading-[1.4] tracking-[-0.1px] min-w-0"
          style={fv}
          placeholder="Search by name or location…"
          value={filters.search}
          onChange={(e) => set("search", e.target.value)}
        />
      </div>

      <div className="w-px h-[32px] bg-[#172023]/10 hidden sm:block" />

      {/* Buy / Rent toggle */}
      <div className="flex items-center gap-[4px] bg-[#172023]/5 rounded-[12px] p-[4px]">
        {(["All", "Buy", "Rent"] as const).map((s) => (
          <button
            key={s}
            onClick={() => set("status", s)}
            className="px-[16px] py-[8px] rounded-[10px] font-['Bricolage_Grotesque:SemiBold',sans-serif] font-semibold text-[14px] leading-[1.4] tracking-[-0.1px] transition-all duration-200"
            style={{
              ...fv,
              backgroundColor: filters.status === s ? GREEN : "transparent",
              color: filters.status === s ? "white" : `${BG}80`,
            }}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="w-px h-[32px] bg-[#172023]/10 hidden sm:block" />

      {/* Property Type */}
      <SelectDropdown
        value={filters.type}
        options={["All Types", "Villa", "Apartment", "Studio", "Plot"]}
        onChange={(v) => set("type", v)}
      />

      {/* Bedrooms */}
      <SelectDropdown
        value={filters.beds}
        options={["Any Beds", "1+", "2+", "3+", "4+", "5+"]}
        onChange={(v) => set("beds", v)}
      />

      {/* Budget */}
      <SelectDropdown
        value={filters.budget}
        options={["Any Budget", "Under ₹1 Cr", "₹1–2 Cr", "₹2–4 Cr", "₹4 Cr+"]}
        onChange={(v) => set("budget", v)}
      />

      <div className="w-px h-[32px] bg-[#172023]/10 hidden sm:block" />

      {/* Sort */}
      <SelectDropdown
        value={filters.sort}
        options={["Newest First", "Price: Low–High", "Price: High–Low", "Area: Large–Small"]}
        onChange={(v) => set("sort", v)}
      />
    </div>
  );
}

function SelectDropdown({ value, options, onChange }: { value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <div className="relative">
      <select
        className="appearance-none bg-transparent outline-none pl-[12px] pr-[28px] py-[10px] font-['Bricolage_Grotesque:Medium',sans-serif] font-medium text-[14px] text-[#172023] leading-[1.4] tracking-[-0.1px] cursor-pointer"
        style={fv}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => <option key={o}>{o}</option>)}
      </select>
      <div className="pointer-events-none absolute right-[8px] top-1/2 -translate-y-1/2">
        <IconChevronDown color={`${BG}60`} />
      </div>
    </div>
  );
}

// ─── Property Card ─────────────────────────────────────────────────────────────
function PropertyCard({ listing, delay = 0 }: { listing: Listing; delay?: number }) {
  return (
    <Reveal delay={delay}>
      <div className="group relative rounded-[16px] border border-[#172023]/10 overflow-hidden bg-white card-lift cursor-pointer flex flex-col h-full">
        {/* Image */}
        <div className="relative h-[240px] overflow-hidden flex-shrink-0 img-hover-zoom">
          <img src={listing.image} alt={listing.name} className="absolute inset-0 size-full object-cover" />
          {listing.featured && (
            <div className="absolute top-[16px] left-[16px] z-10 px-[12px] py-[6px] rounded-full text-white font-['Bricolage_Grotesque:SemiBold',sans-serif] font-semibold text-[12px] tracking-[0.5px] uppercase" style={{ ...fv, backgroundColor: GREEN }}>
              Featured
            </div>
          )}
          <div className="absolute top-[16px] right-[16px] z-10 px-[12px] py-[6px] rounded-full bg-white/90 backdrop-blur-sm font-['Bricolage_Grotesque:SemiBold',sans-serif] font-semibold text-[12px] tracking-[0.5px] uppercase" style={{ ...fv, color: BG }}>
            {listing.status}
          </div>
          {/* Hover CTA */}
          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center z-20">
            <button className="flex items-center gap-[8px] bg-white px-[20px] py-[10px] rounded-full btn-hover">
              <span className="font-['Bricolage_Grotesque:SemiBold',sans-serif] font-semibold text-[14px] text-[#172023] leading-[1.4]" style={fv}>View Details</span>
              <IconArrowRight />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-[20px] flex flex-col gap-[16px] flex-1">
          <div className="flex items-start justify-between gap-[8px]">
            <div className="flex flex-col gap-[2px] flex-1 min-w-0">
              <p className="font-['Bricolage_Grotesque:Medium',sans-serif] font-medium text-[18px] text-[#172023] leading-[1.2] tracking-[-0.3px] truncate" style={fv}>{listing.name}</p>
              <div className="flex items-center gap-[4px]">
                <IconMap color={BG} opacity="0.4" />
                <p className="font-['Bricolage_Grotesque:Regular',sans-serif] font-normal text-[14px] text-[#172023]/50 leading-[1.4] tracking-[-0.1px] truncate" style={fv}>{listing.location}</p>
              </div>
            </div>
            <div className="shrink-0 px-[14px] py-[6px] rounded-full" style={{ backgroundColor: `${GREEN}1a` }}>
              <span className="font-['Bricolage_Grotesque:SemiBold',sans-serif] font-semibold text-[14px] whitespace-nowrap" style={{ ...fv, color: GREEN }}>{listing.price}</span>
            </div>
          </div>

          <div className="flex items-center gap-[16px] pt-[12px] border-t border-[#172023]/8">
            {listing.beds > 0 && (
              <div className="flex items-center gap-[6px]">
                <IconBed />
                <span className="font-['Bricolage_Grotesque:Regular',sans-serif] font-normal text-[14px] text-[#172023] leading-[1.4]" style={fv}>{listing.beds} Beds</span>
              </div>
            )}
            {listing.baths > 0 && (
              <div className="flex items-center gap-[6px]">
                <IconBath />
                <span className="font-['Bricolage_Grotesque:Regular',sans-serif] font-normal text-[14px] text-[#172023] leading-[1.4]" style={fv}>{listing.baths} Baths</span>
              </div>
            )}
            <div className="flex items-center gap-[6px]">
              <IconArea />
              <span className="font-['Bricolage_Grotesque:Regular',sans-serif] font-normal text-[14px] text-[#172023] leading-[1.4]" style={fv}>{listing.area}m²</span>
            </div>
            <div className="ml-auto">
              <span className="font-['Bricolage_Grotesque:Regular',sans-serif] font-normal text-[12px] text-[#172023]/40 leading-[1.4] capitalize" style={fv}>{listing.type}</span>
            </div>
          </div>
        </div>
      </div>
    </Reveal>
  );
}

// ─── Pagination ────────────────────────────────────────────────────────────────
function Pagination({ current, total, onChange }: { current: number; total: number; onChange: (p: number) => void }) {
  return (
    <div className="flex items-center justify-center gap-[8px] pt-[32px]">
      <button
        onClick={() => onChange(current - 1)}
        disabled={current === 1}
        className="size-[44px] rounded-[12px] flex items-center justify-center border border-[#172023]/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all hover:border-[#172023]/30"
        style={{ backgroundColor: "white" }}
      >
        <IconArrowLeft color={BG} />
      </button>
      {Array.from({ length: total }, (_, i) => i + 1).map((p) => (
        <button
          key={p}
          onClick={() => onChange(p)}
          className="size-[44px] rounded-[12px] flex items-center justify-center font-['Bricolage_Grotesque:SemiBold',sans-serif] font-semibold text-[15px] transition-all duration-200"
          style={{
            ...fv,
            backgroundColor: p === current ? GREEN : "white",
            color: p === current ? "white" : `${BG}80`,
            border: `1px solid ${p === current ? GREEN : "rgba(23,32,35,0.10)"}`,
          }}
        >
          {p}
        </button>
      ))}
      <button
        onClick={() => onChange(current + 1)}
        disabled={current === total}
        className="size-[44px] rounded-[12px] flex items-center justify-center border border-[#172023]/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all hover:border-[#172023]/30"
        style={{ backgroundColor: "white" }}
      >
        <IconArrowRight />
      </button>
    </div>
  );
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
function filterListings(listings: Listing[], f: Filters): Listing[] {
  return listings
    .filter((l) => {
      if (f.status !== "All" && l.status !== f.status) return false;
      if (f.type !== "All Types" && l.type !== f.type) return false;
      if (f.search) {
        const q = f.search.toLowerCase();
        if (!l.name.toLowerCase().includes(q) && !l.location.toLowerCase().includes(q)) return false;
      }
      if (f.beds && f.beds !== "Any Beds") {
        const minBeds = parseInt(f.beds);
        if (l.beds < minBeds) return false;
      }
      if (f.budget && f.budget !== "Any Budget") {
        if (f.budget === "Under ₹1 Cr" && l.priceNum >= 10000000) return false;
        if (f.budget === "₹1–2 Cr" && (l.priceNum < 10000000 || l.priceNum > 20000000)) return false;
        if (f.budget === "₹2–4 Cr" && (l.priceNum < 20000000 || l.priceNum > 40000000)) return false;
        if (f.budget === "₹4 Cr+" && l.priceNum < 40000000) return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (f.sort === "Price: Low–High") return a.priceNum - b.priceNum;
      if (f.sort === "Price: High–Low") return b.priceNum - a.priceNum;
      if (f.sort === "Area: Large–Small") return b.area - a.area;
      return a.id - b.id;
    });
}

const PER_PAGE = 6;

// ─── Properties Page ───────────────────────────────────────────────────────────
export default function PropertiesPage() {
  const [filters, setFilters] = useState<Filters>({
    search: "", status: "All", type: "All Types", beds: "Any Beds", budget: "Any Budget", sort: "Newest First",
  });
  const [page, setPage] = useState(1);

  const filtered = filterListings(ALL_LISTINGS, filters);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const visible = filtered.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE);

  function handleFilter(f: Filters) {
    setFilters(f);
    setPage(1);
  }

  return (
    <div className="bg-white overflow-x-hidden min-h-screen flex flex-col">
      <SiteNavbar variant="page" />

      {/* Page Header */}
      <div className="w-full py-[64px]" style={{ backgroundColor: BG }}>
        <div className="max-w-[1400px] mx-auto px-6 flex flex-col gap-[16px]">
          <Reveal>
            <div className="flex items-center gap-[8px]">
              <span className="font-['Bricolage_Grotesque:Regular',sans-serif] font-normal text-[14px] text-white/40 leading-[1.4] tracking-[-0.1px]" style={fv}>Home</span>
              <span className="text-white/20">/</span>
              <span className="font-['Bricolage_Grotesque:Regular',sans-serif] font-normal text-[14px] text-white leading-[1.4] tracking-[-0.1px]" style={fv}>Properties</span>
            </div>
          </Reveal>
          <Reveal delay={80}>
            <div className="flex items-end justify-between flex-wrap gap-4">
              <div>
                <p className="font-['Bricolage_Grotesque:Medium',sans-serif] font-medium text-white leading-[1.2] tracking-[-1.04px]" style={{ ...fv, fontSize: "56px" }}>
                  All Properties
                </p>
                <p className="font-['Bricolage_Grotesque:Regular',sans-serif] font-normal text-[18px] text-white/50 leading-[1.4] tracking-[-0.1px] mt-[8px]" style={fv}>
                  Discover your perfect property in Goa
                </p>
              </div>
              <div className="flex items-center gap-[16px]">
                <div className="text-right">
                  <p className="font-['Bricolage_Grotesque:Medium',sans-serif] font-medium text-[32px] text-white leading-[1.2]" style={fv}>{ALL_LISTINGS.length}</p>
                  <p className="font-['Bricolage_Grotesque:Regular',sans-serif] font-normal text-[14px] text-white/40 leading-[1.4]" style={fv}>listings available</p>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </div>

      {/* Filters + Grid */}
      <div className="flex-1 w-full py-[48px]" style={{ backgroundColor: "#f8f8f6" }}>
        <div className="max-w-[1400px] mx-auto px-6 flex flex-col gap-[32px]">
          <Reveal>
            <FilterBar filters={filters} onChange={handleFilter} />
          </Reveal>

          {/* Results count */}
          <div className="flex items-center justify-between">
            <p className="font-['Bricolage_Grotesque:Regular',sans-serif] font-normal text-[15px] text-[#172023]/50 leading-[1.4]" style={fv}>
              Showing <span className="font-semibold text-[#172023]">{visible.length}</span> of{" "}
              <span className="font-semibold text-[#172023]">{filtered.length}</span> properties
            </p>
          </div>

          {visible.length > 0 ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-[28px]">
                {visible.map((l, i) => (
                  <PropertyCard key={l.id} listing={l} delay={i * 60} />
                ))}
              </div>
              {totalPages > 1 && (
                <Pagination current={safePage} total={totalPages} onChange={setPage} />
              )}
            </>
          ) : (
            <Reveal>
              <div className="flex flex-col items-center justify-center py-[80px] gap-[16px]">
                <p className="font-['Bricolage_Grotesque:Medium',sans-serif] font-medium text-[24px] text-[#172023] leading-[1.2]" style={fv}>No properties found</p>
                <p className="font-['Bricolage_Grotesque:Regular',sans-serif] font-normal text-[16px] text-[#172023]/50 leading-[1.4]" style={fv}>Try adjusting your filters to see more results.</p>
                <button
                  onClick={() => handleFilter({ search: "", status: "All", type: "All Types", beds: "Any Beds", budget: "Any Budget", sort: "Newest First" })}
                  className="mt-[8px] px-[24px] py-[12px] rounded-full font-['Bricolage_Grotesque:SemiBold',sans-serif] font-semibold text-[15px] text-white btn-hover"
                  style={{ ...fv, backgroundColor: GREEN }}
                >
                  Clear filters
                </button>
              </div>
            </Reveal>
          )}
        </div>
      </div>

      {/* CTA */}
      <section className="w-full py-[96px] bg-white">
        <div className="max-w-[1400px] mx-auto px-6">
          <div className="rounded-[24px] px-[64px] py-[72px] flex flex-col items-center text-center gap-[32px]" style={{ backgroundColor: BG }}>
            <Reveal>
              <div>
                <SectionLabel text="Get in touch" dark />
                <p className="font-['Bricolage_Grotesque:Medium',sans-serif] font-medium text-white leading-[1.2] tracking-[-1.04px] mt-[16px]" style={{ ...fv, fontSize: "52px" }}>
                  Can't find what you're looking for?
                </p>
                <p className="font-['Bricolage_Grotesque:Regular',sans-serif] font-normal text-[18px] text-white/50 leading-[1.4] tracking-[-0.1px] mt-[12px] max-w-[600px] mx-auto" style={fv}>
                  Our local Goa experts are ready to help you find the perfect property — from beachside villas to heritage homes.
                </p>
              </div>
            </Reveal>
            <Reveal delay={100}>
              <div className="flex gap-[16px] items-center flex-wrap justify-center">
                <button className="flex items-center justify-center px-[32px] py-[17px] rounded-full btn-hover" style={{ backgroundColor: GREEN }}>
                  <span className="font-['Bricolage_Grotesque:SemiBold',sans-serif] font-semibold text-[16px] text-white leading-[1.4] tracking-[-0.1px] whitespace-nowrap" style={fv}>Speak to an expert</span>
                </button>
                <button className="flex items-center justify-center px-[32px] py-[17px] rounded-full border border-white/20">
                  <span className="font-['Bricolage_Grotesque:SemiBold',sans-serif] font-semibold text-[16px] text-white leading-[1.4] tracking-[-0.1px] whitespace-nowrap" style={fv}>Browse all listings</span>
                </button>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
