import axios from "axios";

// ─── API Client Configuration ──────────────────────────────────────────────────
export const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ||
  "http://localhost:8000/api";

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 15000,
});

// Attach JWT token automatically to every request if available
apiClient.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const isSellerReq = config.url?.includes("/seller");
    const sellerToken = localStorage.getItem("ashiyana_seller_token");
    const brokerToken = localStorage.getItem("ashiyana_token");

    const token = isSellerReq ? (sellerToken || brokerToken) : (brokerToken || sellerToken);
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// ─── Auth Storage & Management ────────────────────────────────────────────────
export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("ashiyana_token");
}

export function setAuthToken(token: string): void {
  if (typeof window !== "undefined") {
    localStorage.setItem("ashiyana_token", token);
  }
}

export function clearAuthToken(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem("ashiyana_token");
    localStorage.removeItem("ashiyana_user");
  }
}

// ─── Seller Auth Storage ──────────────────────────────────────────────────────
export function getSellerAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("ashiyana_seller_token");
}

export function setSellerAuthToken(token: string): void {
  if (typeof window !== "undefined") {
    localStorage.setItem("ashiyana_seller_token", token);
  }
}

export function clearSellerAuthToken(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem("ashiyana_seller_token");
    localStorage.removeItem("ashiyana_seller_profile");
  }
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
}

export async function loginBroker(email: string, password: string): Promise<AuthTokens> {
  const response = await apiClient.post<AuthTokens>("/auth/login", {
    email,
    password,
  });
  if (response.data.access_token) {
    setAuthToken(response.data.access_token);
  }
  return response.data;
}

export async function registerSeller(data: {
  full_name: string;
  email: string;
  phone: string;
  password: string;
}): Promise<AuthTokens> {
  const response = await apiClient.post<AuthTokens>("/auth/seller/register", data);
  if (response.data.access_token) {
    setSellerAuthToken(response.data.access_token);
  }
  return response.data;
}

export async function loginSeller(data: {
  email: string;
  password: string;
}): Promise<AuthTokens> {
  const response = await apiClient.post<AuthTokens>("/auth/seller/login", data);
  if (response.data.access_token) {
    setSellerAuthToken(response.data.access_token);
  }
  return response.data;
}

export interface UserProfileDto {
  id: string;
  email: string;
  full_name: string;
  phone?: string | null;
  role: string;
  is_active: boolean;
  created_at: string;
}

export async function fetchCurrentUserProfile(): Promise<UserProfileDto> {
  const response = await apiClient.get<UserProfileDto>("/auth/me");
  return response.data;
}

// ─── Enums matching backend app/models/models.py ──────────────────────────────
export type PropertyType =
  | "flat"
  | "studio"
  | "villa"
  | "bungalow"
  | "duplex"
  | "penthouse"
  | "farmhouse"
  | "plot"
  | "commercial"
  | "office"
  | "shop"
  | "showroom"
  | "warehouse"
  | "coworking";

export type ListingType = "sale" | "rent" | "lease";
export type PropertyStatus =
  | "active"
  | "sold"
  | "rented"
  | "reserved"
  | "under_negotiation"
  | "inactive";
export type PossessionStatus = "ready_to_move" | "under_construction";
export type GoaRegion = "north_goa" | "south_goa" | "central_goa";
export type Facing =
  | "north"
  | "south"
  | "east"
  | "west"
  | "north_east"
  | "north_west"
  | "south_east"
  | "south_west";

// ─── Schemas matching backend app/schemas/properties.py ───────────────────────
export interface PropertyImage {
  id: string;
  image_url: string;
  caption?: string | null;
  display_order: number;
  is_thumbnail: boolean;
}

export interface PropertyCreateDto {
  title: string;
  description?: string;
  property_type: PropertyType;
  listing_type: ListingType;
  price: number;
  price_negotiable?: boolean;
  security_deposit?: number;
  bedrooms?: number;
  bathrooms?: number;
  area_sqft?: number;
  floor_number?: number;
  total_floors?: number;
  age_years?: number;
  furnished?: string;
  facing?: Facing;
  locality: string;
  village?: string;
  taluka?: string;
  region: GoaRegion;
  pin_code?: string;
  full_address?: string;
  amenities?: string[];
  nri_eligible?: boolean;
  fema_compliant?: boolean;
  possession_status?: PossessionStatus;
  beach_distance_km?: number;
  mopa_airport_km?: number;
  dabolim_airport_km?: number;
  tourist_density?: string;
  short_term_rental_potential?: boolean;
  connectivity_score?: number;
  is_featured?: boolean;
  status?: PropertyStatus;
  property_video_url?: string;
}

