// Centralized pricing/limits configuration. Nothing below is rendered
// verbatim as marketing copy — UI components read from this file rather
// than hard-coding numbers so limits can change in one place.

export type PlanId = 'free' | 'paid';

export interface PlanLimits {
  id: PlanId;
  label: string;
  priceUsdPerMonth: number;
  monthlyAssignments: number;
  monthlyAiRequests: number;
  monthlySearches: number;
  maxUploadMb: number;
}

export const PLANS: Record<PlanId, PlanLimits> = {
  free: {
    id: 'free',
    label: 'Free',
    priceUsdPerMonth: 0,
    monthlyAssignments: 3,
    monthlyAiRequests: 60,
    monthlySearches: 15,
    maxUploadMb: 10
  },
  paid: {
    id: 'paid',
    label: 'Student Plus',
    priceUsdPerMonth: 9,
    monthlyAssignments: 40,
    monthlyAiRequests: 1500,
    monthlySearches: 300,
    maxUploadMb: 25
  }
};
