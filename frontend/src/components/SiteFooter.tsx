import { BG, GREEN, IconX, IconFacebook, IconInstagram, fv } from "@/lib/shared";

export function SiteFooter() {
  return (
    <footer className="w-full" style={{ backgroundColor: BG }}>
      <div className="max-w-[1400px] mx-auto px-6 pt-[100px] flex flex-col gap-[100px]">
        {/* Newsletter + social */}
        <div className="flex items-end justify-between pb-[56px] border-b border-white/10 flex-wrap gap-[40px]">
          <div className="flex gap-[56px] items-center flex-wrap gap-y-8">
            <p
              className="font-['Bricolage_Grotesque:Medium',sans-serif] font-medium text-[18px] text-white leading-[1.4] tracking-[-0.1px] max-w-[297px]"
              style={fv}
            >
              Stay updated with the latest Goa property news, promotions, and exclusive offers.
            </p>
            <div className="flex gap-[40px] items-center flex-wrap gap-y-4">
              <div className="flex gap-[8px] items-start">
                <div
                  className="flex items-center px-[24px] py-[17px] rounded-full w-[310px]"
                  style={{ backgroundColor: "rgba(255,255,255,0.1)" }}
                >
                  <span
                    className="font-['Bricolage_Grotesque:Regular',sans-serif] font-normal text-[16px] text-white leading-[1.4] tracking-[-0.1px] whitespace-nowrap"
                    style={fv}
                  >
                    Enter your email
                  </span>
                </div>
                <button className="flex items-center justify-center h-[56px] px-[32px] rounded-full bg-white btn-hover">
                  <span
                    className="font-['Bricolage_Grotesque:SemiBold',sans-serif] font-semibold text-[16px] text-[#172023] leading-[1.4] tracking-[-0.1px] whitespace-nowrap"
                    style={fv}
                  >
                    Subscribe
                  </span>
                </button>
              </div>
              <p
                className="font-['Bricolage_Grotesque:Regular',sans-serif] font-normal text-[16px] text-white/40 leading-[1.4] tracking-[-0.1px] max-w-[308px]"
                style={fv}
              >
                By subscribing, you agree to receive our promotional emails. You can unsubscribe at any time.
              </p>
            </div>
          </div>
          <div className="flex gap-[24px] items-center">
            <IconX />
            <IconFacebook />
            <IconInstagram />
          </div>
        </div>

        {/* CTA + nav links */}
        <div className="flex items-start justify-between flex-wrap gap-[40px]">
          <div className="flex flex-col gap-[24px] w-[680px]">
            <div
              className="font-['Bricolage_Grotesque:Medium',sans-serif] font-medium text-white leading-[1.2] tracking-[-1.04px]"
              style={{ ...fv, fontSize: "52px" }}
            >
              <p className="mb-0">Begin your path to</p>
              <p>success — contact us today.</p>
            </div>
            <button
              className="flex items-center justify-center h-[56px] px-[32px] rounded-full self-start btn-hover"
              style={{ backgroundColor: GREEN }}
            >
              <span
                className="font-['Bricolage_Grotesque:SemiBold',sans-serif] font-semibold text-[16px] text-white leading-[1.4] tracking-[-0.1px] whitespace-nowrap"
                style={fv}
              >
                Get in touch
              </span>
            </button>
          </div>
          <div
            className="font-['Bricolage_Grotesque:Regular',sans-serif] font-normal text-[18px] leading-[1.4] tracking-[-0.1px] flex items-start justify-between w-[395px] whitespace-nowrap"
            style={fv}
          >
            <div className="flex flex-col gap-[16px]">
              {["Home", "Categories", "Properties", "Featured property"].map((link, i) => (
                <span key={link} className={i === 2 ? "text-white" : "text-white/40"}>
                  {link}
                </span>
              ))}
            </div>
            <div className="flex flex-col gap-[16px] text-white/40">
              {["Testimonials", "Blog", "FAQs", "Contact"].map((link) => (
                <span key={link}>{link}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Subfooter */}
      <div className="max-w-[1400px] mx-auto px-6">
        <div className="flex items-start justify-between py-[25px] border-t border-white/10">
          <span
            className="font-['Bricolage_Grotesque:Regular',sans-serif] font-normal text-[14px] text-white/40 leading-[1.4] tracking-[-0.1px] whitespace-nowrap"
            style={fv}
          >
            ©2025 Ashiyana Buy Sell Rent
          </span>
          <div className="flex gap-[32px] items-center">
            {["Terms of service", "Privacy policy"].map((t) => (
              <span
                key={t}
                className="font-['Bricolage_Grotesque:Regular',sans-serif] font-normal text-[14px] text-white leading-[1.4] tracking-[-0.1px] whitespace-nowrap cursor-pointer"
                style={fv}
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
