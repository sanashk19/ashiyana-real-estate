import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { fetchBusinessProfile, type BusinessProfileDto } from "@/lib/api";

const DEFAULT_PROFILE: BusinessProfileDto = {
  id: "default",
  broker_name: "Kassim Shaikh",
  broker_role: "Lead Broker & Founder",
  company_name: "Ashiyana Real Estate",
  phone: "+91 8888083558",
  whatsapp_number: "918888083558",
  email: "ashiyanarentbuysell@gmail.com",
  office_address: "Calangute & Panaji, Goa, India",
  facebook_url: null,
  instagram_url: null,
  olx_url: null,
};

interface BusinessProfileContextType {
  profile: BusinessProfileDto;
  loading: boolean;
  refreshProfile: () => Promise<void>;
}

const BusinessProfileContext = createContext<BusinessProfileContextType>({
  profile: DEFAULT_PROFILE,
  loading: false,
  refreshProfile: async () => {},
});

export function BusinessProfileProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<BusinessProfileDto>(DEFAULT_PROFILE);
  const [loading, setLoading] = useState(true);

  const refreshProfile = useCallback(async () => {
    try {
      const data = await fetchBusinessProfile();
      if (data && data.phone) {
        setProfile(data);
      }
    } catch (err) {
      console.warn("Could not load dynamic business profile, using defaults:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshProfile();
  }, [refreshProfile]);

  return (
    <BusinessProfileContext.Provider value={{ profile, loading, refreshProfile }}>
      {children}
    </BusinessProfileContext.Provider>
  );
}

export function useBusinessProfile() {
  return useContext(BusinessProfileContext);
}
