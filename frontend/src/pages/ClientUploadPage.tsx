import React, { useState, useEffect, useRef } from "react";
import { useSearchParams, Link } from "react-router";
import {
  ShieldCheck,
  UploadCloud,
  FileCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  FileText,
  Trash2,
  Check,
  ArrowRight,
  HelpCircle,
  Phone,
  RefreshCw,
} from "lucide-react";
import { AshiyanaLogo } from "@/lib/shared";
import {
  verifyPublicUploadRequest,
  uploadClientDocument,
  type PublicUploadRequestVerifyDto,
} from "@/lib/api";
import { getApiErrorMessage } from "@/lib/errorUtils";

interface DocUploadState {
  file: File | null;
  side: "complete" | "front" | "back";
  uploading: boolean;
  uploaded: boolean;
  uploadedSide?: string;
  error?: string | null;
}

export default function ClientUploadPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  // Page state: loading, active, invalid, expired, revoked, missing, error
  const [pageStatus, setPageStatus] = useState<
    "loading" | "active" | "invalid" | "expired" | "revoked" | "missing" | "error"
  >("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [verifyData, setVerifyData] = useState<PublicUploadRequestVerifyDto | null>(null);

  // Upload slots mapping: key is requested doc title
  const [docStates, setDocStates] = useState<Record<string, DocUploadState>>({});
  const [submissionComplete, setSubmissionComplete] = useState(false);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    document.title = "Secure Document Upload | Ashiyana Real Estate";
  }, []);

  const loadVerification = React.useCallback(async () => {
    if (!token || token.trim().length < 16) {
      setPageStatus("missing");
      return;
    }

    setPageStatus("loading");
    setErrorMessage("");

    try {
      const data = await verifyPublicUploadRequest(token.trim());
      setVerifyData(data);

      // Initialize states for each requested document
      const initialStates: Record<string, DocUploadState> = {};
      data.requested_docs.forEach((docTitle) => {
        initialStates[docTitle] = {
          file: null,
          side: "complete",
          uploading: false,
          uploaded: false,
        };
      });
      setDocStates(initialStates);
      setPageStatus("active");
    } catch (err: any) {
      const msg = getApiErrorMessage(err, "Failed to verify upload request.");
      const lower = msg.toLowerCase();
      if (lower.includes("expired")) {
        setPageStatus("expired");
        setErrorMessage("This upload link has expired. Please contact the broker for a new link.");
      } else if (lower.includes("revoked")) {
        setPageStatus("revoked");
        setErrorMessage("This upload request has been revoked by the broker.");
      } else if (lower.includes("invalid") || lower.includes("not found") || err?.response?.status === 404) {
        setPageStatus("invalid");
        setErrorMessage("This upload link is invalid or no longer available.");
      } else {
        setPageStatus("error");
        setErrorMessage(msg);
      }
    }
  }, [token]);

  useEffect(() => {
    loadVerification();
  }, [loadVerification]);

  const handleFileSelect = (docTitle: string, file: File | null) => {
    if (!file) return;

    // Check 15MB limit on client side as an immediate usability guard
    if (file.size > 15 * 1024 * 1024) {
      setDocStates((prev) => ({
        ...prev,
        [docTitle]: {
          ...prev[docTitle],
          error: "File size exceeds 15MB limit. Please choose a smaller file.",
        },
      }));
      return;
    }

    setDocStates((prev) => ({
      ...prev,
      [docTitle]: {
        ...prev[docTitle],
        file,
        error: null,
      },
    }));
  };

  const handleSideChange = (docTitle: string, side: "complete" | "front" | "back") => {
    setDocStates((prev) => ({
      ...prev,
      [docTitle]: {
        ...prev[docTitle],
        side,
        error: null,
      },
    }));
  };

  const handleRemoveFile = (docTitle: string) => {
    setDocStates((prev) => ({
      ...prev,
      [docTitle]: {
        ...prev[docTitle],
        file: null,
        error: null,
      },
    }));
    if (fileInputRefs.current[docTitle]) {
      fileInputRefs.current[docTitle]!.value = "";
    }
  };

  const handleUploadSingleDoc = async (docTitle: string) => {
    const current = docStates[docTitle];
    if (!current?.file || !token) return;

    setDocStates((prev) => ({
      ...prev,
      [docTitle]: {
        ...prev[docTitle],
        uploading: true,
        error: null,
      },
    }));

    try {
      const res = await uploadClientDocument(token.trim(), docTitle, current.side, current.file);
      setDocStates((prev) => ({
        ...prev,
        [docTitle]: {
          ...prev[docTitle],
          uploading: false,
          uploaded: true,
          uploadedSide: res.document_side || current.side,
          error: null,
        },
      }));
    } catch (err: any) {
      const errDetail = getApiErrorMessage(err, "Failed to upload document. Please try again.");
      setDocStates((prev) => ({
        ...prev,
        [docTitle]: {
          ...prev[docTitle],
          uploading: false,
          error: errDetail,
        },
      }));
    }
  };

  // Check if at least one document has been uploaded or all are uploaded
  const totalDocs = verifyData?.requested_docs.length || 0;
  const uploadedCount = Object.values(docStates).filter((s) => s.uploaded).length;
  const allUploaded = totalDocs > 0 && uploadedCount === totalDocs;

  // ══════════════════════════════════════════════════════════════════════════
  // RENDER: LOADING STATE
  // ══════════════════════════════════════════════════════════════════════════
  if (pageStatus === "loading") {
    return (
      <div className="min-h-screen bg-[#FAF7F2] flex flex-col items-center justify-center p-6 text-[#172124]">
        <div className="flex flex-col items-center gap-4 text-center">
          <AshiyanaLogo dark={true} className="h-10" />
          <div className="size-10 rounded-full border-3 border-[#EDE8E0] border-t-[#172124] animate-spin" />
          <p className="text-[13px] font-mono uppercase tracking-wider text-[#8B7D68]">
            Validating secure upload request...
          </p>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // RENDER: ERROR / INVALID / EXPIRED / REVOKED / MISSING STATES
  // ══════════════════════════════════════════════════════════════════════════
  if (pageStatus !== "active") {
    const config = {
      missing: {
        badge: "Link Required",
        title: "Secure Upload Link Required",
        message: "No document upload token was detected in your link. Please open the exact link sent to you by Ashiyana Real Estate.",
        icon: HelpCircle,
        iconColor: "text-amber-600",
        iconBg: "bg-amber-100",
      },
      invalid: {
        badge: "Invalid Token",
        title: "Link No Longer Available",
        message: "This upload link is invalid or no longer available. Please request a new link from your broker.",
        icon: AlertCircle,
        iconColor: "text-rose-600",
        iconBg: "bg-rose-100",
      },
      expired: {
        badge: "Expired Link",
        title: "Upload Link Expired",
        message: errorMessage || "This upload link has expired for your security. Please contact your broker to issue an updated request.",
        icon: Clock,
        iconColor: "text-amber-600",
        iconBg: "bg-amber-100",
      },
      revoked: {
        badge: "Revoked Link",
        title: "Upload Request Revoked",
        message: errorMessage || "This upload request has been revoked by your broker.",
        icon: AlertCircle,
        iconColor: "text-rose-600",
        iconBg: "bg-rose-100",
      },
      error: {
        badge: "Connection Error",
        title: "Unable to Connect",
        message: errorMessage || "A network or server error occurred while verifying your link. Please check your internet connection and try again.",
        icon: AlertCircle,
        iconColor: "text-rose-600",
        iconBg: "bg-rose-100",
      },
    }[pageStatus];

    const Icon = config.icon;

    return (
      <div className="min-h-screen bg-[#FAF7F2] flex flex-col items-center justify-center p-4 sm:p-6 text-[#172124]">
        <div className="w-full max-w-[440px] bg-white rounded-[24px] border border-[#EDE8E0] p-7 sm:p-8 shadow-sm text-center flex flex-col items-center gap-4">
          <AshiyanaLogo dark={true} className="h-9 mb-1" />

          <div className={`size-12 rounded-full ${config.iconBg} flex items-center justify-center ${config.iconColor}`}>
            <Icon className="size-6" />
          </div>

          <span className="px-3 py-1 rounded-full bg-[#FAF7F2] border border-[#EDE8E0] text-[11px] font-mono font-bold uppercase tracking-wider text-[#8B7D68]">
            {config.badge}
          </span>

          <h1 className="font-display font-bold text-[20px] sm:text-[22px] text-[#172124] tracking-tight">
            {config.title}
          </h1>

          <p className="text-[13px] text-[#717A7D] leading-relaxed">
            {config.message}
          </p>

          <div className="pt-3 border-t border-[#EDE8E0] w-full flex flex-col gap-2">
            {pageStatus === "error" && (
              <button
                type="button"
                onClick={loadVerification}
                className="w-full py-2.5 rounded-full bg-[#172124] text-white text-[13px] font-semibold hover:bg-[#2C383C] transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <RefreshCw className="size-3.5" />
                <span>Retry Connection</span>
              </button>
            )}

            <a
              href="tel:+918888083558"
              className="w-full py-2.5 rounded-full border border-[#EDE8E0] text-[#172124] text-[13px] font-semibold hover:bg-[#FAF7F2] transition-colors flex items-center justify-center gap-2"
            >
              <Phone className="size-3.5 text-[#8B7D68]" />
              <span>Contact Ashiyana Support</span>
            </a>

            <Link
              to="/"
              className="text-[12px] font-semibold text-[#8B7D68] hover:text-[#172124] py-1 transition-colors"
            >
              Return to Ashiyana Homepage
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // RENDER: FINAL SUCCESS SCREEN (When client clicks 'Finish & Complete')
  // ══════════════════════════════════════════════════════════════════════════
  if (submissionComplete) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] flex flex-col items-center justify-center p-4 sm:p-6 text-[#172124]">
        <div className="w-full max-w-[460px] bg-white rounded-[24px] border border-[#EDE8E0] p-7 sm:p-9 shadow-sm text-center flex flex-col items-center gap-4">
          <AshiyanaLogo dark={true} className="h-9 mb-1" />

          <div className="size-14 rounded-full bg-emerald-100 text-[#17805B] flex items-center justify-center">
            <CheckCircle2 className="size-7" />
          </div>

          <span className="px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-[11px] font-mono font-bold uppercase tracking-wider text-emerald-800">
            Submission Confirmed
          </span>

          <h1 className="font-display font-bold text-[22px] sm:text-[24px] text-[#172124] tracking-tight">
            Documents Transmitted
          </h1>

          <p className="text-[13.5px] text-[#717A7D] leading-relaxed">
            Your documents have been securely uploaded to Ashiyana Real Estate for transaction reference{" "}
            <span className="font-mono font-bold text-[#172124]">{verifyData?.deal_number}</span>.
          </p>

          <div className="p-4 rounded-[14px] bg-[#FAF7F2] border border-[#EDE8E0] text-[12.5px] text-[#717A7D] text-left w-full flex flex-col gap-1.5">
            <div className="flex items-center gap-2 text-[#17805B] font-semibold text-[12px]">
              <ShieldCheck className="size-4 text-[#17805B]" />
              <span>Protected in Authenticated Storage</span>
            </div>
            <p>
              Your personal identification proofs are kept private and accessible only to authorized brokers for legal and registry compliance.
            </p>
          </div>

          <p className="text-[12px] text-[#8B7D68] pt-2">
            You may safely close this browser window now.
          </p>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // RENDER: ACTIVE UPLOAD WORKFLOW
  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-[#FAF7F2] text-[#172124] flex flex-col">
      {/* Top Header */}
      <header className="bg-white border-b border-[#EDE8E0] px-4 py-3.5 sm:px-8">
        <div className="max-w-[640px] mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center">
            <AshiyanaLogo dark={true} className="h-8 sm:h-9" />
          </Link>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FAF7F2] border border-[#EDE8E0] text-[11.5px] font-semibold text-[#17805B]">
            <ShieldCheck className="size-3.5 text-[#17805B]" />
            <span>256-Bit Encrypted</span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-[640px] w-full mx-auto p-4 sm:p-6 flex flex-col gap-5">
        {/* Deal Context Card */}
        <div className="bg-white rounded-[24px] border border-[#EDE8E0] p-6 sm:p-7 shadow-xs flex flex-col gap-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[11.5px] font-bold px-3 py-1 rounded-full bg-[#172124] text-[#C9AD86]">
                {verifyData?.deal_number}
              </span>
              <span className="px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-purple-50 text-purple-700 border border-purple-200">
                {verifyData?.party === "buyer" ? "Buyer Document Request" : "Seller Document Request"}
              </span>
            </div>
            <div className="text-[11.5px] font-mono text-[#8B7D68]">
              Expires {verifyData?.expires_at ? new Date(verifyData.expires_at).toLocaleDateString() : "Shortly"}
            </div>
          </div>

          <div>
            <h1 className="font-display font-bold text-[22px] sm:text-[26px] text-[#172124] tracking-tight">
              Secure Document Upload
            </h1>
            <p className="text-[13.5px] text-[#717A7D] mt-1">
              Requested by <span className="font-semibold text-[#172124]">{verifyData?.broker_name || "Kassim Shaikh"}</span> for your real estate transaction in Goa.
            </p>
          </div>

          {verifyData?.message && (
            <div className="p-3.5 rounded-[14px] bg-[#FAF7F2] border border-[#EDE8E0] text-[12.5px] text-[#717A7D] leading-relaxed">
              <span className="font-semibold text-[#172124] block mb-0.5">Note from broker:</span>
              {verifyData.message}
            </div>
          )}

          {/* Progress Indicator */}
          <div className="pt-3 border-t border-[#EDE8E0] flex items-center justify-between text-[12.5px]">
            <span className="font-semibold text-[#172124]">
              Progress: {uploadedCount} of {totalDocs} received
            </span>
            <span className="font-mono text-[#8B7D68]">
              {totalDocs > 0 ? `${Math.round((uploadedCount / totalDocs) * 100)}%` : "0%"}
            </span>
          </div>
        </div>

        {/* Requested Documents Cards */}
        <div className="flex flex-col gap-4">
          {verifyData?.requested_docs.map((docTitle, index) => {
            const state = docStates[docTitle] || {
              file: null,
              side: "complete",
              uploading: false,
              uploaded: false,
            };

            const isIdDocument = /id|aadhaar|pan|passport|voter/i.test(docTitle);

            return (
              <div
                key={docTitle}
                className={`bg-white rounded-[20px] border transition-all p-5 sm:p-6 flex flex-col gap-3.5 shadow-xs ${
                  state.uploaded
                    ? "border-emerald-200 bg-emerald-50/20"
                    : "border-[#EDE8E0] hover:border-[#172124]/30"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div
                      className={`size-8 rounded-full flex items-center justify-center font-mono text-[12px] font-bold shrink-0 mt-0.5 ${
                        state.uploaded
                          ? "bg-[#17805B] text-white"
                          : "bg-[#172124] text-[#C9AD86]"
                      }`}
                    >
                      {state.uploaded ? <Check className="size-4" /> : index + 1}
                    </div>
                    <div>
                      <h3 className="font-bold text-[15px] sm:text-[16px] text-[#172124]">
                        {docTitle}
                      </h3>
                      <p className="text-[12px] text-[#717A7D] mt-0.5">
                        Accepted: PDF, PNG, JPG (Max 15MB)
                      </p>
                    </div>
                  </div>

                  {state.uploaded ? (
                    <span className="px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 shrink-0 flex items-center gap-1">
                      <Check className="size-3" />
                      <span>Received</span>
                    </span>
                  ) : (
                    <span className="px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-[#FAF7F2] border border-[#EDE8E0] text-[#8B7D68] shrink-0">
                      Pending
                    </span>
                  )}
                </div>

                {state.error && (
                  <div className="p-3 rounded-[12px] bg-red-50 text-red-800 border border-red-200 text-[12.5px] flex items-center gap-2">
                    <AlertCircle className="size-4 text-red-600 shrink-0" />
                    <span>{state.error}</span>
                  </div>
                )}

                {state.uploaded ? (
                  <div className="p-3 rounded-[12px] bg-emerald-50 border border-emerald-200 text-[12px] text-emerald-900 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileCheck className="size-4 text-[#17805B]" />
                      <span>
                        Transmitted as {state.uploadedSide ? state.uploadedSide.toUpperCase() : "COMPLETE"} scan.
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setDocStates((prev) => ({
                          ...prev,
                          [docTitle]: {
                            file: null,
                            side: "complete",
                            uploading: false,
                            uploaded: false,
                          },
                        }));
                      }}
                      className="text-[11.5px] font-semibold text-[#172124] underline cursor-pointer"
                    >
                      Upload Another Side
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3 pt-2 border-t border-[#EDE8E0]">
                    {/* Document Side Selector (for IDs) */}
                    {isIdDocument && (
                      <div>
                        <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#8B7D68] block mb-1.5">
                          Select Side
                        </span>
                        <div className="grid grid-cols-3 gap-2">
                          {(["complete", "front", "back"] as const).map((side) => (
                            <button
                              key={side}
                              type="button"
                              onClick={() => handleSideChange(docTitle, side)}
                              className={`py-1.5 px-2 rounded-[10px] text-[12px] font-semibold capitalize transition-all cursor-pointer ${
                                state.side === side
                                  ? "bg-[#172124] text-white shadow-2xs"
                                  : "bg-[#FAF7F2] text-[#717A7D] border border-[#EDE8E0] hover:bg-white"
                              }`}
                            >
                              {side === "complete" ? "Complete / Both" : `${side} Side`}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* File Picker / Selected View */}
                    {state.file ? (
                      <div className="p-3 rounded-[14px] bg-[#FAF7F2] border border-[#EDE8E0] flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <FileText className="size-5 text-[#8B7D68] shrink-0" />
                          <div className="flex flex-col min-w-0">
                            <span className="text-[13px] font-semibold text-[#172124] truncate">
                              {state.file.name}
                            </span>
                            <span className="text-[11px] font-mono text-[#717A7D]">
                              {(state.file.size / 1024).toFixed(1)} KB
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            disabled={state.uploading}
                            onClick={() => handleRemoveFile(docTitle)}
                            className="p-1.5 rounded-full text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                            title="Remove file"
                          >
                            <Trash2 className="size-4" />
                          </button>
                          <button
                            type="button"
                            disabled={state.uploading}
                            onClick={() => handleUploadSingleDoc(docTitle)}
                            className="px-4 py-2 rounded-full bg-[#172124] hover:bg-[#2C383C] text-white text-[12.5px] font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                          >
                            {state.uploading ? (
                              <>
                                <RefreshCw className="size-3.5 animate-spin" />
                                <span>Uploading...</span>
                              </>
                            ) : (
                              <>
                                <UploadCloud className="size-3.5 text-[#C9AD86]" />
                                <span>Upload</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <input
                          type="file"
                          ref={(el) => {
                            fileInputRefs.current[docTitle] = el;
                          }}
                          accept=".pdf,.png,.jpg,.jpeg,.webp"
                          className="hidden"
                          onChange={(e) => handleFileSelect(docTitle, e.target.files?.[0] || null)}
                        />
                        <button
                          type="button"
                          onClick={() => fileInputRefs.current[docTitle]?.click()}
                          className="w-full py-3 px-4 rounded-[14px] border border-dashed border-[#EDE8E0] hover:border-[#172124]/40 bg-[#FAF7F2] hover:bg-white text-[13px] font-semibold text-[#172124] flex items-center justify-center gap-2 transition-all cursor-pointer"
                        >
                          <UploadCloud className="size-4 text-[#8B7D68]" />
                          <span>Choose File or Take Photo</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Bottom Submission Action */}
        <div className="bg-white rounded-[24px] border border-[#EDE8E0] p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-2 mb-8">
          <div>
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#8B7D68] block">
              Submission Review
            </span>
            <p className="text-[13px] text-[#717A7D] mt-0.5">
              {uploadedCount > 0
                ? `${uploadedCount} document${uploadedCount === 1 ? "" : "s"} successfully uploaded.`
                : "Please select and upload your documents above."}
            </p>
          </div>

          <button
            type="button"
            disabled={uploadedCount === 0}
            onClick={() => setSubmissionComplete(true)}
            className="px-6 py-3 rounded-full text-white text-[13px] font-semibold shadow-xs flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-40 bg-[#172124] hover:bg-[#2C383C]"
          >
            <span>{allUploaded ? "Complete & Finalize" : "Finish & Submit Uploaded"}</span>
            <ArrowRight className="size-4 text-[#C9AD86]" />
          </button>
        </div>
      </main>
    </div>
  );
}
