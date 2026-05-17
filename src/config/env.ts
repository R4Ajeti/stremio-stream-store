import 'dotenv/config'

function GetRequiredEnv(NameStr: string): string {
  const ValueStr = process.env[NameStr]

  if (!ValueStr) {
    throw new Error(`Missing environment variable: ${NameStr}`)
  }

  return ValueStr
}

function GetOptionalEnv(NameStr: string, DefaultStr: string): string {
  return process.env[NameStr] || DefaultStr
}

function GetOptionalNumberEnv(NameStr: string, DefaultInt: number): number {
  const ValueStr = process.env[NameStr]

  if (!ValueStr) {
    return DefaultInt
  }

  const ValueInt = Number(ValueStr)

  if (Number.isNaN(ValueInt)) {
    throw new Error(`Invalid number environment variable: ${NameStr}`)
  }

  return ValueInt
}

function GetFirebasePrivateKey(): string {
  const Base64PrivateKeyStr = process.env.FIREBASE_PRIVATE_KEY_BASE64

  if (Base64PrivateKeyStr) {
    return Buffer.from(Base64PrivateKeyStr, 'base64').toString('utf-8')
  }

  return GetRequiredEnv('FIREBASE_PRIVATE_KEY').replace(/\\n/g, '\n')
}

export const Env = {
  PORT: GetOptionalNumberEnv('PORT', 3000),
  NODE_ENV: GetOptionalEnv('NODE_ENV', 'development'),

  ADDON_BASE_URL: GetOptionalEnv('ADDON_BASE_URL', `http://localhost:${GetOptionalNumberEnv('PORT', 3000)}`),
  ADDON_ID: GetOptionalEnv('ADDON_ID', 'org.stremio.stream.store'),
  ADDON_NAME: GetOptionalEnv('ADDON_NAME', 'Stremio Stream Store'),
  ADDON_DESCRIPTION: GetOptionalEnv(
    'ADDON_DESCRIPTION',
    'Save and serve custom stream links for movies and TV episodes using IMDb IDs.',
  ),

  ADMIN_TOKEN: process.env.ADMIN_TOKEN || '',

  FIREBASE_PROJECT_ID: GetRequiredEnv('FIREBASE_PROJECT_ID'),
  FIREBASE_CLIENT_EMAIL: GetRequiredEnv('FIREBASE_CLIENT_EMAIL'),
  FIREBASE_PRIVATE_KEY: GetFirebasePrivateKey(),
  FIREBASE_DATABASE_URL: GetRequiredEnv('FIREBASE_DATABASE_URL'),
}