export interface PropertyUpdateDto {
  title?: string;
  description?: string;
  price?: number;
  price_negotiable?: boolean;
  status?: PropertyStatus;
  bedrooms?: number;
  bathrooms?: number;
  area_sqft?: number;
  furnished?: string;
  amenities?: string[];
  beach_distance_km?: number;
  tourist_density?: string;
  is_featured?: boolean;
  property_video_url?: string;
  facing?: Facing;
  possession_status?: PossessionStatus;
}

export interface PropertyCardDto {
  id: string;
  title: string;
  property_type: PropertyType;
  listing_type: ListingType;
  status: PropertyStatus;
  price: number;
  bedrooms?: number | null;
  bathrooms?: number | null;
  area_sqft?: number | null;
  locality: string;
  region: GoaRegion;
  is_featured: boolean;
  beach_distance_km?: number | null;
  nri_eligible: boolean;
  created_at: string;
}

export interface PropertySearchResponse {
  total: number;
  skip: number;
  limit: number;
  results: PropertyCardDto[];
}

export interface PropertyPublicDto {
  id: string;
  title: string;
  description?: string | null;
  property_type: PropertyType;
  listing_type: ListingType;
  status: PropertyStatus;
  price: number;
  price_negotiable: boolean;
  security_deposit?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  area_sqft?: number | null;
  floor_number?: number | null;
  total_floors?: number | null;
  age_years?: number | null;
  furnished?: string | null;
  facing?: Facing | null;
  locality: string;
  village?: string | null;
  region: GoaRegion;
  approx_lat?: number | null;
  approx_lng?: number | null;
  beach_distance_km?: number | null;
  mopa_airport_km?: number | null;
  dabolim_airport_km?: number | null;
  tourist_density?: string | null;
  short_term_rental_potential: boolean;
  connectivity_score?: number | null;
  images: PropertyImage[];
  property_video_url?: string | null;
  possession_status?: PossessionStatus | null;
  amenities: string[];
  nri_eligible: boolean;
  fema_compliant: boolean;
  is_featured: boolean;
  view_count: number;
  created_at: string;
}

export interface PropertyFilterParams {
  property_type?: PropertyType;
  listing_type?: ListingType;
  region?: GoaRegion;
  locality?: string;
  min_price?: number;
  max_price?: number;
  bedrooms?: number;
  furnished?: string;
  nri_eligible?: boolean;
  short_term_rental?: boolean;
  is_featured?: boolean;
  skip?: number;
  limit?: number;
}

// ─── API Methods ──────────────────────────────────────────────────────────────

/**
 * Fetch paginated property cards from GET /api/properties
 */
export async function fetchProperties(
  filters: PropertyFilterParams = {}
): Promise<PropertySearchResponse> {
  const response = await apiClient.get<PropertySearchResponse>("/properties", {
    params: filters,
  });
  return response.data;
}

/**
 * Fetch featured property cards from GET /api/properties/featured
 */
export async function fetchFeaturedProperties(): Promise<PropertyCardDto[]> {
  const response = await apiClient.get<PropertyCardDto[]>("/properties/featured");
  return response.data;
}

/**
 * Fetch full property details from GET /api/properties/{property_id}
 */
export async function fetchPropertyById(
  propertyId: string
): Promise<PropertyPublicDto> {
  const response = await apiClient.get<PropertyPublicDto>(
    `/properties/${propertyId}`
  );
  return response.data;
}

/**
 * Create a new property (Broker only)
 */
export async function createProperty(
  data: PropertyCreateDto
): Promise<{ id: string; message: string }> {
  const response = await apiClient.post<{ id: string; message: string }>(
    "/properties",
    data
  );
  return response.data;
}

/**
 * Update an existing property (Broker only)
 */
export async function updateProperty(
  propertyId: string,
  data: PropertyUpdateDto
): Promise<{ id: string; message: string }> {
  const response = await apiClient.patch<{ id: string; message: string }>(
    `/properties/${propertyId}`,
    data
  );
  return response.data;
}

