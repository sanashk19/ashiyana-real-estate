import { Link } from "react-router";
import { SiteNavbar } from "@/components/SiteNavbar";
import { SiteFooter } from "@/components/SiteFooter";
import { ArrowRight } from "lucide-react";

export default function NotFoundPage() {
  return (
    <div className="bg-[#FBFBFA] min-h-screen flex flex-col font-sans text-[#172124]">
      <SiteNavbar variant="page" />

      <main className="flex-1 flex flex-col items-center justify-center px-6 py-20 sm:py-32 text-center">
        <div className="max-w-[600px] flex flex-col items-center gap-6">
          <span className="px-3.5 py-1 rounded-full text-[12px] font-bold uppercase tracking-wider bg-[#F7F7F4] text-[#17805B] border border-[#E5E7E6]">
            404 — Page Not Found
          </span>

          <div className="font-display font-extrabold text-[90px] sm:text-[120px] leading-none tracking-tight text-[#172124]">
            4<span className="text-[#C4A66A]">0</span>4
          </div>

          <div className="flex flex-col gap-2">
            <h1 className="font-display font-medium text-[26px] sm:text-[32px] text-[#172124] leading-tight">
              Looks like this property isn't on the map
            </h1>
            <p className="text-[14.5px] text-[#717A7D] leading-relaxed max-w-[460px]">
              The page or listing you are looking for may have been moved, renamed, or is no longer available in our inventory.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
            <Link
              to="/"
              className="px-6 py-3 rounded-full border border-[#E5E7E6] bg-white hover:bg-gray-50 font-semibold text-[13.5px] text-[#172124] transition-colors"
            >
              Back to Home
            </Link>
            <Link
              to="/properties"
              className="px-6 py-3 rounded-full bg-[#172124] text-white font-semibold text-[13.5px] hover:bg-[#243236] transition-colors flex items-center gap-2 shadow-xs"
            >
              <span>Browse Properties</span>
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
