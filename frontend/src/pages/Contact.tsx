import { useState } from "react";
import { useSearchParams } from "react-router";
import imgVilla from "@/imports/RealEstate/fecad97c8707393865ca59d3678ab3a6d9ea8cae.png";
import { SiteNavbar } from "@/components/SiteNavbar";
import { SiteFooter } from "@/components/SiteFooter";
import { BackButton } from "@/components/BackButton";
import { submitEnquiry } from "@/lib/api";
import { useBusinessProfile } from "@/context/BusinessProfileContext";
import { getApiErrorMessage } from "@/lib/errorUtils";
import {
  Phone,
  Mail,
  MapPin,
  MessageSquare,
  Calendar,
  PhoneCall,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Send,
} from "lucide-react";

// ─── Contact Info Card ────────────────────────────────────────────────────────
function ContactInfoCard() {
  const { profile } = useBusinessProfile();
  const phoneTel = `tel:${(profile.phone || "+91 832 246 7890").replace(/\s+/g, "")}`;
  const whatsappUrl = `https://wa.me/${(profile.whatsapp_number || "+919511854490").replace(/\D/g, "")}?text=${encodeURIComponent(
    "Hi Kassim, I am contacting you from the Ashiyana Real Estate website."
  )}`;

  return (
    <div className="relative h-full min-h-[500px] rounded-[24px] overflow-hidden flex flex-col justify-between p-8 sm:p-9 text-white font-sans bg-[#172124] shadow-xs">
      {/* Background image */}
      <img
        src={imgVilla}
        alt="Luxury Goa Villa"
        className="absolute inset-0 size-full object-cover opacity-25 pointer-events-none"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-[#172124] via-[#172124]/80 to-[#172124]/90 pointer-events-none" />

      <div className="relative z-10 flex flex-col gap-4">
        <span className="text-[11px] font-mono font-semibold uppercase tracking-[0.2em] text-[#C9AD86] block">
          [ Direct Broker Desk ]
        </span>
        <h3 className="font-display font-bold text-[28px] sm:text-[34px] text-white leading-tight tracking-tight">
          Let's discuss your property in Goa.
        </h3>
        <p className="text-[14px] text-[#A6B0B3] leading-relaxed">
          Whether you're acquiring a luxury villa, selling an estate, or seeking verified NRI investment guidance, we're here to assist.
        </p>
      </div>

      <div className="relative z-10 flex flex-col gap-5 pt-6 border-t border-white/10">
        <a
          href={phoneTel}
          className="flex items-center gap-3.5 text-white/90 hover:text-white transition-colors group"
        >
          <div className="size-10 rounded-full bg-white/10 flex items-center justify-center text-[#C9AD86] shrink-0 group-hover:bg-white/20 transition-colors">
            <Phone className="size-4.5" />
          </div>
          <div>
            <span className="text-[11.5px] text-[#A6B0B3] block">Phone Consultation</span>
            <span className="text-[14px] font-semibold">{profile.phone || "+91 832 246 7890"}</span>
          </div>
        </a>

        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3.5 text-white/90 hover:text-white transition-colors group"
        >
          <div className="size-10 rounded-full bg-white/10 flex items-center justify-center text-emerald-400 shrink-0 group-hover:bg-white/20 transition-colors">
            <MessageSquare className="size-4.5" />
          </div>
          <div>
            <span className="text-[11.5px] text-[#A6B0B3] block">Instant WhatsApp</span>
            <span className="text-[14px] font-semibold">{profile.whatsapp_number || "+91 95118 54490"}</span>
          </div>
        </a>

        <a
          href={`mailto:${profile.email || "ashiyanarentbuysell@gmail.com"}`}
          className="flex items-center gap-3.5 text-white/90 hover:text-white transition-colors group"
        >
          <div className="size-10 rounded-full bg-white/10 flex items-center justify-center text-[#C9AD86] shrink-0 group-hover:bg-white/20 transition-colors">
            <Mail className="size-4.5" />
          </div>
          <div>
            <span className="text-[11.5px] text-[#A6B0B3] block">Email Advisory</span>
            <span className="text-[14px] font-semibold">{profile.email || "ashiyanarentbuysell@gmail.com"}</span>
          </div>
        </a>

        <div className="flex items-center gap-3.5 text-white/90">
          <div className="size-10 rounded-full bg-white/10 flex items-center justify-center text-[#A6B0B3] shrink-0">
            <MapPin className="size-4.5" />
          </div>
          <div>
            <span className="text-[11.5px] text-[#A6B0B3] block">Office Location</span>
            <span className="text-[14px] font-medium">{profile.office_address || "Calangute & Panaji, Goa, India"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Contact Form ─────────────────────────────────────────────────────────────
function ContactForm() {
  const { profile } = useBusinessProfile();
  const [searchParams] = useSearchParams();
  const defaultSubject = searchParams.get("subject") || "Buying a Property";

  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    subject: defaultSubject,
    message: "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [confirmedEnquiry, setConfirmedEnquiry] = useState<any | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    const digits = form.phone.replace(/\D/g, "");
    if (digits.length < 7 || digits.length > 15) {
      setSubmitError("Please enter a valid phone number (7-15 digits).");
      return;
    }

    setSubmitting(true);

    try {
      await submitEnquiry({
        visitor_name: form.name.trim(),
        visitor_phone: form.phone.trim(),
        visitor_email: form.email.trim() || undefined,
        message: `[Subject: ${form.subject}] ${form.message.trim()}`,
      });

      setConfirmedEnquiry({ ...form });
      setForm({ name: "", phone: "", email: "", subject: defaultSubject, message: "" });
    } catch (err: any) {
      setSubmitError(
        getApiErrorMessage(err, "Failed to submit enquiry. Please try reaching out via WhatsApp or calling directly.")
      );
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass =
    "w-full px-4 py-3 rounded-[12px] border border-[#EDE8E0] bg-[#FAF7F2] text-[13.5px] text-[#172124] placeholder:text-[#9A948B] focus:border-[#172124] focus:bg-white outline-none transition-all font-sans";

  return (
    <div className="bg-white rounded-[24px] p-7 sm:p-10 border border-[#EDE8E0] shadow-xs flex flex-col gap-6 font-sans">
      <div>
        <h2 className="font-display font-bold text-[26px] sm:text-[32px] text-[#172124] leading-tight tracking-tight">
          Send a Message
        </h2>
        <p className="text-[14px] text-[#717A7D] mt-1.5 leading-relaxed">
          Fill in the details below and our lead broker will respond directly.
        </p>
      </div>

      {submitError && (
        <div className="p-4 rounded-[14px] bg-red-50 text-red-700 text-[13px] border border-red-200 flex items-start gap-2">
          <AlertCircle className="size-4 text-red-600 shrink-0 mt-0.5" />
          <span>{submitError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11.5px] font-semibold text-[#8B7D68] uppercase tracking-wider">
              Full Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Priya Sharma"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className={inputClass}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11.5px] font-semibold text-[#8B7D68] uppercase tracking-wider">
              Phone Number (WhatsApp) *
            </label>
            <input
              type="tel"
              required
              placeholder="e.g. +91 98765 43210"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className={inputClass}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11.5px] font-semibold text-[#8B7D68] uppercase tracking-wider">
              Email Address (Optional)
            </label>
            <input
              type="email"
              placeholder="e.g. priya@example.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className={inputClass}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11.5px] font-semibold text-[#8B7D68] uppercase tracking-wider">
              Subject
            </label>
            <select
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
              className={inputClass}
            >
              <option>Buying a Property</option>
              <option>Renting a Property</option>
              <option>Selling my Property</option>
              <option>Investment Advice</option>
              <option>NRI Property Purchase</option>
              <option>Schedule a Site Visit</option>
              <option>General Enquiry</option>
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[11.5px] font-semibold text-[#8B7D68] uppercase tracking-wider">
            Message *
          </label>
          <textarea
            required
            rows={4}
            placeholder="Tell us about the property you're looking for, preferred Goa locality, budget, and requirements..."
            value={form.message}
            onChange={(e) => setForm({ ...form, message: e.target.value })}
            className={`${inputClass} resize-none`}
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full mt-2 py-3.5 rounded-full bg-[#172124] text-white font-semibold text-[14px] hover:bg-[#2C383C] transition-colors disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow-xs"
        >
          <Send className="size-4" />
          <span>{submitting ? "Sending Message..." : "Send Message"}</span>
        </button>
      </form>

      {/* Confirmation Modal */}
      {confirmedEnquiry && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-[24px] max-w-[460px] w-full p-8 flex flex-col items-center text-center gap-5 shadow-2xl border border-[#EDE8E0]">
            <div className="size-16 rounded-full bg-emerald-100 text-[#17805B] flex items-center justify-center">
              <CheckCircle2 className="size-8" />
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-[11px] font-mono font-semibold uppercase tracking-[0.2em] text-[#8B7D68]">
                [ Enquiry Confirmed ]
              </span>
              <h3 className="font-display font-bold text-[22px] text-[#172124] tracking-tight">
                Thank You, {confirmedEnquiry.name}!
              </h3>
              <p className="text-[14px] text-[#717A7D] leading-relaxed">
                Your message has been delivered to <strong>{profile.broker_name || "Kassim Shaikh"}</strong>. We will reach out to you directly on <strong>{confirmedEnquiry.phone}</strong>.
              </p>
            </div>

            <button
              onClick={() => setConfirmedEnquiry(null)}
              className="w-full py-3 rounded-full bg-[#172124] text-white font-semibold text-[13.5px] hover:bg-[#2C383C] transition-colors cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Contact Page Main ────────────────────────────────────────────────────────
export default function ContactPage() {
  const { profile } = useBusinessProfile();
  const phoneClean = (profile.whatsapp_number || "+919511854490").replace(/\D/g, "");
  const waUrl = `https://wa.me/${phoneClean}?text=${encodeURIComponent(
    "Hello Ashiyana Real Estate, I would like to enquire about properties in Goa."
  )}`;
  const telUrl = `tel:${(profile.phone || "+918322467890").replace(/\s+/g, "")}`;

  return (
    <div className="bg-white min-h-screen flex flex-col font-sans text-[#172124]">
      <SiteNavbar variant="page" />

      <main className="flex-1 w-full max-w-[1400px] mx-auto px-6 sm:px-12 lg:px-16 py-10 sm:py-16 flex flex-col gap-12">
        <div className="self-start">
          <BackButton label="Back to Home" fallback="/" />
        </div>

        {/* Header */}
        <div className="flex flex-col gap-2">
          <span className="text-[11.5px] font-mono font-semibold uppercase tracking-[0.2em] text-[#8B7D68] block">
            [ Get In Touch ]
          </span>
          <h1 className="font-display font-bold text-[34px] sm:text-[48px] text-[#172124] leading-tight tracking-tight">
            Contact Ashiyana Real Estate
          </h1>
          <p className="text-[15px] text-[#717A7D] max-w-[580px] leading-relaxed">
            Reach out to our Goa advisory desk for property inquiries, physical site inspections, or selling consultations.
          </p>
        </div>

        {/* 2-Column Contact Info + Form */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          <div className="lg:col-span-5">
            <ContactInfoCard />
          </div>
          <div className="lg:col-span-7">
            <ContactForm />
          </div>
        </div>

        {/* Feature Action Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-4">
          <div className="bg-[#FAF7F2] rounded-[22px] p-7 border border-[#EDE8E0] shadow-xs flex flex-col gap-3.5">
            <div className="size-11 rounded-full bg-white text-[#8B7D68] border border-[#EDE8E0] flex items-center justify-center shadow-2xs">
              <Calendar className="size-5" />
            </div>
            <h4 className="font-display font-bold text-[18px] text-[#172124] tracking-tight">
              Schedule Property Visit
            </h4>
            <p className="text-[13.5px] text-[#717A7D] leading-relaxed flex-1">
              Book a physical site inspection with our senior broker at your preferred time.
            </p>
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[13px] font-semibold text-[#8B7D68] hover:text-[#172124] flex items-center gap-1.5 mt-2 transition-colors"
            >
              <span>Book Walkthrough</span>
              <ArrowRight className="size-3.5" />
            </a>
          </div>

          <div className="bg-[#FAF7F2] rounded-[22px] p-7 border border-[#EDE8E0] shadow-xs flex flex-col gap-3.5">
            <div className="size-11 rounded-full bg-white text-[#8B7D68] border border-[#EDE8E0] flex items-center justify-center shadow-2xs">
              <PhoneCall className="size-5" />
            </div>
            <h4 className="font-display font-bold text-[18px] text-[#172124] tracking-tight">
              Request a Callback
            </h4>
            <p className="text-[13.5px] text-[#717A7D] leading-relaxed flex-1">
              Leave your details on the form and we'll call you back with verified property dossiers.
            </p>
            <a
              href={telUrl}
              className="text-[13px] font-semibold text-[#8B7D68] hover:text-[#172124] flex items-center gap-1.5 mt-2 transition-colors"
            >
              <span>Call Now</span>
              <ArrowRight className="size-3.5" />
            </a>
          </div>

          <div className="bg-[#FAF7F2] rounded-[22px] p-7 border border-[#EDE8E0] shadow-xs flex flex-col gap-3.5">
            <div className="size-11 rounded-full bg-white text-[#8B7D68] border border-[#EDE8E0] flex items-center justify-center shadow-2xs">
              <MessageSquare className="size-5" />
            </div>
            <h4 className="font-display font-bold text-[18px] text-[#172124] tracking-tight">
              WhatsApp Advisory
            </h4>
            <p className="text-[13.5px] text-[#717A7D] leading-relaxed flex-1">
              Chat directly with our lead broker for instant pricing and off-market Goa opportunities.
            </p>
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[13px] font-semibold text-[#8B7D68] hover:text-[#172124] flex items-center gap-1.5 mt-2 transition-colors"
            >
              <span>Start WhatsApp Chat</span>
              <ArrowRight className="size-3.5" />
            </a>
          </div>
        </div>

      </main>

      <SiteFooter />
    </div>
  );
}
