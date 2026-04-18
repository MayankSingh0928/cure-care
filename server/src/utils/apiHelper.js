export async function safeJsonFetch(url, options = {}) {
  const timeoutMs = options.timeoutMs || 5000
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url, {
      ...options,
      signal: options.signal || controller.signal,
    })
    if (!response.ok) {
      return { ok: false, status: response.status, data: null }
    }
    return { ok: true, status: response.status, data: await response.json() }
  } catch (error) {
    return { ok: false, status: 0, data: null, error: error.message }
  } finally {
    clearTimeout(timeout)
  }
}
