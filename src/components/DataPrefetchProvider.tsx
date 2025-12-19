import { ReactNode, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { usePrefetchData } from "@/hooks/usePrefetch";

interface DataPrefetchProviderProps {
  children: ReactNode;
}

export const DataPrefetchProvider = ({ children }: DataPrefetchProviderProps) => {
  const { user, loading } = useAuth();
  
  // Prefetch data when user is authenticated
  usePrefetchData();

  return <>{children}</>;
};
