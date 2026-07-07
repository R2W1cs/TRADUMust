const AI_BASE = process.env.AI_SERVICE_URL || "http://localhost:8001";

export async function aiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${AI_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`AI service error ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}
