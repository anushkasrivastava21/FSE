const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export async function fetchListings(params?: {
  donor?: string;
  status?: string;
  region?: string;
  limit?: number;
  offset?: number;
}) {
  const query = new URLSearchParams();
  if (params?.donor) query.set("donor", params.donor);
  if (params?.status) query.set("status", params.status);
  if (params?.region) query.set("region", params.region);
  if (params?.limit) query.set("limit", String(params.limit));
  if (params?.offset) query.set("offset", String(params.offset));

  const res = await fetch(`${API_BASE}/listings?${query.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch listings");
  return res.json();
}

export async function fetchListing(id: string) {
  const res = await fetch(`${API_BASE}/listings/${id}`);
  if (!res.ok) throw new Error("Failed to fetch listing");
  return res.json();
}

export async function prepareCreateListingTx(body: {
  foodType: number;
  quantity: number;
  expiryTimestamp: number;
  qualityTier: number;
  locationHash: string;
  metadataURI: string;
}) {
  const res = await fetch(`${API_BASE}/listings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("Failed to prepare transaction");
  return res.json();
}

export async function uploadToIpfs(file: File) {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_BASE}/ipfs/upload`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) throw new Error("Failed to upload to IPFS");
  return res.json();
}

export async function fetchMatch(id: string) {
  const res = await fetch(`${API_BASE}/matches/${id}`);
  if (!res.ok) throw new Error("Failed to fetch match");
  return res.json();
}
