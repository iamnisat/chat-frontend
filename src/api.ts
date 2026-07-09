const API_BASE = import.meta.env.VITE_API_BASE_URL || "https://fusion.aunkur.ai/api/v1";

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

export async function fetchMessages(token: string, conversationId: number, page = 1, size = 10) {
  const res = await fetch(`${API_BASE}/messages/conversations/${conversationId}?page=${page}&size=${size}`, {
    method: "GET",
    headers: {
      accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
  });
  return res.json();
}

export async function createAdvisory(token: string, farmerId: number, type = "general") {
  const res = await fetch(`${API_BASE}/messages/advisory`, {
    method: "POST",
    headers: {
      accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      type,
      farmer_id: farmerId,
      reference_type: "farmer",
    }),
  });
  return res.json();
}
