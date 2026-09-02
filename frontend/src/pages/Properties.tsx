import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router";
import { SiteNavbar } from "@/components/SiteNavbar";
import { SiteFooter } from "@/components/SiteFooter";
import { BackButton } from "@/components/BackButton";
import { PropertyCard } from "@/components/PropertyCard";
import {
  fetchProperties,
  fetchPropertyImages,
  formatRegionLabel,
  formatPropertyTypeLabel,
  type PropertyFilterParams,
  type PropertyType,
  type ListingType,
} from "@/lib/api";
import {
  Search,
  ChevronDown,
  X,
  Building2,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
} from "lucide-react";

import imgP1 from "@/imports/PropertiesListingPage/721343dadb78ce017961e6632d7d0b288171d892.png";
import imgP2 from "@/imports/PropertiesListingPage/51dadbde438a85a76794ae7bb5d236bd397142c4.png";
import imgP3 from "@/imports/PropertiesListingPage/02397dd95a1cf0bc9f1bf2dc72092471ba81f810.png";
import imgP4 from "@/imports/PropertiesListingPage/3ccc16e633d8543e1cd4eb7277c90c1766d6b950.png";
import imgP5 from "@/imports/PropertiesListingPage/c8fd636d096d527db411430cbd96ef0cb517ff64.png";
import imgP6 from "@/imports/PropertiesListingPage/6389556655a7b2a2111fce6abd1dc5de87f732e3.png";

const DEMO_IMAGES = [imgP1, imgP2, imgP3, imgP4, imgP5, imgP6];

export type PropertyListingItem = {
  id: string;
  image: string;
  name: string;
  location: string;
  price: number;
  beds: number;
  baths: number;
  area?: number;
  type: string;
  listing_type: string;
  featured?: boolean;
};

const PER_PAGE = 9;

