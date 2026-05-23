export function trackRoute(pathStr: string, methodStr: string, extra?: Record<string, unknown>): void {
  // Only send analytics on Vercel deployments
  if (!process.env.VERCEL) return

  ;(async () => {
    try {
      // Try to use the official package if available
      // The package exports can vary between versions, so try common names.
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const mod = await import('@vercel/analytics').catch(() => null) as any

      if (mod) {
        // Common entry points: event, track, default
        if (typeof mod.event === 'function') {
          mod.event('route', { path: pathStr, method: methodStr, ...extra })
          return
        }

        if (typeof mod.track === 'function') {
          mod.track({ name: 'route', props: { path: pathStr, method: methodStr, ...extra } })
          return
        }

        if (typeof mod.default === 'function') {
          mod.default('route', { path: pathStr, method: methodStr, ...extra })
          return
        }
      }

      // Fallback: send a lightweight POST to an optional insights endpoint if configured
      if (process.env.VERCEL_INSIGHTS_ENDPOINT) {
        try {
          await fetch(process.env.VERCEL_INSIGHTS_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path: pathStr, method: methodStr, extra, ts: new Date().toISOString() }),
          })
        } catch (e) {
          // ignore
        }
      }
    } catch (e) {
      // swallow errors to avoid affecting route responses
    }
  })()
}
