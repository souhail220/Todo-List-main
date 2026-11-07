export type Todo = { id: number; title: string; completed: boolean; createdAt: string };

const BASE = (import.meta.env['VITE_API_BASE_URL'] as string | undefined) ?? "";
console.log(BASE);
function buildUrl(path: string, params?: Record<string, string>) {
  const origin = typeof window === "undefined" ? "http://localhost" : window.location.origin;
  const url = new URL(BASE.replace(/\/$/, "") + path, origin);
  if (params) url.search = new URLSearchParams(params).toString();
  return url.toString();
}

async function request<T>(method: string, path: string, params?: Record<string, string>): Promise<T | null> {
  let res: Response;
  try {
    res = await fetch(buildUrl(path, params), { method, headers: { Accept: "application/json" } });
  } catch {
    throw new Error("Cannot reach the server. Check that the backend is running and CORS is enabled.");
  }
  const text = await res.text();
  if (!res.ok) {
    let msg = `Request failed (${res.status})`;
    try {
      const j = JSON.parse(text);
      msg = j.message || j.error || msg;
    } catch {
      if (text && text.length < 200) msg = text;
    }
    throw new Error(msg);
  }
  if (!text) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

export const api = {
  list: async () => (await request<Todo[]>("GET", "/todos")) ?? [],
  create: (title: string) => request<Todo>("POST", "/todos", { title }),
  update: (id: number, title: string) => request<Todo>("PUT", `/todos/${id}/update`, { title }),
  complete: (id: number) => request<Todo>("PUT", `/todos/${id}/complete`),
  remove: (id: number) => request<unknown>("DELETE", `/todos/${id}`),
};
