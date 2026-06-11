import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

process.env.FIREBASE_PROJECT_ID = 'test-project'
process.env.FIREBASE_CLIENT_EMAIL = 'firebase-adminsdk@test-project.iam.gserviceaccount.com'
process.env.FIREBASE_PRIVATE_KEY_BASE64 = Buffer
  .from('-----BEGIN PRIVATE KEY-----\ntest\n-----END PRIVATE KEY-----\n')
  .toString('base64')
process.env.FIREBASE_DATABASE_URL = 'https://test-project.firebaseio.com'
process.env.ADDON_BASE_URL = 'https://addon.example.com'
process.env.ANALYTICS_ENABLED = 'false'
process.env.ANALYTICS_TIME_ZONE = 'UTC'
process.env.ANALYTICS_IP_SALT = 'test-salt'
process.env.LINK_WRITE_TOKEN = 'secret-write-token'

const FirebaseMockObj = vi.hoisted(() => {
  const StateObj: { data: Record<string, any> } = {
    data: {},
  }

  function CloneObj(ValueObj: unknown): any {
    return ValueObj === undefined ? undefined : JSON.parse(JSON.stringify(ValueObj))
  }

  function GetValue(PathStr: string): any {
    return PathStr
      .split('/')
      .filter(Boolean)
      .reduce((CurrentObj, PartStr) => CurrentObj?.[PartStr], StateObj.data)
  }

  function SetValue(PathStr: string, ValueObj: unknown): void {
    const PartsArr = PathStr.split('/').filter(Boolean)
    const LastPartStr = PartsArr.pop()

    if (!LastPartStr) {
      return
    }

    let CurrentObj = StateObj.data

    for (const PartStr of PartsArr) {
      CurrentObj[PartStr] = CurrentObj[PartStr] || {}
      CurrentObj = CurrentObj[PartStr]
    }

    CurrentObj[LastPartStr] = CloneObj(ValueObj)
  }

  function BuildSnapshot(PathStr: string) {
    return {
      exists: () => GetValue(PathStr) !== undefined && GetValue(PathStr) !== null,
      val: () => CloneObj(GetValue(PathStr)),
    }
  }

  return {
    StateObj,
    RealtimeDb: {
      ref: (PathStr: string) => ({
        get: async () => BuildSnapshot(PathStr),
        set: async (ValueObj: unknown) => {
          SetValue(PathStr, ValueObj)
        },
        transaction: async (UpdaterFn: (CurrentObj: any) => unknown) => {
          const NextValueObj = UpdaterFn(CloneObj(GetValue(PathStr)) ?? null)

          if (NextValueObj !== undefined) {
            SetValue(PathStr, NextValueObj)
          }

          return {
            committed: NextValueObj !== undefined,
            snapshot: BuildSnapshot(PathStr),
          }
        },
      }),
    },
  }
})

vi.mock('../src/services/firebase.service.js', () => ({
  RealtimeDb: FirebaseMockObj.RealtimeDb,
}))

describe('Stremio Stream Store app', () => {
  let AppObj: Awaited<ReturnType<typeof import('../src/app.js').BuildApp>>

  beforeAll(async () => {
    const AppModuleObj = await import('../src/app.js')
    AppObj = await AppModuleObj.BuildApp()
    await AppObj.ready()
  })

  beforeEach(() => {
    FirebaseMockObj.StateObj.data = {}
  })

  afterAll(async () => {
    await AppObj.close()
  })

  it('returns a professional manifest with the configured base URL', async () => {
    const ResponseObj = await AppObj.inject({
      method: 'GET',
      url: '/manifest.json',
    })

    expect(ResponseObj.statusCode).toBe(200)
    expect(ResponseObj.json()).toMatchObject({
      id: 'org.stremio.stream.store',
      version: '1.0.0',
      name: 'Stremio Stream Store',
      logo: 'https://addon.example.com/public/logo.png',
      behaviorHints: {
        configurable: true,
      },
    })
  })

  it('requires the write token when saving movie links', async () => {
    const ResponseObj = await AppObj.inject({
      method: 'POST',
      url: '/api/link/movie',
      payload: {
        imdbId: 'tt1234567',
        url: 'https://cdn.example.com/movie.mp4',
      },
    })

    expect(ResponseObj.statusCode).toBe(401)
    expect(ResponseObj.json()).toMatchObject({
      ok: false,
      error: {
        code: 'UNAUTHORIZED',
      },
    })
  })

  it('rejects unsafe stream URLs', async () => {
    const ResponseObj = await AppObj.inject({
      method: 'POST',
      url: '/api/link/movie',
      headers: {
        authorization: 'Bearer secret-write-token',
      },
      payload: {
        imdbId: 'tt1234567',
        url: 'http://127.0.0.1/movie.mp4',
      },
    })

    expect(ResponseObj.statusCode).toBe(400)
    expect(ResponseObj.json()).toMatchObject({
      ok: false,
      error: {
        code: 'VALIDATION_ERROR',
      },
    })
  })

  it('saves, replaces, and serves a movie stream', async () => {
    const FirstSaveResponseObj = await AppObj.inject({
      method: 'POST',
      url: '/api/link/movie',
      headers: {
        authorization: 'Bearer secret-write-token',
      },
      payload: {
        imdbId: 'tt1234567',
        url: 'https://cdn.example.com/movie.mp4',
      },
    })
    const SecondSaveResponseObj = await AppObj.inject({
      method: 'POST',
      url: '/api/link/movie',
      headers: {
        authorization: 'Bearer secret-write-token',
      },
      payload: {
        imdbId: 'tt1234567',
        url: 'https://cdn.example.com/movie-v2.mp4',
      },
    })
    const StreamResponseObj = await AppObj.inject({
      method: 'GET',
      url: '/stream/movie/tt1234567.json',
    })

    expect(FirstSaveResponseObj.statusCode).toBe(200)
    expect(FirstSaveResponseObj.json().wasCreated).toBe(true)
    expect(SecondSaveResponseObj.statusCode).toBe(200)
    expect(SecondSaveResponseObj.json().wasCreated).toBe(false)
    expect(StreamResponseObj.statusCode).toBe(200)
    expect(StreamResponseObj.json()).toEqual({
      streams: [
        {
          title: 'Custom Stream',
          url: 'https://cdn.example.com/movie-v2.mp4',
        },
      ],
    })
  })

  it('saves and serves a series stream with Stremio id format', async () => {
    const SaveResponseObj = await AppObj.inject({
      method: 'POST',
      url: '/api/link/serie',
      headers: {
        authorization: 'Bearer secret-write-token',
      },
      payload: {
        imdbId: 'tt7654321',
        season: 1,
        episode: 2,
        url: 'https://cdn.example.com/episode.mp4',
      },
    })
    const StreamResponseObj = await AppObj.inject({
      method: 'GET',
      url: '/stream/series/tt7654321:1:2.json',
    })

    expect(SaveResponseObj.statusCode).toBe(200)
    expect(StreamResponseObj.statusCode).toBe(200)
    expect(StreamResponseObj.json().streams[0].url).toBe('https://cdn.example.com/episode.mp4')
  })
})
