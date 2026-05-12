const limits = new Map<string, { count: number, resetAt: number }>()

export function checkRateLimit(ip: string, maxRequests: number = 20, windowMs: number = 60000): boolean {
  const now = Date.now()
  let record = limits.get(ip)
  
  if (!record || record.resetAt < now) {
    record = { count: 1, resetAt: now + windowMs }
    limits.set(ip, record)
    return true
  }
  
  record.count++
  return record.count <= maxRequests
}
