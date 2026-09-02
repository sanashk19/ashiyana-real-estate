import React, { useState, useEffect } from "react";
import { Link } from "react-router";
import {
  type PropertyType,
  type ListingType,
  submitValuationRequest,
  uploadSellerPhotos,
  getSellerAuthToken,
  fetchCurrentUserProfile,
} from "@/lib/api";
import { SiteNavbar } from "@/components/SiteNavbar";
import { SiteFooter } from "@/components/SiteFooter";
import { BackButton } from "@/components/BackButton";
import { getApiErrorMessage } from "@/lib/errorUtils";
import {
  X,
  CheckCircle2,
  ArrowRight,
  Camera,
} from "lucide-react";

export default function SellPropertyPage() {
  const [sellerName, setSellerName] = useState("");
  const [sellerPhone, setSellerPhone] = useState("");
  const [sellerEmail, setSellerEmail] = useState("");
  const [propertyType, setPropertyType] = useState<PropertyType>("villa");
  const [listingType, setListingType] = useState<ListingType>("sale");
  const [locality, setLocality] = useState("");
  const [areaSqft, setAreaSqft] = useState<string>("");
  const [bedrooms, setBedrooms] = useState<string>("");
  const [askingPrice, setAskingPrice] = useState<string>("");
  const [description, setDescription] = useState("");

  // Photo upload states
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);

  // Form submission states
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const token = getSellerAuthToken();
    if (token) {
      fetchCurrentUserProfile()
        .then((p) => {
          if (p.full_name) setSellerName(p.full_name);
          if (p.phone) setSellerPhone(p.phone);
          if (p.email) setSellerEmail(p.email);
        })
        .catch(() => {});
    }
  }, []);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const incoming = Array.from(e.target.files);
    const combined = [...selectedFiles, ...incoming].slice(0, 10);
    setSelectedFiles(combined);

    const previews = combined.map((file) => URL.createObjectURL(file));
    setPhotoPreviews(previews);
  };

  const removePhoto = (index: number) => {
    const updatedFiles = selectedFiles.filter((_, i) => i !== index);
    setSelectedFiles(updatedFiles);
    const previews = updatedFiles.map((file) => URL.createObjectURL(file));
    setPhotoPreviews(previews);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const digits = sellerPhone.replace(/\D/g, "");
    if (digits.length < 7 || digits.length > 15) {
      setErrorMessage("Please enter a valid phone number (7-15 digits, e.g. +91 95112 93464).");
      return;
    }

    setSubmitting(true);

    try {
      let photoUrls: string[] = [];

      if (selectedFiles.length > 0) {
        setUploadingPhotos(true);
        try {
          const uploadRes = await uploadSellerPhotos(selectedFiles);
          photoUrls = uploadRes.urls || [];
        } catch (uploadErr: any) {
          console.error("Seller photos upload failed:", uploadErr);
          throw new Error("Could not upload photos. Please ensure files are JPEG/PNG/WebP under 15MB each.");
        } finally {
          setUploadingPhotos(false);
        }
      }

      const res = await submitValuationRequest({
        seller_name: sellerName.trim(),
        seller_phone: sellerPhone.trim(),
        seller_email: sellerEmail.trim() || undefined,
        property_type: propertyType,
        listing_type: listingType,
        locality: locality.trim(),
        area_sqft: areaSqft ? Number(areaSqft) : undefined,
        bedrooms: bedrooms ? Number(bedrooms) : undefined,
        asking_price: askingPrice ? Number(askingPrice) : undefined,
        description: description.trim() || undefined,
        submitted_photos: photoUrls,
      });

      setSubmissionId(res.submission_id);
      setSubmitted(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err: any) {
      console.error("Seller submission error:", err);
      setErrorMessage(
        getApiErrorMessage(err, "Could not submit your property. Please check all fields and try again.")
      );
    } finally {
      setSubmitting(false);
      setUploadingPhotos(false);
    }
  };

  const inputClass =
    "w-full px-4 py-3 rounded-[12px] border border-[#EDE8E0] bg-[#FAF7F2] outline-none font-medium text-[13.5px] text-[#172124] placeholder:text-[#9A948B] focus:border-[#172124] focus:bg-white transition-all font-sans";

  return (
    <div className="bg-white min-h-screen flex flex-col font-sans text-[#172124]">
      <SiteNavbar variant="page" />

      <main className="flex-1 w-full max-w-[1100px] mx-auto px-6 sm:px-12 lg:px-16 py-10 sm:py-16 flex flex-col gap-8">
        <div className="self-start">
          <BackButton label="Back to Home" fallback="/" />
        </div>

        {submitted ? (
          <div className="bg-white rounded-[24px] border border-[#EDE8E0] p-8 sm:p-12 shadow-xs text-center flex flex-col items-center gap-6 max-w-2xl mx-auto">
            <div className="size-16 rounded-full bg-emerald-100 text-[#17805B] flex items-center justify-center">
              <CheckCircle2 className="size-8" />
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-[11.5px] font-mono font-semibold uppercase tracking-[0.2em] text-[#8B7D68]">
                [ Submission Confirmed ]
              </span>
              <h1 className="font-display font-bold text-[30px] sm:text-[38px] text-[#172124] leading-tight tracking-tight">
                Your Property Has Been Submitted!
              </h1>
              <p className="text-[14.5px] text-[#717A7D] leading-relaxed max-w-md">
                Thank you, <strong>{sellerName}</strong>. Our lead broker will review your details and reach out to you on <strong>{sellerPhone}</strong>.
              </p>
              {submissionId && (
                <div className="mt-2 inline-block px-4 py-1.5 rounded-full bg-[#FAF7F2] text-[12px] font-mono text-[#8B7D68] border border-[#EDE8E0]">
                  Reference ID: {submissionId}
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3.5 pt-4 border-t border-[#EDE8E0] w-full">
              <Link
                to="/properties"
                className="px-7 py-3 rounded-full bg-[#172124] text-white text-[13.5px] font-semibold hover:bg-[#2C383C] transition-colors shadow-xs"
              >
                Browse Listed Properties
              </Link>
              <Link
                to="/seller"
                className="px-7 py-3 rounded-full border border-[#EDE8E0] text-[#172124] text-[13.5px] font-semibold hover:bg-[#FAF7F2] transition-colors"
              >
                Go to Seller Portal
              </Link>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-8">
            {/* Header */}
            <div className="flex flex-col gap-2">
              <span className="text-[11.5px] font-mono font-semibold uppercase tracking-[0.2em] text-[#8B7D68] block">
                [ Ashiyana Seller Advisory ]
              </span>
              <h1 className="font-display font-bold text-[34px] sm:text-[46px] text-[#172124] leading-tight tracking-tight">
                List & Sell Your Property in Goa
              </h1>
              <p className="text-[14.5px] sm:text-[15.5px] text-[#717A7D] max-w-[620px] leading-relaxed">
                Connect with verified high-net-worth buyers and NRI investors. Get a professional valuation and seamless legal advisory from our brokerage team.
              </p>
            </div>

            {/* Form Box */}
            <div className="bg-white rounded-[24px] p-6 sm:p-10 border border-[#EDE8E0] shadow-xs">
              <form onSubmit={handleSubmit} className="flex flex-col gap-8">
                {errorMessage && (
                  <div className="p-4 rounded-[14px] bg-red-50 text-red-700 text-[13px] border border-red-200">
                    {errorMessage}
                  </div>
                )}

                {/* Section 1: Contact Details */}
                <div className="flex flex-col gap-4">
                  <h3 className="font-display font-bold text-[19px] text-[#172124] pb-2.5 border-b border-[#EDE8E0]">
                    1. Property Owner Information
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11.5px] font-semibold text-[#8B7D68] uppercase tracking-wider">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={sellerName}
                        onChange={(e) => setSellerName(e.target.value)}
                        placeholder="e.g. Rahul Sharma"
                        className={inputClass}
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11.5px] font-semibold text-[#8B7D68] uppercase tracking-wider">
                        Phone Number *
                      </label>
                      <input
                        type="tel"
                        required
                        value={sellerPhone}
                        onChange={(e) => setSellerPhone(e.target.value)}
                        placeholder="e.g. +91 95112 93464"
                        className={inputClass}
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11.5px] font-semibold text-[#8B7D68] uppercase tracking-wider">
                        Email Address (Optional)
                      </label>
                      <input
                        type="email"
                        value={sellerEmail}
                        onChange={(e) => setSellerEmail(e.target.value)}
                        placeholder="e.g. rahul@example.com"
                        className={inputClass}
                      />
                    </div>
                  </div>
                </div>

                {/* Section 2: Property Specs */}
                <div className="flex flex-col gap-4">
                  <h3 className="font-display font-bold text-[19px] text-[#172124] pb-2.5 border-b border-[#EDE8E0]">
                    2. Property Specifications
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11.5px] font-semibold text-[#8B7D68] uppercase tracking-wider">
                        Listing Purpose *
                      </label>
                      <select
                        value={listingType}
                        onChange={(e) => setListingType(e.target.value as ListingType)}
                        className={inputClass}
                      >
                        <option value="sale">For Sale (Outright)</option>
                        <option value="rent">For Rent (Long Term)</option>
                      </select>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11.5px] font-semibold text-[#8B7D68] uppercase tracking-wider">
                        Property Type *
                      </label>
                      <select
                        value={propertyType}
                        onChange={(e) => setPropertyType(e.target.value as PropertyType)}
                        className={inputClass}
                      >
                        <option value="villa">Luxury Villa</option>
                        <option value="flat">Apartment / Flat</option>
                        <option value="penthouse">Penthouse</option>
                        <option value="studio">Studio</option>
                        <option value="plot">Plot / Land</option>
                      </select>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11.5px] font-semibold text-[#8B7D68] uppercase tracking-wider">
                        Locality in Goa *
                      </label>
                      <input
                        type="text"
                        required
                        value={locality}
                        onChange={(e) => setLocality(e.target.value)}
                        placeholder="e.g. Assagao, North Goa"
                        className={inputClass}
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11.5px] font-semibold text-[#8B7D68] uppercase tracking-wider">
                        Asking Price (INR)
                      </label>
                      <input
                        type="number"
                        value={askingPrice}
                        onChange={(e) => setAskingPrice(e.target.value)}
                        placeholder="e.g. 35000000 (3.5 Cr)"
                        className={inputClass}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11.5px] font-semibold text-[#8B7D68] uppercase tracking-wider">
                        Built-up Area (Sq. Ft)
                      </label>
                      <input
                        type="number"
                        value={areaSqft}
                        onChange={(e) => setAreaSqft(e.target.value)}
                        placeholder="e.g. 3200"
                        className={inputClass}
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11.5px] font-semibold text-[#8B7D68] uppercase tracking-wider">
                        Number of Bedrooms
                      </label>
                      <input
                        type="number"
                        value={bedrooms}
                        onChange={(e) => setBedrooms(e.target.value)}
                        placeholder="e.g. 4"
                        className={inputClass}
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11.5px] font-semibold text-[#8B7D68] uppercase tracking-wider">
                      Additional Property Highlights / Notes
                    </label>
                    <textarea
                      rows={3}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Describe views, private pool, furnishing, or special features..."
                      className="w-full px-4 py-3 rounded-[12px] border border-[#EDE8E0] bg-[#FAF7F2] outline-none text-[13.5px] text-[#172124] placeholder:text-[#9A948B] focus:border-[#172124] focus:bg-white transition-all resize-none"
                    />
                  </div>
                </div>

                {/* Section 3: Photo Uploads */}
                <div className="flex flex-col gap-4">
                  <h3 className="font-display font-bold text-[19px] text-[#172124] pb-2.5 border-b border-[#EDE8E0]">
                    3. Property Photography (Up to 10 Photos)
                  </h3>

                  <div className="border-2 border-dashed border-[#EDE8E0] rounded-[20px] p-7 text-center flex flex-col items-center gap-3 bg-[#FAF7F2]">
                    <div className="size-12 rounded-full bg-white flex items-center justify-center text-[#8B7D68] shadow-xs border border-[#EDE8E0]">
                      <Camera className="size-6" />
                    </div>
                    <div>
                      <label className="px-6 py-2.5 rounded-full bg-[#172124] text-white text-[13px] font-semibold hover:bg-[#2C383C] transition-colors cursor-pointer inline-block shadow-xs">
                        Choose Photos
                        <input
                          type="file"
                          multiple
                          accept="image/*"
                          onChange={handlePhotoSelect}
                          className="hidden"
                        />
                      </label>
                      <p className="text-[12px] text-[#717A7D] mt-2">
                        Supported: PNG, JPEG, WebP (Max 15MB each)
                      </p>
                    </div>
                  </div>

                  {photoPreviews.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3.5 pt-2">
                      {photoPreviews.map((preview, idx) => (
                        <div
                          key={idx}
                          className="relative aspect-video rounded-[14px] overflow-hidden border border-[#EDE8E0] group"
                        >
                          <img src={preview} alt="Upload preview" className="size-full object-cover" />
                          <button
                            type="button"
                            onClick={() => removePhoto(idx)}
                            className="absolute top-1.5 right-1.5 size-6 rounded-full bg-black/70 text-white flex items-center justify-center hover:bg-red-600 transition-colors"
                          >
                            <X className="size-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Submit Action */}
                <div className="pt-5 border-t border-[#EDE8E0] flex items-center justify-between flex-wrap gap-4">
                  <span className="text-[12.5px] text-[#717A7D]">
                    100% Confidential · Direct review by Ashiyana brokerage team
                  </span>
                  <button
                    type="submit"
                    disabled={submitting || uploadingPhotos}
                    className="px-8 py-3.5 rounded-full bg-[#172124] text-white font-semibold text-[14px] hover:bg-[#2C383C] transition-colors disabled:opacity-50 flex items-center gap-2 cursor-pointer shadow-xs"
                  >
                    <span>{submitting ? "Submitting Property..." : "Submit Property for Listing"}</span>
                    <ArrowRight className="size-4" />
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
