import { deploymentEnv, routes, type VercelConfig } from '@vercel/config/v1';

// The browser uploads to this same-origin path. Vercel forwards the raw multipart
// stream to the existing DropLink API and injects its private API key server-side.
// This avoids routing large upload bodies through a Vercel Function (4.5 MB cap).
const uploadApiBase = deploymentEnv('UPLOAD_API_BASE_URL').replace(/\/+$/, '');
const uploadApiKey = deploymentEnv('UPLOAD_API_KEY');

export const config: VercelConfig = {
  cleanUrls: false,
  rewrites: [
    routes.rewrite('/api/upload/file', `${uploadApiBase}/api/upload/file`, {
      requestHeaders: {
        'X-API-Key': uploadApiKey,
      },
    }),
    routes.rewrite('/api/health', `${uploadApiBase}/health`),
  ],
};
