const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api"

export async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: options.body instanceof FormData ? undefined : { "Content-Type": "application/json" },
    ...options,
  })
  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data.message || "Request failed")
  }

  return data
}
