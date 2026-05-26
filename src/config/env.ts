import 'dotenv/config'

function GetRequiredEnv(NameStr: string): string {
  const ValueStr = process.env[NameStr]

  if (!ValueStr) {
    throw new Error(`Missing environment variable: ${NameStr}`)
  }

  return ValueStr
}

function GetOptionalNumberEnv(NameStr: string, DefaultInt: number): number {
  const ValueStr = process.env[NameStr]

  if (!ValueStr) {
    return DefaultInt
  }

  const ValueInt = Number(ValueStr)

  if (!Number.isInteger(ValueInt) || ValueInt <= 0) {
    throw new Error(`Invalid number environment variable: ${NameStr}`)
  }

  return ValueInt
}

function GetFirebasePrivateKeyStr(): string {
  const PrivateKeyBase64Str = GetRequiredEnv('FIREBASE_PRIVATE_KEY_BASE64')
  const PrivateKeyStr = Buffer
    .from(PrivateKeyBase64Str, 'base64')
    .toString('utf-8')
    .replace(/\\n/g, '\n')

  if (!PrivateKeyStr.includes('-----BEGIN PRIVATE KEY-----')) {
    throw new Error('Invalid FIREBASE_PRIVATE_KEY_BASE64: decoded value is missing BEGIN PRIVATE KEY header')
  }

  if (!PrivateKeyStr.includes('-----END PRIVATE KEY-----')) {
    throw new Error('Invalid FIREBASE_PRIVATE_KEY_BASE64: decoded value is missing END PRIVATE KEY footer')
  }

  return PrivateKeyStr
}

function NormalizeBaseUrlStr(BaseUrlStr: string): string {
  return BaseUrlStr.replace(/\/$/, '')
}

export const Env = {
  PORT: GetOptionalNumberEnv('PORT', 3000),
  ADDON_BASE_URL: NormalizeBaseUrlStr(GetRequiredEnv('ADDON_BASE_URL')),
  ADDON_ID: 'org.stremio.stream.store',
  ADDON_NAME: 'Stremio Stream Store',
  ADDON_DESCRIPTION: 'Save and serve custom stream links for movies and TV episodes using IMDb IDs. Free and open source. Support development: https://ko-fi.com/r4ajeti',
  FIREBASE_PROJECT_ID: GetRequiredEnv('FIREBASE_PROJECT_ID'),
  FIREBASE_CLIENT_EMAIL: GetRequiredEnv('FIREBASE_CLIENT_EMAIL'),
  FIREBASE_PRIVATE_KEY: GetFirebasePrivateKeyStr(),
  FIREBASE_DATABASE_URL: GetRequiredEnv('FIREBASE_DATABASE_URL'),
} as const
