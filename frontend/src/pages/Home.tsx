import { useNavigate } from "react-router";
import React, { useRef } from "react";
import svgPaths from "@/imports/RealEstate/svg-9nqs7nb86p";

import imgHeroMask from "@/imports/RealEstate/e355d62c4d2100e96b397f8f8abb474702127b6a.png";
import imgHeroBuilding from "@/imports/RealEstate/49658d0da16f8084444e5dd498bff7187726c095.png";
import imgServicesMain from "@/imports/RealEstate/af313bb3c64a801c5185e22b02fba353b59626e2.png";
import imgServicesVilla from "@/imports/RealEstate/fecad97c8707393865ca59d3678ab3a6d9ea8cae.png";
import imgServicesSmall1 from "@/imports/RealEstate/bbea24d92da46236b8e859e152b0b3372f5241f8.png";
import imgProp1 from "@/imports/RealEstate/721343dadb78ce017961e6632d7d0b288171d892.png";
import imgProp2 from "@/imports/RealEstate/51dadbde438a85a76794ae7bb5d236bd397142c4.png";
import imgProp3 from "@/imports/RealEstate/02397dd95a1cf0bc9f1bf2dc72092471ba81f810.png";
import imgProp4 from "@/imports/RealEstate/3ccc16e633d8543e1cd4eb7277c90c1766d6b950.png";
import imgProp5 from "@/imports/RealEstate/c8fd636d096d527db411430cbd96ef0cb517ff64.png";
import imgProp6 from "@/imports/RealEstate/6389556655a7b2a2111fce6abd1dc5de87f732e3.png";
import imgFeatured from "@/imports/RealEstate/fc08c6d52d3372bb7c332b62ae35bbf3dd4cc91a.png";
import imgTestimonial from "@/imports/RealEstate/de3ebd1afddb796eddb0f94be6bae6d8a7403e21.png";
import imgBlog1 from "@/imports/RealEstate/0334ef3cecf7c329c5d5e87624872f5c4ad802b3.png";
import imgBlog2 from "@/imports/RealEstate/ccdaa61b62de1fb1de213eff29048af23d773b88.png";
import imgBlog3 from "@/imports/RealEstate/84c671b0394b683dffa2853c85ba7035f7860067.png";
import imgCTA from "@/imports/RealEstate/161f0ce0c52e9116b767b74364def55806e99cc1.png";
import imgGal1 from "@/imports/RealEstate/c483db25021ac3362d255ec569d4b60b84445582.png";
import imgGal2 from "@/imports/RealEstate/577f5adebcaa3126ae183b2156c2a743a5fbcad1.png";
import imgGal3 from "@/imports/RealEstate/69af7029171a658b8cc0d93aff1c79ee3ac7f68c.png";

import {
  BG, GREEN, fv,
  Reveal, SectionLabel,
  IconArrowRight, IconArrowLeft, IconBed, IconBath, IconArea,
  IconMap, IconQuote, IconPlus, IconBedroom, IconBathroom, IconParking,
} from "@/lib/shared";
import { SiteNavbar } from "@/components/SiteNavbar";
import { SiteFooter } from "@/components/SiteFooter";

