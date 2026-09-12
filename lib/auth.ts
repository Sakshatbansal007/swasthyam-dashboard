import crypto from 'crypto';

const SECRET = process.env.AUTH_SECRET_KEY || 'swasthyam-secure-session-key-2025';
const DEFAULT_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const DEFAULT_PASSWORD = process.env.ADMIN_PASSWORD || 'swasthyam2025';

export const AUTH_COOKIE_NAME = 'swasthyam_auth';

export function verifyCredentials(username: string, password: string): boolean {
  return username.trim() === DEFAULT_USERNAME && password === DEFAULT_PASSWORD;
}

export function createSessionToken(username: string): string {
  const timestamp = Date.now().toString();
  const payload = `${username}:${timestamp}`;
  const signature = crypto.createHmac('sha256', SECRET).update(payload).digest('hex');
  const token = Buffer.from(`${payload}:${signature}`).toString('base64');
  return token;
}

export function verifySessionToken(token: string): boolean {
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    const parts = decoded.split(':');
    if (parts.length !== 3) return false;

    const [username, timestampStr, signature] = parts;
    const payload = `${username}:${timestampStr}`;
    const expectedSignature = crypto.createHmac('sha256', SECRET).update(payload).digest('hex');

    if (signature !== expectedSignature) return false;

    const timestamp = parseInt(timestampStr, 10);
    if (isNaN(timestamp)) return false;

    // Check expiration: 7 days validity
    const maxAgeMs = 7 * 24 * 60 * 60 * 1000;
    if (Date.now() - timestamp > maxAgeMs) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}
