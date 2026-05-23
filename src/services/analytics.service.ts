import { track } from '@vercel/analytics/server'

export function trackRoute(pathStr: string, methodStr: string, extra?: Record<string, unknown>): void {
  // Only send analytics on Vercel deployments
  if (!process.env.VERCEL) return

  try {
    track('route', { path: pathStr, method: methodStr, ...extra })
  } catch (e) {
    // swallow errors to avoid affecting route responses
  }
}