// ─── Hero ──────────────────────────────────────────────────────────────────────
function HeroSection({
  footerRef,
}: {
  footerRef: React.RefObject<HTMLDivElement | null>;
}) {
  const navigate = useNavigate();
  return (
    <div className="relative w-full h-[680px] overflow-hidden flex flex-col" style={{ backgroundColor: "#9cc2dd" }}>
      <div
        className="absolute inset-0"
        style={{
          background: "linear-gradient(180deg, #79ade1 10.4%, #9cc2dd 61.6%, white 108%)",
          maskImage: `url("${imgHeroMask}")`,
          WebkitMaskImage: `url("${imgHeroMask}")`,
          maskSize: "1920px 848px",
          WebkitMaskSize: "1920px 848px",
          maskPosition: "center",
          WebkitMaskPosition: "center",
          maskRepeat: "no-repeat",
          WebkitMaskRepeat: "no-repeat",
        }}
      />
      <div
        className="absolute pointer-events-none"
        style={{ left: "calc(50% + 60px)", top: "-73px", width: "1133px", height: "1070px", transform: "scaleY(-1) rotate(177.04deg)" }}
      >
        <img src={imgHeroBuilding} alt="" className="absolute h-full max-w-none" style={{ left: "-33.84%", top: 0, width: "140.87%" }} />
      </div>

      <SiteNavbar variant="hero" />

      <div className="flex-1 flex flex-col justify-center w-full max-w-[1280px] mx-auto px-6 gap-[24px] pb-16">
        <Reveal>
          <div className="flex flex-col gap-[16px]">
            <p className="font-['Bricolage_Grotesque:Medium',sans-serif] font-medium text-[16px] text-white leading-[1.4] tracking-[-0.1px]" style={fv}>
              South Goa, India
            </p>
            <div className="font-['Bricolage_Grotesque:SemiBold',sans-serif] font-semibold text-white leading-none tracking-[-2.08px]" style={{ ...fv, fontSize: "68px" }}>
              <p className="leading-none mb-0">Your Goa</p>
              <p className="leading-none">Dream Home</p>
            </div>
          </div>
        </Reveal>
        <Reveal delay={100}>
          <div className="flex gap-[16px] items-start">
            <button
              onClick={() =>
                footerRef.current?.scrollIntoView({
                  behavior: "smooth",
                })
              }
              className="bg-white flex items-center justify-center px-[26px] py-[14px] rounded-full cursor-pointer hover:scale-105 transition-all duration-300"
            >
              <span className="font-['Bricolage_Grotesque:SemiBold',sans-serif] font-semibold text-[16px] text-[#172023] leading-[1.4] tracking-[-0.1px] whitespace-nowrap" style={fv}>Get in touch</span>
            </button>
            <button
              onClick={() => navigate("/properties")}
              className="flex items-center justify-center px-[26px] py-[14px] rounded-full border border-white cursor-pointer hover:bg-white transition-all duration-300"
            >
              <span className="font-['Bricolage_Grotesque:SemiBold',sans-serif] font-semibold text-[16px] text-white leading-[1.4] tracking-[-0.1px] whitespace-nowrap" style={fv}>View Listings</span>
            </button>
          </div>
        </Reveal>
      </div>

      <div className="absolute bottom-0 right-0 bg-white rounded-tl-[16px] flex items-center px-[64px] py-[47px] gap-[48px]">
        {[{ Icon: IconBedroom, label: "4 Bedrooms" }, { Icon: IconBathroom, label: "3 Bathrooms" }, { Icon: IconParking, label: "Parking space" }].map(({ Icon, label }, i, arr) => (
          <div key={label} className="flex items-center gap-[48px]">
            <div className="flex flex-col gap-[12px] items-center justify-center">
              <Icon />
              <span className="font-['Bricolage_Grotesque:Regular',sans-serif] font-normal text-[16px] text-[#172023] leading-[1.4] tracking-[-0.1px] whitespace-nowrap" style={fv}>{label}</span>
            </div>
            {i < arr.length - 1 && <div className="w-px h-[56px] bg-[#172023]/10" />}
          </div>
        ))}
        <div className="w-px h-[56px] bg-[#172023]/10" />
        <div className="flex flex-col gap-[4px] items-start">
          <span className="font-['Bricolage_Grotesque:Medium',sans-serif] font-medium text-[28px] text-[#172023] text-center leading-[1.4] tracking-[-0.1px] whitespace-nowrap" style={fv}>₹3.8 Cr</span>
          <span className="font-['Bricolage_Grotesque:Regular',sans-serif] font-normal text-[16px] text-[#172023]/50 leading-[1.4] tracking-[-0.1px]" style={fv}>For selling price</span>
        </div>
      </div>
      <div className="absolute bottom-[16px] left-[260px] backdrop-blur-[6px] bg-[rgba(23,32,35,0.5)] flex gap-[4px] items-center px-[12px] py-[8px] rounded-full">
        {[1, 0.8, 0.8, 0.8].map((op, i) => (
          <div key={i} className="size-[8px] rounded-full bg-white" style={{ opacity: op }} />
        ))}
      </div>
    </div>
  );
}

