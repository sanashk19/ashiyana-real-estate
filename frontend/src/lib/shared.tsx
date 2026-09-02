import { useEffect, useRef, type ReactNode } from "react";
import svgPaths from "@/imports/RealEstate/svg-9nqs7nb86p";

export const BG = "#172124";
export const GREEN = "#17805B";
export const GOLD = "#C4A66A";
export const fv = {} as const;
export const fontDisplay = "font-display";
export const fontSans = "font-sans";

// ─── Scroll Reveal ─────────────────────────────────────────────────────────────
export function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) el.classList.add("visible"); },
      { threshold: 0.08 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return ref;
}

export function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useReveal();
  return (
    <div ref={ref} className={`reveal ${className}`} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}

// ─── Icons ─────────────────────────────────────────────────────────────────────
export function IconStar() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d={svgPaths.p1730dc80} fill={GREEN} />
    </svg>
  );
}
export function IconPhone() {
  return (
    <svg width="18.75" height="18.75" viewBox="0 0 18.7499 18.7498" fill="none">
      <path d={svgPaths.p3d010300} fill="white" />
    </svg>
  );
}
export function IconPhoneDark() {
  return (
    <svg width="18.75" height="18.75" viewBox="0 0 18.7499 18.7498" fill="none">
      <path d={svgPaths.p3d010300} fill={BG} />
    </svg>
  );
}
export function IconArrowRight({ color = BG }: { color?: string }) {
  return (
    <svg width="18" height="15" viewBox="0 0 18.0006 15.0008" fill="none">
      <path d={svgPaths.p269480} fill={color} />
    </svg>
  );
}
export function IconArrowLeft({ color = "white" }: { color?: string }) {
  return (
    <svg width="18" height="15" viewBox="0 0 18.0006 15.0008" fill="none">
      <path d={svgPaths.p33185f40} fill={color} />
    </svg>
  );
}
export function IconMenu({ color = BG }: { color?: string }) {
  return (
    <svg width="18" height="13.5" viewBox="0 0 18 13.5" fill="none">
      <path d={svgPaths.p186000} fill={color} />
    </svg>
  );
}
export function IconBed({ color = BG }: { color?: string }) {
  return (
    <svg width="20" height="15.24" viewBox="0 0 20 15.2443" fill="none">
      <path d={svgPaths.p2594c870} fill={color} />
    </svg>
  );
}
export function IconBath({ color = BG }: { color?: string }) {
  return (
    <svg width="20" height="19.88" viewBox="0 0 20 19.8842" fill="none">
      <path d={svgPaths.p17ef920} fill={color} />
    </svg>
  );
}
export function IconArea({ color = BG }: { color?: string }) {
  return (
    <svg width="17.5" height="17.5" viewBox="0 0 17.501 17.501" fill="none">
      <path d={svgPaths.p252cb0f2} fill={color} />
    </svg>
  );
}
export function IconMap({ color = BG, opacity = "0.5" }: { color?: string; opacity?: string }) {
  return (
    <svg width="16.5" height="21" viewBox="0 0 16.5 20.9998" fill="none">
      <path d={svgPaths.p34ccd800} fill={color} fillOpacity={opacity} />
    </svg>
  );
}
export function IconQuote() {
  return (
    <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
      <path d={svgPaths.p291a6980} stroke={GREEN} strokeWidth="1.5" />
    </svg>
  );
}
export function IconPlus() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d={svgPaths.p23254870} fill={BG} />
    </svg>
  );
}
export function IconBedroom() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
      <path d={svgPaths.pa770c80} fill={BG} />
    </svg>
  );
}
export function IconBathroom() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
      <path d={svgPaths.p3ea6ad00} fill={BG} />
    </svg>
  );
}
export function IconParking() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
      <path d={svgPaths.p37eb0800} fill={BG} />
      <path d={svgPaths.p3304ec00} fill={BG} />
      <path d={svgPaths.pbc23700} fill={BG} />
    </svg>
  );
}
export function IconX() {
  return (
    <svg width="18" height="16.25" viewBox="0 0 17.9766 16.25" fill="none">
      <path d={svgPaths.pd424a80} fill="white" />
    </svg>
  );
}
export function IconFacebook() {
  return (
    <svg width="20" height="19.93" viewBox="0 0 20 19.9258" fill="none">
      <path d={svgPaths.p389c6a00} fill="white" />
    </svg>
  );
}
export function IconInstagram() {
  return (
    <svg width="20" height="20" viewBox="0 0 20.0112 20.0067" fill="none">
      <path d={svgPaths.p32402500} fill="white" />
    </svg>
  );
}
export function IconOlx({ size = 20, color = "white" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className="inline-block shrink-0">
      <circle cx="5" cy="12" r="3.5" stroke={color} strokeWidth="2.2" />
      <path d="M11.5 5v14" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
      <path d="M15.5 8.5l5 7M20.5 8.5l-5 7" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}
export function IconSearch({ color = BG }: { color?: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  );
}
export function IconChevronDown({ color = BG }: { color?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

export function IconBuilding({ color = BG }: { color?: string }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 21h18" />
      <path d="M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16" />
      <path d="M9 9h1" />
      <path d="M9 13h1" />
      <path d="M9 17h1" />
      <path d="M14 9h1" />
      <path d="M14 13h1" />
      <path d="M14 17h1" />
    </svg>
  );
}

export function IconLocationPin({ color = BG }: { color?: string }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

export function IconHappyClients({ color = BG }: { color?: string }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

export function IconBrokerSupport({ color = BG }: { color?: string }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

// ─── Section Label ──────────────────────────────────────────────────────────────
export function SectionLabel({ text, dark = false }: { text: string; dark?: boolean }) {
  return (
    <div className="flex gap-[10px] items-center">
      <IconStar />
      <span
        className="font-sans font-semibold text-[15px] sm:text-[16px] leading-[1.4] tracking-[-0.1px]"
        style={{ color: dark ? "white" : "#3e545d" }}
      >
        {text}
      </span>
    </div>
  );
}

// ─── Ashiyana Logo ─────────────────────────────────────────────────────────────
export function AshiyanaLogo({
  dark = false,
  className = "h-[52px] sm:h-[64px]",
}: {
  dark?: boolean;
  className?: string;
}) {
  return (
    <div className={`flex items-center justify-center shrink-0 overflow-visible ${className}`}>
      <img
        src={dark ? "/ashiyana-logo-transparent.png" : "/ashiyana-logo-white.png"}
        alt="Ashiyana Real Estate Goa"
        className="h-full w-auto max-h-full object-contain scale-120 transition-transform duration-200 hover:scale-125 select-none block"
      />
    </div>
  );
}

