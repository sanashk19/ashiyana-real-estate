import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Bed, Bath, Maximize2, MapPin, Bookmark } from "lucide-react";
import { formatPriceINR } from "@/lib/api";
import { useSavedProperties } from "@/context/SavedPropertiesContext";

export interface PropertyCardProps {
  id: string;
  image?: string;
  name: string;
  location: string;
  price: string | number;
  beds?: number | string;
  baths?: number | string;
  area?: string | number;
  property_type?: string;
  listing_type?: string;
  featured?: boolean;
  className?: string;
}

const FALLBACK_IMAGE = "/goa-hero.png";

export function PropertyCard({
  id,
  image,
  name,
  location,
  price,
  beds = 0,
  baths = 0,
  area = "",
  listing_type = "sale",
  property_type = "",
  className = "",
}: PropertyCardProps) {
  const navigate = useNavigate();
  const { isSaved, toggleSave } = useSavedProperties();
  const [imgSrc, setImgSrc] = useState(image || FALLBACK_IMAGE);
  const [isToggling, setIsToggling] = useState(false);

  useEffect(() => {
    if (image) setImgSrc(image);
  }, [image]);

  const saved = isSaved(id);

  const handleBookmarkClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (isToggling) return;
    try {
      setIsToggling(true);
      await toggleSave(id, {
        id,
        title: name,
        property_type: (property_type as any) || "villa",
        listing_type: (listing_type as any) || "sale",
        status: "active",
        price: typeof price === "number" ? price : parseFloat(String(price).replace(/[^0-9.]/g, "")) || 0,
        bedrooms: typeof beds === "string" ? parseInt(beds) || 0 : beds,
        bathrooms: typeof baths === "string" ? parseInt(baths) || 0 : baths,
        area_sqft: typeof area === "string" ? parseInt(area) || null : area || null,
        locality: location,
        region: "north_goa",
        is_featured: false,
        beach_distance_km: null,
        nri_eligible: true,
        created_at: new Date().toISOString(),
      });
    } catch {
      // Handled in context
    } finally {
      setIsToggling(false);
    }
  };

  const formattedPrice =
    typeof price === "number" ? formatPriceINR(price, (listing_type as any) || "sale") : price;

  const bedsNum = typeof beds === "string" ? parseInt(beds) || 0 : beds;
  const bathsNum = typeof baths === "string" ? parseInt(baths) || 0 : baths;

  return (
    <div
      onClick={() => navigate(`/property/${id}`)}
      className={`group flex flex-col gap-3.5 cursor-pointer font-sans ${className}`}
    >
      {/* 1. Property Image Container with Soft Architectural Corners */}
      <div className="relative aspect-[16/11] w-full overflow-hidden rounded-[18px] bg-[#EDE8E0] border border-[#EAE3D8] shadow-2xs group-hover:border-[#D5CCC0] transition-colors">
        <img
          src={imgSrc}
          alt={name}
          onError={() => setImgSrc(FALLBACK_IMAGE)}
          className="size-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
        />

        {/* Top Badges */}
        <div className="absolute top-3.5 left-3.5 z-10 pointer-events-none flex items-center gap-2">
          <span className="px-3 py-1 rounded-full text-[11px] font-semibold bg-white/95 text-[#172124] shadow-xs backdrop-blur-md border border-black/5">
            {listing_type === "rent" ? "For Rent" : "For Sale"}
          </span>
          {property_type && (
            <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full text-[10.5px] font-medium bg-[#172124]/75 text-white backdrop-blur-md capitalize">
              {property_type}
            </span>
          )}
        </div>

        {/* Bookmark Action Button */}
        <button
          type="button"
          onClick={handleBookmarkClick}
          disabled={isToggling}
          aria-label={saved ? `Remove ${name} from saved properties` : `Save ${name} to saved properties`}
          className={`absolute top-3.5 right-3.5 z-20 p-2 rounded-full backdrop-blur-md transition-all duration-200 shadow-sm ${
            saved
              ? "bg-amber-500 text-slate-950 scale-105 shadow-amber-500/30"
              : "bg-white/90 text-slate-700 hover:bg-white hover:text-amber-600 hover:scale-110"
          }`}
        >
          <Bookmark className={`size-4 ${saved ? "fill-slate-950" : ""}`} />
        </button>
      </div>

      {/* 2. Metadata Section (Homepage Matched Typography) */}
      <div className="flex flex-col gap-1.5 px-0.5">
        {/* Locality Tag */}
        <div className="flex items-center gap-1.5 text-[12px] text-[#8B7D68]">
          <MapPin className="size-3 text-[#8B7D68] shrink-0" />
          <span className="font-mono text-[11px] uppercase tracking-wider truncate">
            {location}
          </span>
        </div>

        {/* Property Title in Bold Display Typography */}
        <h3 className="font-display font-bold text-[18px] sm:text-[19px] text-[#172124] leading-snug group-hover:text-[#8B7D68] transition-colors line-clamp-1 tracking-tight">
          {name}
        </h3>

        {/* Specs Row */}
        <div className="flex items-center gap-2.5 text-[12px] text-[#717A7D] pt-0.5">
          {bedsNum > 0 && (
            <div className="flex items-center gap-1">
              <Bed className="size-3 text-[#8B7D68]" />
              <span>{bedsNum} Beds</span>
            </div>
          )}
          {bathsNum > 0 && (
            <>
              <span className="text-[#DDD6CB]">•</span>
              <div className="flex items-center gap-1">
                <Bath className="size-3 text-[#8B7D68]" />
                <span>{bathsNum} Baths</span>
              </div>
            </>
          )}
          {area && (
            <>
              <span className="text-[#DDD6CB]">•</span>
              <div className="flex items-center gap-1 truncate">
                <Maximize2 className="size-3 text-[#8B7D68]" />
                <span>{typeof area === "number" ? `${area} sqft` : area}</span>
              </div>
            </>
          )}
        </div>

        {/* Price Row */}
        <div className="pt-1 flex items-center justify-between">
          <span className="font-display font-bold text-[#172124] text-[17px] tracking-tight">
            {formattedPrice}
          </span>
          <span className="text-[12px] font-medium text-[#8B7D68] group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
            View Details &rsaquo;
          </span>
        </div>
      </div>
    </div>
  );
}
