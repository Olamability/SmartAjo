import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);

const ACCESS_TOKEN_EXPIRY = process.env.JWT_ACCESS_TOKEN_EXPIRY || '15m';
const REFRESH_TOKEN_EXPIRY = process.env.JWT_REFRESH_TOKEN_EXPIRY || '7d';

export interface JWTPayload {
  userId: string;
  email: string;
  type: 'access' | 'refresh';
}

// Hash password
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

// Verify password
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

// Generate access token
export async function generateAccessToken(userId: string, email: string): Promise<string> {
  const token = await new SignJWT({ userId, email, type: 'access' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_EXPIRY)
    .sign(JWT_SECRET);

  return token;
}

// Generate refresh token
export async function generateRefreshToken(userId: string, email: string): Promise<string> {
  const token = await new SignJWT({ userId, email, type: 'refresh' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(REFRESH_TOKEN_EXPIRY)
    .sign(JWT_SECRET);

  return token;
}

// Verify token
export async function verifyToken(token: string): Promise<JWTPayload> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as JWTPayload;
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
}

// Set auth cookies
export async function setAuthCookies(userId: string, email: string) {
  const accessToken = await generateAccessToken(userId, email);
  const refreshToken = await generateRefreshToken(userId, email);

  const cookieStore = await cookies();
  
  // Set access token (httpOnly, secure in production)
  cookieStore.set('accessToken', accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 15 * 60, // 15 minutes
    path: '/',
  });

  // Set refresh token (httpOnly, secure in production)
  cookieStore.set('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60, // 7 days
    path: '/',
  });

  return { accessToken, refreshToken };
}

// Clear auth cookies
export async function clearAuthCookies() {
  const cookieStore = await cookies();
  cookieStore.delete('accessToken');
  cookieStore.delete('refreshToken');
}

// Get current user from cookies
export async function getCurrentUser(): Promise<JWTPayload | null> {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('accessToken')?.value;

    if (!accessToken) {
      return null;
    }

    const payload = await verifyToken(accessToken);
    return payload;
  } catch (error) {
    return null;
  }
}

// Generate OTP
export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// OTP expiry time (10 minutes)
export function getOTPExpiry(): Date {
  const expiry = new Date();
  expiry.setMinutes(expiry.getMinutes() + 10);
  return expiry;
}
