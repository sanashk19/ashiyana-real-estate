import React, { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router";
import {
  fetchFeaturedProperties,
  formatRegionLabel,
  type PropertyCardDto,
} from "@/lib/api";
import { SiteNavbar } from "@/components/SiteNavbar";
import { SiteFooter } from "@/components/SiteFooter";
import { useBusinessProfile } from "@/context/BusinessProfileContext";
import { ArrowRight, ArrowUpRight, ChevronDown, Sparkles } from "lucide-react";

// â”€â”€ Static asset imports â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
import imgProp1 from "@/imports/RealEstate/721343dadb78ce017961e6632d7d0b288171d892.png";
import imgProp2 from "@/imports/RealEstate/51dadbde438a85a76794ae7bb5d236bd397142c4.png";
import imgProp3 from "@/imports/RealEstate/02397dd95a1cf0bc9f1bf2dc72092471ba81f810.png";
import imgFeatured from "@/imports/RealEstate/fc08c6d52d3372bb7c332b62ae35bbf3dd4cc91a.png";
import imgAbout1 from "@/imports/RealEstate/161f0ce0c52e9116b767b74364def55806e99cc1.png";
import imgAbout2 from "@/imports/RealEstate/de3ebd1afddb796eddb0f94be6bae6d8a7403e21.png";
import imgSvc2 from "@/imports/RealEstate/6389556655a7b2a2111fce6abd1dc5de87f732e3.png";
import imgSvc3 from "@/imports/RealEstate/3ccc16e633d8543e1cd4eb7277c90c1766d6b950.png";

// â”€â”€ Shared scroll utilities â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * Returns scroll progress (0 â†’ 1) while a tall sticky section is in view.
 * Attaches/detaches a passive scroll listener via IntersectionObserver.
 */
function useStickyProgress<T extends HTMLElement>(
  sectionRef: React.RefObject<T | null>
): number {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    let rafId: number | null = null;
    let listening = false;

    const update = () => {
      rafId = null;
      const rect = section.getBoundingClientRect();
      const scrollable = section.offsetHeight - window.innerHeight;
      if (scrollable <= 0) { setProgress(0); return; }
      setProgress(Math.max(0, Math.min(1, -rect.top / scrollable)));
    };

    const onScroll = () => {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(update);
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !listening) {
          listening = true;
          window.addEventListener("scroll", onScroll, { passive: true });
          update();
        } else if (!entry.isIntersecting && listening) {
          listening = false;
          window.removeEventListener("scroll", onScroll);
          if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; }
        }
      },
      { threshold: 0, rootMargin: "100px 0px 100px 0px" }
    );

    observer.observe(section);
    return () => {
      observer.disconnect();
      if (listening) window.removeEventListener("scroll", onScroll);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, [sectionRef]);

  return progress;
}

/** Fires once when an element first enters the viewport. */
function useInView<T extends HTMLElement>(
  ref: React.RefObject<T | null>,
  threshold = 0.2
): boolean {
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setInView(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [ref, threshold]);
  return inView;
}

