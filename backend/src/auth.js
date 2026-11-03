import { betterAuth } from 'better-auth';
import { pool } from './db.js';
const production = process.env.NODE_ENV === 'production';
if (!process.env.BETTER_AUTH_SECRET || process.env.BETTER_AUTH_SECRET.length < 32) throw new Error('Set BETTER_AUTH_SECRET to at least 32 random characters.');
if (production && !process.env.BETTER_AUTH_URL?.startsWith('https://')) throw new Error('Production authentication requires an HTTPS URL.');
export const auth = betterAuth({
 database: pool,
 secret: process.env.BETTER_AUTH_SECRET,
 baseURL: process.env.BETTER_AUTH_URL || 'http://localhost:3001',
 trustedOrigins: [process.env.APP_ORIGIN || 'http://localhost:5173'],
 emailAndPassword: {enabled:true, minPasswordLength:12, maxPasswordLength:128},
 advanced: {ipAddress:{ipAddressHeaders:['x-trackyuhfood-client-ip']}, useSecureCookies:production, defaultCookieAttributes:{httpOnly:true,sameSite:'lax',secure:production}},
 rateLimit: {enabled:true, storage:'database'},
});
