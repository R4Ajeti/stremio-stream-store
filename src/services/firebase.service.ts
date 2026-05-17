import Admin from 'firebase-admin'

import { Env } from '../config/env.js'

if (!Admin.apps.length) {
  Admin.initializeApp({
    credential: Admin.credential.cert({
      projectId: Env.FIREBASE_PROJECT_ID,
      clientEmail: Env.FIREBASE_CLIENT_EMAIL,
      privateKey: Env.FIREBASE_PRIVATE_KEY_BASE64,
    }),
    databaseURL: Env.FIREBASE_DATABASE_URL,
  })
}

export const RealtimeDb = Admin.database()
