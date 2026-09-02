import { Link, useNavigate } from "react-router";
import { SiteNavbar } from "@/components/SiteNavbar";
import { SiteFooter } from "@/components/SiteFooter";
import { useBusinessProfile } from "@/context/BusinessProfileContext";
import {
  Building2,
  KeyRound,
  Coins,
  FileText,
  PhoneCall,
  FileCheck2,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  MessageSquare,
  Phone,
  ShieldCheck,
  Check,
} from "lucide-react";

import imgHeroBg from "@/imports/RealEstate/fc08c6d52d3372bb7c332b62ae35bbf3dd4cc91a.png";
import imgSellFeatured from "@/imports/RealEstate/721343dadb78ce017961e6632d7d0b288171d892.png";
import imgBuyFeatured from "@/imports/RealEstate/51dadbde438a85a76794ae7bb5d236bd397142c4.png";
import imgCTABg from "@/imports/RealEstate/161f0ce0c52e9116b767b74364def55806e99cc1.png";

export default function ServicesPage() {
  const navigate = useNavigate();
  const { profile } = useBusinessProfile();
  const whatsappUrl = profile?.whatsapp_number
    ? `https://wa.me/${profile.whatsapp_number.replace(/\D/g, "")}`
    : `https://wa.me/918888083558`;

  const services = [
    {
      num: "01",
      title: "Buy a Property",
      desc: "Help clients discover suitable homes, apartments, luxury villas, plots and high-yield investment properties across North and South Goa.",
      cta: "Explore Properties",
      href: "/properties",
      icon: Building2,
      featured: true,
      tag: "Acquisitions",
    },
    {
      num: "02",
      title: "Sell Your Property",
      desc: "Submit your property details and let Ashiyana review your property for accurate valuation, verified title checks, and potential direct listing.",
      cta: "Submit Property",
      href: "/sell",
      icon: KeyRound,
      featured: true,
      tag: "Direct Selling",
    },
    {
      num: "03",
      title: "Rent a Property",
      desc: "Find long-term or seasonal rental opportunities suited to your lifestyle requirements, coastal location preference, and budget.",
      cta: "Find a Rental",
      href: "/properties?purpose=rent",
      icon: Coins,
      featured: false,
      tag: "Leasing",
    },
    {
      num: "04",
      title: "Property Valuation",
      desc: "Share your property details and receive professional broker review, comparative market analysis, and pricing guidance tailored to Goa micro-markets.",
      cta: "Request Valuation",
      href: "/sell",
      icon: FileText,
      featured: false,
      tag: "Market Analysis",
    },
    {
      num: "05",
      title: "Property Consultation",
      desc: "Get personalized guidance when evaluating property types, zone clearances, future appreciation corridors, and transaction processes in Goa.",
      cta: "Talk to Us",
      href: "/contact",
      icon: PhoneCall,
      featured: false,
      tag: "Advisory",
    },
    {
      num: "06",
      title: "Documentation Guidance",
      desc: "Receive dedicated assistance navigating title search reports, mutation records, FEMA compliance for NRIs, and sub-registrar deed execution.",
      cta: "Contact Us",
      href: "/contact",
      icon: FileCheck2,
      featured: false,
      tag: "Legal & Titles",
    },
  ];

  const processSteps = [
    {
      step: "01",
      title: "Tell Us What You Need",
      desc: "Share your budget, preferred coastal localities, property specifications, or property details for selling.",
    },
    {
      step: "02",
      title: "Explore Suitable Properties",
      desc: "Receive curated, title-verified listings or market valuation feedback tailored to your exact criteria.",
    },
    {
      step: "03",
      title: "Schedule a Visit",
      desc: "Inspect short-listed estates in person or via private live walkthroughs with senior broker assistance.",
    },
    {
      step: "04",
      title: "Move Forward With Confidence",
      desc: "Finalize agreements with verified legal paperwork, transparent pricing, and sub-registrar coordination.",
    },
  ];

  const trustPoints = [
    {
      title: "Local Goa Property Knowledge",
      desc: "Decades of on-ground familiarity with coastal regulations, village panchayat rules, and authentic Goa micro-markets.",
    },
    {
      title: "Direct Broker Assistance",
      desc: "Work directly with Kassim Shaikh and experienced professionals — zero automated middleman confusion.",
    },
    {
      title: "Verified Property Listings",
      desc: "Every listed villa and estate undergoes document review, clear ownership verification, and GPS coordinate mapping.",
    },
    {
      title: "Simple Property Submission",
      desc: "Owners can upload property specifications and high-resolution photography in minutes for immediate broker review.",
    },
    {
      title: "Personalised Guidance",
      desc: "Tailored advisory for domestic buyers, NRI investors (FEMA guidelines), and local property sellers.",
    },
  ];

  return (
    <div className="min-h-screen bg-white font-sans text-[#172124]">
      {/* ─── 1. SERVICES HERO SECTION ────────────────────────────────────────── */}
      <div className="w-full bg-white pt-3 sm:pt-4 px-3 sm:px-6 lg:px-8">
        <div className="relative w-full max-w-[1400px] mx-auto min-h-[520px] sm:min-h-[580px] rounded-[28px] sm:rounded-[36px] overflow-hidden bg-[#172124] text-white flex flex-col justify-between pb-12 sm:pb-16 shadow-md">
          {/* Background Image with Dark Vignette */}
          <img
            src={imgHeroBg}
            alt="Goa Real Estate Services"
            className="absolute inset-0 size-full object-cover object-center opacity-40 pointer-events-none z-0"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#172124] via-[#172124]/60 to-transparent pointer-events-none z-[1]" />

          {/* Navigation Overlay */}
          <div className="relative z-20">
            <SiteNavbar variant="hero" />
          </div>

          {/* Hero Content */}
          <div className="relative z-10 w-full px-6 sm:px-10 lg:px-14 pt-8 flex flex-col gap-6 max-w-[900px]">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 text-white/90 border border-white/20 text-[11.5px] font-mono uppercase tracking-[0.2em] backdrop-blur-md w-fit">
              <ShieldCheck className="size-3.5 text-[#C9AD86]" />
              <span>Full-Spectrum Real Estate Advisory</span>
            </div>

            <h1 className="font-display font-bold text-[40px] sm:text-[56px] lg:text-[68px] text-white leading-[1.08] tracking-tight">
              Real Estate Services,<br />Made Simple.
            </h1>

            <p className="text-[15px] sm:text-[17px] text-white/85 leading-relaxed max-w-[640px]">
              From finding the right property to selling with confidence, Ashiyana Real Estate provides trusted guidance throughout your property journey in Goa.
            </p>

            <div className="flex flex-wrap items-center gap-3.5 pt-2">
              <Link
                to="/properties"
                className="px-7 py-3.5 rounded-full bg-white text-[#172124] font-semibold text-[13.5px] hover:bg-[#FAF7F2] transition-all shadow-xs flex items-center gap-2 cursor-pointer"
              >
                <span>Explore Properties</span>
                <ArrowRight className="size-4" />
              </Link>
              <Link
                to="/sell"
                className="px-7 py-3.5 rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/25 font-semibold text-[13.5px] transition-all backdrop-blur-md flex items-center gap-2 cursor-pointer"
              >
                <span>Sell Your Property</span>
                <ArrowUpRight className="size-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ─── 2. CORE SERVICES EDITORIAL GRID ("How we can help") ─────────────── */}
      <section className="py-20 sm:py-28 bg-white">
        <div className="max-w-[1400px] mx-auto px-6 sm:px-12 lg:px-16 flex flex-col gap-12 sm:gap-16">
          {/* Header */}
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-6 border-b border-[#EDE8E0]">
            <div className="max-w-[600px] flex flex-col gap-2">
              <span className="text-[11.5px] font-mono font-semibold uppercase tracking-[0.2em] text-[#8B7D68] block">
                [ Comprehensive Advisory ]
              </span>
              <h2 className="font-display font-bold text-[34px] sm:text-[46px] text-[#172124] leading-tight tracking-tight">
                How we can help
              </h2>
            </div>
            <p className="text-[14.5px] sm:text-[15.5px] text-[#717A7D] max-w-[480px] leading-relaxed">
              Whether you're buying, selling or looking for your next property in Goa, our team is here to guide you through every step with transparency and local expertise.
            </p>
          </div>

          {/* Asymmetric Editorial Services Layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {services.map((srv) => {
              const Icon = srv.icon;
              return (
                <div
                  key={srv.title}
                  onClick={() => navigate(srv.href)}
                  className={`group rounded-[24px] border border-[#EDE8E0] p-7 sm:p-8 flex flex-col justify-between gap-6 transition-all duration-300 cursor-pointer shadow-2xs hover:shadow-md hover:border-[#172124]/30 ${
                    srv.featured ? "bg-[#FAF7F2]" : "bg-white"
                  }`}
                >
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <div className="size-11 rounded-[14px] bg-[#172124] text-white flex items-center justify-center shadow-xs group-hover:bg-[#8B7D68] transition-colors">
                        <Icon className="size-5" />
                      </div>
                      <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-[#8B7D68] px-3 py-1 rounded-full bg-white border border-[#EDE8E0]">
                        {srv.tag}
                      </span>
                    </div>

                    <div>
                      <h3 className="font-display font-bold text-[21px] sm:text-[22px] text-[#172124] group-hover:text-[#8B7D68] transition-colors tracking-tight">
                        {srv.title}
                      </h3>
                      <p className="text-[13.5px] sm:text-[14px] text-[#717A7D] leading-relaxed mt-2.5">
                        {srv.desc}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-[13px] font-semibold text-[#172124] pt-4 border-t border-[#EDE8E0] group-hover:text-[#8B7D68] transition-colors">
                    <span>{srv.cta}</span>
                    <ArrowRight className="size-3.5 transition-transform duration-200 group-hover:translate-x-1" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── 3. FEATURED SERVICE: SELLING SECTION ────────────────────────────── */}
      <section className="py-16 sm:py-24 bg-[#FAF7F2] border-y border-[#EDE8E0]">
        <div className="max-w-[1400px] mx-auto px-6 sm:px-12 lg:px-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 items-center">
            {/* Left: Large Property Image */}
            <div className="lg:col-span-6 relative aspect-[16/11] rounded-[24px] overflow-hidden bg-gray-100 border border-[#EDE8E0] shadow-sm">
              <img
                src={imgSellFeatured}
                alt="Selling Property in Goa"
                className="size-full object-cover"
              />
              <div className="absolute top-4 left-4">
                <span className="px-3.5 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider bg-white/95 text-[#172124] shadow-xs backdrop-blur-md">
                  Dedicated Owner Support
                </span>
              </div>
            </div>

            {/* Right: Pitch & Direct Sell CTA */}
            <div className="lg:col-span-6 flex flex-col gap-5">
              <span className="text-[11.5px] font-mono font-semibold uppercase tracking-[0.2em] text-[#8B7D68] block">
                [ Seller Submissions & Marketing ]
              </span>

              <h2 className="font-display font-bold text-[32px] sm:text-[44px] text-[#172124] leading-[1.12] tracking-tight">
                Thinking of selling your property in Goa?
              </h2>

              <p className="text-[14.5px] sm:text-[15.5px] text-[#717A7D] leading-relaxed">
                Tell us about your property, share the details and photos, and our team will review your submission. Once verified, suitable properties can be listed on Ashiyana.
              </p>

              <div className="flex flex-col gap-2.5 pt-1 text-[13.5px] text-[#172124] font-medium">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="size-4 text-[#8B7D68] shrink-0" />
                  <span>Free initial broker valuation and market positioning</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="size-4 text-[#8B7D68] shrink-0" />
                  <span>Reach qualified domestic and NRI luxury buyers directly</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="size-4 text-[#8B7D68] shrink-0" />
                  <span>Private seller portal with real-time status tracking</span>
                </div>
              </div>

              <div className="pt-3">
                <Link
                  to="/sell"
                  className="px-7 py-3.5 rounded-full bg-[#172124] text-white font-semibold text-[13.5px] hover:bg-[#2C383C] transition-all shadow-xs inline-flex items-center gap-2 cursor-pointer"
                >
                  <span>Sell Your Property</span>
                  <ArrowRight className="size-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 4. BUYING SECTION ───────────────────────────────────────────────── */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="max-w-[1400px] mx-auto px-6 sm:px-12 lg:px-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 items-center">
            {/* Left Content */}
            <div className="lg:col-span-6 flex flex-col gap-5 order-2 lg:order-1">
              <span className="text-[11.5px] font-mono font-semibold uppercase tracking-[0.2em] text-[#8B7D68] block">
                [ Curated Inventory ]
              </span>

              <h2 className="font-display font-bold text-[32px] sm:text-[44px] text-[#172124] leading-[1.12] tracking-tight">
                Looking for a property in Goa?
              </h2>

              <p className="text-[14.5px] sm:text-[15.5px] text-[#717A7D] leading-relaxed">
                Browse Ashiyana's curated selection of villas, apartments, riverfront homes and plots across Assagao, Anjuna, Candolim, Panaji, and South Goa. Contact our lead broker directly for private viewings and verified title dossiers.
              </p>

              <div className="pt-2">
                <Link
                  to="/properties"
                  className="px-7 py-3.5 rounded-full bg-[#172124] text-white font-semibold text-[13.5px] hover:bg-[#2C383C] transition-all shadow-xs inline-flex items-center gap-2 cursor-pointer"
                >
                  <span>Browse Properties</span>
                  <ArrowRight className="size-4" />
                </Link>
              </div>
            </div>

            {/* Right: Property Photo */}
            <div className="lg:col-span-6 relative aspect-[16/11] rounded-[24px] overflow-hidden bg-gray-100 border border-[#EDE8E0] shadow-sm order-1 lg:order-2">
              <img
                src={imgBuyFeatured}
                alt="Browse Luxury Properties in Goa"
                className="size-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ─── 5. 4-STEP PROCESS SECTION ───────────────────────────────────────── */}
      <section className="py-20 sm:py-28 bg-[#FAF7F2] border-t border-[#EDE8E0]">
        <div className="max-w-[1400px] mx-auto px-6 sm:px-12 lg:px-16 flex flex-col gap-12 sm:gap-16">
          <div className="flex flex-col gap-2 max-w-[620px]">
            <span className="text-[11.5px] font-mono font-semibold uppercase tracking-[0.2em] text-[#8B7D68] block">
              [ Streamlined Journey ]
            </span>
            <h2 className="font-display font-bold text-[34px] sm:text-[46px] text-[#172124] leading-tight tracking-tight">
              Our 4-Step Process
            </h2>
            <p className="text-[14px] sm:text-[15px] text-[#717A7D]">
              Clear milestones from initial inquiry to final possession and paperwork.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
            {processSteps.map((p) => (
              <div
                key={p.step}
                className="bg-white rounded-[24px] border border-[#EDE8E0] p-6 sm:p-7 flex flex-col justify-between gap-6 shadow-xs relative"
              >
                <div className="flex items-center justify-between">
                  <span className="font-display font-bold text-[34px] text-[#C9AD86] leading-none">
                    {p.step}
                  </span>
                  <span className="size-2 rounded-full bg-[#172124]/20" />
                </div>

                <div>
                  <h3 className="font-display font-bold text-[18.5px] text-[#172124] leading-snug tracking-tight">
                    {p.title}
                  </h3>
                  <p className="text-[13px] text-[#717A7D] leading-relaxed mt-2">
                    {p.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 6. WHY CHOOSE ASHIYANA SECTION ──────────────────────────────────── */}
      <section className="py-20 sm:py-28 bg-white border-t border-[#EDE8E0]">
        <div className="max-w-[1400px] mx-auto px-6 sm:px-12 lg:px-16 flex flex-col gap-12 sm:gap-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14">
            <div className="lg:col-span-5 flex flex-col gap-3">
              <span className="text-[11.5px] font-mono font-semibold uppercase tracking-[0.2em] text-[#8B7D68] block">
                [ The Ashiyana Standard ]
              </span>
              <h2 className="font-display font-bold text-[34px] sm:text-[46px] text-[#172124] leading-tight tracking-tight">
                Why choose Ashiyana?
              </h2>
              <p className="text-[14.5px] text-[#717A7D] leading-relaxed mt-2">
                We believe in genuine advisory over sales pressure. Every recommendation is backed by legal due-diligence and verified pricing.
              </p>
            </div>

            <div className="lg:col-span-7 flex flex-col gap-4">
              {trustPoints.map((item) => (
                <div
                  key={item.title}
                  className="bg-[#FAF7F2] rounded-[20px] border border-[#EDE8E0] p-5 sm:p-6 flex items-start gap-4 shadow-2xs"
                >
                  <div className="size-7 rounded-full bg-[#172124]/10 text-[#172124] flex items-center justify-center shrink-0 mt-0.5 font-bold">
                    <Check className="size-4 text-[#8B7D68]" />
                  </div>
                  <div>
                    <h4 className="font-bold text-[16px] text-[#172124] leading-snug">
                      {item.title}
                    </h4>
                    <p className="text-[13.5px] text-[#717A7D] leading-relaxed mt-1">
                      {item.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── 7. CONTACT CTA BANNER ───────────────────────────────────────────── */}
      <section className="relative w-full bg-[#172124] text-white py-20 sm:py-28 overflow-hidden">
        <img
          src={imgCTABg}
          alt="Contact Ashiyana Real Estate"
          className="absolute inset-0 size-full object-cover opacity-30 pointer-events-none"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#172124] via-black/40 to-[#172124] pointer-events-none" />

        <div className="relative z-10 max-w-[800px] mx-auto px-6 text-center flex flex-col items-center gap-6">
          <span className="text-[11.5px] font-mono font-semibold uppercase tracking-[0.2em] text-[#C9AD86] block">
            [ Direct Consultation ]
          </span>

          <h2 className="font-display font-bold text-[34px] sm:text-[46px] lg:text-[52px] text-white leading-[1.12] tracking-tight">
            Have a property question?<br className="hidden sm:inline" /> Let's talk about your next move.
          </h2>

          <p className="text-[14.5px] sm:text-[16px] text-white/80 max-w-[580px] leading-relaxed">
            Speak directly with {profile?.broker_name || "Kassim Shaikh"} for personalized property scouting, listing valuations, or documentation inquiries.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3.5 pt-2">
            <Link
              to="/contact"
              className="px-7 py-3.5 rounded-full bg-white text-[#172124] font-semibold text-[13.5px] hover:bg-[#FAF7F2] transition-all shadow-md flex items-center gap-2 cursor-pointer"
            >
              <Phone className="size-4 text-[#8B7D68]" />
              <span>Get in Touch</span>
            </Link>

            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-7 py-3.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-[13.5px] transition-all shadow-md flex items-center gap-2 cursor-pointer"
            >
              <MessageSquare className="size-4" />
              <span>WhatsApp Us</span>
            </a>
          </div>
        </div>
      </section>

      {/* ─── 8. FOOTER ───────────────────────────────────────────────────────── */}
      <SiteFooter />
    </div>
  );
}
