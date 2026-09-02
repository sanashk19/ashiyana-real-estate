import React, { useState } from "react";
import { Link } from "react-router";
import { AshiyanaLogo } from "@/lib/shared";
import { useBusinessProfile } from "@/context/BusinessProfileContext";
import { CheckCircle2, Phone, Mail, MapPin } from "lucide-react";

export function SiteFooter() {
  const { profile } = useBusinessProfile();
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail.trim()) return;
    setSubscribed(true);
    setNewsletterEmail("");
    setTimeout(() => setSubscribed(false), 5000);
  };

  const phoneTel = `tel:${(profile?.phone || "+91 832 246 7890").replace(/\s+/g, "")}`;

  return (
    <footer className="w-full bg-[#172124] text-white pt-16 pb-12 font-sans border-t border-white/5">
      <div className="max-w-[1400px] mx-auto px-6 sm:px-8 lg:px-12 flex flex-col gap-12 sm:gap-16">
        
        {/* Top Header Block: Architectural Statement + Contact Summary */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 pb-12 border-b border-white/10">
          <div className="max-w-[640px] flex flex-col gap-3">
            <span className="text-[11.5px] font-bold uppercase tracking-wider text-[#C4A66A]">
              Ashiyana Real Estate · Goa
            </span>
            <h2 className="font-display font-medium text-[32px] sm:text-[42px] lg:text-[48px] text-white leading-[1.12] tracking-tight">
              Discover Goa's Architectural Wonders with Expert Guidance.
            </h2>
          </div>

          <div className="flex flex-col gap-2.5 text-[13.5px] text-[#A6B0B3] lg:text-right">
            <div className="flex items-center lg:justify-end gap-2 text-white">
              <MapPin className="size-4 text-[#C4A66A] shrink-0" />
              <span>{profile?.office_address || "Calangute & Panaji, Goa, India"}</span>
            </div>
            <div className="flex items-center lg:justify-end gap-2">
              <Phone className="size-4 text-[#17805B] shrink-0" />
              <a href={phoneTel} className="hover:text-white transition-colors">
                {profile?.phone || "+91 832 246 7890"}
              </a>
            </div>
            <div className="flex items-center lg:justify-end gap-2">
              <Mail className="size-4 text-[#A6B0B3] shrink-0" />
              <a href={`mailto:${profile?.email || "ashiyanarentbuysell@gmail.com"}`} className="hover:text-white transition-colors">
                {profile?.email || "ashiyanarentbuysell@gmail.com"}
              </a>
            </div>
          </div>
        </div>

        {/* Middle Navigation & Newsletter Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 lg:gap-12">
          {/* Brand & Intro */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            <AshiyanaLogo dark={false} className="h-[44px] object-contain w-fit" />
            <p className="text-[13.5px] text-[#A6B0B3] leading-relaxed max-w-[340px]">
              Goa's dedicated luxury property advisory. Assisting discerning buyers, NRI investors, and property owners with title-verified villas, apartments, and coastal estates.
            </p>
          </div>

          {/* Quick Navigation: EXACT 5 PRIMARY SECTIONS */}
          <div className="lg:col-span-2 flex flex-col gap-3">
            <h4 className="font-semibold text-[14px] text-white">Navigation</h4>
            <div className="flex flex-col gap-2 text-[13.5px] text-[#A6B0B3]">
              <Link to="/" className="hover:text-white transition-colors">Home</Link>
              <Link to="/properties" className="hover:text-white transition-colors">Properties</Link>
              <Link to="/services" className="hover:text-white transition-colors">Services</Link>
              <Link to="/sell" className="hover:text-white transition-colors">Sell Property</Link>
              <Link to="/contact" className="hover:text-white transition-colors">Contact</Link>
            </div>
          </div>

          {/* Core Services */}
          <div className="lg:col-span-2 flex flex-col gap-3">
            <h4 className="font-semibold text-[14px] text-white">Our Services</h4>
            <div className="flex flex-col gap-2 text-[13.5px] text-[#A6B0B3]">
              <Link to="/properties?purpose=sale" className="hover:text-white transition-colors">Buy a Property</Link>
              <Link to="/sell" className="hover:text-white transition-colors">Sell Your Property</Link>
              <Link to="/properties?purpose=rent" className="hover:text-white transition-colors">Rent a Property</Link>
              <Link to="/sell" className="hover:text-white transition-colors">Property Valuation</Link>
              <Link to="/services" className="hover:text-white transition-colors">Advisory & Legal</Link>
            </div>
          </div>

          {/* Newsletter / Insights Subscription */}
          <div className="lg:col-span-4 flex flex-col gap-3">
            <h4 className="font-semibold text-[14px] text-white">Goa Real Estate Insights</h4>
            <p className="text-[13px] text-[#A6B0B3]">
              Receive private off-market listings and Goa luxury real estate market updates.
            </p>
            {subscribed ? (
              <div className="p-3 rounded-[12px] bg-white/10 text-white text-[13px] flex items-center gap-2 border border-white/20">
                <CheckCircle2 className="size-4 text-[#17805B]" />
                <span>Thank you for subscribing!</span>
              </div>
            ) : (
              <form onSubmit={handleSubscribe} className="flex items-center gap-2">
                <input
                  type="email"
                  required
                  placeholder="Enter your email"
                  value={newsletterEmail}
                  onChange={(e) => setNewsletterEmail(e.target.value)}
                  className="flex-1 px-4 py-2.5 rounded-full bg-white/10 border border-white/15 text-white text-[13px] placeholder:text-white/40 focus:outline-none focus:border-white/40"
                />
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-full bg-white text-[#172124] font-semibold text-[13px] hover:bg-gray-100 transition-colors shrink-0 cursor-pointer"
                >
                  Subscribe
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Bottom Copyright and Dynamic Social Links */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8 border-t border-white/10 text-[12.5px] text-[#A6B0B3]">
          <p>© {new Date().getFullYear()} Ashiyana Real Estate. All rights reserved.</p>

          {/* Social links ONLY if configured in database */}
          <div className="flex items-center gap-4">
            {profile?.instagram_url && (
              <a
                href={profile.instagram_url}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white transition-colors"
              >
                Instagram
              </a>
            )}
            {profile?.facebook_url && (
              <a
                href={profile.facebook_url}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white transition-colors"
              >
                Facebook
              </a>
            )}
            {profile?.olx_url && (
              <a
                href={profile.olx_url}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white transition-colors"
              >
                OLX Store
              </a>
            )}
            <Link to="/contact" className="hover:text-white transition-colors">
              Privacy & Legal
            </Link>
          </div>
        </div>

      </div>
    </footer>
  );
}