/**
 * Delete a property (Broker only)
 */
export async function deleteProperty(
  propertyId: string
): Promise<void> {
  await apiClient.delete(`/properties/${propertyId}`);
}

export interface PropertyImageCreateDto {
  image_url: string;
  caption?: string | null;
  display_order?: number;
  is_thumbnail?: boolean;
}

export interface PropertyImageReorderItem {
  image_id: string;
  display_order: number;
}

/**
 * Fetch images for a property from GET /api/properties/{property_id}/images
 */
export async function fetchPropertyImages(
  propertyId: string
): Promise<PropertyImage[]> {
  const response = await apiClient.get<PropertyImage[]>(
    `/properties/${propertyId}/images`
  );
  return response.data;
}

/**
 * Upload photos directly to backend (Cloudinary / local fallback) and attach to property
 */
export async function uploadPropertyImages(
  propertyId: string,
  files: File[]
): Promise<PropertyImage[]> {
  const formData = new FormData();
  files.forEach((file) => {
    formData.append("files", file);
  });
  const response = await apiClient.post<PropertyImage[]>(
    `/properties/${propertyId}/images/upload`,
    formData,
    {
      headers: { "Content-Type": "multipart/form-data" },
    }
  );
  return response.data;
}

/**
 * Attach pre-uploaded Cloudinary URLs to a property
 */
export async function attachPropertyImages(
  propertyId: string,
  images: PropertyImageCreateDto[]
): Promise<PropertyImage[]> {
  const response = await apiClient.post<PropertyImage[]>(
    `/properties/${propertyId}/images`,
    { images }
  );
  return response.data;
}

/**
 * Delete a specific image from a property
 */
export async function deletePropertyImage(
  propertyId: string,
  imageId: string
): Promise<{ message: string }> {
  const response = await apiClient.delete<{ message: string }>(
    `/properties/${propertyId}/images/${imageId}`
  );
  return response.data;
}

/**
 * Reorder images for a property
 */
export async function reorderPropertyImages(
  propertyId: string,
  items: PropertyImageReorderItem[]
): Promise<PropertyImage[]> {
  const response = await apiClient.patch<PropertyImage[]>(
    `/properties/${propertyId}/images/reorder`,
    { items }
  );
  return response.data;
}

/**
 * Set a specific image as the primary cover thumbnail for a property
 */
