import { createContext, useContext } from "react";

import type { AdminBusinessDetailsResult } from "@/features/connect/shared/admin-client";

export const BusinessDetailsContext = createContext<AdminBusinessDetailsResult | null>(null);

export function useBusinessDetails() {
  return useContext(BusinessDetailsContext);
}
