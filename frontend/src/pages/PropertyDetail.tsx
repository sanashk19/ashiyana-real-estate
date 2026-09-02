import { useState, useEffect } from "react";
import { Link, useParams } from "react-router";
import {
  fetchPropertyById,
  fetchFeaturedProperties,
  formatPriceINR,
  formatRegionLabel,
  formatFacingLabel,
  formatPropertyTypeLabel,
  submitEnquiry,
  type PropertyPublicDto,
  type PropertyCardDto,
} from "@/lib/api";

import imgHero from "@/imports/RealEstate/fc08c6d52d3372bb7c332b62ae35bbf3dd4cc91a.png";
import imgThumb1 from "@/imports/PropertyDetailPage/05bb0952-bd1e-4c29-94a7-5104ddd03095.png";
import imgThumb2 from "@/imports/PropertyDetailPage/8c1a623f-a616-445c-87c2-db5fa32d59f3.png";
import imgThumb3 from "@/imports/PropertyDetailPage/9042758f-8384-49e8-a8fe-b42761b1ad04.png";

import { SiteNavbar } from "@/components/SiteNavbar";
import { SiteFooter } from "@/components/SiteFooter";
import { BackButton } from "@/components/BackButton";
import { PropertyCard } from "@/components/PropertyCard";
import { useBusinessProfile } from "@/context/BusinessProfileContext";
import {
  Bed,
  Bath,
  Maximize2,
  MapPin,
  Calendar,
  Phone,
  MessageSquare,
  Share2,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  X,
  Compass,
  Car,
  Sparkles,
} from "lucide-react";

// Amenity Icons Mapper
function getAmenityIcon(name: string) {
  const n = name.toLowerCase();
  if (n.includes("pool") || n.includes("water")) return <Sparkles className="size-4 text-[#17805B]" />;
  if (n.includes("security") || n.includes("guard") || n.includes("cctv")) return <ShieldCheck className="size-4 text-[#17805B]" />;
  if (n.includes("park") || n.includes("garage")) return <Car className="size-4 text-[#17805B]" />;
  return <CheckCircle2 className="size-4 text-[#17805B]" />;
}

