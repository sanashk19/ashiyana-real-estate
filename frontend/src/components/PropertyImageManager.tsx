import React, { useState, useEffect, useRef } from "react";
import {
  type PropertyImage,
  fetchPropertyImages,
  uploadPropertyImages,
  deletePropertyImage,
  reorderPropertyImages,
  setPropertyThumbnail,
} from "@/lib/api";
import { GREEN } from "@/lib/shared";

interface PropertyImageManagerProps {
  propertyId: string;
  onImagesUpdated?: (images: PropertyImage[]) => void;
  initialImages?: PropertyImage[];
}

export function PropertyImageManager({
  propertyId,
  onImagesUpdated,
  initialImages,
}: PropertyImageManagerProps) {
  const [images, setImages] = useState<PropertyImage[]>(initialImages || []);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [previewFiles, setPreviewFiles] = useState<{ file: File; url: string }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load images when propertyId changes
  useEffect(() => {
    if (!propertyId) return;
    let isMounted = true;
    setLoading(true);
    setError(null);

    fetchPropertyImages(propertyId)
      .then((data) => {
        if (isMounted) {
          setImages(data);
          onImagesUpdated?.(data);
        }
      })
      .catch((err) => {
        if (isMounted) setError(err.message || "Failed to load property images");
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [propertyId]);

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      previewFiles.forEach((item) => URL.revokeObjectURL(item.url));
    };
  }, [previewFiles]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    const files = Array.from(e.target.files);
    
    // Validate file types and sizes
    const validFiles: File[] = [];
    for (const file of files) {
      if (!file.type.match(/^image\/(jpeg|png|webp)$/)) {
        setError(`File ${file.name} is not a supported format (JPEG, PNG, WEBP).`);
        continue;
      }
      if (file.size > 10 * 1024 * 1024) {
        setError(`File ${file.name} exceeds 10MB limit.`);
        continue;
      }
      validFiles.push(file);
    }

    if (validFiles.length === 0) return;

    // Create preview URLs
    const newPreviews = validFiles.map((file) => ({
      file,
      url: URL.createObjectURL(file),
    }));

    setPreviewFiles((prev) => [...prev, ...newPreviews]);
    setError(null);
    setSuccessMessage(null);
  };

  const cancelPendingUpload = () => {
    previewFiles.forEach((item) => URL.revokeObjectURL(item.url));
    setPreviewFiles([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleUpload = async () => {
    if (previewFiles.length === 0) return;

    setUploading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const filesToUpload = previewFiles.map((p) => p.file);
      const isFirstUpload = images.length === 0;

      const uploadedImages = await uploadPropertyImages(
        propertyId,
        filesToUpload,
        isFirstUpload // If no images exist, set the first one as thumbnail
      );

      const updated = [...images, ...uploadedImages];
      setImages(updated);
      onImagesUpdated?.(updated);
      cancelPendingUpload();
      setSuccessMessage(`Successfully uploaded ${uploadedImages.length} image(s)!`);
    } catch (err: any) {
      setError(err.message || "Failed to upload images. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (imageId: string) => {
    if (!window.confirm("Are you sure you want to delete this photo?")) return;

    setError(null);
    setSuccessMessage(null);

    try {
      await deletePropertyImage(propertyId, imageId);
      const updated = images.filter((img) => img.id !== imageId);
      setImages(updated);
      onImagesUpdated?.(updated);
      setSuccessMessage("Photo deleted successfully.");
    } catch (err: any) {
      setError(err.message || "Failed to delete image.");
    }
  };

  const handleSetThumbnail = async (imageId: string) => {
    setError(null);
    setSuccessMessage(null);

    try {
      await setPropertyThumbnail(propertyId, imageId);
      const updated = images.map((img) => ({
        ...img,
        is_thumbnail: img.id === imageId,
      }));
      setImages(updated);
      onImagesUpdated?.(updated);
      setSuccessMessage("Cover photo updated.");
    } catch (err: any) {
      setError(err.message || "Failed to set cover photo.");
    }
  };

  const handleMove = async (index: number, direction: "left" | "right") => {
    const targetIndex = direction === "left" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= images.length) return;

    const newImages = [...images];
    const temp = newImages[index];
    newImages[index] = newImages[targetIndex];
    newImages[targetIndex] = temp;

    // Update state immediately for responsive UI
    setImages(newImages);
    onImagesUpdated?.(newImages);

    try {
      const imageIds = newImages.map((img) => img.id);
      await reorderPropertyImages(propertyId, imageIds);
    } catch (err: any) {
      // Revert on failure
      setImages(images);
      onImagesUpdated?.(images);
      setError("Failed to save reordered photos.");
    }
  };

  return (
    <div className="bg-white rounded-[16px] border border-[#172023]/10 p-6 flex flex-col gap-6 shadow-sm font-sans">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#172023]/10 pb-4">
        <div>
          <h3 className="font-semibold text-[20px] text-[#172023] leading-tight">
            Property Photos & Media
          </h3>
          <p className="text-[14px] text-[#172023]/60 mt-1">
            Upload high-resolution property images (max 10 per batch, up to 10MB each). Reorder and select the primary cover photo.
          </p>
        </div>

        {/* Upload Trigger Button */}
        <div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
            disabled={uploading}
            className="hidden"
            id={`property-file-upload-${propertyId}`}
          />
          <label
            htmlFor={`property-file-upload-${propertyId}`}
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full font-medium text-[14px] text-white cursor-pointer transition-all duration-200 shadow-sm ${
              uploading ? "opacity-50 cursor-not-allowed" : "hover:opacity-90 active:scale-95"
            }`}
            style={{ backgroundColor: GREEN }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            Select Photos
          </label>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-[12px] text-[14px] flex items-center justify-between gap-2">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-600 hover:text-red-800 font-bold">
            &times;
          </button>
        </div>
      )}

      {/* Success Message */}
      {successMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-[12px] text-[14px] flex items-center justify-between gap-2">
          <span>{successMessage}</span>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-700 hover:text-emerald-900 font-bold">
            &times;
          </button>
        </div>
      )}

      {/* Pending Upload Previews */}
      {previewFiles.length > 0 && (
        <div className="bg-[#f8fafb] border border-[#07be8a]/30 rounded-[14px] p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-[15px] text-[#172023]">
              {previewFiles.length} photo{previewFiles.length > 1 ? "s" : ""} selected for upload
            </span>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={cancelPendingUpload}
                disabled={uploading}
                className="px-4 py-1.5 rounded-full border border-[#172023]/20 text-[13px] font-medium text-[#172023]/70 hover:bg-gray-100 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUpload}
                disabled={uploading}
                className="px-5 py-1.5 rounded-full text-white text-[13px] font-semibold flex items-center gap-2 disabled:opacity-50 transition-all active:scale-95"
                style={{ backgroundColor: GREEN }}
              >
                {uploading ? (
                  <>
                    <svg className="animate-spin size-4 text-white" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Uploading...
                  </>
                ) : (
                  `Upload ${previewFiles.length} Photo${previewFiles.length > 1 ? "s" : ""}`
                )}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {previewFiles.map((item, idx) => (
              <div key={idx} className="relative aspect-video rounded-[10px] overflow-hidden border border-gray-200 group bg-gray-100">
                <img src={item.url} alt={item.file.name} className="size-full object-cover" />
                <span className="absolute bottom-1 left-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded truncate max-w-[90%]">
                  {item.file.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Existing Images Gallery */}
      {loading ? (
        <div className="py-12 flex flex-col items-center justify-center text-[#172023]/50 gap-2">
          <svg className="animate-spin size-6 text-[#07be8a]" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          <span className="text-[14px]">Loading property photos...</span>
        </div>
      ) : images.length === 0 ? (
        <div className="py-12 border-2 border-dashed border-[#172023]/15 rounded-[14px] flex flex-col items-center justify-center text-center p-6 bg-gray-50/50">
          <div className="size-14 rounded-full bg-[#07be8a]/10 flex items-center justify-center mb-3 text-[#07be8a]">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
          </div>
          <p className="font-medium text-[16px] text-[#172023]">
            No photos uploaded yet
          </p>
          <p className="text-[13px] text-[#172023]/50 mt-1 max-w-sm">
            Select up to 10 photos to showcase this property on the listing and detail pages.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {images.map((img, idx) => (
            <div
              key={img.id}
              className={`relative flex flex-col rounded-[12px] overflow-hidden border transition-all duration-200 bg-white group shadow-sm ${
                img.is_thumbnail
                  ? "border-[#07be8a] ring-2 ring-[#07be8a]/20"
                  : "border-[#172023]/10 hover:border-[#172023]/30"
              }`}
            >
              {/* Image Preview */}
              <div className="relative aspect-[4/3] bg-gray-100 overflow-hidden">
                <img
                  src={img.image_url}
                  alt={img.caption || "Property photo"}
                  className="size-full object-cover group-hover:scale-105 transition-transform duration-300"
                />

                {/* Badges & Status */}
                {img.is_thumbnail ? (
                  <span
                    className="absolute top-2 left-2 px-2.5 py-1 rounded-full text-white text-[11px] font-semibold tracking-wide uppercase shadow-sm flex items-center gap-1"
                    style={{ backgroundColor: GREEN }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                    Thumbnail
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleSetThumbnail(img.id)}
                    className="absolute top-2 left-2 px-2.5 py-1 rounded-full bg-black/60 hover:bg-black/80 text-white text-[11px] font-medium backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  >
                    Set as Thumbnail
                  </button>
                )}

                {/* Delete Button */}
                <button
                  type="button"
                  onClick={() => handleDelete(img.id)}
                  title="Delete Photo"
                  className="absolute top-2 right-2 size-7 rounded-full bg-red-600/80 hover:bg-red-700 text-white flex items-center justify-center text-[14px] backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                </button>
              </div>

              {/* Controls Footer */}
              <div className="p-3 bg-white flex items-center justify-between border-t border-[#172023]/5">
                <span className="text-[12px] text-[#172023]/50 font-medium truncate max-w-[120px]">
                  {img.caption || `Photo ${idx + 1}`}
                </span>

                {/* Move Left / Right Reorder */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={idx === 0}
                    onClick={() => handleMove(idx, "left")}
                    title="Move Left"
                    className="size-6 rounded flex items-center justify-center text-[#172023]/60 hover:text-[#172023] hover:bg-gray-100 disabled:opacity-20 disabled:hover:bg-transparent cursor-pointer"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="15 18 9 12 15 6" />
                    </svg>
                  </button>
                  <span className="text-[11px] font-semibold text-[#172023]/40 min-w-[16px] text-center">
                    {idx + 1}
                  </span>
                  <button
                    type="button"
                    disabled={idx === images.length - 1}
                    onClick={() => handleMove(idx, "right")}
                    title="Move Right"
                    className="size-6 rounded flex items-center justify-center text-[#172023]/60 hover:text-[#172023] hover:bg-gray-100 disabled:opacity-20 disabled:hover:bg-transparent cursor-pointer"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