export default function PropertiesPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  // URL-driven query filters
  const [searchQuery, setSearchQuery] = useState(
    searchParams.get("search") || searchParams.get("locality") || ""
  );
  const [purpose, setPurpose] = useState<string>(
    searchParams.get("purpose") || "all"
  );
  const [propertyType, setPropertyType] = useState<string>(
    searchParams.get("type") || "all"
  );
  const [bedrooms, setBedrooms] = useState<string>(
    searchParams.get("bedrooms") || "all"
  );
  const [budget, setBudget] = useState<string>(
    searchParams.get("price_range") || "all"
  );
  const [sortBy, setSortBy] = useState<string>("newest");
  const [page, setPage] = useState(1);

  const [listings, setListings] = useState<PropertyListingItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Sync state when URL searchParams update
  useEffect(() => {
    const q = searchParams.get("search") || searchParams.get("locality") || "";
    const purp = searchParams.get("purpose") || "all";
    const t = searchParams.get("type") || "all";
    const b = searchParams.get("bedrooms") || "all";
    const bud = searchParams.get("price_range") || "all";

    setSearchQuery(q);
    setPurpose(purp);
    setPropertyType(t);
    setBedrooms(b);
    setBudget(bud);
  }, [searchParams]);

  // Fetch properties from backend API
  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    const filterParams: PropertyFilterParams = {
      skip: 0,
      limit: 100,
    };

    if (purpose === "sale") filterParams.listing_type = "sale" as ListingType;
    else if (purpose === "rent") filterParams.listing_type = "rent" as ListingType;

    if (propertyType !== "all") {
      filterParams.property_type = propertyType as PropertyType;
    }

    if (bedrooms !== "all") {
      const minB = parseInt(bedrooms.replace("+", ""));
      if (!isNaN(minB)) filterParams.bedrooms = minB;
    }

    if (budget === "Under ₹1 Cr") {
      filterParams.max_price = 10000000;
    } else if (budget === "₹1–2 Cr" || budget === "1-2cr") {
      filterParams.min_price = 10000000;
      filterParams.max_price = 20000000;
    } else if (budget === "₹2–4 Cr" || budget === "2-5cr") {
      filterParams.min_price = 20000000;
      filterParams.max_price = 50000000;
    } else if (budget === "₹4 Cr+" || budget === "5cr+") {
      filterParams.min_price = 50000000;
    }

    if (searchQuery.trim()) {
      filterParams.locality = searchQuery.trim();
    }

    fetchProperties(filterParams)
      .then(async (data) => {
        if (!isMounted) return;
        if (data && Array.isArray(data.results)) {
          const items: PropertyListingItem[] = await Promise.all(
            data.results.map(async (dto, index) => {
              let imgUrl = DEMO_IMAGES[index % DEMO_IMAGES.length];
              try {
                const imgs = await fetchPropertyImages(dto.id);
                if (imgs && imgs.length > 0) {
                  const thumb = imgs.find((img) => img.is_thumbnail) || imgs[0];
                  if (thumb?.image_url) imgUrl = thumb.image_url;
                }
              } catch {
                // fallback
              }

              return {
                id: String(dto.id),
                image: imgUrl,
                name: dto.title,
                location: `${dto.locality}, ${formatRegionLabel(dto.region)}`,
                price: dto.price,
                beds: dto.bedrooms || 0,
                baths: dto.bathrooms || 0,
                area: dto.area_sqft,
                type: formatPropertyTypeLabel(dto.property_type),
                listing_type: dto.listing_type || "sale",
                featured: dto.is_featured,
              };
            })
          );
          if (isMounted) setListings(items);
        } else {
          setListings([]);
        }
      })
      .catch((err) => {
        console.warn("Backend properties fetch error:", err);
        setListings([]);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [purpose, propertyType, bedrooms, budget, searchQuery]);

  // Client-side Sorting
  const sortedListings = useMemo(() => {
    const arr = [...listings];
    if (sortBy === "price_asc") {
      arr.sort((a, b) => a.price - b.price);
    } else if (sortBy === "price_desc") {
      arr.sort((a, b) => b.price - a.price);
    } else if (sortBy === "beds_desc") {
      arr.sort((a, b) => b.beds - a.beds);
    }
    return arr;
  }, [listings, sortBy]);

  // Pagination Slice
  const totalPages = Math.ceil(sortedListings.length / PER_PAGE) || 1;
  const paginatedListings = useMemo(() => {
    const start = (page - 1) * PER_PAGE;
    return sortedListings.slice(start, start + PER_PAGE);
  }, [sortedListings, page]);

  const handleResetFilters = () => {
    setSearchQuery("");
    setPurpose("all");
    setPropertyType("all");
    setBedrooms("all");
    setBudget("all");
    setSearchParams({});
    setPage(1);
  };

  const hasActiveFilters =
    searchQuery !== "" ||
    purpose !== "all" ||
    propertyType !== "all" ||
    bedrooms !== "all" ||
    budget !== "all";

  return (
    <div className="min-h-screen bg-white font-sans text-[#172124] flex flex-col">
      <SiteNavbar variant="page" />

      {/* ─── PAGE HEADER (Homepage Matched Typography) ────────────────────────── */}
      <div className="bg-white border-b border-[#EDE8E0] py-12 sm:py-16">
        <div className="max-w-[1400px] mx-auto px-6 sm:px-12 lg:px-16 flex flex-col gap-4">
          <BackButton label="Back to Home" to="/" />
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 pt-2">
            <div>
              <span className="text-[11.5px] font-mono font-semibold uppercase tracking-[0.2em] text-[#8B7D68] block mb-1">
                [ Curated Goa Portfolio ]
              </span>
              <h1 className="font-display font-bold text-[34px] sm:text-[48px] text-[#172124] leading-tight tracking-tight">
                Explore Premier Properties
              </h1>
            </div>
            <p className="text-[14px] text-[#717A7D] max-w-[420px] leading-relaxed">
              Discover verified luxury villas, riverfront apartments, and heritage estates across North and South Goa.
            </p>
          </div>
        </div>
      </div>

      {/* ─── FLOATING FILTERS TOOLBAR ────────────────────────────────────────── */}
      <div className="max-w-[1400px] w-full mx-auto px-6 sm:px-12 lg:px-16 py-10 flex flex-col gap-8">
        <div className="bg-white rounded-[22px] p-5 sm:p-6 border border-[#EDE8E0] shadow-xs flex flex-col gap-5">
          
          {/* Main Filter Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
            {/* 1. Search Query */}
            <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-[12px] bg-[#FAF7F2] border border-[#EDE8E0] lg:col-span-1 focus-within:border-[#172124] transition-colors">
              <Search className="size-4 text-[#8B7D68] shrink-0" />
              <input
                type="text"
                placeholder="Search location (e.g. Assagao)..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                className="w-full bg-transparent text-[13px] text-[#172124] placeholder:text-[#9A948B] focus:outline-none"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>

            {/* 2. Purpose Toggle (All / Buy / Rent) */}
            <div className="flex items-center gap-1 bg-[#FAF7F2] p-1 rounded-[12px] border border-[#EDE8E0]">
              {[
                { id: "all", label: "All" },
                { id: "sale", label: "Buy" },
                { id: "rent", label: "Rent" },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setPurpose(item.id);
                    setPage(1);
                  }}
                  className={`flex-1 py-1.5 rounded-[9px] text-[12.5px] font-semibold transition-all cursor-pointer ${
                    purpose === item.id
                      ? "bg-[#172124] text-white shadow-xs"
                      : "text-[#717A7D] hover:text-[#172124]"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* 3. Property Type */}
            <div className="relative">
              <select
                value={propertyType}
                onChange={(e) => {
                  setPropertyType(e.target.value);
                  setPage(1);
                }}
                className="w-full appearance-none px-4 py-2.5 rounded-[12px] bg-[#FAF7F2] border border-[#EDE8E0] text-[13px] text-[#172124] font-medium focus:outline-none focus:border-[#172124] transition-colors cursor-pointer capitalize"
              >
                <option value="all">All Types</option>
                <option value="villa">Luxury Villa</option>
                <option value="flat">Apartment</option>
                <option value="penthouse">Penthouse</option>
                <option value="studio">Studio</option>
                <option value="plot">Plot</option>
              </select>
              <ChevronDown className="size-3.5 text-[#8B7D68] absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* 4. Bedrooms */}
            <div className="relative">
              <select
                value={bedrooms}
                onChange={(e) => {
                  setBedrooms(e.target.value);
                  setPage(1);
                }}
                className="w-full appearance-none px-4 py-2.5 rounded-[12px] bg-[#FAF7F2] border border-[#EDE8E0] text-[13px] text-[#172124] font-medium focus:outline-none focus:border-[#172124] transition-colors cursor-pointer"
              >
                <option value="all">Any Bedrooms</option>
                <option value="1">1+ BHK</option>
                <option value="2">2+ BHK</option>
                <option value="3">3+ BHK</option>
                <option value="4">4+ BHK</option>
                <option value="5">5+ BHK</option>
              </select>
              <ChevronDown className="size-3.5 text-[#8B7D68] absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* 5. Budget Range */}
            <div className="relative">
              <select
                value={budget}
                onChange={(e) => {
                  setBudget(e.target.value);
                  setPage(1);
                }}
                className="w-full appearance-none px-4 py-2.5 rounded-[12px] bg-[#FAF7F2] border border-[#EDE8E0] text-[13px] text-[#172124] font-medium focus:outline-none focus:border-[#172124] transition-colors cursor-pointer"
              >
                <option value="all">Any Budget</option>
                <option value="Under ₹1 Cr">Under ₹1 Cr</option>
                <option value="₹1–2 Cr">₹1 – 2 Cr</option>
                <option value="₹2–4 Cr">₹2 – 5 Cr</option>
                <option value="₹4 Cr+">Above ₹5 Cr</option>
              </select>
              <ChevronDown className="size-3.5 text-[#8B7D68] absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Results Count & Sort Dropdown */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-[#EDE8E0] text-[13px]">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-[#172124]">
                {loading ? "Searching..." : `${sortedListings.length} Properties available`}
              </span>
              {hasActiveFilters && (
                <button
                  onClick={handleResetFilters}
                  className="text-[12px] font-semibold text-[#8B7D68] hover:text-[#172124] underline cursor-pointer ml-2"
                >
                  Reset all filters
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <ArrowUpDown className="size-3.5 text-[#8B7D68]" />
              <span className="text-[#717A7D] text-[12.5px]">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-transparent text-[13px] font-semibold text-[#172124] focus:outline-none cursor-pointer"
              >
                <option value="newest">Newest Listed</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="beds_desc">Bedrooms: Most First</option>
              </select>
            </div>
          </div>
        </div>

        {/* ─── PROPERTY RESULTS GRID ─────────────────────────────────────────── */}
        {loading ? (
          <div className="py-24 text-center flex flex-col items-center justify-center gap-3">
            <div className="size-8 rounded-full border-2 border-[#172124] border-t-transparent animate-spin" />
            <p className="text-[14px] text-[#717A7D]">Loading luxury residences from Goa database...</p>
          </div>
        ) : paginatedListings.length === 0 ? (
          <div className="py-20 bg-white rounded-[22px] border border-[#EDE8E0] text-center flex flex-col items-center justify-center gap-4 px-6 shadow-xs">
            <div className="size-14 rounded-full bg-[#FAF7F2] flex items-center justify-center text-[#8B7D68] border border-[#EDE8E0]">
              <Building2 className="size-6" />
            </div>
            <h3 className="font-display font-bold text-[22px] text-[#172124]">
              No properties matched your criteria
            </h3>
            <p className="text-[13.5px] text-[#717A7D] max-w-[420px] leading-relaxed">
              Try adjusting your locality, price range, or property type filters to explore more luxury listings.
            </p>
            <button
              onClick={handleResetFilters}
              className="px-6 py-2.5 rounded-full bg-[#172124] text-white text-[13px] font-semibold hover:bg-[#2C383C] transition-colors cursor-pointer mt-2"
            >
              View All Properties
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7 sm:gap-9">
            {paginatedListings.map((prop) => (
              <PropertyCard
                key={prop.id}
                id={prop.id}
                image={prop.image}
                name={prop.name}
                location={prop.location}
                price={prop.price}
                beds={prop.beds}
                baths={prop.baths}
                area={prop.area ? `${prop.area} sqft` : undefined}
                property_type={prop.type}
                listing_type={prop.listing_type}
                featured={prop.featured}
              />
            ))}
          </div>
        )}

        {/* ─── PAGINATION CONTROLS ────────────────────────────────────────────── */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-8 pb-4">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="size-10 rounded-full border border-[#EDE8E0] bg-white flex items-center justify-center text-[#172124] disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#172124] hover:text-white transition-colors cursor-pointer"
              aria-label="Previous page"
            >
              <ChevronLeft className="size-4" />
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pNum) => (
              <button
                key={pNum}
                onClick={() => setPage(pNum)}
                className={`size-10 rounded-full font-semibold text-[13px] transition-colors cursor-pointer ${
                  page === pNum
                    ? "bg-[#172124] text-white shadow-xs"
                    : "bg-white border border-[#EDE8E0] text-[#717A7D] hover:bg-[#FAF7F2]"
                }`}
              >
                {pNum}
              </button>
            ))}

            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="size-10 rounded-full border border-[#EDE8E0] bg-white flex items-center justify-center text-[#172124] disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#172124] hover:text-white transition-colors cursor-pointer"
              aria-label="Next page"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        )}

      </div>

      <div className="mt-auto">
        <SiteFooter />
      </div>
    </div>
  );
}
