import { createBrowserRouter, RouterProvider } from "react-router";
import HomePage from "./pages/Home";
import PropertiesPage from "./pages/Properties";
import PropertyDetailPage from "./pages/PropertyDetail";
import ContactPage from "./pages/Contact";
import ServicesPage from "./pages/Services";
import AreaGuidePage from "./pages/AreaGuide";
import BrokerPortalPage from "./pages/BrokerPortal";
import SellPropertyPage from "./pages/SellProperty";
import SellerPortalPage from "./pages/SellerPortal";
import NotFoundPage from "./pages/NotFound";

import { Outlet, useLocation, useRouteError, Link } from "react-router";
import { AshiyanaLogo, GREEN } from "./lib/shared";
import { AlertCircle } from "lucide-react";
import { getApiErrorMessage } from "./lib/errorUtils";
import { useEffect } from "react";
import { BusinessProfileProvider } from "./context/BusinessProfileContext";

function RootLayout() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname]);

  return <Outlet />;
}

function RootErrorBoundary() {
  const error = useRouteError();
  const errorMsg = getApiErrorMessage(error, "An unexpected error occurred while loading this page.");

  return (
    <div className="min-h-screen bg-[#f8fafb] flex flex-col items-center justify-center p-6 font-sans text-[#172023]">
      <div className="w-full max-w-[480px] bg-white rounded-[24px] border border-[#172023]/10 p-8 shadow-sm text-center flex flex-col items-center gap-4">
        <AshiyanaLogo dark={true} className="h-[48px] mb-2" />
        <div className="size-12 rounded-full bg-red-100 flex items-center justify-center text-red-600">
          <AlertCircle className="size-6" />
        </div>
        <h1 className="text-[20px] font-bold text-[#172023]">
          Something went wrong
        </h1>
        <p className="text-[13.5px] text-[#172023]/70">
          {errorMsg}
        </p>
        <div className="flex items-center gap-3 mt-4">
          <button
            onClick={() => window.location.reload()}
            className="px-5 py-2.5 rounded-full text-white text-[13px] font-semibold transition-all hover:opacity-90 cursor-pointer"
            style={{ backgroundColor: GREEN }}
          >
            Reload Page
          </button>
          <Link
            to="/"
            className="px-5 py-2.5 rounded-full border border-[#172023]/20 text-[#172023] text-[13px] font-semibold hover:bg-gray-50 transition-colors"
          >
            Return Home
          </Link>
        </div>
      </div>
    </div>
  );
}

const router = createBrowserRouter([
  {
    element: <RootLayout />,
    ErrorBoundary: RootErrorBoundary,
    children: [
      { path: "/", Component: HomePage },
      { path: "/properties", Component: PropertiesPage },
      { path: "/property/:propertyId", Component: PropertyDetailPage },
      { path: "/properties/:propertyId", Component: PropertyDetailPage },
      { path: "/services", Component: ServicesPage },
      { path: "/contact", Component: ContactPage },
      { path: "/sell", Component: SellPropertyPage },
      { path: "/seller", Component: SellerPortalPage },
      { path: "/seller/login", Component: SellerPortalPage },
      { path: "/seller/register", Component: SellerPortalPage },
      { path: "/seller/dashboard", Component: SellerPortalPage },
      { path: "/area-guide", Component: AreaGuidePage },
      { path: "/goa-area-guide", Component: AreaGuidePage },
      { path: "/broker", Component: BrokerPortalPage },
      { path: "/admin", Component: BrokerPortalPage },
      { path: "*", Component: NotFoundPage },
    ],
  },
]);

export default function App() {
  useEffect(() => {
    document.title = "Ashiyana Buy Sell Rent Goa";
  }, []);

  return (
    <BusinessProfileProvider>
      <RouterProvider router={router} />
    </BusinessProfileProvider>
  );
}