// ─── Services ──────────────────────────────────────────────────────────────────
function ServicesSection() {
  return (
    <section className="relative w-full bg-white py-[88px] overflow-hidden">
      <div className="absolute left-[-191px] top-[51px] w-[1011px] h-[1054px] pointer-events-none">
        <svg className="absolute inset-0 size-full" viewBox="0 0 1011.47 1053.62" fill="none">
          <path d={svgPaths.p39693600} stroke="url(#svc-grad)" />
          <defs>
            <linearGradient id="svc-grad" x1="505.733" y1="0" x2="505.733" y2="1014" gradientUnits="userSpaceOnUse">
              <stop stopColor={GREEN} stopOpacity="0.1" />
              <stop offset="1" stopColor="white" />
            </linearGradient>
          </defs>
        </svg>
      </div>
      <div className="max-w-[1200px] mx-auto px-6">
        <div className="grid grid-cols-[680px_1fr] gap-[32px]">
          <div className="flex flex-col py-[24px] gap-[32px]">
            <Reveal>
              <div className="flex flex-col gap-[12px]">
                <SectionLabel text="Categories" />
                <div className="flex flex-col gap-[8px]">
                  <div className="font-['Bricolage_Grotesque:Medium',sans-serif] font-medium text-[#172023] leading-[1.2] tracking-[-1.04px]" style={{ ...fv, fontSize: "42px" }}>
                    <p className="mb-0">Explore best properties</p>
                    <p>with expert services.</p>
                  </div>
                  <p className="font-['Bricolage_Grotesque:Regular',sans-serif] font-normal text-[16px] text-[#172023]/50 leading-[1.4] tracking-[-0.1px] max-w-[632px]" style={fv}>
                    Discover a diverse range of premium properties, from luxurious beachside villas to modern apartments in the heart of Goa.
                  </p>
                </div>
              </div>
            </Reveal>
            <Reveal delay={100}>
              <button className="flex items-center justify-center px-[26px] py-[14px] rounded-full self-start btn-hover" style={{ backgroundColor: GREEN }}>
                <span className="font-['Bricolage_Grotesque:SemiBold',sans-serif] font-semibold text-[16px] text-white leading-[1.4] tracking-[-0.1px] whitespace-nowrap" style={fv}>View properties</span>
              </button>
            </Reveal>
            <Reveal delay={200}>
              <div className="h-[386px] rounded-[16px] overflow-hidden relative img-hover-zoom">
                <img src={imgServicesMain} alt="Properties in Goa" className="absolute inset-0 size-full object-cover rounded-[16px]" />
              </div>
            </Reveal>
          </div>

          <div className="flex flex-col gap-[32px]">
            <Reveal delay={150}>
              <div className="flex flex-col gap-[4px] h-[386px] items-start justify-end overflow-hidden pb-[40px] pl-[40px] pr-[24px] pt-[24px] relative rounded-[16px] img-hover-zoom">
                <div className="absolute inset-0 rounded-[16px]">
                  <img src={imgServicesVilla} alt="Luxury Villas" className="absolute size-full object-cover rounded-[16px]" />
                  <div className="absolute inset-0 rounded-[16px] bg-gradient-to-b from-transparent to-black/40" />
                </div>
                <div className="relative z-10 flex flex-col gap-[4px] w-full">
                  <p className="font-['Bricolage_Grotesque:Medium',sans-serif] font-medium text-[28px] text-white leading-[1.4] tracking-[-0.1px] w-full" style={fv}>Luxury Villas</p>
                  <p className="font-['Bricolage_Grotesque:Regular',sans-serif] font-normal text-[16px] text-white/80 leading-[1.4] tracking-[-0.1px] w-full" style={fv}>
                    Experience elegance and comfort with our exclusive luxury villas, crafted for sophisticated living in Goa.
                  </p>
                </div>
                <button className="absolute top-[24px] right-[24px] bg-white size-[56px] rounded-full flex items-center justify-center btn-hover">
                  <IconArrowRight />
                </button>
              </div>
            </Reveal>

            <Reveal delay={250}>
                <div className="h-[386px] rounded-[16px] overflow-hidden relative img-hover-zoom">
                  <img src={imgServicesSmall1} alt="Apartments" className="absolute inset-0 size-full object-cover rounded-[16px]" />
                </div>
              </Reveal>

          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Property Card ─────────────────────────────────────────────────────────────
type PropertyCardProps = {
  image: string; name: string; location: string; price: string;
  beds: string; baths: string; area: string; featured?: boolean; delay?: number;
};

function PropertyCard({ image, name, location, price, beds, baths, area, featured = false, delay = 0 }: PropertyCardProps) {
  return (
    <Reveal delay={delay}>
      <div className={`relative rounded-[16px] w-full ${featured ? "drop-shadow-[0px_10px_7.5px_rgba(0,0,0,0.1),0px_4px_3px_rgba(0,0,0,0.05)]" : ""} card-lift`}>
        <div className="flex flex-col isolate overflow-clip rounded-[16px]">
          <div className="h-[300px] overflow-hidden relative rounded-tl-[6px] rounded-tr-[6px] img-hover-zoom">
            {featured && <div className="absolute inset-0 bg-black/40 z-10" />}
            <img src={image} alt={name} className="absolute inset-0 size-full object-cover" />
            {featured && (
              <button className="absolute top-[24px] right-[24px] z-20 bg-white size-[56px] rounded-full flex items-center justify-center btn-hover">
                <IconArrowRight />
              </button>
            )}
          </div>
          <div className="bg-white p-[24px] flex flex-col gap-[24px]">
            <div className="flex items-start justify-between w-full">
              <div className="flex flex-col gap-[2px]">
                <p className="font-['Bricolage_Grotesque:Medium',sans-serif] font-medium text-[20px] text-[#172023] leading-[1.2] tracking-[-0.4px] whitespace-nowrap" style={fv}>{name}</p>
                <p className="font-['Bricolage_Grotesque:Regular',sans-serif] font-normal text-[16px] text-[#172023]/50 leading-[1.4] tracking-[-0.1px]" style={fv}>{location}</p>
              </div>
              <div className="flex items-center justify-center px-[20px] py-[8px] rounded-full" style={{ backgroundColor: `${GREEN}1a` }}>
                <span className="font-['Bricolage_Grotesque:Regular',sans-serif] font-normal text-[16px] text-center leading-[1.4] tracking-[-0.1px] whitespace-nowrap" style={{ ...fv, color: GREEN }}>{price}</span>
              </div>
            </div>
            <div className="flex gap-[32px] items-center w-full">
              {[{ icon: <IconBed />, label: beds }, { icon: <IconBath />, label: baths }, { icon: <IconArea />, label: area }].map(({ icon, label }, i, arr) => (
                <div key={label} className="flex items-center gap-[32px]">
                  <div className="flex flex-col gap-[8px] items-start">
                    <div className="size-[20px] flex items-center justify-center overflow-hidden">{icon}</div>
                    <span className="font-['Bricolage_Grotesque:Regular',sans-serif] font-normal text-[16px] text-[#172023] leading-[1.4] tracking-[-0.1px] whitespace-nowrap" style={fv}>{label}</span>
                  </div>
                  {i < arr.length - 1 && <div className="h-[44px] w-px bg-[#172023]/10" />}
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="absolute inset-0 rounded-[16px] border border-[#172023]/10 pointer-events-none" />
      </div>
    </Reveal>
  );
}

const GOA_PROPERTIES: PropertyCardProps[] = [
  { image: imgProp1, name: "Candolim Beach Villas", location: "15 Candolim Road, North Goa", price: "₹2.8 Cr", beds: "4 Bedrooms", baths: "3 Bathrooms", area: "320m²" },
  { image: imgProp2, name: "Anjuna Cliffside Retreat", location: "18 Anjuna Cliffs, North Goa", price: "₹3.1 Cr", beds: "5 Bedrooms", baths: "2 Bathrooms", area: "380m²", featured: true },
  { image: imgProp3, name: "Panjim Modern Residence", location: "20 Fontainhas, Panjim, Goa", price: "₹2.4 Cr", beds: "3 Bedrooms", baths: "4 Bathrooms", area: "240m²" },
  { image: imgProp4, name: "Assagao Garden Villas", location: "12 Assagao Valley, North Goa", price: "₹3.5 Cr", beds: "6 Bedrooms", baths: "3 Bathrooms", area: "450m²" },
  { image: imgProp5, name: "Vagator View Estate", location: "25 Vagator Blvd, North Goa", price: "₹4.2 Cr", beds: "2 Bedrooms", baths: "1 Bathroom", area: "180m²" },
  { image: imgProp6, name: "Calangute Pearl Villas", location: "18 Calangute Beach Rd, Goa", price: "₹3.8 Cr", beds: "4 Bedrooms", baths: "2 Bathrooms", area: "290m²" },
];

function PropertiesSection() {
  return (
    <section className="bg-white py-[88px] w-full">
      <div className="max-w-[1200px] mx-auto px-6 flex flex-col gap-[64px]">
        <Reveal>
          <div className="flex flex-col gap-[12px] items-center text-center">
            <SectionLabel text="Properties" />
            <p className="font-['Bricolage_Grotesque:Medium',sans-serif] font-medium text-[#172023] leading-[1.2] tracking-[-1.04px] whitespace-nowrap" style={{ ...fv, fontSize: "42px" }}>
              Discover inspiring designed homes.
            </p>
            <p className="font-['Bricolage_Grotesque:Regular',sans-serif] font-normal text-[16px] text-[#172023]/50 leading-[1.4] tracking-[-0.1px] whitespace-nowrap" style={fv}>
              Curated homes where elegance, style, and comfort unite across the pearl of the Orient.
            </p>
          </div>
        </Reveal>
        <div className="flex flex-col gap-[32px]">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[32px]">
            {GOA_PROPERTIES.slice(0, 3).map((p, i) => <PropertyCard key={p.name} {...p} delay={i * 80} />)}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[32px]">
            {GOA_PROPERTIES.slice(3).map((p, i) => <PropertyCard key={p.name} {...p} delay={i * 80} />)}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Featured Property ─────────────────────────────────────────────────────────
function FeaturedPropertySection() {
  return (
    <section className="bg-white py-[88px] w-full">
      <div className="max-w-[1200px] mx-auto px-6">
        <div className="flex gap-[32px] items-center min-h-[645px] flex-wrap lg:flex-nowrap">
          <Reveal className="w-full lg:w-[680px]">
            <div className="relative h-[643px] rounded-[16px] overflow-hidden img-hover-zoom flex-shrink-0">
              <img src={imgFeatured} alt="Siolim Modern Villa" className="absolute inset-0 size-full object-cover" style={{ width: "136%" }} />
              <div className="absolute bottom-[16px] left-1/2 -translate-x-1/2 backdrop-blur-[6px] bg-[rgba(23,32,35,0.5)] flex gap-[4px] items-center px-[12px] py-[8px] rounded-full">
                {[1, 0.6, 0.6, 0.6].map((op, i) => <div key={i} className="size-[8px] rounded-full bg-white" style={{ opacity: op }} />)}
              </div>
            </div>
            <div className="absolute -left-[27px] top-1/2 -translate-y-1/2 flex justify-between w-[733px]">
              <button className="size-[56px] rounded-[40px] flex items-center justify-center" style={{ backgroundColor: BG }}><IconArrowLeft /></button>
              <button className="size-[56px] rounded-[40px] flex items-center justify-center" style={{ backgroundColor: BG }}><IconArrowRight color="white" /></button>
            </div>
          </Reveal>
          <Reveal delay={150} className="flex-1 min-w-[300px]">
            <div className="flex flex-col gap-[32px] w-full pl-0 lg:pl-[40px]">
              <div className="flex flex-col gap-[4px] w-full">
                <div className="flex flex-col gap-[12px]">
                  <SectionLabel text="Featured property" />
                  <p className="font-['Bricolage_Grotesque:Medium',sans-serif] font-medium text-[#172023] leading-[1.2] tracking-[-1.04px] whitespace-nowrap" style={{ ...fv, fontSize: "42px" }}>Siolim Modern Villa</p>
                </div>
                <div className="flex gap-[10px] items-center">
                  <div className="size-[24px] flex items-center justify-center"><IconMap /></div>
                  <span className="font-['Bricolage_Grotesque:Regular',sans-serif] font-normal text-[16px] text-[#172023]/50 leading-[1.4] tracking-[-0.1px] whitespace-nowrap" style={fv}>12 Siolim Village, North Goa</span>
                </div>
              </div>
              <p className="font-['Bricolage_Grotesque:Regular',sans-serif] font-normal text-[16px] text-[#172023]/50 leading-[1.4] tracking-[-0.1px] w-full" style={fv}>
                Experience luxury living at Siolim Modern Villa, perched above the Chapora river. Priced at ₹4,20,00,000, this 560 sq ft smart home offers 4 bedrooms, 3 bathrooms, and breathtaking views of the Goan countryside.
              </p>
              <div className="flex flex-col gap-[32px] w-full">
                {[
                  { iconEl: <svg width="32" height="32" viewBox="0 0 32 32" fill="none" clipPath="url(#fp1)"><path d={svgPaths.p17a4c480} fill={BG} /><path d={svgPaths.p11758db0} fill={BG} /><path d={svgPaths.p3191be60} fill={BG} /><path d={svgPaths.p39080d80} fill={BG} /><defs><clipPath id="fp1"><rect width="32" height="32" fill="white" /></clipPath></defs></svg>, title: "Private Pool & Garden", desc: "One of the few homes in Goa with a private infinity pool overlooking the river." },
                  { iconEl: <svg width="32" height="32" viewBox="0 0 32 32" fill="none" clipPath="url(#fp2)"><path d={svgPaths.p2ea5fa80} fill={BG} /><path d={svgPaths.p4840f80} fill={BG} /><path d={svgPaths.pc667480} fill={BG} /><path d={svgPaths.p20b8cb80} fill={BG} /><path d={svgPaths.p349f9c00} fill={BG} /><path d={svgPaths.p2bb6df80} fill={BG} /><defs><clipPath id="fp2"><rect width="32" height="32" fill="white" /></clipPath></defs></svg>, title: "Smart Home Access", desc: "Easily check yourself in with a modern keypad system and full automation." },
                  { iconEl: <svg width="32" height="32" viewBox="0 0 32 32" fill="none" clipPath="url(#fp3)"><path d={svgPaths.p2b42de80} fill={BG} /><path d={svgPaths.p1cc160c0} fill={BG} /><defs><clipPath id="fp3"><rect width="32" height="32" fill="white" /></clipPath></defs></svg>, title: "Eco-Friendly Design", desc: "Built with sustainable materials, solar panels, and rainwater harvesting." },
                ].map(({ iconEl, title, desc }) => (
                  <div key={title} className="flex gap-[24px] items-start w-full">
                    <div className="shrink-0">{iconEl}</div>
                    <div className="flex flex-col gap-[2px] justify-center">
                      <p className="font-['Bricolage_Grotesque:Medium',sans-serif] font-medium text-[16px] text-[#172023] leading-[1.4] tracking-[-0.1px]" style={fv}>{title}</p>
                      <p className="font-['Bricolage_Grotesque:Regular',sans-serif] font-normal text-[16px] text-[#172023]/50 leading-[1.4] tracking-[-0.1px]" style={fv}>{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-[32px] items-center w-full">
                <button className="flex items-center justify-center px-[26px] py-[14px] rounded-full btn-hover" style={{ backgroundColor: GREEN }}>
                  <span className="font-['Bricolage_Grotesque:SemiBold',sans-serif] font-semibold text-[16px] text-white leading-[1.4] tracking-[-0.1px] whitespace-nowrap" style={fv}>Get in touch</span>
                </button>
                <div>
                  <p className="font-['Bricolage_Grotesque:Medium',sans-serif] font-medium text-[28px] text-[#172023] text-center leading-[1.4] tracking-[-0.1px] whitespace-nowrap" style={fv}>₹4,20,00,000</p>
                  <p className="font-['Bricolage_Grotesque:Regular',sans-serif] font-normal text-[14px] text-[#172023]/50 leading-[1.4] tracking-[-0.1px]" style={fv}>Best price offer</p>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

// ─── Testimonials ──────────────────────────────────────────────────────────────
function TestimonialsSection() {
  return (
    <section className="relative w-full overflow-hidden pt-[112px] pb-[80px]" style={{ backgroundColor: BG }}>
      <div className="absolute right-[-199px] top-[30px] w-[998px] h-[1039px] pointer-events-none">
        <svg className="absolute inset-0 size-full" viewBox="0 0 998 1039" fill="none">
          <path d={svgPaths.p343c0100} stroke={GREEN} strokeOpacity="0.4" strokeWidth="1.5" />
        </svg>
      </div>
      <div className="max-w-[1200px] mx-auto px-6 flex flex-col gap-[36px]">
        <Reveal>
          <div className="flex items-center gap-[16px]">
            <div className="flex flex-col gap-[12px] flex-1">
              <SectionLabel text="Testimonials" dark />
              <p className="font-['Bricolage_Grotesque:Medium',sans-serif] font-medium text-white leading-[1.2] tracking-[-1.04px]" style={{ ...fv, fontSize: "42px" }}>What our clients say</p>
            </div>
            <div className="flex gap-[12px] items-center">
              <button className="size-[56px] rounded-[40px] flex items-center justify-center backdrop-blur-[20px] bg-white/10 btn-hover"><IconArrowLeft /></button>
              <button className="size-[56px] rounded-[40px] flex items-center justify-center backdrop-blur-[20px] bg-white/10 btn-hover"><IconArrowRight color="white" /></button>
            </div>
          </div>
        </Reveal>
        <div className="flex gap-[32px] items-center flex-wrap lg:flex-nowrap">
          <Reveal className="flex-1 min-w-[300px]" delay={100}>
            <div className="flex gap-[32px] items-start pr-0 lg:pr-[88px]">
              <div className="shrink-0"><IconQuote /></div>
              <div className="flex flex-col gap-[32px] items-center justify-center flex-1">
                <p className="font-['Bricolage_Grotesque:Medium',sans-serif] font-medium text-[28px] text-white leading-[1.4] tracking-[-0.1px] w-full" style={fv}>
                  I found my dream villa in Goa in no time! The listings were detailed, the photos were accurate, and the whole process felt seamless. The Ashiyana team was top-notch, answering all my questions. I will definitely use them again!
                </p>
                <div className="flex flex-col gap-[4px] items-start w-full">
                  <p className="font-['Bricolage_Grotesque:Medium',sans-serif] font-medium text-[16px] text-white" style={fv}>Priya & Rahul Sharma</p>
                  <p className="font-['Bricolage_Grotesque:Regular',sans-serif] font-normal text-[16px] text-white/40 whitespace-nowrap" style={fv}>Villa Buyers, North Goa</p>
                </div>
              </div>
            </div>
          </Reveal>
          <Reveal delay={200}>
            <div className="h-[434px] w-[439px] overflow-hidden rounded-[16px] shrink-0 relative img-hover-zoom">
              <img src={imgTestimonial} alt="Happy clients" className="absolute inset-0 size-full object-cover" style={{ height: "102.3%", left: "-38.33%", width: "176.9%" }} />
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

// ─── Blog ──────────────────────────────────────────────────────────────────────
const BLOGS = [
  { img: imgBlog1, title: "Goa property buying guide", date: "Mar 10, 2024", tag: "Guide" },
  { img: imgBlog2, title: "Top 5 locations in North Goa", date: "Mar 15, 2024", tag: "Insights" },
  { img: imgBlog3, title: "Rental yields in Goa 2024", date: "Mar 20, 2024", tag: "Market" },
];

function BlogSection() {
  return (
    <section className="bg-white py-[88px] px-[10px] w-full">
      <div className="max-w-[1200px] mx-auto px-6 flex flex-col gap-[32px]">
        <Reveal>
          <div className="flex items-end justify-between w-full">
            <div className="flex flex-col gap-[12px] flex-1">
              <SectionLabel text="Blog" />
              <p className="font-['Bricolage_Grotesque:Medium',sans-serif] font-medium text-[#172023] leading-[1.2] tracking-[-1.04px]" style={{ ...fv, fontSize: "42px" }}>Real estate insights</p>
              <p className="font-['Bricolage_Grotesque:Regular',sans-serif] font-normal text-[16px] text-[#172023]/50 leading-[1.4] tracking-[-0.1px] w-full" style={fv}>Stay ahead in the Goa property market with expert advice and updates</p>
            </div>
            <button className="flex items-center justify-center h-[56px] px-[32px] rounded-full shrink-0 btn-hover" style={{ backgroundColor: BG }}>
              <span className="font-['Bricolage_Grotesque:SemiBold',sans-serif] font-semibold text-[16px] text-white leading-[1.4] tracking-[-0.1px] whitespace-nowrap" style={fv}>Read all articles</span>
            </button>
          </div>
        </Reveal>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-[32px]">
          {BLOGS.map(({ img, title, date, tag }, i) => (
            <Reveal key={title} delay={i * 100} className="card-lift rounded-[16px] overflow-hidden border border-[#172023]/10 cursor-pointer">
              <div>
                <div className="h-[287px] overflow-hidden img-hover-zoom">
                  <img src={img} alt={title} className="size-full object-cover" />
                </div>
                <div className="p-6 flex gap-[8px] items-start">
                  <div className="flex flex-col gap-[4px] flex-1">
                    <p className="font-['Bricolage_Grotesque:Medium',sans-serif] font-medium text-[20px] text-[#172023] leading-[1.2] tracking-[-0.4px]" style={fv}>{title}</p>
                    <p className="font-['Bricolage_Grotesque:Regular',sans-serif] font-normal text-[16px] text-[#172023]/50 leading-[1.4] tracking-[-0.1px]" style={fv}>{date}</p>
                  </div>
                  <span className="font-['Bricolage_Grotesque:SemiBold',sans-serif] font-semibold text-[14px] text-[#172023] leading-[1.4] tracking-[-0.1px] px-[20px] py-[10px] rounded-full whitespace-nowrap" style={{ ...fv, backgroundColor: "rgba(23,32,35,0.05)" }}>{tag}</span>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── CTA Banner ────────────────────────────────────────────────────────────────
function CTABannerSection() {
  return (
    <section className="bg-white py-[88px] w-full">
      <div className="max-w-[1200px] mx-auto px-6">
        <div className="rounded-[16px] overflow-hidden flex flex-col">
          <div className="relative h-[600px] flex items-center justify-center overflow-hidden">
            <img src={imgCTA} alt="Goa luxury homes" className="absolute inset-0 size-full object-cover" style={{ height: "131.25%", top: "-0.96%" }} />
            <div className="absolute inset-0 bg-black/20" />
            <div className="relative z-10 flex flex-col gap-[32px] items-center text-center px-6">
              <Reveal>
                <div className="font-['Bricolage_Grotesque:Medium',sans-serif] font-medium text-white leading-[1.2] tracking-[-1.04px] text-center" style={{ ...fv, fontSize: "42px" }}>
                  <p className="mb-0">Enter a realm where exquisite design and</p>
                  <p>timeless luxury come together.</p>
                </div>
              </Reveal>
              <Reveal delay={100}>
                <button className="bg-white flex items-center justify-center h-[56px] px-[32px] rounded-full btn-hover">
                  <span className="font-['Bricolage_Grotesque:SemiBold',sans-serif] font-semibold text-[16px] text-[#172023] leading-[1.4] tracking-[-0.1px] whitespace-nowrap" style={fv}>Get in touch</span>
                </button>
              </Reveal>
            </div>
          </div>
          <div className="w-full py-[20px] overflow-hidden" style={{ backgroundColor: GREEN }}>
            <div className="marquee-track">
              {[...Array(2)].map((_, rep) => (
                <div key={rep} className="flex items-center gap-[48px] mr-[48px]">
                  {["Find your dream home in Goa with our expert real estate agents!", "Browse thousands of listings in prime coastal locations!", "Get a free property valuation — sell your Goa home with confidence!", "Secure the best deals with our trusted local experts!"].map((text, i) => (
                    <div key={i} className="flex items-center gap-[48px]">
                      <span className="font-['Bricolage_Grotesque:Medium',sans-serif] font-medium text-[14px] text-white tracking-[0.28px] uppercase whitespace-nowrap leading-[1.4]" style={fv}>{text}</span>
                      <svg width="72" height="1" viewBox="0 0 72 1" fill="none"><line y1="0.5" x2="72" y2="0.5" stroke="white" /></svg>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── FAQs ──────────────────────────────────────────────────────────────────────
const FAQS = [
  "What is the process to buy a property in Goa?",
  "Can foreigners buy property in Goa?",
  "What documents are required for property purchase?",
];

function FAQsSection() {
  return (
    <section className="w-full pt-[112px] pb-[96px]">
      <div className="max-w-[1200px] mx-auto px-6">
        <div className="flex gap-[32px] items-start flex-wrap lg:flex-nowrap">
          <Reveal className="w-full lg:w-[680px] shrink-0">
            <div className="relative h-[644px] overflow-hidden bg-white">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex gap-[32px]">
                  <div className="flex flex-col gap-[32px]">
                    <div className="h-[302px] w-[320px] rounded-[16px] overflow-hidden img-hover-zoom">
                      <img src={imgGal1} alt="Goa property" className="size-full object-cover" />
                    </div>
                    <div className="h-[302px] w-[320px] rounded-[16px] overflow-hidden img-hover-zoom">
                      <img src={imgGal2} alt="Goa property" className="size-full object-cover" />
                    </div>
                  </div>
                  <div className="h-[644px] w-[320px] rounded-[6px] overflow-hidden img-hover-zoom">
                    <img src={imgGal3} alt="Goa property" className="size-full object-cover" />
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
          <Reveal delay={150} className="flex-1 min-w-[300px]">
            <div className="flex flex-col gap-[32px] px-0 lg:px-[48px] w-full">
              <div className="flex flex-col gap-[16px]">
                <SectionLabel text="FAQs" />
                <p className="font-['Bricolage_Grotesque:Medium',sans-serif] font-medium text-[#172023] leading-[1.2] tracking-[-1.04px]" style={{ ...fv, fontSize: "42px" }}>Everything about Ashiyana</p>
                <p className="font-['Bricolage_Grotesque:Regular',sans-serif] font-normal text-[16px] text-[#172023]/50 leading-[1.4] tracking-[-0.1px] max-w-[514px]" style={fv}>
                  We know that buying, selling, or investing in Goa real estate can be overwhelming. Here are some frequently asked questions to help guide you.
                </p>
              </div>
              <div className="flex flex-col gap-[20px] w-full">
                <div className="flex flex-col gap-[24px]">
                  {FAQS.map((q, i) => (
                    <button key={q} className="w-full flex items-center justify-between h-[72px] px-[24px] pr-[32px] rounded-[16px] text-left" style={{ backgroundColor: "rgba(23,32,35,0.05)" }}>
                      <ol className="list-decimal" start={i + 1}>
                        <li className="ms-[30px]">
                          <span className="font-['Bricolage_Grotesque:Medium',sans-serif] font-medium text-[20px] text-[#172023] leading-[1.2] tracking-[-0.4px] whitespace-nowrap" style={fv}>{q}</span>
                        </li>
                      </ol>
                      <IconPlus />
                    </button>
                  ))}
                </div>
                <p className="font-['Bricolage_Grotesque:Regular',sans-serif] font-normal text-[16px] text-[#172023]/50 leading-[1.4] tracking-[-0.1px] pl-[23px]" style={fv}>
                  Discover a diverse range of premium properties, from luxurious beachside villas to spacious heritage homes, tailored to your needs.
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

// ─── Home Page ─────────────────────────────────────────────────────────────────
export default function HomePage() {
  const footerRef = useRef<HTMLDivElement>(null);
  return (
    <div className="bg-white overflow-x-hidden">
      <HeroSection footerRef={footerRef} />
      <ServicesSection />
      <PropertiesSection />
      <FeaturedPropertySection />
      <TestimonialsSection />
      <BlogSection />
      <CTABannerSection />
      <FAQsSection />
      <div ref={footerRef}>
        <SiteFooter />
      </div>
    </div>
  );
}
