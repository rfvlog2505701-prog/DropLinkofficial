const jsonHeaders = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
};

function getConfig() {
  const base = process.env.OTP_API_BASE_URL?.trim().replace(/\/+$/, '');
  const token = process.env.OTP_API_TOKEN?.trim();
  if (!base || !token) {
    throw new Error('OTP_API_BASE_URL and OTP_API_TOKEN must be configured in Vercel Environment Variables.');
  }
  return { base, token };
}

export async function callOtpProvider(action, payload) {
  const { base, token } = getConfig();
  const response = await fetch(`${base}/api/otp/${action}`, {
    method: 'POST',
    headers: { ...jsonHeaders, Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(15000),
    cache: 'no-store',
  });

  const raw = await response.text();
  let data;
  try { data = JSON.parse(raw); }
  catch { data = { message: raw.slice(0, 500) }; }

  const explicitFailure = data && typeof data === 'object' &&
    (data.success === false || data.valid === false || data.verified === false);

  if (!response.ok || explicitFailure) {
    const message = data?.message || data?.error || data?.detail || `OTP provider returned HTTP ${response.status}`;
    const error = new Error(String(message).slice(0, 500));
    error.status = response.status >= 400 && response.status < 600 ? response.status : 502;
    throw error;
  }

  return data;
}