// â”€â”€ Scene 1: Hero â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function HeroScene() {
  const navigate = useNavigate();
  const [on, setOn] = useState(false);
  const [lookingFor, setLookingFor] = useState("all");
  const [priceVal, setPriceVal] = useState("all");
  const [locationVal, setLocationVal] = useState("all");
  const [roomsVal, setRoomsVal] = useState("all");

  useEffect(() => {
    const t = setTimeout(() => setOn(true), 80);
    return () => clearTimeout(t);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const p = new URLSearchParams();
    if (lookingFor !== "all") p.set("purpose", lookingFor);
    if (priceVal !== "all") p.set("price_range", priceVal);
    if (locationVal !== "all") p.set("locality", locationVal);
    if (roomsVal !== "all") p.set("bedrooms", roomsVal);
    navigate(`/properties?${p.toString()}`);
  };

  const lines: [string, string][] = [
    ["Discover Goa", "white"],
    ["Through Its", "white"],
    ["Finest Homes.", "#C4A66A"],
  ];
  const delays = [80, 260, 440];

  const searchFields = [
    {
      label: "Looking for", val: lookingFor, set: setLookingFor,
      opts: [["all","Any type"],["sale","For Sale"],["rent","For Rent"]],
    },
    {
      label: "Budget", val: priceVal, set: setPriceVal,
      opts: [["all","Any price"],["Under â‚¹1 Cr","Under â‚¹1 Cr"],["1-2cr","â‚¹1â€“2 Cr"],["2-5cr","â‚¹2â€“5 Cr"],["5cr+","Above â‚¹5 Cr"]],
    },
    {
      label: "Location", val: locationVal, set: setLocationVal,
      opts: [["all","Any location"],["Assagao","Assagao"],["Anjuna","Anjuna"],["Candolim","Candolim"],["Siolim","Siolim"],["Panaji","Panaji"],["Colva","Colva"]],
    },
    {
      label: "Bedrooms", val: roomsVal, set: setRoomsVal,
      opts: [["all","Any rooms"],["1","1 Bed"],["2","2 Beds"],["3","3 Beds"],["4","4+ Beds"]],
    },
  ];

  return (
    <div className="relative w-full flex flex-col bg-[#172124] overflow-hidden" style={{ minHeight: "88vh" }}>
      {/* Cinematic background */}
      <img
        src="/goa-hero.png"
        alt="Luxury property in Goa"
        className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none"
        style={{ opacity: 0.78 }}
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "linear-gradient(to bottom, rgba(23,33,36,0.55) 0%, rgba(23,33,36,0.28) 40%, rgba(23,33,36,0.82) 100%)" }}
      />

      {/* Navbar */}
      <div className="relative z-20">
        <SiteNavbar variant="hero" />
      </div>

      {/* Hero body */}
      <div className="relative z-10 flex-1 flex flex-col justify-center items-center text-center px-6 sm:px-10 pb-16">
        {/* Headline â€” line-by-line mask reveal */}
        <h1
          className="font-display font-semibold leading-[1.04] tracking-tight"
          style={{ fontSize: "clamp(2.6rem, 7.5vw, 7rem)" }}
        >
          {lines.map(([text, color], i) => (
            <span key={text} className="block overflow-hidden">
              <span
                className="block"
                style={{
                  color,
                  transitionProperty: "transform, opacity",
                  transitionDuration: "950ms",
                  transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
                  transitionDelay: `${delays[i]}ms`,
                  transform: on ? "translateY(0)" : "translateY(110%)",
                  opacity: on ? 1 : 0,
                }}
              >
                {text}
              </span>
            </span>
          ))}
        </h1>

        {/* Subtitle */}
        <p
          className="mt-5 text-white/70 max-w-[520px] leading-relaxed"
          style={{
            fontSize: "clamp(0.9rem, 1.4vw, 1.1rem)",
            transitionProperty: "opacity, transform",
            transitionDuration: "700ms",
            transitionDelay: "720ms",
            transitionTimingFunction: "ease-out",
            opacity: on ? 1 : 0,
            transform: on ? "translateY(0)" : "translateY(14px)",
          }}
        >
          Curated luxury villas, coastal apartments and estates across Goa — personally verified.
        </p>

        {/* CTAs */}
        <div
          className="mt-8 flex flex-wrap items-center justify-center gap-3"
          style={{
            transitionProperty: "opacity, transform",
            transitionDuration: "700ms",
            transitionDelay: "920ms",
            transitionTimingFunction: "ease-out",
            opacity: on ? 1 : 0,
            transform: on ? "translateY(0)" : "translateY(12px)",
          }}
        >
          <button
            onClick={() => navigate("/properties")}
            className="flex items-center gap-2 px-7 py-3 rounded-full bg-white text-[#172124] font-semibold hover:bg-[#F0EDE8] transition-colors shadow-lg cursor-pointer"
            style={{ fontSize: "clamp(0.8rem, 1.2vw, 0.875rem)" }}
          >
            Browse Properties
            <ArrowRight className="size-3.5" />
          </button>
          <Link
            to="/contact"
            className="px-7 py-3 rounded-full border border-white/30 text-white font-medium hover:bg-white/10 transition-colors"
            style={{ fontSize: "clamp(0.8rem, 1.2vw, 0.875rem)" }}
          >
            Get in Touch
          </Link>
        </div>

        {/* Scroll indicator */}
        <div
          className="mt-16 flex flex-col items-center gap-2"
          style={{
            transitionProperty: "opacity",
            transitionDuration: "700ms",
            transitionDelay: "1400ms",
            opacity: on ? 0.5 : 0,
          }}
        >
          <span className="text-white text-[10px] uppercase tracking-[0.22em] font-medium">Scroll</span>
          <ChevronDown className="size-4 text-white" style={{ animation: "bounce 2s infinite" }} />
        </div>
      </div>

      {/* Floating search panel */}
      <div
        className="relative z-20 mx-3 sm:mx-8 lg:mx-14 mb-0"
        style={{
          transitionProperty: "opacity, transform",
          transitionDuration: "700ms",
          transitionDelay: "1150ms",
          transitionTimingFunction: "ease-out",
          opacity: on ? 1 : 0,
          transform: on ? "translateY(0)" : "translateY(20px)",
        }}
      >
        <form
          onSubmit={handleSearch}
          className="bg-white/97 backdrop-blur-xl rounded-[20px] p-4 sm:p-5 shadow-[0_20px_60px_rgba(0,0,0,0.25)] border border-white/60"
        >
          <div className="flex flex-col lg:flex-row items-stretch lg:items-end gap-3">
            <div className="flex-1 grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
              {searchFields.map(({ label, val, set, opts }) => (
                <div key={label} className="flex flex-col gap-1">
                  <label className="text-[10.5px] font-semibold text-[#717A7D] uppercase tracking-wide">{label}</label>
                  <select
                    value={val}
                    onChange={e => set(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-[10px] bg-[#F7F7F4] border border-[#E5E7E6] text-[13px] text-[#172124] font-medium focus:outline-none cursor-pointer"
                  >
                    {opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
              ))}
            </div>
            <button
              type="submit"
              className="lg:shrink-0 px-7 py-3 rounded-full bg-[#172124] text-white font-semibold text-[13px] hover:bg-[#243236] transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              Search
              <ArrowRight className="size-3.5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Scene 2: About (Matches Reference Frame 1) ────────────────────────────────
function AboutScene() {
  const navigate = useNavigate();
  const sectionRef = useRef<HTMLDivElement>(null);
  const progress = useStickyProgress(sectionRef);

  // Progressive image composition:
  // State 1 (progress 0 - 0.4): Image 1 visible, Image 2 sliding in
  // State 2 (progress 0.4 - 1.0): Both images settled in staggered arrangement
  const img2TranslateY = Math.max(0, (1 - Math.min(1, progress * 2.5)) * 40);
  const img2Opacity = Math.min(1, 0.4 + progress * 0.6);

  return (
    <section
      ref={sectionRef}
      className="relative bg-[#FBF9F5] border-t border-[#EDE8E0]"
      style={{ minHeight: "120vh" }}
      aria-label="About Ashiyana"
    >
      <div className="sticky top-0 min-h-screen flex flex-col justify-between py-10 sm:py-14 px-6 sm:px-12 lg:px-20 max-w-[1440px] mx-auto w-full">
        {/* Top Header Bar */}
        <div className="flex items-center justify-between text-[11px] sm:text-[12px] font-semibold tracking-[0.18em] uppercase text-[#172124]/70 border-b border-[#E8E3DA] pb-4">
          <span>(01) About Us</span>
          <span className="hidden sm:inline-block text-[#172124]/40 font-mono">SCROLL DOWN</span>
          <span className="font-mono text-[#172124]/50">ESTABLISHED IN 2014</span>
        </div>

        {/* Center: Two Staggered Editorial Images */}
        <div className="my-6 sm:my-8 flex justify-center items-center gap-4 sm:gap-8">
          <div
            className="rounded-2xl sm:rounded-3xl overflow-hidden shadow-lg border border-[#E0DAD0] bg-[#E8E3DA]"
            style={{
              width: "clamp(150px, 20vw, 290px)",
              aspectRatio: "1/1",
              transition: "transform 0.4s ease-out",
              transform: `scale(${1 + progress * 0.04})`,
            }}
          >
            <img
              src={imgAbout1}
              alt="Luxury Goa Architecture"
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
          <div
            className="rounded-2xl sm:rounded-3xl overflow-hidden shadow-lg border border-[#E0DAD0] bg-[#E8E3DA]"
            style={{
              width: "clamp(150px, 20vw, 290px)",
              aspectRatio: "1/1",
              transform: `translateY(${img2TranslateY}px)`,
              opacity: img2Opacity,
              transition: "transform 0.3s ease-out, opacity 0.3s ease-out",
            }}
          >
            <img
              src={imgAbout2}
              alt="Goa Coastal Living"
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
        </div>

        {/* Bottom: Editorial Story & Big Statement */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 items-end pt-2">
          <div className="lg:col-span-5 flex flex-col gap-3">
            <h3 className="font-display font-semibold text-[19px] sm:text-[22px] text-[#172124] leading-snug">
              Experience Luxury Like Never Before
            </h3>
            <p className="text-[13px] sm:text-[13.5px] text-[#717A7D] leading-relaxed">
              Founded in Goa, Ashiyana is a boutique real estate brokerage dedicated to curating bespoke villas, heritage estates, and coastal sanctuaries with transparency, unmatched local mastery, and seamless legal diligence.
            </p>
          </div>
          <div className="lg:col-span-7 flex flex-col gap-5 items-start">
            <p
              className="font-display font-medium text-[#172124] leading-[1.22] tracking-tight"
              style={{ fontSize: "clamp(1.35rem, 2.4vw, 2.2rem)" }}
            >
              We are a premier real estate and design firm specializing in high-end villas and tailored coastal properties across North & South Goa.
            </p>
            <button
              onClick={() => navigate("/services")}
              className="flex items-center gap-3 bg-[#EDE8E0] hover:bg-[#E2DDD3] text-[#172124] px-5 py-2.5 rounded-full border border-[#DCD5C9] font-medium text-[13px] transition-colors cursor-pointer group"
            >
              <span>Learn More</span>
              <div className="size-6 rounded-full bg-[#A56846] text-white flex items-center justify-center group-hover:scale-105 transition-transform">
                <ArrowUpRight className="size-3.5" />
              </div>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Animated Stat Counter Component ──────────────────────────────────────────
function AnimatedStatNumber({
  value,
  inView,
  delay = 0,
}: {
  value: string;
  inView: boolean;
  delay?: number;
}) {
  const [displayValue, setDisplayValue] = useState(
    value === "Goa" ? "—" : "0"
  );

  useEffect(() => {
    if (!inView) return;

    const timeout = setTimeout(() => {
      if (value === "10+") {
        const target = 10;
        const duration = 1200;
        const startTime = performance.now();

        const tick = (now: number) => {
          const elapsed = now - startTime;
          const progress = Math.min(1, elapsed / duration);
          const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
          const current = Math.round(ease * target);
          setDisplayValue(`${current}+`);

          if (progress < 1) {
            requestAnimationFrame(tick);
          }
        };
        requestAnimationFrame(tick);
      } else if (value === "100%") {
        const target = 100;
        const duration = 1400;
        const startTime = performance.now();

        const tick = (now: number) => {
          const elapsed = now - startTime;
          const progress = Math.min(1, elapsed / duration);
          const ease = 1 - Math.pow(1 - progress, 3);
          const current = Math.round(ease * target);
          setDisplayValue(`${current}%`);

          if (progress < 1) {
            requestAnimationFrame(tick);
          }
        };
        requestAnimationFrame(tick);
      } else if (value === "Goa") {
        const locations = ["Assagao", "Anjuna", "Siolim", "Candolim", "Goa"];
        let step = 0;
        const interval = setInterval(() => {
          if (step < locations.length) {
            setDisplayValue(locations[step]);
            step++;
          } else {
            clearInterval(interval);
          }
        }, 160);
        return () => clearInterval(interval);
      } else {
        setDisplayValue(value);
      }
    }, delay);

    return () => clearTimeout(timeout);
  }, [inView, value, delay]);

  return <span>{displayValue}</span>;
}

// ── Scene 3: Stats ───────────────────────────────────────────────────────────
function StatsScene() {
  const containerRef = useRef<HTMLDivElement>(null);
  const inView = useInView(containerRef, 0.25);

  const stats = [
    {
      value: "Goa",
      heading: "Local Property Mastery",
      copy: "Deep knowledge of every prime neighborhood across North and South Goa — from Assagao & Anjuna to Benaulim.",
    },
    {
      value: "10+",
      heading: "Years Active in Goa",
      copy: "Over a decade of trusted brokerage, closing prime residential villas and bespoke coastal estates.",
    },
    {
      value: "100%",
      heading: "Verified Title Listings",
      copy: "Every property undergoes rigorous legal vetting, physical site visits, and title scrutiny before listing.",
    },
  ];

  return (
    <section className="py-14 sm:py-20 bg-[#FBF9F5] border-t border-[#EDE8E0]">
      <div className="max-w-[1400px] mx-auto px-6 sm:px-10 lg:px-16">
        <div ref={containerRef} className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {stats.map((stat, i) => (
            <div
              key={stat.heading}
              className="bg-white rounded-2xl p-7 sm:p-9 flex flex-col gap-4 border border-[#E8E3DA] shadow-xs"
              style={{
                transitionProperty: "opacity, transform",
                transitionDuration: "600ms",
                transitionDelay: `${i * 100}ms`,
                transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
                opacity: inView ? 1 : 0,
                transform: inView ? "translateY(0)" : "translateY(24px)",
              }}
            >
              <span
                className="font-display font-bold text-[#172124] leading-none tracking-tight h-[1.1em] flex items-center"
                style={{ fontSize: "clamp(2.4rem, 4.2vw, 3.8rem)" }}
              >
                <AnimatedStatNumber value={stat.value} inView={inView} delay={150 + i * 120} />
              </span>
              <div className="flex flex-col gap-1.5">
                <span className="font-semibold text-[15px] text-[#172124]">{stat.heading}</span>
                <p className="text-[13px] text-[#717A7D] leading-relaxed">{stat.copy}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Scene 4: Kinetic Headline (Refined Continuous Infinite Marquee) ─────────
function KineticHeadline() {
  const marqueeItems = [
    "DISCOVER THE ART OF LIVING THROUGH OUR EXCLUSIVE PROPERTIES",
    "LUXURY VILLAS & COASTAL ESTATES ACROSS GOA",
    "DISCOVER GOA THROUGH ITS FINEST HOMES",
    "PERSONALLY CURATED & LEGALLY VERIFIED",
  ];

  return (
    <section
      className="py-4 sm:py-5 bg-white border-y border-[#EDE8E0] overflow-hidden select-none"
      aria-label="Ashiyana Brand Statement"
    >
      <div className="animate-marquee-smooth flex items-center">
        {/* Render duplicate sets for seamless infinite wrapping */}
        {[...marqueeItems, ...marqueeItems, ...marqueeItems].map((text, i) => (
          <div key={i} className="flex items-center shrink-0">
            <span
              className="font-display font-semibold uppercase tracking-[0.12em] text-[#172124] px-5 sm:px-8 text-[13.5px] sm:text-[16px] lg:text-[18px]"
            >
              {text}
            </span>
            <span className="text-[#C4A66A] select-none opacity-60 flex items-center">
              <Sparkles className="size-2.5" />
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

// ── Scene 5: Services (Exact Visual Match to Reference Frames) ──────────────
const SERVICES = [
  {
    id: "01",
    total: "03",
    title: "Luxury Villa Sales",
    copy: "Handpicked, architecturally striking villas in the most desirable locations. Each property offers privacy, sophistication, and world-class amenities.",
    image: imgProp1,
    to: "/properties?purpose=sale",
  },
  {
    id: "02",
    total: "03",
    title: "Seller Representation",
    copy: "List your property with premier market positioning, bespoke marketing, certified title diligence, and private buyer network negotiations.",
    image: imgSvc2,
    to: "/sell",
  },
  {
    id: "03",
    total: "03",
    title: "Curated Rental Living",
    copy: "Discover premier seasonal and long-term rental residences across North & South Goa — fully vetted for comfort and architectural elegance.",
    image: imgSvc3,
    to: "/properties?purpose=rent",
  },
];

function ServicesScrollScene() {
  const navigate = useNavigate();
  const headerRef = useRef<HTMLDivElement>(null);
  const headerInView = useInView(headerRef, 0.2);
  const sectionRef = useRef<HTMLDivElement>(null);
  const progress = useStickyProgress(sectionRef);

  const [activeIdx, setActiveIdx] = useState(0);
  const [isMorphing, setIsMorphing] = useState(false);

  const targetIdx = Math.min(SERVICES.length - 1, Math.floor(progress * SERVICES.length));

  useEffect(() => {
    if (targetIdx !== activeIdx) {
      setIsMorphing(true);
      const timer = setTimeout(() => {
        setActiveIdx(targetIdx);
        setIsMorphing(false);
      }, 180);
      return () => clearTimeout(timer);
    }
  }, [targetIdx, activeIdx]);

  const svc = SERVICES[activeIdx];

  return (
    <>
      {/* ── Top Header Banner (Matches Reference Frame 2 Top with Smooth Appearing Animation) ── */}
      <div ref={headerRef} className="bg-white py-12 sm:py-16 text-center border-t border-[#EDE8E0] overflow-hidden">
        <h2
          className="font-display font-bold uppercase tracking-tight text-[#172124]"
          style={{ fontSize: "clamp(1.6rem, 3.2vw, 2.8rem)" }}
        >
          <span className="inline-block overflow-hidden py-1">
            <span
              className="inline-block transition-all duration-700"
              style={{
                transform: headerInView ? "translateY(0)" : "translateY(110%)",
                opacity: headerInView ? 1 : 0,
                transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
              }}
            >
              LUXURY LIVING, DESIGNED TO PERFECTION
            </span>
          </span>
        </h2>
      </div>

      {/* ── Desktop Sticky Container ── */}
      <section
        ref={sectionRef}
        className="relative hidden lg:block"
        style={{ height: "170vh" }}
        aria-label="Our Services"
      >
        <div className="sticky top-0 h-screen overflow-hidden bg-[#111618]">
          {/* Background Images with Crossfade */}
          {SERVICES.map((s, i) => (
            <div
              key={s.id}
              className="absolute inset-0 transition-opacity duration-700 ease-out"
              style={{ opacity: i === activeIdx ? 1 : 0 }}
            >
              <img
                src={s.image}
                alt={s.title}
                className="w-full h-full object-cover"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-black/40" />
            </div>
          ))}

          {/* Left Side Label (Matches Reference) */}
          <div className="absolute left-10 xl:left-16 top-1/2 -translate-y-1/2 z-20 pointer-events-none">
            <span className="text-white text-[20px] xl:text-[24px] font-sans font-light tracking-wide drop-shadow-md">
              [ Our Services ]
            </span>
          </div>

          {/* Right Side Label (Matches Reference) */}
          <div className="absolute right-10 xl:right-16 top-1/2 -translate-y-1/2 z-20 pointer-events-none">
            <span className="text-white text-[20px] xl:text-[24px] font-sans font-light tracking-wide drop-shadow-md">
              [ Keep Scrolling ]
            </span>
          </div>

          {/* Center Floating Cream Card with Smooth Morph Transition */}
          <div className="absolute inset-0 flex items-center justify-center z-30 px-6">
            <div
              className="p-8 sm:p-10 max-w-[430px] w-full shadow-[0_30px_80px_rgba(0,0,0,0.45)] transition-all duration-300 border border-[#DDD6CB]/40"
              style={{
                backgroundColor: "#EDE8E0",
                opacity: isMorphing ? 0.6 : 1,
                transform: isMorphing ? "scale(0.98)" : "scale(1)",
                filter: isMorphing ? "blur(1px)" : "blur(0px)",
                transition: "opacity 220ms ease-out, transform 220ms ease-out, filter 220ms ease-out",
              }}
            >
              {/* Counter */}
              <div className="text-center mb-3">
                <span className="text-[#7A6E5E] text-[13px] tracking-[0.18em] font-medium font-mono">
                  {svc.id} &mdash; {svc.total}
                </span>
              </div>

              {/* Title */}
              <h3 className="font-display font-bold text-[#172124] text-[25px] sm:text-[29px] text-center leading-tight mb-5">
                {svc.title}
              </h3>

              {/* Inset Photo (Squared Corners) */}
              <div className="aspect-[16/10] overflow-hidden mb-5 bg-[#DDD6CB]">
                <img
                  src={svc.image}
                  alt={svc.title}
                  className="w-full h-full object-cover transition-transform duration-500"
                  style={{
                    transform: isMorphing ? "scale(1.04)" : "scale(1)",
                  }}
                />
              </div>

              {/* Description */}
              <p className="text-[13px] text-[#4A4036] text-center leading-relaxed mb-6 px-1 font-normal">
                {svc.copy}
              </p>

              {/* Button (Discover More) */}
              <div className="flex justify-center">
                <button
                  onClick={() => navigate(svc.to)}
                  className="px-6 py-2 rounded-md border border-[#172124] text-[#172124] hover:bg-[#172124] hover:text-white text-[13px] font-medium transition-all duration-200 cursor-pointer"
                >
                  Discover More
                </button>
              </div>
            </div>
          </div>

          {/* Progress Indicator Dots */}
          <div className="absolute bottom-7 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2">
            {SERVICES.map((_, i) => (
              <div
                key={i}
                className="rounded-full transition-all duration-300"
                style={{
                  width: i === activeIdx ? "22px" : "6px",
                  height: "6px",
                  backgroundColor: i === activeIdx ? "#ffffff" : "rgba(255,255,255,0.4)",
                }}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ── Mobile Fallback ── */}
      <section className="lg:hidden bg-[#111618] py-14 px-5" aria-label="Our Services">
        <div className="flex flex-col gap-6">
          {SERVICES.map((s) => (
            <div
              key={s.id}
              className="p-6 flex flex-col gap-4 shadow-lg border border-[#DDD6CB]/40"
              style={{ backgroundColor: "#EDE8E0" }}
            >
              <span className="text-[#7A6E5E] text-[12px] font-mono font-medium text-center tracking-wider">
                {s.id} &mdash; {s.total}
              </span>
              <h3 className="font-display font-bold text-[22px] text-[#172124] text-center leading-tight">
                {s.title}
              </h3>
              <div className="aspect-[16/10] overflow-hidden bg-[#DDD6CB]">
                <img src={s.image} alt={s.title} className="w-full h-full object-cover" loading="lazy" />
              </div>
              <p className="text-[13px] text-[#4A4036] text-center leading-relaxed">
                {s.copy}
              </p>
              <button
                onClick={() => navigate(s.to)}
                className="mx-auto px-6 py-2 rounded-md border border-[#172124] text-[#172124] hover:bg-[#172124] hover:text-white text-[13px] font-medium transition-colors cursor-pointer"
              >
                Discover More
              </button>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

// ── Scene 6: Projects (Exact Reference Match: Layered Slide-Up Showcase) ─────
function ProjectsScrollScene({ properties }: { properties: PropertyCardDto[] }) {
  const navigate = useNavigate();
  const sectionRef = useRef<HTMLDivElement>(null);
  const visible = properties.slice(0, 4);
  const progress = useStickyProgress(sectionRef);
  const fallbacks = [imgProp1, imgProp2, imgProp3, imgFeatured];

  const activeIdx = Math.min(visible.length - 1, Math.floor(progress * visible.length));
  if (visible.length === 0) return null;
  const prop = visible[activeIdx];

  const taglines = [
    "Tropical luxury meets modern minimalism.",
    "Bespoke architecture wrapped in coastal tranquility.",
    "Urban luxury enveloped in lush natural greenery.",
    "Seaside sophistication with a modern twist.",
  ];

  const descriptions = [
    "A 5-bedroom beachfront villa with panoramic ocean views, infinity pool, and full smart-home automation.",
    "Handcrafted Portuguese-inspired architectural estate featuring private courtyards, private pool, and heritage finishes.",
    "A sleek, open-concept villa surrounded by custom landscaping, a private rooftop lounge, and bespoke interiors.",
    "Floor-to-ceiling glass walls, a cliffside infinity pool, and interiors crafted with fine Italian marble and bespoke furnishings.",
  ];

  return (
    <>
      {/* ── Desktop: Sticky Split View with Layered Vertical Slide-Up ── */}
      <section
        ref={sectionRef}
        className="relative hidden lg:block bg-[#0A0D0F] border-t border-[#1C2226]"
        style={{ height: `${Math.max(220, visible.length * 80)}vh` }}
        aria-label="Featured Projects"
      >
        <div className="sticky top-0 h-screen overflow-hidden bg-[#0A0D0F] flex">
          {/* ── Left Column: Full-Bleed Layered Slide-Up Track (Exact Reference Match) ── */}
          <div className="relative w-[55%] h-full overflow-hidden border-r border-white/5 bg-[#080B0D]">
            {/* Vertical Filmstrip Sliding Up Track */}
            <div
              className="absolute inset-0 flex flex-col transition-transform duration-700 ease-out"
              style={{
                transform: `translateY(-${activeIdx * 100}%)`,
                willChange: "transform",
              }}
            >
              {visible.map((p, i) => {
                const imgSrc = p.thumbnail_url || fallbacks[i % fallbacks.length];
                return (
                  <div
                    key={p.id}
                    className="relative w-full h-full shrink-0 flex items-center justify-center overflow-hidden"
                  >
                    {/* Full-bleed background image behind the card */}
                    <div className="absolute inset-0">
                      <img
                        src={imgSrc}
                        alt=""
                        className="w-full h-full object-cover scale-105"
                      />
                      <div className="absolute inset-0 bg-black/60" />
                    </div>

                    {/* Floating Foreground Inset Card */}
                    <div className="relative z-10 w-[78%] max-w-[560px] aspect-[16/10] overflow-hidden shadow-[0_35px_90px_rgba(0,0,0,0.9)] border border-white/15 bg-[#121619] group">
                      <img
                        src={imgSrc}
                        alt={p.title || "Property"}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        loading="lazy"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Right Column: Editorial Dark Info Panel (Exact Reference Match) ── */}
          <div className="w-[45%] h-full bg-[#080B0D] flex flex-col justify-between px-10 xl:px-16 py-12 xl:py-14">
            {/* Top Row: Index List on Left + Huge Counter on Right */}
            <div className="flex items-start justify-between gap-6">
              {/* Index List */}
              <div className="flex flex-col gap-1.5">
                {visible.map((p, i) => (
                  <div
                    key={p.id}
                    className="flex items-center gap-3 transition-opacity duration-300 font-sans"
                    style={{
                      opacity: i === activeIdx ? 1 : 0.28,
                    }}
                  >
                    <span className="text-[11px] font-mono tracking-wider text-white/50 min-w-[44px]">
                      [ N.0{i + 1} ]
                    </span>
                    <span
                      className="text-[12px] font-semibold tracking-wider uppercase truncate max-w-[210px]"
                      style={{
                        color: i === activeIdx ? "#ffffff" : "rgba(255,255,255,0.6)",
                      }}
                    >
                      {p.title || `Project 0${i + 1}`}
                    </span>
                  </div>
                ))}
              </div>

              {/* Huge Numerals (Exact Reference Style: "01", "02", "03", "04") */}
              <div className="select-none leading-none">
                <span className="font-sans font-light text-white text-[5.5rem] xl:text-[7rem] tracking-tighter leading-none">
                  0{activeIdx + 1}
                </span>
              </div>
            </div>

            {/* Center Content (Title, Location, Subtitle, Description) */}
            <div className="my-auto flex flex-col gap-2 py-4">
              {/* Project Title in warm golden champagne tone */}
              <h2
                className="font-display font-bold uppercase tracking-tight text-[#E2D2B8] leading-tight"
                style={{ fontSize: "clamp(2.2rem, 3.5vw, 3.2rem)" }}
              >
                {prop.title || `Property 0${activeIdx + 1}`}
              </h2>

              {/* Location */}
              <p className="text-white/70 text-[15px] font-sans font-normal">
                {prop.locality || "Assagao, Goa"}, {prop.region ? formatRegionLabel(prop.region) : "India"}
              </p>

              {/* Tagline / Subtitle */}
              <h3 className="text-white text-[20px] xl:text-[24px] font-sans font-light leading-snug mt-6 max-w-[460px]">
                {taglines[activeIdx % taglines.length]}
              </h3>

              {/* Description */}
              <p className="text-white/60 text-[13px] leading-relaxed max-w-[430px] mt-2 font-normal">
                {descriptions[activeIdx % descriptions.length]}
              </p>
            </div>

            {/* Bottom Row: More Details + Full-Width Horizontal Line (Exact Reference Match) */}
            <div className="w-full">
              <button
                onClick={() => navigate(`/property/${prop.id}`)}
                className="text-[13px] font-medium text-white/80 hover:text-white transition-colors cursor-pointer block mb-2.5"
              >
                More Details
              </button>
              <div className="w-full h-px bg-white/20" />
            </div>
          </div>
        </div>
      </section>

      {/* ── Mobile Fallback: List ── */}
      <section className="lg:hidden bg-[#090C0E] py-14 px-6 border-t border-white/10" aria-label="Featured Properties">
        <h2 className="font-display font-bold text-white uppercase tracking-tight text-[22px] mb-8">
          Featured Projects
        </h2>
        <div className="flex flex-col gap-6">
          {visible.map((p, i) => (
            <div
              key={p.id}
              onClick={() => navigate(`/property/${p.id}`)}
              className="bg-[#12171A] overflow-hidden cursor-pointer border border-white/10 shadow-lg"
            >
              <div className="aspect-[16/10] overflow-hidden bg-[#1A2125]">
                <img
                  src={p.thumbnail_url || fallbacks[i % fallbacks.length]}
                  alt={p.title || ""}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
              <div className="p-6 flex flex-col gap-2">
                <span className="font-mono text-[11px] text-white/50 tracking-wider">
                  [ N.0{i + 1} ]
                </span>
                <h3 className="font-display font-bold text-[20px] text-[#E2D2B8] leading-tight">
                  {p.title || `Project 0${i + 1}`}
                </h3>
                <p className="text-white/70 text-[13px]">
                  {p.locality || "Assagao, Goa"}, India
                </p>
                <p className="text-white/60 text-[12.5px] mt-1 line-clamp-2">
                  {taglines[i % taglines.length]}
                </p>
                <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between">
                  <span className="text-[12px] text-white/90 font-medium">More Details</span>
                  <ArrowRight className="size-3 text-white/70" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

// ── Scene 7: Why Choose Us (Matches Reference Frame 3) ───────────────────────
const WHY_CARDS = [
  {
    n: "01",
    title: "LOCAL GOA PROPERTY KNOWLEDGE",
    copy: "We know every locality, lane, and landmark in North and South Goa — giving you an unmatched advantage in every transaction.",
  },
  {
    n: "02",
    title: "VERIFIED PROPERTY LISTINGS",
    copy: "Every listing on Ashiyana is personally visited and verified. No unvetted data, ensuring complete transparency.",
  },
  {
    n: "03",
    title: "DIRECT BROKER ASSISTANCE",
    copy: "You work directly with senior licensed consultants — bespoke guidance throughout your entire real estate journey.",
  },
  {
    n: "04",
    title: "GLOBAL CLIENTELE & TURNKEY SERVICE",
    copy: "We work with discerning clients around the world, offering comprehensive services from sourcing to styling and closing.",
  },
  {
    n: "05",
    title: "EXCEPTIONAL QUALITY & TIMELESS AESTHETIC",
    copy: "We prioritize craftsmanship, quality materials, and enduring design over fleeting trends for homes that inspire.",
  },
];

function WhyChooseUsScene() {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);

  const handleScroll = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    if (maxScroll <= 0) {
      setScrollProgress(0);
      return;
    }
    setScrollProgress(Math.min(1, Math.max(0, el.scrollLeft / maxScroll)));
  };

  const scrollLeft = () => {
    scrollContainerRef.current?.scrollBy({ left: -340, behavior: "smooth" });
  };

  const scrollRight = () => {
    scrollContainerRef.current?.scrollBy({ left: 340, behavior: "smooth" });
  };

  return (
    <section className="py-16 sm:py-24 bg-[#FBF9F5] border-t border-[#EDE8E0]" aria-label="Why Choose Ashiyana">
      <div className="max-w-[1440px] mx-auto px-6 sm:px-12 lg:px-16">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8 sm:mb-12">
          <div>
            <h2
              className="font-display font-bold text-[#172124] leading-tight tracking-tight"
              style={{ fontSize: "clamp(1.8rem, 3.5vw, 3.2rem)" }}
            >
              Why Choose Ashiyana
            </h2>
            <p className="font-display font-medium text-[#717A7D] text-[15px] sm:text-[16px] mt-1">
              Where Excellence Is Standard.
            </p>
          </div>
          {/* Navigation arrow buttons */}
          <div className="hidden sm:flex items-center gap-2">
            <button
              onClick={scrollLeft}
              aria-label="Scroll left"
              className="size-9 rounded-full border border-[#DCD5C9] bg-white hover:bg-[#172124] hover:text-white text-[#172124] flex items-center justify-center transition-colors cursor-pointer text-sm shadow-2xs"
            >
              &lsaquo;
            </button>
            <button
              onClick={scrollRight}
              aria-label="Scroll right"
              className="size-9 rounded-full bg-[#172124] text-white hover:bg-[#2C383C] flex items-center justify-center transition-colors cursor-pointer text-sm shadow-2xs"
            >
              &rsaquo;
            </button>
          </div>
        </div>

        {/* Horizontal Scrollable Cards Track */}
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="flex gap-5 overflow-x-auto pb-6 no-scrollbar"
          style={{ scrollSnapType: "x mandatory" }}
        >
          {WHY_CARDS.map((card) => (
            <div
              key={card.n}
              className="shrink-0 bg-white rounded-2xl p-7 sm:p-8 flex flex-col gap-4 border border-[#E8E3DA] shadow-xs hover:border-[#DCD5C9] transition-all duration-200 hover:-translate-y-0.5"
              style={{
                width: "clamp(280px, 25vw, 340px)",
                scrollSnapAlign: "start",
              }}
            >
              <span className="font-display font-bold text-[#172124]/90 text-[2.2rem] leading-none select-none">
                {card.n}
              </span>
              <h3 className="font-display font-bold text-[14.5px] text-[#172124] tracking-wide leading-snug">
                {card.title}
              </h3>
              <p className="text-[12.5px] text-[#717A7D] leading-relaxed">
                {card.copy}
              </p>
            </div>
          ))}
        </div>

        {/* Scroll Progress Bar */}
        <div className="mt-4 flex items-center gap-4">
          <div className="h-[2px] w-44 bg-[#E0DAD0] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#172124] rounded-full transition-all duration-150 ease-out"
              style={{ width: `${Math.max(20, scrollProgress * 100)}%` }}
            />
          </div>
          <span className="text-[10.5px] text-[#717A7D] font-mono uppercase tracking-wider">
            Scroll to explore
          </span>
        </div>
      </div>
    </section>
  );
}

// ── Scene 8: Testimonials (Exact Reference Match: Voices of Trust) ───────────
const TESTIMONIALS = [
  {
    id: "01",
    name: "Michael Carter",
    role: "Real Estate Developer",
    badge: "01 Testimonials",
    cardBg: "#F9F4ED",
    borderColor: "#EAE2D5",
    badgeBg: "rgba(255,255,255,0.7)",
    badgeBorder: "#D8CEC0",
    badgeText: "#726555",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80",
    quote: "An exceptional experience from start to finish! Their attention to detail and ability to bring ideas to life is truly unmatched. Highly recommended for anyone looking for top-tier properties and investment advisory.",
  },
  {
    id: "02",
    name: "Sophia Roberts",
    role: "Interior Designer",
    badge: "02 Testimonials",
    cardBg: "#EFF5F0",
    borderColor: "#DCE6DE",
    badgeBg: "rgba(255,255,255,0.7)",
    badgeBorder: "#CAD8CC",
    badgeText: "#556A5B",
    avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=120&auto=format&fit=crop&q=80",
    quote: "Working with them was a game-changer for my projects. The virtual tours they created were so immersive and engaging that my clients couldn't stop raving about them!",
  },
  {
    id: "03",
    name: "Rohan & Meera Malhotra",
    role: "Villa Owners, Assagao",
    badge: "03 Testimonials",
    cardBg: "#F9F4ED",
    borderColor: "#EAE2D5",
    badgeBg: "rgba(255,255,255,0.7)",
    badgeBorder: "#D8CEC0",
    badgeText: "#726555",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80",
    quote: "As NRI buyers investing in Goa, title clarity was our primary concern. Ashiyana's diligence and bespoke guidance made the entire acquisition completely seamless.",
  },
  {
    id: "04",
    name: "Vikram Singhal",
    role: "Holiday Home Investor",
    badge: "04 Testimonials",
    cardBg: "#EFF5F0",
    borderColor: "#DCE6DE",
    badgeBg: "rgba(255,255,255,0.7)",
    badgeBorder: "#CAD8CC",
    badgeText: "#556A5B",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&auto=format&fit=crop&q=80",
    quote: "From initial property discovery to rental yield positioning, their team delivers unparalleled professionalism and elite architectural curation.",
  },
];

function TestimonialsScene() {
  const [startIndex, setStartIndex] = useState(0);
  const sectionRef = useRef<HTMLDivElement>(null);
  const inView = useInView(sectionRef, 0.15);

  const prev = () => setStartIndex((i) => (i <= 0 ? TESTIMONIALS.length - 2 : i - 1));
  const next = () => setStartIndex((i) => (i >= TESTIMONIALS.length - 2 ? 0 : i + 1));

  const visibleCards = [
    TESTIMONIALS[startIndex % TESTIMONIALS.length],
    TESTIMONIALS[(startIndex + 1) % TESTIMONIALS.length],
  ];

  return (
    <section
      ref={sectionRef}
      className="py-20 sm:py-28 bg-[#FAF7F2] border-t border-[#EDE8E0] overflow-hidden"
      aria-label="Client Testimonials"
    >
      <div className="max-w-[1400px] mx-auto px-6 sm:px-12 lg:px-18">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          {/* Left Column: Inset Thumbnail + Headline + Navigation Controls */}
          <div
            className="lg:col-span-5 flex flex-col gap-7 transition-all duration-700 ease-out"
            style={{
              opacity: inView ? 1 : 0,
              transform: inView ? "translateY(0)" : "translateY(36px)",
            }}
          >
            {/* Rounded Inset Property Photo */}
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden shadow-sm border border-white/60 bg-[#EDE5DB]">
              <img
                src={imgProp1}
                alt="Client Story Preview"
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>

            {/* Headline */}
            <h2
              className="font-display font-bold text-[#172124] leading-[1.12] tracking-tight"
              style={{ fontSize: "clamp(2.2rem, 3.8vw, 3.6rem)" }}
            >
              Voices of<br />Trust, Stories<br />of Success.
            </h2>

            {/* Carousel Navigation Buttons (Matches Reference) */}
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={prev}
                aria-label="Previous testimonial"
                className="size-11 rounded-full border border-[#D5CCC0] bg-white hover:bg-[#172124] hover:text-white text-[#172124] flex items-center justify-center transition-all cursor-pointer text-lg shadow-2xs"
              >
                &lsaquo;
              </button>
              <button
                onClick={next}
                aria-label="Next testimonial"
                className="size-11 rounded-full bg-[#172124] text-white hover:bg-[#2C383C] flex items-center justify-center transition-all cursor-pointer text-lg shadow-2xs"
              >
                &rsaquo;
              </button>
            </div>
          </div>

          {/* Right Column: Reference-Matched Side-by-Side Two-Tone Cards */}
          <div
            className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-6 transition-all duration-700 ease-out delay-150"
            style={{
              opacity: inView ? 1 : 0,
              transform: inView ? "translateY(0)" : "translateY(36px)",
            }}
          >
            {visibleCards.map((t, idx) => (
              <div
                key={`${t.id}-${idx}`}
                className="rounded-[28px] p-8 sm:p-10 flex flex-col justify-between shadow-xs transition-all duration-300 hover:shadow-md"
                style={{
                  backgroundColor: t.cardBg,
                  border: `1px solid ${t.borderColor}`,
                }}
              >
                <div>
                  {/* Top Bar: Pill Badge + Circular Client Avatar */}
                  <div className="flex items-center justify-between mb-6">
                    <span
                      className="text-[11px] font-semibold tracking-wide px-3 py-1 rounded-full border backdrop-blur-xs"
                      style={{
                        backgroundColor: t.badgeBg,
                        borderColor: t.badgeBorder,
                        color: t.badgeText,
                      }}
                    >
                      {t.badge}
                    </span>
                    <div className="size-12 rounded-full overflow-hidden border-2 border-white shadow-xs">
                      <img
                        src={t.avatar}
                        alt={t.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                  </div>

                  {/* Terracotta Quotation Accent */}
                  <span className="text-[#C47D5A] font-serif font-bold text-[32px] leading-none block mb-3 select-none">
                    66
                  </span>

                  {/* Quote Body */}
                  <p className="text-[14.5px] sm:text-[15.5px] text-[#2C241B] leading-relaxed mb-8 font-normal">
                    {t.quote}
                  </p>
                </div>

                {/* Author Info */}
                <div className="pt-2">
                  <span className="font-bold text-[15px] text-[#172124] block leading-snug">
                    {t.name}
                  </span>
                  <span className="text-[12.5px] text-[#7A736B] font-normal mt-0.5 block">
                    {t.role}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Scene 9: Contact CTA ─────────────────────────────────────────────────────
function ContactCTAScene() {
  const navigate = useNavigate();
  const { profile } = useBusinessProfile();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, 0.2);
  const whatsappUrl = profile?.whatsapp_number
    ? `https://wa.me/${profile.whatsapp_number.replace(/\D/g, "")}`
    : null;

  return (
    <section className="bg-[#172124] py-20 sm:py-28 px-6 border-t border-white/5">
      <div
        ref={ref}
        className="max-w-[760px] mx-auto flex flex-col items-center gap-5 text-center"
        style={{
          transitionProperty: "opacity, transform",
          transitionDuration: "600ms",
          transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
          opacity: inView ? 1 : 0,
          transform: inView ? "translateY(0)" : "translateY(24px)",
        }}
      >
        <h2
          className="font-display font-medium text-white leading-[1.12] tracking-tight"
          style={{ fontSize: "clamp(1.6rem, 3.8vw, 3.2rem)" }}
        >
          Ready to Make Your<br />Dream Property a Reality?
        </h2>
        <p className="text-white/70 max-w-[500px] leading-relaxed text-[13.5px] sm:text-[14.5px]">
          Connect with our senior property consultants to discover verified luxury villas and estates in Goa.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 mt-2">
          <button
            onClick={() => navigate("/contact")}
            className="flex items-center gap-2 px-8 py-3.5 rounded-full bg-white text-[#172124] font-semibold hover:bg-[#F0EDE8] transition-all shadow-md cursor-pointer"
            style={{ fontSize: "clamp(0.8rem, 1.2vw, 0.875rem)" }}
          >
            Get Started
            <ArrowRight className="size-4" />
          </button>
          {whatsappUrl && (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-8 py-3.5 rounded-full border border-white/20 text-white font-medium hover:bg-white/10 transition-all"
              style={{ fontSize: "clamp(0.8rem, 1.2vw, 0.875rem)" }}
            >
              Chat on WhatsApp
            </a>
          )}
        </div>
      </div>
    </section>
  );
}

// â”€â”€ Main HomePage â€” Scrollytelling Canvas â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export default function HomePage() {
  const [properties, setProperties] = useState<PropertyCardDto[]>([]);

  useEffect(() => {
    fetchFeaturedProperties()
      .then((data) => { if (Array.isArray(data) && data.length > 0) setProperties(data); })
      .catch((err) => console.warn("Featured properties fetch:", err));
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <HeroScene />
      <AboutScene />
      <StatsScene />
      <KineticHeadline />
      <ServicesScrollScene />
      <WhyChooseUsScene />
      {properties.length > 0 && <ProjectsScrollScene properties={properties} />}
      <TestimonialsScene />
      <ContactCTAScene />
      <SiteFooter />
    </div>
  );
}
