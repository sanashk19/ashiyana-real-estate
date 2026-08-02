import { Link } from "react-router";
import { AshiyanaLogo, BG, IconMenu, IconPhone, IconPhoneDark, fv } from "@/lib/shared";

type NavbarProps = {
  /** "hero" = white text on transparent (homepage hero) | "page" = dark text on white */
  variant?: "hero" | "page";
};

export function SiteNavbar({ variant = "page" }: NavbarProps) {
  const isHero = variant === "hero";

  return (
    <nav
      className={`w-full flex items-center justify-center relative z-10 ${
        isHero ? "py-[40px]" : "py-[20px] border-b border-[#172023]/10 bg-white"
      }`}
    >
      <div className="w-full max-w-[1400px] px-6 flex items-center justify-between">
        <Link to="/">
          <AshiyanaLogo dark={!isHero} />
        </Link>
        <div className="flex gap-[24px] items-center">
          <Link
            to="/properties"
            className="font-['Bricolage_Grotesque:SemiBold',sans-serif] font-semibold text-[15px] leading-[1.4] tracking-[-0.1px] hidden md:block transition-opacity hover:opacity-70"
            style={{ ...fv, color: isHero ? "white" : BG }}
          >
            Properties
          </Link>
          <div className="flex gap-[8px] items-center">
            <div className="size-[24px] flex items-center justify-center">
              {isHero ? <IconPhone /> : <IconPhoneDark />}
            </div>
            <span
              className="font-['Bricolage_Grotesque:SemiBold',sans-serif] font-semibold text-[16px] leading-[1.4] tracking-[-0.1px] whitespace-nowrap"
              style={{ ...fv, color: isHero ? "white" : BG }}
            >
              +91 832 246 7890
            </span>
          </div>
          <div
            className="h-[20px] w-px"
            style={{ backgroundColor: isHero ? "rgba(255,255,255,0.4)" : "rgba(23,32,35,0.15)" }}
          />
          <button
            className="flex gap-[12px] items-center justify-center h-[48px] px-[20px] rounded-full btn-hover"
            style={{ backgroundColor: isHero ? "white" : BG }}
          >
            <IconMenu color={isHero ? BG : "white"} />
            <span
              className="font-['Bricolage_Grotesque:SemiBold',sans-serif] font-semibold text-[16px] leading-[1.4] tracking-[-0.1px] whitespace-nowrap"
              style={{ ...fv, color: isHero ? BG : "white" }}
            >
              Menu
            </span>
          </button>
        </div>
      </div>
    </nav>
  );
}
