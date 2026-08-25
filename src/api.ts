const API_BASE =
  import.meta.env.VITE_API_BASE_URL || "https://fusion.aunkur.ai/api/v1";

export async function fetchConversations(token: string) {
  const res = await fetch(`${API_BASE}/messages/conversations`, {
    method: "GET",
    headers: {
      accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
  });
  return res.json();
}
export async function fetchCrops(
  token: string,
  page: number = 1,
  size: number = 100,
) {
  const params = new URLSearchParams({
    page: String(page),
    size: String(size),
  });

  const res = await fetch(`${API_BASE}/crops?${params.toString()}`, {
    method: "GET",
    headers: {
      accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch crops: ${res.status} ${res.statusText}`);
  }

  return res.json();
}

export async function fetchMessages(
  token: string,
  conversationId: number,
  page = 1,
  size = 10,
) {
  const res = await fetch(
    `${API_BASE}/messages/conversations/${conversationId}?page=${page}&size=${size}`,
    {
      method: "GET",
      headers: {
        accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    },
  );
  return res.json();
}

export async function createAdvisory(
  crop_id: number | null,
  token: string,
  farmerId: number,
  type = "crop",
) {
  const body: Record<string, unknown> = {
    crop: crop_id,
    reference_id: crop_id,
    type,
    farmer_id: farmerId,
    reference_type: "farmer",
  };

  if (crop_id != null) {
    body.reference_id = crop_id;
  }

  const res = await fetch(`${API_BASE}/messages/advisory`, {
    method: "POST",
    headers: {
      accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(
      `Failed to create advisory: ${res.status} ${res.statusText}`,
    );
  }

  return res.json();
}
