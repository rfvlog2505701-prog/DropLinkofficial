import { callOtpProvider } from '../../lib/otp-provider.js';

export const config = { maxDuration: 30 };

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ success: false, message: 'Method not allowed.' });
  }

  const email = String(req.body?.email || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    return res.status(400).json({ success: false, message: 'সঠিক ইমেইল ঠিকানা দাও।' });
  }

  try {
    await callOtpProvider('send', { email });
    return res.status(200).json({ success: true, message: 'OTP পাঠানো হয়েছে।' });
  } catch (error) {
    console.error('OTP send failed:', error.message);
    return res.status(error.status || 502).json({ success: false, message: error.message });
  }
}
