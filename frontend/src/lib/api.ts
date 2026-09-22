const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

// ---------------------------------------------------------
// Listings
// ---------------------------------------------------------

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

  const queryString = query.toString();

  const res = await fetch(
    `${API_BASE}/listings${queryString ? `?${queryString}` : ""}`,
  );

  if (!res.ok) {
    throw new Error("Failed to fetch listings");
  }

  return res.json();
}

export async function fetchListing(id: string) {
  const res = await fetch(`${API_BASE}/listings/${id}`);

  if (!res.ok) {
    throw new Error("Failed to fetch listing");
  }

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
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error("Failed to prepare transaction");
  }

  return res.json();
}

export async function uploadToIpfs(file: File) {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_BASE}/ipfs/upload`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    throw new Error("Failed to upload to IPFS");
  }

  return res.json();
}

// ---------------------------------------------------------
// Matching
// ---------------------------------------------------------

export async function fetchMatch(id: string) {
  const res = await fetch(`${API_BASE}/matches/${id}`);

  if (!res.ok) {
    throw new Error("Failed to fetch match");
  }

  return res.json();
}

// ---------------------------------------------------------
// Orders — Person B
// ---------------------------------------------------------

export async function fetchOrders(params?: {
  ngoAddress?: string;
  status?: string;
  limit?: number;
  offset?: number;
}) {
  const query = new URLSearchParams();

  if (params?.ngoAddress) {
    query.set("ngoAddress", params.ngoAddress);
  }

  if (params?.status) {
    query.set("status", params.status);
  }

  if (params?.limit !== undefined) {
    query.set("limit", String(params.limit));
  }

  if (params?.offset !== undefined) {
    query.set("offset", String(params.offset));
  }

  const queryString = query.toString();

  const res = await fetch(
    `${API_BASE}/orders${queryString ? `?${queryString}` : ""}`,
  );

  if (!res.ok) {
    throw new Error("Failed to fetch orders");
  }

  return res.json();
}

export async function fetchOrder(id: string) {
  const res = await fetch(`${API_BASE}/orders/${id}`);

  if (!res.ok) {
    throw new Error("Failed to fetch order");
  }

  return res.json();
}

export async function preparePlaceOrderTx(body: {
  quantity: number;
  urgencyFlag: boolean;
  locationHash: string;
}) {
  const res = await fetch(`${API_BASE}/orders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error("Failed to prepare place order transaction");
  }

  return res.json();
}

export async function prepareCancelOrderTx(orderId: string) {
  const res = await fetch(`${API_BASE}/orders/${orderId}/cancel`, {
    method: "POST",
  });

  if (!res.ok) {
    throw new Error("Failed to prepare cancel order transaction");
  }

  return res.json();
}

// ---------------------------------------------------------
// Handoffs — Person B
// ---------------------------------------------------------

export async function fetchHandoffs(params?: {
  matchId?: string;
  stage?: number;
  limit?: number;
  offset?: number;
}) {
  const query = new URLSearchParams();

  if (params?.matchId) {
    query.set("matchId", params.matchId);
  }

  if (params?.stage !== undefined) {
    query.set("stage", String(params.stage));
  }

  if (params?.limit !== undefined) {
    query.set("limit", String(params.limit));
  }

  if (params?.offset !== undefined) {
    query.set("offset", String(params.offset));
  }

  const queryString = query.toString();

  const res = await fetch(
    `${API_BASE}/handoffs${queryString ? `?${queryString}` : ""}`,
  );

  if (!res.ok) {
    throw new Error("Failed to fetch handoffs");
  }

  return res.json();
}

export async function fetchHandoffsByMatchId(matchId: string) {
  const res = await fetch(
    `${API_BASE}/handoffs/${encodeURIComponent(matchId)}`,
  );

  if (!res.ok) {
    throw new Error("Failed to fetch custody trail");
  }

  return res.json();
}

export async function prepareRecordHandoffTx(body: {
  matchId: string;
  stage: number;
  actor: string;
}) {
  const res = await fetch(`${API_BASE}/handoffs`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error("Failed to prepare handoff transaction");
  }

  return res.json();
}

// ---------------------------------------------------------
// Food Credit Tokens — Person B
// ---------------------------------------------------------

export async function fetchTokensByDonor(donorAddress: string) {
  const res = await fetch(
    `${API_BASE}/tokens/${encodeURIComponent(donorAddress)}`,
  );

  if (!res.ok) {
    throw new Error("Failed to fetch Food Credit Tokens");
  }

  return res.json();
}

export async function fetchTokensByMatch(matchId: string) {
  const res = await fetch(
    `${API_BASE}/tokens/match/${encodeURIComponent(matchId)}`,
  );

  if (!res.ok) {
    throw new Error("Failed to fetch Food Credit Tokens for match");
  }

  return res.json();
}