export async function setPropertyThumbnail(
  propertyId: string,
  imageId: string
): Promise<PropertyImage> {
  const response = await apiClient.patch<PropertyImage>(
    `/properties/${propertyId}/images/${imageId}/thumbnail`
  );
  return response.data;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Formats numeric price into Indian numbering format (e.g. ₹2.8 Cr, ₹90L, ₹45K/mo).
 */
export function formatPriceINR(price: number, listingType?: ListingType | "Buy" | "Rent"): string {
  if (!price && price !== 0) return "Price on Request";

  const isRent =
    listingType === "rent" ||
    listingType === "Rent" ||
    listingType === "lease";

  if (price >= 10000000) {
    const cr = (price / 10000000).toFixed(1).replace(/\.0$/, "");
    return `₹${cr} Cr${isRent ? "/mo" : ""}`;
  }
  if (price >= 100000) {
    const l = (price / 100000).toFixed(1).replace(/\.0$/, "");
    return `₹${l}L${isRent ? "/mo" : ""}`;
  }
  if (price >= 1000) {
    const k = (price / 1000).toFixed(0);
    return `₹${k}K${isRent ? "/mo" : ""}`;
  }
  return `₹${price.toLocaleString("en-IN")}${isRent ? "/mo" : ""}`;
}

/**
 * Formats region enum to display string.
 */
export function formatRegionLabel(region?: GoaRegion | string): string {
  if (!region) return "Goa";
  switch (region) {
    case "north_goa":
      return "North Goa";
    case "south_goa":
      return "South Goa";
    case "central_goa":
      return "Central Goa";
    default:
      return region
        .split("_")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
  }
}

/**
 * Formats facing enum to display string.
 */
export function formatFacingLabel(facing?: Facing | string | null): string {
  if (!facing) return "East";
  return facing
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/**
 * Formats possession status enum to display string.
 */
export function formatPossessionLabel(
  possession?: PossessionStatus | string | null
): string {
  if (!possession) return "Ready to Move";
  if (possession === "ready_to_move") return "Ready to Move";
  if (possession === "under_construction") return "Under Construction";
  return possession;
}

/**
 * Formats property type enum to display string.
 */
export function formatPropertyTypeLabel(type?: PropertyType | string): string {
  if (!type) return "Villa";
  return type.charAt(0).toUpperCase() + type.slice(1);
}

// ─── Enquiries & CRM Types ───────────────────────────────────────────────────

export type LeadStatus =
  | "new"
  | "contacted"
  | "site_visit"
  | "negotiation"
  | "closed"
  | "lost";

export interface EnquiryDto {
  id: string;
  property_id: string;
  property_title?: string | null;
  buyer_name: string;
  buyer_phone: string;
  buyer_email?: string | null;
  message?: string | null;
  is_nri: boolean;
  budget?: number | null;
  source: string;
  status: LeadStatus;
  broker_notes?: string | null;
  follow_up_date?: string | null;
  address_revealed: boolean;
  created_at: string;
}

export interface EnquiryCreateDto {
  property_id: string;
  buyer_name: string;
  buyer_phone: string;
  buyer_email?: string | null;
  message?: string | null;
  is_nri?: boolean;
  budget?: number | null;
}

export interface EnquiryUpdateDto {
  status?: LeadStatus;
  broker_notes?: string | null;
  follow_up_date?: string | null;
  address_revealed?: boolean;
}

export interface EnquiryFilterParams {
  status?: LeadStatus;
  property_id?: string;
  is_nri?: boolean;
  skip?: number;
  limit?: number;
}

export interface DashboardStatsDto {
  total_active_listings: number;
  total_sold: number;
  total_rented: number;
  featured_count: number;
  new_enquiries: number;
  enquiries_today: number;
  follow_ups_due: number;
  pending_submissions: number;
  most_viewed_property_id?: string | null;
  most_viewed_property_title?: string | null;
  most_viewed_count: number;
}

// ─── Enquiry & Broker API Methods ───────────────────────────────────────────

/**
 * Fetch all enquiries for broker CRM from GET /api/enquiries
 */
export async function fetchEnquiries(
  params: EnquiryFilterParams = {}
): Promise<EnquiryDto[]> {
  const response = await apiClient.get<EnquiryDto[]>("/enquiries", {
    params,
  });
  return response.data;
}

/**
 * Update enquiry status, notes, follow-up, or address reveal via PATCH /api/enquiries/{id}
 */
export async function updateEnquiry(
  enquiryId: string,
  data: EnquiryUpdateDto
): Promise<{ message: string; id: string }> {
  const response = await apiClient.patch<{ message: string; id: string }>(
    `/enquiries/${enquiryId}`,
    data
  );
  return response.data;
}

/**
 * Public or authenticated enquiry submission to POST /api/enquiries
 */
export async function submitEnquiry(
  data: EnquiryCreateDto
): Promise<{ message: string; enquiry_id: string }> {
  const response = await apiClient.post<{ message: string; enquiry_id: string }>(
    "/enquiries",
    data
  );
  return response.data;
}

/**
 * Fetch broker dashboard KPIs from GET /api/broker/dashboard
 */
export async function fetchDashboardStats(): Promise<DashboardStatsDto> {
  const response = await apiClient.get<DashboardStatsDto>("/broker/dashboard");
  return response.data;
}

/**
 * Formats lead status enum to user friendly label
 */
export function formatLeadStatusLabel(status: LeadStatus): string {
  switch (status) {
    case "new":
      return "New Lead";
    case "contacted":
      return "Contacted";
    case "site_visit":
      return "Site Visit";
    case "negotiation":
      return "Negotiation";
    case "closed":
      return "Closed Won";
    case "lost":
      return "Lost";
    default:
      return status;
  }
}

// ─── Seller Submission ("Sell / Valuation") Types & APIs ──────────────────────

export type SubmissionStatus =
  | "pending"
  | "reviewing"
  | "accepted"
  | "rejected"
  | "listed";

export interface SellerSubmissionDto {
  id: string;
  seller_name: string;
  seller_phone: string;
  seller_email?: string | null;
  property_type: PropertyType;
  listing_type: ListingType;
  locality: string;
  area_sqft?: number | null;
  bedrooms?: number | null;
  asking_price?: number | null;
  description?: string | null;
  submitted_photos: string[];
  status: SubmissionStatus;
  broker_notes?: string | null;
  rejection_reason?: string | null;
  converted_property_id?: string | null;
  created_at: string;
}

export interface SellerSubmissionCreateDto {
  seller_name: string;
  seller_phone: string;
  seller_email?: string;
  property_type: PropertyType;
  listing_type: ListingType;
  locality: string;
  area_sqft?: number;
  bedrooms?: number;
  asking_price?: number;
  description?: string;
  submitted_photos?: string[];
}

export interface SellerSubmissionUpdateDto {
  status?: SubmissionStatus;
  broker_notes?: string;
  rejection_reason?: string;
}

/**
 * Public or authenticated seller submission to POST /api/submissions
 */
export async function submitValuationRequest(
  data: SellerSubmissionCreateDto
): Promise<{ message: string; submission_id: string }> {
  const response = await apiClient.post<{ message: string; submission_id: string }>(
    "/submissions",
    data
  );
  return response.data;
}

/**
 * Public upload for seller photos up to 5 images to POST /api/media/upload/seller-photos
 */
export async function uploadSellerPhotos(
  files: File[]
): Promise<{ urls: string[]; count: number }> {
  const formData = new FormData();
  for (const file of files) {
    formData.append("files", file);
  }
  const response = await apiClient.post<{ urls: string[]; count: number }>(
    "/media/upload/seller-photos",
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );
  return response.data;
}

/**
 * Broker fetches seller submissions from GET /api/submissions
 */
export async function fetchSubmissions(
  params: { status?: SubmissionStatus; skip?: number; limit?: number } = {}
): Promise<SellerSubmissionDto[]> {
  const response = await apiClient.get<SellerSubmissionDto[]>("/submissions", {
    params,
  });
  return response.data;
}

/**
 * Broker reviews, accepts, rejects, or adds notes to a seller submission via PATCH /api/submissions/{id}
 */
export async function reviewSubmission(
  submissionId: string,
  data: SellerSubmissionUpdateDto
): Promise<{ message: string; property_id?: string }> {
  const response = await apiClient.patch<{ message: string; property_id?: string }>(
    `/submissions/${submissionId}`,
    data
  );
  return response.data;
}

/**
 * Formats seller submission status enum to user friendly label
 */
export function formatSubmissionStatusLabel(status: SubmissionStatus): string {
  switch (status) {
    case "pending":
      return "Pending Review";
    case "reviewing":
      return "Under Review";
    case "accepted":
      return "Accepted";
    case "rejected":
      return "Rejected";
    case "listed":
      return "Listed on Ashiyana";
    default:
      return status;
  }
}

// ─── Business Profile ─────────────────────────────────────────────────────────

export interface BusinessProfileDto {
  id: string;
  broker_name: string;
  broker_role: string;
  company_name: string;
  phone: string;
  whatsapp_number: string;
  email: string;
  office_address: string;
  facebook_url?: string | null;
  instagram_url?: string | null;
  olx_url?: string | null;
  updated_at?: string | null;
}

export interface BusinessProfileUpdateDto {
  broker_name?: string;
  broker_role?: string;
  company_name?: string;
  phone?: string;
  whatsapp_number?: string;
  email?: string;
  office_address?: string;
  facebook_url?: string | null;
  instagram_url?: string | null;
  olx_url?: string | null;
}

/**
 * Fetch the public single source of truth business profile from GET /api/business/profile
 */
export async function fetchBusinessProfile(): Promise<BusinessProfileDto> {
  const response = await apiClient.get<BusinessProfileDto>("/business/profile");
  return response.data;
}

/**
 * Broker updates the business profile & social media settings via PUT /api/business/profile
 */
export async function updateBusinessProfile(
  data: BusinessProfileUpdateDto
): Promise<BusinessProfileDto> {
  const response = await apiClient.put<BusinessProfileDto>("/business/profile", data);
  return response.data;
}

// ─── Registered Seller Dashboard & Document Vault APIs ────────────────────────

export interface SellerDashboardStatsDto {
  total_submissions: number;
  pending_submissions: number;
  listed_properties: number;
  total_documents: number;
  seller_name: string;
  seller_email: string;
}

export interface SellerDocumentDto {
  id: string;
  user_id: string;
  submission_id?: string | null;
  title: string;
  doc_type: string;
  original_filename: string;
  file_size: number;
  mime_type: string;
  created_at: string;
}

export interface SellerListedPropertyDto {
  id: string;
  title: string;
  property_type: PropertyType;
  listing_type: ListingType;
  locality: string;
  price: number;
  status: PropertyStatus;
  thumbnail_url?: string | null;
  view_count: number;
  created_at: string;
}

/**
 * Fetch seller dashboard summary metrics from GET /api/seller/dashboard
 */
export async function fetchSellerDashboardStats(): Promise<SellerDashboardStatsDto> {
  const response = await apiClient.get<SellerDashboardStatsDto>("/seller/dashboard");
  return response.data;
}

/**
 * Fetch all submissions submitted by the logged-in seller from GET /api/seller/submissions
 */
export async function fetchSellerSubmissions(): Promise<SellerSubmissionDto[]> {
  const response = await apiClient.get<SellerSubmissionDto[]>("/seller/submissions");
  return response.data;
}

/**
 * Fetch all listed properties converted from this seller's submissions from GET /api/seller/properties
 */
export async function fetchSellerProperties(): Promise<SellerListedPropertyDto[]> {
  const response = await apiClient.get<SellerListedPropertyDto[]>("/seller/properties");
  return response.data;
}

/**
 * Fetch all private documents uploaded by the logged-in seller from GET /api/seller/documents
 */
export async function fetchSellerDocuments(): Promise<SellerDocumentDto[]> {
  const response = await apiClient.get<SellerDocumentDto[]>("/seller/documents");
  return response.data;
}

/**
 * Upload a document to the seller's secure private vault via POST /api/seller/documents/upload
 */
export async function uploadSellerDocument(
  file: File,
  title: string,
  docType: string,
  submissionId?: string
): Promise<{ message: string; document: SellerDocumentDto }> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("title", title);
  formData.append("doc_type", docType);
  if (submissionId) {
    formData.append("submission_id", submissionId);
  }

  const response = await apiClient.post<{ message: string; document: SellerDocumentDto }>(
    "/seller/documents/upload",
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );
  return response.data;
}

/**
 * Download a private document with server-side authorization check from GET /api/seller/documents/{id}/download
 */
export async function downloadSellerDocumentBlob(docId: string, filename: string): Promise<void> {
  const response = await apiClient.get(`/seller/documents/${docId}/download`, {
    responseType: "blob",
  });
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename || "document");
  document.body.appendChild(link);
  link.click();
  link.parentNode?.removeChild(link);
  window.URL.revokeObjectURL(url);
}

