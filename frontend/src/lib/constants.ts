/**
 * Centralized Business Contact and Social Links Configuration
 * Single source of truth for Ashiyana Real Estate business contact details.
 */

export const BUSINESS_CONTACT = {
  name: "Kassim Shaikh",
  title: "Senior Property Consultant",
  role: "Lead Broker & Founder",
  company: "Ashiyana Real Estate",
  phone: "+91 8888083558",
  phoneDisplay: "+91 88880 83558",
  phoneRaw: "918888083558",
  phoneTel: "tel:+918888083558",
  email: "ashiyanarentbuysell@gmail.com",
  whatsappUrl: "https://wa.me/918888083558",
  address: "Goa, India",

  // ─── WhatsApp Link Builders ────────────────────────────────────────────────
  getWhatsAppUrl: (message?: string) => {
    if (!message) return "https://wa.me/918888083558";
    return `https://wa.me/918888083558?text=${encodeURIComponent(message)}`;
  },

  getPropertyEnquiryWhatsAppUrl: (propertyTitle: string, locality?: string) => {
    const loc = locality ? ` in ${locality}` : "";
    return `https://wa.me/918888083558?text=${encodeURIComponent(
      `Hi Kassim, I'm interested in "${propertyTitle}"${loc}. Could you please share more details?`
    )}`;
  },

  getGeneralEnquiryWhatsAppUrl: () => {
    return `https://wa.me/918888083558?text=${encodeURIComponent(
      "Hi Kassim! I am interested in properties listed on Ashiyana. Could you please share more details?"
    )}`;
  },

  getSellerSubmissionWhatsAppUrl: (locality: string, refId?: string) => {
    const ref = refId ? ` (Ref: ${refId})` : "";
    return `https://wa.me/918888083558?text=${encodeURIComponent(
      `Hi Kassim, I just submitted my property in ${locality} on Ashiyana${ref}. I would like to connect.`
    )}`;
  },

  getLeadForwardWhatsAppUrl: (customerName: string, propertyTitle: string) => {
    return `https://wa.me/918888083558?text=${encodeURIComponent(
      `Hi Kassim, you have received an enquiry from ${customerName} regarding "${propertyTitle}".`
    )}`;
  },
} as const;

export const SOCIAL_LINKS = {
  facebook: {
    name: "Facebook",
    // NOTE: Placeholder — replace with actual Facebook URL when provided
    url: "https://facebook.com/ashiyanagoa",
    ariaLabel: "Visit Ashiyana on Facebook",
  },
  instagram: {
    name: "Instagram",
    // NOTE: Placeholder — replace with actual Instagram URL when provided
    url: "https://instagram.com/ashiyanagoa",
    ariaLabel: "Visit Ashiyana on Instagram",
  },
  olx: {
    name: "OLX",
    // NOTE: Placeholder — replace with actual OLX profile/seller URL when provided
    url: "https://www.olx.in/profile/ashiyanagoa",
    ariaLabel: "Visit Ashiyana on OLX",
  },
} as const;
