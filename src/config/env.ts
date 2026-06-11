import 'dotenv/config'
import { readFileSync } from 'node:fs'
import path from 'node:path'

import { z } from 'zod'

function NormalizeBaseUrlStr(BaseUrlStr: string): string {
  return BaseUrlStr.replace(/\/$/, '')
}

function GetPackageVersionStr(): string {
  try {
    const PackageJsonPathStr = path.join(process.cwd(), 'package.json')
    const PackageJsonObj = JSON.parse(readFileSync(PackageJsonPathStr, 'utf-8')) as { version?: unknown }

    return typeof PackageJsonObj.version === 'string' ? PackageJsonObj.version : '1.0.0'
  } catch {
    return '1.0.0'
  }
}

function IsValidTimeZone(TimeZoneStr: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: TimeZoneStr }).format(new Date())
    return true
  } catch {
    return false
  }
}

const OptionalStringSchema = z
  .preprocess(
    (ValueObj) => typeof ValueObj === 'string' ? ValueObj.trim() : undefined,
    z.string().optional(),
  )
  .transform((ValueStr) => ValueStr || '')

const PositiveIntegerSchema = z
  .preprocess((ValueObj) => {
    if (ValueObj === undefined || ValueObj === '') {
      return undefined
    }

    return Number(ValueObj)
  }, z.number().int().positive().default(3000))

const BooleanSchema = z
  .preprocess((ValueObj) => {
    if (ValueObj === undefined || ValueObj === '') {
      return undefined
    }

    if (typeof ValueObj !== 'string') {
      return ValueObj
    }

    const NormalizedValueStr = ValueObj.trim().toLowerCase()

    if (['1', 'true', 'yes', 'on'].includes(NormalizedValueStr)) {
      return true
    }

    if (['0', 'false', 'no', 'off'].includes(NormalizedValueStr)) {
      return false
    }

    return ValueObj
  }, z.boolean().default(true))

const EnvSchema = z.object({
  PORT: PositiveIntegerSchema,
  ADDON_BASE_URL: z.string().trim().url('ADDON_BASE_URL must be a valid URL').transform(NormalizeBaseUrlStr),
  FIREBASE_PROJECT_ID: z.string().trim().min(1, 'FIREBASE_PROJECT_ID is required'),
  FIREBASE_CLIENT_EMAIL: z.string().trim().email('FIREBASE_CLIENT_EMAIL must be a valid email'),
  FIREBASE_PRIVATE_KEY_BASE64: z.string().trim().min(1, 'FIREBASE_PRIVATE_KEY_BASE64 is required'),
  FIREBASE_DATABASE_URL: z.string().trim().url('FIREBASE_DATABASE_URL must be a valid URL'),
  ANALYTICS_READ_TOKEN: OptionalStringSchema,
  ANALYTICS_TIME_ZONE: z.string().trim().default('UTC').refine(IsValidTimeZone, 'ANALYTICS_TIME_ZONE must be a valid IANA time zone'),
  ANALYTICS_IP_SALT: OptionalStringSchema,
  ANALYTICS_ENABLED: BooleanSchema,
  LINK_WRITE_TOKEN: OptionalStringSchema,
  VERCEL: OptionalStringSchema,
  NODE_ENV: OptionalStringSchema,
})

const ParsedEnvObj = EnvSchema.parse(process.env)

function GetFirebasePrivateKeyStr(PrivateKeyBase64Str: string): string {
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

const IsProductionBool = ParsedEnvObj.NODE_ENV === 'production' || Boolean(ParsedEnvObj.VERCEL)

if (IsProductionBool && ParsedEnvObj.ANALYTICS_ENABLED && !ParsedEnvObj.ANALYTICS_IP_SALT) {
  throw new Error('ANALYTICS_IP_SALT is required when analytics is enabled in production')
}

export const Env = {
  PORT: ParsedEnvObj.PORT,
  ADDON_BASE_URL: ParsedEnvObj.ADDON_BASE_URL,
  ADDON_ID: 'org.stremio.stream.store',
  ADDON_NAME: 'Stremio Stream Store',
  ADDON_VERSION: GetPackageVersionStr(),
  ADDON_DESCRIPTION: 'Save and serve custom stream links for movies and TV episodes using IMDb IDs. Free and open source.',
  FIREBASE_PROJECT_ID: ParsedEnvObj.FIREBASE_PROJECT_ID,
  FIREBASE_CLIENT_EMAIL: ParsedEnvObj.FIREBASE_CLIENT_EMAIL,
  FIREBASE_PRIVATE_KEY: GetFirebasePrivateKeyStr(ParsedEnvObj.FIREBASE_PRIVATE_KEY_BASE64),
  FIREBASE_DATABASE_URL: ParsedEnvObj.FIREBASE_DATABASE_URL,
  ANALYTICS_READ_TOKEN: ParsedEnvObj.ANALYTICS_READ_TOKEN,
  ANALYTICS_TIME_ZONE: ParsedEnvObj.ANALYTICS_TIME_ZONE,
  ANALYTICS_IP_SALT: ParsedEnvObj.ANALYTICS_IP_SALT || ParsedEnvObj.FIREBASE_PROJECT_ID,
  ANALYTICS_ENABLED: ParsedEnvObj.ANALYTICS_ENABLED,
  LINK_WRITE_TOKEN: ParsedEnvObj.LINK_WRITE_TOKEN,
  IS_VERCEL: Boolean(ParsedEnvObj.VERCEL),
} as const
