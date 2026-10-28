import ListingABI from "../../../shared/abi/Listing.json";
import MatchingEngineABI from "../../../shared/abi/MatchingEngine.json";
import ForecastRegistryABI from "../../../shared/abi/ForecastRegistry.json";

// Re-export ABIs for use in wagmi hooks
export { ListingABI, MatchingEngineABI, ForecastRegistryABI };

import testnetDeployments from "../../../deployments/testnet.json";

// Contract addresses — loaded from deployments/testnet.json via env or hardcoded for dev
export function getContractAddresses() {
  const local = testnetDeployments.localhost;
  return {
    listing: (process.env.NEXT_PUBLIC_LISTING_ADDRESS ||
      local.Listing) as `0x${string}`,
    matchingEngine: (process.env.NEXT_PUBLIC_MATCHING_ENGINE_ADDRESS ||
      local.MatchingEngine) as `0x${string}`,
    forecastRegistry: (process.env.NEXT_PUBLIC_FORECAST_REGISTRY_ADDRESS ||
      local.ForecastRegistry) as `0x${string}`,
  };
}

// Food type enum matching the contract
export const FOOD_TYPES = [
  { value: 0, label: "Cooked" },
  { value: 1, label: "Raw" },
  { value: 2, label: "Packaged" },
  { value: 3, label: "Bakery" },
  { value: 4, label: "Dairy" },
  { value: 5, label: "Produce" },
] as const;

// Quality tier enum
export const QUALITY_TIERS = [
  { value: 0, label: "High", description: "Fresh, well within expiry" },
  { value: 1, label: "Medium", description: "Good condition, nearing expiry" },
  { value: 2, label: "Low", description: "Edible, close to expiry" },
] as const;

// Status enum
export const STATUS_LABELS: Record<string, string> = {
  Open: "Open",
  Matched: "Matched",
  Settled: "Settled",
  Expired: "Expired",
  Cancelled: "Cancelled",
};
