import { useState } from "react";
import { Link } from "react-router";
import imgA from "@/imports/BlogListingPage/3fbc2351-cff7-4b24-ab76-71bb4416dd38.png";
import imgB from "@/imports/BlogListingPage/47d090b0-eb4a-4419-87dc-0781ac05eb67.png";
import imgC from "@/imports/BlogListingPage/4f696125-bf2f-431d-ab5b-1ccf271ee98b.png";
import imgD from "@/imports/BlogListingPage/67da4c78-0937-43db-8178-6923d91a29ed.png";
import imgE from "@/imports/BlogListingPage/90afca2a-41a7-4cd2-a68e-f0354acfec51.png";
import imgF from "@/imports/BlogListingPage/93f304fb-619f-4880-a6d5-5ba181024c3b.png";
import imgG from "@/imports/BlogListingPage/aaec7d4b-eaca-4b76-9556-15444b73771d.png";
import imgH from "@/imports/BlogListingPage/cefee654-d0f0-426a-8dbf-94f1934d1c73.png";
import imgI from "@/imports/BlogListingPage/ecbc4529-1399-46cc-a5e3-4bd9b711c200.png";

import {
    BG, GREEN, Reveal, SectionLabel,
    IconSearch, IconChevronDown, IconArrowRight,
} from "@/lib/shared";
import { SiteNavbar } from "@/components/SiteNavbar";
import { SiteFooter } from "@/components/SiteFooter";
import { BackButton } from "@/components/BackButton";
import { Waves, Sparkles, Users, TrendingUp, Building2, SunMedium, Trees } from "lucide-react";

// ─── Constants ────────────────────────────────────────────────────────────────
const GOLD = "#C4A66A";

