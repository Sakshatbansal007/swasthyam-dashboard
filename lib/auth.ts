import crypto from 'crypto';

const SECRET = process.env.AUTH_SECRET_KEY || 'swasthyam-secure-session-key-2025';
const DEFAULT_ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const DEFAULT_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'swasthyam2025';

const DEFAULT_EMPLOYEE_USERNAME = process.env.EMPLOYEE_USERNAME || 'employee';
const DEFAULT_EMPLOYEE_PASSWORD = process.env.EMPLOYEE_PASSWORD || 'staff2025';

export const AUTH_COOKIE_NAME = 'swasthyam_auth';

export type UserRole = 'admin' | 'employee';

export interface AuthUser {
  username: string;
  role: UserRole;
}

export function authenticateUser(username: string, password: string): AuthUser | null {
  const cleanUser = username.trim().toLowerCase();

  const adminUser = DEFAULT_ADMIN_USERNAME.toLowerCase();
  if (cleanUser === adminUser && password === DEFAULT_ADMIN_PASSWORD) {
    return { username: DEFAULT_ADMIN_USERNAME, role: 'admin' };
  }

  const employeeUser = DEFAULT_EMPLOYEE_USERNAME.toLowerCase();
  if (cleanUser === employeeUser && password === DEFAULT_EMPLOYEE_PASSWORD) {
    return { username: DEFAULT_EMPLOYEE_USERNAME, role: 'employee' };
  }

  return null;
}

export function verifyCredentials(username: string, password: string): boolean {
  return authenticateUser(username, password) !== null;
}

export function createSessionToken(username: string, role: UserRole = 'admin'): string {
  const timestamp = Date.now().toString();
  const payload = `${username}:${role}:${timestamp}`;
  const signature = crypto.createHmac('sha256', SECRET).update(payload).digest('hex');
  return Buffer.from(`${payload}:${signature}`).toString('base64');
}

export function getSessionUser(token: string): AuthUser | null {
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    const parts = decoded.split(':');

    // 4 parts: username:role:timestamp:signature
    if (parts.length === 4) {
      const [username, role, timestampStr, signature] = parts;
      const payload = `${username}:${role}:${timestampStr}`;
      const expectedSignature = crypto.createHmac('sha256', SECRET).update(payload).digest('hex');

      if (signature !== expectedSignature) return null;

      const timestamp = parseInt(timestampStr, 10);
      if (isNaN(timestamp)) return null;

      const maxAgeMs = 7 * 24 * 60 * 60 * 1000;
      if (Date.now() - timestamp > maxAgeMs) return null;

      return {
        username,
        role: role === 'employee' ? 'employee' : 'admin',
      };
    }

    // 3 parts (legacy token): username:timestamp:signature -> treat as admin
    if (parts.length === 3) {
      const [username, timestampStr, signature] = parts;
      const payload = `${username}:${timestampStr}`;
      const expectedSignature = crypto.createHmac('sha256', SECRET).update(payload).digest('hex');

      if (signature !== expectedSignature) return null;

      const timestamp = parseInt(timestampStr, 10);
      if (isNaN(timestamp)) return null;

      const maxAgeMs = 7 * 24 * 60 * 60 * 1000;
      if (Date.now() - timestamp > maxAgeMs) return null;

      return { username, role: 'admin' };
    }

    return null;
  } catch {
    return null;
  }
}

export function verifySessionToken(token: string): boolean {
  return getSessionUser(token) !== null;
}
