export default function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  const required = [
    'FIREBASE_API_KEY',
    'FIREBASE_AUTH_DOMAIN',
    'FIREBASE_PROJECT_ID',
    'FIREBASE_MESSAGING_SENDER_ID',
    'FIREBASE_APP_ID',
  ];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length) {
    return res.status(500).json({
      error: `Missing Firebase environment variables: ${missing.join(', ')}`,
    });
  }

  // Firebase Web config is public client configuration, not an authorization secret.
  // Actual data access is restricted by Firestore Rules.
  return res.status(200).json({
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    databaseURL: process.env.FIREBASE_DATABASE_URL || undefined,
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || undefined,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID,
    measurementId: process.env.FIREBASE_MEASUREMENT_ID || undefined,
  });
}