/**
 * Delete a private document via DELETE /api/seller/documents/{id}
 */
export async function deleteSellerDocument(docId: string): Promise<{ message: string }> {
  const response = await apiClient.delete<{ message: string }>(`/seller/documents/${docId}`);
  return response.data;
}

// ─── Broker Seller CRM Management APIs ────────────────────────────────────────

export interface BrokerSellerListItemDto {
  id: string;
  full_name: string;
  email: string;
  phone?: string | null;
  role: string;
  is_active: boolean;
  created_at: string;
  submissions_count: number;
  listed_properties_count: number;
  documents_count: number;
}

export interface BrokerSellerDetailDto {
  id: string;
  full_name: string;
  email: string;
  phone?: string | null;
  role: string;
  is_active: boolean;
  created_at: string;
  submissions: SellerSubmissionDto[];
  listed_properties: Array<{
    id: string;
    title: string;
    locality: string;
    price: number;
    status: string;
  }>;
  documents: Array<{
    id: string;
    title: string;
    doc_type: string;
    original_filename: string;
    file_size: number;
    mime_type: string;
    created_at: string;
    download_url: string;
  }>;
}

/**
 * Broker fetches all registered sellers from GET /api/broker/sellers
 */
export async function fetchBrokerSellers(): Promise<BrokerSellerListItemDto[]> {
  const response = await apiClient.get<BrokerSellerListItemDto[]>("/broker/sellers");
  return response.data;
}

/**
 * Broker fetches full details for a seller from GET /api/broker/sellers/{id}
 */
export async function fetchBrokerSellerDetail(sellerId: string): Promise<BrokerSellerDetailDto> {
  const response = await apiClient.get<BrokerSellerDetailDto>(`/broker/sellers/${sellerId}`);
  return response.data;
}



