import { useNavigate } from "react-router";
import { fv } from "@/lib/shared";

interface BackButtonProps {
  label?: string;
  to?: string;
  fallback?: string;
  className?: string;
}

export function BackButton({
  label = "Back to Home",
  to,
  fallback = "/",
  className = "",
}: BackButtonProps) {
  const navigate = useNavigate();

  const handleBack = () => {
    // If target route explicitly specified, navigate there
    if (to) {
      navigate(to);
      return;
    }
    // If label mentions Home or fallback is root, navigate directly to home
    if (label.toLowerCase().includes("home") || fallback === "/") {
      navigate("/");
      return;
    }
    // Otherwise navigate to specified fallback
    navigate(fallback || "/");
  };

  return (
    <button
      onClick={handleBack}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-medium text-[#172023]/75 hover:text-[#172023] hover:bg-[#172023]/5 transition-all duration-200 cursor-pointer group select-none ${className}`}
      style={fv}
      type="button"
      aria-label={label}
    >
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="transition-transform duration-200 group-hover:-translate-x-0.5"
      >
        <path d="M19 12H5M12 19l-7-7 7-7" />
      </svg>
      <span>{label}</span>
    </button>
  );
}