export default function PropertyDetailPage() {
  const params = useParams();
  const propertyId = params.propertyId || params.id;
  const { profile } = useBusinessProfile();

  const [property, setProperty] = useState<PropertyPublicDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Gallery state
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  // Enquiry modal state
  const [enquiryModalOpen, setEnquiryModalOpen] = useState(false);
  const [enquiryIntent, setEnquiryIntent] = useState<"general" | "visit" | "offer">("general");

  // Share feedback toast
  const [shareToast, setShareToast] = useState(false);

  // Similar properties
  const [similarProps, setSimilarProps] = useState<PropertyCardDto[]>([]);

  // Fetch Property by ID
  useEffect(() => {
    let isMounted = true;
    if (!propertyId) {
      setLoading(false);
      setError("No property specified.");
      return;
    }

    setLoading(true);
    setError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });

    fetchPropertyById(propertyId)
      .then((data) => {
        if (isMounted) {
          setProperty(data);
          setActiveImageIndex(0);
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.error("Property fetch error:", err);
          setError("Failed to load property details. Please try again.");
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [propertyId]);

  // Fetch Similar Properties
  useEffect(() => {
    let isMounted = true;
    fetchFeaturedProperties()
      .then((data) => {
        if (isMounted && Array.isArray(data)) {
          const filtered = data.filter((p) => String(p.id) !== String(propertyId)).slice(0, 3);
          setSimilarProps(filtered);
        }
      })
      .catch((err) => console.warn("Similar properties fetch fallback:", err));

    return () => {
      isMounted = false;
    };
  }, [propertyId]);

  // Images list
  const backendImgs = property?.images?.length ? property.images.map((i) => i.image_url) : [];
  const galleryImages = backendImgs.length > 0 ? backendImgs : [imgHero, imgThumb1, imgThumb2, imgThumb3];
  const activeMainImage = galleryImages[activeImageIndex] || galleryImages[0] || "/goa-hero.png";

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: property?.title || "Ashiyana Luxury Real Estate",
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      setShareToast(true);
      setTimeout(() => setShareToast(false), 2500);
    }
  };

  const isRent = property?.listing_type === "rent" || property?.listing_type === "lease";
  const title = property?.title || "Modern 3 BHK Penthouse in Colva";
  const locality = property?.locality || "Colva";
  const regionLabel = property?.region ? formatRegionLabel(property.region) : "South Goa";
  const locationString = `${locality}, ${regionLabel}`;

  const defaultDescription = `Experience elevated luxury living in this stunning residence located in the heart of ${locality}. This property offers bespoke architecture, high-grade finishes, and seamless indoor-outdoor living crafted for the elite Goa coastal lifestyle.`;
  const descriptionText = property?.description?.trim() || defaultDescription;

  const amenitiesList = property?.amenities?.length
    ? property.amenities
    : [
        "Private Swimming Pool",
        "Sea / River View",
        "24/7 Gated Security",
        "100% Power Backup",
        "Elevator / Lift",
        "Air Conditioning",
        "High-Speed Wi-Fi",
        "Designer Modular Kitchen",
        "Private Landscaped Terrace",
        "Covered Parking Space",
      ];

  const tags: string[] = [];
  if (property?.property_type) tags.push(formatPropertyTypeLabel(property.property_type));
  if (property?.is_featured) tags.push("Featured");
  if (property?.nri_eligible) tags.push("NRI Eligible");
  if (property?.fema_compliant) tags.push("FEMA Compliant");

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] font-sans text-[#172124] flex flex-col">
        <SiteNavbar variant="page" />
        <div className="flex-1 flex flex-col items-center justify-center gap-3 py-32">
          <div className="size-8 rounded-full border-2 border-[#172124] border-t-transparent animate-spin" />
          <p className="text-[14px] text-[#717A7D]">Loading luxury residence details...</p>
        </div>
        <SiteFooter />
      </div>
    );
  }

  if (error || !property) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] font-sans text-[#172124] flex flex-col">
        <SiteNavbar variant="page" />
        <div className="flex-1 flex flex-col items-center justify-center gap-4 py-24 px-6 text-center">
          <h2 className="font-display font-bold text-[28px] text-[#172124]">
            Property Not Found
          </h2>
          <p className="text-[14px] text-[#717A7D] max-w-[420px]">
            {error || "The property listing you are trying to view is no longer active or does not exist."}
          </p>
          <Link
            to="/properties"
            className="mt-2 px-6 py-3 rounded-full bg-[#172124] text-white font-semibold text-[13.5px] hover:bg-[#2C383C] transition-colors"
          >
            Browse All Properties
          </Link>
        </div>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white font-sans text-[#172124] flex flex-col">
      <SiteNavbar variant="page" />

      {/* ─── BREADCRUMB & BACK NAVIGATION ────────────────────────────────────── */}
      <div className="bg-white border-b border-[#EDE8E0] py-4">
        <div className="max-w-[1400px] mx-auto px-6 sm:px-12 lg:px-16 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 text-[13px] text-[#717A7D]">
            <BackButton label="Back to Properties" fallback="/properties" />
            <span className="text-[#DDD6CB]">/</span>
            <Link to="/properties" className="hover:text-[#172124] transition-colors">
              Properties
            </Link>
            <span className="text-[#DDD6CB]">/</span>
            <span className="text-[#172124] font-medium truncate max-w-[200px] sm:max-w-md">
              {title}
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleShare}
              className="px-4 py-1.5 rounded-full border border-[#EDE8E0] text-[12.5px] font-semibold text-[#172124] hover:bg-[#FAF7F2] transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <Share2 className="size-3.5 text-[#172124]" />
              <span>Share</span>
            </button>
            {shareToast && (
              <span className="text-[12px] font-semibold text-[#8B7D68] animate-fade-in">
                Link copied!
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ─── MAIN PROPERTY DETAIL VIEW ───────────────────────────────────────── */}
      <main className="max-w-[1400px] w-full mx-auto px-6 sm:px-12 lg:px-16 py-10 sm:py-14 flex flex-col gap-12">
        
        {/* ─── 1. HERO PHOTO GALLERY ─────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-auto lg:h-[500px]">
          {/* Main Large Photo */}
          <div
            className="lg:col-span-8 relative h-[340px] sm:h-[460px] lg:h-full rounded-[24px] overflow-hidden cursor-pointer group bg-[#EDE8E0] border border-[#EDE8E0] shadow-xs"
            onClick={() => setIsLightboxOpen(true)}
          >
            <img
              src={activeMainImage}
              alt={title}
              className="size-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
            />
            {/* Badges Overlay */}
            <div className="absolute top-4 left-4 flex items-center gap-2 z-10">
              <span className="px-3.5 py-1 rounded-full text-[11px] font-semibold bg-white/95 text-[#172124] shadow-xs backdrop-blur-md">
                {isRent ? "For Rent" : "For Sale"}
              </span>
              {property?.is_featured && (
                <span className="px-3.5 py-1 rounded-full text-[11px] font-semibold bg-[#C9AD86] text-[#172124] shadow-xs backdrop-blur-md uppercase tracking-wider">
                  Featured
                </span>
              )}
            </div>

            {/* Photo Counter Pill */}
            <div className="absolute bottom-4 right-4 px-3.5 py-1.5 rounded-full bg-black/60 backdrop-blur-md text-white text-[12px] font-medium flex items-center gap-1.5 shadow-md">
              <span>{activeImageIndex + 1}</span>
              <span>/</span>
              <span>{galleryImages.length}</span>
              <span className="hidden sm:inline">Photos (Click to expand)</span>
            </div>
          </div>

          {/* Thumbnail Column */}
          <div className="lg:col-span-4 grid grid-cols-3 lg:grid-cols-1 gap-4 h-[100px] lg:h-full">
            {galleryImages.slice(0, 3).map((imgUrl, idx) => (
              <div
                key={idx}
                onClick={() => setActiveImageIndex(idx)}
                className={`relative rounded-[18px] overflow-hidden cursor-pointer bg-[#EDE8E0] border transition-all ${
                  activeImageIndex === idx
                    ? "border-[#172124] ring-2 ring-[#172124]/30"
                    : "border-[#EDE8E0] opacity-80 hover:opacity-100"
                }`}
              >
                <img src={imgUrl} alt={`Thumbnail ${idx + 1}`} className="size-full object-cover" />
              </div>
            ))}
          </div>
        </div>

        {/* ─── 2. PROPERTY CONTENT & SIDEBAR LEAD PANEL ───────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 sm:gap-12 items-start">
          
          {/* Left Main Details Column (8 of 12) */}
          <div className="lg:col-span-8 flex flex-col gap-8">
            
            {/* Header / Title / Location / Price Row */}
            <div className="bg-white rounded-[24px] p-7 sm:p-9 border border-[#EDE8E0] shadow-xs flex flex-col gap-6">
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  {tags.map((t) => (
                    <span
                      key={t}
                      className="px-3 py-1 rounded-full text-[11px] font-mono uppercase tracking-wider bg-[#FAF7F2] text-[#8B7D68] border border-[#EDE8E0]"
                    >
                      [ {t} ]
                    </span>
                  ))}
                </div>

                <h1 className="font-display font-bold text-[30px] sm:text-[42px] text-[#172124] leading-tight tracking-tight">
                  {title}
                </h1>

                <div className="flex items-center gap-1.5 text-[14.5px] text-[#717A7D]">
                  <MapPin className="size-4 text-[#8B7D68] shrink-0" />
                  <span>{locationString}</span>
                </div>
              </div>

              {/* Price Banner */}
              <div className="p-5 rounded-[18px] bg-[#FAF7F2] border border-[#EDE8E0] flex items-center justify-between flex-wrap gap-4">
                <div>
                  <span className="text-[12px] text-[#8B7D68] font-medium block">Price Guide</span>
                  <span className="font-display font-bold text-[30px] sm:text-[36px] text-[#172124] tracking-tight leading-none">
                    {formatPriceINR(property?.price || 0, property?.listing_type)}
                  </span>
                </div>
                <span className="text-[12px] font-semibold text-[#172124] bg-white px-3.5 py-1.5 rounded-full border border-[#EDE8E0] shadow-2xs">
                  Verified Legal Title
                </span>
              </div>

              {/* Key Specs Row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-[#EDE8E0]">
                <div className="flex items-center gap-3">
                  <div className="size-11 rounded-full bg-[#FAF7F2] border border-[#EDE8E0] flex items-center justify-center text-[#8B7D68]">
                    <Bed className="size-5" />
                  </div>
                  <div>
                    <span className="text-[11.5px] text-[#717A7D] block">Bedrooms</span>
                    <span className="font-bold text-[15px] text-[#172124]">
                      {property?.bedrooms || 3} Beds
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="size-11 rounded-full bg-[#FAF7F2] border border-[#EDE8E0] flex items-center justify-center text-[#8B7D68]">
                    <Bath className="size-5" />
                  </div>
                  <div>
                    <span className="text-[11.5px] text-[#717A7D] block">Bathrooms</span>
                    <span className="font-bold text-[15px] text-[#172124]">
                      {property?.bathrooms || 3} Baths
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="size-11 rounded-full bg-[#FAF7F2] border border-[#EDE8E0] flex items-center justify-center text-[#8B7D68]">
                    <Maximize2 className="size-5" />
                  </div>
                  <div>
                    <span className="text-[11.5px] text-[#717A7D] block">Built-up Area</span>
                    <span className="font-bold text-[15px] text-[#172124]">
                      {property?.area_sqft ? `${property.area_sqft} sqft` : "3,200 sqft"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="size-11 rounded-full bg-[#FAF7F2] border border-[#EDE8E0] flex items-center justify-center text-[#8B7D68]">
                    <Compass className="size-5" />
                  </div>
                  <div>
                    <span className="text-[11.5px] text-[#717A7D] block">Facing</span>
                    <span className="font-bold text-[15px] text-[#172124]">
                      {property?.facing ? formatFacingLabel(property.facing) : "East Facing"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="bg-white rounded-[24px] p-7 sm:p-9 border border-[#EDE8E0] shadow-xs flex flex-col gap-4">
              <h2 className="font-display font-bold text-[22px] sm:text-[24px] text-[#172124]">
                About this Residence
              </h2>
              <p className="text-[14.5px] text-[#717A7D] leading-relaxed whitespace-pre-line">
                {descriptionText}
              </p>
            </div>

            {/* Amenities & Features */}
            <div className="bg-white rounded-[24px] p-7 sm:p-9 border border-[#EDE8E0] shadow-xs flex flex-col gap-6">
              <h2 className="font-display font-bold text-[22px] sm:text-[24px] text-[#172124]">
                Property Amenities & Features
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {amenitiesList.map((amenity) => (
                  <div
                    key={amenity}
                    className="flex items-center gap-3 p-3.5 rounded-[14px] bg-[#FAF7F2] border border-[#EDE8E0]"
                  >
                    {getAmenityIcon(amenity)}
                    <span className="text-[13.5px] font-medium text-[#172124]">{amenity}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Location Section with Google Maps Direct Link */}
            <div className="bg-white rounded-[24px] p-7 sm:p-9 border border-[#EDE8E0] shadow-xs flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h2 className="font-display font-bold text-[22px] sm:text-[24px] text-[#172124]">
                  Location & Neighborhood
                </h2>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                    `${locality}, Goa, India`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[13px] font-semibold text-[#8B7D68] hover:text-[#172124] flex items-center gap-1.5 transition-colors"
                >
                  <span>Open on Google Maps</span>
                  <ExternalLink className="size-3.5" />
                </a>
              </div>

              <p className="text-[14.5px] text-[#717A7D] leading-relaxed">
                Situated in prime <strong className="text-[#172124]">{locality}</strong> ({regionLabel}), offering serene surroundings, seamless beach access, and proximity to Goa's celebrated dining and coastal lifestyle destinations.
              </p>
            </div>

          </div>

          {/* Right Lead / Broker Contact Sidebar (4 of 12) */}
          <div className="lg:col-span-4 sticky top-24 flex flex-col gap-6">
            <div className="bg-white rounded-[24px] p-7 sm:p-8 border border-[#EDE8E0] shadow-xs flex flex-col gap-6">
              
              <div className="flex flex-col gap-1.5 pb-5 border-b border-[#EDE8E0]">
                <span className="text-[11px] font-mono font-semibold uppercase tracking-[0.2em] text-[#8B7D68]">
                  [ Direct Broker Advisory ]
                </span>
                <h3 className="font-display font-bold text-[22px] text-[#172124]">
                  Interested in this residence?
                </h3>
                <p className="text-[13px] text-[#717A7D] leading-relaxed">
                  Connect directly with {profile?.broker_name || "Kassim Shaikh"} for verified private walkthrough and negotiations.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-3">
                {/* 1. Schedule Visit / Get in Touch */}
                <button
                  onClick={() => {
                    setEnquiryIntent("visit");
                    setEnquiryModalOpen(true);
                  }}
                  className="w-full py-3.5 rounded-full bg-[#172124] text-white font-semibold text-[13.5px] hover:bg-[#2C383C] transition-colors flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                >
                  <Calendar className="size-4" />
                  <span>Schedule Private Walkthrough</span>
                </button>

                {/* 2. WhatsApp Direct Action */}
                <a
                  href={`https://wa.me/${(profile?.whatsapp_number || "+919511854490").replace(/\D/g, "")}?text=${encodeURIComponent(
                    `Hi ${profile?.broker_name || "Kassim Shaikh"}, I am interested in viewing "${title}" in ${locality}.`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3.5 rounded-full border border-emerald-300 bg-emerald-50 text-[#17805B] font-semibold text-[13.5px] hover:bg-emerald-100 transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <MessageSquare className="size-4 text-[#17805B]" />
                  <span>WhatsApp Broker</span>
                </a>

                {/* 3. Phone Call Action */}
                <a
                  href={`tel:${(profile?.phone || "+918322467890").replace(/\s+/g, "")}`}
                  className="w-full py-3.5 rounded-full border border-[#EDE8E0] text-[#172124] font-semibold text-[13.5px] hover:bg-[#FAF7F2] transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Phone className="size-4 text-[#717A7D]" />
                  <span>Call {profile?.phone || "+91 832 246 7890"}</span>
                </a>
              </div>

              {/* Broker Profile Stamp */}
              <div className="pt-4 border-t border-[#EDE8E0] flex items-center gap-3.5">
                <div className="size-12 rounded-full bg-[#172124] text-[#C9AD86] flex items-center justify-center font-bold text-sm">
                  KS
                </div>
                <div>
                  <h4 className="font-bold text-[14.5px] text-[#172124]">
                    {profile?.broker_name || "Kassim Shaikh"}
                  </h4>
                  <p className="text-[12px] text-[#717A7D]">
                    {profile?.broker_role || "Lead Broker & Founder"} · Ashiyana
                  </p>
                </div>
              </div>

            </div>
          </div>

        </div>

        {/* ─── 3. SIMILAR PROPERTIES SECTION ─────────────────────────────────── */}
        {similarProps.length > 0 && (
          <div className="pt-12 border-t border-[#EDE8E0] flex flex-col gap-8">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-mono font-semibold uppercase tracking-[0.2em] text-[#8B7D68] block mb-1">
                  [ Recommendations ]
                </span>
                <h2 className="font-display font-bold text-[28px] sm:text-[34px] text-[#172124]">
                  Similar Luxury Residences in Goa
                </h2>
              </div>
              <Link to="/properties" className="text-[13.5px] font-semibold text-[#8B7D68] hover:text-[#172124] transition-colors">
                View all properties &rsaquo;
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-7 sm:gap-9">
              {similarProps.map((sim) => (
                <PropertyCard
                  key={sim.id}
                  id={sim.id}
                  image={sim.thumbnail_url}
                  name={sim.title}
                  location={`${sim.locality}, ${formatRegionLabel(sim.region)}`}
                  price={sim.price}
                  beds={sim.bedrooms}
                  baths={sim.bathrooms}
                  area={sim.area_sqft ? `${sim.area_sqft} sqft` : undefined}
                  property_type={sim.property_type}
                  listing_type={sim.listing_type}
                  featured={sim.is_featured}
                />
              ))}
            </div>
          </div>
        )}

      </main>

      {/* ─── FULLSCREEN LIGHTBOX ────────────────────────────────────────────── */}
      {isLightboxOpen && (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-4">
          <button
            onClick={() => setIsLightboxOpen(false)}
            className="absolute top-5 right-5 text-white p-2 rounded-full hover:bg-white/10 cursor-pointer z-10"
            aria-label="Close fullscreen view"
          >
            <X className="size-6" />
          </button>
          <div className="relative w-full max-w-[1100px] aspect-video rounded-2xl overflow-hidden bg-black">
            <img
              src={galleryImages[activeImageIndex] || galleryImages[0]}
              alt={title}
              className="size-full object-contain"
            />
          </div>
          {/* Thumbnails in Lightbox */}
          <div className="flex gap-2.5 mt-4 overflow-x-auto max-w-full pb-2">
            {galleryImages.map((src, idx) => (
              <button
                key={idx}
                onClick={() => setActiveImageIndex(idx)}
                className={`w-16 h-12 rounded-xl overflow-hidden shrink-0 border-2 cursor-pointer transition-all ${
                  activeImageIndex === idx ? "border-[#C9AD86]" : "border-transparent opacity-50 hover:opacity-100"
                }`}
              >
                <img src={src} alt="" className="size-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ─── ENQUIRY / SCHEDULE VISIT MODAL ─────────────────────────────────── */}
      <PropertyEnquiryModal
        isOpen={enquiryModalOpen}
        onClose={() => setEnquiryModalOpen(false)}
        propertyId={property?.id}
        propertyTitle={title}
      />

      <SiteFooter />
    </div>
  );
}

// ─── LEAD / ENQUIRY MODAL COMPONENT ──────────────────────────────────────────
function PropertyEnquiryModal({
  isOpen,
  onClose,
  propertyId,
  propertyTitle,
}: {
  isOpen: boolean;
  onClose: () => void;
  propertyId?: string;
  propertyTitle: string;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState(`I would like to schedule a private walkthrough for "${propertyTitle}".`);
  const [isNri, setIsNri] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      setErrorMsg("Please provide your name and contact phone number.");
      return;
    }

    setSubmitting(true);
    setErrorMsg("");

    try {
      await submitEnquiry({
        property_id: propertyId,
        visitor_name: name.trim(),
        visitor_phone: phone.trim(),
        visitor_email: email.trim() || undefined,
        message: message.trim(),
        is_nri: isNri,
      });
      setSubmitted(true);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to submit enquiry. Please try WhatsApp or calling directly.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-[480px] bg-white rounded-[24px] p-6 sm:p-8 shadow-2xl border border-[#EDE8E0] flex flex-col gap-4 font-sans animate-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-3.5 border-b border-[#EDE8E0]">
          <div>
            <span className="text-[10.5px] font-mono font-semibold uppercase tracking-[0.18em] text-[#8B7D68] block">
              [ Private Walkthrough ]
            </span>
            <h3 className="font-display font-bold text-[20px] text-[#172124]">
              Schedule Private Inspection
            </h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-[#FAF7F2] text-gray-500 cursor-pointer transition-colors">
            <X className="size-5" />
          </button>
        </div>

        {submitted ? (
          <div className="py-8 flex flex-col items-center justify-center text-center gap-3">
            <div className="size-12 rounded-full bg-emerald-100 text-[#17805B] flex items-center justify-center">
              <CheckCircle2 className="size-6" />
            </div>
            <h4 className="font-display font-bold text-[20px] text-[#172124]">
              Enquiry Received
            </h4>
            <p className="text-[13.5px] text-[#717A7D] max-w-sm leading-relaxed">
              Thank you, <strong>{name}</strong>. Our lead broker will contact you shortly on {phone} to coordinate your walkthrough.
            </p>
            <button
              onClick={onClose}
              className="mt-2 px-6 py-2.5 rounded-full bg-[#172124] text-white font-semibold text-[13px] hover:bg-[#2C383C] transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
            {errorMsg && (
              <div className="p-3 rounded-xl bg-red-50 text-red-600 text-[12.5px]">
                {errorMsg}
              </div>
            )}

            <div className="flex flex-col gap-1">
              <label className="text-[11.5px] font-semibold text-[#8B7D68] uppercase tracking-wider">
                Full Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Sujit Nair"
                className="w-full px-4 py-2.5 rounded-[12px] bg-[#FAF7F2] border border-[#EDE8E0] text-[13.5px] text-[#172124] focus:outline-none focus:border-[#172124] transition-colors"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[11.5px] font-semibold text-[#8B7D68] uppercase tracking-wider">
                Phone Number (WhatsApp) *
              </label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. +91 98765 43210"
                className="w-full px-4 py-2.5 rounded-[12px] bg-[#FAF7F2] border border-[#EDE8E0] text-[13.5px] text-[#172124] focus:outline-none focus:border-[#172124] transition-colors"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[11.5px] font-semibold text-[#8B7D68] uppercase tracking-wider">
                Email Address (Optional)
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. sujit@gmail.com"
                className="w-full px-4 py-2.5 rounded-[12px] bg-[#FAF7F2] border border-[#EDE8E0] text-[13.5px] text-[#172124] focus:outline-none focus:border-[#172124] transition-colors"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[11.5px] font-semibold text-[#8B7D68] uppercase tracking-wider">
                Message / Preferred Date
              </label>
              <textarea
                rows={2}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full px-4 py-2.5 rounded-[12px] bg-[#FAF7F2] border border-[#EDE8E0] text-[13px] text-[#172124] focus:outline-none focus:border-[#172124] transition-colors resize-none"
              />
            </div>

            <label className="flex items-center gap-2 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={isNri}
                onChange={(e) => setIsNri(e.target.checked)}
                className="size-4 rounded text-[#172124] focus:ring-0"
              />
              <span className="text-[12.5px] text-[#717A7D]">I am an NRI / Overseas Investor</span>
            </label>

            <button
              type="submit"
              disabled={submitting}
              className="w-full mt-2 py-3.5 rounded-full bg-[#172124] text-white font-semibold text-[13.5px] hover:bg-[#2C383C] transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
            >
              {submitting ? "Submitting..." : "Send Inspection Request"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