// ─── Icons ────────────────────────────────────────────────────────────────────
function IconStar({ filled = true }: { filled?: boolean }) {
    return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill={filled ? GOLD : "none"} stroke={GOLD} strokeWidth="2">
            <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
        </svg>
    );
}
function StarRating({ rating }: { rating: number }) {
    return (
        <div className="flex gap-[2px] items-center">
            {[1, 2, 3, 4, 5].map((s) => <IconStar key={s} filled={s <= rating} />)}
        </div>
    );
}
function IconMap() {
    return (
        <svg width="16" height="20" viewBox="0 0 16.5 20.9998" fill="none">
            <path d="M8.25 0C3.697 0 0 3.697 0 8.25C0 14.4375 8.25 21 8.25 21C8.25 21 16.5 14.4375 16.5 8.25C16.5 3.697 12.803 0 8.25 0ZM8.25 11.25C6.594 11.25 5.25 9.906 5.25 8.25C5.25 6.594 6.594 5.25 8.25 5.25C9.906 5.25 11.25 6.594 11.25 8.25C11.25 9.906 9.906 11.25 8.25 11.25Z" fill={`${BG}50`} />
        </svg>
    );
}
function IconBeach() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={GREEN} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17.657 18.657A8 8 0 0 1 6.343 7.343S7 9 9 10c0-2 .5-5 2.986-6.914a10 10 0 0 1 9.228 9.228C19.5 15 17 17.5 15 19c1-2 .657-2.343.657-2.343z" />
        </svg>
    );
}
function IconTrend() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={GREEN} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" />
        </svg>
    );
}
function IconHome() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={GREEN} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
        </svg>
    );
}
function IconNRI() {
    return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><path d="m9 12 2 2 4-4" />
        </svg>
    );
}
function IconVerified() {
    return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0 1 12 2.944a11.955 11.955 0 0 1-8.618 3.04A12.02 12.02 0 0 0 3 9c0 5.591 3.824 10.29 9 11.622C17.176 19.29 21 14.591 21 9c0-1.067-.13-2.108-.382-3.016z" fill={GREEN} />
            <path d="M9 12l2 2 4-4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

// ─── Data ─────────────────────────────────────────────────────────────────────
type Locality = {
    name: string;
    region: "North Goa" | "South Goa";
    image: string;
    desc: string;
    price: string;
    beach: string;
    popularity: "High" | "Medium" | "Low";
    investmentRating: number;
    rentalDemand: "Very High" | "High" | "Medium";
    nri: boolean;
    listings: number;
    tags: string[];
};

const LOCALITIES: Locality[] = [
    { name: "Candolim", region: "North Goa", image: imgA, desc: "Pristine beaches, upscale restaurants, and a calm vibe make Candolim the crown jewel of North Goa real estate.", price: "₹2.5–5 Cr", beach: "200m", popularity: "High", investmentRating: 5, rentalDemand: "Very High", nri: true, listings: 24, tags: ["Beach Living", "Luxury Villas", "NRI Friendly"] },
    { name: "Calangute", region: "North Goa", image: imgB, desc: "The Queen of Goa's beaches — vibrant nightlife, thriving tourism, and excellent short-term rental yields.", price: "₹1.8–4 Cr", beach: "300m", popularity: "High", investmentRating: 5, rentalDemand: "Very High", nri: true, listings: 31, tags: ["Vacation Homes", "Investment Hotspot"] },
    { name: "Anjuna", region: "North Goa", image: imgC, desc: "Bohemian spirit meets luxury living. A haven for artists, entrepreneurs, and global nomads seeking unique villas.", price: "₹2–4.5 Cr", beach: "500m", popularity: "High", investmentRating: 4, rentalDemand: "High", nri: true, listings: 18, tags: ["Peaceful Retreats", "Nature Lovers"] },
    { name: "Assagao", region: "North Goa", image: imgD, desc: "Goa's most sought-after luxury village. Celebrity-favourite, boutique restaurants, and incredible villa estates.", price: "₹3–8 Cr", beach: "4km", popularity: "High", investmentRating: 5, rentalDemand: "Very High", nri: true, listings: 14, tags: ["Luxury Villas", "Peaceful Retreats", "Investment Hotspot"] },
    { name: "Vagator", region: "North Goa", image: imgE, desc: "Red cliffs, dramatic ocean views, and a thriving creative scene make Vagator one of Goa's most photogenic locales.", price: "₹1.5–3.5 Cr", beach: "400m", popularity: "High", investmentRating: 4, rentalDemand: "High", nri: false, listings: 11, tags: ["Beach Living", "Vacation Homes"] },
    { name: "Morjim", region: "North Goa", image: imgF, desc: "Turtle beach serenity. Morjim offers low-density luxury with stunning riverside and beachfront plots.", price: "₹1.2–3 Cr", beach: "150m", popularity: "Medium", investmentRating: 4, rentalDemand: "High", nri: true, listings: 9, tags: ["Nature Lovers", "Peaceful Retreats"] },
    { name: "Siolim", region: "North Goa", image: imgG, desc: "A tranquil river town with stunning heritage Portuguese homes, boutique cafés, and growing luxury demand.", price: "₹2–5 Cr", beach: "6km", popularity: "Medium", investmentRating: 4, rentalDemand: "Medium", nri: true, listings: 7, tags: ["Family Friendly", "Peaceful Retreats"] },
    { name: "Panjim", region: "North Goa", image: imgH, desc: "Goa's vibrant capital with Portuguese-Goan heritage architecture, cultural life, and urban convenience.", price: "₹90L–2.5 Cr", beach: "8km", popularity: "Medium", investmentRating: 3, rentalDemand: "Medium", nri: false, listings: 15, tags: ["Family Friendly", "Investment Hotspot"] },
    { name: "Palolem", region: "South Goa", image: imgI, desc: "South Goa's most iconic crescent beach. Peaceful, pristine, and perfect for boutique resorts and eco-villas.", price: "₹80L–2.2 Cr", beach: "100m", popularity: "High", investmentRating: 4, rentalDemand: "High", nri: true, listings: 12, tags: ["Beach Living", "Nature Lovers", "Vacation Homes"] },
    { name: "Colva", region: "South Goa", image: imgA, desc: "South Goa's longest beach, known for peace, affordable luxury, and growing NRI investment interest.", price: "₹70L–1.8 Cr", beach: "250m", popularity: "Medium", investmentRating: 3, rentalDemand: "Medium", nri: true, listings: 8, tags: ["Beach Living", "Family Friendly"] },
    { name: "Benaulim", region: "South Goa", image: imgB, desc: "Premium beach village beloved by Portuguese Goan families and NRIs seeking quiet luxury near the sea.", price: "₹1–2.5 Cr", beach: "300m", popularity: "Medium", investmentRating: 4, rentalDemand: "High", nri: true, listings: 10, tags: ["Family Friendly", "NRI Friendly"] },
    { name: "Agonda", region: "South Goa", image: imgC, desc: "One of Goa's most unspoiled beaches — an eco-conscious luxury destination with zero commercialisation.", price: "₹60L–1.5 Cr", beach: "200m", popularity: "Medium", investmentRating: 3, rentalDemand: "Medium", nri: false, listings: 5, tags: ["Nature Lovers", "Peaceful Retreats"] },
];

type LifestyleTag = "All" | "Beach Living" | "Peaceful Retreats" | "Family Friendly" | "Investment Hotspot" | "Luxury Villas" | "Vacation Homes" | "Nature Lovers";

const LIFESTYLE_CATS: { tag: LifestyleTag; desc: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { tag: "Beach Living", desc: "Beachfront villas and sea-facing apartments", icon: Waves },
    { tag: "Peaceful Retreats", desc: "Quiet villages and serene hideaways", icon: Sparkles },
    { tag: "Family Friendly", desc: "Safe, well-connected family neighbourhoods", icon: Users },
    { tag: "Investment Hotspot", desc: "High-yield, high-appreciation areas", icon: TrendingUp },
    { tag: "Luxury Villas", desc: "Premium estates and celebrity retreats", icon: Building2 },
    { tag: "Vacation Homes", desc: "Short-term rental and holiday getaways", icon: SunMedium },
    { tag: "Nature Lovers", desc: "Forest, river, and eco-living spaces", icon: Trees },
];

// ─── Hero ─────────────────────────────────────────────────────────────────────
function Hero() {
    return (
        <div className="relative w-full overflow-hidden font-sans" style={{ height: "clamp(480px, 60vh, 720px)" }}>
            <img src={imgG} alt="Goa" className="absolute inset-0 size-full object-cover" style={{ transform: "scale(1.05)" }} />
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/30 to-black/70" />
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6 gap-[24px]">
                <Reveal>
                    <SectionLabel text="Goa Area Guide" dark />
                </Reveal>
                <Reveal delay={60}>
                    <h1 className="font-display font-medium text-white leading-[1.08] tracking-[-0.02em] text-[48px] sm:text-[72px] lg:text-[88px]">
                        Explore Goa
                    </h1>
                </Reveal>
                <Reveal delay={120}>
                    <p className="font-normal text-white/80 leading-[1.5] max-w-[640px] text-[16px] sm:text-[19px]">
                        Discover Goa's most desirable neighbourhoods and find the perfect place to call home, invest, or vacation.
                    </p>
                </Reveal>
                <Reveal delay={160}>
                    <div className="flex gap-[12px] flex-wrap justify-center">
                        <Link to="/properties" className="flex items-center gap-[8px] px-[28px] py-[14px] rounded-full font-semibold text-[15px] text-white btn-hover" style={{ backgroundColor: GREEN }}>
                            Browse Properties <IconArrowRight color="white" />
                        </Link>
                        <Link to="/contact" className="flex items-center gap-[8px] px-[28px] py-[14px] rounded-full font-semibold text-[15px] text-white border border-white/30 backdrop-blur-sm hover:bg-white/10 transition-colors">
                            Talk to an Expert
                        </Link>
                    </div>
                </Reveal>
            </div>

            {/* Stats bar */}
            <div className="absolute bottom-0 left-0 right-0">
                <div className="max-w-[1400px] mx-auto px-6">
                    <div className="flex flex-wrap items-center divide-x bg-white/95 backdrop-blur-md rounded-t-[20px] overflow-hidden shadow-[0_-4px_32px_rgba(0,0,0,0.12)]" style={{ borderColor: `${BG}10` }}>
                        {[
                            { value: "50+", label: "Premium Listings" },
                            { value: "25+", label: "Goa Localities" },
                            { value: "100%", label: "Verified Properties" },
                            { value: "NRI", label: "Friendly Investments" },
                        ].map(({ value, label }) => (
                            <div key={label} className="flex-1 min-w-[140px] flex flex-col items-center justify-center py-[20px] px-[16px] gap-[2px]" style={{ borderColor: `${BG}10` }}>
                                <p className="font-bold text-[28px] leading-[1.1]" style={{ color: GREEN }}>{value}</p>
                                <p className="font-normal text-[13px] text-[#172023]/60 leading-[1.4]">{label}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Search & Filter ──────────────────────────────────────────────────────────
type Filters = {
    search: string;
    region: "All" | "North Goa" | "South Goa";
    lifestyle: LifestyleTag;
    budget: string;
};

function SearchFilter({ filters, onChange }: { filters: Filters; onChange: (f: Filters) => void }) {
    function set(k: keyof Filters, v: string) { onChange({ ...filters, [k]: v }); }

    return (
        <div className="bg-white border border-[#172023]/10 rounded-[20px] p-[8px] flex flex-wrap gap-[8px] items-center shadow-[0_4px_32px_rgba(23,32,35,0.06)] font-sans">
            {/* Search */}
            <div className="flex items-center gap-[10px] flex-1 min-w-[180px] px-[16px] py-[12px]">
                <IconSearch color={`${BG}50`} />
                <input
                    className="flex-1 bg-transparent outline-none font-normal text-[15px] text-[#172023] placeholder-[#17202350] leading-[1.4] min-w-0"
                    placeholder="Search locality…"
                    value={filters.search}
                    onChange={(e) => set("search", e.target.value)}
                />
            </div>

            <div className="w-px h-[32px] bg-[#172023]/10 hidden sm:block" />

            {/* Region toggle */}
            <div className="flex items-center gap-[4px] bg-[#172023]/5 rounded-[12px] p-[4px]">
                {(["All", "North Goa", "South Goa"] as const).map((r) => (
                    <button
                        key={r}
                        onClick={() => set("region", r)}
                        className="px-[14px] py-[8px] rounded-[10px] font-semibold text-[13px] leading-[1.4] transition-all duration-200 whitespace-nowrap cursor-pointer"
                        style={{
                            backgroundColor: filters.region === r ? GREEN : "transparent",
                            color: filters.region === r ? "white" : `${BG}70`,
                        }}
                    >
                        {r}
                    </button>
                ))}
            </div>

            <div className="w-px h-[32px] bg-[#172023]/10 hidden sm:block" />

            {/* Lifestyle */}
            <div className="relative">
                <select
                    className="appearance-none bg-transparent outline-none pl-[12px] pr-[28px] py-[10px] font-medium text-[14px] text-[#172023] leading-[1.4] cursor-pointer"
                    value={filters.lifestyle}
                    onChange={(e) => set("lifestyle", e.target.value as LifestyleTag)}
                >
                    <option value="All">All Lifestyles</option>
                    {LIFESTYLE_CATS.map(({ tag }) => <option key={tag} value={tag}>{tag}</option>)}
                </select>
                <div className="pointer-events-none absolute right-[8px] top-1/2 -translate-y-1/2">
                    <IconChevronDown color={`${BG}60`} />
                </div>
            </div>

            <div className="w-px h-[32px] bg-[#172023]/10 hidden sm:block" />

            {/* Budget */}
            <div className="relative">
                <select
                    className="appearance-none bg-transparent outline-none pl-[12px] pr-[28px] py-[10px] font-medium text-[14px] text-[#172023] leading-[1.4] cursor-pointer"
                    value={filters.budget}
                    onChange={(e) => set("budget", e.target.value)}
                >
                    <option>Any Budget</option>
                    <option>Under ₹1 Cr</option>
                    <option>₹1–3 Cr</option>
                    <option>₹3–5 Cr</option>
                    <option>₹5 Cr+</option>
                </select>
                <div className="pointer-events-none absolute right-[8px] top-1/2 -translate-y-1/2">
                    <IconChevronDown color={`${BG}60`} />
                </div>
            </div>
        </div>
    );
}

// ─── Locality Card ────────────────────────────────────────────────────────────
function LocalityCard({ loc, delay = 0 }: { loc: Locality; delay?: number }) {
    const demandColor = loc.rentalDemand === "Very High" ? GREEN : loc.rentalDemand === "High" ? GOLD : `${BG}60`;

    return (
        <Reveal delay={delay}>
            <div className="group rounded-[20px] border border-[#172023]/10 bg-white overflow-hidden flex flex-col card-lift transition-all duration-300 font-sans h-full">
                {/* Image */}
                <div className="relative h-[220px] overflow-hidden img-hover-zoom">
                    <img src={loc.image} alt={loc.name} className="absolute inset-0 size-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                    {/* Badges */}
                    <div className="absolute top-[14px] left-[14px] flex gap-[6px] flex-wrap">
                        <span
                            className="px-[10px] py-[5px] rounded-full font-semibold text-[11px] uppercase tracking-[0.4px] text-white shadow-xs"
                            style={{ backgroundColor: loc.region === "North Goa" ? GREEN : GOLD }}
                        >
                            {loc.region}
                        </span>
                        {loc.nri && (
                            <span className="flex items-center gap-[4px] px-[10px] py-[5px] rounded-full font-semibold text-[11px] uppercase tracking-[0.4px] text-white bg-black/40 backdrop-blur-sm">
                                <IconNRI /> NRI Fav
                            </span>
                        )}
                    </div>

                    <div className="absolute bottom-[14px] left-[14px]">
                        <span className="px-[10px] py-[5px] rounded-full font-semibold text-[12px] text-white bg-black/40 backdrop-blur-sm">
                            {loc.listings} Properties Listed
                        </span>
                    </div>

                    <div className="absolute top-[14px] right-[14px]">
                        <div className="bg-white/90 backdrop-blur-sm rounded-full px-[10px] py-[4px] flex items-center gap-[4px] shadow-sm">
                            <IconStar />
                            <span className="font-bold text-[12px] text-[#172023]">{loc.investmentRating}.0</span>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="p-[24px] flex flex-col gap-[16px] flex-1">
                    <div>
                        <div className="flex items-center justify-between">
                            <h3 className="font-semibold text-[20px] text-[#172023] leading-[1.2]">{loc.name}</h3>
                            <StarRating rating={loc.investmentRating} />
                        </div>
                        <div className="flex items-center gap-[6px] mt-[4px]">
                            <IconMap />
                            <p className="font-normal text-[13px] text-[#172023]/50 leading-[1.4]">{loc.region} · {loc.beach} to beach</p>
                        </div>
                    </div>

                    <p className="font-normal text-[14px] text-[#172023]/70 leading-[1.6] flex-1">{loc.desc}</p>

                    {/* Stats strip */}
                    <div className="grid grid-cols-2 gap-[12px] p-[12px] rounded-[12px] bg-[#172023]/[0.03] border border-[#172023]/5">
                        <div>
                            <p className="font-normal text-[11px] text-[#172023]/40 uppercase tracking-[0.4px]">Avg. Price</p>
                            <p className="font-bold text-[15px] leading-[1.2]" style={{ color: GREEN }}>{loc.price}</p>
                        </div>
                        <div>
                            <p className="font-normal text-[11px] text-[#172023]/40 uppercase tracking-[0.4px]">Rental Demand</p>
                            <p className="font-bold text-[13px]" style={{ color: demandColor }}>{loc.rentalDemand}</p>
                        </div>
                    </div>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-[6px]">
                        {loc.tags.map((tag) => (
                            <span key={tag} className="px-[10px] py-[4px] rounded-full font-normal text-[12px] text-[#172023]/70 leading-[1.4]" style={{ backgroundColor: `${BG}08` }}>{tag}</span>
                        ))}
                    </div>

                    {/* CTA */}
                    <Link
                        to={`/properties?locality=${encodeURIComponent(loc.name)}`}
                        className="flex items-center justify-between w-full px-[20px] py-[12px] rounded-full font-semibold text-[14px] text-white btn-hover cursor-pointer"
                        style={{ backgroundColor: BG }}
                    >
                        <span>Explore {loc.name}</span>
                        <IconArrowRight color="white" />
                    </Link>
                </div>
            </div>
        </Reveal>
    );
}

// ─── Featured Localities Section ──────────────────────────────────────────────
function FeaturedLocalities() {
    const [filters, setFilters] = useState<Filters>({
        search: "", region: "All", lifestyle: "All", budget: "Any Budget",
    });

    const filtered = LOCALITIES.filter((l) => {
        if (filters.region !== "All" && l.region !== filters.region) return false;
        if (filters.lifestyle !== "All" && !l.tags.includes(filters.lifestyle)) return false;
        if (filters.search && !l.name.toLowerCase().includes(filters.search.toLowerCase())) return false;
        return true;
    });

    return (
        <section className="w-full py-[80px] font-sans" style={{ backgroundColor: "#f8f8f6" }}>
            <div className="max-w-[1400px] mx-auto px-6 flex flex-col gap-[40px]">
                <Reveal>
                    <div className="flex flex-col gap-[12px] items-center text-center">
                        <SectionLabel text="Localities" />
                        <h2 className="font-display font-medium text-[#172023] leading-[1.12] tracking-tight text-[34px] sm:text-[46px] lg:text-[52px]">
                            Find your perfect Goa neighbourhood
                        </h2>
                        <p className="font-normal text-[16px] sm:text-[18px] text-[#172023]/60 leading-[1.5] max-w-[600px]">
                            From lively beach towns to tranquil retreats — explore every corner of paradise.
                        </p>
                    </div>
                </Reveal>

                <Reveal delay={60}>
                    <SearchFilter filters={filters} onChange={setFilters} />
                </Reveal>

                <div className="flex items-center justify-between">
                    <p className="font-normal text-[14px] text-[#172023]/50">
                        Showing <span className="font-semibold text-[#172023]">{filtered.length}</span> localities
                    </p>
                </div>

                {filtered.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-[28px]">
                        {filtered.map((loc, i) => <LocalityCard key={loc.name} loc={loc} delay={i * 50} />)}
                    </div>
                ) : (
                    <Reveal>
                        <div className="flex flex-col items-center py-[64px] gap-[12px]">
                            <p className="font-display font-medium text-[22px] text-[#172023]">No localities found</p>
                            <button onClick={() => setFilters({ search: "", region: "All", lifestyle: "All", budget: "Any Budget" })} className="px-[20px] py-[10px] rounded-full font-semibold text-[14px] text-white btn-hover cursor-pointer" style={{ backgroundColor: GREEN }}>Clear filters</button>
                        </div>
                    </Reveal>
                )}
            </div>
        </section>
    );
}

// ─── Lifestyle Explorer ───────────────────────────────────────────────────────
function LifestyleExplorer() {
    return (
        <section className="w-full py-[80px] bg-white font-sans">
            <div className="max-w-[1400px] mx-auto px-6 flex flex-col gap-[48px]">
                <Reveal>
                    <div className="flex flex-col gap-[12px] items-center text-center">
                        <SectionLabel text="Lifestyle" />
                        <h2 className="font-display font-medium text-[#172023] leading-[1.12] tracking-tight text-[34px] sm:text-[44px] lg:text-[50px]">
                            Choose your Goa lifestyle
                        </h2>
                        <p className="font-normal text-[16px] sm:text-[18px] text-[#172023]/60 leading-[1.5] max-w-[560px]">
                            Filter Goa localities by the experience that calls to you.
                        </p>
                    </div>
                </Reveal>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-[12px]">
                    {LIFESTYLE_CATS.map(({ tag, icon: IconComponent, desc }, i) => (
                        <Reveal key={tag} delay={i * 40}>
                            <div className="group flex flex-col items-center gap-[12px] p-[20px] rounded-[20px] border border-[#172023]/10 bg-white text-center cursor-pointer hover:border-[#07be8a]/40 hover:shadow-[0_4px_24px_rgba(7,190,138,0.08)] transition-all card-lift">
                                <div className="size-10 rounded-full bg-[#172023]/5 flex items-center justify-center text-[#07be8a] group-hover:bg-[#07be8a] group-hover:text-white transition-colors">
                                    <IconComponent className="size-5" />
                                </div>
                                <p className="font-semibold text-[14px] text-[#172023] leading-[1.3]">{tag}</p>
                                <p className="font-normal text-[12px] text-[#172023]/50 leading-[1.5] hidden lg:block">{desc}</p>
                            </div>
                        </Reveal>
                    ))}
                </div>
            </div>
        </section>
    );
}

// ─── Why Choose Section ───────────────────────────────────────────────────────
const WHY_FEATURES = [
    { icon: <IconTrend />, title: "Excellent Appreciation", desc: "Goa property values have grown 12–18% CAGR in premium localities over 5 years." },
    { icon: <IconBeach />, title: "High Rental Demand", desc: "Peak season (Nov–Mar) yields of 7–10% — among the best in India." },
    { icon: <IconHome />, title: "Strong Tourism Growth", desc: "2.5 crore+ annual visitors and growing, ensuring consistent tenant demand." },
    { icon: <IconVerified />, title: "NRI & FEMA Friendly", desc: "Transparent regulatory framework for international buyers and investors." },
    { icon: <IconBeach />, title: "Pristine Beaches Nearby", desc: "Every premium locality is within 30 minutes of a world-class beach." },
    { icon: <IconVerified />, title: "Safe Communities", desc: "Consistently rated among India's safest states for expats and families." },
    { icon: <IconTrend />, title: "International Appeal", desc: "Cosmopolitan culture attracting buyers from 40+ countries." },
    { icon: <IconHome />, title: "Great Connectivity", desc: "Mopa International Airport now connects Goa to 80+ destinations." },
];

function WhyChoose() {
    return (
        <section className="w-full py-[80px] font-sans" style={{ backgroundColor: BG }}>
            <div className="max-w-[1400px] mx-auto px-6 flex flex-col gap-[48px]">
                <Reveal>
                    <div className="flex flex-col gap-[12px] items-center text-center">
                        <SectionLabel text="Why Goa" dark />
                        <h2 className="font-display font-medium text-white leading-[1.12] tracking-tight text-[34px] sm:text-[44px] lg:text-[50px]">
                            Why invest in Goa real estate?
                        </h2>
                        <p className="font-normal text-[16px] sm:text-[18px] text-white/60 leading-[1.5] max-w-[560px]">
                            Premium reasons thousands of buyers choose Goa year after year.
                        </p>
                    </div>
                </Reveal>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-[20px]">
                    {WHY_FEATURES.map(({ icon, title, desc }, i) => (
                        <Reveal key={title} delay={i * 50}>
                            <div className="flex flex-col gap-[16px] p-[24px] rounded-[20px] border border-white/10 bg-white/5 hover:bg-white/10 transition-colors">
                                <div className="size-[44px] rounded-[12px] flex items-center justify-center" style={{ backgroundColor: `${GREEN}20` }}>
                                    {icon}
                                </div>
                                <div>
                                    <p className="font-semibold text-[16px] text-white leading-[1.3]">{title}</p>
                                    <p className="font-normal text-[13px] text-white/60 leading-[1.5] mt-[4px]">{desc}</p>
                                </div>
                            </div>
                        </Reveal>
                    ))}
                </div>
            </div>
        </section>
    );
}

// ─── Interactive Map ──────────────────────────────────────────────────────────
type MapPin = { name: string; x: number; y: number; listings: number; price: string; region: "North Goa" | "South Goa" };

const MAP_PINS: MapPin[] = [
    { name: "Candolim", x: 30, y: 28, listings: 24, price: "₹2.5 Cr+", region: "North Goa" },
    { name: "Anjuna", x: 22, y: 22, listings: 18, price: "₹2 Cr+", region: "North Goa" },
    { name: "Assagao", x: 26, y: 18, listings: 14, price: "₹3 Cr+", region: "North Goa" },
    { name: "Calangute", x: 34, y: 24, listings: 31, price: "₹1.8 Cr+", region: "North Goa" },
    { name: "Vagator", x: 20, y: 14, listings: 11, price: "₹1.5 Cr+", region: "North Goa" },
    { name: "Morjim", x: 24, y: 8, listings: 9, price: "₹1.2 Cr+", region: "North Goa" },
    { name: "Panjim", x: 44, y: 30, listings: 15, price: "₹90L+", region: "North Goa" },
    { name: "Siolim", x: 18, y: 10, listings: 7, price: "₹2 Cr+", region: "North Goa" },
    { name: "Palolem", x: 38, y: 86, listings: 12, price: "₹80L+", region: "South Goa" },
    { name: "Colva", x: 26, y: 72, listings: 8, price: "₹70L+", region: "South Goa" },
    { name: "Benaulim", x: 28, y: 78, listings: 10, price: "₹1 Cr+", region: "South Goa" },
    { name: "Agonda", x: 32, y: 90, listings: 5, price: "₹60L+", region: "South Goa" },
];

function GeoMap() {
    const [active, setActive] = useState<MapPin | null>(null);

    return (
        <section className="w-full py-[80px] bg-white font-sans">
            <div className="max-w-[1400px] mx-auto px-6 flex flex-col gap-[48px]">
                <Reveal>
                    <div className="flex flex-col gap-[12px] items-center text-center">
                        <SectionLabel text="Interactive Map" />
                        <h2 className="font-display font-medium text-[#172023] leading-[1.12] tracking-tight text-[34px] sm:text-[44px] lg:text-[50px]">
                            Explore localities on the map
                        </h2>
                    </div>
                </Reveal>

                <Reveal delay={80}>
                    <div className="relative rounded-[24px] overflow-hidden border border-[#172023]/10" style={{ backgroundColor: "#e8f4f0", height: "clamp(400px, 60vh, 600px)" }}>
                        {/* Stylized map background */}
                        <div className="absolute inset-0">
                            <svg width="100%" height="100%" className="opacity-30">
                                <defs>
                                    <pattern id="mapgrid" width="48" height="48" patternUnits="userSpaceOnUse">
                                        <path d="M 48 0 L 0 0 0 48" fill="none" stroke={BG} strokeWidth="0.4" />
                                    </pattern>
                                </defs>
                                <rect width="100%" height="100%" fill="url(#mapgrid)" />
                            </svg>
                        </div>

                        {/* Goa shape (simplified outline) */}
                        <svg className="absolute inset-0 size-full opacity-20" viewBox="0 0 100 100" preserveAspectRatio="none">
                            <path d="M 15 5 L 50 2 L 65 8 L 70 20 L 68 38 L 65 50 L 62 65 L 55 80 L 48 95 L 38 95 L 25 82 L 20 65 L 18 45 L 15 30 Z" fill={GREEN} />
                        </svg>

                        {/* Region labels */}
                        <div className="absolute top-[12%] left-[20%] font-semibold text-[12px] uppercase tracking-[1px] text-[#172023]/40">North Goa</div>
                        <div className="absolute top-[65%] left-[20%] font-semibold text-[12px] uppercase tracking-[1px] text-[#172023]/40">South Goa</div>
                        <div className="absolute top-[48%] left-[44%] w-px h-[40%] border-l border-dashed border-[#172023]/20" />

                        {/* Pins */}
                        {MAP_PINS.map((pin) => (
                            <button
                                key={pin.name}
                                className="absolute group"
                                style={{ left: `${pin.x}%`, top: `${pin.y}%`, transform: "translate(-50%, -50%)" }}
                                onClick={() => setActive(active?.name === pin.name ? null : pin)}
                            >
                                <div className={`relative size-[16px] rounded-full border-2 border-white shadow-md transition-all duration-200 ${active?.name === pin.name ? "scale-150" : "group-hover:scale-125"}`} style={{ backgroundColor: pin.region === "North Goa" ? GREEN : GOLD }} />
                                <div className={`absolute bottom-[calc(100%+6px)] left-1/2 -translate-x-1/2 whitespace-nowrap px-[8px] py-[4px] rounded-[6px] font-semibold text-[11px] text-white shadow-md transition-all duration-200 ${active?.name === pin.name ? "opacity-100 scale-100" : "opacity-0 group-hover:opacity-100"}`} style={{ backgroundColor: BG }}>
                                    {pin.name}
                                </div>
                            </button>
                        ))}

                        {/* Active popup */}
                        {active && (
                            <div className="absolute bottom-[24px] right-[24px] bg-white rounded-[16px] shadow-xl p-[20px] flex flex-col gap-[12px] min-w-[220px] border border-[#172023]/10">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="font-semibold text-[17px] text-[#172023] leading-[1.2]">{active.name}</p>
                                        <span className="px-[8px] py-[3px] rounded-full font-semibold text-[11px] uppercase tracking-[0.4px] text-white mt-[4px] inline-block" style={{ backgroundColor: active.region === "North Goa" ? GREEN : GOLD }}>{active.region}</span>
                                    </div>
                                    <button onClick={() => setActive(null)} className="text-[#172023]/40 hover:text-[#172023] text-[18px] leading-none cursor-pointer">×</button>
                                </div>
                                <div className="flex gap-[16px]">
                                    <div>
                                        <p className="font-normal text-[11px] text-[#172023]/50 uppercase tracking-[0.4px]">Listings</p>
                                        <p className="font-semibold text-[15px] text-[#172023]">{active.listings}</p>
                                    </div>
                                    <div>
                                        <p className="font-normal text-[11px] text-[#172023]/50 uppercase tracking-[0.4px]">Starting Price</p>
                                        <p className="font-bold text-[15px] leading-[1.2]" style={{ color: GREEN }}>{active.price}</p>
                                    </div>
                                </div>
                                <Link to={`/properties?locality=${encodeURIComponent(active.name)}`} className="flex items-center justify-center gap-[8px] py-[10px] rounded-full font-semibold text-[13px] text-white btn-hover" style={{ backgroundColor: GREEN }}>
                                    Explore {active.name} <IconArrowRight color="white" />
                                </Link>
                            </div>
                        )}

                        {/* Legend */}
                        <div className="absolute top-[16px] right-[16px] bg-white/90 backdrop-blur-sm rounded-[12px] p-[12px] flex flex-col gap-[8px] border border-[#172023]/10">
                            <div className="flex items-center gap-[8px]">
                                <div className="size-[10px] rounded-full" style={{ backgroundColor: GREEN }} />
                                <p className="font-normal text-[12px] text-[#172023]/70">North Goa</p>
                            </div>
                            <div className="flex items-center gap-[8px]">
                                <div className="size-[10px] rounded-full" style={{ backgroundColor: GOLD }} />
                                <p className="font-normal text-[12px] text-[#172023]/70">South Goa</p>
                            </div>
                            <p className="font-normal text-[11px] text-[#172023]/40">Click pins to explore</p>
                        </div>
                    </div>
                </Reveal>
            </div>
        </section>
    );
}

// ─── Investment Spotlight ─────────────────────────────────────────────────────
const INVESTMENTS = [
    { rank: 1, name: "Assagao", rating: 5, appreciation: "15–22%", yield: "7.5%", demand: "Very High", growth: "Strong" },
    { rank: 2, name: "Candolim", rating: 5, appreciation: "12–18%", yield: "6.8%", demand: "Very High", growth: "Strong" },
    { rank: 3, name: "Palolem", rating: 4, appreciation: "10–15%", yield: "6.2%", demand: "High", growth: "Growing" },
    { rank: 4, name: "Varca", rating: 4, appreciation: "9–13%", yield: "5.8%", demand: "High", growth: "Growing" },
    { rank: 5, name: "Morjim", rating: 4, appreciation: "8–12%", yield: "5.5%", demand: "High", growth: "Emerging" },
];

function InvestmentSpotlight() {
    return (
        <section className="w-full py-[80px] font-sans" style={{ backgroundColor: "#fafaf9" }}>
            <div className="max-w-[1400px] mx-auto px-6 flex flex-col gap-[48px]">
                <Reveal>
                    <div className="flex flex-col gap-[12px] items-center text-center">
                        <SectionLabel text="Investment Spotlight" />
                        <h2 className="font-display font-medium text-[#172023] leading-[1.12] tracking-tight text-[34px] sm:text-[44px] lg:text-[50px]">
                            Top investment destinations in Goa
                        </h2>
                        <p className="font-normal text-[16px] sm:text-[18px] text-[#172023]/60 leading-[1.5] max-w-[560px]">
                            Ranked by appreciation potential, rental yield, and luxury market growth.
                        </p>
                    </div>
                </Reveal>

                <div className="flex flex-col gap-[12px]">
                    {INVESTMENTS.map(({ rank, name, rating, appreciation, yield: yld, demand, growth }, i) => (
                        <Reveal key={name} delay={i * 60}>
                            <div className="flex items-center gap-[24px] p-[24px] rounded-[20px] bg-white border border-[#172023]/10 hover:shadow-[0_4px_24px_rgba(0,0,0,0.06)] transition-shadow">
                                {/* Rank */}
                                <div className="size-[48px] rounded-full flex items-center justify-center shrink-0 font-bold text-[17px] leading-none" style={{ backgroundColor: rank === 1 ? `${GOLD}20` : `${BG}06`, color: rank === 1 ? GOLD : `${BG}50` }}>
                                    #{rank}
                                </div>

                                {/* Name + Stars */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-[10px] flex-wrap">
                                        <p className="font-semibold text-[18px] text-[#172023] leading-[1.2]">{name}</p>
                                        <StarRating rating={rating} />
                                    </div>
                                    <p className="font-normal text-[13px] text-[#172023]/50 leading-[1.4] mt-[2px]">{growth} market</p>
                                </div>

                                {/* Metrics */}
                                <div className="hidden sm:flex items-center gap-[32px] shrink-0">
                                    {[
                                        { label: "5Y Appreciation", value: appreciation, color: GREEN },
                                        { label: "Rental Yield", value: yld, color: GREEN },
                                        { label: "Tourist Demand", value: demand, color: demand === "Very High" ? GREEN : GOLD },
                                    ].map(({ label, value, color }) => (
                                        <div key={label} className="text-center">
                                            <p className="font-normal text-[11px] text-[#172023]/40 uppercase tracking-[0.4px]">{label}</p>
                                            <p className="font-bold text-[16px] leading-[1.2]" style={{ color }}>{value}</p>
                                        </div>
                                    ))}
                                </div>

                                <Link to={`/properties?locality=${encodeURIComponent(name)}`} className="shrink-0 size-[40px] rounded-full flex items-center justify-center border border-[#172023]/15 hover:bg-[#172023]/5 transition-colors" title={`View properties in ${name}`}>
                                    <IconArrowRight />
                                </Link>
                            </div>
                        </Reveal>
                    ))}
                </div>
            </div>
        </section>
    );
}

// ─── CTA Section ─────────────────────────────────────────────────────────────
function CTASection() {
    return (
        <section className="w-full py-[80px] bg-white font-sans">
            <div className="max-w-[1400px] mx-auto px-6">
                <Reveal>
                    <div className="relative overflow-hidden rounded-[24px] px-[48px] py-[72px] flex flex-col items-center text-center gap-[32px]" style={{ backgroundColor: BG }}>
                        {/* Decorative */}
                        <div className="absolute right-[-80px] top-[-40px] opacity-10">
                            <svg width="400" height="400" viewBox="0 0 265.917 277" fill="none">
                                <path d="M0.5 132.96C0.489883 130.113 1.04601 127.292 2.13574 124.662C3.22547 122.032 4.82703 119.644 6.84766 117.639L6.84961 117.638L117.647 6.83887C121.709 2.78005 127.216 0.500112 132.958 0.5C138.7 0.5 144.207 2.7795 148.269 6.83789V6.83887L259.067 117.638L259.069 117.639C261.09 119.644 262.692 122.032 263.781 124.662C264.871 127.292 265.427 130.113 265.417 132.96V265.92C265.417 268.726 264.302 271.417 262.318 273.401C260.334 275.385 257.643 276.5 254.837 276.5H11.0801C8.27412 276.5 5.58274 275.385 3.59863 273.401C1.61457 271.417 0.5 268.726 0.5 265.92V132.96Z" stroke={GREEN} strokeOpacity="0.4" />
                            </svg>
                        </div>
                        <div className="absolute left-[-60px] bottom-[-30px] opacity-10">
                            <svg width="300" height="300" viewBox="0 0 265.917 277" fill="none">
                                <path d="M0.5 132.96C0.489883 130.113 1.04601 127.292 2.13574 124.662C3.22547 122.032 4.82703 119.644 6.84766 117.639L6.84961 117.638L117.647 6.83887C121.709 2.78005 127.216 0.500112 132.958 0.5C138.7 0.5 144.207 2.7795 148.269 6.83789V6.83887L259.067 117.638L259.069 117.639C261.09 119.644 262.692 122.032 263.781 124.662C264.871 127.292 265.427 130.113 265.417 132.96V265.92C265.417 268.726 264.302 271.417 262.318 273.401C260.334 275.385 257.643 276.5 254.837 276.5H11.0801C8.27412 276.5 5.58274 275.385 3.59863 273.401C1.61457 271.417 0.5 268.726 0.5 265.92V132.96Z" stroke={GREEN} strokeOpacity="0.3" />
                            </svg>
                        </div>

                        <div className="relative z-10 flex flex-col items-center gap-[12px]">
                            <SectionLabel text="Expert Guidance" dark />
                            <h2 className="font-display font-medium text-white leading-[1.12] tracking-tight text-[32px] sm:text-[44px] lg:text-[48px]">
                                Not sure which area suits you?
                            </h2>
                            <p className="font-normal text-[16px] sm:text-[18px] text-white/60 leading-[1.5] max-w-[560px]">
                                Our Goa experts can help you choose the perfect location based on your lifestyle, budget, and investment goals.
                            </p>
                        </div>
                        <div className="relative z-10 flex gap-[14px] flex-wrap justify-center">
                            <Link to="/contact" className="px-[32px] py-[15px] rounded-full font-semibold text-[15px] text-white btn-hover" style={{ backgroundColor: GREEN }}>
                                Talk to an Expert
                            </Link>
                            <Link to="/properties" className="px-[32px] py-[15px] rounded-full font-semibold text-[15px] text-white border border-white/20 hover:bg-white/10 transition-colors">
                                Browse Properties
                            </Link>
                        </div>
                    </div>
                </Reveal>
            </div>
        </section>
    );
}

// ─── Area Guide Page ──────────────────────────────────────────────────────────
export default function AreaGuidePage() {
    return (
        <div className="bg-white overflow-x-hidden min-h-screen flex flex-col font-sans">
            <SiteNavbar variant="page" />
            <div className="w-full bg-[#fbfbfa] border-b border-gray-100">
                <div className="max-w-[1400px] mx-auto px-6 py-2.5">
                    <BackButton label="Back" fallback="/" />
                </div>
            </div>
            <Hero />
            <FeaturedLocalities />
            <LifestyleExplorer />
            <WhyChoose />
            <GeoMap />
            <InvestmentSpotlight />
            <CTASection />
            <SiteFooter />
        </div>
    );
}
