const rateLimitStore = new Map<string, { count: number; lastReset: number }>()

const WINDOW_MS = 15 * 60 * 1000
const MAX_REQUESTS = 10

export function rateLimit(identifier: string): { success: boolean; remaining: number; resetIn: number } {
  const now = Date.now()
  const record = rateLimitStore.get(identifier)

  if (!record || now - record.lastReset > WINDOW_MS) {
    rateLimitStore.set(identifier, { count: 1, lastReset: now })
    return { success: true, remaining: MAX_REQUESTS - 1, resetIn: WINDOW_MS }
  }

  if (record.count >= MAX_REQUESTS) {
    const resetIn = WINDOW_MS - (now - record.lastReset)
    return { success: false, remaining: 0, resetIn }
  }

  record.count++
  return { success: true, remaining: MAX_REQUESTS - record.count, resetIn: WINDOW_MS - (now - record.lastReset) }
}

export function getRateLimitIdentifier(ip: string | null, email?: string): string {
  return email || ip || "unknown"
}
